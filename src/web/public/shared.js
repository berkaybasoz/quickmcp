// Sidebar management
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburger');

    sidebar.classList.toggle('open');
    overlay.classList.toggle('show');
    hamburger.classList.toggle('active');
}

function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburger');

    sidebar.classList.remove('open');
    overlay.classList.remove('show');
    hamburger.classList.remove('active');
}

// Load servers list
async function loadServers() {
    console.log('loadServers function called');
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();
        console.log('Servers API response:', result);

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
    console.log('displayServers called with:', servers);
    const serverList = document.getElementById('server-list');
    console.log('server-list element:', serverList);

    if (!serverList) {
        console.error('server-list element not found');
        return;
    }

    if (!servers || servers.length === 0) {
        console.log('Showing empty state for servers');
        serverList.classList.remove('has-servers');
        serverList.style.display = 'block';
        serverList.style.minHeight = '400px';
        serverList.style.width = '100%';
        const emptyStateHTML = `
            <div style="text-align: center; padding: 40px; color: #718096; min-height: 300px; width: 100%; display: block;">
                <div style="font-size: 48px; margin-bottom: 16px;">📂</div>
                <h3 style="margin-bottom: 8px; color: #2d3748;">No Servers Generated Yet</h3>
                <p style="margin-bottom: 20px;">Create your first MCP server by uploading data or connecting to a database.</p>
                <a href="/" class="btn btn-primary">
                    🚀 Generate Your First Server
                </a>
            </div>
        `;
        serverList.innerHTML = emptyStateHTML;
        console.log('Empty state HTML set');
        return;
    }

    // Has servers - use grid layout
    serverList.classList.add('has-servers');

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
                    <button class="btn btn-primary" onclick="showHowToUse('${server.id}')">How To Use</button>
                    <button class="btn btn-danger" onclick="deleteServer('${server.id}')">Delete</button>
                </div>
            </div>
        `;
    });

    serverList.innerHTML = html;
}

// Load test servers dropdown
async function loadTestServers() {
    console.log('loadTestServers function called');
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();
        console.log('Test servers API response:', result);

        const select = document.getElementById('testServerSelect');
        if (!select) {
            console.error('testServerSelect element not found');
            return;
        }

        if (result.success && result.data.length > 0) {
            select.innerHTML = '<option value="">Select a server to test</option>';
            result.data.forEach(server => {
                select.innerHTML += `<option value="${server.id}">${server.name}</option>`;
            });
        } else {
            select.innerHTML = '<option value="">No servers available - Generate a server first</option>';

            // Show empty state message
            const testContent = document.querySelector('.card-content');
            console.log('Test content element:', testContent);
            if (testContent && !document.getElementById('test-empty-state')) {
                console.log('Creating test empty state');
                testContent.innerHTML = `
                    <div id="test-empty-state" style="text-align: center; padding: 40px; color: #718096;">
                        <div style="font-size: 48px; margin-bottom: 16px;">🧪</div>
                        <h3 style="margin-bottom: 8px; color: #2d3748;">No Servers to Test</h3>
                        <p style="margin-bottom: 20px;">Create an MCP server first before testing its functionality.</p>
                        <a href="/" class="btn btn-primary">
                            🚀 Generate Your First Server
                        </a>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Failed to load test servers:', error);
        const select = document.getElementById('testServerSelect');
        if (select) {
            select.innerHTML = '<option value="">Error loading servers</option>';
        }
    }
}

// Utility functions (add more as needed)
function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.classList.add('show');
    }
}

// Initialize sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Close sidebar when overlay is clicked
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }
});