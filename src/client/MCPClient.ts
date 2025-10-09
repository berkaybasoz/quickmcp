import { spawn, ChildProcess } from 'child_process';
import { MCPTestRequest, MCPTestResponse } from '../types';

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

export class MCPClient {
  private process: ChildProcess | null = null;
  private messageId = 1;
  private pendingRequests = new Map<number, {
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }>();
  private isConnected = false;
  private buffer = '';

  async connect(serverPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      this.process.stdout?.on('data', (data) => {
        this.handleMessage(data.toString());
      });

      this.process.stderr?.on('data', (data) => {
        console.error('MCP Server stderr:', data.toString());
      });

      this.process.on('error', (error) => {
        console.error('MCP Server process error:', error);
        reject(error);
      });

      this.process.on('exit', (code) => {
        console.error('MCP Server process exited with code:', code);
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

  async disconnect(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
      this.isConnected = false;
    }
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
    await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {
        roots: {},
        sampling: {}
      },
      clientInfo: {
        name: 'MCP Server Generator Client',
        version: '1.0.0'
      }
    });

    await this.sendNotification('initialized', {});
  }

  private async sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error('Not connected to MCP server'));
        return;
      }

      const id = this.messageId++;
      const message: MCPMessage = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });

      const messageStr = JSON.stringify(message) + '\n';
      this.process.stdin.write(messageStr);

      // Set timeout for requests
      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  }

  private async sendNotification(method: string, params: any): Promise<void> {
    if (!this.process?.stdin) {
      throw new Error('Not connected to MCP server');
    }

    const message = {
      jsonrpc: '2.0',
      method,
      params
    };

    const messageStr = JSON.stringify(message) + '\n';
    this.process.stdin.write(messageStr);
  }

  private handleMessage(data: string): void {
    this.buffer += data;

    let newlineIndex;
    while ((newlineIndex = this.buffer.indexOf('\n')) !== -1) {
      const messageStr = this.buffer.slice(0, newlineIndex);
      this.buffer = this.buffer.slice(newlineIndex + 1);

      if (messageStr.trim()) {
        try {
          const message: MCPMessage = JSON.parse(messageStr);
          this.processMessage(message);
        } catch (error) {
          console.error('Failed to parse MCP message:', messageStr, error);
        }
      }
    }
  }

  private processMessage(message: MCPMessage): void {
    if (message.id !== undefined && this.pendingRequests.has(message.id)) {
      const { resolve, reject } = this.pendingRequests.get(message.id)!;
      this.pendingRequests.delete(message.id);

      if (message.error) {
        reject(new Error(`MCP Error (${message.error.code}): ${message.error.message}`));
      } else {
        resolve(message.result);
      }
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }
}