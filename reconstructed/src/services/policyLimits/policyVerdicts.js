/**
 * services/policyLimits/policyVerdicts.ts
 *
 * 2.1.316 新增：策略裁决注册与查询
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1rckdhfn.js (15)
 * attribution: placement 15
 */
import { complianceTaintState } from "./complianceTaints.js";

//@ chunk-1rckdhfn.js:1626-1665 placement
function registerPolicyVerdict(verdict) {
  complianceTaintState().registerVerdict(verdict);
}
//@ chunk-1rckdhfn.js:1665-1723 placement
function isPolicyAllowed(policyKey) {
  return complianceTaintState().verdict?.isPolicyAllowed(policyKey) ?? false;
}
//@ chunk-1rckdhfn.js:1723-1793 placement
function rememberedCoreSkills() {
  let verdict = complianceTaintState().verdict;
  return verdict ? verdict.rememberedCoreSkills() : [];
}
//@ chunk-1rckdhfn.js:1793-1880 placement
function commandPolicyGateAllows(policy) {
  try {
    return complianceTaintState().verdict?.commandPolicyGateAllows(policy) ?? false;
  } catch {
    return false;
  }
}
//@ chunk-1rckdhfn.js:1880-1967 placement
function policyDenyKind(policyKey) {
  let verdict = complianceTaintState().verdict;
  if (!verdict) return "unregistered";
  return verdict.policyDenyKind(policyKey);
}
//@ chunk-1rckdhfn.js:1967-2038 placement
function policyDeniedReason(policyKey, featureLabel, verb) {
  return complianceTaintState().verdict?.policyDeniedReason(policyKey, featureLabel, verb) ?? null;
}
//@ chunk-1rckdhfn.js:2038-2103 placement
function complianceTaintsSettled() {
  return complianceTaintState().verdict?.complianceTaintsSettled() ?? false;
}
//@ chunk-1rckdhfn.js:2103-2213 placement
function isPolicyLimitsCacheMissing() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return !verdict.policyLimitsCacheLoaded();
  } catch {
    return true;
  }
}
//@ chunk-1rckdhfn.js:2213-2337 placement
function autoDefaultVerdictState() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return "loaded";
  try {
    return verdict.autoDefaultVerdictState();
  } catch {
    return "pending";
  }
}
//@ chunk-1rckdhfn.js:2337-2443 placement
function isPolicyVerdictAbsent() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.policyVerdictAbsent();
  } catch {
    return true;
  }
}
//@ chunk-1rckdhfn.js:2443-2557 placement
function isSessionVerdictUnattributed() {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.sessionVerdictUnattributed();
  } catch {
    return true;
  }
}
//@ chunk-1rckdhfn.js:2557-2578 placement
var UNREADABLE_PRINCIPAL = "unreadable";
//@ chunk-1rckdhfn.js:2578-2661 placement
function rowPrincipalStamp() {
  try {
    return complianceTaintState().verdict?.rowPrincipalStamp() ?? null;
  } catch {
    return UNREADABLE_PRINCIPAL;
  }
}
//@ chunk-1rckdhfn.js:2661-2772 placement
function isRowOfAnotherPrincipal(stamp) {
  let verdict = complianceTaintState().verdict;
  if (verdict === undefined) return false;
  try {
    return verdict.rowOfAnotherPrincipal(stamp);
  } catch {
    return true;
  }
}
//@ chunk-1rckdhfn.js:2772-2883 placement
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
  commandPolicyGateAllows,
  policyDenyKind,
  autoDefaultVerdictState,
  UNREADABLE_PRINCIPAL,
  registerPolicyVerdict,
  rememberedCoreSkills,
  isPolicyLimitsCacheMissing,
  complianceTaintsSettled,
  isPolicyVerdictAbsent,
  isSessionVerdictUnattributed,
  rowPrincipalStamp,
  isRowOfAnotherPrincipal,
  principalSeenUnderHipaa,
};
