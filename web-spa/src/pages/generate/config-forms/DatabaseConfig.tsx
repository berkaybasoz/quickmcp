import { useEffect, useMemo } from 'react';
import { useGenerateStore } from '../store/useGenerateStore';

interface DatabaseConfigProps {
  type: string;
}

const DEFAULT_PORTS: Record<string, string> = {
  postgresql: '5432',
  mysql: '3306',
  mssql: '1433',
  sqlite: '0',
  oracle: '1521',
  mariadb: '3306',
  db2: '50000',
  redis: '6379',
  hazelcast: '5701',
  kafka: '9092',
};

interface DbFieldConfig {
  showHost: boolean;
  showPort: boolean;
  showDbName: boolean;
  showUser: boolean;
  showPassword: boolean;
  hostLabel: string;
  portLabel: string;
  dbNameLabel: string;
  userLabel: string;
  passwordLabel: string;
  dbNamePlaceholder: string;
  hint: string;
}

function getFieldConfig(type: string): DbFieldConfig {
  const defaultPort = DEFAULT_PORTS[type] ?? '';

  switch (type) {
    case 'sqlite':
      return {
        showHost: false,
        showPort: false,
        showDbName: true,
        showUser: false,
        showPassword: false,
        hostLabel: 'Host',
        portLabel: 'Port',
        dbNameLabel: 'Database File Path',
        userLabel: 'Username',
        passwordLabel: 'Password',
        dbNamePlaceholder: '/path/to/database.db',
        hint: '',
      };

    case 'redis':
      return {
        showHost: true,
        showPort: true,
        showDbName: true,
        showUser: true,
        showPassword: true,
        hostLabel: 'Host',
        portLabel: 'Port',
        dbNameLabel: 'DB Index (Optional)',
        userLabel: 'Username (Optional)',
        passwordLabel: 'Password (Optional)',
        dbNamePlaceholder: '0',
        hint: 'Redis uses host/port and optional DB index + auth.',
      };

    case 'hazelcast':
      return {
        showHost: true,
        showPort: true,
        showDbName: true,
        showUser: true,
        showPassword: true,
        hostLabel: 'Member Host',
        portLabel: 'Member Port',
        dbNameLabel: 'Cluster Name (Optional)',
        userLabel: 'Username (Optional)',
        passwordLabel: 'Password (Optional)',
        dbNamePlaceholder: 'dev',
        hint: 'Hazelcast uses member host/port and optional cluster/auth fields.',
      };

    case 'kafka':
      return {
        showHost: true,
        showPort: true,
        showDbName: true,
        showUser: true,
        showPassword: true,
        hostLabel: 'Bootstrap Host',
        portLabel: 'Bootstrap Port',
        dbNameLabel: 'Topic (Optional)',
        userLabel: 'SASL Username (Optional)',
        passwordLabel: 'SASL Password (Optional)',
        dbNamePlaceholder: 'events.topic',
        hint: 'Kafka uses bootstrap host/port and optional topic/SASL auth.',
      };

    default:
      return {
        showHost: true,
        showPort: true,
        showDbName: true,
        showUser: true,
        showPassword: true,
        hostLabel: 'Host',
        portLabel: 'Port',
        dbNameLabel: 'Database Name',
        userLabel: 'Username',
        passwordLabel: 'Password',
        dbNamePlaceholder: 'my_database',
        hint: '',
      };
  }

  void defaultPort;
}

export function DatabaseConfig({ type }: DatabaseConfigProps) {
  const dbHost = useGenerateStore((s) => s.dbHost);
  const dbPort = useGenerateStore((s) => s.dbPort);
  const dbName = useGenerateStore((s) => s.dbName);
  const dbUser = useGenerateStore((s) => s.dbUser);
  const dbPassword = useGenerateStore((s) => s.dbPassword);
  const setField = useGenerateStore((s) => s.setField);

  const cfg = useMemo(() => getFieldConfig(type), [type]);
  const defaultPort = useMemo(() => DEFAULT_PORTS[type] ?? '', [type]);

  useEffect(() => {
    if (DEFAULT_PORTS[type]) setField('dbPort', DEFAULT_PORTS[type]);
  }, [type]);

  return (
    <div id="database-section" className="space-y-6">
      {cfg.hint && (
        <p id="db-connection-hint" className="text-xs text-slate-500">{cfg.hint}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cfg.showHost && (
          <div id="db-host-group">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              <span id="dbHostLabel">{cfg.hostLabel}</span>
            </label>
            <input
              type="text"
              id="dbHost"
              placeholder="localhost"
              className="input"
              value={dbHost}
              onChange={(e) => setField('dbHost', e.target.value)}
            />
          </div>
        )}

        {cfg.showPort && (
          <div id="db-port-group">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              <span id="dbPortLabel">{cfg.portLabel}</span>
            </label>
            <input
              type="number"
              id="dbPort"
              placeholder={defaultPort}
              className="input"
              autoComplete="off"
              value={dbPort}
              onChange={(e) => setField('dbPort', e.target.value)}
            />
          </div>
        )}

        {cfg.showDbName && (
          <div id="db-name-group">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              <span id="dbNameLabel">{cfg.dbNameLabel}</span>
            </label>
            <input
              type="text"
              id="dbName"
              placeholder={cfg.dbNamePlaceholder}
              className="input"
              value={dbName}
              onChange={(e) => setField('dbName', e.target.value)}
            />
          </div>
        )}

        {cfg.showUser && (
          <div id="db-user-group">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              <span id="dbUserLabel">{cfg.userLabel}</span>
            </label>
            <input
              type="text"
              id="dbUser"
              placeholder="root"
              className="input"
              value={dbUser}
              onChange={(e) => setField('dbUser', e.target.value)}
            />
          </div>
        )}

        {cfg.showPassword && (
          <div id="db-password-group">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
              <span id="dbPasswordLabel">{cfg.passwordLabel}</span>
            </label>
            <input
              type="password" autoComplete="new-password"
              id="dbPassword"
              placeholder="••••••••"
              className="input"
              value={dbPassword}
              onChange={(e) => setField('dbPassword', e.target.value)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
