/**
 * utils/json.ts
 *
 * JSON/JSONC/JSONL 解析与 JSONC 修改（safeParseJSON、parseJSONL、addItemToJSONCArray），JSONL 大文件读取上限 100MB。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/json.ts
 * pieces: chunk-aj4djjd6.js (21)
 * attribution: placement 9, callgraph-witnessed 1, layout 5, fingerprint 3, file-local 3
 */
import * as bufferModule from "buffer";
import { stat, readFile, open } from "fs/promises";
import { logError } from "./log.js";
import { withTelemetryMessage } from "./errors.js";
import { memoizeWithLRU } from "./memoize.js";
import { parseJsonc, modifyJsonc, applyEdits } from "../../vendor/jsonc-parser/lib/esm/main.js";
import { logForDebugging } from "./debug.js";
import { jsonStringify } from "./slowOperations.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-aj4djjd6.js:335-393 placement
/**
 * 去掉文本开头的 BOM。
 */
function stripBom(text) {
  return text.startsWith("\uFEFF") ? text.slice(1) : text;
}
//@ chunk-aj4djjd6.js:17614-17644 placement
/**
 * 表示"工具输入 JSON 解析失败"的占位键名。
 */
var UNPARSED_TOOL_INPUT_KEY = "__unparsedToolInput";
//@ chunk-aj4djjd6.js:17644-17879 placement
/**
 * 判断工具输入是否为"JSON 解析失败"占位对象（唯一键，含 raw 与 len）。
 */
function isUnparsedInputMarker(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  let entries = Object.entries(value);
  if (entries.length !== 1) return false;
  let [key, marker] = entries[0];
  return (
    key === UNPARSED_TOOL_INPUT_KEY &&
    typeof marker === "object" &&
    marker !== null &&
    typeof marker.raw === "string" &&
    typeof marker.len === "number"
  );
}
//@ chunk-aj4djjd6.js:17879-18206 placement
/**
 * 若工具输入是"未能解析的 JSON"占位对象（唯一键、含 raw 字符串与 len 数字），返回"input JSON failed to parse — N bytes"说明，否则 null。
 */
function describeUnparsedInput(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  let entries = Object.entries(value);
  if (entries.length !== 1) return null;
  let [key, marker] = entries[0];
  if (key !== UNPARSED_TOOL_INPUT_KEY || typeof marker !== "object" || marker === null) return null;
  let { raw, len } = marker;
  if (typeof raw !== "string" || typeof len !== "number") return null;
  return `input JSON failed to parse \u2014 ${len} bytes`;
}
//@ chunk-aj4djjd6.js:18206-18218 placement
var MAX_CACHED_JSON_CHARS = 8192;
//@ chunk-aj4djjd6.js:18218-18416 placement
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
//@ chunk-aj4djjd6.js:18416-18509 placement (2.1.88 match: clearTrustedDeviceTokenCache, 0.63)
/**
 * 带 LRU 缓存的解析器包装（与可信设备无关）。
 */
class MemoizedParser {
  cached = memoizeWithLRU(parseJsonResult, (input) => input, 50);
  cache = this.cached.cache;
  parse(value, reviver) {
    return this.cached(value, reviver);
  }
}
//@ chunk-aj4djjd6.js:18509-18523 placement
var memoizedJsonParser; // deferred: uses MemoizedParser of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aj4djjd6.js:18509", () => {
  memoizedJsonParser = new MemoizedParser();
});
//@ chunk-aj4djjd6.js:18523-18614 placement
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
//@ chunk-aj4djjd6.js:18614-18754 callgraph-witnessed (2.1.88 match: safeParseJSON, 1)
/**
 * 安全解析 JSON：空串返回 null；大文本走不缓存路径，小文本带 LRU 缓存；失败返回 null（可选记录错误）。
 */
var safeParseJSON; // deferred: uses parseJsonResult of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-aj4djjd6.js:18614", () => {
  safeParseJSON = Object.assign(
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
});
//@ chunk-aj4djjd6.js:18754-18918 layout
function parseJsonc_2(text) {
  if (!text) return null;
  try {
    return parseJsonc(stripBom(text));
  } catch (error) {
    logForDebugging(`Failed to parse JSONC: ${error instanceof Error ? error.message : String(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-aj4djjd6.js:18918-18962 fingerprint (2.1.88 match: bunJSONLParse, 0.774)
function bunJSONLParse() {
  return Bun.JSONL?.parseChunk;
}
//@ chunk-aj4djjd6.js:18962-19350 fingerprint (2.1.88 match: parseJSONLBun, 0.691)
function parseJSONLBun(data, parseChunk) {
  if (typeof data !== "string" && !bufferModule.isAscii(data)) {
    let jsonlBuffer = parseJsonlBuffer(data, parseChunk);
    if (jsonlBuffer !== undefined) return jsonlBuffer;
  }
  let len = data.length;
  let result = parseChunk(data);
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
    let next = parseChunk(data, offset);
    if (next.values.length > 0) values = values.concat(next.values);
    if (!next.error || next.done || next.read >= len) break;
    offset = next.read;
  }
  return values;
}
//@ chunk-aj4djjd6.js:19350-19606 layout
function parseJsonlBuffer(buffer, parseChunk) {
  let values = [];
  let totalLength = buffer.length;
  for (let lineStart = 0; lineStart < totalLength;) {
    let index = buffer.indexOf(10, lineStart);
    let lineEnd = index === -1 ? totalLength : index;
    if (lineEnd > lineStart) {
      if (
        lineStart > 0 &&
        buffer[lineStart] === 239 &&
        buffer[lineStart + 1] === 187 &&
        buffer[lineStart + 2] === 191
      )
        return;
      let lineResult = parseChunk(buffer.subarray(lineStart, lineEnd));
      if (lineResult.error || (!lineResult.done && lineEnd < totalLength)) return;
      for (let value of lineResult.values) values.push(value);
    }
    lineStart = lineEnd + 1;
  }
  return values;
}
//@ chunk-aj4djjd6.js:19606-19838 file-local
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
//@ chunk-aj4djjd6.js:19838-20027 file-local
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
//@ chunk-aj4djjd6.js:20027-20124 file-local
function parseJSONL(data) {
  let bunParse = bunJSONLParse();
  if (bunParse) return parseJSONLBun(data, bunParse);
  if (typeof data === "string") return parseJSONLString(data);
  return parseJSONLBuffer(data);
}
//@ chunk-aj4djjd6.js:20124-20142 layout
/**
 * JSONL 文件整读的上限（100 MB）。
 */
var MAX_JSONL_READ_BYTES = 104857600;
//@ chunk-aj4djjd6.js:20142-20467 layout (2.1.88 match: readJSONLFile, 1)
async function readJSONLFile(filePath) {
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
//@ chunk-aj4djjd6.js:20467-20872 layout
/**
 * 在 JSONC 文本中设置顶层属性（4 空格缩进）：空文本直接生成新对象；解析出错或根不是对象时原样返回；失败记录日志并返回原文。
 */
function setJsoncProperty(content, key, value) {
  if (!content || content.trim() === "")
    return jsonStringify(
      {
        [key]: value,
      },
      null,
      4,
    );
  let cleanContent = stripBom(content);
  try {
    let parsedContent = [];
    let parsed = parseJsonc(cleanContent, parsedContent);
    if (parsedContent.length > 0 || parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
      return content;
    let edits = modifyJsonc(cleanContent, [key], value, {
      formattingOptions: {
        insertSpaces: true,
        tabSize: 4,
      },
    });
    if (!edits || edits.length === 0) return cleanContent;
    return applyEdits(cleanContent, edits);
  } catch (error) {
    logForDebugging(
      `Failed to set JSONC property "${key}": ${error instanceof Error ? error.message : String(error)}`,
      {
        level: "error",
      },
    );
    return content;
  }
}
//@ chunk-aj4djjd6.js:20872-21349 fingerprint (2.1.88 match: addItemToJSONCArray, 0.795)
function addItemToJSONCArray(content, newItem) {
  try {
    if (!content || content.trim() === "") return jsonStringify([newItem], null, 4);
    let cleanContent = stripBom(content);
    let parsedContent = parseJsonc(cleanContent);
    if (Array.isArray(parsedContent)) {
      let arrayLength = parsedContent.length;
      let edits = modifyJsonc(cleanContent, arrayLength === 0 ? [0] : [arrayLength], newItem, {
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
export {
  MAX_JSONL_READ_BYTES,
  parseJSONL,
  safeParseJSON,
  bunJSONLParse,
  readJSONLFile,
  stripBom,
  UNPARSED_TOOL_INPUT_KEY,
  isUnparsedInputMarker,
  parseJsonc_2,
  setJsoncProperty,
  addItemToJSONCArray,
  stripJsonCodeFence,
  describeUnparsedInput,
};
