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
//@ chunk-rbtj21yz.js:924-1357 placement = getServerUrl (1)
/**
 * 按 "url:<模式>" 键在映射中查找与服务器（slug/env/URL）匹配的值。归属疑为插件/连接器选项映射。
 */
function getServerUrl(contentRulesMapForToolName, e, t, o = "url") {
  if (contentRulesMapForToolName.size === 0) return null;
  let r = artifactContentOriginUrlFor(e);
  let l = new Set([...artifactViewerUrlSpellings(e), r, `${r}/`]);
  if (typeof t === "string") l.add(canonicalizeArtifactUrlInput(t).trim());
  for (let [u, a] of contentRulesMapForToolName) {
    let index = u.indexOf(":");
    if (index <= 0) continue;
    let trimmed = u.slice(0, index).trim();
    let trimmed_2 = u.slice(index + 1).trim();
    if (trimmed !== o || trimmed_2 === "") continue;
    let artifactUrlInput = parseArtifactUrlInput(trimmed_2.replace(/\*$/, ""));
    if (artifactUrlInput?.slug === e.slug && artifactUrlInput.env === e.env) return a;
    let p = new Set([trimmed_2, normalizeUrlPattern(trimmed_2)]);
    for (let A of p) for (let y of l) if (matchWildcard(A, y)) return a;
  }
  return null;
}
//@ chunk-rbtj21yz.js:1357-1481 placement
function artifactUrlParses(n) {
  let artifactUrl = parseArtifactUrl(n);
  let artifactUrlInput = parseArtifactUrlInput(n);
  return [
    ...(artifactUrl !== null ? [artifactUrl] : []),
    ...(artifactUrlInput !== null &&
    (artifactUrl === null ||
      artifactUrl.slug !== artifactUrlInput.slug ||
      artifactUrl.env !== artifactUrlInput.env)
      ? [artifactUrlInput]
      : []),
  ];
}
//@ chunk-rbtj21yz.js:1481-1963 placement
/**
 * 在 "url:<模式>" 内容规则映射中查找与输入 url/type_url/from_url/files 复制来源匹配的规则（规范化协议、端口与结尾点）。
 */
function matchUrlRule(contentRulesMapForToolName, e) {
  if (contentRulesMapForToolName.size === 0 || typeof e !== "object" || e === null) return null;
  let { url, type_url: typeUrl, from_url: fromUrl, files } = e;
  let u =
    typeof files === "object" && files !== null && !Array.isArray(files)
      ? Object.values(files).map((i) => (typeof i === "object" && i !== null ? i.artifact : undefined))
      : [];
  let a = [
    [url, ["url"]],
    [typeUrl, ["url", "type_url"]],
    [fromUrl, ["url", "from_url"]],
    ...u.map((i) => [i, ["url", "from_url"]]),
  ];
  for (let [i, s] of a) {
    if (typeof i !== "string") continue;
    for (let c of artifactUrlParses(i))
      for (let f of s) {
        let serverUrl = getServerUrl(contentRulesMapForToolName, c, i, f);
        if (serverUrl !== null) return serverUrl;
      }
  }
  return null;
}
//@ chunk-rbtj21yz.js:1963-2002 placement
/**
 * Artifact 动作到等价数据工具名的映射。
 */
var ARTIFACT_ACTION_TOOL_NAMES = {
  comments: ARTIFACT_COMMENTS_TOOL_NAME,
  data: ARTIFACT_DATA_TOOL_NAME,
  check: ARTIFACT_CHECK_TOOL_NAME,
};
//@ chunk-rbtj21yz.js:2002-2189 placement
/**
 * 把 Artifact 动作映射到等价的数据工具（ArtifactData 等）与对应输入，用于规则匹配。
 */
function dataToolEquivalent(n, e) {
  let action = e?.action;
  let o =
    typeof action === "string" && Object.hasOwn(ADDON_OF_LEGACY_ACTION, action)
      ? ADDON_OF_LEGACY_ACTION[action]
      : undefined;
  return o === undefined
    ? undefined
    : {
        tool: {
          name: ARTIFACT_ACTION_TOOL_NAMES[o],
          ruleContentField: n.ruleContentField,
        },
        input: fromParentArtifactInput(o, e),
      };
}
//@ chunk-rbtj21yz.js:2189-2321 placement
/**
 * 按等价数据工具查找 deny 或 ask 规则（工具级规则优先，再按输入匹配）。
 */
function artifactDataRule(toolPermissionContext, e, t, o) {
  let r = dataToolEquivalent(e, t);
  if (r === undefined) return null;
  return (
    (o === "deny"
      ? getDenyRuleForTool(toolPermissionContext, r.tool)
      : getAskRuleForTool(toolPermissionContext, r.tool)) ??
    matchToolRule(toolPermissionContext, r.tool, r.input, o)
  );
}
//@ chunk-rbtj21yz.js:2321-2458 placement
/**
 * 在 Artifact 工具及其等价数据工具的内容规则中查找匹配输入的规则。
 */
function findUrlContentRule(toolPermissionContext, e, t) {
  let o = dataToolEquivalent(
    {
      name: ARTIFACT_TOOL_NAME,
    },
    e,
  )?.tool.name;
  for (let r of [ARTIFACT_TOOL_NAME, ...(o ? [o] : [])]) {
    let l = matchUrlRule(getContentRulesMapForToolName(toolPermissionContext, r, t), e);
    if (l !== null) return l;
  }
  return null;
}
//@ chunk-rbtj21yz.js:2458-2556 placement
/**
 * 先按 Artifact 工具匹配规则，再按等价数据工具匹配。
 */
function matchArtifactRuleOrEquivalent(n, e, t, o) {
  let r = dataToolEquivalent(e, t);
  return matchToolRule(n, e, t, o) ?? (r === undefined ? null : matchToolRule(n, r.tool, r.input, o));
}
export {
  findUrlContentRule,
  matchArtifactRuleOrEquivalent,
  artifactDataRule,
  ARTIFACT_ACTION_TOOL_NAMES,
  dataToolEquivalent,
  getServerUrl,
};
