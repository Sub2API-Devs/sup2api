// Shared test-only comparisons. No production recognizer or builder is used.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sha = value => crypto.createHash('sha256').update(Buffer.isBuffer(value) || typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
function normalizeSystem(value) { return value === undefined ? [] : typeof value === 'string' ? [{ type: 'text', text: value }] : value; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b) || (() => { try { assert.deepEqual(a, b); return true; } catch { return false; } })(); }
function summary(value) { const text = JSON.stringify(value); return text === undefined ? '<absent>' : text.length > 400 ? text.slice(0, 400) + '…' : value; }
function differences(before, after, prefix = '') {
  if (same(before, after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) return Array.from({ length: Math.max(before.length, after.length) }, (_, i) => differences(before[i], after[i], `${prefix}[${i}]`)).flat();
  if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
    return [...new Set([...Object.keys(before), ...Object.keys(after)])].flatMap(key => differences(before[key], after[key], prefix ? prefix + '.' + key : key));
  }
  return [{ path: prefix, before: summary(before), after: summary(after) }];
}
// Stable executable definition; provenance/AST annotations do not alter inputs.
const definitionHash = test => sha(Object.fromEntries([
  'id', 'group', 'body', 'raw_body', 'contract', 'runtime_environment', 'mode',
  'transport', 'policy', 'headers', 'response_fixture', 'unknown_reason',
].map(key => [key, test[key] ?? null])));
// Independent oracle: structured comparison locates the changed field, and
// token replacement proves every other byte stayed intact (including numbers).
function onlyUserIDChanged(before, after) {
  try {
    const input = JSON.parse(before), output = JSON.parse(after);
    const source = input.metadata?.user_id, target = output.metadata?.user_id;
    if (typeof source !== 'string' || typeof target !== 'string' || source === target) return false;
    const expected = structuredClone(input);
    expected.metadata.user_id = target;
    if (!same(expected, output)) return false;
    for (const match of before.matchAll(/"(?:[^"\\]|\\.)*"/g)) {
      if (JSON.parse(match[0]) === source &&
          before.slice(0, match.index) + JSON.stringify(target) + before.slice(match.index + match[0].length) === after) return true;
    }
  } catch {}
  return false;
}
module.exports = { sha, normalizeSystem, same, summary, differences, definitionHash, onlyUserIDChanged };
