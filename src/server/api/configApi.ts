import express from 'express';
import { AuthMode } from '../../config/auth-config';
import { PortUtils } from '../port-utils';
import { DeploymentUtil } from '../../utils/deployment-util';
import { DataSourceType } from '../../types';

type Request = express.Request;
type Response = express.Response;

export class ConfigApi {
  private readonly deploymentUtil: DeploymentUtil;

  constructor(
    private readonly authMode: AuthMode,
    private readonly supabaseUrl: string = '',
    private readonly mcpPort: number = PortUtils.DEFAULT_MCP_PORT
  ) {
    this.deploymentUtil = DeploymentUtil.fromRuntime();
  }

  registerRoutes(app: express.Express): void {
    app.get('/api/auth/config', this.getAuthConfig);
  }

  getAuthConfig = (_req: Request, res: Response): void => {
    const isSaasMode = this.deploymentUtil.isSaasMode();
    const deployMode = this.deploymentUtil.getDeployMode();
    const onPremOnlyTypes = [DataSourceType.CSV, DataSourceType.Excel, DataSourceType.LocalFS];

    res.json({
      success: true,
      data: {
        authMode: this.authMode,
        deployMode,
        isSaasMode,
        mcpPort: this.mcpPort,
        mcpDefaultPort: PortUtils.DEFAULT_MCP_PORT,
        usersEnabled: !isSaasMode,
        dataSourceCapabilities: onPremOnlyTypes.map((type) => ({
          type,
          onlyOnPrem: isSaasMode
        })),
        supabaseConfigured: this.authMode !== 'SUPABASE_GOOGLE'
          ? false
          : this.supabaseUrl.length > 0
      }
    });
  };
}
