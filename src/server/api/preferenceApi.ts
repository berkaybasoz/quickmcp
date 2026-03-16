import express from 'express';
import { AppUserRole, AuthContext } from '../../auth/auth-utils';
import { IDataStore } from '../../database/datastore';
import { logger } from '../../utils/logger';

type AuthenticatedRequest = express.Request & {
  authUser?: string;
  authWorkspace?: string;
  authRole?: AppUserRole;
};

interface PreferenceApiDeps {
  ensureDataStore: () => IDataStore;
  resolveAuthContext: (req: AuthenticatedRequest, res?: express.Response) => Promise<AuthContext | null>;
}

const UI_THEME_PREF_KEY = 'ui.theme';
const UI_THEME_LIGHT = 'light';
const UI_THEME_DARK = 'dark';
const UI_THEME_COOKIE_NAME = 'quickmcp_ui_theme';

export class PreferenceApi {
  constructor(private readonly deps: PreferenceApiDeps) {}

  registerRoutes(app: express.Express): void {
    app.get('/api/ui/theme', this.getUiTheme);
    app.post('/api/ui/theme', this.saveUiTheme);
  }

  private resolvePreferenceUserId(ctx: AuthContext): string {
    return String(ctx.username || '').trim();
  }

  private setThemeCookie(res: express.Response, theme: string): void {
    res.cookie(UI_THEME_COOKIE_NAME, theme, {
      path: '/',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
  }

  private getUiTheme = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const userId = this.resolvePreferenceUserId(ctx);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const storedValue = await this.deps.ensureDataStore().getUserPreference(userId, UI_THEME_PREF_KEY);
      const normalized = storedValue === UI_THEME_DARK || storedValue === UI_THEME_LIGHT
        ? storedValue
        : '';
      if (normalized) {
        this.setThemeCookie(res, normalized);
      } else {
        res.clearCookie(UI_THEME_COOKIE_NAME, { path: '/' });
      }
      res.json({ success: true, data: { theme: normalized } });
    } catch (error) {
      logger.error('UI theme load failed:', error);
      res.status(500).json({ success: false, error: 'Failed to load UI theme' });
    }
  };

  private saveUiTheme = async (req: AuthenticatedRequest, res: express.Response): Promise<void> => {
    const ctx = await this.deps.resolveAuthContext(req, res);
    if (!ctx) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    try {
      const userId = this.resolvePreferenceUserId(ctx);
      if (!userId) {
        res.status(401).json({ success: false, error: 'Unauthorized' });
        return;
      }
      const requested = String((req.body as any)?.theme || '').trim().toLowerCase();
      if (requested !== UI_THEME_LIGHT && requested !== UI_THEME_DARK) {
        res.status(400).json({ success: false, error: 'Invalid theme' });
        return;
      }
      await this.deps.ensureDataStore().setUserPreference(userId, UI_THEME_PREF_KEY, requested);
      this.setThemeCookie(res, requested);
      res.json({ success: true });
    } catch (error) {
      logger.error('UI theme save failed:', error);
      res.status(500).json({ success: false, error: 'Failed to save UI theme' });
    }
  };
}
