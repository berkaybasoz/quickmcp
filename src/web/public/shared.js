// Shared utility functions for QuickMCP
let currentUserName = 'Guest';
let currentAuthMode = 'NONE';
let userMenuAnchor = null;

// DataSourceType enum mirror (matches TypeScript enum in types/index.ts)
const DataSourceType = {
    Database: 'database',
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
    updateUserAvatar();

    // Close sidebar when overlay is clicked on mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Handle responsive behavior
    window.addEventListener('resize', handleResize);
    handleResize();
});

async function updateUserAvatar() {
    const avatarEls = document.querySelectorAll('[data-user-avatar]');
    if (!avatarEls.length) return;

    try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
            initializeUserMenu();
            return;
        }

        const payload = await response.json();
        const username = payload?.data?.username;
        const authMode = payload?.data?.authMode;
        currentAuthMode = typeof authMode === 'string' ? authMode : 'NONE';
        currentUserName = (typeof username === 'string' && username.trim().length > 0)
            ? username.trim()
            : 'Guest';
        const initial = (typeof username === 'string' && username.trim().length > 0)
            ? username.trim().charAt(0).toUpperCase()
            : 'G';

        avatarEls.forEach((el) => {
            el.textContent = initial;
        });
        initializeUserMenu();
    } catch {
        // Keep static fallback avatar letter.
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
        document.addEventListener('click', () => closeUserMenu());
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
    const signedInLabel = currentUserName || 'Guest';
    const showLogout = currentAuthMode === 'LITE';

    menu.innerHTML = `
        <div class="px-3 py-2 rounded-lg bg-slate-50 border border-slate-100 mb-2">
            <div class="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">Signed In</div>
            <div class="text-sm font-semibold text-slate-800">${signedInLabel}</div>
        </div>
        <button type="button" id="userMenuOptionsBtn" class="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-100">
            Options
        </button>
        ${showLogout ? `
        <button type="button" id="userMenuLogoutBtn" class="w-full text-left px-3 py-2 rounded-lg text-sm text-red-600 hover:bg-red-50">
            Sign out
        </button>
        ` : ''}
    `;

    const optionsBtn = menu.querySelector('#userMenuOptionsBtn');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (event) => {
            event.stopPropagation();
            window.utils?.showToast?.('Options panel will be added soon.', 'info');
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
