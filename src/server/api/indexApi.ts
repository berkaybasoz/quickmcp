import express from 'express';
import { AuthContext } from '../../auth/auth-utils';
import { AuthMode } from '../../config/auth-config';

interface IndexApiDeps {
  publicDir: string;
  spaIndexFile?: string | null;
  authMode: AuthMode;
  resolveAuthContext: (req: express.Request, res?: express.Response) => Promise<AuthContext | null>;
}

export class IndexApi {
  constructor(private readonly deps: IndexApiDeps) {}

  private sendAppPage(res: express.Response, legacyPageFile: string): void {
    if (this.deps.spaIndexFile) {
      res.sendFile(this.deps.spaIndexFile);
      return;
    }
    res.status(503).send(`SPA build not found: ${legacyPageFile}`);
  }

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
    const next = typeof req.query.next === 'string' && req.query.next.startsWith('/')
      ? req.query.next
      : '/quick-ask';
    if (ctx) {
      res.redirect(next);
      return;
    }
    this.sendAppPage(res, 'landing.html');
  };

  private serveQuickAsk = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      this.sendAppPage(res, 'quick-ask.html');
      return;
    }
    res.redirect('/landing');
  };

  private serveGenerate = async (req: express.Request, res: express.Response): Promise<void> => {
    const ctx = this.deps.authMode === 'NONE' ? {} : await this.deps.resolveAuthContext(req, res);
    if (ctx) {
      this.sendAppPage(res, 'generate.html');
      return;
    }
    res.redirect('/landing');
  };

  private serveLanding = async (req: express.Request, res: express.Response): Promise<void> => {
    void req;
    this.sendAppPage(res, 'quick-ask.html');
  };

  private servePricing = (_req: express.Request, res: express.Response): void => {
    this.sendAppPage(res, 'pricing.html');
  };

  private serveApp = (_req: express.Request, res: express.Response): void => {
    this.sendAppPage(res, 'quick-ask.html');
  };
}
