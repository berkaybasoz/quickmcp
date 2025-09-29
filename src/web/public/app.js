let currentParsedData = null;
let currentDataSource = null;
let currentWizardStep = 1;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupFileUpload();
    setupRouting();
    handleInitialRoute();
});

// Setup event listeners
function setupEventListeners() {
    // Sidebar controls
    document.getElementById('openSidebar')?.addEventListener('click', openSidebar);
    document.getElementById('closeSidebar')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabName = item.getAttribute('data-tab');
            switchTab(tabName);
        });
    });

    // Data source type selection
    document.querySelectorAll('input[name="dataSourceType"]').forEach(radio => {
        radio.addEventListener('change', toggleDataSourceFields);
    });

    // Database type change
    document.getElementById('dbType')?.addEventListener('change', updateDefaultPort);
    
    // Database field changes to update navigation
    document.getElementById('dbType')?.addEventListener('change', updateWizardNavigation);
    document.getElementById('dbHost')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbPort')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbName')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbUser')?.addEventListener('input', updateWizardNavigation);
    document.getElementById('dbPassword')?.addEventListener('input', updateWizardNavigation);


    // Generate button
    document.getElementById('generateBtn')?.addEventListener('click', generateServer);

    // Server name validation
    document.getElementById('serverName')?.addEventListener('input', checkServerName);

    // Test buttons
    document.getElementById('runAutoTestsBtn')?.addEventListener('click', runAutoTests);
    document.getElementById('runCustomTestBtn')?.addEventListener('click', runCustomTest);

    // Wizard navigation
    document.getElementById('next-to-step-2')?.addEventListener('click', handleNextToStep2);
    document.getElementById('back-to-step-1')?.addEventListener('click', () => goToWizardStep(1));
    document.getElementById('next-to-step-3')?.addEventListener('click', () => goToWizardStep(3));
    document.getElementById('back-to-step-2')?.addEventListener('click', () => goToWizardStep(2));
}

// Sidebar functions
function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.remove('-translate-x-full');
    overlay.classList.remove('opacity-0', 'invisible');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar.classList.add('-translate-x-full');
    overlay.classList.add('opacity-0', 'invisible');
}

// Setup URL routing
function setupRouting() {
    window.addEventListener('popstate', function(event) {
        handleRoute();
    });
}

// Handle initial route
function handleInitialRoute() {
    handleRoute();
}

// Route handler
function handleRoute() {
    const path = window.location.pathname;
    let tabName = 'generate'; // default tab

    if (path === '/manage-servers') {
        tabName = 'manage';
    } else if (path === '/test-servers') {
        tabName = 'test';
    }

    switchTabByRoute(tabName);
}

// Switch tab and update URL
function switchTabByRoute(tabName) {
    // Hide all tab contents
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.add('hidden'));

    // Remove active state from all nav items
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active', 'bg-gradient-to-r', 'from-blue-50', 'to-cyan-50', 'text-blue-700', 'border', 'border-blue-200');
        item.classList.add('text-gray-700', 'hover:bg-gray-50');
    });

    // Show selected tab
    const selectedTab = document.getElementById(`${tabName}-tab`);
    if (selectedTab) {
        selectedTab.classList.remove('hidden');
    }

    // Set active nav item
    const activeItem = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeItem) {
        activeItem.classList.remove('text-gray-700', 'hover:bg-gray-50');
        activeItem.classList.add('active', 'bg-gradient-to-r', 'from-blue-50', 'to-cyan-50', 'text-blue-700', 'border', 'border-blue-200');
    }

    // Update page title
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = pageTitle?.nextElementSibling;

    if (pageTitle) {
        switch(tabName) {
            case 'generate':
                pageTitle.textContent = 'Generate Server';
                if (pageSubtitle) pageSubtitle.textContent = 'Create powerful MCP servers from your data';
                break;
            case 'manage':
                pageTitle.textContent = 'Manage Servers';
                if (pageSubtitle) pageSubtitle.textContent = 'Manage and deploy your created MCP servers';
                break;
            case 'test':
                pageTitle.textContent = 'Test Servers';
                if (pageSubtitle) pageSubtitle.textContent = 'Run automated tests or create custom test scenarios';
                break;
        }
    }

    // Load data for specific tabs
    if (tabName === 'manage') {
        loadServers();
    } else if (tabName === 'test') {
        loadTestServers();
    }
}

// Tab management with URL update
function switchTab(tabName) {
    // Update URL
    let newPath = '/';
    if (tabName === 'manage') {
        newPath = '/manage-servers';
    } else if (tabName === 'test') {
        newPath = '/test-servers';
    }

    // Update URL without triggering popstate
    window.history.pushState(null, '', newPath);

    // Switch the tab
    switchTabByRoute(tabName);

    // Close sidebar on mobile
    if (window.innerWidth < 1024) {
        closeSidebar();
    }
}

// File upload setup
function setupFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');

    if (!fileUpload || !fileInput) return;

    fileUpload.addEventListener('click', () => fileInput.click());

    fileUpload.addEventListener('dragover', (e) => {
        e.preventDefault();
        fileUpload.classList.add('border-blue-400', 'bg-blue-50');
    });

    fileUpload.addEventListener('dragleave', () => {
        fileUpload.classList.remove('border-blue-400', 'bg-blue-50');
    });

    fileUpload.addEventListener('drop', (e) => {
        e.preventDefault();
        fileUpload.classList.remove('border-blue-400', 'bg-blue-50');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            fileInput.files = files;
            updateFileUploadDisplay(files[0].name);
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileUploadDisplay(e.target.files[0].name);
        }
    });
}

function updateFileUploadDisplay(fileName) {
    const fileUpload = document.getElementById('fileUpload');
    if (fileUpload) {
        fileUpload.innerHTML = `
            <div class="space-y-4">
                <div class="w-16 h-16 mx-auto bg-green-50 rounded-xl flex items-center justify-center">
                    <i class="fas fa-check text-2xl text-green-500"></i>
                </div>
                <div>
                    <p class="text-lg font-medium text-gray-900">File Selected</p>
                    <p class="text-sm text-gray-500">${fileName}</p>
                </div>
                <button type="button" onclick="resetFileUpload()" class="text-xs text-blue-500 hover:text-blue-600">Choose different file</button>
            </div>
        `;
    }
}

function resetFileUpload() {
    const fileUpload = document.getElementById('fileUpload');
    const fileInput = document.getElementById('fileInput');

    if (fileInput) fileInput.value = '';

    if (fileUpload) {
        fileUpload.innerHTML = `
            <div class="space-y-4">
                <div class="w-16 h-16 mx-auto bg-blue-50 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <i class="fas fa-cloud-upload-alt text-2xl text-blue-500"></i>
                </div>
                <div>
                    <p class="text-lg font-medium text-gray-900">Drop your file here</p>
                    <p class="text-sm text-gray-500">or click to browse files</p>
                </div>
                <p class="text-xs text-gray-400">Supports CSV, Excel files up to 10MB</p>
            </div>
        `;
    }
}


// Update default port based on database type
function updateDefaultPort() {
    const dbType = document.getElementById('dbType')?.value;
    const dbPort = document.getElementById('dbPort');

    const defaultPorts = {
        'mysql': 3306,
        'postgresql': 5432,
        'sqlite': '',
        'mssql': 1433
    };

    if (dbPort) {
        dbPort.placeholder = defaultPorts[dbType] || '';
        if (!dbPort.value && defaultPorts[dbType]) {
            dbPort.value = defaultPorts[dbType];
        }
    }
}


// Display data preview
function displayDataPreview(parsedData) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    let html = '';

    parsedData.forEach((data, index) => {
        const tableName = data.tableName || `Table ${index + 1}`;
        const panelId = `table-panel-${index}`;

        html += `
            <div class="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden mb-4">
                <div class="bg-white p-4 border-b border-gray-200 cursor-pointer" onclick="togglePanel('${panelId}')">
                    <div class="flex items-center justify-between">
                        <div>
                            <h4 class="font-semibold text-gray-900">${tableName}</h4>
                            <p class="text-sm text-gray-500">${data.metadata.rowCount} rows, ${data.metadata.columnCount} columns</p>
                        </div>
                        <i id="${panelId}-icon" class="fas fa-chevron-down text-gray-400 transition-transform"></i>
                    </div>
                </div>
                <div id="${panelId}" class="p-4 hidden">
                    <div class="overflow-x-auto">
                        <table class="min-w-full text-sm">
                            <thead>
                                <tr class="bg-gray-100">`;

        data.headers.forEach(header => {
            const dataType = data.metadata.dataTypes[header];
            html += `<th class="px-3 py-2 text-left font-medium text-gray-700">${header} <span class="text-xs text-gray-500">(${dataType})</span></th>`;
        });
        html += '</tr></thead><tbody>';

        data.rows.slice(0, 5).forEach((row, rowIndex) => {
            html += `<tr class="${rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}">`;
            row.forEach(cell => {
                html += `<td class="px-3 py-2 text-gray-900">${cell || ''}</td>`;
            });
            html += '</tr>';
        });

        if (data.rows.length > 5) {
            html += `<tr><td colspan="${data.headers.length}" class="px-3 py-2 text-center text-gray-500 italic">... and ${data.rows.length - 5} more rows</td></tr>`;
        }

        html += `</tbody></table>
                    </div>
                </div>
            </div>`;
    });

    preview.innerHTML = html;
}

// Toggle collapsible panel
function togglePanel(panelId) {
    const panel = document.getElementById(panelId);
    const icon = document.getElementById(`${panelId}-icon`);

    if (panel?.classList.contains('hidden')) {
        panel.classList.remove('hidden');
        icon?.classList.add('rotate-180');
    } else {
        panel?.classList.add('hidden');
        icon?.classList.remove('rotate-180');
    }
}

// Generate server
async function generateServer() {
    const name = document.getElementById('serverName')?.value;
    const description = document.getElementById('serverDescription')?.value;
    const version = document.getElementById('serverVersion')?.value;

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
    const generateBtn = document.getElementById('generateBtn');

    loading?.classList.remove('hidden');
    successDiv?.classList.add('hidden');
    errorDiv?.classList.add('hidden');
    if (generateBtn) generateBtn.disabled = true;

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
            showSuccessModal(name, result.data);
            resetForm();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('generate-error', error.message);
    } finally {
        loading?.classList.add('hidden');
        if (generateBtn) generateBtn.disabled = false;
    }
}

function resetForm() {
    document.getElementById('serverName').value = '';
    document.getElementById('serverDescription').value = '';
    document.getElementById('serverVersion').value = '1.0.0';

    // Reset data source selection
    document.querySelectorAll('input[name="dataSourceType"]').forEach(radio => {
        radio.checked = false;
    });

    document.getElementById('file-upload-section')?.classList.add('hidden');
    document.getElementById('database-section')?.classList.add('hidden');

    resetFileUpload();

    currentParsedData = null;
    currentDataSource = null;
    currentWizardStep = 1;

    // Reset wizard to step 1
    goToWizardStep(1);

    const generateBtn = document.getElementById('generateBtn');
    if (generateBtn) generateBtn.disabled = true;

    const nextBtn = document.getElementById('next-to-step-2');
    if (nextBtn) nextBtn.disabled = true;
}

// Load servers list
async function loadServers() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        if (result.success) {
            displayServers(result.data);
        } else {
            displayServers([]);
        }
    } catch (error) {
        console.error('Failed to load servers:', error);
        displayServers([]);
    }
}

// Display servers
function displayServers(servers) {
    const serverList = document.getElementById('server-list');
    if (!serverList) return;

    if (!servers || servers.length === 0) {
        serverList.innerHTML = `
            <div class="col-span-full">
                <div class="text-center py-12">
                    <div class="w-24 h-24 mx-auto bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
                        <i class="fas fa-server text-3xl text-gray-400"></i>
                    </div>
                    <h3 class="text-xl font-semibold text-gray-900 mb-2">No Servers Generated Yet</h3>
                    <p class="text-gray-600 mb-6">Create your first MCP server by uploading data or connecting to a database.</p>
                    <button class="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-[1.02]" onclick="switchTab('generate')">
                        <i class="fas fa-rocket mr-2"></i>
                        Generate Your First Server
                    </button>
                </div>
            </div>
        `;
        return;
    }

    let html = '';
    servers.forEach(server => {
        html += `
            <div class="bg-white rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden hover:shadow-xl transition-all duration-200 transform hover:scale-[1.02]">
                <div class="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 border-b border-gray-200/50">
                    <div class="flex items-center justify-between">
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900">${server.name}</h3>
                            <p class="text-sm text-gray-600">${server.description}</p>
                        </div>
                        <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                            <i class="fas fa-server text-white"></i>
                        </div>
                    </div>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-2 gap-4 mb-6">
                        <div class="text-center">
                            <div class="text-2xl font-bold text-blue-600">${server.toolsCount}</div>
                            <div class="text-sm text-gray-500">Tools</div>
                        </div>
                        <div class="text-center">
                            <div class="text-2xl font-bold text-green-600">${server.resourcesCount}</div>
                            <div class="text-sm text-gray-500">Resources</div>
                        </div>
                    </div>

                    <div class="flex flex-wrap gap-2 mb-6">
                        <span class="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">v${server.version}</span>
                        <span class="bg-purple-100 text-purple-800 text-xs font-medium px-2.5 py-0.5 rounded-full">${server.promptsCount} prompts</span>
                    </div>

                    <div class="space-y-2">
                        <button class="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200" onclick="viewServer('${server.id}')">
                            <i class="fas fa-eye mr-2"></i>
                            View Details
                        </button>

                        <div class="grid grid-cols-3 gap-2">
                            <button class="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-200" onclick="testServer('${server.id}')">
                                <i class="fas fa-vial text-xs mr-1"></i>
                                Test
                            </button>
                            <button class="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-all duration-200" onclick="exportServer('${server.id}')">
                                <i class="fas fa-download text-xs mr-1"></i>
                                Export
                            </button>
                            <button class="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-200 transition-all duration-200" onclick="deleteServer('${server.id}')">
                                <i class="fas fa-trash text-xs mr-1"></i>
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    serverList.innerHTML = html;
}

// Load test servers
async function loadTestServers() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        const select = document.getElementById('testServerSelect');
        if (!select) return;

        if (result.success && result.data.length > 0) {
            select.innerHTML = '<option value="">Select a server to test</option>';
            result.data.forEach(server => {
                select.innerHTML += `<option value="${server.id}">${server.name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">No servers available - Generate a server first</option>';
        }
    } catch (error) {
        console.error('Failed to load test servers:', error);
        const select = document.getElementById('testServerSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading servers</option>';
        }
    }
}

// Test functions
async function runAutoTests() {
    const serverId = document.getElementById('testServerSelect')?.value;
    if (!serverId) {
        showError('test-error', 'Please select a server to test');
        return;
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
        noResults?.classList.remove('hidden');
    } finally {
        loading?.classList.add('hidden');
    }
}

async function runCustomTest() {
    const serverId = document.getElementById('testServerSelect')?.value;
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
        noResults?.classList.remove('hidden');
    } finally {
        loading?.classList.add('hidden');
    }
}

// Display test results
function displayTestResults(testSuiteResult) {
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');

    if (!resultsDiv) return;

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
    noResults?.classList.add('hidden');
}

function displaySingleTestResult(testResult) {
    const resultsDiv = document.getElementById('test-results');
    const noResults = document.getElementById('no-results');

    if (!resultsDiv) return;

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
    noResults?.classList.add('hidden');
}

// Server management functions
async function viewServer(serverId) {
    // For now, just switch to manage tab - you can implement detailed view later
    console.log('View server:', serverId);
}

function testServer(serverId) {
    switchTab('test');
    setTimeout(() => {
        const select = document.getElementById('testServerSelect');
        if (select) select.value = serverId;
    }, 100);
}

async function exportServer(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/export`);
        const result = await response.json();

        if (result.success) {
            // Create download link
            const link = document.createElement('a');
            link.href = result.data.downloadUrl;
            link.download = result.data.filename;
            link.click();
        }
    } catch (error) {
        console.error('Export failed:', error);
    }
}

async function deleteServer(serverId) {
    if (!confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/servers/${serverId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            loadServers(); // Reload the servers list
            loadTestServers(); // Refresh test dropdown
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Delete failed:', error);
    }
}

// Success Modal Functions
function showSuccessModal(serverName, serverData) {
    const modal = document.getElementById("success-modal");
    const messageElement = document.getElementById("success-message");

    let message = `Your MCP server "${serverName}" has been successfully generated and is ready to use.`;

    if (serverData) {
        message += ` Generated ${serverData.toolsCount || 0} tools, ${serverData.resourcesCount || 0} resources, and ${serverData.promptsCount || 0} prompts.`;
    }

    if (messageElement) messageElement.textContent = message;

    if (modal) {
        modal.classList.remove('opacity-0', 'invisible');
        modal.querySelector('.bg-white').classList.remove('scale-95');
    }
}

function closeSuccessModal() {
    const modal = document.getElementById("success-modal");
    if (modal) {
        modal.classList.add('opacity-0', 'invisible');
        modal.querySelector('.bg-white').classList.add('scale-95');
    }
}

function goToManageServers() {
    closeSuccessModal();
    switchTab('manage');
}

// Server name validation
let nameCheckTimeout;

async function checkServerName() {
    const nameInput = document.getElementById('serverName');
    const validationDiv = document.getElementById('name-validation');
    const serverName = nameInput?.value.trim();

    // Clear previous timeout
    if (nameCheckTimeout) {
        clearTimeout(nameCheckTimeout);
    }

    // Hide validation if empty
    if (!serverName) {
        if (validationDiv) validationDiv.style.display = 'none';
        if (nameInput) nameInput.classList.remove('border-green-300', 'border-red-300');
        return;
    }

    // Debounce API calls
    nameCheckTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`/api/servers/check-name/${encodeURIComponent(serverName)}`);
            const result = await response.json();

            if (result.success && validationDiv && nameInput) {
                validationDiv.style.display = 'block';
                if (result.available) {
                    validationDiv.textContent = '✓ Server name is available';
                    validationDiv.className = 'mt-2 text-sm text-green-600';
                    nameInput.classList.remove('border-red-300');
                    nameInput.classList.add('border-green-300');
                } else {
                    validationDiv.textContent = '✗ Server name already exists';
                    validationDiv.className = 'mt-2 text-sm text-red-600';
                    nameInput.classList.remove('border-green-300');
                    nameInput.classList.add('border-red-300');
                }
            }
        } catch (error) {
            console.error('Error checking server name:', error);
        }
    }, 500);
}

// Handle next to step 2 - parse data first
async function handleNextToStep2() {
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;

    if (!selectedType) {
        showError('parse-error', 'Please select a data source type');
        return;
    }

    // If we already have parsed data, just go to step 2
    if (currentParsedData) {
        goToWizardStep(2);
        return;
    }

    const loading = document.getElementById('parse-loading');
    const errorDiv = document.getElementById('parse-error');
    const nextBtn = document.getElementById('next-to-step-2');

    loading?.classList.remove('hidden');
    errorDiv?.classList.add('hidden');
    if (nextBtn) nextBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('type', selectedType);

        if (selectedType === 'csv' || selectedType === 'excel') {
            const fileInput = document.getElementById('fileInput');
            if (!fileInput?.files[0]) {
                throw new Error('Please select a file');
            }
            formData.append('file', fileInput.files[0]);
        } else if (selectedType === 'database') {
            const connection = {
                type: document.getElementById('dbType')?.value,
                host: document.getElementById('dbHost')?.value,
                port: parseInt(document.getElementById('dbPort')?.value),
                database: document.getElementById('dbName')?.value,
                username: document.getElementById('dbUser')?.value,
                password: document.getElementById('dbPassword')?.value
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

            // Go to step 2 after successful parse
            goToWizardStep(2);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        showError('parse-error', error.message);
    } finally {
        loading?.classList.add('hidden');
        if (nextBtn) nextBtn.disabled = false;
    }
}

// Wizard Navigation Functions
function goToWizardStep(stepNumber) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.add('hidden');
    });

    // Show target step
    const targetStep = document.getElementById(`wizard-step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.remove('hidden');
    }

    // Update progress indicators
    updateWizardProgress(stepNumber);

    currentWizardStep = stepNumber;

    // Enable/disable navigation based on step and data state
    updateWizardNavigation();
}

function updateWizardProgress(activeStep) {
    // Reset all step indicators
    for (let i = 1; i <= 3; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        const stepText = indicator?.parentElement.nextElementSibling.querySelector('p');

        if (i < activeStep) {
            // Completed step
            indicator?.classList.remove('bg-gray-300', 'text-gray-600', 'bg-blue-500');
            indicator?.classList.add('bg-green-500', 'text-white');
            stepText?.classList.remove('text-gray-500', 'text-blue-600');
            stepText?.classList.add('text-green-600');
        } else if (i === activeStep) {
            // Current step
            indicator?.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-500');
            indicator?.classList.add('bg-blue-500', 'text-white');
            stepText?.classList.remove('text-gray-500', 'text-green-600');
            stepText?.classList.add('text-blue-600');
        } else {
            // Future step
            indicator?.classList.remove('bg-blue-500', 'bg-green-500', 'text-white');
            indicator?.classList.add('bg-gray-300', 'text-gray-600');
            stepText?.classList.remove('text-blue-600', 'text-green-600');
            stepText?.classList.add('text-gray-500');
        }
    }

    // Update progress bars
    const progress12 = document.getElementById('progress-1-2');
    const progress23 = document.getElementById('progress-2-3');

    if (activeStep >= 2) {
        progress12?.classList.remove('bg-gray-200');
        progress12?.classList.add('bg-green-500');
    } else {
        progress12?.classList.remove('bg-green-500');
        progress12?.classList.add('bg-gray-200');
    }

    if (activeStep >= 3) {
        progress23?.classList.remove('bg-gray-200');
        progress23?.classList.add('bg-green-500');
    } else {
        progress23?.classList.remove('bg-green-500');
        progress23?.classList.add('bg-gray-200');
    }
}

function updateWizardNavigation() {
    const nextToStep2 = document.getElementById('next-to-step-2');

    // Only enable step 2 if data source is configured and parsed, or if database connection is ready
    if (nextToStep2) {
        const hasDataSource = document.querySelector('input[name="dataSourceType"]:checked');
        const selectedType = hasDataSource?.value;
        const hasParsedData = currentParsedData !== null;
        
        let canProceed = false;
        
        if (selectedType === 'csv' || selectedType === 'excel') {
            // For file uploads, need parsed data
            canProceed = hasParsedData;
        } else if (selectedType === 'database') {
            // For database, check if all required fields are filled
            const dbType = document.getElementById('dbType')?.value;
            const dbHost = document.getElementById('dbHost')?.value;
            const dbName = document.getElementById('dbName')?.value;
            const dbUser = document.getElementById('dbUser')?.value;
            const dbPassword = document.getElementById('dbPassword')?.value;
            
            canProceed = dbType && dbHost && dbName && dbUser && dbPassword;
        }
        
        nextToStep2.disabled = !hasDataSource || !canProceed;
    }
}

// Toggle data source fields (updated to enable navigation)
function toggleDataSourceFields() {
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;
    const fileSection = document.getElementById('file-upload-section');
    const dbSection = document.getElementById('database-section');

    // Hide all sections first
    fileSection?.classList.add('hidden');
    dbSection?.classList.add('hidden');

    if (selectedType === 'csv' || selectedType === 'excel') {
        fileSection?.classList.remove('hidden');
    } else if (selectedType === 'database') {
        dbSection?.classList.remove('hidden');
        updateDefaultPort();
    }

    // Update wizard navigation state
    updateWizardNavigation();
}

// Utility functions
function showError(elementId, message) {
    const errorDiv = document.getElementById(elementId);
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
    }
}

function showSuccess(elementId, message) {
    const successDiv = document.getElementById(elementId);
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.classList.remove('hidden');
    }
}