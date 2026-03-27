import { useGenerateStore } from '../store/useGenerateStore';

interface Props { type: string; }

function Field({ label, id, type = 'text', placeholder, value, onChange }: {
  label: string; id?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{label}</label>
      <input id={id} type={type} className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={type === 'password' ? 'new-password' : 'off'} />
    </div>
  );
}

export function InfraConfig({ type }: Props) {
  const s = useGenerateStore();

  switch (type) {
    case 'docker':
      return (
        <div className="space-y-4 mt-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-700">Uses local Docker daemon. No credentials needed.</p>
          </div>
          <Field label="Docker Path (optional)" placeholder="/usr/local/bin/docker" value={s.dockerPath} onChange={(v) => s.setField('dockerPath', v)} />
          <p className="text-xs text-slate-500">Creates 11 tools: list_containers, start_container, stop_container, etc.</p>
        </div>
      );
    case 'kubernetes':
      return (
        <div className="space-y-4 mt-6">
          <Field label="kubectl Path (optional)" placeholder="/usr/local/bin/kubectl" value={s.kubectlPath} onChange={(v) => s.setField('kubectlPath', v)} />
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Kubeconfig Path (optional)</label>
            <div className="flex gap-2">
              <input type="text" className="input flex-1" placeholder="~/.kube/config" value={s.kubeconfigPath} onChange={(e) => s.setField('kubeconfigPath', e.target.value)} />
              <button type="button" className="px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300" onClick={() => s.openDirectoryPicker('kubeconfigPath', 'file')}>
                <i className="fas fa-folder-open" />
              </button>
            </div>
          </div>
          <Field label="Namespace (optional)" placeholder="default" value={s.kubernetesNamespace} onChange={(v) => s.setField('kubernetesNamespace', v)} />
          <p className="text-xs text-slate-500">Creates 9 tools: get_pods, get_services, get_deployments, etc.</p>
        </div>
      );
    case 'openshift':
      return (
        <div className="space-y-4 mt-6">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700">Uses local oc CLI. Ensure you are logged in via <code>oc login</code>.</p>
          </div>
          <p className="text-xs text-slate-500">Creates 7 tools for OpenShift cluster management.</p>
        </div>
      );
    case 'prometheus':
      return (
        <div className="space-y-4 mt-6">
          <Field id="prometheusBaseUrl" label="Prometheus URL" placeholder="http://localhost:9090" value={s.prometheusBaseUrl} onChange={(v) => s.setField('prometheusBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: query, query_range, labels, series, targets</p>
        </div>
      );
    case 'grafana':
      return (
        <div className="space-y-4 mt-6">
          <Field id="grafanaBaseUrl" label="Grafana URL" placeholder="http://localhost:3000" value={s.grafanaBaseUrl} onChange={(v) => s.setField('grafanaBaseUrl', v)} />
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Auth Type</label>
            <select id="grafanaAuthType" className="input" value={s.grafanaAuthType} onChange={(e) => s.setField('grafanaAuthType', e.target.value as 'apiKey' | 'basic')}>
              <option value="apiKey">API Key</option>
              <option value="basic">Basic Auth</option>
            </select>
          </div>
          {s.grafanaAuthType === 'apiKey' ? (
            <Field id="grafanaApiKey" label="API Key" type="password" value={s.grafanaApiKey} onChange={(v) => s.setField('grafanaApiKey', v)} />
          ) : (
            <>
              <Field id="grafanaUsername" label="Username" value={s.grafanaUsername} onChange={(v) => s.setField('grafanaUsername', v)} />
              <Field id="grafanaPassword" label="Password" type="password" value={s.grafanaPassword} onChange={(v) => s.setField('grafanaPassword', v)} />
            </>
          )}
          <p className="text-xs text-slate-500">Creates 5 tools: search_dashboards, get_dashboard, list_datasources, get_datasource, query_datasource</p>
        </div>
      );
    case 'jenkins':
      return (
        <div className="space-y-4 mt-6">
          <Field id="jenkinsBaseUrl" label="Jenkins URL" placeholder="http://localhost:8080" value={s.jenkinsBaseUrl} onChange={(v) => s.setField('jenkinsBaseUrl', v)} />
          <Field id="jenkinsUsername" label="Username" placeholder="admin" value={s.jenkinsUsername} onChange={(v) => s.setField('jenkinsUsername', v)} />
          <Field id="jenkinsApiToken" label="API Token" type="password" value={s.jenkinsApiToken} onChange={(v) => s.setField('jenkinsApiToken', v)} />
          <p className="text-xs text-slate-500">Creates 5 tools: list_jobs, get_job, build_job, get_build, get_build_log</p>
        </div>
      );
    case 'dockerhub':
      return (
        <div className="space-y-4 mt-6">
          <Field id="dockerhubBaseUrl" label="Docker Hub URL" placeholder="https://hub.docker.com/v2" value={s.dockerhubBaseUrl} onChange={(v) => s.setField('dockerhubBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 4 tools: search_images, get_image, list_tags, get_tag</p>
        </div>
      );
    case 'elasticsearch':
      return (
        <div className="space-y-4 mt-6">
          <Field id="esBaseUrl" label="Elasticsearch URL" placeholder="http://localhost:9200" value={s.esBaseUrl} onChange={(v) => s.setField('esBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 6 tools: search, index, get, delete, bulk, list_indices</p>
        </div>
      );
    case 'opensearch':
      return (
        <div className="space-y-4 mt-6">
          <Field id="opensearchBaseUrl" label="OpenSearch URL" placeholder="http://localhost:9200" value={s.opensearchBaseUrl} onChange={(v) => s.setField('opensearchBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 6 tools: search, index, get, delete, bulk, list_indices</p>
        </div>
      );
    case 'npm':
      return (
        <div className="space-y-4 mt-6">
          <Field id="npmBaseUrl" label="npm Registry URL" placeholder="https://registry.npmjs.org" value={s.npmBaseUrl} onChange={(v) => s.setField('npmBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 3 tools: search, get_package, get_version</p>
        </div>
      );
    case 'nuget':
      return (
        <div className="space-y-4 mt-6">
          <Field id="nugetBaseUrl" label="NuGet API URL" placeholder="https://api.nuget.org/v3" value={s.nugetBaseUrl} onChange={(v) => s.setField('nugetBaseUrl', v)} />
          <Field id="nugetRegistrationBaseUrl" label="Registration Base URL" placeholder="https://api.nuget.org/v3/registration5-semver1" value={s.nugetRegistrationBaseUrl} onChange={(v) => s.setField('nugetRegistrationBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 3 tools: search, get_package, get_versions</p>
        </div>
      );
    case 'maven':
      return (
        <div className="space-y-4 mt-6">
          <Field id="mavenBaseUrl" label="Maven Search URL" placeholder="https://search.maven.org/solrsearch/select" value={s.mavenBaseUrl} onChange={(v) => s.setField('mavenBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 1 tool: search</p>
        </div>
      );
    case 'gradle':
      return (
        <div className="space-y-4 mt-6">
          <Field id="gradleBaseUrl" label="Gradle Plugins URL" placeholder="https://plugins.gradle.org/api" value={s.gradleBaseUrl} onChange={(v) => s.setField('gradleBaseUrl', v)} />
          <p className="text-xs text-slate-500">Creates 2 tools: search_plugins, get_plugin_versions</p>
        </div>
      );
    case 'nexus':
      return (
        <div className="space-y-4 mt-6">
          <Field id="nexusBaseUrl" label="Nexus URL" placeholder="http://localhost:8081/service/rest/v1" value={s.nexusBaseUrl} onChange={(v) => s.setField('nexusBaseUrl', v)} />
          <p className="text-xs text-slate-500 -mt-2">Auth: API key OR username + password (one required)</p>
          <Field id="nexusApiKey" label="API Key (optional)" type="password" value={s.nexusApiKey} onChange={(v) => s.setField('nexusApiKey', v)} />
          <Field id="nexusUsername" label="Username (optional)" value={s.nexusUsername} onChange={(v) => s.setField('nexusUsername', v)} />
          <Field id="nexusPassword" label="Password (optional)" type="password" value={s.nexusPassword} onChange={(v) => s.setField('nexusPassword', v)} />
          <p className="text-xs text-slate-500">Creates 3 tools: list_repositories, list_components, search</p>
        </div>
      );
    case 'n8n': {
      const N8N_TOOLS = [
        { name: 'list_users', description: 'Retrieve all users', category: 'admin', defaultEnabled: false },
        { name: 'create_users', description: 'Create multiple users', category: 'admin', defaultEnabled: false },
        { name: 'get_user', description: 'Get user by ID/Email', category: 'admin', defaultEnabled: false },
        { name: 'delete_user', description: 'Delete a user', category: 'admin', defaultEnabled: false },
        { name: 'change_user_role', description: "Change a user's global role", category: 'admin', defaultEnabled: false },
        { name: 'generate_audit', description: 'Generate an audit', category: 'admin', defaultEnabled: false },
        { name: 'list_executions', description: 'Retrieve all executions', category: 'core', defaultEnabled: true },
        { name: 'get_execution', description: 'Retrieve an execution', category: 'core', defaultEnabled: true },
        { name: 'delete_execution', description: 'Delete an execution', category: 'admin', defaultEnabled: false },
        { name: 'retry_execution', description: 'Retry an execution', category: 'builder', defaultEnabled: false },
        { name: 'stop_execution', description: 'Stop an execution', category: 'builder', defaultEnabled: false },
        { name: 'stop_multiple_executions', description: 'Stop multiple executions', category: 'builder', defaultEnabled: false },
        { name: 'get_execution_tags', description: 'Get execution tags', category: 'core', defaultEnabled: true },
        { name: 'update_execution_tags', description: 'Update tags of an execution', category: 'builder', defaultEnabled: false },
        { name: 'create_workflow', description: 'Create a workflow', category: 'builder', defaultEnabled: false },
        { name: 'list_workflows', description: 'Retrieve all workflows', category: 'core', defaultEnabled: true },
        { name: 'get_workflow', description: 'Retrieve a workflow', category: 'core', defaultEnabled: true },
        { name: 'delete_workflow', description: 'Delete a workflow', category: 'admin', defaultEnabled: false },
        { name: 'update_workflow', description: 'Update a workflow', category: 'builder', defaultEnabled: false },
        { name: 'get_workflow_version', description: 'Retrieve a specific workflow version', category: 'core', defaultEnabled: false },
        { name: 'activate_workflow', description: 'Publish a workflow', category: 'builder', defaultEnabled: false },
        { name: 'deactivate_workflow', description: 'Deactivate a workflow', category: 'builder', defaultEnabled: false },
        { name: 'transfer_workflow', description: 'Transfer a workflow to another project', category: 'admin', defaultEnabled: false },
        { name: 'get_workflow_tags', description: 'Get workflow tags', category: 'core', defaultEnabled: true },
        { name: 'update_workflow_tags', description: 'Update tags of a workflow', category: 'builder', defaultEnabled: false },
        { name: 'list_credentials', description: 'List credentials', category: 'admin', defaultEnabled: false },
        { name: 'create_credential', description: 'Create a credential', category: 'admin', defaultEnabled: false },
        { name: 'update_credential', description: 'Update credential by ID', category: 'admin', defaultEnabled: false },
        { name: 'delete_credential', description: 'Delete credential by ID', category: 'admin', defaultEnabled: false },
        { name: 'get_credential_schema', description: 'Show credential data schema', category: 'admin', defaultEnabled: false },
        { name: 'transfer_credential', description: 'Transfer credential to another project', category: 'admin', defaultEnabled: false },
        { name: 'create_tag', description: 'Create a tag', category: 'builder', defaultEnabled: false },
        { name: 'list_tags', description: 'Retrieve all tags', category: 'core', defaultEnabled: true },
        { name: 'get_tag', description: 'Retrieve a tag', category: 'core', defaultEnabled: false },
        { name: 'delete_tag', description: 'Delete a tag', category: 'admin', defaultEnabled: false },
        { name: 'update_tag', description: 'Update a tag', category: 'builder', defaultEnabled: false },
        { name: 'source_control_pull', description: 'Pull changes from source control', category: 'admin', defaultEnabled: false },
        { name: 'create_variable', description: 'Create a variable', category: 'builder', defaultEnabled: false },
        { name: 'list_variables', description: 'Retrieve variables', category: 'core', defaultEnabled: true },
        { name: 'delete_variable', description: 'Delete a variable', category: 'admin', defaultEnabled: false },
        { name: 'update_variable', description: 'Update a variable', category: 'builder', defaultEnabled: false },
        { name: 'list_data_tables', description: 'List all data tables', category: 'core', defaultEnabled: true },
        { name: 'create_data_table', description: 'Create a data table', category: 'builder', defaultEnabled: false },
        { name: 'get_data_table', description: 'Get a data table', category: 'core', defaultEnabled: true },
        { name: 'update_data_table', description: 'Update a data table', category: 'builder', defaultEnabled: false },
        { name: 'delete_data_table', description: 'Delete a data table', category: 'admin', defaultEnabled: false },
        { name: 'list_data_table_rows', description: 'Retrieve rows from a data table', category: 'core', defaultEnabled: true },
        { name: 'insert_data_table_rows', description: 'Insert rows into a data table', category: 'builder', defaultEnabled: false },
        { name: 'update_data_table_rows', description: 'Update rows in a data table', category: 'builder', defaultEnabled: false },
        { name: 'upsert_data_table_rows', description: 'Upsert rows in a data table', category: 'builder', defaultEnabled: false },
        { name: 'delete_data_table_rows', description: 'Delete rows from a data table', category: 'admin', defaultEnabled: false },
        { name: 'create_project', description: 'Create a project', category: 'admin', defaultEnabled: false },
        { name: 'list_projects', description: 'Retrieve projects', category: 'core', defaultEnabled: true },
        { name: 'delete_project', description: 'Delete a project', category: 'admin', defaultEnabled: false },
        { name: 'update_project', description: 'Update a project', category: 'admin', defaultEnabled: false },
        { name: 'list_project_users', description: 'List project members', category: 'core', defaultEnabled: false },
        { name: 'add_project_users', description: 'Add users to a project', category: 'admin', defaultEnabled: false },
        { name: 'delete_project_user', description: 'Delete a user from a project', category: 'admin', defaultEnabled: false },
        { name: 'update_project_user_role', description: "Change a user's role in a project", category: 'admin', defaultEnabled: false },
      ] as const;
      const selected = new Set(s.n8nSelectedTools);
      const GROUPS = [
        { key: 'core', label: 'Core', desc: 'Read-focused safe tools' },
        { key: 'builder', label: 'Builder', desc: 'Create/update workflow data' },
        { key: 'admin', label: 'Admin', desc: 'Users, credentials, projects' },
      ] as const;
      const toggleCategory = (category: string, enabled: boolean) => {
        const next = new Set(s.n8nSelectedTools);
        N8N_TOOLS.filter((t) => t.category === category).forEach((t) => enabled ? next.add(t.name) : next.delete(t.name));
        s.setField('n8nSelectedTools', Array.from(next));
      };
      const toggleTool = (name: string, checked: boolean) => {
        const next = new Set(s.n8nSelectedTools);
        checked ? next.add(name) : next.delete(name);
        s.setField('n8nSelectedTools', Array.from(next));
      };
      return (
        <div className="space-y-6 mt-6">
          <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start gap-3">
              <i className="fas fa-info-circle text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium text-amber-800 mb-1">n8n API</p>
                <p>Use your n8n API key.</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field id="n8nBaseUrl" label="Base URL" value={s.n8nBaseUrl} onChange={(v) => s.setField('n8nBaseUrl', v)} />
            <Field id="n8nApiKey" label="API Key" type="password" placeholder="n8n_api_key" value={s.n8nApiKey} onChange={(v) => s.setField('n8nApiKey', v)} />
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">API Path</label>
              <input
                id="n8nApiPath"
                type="text"
                className="input"
                placeholder="/api/v1"
                value={s.n8nApiPath}
                autoComplete="off"
                onChange={(e) => s.setField('n8nApiPath', e.target.value)}
                onBlur={(e) => { if (!e.target.value.trim()) s.setField('n8nApiPath', '/api/v1'); }}
              />
            </div>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tool Groups</label>
              <p className="text-xs text-slate-500">Toggle groups, then fine-tune each tool from the checklist.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {GROUPS.map(({ key, label, desc }) => {
                const catTools = N8N_TOOLS.filter((t) => t.category === key);
                const allSelected = catTools.every((t) => selected.has(t.name));
                return (
                  <label key={key} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 cursor-pointer hover:border-slate-300">
                    <div>
                      <div className="text-sm font-semibold text-slate-800">{label}</div>
                      <div className="text-xs text-slate-500">{desc}</div>
                    </div>
                    <input
                      id={`n8n-toggle-${key}`}
                      type="checkbox"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      checked={allSelected}
                      onChange={(e) => toggleCategory(key, e.target.checked)}
                    />
                  </label>
                );
              })}
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tool Selection</label>
              <div id="n8n-tool-list" className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 p-3 bg-slate-50">
                {N8N_TOOLS.map((tool) => (
                  <label key={tool.name} className="flex items-start gap-3 rounded-md p-2 hover:bg-white transition-colors border border-transparent hover:border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 flex-shrink-0"
                      checked={selected.has(tool.name)}
                      onChange={(e) => toggleTool(tool.name, e.target.checked)}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{tool.name}</code>
                        <span className={`text-[10px] uppercase tracking-wide font-semibold ${tool.category === 'core' ? 'text-emerald-600' : tool.category === 'builder' ? 'text-blue-600' : 'text-amber-600'}`}>{tool.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{tool.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-700">
              <i className="fas fa-tools mr-2" />
              <strong id="n8n-tools-count-label">{selected.size} tools</strong> selected for generation.
            </p>
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}
