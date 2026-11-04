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
import { secondRootMounts } from "../../../utils/wslMounts.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { logError } from "../../../utils/log.js";
import { autoModeRefusedHere } from "../../../utils/permissions/permissionSetup.js";
import { PATH_SENSITIVE_TOOLS } from "../../../services/remoteTools/pathMapping.js";
import { isAbortError, sanitizedMachineReasonForTelemetry } from "../../../utils/errors.js";
import { logEvent } from "../../../services/analytics/index.js";
import { lit, fromEnum, fromEnumOpt } from "../../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../../utils/startupMarks.js";
import { sanitizeRuleCategoryOrUndefined } from "../../../utils/permissions/permissions.js";
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
function credentialRuleKind(rule) {
  if (rule.ruleValue.toolName === BASH_TOOL_NAME || rule.ruleValue.toolName === POWERSHELL_TOOL_NAME)
    return "keychain";
  let ruleContent = rule.ruleValue.ruleContent ?? "";
  let credentialRules = credentialPathRules();
  if (
    claudeStateGlobs([
      ...credentialRules,
      ...secondRootMounts().flatMap(({ mountPoint }) => prefixRuleLiterals(mountPoint, credentialRules)),
    ]).includes(ruleContent)
  )
    return "personal_credential";
  if (/\/daemon\/dispatch\/\*\*$/.test(ruleContent)) return "exec_ingest";
  if (/\/Library\/Keychains\/\*\*$/.test(ruleContent)) return "keychain_files";
  if (/\/Microsoft\/(?:Credentials|Vault|Protect)\/\*\*$/.test(ruleContent)) return "credential_store_files";
  return rule.ruleValue.toolName === FILE_EDIT_TOOL_NAME ? "write" : "read";
}
//@ chunk-tr0s0d0k.js:35874-35905 placement
var TENGU_REACTIVE_ZEPHYR = "tengu_reactive_zephyr";
//@ chunk-tr0s0d0k.js:35905-35943 placement
function isReactiveSafetyCheckEnabled() {
  return readFlagWithOverride(TENGU_REACTIVE_ZEPHYR, {
    safe: false,
  });
}
//@ chunk-tr0s0d0k.js:35943-35959 placement
var MAY_ANSWER = {
  may: true,
};
//@ chunk-tr0s0d0k.js:35959-35995 placement
function mayNotAnswer(why) {
  return {
    may: false,
    why,
  };
}
//@ chunk-tr0s0d0k.js:35995-36120 placement
function hookAskKind(decision) {
  return decision.decisionReason?.type === "hook" && decision.decisionReason.heldForServedCall === true
    ? "hook_held"
    : "hook_forced_ask";
}
//@ chunk-tr0s0d0k.js:36120-36213 placement
function unanswerableAskKind(decision, forcedByHook) {
  if (decision.behavior !== "ask") return "other";
  return forcedByHook ? hookAskKind(decision) : "unresolved_shell_write";
}
//@ chunk-tr0s0d0k.js:36213-36342 placement
function safeTelemetryValue(fallback, compute) {
  try {
    return compute();
  } catch (error) {
    logError(
      Error("a served call's telemetry value could not be worked out", {
        cause: error,
      }),
    );
    return fallback;
  }
}
//@ chunk-tr0s0d0k.js:36342-36489 placement
function unattendedStanceKind(stanceValue) {
  return safeTelemetryValue("other", () => {
    if (stanceValue !== "own_record") return stanceValue === "conveyed" ? "conveyed_stance" : "other";
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
function safetyCheckKind(safetyCheckReason) {
  if (safetyCheckReason.classifierApprovable) return "settings_file";
  let circuitBreaker = safetyCheckReason.circuitBreaker;
  return (
    (circuitBreaker === undefined ? undefined : SAFETY_CHECK_TELEMETRY[circuitBreaker]) ??
    "safety_check_other"
  );
}
//@ chunk-tr0s0d0k.js:36906-37180 placement
function servedVerdictKind(verdicts) {
  return safeTelemetryValue("other", () => {
    if (!verdicts.first.may) return verdicts.first.why;
    if (verdicts.vetoed) return verdicts.ownCheck === "block" ? "own_check_block" : "own_check_silence";
    if (!verdicts.afterCheck.may) return verdicts.afterCheck.why;
    return PATH_SENSITIVE_TOOLS.has(verdicts.tool.name) || verdicts.tool.isMcp === true
      ? "none"
      : "tool_not_answerable";
  });
}
//@ chunk-tr0s0d0k.js:37180-37668 placement
/**
 * 本机安全检查（destructive-command 分类器）的预算与文案：20 s 总预算、5 s 余量、2 s 最小预算，按不可逆删除/外部代码两类给出询问文案，以及未答与未放行的兜底文案。
 */
var SERVED_SAFETY_CONSTANTS = ["irreversible_local_destruction", "code_from_external"];
var SAFETY_CHECK_BUDGET_MS = 20000;
var SAFETY_CHECK_MARGIN_MS = 5000;
var MIN_SAFETY_CHECK_BUDGET_MS = 2000;
var SAFETY_CHECK_NOT_CLEARED_TEXT =
  "This computer's own safety check did not clear this, so a person needs to approve it.";
var SAFETY_CHECK_REASON_TEXTS = {
  irreversible_local_destruction:
    "This can delete files or discard changes for good, so a person needs to approve it.",
  code_from_external: "This may run code from outside this computer, so a person needs to approve it.",
};
var SAFETY_CHECK_NO_ANSWER_TEXT =
  "This computer's own safety check did not answer, so a person needs to approve it.";
//@ chunk-tr0s0d0k.js:37668-37800 placement
function ownCheckMessage(ownCheck) {
  switch (ownCheck.verdict) {
    case "no_verdict":
      return SAFETY_CHECK_NO_ANSWER_TEXT;
    case "block":
      return ownCheck.kind === undefined
        ? SAFETY_CHECK_NOT_CLEARED_TEXT
        : SAFETY_CHECK_REASON_TEXTS[ownCheck.kind];
    case "allow":
      return SAFETY_CHECK_NOT_CLEARED_TEXT;
  }
}
//@ chunk-tr0s0d0k.js:37800-37903 placement
function joinSentences(first, second) {
  let trimmed = first.trimEnd();
  if (trimmed === "") return second;
  return `${/[.!?\u2026]$/.test(trimmed) ? trimmed : `${trimmed}.`} ${second}`;
}
//@ chunk-tr0s0d0k.js:37903-37978 placement
function classifierBudgetMs(legDeadlineAt) {
  if (legDeadlineAt === undefined) return SAFETY_CHECK_BUDGET_MS;
  return Math.min(SAFETY_CHECK_BUDGET_MS, legDeadlineAt - Date.now() - SAFETY_CHECK_MARGIN_MS);
}
//@ chunk-tr0s0d0k.js:37978-38828 placement
async function runServedSafetyCheck(params) {
  let now = Date.now();
  let firstPass = await classifyServedCall(params, params.capMs);
  let { judged, blockCategory, failure } = firstPass;
  let attempts = 1;
  if (params.again !== undefined && firstPass.mayPass)
    try {
      let budgetMs = classifierBudgetMs(params.again.legDeadlineAt);
      if (budgetMs >= MIN_SAFETY_CHECK_BUDGET_MS) {
        attempts = 2;
        let secondPass = await classifyServedCall(params, budgetMs);
        judged = secondPass.judged;
        blockCategory = secondPass.blockCategory;
        failure = secondPass.failure;
      }
    } catch (error) {
      if (!params.stopSignal.aborted && !isAbortError(error)) logError(error);
    }
  let elapsedMs = Date.now() - now;
  logEvent("tengu_remote_tool_serve", {
    op: lit("second_check"),
    call_id: sanitizeMarkName(params.callId),
    mode: lit("enforce"),
    verdict: fromEnum(judged.verdict),
    why: fromEnumOpt(judged.verdict === "no_verdict" ? judged.why : undefined),
    block_kind: safeTelemetryValue(undefined, () =>
      judged.verdict === "block" ? sanitizeRuleCategoryOrUndefined(blockCategory) : undefined,
    ),
    error_kind:
      failure?.errorKind === undefined ? undefined : sanitizedMachineReasonForTelemetry(failure.errorKind),
    http_status: failure?.httpStatus,
    duration_ms: elapsedMs,
    tool: sanitizeToolNameForAnalytics(params.tool.name),
    attempts: params.again === undefined ? undefined : attempts,
    overlapped_hold: params.again?.besideHold,
  });
  if (judged.verdict !== "block")
    return {
      ...judged,
      ms: elapsedMs,
    };
  let knownKind = isReactiveSafetyCheckEnabled()
    ? SERVED_SAFETY_CONSTANTS.find((kind) => kind === blockCategory)
    : undefined;
  return {
    verdict: "block",
    ...(knownKind !== undefined && {
      kind: knownKind,
    }),
    ms: elapsedMs,
  };
}
//@ chunk-tr0s0d0k.js:38828-40102 placement
async function classifyServedCall(params, budgetMs) {
  let judged;
  let mayPass = false;
  let blockCategory;
  let failure;
  if (budgetMs < MIN_SAFETY_CHECK_BUDGET_MS)
    judged = {
      verdict: "no_verdict",
      why: "no_budget",
    };
  else {
    let combinedAbortSignal = createCombinedAbortSignal(params.stopSignal, {
      timeoutMs: budgetMs,
      refTimer: true,
    });
    try {
      let action = formatActionForClassifier(params.tool.name, params.input);
      if (compactActionForTools(action, [params.tool]) === "")
        judged = {
          verdict: "no_verdict",
          why: "not_run",
        };
      else {
        let classification = await classifyYoloAction(
          [],
          action,
          [params.tool],
          {
            ...params.permissionContext,
            alwaysDenyRules: servedCredentialDenyRules(params.permissionContext),
          },
          combinedAbortSignal.signal,
          {
            isSubagentLoop: false,
            recordPresumed: false,
            onlyBuiltInContext: true,
            judgesServedCall: true,
            servedSessionMode: params.serviceWrittenSessionMode,
          },
        );
        let stopOrTimeout = timeoutOrStopReason(combinedAbortSignal.signal, params.stopSignal);
        let plainTimeout =
          classification.unavailable === true &&
          classification.transcriptTooLong !== true &&
          classification.refusedBySafeguard !== true &&
          classification.failureMode === undefined;
        if (stopOrTimeout !== undefined) {
          judged = {
            verdict: "no_verdict",
            why: stopOrTimeout,
          };
          mayPass = stopOrTimeout === "timeout" && plainTimeout;
        } else if (classification.classifierRan === false)
          judged = {
            verdict: "no_verdict",
            why: "not_run",
          };
        else if (
          classification.unavailable === true ||
          classification.transcriptTooLong === true ||
          classification.refusedBySafeguard === true ||
          classification.failureMode !== undefined
        ) {
          judged = {
            verdict: "no_verdict",
            why: "unavailable",
          };
          failure = {
            errorKind: classification.errorKind,
            httpStatus: classification.httpStatus,
          };
          mayPass =
            plainTimeout &&
            classification.retryAfterMs === undefined &&
            isTransientClassifierError(classification.errorKind) &&
            classification.errorKind?.endsWith("_no_retry") !== true;
        } else {
          judged = {
            verdict: classification.shouldBlock === false ? "allow" : "block",
          };
          blockCategory = classification.category;
        }
      }
    } catch (error) {
      let stopOrTimeout = timeoutOrStopReason(combinedAbortSignal.signal, params.stopSignal);
      if (stopOrTimeout === undefined) logError(error);
      judged = {
        verdict: "no_verdict",
        why: stopOrTimeout ?? "threw",
      };
      mayPass = stopOrTimeout === "timeout";
    } finally {
      combinedAbortSignal.cleanup();
    }
  }
  return {
    judged,
    mayPass,
    blockCategory,
    failure,
  };
}
//@ chunk-tr0s0d0k.js:40102-40204 placement
function servedCredentialDenyRules(permissionContext) {
  let hostRules = new Set(permissionContext.alwaysDenyRules[HOST_CREDENTIAL_RULE_SOURCE]);
  return {
    [HOST_CREDENTIAL_RULE_SOURCE]: defaultCredentialDenyRules()
      .map(formatPermissionRule)
      .filter((ruleString) => hostRules.has(ruleString)),
  };
}
//@ chunk-tr0s0d0k.js:40204-40284 placement
function timeoutOrStopReason(signal, stopSignal) {
  if (stopSignal.aborted) return "stopped";
  return signal.aborted ? "timeout" : undefined;
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
function isDefenseInDepthAsk(decision) {
  return (
    decision.behavior === "ask" &&
    decision.decisionReason?.type === "safetyCheck" &&
    DEFENSE_IN_DEPTH_REASONS.has(decision.decisionReason.reason)
  );
}
//@ chunk-tr0s0d0k.js:40940-41226 placement
function readsNetworkPath(tool, input, toolPermissionContext) {
  if (typeof tool.getPath !== "function") return false;
  let path = tool.getPath(input);
  let pathsForPermissionCheck = getPathsForPermissionCheck(path);
  if (checkReadNetworkPathSafety(tool, input, toolPermissionContext, pathsForPermissionCheck) === null)
    return false;
  let trustedNetworkDirectories = toolPermissionContext.trustedNetworkDirectories;
  let paths = [
    path,
    ...pathsForPermissionCheck,
    ...(tool.name === GLOB_TOOL_NAME && typeof input.pattern === "string" ? [input.pattern] : []),
  ];
  return (
    paths.some(
      (path) =>
        isUntrustedAutomountPath(path, trustedNetworkDirectories) ||
        isUntrustedUncPath(path, trustedNetworkDirectories),
    ) || !paths.some((path) => hasSuspiciousWindowsPathPattern(path, trustedNetworkDirectories))
  );
}
//@ chunk-tr0s0d0k.js:41226-41271 placement = handleAutoModeTransition (0.799)
function isAutoOrPlanMode(sessionMode) {
  return sessionMode === "auto" || sessionMode === "plan";
}
//@ chunk-tr0s0d0k.js:41271-41592 placement
function classifyCcrContainerAsk(facts) {
  if (facts.callerKind !== "ccr_container") return;
  if (facts.attested === true) return "attested";
  return facts.attested === false &&
    isAutoOrPlanMode(facts.sessionMode) &&
    facts.askedInMode === facts.sessionMode &&
    facts.classifierEligible &&
    !facts.autoModeRefusedHere &&
    (facts.sessionMode !== "plan" || facts.planClaimBackedHere) &&
    (PATH_SENSITIVE_TOOLS.has(facts.toolName) || facts.isServedMcpTool)
    ? "auto_arm"
    : undefined;
}
//@ chunk-tr0s0d0k.js:41592-41623 placement
var TENGU_VIOLIN_PURFLING = "tengu_violin_purfling";
//@ chunk-tr0s0d0k.js:41623-41661 placement
function isViolinPurflingEnabled() {
  return readFlagWithOverride(TENGU_VIOLIN_PURFLING, {
    safe: true,
  });
}
//@ chunk-tr0s0d0k.js:41661-41699 placement
function isViolinPurflingGateEnabled() {
  return readFlagWithOverride(TENGU_VIOLIN_PURFLING, {
    safe: true,
  });
}
//@ chunk-tr0s0d0k.js:41699-41732 placement
var TENGU_REFACTORED_GADGET = "tengu_refactored_gadget";
//@ chunk-tr0s0d0k.js:41732-41770 placement
function isRefactoredGadgetEnabled() {
  return readFlagWithOverride(TENGU_REFACTORED_GADGET, {
    safe: false,
  });
}
//@ chunk-tr0s0d0k.js:41770-41845 placement
function isViolinArchingEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_arching", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-tr0s0d0k.js:41845-41873 placement
var TENGU_VIOLIN_EBONY = "tengu_violin_ebony";
//@ chunk-tr0s0d0k.js:41873-41911 placement
function isViolinEbonyEnabled() {
  return readFlagWithOverride(TENGU_VIOLIN_EBONY, {
    safe: false,
  });
}
//@ chunk-tr0s0d0k.js:41911-41986 placement
function isViolinTailgutEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_tailgut", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-tr0s0d0k.js:41986-42043 placement
function isViolinCamberEnabled() {
  return readFlagWithOverride("tengu_violin_camber", {
    safe: false,
  });
}
export {
  credentialRuleKind,
  classifyCcrContainerAsk,
  unattendedStanceKind,
  isViolinPurflingEnabled,
  isViolinCamberEnabled,
  isViolinArchingEnabled,
  isViolinEbonyEnabled,
  isViolinPurflingGateEnabled,
  isViolinTailgutEnabled,
  isRefactoredGadgetEnabled,
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
