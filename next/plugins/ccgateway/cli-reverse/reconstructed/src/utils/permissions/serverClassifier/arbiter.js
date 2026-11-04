/**
 * utils/permissions/serverClassifier/arbiter.ts
 *
 * 2.1.316 新增：服务端分类器裁决
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (48)
 * attribution: placement 48
 */
import { fromEnum, fromEnumOpt } from "../../../services/analytics/safeMetadata.js";
import { logError } from "../../log.js";
import { isAutoClassifierActive, isAutoModeActive } from "../autoModeState.js";
import {
  getClassifierProviderKind,
  isServerClassifierUnsupported,
  knownValueOrOther,
  DANGEROUS_TOOL_USE_COMBINED_REASONS,
  asClassifierResult,
  wasSentForJudging,
  buildClassifierParseFailureReason,
} from "./results.js";
import {
  isThirdPartyServerClassifierEnabled,
  neverTrue,
  isIridescentCrystalOn,
  getUserServerClassifierSwitch,
  cachedAutoModeContextEnabled,
  autoModeContextEnabled,
  isBetasSwitchSetAside,
  isLocalClassifierSwitchedOff,
  isWiseOrigamiOn,
  isCopperTrellisOn,
  getServerClassifierFallbackMode,
  isQuietLanternOn,
  isVividCrayonOn,
} from "./flags.js";
import { isThirdPartyServerClassifierRefused, getStickyBetas } from "../../../bootstrap/state.js";
import { getAPIProvider, isClaudePlatformProvider } from "../../model/providers.js";
import { canSendFirstPartyBetas, isHipaaOrg, BETA_DANGEROUS_TOOL_USE } from "../../betas.js";
import { env } from "../../env.js";
import { isEnvTruthy } from "../../envUtils.js";
import { withHostEnvRestored_2 } from "../../settings/hostEnvWrites.js";
import { getAdminTierEnvValue } from "../../settings/settings.js";
import { holdsNoServedSettings } from "../../../services/remoteManagedSettings/remoteSettingsCache.js";
import { getEligibilityMemo } from "../../../services/remoteManagedSettings/remoteSettingsState.js";
import { isPolicyLimitsCacheMissing } from "../../../services/policyLimits/policyVerdicts.js";
import {
  isBetaRejected as isBetaRejected_2,
  deepEqualIgnoringUndefined,
} from "../../../bootstrap/stateSlices.js";
import { stripAnsi } from "../../stripAnsi.js";
import { stripSuffixNumber } from "../../../services/api/toolDefinitionShape.js";
import { clone } from "../../slowOperations.js";
import { inputAsWrittenSymbol } from "../../messageKinds.js";
import { isPlainObject as isPlainObject_5 } from "../../isPlainObject.js";
import { firstLineOf } from "../../stringUtils.js";
import { BASH_TOOL_NAME } from "../../../tools/BashTool/toolName.js";
import { MONITOR } from "../../../tools/MonitorTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../../tools/PowerShellTool/toolName.js";
import { classifyAllShellEnabled, requiresClassifierForHookAllow } from "../permissionSetup.js";
import { FILE_EDIT_TOOL_NAME } from "../../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../../tools/NotebookEditTool/constants.js";
import { SERVER_CLASSIFIER_NO_EXPLANATION_REASON } from "../../../types/permissions.js";
import { isPlainModeAtRequest, getToolPermissionContext } from "../toolPermissionContext.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1033954-1034005 placement (2.1.88 match: countTokensWithAPI, 0.658)
/**
 * 自动模式服务端分类器角色（off/arbiter/arbiterWithLocalFallback）。旧版名 countTokensWithAPI 为错配，归错文件。
 */
function getAutoModeClassifierRole(mode, { peek = false } = {}) {
  return checkServerClassifierEligibility(mode, peek).role;
}
//@ chunk-e6aww6q8.js:1034005-1034045 placement
/**
 * serverClassifierOffReason：服务端分类器不启用的原因。
 */
function serverClassifierOffReason(mode) {
  return checkServerClassifierEligibility(mode).offReason;
}
//@ chunk-e6aww6q8.js:1034045-1034190 placement
/**
 * 把服务端分类器资格判断结果转成遥测字段（角色与关闭原因）。
 */
function getServerClassifierRoleTelemetry(mode) {
  try {
    let { role, offReason } = checkServerClassifierEligibility(mode, true);
    return {
      serverClassifierRole: fromEnum(role),
      serverClassifierOffReason: fromEnumOpt(offReason),
    };
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-e6aww6q8.js:1034190-1034817 placement
function checkServerClassifierEligibility(mode, peek = false) {
  if (!isAutoClassifierActive(mode))
    return {
      role: "off",
      offReason: "not_auto_mode",
    };
  if (
    !canUseServerClassifier({
      peek,
    })
  )
    return {
      role: "off",
      offReason: "betas_disabled",
    };
  if (getClassifierProviderKind() === "thirdParty") {
    let offReason = !isThirdPartyServerClassifierEnabled()
      ? "third_party_switch_off"
      : isThirdPartyServerClassifierRefused()
        ? "refused_latch"
        : neverTrue()
          ? "batch_file_tools"
          : getAPIProvider() === "firstParty" && isIridescentCrystalOn()
            ? "kill_switch"
            : undefined;
    return offReason === undefined
      ? {
          role: "arbiterWithLocalFallback",
        }
      : {
          role: "off",
          offReason,
        };
  }
  let userServerClassifierSwitch = getUserServerClassifierSwitch();
  if (userServerClassifierSwitch === false)
    return {
      role: "off",
      offReason: "user_switch_off",
    };
  let firstPartyOffReason = !(
    userServerClassifierSwitch ?? (peek ? cachedAutoModeContextEnabled() : autoModeContextEnabled())
  )
    ? "rollout_flag_off"
    : isIridescentCrystalOn()
      ? "kill_switch"
      : isThirdPartyServerClassifierRefused()
        ? "refused_latch"
        : neverTrue()
          ? "batch_file_tools"
          : undefined;
  if (firstPartyOffReason === undefined)
    return {
      role: "arbiter",
    };
  return {
    role: "off",
    offReason: firstPartyOffReason,
  };
}
//@ chunk-e6aww6q8.js:1034817-1035178 placement
/**
 * 当前提供方能否使用服务端分类器：第一方看能否发 beta 或搁置开关；第三方在宿主托管、显式开启且未禁用实验 beta 时可用（HIPAA 除外）。
 */
function canUseServerClassifier({ peek = false } = {}) {
  switch (getClassifierProviderKind()) {
    case "firstParty":
      return (
        canSendFirstPartyBetas() ||
        isBetasSwitchSetAside({
          peek,
        })
      );
    case "thirdParty": {
      let apiProvider = getAPIProvider();
      if (
        apiProvider === "firstParty" &&
        env.CLAUDE_CODE_PROVIDER_MANAGED_BY_HOST &&
        getUserServerClassifierSwitch() === true &&
        isEnvTruthy(withHostEnvRestored_2(() => env.CLAUDE_CODE_AUTO_MODE_SERVER)) &&
        !isEnvTruthy(getAdminTierEnvValue("CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS")) &&
        !holdsNoServedSettings(getEligibilityMemo() ?? true) &&
        !isPolicyLimitsCacheMissing()
      )
        return !isHipaaOrg();
      return apiProvider === "firstParty" || isClaudePlatformProvider(apiProvider)
        ? canSendFirstPartyBetas()
        : !isHipaaOrg();
    }
  }
}
//@ chunk-e6aww6q8.js:1035178-1035247 placement
/**
 * isArbiterRole：角色为 arbiter 或 arbiterWithLocalFallback。
 */
function isArbiterRole(autoModeClassifierRole) {
  return autoModeClassifierRole === "arbiter" || autoModeClassifierRole === "arbiterWithLocalFallback";
}
//@ chunk-e6aww6q8.js:1035247-1035424 placement
function isServerClassifierActive(mode, autoModeClassifierRole, { handoffReview = false } = {}) {
  if (!isAutoClassifierActive(mode)) return false;
  if (
    isLocalClassifierSwitchedOff({
      handoffReview,
    })
  )
    return true;
  if (!isWiseOrigamiOn()) return false;
  if (autoModeClassifierRole !== "off") return true;
  return (
    getUserServerClassifierSwitch() ??
    (getClassifierProviderKind() === "thirdParty" || autoModeContextEnabled())
  );
}
//@ chunk-e6aww6q8.js:1035424-1035484 placement
/**
 * isArbiterWithFallbackActive：auto 下按 arbiterWithLocalFallback 启用。
 */
function isArbiterWithFallbackActive() {
  return isServerClassifierActive("auto", "arbiterWithLocalFallback");
}
//@ chunk-e6aww6q8.js:1035484-1035519 placement
/**
 * isServerClassifierOff：该角色下服务端分类器为 off。
 */
function isServerClassifierOff(mode) {
  return isServerClassifierActive(mode, "off");
}
//@ chunk-e6aww6q8.js:1035519-1035566 placement
/**
 * isAutoModeClassified：auto 启用且分类器角色非 off。
 */
function isAutoModeClassified() {
  return isAutoModeActive() && getAutoModeClassifierRole("auto") !== "off";
}
//@ chunk-e6aww6q8.js:1035566-1035618 placement
/**
 * isServerArbiterActive：开关开且角色为 arbiter。
 */
function isServerArbiterActive() {
  return isCopperTrellisOn() && getAutoModeClassifierRole("auto") === "arbiter";
}
//@ chunk-e6aww6q8.js:1035618-1035676 placement
/**
 * canAttachServerClassifierBeta：需要附加分类器 beta 头。
 */
function canAttachServerClassifierBeta(mode) {
  return (
    isArbiterRole(
      getAutoModeClassifierRole(mode, {
        peek: true,
      }),
    ) && !isBetaRejected_2(getStickyBetas(), BETA_DANGEROUS_TOOL_USE)
  );
}
//@ chunk-e6aww6q8.js:1035676-1035764 placement
/**
 * SERVER_CLASSIFIER_LABEL：服务端分类器的显示标签；SERVER_CLASSIFIER_NOTE_LIMIT：分类器说明的长度上限；SERVER_CLASSIFIER_NOTE_TAIL：分类器说明的结尾片段（同一声明共 3 个绑定）。
 */
var SERVER_CLASSIFIER_LABEL = "The server-side auto mode classifier";
var SERVER_CLASSIFIER_NOTE_LIMIT = 2000;
var SERVER_CLASSIFIER_NOTE_TAIL = ". If you have other tasks";
//@ chunk-e6aww6q8.js:1035764-1035938 placement
function sanitizeServerExplanation(explanation) {
  if (explanation === undefined) return;
  let trimmed = stripAnsi(explanation)
    .replace(/[\u0000-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let index = trimmed.indexOf(SERVER_CLASSIFIER_NOTE_TAIL);
  return index === -1 ? trimmed : trimmed.slice(0, index).trim();
}
//@ chunk-e6aww6q8.js:1035938-1035987 placement
var SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG = "server_call_unavailable_input_too_long";
//@ chunk-e6aww6q8.js:1035987-1036137 placement
function getCallVerdictStatus(verdict, toolUseID) {
  if (verdict.kind !== "per_call") return;
  let status = verdict.statuses.get(toolUseID);
  if (status !== undefined) return status;
  let baseId = stripSuffixNumber(toolUseID);
  return baseId === undefined ? undefined : verdict.statuses.get(baseId);
}
//@ chunk-e6aww6q8.js:1036137-1036213 placement
/**
 * noVerdictReasonFor：未判定时给出原因。
 */
function noVerdictReasonFor(verdict, toolUseID) {
  let callVerdictStatus = getCallVerdictStatus(verdict, toolUseID);
  return callVerdictStatus?.type === "evaluated" ? undefined : getNoVerdictReason(verdict, callVerdictStatus);
}
//@ chunk-e6aww6q8.js:1036213-1036293 placement
/**
 * isServerNotRequestedReason：服务端未请求或输入被改写的失败原因。
 */
function isServerNotRequestedReason(reason) {
  return reason === "server_not_requested" || reason === "server_input_rewritten";
}
//@ chunk-e6aww6q8.js:1036293-1036366 placement
/**
 * isInputRewrittenWithFallbackOff：输入被改写且回退关闭。
 */
function isInputRewrittenWithFallbackOff(errorKind) {
  return (
    errorKind === "server_input_rewritten" &&
    getServerClassifierFallbackMode() === "off" &&
    isQuietLanternOn()
  );
}
//@ chunk-e6aww6q8.js:1036366-1036530 placement
function shouldFallBackToLocalEarly(role, verdict) {
  return (
    role === "arbiterWithLocalFallback" &&
    (isServerClassifierUnsupported(verdict) ||
      (verdict.kind === "none" &&
        (verdict.why === "server_not_requested" ||
          (verdict.why === "server_input_rewritten" && getServerClassifierFallbackMode() === "off"))))
  );
}
//@ chunk-e6aww6q8.js:1036530-1036979 placement
/**
 * 按分类器角色判断是否回退到本地分类器：arbiter 仅在无结果/不支持时；带本地回退的角色在服务端不可用、无结果或该调用不可用时回退。
 */
function shouldFallBackToLocal(role, verdict, toolUseID, { outsideAutoMode = false } = {}) {
  if (role === "arbiter")
    return (
      isQuietLanternOn() &&
      verdict.kind === "none" &&
      (verdict.why === "server_no_result" ||
        verdict.why === "server_unsupported" ||
        (outsideAutoMode && verdict.why === "server_thread_unsupported"))
    );
  if (role !== "arbiterWithLocalFallback") return false;
  if (shouldFallBackToLocalEarly(role, verdict)) return true;
  if (verdict.kind === "none")
    return verdict.why.startsWith("server_unavailable_") || verdict.why === "server_results_not_held";
  let callVerdictStatus = getCallVerdictStatus(verdict, toolUseID);
  if (callVerdictStatus === undefined) return true;
  return callVerdictStatus.type === "unavailable" && callVerdictStatus.reason !== "truncated";
}
//@ chunk-e6aww6q8.js:1036979-1037251 placement
function getNoVerdictReason(verdict, callVerdictStatus) {
  if (verdict.kind === "none") return verdict.why;
  if (callVerdictStatus === undefined) return "server_no_result";
  switch (callVerdictStatus.type) {
    case "skipped":
      return "server_call_skipped";
    case "unavailable":
      return `server_call_unavailable_${knownValueOrOther(DANGEROUS_TOOL_USE_COMBINED_REASONS, callVerdictStatus.reason)}`;
    case "unrecognized":
      return "server_unrecognized_result";
  }
}
//@ chunk-e6aww6q8.js:1037251-1037570 placement
/**
 * 取服务端分类器结果：输入被改写、未持有结果或未请求时返回 kind=none 及原因。
 */
function getUnheldServerResults(assistantMessage) {
  if (assistantMessage.serverClassifierInputRewritten === true)
    return Promise.resolve({
      kind: "none",
      why: "server_input_rewritten",
    });
  let result = asClassifierResult(assistantMessage.serverClassifierResults);
  if (result !== undefined) return result.results();
  return Promise.resolve({
    kind: "none",
    why:
      assistantMessage.serverClassifierRequest !== undefined
        ? "server_results_not_held"
        : "server_not_requested",
  });
}
//@ chunk-e6aww6q8.js:1037570-1037999 placement
/**
 * 等待某调用的服务端分类结果；输入被改写或该调用的结论已被别的调用作废时返回 server_input_rewritten。
 */
function awaitServerVerdict(assistantMessage, toolUseID, requireSent = true) {
  let isRewritten = assistantMessage.serverClassifierInputRewritten === true;
  let result = asClassifierResult(
    isRewritten
      ? assistantMessage.serverClassifierReviewLeftBehind
      : assistantMessage.serverClassifierResults,
  );
  if (result === undefined) return getUnheldServerResults(assistantMessage);
  if (!wasSentForJudging(result, assistantMessage, toolUseID))
    return Promise.resolve({
      kind: "none",
      why: "server_not_requested",
    });
  return result.results().then((verdicts) => {
    let callVerdictStatus = getCallVerdictStatus(verdicts, toolUseID);
    return (
      isRewritten
        ? callVerdictStatus?.type === "evaluated" || callVerdictStatus?.type === "skipped"
        : (!requireSent || result.isVoidedByAnotherCall(toolUseID)) && isNotFlaggedVerdict(callVerdictStatus)
    )
      ? {
          kind: "none",
          why: "server_input_rewritten",
        }
      : verdicts;
  });
}
//@ chunk-e6aww6q8.js:1037999-1038071 placement
function isNotFlaggedVerdict(status) {
  return status?.type === "evaluated" && status.outcome === "not_flagged";
}
//@ chunk-e6aww6q8.js:1038071-1038179 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince_6(messages, sinceUuid) {
  let baseId = stripSuffixNumber(sinceUuid);
  return messages.message.content.some(
    (block) => block.type === "tool_use" && (block.id === sinceUuid || block.id === baseId),
  );
}
//@ chunk-e6aww6q8.js:1038179-1038238 placement
function isClassifierTargetToolUse(assistantMessage, toolUseID, clientRequestedToolUseId) {
  return (
    assistantMessage.isVirtual !== true &&
    clientRequestedToolUseId !== toolUseID &&
    countToolCallsSince_6(assistantMessage, toolUseID)
  );
}
//@ chunk-e6aww6q8.js:1038238-1038315 placement
/**
 * cloneIfServerResults：有服务端结果时克隆输入。
 */
function cloneIfServerResults(assistantMessage, value) {
  return asClassifierResult(assistantMessage.serverClassifierResults) === undefined
    ? undefined
    : clone(value);
}
//@ chunk-e6aww6q8.js:1038315-1038361 placement
/**
 * lacksServerResult：没有服务端结果。
 */
function lacksServerResult(previous, next) {
  return previous === undefined || !deepEqualIgnoringUndefined(next, previous);
}
//@ chunk-e6aww6q8.js:1038361-1038591 placement
function buildInputRewriteFields(rewrite, shape, keptVerdict) {
  if (rewrite === undefined) return {};
  return {
    [inputAsWrittenSymbol]:
      getServerClassifierFallbackMode() !== "off" ? structuredClone(rewrite.written) : undefined,
    serverClassifierInputRewrite: {
      cause: rewrite.cause,
      source: rewrite.source,
      byLocalCode: rewrite.byLocalCode,
      ...(shape !== undefined && {
        shape,
      }),
      keptVerdict,
    },
  };
}
//@ chunk-e6aww6q8.js:1038591-1039693 placement
/**
 * 对服务端分类器的裁决做最终判定（同批调用未审、已清除等）。
 */
async function applyServerClassifierVerdict(
  assistantMessage,
  toolUseID,
  rewrittenInput,
  hookRewrite,
  toolUses,
) {
  let result = asClassifierResult(assistantMessage.serverClassifierResults);
  if (result === undefined || !countToolCallsSince_6(assistantMessage, toolUseID)) return assistantMessage;
  let siblingsAgree =
    !result.isVoidedByAnotherCall(toolUseID) &&
    toolUses !== undefined &&
    toolUses.every((sibling) => asClassifierResult(sibling.serverClassifierResults) === result);
  if (hookRewrite === undefined && siblingsAgree) return assistantMessage;
  let hasRewrite = hookRewrite !== undefined;
  let cause =
    hookRewrite !== undefined
      ? hookRewrite.cause
      : toolUses === undefined
        ? "siblings_unknown"
        : toolUses.every((sibling) => asClassifierResult(sibling.serverClassifierResults) === result)
          ? result.siblingNoteCause()
          : "sibling_not_reviewed";
  result.noteRewriteCause(cause);
  result.noteRewrittenCall(
    toolUseID,
    getServerClassifierFallbackMode() !== "off" ? countToolCallsSince_7(toolUses) : undefined,
  );
  let message = {
    ...assistantMessage.message,
    content: assistantMessage.message.content.map((block) =>
      block.type === "tool_use" && block.id === toolUseID
        ? {
            ...block,
            input: rewrittenInput,
          }
        : block,
    ),
  };
  let verdictStatus = wasSentForJudging(result, assistantMessage, toolUseID)
    ? getCallVerdictStatus(await result.results(), toolUseID)
    : undefined;
  let toolUseBlock = assistantMessage.message.content.find(
    (block) => block.type === "tool_use" && block.id === toolUseID,
  );
  let shape = hasRewrite ? compareBashCommandInputs(toolUseBlock, rewrittenInput) : undefined;
  if (hookRewrite !== undefined && siblingsAgree && keepsLocalClassifierVerdict(hookRewrite))
    return {
      ...assistantMessage,
      ...buildInputRewriteFields(hookRewrite, shape, isNotFlaggedVerdict(verdictStatus)),
      message,
    };
  if (!(hasRewrite ? verdictStatus?.type === "evaluated" : isNotFlaggedVerdict(verdictStatus)))
    return hasRewrite
      ? {
          ...assistantMessage,
          ...buildInputRewriteFields(hookRewrite, shape, false),
          message,
        }
      : assistantMessage;
  let { serverClassifierRequest, serverClassifierResults, ...rest } = assistantMessage;
  return {
    ...rest,
    serverClassifierInputRewritten: true,
    ...(hasRewrite && {
      serverClassifierOwnInputRewritten: true,
    }),
    ...buildInputRewriteFields(hookRewrite, shape, false),
    message,
    serverClassifierRewrite: {
      cause,
      lostVerdict: isNotFlaggedVerdict(verdictStatus) ? "cleared" : "flagged",
    },
  };
}
//@ chunk-e6aww6q8.js:1039693-1039930 placement
function compareBashCommandInputs(toolUseBlock, rewrittenInput) {
  let command =
    toolUseBlock?.type === "tool_use" && isPlainObject_5(toolUseBlock.input)
      ? toolUseBlock.input.command
      : undefined;
  let command_2 = rewrittenInput.command;
  if (typeof command !== "string" || typeof command_2 !== "string") return;
  if (command_2 === command) return "same";
  if (command_2.endsWith(command)) return "prefix";
  return command_2.includes(command) ? "contains" : "other";
}
//@ chunk-e6aww6q8.js:1039930-1040058 placement (2.1.88 match: countToolCallsSince, 1)
function countToolCallsSince_7(toolUses) {
  return toolUses === undefined
    ? undefined
    : new Set(
        toolUses.flatMap((assistantMessage) =>
          assistantMessage.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : [])),
        ),
      );
}
//@ chunk-e6aww6q8.js:1040058-1040453 placement
/**
 * 描述服务端分类后调用输入被改写的情况：原因（工具链或钩子）、来源、是否全由本地代码改写，以及 keep_local 模式下的附加判断。
 */
function describeInputRewrite(hookRewrite, chainRewrite, classifiesAll, shellOrFileTool) {
  if (!hookRewrite.changed && !chainRewrite.changed) return;
  let isLocalOnly = (kinds) => kinds.every((kind) => kind === "local_code");
  let keepLocal = getServerClassifierFallbackMode() === "keep_local";
  return {
    cause: hookRewrite.changed ? "tool_call_chain" : "hook",
    source: summarizeRewriteSources([
      ...(hookRewrite.changed ? hookRewrite.sources : []),
      ...(chainRewrite.changed ? chainRewrite.sources : []),
    ]),
    byLocalCode:
      isLocalOnly(hookRewrite.kinds) &&
      isLocalOnly(chainRewrite.kinds) &&
      (!hookRewrite.changed || hookRewrite.kinds.length > 0) &&
      (!chainRewrite.changed || chainRewrite.kinds.length > 0),
    classifiesAll: keepLocal && classifiesAll(),
    shellOrFileTool: keepLocal && shellOrFileTool(),
    written: hookRewrite.written,
  };
}
//@ chunk-e6aww6q8.js:1040453-1040701 placement
function classifyRewriteSource(source) {
  switch (source === undefined ? undefined : firstLineOf(source, ":")) {
    case "settings":
      return "settings";
    case "policySettings":
      return "managed";
    case "plugin":
      return "plugin";
    case "skill":
      return "skill";
    case "mod":
      return "mod";
    case "mixed":
      return "mixed";
    default:
      return "unknown";
  }
}
//@ chunk-e6aww6q8.js:1040701-1040809 placement
function summarizeRewriteSources(sources) {
  let kinds = new Set(sources.map(classifyRewriteSource));
  if (kinds.size === 0) return "unknown";
  return kinds.size === 1 ? [...kinds][0] : "mixed";
}
//@ chunk-e6aww6q8.js:1040809-1040837 placement
var SHELL_TOOL_NAMES_2; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1040809", () => {
  SHELL_TOOL_NAMES_2 = new Set([BASH_TOOL_NAME, MONITOR, POWERSHELL_TOOL_NAME]);
});
//@ chunk-e6aww6q8.js:1040837-1040878 placement
/**
 * isShellToolClassified：shell 工具且分类器启用。
 */
function isShellToolClassified(name) {
  return SHELL_TOOL_NAMES_2.has(name) && classifyAllShellEnabled();
}
//@ chunk-e6aww6q8.js:1040878-1040913 placement
var SHELL_AND_FILE_TOOL_NAMES; // deferred: uses SHELL_TOOL_NAMES_2 of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1040878", () => {
  SHELL_AND_FILE_TOOL_NAMES = new Set([
    ...SHELL_TOOL_NAMES_2,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
  ]);
});
//@ chunk-e6aww6q8.js:1040913-1040995 placement
/**
 * isShellOrFileToolForClassifier：非 MCP 的 shell/文件工具。
 */
function isShellOrFileToolForClassifier(tool) {
  return (
    tool.isMcp !== true &&
    tool.mcpInfo === undefined &&
    SHELL_AND_FILE_TOOL_NAMES.has(tool.name) &&
    !requiresClassifierForHookAllow(tool)
  );
}
//@ chunk-e6aww6q8.js:1040995-1041090 placement
function keepsLocalClassifierVerdict(rewrite) {
  return (
    getServerClassifierFallbackMode() === "keep_local" &&
    rewrite.byLocalCode &&
    rewrite.shellOrFileTool &&
    !rewrite.classifiesAll
  );
}
//@ chunk-e6aww6q8.js:1041090-1041347 placement
function getRewriteLostVerdictNote(assistantMessage, reason) {
  if (reason !== "server_input_rewritten") return;
  if (assistantMessage.serverClassifierInputRewritten !== true)
    return {
      cause:
        asClassifierResult(assistantMessage.serverClassifierResults)?.siblingNoteCause() ?? "sibling_changed",
      lostVerdict: "cleared",
    };
  return (
    assistantMessage.serverClassifierRewrite ?? {
      cause: "turn_step",
    }
  );
}
//@ chunk-e6aww6q8.js:1041347-1041551 placement
/**
 * 把某调用的服务端结果概括为 verdict（含是否带解释）或 no_verdict（含原因码）。
 */
function summarizeServerVerdict(verdict, toolUseID) {
  let callVerdictStatus = getCallVerdictStatus(verdict, toolUseID);
  if (callVerdictStatus?.type !== "evaluated")
    return {
      kind: "no_verdict",
      why: getNoVerdictReason(verdict, callVerdictStatus),
    };
  return {
    kind: "verdict",
    outcome: callVerdictStatus.outcome,
    explained:
      callVerdictStatus.outcome === "flagged" &&
      (sanitizeServerExplanation(callVerdictStatus.explanation)?.length ?? 0) > 0,
  };
}
//@ chunk-e6aww6q8.js:1041551-1042315 placement
function classifyServerVerdict(verdict, toolUseID, fallback) {
  let callVerdictStatus = getCallVerdictStatus(verdict, toolUseID);
  if (callVerdictStatus?.type !== "evaluated") {
    if (callVerdictStatus?.type === "unavailable" && callVerdictStatus.reason === "refused")
      return {
        model: SERVER_CLASSIFIER_LABEL,
        durationMs: 0,
        shouldBlock: true,
        refusedBySafeguard: true,
        failureMode: "policy_refusal",
        errorKind: noVerdictReasonFor(verdict, toolUseID),
        reason: buildClassifierParseFailureReason("server", "policy_refusal", "refusal"),
      };
    let mayAskFallback =
      callVerdictStatus === undefined
        ? verdict.kind !== "none" || verdict.why !== "server_unrecognized_result"
        : callVerdictStatus.type === "skipped";
    let noVerdictReason = noVerdictReasonFor(verdict, toolUseID);
    return (
      (mayAskFallback ? fallback() : undefined) ?? {
        model: SERVER_CLASSIFIER_LABEL,
        durationMs: 0,
        shouldBlock: true,
        unavailable: true,
        ...(noVerdictReason === SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG &&
          isVividCrayonOn() && {
            transcriptTooLong: true,
          }),
        errorKind: noVerdictReason,
        reason: "Classifier unavailable - blocking for safety",
      }
    );
  }
  let isFlagged = callVerdictStatus.outcome === "flagged";
  let explanation = isFlagged ? sanitizeServerExplanation(callVerdictStatus.explanation) : undefined;
  return {
    model: SERVER_CLASSIFIER_LABEL,
    durationMs: 0,
    shouldBlock: isFlagged,
    reason: isFlagged
      ? explanation !== undefined && explanation.length > 0
        ? explanation.slice(0, SERVER_CLASSIFIER_NOTE_LIMIT)
        : SERVER_CLASSIFIER_NO_EXPLANATION_REASON
      : "Not flagged by the server-side auto mode classifier",
  };
}
//@ chunk-e6aww6q8.js:1042315-1042347 placement
var TENGU_FLICKERING_RAIN = "tengu_flickering_rain";
//@ chunk-e6aww6q8.js:1308790-1309037 placement
function getPermissionModeAtRequestForArbiter(assistantMessage, toolUseID, context) {
  let permissionModeAtRequest = assistantMessage.permissionModeAtRequest;
  if (
    !isPlainModeAtRequest(permissionModeAtRequest) ||
    !assistantMessage.message.content.some(
      (contentBlock) => contentBlock.type === "tool_use" && contentBlock.id === toolUseID,
    )
  )
    return;
  let mode = getToolPermissionContext({
    ...context,
    permissionModeAtRequest: undefined,
  }).mode;
  return getAutoModeClassifierRole(mode) === "arbiter" &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_radiant_teapot", true)
    ? permissionModeAtRequest
    : undefined;
}
//@ chunk-e6aww6q8.js:1309037-1309071 placement
/**
 * alwaysTrueFlag：恒 true 的开关值。
 */
function alwaysTrueFlag() {
  return ALWAYS_TRUE_FLAG().value;
}
//@ chunk-e6aww6q8.js:1309071-1309117 placement
function ALWAYS_TRUE_FLAG() {
  return {
    value: true,
    src: "default",
  };
}
export {
  canAttachServerClassifierBeta,
  getAutoModeClassifierRole,
  awaitServerVerdict,
  summarizeServerVerdict,
  classifyServerVerdict,
  SERVER_CLASSIFIER_LABEL,
  isClassifierTargetToolUse,
  getPermissionModeAtRequestForArbiter,
  alwaysTrueFlag,
  isArbiterRole,
  serverClassifierOffReason,
  isServerClassifierActive,
  shouldFallBackToLocal,
  noVerdictReasonFor,
  isServerNotRequestedReason,
  isInputRewrittenWithFallbackOff,
  countToolCallsSince_6,
  getRewriteLostVerdictNote,
  SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG,
  getServerClassifierRoleTelemetry,
  isServerClassifierOff,
  canUseServerClassifier,
  isArbiterWithFallbackActive,
  cloneIfServerResults,
  lacksServerResult,
  describeInputRewrite,
  isShellToolClassified,
  isShellOrFileToolForClassifier,
  applyServerClassifierVerdict,
  TENGU_FLICKERING_RAIN,
  isServerArbiterActive,
  isAutoModeClassified,
  checkServerClassifierEligibility,
};
