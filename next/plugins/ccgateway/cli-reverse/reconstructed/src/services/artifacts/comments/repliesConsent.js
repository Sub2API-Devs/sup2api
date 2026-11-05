/**
 * services/artifacts/comments/repliesConsent.ts
 *
 * 2.1.316 新增：评论自动回复的用户同意状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-k4jk4dzy.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-k4jk4dzy.js:191-260 placement
/**
 * 导出函数 `isConsentUiKind`：参数 e，返回 e === "interactive" || e === "sdk" || e === "bg_session"。
 */
function isConsentUiKind(publishContext) {
  return publishContext === "interactive" || publishContext === "sdk" || publishContext === "bg_session";
}
//@ chunk-k4jk4dzy.js:260-298 placement
/**
 * 评论回复同意写入器的标识（interactive/sdk/bg_session 三种界面）。
 */
var REPLIES_CONSENT_WRITER = {
  kind: "repliesConsentWriter",
};
export { isConsentUiKind, REPLIES_CONSENT_WRITER };
