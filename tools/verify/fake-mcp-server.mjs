// 最小的 stdio MCP 服务器（换行分隔的 JSON-RPC 2.0），供离线 MCP 场景使用。
//
// 用法：node tools/verify/fake-mcp-server.mjs [<log.jsonl>]
//   CLI 通过 --mcp-config '{"mcpServers":{"verify":{"type":"stdio","command":"node","args":["<本文件>","<log>"]}}}' 启动它。
//   收到的每条消息追加写入 <log.jsonl>（场景结束后读取，用于检查握手形状）。
//
// 能力：
//   initialize      回显客户端的 protocolVersion，声明 tools 能力，serverInfo = verify-mcp 1.0.0
//   tools/list      一个工具 echo({text}) 和一个工具 add({a,b})
//   tools/call      echo → "echo: <text>"；add → "<a+b>"
//   ping            {}
//   其他请求         -32601 Method not found；通知（无 id）忽略
import fs from 'node:fs';
import readline from 'node:readline';

const logPath = process.argv[2];
const log = (m) => { if (logPath) fs.appendFileSync(logPath, JSON.stringify(m) + '\n'); };

const TOOLS = [
  { name: 'echo', description: 'Echo the given text back, prefixed with "echo: ".',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'Text to echo' } }, required: ['text'] } },
  { name: 'add', description: 'Add two numbers.',
    inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
];

const send = (m) => process.stdout.write(JSON.stringify(m) + '\n');

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  log(msg);
  if (msg.id === undefined || msg.id === null) return; // 通知
  const ok = (result) => send({ jsonrpc: '2.0', id: msg.id, result });
  switch (msg.method) {
    case 'initialize':
      return ok({ protocolVersion: msg.params?.protocolVersion ?? '2025-06-18', capabilities: { tools: { listChanged: false } },
        serverInfo: { name: 'verify-mcp', version: '1.0.0' } });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS });
    case 'tools/call': {
      const { name, arguments: args = {} } = msg.params || {};
      if (name === 'echo') return ok({ content: [{ type: 'text', text: `echo: ${args.text}` }] });
      if (name === 'add') return ok({ content: [{ type: 'text', text: String(Number(args.a) + Number(args.b)) }] });
      return ok({ content: [{ type: 'text', text: `unknown tool ${name}` }], isError: true });
    }
    default:
      return send({ jsonrpc: '2.0', id: msg.id, error: { code: -32601, message: `Method not found: ${msg.method}` } });
  }
});
