/**
 * services/artifacts/hookCoverage.ts
 *
 * 2.1.316 新增。PreToolUse hook 是否可能覆盖 artifact 工具调用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rxmpx0xj.js (8)
 * attribution: placement 8
 */
import { ARTIFACT_TOOL_NAME, ARTIFACT_DATA_TOOL_NAME } from "../../tools/ArtifactTool/constants.js";
import { legacyToolNamesFor, canonicalToolName } from "../../utils/permissions/permissionRuleParser.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  checkHookMatcherForCloud,
  MatcherUnsupportableError,
  matcherTestTarget,
} from "../../utils/hooks/matcherGrammar.js";
import {
  getLoadedModulesForSite,
  hasModuleHookingSite,
} from "../../plugins/hooksModules/loadedModuleFilters.js";
import { hasLink } from "../../utils/hasLink.js";
import { getHooksForEvent, hasNonInternalHook } from "../../utils/hooks.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";

//@ chunk-rxmpx0xj.js:537-579 placement
var flattened = [ARTIFACT_TOOL_NAME, ARTIFACT_DATA_TOOL_NAME].flatMap((o) => [o, ...legacyToolNamesFor(o)]);
//@ chunk-rxmpx0xj.js:579-827 placement
/**
 * 按工具别名扩展工具名列表
 */
function expandToolAliases(o, t) {
  let r = [
    ...Object.entries(o.options.toolAliases ?? {}),
    ...Object.entries(getToolPermissionContext(o).toolAliases ?? {}),
  ];
  let flattened = r.flatMap(([n, i]) => [...(t.includes(i) ? [n] : []), ...(t.includes(n) ? [i] : [])]);
  let flattened_2 = r.flatMap(([n, i]) => (flattened.includes(i) ? [n] : []));
  return [...t, ...flattened, ...flattened_2];
}
//@ chunk-rxmpx0xj.js:882-1130 placement
/**
 * hook matcher 是否覆盖给定工具
 */
function matcherCoversTools(matcher, t, r = true) {
  if (!matcher || matcher === "*") return true;
  if (/^[a-zA-Z0-9_|, -]+$/.test(matcher))
    return matcher
      .split(/[|,]/)
      .map((e) => e.trim())
      .some((e) => t.includes(e) || t.includes(canonicalToolName(e)));
  try {
    let e = checkHookMatcherForCloud(matcher);
    return t.some((s) => e.test(s));
  } catch (error) {
    return r || error instanceof MatcherUnsupportableError;
  }
}
//@ chunk-rxmpx0xj.js:1130-1364 placement
/**
 * hooks 模块的 tool.call/check 是否可能覆盖工具
 */
function hooksModuleMayCoverTools(o, t, hasLink = () => false) {
  let filtered = getLoadedModulesForSite("tool.call").filter((n) => !hasLink(n));
  let loadedModulesForSite = getLoadedModulesForSite("tool.check");
  return (
    hasModuleHookingSite("classic.PreToolUse", undefined, getLoadedModulesForSite("classic.PreToolUse")) ||
    o.some(
      (n) =>
        hasModuleHookingSite(
          "tool.call",
          {
            tool: n,
          },
          filtered,
        ) ||
        hasModuleHookingSite(
          "tool.check",
          t
            ? {
                tool: n,
              }
            : matcherTestTarget({
                name: n,
              }),
          loadedModulesForSite,
        ),
    )
  );
}
//@ chunk-rxmpx0xj.js:1364-1480 placement
function hooksModuleMayCover(o, t) {
  try {
    let flattened = t.flatMap((s) => [s, ...legacyToolNamesFor(s)]);
    let e = expandToolAliases(o, flattened);
    return hooksModuleMayCoverTools(e, e.length > flattened.length, hasLink);
  } catch {
    return true;
  }
}
//@ chunk-rxmpx0xj.js:1480-1733 placement
/**
 * PreToolUse hook 是否可能覆盖 artifact 工具调用。
 */
function preToolUseHookMayCoverArtifact(context, t) {
  try {
    let r = t === undefined ? flattened : [...flattened, t, ...legacyToolNamesFor(t)];
    let e = expandToolAliases(context, r);
    if (hooksModuleMayCoverTools(e, e.length > r.length)) return true;
    if (context.sessionHooksRegistry.has(context.agentId ?? context.session.id, "PreToolUse")) return true;
    return getHooksForEvent("PreToolUse").some(
      (s) => matcherCoversTools(s.matcher, e) && hasNonInternalHook(s),
    );
  } catch {
    return true;
  }
}
//@ chunk-rxmpx0xj.js:1733-1775 placement
var flattened_2 = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].flatMap((o) => [o, ...legacyToolNamesFor(o)]);
//@ chunk-rxmpx0xj.js:1775-1861 placement
function fileEditHookLoaded() {
  return (
    hooksModuleMayCoverTools(flattened_2, false, hasLink) ||
    getHooksForEvent("PreToolUse").some(
      (o) => matcherCoversTools(o.matcher, flattened_2, false) && hasNonInternalHook(o),
    )
  );
}
export { hooksModuleMayCover, preToolUseHookMayCoverArtifact, fileEditHookLoaded };
