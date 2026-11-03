/**
 * utils/json.ts
 *
 * JSON/JSONC/JSONL 解析与 JSONC 修改（safeParseJSON、parseJSONL、addItemToJSONCArray），JSONL 大文件读取上限 100MB。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/json.ts
 * pieces: chunk-axmbhcjg.js (1), chunk-kndsyy4v.js (21)
 * attribution: fingerprint 4, placement 9, callgraph-witnessed 1, layout 5, file-local 3
 */
import * as bufferModule from "buffer";
import { stat, readFile, open } from "fs/promises";
import { logError } from "./log.js";
import { withTelemetryMessage } from "./errors.js";
import { memoizeWithLRU } from "./memoize.js";
import { b8e, KOn, Wbr } from "../../vendor/jsonc-parser/lib/esm/main.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";

//@ chunk-kndsyy4v.js:335-393 placement
function Wo(e) {
  return e.startsWith("\uFEFF") ? e.slice(1) : e;
}
//@ chunk-kndsyy4v.js:17614-17644 placement
var DJt = "__unparsedToolInput";
/**
 * 判断工具输入是否为"JSON 解析失败"占位对象（唯一键，含 raw 与 len）。
 */
//@ chunk-kndsyy4v.js:17644-17879 placement
function isUnparsedInputMarker(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return !1;
  let entries = Object.entries(e);
  if (entries.length !== 1) return !1;
  let [r, n] = entries[0];
  return (
    r === DJt && typeof n === "object" && n !== null && typeof n.raw === "string" && typeof n.len === "number"
  );
}
/**
 * 若工具输入是"未能解析的 JSON"占位对象（唯一键、含 raw 字符串与 len 数字），返回"input JSON failed to parse — N bytes"说明，否则 null。
 */
//@ chunk-kndsyy4v.js:17879-18205 placement
function describeUnparsedInput(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
  let entries = Object.entries(e);
  if (entries.length !== 1) return null;
  let [r, n] = entries[0];
  if (r !== DJt || typeof n !== "object" || n === null) return null;
  let { raw: raw, len: len } = n;
  if (typeof raw !== "string" || typeof len !== "number") return null;
  return `input JSON failed to parse \u2014 ${len} bytes`;
}
//@ chunk-kndsyy4v.js:18205-18217 placement
var be = 8192;
//@ chunk-kndsyy4v.js:18217-18415 placement
function parseJsonResult(e, s) {
  try {
    return { ok: !0, value: JSON.parse(Wo(e)) };
  } catch (error) {
    if (s)
      logError(
        withTelemetryMessage(
          error,
          `safeParseJSON: invalid JSON (${error instanceof Error ? error.constructor.name : typeof error}, ${e.length} bytes)`,
        ),
      );
    return { ok: !1 };
  }
}
/**
 * 带 LRU 缓存的解析器包装（与可信设备无关）。
 */
//@ chunk-kndsyy4v.js:18415-18508 placement = clearTrustedDeviceTokenCache (0.629)
class MemoizedParser {
  cached = memoizeWithLRU(parseJsonResult, (e) => e, 50);
  cache = this.cached.cache;
  parse(e, s) {
    return this.cached(e, s);
  }
}
//@ chunk-kndsyy4v.js:18508-18522 placement
var ie = new MemoizedParser();
//@ chunk-kndsyy4v.js:18522-18613 placement
function $U(e) {
  return e
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}
/**
 * 安全解析 JSON：空串返回 null；大文本走不缓存路径，小文本带 LRU 缓存；失败返回 null（可选记录错误）。
 */
//@ chunk-kndsyy4v.js:18613-18753 callgraph-witnessed = safeParseJSON (1)
var safeParseJSON = Object.assign(
  function (json, shouldLogError = !0) {
    if (!json) return null;
    let result = json.length > be ? parseJsonResult(json, shouldLogError) : ie.parse(json, shouldLogError);
    return result.ok ? result.value : null;
  },
  { cache: ie.cache },
);
//@ chunk-kndsyy4v.js:18753-18917 layout
function parseJsonc(e) {
  if (!e) return null;
  try {
    return b8e(Wo(e));
  } catch (error) {
    return (
      logForDebugging(`Failed to parse JSONC: ${error instanceof Error ? error.message : String(error)}`, {
        level: "error",
      }),
      null
    );
  }
}
//@ chunk-kndsyy4v.js:18917-18961 fingerprint = bunJSONLParse (0.774)
function bunJSONLParse() {
  return Bun.JSONL?.parseChunk;
}
//@ chunk-kndsyy4v.js:18961-19349 fingerprint = parseJSONLBun (0.691)
function parseJSONLBun(e, s) {
  if (typeof e !== "string" && !bufferModule.isAscii(e)) {
    let c = parseJsonlBuffer(e, s);
    if (c !== void 0) return c;
  }
  let len = e.length,
    result = s(e);
  if (!result.error || result.done || result.read >= len) return result.values;
  let { values: values, read: read } = result;
  while (read < len) {
    let newlineIndex =
      typeof e === "string"
        ? e.indexOf(
            `
`,
            read,
          )
        : e.indexOf(10, read);
    if (newlineIndex === -1) break;
    read = newlineIndex + 1;
    let next = s(e, read);
    if (next.values.length > 0) values = values.concat(next.values);
    if (!next.error || next.done || next.read >= len) break;
    read = next.read;
  }
  return values;
}
//@ chunk-kndsyy4v.js:19349-19605 layout
function parseJsonlBuffer(e, s) {
  let r = [],
    n = e.length;
  for (let i = 0; i < n;) {
    let index = e.indexOf(10, i),
      c = index === -1 ? n : index;
    if (c > i) {
      if (i > 0 && e[i] === 239 && e[i + 1] === 187 && e[i + 2] === 191) return;
      let f = s(e.subarray(i, c));
      if (f.error || (!f.done && c < n)) return;
      for (let u of f.values) r.push(u);
    }
    i = c + 1;
  }
  return r;
}
//@ chunk-kndsyy4v.js:19605-19837 file-local
function parseJSONLBuffer(buf) {
  let bufLen = buf.length,
    start = 0;
  if (buf[0] === 239 && buf[1] === 187 && buf[2] === 191) start = 3;
  let results = [];
  while (start < bufLen) {
    let end = buf.indexOf(10, start);
    if (end === -1) end = bufLen;
    let line = buf.toString("utf8", start, end).trim();
    if (((start = end + 1), !line)) continue;
    try {
      results.push(JSON.parse(line));
    } catch {}
  }
  return results;
}
//@ chunk-kndsyy4v.js:19837-20026 file-local
function parseJSONLString(data) {
  let stripped = Wo(data),
    len = stripped.length,
    start = 0,
    results = [];
  while (start < len) {
    let index = stripped.indexOf(
      `
`,
      start,
    );
    if (index === -1) index = len;
    let line = stripped.substring(start, index).trim();
    if (((start = index + 1), !line)) continue;
    try {
      results.push(JSON.parse(line));
    } catch {}
  }
  return results;
}
//@ chunk-kndsyy4v.js:20026-20123 file-local
function parseJSONL(data) {
  let s = bunJSONLParse();
  if (s) return parseJSONLBun(data, s);
  if (typeof data === "string") return parseJSONLString(data);
  return parseJSONLBuffer(data);
}
//@ chunk-kndsyy4v.js:20123-20141 layout
var LJt = 104857600;
//@ chunk-kndsyy4v.js:20141-20466 layout = readJSONLFile (1)
async function readJSONLFile_2(filePath) {
  let { size: size } = await stat(filePath);
  if (size <= LJt) return parseJSONL(await readFile(filePath));
  await using fd = await open(filePath, "r");
  let buf = Buffer.allocUnsafe(LJt),
    totalRead = 0,
    fileOffset = size - LJt;
  while (totalRead < LJt) {
    let { bytesRead: bytesRead } = await fd.read(buf, totalRead, LJt - totalRead, fileOffset + totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  let newlineIndex = buf.indexOf(10);
  if (newlineIndex !== -1 && newlineIndex < totalRead - 1)
    return parseJSONL(buf.subarray(newlineIndex + 1, totalRead));
  return parseJSONL(buf.subarray(0, totalRead));
}
/**
 * 在 JSONC 文本中设置顶层属性（4 空格缩进）：空文本直接生成新对象；解析出错或根不是对象时原样返回；失败记录日志并返回原文。
 */
//@ chunk-kndsyy4v.js:20466-20871 layout
function setJsoncProperty(e, s, r) {
  if (!e || e.trim() === "") return jsonStringify({ [s]: r }, null, 4);
  let n = Wo(e);
  try {
    let i = [],
      o = b8e(n, i);
    if (i.length > 0 || o === null || typeof o !== "object" || Array.isArray(o)) return e;
    let c = KOn(n, [s], r, { formattingOptions: { insertSpaces: !0, tabSize: 4 } });
    if (!c || c.length === 0) return n;
    return Wbr(n, c);
  } catch (error) {
    return (
      logForDebugging(
        `Failed to set JSONC property "${s}": ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      e
    );
  }
}
//@ chunk-kndsyy4v.js:20871-21348 fingerprint = addItemToJSONCArray (0.795)
function addItemToJSONCArray(content, newItem) {
  try {
    if (!content || content.trim() === "") return jsonStringify([newItem], null, 4);
    let cleanContent = Wo(content),
      parsedContent = b8e(cleanContent);
    if (Array.isArray(parsedContent)) {
      let arrayLength = parsedContent.length,
        edits = KOn(cleanContent, arrayLength === 0 ? [0] : [arrayLength], newItem, {
          formattingOptions: { insertSpaces: !0, tabSize: 4 },
          isArrayInsertion: !0,
        });
      if (!edits || edits.length === 0) {
        let copy = [...parsedContent, newItem];
        return jsonStringify(copy, null, 4);
      }
      return Wbr(cleanContent, edits);
    } else return jsonStringify([newItem], null, 4);
  } catch (error) {
    return (
      logForDebugging(
        `Failed to insert item into user JSONC array, falling back to overwrite: ${error instanceof Error ? error.message : String(error)}`,
        { level: "error" },
      ),
      jsonStringify([newItem], null, 4)
    );
  }
}
//@ chunk-axmbhcjg.js:2182-2332 fingerprint = readJSONLFile (1)
async function readJSONLFile(e, n) {
  let buf = Buffer.allocUnsafe(n),
    totalRead = 0;
  while (totalRead < n) {
    let { bytesRead: bytesRead } = await e.read(buf, totalRead, n - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}

export {
  safeParseJSON,
  DJt,
  isUnparsedInputMarker,
  describeUnparsedInput,
  Wo,
  parseJSONL,
  bunJSONLParse,
  LJt,
  $U,
  readJSONLFile_2,
  parseJsonc,
  setJsoncProperty,
  addItemToJSONCArray,
  readJSONLFile,
};
