document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('openSidebar')?.addEventListener('click', openSidebar);
    document.getElementById('closeSidebar')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    document.querySelectorAll('[data-test-mode-tab]').forEach((tabBtn) => {
        tabBtn.addEventListener('click', () => {
            if (tabBtn.hasAttribute('disabled') || tabBtn.getAttribute('data-test-mode-locked') === 'true') return;
            setTestModeTab(tabBtn.getAttribute('data-test-mode-tab') || 'automated');
        });
    });
    initializeTestModeTabs();

    document.getElementById('runAutoTestsBtn')?.addEventListener('click', () => {
        const selectedType = document.getElementById('autoTestType')?.value || 'quick';
        runAutoTests(selectedType === 'full');
    });
    document.getElementById('runCustomTestBtn')?.addEventListener('click', runCustomTest);
    document.getElementById('runTransportTestBtn')?.addEventListener('click', () => runTransportTests(false));

    document.getElementById('testType')?.addEventListener('change', handleTestTypeChange);
    document.getElementById('autoTestServerSelect')?.addEventListener('change', handleTestServerChange);
    document.getElementById('customTestServerSelect')?.addEventListener('change', handleTestServerChange);
    document.getElementById('testServerSelect')?.addEventListener('change', handleTestServerChange);

    setupRouting();
    handleInitialRoute();
    if (!window.renderSidebar) {
        try { applySidebarCollapsedState(); } catch {}
    }
});

window.addEventListener('load', () => {
    if (!window.renderSidebar) {
        try { initSidebarResizer(); } catch {}
        try { applySidebarCollapsedState(); } catch {}
    }
});


async function loadTestServers() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        const selectIds = ['autoTestServerSelect', 'customTestServerSelect', 'transportTestServerSelect', 'testServerSelect'];
        const selects = selectIds
            .map((id) => document.getElementById(id))
            .filter((el) => el);
        if (selects.length === 0) return;

        if (result.success && result.data.length > 0) {
            const options = ['<option value="">Select a server to test</option>'];
            result.data.forEach(server => {
                options.push(`<option value="${server.id}">${server.name}</option>`);
            });
            const optionsHtml = options.join('');
            selects.forEach((select) => {
                select.innerHTML = optionsHtml;
            });
            // Preselect if requested via query or storage
            try {
                const params = new URLSearchParams(window.location.search);
                const q = params.get('select');
                const stored = localStorage.getItem('prefTestServerId');
                const toSelect = q || stored;
                const toolParam = params.get('tool') || localStorage.getItem('prefTestToolName');
                if (toSelect) {
                    selects.forEach((select) => { select.value = toSelect; });
                    // Ensure type is tool call so dropdown loads
                    const type = document.getElementById('testType');
                    if (type) type.value = 'tools/call';
                    // Trigger dependent UI and wait for tools dropdown
                    await handleTestServerChange();
                    if (toolParam) {
                        const toolSelect = document.getElementById('testName');
                        if (toolSelect) {
                            toolSelect.value = toolParam;
                            updateParametersExample();
                        }
                    }
                    localStorage.removeItem('prefTestServerId');
                    localStorage.removeItem('prefTestToolName');
                }
            } catch {}
        } else {
            selects.forEach((select) => {
                select.innerHTML = '<option value="">No servers available - Generate a server first</option>';
            });
        }
    } catch (error) {
        logger.error('Failed to load test servers:', error);
        ['autoTestServerSelect', 'customTestServerSelect', 'transportTestServerSelect', 'testServerSelect'].forEach((id) => {
            const select = document.getElementById(id);
            if (select) select.innerHTML = '<option value="">Error loading servers</option>';
        });
    }
}

// Handle test type change - switch between input and dropdown for test name
function handleTestTypeChange() {
    const testType = document.getElementById('testType')?.value;
    const container = document.getElementById('testNameContainer');
    const serverId = document.getElementById('customTestServerSelect')?.value
        || document.getElementById('autoTestServerSelect')?.value
        || document.getElementById('testServerSelect')?.value;
    
    if (!container) return;
    
    if (testType === 'tools/call' && serverId) {
        // Load tools dropdown
        loadToolsDropdown(serverId);
    } else {
        // Show regular input with unified input styling
        container.innerHTML = '<input type="text" id="testName" placeholder="Enter test name" class="input">';
    }
}

// Handle test server change - reload tools if Tool Call is selected
async function handleTestServerChange() {
    const testType = document.getElementById('testType')?.value;
    const serverId = document.getElementById('customTestServerSelect')?.value
        || document.getElementById('autoTestServerSelect')?.value
        || document.getElementById('testServerSelect')?.value;
    
    if (testType === 'tools/call' && serverId) {
        await loadToolsDropdown(serverId);
    }
}

// Load tools dropdown for custom test
async function loadToolsDropdown(serverId) {
    const container = document.getElementById('testNameContainer');
    if (!container) return;
    
    try {
        const response = await fetch(`/api/servers/${serverId}`);
        const result = await response.json();
        
        if (result.success && result.data) {
            const tools = result.data.config.tools || [];
            
            // Create dropdown with tools
            let dropdownHTML = '<select id="testName" class="input" onchange="updateParametersExample()">';
            dropdownHTML += '<option value="">Select a tool to test</option>';
            
            tools.forEach(tool => {
                // Store tool data in data attributes for parameter generation
                dropdownHTML += `<option value="${tool.name}" data-schema='${JSON.stringify(tool.inputSchema || {})}'>${tool.name} - ${tool.description}</option>`;
            });
            
            dropdownHTML += '</select>';
            container.innerHTML = dropdownHTML;
            
            // Store tools data globally for parameter generation
            window.testTools = tools;
        }
    } catch (error) {
        logger.error('Failed to load tools:', error);
        container.innerHTML = '<input type="text" id="testName" placeholder="Error loading tools" class="input">';
    }
}

// Update parameters example when tool is selected
function updateParametersExample() {
    const select = document.getElementById('testName');
    const paramsTextarea = document.getElementById('testParams');
    
    if (!select || !paramsTextarea) return;
    
    const selectedOption = select.options[select.selectedIndex];
    if (!selectedOption || !selectedOption.value) {
        paramsTextarea.placeholder = '{"param1": "value1"}';
        return;
    }
    
    try {
        const schema = JSON.parse(selectedOption.getAttribute('data-schema') || '{}');
        const exampleParams = {};
        
        // Generate example parameters based on schema
        if (schema.properties) {
            for (const [key, prop] of Object.entries(schema.properties)) {
                if (key === 'limit') {
                    exampleParams[key] = 10;
                } else if (key === 'offset') {
                    exampleParams[key] = 0;
                } else if (prop.type === 'string') {
                    exampleParams[key] = prop.description || "example_value";
                } else if (prop.type === 'number' || prop.type === 'integer') {
                    exampleParams[key] = 0;
                } else if (prop.type === 'boolean') {
                    exampleParams[key] = false;
                } else {
                    exampleParams[key] = "value";
                }
            }
        }
        
        // Set the example in the textarea
        if (Object.keys(exampleParams).length > 0) {
            paramsTextarea.value = JSON.stringify(exampleParams, null, 2);
        } else {
            paramsTextarea.value = '{}';
        }
    } catch (error) {
        logger.error('Error generating parameter example:', error);
        paramsTextarea.value = '{}';
    }
}

// Test functions
async function runAutoTests(runAll = false) {
    const serverId = document.getElementById('autoTestServerSelect')?.value
        || document.getElementById('testServerSelect')?.value;
    if (!serverId) {
        showError('test-error', 'Please select a server to test');
        return;
    }

    const loading = document.getElementById('test-loading');
    // Reuse the visible loading element to show status text
    const loadingText = document.getElementById('test-loading');
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');
    const errorDiv = document.getElementById('test-error');
    
    // Update button state
    const runBtn = document.getElementById('runAutoTestsBtn');
    const runBtnIcon = document.getElementById('autoTestRunIcon');
    const runBtnText = document.getElementById('autoTestRunText');
    
    if (runBtn) runBtn.disabled = true;
    if (runBtnIcon) runBtnIcon.className = 'fas fa-spinner fa-spin mr-2';
    if (runBtnText) runBtnText.textContent = runAll ? 'Running Full Test...' : 'Running Quick Test...';
    if (loadingText) loadingText.textContent = runAll
        ? 'Running all tests... This may take a while.'
        : 'Running quick tests...';

    loading?.classList.remove('hidden');
    resultsDiv?.classList.add('hidden');
    noResults?.classList.add('hidden');
    errorDiv?.classList.add('hidden');

    try {
        const response = await fetch(`/api/servers/${serverId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ runAll: runAll })
        });

        const result = await response.json();

        if (result.success) {
            displayTestResults(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('test-error', error.message);
        noResults?.classList.remove('hidden');
    } finally {
        loading?.classList.add('hidden');
        
        // Reset button state
        if (runBtn) runBtn.disabled = false;
        if (runBtnIcon) runBtnIcon.className = 'fas fa-play mr-2';
        if (runBtnText) runBtnText.textContent = 'Run';
    }
}

async function runCustomTest() {
    const serverId = document.getElementById('customTestServerSelect')?.value
        || document.getElementById('autoTestServerSelect')?.value
        || document.getElementById('testServerSelect')?.value;
    const testType = document.getElementById('testType')?.value;
    const testName = document.getElementById('testName')?.value;
    const testParams = document.getElementById('testParams')?.value;

    if (!serverId || !testName) {
        showError('test-error', 'Please select a server and enter test name');
        return;
    }

    let params = {};
    if (testParams) {
        try {
            params = JSON.parse(testParams);
        } catch (error) {
            showError('test-error', 'Invalid JSON in parameters');
            return;
        }
    }

    const loading = document.getElementById('test-loading');
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');
    const errorDiv = document.getElementById('test-error');

    loading?.classList.remove('hidden');
    resultsDiv?.classList.add('hidden');
    noResults?.classList.add('hidden');
    errorDiv?.classList.add('hidden');

    try {
        const response = await fetch(`/api/servers/${serverId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                testType: testType,
                toolName: testName,
                parameters: params
            })
        });

        const result = await response.json();

        if (result.success) {
            displaySingleTestResult(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('test-error', error.message);
        noResults?.classList.remove('hidden');
    } finally {
        loading?.classList.add('hidden');
    }
}

let mcpTransportBaseUrlCache = null;

function nextMcpRequestId() {
    if (window.crypto?.randomUUID) {
        return window.crypto.randomUUID();
    }
    return `mcp-fback-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

async function resolveMcpTransportBaseUrl() {
    if (mcpTransportBaseUrlCache) return mcpTransportBaseUrlCache;

    const configData = await getAuthConfigOnce();
    const mcpPort = configData?.mcpPort || configData?.mcpDefaultPort;
    if (mcpPort) {
        mcpTransportBaseUrlCache = `${window.location.protocol}//${window.location.hostname}:${mcpPort}`;
    } else {
        mcpTransportBaseUrlCache = `${window.location.protocol}//${window.location.host}`;
    }

    return mcpTransportBaseUrlCache;
}

async function postJsonRpc(url, message, extra = {}) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(extra.headers || {})
        },
        body: JSON.stringify(message)
    });

    if (response.status === 204) return null;
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
        throw new Error(payload?.error?.message || payload?.message || `HTTP ${response.status}`);
    }
    if (payload?.error) {
        throw new Error(payload.error.message || 'MCP error');
    }
    return payload;
}

function extractServerToolsFromList(listPayload, serverId) {
    const tools = Array.isArray(listPayload?.result?.tools) ? listPayload.result.tools : [];
    const prefix = `${serverId}__`;
    return tools
        .map((tool) => ({
            name: String(tool?.name || ''),
            description: String(tool?.description || '')
        }))
        .filter((tool) => tool.name.startsWith(prefix))
        .map((tool) => ({
            name: tool.name.slice(prefix.length),
            description: tool.description
        }));
}

async function testStdioTransport(baseUrl) {
    const init = await postJsonRpc(`${baseUrl}/api/mcp-stdio`, {
        jsonrpc: '2.0',
        id: nextMcpRequestId(),
        method: 'initialize',
        params: {}
    });
    const list = await postJsonRpc(`${baseUrl}/api/mcp-stdio`, {
        jsonrpc: '2.0',
        id: nextMcpRequestId(),
        method: 'tools/list',
        params: {}
    });
    return {
        transport: 'stdio',
        protocolVersion: init?.result?.protocolVersion || 'unknown',
        listPayload: list
    };
}

async function testSseTransport(baseUrl) {
    const controller = new AbortController();
    const sseResponse = await fetch(`${baseUrl}/sse`, {
        method: 'GET',
        headers: { 'Accept': 'text/event-stream' },
        signal: controller.signal
    });
    if (!sseResponse.ok || !sseResponse.body) {
        throw new Error(`SSE stream failed: HTTP ${sseResponse.status}`);
    }

    const reader = sseResponse.body.getReader();
    const decoder = new TextDecoder();
    let endpoint = '';
    let raw = '';

    while (!endpoint) {
        const chunk = await reader.read();
        if (chunk.done) break;
        raw += decoder.decode(chunk.value, { stream: true });
        const match = raw.match(/event:\\s*endpoint\\s*\\n(?:.*\\n)*?data:\\s*([^\\n]+)/);
        if (match && match[1]) {
            endpoint = match[1].trim();
        }
    }

    controller.abort();
    if (!endpoint) {
        throw new Error('SSE endpoint event not received');
    }

    const endpointUrl = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const init = await postJsonRpc(endpointUrl, {
        jsonrpc: '2.0',
        id: nextMcpRequestId(),
        method: 'initialize',
        params: {}
    });
    const list = await postJsonRpc(endpointUrl, {
        jsonrpc: '2.0',
        id: nextMcpRequestId(),
        method: 'tools/list',
        params: {}
    });
    return {
        transport: 'sse',
        protocolVersion: init?.result?.protocolVersion || 'unknown',
        listPayload: list
    };
}

async function testStreamableHttpTransport(baseUrl) {
    const init = await postJsonRpc(`${baseUrl}/mcp`, {
        jsonrpc: '2.0',
        id: nextMcpRequestId(),
        method: 'initialize',
        params: {}
    });
    const list = await postJsonRpc(`${baseUrl}/mcp`, {
        jsonrpc: '2.0',
        id: nextMcpRequestId(),
        method: 'tools/list',
        params: {}
    });
    return {
        transport: 'streamable-http',
        protocolVersion: init?.result?.protocolVersion || 'unknown',
        listPayload: list
    };
}

async function testWebSocketTransport(baseUrl) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsHost = baseUrl.replace(/^https?:/, wsProtocol);

    const result = await new Promise((resolve, reject) => {
        const ws = new WebSocket(`${wsHost}/ws`);
        const expected = new Map();
        const timeout = setTimeout(() => {
            try { ws.close(); } catch {}
            reject(new Error('WebSocket transport timeout'));
        }, 10000);

        const finish = (err, result) => {
            clearTimeout(timeout);
            try { ws.close(); } catch {}
            if (err) reject(err);
            else resolve(result);
        };

        ws.onopen = () => {
            const initId = nextMcpRequestId();
            const listId = nextMcpRequestId();
            expected.set(initId, 'initialize');
            expected.set(listId, 'tools/list');
            ws.send(JSON.stringify({ jsonrpc: '2.0', id: initId, method: 'initialize', params: {} }));
            ws.send(JSON.stringify({ jsonrpc: '2.0', id: listId, method: 'tools/list', params: {} }));
        };

        let protocolVersion = 'unknown';
        let listPayload = null;
        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload?.error) {
                    finish(new Error(payload.error.message || 'WebSocket MCP error'));
                    return;
                }
                const kind = expected.get(payload?.id);
                if (kind === 'initialize') {
                    protocolVersion = payload?.result?.protocolVersion || 'unknown';
                    expected.delete(payload.id);
                } else if (kind === 'tools/list') {
                    listPayload = payload;
                    expected.delete(payload.id);
                }

                if (expected.size === 0) {
                    finish(null, { transport: 'websocket', protocolVersion, listPayload });
                }
            } catch (error) {
                finish(error);
            }
        };

        ws.onerror = () => finish(new Error('WebSocket connection failed'));
    });

    return result;
}

async function runTransportTests(runAll = false) {
    const serverId = document.getElementById('transportTestServerSelect')?.value
        || document.getElementById('autoTestServerSelect')?.value
        || document.getElementById('testServerSelect')?.value;
    if (!serverId) {
        showError('test-error', 'Please select a server before running transport tests');
        return;
    }

    const loading = document.getElementById('test-loading');
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');
    const errorDiv = document.getElementById('test-error');
    const selectedTransport = document.getElementById('transportType')?.value || 'all';
    const shouldRunAll = runAll || selectedTransport === 'all';
    const transports = shouldRunAll ? ['stdio', 'sse', 'streamable-http', 'websocket'] : [selectedTransport];

    loading?.classList.remove('hidden');
    if (loading) loading.textContent = shouldRunAll ? 'Running all transport tests...' : `Running ${selectedTransport} transport test...`;
    resultsDiv?.classList.add('hidden');
    noResults?.classList.add('hidden');
    errorDiv?.classList.add('hidden');

    try {
        const baseUrl = await resolveMcpTransportBaseUrl();
        const serverResponse = await fetch(`/api/servers/${serverId}`);
        const serverPayload = await serverResponse.json();
        if (!serverPayload?.success || !serverPayload?.data?.config) {
            throw new Error('Failed to load selected server details');
        }
        const serverName = serverPayload.data.config.name || serverId;
        const expectedTools = Array.isArray(serverPayload.data.config.tools)
            ? serverPayload.data.config.tools.map((tool) => ({
                name: String(tool?.name || ''),
                description: String(tool?.description || '')
            })).filter((tool) => tool.name)
            : [];
        const transportResults = [];

        for (const transport of transports) {
            const startedAt = Date.now();
            try {
                let data;
                if (transport === 'stdio') data = await testStdioTransport(baseUrl);
                else if (transport === 'sse') data = await testSseTransport(baseUrl);
                else if (transport === 'streamable-http') data = await testStreamableHttpTransport(baseUrl);
                else data = await testWebSocketTransport(baseUrl);

                transportResults.push({
                    transport,
                    status: 'success',
                    description: `MCP ${transport.toUpperCase()} initialize + tools/list`,
                    result: 'Transport request flow successful',
                    duration: Date.now() - startedAt,
                    protocolVersion: data?.protocolVersion || 'unknown',
                    listedTools: extractServerToolsFromList(data?.listPayload, serverId)
                });
            } catch (error) {
                transportResults.push({
                    transport,
                    status: 'error',
                    description: `MCP ${transport.toUpperCase()} initialize + tools/list`,
                    error: error?.message || String(error),
                    duration: Date.now() - startedAt
                });
            }
        }

        let output = '';
        transportResults.forEach((result) => {
            const prettyTransport = result.transport === 'streamable-http' ? 'streamable_http' : result.transport;
            const listedMap = new Map((result.listedTools || []).map((tool) => [tool.name, tool]));
            const toolsToReport = expectedTools.length > 0
                ? expectedTools
                : Array.from(listedMap.values());
            const toolRows = toolsToReport.map((tool) => {
                const listed = listedMap.get(tool.name);
                if (result.status !== 'success') {
                    return {
                        tool: tool.name,
                        description: tool.description || listed?.description || 'No description',
                        status: 'error',
                        error: result.error
                    };
                }
                if (listed) {
                    return {
                        tool: tool.name,
                        description: tool.description || listed.description || 'No description',
                        status: 'success',
                        result: 'Tool is listed via transport'
                    };
                }
                return {
                    tool: tool.name,
                    description: tool.description || 'No description',
                    status: 'error',
                    error: 'Tool not returned by transport tools/list'
                };
            });

            const successCount = toolRows.filter((row) => row.status === 'success').length;
            const failedCount = toolRows.filter((row) => row.status === 'error').length;

            output += `=== Test Results for ${serverName} (${prettyTransport}) ===\n`;
            output += `Total Tools: ${toolRows.length}\n`;
            output += `Tests Run: ${toolRows.length}\n`;
            output += `✅ Success: ${successCount} | ❌ Failed: ${failedCount}\n\n`;

            toolRows.forEach((row) => {
                const rowStatus = row.status === 'success' ? '✅ PASS' : '❌ FAIL';
                output += `${rowStatus} ${row.tool}\n`;
                output += `   Description: ${row.description}\n`;
                if (row.status === 'success') {
                    output += `   Result: ${row.result}\n`;
                } else {
                    output += `   Error: ${row.error}\n`;
                }
                output += '\n';
            });

            if (result.status === 'success') {
                output += `Transport Protocol: ${result.protocolVersion}\n`;
                output += `Transport Duration: ${result.duration}ms\n`;
                output += `Tools Returned by Transport: ${(result.listedTools || []).length}\n`;
            } else {
                output += `Transport Error: ${result.error}\n`;
                output += `Transport Duration: ${result.duration}ms\n`;
            }
            output += '\n';
        });

        if (resultsDiv) {
            resultsDiv.textContent = output;
            resultsDiv.classList.remove('hidden');
        }
        noResults?.classList.add('hidden');
    } catch (error) {
        showError('test-error', error?.message || String(error));
        noResults?.classList.remove('hidden');
    } finally {
        loading?.classList.add('hidden');
        if (loading) loading.textContent = 'Running...';
    }
}

// Display test results
function displayTestResults(testData) {
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');

    if (!resultsDiv) return;

    // Check if this is the new format from SQLite-based test
    if (testData.serverName && testData.results) {
        // Count success and failed tests
        const successCount = testData.results.filter(r => r.status === 'success').length;
        const failedCount = testData.results.filter(r => r.status === 'error').length;
        
        let output = `=== Test Results for ${testData.serverName} ===\n`;
        output += `Total Tools: ${testData.toolsCount}\n`;
        output += `Tests Run: ${testData.testsRun}\n`;
        output += `✅ Success: ${successCount} | ❌ Failed: ${failedCount}\n\n`;
        
        testData.results.forEach(result => {
            const status = result.status === 'success' ? '✅ PASS' : '❌ FAIL';
            output += `${status} ${result.tool}\n`;
            output += `   Description: ${result.description}\n`;
            if (result.parameters && Object.keys(result.parameters).length > 0) {
                output += `   Parameters: ${JSON.stringify(result.parameters)}\n`;
            }
            if (result.status === 'success') {
                output += `   Result: ${result.result}\n`;
                if (result.rowCount !== undefined) {
                    output += `   Rows: ${result.rowCount}\n`;
                }
            } else if (result.error) {
                output += `   Error: ${result.error}\n`;
            }
            output += '\n';
        });
        
        resultsDiv.textContent = output;
        resultsDiv.classList.remove('hidden');
        noResults?.classList.add('hidden');
    } else if (testData.testSuite) {
        // Old format for compatibility
        let output = `=== Test Suite: ${testData.testSuite.name} ===\n`;
        output += `Description: ${testData.testSuite.description}\n`;
        output += `Duration: ${testData.duration}ms\n`;
        output += `Results: ${testData.passedTests}/${testData.totalTests} tests passed\n\n`;

        testData.results.forEach(testResult => {
            const status = testResult.passed ? '✅ PASS' : '❌ FAIL';
            output += `${status} ${testResult.testCase.name} (${testResult.duration}ms)\n`;

            if (!testResult.passed) {
                output += `   Error: ${testResult.error || testResult.response.error || 'Test assertion failed'}\n`;
            }

            if (testResult.response && testResult.response.data) {
                const dataPreview = JSON.stringify(testResult.response.data, null, 2).slice(0, 200);
                output += `   Response: ${dataPreview}${dataPreview.length >= 200 ? '...' : ''}\n`;
            }

            output += '\n';
        });

        resultsDiv.textContent = output;
        resultsDiv.classList.remove('hidden');
        noResults?.classList.add('hidden');
    } else {
        // Fallback for unknown format - just display the raw JSON
        resultsDiv.textContent = JSON.stringify(testData, null, 2);
        resultsDiv.classList.remove('hidden');
        noResults?.classList.add('hidden');
    }
}

function displaySingleTestResult(testData) {
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');

    if (!resultsDiv) return;
    
    // Check if this is the new format from custom tool test
    if (testData && testData.tool) {
        let output = `=== Custom Test Result ===\n`;
        output += `Tool: ${testData.tool}\n`;
        output += `Status: ${testData.status === 'success' ? '✅ PASS' : '❌ FAIL'}\n`;
        if (testData.description) {
            output += `Description: ${testData.description}\n`;
        }
        if (testData.parameters && Object.keys(testData.parameters).length > 0) {
            output += `Parameters: ${JSON.stringify(testData.parameters)}\n`;
        }
        output += '\n';
        
        if (testData.status === 'success') {
            if (testData.result) {
                output += `Result: ${typeof testData.result === 'object' ? JSON.stringify(testData.result, null, 2) : testData.result}\n`;
            }
            if (testData.rowCount !== undefined) {
                output += `Rows: ${testData.rowCount}\n`;
            }
        } else if (testData.error) {
            output += `Error: ${testData.error}\n`;
        }
        
        resultsDiv.textContent = output;
        resultsDiv.classList.remove('hidden');
        noResults?.classList.add('hidden');
    } else if (testData && testData.testCase) {
        // Old format for compatibility
        let output = `=== Custom Test Result ===\n`;
        output += `Test: ${testData.testCase.name}\n`;
        output += `Duration: ${testData.duration}ms\n`;
        output += `Status: ${testData.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;

        if (!testData.passed) {
            output += `Error: ${testData.error || testData.response?.error || 'Test assertion failed'}\n\n`;
        }

        if (testData.response?.data) {
            output += `Response:\n${JSON.stringify(testData.response.data, null, 2)}\n`;
        }

        resultsDiv.textContent = output;
        resultsDiv.classList.remove('hidden');
        noResults?.classList.add('hidden');
    } else {
        // Fallback for unknown format
        resultsDiv.textContent = JSON.stringify(testData, null, 2);
        resultsDiv.classList.remove('hidden');
        noResults?.classList.add('hidden');
    }
}



function initializeTestModeTabs() {
    const tabs = document.querySelectorAll('[data-test-mode-tab]');
    const panels = document.querySelectorAll('[data-test-mode-panel]');
    if (!tabs.length || !panels.length) return;
    setTestModeTab('automated');
}

function setTestModeTab(mode) {
    if (mode === 'e2e') mode = 'automated';
    const tabs = document.querySelectorAll('[data-test-mode-tab]');
    const panels = document.querySelectorAll('[data-test-mode-panel]');
    const activeClass = 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-slate-200 border-b-white bg-white text-slate-900 -mb-px';
    const inactiveClass = 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-600 hover:text-blue-700 hover:bg-white/70';
    const lockedClass = 'px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-400 cursor-not-allowed';
    tabs.forEach((tab) => {
        const isLocked = tab.getAttribute('data-test-mode-locked') === 'true' || tab.hasAttribute('disabled');
        const isActive = tab.getAttribute('data-test-mode-tab') === mode;
        tab.className = isLocked ? lockedClass : (isActive ? activeClass : inactiveClass);
    });
    panels.forEach((panel) => {
        const isActive = panel.getAttribute('data-test-mode-panel') === mode;
        panel.classList.toggle('hidden', !isActive);
    });
}

