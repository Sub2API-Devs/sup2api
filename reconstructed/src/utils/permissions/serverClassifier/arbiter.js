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
  dangerousToolUseCombinedSchema,
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
import { withHostEnvRestored_2 } from "../../settings/managedSettingsFiles.js";
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

//@ chunk-e6aww6q8.js:1033954-1034005 placement = countTokensWithAPI (0.658)
/**
 * 自动模式服务端分类器角色（off/arbiter/arbiterWithLocalFallback）。旧版名 countTokensWithAPI 为错配，归错文件。
 */
function getAutoModeClassifierRole(mode, { peek: n = false } = {}) {
  return checkServerClassifierEligibility(mode, n).role;
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
function checkServerClassifierEligibility(e, n = false) {
  if (!isAutoClassifierActive(e))
    return {
      role: "off",
      offReason: "not_auto_mode",
    };
  if (
    !canUseServerClassifier({
      peek: n,
    })
  )
    return {
      role: "off",
      offReason: "betas_disabled",
    };
  if (getClassifierProviderKind() === "thirdParty") {
    let h = !isThirdPartyServerClassifierEnabled()
      ? "third_party_switch_off"
      : isThirdPartyServerClassifierRefused()
        ? "refused_latch"
        : neverTrue()
          ? "batch_file_tools"
          : getAPIProvider() === "firstParty" && isIridescentCrystalOn()
            ? "kill_switch"
            : undefined;
    return h === undefined
      ? {
          role: "arbiterWithLocalFallback",
        }
      : {
          role: "off",
          offReason: h,
        };
  }
  let userServerClassifierSwitch = getUserServerClassifierSwitch();
  if (userServerClassifierSwitch === false)
    return {
      role: "off",
      offReason: "user_switch_off",
    };
  let s = !(userServerClassifierSwitch ?? (n ? cachedAutoModeContextEnabled() : autoModeContextEnabled()))
    ? "rollout_flag_off"
    : isIridescentCrystalOn()
      ? "kill_switch"
      : isThirdPartyServerClassifierRefused()
        ? "refused_latch"
        : neverTrue()
          ? "batch_file_tools"
          : undefined;
  if (s === undefined)
    return {
      role: "arbiter",
    };
  return {
    role: "off",
    offReason: s,
  };
}
//@ chunk-e6aww6q8.js:1034817-1035178 placement
/**
 * 当前提供方能否使用服务端分类器：第一方看能否发 beta 或搁置开关；第三方在宿主托管、显式开启且未禁用实验 beta 时可用（HIPAA 除外）。
 */
function canUseServerClassifier({ peek: e = false } = {}) {
  switch (getClassifierProviderKind()) {
    case "firstParty":
      return (
        canSendFirstPartyBetas() ||
        isBetasSwitchSetAside({
          peek: e,
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
function isServerClassifierActive(mode, autoModeClassifierRole, { handoffReview: r = false } = {}) {
  if (!isAutoClassifierActive(mode)) return false;
  if (
    isLocalClassifierSwitchedOff({
      handoffReview: r,
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
function canAttachServerClassifierBeta(e) {
  return (
    isArbiterRole(
      getAutoModeClassifierRole(e, {
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
function getCallVerdictStatus(e, n) {
  if (e.kind !== "per_call") return;
  let r = e.statuses.get(n);
  if (r !== undefined) return r;
  let s = stripSuffixNumber(n);
  return s === undefined ? undefined : e.statuses.get(s);
}
//@ chunk-e6aww6q8.js:1036137-1036213 placement
/**
 * noVerdictReasonFor：未判定时给出原因。
 */
function noVerdictReasonFor(e, toolUseID) {
  let callVerdictStatus = getCallVerdictStatus(e, toolUseID);
  return callVerdictStatus?.type === "evaluated" ? undefined : getNoVerdictReason(e, callVerdictStatus);
}
//@ chunk-e6aww6q8.js:1036213-1036293 placement
/**
 * isServerNotRequestedReason：服务端未请求或输入被改写的失败原因。
 */
function isServerNotRequestedReason(e) {
  return e === "server_not_requested" || e === "server_input_rewritten";
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
function shouldFallBackToLocalEarly(e, n) {
  return (
    e === "arbiterWithLocalFallback" &&
    (isServerClassifierUnsupported(n) ||
      (n.kind === "none" &&
        (n.why === "server_not_requested" ||
          (n.why === "server_input_rewritten" && getServerClassifierFallbackMode() === "off"))))
  );
}
//@ chunk-e6aww6q8.js:1036530-1036979 placement
/**
 * 按分类器角色判断是否回退到本地分类器：arbiter 仅在无结果/不支持时；带本地回退的角色在服务端不可用、无结果或该调用不可用时回退。
 */
function shouldFallBackToLocal(
  serverClassifierRoleForCall,
  n,
  toolUseID,
  { outsideAutoMode: s = false } = {},
) {
  if (serverClassifierRoleForCall === "arbiter")
    return (
      isQuietLanternOn() &&
      n.kind === "none" &&
      (n.why === "server_no_result" ||
        n.why === "server_unsupported" ||
        (s && n.why === "server_thread_unsupported"))
    );
  if (serverClassifierRoleForCall !== "arbiterWithLocalFallback") return false;
  if (shouldFallBackToLocalEarly(serverClassifierRoleForCall, n)) return true;
  if (n.kind === "none")
    return n.why.startsWith("server_unavailable_") || n.why === "server_results_not_held";
  let callVerdictStatus = getCallVerdictStatus(n, toolUseID);
  if (callVerdictStatus === undefined) return true;
  return callVerdictStatus.type === "unavailable" && callVerdictStatus.reason !== "truncated";
}
//@ chunk-e6aww6q8.js:1036979-1037251 placement
function getNoVerdictReason(e, callVerdictStatus) {
  if (e.kind === "none") return e.why;
  if (callVerdictStatus === undefined) return "server_no_result";
  switch (callVerdictStatus.type) {
    case "skipped":
      return "server_call_skipped";
    case "unavailable":
      return `server_call_unavailable_${knownValueOrOther(dangerousToolUseCombinedSchema, callVerdictStatus.reason)}`;
    case "unrecognized":
      return "server_unrecognized_result";
  }
}
//@ chunk-e6aww6q8.js:1037251-1037570 placement
/**
 * 取服务端分类器结果：输入被改写、未持有结果或未请求时返回 kind=none 及原因。
 */
function getUnheldServerResults(e) {
  if (e.serverClassifierInputRewritten === true)
    return Promise.resolve({
      kind: "none",
      why: "server_input_rewritten",
    });
  let n = asClassifierResult(e.serverClassifierResults);
  if (n !== undefined) return n.results();
  return Promise.resolve({
    kind: "none",
    why: e.serverClassifierRequest !== undefined ? "server_results_not_held" : "server_not_requested",
  });
}
//@ chunk-e6aww6q8.js:1037570-1037999 placement
/**
 * 等待某调用的服务端分类结果；输入被改写或该调用的结论已被别的调用作废时返回 server_input_rewritten。
 */
function awaitServerVerdict(e, n, r = true) {
  let s = e.serverClassifierInputRewritten === true;
  let h = asClassifierResult(s ? e.serverClassifierReviewLeftBehind : e.serverClassifierResults);
  if (h === undefined) return getUnheldServerResults(e);
  if (!wasSentForJudging(h, e, n))
    return Promise.resolve({
      kind: "none",
      why: "server_not_requested",
    });
  return h.results().then((y) => {
    let callVerdictStatus = getCallVerdictStatus(y, n);
    return (
      s
        ? callVerdictStatus?.type === "evaluated" || callVerdictStatus?.type === "skipped"
        : (!r || h.isVoidedByAnotherCall(n)) && isNotFlaggedVerdict(callVerdictStatus)
    )
      ? {
          kind: "none",
          why: "server_input_rewritten",
        }
      : y;
  });
}
//@ chunk-e6aww6q8.js:1037999-1038071 placement
function isNotFlaggedVerdict(e) {
  return e?.type === "evaluated" && e.outcome === "not_flagged";
}
//@ chunk-e6aww6q8.js:1038071-1038179 placement = countToolCallsSince (1)
function countToolCallsSince_6(messages, sinceUuid) {
  let r = stripSuffixNumber(sinceUuid);
  return messages.message.content.some(
    (block) => block.type === "tool_use" && (block.id === sinceUuid || block.id === r),
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
function cloneIfServerResults(assistantMessage, n) {
  return asClassifierResult(assistantMessage.serverClassifierResults) === undefined ? undefined : clone(n);
}
//@ chunk-e6aww6q8.js:1038315-1038361 placement
/**
 * lacksServerResult：没有服务端结果。
 */
function lacksServerResult(e, n) {
  return e === undefined || !deepEqualIgnoringUndefined(n, e);
}
//@ chunk-e6aww6q8.js:1038361-1038591 placement
function buildInputRewriteFields(e, n, keptVerdict) {
  if (e === undefined) return {};
  return {
    [inputAsWrittenSymbol]:
      getServerClassifierFallbackMode() !== "off" ? structuredClone(e.written) : undefined,
    serverClassifierInputRewrite: {
      cause: e.cause,
      source: e.source,
      byLocalCode: e.byLocalCode,
      ...(n !== undefined && {
        shape: n,
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
  hookUpdatedInput,
  s,
  sameTurnToolUses,
) {
  let y = asClassifierResult(assistantMessage.serverClassifierResults);
  if (y === undefined || !countToolCallsSince_6(assistantMessage, toolUseID)) return assistantMessage;
  let S =
    !y.isVoidedByAnotherCall(toolUseID) &&
    sameTurnToolUses !== undefined &&
    sameTurnToolUses.every((Ie) => asClassifierResult(Ie.serverClassifierResults) === y);
  if (s === undefined && S) return assistantMessage;
  let w = s !== undefined;
  let L =
    s !== undefined
      ? s.cause
      : sameTurnToolUses === undefined
        ? "siblings_unknown"
        : sameTurnToolUses.every((Ie) => asClassifierResult(Ie.serverClassifierResults) === y)
          ? y.siblingNoteCause()
          : "sibling_not_reviewed";
  y.noteRewriteCause(L);
  y.noteRewrittenCall(
    toolUseID,
    getServerClassifierFallbackMode() !== "off" ? countToolCallsSince_7(sameTurnToolUses) : undefined,
  );
  let message = {
    ...assistantMessage.message,
    content: assistantMessage.message.content.map((Ie) =>
      Ie.type === "tool_use" && Ie.id === toolUseID
        ? {
            ...Ie,
            input: hookUpdatedInput,
          }
        : Ie,
    ),
  };
  let q = wasSentForJudging(y, assistantMessage, toolUseID)
    ? getCallVerdictStatus(await y.results(), toolUseID)
    : undefined;
  let found = assistantMessage.message.content.find((Ie) => Ie.type === "tool_use" && Ie.id === toolUseID);
  let Se = w ? compareBashCommandInputs(found, hookUpdatedInput) : undefined;
  if (s !== undefined && S && keepsLocalClassifierVerdict(s))
    return {
      ...assistantMessage,
      ...buildInputRewriteFields(s, Se, isNotFlaggedVerdict(q)),
      message,
    };
  if (!(w ? q?.type === "evaluated" : isNotFlaggedVerdict(q)))
    return w
      ? {
          ...assistantMessage,
          ...buildInputRewriteFields(s, Se, false),
          message,
        }
      : assistantMessage;
  let { serverClassifierRequest, serverClassifierResults, ...Ae } = assistantMessage;
  return {
    ...Ae,
    serverClassifierInputRewritten: true,
    ...(w && {
      serverClassifierOwnInputRewritten: true,
    }),
    ...buildInputRewriteFields(s, Se, false),
    message,
    serverClassifierRewrite: {
      cause: L,
      lostVerdict: isNotFlaggedVerdict(q) ? "cleared" : "flagged",
    },
  };
}
//@ chunk-e6aww6q8.js:1039693-1039930 placement
function compareBashCommandInputs(e, n) {
  let command = e?.type === "tool_use" && isPlainObject_5(e.input) ? e.input.command : undefined;
  let command_2 = n.command;
  if (typeof command !== "string" || typeof command_2 !== "string") return;
  if (command_2 === command) return "same";
  if (command_2.endsWith(command)) return "prefix";
  return command_2.includes(command) ? "contains" : "other";
}
//@ chunk-e6aww6q8.js:1039930-1040058 placement = countToolCallsSince (1)
function countToolCallsSince_7(e) {
  return e === undefined
    ? undefined
    : new Set(
        e.flatMap((n) => n.message.content.flatMap((block) => (block.type === "tool_use" ? [block.id] : []))),
      );
}
//@ chunk-e6aww6q8.js:1040058-1040453 placement
/**
 * 描述服务端分类后调用输入被改写的情况：原因（工具链或钩子）、来源、是否全由本地代码改写，以及 keep_local 模式下的附加判断。
 */
function describeInputRewrite(hookRewrite, n, r, s) {
  if (!hookRewrite.changed && !n.changed) return;
  let h = (kinds) => kinds.every((w) => w === "local_code");
  let y = getServerClassifierFallbackMode() === "keep_local";
  return {
    cause: hookRewrite.changed ? "tool_call_chain" : "hook",
    source: summarizeRewriteSources([
      ...(hookRewrite.changed ? hookRewrite.sources : []),
      ...(n.changed ? n.sources : []),
    ]),
    byLocalCode:
      h(hookRewrite.kinds) &&
      h(n.kinds) &&
      (!hookRewrite.changed || hookRewrite.kinds.length > 0) &&
      (!n.changed || n.kinds.length > 0),
    classifiesAll: y && r(),
    shellOrFileTool: y && s(),
    written: hookRewrite.written,
  };
}
//@ chunk-e6aww6q8.js:1040453-1040701 placement
function classifyRewriteSource(e) {
  switch (e === undefined ? undefined : firstLineOf(e, ":")) {
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
function summarizeRewriteSources(e) {
  let n = new Set(e.map(classifyRewriteSource));
  if (n.size === 0) return "unknown";
  return n.size === 1 ? [...n][0] : "mixed";
}
//@ chunk-e6aww6q8.js:1040809-1040837 placement
var SHELL_TOOL_NAMES_2 = new Set([BASH_TOOL_NAME, MONITOR, POWERSHELL_TOOL_NAME]);
//@ chunk-e6aww6q8.js:1040837-1040878 placement
/**
 * isShellToolClassified：shell 工具且分类器启用。
 */
function isShellToolClassified(name) {
  return SHELL_TOOL_NAMES_2.has(name) && classifyAllShellEnabled();
}
//@ chunk-e6aww6q8.js:1040878-1040913 placement
var SHELL_AND_FILE_TOOL_NAMES = new Set([
  ...SHELL_TOOL_NAMES_2,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
]);
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
function keepsLocalClassifierVerdict(e) {
  return (
    getServerClassifierFallbackMode() === "keep_local" &&
    e.byLocalCode &&
    e.shellOrFileTool &&
    !e.classifiesAll
  );
}
//@ chunk-e6aww6q8.js:1041090-1041347 placement
function getRewriteLostVerdictNote(assistantMessage, n) {
  if (n !== "server_input_rewritten") return;
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
function summarizeServerVerdict(e, n) {
  let callVerdictStatus = getCallVerdictStatus(e, n);
  if (callVerdictStatus?.type !== "evaluated")
    return {
      kind: "no_verdict",
      why: getNoVerdictReason(e, callVerdictStatus),
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
function classifyServerVerdict(e, n, r) {
  let callVerdictStatus = getCallVerdictStatus(e, n);
  if (callVerdictStatus?.type !== "evaluated") {
    if (callVerdictStatus?.type === "unavailable" && callVerdictStatus.reason === "refused")
      return {
        model: SERVER_CLASSIFIER_LABEL,
        durationMs: 0,
        shouldBlock: true,
        refusedBySafeguard: true,
        failureMode: "policy_refusal",
        errorKind: noVerdictReasonFor(e, n),
        reason: buildClassifierParseFailureReason("server", "policy_refusal", "refusal"),
      };
    let S =
      callVerdictStatus === undefined
        ? e.kind !== "none" || e.why !== "server_unrecognized_result"
        : callVerdictStatus.type === "skipped";
    let w = noVerdictReasonFor(e, n);
    return (
      (S ? r() : undefined) ?? {
        model: SERVER_CLASSIFIER_LABEL,
        durationMs: 0,
        shouldBlock: true,
        unavailable: true,
        ...(w === SERVER_CALL_UNAVAILABLE_INPUT_TOO_LONG &&
          isVividCrayonOn() && {
            transcriptTooLong: true,
          }),
        errorKind: w,
        reason: "Classifier unavailable - blocking for safety",
      }
    );
  }
  let h = callVerdictStatus.outcome === "flagged";
  let y = h ? sanitizeServerExplanation(callVerdictStatus.explanation) : undefined;
  return {
    model: SERVER_CLASSIFIER_LABEL,
    durationMs: 0,
    shouldBlock: h,
    reason: h
      ? y !== undefined && y.length > 0
        ? y.slice(0, SERVER_CLASSIFIER_NOTE_LIMIT)
        : SERVER_CLASSIFIER_NO_EXPLANATION_REASON
      : "Not flagged by the server-side auto mode classifier",
  };
}
//@ chunk-e6aww6q8.js:1042315-1042347 placement
var TENGU_FLICKERING_RAIN = "tengu_flickering_rain";
//@ chunk-e6aww6q8.js:1308790-1309037 placement
function getPermissionModeAtRequestForArbiter(assistantMessage, toolUseID, r) {
  let permissionModeAtRequest = assistantMessage.permissionModeAtRequest;
  if (
    !isPlainModeAtRequest(permissionModeAtRequest) ||
    !assistantMessage.message.content.some((y) => y.type === "tool_use" && y.id === toolUseID)
  )
    return;
  let mode = getToolPermissionContext({
    ...r,
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
