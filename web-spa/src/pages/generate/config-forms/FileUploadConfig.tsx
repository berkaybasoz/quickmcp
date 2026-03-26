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
    <div id="file-upload-section">
      <div
        id="fileUpload"
        className="border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer"
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-4 text-slate-400">
          <i className="fas fa-cloud-upload-alt text-3xl" />
        </div>
        <h4 className="text-lg font-bold text-slate-900">
          {selectedFileName ? selectedFileName : 'Click or Drag file here'}
        </h4>
        <p className="text-sm text-slate-500 mt-1">Supports .csv and .xlsx files up to 10MB</p>
        <input
          ref={fileInputRef}
          type="file"
          id="fileInput"
          accept=".csv,.xlsx,.xls"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      <div className="mt-4">
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">File Path (Optional)</label>
        <div className="flex gap-2">
          <input
            type="text"
            id="csvExcelFilePath"
            placeholder="/Users/username/Documents/data.csv"
            className="input flex-1"
            value={csvExcelFilePath}
            onChange={(e) => setField('csvExcelFilePath', e.target.value)}
          />
          <button
            id="browseCsvExcelFileBtn"
            type="button"
            className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center gap-2"
            onClick={handleBrowseServerPath}
          >
            <i className="fas fa-file" />
            <span>Browse File</span>
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-2">Upload yerine doğrudan dosya yolu da kullanabilirsiniz.</p>
      </div>

      {parseError && (
        <div className="mt-2 text-xs text-red-600">{parseError}</div>
      )}
    </div>
  );
}
