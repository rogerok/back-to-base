// Task 7: IO
// Rewrite using IO from fp-ts/IO to make side effects explicit and composable
// Side effects to wrap: Date.now(), Math.random(), console.log, localStorage

interface LogEntry {
  id: string;
  timestamp: number;
  message: string;
}

// Impure: relies on side effects scattered throughout
function createLogEntry(message: string): LogEntry {
  return {
    id: Math.random().toString(36).slice(2),
    timestamp: Date.now(),
    message,
  };
}

function saveToStorage(entry: LogEntry): void {
  const existing = localStorage.getItem('logs');
  const logs: LogEntry[] = existing ? JSON.parse(existing) : [];
  logs.push(entry);
  localStorage.setItem('logs', JSON.stringify(logs));
  console.log(`[LOG] ${entry.timestamp}: ${entry.message}`);
}

function logMessage(message: string): void {
  const entry = createLogEntry(message);
  saveToStorage(entry);
}

logMessage('App started');
logMessage('User logged in');
