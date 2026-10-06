export function register(on) {
  let requested = false;
  let searchPending = false;
  let searches = 0;
  let formatSteps = 0;
  let clientToolDenied = false;
  let systemsAttached = false;
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
    return yield* next(e);
  });
  on('session.start', async ($, e, next) => {
    const path = await $.env.get('CCGATEWAY_READY_FILE');
    if (path) await $.fs.write(path, 'ccgateway-v1');
    const trace = await $.env.get('CCGATEWAY_ATTACHMENT_TRACE');
    if (trace) {
      try {
        await $.fs.write(trace + '/session-start.txt', 'session.start hook was called');
      } catch (err) {}
    }
    return next(e);
  });
  // The API client's system messages for the pending turn, in order, once per
  // process. Claude Code records them as one system-role attachment after the
  // submitted input (one submission, one record); the gateway checks the
  // acknowledgement and the transcript, and its relay restores the messages.
  on('prompt.submit', async ($, e, next) => {
    const path = await $.env.get('CCGATEWAY_SYSTEM_FILE');
    if (!path || systemsAttached) return next(e);
    systemsAttached = true;
    const source = await $.env.get('CCGATEWAY_ATTACHMENT_SOURCE') || 'client';
    const debugPath = await $.env.get('CCGATEWAY_DEBUG_FILE');
    if (debugPath) await $.fs.write(debugPath, JSON.stringify({event: 'prompt.submit', source, path}));
    // When attachment_source is "gateway", don't attach client system messages
    if (source === 'gateway') {
      await $.fs.write(await $.env.get('CCGATEWAY_SYSTEM_ACK_FILE'), 'ccgateway-system-v1:0');
      return next(e);
    }
    const systems = JSON.parse(await $.fs.read(path));
    await $.fs.write(await $.env.get('CCGATEWAY_SYSTEM_ACK_FILE'), 'ccgateway-system-v1:' + systems.length);
    return next({ ...e, context: [...(e.context ?? []), ...systems] });
  });
  // Attachments from the client (origin.kind === 'plugin') or from hooks stay.
  // Attachments Claude Code adds by itself (origin.kind === 'engine':
  // environment, model, date, token budget, session_context, Auto Mode) are
  // filtered by the attachment_source policy:
  //   "client": drop all engine attachments except deferred_tools_delta
  //   "gateway": drop all plugin attachments except hook_additional_context
  //   "both": keep both sides
  // deferred_tools_delta (engine) names the tools ToolSearch can load.
  // The model reads the client's system text itself, without the label Claude
  // Code puts before a mod's context. Resumed records are relabelled alike.
  on('prompt.attachment', async ($, e, next) => {
    const source = await $.env.get('CCGATEWAY_ATTACHMENT_SOURCE') || 'client';
    if (e.origin?.kind === 'engine') {
      if (source === 'gateway') {
        // gateway mode: keep all engine attachments
        const result = await next(e);
        return result;
      }
      if (source === 'client' && e.type !== 'deferred_tools_delta') {
        // client mode: drop engine attachments except deferred_tools_delta
        return { ...e, text: null };
      }
      // source === 'both': keep everything
    } else if (e.origin?.kind === 'plugin') {
      if (source === 'gateway' && e.type !== 'hook_additional_context') {
        // gateway mode: drop client attachments except hook_additional_context
        return { ...e, text: null };
      }
      // source === 'client' or 'both': keep client attachments
    }
    const result = await next(e);
    const label = 'prompt.submit hook additional context: ';
    if (e.type !== 'hook_additional_context' || e.origin?.kind !== 'plugin' || e.origin?.event !== 'prompt.submit') return result;
    if (typeof result?.text !== 'string' || !result.text.startsWith(label)) return result;
    return { text: result.text.slice(label.length) };
  });
  on('tool.describe', async ($, e, next) => {
    const result = await next(e);
    const path = await $.env.get('CCGATEWAY_TOOL_DEFERRAL_FILE');
    if (!path) return result;
    const deferred = JSON.parse(await $.fs.read(path));
    return Object.hasOwn(deferred, e.tool) ? { ...result, isDeferred: deferred[e.tool] } : result;
  });
  // Only internal discovery and JSON validation run here; client tools belong to the API caller.
  // The next API request restores the real tool_result from client history.
  on('tool.call', async ($, e, next) => {
    // This CLI-owned tool only validates JSON; all client tools remain denied.
    if (e.tool === 'ToolSearch' && await $.env.get('CCGATEWAY_TOOL_SEARCH') === '1' && searches < 3) { searches++; searchPending = true; return next(e); }
    if (e.tool === 'StructuredOutput' && await $.env.get('CCGATEWAY_STRUCTURED_OUTPUT') === '1') return next(e);
    clientToolDenied = true;
    return { deny: 'ccgateway: execution belongs to the API client.' };
  });
}
