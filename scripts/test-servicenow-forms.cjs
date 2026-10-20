const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(name) {
  const filename = path.join(root, 'src/features/developments', name + '.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const mod = {exports: {}};
  new Function('require', 'module', 'exports', code)(id => id.endsWith('.json') ? JSON.parse(fs.readFileSync(path.join(path.dirname(filename), id))) : load(path.basename(id)), mod, mod.exports);
  return mod.exports;
}
const {normalizeSnConfig, updateSnConfig, snBoolean, isSnFieldVisible, SN_SCHEMAS, ADDITIONAL_TYPES} = load('serviceNowForms');
const {getDevTypeConfig, DEVELOPMENT_TYPE_OPTIONS} = load('developmentTypes');
const old = {condition: 'active=true', table: 'incident', insert: false, script: 'keep();', custom: {a: 1}};
const normalized = normalizeSnConfig('sys_script', old);
assert.equal(normalized.filter_condition, 'active=true');
assert.equal(normalized.condition, '');
assert.equal(normalized.collection, 'incident');
assert.equal(normalized.action_insert, false);
assert.equal(old.condition, 'active=true');
const updated = updateSnConfig('sys_script', old, 'condition', 'current.active');
assert.equal(normalizeSnConfig('sys_script', updated).condition, 'current.active');
assert.equal(updated.filter_condition, 'active=true');
assert.deepEqual(updated.custom, {a: 1});
assert.equal(updated.script, 'keep();');
assert.equal(updateSnConfig('sys_script', updated, 'collection', 'task').table, 'task');
assert.equal(snBoolean('false'), false);
assert.equal(snBoolean('true'), true);
assert.equal(isSnFieldVisible('sys_script', 'script', {advanced: false}), false);
assert.equal(isSnFieldVisible('sys_script_client', 'field', {type: 'onChange'}), true);
assert.equal(isSnFieldVisible('sys_script_client', 'field', {type: 'onLoad'}), false);
assert.equal(normalizeSnConfig('sp_widget', {clientScript: 'legacy()'}).client_script, 'legacy()');
for (const [value,,table] of ADDITIONAL_TYPES) {
  assert.equal(getDevTypeConfig(value).snTable, table);
  assert.ok(SN_SCHEMAS[table]?.length, table);
}
assert.equal(new Set(DEVELOPMENT_TYPE_OPTIONS.map(t => t.value)).size, DEVELOPMENT_TYPE_OPTIONS.length);
assert.ok(SN_SCHEMAS.sys_script.find(f => f.name === 'when').choices.some(c => c.value === 'before'));
console.log('Form config regression checks passed (legacy aliases, conditions, booleans, visibility, 16 new types).');
