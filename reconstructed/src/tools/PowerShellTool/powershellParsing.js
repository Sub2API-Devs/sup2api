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

/**
 * PowerShell 的空白字符类（含 NEL、NBSP、各种 Unicode 空格）及开头空白正则。
 */
//@ chunk-s67vc0kc.js:496-619 placement
var POWERSHELL_WHITESPACE =
    /[\t\n\v\f\r \u0085\u00a0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]+/,
  regExp = new RegExp(`^${POWERSHELL_WHITESPACE.source}`);
//@ chunk-s67vc0kc.js:619-668 placement
var regExp_2 = new RegExp(`${`['"\u2018-\u201F]`}+`, "g");
/**
 * 跳过 PowerShell 文本开头的空白、<# #> 块注释和 # 行注释。
 */
//@ chunk-s67vc0kc.js:668-913 placement
function skipLeadingWhitespaceAndComments(e) {
  let replaced = e.replace(regExp, "");
  for (;;)
    if (replaced.startsWith("<#")) {
      let index = replaced.indexOf("#>", 2);
      if (index < 0) break;
      replaced = replaced.slice(index + 2).replace(regExp, "");
    } else if (replaced.startsWith("#")) {
      let search = replaced.search(/[\r\n]/);
      if (search < 0) break;
      replaced = replaced.slice(search).replace(regExp, "");
    } else break;
  return replaced;
}
//@ chunk-s67vc0kc.js:913-952 placement
function lW(e) {
  return e.replace(regExp_2, "");
}
//@ chunk-s67vc0kc.js:952-1027 placement
var regExp_3 = new RegExp(`^${`['"\u2018-\u201F]`}+|${`['"\u2018-\u201F]`}+$`, "g");
//@ chunk-s67vc0kc.js:1027-1066 placement
function oZ(e) {
  return e.replace(regExp_3, "");
}
//@ chunk-s67vc0kc.js:1510-1544 placement
function gP(e) {
  return unescapePowerShell(e, void 0);
}
//@ chunk-s67vc0kc.js:1544-1587 placement
var re = {
  t: "\t",
  n: `
`,
  r: "\r",
  f: "\f",
  v: "\v",
};
//@ chunk-s67vc0kc.js:1587-1616 placement
function E(e) {
  return unescapePowerShell(e, re);
}
//@ chunk-s67vc0kc.js:1616-1636 placement
var se = { 0: "\x00" };
//@ chunk-s67vc0kc.js:1636-1665 placement
function T(e) {
  return unescapePowerShell(e, se);
}
//@ chunk-s67vc0kc.js:1665-1937 placement
function unescapePowerShell(e, t) {
  return e.replace(/`(?:(`)|[\r\n]+\s*|u\{([0-9a-fA-F]{1,6})\}|([\s\S]?))/g, (n, r, a, s) => {
    if (r !== void 0) return "`";
    if (a !== void 0) {
      let c = parseInt(a, 16);
      return c <= 1114111 ? String.fromCodePoint(c) : "\uFFFD";
    }
    if (s === void 0) return "";
    if (t && s in t) return t[s];
    return s;
  });
}
//@ chunk-s67vc0kc.js:1937-1995 placement
var mVn = /[\t\n\v\f\r ]+/,
  regExp_4 = new RegExp(`^${mVn.source}`);

export { regExp_4, mVn, POWERSHELL_WHITESPACE, gP, lW, oZ, skipLeadingWhitespaceAndComments, E, T };
