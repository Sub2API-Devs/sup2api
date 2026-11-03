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
import { Yn } from "./stripAnsi.js";
import { errnoShapedCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "./errors.js";
import { formatStorageError } from "./storage/storageErrors.js";

/**
 * 非 ASCII 字符转义为 \u。
 */
//@ chunk-cgr0tezp.js:10653-10726 placement
function escapeNonAscii(e) {
  return escapeNonPrintable(e.replace(/\\(?=u[0-9a-fA-F]{4})/g, "\\u005c"));
}
/**
 * 非打印字符转义。
 */
//@ chunk-cgr0tezp.js:10726-10779 placement
function escapeNonPrintable(e) {
  return e.replace(/[^\x20-\x7e]/g, toUnicodeEscapes);
}
/**
 * 控制字符替换为空格。
 */
//@ chunk-cgr0tezp.js:10779-10848 placement
function replaceControlChars(e) {
  return e.replace(/[\p{Cc}\p{Cf}\u2028\u2029]+/gu, " ");
}
/**
 * 控制字符转义为 \u。
 */
//@ chunk-cgr0tezp.js:10848-10988 placement
function escapeControlChars(e) {
  return e.replace(regExp_9, (n) =>
    Array.from({ length: n.length }, (r, i) => `\\u${n.charCodeAt(i).toString(16).padStart(4, "0")}`).join(
      "",
    ),
  );
}
/**
 * 显示前归一化。
 */
//@ chunk-cgr0tezp.js:10988-11037 placement
function normalizeForDisplay(e) {
  return toWellFormedString(Yn(e)).replace(regExp_2, " ");
}
/**
 * 清洗显示文本（去指定字符、压缩空白、截断）。
 */
//@ chunk-cgr0tezp.js:11037-11199 placement
function sanitizeDisplayText(e, n) {
  let r = normalizeForDisplay(e);
  if (n?.drop) r = r.replace(n.drop, "");
  if (((r = r.replace(/\s+/g, " ").trim()), n?.maxCodeUnits !== void 0))
    r = truncateToLength(r, n.maxCodeUnits).trim();
  return r;
}
/**
 * 截取显示文本：统一换行、限制行数与字符数、规范化每行，返回文本与是否被截断。
 */
//@ chunk-cgr0tezp.js:11199-11418 placement
function clipDisplayText(e, { maxCodeUnits: maxCodeUnits, maxLines: maxLines }) {
  let parts = e.replace(
      /\r\n?/g,
      `
`,
    ).split(`
`),
    joined = parts.slice(0, maxLines).map((o) => normalizeForDisplay(o.replace(/\t/g, " "))).join(`
`);
  return {
    text: truncateToLength(joined, maxCodeUnits).replace(/\n+$/, ""),
    truncated: parts.length > maxLines || joined.length > maxCodeUnits,
  };
}
//@ chunk-cgr0tezp.js:11418-11451 placement
function FDi(e) {
  return sanitizeDisplayText(e) === e;
}
//@ chunk-cgr0tezp.js:11451-11463 placement
var Ae = 8192;
/**
 * 取文本尾部完整行。
 */
//@ chunk-cgr0tezp.js:11463-11877 placement
function tailLines(e, n) {
  let r = e;
  if (e.length > Ae) {
    let o = e.length - Ae,
      search = e.slice(o).search(/[\r\n]/);
    if (search !== -1) r = e.slice(o + search + 1);
    else {
      let u =
        Math.max(
          e.lastIndexOf(`
`),
          e.lastIndexOf("\r"),
        ) + 1;
      r = truncateToLength(e.slice(u, u + Ae + 1), Ae);
    }
  }
  let parts = r.split(/\r?\n/),
    s = [];
  for (let o = parts.length - 1; o >= 0 && s.length < n; o--) {
    let parts_2 = parts[o].split("\r");
    for (let u = parts_2.length - 1; u >= 0; u--) {
      let c = sanitizeDisplayText(parts_2[u], { maxCodeUnits: 512 });
      if (c !== "") {
        s.push(c);
        break;
      }
    }
  }
  return s.reverse();
}
/**
 * 标题最大长度。
 */
//@ chunk-cgr0tezp.js:11877-11888 placement
var MAX_TITLE_LENGTH = 255;
/**
 * 清洗标题。
 */
//@ chunk-cgr0tezp.js:11888-11919 placement
function sanitizeTitle(e) {
  return sanitizeMarkdownInline(e, MAX_TITLE_LENGTH);
}
/**
 * 清洗短文本。
 */
//@ chunk-cgr0tezp.js:11919-11951 placement
function sanitizeShortText(e) {
  return sanitizeMarkdownInline(e, MAX_SHORT_TEXT);
}
//@ chunk-cgr0tezp.js:11951-12108 placement
function sanitizeMarkdownInline(e, n) {
  let replaced = sanitizeDisplayText(e, { drop: /[`<>]/g })
    .replace(/\]\(/g, "] (")
    .replace(/!\[/g, "! [")
    .replace(/\]\[/g, "] [")
    .replace(/\]:/g, "] :");
  return truncateToLength(replaced, n).trim();
}
/**
 * markdown 安全文本长度与字符。
 */
//@ chunk-cgr0tezp.js:12108-12138 placement
var MAX_MARKDOWN_SAFE_LENGTH = 2048,
  Zwr = /[`\[\]<>]/g;
/**
 * 打断 markdown 链接/HTML 的安全文本。
 */
//@ chunk-cgr0tezp.js:12138-12326 placement
function markdownSafeText(e) {
  let trimmed = sanitizeDisplayText(e)
    .replace(/\]\(/g, "] (")
    .replace(/!\[/g, "! [")
    .replace(/\]\[/g, "] [")
    .replace(/\]:/g, "] :")
    .replace(/</g, "< ")
    .replace(/\s+/g, " ")
    .trim();
  return truncateToLength(trimmed, MAX_MARKDOWN_SAFE_LENGTH).trim();
}
/**
 * 不可见字符转义。
 */
//@ chunk-cgr0tezp.js:12326-12401 placement
function escapeInvisibleChars(e) {
  return e.replace(/[\u007F-\u009F\u2028\u2029\p{Cf}]/gu, toUnicodeEscapes);
}
/**
 * 字符转为 \u 转义序列。
 */
//@ chunk-cgr0tezp.js:12401-12505 placement
function toUnicodeEscapes(e) {
  return e
    .split("")
    .map((n) => "\\u" + n.charCodeAt(0).toString(16).padStart(4, "0"))
    .join("");
}
/**
 * 解析并描述 URL 协议。
 */
//@ chunk-cgr0tezp.js:12505-13075 placement
function describeUrlScheme(e) {
  let n = 0;
  while (n < e.length && e.charCodeAt(n) <= 32) n++;
  let sliced = e.slice(n),
    match = /^([A-Za-z0-9][A-Za-z0-9+.-]*):\/\//.exec(sliced),
    s = match?.[1]?.toLowerCase(),
    o = match ? sliced.slice(match[0].length) : sliced,
    index = o.indexOf(":"),
    index_2 = o.indexOf("/");
  if (
    !(s !== void 0
      ? s !== "file"
      : index !== -1 && (index_2 === -1 || index < index_2) && !/^[A-Za-z]:/.test(o))
  ) {
    let y = match ? decodePercentEscapes(o) : o;
    return y.includes("@[") || y.startsWith("[");
  }
  let l = decodePercentEscapes(o),
    d = match
      ? /^(?:[^@/?#\\[\]]+@)?(\[[0-9A-Fa-f:.]+\])(?::\d*)?(?=\/|$)/.exec(l)
      : /^[^@:/[\]]+@(\[[0-9A-Fa-f:.]+\])(?=:)/.exec(l),
    g = d !== null && !!tryParseUrl(`ssh://${d[1]}/`)?.hostname;
  return /[[\]]/.test(l.slice(g ? d[0].length : 0));
}
/**
 * 尝试解析 URL。
 */
//@ chunk-cgr0tezp.js:13075-13132 placement
function tryParseUrl(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
/**
 * 解码 URL 中的 %XX 转义（保留 %00）。
 */
//@ chunk-cgr0tezp.js:13132-13254 placement
function decodePercentEscapes(e) {
  return e.replace(/%([0-9A-Fa-f]{2})/g, (n, r) => {
    let i = parseInt(r, 16);
    return i === 0 ? n : String.fromCharCode(i);
  });
}
/**
 * 构造成功结果。
 */
//@ chunk-cgr0tezp.js:13433-13470 placement
function ok(e) {
  return { ok: !0, value: e };
}
/**
 * 构造失败结果。
 */
//@ chunk-cgr0tezp.js:13470-13507 placement
function err(e) {
  return { ok: !1, error: e };
}
//@ chunk-cgr0tezp.js:13507-13672 placement
class ResultError extends Error {
  constructor(e) {
    super("Result was an error (see .error)");
    ((this.name = "ResultError"), Object.defineProperty(this, "error", { value: e, enumerable: !1 }));
  }
}
//@ chunk-cgr0tezp.js:13672-13733 placement
function PDi(e) {
  if (e.ok) return e.value;
  throw new ResultError(e.error);
}
/**
 * 路径空间构造（home、workspace、system 等）。
 */
//@ chunk-cgr0tezp.js:13733-13902 placement
var PathSpace = {
  home: (e) => ({ space: "home", path: e }),
  workspace: (e) => ({ space: "workspace", path: e }),
  system: (e) => ({ space: "system", path: e }),
  userNamed: (e) => ({ space: "userNamed", path: e }),
};
/**
 * 判断错误是否为宿主拒绝的文件操作错误（code 为 Failed 且 telemetryCode 为 errno 或 ERR_ 形式）。
 */
//@ chunk-cgr0tezp.js:13902-14108 placement
function isHostFileError(e) {
  if (typeof e !== "object" || e === null) return !1;
  let n = Reflect.get(e, "code"),
    r = Reflect.get(e, "telemetryCode");
  return (
    n === "Failed" && typeof r === "string" && (errnoShapedCode(r) !== void 0 || /^ERR_[A-Z0-9_]+$/.test(r))
  );
}
/**
 * 解包宿主拒绝的文件操作错误。
 */
//@ chunk-cgr0tezp.js:14108-14410 placement
function unwrapHostFileError(e) {
  if (isHostFileError(e)) {
    if (e.cause instanceof Error) return e.cause;
    return Object.assign(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        formatStorageError(e),
        "host file operation refused by the storage backend",
      ),
      { code: e.telemetryCode, cause: e },
    );
  }
  return Object.assign(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      formatStorageError(e),
      "host file operation could not be performed by the storage backend",
    ),
    { cause: e },
  );
}

export {
  sanitizeDisplayText,
  MAX_TITLE_LENGTH,
  toUnicodeEscapes,
  PDi,
  replaceControlChars,
  sanitizeTitle,
  Zwr,
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
  FDi,
};
