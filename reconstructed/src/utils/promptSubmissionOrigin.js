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
/**
 * submittedMessages：取提交消息列表。
 */
function submittedMessages(context) {
  return context.getMessages?.() ?? context.messages;
}
//@ chunk-s61vbvea.js:16842-16933 placement
/**
 * isBridgeOrVerifiedSlackTurn：桥接提交或已验证的 Slack 人类回合。
 */
function isBridgeOrVerifiedSlackTurn(e) {
  return e.dispatchedOverBridge === true || e.submissionVerifiedSlackHumanTurn === true;
}
//@ chunk-s61vbvea.js:16933-17042 placement
function isHumanTypedSubmission(e) {
  return (
    isHumanOrigin(e.submissionOrigin) &&
    !isBridgeOrVerifiedSlackTurn(e) &&
    (e.promptSource === "typed" || e.promptSource === "queued")
  );
}
//@ chunk-s61vbvea.js:17042-17102 placement
/**
 * isLocalStdinSubmission：本地 stdin 提交且非桥接。
 */
function isLocalStdinSubmission(e) {
  return e.submittedOnLocalStdin === true && !isBridgeOrVerifiedSlackTurn(e);
}
//@ chunk-s61vbvea.js:17102-17197 placement
/**
 * isHumanSubmittedTurn：人类来源的提交回合。
 */
function isHumanSubmittedTurn(context) {
  return (
    isLocalStdinSubmission(context) ||
    (isHumanOrigin(context.submissionOrigin) && context.submissionVerifiedSlackHumanTurn !== true)
  );
}
//@ chunk-s61vbvea.js:17197-17267 placement
/**
 * isSessionChannelPerson：由会话频道的人提交。
 */
function isSessionChannelPerson(e) {
  return e.submittedBySessionChannelPerson === true && !isBridgeOrVerifiedSlackTurn(e);
}
//@ chunk-s61vbvea.js:17267-17338 placement
/**
 * isMidTurnStreaming：是否处于回合中流式输出。
 */
function isMidTurnStreaming(context) {
  return (context.getIsResponseStreaming?.() ?? context.isMidTurn) === true;
}
//@ chunk-s61vbvea.js:17338-17411 placement
/**
 * runsBesideTurns：local-jsx 提交且在回合旁运行。
 */
function runsBesideTurns(e) {
  return e?.type === "local-jsx" && e.runsBesideTurns?.() === true;
}
export {
  submittedMessages,
  isMidTurnStreaming,
  runsBesideTurns,
  isBridgeOrVerifiedSlackTurn,
  isLocalStdinSubmission,
  isSessionChannelPerson,
  isHumanTypedSubmission,
  isHumanSubmittedTurn,
};
