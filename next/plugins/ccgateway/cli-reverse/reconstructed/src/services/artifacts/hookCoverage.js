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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-rxmpx0xj.js:537-579 placement
var flattened; // deferred: uses ARTIFACT_TOOL_NAME (../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rxmpx0xj.js:537", () => {
  flattened = [ARTIFACT_TOOL_NAME, ARTIFACT_DATA_TOOL_NAME].flatMap((name) => [
    name,
    ...legacyToolNamesFor(name),
  ]);
});
//@ chunk-rxmpx0xj.js:579-827 placement
/**
 * 按工具别名扩展工具名列表
 */
function expandToolAliases(context, names) {
  let aliases = [
    ...Object.entries(context.options.toolAliases ?? {}),
    ...Object.entries(getToolPermissionContext(context).toolAliases ?? {}),
  ];
  let flattened = aliases.flatMap(([alias, canonical]) => [
    ...(names.includes(canonical) ? [alias] : []),
    ...(names.includes(alias) ? [canonical] : []),
  ]);
  let flattened_2 = aliases.flatMap(([alias, canonical]) => (flattened.includes(canonical) ? [alias] : []));
  return [...names, ...flattened, ...flattened_2];
}
//@ chunk-rxmpx0xj.js:882-1130 placement
/**
 * hook matcher 是否覆盖给定工具
 */
function matcherCoversTools(pattern, tools, allowLegacy = true) {
  if (!pattern || pattern === "*") return true;
  if (/^[a-zA-Z0-9_|, -]+$/.test(pattern))
    return pattern
      .split(/[|,]/)
      .map((token) => token.trim())
      .some((token) => tools.includes(token) || tools.includes(canonicalToolName(token)));
  try {
    let cloud = checkHookMatcherForCloud(pattern);
    return tools.some((tool) => cloud.test(tool));
  } catch (error) {
    return allowLegacy || error instanceof MatcherUnsupportableError;
  }
}
//@ chunk-rxmpx0xj.js:1130-1364 placement
/**
 * hooks 模块的 tool.call/check 是否可能覆盖工具
 */
function hooksModuleMayCoverTools(site, tools, hasLink = () => false) {
  let filtered = getLoadedModulesForSite("tool.call").filter((siteModule) => !hasLink(siteModule));
  let loadedModulesForSite = getLoadedModulesForSite("tool.check");
  return (
    hasModuleHookingSite("classic.PreToolUse", undefined, getLoadedModulesForSite("classic.PreToolUse")) ||
    site.some(
      (toolName) =>
        hasModuleHookingSite(
          "tool.call",
          {
            tool: toolName,
          },
          filtered,
        ) ||
        hasModuleHookingSite(
          "tool.check",
          tools
            ? {
                tool: toolName,
              }
            : matcherTestTarget({
                name: toolName,
              }),
          loadedModulesForSite,
        ),
    )
  );
}
//@ chunk-rxmpx0xj.js:1364-1480 placement
function hooksModuleMayCover(site, tools) {
  try {
    let names = tools.flatMap((tool) => [tool, ...legacyToolNamesFor(tool)]);
    let expanded = expandToolAliases(site, names);
    return hooksModuleMayCoverTools(expanded, expanded.length > names.length, hasLink);
  } catch {
    return true;
  }
}
//@ chunk-rxmpx0xj.js:1480-1733 placement
/**
 * PreToolUse hook 是否可能覆盖 artifact 工具调用。
 */
function preToolUseHookMayCoverArtifact(context, hookContext) {
  try {
    let tools =
      hookContext === undefined ? flattened : [...flattened, hookContext, ...legacyToolNamesFor(hookContext)];
    let expanded = expandToolAliases(context, tools);
    if (hooksModuleMayCoverTools(expanded, expanded.length > tools.length)) return true;
    if (context.sessionHooksRegistry.has(context.agentId ?? context.session.id, "PreToolUse")) return true;
    return getHooksForEvent("PreToolUse").some(
      (hook) => matcherCoversTools(hook.matcher, expanded) && hasNonInternalHook(hook),
    );
  } catch {
    return true;
  }
}
//@ chunk-rxmpx0xj.js:1733-1775 placement
var flattened_2; // deferred: uses legacyToolNamesFor (../../utils/permissions/permissionRuleParser.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-rxmpx0xj.js:1733", () => {
  flattened_2 = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].flatMap((name) => [
    name,
    ...legacyToolNamesFor(name),
  ]);
});
//@ chunk-rxmpx0xj.js:1775-1861 placement
function fileEditHookLoaded() {
  return (
    hooksModuleMayCoverTools(flattened_2, false, hasLink) ||
    getHooksForEvent("PreToolUse").some(
      (hook) => matcherCoversTools(hook.matcher, flattened_2, false) && hasNonInternalHook(hook),
    )
  );
}
export { hooksModuleMayCover, preToolUseHookMayCoverArtifact, fileEditHookLoaded };
