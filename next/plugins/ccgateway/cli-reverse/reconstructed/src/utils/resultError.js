/**
 * utils/resultError.ts
 *
 * 2.1.316 新增：解析并描述 URL 协议；取文本尾部完整行等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2jb250pa.js (21), chunk-6hadbefe.js (7)
 * attribution: placement 28
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { regExp_9, regExp_2, MAX_SHORT_TEXT } from "./sanitization.js";
import { toWellFormedString, truncateToLength } from "./stringUtils.js";
import { stripAnsi } from "./stripAnsi.js";
import { errnoShapedCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";

//@ chunk-2jb250pa.js:5499-5572 placement
/**
 * 非 ASCII 字符转义为 \u。
 */
function escapeNonAscii(text) {
  return escapeNonPrintable(text.replace(/\\(?=u[0-9a-fA-F]{4})/g, "\\u005c"));
}
//@ chunk-2jb250pa.js:5572-5625 placement
/**
 * 非打印字符转义。
 */
function escapeNonPrintable(text) {
  return text.replace(/[^\x20-\x7e]/g, toUnicodeEscapes);
}
//@ chunk-2jb250pa.js:5625-5694 placement
/**
 * 控制字符替换为空格。
 */
function replaceControlChars(text) {
  return text.replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, " ");
}
//@ chunk-2jb250pa.js:5694-5834 placement
/**
 * 控制字符转义为 \u。
 */
function escapeControlChars(text) {
  return text.replace(regExp_9, (controlRun) =>
    Array.from(
      {
        length: controlRun.length,
      },
      (char, index) => `\\u${controlRun.charCodeAt(index).toString(16).padStart(4, "0")}`,
    ).join(""),
  );
}
//@ chunk-2jb250pa.js:5834-5883 placement
/**
 * 显示前归一化。
 */
function normalizeForDisplay(text) {
  return toWellFormedString(stripAnsi(text)).replace(regExp_2, " ");
}
//@ chunk-2jb250pa.js:5883-6044 placement
/**
 * 清洗显示文本（去指定字符、压缩空白、截断）。
 */
function sanitizeDisplayText(text, options) {
  let cleaned = normalizeForDisplay(text);
  if (options?.drop) cleaned = cleaned.replace(options.drop, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  if (options?.maxCodeUnits !== undefined) cleaned = truncateToLength(cleaned, options.maxCodeUnits).trim();
  return cleaned;
}
//@ chunk-2jb250pa.js:6044-6262 placement
/**
 * 截取显示文本：统一换行、限制行数与字符数、规范化每行，返回文本与是否被截断。
 */
function clipDisplayText(text, { maxCodeUnits, maxLines }) {
  let lines = text.replace(
    /\r\n?/g,
    `
`,
  ).split(`
`);
  let joined = lines.slice(0, maxLines).map((line) => normalizeForDisplay(line.replace(/\t/g, " "))).join(`
`);
  return {
    text: truncateToLength(joined, maxCodeUnits).replace(/\n+$/, ""),
    truncated: lines.length > maxLines || joined.length > maxCodeUnits,
  };
}
//@ chunk-2jb250pa.js:6262-6295 placement
/**
 * isAlreadySanitized：文本已是清洗后的形式。
 */
function isAlreadySanitized(text) {
  return sanitizeDisplayText(text) === text;
}
//@ chunk-2jb250pa.js:6295-6306 placement
var MAX_TAIL_LINES_BYTES = 8192;
//@ chunk-2jb250pa.js:6306-6715 placement
/**
 * 取文本尾部完整行。
 */
function tailLines(text, maxLines) {
  let tail = text;
  if (text.length > MAX_TAIL_LINES_BYTES) {
    let excess = text.length - MAX_TAIL_LINES_BYTES;
    let newlineIndex = text.slice(excess).search(/[\r\n]/);
    if (newlineIndex !== -1) tail = text.slice(excess + newlineIndex + 1);
    else {
      let breakIndex =
        Math.max(
          text.lastIndexOf(`
`),
          text.lastIndexOf("\r"),
        ) + 1;
      tail = truncateToLength(
        text.slice(breakIndex, breakIndex + MAX_TAIL_LINES_BYTES + 1),
        MAX_TAIL_LINES_BYTES,
      );
    }
  }
  let lines = tail.split(/\r?\n/);
  let result = [];
  for (let index = lines.length - 1; index >= 0 && result.length < maxLines; index--) {
    let parts = lines[index].split("\r");
    for (let idx = parts.length - 1; idx >= 0; idx--) {
      let line = sanitizeDisplayText(parts[idx], {
        maxCodeUnits: 512,
      });
      if (line !== "") {
        result.push(line);
        break;
      }
    }
  }
  return result.reverse();
}
//@ chunk-2jb250pa.js:6715-6726 placement
/**
 * 标题最大长度。
 */
var MAX_TITLE_LENGTH = 255;
//@ chunk-2jb250pa.js:6726-6757 placement
/**
 * 清洗标题。
 */
function sanitizeTitle(text) {
  return sanitizeMarkdownInline(text, MAX_TITLE_LENGTH);
}
//@ chunk-2jb250pa.js:6757-6790 placement
/**
 * 清洗短文本。
 */
function sanitizeShortText(text) {
  return sanitizeMarkdownInline(text, MAX_SHORT_TEXT);
}
//@ chunk-2jb250pa.js:6790-6946 placement
function sanitizeMarkdownInline(text, maxLength) {
  let replaced = sanitizeDisplayText(text, {
    drop: /[`<>]/g,
  })
    .replace(/\]\(/g, "] (")
    .replace(/!\[/g, "! [")
    .replace(/\]\[/g, "] [")
    .replace(/\]:/g, "] :");
  return truncateToLength(replaced, maxLength).trim();
}
//@ chunk-2jb250pa.js:6946-6976 placement
/**
 * markdown 安全文本长度与字符。
 */
var MAX_MARKDOWN_SAFE_LENGTH = 2048;
var MARKDOWN_BREAK_RE = /[`\[\]<>]/g;
//@ chunk-2jb250pa.js:6976-7163 placement
/**
 * 打断 markdown 链接/HTML 的安全文本。
 */
function markdownSafeText(description) {
  let trimmed = sanitizeDisplayText(description)
    .replace(/\]\(/g, "] (")
    .replace(/!\[/g, "! [")
    .replace(/\]\[/g, "] [")
    .replace(/\]:/g, "] :")
    .replace(/</g, "< ")
    .replace(/\s+/g, " ")
    .trim();
  return truncateToLength(trimmed, MAX_MARKDOWN_SAFE_LENGTH).trim();
}
//@ chunk-2jb250pa.js:7163-7238 placement
/**
 * 不可见字符转义。
 */
function escapeInvisibleChars(text) {
  return text.replace(/[\u007F-\u009F\u2028\u2029\p{Cf}]/gu, toUnicodeEscapes);
}
//@ chunk-2jb250pa.js:7238-7342 placement
/**
 * 字符转为 \u 转义序列。
 */
function toUnicodeEscapes(chars) {
  return chars
    .split("")
    .map((char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
}
//@ chunk-2jb250pa.js:7342-7910 placement
/**
 * 解析并描述 URL 协议。
 */
function describeUrlScheme(input) {
  let start = 0;
  while (start < input.length && input.charCodeAt(start) <= 32) start++;
  let sliced = input.slice(start);
  let match = /^([A-Za-z0-9][A-Za-z0-9+.-]*):\/\//.exec(sliced);
  let lower = match?.[1]?.toLowerCase();
  let rest = match ? sliced.slice(match[0].length) : sliced;
  let index = rest.indexOf(":");
  let index_2 = rest.indexOf("/");
  if (
    !(lower !== undefined
      ? lower !== "file"
      : index !== -1 && (index_2 === -1 || index < index_2) && !/^[A-Za-z]:/.test(rest))
  ) {
    let decoded = match ? decodePercentEscapes(rest) : rest;
    return decoded.includes("@[") || decoded.startsWith("[");
  }
  let decodedRest = decodePercentEscapes(rest);
  let ipv6Match = match
    ? /^(?:[^@/?#\\[\]]+@)?(\[[0-9A-Fa-f:.]+\])(?::\d*)?(?=\/|$)/.exec(decodedRest)
    : /^[^@:/[\]]+@(\[[0-9A-Fa-f:.]+\])(?=:)/.exec(decodedRest);
  let hostnameLength = ipv6Match !== null && !!tryParseUrl(`ssh://${ipv6Match[1]}/`)?.hostname;
  return /[[\]]/.test(decodedRest.slice(hostnameLength ? ipv6Match[0].length : 0));
}
//@ chunk-2jb250pa.js:7910-7967 placement
/**
 * 尝试解析 URL。
 */
function tryParseUrl(url) {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}
//@ chunk-2jb250pa.js:7967-8088 placement
/**
 * 解码 URL 中的 %XX 转义（保留 %00）。
 */
function decodePercentEscapes(text) {
  return text.replace(/%([0-9A-Fa-f]{2})/g, (match, hex) => {
    let codePoint = parseInt(hex, 16);
    return codePoint === 0 ? match : String.fromCharCode(codePoint);
  });
}
//@ chunk-6hadbefe.js:970-1007 placement
/**
 * 构造成功结果。
 */
function ok(value) {
  return {
    ok: true,
    value,
  };
}
//@ chunk-6hadbefe.js:1007-1044 placement
/**
 * 构造失败结果。
 */
function err(error) {
  return {
    ok: false,
    error,
  };
}
//@ chunk-6hadbefe.js:1044-1209 placement
class ResultError extends Error {
  constructor(value) {
    super("Result was an error (see .error)");
    this.name = "ResultError";
    Object.defineProperty(this, "error", {
      value,
      enumerable: false,
    });
  }
}
//@ chunk-6hadbefe.js:1209-1270 placement
/**
 * unwrapResult：取出结果或抛错。
 */
function unwrapResult(result) {
  if (result.ok) return result.value;
  throw new ResultError(result.error);
}
//@ chunk-6hadbefe.js:1270-1439 placement
/**
 * 路径空间构造（home、workspace、system 等）。
 */
var PathSpace = {
  home: (path) => ({
    space: "home",
    path,
  }),
  workspace: (path) => ({
    space: "workspace",
    path,
  }),
  system: (path) => ({
    space: "system",
    path,
  }),
  userNamed: (path) => ({
    space: "userNamed",
    path,
  }),
};
//@ chunk-6hadbefe.js:1439-1645 placement
/**
 * 判断错误是否为宿主拒绝的文件操作错误（code 为 Failed 且 telemetryCode 为 errno 或 ERR_ 形式）。
 */
function isHostFileError(value) {
  if (typeof value !== "object" || value === null) return false;
  let code = Reflect.get(value, "code");
  let telemetryCode = Reflect.get(value, "telemetryCode");
  return (
    code === "Failed" &&
    typeof telemetryCode === "string" &&
    (errnoShapedCode(telemetryCode) !== undefined || /^ERR_[A-Z0-9_]+$/.test(telemetryCode))
  );
}
//@ chunk-6hadbefe.js:1645-1947 placement
/**
 * 解包宿主拒绝的文件操作错误。
 */
function unwrapHostFileError(error) {
  if (isHostFileError(error)) {
    if (error.cause instanceof Error) return error.cause;
    return Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        formatStorageError(error),
        "host file operation refused by the storage backend",
      ),
      {
        code: error.telemetryCode,
        cause: error,
      },
    );
  }
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      formatStorageError(error),
      "host file operation could not be performed by the storage backend",
    ),
    {
      cause: error,
    },
  );
}
export {
  PathSpace,
  toUnicodeEscapes,
  sanitizeDisplayText,
  MARKDOWN_BREAK_RE,
  MAX_MARKDOWN_SAFE_LENGTH,
  tailLines,
  MAX_TITLE_LENGTH,
  clipDisplayText,
  normalizeForDisplay,
  replaceControlChars,
  tryParseUrl,
  decodePercentEscapes,
  unwrapResult,
  escapeNonPrintable,
  sanitizeTitle,
  markdownSafeText,
  isHostFileError,
  unwrapHostFileError,
  describeUrlScheme,
  err,
  ok,
  escapeInvisibleChars,
  escapeControlChars,
  escapeNonAscii,
  sanitizeShortText,
  isAlreadySanitized,
};
