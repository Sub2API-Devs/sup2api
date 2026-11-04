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
import {
  objectSchema,
  stringSchema,
  numberSchema,
  _enum,
  unknown,
} from "../../../../vendor/zod/v4/classic/schemas.js";
import { jsonParse } from "../../../utils/slowOperations.js";
import { openNoFollow_2 } from "../../../utils/fsSafety/hardenedRead.js";

//@ chunk-qchp9vrd.js:118449-118653 placement
/**
 * 模拟中继日志的最大字节数（16 MiB）。
 */
var MockCallLogEntrySchema = DoctorLazy(() =>
  objectSchema({
    nonce: stringSchema(),
    seq: numberSchema(),
    replay: _enum(["hit", "miss"]).optional(),
    server: stringSchema(),
    tool: stringSchema(),
    responder: _enum(["fixed", "agent"]),
    input: unknown(),
    verdict: _enum(["ok", "tool_error", "abort"]),
    output: stringSchema(),
    ms: numberSchema(),
  }),
);
var MAX_RELAY_LOG_BYTES = 16777216;
//@ chunk-qchp9vrd.js:118653-118882 placement
/**
 * 读取模拟中继的调用日志，只保留指定 nonce 的有效记录（并返回是否截断）。
 */
async function readMockCallLog(filePath, nonce) {
  let { text, truncated } = await readFileHead(filePath);
  let records = [];
  for (let line of text.split(`
`)) {
    if (!line.trim()) continue;
    try {
      let parsed = MockCallLogEntrySchema().safeParse(jsonParse(line));
      if (parsed.success && parsed.data.nonce === nonce) records.push(parsed.data);
    } catch {}
  }
  return {
    records,
    truncated,
  };
}
//@ chunk-qchp9vrd.js:118882-119103 placement
/**
 * 从模拟中继日志中读取已就绪的模拟服务器名。
 */
async function readReadyMockServers(filePath, nonce) {
  let servers = new Set();
  let { text } = await readFileHead(filePath);
  for (let line of text.split(`
`)) {
    if (!line.includes('"ready"')) continue;
    try {
      let parsed = readyServerSchema().safeParse(jsonParse(line));
      if (parsed.success && parsed.data.ready === nonce) servers.add(parsed.data.server);
    } catch {}
  }
  return servers;
}
//@ chunk-qchp9vrd.js:119103-119143 placement
/**
 * “就绪服务器”消息的 schema。
 */
var readyServerSchema = DoctorLazy(() =>
  objectSchema({
    ready: stringSchema(),
    server: stringSchema(),
  }),
);
//@ chunk-qchp9vrd.js:119143-119534 placement
/**
 * 不跟随链接地打开文件，只读取前若干字节（上限 ko）为文本，返回 {text, truncated}；失败返回空文本。
 */
async function readFileHead(filePath) {
  let empty = {
    text: "",
    truncated: false,
  };
  let noFollow = await openNoFollow_2(filePath);
  if (!noFollow.ok) return empty;
  let handle = noFollow.value;
  try {
    let stats = await handle.stat();
    if (!stats.isFile()) return empty;
    let min = Math.min(stats.size, MAX_RELAY_LOG_BYTES);
    let buffer = Buffer.alloc(min);
    let offset = 0;
    while (offset < min) {
      let { bytesRead } = await handle.read({
        buffer,
        offset,
        position: offset,
      });
      if (bytesRead <= 0) break;
      offset += bytesRead;
    }
    return {
      text: buffer.subarray(0, offset).toString("utf8"),
      truncated: stats.size > MAX_RELAY_LOG_BYTES,
    };
  } catch {
    return empty;
  } finally {
    await handle.close();
  }
}
export { readMockCallLog, readReadyMockServers, MAX_RELAY_LOG_BYTES };
