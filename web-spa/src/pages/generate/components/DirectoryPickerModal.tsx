export interface DirectoryEntry {
  name: string;
  isDirectory: boolean;
  path: string;
}

interface DirectoryPickerModalProps {
  visible: boolean;
  currentPath: string;
  entries: DirectoryEntry[];
  loading: boolean;
  mode: 'directory' | 'file';
  selectedPath: string;
  onClose: () => void;
  onNavigate: (path: string) => void;
  onGoHome: () => void;
  onGoUp: () => void;
  onSelect: (path: string) => void;
}

export function DirectoryPickerModal({
  visible,
  currentPath,
  entries,
  loading,
  mode,
  selectedPath,
  onClose,
  onNavigate,
  onGoHome,
  onGoUp,
  onSelect,
}: DirectoryPickerModalProps) {
  if (!visible) return null;

  const visibleEntries =
    mode === 'file' ? entries : entries.filter((e) => e.isDirectory);

  function handleEntryClick(entry: DirectoryEntry) {
    if (entry.isDirectory) {
      onNavigate(entry.path);
    } else {
      onSelect(entry.path);
    }
  }

  return (
    <div id="directoryPickerModal" className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        id="directoryPickerOverlay"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="absolute inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-[600px] md:max-h-[80vh] bg-white rounded-xl shadow-2xl flex flex-col">

        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center">
              <i className="fas fa-folder-open text-xl" />
            </div>
            <div>
              <h3 id="dirPickerTitle" className="font-bold text-slate-900">
                {mode === 'file' ? 'Select File' : 'Select Directory'}
              </h3>
              <p id="dirPickerSubtitle" className="text-xs text-slate-500">
                {mode === 'file'
                  ? 'Choose a file to use'
                  : 'Choose a folder to use as base path'}
              </p>
            </div>
          </div>

          <button
            type="button"
            id="closeDirectoryPicker"
            className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-700"
            onClick={onClose}
          >
            <i className="fas fa-times" />
          </button>
        </div>

        {/* Current path bar */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              id="dirPickerHome"
              className="p-2 rounded hover:bg-slate-200 text-slate-600"
              title="Home"
              onClick={onGoHome}
            >
              <i className="fas fa-home" />
            </button>

            <button
              type="button"
              id="dirPickerUp"
              className="p-2 rounded hover:bg-slate-200 text-slate-600"
              title="Parent Directory"
              onClick={onGoUp}
            >
              <i className="fas fa-level-up-alt" />
            </button>

            <div
              id="dirPickerCurrentPath"
              className="flex-1 font-mono text-sm text-slate-700 truncate px-2"
            >
              {currentPath}
            </div>
          </div>
        </div>

        {/* Directory / file list */}
        <div
          id="dirPickerList"
          className="flex-1 overflow-y-auto p-2 min-h-[300px] max-h-[400px]"
        >
          {loading ? (
            <div className="text-center py-8 text-slate-400">
              <i className="fas fa-spinner fa-spin text-2xl" />
              <p className="mt-2">Loading...</p>
            </div>
          ) : visibleEntries.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <i className="fas fa-folder-open text-2xl" />
              <p className="mt-2">Empty directory</p>
            </div>
          ) : (
            visibleEntries.map((entry) => (
              <button
                key={entry.path}
                type="button"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-50 text-left group"
                onClick={() => handleEntryClick(entry)}
              >
                <i
                  className={[
                    'text-lg w-5 text-center',
                    entry.isDirectory
                      ? 'fas fa-folder text-amber-400'
                      : 'fas fa-file text-slate-400',
                  ].join(' ')}
                />
                <span className="flex-1 text-sm text-slate-700 truncate group-hover:text-slate-900">
                  {entry.name}
                </span>
                {entry.isDirectory && (
                  <i className="fas fa-chevron-right text-xs text-slate-300 group-hover:text-slate-500" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-4">
          <div className="flex-1 text-sm text-slate-600 truncate">
            Selected:{' '}
            <span id="dirPickerSelected" className="font-mono text-violet-600">
              {selectedPath || '-'}
            </span>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              id="dirPickerCancel"
              className="px-4 py-2 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="button"
              id="dirPickerSelect"
              className="px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedPath}
              onClick={() => selectedPath && onSelect(selectedPath)}
            >
              <span id="dirPickerSelectLabel">
                {mode === 'file' ? 'Select This File' : 'Select This Folder'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
