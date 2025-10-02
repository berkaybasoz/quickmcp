import express from 'express';
import { BaseTransport, MCPMessage } from './base-transport';
import { Server } from 'http';

export class SSETransport extends BaseTransport {
  private app: express.Application;
  private server: Server | null = null;
  private clients: Set<express.Response> = new Set();
  private port: number = 3001;
  
  constructor(port?: number) {
    super();
    this.port = port || 3001;
    this.app = express();
    this.setupRoutes();
  }
  
  private setupRoutes(): void {
    this.app.use(express.json());
    
    // SSE endpoint for server-to-client communication
    this.app.get('/sse', (req, res) => {
      console.error('[SSE] Client connected to event stream');
      
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });
      
      this.clients.add(res);
      
      // Send initial connection event
      res.write(`data: ${JSON.stringify({ type: 'connected' })}\n\n`);
      
      // Keep connection alive with heartbeat
      const heartbeat = setInterval(() => {
        res.write(`data: ${JSON.stringify({ type: 'heartbeat', timestamp: Date.now() })}\n\n`);
      }, 30000);
      
      req.on('close', () => {
        console.error('[SSE] Client disconnected from event stream');
        clearInterval(heartbeat);
        this.clients.delete(res);
      });
      
      req.on('error', () => {
        console.error('[SSE] Client connection error');
        clearInterval(heartbeat);
        this.clients.delete(res);
      });
    });
    
    // POST endpoint for client-to-server communication
    this.app.post('/message', (req, res) => {
      const message = req.body;
      console.error(`[SSE] Received via POST: ${message.method || 'response'} (id: ${message.id})`);
      
      // Process the message and get response
      this.notifyHandlers(message);
      
      // For MCP, just acknowledge receipt - actual response goes via SSE
      res.json({ received: true });
    });
    
    // CORS preflight
    this.app.options('/message', (req, res) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
      res.sendStatus(200);
    });
  }
  
  async start(port?: number): Promise<void> {
    if (port) this.port = port;
    
    return new Promise((resolve, reject) => {
      this.server = this.app.listen(this.port, () => {
        console.error(`[SSE] Transport started on port ${this.port}`);
        console.error(`[SSE] Endpoints: GET /sse (event stream), POST /message (commands)`);
        resolve();
      });
      
      this.server.on('error', reject);
    });
  }
  
  async stop(): Promise<void> {
    return new Promise((resolve) => {
      // Close all SSE connections
      this.clients.forEach(client => {
        client.write(`data: ${JSON.stringify({ type: 'closing' })}\n\n`);
        client.end();
      });
      this.clients.clear();
      
      if (this.server) {
        this.server.close(() => {
          console.error('[SSE] Transport stopped');
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
  
  sendMessage(message: MCPMessage): void {
    const eventData = `data: ${JSON.stringify(message)}\n\n`;
    console.error(`[SSE] Broadcasting to ${this.clients.size} clients: ${message.result ? 'success' : message.error ? 'error' : 'request'}`);
    
    this.clients.forEach(client => {
      client.write(eventData);
    });
  }
}