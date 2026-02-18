import express from 'express';
import { AuthMode } from '../../config/auth-config';

type Request = express.Request;
type Response = express.Response;

export class ConfigApi {
  constructor(
    private readonly authMode: AuthMode,
    private readonly supabaseUrl: string = ''
  ) {}

  registerRoutes(app: express.Express): void {
    app.get('/api/auth/config', this.getAuthConfig);
  }

  getAuthConfig = (_req: Request, res: Response): void => {
    res.json({
      success: true,
      data: {
        authMode: this.authMode,
        supabaseConfigured: this.authMode !== 'SUPABASE_GOOGLE'
          ? false
          : this.supabaseUrl.length > 0
      }
    });
  };
}
