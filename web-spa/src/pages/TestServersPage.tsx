import { useEffect } from 'react';

declare global {
  interface Window {
    initializeTestServersPage?: () => void;
    loadTestServers?: () => Promise<void> | void;
    __quickmcpTestServersScriptLoaded?: boolean;
    __quickmcpTestServersScriptLoading?: Promise<void>;
  }
}

function ensureTestServersScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.__quickmcpTestServersScriptLoaded) return Promise.resolve();
  if (window.__quickmcpTestServersScriptLoading) return window.__quickmcpTestServersScriptLoading;

  const existing = document.querySelector('script[data-spa-test-servers-script="true"]') as HTMLScriptElement | null;
  if (existing) {
    if (existing.getAttribute('data-loaded') === 'true' || typeof window.initializeTestServersPage === 'function') {
      window.__quickmcpTestServersScriptLoaded = true;
      return Promise.resolve();
    }
    window.__quickmcpTestServersScriptLoading = new Promise<void>((resolve, reject) => {
      existing.addEventListener('load', () => {
        window.__quickmcpTestServersScriptLoaded = true;
        resolve();
      }, { once: true });
      existing.addEventListener('error', () => reject(new Error('Failed to load test-servers.js')), { once: true });
    });
    return window.__quickmcpTestServersScriptLoading;
  }

  window.__quickmcpTestServersScriptLoading = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = '/js/page/test-servers.js';
    script.async = true;
    script.defer = true;
    script.setAttribute('data-spa-test-servers-script', 'true');
    script.onload = () => {
      script.setAttribute('data-loaded', 'true');
      window.__quickmcpTestServersScriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load test-servers.js'));
    document.body.appendChild(script);
  }).finally(() => {
    window.__quickmcpTestServersScriptLoading = undefined;
  });

  return window.__quickmcpTestServersScriptLoading;
}

export function TestServersPage() {
  useEffect(() => {
    let active = true;
    const previousTitle = document.title;
    document.title = 'QuickMCP - Modern MCP Server Generator';
    document.body.classList.add('test-page');

    void ensureTestServersScript()
      .then(() => {
        if (!active) return;
        window.initializeTestServersPage?.();
        void window.loadTestServers?.();
      })
      .catch(() => {});

    return () => {
      active = false;
      document.title = previousTitle;
      document.body.classList.remove('test-page');
    };
  }, []);

  return (
    <div className="flex-1 min-h-0 min-w-0 relative overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-modern px-8 pt-0 pb-8 relative z-0">
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          <div id="test-tab" className="tab-content animate-fade-in">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900">Test Suite</h2>
              <p className="text-slate-600">Verify your server functionality.</p>
            </div>

            <div className="card mb-6 p-0 overflow-hidden">
              <div className="border-b border-slate-200 bg-slate-50/80">
                <div className="px-5 pt-4">
                  <nav className="flex items-end gap-1" aria-label="Test Suite tabs">
                    <button
                      type="button"
                      data-test-mode-tab="automated"
                      className="px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-slate-200 border-b-white bg-white text-slate-900 -mb-px"
                    >
                      Automated Testing
                    </button>
                    <button
                      type="button"
                      data-test-mode-tab="custom"
                      className="px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-600 hover:text-blue-700 hover:bg-white/70"
                    >
                      Custom Request
                    </button>
                    <button
                      type="button"
                      data-test-mode-tab="e2e"
                      data-test-mode-locked="true"
                      disabled
                      aria-disabled="true"
                      title="E2E Testing yakında aktif olacak"
                      className="px-4 py-2.5 rounded-t-lg text-sm font-semibold border border-transparent text-slate-400 cursor-not-allowed"
                    >
                      <i className="fas fa-lock mr-2 text-xs"></i>
                      E2E Testing
                    </button>
                  </nav>
                </div>
              </div>

              <div className="p-6" data-test-mode-panel="automated">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Server</label>
                    <select id="autoTestServerSelect" className="input"></select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Type</label>
                    <select id="autoTestType" className="input">
                      <option value="quick">Quick Test</option>
                      <option value="full">Full Test</option>
                    </select>
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      id="runAutoTestsBtn"
                      className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md whitespace-nowrap"
                    >
                      <i id="autoTestRunIcon" className="fas fa-play mr-2"></i>
                      <span id="autoTestRunText">Run</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6 hidden" data-test-mode-panel="custom">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Server</label>
                    <select id="customTestServerSelect" className="input"></select>
                    <select id="testServerSelect" className="hidden"></select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Type</label>
                      <select id="testType" className="input">
                        <option value="tools/call">Tool Call</option>
                        <option value="resources/list">Resource List</option>
                        <option value="prompts/list">Prompt List</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Name</label>
                      <div id="testNameContainer">
                        <input type="text" id="testName" placeholder="tool_name" className="input" />
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Params (JSON)</label>
                    <textarea id="testParams" rows={3} className="input font-mono text-xs" placeholder="{}"></textarea>
                  </div>
                  <button
                    type="button"
                    id="runCustomTestBtn"
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md"
                  >
                    Send Request
                  </button>
                </div>
              </div>

              <div className="p-6 hidden" data-test-mode-panel="e2e">
                <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_220px_auto] gap-3 items-end">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select Server</label>
                    <select id="transportTestServerSelect" className="input"></select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Transport</label>
                    <select id="transportType" className="input">
                      <option value="all">All</option>
                      <option value="stdio">STDIO</option>
                      <option value="sse">SSE</option>
                      <option value="streamable-http">Streamable HTTP</option>
                      <option value="websocket">WebSocket</option>
                    </select>
                  </div>
                  <div className="flex">
                    <button
                      type="button"
                      id="runTransportTestBtn"
                      className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors shadow-md whitespace-nowrap"
                    >
                      <i className="fas fa-network-wired mr-2"></i>
                      Run Transport Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div id="test-loading" className="hidden text-center text-sm text-blue-600 py-2">Running...</div>
            <div id="test-error" className="hidden text-sm text-red-600 bg-red-50 p-3 rounded"></div>

            <div className="card mt-8">
              <div className="p-4 border-b border-slate-200/60 bg-slate-50/50 flex justify-between items-center">
                <h3 className="font-bold text-slate-900">Results</h3>
                <span className="text-xs text-slate-500 font-mono">JSON Output</span>
              </div>
              <div className="p-0">
                <pre
                  id="test-results"
                  className="hidden bg-white dark:bg-slate-900 text-slate-800 dark:text-blue-300 p-6 text-xs font-mono overflow-auto max-h-96 border border-slate-200 dark:border-slate-700 rounded-lg whitespace-pre-wrap"
                ></pre>
                <div id="no-results" className="p-12 text-center text-slate-400">
                  <i className="fas fa-terminal text-3xl mb-3 opacity-50"></i>
                  <p>No results to display</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
