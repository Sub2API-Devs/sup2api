// Content policy for the hash-bound Claude CLI 2.1.304 adapter. Native code
// supplies server facts and billing values; this module only edits recognized spans.
const fields = ['platform_name', 'os_version', 'shell', 'primary_directory', 'additional_directories', 'git_repository', 'worktree', 'scratchpad_directory', 'github_cli', 'agent_proxy'];
const billingFields = ['cc_version', 'cc_entrypoint'];
const intro = 'You have been invoked in the following environment: ';
const worktree = 'This is a git worktree — an isolated copy of the repository. Run all commands from this directory. Do NOT `cd` to the original repository root.';
const stash = 'The git stash stack is shared with the main checkout and all other worktrees, and other Claude sessions may push or pop it concurrently. Never use bare `git stash` / `git stash pop` — you could pop another session\'s changes. Prefer a temporary WIP commit to set work aside; if you must stash, use `git stash push -u -m "<unique-tag>"`, immediately capture your entry\'s SHA via `git stash list --format=\'%H %gs\'`, restore with `git stash apply <sha>` (not pop), and afterwards drop the entry, re-finding its current `stash@{n}` by tag first.';
const scratchSuffix = ' — always use it for temporary files (intermediate results, scripts, outputs that don\'t belong in the project) instead of `/tmp` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use `/tmp` if the user explicitly asks. Whenever you name a file in it to the user, write the file\'s complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.';
const withdrawal = new Map([
  ['The primary working directory announced earlier no longer applies.', 'primary_directory'],
  ['The primary working directory is no longer a git worktree.', 'worktree'],
  ['The scratchpad directory announced earlier is no longer available; use it no further.', 'scratchpad_directory'],
  ['The built-in `gh api` announced earlier is not active in this run; check `command -v gh`.', 'github_cli'],
  ['The agent proxy announced earlier is not active now.', 'agent_proxy'],
]);
const escapeRE = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const githubStart = "`gh` here is Claude Code's built-in GitHub client, not the GitHub CLI (none was found on this machine when the session started). `gh api <REST endpoint>` works against github.com";
const githubEnterprise = ' and, with `--hostname <host>`, the GitHub Enterprise Server hosts this session\'s GitHub proxy serves';
const githubProxy = [
  ', or against the GitHub Enterprise host of this checkout\'s remote (or `--hostname <host>`), through this session\'s GitHub proxy, which supplies the credential for the hosts and repositories this session is connected to',
  ', through that proxy, which supplies the credential for the repositories this session can reach',
  ' through this session\'s GitHub proxy, which supplies the credential for the repositories this session can reach',
];
const githubProxyEnd = ' (run `gh api --help` for its flags). This holds even if an earlier instruction in this prompt says you have no `gh` CLI or GitHub API access; where the prompt tells you to prefer GitHub MCP tools, keep preferring them. A 403 from the proxy says what this session lacks; retrying does not fix it.';
const githubAuth = ', already authenticated through this session\'s GitHub proxy (run `gh api --help` for its flags).';
const githubCommands = ' Other gh commands are not available: use `gh api` (the error from a common one, such as `gh pr view` or `gh run list`, names its `gh api` form).';
const githubJq = ' `--jq` is unavailable because jq is not installed: run without it and pipe the output to a JSON tool that is installed.';
const githubInstall = ' Do not install a GitHub CLI to get other gh commands: one installed during the session is not routed through this proxy and has no GitHub credentials unless the runner\'s operator provides them.';
const githubPattern = new RegExp('^' + escapeRE(githubStart) + '(?:' + escapeRE(githubEnterprise) + ')?(?:' + [githubAuth, ...githubProxy.map(text => text + githubProxyEnd)].map(escapeRE).join('|') + ')' + escapeRE(githubCommands) + '(?:' + escapeRE(githubJq) + ')?(?:' + escapeRE(githubInstall) + ')?(?:' + escapeRE(' This replaces what this session was told of `gh` earlier.') + ')?$');
const proxyStart = 'Outbound HTTPS goes through a pre-configured agent proxy (CA bundle: ';
const proxyMiddle = '). If a tool fails TLS verification, gets 403/405/407 from the proxy, or a transfer is cut off (connection reset, unexpected disconnect, RPC failed), ';
const proxyEnd = 'run curl -sS "$HTTPS_PROXY/__agentproxy/status" for per-tool fixes and proxy state; never disable TLS verification or unset HTTPS_PROXY.';
const proxyPattern = new RegExp('^' + escapeRE(proxyStart) + '[^\\r\\n]+' + escapeRE(proxyMiddle) + '(?:see [^\\r\\n]+ and )?' + escapeRE(proxyEnd) + '(?:' + escapeRE(' Installed CLIs preconfigured for the proxy: ') + '[^\\r\\n]+' + escapeRE(' — prefer a skill/MCP tool, then these, over raw curl.') + ')?$');
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
function identify(body, update) {
  if (!body.startsWith(' - ')) return null;
  const text = body.slice(3);
  if (update && withdrawal.has(text)) return { field: withdrawal.get(text), delta: true };
  for (const [prefix, field] of [['Platform: ', 'platform_name'], ['OS Version: ', 'os_version'], ['Shell: ', 'shell'], ['Primary working directory: ', 'primary_directory']]) {
    if (text.startsWith(prefix) && text.length > prefix.length && (!update || field === 'primary_directory')) return { field, delta: update && / \(was .+\)$/.test(text) };
  }
  if ((update ? /^Is a git repository: (true|false)(?: \(was (true|false)\))?$/ : /^Is a git repository: (true|false)$/).test(text)) return { field: 'git_repository', delta: update && text.includes(' (was ') };
  if (text === 'Additional working directories:' && !update || update && /^Additional working directories (added|removed):$/.test(text)) return { field: 'additional_directories', list: true, delta: update };
  if (text === worktree) return { field: 'worktree', pair: true, delta: update };
  if (text.startsWith('Scratchpad directory: ') && text.endsWith(scratchSuffix) && text.length > 22 + scratchSuffix.length) return { field: 'scratchpad_directory' };
  // Both renderers emit one complete bullet. Boundaries are the original native
  // line, never arbitrary text beyond it or a nested child of an unknown field.
  if (githubPattern.test(text)) return { field: 'github_cli' };
  if (proxyPattern.test(text)) return { field: 'agent_proxy' };
  return null;
}
function suspectedField(body) {
  if (!body.startsWith(' - ')) return null;
  const text = body.slice(3);
  for (const [prefix, field] of [
    ['Platform:', 'platform_name'], ['OS Version:', 'os_version'], ['Shell:', 'shell'],
    ['Primary working directory:', 'primary_directory'], ['The primary working directory announced', 'primary_directory'],
    ['Additional working directories', 'additional_directories'], ['Is a git repository:', 'git_repository'],
    ['This is a git worktree', 'worktree'], ['The git stash stack', 'worktree'], ['The primary working directory is no longer a git worktree', 'worktree'],
    ['Scratchpad directory:', 'scratchpad_directory'], ['The scratchpad directory announced', 'scratchpad_directory'],
    ['`gh` here is', 'github_cli'], ['The built-in `gh api` announced', 'github_cli'],
    ['Outbound HTTPS goes through', 'agent_proxy'], ['The agent proxy announced', 'agent_proxy'],
  ]) if (text.startsWith(prefix)) return field;
  return null;
}
function environmentRegions(text, carrier) {
  const ls = lines(text), result = []; let fence = null;
  for (let i = 0; i < ls.length; i++) {
    const line = ls[i];
    const nextFence = fenceAfter(line.body, fence);
    if (nextFence !== fence) { fence = nextFence; continue; }
    if (fence || !/^# Environment(?: update)?$/.test(line.body)) continue;
    const update = line.body.endsWith(' update');
    if (!update && ls[i + 1]?.body !== intro && ls[i + 1]?.body !== intro.trimEnd()) continue;
    const first = i + (update ? 1 : 2); let stop = first, boundaryFence = null;
    // A heading in an example is not a new environment carrier. Otherwise
    // splitting here would discard fence state and re-enter quoted content.
    while (stop < ls.length) {
      const next = fenceAfter(ls[stop].body, boundaryFence);
      if (next !== boundaryFence) { boundaryFence = next; stop++; continue; }
      if (!boundaryFence && /^(?:#{1,6} |<\/?system-reminder>)/.test(ls[stop].body)) break;
      stop++;
    }
    const entries = [], seen = new Set(), blocked = new Map(); let innerFence = null;
    for (let j = first; j < stop; j++) {
      const next = fenceAfter(ls[j].body, innerFence);
      if (next !== innerFence) { innerFence = next; continue; }
      if (innerFence) {
        const suspected = suspectedField(ls[j].body);
        if (suspected) blocked.set(suspected, 'ambiguous');
        continue;
      }
      const found = identify(ls[j].body, update);
      if (!found) {
        const suspected = suspectedField(ls[j].body);
        if (suspected) blocked.set(suspected, 'unsupported_format');
        continue;
      }
      let end = j;
      if (found.pair) {
        if (ls[j + 1]?.body !== ' - ' + stash) { blocked.set(found.field, 'unsupported_format'); continue; }
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
function recognizedUser(text) {
  // A user text must consist solely of flat reminder blocks. Prose, quotation,
  // code fences and tool-result content are deliberately not parsed.
  let rest = text, offset = 0; const ranges = [];
  while (rest.trim()) {
    const match = /^\s*<system-reminder>([\s\S]*?)<\/system-reminder>/.exec(rest);
    if (!match || match[1].includes('<system-reminder>') || match[1].includes('</system-reminder>')) return [];
    const inner = match[0].indexOf('>') + 1;
    ranges.push({
      start: offset + inner, text: match[1],
      wrapperStart: offset + match[0].indexOf('<system-reminder>'),
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
}

export async function applyContentPolicy(input, policy = {}, native = {}, emitDiagnostic) {
  validatePolicy(policy);
  const output = structuredClone(input);
  if (policy.relay_mode === 'direct') return output;
  const sources = policy.build_attachment_sources ?? {}, slots = textSlots(output), plans = [], regionsBySlot = new Map(), blocked = new Set(), baseline = new Set();
  for (const slot of slots) {
    const ranges = slot.role === 'user' ? recognizedUser(slot.text) : [{ text: slot.text, start: 0 }];
    for (const range of ranges) for (const region of environmentRegions(range.text, slot.path)) {
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
      const regions = environmentRegions(text, 'native');
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
      for (const range of recognizedUser(slot.text)) {
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
  if (native.billing !== undefined) output.system = mergeBillingAttribution(output.system, policy, native.billing, emitDiagnostic);
  return output;
}

// billingCandidate finds the billing header lines of text: a line that starts
// with the header outside a code fence. A mention elsewhere (inside prose, an
// indented quote, a fence) is client content and not a header. A header line
// that cannot be edited safely is a conflict.
function billingCandidate(text) {
  const prefix = 'x-anthropic-billing-header:';
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
export function mergeBillingAttribution(system = [], policy = {}, nativeBilling, emitDiagnostic) {
  validatePolicy(policy);
  const wanted = billingFields.filter(field => policy.build_billing_sources?.[field] === 'worker');
  if (!wanted.length || policy.relay_mode === 'direct') return structuredClone(system);
  const blocks = typeof system === 'string' ? [{ type: 'text', text: system }] : structuredClone(system);
  if (!Array.isArray(blocks)) throw error('system must be text or blocks');
  // worker means the Worker's native attribution, or no request: a header the
  // value cannot be placed in safely is refused (400) instead of forwarding
  // the client's value (2026-10-21; it used to pass through unchanged).
  const found = []; let conflict = '';
  blocks.forEach((block, index) => {
    if (block?.type !== 'text') return;
    if (typeof block.text !== 'string') throw error('system text must be a string');
    const result = billingCandidate(block.text);
    conflict ||= result.conflict ?? '';
    for (const candidate of result.candidates ?? []) found.push({ ...candidate, index });
  });
  if (!conflict && found.length > 1) conflict = 'the system prompt carries more than one billing header';
  if (conflict) {
    wanted.forEach(field => diagnostic(emitDiagnostic, field, 'ambiguous', 'system'));
    throw error(`Worker billing attribution cannot be applied: ${conflict}`);
  }
  const generated = typeof nativeBilling === 'string' ? billingCandidate(nativeBilling) : {};
  if (generated.conflict || generated.candidates?.length !== 1 || wanted.some(field => !generated.candidates[0].keys.has(field))) {
    wanted.forEach(field => diagnostic(emitDiagnostic, field, 'source_unavailable', 'system'));
    throw error('Required native billing attribution is unavailable', 503);
  }
  const values = generated.candidates[0].keys;
  if (!found.length) {
    blocks.unshift({ type: 'text', text: 'x-anthropic-billing-header: ' + wanted.map(field => `${field}=${values.get(field).value};`).join(' ') });
    wanted.forEach(field => diagnostic(emitDiagnostic, field, 'inserted', 'system'));
    return blocks;
  }
  const target = found[0], edits = [], missing = [];
  for (const field of wanted) {
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
