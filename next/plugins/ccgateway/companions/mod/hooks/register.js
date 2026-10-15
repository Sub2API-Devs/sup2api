// Select native environment fields without changing the process/session cwd.
export function filterEnvironmentFields(text, policy, keepDefault) {
  if (typeof text !== 'string') return keepDefault ? text : null;
  const fields = policy.environment_fields || {};
  const lines = text.split(/\r?\n/);
  const cwd = /^[ \t]*- Primary working directory: (.+)$/;
  const platform = /^[ \t]*- Platform: (linux|win32)$/;
  if (lines.filter(l => cwd.test(l)).length !== 1 || lines.filter(l => platform.test(l)).length !== 1) return keepDefault ? text : null;
  let retained = 0;
  const result = lines.filter(line => {
    const field = cwd.test(line) ? 'workingDirectory' : platform.test(line) ? 'platform' : null;
    if (field && fields[field]) {
      const keep = fields[field] === 'gateway' || !policy.client_environment_fields?.[field];
      if (keep) retained++;
      return keep;
    }
    if (keepDefault) { if (field) retained++; return true; }
    return /^(<\/?system-reminder>|# Environment|You have been invoked in the following environment:.*|\s*)$/.test(line);
  });
  return !keepDefault && retained === 0 ? null : result.join('\n');
}

// The client's fields reach every native model request through
// CLAUDE_CODE_EXTRA_BODY, which the CLI reads per request; tool_choice is in
// the first round's fields only.
async function* passthroughStep($, e, next, passthrough, firstRound) {
  const body = firstRound ? passthrough.first : passthrough.rest;
  if (typeof body !== 'string') throw new Error('ccgateway: native request body unavailable');
  await $.env.set('CLAUDE_CODE_EXTRA_BODY', body);
  return yield* next(e);
}

export function register(on) {
  let requested = false;
  let searchPending = false;
  let searches = 0;
  let formatSteps = 0;
  let clientToolDenied = false;
  let systemsAttached = false;
  let controlURL;
  let controlToken;
  let configuration;
  let passthroughRounds = 0;
  // CLI recovery can schedule another model request even with max-turns=1.
  // Only bounded discovery and one structured-format continuation may send
  // another model request. Client tool execution never continues here.
  on('turn.step', async function* ($, e, next) {
    const formatContinuation = requested && !clientToolDenied && formatSteps < 1 && await $.env.get('CCGATEWAY_STRUCTURED_OUTPUT') === '1';
    // In passthrough a round that also called a client tool ends the run, even
    // when a web search of the same round was answered.
    const handedOff = configuration?.passthrough && clientToolDenied;
    if (requested && (configuration?.single_turn || (!searchPending || handedOff) && !formatContinuation)) {
      await $.turn.abort({ turnId: e.turnId });
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null };
    }
    if (requested && searchPending && !handedOff && configuration?.scope_boundary) {
      // Stop before the next model call. The Worker resumes the actual native
      // tool results after expiring only the attachment identified at append.
      const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'scope_pause', detail: { searches } }) });
      await $.turn.abort({ turnId: e.turnId });
      if (!ack.ok) throw new Error('ccgateway: scoped continuation rejected');
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null };
    }
    if (formatContinuation && !searchPending) formatSteps++;
    requested = true;
    searchPending = false;
    if (configuration?.passthrough) return yield* passthroughStep($, e, next, configuration.passthrough, passthroughRounds++ === 0);
    return yield* next(e);
  }).catch(async function* ($, e, next) {
    if (next.called) return yield* next(e);
    // A failed boundary hook must never fall open into a duplicate model call.
    await $.turn.abort({ turnId: e.turnId });
    return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null };
  });
  on('session.start', async ($, e, next) => {
    controlURL = await $.env.get('CCGATEWAY_MOD_URL');
    controlToken = await $.env.get('CCGATEWAY_MOD_TOKEN');
    const response = await $.http.fetch(controlURL, { headers: { Authorization: 'Bearer ' + controlToken } });
    if (!response.ok) throw new Error('ccgateway: Mod configuration unavailable');
    configuration = JSON.parse(response.text);
    if (configuration.scope_resumed) passthroughRounds = 1;
    searches = configuration.search_calls || 0;
    const ready = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'ready', version: 'ccgateway-v3' }) });
    if (!ready.ok) throw new Error('ccgateway: Mod acknowledgement rejected');
    return next(e);
  });
  // Pending system text is fetched in memory. The native transcript
  // independently verifies the attached system messages.
  on('prompt.submit', async ($, e, next) => {
    if (systemsAttached) return next(e);
    systemsAttached = true;
    const systems = configuration.systems || [];
    const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'system', systems: systems.length }) });
    if (!ack.ok) throw new Error('ccgateway: system acknowledgement rejected');
    if (systems.length === 0) return next(e);
    return next({ ...e, context: [...(e.context ?? []), ...systems] });
  });
  on('session.append', async ($, e, next) => {
    const result = await next(e);
    if (configuration?.scope_boundary && systemsAttached && e.message.type === 'attachment' && e.message.name === 'hook_additional_context' && e.origin?.kind === 'plugin' && e.origin?.event === 'prompt.submit') {
      const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'scope_attachment', detail: { uuid: e.uuid } }) });
      if (!ack.ok) throw new Error('ccgateway: scoped attachment acknowledgement rejected');
    }
    return result;
  });
  // Filter structured attachments by type and origin. Functional context is
  // protected; unknown types have independent per-origin policies.
  on('prompt.attachment', async ($, e, next) => {
    const source = await $.env.get('CCGATEWAY_ATTACHMENT_SOURCE') || 'client';
    const trace = async (decision, result) => {
      if (!configuration?.trace) return;
      try {
        await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'trace', detail: { source, type: e.type, origin: e.origin, decision, input: e.text, output: result?.text } }) });
      } catch { /* Diagnostic failure must not change the attachment policy. */ }
    };
    const policy = configuration?.attachments || {};
    const known = ['environment', 'model', 'total_tokens_reminder', 'session_context', 'date'];
    // Transported client system and tool-discovery context are functional,
    // not environment metadata. Unknown policy must never delete them.
    const protectedType = ['hook_additional_context', 'deferred_tools_delta'].includes(e.type);
    const origin = e.origin?.kind;
    let keep = true;
    if (!protectedType && (origin === 'engine' || origin === 'plugin')) {
      if (known.includes(e.type)) {
        const selected = policy.sources?.[e.type] || policy.default_source || source;
        keep = selected === 'both' || selected === (origin === 'engine' ? 'gateway' : 'client');
      } else {
        keep = (origin === 'engine' ? policy.unknown_gateway : policy.unknown_client) !== 'ignore';
      }
    }
    if (origin === 'engine' && e.type === 'environment' && Object.keys(policy.environment_fields || {}).length > 0) {
      const result = await next(e);
      const filtered = { ...result, text: filterEnvironmentFields(result?.text, policy, keep) };
      await trace(filtered.text === null ? 'drop' : 'filter_fields', filtered);
      return filtered;
    }
    // Rendering run (gateway_attachments.go): report Claude Code's own text
    // of the replaceable types; what reaches the model is decided as usual.
    if (configuration?.report_attachments && origin === 'engine' && known.includes(e.type)) {
      const rendered = await next(e);
      if (typeof rendered?.text === 'string' && rendered.text.length > 0) {
        const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'gateway_attachment', detail: { type: e.type, text: rendered.text } }) });
        if (!ack.ok) throw new Error('ccgateway: gateway attachment acknowledgement rejected');
      }
      if (!keep) return { ...e, text: null };
      return rendered;
    }
    if (!keep) {
      await trace('drop', { text: null });
      return { ...e, text: null };
    }
    const result = await next(e);
    await trace('keep', result);
    if (configuration?.continuation_attachment_ack && e.type === 'total_tokens_reminder' && origin === 'engine' && typeof result?.text === 'string' && result.text.length > 0) {
      const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'continuation_reminder', detail: { text: result.text } }) });
      if (!ack.ok) throw new Error('ccgateway: continuation reminder acknowledgement rejected');
    }
    if (e.type === 'session_context' && origin === 'engine' && typeof result?.text === 'string' && result.text.length > 0) {
      const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'session_context', detail: { text: result.text } }) });
      if (!ack.ok) throw new Error('ccgateway: session context acknowledgement rejected');
    }
    const label = 'prompt.submit hook additional context: ';
    if (e.type !== 'hook_additional_context' || e.origin?.kind !== 'plugin' || e.origin?.event !== 'prompt.submit') return result;
    if (typeof result?.text !== 'string' || !result.text.startsWith(label)) return result;
    const relabelled = { text: result.text.slice(label.length) };
    await trace('relabel', relabelled);
    return relabelled;
  });
  on('tool.describe', async ($, e, next) => {
    let result = await next(e);
    const route = configuration?.tools?.[e.tool];
    if (route) result = { ...result, description: route.description };
    const deferred = configuration.deferred || {};
    return Object.hasOwn(deferred, e.tool) ? { ...result, isDeferred: deferred[e.tool] } : result;
  });
  // Only internal discovery and JSON validation run here; client tools belong to the API caller.
  // The next API request restores the real tool_result from client history.
  on('tool.call', async ($, e, next) => {
    const route = configuration?.tools?.[e.tool];
    // A declared client tool never becomes an internal helper by its name.
    const search = !configuration?.single_turn && !route && e.tool === 'ToolSearch' && await $.env.get('CCGATEWAY_TOOL_SEARCH') === '1' && searches < 3;
    const structured = !configuration?.single_turn && !route && e.tool === 'StructuredOutput' && await $.env.get('CCGATEWAY_STRUCTURED_OUTPUT') === '1';
    if (configuration?.trace) {
      try {
        await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'tool', detail: { call: e, route: route || null, decision: search || structured ? 'internal_execute' : 'client_handoff', local_execution: search || structured } }) });
      } catch { /* Logging failure never grants local tool execution. */ }
    }
    if (search) { searches++; searchPending = true; return next(e); }
    // Passthrough web_search: the Worker runs the search in a one-shot process
    // of this account; the model reads the result as WebSearch's own.
    if (!configuration?.single_turn && !route && e.tool === 'WebSearch' && configuration?.web_search) {
      const response = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'web_search', detail: { tool_use_id: e.tool_use_id, input: { query: e.query, allowed_domains: e.allowed_domains, blocked_domains: e.blocked_domains } } }) });
      if (!response.ok) throw new Error('ccgateway: web search unavailable');
      const answer = JSON.parse(response.text);
      searchPending = true;
      if (answer.error) return { deny: answer.error };
      return { result: answer.result };
    }
    if (structured) return next(e);
    clientToolDenied = true;
    return { deny: 'ccgateway: execution belongs to the API client.' };
  });
}
