#!/usr/bin/env tsx

import { IntegratedMCPServer } from './integrated-mcp-server-new';

async function startServer() {
  const server = new IntegratedMCPServer();
  await server.start(3001);
}

startServer().catch(console.error);
