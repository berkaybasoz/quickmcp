import express from 'express';
import path from 'path';

interface IndexApiDeps {
  publicDir: string;
}

export class IndexApi {
  constructor(private readonly deps: IndexApiDeps) {}

  registerRoutes(app: express.Express): void {
    // Keep this route last: it catches all unmatched routes.
    app.get('*', this.serveIndex);
  }

  private serveIndex = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'index.html'));
  };
}
