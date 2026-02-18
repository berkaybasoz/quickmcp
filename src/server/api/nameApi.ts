import express from 'express';
import { IDataStore } from '../../database/datastore';
import { AppUserRole } from '../../auth/auth-utils';

type AuthenticatedRequest = express.Request & { authUser?: string; authWorkspace?: string; authRole?: AppUserRole };

interface NameApiDeps {
  ensureDataStore: () => IDataStore;
  getEffectiveUsername: (req: AuthenticatedRequest) => string;
}

export class NameApi {
  constructor(private readonly deps: NameApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/api/servers/check-name/:name', this.checkServerName);
    app.get('/api/check-tool-name/:toolName', this.checkToolName);
  }

  private checkServerName = (req: express.Request, res: express.Response): void => {
    const ownerUsername = this.deps.getEffectiveUsername(req as AuthenticatedRequest);
    const serverName = req.params.name;
    const isAvailable = !this.deps.ensureDataStore().serverNameExistsForOwner(serverName, ownerUsername);

    res.json({
      success: true,
      available: isAvailable,
      message: isAvailable
        ? `Server name "${serverName}" is available`
        : `Server name "${serverName}" already exists for user "${ownerUsername}"`
    });
  };

  private checkToolName = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const { toolName } = req.params;
    const ownerUsername = this.deps.getEffectiveUsername(req);
    try {
      const store = this.deps.ensureDataStore();
      const allServers = store.getAllServersByOwner(ownerUsername);
      const isTaken = allServers.some((server) => {
        const tools = store.getToolsForServer(server.id);
        return tools.some((tool) => tool.name === toolName);
      });
      res.json({ success: true, available: !isTaken });
    } catch (error) {
      console.error(`Error checking tool name '${toolName}':`, error);
      res.status(500).json({ success: false, error: 'Failed to check tool name availability' });
    }
  };
}
