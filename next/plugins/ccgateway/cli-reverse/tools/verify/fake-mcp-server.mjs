// 最小的 stdio MCP 服务器（换行分隔的 JSON-RPC 2.0），供离线 MCP 场景使用。
//
// 用法：node tools/verify/fake-mcp-server.mjs [<log.jsonl>] [--full] [--exit-on-start]
//   CLI 通过 --mcp-config '{"mcpServers":{"verify":{"type":"stdio","command":"node","args":["<本文件>","<log>"]}}}' 启动它。
//   收到的每条消息追加写入 <log.jsonl>（场景结束后读取，用于检查握手形状）。
//   不带选项时行为与第一轮完全相同（只有 tools 能力、echo / add 两个工具），现有场景不受影响。
//   --full           （scenarios 成员加）额外声明 resources 与 prompts 能力，并多一个总是失败的工具 fail：
//                      resources/list       两个资源 verify://notes/readme（text/plain）、verify://data/config.json（application/json）
//                      resources/read       按 uri 回固定文本；未知 uri 回 -32002 Resource not found
//                      resources/templates/list  空列表
//                      prompts/list         一个提示词 greet（参数 name，必填）
//                      prompts/get          greet → 一条 user 消息 "Please greet <name> warmly. VERIFY-MCP-PROMPT"
//                      tools/call fail      isError=true，文本 "verify-mcp: tool failed on purpose"
//   --exit-on-start  （scenarios 成员加）启动后往 stderr 写一行再以退出码 3 退出，用来测连接失败
//
// 能力：
//   initialize      回显客户端的 protocolVersion，声明 tools 能力（--full 时再加 resources、prompts），serverInfo = verify-mcp 1.0.0
//   tools/list      一个工具 echo({text}) 和一个工具 add({a,b})（--full 时再加 fail({})）
//   tools/call      echo → "echo: <text>"；add → "<a+b>"
//   ping            {}
//   其他请求         -32601 Method not found；通知（无 id）忽略
import fs from 'node:fs';
import readline from 'node:readline';

const argv = process.argv.slice(2);
const logPath = argv[0] && !argv[0].startsWith('--') ? argv[0] : undefined;
const FULL = argv.includes('--full');
const log = (m) => { if (logPath) fs.appendFileSync(logPath, JSON.stringify(m) + '\n'); };

if (argv.includes('--exit-on-start')) {
  log({ event: 'exit-on-start' });
  process.stderr.write('verify-mcp: exiting on start (exit 3)\n');
  process.exit(3);
}

const TOOLS = [
  { name: 'echo', description: 'Echo the given text back, prefixed with "echo: ".',
    inputSchema: { type: 'object', properties: { text: { type: 'string', description: 'Text to echo' } }, required: ['text'] } },
  { name: 'add', description: 'Add two numbers.',
    inputSchema: { type: 'object', properties: { a: { type: 'number' }, b: { type: 'number' } }, required: ['a', 'b'] } },
  ...(FULL ? [{ name: 'fail', description: 'Always fails (verify error path).', inputSchema: { type: 'object', properties: {} } }] : []),
];
const RESOURCES = [
  { uri: 'verify://notes/readme', name: 'readme', description: 'Verify readme note', mimeType: 'text/plain' },
  { uri: 'verify://data/config.json', name: 'config', description: 'Verify JSON config', mimeType: 'application/json' },
];
const RESOURCE_TEXT = {
  'verify://notes/readme': 'VERIFY-MCP-RESOURCE: readme body line 1\nline 2\n',
  'verify://data/config.json': '{"verify":true,"items":[1,2,3]}',
};
const PROMPTS = [
  { name: 'greet', description: 'Greet someone (verify prompt)', arguments: [{ name: 'name', description: 'Who to greet', required: true }] },
];

const send = (m) => process.stdout.write(JSON.stringify(m) + '\n');

readline.createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch { return; }
  log(msg);
  if (msg.id === undefined || msg.id === null) return; // 通知
  const ok = (result) => send({ jsonrpc: '2.0', id: msg.id, result });
  const fail = (code, message) => send({ jsonrpc: '2.0', id: msg.id, error: { code, message } });
  switch (msg.method) {
    case 'initialize':
      return ok({ protocolVersion: msg.params?.protocolVersion ?? '2025-06-18',
        capabilities: FULL ? { tools: { listChanged: false }, resources: { listChanged: false }, prompts: { listChanged: false } } : { tools: { listChanged: false } },
        serverInfo: { name: 'verify-mcp', version: '1.0.0' } });
    case 'ping':
      return ok({});
    case 'tools/list':
      return ok({ tools: TOOLS });
    case 'tools/call': {
      const { name, arguments: args = {} } = msg.params || {};
      if (name === 'echo') return ok({ content: [{ type: 'text', text: `echo: ${args.text}` }] });
      if (name === 'add') return ok({ content: [{ type: 'text', text: String(Number(args.a) + Number(args.b)) }] });
      if (FULL && name === 'fail') return ok({ content: [{ type: 'text', text: 'verify-mcp: tool failed on purpose' }], isError: true });
      return ok({ content: [{ type: 'text', text: `unknown tool ${name}` }], isError: true });
    }
    case 'resources/list':
      if (!FULL) break;
      return ok({ resources: RESOURCES });
    case 'resources/templates/list':
      if (!FULL) break;
      return ok({ resourceTemplates: [] });
    case 'resources/read': {
      if (!FULL) break;
      const uri = msg.params?.uri;
      if (!(uri in RESOURCE_TEXT)) return fail(-32002, `Resource not found: ${uri}`);
      const r = RESOURCES.find((x) => x.uri === uri);
      return ok({ contents: [{ uri, mimeType: r.mimeType, text: RESOURCE_TEXT[uri] }] });
    }
    case 'prompts/list':
      if (!FULL) break;
      return ok({ prompts: PROMPTS });
    case 'prompts/get': {
      if (!FULL) break;
      const { name, arguments: args = {} } = msg.params || {};
      if (name !== 'greet') return fail(-32602, `Unknown prompt: ${name}`);
      return ok({ description: 'Greet someone', messages: [{ role: 'user', content: { type: 'text', text: `Please greet ${args.name} warmly. VERIFY-MCP-PROMPT` } }] });
    }
    default:
      break;
  }
  return fail(-32601, `Method not found: ${msg.method}`);
});
