"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPTestRunner = void 0;
var MCPClient_1 = require("./MCPClient");
var MCPTestRunner = /** @class */ (function () {
    function MCPTestRunner() {
        this.client = new MCPClient_1.MCPClient();
    }
    MCPTestRunner.prototype.runTestSuite = function (serverPath, testSuite) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, results, _i, _a, testCase, result, duration, passedTests, failedTests;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        startTime = Date.now();
                        results = [];
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, , 7, 9]);
                        return [4 /*yield*/, this.client.connect(serverPath)];
                    case 2:
                        _b.sent();
                        _i = 0, _a = testSuite.tests;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        testCase = _a[_i];
                        return [4 /*yield*/, this.runTestCase(testCase)];
                    case 4:
                        result = _b.sent();
                        results.push(result);
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [3 /*break*/, 9];
                    case 7: return [4 /*yield*/, this.client.disconnect()];
                    case 8:
                        _b.sent();
                        return [7 /*endfinally*/];
                    case 9:
                        duration = Date.now() - startTime;
                        passedTests = results.filter(function (r) { return r.passed; }).length;
                        failedTests = results.length - passedTests;
                        return [2 /*return*/, {
                                testSuite: testSuite,
                                results: results,
                                totalTests: results.length,
                                passedTests: passedTests,
                                failedTests: failedTests,
                                duration: duration
                            }];
                }
            });
        });
    };
    MCPTestRunner.prototype.runTestCase = function (testCase) {
        return __awaiter(this, void 0, void 0, function () {
            var startTime, response, duration, passed, error_1, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        startTime = Date.now();
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.client.testRequest(testCase.request)];
                    case 2:
                        response = _a.sent();
                        duration = Date.now() - startTime;
                        passed = this.evaluateTestResult(testCase, response);
                        return [2 /*return*/, {
                                testCase: testCase,
                                response: response,
                                passed: passed,
                                duration: duration
                            }];
                    case 3:
                        error_1 = _a.sent();
                        duration = Date.now() - startTime;
                        return [2 /*return*/, {
                                testCase: testCase,
                                response: {
                                    success: false,
                                    error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                                },
                                passed: false,
                                duration: duration,
                                error: error_1 instanceof Error ? error_1.message : 'Unknown error'
                            }];
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    MCPTestRunner.prototype.generateTestSuite = function (serverPath, suiteName) {
        return __awaiter(this, void 0, void 0, function () {
            var tools, resources, prompts, tests, _i, tools_1, tool, _a, resources_1, resource, _b, prompts_1, prompt_1;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0: return [4 /*yield*/, this.client.connect(serverPath)];
                    case 1:
                        _c.sent();
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, , 6, 8]);
                        return [4 /*yield*/, this.client.listTools()];
                    case 3:
                        tools = _c.sent();
                        return [4 /*yield*/, this.client.listResources()];
                    case 4:
                        resources = _c.sent();
                        return [4 /*yield*/, this.client.listPrompts()];
                    case 5:
                        prompts = _c.sent();
                        tests = [];
                        // Generate tool tests
                        for (_i = 0, tools_1 = tools; _i < tools_1.length; _i++) {
                            tool = tools_1[_i];
                            tests.push({
                                name: "Test tool: ".concat(tool.name),
                                description: "Test the ".concat(tool.name, " tool with sample parameters"),
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
                        for (_a = 0, resources_1 = resources; _a < resources_1.length; _a++) {
                            resource = resources_1[_a];
                            tests.push({
                                name: "Test resource: ".concat(resource.name),
                                description: "Test reading the ".concat(resource.name, " resource"),
                                request: {
                                    serverId: suiteName,
                                    method: 'resource',
                                    name: resource.uri,
                                },
                                expectedSuccess: true
                            });
                        }
                        // Generate prompt tests
                        for (_b = 0, prompts_1 = prompts; _b < prompts_1.length; _b++) {
                            prompt_1 = prompts_1[_b];
                            tests.push({
                                name: "Test prompt: ".concat(prompt_1.name),
                                description: "Test the ".concat(prompt_1.name, " prompt with sample arguments"),
                                request: {
                                    serverId: suiteName,
                                    method: 'prompt',
                                    name: prompt_1.name,
                                    params: this.generateSamplePromptArgs(prompt_1.arguments)
                                },
                                expectedSuccess: true
                            });
                        }
                        return [2 /*return*/, {
                                name: suiteName,
                                description: "Auto-generated test suite for ".concat(suiteName, " MCP server"),
                                tests: tests
                            }];
                    case 6: return [4 /*yield*/, this.client.disconnect()];
                    case 7:
                        _c.sent();
                        return [7 /*endfinally*/];
                    case 8: return [2 /*return*/];
                }
            });
        });
    };
    MCPTestRunner.prototype.evaluateTestResult = function (testCase, response) {
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
    };
    MCPTestRunner.prototype.dataContains = function (actual, expected) {
        if (typeof expected === 'string') {
            return JSON.stringify(actual).includes(expected);
        }
        if (typeof expected === 'object' && expected !== null) {
            for (var _i = 0, _a = Object.entries(expected); _i < _a.length; _i++) {
                var _b = _a[_i], key = _b[0], value = _b[1];
                if (!(key in actual) || !this.dataContains(actual[key], value)) {
                    return false;
                }
            }
            return true;
        }
        return actual === expected;
    };
    MCPTestRunner.prototype.generateSampleParams = function (schema) {
        if (!schema || !schema.properties) {
            return {};
        }
        var params = {};
        for (var _i = 0, _a = Object.entries(schema.properties); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], prop = _b[1];
            params[key] = this.generateSampleValue(prop);
        }
        return params;
    };
    MCPTestRunner.prototype.generateSamplePromptArgs = function (argumentsSchema) {
        var args = {};
        for (var _i = 0, _a = argumentsSchema || []; _i < _a.length; _i++) {
            var arg = _a[_i];
            if (arg.name) {
                args[arg.name] = this.generateSampleValueFromDescription(arg.description);
            }
        }
        return args;
    };
    MCPTestRunner.prototype.generateSampleValue = function (schema) {
        var _a, _b;
        switch (schema.type) {
            case 'string':
                return ((_a = schema.description) === null || _a === void 0 ? void 0 : _a.includes('query')) ? 'test query' :
                    ((_b = schema.description) === null || _b === void 0 ? void 0 : _b.includes('name')) ? 'sample name' :
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
    };
    MCPTestRunner.prototype.generateSampleValueFromDescription = function (description) {
        if (!description)
            return 'sample value';
        var lower = description.toLowerCase();
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
    };
    MCPTestRunner.prototype.formatTestResults = function (result) {
        var output = "\n=== Test Suite: ".concat(result.testSuite.name, " ===\n");
        output += "Description: ".concat(result.testSuite.description, "\n");
        output += "Duration: ".concat(result.duration, "ms\n");
        output += "Results: ".concat(result.passedTests, "/").concat(result.totalTests, " tests passed\n\n");
        for (var _i = 0, _a = result.results; _i < _a.length; _i++) {
            var testResult = _a[_i];
            var status_1 = testResult.passed ? '✅ PASS' : '❌ FAIL';
            output += "".concat(status_1, " ").concat(testResult.testCase.name, " (").concat(testResult.duration, "ms)\n");
            if (!testResult.passed) {
                output += "   Error: ".concat(testResult.error || testResult.response.error || 'Test assertion failed', "\n");
            }
            if (testResult.response.data) {
                var dataPreview = JSON.stringify(testResult.response.data, null, 2).slice(0, 200);
                output += "   Response: ".concat(dataPreview).concat(dataPreview.length >= 200 ? '...' : '', "\n");
            }
            output += '\n';
        }
        return output;
    };
    return MCPTestRunner;
}());
exports.MCPTestRunner = MCPTestRunner;
