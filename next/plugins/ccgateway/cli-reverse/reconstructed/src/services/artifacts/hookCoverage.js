/**
 * services/artifacts/hookCoverage.ts
 *
 * 2.1.316 新增。PreToolUse hook 是否可能覆盖 artifact 工具调用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-am4n5h4j.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-am4n5h4j.js:570-612 placement
var flattened; // deferred: uses ARTIFACT_TOOL_NAME (../../tools/ArtifactTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-am4n5h4j.js:570", () => {
  flattened = [ARTIFACT_TOOL_NAME, ARTIFACT_DATA_TOOL_NAME].flatMap((name) => [
    name,
    ...legacyToolNamesFor(name),
  ]);
});
//@ chunk-am4n5h4j.js:612-860 placement
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
//@ chunk-am4n5h4j.js:915-1163 placement
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
//@ chunk-am4n5h4j.js:1163-1397 placement
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
//@ chunk-am4n5h4j.js:1397-1513 placement
function hooksModuleMayCover(site, tools) {
  try {
    let names = tools.flatMap((tool) => [tool, ...legacyToolNamesFor(tool)]);
    let expanded = expandToolAliases(site, names);
    return hooksModuleMayCoverTools(expanded, expanded.length > names.length, hasLink);
  } catch {
    return true;
  }
}
//@ chunk-am4n5h4j.js:1513-1766 placement
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
//@ chunk-am4n5h4j.js:1766-1808 placement
var flattened_2; // deferred: uses legacyToolNamesFor (../../utils/permissions/permissionRuleParser.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-am4n5h4j.js:1766", () => {
  flattened_2 = [EDIT, FILE_WRITE_TOOL_NAME].flatMap((name) => [name, ...legacyToolNamesFor(name)]);
});
//@ chunk-am4n5h4j.js:1808-1894 placement
function fileEditHookLoaded() {
  return (
    hooksModuleMayCoverTools(flattened_2, false, hasLink) ||
    getHooksForEvent("PreToolUse").some(
      (hook) => matcherCoversTools(hook.matcher, flattened_2, false) && hasNonInternalHook(hook),
    )
  );
}
export { preToolUseHookMayCoverArtifact, fileEditHookLoaded, hooksModuleMayCover };
