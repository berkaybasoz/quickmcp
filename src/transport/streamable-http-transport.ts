import express from 'express';
import { BaseTransport, MCPMessage } from './base-transport';
import { Server } from 'http';

export class StreamableHTTPTransport extends BaseTransport {
  private app: express.Application;
  private server: Server | null = null;
  private port: number = 3001;
  private sessions: Map<string, any> = new Map();
  
  constructor(port?: number) {
    super();
    this.port = port || 3001;
    this.app = express();
    this.setupRoutes();
  }
  
  private setupRoutes(): void {
    this.app.use(express.json());
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
      next();
    });
    
    // Main MCP endpoint - handles both POST requests and optional SSE
    this.app.post('/mcp', async (req, res) => {
      const message = req.body;
      const sessionId = req.headers['mcp-session-id'] as string;
      
      console.error(`[StreamableHTTP] Received: ${message.method || 'response'} (id: ${message.id}) (session: ${sessionId})`);
      
      // Skip processing response messages to avoid loops  
      if (!message.method) {
        console.error(`[StreamableHTTP] Ignoring response message id ${message.id}`);
        res.status(200).end();
        return;
      }
      
      // Handle session management for initialize
      if (message.method === 'initialize') {
        const newSessionId = this.generateSessionId();
        res.setHeader('Mcp-Session-Id', newSessionId);
        this.sessions.set(newSessionId, { created: Date.now() });
      }
      
      // Process the message and wait for response
      const response = await this.processMessage(message);
      
      if (response) {
        console.error(`[StreamableHTTP] Sending response for id ${message.id}`);
        res.json(response);
      } else {
        res.status(500).json({
          jsonrpc: '2.0',
          id: message.id,
          error: {
            code: -32603,
            message: 'Internal error'
          }
        });
      }
    });
    
    // Optional SSE endpoint for server-initiated communication
    this.app.get('/mcp', (req, res) => {
      const sessionId = req.headers['mcp-session-id'] as string;
      
      if (!sessionId || !this.sessions.has(sessionId)) {
        res.status(401).json({ error: 'Invalid session' });
        return;
      }
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Mcp-Session-Id': sessionId
      });
      
      console.error(`[StreamableHTTP] SSE connection established for session ${sessionId}`);
      
      // Send connection confirmation
      res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
      
      req.on('close', () => {
        console.error(`[StreamableHTTP] SSE connection closed for session ${sessionId}`);
      });
    });
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({ status: 'ok', sessions: this.sessions.size });
    });
    
    // CORS preflight
    this.app.options('/mcp', (req, res) => {
      res.sendStatus(200);
    });
  }
  
  private generateSessionId(): string {
    return 'sess_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
  
  private async processMessage(message: MCPMessage): Promise<MCPMessage | null> {
    return new Promise((resolve) => {
      // Set up one-time response handler with unique key
      const responseKey = `response_${message.id}`;
      const responseHandler = (response: MCPMessage) => {
        if (response.id === message.id) {
          this.messageHandlers.delete(responseKey);
          resolve(response);
        }
      };
      
      this.messageHandlers.set(responseKey, responseHandler);
      
      // Process the message
      this.notifyHandlers(message);
      
      // Timeout after 5 seconds
      setTimeout(() => {
        this.messageHandlers.delete(responseKey);
        resolve(null);
      }, 5000);
    });
  }
  
  async start(port?: number): Promise<void> {
    if (port) this.port = port;
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.error(`[StreamableHTTP] Transport started on port ${this.port}`);
        console.error(`[StreamableHTTP] Endpoint: POST/GET /mcp`);
        resolve();
      });
      
      this.server.on('error', reject);
    });
  }
  
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.error('[StreamableHTTP] Transport stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  sendMessage(message: MCPMessage): void {
    // For responses, use the response handler mechanism
    const responseKey = `response_${message.id}`;
    const responseHandler = this.messageHandlers.get(responseKey);
    if (responseHandler) {
      responseHandler(message);
    } else {
      console.error(`[StreamableHTTP] No response handler for message id ${message.id}`);
    }
  }
}