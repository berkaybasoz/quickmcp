import fs from 'fs';
import os from 'os';
import path from 'path';

export function resolveStableDefaultDataDir(): string {
  const home = os.homedir() || os.tmpdir();
  if (process.platform === 'win32') {
    const base = process.env.LOCALAPPDATA || process.env.APPDATA || path.join(home, 'AppData', 'Local');
    return path.join(base, 'QuickMCP', 'data');
  }
  if (process.platform === 'darwin') {
    return path.join(home, 'Library', 'Application Support', 'QuickMCP', 'data');
  }
  const xdgDataHome = String(process.env.XDG_DATA_HOME || '').trim();
  const base = xdgDataHome || path.join(home, '.local', 'share');
  return path.join(base, 'quickmcp', 'data');
}

export function resolveConfiguredDataDir(configuredDirRaw: string | undefined, cwd: string = process.cwd()): string {
  const value = String(configuredDirRaw || '').trim();
  if (!value) return '';
  return path.isAbsolute(value) ? value : path.resolve(cwd, value);
}

export function resolveQuickMcpDataDir(configuredDirRaw: string | undefined, cwd: string = process.cwd()): string {
  return resolveConfiguredDataDir(configuredDirRaw, cwd) || resolveStableDefaultDataDir();
}

export function ensureDirExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

export function ensureWritableDataDir(preferredDir: string): string {
  try {
    ensureDirExists(preferredDir);
    fs.accessSync(preferredDir, fs.constants.W_OK);
    return preferredDir;
  } catch {
    const fallbackDir = path.join(os.tmpdir(), 'quickmcp', 'data');
    ensureDirExists(fallbackDir);
    return fallbackDir;
  }
}
