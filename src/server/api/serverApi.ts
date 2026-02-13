import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { MCPServerGenerator } from '../../generators/MCPServerGenerator';
import { IDataStore } from '../../database/datastore';
import { AppUserRole } from '../../auth/auth-utils';
import { DynamicMCPExecutor } from '../dynamic-mcp-executor';
import { MCPServerConfig, ParsedData } from '../../types';

type AuthenticatedRequest = express.Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole };

type GeneratedServerInfo = {
  config: MCPServerConfig;
  serverPath: string;
  parsedData: ParsedData[];
  runtimeProcess?: any;
  runtimePort?: number;
};

interface ServerApiDeps {
  ensureGenerator: () => MCPServerGenerator;
  ensureDataStore: () => IDataStore;
  getEffectiveUsername: (req: AuthenticatedRequest) => string;
  generatedServers: Map<string, GeneratedServerInfo>;
  startRuntimeMCPServer: (serverId: string, serverPath: string) => Promise<number>;
  publicDir: string;
}

export class ServerApi {
  constructor(private readonly deps: ServerApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/api/servers', this.listServers);
    app.get('/api/servers/:id', this.getServerDetails);
    app.get('/api/servers/:id/data', this.getServerData);
    app.post('/api/servers/:id/test', this.testServer);
    app.patch('/api/servers/:id/rename', this.renameServer);
    app.delete('/api/servers/:id', this.deleteServer);
    app.post('/api/servers/:id/start-runtime', this.startRuntimeServer);
    app.post('/api/servers/:id/stop-runtime', this.stopRuntimeServer);
    app.get('/api/servers/:id/export', this.exportServer);
    app.get('/manage-servers', this.getManageServersPage);
    app.get('/test-servers', this.getTestServersPage);
    app.get('/how-to-use', this.getHowToUsePage);
  }

  private listServers = (req: AuthenticatedRequest, res: express.Response): void => {
    const ownerUsername = this.deps.getEffectiveUsername(req);
    const gen = this.deps.ensureGenerator();
    const allServers = gen.getAllServersByOwner(ownerUsername);
    const servers = allServers.map((server) => {
      // Prefer persisted source_config from SQLite to avoid stale/partial objects
      const persisted = this.deps.ensureDataStore().getServer(server.id);
      const rawType = (persisted?.sourceConfig as any)?.type || (server as any)?.sourceConfig?.type || 'unknown';
      const type = typeof rawType === 'string' ? rawType : 'unknown';
      const version = persisted?.version || (server as any)?.version || '1.0.0';
      const tools = gen.getToolsForServer(server.id);
      const resources = gen.getResourcesForServer(server.id);
      const finalType = type;
      return {
        id: server.id,
        name: server.name,
        ownerUsername: server.ownerUsername,
        type: finalType,
        description: `${server.name} - Virtual MCP Server (${finalType})`,
        version,
        toolsCount: tools.length,
        resourcesCount: resources.length,
        promptsCount: 0
      };
    });

    res.json({ success: true, data: servers });
  };

  private getServerDetails = (req: AuthenticatedRequest, res: express.Response): express.Response | void => {
    const ownerUsername = this.deps.getEffectiveUsername(req);
    const server = this.deps.ensureGenerator().getServerForOwner(req.params.id, ownerUsername);

    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const gen = this.deps.ensureGenerator();
    const tools = gen.getToolsForServer(server.id);
    const resources = gen.getResourcesForServer(server.id);
    const rawType = (server.sourceConfig as any)?.type || 'unknown';
    const finalType = typeof rawType === 'string' ? rawType : 'unknown';
    const version = server.version || this.deps.ensureDataStore().getServer(server.id)?.version || '1.0.0';

    res.json({
      success: true,
      data: {
        config: {
          name: server.name,
          description: `${server.name} - Virtual MCP Server (${finalType})`,
          version,
          tools: tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            inputSchema: tool.inputSchema,
            operation: tool.operation
          })),
          resources: resources.map((resource) => ({
            name: resource.name,
            description: resource.description,
            uri_template: resource.uri_template
          })),
          prompts: []
        },
        parsedData: []
      }
    });
  };

  private getServerData = async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response | void> => {
    try {
      const serverId = req.params.id;
      const ownerUsername = this.deps.getEffectiveUsername(req);
      const limit = parseInt(req.query.limit as string, 10) || 10;

      const server = this.deps.ensureGenerator().getServerForOwner(serverId, ownerUsername);
      if (!server) {
        return res.status(404).json({
          success: false,
          error: 'Server not found'
        });
      }

      const executor = new DynamicMCPExecutor();
      const tools = this.deps.ensureGenerator().getToolsForServer(serverId);
      const selectTool = tools.find((tool) => tool.operation === 'SELECT');

      if (!selectTool) {
        return res.json({
          success: true,
          data: []
        });
      }

      const result = await executor.executeTool(`${serverId}__${selectTool.name}`, { limit });

      if (result.success && result.data) {
        const sampleData = Array.isArray(result.data) ? result.data : [];
        res.json({
          success: true,
          data: sampleData.slice(0, limit)
        });
      } else {
        res.json({
          success: true,
          data: []
        });
      }
    } catch (error) {
      console.error('Error getting server data:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private testServer = async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response | void> => {
    try {
      const ownerUsername = this.deps.getEffectiveUsername(req);
      const server = this.deps.ensureDataStore().getServerForOwner(req.params.id, ownerUsername);
      if (!server) {
        return res.status(404).json({
          success: false,
          error: 'Server not found'
        });
      }

      const tools = this.deps.ensureDataStore().getToolsForServer(req.params.id);
      const { runAll, testType, toolName, parameters } = req.body;

      if (testType === 'tools/call' && toolName) {
        try {
          const executor = new DynamicMCPExecutor();
          const tool = tools.find((t) => t.name === toolName);
          if (!tool) {
            return res.status(404).json({
              success: false,
              error: `Tool "${toolName}" not found`
            });
          }

          const result = await executor.executeTool(`${req.params.id}__${toolName}`, parameters || {});

          res.json({
            success: true,
            data: {
              tool: toolName,
              status: 'success',
              description: tool.description,
              parameters: parameters || {},
              result: result.success ? 'Tool executed successfully' : result,
              rowCount: result.rowCount || 0
            }
          });
          return;
        } catch (error) {
          res.json({
            success: true,
            data: {
              tool: toolName,
              status: 'error',
              description: tools.find((t) => t.name === toolName)?.description || '',
              parameters: parameters || {},
              error: error instanceof Error ? error.message : 'Unknown error'
            }
          });
          return;
        }
      }

      const testResults = [];
      const toolsToTest = runAll ? tools : tools.slice(0, 3);

      for (const tool of toolsToTest) {
        try {
          const executor = new DynamicMCPExecutor();
          const testParams: any = {};
          if (tool.inputSchema && typeof tool.inputSchema === 'object' && tool.inputSchema.properties) {
            for (const [paramName] of Object.entries(tool.inputSchema.properties as any)) {
              if (paramName === 'limit') testParams[paramName] = 5;
              else if (paramName === 'offset') testParams[paramName] = 0;
            }
          }

          const result = await executor.executeTool(`${req.params.id}__${tool.name}`, testParams);
          testResults.push({
            tool: tool.name,
            status: 'success',
            description: tool.description,
            parameters: testParams,
            result: result.success ? 'Tool executed successfully' : result,
            rowCount: result.rowCount || 0
          });
        } catch (error) {
          testResults.push({
            tool: tool.name,
            status: 'error',
            description: tool.description,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      res.json({
        success: true,
        data: {
          serverName: server.name,
          toolsCount: tools.length,
          testsRun: testResults.length,
          results: testResults
        }
      });
    } catch (error) {
      console.error('Test error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private renameServer = async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response | void> => {
    try {
      const serverId = req.params.id;
      const { newName } = req.body;
      const ownerUsername = this.deps.getEffectiveUsername(req);

      console.log(`🔄 Rename request for server ID: ${serverId}, new name: ${newName}`);

      if (!newName || typeof newName !== 'string' || !newName.trim()) {
        return res.status(400).json({
          success: false,
          error: 'New name is required and must be a non-empty string'
        });
      }

      const trimmedName = newName.trim();
      const sqlite = this.deps.ensureDataStore();
      const existingServer = sqlite.getServerForOwner(serverId, ownerUsername);
      if (!existingServer) {
        console.log(`❌ Server with ID "${serverId}" not found`);
        return res.status(404).json({
          success: false,
          error: `Server with ID "${serverId}" not found`
        });
      }

      const allServers = sqlite.getAllServersByOwner(ownerUsername);
      const serverWithSameName = allServers.find((s) => s.name === trimmedName && s.id !== serverId);
      if (serverWithSameName) {
        console.log(`❌ Server name "${trimmedName}" is already taken by ID: ${serverWithSameName.id}`);
        return res.status(400).json({
          success: false,
          error: `Server name "${trimmedName}" is already taken`
        });
      }

      existingServer.name = trimmedName;
      sqlite.saveServer(existingServer);

      console.log(`✅ Successfully renamed server ${serverId} to "${trimmedName}"`);

      res.json({
        success: true,
        data: {
          id: serverId,
          name: trimmedName
        }
      });
    } catch (error) {
      console.error('Rename error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private deleteServer = async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response | void> => {
    try {
      const serverId = req.params.id;
      const ownerUsername = this.deps.getEffectiveUsername(req);
      console.log(`Attempting to delete server with ID: ${serverId}`);

      const existingServer = this.deps.ensureGenerator().getServerForOwner(serverId, ownerUsername);
      if (!existingServer) {
        console.log(`Server with ID "${serverId}" not found in database`);
        return res.status(404).json({
          success: false,
          error: `Server with ID "${serverId}" not found`
        });
      }

      this.deps.ensureGenerator().deleteServer(serverId);
      console.log(`Deleted server "${serverId}" from JSON database`);

      const serverInfo = this.deps.generatedServers.get(serverId);
      if (serverInfo) {
        const serverDir = path.dirname(serverInfo.serverPath);
        await fs.rm(serverDir, { recursive: true, force: true });
        console.log(`Removed server files from ${serverDir}`);
      }

      this.deps.generatedServers.delete(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error('Delete error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private startRuntimeServer = async (req: AuthenticatedRequest, res: express.Response): Promise<express.Response | void> => {
    try {
      const ownerUsername = this.deps.getEffectiveUsername(req);
      const server = this.deps.ensureGenerator().getServerForOwner(req.params.id, ownerUsername);
      if (!server) {
        return res.status(404).json({ success: false, error: 'Server not found' });
      }

      const serverInfo = this.deps.generatedServers.get(req.params.id);
      if (!serverInfo) {
        return res.status(404).json({
          success: false,
          error: 'Server not found'
        });
      }

      const port = await this.deps.startRuntimeMCPServer(req.params.id, serverInfo.serverPath);

      res.json({
        success: true,
        data: {
          serverId: req.params.id,
          port,
          endpoint: `http://localhost:${port}`,
          claudeConfig: {
            [serverInfo.config.name]: {
              command: 'curl',
              args: ['-X', 'POST', `http://localhost:${port}/sse/message`],
              env: {
                MCP_TRANSPORT: 'sse'
              }
            }
          }
        }
      });
    } catch (error) {
      console.error('Runtime start error:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  private stopRuntimeServer = (req: AuthenticatedRequest, res: express.Response): express.Response | void => {
    const ownerUsername = this.deps.getEffectiveUsername(req);
    const server = this.deps.ensureGenerator().getServerForOwner(req.params.id, ownerUsername);
    if (!server) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    const serverInfo = this.deps.generatedServers.get(req.params.id);
    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    if (serverInfo.runtimeProcess) {
      serverInfo.runtimeProcess.kill();
      serverInfo.runtimeProcess = undefined;
      serverInfo.runtimePort = undefined;
    }

    res.json({ success: true });
  };

  private exportServer = (req: AuthenticatedRequest, res: express.Response): express.Response | void => {
    const ownerUsername = this.deps.getEffectiveUsername(req);
    const server = this.deps.ensureGenerator().getServerForOwner(req.params.id, ownerUsername);
    if (!server) {
      return res.status(404).json({ success: false, error: 'Server not found' });
    }

    const serverInfo = this.deps.generatedServers.get(req.params.id);
    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const archiveName = `${serverInfo.config.name}-mcp-server.zip`;
    res.json({
      success: true,
      data: {
        downloadUrl: `/api/servers/${req.params.id}/download`,
        filename: archiveName
      }
    });
  };

  private getManageServersPage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'manage-servers.html'));
  };

  private getTestServersPage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'test-servers.html'));
  };

  private getHowToUsePage = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'how-to-use.html'));
  };
}
