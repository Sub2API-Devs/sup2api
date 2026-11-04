/**
 * services/artifacts/textSanitize.ts
 *
 * 2.1.316 新增：页面文本清洗（控制字符、截断）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-99h01h55.js (10)
 * attribution: placement 10
 */
import { QUOTE_HOMOGLYPHS, SINGLE_QUOTE_RUNS } from "../../tools/ArtifactTool/artifactUrls.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-99h01h55.js:1732-1800 placement
/**
 * 显示文本用的小写标签正则（`[a-z][a-z_-]{0,31}`）与掩码器。
 */
var SAFE_LABEL_TEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_LABEL_RE;
deferInit("chunk-99h01h55.js:1732", () => {
  SAFE_LABEL_TEXT = "[a-z][a-z_-]{0,31}";
  SAFE_LABEL_RE = new RegExp("^[a-z][a-z_-]{0,31}$");
});
//@ chunk-99h01h55.js:1800-1851 placement
/**
 * 导出函数 `isMeaningfulFlag`：参数 e，返回 e !== void 0 && e !== null && e !== !1。
 */
function isMeaningfulFlag(flag) {
  return flag !== undefined && flag !== null && flag !== false;
}
//@ chunk-99h01h55.js:1851-1886 placement
var LIVE_DOC = "live-doc";
var INDEX_HTML = "index.html";
//@ chunk-99h01h55.js:1886-2133 placement
/**
 * 文本清洗用的常量与正则：长度上限、安全标识正则、不可见/默认忽略字符类、省略号类字符、需转义的单字符判定。
 */
var MAX_SANITIZED_TEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_LISTED_MCP_SERVERS;
var SAFE_ID_RE;
var MAX_NAME_LENGTH;
var INVISIBLE_LOOKALIKES;
var IGNORABLE_CLASS;
var ELLIPSIS_CHARS;
var ESCAPE_CHAR_RE;
deferInit("chunk-99h01h55.js:1886", () => {
  MAX_SANITIZED_TEXT = 128;
  MAX_LISTED_MCP_SERVERS = 32;
  SAFE_ID_RE = /^[A-Za-z0-9_.-]{1,128}$/;
  MAX_NAME_LENGTH = 64;
  INVISIBLE_LOOKALIKES = "\u2800\uD834\uDD59\uD80D\uDC41\uD80D\uDC42\uFFFC";
  IGNORABLE_CLASS = `${INVISIBLE_LOOKALIKES}\\p{Cf}\\p{Default_Ignorable_Code_Point}`;
  ELLIPSIS_CHARS = "\u2026\u22EF\uFE19";
  ESCAPE_CHAR_RE = new RegExp(`^(?:[<>\\\\${ELLIPSIS_CHARS}]|[${IGNORABLE_CLASS}]|[^ \\P{Z}]|\\p{C})$`, "u");
});
//@ chunk-99h01h55.js:2133-2249 placement
/**
 * 生成判断空格是否需要遮蔽的函数：字符串首尾的空格和连续空格中的后一个返回 true。
 */
function makeEdgeSpaceMasker(text) {
  let last = Array.from(text).length - 1;
  let prev = "";
  return (char, index) => {
    let mask = char === " " && (index === 0 || index === last || prev === " ");
    prev = char;
    return mask;
  };
}
//@ chunk-99h01h55.js:2249-2317 placement
function displaySafetyMasker(text) {
  let edgeSpaceMasker = makeEdgeSpaceMasker(text);
  let index = -1;
  return (char) => {
    index++;
    return edgeSpaceMasker(char, index) || ESCAPE_CHAR_RE.test(char);
  };
}
//@ chunk-99h01h55.js:2317-3699 placement
/**
 * 显示文本安全检查用的一组正则：可打印字符、首尾字符约束、双向控制符、组合字符堆叠、需剥离字符、"host:" 前缀及其同形冒号/RTL 变体、阿拉伯格式字符、需转义字符等。
 */
var PRINTABLE_TEXT_RE; // deferred: uses QUOTE_HOMOGLYPHS (../../tools/ArtifactTool/artifactUrls.js) of its import cycle while loading; runs once the cycle is complete
var WELL_FORMED_EDGES_RE;
var BIDI_CONTROL_RE;
var MARK_STACK_RE;
var STRIPPABLE_RE;
var COLON_LOOKALIKES;
var HOST_PREFIX_RE;
var SYRIAC_COLONS;
var HOST_SYRIAC_RE;
var RTL_SCRIPT_RE;
var HOST_WORD_RE;
var LEADING_HOST_RE;
var ARABIC_FORMAT_RE;
var COLON_LOOKALIKE_RE;
var ESCAPE_NEEDED_RE;
var DISPLAY_UNSAFE_RE;
deferInit("chunk-99h01h55.js:2317", () => {
  PRINTABLE_TEXT_RE = /^[\p{L}\p{M}\p{N}\p{P}\p{S}\p{Cf} ]+$/u;
  WELL_FORMED_EDGES_RE = new RegExp(
    `^(?![${IGNORABLE_CLASS}])[\\p{L}\\p{N}\\p{P}\\p{S}](?:.*[^ ${IGNORABLE_CLASS}\\p{M}])?\\p{M}*$`,
    "su",
  );
  BIDI_CONTROL_RE = /\p{Bidi_Control}/u;
  MARK_STACK_RE = new RegExp(`\\p{M}(?:[${IGNORABLE_CLASS}]*\\p{M}){8}`, "u");
  STRIPPABLE_RE = new RegExp(`[ ${IGNORABLE_CLASS}\\p{Mn}\\p{Me}\\p{Variation_Selector}]`, "gu");
  COLON_LOOKALIKES =
    ":\u02D0\u02D1\u02F8\u0589\u05C3\u0703\u0704\u0705\u0706\u0707\u0708\u0709\u0903\u0983\u0A03\u0A83\u0B03\u0C03\u0C83\u0D03\u0D83\u0F7F\u1038\u1361\u1365\u1366\u16EC\u17C7\u1803\u1804\u1809\u1B04\u1B82\u205A\u205D\u205E\u2236\u2237\u2806\u2982\u2D42\u2D53\u2D57\uA4FD\uA6F4\uA789\uA881\uA983\uAAF5\uFE13\uFE30\uFE55\uFF1A\uD804\uDC02\uD804\uDC82\uD804\uDD82\uD804\uDF03\uD805\uDC45\uD805\uDCC1\uD805\uDDBE\uD805\uDE3E\uD805\uDEAC\uD806\uDC38\uD806\uDDDF\uD806\uDE39\uD806\uDE97\uD807\uDC3E\uD807\uDD96\uD807\uDF03\uD801\uDF81\uD801\uDF82";
  HOST_PREFIX_RE = new RegExp(`^host[${COLON_LOOKALIKES}]`, "iu");
  SYRIAC_COLONS = "\u05C3\u0703\u0704\u0705\u0706\u0707\u0708\u0709";
  HOST_SYRIAC_RE = new RegExp(`^host.*[${SYRIAC_COLONS}]`, "iu");
  RTL_SCRIPT_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFE\u{10800}-\u{10FFF}\u{1E800}-\u{1EFFF}]/u;
  HOST_WORD_RE = new RegExp(
    `(?:^|[^a-z])host[${COLON_LOOKALIKES}]|[${COLON_LOOKALIKES}]host(?:$|[^a-z])`,
    "iu",
  );
  LEADING_HOST_RE = new RegExp(`^[^\\p{L}]*[${COLON_LOOKALIKES}]host(?:$|[^a-z])`, "iu");
  ARABIC_FORMAT_RE = /[\u0600-\u0605\u06DD\u070F\u0890\u0891\u08E2]/u;
  COLON_LOOKALIKE_RE = new RegExp(`(?![${SYRIAC_COLONS}])[${COLON_LOOKALIKES}]`, "gu");
  ESCAPE_NEEDED_RE = new RegExp(
    `["<>\\\\\`${IGNORABLE_CLASS}${ELLIPSIS_CHARS}]|${QUOTE_HOMOGLYPHS.source}|${SINGLE_QUOTE_RUNS.source}`,
    "gu",
  );
  DISPLAY_UNSAFE_RE = new RegExp(`^\\p{M}+|[^ \\P{Z}]|[\\p{C}\\p{Cn}]|${ESCAPE_NEEDED_RE.source}`, "gu");
});
//@ chunk-99h01h55.js:3699-3844 placement
/**
 * 判断文本（分解与兼容规范化后去掉忽略字符）是否看起来像主机名标签。
 */
function looksLikeHostLabel(serverName) {
  let normalized = serverName.normalize("NFD");
  let prefix = RTL_SCRIPT_RE.test(normalized);
  let text = normalized.replace(STRIPPABLE_RE, "");
  return (
    hasHostLikePrefix(text, prefix) ||
    hasHostLikePrefix(
      text.replace(COLON_LOOKALIKE_RE, ":").normalize("NFKC").replace(STRIPPABLE_RE, ""),
      prefix,
    )
  );
}
//@ chunk-99h01h55.js:3844-3918 placement
function hasHostLikePrefix(text, prefix) {
  return (
    HOST_PREFIX_RE.test(text) ||
    HOST_SYRIAC_RE.test(text) ||
    (prefix && HOST_WORD_RE.test(text)) ||
    LEADING_HOST_RE.test(text)
  );
}
//@ chunk-99h01h55.js:3918-4051 placement
/**
 * 转义单个字符：引号与反斜杠加反斜杠，其他字符转成 \\uXXXX。
 */
function escapeChar(ch) {
  return ch === '"' || ch === "\\"
    ? `\\${ch}`
    : ch
        .split("")
        .map((ch) => `\\u${ch.charCodeAt(0).toString(16).padStart(4, "0")}`)
        .join("");
}
export {
  LIVE_DOC,
  INDEX_HTML,
  SAFE_LABEL_RE,
  MAX_SANITIZED_TEXT,
  MAX_LISTED_MCP_SERVERS,
  isMeaningfulFlag,
  SAFE_LABEL_TEXT,
  MAX_NAME_LENGTH,
  PRINTABLE_TEXT_RE,
  WELL_FORMED_EDGES_RE,
  BIDI_CONTROL_RE,
  ARABIC_FORMAT_RE,
  MARK_STACK_RE,
  looksLikeHostLabel,
  ESCAPE_NEEDED_RE,
  escapeChar,
  displaySafetyMasker,
  DISPLAY_UNSAFE_RE,
  SAFE_ID_RE,
  ESCAPE_CHAR_RE,
  makeEdgeSpaceMasker,
};
