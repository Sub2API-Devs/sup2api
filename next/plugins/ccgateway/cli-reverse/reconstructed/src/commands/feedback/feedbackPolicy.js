/**
 * commands/feedback/feedbackPolicy.ts
 *
 * 2.1.316 新增：/feedback 被环境变量或非必要流量开关禁用的判定与原因
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vn3g7zt8.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { policyDeniedReason } from "../../services/policyLimits/policyEvidence.js";
import { hipaaTaintsOnly, getCurrentTaints } from "../../services/policyLimits/complianceTaints.js";
import { GITHUB_ISSUES_REPO_URL } from "../../components/Feedback.js";
import { env } from "../../utils/env.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";

//@ chunk-vn3g7zt8.js:197840-197924 placement
function checkProductFeedbackAllowed(command = "/feedback") {
  return (
    getFeedbackDisabledReason(command) ??
    policyDeniedReason("allow_product_feedback", command, "is", feedbackPolicyDisabledText(command))
  );
}
//@ chunk-vn3g7zt8.js:197996-198069 placement
var FEEDBACK_DISABLED_BY_POLICY = "Feedback submission is disabled by your organization's policy.";
//@ chunk-vn3g7zt8.js:198069-198279 placement
function appendBugReportHint(text, context) {
  let sentence = /[.!?\u2026]$/.test(text) ? text : `${text}.`;
  if (context === FEEDBACK_DISABLED_BY_POLICY || hipaaTaintsOnly(getCurrentTaints()).length > 0)
    return sentence;
  return `${sentence} To report a bug, open an issue at ${GITHUB_ISSUES_REPO_URL()}. Issues are public, so leave out anything confidential.`;
}
//@ chunk-vn3g7zt8.js:198279-198356 placement
function feedbackPolicyDisabledText(reason) {
  return appendBugReportHint(`${reason} is disabled by your organization's policy.`);
}
//@ chunk-vn3g7zt8.js:198356-198712 placement
/**
 * 按 DISABLE_FEEDBACK_COMMAND / DISABLE_BUG_COMMAND / 非必要流量开关 返回 /feedback 被禁用的原因。
 */
function getFeedbackDisabledReason(context) {
  if (env.DISABLE_FEEDBACK_COMMAND)
    return `${context} has been disabled via the DISABLE_FEEDBACK_COMMAND environment variable`;
  if (env.DISABLE_BUG_COMMAND)
    return `${context} has been disabled via the DISABLE_BUG_COMMAND environment variable`;
  if (isEssentialTrafficOnly())
    return `${context} has been disabled via the CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC environment variable`;
  return null;
}
//@ chunk-vn3g7zt8.js:198712-198757 placement
function isFeedbackDisabledByEnv() {
  return getFeedbackDisabledReason("/feedback") !== null;
}
//@ chunk-vn3g7zt8.js:198757-198791 placement
function isFeedbackAllowed() {
  return checkProductFeedbackAllowed() === null;
}
export {
  checkProductFeedbackAllowed,
  isFeedbackAllowed,
  FEEDBACK_DISABLED_BY_POLICY,
  appendBugReportHint,
  isFeedbackDisabledByEnv,
};
