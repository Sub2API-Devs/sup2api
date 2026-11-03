/**
 * tools/SkillTool/pluginLoadFailureNote.ts
 *
 * 2.1.316 新增：技能缺失时附带插件加载失败说明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-a5k9jscj.js (6)
 * attribution: placement 6
 */
import { isDependencyError } from "../../utils/plugins/marketplaceNames.js";
import { hasMarketplaceAlias, marketplaceOf } from "../../utils/plugins/pluginIdentifier.js";
import { directoryPluginFallbackName } from "../../utils/plugins/pluginLoader.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-a5k9jscj.js:1907-1987 placement
var Me = new Set(["userSettings", "policySettings"]),
  Pn = new Set([...Me, "session"]);
//@ chunk-a5k9jscj.js:1987-2031 placement
function isMarketplacePluginError(e) {
  return isDependencyError(e) || hasMarketplaceAlias(e.source);
}
//@ chunk-a5k9jscj.js:2031-2190 placement
function pluginNameOfError(e) {
  switch (e.type) {
    case "generic-error":
    case "manifest-validation-error":
    case "path-not-found":
      return e.plugin === void 0 ? e.path : void 0;
    default:
      return;
  }
}
//@ chunk-a5k9jscj.js:2190-2376 placement
var PLUGIN_LOAD_ERROR_LABELS = {
  "path-not-found": "path not found",
  "manifest-validation-error": "manifest invalid",
  "dependency-unsatisfied": "unmet dependency",
  "dependency-version-unsatisfied": "unmet dependency",
};
//@ chunk-a5k9jscj.js:2376-2638 placement
function describePluginLoadErrors(e) {
  return e.flatMap((n) => {
    let s = PLUGIN_LOAD_ERROR_LABELS[n.type] ?? "load error",
      i = pluginNameOfError(n);
    if (i !== void 0) {
      let d = n.type === "generic-error" ? n.manifestName : void 0,
        k = directoryPluginFallbackName(i, marketplaceOf(n.source) ?? "");
      return [{ names: d ? [d, k] : [k], category: s }];
    }
    return isDependencyError(n) ? [{ names: [n.plugin], category: s }] : [];
  });
}
/**
 * 技能找不到时，若对应插件加载失败，附上失败原因说明。
 */
//@ chunk-a5k9jscj.js:2638-3304 placement
function pluginLoadFailureNote(e, n, s) {
  let i = describePluginLoadErrors(n);
  if (i.length === 0) return;
  let index = e.indexOf(":"),
    k = index > 0 ? e.slice(0, index) : void 0,
    v = k === void 0 || s.has(k) ? void 0 : i.find((I) => I.names.includes(k));
  if (v !== void 0)
    return `The plugin "${k}" did not load in this session (${v.category}): tell the user the plugin could not be loaded here, not that the skill is not installed.`;
  let joined = uniq(i.map((I) => I.category)).join(", ");
  return `${i.length === 1 ? `1 plugin did not load in this session (${joined}); if this skill belongs to it` : `${i.length} plugins did not load in this session (${joined}); if this skill belongs to one of them`}, tell the user its plugin could not be loaded here, not that the skill is not installed.`;
}

export { isMarketplacePluginError, pluginNameOfError, pluginLoadFailureNote };
