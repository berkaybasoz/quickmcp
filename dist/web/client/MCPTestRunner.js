"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPTestRunner = void 0;
const MCPClient_1 = require("./MCPClient");
class MCPTestRunner {
    constructor() {
        this.client = new MCPClient_1.MCPClient();
    }
    async runTestSuite(serverPath, testSuite) {
        const startTime = Date.now();
        const results = [];
        try {
            await this.client.connect(serverPath);
            for (const testCase of testSuite.tests) {
                const result = await this.runTestCase(testCase);
                results.push(result);
            }
        }
        finally {
            await this.client.disconnect();
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
            duration
        };
    }
    async runTestCase(testCase) {
        const startTime = Date.now();
        try {
            const response = await this.client.testRequest(testCase.request);
            const duration = Date.now() - startTime;
            const passed = this.evaluateTestResult(testCase, response);
            return {
                testCase,
                response,
                passed,
                duration
            };
        }
        catch (error) {
            const duration = Date.now() - startTime;
            return {
                testCase,
                response: {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error'
                },
                passed: false,
                duration,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
    async generateTestSuite(serverPath, suiteName) {
        await this.client.connect(serverPath);
        try {
            const tools = await this.client.listTools();
            const resources = await this.client.listResources();
            const prompts = await this.client.listPrompts();
            const tests = [];
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
                        params: this.generateSamplePromptArgs(prompt.arguments)
                    },
                    expectedSuccess: true
                });
            }
            return {
                name: suiteName,
                description: `Auto-generated test suite for ${suiteName} MCP server`,
                tests
            };
        }
        finally {
            await this.client.disconnect();
        }
    }
    evaluateTestResult(testCase, response) {
        // Check expected success
        if (testCase.expectedSuccess !== undefined && response.success !== testCase.expectedSuccess) {
            return false;
        }
        // Check expected data contains
        if (testCase.expectedDataContains && response.data) {
            return this.dataContains(response.data, testCase.expectedDataContains);
        }
        // Default: test passes if no error occurred
        return response.success;
    }
    dataContains(actual, expected) {
        if (typeof expected === 'string') {
            return JSON.stringify(actual).includes(expected);
        }
        if (typeof expected === 'object' && expected !== null) {
            for (const [key, value] of Object.entries(expected)) {
                if (!(key in actual) || !this.dataContains(actual[key], value)) {
                    return false;
                }
            }
            return true;
        }
        return actual === expected;
    }
    generateSampleParams(schema) {
        if (!schema || !schema.properties) {
            return {};
        }
        const params = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
            params[key] = this.generateSampleValue(prop);
        }
        return params;
    }
    generateSamplePromptArgs(argumentsSchema) {
        const args = {};
        for (const arg of argumentsSchema || []) {
            if (arg.name) {
                args[arg.name] = this.generateSampleValueFromDescription(arg.description);
            }
        }
        return args;
    }
    generateSampleValue(schema) {
        switch (schema.type) {
            case 'string':
                return schema.description?.includes('query') ? 'test query' :
                    schema.description?.includes('name') ? 'sample name' :
                        'sample string';
            case 'number':
            case 'integer':
                return schema.default !== undefined ? schema.default : 10;
            case 'boolean':
                return schema.default !== undefined ? schema.default : true;
            case 'array':
                return [];
            case 'object':
                return {};
            default:
                return 'sample value';
        }
    }
    generateSampleValueFromDescription(description) {
        if (!description)
            return 'sample value';
        const lower = description.toLowerCase();
        if (lower.includes('query') || lower.includes('search'))
            return 'test query';
        if (lower.includes('name'))
            return 'sample name';
        if (lower.includes('focus'))
            return 'data patterns';
        if (lower.includes('number') || lower.includes('count'))
            return 10;
        if (lower.includes('boolean') || lower.includes('flag'))
            return true;
        return 'sample value';
    }
    formatTestResults(result) {
        let output = `\n=== Test Suite: ${result.testSuite.name} ===\n`;
        output += `Description: ${result.testSuite.description}\n`;
        output += `Duration: ${result.duration}ms\n`;
        output += `Results: ${result.passedTests}/${result.totalTests} tests passed\n\n`;
        for (const testResult of result.results) {
            const status = testResult.passed ? '✅ PASS' : '❌ FAIL';
            output += `${status} ${testResult.testCase.name} (${testResult.duration}ms)\n`;
            if (!testResult.passed) {
                output += `   Error: ${testResult.error || testResult.response.error || 'Test assertion failed'}\n`;
            }
            if (testResult.response.data) {
                const dataPreview = JSON.stringify(testResult.response.data, null, 2).slice(0, 200);
                output += `   Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}\n`;
            }
            output += '\n';
        }
        return output;
    }
}
exports.MCPTestRunner = MCPTestRunner;
