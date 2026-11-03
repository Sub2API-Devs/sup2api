/**
 * utils/permissions/disallowedToolsFlag.ts
 *
 * 2.1.316 新增：拆分逗号/空格分隔的规则列表（括号内不拆）；--disallowed-tools 规则括号未闭合的错误等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gda5w2fs.js (9)
 * attribution: placement 9
 */
import { classifyRuleParens, m } from "./permissionRuleParser.js";
import { quotedPrintable } from "../printableName.js";

//@ chunk-gda5w2fs.js:2810-2886 placement
function Ngs(e) {
  let n = classifyRuleParens(e);
  return n.kind === "call" && n.toolName ? n.toolName : e;
}
/**
 * 把规则对象格式化为 Tool(content) 字符串。
 */
//@ chunk-gda5w2fs.js:2886-2988 placement
function formatPermissionRule(e) {
  if (!e.ruleContent) return e.toolName;
  let n = m(e.ruleContent);
  return `${e.toolName}(${n})`;
}
/**
 * 规则取反前缀 !。
 */
//@ chunk-gda5w2fs.js:2988-2999 placement
var NEGATION_PREFIX = "!";
/**
 * 把单独的否定前缀记号与后面的规则合并为一条。
 */
//@ chunk-gda5w2fs.js:2999-3206 placement
function joinNegationTokens(e) {
  let n = [];
  for (let t = 0; t < e.length; t++) {
    let r = e[t];
    if (r === void 0) continue;
    let o = e[t + 1];
    if (r === NEGATION_PREFIX && o !== void 0 && !o.startsWith(NEGATION_PREFIX) && !o.startsWith("(")) {
      (n.push(NEGATION_PREFIX + o), t++);
      continue;
    }
    n.push(r);
  }
  return n;
}
//@ chunk-gda5w2fs.js:3206-3267 placement
function rIi(e) {
  return e.lastIndexOf("(") > e.lastIndexOf(")");
}
/**
 * --disallowed-tools 规则括号未闭合的错误。
 */
//@ chunk-gda5w2fs.js:3267-3472 placement
function unclosedParenError(e) {
  return `Error: the --disallowed-tools rule "${quotedPrintable(e, 64)}" has an opening parenthesis that is never closed, so a cloud session would drop it. Close the parenthesis and run the command again.`;
}
/**
 * 拆分逗号/空格分隔的规则列表（括号内不拆）。
 */
//@ chunk-gda5w2fs.js:3472-3831 placement
function splitRuleList(e) {
  if (e.length === 0) return [];
  let n = [];
  for (let t of e) {
    if (!t) continue;
    let r = "",
      o = !1;
    for (let s of t)
      switch (s) {
        case "(":
          ((o = !0), (r += s));
          break;
        case ")":
          ((o = !1), (r += s));
          break;
        case ",":
          if (o) r += s;
          else {
            if (r.trim()) n.push(r.trim());
            r = "";
          }
          break;
        case " ":
          if (o) r += s;
          else if (r.trim()) (n.push(r.trim()), (r = ""));
          break;
        default:
          if (r || s.trim()) r += s;
      }
    if (r.trim()) n.push(r.trim());
  }
  return n;
}
//@ chunk-gda5w2fs.js:3831-3962 placement
function indexOfUnescaped(e, n) {
  for (let t = 0; t < e.length; t++)
    if (e[t] === n) {
      let r = 0,
        o = t - 1;
      while (o >= 0 && e[o] === "\\") (r++, o--);
      if (r % 2 === 0) return t;
    }
  return -1;
}
//@ chunk-gda5w2fs.js:3962-4096 placement
function lastIndexOfUnescaped(e, n) {
  for (let t = e.length - 1; t >= 0; t--)
    if (e[t] === n) {
      let r = 0,
        o = t - 1;
      while (o >= 0 && e[o] === "\\") (r++, o--);
      if (r % 2 === 0) return t;
    }
  return -1;
}

export {
  formatPermissionRule,
  Ngs,
  splitRuleList,
  unclosedParenError,
  rIi,
  joinNegationTokens,
  NEGATION_PREFIX,
  indexOfUnescaped,
  lastIndexOfUnescaped,
};
