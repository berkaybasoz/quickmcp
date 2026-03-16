import express from 'express';
import path from 'path';

interface FaviconApiDeps {
  publicDir: string;
}

export class FaviconApi {
  constructor(private readonly deps: FaviconApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/favicon.ico', this.serveFavicon);
    app.get('/mcp/favicon.ico', this.serveFavicon);
    app.get('/favicon.png', this.serveFaviconPng);
    app.get('/mcp/favicon.png', this.serveFaviconPng);
    app.get('/apple-touch-icon.png', this.serveAppleTouchIcon);
    app.get('/mcp/apple-touch-icon.png', this.serveAppleTouchIcon);
  }

  private serveFavicon = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'favicon.ico'));
  };

  private serveFaviconPng = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'favicon.png'));
  };

  private serveAppleTouchIcon = (_req: express.Request, res: express.Response): void => {
    res.sendFile(path.join(this.deps.publicDir, 'apple-touch-icon.png'));
  };
}
