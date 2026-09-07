import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export default async function globalTeardown(): Promise<void> {
  const appDataDir = process.env.APP_DATA_DIR;
  if (!appDataDir || !path.isAbsolute(appDataDir)) return;
  const pidFile = path.join(appDataDir, 'browser-server.pid');
  if (!existsSync(pidFile)) return;

  const pid = Number.parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
  if (Number.isSafeInteger(pid) && pid > 0 && isRunning(pid)) {
    process.kill(pid, 'SIGTERM');
    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline && isRunning(pid)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (isRunning(pid)) process.kill(pid, 'SIGKILL');
  }
  unlinkSync(pidFile);
}
