export interface CurlOptions {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: { [key: string]: string };
  body?: string;
}

export enum DataSourceType {
  Database = 'database',
  CSV = 'csv',
  Excel = 'excel',
  JSON = 'json',
  Curl = 'curl',
  Webpage = 'webpage',
  Rest = 'rest',
}

export interface DataSource {
  type: DataSourceType;
  name: string;
  connection?: DatabaseConnection;
  filePath?: string;
  data?: any[];
  curlOptions?: CurlOptions;
}

export interface DatabaseConnection {
  host?: string;
  port?: number;
  database: string;
  username?: string;
  password?: string;
  type: 'mysql' | 'postgresql' | 'sqlite' | 'mssql';
}

export interface MCPServerConfig {
  name: string;
  description: string;
  version: string;
  dataSource: DataSource;
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: any;
  handler: string;
}

export interface MCPResource {
  uri: string;
  name: string;
  description: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  description: string;
  arguments: any[];
  template: string;
}

export interface ParsedData {
  tableName?: string;
  headers: string[];
  rows: any[][];
  metadata: {
    rowCount: number;
    columnCount: number;
    dataTypes: Record<string, string>;
  };
}

export interface MCPTestRequest {
  serverId: string;
  method: 'tool' | 'resource' | 'prompt';
  name: string;
  params?: any;
}

export interface MCPTestResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ActiveDatabaseConnection {
  connection: any;
  config: any;
}