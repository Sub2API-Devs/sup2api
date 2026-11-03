/**
 * services/tips/pluginDisuseTip.ts
 *
 * 未使用插件提示（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4r6qcn1a.js (4)
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

//@ chunk-4r6qcn1a.js:462-476 placement
var MIN_DISUSE_DAYS = 14;
var MIN_DISUSE_SESSIONS = 10;
//@ chunk-4r6qcn1a.js:476-1160 placement
async function computeDisusedPlugins() {
  try {
    let e = isPluginLoadCacheOnly();
    if (e === undefined) return [];
    if (getStrictKnownMarketplaces() !== null) return [];
    let { enabled } = await e;
    if (enabled.length === 0) return [];
    let managedNames = policyEnabledPluginNameSet();
    let seedDirs = getPluginSeedDirs();
    let numStartups = getGlobalConfig().numStartups;
    let now = Date.now();
    let r = [];
    for (let n of enabled) {
      let { marketplace } = parsePluginIdentifier(n.repository);
      if (!marketplace || isOfficialMarketplace(marketplace)) continue;
      if (getEnabledVia(n, managedNames, seedDirs) !== "user-install") continue;
      if (hasNonSkillComponents(n)) continue;
      let i = pluginUsageRecord(n.repository);
      if (!i) continue;
      if (hasPendingUsage(n.repository)) continue;
      let { sessionsSinceLastUse, daysSinceLastUse } = disuseStats(i, numStartups, now);
      if (daysSinceLastUse >= MIN_DISUSE_DAYS && sessionsSinceLastUse >= MIN_DISUSE_SESSIONS)
        r.push({
          pluginId: n.repository,
          name: n.name,
          daysSinceLastUse,
        });
    }
    r.sort((n, o) => o.daysSinceLastUse - n.daysSinceLastUse);
    return r;
  } catch (error) {
    logForDebugging(`plugin-disuse tip: failed to compute disused plugins: ${error}`, {
      level: "error",
    });
    return [];
  }
}
//@ chunk-4r6qcn1a.js:1160-1312 placement
/**
 * 返回插件距上次使用的天数（没有严格市场限制时）：找不到记录返回 null，当前正在使用返回 0。
 */
function getPluginDaysSinceUse(repository) {
  if (getStrictKnownMarketplaces() !== null) return null;
  let s = pluginUsageRecord(repository);
  if (!s) return null;
  if (hasPendingUsage(repository)) return 0;
  return disuseStats(s, getGlobalConfig().numStartups, Date.now()).daysSinceLastUse;
}
//@ chunk-4r6qcn1a.js:1312-1490 placement
function hasNonSkillComponents(e) {
  return Boolean(
    e.themesPath ||
    e.themesPaths?.length ||
    e.outputStylesPath ||
    e.outputStylesPaths?.length ||
    e.monitors?.length ||
    e.workflowsPath ||
    e.workflowsPaths?.length,
  );
}
export { computeDisusedPlugins, getPluginDaysSinceUse };
