/**
 * utils/resultError.ts
 *
 * 2.1.316 新增：解析并描述 URL 协议；取文本尾部完整行等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cgr0tezp.js (28)
 * attribution: placement 28
 */
import { regExp_9, regExp_2, MAX_SHORT_TEXT } from "./sanitization.js";
import { toWellFormedString, truncateToLength } from "./stringUtils.js";
import { stripAnsi } from "./stripAnsi.js";
import { errnoShapedCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";

//@ chunk-cgr0tezp.js:10653-10726 placement
/**
 * 非 ASCII 字符转义为 \u。
 */
function escapeNonAscii(e) {
  return escapeNonPrintable(e.replace(/\\(?=u[0-9a-fA-F]{4})/g, "\\u005c"));
}
//@ chunk-cgr0tezp.js:10726-10779 placement
/**
 * 非打印字符转义。
 */
function escapeNonPrintable(e) {
  return e.replace(/[^\x20-\x7e]/g, toUnicodeEscapes);
}
//@ chunk-cgr0tezp.js:10779-10848 placement
/**
 * 控制字符替换为空格。
 */
function replaceControlChars(e) {
  return e.replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, " ");
}
//@ chunk-cgr0tezp.js:10848-10988 placement
/**
 * 控制字符转义为 \u。
 */
function escapeControlChars(e) {
  return e.replace(regExp_9, (n) =>
    Array.from(
      {
        length: n.length,
      },
      (r, i) => `\\u${n.charCodeAt(i).toString(16).padStart(4, "0")}`,
    ).join(""),
  );
}
//@ chunk-cgr0tezp.js:10988-11037 placement
/**
 * 显示前归一化。
 */
function normalizeForDisplay(e) {
  return toWellFormedString(stripAnsi(e)).replace(regExp_2, " ");
}
//@ chunk-cgr0tezp.js:11037-11199 placement
/**
 * 清洗显示文本（去指定字符、压缩空白、截断）。
 */
function sanitizeDisplayText(e, n) {
  let r = normalizeForDisplay(e);
  if (n?.drop) r = r.replace(n.drop, "");
  r = r.replace(/\s+/g, " ").trim();
  if (n?.maxCodeUnits !== undefined) r = truncateToLength(r, n.maxCodeUnits).trim();
  return r;
}
//@ chunk-cgr0tezp.js:11199-11418 placement
/**
 * 截取显示文本：统一换行、限制行数与字符数、规范化每行，返回文本与是否被截断。
 */
function clipDisplayText(e, { maxCodeUnits, maxLines }) {
  let lines = e.replace(
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
//@ chunk-cgr0tezp.js:11418-11451 placement
/**
 * isAlreadySanitized：文本已是清洗后的形式。
 */
function isAlreadySanitized(e) {
  return sanitizeDisplayText(e) === e;
}
//@ chunk-cgr0tezp.js:11451-11463 placement
var MAX_TAIL_LINES_BYTES = 8192;
//@ chunk-cgr0tezp.js:11463-11877 placement
/**
 * 取文本尾部完整行。
 */
function tailLines(e, n) {
  let r = e;
  if (e.length > MAX_TAIL_LINES_BYTES) {
    let o = e.length - MAX_TAIL_LINES_BYTES;
    let a = e.slice(o).search(/[\r\n]/);
    if (a !== -1) r = e.slice(o + a + 1);
    else {
      let u =
        Math.max(
          e.lastIndexOf(`
`),
          e.lastIndexOf("\r"),
        ) + 1;
      r = truncateToLength(e.slice(u, u + MAX_TAIL_LINES_BYTES + 1), MAX_TAIL_LINES_BYTES);
    }
  }
  let lines = r.split(/\r?\n/);
  let s = [];
  for (let j = lines.length - 1; j >= 0 && s.length < n; j--) {
    let parts = lines[j].split("\r");
    for (let j = parts.length - 1; j >= 0; j--) {
      let c = sanitizeDisplayText(parts[j], {
        maxCodeUnits: 512,
      });
      if (c !== "") {
        s.push(c);
        break;
      }
    }
  }
  return s.reverse();
}
//@ chunk-cgr0tezp.js:11877-11888 placement
/**
 * 标题最大长度。
 */
var MAX_TITLE_LENGTH = 255;
//@ chunk-cgr0tezp.js:11888-11919 placement
/**
 * 清洗标题。
 */
function sanitizeTitle(e) {
  return sanitizeMarkdownInline(e, MAX_TITLE_LENGTH);
}
//@ chunk-cgr0tezp.js:11919-11951 placement
/**
 * 清洗短文本。
 */
function sanitizeShortText(e) {
  return sanitizeMarkdownInline(e, MAX_SHORT_TEXT);
}
//@ chunk-cgr0tezp.js:11951-12108 placement
function sanitizeMarkdownInline(e, n) {
  let replaced = sanitizeDisplayText(e, {
    drop: /[`<>]/g,
  })
    .replace(/\]\(/g, "] (")
    .replace(/!\[/g, "! [")
    .replace(/\]\[/g, "] [")
    .replace(/\]:/g, "] :");
  return truncateToLength(replaced, n).trim();
}
//@ chunk-cgr0tezp.js:12108-12138 placement
/**
 * markdown 安全文本长度与字符。
 */
var MAX_MARKDOWN_SAFE_LENGTH = 2048;
var MARKDOWN_BREAK_CHARS = /[`\[\]<>]/g;
//@ chunk-cgr0tezp.js:12138-12326 placement
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
//@ chunk-cgr0tezp.js:12326-12401 placement
/**
 * 不可见字符转义。
 */
function escapeInvisibleChars(e) {
  return e.replace(/[\u007F-\u009F\u2028\u2029\p{Cf}]/gu, toUnicodeEscapes);
}
//@ chunk-cgr0tezp.js:12401-12505 placement
/**
 * 字符转为 \u 转义序列。
 */
function toUnicodeEscapes(e) {
  return e
    .split("")
    .map((n) => "\\u" + n.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
}
//@ chunk-cgr0tezp.js:12505-13075 placement
/**
 * 解析并描述 URL 协议。
 */
function describeUrlScheme(e) {
  let n = 0;
  while (n < e.length && e.charCodeAt(n) <= 32) n++;
  let sliced = e.slice(n);
  let match = /^([A-Za-z0-9][A-Za-z0-9+.-]*):\/\//.exec(sliced);
  let lower = match?.[1]?.toLowerCase();
  let o = match ? sliced.slice(match[0].length) : sliced;
  let index = o.indexOf(":");
  let index_2 = o.indexOf("/");
  if (
    !(lower !== undefined
      ? lower !== "file"
      : index !== -1 && (index_2 === -1 || index < index_2) && !/^[A-Za-z]:/.test(o))
  ) {
    let y = match ? decodePercentEscapes(o) : o;
    return y.includes("@[") || y.startsWith("[");
  }
  let l = decodePercentEscapes(o);
  let d = match
    ? /^(?:[^@/?#\\[\]]+@)?(\[[0-9A-Fa-f:.]+\])(?::\d*)?(?=\/|$)/.exec(l)
    : /^[^@:/[\]]+@(\[[0-9A-Fa-f:.]+\])(?=:)/.exec(l);
  let g = d !== null && !!tryParseUrl(`ssh://${d[1]}/`)?.hostname;
  return /[[\]]/.test(l.slice(g ? d[0].length : 0));
}
//@ chunk-cgr0tezp.js:13075-13132 placement
/**
 * 尝试解析 URL。
 */
function tryParseUrl(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
//@ chunk-cgr0tezp.js:13132-13254 placement
/**
 * 解码 URL 中的 %XX 转义（保留 %00）。
 */
function decodePercentEscapes(e) {
  return e.replace(/%([0-9A-Fa-f]{2})/g, (n, r) => {
    let i = parseInt(r, 16);
    return i === 0 ? n : String.fromCharCode(i);
  });
}
//@ chunk-cgr0tezp.js:13433-13470 placement
/**
 * 构造成功结果。
 */
function ok(value) {
  return {
    ok: true,
    value,
  };
}
//@ chunk-cgr0tezp.js:13470-13507 placement
/**
 * 构造失败结果。
 */
function err(error) {
  return {
    ok: false,
    error,
  };
}
//@ chunk-cgr0tezp.js:13507-13672 placement
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
//@ chunk-cgr0tezp.js:13672-13733 placement
/**
 * unwrapResult：取出结果或抛错。
 */
function unwrapResult(e) {
  if (e.ok) return e.value;
  throw new ResultError(e.error);
}
//@ chunk-cgr0tezp.js:13733-13902 placement
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
//@ chunk-cgr0tezp.js:13902-14108 placement
/**
 * 判断错误是否为宿主拒绝的文件操作错误（code 为 Failed 且 telemetryCode 为 errno 或 ERR_ 形式）。
 */
function isHostFileError(e) {
  if (typeof e !== "object" || e === null) return false;
  let n = Reflect.get(e, "code");
  let r = Reflect.get(e, "telemetryCode");
  return (
    n === "Failed" &&
    typeof r === "string" &&
    (errnoShapedCode(r) !== undefined || /^ERR_[A-Z0-9_]+$/.test(r))
  );
}
//@ chunk-cgr0tezp.js:14108-14410 placement
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
  sanitizeDisplayText,
  MAX_TITLE_LENGTH,
  toUnicodeEscapes,
  unwrapResult,
  replaceControlChars,
  sanitizeTitle,
  MARKDOWN_BREAK_CHARS,
  MAX_MARKDOWN_SAFE_LENGTH,
  tailLines,
  ok,
  err,
  PathSpace,
  describeUrlScheme,
  escapeControlChars,
  markdownSafeText,
  normalizeForDisplay,
  escapeInvisibleChars,
  clipDisplayText,
  tryParseUrl,
  sanitizeShortText,
  decodePercentEscapes,
  isHostFileError,
  unwrapHostFileError,
  escapeNonAscii,
  escapeNonPrintable,
  isAlreadySanitized,
};
