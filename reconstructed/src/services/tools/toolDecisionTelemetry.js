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
import { isDeepStrictEqual } from "util";
import { SUBCOMMANDS } from "../../components/permissions/PermissionDecisionDebugInfo.js";
import { TOOL_CHECK } from "../../plugins/functionHooks/toolCheckHooks.js";
import { fromSanitizer_SANITIZER_OUTPUT_ONLY, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { toolMatchesName } from "../../Tool.js";
import { getShadowedSearchToolNames } from "../../utils/embeddedTools.js";
import { SKILL_2 } from "../../tools/SkillTool/skillToolNames.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import {
  sanitizeRuleCategoryOrUndefined,
  sanitizeRuleCategory,
} from "../../utils/permissions/permissions.js";
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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
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
  rewrittenMarker,
  labeledOriginChain,
  reportPluginProblem,
} from "../../plugins/functionHooks/hooksWorkerClient.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { appendCallerFrame } from "../../plugins/functionHooks/apiDispatch.js";
import { clone } from "../../utils/slowOperations.js";
import { getHookCaller } from "../../utils/agentContext.js";

//@ chunk-e6aww6q8.js:3767655-3767731 placement
/**
 * 把「子命令+」形式的决策原因拆成列表。
 */
function splitSubcommandReason(e) {
  return e.startsWith(SUBCOMMANDS) ? e.slice(SUBCOMMANDS.length).split("+") : [e];
}
//@ chunk-e6aww6q8.js:3767731-3767799 placement
/**
 * 决策原因的正则与额外允许的特殊原因。
 */
var DECISION_REASON_REGEX = /^[A-Za-z][A-Za-z+:-]{0,199}$/;
var SPECIAL_DECISION_REASONS = new Set([`hook:${TOOL_CHECK}`]);
//@ chunk-e6aww6q8.js:3767799-3767873 placement
/**
 * 决策原因合规（匹配正则或属于特殊原因）才返回，否则 undefined。
 */
function sanitizeDecisionReason(reasonCode) {
  return reasonCode !== undefined &&
    (DECISION_REASON_REGEX.test(reasonCode) || SPECIAL_DECISION_REASONS.has(reasonCode))
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(reasonCode)
    : undefined;
}
//@ chunk-e6aww6q8.js:3767873-3767922 placement
/**
 * 列表里有该原因就用它，否则归为 other。
 */
function pickReasonFromList(e, n) {
  return e.includes(n) ? n : "other";
}
//@ chunk-e6aww6q8.js:3767922-3768058 placement
function toDecisionRecord(permissionDecision) {
  return {
    behavior: permissionDecision.behavior,
    decisionReason: permissionDecision.decisionReason,
    matchedAskRule: "matchedAskRule" in permissionDecision ? permissionDecision.matchedAskRule : undefined,
  };
}
//@ chunk-e6aww6q8.js:3768058-3768222 placement
function logToolDecision({
  toolName,
  isMcp,
  messageId,
  toolUseID,
  permissionMode,
  behavior,
  decisionReason,
  resolvedSource,
  resolvedDecision,
  matchedAskRule,
}) {
  return;
}
//@ chunk-e6aww6q8.js:3768222-3768299 placement
/**
 * 按名字找工具；找不到时若是被遮蔽的搜索工具名也返回该名。
 */
function toolNameForTelemetry(e, n) {
  return e.find((r) => toolMatchesName(r, n))?.name ?? (getShadowedSearchToolNames().has(n) ? n : undefined);
}
//@ chunk-e6aww6q8.js:3768299-3768361 placement
/**
 * 工具名到类别（读/写/执行等）的映射。
 */
var TOOL_NAME_KINDS = ["mcp_tool", "skill_tool", "dynamic_tool", "other_tool"];
//@ chunk-e6aww6q8.js:3768361-3768510 placement
/**
 * 按工具名分类：mcp 工具、技能工具、动态工具（含 __）或其他。
 */
function classifyToolNameKind(name) {
  if (name.startsWith("mcp__")) return "mcp_tool";
  if (name.startsWith(SKILL_2)) return "skill_tool";
  return name.includes("__") ? "dynamic_tool" : "other_tool";
}
//@ chunk-e6aww6q8.js:3768510-3769669 placement
/**
 * 工具权限决策原因的遥测枚举（过于复杂、静态分析、多个 cd 等）。
 */
var TOOL_DECISION_REASONS = "tengu_snoopy_creek";
var ASK_DECISION_TOOLS = new Set([ASKUSERQUESTION, EXITPLANMODE_2]);
var REASON_CATEGORY_MAP = {
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
  "no-rule-match": undefined,
  "other-untagged": undefined,
};
var reasonCategoryMap = new Map(Object.entries(REASON_CATEGORY_MAP));
var STATIC_ANALYSIS_REASONS = new Set(
  [...reasonCategoryMap].filter(([, e]) => e === "static_analysis").map(([e]) => e),
);
var SAFETY_EVENT_CATEGORIES = [
  "safety_check",
  "managed_policy",
  "permission_rule",
  "static_analysis",
  "hook",
  "auto_mode_block",
  "auto_mode_no_verdict",
  "permission_mode",
  "sandbox_override",
];
var HOOK_PUSHBACK_SOURCES = [
  "config",
  "classifier",
  "hook",
  "user_temporary",
  "user_permanent",
  "user_reject",
  "user_abort",
];
//@ chunk-e6aww6q8.js:3769669-3770174 placement
/**
 * 按决策记录推导安全事件类别：原因码映射（策略规则单独归类）、异步代理归为权限模式、用户拒绝/中止；无原因码时按沙箱违规（网络或其他）。
 */
function getSafetyEventCategory(decision, sandboxViolations) {
  if (decision.reasonCode !== undefined) {
    let r =
      decision.circuitBreaker !== undefined ? "safety_check" : categorizeReasonCode(decision.reasonCode);
    if (r === "permission_rule" && decision.ruleSource === "policySettings") return "managed_policy";
    if (r !== undefined) return r;
    if (decision.reasonType === "asyncAgent") return "permission_mode";
    if (decision.decision === "reject") {
      if (decision.source === "user_reject" || decision.source === "user_abort") return "user_rejected";
      if (decision.reasonType !== undefined) return "other";
    }
  }
  if (sandboxViolations.length === 0) return;
  return sandboxViolations.some((sandboxViolation) => sandboxViolation.kind === "network")
    ? "sandbox_network"
    : "sandbox_other";
}
//@ chunk-e6aww6q8.js:3770174-3770915 placement
/**
 * 对被拒/被问的工具调用记 tengu_safety_event（类别、决策、来源、原因、规则来源、熔断、分类器类别、PreToolUse 钩子、工具类别与名称、权限模式）；不适用或出错时返回 false。
 */
function logToolSafetyEvent({
  tool,
  toolUseId,
  record,
  sandboxViolations = [],
  permissionMode,
  agentContext,
  toolCatalog,
}) {
  try {
    let category = getSafetyEventCategory(record, sandboxViolations);
    let toolClass = getToolClass(tool);
    if (
      category === undefined ||
      (toolClass === "other" && ASK_DECISION_TOOLS.has(tool.name)) ||
      !isToolDecisionTelemetryOn()
    )
      return false;
    emitSafetyEvent(
      {
        category: fromEnum(category),
        decision: fromEnum(record.decision),
        decision_source: fromEnum(HOOK_PUSHBACK_SOURCES.find((G) => G === record.source) ?? "other"),
        reason_type: fromEnumOpt(record.reasonType),
        reason_code: sanitizeDecisionReason(record.reasonCode),
        rule_source: fromEnumOpt(record.ruleSource),
        grant_scope: fromEnumOpt(record.grantScope),
        circuit_breaker: fromEnumOpt(record.circuitBreaker),
        classifier_category: sanitizeRuleCategoryOrUndefined(record.classifierCategory),
        hook_event: fromEnumOpt(
          category === "hook" &&
            record.reasonCode !== undefined &&
            splitSubcommandReason(record.reasonCode).includes("hook:PreToolUse")
            ? "pre_tool_use"
            : undefined,
        ),
        ...getToolTelemetryFields(tool, toolClass, toolCatalog),
        permission_mode: fromEnum(toExternalPermissionMode(permissionMode)),
      },
      {
        toolUseId,
        sandboxViolationCount: sandboxViolations.length,
      },
      agentContext,
    );
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:3770915-3771330 placement
/**
 * 记录 PostToolUse(Failure) 钩子把结果打回（hook_review / sent_back）的安全事件。
 */
function logHookPushbackEvent({ pushback, permissionMode, agentContext }) {
  try {
    if (!isToolDecisionTelemetryOn()) return false;
    let s =
      pushback.hookEvent === "post_tool_use" || pushback.hookEvent === "post_tool_use_failure"
        ? pushback
        : undefined;
    emitSafetyEvent(
      {
        category: fromEnum("hook_review"),
        decision: fromEnum("sent_back"),
        decision_source: fromEnum("hook"),
        hook_event: fromEnum(pushback.hookEvent),
        ...(s !== undefined && getToolTelemetryFields(s.tool, getToolClass(s.tool), s.toolCatalog)),
        permission_mode: fromEnum(toExternalPermissionMode(permissionMode)),
      },
      {
        toolUseId: s?.toolUseId,
      },
      agentContext,
    );
    return true;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:3771330-3771828 placement
/**
 * 在钩子产出的消息中找本次调用的 hook_blocking_error，若来自 PostToolUse 或其失败钩子则记打回事件。
 */
function logHookPushbacks({ updates, tool, toolUseId, getPermissionMode, agentContext, toolCatalog }) {
  try {
    for (let { message } of updates) {
      if (
        message.type !== "attachment" ||
        message.attachment.type !== "hook_blocking_error" ||
        message.attachment.toolUseID !== toolUseId
      )
        continue;
      let { hookEvent } = message.attachment;
      if (hookEvent === "PostToolUse" || hookEvent === "PostToolUseFailure")
        return logHookPushbackEvent({
          pushback: {
            hookEvent: hookEvent === "PostToolUse" ? "post_tool_use" : "post_tool_use_failure",
            tool,
            toolUseId,
            toolCatalog,
          },
          permissionMode: getPermissionMode(),
          agentContext,
        });
    }
    return false;
  } catch (error) {
    logError(error);
    return false;
  }
}
//@ chunk-e6aww6q8.js:3771828-3771860 placement
/**
 * 工具决策遥测开关（tengu_snoopy_creek）。
 */
function isToolDecisionTelemetryOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TOOL_DECISION_REASONS, false);
}
//@ chunk-e6aww6q8.js:3771860-3772047 placement
function getToolTelemetryFields(tool, toolClass, toolCatalog) {
  let s;
  if (toolClass === "mcp") s = sanitizeToolNameWithMcpFlag(tool.name, true);
  else {
    let h = toolNameForTelemetry(toolCatalog.getAllBaseTools(), tool.name);
    s = h !== undefined ? sanitizeToolNameForAnalytics(h) : fromEnum(classifyToolNameKind(tool.name));
  }
  return {
    tool_class: fromEnum(toolClass),
    tool_name: s,
    ...toolSourceMetadata(tool.mcpInfo),
  };
}
//@ chunk-e6aww6q8.js:3772047-3772491 placement
/**
 * 同时发出 tengu_safety_event 与 OTel safety_event（附沙箱开关、违规数；OTel 中特定工具名归为 other_tool，分类器类别只在开启工具详情日志时带上）。
 */
function emitSafetyEvent(e, { toolUseId, sandboxViolationCount }, agentContext) {
  let h = SandboxManager.isSandboxingEnabled();
  logEvent("tengu_safety_event", {
    ...e,
    tool_use_id: sanitizeMarkName(toolUseId),
    sandbox_violation_count: sandboxViolationCount,
    sandbox_enabled: h,
  });
  logOTelEvent(
    "safety_event",
    {
      ...e,
      tool_name:
        e.tool_name !== undefined && EXTRA_READ_LIKE_TOOLS.includes(e.tool_name)
          ? fromEnum("other_tool")
          : e.tool_name,
      classifier_category: isToolDetailsLoggingEnabled()
        ? sanitizeRuleCategory(e.classifier_category)
        : undefined,
      tool_use_id: toolUseId,
      sandbox_violation_count:
        sandboxViolationCount === undefined ? undefined : String(sandboxViolationCount),
      sandbox_enabled: String(h),
    },
    agentContext,
  );
}
//@ chunk-e6aww6q8.js:3772491-3773224 placement
/**
 * 把权限原因码（bashMiss、subcommands、rule、mode、hook、classifier、safetyCheck 等）映射为安全事件类别；subcommands 取各子原因中优先级最高的。
 */
function categorizeReasonCode(reasonCode) {
  let index = reasonCode.indexOf(":");
  let kind = index === -1 ? reasonCode : reasonCode.slice(0, index);
  let detail = index === -1 ? "" : reasonCode.slice(index + 1);
  switch (kind) {
    case "bashMiss":
      return reasonCategoryMap.get(detail);
    case "subcommands": {
      if (detail === "") return;
      let h = new Set(splitSubcommandReason(reasonCode).map(categorizeReasonCode));
      return SAFETY_EVENT_CATEGORIES.find((y) => h.has(y));
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
var EXTRA_READ_LIKE_TOOLS = [];
var FILE_LIKE_TOOL_NAMES = new Set([
  FILE_READ_TOOL_NAME,
  FILE_EDIT_TOOL_NAME,
  FILE_WRITE_TOOL_NAME,
  NOTEBOOK_EDIT_TOOL_NAME,
  GLOB_TOOL_NAME,
  GREP_TOOL_NAME,
  ...EXTRA_READ_LIKE_TOOLS,
]);
var SHELL_LIKE_TOOL_NAMES = new Set([BASH_TOOL_NAME, MONITOR]);
//@ chunk-e6aww6q8.js:3773296-3773512 placement
function getToolClass(tool) {
  if (tool.mcpInfo !== undefined || tool.isMcp === true) return "mcp";
  if (SHELL_LIKE_TOOL_NAMES.has(tool.name)) return "bash";
  if (tool.name === POWERSHELL_TOOL_NAME) return "powershell";
  if (FILE_LIKE_TOOL_NAMES.has(tool.name)) return "file";
  if (tool.name === WEBFETCH || tool.name === WEBSEARCH) return "web";
  return "other";
}
//@ chunk-e6aww6q8.js:3773512-3773840 placement
/**
 * 递归去掉值为 undefined 且原对象中没有的键（数组保持索引）。
 */
function stripUndefinedFields(e, n) {
  let r = Array.isArray(e);
  if (!r && !isPlainDataObject(e)) return e;
  let h = Array.isArray(n) || isPlainDataObject(n) ? n : {};
  let y = Object.fromEntries(
    Object.entries(e)
      .filter(([key, value]) => value !== undefined || Object.hasOwn(h, key))
      .map(([key, value]) => [key, stripUndefinedFields(value, Reflect.get(h, key))]),
  );
  return r
    ? Object.defineProperties(
        Array.from(e, () => {
          return;
        }),
        Object.getOwnPropertyDescriptors(y),
      )
    : y;
}
//@ chunk-e6aww6q8.js:3773840-3773943 placement
function getHookOriginChain(e) {
  let { hookOrigin, hookCaller } = e;
  let s = hookCaller === undefined ? [] : [hookCaller];
  return hookOrigin !== undefined && hookOrigin.length > 0 ? hookOrigin : s;
}
//@ chunk-e6aww6q8.js:3773943-3774114 placement
function callerHasCatch(e) {
  let n = getHookOriginChain(e).at(-1) ?? "";
  let r = isRewrittenOrigin(n) ? n.of : n;
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === originPlugin(r));
  return typeof r === "string" || found === undefined || found.hasCatch(r.registration);
}
//@ chunk-e6aww6q8.js:3774157-3774374 placement
function isInputUnchanged(e, n, stripUndefinedFields = (s) => s) {
  try {
    return isDeepStrictEqual(n, stripUndefinedFields(e.input, n));
  } catch (error) {
    logForDebugging(
      `a plugin's own call holds an input that cannot be compared value for value, so it reads as rewritten beneath: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-e6aww6q8.js:3774374-3774412 placement
/**
 * 判断两组工具输入是否未变（忽略 undefined 字段再比一次）。
 */
var inputsUnchanged = (e, n) => isInputUnchanged(e, n) || isInputUnchanged(e, n, stripUndefinedFields);
//@ chunk-e6aww6q8.js:3774412-3774423 placement
var PLAIN_KESTREL_DEFAULT = true;
//@ chunk-e6aww6q8.js:3774423-3774468 placement
/**
 * 是否启用 tengu_plain_kestrel（默认开）。
 */
var isPlainKestrelOn = () =>
  getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_kestrel", PLAIN_KESTREL_DEFAULT) !== false;
//@ chunk-e6aww6q8.js:3774468-3774715 placement
function propagateLentModules(hookOrigin, n) {
  let r = hookOrigin === undefined ? hookOrigin : lentModulesByChain().get(hookOrigin);
  let s = new Map(hookOrigin?.map((y, S) => [y, r?.[S]]));
  let h = {
    until: Number.POSITIVE_INFINITY,
    isLent: false,
    isHeld: false,
  };
  if (r !== undefined)
    lentModulesByChain().set(
      n,
      n.map(
        (y) =>
          s.get(y) ?? {
            ...h,
            until: isRewrittenOrigin(y) ? (s.get(y.of)?.until ?? h.until) : h.until,
          },
      ),
    );
}
//@ chunk-e6aww6q8.js:3774715-3774990 placement
/**
 * 插件自身发起的调用到达底层时调用帧已变：重写钩子来源链并同步借出模块信息，记调试日志。
 */
function rebaseHookOrigin(e) {
  let { hookOrigin, hookCaller } = e;
  let hookOriginChain = getHookOriginChain(e);
  let last = hookOriginChain.at(-1);
  if (last === undefined || isRewrittenOrigin(last)) return hookOriginChain;
  let y = appendCallerFrame(hookOriginChain, rewrittenMarker(last));
  propagateLentModules(hookOrigin, y);
  logForDebugging(
    `plugin ${hookCaller}'s own call did not arrive at the bottom as it was raised: its calling frame is no longer the caller's (origin ${labeledOriginChain(y)})`,
  );
  return y;
}
//@ chunk-e6aww6q8.js:3774990-3775071 placement
/**
 * 输入变化时重设 hook 来源，否则原样返回。
 */
function rebaseOriginIfInputChanged(e, n, r) {
  return n === undefined || !isPlainKestrelOn() || inputsUnchanged(n, r)
    ? e
    : {
        ...e,
        hookOrigin: rebaseHookOrigin(e),
      };
}
//@ chunk-e6aww6q8.js:3775071-3775232 placement
function cloneCallInput(e) {
  try {
    return {
      input: clone(e),
    };
  } catch (error) {
    logForDebugging(
      `a plugin's own call holds an input that cannot be copied as it was raised: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return;
  }
}
//@ chunk-e6aww6q8.js:3775232-3775353 placement
function rebaseBatchHookOrigins(e, n, hookUpdatedInput) {
  let [s] = e;
  if (n === undefined || !isPlainKestrelOn() || inputsUnchanged(n, hookUpdatedInput) || s === undefined)
    return;
  let hookOrigin = rebaseHookOrigin(s);
  for (let S of e) S.hookOrigin = hookOrigin;
}
//@ chunk-e6aww6q8.js:3775353-3775711 placement
/**
 * 插件调用的输入无法复制时：调用方有 .catch 则放行；否则上报插件问题（只报一次）。
 */
function checkUncopyableCall(e, hookCaller) {
  try {
    if (callerHasCatch(e))
      return {
        input: undefined,
      };
    reportPluginProblem(
      hookCaller,
      "a call it made could not be copied, so a rewrite of that call beneath its hook, which carries no .catch, goes unmarked",
      "once",
    );
    return;
  } catch (error) {
    logForDebugging(
      `plugin ${hookCaller}'s own call could not be copied, and whether its caller carries a .catch could not be read: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return {
      input: undefined,
    };
  }
}
//@ chunk-e6aww6q8.js:3775711-3775790 placement
/**
 * 有 hook 调用方且开关打开时克隆输入，克隆失败走备选处理。
 */
function clonedHookInput(toolUseContext, n) {
  let hookCaller = getHookCaller(toolUseContext);
  return hookCaller !== undefined && isPlainKestrelOn()
    ? (cloneCallInput(n) ?? checkUncopyableCall(toolUseContext, hookCaller))
    : undefined;
}
export {
  isPlainKestrelOn,
  rebaseHookOrigin,
  pickReasonFromList,
  splitSubcommandReason,
  classifyToolNameKind,
  TOOL_NAME_KINDS,
  toolNameForTelemetry,
  clonedHookInput,
  rebaseOriginIfInputChanged,
  logToolSafetyEvent,
  logHookPushbacks,
  rebaseBatchHookOrigins,
  logToolDecision,
  toDecisionRecord,
  logHookPushbackEvent,
  inputsUnchanged,
};
