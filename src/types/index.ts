export interface CurlSetting {
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
}

export interface FileDataSource extends DataSource {
  filePath: string;
}

export interface CsvDataSource extends FileDataSource {
  type: DataSourceType.CSV;
}

export interface ExcelDataSource extends FileDataSource {
  type: DataSourceType.Excel;
}

export interface JsonDataSource extends DataSource {
  type: DataSourceType.JSON;
  data: any[];
}

export interface CurlDataSource extends DataSource {
  type: DataSourceType.Curl;
  curlSetting: CurlSetting;
  //alias?: string;
}

export interface WebpageDataSource extends DataSource {
  type: DataSourceType.Webpage;
}

export interface RestDataSource extends DataSource {
  type: DataSourceType.Rest;
  swaggerUrl: string;
  baseUrl?: string;
}

export function createCsvDataSource(name: string, filePath: string): CsvDataSource {
  return {
    type: DataSourceType.CSV,
    name,
    filePath
  };
}

export function createExcelDataSource(name: string, filePath: string): ExcelDataSource {
  return {
    type: DataSourceType.Excel,
    name,
    filePath
  };
}


export function createJsonDataSource(name: string, data: any[]): JsonDataSource {
  return {
    type: DataSourceType.JSON,
    name,
    data
  };
}

export function createCurlDataSource(name: string, curlSetting: CurlSetting): CurlDataSource {
  return {
    type: DataSourceType.Curl,
    name,
    curlSetting
  };
}

export function createRestDataSource(name: string, swaggerUrl: string, baseUrl?: string): RestDataSource {
  return {
    type: DataSourceType.Rest,
    name,
    swaggerUrl,
    baseUrl
  };
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