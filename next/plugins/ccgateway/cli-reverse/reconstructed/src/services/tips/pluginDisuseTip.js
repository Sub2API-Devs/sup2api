/**
 * services/tips/pluginDisuseTip.ts
 *
 * 未使用插件提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nv0mx777.js (4)
 * attribution: placement 4
 */
import { isPluginLoadCacheOnly } from "../../utils/plugins/pluginLoadState.js";
import { getStrictKnownMarketplaces } from "../../utils/plugins/marketplacePolicy.js";
import { policyEnabledPluginNameSet } from "../../utils/plugins/pluginPolicy.js";
import { getPluginSeedDirs } from "../../utils/plugins/pluginDirectories.js";
import { getGlobalConfig } from "../../utils/config.js";
import { parsePluginIdentifier, isOfficialMarketplace } from "../../utils/plugins/pluginIdentifier.js";
import {
  getEnabledVia,
  pluginUsageRecord,
  hasPendingUsage,
  disuseStats,
} from "../../utils/telemetry/pluginTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-nv0mx777.js:462-476 placement
var MIN_DISUSE_DAYS = 14;
var MIN_DISUSE_SESSIONS = 10;
//@ chunk-nv0mx777.js:476-1160 placement
async function computeDisusedPlugins() {
  try {
    let loadCache = isPluginLoadCacheOnly();
    if (loadCache === undefined) return [];
    if (getStrictKnownMarketplaces() !== null) return [];
    let { enabled } = await loadCache;
    if (enabled.length === 0) return [];
    let managedNames = policyEnabledPluginNameSet();
    let seedDirs = getPluginSeedDirs();
    let numStartups = getGlobalConfig().numStartups;
    let now = Date.now();
    let disused = [];
    for (let plugin of enabled) {
      let { marketplace } = parsePluginIdentifier(plugin.repository);
      if (!marketplace || isOfficialMarketplace(marketplace)) continue;
      if (getEnabledVia(plugin, managedNames, seedDirs) !== "user-install") continue;
      if (hasNonSkillComponents(plugin)) continue;
      let usage = pluginUsageRecord(plugin.repository);
      if (!usage) continue;
      if (hasPendingUsage(plugin.repository)) continue;
      let { sessionsSinceLastUse, daysSinceLastUse } = disuseStats(usage, numStartups, now);
      if (daysSinceLastUse >= MIN_DISUSE_DAYS && sessionsSinceLastUse >= MIN_DISUSE_SESSIONS)
        disused.push({
          pluginId: plugin.repository,
          name: plugin.name,
          daysSinceLastUse,
        });
    }
    disused.sort((left, right) => right.daysSinceLastUse - left.daysSinceLastUse);
    return disused;
  } catch (error) {
    logForDebugging(`plugin-disuse tip: failed to compute disused plugins: ${error}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-nv0mx777.js:1160-1312 placement
/**
 * 返回插件距上次使用的天数（没有严格市场限制时）：找不到记录返回 null，当前正在使用返回 0。
 */
function getPluginDaysSinceUse(pluginId) {
  if (getStrictKnownMarketplaces() !== null) return null;
  let usage = pluginUsageRecord(pluginId);
  if (!usage) return null;
  if (hasPendingUsage(pluginId)) return 0;
  return disuseStats(usage, getGlobalConfig().numStartups, Date.now()).daysSinceLastUse;
}
//@ chunk-nv0mx777.js:1312-1490 placement
function hasNonSkillComponents(plugin) {
  return Boolean(
    plugin.themesPath ||
    plugin.themesPaths?.length ||
    plugin.outputStylesPath ||
    plugin.outputStylesPaths?.length ||
    plugin.monitors?.length ||
    plugin.workflowsPath ||
    plugin.workflowsPaths?.length,
  );
}
export { computeDisusedPlugins, getPluginDaysSinceUse };
