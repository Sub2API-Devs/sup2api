/**
 * types/permissions.ts
 *
 * 权限模式枚举（对外六种：default/acceptEdits/plan/auto/bypassPermissions/dontAsk，另有内部 bubble 与别名 manual）与 Shift+Tab 循环逻辑（切分混入）；也混入了协议 schema 的 ID 正则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/types/permissions.ts
 * pieces: chunk-ktpw8eqa.js (34), chunk-n4pvm0gt.js (1)
 * attribution: placement 34, fingerprint 1
 */
import { canCycleToBypassPermissions, canCycleToAuto } from "../utils/permissions/getNextPermissionMode.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ktpw8eqa.js:1247-1351 placement = EXTERNAL_PERMISSION_MODES (0.805)
/**
 * 权限模式枚举：EXTERNAL_PERMISSION_MODES = acceptEdits/auto/bypassPermissions/default/dontAsk/plan（316 把 auto 并入对外集合，旧版要 TRANSCRIPT_CLASSIFIER 才有），INTERNAL/PERMISSION_MODES 是其拷贝；"manual" 作为 default 的别名被接受。
 */
var EXTERNAL_PERMISSION_MODES = ["acceptEdits", "auto", "bypassPermissions", "default", "dontAsk", "plan"];
var INTERNAL_PERMISSION_MODES = [...EXTERNAL_PERMISSION_MODES];
var PERMISSION_MODES = INTERNAL_PERMISSION_MODES;
var PERMISSION_MODE_MANUAL_ALIAS = "manual";
//@ chunk-ktpw8eqa.js:1351-1398 placement
function normalizePermissionModeAlias(mode) {
  return mode === "manual" ? "default" : mode;
}
//@ chunk-ktpw8eqa.js:1398-1451 placement
function parsePermissionMode(mode) {
  let normalizedMode = normalizePermissionModeAlias(mode);
  return INTERNAL_PERMISSION_MODES.find((internalMode) => internalMode === normalizedMode);
}
//@ chunk-ktpw8eqa.js:1451-2963 placement
/**
 * 权限类型常量：设置模式失败的错误文字、MCP ask 工具上限与名字正则、熔断器特性表 CIRCUIT_BREAKER_TRAITS（每种 circuitBreaker 的 bypassImmune/waivableInBypass/classifierRouted/autoModeDeny/hostPersonOnly/localProjectionOnly/servedUnplaceable）。
 */
var UNRECOGNIZED_PERMISSION_MODE_ERROR; // deferred: uses EXTERNAL_PERMISSION_MODES of its import cycle while loading; runs once the cycle is complete
var MCP_ASK_FOR_TOOLS_MAX;
var MCP_ASK_FOR_TOOLS_NAME;
var CIRCUIT_BREAKER_TRAITS;
deferInit("chunk-ktpw8eqa.js:1451", () => {
  UNRECOGNIZED_PERMISSION_MODE_ERROR = `Cannot set permission mode: must be one of ${EXTERNAL_PERMISSION_MODES.join(", ")}`;
  MCP_ASK_FOR_TOOLS_MAX = 32;
  MCP_ASK_FOR_TOOLS_NAME = /^[A-Za-z0-9_-]{1,64}$/;
  CIRCUIT_BREAKER_TRAITS = {
    dangerousRemoval: {
      bypassImmune: true,
      waivableInBypass: true,
      classifierRouted: true,
      autoModeDeny: true,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    backgroundOperator: {
      bypassImmune: false,
      waivableInBypass: false,
      classifierRouted: true,
      autoModeDeny: false,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    suspiciousWindowsPath: {
      bypassImmune: false,
      waivableInBypass: false,
      classifierRouted: true,
      autoModeDeny: false,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    isolatePeerMachines: {
      bypassImmune: true,
      waivableInBypass: false,
      classifierRouted: false,
      autoModeDeny: false,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    restrictedMode: {
      bypassImmune: true,
      waivableInBypass: false,
      classifierRouted: false,
      autoModeDeny: false,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    outsideReadsBlocked: {
      bypassImmune: true,
      waivableInBypass: false,
      classifierRouted: false,
      autoModeDeny: false,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    claudeSettingsFile: {
      bypassImmune: false,
      waivableInBypass: false,
      classifierRouted: false,
      autoModeDeny: false,
      hostPersonOnly: true,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    internalHardDeny: {
      bypassImmune: false,
      waivableInBypass: false,
      classifierRouted: false,
      autoModeDeny: false,
      hostPersonOnly: false,
      localProjectionOnly: false,
      servedUnplaceable: true,
    },
    unfinishedCheck: {
      bypassImmune: true,
      waivableInBypass: false,
      classifierRouted: false,
      autoModeDeny: false,
      hostPersonOnly: true,
      localProjectionOnly: false,
      servedUnplaceable: false,
    },
    ...{},
    ...{},
  };
});
//@ chunk-ktpw8eqa.js:2963-3027 placement
/**
 * 原因（含 also）中是否有 bypass 下也不能放行的熔断器。
 */
function isBypassImmuneCircuitBreaker(decisionReason) {
  return circuitBreakersOf(decisionReason).some(
    (breaker) => CIRCUIT_BREAKER_TRAITS[breaker]?.bypassImmune === true,
  );
}
//@ chunk-ktpw8eqa.js:3027-3130 placement
/**
 * 是否有 bypass 下也不能放行、且不可豁免的熔断器。
 */
function isUnwaivableBypassImmuneCircuitBreaker(decisionReason) {
  return circuitBreakersOf(decisionReason).some((breaker) => {
    let traits = CIRCUIT_BREAKER_TRAITS[breaker];
    return traits?.bypassImmune === true && !traits.waivableInBypass;
  });
}
//@ chunk-ktpw8eqa.js:3130-3200 placement
/**
 * 是否有“服务端无法放置”的熔断器。
 */
function isServedUnplaceableCircuitBreaker(decisionReason) {
  return circuitBreakersOf(decisionReason).some(
    (breaker) => CIRCUIT_BREAKER_TRAITS[breaker]?.servedUnplaceable === true,
  );
}
//@ chunk-ktpw8eqa.js:3200-3287 placement
/**
 * 取出 safetyCheck 涉及的全部熔断器（circuitBreaker 与 also）。
 */
function circuitBreakersOf(decisionReason) {
  return [
    ...(decisionReason.circuitBreaker !== undefined ? [decisionReason.circuitBreaker] : []),
    ...(decisionReason.also ?? []),
  ];
}
//@ chunk-ktpw8eqa.js:3287-3381 placement
/**
 * 该 safetyCheck 的熔断器是否允许交分类器裁决（classifierRouted）。
 */
function isClassifierRoutedCircuitBreaker(decisionReason) {
  return (
    decisionReason.circuitBreaker !== undefined &&
    CIRCUIT_BREAKER_TRAITS[decisionReason.circuitBreaker]?.classifierRouted === true
  );
}
//@ chunk-ktpw8eqa.js:3381-3491 placement
/**
 * also 列表中是否带必须由人回答的熔断器（bypassImmune 且不交分类器）。
 */
function carriesPersonsAsk(decisionReason) {
  return (decisionReason.also ?? []).some((breaker) => {
    let traits = CIRCUIT_BREAKER_TRAITS[breaker];
    return traits?.bypassImmune === true && !traits.classifierRouted;
  });
}
//@ chunk-ktpw8eqa.js:3491-3582 placement
/**
 * 该 safetyCheck 的熔断器在 auto 模式下是否直接拒绝。
 */
function isAutoModeDenyCircuitBreaker(decisionReason) {
  return (
    decisionReason.circuitBreaker !== undefined &&
    CIRCUIT_BREAKER_TRAITS[decisionReason.circuitBreaker]?.autoModeDeny === true
  );
}
//@ chunk-ktpw8eqa.js:3582-3648 placement
/**
 * 是否有只能由宿主侧人工回答的熔断器。
 */
function isHostPersonOnlyCircuitBreaker(decisionReason) {
  return circuitBreakersOf(decisionReason).some(
    (breaker) => CIRCUIT_BREAKER_TRAITS[breaker]?.hostPersonOnly === true,
  );
}
//@ chunk-ktpw8eqa.js:3648-3720 placement
/**
 * 是否有只在本地投影显示的熔断器。
 */
function isLocalProjectionOnlyCircuitBreaker(decisionReason) {
  return circuitBreakersOf(decisionReason).some(
    (breaker) => CIRCUIT_BREAKER_TRAITS[breaker]?.localProjectionOnly === true,
  );
}
//@ chunk-ktpw8eqa.js:3720-3772 placement
function isPreAskDeny(decisionReason) {
  return decisionReason.decideLocation === "pre-ask";
}
//@ chunk-ktpw8eqa.js:3772-3834 placement
/**
 * 是否算作可记录的拒绝：非 allow、不是同一结果对象、不是输入无效的拒绝。
 */
function isRecordableDenial(decision, allowDecision) {
  return decision.behavior !== "allow" && decision !== allowDecision && !isInvalidInputDeny(decision);
}
//@ chunk-ktpw8eqa.js:3834-3898 placement
/**
 * 是否为“输入无效”导致的拒绝（behavior deny 且 invalidInput）。
 */
function isInvalidInputDeny(decision) {
  return decision.behavior === "deny" && decision.invalidInput === true;
}
//@ chunk-ktpw8eqa.js:3898-4051 placement = serializeDecisionReason (1)
/**
 * decisionReason.type 的全部取值表：rule、mode、subcommandResults、permissionPromptTool、hook、asyncAgent、sandboxOverride、workingDir、safetyCheck、classifier、other。
 */
var PERMISSION_DECISION_REASON_TYPES = [
  "rule",
  "mode",
  "subcommandResults",
  "permissionPromptTool",
  "hook",
  "asyncAgent",
  "sandboxOverride",
  "workingDir",
  "safetyCheck",
  "classifier",
  "other",
];
//@ chunk-ktpw8eqa.js:4051-5889 placement
/**
 * 权限原因文字常量：沙箱/只读自动放行原因、服务端分类器持有、工作目录外读写被阻挡（blockReadsOutsideWorkingDirectories / blockWritesOutsideWorkingDirectories）、--restricted 等；以及 INLINE_CODE_FLAGS（python -c、node -e 等内联代码 flag 表）。
 */
var PERMISSION_REQUEST_TOOL_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SANDBOX_AUTO_ALLOW_REASON;
var READ_ONLY_AUTO_ALLOW_REASON;
var POWERSHELL_READ_ONLY_ALLOW_REASON;
var POWERSHELL_COMPOUND_READ_ONLY_PART_REASON;
var SERVER_HOLDS_SHELL_ALLOW_REASON;
var TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON;
var OUTSIDE_WORKING_DIRECTORIES_ASK_REASON;
var RESTRICTED_MODE_DENY_REASON;
var OUTSIDE_READS_BLOCKED_DENY_REASON;
var OUTSIDE_WRITES_BLOCKED_DENY_REASON;
var SETTINGS_WRITES_BLOCKED_DENY_REASON;
var NO_PROJECT_DIRECTORY_DENY_REASON;
var NO_CONFIG_HOME_DENY_REASON;
var INLINE_CODE_FLAGS;
deferInit("chunk-ktpw8eqa.js:4051", () => {
  PERMISSION_REQUEST_TOOL_KINDS = ["browser"];
  SANDBOX_AUTO_ALLOW_REASON = "Auto-allowed with sandbox (autoAllowBashIfSandboxed enabled)";
  READ_ONLY_AUTO_ALLOW_REASON = "Read-only command is allowed";
  POWERSHELL_READ_ONLY_ALLOW_REASON = "Command is read-only and safe to execute";
  POWERSHELL_COMPOUND_READ_ONLY_PART_REASON =
    "All pipeline commands are individually allowed, some only by the read-only allowlist";
  SERVER_HOLDS_SHELL_ALLOW_REASON = "Auto mode held this command for the server-side classifier to review";
  TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON =
    "Auto mode reviews this action before it runs in the cloud environment";
  OUTSIDE_WORKING_DIRECTORIES_ASK_REASON = "Path is outside allowed working directories";
  RESTRICTED_MODE_DENY_REASON = "--restricted: path outside the working directory";
  OUTSIDE_READS_BLOCKED_DENY_REASON =
    "Reads outside the working directories are blocked (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.";
  OUTSIDE_WRITES_BLOCKED_DENY_REASON =
    "Writes outside the working directories are blocked (permissions.blockWritesOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.";
  SETTINGS_WRITES_BLOCKED_DENY_REASON =
    "Writes to Claude Code settings files are blocked while permissions.blockWritesOutsideWorkingDirectories is on, because a settings file can lift that block. While a managed settings folder cannot be resolved, any .json file counts as one.";
  NO_PROJECT_DIRECTORY_DENY_REASON = "permission check needs a working directory; the session has none";
  NO_CONFIG_HOME_DENY_REASON = "permission check needs a config or temp path; the session has none";
  INLINE_CODE_FLAGS = new Map([
    ["python", new Set(["-c"])],
    ["node", new Set(["-e", "--eval", "-p", "--print"])],
    ["nodejs", new Set(["-e", "--eval", "-p", "--print"])],
    ["bun", new Set(["-e", "--eval", "-p", "--print"])],
    ["perl", new Set(["-e", "-E"])],
    ["ruby", new Set(["-e"])],
    ["php", new Set(["-r"])],
    ["bash", new Set(["-c"])],
    ["sh", new Set(["-c"])],
    ["zsh", new Set(["-c"])],
    ["dash", new Set(["-c"])],
    ["ksh", new Set(["-c"])],
    ["lua", new Set(["-e"])],
    ["luajit", new Set(["-e"])],
    ["tsx", new Set(["-e", "--eval", "-p", "--print"])],
    ["deno", new Set(["eval"])],
    ["Rscript", new Set(["-e"])],
    ["julia", new Set(["-e", "-E"])],
    ["osascript", new Set(["-e"])],
  ]);
});
//@ chunk-ktpw8eqa.js:5889-5977 placement
/**
 * 原因是否为 outsideReadsBlocked 熔断的 safetyCheck。
 */
function isOutsideReadsBlockedAsk(decisionReason) {
  return decisionReason?.type === "safetyCheck" && decisionReason.circuitBreaker === "outsideReadsBlocked";
}
//@ chunk-ktpw8eqa.js:5977-6074 placement
/**
 * 在开启读阻挡时，sandboxOverride 原因需要特殊处理的判定。
 */
function isSandboxOverrideUnderReadBlock(decisionReason, toolPermissionContext) {
  return (
    decisionReason?.type === "sandboxOverride" &&
    toolPermissionContext.blockReadsOutsideWorkingDirectories === true
  );
}
//@ chunk-ktpw8eqa.js:6074-6381 placement
/**
 * 读阻挡下“路径在运行时才计算、无法检查”的 ask 结果（safetyCheck、不可交分类器、outsideReadsBlocked）。
 */
function outsideReadsRuntimePathAsk(command) {
  let reasonText = `${command} names a path that is computed at run time, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`;
  return {
    behavior: "ask",
    message: reasonText,
    decisionReason: {
      type: "safetyCheck",
      reason: reasonText,
      classifierApprovable: false,
      circuitBreaker: "outsideReadsBlocked",
    },
  };
}
//@ chunk-ktpw8eqa.js:6381-6693 placement
/**
 * 读阻挡下“命令太复杂、解析器无法分析”的 ask 结果，不带建议。
 */
function outsideReadsTooComplexAsk(reason) {
  let reasonText = `${reason}; under the read block (permissions.blockReadsOutsideWorkingDirectories) a command the shell parser cannot analyze asks the person`;
  return {
    behavior: "ask",
    message: reasonText,
    decisionReason: {
      type: "safetyCheck",
      reason: reasonText,
      classifierApprovable: false,
      circuitBreaker: "outsideReadsBlocked",
    },
    suggestions: [],
  };
}
//@ chunk-ktpw8eqa.js:6693-7185 placement
/**
 * 读阻挡下 sed 脚本不在白名单、可能读写任意文件时的 ask 结果。
 */
function outsideReadsSedScriptAsk() {
  return {
    behavior: "ask",
    message:
      "This sed script is not on the allowlist and can read or write any file, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This sed script is not on the allowlist and can read or write any file, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)",
      classifierApprovable: false,
      circuitBreaker: "outsideReadsBlocked",
    },
  };
}
//@ chunk-ktpw8eqa.js:7185-8208 placement
/**
 * 归类为“分类器不可用”的原因集合，用于给消息加 “Blocked: ” 前缀。
 */
var BASH_COMMAND_CLAMP_DENY_REASON; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BASH_COMMAND_CLAMP_CRASH_REASON;
var CLASSIFIER_UNAVAILABLE_REASON;
var AUTO_MODE_UNAVAILABLE_STOP_REASON;
var CLASSIFIER_SWITCHED_OFF_KIND;
var CLASSIFIER_PARSE_FAILURE_REASON_STEM;
var CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON;
var CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT;
var HOOK_REWROTE_INPUT_REVIEW_REASON;
var CLASSIFIER_TOO_LONG_COMPACTING_REASON;
var SERVER_CLASSIFIER_NO_EXPLANATION_REASON;
var CLASSIFIER_UNAVAILABLE_REASONS;
deferInit("chunk-ktpw8eqa.js:7185", () => {
  BASH_COMMAND_CLAMP_DENY_REASON = "bashCommandClamp: no clamp rule matches this command";
  BASH_COMMAND_CLAMP_CRASH_REASON = "bashCommandClamp fail-closed: permission check crashed";
  CLASSIFIER_UNAVAILABLE_REASON = "Classifier unavailable";
  AUTO_MODE_UNAVAILABLE_STOP_REASON =
    "Auto mode unavailable \u2014 stopped after repeated responses with no safety verdict";
  CLASSIFIER_SWITCHED_OFF_KIND = "classifier_switched_off";
  CLASSIFIER_PARSE_FAILURE_REASON_STEM =
    "Auto mode could not evaluate this action and is blocking it for safety";
  CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON =
    "Auto mode classifier transcript exceeded context window \u2014 falling back to manual approval (try /compact to reduce conversation size)";
  CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT =
    "The conversation is too long for auto mode's check, so this needs your approval. Run /compact to shorten the conversation.";
  HOOK_REWROTE_INPUT_REVIEW_REASON =
    "A hook or plugin changed (or may have changed) a call in this response after auto mode reviewed it, so auto mode could not check what would run";
  CLASSIFIER_TOO_LONG_COMPACTING_REASON =
    "Auto mode classifier transcript exceeded context window; will try to compact the conversation before the next request";
  SERVER_CLASSIFIER_NO_EXPLANATION_REASON =
    "The server-side auto mode classifier judged this action dangerous (it gave no explanation)";
  CLASSIFIER_UNAVAILABLE_REASONS = new Set([
    CLASSIFIER_UNAVAILABLE_REASON,
    AUTO_MODE_UNAVAILABLE_STOP_REASON,
    CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
    CLASSIFIER_TOO_LONG_COMPACTING_REASON,
  ]);
});
//@ chunk-ktpw8eqa.js:8208-8258 placement
function classifierWrittenReason(reason) {
  return CLASSIFIER_UNAVAILABLE_REASONS.has(reason) ? `Blocked: ${reason}` : reason;
}
//@ chunk-ktpw8eqa.js:8258-8368 placement
/**
 * 分类器拒绝的种类：unavailable（不可用或反复无结论停止）、no_verdict、block。
 */
function classifierDenyKind(decisionReason) {
  if (
    decisionReason.reason === CLASSIFIER_UNAVAILABLE_REASON ||
    decisionReason.reason === AUTO_MODE_UNAVAILABLE_STOP_REASON
  )
    return "unavailable";
  return decisionReason.noVerdict ? "no_verdict" : "block";
}
//@ chunk-ktpw8eqa.js:8368-8572 placement
/**
 * 记忆暂停相关原因文字与对外原因代码表 DECISION_REASON_CODES（classifier_transcript_too_long、outside_reads_blocked、memory_paused）。
 */
var MEMORY_PAUSED_MESSAGE = "Memory is paused for this session; only the user can turn it back on.";
var MEMORY_TOGGLED_OFF_REASON = "memory access blocked by /pause-memory";
var DECISION_REASON_CODES = ["classifier_transcript_too_long", "outside_reads_blocked", "memory_paused"];
//@ chunk-ktpw8eqa.js:8572-8654 placement
/**
 * 决定原因在线上传输时的类型：subcommandResults 可带 typeOnWire 覆盖。
 */
function decisionReasonTypeOnWire(decisionReason) {
  return decisionReason?.type === "subcommandResults"
    ? (decisionReason.typeOnWire ?? decisionReason.type)
    : decisionReason?.type;
}
//@ chunk-ktpw8eqa.js:8654-9152 placement
/**
 * 把决定原因映射为对外原因代码（transcript 过长、读阻挡、记忆暂停）；subcommandResults 中读阻挡优先。
 */
function decisionReasonCode(decisionReason) {
  switch (decisionReason?.type) {
    case "classifier":
      return decisionReason.noVerdict === true &&
        (decisionReason.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON ||
          decisionReason.reason === CLASSIFIER_TOO_LONG_COMPACTING_REASON)
        ? "classifier_transcript_too_long"
        : undefined;
    case "other":
    case "safetyCheck":
      switch (decisionReason.reason) {
        case CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON:
          return "classifier_transcript_too_long";
        case OUTSIDE_READS_BLOCKED_DENY_REASON:
          return "outside_reads_blocked";
        case MEMORY_PAUSED_MESSAGE:
        case MEMORY_TOGGLED_OFF_REASON:
          return "memory_paused";
        default:
          return;
      }
    case "subcommandResults": {
      let firstCode;
      for (let reason of decisionReason.reasons.values()) {
        let code = decisionReasonCode(reason.decisionReason);
        if (code === "outside_reads_blocked") return code;
        firstCode ??= code;
      }
      return firstCode;
    }
    default:
      return;
  }
}
//@ chunk-ktpw8eqa.js:9152-9774 placement
/**
 * headless/无提示场景的原因常量：钩子改写输入触发 ask、需要交互但无提示、无审批表面、无法确认是人发起本步等，均为 asyncAgent 类型。
 */
var HOOK_REWRITTEN_INPUT_ASK_REASON = "ask rule on hook-rewritten input";
var HOOK_REWRITE_HEADLESS_DENY_REASON = {
  type: "asyncAgent",
  reason: HOOK_REWRITTEN_INPUT_ASK_REASON,
};
var HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON = {
  type: "asyncAgent",
  reason: "tool requires user interaction; no prompt available in headless mode",
};
var NO_APPROVAL_SURFACE_REASON =
  "no approval surface in this session; permission request denied automatically";
var NO_APPROVAL_SURFACE_DENY_REASON = {
  type: "asyncAgent",
  reason: NO_APPROVAL_SURFACE_REASON,
};
var NO_PROMPT_SURFACE_REASON =
  "nobody can be asked in this headless run; a call that needs a person's approval was denied automatically";
var NO_PROMPT_SURFACE_DENY_REASON = {
  type: "asyncAgent",
  reason: NO_PROMPT_SURFACE_REASON,
};
var NO_KNOWN_PERSON_STARTED_THE_TURN_REASON =
  "This action needs a person's approval. Nobody was asked, because Claude can't tell that a person in this session started this step. Claude may still finish it another way.";
//@ chunk-ktpw8eqa.js:9774-9972 placement
/**
 * 把 ask 结果压缩成拒绝里附带的 ask 摘要：decisionReason、matchedAskRule、hooksMayRefuse。
 */
function refusedAskOf(decision) {
  return {
    ...(decision.decisionReason !== undefined && {
      decisionReason: decision.decisionReason,
    }),
    ...(decision.matchedAskRule !== undefined && {
      matchedAskRule: decision.matchedAskRule,
    }),
    ...(decision.hooksMayRefuse === true && {
      hooksMayRefuse: true,
    }),
  };
}
//@ chunk-ktpw8eqa.js:9972-10072 placement
/**
 * 工具能否自行了结未询问的问题：结果 personOnly、工具实现 settleUnaskedQuestion，且不是钩子要求的 ask 地板。
 */
function toolMaySettleUnaskedQuestion(tool, permissionState, context) {
  return (
    permissionState.personOnly === true &&
    tool.settleUnaskedQuestion !== undefined &&
    context.hookAskFloor !== true
  );
}
//@ chunk-ktpw8eqa.js:10072-10172 placement
/**
 * 是否必须留给人：ask 要求用户交互，或工具 owesPersonOnlyAsk 返回真。
 */
function mustBeLeftToAPerson(tool, permissionState, input, context, decisionContext) {
  return (
    tool.askRequiresUserInteraction === true ||
    permissionState.owesPersonOnlyAsk?.(input, context, decisionContext) === true
  );
}
//@ chunk-ktpw8eqa.js:10172-11027 placement
/**
 * --permission-prompt-tool / SDK canUseTool 通道的拒绝原因常量：MCP 工具需交互、MCP 服务器名冒充 claude.ai 连接器、流关闭、结果不合 schema、请求失败/中止、提示工具断开等。
 */
var PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON = {
  type: "other",
  reason: "MCP tool requires user interaction; not supported via --permission-prompt-tool",
};
var PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON = {
  type: "other",
  reason:
    "This MCP server's name starts like a claude.ai connector's, so --permission-prompt-tool cannot approve its tools. To use them here, the server needs another name.",
};
var CAN_USE_TOOL_STREAM_CLOSED_REASON = "tool permission stream closed before response received";
var CAN_USE_TOOL_INVALID_RESULT_REASON = "canUseTool returned a schema-invalid permission result";
var CAN_USE_TOOL_REQUEST_FAILED_REASON = "tool permission request failed";
var CAN_USE_TOOL_ABORTED_REASON = "tool permission request aborted";
var CANCELLED_AT_CLASSIFIER_NOTICE_REASON = "Cancelled at the classifier billing notice";
var CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON = {
  type: "other",
  reason: CAN_USE_TOOL_STREAM_CLOSED_REASON,
};
var CAN_USE_TOOL_INVALID_RESULT_DENY_REASON = {
  type: "other",
  reason: CAN_USE_TOOL_INVALID_RESULT_REASON,
};
var CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON = "permission prompt tool no longer connected";
var CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON = {
  type: "other",
  reason: CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON,
};
var CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON =
  "permission prompt tool is on server remote-browser under its mode floor";
var CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON = {
  type: "other",
  reason: CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON,
};
var CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON = {
  type: "other",
  reason: CAN_USE_TOOL_REQUEST_FAILED_REASON,
};
var CAN_USE_TOOL_ABORTED_DENY_REASON = {
  type: "other",
  reason: CAN_USE_TOOL_ABORTED_REASON,
};
//@ chunk-n4pvm0gt.js:603-903 fingerprint = EXTERNAL_PERMISSION_MODES (0.908)
/**
 * Shift+Tab 循环顺序：default→acceptEdits→plan→bypassPermissions（可用时）→auto（可用时）→default；bypassPermissions→auto 或 default；dontAsk、auto 及其他→default。316 已去掉旧版 ant 用户从 default 直接跳 bypass/auto 的分支。
 */
function getNextPermissionMode_2(context, teamContext) {
  switch (context.mode) {
    case "default":
      return "acceptEdits";
    case "acceptEdits":
      return "plan";
    case "plan":
      if (canCycleToBypassPermissions(context)) return "bypassPermissions";
      if (canCycleToAuto(context)) return "auto";
      return "default";
    case "bypassPermissions":
      if (canCycleToAuto(context)) return "auto";
      return "default";
    case "dontAsk":
      return "default";
    default:
      return "default";
  }
}
export {
  parsePermissionMode,
  SERVER_CLASSIFIER_NO_EXPLANATION_REASON,
  CLASSIFIER_SWITCHED_OFF_KIND,
  PERMISSION_DECISION_REASON_TYPES,
  DECISION_REASON_CODES,
  PERMISSION_REQUEST_TOOL_KINDS,
  MCP_ASK_FOR_TOOLS_NAME,
  MCP_ASK_FOR_TOOLS_MAX,
  CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
  CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT,
  isClassifierRoutedCircuitBreaker,
  isAutoModeDenyCircuitBreaker,
  SANDBOX_AUTO_ALLOW_REASON,
  READ_ONLY_AUTO_ALLOW_REASON,
  POWERSHELL_READ_ONLY_ALLOW_REASON,
  POWERSHELL_COMPOUND_READ_ONLY_PART_REASON,
  HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON,
  HOOK_REWRITE_HEADLESS_DENY_REASON,
  mustBeLeftToAPerson,
  refusedAskOf,
  toolMaySettleUnaskedQuestion,
  carriesPersonsAsk,
  isLocalProjectionOnlyCircuitBreaker,
  isSandboxOverrideUnderReadBlock,
  SERVER_HOLDS_SHELL_ALLOW_REASON,
  TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON,
  CANCELLED_AT_CLASSIFIER_NOTICE_REASON,
  CLASSIFIER_UNAVAILABLE_REASON,
  classifierWrittenReason,
  CLASSIFIER_TOO_LONG_COMPACTING_REASON,
  HOOK_REWROTE_INPUT_REVIEW_REASON,
  AUTO_MODE_UNAVAILABLE_STOP_REASON,
  NO_PROJECT_DIRECTORY_DENY_REASON,
  NO_CONFIG_HOME_DENY_REASON,
  isUnwaivableBypassImmuneCircuitBreaker,
  isBypassImmuneCircuitBreaker,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
  CAN_USE_TOOL_INVALID_RESULT_DENY_REASON,
  CAN_USE_TOOL_ABORTED_DENY_REASON,
  CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON,
  normalizePermissionModeAlias,
  PERMISSION_MODES,
  MEMORY_TOGGLED_OFF_REASON,
  OUTSIDE_WRITES_BLOCKED_DENY_REASON,
  SETTINGS_WRITES_BLOCKED_DENY_REASON,
  RESTRICTED_MODE_DENY_REASON,
  OUTSIDE_WORKING_DIRECTORIES_ASK_REASON,
  getNextPermissionMode_2,
  EXTERNAL_PERMISSION_MODES,
  UNRECOGNIZED_PERMISSION_MODE_ERROR,
  CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON,
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON,
  PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON,
  PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON,
  NO_PROMPT_SURFACE_REASON,
  isOutsideReadsBlockedAsk,
  CAN_USE_TOOL_STREAM_CLOSED_REASON,
  CAN_USE_TOOL_INVALID_RESULT_REASON,
  CAN_USE_TOOL_REQUEST_FAILED_REASON,
  CAN_USE_TOOL_ABORTED_REASON,
  HOOK_REWRITTEN_INPUT_ASK_REASON,
  NO_APPROVAL_SURFACE_REASON,
  isRecordableDenial,
  classifierDenyKind,
  isHostPersonOnlyCircuitBreaker,
  PERMISSION_MODE_MANUAL_ALIAS,
  BASH_COMMAND_CLAMP_DENY_REASON,
  BASH_COMMAND_CLAMP_CRASH_REASON,
  INLINE_CODE_FLAGS,
  outsideReadsRuntimePathAsk,
  outsideReadsTooComplexAsk,
  outsideReadsSedScriptAsk,
  MEMORY_PAUSED_MESSAGE,
  NO_APPROVAL_SURFACE_DENY_REASON,
  NO_PROMPT_SURFACE_DENY_REASON,
  decisionReasonCode,
  decisionReasonTypeOnWire,
  NO_KNOWN_PERSON_STARTED_THE_TURN_REASON,
  isInvalidInputDeny,
  CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON,
  CIRCUIT_BREAKER_TRAITS,
  CLASSIFIER_PARSE_FAILURE_REASON_STEM,
  isServedUnplaceableCircuitBreaker,
  isPreAskDeny,
  CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON,
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON,
};
