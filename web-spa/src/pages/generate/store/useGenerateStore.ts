import { create } from 'zustand';
import { GenerateFormState, INITIAL_FORM_STATE, DataSourceTypeValue } from '../types';

interface GenerateStore extends GenerateFormState {
  // Generic field setters
  setField: <K extends keyof GenerateFormState>(key: K, value: GenerateFormState[K]) => void;
  setFields: (fields: Partial<GenerateFormState>) => void;

  // Step / type navigation
  setSelectedType: (type: DataSourceTypeValue | null) => void;
  setStep: (step: 1 | 2 | 3 | 4) => void;

  // Parsed data
  setCurrentDataSource: (ds: any) => void;
  setCurrentParsedData: (data: any[] | null) => void;
  setPreviewHtml: (html: string) => void;

  // Loading / error / success
  setGenerateLoading: (loading: boolean) => void;
  setGenerateError: (error: string) => void;
  setGenerateSuccess: (success: string) => void;

  // Validation
  setNameValidation: (v: { available: boolean | null; message: string }) => void;

  // SaaS
  setSaasConfig: (isSaas: boolean, onPremTypes: Set<string>) => void;

  // Success modal
  showSuccessModal: (serverName: string, message: string) => void;
  closeSuccessModal: () => void;

  // Directory picker
  openDirectoryPicker: (
    targetInputId: string,
    mode?: 'directory' | 'file',
    extensions?: string[]
  ) => void;
  closeDirectoryPicker: () => void;
  setDirectoryPickerPath: (path: string) => void;
  setDirectoryPickerEntries: (
    entries: Array<{ name: string; isDirectory: boolean; path: string }>
  ) => void;
  setDirectoryPickerLoading: (loading: boolean) => void;

  // Reset
  resetForm: () => void;
}

export const useGenerateStore = create<GenerateStore>((set) => ({
  ...INITIAL_FORM_STATE,

  // ── Generic ────────────────────────────────────────────────────────────────
  setField: (key, value) =>
    set((state) => ({ ...state, [key]: value })),

  setFields: (fields) =>
    set((state) => ({ ...state, ...fields })),

  // ── Navigation ─────────────────────────────────────────────────────────────
  setSelectedType: (type) => set({ selectedType: type }),
  setStep: (step) => set({ currentStep: step }),

  // ── Parsed data ────────────────────────────────────────────────────────────
  setCurrentDataSource: (ds) => set({ currentDataSource: ds }),
  setCurrentParsedData: (data) => set({ currentParsedData: data }),
  setPreviewHtml: (html) => set({ previewHtml: html }),

  // ── Loading / feedback ─────────────────────────────────────────────────────
  setGenerateLoading: (loading) => set({ generateLoading: loading }),
  setGenerateError: (error) => set({ generateError: error }),
  setGenerateSuccess: (success) => set({ generateSuccess: success }),

  // ── Validation ─────────────────────────────────────────────────────────────
  setNameValidation: (v) => set({ nameValidation: v }),

  // ── SaaS ───────────────────────────────────────────────────────────────────
  setSaasConfig: (isSaas, onPremTypes) =>
    set({ isSaasDeployMode: isSaas, onPremOnlyTypes: onPremTypes }),

  // ── Success modal ──────────────────────────────────────────────────────────
  showSuccessModal: (serverName, message) =>
    set({ successModal: { visible: true, serverName, message } }),

  closeSuccessModal: () =>
    set({ successModal: { visible: false, serverName: '', message: '' } }),

  // ── Directory picker ───────────────────────────────────────────────────────
  openDirectoryPicker: (targetInputId, mode = 'directory', extensions = []) =>
    set((state) => ({
      directoryPicker: {
        ...state.directoryPicker,
        visible: true,
        targetInputId,
        mode,
        extensions,
        currentPath: '~',
      },
    })),

  closeDirectoryPicker: () =>
    set((state) => ({
      directoryPicker: { ...state.directoryPicker, visible: false },
    })),

  setDirectoryPickerPath: (path) =>
    set((state) => ({
      directoryPicker: { ...state.directoryPicker, currentPath: path },
    })),

  setDirectoryPickerEntries: (entries) =>
    set((state) => ({
      directoryPicker: { ...state.directoryPicker, entries },
    })),

  setDirectoryPickerLoading: (loading) =>
    set((state) => ({
      directoryPicker: { ...state.directoryPicker, loading },
    })),

  // ── Reset ──────────────────────────────────────────────────────────────────
  resetForm: () => set({ ...INITIAL_FORM_STATE }),
}));
