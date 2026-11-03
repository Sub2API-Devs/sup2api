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
function resolvePluginRename(e, renames, r) {
  if (!Object.hasOwn(renames, e)) return null;
  let s = new Set();
  let h = e;
  for (let idx = 0; idx < MAX_CACHE_PUBLISH_ATTEMPTS; idx++) {
    if (s.has(h))
      return {
        kind: "unresolved",
        reason: "cycle",
      };
    s.add(h);
    let S = Object.hasOwn(renames, h) ? renames[h] : undefined;
    if (S === undefined)
      return r.has(h)
        ? {
            kind: "renamed",
            to: h,
            chainDepth: idx,
          }
        : {
            kind: "unresolved",
            reason: "target-missing",
          };
    if (S === null)
      return {
        kind: "removed",
        chainDepth: idx + 1,
      };
    h = S;
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
async function migrateRenamedPluginsInSettings(e, storageV5) {
  if (e.length === 0) return;
  let r = 0;
  let s = 0;
  let h = new Set(getEnabledSettingSources());
  for (let y of EDITABLE_SETTING_SOURCES) {
    if (!h.has(y)) continue;
    let settingsForSourceWriteSeed = getSettingsForSourceWriteSeed(y);
    let enabledPlugins = settingsForSourceWriteSeed?.enabledPlugins;
    let pluginConfigs = settingsForSourceWriteSeed?.pluginConfigs;
    if (!enabledPlugins && !pluginConfigs) continue;
    let G = {};
    let q = {};
    for (let { oldId, newId } of e) {
      if (enabledPlugins && oldId in enabledPlugins) {
        G[oldId] = undefined;
        if (newId !== null && !(newId in enabledPlugins) && !(newId in G)) G[newId] = enabledPlugins[oldId];
      }
      if (pluginConfigs && oldId in pluginConfigs) {
        q[oldId] = undefined;
        if (newId !== null && !(newId in pluginConfigs) && !(newId in q)) q[newId] = pluginConfigs[oldId];
      }
    }
    if (Object.keys(G).length === 0 && Object.keys(q).length === 0) continue;
    let { error } = await updateSettingsForSource(
      y,
      {
        ...(Object.keys(G).length > 0 && {
          enabledPlugins: G,
        }),
        ...(Object.keys(q).length > 0 && {
          pluginConfigs: q,
        }),
      },
      undefined,
      storageV5,
    );
    if (error) {
      s++;
      logForDebugging(`migrateRenamedPluginsInSettings: failed to update ${y}: ${error.message}`, {
        level: "warn",
      });
    } else r++;
  }
  if (r > 0 && s === 0) logFeatureOk("plugin_rename_migration");
  else if (r > 0) logFeatureSad("plugin_rename_migration", "partial_settings_write");
  else if (s > 0) logFeatureBad("plugin_rename_migration", "settings_write_failed");
  else logFeatureSad("plugin_rename_migration", "no_editable_scope");
}
export { resolvePluginRename, migrateRenamedPluginsInSettings };
