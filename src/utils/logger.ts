import { createDataStore } from '../database/factory';
import { LogEntry, LogSeverity } from '../database/datastore';

class Logger {
  private _username: string = '';

  setUsername(username: string): void {
    this._username = username;
  }

  getUsername(): string {
    return this._username;
  }

  private writeToDb(entry: LogEntry): void {
    try {
      const store = createDataStore();
      store.writeLog(entry).catch((err) => {
        console.error('[logger] DB write failed:', err?.message || err);
      });
    } catch (err: any) {
      console.error('[logger] Datastore not available:', err?.message || err);
    }
  }

  private log(severity: LogSeverity, message: string | Error, additionalInfo?: any): void {
    const msg = message instanceof Error ? message.message : String(message);
    let extra: string | null = null;
    if (additionalInfo !== undefined) {
      extra = typeof additionalInfo === 'string' ? additionalInfo : JSON.stringify(additionalInfo);
    } else if (message instanceof Error && message.stack) {
      extra = message.stack;
    }

    if (extra !== null) {
      console.error(msg, extra);
    } else {
      console.error(msg);
    }

    this.writeToDb({
      username: this._username,
      severity,
      message: msg,
      datetime: new Date().toISOString(),
      additionalInfo: extra
    });
  }

  trace(message: string | Error, additionalInfo?: any): void { this.log('trace', message, additionalInfo); }
  debug(message: string | Error, additionalInfo?: any): void { this.log('debug', message, additionalInfo); }
  info(message: string | Error, additionalInfo?: any): void { this.log('info', message, additionalInfo); }
  warn(message: string | Error, additionalInfo?: any): void { this.log('warn', message, additionalInfo); }
  error(message: string | Error, additionalInfo?: any): void { this.log('error', message, additionalInfo); }
}

export const logger = new Logger();
