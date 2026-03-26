import { useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useGenerateStore } from './store/useGenerateStore';
import { isNoTableDataSource } from './types';
import { useHandleNextToStep3 } from './hooks/useHandleNextToStep3';
import { useCanProceed } from './hooks/useCanProceed';
import { WizardProgress } from './components/WizardProgress';
import { SuccessModal } from './components/SuccessModal';
import { DirectoryPickerModal } from './components/DirectoryPickerModal';
import { Step1DataSource } from './steps/Step1DataSource';
import { Step2Config } from './steps/Step2Config';
import { Step3Preview } from './steps/Step3Preview';
import { Step4ServerConfig } from './steps/Step4ServerConfig';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSelectedTablesAndTools(type: string, parsedData: any[] | null) {
  if (isNoTableDataSource(type as any)) return [];

  if (type === 'rest') {
    const checkboxes = document.querySelectorAll<HTMLInputElement>('[id^="rest-endpoint-"]');
    return Array.from(checkboxes)
      .filter((cb) => cb.checked)
      .map((cb) => ({
        path: cb.dataset.endpointPath,
        method: cb.dataset.endpointMethod,
      }));
  }

  if (type === 'redis') {
    return getGroupTools('redis');
  }
  if (type === 'hazelcast') {
    return getGroupTools('hazelcast');
  }
  if (type === 'kafka') {
    return getGroupTools('kafka');
  }

  // DB / CSV / Excel — table + tool checkboxes
  const tables: any[] = [];
  const tableCheckboxes = document.querySelectorAll<HTMLInputElement>('[id^="table-select-"]');
  tableCheckboxes.forEach((cb, i) => {
    if (!cb.checked) return;
    const name = cb.dataset.tableName || (parsedData?.[i]?.name ?? `table_${i}`);
    const tools: string[] = [];
    ['get', 'create', 'update', 'delete', 'count', 'min', 'max', 'sum', 'avg'].forEach((t) => {
      const toolCb = document.querySelector<HTMLInputElement>(`#tool-${t}-${i}`);
      if (toolCb?.checked) tools.push(t);
    });
    tables.push({ name, tools });
  });
  return tables;
}

function getGroupTools(prefix: string) {
  const groups: any[] = [];
  const groupCheckboxes = document.querySelectorAll<HTMLInputElement>(`[id^="${prefix}-group-select-"]`);
  groupCheckboxes.forEach((cb, i) => {
    if (!cb.checked) return;
    const toolInputs = document.querySelectorAll<HTMLInputElement>(`#${prefix}-group-tools-${i} input[data-tool-name]`);
    const tools = Array.from(toolInputs).filter((t) => t.checked).map((t) => t.dataset.toolName!);
    groups.push({ group: i, tools });
  });
  return groups;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function GeneratePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const store = useGenerateStore();
  const { handleNextToStep3, parseLoading } = useHandleNextToStep3();
  const canProceedStep2 = useCanProceed(store);

  // ── Reset form when navigated here as "new" ────────────────────────────────
  useEffect(() => {
    if ((location.state as any)?.new) {
      store.resetForm();
      // Clear the state so refreshing doesn't re-reset
      navigate('/generate', { replace: true, state: {} });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // ── Mount ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const prevTitle = document.title;
    document.title = 'QuickMCP - Modern MCP Server Generator';

    // Load SaaS config
    fetch('/api/auth/config')
      .then((r) => r.json())
      .then((data) => {
        if (data.deployMode === 'saas') {
          store.setSaasConfig(true, new Set(data.onPremOnlyTypes || []));
        }
      })
      .catch(() => {});

    // Expose toggle helpers so dangerouslySetInnerHTML preview checkboxes work
    (window as any).toggleTableDetails = (panelId: string) => {
      const panel = document.getElementById(panelId);
      const icon = document.getElementById(`${panelId}-icon`);
      if (panel) panel.classList.toggle('hidden');
      if (icon) icon.classList.toggle('rotate-180');
    };
    (window as any).toggleTableSelection = (i: number) => {
      const cb = document.querySelector<HTMLInputElement>(`#table-select-${i}`);
      if (!cb) return;
      const toolsPanel = document.getElementById(`table-tools-${i}`);
      if (toolsPanel) {
        toolsPanel.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach((t) => { t.disabled = !cb.checked; });
        toolsPanel.style.opacity = cb.checked ? '' : '0.5';
      }
    };
    (window as any).selectAllTools = (i: number) => {
      document.querySelectorAll<HTMLInputElement>(`#table-tools-${i} input[type="checkbox"]`).forEach((t) => { t.checked = true; });
    };
    (window as any).deselectAllTools = (i: number) => {
      document.querySelectorAll<HTMLInputElement>(`#table-tools-${i} input[type="checkbox"]`).forEach((t) => { t.checked = false; });
    };
    (window as any).selectOnlyBasicTools = (i: number) => {
      const BASIC = ['get', 'create', 'update', 'delete', 'count'];
      document.querySelectorAll<HTMLInputElement>(`#table-tools-${i} input[type="checkbox"]`).forEach((t) => {
        const id = t.id.replace(`-${i}`, '').replace('tool-', '');
        t.checked = BASIC.includes(id);
      });
    };
    (window as any).toggleGroupDetails = (panelId: string, iconId: string) => {
      const panel = document.getElementById(panelId);
      const icon = document.getElementById(iconId);
      if (panel) panel.classList.toggle('hidden');
      if (icon) icon.classList.toggle('rotate-180');
    };
    (window as any).toggleRedisGroupSelection = (i: number) => {
      const cb = document.querySelector<HTMLInputElement>(`#redis-group-select-${i}`);
      if (!cb) return;
      document.querySelectorAll<HTMLInputElement>(`#redis-group-tools-${i} input[type="checkbox"]`).forEach((t) => { t.disabled = !cb.checked; });
    };
    (window as any).toggleHazelcastGroupSelection = (i: number) => {
      const cb = document.querySelector<HTMLInputElement>(`#hazelcast-group-select-${i}`);
      if (!cb) return;
      document.querySelectorAll<HTMLInputElement>(`#hazelcast-group-tools-${i} input[type="checkbox"]`).forEach((t) => { t.disabled = !cb.checked; });
    };
    (window as any).toggleKafkaGroupSelection = (i: number) => {
      const cb = document.querySelector<HTMLInputElement>(`#kafka-group-select-${i}`);
      if (!cb) return;
      document.querySelectorAll<HTMLInputElement>(`#kafka-group-tools-${i} input[type="checkbox"]`).forEach((t) => { t.disabled = !cb.checked; });
    };
    (window as any).selectAllGroupTools = (prefix: string, i: number) => {
      document.querySelectorAll<HTMLInputElement>(`#${prefix}-group-tools-${i} input[type="checkbox"]`).forEach((t) => { t.checked = true; });
    };
    (window as any).deselectAllGroupTools = (prefix: string, i: number) => {
      document.querySelectorAll<HTMLInputElement>(`#${prefix}-group-tools-${i} input[type="checkbox"]`).forEach((t) => { t.checked = false; });
    };

    return () => {
      document.title = prevTitle;
      const fns = ['toggleTableDetails', 'toggleTableSelection', 'selectAllTools', 'deselectAllTools',
        'selectOnlyBasicTools', 'toggleGroupDetails', 'toggleRedisGroupSelection',
        'toggleHazelcastGroupSelection', 'toggleKafkaGroupSelection', 'selectAllGroupTools', 'deselectAllGroupTools'];
      fns.forEach((fn) => delete (window as any)[fn]);
    };
  }, []);

  // ── Directory picker ───────────────────────────────────────────────────────
  const dp = store.directoryPicker;

  const loadDirectory = useCallback(async (path: string) => {
    store.setDirectoryPickerLoading(true);
    store.setDirectoryPickerPath(path);
    try {
      const res = await fetch(`/api/directories?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.success) store.setDirectoryPickerEntries(data.entries || []);
    } catch { /* ignore */ } finally {
      store.setDirectoryPickerLoading(false);
    }
  }, [store]);

  useEffect(() => {
    if (dp.visible) loadDirectory(dp.currentPath);
  }, [dp.visible]);

  function handleDirectorySelect(path: string) {
    const input = document.getElementById(dp.targetInputId) as HTMLInputElement | null;
    if (input) {
      input.value = path;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }
    const fieldMap: Record<string, keyof typeof store> = {
      localfsBasePath:  'localfsBasePath',
      kubeconfigPath:   'kubeconfigPath',
      csvExcelFilePath: 'csvExcelFilePath',
    };
    const key = fieldMap[dp.targetInputId];
    if (key) store.setField(key as any, path);
    store.closeDirectoryPicker();
  }

  // ── Generate ────────────────────────────────────────────────────────────────
  async function handleGenerate() {
    store.setGenerateLoading(true);
    store.setGenerateError('');
    store.setGenerateSuccess('');

    try {
      const type = store.currentDataSource?.type || store.selectedType;
      const selectedTables = getSelectedTablesAndTools(type, store.currentParsedData);

      const payload = {
        name: store.serverName.trim(),
        description: store.serverDescription || '',
        version: store.serverVersion || '1.0.0',
        type,
        dataSource: store.currentDataSource,
        selectedTables,
        parsedData: store.currentParsedData,
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) throw new Error(data.error || 'Generation failed');

      const msg = data.message || `Server "${store.serverName}" has been created successfully!`;
      store.showSuccessModal(store.serverName, msg);
    } catch (err: any) {
      store.setGenerateError(err?.message || 'An error occurred during generation.');
    } finally {
      store.setGenerateLoading(false);
    }
  }

  // ── Navigation ──────────────────────────────────────────────────────────────
  function goToStep2() { store.setStep(2); }
  function goToStep4() { store.setStep(4); }
  function goBackStep2() { store.setStep(1); }
  function goBackStep3() { store.setStep(2); }
  function goBackStep4() { store.setStep(3); }

  function handleSuccessClose() {
    store.closeSuccessModal();
    store.resetForm();
  }

  function handleSuccessManage() {
    store.closeSuccessModal();
    store.resetForm();
    navigate('/manage-servers');
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-6xl mx-auto space-y-8 pb-20">
          {/* Hero */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center space-x-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-100">
              <i className="fas fa-sparkles" />
              <span>AI-Powered</span>
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Generate Your MCP Server</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Transform your data into powerful MCP servers in minutes. Follow our step-by-step wizard.
            </p>
          </div>

          <WizardProgress currentStep={store.currentStep} />

          {/* Wizard steps wrapped in card */}
          <div className="card overflow-hidden">
            {store.currentStep === 1 && (
              <Step1DataSource onNext={goToStep2} />
            )}

            {store.currentStep === 2 && (
              <Step2Config
                onBack={goBackStep2}
                onNext={handleNextToStep3}
                canProceed={canProceedStep2}
                isLoading={parseLoading}
              />
            )}

            {store.currentStep === 3 && (
              <Step3Preview
                onBack={goBackStep3}
                onNext={goToStep4}
              />
            )}

            {store.currentStep === 4 && (
              <Step4ServerConfig
                onBack={goBackStep4}
                onGenerate={handleGenerate}
              />
            )}
          </div>
        </div>
      </div>

      {/* Success modal */}
      <SuccessModal
        visible={store.successModal.visible}
        serverName={store.successModal.serverName}
        message={store.successModal.message}
        onClose={handleSuccessClose}
        onGoToManage={handleSuccessManage}
      />

      {/* Directory picker */}
      <DirectoryPickerModal
        visible={dp.visible}
        currentPath={dp.currentPath}
        entries={dp.entries}
        loading={dp.loading}
        mode={dp.mode}
        selectedPath={dp.currentPath}
        onClose={store.closeDirectoryPicker}
        onNavigate={loadDirectory}
        onGoHome={() => loadDirectory('~')}
        onGoUp={() => {
          const parts = dp.currentPath.replace(/\/+$/, '').split('/');
          parts.pop();
          loadDirectory(parts.join('/') || '/');
        }}
        onSelect={handleDirectorySelect}
      />
    </div>
  );
}
