/**
 * tools/BashTool/bashPermissionFlags.ts
 *
 * 2.1.316 新增：Bash 权限相关开关
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { identity as identity_2 } from "../../utils/identity.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1030746-1030808 placement
/**
 * 读取 tengu_delightful_goblet 开关（安全的默认值 false），控制权限对话框超时是否自动拒绝。
 */
function isAutoDenyTimedDialogEnabled() {
  return readFlagWithOverride("tengu_delightful_goblet", {
    safe: false,
  });
}
//@ chunk-5xgkngpb.js:1030808-1030955 placement
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
//@ chunk-5xgkngpb.js:1030955-1031607 placement
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
//@ chunk-5xgkngpb.js:1031607-1031617 placement
/**
 * 本会话中“未回答安全检查”的计数，加上自动拒绝窗口是否过期的状态。bqt/P5s/rwt 分别读取、自增、重置。
 */
var unansweredSafetyCheckCount = 0;
//@ chunk-5xgkngpb.js:1031617-1031643 placement
/**
 * 读取未回答安全检查的计数。
 */
function getUnansweredSafetyCheckCount() {
  return unansweredSafetyCheckCount;
}
//@ chunk-5xgkngpb.js:1031643-1031676 placement
/**
 * 未回答安全检查计数加一并返回新值。
 */
function incrementUnansweredSafetyCheckCount() {
  unansweredSafetyCheckCount += 1;
  return unansweredSafetyCheckCount;
}
//@ chunk-5xgkngpb.js:1031676-1031712 placement
/**
 * 未回答安全检查计数清零，并清除自动拒绝窗口的过期标记。
 */
function resetUnansweredSafetyCheckCount() {
  unansweredSafetyCheckCount = 0;
  unansweredWindowState.expired = false;
}
//@ chunk-5xgkngpb.js:1031712-1031757 placement
/**
 * 记录“自动拒绝窗口是否已过期”的可响应对象。
 */
var unansweredWindowState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1031712", () => {
  unansweredWindowState = identity_2(
    {
      expired: false,
    },
    (state) => {
      state.expired = false;
    },
  );
});
//@ chunk-5xgkngpb.js:1031757-1031791 placement
/**
 * 读取自动拒绝窗口是否已过期。
 */
function isUnansweredWindowExpired() {
  return unansweredWindowState.expired;
}
//@ chunk-5xgkngpb.js:1031791-1031831 placement
/**
 * 设置自动拒绝窗口的过期标记。
 */
function setUnansweredWindowExpired({ expired }) {
  unansweredWindowState.expired = expired;
}
export {
  getDangerousRmTimeoutConfig,
  isUnansweredWindowExpired,
  getUnansweredSafetyCheckCount,
  resetUnansweredSafetyCheckCount,
  setUnansweredWindowExpired,
  incrementUnansweredSafetyCheckCount,
  isAutoDenyTimedDialogEnabled,
};
