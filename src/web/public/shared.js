// Shared utility functions for QuickMCP
let currentUserName = 'Guest';
let currentUserDisplayName = 'Guest';
let currentAuthMode = 'NONE';
let currentUserRole = 'user';
let currentUserWorkspace = '';
let currentUserEmail = '';
let currentUserAvatarUrl = '';
let currentCreatedDate = '';
let currentLastSignInDate = '';
let userMenuAnchor = null;

// DataSourceType enum mirror (matches TypeScript enum in types/index.ts)
const DataSourceType = {
    MSSQL: 'mssql',
    MySQL: 'mysql',
    PostgreSQL: 'postgresql',
    SQLite: 'sqlite',
    Oracle: 'oracle',
    CSV: 'csv',
    Excel: 'excel',
    JSON: 'json',
    Curl: 'curl',
    Webpage: 'webpage',
    GraphQL: 'graphql',
    Soap: 'soap',
    Rss: 'rss',
    Rest: 'rest',
    GitHub: 'github',
    Jira: 'jira',
    Confluence: 'confluence',
    Ftp: 'ftp',
    LocalFS: 'localfs',
    Email: 'email',
    Gmail: 'gmail',
    Slack: 'slack',
    Discord: 'discord',
    Docker: 'docker',
    Kubernetes: 'kubernetes',
    Elasticsearch: 'elasticsearch',
    OpenSearch: 'opensearch',
    OpenShift: 'openshift',
    X: 'x',
    Prometheus: 'prometheus',
    Grafana: 'grafana',
    MongoDB: 'mongodb',
    Facebook: 'facebook',
    Dropbox: 'dropbox',
    Trello: 'trello',
    Instagram: 'instagram',
    TikTok: 'tiktok',
    Notion: 'notion',
    Telegram: 'telegram',
    LinkedIn: 'linkedin',
    Reddit: 'reddit',
    YouTube: 'youtube',
    WhatsAppBusiness: 'whatsappbusiness',
    Threads: 'threads',
    Spotify: 'spotify',
    Sonos: 'sonos',
    Shazam: 'shazam',
    PhilipsHue: 'philipshue',
    EightSleep: 'eightsleep',
    HomeAssistant: 'homeassistant',
    AppleNotes: 'applenotes',
    AppleReminders: 'applereminders',
    Things3: 'things3',
    Obsidian: 'obsidian',
    BearNotes: 'bearnotes',
    IMessage: 'imessage',
    Zoom: 'zoom',
    MicrosoftTeams: 'microsoftteams',
    Signal: 'signal',
    FalAI: 'falai',
    HuggingFace: 'huggingface',
    N8n: 'n8n',
    Supabase: 'supabase',
    Npm: 'npm',
    Nuget: 'nuget',
    Maven: 'maven',
    Gradle: 'gradle',
    Nexus: 'nexus',
    OpenAI: 'openai',
    Claude: 'claude',
    Gemini: 'gemini',
    Grok: 'grok',
    Llama: 'llama',
    DeepSeek: 'deepseek',
    AzureOpenAI: 'azure_openai',
    Mistral: 'mistral',
    Cohere: 'cohere',
    Perplexity: 'perplexity',
    Together: 'together',
    Fireworks: 'fireworks',
    Groq: 'groq',
    OpenRouter: 'openrouter',
    GitLab: 'gitlab',
    Bitbucket: 'bitbucket',
    GDrive: 'gdrive',
    GoogleCalendar: 'googlecalendar',
    GoogleDocs: 'googledocs',
    GoogleSheets: 'googlesheets',
    Airtable: 'airtable',
    Asana: 'asana',
    Monday: 'monday',
    ClickUp: 'clickup',
    Linear: 'linear',
    Jenkins: 'jenkins',
    DockerHub: 'dockerhub'
};

function isDatabase(type) {
    if (!type) return false;
    const value = String(type).toLowerCase();
    return value === DataSourceType.MSSQL
        || value === DataSourceType.MySQL
        || value === DataSourceType.PostgreSQL
        || value === DataSourceType.SQLite
        || value === DataSourceType.Oracle;
}

// Data source types that don't require table selection (runtime execution)
// These types generate their own tools and don't need parsed table data
function isNoTableDataSource(type) {
    const noTableTypes = [
        DataSourceType.Webpage,
        DataSourceType.GraphQL,
        DataSourceType.Soap,
        DataSourceType.Rss,
        DataSourceType.Curl,
        DataSourceType.GitHub,
        DataSourceType.Jira,
        DataSourceType.Confluence,
        DataSourceType.Ftp,
        DataSourceType.LocalFS,
        DataSourceType.Email,
        DataSourceType.Gmail,
        DataSourceType.Slack,
        DataSourceType.Discord,
        DataSourceType.Docker,
        DataSourceType.Kubernetes,
        DataSourceType.Elasticsearch,
        DataSourceType.OpenSearch,
        DataSourceType.OpenShift,
        DataSourceType.X,
        DataSourceType.Prometheus,
        DataSourceType.Grafana,
        DataSourceType.MongoDB,
        DataSourceType.Facebook,
        DataSourceType.Dropbox,
        DataSourceType.Trello,
        DataSourceType.Instagram,
        DataSourceType.TikTok,
        DataSourceType.Notion,
        DataSourceType.Telegram,
        DataSourceType.LinkedIn,
        DataSourceType.Reddit,
        DataSourceType.YouTube,
        DataSourceType.WhatsAppBusiness,
        DataSourceType.Threads,
        DataSourceType.Spotify,
        DataSourceType.Sonos,
        DataSourceType.Shazam,
        DataSourceType.PhilipsHue,
        DataSourceType.EightSleep,
        DataSourceType.HomeAssistant,
        DataSourceType.AppleNotes,
        DataSourceType.AppleReminders,
        DataSourceType.Things3,
        DataSourceType.Obsidian,
        DataSourceType.BearNotes,
        DataSourceType.IMessage,
        DataSourceType.Zoom,
        DataSourceType.MicrosoftTeams,
        DataSourceType.Signal,
        DataSourceType.FalAI,
        DataSourceType.HuggingFace,
        DataSourceType.N8n,
        DataSourceType.Supabase,
        DataSourceType.Npm,
        DataSourceType.Nuget,
        DataSourceType.Maven,
        DataSourceType.Gradle,
        DataSourceType.Nexus,
        DataSourceType.OpenAI,
        DataSourceType.Claude,
        DataSourceType.Gemini,
        DataSourceType.Grok,
        DataSourceType.Llama,
        DataSourceType.DeepSeek,
        DataSourceType.AzureOpenAI,
        DataSourceType.Mistral,
        DataSourceType.Cohere,
        DataSourceType.Perplexity,
        DataSourceType.Together,
        DataSourceType.Fireworks,
        DataSourceType.Groq,
        DataSourceType.OpenRouter,
        DataSourceType.GitLab,
        DataSourceType.Bitbucket,
        DataSourceType.GDrive,
        DataSourceType.GoogleCalendar,
        DataSourceType.GoogleDocs,
        DataSourceType.GoogleSheets,
        DataSourceType.Airtable,
        DataSourceType.Asana,
        DataSourceType.Monday,
        DataSourceType.ClickUp,
        DataSourceType.Linear,
        DataSourceType.Jenkins,
        DataSourceType.DockerHub
    ];
    return noTableTypes.includes(type);
}

// Initialize sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    renderSharedAppBar();
    updateUserAvatar();
    initBrandHomeLink();

    const openBtn = document.getElementById('openSidebar');
    if (openBtn) {
        openBtn.addEventListener('click', openSidebar);
    }

    const closeBtn = document.getElementById('closeSidebar');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeSidebar);
    }

    // Close sidebar when overlay is clicked on mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Handle responsive behavior
    window.addEventListener('resize', handleResize);
    handleResize();
});

function getAppBarSubtitle() {
    const p = (window.location.pathname || '/').replace(/\/$/, '') || '/';
    if (p === '/') return 'Server Generator';
    if (p === '/manage-servers') return 'Manage Servers';
    if (p === '/test-servers') return 'Test Servers';
    if (p === '/authorization') return 'Authorization';
    if (p === '/users') return 'Users';
    if (p === '/how-to-use') return 'How to Use';
    if (p === '/database-tables') return 'Database Tables';
    if (p === '/roles') return 'Roles';
    return 'Server Generator';
}

function renderSharedAppBar() {
    const header = document.querySelector('header');
    if (!header || header.dataset.commonAppBar === 'true') return;

    header.dataset.commonAppBar = 'true';
    header.className = 'backdrop-blur-sm bg-white/80 border-b border-slate-200/60 shadow-sm relative z-50 h-16 flex-shrink-0 flex items-center justify-between px-6 py-3';

    const subtitle = getAppBarSubtitle();
    header.innerHTML = `
      <div class="flex items-center gap-6">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
            <i class="fas fa-rocket text-lg"></i>
          </div>
          <div>
            <h1 class="text-xl font-bold gradient-text leading-tight">QuickMCP</h1>
            <p class="text-xs text-slate-500 font-medium">${subtitle}</p>
          </div>
        </div>
        <div class="h-8 w-px bg-gradient-to-b from-transparent via-slate-300 to-transparent hidden md:block"></div>
        <div class="hidden md:flex items-center gap-2 text-sm font-medium text-slate-600">
          <button id="headerNewServerBtn" onclick="window.location.href='/'" class="md:inline-flex items-center gap-2 bg-white border border-slate-200 hover:border-blue-400 text-slate-700 hover:text-blue-600 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm">
            <i class="fas fa-plus"></i>
            <span>New Server</span>
          </button>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <div class="hidden sm:flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-200/50">
          <div class="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span>System Online</span>
        </div>
        <button class="p-2 rounded-lg hover:bg-slate-100 transition-colors relative text-slate-500 hover:text-slate-700">
          <i class="fas fa-bell"></i>
          <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-sm font-bold shadow-md" data-user-avatar>G</div>
        <button id="openSidebar" class="lg:hidden p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
          <i class="fas fa-bars"></i>
        </button>
      </div>
    `;
}

function initBrandHomeLink() {
    const titleEls = document.querySelectorAll('header h1');
    titleEls.forEach((titleEl) => {
        const text = (titleEl.textContent || '').trim().toLowerCase();
        if (!text.includes('quickmcp')) return;
        const brand = titleEl.closest('div.flex.items-center.gap-3');
        if (!brand || brand.dataset.homeBound === 'true') return;

        brand.dataset.homeBound = 'true';
        brand.classList.add('cursor-pointer');
        brand.setAttribute('role', 'link');
        brand.setAttribute('tabindex', '0');
        brand.setAttribute('aria-label', 'Go to home page');

        const goHome = () => { window.location.href = '/'; };
        brand.addEventListener('click', goHome);
        brand.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                goHome();
            }
        });
    });
}

async function updateUserAvatar() {
    const avatarEls = document.querySelectorAll('[data-user-avatar]');
    if (!avatarEls.length) return;

    const renderAnonymousAvatar = () => {
        avatarEls.forEach((el) => {
            el.innerHTML = `
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="20" height="20" aria-label="Anonymous user" role="img">
                <circle cx="32" cy="24" r="12" fill="rgba(255,255,255,0.95)"/>
                <path d="M12 52C12 42.0589 20.0589 34 30 34H34C43.9411 34 52 42.0589 52 52V56H12V52Z" fill="rgba(255,255,255,0.95)"/>
              </svg>
            `;
        });
    };

    renderAnonymousAvatar();

    const shouldRedirectToLogin = () => {
        const path = (window.location.pathname || '').toLowerCase();
        return path !== '/login' && path !== '/landing' && path !== '/';
    };

    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            if (shouldRedirectToLogin()) {
                window.location.href = '/login';
                return;
            }
            initializeUserMenu();
            return;
        }

        const payload = await response.json();
        const data = payload?.data || {};
        const username = data?.username;
        const authMode = data?.authMode;
        currentAuthMode = typeof authMode === 'string' ? authMode : 'NONE';
        currentUserRole = typeof data?.role === 'string' ? data.role : 'user';
        currentUserWorkspace = typeof data?.workspaceId === 'string' ? data.workspaceId : '';
        currentUserEmail = typeof data?.email === 'string' ? data.email : '';
        currentUserAvatarUrl = typeof data?.avatarUrl === 'string' ? data.avatarUrl : '';
        currentCreatedDate = typeof data?.createdDate === 'string' ? data.createdDate : '';
        currentLastSignInDate = typeof data?.lastSignInDate === 'string' ? data.lastSignInDate : '';
        currentUserName = (typeof username === 'string' && username.trim().length > 0)
            ? username.trim()
            : 'Guest';
        currentUserDisplayName = (typeof data?.displayName === 'string' && data.displayName.trim().length > 0)
            ? data.displayName.trim()
            : currentUserName;
        const initial = (typeof username === 'string' && username.trim().length > 0)
            ? username.trim().charAt(0).toUpperCase()
            : 'G';

        avatarEls.forEach((el) => {
            el.textContent = initial;
        });
        initializeUserMenu();
    } catch {
        if (shouldRedirectToLogin()) {
            window.location.href = '/login';
            return;
        }
        initializeUserMenu();
    }
}

function initializeUserMenu() {
    const avatarEls = document.querySelectorAll('[data-user-avatar]');
    if (!avatarEls.length) return;

    avatarEls.forEach((el) => {
        if (el.dataset.userMenuBound === 'true') return;
        el.dataset.userMenuBound = 'true';
        el.classList.add('cursor-pointer');
        el.setAttribute('role', 'button');
        el.setAttribute('tabindex', '0');

        el.addEventListener('click', (event) => {
            event.stopPropagation();
            toggleUserMenu(el);
        });

        el.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                toggleUserMenu(el);
            }
        });
    });

    if (!document.body.dataset.userMenuGlobalBound) {
        document.addEventListener('click', () => {
            closeUserMenu();
            closeUserSettings();
        });
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (target.closest('#closeSidebar')) {
                closeSidebar();
            }
        });
        window.addEventListener('resize', () => closeUserMenu());
        document.body.dataset.userMenuGlobalBound = 'true';
    }
}

function getOrCreateUserMenu() {
    let menu = document.getElementById('userAvatarMenu');
    if (menu) return menu;

    menu = document.createElement('div');
    menu.id = 'userAvatarMenu';
    menu.className = 'hidden fixed z-[120] w-52 rounded-xl border border-slate-200 bg-white shadow-xl p-2';
    document.body.appendChild(menu);
    return menu;
}

function positionUserMenu(menu, anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    const top = rect.bottom + 8;
    const right = Math.max(window.innerWidth - rect.right, 8);
    menu.style.top = `${top}px`;
    menu.style.right = `${right}px`;
}

function renderUserMenu(menu) {
    const signedInLabel = currentUserDisplayName || currentUserName || 'Guest';
    const showLogout = currentAuthMode !== 'NONE';

    menu.innerHTML = `
        <div class="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 mb-2">
            <div class="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Signed In</div>
            <div class="text-sm font-semibold text-slate-800">${signedInLabel}</div>
        </div>
        <button type="button" id="userMenuOptionsBtn" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Settings
        </button>
        ${showLogout ? `
        <button type="button" id="userMenuLogoutBtn" class="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
            Sign out
        </button>
        ` : ''}
    `;

    const settingsBtn = menu.querySelector('#userMenuOptionsBtn');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            openUserSettings(userMenuAnchor);
            closeUserMenu();
        });
    }

    const logoutBtn = menu.querySelector('#userMenuLogoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (event) => {
            event.stopPropagation();
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
            } catch {}
            window.location.href = '/login';
        });
    }
}

function toggleUserMenu(anchorEl) {
    const menu = getOrCreateUserMenu();
    const isOpen = !menu.classList.contains('hidden');
    if (isOpen && userMenuAnchor === anchorEl) {
        closeUserMenu();
        return;
    }

    userMenuAnchor = anchorEl;
    renderUserMenu(menu);
    positionUserMenu(menu, anchorEl);
    menu.classList.remove('hidden');
}

function closeUserMenu() {
    const menu = document.getElementById('userAvatarMenu');
    if (!menu) return;
    menu.classList.add('hidden');
    userMenuAnchor = null;
}

function getOrCreateUserSettingsPanel() {
    let panel = document.getElementById('userSettingsPanel');
    if (panel) return panel;

    const modal = document.createElement('div');
    modal.id = 'userSettingsModal';
    modal.className = 'hidden fixed inset-0 z-[121] bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-4';
    modal.addEventListener('click', () => closeUserSettings());

    panel = document.createElement('div');
    panel.id = 'userSettingsPanel';
    panel.className = 'w-[42rem] max-w-[96vw] rounded-2xl border border-slate-200 bg-white shadow-2xl p-0 overflow-hidden';
    panel.addEventListener('click', (event) => event.stopPropagation());

    modal.appendChild(panel);
    document.body.appendChild(modal);
    return panel;
}

function renderSettingsTabContent(activeTab = 'account') {
    const initial = currentUserName && currentUserName !== 'Guest'
        ? currentUserName.charAt(0).toUpperCase()
        : 'G';
    const avatarHtml = currentUserAvatarUrl
        ? `<img src="${currentUserAvatarUrl}" alt="User avatar" class="w-14 h-14 rounded-full object-cover border border-slate-200">`
        : `<div class="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 text-white flex items-center justify-center text-xl font-bold">${initial}</div>`;

    if (activeTab === 'account') {
        const formatDateValue = (value) => {
            if (!value) return '-';
            const d = new Date(value);
            if (Number.isNaN(d.getTime())) return value;
            return d.toLocaleString();
        };

        const authModeValue = (() => {
            if (currentAuthMode === 'SUPABASE_GOOGLE') {
                return `
                  <span class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="18" height="18" aria-hidden="true" class="-ml-0.5 mt-0.5">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
                      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.3l-6.2-5.2c-2.1 1.6-4.7 2.5-7.3 2.5-5.3 0-9.7-3.3-11.3-8l-6.6 5.1C9.7 39.6 16.3 44 24 44z"/>
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.5l6.2 5.2C36.9 38.9 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
                    </svg>
                    Google
                  </span>
                `;
            }
            if (currentAuthMode === 'LITE') {
                return `<span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">Lite</span>`;
            }
            return `<span class="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">${currentAuthMode || '-'}</span>`;
        })();

        const emailLine = currentUserEmail
            ? `<div class="text-sm text-slate-500 mt-1">${currentUserEmail}</div>`
            : '';

        const infoItem = (label, value, isHtml = false) => `
          <div>
            <div class="text-xs uppercase tracking-wide text-slate-400 font-semibold">${label}</div>
            <div class="text-sm font-semibold text-slate-800 mt-1">${isHtml ? value : (value || '-')}</div>
          </div>
        `;

        return `
          <div class="space-y-5">
            <div class="flex items-center gap-4 pb-1">
              ${avatarHtml}
              <div>
                <div class="text-base font-semibold text-slate-900 leading-tight">${currentUserDisplayName || currentUserName || 'Guest'}</div>
                ${emailLine}
              </div>
            </div>
            <div class="grid grid-cols-1 gap-4 text-sm">
              ${infoItem('Username', currentUserName || '-')}
              ${currentUserEmail ? infoItem('Email', currentUserEmail) : ''}
              ${infoItem('Role', currentUserRole || '-')}
              ${infoItem('Workspace', currentUserWorkspace || '-')}
              ${infoItem('created_date', formatDateValue(currentCreatedDate))}
              ${infoItem('last_sign_in_date', formatDateValue(currentLastSignInDate))}
              ${infoItem('Sign In', authModeValue, true)}
            </div>
          </div>
        `;
    }

    return `<div class="text-sm text-slate-600">No content.</div>`;
}

function renderUserSettingsPanel(activeTab = 'account') {
    const panel = getOrCreateUserSettingsPanel();
    const tabButtonClass = (tab) => (
        `w-full text-left px-3 py-2 rounded-lg text-sm ${activeTab === tab ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-100'}`
    );

    panel.innerHTML = `
      <div class="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
        <h3 class="text-base font-semibold text-slate-900">Settings</h3>
        <button id="closeUserSettingsBtn" class="h-8 w-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/50">
          <i class="fas fa-times"></i>
        </button>
      </div>
      <div class="flex min-h-[24rem]">
        <div class="w-40 border-r border-slate-200 p-3 bg-slate-50/50">
          <button id="settingsTabAccount" class="${tabButtonClass('account')}">Account</button>
        </div>
        <div class="flex-1 p-5 bg-white overflow-auto">
          ${renderSettingsTabContent(activeTab)}
        </div>
      </div>
    `;

    const closeBtn = panel.querySelector('#closeUserSettingsBtn');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => closeUserSettings());
    }
    const accountTab = panel.querySelector('#settingsTabAccount');
    if (accountTab) {
        accountTab.addEventListener('click', () => renderUserSettingsPanel('account'));
    }
}

function openUserSettings(anchorEl) {
    const panel = getOrCreateUserSettingsPanel();
    renderUserSettingsPanel('account');
    const modal = document.getElementById('userSettingsModal');
    if (modal) modal.classList.remove('hidden');
}

function closeUserSettings() {
    const modal = document.getElementById('userSettingsModal');
    if (!modal) return;
    modal.classList.add('hidden');
}

// Handle responsive behavior
function handleResize() {
    const sidebar = document.getElementById('sidebar');
    if (window.innerWidth >= 1024) {
        // Desktop: sidebar always visible
        sidebar?.classList.remove('-translate-x-full');
    } else {
        // Mobile: sidebar hidden by default
        sidebar?.classList.add('-translate-x-full');
    }
}

function openSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar?.classList.remove('-translate-x-full');
    overlay?.classList.remove('opacity-0', 'invisible');
}

// Utility function to close sidebar (called from main app)
function closeSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');

    sidebar?.classList.add('-translate-x-full');
    overlay?.classList.add('opacity-0', 'invisible');
}

// Global utility functions
window.utils = {
    // Format numbers with commas
    formatNumber: (num) => num.toLocaleString(),

    // Truncate text
    truncateText: (text, maxLength) => {
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    },

    // Copy text to clipboard
    copyToClipboard: async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            console.error('Failed to copy text:', err);
            return false;
        }
    },

    // Show toast notification
    showToast: (message, type = 'info') => {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 transform translate-x-full`;

        switch (type) {
            case 'success':
                toast.classList.add('bg-green-500', 'text-white');
                break;
            case 'error':
                toast.classList.add('bg-red-500', 'text-white');
                break;
            case 'warning':
                toast.classList.add('bg-yellow-500', 'text-black');
                break;
            default:
                toast.classList.add('bg-blue-500', 'text-white');
        }

        toast.textContent = message;
        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
            toast.classList.remove('translate-x-full');
        }, 100);

        // Animate out and remove
        setTimeout(() => {
            toast.classList.add('translate-x-full');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
};
