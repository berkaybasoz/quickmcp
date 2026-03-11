import express from 'express';
import { AppUserRole, AuthContext } from '../../auth/auth-utils';
import { IDataStore, WorkspaceAiConfig } from '../../database/datastore';
import { DeploymentUtil } from '../../utils/deployment-util';
import { DynamicMCPExecutor } from '../dynamic-mcp-executor';
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
  qualifiedName: string;
  inputSchema: any;
};

type AskServerContext = {
  id: string;
  name: string;
  type: string;
  tools: Array<{ id: string; name: string; description: string }>;
};

const DEFAULT_ANTHROPIC_BASE_URL = 'https://api.anthropic.com/v1';
const MAX_TOOL_ROUNDS = 6;
const MAX_TOOL_RESULT_CHARS = 12000;

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

  private async loadRuntimeToolContext(store: IDataStore, ownerUsername: string): Promise<AskToolContext[]> {
    const servers = await store.getAllServersByOwner(ownerUsername);
    const out: AskToolContext[] = [];
    for (const server of servers) {
      const tools = await store.getToolsForServer(server.id);
      for (const tool of tools) {
        out.push({
          id: `${server.id}::${tool.name}`,
          name: tool.name,
          description: tool.description || '',
          serverId: server.id,
          serverName: server.name,
          serverType: String((server.sourceConfig as any)?.type || ''),
          qualifiedName: `${server.id}__${tool.name}`,
          inputSchema: tool.inputSchema
        });
      }
    }
    return out;
  }

  private async resolveAiConfig(store: IDataStore): Promise<WorkspaceAiConfig | null> {
    if (!this.isSaasMode()) return null;
    return store.getWorkspaceAiConfig('admin');
  }

  private normalizeInputSchema(raw: any): Record<string, any> {
    let parsed = raw;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        parsed = {};
      }
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { type: 'object', properties: {}, additionalProperties: true };
    }

    const normalized: Record<string, any> = { ...parsed };
    if (String(normalized.type || '').toLowerCase() !== 'object') normalized.type = 'object';
    if (!normalized.properties || typeof normalized.properties !== 'object' || Array.isArray(normalized.properties)) {
      normalized.properties = {};
    }
    if (!Array.isArray(normalized.required)) normalized.required = [];
    if (typeof normalized.additionalProperties === 'undefined') normalized.additionalProperties = true;
    return normalized;
  }

  private buildAnthropicToolName(tool: AskToolContext, index: number): string {
    const prefix = `qk_${index + 1}_`;
    const safeBase = `${tool.serverId}_${tool.name}`
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '') || 'tool';
    const maxSuffixLen = Math.max(1, 64 - prefix.length);
    return `${prefix}${safeBase.slice(0, maxSuffixLen)}`;
  }

  private buildAnthropicTools(selectedTools: AskToolContext[]): {
    anthropicTools: Array<{ name: string; description: string; input_schema: Record<string, any> }>;
    toolLookup: Map<string, AskToolContext>;
  } {
    const toolLookup = new Map<string, AskToolContext>();
    const anthropicTools = selectedTools.map((tool, index) => {
      const anthropicName = this.buildAnthropicToolName(tool, index);
      toolLookup.set(anthropicName, tool);
      return {
        name: anthropicName,
        description: `${tool.serverName} / ${tool.name}${tool.description ? `: ${tool.description}` : ''}`,
        input_schema: this.normalizeInputSchema(tool.inputSchema)
      };
    });

    return { anthropicTools, toolLookup };
  }

  private extractAssistantText(content: any[]): string {
    return content
      .filter((part: any) => part?.type === 'text')
      .map((part: any) => String(part?.text || ''))
      .join('\n\n')
      .trim();
  }

  private serializeToolResult(value: any): string {
    let raw = '';
    try {
      raw = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    } catch {
      raw = String(value);
    }

    if (raw.length <= MAX_TOOL_RESULT_CHARS) return raw;
    return `${raw.slice(0, MAX_TOOL_RESULT_CHARS)}\n...[truncated ${raw.length - MAX_TOOL_RESULT_CHARS} chars]`;
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
      const allTools = await this.loadRuntimeToolContext(store, ownerUsername);
      const allToolIdSet = new Set(allTools.map((tool) => tool.id));
      const selectedToolIds = selectedToolIdsInput.filter((id: string) => allToolIdSet.has(id));
      const selectedServerIdSet = new Set(selectedServerIdsInput);
      const hasExplicitSelection = selectedToolIds.length > 0 || selectedServerIdSet.size > 0;

      const selectedTools = hasExplicitSelection
        ? allTools.filter((tool) => {
            if (selectedToolIds.length > 0) return selectedToolIds.includes(tool.id);
            if (selectedServerIdSet.size > 0) return selectedServerIdSet.has(tool.serverId);
            return false;
          })
        : allTools;

      const aiConfig = await this.resolveAiConfig(store);
      if (!aiConfig?.apiToken) {
        res.status(400).json({ success: false, error: 'Aria configuration not found for this workspace' });
        return;
      }
      if (!String(aiConfig.model || '').trim()) {
        res.status(400).json({ success: false, error: 'Aria model is missing in workspace_ai_config' });
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
          .map((tool) => `- ${tool.serverName} / ${tool.name}${tool.description ? `: ${tool.description}` : ''} [id=${tool.id}]`)
          .join('\n')
      : '- No MCP tool selected.';

    const systemPrompt = [
      'You are QuickMCP assistant.',
      'Answer user requests using only the selected MCP/tool context as actionable capabilities.',
      'If selected context is missing for the request, say it clearly and suggest what to select.',
      'Keep responses concise, practical, and implementation-oriented.'
    ].join(' ');

    const baseUrl = String(aiConfig.baseUrl || DEFAULT_ANTHROPIC_BASE_URL).replace(/\/+$/, '');
    const { anthropicTools, toolLookup } = this.buildAnthropicTools(selectedTools);
    const messages: any[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `${prompt}`
          }
        ]
      }
    ];

    let toolExecutor: DynamicMCPExecutor | null = null;

    try {
      for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
        const anthropicPayload: Record<string, any> = {
          model: String(aiConfig.model || '').trim(),
          max_tokens: 4000,
          //temperature: 0.2,
          system: systemPrompt,
          messages
        };
        if (anthropicTools.length > 0) {
          anthropicPayload.tools = anthropicTools;
        }

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

        const assistantContent = Array.isArray(payload?.content) ? payload.content : [];
        messages.push({ role: 'assistant', content: assistantContent });

        const toolUses = assistantContent.filter((part: any) => part?.type === 'tool_use');
        if (toolUses.length === 0 || payload?.stop_reason !== 'tool_use') {
          const text = this.sanitizeAssistantText(this.extractAssistantText(assistantContent));
          if (!text) {
            throw new Error('Aria returned an empty response');
          }
          return text;
        }

        if (round === MAX_TOOL_ROUNDS - 1) {
          throw new Error('Aria tool loop exceeded the maximum number of rounds');
        }

        if (!toolExecutor) toolExecutor = new DynamicMCPExecutor();

        const toolResults: any[] = [];
        for (const toolUse of toolUses) {
          const toolUseId = String(toolUse?.id || '').trim();
          const calledAnthropicName = String(toolUse?.name || '').trim();
          if (!toolUseId) continue;

          const mappedTool = toolLookup.get(calledAnthropicName);
          if (!mappedTool) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUseId,
              is_error: true,
              content: `Unknown tool requested by model: ${calledAnthropicName}`
            });
            continue;
          }

          const toolArgs = (toolUse?.input && typeof toolUse.input === 'object' && !Array.isArray(toolUse.input))
            ? toolUse.input
            : {};

          try {
            const toolResult = await toolExecutor.executeTool(mappedTool.qualifiedName, toolArgs);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUseId,
              content: this.serializeToolResult(toolResult)
            });
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            toolResults.push({
              type: 'tool_result',
              tool_use_id: toolUseId,
              is_error: true,
              content: `Tool execution failed: ${message}`
            });
          }
        }

        if (toolResults.length === 0) {
          throw new Error('Aria requested tool_use but returned no executable tool calls');
        }

        messages.push({
          role: 'user',
          content: toolResults
        });
      }
    } finally {
      if (toolExecutor) {
        try {
          await toolExecutor.close();
        } catch {}
      }
    }

    throw new Error('Claude tool loop terminated unexpectedly');
  }

  private sanitizeAssistantText(input: string): string {
    return String(input || '')
      .replace(/<tool_call>[\s\S]*?<\/tool_call>/gi, '')
      .replace(/<tool_response>[\s\S]*?<\/tool_response>/gi, '')
      .replace(/^.*<tool_call.*$/gim, '')
      .replace(/^.*<tool_response.*$/gim, '')
      .replace(/```(?:tool_call|tool_response|jsonrpc)[\s\S]*?```/gi, '')
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
