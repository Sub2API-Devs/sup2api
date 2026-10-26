// Shared test-only comparisons. No production recognizer or builder is used.
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs'), path = require('node:path');
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

// ---- Version under test -------------------------------------------------
// CC_VERSION names the Claude Code version a probe runs against; it selects
// fixtures/<name>-<version>.json. The default is 2.1.304, the version these
// probes were written for, so a run without it selects what it always did.
function ccVersion() {
  const version = process.env.CC_VERSION || '2.1.304';
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw Error(`Invalid CC_VERSION: ${version}`);
  return version;
}
const fixturePath = (name, version = ccVersion()) => path.join(__dirname, 'fixtures', `${name}-${version}.json`);
// readFixture refuses a missing fixture instead of substituting another
// version's: a capture or rendered template of one version is not evidence
// for another.
function readFixture(name, version = ccVersion(), how = '') {
  const file = fixturePath(name, version);
  if (!fs.existsSync(file)) throw Error(`fixtures/${path.basename(file)} is missing for Claude Code ${version}${how ? ' (' + how + ')' : ''}`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ---- Artifact identity --------------------------------------------------
// The expected SHA-256 of every artifact comes from the caller (environment),
// never from this source. Unset: nothing is checked, the actual SHA is
// reported and the run is marked sha_unpinned. A mismatch throws.
function pin(label, file, variables, fallback) {
  const actual = sha(fs.readFileSync(file));
  const variable = variables.find(name => process.env[name]);
  const expected = variable ? process.env[variable] : fallback || undefined;
  const source = variable ? 'env:' + variable : expected ? 'manifest' : null;
  if (expected !== undefined && expected !== actual) throw Error(`${label} SHA-256 ${actual} is not the expected ${expected} (${source}): ${file}`);
  return { path: file, sha256: actual, expected_sha256: expected ?? null, pinned_by: source, sha_unpinned: expected === undefined };
}
const anyUnpinned = pins => Object.values(pins).some(item => item?.sha_unpinned);

// ---- Billing attribution oracle ----------------------------------------
// Independent restatement of the current rules, for expectations only.
const reminderOpen = '<system-reminder>';
const billingPrefix = 'x-anthropic-billing-header:';
// firstPromptText is the text the attribution fingerprint reads in build and
// direct since 2026-10-21 (cli-mods request-input.js firstPromptText/
// fingerprintMessages; BUILD-REQUEST-COMPONENTS-DESIGN §6.2): in the first
// user message that has one, the first text block that does not open (after
// leading whitespace) with the reminder tag; a string content is one text
// block; '' without one. Native CC fingerprints the prompt before reminders
// are merged in front of it, so the first block of the wire message is not
// what it hashed.
function firstPromptText(messages) {
  for (const message of Array.isArray(messages) ? messages : []) {
    if (message?.role !== 'user') continue;
    const blocks = typeof message.content === 'string' ? [{ type: 'text', text: message.content }] : Array.isArray(message.content) ? message.content : [];
    const prompt = blocks.find(block => block?.type === 'text' && typeof block.text === 'string' && !block.text.trimStart().startsWith(reminderOpen));
    if (prompt) return prompt.text;
  }
  return '';
}
// Native fingerprint facts per version, as the recovered source has them
// (test/native/<version>/billing-fingerprint-oracle.cjs executes and checks
// them: 2.1.304 iW/aW/Eg, 2.1.310 jL/GL/Tf; the salt and indexes did not
// change, only the version literal). A version without reconciled facts is
// refused rather than guessed.
const fingerprintFacts = {
  '2.1.304': { salt: '59cf53e54c78', indexes: [4, 7, 20] },
  '2.1.310': { salt: '59cf53e54c78', indexes: [4, 7, 20] },
};
function nativeCCVersion(messages, version = ccVersion()) {
  const facts = fingerprintFacts[version];
  if (!facts) throw Error(`No reconciled fingerprint facts for Claude Code ${version}: add them from test/native/${version}/billing-fingerprint-oracle.cjs`);
  const text = firstPromptText(messages);
  return version + '.' + sha(facts.salt + facts.indexes.map(index => text[index] ?? '0').join('') + version).slice(0, 3);
}
// Keys a native header line carries besides cc_version and cc_entrypoint
// (BUILD-REQUEST-COMPONENTS-DESIGN §5.5: cch; the main thread's cc_prompt_id,
// cc_turn_origin, cc_prompt_index, cc_turn_index). Their values are made per
// request (prompt IDs) or by the transport (cch), so they are reported, not
// predicted; no other key is accepted.
const nativeBillingExtras = ['cch', 'cc_prompt_id', 'cc_turn_origin', 'cc_prompt_index', 'cc_turn_index'];
function billingFields(line) {
  if (typeof line !== 'string' || !line.startsWith(billingPrefix)) return null;
  const parts = line.slice(billingPrefix.length).split(';');
  if (parts.pop() !== '') return null;
  const fields = [];
  for (const part of parts) {
    const match = /^ ([a-z_]+)=([^;\s]+)$/.exec(part);
    if (!match || fields.some(([key]) => key === match[1])) return null;
    fields.push([match[1], match[2]]);
  }
  return fields;
}
const billingLines = system => normalizeSystem(system).flatMap(block => typeof block?.text === 'string' ? block.text.split('\n') : [])
  .filter(line => line.startsWith(billingPrefix));
// nativeHeaderBlock checks that block is the CLI's own header line as it is
// inserted in front of a system without a leading header (content-policy.js
// mergeBillingAttribution; direct-billing.js): one text block with only
// type and text, one line, cc_version then cc_entrypoint with the expected
// values, then only native extras, in canonical "k=v;" spacing. expected is
// the block the oracle requires: the actual one when it passes, otherwise
// the two-field line, so a failure also shows in the content diff.
function nativeHeaderBlock(block, { cc_version, cc_entrypoint }) {
  const minimal = { type: 'text', text: `${billingPrefix} cc_version=${cc_version}; cc_entrypoint=${cc_entrypoint};` };
  const problems = [];
  const fields = block?.type === 'text' && typeof block.text === 'string' && !block.text.includes('\n') ? billingFields(block.text) : null;
  if (!block || !same(Object.keys(block).sort(), ['text', 'type'])) problems.push('not a bare text block');
  if (!fields) problems.push('not one well-formed header line');
  else {
    if (fields[0]?.[0] !== 'cc_version' || fields[0][1] !== cc_version) problems.push(`cc_version ${fields[0]?.[1]} is not ${cc_version}`);
    if (fields[1]?.[0] !== 'cc_entrypoint' || fields[1][1] !== cc_entrypoint) problems.push(`cc_entrypoint ${fields[1]?.[1]} is not ${cc_entrypoint}`);
    const unknown = fields.slice(2).map(([key]) => key).filter(key => !nativeBillingExtras.includes(key));
    if (unknown.length) problems.push('keys a native header does not carry: ' + unknown.join(','));
    if (block.text !== billingPrefix + ' ' + fields.map(([key, value]) => `${key}=${value};`).join(' ')) problems.push('not in native spacing');
  }
  return { ok: problems.length === 0, problems, fields: fields ? Object.fromEntries(fields) : null, expected: problems.length ? minimal : structuredClone(block) };
}

// ---- Native generation defaults ------------------------------------------
// What the native builder adds when the client leaves a control out, as the
// assembly runs observed for claude-sonnet-4-6 (thinking disabled with
// temperature 1, effort high; artifacts/claude-2.1.304/assembly-repair-report.json):
// request-build.js gives the builder a mechanical disabled thinking when the
// client sent none or one it cannot carry (thinkingConfigFor).
function nativeDefaultPermitted(key, before, wire) {
  if (key === 'thinking' && before.thinking === undefined) return same(wire.thinking, { type: 'disabled' });
  if (key === 'temperature' && before.temperature === undefined) return wire.temperature === 1 && wire.thinking?.type === 'disabled';
  if (key === 'output_config' && before.output_config === undefined) return same(wire.output_config, { effort: 'high' });
  return false;
}

// ---- Raw JSON -------------------------------------------------------------
// withoutTopLevelMember is raw with the top-level member name (key, value and
// one separating comma) cut out, every other byte kept; null when raw is not
// one JSON object. Direct only re-encodes the system member (direct-billing.js:
// "body else byte for byte"), so the rest of two bodies must be equal.
function withoutTopLevelMember(raw, name) {
  let i = 0, depth = 0;
  const ws = () => { while (/\s/.test(raw[i] ?? '')) i++; };
  const string = () => { const start = i++; while (i < raw.length && raw[i] !== '"') i += raw[i] === '\\' ? 2 : 1; i++; return raw.slice(start, i); };
  const value = () => {
    ws();
    if (raw[i] === '"') { string(); return; }
    if (raw[i] !== '{' && raw[i] !== '[') { while (i < raw.length && !/[,\]}\s]/.test(raw[i])) i++; return; }
    depth = 0;
    do {
      if (raw[i] === '"') { string(); continue; }
      if (raw[i] === '{' || raw[i] === '[') depth++;
      else if (raw[i] === '}' || raw[i] === ']') depth--;
      i++;
    } while (depth > 0 && i < raw.length);
  };
  try {
    ws(); if (raw[i] !== '{') return null; i++;
    const members = [];
    for (;;) {
      ws(); if (raw[i] === '}') break;
      const keyStart = i, key = JSON.parse(string()); ws();
      if (raw[i] !== ':') return null; i++;
      value(); const end = i; ws();
      members.push({ key, start: keyStart, end });
      if (raw[i] === ',') { i++; continue; }
      if (raw[i] === '}') break;
      return null;
    }
    const at = members.findIndex(member => member.key === name);
    if (at < 0) return raw;
    const member = members[at];
    // Cut through the following member's start, else back to the previous
    // member's end, so exactly one comma goes with it.
    if (at + 1 < members.length) return raw.slice(0, member.start) + raw.slice(members[at + 1].start);
    if (at > 0) return raw.slice(0, members[at - 1].end) + raw.slice(member.end);
    return raw.slice(0, member.start) + raw.slice(member.end);
  } catch { return null; }
}

module.exports = {
  sha, normalizeSystem, same, summary, differences, definitionHash, onlyUserIDChanged,
  ccVersion, fixturePath, readFixture, pin, anyUnpinned,
  reminderOpen, billingPrefix, firstPromptText, fingerprintFacts, nativeCCVersion, nativeBillingExtras, billingFields, billingLines, nativeHeaderBlock,
  nativeDefaultPermitted, withoutTopLevelMember,
};
