// Shared utility functions for QuickMCP

// DataSourceType enum mirror (matches TypeScript enum in types/index.ts)
const DataSourceType = {
    Database: 'database',
    CSV: 'csv',
    Excel: 'excel',
    JSON: 'json',
    Curl: 'curl',
    Webpage: 'webpage',
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
    Elasticsearch: 'elasticsearch'
};

// Data source types that don't require table selection (runtime execution)
// These types generate their own tools and don't need parsed table data
function isNoTableDataSource(type) {
    const noTableTypes = [
        DataSourceType.Webpage,
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
        DataSourceType.Elasticsearch
    ];
    return noTableTypes.includes(type);
}

// Initialize sidebar functionality
document.addEventListener('DOMContentLoaded', function() {
    // Close sidebar when overlay is clicked on mobile
    const overlay = document.getElementById('sidebarOverlay');
    if (overlay) {
        overlay.addEventListener('click', closeSidebar);
    }

    // Handle responsive behavior
    window.addEventListener('resize', handleResize);
    handleResize();
});

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
