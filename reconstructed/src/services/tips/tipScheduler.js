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
import { Soe, _1s, recordTipShown } from "./tipIds.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { getTipTelemetryId } from "./orgTips.js";

/**
 * 在候选提示中选“距上次显示经过会话数最多”的那条，平局按 priority 高者。
 */
//@ chunk-s8af6efx.js:1293-1540 fingerprint = selectTipWithLongestTimeSinceShown (0.848)
function selectTipWithLongestTimeSinceShown(availableTips) {
  if (availableTips.length === 0) return;
  if (availableTips.length === 1) return availableTips[0];
  let tipsWithSessions = availableTips.map((tip) => ({
    tip: tip,
    sessions: getSessionsSinceTipShown(tip.id),
  }));
  return (
    tipsWithSessions.sort((t, n) => {
      if (t.sessions !== n.sessions) return n.sessions - t.sessions;
      return (n.tip.priority ?? 0) - (t.tip.priority ?? 0);
    }),
    tipsWithSessions[0]?.tip
  );
}
/**
 * spinner 上要显示的提示：spinnerTipsEnabled 为 false 时不显示；否则取 getRelevantTips 的结果按最久未显示挑一条。
 */
//@ chunk-s8af6efx.js:1540-1708 fingerprint = getTipToShowOnSpinner (0.399)
async function getTipToShowOnSpinner(context) {
  if (getSettings_DEPRECATED().spinnerTipsEnabled === !1) return;
  let { getRelevantTips: getRelevantTips } = await import("./chunk-4t8fx0s8.js"),
    tips = await getRelevantTips(context);
  if (tips.length === 0) return;
  return selectTipWithLongestTimeSinceShown(tips);
}
/**
 * 安全获取提示内容：content() 抛错时把提示记入 failedTipIds（本会话不再尝试）并返回空串。
 */
//@ chunk-s8af6efx.js:1708-1918 layout
async function getTipContentSafe(e, i) {
  try {
    return await e.content(i);
  } catch (error) {
    let { tipSessionCaches: tipSessionCaches } = await import("./chunk-4t8fx0s8.js");
    return (
      tipSessionCaches.of(i.session.host).failedTipIds.add(e.id),
      logError(withTelemetryMessage(toError(error), "tip content threw")),
      ""
    );
  }
}
//@ chunk-s8af6efx.js:1918-1926 layout
var TIP_MIN_SESSIONS = 2;
//@ chunk-s8af6efx.js:1926-2173 layout
class LegacyPluginTipCountProbe {
  fired = new Set();
  fire(e, i) {
    if (e <= 0) return;
    let t = e > i ? "true" : "false",
      n = e >= TIP_MIN_SESSIONS && i < TIP_MIN_SESSIONS ? "true" : "false",
      r = `${t}|${n}`;
    if (this.fired.has(r)) return;
    (this.fired.add(r),
      logEvent("tengu_dead_probe_legacy_plugin_tip_counts", {
        changes_max: fromEnum(t),
        changes_outcome: fromEnum(n),
      }));
  }
}
//@ chunk-s8af6efx.js:2173-2196 layout
var legacyPluginTipProbeByHost = new HostScoped(() => new LegacyPluginTipCountProbe());
//@ chunk-s8af6efx.js:2196-2231 layout
function getLegacyPluginTipProbe() {
  return legacyPluginTipProbeByHost.of(getRootSession().host);
}
/**
 * 市场插件推荐提示：跳过已失败、显示次数达上限或仍在冷却（cooldownSessions）的提示，再按相关性筛选并挑最久未显示者。
 */
//@ chunk-s8af6efx.js:2231-2727 layout
async function getMarketplacePluginTipToShow(e) {
  if (getSettings_DEPRECATED().spinnerTipsEnabled === !1) return;
  let { isTipRelevantSafe: isTipRelevantSafe, tipSessionCaches: tipSessionCaches } =
      await import("./chunk-4t8fx0s8.js"),
    of = tipSessionCaches.of(e.session.host);
  if (excludesDefaultTips()) return;
  let marketplacePluginTips = await of.getMarketplacePluginTips(e.storageV5);
  if (marketplacePluginTips.length === 0) return;
  let p = [];
  for (let o of marketplacePluginTips) {
    if (!o.pluginId) continue;
    if (of.failedTipIds.has(o.id)) continue;
    let d = Soe(o.id),
      f = _1s(o.pluginId);
    if ((getLegacyPluginTipProbe().fire(f, d), Math.max(d, f) >= TIP_MIN_SESSIONS)) continue;
    if (getSessionsSinceTipShown(o.id) < o.cooldownSessions) continue;
    if (await isTipRelevantSafe(o, e)) p.push(o);
  }
  return selectTipWithLongestTimeSinceShown(p);
}
/**
 * 记录某提示已显示（写 tipsHistory[id]=numStartups），并打 tengu_tip_shown（surface：spinner/startup）。
 */
//@ chunk-s8af6efx.js:2727-2935 fingerprint = recordShownTip (0.479)
function recordShownTip(e, i = "spinner", t) {
  (recordTipShown(e.id, t, e.advertisedCommand),
    logFeatureOk(i === "startup" ? "tips_startup_show" : "tips_spinner_show"),
    logEvent("tengu_tip_shown", {
      tipIdLength: getTipTelemetryId(e),
      cooldownSessions: e.cooldownSessions,
      surface: fromEnum(i),
    }));
}

export { recordShownTip, getTipToShowOnSpinner, getTipContentSafe, getMarketplacePluginTipToShow };
