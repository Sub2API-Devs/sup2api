/**
 * commands/feedback/feedbackPolicy.ts
 *
 * 2.1.316 新增：/feedback 被环境变量或非必要流量开关禁用的判定与原因
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hwmsct5x.js (7)
 * attribution: placement 7
 */
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { hipaaTaintsOnly, getCurrentTaints } from "../../services/policyLimits/complianceTaints.js";
import { GITHUB_ISSUES_REPO_URL } from "../../components/Feedback.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";

//@ chunk-hwmsct5x.js:197450-197534 placement
function checkProductFeedbackAllowed(command = "/feedback") {
  return (
    getFeedbackDisabledReason(command) ??
    policyDeniedReason("allow_product_feedback", command, "is", feedbackPolicyDisabledText(command))
  );
}
//@ chunk-hwmsct5x.js:197606-197679 placement
var FEEDBACK_DISABLED_BY_POLICY = "Feedback submission is disabled by your organization's policy.";
//@ chunk-hwmsct5x.js:197679-197889 placement
function appendBugReportHint(e, n) {
  let r = /[.!?\u2026]$/.test(e) ? e : `${e}.`;
  if (n === FEEDBACK_DISABLED_BY_POLICY || hipaaTaintsOnly(getCurrentTaints()).length > 0) return r;
  return `${r} To report a bug, open an issue at ${GITHUB_ISSUES_REPO_URL()}. Issues are public, so leave out anything confidential.`;
}
//@ chunk-hwmsct5x.js:197889-197966 placement
function feedbackPolicyDisabledText(e) {
  return appendBugReportHint(`${e} is disabled by your organization's policy.`);
}
//@ chunk-hwmsct5x.js:197966-198322 placement
/**
 * 按 DISABLE_FEEDBACK_COMMAND / DISABLE_BUG_COMMAND / 非必要流量开关 返回 /feedback 被禁用的原因。
 */
function getFeedbackDisabledReason(e) {
  if (env.DISABLE_FEEDBACK_COMMAND)
    return `${e} has been disabled via the DISABLE_FEEDBACK_COMMAND environment variable`;
  if (env.DISABLE_BUG_COMMAND)
    return `${e} has been disabled via the DISABLE_BUG_COMMAND environment variable`;
  if (isEssentialTrafficOnly())
    return `${e} has been disabled via the CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC environment variable`;
  return null;
}
//@ chunk-hwmsct5x.js:198322-198367 placement
function isFeedbackDisabledByEnv() {
  return getFeedbackDisabledReason("/feedback") !== null;
}
//@ chunk-hwmsct5x.js:198367-198401 placement
function isFeedbackAllowed() {
  return checkProductFeedbackAllowed() === null;
}
export {
  isFeedbackAllowed,
  checkProductFeedbackAllowed,
  FEEDBACK_DISABLED_BY_POLICY,
  appendBugReportHint,
  isFeedbackDisabledByEnv,
};
