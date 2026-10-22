// Content policy for the hash-bound Claude CLI 2.1.304 adapter. Native code
// supplies server facts, billing values and all CC wording this module
// recognizes (the vocabulary: ccgatewayEnvironmentVocabulary in
// native-environment-2.1.304.inc.js plus the native billing header); this
// module only edits recognized spans.
const fields = ['platform_name', 'os_version', 'shell', 'primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy'];
const billingFields = ['cc_version', 'cc_entrypoint'];
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
  return {
    applyContentPolicy: (input, policy, native, emitDiagnostic) => applyContentPolicy(c, input, policy, native, emitDiagnostic),
    mergeBillingAttribution: (system, policy, nativeBilling, emitDiagnostic) => mergeBillingAttribution(c, system, policy, nativeBilling, emitDiagnostic),
    billingEntrypoint: system => billingEntrypoint(c, system),
  };
}

// createBillingPolicy is the billing half alone, for direct: it needs only the
// native header, not the environment vocabulary.
export function createBillingPolicy(billingHeader) {
  if (typeof billingHeader !== 'string' || !billingHeader) throw Error('Invalid native CC vocabulary');
  const c = { billingHeader };
  return {
    mergeBillingAttribution: (system, policy, nativeBilling, emitDiagnostic) => mergeBillingAttribution(c, system, policy, nativeBilling, emitDiagnostic),
    billingEntrypoint: system => billingEntrypoint(c, system),
  };
}
function error(message, status = 400) {
  return Object.assign(new Error(message), { status, code: status === 503 ? 'configuration_error' : 'invalid_request_error' });
}
function diagnostic(emit, field, status, carrier) { emit?.({ field, status, carrier, rule_version: 'cli-2.1.304-v1' }); }
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
function environmentRegions(c, text, carrier) {
  const ls = lines(text), result = []; let fence = null;
  for (let i = 0; i < ls.length; i++) {
    const line = ls[i];
    const nextFence = fenceAfter(line.body, fence);
    if (nextFence !== fence) { fence = nextFence; continue; }
    if (fence || line.body !== c.heading && line.body !== c.updateHeading) continue;
    const update = line.body === c.updateHeading;
    if (!update && ls[i + 1]?.body !== c.intro && ls[i + 1]?.body !== c.intro.trimEnd()) continue;
    const first = i + (update ? 1 : 2); let stop = first, boundaryFence = null;
    // A heading in an example is not a new environment carrier. Otherwise
    // splitting here would discard fence state and re-enter quoted content.
    while (stop < ls.length) {
      const next = fenceAfter(ls[stop].body, boundaryFence);
      if (next !== boundaryFence) { boundaryFence = next; stop++; continue; }
      if (!boundaryFence && c.boundary.test(ls[stop].body)) break;
      stop++;
    }
    const entries = [], seen = new Set(), blocked = new Map(); let innerFence = null;
    for (let j = first; j < stop; j++) {
      const next = fenceAfter(ls[j].body, innerFence);
      if (next !== innerFence) { innerFence = next; continue; }
      if (innerFence) {
        const suspected = suspectedField(c, ls[j].body);
        if (suspected) blocked.set(suspected, 'ambiguous');
        continue;
      }
      const found = identify(c, ls[j].body, update);
      if (!found) {
        const suspected = suspectedField(c, ls[j].body);
        if (suspected) blocked.set(suspected, 'unsupported_format');
        continue;
      }
      let end = j;
      if (found.pair) {
        if (ls[j + 1]?.body !== ' - ' + c.stash) { blocked.set(found.field, 'unsupported_format'); continue; }
        end++;
      }
      if (found.list) {
        while (end + 1 < stop && ls[end + 1].body.startsWith('  - ')) end++;
        if (end === j || ls.slice(j + 1, end + 1).some(line => !line.body.slice(4).trim()) || end + 1 < stop && /^\s{2,}\S/.test(ls[end + 1].body)) {
          blocked.set(found.field, 'unsupported_format'); continue;
        }
      }
      const identity = update && found.field === 'additional_directories' ? ls[j].body : found.field;
      if (seen.has(identity)) blocked.set(found.field, 'ambiguous');
      seen.add(identity);
      entries.push({ ...found, start: ls[j].start, end: ls[end].end, raw: text.slice(ls[j].start, ls[end].end) }); j = end;
    }
    result.push({ start: line.start, end: stop < ls.length ? ls[stop].start : text.length, headerEnd: first < ls.length ? ls[first].start : text.length, update, entries, blocked, carrier });
    i = stop - 1;
  }
  return result;
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
function splice(text, edits) {
  for (const edit of edits.sort((a, b) => b.start - a.start)) text = text.slice(0, edit.start) + edit.value + text.slice(edit.end);
  return text;
}
function validatePolicy(policy) {
  for (const [section, allowed, values] of [['build_attachment_sources', fields, ['client', 'worker', 'erase']], ['build_billing_sources', billingFields, ['client', 'worker']]]) {
    if (policy[section] === undefined) continue;
    if (!policy[section] || typeof policy[section] !== 'object' || Array.isArray(policy[section])) throw error(`Invalid ${section}`);
    for (const [key, source] of Object.entries(policy[section])) if (!allowed.includes(key) || !values.includes(source)) throw error(`Invalid ${section}.${key}`);
  }
  // Written into the header as a field value: one token, no separators.
  if (policy.build_billing_entrypoint !== undefined && !/^[a-z][a-z0-9_-]{0,63}$/.test(policy.build_billing_entrypoint)) throw error('Invalid build_billing_entrypoint');
}

async function applyContentPolicy(c, input, policy = {}, native = {}, emitDiagnostic) {
  validatePolicy(policy);
  const output = structuredClone(input);
  if (policy.relay_mode === 'direct') return output;
  const sources = policy.build_attachment_sources ?? {}, slots = textSlots(output), plans = [], regionsBySlot = new Map(), blocked = new Set(), baseline = new Set();
  for (const slot of slots) {
    const ranges = slot.role === 'user' ? recognizedUser(c, slot.text) : [{ text: slot.text, start: 0 }];
    for (const range of ranges) for (const region of environmentRegions(c, range.text, slot.path)) {
      if (!regionsBySlot.has(slot)) regionsBySlot.set(slot, []);
      regionsBySlot.get(slot).push({ ...region, start: region.start + range.start, end: region.end + range.start, headerEnd: region.headerEnd + range.start });
      for (const [field, status] of region.blocked) {
        blocked.add(field); diagnostic(emitDiagnostic, field, status, slot.carrier);
      }
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
  }
  const active = plans.filter(plan => !blocked.has(plan.entry.field));
  let server = new Map();
  if (active.some(plan => plan.source === 'worker' && !plan.redundant)) {
    try {
      const neededFields = [...new Set(active.filter(plan => plan.source === 'worker' && !plan.redundant).map(plan => plan.entry.field))];
      const snapshot = await native.readEnvironment?.(neededFields);
      const text = typeof snapshot === 'string' ? snapshot : snapshot?.text;
      if (typeof text !== 'string') throw Error('Missing native environment');
      const regions = environmentRegions(c, text, 'native');
      if (regions.length !== 1 || regions[0].update || regions[0].blocked.size || !regions[0].entries.some(e => e.field === 'platform_name')) throw Error('Invalid native environment');
      server = new Map(regions[0].entries.map(entry => [entry.field, entry.raw]));
      if (active.some(plan => plan.source === 'worker' && snapshot?.unavailableFields?.includes(plan.entry.field))) throw Error('Unavailable native field');
      for (const [field, fragment] of Object.entries(snapshot?.fieldText ?? {})) {
        if (!fields.includes(field) || fragment !== null && typeof fragment !== 'string') throw Error('Invalid native field fragment');
        if (fragment !== null) server.set(field, ' - ' + fragment);
        else server.delete(field);
      }
    } catch {
      for (const plan of active.filter(p => p.source === 'worker')) diagnostic(emitDiagnostic, plan.entry.field, 'source_unavailable', plan.slot.carrier);
      throw error('Required native environment is unavailable', 503);
    }
  }
  const editsBySlot = new Map();
  for (const plan of active) {
    let replacement = plan.source === 'erase' || plan.redundant ? '' : server.get(plan.entry.field) ?? '';
    const newline = plan.entry.raw.includes('\r\n') ? '\r\n' : '\n';
    if (replacement) {
      replacement = replacement.replace(/\r\n|\r|\n/g, newline);
      const ended = /[\r\n]$/.test(plan.entry.raw);
      replacement = replacement.replace(/[\r\n]+$/, '') + (ended ? newline : '');
    }
    const status = plan.source === 'erase' ? 'erased' : replacement === plan.entry.raw ? 'unchanged' : replacement ? 'replaced' : plan.redundant ? 'unchanged' : 'removed_server_absent';
    diagnostic(emitDiagnostic, plan.entry.field, status, plan.slot.carrier);
    if (!editsBySlot.has(plan.slot)) editsBySlot.set(plan.slot, []);
    editsBySlot.get(plan.slot).push({ start: plan.start, end: plan.end, value: replacement });
  }
  const possiblyEmpty = new Set();
  for (const [slot, edits] of editsBySlot) {
    // Drop an empty environment section only when every owned line disappeared.
    // Unknown/fixed instructions keep the original heading and wrapper alive.
    const compact = [];
    for (const region of regionsBySlot.get(slot) ?? []) {
      const local = edits.filter(e => e.start >= region.headerEnd && e.end <= region.end);
      if (local.length && !splice(slot.text.slice(region.headerEnd, region.end), local.map(e => ({ ...e, start: e.start - region.headerEnd, end: e.end - region.headerEnd }))).trim()) {
        compact.push({ start: region.start, end: region.end, value: '' });
      }
    }
    const remaining = edits.filter(e => !compact.some(r => e.start >= r.start && e.end <= r.end));
    let finalEdits = [...remaining, ...compact];
    if (slot.role === 'user') {
      // Only this conversion can own removal of a wrapper. Empty reminders
      // that were already present are unrelated client content, not cleanup.
      for (const range of recognizedUser(c, slot.text)) {
        const local = finalEdits.filter(edit => edit.start >= range.start && edit.end <= range.start + range.text.length);
        if (!local.length || !range.text.trim()) continue;
        if (!splice(range.text, local.map(edit => ({ ...edit, start: edit.start - range.start, end: edit.end - range.start }))).trim()) {
          finalEdits = finalEdits.filter(edit => !local.includes(edit));
          finalEdits.push({ start: range.wrapperStart, end: range.wrapperEnd, value: '' });
        }
      }
    }
    const text = splice(slot.text, finalEdits);
    if (!text.trim() && slot.text.trim()) { slot.remove(); if (slot.owner) possiblyEmpty.add(slot.owner); }
    else slot.replace(text);
  }
  for (const message of possiblyEmpty) {
    if (Array.isArray(message.content) && message.content.length === 0) {
      if (message.role !== 'user' || Object.keys(message).some(key => key !== 'role' && key !== 'content')) throw error('Content conversion would remove message lifecycle metadata');
      output.messages.splice(output.messages.indexOf(message), 1);
    }
  }
  for (const field of fields) if (sources[field] && sources[field] !== 'client' && !plans.some(p => p.entry.field === field) && !blocked.has(field)) diagnostic(emitDiagnostic, field, 'not_found', 'request');
  if (native.billing !== undefined) output.system = mergeBillingAttribution(c, output.system, policy, native.billing, emitDiagnostic);
  return output;
}

// billingCandidate finds the billing header lines of text: a line that starts
// with the header outside a code fence. A mention elsewhere (inside prose, an
// indented quote, a fence) is client content and not a header. A header line
// that cannot be edited safely is a conflict.
function billingCandidate(c, text) {
  const prefix = c.billingHeader;
  const candidates = []; let fenced = null;
  for (const line of lines(text)) {
    fenced = fenceAfter(line.body, fenced);
    if (fenced || !line.body.startsWith(prefix)) continue;
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
// cc_entrypoint (400 "reserved keyword", verified 2026-10-21). The native
// entrypoint is the request process's (sdk-cli); build_billing_entrypoint
// replaces it in the native line, so it is the value filled or written.
function mergeBillingAttribution(c, system = [], policy = {}, nativeBilling, emitDiagnostic) {
  validatePolicy(policy);
  if (policy.relay_mode === 'direct') return structuredClone(system);
  const replaced = new Set(billingFields.filter(field => policy.build_billing_sources?.[field] === 'worker'));
  const blocks = typeof system === 'string' ? [{ type: 'text', text: system }] : structuredClone(system);
  if (!Array.isArray(blocks)) throw error('system must be text or blocks');
  const found = []; let conflict = '';
  blocks.forEach((block, index) => {
    if (block?.type !== 'text') return;
    if (typeof block.text !== 'string') throw error('system text must be a string');
    const result = billingCandidate(c, block.text);
    conflict ||= result.conflict ?? '';
    for (const candidate of result.candidates ?? []) found.push({ ...candidate, index });
  });
  if (!conflict && found.length > 1) conflict = 'the system prompt carries more than one billing header';
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
  let generated = typeof nativeBilling === 'string' ? billingCandidate(c, nativeBilling) : {};
  const nativeEntrypoint = generated.candidates?.length === 1 ? generated.candidates[0].keys.get('cc_entrypoint') : undefined;
  if (policy.build_billing_entrypoint !== undefined && nativeEntrypoint) {
    nativeBilling = splice(nativeBilling, [{ start: nativeEntrypoint.start, end: nativeEntrypoint.end, value: policy.build_billing_entrypoint }]);
    generated = billingCandidate(c, nativeBilling);
  }
  if (generated.conflict || generated.candidates?.length !== 1 || needed.some(field => !generated.candidates[0].keys.has(field))) {
    needed.forEach(field => diagnostic(emitDiagnostic, field, 'source_unavailable', 'system'));
    if (replaced.size) throw error('Required native billing attribution is unavailable', 503);
    return structuredClone(system);
  }
  if (!target) {
    blocks.unshift({ type: 'text', text: nativeBilling });
    billingFields.forEach(field => diagnostic(emitDiagnostic, field, 'inserted', 'system'));
    return blocks;
  }
  const values = generated.candidates[0].keys, edits = [], missing = [];
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
  const first = typeof system === 'string' ? system : Array.isArray(system) && system[0]?.type === 'text' ? system[0].text : undefined;
  if (typeof first !== 'string') return undefined;
  const result = billingCandidate(c, first);
  return result.conflict ? undefined : result.candidates.find(candidate => candidate.line.start === 0)?.keys.get('cc_entrypoint')?.value;
}
