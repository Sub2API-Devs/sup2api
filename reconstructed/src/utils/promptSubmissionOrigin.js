/**
 * utils/promptSubmissionOrigin.ts
 *
 * 提示提交来源判定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (8)
 * attribution: placement 8
 */
import { isHumanOrigin } from "./turnOrigin.js";

//@ chunk-s61vbvea.js:16790-16842 placement
function yN(e) {
  return e.getMessages?.() ?? e.messages;
}
//@ chunk-s61vbvea.js:16842-16933 placement
function _N(e) {
  return e.dispatchedOverBridge === !0 || e.submissionVerifiedSlackHumanTurn === !0;
}
//@ chunk-s61vbvea.js:16933-17042 placement
function isHumanTypedSubmission(e) {
  return (
    isHumanOrigin(e.submissionOrigin) && !_N(e) && (e.promptSource === "typed" || e.promptSource === "queued")
  );
}
//@ chunk-s61vbvea.js:17042-17102 placement
function Ant(e) {
  return e.submittedOnLocalStdin === !0 && !_N(e);
}
//@ chunk-s61vbvea.js:17102-17197 placement
function O7s(e) {
  return Ant(e) || (isHumanOrigin(e.submissionOrigin) && e.submissionVerifiedSlackHumanTurn !== !0);
}
//@ chunk-s61vbvea.js:17197-17267 placement
function LZn(e) {
  return e.submittedBySessionChannelPerson === !0 && !_N(e);
}
//@ chunk-s61vbvea.js:17267-17338 placement
function XRe(e) {
  return (e.getIsResponseStreaming?.() ?? e.isMidTurn) === !0;
}
//@ chunk-s61vbvea.js:17338-17411 placement
function M7s(e) {
  return e?.type === "local-jsx" && e.runsBesideTurns?.() === !0;
}

export { yN, XRe, M7s, _N, Ant, LZn, isHumanTypedSubmission, O7s };
