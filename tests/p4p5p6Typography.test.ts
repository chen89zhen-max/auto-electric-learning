import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('P4-P6 Typography Guard', () => {
  const levelsDir = path.resolve(process.cwd(), 'src/levels');
  const targetLevels = [
    'c01', 'c02', 'c03',
    'd01', 'd02', 'd03', 'd04', 'd05',
    'e01', 'e02', 'e03', 'e04', 'e05', 'e06', 'e07',
  ];

  function getAllTsxFiles(dir: string): string[] {
    const files: string[] = [];
    if (!fs.existsSync(dir)) return files;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...getAllTsxFiles(fullPath));
      } else if (entry.isFile() && (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts'))) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allTargetFiles = targetLevels.flatMap((lvl) => getAllTsxFiles(path.join(levelsDir, lvl)));

  it('strictly forbids text-[10px] across all P4-P6 level components', () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of allTargetFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes('text-[10px]')) {
          violations.push({
            file: path.relative(process.cwd(), file),
            line: idx + 1,
            text: line.trim(),
          });
        }
      });
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `${v.file}:${v.line} -> ${v.text}`).join('\n');
      expect.fail(`Found ${violations.length} instances of illegal text-[10px] in P4-P6:\n${details}`);
    }
    expect(violations.length).toBe(0);
  });

  it('requires primary submit buttons and action controls to be at least 14px (text-sm or text-base)', () => {
    // Audit major submit button patterns across P4-P6
    const buttonViolations: { file: string; line: number; text: string }[] = [];

    for (const file of allTargetFiles) {
      if (!file.endsWith('.tsx')) continue;
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        // Flags submit/advance buttons that shrink down to text-xs
        if (
          line.includes('<button') ||
          line.includes('type="submit"') ||
          line.includes('onClick=')
        ) {
          const surrounding = lines.slice(Math.max(0, idx - 1), Math.min(lines.length, idx + 4)).join(' ');
          if (
            (surrounding.includes('提交') || surrounding.includes('确认') || surrounding.includes('下一步')) &&
            surrounding.includes('text-xs') &&
            !surrounding.includes('text-sm') &&
            !surrounding.includes('text-base')
          ) {
            buttonViolations.push({
              file: path.relative(process.cwd(), file),
              line: idx + 1,
              text: surrounding.slice(0, 100),
            });
          }
        }
      });
    }

    if (buttonViolations.length > 0) {
      const details = buttonViolations.map((v) => `${v.file}:${v.line} -> ${v.text}`).join('\n');
      expect.fail(`Found ${buttonViolations.length} action buttons with undersized text-xs (must be >= 14px text-sm):\n${details}`);
    }
    expect(buttonViolations.length).toBe(0);
  });
});
