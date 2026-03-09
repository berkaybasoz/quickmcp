// Renders the shared sidebar into the #sidebar element on each page
(function () {
  async function resolveAuthMode() {
    try {
      const response = await fetch('/api/auth/config');
      if (!response.ok) return null;
      const payload = await response.json();
      const mode = payload?.data?.authMode;
      const deployMode = payload?.data?.deployMode;
      const usersEnabled = payload?.data?.usersEnabled;
      return {
        authMode: typeof mode === 'string' ? mode : null,
        deployMode: typeof deployMode === 'string' ? deployMode : '',
        usersEnabled: usersEnabled !== false
      };
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
    const base = "nav-item group relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors";
    const activeCls = active
      ? " active bg-slate-100 text-slate-900"
      : "";
    const iconBase = iconClass || "bg-transparent text-slate-500";
    const currentAttr = active ? ' aria-current="page"' : '';
    return `
      <a href="${href}" class="${base}${activeCls}"${currentAttr}>
        <div class="relative">
          <div class="w-8 h-8 flex items-center justify-center rounded-md transition-colors ${iconBase}">
            <i class="fas ${icon}"></i>
          </div>
        </div>
        <div class="flex-1 min-w-0">
          <span class="text-slate-700 font-medium text-sm block">${title}</span>
          <span class="text-slate-500 text-xs mt-0.5 block">${subtitle}</span>
        </div>
      </a>
    `;
  }

  function getSidebarPanelIconSvg() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="h-5 w-5 flex-shrink-0" aria-hidden="true">
        <rect width="18" height="18" x="3" y="3" rx="2"></rect>
        <path d="M9 3v18"></path>
      </svg>
    `;
  }

  function setSidebarCollapseIcon() {
    const iconWrap = document.getElementById('sidebarCollapseIcon');
    if (!iconWrap) return;
    iconWrap.innerHTML = getSidebarPanelIconSvg();
  }

  function normalizeSidebarWidth(value, fallback = '18rem') {
    const raw = String(value || '').trim();
    if (!raw) return fallback;
    if (raw.endsWith('px') || raw.endsWith('rem')) return raw;
    const num = Number(raw);
    if (Number.isFinite(num) && num > 0) return `${num}px`;
    return fallback;
  }

  function syncDesktopLayoutOffset(sidebar) {
    if (!sidebar) return;
    const collapsed = sidebar.classList.contains('collapsed');
    const measuredWidth = Math.round(sidebar.getBoundingClientRect().width || 0);
    const expanded = measuredWidth > 0 && !collapsed
      ? `${measuredWidth}px`
      : normalizeSidebarWidth(
          sidebar.style.width
          || (function(){ try { return localStorage.getItem('sidebarWidth'); } catch { return null; } })(),
          '18rem'
        );
    const offset = collapsed ? '3rem' : expanded;
    document.documentElement.style.setProperty('--sidebar-offset', offset);
    if (document.body) document.body.setAttribute('data-has-sidebar', '1');

    // Force layout sync to prevent header/sidebar overlap during collapse/expand transitions.
    const isDesktop = window.matchMedia('(min-width: 1024px)').matches;
    const header = document.querySelector('body > header');
    const layouts = document.querySelectorAll('.app-main-layout');
    if (isDesktop) {
      if (header instanceof HTMLElement) {
        header.style.marginLeft = offset;
        header.style.width = `calc(100% - ${offset})`;
      }
      layouts.forEach((layout) => {
        if (layout instanceof HTMLElement) {
          layout.style.paddingLeft = `calc(${offset} + var(--sidebar-gutter, 0px))`;
        }
      });
    } else {
      if (header instanceof HTMLElement) {
        header.style.marginLeft = '';
        header.style.width = '';
      }
      layouts.forEach((layout) => {
        if (layout instanceof HTMLElement) {
          layout.style.paddingLeft = '';
        }
      });
    }
  }

  function applySidebarCollapsedState() {
    const sidebar = document.getElementById('sidebar');
    if (!sidebar) return;
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const collapsed = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
    if (collapsed) {
      sidebar.classList.add('collapsed');
      sidebar.style.width = '3rem';
      setSidebarCollapseIcon();
      if (collapseBtn) collapseBtn.title = 'Expand sidebar';
    } else {
      sidebar.classList.remove('collapsed');
      const savedWidth = (function(){ try { return localStorage.getItem('sidebarWidth'); } catch { return null; } })();
      sidebar.style.width = normalizeSidebarWidth(savedWidth, '');
      setSidebarCollapseIcon();
      if (collapseBtn) collapseBtn.title = 'Collapse sidebar';
    }
    syncDesktopLayoutOffset(sidebar);
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
      syncDesktopLayoutOffset(sidebar);
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
    syncDesktopLayoutOffset(sidebar);
  }

  function wireSidebarInteractions() {
    const sidebar = document.getElementById('sidebar');
    const collapseBtn = document.getElementById('sidebarCollapseBtn');
    const headerToggleBtn = document.getElementById('sidebarHeaderToggle');
    const headerRow = document.getElementById('sidebarHeaderRow');
    if (!sidebar) return;

    if (collapseBtn && collapseBtn.dataset.bound !== 'true') {
      collapseBtn.dataset.bound = 'true';
      collapseBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
        try { localStorage.setItem('sidebarCollapsed', (!current).toString()); } catch {}
        applySidebarCollapsedState();
      });
    }

    if (headerRow && headerRow.dataset.bound !== 'true') {
      headerRow.dataset.bound = 'true';
      headerRow.addEventListener('click', (event) => {
        if (!sidebar.classList.contains('collapsed')) return;
        const clickedToggle = Array.isArray(event.composedPath?.())
          ? event.composedPath().some((el) => el && (el.id === 'sidebarCollapseBtn' || el.id === 'sidebarHeaderToggle'))
          : !!(event.target?.closest && (event.target.closest('#sidebarCollapseBtn') || event.target.closest('#sidebarHeaderToggle')));
        if (clickedToggle) return;
        try { localStorage.setItem('sidebarCollapsed', 'false'); } catch {}
        applySidebarCollapsedState();
      });
    }

    if (headerToggleBtn && headerToggleBtn.dataset.bound !== 'true') {
      headerToggleBtn.dataset.bound = 'true';
      headerToggleBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const current = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
        try { localStorage.setItem('sidebarCollapsed', (!current).toString()); } catch {}
        applySidebarCollapsedState();
      });
    }

    applySidebarCollapsedState();
    initSidebarResizer();
    if (!window.__quickmcpSidebarResizeBound) {
      window.__quickmcpSidebarResizeBound = true;
      window.addEventListener('resize', () => syncDesktopLayoutOffset(document.getElementById('sidebar')));
    }
  }

  async function renderSidebar() {
    const root = document.getElementById('sidebar');
    if (!root) return;
    root.setAttribute('data-ready', '0');

    // Ensure base container classes exist (for pages that only mount an empty div)
    if (!root.className) {
      root.className = 'w-72 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col flex-shrink-0 z-40 fixed inset-y-0 left-0 transform -translate-x-full lg:translate-x-0 lg:top-0 lg:h-screen transition-transform duration-300 ease-in-out h-full pt-16 lg:pt-0';
    }

    // Respect saved collapsed state before any async work
    const preferCollapsed = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
    if (preferCollapsed) {
      root.classList.add('collapsed');
      root.style.width = '3rem';
    }

    const authCfg = await resolveAuthMode();
    const authMode = authCfg?.authMode || null;
    const deployMode = (authCfg?.deployMode || '').toUpperCase();
    const showAuthManagement = authMode !== 'NONE';
    const showUsers = showAuthManagement && authCfg?.usersEnabled !== false && deployMode !== 'SAAS';

    const html = `
      <div class="p-4 border-b border-slate-200/60 bg-white">
        <div id="sidebarHeaderRow" class="flex items-center justify-start gap-2 mb-2">
          <div id="sidebarHeaderToggleWrap" class="flex items-center gap-2">
            <button id="sidebarHeaderToggle" type="button" class="w-7 h-7 flex items-center justify-center rounded-md bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors" title="Toggle sidebar">
              <i class="fas fa-bars"></i>
            </button>
          </div>
          <div id="sidebarHeaderMain" class="flex items-center gap-3">
            <div>
              <h2 class="text-slate-900 font-semibold tracking-tight text-sm">Menu</h2>
              <p class="text-slate-500 text-xs leading-none">Pages</p>
            </div>
          </div>
          <div id="sidebarHeaderActions" class="flex items-center gap-2 ml-auto">
            <button id="closeSidebar" class="lg:hidden text-slate-400 hover:text-slate-600">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </div>
      </div>

      <div id="sidebarNavList" class="p-3 overflow-y-auto flex-1 scrollbar-modern space-y-1.5">
        ${navItem('/', 'fa-magic', 'Generate Server', 'Create new MCP servers', isActive('/'))}
        ${navItem('/manage-servers', 'fa-server', 'Manage Servers', 'Edit & Control', isActive('/manage-servers'))}
        ${navItem('/test-servers', 'fa-vial', 'Test Servers', 'Verify functionality', isActive('/test-servers'))}
        ${showAuthManagement ? navItem('/authorization', 'fa-key', 'Authorization', 'MCP token policy', isActive('/authorization'), 'bg-amber-100 text-amber-700 group-hover:bg-amber-200') : ''}
        ${showUsers ? navItem('/users', 'fa-users', 'Users', 'User management', isActive('/users'), 'bg-emerald-100 text-emerald-700 group-hover:bg-emerald-200') : ''}
        ${navItem('/how-to-use', 'fa-book', 'How to Use', 'Documentation & Guide', isActive('/how-to-use'))}
      </div>

      <div id="sidebarResizer" class="hidden lg:block absolute top-0 right-0 h-full w-1 cursor-col-resize bg-transparent"></div>
    `;

    root.innerHTML = html;
    setSidebarCollapseIcon();
    wireSidebarInteractions();
    syncDesktopLayoutOffset(root);
    root.setAttribute('data-ready', '1');
  }

  // auto-render (works both before and after DOMContentLoaded)
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderSidebar);
  } else {
    renderSidebar();
  }

  // expose for manual calls if needed
  window.renderSidebar = renderSidebar;
})();
