export function register(on) {
  let requested = false;
  let searchPending = false;
  let searches = 0;
  let formatSteps = 0;
  let clientToolDenied = false;
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
    return next(e);
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
