// Renders the shared sidebar into the #sidebar element on each page
(function () {
  async function resolveAuthMode() {
    try {
      const response = await fetch('/api/auth/config');
      if (!response.ok) return null;
      const payload = await response.json();
      const mode = payload?.data?.authMode;
      return typeof mode === 'string' ? mode : null;
    } catch {
      return null;
    }
  }

  function isActive(path) {
    const p = window.location.pathname.replace(/\/$/, '');
    if (p === '' || p === '/') return path === '/';
    return p === path;
  }

  function navItem(href, icon, title, subtitle, active, iconClass = '') {
    const base = "nav-item card card-hover group relative flex items-center gap-3 p-4 hover:border-blue-300 hover:shadow-blue-500/10 transition-all";
    const activeCls = active
      ? " border-blue-400 shadow-md shadow-blue-500/10 bg-blue-50/30"
      : "";
    const iconBase = iconClass || "bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600";
    return `
      <a href="${href}" class="${base}${activeCls}">
        <div class="relative">
          <div class="p-2.5 rounded-lg shadow-sm transition-colors ${iconBase}">
            <i class="fas ${icon}"></i>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-slate-700 font-semibold text-sm block group-hover:text-blue-700 transition-colors">${title}</span>
          <span class="text-slate-500 text-xs mt-0.5 block font-medium">${subtitle}</span>
        </div>
      </a>
    `;
  }

  function applySidebarCollapsedState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const collapsed = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
    if (collapsed) {
      sidebar.classList.add('collapsed');
      sidebar.style.width = '3rem';
      const icon = collapseBtn?.querySelector('i');
      if (icon) icon.className = 'fas fa-angles-right';
      if (collapseBtn) collapseBtn.title = 'Expand sidebar';
    } else {
      sidebar.classList.remove('collapsed');
      sidebar.style.width = '';
      const icon = collapseBtn?.querySelector('i');
      if (icon) icon.className = 'fas fa-angles-left';
      if (collapseBtn) collapseBtn.title = 'Collapse sidebar';
    }
  }

  function initSidebarResizer() {
    const sidebar = document.getElementById('sidebar');
    const resizer = document.getElementById('sidebarResizer');
    if (!sidebar || !resizer) return;
    if (resizer.dataset.bound === 'true') return;
    resizer.dataset.bound = 'true';

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    const onMove = (event) => {
      if (!isResizing) return;
      const delta = event.clientX - startX;
      const next = Math.max(180, Math.min(420, startWidth + delta));
      sidebar.style.width = `${next}px`;
    };

    const onUp = () => {
      if (!isResizing) return;
      isResizing = false;
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      try { localStorage.setItem('sidebarWidth', sidebar.style.width || ''); } catch {}
    };

    resizer.addEventListener('mousedown', (event) => {
      if (sidebar.classList.contains('collapsed')) return;
      isResizing = true;
      startX = event.clientX;
      startWidth = sidebar.getBoundingClientRect().width;
      document.body.style.userSelect = 'none';
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      event.preventDefault();
    });

    const savedWidth = (function(){ try { return localStorage.getItem('sidebarWidth'); } catch { return null; } })();
    if (savedWidth && !sidebar.classList.contains('collapsed')) {
      sidebar.style.width = savedWidth;
    }
  }

  function wireSidebarInteractions() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const headerRow = document.getElementById('sidebarHeaderRow');
    if (!sidebar) return;

    if (collapseBtn && collapseBtn.dataset.bound !== 'true') {
      collapseBtn.dataset.bound = 'true';
      collapseBtn.addEventListener('click', (event) => {
        event.preventDefault();
        const current = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
        try { localStorage.setItem('sidebarCollapsed', (!current).toString()); } catch {}
        applySidebarCollapsedState();
      });
    }

    if (headerRow && headerRow.dataset.bound !== 'true') {
      headerRow.dataset.bound = 'true';
      headerRow.addEventListener('click', (event) => {
        if (!sidebar.classList.contains('collapsed')) return;
        if (event.target?.closest && event.target.closest('#sidebarCollapseBtn')) return;
        try { localStorage.setItem('sidebarCollapsed', 'false'); } catch {}
        applySidebarCollapsedState();
      });
    }

    applySidebarCollapsedState();
    initSidebarResizer();
  }

  async function renderSidebar() {
    const root = document.getElementById('sidebar');
    if (!root) return;
    root.setAttribute('data-ready', '0');

    // Ensure base container classes exist (for pages that only mount an empty div)
    if (!root.className) {
      root.className = 'w-72 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col flex-shrink-0 z-40 fixed inset-y-0 left-0 transform -translate-x-full lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out lg:h-auto h-full pt-16 lg:pt-0';
    }

    // Respect saved collapsed state before any async work
    const preferCollapsed = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
    if (preferCollapsed) {
      root.classList.add('collapsed');
      root.style.width = '3rem';
    }

    const authMode = await resolveAuthMode();
    const showAuthManagement = authMode !== 'NONE';

    const html = `
      <div class="p-6 border-b border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-white/50">
        <div id="sidebarHeaderRow" class="flex items-center justify-between mb-2">
          <div id="sidebarHeaderMain" class="flex items-center gap-3">
            <div class="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg shadow-lg shadow-emerald-500/25">
              <i class="fas fa-compass text-white"></i>
            </div>
            <div>
              <h2 class="text-slate-900 font-bold tracking-tight text-lg">Navigation</h2>
              <p class="text-slate-500 text-xs leading-none font-medium">Application Pages</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button id="sidebarCollapseBtn" class="hidden lg:inline-flex text-slate-400 hover:text-slate-600" title="Collapse sidebar">
              <i class="fas fa-angles-left"></i>
            </button>
            <button id="closeSidebar" class="lg:hidden text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <div id="sidebarNavList" class="p-4 overflow-y-auto flex-1 scrollbar-modern space-y-3">
        ${navItem('/', 'fa-magic', 'Generate Server', 'Create new MCP servers', isActive('/'))}
        ${navItem('/manage-servers', 'fa-server', 'Manage Servers', 'Edit & Control', isActive('/manage-servers'))}
        ${navItem('/test-servers', 'fa-vial', 'Test Servers', 'Verify functionality', isActive('/test-servers'))}
        ${showAuthManagement ? navItem('/authorization', 'fa-key', 'Authorization', 'MCP token policy', isActive('/authorization'), 'bg-amber-100 text-amber-700 group-hover:bg-amber-200') : ''}
        ${showAuthManagement ? navItem('/users', 'fa-users', 'Users', 'User management', isActive('/users'), 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200') : ''}
        ${navItem('/how-to-use', 'fa-book', 'How to Use', 'Documentation & Guide', isActive('/how-to-use'))}
      </div>

      <div id="sidebarResizer" class="hidden lg:block absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent"></div>
    `;

    root.innerHTML = html;
    // Update collapse icon direction immediately
    if (preferCollapsed) {
      const icon = root.querySelector('#sidebarCollapseBtn i');
      if (icon) icon.className = 'fas fa-angles-right';
    }
    wireSidebarInteractions();
    root.setAttribute('data-ready', '1');
  }

  // auto-render on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', renderSidebar);

  // expose for manual calls if needed
  window.renderSidebar = renderSidebar;
})();
