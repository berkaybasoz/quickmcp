import { useGenerateStore } from '../store/useGenerateStore';

export function SOAPConfig() {
  const { soapBaseUrl, soapWsdlUrl, soapAction, soapHeaders, setField } = useGenerateStore();

  return (
    <div id="soap-section" className="space-y-6">
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <div className="flex items-start gap-3">
          <i className="fas fa-info-circle text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-700">
            <p className="font-medium text-amber-800 mb-1">SOAP Endpoint</p>
            <p>Send SOAP XML envelopes over HTTP.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Endpoint URL</label>
          <input
            type="text"
            id="soapBaseUrl"
            className="input"
            placeholder="https://api.example.com/soap"
            value={soapBaseUrl}
            onChange={(e) => setField('soapBaseUrl', e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">WSDL URL (Optional)</label>
          <input
            type="text"
            id="soapWsdlUrl"
            className="input"
            placeholder="https://api.example.com/service?wsdl"
            value={soapWsdlUrl}
            onChange={(e) => setField('soapWsdlUrl', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">SOAPAction (Optional)</label>
          <input
            type="text"
            id="soapAction"
            className="input"
            placeholder="urn:ActionName"
            value={soapAction}
            onChange={(e) => setField('soapAction', e.target.value)}
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Headers (Optional)</label>
          <textarea
            id="soapHeaders"
            rows={4}
            className="input font-mono text-xs"
            placeholder={'{"Authorization":"Bearer ..."}'}
            value={soapHeaders}
            onChange={(e) => setField('soapHeaders', e.target.value)}
          />
        </div>
      </div>

      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-700">
          <i className="fas fa-tools mr-2" />
          <strong>1 tool</strong> will be created: call_operation
        </p>
      </div>
      <div id="soap-parse-error" className="hidden p-3 bg-red-50 text-red-700 rounded border border-red-200 text-sm" />
    </div>
  );
}
