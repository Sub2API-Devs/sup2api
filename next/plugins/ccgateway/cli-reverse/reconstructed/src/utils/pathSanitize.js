/**
 * utils/pathSanitize.ts
 *
 * 2.1.316 新增。路径清理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f86gb5sh.js (10)
 * attribution: placement 10
 */
import { posix } from "path";
import { isUncOrDevicePath } from "./pathClassification.js";
import { ANY_CONTROL_CHAR_RE } from "./stringUtils.js";
import { isNetworkRelatedPath } from "./networkPaths.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-f86gb5sh.js:295-411 placement
/**
 * 空白、盲文空格、行间注释符、控制字符、组合标记与默认可忽略字符组成的字符类源码。
 */
var INVISIBLE_CHAR_CLASS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LEADING_INVISIBLE_PATTERN;
deferInit("chunk-f86gb5sh.js:295", () => {
  INVISIBLE_CHAR_CLASS = String.raw`\s\u2800\uFFF9-\uFFFB\p{Cc}\p{M}\p{Default_Ignorable_Code_Point}`;
  LEADING_INVISIBLE_PATTERN = new RegExp(`^[${INVISIBLE_CHAR_CLASS}]+`, "u");
});
//@ chunk-f86gb5sh.js:411-450 placement
/**
 * stripLeadingInvisibleChars：去掉路径开头的空白/盲文空格/控制字符等不可见字符。
 */
function stripLeadingInvisibleChars(text) {
  return text.replace(LEADING_INVISIBLE_PATTERN, "");
}
//@ chunk-f86gb5sh.js:450-548 placement
/**
 * isUnsafePathAfterDecode：解码 %XX 后判断路径是否 UNC、逃脱上级目录或含控制字符。
 */
function isUnsafePathAfterDecode(candidate, decoded = decodePercentEncoding(candidate)) {
  return (
    isUncOrDevicePath(candidate) ||
    isNetworkPathAfterNormalize(candidate) ||
    ANY_CONTROL_CHAR_RE.test(decoded[0]) ||
    decoded
      .map(stripLeadingInvisibleChars)
      .some(
        (decodedCandidate) =>
          isUncOrDevicePath(decodedCandidate) || isNetworkPathAfterNormalize(decodedCandidate),
      )
  );
}
//@ chunk-f86gb5sh.js:548-564 placement
var LEADING_PARENT_DIR_PATTERN = /^\.\.\//;
//@ chunk-f86gb5sh.js:564-645 placement
/**
 * isNetworkPathAfterNormalize：posix 规范化后判断是否网络路径或跳出了上级目录。
 */
function isNetworkPathAfterNormalize(normalized) {
  return (
    isNetworkRelatedPath(normalized) ||
    isNetworkRelatedPath(posix.normalize(normalized).replace(LEADING_PARENT_DIR_PATTERN, "/")) ||
    (escapesParentDir(normalized) && isNetworkRelatedPath("/" + normalized))
  );
}
//@ chunk-f86gb5sh.js:645-717 placement (2.1.88 match: resolveCwdReentry, 0.844)
/**
 * （旧版名配错）规范化后是否跳出上级目录（.. 或 ../ 开头）。
 */
function escapesParentDir(normalized) {
  let normalized_2 = posix.normalize(normalized);
  return normalized_2 === ".." || normalized_2.startsWith("../");
}
//@ chunk-f86gb5sh.js:717-781 placement
/**
 * isUnsafeFileUrl：去掉 file:// 前缀后判断 URL 路径是否不安全。
 */
function isUnsafeFileUrl(url) {
  let candidate = url.slice(7);
  return isUnsafePathAfterDecode(candidate) || isUnsafePathAfterDecode(candidate.slice(1));
}
//@ chunk-f86gb5sh.js:781-838 placement
var PERCENT_ESCAPE_RUN_PATTERN = /(?:%[0-9A-Fa-f]{2}){1,512}/g;
var LEADING_PERCENT_ESCAPE_PATTERN = /^%[0-9A-Fa-f]{2}/;
//@ chunk-f86gb5sh.js:838-1114 placement
/**
 * 解码路径中的 %XX：返回按 UTF-8 解码的结果与按 Latin-1 逐字节解码的结果两种形式。
 */
function decodePercentEncoding(text) {
  if (!text.includes("%")) return [text, text];
  let textDecoder = new TextDecoder("utf-8", {
    fatal: false,
    ignoreBOM: true,
  });
  return [
    text.replace(PERCENT_ESCAPE_RUN_PATTERN, (run, offset) => {
      let afterOffset = offset + run.length;
      return textDecoder.decode(percentEscapesToBytes(run), {
        stream: LEADING_PERCENT_ESCAPE_PATTERN.test(text.slice(afterOffset, afterOffset + 3)),
      });
    }),
    text.replace(PERCENT_ESCAPE_RUN_PATTERN, (run) =>
      Array.from(percentEscapesToBytes(run), (byteValue) => String.fromCharCode(byteValue)).join(""),
    ),
  ];
}
//@ chunk-f86gb5sh.js:1114-1194 placement
function percentEscapesToBytes(escapeRun) {
  return Uint8Array.from(escapeRun.slice(1).split("%"), (hexPair) => parseInt(hexPair, 16));
}
export {
  isNetworkPathAfterNormalize,
  isUnsafeFileUrl,
  INVISIBLE_CHAR_CLASS,
  decodePercentEncoding,
  stripLeadingInvisibleChars,
  isUnsafePathAfterDecode,
};
