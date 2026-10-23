import test from 'node:test';
import assert from 'node:assert/strict';
import { createContentPolicy } from '../content-policy.js';
import { vocabulary } from './vocabulary.mjs';
const { applyContentPolicy, mergeBillingAttribution } = createContentPolicy(vocabulary);
const environment = fields => '# Environment\nYou have been invoked in the following environment: \n' + fields.map(line => ' - ' + line).join('\n') + '\n';
const reminder = body => '<system-reminder>\n' + body + '</system-reminder>';
const request = text => ({ system: [{ type: 'text', text: 'unchanged system', cache_control: { type: 'ephemeral' } }], messages: [{ role: 'user', content: [{ type: 'text', text, cache_control: { type: 'ephemeral' } }] }] });
const snapshot = environment(['Primary working directory: /worker', 'Is a git repository: false', 'Platform: linux', 'Shell: bash', 'OS Version: Worker OS']);
const server = { readEnvironment: async () => snapshot };
const policy = sources => ({ schema_version: 2, build_attachment_sources: sources });
const textOf = result => result.messages[0].content[0].text;
const billing = 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=sdk-cli; cc_workload=server;';

test('only chosen environment fields change; complete carrier and non-target JSON are preserved', async () => {
  const input = request(reminder(environment(['Primary working directory: /client', 'Is a git repository: true', 'Platform: win32', 'Shell: PowerShell', 'OS Version: Client OS', 'Unknown instruction: keep'])));
  const copy = structuredClone(input), output = await applyContentPolicy(input, policy({ platform_name: 'worker', os_version: 'worker' }), server);
  const expected = structuredClone(copy);
  expected.messages[0].content[0].text = textOf(expected).replace('Platform: win32', 'Platform: linux').replace('OS Version: Client OS', 'OS Version: Worker OS');
  assert.deepEqual(output, expected); assert.deepEqual(input, copy);
  assert.deepEqual(await applyContentPolicy(output, policy({ platform_name: 'worker', os_version: 'worker' }), server), output);
});

test('no matches, all client fields and direct mode never collect server facts', async () => {
  for (const input of [request('plain user text'), request(reminder(environment(['Shell: bash']))), request('prefix ' + reminder(environment(['Platform: win32'])))]) {
    assert.deepEqual(await applyContentPolicy(input, policy({ platform_name: 'worker' }), { readEnvironment() { assert.fail('unexpected collection'); } }), input);
  }
  const input = request(reminder(environment(['Platform: win32'])));
  assert.deepEqual(await applyContentPolicy(input, policy({ platform_name: 'client' }), {}), input);
  assert.deepEqual(await applyContentPolicy(input, { relay_mode: 'direct', ...policy({ platform_name: 'worker' }) }, {}), input);
});

test('native collector receives only matched worker fields and excludes erase and absent targets', async () => {
  const input = request(reminder(environment(['Platform: win32', 'Shell: PowerShell'])));
  let needed;
  await applyContentPolicy(input, policy({ platform_name: 'worker', shell: 'erase', scratchpad_directory: 'worker' }), { readEnvironment(fields) { needed = fields; return snapshot; } });
  assert.deepEqual(needed, ['platform_name']);
});

test('does not enter assistant, tool-result, code fences, nested reminder or ordinary quoted text', async () => {
  const env = reminder(environment(['Platform: win32']));
  const input = { system: [{ type: 'text', text: '```\n' + environment(['Platform: win32']) + '```' }], messages: [
    { role: 'assistant', content: env }, { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't', content: env }] },
    { role: 'user', content: '> ' + env }, { role: 'user', content: reminder(env) },
  ] };
  assert.deepEqual(await applyContentPolicy(input, policy({ platform_name: 'worker' }), { readEnvironment() { assert.fail(); } }), input);
});

test('supports system strings and messages system without moving or copying content', async () => {
  const env = environment(['Platform: win32']);
  const input = { system: 'before\n' + env + '# Other\nkeep', messages: [{ role: 'system', content: env, id: 'stable' }] };
  const output = await applyContentPolicy(input, policy({ platform_name: 'worker' }), server);
  assert.deepEqual(output, { system: input.system.replace('Platform: win32', 'Platform: linux'), messages: [{ ...input.messages[0], content: env.replace('win32', 'linux') }] });
});

test('preserves CRLF and nested unknown fields', async () => {
  const text = reminder(environment(['Platform: win32', 'Unknown section:', ' Platform: nested-value', 'Shell: PowerShell'])).replaceAll('\n', '\r\n');
  const output = await applyContentPolicy(request(text), policy({ platform_name: 'worker', shell: 'erase' }), server);
  assert.equal(textOf(output), text.replace('Platform: win32', 'Platform: linux').replace(' - Shell: PowerShell\r\n', ''));
});

test('duplicate fields roll back the field across history while independent fields still change', async () => {
  const first = reminder(environment(['Platform: win32', 'Shell: powershell'])), second = reminder(environment(['Platform: darwin', 'Platform: win32']));
  const input = request(first); input.messages.push({ role: 'user', content: second });
  const output = await applyContentPolicy(input, policy({ platform_name: 'worker', shell: 'worker' }), server);
  assert.equal(textOf(output), first.replace('Shell: powershell', 'Shell: bash'));
  assert.equal(output.messages[1].content, second);
});

test('historical full environments are each rewritten using one snapshot', async () => {
  const input = request(reminder(environment(['Platform: win32']))); input.messages.push({ role: 'user', content: reminder(environment(['Platform: darwin'])) });
  let calls = 0;
  const output = await applyContentPolicy(input, policy({ platform_name: 'worker' }), { readEnvironment() { calls++; return snapshot; } });
  assert.equal(calls, 1); assert.ok(textOf(output).includes('Platform: linux')); assert.ok(output.messages[1].content.includes('Platform: linux'));
});

test('updates after a full baseline discard obsolete selected events but keep other events', async () => {
  const input = request(reminder(environment(['Primary working directory: /old', 'Platform: win32'])));
  input.messages.push({ role: 'user', content: reminder('# Environment update\n - Primary working directory: /new (was /old)\n - Is a git repository: false (was true)\n') });
  const output = await applyContentPolicy(input, policy({ primary_directory: 'worker' }), server);
  assert.ok(textOf(output).includes('Primary working directory: /worker'));
  assert.equal(output.messages[1].content, reminder('# Environment update\n - Is a git repository: false (was true)\n'));
});

test('incremental directories without a baseline roll back the whole field timeline', async () => {
  const update = reminder('# Environment update\n - Additional working directories added:\n  - /new\n');
  const input = request(update); input.messages.push({ role: 'user', content: reminder(environment(['Additional working directories:', ' - /later', 'Platform: win32'])) });
  const diagnostics = [], output = await applyContentPolicy(input, policy({ additional_directories: 'worker' }), { readEnvironment() { assert.fail('rollback collects nothing'); } }, d => diagnostics.push(d));
  assert.deepEqual(output, input); assert.ok(diagnostics.some(d => d.status === 'missing_baseline'));
});

test('erasing an update requires no baseline, removes empty sections, and keeps unknown content', async () => {
  const input = request(reminder('# Environment update\n - Additional working directories removed:\n  - /old\n'));
  const output = await applyContentPolicy(input, policy({ additional_directories: 'erase' }), {});
  assert.deepEqual(output.messages, []);
  const unknown = request(reminder(environment(['Platform: win32', 'Unknown instruction: remain'])));
  assert.equal(textOf(await applyContentPolicy(unknown, policy({ platform_name: 'erase' }), {})), textOf(unknown).replace(' - Platform: win32\n', ''));
});

test('missing optional server fields are removed, false is not absence', async () => {
  const input = request(reminder(environment(['Is a git repository: true', 'Shell: powershell'])));
  const output = await applyContentPolicy(input, policy({ git_repository: 'worker', shell: 'worker' }), { readEnvironment: async () => environment(['Is a git repository: false', 'Platform: linux']) });
  assert.ok(textOf(output).includes('Is a git repository: false')); assert.ok(!textOf(output).includes('Shell:'));
});

test('unavailable facts fail only when actually needed and diagnostics contain no values', async () => {
  const input = request(reminder(environment(['Platform: win32']))), diagnostics = [];
  await assert.rejects(applyContentPolicy(input, policy({ platform_name: 'worker' }), { readEnvironment() { throw Error('secret path /home/private'); } }, d => diagnostics.push(d)), e => e.status === 503 && e.code === 'configuration_error' && !e.message.includes('private'));
  assert.equal(diagnostics[0].status, 'source_unavailable'); assert.equal(diagnostics[0].carrier, 'user');
  assert.ok(!JSON.stringify(diagnostics).includes('win32'));
});

test('null and invalid text reject instead of duplicating the previous block', async () => {
  const input = request(reminder(environment(['Platform: win32']))); input.messages[0].content.push({ type: 'text', text: null });
  await assert.rejects(applyContentPolicy(input, policy({ platform_name: 'worker' }), server), e => e.status === 400);
  for (const value of [{ build_billing_sources: { cc_version: 'erase' } }, { build_attachment_sources: null }, { build_attachment_sources: { user_email: 'worker' } }]) await assert.rejects(applyContentPolicy(request('hello'), value), e => e.status === 400);
});

test('billing replaces only selected values, preserves unknowns, whitespace and cache attributes', () => {
  const original = [{ type: 'text', text: 'x-anthropic-billing-header: cc_version = 2.1.302.b50; cc_entrypoint=client; cc_workload=keep;\r\nafter', cache_control: { type: 'ephemeral' } }];
  const output = mergeBillingAttribution(original, { build_billing_sources: { cc_version: 'worker' } }, billing);
  assert.deepEqual(output, [{ ...original[0], text: original[0].text.replace('2.1.302.b50', '2.1.304.abc') }]);
  assert.deepEqual(mergeBillingAttribution(output, { build_billing_sources: { cc_version: 'worker' } }, billing), output);
});

// Build requests carry the header the way CC sends it: one without a header
// gets the native line whole, a header missing a field gets the native value,
// and client keeps every value the client wrote (2026-10-21 decision).
test('billing fills a missing header or field with native values and keeps client values', () => {
  for (const policy of [{}, { build_billing_sources: { cc_version: 'client' } }, { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'client' } }]) {
    const diagnostics = [];
    const output = mergeBillingAttribution([{ type: 'text', text: 'custom prompt', cache_control: { type: 'ephemeral' } }], policy, billing, d => diagnostics.push(d));
    assert.deepEqual(output, [{ type: 'text', text: billing }, { type: 'text', text: 'custom prompt', cache_control: { type: 'ephemeral' } }], JSON.stringify(policy));
    assert.deepEqual(diagnostics.map(d => [d.field, d.status]), [['cc_version', 'inserted'], ['cc_entrypoint', 'inserted']]);
  }
  const missing = mergeBillingAttribution('x-anthropic-billing-header: cc_workload=keep;', {}, billing);
  assert.equal(missing[0].text, 'x-anthropic-billing-header: cc_workload=keep; cc_version=2.1.304.abc; cc_entrypoint=sdk-cli;');
  const partial = mergeBillingAttribution([{ type: 'text', text: 'x-anthropic-billing-header: cc_version=9.9.9.own;' }], {}, billing);
  assert.equal(partial[0].text, 'x-anthropic-billing-header: cc_version=9.9.9.own; cc_entrypoint=sdk-cli;');
  // A complete client header needs nothing native.
  const complete = [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=9.9.9.own; cc_entrypoint=cli;' }, { type: 'text', text: 'prompt' }];
  assert.deepEqual(mergeBillingAttribution(complete, {}, null), complete);
});

// worker is the Worker's native attribution or no request: a header it cannot
// be placed in safely is refused, before the native value is even needed.
// client leaves such a header exactly as the client wrote it.
test('billing headers that cannot be edited safely are refused for worker', () => {
  const worker = { build_billing_sources: { cc_version: 'worker' } };
  for (const system of [
    [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=a; cc_version=b;' }],
    [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=a;\nx-anthropic-billing-header: cc_entrypoint=x;' }],
    [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=a;' }, { type: 'text', text: 'x-anthropic-billing-header: cc_version=b;' }],
    [{ type: 'text', text: 'x-anthropic-billing-header: ???' }],
    [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=a; x-anthropic-billing-header: cc_version=b;' }],
  ]) {
    const diagnostics = [];
    for (const native of [billing, null]) {
      assert.throws(() => mergeBillingAttribution(system, worker, native, d => diagnostics.push(d)), e => e.status === 400 && e.code === 'invalid_request_error', JSON.stringify(system));
    }
    assert.ok(diagnostics.length && diagnostics.every(d => d.status === 'ambiguous'));
    for (const native of [billing, null]) assert.deepEqual(mergeBillingAttribution(system, { build_billing_sources: { cc_version: 'client' } }, native), system);
  }
});

// A mention of the header in prose, an indented quote or a code fence is
// client content: the native header goes in front and the mention stays.
test('quoted or fenced billing headers are content, not headers', () => {
  const worker = { build_billing_sources: { cc_version: 'worker', cc_entrypoint: 'client' } };
  for (const text of ['quoted x-anthropic-billing-header: cc_version=x;', '  x-anthropic-billing-header: cc_version=x;', '```\nx-anthropic-billing-header: cc_version=x;\n```', 'before\n~~~\nx-anthropic-billing-header: cc_version=x; cc_version=y;\n~~~\nafter']) {
    const system = [{ type: 'text', text }];
    for (const policy of [worker, {}]) assert.deepEqual(mergeBillingAttribution(system, policy, billing), [{ type: 'text', text: billing }, ...system], text);
    assert.throws(() => mergeBillingAttribution(system, worker, null), e => e.status === 503, text);
    assert.deepEqual(mergeBillingAttribution(system, {}, null), system, text);
  }
  // A real header next to a fenced mention is edited in place; unknown
  // fields and the client-sourced field stay.
  const mixed = [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=old; cc_entrypoint=client-entry; opaque=KEEP;\n```\nx-anthropic-billing-header: cc_version=quoted;\n```' }];
  assert.equal(mergeBillingAttribution(mixed, worker, billing)[0].text, 'x-anthropic-billing-header: cc_version=2.1.304.abc; cc_entrypoint=client-entry; opaque=KEEP;\n```\nx-anthropic-billing-header: cc_version=quoted;\n```');
});

// Without a native header the request still goes out: worker refuses, client
// (the default) forwards the system as it is.
test('billing generation failure is explicit for worker and tolerated for client', () => {
  const system = [{ type: 'text', text: 'custom system' }];
  const diagnostics = [];
  assert.throws(() => mergeBillingAttribution(system, { build_billing_sources: { cc_entrypoint: 'worker' } }, ''), e => e.status === 503);
  assert.deepEqual(mergeBillingAttribution(system, { build_billing_sources: { cc_entrypoint: 'client' } }, '', d => diagnostics.push(d)), system);
  assert.deepEqual(diagnostics.map(d => d.status), ['source_unavailable', 'source_unavailable']);
});

// The configured entrypoint stands in for the request process's own in the
// native line: it is what a filled header and a worker field carry. A client
// value under client stays.
test('billing writes the configured entrypoint wherever the native one would go', () => {
  const policy = { build_billing_entrypoint: 'claude-vscode' };
  const vscode = billing.replace('cc_entrypoint=sdk-cli;', 'cc_entrypoint=claude-vscode;');
  assert.deepEqual(mergeBillingAttribution([{ type: 'text', text: 'prompt' }], policy, billing), [{ type: 'text', text: vscode }, { type: 'text', text: 'prompt' }]);
  assert.equal(mergeBillingAttribution('x-anthropic-billing-header: cc_version=9.9.9.own;', policy, billing)[0].text, 'x-anthropic-billing-header: cc_version=9.9.9.own; cc_entrypoint=claude-vscode;');
  const client = [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=9.9.9.own; cc_entrypoint=cli;' }];
  assert.deepEqual(mergeBillingAttribution(client, policy, billing), client);
  assert.equal(mergeBillingAttribution(client, { ...policy, build_billing_sources: { cc_entrypoint: 'worker' } }, billing)[0].text, 'x-anthropic-billing-header: cc_version=9.9.9.own; cc_entrypoint=claude-vscode;');
  assert.throws(() => mergeBillingAttribution(client, { build_billing_entrypoint: 'cli; cch=1' }, billing), e => e.status === 400);
});

test('the request entrypoint is read from the header that opens the system', () => {
  const { billingEntrypoint } = createContentPolicy(vocabulary);
  assert.equal(billingEntrypoint([{ type: 'text', text: 'x-anthropic-billing-header: cc_version=1; cc_entrypoint=cli;' }, { type: 'text', text: 'prompt' }]), 'cli');
  assert.equal(billingEntrypoint('x-anthropic-billing-header: cc_entrypoint=claude-desktop-3p; cc_version=1;\nprompt'), 'claude-desktop-3p');
  // Two headers: the leading one is what upstream reads.
  assert.equal(billingEntrypoint([{ type: 'text', text: 'x-anthropic-billing-header: cc_entrypoint=cli;' }, { type: 'text', text: 'x-anthropic-billing-header: cc_entrypoint=sdk-ts;' }]), 'cli');
  for (const system of [undefined, [], [{ type: 'text', text: 'x-anthropic-billing-header: cc_version=1;' }],
    [{ type: 'text', text: 'prompt' }, { type: 'text', text: 'x-anthropic-billing-header: cc_version=1; cc_entrypoint=cli;' }],
    [{ type: 'text', text: 'before\nx-anthropic-billing-header: cc_entrypoint=cli;' }],
    [{ type: 'text', text: '```\nx-anthropic-billing-header: cc_entrypoint=cli;\n```' }]]) {
    assert.equal(billingEntrypoint(system), undefined, JSON.stringify(system));
  }
});

// The leading header says whether the request is Claude Code's and which
// prompt it belongs to; only its cc_prompt_id value is ever rewritten.
test('the leading header is read by field and one field is rewritten in place', () => {
  const { leadingBilling, setLeadingBillingField } = createContentPolicy(vocabulary);
  const header = 'x-anthropic-billing-header: cc_version=2.1.304.9a4; cc_entrypoint=sdk-cli; cch=10dd7; cc_is_subagent=true; cc_prompt_id=a606b757-b9e1-4f6f-8eb0-88ffd9569a8d;';
  const system = [{ type: 'text', text: header }, { type: 'text', text: 'prompt', cache_control: { type: 'ephemeral' } }];
  assert.deepEqual(leadingBilling(system), { cc_version: '2.1.304.9a4', cc_entrypoint: 'sdk-cli', cch: '10dd7', cc_is_subagent: 'true', cc_prompt_id: 'a606b757-b9e1-4f6f-8eb0-88ffd9569a8d' });
  assert.deepEqual(leadingBilling(header + '\nprompt'), leadingBilling(system));
  assert.deepEqual(leadingBilling([{ type: 'text', text: 'x-anthropic-billing-header: cc_version=1; cc_version=2;' }]), {}, 'a header, though unreadable');
  for (const other of [undefined, [], 'prompt', [{ type: 'text', text: 'prompt' }, { type: 'text', text: header }], [{ type: 'text', text: 'before\n' + header }]]) {
    assert.equal(leadingBilling(other), null, JSON.stringify(other));
  }
  // The request's own header, wherever it is: what hasBilling sees.
  const { requestBilling, hasBilling } = createContentPolicy(vocabulary);
  assert.deepEqual(requestBilling([{ type: 'text', text: 'prompt' }, { type: 'text', text: header }]), leadingBilling(system));
  assert.deepEqual(requestBilling([{ type: 'text', text: 'before\n' + header }]), leadingBilling(system));
  assert.deepEqual(requestBilling(system), leadingBilling(system));
  assert.deepEqual(requestBilling([{ type: 'text', text: 'p' }, { type: 'text', text: 'x-anthropic-billing-header: cc_version=1; cc_version=2;' }]), {});
  for (const other of [undefined, [], 'prompt', [{ type: 'text', text: 'mentions ' + header }]]) {
    assert.equal(requestBilling(other), null, JSON.stringify(other));
    assert.equal(hasBilling(other), false);
  }
  const copy = structuredClone(system);
  const rewritten = setLeadingBillingField(system, 'cc_prompt_id', '11111111-2222-4333-8444-555555555555');
  assert.deepEqual(system, copy);
  assert.equal(rewritten[0].text, header.replace('a606b757-b9e1-4f6f-8eb0-88ffd9569a8d', '11111111-2222-4333-8444-555555555555'));
  assert.deepEqual(rewritten.slice(1), system.slice(1));
  assert.deepEqual(setLeadingBillingField(system, 'cc_prev_req', 'req_x'), system, 'a missing field is not added');
  assert.deepEqual(setLeadingBillingField([{ type: 'text', text: 'prompt' }], 'cc_prompt_id', 'x'), [{ type: 'text', text: 'prompt' }]);
});

// Upstream reads only a header that opens the first block; one elsewhere is
// left as the client wrote it and the native header goes in front (2026-10-22).
test('a header that does not open the system gets the native one in front', () => {
  for (const system of [
    [{ type: 'text', text: 'prompt' }, { type: 'text', text: 'x-anthropic-billing-header: cc_version=9.9.9.own;' }],
    [{ type: 'text', text: 'before\nx-anthropic-billing-header: cc_version=9.9.9.own; cc_entrypoint=cli;' }],
  ]) {
    for (const policy of [{}, { build_billing_sources: { cc_version: 'worker' } }]) {
      assert.deepEqual(mergeBillingAttribution(system, policy, billing), [{ type: 'text', text: billing }, ...system], JSON.stringify([system, policy]));
    }
  }
});

// Fixture captured from the actual CLI 2.1.304 zkt/Kkt renderers with deterministic facts.
const nativeFullClient = "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /client\n - This is a git worktree — an isolated copy of the repository. Run all commands from this directory. Do NOT `cd` to the original repository root.\n - The git stash stack is shared with the main checkout and all other worktrees, and other Claude sessions may push or pop it concurrently. Never use bare `git stash` / `git stash pop` — you could pop another session's changes. Prefer a temporary WIP commit to set work aside; if you must stash, use `git stash push -u -m \"<unique-tag>\"`, immediately capture your entry's SHA via `git stash list --format='%H %gs'`, restore with `git stash apply <sha>` (not pop), and afterwards drop the entry, re-finding its current `stash@{n}` by tag first.\n - Is a git repository: true\n - Additional working directories:\n  - /client-extra\n  - /client-extra2\n - Platform: win32\n - Shell: pwsh\n - OS Version: client os\n - Scratchpad directory: /client-tmp — always use it for temporary files (intermediate results, scripts, outputs that don't belong in the project) instead of `/tmp` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use `/tmp` if the user explicitly asks. Whenever you name a file in it to the user, write the file's complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.\n - Outbound HTTPS goes through a pre-configured agent proxy (CA bundle: /client-ca). If a tool fails TLS verification, gets 403/405/407 from the proxy, or a transfer is cut off (connection reset, unexpected disconnect, RPC failed), run curl -sS \"$HTTPS_PROXY/__agentproxy/status\" for per-tool fixes and proxy state; never disable TLS verification or unset HTTPS_PROXY. Installed CLIs preconfigured for the proxy: gh — prefer a skill/MCP tool, then these, over raw curl.\n - `gh` here is Claude Code's built-in GitHub client, not the GitHub CLI (none was found on this machine when the session started). `gh api <REST endpoint>` works against github.com through this session's GitHub proxy, which supplies the credential for the repositories this session can reach (run `gh api --help` for its flags). This holds even if an earlier instruction in this prompt says you have no `gh` CLI or GitHub API access; where the prompt tells you to prefer GitHub MCP tools, keep preferring them. A 403 from the proxy says what this session lacks; retrying does not fix it. Other gh commands are not available: use `gh api` (the error from a common one, such as `gh pr view` or `gh run list`, names its `gh api` form).";
const nativeFullWorker = "# Environment\nYou have been invoked in the following environment: \n - Primary working directory: /worker\n - This is a git worktree — an isolated copy of the repository. Run all commands from this directory. Do NOT `cd` to the original repository root.\n - The git stash stack is shared with the main checkout and all other worktrees, and other Claude sessions may push or pop it concurrently. Never use bare `git stash` / `git stash pop` — you could pop another session's changes. Prefer a temporary WIP commit to set work aside; if you must stash, use `git stash push -u -m \"<unique-tag>\"`, immediately capture your entry's SHA via `git stash list --format='%H %gs'`, restore with `git stash apply <sha>` (not pop), and afterwards drop the entry, re-finding its current `stash@{n}` by tag first.\n - Is a git repository: false\n - Additional working directories:\n  - /worker-extra\n - Platform: linux\n - Shell: bash\n - OS Version: worker os\n - Scratchpad directory: /worker-tmp — always use it for temporary files (intermediate results, scripts, outputs that don't belong in the project) instead of `/tmp` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use `/tmp` if the user explicitly asks. Whenever you name a file in it to the user, write the file's complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.\n - Outbound HTTPS goes through a pre-configured agent proxy (CA bundle: /worker-ca). If a tool fails TLS verification, gets 403/405/407 from the proxy, or a transfer is cut off (connection reset, unexpected disconnect, RPC failed), see /worker-ca/../README.md and run curl -sS \"$HTTPS_PROXY/__agentproxy/status\" for per-tool fixes and proxy state; never disable TLS verification or unset HTTPS_PROXY. Installed CLIs preconfigured for the proxy: gh, aws — prefer a skill/MCP tool, then these, over raw curl.\n - `gh` here is Claude Code's built-in GitHub client, not the GitHub CLI (none was found on this machine when the session started). `gh api <REST endpoint>` works against github.com through this session's GitHub proxy, which supplies the credential for the repositories this session can reach (run `gh api --help` for its flags). This holds even if an earlier instruction in this prompt says you have no `gh` CLI or GitHub API access; where the prompt tells you to prefer GitHub MCP tools, keep preferring them. A 403 from the proxy says what this session lacks; retrying does not fix it. Other gh commands are not available: use `gh api` (the error from a common one, such as `gh pr view` or `gh run list`, names its `gh api` form).";
const nativeUpdate = "# Environment update\n - Primary working directory: /worker (was /client)\n - This is a git worktree — an isolated copy of the repository. Run all commands from this directory. Do NOT `cd` to the original repository root.\n - The git stash stack is shared with the main checkout and all other worktrees, and other Claude sessions may push or pop it concurrently. Never use bare `git stash` / `git stash pop` — you could pop another session's changes. Prefer a temporary WIP commit to set work aside; if you must stash, use `git stash push -u -m \"<unique-tag>\"`, immediately capture your entry's SHA via `git stash list --format='%H %gs'`, restore with `git stash apply <sha>` (not pop), and afterwards drop the entry, re-finding its current `stash@{n}` by tag first.\n - Is a git repository: false (was true)\n - Additional working directories added:\n  - /new\n - Additional working directories removed:\n  - /old\n - Scratchpad directory: /worker-tmp — always use it for temporary files (intermediate results, scripts, outputs that don't belong in the project) instead of `/tmp` or other system temp directories; it is session-specific, isolated from the project, and can generally be used without permission prompts. Only use `/tmp` if the user explicitly asks. Whenever you name a file in it to the user, write the file's complete absolute path in one piece, not a bare filename, a path that starts at the scratchpad folder, or the directory followed by filenames: a shortened path is read against the working directory and leads nowhere.\n - `gh` here is Claude Code's built-in GitHub client, not the GitHub CLI (none was found on this machine when the session started). `gh api <REST endpoint>` works against github.com through this session's GitHub proxy, which supplies the credential for the repositories this session can reach (run `gh api --help` for its flags). This holds even if an earlier instruction in this prompt says you have no `gh` CLI or GitHub API access; where the prompt tells you to prefer GitHub MCP tools, keep preferring them. A 403 from the proxy says what this session lacks; retrying does not fix it. Other gh commands are not available: use `gh api` (the error from a common one, such as `gh pr view` or `gh run list`, names its `gh api` form). This replaces what this session was told of `gh` earlier.\n - Outbound HTTPS goes through a pre-configured agent proxy (CA bundle: /worker-ca). If a tool fails TLS verification, gets 403/405/407 from the proxy, or a transfer is cut off (connection reset, unexpected disconnect, RPC failed), see /worker-ca/../README.md and run curl -sS \"$HTTPS_PROXY/__agentproxy/status\" for per-tool fixes and proxy state; never disable TLS verification or unset HTTPS_PROXY. Installed CLIs preconfigured for the proxy: gh, aws — prefer a skill/MCP tool, then these, over raw curl.";

test('real 304 templates cover all ten full fields and seven update families', async () => {
  const all = Object.fromEntries(['platform_name','os_version','shell','primary_directory','additional_directories','git_repository','worktree','scratchpad_directory','github_cli','agent_proxy'].map(key => [key, 'worker']));
  const input = request(reminder(nativeFullClient + '\n'));
  input.messages.push({ role: 'user', content: reminder(nativeUpdate + '\n') });
  const output = await applyContentPolicy(input, policy(all), { readEnvironment: async () => nativeFullWorker });
  assert.equal(textOf(output), reminder(nativeFullWorker + '\n'));
  assert.equal(output.messages.length, 1);
  assert.deepEqual(await applyContentPolicy(output, policy(all), {readEnvironment: async()=>nativeFullWorker}), output);
});

test('real native multi-line fields erase as a unit and raw proxy fallback retains native text', async () => {
  const input = request(reminder(nativeFullClient + '\n'));
  const output = await applyContentPolicy(input, policy({ worktree:'erase', additional_directories:'erase', agent_proxy:'worker' }), { readEnvironment: async () => ({ text: nativeFullWorker, fieldText: { agent_proxy:'Configured by the trusted runtime.' } }) });
  assert.ok(!textOf(output).includes('git stash')); assert.ok(!textOf(output).includes('This is a git worktree')); assert.ok(!textOf(output).includes('/client-extra'));
  assert.ok(textOf(output).includes(' - Configured by the trusted runtime.')); assert.ok(textOf(output).includes('OS Version: client os'));
});

test('only newly emptied blocks are removed, original whitespace and metadata stay', async () => {
  const input = request(reminder(environment(['Platform: win32'])));
  input.messages[0].content.push({ type: 'text', text: '  ', cache_control: { type: 'ephemeral' } });
  const output = await applyContentPolicy(input, policy({ platform_name: 'erase' }));
  assert.deepEqual(output.messages, [{ role: 'user', content: [{ type: 'text', text: '  ', cache_control: { type: 'ephemeral' } }] }]);
  const system = { system: [{ type: 'text', text: environment(['Platform: win32']) }], messages: [{ role: 'user', content: 'keep' }] };
  assert.deepEqual((await applyContentPolicy(system, policy({ platform_name: 'erase' }))).system, []);
  for (const message of [ { role: 'user', content: reminder(environment(['Platform: win32'])), id: 'must-retain' }, { role: 'system', content: environment(['Platform: win32']), output_config: { effort: 'high' } } ]) {
    await assert.rejects(applyContentPolicy({ system: [], messages: [message] }, policy({ platform_name: 'erase' })), e => e.status === 400);
  }
});

test('fenced fields inside an environment never become replacement spans', async () => {
  const source = environment(['Platform: win32', 'Shell: powershell']) + '```\n - Platform: code-example\n```\n';
  const output = await applyContentPolicy(request(reminder(source)), policy({ platform_name: 'worker', shell: 'worker' }), server);
  assert.equal(textOf(output), reminder(source.replace('Shell: powershell', 'Shell: bash')));
});

test('modified native long-form instructions are treated as unsupported, not deleted', async () => {
  const text = nativeFullClient.replace('never disable TLS verification', 'CUSTOM: never disable TLS verification').replace('Other gh commands are not available', 'CUSTOM: Other gh commands are not available');
  const input = request(reminder(text));
  assert.deepEqual(await applyContentPolicy(input, policy({ agent_proxy: 'erase', github_cli: 'erase' })), input);
});

test('unknown deeper directory-list subtrees preserve the complete field', async () => {
  const input = request(reminder('# Environment\nYou have been invoked in the following environment: \n - Additional working directories:\n  - /client\n   - Unknown child: keep\n - Platform: win32\n'));
  const output = await applyContentPolicy(input, policy({ additional_directories: 'erase', platform_name: 'worker' }), server);
  assert.equal(textOf(output), textOf(input).replace('Platform: win32', 'Platform: linux'));
});

test('only newly emptied environment reminders are removed; pre-existing empty reminders survive', async () => {
  const empty = '<system-reminder> \n </system-reminder>';
  const env = reminder(environment(['Platform: win32']));
  for (const source of ['client', 'worker', 'erase']) {
    const input = request(empty + '\n' + env + '\n' + empty);
    const expected = structuredClone(input);
    expected.messages[0].content[0].text = empty + '\n'
      + (source === 'erase' ? '' : source === 'worker' ? env.replace('Platform: win32', 'Platform: linux') : env)
      + '\n' + empty;
    assert.deepEqual(await applyContentPolicy(input, policy({ platform_name: source }), server), expected);
  }
});

test('a complete Environment heading inside a fenced example cannot restart recognition', async () => {
  const text = environment(['Platform: win32', 'Shell: powershell'])
    + '```text\n' + environment(['Platform: example-only']) + '```\n';
  const input = { system: [{ type: 'text', text }], messages: [{ role: 'user', content: 'keep' }] };
  const expected = structuredClone(input);
  expected.system[0].text = text.replace('Shell: powershell', 'Shell: bash');
  assert.deepEqual(await applyContentPolicy(input, policy({ platform_name: 'worker', shell: 'worker' }), server), expected);
});

test('shorter or mismatched fence markers do not expose quoted environment or billing', async () => {
  for (const middle of ['```', '~~~', '````not-a-closing-fence']) {
    const quoted = '````text\n' + middle + '\n' + environment(['Platform: example-only']) + '````\n';
    const input = { system: [{ type: 'text', text: quoted + environment(['Platform: win32']) }], messages: [{ role: 'user', content: 'keep' }] };
    const expected = structuredClone(input);
    expected.system[0].text = quoted + environment(['Platform: linux']);
    assert.deepEqual(await applyContentPolicy(input, policy({ platform_name: 'worker' }), server), expected);
    // The fenced header is content: the Worker's own header goes in front.
    const bill = [{ type: 'text', text: '````text\n' + middle + '\nx-anthropic-billing-header: cc_version=example;\n````' }];
    assert.deepEqual(mergeBillingAttribution(bill, { build_billing_sources: { cc_version: 'worker' } }, billing), [{ type: 'text', text: billing }, ...bill]);
  }
});

// Independent golden-span oracle: positions come from the captured native
// fixture, not from the production recognizer or its replacement decisions.
const matrixOrder = ['primary_directory', 'worktree', 'git_repository', 'additional_directories', 'platform_name', 'shell', 'os_version', 'scratchpad_directory', 'agent_proxy', 'github_cli'];
function goldenParts(full) {
  const [header, ...parts] = full.split(/\n(?= - )/);
  parts.splice(1, 2, parts[1] + '\n' + parts[2]); // native worktree + stash form one field
  assert.equal(parts.length, matrixOrder.length);
  return { header: header + '\n', fields: Object.fromEntries(parts.map((part, i) => [matrixOrder[i], part + '\n'])) };
}
const goldenClient = goldenParts(nativeFullClient);
const goldenWorker = goldenParts(nativeFullWorker);
const retained = ' - Unknown future instruction: KEEP\n';
function goldenEnvironment(sources) {
  return goldenClient.header + matrixOrder.map(field => sources[field] === 'erase' ? ''
    : sources[field] === 'worker' ? goldenWorker.fields[field] : goldenClient.fields[field]).join('') + retained;
}
const matrixBilling = 'x-anthropic-billing-header: cc_version=0.0.0.client; cc_entrypoint=client-entry; opaque=KEEP;';
function matrixRequest(env, carrier = 'user_blocks', billingText = matrixBilling) {
  const body = {
    system: [{ type: 'text', text: billingText, cache_control: { type: 'ephemeral' } }, { type: 'text', text: 'UNCHANGED SYSTEM' }],
    messages: [{ role: 'user', content: 'start' }, { role: 'assistant', content: [{ type: 'thinking', thinking: 'opaque', signature: 'KEEP' }, { type: 'text', text: 'reply' }] }],
  };
  const wrapped = reminder('') + '\n' + reminder(env) + '\n' + reminder('');
  if (carrier === 'system_string') body.system = '# Before\nKEEP\n' + env + '# After\nKEEP';
  else if (carrier === 'system_blocks') body.system.push({ type: 'text', text: env, cache_control: { type: 'ephemeral', ttl: '5m' } });
  else if (carrier === 'message_system') body.messages.push({ role: 'system', content: [{ type: 'text', text: env }], clear_at: 'next_user_message' });
  else if (carrier === 'user_string') body.messages.push({ role: 'user', content: wrapped });
  else body.messages.push({ role: 'user', content: [{ type: 'text', text: 'UNRELATED BLOCK' }, { type: 'text', text: wrapped, cache_control: { type: 'ephemeral' } }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'opaque' } }] });
  return body;
}

test('matrix: each of 10 fields × 3 sources × 5 carriers changes exactly its golden span (150 cases)', async () => {
  for (const field of matrixOrder) for (const source of ['client', 'worker', 'erase']) {
    for (const carrier of ['system_string', 'system_blocks', 'message_system', 'user_string', 'user_blocks']) {
      const selection = { [field]: source }, input = matrixRequest(goldenEnvironment({}), carrier);
      let reads = 0;
      const actual = await applyContentPolicy(input, policy(selection), { readEnvironment(needed) {
        reads++; assert.deepEqual(needed, [field]); return nativeFullWorker;
      } });
      assert.deepEqual(actual, matrixRequest(goldenEnvironment(selection), carrier), `${field}/${source}/${carrier}`);
      assert.equal(reads, source === 'worker' ? 1 : 0);
      assert.deepEqual(input, matrixRequest(goldenEnvironment({}), carrier), 'input is immutable');
    }
  }
});

test('matrix: every environment field pair × 9 source pairs × 4 billing policies (1620 cases)', async () => {
  let cases = 0;
  for (let a = 0; a < matrixOrder.length; a++) for (let b = a + 1; b < matrixOrder.length; b++) {
    for (const first of ['client', 'worker', 'erase']) for (const second of ['client', 'worker', 'erase']) {
      for (const version of ['client', 'worker']) for (const entry of ['client', 'worker']) {
        const selected = { [matrixOrder[a]]: first, [matrixOrder[b]]: second };
        const selectedPolicy = { ...policy(selected), build_billing_sources: { cc_version: version, cc_entrypoint: entry } };
        const expectedBilling = matrixBilling.replace('0.0.0.client', version === 'worker' ? '2.1.304.abc' : '0.0.0.client')
          .replace('client-entry', entry === 'worker' ? 'sdk-cli' : 'client-entry');
        const input = matrixRequest(goldenEnvironment({}));
        let reads = 0;
        const native = { billing, readEnvironment(needed) {
          reads++; assert.deepEqual(new Set(needed), new Set(Object.keys(selected).filter(field => selected[field] === 'worker')));
          return nativeFullWorker;
        } };
        const actual = await applyContentPolicy(input, selectedPolicy, native);
        assert.deepEqual(actual, matrixRequest(goldenEnvironment(selected), 'user_blocks', expectedBilling), JSON.stringify(selectedPolicy));
        assert.equal(reads, first === 'worker' || second === 'worker' ? 1 : 0);
        assert.deepEqual(await applyContentPolicy(actual, selectedPolicy, native), actual, 'same snapshot must be idempotent');
        assert.deepEqual(await applyContentPolicy(input, { ...selectedPolicy, relay_mode: 'direct' }, {
          readEnvironment() { assert.fail('direct must not collect facts'); },
          billing: null,
        }), input);
        cases++;
      }
    }
  }
  assert.equal(cases, 1620);
});

test('matrix: all 12 settings change on adjacent and concurrent requests without cached policy (6 cases)', async () => {
  const input = matrixRequest(goldenEnvironment({}));
  const settings = ['worker', 'client', 'erase', 'worker', 'erase', 'client'].map(source => ({
    ...policy(Object.fromEntries(matrixOrder.map(field => [field, source]))),
    build_billing_sources: { cc_version: source === 'worker' ? 'worker' : 'client', cc_entrypoint: source === 'worker' ? 'worker' : 'client' },
  }));
  const expected = settings.map(p => matrixRequest(goldenEnvironment(p.build_attachment_sources), 'user_blocks',
    p.build_billing_sources.cc_version === 'worker' ? matrixBilling.replace('0.0.0.client', '2.1.304.abc').replace('client-entry', 'sdk-cli') : matrixBilling));
  for (const [i, p] of settings.entries()) {
    assert.deepEqual(await applyContentPolicy(input, p, { readEnvironment: async () => nativeFullWorker, billing }), expected[i]);
  }
  assert.deepEqual(await Promise.all(settings.map(p => applyContentPolicy(input, p, {
    readEnvironment: async () => { await new Promise(resolve => setTimeout(resolve, 2)); return nativeFullWorker; }, billing,
  }))), expected);
});
