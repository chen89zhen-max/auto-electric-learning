import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function run(command: string, args: string[]): void {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')} exited with ${result.status}`);
}

async function waitForHealth(url: string): Promise<void> {
  const deadline = Date.now() + 30_000;
  let lastError: unknown;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (response.ok) return;
      lastError = new Error(`health returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`browser server did not become healthy: ${String(lastError)}`);
}

export default async function globalSetup(): Promise<void> {
  const appDataDir = process.env.APP_DATA_DIR;
  if (!appDataDir || !path.isAbsolute(appDataDir)) {
    throw new Error('APP_DATA_DIR must be an absolute isolated browser-test directory');
  }

  if (process.platform === 'win32') {
    const commandProcessor = process.env.ComSpec ?? 'cmd.exe';
    run(commandProcessor, ['/d', '/s', '/c', 'npm run build']);
    run(commandProcessor, ['/d', '/s', '/c', 'npx vitest run --config scripts/browser-e2e/vitest.seed.config.ts --configLoader runner']);
  } else {
    run('npm', ['run', 'build']);
    run('npx', ['vitest', 'run', '--config', 'scripts/browser-e2e/vitest.seed.config.ts', '--configLoader', 'runner']);
  }

  mkdirSync(appDataDir, { recursive: true });
  const server = spawn(process.execPath, ['dist/standalone/server.js'], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'ignore',
    windowsHide: true,
  });
  if (!server.pid) throw new Error('browser server did not return a pid');
  writeFileSync(path.join(appDataDir, 'browser-server.pid'), String(server.pid), 'utf8');
  server.unref();

  await waitForHealth(`http://127.0.0.1:${process.env.PORT ?? '4175'}/api/health`);
}
