import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const SCRIPT_SKIP_LIST = new Set(['/js/logger.js', '/js/shared.js', '/js/theme.js']);
const loadedExternalScripts = new Set<string>();

type LegacyPageViewProps = {
  pageFile: string;
};

function normalizeAssetPath(rawSrc: string): string {
  const src = String(rawSrc || '').trim();
  if (!src) return '';
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  if (src.startsWith('../')) return src.slice(2);
  if (src.startsWith('./')) return src.slice(1);
  return src.startsWith('/') ? src : `/${src}`;
}

function removeOldPageHeadStyles() {
  document.querySelectorAll('style[data-spa-page-style="true"]').forEach((node) => node.remove());
}

function mountPageHeadStyles(doc: Document) {
  removeOldPageHeadStyles();
  const styleNodes = Array.from(doc.head.querySelectorAll('style'));
  styleNodes.forEach((styleNode, index) => {
    const style = document.createElement('style');
    style.dataset.spaPageStyle = 'true';
    style.dataset.spaPageStyleIndex = String(index);
    style.textContent = styleNode.textContent || '';
    document.head.appendChild(style);
  });
}

function removeOldInlineScripts() {
  document.querySelectorAll('script[data-spa-inline-script="true"]').forEach((node) => node.remove());
}

function runInlineBodyScripts(doc: Document) {
  removeOldInlineScripts();
  const inlineScripts = Array.from(doc.body.querySelectorAll('script:not([src])'));
  inlineScripts.forEach((scriptNode) => {
    const next = document.createElement('script');
    next.dataset.spaInlineScript = 'true';
    const source = scriptNode.textContent || '';
    // Run page inline scripts in an isolated scope so revisits don't redeclare top-level let/const variables.
    next.textContent = `(function(){\n${source}\n})();`;
    document.body.appendChild(next);
  });
}

function waitForDomCommit(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function ensureExternalScript(src: string): Promise<void> {
  if (!src || src.startsWith('http://') || src.startsWith('https://')) return Promise.resolve();
  if (loadedExternalScripts.has(src)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const selector = `script[data-spa-script-src="${src.replace(/"/g, '\\"')}"]`;
    const existing = document.querySelector(selector) as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.loaded === 'true') {
        loadedExternalScripts.add(src);
        resolve();
        return;
      }
      existing.addEventListener('load', () => {
        loadedExternalScripts.add(src);
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.dataset.spaScriptSrc = src;
    script.addEventListener('load', () => {
      script.dataset.loaded = 'true';
      loadedExternalScripts.add(src);
      resolve();
    }, { once: true });
    script.addEventListener('error', () => reject(new Error(`Failed to load script: ${src}`)), { once: true });
    document.body.appendChild(script);
  });
}

function initializeLegacyPage(pageFile: string) {
  const runtime = window as any;

  if (pageFile === 'quick-ask.html') {
    runtime.setupQuickAskPageEventListeners?.();
    runtime.initializeQuickAsk?.();
    return;
  }

  if (pageFile === 'generate.html') {
    runtime.setupEventListeners?.();
    try { runtime.setupTemplateFilters?.(); } catch {}
    runtime.setupFileUpload?.();
    runtime.applySaasDataSourceRestrictions?.();
    runtime.setupRouting?.();
    runtime.handleInitialRoute?.();
    runtime.toggleDataSourceFields?.();
    runtime.updateWizardNavigation?.();
    return;
  }

  if (pageFile === 'manage-servers.html') {
    runtime.setupManageServersEventListeners?.();
    runtime.setupRouting?.();
    runtime.handleInitialRoute?.();
    if (document.getElementById('server-list')) {
      runtime.initializeManageServersPage?.();
    }
    return;
  }

  if (pageFile === 'test-servers.html') {
    runtime.initializeTestServersPage?.();
    return;
  }

  if (pageFile === 'how-to-use.html') {
    runtime.setupHowToUseEventListeners?.();
    runtime.switchHowToTab?.('installation');
    return;
  }
}

export function LegacyPageView({ pageFile }: LegacyPageViewProps) {
  const location = useLocation();
  const [mainClassName, setMainClassName] = useState('flex-1 relative overflow-hidden flex flex-col min-w-0');
  const [mainHtml, setMainHtml] = useState('');

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const response = await fetch(`/page/${pageFile}`, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to fetch /page/${pageFile}: ${response.status}`);
        }

        const html = await response.text();
        if (cancelled) return;

        const doc = new DOMParser().parseFromString(html, 'text/html');
        const legacyMain = doc.querySelector('.app-main-layout > .flex-1') as HTMLElement | null;

        const bodyClassName = String(doc.body?.className || '').trim();
        if (bodyClassName) {
          document.body.className = bodyClassName;
        }
        document.title = doc.title || 'QuickMCP';

        const root = document.getElementById('root');
        if (root) {
          root.className = 'h-screen flex flex-col';
        }

        mountPageHeadStyles(doc);

        setMainClassName(legacyMain?.className || 'flex-1 relative overflow-hidden flex flex-col min-w-0');
        setMainHtml(legacyMain?.innerHTML || '<div class="p-8 text-sm text-red-600">Page content could not be loaded.</div>');
        await waitForDomCommit();

        const pageScriptSources = Array.from(doc.querySelectorAll('script[src]'))
          .map((node) => normalizeAssetPath(node.getAttribute('src') || ''))
          .filter((src) => !!src)
          .filter((src) => !SCRIPT_SKIP_LIST.has(src))
          .filter((src) => src.startsWith('/js/page/'));

        for (const scriptSrc of pageScriptSources) {
          await ensureExternalScript(scriptSrc);
        }

        runInlineBodyScripts(doc);

        if (cancelled) return;

        requestAnimationFrame(() => {
          const runtime = window as any;
          initializeLegacyPage(pageFile);
        });
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Unknown page load error';
        setMainClassName('flex-1 relative overflow-hidden flex flex-col min-w-0');
        setMainHtml(`<div class="p-8"><div class="card p-4 text-sm text-red-700">${message}</div></div>`);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [pageFile, location.search]);

  return (
    <div className={mainClassName} dangerouslySetInnerHTML={{ __html: mainHtml }} />
  );
}
