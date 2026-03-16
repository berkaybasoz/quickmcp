import express from 'express';
import path from 'path';

interface FaviconApiDeps {
  publicDir: string;
}

export class FaviconApi {
  constructor(private readonly deps: FaviconApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/favicon.ico', this.serveFavicon);
  }

  private serveFavicon = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'favicon.ico'));
  };
}
