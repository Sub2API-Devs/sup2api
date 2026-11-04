/**
 * utils/permissions/autoModeUnavailable.ts
 *
 * 2.1.316 新增：自动模式不可用提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (9)
 * attribution: placement 9
 */
import { antEnv } from "../env.js";
import { getAutoModeConfigOrDefault } from "./permissionSetup.js";
import { HostScoped } from "../hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1277955-1278093 placement
function shouldClassifyAskUserQuestion() {
  let override = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_ASK_USER_QUESTION;
  if (override !== undefined) return override;
  return getAutoModeConfigOrDefault()?.classifyAskUserQuestion !== false;
}
//@ chunk-e6aww6q8.js:1278093-1278266 placement
function describeAutoModeUnavailableCause(cause) {
  return cause === "no_classifier_for_session"
    ? "its safety check does not run for this session"
    : "its safety check keeps giving no result for this session's actions";
}
//@ chunk-e6aww6q8.js:1278266-1278293 placement
/**
 * autoModeUnavailableNotes：按宿主保存的 auto 模式不可用说明（Map）。
 */
var autoModeUnavailableNotes; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1278266", () => {
  autoModeUnavailableNotes = new HostScoped(() => new Map());
});
//@ chunk-e6aww6q8.js:1278293-1278609 placement
/**
 * 代理因 auto 模式不可用被停止时返回给父代理的说明文字。
 */
function buildAutoModeStoppedMessage(cause) {
  return `Auto mode is unavailable: ${describeAutoModeUnavailableCause(cause)}, so this agent was stopped before it finished. Nobody interrupted it; whatever it returned is partial. Starting it again ${cause === "no_classifier_for_session" ? "will" : "may"} stop the same way. Finish what you can without it, then tell the user what is blocked.`;
}
//@ chunk-e6aww6q8.js:1278609-1278680 placement
/**
 * chromeGrantAllowlistWithoutClassifier：auto 模式是否允许无分类器时的 Chrome 授权白名单。
 */
function chromeGrantAllowlistWithoutClassifier() {
  return getAutoModeConfigOrDefault()?.chromeGrantAllowlistWithoutClassifier !== false;
}
//@ chunk-e6aww6q8.js:1278680-1278713 placement
var AUTO_DENY_WINDOW_SYMBOL; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1278680", () => {
  AUTO_DENY_WINDOW_SYMBOL = Symbol("AutoDenyWindow");
});
//@ chunk-e6aww6q8.js:1278713-1278855 placement
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
//@ chunk-e6aww6q8.js:1278855-1278913 placement
/**
 * isRealAutoDenyWindow：存在且不是 “非安全检查” 的自动拒绝窗口。
 */
function isRealAutoDenyWindow(autoDenyWindow) {
  return autoDenyWindow !== undefined && autoDenyWindow.notASafetyCheck !== true;
}
//@ chunk-e6aww6q8.js:1278913-1278962 placement
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
  buildAutoModeStoppedMessage,
  isRealAutoDenyWindow,
  withAutoDenyDeadline,
};
