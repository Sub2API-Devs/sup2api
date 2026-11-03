/**
 * remote/tools/serve/servedSafetyChecks.ts
 *
 * 2.1.316 新增：服务端调用的安全检查与分类
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (35)
 * attribution: placement 35
 */
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import {
  credentialPathRules,
  prefixRuleLiterals,
  HOST_CREDENTIAL_RULE_SOURCE,
  defaultCredentialDenyRules,
} from "./credentialPathGuards.js";
import { claudeStateGlobs } from "../../../utils/permissions/claudeStatePaths.js";
import { Dst } from "../../../utils/wslMounts.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { logError } from "../../../utils/log.js";
import { autoModeRefusedHere } from "../../../utils/permissions/permissionSetup.js";
import { cNt } from "../../../services/remoteTools/pathMapping.js";
import { isAbortError, sanitizedMachineReasonForTelemetry } from "../../../utils/errors.js";
import { logEvent } from "../../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../../services/analytics/safeMetadata.js";
import { ye } from "../../../utils/startupMarks.js";
import { dKe } from "../../../utils/permissions/permissions.js";
import { sanitizeToolNameForAnalytics } from "../../../services/analytics/metadata.js";
import { createCombinedAbortSignal } from "../../../utils/combinedAbortSignal.js";
import {
  formatActionForClassifier,
  compactActionForTools,
  classifyYoloAction,
  isTransientClassifierError,
} from "../../../utils/permissions/yoloClassifier.js";
import { formatPermissionRule } from "../../../utils/permissions/disallowedToolsFlag.js";
import { getPathsForPermissionCheck } from "../../../utils/fsOperations.js";
import {
  checkReadNetworkPathSafety,
  isUntrustedAutomountPath,
  isUntrustedUncPath,
  hasSuspiciousWindowsPathPattern,
} from "../../../utils/permissions/filesystem.js";
import { GLOB_TOOL_NAME } from "../../../tools/GlobTool/prompt.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";

//@ chunk-tr0s0d0k.js:35380-35874 placement
function credentialRuleKind(e) {
  if (e.ruleValue.toolName === BASH_TOOL_NAME || e.ruleValue.toolName === POWERSHELL_TOOL_NAME)
    return "keychain";
  let n = e.ruleValue.ruleContent ?? "",
    o = credentialPathRules();
  if (
    claudeStateGlobs([
      ...o,
      ...Dst().flatMap(({ mountPoint: mountPoint }) => prefixRuleLiterals(mountPoint, o)),
    ]).includes(n)
  )
    return "personal_credential";
  if (/\/daemon\/dispatch\/\*\*$/.test(n)) return "exec_ingest";
  if (/\/Library\/Keychains\/\*\*$/.test(n)) return "keychain_files";
  if (/\/Microsoft\/(?:Credentials|Vault|Protect)\/\*\*$/.test(n)) return "credential_store_files";
  return e.ruleValue.toolName === FILE_EDIT_TOOL_NAME ? "write" : "read";
}
//@ chunk-tr0s0d0k.js:35874-35905 placement
var TENGU_REACTIVE_ZEPHYR = "tengu_reactive_zephyr";
//@ chunk-tr0s0d0k.js:35905-35943 placement
function Et() {
  return readFlagWithOverride(TENGU_REACTIVE_ZEPHYR, { safe: !1 });
}
//@ chunk-tr0s0d0k.js:35943-35959 placement
var MAY_ANSWER = { may: !0 };
//@ chunk-tr0s0d0k.js:35959-35995 placement
function mayNotAnswer(e) {
  return { may: !1, why: e };
}
//@ chunk-tr0s0d0k.js:35995-36120 placement
function hookAskKind(e) {
  return e.decisionReason?.type === "hook" && e.decisionReason.heldForServedCall === !0
    ? "hook_held"
    : "hook_forced_ask";
}
//@ chunk-tr0s0d0k.js:36120-36213 placement
function unanswerableAskKind(e, n) {
  if (e.behavior !== "ask") return "other";
  return n ? hookAskKind(e) : "unresolved_shell_write";
}
//@ chunk-tr0s0d0k.js:36213-36342 placement
function safeTelemetryValue(e, n) {
  try {
    return n();
  } catch (error) {
    return (logError(Error("a served call's telemetry value could not be worked out", { cause: error })), e);
  }
}
//@ chunk-tr0s0d0k.js:36342-36489 placement
function unattendedStanceKind(e) {
  return safeTelemetryValue("other", () => {
    if (e !== "own_record") return e === "conveyed" ? "conveyed_stance" : "other";
    return autoModeRefusedHere() ? "auto_refused" : "consent";
  });
}
//@ chunk-tr0s0d0k.js:36489-36766 placement
var SAFETY_CHECK_TELEMETRY = {
  dangerousRemoval: "safety_check_dangerous_removal",
  backgroundOperator: "safety_check_background_operator",
  suspiciousWindowsPath: "safety_check_suspicious_windows_path",
  outsideReadsBlocked: "safety_check_outside_reads_blocked",
  restrictedMode: "safety_check_restricted_mode",
};
//@ chunk-tr0s0d0k.js:36766-36906 placement
function safetyCheckKind(e) {
  if (e.classifierApprovable) return "settings_file";
  let circuitBreaker = e.circuitBreaker;
  return (
    (circuitBreaker === void 0 ? void 0 : SAFETY_CHECK_TELEMETRY[circuitBreaker]) ?? "safety_check_other"
  );
}
//@ chunk-tr0s0d0k.js:36906-37180 placement
function servedVerdictKind(e) {
  return safeTelemetryValue("other", () => {
    if (!e.first.may) return e.first.why;
    if (e.vetoed) return e.ownCheck === "block" ? "own_check_block" : "own_check_silence";
    if (!e.afterCheck.may) return e.afterCheck.why;
    return cNt.has(e.tool.name) || e.tool.isMcp === !0 ? "none" : "tool_not_answerable";
  });
}
//@ chunk-tr0s0d0k.js:37180-37668 placement
var SERVED_SAFETY_CONSTANTS = ["irreversible_local_destruction", "code_from_external"],
  Mt = 20000,
  Jr = 5000,
  xt = 2000,
  Ot = "This computer's own safety check did not clear this, so a person needs to approve it.",
  es = {
    irreversible_local_destruction:
      "This can delete files or discard changes for good, so a person needs to approve it.",
    code_from_external: "This may run code from outside this computer, so a person needs to approve it.",
  },
  ts = "This computer's own safety check did not answer, so a person needs to approve it.";
//@ chunk-tr0s0d0k.js:37668-37800 placement
function ownCheckMessage(e) {
  switch (e.verdict) {
    case "no_verdict":
      return ts;
    case "block":
      return e.kind === void 0 ? Ot : es[e.kind];
    case "allow":
      return Ot;
  }
}
//@ chunk-tr0s0d0k.js:37800-37903 placement
function joinSentences(e, n) {
  let trimEnd = e.trimEnd();
  if (trimEnd === "") return n;
  return `${/[.!?\u2026]$/.test(trimEnd) ? trimEnd : `${trimEnd}.`} ${n}`;
}
//@ chunk-tr0s0d0k.js:37903-37978 placement
function classifierBudgetMs(e) {
  if (e === void 0) return Mt;
  return Math.min(Mt, e - Date.now() - Jr);
}
//@ chunk-tr0s0d0k.js:37978-38828 placement
async function runServedSafetyCheck(e) {
  let now = Date.now(),
    o = await classifyServedCall(e, e.capMs),
    { judged: judged, blockCategory: blockCategory, failure: failure } = o,
    u = 1;
  if (e.again !== void 0 && o.mayPass)
    try {
      let _ = classifierBudgetMs(e.again.legDeadlineAt);
      if (_ >= xt) {
        u = 2;
        let S = await classifyServedCall(e, _);
        ((judged = S.judged), (blockCategory = S.blockCategory), (failure = S.failure));
      }
    } catch (error) {
      if (!e.stopSignal.aborted && !isAbortError(error)) logError(error);
    }
  let p = Date.now() - now;
  if (
    (logEvent("tengu_remote_tool_serve", {
      op: lit("second_check"),
      call_id: ye(e.callId),
      mode: lit("enforce"),
      verdict: fromEnum(judged.verdict),
      why: fromEnumOpt(judged.verdict === "no_verdict" ? judged.why : void 0),
      block_kind: safeTelemetryValue(void 0, () =>
        judged.verdict === "block" ? dKe(blockCategory) : void 0,
      ),
      error_kind:
        failure?.errorKind === void 0 ? void 0 : sanitizedMachineReasonForTelemetry(failure.errorKind),
      http_status: failure?.httpStatus,
      duration_ms: p,
      tool: sanitizeToolNameForAnalytics(e.tool.name),
      attempts: e.again === void 0 ? void 0 : u,
      overlapped_hold: e.again?.besideHold,
    }),
    judged.verdict !== "block")
  )
    return { ...judged, ms: p };
  let h = Et() ? SERVED_SAFETY_CONSTANTS.find((_) => _ === blockCategory) : void 0;
  return { verdict: "block", ...(h !== void 0 && { kind: h }), ms: p };
}
//@ chunk-tr0s0d0k.js:38828-40102 placement
async function classifyServedCall(e, n) {
  let o,
    r = !1,
    s,
    d;
  if (n < xt) o = { verdict: "no_verdict", why: "no_budget" };
  else {
    let u = createCombinedAbortSignal(e.stopSignal, { timeoutMs: n, refTimer: !0 });
    try {
      let p = formatActionForClassifier(e.tool.name, e.input);
      if (compactActionForTools(p, [e.tool]) === "") o = { verdict: "no_verdict", why: "not_run" };
      else {
        let h = await classifyYoloAction(
            [],
            p,
            [e.tool],
            { ...e.permissionContext, alwaysDenyRules: servedCredentialDenyRules(e.permissionContext) },
            u.signal,
            {
              isSubagentLoop: !1,
              recordPresumed: !1,
              onlyBuiltInContext: !0,
              judgesServedCall: !0,
              servedSessionMode: e.serviceWrittenSessionMode,
            },
          ),
          _ = It(u.signal, e.stopSignal),
          S =
            h.unavailable === !0 &&
            h.transcriptTooLong !== !0 &&
            h.refusedBySafeguard !== !0 &&
            h.failureMode === void 0;
        if (_ !== void 0) ((o = { verdict: "no_verdict", why: _ }), (r = _ === "timeout" && S));
        else if (h.classifierRan === !1) o = { verdict: "no_verdict", why: "not_run" };
        else if (
          h.unavailable === !0 ||
          h.transcriptTooLong === !0 ||
          h.refusedBySafeguard === !0 ||
          h.failureMode !== void 0
        )
          ((o = { verdict: "no_verdict", why: "unavailable" }),
            (d = { errorKind: h.errorKind, httpStatus: h.httpStatus }),
            (r =
              S &&
              h.retryAfterMs === void 0 &&
              isTransientClassifierError(h.errorKind) &&
              h.errorKind?.endsWith("_no_retry") !== !0));
        else ((o = { verdict: h.shouldBlock === !1 ? "allow" : "block" }), (s = h.category));
      }
    } catch (error) {
      let h = It(u.signal, e.stopSignal);
      if (h === void 0) logError(error);
      ((o = { verdict: "no_verdict", why: h ?? "threw" }), (r = h === "timeout"));
    } finally {
      u.cleanup();
    }
  }
  return { judged: o, mayPass: r, blockCategory: s, failure: d };
}
//@ chunk-tr0s0d0k.js:40102-40204 placement
function servedCredentialDenyRules(e) {
  let n = new Set(e.alwaysDenyRules[HOST_CREDENTIAL_RULE_SOURCE]);
  return {
    [HOST_CREDENTIAL_RULE_SOURCE]: defaultCredentialDenyRules()
      .map(formatPermissionRule)
      .filter((o) => n.has(o)),
  };
}
//@ chunk-tr0s0d0k.js:40204-40284 placement
function It(e, n) {
  if (n.aborted) return "stopped";
  return e.aborted ? "timeout" : void 0;
}
//@ chunk-tr0s0d0k.js:40284-40826 placement
var DEFENSE_IN_DEPTH_REASONS = new Set([
  "Automount -hosts path detected (defense-in-depth check)",
  "Automount browse surface detected (defense-in-depth check)",
  "Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)",
  "UNC path detected (defense-in-depth check)",
  "UNC glob pattern detected (defense-in-depth check)",
  "Automount -hosts glob pattern detected (defense-in-depth check)",
  "Automount browse surface glob pattern detected (defense-in-depth check)",
  "Kernel-resolved path prefix (/.vol etc.) glob pattern detected (defense-in-depth check)",
]);
//@ chunk-tr0s0d0k.js:40826-40940 placement
function isDefenseInDepthAsk(e) {
  return (
    e.behavior === "ask" &&
    e.decisionReason?.type === "safetyCheck" &&
    DEFENSE_IN_DEPTH_REASONS.has(e.decisionReason.reason)
  );
}
//@ chunk-tr0s0d0k.js:40940-41226 placement
function readsNetworkPath(e, n, o) {
  if (typeof e.getPath !== "function") return !1;
  let path = e.getPath(n),
    s = getPathsForPermissionCheck(path);
  if (checkReadNetworkPathSafety(e, n, o, s) === null) return !1;
  let trustedNetworkDirectories = o.trustedNetworkDirectories,
    u = [path, ...s, ...(e.name === GLOB_TOOL_NAME && typeof n.pattern === "string" ? [n.pattern] : [])];
  return (
    u.some(
      (p) =>
        isUntrustedAutomountPath(p, trustedNetworkDirectories) ||
        isUntrustedUncPath(p, trustedNetworkDirectories),
    ) || !u.some((p) => hasSuspiciousWindowsPathPattern(p, trustedNetworkDirectories))
  );
}
//@ chunk-tr0s0d0k.js:41226-41271 placement = handleAutoModeTransition (0.799)
function isAutoOrPlanMode(e) {
  return e === "auto" || e === "plan";
}
//@ chunk-tr0s0d0k.js:41271-41592 placement
function classifyCcrContainerAsk(e) {
  if (e.callerKind !== "ccr_container") return;
  if (e.attested === !0) return "attested";
  return e.attested === !1 &&
    isAutoOrPlanMode(e.sessionMode) &&
    e.askedInMode === e.sessionMode &&
    e.classifierEligible &&
    !e.autoModeRefusedHere &&
    (e.sessionMode !== "plan" || e.planClaimBackedHere) &&
    (cNt.has(e.toolName) || e.isServedMcpTool)
    ? "auto_arm"
    : void 0;
}
//@ chunk-tr0s0d0k.js:41592-41623 placement
var TENGU_VIOLIN_PURFLING = "tengu_violin_purfling";
//@ chunk-tr0s0d0k.js:41623-41661 placement
function Ht() {
  return readFlagWithOverride(TENGU_VIOLIN_PURFLING, { safe: !0 });
}
//@ chunk-tr0s0d0k.js:41661-41699 placement
function Ie() {
  return readFlagWithOverride(TENGU_VIOLIN_PURFLING, { safe: !0 });
}
//@ chunk-tr0s0d0k.js:41699-41732 placement
var TENGU_REFACTORED_GADGET = "tengu_refactored_gadget";
//@ chunk-tr0s0d0k.js:41732-41770 placement
function Ut() {
  return readFlagWithOverride(TENGU_REFACTORED_GADGET, { safe: !1 });
}
//@ chunk-tr0s0d0k.js:41770-41845 placement
function Vt() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_arching", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-tr0s0d0k.js:41845-41873 placement
var TENGU_VIOLIN_EBONY = "tengu_violin_ebony";
//@ chunk-tr0s0d0k.js:41873-41911 placement
function jt() {
  return readFlagWithOverride(TENGU_VIOLIN_EBONY, { safe: !1 });
}
//@ chunk-tr0s0d0k.js:41911-41986 placement
function _n() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_tailgut", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-tr0s0d0k.js:41986-42043 placement
function zt() {
  return readFlagWithOverride("tengu_violin_camber", { safe: !1 });
}

export {
  credentialRuleKind,
  classifyCcrContainerAsk,
  unattendedStanceKind,
  Ht,
  zt,
  Vt,
  jt,
  Ie,
  _n,
  Ut,
  isDefenseInDepthAsk,
  readsNetworkPath,
  isAutoOrPlanMode,
  runServedSafetyCheck,
  classifierBudgetMs,
  ownCheckMessage,
  joinSentences,
  MAY_ANSWER,
  servedVerdictKind,
  mayNotAnswer,
  unanswerableAskKind,
  hookAskKind,
  safetyCheckKind,
};
