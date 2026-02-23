import express from 'express';
import { IDataStore, LogSeverity } from '../../database/datastore';

type Request = express.Request;
type Response = express.Response;

const VALID_SEVERITIES: LogSeverity[] = ['trace', 'debug', 'info', 'warn', 'error'];

export class LogsApi {
  constructor(private readonly dataStore: IDataStore) {}

  registerRoutes(app: express.Express): void {
    app.post('/api/logs', this.writeLog);
  }

  writeLog = async (req: Request, res: Response): Promise<void> => {
    try {
      const { username, severity, message, additionalInfo } = req.body as {
        username?: string;
        severity?: string;
        message?: string;
        additionalInfo?: string;
      };

      if (!message || typeof message !== 'string') {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      const resolvedSeverity: LogSeverity = VALID_SEVERITIES.includes(severity as LogSeverity)
        ? (severity as LogSeverity)
        : 'error';

      await this.dataStore.writeLog({
        username: typeof username === 'string' ? username : '',
        severity: resolvedSeverity,
        message,
        datetime: new Date().toISOString(),
        additionalInfo: additionalInfo ?? null
      });

      res.status(204).end();
    } catch {
      res.status(500).json({ error: 'Failed to write log' });
    }
  };
}
