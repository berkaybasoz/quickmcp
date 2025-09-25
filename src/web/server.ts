import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { DataSourceParser } from '../parsers';
import { MCPServerGenerator } from '../generators/MCPServerGenerator';
import { MCPTestRunner } from '../client/MCPTestRunner';
import { DataSource, MCPServerConfig, ParsedData } from '../types';
import { fork } from 'child_process';
import { IntegratedMCPServer } from '../integrated-mcp-server';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const parser = new DataSourceParser();
const generator = new MCPServerGenerator();
const testRunner = new MCPTestRunner();

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

    console.log(`Starting runtime MCP server for ${serverId} on port ${port}`);

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
        console.log(`MCP Server ${serverId} ready on port ${port}`);
        resolve(port);
      }
    });

    mcpProcess.on('error', (error) => {
      console.error(`MCP Server ${serverId} error:`, error);
      reject(error);
    });

    mcpProcess.on('exit', (code) => {
      console.log(`MCP Server ${serverId} exited with code ${code}`);
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
    const { type, connection } = req.body;
    const file = req.file;

    let dataSource: DataSource;

    if (type === 'database') {
      dataSource = {
        type: 'database',
        name: `Database (${connection.type})`,
        connection: JSON.parse(connection)
      };
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
    const { name, description, dataSource, customConfig } = req.body;

    // Check if server with this name already exists
    if (generatedServers.has(name)) {
      return res.status(400).json({
        success: false,
        error: `MCP Server with name "${name}" already exists. Please choose a different name.`
      });
    }

    // Re-parse the data source to get full data
    const parsedData = await parser.parse(dataSource);

    let config: MCPServerConfig;

    if (customConfig) {
      config = customConfig;
      config.dataSource = dataSource;
    } else {
      config = generator.generateConfigFromData(name, description, parsedData);
      config.dataSource = dataSource;
    }

    // Generate server code
    const serverCode = generator.generateServer(config, parsedData);
    const packageJson = generator.generatePackageJson(config);

    // Create server directory
    const serverDir = path.join(process.cwd(), 'generated-servers', config.name);
    await fs.mkdir(serverDir, { recursive: true });

    // Write server files
    const serverPath = path.join(serverDir, 'index.ts');
    const packagePath = path.join(serverDir, 'package.json');

    await fs.writeFile(serverPath, serverCode);
    await fs.writeFile(packagePath, packageJson);

    // Store server info
    generatedServers.set(config.name, {
      config,
      serverPath,
      parsedData
    });

    res.json({
      success: true,
      data: {
        serverId: config.name,
        serverPath,
        config
      }
    });
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
  const servers = Array.from(generatedServers.entries()).map(([id, data]) => ({
    id,
    name: data.config.name,
    description: data.config.description,
    version: data.config.version,
    toolsCount: data.config.tools.length,
    resourcesCount: data.config.resources.length,
    promptsCount: data.config.prompts.length,
    dataRowsCount: data.parsedData.reduce((acc, d) => acc + d.rows.length, 0)
  }));

  res.json({ success: true, data: servers });
});

// Check if server name is available endpoint
app.get('/api/servers/check-name/:name', (req, res) => {
  const serverName = req.params.name;
  const isAvailable = !generatedServers.has(serverName);

  res.json({
    success: true,
    available: isAvailable,
    message: isAvailable ?
      `Server name "${serverName}" is available` :
      `Server name "${serverName}" already exists`
  });
});

// Get server details endpoint
app.get('/api/servers/:id', (req, res) => {
  const serverInfo = generatedServers.get(req.params.id);

  if (!serverInfo) {
    return res.status(404).json({
      success: false,
      error: 'Server not found'
    });
  }

  res.json({
    success: true,
    data: {
      config: serverInfo.config,
      parsedData: serverInfo.parsedData.map(data => ({
        ...data,
        rows: data.rows.slice(0, 20) // Limit rows for API response
      }))
    }
  });
});

// Test server endpoint
app.post('/api/servers/:id/test', async (req, res) => {
  try {
    const serverInfo = generatedServers.get(req.params.id);

    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
      });
    }

    const { testSuite, customRequest } = req.body;

    if (customRequest) {
      // Run a single custom test
      const testCase = {
        name: 'Custom Test',
        description: 'Custom test request',
        request: customRequest
      };

      const result = await testRunner.runTestCase(testCase);

      res.json({
        success: true,
        data: result
      });
    } else if (testSuite) {
      // Run a full test suite
      const result = await testRunner.runTestSuite(serverInfo.serverPath, testSuite);

      res.json({
        success: true,
        data: result
      });
    } else {
      // Generate and run auto test suite
      const autoTestSuite = await testRunner.generateTestSuite(
        serverInfo.serverPath,
        serverInfo.config.name
      );

      const result = await testRunner.runTestSuite(serverInfo.serverPath, autoTestSuite);

      res.json({
        success: true,
        data: result
      });
    }
  } catch (error) {
    console.error('Test error:', error);
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
    console.log(`Available servers:`, Array.from(generatedServers.keys()));

    const serverInfo = generatedServers.get(serverId);

    if (!serverInfo) {
      console.log(`Server with ID "${serverId}" not found`);
      return res.status(404).json({
        success: false,
        error: `Server with ID "${serverId}" not found. Available servers: ${Array.from(generatedServers.keys()).join(', ') || 'None'}`
      });
    }

    // Remove server files
    const serverDir = path.dirname(serverInfo.serverPath);
    await fs.rm(serverDir, { recursive: true, force: true });

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
  res.sendFile(path.join(__dirname, 'public', 'manage-servers.html'));
});

app.get('/test-servers', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'test-servers.html'));
});

app.get('/how-to-use', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'how-to-use.html'));
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
        try {
          const message = JSON.parse(line);
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
            console.log('MCP client initialized');
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
            res.flush && res.flush();
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
            res.flush && res.flush();
          }
        }
      }
    }
  });

  req.on('end', () => {
    console.log('MCP stdio connection ended');
    res.end();
  });

  req.on('error', (error) => {
    console.error('MCP stdio connection error:', error);
    res.end();
  });

  req.on('close', () => {
    console.log('MCP stdio connection closed');
  });
});

// Serve index.html for root and any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
const MCP_PORT = 3001;

// Initialize integrated MCP server
const integratedMCPServer = new IntegratedMCPServer(generatedServers);

app.listen(PORT, async () => {
  console.log(`🌐 MCP Server Generator running on http://localhost:${PORT}`);

  // Start integrated MCP server
  try {
    await integratedMCPServer.start(MCP_PORT);
    console.log(`🔗 Add to Claude Desktop config:`);
    console.log(`{`);
    console.log(`  "quickmcp-integrated": {`);
    console.log(`    "command": "curl",`);
    console.log(`    "args": ["-X", "POST", "http://localhost:${MCP_PORT}/sse/message"],`);
    console.log(`    "env": {`);
    console.log(`      "MCP_TRANSPORT": "sse"`);
    console.log(`    }`);
    console.log(`  }`);
    console.log(`}`);
  } catch (error) {
    console.error('❌ Failed to start integrated MCP server:', error);
  }
});

export default app;