// Renders the shared sidebar into the #sidebar element on each page
(function () {
  function isActive(path) {
    const p = window.location.pathname.replace(/\/$/, '');
    if (p === '' || p === '/') return path === '/';
    return p === path;
  }

  function navItem(href, icon, title, subtitle, active) {
    const base = "nav-item card card-hover group relative flex items-center gap-3 p-4 hover:border-blue-300 hover:shadow-blue-500/10 transition-all";
    const activeCls = active
      ? " border-blue-400 shadow-md shadow-blue-500/10 bg-blue-50/30"
      : "";
    return `
      <a href="${href}" class="${base}${activeCls}">
        <div class="relative">
          <div class="p-2.5 rounded-lg shadow-sm bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
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

  function renderSidebar() {
    const root = document.getElementById('sidebar');
    if (!root) return;

    // Ensure base container classes exist (for pages that only mount an empty div)
    if (!root.className) {
      root.className = 'w-72 bg-white/95 backdrop-blur-sm border-r border-slate-200/60 flex flex-col flex-shrink-0 z-40 fixed inset-y-0 left-0 transform -translate-x-full lg:relative lg:translate-x-0 transition-transform duration-300 ease-in-out lg:h-auto h-full pt-16 lg:pt-0';
    }

    // Respect saved collapsed state before painting
    const preferCollapsed = (function(){ try { return localStorage.getItem('sidebarCollapsed') === 'true'; } catch { return false; } })();
    if (preferCollapsed) {
      root.classList.add('collapsed');
      root.style.width = '3rem';
    }

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
  }

  // auto-render on DOMContentLoaded
  document.addEventListener('DOMContentLoaded', renderSidebar);

  // expose for manual calls if needed
  window.renderSidebar = renderSidebar;
})();
