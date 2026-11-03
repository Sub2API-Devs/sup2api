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
import { b8e, KOn, applyEdits } from "../../vendor/jsonc-parser/lib/esm/main.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";

//@ chunk-kndsyy4v.js:335-393 placement
/**
 * 去掉文本开头的 BOM。
 */
function stripBom(e) {
  return e.startsWith("\uFEFF") ? e.slice(1) : e;
}
//@ chunk-kndsyy4v.js:17614-17644 placement
/**
 * 表示"工具输入 JSON 解析失败"的占位键名。
 */
var UNPARSED_TOOL_INPUT_KEY = "__unparsedToolInput";
//@ chunk-kndsyy4v.js:17644-17879 placement
/**
 * 判断工具输入是否为"JSON 解析失败"占位对象（唯一键，含 raw 与 len）。
 */
function isUnparsedInputMarker(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return false;
  let entries = Object.entries(e);
  if (entries.length !== 1) return false;
  let [r, n] = entries[0];
  return (
    r === UNPARSED_TOOL_INPUT_KEY &&
    typeof n === "object" &&
    n !== null &&
    typeof n.raw === "string" &&
    typeof n.len === "number"
  );
}
//@ chunk-kndsyy4v.js:17879-18205 placement
/**
 * 若工具输入是"未能解析的 JSON"占位对象（唯一键、含 raw 字符串与 len 数字），返回"input JSON failed to parse — N bytes"说明，否则 null。
 */
function describeUnparsedInput(e) {
  if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
  let entries = Object.entries(e);
  if (entries.length !== 1) return null;
  let [r, n] = entries[0];
  if (r !== UNPARSED_TOOL_INPUT_KEY || typeof n !== "object" || n === null) return null;
  let { raw, len } = n;
  if (typeof raw !== "string" || typeof len !== "number") return null;
  return `input JSON failed to parse \u2014 ${len} bytes`;
}
//@ chunk-kndsyy4v.js:18205-18217 placement
var MAX_CACHED_JSON_CHARS = 8192;
//@ chunk-kndsyy4v.js:18217-18415 placement
function parseJsonResult(json, shouldLogError) {
  try {
    return {
      ok: true,
      value: JSON.parse(stripBom(json)),
    };
  } catch (error) {
    if (shouldLogError)
      logError(
        withTelemetryMessage(
          error,
          `safeParseJSON: invalid JSON (${error instanceof Error ? error.constructor.name : typeof error}, ${json.length} bytes)`,
        ),
      );
    return {
      ok: false,
    };
  }
}
//@ chunk-kndsyy4v.js:18415-18508 placement = clearTrustedDeviceTokenCache (0.629)
/**
 * 带 LRU 缓存的解析器包装（与可信设备无关）。
 */
class MemoizedParser {
  cached = memoizeWithLRU(parseJsonResult, (e) => e, 50);
  cache = this.cached.cache;
  parse(e, s) {
    return this.cached(e, s);
  }
}
//@ chunk-kndsyy4v.js:18508-18522 placement
var memoizedJsonParser = new MemoizedParser();
//@ chunk-kndsyy4v.js:18522-18613 placement
/**
 * 去掉 Markdown 代码围栏前后的 ``` 与空白。
 */
function stripJsonCodeFence(text) {
  return text
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, "")
    .replace(/\s*```$/, "")
    .trim();
}
//@ chunk-kndsyy4v.js:18613-18753 callgraph-witnessed = safeParseJSON (1)
/**
 * 安全解析 JSON：空串返回 null；大文本走不缓存路径，小文本带 LRU 缓存；失败返回 null（可选记录错误）。
 */
var safeParseJSON = Object.assign(
  function (json, shouldLogError = true) {
    if (!json) return null;
    let result =
      json.length > MAX_CACHED_JSON_CHARS
        ? parseJsonResult(json, shouldLogError)
        : memoizedJsonParser.parse(json, shouldLogError);
    return result.ok ? result.value : null;
  },
  {
    cache: memoizedJsonParser.cache,
  },
);
//@ chunk-kndsyy4v.js:18753-18917 layout
function parseJsonc(e) {
  if (!e) return null;
  try {
    return b8e(stripBom(e));
  } catch (error) {
    logForDebugging(`Failed to parse JSONC: ${error instanceof Error ? error.message : String(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-kndsyy4v.js:18917-18961 fingerprint = bunJSONLParse (0.774)
function bunJSONLParse() {
  return Bun.JSONL?.parseChunk;
}
//@ chunk-kndsyy4v.js:18961-19349 fingerprint = parseJSONLBun (0.691)
function parseJSONLBun(data, s) {
  if (typeof data !== "string" && !bufferModule.isAscii(data)) {
    let jsonlBuffer = parseJsonlBuffer(data, s);
    if (jsonlBuffer !== undefined) return jsonlBuffer;
  }
  let len = data.length;
  let result = s(data);
  if (!result.error || result.done || result.read >= len) return result.values;
  let { values, read: offset } = result;
  while (offset < len) {
    let newlineIndex =
      typeof data === "string"
        ? data.indexOf(
            `
`,
            offset,
          )
        : data.indexOf(10, offset);
    if (newlineIndex === -1) break;
    offset = newlineIndex + 1;
    let next = s(data, offset);
    if (next.values.length > 0) values = values.concat(next.values);
    if (!next.error || next.done || next.read >= len) break;
    offset = next.read;
  }
  return values;
}
//@ chunk-kndsyy4v.js:19349-19605 layout
function parseJsonlBuffer(e, s) {
  let r = [];
  let n = e.length;
  for (let i = 0; i < n;) {
    let index = e.indexOf(10, i);
    let c = index === -1 ? n : index;
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
  let bufLen = buf.length;
  let start = 0;
  if (buf[0] === 239 && buf[1] === 187 && buf[2] === 191) start = 3;
  let results = [];
  while (start < bufLen) {
    let end = buf.indexOf(10, start);
    if (end === -1) end = bufLen;
    let line = buf.toString("utf8", start, end).trim();
    start = end + 1;
    if (!line) continue;
    try {
      results.push(JSON.parse(line));
    } catch {}
  }
  return results;
}
//@ chunk-kndsyy4v.js:19837-20026 file-local
function parseJSONLString(data) {
  let stripped = stripBom(data);
  let len = stripped.length;
  let start = 0;
  let results = [];
  while (start < len) {
    let end = stripped.indexOf(
      `
`,
      start,
    );
    if (end === -1) end = len;
    let line = stripped.substring(start, end).trim();
    start = end + 1;
    if (!line) continue;
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
/**
 * JSONL 文件整读的上限（100 MB）。
 */
var MAX_JSONL_READ_BYTES = 104857600;
//@ chunk-kndsyy4v.js:20141-20466 layout = readJSONLFile (1)
async function readJSONLFile_2(filePath) {
  let { size } = await stat(filePath);
  if (size <= MAX_JSONL_READ_BYTES) return parseJSONL(await readFile(filePath));
  await using fd = await open(filePath, "r");
  let buf = Buffer.allocUnsafe(MAX_JSONL_READ_BYTES);
  let totalRead = 0;
  let fileOffset = size - MAX_JSONL_READ_BYTES;
  while (totalRead < MAX_JSONL_READ_BYTES) {
    let { bytesRead } = await fd.read(
      buf,
      totalRead,
      MAX_JSONL_READ_BYTES - totalRead,
      fileOffset + totalRead,
    );
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  let newlineIndex = buf.indexOf(10);
  if (newlineIndex !== -1 && newlineIndex < totalRead - 1)
    return parseJSONL(buf.subarray(newlineIndex + 1, totalRead));
  return parseJSONL(buf.subarray(0, totalRead));
}
//@ chunk-kndsyy4v.js:20466-20871 layout
/**
 * 在 JSONC 文本中设置顶层属性（4 空格缩进）：空文本直接生成新对象；解析出错或根不是对象时原样返回；失败记录日志并返回原文。
 */
function setJsoncProperty(content, s, r) {
  if (!content || content.trim() === "")
    return jsonStringify(
      {
        [s]: r,
      },
      null,
      4,
    );
  let cleanContent = stripBom(content);
  try {
    let parsedContent = [];
    let o = b8e(cleanContent, parsedContent);
    if (parsedContent.length > 0 || o === null || typeof o !== "object" || Array.isArray(o)) return content;
    let edits = KOn(cleanContent, [s], r, {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 4,
      },
    });
    if (!edits || edits.length === 0) return cleanContent;
    return applyEdits(cleanContent, edits);
  } catch (error) {
    logForDebugging(
      `Failed to set JSONC property "${s}": ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return content;
  }
}
//@ chunk-kndsyy4v.js:20871-21348 fingerprint = addItemToJSONCArray (0.795)
function addItemToJSONCArray(content, newItem) {
  try {
    if (!content || content.trim() === "") return jsonStringify([newItem], null, 4);
    let cleanContent = stripBom(content);
    let parsedContent = b8e(cleanContent);
    if (Array.isArray(parsedContent)) {
      let arrayLength = parsedContent.length;
      let edits = KOn(cleanContent, arrayLength === 0 ? [0] : [arrayLength], newItem, {
        formattingOptions: {
          insertSpaces: true,
          tabSize: 4,
        },
        isArrayInsertion: true,
      });
      if (!edits || edits.length === 0) {
        let copy = [...parsedContent, newItem];
        return jsonStringify(copy, null, 4);
      }
      return applyEdits(cleanContent, edits);
    } else return jsonStringify([newItem], null, 4);
  } catch (error) {
    logForDebugging(
      `Failed to insert item into user JSONC array, falling back to overwrite: ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return jsonStringify([newItem], null, 4);
  }
}
//@ chunk-axmbhcjg.js:2182-2332 fingerprint = readJSONLFile (1)
async function readJSONLFile(e, n) {
  let buf = Buffer.allocUnsafe(n);
  let totalRead = 0;
  while (totalRead < n) {
    let { bytesRead } = await e.read(buf, totalRead, n - totalRead, totalRead);
    if (bytesRead === 0) break;
    totalRead += bytesRead;
  }
  return buf.subarray(0, totalRead);
}
export {
  safeParseJSON,
  UNPARSED_TOOL_INPUT_KEY,
  isUnparsedInputMarker,
  describeUnparsedInput,
  stripBom,
  parseJSONL,
  bunJSONLParse,
  MAX_JSONL_READ_BYTES,
  stripJsonCodeFence,
  readJSONLFile_2,
  parseJsonc,
  setJsoncProperty,
  addItemToJSONCArray,
  readJSONLFile,
};
