/**
 * services/pluginEval/mocks/mockRelayProtocol.ts
 *
 * 2.1.316 新增：plugin eval 模拟中继的消息格式（hit/miss、fixed/agent）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qchp9vrd.js (5)
 * attribution: placement 5
 */
import { DoctorLazy } from "../../../cli/handlers/util.js";
import { u, o, E, U, oe } from "../../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { openNoFollow_2 } from "../../../utils/fsSafety/hardenedRead.js";

//@ chunk-qchp9vrd.js:118449-118653 placement
var MockCallLogEntrySchema = DoctorLazy(() =>
    u({
      nonce: o(),
      seq: E(),
      replay: U(["hit", "miss"]).optional(),
      server: o(),
      tool: o(),
      responder: U(["fixed", "agent"]),
      input: oe(),
      verdict: U(["ok", "tool_error", "abort"]),
      output: o(),
      ms: E(),
    }),
  ),
  ko = 16777216;
/**
 * 读取模拟中继的调用日志，只保留指定 nonce 的有效记录（并返回是否截断）。
 */
//@ chunk-qchp9vrd.js:118653-118882 placement
async function readMockCallLog(e, n) {
  let { text: text, truncated: truncated } = await readFileHead(e),
    s = [];
  for (let h of text.split(`
`)) {
    if (!h.trim()) continue;
    try {
      let safeParse = MockCallLogEntrySchema().safeParse(jsonParse(h));
      if (safeParse.success && safeParse.data.nonce === n) s.push(safeParse.data);
    } catch {}
  }
  return { records: s, truncated: truncated };
}
/**
 * 从模拟中继日志中读取已就绪的模拟服务器名。
 */
//@ chunk-qchp9vrd.js:118882-119103 placement
async function readReadyMockServers(e, n) {
  let r = new Set(),
    { text: text } = await readFileHead(e);
  for (let s of text.split(`
`)) {
    if (!s.includes('"ready"')) continue;
    try {
      let safeParse = Zd().safeParse(jsonParse(s));
      if (safeParse.success && safeParse.data.ready === n) r.add(safeParse.data.server);
    } catch {}
  }
  return r;
}
//@ chunk-qchp9vrd.js:119103-119143 placement
var Zd = DoctorLazy(() => u({ ready: o(), server: o() }));
/**
 * 不跟随链接地打开文件，只读取前若干字节（上限 ko）为文本，返回 {text, truncated}；失败返回空文本。
 */
//@ chunk-qchp9vrd.js:119143-119534 placement
async function readFileHead(e) {
  let n = { text: "", truncated: !1 },
    r = await openNoFollow_2(e);
  if (!r.ok) return n;
  let a = r.value;
  try {
    let stats = await a.stat();
    if (!stats.isFile()) return n;
    let min = Math.min(stats.size, ko),
      alloc = Buffer.alloc(min),
      b = 0;
    while (b < min) {
      let { bytesRead: bytesRead } = await a.read({ buffer: alloc, offset: b, position: b });
      if (bytesRead <= 0) break;
      b += bytesRead;
    }
    return { text: alloc.subarray(0, b).toString("utf8"), truncated: stats.size > ko };
  } catch {
    return n;
  } finally {
    await a.close();
  }
}

export { readMockCallLog, readReadyMockServers, ko };
