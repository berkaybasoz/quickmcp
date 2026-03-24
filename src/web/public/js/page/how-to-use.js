function setupHowToUseEventListeners() {
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
}

function switchHowToTab(which) {
    const tabs = ['installation', 'data', 'setup'];
    const buttons = {
        installation: document.getElementById('tabBtnInstallation'),
        data: document.getElementById('tabBtnData'),
        setup: document.getElementById('tabBtnSetup')
    };

    tabs.forEach((tab) => {
        const el = document.getElementById(`tab-${tab}`);
        const btn = buttons[tab];
        if (!el || !btn) return;

        if (tab === which) {
            el.classList.remove('hidden');
            btn.classList.add('text-blue-600', 'bg-blue-50/50', 'border-b-blue-500');
            btn.classList.remove('text-slate-600', 'border-b-transparent', 'hover:bg-slate-50');
        } else {
            el.classList.add('hidden');
            btn.classList.remove('text-blue-600', 'bg-blue-50/50', 'border-b-blue-500');
            btn.classList.add('text-slate-600', 'border-b-transparent', 'hover:bg-slate-50');
        }
    });
}

function showMethod(method) {
    const integrated = document.getElementById('integratedMethod');
    const individual = document.getElementById('individualMethod');
    const integratedBtn = document.getElementById('integratedBtn');
    const individualBtn = document.getElementById('individualBtn');
    if (!integrated || !individual || !integratedBtn || !individualBtn) return;

    if (method === 'integrated') {
        integrated.classList.remove('hidden');
        individual.classList.add('hidden');

        integratedBtn.classList.add('border-blue-500', 'bg-blue-50/30');
        integratedBtn.classList.remove('border-transparent');
        individualBtn.classList.remove('border-orange-500', 'bg-orange-50/30');
        individualBtn.classList.add('border-transparent');
    } else {
        integrated.classList.add('hidden');
        individual.classList.remove('hidden');

        integratedBtn.classList.remove('border-blue-500', 'bg-blue-50/30');
        integratedBtn.classList.add('border-transparent');
        individualBtn.classList.add('border-orange-500', 'bg-orange-50/30');
        individualBtn.classList.remove('border-transparent');
    }
}

function copyConfig(type, ev) {
    let configText = '';
    if (type === 'integrated') {
        configText = JSON.stringify({
            mcpServers: {
                quickmcp: {
                    command: 'npx',
                    args: ['-y', '@softtechai/quickmcp']
                }
            }
        }, null, 2);
    } else {
        configText = JSON.stringify({
            mcpServers: {
                myServer: {
                    command: 'node',
                    args: ['/path/to/exported/server/index.js']
                }
            }
        }, null, 2);
    }

    navigator.clipboard.writeText(configText).then(() => {
        const btn = ev?.currentTarget || window.event?.currentTarget || window.event?.target;
        if (!(btn instanceof HTMLElement)) return;
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-check mr-1"></i>Copied!';
        btn.classList.remove('bg-slate-700', 'hover:bg-slate-600');
        btn.classList.add('bg-green-600', 'hover:bg-green-500');

        setTimeout(() => {
            btn.innerHTML = originalHtml;
            btn.classList.add('bg-slate-700', 'hover:bg-slate-600');
            btn.classList.remove('bg-green-600', 'hover:bg-green-500');
        }, 2000);
    });
}

window.switchHowToTab = switchHowToTab;
window.showMethod = showMethod;
window.copyConfig = copyConfig;

document.addEventListener('DOMContentLoaded', () => {
    setupHowToUseEventListeners();
    switchHowToTab('installation');
    if (!window.renderSidebar) {
        try { applySidebarCollapsedState(); } catch {}
    }
});

window.addEventListener('load', () => {
    if (!window.renderSidebar) {
        try { initSidebarResizer(); } catch {}
        try { applySidebarCollapsedState(); } catch {}
    }
});
