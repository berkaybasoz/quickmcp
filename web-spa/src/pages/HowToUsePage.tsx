import { useEffect, useState } from 'react';

type HowToTab = 'installation' | 'data' | 'setup';
type SetupMethod = 'integrated' | 'individual';
type CopyType = SetupMethod | null;

const INTEGRATED_CONFIG = `{
  "mcpServers": {
    "quickmcp": {
      "command": "npx",
      "args": ["-y", "@softtechai/quickmcp"]
    }
  }
}`;

const INDIVIDUAL_CONFIG = `{
  "mcpServers": {
    "my-server": {
      "command": "node",
      "args": ["/path/to/exported/server/index.js"]
    }
  }
}`;

function tabButtonClass(active: boolean, withRightBorder: boolean): string {
  const base = 'howto-tab-btn flex-1 px-6 py-4 text-sm transition-all';
  const border = withRightBorder ? ' border-r border-slate-200' : '';
  if (active) {
    return `${base}${border} font-semibold text-blue-600 bg-blue-50/50 border-b-2 border-b-blue-500`;
  }
  return `${base}${border} font-medium text-slate-600 hover:bg-slate-50 border-b-2 border-b-transparent`;
}

export function HowToUsePage() {
  const [activeTab, setActiveTab] = useState<HowToTab>('installation');
  const [setupMethod, setSetupMethod] = useState<SetupMethod>('integrated');
  const [copiedType, setCopiedType] = useState<CopyType>(null);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'How to Use - QuickMCP';
    document.body.classList.add('howto-page');
    return () => {
      document.title = previousTitle;
      document.body.classList.remove('howto-page');
    };
  }, []);

  const copyConfig = async (type: SetupMethod) => {
    const text = type === 'integrated' ? INTEGRATED_CONFIG : INDIVIDUAL_CONFIG;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const temp = document.createElement('textarea');
        temp.value = text;
        temp.setAttribute('readonly', 'true');
        temp.style.position = 'absolute';
        temp.style.left = '-9999px';
        document.body.appendChild(temp);
        temp.select();
        document.execCommand('copy');
        temp.remove();
      }
      setCopiedType(type);
      window.setTimeout(() => setCopiedType((current) => (current === type ? null : current)), 2000);
    } catch {
      setCopiedType(null);
    }
  };

  return (
    <>
      <div className="flex-1 relative overflow-hidden flex flex-col min-w-0">
        <div className="flex-1 overflow-y-auto scrollbar-modern p-8 relative z-0">
          <div className="max-w-5xl mx-auto space-y-8 pb-20">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-bold text-slate-900 mb-3">MCP Server Integration Guide</h2>
              <p className="text-slate-600 max-w-2xl mx-auto">Learn how to integrate your generated MCP servers with Claude Desktop and other platforms using our streamlined workflow.</p>
            </div>

            <div id="howtoTabsWrap" className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mb-6">
              <div id="howtoTabsRow" className="flex border-b border-slate-200">
                <button
                  id="tabBtnInstallation"
                  type="button"
                  className={tabButtonClass(activeTab === 'installation', true)}
                  onClick={() => setActiveTab('installation')}
                >
                  <i className="fas fa-download mr-2"></i>Installation
                </button>
                <button
                  id="tabBtnData"
                  type="button"
                  className={tabButtonClass(activeTab === 'data', true)}
                  onClick={() => setActiveTab('data')}
                >
                  <i className="fas fa-database mr-2"></i>Data Configuration
                </button>
                <button
                  id="tabBtnSetup"
                  type="button"
                  className={tabButtonClass(activeTab === 'setup', false)}
                  onClick={() => setActiveTab('setup')}
                >
                  <i className="fas fa-cog mr-2"></i>Claude Desktop Setup
                </button>
              </div>
            </div>

            {activeTab === 'installation' ? (
              <div id="tab-installation" className="space-y-6 animate-fade-in">
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center text-sm"><i className="fas fa-terminal"></i></span>
                    Installation & Running
                  </h3>
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Option 1: Global Installation (Recommended)</h4>
                      <div className="bg-slate-900 rounded-xl p-4 shadow-inner">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-slate-400">Terminal</span>
                        </div>
                        <code className="text-sm text-green-400 font-mono">npm i -g @softtechai/quickmcp</code>
                        <div className="mt-2 border-t border-slate-700 pt-2">
                          <code className="text-sm text-blue-400 font-mono">quickmcp</code>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2">Option 2: Run with npx</h4>
                      <div className="bg-slate-900 rounded-xl p-4 shadow-inner">
                        <code className="text-sm text-yellow-400 font-mono">npx -y @softtechai/quickmcp</code>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="card p-6 border-l-4 border-l-blue-500">
                  <div className="flex gap-4">
                    <div className="text-blue-500 text-xl"><i className="fas fa-info-circle"></i></div>
                    <div>
                      <h4 className="font-semibold text-slate-900">Default Ports</h4>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600">
                        <li><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">http://localhost:3000</span> - Web Interface (This Page)</li>
                        <li><span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-800">http://localhost:3001</span> - MCP Server (Claude Connection)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'data' ? (
              <div id="tab-data" className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">1</div>
                      <h4 className="font-semibold text-slate-900">Start Generation</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Begin by navigating to the Generate Server page.</p>
                    <img src="/images/readme/1-generate-servers.png" alt="Generate" className="rounded-lg border border-slate-200 shadow-sm w-full" />
                  </div>

                  <div className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">2</div>
                      <h4 className="font-semibold text-slate-900">Connect Data Source</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Connect to a database or upload files.</p>
                    <img src="/images/readme/2-database-connection.png" alt="Connect" className="rounded-lg border border-slate-200 shadow-sm w-full" />
                  </div>

                  <div className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">3</div>
                      <h4 className="font-semibold text-slate-900">Configure Tools</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Select tables and operations to expose.</p>
                    <img src="/images/readme/5-server-configuration.png" alt="Configure" className="rounded-lg border border-slate-200 shadow-sm w-full" />
                  </div>

                  <div className="card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">4</div>
                      <h4 className="font-semibold text-slate-900">Generate & Manage</h4>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Create your server and manage it.</p>
                    <img src="/images/readme/7-generated-servers.png" alt="Manage" className="rounded-lg border border-slate-200 shadow-sm w-full" />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === 'setup' ? (
              <div id="tab-setup" className="space-y-8 animate-fade-in">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <button
                    id="integratedBtn"
                    type="button"
                    className={`card p-6 text-left border-2 relative overflow-hidden group transition-all ${setupMethod === 'integrated' ? 'border-blue-500 bg-blue-50/30' : 'border-transparent hover:border-slate-300'}`}
                    onClick={() => setSetupMethod('integrated')}
                  >
                    <div className="absolute top-0 right-0 p-2 bg-blue-500 text-white rounded-bl-xl text-xs font-bold">RECOMMENDED</div>
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-xl group-hover:scale-110 transition-transform">
                        <i className="fas fa-link text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Integrated Server</h3>
                        <p className="text-sm text-slate-500">One config for all servers</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">Automatically updates as you create new servers. No restarts required.</p>
                  </button>

                  <button
                    id="individualBtn"
                    type="button"
                    className={`card p-6 text-left border-2 transition-all group ${setupMethod === 'individual' ? 'border-orange-500 bg-orange-50/30' : 'border-transparent hover:border-slate-300'}`}
                    onClick={() => setSetupMethod('individual')}
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <div className="p-3 bg-orange-100 text-orange-600 rounded-xl group-hover:scale-110 transition-transform">
                        <i className="fas fa-box text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-900">Individual Export</h3>
                        <p className="text-sm text-slate-500">Standalone packages</p>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600">Export servers as separate folders. Good for distribution.</p>
                  </button>
                </div>

                {setupMethod === 'integrated' ? (
                  <div id="integratedMethod" className="space-y-6">
                    <div className="card p-6 bg-white">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Configuration for Claude Desktop</h3>
                      <p className="text-slate-600 mb-4 text-sm">Add this to your <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">claude_desktop_config.json</code> file:</p>

                      <div className="relative bg-slate-900 rounded-xl overflow-hidden group">
                        <button
                          type="button"
                          onClick={() => {
                            void copyConfig('integrated');
                          }}
                          className={`absolute top-3 right-3 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${copiedType === 'integrated' ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                          <i className={`fas ${copiedType === 'integrated' ? 'fa-check' : 'fa-copy'} mr-1`}></i>
                          {copiedType === 'integrated' ? 'Copied!' : 'Copy'}
                        </button>
                        <pre className="p-5 text-sm text-blue-300 font-mono overflow-x-auto"><code>{INTEGRATED_CONFIG}</code></pre>
                      </div>

                      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">MacOS Config Path</div>
                          <code className="text-xs text-slate-700 break-all">~/Library/Application Support/Claude/</code>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Windows Config Path</div>
                          <code className="text-xs text-slate-700 break-all">%APPDATA%\Claude\</code>
                        </div>
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                          <div className="text-xs font-semibold text-slate-500 uppercase mb-1">Linux Config Path</div>
                          <code className="text-xs text-slate-700 break-all">~/.config/Claude/</code>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {setupMethod === 'individual' ? (
                  <div id="individualMethod" className="space-y-6">
                    <div className="card p-6 bg-white">
                      <h3 className="text-lg font-bold text-slate-900 mb-4">Individual Server Configuration</h3>
                      <ol className="list-decimal list-inside space-y-3 text-sm text-slate-600 mb-6">
                        <li>Go to <strong>Manage Servers</strong> and click <strong>Export</strong>.</li>
                        <li>Extract the zip file and run <code className="bg-slate-100 px-1 rounded">npm install</code> in the folder.</li>
                        <li>Add the following to your Claude config:</li>
                      </ol>
                      <div className="relative bg-slate-900 rounded-xl overflow-hidden group">
                        <button
                          type="button"
                          onClick={() => {
                            void copyConfig('individual');
                          }}
                          className={`absolute top-3 right-3 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${copiedType === 'individual' ? 'bg-green-600 hover:bg-green-500' : 'bg-slate-700 hover:bg-slate-600'}`}
                        >
                          <i className={`fas ${copiedType === 'individual' ? 'fa-check' : 'fa-copy'} mr-1`}></i>
                          {copiedType === 'individual' ? 'Copied!' : 'Copy'}
                        </button>
                        <pre className="p-5 text-sm text-orange-300 font-mono overflow-x-auto"><code>{INDIVIDUAL_CONFIG}</code></pre>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="w-80 bg-white border-l border-slate-200/60 flex flex-col flex-shrink-0 z-30 hidden lg:flex">
        <div className="p-6 border-b border-slate-200/60 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg shadow-purple-500/25">
              <i className="fas fa-wrench text-white"></i>
            </div>
            <div>
              <h2 className="text-slate-900 font-bold tracking-tight text-lg">Troubleshooting</h2>
              <p className="text-slate-500 text-xs leading-none font-medium">Common Issues</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-modern p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold text-sm">Tools not showing up?</label>
              <div className="howto-alert-tools card p-3 bg-red-50 border-red-100">
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
                    <span>Ensure QuickMCP is running at localhost:3000</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
                    <span>Restart Claude Desktop after config changes</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
                    <span>Check if port 3001 is blocked by firewall</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-700 font-semibold text-sm">Server Offline?</label>
              <div className="howto-alert-offline card p-3 bg-orange-50 border-orange-100">
                <p className="text-xs text-slate-600 mb-2">If the status indicator is red:</p>
                <ul className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <i className="fas fa-exclamation-triangle text-orange-500 mt-0.5"></i>
                    <span>Check console logs for errors</span>
                  </li>
                  <li className="flex gap-2">
                    <i className="fas fa-exclamation-triangle text-orange-500 mt-0.5"></i>
                    <span>Verify database connection strings</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <label className="block text-slate-700 font-semibold text-sm mb-3">Resources</label>
              <a
                href="https://modelcontextprotocol.io"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                  <i className="fas fa-external-link-alt text-xs"></i>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-900">MCP Documentation</div>
                  <div className="text-xs text-slate-500">Official Docs</div>
                </div>
              </a>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
