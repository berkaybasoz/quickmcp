import { MCPTestRequest, MCPTestResponse } from '../types';
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
}
export interface TestSuiteResult {
    testSuite: TestSuite;
    results: TestResult[];
    totalTests: number;
    passedTests: number;
    failedTests: number;
    duration: number;
}
export declare class MCPTestRunner {
    private client;
    constructor();
    runTestSuite(serverPath: string, testSuite: TestSuite): Promise<TestSuiteResult>;
    runTestCase(testCase: TestCase): Promise<TestResult>;
    generateTestSuite(serverPath: string, suiteName: string): Promise<TestSuite>;
    private evaluateTestResult;
    private dataContains;
    private generateSampleParams;
    private generateSamplePromptArgs;
    private generateSampleValue;
    private generateSampleValueFromDescription;
    formatTestResults(result: TestSuiteResult): string;
}
//# sourceMappingURL=MCPTestRunner.d.ts.map