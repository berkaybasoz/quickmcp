import { useGenerateStore } from '../store/useGenerateStore';

interface Props { type: string; }

function Field({ label, id, type = 'text', placeholder, value, onChange }: {
  label: string; id?: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-slate-700 uppercase mb-2">{label}</label>
      <input id={id} type={type} className="input" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} />
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
    case 'n8n':
      return (
        <div className="space-y-4 mt-6">
          <Field id="n8nBaseUrl" label="n8n URL" placeholder="http://localhost:5678" value={s.n8nBaseUrl} onChange={(v) => s.setField('n8nBaseUrl', v)} />
          <Field id="n8nApiKey" label="API Key" type="password" value={s.n8nApiKey} onChange={(v) => s.setField('n8nApiKey', v)} />
          <Field id="n8nApiPath" label="API Path" placeholder="/api/v1" value={s.n8nApiPath} onChange={(v) => s.setField('n8nApiPath', v)} />
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Tool Groups</label>
            <div className="space-y-2">
              {[
                { key: 'core', label: 'Core tools' },
                { key: 'builder', label: 'Builder tools' },
                { key: 'admin', label: 'Admin tools' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`n8n-toggle-${key}`}
                    checked={s.n8nSelectedTools.includes(key)}
                    onChange={(e) => {
                      const tools = e.target.checked
                        ? [...s.n8nSelectedTools, key]
                        : s.n8nSelectedTools.filter((t) => t !== key);
                      s.setField('n8nSelectedTools', tools);
                    }}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
}
