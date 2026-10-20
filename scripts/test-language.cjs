const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
const messages = require('../src/i18n/messages.json');
const schema = require('../src/features/developments/serviceNowSchema.json');
const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/i18n/translate.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const mod = { exports: {} };
new Function('require', 'module', 'exports', code)(() => messages, mod, mod.exports);
const { translate, isLanguage } = mod.exports;
assert.equal(translate('Settings', 'fr'), 'Paramètres');
assert.equal(translate('Paramètres', 'en'), 'Settings');
assert.equal(translate('Use cart layout', 'fr'), 'Utiliser la disposition du panier');
assert.equal(translate('Déployer la navigation', 'en'), 'Expand navigation');
assert.equal(translate('Delete "{name}"?', 'fr', { name: '$& <script> untouched' }), 'Supprimer « $& <script> untouched » ?');
assert.equal(translate('Unmapped custom label', 'fr'), 'Unmapped custom label');
assert.equal(translate('sys_custom_field', 'en'), 'sys_custom_field');
assert.equal(translate('constructor', 'en'), 'constructor');
assert.equal(translate('__proto__', 'fr'), '__proto__');
assert.equal(isLanguage('es'), false);
assert.equal(isLanguage('en'), true);
for (const fields of Object.values(schema)) for (const field of fields) {
  for (const label of [field.label, ...(field.choices || []).map(c => c.label)]) {
    assert.ok(Object.hasOwn(messages.fr, label), `Missing French field/choice label: ${label}`);
    assert.ok(Object.hasOwn(messages.en, label), `Missing English field/choice label: ${label}`);
  }
}
for (const [key, value] of Object.entries(messages.en)) {
  assert.ok(typeof messages.fr[key] === 'string', `Missing FR counterpart: ${key}`);
  const placeholders = s => (s.match(/\{\w+\}/g) || []).sort();
  assert.deepEqual(placeholders(value), placeholders(messages.fr[key]), `Interpolation mismatch: ${key}`);
}
console.log('Language checks passed: bilingual catalogue, all ServiceNow field/choice labels, safe interpolation, fallback and locale validation.');
