/**
 * tools/PowerShellTool/powershellParsing.ts
 *
 * 2.1.316 新增：PowerShell 文本处理：空白类、反引号转义还原
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s67vc0kc.js (13)
 * attribution: placement 13
 */
//@ chunk-s67vc0kc.js:496-619 placement
/**
 * PowerShell 的空白字符类（含 NEL、NBSP、各种 Unicode 空格）及开头空白正则。
 */
var POWERSHELL_WHITESPACE =
  /[\t\n\v\f\r \u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/;
var regExp = new RegExp(`^${POWERSHELL_WHITESPACE.source}`);
//@ chunk-s67vc0kc.js:619-668 placement
var regExp_2 = new RegExp(`${`['"\u2018-\u201F]`}+`, "g");
//@ chunk-s67vc0kc.js:668-913 placement
/**
 * 跳过 PowerShell 文本开头的空白、<# #> 块注释和 # 行注释。
 */
function skipLeadingWhitespaceAndComments(e) {
  let replaced = e.replace(regExp, "");
  for (;;)
    if (replaced.startsWith("<#")) {
      let index = replaced.indexOf("#>", 2);
      if (index < 0) break;
      replaced = replaced.slice(index + 2).replace(regExp, "");
    } else if (replaced.startsWith("#")) {
      let n = replaced.search(/[\r\n]/);
      if (n < 0) break;
      replaced = replaced.slice(n).replace(regExp, "");
    } else break;
  return replaced;
}
//@ chunk-s67vc0kc.js:913-952 placement
/**
 * 去掉 PowerShell 参数值前的 -Param: 之类的前缀。
 */
function stripPsParameterPrefix(e) {
  return e.replace(regExp_2, "");
}
//@ chunk-s67vc0kc.js:952-1027 placement
var regExp_3 = new RegExp(`^${`['"\u2018-\u201F]`}+|${`['"\u2018-\u201F]`}+$`, "g");
//@ chunk-s67vc0kc.js:1027-1066 placement
/**
 * 去掉 FileSystem:: 之类的提供程序前缀。
 */
function stripFileSystemProviderPrefix(e) {
  return e.replace(regExp_3, "");
}
//@ chunk-s67vc0kc.js:1510-1544 placement
/**
 * 反转义 PowerShell 双引号字符串里的转义序列。
 */
function unescapePsDoubleQuoted(e) {
  return unescapePowerShell(e, undefined);
}
//@ chunk-s67vc0kc.js:1544-1587 placement
/**
 * 常见转义字符表（\t \n \r \f \v）。
 */
var PS_SIMPLE_ESCAPES = {
  t: "\t",
  n: `
`,
  r: "\r",
  f: "\f",
  v: "\v",
};
//@ chunk-s67vc0kc.js:1587-1616 placement
/**
 * 只解码常见转义字符。
 */
function unescapePsSimpleEscapes(e) {
  return unescapePowerShell(e, PS_SIMPLE_ESCAPES);
}
//@ chunk-s67vc0kc.js:1616-1636 placement
/**
 * \0 到 NUL 的转义表。
 */
var PS_NULL_ESCAPE = {
  0: "\x00",
};
//@ chunk-s67vc0kc.js:1636-1665 placement
/**
 * 把 \0 解码成 NUL 字符。
 */
function unescapePsNullEscape(e) {
  return unescapePowerShell(e, PS_NULL_ESCAPE);
}
//@ chunk-s67vc0kc.js:1665-1937 placement
function unescapePowerShell(e, t) {
  return e.replace(/`(?:(`)|[\r\n]+\s*|u\{([0-9a-fA-F]{1,6})\}|([\s\S]?))/g, (n, r, a, s) => {
    if (r !== undefined) return "`";
    if (a !== undefined) {
      let c = parseInt(a, 16);
      return c <= 1114111 ? String.fromCodePoint(c) : "\uFFFD";
    }
    if (s === undefined) return "";
    if (t && s in t) return t[s];
    return s;
  });
}
//@ chunk-s67vc0kc.js:1937-1995 placement
/**
 * 匹配 PowerShell 文本中的空白序列（含 \v \f）。
 */
var PS_LEADING_WHITESPACE_RE = /[\t\n\v\f\r ]+/;
var regExp_4 = new RegExp(`^${PS_LEADING_WHITESPACE_RE.source}`);
export {
  regExp_4,
  PS_LEADING_WHITESPACE_RE,
  POWERSHELL_WHITESPACE,
  unescapePsDoubleQuoted,
  stripPsParameterPrefix,
  stripFileSystemProviderPrefix,
  skipLeadingWhitespaceAndComments,
  unescapePsSimpleEscapes,
  unescapePsNullEscape,
};
