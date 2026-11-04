/**
 * utils/permissions/permissionRuleParser.ts
 *
 * 规则串解析 Tool(content)（括号转义、旧工具名映射）与规则唯一键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/permissionRuleParser.ts
 * pieces: chunk-dtv8x2hx.js (1), chunk-gda5w2fs.js (25)
 * attribution: fingerprint 1, placement 24, callgraph-witnessed 1
 */
import { truncateTag } from "../../components/TagTabs.js";
import { indexOfUnescaped, lastIndexOfUnescaped } from "./disallowedToolsFlag.js";

//@ chunk-gda5w2fs.js:227-458 placement
var LEGACY_TOOL_NAME_ALIASES = {
  Task: "Agent",
  KillShell: "TaskStop",
  KillBash: "TaskStop",
  ListPeers: "ListAgents",
  Brief: "SendUserMessage",
  ListMcpResources: "ListMcpResourcesTool",
  ReadMcpResource: "ReadMcpResourceTool",
  ReadMcpResourceDir: "ReadMcpResourceDirTool",
};
//@ chunk-gda5w2fs.js:458-466 placement
var LEGACY_TOOL_ALIASES = LEGACY_TOOL_NAME_ALIASES;
//@ chunk-gda5w2fs.js:466-514 placement
/**
 * 把旧工具名映射为当前名。
 */
function canonicalToolName(toolName) {
  return Object.hasOwn(LEGACY_TOOL_ALIASES, toolName) ? LEGACY_TOOL_ALIASES[toolName] : toolName;
}
//@ chunk-gda5w2fs.js:514-600 placement
/**
 * 当前工具名对应的旧名列表。
 */
function legacyToolNamesFor(canonicalName) {
  let result = [];
  for (let [legacy, canonical] of Object.entries(LEGACY_TOOL_ALIASES))
    if (canonical === canonicalName) result.push(legacy);
  return result;
}
//@ chunk-gda5w2fs.js:600-673 placement
/**
 * WORKSPACE_BASH_TOOL：workspace 的 bash 工具名；WORKSPACE_WEB_FETCH_TOOL：workspace 的 web_fetch 工具名（同一声明共 2 个绑定）。
 */
var WORKSPACE = "workspace";
var WORKSPACE_BASH_TOOL = `mcp__${WORKSPACE}__bash`;
var WORKSPACE_WEB_FETCH_TOOL = `mcp__${WORKSPACE}__web_fetch`;
//@ chunk-gda5w2fs.js:673-766 placement
/**
 * 工具名及其别名。
 */
function toolNameVariants(toolName, toolAliases) {
  let alias = toolAliases && Object.hasOwn(toolAliases, toolName) ? toolAliases[toolName] : undefined;
  return alias !== undefined && alias !== toolName ? [toolName, alias] : [toolName];
}
//@ chunk-gda5w2fs.js:766-868 placement
/**
 * 映射到指定名的别名列表。
 */
function aliasesFor(toolName, toolAliases) {
  if (!toolAliases) return [];
  let aliases = [];
  for (let [key, value] of Object.entries(toolAliases)) if (value === toolName) aliases.push(key);
  return aliases;
}
//@ chunk-gda5w2fs.js:868-906 placement
/**
 * 规则内容是否含通配符。
 */
function hasWildcard(toolName) {
  return toolName.includes("*");
}
//@ chunk-gda5w2fs.js:906-938 placement
/**
 * 通配符匹配。
 */
function matchWildcard(pattern, text) {
  return compileWildcard(pattern)(text);
}
//@ chunk-gda5w2fs.js:938-1284 placement
/**
 * 编译通配符模式为匹配函数。
 */
function compileWildcard(pattern) {
  let parts = pattern.split("*");
  let prefix = parts[0] ?? "";
  if (parts.length === 1) return (text) => prefix === text;
  let suffix = parts.at(-1) ?? "";
  let middles;
  let finders = [];
  return (text) => {
    let end = text.length - suffix.length;
    if (end < prefix.length || !text.startsWith(prefix) || !text.endsWith(suffix)) return false;
    middles ??= parts.slice(1, -1).filter((middle) => middle !== "");
    let position = prefix.length;
    for (let [index, middle] of middles.entries()) {
      let next = (finders[index] ??= truncateTag(middle))(text, position, end);
      if (next === -1) return false;
      position = next + middle.length;
    }
    return true;
  };
}
//@ chunk-gda5w2fs.js:1284-1458 placement
/**
 * 按分隔符逐段比较两个规则串，每段用通配匹配，全部匹配才返回 true。
 */
function matchRuleSegments(pattern, text, separators) {
  let patternIndex = 0;
  let textIndex = 0;
  for (;;) {
    let patternSeparatorIndex = indexOfFirstCharIn(pattern, separators, patternIndex);
    let textSeparatorIndex = indexOfFirstCharIn(text, separators, textIndex);
    if (
      pattern.charAt(patternSeparatorIndex) !== text.charAt(textSeparatorIndex) ||
      !matchWildcard(
        pattern.slice(patternIndex, patternSeparatorIndex),
        text.slice(textIndex, textSeparatorIndex),
      )
    )
      return false;
    if (patternSeparatorIndex === pattern.length) return true;
    patternIndex = patternSeparatorIndex + 1;
    textIndex = textSeparatorIndex + 1;
  }
}
//@ chunk-gda5w2fs.js:1458-1540 placement
function indexOfFirstCharIn(text, chars, fromIndex) {
  let index = fromIndex;
  while (index < text.length && !chars.includes(text.charAt(index))) index++;
  return index;
}
//@ chunk-gda5w2fs.js:1540-1573 placement
/**
 * 规则模式匹配。
 */
function matchRulePattern(pattern, text) {
  return matchWildcard(pattern, text);
}
//@ chunk-gda5w2fs.js:1573-1601 placement
/**
 * wildcardRuleRegex：把通配规则编译成正则。
 */
function wildcardRuleRegex(pattern) {
  return compileWildcard(pattern);
}
//@ chunk-gda5w2fs.js:1601-1692 placement
/**
 * escapeRuleText：转义规则文本里的反斜杠与括号。
 */
function escapeRuleText(ruleContent) {
  return ruleContent.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
//@ chunk-gda5w2fs.js:1692-1946 placement
/**
 * 转义规则内容中的特殊字符。
 */
function escapeRuleContent(content, options) {
  let replaced = content.replaceAll("\\", "\\\\").replace(/[[\]()|+^$]/g, (char) => `\\${char}`);
  if (options?.escapeGlobs) replaced = replaced.replaceAll("*", "\\*");
  if (replaced.startsWith("!") || replaced.startsWith("#")) replaced = `\\${replaced}`;
  replaced = replaced.replace(/\s+$/, (trailing) => Array.from(trailing, (char) => `\\${char}`).join(""));
  return replaced;
}
//@ chunk-gda5w2fs.js:1946-2009 placement
/**
 * 反转义规则内容。
 */
function unescapeRuleContent_2(content) {
  return content.replace(/\\([^])/g, (match, char) => (isEscapableRuleChar(char) ? char : match));
}
//@ chunk-gda5w2fs.js:2009-2039 placement
var RULE_ESCAPED_CHAR_RE = /^[\\[\]!#()|+^$*?\s]$/;
//@ chunk-gda5w2fs.js:2039-2072 placement
/**
 * isEscapableRuleChar：该字符在规则里保留转义。
 */
function isEscapableRuleChar(char) {
  return RULE_ESCAPED_CHAR_RE.test(char);
}
//@ chunk-gda5w2fs.js:2072-2114 placement
var WINDOWS_ABSOLUTE_RULE_RE = /^(?:[A-Za-z]:\\|~\\|\\(?![()!#]))/;
//@ chunk-gda5w2fs.js:2114-2147 placement
/**
 * isWindowsAbsoluteRule：规则是否以 Windows 绝对路径开头。
 */
function isWindowsAbsoluteRule(text) {
  return WINDOWS_ABSOLUTE_RULE_RE.test(text);
}
//@ chunk-gda5w2fs.js:2147-2201 placement
/**
 * unescapeRuleContent：规则内容反转义。
 */
function unescapeRuleContent(text) {
  return unescapeParens(text).replaceAll("\\\\", "\\");
}
//@ chunk-gda5w2fs.js:2201-2270 placement
/**
 * unescapeParens：去掉括号前的反斜杠。
 */
function unescapeParens(text) {
  return text.replaceAll("\\(", "(").replaceAll("\\)", ")");
}
//@ chunk-gda5w2fs.js:2270-2585 placement
/**
 * 判断规则字符串的括号形式（裸名、带内容、畸形）。
 */
function classifyRuleParens(input) {
  if (typeof input === "string" && !input.includes("(") && !input.includes(")"))
    return {
      kind: "bare",
    };
  let openIndex = indexOfUnescaped(input, "(");
  let closeIndex = lastIndexOfUnescaped(input, ")");
  if (openIndex === -1 && closeIndex === -1)
    return {
      kind: "bare",
    };
  let toolName = input.substring(0, openIndex);
  if (openIndex === -1 || closeIndex <= openIndex || closeIndex !== input.length - 1 || /[()]/.test(toolName))
    return {
      kind: "malformed",
    };
  return {
    kind: "call",
    toolName,
    rawContent: input.substring(openIndex + 1, closeIndex),
  };
}
//@ chunk-gda5w2fs.js:2585-2810 callgraph-witnessed (2.1.88 match: permissionRuleValueFromString, 0.305)
/**
 * 解析规则串：WQ 识别 "Tool(content)" 形态（括号须配对且在末尾，否则视为裸工具名/畸形）；内容为空或 "*" 等价整工具规则；内容反转义 \( \) \\；工具名经 td 做旧名→新名映射。
 */
function permissionRuleValueFromString(ruleString) {
  let parsed = classifyRuleParens(ruleString);
  if (parsed.kind !== "call" || !parsed.toolName)
    return {
      toolName: canonicalToolName(ruleString),
    };
  if (parsed.rawContent === "" || parsed.rawContent === "*")
    return {
      toolName: canonicalToolName(parsed.toolName),
    };
  let ruleContent = unescapeRuleContent(parsed.rawContent);
  return {
    toolName: canonicalToolName(parsed.toolName),
    ruleContent,
  };
}
//@ chunk-dtv8x2hx.js:24527-24606 fingerprint (2.1.88 match: permissionRuleValueToString, 0.691)
/**
 * 规则的唯一键：JSON.stringify([来源, 行为, toolName, ruleContent|null])。
 */
function permissionRuleIdentityKey(source, behavior, ruleValue) {
  return JSON.stringify([source, behavior, ruleValue.toolName, ruleValue.ruleContent ?? null]);
}
export {
  canonicalToolName,
  permissionRuleValueFromString,
  hasWildcard,
  unescapeRuleContent_2,
  toolNameVariants,
  wildcardRuleRegex,
  aliasesFor,
  matchWildcard,
  escapeRuleContent,
  WORKSPACE_BASH_TOOL,
  WORKSPACE_WEB_FETCH_TOOL,
  classifyRuleParens,
  legacyToolNamesFor,
  WORKSPACE,
  matchRulePattern,
  matchRuleSegments,
  isWindowsAbsoluteRule,
  unescapeParens,
  unescapeRuleContent,
  isEscapableRuleChar,
  permissionRuleIdentityKey,
  escapeRuleText,
};
