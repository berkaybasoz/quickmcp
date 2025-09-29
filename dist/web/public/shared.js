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

// Server action functions
async function viewServer(serverId) {
    try {
        // Fetch both server config and data
        const [configResponse, dataResponse] = await Promise.all([
            fetch(`/api/servers/${serverId}`),
            fetch(`/api/servers/${serverId}`)
        ]);

        const configResult = await configResponse.json();
        const dataResult = await dataResponse.json();

        if (configResult.success) {
            // Add data to the server config if available
            if (dataResult.success && dataResult.data && dataResult.data.length > 0) {
                configResult.data.actualData = dataResult.data;
            }
            showServerDetails(configResult.data);
        } else {
            alert('Failed to load server details: ' + configResult.error);
        }
    } catch (error) {
        console.error('Error viewing server:', error);
        alert('Failed to load server details');
    }
}

function showServerDetails(serverData) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>Server Details: ${serverData.config.name}</h2>
                <button class="modal-close" onclick="closeModal(this)">&times;</button>
            </div>
            <div class="modal-body">
                <div class="server-details">
                    <div class="detail-section">
                        <h3>Basic Information</h3>
                        <p><strong>Name:</strong> ${serverData.config.name}</p>
                        <p><strong>Description:</strong> ${serverData.config.description}</p>
                        <p><strong>Version:</strong> ${serverData.config.version}</p>
                    </div>

                    <div class="detail-section">
                        <h3>Tools (${serverData.config.tools.length})</h3>
                        ${serverData.config.tools.map(tool => `
                            <div class="detail-item">
                                <strong>${tool.name}</strong>
                                <p>${tool.description}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div class="detail-section">
                        <h3>Resources (${serverData.config.resources.length})</h3>
                        ${serverData.config.resources.map(resource => `
                            <div class="detail-item">
                                <strong>${resource.name}</strong>
                                <p>${resource.description}</p>
                                <small>URI: ${resource.uri}</small>
                            </div>
                        `).join('')}
                    </div>

                    <div class="detail-section">
                        <h3>Prompts (${serverData.config.prompts.length})</h3>
                        ${serverData.config.prompts.map(prompt => `
                            <div class="detail-item">
                                <strong>${prompt.name}</strong>
                                <p>${prompt.description}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div class="detail-section">
                        <h3>Data Preview</h3>
                        ${serverData.actualData && serverData.actualData.length > 0 ? `
                            <div class="data-table">
                                <h4>Sample Data</h4>
                                <p>Records: ${serverData.actualData.length}, Columns: ${Object.keys(serverData.actualData[0]).length}</p>
                                <div class="table-container">
                                    <table class="data-preview-table">
                                        <thead>
                                            <tr>
                                                ${Object.keys(serverData.actualData[0]).map(header => `<th>${header}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${serverData.actualData.slice(0, 10).map(row => `
                                                <tr>
                                                    ${Object.values(row).map(cell => `<td>${cell || ''}</td>`).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    ${serverData.actualData.length > 10 ? `<p><em>... and ${serverData.actualData.length - 10} more rows</em></p>` : ''}
                                </div>
                            </div>
                        ` : serverData.parsedData && serverData.parsedData.length > 0 ? serverData.parsedData.map((data, index) => `
                            <div class="data-table">
                                <h4>${data.tableName || `Table ${index + 1}`}</h4>
                                <p>Rows: ${data.metadata.rowCount}, Columns: ${data.metadata.columnCount}</p>
                                <div class="table-container">
                                    <table class="data-preview-table">
                                        <thead>
                                            <tr>
                                                ${data.headers.map(header => `<th>${header}</th>`).join('')}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${data.rows.slice(0, 5).map(row => `
                                                <tr>
                                                    ${row.map(cell => `<td>${cell}</td>`).join('')}
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                    ${data.rows.length > 5 ? `<p><em>... and ${data.rows.length - 5} more rows</em></p>` : ''}
                                </div>
                            </div>
                        `).join('') : '<p>No data available</p>'}
                    </div>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
}

function testServer(serverId) {
    window.location.href = `/test-servers?server=${serverId}`;
}

function exportServer(serverId) {
    window.location.href = `/api/servers/${serverId}/export`;
}

async function showHowToUse(serverId) {
    try {
        const response = await fetch(`/api/servers/${serverId}/start-runtime`, {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h2>How to Use Your MCP Server</h2>
                        <button class="modal-close" onclick="closeModal(this)">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>Your MCP server is now running on <strong>port ${result.data.port}</strong></p>
                        <p>Endpoint: <code>${result.data.endpoint}</code></p>

                        <h3>Claude Desktop Configuration</h3>
                        <p>Add this to your Claude Desktop config file:</p>
                        <pre style="background: #f7fafc; padding: 15px; border-radius: 5px; overflow-x: auto;"><code>${JSON.stringify(result.data.claudeConfig, null, 2)}</code></pre>

                        <h3>Usage Instructions</h3>
                        <ol>
                            <li>Copy the configuration above to your Claude Desktop config</li>
                            <li>Restart Claude Desktop</li>
                            <li>Your MCP server will be available as tools and resources</li>
                        </ol>

                        <p><strong>Note:</strong> Keep this application running for the MCP server to work with Claude.</p>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } else {
            alert('Failed to start runtime server: ' + result.error);
        }
    } catch (error) {
        console.error('Error starting runtime server:', error);
        alert('Failed to start runtime server');
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
            alert('Server deleted successfully');
            loadServers(); // Reload the servers list
        } else {
            alert('Failed to delete server: ' + result.error);
        }
    } catch (error) {
        console.error('Error deleting server:', error);
        alert('Failed to delete server');
    }
}

function closeModal(closeButton) {
    const modal = closeButton.closest('.modal-overlay');
    if (modal) {
        modal.remove();
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