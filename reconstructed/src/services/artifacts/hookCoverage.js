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
import { checkHookMatcherForCloud, xpe, KW } from "../../utils/hooks/matcherGrammar.js";
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
/**
 * 按工具别名扩展工具名列表
 */
//@ chunk-rxmpx0xj.js:579-827 placement
function expandToolAliases(o, t) {
  let r = [
      ...Object.entries(o.options.toolAliases ?? {}),
      ...Object.entries(getToolPermissionContext(o).toolAliases ?? {}),
    ],
    flattened = r.flatMap(([n, i]) => [...(t.includes(i) ? [n] : []), ...(t.includes(n) ? [i] : [])]),
    flattened_2 = r.flatMap(([n, i]) => (flattened.includes(i) ? [n] : []));
  return [...t, ...flattened, ...flattened_2];
}
/**
 * hook matcher 是否覆盖给定工具
 */
//@ chunk-rxmpx0xj.js:882-1130 placement
function matcherCoversTools(o, t, r = !0) {
  if (!o || o === "*") return !0;
  if (/^[a-zA-Z0-9_|, -]+$/.test(o))
    return o
      .split(/[|,]/)
      .map((e) => e.trim())
      .some((e) => t.includes(e) || t.includes(canonicalToolName(e)));
  try {
    let e = checkHookMatcherForCloud(o);
    return t.some((s) => e.test(s));
  } catch (error) {
    return r || error instanceof xpe;
  }
}
/**
 * hooks 模块的 tool.call/check 是否可能覆盖工具
 */
//@ chunk-rxmpx0xj.js:1130-1364 placement
function hooksModuleMayCoverTools(o, t, r = () => !1) {
  let filtered = getLoadedModulesForSite("tool.call").filter((n) => !r(n)),
    s = getLoadedModulesForSite("tool.check");
  return (
    hasModuleHookingSite("classic.PreToolUse", void 0, getLoadedModulesForSite("classic.PreToolUse")) ||
    o.some(
      (n) =>
        hasModuleHookingSite("tool.call", { tool: n }, filtered) ||
        hasModuleHookingSite("tool.check", t ? { tool: n } : KW({ name: n }), s),
    )
  );
}
//@ chunk-rxmpx0xj.js:1364-1480 placement
function hooksModuleMayCover(o, t) {
  try {
    let flattened = t.flatMap((s) => [s, ...legacyToolNamesFor(s)]),
      e = expandToolAliases(o, flattened);
    return hooksModuleMayCoverTools(e, e.length > flattened.length, hasLink);
  } catch {
    return !0;
  }
}
/**
 * PreToolUse hook 是否可能覆盖 artifact 工具调用。
 */
//@ chunk-rxmpx0xj.js:1480-1733 placement
function preToolUseHookMayCoverArtifact(o, t) {
  try {
    let r = t === void 0 ? flattened : [...flattened, t, ...legacyToolNamesFor(t)],
      e = expandToolAliases(o, r);
    if (hooksModuleMayCoverTools(e, e.length > r.length)) return !0;
    if (o.sessionHooksRegistry.has(o.agentId ?? o.session.id, "PreToolUse")) return !0;
    return getHooksForEvent("PreToolUse").some(
      (s) => matcherCoversTools(s.matcher, e) && hasNonInternalHook(s),
    );
  } catch {
    return !0;
  }
}
//@ chunk-rxmpx0xj.js:1733-1775 placement
var flattened_2 = [FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME].flatMap((o) => [o, ...legacyToolNamesFor(o)]);
//@ chunk-rxmpx0xj.js:1775-1861 placement
function fileEditHookLoaded() {
  return (
    hooksModuleMayCoverTools(flattened_2, !1, hasLink) ||
    getHooksForEvent("PreToolUse").some(
      (o) => matcherCoversTools(o.matcher, flattened_2, !1) && hasNonInternalHook(o),
    )
  );
}

export { hooksModuleMayCover, preToolUseHookMayCoverArtifact, fileEditHookLoaded };
