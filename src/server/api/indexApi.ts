import express from 'express';
import path from 'path';
import { AuthContext } from '../../auth/auth-utils';
import { AuthMode } from '../../config/auth-config';

interface IndexApiDeps {
  publicDir: string;
  authMode: AuthMode;
  resolveAuthContext: (req: express.Request, res?: express.Response) => Promise<AuthContext | null>;
}

export class IndexApi {
  constructor(private readonly deps: IndexApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/', this.serveRoot);
    app.get('/landing', this.serveLanding);
    app.get('/pricing', this.servePricing);
    // Keep this route last: it catches all unmatched routes.
    app.get('*', this.serveApp);
  }

  private serveRoot = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      res.sendFile(path.join(this.deps.publicDir, 'index.html'));
      return;
    }
    res.sendFile(path.join(this.deps.publicDir, 'landing.html'));
  };

  private serveLanding = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      res.redirect('/');
      return;
    }
    res.sendFile(path.join(this.deps.publicDir, 'landing.html'));
  };

  private servePricing = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'pricing.html'));
  };

  private serveApp = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'index.html'));
  };
}
