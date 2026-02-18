import express from 'express';

type Request = express.Request;
type Response = express.Response;

export class HealthApi {
  registerRoutes(app: express.Express): void {
    app.get('/api/health', this.getHealth);
  }

  getHealth = (_req: Request, res: Response): void => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  };
}
