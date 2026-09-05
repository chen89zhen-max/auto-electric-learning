import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import nextConfig from '../next.config';

const root = process.cwd();

describe('standalone Node production boundary', () => {
  it('enables Vinext standalone output', () => {
    expect(nextConfig.output).toBe('standalone');
  });

  it('starts the built standalone Node server', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8')
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts.start).toBe('node dist/standalone/server.js');
  });

  it('does not load Cloudflare or Sites plugins in the Node build config', () => {
    const viteConfig = fs.readFileSync(path.join(root, 'vite.config.ts'), 'utf8');

    expect(viteConfig).not.toMatch(/@openai\/sites-vite-plugin/);
    expect(viteConfig).not.toMatch(/@cloudflare\/vite-plugin/);
    expect(viteConfig).not.toMatch(/cloudflare:workers/);
    expect(viteConfig).not.toMatch(/wrangler/i);
  });

  it('does not install Worker-only production tooling or types', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(root, 'package.json'), 'utf8')
    ) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const installed = { ...packageJson.dependencies, ...packageJson.devDependencies };
    const tsconfig = fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8');

    expect(installed).not.toHaveProperty('@openai/sites-vite-plugin');
    expect(installed).not.toHaveProperty('@cloudflare/vite-plugin');
    expect(installed).not.toHaveProperty('@cloudflare/workers-types');
    expect(installed).not.toHaveProperty('wrangler');
    expect(tsconfig).not.toContain('@cloudflare/workers-types');
  });
});
