(() => {
  const UI_THEME_COOKIE_NAME = 'quickmcp_ui_theme';
  const UI_THEME_LIGHT = 'light';
  const UI_THEME_DARK = 'dark';
  let currentTheme = UI_THEME_LIGHT;
  let themeToggleObserver = null;
  let runtimeInitStarted = false;

  function sanitizeThemeValue(value) {
    const raw = String(value || '').trim().toLowerCase();
    return raw === UI_THEME_DARK ? UI_THEME_DARK : UI_THEME_LIGHT;
  }

  function getSystemTheme() {
    try {
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? UI_THEME_DARK
        : UI_THEME_LIGHT;
    } catch {
      return UI_THEME_LIGHT;
    }
  }

  function getThemeFromCookie() {
    try {
      const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${UI_THEME_COOKIE_NAME}=(dark|light)(?:;|$)`, 'i'));
      const raw = String(match?.[1] || '').trim().toLowerCase();
      if (raw === UI_THEME_DARK || raw === UI_THEME_LIGHT) return raw;
      return '';
    } catch {
      return '';
    }
  }

  function getPreferredTheme() {
    const rootTheme = String(document.documentElement?.getAttribute('data-theme') || '').trim().toLowerCase();
    if (rootTheme === UI_THEME_DARK || rootTheme === UI_THEME_LIGHT) return rootTheme;
    const cookieTheme = getThemeFromCookie();
    if (cookieTheme) return cookieTheme;
    return getSystemTheme();
  }

  async function getThemeFromDataStore() {
    try {
      const response = await fetch('/api/ui/theme', { method: 'GET' });
      if (!response.ok) return '';
      const payload = await response.json().catch(() => ({}));
      if (!payload?.success) return '';
      const raw = String(payload?.data?.theme || '').trim().toLowerCase();
      if (raw === UI_THEME_DARK || raw === UI_THEME_LIGHT) return raw;
      return '';
    } catch {
      return '';
    }
  }

  async function saveThemeToDataStore(theme) {
    const next = sanitizeThemeValue(theme);
    try {
      await fetch('/api/ui/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: next })
      });
    } catch {}
  }

  function syncThemeToggleButton(themeInput) {
    const button = document.getElementById('themeToggleBtn');
    if (!button) return;
    const theme = themeInput === UI_THEME_DARK ? UI_THEME_DARK : UI_THEME_LIGHT;
    const sunIcon = button.querySelector('[data-theme-icon="sun"]');
    const moonIcon = button.querySelector('[data-theme-icon="moon"]');
    if (sunIcon) sunIcon.classList.toggle('hidden', theme !== UI_THEME_DARK);
    if (moonIcon) moonIcon.classList.toggle('hidden', theme === UI_THEME_DARK);
    const nextLabel = theme === UI_THEME_DARK ? 'Switch to light mode' : 'Switch to dark mode';
    button.setAttribute('aria-label', nextLabel);
    button.setAttribute('title', nextLabel);
  }

  function applyTheme(mode) {
    const theme = sanitizeThemeValue(mode);
    const root = document.documentElement;
    root.classList.toggle('dark', theme === UI_THEME_DARK);
    root.setAttribute('data-theme', theme);
    currentTheme = theme;
    syncThemeToggleButton(theme);
    return theme;
  }

  function setupThemeToggle() {
    const button = document.getElementById('themeToggleBtn');
    if (!button || button.dataset.boundThemeToggle === 'true') {
      syncThemeToggleButton(currentTheme);
      return !!button;
    }
    button.dataset.boundThemeToggle = 'true';
    button.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const next = isDark ? UI_THEME_LIGHT : UI_THEME_DARK;
      applyTheme(next);
      saveThemeToDataStore(next);
    });
    syncThemeToggleButton(currentTheme);
    return true;
  }

  function ensureThemeToggleBinding() {
    if (setupThemeToggle()) return;
    if (themeToggleObserver) return;
    themeToggleObserver = new MutationObserver(() => {
      if (setupThemeToggle()) {
        try {
          themeToggleObserver?.disconnect();
        } catch {}
        themeToggleObserver = null;
      }
    });
    themeToggleObserver.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function hydrateThemeFromStore() {
    const storedTheme = await getThemeFromDataStore();
    if (storedTheme) {
      applyTheme(storedTheme);
    }
  }

  function initThemeRuntime() {
    if (runtimeInitStarted) return;
    runtimeInitStarted = true;
    const run = () => {
      ensureThemeToggleBinding();
      hydrateThemeFromStore();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', run, { once: true });
    } else {
      run();
    }
  }

  window.QuickMCPTheme = {
    applyTheme,
    getPreferredTheme,
    getThemeFromDataStore,
    saveThemeToDataStore,
    setupThemeToggle,
    initThemeRuntime,
    syncThemeToggleButton,
    getCurrentTheme: () => currentTheme
  };

  applyTheme(getPreferredTheme());
  initThemeRuntime();
})();
