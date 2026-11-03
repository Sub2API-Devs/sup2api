/**
 * services/artifacts/comments/repliesConsent.ts
 *
 * 2.1.316 新增：评论自动回复的用户同意状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tq1fsmqn.js (2)
 * attribution: placement 2
 */

//@ chunk-tq1fsmqn.js:191-260 placement
/**
 * 导出函数 `isConsentUiKind`：参数 e，返回 e === "interactive" || e === "sdk" || e === "bg_session"。
 */
function isConsentUiKind(publishContext) {
  return publishContext === "interactive" || publishContext === "sdk" || publishContext === "bg_session";
}
//@ chunk-tq1fsmqn.js:260-298 placement
/**
 * 评论回复同意写入器的标识（interactive/sdk/bg_session 三种界面）。
 */
var REPLIES_CONSENT_WRITER = {
  kind: "repliesConsentWriter",
};
export { isConsentUiKind, REPLIES_CONSENT_WRITER };
