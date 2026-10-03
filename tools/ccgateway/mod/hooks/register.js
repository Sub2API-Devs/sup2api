export function register(on) {
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
