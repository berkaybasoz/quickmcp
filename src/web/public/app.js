let currentParsedData = null;
let currentDataSource = null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupFileUpload();
    loadServers();
    loadTestServers();
});

// Tab management
function switchTab(tabName) {
    // Hide all tab contents
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));

    // Hide all tab buttons active state
    const tabButtons = document.querySelectorAll('.tab');
    tabButtons.forEach(button => button.classList.remove('active'));

    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    event.target.classList.add('active');

    // Load data for specific tabs
    if (tabName === 'manage') {
        loadServers();
    } else if (tabName === 'test') {
        loadTestServers();
    }
}

// File upload setup
function setupFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');

    fileUpload.addEventListener('click', () => fileInput.click());

    fileUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUpload.classList.add('dragover');
    });

    fileUpload.addEventListener('dragleave', () => {
        fileUpload.classList.remove('dragover');
    });

    fileUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUpload.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            fileUpload.innerHTML = `<p>Selected: ${files[0].name}</p>`;
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileUpload.innerHTML = `<p>Selected: ${e.target.files[0].name}</p>`;
        }
    });
}

// Toggle data source fields
function toggleDataSourceFields() {
    const type = document.getElementById('dataSourceType').value;
    const fileSection = document.getElementById('file-upload-section');
    const dbSection = document.getElementById('database-section');

    fileSection.classList.add('hidden');
    dbSection.classList.add('hidden');

    if (type === 'csv' || type === 'excel') {
        fileSection.classList.remove('hidden');
    } else if (type === 'database') {
        dbSection.classList.remove('hidden');
        updateDefaultPort(); // Set default port for the selected database type
    }
}

// Update default port based on database type
function updateDefaultPort() {
    const dbType = document.getElementById('dbType').value;
    const dbPort = document.getElementById('dbPort');

    const defaultPorts = {
        'mysql': 3306,
        'postgresql': 5432,
        'sqlite': '',
        'mssql': 1433
    };

    dbPort.placeholder = defaultPorts[dbType] || '';
    if (!dbPort.value && defaultPorts[dbType]) {
        dbPort.value = defaultPorts[dbType];
    }
}

// Parse data source
async function parseDataSource() {
    const type = document.getElementById('dataSourceType').value;

    if (!type) {
        showError('parse-error', 'Please select a data source type');
        return;
    }

    const loading = document.getElementById('parse-loading');
    const errorDiv = document.getElementById('parse-error');

    loading.classList.add('show');
    errorDiv.classList.remove('show');

    try {
        const formData = new FormData();
        formData.append('type', type);

        if (type === 'csv' || type === 'excel') {
            const fileInput = document.getElementById('fileInput');
            if (!fileInput.files[0]) {
                throw new Error('Please select a file');
            }
            formData.append('file', fileInput.files[0]);
        } else if (type === 'database') {
            const connection = {
                type: document.getElementById('dbType').value,
                host: document.getElementById('dbHost').value,
                port: parseInt(document.getElementById('dbPort').value),
                database: document.getElementById('dbName').value,
                username: document.getElementById('dbUser').value,
                password: document.getElementById('dbPassword').value
            };
            formData.append('connection', JSON.stringify(connection));
        }

        const response = await fetch('/api/parse', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentParsedData = result.data.parsedData;
            currentDataSource = result.data.dataSource;
            displayDataPreview(result.data.parsedData);
            document.getElementById('data-preview-section').classList.remove('hidden');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('parse-error', error.message);
    } finally {
        loading.classList.remove('show');
    }
}

// Display data preview
function displayDataPreview(parsedData) {
    const preview = document.getElementById('data-preview');
    let html = '';

    parsedData.forEach((data, index) => {
        const tableName = data.tableName || `Table ${index + 1}`;
        const panelId = `table-panel-${index}`;

        html += `
            <div class="collapsible-panel" style="margin-bottom: 15px;">
                <div class="panel-header" onclick="togglePanel('${panelId}')" style="
                    background: #f7fafc;
                    padding: 12px;
                    border-radius: 6px;
                    cursor: pointer;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border: 1px solid #e1e1e1;
                    transition: background 0.2s;
                " onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f7fafc'">
                    <div>
                        <strong>${tableName}</strong>
                        <span style="color: #718096; margin-left: 10px;">
                            ${data.metadata.rowCount} rows, ${data.metadata.columnCount} columns
                        </span>
                    </div>
                    <span id="${panelId}-icon" style="font-size: 18px;">▶</span>
                </div>
                <div id="${panelId}" class="panel-content" style="margin-top: 10px; display: none;">
                    <table>
                        <thead><tr>`;

        data.headers.forEach(header => {
            const dataType = data.metadata.dataTypes[header];
            html += `<th>${header} <small>(${dataType})</small></th>`;
        });
        html += '</tr></thead><tbody>';

        data.rows.slice(0, 5).forEach(row => {
            html += '<tr>';
            row.forEach(cell => {
                html += `<td>${cell || ''}</td>`;
            });
            html += '</tr>';
        });

        if (data.rows.length > 5) {
            html += `<tr><td colspan="${data.headers.length}"><em>... and ${data.rows.length - 5} more rows</em></td></tr>`;
        }

        html += '</tbody></table></div></div>';
    });

    preview.innerHTML = html;
}

// Toggle collapsible panel
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const icon = document.getElementById(`${panelId}-icon`);

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        icon.textContent = '▼';
    } else {
        panel.style.display = 'none';
        icon.textContent = '▶';
    }
}

// Generate server
async function generateServer() {
    const name = document.getElementById('serverName').value;
    const description = document.getElementById('serverDescription').value;
    const version = document.getElementById('serverVersion').value;

    if (!name) {
        showError('generate-error', 'Please provide server name');
        return;
    }

    if (!currentDataSource || !currentParsedData) {
        showError('generate-error', 'Please parse a data source first');
        return;
    }

    const loading = document.getElementById('generate-loading');
    const successDiv = document.getElementById('generate-success');
    const errorDiv = document.getElementById('generate-error');

    loading.classList.add('show');
    successDiv.classList.remove('show');
    errorDiv.classList.remove('show');

    try {
        const response = await fetch('/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                description: description || '',
                dataSource: currentDataSource
            })
        });

        const result = await response.json();

        if (result.success) {
            showSuccess('generate-success', `MCP Server "${name}" generated successfully!`);
            // Reset form
            document.getElementById('serverName').value = '';
            document.getElementById('serverDescription').value = '';
            document.getElementById('serverVersion').value = '1.0.0';
            document.getElementById('data-preview-section').classList.add('hidden');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('generate-error', error.message);
    } finally {
        loading.classList.remove('show');
    }
}

// Load servers list
async function loadServers() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        if (result.success) {
            displayServers(result.data);
        }
    } catch (error) {
        console.error('Failed to load servers:', error);
    }
}

// Display servers
function displayServers(servers) {
    const serverList = document.getElementById('server-list');

    if (servers.length === 0) {
        serverList.innerHTML = '<p>No servers generated yet. Go to "Generate Server" tab to create one.</p>';
        return;
    }

    let html = '';
    servers.forEach(server => {
        html += `
            <div class="server-card">
                <h3>${server.name}</h3>
                <p>${server.description}</p>
                <div class="server-stats">
                    <span>Version: ${server.version}</span>
                    <span>Tools: ${server.toolsCount}</span>
                    <span>Resources: ${server.resourcesCount}</span>
                    <span>Prompts: ${server.promptsCount}</span>
                    <span>Data Rows: ${server.dataRowsCount}</span>
                </div>
                <div class="server-actions">
                    <button class="btn btn-primary" onclick="viewServer('${server.id}')">View Details</button>
                    <button class="btn btn-secondary" onclick="testServer('${server.id}')">Test</button>
                    <button class="btn btn-secondary" onclick="exportServer('${server.id}')">Export</button>
                    <button class="btn btn-danger" onclick="deleteServer('${server.id}')">Delete</button>
                </div>
            </div>
        `;
    });

    serverList.innerHTML = html;
}

// Load test servers dropdown
async function loadTestServers() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        if (result.success) {
            const select = document.getElementById('testServerSelect');
            select.innerHTML = '<option value="">Select a server to test</option>';

            result.data.forEach(server => {
                select.innerHTML += `<option value="${server.id}">${server.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Failed to load test servers:', error);
    }
}

// Test server functions
function showCustomTest() {
    const section = document.getElementById('custom-test-section');
    section.classList.toggle('hidden');
}

async function runAutoTests() {
    const serverId = document.getElementById('testServerSelect').value;
    if (!serverId) {
        showError('test-error', 'Please select a server to test');
        return;
    }

    const loading = document.getElementById('test-loading');
    const resultsDiv = document.getElementById('test-results');
    const errorDiv = document.getElementById('test-error');

    loading.classList.add('show');
    resultsDiv.classList.add('hidden');
    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`/api/servers/${serverId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({})
        });

        const result = await response.json();

        if (result.success) {
            displayTestResults(result.data);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('test-error', error.message);
    } finally {
        loading.classList.remove('show');
    }
}

async function runCustomTest() {
    const serverId = document.getElementById('testServerSelect').value;
    const testType = document.getElementById('testType').value;
    const testName = document.getElementById('testName').value;
    const testParams = document.getElementById('testParams').value;

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
    const errorDiv = document.getElementById('test-error');

    loading.classList.add('show');
    resultsDiv.classList.add('hidden');
    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`/api/servers/${serverId}/test`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                customRequest: {
                    serverId,
                    method: testType,
                    name: testName,
                    params
                }
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
    } finally {
        loading.classList.remove('show');
    }
}

// Display test results
function displayTestResults(testSuiteResult) {
    const resultsDiv = document.getElementById('test-results');

    let output = `=== Test Suite: ${testSuiteResult.testSuite.name} ===\n`;
    output += `Description: ${testSuiteResult.testSuite.description}\n`;
    output += `Duration: ${testSuiteResult.duration}ms\n`;
    output += `Results: ${testSuiteResult.passedTests}/${testSuiteResult.totalTests} tests passed\n\n`;

    testSuiteResult.results.forEach(testResult => {
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
    });

    resultsDiv.textContent = output;
    resultsDiv.classList.remove('hidden');
}

function displaySingleTestResult(testResult) {
    const resultsDiv = document.getElementById('test-results');

    let output = `=== Custom Test Result ===\n`;
    output += `Test: ${testResult.testCase.name}\n`;
    output += `Duration: ${testResult.duration}ms\n`;
    output += `Status: ${testResult.passed ? '✅ PASS' : '❌ FAIL'}\n\n`;

    if (!testResult.passed) {
        output += `Error: ${testResult.error || testResult.response.error || 'Test assertion failed'}\n\n`;
    }

    if (testResult.response.data) {
        output += `Response:\n${JSON.stringify(testResult.response.data, null, 2)}\n`;
    }

    resultsDiv.textContent = output;
    resultsDiv.classList.remove('hidden');
}

// Server management functions
function viewServer(serverId) {
    // Implementation for viewing server details
    alert(`View server details for: ${serverId}`);
}

function testServer(serverId) {
    // Switch to test tab and select the server
    switchTab('test');
    document.getElementById('testServerSelect').value = serverId;
}

async function exportServer(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/export`);
        const result = await response.json();

        if (result.success) {
            alert(`Server export ready: ${result.data.filename}`);
            // In a real implementation, you'd trigger a download here
        }
    } catch (error) {
        alert(`Export failed: ${error.message}`);
    }
}

async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server?')) {
        return;
    }

    try {
        const response = await fetch(`/api/servers/${serverId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            loadServers(); // Refresh the list
            loadTestServers(); // Refresh test dropdown
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        alert(`Delete failed: ${error.message}`);
    }
}

// Utility functions
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

function showSuccess(elementId, message) {
    const successDiv = document.getElementById(elementId);
    successDiv.textContent = message;
    successDiv.classList.add('show');
}