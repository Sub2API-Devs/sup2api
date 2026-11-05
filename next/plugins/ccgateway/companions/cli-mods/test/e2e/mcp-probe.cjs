// A stdio MCP server for the e2e kit (state.sh): one tool, echo, that returns
// its text. Newline-delimited JSON-RPC 2.0, the transport Claude Code uses
// for a "command" server.
//   {"mcpServers":{"probe":{"command":"node","args":["/t/mcp-probe.cjs"]}}}
const readline = require('readline');
const send = m => process.stdout.write(JSON.stringify(m) + '\n');
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  if (m.id === undefined) return; // notifications
  const result = {
    initialize: () => ({ protocolVersion: m.params?.protocolVersion || '2025-06-18', capabilities: { tools: {} }, serverInfo: { name: 'probe', version: '1.0.0' } }),
    'tools/list': () => ({ tools: [{ name: 'echo', description: 'Returns its text.', inputSchema: { type: 'object', properties: { text: { type: 'string' } }, required: ['text'] } }] }),
    'tools/call': () => ({ content: [{ type: 'text', text: String(m.params?.arguments?.text ?? '') }] }),
    ping: () => ({}),
  }[m.method];
  if (result) send({ jsonrpc: '2.0', id: m.id, result: result() });
  else send({ jsonrpc: '2.0', id: m.id, error: { code: -32601, message: 'method not found' } });
});
