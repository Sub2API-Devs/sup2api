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
import { classifyRuleParens, escapeRuleText } from "./permissionRuleParser.js";
import { quotedPrintable } from "../printableName.js";

//@ chunk-gda5w2fs.js:2810-2886 placement
/**
 * ruleToolNameFromString：从规则串取工具名。
 */
function ruleToolNameFromString(e) {
  let n = classifyRuleParens(e);
  return n.kind === "call" && n.toolName ? n.toolName : e;
}
//@ chunk-gda5w2fs.js:2886-2988 placement
/**
 * 把规则对象格式化为 Tool(content) 字符串。
 */
function formatPermissionRule(ruleValue) {
  if (!ruleValue.ruleContent) return ruleValue.toolName;
  let n = escapeRuleText(ruleValue.ruleContent);
  return `${ruleValue.toolName}(${n})`;
}
//@ chunk-gda5w2fs.js:2988-2999 placement
/**
 * 规则取反前缀 !。
 */
var NEGATION_PREFIX = "!";
//@ chunk-gda5w2fs.js:2999-3206 placement
/**
 * 把单独的否定前缀记号与后面的规则合并为一条。
 */
function joinNegationTokens(e) {
  let n = [];
  for (let i = 0; i < e.length; i++) {
    let r = e[i];
    if (r === undefined) continue;
    let o = e[i + 1];
    if (r === NEGATION_PREFIX && o !== undefined && !o.startsWith(NEGATION_PREFIX) && !o.startsWith("(")) {
      n.push(NEGATION_PREFIX + o);
      i++;
      continue;
    }
    n.push(r);
  }
  return n;
}
//@ chunk-gda5w2fs.js:3206-3267 placement
/**
 * hasUnclosedRuleParen：规则括号是否未闭合。
 */
function hasUnclosedRuleParen(e) {
  return e.lastIndexOf("(") > e.lastIndexOf(")");
}
//@ chunk-gda5w2fs.js:3267-3472 placement
/**
 * --disallowed-tools 规则括号未闭合的错误。
 */
function unclosedParenError(rule) {
  return `Error: the --disallowed-tools rule "${quotedPrintable(rule, 64)}" has an opening parenthesis that is never closed, so a cloud session would drop it. Close the parenthesis and run the command again.`;
}
//@ chunk-gda5w2fs.js:3472-3831 placement
/**
 * 拆分逗号/空格分隔的规则列表（括号内不拆）。
 */
function splitRuleList(e) {
  if (e.length === 0) return [];
  let n = [];
  for (let t of e) {
    if (!t) continue;
    let r = "";
    let o = false;
    for (let s of t)
      switch (s) {
        case "(":
          o = true;
          r += s;
          break;
        case ")":
          o = false;
          r += s;
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
          else if (r.trim()) {
            n.push(r.trim());
            r = "";
          }
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
  for (let i = 0; i < e.length; i++)
    if (e[i] === n) {
      let r = 0;
      let o = i - 1;
      while (o >= 0 && e[o] === "\\") {
        r++;
        o--;
      }
      if (r % 2 === 0) return i;
    }
  return -1;
}
//@ chunk-gda5w2fs.js:3962-4096 placement
function lastIndexOfUnescaped(e, n) {
  for (let i = e.length - 1; i >= 0; i--)
    if (e[i] === n) {
      let r = 0;
      let o = i - 1;
      while (o >= 0 && e[o] === "\\") {
        r++;
        o--;
      }
      if (r % 2 === 0) return i;
    }
  return -1;
}
export {
  formatPermissionRule,
  ruleToolNameFromString,
  splitRuleList,
  unclosedParenError,
  hasUnclosedRuleParen,
  joinNegationTokens,
  NEGATION_PREFIX,
  indexOfUnescaped,
  lastIndexOfUnescaped,
};
