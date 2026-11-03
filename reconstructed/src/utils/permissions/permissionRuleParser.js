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
var l = LEGACY_TOOL_NAME_ALIASES;
/**
 * 把旧工具名映射为当前名。
 */
//@ chunk-gda5w2fs.js:466-514 placement
function canonicalToolName(e) {
  return Object.hasOwn(l, e) ? l[e] : e;
}
/**
 * 当前工具名对应的旧名列表。
 */
//@ chunk-gda5w2fs.js:514-600 placement
function legacyToolNamesFor(canonicalName) {
  let result = [];
  for (let [t, r] of Object.entries(l)) if (r === canonicalName) result.push(t);
  return result;
}
//@ chunk-gda5w2fs.js:600-673 placement
var WORKSPACE = "workspace",
  w8e = `mcp__${WORKSPACE}__bash`,
  Zbr = `mcp__${WORKSPACE}__web_fetch`;
/**
 * 工具名及其别名。
 */
//@ chunk-gda5w2fs.js:673-766 placement
function toolNameVariants(e, n) {
  let t = n && Object.hasOwn(n, e) ? n[e] : void 0;
  return t !== void 0 && t !== e ? [e, t] : [e];
}
/**
 * 映射到指定名的别名列表。
 */
//@ chunk-gda5w2fs.js:766-868 placement
function aliasesFor(e, n) {
  if (!n) return [];
  let t = [];
  for (let [r, o] of Object.entries(n)) if (o === e) t.push(r);
  return t;
}
/**
 * 规则内容是否含通配符。
 */
//@ chunk-gda5w2fs.js:868-906 placement
function hasWildcard(e) {
  return e.includes("*");
}
/**
 * 通配符匹配。
 */
//@ chunk-gda5w2fs.js:906-938 placement
function matchWildcard(e, n) {
  return compileWildcard(e)(n);
}
/**
 * 编译通配符模式为匹配函数。
 */
//@ chunk-gda5w2fs.js:938-1284 placement
function compileWildcard(e) {
  let parts = e.split("*"),
    t = parts[0] ?? "";
  if (parts.length === 1) return (i) => t === i;
  let r = parts.at(-1) ?? "",
    o,
    s = [];
  return (i) => {
    let c = i.length - r.length;
    if (c < t.length || !i.startsWith(t) || !i.endsWith(r)) return !1;
    o ??= parts.slice(1, -1).filter((a) => a !== "");
    let u = t.length;
    for (let [a, f] of o.entries()) {
      let d = (s[a] ??= truncateTag(f))(i, u, c);
      if (d === -1) return !1;
      u = d + f.length;
    }
    return !0;
  };
}
/**
 * 按分隔符逐段比较两个规则串，每段用通配匹配，全部匹配才返回 true。
 */
//@ chunk-gda5w2fs.js:1284-1458 placement
function matchRuleSegments(e, n, t) {
  let r = 0,
    o = 0;
  for (;;) {
    let s = p(e, t, r),
      i = p(n, t, o);
    if (e.charAt(s) !== n.charAt(i) || !matchWildcard(e.slice(r, s), n.slice(o, i))) return !1;
    if (s === e.length) return !0;
    ((r = s + 1), (o = i + 1));
  }
}
//@ chunk-gda5w2fs.js:1458-1540 placement
function p(e, n, t) {
  let r = t;
  while (r < e.length && !n.includes(e.charAt(r))) r++;
  return r;
}
/**
 * 规则模式匹配。
 */
//@ chunk-gda5w2fs.js:1540-1573 placement
function matchRulePattern(e, n) {
  return matchWildcard(e, n);
}
//@ chunk-gda5w2fs.js:1573-1601 placement
function eSr(e) {
  return compileWildcard(e);
}
//@ chunk-gda5w2fs.js:1601-1692 placement
function m(e) {
  return e.replaceAll("\\", "\\\\").replaceAll("(", "\\(").replaceAll(")", "\\)");
}
/**
 * 转义规则内容中的特殊字符。
 */
//@ chunk-gda5w2fs.js:1692-1946 placement
function escapeRuleContent(e, n) {
  let replaced = e.replaceAll("\\", "\\\\").replace(/[[\]()|+^$]/g, (r) => `\\${r}`);
  if (n?.escapeGlobs) replaced = replaced.replaceAll("*", "\\*");
  if (replaced.startsWith("!") || replaced.startsWith("#")) replaced = `\\${replaced}`;
  return ((replaced = replaced.replace(/\s+$/, (r) => Array.from(r, (o) => `\\${o}`).join(""))), replaced);
}
/**
 * 反转义规则内容。
 */
//@ chunk-gda5w2fs.js:1946-2009 placement
function unescapeRuleContent(content) {
  return content.replace(/\\([^])/g, (n, t) => (eMn(t) ? t : n));
}
//@ chunk-gda5w2fs.js:2009-2039 placement
var A = /^[\\[\]!#()|+^$*?\s]$/;
//@ chunk-gda5w2fs.js:2039-2072 placement
function eMn(e) {
  return A.test(e);
}
//@ chunk-gda5w2fs.js:2072-2114 placement
var b = /^(?:[A-Za-z]:\\|~\\|\\(?![()!#]))/;
//@ chunk-gda5w2fs.js:2114-2147 placement
function Dgs(e) {
  return b.test(e);
}
//@ chunk-gda5w2fs.js:2147-2201 placement
function Lgs(e) {
  return Hgs(e).replaceAll("\\\\", "\\");
}
//@ chunk-gda5w2fs.js:2201-2270 placement
function Hgs(e) {
  return e.replaceAll("\\(", "(").replaceAll("\\)", ")");
}
/**
 * 判断规则字符串的括号形式（裸名、带内容、畸形）。
 */
//@ chunk-gda5w2fs.js:2270-2585 placement
function classifyRuleParens(e) {
  if (typeof e === "string" && !e.includes("(") && !e.includes(")")) return { kind: "bare" };
  let n = indexOfUnescaped(e, "("),
    t = lastIndexOfUnescaped(e, ")");
  if (n === -1 && t === -1) return { kind: "bare" };
  let substring = e.substring(0, n);
  if (n === -1 || t <= n || t !== e.length - 1 || /[()]/.test(substring)) return { kind: "malformed" };
  return { kind: "call", toolName: substring, rawContent: e.substring(n + 1, t) };
}
/**
 * 解析规则串：WQ 识别 "Tool(content)" 形态（括号须配对且在末尾，否则视为裸工具名/畸形）；内容为空或 "*" 等价整工具规则；内容反转义 \( \) \\；工具名经 td 做旧名→新名映射。
 */
//@ chunk-gda5w2fs.js:2585-2810 callgraph-witnessed = permissionRuleValueFromString (0.305)
function permissionRuleValueFromString(ruleString) {
  let parsed = classifyRuleParens(ruleString);
  if (parsed.kind !== "call" || !parsed.toolName) return { toolName: canonicalToolName(ruleString) };
  if (parsed.rawContent === "" || parsed.rawContent === "*")
    return { toolName: canonicalToolName(parsed.toolName) };
  let ruleContent = Lgs(parsed.rawContent);
  return { toolName: canonicalToolName(parsed.toolName), ruleContent: ruleContent };
}
/**
 * 规则的唯一键：JSON.stringify([来源, 行为, toolName, ruleContent|null])。
 */
//@ chunk-dtv8x2hx.js:24527-24606 fingerprint = permissionRuleValueToString (0.691)
function permissionRuleIdentityKey(source, behavior, ruleValue) {
  return JSON.stringify([source, behavior, ruleValue.toolName, ruleValue.ruleContent ?? null]);
}

export {
  canonicalToolName,
  permissionRuleValueFromString,
  hasWildcard,
  unescapeRuleContent,
  toolNameVariants,
  eSr,
  aliasesFor,
  matchWildcard,
  escapeRuleContent,
  w8e,
  Zbr,
  classifyRuleParens,
  legacyToolNamesFor,
  WORKSPACE,
  matchRulePattern,
  matchRuleSegments,
  permissionRuleIdentityKey,
  eMn,
  Dgs,
  Hgs,
  Lgs,
  m,
};
