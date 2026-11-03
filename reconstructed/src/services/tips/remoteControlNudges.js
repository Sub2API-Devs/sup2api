/**
 * services/tips/remoteControlNudges.ts
 *
 * 2.1.316 新增：长回合 Remote Control 提示配置（tengu_rc_long_turn_nudge）；会话就绪推送提示配置（tengu_kairos_ready_nudge）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pzv0vqyf.js (24)
 * attribution: placement 24
 */
import { antEnv } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { jsonParse } from "../../utils/slowOperations.js";
import { DEFAULT_TRANSCRIPT_ASK_CONFIG } from "../../components/FeedbackSurvey/useFeedbackSurvey.js";
import { isRemoteControlOfferable, getRemoteControlAtStartup } from "../../bridge/bridgeGates.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { Myt } from "../../components/Settings/configGates.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";
import { qrt } from "../../tools/PushNotificationTool/prompt.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getAgentId } from "../../utils/teammate.js";

//@ chunk-pzv0vqyf.js:531-631 placement
var RC_UPSELL_MAX = 3,
  RC_TIP_MAX = 3,
  RC_MIN_TURN_SECONDS = 20,
  RC_READY_PUSH_TEXT = "Your Claude Code session is ready \u2014 continue from your phone anytime.";
/**
 * 长回合 Remote Control 提示配置（tengu_rc_long_turn_nudge）。
 */
//@ chunk-pzv0vqyf.js:631-1493 placement
function getLongTurnNudgeConfig() {
  if (antEnv.CLAUDE_CODE_FORCE_RC_LONG_TURN_NUDGE)
    return {
      thresholdSec: 5,
      probability: 1,
      maxImpressions: -1,
      impressionKey: "force",
      dayStartHour: 0,
      dayEndHour: 24,
    };
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_rc_long_turn_nudge", null);
  if (e === null || typeof e !== "object") return null;
  let o =
      typeof e.thresholdSec === "number" && Number.isFinite(e.thresholdSec)
        ? Math.min(3600, Math.max(5, e.thresholdSec))
        : 90,
    n =
      typeof e.probability === "number" && Number.isFinite(e.probability)
        ? Math.min(1, Math.max(0, e.probability))
        : 1,
    r =
      typeof e.maxImpressions === "number" && Number.isFinite(e.maxImpressions)
        ? Math.trunc(e.maxImpressions)
        : 3,
    t = typeof e.impressionKey === "string" ? e.impressionKey : "",
    a = (i, d) =>
      typeof i === "number" && Number.isFinite(i) ? Math.min(24, Math.max(0, Math.trunc(i))) : d,
    l = a(e.dayStartHour, 7),
    p = a(e.dayEndHour, 21);
  return {
    thresholdSec: o,
    probability: n,
    maxImpressions: r,
    impressionKey: t,
    dayStartHour: l,
    dayEndHour: p,
  };
}
/**
 * 判断当前时间是否在白天时段内（起止配置无效时视为总是）。
 */
//@ chunk-pzv0vqyf.js:1493-1621 placement
function isWithinDayHours(e, o = new Date()) {
  if (e.dayStartHour >= e.dayEndHour) return !0;
  let hours = o.getHours();
  return hours >= e.dayStartHour && hours < e.dayEndHour;
}
//@ chunk-pzv0vqyf.js:1621-1697 placement
function m(e, o) {
  let n = (getGlobalConfig()[e] ?? 0) + 1;
  saveGlobalConfig((r) => ((r[e] ?? 0) >= n ? r : { ...r, [e]: n }), o);
}
/**
 * 权限请求时 Remote Control 提示配置（tengu_rc_permission_nudge）。
 */
//@ chunk-pzv0vqyf.js:1755-2115 placement
function getPermissionNudgeConfig() {
  let e,
    CLAUDE_CODE_RC_PERMISSION_NUDGE = antEnv.CLAUDE_CODE_RC_PERMISSION_NUDGE;
  if (CLAUDE_CODE_RC_PERMISSION_NUDGE)
    try {
      e = jsonParse(CLAUDE_CODE_RC_PERMISSION_NUDGE);
    } catch {
      e = void 0;
    }
  e ??= getFeatureValue_CACHED_MAY_BE_STALE("tengu_rc_permission_nudge", DEFAULT_TRANSCRIPT_ASK_CONFIG);
  let n = (r, t) => (typeof r === "number" && Number.isFinite(r) ? r : t);
  return {
    afterPromptCount: Math.max(1, n(e?.afterPromptCount, DEFAULT_TRANSCRIPT_ASK_CONFIG.afterPromptCount)),
    probability: n(e?.probability, DEFAULT_TRANSCRIPT_ASK_CONFIG.probability),
    maxImpressions: n(e?.maxImpressions, DEFAULT_TRANSCRIPT_ASK_CONFIG.maxImpressions),
  };
}
/**
 * 是否显示 Remote Control 推广：功能可提供、用户没用过、启动时未开启，且已显示次数未达上限。
 */
//@ chunk-pzv0vqyf.js:2115-2236 placement
function shouldShowRemoteControlUpsell() {
  if (!isRemoteControlOfferable()) return !1;
  let e = getGlobalConfig();
  return (
    !e.hasUsedRemoteControl &&
    !getRemoteControlAtStartup() &&
    (e.remoteControlUpsellSeenCount ?? 0) < RC_UPSELL_MAX
  );
}
//@ chunk-pzv0vqyf.js:2236-2313 placement
function VNs(e) {
  (m("remoteControlUpsellSeenCount", e), logFeatureOk("tips_rc_upsell_show"));
}
//@ chunk-pzv0vqyf.js:2313-2371 placement
function b() {
  return getGlobalConfig().hasUsedRemoteControl === !0 || getRemoteControlAtStartup();
}
//@ chunk-pzv0vqyf.js:2371-2437 placement
function JTo() {
  return QTo() && (getGlobalConfig().pushNotifUpsellSeenCount ?? 0) < RC_TIP_MAX;
}
//@ chunk-pzv0vqyf.js:2437-2519 placement
function QTo() {
  return (
    isRemoteControlOfferable() && b() && resolveSetting("agentPushNotifEnabled", !1).value !== !0 && Myt()
  );
}
//@ chunk-pzv0vqyf.js:2519-2594 placement
function qNs(e) {
  (m("pushNotifUpsellSeenCount", e), logFeatureOk("tips_push_upsell_show"));
}
/**
 * 长回合时的 Remote Control 提示是否还能显示：桥接可用，展示次数未达配置上限（负数为不限，0 为关闭；按配置键计数）。
 */
//@ chunk-pzv0vqyf.js:2594-2809 placement
function canShowLongTurnNudge(e) {
  if (!isBridgeEnabled()) return !1;
  if (e.maxImpressions === 0) return !1;
  if (e.maxImpressions < 0) return !0;
  let o = getGlobalConfig();
  return (
    ((o.rcLongTurnNudgeSeenKey ?? "") === e.impressionKey ? (o.rcLongTurnNudgeSeenCount ?? 0) : 0) <
    e.maxImpressions
  );
}
/**
 * 记录长回合远程控制提示已展示（按展示键计数，键变化时重置）并打点。
 */
//@ chunk-pzv0vqyf.js:2809-3061 placement
function recordLongTurnNudgeShown(e, o) {
  if (e.maxImpressions >= 0)
    saveGlobalConfig((n) => {
      let r = (n.rcLongTurnNudgeSeenKey ?? "") === e.impressionKey;
      return {
        ...n,
        rcLongTurnNudgeSeenCount: r ? (n.rcLongTurnNudgeSeenCount ?? 0) + 1 : 1,
        rcLongTurnNudgeSeenKey: e.impressionKey,
      };
    }, o);
  logFeatureOk("tips_rc_long_turn_show");
}
//@ chunk-pzv0vqyf.js:3061-3140 placement
function JNs(e) {
  if (!isBridgeEnabled()) return !1;
  return (getGlobalConfig().rcPermissionNudgeSeenCount ?? 0) < e;
}
/**
 * 记录权限提示中的远程控制提示展示次数并打点。
 */
//@ chunk-pzv0vqyf.js:3140-3274 placement
function recordPermissionNudgeShown(e) {
  (saveGlobalConfig(
    (o) => ({ ...o, rcPermissionNudgeSeenCount: (o.rcPermissionNudgeSeenCount ?? 0) + 1 }),
    e,
  ),
    logFeatureOk("tips_rc_permission_nudge_show"));
}
/**
 * 会话就绪推送提示配置（tengu_kairos_ready_nudge）。
 */
//@ chunk-pzv0vqyf.js:3274-3720 placement
function getKairosReadyNudgeConfig() {
  if (!qrt()) return null;
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_kairos_ready_nudge", null);
  if (e === null || typeof e !== "object") return null;
  let o =
      typeof e.probability === "number" && Number.isFinite(e.probability)
        ? Math.min(1, Math.max(0, e.probability))
        : 1,
    n =
      typeof e.maxImpressions === "number" && Number.isFinite(e.maxImpressions)
        ? Math.trunc(e.maxImpressions)
        : 5,
    r = typeof e.impressionKey === "string" ? e.impressionKey : "";
  return { probability: o, maxImpressions: n, impressionKey: r };
}
/**
 * 是否发送"会话已就绪，可在手机上继续"推送：已连接且未静音，不是后台/子代理会话，推送次数未达上限。
 */
//@ chunk-pzv0vqyf.js:3720-3974 placement
function canSendReadyPush(e, o, n) {
  if (!o || n) return !1;
  if (isBgSession() || getAgentId() != null) return !1;
  if (e.maxImpressions === 0) return !1;
  if (e.maxImpressions < 0) return !0;
  let r = getGlobalConfig();
  return (
    ((r.remoteControlReadyPushKey ?? "") === e.impressionKey ? (r.remoteControlReadyPushCount ?? 0) : 0) <
    e.maxImpressions
  );
}
/**
 * 记录"远程控制已就绪"推送已发送（按展示键计数，键变化时重置）并打点。
 */
//@ chunk-pzv0vqyf.js:3974-4239 placement
function recordReadyPushSent(e, o) {
  if (e.maxImpressions >= 0)
    saveGlobalConfig((n) => {
      let r = (n.remoteControlReadyPushKey ?? "") === e.impressionKey;
      return {
        ...n,
        remoteControlReadyPushCount: r ? (n.remoteControlReadyPushCount ?? 0) + 1 : 1,
        remoteControlReadyPushKey: e.impressionKey,
      };
    }, o);
  logFeatureOk("tips_rc_ready_push_send");
}
/**
 * 首次使用远程控制时在全局配置中标记 hasUsedRemoteControl。
 */
//@ chunk-pzv0vqyf.js:4239-4358 placement
function markRemoteControlUsed(e) {
  if (getGlobalConfig().hasUsedRemoteControl) return;
  saveGlobalConfig((o) => (o.hasUsedRemoteControl ? o : { ...o, hasUsedRemoteControl: !0 }), e);
}
//@ chunk-pzv0vqyf.js:4358-4391 placement
var C = ["mobile", "web", "desktop"];
//@ chunk-pzv0vqyf.js:4391-4536 placement
function toRemoteSurface(e) {
  switch (e) {
    case "ios":
    case "android":
      return "mobile";
    case "web_claude_ai":
      return "web";
    case "desktop_app":
      return "desktop";
    default:
      return;
  }
}
/**
 * 记下用户通过哪种客户端（mobile/web/desktop）使用过 Remote Control（去重写入全局配置）。
 */
//@ chunk-pzv0vqyf.js:4536-4706 placement
function recordRemoteSurfaceSeen(e, o) {
  let n = toRemoteSurface(e);
  if (!n) return;
  if (getSeenRemoteSurfaces(getGlobalConfig()).includes(n)) return;
  saveGlobalConfig((r) => {
    let t = getSeenRemoteSurfaces(r);
    if (t.includes(n)) return r;
    return { ...r, remoteControlSurfacesSeen: [...t, n] };
  }, o);
}
/**
 * 用户只用过 mobile 或 web 之一时，返回另一个（用于推荐）；都用过或都没用过返回 undefined。
 */
//@ chunk-pzv0vqyf.js:4706-4818 placement
function getUntriedRemoteSurface() {
  let e = getSeenRemoteSurfaces(getGlobalConfig()),
    included = e.includes("mobile"),
    included_2 = e.includes("web");
  if (included === included_2) return;
  return included ? "web" : "mobile";
}
//@ chunk-pzv0vqyf.js:4818-4927 placement
function getSeenRemoteSurfaces(e) {
  let remoteControlSurfacesSeen = e.remoteControlSurfacesSeen;
  return Array.isArray(remoteControlSurfacesSeen)
    ? remoteControlSurfacesSeen.filter((n) => C.some((r) => r === n))
    : [];
}

export {
  markRemoteControlUsed,
  recordRemoteSurfaceSeen,
  getKairosReadyNudgeConfig,
  canSendReadyPush,
  RC_READY_PUSH_TEXT,
  recordReadyPushSent,
  getLongTurnNudgeConfig,
  canShowLongTurnNudge,
  isWithinDayHours,
  recordLongTurnNudgeShown,
  getPermissionNudgeConfig,
  JNs,
  recordPermissionNudgeShown,
  shouldShowRemoteControlUpsell,
  JTo,
  RC_MIN_TURN_SECONDS,
  VNs,
  qNs,
  getUntriedRemoteSurface,
  QTo,
};
