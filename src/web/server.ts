import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import fsSync from 'fs';
import os from 'os';
import { DataSourceParser } from '../parsers';
import { MCPServerGenerator } from '../generators/MCPServerGenerator';
import { MCPTestRunner } from '../client/MCPTestRunner';
import { DataSource, MCPServerConfig, ParsedData } from '../types';
import { fork } from 'child_process';
import { IntegratedMCPServer } from '../integrated-mcp-server-new';
import { SQLiteManager } from '../database/sqlite-manager';
import Database from 'better-sqlite3';

const app = express();

// Resolve a writable uploads directory that works under npx (CWD may be '/')
// Priority: QUICKMCP_UPLOAD_DIR -> os.tmpdir()/quickmcp-uploads
const configuredUploadDir = process.env.QUICKMCP_UPLOAD_DIR;
const defaultUploadDir = path.join(os.tmpdir(), 'quickmcp-uploads');
const uploadDir = configuredUploadDir
  ? (path.isAbsolute(configuredUploadDir)
      ? configuredUploadDir
      : path.join(process.cwd(), configuredUploadDir))
  : defaultUploadDir;

try { fsSync.mkdirSync(uploadDir, { recursive: true }); } catch {}
const upload = multer({ dest: uploadDir });

app.use(cors());
app.use(express.json());

// Prefer the new UI under src/web/public if bundled, otherwise fall back to dist/web/public
const distPublicDir = path.join(__dirname, 'public');
const srcPublicDir = path.join(__dirname, '..', '..', 'src', 'web', 'public');
const publicDir = fsSync.existsSync(srcPublicDir) ? srcPublicDir : distPublicDir;

app.use(express.static(publicDir));

const parser = new DataSourceParser();
// Lazily initialize heavy/native-backed services to avoid startup failure
let generator: MCPServerGenerator | null = null;
let sqliteManager: SQLiteManager | null = null;
const testRunner = new MCPTestRunner();

function ensureGenerator(): MCPServerGenerator {
  if (!generator) {
    generator = new MCPServerGenerator();
  }
  return generator;
}

function ensureSQLite(): SQLiteManager {
  if (!sqliteManager) {
    sqliteManager = new SQLiteManager();
  }
  return sqliteManager;
}

let nextAvailablePort = 3001;

function getNextPort(): number {
  return nextAvailablePort++;
}

function startRuntimeMCPServer(serverId: string, serverPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const serverInfo = generatedServers.get(serverId);
    if (!serverInfo) {
      reject(new Error('Server not found'));
      return;
    }

    // Kill existing process if running
    if (serverInfo.runtimeProcess) {
      serverInfo.runtimeProcess.kill();
    }

    const port = getNextPort();
    const serverDir = path.dirname(serverPath);

    //console.log(`Starting runtime MCP server for ${serverId} on port ${port}`);

    // Fork the MCP server process
    const mcpProcess = fork(serverPath, [], {
      cwd: serverDir,
      env: {
        ...process.env,
        MCP_PORT: port.toString()
      },
      stdio: ['pipe', 'pipe', 'pipe', 'ipc']
    });

    mcpProcess.on('message', (message) => {
      if (message === 'ready') {
        //console.log(`MCP Server ${serverId} ready on port ${port}`);
        resolve(port);
      }
    });

    mcpProcess.on('error', (error) => {
      console.error(`MCP Server ${serverId} error:`, error);
      reject(error);
    });

    mcpProcess.on('exit', (code) => {
      //console.log(`MCP Server ${serverId} exited with code ${code}`);
      if (serverInfo.runtimeProcess === mcpProcess) {
        serverInfo.runtimeProcess = undefined;
        serverInfo.runtimePort = undefined;
      }
    });

    // Update server info
    serverInfo.runtimeProcess = mcpProcess;
    serverInfo.runtimePort = port;

    // Fallback timeout
    setTimeout(() => {
      if (serverInfo.runtimePort === port) {
        resolve(port);
      }
    }, 3000);
  });
}

// Store generated servers in memory (in production, use a database)
const generatedServers = new Map<string, {
  config: MCPServerConfig;
  serverPath: string;
  parsedData: ParsedData[];
  runtimeProcess?: any;
  runtimePort?: number;
}>();

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Parse data source endpoint
app.post('/api/parse', upload.single('file'), async (req, res) => {
  try {
    const { type, connection, swaggerUrl, curlOptions } = req.body as any;
    const file = req.file;

    let dataSource: DataSource;

    // Accept database parse either when type==='database' OR when a connection payload is present
    if (type === 'database' || connection) {
      let connObj: any = connection;
      if (typeof connObj === 'string') {
        try { connObj = JSON.parse(connObj); } catch { connObj = null; }
      }
      if (!connObj || !connObj.type) {
        throw new Error('Missing or invalid database connection');
      }
      dataSource = {
        type: 'database',
        name: `Database (${connObj.type})`,
        connection: connObj
      } as any;
    } else if (type === 'rest') {
      if (!swaggerUrl) throw new Error('Missing swaggerUrl');
      // Fetch OpenAPI spec
      const resp = await fetch(swaggerUrl);
      if (!resp.ok) throw new Error(`Failed to fetch OpenAPI: ${resp.status}`);
      const spec: any = await resp.json();
      // Derive baseUrl
      let baseUrl = '';
      if (spec && Array.isArray(spec.servers) && spec.servers.length && spec.servers[0]?.url) {
        baseUrl = spec.servers[0].url;
      } else if (spec && spec.schemes && spec.host) {
        const scheme = Array.isArray(spec.schemes) && spec.schemes.length ? spec.schemes[0] : 'https';
        const basePath = spec.basePath || '';
        baseUrl = `${scheme}://${spec.host}${basePath}`;
      } else {
        // Fallback: strip filename from swaggerUrl
        try {
          const u = new URL(swaggerUrl);
          baseUrl = swaggerUrl.replace(/\/[^/]*$/, '');
          if (!baseUrl.startsWith(u.origin)) baseUrl = u.origin;
        } catch { baseUrl = swaggerUrl.replace(/\/[^/]*$/, ''); }
      }
      // Parse paths -> endpoints
      const endpoints: any[] = [];
      const paths = (spec && (spec as any).paths) || {};
      const methods = ['get','post','put','patch','delete'];
      for (const p of Object.keys(paths)) {
        const ops = paths[p] || {};
        for (const m of methods) {
          if (ops[m]) {
            const op = ops[m];
            endpoints.push({
              method: m.toUpperCase(),
              path: p,
              summary: op.summary || op.operationId || '',
              parameters: op.parameters || [],
              requestBody: op.requestBody || null
            });
          }
        }
      }
      return res.json({
        success: true,
        data: {
          dataSource: { type: 'rest', swaggerUrl, baseUrl },
          parsedData: endpoints
        }
      });
    } else if (type === 'curl') {
        let opts;
        if (typeof curlOptions === 'string') {
            try {
                opts = JSON.parse(curlOptions);
            } catch (e) {
                throw new Error('Invalid curlOptions JSON');
            }
        } else {
            opts = curlOptions;
        }

        if (!opts || !opts.url) {
            throw new Error('Missing curlOptions or url');
        }

        dataSource = {
            type: 'curl',
            name: `cURL to ${opts.url}`,
            curlOptions: opts
        };
        
        // For cURL, there's no data to parse beforehand.
        // The "data" is what the cURL command will fetch at runtime.
        // We'll create a single tool to represent this action.
        const parsedData = [{
            tableName: 'curl_request',
            headers: ['url', 'method', 'status', 'response'],
            rows: [],
            metadata: {
                rowCount: 0,
                columnCount: 4,
                dataTypes: {
                    url: 'string',
                    method: 'string',
                    status: 'number',
                    response: 'string'
                }
            }
        }];

        return res.json({
            success: true,
            data: {
                dataSource,
                parsedData
            }
        });
    } else if (file) {
      dataSource = {
        type: type as 'csv' | 'excel',
        name: file.originalname,
        filePath: file.path
      };
    } else {
      throw new Error('No file or connection provided');
    }

    const parsedData = await parser.parse(dataSource);

    res.json({
      success: true,
      data: {
        dataSource,
        parsedData: parsedData.map(data => ({
          ...data,
          rows: data.rows.slice(0, 10) // Limit preview rows
        }))
      }
    });
  } catch (error) {
    console.error('Parse error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Generate MCP server endpoint
app.post('/api/generate', async (req, res) => {
  try {
    const { name, description, version, dataSource, selectedTables, parsedData } = req.body;
    
    console.log('🔍 Generate request received:');
    console.log('- Name:', name);
    console.log('- Selected tables:', selectedTables?.length || 0);
    console.log('- Parsed data tables:', parsedData?.length || 0);

    // Check if server with this name already exists
    const existingServer = ensureGenerator().getServer(name);
    if (existingServer) {
      return res.status(400).json({
        success: false,
        error: `MCP Server with name "${name}" already exists. Please choose a different name.`
      });
    }

    let parsedForGen: any = null;
    let dbConfForGen: any = null;

    //console.log('🔍 dataSource.type:', dataSource?.type);
    //console.log('🔍 dataSource:', JSON.stringify(dataSource, null, 2));

    if (dataSource?.type === 'rest') {
      parsedForGen = parsedData; // endpoints array from client
      dbConfForGen = { type: 'rest', baseUrl: dataSource.baseUrl || dataSource.swaggerUrl };
      //console.log('✅ REST config created');
    } else if (dataSource?.type === 'webpage') {
      parsedForGen = {}; // No tables for webpage
      dbConfForGen = { type: 'webpage', alias: dataSource.alias, url: dataSource.url || dataSource.name };
      //console.log('✅ Webpage config created:', dbConfForGen);
    } else if (dataSource?.type === 'curl') {
        parsedForGen = {}; // No tables for curl
        //console.log('🔍 DEBUG dataSource for curl:', JSON.stringify(dataSource, null, 2));
        dbConfForGen = {
          type: 'curl',
          alias: dataSource.alias,
          url: dataSource.url,
          method: dataSource.method || 'GET',
          headers: dataSource.headers || {},
          body: dataSource.body || {}
        };
        //console.log('✅ cURL config created:', JSON.stringify(dbConfForGen, null, 2));
    } else {
      // Use provided parsed data or re-parse if not available
      const fullParsedData = parsedData || await parser.parse(dataSource);

      // Convert to the format expected by new generator
      const parsedDataObject: { [tableName: string]: any[] } = {};
      fullParsedData.forEach((data, index) => {
        const tableName = data.tableName || `table_${index}`;
        parsedDataObject[tableName] = data.rows.map(row => {
          const obj: any = {};
          data.headers.forEach((header, i) => {
            obj[header] = row[i];
          });
          return obj;
        });
      });
      parsedForGen = parsedDataObject;
      dbConfForGen = dataSource.connection || { type: 'csv', server: 'local', database: name };
    }

    // Generate virtual server (saves to SQLite database)
    console.log(`🎯 API calling generateServer with name: "${name}"`);
    const result = await ensureGenerator().generateServer(
      name,
      name,
      parsedForGen,
      dbConfForGen,
      selectedTables
    );

    if (result.success) {
      // Get counts for display
      const tools = ensureGenerator().getToolsForServer(name);
      const resources = ensureGenerator().getResourcesForServer(name);

      res.json({
        success: true,
        data: {
          serverId: name,
          message: result.message,
          toolsCount: tools.length,
          resourcesCount: resources.length,
          promptsCount: 0 // We don't generate prompts yet
        }
      });
    } else {
      res.status(400).json({
        success: false,
        error: result.message
      });
    }
  } catch (error) {
    console.error('Generation error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// List generated servers endpoint
app.get('/api/servers', (req, res) => {
  const gen = ensureGenerator();
  const allServers = gen.getAllServers();
  const servers = allServers.map(server => {
    // Prefer persisted db_config from SQLite to avoid stale/partial objects
    const persisted = ensureSQLite().getServer(server.id);
    const rawType = (persisted?.dbConfig as any)?.type || (server as any)?.dbConfig?.type || 'unknown';
    const type = typeof rawType === 'string' ? rawType : 'unknown';
    const tools = gen.getToolsForServer(server.id);
    const resources = gen.getResourcesForServer(server.id);
    return {
      id: server.id,
      name: server.name,
      type,
      description: `${server.name} - Virtual MCP Server (${type})`,
      version: "1.0.0",
      toolsCount: tools.length,
      resourcesCount: resources.length,
      promptsCount: 0,
    };
  });

  res.json({ success: true, data: servers });
});

// Check if server name is available endpoint
app.get('/api/servers/check-name/:name', (req, res) => {
  const serverName = req.params.name;
  const existingServer = ensureGenerator().getServer(serverName);
  const isAvailable = !existingServer;

  res.json({
    success: true,
    available: isAvailable,
    message: isAvailable ?
      `Server name "${serverName}" is available` :
      `Server name "${serverName}" already exists`
  });
});

// Check if a tool name is available across all servers
app.get('/api/check-tool-name/:toolName', async (req, res) => {
    const { toolName } = req.params;
    try {
        const allServers = ensureSQLite().getAllServers();
        const isTaken = allServers.some(server => {
            const tools = ensureSQLite().getToolsForServer(server.id);
            return tools.some(tool => tool.name === toolName);
        });
        res.json({ success: true, available: !isTaken });
    } catch (error) {
        console.error(`Error checking tool name '${toolName}':`, error);
        res.status(500).json({ success: false, error: 'Failed to check tool name availability' });
    }
});

// Get server details endpoint
app.get('/api/servers/:id', (req, res) => {
  const server = ensureGenerator().getServer(req.params.id);

  if (!server) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  const tools = generator.getToolsForServer(server.id);
  const resources = generator.getResourcesForServer(server.id);

  res.json({
    success: true,
    data: {
      config: {
        name: server.name,
        description: `${server.name} - Virtual MCP Server (${server.dbConfig.type})`,
        version: "1.0.0",
        tools: tools.map(tool => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
          operation: tool.operation
        })),
        resources: resources.map(resource => ({
          name: resource.name,
          description: resource.description,
          uri_template: resource.uri_template
        })),
        prompts: []
      },
      parsedData: []
    }
  });
});

// Get server data endpoint - provides sample data from database
app.get('/api/servers/:id/data', async (req, res) => {
  try {
    const serverId = req.params.id;
    const limit = parseInt(req.query.limit as string) || 10;

    const server = ensureGenerator().getServer(serverId);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Use the DynamicMCPExecutor to get data from first available SELECT tool
    const { DynamicMCPExecutor } = require('../dynamic-mcp-executor.js');
    const executor = new DynamicMCPExecutor();

    const tools = ensureGenerator().getToolsForServer(serverId);
    const selectTool = tools.find(tool => tool.operation === 'SELECT');

    if (!selectTool) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Execute the first SELECT tool to get sample data
    const result = await executor.executeTool(
      `${serverId}__${selectTool.name}`,
      { limit: limit }
    );

    if (result.success && result.data) {
      // Transform the data to match expected format
      const sampleData = Array.isArray(result.data) ? result.data : [];

      res.json({
        success: true,
        data: sampleData.slice(0, limit)
      });
    } else {
      res.json({
        success: true,
        data: []
      });
    }

  } catch (error) {
    console.error('Error getting server data:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Test server endpoint
app.post('/api/servers/:id/test', async (req, res) => {
  try {
    // Get server from SQLite database
    const server = ensureSQLite().getServer(req.params.id);
    if (!server) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    // Get tools for this server
    const tools = ensureSQLite().getToolsForServer(req.params.id);
    
    // Check if this is a custom test or auto test
    const { runAll, testType, toolName, parameters } = req.body;
    
    // For custom tool test
    if (testType === 'tools/call' && toolName) {
      try {
        const { DynamicMCPExecutor } = require('../dynamic-mcp-executor.js');
        const executor = new DynamicMCPExecutor();
        
        // Find the specific tool
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          return res.status(404).json({
            success: false,
            error: `Tool "${toolName}" not found`
          });
        }
        
        const result = await executor.executeTool(
          `${req.params.id}__${toolName}`,
          parameters || {}
        );
        
        res.json({
          success: true,
          data: {
            tool: toolName,
            status: 'success',
            description: tool.description,
            parameters: parameters || {},
            result: result.success ? 'Tool executed successfully' : result,
            rowCount: result.rowCount || 0
          }
        });
        return;
        
      } catch (error) {
        res.json({
          success: true,
          data: {
            tool: toolName,
            status: 'error',
            description: tools.find(t => t.name === toolName)?.description || '',
            parameters: parameters || {},
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        });
        return;
      }
    }
    
    // For auto test, run a sample of available tools
    const testResults = [];
    
    // Test either all tools or just a quick sample
    const toolsToTest = runAll ? tools : tools.slice(0, 3);
    
    for (const tool of toolsToTest) {
      try {
        // Use DynamicMCPExecutor to test the tool
        const { DynamicMCPExecutor } = require('../dynamic-mcp-executor.js');
        const executor = new DynamicMCPExecutor();
        
        // Prepare test parameters based on tool schema
        const testParams: any = {};
        if (tool.inputSchema && typeof tool.inputSchema === 'object' && tool.inputSchema.properties) {
          for (const [paramName, paramDef] of Object.entries(tool.inputSchema.properties as any)) {
            if (paramName === 'limit') testParams[paramName] = 5;
            else if (paramName === 'offset') testParams[paramName] = 0;
            // Add other default test values as needed
          }
        }
        
        const result = await executor.executeTool(
          `${req.params.id}__${tool.name}`,
          testParams
        );
        
        testResults.push({
          tool: tool.name,
          status: 'success',
          description: tool.description,
          parameters: testParams,
          result: result.success ? 'Tool executed successfully' : result,
          rowCount: result.rowCount || 0
        });
        
      } catch (error) {
        testResults.push({
          tool: tool.name,
          status: 'error',
          description: tool.description,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    res.json({
      success: true,
      data: {
        serverName: server.name,
        toolsCount: tools.length,
        testsRun: testResults.length,
        results: testResults
      }
    });
    
  } catch (error) {
    console.error('Test error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Rename server endpoint
app.patch('/api/servers/:id/rename', async (req, res) => {
  try {
    const serverId = req.params.id;
    const { newName } = req.body;

    console.log(`🔄 Rename request for server ID: ${serverId}, new name: ${newName}`);

    if (!newName || typeof newName !== 'string' || !newName.trim()) {
      return res.status(400).json({
        success: false,
        error: 'New name is required and must be a non-empty string'
      });
    }

    const trimmedName = newName.trim();

    // Check if server exists
    const sqlite = ensureSQLite();
    const existingServer = sqlite.getServer(serverId);
    if (!existingServer) {
      console.log(`❌ Server with ID "${serverId}" not found`);
      return res.status(404).json({
        success: false,
        error: `Server with ID "${serverId}" not found`
      });
    }

    // Check if new name is already taken by another server
    const allServers = sqlite.getAllServers();
    const serverWithSameName = allServers.find(s => s.name === trimmedName && s.id !== serverId);
    if (serverWithSameName) {
      console.log(`❌ Server name "${trimmedName}" is already taken by ID: ${serverWithSameName.id}`);
      return res.status(400).json({
        success: false,
        error: `Server name "${trimmedName}" is already taken`
      });
    }

    // Update server name in SQLite database
    existingServer.name = trimmedName;
    sqlite.saveServer(existingServer);

    console.log(`✅ Successfully renamed server ${serverId} to "${trimmedName}"`);

    res.json({
      success: true,
      data: {
        id: serverId,
        name: trimmedName
      }
    });
  } catch (error) {
    console.error('Rename error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Delete server endpoint
app.delete('/api/servers/:id', async (req, res) => {
  try {
    const serverId = req.params.id;
    console.log(`Attempting to delete server with ID: ${serverId}`);

    // Check if server exists in JSON database
    const existingServer = ensureGenerator().getServer(serverId);
    if (!existingServer) {
      console.log(`Server with ID "${serverId}" not found in database`);
      return res.status(404).json({
        success: false,
        error: `Server with ID "${serverId}" not found`
      });
    }

    // Delete from JSON database (primary storage)
    ensureGenerator().deleteServer(serverId);
    console.log(`Deleted server "${serverId}" from JSON database`);

    // Also check and remove from in-memory store if exists
    const serverInfo = generatedServers.get(serverId);
    if (serverInfo) {
      // Remove server files
      const serverDir = path.dirname(serverInfo.serverPath);
      await fs.rm(serverDir, { recursive: true, force: true });
      console.log(`Removed server files from ${serverDir}`);
    }

    // Remove from memory
    generatedServers.delete(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start runtime server endpoint
app.post('/api/servers/:id/start-runtime', async (req, res) => {
  try {
    const serverInfo = generatedServers.get(req.params.id);

    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const port = await startRuntimeMCPServer(req.params.id, serverInfo.serverPath);

    res.json({
      success: true,
      data: {
        serverId: req.params.id,
        port,
        endpoint: `http://localhost:${port}`,
        claudeConfig: {
          [serverInfo.config.name]: {
            command: "curl",
            args: ["-X", "POST", `http://localhost:${port}/sse/message`],
            env: {
              MCP_TRANSPORT: "sse"
            }
          }
        }
      }
    });
  } catch (error) {
    console.error('Runtime start error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Stop runtime server endpoint
app.post('/api/servers/:id/stop-runtime', (req, res) => {
  const serverInfo = generatedServers.get(req.params.id);

  if (!serverInfo) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  if (serverInfo.runtimeProcess) {
    serverInfo.runtimeProcess.kill();
    serverInfo.runtimeProcess = undefined;
    serverInfo.runtimePort = undefined;
  }

  res.json({ success: true });
});

// Export server endpoint
app.get('/api/servers/:id/export', (req, res) => {
  const serverInfo = generatedServers.get(req.params.id);

  if (!serverInfo) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  const serverDir = path.dirname(serverInfo.serverPath);
  const archiveName = `${serverInfo.config.name}-mcp-server.zip`;

  // In a real implementation, you'd create a zip file here
  res.json({
    success: true,
    data: {
      downloadUrl: `/api/servers/${req.params.id}/download`,
      filename: archiveName
    }
  });
});

// Serve the main HTML page
// Serve specific HTML files for different routes
app.get('/manage-servers', (req, res) => {
  res.sendFile(path.join(publicDir, 'manage-servers.html'));
});

app.get('/test-servers', (req, res) => {
  res.sendFile(path.join(publicDir, 'test-servers.html'));
});

app.get('/database-tables', (req, res) => {
  res.sendFile(path.join(publicDir, 'database-tables.html'));
});

app.get('/how-to-use', (req, res) => {
  res.sendFile(path.join(publicDir, 'how-to-use.html'));
});

// Database tables API endpoints
app.get('/api/database/tables', (req, res) => {
  try {
    // Get database path
    const dbPath = path.join(process.cwd(), 'data', 'quickmcp.sqlite');

    // Open database connection
    const db = new Database(dbPath);

    // Get all table names
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all() as any[];

    const tablesInfo = tables.map(table => {
      const tableName = table.name;

      // Get column information
      const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

      // Get row count
      const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
      const rowCount = rowCountResult?.count || 0;

      // Get sample data (first 5 rows)
      const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 5`).all() as any[];

      return {
        name: tableName,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        })),
        rowCount,
        sampleData
      };
    });

    db.close();

    res.json({
      success: true,
      data: {
        dbPath,
        tables: tablesInfo
      }
    });
  } catch (error) {
    console.error('Database tables error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get specific table details
app.get('/api/database/tables/:tableName', (req, res) => {
  try {
    const tableName = req.params.tableName;
    const dbPath = path.join(process.cwd(), 'data', 'quickmcp.sqlite');

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid table name'
      });
    }

    const db = new Database(dbPath);

    // Check if table exists
    const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?").get(tableName);
    if (!tableExists) {
      db.close();
      return res.status(404).json({
        success: false,
        error: 'Table not found'
      });
    }

    // Get column information
    const columns = db.prepare(`PRAGMA table_info(${tableName})`).all() as any[];

    // Get row count
    const rowCountResult = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as any;
    const rowCount = rowCountResult?.count || 0;

    // Get sample data (first 10 rows)
    const sampleData = db.prepare(`SELECT * FROM ${tableName} LIMIT 10`).all() as any[];

    db.close();

    res.json({
      success: true,
      data: {
        name: tableName,
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          notnull: col.notnull === 1,
          pk: col.pk === 1
        })),
        rowCount,
        sampleData
      }
    });
  } catch (error) {
    console.error('Table details error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// STDIO bridge endpoint for MCP
app.post('/api/mcp-stdio', (req, res) => {
  console.log('MCP STDIO bridge connection established');

  // Set headers for keeping connection alive
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');

  let buffer = '';

  req.on('data', (chunk) => {
    buffer += chunk.toString();
    console.log('Received chunk:', chunk.toString());

    // Process complete JSON-RPC messages
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.trim()) {
        let message: any = null;
        try {
          message = JSON.parse(line);
          console.log('Processing MCP message:', JSON.stringify(message, null, 2));

          let response = null;

          // Handle MCP initialize request
          if (message.method === 'initialize') {
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {
                protocolVersion: '2024-11-05',
                serverInfo: {
                  name: 'quickmcp-integrated',
                  version: '1.0.0'
                },
                capabilities: {
                  tools: {},
                  resources: {},
                  prompts: {}
                }
              }
            };
          }

          // Handle tools/list request
          else if (message.method === 'tools/list') {
            const tools = [];

            // Add tools from all generated servers
            for (const [serverId, serverInfo] of generatedServers) {
              for (const tool of serverInfo.config.tools) {
                tools.push({
                  name: `${serverId}__${tool.name}`,
                  description: `[${serverInfo.config.name}] ${tool.description}`,
                  inputSchema: tool.inputSchema
                });
              }
            }

            // Add management tools
            tools.push({
              name: 'quickmcp__list_servers',
              description: 'List all generated MCP servers',
              inputSchema: {
                type: 'object',
                properties: {},
                required: []
              }
            });

            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: { tools }
            };
          }

          // Handle initialized notification (no response needed)
          else if (message.method === 'notifications/initialized') {
            //console.log('MCP client initialized');
            // No response for notifications
          }

          // Handle other requests with placeholder responses
          else if (message.id) {
            response = {
              jsonrpc: '2.0',
              id: message.id,
              result: {}
            };
          }

          // Send response if we have one
          if (response) {
            const responseStr = JSON.stringify(response) + '\n';
            console.log('Sending response:', responseStr.trim());
            res.write(responseStr);
          }
        } catch (error) {
          console.error('Error processing MCP message:', error);
          if (message && message.id) {
            const errorResponse = {
              jsonrpc: '2.0',
              id: message.id,
              error: {
                code: -32603,
                message: 'Internal error'
              }
            };
            res.write(JSON.stringify(errorResponse) + '\n');
          }
        }
      }
    }
  });

  req.on('end', () => {
    console.error('MCP stdio connection ended');
    res.end();
  });

  req.on('error', (error) => {
    console.error('MCP stdio connection error:', error);
    res.end();
  });

  req.on('close', () => {
    console.error('MCP stdio connection closed');
  });
});

// Serve index.html for root and any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

const PORT = process.env.PORT || 3000;
const MCP_PORT = 3001;

// Initialize integrated MCP server (optional in environments without native deps)
let integratedMCPServer: IntegratedMCPServer | null = null;
try {
  integratedMCPServer = new IntegratedMCPServer();
} catch (error) {
  console.error('⚠️ Skipping IntegratedMCPServer initialization:', error instanceof Error ? error.message : error);
}

app.listen(PORT, async () => {
  //console.error(`🌐 MCP Server Generator running on http://localhost:${PORT}`);

  // Start integrated MCP server
  if (integratedMCPServer) {
    try {
      await integratedMCPServer.start(MCP_PORT);
      // Configuration info is now available in the How to Use page
    } catch (error) {
      console.error('❌ Failed to start integrated MCP server:', error);
    }
  }
});

export default app;
