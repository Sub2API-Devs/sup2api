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
function ruleToolNameFromString(value) {
  let parsed = classifyRuleParens(value);
  return parsed.kind === "call" && parsed.toolName ? parsed.toolName : value;
}
//@ chunk-gda5w2fs.js:2886-2988 placement
/**
 * 把规则对象格式化为 Tool(content) 字符串。
 */
function formatPermissionRule(ruleValue) {
  if (!ruleValue.ruleContent) return ruleValue.toolName;
  let escapedContent = escapeRuleText(ruleValue.ruleContent);
  return `${ruleValue.toolName}(${escapedContent})`;
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
function joinNegationTokens(tokens) {
  let result = [];
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i];
    if (token === undefined) continue;
    let nextToken = tokens[i + 1];
    if (
      token === NEGATION_PREFIX &&
      nextToken !== undefined &&
      !nextToken.startsWith(NEGATION_PREFIX) &&
      !nextToken.startsWith("(")
    ) {
      result.push(NEGATION_PREFIX + nextToken);
      i++;
      continue;
    }
    result.push(token);
  }
  return result;
}
//@ chunk-gda5w2fs.js:3206-3267 placement
/**
 * hasUnclosedRuleParen：规则括号是否未闭合。
 */
function hasUnclosedRuleParen(text) {
  return text.lastIndexOf("(") > text.lastIndexOf(")");
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
function splitRuleList(parts) {
  if (parts.length === 0) return [];
  let rules = [];
  for (let part of parts) {
    if (!part) continue;
    let current = "";
    let inParens = false;
    for (let character of part)
      switch (character) {
        case "(":
          inParens = true;
          current += character;
          break;
        case ")":
          inParens = false;
          current += character;
          break;
        case ",":
          if (inParens) current += character;
          else {
            if (current.trim()) rules.push(current.trim());
            current = "";
          }
          break;
        case " ":
          if (inParens) current += character;
          else if (current.trim()) {
            rules.push(current.trim());
            current = "";
          }
          break;
        default:
          if (current || character.trim()) current += character;
      }
    if (current.trim()) rules.push(current.trim());
  }
  return rules;
}
//@ chunk-gda5w2fs.js:3831-3962 placement
function indexOfUnescaped(text, char) {
  for (let i = 0; i < text.length; i++)
    if (text[i] === char) {
      let backslashCount = 0;
      let scanIndex = i - 1;
      while (scanIndex >= 0 && text[scanIndex] === "\\") {
        backslashCount++;
        scanIndex--;
      }
      if (backslashCount % 2 === 0) return i;
    }
  return -1;
}
//@ chunk-gda5w2fs.js:3962-4096 placement
function lastIndexOfUnescaped(text, char) {
  for (let i = text.length - 1; i >= 0; i--)
    if (text[i] === char) {
      let backslashCount = 0;
      let scanIndex = i - 1;
      while (scanIndex >= 0 && text[scanIndex] === "\\") {
        backslashCount++;
        scanIndex--;
      }
      if (backslashCount % 2 === 0) return i;
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
