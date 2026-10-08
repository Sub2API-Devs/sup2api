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
  // CLI recovery can schedule another model request even with max-turns=1.
  // Only bounded discovery and one structured-format continuation may send
  // another model request. Client tool execution never continues here.
  on('turn.step', async function* ($, e, next) {
    const formatContinuation = requested && !clientToolDenied && formatSteps < 1 && await $.env.get('CCGATEWAY_STRUCTURED_OUTPUT') === '1';
    if (requested && !searchPending && !formatContinuation) {
      await $.turn.abort({ turnId: e.turnId });
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null };
    }
    if (formatContinuation && !searchPending) formatSteps++;
    requested = true;
    searchPending = false;
    if (!configuration?.main_request_scope) return yield* next(e);
    const lease = async event => {
      const response = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event }) });
      if (!response.ok) throw new Error('ccgateway: main request scope rejected');
    };
    await lease('main_request_begin');
    let turnFailed = false;
    try {
      return yield* next(e);
    } catch (error) {
      turnFailed = true;
      throw error;
    } finally {
      try { await lease('main_request_end'); }
      catch (error) {
        // Go retains the failed lease independently. Preserve the original
        // turn exception instead of replacing it with this cleanup failure.
        if (!turnFailed) throw error;
      }
    }
  });
  on('session.start', async ($, e, next) => {
    controlURL = await $.env.get('CCGATEWAY_MOD_URL');
    controlToken = await $.env.get('CCGATEWAY_MOD_TOKEN');
    const response = await $.http.fetch(controlURL, { headers: { Authorization: 'Bearer ' + controlToken } });
    if (!response.ok) throw new Error('ccgateway: Mod configuration unavailable');
    configuration = JSON.parse(response.text);
    const ready = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'ready', version: 'ccgateway-v2' }) });
    if (!ready.ok) throw new Error('ccgateway: Mod acknowledgement rejected');
    return next(e);
  });
  // Pending system text is fetched in memory. The native transcript and outbound
  // relay still independently verify what the model actually received.
  on('prompt.submit', async ($, e, next) => {
    if (systemsAttached) return next(e);
    systemsAttached = true;
    const systems = configuration.systems || [];
    const ack = await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'system', systems: systems.length }) });
    if (!ack.ok) throw new Error('ccgateway: system acknowledgement rejected');
    if (systems.length === 0) return next(e);
    return next({ ...e, context: [...(e.context ?? []), ...systems] });
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
    const search = !route && e.tool === 'ToolSearch' && await $.env.get('CCGATEWAY_TOOL_SEARCH') === '1' && searches < 3;
    const structured = !route && e.tool === 'StructuredOutput' && await $.env.get('CCGATEWAY_STRUCTURED_OUTPUT') === '1';
    if (configuration?.trace) {
      try {
        await $.http.fetch(controlURL, { method: 'POST', headers: { Authorization: 'Bearer ' + controlToken, 'content-type': 'application/json' }, body: JSON.stringify({ event: 'tool', detail: { call: e, route: route || null, decision: search || structured ? 'internal_execute' : 'client_handoff', local_execution: search || structured } }) });
      } catch { /* Logging failure never grants local tool execution. */ }
    }
    if (search) { searches++; searchPending = true; return next(e); }
    if (structured) return next(e);
    clientToolDenied = true;
    return { deny: 'ccgateway: execution belongs to the API client.' };
  });
}
