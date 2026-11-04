/**
 * tools/BashTool/bashPermissionFlags.ts
 *
 * 2.1.316 新增：Bash 权限相关开关
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (10)
 * attribution: placement 10
 */
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1016950-1017012 placement
/**
 * 读取 tengu_delightful_goblet 开关（安全的默认值 false），控制权限对话框超时是否自动拒绝。
 */
function isAutoDenyTimedDialogEnabled() {
  return readFlagWithOverride("tengu_delightful_goblet", {
    safe: false,
  });
}
//@ chunk-e6aww6q8.js:1017012-1017159 placement
/**
 * 危险 rm 超时策略的默认值与边界：默认启用/显示对话框/120 秒/最多 3 次；超时须在 5 秒到 1 小时之间，次数不超过 100，越界取默认。
 */
var TENGU_SPLENDID_HORIZON = "tengu_splendid_horizon";
var DEFAULT_DANGEROUS_RM_TIMEOUT_CONFIG = {
  enabled: true,
  showDialog: true,
  denyOnHostCard: true,
  timeoutMs: 120000,
  maxDialogTimeouts: 3,
};
var MIN_DANGEROUS_RM_DIALOG_TIMEOUT_MS = 5000;
var MAX_DANGEROUS_RM_DIALOG_TIMEOUT_MS = 3600000;
var MAX_DANGEROUS_RM_DIALOG_TIMEOUTS = 100;
//@ chunk-e6aww6q8.js:1017159-1017811 placement
/**
 * 读取 tengu_splendid_horizon 配置的危险 rm 超时策略：是否启用（可被环境变量关闭）、是否显示对话框、主机卡片是否拒绝、超时与最大对话框超时次数（越界取默认）。
 */
function getDangerousRmTimeoutConfig() {
  let { value: config, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_SPLENDID_HORIZON, {});
  return {
    enabled: env.CLAUDE_CODE_DISABLE_DANGEROUS_RM_TIMEOUT
      ? false
      : typeof config?.enabled === "boolean" && source === "payload"
        ? config.enabled
        : DEFAULT_DANGEROUS_RM_TIMEOUT_CONFIG.enabled,
    showDialog:
      typeof config?.showDialog === "boolean"
        ? config.showDialog
        : DEFAULT_DANGEROUS_RM_TIMEOUT_CONFIG.showDialog,
    denyOnHostCard:
      typeof config?.denyOnHostCard === "boolean"
        ? config.denyOnHostCard
        : DEFAULT_DANGEROUS_RM_TIMEOUT_CONFIG.denyOnHostCard,
    timeoutMs:
      typeof config?.timeoutMs === "number" &&
      Number.isFinite(config.timeoutMs) &&
      config.timeoutMs >= MIN_DANGEROUS_RM_DIALOG_TIMEOUT_MS &&
      config.timeoutMs <= MAX_DANGEROUS_RM_DIALOG_TIMEOUT_MS
        ? config.timeoutMs
        : DEFAULT_DANGEROUS_RM_TIMEOUT_CONFIG.timeoutMs,
    maxDialogTimeouts:
      typeof config?.maxDialogTimeouts === "number" &&
      Number.isInteger(config.maxDialogTimeouts) &&
      config.maxDialogTimeouts >= 0 &&
      config.maxDialogTimeouts <= MAX_DANGEROUS_RM_DIALOG_TIMEOUTS
        ? config.maxDialogTimeouts
        : DEFAULT_DANGEROUS_RM_TIMEOUT_CONFIG.maxDialogTimeouts,
  };
}
//@ chunk-e6aww6q8.js:1017811-1017821 placement
/**
 * 本会话中“未回答安全检查”的计数，加上自动拒绝窗口是否过期的状态。bqt/P5s/rwt 分别读取、自增、重置。
 */
var unansweredSafetyCheckCount = 0;
//@ chunk-e6aww6q8.js:1017821-1017847 placement
/**
 * 读取未回答安全检查的计数。
 */
function getUnansweredSafetyCheckCount() {
  return unansweredSafetyCheckCount;
}
//@ chunk-e6aww6q8.js:1017847-1017880 placement
/**
 * 未回答安全检查计数加一并返回新值。
 */
function incrementUnansweredSafetyCheckCount() {
  unansweredSafetyCheckCount += 1;
  return unansweredSafetyCheckCount;
}
//@ chunk-e6aww6q8.js:1017880-1017916 placement
/**
 * 未回答安全检查计数清零，并清除自动拒绝窗口的过期标记。
 */
function resetUnansweredSafetyCheckCount() {
  unansweredSafetyCheckCount = 0;
  unansweredWindowState.expired = false;
}
//@ chunk-e6aww6q8.js:1017916-1017961 placement
/**
 * 记录“自动拒绝窗口是否已过期”的可响应对象。
 */
var unansweredWindowState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1017916", () => {
  unansweredWindowState = identity_2(
    {
      expired: false,
    },
    (state) => {
      state.expired = false;
    },
  );
});
//@ chunk-e6aww6q8.js:1017961-1017995 placement
/**
 * 读取自动拒绝窗口是否已过期。
 */
function isUnansweredWindowExpired() {
  return unansweredWindowState.expired;
}
//@ chunk-e6aww6q8.js:1017995-1018035 placement
/**
 * 设置自动拒绝窗口的过期标记。
 */
function setUnansweredWindowExpired({ expired }) {
  unansweredWindowState.expired = expired;
}
export {
  getDangerousRmTimeoutConfig,
  getUnansweredSafetyCheckCount,
  resetUnansweredSafetyCheckCount,
  isAutoDenyTimedDialogEnabled,
  isUnansweredWindowExpired,
  incrementUnansweredSafetyCheckCount,
  setUnansweredWindowExpired,
};
