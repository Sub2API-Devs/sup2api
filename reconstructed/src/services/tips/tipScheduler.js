/**
 * services/tips/tipScheduler.ts
 *
 * 提示调度：筛出相关且不在冷却中的提示，挑最久未显示者，记录显示并打 tengu_tip_shown
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tips/tipScheduler.ts
 * pieces: chunk-s8af6efx.js (9)
 * attribution: fingerprint 3, layout 6
 */
import { getSessionsSinceTipShown } from "./tipHistory.js";
import { getSettings_DEPRECATED } from "../../utils/settings/settings.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { excludesDefaultTips } from "./spinnerTipsOverride.js";
import { tipLifetimeShownCount, pluginSuggestionShownCount, recordTipShown } from "./tipIds.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { getTipTelemetryId } from "./orgTips.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s8af6efx.js:1293-1540 fingerprint = selectTipWithLongestTimeSinceShown (0.848)
/**
 * 在候选提示中选“距上次显示经过会话数最多”的那条，平局按 priority 高者。
 */
function selectTipWithLongestTimeSinceShown(availableTips) {
  if (availableTips.length === 0) return;
  if (availableTips.length === 1) return availableTips[0];
  let tipsWithSessions = availableTips.map((tip) => ({
    tip,
    sessions: getSessionsSinceTipShown(tip.id),
  }));
  tipsWithSessions.sort((leftEntry, rightEntry) => {
    if (leftEntry.sessions !== rightEntry.sessions) return rightEntry.sessions - leftEntry.sessions;
    return (rightEntry.tip.priority ?? 0) - (leftEntry.tip.priority ?? 0);
  });
  return tipsWithSessions[0]?.tip;
}
//@ chunk-s8af6efx.js:1540-1708 fingerprint = getTipToShowOnSpinner (0.399)
/**
 * spinner 上要显示的提示：spinnerTipsEnabled 为 false 时不显示；否则取 getRelevantTips 的结果按最久未显示挑一条。
 */
async function getTipToShowOnSpinner(context) {
  if (getSettings_DEPRECATED().spinnerTipsEnabled === false) return;
  let { getRelevantTips } = await import("./MARKETPLACE_PLUGIN_TIP_ID_PREFIX.lazy.js");
  let tips = await getRelevantTips(context);
  if (tips.length === 0) return;
  return selectTipWithLongestTimeSinceShown(tips);
}
//@ chunk-s8af6efx.js:1708-1918 layout
/**
 * 安全获取提示内容：content() 抛错时把提示记入 failedTipIds（本会话不再尝试）并返回空串。
 */
async function getTipContentSafe(tipToShowOnSpinner, ctx) {
  try {
    return await tipToShowOnSpinner.content(ctx);
  } catch (error) {
    let { tipSessionCaches } = await import("./MARKETPLACE_PLUGIN_TIP_ID_PREFIX.lazy.js");
    tipSessionCaches.of(ctx.session.host).failedTipIds.add(tipToShowOnSpinner.id);
    logError(withTelemetryMessage(toError(error), "tip content threw"));
    return "";
  }
}
//@ chunk-s8af6efx.js:1918-1926 layout
var TIP_MIN_SESSIONS = 2;
//@ chunk-s8af6efx.js:1926-2173 layout
class LegacyPluginTipCountProbe {
  fired = new Set();
  fire(shownCount, sessionsSince) {
    if (shownCount <= 0) return;
    let changesMax = shownCount > sessionsSince ? "true" : "false";
    let changesOutcome =
      shownCount >= TIP_MIN_SESSIONS && sessionsSince < TIP_MIN_SESSIONS ? "true" : "false";
    let key = `${changesMax}|${changesOutcome}`;
    if (this.fired.has(key)) return;
    this.fired.add(key);
    logEvent("tengu_dead_probe_legacy_plugin_tip_counts", {
      changes_max: fromEnum(changesMax),
      changes_outcome: fromEnum(changesOutcome),
    });
  }
}
//@ chunk-s8af6efx.js:2173-2196 layout
var legacyPluginTipProbeByHost; // deferred: uses LegacyPluginTipCountProbe of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s8af6efx.js:2173", () => {
  legacyPluginTipProbeByHost = new HostScoped(() => new LegacyPluginTipCountProbe());
});
//@ chunk-s8af6efx.js:2196-2231 layout
function getLegacyPluginTipProbe() {
  return legacyPluginTipProbeByHost.of(getRootSession().host);
}
//@ chunk-s8af6efx.js:2231-2727 layout
/**
 * 市场插件推荐提示：跳过已失败、显示次数达上限或仍在冷却（cooldownSessions）的提示，再按相关性筛选并挑最久未显示者。
 */
async function getMarketplacePluginTipToShow(ctx) {
  if (getSettings_DEPRECATED().spinnerTipsEnabled === false) return;
  let { isTipRelevantSafe, tipSessionCaches } = await import("./MARKETPLACE_PLUGIN_TIP_ID_PREFIX.lazy.js");
  let state = tipSessionCaches.of(ctx.session.host);
  if (excludesDefaultTips()) return;
  let marketplacePluginTips = await state.getMarketplacePluginTips(ctx.storageV5);
  if (marketplacePluginTips.length === 0) return;
  let availableTips = [];
  for (let tip of marketplacePluginTips) {
    if (!tip.pluginId) continue;
    if (state.failedTipIds.has(tip.id)) continue;
    let lifetimeShown = tipLifetimeShownCount(tip.id);
    let pluginShown = pluginSuggestionShownCount(tip.pluginId);
    getLegacyPluginTipProbe().fire(pluginShown, lifetimeShown);
    if (Math.max(lifetimeShown, pluginShown) >= TIP_MIN_SESSIONS) continue;
    if (getSessionsSinceTipShown(tip.id) < tip.cooldownSessions) continue;
    if (await isTipRelevantSafe(tip, ctx)) availableTips.push(tip);
  }
  return selectTipWithLongestTimeSinceShown(availableTips);
}
//@ chunk-s8af6efx.js:2727-2935 fingerprint = recordShownTip (0.479)
/**
 * 记录某提示已显示（写 tipsHistory[id]=numStartups），并打 tengu_tip_shown（surface：spinner/startup）。
 */
function recordShownTip(tip, surface = "spinner", storageV5) {
  recordTipShown(tip.id, storageV5, tip.advertisedCommand);
  logFeatureOk(surface === "startup" ? "tips_startup_show" : "tips_spinner_show");
  logEvent("tengu_tip_shown", {
    tipIdLength: getTipTelemetryId(tip),
    cooldownSessions: tip.cooldownSessions,
    surface: fromEnum(surface),
  });
}
export { recordShownTip, getTipToShowOnSpinner, getTipContentSafe, getMarketplacePluginTipToShow };
