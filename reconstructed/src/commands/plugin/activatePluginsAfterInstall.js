/**
 * commands/plugin/activatePluginsAfterInstall.ts
 *
 * 2.1.316 新增：安装插件后自动激活（加载、检查是否需要配置），失败时回退为需要刷新
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vrb44rx7.js (6)
 * attribution: placement 6
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { computePluginReloadImpact } from "../../utils/plugins/reloadImpact.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { resolveMissingDependencies } from "../../utils/plugins/dependencyInstall.js";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { getPluginNameFromError } from "./PluginSettings.js";
import { firstLineOf } from "../../utils/stringUtils.js";

//@ chunk-vrb44rx7.js:36255-36259 placement
init_react_production();
//@ chunk-vrb44rx7.js:36259-36406 placement
var NEEDS_CONFIG_NOTE =
  " Its bundled MCP server needs configuration before it can start \u2014 select the plugin in /plugin's Installed tab and choose Configure.";
//@ chunk-vrb44rx7.js:36406-36891 placement
/**
 * 安装后自动激活插件并记录 tengu_plugin_install_auto_activate；需要配置时返回 needs_config。
 */
async function activatePluginsAfterInstall(i, activePlugins, k, storageV5) {
  let x = await activateInstalledPlugin(i, activePlugins, k, storageV5);
  let T = x === null || x === "needs_config";
  logEvent("tengu_plugin_install_auto_activate", {
    activated: T,
    ...(x !== null && {
      reason: fromEnum(x),
    }),
  });
  if (T) logFeatureOk("plugin_install_auto_activate");
  else if (x === "cache_impact") logFeatureSad("plugin_install_auto_activate", "cache_impact");
  else logFeatureBad("plugin_install_auto_activate", x);
  if (x === null) return "activated";
  if (x === "needs_config") return "needs-config";
  if (x === "plugin_load_error") return "load-failed";
  activePlugins.markNeedsRefresh();
  return "reload-required";
}
//@ chunk-vrb44rx7.js:36891-37510 placement
async function activateInstalledPlugin(i, h, k, C) {
  let x = k;
  try {
    if ((await computePluginReloadImpact(i())).wouldInvalidateCache) return "cache_impact";
    let D = await refreshActivePlugins(h, C);
    let missingDependencies = await resolveMissingDependencies(D.errors, C);
    if (missingDependencies.installed.length > 0) {
      if ((await computePluginReloadImpact(i())).wouldInvalidateCache) return "cache_impact";
      D = await refreshActivePlugins(h, C);
      x = [...x, ...missingDependencies.installed];
    }
    if (D.error_count > D.errors.length) return "refresh_failed";
    if (D.errors.some((error) => findOrphanedPluginEntries(error, x))) return "plugin_load_error";
    if (D.warnings.some((warning) => warning.type === "mcpb-needs-config" && k.includes(warning.source)))
      return "needs_config";
    return null;
  } catch (error) {
    logError(error);
    logForDebugging(`activatePluginsAfterInstall: falling back to needsRefresh: ${errorMessage(error)}`, {
      level: "error",
    });
    return "refresh_failed";
  }
}
//@ chunk-vrb44rx7.js:37510-37815 placement
function findOrphanedPluginEntries(error, h) {
  if ("orphan" in error && error.orphan) return false;
  if (getPluginNameFromError(error) === undefined) return false;
  let k =
    "pluginId" in error && error.pluginId
      ? error.pluginId
      : "plugin" in error && error.plugin
        ? error.plugin
        : undefined;
  let C =
    k !== undefined && k.includes("@") ? k : error.source.includes("@") ? error.source : (k ?? error.source);
  return C.includes("@") ? h.includes(C) : h.some((x) => firstLineOf(x, "@") === C);
}
//@ chunk-vrb44rx7.js:37815-37819 placement
init_react_production();
export { NEEDS_CONFIG_NOTE, activatePluginsAfterInstall };
