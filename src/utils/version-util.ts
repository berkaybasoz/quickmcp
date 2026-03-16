import fs from 'fs';
import path from 'path';

export function resolveAppVersion(): string {
  const envVersion = String(process.env.npm_package_version || '').trim();
  try {
    const packageJsonPath = path.resolve(__dirname, '..', '..', 'package.json');
    const parsed = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    const fileVersion = typeof parsed?.version === 'string' ? parsed.version.trim() : '';
    return fileVersion || envVersion || 'unknown';
  } catch {
    return envVersion || 'unknown';
  }
}
