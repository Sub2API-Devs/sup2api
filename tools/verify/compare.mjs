// 对拍：对两棵树跑同一组场景，归一化后比较 stdout / stderr / 退出码 / 假上游收到的请求 / 工作目录文件 / MCP 日志。
//
// 用法：
//   node tools/verify/compare.mjs <baseline-tree> <candidate-tree> [--name N] [--only a,b] [--jobs 3]
//   例：node tools/verify/compare.mjs original original          # 稳定性自检
//       node tools/verify/compare.mjs original runnable
// 输出：
//   analysis/verify/<name>.json   每个场景：预期检查结果、是否一致、差异列表（JSON 路径 + 两边的值）、
//                                 基线请求形状摘要、各归一化规则命中次数
//   analysis/verify/<name>.md     人类可读摘要（同时打印到 stdout）
//   <name> 默认 "<baseline>-vs-<candidate>"（路径里的 / 换成 _）。
// 退出码：所有场景一致且预期都满足 → 0，否则 1。
//
// 归一化规则见 RULES（顺序有意义），也写在 docs/process/verify.md。
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { runScenario, pool, projectRoot, bunVersion } from './run.mjs';
import { scenarios, byName } from './scenarios.mjs';

export { runScenario, pool };

// ---------------- 归一化 ----------------
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function pathVariants(p) {
  const v = new Set([p, p.replace(/\\/g, '/'), p.replace(/\\/g, '\\\\'), p.replace(/\\/g, '\\\\\\\\')]);
  v.add(p.replace(/[^a-zA-Z0-9]/g, '-')); // ~/.claude/projects/<把非字母数字换成 - 的 cwd>
  return [...v].sort((a, b) => b.length - a.length);
}

// 每条规则：[名字, 正则, 替换]；替换为函数时可以做"按出现顺序编号"
export const RULES_DOC = [
  ['path:cwd', '沙箱工作目录（含 / 、\\\\ 转义和 ~/.claude/projects 的 "-" 编码形式）→ <CWD>'],
  ['path:home', '沙箱 HOME → <HOME>'],
  ['path:tmp', '沙箱 TMP → <TMP>'],
  ['path:sandbox', '沙箱根目录 → <SANDBOX>，单独出现的 run-XXXXXX → <RUNID>'],
  ['path:tree', '被测树目录（original / runnable 的绝对路径）→ <TREE>'],
  ['path:bun', 'bun.exe 所在目录 → <BUNDIR>'],
  ['path:project', '项目根目录 → <PROJECT>'],
  ['port', '假上游端口 127.0.0.1:<port> → 127.0.0.1:<PORT>'],
  ['uuid', 'UUID（session_id、prompt id、x-client-request-id、uuid 字段…）→ <UUID-n>，按首次出现编号，保留"同值"关系'],
  ['iso-ts', 'ISO 时间戳 → <ISO-TS>'],
  ['hex64', '64 位十六进制（metadata.user_id 里的 device_id 等）→ <HEX64-n>'],
  ['epoch-ms', '13 位毫秒时间戳（快照文件名等）→ <EPOCH-MS>'],
  ['cch', '计费头 cch=xxxxx → cch=<CCH>'],
  ['cwd-file', 'Bash 工具的 cwd 记录文件 claude-<4hex>-cwd → claude-<HEX4>-cwd'],
  ['tmp-file', '原子写临时文件 .tmp.<pid>.<12hex> → .tmp.<PID>.<HEX>'],
  ['date', '"Today\'s date is YYYY-MM-DD" 与 currentDate 之类的日期 → <DATE>'],
  ['duration', 'JSON 里名字含 duration / _ms / Ms / ttft 的数值字段 → "<N>"'],
  ['cost', 'total_cost_usd / costUSD 数值不归一（假上游 usage 固定，成本应稳定）'],
  ['header:content-length', '请求头 Content-Length → <LEN>（body 本身逐字段比较）'],
  ['request:t', '请求到达时间 t、seq 不参与比较'],
  ['parallel-tool-results', '同一条 user 消息里连续的 tool_result 块（以及 stream-json 里连续的 tool_result user 事件行）按 tool_use_id 排序：并行工具按完成先后回传，顺序不确定'],
];

export function makeNormalizer(raw) {
  const hits = {};
  const hit = (k, n = 1) => { hits[k] = (hits[k] || 0) + n; };
  const sb = raw.sandbox;
  const literal = [];
  const addPath = (name, p, token) => { if (p) for (const v of pathVariants(p)) literal.push([name, new RegExp(esc(v), 'gi'), token]); };
  addPath('path:cwd', sb.work, '<CWD>');
  addPath('path:home', sb.home, '<HOME>');
  addPath('path:tmp', sb.tmp, '<TMP>');
  addPath('path:sandbox', sb.root, '<SANDBOX>');
  addPath('path:tree', sb.treeDir, '<TREE>');
  addPath('path:bun', path.dirname(sb.bun), '<BUNDIR>');
  addPath('path:project', sb.projectRoot, '<PROJECT>');
  literal.sort((a, b) => b[1].source.length - a[1].source.length);
  const runId = path.basename(sb.root);
  const ord = { uuid: new Map(), hex64: new Map() };
  const ordinal = (kind, label) => (m) => {
    const key = m.toLowerCase();
    if (!ord[kind].has(key)) ord[kind].set(key, ord[kind].size + 1);
    return `<${label}-${ord[kind].get(key)}>`;
  };
  const port = raw.upstreamUrl ? new URL(raw.upstreamUrl).port : null;
  const regex = [
    ...(port ? [['port', new RegExp(`(127\\.0\\.0\\.1|localhost):${port}\\b`, 'g'), '$1:<PORT>']] : []),
    ['path:sandbox', new RegExp(esc(runId), 'g'), '<RUNID>'],
    ['uuid', /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, ordinal('uuid', 'UUID')],
    ['iso-ts', /\b\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})\b/g, '<ISO-TS>'],
    ['hex64', /\b[0-9a-f]{64}\b/gi, ordinal('hex64', 'HEX64')],
    ['epoch-ms', /\b1[6-9]\d{11}\b/g, '<EPOCH-MS>'],
    ['cch', /\bcch=[0-9a-f]{5}\b/g, 'cch=<CCH>'],
    ['cwd-file', /\bclaude-[0-9a-f]{4}-cwd\b/g, 'claude-<HEX4>-cwd'],
    ['tmp-file', /\.tmp\.\d+\.[0-9a-f]{12}\b/g, '.tmp.<PID>.<HEX>'],
    ['date', /(Today's date is |"currentDate"\s*:\s*"|currentDate: )\d{4}-\d{2}-\d{2}/g, '$1<DATE>'],
    ['duration', /("[A-Za-z_]*(?:duration|Duration|_ms|Ms|ttft)[A-Za-z_]*"\s*:\s*)-?\d+(?:\.\d+)?/g, '$1"<N>"'],
  ];
  const str = (s) => {
    if (typeof s !== 'string') return s;
    let out = s;
    for (const [name, re, rep] of [...literal, ...regex]) {
      out = out.replace(re, (...m) => {
        hit(name);
        if (typeof rep === 'function') return rep(m[0]);
        return rep.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
      });
    }
    return out;
  };
  const deep = (v, key) => {
    if (typeof v === 'string') return str(v);
    if (typeof v === 'number' && key && /duration|_ms$|Ms$|ttft/i.test(key)) { hit('duration'); return '<N>'; }
    if (Array.isArray(v)) return v.map((x) => deep(x));
    if (v && typeof v === 'object') {
      const o = {};
      for (const [k, x] of Object.entries(v)) o[str(k)] = deep(x, k);
      return o;
    }
    return v;
  };
  return { str, deep, hits };
}

// 并行工具的 tool_result 按完成先后排列（实测两次运行顺序不同），比较前按 tool_use_id 排序。
// 在其余归一化之前做，保证 UUID 编号的遍历顺序稳定。
const isToolResultLine = (l) => { try { const e = JSON.parse(l); const c = e?.message?.content; return e.type === 'user' && Array.isArray(c) && c.length > 0 && c.every((b) => b.type === 'tool_result') ? c[0].tool_use_id : null; } catch { return null; } };
function sortParallelToolResults(raw, hit) {
  const sortRun = (arr, keyOf) => {
    const out = [...arr];
    for (let i = 0; i < out.length;) {
      if (keyOf(out[i]) == null) { i++; continue; }
      let j = i; while (j < out.length && keyOf(out[j]) != null) j++;
      if (j - i > 1) {
        const run = out.slice(i, j), sorted = [...run].sort((a, b) => String(keyOf(a)).localeCompare(String(keyOf(b))));
        if (sorted.some((x, k) => x !== run[k])) hit('parallel-tool-results');
        out.splice(i, j - i, ...sorted);
      }
      i = j;
    }
    return out;
  };
  const fixBody = (b) => {
    if (!b || typeof b !== 'object' || !Array.isArray(b.messages)) return b;
    // cache_control 断点打在消息的最后一个块上，与位置绑定，不随块移动
    const fixContent = (content) => {
      const sorted = sortRun(content, (c) => (c?.type === 'tool_result' ? c.tool_use_id : null));
      if (sorted.every((x, k) => x === content[k])) return content;
      return sorted.map((x, k) => {
        const { cache_control: _drop, ...rest } = x;
        return 'cache_control' in content[k] ? { ...rest, cache_control: content[k].cache_control } : rest;
      });
    };
    return { ...b, messages: b.messages.map((m) => (m.role === 'user' && Array.isArray(m.content) ? { ...m, content: fixContent(m.content) } : m)) };
  };
  const fixText = (t) => (typeof t === 'string' ? sortRun(t.split('\n'), isToolResultLine).join('\n') : t);
  return { ...raw, stdout: fixText(raw.stdout), requests: raw.requests.map((q) => ({ ...q, body: fixBody(q.body) })),
    steps: raw.steps?.map((x) => ({ ...x, stdout: fixText(x.stdout) })) };
}

export function normalizeResult(raw0) {
  const n = makeNormalizer(raw0);
  const raw = sortParallelToolResults(raw0, (k) => { n.hits[k] = (n.hits[k] || 0) + 1; });
  const req = (q) => ({
    kind: q.kind, method: q.method, url: n.str(q.url),
    headers: q.rawHeaders.map(([k, v]) => {
      if (/^content-length$/i.test(k)) { n.hits['header:content-length'] = (n.hits['header:content-length'] || 0) + 1; return [k, '<LEN>']; }
      return [k, n.str(v)];
    }),
    body: n.deep(q.body),
    response: q.response && { status: q.response.status, step: q.response.step },
  });
  const out = {
    exitCode: raw.exitCode, signal: raw.signal, timedOut: raw.timedOut,
    stdout: n.str(raw.stdout), stderr: n.str(raw.stderr),
    steps: raw.steps?.map((s) => ({ args: n.deep(s.args), exitCode: s.exitCode, timedOut: s.timedOut, stdout: n.str(s.stdout), stderr: n.str(s.stderr) })),
    requests: raw.requests.map(req),
    files: n.deep(raw.files),
    collected: n.deep(raw.collected),
  };
  return { norm: out, hits: n.hits };
}

// ---------------- 比较 ----------------
export function diff(a, b, p = '$', out = [], limit = 40) {
  if (out.length >= limit) return out;
  if (Object.is(a, b)) return out;
  const ta = Array.isArray(a) ? 'array' : typeof a, tb = Array.isArray(b) ? 'array' : typeof b;
  if (ta !== tb || a === null || b === null || (ta !== 'object' && ta !== 'array')) {
    if (typeof a === 'string' && typeof b === 'string') {
      // 文本：报告第一处不同的行
      const la = a.split('\n'), lb = b.split('\n');
      let i = 0; while (i < la.length && i < lb.length && la[i] === lb[i]) i++;
      out.push({ path: p, line: i + 1, a: clip(la[i]), b: clip(lb[i]), lenA: a.length, lenB: b.length });
    } else out.push({ path: p, a: clip(a), b: clip(b) });
    return out;
  }
  if (ta === 'array') {
    if (a.length !== b.length) out.push({ path: `${p}.length`, a: a.length, b: b.length });
    for (let i = 0; i < Math.min(a.length, b.length); i++) diff(a[i], b[i], `${p}[${i}]`, out, limit);
    return out;
  }
  const ka = Object.keys(a), kb = Object.keys(b);
  if (ka.join('\0') !== kb.join('\0')) {
    const onlyA = ka.filter((k) => !(k in b)), onlyB = kb.filter((k) => !(k in a));
    out.push({ path: `${p}{keys}`, onlyA, onlyB, orderDiffers: !onlyA.length && !onlyB.length });
  }
  for (const k of ka) if (k in b) diff(a[k], b[k], `${p}.${k}`, out, limit);
  return out;
}
const clip = (v) => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s === undefined ? s : s.length > 400 ? s.slice(0, 400) + `…(${s.length})` : s; };
const sha = (v) => crypto.createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v ?? null)).digest('hex').slice(0, 16);

// 基线请求形状摘要（写进报告，便于阅读请求头和请求体的形状）
function shapeOf(norm) {
  return norm.requests.map((q) => {
    const b = q.body && typeof q.body === 'object' ? q.body : null;
    return {
      kind: q.kind, method: q.method, url: q.url, status: q.response?.status,
      headers: q.headers.map(([k, v]) => `${k}: ${v.length > 160 ? v.slice(0, 160) + '…' : v}`),
      bodyKeys: b ? Object.keys(b) : null,
      model: b?.model, max_tokens: b?.max_tokens, stream: b?.stream, thinking: b?.thinking, output_config: b?.output_config,
      context_management: b?.context_management, metadata: b?.metadata, diagnostics: b?.diagnostics,
      system: b?.system?.map?.((s) => ({ len: s.text?.length, cache_control: s.cache_control, head: s.text?.slice(0, 120) })),
      tools: b?.tools?.map((t) => t.name),
      messages: b?.messages?.map((m) => ({ role: m.role, blocks: Array.isArray(m.content) ? m.content.map((c) => c.type) : typeof m.content })),
      bodySha: b ? sha(b) : null,
    };
  });
}

function check(s, raw) { try { return s.expect ? s.expect(raw) : []; } catch (e) { return [`expect threw: ${e.message}`]; } }

export async function compareTrees(baseline, candidate, { only, jobs = 3, name } = {}) {
  const list = byName(only);
  const rows = [];
  const started = Date.now();
  await pool(list, jobs, async (s) => {
    const [ra, rb] = await Promise.all([runScenario(baseline, s), runScenario(candidate, s)]);
    const na = normalizeResult(ra), nb = normalizeResult(rb);
    const diffs = diff(na.norm, nb.norm);
    const rawDiffCount = diff(rawView(ra), rawView(rb), '$', [], 1000).length;
    const row = {
      name: s.name, desc: s.desc,
      equal: diffs.length === 0,
      baseline: summary(ra, check(s, ra)), candidate: summary(rb, check(s, rb)),
      diffs, rawDiffCount, normalizationHits: na.hits,
      shape: shapeOf(na.norm),
      stdoutHead: na.norm.stdout.slice(0, 1500), stderrHead: na.norm.stderr.slice(0, 1500),
      steps: na.norm.steps?.map((x) => ({ args: x.args, exitCode: x.exitCode, stdout: x.stdout.slice(0, 500), stderr: x.stderr.slice(0, 500) })),
      collected: na.norm.collected,
    };
    rows.push(row);
    const ok = row.equal && !row.baseline.problems.length && !row.candidate.problems.length;
    console.error(`${ok ? 'OK  ' : 'DIFF'} ${s.name} (${row.baseline.durationMs}/${row.candidate.durationMs} ms)` +
      (row.equal ? '' : ` ${diffs.length} diffs, first ${diffs[0].path}`) +
      (row.baseline.problems.length ? ` | baseline expect: ${row.baseline.problems.join('; ')}` : '') +
      (row.candidate.problems.length ? ` | candidate expect: ${row.candidate.problems.join('; ')}` : ''));
  });
  rows.sort((a, b) => list.findIndex((s) => s.name === a.name) - list.findIndex((s) => s.name === b.name));
  return {
    name, baseline, candidate, date: new Date().toISOString(), wallMs: Date.now() - started,
    bun: bunVersion(), node: process.version, platform: `${process.platform}-${process.arch}`,
    rules: RULES_DOC.map(([k, d]) => ({ rule: k, desc: d })),
    totals: {
      scenarios: rows.length, equal: rows.filter((r) => r.equal).length,
      baselinePass: rows.filter((r) => !r.baseline.problems.length).length,
      candidatePass: rows.filter((r) => !r.candidate.problems.length).length,
      ruleHits: rows.reduce((acc, r) => { for (const [k, v] of Object.entries(r.normalizationHits)) acc[k] = (acc[k] || 0) + v; return acc; }, {}),
      scenariosNeedingNormalization: rows.filter((r) => r.rawDiffCount > 0).map((r) => r.name),
    },
    scenarios: rows,
  };
}

// 未归一化的视图，用来证明哪些场景"不归一化就不一致"
function rawView(r) {
  return { exitCode: r.exitCode, stdout: r.stdout, stderr: r.stderr, steps: r.steps?.map((s) => [s.exitCode, s.stdout, s.stderr]),
    requests: r.requests.map((q) => [q.method, q.url, q.rawHeaders, q.body]), files: r.files, collected: r.collected };
}

function summary(r, problems) {
  return { exitCode: r.exitCode, timedOut: r.timedOut, durationMs: r.durationMs,
    apiRequests: r.requests.filter((q) => q.kind === 'api').length, externalRequests: r.requests.filter((q) => q.kind !== 'api').map((q) => `${q.method} ${q.url}`),
    leaks: r.leaks, hostWarnings: r.hostWarnings, problems };
}

export function renderMarkdown(rep) {
  const L = [];
  L.push(`# 对拍：${rep.baseline} vs ${rep.candidate}`, '');
  L.push(`- 时间：${rep.date}，耗时 ${(rep.wallMs / 1000).toFixed(0)} s`);
  L.push(`- 运行时：bun ${rep.bun}，node ${rep.node}，${rep.platform}`);
  L.push(`- 场景：${rep.totals.scenarios}；归一化后一致：${rep.totals.equal}；预期满足：基线 ${rep.totals.baselinePass}，候选 ${rep.totals.candidatePass}`);
  L.push(`- 不归一化就会不一致的场景：${rep.totals.scenariosNeedingNormalization.length}（${rep.totals.scenariosNeedingNormalization.join(', ') || '无'}）`);
  L.push(`- 归一化规则命中次数：${Object.entries(rep.totals.ruleHits).map(([k, v]) => `${k}=${v}`).join('，') || '无'}`, '');
  L.push('| 场景 | 一致 | 基线预期 | 候选预期 | 退出码 | API 请求 | 外网请求 | 耗时 ms |', '|---|---|---|---|---|---|---|---|');
  for (const r of rep.scenarios) {
    L.push(`| ${r.name} | ${r.equal ? '是' : `**否**（${r.diffs.length}）`} | ${r.baseline.problems.length ? '**' + r.baseline.problems.join('; ').replace(/\|/g, '\\|') + '**' : '满足'} | ${r.candidate.problems.length ? '**' + r.candidate.problems.join('; ').replace(/\|/g, '\\|') + '**' : '满足'} | ${r.baseline.exitCode}/${r.candidate.exitCode} | ${r.baseline.apiRequests}/${r.candidate.apiRequests} | ${r.baseline.externalRequests.length}/${r.candidate.externalRequests.length} | ${r.baseline.durationMs}/${r.candidate.durationMs} |`);
  }
  const bad = rep.scenarios.filter((r) => !r.equal);
  if (bad.length) {
    L.push('', '## 差异（每个场景最多列 10 条）', '');
    for (const r of bad) {
      L.push(`### ${r.name}`, '');
      for (const d of r.diffs.slice(0, 10)) L.push(`- \`${d.path}\`${d.line ? ` 第 ${d.line} 行` : ''}：${'a' in d ? `\`${String(d.a).replace(/`/g, "'")}\` → \`${String(d.b).replace(/`/g, "'")}\`` : JSON.stringify(d)}`);
      L.push('');
    }
  }
  L.push('', '## 场景说明', '');
  for (const r of rep.scenarios) L.push(`- **${r.name}**：${r.desc}`);
  return L.join('\n') + '\n';
}

// ---------------- 命令行 ----------------
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const argv = process.argv.slice(2);
  const opt = (k) => (argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined);
  const pos = argv.filter((a, i) => !a.startsWith('--') && !['--only', '--jobs', '--name'].includes(argv[i - 1]));
  if (pos.length < 2) { console.error('用法: node tools/verify/compare.mjs <baseline-tree> <candidate-tree> [--name N] [--only a,b] [--jobs 3]'); process.exit(2); }
  const [baseline, candidate] = pos;
  const name = opt('--name') || `${baseline}-vs-${candidate}`.replace(/[\\/:]+/g, '_');
  const rep = await compareTrees(baseline, candidate, { only: opt('--only')?.split(','), jobs: Number(opt('--jobs') || 3), name });
  const dir = path.join(projectRoot, 'analysis', 'verify');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(rep, null, 2) + '\n');
  const md = renderMarkdown(rep);
  fs.writeFileSync(path.join(dir, `${name}.md`), md);
  process.stdout.write(md);
  console.error(`\n写出 analysis/verify/${name}.json 与 .md`);
  const ok = rep.scenarios.every((r) => r.equal && !r.baseline.problems.length && !r.candidate.problems.length);
  process.exitCode = ok ? 0 : 1;
}
