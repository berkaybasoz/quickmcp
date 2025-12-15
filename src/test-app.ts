import { DataSourceParser } from './parsers';
import { MCPServerGenerator } from './generators/MCPServerGenerator';
import * as fs from 'fs';
import * as path from 'path';

async function testApplication() {
  //console.log('🚀 Testing MCP Server Generator Application');

  try {
    // Test 1: Parse CSV data
    //console.log('\n1. Testing CSV parsing...');
    const parser = new DataSourceParser();
    const dataSource = {
      type: 'csv' as const,
      name: 'test-data',
      filePath: path.join(__dirname, 'test-data.csv')
    };

    const parsedData = await parser.parse(dataSource);
    console.log('✅ CSV parsing successful');
    console.log(`   - Found ${parsedData.length} table(s)`);
    console.log(`   - Headers: ${parsedData[0].headers.join(', ')}`);
    console.log(`   - Rows: ${parsedData[0].rows.length}`);
    console.log(`   - Data types: ${JSON.stringify(parsedData[0].metadata.dataTypes, null, 2)}`);

    // Test 2: Generate MCP Server
    console.log('\n2. Testing MCP server generation...');
    const generator = new MCPServerGenerator();
    const config = generator.generateConfigFromData(
      'employee-data-server',
      'MCP server for employee data analysis and querying',
      parsedData
    );

    console.log('✅ MCP server config generated');
    console.log(`   - Tools: ${config.tools.length}`);
    console.log(`   - Resources: ${config.resources.length}`);
    console.log(`   - Prompts: ${config.prompts.length}`);

    // Test 3: Generate server code
    console.log('\n3. Testing server code generation...');
    const serverCode = generator.generateServer(config, parsedData);
    const packageJson = generator.generatePackageJson(config);

    // Write generated files
    const outputDir = './generated-test-server';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(path.join(outputDir, 'index.ts'), serverCode);
    fs.writeFileSync(path.join(outputDir, 'package.json'), packageJson);

    console.log('✅ Server code generated successfully');
    console.log(`   - Generated files in: ${outputDir}`);
    console.log(`   - index.ts: ${(serverCode.length / 1024).toFixed(1)}KB`);

    // Test 4: Validate generated tools
    console.log('\n4. Testing generated tools...');
    const toolNames = config.tools.map(t => t.name);
    const expectedTools = ['search_table_0', 'get_all_table_0', 'filter_table_0_by_name', 'filter_table_0_by_age', 'filter_table_0_by_city', 'filter_table_0_by_salary'];

    const hasExpectedTools = expectedTools.every(tool => toolNames.some(t => t.includes(tool.split('_').slice(-1)[0])));

    if (hasExpectedTools) {
      console.log('✅ Generated tools validation passed');
    } else {
      console.log('❌ Generated tools validation failed');
      console.log(`   Expected tools containing: ${expectedTools.join(', ')}`);
      console.log(`   Generated tools: ${toolNames.join(', ')}`);
    }

    // Test 5: Validate generated resources
    console.log('\n5. Testing generated resources...');
    const resourceUris = config.resources.map(r => r.uri);
    const expectedResources = ['schema://table_0', 'data://table_0/sample'];

    const hasExpectedResources = expectedResources.every(uri => resourceUris.includes(uri));

    if (hasExpectedResources) {
      console.log('✅ Generated resources validation passed');
    } else {
      console.log('❌ Generated resources validation failed');
      console.log(`   Expected: ${expectedResources.join(', ')}`);
      console.log(`   Generated: ${resourceUris.join(', ')}`);
    }

    console.log('\n🎉 All tests completed successfully!');
    console.log('\nGenerated MCP Server Summary:');
    console.log(`   - Name: ${config.name}`);
    console.log(`   - Description: ${config.description}`);
    console.log(`   - Tools: ${config.tools.length}`);
    console.log(`   - Resources: ${config.resources.length}`);
    console.log(`   - Prompts: ${config.prompts.length}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testApplication();
