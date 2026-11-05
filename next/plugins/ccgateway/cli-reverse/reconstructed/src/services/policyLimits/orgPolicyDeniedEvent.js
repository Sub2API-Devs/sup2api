/**
 * services/policyLimits/orgPolicyDeniedEvent.ts
 *
 * 2.1.316 新增。记录组织策略拒绝事件 tengu_org_policy_denied。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3rrm9aty.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { policyDenyKind } from "./policyVerdicts.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { hipaaTaintsOnly, getComplianceTaints } from "./complianceTaints.js";
import { logEvent, logEventAsync } from "../analytics/index.js";

//@ chunk-3rrm9aty.js:340-372 placement
var TENGU_ORG_POLICY_DENIED = "tengu_org_policy_denied";
//@ chunk-3rrm9aty.js:372-553 placement
/**
 * 组织策略拒绝事件字段
 */
function orgPolicyDeniedFields(policyKey, surface) {
  let denyKind = policyDenyKind(policyKey);
  if (denyKind === null || denyKind === "unregistered") return null;
  return {
    org_policy_key: fromEnum(policyKey),
    org_policy_deny_kind: fromEnum(denyKind),
    org_policy_taint_named: hipaaTaintsOnly(getComplianceTaints()).length > 0,
    surface: fromEnum(surface),
  };
}
//@ chunk-3rrm9aty.js:553-595 placement
function logOrgPolicyDenied(policyKey, surface) {
  let fields = orgPolicyDeniedFields(policyKey, surface);
  if (fields) logEvent(TENGU_ORG_POLICY_DENIED, fields);
}
//@ chunk-3rrm9aty.js:595-650 placement
/**
 * 记录组织策略拒绝事件 tengu_org_policy_denied。
 */
async function logOrgPolicyDeniedAsync(policyKey, surface) {
  let metadata = orgPolicyDeniedFields(policyKey, surface);
  if (metadata) await logEventAsync(TENGU_ORG_POLICY_DENIED, metadata);
}
export { logOrgPolicyDenied, logOrgPolicyDeniedAsync };
