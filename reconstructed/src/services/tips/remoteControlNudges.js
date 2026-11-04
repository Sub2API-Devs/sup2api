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
import { shouldShowConfigGate } from "../../components/Settings/configGates.js";
import { isBridgeEnabled } from "../../bridge/bridgeEntitlement.js";
import { isKairosPushEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getAgentId } from "../../utils/teammate.js";

//@ chunk-pzv0vqyf.js:531-631 placement
var RC_UPSELL_MAX = 3;
var RC_TIP_MAX = 3;
var RC_MIN_TURN_SECONDS = 20;
var RC_READY_PUSH_TEXT = "Your Claude Code session is ready \u2014 continue from your phone anytime.";
//@ chunk-pzv0vqyf.js:631-1493 placement
/**
 * 长回合 Remote Control 提示配置（tengu_rc_long_turn_nudge）。
 */
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
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_rc_long_turn_nudge",
    null,
  );
  if (featureValue_CACHED_MAY_BE_STALE === null || typeof featureValue_CACHED_MAY_BE_STALE !== "object")
    return null;
  let thresholdSec =
    typeof featureValue_CACHED_MAY_BE_STALE.thresholdSec === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE.thresholdSec)
      ? Math.min(3600, Math.max(5, featureValue_CACHED_MAY_BE_STALE.thresholdSec))
      : 90;
  let probability =
    typeof featureValue_CACHED_MAY_BE_STALE.probability === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE.probability)
      ? Math.min(1, Math.max(0, featureValue_CACHED_MAY_BE_STALE.probability))
      : 1;
  let maxImpressions =
    typeof featureValue_CACHED_MAY_BE_STALE.maxImpressions === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE.maxImpressions)
      ? Math.trunc(featureValue_CACHED_MAY_BE_STALE.maxImpressions)
      : 3;
  let impressionKey =
    typeof featureValue_CACHED_MAY_BE_STALE.impressionKey === "string"
      ? featureValue_CACHED_MAY_BE_STALE.impressionKey
      : "";
  let clampHour = (value, fallback) =>
    typeof value === "number" && Number.isFinite(value)
      ? Math.min(24, Math.max(0, Math.trunc(value)))
      : fallback;
  let dayStartHour = clampHour(featureValue_CACHED_MAY_BE_STALE.dayStartHour, 7);
  let dayEndHour = clampHour(featureValue_CACHED_MAY_BE_STALE.dayEndHour, 21);
  return {
    thresholdSec,
    probability,
    maxImpressions,
    impressionKey,
    dayStartHour,
    dayEndHour,
  };
}
//@ chunk-pzv0vqyf.js:1493-1621 placement
/**
 * 判断当前时间是否在白天时段内（起止配置无效时视为总是）。
 */
function isWithinDayHours(longTurnNudgeConfig, now = new Date()) {
  if (longTurnNudgeConfig.dayStartHour >= longTurnNudgeConfig.dayEndHour) return true;
  let hours = now.getHours();
  return hours >= longTurnNudgeConfig.dayStartHour && hours < longTurnNudgeConfig.dayEndHour;
}
//@ chunk-pzv0vqyf.js:1621-1697 placement
/**
 * 全局配置里的某个计数加一并保存。
 */
function bumpGlobalConfigCount(field, storageV5) {
  let nextValue = (getGlobalConfig()[field] ?? 0) + 1;
  saveGlobalConfig(
    (config) =>
      (config[field] ?? 0) >= nextValue
        ? config
        : {
            ...config,
            [field]: nextValue,
          },
    storageV5,
  );
}
//@ chunk-pzv0vqyf.js:1755-2115 placement
/**
 * 权限请求时 Remote Control 提示配置（tengu_rc_permission_nudge）。
 */
function getPermissionNudgeConfig() {
  let rawConfig;
  let CLAUDE_CODE_RC_PERMISSION_NUDGE = antEnv.CLAUDE_CODE_RC_PERMISSION_NUDGE;
  if (CLAUDE_CODE_RC_PERMISSION_NUDGE)
    try {
      rawConfig = jsonParse(CLAUDE_CODE_RC_PERMISSION_NUDGE);
    } catch {
      rawConfig = undefined;
    }
  rawConfig ??= getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_rc_permission_nudge",
    DEFAULT_TRANSCRIPT_ASK_CONFIG,
  );
  let asNumber = (value, fallback) =>
    typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return {
    afterPromptCount: Math.max(
      1,
      asNumber(rawConfig?.afterPromptCount, DEFAULT_TRANSCRIPT_ASK_CONFIG.afterPromptCount),
    ),
    probability: asNumber(rawConfig?.probability, DEFAULT_TRANSCRIPT_ASK_CONFIG.probability),
    maxImpressions: asNumber(rawConfig?.maxImpressions, DEFAULT_TRANSCRIPT_ASK_CONFIG.maxImpressions),
  };
}
//@ chunk-pzv0vqyf.js:2115-2236 placement
/**
 * 是否显示 Remote Control 推广：功能可提供、用户没用过、启动时未开启，且已显示次数未达上限。
 */
function shouldShowRemoteControlUpsell() {
  if (!isRemoteControlOfferable()) return false;
  let globalConfig = getGlobalConfig();
  return (
    !globalConfig.hasUsedRemoteControl &&
    !getRemoteControlAtStartup() &&
    (globalConfig.remoteControlUpsellSeenCount ?? 0) < RC_UPSELL_MAX
  );
}
//@ chunk-pzv0vqyf.js:2236-2313 placement
/**
 * 记录 Remote Control 推广展示并打点。
 */
function noteRcUpsellShown(storageV5) {
  bumpGlobalConfigCount("remoteControlUpsellSeenCount", storageV5);
  logFeatureOk("tips_rc_upsell_show");
}
//@ chunk-pzv0vqyf.js:2313-2371 placement
/**
 * 是否用过 Remote Control，或设置为启动时开启。
 */
function hasUsedRemoteControlOrStartup() {
  return getGlobalConfig().hasUsedRemoteControl === true || getRemoteControlAtStartup();
}
//@ chunk-pzv0vqyf.js:2371-2437 placement
/**
 * 推送通知推广是否还应展示（展示次数未达上限）。
 */
function canShowPushUpsell() {
  return isPushUpsellEligible() && (getGlobalConfig().pushNotifUpsellSeenCount ?? 0) < RC_TIP_MAX;
}
//@ chunk-pzv0vqyf.js:2437-2519 placement
/**
 * 是否有资格推广推送通知（可推广、未用过、未开推送且有实验资格）。
 */
function isPushUpsellEligible() {
  return (
    isRemoteControlOfferable() &&
    hasUsedRemoteControlOrStartup() &&
    resolveSetting("agentPushNotifEnabled", false).value !== true &&
    shouldShowConfigGate()
  );
}
//@ chunk-pzv0vqyf.js:2519-2594 placement
/**
 * 记录推送推广展示并打点。
 */
function notePushUpsellShown(storageV5) {
  bumpGlobalConfigCount("pushNotifUpsellSeenCount", storageV5);
  logFeatureOk("tips_push_upsell_show");
}
//@ chunk-pzv0vqyf.js:2594-2809 placement
/**
 * 长回合时的 Remote Control 提示是否还能显示：桥接可用，展示次数未达配置上限（负数为不限，0 为关闭；按配置键计数）。
 */
function canShowLongTurnNudge(longTurnNudgeConfig) {
  if (!isBridgeEnabled()) return false;
  if (longTurnNudgeConfig.maxImpressions === 0) return false;
  if (longTurnNudgeConfig.maxImpressions < 0) return true;
  let globalConfig = getGlobalConfig();
  return (
    ((globalConfig.rcLongTurnNudgeSeenKey ?? "") === longTurnNudgeConfig.impressionKey
      ? (globalConfig.rcLongTurnNudgeSeenCount ?? 0)
      : 0) < longTurnNudgeConfig.maxImpressions
  );
}
//@ chunk-pzv0vqyf.js:2809-3061 placement
/**
 * 记录长回合远程控制提示已展示（按展示键计数，键变化时重置）并打点。
 */
function recordLongTurnNudgeShown(longTurnNudgeConfig, storageV5) {
  if (longTurnNudgeConfig.maxImpressions >= 0)
    saveGlobalConfig((config) => {
      let isSameKey = (config.rcLongTurnNudgeSeenKey ?? "") === longTurnNudgeConfig.impressionKey;
      return {
        ...config,
        rcLongTurnNudgeSeenCount: isSameKey ? (config.rcLongTurnNudgeSeenCount ?? 0) + 1 : 1,
        rcLongTurnNudgeSeenKey: longTurnNudgeConfig.impressionKey,
      };
    }, storageV5);
  logFeatureOk("tips_rc_long_turn_show");
}
//@ chunk-pzv0vqyf.js:3061-3140 placement
/**
 * 权限提示里的远程控制推广是否还能展示（bridge 开启且未达上限）。
 */
function canShowPermissionNudge(maxImpressions) {
  if (!isBridgeEnabled()) return false;
  return (getGlobalConfig().rcPermissionNudgeSeenCount ?? 0) < maxImpressions;
}
//@ chunk-pzv0vqyf.js:3140-3274 placement
/**
 * 记录权限提示中的远程控制提示展示次数并打点。
 */
function recordPermissionNudgeShown(storageV5) {
  saveGlobalConfig(
    (config) => ({
      ...config,
      rcPermissionNudgeSeenCount: (config.rcPermissionNudgeSeenCount ?? 0) + 1,
    }),
    storageV5,
  );
  logFeatureOk("tips_rc_permission_nudge_show");
}
//@ chunk-pzv0vqyf.js:3274-3720 placement
/**
 * 会话就绪推送提示配置（tengu_kairos_ready_nudge）。
 */
function getKairosReadyNudgeConfig() {
  if (!isKairosPushEnabled()) return null;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_kairos_ready_nudge",
    null,
  );
  if (featureValue_CACHED_MAY_BE_STALE === null || typeof featureValue_CACHED_MAY_BE_STALE !== "object")
    return null;
  let probability =
    typeof featureValue_CACHED_MAY_BE_STALE.probability === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE.probability)
      ? Math.min(1, Math.max(0, featureValue_CACHED_MAY_BE_STALE.probability))
      : 1;
  let maxImpressions =
    typeof featureValue_CACHED_MAY_BE_STALE.maxImpressions === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE.maxImpressions)
      ? Math.trunc(featureValue_CACHED_MAY_BE_STALE.maxImpressions)
      : 5;
  let impressionKey =
    typeof featureValue_CACHED_MAY_BE_STALE.impressionKey === "string"
      ? featureValue_CACHED_MAY_BE_STALE.impressionKey
      : "";
  return {
    probability,
    maxImpressions,
    impressionKey,
  };
}
//@ chunk-pzv0vqyf.js:3720-3974 placement
/**
 * 是否发送"会话已就绪，可在手机上继续"推送：已连接且未静音，不是后台/子代理会话，推送次数未达上限。
 */
function canSendReadyPush(kairosReadyNudgeConfig, replBridgeExplicit, alreadyPushed) {
  if (!replBridgeExplicit || alreadyPushed) return false;
  if (isBgSession() || getAgentId() != null) return false;
  if (kairosReadyNudgeConfig.maxImpressions === 0) return false;
  if (kairosReadyNudgeConfig.maxImpressions < 0) return true;
  let globalConfig = getGlobalConfig();
  return (
    ((globalConfig.remoteControlReadyPushKey ?? "") === kairosReadyNudgeConfig.impressionKey
      ? (globalConfig.remoteControlReadyPushCount ?? 0)
      : 0) < kairosReadyNudgeConfig.maxImpressions
  );
}
//@ chunk-pzv0vqyf.js:3974-4239 placement
/**
 * 记录"远程控制已就绪"推送已发送（按展示键计数，键变化时重置）并打点。
 */
function recordReadyPushSent(kairosReadyNudgeConfig, storageV5) {
  if (kairosReadyNudgeConfig.maxImpressions >= 0)
    saveGlobalConfig((config) => {
      let isSameKey = (config.remoteControlReadyPushKey ?? "") === kairosReadyNudgeConfig.impressionKey;
      return {
        ...config,
        remoteControlReadyPushCount: isSameKey ? (config.remoteControlReadyPushCount ?? 0) + 1 : 1,
        remoteControlReadyPushKey: kairosReadyNudgeConfig.impressionKey,
      };
    }, storageV5);
  logFeatureOk("tips_rc_ready_push_send");
}
//@ chunk-pzv0vqyf.js:4239-4358 placement
/**
 * 首次使用远程控制时在全局配置中标记 hasUsedRemoteControl。
 */
function markRemoteControlUsed(storageV5) {
  if (getGlobalConfig().hasUsedRemoteControl) return;
  saveGlobalConfig(
    (config) =>
      config.hasUsedRemoteControl
        ? config
        : {
            ...config,
            hasUsedRemoteControl: true,
          },
    storageV5,
  );
}
//@ chunk-pzv0vqyf.js:4358-4391 placement
var REMOTE_SURFACES = ["mobile", "web", "desktop"];
//@ chunk-pzv0vqyf.js:4391-4536 placement
function toRemoteSurface(platform) {
  switch (platform) {
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
//@ chunk-pzv0vqyf.js:4536-4706 placement
/**
 * 记下用户通过哪种客户端（mobile/web/desktop）使用过 Remote Control（去重写入全局配置）。
 */
function recordRemoteSurfaceSeen(platform, storageV5) {
  let remoteSurface = toRemoteSurface(platform);
  if (!remoteSurface) return;
  if (getSeenRemoteSurfaces(getGlobalConfig()).includes(remoteSurface)) return;
  saveGlobalConfig((config) => {
    let seenRemoteSurfaces = getSeenRemoteSurfaces(config);
    if (seenRemoteSurfaces.includes(remoteSurface)) return config;
    return {
      ...config,
      remoteControlSurfacesSeen: [...seenRemoteSurfaces, remoteSurface],
    };
  }, storageV5);
}
//@ chunk-pzv0vqyf.js:4706-4818 placement
/**
 * 用户只用过 mobile 或 web 之一时，返回另一个（用于推荐）；都用过或都没用过返回 undefined。
 */
function getUntriedRemoteSurface() {
  let seenRemoteSurfaces = getSeenRemoteSurfaces(getGlobalConfig());
  let included = seenRemoteSurfaces.includes("mobile");
  let included_2 = seenRemoteSurfaces.includes("web");
  if (included === included_2) return;
  return included ? "web" : "mobile";
}
//@ chunk-pzv0vqyf.js:4818-4927 placement
function getSeenRemoteSurfaces(config) {
  let remoteControlSurfacesSeen = config.remoteControlSurfacesSeen;
  return Array.isArray(remoteControlSurfacesSeen)
    ? remoteControlSurfacesSeen.filter((surface) => REMOTE_SURFACES.some((known) => known === surface))
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
  canShowPermissionNudge,
  recordPermissionNudgeShown,
  shouldShowRemoteControlUpsell,
  canShowPushUpsell,
  RC_MIN_TURN_SECONDS,
  noteRcUpsellShown,
  notePushUpsellShown,
  getUntriedRemoteSurface,
  isPushUpsellEligible,
};
