// Task 5: Option chaining
// Rewrite using Option with chain/flatMap to compose optional operations
// Focus on: fromNullable, chain, map, getOrElse, fromPredicate

interface Config {
  database?: {
    host?: string;
    port?: number;
  };
}

const config: Config = {
  database: {
    host: 'localhost',
    port: 5432,
  },
};

const emptyConfig: Config = {};

function buildConnectionString(cfg: Config): string | null {
  if (!cfg.database) return null;
  if (!cfg.database.host) return null;

  const port = cfg.database.port;
  if (port !== undefined && (port < 1 || port > 65535)) return null;

  const portStr = port ? `:${port}` : '';
  return `postgresql://${cfg.database.host}${portStr}`;
}

function getConnectionOrDefault(cfg: Config): string {
  const conn = buildConnectionString(cfg);
  return conn ?? 'postgresql://localhost:5432';
}

console.log(getConnectionOrDefault(config));      // "postgresql://localhost:5432"
console.log(getConnectionOrDefault(emptyConfig)); // "postgresql://localhost:5432"
console.log(getConnectionOrDefault({ database: { host: 'prod.db', port: 99999 } }));
// "postgresql://localhost:5432" (invalid port)
