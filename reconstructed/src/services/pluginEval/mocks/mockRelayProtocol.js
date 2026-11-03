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
import { u, string, E, _enum, unknown } from "../../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { openNoFollow_2 } from "../../../utils/fsSafety/hardenedRead.js";

//@ chunk-qchp9vrd.js:118449-118653 placement
/**
 * 模拟中继日志的最大字节数（16 MiB）。
 */
var MockCallLogEntrySchema = DoctorLazy(() =>
  u({
    nonce: string(),
    seq: E(),
    replay: _enum(["hit", "miss"]).optional(),
    server: string(),
    tool: string(),
    responder: _enum(["fixed", "agent"]),
    input: unknown(),
    verdict: _enum(["ok", "tool_error", "abort"]),
    output: string(),
    ms: E(),
  }),
);
var MAX_RELAY_LOG_BYTES = 16777216;
//@ chunk-qchp9vrd.js:118653-118882 placement
/**
 * 读取模拟中继的调用日志，只保留指定 nonce 的有效记录（并返回是否截断）。
 */
async function readMockCallLog(callLogPath, nonce) {
  let { text, truncated } = await readFileHead(callLogPath);
  let s = [];
  for (let line of text.split(`
`)) {
    if (!line.trim()) continue;
    try {
      let w = MockCallLogEntrySchema().safeParse(jsonParse(line));
      if (w.success && w.data.nonce === nonce) s.push(w.data);
    } catch {}
  }
  return {
    records: s,
    truncated,
  };
}
//@ chunk-qchp9vrd.js:118882-119103 placement
/**
 * 从模拟中继日志中读取已就绪的模拟服务器名。
 */
async function readReadyMockServers(callLogPath, nonce) {
  let r = new Set();
  let { text } = await readFileHead(callLogPath);
  for (let line of text.split(`
`)) {
    if (!line.includes('"ready"')) continue;
    try {
      let h = readyServerSchema().safeParse(jsonParse(line));
      if (h.success && h.data.ready === nonce) r.add(h.data.server);
    } catch {}
  }
  return r;
}
//@ chunk-qchp9vrd.js:119103-119143 placement
/**
 * “就绪服务器”消息的 schema。
 */
var readyServerSchema = DoctorLazy(() =>
  u({
    ready: string(),
    server: string(),
  }),
);
//@ chunk-qchp9vrd.js:119143-119534 placement
/**
 * 不跟随链接地打开文件，只读取前若干字节（上限 ko）为文本，返回 {text, truncated}；失败返回空文本。
 */
async function readFileHead(e) {
  let n = {
    text: "",
    truncated: false,
  };
  let noFollow = await openNoFollow_2(e);
  if (!noFollow.ok) return n;
  let a = noFollow.value;
  try {
    let stats = await a.stat();
    if (!stats.isFile()) return n;
    let min = Math.min(stats.size, MAX_RELAY_LOG_BYTES);
    let w = Buffer.alloc(min);
    let b = 0;
    while (b < min) {
      let { bytesRead } = await a.read({
        buffer: w,
        offset: b,
        position: b,
      });
      if (bytesRead <= 0) break;
      b += bytesRead;
    }
    return {
      text: w.subarray(0, b).toString("utf8"),
      truncated: stats.size > MAX_RELAY_LOG_BYTES,
    };
  } catch {
    return n;
  } finally {
    await a.close();
  }
}
export { readMockCallLog, readReadyMockServers, MAX_RELAY_LOG_BYTES };
