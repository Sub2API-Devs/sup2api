/**
 * tools/ArtifactTool/permissions/ruleTarget.ts
 *
 * 2.1.316 新增：权限规则目标
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rbtj21yz.js (10)
 * attribution: placement 10
 */
import { artifactContentOriginUrlFor, artifactViewerUrlSpellings } from "../artifactUrls.js";
import {
  canonicalizeArtifactUrlInput,
  parseArtifactUrlInput,
  parseArtifactUrl,
  ARTIFACT_COMMENTS_TOOL_NAME,
  ARTIFACT_DATA_TOOL_NAME,
  ARTIFACT_CHECK_TOOL_NAME,
  ARTIFACT_TOOL_NAME,
} from "../constants.js";
import { matchWildcard } from "../../../utils/permissions/permissionRuleParser.js";
import {
  ADDON_OF_LEGACY_ACTION,
  fromParentArtifactInput,
} from "../../../services/artifacts/artifactToolActions.js";
import {
  getDenyRuleForTool,
  getAskRuleForTool,
  matchToolRule,
  getContentRulesMapForToolName,
} from "../../../utils/permissions/permissions.js";

//@ chunk-rbtj21yz.js:664-718 placement
var _ = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)(.*)$/;
//@ chunk-rbtj21yz.js:718-924 placement
function normalizeUrlPattern(n) {
  let match = n.match(_);
  if (!match) return n;
  let lower = match[1].toLowerCase();
  if (lower === "http") lower = "https";
  let replaced = match[2]
    .toLowerCase()
    .replace(/:(?:443|80)$/, "")
    .replace(/\.(?=$|:\d+$)/, "");
  return `${lower}://${replaced}${match[3] ?? ""}`;
}
/**
 * 按 "url:<模式>" 键在映射中查找与服务器（slug/env/URL）匹配的值。归属疑为插件/连接器选项映射。
 */
//@ chunk-rbtj21yz.js:924-1357 placement = getServerUrl (1)
function getServerUrl(n, e, t, o = "url") {
  if (n.size === 0) return null;
  let r = artifactContentOriginUrlFor(e),
    l = new Set([...artifactViewerUrlSpellings(e), r, `${r}/`]);
  if (typeof t === "string") l.add(canonicalizeArtifactUrlInput(t).trim());
  for (let [u, a] of n) {
    let index = u.indexOf(":");
    if (index <= 0) continue;
    let trimmed = u.slice(0, index).trim(),
      trimmed_2 = u.slice(index + 1).trim();
    if (trimmed !== o || trimmed_2 === "") continue;
    let f = parseArtifactUrlInput(trimmed_2.replace(/\*$/, ""));
    if (f?.slug === e.slug && f.env === e.env) return a;
    let p = new Set([trimmed_2, normalizeUrlPattern(trimmed_2)]);
    for (let A of p) for (let y of l) if (matchWildcard(A, y)) return a;
  }
  return null;
}
//@ chunk-rbtj21yz.js:1357-1481 placement
function artifactUrlParses(n) {
  let e = parseArtifactUrl(n),
    t = parseArtifactUrlInput(n);
  return [
    ...(e !== null ? [e] : []),
    ...(t !== null && (e === null || e.slug !== t.slug || e.env !== t.env) ? [t] : []),
  ];
}
/**
 * 在 "url:<模式>" 内容规则映射中查找与输入 url/type_url/from_url/files 复制来源匹配的规则（规范化协议、端口与结尾点）。
 */
//@ chunk-rbtj21yz.js:1481-1963 placement
function matchUrlRule(n, e) {
  if (n.size === 0 || typeof e !== "object" || e === null) return null;
  let { url: url, type_url: type_url, from_url: from_url, files: files } = e,
    u =
      typeof files === "object" && files !== null && !Array.isArray(files)
        ? Object.values(files).map((i) => (typeof i === "object" && i !== null ? i.artifact : void 0))
        : [],
    a = [
      [url, ["url"]],
      [type_url, ["url", "type_url"]],
      [from_url, ["url", "from_url"]],
      ...u.map((i) => [i, ["url", "from_url"]]),
    ];
  for (let [i, s] of a) {
    if (typeof i !== "string") continue;
    for (let c of artifactUrlParses(i))
      for (let f of s) {
        let p = getServerUrl(n, c, i, f);
        if (p !== null) return p;
      }
  }
  return null;
}
//@ chunk-rbtj21yz.js:1963-2002 placement
var i_t = {
  comments: ARTIFACT_COMMENTS_TOOL_NAME,
  data: ARTIFACT_DATA_TOOL_NAME,
  check: ARTIFACT_CHECK_TOOL_NAME,
};
/**
 * 把 Artifact 动作映射到等价的数据工具（ArtifactData 等）与对应输入，用于规则匹配。
 */
//@ chunk-rbtj21yz.js:2002-2189 placement
function dataToolEquivalent(n, e) {
  let t = e?.action,
    o =
      typeof t === "string" && Object.hasOwn(ADDON_OF_LEGACY_ACTION, t) ? ADDON_OF_LEGACY_ACTION[t] : void 0;
  return o === void 0
    ? void 0
    : { tool: { name: i_t[o], ruleContentField: n.ruleContentField }, input: fromParentArtifactInput(o, e) };
}
/**
 * 按等价数据工具查找 deny 或 ask 规则（工具级规则优先，再按输入匹配）。
 */
//@ chunk-rbtj21yz.js:2189-2321 placement
function artifactDataRule(n, e, t, o) {
  let r = dataToolEquivalent(e, t);
  if (r === void 0) return null;
  return (
    (o === "deny" ? getDenyRuleForTool(n, r.tool) : getAskRuleForTool(n, r.tool)) ??
    matchToolRule(n, r.tool, r.input, o)
  );
}
/**
 * 在 Artifact 工具及其等价数据工具的内容规则中查找匹配输入的规则。
 */
//@ chunk-rbtj21yz.js:2321-2458 placement
function findUrlContentRule(n, e, t) {
  let o = dataToolEquivalent({ name: ARTIFACT_TOOL_NAME }, e)?.tool.name;
  for (let r of [ARTIFACT_TOOL_NAME, ...(o ? [o] : [])]) {
    let l = matchUrlRule(getContentRulesMapForToolName(n, r, t), e);
    if (l !== null) return l;
  }
  return null;
}
//@ chunk-rbtj21yz.js:2458-2556 placement
function zln(n, e, t, o) {
  let r = dataToolEquivalent(e, t);
  return matchToolRule(n, e, t, o) ?? (r === void 0 ? null : matchToolRule(n, r.tool, r.input, o));
}

export { findUrlContentRule, zln, artifactDataRule, i_t, dataToolEquivalent, getServerUrl };
