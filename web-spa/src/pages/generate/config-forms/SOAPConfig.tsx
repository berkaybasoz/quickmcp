import { useGenerateStore } from '../store/useGenerateStore';

export function SOAPConfig() {
  const { soapBaseUrl, soapWsdlUrl, soapAction, soapHeaders, setField } = useGenerateStore();

  return (
    <div className="space-y-4 mt-6">
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          SOAP Endpoint
        </label>
        <input
          type="url"
          className="input"
          placeholder="https://api.example.com/service"
          value={soapBaseUrl}
          onChange={(e) => setField('soapBaseUrl', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          WSDL URL (optional)
        </label>
        <input
          type="url"
          className="input"
          placeholder="https://api.example.com/service?wsdl"
          value={soapWsdlUrl}
          onChange={(e) => setField('soapWsdlUrl', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          SOAP Action (optional)
        </label>
        <input
          type="text"
          className="input"
          placeholder="urn:myAction"
          value={soapAction}
          onChange={(e) => setField('soapAction', e.target.value)}
        />
      </div>
      <div>
        <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
          Headers (XML, optional)
        </label>
        <textarea
          className="input resize-none font-mono text-sm"
          rows={3}
          placeholder={'<Header><Auth>token</Auth></Header>'}
          value={soapHeaders}
          onChange={(e) => setField('soapHeaders', e.target.value)}
        />
      </div>
      <p className="text-xs text-slate-500">Creates 1 tool: <code>call_operation</code></p>
    </div>
  );
}
