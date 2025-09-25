#!/usr/bin/env tsx

import { IntegratedMCPServer } from './src/integrated-mcp-server-new.js';

async function startServer() {
  const server = new IntegratedMCPServer();
  await server.start(3001);
}

startServer().catch(console.error);