import express from 'express';
import { AppUserRole, AuthContext } from '../../auth/auth-utils';
import { IDataStore, WorkspaceAiConfig } from '../../database/datastore';
import { DeploymentUtil } from '../../utils/deployment-util';
import { logger } from '../../utils/logger';

type AuthenticatedRequest = express.Request & {
  authUser?: string;
  authWorkspace?: string;
  authRole?: AppUserRole;
};

interface AskApiDeps {
  ensureDataStore: () => IDataStore;
  resolveAuthContext: (req: AuthenticatedRequest, res?: express.Response) => Promise<AuthContext | null>;
  deployMode: string;
}

type AskToolContext = {
  id: string;
  name: string;
  description: string;
  serverId: string;
  serverName: string;
  serverType: string;
};

type AskServerContext = {
  id: string;
  name: string;
  type: string;
  tools: Array<{ id: string; name: string; description: string }>;
};

const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';

export class AskApi {
  private readonly deploymentUtil: DeploymentUtil;

  constructor(private readonly deps: AskApiDeps) {
    this.deploymentUtil = DeploymentUtil.fromRuntime(this.deps.deployMode);
  }

  registerRoutes(app: express.Express): void {
    app.get('/api/ask/context', this.getAskContext);
    app.post('/api/ask', this.askWithSelectedTools);
  }

  private isSaasMode(): boolean {
    return this.deploymentUtil.isSaasMode();
  }

  private resolveServerOwner(ctx: AuthContext): string {
    if (this.isSaasMode()) return ctx.workspaceId;
    return ctx.workspaceId || ctx.username;
  }

  private async loadServerContext(store: IDataStore, ownerUsername: string): Promise<AskServerContext[]> {
    const servers = await store.getAllServersByOwner(ownerUsername);
    const serverContexts = await Promise.all(
      servers.map(async (server) => {
        const tools = await store.getToolsForServer(server.id);
        return {
          id: server.id,
          name: server.name || server.id,
          type: String((server.sourceConfig as any)?.type || ''),
          tools: tools.map((tool) => ({
            id: `${server.id}::${tool.name}`,
            name: tool.name,
            description: tool.description || ''
          }))
        } satisfies AskServerContext;
      })
    );
    return serverContexts;
  }

  private flattenToolContext(servers: AskServerContext[]): AskToolContext[] {
    const out: AskToolContext[] = [];
    for (const server of servers) {
      for (const tool of server.tools) {
        out.push({
          id: tool.id,
          name: tool.name,
          description: tool.description,
          serverId: server.id,
          serverName: server.name,
          serverType: server.type
        });
      }
    }
    return out;
  }

  private async resolveAiConfig(store: IDataStore): Promise<WorkspaceAiConfig | null> {
    if (!this.isSaasMode()) return null;
    return store.getWorkspaceAiConfig('admin');
  }

  private getAskContext = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const ownerUsername = this.resolveServerOwner(ctx);
      const servers = await this.loadServerContext(store, ownerUsername);
      const aiConfig = await this.resolveAiConfig(store);
      const askEnabled = this.isSaasMode() && !!aiConfig?.apiToken;

      res.json({
        success: true,
        data: {
          isSaasMode: this.isSaasMode(),
          askEnabled,
          reason: askEnabled
            ? ''
            : (this.isSaasMode()
              ? 'Claude configuration not found'
              : 'Ask API is currently available only in SAAS mode.'),
          servers
        }
      });
    } catch (error) {
      logger.error('Ask context load failed:', error);
      res.status(500).json({ success: false, error: 'Failed to load ask context' });
    }
  };

  private askWithSelectedTools = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const prompt = String((req.body as any)?.prompt || '').trim();
    const selectedToolIdsInput = Array.isArray((req.body as any)?.selectedToolIds)
      ? (req.body as any).selectedToolIds.map((item: unknown) => String(item || '').trim()).filter(Boolean)
      : [];
    const selectedServerIdsInput = Array.isArray((req.body as any)?.selectedServerIds)
      ? (req.body as any).selectedServerIds.map((item: unknown) => String(item || '').trim()).filter(Boolean)
      : [];

    if (!prompt) {
      res.status(400).json({ success: false, error: 'Prompt is required' });
      return;
    }
    if (!this.isSaasMode()) {
      res.status(400).json({ success: false, error: 'Ask API is currently available only in SAAS mode' });
      return;
    }

    try {
      const store = this.deps.ensureDataStore();
      const ownerUsername = this.resolveServerOwner(ctx);
      const servers = await this.loadServerContext(store, ownerUsername);
      const allTools = this.flattenToolContext(servers);
      const allToolIdSet = new Set(allTools.map((tool) => tool.id));
      const selectedToolIds = selectedToolIdsInput.filter((id: string) => allToolIdSet.has(id));
      const selectedServerIdSet = new Set(selectedServerIdsInput);

      const selectedTools = allTools.filter((tool) => {
        if (selectedToolIds.length > 0) return selectedToolIds.includes(tool.id);
        if (selectedServerIdSet.size > 0) return selectedServerIdSet.has(tool.serverId);
        return false;
      });

      const aiConfig = await this.resolveAiConfig(store);
      if (!aiConfig?.apiToken) {
        res.status(400).json({ success: false, error: 'Claude configuration not found for this workspace' });
        return;
      }
      if (!String(aiConfig.model || '').trim()) {
        res.status(400).json({ success: false, error: 'Claude model is missing in workspace_ai_config' });
        return;
      }

      const answer = await this.executeClaudeAsk(prompt, selectedTools, aiConfig);
      res.json({
        success: true,
        data: {
          answer,
          selectedToolIds: selectedTools.map((tool) => tool.id),
          selectedCount: selectedTools.length
        }
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ask request failed';
      logger.error('Ask API error:', message);
      res.status(500).json({ success: false, error: message });
    }
  };

  private async executeClaudeAsk(prompt: string, selectedTools: AskToolContext[], aiConfig: WorkspaceAiConfig): Promise<string> {
    const toolLines = selectedTools.length > 0
      ? selectedTools
          .map((tool) => `- ${tool.serverName} / ${tool.name}${tool.description ? `: ${tool.description}` : ''}`)
          .join('\n')
      : '- No MCP tool selected.';

    const systemPrompt = [
      'You are QuickMCP assistant.',
      'Answer user requests using only the selected MCP/tool context as actionable capabilities.',
      'If selected context is missing for the request, say it clearly and suggest what to select.',
      'Keep responses concise, practical, and implementation-oriented.'
    ].join(' ');

    const anthropicPayload = {
      model: String(aiConfig.model || '').trim(),
      max_tokens: 1200,
      temperature: 0.2,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `User request:\n${prompt}\n\nSelected MCP tools:\n${toolLines}`
            }
          ]
        }
      ]
    };

    const baseUrl = String(aiConfig.baseUrl || DEFAULT_ANTHROPIC_BASE_URL).replace(/\/+$/, '');
    const response = await fetch(`${baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': aiConfig.apiToken,
        'anthropic-version': String(aiConfig.apiVersion || '2023-06-01')
      },
      body: JSON.stringify(anthropicPayload)
    });

    const payload: any = await response.json().catch(() => ({} as any));
    if (!response.ok) {
      const errorMessage = String(payload?.error?.message || payload?.error || `Claude API returned ${response.status}`);
      throw new Error(errorMessage);
    }

    const content = Array.isArray((payload as any)?.content) ? (payload as any).content : [];
    const rawText = content
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => String(part?.text || ''))
      .join('\n\n')
      .trim();

    const text = this.sanitizeAssistantText(rawText);
    if (!text) {
      throw new Error('Claude returned an empty response');
    }
    return text;
  }

  private sanitizeAssistantText(input: string): string {
    return String(input || '')
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<tool_response>[\s\S]*?<\/tool_response>/gi, '')
      .replace(/```json[\s\S]*?```/gi, (block) => {
        const lower = block.toLowerCase();
        if (lower.includes('tool_call') || lower.includes('tool_response') || lower.includes('"method"') || lower.includes('"jsonrpc"')) {
          return '';
        }
        return block;
      })
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}
