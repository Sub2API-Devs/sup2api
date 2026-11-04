/**
 * utils/plugins/pluginRenames.ts
 *
 * 2.1.316 新增：插件改名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (2)
 * attribution: placement 2
 */
import { MAX_CACHE_PUBLISH_ATTEMPTS } from "./cachePublish.js";
import { getEnabledSettingSources, EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { getSettingsForSourceWriteSeed, updateSettingsForSource } from "../settings/settings.js";
import { logForDebugging } from "../debug.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:4488920-4489328 placement
/**
 * 沿改名表追踪插件新名字（检测环、缺失、过深）。
 */
function resolvePluginRename(pluginName, renames, validNames) {
  if (!Object.hasOwn(renames, pluginName)) return null;
  let seen = new Set();
  let current = pluginName;
  for (let idx = 0; idx < MAX_CACHE_PUBLISH_ATTEMPTS; idx++) {
    if (seen.has(current))
      return {
        kind: "unresolved",
        reason: "cycle",
      };
    seen.add(current);
    let target = Object.hasOwn(renames, current) ? renames[current] : undefined;
    if (target === undefined)
      return validNames.has(current)
        ? {
            kind: "renamed",
            to: current,
            chainDepth: idx,
          }
        : {
            kind: "unresolved",
            reason: "target-missing",
          };
    if (target === null)
      return {
        kind: "removed",
        chainDepth: idx + 1,
      };
    current = target;
  }
  return {
    kind: "unresolved",
    reason: "chain-too-deep",
  };
}
//@ chunk-e6aww6q8.js:4489328-4490242 placement
/**
 * 把设置中已改名的插件迁移到新名字。
 */
async function migrateRenamedPluginsInSettings(renames, storageV5) {
  if (renames.length === 0) return;
  let updatedCount = 0;
  let failedCount = 0;
  let enabledSources = new Set(getEnabledSettingSources());
  for (let source of EDITABLE_SETTING_SOURCES) {
    if (!enabledSources.has(source)) continue;
    let settingsForSourceWriteSeed = getSettingsForSourceWriteSeed(source);
    let enabledPlugins = settingsForSourceWriteSeed?.enabledPlugins;
    let pluginConfigs = settingsForSourceWriteSeed?.pluginConfigs;
    if (!enabledPlugins && !pluginConfigs) continue;
    let enabledUpdates = {};
    let configUpdates = {};
    for (let { oldId, newId } of renames) {
      if (enabledPlugins && oldId in enabledPlugins) {
        enabledUpdates[oldId] = undefined;
        if (newId !== null && !(newId in enabledPlugins) && !(newId in enabledUpdates))
          enabledUpdates[newId] = enabledPlugins[oldId];
      }
      if (pluginConfigs && oldId in pluginConfigs) {
        configUpdates[oldId] = undefined;
        if (newId !== null && !(newId in pluginConfigs) && !(newId in configUpdates))
          configUpdates[newId] = pluginConfigs[oldId];
      }
    }
    if (Object.keys(enabledUpdates).length === 0 && Object.keys(configUpdates).length === 0) continue;
    let { error } = await updateSettingsForSource(
      source,
      {
        ...(Object.keys(enabledUpdates).length > 0 && {
          enabledPlugins: enabledUpdates,
        }),
        ...(Object.keys(configUpdates).length > 0 && {
          pluginConfigs: configUpdates,
        }),
      },
      undefined,
      storageV5,
    );
    if (error) {
      failedCount++;
      logForDebugging(`migrateRenamedPluginsInSettings: failed to update ${source}: ${error.message}`, {
        level: "warn",
      });
    } else updatedCount++;
  }
  if (updatedCount > 0 && failedCount === 0) logFeatureOk("plugin_rename_migration");
  else if (updatedCount > 0) logFeatureSad("plugin_rename_migration", "partial_settings_write");
  else if (failedCount > 0) logFeatureBad("plugin_rename_migration", "settings_write_failed");
  else logFeatureSad("plugin_rename_migration", "no_editable_scope");
}
export { resolvePluginRename, migrateRenamedPluginsInSettings };
