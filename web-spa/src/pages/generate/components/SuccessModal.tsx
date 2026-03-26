interface SuccessModalProps {
  visible: boolean;
  serverName: string;
  message: string;
  onClose: () => void;
  onGoToManage: () => void;
}

export function SuccessModal({
  visible,
  serverName: _serverName,
  message,
  onClose,
  onGoToManage,
}: SuccessModalProps) {
  return (
    <div
      id="success-modal"
      className={[
        'fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4',
        'transition-all duration-300',
        visible ? 'opacity-100 visible' : 'opacity-0 invisible',
      ].join(' ')}
    >
      <div
        className={[
          'bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden',
          'transform transition-transform duration-300',
          visible ? 'scale-100' : 'scale-95',
        ].join(' ')}
      >
        <div className="p-8 text-center">
          {/* Success icon */}
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce-slow">
            <i className="fas fa-check text-green-500 text-4xl" />
          </div>

          <h3 className="text-2xl font-bold text-slate-900 mb-2">Server Generated!</h3>

          <p id="success-message" className="text-slate-600 mb-8">
            {message || 'Your MCP server is ready to use.'}
          </p>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-bold transition-colors shadow-lg shadow-blue-500/30"
              onClick={onGoToManage}
            >
              <i className="fas fa-server mr-2" />
              Manage Servers
            </button>

            <button
              type="button"
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold transition-colors"
              onClick={onClose}
            >
              <i className="fas fa-plus mr-2" />
              Create Another
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
