/**
 * services/policyLimits/orgPolicyDeniedEvent.ts
 *
 * 2.1.316 新增。记录组织策略拒绝事件 tengu_org_policy_denied。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gevvgx0q.js (4)
 * attribution: placement 4
 */
import { policyDenyKind } from "./policyVerdicts.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { hipaaTaintsOnly, getComplianceTaints } from "./complianceTaints.js";
import { logEvent, logEventAsync } from "../analytics/index.js";

//@ chunk-gevvgx0q.js:340-372 placement
var TENGU_ORG_POLICY_DENIED = "tengu_org_policy_denied";
//@ chunk-gevvgx0q.js:372-553 placement
/**
 * 组织策略拒绝事件字段
 */
function orgPolicyDeniedFields(i, o) {
  let e = policyDenyKind(i);
  if (e === null || e === "unregistered") return null;
  return {
    org_policy_key: fromEnum(i),
    org_policy_deny_kind: fromEnum(e),
    org_policy_taint_named: hipaaTaintsOnly(getComplianceTaints()).length > 0,
    surface: fromEnum(o),
  };
}
//@ chunk-gevvgx0q.js:553-595 placement
function logOrgPolicyDenied(i, o) {
  let e = orgPolicyDeniedFields(i, o);
  if (e) logEvent(TENGU_ORG_POLICY_DENIED, e);
}
//@ chunk-gevvgx0q.js:595-650 placement
/**
 * 记录组织策略拒绝事件 tengu_org_policy_denied。
 */
async function logOrgPolicyDeniedAsync(i, o) {
  let metadata = orgPolicyDeniedFields(i, o);
  if (metadata) await logEventAsync(TENGU_ORG_POLICY_DENIED, metadata);
}
export { logOrgPolicyDenied, logOrgPolicyDeniedAsync };
