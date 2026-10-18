// Inserted into the version-pinned CLI module. These names refer to that
// module's existing hook runners, event dispatcher and transcript helpers.
async function* Xj(e, n, r, s, h, y = i5t) {
  const tool = ccgFind(s.session, e.name) ?? { name: e.name };
  const pending = [];
  const enabled = !s.options.settingsHooksOff && !s.options.bareFork;
  const mode = de(s).mode;
  const started = Date.now();
  function collect(item, event) {
    if (item.message) pending.push({ message: item.message });
    if (item.blockingError) pending.push({ message: Zt({ type: 'hook_blocking_error', blockingError: item.blockingError, hookName: `${event}:${e.name}`, toolUseID: e.id, hookEvent: event }) });
    if (item.additionalContexts?.length) pending.push({ message: Zt({ type: 'hook_additional_context', content: item.additionalContexts, hookName: `${event}:${e.name}`, toolUseID: e.id, hookEvent: event }) });
    if (item.preventContinuation) pending.push({ message: Zt({ type: 'hook_stopped_continuation', message: item.stopReason || 'Execution stopped by hook', hookName: `${event}:${e.name}`, toolUseID: e.id, hookEvent: event }) });
  }
  const lifecycle = {
    async before(input) {
      if (!enabled) return {};
      // Run all configured hooks (including classic.PreToolUse mods), not just
      // managed settings. There is no original tool parser or permission core.
      const pre = await bY(xHe(e.name, e.id, input, s, mode, s.abortController.signal), e.name);
      for (const item of pre.yields) collect(item, 'PreToolUse');
      if (pre.result.additionalContext) collect({ additionalContexts: pre.result.additionalContext }, 'PreToolUse');
      const stopped = pre.yields.find(item => item.preventContinuation);
      if (pre.result.deny !== undefined) return { deny: pre.result.deny };
      if (stopped) return { deny: stopped.stopReason || 'Execution stopped by hook' };
      if (pre.result.ask !== undefined) return { deny: `PreToolUse hook requires approval: ${pre.result.ask}` };
      return { input: pre.result.updatedInput ?? input };
    },
    async after(input, output) {
      if (!enabled) return output;
      let result = output;
      for await (const item of fkn(e.name, e.id, input, output, s, mode, s.abortController.signal, undefined, Date.now() - started)) {
        if (item.updatedToolOutput !== undefined) result = item.updatedToolOutput;
        else if (e.name.startsWith('mcp__') && item.updatedMCPToolOutput !== undefined) result = item.updatedMCPToolOutput;
        collect(item, 'PostToolUse');
        if (item.preventContinuation) break;
      }
      return result;
    },
    async failed(input, error) {
      if (!enabled) return;
      for await (const item of t5r(e.name, e.id, input, error, s, s.abortController.signal.aborted, mode, s.abortController.signal, undefined, Date.now() - started)) {
        collect(item, 'PostToolUseFailure');
        if (item.preventContinuation) break;
      }
    }
  };
  try {
    const result = await ccgDispatch(tool, e, lifecycle, (event, core) => P7t({
      signal: s.abortController.signal,
      origin: s.hookOrigin,
      core: { 'tool.call': core },
      withoutModuleHandlers: s.options.settingsHooksOff ? true : undefined,
    }).tool.call(event));
    yield { message: xe({ content: [result], toolUseResult: result.content, sourceToolAssistantUUID: n.uuid, now: h }) };
  } catch (error) {
    yield { message: xe({ content: [{ type: 'tool_result', tool_use_id: e.id, is_error: true, content: String(error instanceof Error ? error.message : error) }], sourceToolAssistantUUID: n.uuid, now: h }) };
  } finally {
    Jce(s.session, e.id);
  }
  yield* pending;
}
