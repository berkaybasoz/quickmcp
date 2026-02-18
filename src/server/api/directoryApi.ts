import express from 'express';

type Request = express.Request;
type Response = express.Response;

export class DirectoryApi {
  registerRoutes(app: express.Express): void {
    app.get('/api/directories', this.getDirectories);
  }

  getDirectories = async (req: Request, res: Response): Promise<void> => {
    try {
      const fs = await import('fs/promises');
      const pathModule = await import('path');
      const os = await import('os');

      let requestedPath = req.query.path as string;
      if (!requestedPath || requestedPath === '~') {
        requestedPath = os.homedir();
      }

      const resolvedPath = pathModule.resolve(requestedPath);
      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const directories = entries
        .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
        .map((entry) => ({
          name: entry.name,
          path: pathModule.join(resolvedPath, entry.name)
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

      const parentPath = pathModule.dirname(resolvedPath);
      const hasParent = parentPath !== resolvedPath;

      res.json({
        success: true,
        currentPath: resolvedPath,
        parentPath: hasParent ? parentPath : null,
        directories
      });
    } catch (error) {
      console.error('Directory listing error:', error);
      res.status(400).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to list directories'
      });
    }
  };
}
