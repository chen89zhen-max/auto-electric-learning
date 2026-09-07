import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

describe('P4-P6 Typography Guard (AST & JSX Parser)', () => {
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
      } else if (entry.isFile() && entry.name.endsWith('.tsx')) {
        files.push(fullPath);
      }
    }
    return files;
  }

  const allTargetFiles = targetLevels.flatMap((lvl) => getAllTsxFiles(path.join(levelsDir, lvl)));

  it('strictly forbids arbitrary pixel font-sizes <= 12px across all P4-P6 level components', () => {
    const violations: { file: string; line: number; text: string }[] = [];

    for (const file of allTargetFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (/text-\[(?:1[012]|9|[0-8])px\]/.test(line)) {
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
      expect.fail(`Found ${violations.length} instances of illegal sub-13px fonts in P4-P6:\n${details}`);
    }
    expect(violations.length).toBe(0);
  });

  it('strictly forbids text-xs across P4-P6 level components unless explicitly audited with data-typography="secondary"', () => {
    const violations: { file: string; line: number; tag: string; snippet: string }[] = [];
    const auditedSecondaryElements: { file: string; line: number; tag: string; snippet: string }[] = [];

    for (const filePath of allTargetFiles) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const sourceFile = ts.createSourceFile(
        filePath,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      );

      const getLine = (node: ts.Node) => {
        return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
      };

      const extractClassNames = (attrNode: ts.JsxAttribute): string[] => {
        const classes: string[] = [];
        if (!attrNode.initializer) return classes;

        const collectStrings = (node: ts.Node) => {
          if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
            classes.push(...node.text.split(/\s+/));
          } else if (ts.isTemplateExpression(node)) {
            classes.push(...node.head.text.split(/\s+/));
            for (const span of node.templateSpans) {
              classes.push(...span.literal.text.split(/\s+/));
              collectStrings(span.expression);
            }
          } else {
            ts.forEachChild(node, collectStrings);
          }
        };

        collectStrings(attrNode.initializer);
        return classes.filter(Boolean);
      };

      const getAttr = (attributes: ts.JsxAttributes, name: string): ts.JsxAttribute | undefined => {
        for (const prop of attributes.properties) {
          if (ts.isJsxAttribute(prop) && prop.name.getText(sourceFile) === name) {
            return prop;
          }
        }
        return undefined;
      };

      const hasSecondaryAuditAttr = (attributes: ts.JsxAttributes): boolean => {
        const attr = getAttr(attributes, 'data-typography');
        if (!attr || !attr.initializer) return false;
        if (ts.isStringLiteral(attr.initializer)) {
          return attr.initializer.text === 'secondary';
        }
        if (
          ts.isJsxExpression(attr.initializer) &&
          attr.initializer.expression &&
          ts.isStringLiteral(attr.initializer.expression)
        ) {
          return attr.initializer.expression.text === 'secondary';
        }
        return false;
      };

      const visit = (node: ts.Node) => {
        let isOpeningOrSelf = false;
        let tagName = '';
        let attributes: ts.JsxAttributes | undefined;

        if (ts.isJsxSelfClosingElement(node)) {
          isOpeningOrSelf = true;
          tagName = node.tagName.getText(sourceFile);
          attributes = node.attributes;
        } else if (ts.isJsxOpeningElement(node)) {
          isOpeningOrSelf = true;
          tagName = node.tagName.getText(sourceFile);
          attributes = node.attributes;
        }

        if (isOpeningOrSelf && attributes) {
          const classAttr = getAttr(attributes, 'className');
          if (classAttr) {
            const classList = extractClassNames(classAttr);
            const hasTextXs = classList.includes('text-xs');

            if (hasTextXs) {
              const nodeText = node.getText(sourceFile);
              if (hasSecondaryAuditAttr(attributes)) {
                auditedSecondaryElements.push({
                  file: path.relative(process.cwd(), filePath),
                  line: getLine(node),
                  tag: tagName,
                  snippet: nodeText.slice(0, 100).replace(/\s+/g, ' '),
                });
              } else {
                violations.push({
                  file: path.relative(process.cwd(), filePath),
                  line: getLine(node),
                  tag: tagName,
                  snippet: nodeText.slice(0, 100).replace(/\s+/g, ' '),
                });
              }
            }
          }
        }

        ts.forEachChild(node, visit);
      };

      visit(sourceFile);
    }

    if (violations.length > 0) {
      const details = violations
        .map((v) => `${v.file}:${v.line} [<${v.tag}>] -> ${v.snippet}`)
        .join('\n');
      expect.fail(
        `Found ${violations.length} unauthorized text-xs elements in P4-P6. Elements with text-xs must be elevated to text-sm or explicitly tagged with data-typography="secondary" for audit:\n${details}`
      );
    }
    expect(violations.length).toBe(0);
  });
});
