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
            const tabName = item.getAttribute('data-tab');
            // Only prevent default for tab navigation, allow normal URL navigation
            if (tabName) {
                e.preventDefault();
                switchTab(tabName);
            }
            // If no data-tab, allow normal link navigation to href
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

    let html = '<div class="space-y-4">';

    // Header with instructions
    html += `
        <div class="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-info-circle text-blue-500 mt-1"></i>
                <div>
                    <h3 class="font-semibold text-blue-900 mb-1">Configure Your MCP Server</h3>
                    <p class="text-blue-800 text-sm">Select which tables to include and choose which tools to generate for each table. All tools are enabled by default.</p>
                </div>
            </div>
        </div>
    `;

    parsedData.forEach((data, index) => {
        const tableName = data.tableName || `Table ${index + 1}`;
        const panelId = `table-panel-${index}`;
        const cleanTableName = tableName.replace(/[^a-zA-Z0-9]/g, '_');

        // Check if table has numeric columns
        const numericColumns = data.headers.filter(header => {
            const dataType = data.metadata.dataTypes[header]?.toLowerCase() || '';
            return dataType.includes('int') || dataType.includes('float') || dataType.includes('decimal') || 
                   dataType.includes('numeric') || dataType.includes('real') || dataType.includes('double') ||
                   dataType === 'number';
        });

        html += `
            <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4 table-selection-panel">
                <!-- Table Header with Selection -->
                <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <div class="flex items-center space-x-3">
                            <label class="flex items-center space-x-2 cursor-pointer">
                                <input type="checkbox" 
                                       id="table-select-${index}" 
                                       class="w-5 h-5 text-blue-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                       checked 
                                       onchange="toggleTableSelection(${index})">
                                <div>
                                    <h4 class="font-semibold text-gray-900 text-lg">${tableName}</h4>
                                    <p class="text-sm text-gray-600">${data.metadata.rowCount} rows, ${data.metadata.columnCount} columns</p>
                                </div>
                            </label>
                        </div>
                        <button class="text-gray-400 hover:text-gray-600 transition-colors" onclick="toggleTableDetails('${panelId}')">
                            <i id="${panelId}-icon" class="fas fa-chevron-down transition-transform"></i>
                        </button>
                    </div>
                </div>

                <!-- Tool Selection Panel -->
                <div id="table-tools-${index}" class="bg-blue-50 p-4 border-b border-gray-200">
                    <h5 class="font-medium text-gray-900 mb-3">
                        <i class="fas fa-tools mr-2 text-blue-500"></i>
                        Select Tools to Generate
                    </h5>
                    <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        <!-- Basic CRUD Tools -->
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-get-${index}" 
                                   class="w-4 h-4 text-blue-600 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">GET</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-create-${index}" 
                                   class="w-4 h-4 text-green-600 border border-gray-300 rounded focus:ring-2 focus:ring-green-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">CREATE</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-update-${index}" 
                                   class="w-4 h-4 text-yellow-600 border border-gray-300 rounded focus:ring-2 focus:ring-yellow-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">UPDATE</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-delete-${index}" 
                                   class="w-4 h-4 text-red-600 border border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">DELETE</span>
                        </label>
                        
                        <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                            <input type="checkbox" 
                                   id="tool-count-${index}" 
                                   class="w-4 h-4 text-purple-600 border border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
                                   checked>
                            <span class="text-sm font-medium text-gray-700">COUNT</span>
                        </label>
                        
                        <!-- Aggregate Tools (only if numeric columns exist) -->
                        ${numericColumns.length > 0 ? `
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-min-${index}" 
                                       class="w-4 h-4 text-indigo-600 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">MIN</span>
                            </label>
                            
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-max-${index}" 
                                       class="w-4 h-4 text-pink-600 border border-gray-300 rounded focus:ring-2 focus:ring-pink-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">MAX</span>
                            </label>
                            
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-sum-${index}" 
                                       class="w-4 h-4 text-teal-600 border border-gray-300 rounded focus:ring-2 focus:ring-teal-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">SUM</span>
                            </label>
                            
                            <label class="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-white transition-colors">
                                <input type="checkbox" 
                                       id="tool-avg-${index}" 
                                       class="w-4 h-4 text-orange-600 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                                       checked>
                                <span class="text-sm font-medium text-gray-700">AVG</span>
                            </label>
                        ` : ''}
                    </div>
                    ${numericColumns.length > 0 ? `
                        <div class="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p class="text-sm text-green-800">
                                <i class="fas fa-calculator mr-2"></i>
                                <strong>Aggregate tools available:</strong> This table has ${numericColumns.length} numeric column(s): 
                                <span class="font-mono">${numericColumns.join(', ')}</span>
                            </p>
                        </div>
                    ` : ''}
                    
                    <!-- Quick Actions -->
                    <div class="mt-4 flex items-center space-x-4">
                        <button onclick="selectAllTools(${index})" class="text-sm text-blue-600 hover:text-blue-800 font-medium">
                            <i class="fas fa-check-square mr-1"></i>Select All
                        </button>
                        <button onclick="deselectAllTools(${index})" class="text-sm text-gray-600 hover:text-gray-800 font-medium">
                            <i class="fas fa-square mr-1"></i>Deselect All
                        </button>
                        <button onclick="selectOnlyBasicTools(${index})" class="text-sm text-green-600 hover:text-green-800 font-medium">
                            <i class="fas fa-check mr-1"></i>Basic Only
                        </button>
                    </div>
                </div>

                <!-- Table Data Preview (Collapsible) -->
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

    html += '</div>';
    preview.innerHTML = html;
}

// Toggle table details panel
function toggleTableDetails(panelId) {
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

// Legacy function for backward compatibility
function togglePanel(panelId) {
    toggleTableDetails(panelId);
}

// Toggle table selection
function toggleTableSelection(tableIndex) {
    const checkbox = document.getElementById(`table-select-${tableIndex}`);
    const toolsPanel = document.getElementById(`table-tools-${tableIndex}`);
    
    if (checkbox?.checked) {
        toolsPanel?.classList.remove('opacity-50');
        toolsPanel?.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.disabled = false;
        });
    } else {
        toolsPanel?.classList.add('opacity-50');
        toolsPanel?.querySelectorAll('input[type="checkbox"]').forEach(input => {
            input.disabled = true;
        });
    }
}

// Tool selection helper functions
function selectAllTools(tableIndex) {
    const toolInputs = document.querySelectorAll(`#table-tools-${tableIndex} input[type="checkbox"]`);
    toolInputs.forEach(input => {
        if (!input.disabled) input.checked = true;
    });
}

function deselectAllTools(tableIndex) {
    const toolInputs = document.querySelectorAll(`#table-tools-${tableIndex} input[type="checkbox"]`);
    toolInputs.forEach(input => {
        if (!input.disabled) input.checked = false;
    });
}

function selectOnlyBasicTools(tableIndex) {
    // First deselect all
    deselectAllTools(tableIndex);
    
    // Then select only basic CRUD tools
    const basicTools = ['get', 'create', 'update', 'delete'];
    basicTools.forEach(tool => {
        const input = document.getElementById(`tool-${tool}-${tableIndex}`);
        if (input && !input.disabled) input.checked = true;
    });
}

// Get selected tables and their tools configuration
function getSelectedTablesAndTools() {
    const selectedTables = [];
    
    // Find all table selection checkboxes
    document.querySelectorAll('[id^="table-select-"]').forEach((checkbox, index) => {
        if (checkbox.checked) {
            const toolsConfig = {
                get: document.getElementById(`tool-get-${index}`)?.checked || false,
                create: document.getElementById(`tool-create-${index}`)?.checked || false,
                update: document.getElementById(`tool-update-${index}`)?.checked || false,
                delete: document.getElementById(`tool-delete-${index}`)?.checked || false,
                count: document.getElementById(`tool-count-${index}`)?.checked || false,
                min: document.getElementById(`tool-min-${index}`)?.checked || false,
                max: document.getElementById(`tool-max-${index}`)?.checked || false,
                sum: document.getElementById(`tool-sum-${index}`)?.checked || false,
                avg: document.getElementById(`tool-avg-${index}`)?.checked || false
            };
            
            selectedTables.push({
                index: index,
                tools: toolsConfig
            });
        }
    });
    
    return selectedTables;
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

    // Get selected tables and their tool configurations
    const selectedTablesConfig = getSelectedTablesAndTools();
    
    if (selectedTablesConfig.length === 0) {
        showError('generate-error', 'Please select at least one table to generate server for');
        return;
    }

    console.log('🔍 Selected tables and tools:', selectedTablesConfig);

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
                version: version || '1.0.0',
                dataSource: currentDataSource,
                selectedTables: selectedTablesConfig,
                parsedData: currentParsedData
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
                    <button class="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 transform hover:scale-[1.02]" onclick="window.location.href='/'">
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
    console.log('🔍 viewServer called with serverId:', serverId);
    
    try {
        console.log('🔍 Fetching server details from:', `/api/servers/${serverId}`);
        const response = await fetch(`/api/servers/${serverId}`);
        console.log('🔍 Response status:', response.status);
        
        const result = await response.json();
        console.log('🔍 Response result:', result);

        if (result.success) {
            console.log('🔍 Server data structure:', result.data);
            console.log('🔍 Config tools:', result.data?.config?.tools);
            console.log('🔍 Config resources:', result.data?.config?.resources);
            showServerDetailsModal(result.data);
        } else {
            console.error('❌ Failed to load server details:', result.error);
            alert('Failed to load server details: ' + result.error);
        }
    } catch (error) {
        console.error('❌ Error loading server details:', error);
        alert('Error loading server details: ' + error.message);
    }
}

function showServerDetailsModal(serverData) {
    console.log('🔍 showServerDetailsModal called with:', serverData);
    
    // Safely extract data with defaults
    const config = serverData?.config || {};
    const tools = config.tools || [];
    const resources = config.resources || [];
    const serverName = config.name || 'Unknown Server';
    const serverDescription = config.description || 'No description available';
    
    console.log('🔍 Modal data:', { tools: tools.length, resources: resources.length, serverName });

    const modalHtml = `
        <div id="server-details-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div class="p-6 border-b border-gray-200">
                    <div class="flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-gray-900">${serverName}</h2>
                        <button onclick="closeServerDetailsModal()" class="text-gray-400 hover:text-gray-600">
                            <i class="fas fa-times text-xl"></i>
                        </button>
                    </div>
                    <p class="text-gray-600 mt-2">${serverDescription}</p>
                </div>

                <div class="p-6">
                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <!-- Tools Section -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">
                                <i class="fas fa-tools mr-2 text-blue-500"></i>
                                Tools (${tools.length})
                            </h3>
                            <div class="space-y-3 max-h-60 overflow-y-auto">
                                ${tools.length > 0 ? tools.map(tool => `
                                    <div class="bg-gray-50 rounded-lg p-3">
                                        <div class="font-medium text-gray-900">${tool.name || 'Unnamed Tool'}</div>
                                        <div class="text-sm text-gray-600 mt-1">${tool.description || 'No description'}</div>
                                        <div class="text-xs text-gray-500 mt-1">Operation: ${tool.operation || 'Unknown'}</div>
                                    </div>
                                `).join('') : '<div class="text-gray-500 text-sm">No tools available</div>'}
                            </div>
                        </div>

                        <!-- Resources Section -->
                        <div>
                            <h3 class="text-lg font-semibold text-gray-900 mb-4">
                                <i class="fas fa-database mr-2 text-green-500"></i>
                                Resources (${resources.length})
                            </h3>
                            <div class="space-y-3 max-h-60 overflow-y-auto">
                                ${resources.length > 0 ? resources.map(resource => `
                                    <div class="bg-gray-50 rounded-lg p-3">
                                        <div class="font-medium text-gray-900">${resource.name || 'Unnamed Resource'}</div>
                                        <div class="text-sm text-gray-600 mt-1">${resource.description || 'No description'}</div>
                                        <div class="text-xs text-gray-500 mt-1 font-mono">${resource.uri_template || resource.uri || 'No URI'}</div>
                                    </div>
                                `).join('') : '<div class="text-gray-500 text-sm">No resources available</div>'}
                            </div>
                        </div>
                    </div>

                    <div class="mt-6 pt-6 border-t border-gray-200">
                        <div class="flex flex-wrap gap-4">
                            <button onclick="testServer('${serverData.id || serverData.config?.id || 'unknown'}')" class="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-all duration-200">
                                <i class="fas fa-vial mr-2"></i>
                                Test Server
                            </button>
                            <button onclick="exportServer('${serverData.id || serverData.config?.id || 'unknown'}')" class="bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-all duration-200">
                                <i class="fas fa-download mr-2"></i>
                                Export Server
                            </button>
                            <button onclick="deleteServer('${serverData.id || serverData.config?.id || 'unknown'}')" class="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200">
                                <i class="fas fa-trash mr-2"></i>
                                Delete Server
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    console.log('🔍 Modal added to DOM');
}

function closeServerDetailsModal() {
    const modal = document.getElementById('server-details-modal');
    if (modal) {
        modal.remove();
    }
}

function testServer(serverId) {
    // Close modal if open
    closeServerDetailsModal();
    
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
    // Get server name for modal display
    const serverName = await getServerName(serverId);
    showDeleteConfirmModal(serverId, serverName || 'Unknown Server');
}

async function getServerName(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}`);
        const result = await response.json();
        return result.success ? result.data.config.name : null;
    } catch (error) {
        return null;
    }
}

function showDeleteConfirmModal(serverId, serverName) {
    const modalHtml = `
        <div id="delete-confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                        <i class="fas fa-trash text-2xl text-red-600"></i>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Delete Server</h3>
                    <p class="text-gray-600 text-center mb-6">
                        Are you sure you want to delete <strong>"${serverName}"</strong>? 
                        <br><br>
                        This action cannot be undone and will permanently remove all server files and configurations.
                    </p>
                    
                    <div class="flex gap-3">
                        <button onclick="closeDeleteConfirmModal()" class="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200">
                            Cancel
                        </button>
                        <button onclick="confirmDeleteServer('${serverId}')" class="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200">
                            <i class="fas fa-trash mr-2"></i>
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteConfirmModal() {
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.remove();
    }
}

async function confirmDeleteServer(serverId) {
    // Close confirmation modal
    closeDeleteConfirmModal();
    
    // Show loading modal
    showDeleteLoadingModal();

    try {
        const response = await fetch(`/api/servers/${serverId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        // Close loading modal
        closeDeleteLoadingModal();

        if (result.success) {
            // Close server details modal if open
            closeServerDetailsModal();
            
            // Show success modal
            showDeleteSuccessModal();
            
            // Reload server lists
            loadServers();
            loadTestServers();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        closeDeleteLoadingModal();
        showDeleteErrorModal(error.message);
        console.error('Delete failed:', error);
    }
}

function showDeleteLoadingModal() {
    const modalHtml = `
        <div id="delete-loading-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6 text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Deleting Server</h3>
                    <p class="text-gray-600">Please wait while we remove the server and all its files...</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteLoadingModal() {
    const modal = document.getElementById('delete-loading-modal');
    if (modal) {
        modal.remove();
    }
}

function showDeleteSuccessModal() {
    const modalHtml = `
        <div id="delete-success-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full mb-4">
                        <i class="fas fa-check text-2xl text-green-600"></i>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Server Deleted Successfully</h3>
                    <p class="text-gray-600 text-center mb-6">
                        The server has been permanently removed from your system.
                    </p>
                    
                    <button onclick="closeDeleteSuccessModal()" class="w-full bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-all duration-200">
                        <i class="fas fa-check mr-2"></i>
                        OK
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteSuccessModal() {
    const modal = document.getElementById('delete-success-modal');
    if (modal) {
        modal.remove();
    }
}

function showDeleteErrorModal(errorMessage) {
    const modalHtml = `
        <div id="delete-error-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Delete Failed</h3>
                    <p class="text-gray-600 text-center mb-6">
                        Failed to delete the server: ${errorMessage}
                    </p>
                    
                    <button onclick="closeDeleteErrorModal()" class="w-full bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200">
                        <i class="fas fa-times mr-2"></i>
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteErrorModal() {
    const modal = document.getElementById('delete-error-modal');
    if (modal) {
        modal.remove();
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