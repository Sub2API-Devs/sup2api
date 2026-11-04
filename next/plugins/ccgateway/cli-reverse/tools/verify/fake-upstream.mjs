// 本地假 Anthropic Messages API + 黑洞代理。只监听 127.0.0.1，不连任何真实上游。
//
// 用法（库）：
//   import { startFakeUpstream } from './fake-upstream.mjs';
//   const up = await startFakeUpstream({ script, ctx });   // up.url = http://127.0.0.1:<port>
//   ...  ANTHROPIC_BASE_URL=up.url, HTTPS_PROXY=HTTP_PROXY=up.url（黑洞代理）
//   up.requests  // 收到的全部请求（含被代理拦下的 CONNECT），按到达顺序
//   await up.close();
//
// 用法（独立运行，手工调试）：
//   node tools/verify/fake-upstream.mjs [--port 8787] [--reply "文本"]
//   收到的请求逐条以 JSON 打到 stdout。
//
// 行为：
//   POST /v1/messages              按 script 回答；body.stream=true 时用 SSE，否则返回 JSON。
//   POST /v1/messages/count_tokens 固定 {input_tokens: 42}
//   CONNECT host:port / 绝对 URL    作为 HTTP(S)_PROXY 时收到的外网请求：记录后回 403，不转发。
//   其他路径                         记录后回 404（Anthropic 错误形状）。
//
// script 形状（全部可选）：
//   {
//     steps: [step0, step1, ...],   // 主循环请求（body.tools 非空）按 messages 里 assistant 消息个数选 step
//     final: '最终文本',            // steps 用完后的回答
//     side:  '旁路请求的回答',       // 没有 tools 的请求（标题生成、分类等）
//     error: { status, type, message }  // 设置后对 /v1/messages 一律回这个错误（测试错误处理）
//   }
//   step = { text?: '前置文本', tools?: [{ name, input }] }   input 可以是函数 (ctx) => object
//   以下为 scenarios 成员加的可选字段（不写时行为与之前完全相同）：
//     side: 也可以是函数 (body) => 文本，按旁路请求内容回答（例如让自动模式分类器按动作回 <severity>N</severity>）
//     routes: [{ match: '子串', steps, final }]  请求的 system 或第一条 user 消息里含 match 时改用这一组 steps/final
//             （例如子代理：它的系统提示词含自定义代理的 prompt；第一个命中的生效）；记录里 response.route = 下标
//     step.delayMs / finalDelayMs  回答前等待的毫秒数（SSE 与 JSON 都适用；用来测 Esc 中断）。连接先关闭（CLI 中断、
//             close()）时取消，不再写回答
//   无状态：同样的请求永远得到同样的回答，id 由请求序号之外的内容决定（msg_/toolu_ 按 step 下标编号），
//   这样同一场景两次运行时 CLI 回传的 tool_use id 相同，便于对拍。
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export async function startFakeUpstream({ script = {}, ctx = {}, port = 0, onRequest } = {}) {
  const requests = [];
  const t0 = Date.now();
  const sockets = new Set();

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      let body = raw;
      if (raw && /json/i.test(req.headers['content-type'] || '')) {
        try { body = JSON.parse(raw); } catch { /* 原样保留 */ }
      }
      const rec = {
        seq: requests.length,
        t: Date.now() - t0,
        kind: /^https?:\/\//i.test(req.url) ? 'proxy-http' : 'api',
        method: req.method,
        url: req.url,
        rawHeaders: pairs(req.rawHeaders),
        body,
        response: null,
      };
      requests.push(rec);
      onRequest?.(rec);
      try {
        handle(rec, req, res);
      } catch (e) {
        rec.response = { status: 500, error: String(e?.stack || e) };
        res.writeHead(500, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ type: 'error', error: { type: 'api_error', message: 'fake upstream crashed' } }));
      }
    });
  });

  // 作为 HTTPS_PROXY：任何 CONNECT 都是想连外网，记录后拒绝。
  server.on('connect', (req, socket) => {
    const rec = { seq: requests.length, t: Date.now() - t0, kind: 'proxy-connect', method: 'CONNECT',
      url: req.url, rawHeaders: pairs(req.rawHeaders), body: null, response: { status: 403 } };
    requests.push(rec);
    onRequest?.(rec);
    socket.on('error', () => {});
    socket.end('HTTP/1.1 403 Forbidden\r\ncontent-length: 0\r\nconnection: close\r\n\r\n');
  });
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });

  function handle(rec, req, res) {
    if (rec.kind === 'proxy-http') {
      rec.response = { status: 403 };
      res.writeHead(403, { 'content-type': 'text/plain' });
      return res.end('blocked by verify fake upstream');
    }
    const path = req.url.split('?')[0];
    if (req.method === 'POST' && path === '/v1/messages/count_tokens') {
      rec.response = { status: 200 };
      return json(res, 200, { input_tokens: 42 });
    }
    if (req.method === 'POST' && path === '/v1/messages' && script.error) {
      const e = script.error;
      rec.response = { status: e.status, error: e.type };
      return json(res, e.status, { type: 'error', error: { type: e.type, message: e.message } }, { 'request-id': 'req_fake_error' });
    }
    if (req.method === 'POST' && path === '/v1/messages' && rec.body && typeof rec.body === 'object') {
      const plan = planReply(script, ctx, rec.body);
      rec.response = { status: 200, stream: !!rec.body.stream, step: plan.step, content: plan.content, stop_reason: plan.stop_reason };
      const msg = { id: plan.id, type: 'message', role: 'assistant', model: rec.body.model || 'claude-fake',
        content: plan.content, stop_reason: plan.stop_reason, stop_sequence: null, usage: usage(plan) };
      if (plan.route !== undefined) rec.response.route = plan.route;
      const go = () => {
        if (!rec.body.stream) return json(res, 200, msg, { 'request-id': `req_fake_${plan.id}` });
        return sse(res, msg);
      };
      if (plan.delayMs) {
        const timer = setTimeout(go, plan.delayMs);
        res.on('close', () => clearTimeout(timer));
        return;
      }
      return go();
    }
    rec.response = { status: 404 };
    return json(res, 404, { type: 'error', error: { type: 'not_found_error', message: `fake upstream: no route for ${req.method} ${path}` } });
  }

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', resolve);
  });
  const url = `http://127.0.0.1:${server.address().port}`;
  return {
    url,
    port: server.address().port,
    requests,
    close: () => new Promise((resolve) => {
      for (const s of sockets) s.destroy();
      server.close(() => resolve());
    }),
  };
}

// 决定回答。主循环请求：step 下标 = 请求里 assistant 消息的个数。
// script.routes 里第一个 match 命中（system 或第一条 user 消息含该子串）的 route 代替顶层 steps/final；
// route 的 id 带 r<下标> 前缀（msg_fake_r0_1、toolu_fake_r0_1_0），与主循环区分。
export function planReply(script, ctx, body) {
  const hasTools = Array.isArray(body.tools) && body.tools.length > 0;
  const assistantTurns = (body.messages || []).filter((m) => m.role === 'assistant').length;
  if (!hasTools) {
    const text = typeof script.side === 'function' ? script.side(body) : (script.side ?? 'OK');
    return { id: `msg_fake_side_${assistantTurns}`, step: 'side', content: [{ type: 'text', text }], stop_reason: 'end_turn' };
  }
  let plan = script, pre = '', route;
  if (Array.isArray(script.routes) && script.routes.length) {
    const firstUser = (body.messages || []).find((m) => m.role === 'user');
    const hay = JSON.stringify(body.system ?? '') + JSON.stringify(firstUser?.content ?? '');
    const k = script.routes.findIndex((r) => hay.includes(r.match));
    if (k >= 0) { plan = script.routes[k]; pre = `r${k}_`; route = k; }
  }
  const steps = plan.steps || [];
  if (assistantTurns < steps.length) {
    const s = steps[assistantTurns];
    const content = [];
    if (s.text) content.push({ type: 'text', text: s.text });
    (s.tools || []).forEach((t, i) => {
      const input = typeof t.input === 'function' ? t.input(ctx) : t.input;
      content.push({ type: 'tool_use', id: `toolu_fake_${pre}${assistantTurns}_${i}`, name: t.name, input });
    });
    return { id: `msg_fake_${pre}${assistantTurns}`, step: assistantTurns, route, content, delayMs: s.delayMs,
      stop_reason: s.tools?.length ? 'tool_use' : 'end_turn' };
  }
  const text = plan.final ?? 'Hello from the fake upstream.';
  return { id: `msg_fake_${pre}${assistantTurns}`, step: 'final', route, content: [{ type: 'text', text }], stop_reason: 'end_turn',
    delayMs: plan.finalDelayMs };
}

function usage(plan) {
  const out = plan.content.reduce((n, c) => n + (c.text?.length || JSON.stringify(c.input || {}).length), 0);
  return { input_tokens: 100, cache_creation_input_tokens: 0, cache_read_input_tokens: 0,
    output_tokens: Math.max(1, Math.ceil(out / 4)), service_tier: 'standard' };
}

function sse(res, msg) {
  res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache',
    'request-id': `req_fake_${msg.id}`, connection: 'keep-alive' });
  const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('message_start', { type: 'message_start', message: { ...msg, content: [], stop_reason: null,
    usage: { ...msg.usage, output_tokens: 1 } } });
  msg.content.forEach((block, index) => {
    if (block.type === 'text') {
      send('content_block_start', { type: 'content_block_start', index, content_block: { type: 'text', text: '' } });
      // 分两段发，覆盖增量拼接逻辑
      const mid = Math.ceil(block.text.length / 2);
      for (const part of [block.text.slice(0, mid), block.text.slice(mid)]) {
        if (part) send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'text_delta', text: part } });
      }
    } else if (block.type === 'tool_use') {
      send('content_block_start', { type: 'content_block_start', index,
        content_block: { type: 'tool_use', id: block.id, name: block.name, input: {} } });
      const j = JSON.stringify(block.input);
      const mid = Math.ceil(j.length / 2);
      for (const part of [j.slice(0, mid), j.slice(mid)]) {
        if (part) send('content_block_delta', { type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: part } });
      }
    }
    send('content_block_stop', { type: 'content_block_stop', index });
  });
  send('message_delta', { type: 'message_delta', delta: { stop_reason: msg.stop_reason, stop_sequence: null },
    usage: { output_tokens: msg.usage.output_tokens } });
  send('message_stop', { type: 'message_stop' });
  res.end();
}

function json(res, status, obj, headers = {}) {
  const s = JSON.stringify(obj);
  res.writeHead(status, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(s), ...headers });
  res.end(s);
}

function pairs(raw) {
  const out = [];
  for (let i = 0; i < raw.length; i += 2) out.push([raw[i], raw[i + 1]]);
  return out;
}

// 独立运行
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  const opt = (k, d) => (a.includes(k) ? a[a.indexOf(k) + 1] : d);
  const up = await startFakeUpstream({ port: Number(opt('--port', 8787)), script: { final: opt('--reply', 'Hello from the fake upstream.') },
    onRequest: (r) => console.log(JSON.stringify(r)) });
  console.error(`fake upstream listening on ${up.url}  (Ctrl+C 退出)`);
}
