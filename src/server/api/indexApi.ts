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
    app.get('/quick-ask', this.serveQuickAsk);
    app.get('/generate', this.serveGenerate);
    app.get('/landing', this.serveLanding);
    app.get('/pricing', this.servePricing);
    // Keep this route last: it catches all unmatched routes.
    app.get('*', this.serveApp);
  }

  private serveRoot = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      res.sendFile(path.join(this.deps.publicDir, 'page', 'quick-ask.html'));
      return;
    }
    res.sendFile(path.join(this.deps.publicDir, 'page', 'landing.html'));
  };

  private serveQuickAsk = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      res.sendFile(path.join(this.deps.publicDir, 'page', 'quick-ask.html'));
      return;
    }
    res.redirect('/landing');
  };

  private serveGenerate = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      res.sendFile(path.join(this.deps.publicDir, 'page', 'generate.html'));
      return;
    }
    res.redirect('/landing');
  };

  private serveLanding = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      res.redirect('/');
      return;
    }
    res.sendFile(path.join(this.deps.publicDir, 'page', 'landing.html'));
  };

  private servePricing = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'page', 'pricing.html'));
  };

  private serveApp = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'page', 'quick-ask.html'));
  };
}
