// Content policy for the hash-bound Claude CLI 2.1.304 adapter. Native code
// supplies server facts, billing values and all CC wording this module
// recognizes (the vocabulary: ccgatewayEnvironmentVocabulary in
// native-environment-2.1.304.inc.js plus the native billing header); this
// module only edits recognized spans. Policies come validated
// (request-policy.js validateRequestPolicy, validateDirectPolicy).
import { toBlocks, systemTexts, splice, environmentFields as fields, billingFields } from './shared.js';
import { defaultEntrypoint } from './request-policy.js';

const escapeRE = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const words = (text, count) => text.split(' ').slice(0, count).join(' ');

// compile turns the native vocabulary into the recognizers below.
function compile(v) {
  const invalid = () => { throw Error('Invalid native CC vocabulary'); };
  const text = value => typeof value === 'string' && value ? value : invalid();
  const pair = value => Array.isArray(value) && value.length === 2 ? value.map(text) : invalid();
  const labels = Object.fromEntries(['platform_name', 'os_version', 'shell', 'primary_directory', 'git_repository', 'additional_directories'].map(field => [field, text(v?.labels?.[field])]));
  const withdrawal = new Map(Object.entries(v.withdrawal ?? {}).map(([field, value]) => [text(value), field]));
  if (withdrawal.size !== 5 || ![...withdrawal.values()].every(field => fields.includes(field))) invalid();
  const was = pair(v.was), scratchpad = pair(v.scratchpad), reminder = pair(v.reminder), proxy = v.proxy ?? {};
  const readme = pair(proxy.readme), clis = pair(proxy.clis);
  if (!Array.isArray(v.github) || !v.github.length || !Array.isArray(v.additionalChanged) || v.additionalChanged.length !== 2) invalid();
  const github = new Set(v.github.map(text).flatMap(value => [value, value + text(v.githubReplaces)]));
  return {
    heading: text(v.heading), updateHeading: text(v.updateHeading), intro: text(v.intro),
    worktree: text(v.worktree), stash: text(v.stash), billingHeader: text(v.billingHeader), reminder,
    reminderPattern: new RegExp('^\\s*' + escapeRE(reminder[0]) + '([\\s\\S]*?)' + escapeRE(reminder[1])),
    boundary: new RegExp('^(?:#{1,6} |' + reminder.map(escapeRE).join('|') + ')'),
    labels, withdrawal, scratchpad, github, additionalChanged: v.additionalChanged.map(text),
    wasAtEnd: new RegExp(escapeRE(was[0]) + '.+' + escapeRE(was[1]) + '$'),
    git: new RegExp('^' + escapeRE(labels.git_repository) + '(true|false)$'),
    gitUpdate: new RegExp('^' + escapeRE(labels.git_repository) + '(true|false)(?:' + escapeRE(was[0]) + '(true|false)' + escapeRE(was[1]) + ')?$'),
    proxy: new RegExp('^' + escapeRE(text(proxy.start)) + '[^\\r\\n]+' + escapeRE(text(proxy.middle)) + '(?:' + escapeRE(readme[0]) + '[^\\r\\n]+' + escapeRE(readme[1]) + ')?' + escapeRE(text(proxy.end)) + '(?:' + escapeRE(clis[0]) + '[^\\r\\n]+' + escapeRE(clis[1]) + ')?$'),
    // Lines that start like a native line but are not one: the label, or the
    // first words of each native sentence.
    suspects: [
      ...Object.entries(labels).map(([field, label]) => [field === 'additional_directories' ? label.replace(/:$/, '') : label.trimEnd(), field]),
      [scratchpad[0].trimEnd(), 'scratchpad_directory'], [words(v.worktree, 5), 'worktree'], [words(v.stash, 5), 'worktree'],
      ...[...withdrawal].map(([value, field]) => [words(value, 5), field]),
      ...v.github.map(value => [words(value, 5), 'github_cli']), [words(proxy.start, 5), 'agent_proxy'],
    ],
  };
}

// createContentPolicy binds the policy to the native vocabulary.
export function createContentPolicy(vocabulary) {
  const c = compile(vocabulary);
  return { ...billingApi(c), applyContentPolicy: (input, policy, native, emitDiagnostic) => applyContentPolicy(c, input, policy, native, emitDiagnostic) };
}

// createBillingPolicy is the billing half alone, for direct: it needs only the
// native header, not the environment vocabulary.
export function createBillingPolicy(billingHeader) {
  if (typeof billingHeader !== 'string' || !billingHeader) throw Error('Invalid native CC vocabulary');
  return billingApi({ billingHeader });
}

// billingApi is the billing header methods, bound to the vocabulary.
function billingApi(c) {
  return {
    mergeBillingAttribution: (system, policy, nativeBilling, emitDiagnostic) => mergeBillingAttribution(c, system, policy, nativeBilling, emitDiagnostic),
    billingEntrypoint: system => billingEntrypoint(c, system),
    requestEntrypoint: (system, policy) => requestEntrypoint(c, system, policy),
    leadingBilling: system => leadingBilling(c, system),
    requestBilling: system => requestBilling(c, system),
    hasBilling: system => hasBilling(c, system),
    setLeadingBillingField: (system, field, value) => setLeadingBillingField(c, system, field, value),
  };
}
function error(message, status = 400) {
  return Object.assign(new Error(message), { status, code: status === 503 ? 'configuration_error' : 'invalid_request_error' });
}
function diagnostic(emit, field, status, carrier) { emit?.({ field, status, carrier }); }
function lines(text) {
  const result = []; let offset = 0;
  for (const match of text.matchAll(/[^\r\n]*(?:\r\n|\n|\r|$)/g)) {
    if (!match[0]) continue;
    const raw = match[0], body = raw.replace(/[\r\n]+$/, '');
    result.push({ start: offset, end: offset + raw.length, body, raw }); offset += raw.length;
  }
  return result;
}
function fenceAfter(line, current) {
  const match = /^\s*(`{3,}|~{3,})(.*)$/.exec(line);
  if (!match) return current;
  if (!current) return { marker: match[1][0], length: match[1].length };
  return match[1][0] === current.marker && match[1].length >= current.length && !match[2].trim() ? null : current;
}
// fencedLines is the text's lines once, each saying whether a code fence is
// open at it: a fence's own marker lines are `marker`, and every line between
// two markers is `fenced`. The readers below consume this one sequence
// instead of tracking fences again.
function* fencedLines(text) {
  let fence = null;
  for (const line of lines(text)) {
    const next = fenceAfter(line.body, fence);
    if (next !== fence) { fence = next; yield { ...line, marker: true, fenced: true }; continue; }
    yield { ...line, marker: false, fenced: fence !== null };
  }
}
function identify(c, body, update) {
  if (!body.startsWith(' - ')) return null;
  const text = body.slice(3);
  if (update && c.withdrawal.has(text)) return { field: c.withdrawal.get(text), delta: true };
  for (const field of ['platform_name', 'os_version', 'shell', 'primary_directory']) {
    const prefix = c.labels[field];
    if (text.startsWith(prefix) && text.length > prefix.length && (!update || field === 'primary_directory')) return { field, delta: update && c.wasAtEnd.test(text) };
  }
  if ((update ? c.gitUpdate : c.git).test(text)) return { field: 'git_repository', delta: update && c.wasAtEnd.test(text) };
  if (text === c.labels.additional_directories && !update || update && c.additionalChanged.includes(text)) return { field: 'additional_directories', list: true, delta: update };
  if (text === c.worktree) return { field: 'worktree', pair: true, delta: update };
  if (text.startsWith(c.scratchpad[0]) && text.endsWith(c.scratchpad[1]) && text.length > c.scratchpad[0].length + c.scratchpad[1].length) return { field: 'scratchpad_directory' };
  // Both renderers emit one complete bullet. Boundaries are the original native
  // line, never arbitrary text beyond it or a nested child of an unknown field.
  if (c.github.has(text)) return { field: 'github_cli' };
  if (c.proxy.test(text)) return { field: 'agent_proxy' };
  return null;
}
function suspectedField(c, body) {
  if (!body.startsWith(' - ')) return null;
  const text = body.slice(3);
  for (const [prefix, field] of c.suspects) if (text.startsWith(prefix)) return field;
  return null;
}
// environmentRegions finds the environment sections of a text: a heading (with
// its intro line, unless it is the update heading) outside a code fence, up to
// the next boundary, and the native entries inside. block(field, status) is
// told about every field that cannot be edited safely.
function environmentRegions(c, text, block) {
  const scanned = [...fencedLines(text)], regions = [];
  for (let i = 0; i < scanned.length; i++) {
    if (scanned[i].fenced) continue;
    const first = regionStart(c, scanned, i);
    if (first < 0) continue;
    const update = scanned[i].body === c.updateHeading, stop = regionEnd(c, scanned, first), blocked = new Set();
    const entries = regionEntries(c, scanned, text, first, stop, update, (field, status) => { blocked.add(field); block?.(field, status); });
    regions.push({ start: scanned[i].start, end: stop < scanned.length ? scanned[stop].start : text.length, headerEnd: first < scanned.length ? scanned[first].start : text.length, update, entries, blocked });
    i = stop - 1;
  }
  return regions;
}
// regionStart is the first entry line of a region whose heading is line i, or
// -1 when line i opens none.
function regionStart(c, scanned, i) {
  const body = scanned[i].body;
  if (body === c.updateHeading) return i + 1;
  if (body !== c.heading) return -1;
  const intro = scanned[i + 1]?.body;
  return intro === c.intro || intro === c.intro.trimEnd() ? i + 2 : -1;
}
// regionEnd is the line of the next boundary. A heading in an example is not
// a new environment carrier: splitting there would discard the fence state
// and re-enter quoted content.
function regionEnd(c, scanned, first) {
  let stop = first;
  while (stop < scanned.length && (scanned[stop].fenced || !c.boundary.test(scanned[stop].body))) stop++;
  return stop;
}
// regionEntries reads a region's native entries, and tells block about the
// fields that cannot be edited safely.
function regionEntries(c, scanned, text, first, stop, update, block) {
  const entries = [], seen = new Set();
  for (let j = first; j < stop; j++) {
    if (scanned[j].marker) continue;
    const found = scanned[j].fenced ? null : identify(c, scanned[j].body, update);
    if (!found) {
      const suspected = suspectedField(c, scanned[j].body);
      if (suspected) block(suspected, scanned[j].fenced ? 'ambiguous' : 'unsupported_format');
      continue;
    }
    const end = entryEnd(c, scanned, j, stop, found);
    if (end < 0) { block(found.field, 'unsupported_format'); continue; }
    const identity = update && found.field === 'additional_directories' ? scanned[j].body : found.field;
    if (seen.has(identity)) block(found.field, 'ambiguous');
    seen.add(identity);
    entries.push({ ...found, start: scanned[j].start, end: scanned[end].end, raw: text.slice(scanned[j].start, scanned[end].end) }); j = end;
  }
  return entries;
}
// entryEnd is the last line of the entry that opens at line j, or -1 when its
// continuation is not the native one.
function entryEnd(c, scanned, j, stop, found) {
  if (found.pair) return scanned[j + 1]?.body === ' - ' + c.stash ? j + 1 : -1;
  if (!found.list) return j;
  let end = j;
  while (end + 1 < stop && scanned[end + 1].body.startsWith('  - ')) end++;
  const malformed = end === j || scanned.slice(j + 1, end + 1).some(line => !line.body.slice(4).trim()) || end + 1 < stop && /^\s{2,}\S/.test(scanned[end + 1].body);
  return malformed ? -1 : end;
}
function recognizedUser(c, text) {
  // A user text must consist solely of flat reminder blocks. Prose, quotation,
  // code fences and tool-result content are deliberately not parsed.
  let rest = text, offset = 0; const ranges = [];
  while (rest.trim()) {
    const match = c.reminderPattern.exec(rest);
    if (!match || c.reminder.some(tag => match[1].includes(tag))) return [];
    const open = match[0].indexOf(c.reminder[0]);
    ranges.push({
      start: offset + open + c.reminder[0].length, text: match[1],
      wrapperStart: offset + open,
      wrapperEnd: offset + match[0].length,
    });
    offset += match[0].length; rest = rest.slice(match[0].length);
  }
  return ranges;
}
function textSlots(input) {
  const slots = [];
  const kind = (role, path) => path.startsWith('system') ? 'system' : role === 'system' ? 'message_system' : 'user';
  function addContent(content, path, role, replace, owner) {
    if (typeof content === 'string') { slots.push({ text: content, path, role, owner, carrier: kind(role, path), replace, remove: () => replace([]) }); return; }
    if (!Array.isArray(content)) throw error(`${path} must be text or content blocks`);
    content.forEach((block, index) => {
      if (!block || typeof block !== 'object') throw error(`${path}[${index}] must be a block`);
      if (block.type !== 'text') return;
      if (typeof block.text !== 'string') throw error(`${path}[${index}].text must be a string`);
      slots.push({ text: block.text, path: `${path}[${index}].text`, role, owner, carrier: kind(role, path), replace: text => { block.text = text; }, remove: () => { const at = content.indexOf(block); if (at >= 0) content.splice(at, 1); } });
    });
  }
  addContent(input.system ?? [], 'system', 'system', text => { input.system = text; });
  (input.messages ?? []).forEach((message, i) => {
    if (message.role === 'user' || message.role === 'system') addContent(message.content, `messages[${i}].content`, message.role, text => { message.content = text; }, message);
  });
  return slots;
}

// planRegion records one environment region of a slot and plans its entries
// whose source is not the client's. The baseline is the fields a full
// (non-delta) entry has already given, in request order.
function planRegion(state, slot, range, region) {
  const { sources, plans, regionsBySlot, blocked, baseline, emitDiagnostic } = state;
  if (!regionsBySlot.has(slot)) regionsBySlot.set(slot, []);
  regionsBySlot.get(slot).push({ ...region, start: region.start + range.start, end: region.end + range.start, headerEnd: region.headerEnd + range.start });
  for (const entry of region.entries) {
    const source = sources[entry.field] ?? 'client';
    if (source === 'client') continue;
    if (region.update && source === 'worker' && !baseline.has(entry.field) && entry.delta) {
      blocked.add(entry.field); diagnostic(emitDiagnostic, entry.field, 'missing_baseline', slot.carrier);
    }
    plans.push({ slot, region, entry, start: range.start + entry.start, end: range.start + entry.end, source, redundant: region.update && baseline.has(entry.field) });
    if (!region.update || !entry.delta) baseline.add(entry.field);
  }
}

// blockedField is the one rule for a field this conversion will not edit: the
// field stays as the client wrote it, and its reason is diagnostic only.
function blockedField(state, slot, field, status) {
  state.blocked.add(field);
  diagnostic(state.emitDiagnostic, field, status, slot.carrier);
}

async function applyContentPolicy(c, input, policy = {}, native = {}, emitDiagnostic) {
  const output = structuredClone(input);
  const state = { sources: policy.build_attachment_sources ?? {}, plans: [], regionsBySlot: new Map(), blocked: new Set(), baseline: new Set(), emitDiagnostic };
  for (const slot of textSlots(output)) {
    // The user ranges are parsed once and kept on the slot: compactSlot reads
    // the same ranges instead of parsing the same text again.
    slot.ranges = slot.role === 'user' ? recognizedUser(c, slot.text) : [{ text: slot.text, start: 0 }];
    for (const range of slot.ranges) for (const region of environmentRegions(c, range.text, (field, status) => blockedField(state, slot, field, status))) planRegion(state, slot, range, region);
  }
  const { sources, plans, regionsBySlot, blocked } = state;
  const active = plans.filter(plan => !blocked.has(plan.entry.field));
  const server = await readServerFields(c, active, native, emitDiagnostic);
  const possiblyEmpty = new Set();
  for (const [slot, edits] of planEdits(active, server, emitDiagnostic)) {
    const text = splice(slot.text, compactSlot(slot, edits, regionsBySlot.get(slot) ?? []));
    if (!text.trim() && slot.text.trim()) { slot.remove(); if (slot.owner) possiblyEmpty.add(slot.owner); }
    else slot.replace(text);
  }
  for (const message of possiblyEmpty) {
    if (!Array.isArray(message.content) || message.content.length) continue;
    if (message.role !== 'user' || Object.keys(message).some(key => key !== 'role' && key !== 'content')) throw error('Content conversion would remove message lifecycle metadata');
    output.messages.splice(output.messages.indexOf(message), 1);
  }
  for (const field of fields) if (sources[field] && sources[field] !== 'client' && !plans.some(p => p.entry.field === field) && !blocked.has(field)) diagnostic(emitDiagnostic, field, 'not_found', 'request');
  return output;
}

// readServerFields reads, from the native environment, the entries the
// planned edits take from the Worker, by field.
async function readServerFields(c, active, native, emitDiagnostic) {
  const needed = active.filter(plan => plan.source === 'worker' && !plan.redundant);
  if (!needed.length) return new Map();
  try {
    const snapshot = await native.readEnvironment?.([...new Set(needed.map(plan => plan.entry.field))]);
    const text = typeof snapshot === 'string' ? snapshot : snapshot?.text;
    if (typeof text !== 'string') throw Error('Missing native environment');
    const regions = environmentRegions(c, text);
    if (regions.length !== 1 || regions[0].update || regions[0].blocked.size || !regions[0].entries.some(e => e.field === 'platform_name')) throw Error('Invalid native environment');
    const server = new Map(regions[0].entries.map(entry => [entry.field, entry.raw]));
    if (active.some(plan => plan.source === 'worker' && snapshot?.unavailableFields?.includes(plan.entry.field))) throw Error('Unavailable native field');
    for (const [field, fragment] of Object.entries(snapshot?.fieldText ?? {})) {
      if (!fields.includes(field) || fragment !== null && typeof fragment !== 'string') throw Error('Invalid native field fragment');
      if (fragment !== null) server.set(field, ' - ' + fragment);
      else server.delete(field);
    }
    return server;
  } catch {
    for (const plan of active.filter(p => p.source === 'worker')) diagnostic(emitDiagnostic, plan.entry.field, 'source_unavailable', plan.slot.carrier);
    throw error('Required native environment is unavailable', 503);
  }
}

// planEdits turns each planned entry into its edit, by slot: the server's
// entry in the client's line endings, or nothing.
function planEdits(active, server, emitDiagnostic) {
  const editsBySlot = new Map();
  for (const plan of active) {
    const replacement = replacementFor(plan, server);
    const status = plan.source === 'erase' ? 'erased' : replacement === plan.entry.raw ? 'unchanged' : replacement ? 'replaced' : plan.redundant ? 'unchanged' : 'removed_server_absent';
    diagnostic(emitDiagnostic, plan.entry.field, status, plan.slot.carrier);
    if (!editsBySlot.has(plan.slot)) editsBySlot.set(plan.slot, []);
    editsBySlot.get(plan.slot).push({ start: plan.start, end: plan.end, value: replacement });
  }
  return editsBySlot;
}
function replacementFor(plan, server) {
  const replacement = plan.source === 'erase' || plan.redundant ? '' : server.get(plan.entry.field) ?? '';
  if (!replacement) return replacement;
  const newline = plan.entry.raw.includes('\r\n') ? '\r\n' : '\n';
  const ended = /[\r\n]$/.test(plan.entry.raw);
  return replacement.replace(/\r\n|\r|\n/g, newline).replace(/[\r\n]+$/, '') + (ended ? newline : '');
}

// compactSlot gives a slot's final edits. An environment section is dropped
// only when every owned line disappeared; unknown or fixed instructions keep
// the original heading and wrapper alive. Only this conversion can own the
// removal of a reminder wrapper: empty reminders that were already present
// are unrelated client content, not cleanup.
function compactSlot(slot, edits, regions) {
  const emptied = regions.filter(region => leavesBlank(slot.text.slice(region.headerEnd, region.end), within(edits, region.headerEnd, region.end), region.headerEnd))
    .map(region => ({ start: region.start, end: region.end, value: '' }));
  let result = [...edits.filter(e => !emptied.some(r => e.start >= r.start && e.end <= r.end)), ...emptied];
  if (slot.role !== 'user') return result;
  for (const range of slot.ranges ?? []) {
    const local = within(result, range.start, range.start + range.text.length);
    if (!range.text.trim() || !leavesBlank(range.text, local, range.start)) continue;
    result = [...result.filter(edit => !local.includes(edit)), { start: range.wrapperStart, end: range.wrapperEnd, value: '' }];
  }
  return result;
}
const within = (edits, start, end) => edits.filter(edit => edit.start >= start && edit.end <= end);
// leavesBlank says whether edits (at offset in the whole text) leave text blank.
const leavesBlank = (text, edits, offset) => edits.length > 0 && !splice(text, edits.map(edit => ({ ...edit, start: edit.start - offset, end: edit.end - offset }))).trim();

// billingCandidate finds the billing header lines of text: a line that starts
// with the header outside a code fence. A mention elsewhere (inside prose, an
// indented quote, a fence) is client content and not a header. A header line
// that cannot be edited safely is a conflict.
function billingCandidate(c, text) {
  const prefix = c.billingHeader;
  const candidates = [];
  for (const line of fencedLines(text)) {
    if (line.fenced || !line.body.startsWith(prefix)) continue;
    if (line.body.split(prefix).length !== 2) return { conflict: 'a billing header line repeats the header' };
    const payload = line.body.slice(prefix.length), keys = new Map();
    let cursor = prefix.length;
    for (const part of payload.split(';')) {
      if (!part.trim()) { cursor += part.length + 1; continue; }
      const match = /^(\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*=\s*)([^;\s]+)(\s*)$/.exec(part);
      if (!match) return { conflict: 'a billing header field is malformed' };
      if (keys.has(match[2])) return { conflict: `the billing header repeats ${match[2]}` };
      const start = line.start + cursor + match[1].length + match[2].length + match[3].length;
      keys.set(match[2], { start, end: start + match[4].length, value: match[4] }); cursor += part.length + 1;
    }
    candidates.push({ line, keys });
  }
  return { candidates };
}
// Build requests carry Claude Code's attribution header the way CC sends it
// (2026-10-21 decision): a request without one gets the native header line,
// whole, and a header missing a field gets the native value. client (the
// default) keeps every value the client wrote; worker replaces them with the
// native ones. Upstream refuses a header without both cc_version and
// cc_entrypoint (400 "reserved keyword", verified 2026-10-21). The request
// command sets the request's entrypoint natively before CC generates the line
// (setEntrypointOnRequests), so the native header's cc_entrypoint is already
// the value filled or written here.
function mergeBillingAttribution(c, system = [], policy = {}, nativeBilling, emitDiagnostic) {
  const replaced = new Set(billingFields.filter(field => policy.build_billing_sources?.[field] === 'worker'));
  const blocks = structuredClone(toBlocks(system));
  if (!Array.isArray(blocks)) throw error('system must be text or blocks');
  const { found, conflict } = findBillingHeader(c, blocks);
  // A header that cannot be edited safely is refused when a value must be the
  // Worker's; otherwise it stays the client's, unchanged.
  if (conflict) {
    billingFields.forEach(field => diagnostic(emitDiagnostic, field, 'ambiguous', 'system'));
    if (replaced.size) throw error(`Worker billing attribution cannot be applied: ${conflict}`);
    return structuredClone(system);
  }
  // Upstream reads only a header that opens the first block (2026-10-22): one
  // anywhere else counts as missing, so the native header goes in front and
  // the client's stays where it is, unchanged (two headers are accepted).
  const target = found[0]?.index === 0 && found[0].line.start === 0 ? found[0] : undefined;
  const needed = target ? billingFields.filter(field => replaced.has(field) || !target.keys.has(field)) : billingFields;
  if (!needed.length) return structuredClone(system);
  const generated = nativeHeader(c, nativeBilling);
  if (generated.conflict || generated.candidates?.length !== 1 || needed.some(field => !generated.candidates[0].keys.has(field))) {
    needed.forEach(field => diagnostic(emitDiagnostic, field, 'source_unavailable', 'system'));
    if (replaced.size) throw error('Required native billing attribution is unavailable', 503);
    return structuredClone(system);
  }
  if (!target) {
    blocks.unshift({ type: 'text', text: generated.text });
    billingFields.forEach(field => diagnostic(emitDiagnostic, field, 'inserted', 'system'));
    return blocks;
  }
  return applyBillingFields(blocks, target, generated.candidates[0].keys, needed, emitDiagnostic);
}

// findBillingHeader finds every billing header line of the system's text
// blocks, by block index; more than one is a conflict, as is one that cannot
// be edited safely.
function findBillingHeader(c, blocks) {
  const found = []; let conflict = '';
  blocks.forEach((block, index) => {
    if (block?.type !== 'text') return;
    if (typeof block.text !== 'string') throw error('system text must be a string');
    const result = billingCandidate(c, block.text);
    conflict ||= result.conflict ?? '';
    for (const candidate of result.candidates ?? []) found.push({ ...candidate, index });
  });
  if (!conflict && found.length > 1) conflict = 'the system prompt carries more than one billing header';
  return { found, conflict };
}

// nativeHeader is the CLI's own header line (kLo), read by its fields. Its
// cc_entrypoint is already the request's: the request command sets it natively
// (setEntrypointOnRequests) before CC generates the line, so nothing here is
// rewritten. text is what a request without a header carries.
function nativeHeader(c, nativeBilling) {
  const generated = typeof nativeBilling === 'string' ? billingCandidate(c, nativeBilling) : {};
  return { ...generated, text: nativeBilling };
}

// applyBillingFields writes the native values of the needed fields into the
// target header: replacing the client's value, or appending the missing ones at
// the end of its line.
function applyBillingFields(blocks, target, values, needed, emitDiagnostic) {
  const edits = [], missing = [];
  for (const field of needed) {
    const value = values.get(field).value, existing = target.keys.get(field);
    if (existing) { edits.push({ start: existing.start, end: existing.end, value }); diagnostic(emitDiagnostic, field, existing.value === value ? 'unchanged' : 'replaced', 'system'); }
    else { missing.push(`${field}=${value};`); diagnostic(emitDiagnostic, field, 'inserted', 'system'); }
  }
  if (missing.length) {
    const body = target.line.body, trimmed = body.trimEnd();
    edits.push({ start: target.line.start + trimmed.length, end: target.line.start + trimmed.length, value: (trimmed.endsWith(';') || trimmed.endsWith(':') ? ' ' : '; ') + missing.join(' ') });
  }
  blocks[target.index].text = splice(blocks[target.index].text, edits);
  return blocks;
}

// billingEntrypoint is the cc_entrypoint of the header that opens the first
// block, the one upstream reads; undefined without a usable one.
function billingEntrypoint(c, system) {
  return leadingBilling(c, system)?.cc_entrypoint;
}

// requestEntrypoint is the cc_entrypoint the request's header carries once
// build or direct has filled it: the client's own when its leading header has
// one and the Worker does not replace the field, else the configured one,
// else the request process's own (defaultEntrypoint). Claude
// Code names its User-Agent and its header from this one value (2.1.304 dN,
// kLo: setEntrypointOnRequests), and so does the request command.
function requestEntrypoint(c, system, policy = {}) {
  const own = billingEntrypoint(c, system);
  return (own !== undefined && policy.build_billing_sources?.cc_entrypoint !== 'worker' ? own : policy.build_billing_entrypoint) ?? defaultEntrypoint;
}

// hasBilling says whether the system carries a billing header line anywhere,
// even one that cannot be edited: such a request is Claude Code's own.
function hasBilling(c, system) {
  return systemTexts(system).some(text => {
    if (typeof text !== 'string') return false;
    const result = billingCandidate(c, text);
    return Boolean(result.conflict) || result.candidates.length > 0;
  });
}

// leadingHeader is the editable header line that opens text, if any.
function leadingHeader(c, text) {
  const result = billingCandidate(c, text);
  return result.conflict ? undefined : result.candidates.find(candidate => candidate.line.start === 0);
}
// fieldValues is a header's field values by name.
const fieldValues = keys => Object.fromEntries([...keys ?? []].map(([field, { value }]) => [field, value]));

// leadingBilling is the fields of the header that opens the first block, by
// name: Claude Code puts its header there (the request is CC's). null when the
// first block does not open with the header; an unreadable header has no fields.
function leadingBilling(c, system) {
  const first = typeof system === 'string' ? system : Array.isArray(system) && system[0]?.type === 'text' ? system[0].text : undefined;
  if (typeof first !== 'string' || !first.startsWith(c.billingHeader)) return null;
  return fieldValues(leadingHeader(c, first)?.keys);
}

// requestBilling is the fields of the request's own billing header wherever it
// is: the leading one, else the first one elsewhere in the system; null when
// the system has none (hasBilling decides the same way), and an unreadable
// header has no fields. It names the kind of request the client made.
function requestBilling(c, system) {
  const leading = leadingBilling(c, system);
  if (leading !== null) return leading;
  for (const text of systemTexts(system)) {
    if (typeof text !== 'string') continue;
    const result = billingCandidate(c, text);
    if (result.conflict) return {};
    if (result.candidates.length) return fieldValues(result.candidates[0].keys);
  }
  return null;
}

// setLeadingBillingField replaces one existing field value of that header and
// nothing else; a header without the field is left as it is.
function setLeadingBillingField(c, system, field, value) {
  if (!Array.isArray(system) || system[0]?.type !== 'text' || typeof system[0].text !== 'string') return system;
  const existing = leadingHeader(c, system[0].text)?.keys.get(field);
  if (!existing) return system;
  const blocks = structuredClone(system);
  blocks[0].text = splice(blocks[0].text, [{ start: existing.start, end: existing.end, value }]);
  return blocks;
}
