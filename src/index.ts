import dotenv from 'dotenv';

dotenv.config({ path: process.env.DOTENV_CONFIG_PATH || '.env' });

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { startServer } = require('./server/server') as typeof import('./server/server');

startServer();

export * from './types';
export * from './parsers';
export * from './generators/MCPServerGenerator';
export * from './client/MCPClient';
export * from './client/MCPTestRunner';
