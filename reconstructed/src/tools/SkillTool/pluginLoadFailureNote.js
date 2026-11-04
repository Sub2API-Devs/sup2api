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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-a5k9jscj.js:1907-1987 placement
/**
 * 视为插件加载错误的设置来源（userSettings、policySettings）。
 */
var PLUGIN_ERROR_SETTINGS_SCOPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLUGIN_ERROR_ALL_SCOPES;
deferInit("chunk-a5k9jscj.js:1907", () => {
  PLUGIN_ERROR_SETTINGS_SCOPES = new Set(["userSettings", "policySettings"]);
  PLUGIN_ERROR_ALL_SCOPES = new Set([...PLUGIN_ERROR_SETTINGS_SCOPES, "session"]);
});
//@ chunk-a5k9jscj.js:1987-2031 placement
function isMarketplacePluginError(error) {
  return isDependencyError(error) || hasMarketplaceAlias(error.source);
}
//@ chunk-a5k9jscj.js:2031-2190 placement
function pluginNameOfError(error) {
  switch (error.type) {
    case "generic-error":
    case "manifest-validation-error":
    case "path-not-found":
      return error.plugin === undefined ? error.path : undefined;
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
function describePluginLoadErrors(errors) {
  return errors.flatMap((error) => {
    let category = PLUGIN_LOAD_ERROR_LABELS[error.type] ?? "load error";
    let pluginName = pluginNameOfError(error);
    if (pluginName !== undefined) {
      let manifestName = error.type === "generic-error" ? error.manifestName : undefined;
      let fallbackName = directoryPluginFallbackName(pluginName, marketplaceOf(error.source) ?? "");
      return [
        {
          names: manifestName ? [manifestName, fallbackName] : [fallbackName],
          category,
        },
      ];
    }
    return isDependencyError(error)
      ? [
          {
            names: [error.plugin],
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
function pluginLoadFailureNote(skillName, errors, loadedPlugins) {
  let loadErrors = describePluginLoadErrors(errors);
  if (loadErrors.length === 0) return;
  let index = skillName.indexOf(":");
  let pluginPrefix = index > 0 ? skillName.slice(0, index) : undefined;
  let matchingError =
    pluginPrefix === undefined || loadedPlugins.has(pluginPrefix)
      ? undefined
      : loadErrors.find((loadError) => loadError.names.includes(pluginPrefix));
  if (matchingError !== undefined)
    return `The plugin "${pluginPrefix}" did not load in this session (${matchingError.category}): tell the user the plugin could not be loaded here, not that the skill is not installed.`;
  let joined = uniq(loadErrors.map((loadError) => loadError.category)).join(", ");
  return `${loadErrors.length === 1 ? `1 plugin did not load in this session (${joined}); if this skill belongs to it` : `${loadErrors.length} plugins did not load in this session (${joined}); if this skill belongs to one of them`}, tell the user its plugin could not be loaded here, not that the skill is not installed.`;
}
export { isMarketplacePluginError, pluginNameOfError, pluginLoadFailureNote };
