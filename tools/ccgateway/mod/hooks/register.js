export function register(on) {
  on('session.start', async ($, e, next) => {
    const path = await $.env.get('CCGATEWAY_READY_FILE');
    if (path) await $.fs.write(path, 'ccgateway-v1');
    return next(e);
  });
  // API clients provide the conversation context. These CLI-local reminders
  // otherwise move into each new user/tool-result message on every subprocess,
  // changing already-sent prefixes when the gateway restores client history.
  on('prompt.attachment', ($, e, next) => {
    if (['environment', 'model', 'date'].includes(e.type)) return { text: null };
    return next(e);
  });
  // Never call next: both native and MCP tools belong to the API caller.
  // The next API request restores the real tool_result from client history.
  on('tool.call', async () => {
    return { deny: 'ccgateway: execution belongs to the API client.' };
  });
}
