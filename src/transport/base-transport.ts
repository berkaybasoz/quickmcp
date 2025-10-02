export interface MCPMessage {
  jsonrpc: string;
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export abstract class BaseTransport {
  protected messageHandlers: Map<string, (message: MCPMessage) => void> = new Map();
  
  abstract start(port?: number): Promise<void>;
  abstract stop(): Promise<void>;
  abstract sendMessage(message: MCPMessage): void;
  
  onMessage(handler: (message: MCPMessage) => void): void {
    this.messageHandlers.set('default', handler);
  }
  
  protected notifyHandlers(message: MCPMessage): void {
    this.messageHandlers.forEach(handler => handler(message));
  }
}