import { BaseTransport, MCPMessage } from './base-transport';

export class StdioTransport extends BaseTransport {
  private buffer = '';
  
  async start(): Promise<void> {
    process.stdin.on('data', (data) => {
      this.buffer += data.toString();
      const lines = this.buffer.split('\n');
      this.buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.trim()) {
          try {
            const message = JSON.parse(line);
            console.error(`[STDIO] Received: ${message.method || 'response'} (id: ${message.id})`);
            this.notifyHandlers(message);
          } catch (error) {
            console.error('[STDIO] Error parsing message:', error);
          }
        }
      }
    });
    
    process.stdin.on('end', () => {
      console.error('[STDIO] STDIN ended');
      process.exit(0);
    });
    
    process.on('SIGINT', () => {
      console.error('[STDIO] Interrupted');
      process.exit(0);
    });
    
    process.on('SIGTERM', () => {
      console.error('[STDIO] Terminated');
      process.exit(0);
    });
    
    process.stdin.resume();
    console.error('[STDIO] Transport started');
  }
  
  async stop(): Promise<void> {
    process.stdin.pause();
    console.error('[STDIO] Transport stopped');
  }
  
  sendMessage(message: MCPMessage): void {
    console.error(`[STDIO] Sending: ${message.result ? 'success' : message.error ? 'error' : 'request'}`);
    process.stdout.write(JSON.stringify(message) + '\n');
  }
}