import dotenv from 'dotenv';
import { startServer } from './server/server';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

startServer();

export * from './types';
export * from './parsers';
export * from './generators/MCPServerGenerator';
export * from './client/MCPClient';
export * from './client/MCPTestRunner';
