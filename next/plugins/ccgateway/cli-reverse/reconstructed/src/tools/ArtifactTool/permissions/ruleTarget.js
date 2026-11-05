/**
 * tools/ArtifactTool/permissions/ruleTarget.ts
 *
 * 2.1.316 新增：权限规则目标
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rgh5rrjm.js (10)
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
  findAskRuleForTool,
  matchToolRule,
  getContentRulesMapForToolName,
} from "../../../utils/permissions/permissions.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-rgh5rrjm.js:664-718 placement
var _ = /^([A-Za-z][A-Za-z0-9+.-]*):\/\/([^/?#]*)(.*)$/;
//@ chunk-rgh5rrjm.js:718-924 placement
function normalizeUrlPattern(pattern) {
  let match = pattern.match(_);
  if (!match) return pattern;
  let lower = match[1].toLowerCase();
  if (lower === "http") lower = "https";
  let replaced = match[2]
    .toLowerCase()
    .replace(/:(?:443|80)$/, "")
    .replace(/\.(?=$|:\d+$)/, "");
  return `${lower}://${replaced}${match[3] ?? ""}`;
}
//@ chunk-rgh5rrjm.js:924-1357 placement (2.1.88 match: getServerUrl, 1)
/**
 * 按 "url:<模式>" 键在映射中查找与服务器（slug/env/URL）匹配的值。归属疑为插件/连接器选项映射。
 */
function getServerUrl(contentRulesMapForToolName, target, url, fieldName = "url") {
  if (contentRulesMapForToolName.size === 0) return null;
  let contentOrigin = artifactContentOriginUrlFor(target);
  let spellings = new Set([...artifactViewerUrlSpellings(target), contentOrigin, `${contentOrigin}/`]);
  if (typeof url === "string") spellings.add(canonicalizeArtifactUrlInput(url).trim());
  for (let [ruleContent, rule] of contentRulesMapForToolName) {
    let index = ruleContent.indexOf(":");
    if (index <= 0) continue;
    let trimmed = ruleContent.slice(0, index).trim();
    let pattern = ruleContent.slice(index + 1).trim();
    if (trimmed !== fieldName || pattern === "") continue;
    let artifactUrlInput = parseArtifactUrlInput(pattern.replace(/\*$/, ""));
    if (artifactUrlInput?.slug === target.slug && artifactUrlInput.env === target.env) return rule;
    let patterns = new Set([pattern, normalizeUrlPattern(pattern)]);
    for (let pattern of patterns)
      for (let spelling of spellings) if (matchWildcard(pattern, spelling)) return rule;
  }
  return null;
}
//@ chunk-rgh5rrjm.js:1357-1481 placement
function artifactUrlParses(url) {
  let artifactUrl = parseArtifactUrl(url);
  let artifactUrlInput = parseArtifactUrlInput(url);
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
//@ chunk-rgh5rrjm.js:1481-1963 placement
/**
 * 在 "url:<模式>" 内容规则映射中查找与输入 url/type_url/from_url/files 复制来源匹配的规则（规范化协议、端口与结尾点）。
 */
function matchUrlRule(contentRulesMapForToolName, input) {
  if (contentRulesMapForToolName.size === 0 || typeof input !== "object" || input === null) return null;
  let { url, type_url: typeUrl, from_url: fromUrl, files } = input;
  let copySources =
    typeof files === "object" && files !== null && !Array.isArray(files)
      ? Object.values(files).map((entry) =>
          typeof entry === "object" && entry !== null ? entry.artifact : undefined,
        )
      : [];
  let candidates = [
    [url, ["url"]],
    [typeUrl, ["url", "type_url"]],
    [fromUrl, ["url", "from_url"]],
    ...copySources.map((artifact) => [artifact, ["url", "from_url"]]),
  ];
  for (let [value, fieldNames] of candidates) {
    if (typeof value !== "string") continue;
    for (let artifactUrl of artifactUrlParses(value))
      for (let fieldName of fieldNames) {
        let serverUrl = getServerUrl(contentRulesMapForToolName, artifactUrl, value, fieldName);
        if (serverUrl !== null) return serverUrl;
      }
  }
  return null;
}
//@ chunk-rgh5rrjm.js:1963-2002 placement
/**
 * Artifact 动作到等价数据工具名的映射。
 */
var ARTIFACT_ACTION_TOOL_NAMES; // deferred: uses ARTIFACT_TOOL_NAME (../constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rgh5rrjm.js:1963", () => {
  ARTIFACT_ACTION_TOOL_NAMES = {
    comments: ARTIFACT_COMMENTS_TOOL_NAME,
    data: ARTIFACT_DATA_TOOL_NAME,
    check: ARTIFACT_CHECK_TOOL_NAME,
  };
});
//@ chunk-rgh5rrjm.js:2002-2189 placement
/**
 * 把 Artifact 动作映射到等价的数据工具（ArtifactData 等）与对应输入，用于规则匹配。
 */
function dataToolEquivalent(toolRef, input) {
  let action = input?.action;
  let addon =
    typeof action === "string" && Object.hasOwn(ADDON_OF_LEGACY_ACTION, action)
      ? ADDON_OF_LEGACY_ACTION[action]
      : undefined;
  return addon === undefined
    ? undefined
    : {
        tool: {
          name: ARTIFACT_ACTION_TOOL_NAMES[addon],
          ruleContentField: toolRef.ruleContentField,
        },
        input: fromParentArtifactInput(addon, input),
      };
}
//@ chunk-rgh5rrjm.js:2189-2321 placement
/**
 * 按等价数据工具查找 deny 或 ask 规则（工具级规则优先，再按输入匹配）。
 */
function artifactDataRule(toolPermissionContext, permissionContext, input, behavior) {
  let equivalent = dataToolEquivalent(permissionContext, input);
  if (equivalent === undefined) return null;
  return (
    (behavior === "deny"
      ? getDenyRuleForTool(toolPermissionContext, equivalent.tool)
      : findAskRuleForTool(toolPermissionContext, equivalent.tool)) ??
    matchToolRule(toolPermissionContext, equivalent.tool, equivalent.input, behavior)
  );
}
//@ chunk-rgh5rrjm.js:2321-2458 placement
/**
 * 在 Artifact 工具及其等价数据工具的内容规则中查找匹配输入的规则。
 */
function findUrlContentRule(toolPermissionContext, input, behavior) {
  let dataToolName = dataToolEquivalent(
    {
      name: ARTIFACT_TOOL_NAME,
    },
    input,
  )?.tool.name;
  for (let toolName of [ARTIFACT_TOOL_NAME, ...(dataToolName ? [dataToolName] : [])]) {
    let rule = matchUrlRule(getContentRulesMapForToolName(toolPermissionContext, toolName, behavior), input);
    if (rule !== null) return rule;
  }
  return null;
}
//@ chunk-rgh5rrjm.js:2458-2556 placement
/**
 * 先按 Artifact 工具匹配规则，再按等价数据工具匹配。
 */
function matchArtifactRuleOrEquivalent(context, tool, input, behavior) {
  let equivalent = dataToolEquivalent(tool, input);
  return (
    matchToolRule(context, tool, input, behavior) ??
    (equivalent === undefined ? null : matchToolRule(context, equivalent.tool, equivalent.input, behavior))
  );
}
export {
  findUrlContentRule,
  matchArtifactRuleOrEquivalent,
  artifactDataRule,
  ARTIFACT_ACTION_TOOL_NAMES,
  dataToolEquivalent,
  getServerUrl,
};
