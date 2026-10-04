export function register(on) {
  let requested = false;
  // CLI recovery can schedule another model request even with max-turns=1.
  // End that continuation before next() sends it, while allowing native
  // persistence of the first response to finish normally.
  on('turn.step', async function* ($, e, next) {
    if (requested) {
      await $.turn.abort({ turnId: e.turnId });
      return { turnId: e.turnId, index: e.index, answer: '', toolUses: [], stopReason: null, usage: null };
    }
    requested = true;
    return yield* next(e);
  });
  on('session.start', async ($, e, next) => {
    const path = await $.env.get('CCGATEWAY_READY_FILE');
    if (path) await $.fs.write(path, 'ccgateway-v1');
    return next(e);
  });
  // Never call next: both native and MCP tools belong to the API caller.
  // The next API request restores the real tool_result from client history.
  on('tool.call', async () => {
    return { deny: 'ccgateway: execution belongs to the API client.' };
  });
}
