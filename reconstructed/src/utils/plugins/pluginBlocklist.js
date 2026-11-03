/**
 * utils/plugins/pluginBlocklist.ts
 *
 * 下架强制：市场设置 forceRemoveDeletedPlugins 时，自动卸载已下架的插件并标记 flagged。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginBlocklist.ts
 * pieces: chunk-rrq1mnv6.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 */
import { resolvePluginRename } from "./pluginRenames.js";
import { loadFlaggedPlugins, getFlaggedPlugins, addFlaggedPlugin } from "./pluginFlagging.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { getInstalledPluginsAsync, getInstalledPlugins } from "./installedPluginsManager.js";
import { loadKnownMarketplacesSafe, getMarketplaceCacheOnly, getMarketplace } from "./marketplaceManager.js";
import { NPM } from "./schemas.js";
import { isPluginDirectorySource } from "./officialMarketplaceNames.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { uninstallPluginOp } from "../../services/plugins/pluginOperations.js";
import { classifyPluginCommandError, buildPluginEventFieldsFromId } from "../telemetry/pluginTelemetry.js";
import { af } from "./pluginPolicy.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";

/**
 * 找出某市场里已下架（marketplace.json 不再列出且未改名）的已安装插件 ID。
 */
//@ chunk-rrq1mnv6.js:3531-3783 callgraph-fingerprint = detectDelistedPlugins (0.296)
function detectDelistedPlugins(installedPlugins, marketplace, marketplaceName) {
  let marketplacePluginNames = new Set(marketplace.plugins.map((plugin) => plugin.name)),
    suffix = `@${marketplaceName}`,
    delisted = [];
  for (let pluginId of Object.keys(installedPlugins.plugins)) {
    if (!pluginId.endsWith(suffix)) continue;
    let pluginName = pluginId.slice(0, -suffix.length),
      S =
        marketplace.renames &&
        resolvePluginRename(pluginName, marketplace.renames, marketplacePluginNames)?.kind === "renamed";
    if (!marketplacePluginNames.has(pluginName) && !S) delisted.push(pluginId);
  }
  return delisted;
}
/**
 * 启动时扫描所有市场：设置了 forceRemoveDeletedPlugins 的市场中被下架的已安装插件自动卸载并标记（flagged），记 tengu_plugin_delisted_enforcement。
 */
//@ chunk-rrq1mnv6.js:3783-5265 fingerprint = detectAndUninstallDelistedPlugins (0.523)
async function detectAndUninstallDelistedPlugins(e) {
  await loadFlaggedPlugins(e);
  let r = isStorageV5Enabled() && e !== void 0 ? await getInstalledPluginsAsync(e) : getInstalledPlugins(),
    installedPlugins = getFlaggedPlugins(),
    g = await loadKnownMarketplacesSafe(e),
    newlyFlagged = [];
  for (let [n, u] of Object.entries(g))
    try {
      if (n.toLowerCase() === NPM) continue;
      if (isPluginDirectorySource(u.source) && !Object.keys(r.plugins).some((m) => m.endsWith(`@${n}`)))
        continue;
      let f = isPluginDirectorySource(u.source)
        ? await getMarketplaceCacheOnly(n, e, { registryEntry: u })
        : await getMarketplace(n, e);
      if (f === null) {
        if (Object.keys(r.plugins).some((m) => m.endsWith(`@${n}`)))
          logEvent("tengu_plugin_delisted_enforcement", {
            outcome: lit("scan-skipped-no-catalog"),
            is_official_marketplace: !1,
          });
        continue;
      }
      if (!f.forceRemoveDeletedPlugins) continue;
      let delisted = detectDelistedPlugins(r, f, n);
      for (let pluginId of delisted) {
        if (pluginId in installedPlugins) continue;
        let installations = r.plugins[pluginId] ?? [];
        if (!installations.some((p) => p.scope === "user" || p.scope === "project" || p.scope === "local"))
          continue;
        for (let installation of installations) {
          let { scope: scope } = installation;
          if (scope !== "user" && scope !== "project" && scope !== "local") continue;
          try {
            let y = await uninstallPluginOp(pluginId, scope, !0, e, { settingsStillOn: "remove-anyway" });
            logEvent("tengu_plugin_delisted_enforcement", {
              outcome: y.success ? lit("uninstalled") : lit("uninstall-failed"),
              scope: fromEnum(scope),
              ...(!y.success && { error_kind: fromEnum(classifyPluginCommandError(y.message)) }),
              ...buildPluginEventFieldsFromId(pluginId, af()),
            });
          } catch (error) {
            (logForDebugging(
              `Failed to auto-uninstall delisted plugin ${pluginId} from ${scope}: ${errorMessage(error)}`,
              { level: "error" },
            ),
              logEvent("tengu_plugin_delisted_enforcement", {
                outcome: lit("uninstall-failed"),
                scope: fromEnum(scope),
                error_kind: fromEnum(classifyPluginCommandError(error)),
                ...buildPluginEventFieldsFromId(pluginId, af()),
              }));
          }
        }
        (await addFlaggedPlugin(pluginId, e), newlyFlagged.push(pluginId));
      }
    } catch (error) {
      (logForDebugging(`Failed to check for delisted plugins in "${n}": ${errorMessage(error)}`, {
        level: "warn",
      }),
        logEvent("tengu_plugin_delisted_enforcement", {
          outcome: lit("scan-failed"),
          error_kind: fromEnum(classifyPluginCommandError(error)),
          _PROTO_marketplace_name: n,
          is_official_marketplace: isOfficialMarketplaceName_3(n),
        }));
    }
  return newlyFlagged;
}

export { detectAndUninstallDelistedPlugins };
