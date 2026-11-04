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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrb44rx7.js:36255-36259 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:36255", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:36259-36406 placement
var NEEDS_CONFIG_NOTE =
  " Its bundled MCP server needs configuration before it can start \u2014 select the plugin in /plugin's Installed tab and choose Configure.";
//@ chunk-vrb44rx7.js:36406-36891 placement
/**
 * 安装后自动激活插件并记录 tengu_plugin_install_auto_activate；需要配置时返回 needs_config。
 */
async function activatePluginsAfterInstall(names, activePlugins, context, storageV5) {
  let activated = await activateInstalledPlugin(names, activePlugins, context, storageV5);
  let didActivate = activated === null || activated === "needs_config";
  logEvent("tengu_plugin_install_auto_activate", {
    activated: didActivate,
    ...(activated !== null && {
      reason: fromEnum(activated),
    }),
  });
  if (didActivate) logFeatureOk("plugin_install_auto_activate");
  else if (activated === "cache_impact") logFeatureSad("plugin_install_auto_activate", "cache_impact");
  else logFeatureBad("plugin_install_auto_activate", activated);
  if (activated === null) return "activated";
  if (activated === "needs_config") return "needs-config";
  if (activated === "plugin_load_error") return "load-failed";
  activePlugins.markNeedsRefresh();
  return "reload-required";
}
//@ chunk-vrb44rx7.js:36891-37510 placement
async function activateInstalledPlugin(pluginName, activePlugins, context, storageV5) {
  let previous = context;
  try {
    if ((await computePluginReloadImpact(pluginName())).wouldInvalidateCache) return "cache_impact";
    let refreshed = await refreshActivePlugins(activePlugins, storageV5);
    let missingDependencies = await resolveMissingDependencies(refreshed.errors, storageV5);
    if (missingDependencies.installed.length > 0) {
      if ((await computePluginReloadImpact(pluginName())).wouldInvalidateCache) return "cache_impact";
      refreshed = await refreshActivePlugins(activePlugins, storageV5);
      previous = [...previous, ...missingDependencies.installed];
    }
    if (refreshed.error_count > refreshed.errors.length) return "refresh_failed";
    if (refreshed.errors.some((error) => findOrphanedPluginEntries(error, previous)))
      return "plugin_load_error";
    if (
      refreshed.warnings.some(
        (warning) => warning.type === "mcpb-needs-config" && context.includes(warning.source),
      )
    )
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
function findOrphanedPluginEntries(error, known) {
  if ("orphan" in error && error.orphan) return false;
  if (getPluginNameFromError(error) === undefined) return false;
  let pluginId =
    "pluginId" in error && error.pluginId
      ? error.pluginId
      : "plugin" in error && error.plugin
        ? error.plugin
        : undefined;
  let errorPluginId =
    pluginId !== undefined && pluginId.includes("@")
      ? pluginId
      : error.source.includes("@")
        ? error.source
        : (pluginId ?? error.source);
  return errorPluginId.includes("@")
    ? known.includes(errorPluginId)
    : known.some((name) => firstLineOf(name, "@") === errorPluginId);
}
//@ chunk-vrb44rx7.js:37815-37819 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:37815", () => {
  init_react_production();
});
export { NEEDS_CONFIG_NOTE, activatePluginsAfterInstall };
