// Task 9: Reader
// Rewrite using Reader from fp-ts/Reader to inject dependencies
// Instead of passing config/services as arguments everywhere, use Reader

interface AppConfig {
  apiUrl: string;
  apiKey: string;
  timeout: number;
}

interface Logger {
  log: (msg: string) => void;
  error: (msg: string) => void;
}

interface AppEnv {
  config: AppConfig;
  logger: Logger;
}

// Everything receives env explicitly — gets messy at scale
function buildHeaders(env: AppEnv): Record<string, string> {
  return {
    Authorization: `Bearer ${env.config.apiKey}`,
    'Content-Type': 'application/json',
  };
}

function buildUrl(env: AppEnv, path: string): string {
  return `${env.config.apiUrl}${path}`;
}

function logRequest(env: AppEnv, method: string, url: string): void {
  env.logger.log(`[${method}] ${url}`);
}

function makeRequest(env: AppEnv, method: string, path: string): string {
  const url = buildUrl(env, path);
  logRequest(env, method, url);
  const headers = buildHeaders(env);
  return `Request: ${method} ${url} with headers ${JSON.stringify(headers)}`;
}

const env: AppEnv = {
  config: { apiUrl: 'https://api.example.com', apiKey: 'secret-key', timeout: 5000 },
  logger: { log: console.log, error: console.error },
};

console.log(makeRequest(env, 'GET', '/users'));
console.log(makeRequest(env, 'POST', '/orders'));
