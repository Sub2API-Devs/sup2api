/**
 * services/autoContinueAtUsageLimit.ts
 *
 * 2.1.316 新增。达到用量上限后自动继续。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7rwsahty.js (11)
 * attribution: placement 11
 */
import { getSecuritySensitiveSetting } from "../utils/settings/settings.js";
import { getIsInteractive } from "../bootstrap/state.js";
import { isBgSession } from "../utils/concurrentSessions.js";
import { isRemoteSessionAvailable } from "../remote/remoteMode.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";

//@ chunk-7rwsahty.js:337-393 placement
/**
 * 读取安全敏感设置 autoContinueAtUsageLimit 的当前值；未设置返回 undefined。
 */
function getAutoContinueSettingValue() {
  return getSecuritySensitiveSetting("autoContinueAtUsageLimit")[0];
}
//@ chunk-7rwsahty.js:393-436 placement
/**
 * 结合设置值与键存在性判断自动继续是否开启：设置值优先，键不存在（absent）时视为开。
 */
function resolveAutoContinueEnabled(autoContinueKeyPresence) {
  return getAutoContinueSettingValue() ?? autoContinueKeyPresence === "absent";
}
//@ chunk-7rwsahty.js:436-463 placement
var TENGU_MARBLE_HERON = "tengu_marble_heron";
//@ chunk-7rwsahty.js:463-505 placement
/**
 * 返回自动继续的远程配置对象（tengu_marble_heron），不是对象时给空对象。
 */
function getAutoContinueConfig() {
  let autoContinueFeatureConfig = getAutoContinueFeatureConfig();
  return isPlainObject(autoContinueFeatureConfig) ? autoContinueFeatureConfig : {};
}
//@ chunk-7rwsahty.js:505-557 placement
/**
 * 判断远程配置开启开关（enabled），字符串 "false"/"0"/空串视为关。
 */
function isAutoContinueRemoteEnabled() {
  let autoContinueFeatureConfig = getAutoContinueFeatureConfig();
  return isTruthySetting(
    isPlainObject(autoContinueFeatureConfig) ? autoContinueFeatureConfig.enabled : autoContinueFeatureConfig,
  );
}
//@ chunk-7rwsahty.js:557-598 placement
/**
 * 当前是否可自动继续：交互式会话、非后台会话、非 Remote Control 远程会话。
 */
function isAutoContinueEligibleSession() {
  return getIsInteractive() && !isBgSession() && !isRemoteSessionAvailable();
}
//@ chunk-7rwsahty.js:598-633 placement
/**
 * 自动继续是否可用：会话可用（cln）且远程配置已开启（pze）。
 */
function isAutoContinueFeatureEnabled() {
  return isAutoContinueEligibleSession() && isAutoContinueRemoteEnabled();
}
//@ chunk-7rwsahty.js:633-672 placement
/**
 * 远程配置的 autoArm 是否打开（达到限额后是否自动布防）。
 */
function isAutoContinueAutoArmEnabled() {
  return isTruthySetting(getAutoContinueConfig().autoArm);
}
//@ chunk-7rwsahty.js:672-700 placement
/**
 * 读取 GrowthBook 开关 tengu_marble_heron 的缓存值（自动继续的远程配置）。
 */
function getAutoContinueFeatureConfig() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_MARBLE_HERON, {});
}
//@ chunk-7rwsahty.js:700-770 placement
/**
 * 判断值是否为普通对象（非 null、非数组）。
 */
function isPlainObject(autoContinueFeatureConfig) {
  return (
    typeof autoContinueFeatureConfig === "object" &&
    autoContinueFeatureConfig !== null &&
    !Array.isArray(autoContinueFeatureConfig)
  );
}
//@ chunk-7rwsahty.js:770-914 placement
function isTruthySetting(autoArm) {
  if (autoArm === undefined) return true;
  if (typeof autoArm === "string") {
    let lower = autoArm.trim().toLowerCase();
    return lower !== "" && lower !== "false" && lower !== "0";
  }
  return Boolean(autoArm);
}
export {
  isAutoContinueRemoteEnabled,
  resolveAutoContinueEnabled,
  isAutoContinueEligibleSession,
  isAutoContinueAutoArmEnabled,
  isAutoContinueFeatureEnabled,
  getAutoContinueConfig,
  getAutoContinueSettingValue,
};
