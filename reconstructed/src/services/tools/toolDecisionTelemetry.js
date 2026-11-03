/**
 * services/tools/toolDecisionTelemetry.ts
 *
 * 2.1.316 新增：工具权限决策原因的遥测
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
 * attribution: placement 34
 */
import {
  isDeepStrictEqual,
  isDeepStrictEqual as isDeepStrictEqual_2,
  isDeepStrictEqual as isDeepStrictEqual_3,
  isDeepStrictEqual as isDeepStrictEqual_4,
  isDeepStrictEqual as isDeepStrictEqual_5,
  isDeepStrictEqual as isDeepStrictEqual_6,
  isDeepStrictEqual as isDeepStrictEqual_7,
  isDeepStrictEqual as isDeepStrictEqual_8,
  isDeepStrictEqual as isDeepStrictEqual_9,
  isDeepStrictEqual as isDeepStrictEqual_10,
  isDeepStrictEqual as isDeepStrictEqual_11,
  isDeepStrictEqual as isDeepStrictEqual_12,
  isDeepStrictEqual as isDeepStrictEqual_13,
  isDeepStrictEqual as isDeepStrictEqual_14,
  isDeepStrictEqual as isDeepStrictEqual_15,
  isDeepStrictEqual as isDeepStrictEqual_16,
  isDeepStrictEqual as isDeepStrictEqual_17,
  isDeepStrictEqual as isDeepStrictEqual_18,
  isDeepStrictEqual as isDeepStrictEqual_19,
} from "util";
import { SUBCOMMANDS } from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { TOOL_CHECK } from "../../plugins/functionHooks/toolCheckHooks.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { toolMatchesName } from "../../Tool.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { dKe, AL } from "../../utils/permissions/permissions.js";
import { toExternalPermissionMode } from "../../utils/permissions/PermissionMode.js";
import { logError } from "../../utils/log.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  sanitizeToolNameWithMcpFlag,
  sanitizeToolNameForAnalytics,
  toolSourceMetadata,
  isToolDetailsLoggingEnabled,
} from "../analytics/metadata.js";
import { SandboxManager } from "../../utils/sandbox/sandbox-adapter.js";
import { logEvent } from "../analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../../tools/FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../../tools/NotebookEditTool/constants.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { WEBSEARCH } from "../../tools/WebSearchTool/prompt.js";
import { isPlainDataObject } from "../../utils/hooks/functionHookMatchers.js";
import {
  isRewrittenOrigin,
  originPlugin,
  lentModulesByChain,
  DFi,
  EYr,
  reportPluginProblem,
} from "../../plugins/functionHooks/hooksWorkerClient.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { mxe } from "../../plugins/functionHooks/apiDispatch.js";
import { clone } from "../../utils/slowOperations.js";
import { getHookCaller } from "../../utils/agentContext.js";

//@ chunk-e6aww6q8.js:3767655-3767731 placement
function lPe(e) {
  return e.startsWith(SUBCOMMANDS) ? e.slice(SUBCOMMANDS.length).split("+") : [e];
}
//@ chunk-e6aww6q8.js:3767731-3767799 placement
var AUr = /^[A-Za-z][A-Za-z+:-]{0,199}$/,
  eqr = new Set([`hook:${TOOL_CHECK}`]);
//@ chunk-e6aww6q8.js:3767799-3767873 placement
function lNn(e) {
  return e !== void 0 && (AUr.test(e) || eqr.has(e)) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e) : void 0;
}
//@ chunk-e6aww6q8.js:3767873-3767922 placement
function dNn(e, n) {
  return e.includes(n) ? n : "other";
}
//@ chunk-e6aww6q8.js:3767922-3768058 placement
function toDecisionRecord(e) {
  return {
    behavior: e.behavior,
    decisionReason: e.decisionReason,
    matchedAskRule: "matchedAskRule" in e ? e.matchedAskRule : void 0,
  };
}
//@ chunk-e6aww6q8.js:3768058-3768222 placement
function logToolDecision({
  toolName: toolName,
  isMcp: isMcp,
  messageId: messageId,
  toolUseID: toolUseID,
  permissionMode: permissionMode,
  behavior: behavior,
  decisionReason: decisionReason,
  resolvedSource: resolvedSource,
  resolvedDecision: resolvedDecision,
  matchedAskRule: matchedAskRule,
}) {
  return;
}
//@ chunk-e6aww6q8.js:3768222-3768299 placement
function dPe(e, n) {
  return e.find((r) => toolMatchesName(r, n))?.name ?? (getShadowedSearchToolNames().has(n) ? n : void 0);
}
//@ chunk-e6aww6q8.js:3768299-3768361 placement
var u3s = ["mcp_tool", "skill_tool", "dynamic_tool", "other_tool"];
/**
 * 按工具名分类：mcp 工具、技能工具、动态工具（含 __）或其他。
 */
//@ chunk-e6aww6q8.js:3768361-3768510 placement
function classifyToolNameKind(e) {
  if (e.startsWith("mcp__")) return "mcp_tool";
  if (e.startsWith(SKILL_2)) return "skill_tool";
  return e.includes("__") ? "dynamic_tool" : "other_tool";
}
/**
 * 工具权限决策原因的遥测枚举（过于复杂、静态分析、多个 cd 等）。
 */
//@ chunk-e6aww6q8.js:3768510-3769669 placement
var TOOL_DECISION_REASONS = "tengu_snoopy_creek",
  nqr = new Set([ASKUSERQUESTION, EXITPLANMODE_2]),
  oqr = {
    "too-complex": "static_analysis",
    semantics: "static_analysis",
    "multi-cd": "static_analysis",
    "cd-git-compound": "static_analysis",
    "cd-compound-write": "static_analysis",
    "cd-compound-read": "static_analysis",
    "cd-compound-redirect": "static_analysis",
    "dangerous-path": "static_analysis",
    "flag-validation": "static_analysis",
    "cd-multi-positional": "static_analysis",
    "process-substitution": "static_analysis",
    "shell-expansion": "static_analysis",
    "net-redirect": "static_analysis",
    "shell-operators": "static_analysis",
    "sed-dangerous": "static_analysis",
    "assigned-variable": "static_analysis",
    "loop-later-pass": "static_analysis",
    "working-dir": "safety_check",
    "safety-check": "safety_check",
    "ask-rule": "permission_rule",
    "no-rule-match": void 0,
    "other-untagged": void 0,
  },
  cNn = new Map(Object.entries(oqr)),
  u_u = new Set([...cNn].filter(([, e]) => e === "static_analysis").map(([e]) => e)),
  rqr = [
    "safety_check",
    "managed_policy",
    "permission_rule",
    "static_analysis",
    "hook",
    "auto_mode_block",
    "auto_mode_no_verdict",
    "permission_mode",
    "sandbox_override",
  ],
  sqr = ["config", "classifier", "hook", "user_temporary", "user_permanent", "user_reject", "user_abort"];
/**
 * 按决策记录推导安全事件类别：原因码映射（策略规则单独归类）、异步代理归为权限模式、用户拒绝/中止；无原因码时按沙箱违规（网络或其他）。
 */
//@ chunk-e6aww6q8.js:3769669-3770174 placement
function getSafetyEventCategory(decision, sandboxViolations) {
  if (decision.reasonCode !== void 0) {
    let r = decision.circuitBreaker !== void 0 ? "safety_check" : categorizeReasonCode(decision.reasonCode);
    if (r === "permission_rule" && decision.ruleSource === "policySettings") return "managed_policy";
    if (r !== void 0) return r;
    if (decision.reasonType === "asyncAgent") return "permission_mode";
    if (decision.decision === "reject") {
      if (decision.source === "user_reject" || decision.source === "user_abort") return "user_rejected";
      if (decision.reasonType !== void 0) return "other";
    }
  }
  if (sandboxViolations.length === 0) return;
  return sandboxViolations.some((r) => r.kind === "network") ? "sandbox_network" : "sandbox_other";
}
/**
 * 对被拒/被问的工具调用记 tengu_safety_event（类别、决策、来源、原因、规则来源、熔断、分类器类别、PreToolUse 钩子、工具类别与名称、权限模式）；不适用或出错时返回 false。
 */
//@ chunk-e6aww6q8.js:3770174-3770915 placement
function logToolSafetyEvent({
  tool: tool,
  toolUseId: toolUseId,
  record: record,
  sandboxViolations: sandboxViolations = [],
  permissionMode: permissionMode,
  agentContext: agentContext,
  toolCatalog: toolCatalog,
}) {
  try {
    let category = getSafetyEventCategory(record, sandboxViolations),
      toolClass = getToolClass(tool);
    if (category === void 0 || (toolClass === "other" && nqr.has(tool.name)) || !mNn()) return !1;
    return (
      emitSafetyEvent(
        {
          category: fromEnum(category),
          decision: fromEnum(record.decision),
          decision_source: fromEnum(sqr.find((G) => G === record.source) ?? "other"),
          reason_type: fromEnumOpt(record.reasonType),
          reason_code: lNn(record.reasonCode),
          rule_source: fromEnumOpt(record.ruleSource),
          grant_scope: fromEnumOpt(record.grantScope),
          circuit_breaker: fromEnumOpt(record.circuitBreaker),
          classifier_category: dKe(record.classifierCategory),
          hook_event: fromEnumOpt(
            category === "hook" &&
              record.reasonCode !== void 0 &&
              lPe(record.reasonCode).includes("hook:PreToolUse")
              ? "pre_tool_use"
              : void 0,
          ),
          ...getToolTelemetryFields(tool, toolClass, toolCatalog),
          permission_mode: fromEnum(toExternalPermissionMode(permissionMode)),
        },
        { toolUseId: toolUseId, sandboxViolationCount: sandboxViolations.length },
        agentContext,
      ),
      !0
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 记录 PostToolUse(Failure) 钩子把结果打回（hook_review / sent_back）的安全事件。
 */
//@ chunk-e6aww6q8.js:3770915-3771330 placement
function logHookPushbackEvent({
  pushback: pushback,
  permissionMode: permissionMode,
  agentContext: agentContext,
}) {
  try {
    if (!mNn()) return !1;
    let s =
      pushback.hookEvent === "post_tool_use" || pushback.hookEvent === "post_tool_use_failure"
        ? pushback
        : void 0;
    return (
      emitSafetyEvent(
        {
          category: fromEnum("hook_review"),
          decision: fromEnum("sent_back"),
          decision_source: fromEnum("hook"),
          hook_event: fromEnum(pushback.hookEvent),
          ...(s !== void 0 && getToolTelemetryFields(s.tool, getToolClass(s.tool), s.toolCatalog)),
          permission_mode: fromEnum(toExternalPermissionMode(permissionMode)),
        },
        { toolUseId: s?.toolUseId },
        agentContext,
      ),
      !0
    );
  } catch (error) {
    return (logError(error), !1);
  }
}
/**
 * 在钩子产出的消息中找本次调用的 hook_blocking_error，若来自 PostToolUse 或其失败钩子则记打回事件。
 */
//@ chunk-e6aww6q8.js:3771330-3771828 placement
function logHookPushbacks({
  updates: updates,
  tool: tool,
  toolUseId: toolUseId,
  getPermissionMode: getPermissionMode,
  agentContext: agentContext,
  toolCatalog: toolCatalog,
}) {
  try {
    for (let { message: message } of updates) {
      if (
        message.type !== "attachment" ||
        message.attachment.type !== "hook_blocking_error" ||
        message.attachment.toolUseID !== toolUseId
      )
        continue;
      let { hookEvent: hookEvent } = message.attachment;
      if (hookEvent === "PostToolUse" || hookEvent === "PostToolUseFailure")
        return logHookPushbackEvent({
          pushback: {
            hookEvent: hookEvent === "PostToolUse" ? "post_tool_use" : "post_tool_use_failure",
            tool: tool,
            toolUseId: toolUseId,
            toolCatalog: toolCatalog,
          },
          permissionMode: getPermissionMode(),
          agentContext: agentContext,
        });
    }
    return !1;
  } catch (error) {
    return (logError(error), !1);
  }
}
//@ chunk-e6aww6q8.js:3771828-3771860 placement
function mNn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TOOL_DECISION_REASONS, !1);
}
//@ chunk-e6aww6q8.js:3771860-3772047 placement
function getToolTelemetryFields(e, n, r) {
  let s;
  if (n === "mcp") s = sanitizeToolNameWithMcpFlag(e.name, !0);
  else {
    let h = dPe(r.getAllBaseTools(), e.name);
    s = h !== void 0 ? sanitizeToolNameForAnalytics(h) : fromEnum(classifyToolNameKind(e.name));
  }
  return { tool_class: fromEnum(n), tool_name: s, ...toolSourceMetadata(e.mcpInfo) };
}
/**
 * 同时发出 tengu_safety_event 与 OTel safety_event（附沙箱开关、违规数；OTel 中特定工具名归为 other_tool，分类器类别只在开启工具详情日志时带上）。
 */
//@ chunk-e6aww6q8.js:3772047-3772491 placement
function emitSafetyEvent(e, { toolUseId: toolUseId, sandboxViolationCount: sandboxViolationCount }, s) {
  let isSandboxingEnabled = SandboxManager.isSandboxingEnabled();
  (logEvent("tengu_safety_event", {
    ...e,
    tool_use_id: ye(toolUseId),
    sandbox_violation_count: sandboxViolationCount,
    sandbox_enabled: isSandboxingEnabled,
  }),
    logOTelEvent(
      "safety_event",
      {
        ...e,
        tool_name: e.tool_name !== void 0 && _Nn.includes(e.tool_name) ? fromEnum("other_tool") : e.tool_name,
        classifier_category: isToolDetailsLoggingEnabled() ? AL(e.classifier_category) : void 0,
        tool_use_id: toolUseId,
        sandbox_violation_count: sandboxViolationCount === void 0 ? void 0 : String(sandboxViolationCount),
        sandbox_enabled: String(isSandboxingEnabled),
      },
      s,
    ));
}
/**
 * 把权限原因码（bashMiss、subcommands、rule、mode、hook、classifier、safetyCheck 等）映射为安全事件类别；subcommands 取各子原因中优先级最高的。
 */
//@ chunk-e6aww6q8.js:3772491-3773224 placement
function categorizeReasonCode(e) {
  let index = e.indexOf(":"),
    kind = index === -1 ? e : e.slice(0, index),
    detail = index === -1 ? "" : e.slice(index + 1);
  switch (kind) {
    case "bashMiss":
      return cNn.get(detail);
    case "subcommands": {
      if (detail === "") return;
      let h = new Set(lPe(e).map(categorizeReasonCode));
      return rqr.find((y) => h.has(y));
    }
    case "rule":
      return detail === "policySettings" ? "managed_policy" : "permission_rule";
    case "mode":
      return "permission_mode";
    case "hook":
      return "hook";
    case "classifier":
      return detail.endsWith(":unavailable") || detail.endsWith(":no-verdict")
        ? "auto_mode_no_verdict"
        : "auto_mode_block";
    case "classifierTranscriptTooLong":
      return "auto_mode_no_verdict";
    case "safetyCheck":
    case "workingDir":
    case "outsideReadsBlocked":
    case "restrictedMode":
    case "noProjectDirectory":
      return "safety_check";
    case "sandboxOverride":
      return "sandbox_override";
    default:
      return;
  }
}
//@ chunk-e6aww6q8.js:3773224-3773296 placement
var _Nn = [],
  aqr = new Set([
    FILE_READ_TOOL_NAME,
    FILE_EDIT_TOOL_NAME,
    FILE_WRITE_TOOL_NAME,
    NOTEBOOK_EDIT_TOOL_NAME,
    GLOB_TOOL_NAME,
    GREP_TOOL_NAME,
    ..._Nn,
  ]),
  lqr = new Set([BASH_TOOL_NAME, MONITOR]);
//@ chunk-e6aww6q8.js:3773296-3773512 placement
function getToolClass(e) {
  if (e.mcpInfo !== void 0 || e.isMcp === !0) return "mcp";
  if (lqr.has(e.name)) return "bash";
  if (e.name === POWERSHELL_TOOL_NAME) return "powershell";
  if (aqr.has(e.name)) return "file";
  if (e.name === WEBFETCH || e.name === WEBSEARCH) return "web";
  return "other";
}
/**
 * 递归去掉值为 undefined 且原对象中没有的键（数组保持索引）。
 */
//@ chunk-e6aww6q8.js:3773512-3773840 placement
function stripUndefinedFields(e, n) {
  let isArray = Array.isArray(e);
  if (!isArray && !isPlainDataObject(e)) return e;
  let h = Array.isArray(n) || isPlainDataObject(n) ? n : {},
    fromEntries = Object.fromEntries(
      Object.entries(e)
        .filter(([S, w]) => w !== void 0 || Object.hasOwn(h, S))
        .map(([S, w]) => [S, stripUndefinedFields(w, Reflect.get(h, S))]),
    );
  return isArray
    ? Object.defineProperties(
        Array.from(e, () => {
          return;
        }),
        Object.getOwnPropertyDescriptors(fromEntries),
      )
    : fromEntries;
}
//@ chunk-e6aww6q8.js:3773840-3773943 placement
function getHookOriginChain(e) {
  let { hookOrigin: hookOrigin, hookCaller: hookCaller } = e,
    s = hookCaller === void 0 ? [] : [hookCaller];
  return hookOrigin !== void 0 && hookOrigin.length > 0 ? hookOrigin : s;
}
//@ chunk-e6aww6q8.js:3773943-3774114 placement
function callerHasCatch(e) {
  let n = getHookOriginChain(e).at(-1) ?? "",
    r = isRewrittenOrigin(n) ? n.of : n,
    found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === originPlugin(r));
  return typeof r === "string" || found === void 0 || found.hasCatch(r.registration);
}
//@ chunk-e6aww6q8.js:3774157-3774374 placement
function isInputUnchanged(e, n, r = (s) => s) {
  try {
    return isDeepStrictEqual_11(n, r(e.input, n));
  } catch (error) {
    return (
      logForDebugging(
        `a plugin's own call holds an input that cannot be compared value for value, so it reads as rewritten beneath: ${errorMessage(error)}`,
        { level: "error" },
      ),
      !1
    );
  }
}
//@ chunk-e6aww6q8.js:3774374-3774412 placement
var umn = (e, n) => isInputUnchanged(e, n) || isInputUnchanged(e, n, stripUndefinedFields);
//@ chunk-e6aww6q8.js:3774412-3774423 placement
var bNn = !0;
//@ chunk-e6aww6q8.js:3774423-3774468 placement
var KN = () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_kestrel", bNn) !== !1;
//@ chunk-e6aww6q8.js:3774468-3774715 placement
function propagateLentModules(e, n) {
  let r = e === void 0 ? e : lentModulesByChain().get(e),
    s = new Map(e?.map((y, S) => [y, r?.[S]])),
    h = { until: Number.POSITIVE_INFINITY, isLent: !1, isHeld: !1 };
  if (r !== void 0)
    lentModulesByChain().set(
      n,
      n.map(
        (y) => s.get(y) ?? { ...h, until: isRewrittenOrigin(y) ? (s.get(y.of)?.until ?? h.until) : h.until },
      ),
    );
}
/**
 * 插件自身发起的调用到达底层时调用帧已变：重写钩子来源链并同步借出模块信息，记调试日志。
 */
//@ chunk-e6aww6q8.js:3774715-3774990 placement
function rebaseHookOrigin(e) {
  let { hookOrigin: hookOrigin, hookCaller: hookCaller } = e,
    s = getHookOriginChain(e),
    at = s.at(-1);
  if (at === void 0 || isRewrittenOrigin(at)) return s;
  let y = mxe(s, DFi(at));
  return (
    propagateLentModules(hookOrigin, y),
    logForDebugging(
      `plugin ${hookCaller}'s own call did not arrive at the bottom as it was raised: its calling frame is no longer the caller's (origin ${EYr(y)})`,
    ),
    y
  );
}
//@ chunk-e6aww6q8.js:3774990-3775071 placement
function Lqr(e, n, r) {
  return n === void 0 || !KN() || umn(n, r) ? e : { ...e, hookOrigin: rebaseHookOrigin(e) };
}
//@ chunk-e6aww6q8.js:3775071-3775232 placement
function cloneCallInput(e) {
  try {
    return { input: clone(e) };
  } catch (error) {
    logForDebugging(
      `a plugin's own call holds an input that cannot be copied as it was raised: ${errorMessage(error)}`,
      { level: "error" },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3775232-3775353 placement
function rebaseBatchHookOrigins(e, n, r) {
  let [s] = e;
  if (n === void 0 || !KN() || umn(n, r) || s === void 0) return;
  let y = rebaseHookOrigin(s);
  for (let S of e) S.hookOrigin = y;
}
/**
 * 插件调用的输入无法复制时：调用方有 .catch 则放行；否则上报插件问题（只报一次）。
 */
//@ chunk-e6aww6q8.js:3775353-3775711 placement
function checkUncopyableCall(e, n) {
  try {
    if (callerHasCatch(e)) return { input: void 0 };
    reportPluginProblem(
      n,
      "a call it made could not be copied, so a rewrite of that call beneath its hook, which carries no .catch, goes unmarked",
      "once",
    );
    return;
  } catch (error) {
    return (
      logForDebugging(
        `plugin ${n}'s own call could not be copied, and whether its caller carries a .catch could not be read: ${errorMessage(error)}`,
        { level: "error" },
      ),
      { input: void 0 }
    );
  }
}
//@ chunk-e6aww6q8.js:3775711-3775790 placement
function ENn(e, n) {
  let r = getHookCaller(e);
  return r !== void 0 && KN() ? (cloneCallInput(n) ?? checkUncopyableCall(e, r)) : void 0;
}

export {
  KN,
  rebaseHookOrigin,
  dNn,
  lPe,
  classifyToolNameKind,
  u3s,
  dPe,
  ENn,
  Lqr,
  logToolSafetyEvent,
  logHookPushbacks,
  rebaseBatchHookOrigins,
  logToolDecision,
  toDecisionRecord,
  logHookPushbackEvent,
  umn,
};
