export function register(on) {
  on('session.start', async ($, e, next) => {
    const scenario = await $.env.get('CCG_PROBE_SCENARIO');
    if (['control', 'original', 'original-denied', 'unknown'].includes(scenario)) return next(e);
    for (const name of ['Bash', 'NativeEcho', 'NativeUnhandled']) {
      const registered = await $.tool.register({
        kind: 'native', name, description: `MOD_NATIVE_${name}`,
        inputSchema: { type: 'object', properties: { script: { type: 'string' } }, required: ['script'], additionalProperties: false },
      });
      if (registered.tool !== name) throw new Error('CLI does not support ccgateway native tools');
    }
    if (await $.env.get('CCG_PROBE_SCENARIO') === 'mcp') await $.tool.register({ name: 'LegacyEcho', description: 'LEGACY_MCP', inputSchema: { type: 'object' } });
    return next(e);
  });
  on('tool.call', async ($, e, next) => {
    if (await $.env.get('CCG_PROBE_SCENARIO') === 'control') return next(e);
    if (e.tool === 'NativeUnhandled') return next(e);
    if (!['Bash', 'NativeEcho', 'Read', 'TaskCreate', 'WebFetch', 'UndeclaredTool'].includes(e.tool) && !e.tool.endsWith('__LegacyEcho')) return next(e);
    if (e.tool === 'NativeEcho' && await $.env.get('CCG_PROBE_SCENARIO') === 'reregister') {
      await $.tool.register({ kind: 'native', name: 'NativeEcho', description: 'MOD_NATIVE_UPDATED', inputSchema: { type: 'object', properties: { updated: { type: 'number' } }, required: ['updated'] } });
    }
    const result = { marker: 'MOD_INTERCEPTED', name: e.tool, script: e.script, extra: e.extra, command: e.command ?? null };
    return { result: e.tool.endsWith('__LegacyEcho') ? JSON.stringify(result) : result };
  });
}
