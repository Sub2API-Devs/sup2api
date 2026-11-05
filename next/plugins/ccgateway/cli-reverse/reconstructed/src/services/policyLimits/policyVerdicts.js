/**
 * services/policyLimits/policyVerdicts.ts
 *
 * 2.1.316 新增：策略裁决注册与查询
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f3md3zsc.js (15)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { complianceTaintState } from "./complianceTaints.js";

//@ chunk-f3md3zsc.js:1626-1665 placement
function registerPolicyVerdict(verdict) {
  complianceTaintState().registerVerdict(verdict);
}
//@ chunk-f3md3zsc.js:1665-1723 placement
function isPolicyAllowed(policyKey) {
  return complianceTaintState().verdict?.isPolicyAllowed(policyKey) ?? false;
}
//@ chunk-f3md3zsc.js:1723-1793 placement
function rememberedCoreSkills() {
  let verdict = complianceTaintState().verdict;
  return verdict ? verdict.rememberedCoreSkills() : [];
}
//@ chunk-f3md3zsc.js:1793-1880 placement
function commandPolicyGateAllows(policy) {
  try {
    return complianceTaintState().verdict?.commandPolicyGateAllows(policy) ?? false;
  } catch {
    return false;
  }
}
//@ chunk-f3md3zsc.js:1880-1967 placement
function policyDenyKind(policyKey) {
  let verdict = complianceTaintState().verdict;
  if (!verdict) return "unregistered";
  return verdict.policyDenyKind(policyKey);
}
//@ chunk-f3md3zsc.js:1967-2038 placement
function policyDeniedReason(policyKey, featureLabel, verb) {
  return complianceTaintState().verdict?.policyDeniedReason(policyKey, featureLabel, verb) ?? null;
}
//@ chunk-f3md3zsc.js:2038-2103 placement
function complianceTaintsSettled() {
  return complianceTaintState().verdict?.complianceTaintsSettled() ?? false;
}
//@ chunk-f3md3zsc.js:2103-2213 placement
function isPolicyLimitsCacheMissing() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return !verdict.policyLimitsCacheLoaded();
  } catch {
    return true;
  }
}
//@ chunk-f3md3zsc.js:2213-2337 placement
function autoDefaultVerdictState() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return "loaded";
  try {
    return verdict.autoDefaultVerdictState();
  } catch {
    return "pending";
  }
}
//@ chunk-f3md3zsc.js:2337-2443 placement
function isPolicyVerdictAbsent() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.policyVerdictAbsent();
  } catch {
    return true;
  }
}
//@ chunk-f3md3zsc.js:2443-2557 placement
function isSessionVerdictUnattributed() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.sessionVerdictUnattributed();
  } catch {
    return true;
  }
}
//@ chunk-f3md3zsc.js:2557-2578 placement
var UNREADABLE_PRINCIPAL = "unreadable";
//@ chunk-f3md3zsc.js:2578-2661 placement
function rowPrincipalStamp() {
  try {
    return complianceTaintState().verdict?.rowPrincipalStamp() ?? null;
  } catch {
    return UNREADABLE_PRINCIPAL;
  }
}
//@ chunk-f3md3zsc.js:2661-2772 placement
function isRowOfAnotherPrincipal(stamp) {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.rowOfAnotherPrincipal(stamp);
  } catch {
    return true;
  }
}
//@ chunk-f3md3zsc.js:2772-2883 placement
function principalSeenUnderHipaa() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.principalSeenUnderHipaa();
  } catch {
    return true;
  }
}
export {
  isPolicyAllowed,
  policyDeniedReason,
  UNREADABLE_PRINCIPAL,
  registerPolicyVerdict,
  isPolicyVerdictAbsent,
  autoDefaultVerdictState,
  commandPolicyGateAllows,
  policyDenyKind,
  isPolicyLimitsCacheMissing,
  complianceTaintsSettled,
  rememberedCoreSkills,
  isSessionVerdictUnattributed,
  rowPrincipalStamp,
  isRowOfAnotherPrincipal,
  principalSeenUnderHipaa,
};
