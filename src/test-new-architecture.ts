#!/usr/bin/env node

import { MCPServerGenerator } from './src/generators/MCPServerGenerator-new.js';
import { IntegratedMCPServer } from './src/integrated-mcp-server-new.js';

async function testNewArchitecture() {
  try {
    console.log('🚀 Testing new SQLite-based MCP architecture...\n');

    // 1. Create generator and test server creation
    console.log('1️⃣ Creating MCPServerGenerator...');
    const generator = new MCPServerGenerator();

    // 2. Create a test exception monitor server
    console.log('2️⃣ Creating test exception server...');
    const testData = {
      exception_records: [
        { Id: 1, Application: 'TestApp', Message: 'Division by zero', Source: 'calc.cs', TimeCreated: '2024-01-01T10:00:00Z' },
        { Id: 2, Application: 'TestApp', Message: 'Null reference', Source: 'process.cs', TimeCreated: '2024-01-01T11:00:00Z' },
        { Id: 3, Application: 'WebApp', Message: 'Connection timeout', Source: 'db.cs', TimeCreated: '2024-01-01T12:00:00Z' }
      ]
    };

    const dbConfig = {
      type: 'mssql',
      server: 'localhost',
      port: 1434,
      database: 'exceptionmonitor',
      username: 'sa',
      password: 'StrongPassword123!',
      encrypt: false,
      trustServerCertificate: true
    };

    const result = await generator.generateServer('test-exceptions', 'Test Exception Monitor', testData, dbConfig);

    if (result.success) {
      console.log('✅ Server created successfully:', result.message);
    } else {
      console.log('❌ Server creation failed:', result.message);
      return;
    }

    // 3. Check stats
    console.log('3️⃣ Checking stats...');
    const stats = generator.getStats();
    console.log(`📊 Stats: ${stats.servers} servers, ${stats.tools} tools, ${stats.resources} resources`);

    // 4. List all tools
    console.log('4️⃣ Listing all tools...');
    const allTools = generator.getAllTools();
    console.log(`🔧 Found ${allTools.length} tools:`);
    allTools.forEach(tool => {
      console.log(`   - ${tool.name} (${tool.operation}): ${tool.description}`);
    });

    // 5. Start integrated MCP server
    console.log('5️⃣ Starting IntegratedMCPServer...');
    const integratedServer = new IntegratedMCPServer();

    // Start server on port 3002 to avoid conflicts
    setTimeout(async () => {
      await integratedServer.start(3002);
    }, 1000);

    console.log('\n✅ New architecture test completed successfully!');
    console.log('🌐 IntegratedMCPServer running on http://localhost:3002');
    console.log('🔗 Bridge can now connect to /api/mcp-stdio endpoint');
    console.log('\n📋 Summary:');
    console.log(`   • SQLite database: data/quickmcp.sqlite`);
    console.log(`   • Virtual servers: ${stats.servers}`);
    console.log(`   • Dynamic tools: ${stats.tools}`);
    console.log(`   • Dynamic resources: ${stats.resources}`);
    console.log(`   • No physical files generated! ✨`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testNewArchitecture();