function setupManageServersEventListeners() {
    document.getElementById('openSidebar')?.addEventListener('click', openSidebar);
    document.getElementById('closeSidebar')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);

    document.querySelectorAll('.nav-item').forEach((item) => {
        item.addEventListener('click', (e) => {
            const tabName = item.getAttribute('data-tab');
            if (tabName) {
                e.preventDefault();
                switchTab(tabName);
            }
        });
    });

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
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (serverSearchInput) serverSearchInput.value = '';
            if (versionInput) versionInput.value = '';
            if (minToolsInput) minToolsInput.value = '';
            if (minResourcesInput) minResourcesInput.value = '';
            if (sortSelect) sortSelect.value = 'name-asc';
            if (typeSelect) typeSelect.value = '';
            applyServerFilters();
        });
    }

    const deleteAllBtn = document.getElementById('deleteAllServersBtn');
    if (deleteAllBtn) deleteAllBtn.addEventListener('click', deleteAllServers);
}

document.addEventListener('DOMContentLoaded', () => {
    setupManageServersEventListeners();
    setupRouting();
    handleInitialRoute();
    if (!window.renderSidebar) {
        try { applySidebarCollapsedState(); } catch {}
    }
    if (document.getElementById('server-list')) {
        initializeManageServersPage();
    }
});

window.addEventListener('load', () => {
    if (!window.renderSidebar) {
        try { initSidebarResizer(); } catch {}
        try { applySidebarCollapsedState(); } catch {}
    }
});


function getPanelToggleIconSvg() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M9 3v18"></path>
      </svg>
    `;
}

function setRightPanelCollapseIcon() {
    const iconWrap = document.getElementById('rightPanelCollapseIcon');
    if (!iconWrap) return;
    iconWrap.innerHTML = getPanelToggleIconSvg();
}

function bindRightPanelMiniExpand(panel) {
    if (!panel) return;
    const miniIcon = panel.querySelector('#serverDetailsMiniIcon');
    const miniRow = panel.querySelector('#rightPanelMiniRow');
    if (!miniIcon || miniIcon.dataset.listenerAttached === 'true') return;
    miniIcon.style.cursor = 'pointer';
    miniIcon.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        setRightPanelCollapsed(false);
    });
    miniIcon.dataset.listenerAttached = 'true';
    if (miniRow && miniRow.dataset.listenerAttached !== 'true') {
        miniRow.style.cursor = 'pointer';
        miniRow.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            setRightPanelCollapsed(false);
        });
        miniRow.dataset.listenerAttached = 'true';
    }
}

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
        <div id="serverDetailsHeaderRow" class="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-white/50 flex items-center justify-between">
            <div class="flex items-center gap-3">
                <button id="rightPanelCollapseBtn" class="text-slate-400 hover:text-slate-600 inline-flex items-center justify-center leading-none" title="Collapse panel">
                    <span id="rightPanelCollapseIcon" class="inline-flex items-center justify-center"></span>
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
            <div class="card p-4 bg-blue-50 border-blue-100 server-details-empty-hint">
                <div class="flex items-start gap-3 text-sm text-slate-700">
                    <i class="fas fa-info-circle text-blue-500 mt-0.5"></i>
                    <div>
                        <div class="font-semibold text-blue-900 mb-1">Select a server to view details</div>
                        <p>Select a server from the list and click the <i class="fas fa-eye"></i> icon. Tools, resources, and quick actions will appear here.</p>
                    </div>
                </div>
            </div>
            <div class="space-y-3">
                <div class="card p-3 bg-white border border-slate-200 rounded-xl server-details-empty-note">
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
        bindRightPanelMiniExpand(panel);
    } catch {}

    // One delegated click handler for all right-panel toggle controls
    if (!panel.dataset.toggleDelegationAttached) {
        panel.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest('#rightPanelCollapseBtn')) {
                event.preventDefault();
                event.stopPropagation();
                setRightPanelCollapsed(!isRightPanelCollapsed());
                return;
            }
            if (target.closest('#serverDetailsMiniIcon') || target.closest('#rightPanelMiniRow')) {
                event.preventDefault();
                event.stopPropagation();
                setRightPanelCollapsed(false);
            }
        });
        panel.dataset.toggleDelegationAttached = 'true';
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



function deleteAllServers() {
    showDeleteAllConfirmModal();
}

// Parse cURL command


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
        logger.error('Failed to load servers:', error);
        allServers = [];
        displayServers([]);
        updateServerSearchCount(0, 0);
    }
}

// Display servers
const SERVER_TYPE_IMAGE_BASENAMES = new Set([
    'airtable', 'applenotes', 'applereminders', 'asana', 'azureai', 'azure_openai', 'bearnotes', 'bitbucket', 'claude', 'clickup',
    'cohere', 'confluence', 'confluence2', 'curl', 'db2', 'deepseek', 'discord', 'docker', 'dockerhub', 'dropbox',
    'elasticsearch', 'facebook', 'falai', 'fireworks', 'gdrive', 'gemini', 'github', 'gitlab', 'gmail',
    'googlecalender', 'googlecalendar', 'googledocs', 'googlesheets', 'gradle', 'grafana', 'graphql', 'grok', 'groq', 'hazelcast',
    'huggingface', 'imessage', 'instagram', 'jenkins', 'jira', 'kafka', 'kubernetes', 'linear', 'linkedin', 'llama',
    'maven', 'microsoftteams', 'mistral', 'monday', 'mongodb', 'mssql', 'mysql', 'n8n', 'notion', 'npm', 'nuget',
    'obsidian', 'openai', 'openrouter', 'opensearch', 'openshift', 'oracle', 'perplexity', 'postgresql',
    'prometheus', 'reddit', 'redis', 'rss', 'signal', 'slack', 'soap', 'sqlite', 'supabase', 'telegram', 'things3',
    'threads', 'tiktok', 'together', 'trello', 'webhook', 'webpage', 'whatsappbusiness', 'x', 'youtube', 'zoom'
]);

function getServerTypeIconMeta(serverType) {
    const type = String(serverType || '').toLowerCase();
    const normalized = type;

    if (normalized === 'curl') {
        return { kind: 'image', value: 'images/app/curl_mini.png', bg: 'bg-white', text: 'text-slate-600' };
    }
    if (normalized === 'ftp') {
        return { kind: 'icon', value: 'fa-folder-open', bg: 'bg-amber-100', text: 'text-amber-700' };
    }
    if (normalized === 'email') {
        return { kind: 'icon', value: 'fa-envelope', bg: 'bg-rose-100', text: 'text-rose-700' };
    }
    if (normalized === 'csv') {
        return { kind: 'icon', value: 'fa-file-csv', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    }
    if (normalized === 'excel') {
        return { kind: 'icon', value: 'fa-file-excel', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    }
    if (normalized === 'azure_openai') {
        return { kind: 'image', value: 'images/app/azure_openai.png', bg: 'bg-white', text: 'text-slate-600' };
    }
    if (normalized === 'rest') {
        return { kind: 'icon', value: 'fa-network-wired', bg: 'bg-cyan-100', text: 'text-cyan-700' };
    }
    if (normalized && SERVER_TYPE_IMAGE_BASENAMES.has(normalized)) {
        return { kind: 'image', value: `images/app/${normalized}.png`, bg: 'bg-white', text: 'text-slate-600' };
    }
    if (normalized === 'localfs') {
        return { kind: 'icon', value: 'fa-folder-tree', bg: 'bg-amber-100', text: 'text-amber-700' };
    }
    return { kind: 'icon', value: 'fa-server', bg: 'bg-slate-100', text: 'text-slate-600' };
}

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
                    <button class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-xl shadow-blue-500/40" onclick="window.location.href='/generate'">
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
            <div class="col-span-4 pl-10">Name</div>
            <div class="col-span-2">Type</div>
            <div class="col-span-1">Version</div>
            <div class="col-span-2">Tools</div>
            <div class="col-span-2">Resources</div>
            <div class="col-span-1 text-right">Actions</div>
        </div>`;

    const rowsHtml = servers.map(server => {
        const safeType = String(server.type || '').toLowerCase() || 'unknown';
        const iconMeta = getServerTypeIconMeta(safeType);
        const iconHtml = iconMeta.kind === 'image'
            ? `<img src="${iconMeta.value}" alt="${safeType}" class="w-6 h-6 object-contain" />`
            : `<i class="fas ${iconMeta.value} text-sm"></i>`;
        return `
        <div class="group md:grid md:grid-cols-12 items-start md:items-center px-5 py-3 border-x border-b border-slate-200 odd:bg-white even:bg-slate-50/60 hover:bg-slate-50 transition-colors">
            <div class="md:col-span-4 min-w-0 pr-3">
                <div class="flex items-center gap-2 min-w-0">
                    <span class="hidden md:inline-flex w-8 h-8 rounded-lg shadow-sm ${iconMeta.bg} ${iconMeta.text} items-center justify-center">
                        ${iconHtml}
                    </span>
                    <span id="server-name-${server.id}" ondblclick="startRenameServer('${server.id}', '${server.name.replace(/'/g, "'")}')" class="font-semibold text-slate-900 truncate cursor-pointer" title="${server.name}">${server.name}</span>
                </div>
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
                <button class="server-row-action-btn server-row-action-view bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="viewServer('${server.id}')" title="View">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="server-row-action-btn server-row-action-rename bg-white border border-slate-200 hover:border-emerald-400 text-slate-700 hover:text-emerald-600 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="startRenameServer('${server.id}', '${server.name.replace(/'/g, "'")}')" title="Rename">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="server-row-action-btn server-row-action-test bg-gray-100 text-gray-700 hover:bg-gray-200 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="testServer('${server.id}')" title="Test">
                    <i class="fas fa-vial"></i>
                </button>
                <button class="server-row-action-btn server-row-action-delete bg-red-100 text-red-700 hover:bg-red-200 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors" onclick="deleteServer('${server.id}')" title="Delete">
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
            const derivedType = String(s.type || '').toLowerCase();
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


async function viewServer(serverId) {
    console.log('🔍 viewServer called with serverId:', serverId);
    
    // If overlay drawer exists (Manage page), open it immediately with loading state
    const overlayPanel = document.getElementById('server-details-panel');
    if (overlayPanel) {
        setRightPanelCollapsed(false);
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
            logger.error('❌ Failed to load server details:', result.error);
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
        logger.error('❌ Error loading server details:', error);
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

    const config = serverData?.config || {};
    const tools = config.tools || [];
    const resources = config.resources || [];
    const serverName = config.name || 'Unknown Server';
    const serverDescription = config.description || 'No description available';
    // Prefer explicit id from caller; fall back to config.name (server id == name)
    const serverId = serverIdArg || serverData.id || serverData.config?.name || 'unknown';
    const serverType = String(config?.type || '').toLowerCase() || 'unknown';
    const nameIconMeta = getServerTypeIconMeta(serverType);
    const nameIconHtml = nameIconMeta.kind === 'image'
        ? `<img src="${nameIconMeta.value}" alt="${serverType}" class="w-8 h-8 object-contain" />`
        : `<i class="fas ${nameIconMeta.value} text-lg"></i>`;

    const inner = `
        <div id=\"serverDetailsHeaderRow\" class=\"p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-white/50 flex items-center justify-between\">\n            <div class=\"flex items-center gap-3\">\n                <button id=\"rightPanelCollapseBtn\" class=\"text-slate-400 hover:text-slate-600 inline-flex items-center justify-center leading-none\" title=\"Collapse panel\">\n                    <span id=\"rightPanelCollapseIcon\" class=\"inline-flex items-center justify-center\"></span>\n                </button>\n                <div id=\"serverDetailsHeaderMain\" class=\"flex items-center gap-3\">
                    <div class=\"w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25\">
                        <i class=\"fas fa-wrench text-white\"></i>
                    </div>
                    <div>
                        <h2 class=\"text-slate-900 font-bold tracking-tight text-lg\">Server Details</h2>
                        <p class=\"text-slate-500 text-xs leading-none font-medium\">Selected Server</p>
                    </div>
                </div>\n            </div>\n        </div>
        <div class=\"flex-1 overflow-y-auto scrollbar-modern p-6 space-y-6\">
            <div class="flex items-start gap-3">
                <span class="inline-flex w-11 h-11 rounded-lg shadow-sm items-center justify-center ${nameIconMeta.bg} ${nameIconMeta.text}">
                    ${nameIconHtml}
                </span>
                <div class="min-w-0">
                    <h3 class="text-xl font-bold text-slate-900 truncate">${serverName}</h3>
                    <p class="text-slate-600 mt-1 text-sm">${serverDescription}</p>
                </div>
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
                    <button title="Tools" onclick="document.getElementById('details-tools')?.scrollIntoView({behavior:'smooth', block:'start'})" class="server-details-action-btn server-details-action-tools w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm">
                        <i class="fas fa-wrench"></i>
                    </button>
                    <button title="Resources" onclick="document.getElementById('details-resources')?.scrollIntoView({behavior:'smooth', block:'start'})" class="server-details-action-btn server-details-action-resources w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm">
                        <i class="fas fa-cubes"></i>
                    </button>
                    <button title="Test" onclick="testServer('${serverId}')" class="server-details-action-btn server-details-action-test w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-600 shadow-sm">
                        <i class="fas fa-vial"></i>
                    </button>
                    <button title="Delete" onclick="deleteServer('${serverId}')" class="server-details-action-btn server-details-action-delete w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-red-600 hover:border-red-300 hover:text-red-600 shadow-sm">
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
                                <button title="Test this tool" onclick="testTool('${serverId}', '${tool.name?.replace(/['"`]/g, '') || ''}')" class="server-tool-test-btn w-8 h-8 inline-flex items-center justify-center rounded-md border border-blue-200 text-blue-600 bg-white hover:bg-blue-50 hover:border-blue-300 dark:bg-gray-900 dark:text-blue-300 dark:border-blue-800 dark:hover:bg-gray-800">
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
            miniRow.innerHTML = '<div id="serverDetailsMiniIcon" class="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 relative"><i class="fas fa-wrench"></i></div>';
            headerRowEl.insertAdjacentElement('afterend', miniRow);
        }
        bindRightPanelMiniExpand(panel);
    } catch {}
    // Horizontal icon bar rendered above Tools; no right vertical rail
    // Toggle controls are delegated from initializeManageServersPage
    // Slide in overlay drawer (no blur, on top of list)
    console.log('🔍 Showing details overlay');
    panel.classList.remove('hidden');
    panel.classList.remove('translate-x-full');
    panel.style.transform = 'translateX(0)';
    panel.style.display = 'flex';
    setRightPanelCollapsed(false);
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
    const headerRow = panel.querySelector('#serverDetailsHeaderRow');
    const scrollArea = panel.querySelector('.flex-1.overflow-y-auto');
    setRightPanelCollapseIcon();
    if (collapsed) {
        panel.classList.add('collapsed');
        panel.style.width = '3rem';
        if (headerRow) headerRow.classList.add('justify-center');
        if (scrollArea) scrollArea.classList.add('hidden');
        const miniRow = panel.querySelector('#rightPanelMiniRow');
        if (miniRow) miniRow.classList.remove('hidden');
        const btn = panel.querySelector('#rightPanelCollapseBtn');
        if (btn) btn.setAttribute('title', 'Expand panel');
    } else {
        panel.classList.remove('collapsed');
        panel.style.width = '';
        if (headerRow) headerRow.classList.remove('justify-center');
        if (scrollArea) scrollArea.classList.remove('hidden');
        const miniRow = panel.querySelector('#rightPanelMiniRow');
        if (miniRow) miniRow.classList.add('hidden');
        const btn = panel.querySelector('#rightPanelCollapseBtn');
        if (btn) btn.setAttribute('title', 'Collapse panel');
    }
}

function isRightPanelCollapsed() {
    return localStorage.getItem('rightPanelCollapsed') === 'true';
}

function setRightPanelCollapsed(collapsed) {
    try { localStorage.setItem('rightPanelCollapsed', collapsed ? 'true' : 'false'); } catch {}
    applyRightPanelCollapsedState();
}

// Initialize sidebar resizer and collapsed state on window load (safe after DOM ready)
window.addEventListener('load', () => {
    if (!window.renderSidebar) {
        try { initSidebarResizer(); } catch {}
        try { applySidebarCollapsedState(); } catch {}
    }
});

// Left sidebar resizer (drag to change width)
function syncDesktopLayoutOffsetFromApp(sidebar) {
    if (!sidebar) return;
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    const saved = Number(localStorage.getItem('sidebarWidth'));
    const expandedWidth = (saved && saved >= 200 && saved <= 480) ? `${saved}px` : '18rem';
    const offset = collapsed ? '3rem' : expandedWidth;
    document.documentElement.style.setProperty('--sidebar-offset', offset);
    document.body?.setAttribute('data-has-sidebar', '1');
}

function initSidebarResizer() {
    if (window.renderSidebar) return;
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
        syncDesktopLayoutOffsetFromApp(sidebar);
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
    if (window.renderSidebar) return;
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
    ['autoTestServerSelect', 'customTestServerSelect', 'transportTestServerSelect', 'testServerSelect'].forEach((id) => {
        const select = document.getElementById(id);
        if (select) select.value = serverId;
    });
    handleTestServerChange();
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
    ['autoTestServerSelect', 'customTestServerSelect', 'transportTestServerSelect', 'testServerSelect'].forEach((id) => {
        const serverSelect = document.getElementById(id);
        if (serverSelect) serverSelect.value = serverId;
    });
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
        logger.error('Export failed:', error);
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
        logger.error('Delete failed:', error);
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
        logger.error('Failed to delete all servers:', error);
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

function startRenameServer(serverId, currentName) {
    console.log('Starting rename for server:', serverId, 'current name:', currentName);

    // Find the server name span element by its unique ID
    const nameSpan = document.getElementById(`server-name-${serverId}`);

    if (!nameSpan) {
        logger.error('Could not find name span for server:', serverId);
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
            logger.error('Rename response error:', errorText);
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
        logger.error('Rename error:', error);
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
