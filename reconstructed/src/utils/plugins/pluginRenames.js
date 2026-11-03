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
import { vbs } from "./cachePublish.js";
import { getEnabledSettingSources, EDITABLE_SETTING_SOURCES } from "../settings/constants.js";
import { getSettingsForSourceWriteSeed, updateSettingsForSource } from "../settings/settings.js";
import { logForDebugging } from "../debug.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

/**
 * 沿改名表追踪插件新名字（检测环、缺失、过深）。
 */
//@ chunk-e6aww6q8.js:4488920-4489328 placement
function resolvePluginRename(e, n, r) {
  if (!Object.hasOwn(n, e)) return null;
  let s = new Set(),
    h = e;
  for (let y = 0; y < vbs; y++) {
    if (s.has(h)) return { kind: "unresolved", reason: "cycle" };
    s.add(h);
    let S = Object.hasOwn(n, h) ? n[h] : void 0;
    if (S === void 0)
      return r.has(h)
        ? { kind: "renamed", to: h, chainDepth: y }
        : { kind: "unresolved", reason: "target-missing" };
    if (S === null) return { kind: "removed", chainDepth: y + 1 };
    h = S;
  }
  return { kind: "unresolved", reason: "chain-too-deep" };
}
/**
 * 把设置中已改名的插件迁移到新名字。
 */
//@ chunk-e6aww6q8.js:4489328-4490242 placement
async function migrateRenamedPluginsInSettings(e, n) {
  if (e.length === 0) return;
  let r = 0,
    s = 0,
    h = new Set(getEnabledSettingSources());
  for (let y of EDITABLE_SETTING_SOURCES) {
    if (!h.has(y)) continue;
    let S = getSettingsForSourceWriteSeed(y),
      w = S?.enabledPlugins,
      L = S?.pluginConfigs;
    if (!w && !L) continue;
    let G = {},
      q = {};
    for (let { oldId: oldId, newId: newId } of e) {
      if (w && oldId in w) {
        if (((G[oldId] = void 0), newId !== null && !(newId in w) && !(newId in G))) G[newId] = w[oldId];
      }
      if (L && oldId in L) {
        if (((q[oldId] = void 0), newId !== null && !(newId in L) && !(newId in q))) q[newId] = L[oldId];
      }
    }
    if (Object.keys(G).length === 0 && Object.keys(q).length === 0) continue;
    let { error: error } = await updateSettingsForSource(
      y,
      {
        ...(Object.keys(G).length > 0 && { enabledPlugins: G }),
        ...(Object.keys(q).length > 0 && { pluginConfigs: q }),
      },
      void 0,
      n,
    );
    if (error)
      (s++,
        logForDebugging(`migrateRenamedPluginsInSettings: failed to update ${y}: ${error.message}`, {
          level: "warn",
        }));
    else r++;
  }
  if (r > 0 && s === 0) logFeatureOk("plugin_rename_migration");
  else if (r > 0) logFeatureSad("plugin_rename_migration", "partial_settings_write");
  else if (s > 0) logFeatureBad("plugin_rename_migration", "settings_write_failed");
  else logFeatureSad("plugin_rename_migration", "no_editable_scope");
}

export { resolvePluginRename, migrateRenamedPluginsInSettings };
