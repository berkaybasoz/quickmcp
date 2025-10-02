import { MCPClientUnified } from './MCPClientUnified';
import { MCPTestRequest, MCPTestResponse } from '../types';
import { TransportType } from '../transport';

export interface TestSuite {
  name: string;
  description: string;
  tests: TestCase[];
}

export interface TestCase {
  name: string;
  description: string;
  request: MCPTestRequest;
  expectedSuccess?: boolean;
  expectedDataContains?: any;
  timeout?: number;
}

export interface TestResult {
  testCase: TestCase;
  response: MCPTestResponse;
  passed: boolean;
  duration: number;
  error?: string;
  transport?: TransportType;
}

export interface TestSuiteResult {
  testSuite: TestSuite;
  results: TestResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
  transport?: TransportType;
}

export class MCPTestRunnerUnified {
  private stdioClient: MCPClientUnified;
  private sseClient: MCPClientUnified;

  constructor(ssePort: number = 3001) {
    this.stdioClient = new MCPClientUnified('stdio');
    this.sseClient = new MCPClientUnified('sse', ssePort);
  }

  async runTestSuiteBothTransports(
    serverPath: string,
    testSuite: TestSuite
  ): Promise<{ stdio: TestSuiteResult; sse: TestSuiteResult }> {
    console.log('Running tests with STDIO transport...');
    const stdioResult = await this.runTestSuite(serverPath, testSuite, 'stdio');
    
    console.log('Running tests with SSE transport...');
    const sseResult = await this.runTestSuite(null, testSuite, 'sse');
    
    return { stdio: stdioResult, sse: sseResult };
  }

  async runTestSuite(
    serverPath: string | null,
    testSuite: TestSuite,
    transport: TransportType = 'stdio'
  ): Promise<TestSuiteResult> {
    const startTime = Date.now();
    const results: TestResult[] = [];
    const client = transport === 'stdio' ? this.stdioClient : this.sseClient;

    try {
      if (transport === 'stdio' && !serverPath) {
        throw new Error('Server path required for stdio transport');
      }
      
      await client.connect(serverPath || undefined);

      for (const testCase of testSuite.tests) {
        const result = await this.runTestCase(client, testCase, transport);
        results.push(result);
      }
    } catch (error) {
      console.error(`Error running test suite with ${transport}:`, error);
    } finally {
      await client.disconnect();
    }

    const duration = Date.now() - startTime;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = results.length - passedTests;

    return {
      testSuite,
      results,
      totalTests: results.length,
      passedTests,
      failedTests,
      duration,
      transport
    };
  }

  async runTestCase(
    client: MCPClientUnified,
    testCase: TestCase,
    transport: TransportType
  ): Promise<TestResult> {
    const startTime = Date.now();

    try {
      const response = await client.testRequest(testCase.request);
      const duration = Date.now() - startTime;

      const passed = this.evaluateTestResult(testCase, response);

      return {
        testCase,
        response,
        passed,
        duration,
        transport
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      return {
        testCase,
        response: {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        passed: false,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
        transport
      };
    }
  }

  async generateTestSuite(
    serverPath: string | null,
    suiteName: string,
    transport: TransportType = 'stdio'
  ): Promise<TestSuite> {
    const client = transport === 'stdio' ? this.stdioClient : this.sseClient;
    
    if (transport === 'stdio' && !serverPath) {
      throw new Error('Server path required for stdio transport');
    }
    
    await client.connect(serverPath || undefined);

    try {
      const tools = await client.listTools();
      const resources = await client.listResources();
      const prompts = await client.listPrompts();

      const tests: TestCase[] = [];

      // Generate tool tests
      for (const tool of tools) {
        tests.push({
          name: `Test tool: ${tool.name}`,
          description: `Test the ${tool.name} tool with sample parameters`,
          request: {
            serverId: suiteName,
            method: 'tool',
            name: tool.name,
            params: this.generateSampleParams(tool.inputSchema)
          },
          expectedSuccess: true
        });
      }

      // Generate resource tests
      for (const resource of resources) {
        tests.push({
          name: `Test resource: ${resource.name}`,
          description: `Test reading the ${resource.name} resource`,
          request: {
            serverId: suiteName,
            method: 'resource',
            name: resource.uri,
          },
          expectedSuccess: true
        });
      }

      // Generate prompt tests
      for (const prompt of prompts) {
        tests.push({
          name: `Test prompt: ${prompt.name}`,
          description: `Test the ${prompt.name} prompt with sample arguments`,
          request: {
            serverId: suiteName,
            method: 'prompt',
            name: prompt.name,
            params: this.generateSampleParams(prompt.arguments)
          },
          expectedSuccess: true
        });
      }

      return {
        name: suiteName,
        description: `Auto-generated test suite for ${suiteName}`,
        tests
      };
    } finally {
      await client.disconnect();
    }
  }

  private evaluateTestResult(testCase: TestCase, response: MCPTestResponse): boolean {
    if (testCase.expectedSuccess !== undefined) {
      if (testCase.expectedSuccess !== response.success) {
        return false;
      }
    }

    if (testCase.expectedDataContains && response.data) {
      const dataStr = JSON.stringify(response.data);
      const expectedStr = JSON.stringify(testCase.expectedDataContains);
      if (!dataStr.includes(expectedStr)) {
        return false;
      }
    }

    return response.success;
  }

  private generateSampleParams(schema: any): any {
    if (!schema || !schema.properties) {
      return {};
    }

    const params: any = {};

    for (const [key, propValue] of Object.entries(schema.properties as any)) {
      const prop = propValue as any;
      if (prop.type === 'string') {
        params[key] = prop.default || 'test';
      } else if (prop.type === 'number') {
        params[key] = prop.default || 1;
      } else if (prop.type === 'boolean') {
        params[key] = prop.default || false;
      } else if (prop.type === 'array') {
        params[key] = [];
      } else if (prop.type === 'object') {
        params[key] = {};
      }
    }

    return params;
  }
}