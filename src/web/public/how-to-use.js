// Method switching functionality
function showMethod(method) {
    const integratedBtn = document.getElementById('integratedBtn');
    const individualBtn = document.getElementById('individualBtn');
    const integratedMethod = document.getElementById('integratedMethod');
    const individualMethod = document.getElementById('individualMethod');
    const serverListSection = document.getElementById('serverListSection');

    // Update button states
    integratedBtn.classList.remove('active');
    individualBtn.classList.remove('active');

    // Update content visibility
    integratedMethod.style.display = 'none';
    individualMethod.style.display = 'none';
    serverListSection.style.display = 'none';

    if (method === 'integrated') {
        integratedBtn.classList.add('active');
        integratedMethod.style.display = 'block';
        // Reset to Claude tab by default
        showIntegratedPlatform('claude');
    } else {
        individualBtn.classList.add('active');
        individualMethod.style.display = 'block';
        serverListSection.style.display = 'block';
        loadExportServerList();
        // Reset to Claude tab by default
        showIndividualPlatform('claude');
    }
}

// Platform switching for Integrated Method
function showIntegratedPlatform(platform) {
    // Update tabs
    document.getElementById('integratedClaudeTab').classList.remove('active');
    document.getElementById('integratedOpenAITab').classList.remove('active');

    // Update content
    document.getElementById('integratedClaude').style.display = 'none';
    document.getElementById('integratedOpenAI').style.display = 'none';

    if (platform === 'claude') {
        document.getElementById('integratedClaudeTab').classList.add('active');
        document.getElementById('integratedClaude').style.display = 'block';
    } else {
        document.getElementById('integratedOpenAITab').classList.add('active');
        document.getElementById('integratedOpenAI').style.display = 'block';
        // Check status for OpenAI too
        checkOpenAIServerStatus();
    }
}

// Platform switching for Individual Method
function showIndividualPlatform(platform) {
    // Update tabs
    document.getElementById('individualClaudeTab').classList.remove('active');
    document.getElementById('individualOpenAITab').classList.remove('active');

    // Update content
    document.getElementById('individualClaude').style.display = 'none';
    document.getElementById('individualOpenAI').style.display = 'none';

    if (platform === 'claude') {
        document.getElementById('individualClaudeTab').classList.add('active');
        document.getElementById('individualClaude').style.display = 'block';
    } else {
        document.getElementById('individualOpenAITab').classList.add('active');
        document.getElementById('individualOpenAI').style.display = 'block';
    }
}

// Copy configuration to clipboard
function copyConfig(type) {
    let configText;

    if (type === 'integrated') {
        configText = `{
  "mcpServers": {
    "quickmcp-integrated": {
      "command": "curl",
      "args": ["-X", "POST", "http://localhost:3001/sse/message"],
      "env": {
        "MCP_TRANSPORT": "sse"
      }
    }
  }
}`;
    } else if (type === 'openai-integrated') {
        configText = `{
  "mcpServers": {
    "quickmcp-integrated": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-sse-client",
        "http://localhost:3001/sse/message"
      ]
    }
  }
}`;
    } else if (type === 'claude-individual') {
        configText = `{
  "mcpServers": {
    "your-server-name": {
      "command": "node",
      "args": ["path/to/your/server/index.js"]
    }
  }
}`;
    } else if (type === 'openai-individual') {
        configText = `{
  "mcpServers": {
    "your-server-name": {
      "command": "npx",
      "args": [
        "tsx",
        "path/to/your/server/index.ts"
      ]
    }
  }
}`;
    }

    navigator.clipboard.writeText(configText).then(() => {
        // Show feedback
        const btn = event.target;
        const originalText = btn.textContent;
        btn.textContent = '✅ Copied!';
        btn.style.background = '#10b981';

        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        // Fallback: select the text
        const config = document.getElementById('integratedConfig');
        const range = document.createRange();
        range.selectNodeContents(config);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    });
}

// Check server status
async function checkServerStatus() {
    const statusDot = document.querySelector('.status-dot');
    const statusText = document.getElementById('statusText');

    try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();

        if (data.status === 'OK') {
            statusDot.className = 'status-dot online';
            statusText.textContent = `Online - Managing ${data.serverCount} servers`;
        } else {
            throw new Error('Server not healthy');
        }
    } catch (error) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline - Run "npm run dev" to start';
    }
}

// Load servers for export
async function loadExportServerList() {
    try {
        const response = await fetch('/api/servers');
        const result = await response.json();

        const serverList = document.getElementById('exportServerList');

        if (result.success && result.data.length > 0) {
            serverList.classList.add('has-servers');

            let html = '';
            result.data.forEach(server => {
                html += `
                    <div class="server-card">
                        <h3>${server.name}</h3>
                        <p>${server.description}</p>
                        <div class="server-stats">
                            <span>Version: ${server.version}</span>
                            <span>Tools: ${server.toolsCount}</span>
                            <span>Resources: ${server.resourcesCount}</span>
                            <span>Prompts: ${server.promptsCount}</span>
                        </div>
                        <div class="server-actions">
                            <button class="btn btn-primary" onclick="exportServerForDownload('${server.id}')">
                                📦 Export Server
                            </button>
                            <button class="btn btn-secondary" onclick="viewServer('${server.id}')">
                                👁️ View Details
                            </button>
                        </div>
                    </div>
                `;
            });
            serverList.innerHTML = html;
        } else {
            serverList.classList.remove('has-servers');
            serverList.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #718096;">
                    <div style="font-size: 48px; margin-bottom: 16px;">📦</div>
                    <h3 style="margin-bottom: 8px; color: #2d3748;">No Servers Available</h3>
                    <p style="margin-bottom: 20px;">Create an MCP server first to export it.</p>
                    <a href="/" class="btn btn-primary">
                        🚀 Generate Your First Server
                    </a>
                </div>
            `;
        }
    } catch (error) {
        console.error('Failed to load servers:', error);
    }
}

// Export server for download
function exportServerForDownload(serverId) {
    // Trigger download
    window.location.href = `/api/servers/${serverId}/export`;
}

// Check server status for OpenAI section
async function checkOpenAIServerStatus() {
    const statusDot = document.querySelector('#openaiServerStatus .status-dot');
    const statusText = document.getElementById('openaiStatusText');

    if (!statusDot || !statusText) return;

    try {
        const response = await fetch('http://localhost:3001/health');
        const data = await response.json();

        if (data.status === 'OK') {
            statusDot.className = 'status-dot online';
            statusText.textContent = `Online - Managing ${data.serverCount} servers`;
        } else {
            throw new Error('Server not healthy');
        }
    } catch (error) {
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Offline - Run "npm run dev" to start';
    }
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    checkServerStatus();

    // Check server status every 10 seconds
    setInterval(checkServerStatus, 10000);
    setInterval(checkOpenAIServerStatus, 10000);
});