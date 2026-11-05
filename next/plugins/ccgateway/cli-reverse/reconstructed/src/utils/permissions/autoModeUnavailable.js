/**
 * utils/permissions/autoModeUnavailable.ts
 *
 * 2.1.316 新增：自动模式不可用提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { antEnv } from "../env.js";
import { getAutoModeConfigOrDefault } from "./permissionSetup.js";
import { HostScoped } from "../hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1284724-1284862 placement
function shouldClassifyAskUserQuestion() {
  let override = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_ASK_USER_QUESTION;
  if (override !== undefined) return override;
  return getAutoModeConfigOrDefault()?.classifyAskUserQuestion !== false;
}
//@ chunk-5xgkngpb.js:1284862-1285035 placement
function describeAutoModeUnavailableCause(cause) {
  return cause === "no_classifier_for_session"
    ? "its safety check does not run for this session"
    : "its safety check keeps giving no result for this session's actions";
}
//@ chunk-5xgkngpb.js:1285035-1285062 placement
/**
 * autoModeUnavailableNotes：按宿主保存的 auto 模式不可用说明（Map）。
 */
var autoModeUnavailableNotes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1285035", () => {
  autoModeUnavailableNotes = new HostScoped(() => new Map());
});
//@ chunk-5xgkngpb.js:1285062-1285378 placement
/**
 * 代理因 auto 模式不可用被停止时返回给父代理的说明文字。
 */
function buildAutoModeStoppedMessage(cause) {
  return `Auto mode is unavailable: ${describeAutoModeUnavailableCause(cause)}, so this agent was stopped before it finished. Nobody interrupted it; whatever it returned is partial. Starting it again ${cause === "no_classifier_for_session" ? "will" : "may"} stop the same way. Finish what you can without it, then tell the user what is blocked.`;
}
//@ chunk-5xgkngpb.js:1285378-1285449 placement
/**
 * chromeGrantAllowlistWithoutClassifier：auto 模式是否允许无分类器时的 Chrome 授权白名单。
 */
function chromeGrantAllowlistWithoutClassifier() {
  return getAutoModeConfigOrDefault()?.chromeGrantAllowlistWithoutClassifier !== false;
}
//@ chunk-5xgkngpb.js:1285449-1285482 placement
var AUTO_DENY_WINDOW_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1285449", () => {
  AUTO_DENY_WINDOW_SYMBOL = Symbol("AutoDenyWindow");
});
//@ chunk-5xgkngpb.js:1285482-1285624 placement
function buildAutoDenyMarker(details) {
  return {
    [AUTO_DENY_WINDOW_SYMBOL]: true,
    autoDenyAfterMs: details.autoDenyAfterMs,
    autoDenyResolution: details.resolution,
    ...(details.notASafetyCheck && {
      notASafetyCheck: true,
    }),
  };
}
//@ chunk-5xgkngpb.js:1285624-1285682 placement
/**
 * isRealAutoDenyWindow：存在且不是 “非安全检查” 的自动拒绝窗口。
 */
function isRealAutoDenyWindow(autoDenyWindow) {
  return autoDenyWindow !== undefined && autoDenyWindow.notASafetyCheck !== true;
}
//@ chunk-5xgkngpb.js:1285682-1285731 placement
/**
 * withAutoDenyDeadline：给自动拒绝窗口附加截止时间。
 */
function withAutoDenyDeadline(autoDenyWindow, deadlineEpochMs) {
  return {
    ...autoDenyWindow,
    deadlineEpochMs,
  };
}
export {
  chromeGrantAllowlistWithoutClassifier,
  shouldClassifyAskUserQuestion,
  autoModeUnavailableNotes,
  describeAutoModeUnavailableCause,
  buildAutoDenyMarker,
  isRealAutoDenyWindow,
  withAutoDenyDeadline,
  buildAutoModeStoppedMessage,
};
