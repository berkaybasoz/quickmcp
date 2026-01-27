

let currentParsedData = null;
let currentDataSource = null;
let currentWizardStep = 1;
let allServers = [];
let serverSearchTimer = null;

function initializeManageServersPage() {
    const panel = document.getElementById('server-details-panel');
    if (!panel) return;

    // Make panel visible (also undo responsive hidden states)
    panel.classList.remove('hidden', 'translate-x-full', 'lg:hidden');
    panel.classList.add('lg:flex');
    panel.style.display = 'flex';

    // Always start collapsed on page load
    try {
        localStorage.setItem('rightPanelCollapsed', 'true');
    } catch {}

    // Populate with placeholder. This will be overwritten when a server is viewed.
    panel.innerHTML = `
        <div id="serverDetailsHeaderRow" class="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
            <div class="flex items-center gap-3">
                <button id="rightPanelCollapseBtn" class="text-slate-400 hover:text-slate-600 mr-2 inline-flex items-center justify-center" title="Collapse panel">
                    <i class="fas fa-angles-left"></i>
                </button>
                <div id="serverDetailsHeaderMain" class="flex items-center gap-3">
                    <div class="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25">
                        <i class="fas fa-wrench text-white"></i>
                    </div>
                    <div>
                        <h2 class="text-slate-900 font-bold tracking-tight text-lg">Server Details</h2>
                        <p class="text-slate-500 text-xs leading-none font-medium">No server selected</p>
                    </div>
                </div>
            </div>
        </div>
        <div class="flex-1 overflow-y-auto scrollbar-modern p-6 space-y-6">
            <div class="card p-4 bg-blue-50 border-blue-100">
                <div class="flex items-start gap-3 text-sm text-slate-700">
                    <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div>
                        <div class="font-semibold text-blue-900 mb-1">Select a server to view details</div>
                        <p>Select a server from the list and click the <i class="fas fa-eye"></i> icon. Tools, resources, and quick actions will appear here.</p>
                    </div>
                </div>
            </div>
            <div class="space-y-3">
                <div class="card p-3 bg-white border border-slate-200 rounded-xl">
                    <div class="text-xs text-slate-500">No server selected</div>
                </div>
            </div>
        </div>
    `;

    // Add mini icon row for collapsed mode
    try {
        const headerRowEl = panel.querySelector('#serverDetailsHeaderRow');
        if (headerRowEl && !panel.querySelector('#rightPanelMiniRow')) {
            const miniRow = document.createElement('div');
            miniRow.id = 'rightPanelMiniRow';
            miniRow.className = 'hidden flex items-center justify-center py-2';
            miniRow.innerHTML = '<div id="serverDetailsMiniIcon" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600"><i class="fas fa-wrench"></i></div>';
            headerRowEl.insertAdjacentElement('afterend', miniRow);
        }
    } catch {}

    // Add listener for the new button
    const collapseBtn = panel.querySelector('#rightPanelCollapseBtn');
    if (collapseBtn && !collapseBtn.dataset.listenerAttached) {
        collapseBtn.addEventListener('click', () => {
            const current = localStorage.getItem('rightPanelCollapsed') === 'true';
            localStorage.setItem('rightPanelCollapsed', String(!current));
            applyRightPanelCollapsedState();
        });
        collapseBtn.dataset.listenerAttached = 'true';
    }
    
    // Apply the visual state
    applyRightPanelCollapsedState();

    // Collapse panel when clicking outside
    if (!panel.dataset.docClickAttached) {
        document.addEventListener('click', (e) => {
            if (panel.classList.contains('collapsed')) return;
            if (panel.contains(e.target)) return;
            try { localStorage.setItem('rightPanelCollapsed', 'true'); } catch {}
            applyRightPanelCollapsedState();
        });
        panel.dataset.docClickAttached = 'true';
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    try { setupTemplateFilters(); } catch {}
    setupFileUpload();
    setupRouting();
    handleInitialRoute();
    try { applySidebarCollapsedState(); } catch {}

    // This will run on the manage-servers page
    if (document.getElementById('server-list')) {
        initializeManageServersPage();
    }
});

// Initialize sidebar resizer and collapsed state on window load (safe after DOM ready)
window.addEventListener('load', () => {
    try { initSidebarResizer(); } catch {}
    try { applySidebarCollapsedState(); } catch {}
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
    // REST swagger url change
    document.getElementById('swaggerUrl')?.addEventListener('input', updateWizardNavigation);
    // Web URL change
    document.getElementById('webUrl')?.addEventListener('input', updateWizardNavigation);

    // Generate button
    document.getElementById('generateBtn')?.addEventListener('click', generateServer);

    // Server name validation
    document.getElementById('serverName')?.addEventListener('input', checkServerName);

    // Alias validation
    document.getElementById('curlToolAlias')?.addEventListener('input', () => checkAlias('curl'));
    document.getElementById('webToolAlias')?.addEventListener('input', () => checkAlias('web'));

    // Test buttons
    document.getElementById('runQuickTestBtn')?.addEventListener('click', () => runAutoTests(false));
    document.getElementById('runFullTestBtn')?.addEventListener('click', () => runAutoTests(true));
    document.getElementById('runAutoTestsBtn')?.addEventListener('click', runAutoTests);
    document.getElementById('runCustomTestBtn')?.addEventListener('click', runCustomTest);
    
    // Test type change handler
    document.getElementById('testType')?.addEventListener('change', handleTestTypeChange);
    
    // Test server select change handler for loading tools
    document.getElementById('testServerSelect')?.addEventListener('change', handleTestServerChange);

    // Server search & filters (Manage page)
    const serverSearchInput = document.getElementById('serverSearch');
    const versionInput = document.getElementById('serverVersionFilter');
    const minToolsInput = document.getElementById('minToolsFilter');
    const minResourcesInput = document.getElementById('minResourcesFilter');
    const sortSelect = document.getElementById('serverSortSelect');
    const typeSelect = document.getElementById('serverTypeFilter');
    const clearBtn = document.getElementById('clearServerFilters');
    if (serverSearchInput) {
        serverSearchInput.addEventListener('input', () => {
            if (serverSearchTimer) clearTimeout(serverSearchTimer);
            serverSearchTimer = setTimeout(() => {
                applyServerFilters();
            }, 200);
        });
    }
    if (versionInput) versionInput.addEventListener('input', debounce(applyServerFilters, 200));
    if (minToolsInput) minToolsInput.addEventListener('input', debounce(applyServerFilters, 200));
    if (minResourcesInput) minResourcesInput.addEventListener('input', debounce(applyServerFilters, 200));
    if (sortSelect) sortSelect.addEventListener('change', applyServerFilters);
    if (typeSelect) typeSelect.addEventListener('change', applyServerFilters);
    if (clearBtn) clearBtn.addEventListener('click', () => {
        if (serverSearchInput) serverSearchInput.value = '';
        if (versionInput) versionInput.value = '';
        if (minToolsInput) minToolsInput.value = '';
        if (minResourcesInput) minResourcesInput.value = '';
        if (sortSelect) sortSelect.value = 'name-asc';
        if (typeSelect) typeSelect.value = '';
        applyServerFilters();
    });

    const deleteAllBtn = document.getElementById('deleteAllServersBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllServers);

    // Collapsible left sidebar toggle
    const leftToggle = document.getElementById('sidebarCollapseBtn');
    if (leftToggle) {
        leftToggle.addEventListener('click', () => {
            const current = localStorage.getItem('sidebarCollapsed') === 'true';
            localStorage.setItem('sidebarCollapsed', (!current).toString());
            applySidebarCollapsedState();
        });
        // Also make the entire header row clickable to expand when collapsed
        const headerRow = document.getElementById('sidebarHeaderRow');
        headerRow?.addEventListener('click', (e) => {
            if (document.getElementById('sidebar')?.classList.contains('collapsed')) {
                // Prevent double handling when clicking the button itself
                if ((e.target.closest && e.target.closest('#sidebarCollapseBtn'))) return;
                localStorage.setItem('sidebarCollapsed', 'false');
                applySidebarCollapsedState();
            }
        });
    }


    // cURL mode toggle
    const curlPasteTab = document.getElementById('curlPasteTab');
    const curlManualTab = document.getElementById('curlManualTab');
    const curlPasteMode = document.getElementById('curlPasteMode');
    const curlManualMode = document.getElementById('curlManualMode');

    curlPasteTab?.addEventListener('click', () => {
        curlPasteTab.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        curlPasteTab.classList.remove('text-slate-600');
        curlManualTab.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        curlManualTab.classList.add('text-slate-600');
        curlPasteMode?.classList.remove('hidden');
        curlManualMode?.classList.add('hidden');
    });

    curlManualTab?.addEventListener('click', () => {
        curlManualTab.classList.add('bg-white', 'text-slate-900', 'shadow-sm');
        curlManualTab.classList.remove('text-slate-600');
        curlPasteTab.classList.remove('bg-white', 'text-slate-900', 'shadow-sm');
        curlPasteTab.classList.add('text-slate-600');
        curlManualMode?.classList.remove('hidden');
        curlPasteMode?.classList.add('hidden');
    });

    // Wizard navigation
    document.getElementById('next-to-step-2')?.addEventListener('click', () => goToWizardStep(2));
    document.getElementById('back-to-step-1')?.addEventListener('click', () => goToWizardStep(1));
    document.getElementById('next-to-step-3')?.addEventListener('click', handleNextToStep3);
    document.getElementById('back-to-step-2')?.addEventListener('click', () => goToWizardStep(2));
    document.getElementById('next-to-step-4')?.addEventListener('click', () => goToWizardStep(4));
    document.getElementById('back-to-step-3')?.addEventListener('click', () => goToWizardStep(3));
}

function deleteAllServers() {
    showDeleteAllConfirmModal();
}

// Parse cURL command
function parseCurlCommand(curlCommand) {
    const result = {
        url: '',
        method: 'GET',
        headers: {},
        body: {}
    };

    try {
        // Remove line breaks and extra spaces
        let cmd = curlCommand.replace(/\\\s*\n/g, ' ').replace(/\s+/g, ' ').trim();

        console.log('🔍 parseCurlCommand - original:', curlCommand);
        console.log('🔍 parseCurlCommand - cleaned:', cmd);

        // Remove 'curl' from beginning
        cmd = cmd.replace(/^curl\s+/, '');

        // Extract method (-X or --request) FIRST
        const methodMatch = cmd.match(/(?:-X|--request)\s+([A-Z]+)/i);
        if (methodMatch) {
            result.method = methodMatch[1].toUpperCase();
            // Remove method from command
            cmd = cmd.replace(methodMatch[0], '').trim();
            console.log('🔍 parseCurlCommand - method found:', result.method);
            console.log('🔍 parseCurlCommand - after method removal:', cmd);
        }

        // Extract URL (look for quoted string first, then any URL pattern)
        const quotedUrlMatch = cmd.match(/["']([^"']+)["']/);
        if (quotedUrlMatch) {
            result.url = quotedUrlMatch[1];
            cmd = cmd.replace(quotedUrlMatch[0], '').trim();
            console.log('🔍 parseCurlCommand - quoted URL found:', result.url);
        } else {
            // Try to find URL pattern (starts with http:// or https://)
            const urlPatternMatch = cmd.match(/(https?:\/\/[^\s]+)/);
            if (urlPatternMatch) {
                result.url = urlPatternMatch[1];
                cmd = cmd.replace(urlPatternMatch[0], '').trim();
                console.log('🔍 parseCurlCommand - URL pattern found:', result.url);
            }
        }

        // Extract headers (-H or --header)
        const headerRegex = /(?:-H|--header)\s+["']([^"']+)["']/g;
        let headerMatch;
        while ((headerMatch = headerRegex.exec(cmd)) !== null) {
            const headerStr = headerMatch[1];
            const colonIndex = headerStr.indexOf(':');
            if (colonIndex > 0) {
                const key = headerStr.substring(0, colonIndex).trim();
                const value = headerStr.substring(colonIndex + 1).trim();
                result.headers[key] = value;
            }
        }

        // Extract body (-d or --data)
        const bodyMatch = cmd.match(/(?:-d|--data|--data-raw)\s+["']([^"']+)["']/);
        if (bodyMatch) {
            try {
                result.body = JSON.parse(bodyMatch[1]);
            } catch (e) {
                // If not JSON, treat as form data
                console.warn('Body is not JSON, treating as raw string');
            }
        }

        return result;
    } catch (error) {
        console.error('Failed to parse curl command:', error);
        throw new Error('Failed to parse curl command. Please check the format.');
    }
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
    const headerNewServerBtn = document.getElementById('headerNewServerBtn');
    // Titles removed from AppBar by design
    if (pageTitle) pageTitle.classList.add('hidden');
    // Always show New Server if present
    headerNewServerBtn?.classList.remove('hidden');

    // Ensure Server Details side panel only on Manage
    const detailsPanel = document.getElementById('server-details-panel');
    if (detailsPanel) {
        // Always start hidden; override responsive display too
        detailsPanel.classList.add('hidden', 'lg:hidden');
        detailsPanel.classList.remove('lg:flex');
        if (tabName !== 'manage') {
            // Ensure it stays hidden outside Manage
            detailsPanel.classList.add('hidden', 'lg:hidden');
            detailsPanel.classList.remove('lg:flex');
        }
    }

    // Hide server details overlay when switching tabs
    const overlayPanel = document.getElementById('server-details-panel');
    if (overlayPanel) {
        overlayPanel.classList.add('translate-x-full');
        overlayPanel.classList.add('hidden');
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

    // If the target view's DOM isn't present on this page, do a full navigation
    const needsFullNav = (
        (tabName === 'manage' && !document.getElementById('server-list')) ||
        (tabName === 'test' && !document.getElementById('testServerSelect')) ||
        (tabName === 'generate' && !document.getElementById('generate-tab'))
    );
    if (needsFullNav) {
        window.location.href = newPath;
        return;
    }

    // Update URL without triggering popstate and switch locally
    window.history.pushState(null, '', newPath);
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
            updateWizardNavigation();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            updateFileUploadDisplay(e.target.files[0].name);
            updateWizardNavigation();
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


// Setup filter buttons for data source templates (All, Files, Database, API)
function setupTemplateFilters() {
    const bar = document.getElementById('dataSourceFilterBar');
    if (!bar) return;

    const buttons = bar.querySelectorAll('.template-filter');
    const cards = document.querySelectorAll('[data-role="data-source-card"]');
    const searchInput = document.getElementById('dataSourceSearch');
    let currentFilter = 'all';
    let currentQuery = '';

    const setActive = (activeBtn) => {
        buttons.forEach(btn => {
            btn.classList.remove('bg-blue-600', 'text-white', 'border-blue-600');
            btn.classList.add('bg-white', 'text-slate-600', 'border-slate-200');
        });
        activeBtn.classList.remove('bg-white', 'text-slate-600', 'border-slate-200');
        activeBtn.classList.add('bg-blue-600', 'text-white', 'border-blue-600');
    };

    const matchesQuery = (card, query) => {
        if (!query) return true;
        const text = (card.innerText || '').toLowerCase();
        return text.includes(query);
    };

    const applyFilter = (filter, query = currentQuery) => {
        currentFilter = filter;
        currentQuery = query;
        cards.forEach(card => {
            const cat = card.getAttribute('data-category');
            const visible = (filter === 'all' || cat === filter) && matchesQuery(card, currentQuery);
            card.classList.toggle('hidden', !visible);
        });
    };

    buttons.forEach(btn => {
        if (btn.dataset.listenerAttached) return;
        btn.addEventListener('click', () => {
            setActive(btn);
            applyFilter(btn.getAttribute('data-filter'), currentQuery);
        });
        btn.dataset.listenerAttached = 'true';
    });

    if (searchInput && !searchInput.dataset.listenerAttached) {
        const handle = debounce(() => {
            const q = (searchInput.value || '').trim().toLowerCase();
            applyFilter(currentFilter, q);
        }, 150);
        searchInput.addEventListener('input', handle);
        searchInput.dataset.listenerAttached = 'true';
    }

    // Initialize default state
    const selected = document.querySelector('input[name="dataSourceType"]:checked');
    const selectedCard = selected ? selected.closest('[data-role="data-source-card"]') : null;
    const defaultFilter = selectedCard?.getAttribute('data-category') || 'all';
    const defaultBtn = bar.querySelector(`[data-filter="${defaultFilter}"]`) || bar.querySelector('[data-filter="all"]');
    if (defaultBtn) setActive(defaultBtn);
    applyFilter(defaultFilter, '');
}

// Update default port based on database type
function updateDefaultPort() {
    // Determine selected DB type from source cards
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;
    const dbPort = document.getElementById('dbPort');

    const defaultPorts = {
        'mysql': 3306,
        'postgresql': 5432,
        'sqlite': '',
        'mssql': 1433,
        'oracle': 1521,
        'redis': 6379,
        'hazelcast': 5701,
        'kafka': 9092,
        'db2': 446
    };

    if (dbPort) {
        const def = Object.prototype.hasOwnProperty.call(defaultPorts, selectedType) ? defaultPorts[selectedType] : '';
        dbPort.placeholder = def === '' ? '' : String(def);
        // Veritabanı tipi değiştiğinde portu her zaman güncelle
        dbPort.value = def === '' ? '' : String(def);
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

    // REST endpoints preview
    if (Array.isArray(parsedData) && parsedData.length && parsedData[0]?.path && parsedData[0]?.method) {
        html += `
        <div class="bg-white rounded-xl border-2 border-gray-200 shadow-sm overflow-hidden mb-4">
            <div class="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b border-gray-200">
                <h4 class="font-semibold text-gray-900 text-lg">Discovered Endpoints</h4>
                <p class="text-sm text-gray-600">Select endpoints to generate as tools.</p>
            </div>
            <div class="p-4 space-y-2">
                ${parsedData.map((ep, i) => `
                    <label class="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                        <input type="checkbox" id="rest-endpoint-${i}" class="w-4 h-4 text-blue-600 border-gray-300 rounded" checked>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700">${(ep.method || '').toUpperCase()}</span>
                        <span class="font-mono text-sm text-slate-800 truncate">${ep.path}</span>
                        <span class="text-xs text-slate-500 truncate">${ep.summary || ''}</span>
                    </label>
                `).join('')}
            </div>
        </div>`;
        html += '</div>';
        preview.innerHTML = html;
        return;
    }

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
    // REST mode: collect selected endpoints
    if (currentDataSource?.type === DataSourceType.Rest && Array.isArray(currentParsedData)) {
        currentParsedData.forEach((_, idx) => {
            const cb = document.getElementById(`rest-endpoint-${idx}`);
            if (cb && cb.checked) {
                selectedTables.push({ index: idx });
            }
        });
        return selectedTables;
    }
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

    // Debug log
    //console.log('🔍 DEBUG - currentDataSource:', currentDataSource);
    //console.log('🔍 DEBUG - currentDataSource.type:', currentDataSource?.type);

    // Get selected tables and their tool configurations
    let selectedTablesConfig = getSelectedTablesAndTools();

    // For data sources that don't need table selection (runtime execution)
    if (isNoTableDataSource(currentDataSource?.type)) {
        selectedTablesConfig = []; // Empty is OK - tools are generated based on config
    } else if (selectedTablesConfig.length === 0) {
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

    const nextBtn = document.getElementById('next-to-step-3');
    if (nextBtn) nextBtn.disabled = true;
}

// Load servers list
async function loadServers() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        if (result.success) {
            allServers = Array.isArray(result.data) ? result.data : [];
            applyServerFilters();
        } else {
            allServers = [];
            displayServers([]);
            updateServerSearchCount(0, 0);
        }
    } catch (error) {
        console.error('Failed to load servers:', error);
        allServers = [];
        displayServers([]);
        updateServerSearchCount(0, 0);
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
                    <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-xl shadow-blue-500/40" onclick="window.location.href='/'">
                        <i class="fas fa-rocket mr-2"></i>
                        Generate Your First Server
                    </button>
                </div>
            </div>
        `;
        return;
    }

    // Build list view: clean, compact, zebra rows
    const headerHtml = `
        <div class="flex items-center justify-end px-5 py-3 bg-slate-50 border border-slate-200 rounded-t-xl">
            <button id="deleteAllServersBtn" class="px-3 py-1.5 rounded-lg border border-red-200 text-red-700 hover:border-red-400 hover:text-red-600 transition-colors text-xs font-medium">
                Delete All
            </button>
        </div>
        <div class="hidden md:grid grid-cols-12 items-center px-5 py-3 bg-slate-50 border-x border-b border-slate-200 text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
            <div class="col-span-4">Name</div>
            <div class="col-span-2">Type</div>
            <div class="col-span-1">Version</div>
            <div class="col-span-2">Tools</div>
            <div class="col-span-2">Resources</div>
            <div class="col-span-1 text-right">Actions</div>
        </div>`;

    const rowsHtml = servers.map(server => {
        const derivedType = server.type || (typeof server.description === 'string' && (server.description.match(/\(([^)]+)\)/)?.[1] || '')) || '';
        const safeType = derivedType || 'unknown';
        return `
        <div class="group md:grid md:grid-cols-12 items-start md:items-center px-5 py-3 border-x border-b border-slate-200 odd:bg-white even:bg-slate-50/60 hover:bg-slate-50 transition-colors">
            <div class="md:col-span-4 min-w-0 pr-3">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="hidden md:inline-flex w-6 h-6 items-center justify-center rounded-md bg-blue-100 text-blue-600"><i class="fas fa-server text-xs"></i></span>
                    <span id="server-name-${server.id}" ondblclick="startRenameServer('${server.id}', '${server.name.replace(/'/g, "'")}')" class="font-semibold text-slate-900 truncate cursor-pointer" title="${server.name}">${server.name}</span>
                </div>
                <div class="text-xs text-slate-500 truncate md:mt-0.5">${server.description || ''}</div>
            </div>
            <div class="md:col-span-2 text-slate-700 text-sm mt-2 md:mt-0">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">${safeType}</span>
            </div>
            <div class="md:col-span-1 text-slate-700 text-sm mt-2 md:mt-0">
                <span class="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs">v${server.version || '1.0.0'}</span>
            </div>
            <div class="md:col-span-2 text-slate-700 text-sm mt-2 md:mt-0">${server.toolsCount ?? 0}</div>
            <div class="md:col-span-2 text-slate-700 text-sm mt-2 md:mt-0">${server.resourcesCount ?? 0}</div>
            <div class="md:col-span-1 mt-3 md:mt-0 flex items-center justify-between md:justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button class="bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="viewServer('${server.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-600 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="startRenameServer('${server.id}', '${server.name.replace(/'/g, "'")}')" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="bg-gray-100 text-gray-700 hover:bg-gray-200 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="testServer('${server.id}')" title="Test">
                    <i class="fas fa-vial"></i>
                </button>
                <button class="bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="deleteServer('${server.id}')" title="Delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `}).join('');

    serverList.innerHTML = `
        <div class="bg-white rounded-xl shadow-sm overflow-hidden">
            ${headerHtml}
            <div class="divide-y divide-slate-200 md:divide-y-0">${rowsHtml}</div>
        </div>
    `;

    const deleteAllBtn = document.getElementById('deleteAllServersBtn');
    if (deleteAllBtn && !deleteAllBtn.dataset.listenerAttached) {
        deleteAllBtn.addEventListener('click', deleteAllServers);
        deleteAllBtn.dataset.listenerAttached = 'true';
    }
}

function filterServers(servers, query, opts = {}) {
    const q = (query || '').toLowerCase();
    const version = (opts.version || '').toLowerCase();
    const typeFilter = (opts.type || '').toLowerCase();
    const minTools = Number.isFinite(Number(opts.minTools)) ? Number(opts.minTools) : null;
    const minResources = Number.isFinite(Number(opts.minResources)) ? Number(opts.minResources) : null;

    return (servers || []).filter(s => {
        // text search
        if (q) {
            const nameMatch = s.name && s.name.toLowerCase().includes(q);
            const descMatch = s.description && s.description.toLowerCase().includes(q);
            if (!nameMatch && !descMatch) return false;
        }
        // version contains
        if (version) {
            const ver = (s.version || '').toLowerCase();
            if (!ver.includes(version)) return false;
        }
        // type equals (normalized)
        if (typeFilter) {
            const derivedType = (s.type || (typeof s.description === 'string' && (s.description.match(/\(([^)]+)\)/)?.[1] || '')) || '').toLowerCase();
            if (derivedType !== typeFilter) return false;
        }
        // min tools
        if (minTools !== null) {
            const t = Number(s.toolsCount || 0);
            if (t < minTools) return false;
        }
        // min resources
        if (minResources !== null) {
            const r = Number(s.resourcesCount || 0);
            if (r < minResources) return false;
        }
        return true;
    });
}

function updateServerSearchCount(visible, total) {
    const el = document.getElementById('serverSearchCount');
    if (!el) return;
    if (total === 0) {
        el.textContent = '';
    } else {
        el.textContent = `${visible} / ${total}`;
    }
}

function sortServers(servers, sortKey) {
    const arr = [...(servers || [])];
    switch (sortKey) {
        case 'name-desc':
            return arr.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
        case 'tools-desc':
            return arr.sort((a, b) => (b.toolsCount || 0) - (a.toolsCount || 0));
        case 'tools-asc':
            return arr.sort((a, b) => (a.toolsCount || 0) - (b.toolsCount || 0));
        case 'resources-desc':
            return arr.sort((a, b) => (b.resourcesCount || 0) - (a.resourcesCount || 0));
        case 'resources-asc':
            return arr.sort((a, b) => (a.resourcesCount || 0) - (b.resourcesCount || 0));
        case 'name-asc':
        default:
            return arr.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
}

function applyServerFilters() {
    const query = document.getElementById('serverSearch')?.value || '';
    const version = document.getElementById('serverVersionFilter')?.value || '';
    const type = document.getElementById('serverTypeFilter')?.value || '';
    const minTools = document.getElementById('minToolsFilter')?.value;
    const minResources = document.getElementById('minResourcesFilter')?.value;
    const sortKey = document.getElementById('serverSortSelect')?.value || 'name-asc';

    const filtered = filterServers(allServers, query, { version, type, minTools, minResources });
    const sorted = sortServers(filtered, sortKey);
    displayServers(sorted);
    updateServerSearchCount(sorted.length, allServers.length);
}

function debounce(fn, delay = 200) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), delay);
    };
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
            // Preselect if requested via query or storage
            try {
                const params = new URLSearchParams(window.location.search);
                const q = params.get('select');
                const stored = localStorage.getItem('prefTestServerId');
                const toSelect = q || stored;
                const toolParam = params.get('tool') || localStorage.getItem('prefTestToolName');
                if (toSelect) {
                    select.value = toSelect;
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

// Handle test type change - switch between input and dropdown for test name
function handleTestTypeChange() {
    const testType = document.getElementById('testType')?.value;
    const container = document.getElementById('testNameContainer');
    const serverId = document.getElementById('testServerSelect')?.value;
    
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
    const serverId = document.getElementById('testServerSelect')?.value;
    
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
        console.error('Failed to load tools:', error);
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
        console.error('Error generating parameter example:', error);
        paramsTextarea.value = '{}';
    }
}

// Test functions
async function runAutoTests(runAll = false) {
    const serverId = document.getElementById('testServerSelect')?.value;
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
    
    // Update button states
    const quickBtn = document.getElementById('runQuickTestBtn');
    const fullBtn = document.getElementById('runFullTestBtn');
    const fullBtnIcon = document.getElementById('fullTestIcon');
    const fullBtnText = document.getElementById('fullTestText');
    
    if (runAll) {
        // Show loading spinner in button
        if (fullBtnIcon) fullBtnIcon.className = 'fas fa-spinner fa-spin mr-2';
        if (fullBtnText) fullBtnText.textContent = 'Testing All Tools...';
        if (fullBtn) fullBtn.disabled = true;
        if (quickBtn) quickBtn.disabled = true;
        if (loadingText) loadingText.textContent = 'Running all tests... This may take a while.';
    } else {
        if (quickBtn) quickBtn.disabled = true;
        if (fullBtn) fullBtn.disabled = true;
        if (loadingText) loadingText.textContent = 'Running quick tests...';
    }

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
        
        // Reset button states
        if (quickBtn) quickBtn.disabled = false;
        if (fullBtn) {
            fullBtn.disabled = false;
            if (fullBtnIcon) fullBtnIcon.className = 'fas fa-play-circle mr-2';
            if (fullBtnText) fullBtnText.textContent = 'Run Auto Tests';
        }
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

// Server management functions
async function viewServer(serverId) {
    console.log('🔍 viewServer called with serverId:', serverId);
    
    // If overlay drawer exists (Manage page), open it immediately with loading state
    const overlayPanel = document.getElementById('server-details-panel');
    if (overlayPanel) {
        overlayPanel.innerHTML = `
            <div class="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25">
                        <i class="fas fa-wrench text-white"></i>
                    </div>
                    <div>
                        <h2 class="text-slate-900 font-bold tracking-tight text-lg">Server Details</h2>
                        <p class="text-slate-500 text-xs leading-none font-medium">Loading…</p>
                    </div>
                </div>
                <button onclick="closeServerDetailsPanel()" class="text-slate-400 hover:text-slate-600">
                    <i class="fas fa-times text-lg"></i>
                </button>
            </div>
            <div class="flex-1 overflow-y-auto p-6 text-slate-600 text-sm">
                <div class="flex items-center gap-2"><i class="fas fa-spinner fa-spin"></i> Fetching server details…</div>
            </div>
        `;
        console.log('🔍 Opening details overlay (loading state)');
        overlayPanel.classList.remove('hidden');
        overlayPanel.classList.remove('translate-x-full');
        overlayPanel.style.transform = 'translateX(0)';
        overlayPanel.style.display = 'flex';
    }

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
            // Prefer right-side panel if available; otherwise fall back to modal
            if (document.getElementById('server-details-panel')) {
                showServerDetailsPanel(result.data, serverId);
            } else {
                showServerDetailsModal(result.data);
            }
        } else {
            console.error('❌ Failed to load server details:', result.error);
            if (overlayPanel) {
                overlayPanel.innerHTML = `
                    <div class="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 flex items-center justify-center bg-red-500 rounded-lg shadow-lg shadow-red-500/25">
                                <i class="fas fa-exclamation-triangle text-white"></i>
                            </div>
                            <div>
                                <h2 class="text-slate-900 font-bold tracking-tight text-lg">Server Details</h2>
                                <p class="text-slate-500 text-xs leading-none font-medium">Failed to load</p>
                            </div>
                        </div>
                        <button onclick="closeServerDetailsPanel()" class="text-slate-400 hover:text-slate-600">
                            <i class="fas fa-times text-lg"></i>
                        </button>
                    </div>
                    <div class="p-6 text-sm text-red-600">${result.error || 'Unknown error'}</div>
                `;
            } else {
                alert('Failed to load server details: ' + result.error);
            }
        }
    } catch (error) {
        console.error('❌ Error loading server details:', error);
        if (overlayPanel) {
            overlayPanel.innerHTML = `
                <div class="p-4 border-b border-slate-200 bg-white flex items-center justify-between">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 flex items-center justify-center bg-red-500 rounded-lg shadow-lg shadow-red-500/25">
                            <i class="fas fa-exclamation-triangle text-white"></i>
                        </div>
                        <div>
                            <h2 class="text-slate-900 font-bold tracking-tight text-lg">Server Details</h2>
                            <p class="text-slate-500 text-xs leading-none font-medium">Error</p>
                        </div>
                    </div>
                    <button onclick="closeServerDetailsPanel()" class="text-slate-400 hover:text-slate-600">
                        <i class="fas fa-times text-lg"></i>
                    </button>
                </div>
                <div class="p-6 text-sm text-red-600">${error.message}</div>
            `;
        } else {
            alert('Error loading server details: ' + error.message);
        }
    }
}

function showServerDetailsPanel(serverData, serverIdArg) {
    const panel = document.getElementById('server-details-panel');
    if (!panel) return;
    try { localStorage.setItem('rightPanelCollapsed','false'); } catch {}
    panel.classList.remove('collapsed');

    const config = serverData?.config || {};
    const tools = config.tools || [];
    const resources = config.resources || [];
    const serverName = config.name || 'Unknown Server';
    const serverDescription = config.description || 'No description available';
    // Prefer explicit id from caller; fall back to config.name (server id == name)
    const serverId = serverIdArg || serverData.id || serverData.config?.name || 'unknown';

    const inner = `
        <div id=\"serverDetailsHeaderRow\" class=\"p-4 border-b border-slate-200 bg-white flex items-center justify-between\">\n            <div class=\"flex items-center gap-3\">\n                <button id=\"rightPanelCollapseBtn\" class=\"text-slate-400 hover:text-slate-600 mr-2 inline-flex items-center justify-center\" title=\"Collapse panel\">\n                    <i class=\"fas fa-angles-left\"></i>\n                </button>\n                <div id=\"serverDetailsHeaderMain\" class=\"flex items-center gap-3\">
                    <div class=\"w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25\">
                        <i class=\"fas fa-wrench text-white\"></i>
                    </div>
                    <div>
                        <h2 class=\"text-slate-900 font-bold tracking-tight text-lg\">Server Details</h2>
                        <p class=\"text-slate-500 text-xs leading-none font-medium\">Selected Server</p>
                    </div>
                </div>\n            </div>\n        </div>
        <div class=\"flex-1 overflow-y-auto scrollbar-modern p-6 space-y-6\">
            <div>
                <h3 class="text-xl font-bold text-slate-900">${serverName}</h3>
                <p class="text-slate-600 mt-1 text-sm">${serverDescription}</p>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="text-center rounded-lg border bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/50 p-3">
                    <div class="text-2xl font-extrabold text-blue-600 dark:text-blue-300">${tools.length}</div>
                    <div class="text-xs font-semibold uppercase tracking-wide text-blue-700/80 dark:text-blue-300/90 mt-1">Tools</div>
                </div>
                <div class="text-center rounded-lg border bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50 p-3">
                    <div class="text-2xl font-extrabold text-emerald-600 dark:text-emerald-300">${resources.length}</div>
                    <div class="text-xs font-semibold uppercase tracking-wide text-emerald-700/80 dark:text-emerald-300/90 mt-1">Resources</div>
                </div>
            </div>
            <!-- Horizontal action bar above Tools -->
            <div class="pt-1 pb-2">
                <div class="flex items-center gap-2">
                    <button title="Tools" onclick="document.getElementById('details-tools')?.scrollIntoView({behavior:'smooth', block:'start'})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm">
                        <i class="fas fa-wrench"></i>
                    </button>
                    <button title="Resources" onclick="document.getElementById('details-resources')?.scrollIntoView({behavior:'smooth', block:'start'})" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm">
                        <i class="fas fa-cubes"></i>
                    </button>
                    <button title="Test" onclick="testServer('${serverId}')" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm">
                        <i class="fas fa-vial"></i>
                    </button>
                    <button title="Delete" onclick="deleteServer('${serverId}')" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 hover:border-red-300 hover:text-red-600 shadow-sm">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div>
                <label id="details-tools" class="block text-slate-700 font-semibold text-sm mb-2">Tools <span class="ml-2 inline-flex items-center px-1.5 py-0.5 text-[11px] rounded bg-blue-50 text-blue-600 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50">${tools.length}</span></label>
                <div class="space-y-2 max-h-48 overflow-auto pr-1">
                    ${tools.length > 0 ? tools.map(tool => `
                        <div class="flex items-start justify-between gap-3 p-3 rounded-lg border bg-blue-50 border-blue-100 dark:bg-blue-900/30 dark:border-blue-800/50">
                            <div class="flex items-start gap-3 min-w-0">
                                <div class="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 dark:bg-blue-900/50 dark:text-blue-300">
                                    <i class="fas fa-wrench text-xs"></i>
                                </div>
                                <div class="min-w-0">
                                    <div class="font-medium text-slate-900 dark:text-slate-100">${tool.name || 'Unnamed Tool'}</div>
                                    <div class="text-xs text-slate-600 dark:text-slate-400">${tool.description || 'No description'}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2 flex-shrink-0">
                                <button title="Test this tool" onclick="testTool('${serverId}', '${tool.name?.replace(/['"`]/g, '') || ''}')" class="w-8 h-8 inline-flex items-center justify-center rounded-md border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-300 dark:bg-gray-900 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-gray-800">
                                    <i class="fas fa-vial"></i>
                                </button>
                            </div>
                        </div>
                    `).join('') : '<div class="card p-3 bg-orange-50 border-orange-100 text-xs text-slate-700 dark:bg-orange-900/20 dark:border-orange-800/50 dark:text-orange-300"><i class=\"fas fa-exclamation-triangle text-orange-500 dark:text-orange-400 mr-2\"></i>No tools available</div>'}
                </div>
            </div>
            <div>
                <label id="details-resources" class="block text-slate-700 font-semibold text-sm mb-2">Resources <span class="ml-2 inline-flex items-center px-1.5 py-0.5 text-[11px] rounded bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800/50">${resources.length}</span></label>
                <div class="space-y-2 max-h-48 overflow-auto pr-1">
                    ${resources.length > 0 ? resources.map(resource => `
                        <div class="flex items-start gap-3 p-3 rounded-lg border bg-emerald-50 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/50">
                            <div class="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0 dark:bg-emerald-900/50 dark:text-emerald-300">
                                <i class="fas fa-database text-xs"></i>
                            </div>
                            <div class="min-w-0">
                                <div class="font-medium text-slate-900 dark:text-slate-100">${resource.name || 'Unnamed Resource'}</div>
                                <div class="text-xs text-slate-600 dark:text-slate-400">${resource.description || 'No description'}</div>
                                <div class="text-[11px] text-slate-500 dark:text-slate-400 font-mono">${resource.uri_template || resource.uri || 'No URI'}</div>
                            </div>
                        </div>
                    `).join('') : '<div class="card p-3 bg-red-50 border-red-100 text-xs text-slate-700 dark:bg-red-900/20 dark:border-red-800/50 dark:text-red-300"><i class=\"fas fa-times-circle text-red-500 dark:text-red-400 mr-2\"></i>No resources available</div>'}
                </div>
            </div>
            <div class="pt-2 border-t border-slate-200">
                <div class="flex flex-wrap gap-2">
                    <button onclick="testServer('${serverId}')" class="bg-blue-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all duration-200">
                        <i class="fas fa-vial mr-1"></i>
                        Test
                    </button>
                    <button onclick="deleteServer('${serverId}')" class="bg-red-500 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-all duration-200">
                        <i class="fas fa-trash mr-1"></i>
                        Delete
                    </button>
                </div>
            </div>
        </div>
    `;

    panel.innerHTML = inner;
    // Inject mini icon row below header (shown only when collapsed)
    try {
        const headerRowEl = panel.querySelector('#serverDetailsHeaderRow');
        if (headerRowEl && !panel.querySelector('#rightPanelMiniRow')) {
            const miniRow = document.createElement('div');
            miniRow.id = 'rightPanelMiniRow';
            miniRow.className = 'hidden flex items-center justify-center py-2';
            miniRow.innerHTML = '<div id="serverDetailsMiniIcon" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 relative"><i class="fas fa-wrench"></i>';
            headerRowEl.insertAdjacentElement('afterend', miniRow);
        }
    } catch {}
    // Horizontal icon bar rendered above Tools; no right vertical rail
    // Bind collapse button and apply stored state
    try {
        const collapseBtn = panel.querySelector('#rightPanelCollapseBtn');
        if (collapseBtn && !collapseBtn.dataset.listenerAttached) {
            collapseBtn.addEventListener('click', () => {
                const current = localStorage.getItem('rightPanelCollapsed') === 'true';
                localStorage.setItem('rightPanelCollapsed', String(!current));
                applyRightPanelCollapsedState();
            });
            collapseBtn.dataset.listenerAttached = 'true';
        }
        applyRightPanelCollapsedState();
    } catch {}
    // Slide in overlay drawer (no blur, on top of list)
    console.log('🔍 Showing details overlay');
    panel.classList.remove('hidden');
    panel.classList.remove('translate-x-full');
    panel.style.transform = 'translateX(0)';
    panel.style.display = 'flex';
}

function closeServerDetailsPanel() {
    const panel = document.getElementById('server-details-panel');
    if (!panel) return;
    panel.classList.add('translate-x-full');
    setTimeout(() => panel.classList.add('hidden'), 300);
}

function applyRightPanelCollapsedState() {
    const panel = document.getElementById('server-details-panel');
    if (!panel) return;
    const collapsed = localStorage.getItem('rightPanelCollapsed') === 'true';
    const collapseBtn = panel.querySelector('#rightPanelCollapseBtn i');
    const headerRow = panel.querySelector('#serverDetailsHeaderRow');
    const scrollArea = panel.querySelector('.flex-1.overflow-y-auto');
    if (collapsed) {
        panel.classList.add('collapsed');
        panel.style.width = '3rem';
        // Swapped: show « when collapsed (angles-left)
        if (collapseBtn) collapseBtn.className = 'fas fa-angles-left';
        if (headerRow) headerRow.classList.add('justify-center');
        if (scrollArea) scrollArea.classList.add('hidden');
        const miniRow = panel.querySelector('#rightPanelMiniRow');
        if (miniRow) miniRow.classList.remove('hidden');
    } else {
        panel.classList.remove('collapsed');
        panel.style.width = '';
        // Swapped: show » when expanded (angles-right)
        if (collapseBtn) collapseBtn.className = 'fas fa-angles-right';
        if (headerRow) headerRow.classList.remove('justify-center');
        if (scrollArea) scrollArea.classList.remove('hidden');
        const miniRow = panel.querySelector('#rightPanelMiniRow');
        if (miniRow) miniRow.classList.add('hidden');
    }
}

// Initialize sidebar resizer and collapsed state on window load (safe after DOM ready)
window.addEventListener('load', () => {
    try { initSidebarResizer(); } catch {}
    try { applySidebarCollapsedState(); } catch {}
});

// Left sidebar resizer (drag to change width)
function initSidebarResizer() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebarResizer');
    if (!sidebar || !resizer) return;
    let startX = 0;
    let startWidth = 0;
    const min = 200; // px
    const max = 480; // px
    const onMouseMove = (e) => {
        const dx = e.clientX - startX;
        let newW = Math.min(max, Math.max(min, startWidth + dx));
        sidebar.style.width = newW + 'px';
        localStorage.setItem('sidebarWidth', String(newW));
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    };
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };
    resizer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    const saved = Number(localStorage.getItem('sidebarWidth'));
    if (saved && saved >= min && saved <= max) {
        sidebar.style.width = saved + 'px';
    }
}

function applySidebarCollapsedState() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    if (!sidebar) return;
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (collapsed) {
        sidebar.classList.add('collapsed');
        sidebar.style.width = '3rem';
        const icon = collapseBtn?.querySelector('i');
        if (icon) { icon.className = 'fas fa-angles-right'; }
    } else {
        sidebar.classList.remove('collapsed');
        const saved = Number(localStorage.getItem('sidebarWidth'));
        sidebar.style.width = saved ? saved + 'px' : '';
        const icon = collapseBtn?.querySelector('i');
        if (icon) { icon.className = 'fas fa-angles-left'; }
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
                            <button onclick="testServer('${serverData.config?.name || serverData.id || 'unknown'}')" class="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-all duration-200">
                                <i class="fas fa-vial mr-2"></i>
                                Test Server
                            </button>
                            <button onclick="deleteServer('${serverData.config?.name || serverData.id || 'unknown'}')" class="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200">
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
    // Persist requested selection and navigate to Test Servers page
    try { localStorage.setItem('prefTestServerId', serverId); } catch {}
    if (window.location.pathname !== '/test-servers') {
        window.location.href = `/test-servers?select=${encodeURIComponent(serverId)}`;
        return;
    }
    // Already on test page: set immediately
    const select = document.getElementById('testServerSelect');
    if (select) {
        select.value = serverId;
        handleTestServerChange();
    }
}

function testTool(serverId, toolName) {
    // Close any open modal
    closeServerDetailsModal();
    try {
        localStorage.setItem('prefTestServerId', serverId);
        localStorage.setItem('prefTestToolName', toolName);
    } catch {}
    if (window.location.pathname !== '/test-servers') {
        const qs = new URLSearchParams({ select: serverId, tool: toolName }).toString();
        window.location.href = `/test-servers?${qs}`;
        return;
    }
    // Already on test page
    const serverSelect = document.getElementById('testServerSelect');
    if (serverSelect) {
        serverSelect.value = serverId;
    }
    const type = document.getElementById('testType');
    if (type) type.value = 'tools/call';
    // Ensure tools dropdown loads, then select tool
    Promise.resolve(handleTestServerChange()).then(() => {
        const toolSelect = document.getElementById('testName');
        if (toolSelect) {
            toolSelect.value = toolName;
            updateParametersExample();
        }
    });
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

function showDeleteAllConfirmModal() {
    const modalHtml = `
        <div id="delete-all-confirm-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                        <i class="fas fa-trash text-2xl text-red-600"></i>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Delete All Servers</h3>
                    <p class="text-gray-600 text-center mb-6">
                        Are you sure you want to delete <strong>all MCP servers</strong>?
                        <br><br>
                        This action cannot be undone and will permanently remove all server files and configurations.
                    </p>
                    
                    <div class="flex gap-3">
                        <button onclick="closeDeleteAllConfirmModal()" class="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 transition-all duration-200">
                            Cancel
                        </button>
                        <button onclick="confirmDeleteAllServers()" class="flex-1 bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200">
                            <i class="fas fa-trash mr-2"></i>
                            Delete All
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteAllConfirmModal() {
    const modal = document.getElementById('delete-all-confirm-modal');
    if (modal) {
        modal.remove();
    }
}

function showDeleteAllLoadingModal() {
    const modalHtml = `
        <div id="delete-all-loading-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6 text-center">
                    <div class="animate-spin rounded-full h-16 w-16 border-b-2 border-red-500 mx-auto mb-4"></div>
                    <h3 class="text-lg font-semibold text-gray-900 mb-2">Deleting Servers</h3>
                    <p class="text-gray-600">Please wait while we remove all servers and their files...</p>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteAllLoadingModal() {
    const modal = document.getElementById('delete-all-loading-modal');
    if (modal) {
        modal.remove();
    }
}

function showDeleteAllSuccessModal() {
    const modalHtml = `
        <div id="delete-all-success-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center w-16 h-16 mx-auto bg-green-100 rounded-full mb-4">
                        <i class="fas fa-check text-2xl text-green-600"></i>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">All Servers Deleted</h3>
                    <p class="text-gray-600 text-center mb-6">
                        All MCP servers have been permanently removed from your system.
                    </p>
                    
                    <button onclick="closeDeleteAllSuccessModal()" class="w-full bg-green-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-600 transition-all duration-200">
                        <i class="fas fa-check mr-2"></i>
                        Continue
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeDeleteAllSuccessModal() {
    const modal = document.getElementById('delete-all-success-modal');
    if (modal) {
        modal.remove();
    }
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

async function confirmDeleteAllServers() {
    closeDeleteAllConfirmModal();
    showDeleteAllLoadingModal();

    try {
        const response = await fetch('/api/servers');
        const result = await response.json();
        const servers = Array.isArray(result.data) ? result.data : [];

        for (const server of servers) {
            await fetch(`/api/servers/${encodeURIComponent(server.id)}`, { method: 'DELETE' });
        }

        closeDeleteAllLoadingModal();
        showDeleteAllSuccessModal();

        allServers = [];
        displayServers([]);
        updateServerSearchCount(0, 0);
        loadTestServers();
    } catch (error) {
        closeDeleteAllLoadingModal();
        showDeleteErrorModal(error.message || 'Failed to delete all servers.');
        console.error('Failed to delete all servers:', error);
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

function showRenameErrorModal(errorMessage) {
    const modalHtml = `
        <div id="rename-error-modal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4">
                <div class="p-6">
                    <div class="flex items-center justify-center w-16 h-16 mx-auto bg-red-100 rounded-full mb-4">
                        <i class="fas fa-exclamation-triangle text-2xl text-red-600"></i>
                    </div>
                    
                    <h3 class="text-lg font-semibold text-gray-900 text-center mb-2">Rename Failed</h3>
                    <p class="text-gray-600 text-center mb-6">
                        ${errorMessage}
                    </p>
                    
                    <button onclick="closeRenameErrorModal()" class="w-full bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-all duration-200">
                        <i class="fas fa-times mr-2"></i>
                        Close
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function closeRenameErrorModal() {
    const modal = document.getElementById('rename-error-modal');
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

// Generic Alias Validation
let aliasCheckTimeout;
async function checkAlias(aliasType) {
    const inputId = `${aliasType}ToolAlias`;
    const validationId = `${aliasType}-alias-validation`;
    const suffix = `_${aliasType}`;

    const aliasInput = document.getElementById(inputId);
    const validationDiv = document.getElementById(validationId);
    if (!aliasInput || !validationDiv) return;

    const alias = aliasInput.value.trim();

    if (aliasCheckTimeout) {
        clearTimeout(aliasCheckTimeout);
    }

    if (!alias) {
        validationDiv.textContent = '';
        aliasInput.classList.remove('border-green-300', 'border-red-300');
        updateWizardNavigation();
        return;
    }

    const validFormat = /^[a-z0-9_]+$/.test(alias);
    if (!validFormat) {
        validationDiv.textContent = '✗ Invalid format. Use only lowercase letters, numbers, and underscores.';
        validationDiv.className = 'mt-2 text-xs text-red-600';
        aliasInput.classList.remove('border-green-300');
        aliasInput.classList.add('border-red-300');
        updateWizardNavigation();
        return;
    }

    aliasCheckTimeout = setTimeout(async () => {
        try {
            const toolName = `${alias}${suffix}`;
            const response = await fetch(`/api/check-tool-name/${encodeURIComponent(toolName)}`);
            const result = await response.json();

            if (result.success) {
                if (result.available) {
                    validationDiv.textContent = `✓ Tool name (${toolName}) is available`;
                    validationDiv.className = 'mt-2 text-xs text-green-600';
                    aliasInput.classList.remove('border-red-300');
                    aliasInput.classList.add('border-green-300');
                } else {
                    validationDiv.textContent = `✗ Tool name (${toolName}) already exists`;
                    validationDiv.className = 'mt-2 text-xs text-red-600';
                    aliasInput.classList.remove('border-green-300');
                    aliasInput.classList.add('border-red-300');
                }
            }
        } catch (error) {
            console.error('Error checking tool name:', error);
            validationDiv.textContent = 'Error checking tool name availability.';
            validationDiv.className = 'mt-2 text-xs text-red-600';
        } finally {
            updateWizardNavigation();
        }
    }, 500);
}


// Handle next to step 3 - parse data first
async function handleNextToStep3() {
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;

    if (!selectedType) {
        showError('parse-error', 'Please select a data source type');
        return;
    }

    // For web page, show info in preview and go to step 3
    if (selectedType === DataSourceType.Webpage) {
        const alias = document.getElementById('webToolAlias')?.value?.trim();
        const webUrl = document.getElementById('webUrl')?.value?.trim();
        if (!webUrl || !alias) {
            showError('web-parse-error', 'Please enter a Web Page URL and a valid Alias');
            return;
        }

        // Store the URL without parsing - parsing will happen at runtime
        currentDataSource = {
            type: DataSourceType.Webpage,
            alias: alias,
            name: webUrl,
            url: webUrl
        };
        currentParsedData = []; // Empty, will be parsed when tool is called

        console.log('📋 Web page URL saved, showing preview info:', webUrl);

        // Display info message in preview
        displayWebpagePreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For curl, show info in preview and go to step 3
    if (selectedType === DataSourceType.Curl) {
        const alias = document.getElementById('curlToolAlias')?.value?.trim();
        const curlPasteMode = document.getElementById('curlPasteMode');
        const isPasteMode = !curlPasteMode?.classList.contains('hidden');

        console.log('🔍 cURL mode - isPasteMode:', isPasteMode);

        let curlUrl, curlMethod, headers, body;

        if (isPasteMode) {
            // Parse from pasted curl command
            const curlCommand = document.getElementById('curlCommand')?.value?.trim();
            if (!curlCommand) {
                showError('parse-error', 'Please paste a cURL command');
                return;
            }

            try {
                const parsed = parseCurlCommand(curlCommand);
                curlUrl = parsed.url;
                curlMethod = parsed.method;
                headers = parsed.headers;
                body = parsed.body;

                if (!curlUrl) {
                    showError('parse-error', 'Could not extract URL from cURL command');
                    return;
                }
            } catch (e) {
                showError('parse-error', e.message || 'Failed to parse cURL command');
                return;
            }
        } else {
            // Manual mode
            const curlUrlInput = document.getElementById('curlUrl');
            curlUrl = curlUrlInput?.value?.trim();
            curlMethod = document.getElementById('curlMethod')?.value || 'GET';
            const curlHeaders = document.getElementById('curlHeaders')?.value?.trim();
            const curlBody = document.getElementById('curlBody')?.value?.trim();

            console.log('🔍 Manual mode - curlUrl input element:', curlUrlInput);
            console.log('🔍 Manual mode - curlUrl value:', curlUrl);
            console.log('🔍 Manual mode - curlMethod:', curlMethod);

            if (!curlUrl) {
                showError('parse-error', 'Please enter a request URL');
                return;
            }

            // Parse headers JSON if provided
            headers = {};
            if (curlHeaders) {
                try {
                    headers = JSON.parse(curlHeaders);
                } catch (e) {
                    showError('parse-error', 'Invalid JSON in Headers field');
                    return;
                }
            }

            // Parse body JSON if provided
            body = {};
            if (curlBody) {
                try {
                    body = JSON.parse(curlBody);
                } catch (e) {
                    showError('parse-error', 'Invalid JSON in Body field');
                    return;
                }
            }
        }

        // Store curl config without executing - execution will happen at runtime
        currentDataSource = {
            type: DataSourceType.Curl,
            alias: alias,
            name: curlUrl,
            url: curlUrl,
            method: curlMethod,
            headers: headers,
            body: body
        };
        currentParsedData = []; // Empty, will be executed when tool is called

        console.log('📋 cURL request saved, showing preview info:', currentDataSource);

        // Display info message in preview
        displayCurlPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For GitHub, show info in preview and go to step 3
    if (selectedType === DataSourceType.GitHub) {
        const githubToken = document.getElementById('githubToken')?.value?.trim();
        const githubOwner = document.getElementById('githubOwner')?.value?.trim();
        const githubRepo = document.getElementById('githubRepo')?.value?.trim();

        if (!githubToken) {
            showError('github-parse-error', 'Please enter a GitHub Token');
            return;
        }

        // Store GitHub config
        currentDataSource = {
            type: DataSourceType.GitHub,
            name: 'GitHub',
            token: githubToken,
            owner: githubOwner,
            repo: githubRepo
        };
        currentParsedData = [{
            tableName: 'github_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_repos', 'List repositories for the authenticated user'],
                ['search_repos', 'Search for repositories on GitHub'],
                ['get_repo', 'Get details of a specific repository'],
                ['list_issues', 'List issues for a repository'],
                ['create_issue', 'Create a new issue in a repository'],
                ['list_pull_requests', 'List pull requests for a repository'],
                ['get_file_contents', 'Get contents of a file from a repository'],
                ['list_commits', 'List commits for a repository'],
                ['get_user', 'Get information about a GitHub user'],
                ['create_issue_comment', 'Create a comment on an issue']
            ],
            metadata: {
                rowCount: 10,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📋 GitHub config saved, showing preview info');

        // Display GitHub preview
        displayGitHubPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For X, show info in preview and go to step 3
    if (selectedType === DataSourceType.X) {
        const xToken = document.getElementById('xToken')?.value?.trim();
        const xUsername = document.getElementById('xUsername')?.value?.trim();

        if (!xToken) {
            showError('x-parse-error', 'Please enter an X API token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.X,
            name: 'X',
            token: xToken,
            username: xUsername
        };
        currentParsedData = [{
            tableName: 'x_tools',
            headers: ['tool', 'description'],
            rows: [
                ['get_user_by_username', 'Get X user details by username'],
                ['get_user', 'Get X user details by user ID'],
                ['get_user_tweets', 'Get recent tweets from a user'],
                ['search_recent_tweets', 'Search recent tweets by query'],
                ['get_tweet', 'Get a tweet by ID'],
                ['create_tweet', 'Create a new tweet']
            ],
            metadata: {
                rowCount: 6,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        displayXPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Jira, show info in preview and go to step 3
    if (selectedType === DataSourceType.Jira) {
        const jiraHost = document.getElementById('jiraHost')?.value?.trim();
        const jiraEmail = document.getElementById('jiraEmail')?.value?.trim();
        const jiraApiToken = document.getElementById('jiraApiToken')?.value?.trim();
        const jiraProjectKey = document.getElementById('jiraProjectKey')?.value?.trim();
        const jiraApiVersion = document.getElementById('jiraApiVersion')?.value || 'v2';

        if (!jiraHost || !jiraEmail || !jiraApiToken) {
            showError('jira-parse-error', 'Please enter Jira host, email, and API token');
            return;
        }

        // Store Jira config
        currentDataSource = {
            type: DataSourceType.Jira,
            name: 'Jira',
            apiVersion: jiraApiVersion,
            host: jiraHost,
            email: jiraEmail,
            apiToken: jiraApiToken,
            projectKey: jiraProjectKey
        };
        currentParsedData = [{
            tableName: 'jira_tools',
            headers: ['tool', 'description'],
            rows: [
                ['search_issues', 'Search for issues using JQL'],
                ['get_issue', 'Get details of a specific issue'],
                ['create_issue', 'Create a new issue'],
                ['update_issue', 'Update an existing issue'],
                ['add_comment', 'Add a comment to an issue'],
                ['get_transitions', 'Get available transitions for an issue'],
                ['transition_issue', 'Transition an issue to a new status'],
                ['list_projects', 'List all projects'],
                ['get_project', 'Get details of a specific project'],
                ['get_user', 'Get information about a Jira user'],
                ['assign_issue', 'Assign an issue to a user'],
                ['get_issue_comments', 'Get comments on an issue']
            ],
            metadata: {
                rowCount: 12,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📋 Jira config saved, showing preview info');

        // Display Jira preview
        displayJiraPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Confluence, show info in preview and go to step 3
    if (selectedType === DataSourceType.Confluence) {
        const confluenceHost = document.getElementById('confluenceHost')?.value?.trim();
        const confluenceEmail = document.getElementById('confluenceEmail')?.value?.trim();
        const confluenceApiToken = document.getElementById('confluenceApiToken')?.value?.trim();
        const confluenceSpaceKey = document.getElementById('confluenceSpaceKey')?.value?.trim();

        if (!confluenceHost || !confluenceEmail || !confluenceApiToken) {
            showError('confluence-parse-error', 'Please enter Confluence host, email, and API token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Confluence,
            name: 'Confluence',
            host: confluenceHost,
            email: confluenceEmail,
            apiToken: confluenceApiToken,
            spaceKey: confluenceSpaceKey
        };
        currentParsedData = [{
            tableName: 'confluence_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_spaces', 'List Confluence spaces'],
                ['get_space', 'Get details of a space'],
                ['list_pages', 'List pages in a space'],
                ['get_page', 'Get a page by ID'],
                ['search_pages', 'Search pages using CQL'],
                ['create_page', 'Create a new page'],
                ['update_page', 'Update an existing page']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📚 Confluence config saved, showing preview info');

        displayConfluencePreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For FTP, show info in preview and go to step 3
    if (selectedType === DataSourceType.Ftp) {
        const ftpHost = document.getElementById('ftpHost')?.value?.trim();
        const ftpPort = document.getElementById('ftpPort')?.value?.trim() || '21';
        const ftpUsername = document.getElementById('ftpUsername')?.value?.trim();
        const ftpPassword = document.getElementById('ftpPassword')?.value?.trim();
        const ftpBasePath = document.getElementById('ftpBasePath')?.value?.trim() || '/';
        const ftpSecure = document.getElementById('ftpSecure')?.value === 'true';

        if (!ftpHost || !ftpUsername || !ftpPassword) {
            showError('ftp-parse-error', 'Please enter FTP host, username, and password');
            return;
        }

        // Store FTP config
        currentDataSource = {
            type: DataSourceType.Ftp,
            name: 'FTP',
            host: ftpHost,
            port: parseInt(ftpPort),
            username: ftpUsername,
            password: ftpPassword,
            basePath: ftpBasePath,
            secure: ftpSecure
        };
        currentParsedData = [{
            tableName: 'ftp_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_files', 'List files and directories in a path'],
                ['download_file', 'Download a file from FTP server'],
                ['upload_file', 'Upload a file to FTP server'],
                ['delete_file', 'Delete a file from FTP server'],
                ['create_directory', 'Create a new directory'],
                ['delete_directory', 'Delete a directory'],
                ['rename', 'Rename a file or directory'],
                ['get_file_info', 'Get information about a file']
            ],
            metadata: {
                rowCount: 8,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📁 FTP config saved, showing preview info');

        // Display FTP preview
        displayFtpPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For LocalFS, show info in preview and go to step 3
    if (selectedType === DataSourceType.LocalFS) {
        const localfsBasePath = document.getElementById('localfsBasePath')?.value?.trim();
        const localfsAllowWrite = document.getElementById('localfsAllowWrite')?.value === 'true';
        const localfsAllowDelete = document.getElementById('localfsAllowDelete')?.value === 'true';

        if (!localfsBasePath) {
            showError('localfs-parse-error', 'Please enter a base path');
            return;
        }

        // Store LocalFS config
        currentDataSource = {
            type: DataSourceType.LocalFS,
            name: 'LocalFS',
            basePath: localfsBasePath,
            allowWrite: localfsAllowWrite,
            allowDelete: localfsAllowDelete
        };

        // Calculate tool count based on permissions
        let toolCount = 4; // list_files, read_file, get_file_info, search_files (always available)
        if (localfsAllowWrite) toolCount += 4; // write_file, create_directory, rename, copy_file
        if (localfsAllowDelete) toolCount += 2; // delete_file, delete_directory

        currentParsedData = [{
            tableName: 'localfs_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_files', 'List files and directories in a path'],
                ['read_file', 'Read contents of a file'],
                ['write_file', 'Write content to a file'],
                ['delete_file', 'Delete a file'],
                ['create_directory', 'Create a new directory'],
                ['delete_directory', 'Delete a directory'],
                ['rename', 'Rename a file or directory'],
                ['get_file_info', 'Get information about a file'],
                ['search_files', 'Search for files by name pattern'],
                ['copy_file', 'Copy a file to another location']
            ],
            metadata: {
                rowCount: toolCount,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📂 LocalFS config saved, showing preview info');

        // Display LocalFS preview
        displayLocalFSPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Gmail, show info in preview and go to step 3
    if (selectedType === DataSourceType.Gmail) {
        const gmailMode = document.querySelector('input[name="gmailMode"]:checked')?.value || 'both';
        const gmailUsername = document.getElementById('gmailUsername')?.value?.trim();
        const gmailPassword = document.getElementById('gmailPassword')?.value?.trim();
        const gmailSecure = document.getElementById('gmailSecure')?.value === 'true';

        if (!gmailUsername || !gmailPassword) {
            showError('gmail-parse-error', 'Please enter username and password');
            return;
        }

        const readTools = [
            ['list_folders', 'List all email folders (INBOX, Sent, etc.)'],
            ['list_emails', 'List emails in a folder'],
            ['read_email', 'Read a specific email by UID'],
            ['search_emails', 'Search emails with criteria'],
            ['move_email', 'Move email to another folder'],
            ['delete_email', 'Delete an email'],
            ['mark_read', 'Mark email as read/unread']
        ];
        const writeTools = [
            ['send_email', 'Send a new email'],
            ['reply_email', 'Reply to an email'],
            ['forward_email', 'Forward an email']
        ];

        let toolRows = [];
        if (gmailMode === 'read') {
            toolRows = readTools;
        } else if (gmailMode === 'write') {
            toolRows = writeTools;
        } else {
            toolRows = [...readTools, ...writeTools];
        }

        currentDataSource = {
            type: DataSourceType.Email,
            name: 'Gmail',
            mode: gmailMode,
            imapHost: gmailMode !== 'write' ? 'imap.gmail.com' : null,
            imapPort: gmailMode !== 'write' ? 993 : null,
            smtpHost: gmailMode !== 'read' ? 'smtp.gmail.com' : null,
            smtpPort: gmailMode !== 'read' ? 587 : null,
            username: gmailUsername,
            password: gmailPassword,
            secure: gmailSecure
        };
        currentParsedData = [{
            tableName: 'email_tools',
            headers: ['tool', 'description'],
            rows: toolRows,
            metadata: {
                rowCount: toolRows.length,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📧 Gmail config saved, showing preview info, mode:', gmailMode);

        displayEmailPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Email, show info in preview and go to step 3
    if (selectedType === DataSourceType.Email) {
        const emailMode = document.querySelector('input[name="emailMode"]:checked')?.value || 'both';
        const emailImapHost = document.getElementById('emailImapHost')?.value?.trim();
        const emailImapPort = document.getElementById('emailImapPort')?.value?.trim() || '993';
        const emailSmtpHost = document.getElementById('emailSmtpHost')?.value?.trim();
        const emailSmtpPort = document.getElementById('emailSmtpPort')?.value?.trim() || '587';
        const emailUsername = document.getElementById('emailUsername')?.value?.trim();
        const emailPassword = document.getElementById('emailPassword')?.value?.trim();
        const emailSecure = document.getElementById('emailSecure')?.value === 'true';

        // Validate based on mode
        if (!emailUsername || !emailPassword) {
            showError('email-parse-error', 'Please enter username and password');
            return;
        }
        if ((emailMode === 'read' || emailMode === 'both') && !emailImapHost) {
            showError('email-parse-error', 'Please enter IMAP host for reading emails');
            return;
        }
        if ((emailMode === 'write' || emailMode === 'both') && !emailSmtpHost) {
            showError('email-parse-error', 'Please enter SMTP host for sending emails');
            return;
        }

        // Define tools based on mode
        const readTools = [
            ['list_folders', 'List all email folders (INBOX, Sent, etc.)'],
            ['list_emails', 'List emails in a folder'],
            ['read_email', 'Read a specific email by UID'],
            ['search_emails', 'Search emails with criteria'],
            ['move_email', 'Move email to another folder'],
            ['delete_email', 'Delete an email'],
            ['mark_read', 'Mark email as read/unread']
        ];
        const writeTools = [
            ['send_email', 'Send a new email'],
            ['reply_email', 'Reply to an email'],
            ['forward_email', 'Forward an email']
        ];

        let toolRows = [];
        if (emailMode === 'read') {
            toolRows = readTools;
        } else if (emailMode === 'write') {
            toolRows = writeTools;
        } else {
            toolRows = [...readTools, ...writeTools];
        }

        // Store Email config
        currentDataSource = {
            type: DataSourceType.Email,
            name: 'Email',
            mode: emailMode,
            imapHost: emailMode !== 'write' ? emailImapHost : null,
            imapPort: emailMode !== 'write' ? parseInt(emailImapPort) : null,
            smtpHost: emailMode !== 'read' ? emailSmtpHost : null,
            smtpPort: emailMode !== 'read' ? parseInt(emailSmtpPort) : null,
            username: emailUsername,
            password: emailPassword,
            secure: emailSecure
        };
        currentParsedData = [{
            tableName: 'email_tools',
            headers: ['tool', 'description'],
            rows: toolRows,
            metadata: {
                rowCount: toolRows.length,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('📧 Email config saved, showing preview info, mode:', emailMode);

        // Display Email preview
        displayEmailPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Slack, show info in preview and go to step 3
    if (selectedType === DataSourceType.Slack) {
        const slackBotToken = document.getElementById('slackBotToken')?.value?.trim();
        const slackDefaultChannel = document.getElementById('slackDefaultChannel')?.value?.trim();

        if (!slackBotToken) {
            showError('slack-parse-error', 'Please enter a Slack Bot Token');
            return;
        }

        // Store Slack config
        currentDataSource = {
            type: DataSourceType.Slack,
            name: 'Slack',
            botToken: slackBotToken,
            defaultChannel: slackDefaultChannel || ''
        };
        currentParsedData = [{
            tableName: 'slack_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_channels', 'List all channels in the workspace'],
                ['list_users', 'List all users in the workspace'],
                ['send_message', 'Send a message to a channel'],
                ['get_channel_history', 'Get message history from a channel'],
                ['get_user_info', 'Get information about a user'],
                ['add_reaction', 'Add an emoji reaction to a message'],
                ['upload_file', 'Upload a file to a channel'],
                ['search_messages', 'Search for messages in the workspace']
            ],
            metadata: {
                rowCount: 8,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('💬 Slack config saved, showing preview info');

        // Display Slack preview
        displaySlackPreview(currentDataSource);

        // Go to step 3 (preview)
        goToWizardStep(3);
        return;
    }

    // For Discord, show info in preview and go to step 3
    if (selectedType === DataSourceType.Discord) {
        const discordBotToken = document.getElementById('discordBotToken')?.value?.trim();
        const discordDefaultGuildId = document.getElementById('discordDefaultGuildId')?.value?.trim();
        const discordDefaultChannelId = document.getElementById('discordDefaultChannelId')?.value?.trim();

        if (!discordBotToken) {
            showError('discord-parse-error', 'Please enter a Discord Bot Token');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Discord,
            name: 'Discord',
            botToken: discordBotToken,
            defaultGuildId: discordDefaultGuildId || '',
            defaultChannelId: discordDefaultChannelId || ''
        };
        currentParsedData = [{
            tableName: 'discord_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_guilds', 'List guilds (servers) the bot has access to'],
                ['list_channels', 'List channels in a guild'],
                ['list_users', 'List members in a guild'],
                ['send_message', 'Send a message to a channel'],
                ['get_channel_history', 'Get recent messages in a channel'],
                ['get_user_info', 'Get information about a user'],
                ['add_reaction', 'Add an emoji reaction to a message']
            ],
            metadata: {
                rowCount: 7,
                columnCount: 2,
                dataTypes: { tool: 'string', description: 'string' }
            }
        }];

        console.log('💬 Discord config saved, showing preview info');

        displayDiscordPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Docker, show info in preview and go to step 3
    if (selectedType === DataSourceType.Docker) {
        const dockerPath = document.getElementById('dockerPath')?.value?.trim();
        currentDataSource = {
            type: DataSourceType.Docker,
            name: 'Docker',
            dockerPath: dockerPath || 'docker'
        };
        currentParsedData = [{
            tableName: 'docker_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_images', 'List local Docker images'],
                ['list_containers', 'List Docker containers (running and stopped)'],
                ['get_container', 'Get detailed information about a container'],
                ['start_container', 'Start a stopped container'],
                ['stop_container', 'Stop a running container'],
                ['restart_container', 'Restart a container'],
                ['remove_container', 'Remove a container'],
                ['remove_image', 'Remove a Docker image'],
                ['pull_image', 'Pull a Docker image from registry'],
                ['get_logs', 'Get recent logs from a container'],
                ['exec_in_container', 'Execute a command inside a running container']
            ],
            metadata: { rowCount: 11, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayDockerPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Kubernetes, show info in preview and go to step 3
    if (selectedType === DataSourceType.Kubernetes) {
        const kubectlPath = document.getElementById('kubectlPath')?.value?.trim();
        const kubeconfig = document.getElementById('kubeconfigPath')?.value?.trim();
        const namespace = document.getElementById('kubernetesNamespace')?.value?.trim();
        currentDataSource = {
            type: DataSourceType.Kubernetes,
            name: 'Kubernetes',
            kubectlPath: kubectlPath || 'kubectl',
            kubeconfig: kubeconfig || '',
            namespace: namespace || ''
        };
        currentParsedData = [{
            tableName: 'kubernetes_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_contexts', 'List kubeconfig contexts'],
                ['get_current_context', 'Get current kubeconfig context'],
                ['list_namespaces', 'List namespaces in the cluster'],
                ['list_pods', 'List pods in a namespace'],
                ['get_pod', 'Get a pod by name'],
                ['describe_pod', 'Describe a pod (text output)'],
                ['list_deployments', 'List deployments in a namespace'],
                ['scale_deployment', 'Scale a deployment to a replica count'],
                ['delete_pod', 'Delete a pod']
            ],
            metadata: { rowCount: 9, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayKubernetesPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For OpenShift, show info in preview and go to step 3
    if (selectedType === DataSourceType.OpenShift) {
        const ocPath = document.getElementById('ocPath')?.value?.trim();
        const kubeconfig = document.getElementById('ocKubeconfigPath')?.value?.trim();
        const namespace = document.getElementById('openshiftNamespace')?.value?.trim();

        currentDataSource = {
            type: DataSourceType.OpenShift,
            name: 'OpenShift',
            ocPath: ocPath || 'oc',
            kubeconfig: kubeconfig || '',
            namespace: namespace || ''
        };
        currentParsedData = [{
            tableName: 'openshift_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_projects', 'List projects in the cluster'],
                ['get_current_project', 'Get current project'],
                ['list_pods', 'List pods in a project'],
                ['get_pod', 'Get a pod by name'],
                ['list_deployments', 'List deployments in a project'],
                ['scale_deployment', 'Scale a deployment to a replica count'],
                ['delete_pod', 'Delete a pod']
            ],
            metadata: { rowCount: 7, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayOpenShiftPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // For Elasticsearch, show info in preview and go to step 3
    if (selectedType === DataSourceType.Elasticsearch) {
        const baseUrl = document.getElementById('esBaseUrl')?.value?.trim();
        const index = document.getElementById('esIndex')?.value?.trim();
        const apiKey = document.getElementById('esApiKey')?.value?.trim();
        const username = document.getElementById('esUsername')?.value?.trim();
        const password = document.getElementById('esPassword')?.value?.trim();

        if (!baseUrl) {
            showError('elasticsearch-parse-error', 'Please enter Elasticsearch base URL');
            return;
        }

        currentDataSource = {
            type: DataSourceType.Elasticsearch,
            name: 'Elasticsearch',
            baseUrl,
            index: index || '',
            apiKey: apiKey || '',
            username: username || '',
            password: password || ''
        };
        currentParsedData = [{
            tableName: 'elasticsearch_tools',
            headers: ['tool', 'description'],
            rows: [
                ['list_indices', 'List indices in the cluster'],
                ['get_cluster_health', 'Get cluster health'],
                ['search', 'Search documents in an index'],
                ['get_document', 'Get a document by ID'],
                ['index_document', 'Index (create/update) a document'],
                ['delete_document', 'Delete a document by ID']
            ],
            metadata: { rowCount: 6, columnCount: 2, dataTypes: { tool: 'string', description: 'string' } }
        }];

        displayElasticsearchPreview(currentDataSource);
        goToWizardStep(3);
        return;
    }

    // If we already have parsed data, just go to step 3
    if (currentParsedData) {
        goToWizardStep(3);
        return;
    }

    const loading = document.getElementById('parse-loading');
    const errorDiv = document.getElementById('parse-error');
    const nextBtn = document.getElementById('next-to-step-3');

    loading?.classList.remove('hidden');
    errorDiv?.classList.add('hidden');
    if (nextBtn) nextBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('type', selectedType);

        const dbTypes = new Set(['mssql','mysql','postgresql','sqlite','oracle','redis','hazelcast','kafka','db2']);
        if (selectedType === DataSourceType.CSV || selectedType === DataSourceType.Excel) {
            const fileInput = document.getElementById('fileInput');
            if (!fileInput?.files[0]) {
                throw new Error('Please select a file');
            }
            formData.append('file', fileInput.files[0]);
        } else if (selectedType === DataSourceType.Database || dbTypes.has(selectedType)) {
            const connection = {
                type: dbTypes.has(selectedType) ? selectedType : DataSourceType.Database,
                host: document.getElementById('dbHost')?.value,
                port: parseInt(document.getElementById('dbPort')?.value),
                database: document.getElementById('dbName')?.value,
                username: document.getElementById('dbUser')?.value,
                password: document.getElementById('dbPassword')?.value
            };
            formData.append('connection', JSON.stringify(connection));
            formData.set('type', DataSourceType.Database);
            // Güvenli olması için metin alanlarını da ekle (multer text fields)
            formData.append('dbType', connection.type || '');
            formData.append('dbHost', connection.host || '');
            formData.append('dbPort', String(connection.port || ''));
            formData.append('dbName', connection.database || '');
            formData.append('dbUser', connection.username || '');
            formData.append('dbPassword', connection.password || '');
        } else if (selectedType === DataSourceType.Rest) {
            const swaggerUrl = document.getElementById('swaggerUrl')?.value?.trim();
            if (!swaggerUrl) throw new Error('Please enter Swagger/OpenAPI URL');
            formData.append('swaggerUrl', swaggerUrl);
        } else if (selectedType === DataSourceType.Curl) {
            const curlUrl = document.getElementById('curlUrl')?.value?.trim();
            if (!curlUrl) throw new Error('Please enter a request URL');

            let headers, body;
            try {
                const headersRaw = document.getElementById('curlHeaders')?.value;
                if (headersRaw) headers = JSON.parse(headersRaw);
            } catch (e) {
                throw new Error('Headers field contains invalid JSON.');
            }
            try {
                const bodyRaw = document.getElementById('curlBody')?.value;
                if (bodyRaw) body = JSON.parse(bodyRaw);
            } catch (e) {
                throw new Error('Body field contains invalid JSON.');
            }

            const curlSetting = {
                url: curlUrl,
                method: document.getElementById('curlMethod')?.value,
                headers: headers,
                body: body,
            };
            formData.append('curlSetting', JSON.stringify(curlSetting));
        }

        const response = await fetch('/api/parse', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            currentParsedData = result.data.parsedData;
            currentDataSource = result.data.dataSource;
            if (currentDataSource.type === DataSourceType.Curl) {
                displayCurlPreview(currentDataSource.curlSetting);
            } else if (currentDataSource.type === DataSourceType.GitHub) {
                displayGitHubPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.X) {
                displayXPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Jira) {
                displayJiraPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Ftp) {
                displayFtpPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.LocalFS) {
                displayLocalFSPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Webpage) {
                displayWebpagePreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.OpenShift) {
                displayOpenShiftPreview(currentDataSource);
            } else if (currentDataSource.type === DataSourceType.Elasticsearch) {
                displayElasticsearchPreview(currentDataSource);
            } else {
                displayDataPreview(result.data.parsedData);
            }

            // Go to step 3 after successful parse
            goToWizardStep(3);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        const selectedTypeOnError = document.querySelector('input[name="dataSourceType"]:checked')?.value;
        if (selectedTypeOnError === DataSourceType.Rest) {
            showError('rest-parse-error', error.message);
        } else {
            showError('parse-error', error.message);
        }
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

    // Show/hide webpage info box in step 3
    if (stepNumber === 3) {
        const webpageInfoBox = document.getElementById('webpage-info-box');
        if (webpageInfoBox) {
            if (currentDataSource?.type === DataSourceType.Webpage) {
                webpageInfoBox.classList.remove('hidden');
            } else {
                webpageInfoBox.classList.add('hidden');
            }
        }
    }

    // Update progress indicators
    updateWizardProgress(stepNumber);

    currentWizardStep = stepNumber;

    // Enable/disable navigation based on step and data state
    updateWizardNavigation();
}

function updateWizardProgress(activeStep) {
    // Reset all step indicators
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`step-${i}-indicator`);
        const stepText = indicator?.parentElement.nextElementSibling.querySelector('p');

        if (i < activeStep) {
            // Completed step
            indicator?.classList.remove('bg-gray-300', 'text-gray-600', 'bg-blue-500', 'bg-slate-100', 'text-slate-400');
            indicator?.classList.add('bg-green-500', 'text-white');
            stepText?.classList.remove('text-gray-500', 'text-blue-600', 'text-slate-400');
            stepText?.classList.add('text-green-600');
        } else if (i === activeStep) {
            // Current step
            indicator?.classList.remove('bg-gray-300', 'text-gray-600', 'bg-green-500', 'bg-slate-100', 'text-slate-400');
            indicator?.classList.add('bg-blue-500', 'text-white');
            stepText?.classList.remove('text-gray-500', 'text-green-600', 'text-slate-400');
            stepText?.classList.add('text-blue-600');
        } else {
            // Future step
            indicator?.classList.remove('bg-blue-500', 'bg-green-500', 'text-white');
            indicator?.classList.add('bg-slate-100', 'text-slate-400');
            stepText?.classList.remove('text-blue-600', 'text-green-600');
            stepText?.classList.add('text-slate-400');
        }
    }

    // Update progress bars
    const progress12 = document.getElementById('progress-1-2');
    const progress23 = document.getElementById('progress-2-3');
    const progress34 = document.getElementById('progress-3-4');

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

    if (activeStep >= 4) {
        progress34?.classList.remove('bg-gray-200');
        progress34?.classList.add('bg-green-500');
    } else {
        progress34?.classList.remove('bg-green-500');
        progress34?.classList.add('bg-gray-200');
    }
}

function updateWizardNavigation() {
    const nextToStep2 = document.getElementById('next-to-step-2');
    const nextToStep3 = document.getElementById('next-to-step-3');
    const nextToStep4 = document.getElementById('next-to-step-4');

    const hasDataSource = document.querySelector('input[name="dataSourceType"]:checked');
    const selectedType = hasDataSource?.value;

    if (nextToStep2) {
        nextToStep2.disabled = !hasDataSource;
    }

    let canProceed = false;
    const dbTypes = new Set(['mssql','mysql','postgresql','sqlite']);
    if (selectedType === DataSourceType.CSV || selectedType === DataSourceType.Excel) {
        const fileInput = document.getElementById('fileInput');
        canProceed = !!fileInput?.files?.length;
    } else if (selectedType === DataSourceType.Database || dbTypes.has(selectedType)) {
        const dbType = dbTypes.has(selectedType) ? selectedType : DataSourceType.Database;
        const dbHost = document.getElementById('dbHost')?.value;
        const dbName = document.getElementById('dbName')?.value;
        const dbUser = document.getElementById('dbUser')?.value;
        const dbPassword = document.getElementById('dbPassword')?.value;
        canProceed = dbType && dbHost && dbName && dbUser && dbPassword;
    } else if (selectedType === DataSourceType.Rest) {
        const swaggerUrl = document.getElementById('swaggerUrl')?.value?.trim();
        canProceed = !!swaggerUrl;
    } else if (selectedType === DataSourceType.Webpage) {
        const aliasInput = document.getElementById('webToolAlias');
        const alias = aliasInput?.value.trim();
        const validationDiv = document.getElementById('web-alias-validation');
        const isAliasValid = alias && validationDiv && validationDiv.textContent.includes('is available');
        const webUrl = document.getElementById('webUrl')?.value?.trim();
        canProceed = isAliasValid && !!webUrl;
    } else if (selectedType === DataSourceType.Curl) {
        const aliasInput = document.getElementById('curlToolAlias');
        const alias = aliasInput?.value.trim();
        const validationDiv = document.getElementById('curl-alias-validation');
        const isAliasValid = alias && validationDiv && validationDiv.textContent.includes('is available');

        const curlPasteMode = document.getElementById('curlPasteMode');
        const isPasteMode = !curlPasteMode?.classList.contains('hidden');
        let hasCurlInfo = false;
        if (isPasteMode) {
            const curlCommand = document.getElementById('curlCommand')?.value?.trim();
            hasCurlInfo = !!curlCommand;
        } else {
            const curlUrl = document.getElementById('curlUrl')?.value?.trim();
            hasCurlInfo = !!curlUrl;
        }

        canProceed = isAliasValid && hasCurlInfo;
    } else if (selectedType === DataSourceType.GitHub) {
        const githubToken = document.getElementById('githubToken')?.value?.trim();
        canProceed = !!githubToken;
    } else if (selectedType === DataSourceType.X) {
        const xToken = document.getElementById('xToken')?.value?.trim();
        canProceed = !!xToken;
    } else if (selectedType === DataSourceType.Jira) {
        const jiraHost = document.getElementById('jiraHost')?.value?.trim();
        const jiraEmail = document.getElementById('jiraEmail')?.value?.trim();
        const jiraApiToken = document.getElementById('jiraApiToken')?.value?.trim();
        canProceed = !!jiraHost && !!jiraEmail && !!jiraApiToken;
    } else if (selectedType === DataSourceType.Confluence) {
        const confluenceHost = document.getElementById('confluenceHost')?.value?.trim();
        const confluenceEmail = document.getElementById('confluenceEmail')?.value?.trim();
        const confluenceApiToken = document.getElementById('confluenceApiToken')?.value?.trim();
        canProceed = !!confluenceHost && !!confluenceEmail && !!confluenceApiToken;
    } else if (selectedType === DataSourceType.Ftp) {
        const ftpHost = document.getElementById('ftpHost')?.value?.trim();
        const ftpUsername = document.getElementById('ftpUsername')?.value?.trim();
        const ftpPassword = document.getElementById('ftpPassword')?.value?.trim();
        canProceed = !!ftpHost && !!ftpUsername && !!ftpPassword;
    } else if (selectedType === DataSourceType.LocalFS) {
        const localfsBasePath = document.getElementById('localfsBasePath')?.value?.trim();
        canProceed = !!localfsBasePath;
    } else if (selectedType === DataSourceType.Email) {
        const emailMode = document.querySelector('input[name="emailMode"]:checked')?.value || 'both';
        const emailImapHost = document.getElementById('emailImapHost')?.value?.trim();
        const emailSmtpHost = document.getElementById('emailSmtpHost')?.value?.trim();
        const emailUsername = document.getElementById('emailUsername')?.value?.trim();
        const emailPassword = document.getElementById('emailPassword')?.value?.trim();

        const hasCredentials = !!emailUsername && !!emailPassword;

        if (emailMode === 'read') {
            canProceed = hasCredentials && !!emailImapHost;
        } else if (emailMode === 'write') {
            canProceed = hasCredentials && !!emailSmtpHost;
        } else {
            canProceed = hasCredentials && !!emailImapHost && !!emailSmtpHost;
        }
    } else if (selectedType === DataSourceType.Gmail) {
        const gmailMode = document.querySelector('input[name="gmailMode"]:checked')?.value || 'both';
        const gmailUsername = document.getElementById('gmailUsername')?.value?.trim();
        const gmailPassword = document.getElementById('gmailPassword')?.value?.trim();
        const hasCredentials = !!gmailUsername && !!gmailPassword;

        if (gmailMode === 'read') {
            canProceed = hasCredentials;
        } else if (gmailMode === 'write') {
            canProceed = hasCredentials;
        } else {
            canProceed = hasCredentials;
        }
    } else if (selectedType === DataSourceType.Slack) {
        const slackBotToken = document.getElementById('slackBotToken')?.value?.trim();
        canProceed = !!slackBotToken;
    } else if (selectedType === DataSourceType.Discord) {
        const discordBotToken = document.getElementById('discordBotToken')?.value?.trim();
        canProceed = !!discordBotToken;
    } else if (selectedType === DataSourceType.Docker) {
        canProceed = true;
    } else if (selectedType === DataSourceType.Kubernetes) {
        canProceed = true;
    } else if (selectedType === DataSourceType.OpenShift) {
        canProceed = true;
    } else if (selectedType === DataSourceType.Elasticsearch) {
        const baseUrl = document.getElementById('esBaseUrl')?.value?.trim();
        canProceed = !!baseUrl;
    }

    if (nextToStep3) {
        nextToStep3.disabled = !hasDataSource || !canProceed;
    }

    if (nextToStep4) {
        nextToStep4.disabled = currentParsedData === null;
    }
}

// Toggle data source fields (updated to enable navigation)
function toggleDataSourceFields() {
    const selectedType = document.querySelector('input[name="dataSourceType"]:checked')?.value;
    const fileSection = document.getElementById('file-upload-section');
    const dbSection = document.getElementById('database-section');
    const restSection = document.getElementById('rest-section');
    const webSection = document.getElementById('web-section');
    const curlSection = document.getElementById('curl-section');
    const githubSection = document.getElementById('github-section');
    const xSection = document.getElementById('x-section');
    const jiraSection = document.getElementById('jira-section');
    const confluenceSection = document.getElementById('confluence-section');
    const ftpSection = document.getElementById('ftp-section');
    const localfsSection = document.getElementById('localfs-section');
    const emailSection = document.getElementById('email-section');
    const gmailSection = document.getElementById('gmail-section');
    const slackSection = document.getElementById('slack-section');
    const discordSection = document.getElementById('discord-section');
    const dockerSection = document.getElementById('docker-section');
    const kubernetesSection = document.getElementById('kubernetes-section');
    const openshiftSection = document.getElementById('openshift-section');
    const elasticsearchSection = document.getElementById('elasticsearch-section');

    // Hide all sections first
    fileSection?.classList.add('hidden');
    dbSection?.classList.add('hidden');
    restSection?.classList.add('hidden');
    webSection?.classList.add('hidden');
    curlSection?.classList.add('hidden');
    githubSection?.classList.add('hidden');
    xSection?.classList.add('hidden');
    jiraSection?.classList.add('hidden');
    confluenceSection?.classList.add('hidden');
    ftpSection?.classList.add('hidden');
    localfsSection?.classList.add('hidden');
    emailSection?.classList.add('hidden');
    gmailSection?.classList.add('hidden');
    slackSection?.classList.add('hidden');
    discordSection?.classList.add('hidden');
    dockerSection?.classList.add('hidden');
    kubernetesSection?.classList.add('hidden');
    openshiftSection?.classList.add('hidden');
    elasticsearchSection?.classList.add('hidden');

    const dbTypes = new Set(['mssql','mysql','postgresql','sqlite','oracle','redis','hazelcast','kafka','db2']);
    if (selectedType === DataSourceType.CSV || selectedType === DataSourceType.Excel) {
        fileSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Database || dbTypes.has(selectedType)) {
        dbSection?.classList.remove('hidden');
        updateDefaultPort();
    } else if (selectedType === DataSourceType.Rest) {
        restSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Webpage) {
        webSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Curl) {
        curlSection?.classList.remove('hidden');
        // Add listener here to be robust
        const curlUrlInput = document.getElementById('curlUrl');
        if (curlUrlInput && !curlUrlInput.dataset.listenerAttached) {
            curlUrlInput.addEventListener('input', updateWizardNavigation);
            curlUrlInput.dataset.listenerAttached = 'true';
        }

        const curlCommandInput = document.getElementById('curlCommand');
        if (curlCommandInput && !curlCommandInput.dataset.listenerAttached) {
            curlCommandInput.addEventListener('input', updateWizardNavigation);
            curlCommandInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.GitHub) {
        githubSection?.classList.remove('hidden');
        // Add listener for GitHub token input
        const githubTokenInput = document.getElementById('githubToken');
        if (githubTokenInput && !githubTokenInput.dataset.listenerAttached) {
            githubTokenInput.addEventListener('input', updateWizardNavigation);
            githubTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.X) {
        xSection?.classList.remove('hidden');
        const xTokenInput = document.getElementById('xToken');
        if (xTokenInput && !xTokenInput.dataset.listenerAttached) {
            xTokenInput.addEventListener('input', updateWizardNavigation);
            xTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Jira) {
        jiraSection?.classList.remove('hidden');
        // Add listeners for Jira inputs
        const jiraHostInput = document.getElementById('jiraHost');
        const jiraEmailInput = document.getElementById('jiraEmail');
        const jiraApiTokenInput = document.getElementById('jiraApiToken');
        if (jiraHostInput && !jiraHostInput.dataset.listenerAttached) {
            jiraHostInput.addEventListener('input', updateWizardNavigation);
            jiraHostInput.dataset.listenerAttached = 'true';
        }
        if (jiraEmailInput && !jiraEmailInput.dataset.listenerAttached) {
            jiraEmailInput.addEventListener('input', updateWizardNavigation);
            jiraEmailInput.dataset.listenerAttached = 'true';
        }
        if (jiraApiTokenInput && !jiraApiTokenInput.dataset.listenerAttached) {
            jiraApiTokenInput.addEventListener('input', updateWizardNavigation);
            jiraApiTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Confluence) {
        confluenceSection?.classList.remove('hidden');
        const confluenceHostInput = document.getElementById('confluenceHost');
        const confluenceEmailInput = document.getElementById('confluenceEmail');
        const confluenceApiTokenInput = document.getElementById('confluenceApiToken');
        if (confluenceHostInput && !confluenceHostInput.dataset.listenerAttached) {
            confluenceHostInput.addEventListener('input', updateWizardNavigation);
            confluenceHostInput.dataset.listenerAttached = 'true';
        }
        if (confluenceEmailInput && !confluenceEmailInput.dataset.listenerAttached) {
            confluenceEmailInput.addEventListener('input', updateWizardNavigation);
            confluenceEmailInput.dataset.listenerAttached = 'true';
        }
        if (confluenceApiTokenInput && !confluenceApiTokenInput.dataset.listenerAttached) {
            confluenceApiTokenInput.addEventListener('input', updateWizardNavigation);
            confluenceApiTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Ftp) {
        ftpSection?.classList.remove('hidden');
        // Add listeners for FTP inputs
        const ftpHostInput = document.getElementById('ftpHost');
        const ftpUsernameInput = document.getElementById('ftpUsername');
        const ftpPasswordInput = document.getElementById('ftpPassword');
        if (ftpHostInput && !ftpHostInput.dataset.listenerAttached) {
            ftpHostInput.addEventListener('input', updateWizardNavigation);
            ftpHostInput.dataset.listenerAttached = 'true';
        }
        if (ftpUsernameInput && !ftpUsernameInput.dataset.listenerAttached) {
            ftpUsernameInput.addEventListener('input', updateWizardNavigation);
            ftpUsernameInput.dataset.listenerAttached = 'true';
        }
        if (ftpPasswordInput && !ftpPasswordInput.dataset.listenerAttached) {
            ftpPasswordInput.addEventListener('input', updateWizardNavigation);
            ftpPasswordInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.LocalFS) {
        localfsSection?.classList.remove('hidden');
        // Add listener for LocalFS base path input
        const localfsBasePathInput = document.getElementById('localfsBasePath');
        if (localfsBasePathInput && !localfsBasePathInput.dataset.listenerAttached) {
            localfsBasePathInput.addEventListener('input', updateWizardNavigation);
            localfsBasePathInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Email) {
        emailSection?.classList.remove('hidden');
        // Add listeners for Email mode radios
        document.querySelectorAll('input[name="emailMode"]').forEach(radio => {
            if (!radio.dataset.listenerAttached) {
                radio.addEventListener('change', handleEmailModeChange);
                radio.dataset.listenerAttached = 'true';
            }
        });
        // Add listeners for Email inputs
        const emailImapHostInput = document.getElementById('emailImapHost');
        const emailSmtpHostInput = document.getElementById('emailSmtpHost');
        const emailUsernameInput = document.getElementById('emailUsername');
        const emailPasswordInput = document.getElementById('emailPassword');
        if (emailImapHostInput && !emailImapHostInput.dataset.listenerAttached) {
            emailImapHostInput.addEventListener('input', updateWizardNavigation);
            emailImapHostInput.dataset.listenerAttached = 'true';
        }
        if (emailSmtpHostInput && !emailSmtpHostInput.dataset.listenerAttached) {
            emailSmtpHostInput.addEventListener('input', updateWizardNavigation);
            emailSmtpHostInput.dataset.listenerAttached = 'true';
        }
        if (emailUsernameInput && !emailUsernameInput.dataset.listenerAttached) {
            emailUsernameInput.addEventListener('input', updateWizardNavigation);
            emailUsernameInput.dataset.listenerAttached = 'true';
        }
        if (emailPasswordInput && !emailPasswordInput.dataset.listenerAttached) {
            emailPasswordInput.addEventListener('input', updateWizardNavigation);
            emailPasswordInput.dataset.listenerAttached = 'true';
        }
        // Initialize email mode UI
        handleEmailModeChange();
    } else if (selectedType === DataSourceType.Gmail) {
        gmailSection?.classList.remove('hidden');
        document.querySelectorAll('input[name="gmailMode"]').forEach(radio => {
            if (!radio.dataset.listenerAttached) {
                radio.addEventListener('change', handleGmailModeChange);
                radio.dataset.listenerAttached = 'true';
            }
        });
        const gmailUsernameInput = document.getElementById('gmailUsername');
        const gmailPasswordInput = document.getElementById('gmailPassword');
        if (gmailUsernameInput && !gmailUsernameInput.dataset.listenerAttached) {
            gmailUsernameInput.addEventListener('input', updateWizardNavigation);
            gmailUsernameInput.dataset.listenerAttached = 'true';
        }
        if (gmailPasswordInput && !gmailPasswordInput.dataset.listenerAttached) {
            gmailPasswordInput.addEventListener('input', updateWizardNavigation);
            gmailPasswordInput.dataset.listenerAttached = 'true';
        }
        handleGmailModeChange();
    } else if (selectedType === DataSourceType.Slack) {
        slackSection?.classList.remove('hidden');
        // Add listener for Slack bot token input
        const slackBotTokenInput = document.getElementById('slackBotToken');
        if (slackBotTokenInput && !slackBotTokenInput.dataset.listenerAttached) {
            slackBotTokenInput.addEventListener('input', updateWizardNavigation);
            slackBotTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Discord) {
        discordSection?.classList.remove('hidden');
        const discordTokenInput = document.getElementById('discordBotToken');
        if (discordTokenInput && !discordTokenInput.dataset.listenerAttached) {
            discordTokenInput.addEventListener('input', updateWizardNavigation);
            discordTokenInput.dataset.listenerAttached = 'true';
        }
    } else if (selectedType === DataSourceType.Docker) {
        dockerSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Kubernetes) {
        kubernetesSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.OpenShift) {
        openshiftSection?.classList.remove('hidden');
    } else if (selectedType === DataSourceType.Elasticsearch) {
        elasticsearchSection?.classList.remove('hidden');
        const esBaseUrlInput = document.getElementById('esBaseUrl');
        if (esBaseUrlInput && !esBaseUrlInput.dataset.listenerAttached) {
            esBaseUrlInput.addEventListener('input', updateWizardNavigation);
            esBaseUrlInput.dataset.listenerAttached = 'true';
        }
    }

    // Update wizard navigation state
    updateWizardNavigation();
}

// Handle email operation mode change
function handleEmailModeChange() {
    const mode = document.querySelector('input[name="emailMode"]:checked')?.value || 'both';
    const imapSection = document.getElementById('email-imap-section');
    const smtpSection = document.getElementById('email-smtp-section');
    const toolsCount = document.getElementById('email-tools-count');
    const toolsList = document.getElementById('email-tools-list');

    const readTools = ['list_folders', 'list_emails', 'read_email', 'search_emails', 'move_email', 'delete_email', 'mark_read'];
    const writeTools = ['send_email', 'reply_email', 'forward_email'];

    if (mode === 'read') {
        imapSection?.classList.remove('hidden');
        smtpSection?.classList.add('hidden');
        if (toolsCount) toolsCount.textContent = `${readTools.length} tools`;
        if (toolsList) toolsList.textContent = readTools.join(', ');
    } else if (mode === 'write') {
        imapSection?.classList.add('hidden');
        smtpSection?.classList.remove('hidden');
        if (toolsCount) toolsCount.textContent = `${writeTools.length} tools`;
        if (toolsList) toolsList.textContent = writeTools.join(', ');
    } else {
        // both
        imapSection?.classList.remove('hidden');
        smtpSection?.classList.remove('hidden');
        const allTools = [...readTools, ...writeTools];
        if (toolsCount) toolsCount.textContent = `${allTools.length} tools`;
        if (toolsList) toolsList.textContent = allTools.join(', ');
    }

    updateWizardNavigation();
}

function handleGmailModeChange() {
    const mode = document.querySelector('input[name="gmailMode"]:checked')?.value || 'both';
    const toolsCount = document.getElementById('gmail-tools-count');
    const toolsList = document.getElementById('gmail-tools-list');

    const readTools = ['list_folders', 'list_emails', 'read_email', 'search_emails', 'move_email', 'delete_email', 'mark_read'];
    const writeTools = ['send_email', 'reply_email', 'forward_email'];

    if (mode === 'read') {
        if (toolsCount) toolsCount.textContent = `${readTools.length} tools`;
        if (toolsList) toolsList.textContent = readTools.join(', ');
    } else if (mode === 'write') {
        if (toolsCount) toolsCount.textContent = `${writeTools.length} tools`;
        if (toolsList) toolsList.textContent = writeTools.join(', ');
    } else {
        const allTools = [...readTools, ...writeTools];
        if (toolsCount) toolsCount.textContent = `${allTools.length} tools`;
        if (toolsList) toolsList.textContent = allTools.join(', ');
    }

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


// Left sidebar resizer (drag to change width)
function initSidebarResizer() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebarResizer');
    if (!sidebar || !resizer) return;
    let startX = 0;
    let startWidth = 0;
    const min = 200; // px
    const max = 480; // px
    const onMouseMove = (e) => {
        const dx = e.clientX - startX;
        let newW = Math.min(max, Math.max(min, startWidth + dx));
        sidebar.style.width = newW + 'px';
        localStorage.setItem('sidebarWidth', String(newW));
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'col-resize';
    };
    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    };
    resizer.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = sidebar.getBoundingClientRect().width;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
    const saved = Number(localStorage.getItem('sidebarWidth'));
    if (saved && saved >= min && saved <= max) {
        sidebar.style.width = saved + 'px';
    }
}

function applySidebarCollapsedState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (collapsed) {
        sidebar.classList.add('collapsed');
        // Collapsed: show only menu icons (centered, colored) and the » button; hide Navigation texts
        sidebar.style.width = '4rem';
        const headerRow = document.getElementById('sidebarHeaderRow');
        const headerMain = document.getElementById('sidebarHeaderMain');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        headerMain?.classList.add('hidden');
        headerRow?.classList.remove('justify-between');
        headerRow?.classList.add('justify-center');
        const icon = collapseBtn?.querySelector('i');
        if (icon) icon.className = 'fas fa-angles-right';

        // For each nav item: center icon, hide labels, color icon; make icon container square
        sidebar.querySelectorAll('.nav-item').forEach(item => {
            item.classList.add('justify-center');
            item.classList.add('gap-0');
            item.classList.add('p-2');
            const label = item.querySelector('.flex-1');
            if (label) label.classList.add('hidden');
            const iconEl = item.querySelector('i');
            if (iconEl) iconEl.classList.add('text-blue-600');
            // container kare ve ortalı CSS üzerinden ayarlanıyor (style bloğu)
        });
        // Hide Navigation subtitles anywhere
        sidebar.querySelectorAll('h2, p').forEach(el => el.classList.add('hidden'));
    } else {
        sidebar.classList.remove('collapsed');
        // Expanded: one notch wider by default if none saved
        const saved = Number(localStorage.getItem('sidebarWidth'));
        if (saved) sidebar.style.width = saved + 'px'; else sidebar.style.width = '20rem';
        const headerRow = document.getElementById('sidebarHeaderRow');
        const headerMain = document.getElementById('sidebarHeaderMain');
        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        headerMain?.classList.remove('hidden');
        headerRow?.classList.remove('justify-center');
        headerRow?.classList.add('justify-between');
        const icon = collapseBtn?.querySelector('i');
        if (icon) icon.className = 'fas fa-angles-left';

        // Restore menu item labels and icon default color; remove square styling
        sidebar.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('justify-center');
            item.classList.remove('gap-0');
            item.classList.remove('p-2');
            const label = item.querySelector('.flex-1');
            if (label) label.classList.remove('hidden');
            const iconEl = item.querySelector('i');
            if (iconEl) iconEl.classList.remove('text-blue-600');
            // kare container sınıfları style bloğunda kontrol ediliyor
        });
        sidebar.querySelectorAll('h2, p').forEach(el => el.classList.remove('hidden'));
    }
}

// Rename server functionality
function startRenameServer(serverId, currentName) {
    console.log('Starting rename for server:', serverId, 'current name:', currentName);

    // Find the server name span element by its unique ID
    const nameSpan = document.getElementById(`server-name-${serverId}`);

    if (!nameSpan) {
        console.error('Could not find name span for server:', serverId);
        return;
    }

    // Check if already in edit mode (input exists inside span)
    if (nameSpan.querySelector('input')) {
        console.log('Already in edit mode, ignoring double click');
        return;
    }

    // Store original content
    const originalHtml = nameSpan.innerHTML;

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.className = 'px-2 py-1 border-2 border-blue-400 rounded-md text-sm font-semibold text-slate-900 focus:outline-none focus:border-blue-600 w-full';
    input.style.minWidth = '200px';

    // Flag to prevent double execution
    let isProcessing = false;

    // Replace span with input
    nameSpan.innerHTML = '';
    nameSpan.appendChild(input);
    input.focus();
    input.select();

    // Handle save on Enter
    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (isProcessing) return;
            isProcessing = true;

            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                await renameServer(serverId, newName, nameSpan, originalHtml);
            } else {
                // Restore original if no change
                nameSpan.innerHTML = originalHtml;
            }
        } else if (e.key === 'Escape') {
            // Cancel on Escape
            isProcessing = true;
            nameSpan.innerHTML = originalHtml;
        }
    });

    // Handle save on blur
    input.addEventListener('blur', async () => {
        // Small delay to allow Enter event to process first
        setTimeout(async () => {
            if (isProcessing) return;
            isProcessing = true;

            const newName = input.value.trim();
            if (newName && newName !== currentName) {
                await renameServer(serverId, newName, nameSpan, originalHtml);
            } else {
                // Restore original if no change
                nameSpan.innerHTML = originalHtml;
            }
        }, 100);
    });
}

async function renameServer(serverId, newName, nameSpan, originalHtml) {
    try {
        console.log('Renaming server:', serverId, 'to:', newName);

        // Show loading state
        nameSpan.innerHTML = '<i class="fas fa-spinner fa-spin text-blue-500"></i>';

        const response = await fetch(`/api/servers/${serverId}/rename`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newName })
        });

        console.log('Rename response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Rename response error:', errorText);
            try {
                const result = JSON.parse(errorText);
                throw new Error(result.error || `Server error: ${response.status}`);
            } catch (parseError) {
                throw new Error(`Server error: ${response.status} - ${errorText.substring(0, 100)}`);
            }
        }

        const result = await response.json();
        console.log('Rename result:', result);

        if (result.success) {
            // Update the display with new name
            nameSpan.innerHTML = `<span class="font-semibold text-slate-900 truncate" title="${result.data.name}">${result.data.name}</span>`;

            // Reload the server list to refresh all data
            loadServers();

            // Show success message briefly
            const successIcon = document.createElement('i');
            successIcon.className = 'fas fa-check-circle text-green-500 ml-2';
            nameSpan.appendChild(successIcon);
            setTimeout(() => {
                successIcon.remove();
            }, 2000);
        } else {
            throw new Error(result.error || 'Failed to rename server');
        }
    } catch (error) {
        console.error('Rename error:', error);
        // Restore original content on error
        nameSpan.innerHTML = originalHtml;

        let displayError = error.message;
        try {
            // Try to find and parse JSON in the error message
            const jsonStringMatch = error.message.match(/\{.*\}/);
            if (jsonStringMatch) {
                const parsed = JSON.parse(jsonStringMatch[0]);
                if (parsed.error) {
                    displayError = parsed.error;
                }
            }
        } catch (e) {
            // Ignore if parsing fails, just use the original message
        }

        // Show error message in a modal
        showRenameErrorModal(displayError);
    }
}

// Display webpage preview info
function displayWebpagePreview(dataSource) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { url, alias } = dataSource;
    const toolName = alias ? `${alias}_web` : 'fetch_webpage';

    const html = `
        <div class="space-y-4">
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-globe text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-indigo-900 text-lg mb-2">Web Page Server Configuration</h3>
                        <p class="text-indigo-800 mb-3">This server will fetch HTML content from the specified URL at runtime.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-indigo-200">
                            <div class="flex items-center gap-2 mb-2">
                                <i class="fas fa-link text-indigo-500"></i>
                                <span class="font-semibold text-slate-700">Target URL:</span>
                            </div>
                            <code class="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded block break-all">${url}</code>
                        </div>

                        <div class="space-y-2 text-sm text-indigo-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-indigo-500"></i>
                                <span>No preview needed - content will be fetched when the tool is called</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-indigo-500"></i>
                                <span>A <code class="text-xs bg-indigo-100 px-1 py-0.5 rounded">${toolName}</code> tool will be generated</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-indigo-500"></i>
                                <span>MCP clients (like Claude Desktop) can call this tool to get the HTML content</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayCurlPreview(curlSetting) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { url, method, headers, body, alias } = curlSetting || {};

    console.log('🔍 displayCurlPreview called with:', curlSetting);
    console.log('🔍 URL value:', url);

    const toolName = alias ? `${alias}_curl` : 'execute_curl_request';

    const html = `
        <div class="space-y-4">
            <div class="bg-sky-50 border-2 border-sky-200 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-terminal text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-sky-900 text-lg mb-2">cURL Request Configuration</h3>
                        <p class="text-sky-800 mb-3">This server will generate a single tool to execute the configured cURL request.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-sky-200">
                            <div class="flex items-center gap-2 mb-2">
                                <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-slate-100 text-slate-700">${method || 'GET'}</span>
                                <span class="font-semibold text-slate-700">Target URL:</span>
                            </div>
                            <code class="text-sm text-slate-900 bg-slate-50 px-3 py-2 rounded block break-all">${url || 'No URL specified'}</code>
                        </div>

                        ${!url ? `
                        <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-3">
                            <p class="text-xs text-red-700 font-semibold mb-2">DEBUG: URL is empty!</p>
                            <pre class="text-xs text-red-900 overflow-auto">${JSON.stringify(curlSetting, null, 2)}</pre>
                        </div>
                        ` : ''}

                        ${headers && Object.keys(headers).length > 0 ? `
                        <div class="bg-white rounded-lg p-4 mb-3 border border-sky-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Headers</label>
                            <pre class="text-xs text-slate-800 bg-slate-50 p-2 rounded font-mono">${JSON.stringify(headers, null, 2)}</pre>
                        </div>
                        ` : ''}

                        ${body && Object.keys(body).length > 0 ? `
                        <div class="bg-white rounded-lg p-4 mb-3 border border-sky-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-2">Body</label>
                            <pre class="text-xs text-slate-800 bg-slate-50 p-2 rounded font-mono">${JSON.stringify(body, null, 2)}</pre>
                        </div>
                        ` : ''}

                        <div class="space-y-2 text-sm text-sky-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-sky-500"></i>
                                <span>A tool named <code class="text-xs bg-sky-100 px-1 py-0.5 rounded">${toolName}</code> will be generated.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-sky-500"></i>
                                <span>You can override request parameters like headers or body at runtime when calling the tool.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGitHubPreview(githubConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { token, owner, repo } = githubConfig || {};

    const tools = [
        { name: 'list_repos', desc: 'List repositories for the authenticated user' },
        { name: 'search_repos', desc: 'Search for repositories on GitHub' },
        { name: 'get_repo', desc: 'Get details of a specific repository' },
        { name: 'list_issues', desc: 'List issues for a repository' },
        { name: 'create_issue', desc: 'Create a new issue in a repository' },
        { name: 'list_pull_requests', desc: 'List pull requests for a repository' },
        { name: 'get_file_contents', desc: 'Get contents of a file from a repository' },
        { name: 'list_commits', desc: 'List commits for a repository' },
        { name: 'get_user', desc: 'Get information about a GitHub user' },
        { name: 'create_issue_comment', desc: 'Create a comment on an issue' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-slate-800 text-white flex items-center justify-center flex-shrink-0">
                        <i class="fab fa-github text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">GitHub API Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with GitHub API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Token:</span>
                                    <span class="ml-2 font-mono text-slate-700">${token ? '••••••••' + token.slice(-4) : 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Owner:</span>
                                    <span class="ml-2 font-mono text-slate-700">${owner || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Repo:</span>
                                    <span class="ml-2 font-mono text-slate-700">${repo || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>All GitHub API tools will use your token for authentication.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Default owner/repo can be overridden when calling tools.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayFtpPreview(ftpConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { host, port, username, basePath, secure } = ftpConfig || {};
    const isSftp = port === 22;
    const protocolName = isSftp ? 'SFTP' : (secure ? 'FTPS' : 'FTP');

    const tools = [
        { name: 'list_files', desc: 'List files and directories in a path' },
        { name: 'download_file', desc: 'Download a file from server' },
        { name: 'upload_file', desc: 'Upload a file to server' },
        { name: 'delete_file', desc: 'Delete a file from server' },
        { name: 'create_directory', desc: 'Create a new directory' },
        { name: 'delete_directory', desc: 'Delete a directory' },
        { name: 'rename', desc: 'Rename a file or directory' },
        { name: 'get_file_info', desc: 'Get information about a file' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-folder-open text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">${protocolName} Server Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with ${protocolName === 'SFTP' ? 'an SFTP (SSH)' : 'an FTP'} server.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Host:</span>
                                    <span class="ml-2 font-mono text-slate-700">${host || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Port:</span>
                                    <span class="ml-2 font-mono text-slate-700">${port || 21}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Username:</span>
                                    <span class="ml-2 font-mono text-slate-700">${username || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Protocol:</span>
                                    <span class="ml-2 font-mono text-slate-700">${protocolName}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Base Path:</span>
                                    <span class="ml-2 font-mono text-slate-700">${basePath || '/'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>All ${protocolName} tools will use your credentials for authentication.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>File paths can be specified when calling tools.</span>
                            </div>
                            ${isSftp ? '<div class="flex items-start gap-2"><i class="fas fa-lock mt-0.5 text-blue-500"></i><span>Connection is secured via SSH.</span></div>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayLocalFSPreview(localfsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { basePath, allowWrite, allowDelete } = localfsConfig || {};

    const tools = [
        { name: 'list_files', desc: 'List files and directories', enabled: true },
        { name: 'read_file', desc: 'Read contents of a file', enabled: true },
        { name: 'write_file', desc: 'Write content to a file', enabled: allowWrite !== false },
        { name: 'delete_file', desc: 'Delete a file', enabled: allowDelete },
        { name: 'create_directory', desc: 'Create a new directory', enabled: allowWrite !== false },
        { name: 'delete_directory', desc: 'Delete a directory', enabled: allowDelete },
        { name: 'rename', desc: 'Rename a file or directory', enabled: allowWrite !== false },
        { name: 'get_file_info', desc: 'Get file information', enabled: true },
        { name: 'search_files', desc: 'Search for files by pattern', enabled: true },
        { name: 'copy_file', desc: 'Copy a file', enabled: allowWrite !== false }
    ].filter(t => t.enabled);

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-violet-500 text-white flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-hard-drive text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Local Filesystem Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to access local files and directories.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div class="col-span-2">
                                    <span class="text-slate-500">Base Path:</span>
                                    <span class="ml-2 font-mono text-slate-700">${basePath || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Write Access:</span>
                                    <span class="ml-2 font-mono ${allowWrite !== false ? 'text-green-600' : 'text-red-600'}">${allowWrite !== false ? 'Enabled' : 'Disabled'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Delete Access:</span>
                                    <span class="ml-2 font-mono ${allowDelete ? 'text-red-600' : 'text-slate-600'}">${allowDelete ? 'Enabled' : 'Disabled'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-shield-alt mt-0.5 text-blue-500"></i>
                                <span>Path traversal outside base path is blocked for security.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>All file paths will be relative to the base path.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayEmailPreview(emailConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { mode, imapHost, imapPort, smtpHost, smtpPort, username, secure } = emailConfig || {};

    const readTools = [
        { name: 'list_folders', desc: 'List all email folders (INBOX, Sent, etc.)' },
        { name: 'list_emails', desc: 'List emails in a folder' },
        { name: 'read_email', desc: 'Read a specific email by UID' },
        { name: 'search_emails', desc: 'Search emails with criteria' },
        { name: 'move_email', desc: 'Move email to another folder' },
        { name: 'delete_email', desc: 'Delete an email' },
        { name: 'mark_read', desc: 'Mark email as read/unread' }
    ];
    const writeTools = [
        { name: 'send_email', desc: 'Send a new email' },
        { name: 'reply_email', desc: 'Reply to an email' },
        { name: 'forward_email', desc: 'Forward an email' }
    ];

    let tools = [];
    let modeLabel = 'Read & Send';
    let modeIcon = 'fa-envelope';
    if (mode === 'read') {
        tools = readTools;
        modeLabel = 'Read Only (IMAP)';
        modeIcon = 'fa-inbox';
    } else if (mode === 'write') {
        tools = writeTools;
        modeLabel = 'Send Only (SMTP)';
        modeIcon = 'fa-paper-plane';
    } else {
        tools = [...readTools, ...writeTools];
    }

    const showImap = mode !== 'write';
    const showSmtp = mode !== 'read';

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-rose-500 text-white flex items-center justify-center flex-shrink-0">
                        <i class="fas ${modeIcon} text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Email Configuration - ${modeLabel}</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to ${mode === 'read' ? 'read emails' : mode === 'write' ? 'send emails' : 'read and send emails'}.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                ${showImap ? `
                                <div>
                                    <span class="text-slate-500">IMAP Server:</span>
                                    <span class="ml-2 font-mono text-slate-700">${imapHost || 'Not set'}:${imapPort || 993}</span>
                                </div>
                                ` : ''}
                                ${showSmtp ? `
                                <div>
                                    <span class="text-slate-500">SMTP Server:</span>
                                    <span class="ml-2 font-mono text-slate-700">${smtpHost || 'Not set'}:${smtpPort || 587}</span>
                                </div>
                                ` : ''}
                                <div>
                                    <span class="text-slate-500">Username:</span>
                                    <span class="ml-2 font-mono text-slate-700">${username || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Secure:</span>
                                    <span class="ml-2 font-mono ${secure !== false ? 'text-green-600' : 'text-yellow-600'}">${secure !== false ? 'TLS/SSL Enabled' : 'Plain'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            ${showImap && showSmtp ? `
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>IMAP is used for reading emails, SMTP for sending.</span>
                            </div>
                            ` : showImap ? `
                            <div class="flex items-start gap-2">
                                <i class="fas fa-inbox mt-0.5 text-blue-500"></i>
                                <span>Using IMAP for reading emails only.</span>
                            </div>
                            ` : `
                            <div class="flex items-start gap-2">
                                <i class="fas fa-paper-plane mt-0.5 text-green-500"></i>
                                <span>Using SMTP for sending emails only.</span>
                            </div>
                            `}
                            <div class="flex items-start gap-2">
                                <i class="fas fa-shield-alt mt-0.5 text-blue-500"></i>
                                <span>Credentials are stored securely in the server configuration.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>For Gmail, make sure to use an App Password.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displaySlackPreview(slackConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { botToken, defaultChannel } = slackConfig || {};
    const maskedToken = botToken ? `${botToken.substring(0, 10)}...${botToken.slice(-4)}` : 'Not set';

    const tools = [
        { name: 'list_channels', desc: 'List all channels in the workspace' },
        { name: 'list_users', desc: 'List all users in the workspace' },
        { name: 'send_message', desc: 'Send a message to a channel' },
        { name: 'get_channel_history', desc: 'Get message history from a channel' },
        { name: 'get_user_info', desc: 'Get information about a user' },
        { name: 'add_reaction', desc: 'Add an emoji reaction to a message' },
        { name: 'upload_file', desc: 'Upload a file to a channel' },
        { name: 'search_messages', desc: 'Search for messages in the workspace' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <img src="images/app/slack.png" alt="Slack" class="w-10 h-10">
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Slack Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Slack.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Bot Token:</span>
                                    <span class="ml-2 font-mono text-slate-700">${maskedToken}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Channel:</span>
                                    <span class="ml-2 font-mono text-slate-700">${defaultChannel || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Send messages, list channels, and manage your Slack workspace.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-shield-alt mt-0.5 text-blue-500"></i>
                                <span>Bot token is stored securely in the server configuration.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>Make sure your Slack app has the required OAuth scopes.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayDiscordPreview(discordConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { botToken, defaultGuildId, defaultChannelId } = discordConfig || {};
    const maskedToken = botToken ? `${botToken.substring(0, 10)}...${botToken.slice(-4)}` : 'Not set';

    const tools = [
        { name: 'list_guilds', desc: 'List guilds (servers) the bot has access to' },
        { name: 'list_channels', desc: 'List channels in a guild' },
        { name: 'list_users', desc: 'List members in a guild' },
        { name: 'send_message', desc: 'Send a message to a channel' },
        { name: 'get_channel_history', desc: 'Get recent messages in a channel' },
        { name: 'get_user_info', desc: 'Get information about a user' },
        { name: 'add_reaction', desc: 'Add an emoji reaction to a message' },
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0">
                        <img src="images/app/discord.png" alt="Discord" class="w-10 h-10">
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Discord Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Discord.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Bot Token:</span>
                                    <span class="ml-2 font-mono text-slate-700">${maskedToken}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Guild:</span>
                                    <span class="ml-2 font-mono text-slate-700">${defaultGuildId || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Channel:</span>
                                    <span class="ml-2 font-mono text-slate-700">${defaultChannelId || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>List guilds/channels/members and send messages.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-shield-alt mt-0.5 text-blue-500"></i>
                                <span>Bot token is stored securely in the server configuration.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>Enable Privileged Intents (Guild Members, Message Content) if needed.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayDockerPreview(dockerConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const dockerPath = dockerConfig?.dockerPath || 'docker';
    const tools = [
        { name: 'list_images', desc: 'List local Docker images' },
        { name: 'list_containers', desc: 'List Docker containers (running and stopped)' },
        { name: 'get_container', desc: 'Get detailed information about a container' },
        { name: 'start_container', desc: 'Start a stopped container' },
        { name: 'stop_container', desc: 'Stop a running container' },
        { name: 'restart_container', desc: 'Restart a container' },
        { name: 'remove_container', desc: 'Remove a container' },
        { name: 'remove_image', desc: 'Remove a Docker image' },
        { name: 'pull_image', desc: 'Pull a Docker image from registry' },
        { name: 'get_logs', desc: 'Get recent logs from a container' },
        { name: 'exec_in_container', desc: 'Execute a command inside a running container' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-cyan-100 text-cyan-600 flex items-center justify-center flex-shrink-0">
                        <i class="fab fa-docker text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Docker Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to manage local Docker.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Docker Path:</span>
                                    <span class="ml-2 font-mono text-slate-700">${dockerPath}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Works with Docker Desktop/Engine installed locally.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>Make sure your user can run the docker CLI.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayKubernetesPreview(kubeConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const kubectlPath = kubeConfig?.kubectlPath || 'kubectl';
    const kubeconfig = kubeConfig?.kubeconfig || 'Default';
    const namespace = kubeConfig?.namespace || 'Default';
    const tools = [
        { name: 'list_contexts', desc: 'List kubeconfig contexts' },
        { name: 'get_current_context', desc: 'Get current kubeconfig context' },
        { name: 'list_namespaces', desc: 'List namespaces in the cluster' },
        { name: 'list_pods', desc: 'List pods in a namespace' },
        { name: 'get_pod', desc: 'Get a pod by name' },
        { name: 'describe_pod', desc: 'Describe a pod (text output)' },
        { name: 'list_deployments', desc: 'List deployments in a namespace' },
        { name: 'scale_deployment', desc: 'Scale a deployment to a replica count' },
        { name: 'delete_pod', desc: 'Delete a pod' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                        <img src="images/app/kubernetes.png" alt="Kubernetes" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Kubernetes Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Kubernetes via kubectl.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">kubectl Path:</span>
                                    <span class="ml-2 font-mono text-slate-700">${kubectlPath}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Kubeconfig:</span>
                                    <span class="ml-2 font-mono text-slate-700">${kubeconfig}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Namespace:</span>
                                    <span class="ml-2 font-mono text-slate-700">${namespace}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Uses your current kubeconfig and context.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>Ensure kubectl can access the cluster.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayOpenShiftPreview(osConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const ocPath = osConfig?.ocPath || 'oc';
    const kubeconfig = osConfig?.kubeconfig || 'Default';
    const namespace = osConfig?.namespace || 'Default';
    const tools = [
        { name: 'list_projects', desc: 'List projects in the cluster' },
        { name: 'get_current_project', desc: 'Get current project' },
        { name: 'list_pods', desc: 'List pods in a project' },
        { name: 'get_pod', desc: 'Get a pod by name' },
        { name: 'list_deployments', desc: 'List deployments in a project' },
        { name: 'scale_deployment', desc: 'Scale a deployment to a replica count' },
        { name: 'delete_pod', desc: 'Delete a pod' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                        <img src="images/app/openshift.png" alt="OpenShift" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">OpenShift Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with OpenShift via oc.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">oc Path:</span>
                                    <span class="ml-2 font-mono text-slate-700">${ocPath}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Kubeconfig:</span>
                                    <span class="ml-2 font-mono text-slate-700">${kubeconfig}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Project:</span>
                                    <span class="ml-2 font-mono text-slate-700">${namespace}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Uses your current oc login/context.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>Ensure oc can access your cluster.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayElasticsearchPreview(esConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = esConfig?.baseUrl || 'Not set';
    const index = esConfig?.index || 'Not set';
    const tools = [
        { name: 'list_indices', desc: 'List indices in the cluster' },
        { name: 'get_cluster_health', desc: 'Get cluster health' },
        { name: 'search', desc: 'Search documents in an index' },
        { name: 'get_document', desc: 'Get a document by ID' },
        { name: 'index_document', desc: 'Index (create/update) a document' },
        { name: 'delete_document', desc: 'Delete a document by ID' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                        <img src="images/app/elasticsearch.png" alt="Elasticsearch" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Elasticsearch Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Elasticsearch.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Index:</span>
                                    <span class="ml-2 font-mono text-slate-700">${index}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Uses Elasticsearch REST API.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-info-circle mt-0.5 text-yellow-500"></i>
                                <span>Provide API key or username/password if required.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayXPreview(xConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const username = xConfig?.username || 'Not set';
    const tools = [
        { name: 'get_user_by_username', desc: 'Get X user details by username' },
        { name: 'get_user', desc: 'Get X user details by user ID' },
        { name: 'get_user_tweets', desc: 'Get recent tweets from a user (max_results 10-100)' },
        { name: 'search_recent_tweets', desc: 'Search recent tweets by query (max_results 10-100)' },
        { name: 'get_tweet', desc: 'Get a tweet by ID' },
        { name: 'create_tweet', desc: 'Create a new tweet' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/x.png" alt="X" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">X API Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with X API (v2).</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Default Username:</span>
                                    <span class="ml-2 font-mono text-slate-700">${username}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Uses your X API Bearer token for authentication.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayJiraPreview(jiraConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { host, email, projectKey } = jiraConfig || {};

    const tools = [
        { name: 'search_issues', desc: 'Search for issues using JQL' },
        { name: 'get_issue', desc: 'Get details of a specific issue' },
        { name: 'create_issue', desc: 'Create a new issue' },
        { name: 'update_issue', desc: 'Update an existing issue' },
        { name: 'add_comment', desc: 'Add a comment to an issue' },
        { name: 'get_transitions', desc: 'Get available transitions for an issue' },
        { name: 'transition_issue', desc: 'Transition an issue to a new status' },
        { name: 'list_projects', desc: 'List all projects' },
        { name: 'get_project', desc: 'Get details of a specific project' },
        { name: 'get_user', desc: 'Get information about a Jira user' },
        { name: 'assign_issue', desc: 'Assign an issue to a user' },
        { name: 'get_issue_comments', desc: 'Get comments on an issue' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
                        <i class="fab fa-jira text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Jira API Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Jira API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Host:</span>
                                    <span class="ml-2 font-mono text-slate-700">${host || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Email:</span>
                                    <span class="ml-2 font-mono text-slate-700">${email || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Project:</span>
                                    <span class="ml-2 font-mono text-slate-700">${projectKey || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>All Jira API tools will use your email and API token for authentication.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Default project key can be overridden when calling tools.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayConfluencePreview(confluenceConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { host, email, spaceKey } = confluenceConfig || {};

    const tools = [
        { name: 'list_spaces', desc: 'List Confluence spaces' },
        { name: 'get_space', desc: 'Get details of a space' },
        { name: 'list_pages', desc: 'List pages in a space' },
        { name: 'get_page', desc: 'Get a page by ID' },
        { name: 'search_pages', desc: 'Search pages using CQL' },
        { name: 'create_page', desc: 'Create a new page' },
        { name: 'update_page', desc: 'Update an existing page' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-book-open text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Confluence API Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Confluence API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Host:</span>
                                    <span class="ml-2 font-mono text-slate-700">${host || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Email:</span>
                                    <span class="ml-2 font-mono text-slate-700">${email || 'Not set'}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Space:</span>
                                    <span class="ml-2 font-mono text-slate-700">${spaceKey || 'Not set'}</span>
                                </div>
                            </div>
                        </div>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <label class="block text-xs font-bold text-slate-700 uppercase mb-3">Generated Tools (${tools.length})</label>
                            <div class="grid grid-cols-2 gap-2">
                                ${tools.map(t => `
                                    <div class="flex items-start gap-2 text-sm">
                                        <i class="fas fa-wrench text-slate-400 mt-0.5"></i>
                                        <div>
                                            <code class="text-xs bg-slate-100 px-1 py-0.5 rounded">${t.name}</code>
                                            <p class="text-xs text-slate-500 mt-0.5">${t.desc}</p>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <div class="space-y-2 text-sm text-slate-700">
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>All Confluence API tools will use your email and API token for authentication.</span>
                            </div>
                            <div class="flex items-start gap-2">
                                <i class="fas fa-check-circle mt-0.5 text-green-500"></i>
                                <span>Default space key can be overridden when calling tools.</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

// Directory Picker functionality
let directoryPickerCurrentPath = '~';

function initDirectoryPicker() {
    const browseBtn = document.getElementById('browseDirectoryBtn');
    const modal = document.getElementById('directoryPickerModal');
    const overlay = document.getElementById('directoryPickerOverlay');
    const closeBtn = document.getElementById('closeDirectoryPicker');
    const cancelBtn = document.getElementById('dirPickerCancel');
    const selectBtn = document.getElementById('dirPickerSelect');
    const homeBtn = document.getElementById('dirPickerHome');
    const upBtn = document.getElementById('dirPickerUp');

    if (!browseBtn || !modal) return;

    // Open modal
    browseBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        loadDirectories('~');
    });

    // Close modal
    const closeModal = () => modal.classList.add('hidden');
    overlay?.addEventListener('click', closeModal);
    closeBtn?.addEventListener('click', closeModal);
    cancelBtn?.addEventListener('click', closeModal);

    // Home button
    homeBtn?.addEventListener('click', () => loadDirectories('~'));

    // Up button
    upBtn?.addEventListener('click', () => {
        const currentPathEl = document.getElementById('dirPickerCurrentPath');
        if (currentPathEl) {
            const parentPath = currentPathEl.dataset.parent;
            if (parentPath) {
                loadDirectories(parentPath);
            }
        }
    });

    // Select button
    selectBtn?.addEventListener('click', () => {
        const selectedEl = document.getElementById('dirPickerSelected');
        const basePathInput = document.getElementById('localfsBasePath');
        if (selectedEl && basePathInput && selectedEl.textContent !== '-') {
            basePathInput.value = selectedEl.textContent;
            basePathInput.dispatchEvent(new Event('input'));
            closeModal();
        }
    });
}

async function loadDirectories(path) {
    const listEl = document.getElementById('dirPickerList');
    const currentPathEl = document.getElementById('dirPickerCurrentPath');
    const selectedEl = document.getElementById('dirPickerSelected');
    const upBtn = document.getElementById('dirPickerUp');

    if (!listEl) return;

    // Show loading
    listEl.innerHTML = '<div class="text-center py-8 text-slate-400"><i class="fas fa-spinner fa-spin text-2xl"></i><p class="mt-2">Loading...</p></div>';

    try {
        const response = await fetch('/api/directories?path=' + encodeURIComponent(path));
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load directories');
        }

        // Update current path
        if (currentPathEl) {
            currentPathEl.textContent = result.currentPath;
            currentPathEl.dataset.parent = result.parentPath || '';
        }

        // Update selected
        if (selectedEl) {
            selectedEl.textContent = result.currentPath;
        }

        // Enable/disable up button
        if (upBtn) {
            upBtn.disabled = !result.parentPath;
            upBtn.classList.toggle('opacity-50', !result.parentPath);
        }

        // Render directories
        if (result.directories.length === 0) {
            listEl.innerHTML = '<div class="text-center py-8 text-slate-400"><i class="fas fa-folder-open text-2xl"></i><p class="mt-2">No subdirectories</p></div>';
        } else {
            listEl.innerHTML = result.directories.map(dir => {
                const escapedPath = dir.path.replace(/'/g, "\\'");
                return '<button type="button" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 text-left transition-colors group" data-path="' + dir.path + '" ondblclick="loadDirectories(\'' + escapedPath + '\')" onclick="selectDirectory(\'' + escapedPath + '\')">' +
                    '<div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-200"><i class="fas fa-folder text-lg"></i></div>' +
                    '<div class="flex-1 min-w-0"><div class="font-medium text-slate-900 truncate">' + dir.name + '</div><div class="text-xs text-slate-500 truncate">' + dir.path + '</div></div>' +
                    '<i class="fas fa-chevron-right text-slate-400 group-hover:text-slate-600"></i></button>';
            }).join('');
        }

        directoryPickerCurrentPath = result.currentPath;

    } catch (error) {
        console.error('Failed to load directories:', error);
        listEl.innerHTML = '<div class="text-center py-8 text-red-500"><i class="fas fa-exclamation-circle text-2xl"></i><p class="mt-2">' + error.message + '</p><button type="button" onclick="loadDirectories(\'~\')" class="mt-3 text-sm text-blue-600 hover:underline">Go to Home</button></div>';
    }
}

function selectDirectory(path) {
    const selectedEl = document.getElementById('dirPickerSelected');
    if (selectedEl) {
        selectedEl.textContent = path;
    }
}

// Initialize directory picker when DOM is ready
document.addEventListener('DOMContentLoaded', initDirectoryPicker);
