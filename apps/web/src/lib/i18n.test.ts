import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('i18n catalogs', () => {
  const enPath = path.resolve(__dirname, '../../messages/en.json');
  const trPath = path.resolve(__dirname, '../../messages/tr.json');

  const enRaw = fs.readFileSync(enPath, 'utf-8');
  const trRaw = fs.readFileSync(trPath, 'utf-8');

  const en = JSON.parse(enRaw) as Record<string, string>;
  const tr = JSON.parse(trRaw) as Record<string, string>;

  const enKeys = Object.keys(en);
  const trKeys = Object.keys(tr);

  it('both catalogs have the same key set', () => {
    const enOnly = enKeys.filter((k) => !trKeys.includes(k));
    const trOnly = trKeys.filter((k) => !enKeys.includes(k));

    if (enOnly.length > 0 || trOnly.length > 0) {
      console.error('Keys only in EN:', enOnly);
      console.error('Keys only in TR:', trOnly);
    }

    expect(enOnly).toEqual([]);
    expect(trOnly).toEqual([]);
  });

  it('no value is empty', () => {
    const emptyEn = enKeys.filter((k) => !en[k] || en[k].trim() === '');
    const emptyTr = trKeys.filter((k) => !tr[k] || tr[k].trim() === '');

    expect(emptyEn).toEqual([]);
    expect(emptyTr).toEqual([]);
  });

  it('each key has the same placeholder set in both locales', () => {
    const extractPlaceholders = (str: string) => {
      const matches = str.match(/\{[^}]+\}/g);
      return matches ? Array.from(new Set(matches)).sort() : [];
    };

    const diffs: Record<string, { en: string[]; tr: string[] }> = {};

    for (const key of enKeys) {
      if (!tr[key]) continue; // handled by key set test
      const enPlaceholders = extractPlaceholders(en[key]);
      const trPlaceholders = extractPlaceholders(tr[key]);

      if (JSON.stringify(enPlaceholders) !== JSON.stringify(trPlaceholders)) {
        diffs[key] = { en: enPlaceholders, tr: trPlaceholders };
      }
    }

    expect(diffs).toEqual({});
  });

  it('all keys are referenced in src/**/*.{ts,tsx}', () => {
    const srcDir = path.resolve(__dirname, '..');

    const readAllFiles = (dir: string): string[] => {
      const files = fs.readdirSync(dir);
      let allFiles: string[] = [];
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          allFiles = allFiles.concat(readAllFiles(fullPath));
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
          allFiles.push(fullPath);
        }
      }
      return allFiles;
    };

    const allFiles = readAllFiles(srcDir);
    let allContent = '';
    for (const file of allFiles) {
      allContent += fs.readFileSync(file, 'utf-8') + '\n';
    }

    const allowlist: string[] = [
      'landing.ticker.example',
      'onboard.',
      'statStrip.',
      'badges.',
      'people.suggest.mutual.',
    ];

    const unreferencedKeys = enKeys.filter((key) => {
      if (allowlist.some((allowed) => key.startsWith(allowed))) return false;

      const inSingle = allContent.includes(`'${key}'`);
      const inDouble = allContent.includes(`"${key}"`);
      const inBacktick = allContent.includes(`\`${key}\``);
      // check for usage in an object property, like 'key': '...'
      const inObjDouble = allContent.includes(`"${key}":`);
      const inObjSingle = allContent.includes(`'${key}':`);

      return !(inSingle || inDouble || inBacktick || inObjDouble || inObjSingle);
    });

    if (unreferencedKeys.length > 0) {
      console.error('Unreferenced keys:', unreferencedKeys);
    }

    expect(unreferencedKeys).toEqual([]);
  });
});
