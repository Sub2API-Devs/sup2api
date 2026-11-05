/**
 * utils/plugins/pluginBlocklist.ts
 *
 * 下架强制：市场设置 forceRemoveDeletedPlugins 时，自动卸载已下架的插件并标记 flagged。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginBlocklist.ts
 * pieces: chunk-w8hpkj60.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { resolvePluginRename } from "./pluginRenames.js";
import { loadFlaggedPlugins, getFlaggedPlugins, addFlaggedPlugin } from "./pluginFlagging.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { getInstalledPluginsAsync, getInstalledPlugins } from "./installedPluginsManager.js";
import { loadKnownMarketplacesSafe, getMarketplaceCacheOnly, getMarketplace } from "./marketplaceManager.js";
import { pluginManifestPathSchemas } from "./schemas.js";
import { isPluginDirectorySource } from "./officialMarketplaceNames.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { uninstallPluginOp } from "../../services/plugins/pluginOperations.js";
import { classifyPluginCommandError, buildPluginEventFieldsFromId } from "../telemetry/pluginTelemetry.js";
import { policyEnabledPluginNameSet } from "./pluginPolicy.js";
import { logForDebugging } from "../debug.js";
import { errorMessage } from "../errors.js";
import { isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";

//@ chunk-w8hpkj60.js:3531-3783 callgraph-fingerprint (2.1.88 match: detectDelistedPlugins, 0.296)
/**
 * 找出某市场里已下架（marketplace.json 不再列出且未改名）的已安装插件 ID。
 */
function detectDelistedPlugins(installedPlugins, marketplace, marketplaceName) {
  let marketplacePluginNames = new Set(marketplace.plugins.map((plugin) => plugin.name));
  let suffix = `@${marketplaceName}`;
  let delisted = [];
  for (let pluginId of Object.keys(installedPlugins.plugins)) {
    if (!pluginId.endsWith(suffix)) continue;
    let pluginName = pluginId.slice(0, -suffix.length);
    let renamed =
      marketplace.renames &&
      resolvePluginRename(pluginName, marketplace.renames, marketplacePluginNames)?.kind === "renamed";
    if (!marketplacePluginNames.has(pluginName) && !renamed) delisted.push(pluginId);
  }
  return delisted;
}
//@ chunk-w8hpkj60.js:3783-5265 fingerprint (2.1.88 match: detectAndUninstallDelistedPlugins, 0.523)
/**
 * 启动时扫描所有市场：设置了 forceRemoveDeletedPlugins 的市场中被下架的已安装插件自动卸载并标记（flagged），记 tengu_plugin_delisted_enforcement。
 */
async function detectAndUninstallDelistedPlugins(storageV5) {
  await loadFlaggedPlugins(storageV5);
  let installedPlugins =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await getInstalledPluginsAsync(storageV5)
      : getInstalledPlugins();
  let alreadyFlagged = getFlaggedPlugins();
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let newlyFlagged = [];
  for (let [key, value] of Object.entries(knownMarketplaces))
    try {
      if (key.toLowerCase() === pluginManifestPathSchemas) continue;
      if (
        isPluginDirectorySource(value.source) &&
        !Object.keys(installedPlugins.plugins).some((key_2) => key_2.endsWith(`@${key}`))
      )
        continue;
      let marketplace = isPluginDirectorySource(value.source)
        ? await getMarketplaceCacheOnly(key, storageV5, {
            registryEntry: value,
          })
        : await getMarketplace(key, storageV5);
      if (marketplace === null) {
        if (Object.keys(installedPlugins.plugins).some((key_2) => key_2.endsWith(`@${key}`)))
          logEvent("tengu_plugin_delisted_enforcement", {
            outcome: lit("scan-skipped-no-catalog"),
            is_official_marketplace: false,
          });
        continue;
      }
      if (!marketplace.forceRemoveDeletedPlugins) continue;
      let delisted = detectDelistedPlugins(installedPlugins, marketplace, key);
      for (let pluginId of delisted) {
        if (pluginId in alreadyFlagged) continue;
        let installations = installedPlugins.plugins[pluginId] ?? [];
        if (!installations.some((i) => i.scope === "user" || i.scope === "project" || i.scope === "local"))
          continue;
        for (let installation of installations) {
          let { scope } = installation;
          if (scope !== "user" && scope !== "project" && scope !== "local") continue;
          try {
            let outcome = await uninstallPluginOp(pluginId, scope, true, storageV5, {
              settingsStillOn: "remove-anyway",
            });
            logEvent("tengu_plugin_delisted_enforcement", {
              outcome: outcome.success ? lit("uninstalled") : lit("uninstall-failed"),
              scope: fromEnum(scope),
              ...(!outcome.success && {
                error_kind: fromEnum(classifyPluginCommandError(outcome.message)),
              }),
              ...buildPluginEventFieldsFromId(pluginId, policyEnabledPluginNameSet()),
            });
          } catch (error) {
            logForDebugging(
              `Failed to auto-uninstall delisted plugin ${pluginId} from ${scope}: ${errorMessage(error)}`,
              {
                level: "error",
              },
            );
            logEvent("tengu_plugin_delisted_enforcement", {
              outcome: lit("uninstall-failed"),
              scope: fromEnum(scope),
              error_kind: fromEnum(classifyPluginCommandError(error)),
              ...buildPluginEventFieldsFromId(pluginId, policyEnabledPluginNameSet()),
            });
          }
        }
        await addFlaggedPlugin(pluginId, storageV5);
        newlyFlagged.push(pluginId);
      }
    } catch (error) {
      logForDebugging(`Failed to check for delisted plugins in "${key}": ${errorMessage(error)}`, {
        level: "warn",
      });
      logEvent("tengu_plugin_delisted_enforcement", {
        outcome: lit("scan-failed"),
        error_kind: fromEnum(classifyPluginCommandError(error)),
        _PROTO_marketplace_name: key,
        is_official_marketplace: isOfficialMarketplaceName_3(key),
      });
    }
  return newlyFlagged;
}
export { detectAndUninstallDelistedPlugins };
