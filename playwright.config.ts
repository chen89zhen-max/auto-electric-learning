import { defineConfig } from '@playwright/test';
import path from 'node:path';

const port = 4175;
const appDataDir = path.resolve(
  'tmp',
  'browser-e2e-data',
  `run-${Date.now()}-${process.pid}`,
);
const artifactDir = path.resolve('tmp', 'browser-e2e-artifacts', `run-${Date.now()}-${process.pid}`);

// Browser tests must never inherit the application's normal data directory.
Object.assign(process.env, {
  APP_DATA_DIR: appDataDir,
  ENABLE_DEMO_SEED: 'true',
  NODE_ENV: 'development',
  PORT: String(port),
});

export default defineConfig({
  testDir: './tests/browser',
  globalSetup: './scripts/browser-e2e/global-setup.ts',
  globalTeardown: './scripts/browser-e2e/global-teardown.ts',
  workers: 1,
  outputDir: path.join(artifactDir, 'test-results'),
  reporter: [['html', { open: 'never', outputFolder: path.join(artifactDir, 'report') }], ['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chrome', use: { browserName: 'chromium', channel: 'chrome' } },
    { name: 'edge', use: { browserName: 'chromium', channel: 'msedge' } },
  ],
});
