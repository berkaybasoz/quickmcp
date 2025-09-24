import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { DataSourceParser } from '../parsers';
import { MCPServerGenerator } from '../generators/MCPServerGenerator';
import { MCPTestRunner } from '../client/MCPTestRunner';
import { DataSource, MCPServerConfig, ParsedData } from '../types';

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const parser = new DataSourceParser();
const generator = new MCPServerGenerator();
const testRunner = new MCPTestRunner();

// Store generated servers in memory (in production, use a database)
const generatedServers = new Map<string, {
  config: MCPServerConfig;
  serverPath: string;
  parsedData: ParsedData[];
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
    const serverInfo = generatedServers.get(req.params.id);

    if (!serverInfo) {
      return res.status(404).json({
        success: false,
        error: 'Server not found'
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
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`MCP Server Generator running on http://localhost:${PORT}`);
});

export default app;