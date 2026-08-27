import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, '..');
const localesDir = path.join(rootDir, 'src', 'locales');
const srcDir = path.join(rootDir, 'src');

let hasErrors = false;

function logError(msg) {
  console.error(`\x1b[31m✖ ${msg}\x1b[0m`);
  hasErrors = true;
}

function logSuccess(msg) {
  console.log(`\x1b[32m✔ ${msg}\x1b[0m`);
}

function logInfo(msg) {
  console.log(`\x1b[36mℹ ${msg}\x1b[0m`);
}

// 1. Load and parse all locale files
logInfo('Validating locale JSON files...');
const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));
const locales = {};

for (const file of localeFiles) {
  const lang = path.basename(file, '.json');
  const filePath = path.join(localesDir, file);
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    locales[lang] = JSON.parse(content);
  } catch (err) {
    logError(`Invalid JSON in ${file}: ${err.message}`);
  }
}

if (!locales.en) {
  logError('Reference locale en.json not found!');
  process.exit(1);
}

// Helper to flatten nested object keys
function flattenKeys(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[fullKey] = { type: 'object', value };
      Object.assign(result, flattenKeys(value, fullKey));
    } else {
      result[fullKey] = { type: typeof value, value };
    }
  }
  return result;
}

// Helper to get nested value by dot path
function getNestedValue(obj, keyPath) {
  const parts = keyPath.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

const enFlat = flattenKeys(locales.en);
const enLeafKeys = Object.keys(enFlat).filter(k => enFlat[k].type === 'string');

logSuccess(`Reference locale en.json has ${enLeafKeys.length} string keys.`);

// 2. Check parity of all other locales against en.json
logInfo('Checking translation parity across all locales...');
for (const [lang, data] of Object.entries(locales)) {
  if (lang === 'en') continue;
  const langFlat = flattenKeys(data);

  for (const key of enLeafKeys) {
    if (!langFlat[key]) {
      logError(`[${lang}.json] Missing translation key: "${key}"`);
    } else if (langFlat[key].type !== 'string') {
      logError(`[${lang}.json] Key "${key}" should be string, found ${langFlat[key].type}`);
    } else if (typeof langFlat[key].value === 'string' && langFlat[key].value.trim() === '') {
      logError(`[${lang}.json] Key "${key}" is empty string`);
    }
  }

  for (const key of Object.keys(langFlat)) {
    if (langFlat[key].type === 'string' && !enFlat[key]) {
      logError(`[${lang}.json] Extraneous translation key not in en.json: "${key}"`);
    }
  }
}

// 3. Scan source code for t('...') usages
logInfo('Scanning source code for t(...) translation calls...');
const tRegex = /\bt\(\s*['"`]([^'"`]+)['"`]/g;

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'locales' || entry.name === 'node_modules' || entry.name === 'dist') {
        continue;
      }
      scanDir(fullPath);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lines = content.split('\n');
      const relPath = path.relative(rootDir, fullPath);

      lines.forEach((line, lineIndex) => {
        // Strip single line comments
        const cleanLine = line.replace(/\/\/.*$/, '');
        let match;
        tRegex.lastIndex = 0;
        while ((match = tRegex.exec(cleanLine)) !== null) {
          const key = match[1];
          const lineNum = lineIndex + 1;

          // Check if key exists in en.json
          const value = getNestedValue(locales.en, key);

          if (value === undefined) {
            logError(`${relPath}:${lineNum} - Translation key "${key}" does not exist in en.json`);
          } else if (typeof value === 'object' && value !== null) {
            logError(
              `${relPath}:${lineNum} - Translation key "${key}" returned an object instead of string! Did you mean a nested key like "${key}.${Object.keys(value)[0]}"?`
            );
          } else if (typeof value !== 'string') {
            logError(`${relPath}:${lineNum} - Translation key "${key}" is of type ${typeof value}, expected string`);
          }
        }
      });
    }
  }
}

scanDir(srcDir);

if (hasErrors) {
  console.error('\n\x1b[31m❌ i18n validation failed with errors above.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\n\x1b[32m✔ All translation keys and locale files validated successfully!\x1b[0m\n');
  process.exit(0);
}
