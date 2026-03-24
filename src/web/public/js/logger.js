// Browser logger - writes to /api/logs (fire-and-forget) and also console.error
const logger = (() => {
  function _log(severity, message, additionalInfo) {
    const msg = (message instanceof Error) ? message.message : String(message);
    const extra = additionalInfo !== undefined
      ? (typeof additionalInfo === 'string' ? additionalInfo : JSON.stringify(additionalInfo))
      : ((message instanceof Error && message.stack) ? message.stack : null);
    if (extra !== null) {
      console.error(msg, extra);
    } else {
      console.error(msg);
    }
    fetch('/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: typeof currentUserName !== 'undefined' ? currentUserName : '',
        severity,
        message: msg,
        additionalInfo: extra
      })
    }).catch(() => { /* ignore network errors */ });
  }
  return {
    trace: (msg, info) => _log('trace', msg, info),
    debug: (msg, info) => _log('debug', msg, info),
    info:  (msg, info) => _log('info',  msg, info),
    warn:  (msg, info) => _log('warn',  msg, info),
    error: (msg, info) => _log('error', msg, info)
  };
})();
