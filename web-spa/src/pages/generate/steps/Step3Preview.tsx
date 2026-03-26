import { useGenerateStore } from '../store/useGenerateStore';

interface Step3Props {
  onBack: () => void;
  onNext: () => void;
}

export function Step3Preview({ onBack, onNext }: Step3Props) {
  const { currentParsedData, previewHtml } = useGenerateStore();
  const canProceed = currentParsedData !== null;

  return (
    <div id="wizard-step-3" className="wizard-step">
      <div className="bg-slate-50/50 p-6 border-b border-slate-200/60">
        <h3 className="text-lg font-bold text-slate-900">Data Preview</h3>
        <p className="text-sm text-slate-500">Review the detected schema and data.</p>
      </div>
      <div className="p-8 space-y-6">
        <div
          id="data-preview"
          className="space-y-4"
          dangerouslySetInnerHTML={previewHtml ? { __html: previewHtml } : undefined}
        />

        <div className="flex justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            id="back-to-step-2"
            onClick={onBack}
            className="text-slate-600 hover:text-slate-900 font-medium px-4 py-2"
          >
            <i className="fas fa-arrow-left mr-2" />
            Back
          </button>
          <button
            type="button"
            id="next-to-step-4"
            onClick={onNext}
            disabled={!canProceed}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Configure Server <i className="fas fa-arrow-right ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
