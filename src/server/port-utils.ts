export class PortUtils {
  static readonly DEFAULT_WEB_PORT = 3000;
  static readonly DEFAULT_MCP_PORT = 3001;

  private nextAvailablePort: number;

  constructor(private readonly env: NodeJS.ProcessEnv = process.env) {
    this.nextAvailablePort = this.resolvePort(this.env.MCP_PORT, PortUtils.DEFAULT_MCP_PORT);
  }

  resolvePort(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
    return fallback;
  }

  resolveServerPorts(): { port: number; mcpPort: number } {
    return {
      port: this.resolvePort(this.env.PORT, PortUtils.DEFAULT_WEB_PORT),
      mcpPort: this.resolvePort(this.env.MCP_PORT, PortUtils.DEFAULT_MCP_PORT)
    };
  }

  getNextPort(): number {
    const port = this.nextAvailablePort;
    this.nextAvailablePort += 1;
    return port;
  }
}
