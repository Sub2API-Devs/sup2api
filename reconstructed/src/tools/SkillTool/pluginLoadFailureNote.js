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
/**
 * 视为插件加载错误的设置来源（userSettings、policySettings）。
 */
var PLUGIN_ERROR_SETTINGS_SCOPES = new Set(["userSettings", "policySettings"]);
var PLUGIN_ERROR_ALL_SCOPES = new Set([...PLUGIN_ERROR_SETTINGS_SCOPES, "session"]);
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
      return e.plugin === undefined ? e.path : undefined;
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
    let category = PLUGIN_LOAD_ERROR_LABELS[n.type] ?? "load error";
    let i = pluginNameOfError(n);
    if (i !== undefined) {
      let manifestName = n.type === "generic-error" ? n.manifestName : undefined;
      let k = directoryPluginFallbackName(i, marketplaceOf(n.source) ?? "");
      return [
        {
          names: manifestName ? [manifestName, k] : [k],
          category,
        },
      ];
    }
    return isDependencyError(n)
      ? [
          {
            names: [n.plugin],
            category,
          },
        ]
      : [];
  });
}
//@ chunk-a5k9jscj.js:2638-3304 placement
/**
 * 技能找不到时，若对应插件加载失败，附上失败原因说明。
 */
function pluginLoadFailureNote(skillName, errors, s) {
  let i = describePluginLoadErrors(errors);
  if (i.length === 0) return;
  let index = skillName.indexOf(":");
  let k = index > 0 ? skillName.slice(0, index) : undefined;
  let v = k === undefined || s.has(k) ? undefined : i.find((I) => I.names.includes(k));
  if (v !== undefined)
    return `The plugin "${k}" did not load in this session (${v.category}): tell the user the plugin could not be loaded here, not that the skill is not installed.`;
  let joined = uniq(i.map((I) => I.category)).join(", ");
  return `${i.length === 1 ? `1 plugin did not load in this session (${joined}); if this skill belongs to it` : `${i.length} plugins did not load in this session (${joined}); if this skill belongs to one of them`}, tell the user its plugin could not be loaded here, not that the skill is not installed.`;
}
export { isMarketplacePluginError, pluginNameOfError, pluginLoadFailureNote };
