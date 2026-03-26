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

function handleGrafanaAuthChange() {
    const authType = document.getElementById('grafanaAuthType')?.value || 'apiKey';
    const apiKeySection = document.getElementById('grafana-auth-api-key');
    const basicSection = document.getElementById('grafana-auth-basic');

    if (authType === 'basic') {
        apiKeySection?.classList.add('hidden');
        basicSection?.classList.remove('hidden');
    } else {
        apiKeySection?.classList.remove('hidden');
        basicSection?.classList.add('hidden');
    }

    updateWizardNavigation();
}

function displayWebpagePreview(dataSource) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const { url, alias } = dataSource;
    const toolName = alias ? `${alias}_web` : 'fetch_webpage';

    const html = `
        <div class="space-y-4">
            <div class="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25 flex-shrink-0">
                        <i class="fas fa-rocket text-lg"></i>
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

function displayOpenSearchPreview(osConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = osConfig?.baseUrl || 'Not set';
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
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/opensearch.png" alt="OpenSearch" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">OpenSearch Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with OpenSearch API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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

function displayPrometheusPreview(promConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = promConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'query', desc: 'Run an instant PromQL query' },
        { name: 'query_range', desc: 'Run a range PromQL query' },
        { name: 'labels', desc: 'List label names' },
        { name: 'series', desc: 'Find series by label matchers' },
        { name: 'targets', desc: 'List Prometheus targets' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/prometheus.png" alt="Prometheus" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Prometheus Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to query Prometheus.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGrafanaPreview(grafConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = grafConfig?.baseUrl || 'Not set';
    const authType = grafConfig?.authType || 'apiKey';
    const tools = [
        { name: 'search_dashboards', desc: 'Search dashboards (by title/tag)' },
        { name: 'get_dashboard', desc: 'Get dashboard by UID' },
        { name: 'list_datasources', desc: 'List Grafana datasources' },
        { name: 'get_datasource', desc: 'Get datasource by ID' },
        { name: 'query_datasource', desc: 'Query a datasource' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/grafana.png" alt="Grafana" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Grafana Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Grafana.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Auth:</span>
                                    <span class="ml-2 font-mono text-slate-700">${authType}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayMongoDBPreview(mongoConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const host = mongoConfig?.host || 'Not set';
    const port = mongoConfig?.port || 27017;
    const database = mongoConfig?.database || 'Not set';
    const tools = [
        { name: 'list_databases', desc: 'List databases on the MongoDB server' },
        { name: 'list_collections', desc: 'List collections in a database' },
        { name: 'find', desc: 'Find documents in a collection' },
        { name: 'insert_one', desc: 'Insert a document into a collection' },
        { name: 'update_one', desc: 'Update a single document in a collection' },
        { name: 'delete_one', desc: 'Delete a single document in a collection' },
        { name: 'aggregate', desc: 'Run an aggregation pipeline' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-leaf text-2xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">MongoDB Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with MongoDB.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Host:</span>
                                    <span class="ml-2 font-mono text-slate-700">${host}:${port}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Database:</span>
                                    <span class="ml-2 font-mono text-slate-700">${database}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayFacebookPreview(fbConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = fbConfig?.baseUrl || 'Not set';
    const apiVersion = fbConfig?.apiVersion || 'Not set';
    const tools = [
        { name: 'get_user', desc: 'Get a Facebook user by ID' },
        { name: 'get_pages', desc: 'List pages for a user' },
        { name: 'get_page_posts', desc: 'List posts for a page' },
        { name: 'get_post', desc: 'Get a post by ID' },
        { name: 'search', desc: 'Search public content' },
        { name: 'get_page_insights', desc: 'Get insights for a page' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/facebook.png" alt="Facebook" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Facebook Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Facebook Graph API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">API Version:</span>
                                    <span class="ml-2 font-mono text-slate-700">${apiVersion}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayInstagramPreview(igConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = igConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_user', desc: 'Get user profile' },
        { name: 'get_user_media', desc: 'List media for a user' },
        { name: 'get_media', desc: 'Get media by ID' },
        { name: 'get_media_comments', desc: 'List comments for a media item' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/instagram.png" alt="Instagram" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Instagram Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Instagram API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayTikTokPreview(ttConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = ttConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_user_info', desc: 'Get user profile' },
        { name: 'list_videos', desc: 'List videos for a user' },
        { name: 'get_video', desc: 'Get video by ID' },
        { name: 'search_videos', desc: 'Search videos' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/tiktok.png" alt="TikTok" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">TikTok Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with TikTok API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayNotionPreview(notionConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = notionConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search pages and databases' },
        { name: 'get_page', desc: 'Get a page by ID' },
        { name: 'get_database', desc: 'Get a database by ID' },
        { name: 'query_database', desc: 'Query a database' },
        { name: 'create_page', desc: 'Create a new page' },
        { name: 'update_page', desc: 'Update a page' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/notion.png" alt="Notion" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Notion Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Notion API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayTelegramPreview(telegramConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = telegramConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_me', desc: 'Get bot information' },
        { name: 'get_updates', desc: 'Get updates' },
        { name: 'send_message', desc: 'Send a message' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/telegram.png" alt="Telegram" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Telegram Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Telegram Bot API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGraphQLPreview(graphqlConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = graphqlConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'query', desc: 'Execute a GraphQL query' },
        { name: 'introspect', desc: 'Run schema introspection' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-project-diagram text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">GraphQL Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with a GraphQL endpoint.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Endpoint:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displaySoapPreview(soapConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = soapConfig?.baseUrl || 'Not set';
    const wsdlUrl = soapConfig?.wsdlUrl || 'Not set';
    const tools = [
        { name: 'call_operation', desc: 'Call a SOAP operation with XML body' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-cubes text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">SOAP Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate a tool to call SOAP operations.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Endpoint:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">WSDL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${wsdlUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayRssPreview(rssConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const feedUrl = rssConfig?.feedUrl || 'Not set';
    const tools = [
        { name: 'get_feed', desc: 'Fetch feed metadata and items' },
        { name: 'list_entries', desc: 'List feed entries' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-rss text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">RSS/Atom Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to fetch and parse feed entries.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Feed URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${feedUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayLinkedInPreview(liConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = liConfig?.baseUrl || 'Not set';
    const personId = liConfig?.personId || 'Not set';
    const organizationId = liConfig?.organizationId || 'Not set';
    const tools = [
        { name: 'get_profile', desc: 'Get profile by person ID' },
        { name: 'get_organization', desc: 'Get organization by ID' },
        { name: 'list_connections', desc: 'List connections (requires permissions)' },
        { name: 'list_posts', desc: 'List posts for a member or organization' },
        { name: 'create_post', desc: 'Create a post' },
        { name: 'get_post', desc: 'Get a post by ID' },
        { name: 'search_people', desc: 'Search people' },
        { name: 'search_companies', desc: 'Search companies' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/linkedin.png" alt="LinkedIn" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">LinkedIn Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with LinkedIn API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Person ID:</span>
                                    <span class="ml-2 font-mono text-slate-700">${personId}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Organization ID:</span>
                                    <span class="ml-2 font-mono text-slate-700">${organizationId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayRedditPreview(redditConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = redditConfig?.baseUrl || 'Not set';
    const subreddit = redditConfig?.subreddit || 'Not set';
    const username = redditConfig?.username || 'Not set';
    const tools = [
        { name: 'get_user', desc: 'Get user profile' },
        { name: 'get_subreddit', desc: 'Get subreddit details' },
        { name: 'list_hot', desc: 'List hot posts in a subreddit' },
        { name: 'list_new', desc: 'List new posts in a subreddit' },
        { name: 'search_posts', desc: 'Search posts in a subreddit' },
        { name: 'get_post', desc: 'Get a post by ID' },
        { name: 'create_post', desc: 'Create a post' },
        { name: 'add_comment', desc: 'Add a comment to a post' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/reddit.png" alt="Reddit" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Reddit Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Reddit API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Subreddit:</span>
                                    <span class="ml-2 font-mono text-slate-700">${subreddit}</span>
                                </div>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayYouTubePreview(ytConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = ytConfig?.baseUrl || 'Not set';
    const channelId = ytConfig?.channelId || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search videos, channels, or playlists' },
        { name: 'get_channel', desc: 'Get channel details' },
        { name: 'list_channel_videos', desc: 'List recent channel videos' },
        { name: 'list_playlists', desc: 'List channel playlists' },
        { name: 'list_playlist_items', desc: 'List playlist items' },
        { name: 'get_video', desc: 'Get video details' },
        { name: 'get_comments', desc: 'List comments for a video' },
        { name: 'post_comment', desc: 'Post a comment on a video' },
        { name: 'rate_video', desc: 'Rate a video' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/youtube.png" alt="YouTube" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">YouTube Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with YouTube Data API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Channel:</span>
                                    <span class="ml-2 font-mono text-slate-700">${channelId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayWhatsAppBusinessPreview(waConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = waConfig?.baseUrl || 'Not set';
    const phoneNumberId = waConfig?.phoneNumberId || 'Not set';
    const businessAccountId = waConfig?.businessAccountId || 'Not set';
    const tools = [
        { name: 'send_text_message', desc: 'Send a text message' },
        { name: 'send_template_message', desc: 'Send a template message' },
        { name: 'send_media_message', desc: 'Send a media message' },
        { name: 'get_message_templates', desc: 'List message templates' },
        { name: 'get_phone_numbers', desc: 'List phone numbers' },
        { name: 'get_business_profile', desc: 'Get business profile' },
        { name: 'set_business_profile', desc: 'Update business profile' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/whatsappbusiness.png" alt="WhatsApp Business" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">WhatsApp Business Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with WhatsApp Business Cloud API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Phone Number ID:</span>
                                    <span class="ml-2 font-mono text-slate-700">${phoneNumberId}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Business Account ID:</span>
                                    <span class="ml-2 font-mono text-slate-700">${businessAccountId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayThreadsPreview(threadsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = threadsConfig?.baseUrl || 'Not set';
    const userId = threadsConfig?.userId || 'Not set';
    const tools = [
        { name: 'get_user', desc: 'Get Threads user profile' },
        { name: 'list_threads', desc: 'List user threads' },
        { name: 'get_thread', desc: 'Get a thread by ID' },
        { name: 'create_thread', desc: 'Create a thread' },
        { name: 'delete_thread', desc: 'Delete a thread' },
        { name: 'get_thread_insights', desc: 'Get thread insights' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/threads.png" alt="Threads" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Threads Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Threads API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default User ID:</span>
                                    <span class="ml-2 font-mono text-slate-700">${userId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displaySpotifyPreview(spotifyConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = spotifyConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search tracks, artists, albums, playlists' },
        { name: 'get_track', desc: 'Get track details' },
        { name: 'get_artist', desc: 'Get artist details' },
        { name: 'get_album', desc: 'Get album details' },
        { name: 'get_playlist', desc: 'Get playlist details' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <i class="fab fa-spotify text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Spotify Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Spotify Web API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displaySonosPreview(sonosConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = sonosConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_households', desc: 'List households' },
        { name: 'list_groups', desc: 'List groups' },
        { name: 'play', desc: 'Start playback' },
        { name: 'pause', desc: 'Pause playback' },
        { name: 'set_volume', desc: 'Set group volume' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-volume-up text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Sonos Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Sonos Control API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayShazamPreview(shazamConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = shazamConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search tracks' },
        { name: 'get_track', desc: 'Get track details' },
        { name: 'get_artist', desc: 'Get artist details' },
        { name: 'get_charts', desc: 'Get charts' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-wave-square text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Shazam Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Shazam endpoints.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayPhilipsHuePreview(hueConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = hueConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_lights', desc: 'List lights' },
        { name: 'get_light', desc: 'Get light details' },
        { name: 'set_light_state', desc: 'Set light state' },
        { name: 'list_groups', desc: 'List groups' },
        { name: 'set_group_state', desc: 'Set group state' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-lightbulb text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Philips Hue Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Philips Hue API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayEightSleepPreview(eightSleepConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = eightSleepConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_user', desc: 'Get current user' },
        { name: 'get_sessions', desc: 'Get sleep sessions' },
        { name: 'get_trends', desc: 'Get sleep trends' },
        { name: 'set_pod_temperature', desc: 'Set pod temperature' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-bed text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">8Sleep Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with 8Sleep API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayHomeAssistantPreview(haConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = haConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_states', desc: 'List entity states' },
        { name: 'get_services', desc: 'List available services' },
        { name: 'call_service', desc: 'Call a service' },
        { name: 'get_config', desc: 'Get configuration' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-house text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Home Assistant Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Home Assistant API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayAppleNotesPreview(notesConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = notesConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_notes', desc: 'List notes' },
        { name: 'get_note', desc: 'Get a note' },
        { name: 'create_note', desc: 'Create a note' },
        { name: 'update_note', desc: 'Update a note' },
        { name: 'delete_note', desc: 'Delete a note' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/applenotes.png" alt="Apple Notes" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Apple Notes Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Apple Notes.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayAppleRemindersPreview(remindersConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = remindersConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_lists', desc: 'List reminder lists' },
        { name: 'list_reminders', desc: 'List reminders' },
        { name: 'create_reminder', desc: 'Create a reminder' },
        { name: 'complete_reminder', desc: 'Complete a reminder' },
        { name: 'delete_reminder', desc: 'Delete a reminder' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/applereminders.png" alt="Apple Reminders" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Apple Reminders Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Apple Reminders.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayThings3Preview(thingsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = thingsConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_projects', desc: 'List projects' },
        { name: 'list_areas', desc: 'List areas' },
        { name: 'list_todos', desc: 'List todos' },
        { name: 'create_todo', desc: 'Create a todo' },
        { name: 'complete_todo', desc: 'Complete a todo' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/things3.png" alt="Things 3" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Things 3 Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Things 3.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayObsidianPreview(obsidianConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = obsidianConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_files', desc: 'List files' },
        { name: 'get_file', desc: 'Get a file' },
        { name: 'create_file', desc: 'Create a file' },
        { name: 'update_file', desc: 'Update a file' },
        { name: 'search', desc: 'Search files' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/obsidian.png" alt="Obsidian" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Obsidian Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Obsidian.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayBearNotesPreview(bearConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = bearConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_notes', desc: 'List notes' },
        { name: 'get_note', desc: 'Get a note' },
        { name: 'create_note', desc: 'Create a note' },
        { name: 'update_note', desc: 'Update a note' },
        { name: 'archive_note', desc: 'Archive a note' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/bearnotes.png" alt="Bear Notes" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Bear Notes Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Bear Notes.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayIMessagePreview(imessageConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = imessageConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_chats', desc: 'List chats' },
        { name: 'list_messages', desc: 'List messages in a chat' },
        { name: 'get_message', desc: 'Get a message' },
        { name: 'send_message', desc: 'Send a message' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/imessage.png" alt="iMessage" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">iMessage Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with iMessage.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayZoomPreview(zoomConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = zoomConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_users', desc: 'List users' },
        { name: 'list_meetings', desc: 'List meetings for a user' },
        { name: 'get_meeting', desc: 'Get meeting details' },
        { name: 'create_meeting', desc: 'Create a meeting' },
        { name: 'delete_meeting', desc: 'Delete a meeting' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/zoom.png" alt="Zoom" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Zoom Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Zoom API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayMicrosoftTeamsPreview(teamsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = teamsConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_teams', desc: 'List teams' },
        { name: 'list_channels', desc: 'List channels in a team' },
        { name: 'list_messages', desc: 'List channel messages' },
        { name: 'get_message', desc: 'Get a message' },
        { name: 'send_message', desc: 'Send a message' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/microsoftteams.png" alt="Microsoft Teams" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Microsoft Teams Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Microsoft Teams.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displaySignalPreview(signalConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = signalConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_groups', desc: 'List groups' },
        { name: 'list_messages', desc: 'List messages' },
        { name: 'get_message', desc: 'Get a message' },
        { name: 'send_message', desc: 'Send a message' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/signal.png" alt="Signal" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Signal Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Signal.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayOpenAIPreview(openaiConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = openaiConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'embeddings', desc: 'Create embeddings' },
        { name: 'moderations', desc: 'Moderate text' },
        { name: 'images', desc: 'Generate images' },
        { name: 'audio_speech', desc: 'Text to speech' },
        { name: 'audio_transcriptions', desc: 'Transcribe audio' },
        { name: 'audio_translations', desc: 'Translate audio' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/openai.png" alt="OpenAI" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">OpenAI Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with OpenAI API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayClaudePreview(claudeConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = claudeConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create messages' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/claude.png" alt="Claude" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Claude Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Anthropic API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGeminiPreview(geminiConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = geminiConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Generate content' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/gemini.png" alt="Gemini" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Gemini Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Gemini API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGrokPreview(grokConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = grokConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'images', desc: 'Generate images' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/grok.png" alt="Grok" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Grok Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with xAI API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayFalAIPreview(falConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = falConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'run_model', desc: 'Run a fal.ai model' },
        { name: 'run_model_async', desc: 'Run a fal.ai model (async)' },
        { name: 'get_run_status', desc: 'Get async run status' },
        { name: 'get_run_result', desc: 'Get async run result' },
        { name: 'cancel_run', desc: 'Cancel an async run' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/falai.png" alt="fal.ai" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">fal.ai Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with fal.ai.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayHuggingFacePreview(hfConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = hfConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat_completion', desc: 'Create chat completions' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/huggingface.png" alt="Hugging Face" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Hugging Face Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Hugging Face API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayLlamaPreview(llamaConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = llamaConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Chat with model' },
        { name: 'generate', desc: 'Generate text' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/llama.png" alt="Llama" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Llama Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Ollama-compatible API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayDeepSeekPreview(deepseekConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = deepseekConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/deepseek.png" alt="DeepSeek" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">DeepSeek Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with DeepSeek API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayAzureOpenAIPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const deployment = config?.deployment || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/azure_openai.png" alt="Azure OpenAI" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Azure OpenAI Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Azure OpenAI.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Deployment:</span>
                                    <span class="ml-2 font-mono text-slate-700">${deployment}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayMistralPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/mistral.png" alt="Mistral" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Mistral Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Mistral API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayCoherePreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Chat with Cohere' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/cohere.png" alt="Cohere" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Cohere Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Cohere API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayPerplexityPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/perplexity.png" alt="Perplexity" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Perplexity Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Perplexity API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayTogetherPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/together.png" alt="Together" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Together Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Together AI.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayFireworksPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' },
        { name: 'embeddings', desc: 'Create embeddings' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-fire text-orange-600 text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Fireworks Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Fireworks AI.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGroqPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/groq.png" alt="Groq" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Groq Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Groq API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayOpenRouterPreview(config) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = config?.baseUrl || 'Not set';
    const tools = [
        { name: 'chat', desc: 'Create chat completions' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/openrouter.png" alt="OpenRouter" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">OpenRouter Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with OpenRouter API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayDropboxPreview(dbxConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = dbxConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_folder', desc: 'List files/folders at a path' },
        { name: 'get_metadata', desc: 'Get metadata for a file or folder' },
        { name: 'search', desc: 'Search for files and folders' },
        { name: 'download', desc: 'Download a file' },
        { name: 'upload', desc: 'Upload a file' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/dropbox.png" alt="Dropbox" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Dropbox Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Dropbox API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayN8nPreview(n8nConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = n8nConfig?.baseUrl || 'Not set';
    const apiPath = n8nConfig?.apiPath || '/api/v1';
    const selectedToolNames = Array.isArray(n8nConfig?.enabledTools)
        ? n8nConfig.enabledTools.map((value) => String(value || '').trim()).filter((value) => value)
        : getSelectedN8nToolNames();
    const selectedSet = new Set(selectedToolNames);
    const tools = N8N_TOOL_CATALOG
        .filter((tool) => selectedSet.has(tool.name))
        .map((tool) => ({ name: tool.name, desc: tool.description }));

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/n8n.png" alt="n8n" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">n8n Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with n8n API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">API Path:</span>
                                    <span class="ml-2 font-mono text-slate-700">${apiPath}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displaySupabasePreview(sbConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = sbConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'select_rows', desc: 'Select rows from a table' },
        { name: 'insert_row', desc: 'Insert a row into a table' },
        { name: 'update_rows', desc: 'Update rows in a table' },
        { name: 'delete_rows', desc: 'Delete rows in a table' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-database text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Supabase Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Supabase REST API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayNpmPreview(npmConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = npmConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search packages' },
        { name: 'get_package', desc: 'Get package metadata' },
        { name: 'get_version', desc: 'Get version metadata' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-box text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">npm Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to query npm registry.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayNugetPreview(nugetConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = nugetConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search packages' },
        { name: 'get_package', desc: 'Get package metadata' },
        { name: 'get_versions', desc: 'Get package versions' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-boxes-stacked text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">NuGet Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to query NuGet endpoints.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayMavenPreview(mavenConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = mavenConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search', desc: 'Search artifacts' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-cubes text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Maven Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to query Maven Central.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGradlePreview(gradleConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = gradleConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'search_plugins', desc: 'Search plugins' },
        { name: 'get_plugin_versions', desc: 'Get plugin versions' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-plug text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Gradle Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to query Gradle Plugin Portal.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayNexusPreview(nexusConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = nexusConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_repositories', desc: 'List repositories' },
        { name: 'list_components', desc: 'List components' },
        { name: 'search', desc: 'Search components' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center flex-shrink-0">
                        <i class="fas fa-server text-xl"></i>
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Nexus Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Nexus API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayTrelloPreview(trelloConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = trelloConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_member', desc: 'Get member details' },
        { name: 'list_boards', desc: 'List boards for a member' },
        { name: 'get_board', desc: 'Get board by ID' },
        { name: 'list_lists', desc: 'List lists on a board' },
        { name: 'list_cards', desc: 'List cards on a list' },
        { name: 'get_card', desc: 'Get card by ID' },
        { name: 'create_card', desc: 'Create a card in a list' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/trello.png" alt="Trello" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Trello Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Trello API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGitLabPreview(glConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = glConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_projects', desc: 'List projects for the authenticated user' },
        { name: 'get_project', desc: 'Get a project by ID or path' },
        { name: 'list_issues', desc: 'List issues for a project' },
        { name: 'create_issue', desc: 'Create an issue in a project' },
        { name: 'list_merge_requests', desc: 'List merge requests for a project' },
        { name: 'get_file', desc: 'Get file contents from repository' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/gitlab.png" alt="GitLab" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">GitLab Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with GitLab API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayBitbucketPreview(bbConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = bbConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_repos', desc: 'List repositories in a workspace' },
        { name: 'get_repo', desc: 'Get repository details' },
        { name: 'list_issues', desc: 'List issues for a repository' },
        { name: 'create_issue', desc: 'Create an issue in a repository' },
        { name: 'list_pull_requests', desc: 'List pull requests for a repository' },
        { name: 'get_file', desc: 'Get file contents from repository' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/bitbucket.png" alt="Bitbucket" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Bitbucket Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Bitbucket API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGDrivePreview(gdConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = gdConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_files', desc: 'List files in a folder' },
        { name: 'get_file', desc: 'Get file metadata by ID' },
        { name: 'download_file', desc: 'Download file content' },
        { name: 'upload_file', desc: 'Upload a file' },
        { name: 'create_folder', desc: 'Create a folder' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/gdrive.png" alt="Google Drive" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Google Drive Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Google Drive API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGoogleCalendarPreview(gcalConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = gcalConfig?.baseUrl || 'Not set';
    const calendarId = gcalConfig?.calendarId || 'Not set';
    const tools = [
        { name: 'list_calendars', desc: 'List calendars for the user' },
        { name: 'list_events', desc: 'List events in a calendar' },
        { name: 'get_event', desc: 'Get event details' },
        { name: 'create_event', desc: 'Create a calendar event' },
        { name: 'update_event', desc: 'Update a calendar event' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/googlecalendar.png" alt="Google Calendar" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Google Calendar Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Google Calendar API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Calendar:</span>
                                    <span class="ml-2 font-mono text-slate-700">${calendarId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGoogleDocsPreview(gdocsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = gdocsConfig?.baseUrl || 'Not set';
    const documentId = gdocsConfig?.documentId || 'Not set';
    const tools = [
        { name: 'get_document', desc: 'Get document content' },
        { name: 'create_document', desc: 'Create a new document' },
        { name: 'batch_update', desc: 'Batch update a document' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/googledocs.png" alt="Google Docs" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Google Docs Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Google Docs API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Document:</span>
                                    <span class="ml-2 font-mono text-slate-700">${documentId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayGoogleSheetsPreview(sheetsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = sheetsConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'get_spreadsheet', desc: 'Get spreadsheet metadata' },
        { name: 'get_values', desc: 'Get values from a range' },
        { name: 'update_values', desc: 'Update values in a range' },
        { name: 'append_values', desc: 'Append values to a range' },
        { name: 'create_spreadsheet', desc: 'Create a new spreadsheet' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/googlesheets.png" alt="Google Sheets" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Google Sheets Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Google Sheets API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayAirtablePreview(airtableConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = airtableConfig?.baseUrl || 'Not set';
    const baseId = airtableConfig?.baseId || 'Not set';
    const tableName = airtableConfig?.tableName || 'Not set';
    const tools = [
        { name: 'list_records', desc: 'List records in a table' },
        { name: 'get_record', desc: 'Get a record by ID' },
        { name: 'create_record', desc: 'Create a record' },
        { name: 'update_record', desc: 'Update a record' },
        { name: 'delete_record', desc: 'Delete a record' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/airtable.png" alt="Airtable" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Airtable Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Airtable API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Base/Table:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseId} / ${tableName}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayAsanaPreview(asanaConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = asanaConfig?.baseUrl || 'Not set';
    const workspaceId = asanaConfig?.workspaceId || 'Not set';
    const tools = [
        { name: 'list_projects', desc: 'List projects in a workspace' },
        { name: 'list_tasks', desc: 'List tasks in a project' },
        { name: 'get_task', desc: 'Get a task by ID' },
        { name: 'create_task', desc: 'Create a task' },
        { name: 'update_task', desc: 'Update a task' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/asana.png" alt="Asana" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Asana Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Asana API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Workspace:</span>
                                    <span class="ml-2 font-mono text-slate-700">${workspaceId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayMondayPreview(mondayConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = mondayConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'query', desc: 'Run a GraphQL query' },
        { name: 'mutate', desc: 'Run a GraphQL mutation' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/monday.png" alt="Monday.com" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Monday.com Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Monday GraphQL API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayClickUpPreview(clickupConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = clickupConfig?.baseUrl || 'Not set';
    const teamId = clickupConfig?.teamId || 'Not set';
    const tools = [
        { name: 'list_teams', desc: 'List teams' },
        { name: 'list_spaces', desc: 'List spaces in a team' },
        { name: 'list_tasks', desc: 'List tasks in a list' },
        { name: 'create_task', desc: 'Create a task' },
        { name: 'update_task', desc: 'Update a task' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/clickup.png" alt="ClickUp" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">ClickUp Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with ClickUp API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Default Team:</span>
                                    <span class="ml-2 font-mono text-slate-700">${teamId}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayLinearPreview(linearConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = linearConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'query', desc: 'Run a GraphQL query' },
        { name: 'mutate', desc: 'Run a GraphQL mutation' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/linear.png" alt="Linear" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Linear Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Linear GraphQL API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayJenkinsPreview(jenkinsConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = jenkinsConfig?.baseUrl || 'Not set';
    const tools = [
        { name: 'list_jobs', desc: 'List jobs on Jenkins' },
        { name: 'get_job', desc: 'Get job details' },
        { name: 'trigger_build', desc: 'Trigger a build for a job' },
        { name: 'get_build', desc: 'Get build details' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/jenkins.png" alt="Jenkins" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Jenkins Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Jenkins API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
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
                    </div>
                </div>
            </div>
        </div>
    `;

    preview.innerHTML = html;
}

function displayDockerHubPreview(dockerHubConfig) {
    const preview = document.getElementById('data-preview');
    if (!preview) return;

    const baseUrl = dockerHubConfig?.baseUrl || 'Not set';
    const namespace = dockerHubConfig?.namespace || 'Not set';
    const tools = [
        { name: 'list_repos', desc: 'List repositories for a namespace' },
        { name: 'get_repo', desc: 'Get repository details' },
        { name: 'list_tags', desc: 'List tags for a repository' },
        { name: 'search_repos', desc: 'Search repositories' }
    ];

    const html = `
        <div class="space-y-4">
            <div class="bg-slate-50 border-2 border-slate-300 rounded-xl p-6">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-lg bg-white flex items-center justify-center flex-shrink-0">
                        <img src="images/app/dockerhub.png" alt="Docker Hub" class="w-8 h-8 object-contain" />
                    </div>
                    <div class="flex-1">
                        <h3 class="font-bold text-slate-900 text-lg mb-2">Docker Hub Configuration</h3>
                        <p class="text-slate-700 mb-3">This server will generate tools to interact with Docker Hub API.</p>

                        <div class="bg-white rounded-lg p-4 mb-3 border border-slate-200">
                            <div class="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span class="text-slate-500">Base URL:</span>
                                    <span class="ml-2 font-mono text-slate-700">${baseUrl}</span>
                                </div>
                                <div>
                                    <span class="text-slate-500">Namespace:</span>
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
let directoryPickerMode = 'directory';
let directoryPickerTargetInputId = 'localfsBasePath';
let directoryPickerExtensions = [];

function openDirectoryPicker(mode, targetInputId, extensions = []) {
    const modal = document.getElementById('directoryPickerModal');
    const titleEl = document.getElementById('dirPickerTitle');
    const subtitleEl = document.getElementById('dirPickerSubtitle');
    const selectLabelEl = document.getElementById('dirPickerSelectLabel');
    const selectedEl = document.getElementById('dirPickerSelected');
    if (!modal) return;

    directoryPickerMode = mode === 'file' ? 'file' : 'directory';
    directoryPickerTargetInputId = targetInputId;
    directoryPickerExtensions = Array.isArray(extensions) ? extensions : [];

    if (titleEl) {
        titleEl.textContent = directoryPickerMode === 'file' ? 'Select File' : 'Select Directory';
    }
    if (subtitleEl) {
        subtitleEl.textContent = directoryPickerMode === 'file'
            ? 'Choose a CSV/Excel file'
            : 'Choose a folder to use as base path';
    }
    if (selectLabelEl) {
        selectLabelEl.textContent = directoryPickerMode === 'file' ? 'Select This File' : 'Select This Folder';
    }
    if (selectedEl) {
        selectedEl.textContent = '-';
    }

    modal.classList.remove('hidden');
    loadDirectories('~');
}

function initDirectoryPicker() {
    const browseBtn = document.getElementById('browseDirectoryBtn');
    const browseCsvExcelFileBtn = document.getElementById('browseCsvExcelFileBtn');
    const modal = document.getElementById('directoryPickerModal');
    const overlay = document.getElementById('directoryPickerOverlay');
    const closeBtn = document.getElementById('closeDirectoryPicker');
    const cancelBtn = document.getElementById('dirPickerCancel');
    const selectBtn = document.getElementById('dirPickerSelect');
    const homeBtn = document.getElementById('dirPickerHome');
    const upBtn = document.getElementById('dirPickerUp');

    if (!modal) return;

    if (browseBtn && !browseBtn.dataset.listenerAttached) {
        browseBtn.addEventListener('click', () => openDirectoryPicker('directory', 'localfsBasePath'));
        browseBtn.dataset.listenerAttached = 'true';
    }
    if (browseCsvExcelFileBtn && !browseCsvExcelFileBtn.dataset.listenerAttached) {
        browseCsvExcelFileBtn.addEventListener('click', () => openDirectoryPicker('file', 'csvExcelFilePath', ['.csv', '.xlsx', '.xls']));
        browseCsvExcelFileBtn.dataset.listenerAttached = 'true';
    }

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
        const targetInput = document.getElementById(directoryPickerTargetInputId);
        if (selectedEl && targetInput && selectedEl.textContent !== '-') {
            targetInput.value = selectedEl.textContent;
            targetInput.dispatchEvent(new Event('input'));
            if (directoryPickerTargetInputId === 'csvExcelFilePath') {
                const fileInput = document.getElementById('fileInput');
                if (fileInput) fileInput.value = '';
            }
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
        const query = new URLSearchParams({ path: path || '~' });
        if (directoryPickerMode === 'file') {
            query.set('includeFiles', '1');
            if (directoryPickerExtensions.length) {
                query.set('extensions', directoryPickerExtensions.join(','));
            }
        }
        const response = await fetch('/api/directories?' + query.toString());
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load directories');
        }

        // Update current path
        if (currentPathEl) {
            currentPathEl.textContent = result.currentPath;
            currentPathEl.dataset.parent = result.parentPath || '';
        }

        // Update selected default
        if (selectedEl && selectedEl.textContent === '-' && directoryPickerMode === 'directory') {
            selectedEl.textContent = result.currentPath;
        }

        // Enable/disable up button
        if (upBtn) {
            upBtn.disabled = !result.parentPath;
            upBtn.classList.toggle('opacity-50', !result.parentPath);
        }

        // Render directories and files
        const dirItems = (result.directories || []).map(dir => {
                const escapedPath = dir.path.replace(/'/g, "\\'");
                const clickAction = directoryPickerMode === 'file'
                    ? `loadDirectories('${escapedPath}')`
                    : `selectDirectory('${escapedPath}')`;
                return '<button type="button" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 text-left transition-colors group" data-path="' + dir.path + '" ondblclick="loadDirectories(\'' + escapedPath + '\')" onclick="' + clickAction + '">' +
                    '<div class="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-200"><i class="fas fa-folder text-lg"></i></div>' +
                    '<div class="flex-1 min-w-0"><div class="font-medium text-slate-900 truncate">' + dir.name + '</div><div class="text-xs text-slate-500 truncate">' + dir.path + '</div></div>' +
                    '<i class="fas fa-chevron-right text-slate-400 group-hover:text-slate-600"></i></button>';
            });
        const fileItems = directoryPickerMode === 'file'
            ? (result.files || []).map(file => {
                const escapedPath = file.path.replace(/'/g, "\\'");
                return '<button type="button" class="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-100 text-left transition-colors group" data-path="' + file.path + '" onclick="selectDirectory(\'' + escapedPath + '\')">' +
                    '<div class="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200"><i class="fas fa-file-lines text-lg"></i></div>' +
                    '<div class="flex-1 min-w-0"><div class="font-medium text-slate-900 truncate">' + file.name + '</div><div class="text-xs text-slate-500 truncate">' + file.path + '</div></div>' +
                    '</button>';
              })
            : [];

        const items = [...dirItems, ...fileItems];
        if (items.length === 0) {
            listEl.innerHTML = '<div class="text-center py-8 text-slate-400"><i class="fas fa-folder-open text-2xl"></i><p class="mt-2">No items found</p></div>';
        } else {
            listEl.innerHTML = items.join('');
        }

        directoryPickerCurrentPath = result.currentPath;

    } catch (error) {
        logger.error('Failed to load directories:', error);
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
