import { useRef, useState } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';

export function FileUploadConfig() {
  const csvExcelFilePath = useGenerateStore((s) => s.csvExcelFilePath);
  const setField = useGenerateStore((s) => s.setField);
  const openDirectoryPicker = useGenerateStore((s) => s.openDirectoryPicker);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [parseError, setParseError] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file) {
      setField('csvExcelFile', file);
      setSelectedFileName(file.name);
      setParseError('');
    } else {
      setField('csvExcelFile', null);
      setSelectedFileName('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0] ?? null;
    if (file) {
      const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
      if (!['csv', 'xlsx', 'xls'].includes(ext)) {
        setParseError('Unsupported file type. Please use .csv, .xlsx, or .xls files.');
        return;
      }
      setField('csvExcelFile', file);
      setSelectedFileName(file.name);
      setParseError('');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleBrowseServerPath = () => {
    openDirectoryPicker('csvExcelFilePath', 'file', ['.csv', '.xlsx', '.xls']);
  };

  return (
    <div id="file-upload-section" className="space-y-4 mt-6">
      <div
        className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue-300 transition-colors"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <i className="fas fa-cloud-upload-alt text-4xl text-slate-400 mb-3" />
        <p className="text-sm font-medium text-slate-700 mb-1">
          {selectedFileName ? selectedFileName : 'Drag & drop your file here'}
        </p>
        <p className="text-xs text-slate-500 mb-4">CSV or Excel files (.csv, .xlsx, .xls)</p>
        <label className="btn-primary cursor-pointer text-sm px-4 py-2 bg-blue-600 text-white rounded-lg">
          Browse File
          <input
            ref={fileInputRef}
            type="file"
            id="fileInput"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
      </div>

      <div className="text-center text-xs text-slate-400">— or enter file path —</div>

      <div className="flex gap-2">
        <input
          type="text"
          id="csvExcelFilePath"
          placeholder="/path/to/file.csv"
          className="input flex-1"
          value={csvExcelFilePath}
          onChange={(e) => setField('csvExcelFilePath', e.target.value)}
        />
        <button
          id="browseCsvExcelFileBtn"
          type="button"
          className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-slate-300"
          onClick={handleBrowseServerPath}
        >
          <i className="fas fa-folder-open mr-1" />
          Browse
        </button>
      </div>

      <div
        id="file-upload-section-parse-error"
        className={parseError ? 'text-xs text-red-600' : 'hidden text-xs text-red-600'}
      >
        {parseError}
      </div>
    </div>
  );
}
