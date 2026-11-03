/**
 * utils/permissions/autoModeUnavailable.ts
 *
 * 2.1.316 新增：自动模式不可用提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (11)
 * attribution: placement 11
 */
import { antEnv } from "../env.js";
import { getAutoModeConfigOrDefault } from "./permissionSetup.js";
import { HostScoped } from "../hostScoped.js";

//@ chunk-e6aww6q8.js:1277955-1278093 placement
function shouldClassifyAskUserQuestion() {
  let e = antEnv.CLAUDE_CODE_AUTO_MODE_CLASSIFY_ASK_USER_QUESTION;
  if (e !== void 0) return e;
  return getAutoModeConfigOrDefault()?.classifyAskUserQuestion !== !1;
}
//@ chunk-e6aww6q8.js:1278093-1278266 placement
function describeAutoModeUnavailableCause(e) {
  return e === "no_classifier_for_session"
    ? "its safety check does not run for this session"
    : "its safety check keeps giving no result for this session's actions";
}
//@ chunk-e6aww6q8.js:1278266-1278293 placement
var jjr = new HostScoped(() => new Map());
/**
 * 代理因 auto 模式不可用被停止时返回给父代理的说明文字。
 */
//@ chunk-e6aww6q8.js:1278293-1278609 placement
function buildAutoModeStoppedMessage(e) {
  return `Auto mode is unavailable: ${describeAutoModeUnavailableCause(e)}, so this agent was stopped before it finished. Nobody interrupted it; whatever it returned is partial. Starting it again ${e === "no_classifier_for_session" ? "will" : "may"} stop the same way. Finish what you can without it, then tell the user what is blocked.`;
}
//@ chunk-e6aww6q8.js:1278609-1278680 placement
function D4t() {
  return getAutoModeConfigOrDefault()?.chromeGrantAllowlistWithoutClassifier !== !1;
}
//@ chunk-e6aww6q8.js:1278680-1278713 placement
var NNo = Symbol("AutoDenyWindow");
//@ chunk-e6aww6q8.js:1278713-1278855 placement
function buildAutoDenyMarker(e) {
  return {
    [NNo]: !0,
    autoDenyAfterMs: e.autoDenyAfterMs,
    autoDenyResolution: e.resolution,
    ...(e.notASafetyCheck && { notASafetyCheck: !0 }),
  };
}
//@ chunk-e6aww6q8.js:1278855-1278913 placement
function _pn(e) {
  return e !== void 0 && e.notASafetyCheck !== !0;
}
//@ chunk-e6aww6q8.js:1278913-1278962 placement
function N5s(e, n) {
  return { ...e, deadlineEpochMs: n };
}
//@ chunk-e6aww6q8.js:1278962-1279002 placement
function Lqe(e) {
  return !e?.createIfEmpty;
}
//@ chunk-e6aww6q8.js:1279002-1279034 placement
function B4t(e) {
  return !e?.clear;
}

export {
  D4t,
  shouldClassifyAskUserQuestion,
  jjr,
  describeAutoModeUnavailableCause,
  buildAutoDenyMarker,
  buildAutoModeStoppedMessage,
  B4t,
  Lqe,
  _pn,
  N5s,
};
