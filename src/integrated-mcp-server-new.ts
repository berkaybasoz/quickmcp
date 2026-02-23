#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';
import { DynamicMCPExecutor } from './server/dynamic-mcp-executor';
import { PortUtils } from './server/port-utils';
import { createDataStore } from './database/factory';
import { IDataStore } from './database/datastore';
import { AuthMode, resolveAuthMode } from './config/auth-config';
import { McpCoreService, McpAuthContext, JsonRpcMessage } from './mcp-core/McpCoreService';
import { logger } from './utils/logger';
type SseSession = {
  res: express.Response;
  authContext: McpAuthContext;
  keepAlive: NodeJS.Timeout;
};

export class IntegratedMCPServer {
  private app: express.Application;
  private executor: DynamicMCPExecutor;
  private authStore: IDataStore;
  private mcpAuthMode: AuthMode;
  private mcpCore: McpCoreService;
  private sseSessions = new Map<string, SseSession>();
  private wsServer: WebSocketServer | null = null;

  constructor() {
    this.executor = new DynamicMCPExecutor();
    this.authStore = createDataStore();
    this.mcpAuthMode = resolveAuthMode();

    const tokenSecret = process.env.QUICKMCP_TOKEN_SECRET || process.env.AUTH_COOKIE_SECRET || 'change-me';
    const defaultToken = (process.env.QUICKMCP_TOKEN || '').trim();

    this.mcpCore = new McpCoreService({
      executor: this.executor,
      authStore: this.authStore,
      authMode: this.mcpAuthMode,
      tokenSecret,
      defaultToken
    });

    this.app = express();
    this.setupWebRoutes();
  }

  private resolveHttpAuthContext(req: express.Request): Promise<McpAuthContext> {
    return this.mcpCore.resolveAuthContextFromSources({
      authorization: String(req.headers.authorization || ''),
      xMcpToken: String(req.headers['x-mcp-token'] || ''),
      queryToken: String(req.query.token || ''),
      bodyToken: String((req.body as any)?.token || '')
    });
  }

  private resolveWsAuthContext(req: express.Request): Promise<McpAuthContext> {
    let queryToken = '';
    try {
      const host = req.headers.host || 'localhost';
      const parsed = new URL(req.url || '/', `http://${host}`);
      queryToken = String(parsed.searchParams.get('token') || '').trim();
    } catch {}

    return this.mcpCore.resolveAuthContextFromSources({
      authorization: String(req.headers.authorization || ''),
      xMcpToken: String(req.headers['x-mcp-token'] || ''),
      queryToken
    });
  }

  private async executeJsonRpc(rawBody: any, authContext: McpAuthContext): Promise<any | null> {
    const message = this.mcpCore.parseIncomingMessage(rawBody);
    return await this.mcpCore.processJsonRpcMessage(message, authContext);
  }

  private writeSseEvent(res: express.Response, event: string, data: any): void {
    res.write(`event: ${event}\n`);
    res.write(`data: ${typeof data === 'string' ? data : JSON.stringify(data)}\n\n`);
  }

  private setupWebRoutes(): void {
    this.app.use(cors());
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.raw({ type: '*/*', limit: '50mb' }));

    this.app.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        authMode: this.mcpAuthMode,
        ...this.executor.getStats(),
        timestamp: new Date().toISOString()
      });
    });

    this.app.get('/api/transports', (_req, res) => {
      res.json({
        success: true,
        data: {
          stdio: '/api/mcp-stdio',
          sse: { stream: '/sse', messages: '/messages?sessionId={sessionId}' },
          streamableHttp: '/mcp',
          websocket: '/ws'
        }
      });
    });

    // 1) STDIO bridge
    this.app.post('/api/mcp-stdio', express.raw({ type: '*/*' }), async (req, res) => {
      try {
        const authContext = await this.resolveHttpAuthContext(req);
        const response = await this.executeJsonRpc(req.body, authContext);
        if (response) {
          res.json(response);
        } else {
          res.status(204).end();
        }
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: (req.body as any)?.id,
          error: {
            code: -32603,
            message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    });

    // 2) Legacy SSE transport
    this.app.get('/sse', async (req, res) => {
      const sessionId = randomUUID();
      const authContext = await this.resolveHttpAuthContext(req);

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders?.();

      this.writeSseEvent(res, 'endpoint', `/messages?sessionId=${encodeURIComponent(sessionId)}`);

      const keepAlive = setInterval(() => {
        res.write(': keep-alive\n\n');
      }, 25000);

      this.sseSessions.set(sessionId, { res, authContext, keepAlive });

      req.on('close', () => {
        const session = this.sseSessions.get(sessionId);
        if (session) {
          clearInterval(session.keepAlive);
          this.sseSessions.delete(sessionId);
        }
      });
    });

    this.app.post('/messages', async (req, res) => {
      try {
        const sessionId = String(req.query.sessionId || '');
        if (!sessionId) {
          res.status(400).send('Missing sessionId');
          return;
        }

        const session = this.sseSessions.get(sessionId);
        if (!session) {
          res.status(404).send('Session not found');
          return;
        }

        const requestAuth = await this.resolveHttpAuthContext(req);
        const effectiveAuth = requestAuth.identity || requestAuth.tokenRecord ? requestAuth : session.authContext;
        const response = await this.executeJsonRpc(req.body, effectiveAuth);

        if (response) {
          this.writeSseEvent(session.res, 'message', response);
          res.json(response);
          return;
        }

        res.status(204).end();
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: (req.body as any)?.id,
          error: {
            code: -32603,
            message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    });

    // 3) Streamable HTTP (single endpoint)
    this.app.all('/mcp', async (req, res) => {
      if (req.method === 'DELETE') {
        res.status(204).end();
        return;
      }

      if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
      }

      try {
        const authContext = await this.resolveHttpAuthContext(req);
        const response = await this.executeJsonRpc(req.body, authContext);

        if (!response) {
          res.status(204).end();
          return;
        }

        const acceptsSse = String(req.headers.accept || '').includes('text/event-stream') || String(req.query.stream || '') === 'true';
        if (acceptsSse) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache, no-transform');
          res.setHeader('Connection', 'keep-alive');
          this.writeSseEvent(res, 'message', response);
          res.end();
          return;
        }

        res.json(response);
      } catch (error) {
        res.status(500).json({
          jsonrpc: '2.0',
          id: (req.body as any)?.id,
          error: {
            code: -32603,
            message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        });
      }
    });

    this.app.get('/api/stats', (_req, res) => {
      res.json(this.executor.getStats());
    });
  }

  private setupWebSocketTransport(httpServer: any): void {
    this.wsServer = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wsServer.on('connection', (socket: WebSocket, req) => {
      let sessionAuth: McpAuthContext | null = null;

      this.resolveWsAuthContext(req as any).then((auth) => {
        sessionAuth = auth;
      }).catch((error) => {
        socket.send(JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32603,
            message: `Auth error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }
        }));
        socket.close();
      });

      socket.on('message', async (raw) => {
        if (!sessionAuth) {
          socket.send(JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: 'Auth context not yet resolved' } }));
          return;
        }
        let messageData: JsonRpcMessage | null = null;
        try {
          messageData = this.mcpCore.parseIncomingMessage(raw.toString());
          const response = await this.mcpCore.processJsonRpcMessage(messageData, sessionAuth);
          if (response) {
            socket.send(JSON.stringify(response));
          }
        } catch (error) {
          socket.send(JSON.stringify({
            jsonrpc: '2.0',
            id: messageData?.id ?? null,
            error: {
              code: -32603,
              message: `Internal error: ${error instanceof Error ? error.message : 'Unknown error'}`
            }
          }));
        }
      });
    });
  }

  async start(port?: number): Promise<void> {
    const resolvedPort = typeof port === 'number' && Number.isFinite(port) && port > 0
      ? port
      : new PortUtils(process.env).resolveServerPorts().mcpPort;

    const httpServer = this.app.listen(resolvedPort);
    this.setupWebSocketTransport(httpServer);

    process.on('SIGINT', async () => {
      await this.cleanup();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  private async cleanup(): Promise<void> {
    try {
      this.sseSessions.forEach((session) => {
        clearInterval(session.keepAlive);
        session.res.end();
      });
      this.sseSessions.clear();

      await new Promise<void>((resolve) => {
        if (!this.wsServer) {
          resolve();
          return;
        }
        this.wsServer.close(() => resolve());
      });

      await this.executor.close();
      this.authStore.close();
    } catch (error) {
      logger.error('❌ Error during cleanup:', error);
    }
  }
}
