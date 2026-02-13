import multer from 'multer';
import path from 'path';
import fsSync from 'fs';
import os from 'os';

// Resolve a writable uploads directory that works under npx (CWD may be '/')
// Priority: QUICKMCP_UPLOAD_DIR -> os.tmpdir()/quickmcp-uploads
export function resolveUploadDir(): string {
  const configuredUploadDir = process.env.QUICKMCP_UPLOAD_DIR;
  const defaultUploadDir = path.join(os.tmpdir(), 'quickmcp-uploads');
  const uploadDir = configuredUploadDir
    ? (path.isAbsolute(configuredUploadDir)
        ? configuredUploadDir
        : path.join(process.cwd(), configuredUploadDir))
    : defaultUploadDir;

  try {
    fsSync.mkdirSync(uploadDir, { recursive: true });
  } catch {}
  return uploadDir;
}

export const upload = multer({ dest: resolveUploadDir() });
