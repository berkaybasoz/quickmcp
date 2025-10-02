import { spawn, ChildProcess } from 'child_process';
import { MCPTestRequest, MCPTestResponse } from '../types';
import { TransportType } from '../transport';
import axios from 'axios';
import { EventSourcePolyfill } from 'eventsource';

interface MCPMessage {
  jsonrpc: string;
  id: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export class MCPClientUnified {
  private transportType: TransportType;
  private port: number;
  private process: ChildProcess | null = null;
  private eventSource: EventSourcePolyfill | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private isConnected = false;
  private buffer = '';

  constructor(transportType: TransportType = 'stdio', port: number = 3001) {
    this.transportType = transportType;
    this.port = port;
  }

  async connect(serverPath?: string): Promise<void> {
    if (this.transportType === 'stdio') {
      if (!serverPath) {
        throw new Error('Server path required for stdio transport');
      }
      return this.connectStdio(serverPath);
    } else {
      return this.connectSSE();
    }
  }

  private async connectStdio(serverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout?.on('data', (data) => {
        this.handleStdioMessage(data.toString());
      });

      this.process.stderr?.on('data', (data) => {
        console.error('MCP Server stderr:', data.toString());
      });

      this.process.on('error', (error) => {
        console.error('MCP Server process error:', error);
        reject(error);
      });

      this.process.on('exit', (code) => {
        console.log('MCP Server process exited with code:', code);
        this.isConnected = false;
      });

      // Initialize the connection
      this.initialize()
        .then(() => {
          this.isConnected = true;
          resolve();
        })
        .catch(reject);
    });
  }

  private async connectSSE(): Promise<void> {
    const EventSource = EventSourcePolyfill || (global as any).EventSource;
    
    return new Promise((resolve, reject) => {
      const sseUrl = `http://localhost:${this.port}/sse`;
      this.eventSource = new EventSource(sseUrl) as EventSourcePolyfill;

      this.eventSource.onmessage = (event: any) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'connected') {
            // Initialize the connection
            this.initialize()
              .then(() => {
                this.isConnected = true;
                resolve();
              })
              .catch(reject);
          } else {
            this.handleSSEMessage(message);
          }
        } catch (error) {
          console.error('Error parsing SSE message:', error);
        }
      };

      this.eventSource.onerror = (error: any) => {
        console.error('SSE connection error:', error);
        if (!this.isConnected) {
          reject(new Error('Failed to connect to SSE server'));
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    if (this.transportType === 'stdio' && this.process) {
      this.process.kill();
      this.process = null;
    } else if (this.transportType === 'sse' && this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.isConnected = false;
  }

  async listTools(): Promise<any[]> {
    const response = await this.sendRequest('tools/list', {});
    return response.tools || [];
  }

  async listResources(): Promise<any[]> {
    const response = await this.sendRequest('resources/list', {});
    return response.resources || [];
  }

  async listPrompts(): Promise<any[]> {
    const response = await this.sendRequest('prompts/list', {});
    return response.prompts || [];
  }

  async callTool(name: string, args?: any): Promise<MCPTestResponse> {
    try {
      const response = await this.sendRequest('tools/call', {
        name,
        arguments: args || {}
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async readResource(uri: string): Promise<MCPTestResponse> {
    try {
      const response = await this.sendRequest('resources/read', { uri });
      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getPrompt(name: string, args?: any): Promise<MCPTestResponse> {
    try {
      const response = await this.sendRequest('prompts/get', {
        name,
        arguments: args || {}
      });

      return {
        success: true,
        data: response
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async testRequest(request: MCPTestRequest): Promise<MCPTestResponse> {
    switch (request.method) {
      case 'tool':
        return this.callTool(request.name, request.params);
      case 'resource':
        return this.readResource(request.name);
      case 'prompt':
        return this.getPrompt(request.name, request.params);
      default:
        return {
          success: false,
          error: 'Unknown request method'
        };
    }
  }

  private async initialize(): Promise<void> {
    const response = await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'quickmcp-test-client',
        version: '1.0.0'
      }
    });

    // Send initialized notification
    this.sendNotification('notifications/initialized', {});

    return response;
  }

  private sendNotification(method: string, params: any): void {
    const message: any = {
      jsonrpc: '2.0',
      method,
      params
    };

    if (this.transportType === 'stdio' && this.process?.stdin) {
      this.process.stdin.write(JSON.stringify(message) + '\n');
    } else if (this.transportType === 'sse') {
      axios.post(`http://localhost:${this.port}/message`, message)
        .catch(error => console.error('Error sending SSE message:', error));
    }
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = this.messageId++;
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      if (this.transportType === 'stdio' && this.process?.stdin) {
        this.process.stdin.write(JSON.stringify(message) + '\n');
      } else if (this.transportType === 'sse') {
        axios.post(`http://localhost:${this.port}/message`, message)
          .catch(error => {
            this.pendingRequests.delete(id);
            reject(error);
          });
      } else {
        this.pendingRequests.delete(id);
        reject(new Error('Not connected'));
      }

      // Add timeout
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 30000);
    });
  }

  private handleStdioMessage(data: string): void {
    this.buffer += data;
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const message: MCPMessage = JSON.parse(line);
        this.processMessage(message);
      } catch (error) {
        console.error('Error parsing message:', error, 'Line:', line);
      }
    }
  }

  private handleSSEMessage(message: MCPMessage): void {
    this.processMessage(message);
  }

  private processMessage(message: MCPMessage): void {
    if (message.id && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(message.error.message));
      } else {
        resolve(message.result);
      }
    }
  }
}