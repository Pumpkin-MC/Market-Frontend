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

// 3. Verify every locale keeps the same i18next interpolation placeholders and
//    react-i18next <Trans> markup tags as the reference locale. A mismatch makes
//    i18next render the raw placeholder / tag text instead of the value or element
//    (e.g. a zh translation of "Plugins by <author />" written as "{{name}} 的所有作品"
//    renders a literal "{{name}}" because the page passes a component, not a value).
logInfo('Checking interpolation placeholders and Trans tags against en.json...');

const PLACEHOLDER_RE = /\{\{\s*([^{}]+?)\s*\}\}/g;
const MARKUP_TAG_RE = /<\s*(\/?)\s*([A-Za-z][A-Za-z0-9_.-]*)\s*(\/?)\s*>/g;

function placeholderNames(value) {
  const names = new Set();
  let match;
  PLACEHOLDER_RE.lastIndex = 0;
  while ((match = PLACEHOLDER_RE.exec(value)) !== null) {
    names.add(match[1].split(',')[0].trim());
  }
  return names;
}

function markupTags(value) {
  const tags = new Set();
  let match;
  MARKUP_TAG_RE.lastIndex = 0;
  while ((match = MARKUP_TAG_RE.exec(value)) !== null) {
    tags.add((match[1] ? '</' : '<') + match[2]);
  }
  return tags;
}

function setsEqual(a, b) {
  return a.size === b.size && [...a].every((item) => b.has(item));
}

function formatPlaceholders(names) {
  return names.size ? [...names].map((name) => `{{${name}}}`).join(' ') : '(none)';
}

function formatTags(tags) {
  if (!tags.size) return '(none)';
  return [...tags]
    .map((tag) => (tag.startsWith('</') ? `</${tag.slice(2)}>` : `<${tag.slice(1)}>`))
    .join(' ');
}

for (const [lang, data] of Object.entries(locales)) {
  if (lang === 'en') continue;
  const langFlat = flattenKeys(data);

  for (const key of enLeafKeys) {
    const translated = langFlat[key];
    if (!translated || translated.type !== 'string') continue;

    const reference = enFlat[key].value;
    const referencePlaceholders = placeholderNames(reference);
    const placeholders = placeholderNames(translated.value);
    if (!setsEqual(referencePlaceholders, placeholders)) {
      logError(
        `[${lang}.json] Key "${key}" uses different interpolation placeholders than en.json ` +
          `(en_us: ${formatPlaceholders(referencePlaceholders)}, ${lang}: ${formatPlaceholders(placeholders)}). ` +
          `Every locale must keep the reference {{variables}} so i18next can interpolate them. Value: "${translated.value}"`
      );
    }

    const referenceTags = markupTags(reference);
    const tags = markupTags(translated.value);
    if (!setsEqual(referenceTags, tags)) {
      logError(
        `[${lang}.json] Key "${key}" uses different Trans markup tags than en.json ` +
          `(en_us: ${formatTags(referenceTags)}, ${lang}: ${formatTags(tags)}). ` +
          `Keep the reference <tags> so react-i18next can render the components. Value: "${translated.value}"`
      );
    }
  }
}

// 4. Scan literal keys in t('...') calls and <Trans i18nKey="..." />.
logInfo('Scanning source code for t(...) and Trans translation keys...');
const tRegex = /(?:\bt\(\s*|\bi18nKey\s*=\s*)['"`]([^'"`]+)['"`]/g;

// --- Minimal reader for a <Trans ...> opening tag: finds i18nKey and the object
// --- literal keys of its `values` / `components` props, ignoring nested JSX/strings.
const I18NEXT_OPTIONS = new Set([
  'defaultValue', 'ns', 'keySeparator', 'nsSeparator', 'context', 'count', 'replace',
  'lng', 'lngs', 'fallbackLng', 'returnObjects', 'returnDetails', 'joinArrays',
  'postProcess', 'interpolation', 'escapeValue', 'shouldUnescape', 'skipInterpolation',
  'tMissing', 'cleanCode', 'operator', 'value', 'component', 'keyPrefix', 'resolvedLanguage',
]);

// Lowercase HTML tags that react-i18next renders natively without a `components` entry.
const NATIVE_HTML_TAGS = new Set([
  'br', 'strong', 'b', 'i', 'em', 'u', 's', 'small', 'span', 'p', 'code', 'pre', 'sup',
  'sub', 'mark', 'del', 'ins', 'kbd', 'var', 'samp', 'q', 'cite', 'abbr', 'ul', 'ol', 'li',
  'div', 'blockquote', 'hr', 'label', 'figure', 'figcaption', 'section', 'article',
  'header', 'footer', 'nav', 'main', 'aside', 'dl', 'dt', 'dd', 'time', 'address',
  'details', 'summary', 'dialog', 'table', 'thead', 'tbody', 'tr', 'td', 'th',
]);

function isIdentChar(char) {
  return char !== undefined && /[A-Za-z0-9_$]/.test(char);
}

function skipString(src, start) {
  const quote = src[start];
  let i = start + 1;
  while (i < src.length) {
    const char = src[i];
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (char === quote) return i + 1;
    if (char === '\n' && quote !== '`') return i;
    i++;
  }
  return i;
}

function skipComment(src, start) {
  if (src[start] === '/' && src[start + 1] === '/') {
    const end = src.indexOf('\n', start + 2);
    return end === -1 ? src.length : end;
  }
  if (src[start] === '/' && src[start + 1] === '*') {
    const end = src.indexOf('*/', start + 2);
    return end === -1 ? src.length : end + 2;
  }
  return -1;
}

function skipBalanced(src, start, open, close) {
  let depth = 0;
  let i = start;
  while (i < src.length) {
    const char = src[i];
    const commentEnd = skipComment(src, i);
    if (commentEnd !== -1) {
      i = commentEnd;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      i = skipString(src, i);
      continue;
    }
    if (char === open) depth++;
    else if (char === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
    i++;
  }
  return i;
}

function readStringLiteral(src, start) {
  const quote = src[start];
  let value = '';
  let i = start + 1;
  while (i < src.length) {
    const char = src[i];
    if (char === '\\') {
      const escaped = src[i + 1];
      value += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped === '\n' ? '' : escaped;
      i += 2;
      continue;
    }
    if (char === quote) return { value, end: i + 1 };
    value += char;
    i++;
  }
  return { value, end: i };
}

function objectKeys(body) {
  const keys = [];
  let spread = false;
  let segmentStart = 0;
  let i = 0;
  const segments = [];
  while (i < body.length) {
    const char = body[i];
    const commentEnd = skipComment(body, i);
    if (commentEnd !== -1) {
      i = commentEnd;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      i = skipString(body, i);
      continue;
    }
    if (char === '(' || char === '[' || char === '{') {
      i = skipBalanced(body, i, char, char === '(' ? ')' : char === '[' ? ']' : '}');
      continue;
    }
    if (char === ',') {
      segments.push(body.slice(segmentStart, i));
      segmentStart = i + 1;
    }
    i++;
  }
  segments.push(body.slice(segmentStart));

  for (let segment of segments) {
    segment = segment.trim();
    if (!segment) continue;
    if (segment.startsWith('...')) {
      spread = true;
      continue;
    }
    if (segment.startsWith('[')) continue;
    const match = segment.match(/^([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (match) {
      const rest = segment.slice(match[1].length).trimStart();
      if (rest === '' || rest.startsWith(':') || rest.startsWith('(')) {
        keys.push(match[1]);
        continue;
      }
    }
    if (segment.startsWith('"') || segment.startsWith("'")) {
      keys.push(readStringLiteral(segment, 0).value);
    }
  }
  return { keys, spread };
}

function parseTransTag(content, tagStart) {
  let i = tagStart + '<Trans'.length;
  let braceDepth = 0;
  let selfClosing = false;
  let tagEnd = -1;
  while (i < content.length) {
    const char = content[i];
    const commentEnd = skipComment(content, i);
    if (commentEnd !== -1) {
      i = commentEnd;
      continue;
    }
    if (char === '"' || char === "'") {
      i = skipString(content, i);
      continue;
    }
    if (char === '{') braceDepth++;
    else if (char === '}') braceDepth--;
    else if (braceDepth === 0 && char === '/' && content[i + 1] === '>') {
      selfClosing = true;
      tagEnd = i + 2;
      break;
    } else if (braceDepth === 0 && char === '>') {
      tagEnd = i + 1;
      break;
    }
    i++;
  }
  if (tagEnd === -1) return null;

  const attributeText = content.slice(tagStart + '<Trans'.length, selfClosing ? tagEnd - 2 : tagEnd - 1);
  const attributes = {};
  let j = 0;
  while (j < attributeText.length) {
    while (j < attributeText.length && /\s/.test(attributeText[j])) j++;
    if (j >= attributeText.length) break;
    const nameStart = j;
    while (j < attributeText.length && /[A-Za-z0-9_$:-]/.test(attributeText[j])) j++;
    const name = attributeText.slice(nameStart, j);
    while (j < attributeText.length && /\s/.test(attributeText[j])) j++;
    if (attributeText[j] !== '=') {
      // Bare boolean attribute (e.g. `count`) or an unreadable character: make
      // sure the loop always makes progress.
      if (!name) j++;
      continue;
    }
    j++;
    while (j < attributeText.length && /\s/.test(attributeText[j])) j++;
    const char = attributeText[j];
    if (char === '"' || char === "'") {
      const literal = readStringLiteral(attributeText, j);
      attributes[name] = { string: literal.value };
      j = literal.end;
    } else if (char === '{') {
      const close = skipBalanced(attributeText, j, '{', '}');
      attributes[name] = { expression: attributeText.slice(j + 1, close - 1) };
      j = close;
    } else {
      j++;
    }
  }

  const result = { i18nKey: null, values: null, components: null, end: tagEnd };
  if (attributes.i18nKey) {
    if (attributes.i18nKey.string !== undefined) result.i18nKey = attributes.i18nKey.string;
    else if (attributes.i18nKey.expression) {
      const expression = attributes.i18nKey.expression.trim();
      if (/^['"`]/.test(expression)) result.i18nKey = readStringLiteral(expression, 0).value;
    }
  }
  const keysOfAttribute = (attribute) => {
    if (!attribute || attribute.expression === undefined) return null;
    const expression = attribute.expression.trim();
    if (!expression.startsWith('{')) return null;
    const close = skipBalanced(expression, 0, '{', '}');
    return close === expression.length ? objectKeys(expression.slice(1, -1)).keys : null;
  };
  result.values = keysOfAttribute(attributes.values);
  result.components = keysOfAttribute(attributes.components);
  return result;
}

function getEnTemplate(key) {
  const direct = getNestedValue(locales.en, key);
  if (typeof direct === 'string') return direct;
  const plural = getNestedValue(locales.en, `${key}_other`);
  if (typeof plural === 'string') return plural;
  const pluralOne = getNestedValue(locales.en, `${key}_one`);
  return typeof pluralOne === 'string' ? pluralOne : null;
}

function checkTransUsage(content, relPath) {
  const lineNumberAt = (position) => content.slice(0, position).split('\n').length;
  let searchFrom = 0;
  while (searchFrom < content.length) {
    const position = content.indexOf('<Trans', searchFrom);
    if (position === -1) break;
    searchFrom = position + 1;
    if (isIdentChar(content[position + '<Trans'.length])) continue;

    const parsed = parseTransTag(content, position);
    if (!parsed) continue;
    searchFrom = parsed.end;
    if (!parsed.i18nKey) continue;

    const template = getEnTemplate(parsed.i18nKey);
    const line = lineNumberAt(position);
    if (template === null) continue;
    const templateTags = markupTags(template);
    const templatePlaceholders = placeholderNames(template);

    // Components the code provides must exist in the reference template, otherwise
    // the localized text silently loses the intended content (e.g. an email link).
    if (parsed.components) {
      for (const component of parsed.components) {
        if (!templateTags.has(`<${component}`)) {
          logError(
            `${relPath}:${line} - <Trans i18nKey="${parsed.i18nKey}"> passes component "${component}" ` +
              `but en.json has no <${component}> tag. en_us template: "${template}"`
          );
        }
      }
    }
    // Tags in the reference template that are not native HTML must be provided as
    // components, otherwise react-i18next would render them as literal text.
    for (const tag of templateTags) {
      if (!tag.startsWith('<') || tag.startsWith('</')) continue;
      const name = tag.slice(1);
      if (NATIVE_HTML_TAGS.has(name)) continue;
      if (!parsed.components || !parsed.components.includes(name)) {
        logError(
          `${relPath}:${line} - <Trans i18nKey="${parsed.i18nKey}"> renders <${name}> in en.json ` +
            `but does not pass a "${name}" component. en_us template: "${template}"`
        );
      }
    }
    // Interpolation variables in the reference template must be supplied (count is
    // handled by i18next pluralization and may come from a `count` prop instead).
    const providedValues = new Set([
      ...(parsed.values || []),
      ...(parsed.components || []),
      'count',
    ]);
    for (const placeholder of templatePlaceholders) {
      if (I18NEXT_OPTIONS.has(placeholder)) continue;
      if (!providedValues.has(placeholder)) {
        logError(
          `${relPath}:${line} - <Trans i18nKey="${parsed.i18nKey}"> uses {{${placeholder}}} in en.json ` +
            `but does not pass it via values/components. en_us template: "${template}"`
        );
      }
    }
  }
}

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

          // Handle dynamic template keys like `guidelines.items.${item.key}.title`
          if (key.includes('${')) {
            const regexSource =
              '^' +
              key
                .replace(/\$\{[^}]+\}/g, '__WILDCARD__')
                .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
                .replace(/__WILDCARD__/g, '[^.]+') +
              '$';
            const pattern = new RegExp(regexSource);
            const matchingKeys = enLeafKeys.filter(k => pattern.test(k));
            if (matchingKeys.length === 0) {
              logError(`${relPath}:${lineNum} - Dynamic translation key pattern "${key}" does not match any string key in en.json`);
            }
            continue;
          }

          // Check if key exists in en.json
          const value = getNestedValue(locales.en, key);

          if (value === undefined) {
            // English plural keys are stored as key_one/key_other and called
            // using the unsuffixed key with a count option.
            if (
              typeof getNestedValue(locales.en, `${key}_one`) === 'string' &&
              typeof getNestedValue(locales.en, `${key}_other`) === 'string'
            ) {
              continue;
            }
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

      checkTransUsage(content, relPath);
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
