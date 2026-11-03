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

/**
 * 权限模式枚举：EXTERNAL_PERMISSION_MODES = acceptEdits/auto/bypassPermissions/default/dontAsk/plan（316 把 auto 并入对外集合，旧版要 TRANSCRIPT_CLASSIFIER 才有），INTERNAL/PERMISSION_MODES 是其拷贝；"manual" 作为 default 的别名被接受。
 */
//@ chunk-ktpw8eqa.js:1247-1351 placement = EXTERNAL_PERMISSION_MODES (0.805)
var EXTERNAL_PERMISSION_MODES = ["acceptEdits", "auto", "bypassPermissions", "default", "dontAsk", "plan"],
  INTERNAL_PERMISSION_MODES = [...EXTERNAL_PERMISSION_MODES],
  PERMISSION_MODES = INTERNAL_PERMISSION_MODES,
  PERMISSION_MODE_MANUAL_ALIAS = "manual";
//@ chunk-ktpw8eqa.js:1351-1398 placement
function normalizePermissionModeAlias(e) {
  return e === "manual" ? "default" : e;
}
//@ chunk-ktpw8eqa.js:1398-1451 placement
function parsePermissionMode(e) {
  let o = normalizePermissionModeAlias(e);
  return INTERNAL_PERMISSION_MODES.find((s) => s === o);
}
/**
 * 权限类型常量：设置模式失败的错误文字、MCP ask 工具上限与名字正则、熔断器特性表 CIRCUIT_BREAKER_TRAITS（每种 circuitBreaker 的 bypassImmune/waivableInBypass/classifierRouted/autoModeDeny/hostPersonOnly/localProjectionOnly/servedUnplaceable）。
 */
//@ chunk-ktpw8eqa.js:1451-2963 placement
var UNRECOGNIZED_PERMISSION_MODE_ERROR = `Cannot set permission mode: must be one of ${EXTERNAL_PERMISSION_MODES.join(", ")}`,
  MCP_ASK_FOR_TOOLS_MAX = 32,
  MCP_ASK_FOR_TOOLS_NAME = /^[A-Za-z0-9_-]{1,64}$/,
  CIRCUIT_BREAKER_TRAITS = {
    dangerousRemoval: {
      bypassImmune: !0,
      waivableInBypass: !0,
      classifierRouted: !0,
      autoModeDeny: !0,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    backgroundOperator: {
      bypassImmune: !1,
      waivableInBypass: !1,
      classifierRouted: !0,
      autoModeDeny: !1,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    suspiciousWindowsPath: {
      bypassImmune: !1,
      waivableInBypass: !1,
      classifierRouted: !0,
      autoModeDeny: !1,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    isolatePeerMachines: {
      bypassImmune: !0,
      waivableInBypass: !1,
      classifierRouted: !1,
      autoModeDeny: !1,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    restrictedMode: {
      bypassImmune: !0,
      waivableInBypass: !1,
      classifierRouted: !1,
      autoModeDeny: !1,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    outsideReadsBlocked: {
      bypassImmune: !0,
      waivableInBypass: !1,
      classifierRouted: !1,
      autoModeDeny: !1,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    claudeSettingsFile: {
      bypassImmune: !1,
      waivableInBypass: !1,
      classifierRouted: !1,
      autoModeDeny: !1,
      hostPersonOnly: !0,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    internalHardDeny: {
      bypassImmune: !1,
      waivableInBypass: !1,
      classifierRouted: !1,
      autoModeDeny: !1,
      hostPersonOnly: !1,
      localProjectionOnly: !1,
      servedUnplaceable: !0,
    },
    unfinishedCheck: {
      bypassImmune: !0,
      waivableInBypass: !1,
      classifierRouted: !1,
      autoModeDeny: !1,
      hostPersonOnly: !0,
      localProjectionOnly: !1,
      servedUnplaceable: !1,
    },
    ...{},
    ...{},
  };
/**
 * 原因（含 also）中是否有 bypass 下也不能放行的熔断器。
 */
//@ chunk-ktpw8eqa.js:2963-3027 placement
function isBypassImmuneCircuitBreaker(e) {
  return d(e).some((o) => CIRCUIT_BREAKER_TRAITS[o]?.bypassImmune === !0);
}
/**
 * 是否有 bypass 下也不能放行、且不可豁免的熔断器。
 */
//@ chunk-ktpw8eqa.js:3027-3130 placement
function isUnwaivableBypassImmuneCircuitBreaker(e) {
  return d(e).some((o) => {
    let s = CIRCUIT_BREAKER_TRAITS[o];
    return s?.bypassImmune === !0 && !s.waivableInBypass;
  });
}
/**
 * 是否有“服务端无法放置”的熔断器。
 */
//@ chunk-ktpw8eqa.js:3130-3200 placement
function isServedUnplaceableCircuitBreaker(e) {
  return d(e).some((o) => CIRCUIT_BREAKER_TRAITS[o]?.servedUnplaceable === !0);
}
//@ chunk-ktpw8eqa.js:3200-3287 placement
function d(e) {
  return [...(e.circuitBreaker !== void 0 ? [e.circuitBreaker] : []), ...(e.also ?? [])];
}
/**
 * 该 safetyCheck 的熔断器是否允许交分类器裁决（classifierRouted）。
 */
//@ chunk-ktpw8eqa.js:3287-3381 placement
function isClassifierRoutedCircuitBreaker(e) {
  return e.circuitBreaker !== void 0 && CIRCUIT_BREAKER_TRAITS[e.circuitBreaker]?.classifierRouted === !0;
}
/**
 * also 列表中是否带必须由人回答的熔断器（bypassImmune 且不交分类器）。
 */
//@ chunk-ktpw8eqa.js:3381-3491 placement
function carriesPersonsAsk(e) {
  return (e.also ?? []).some((o) => {
    let s = CIRCUIT_BREAKER_TRAITS[o];
    return s?.bypassImmune === !0 && !s.classifierRouted;
  });
}
/**
 * 该 safetyCheck 的熔断器在 auto 模式下是否直接拒绝。
 */
//@ chunk-ktpw8eqa.js:3491-3582 placement
function isAutoModeDenyCircuitBreaker(e) {
  return e.circuitBreaker !== void 0 && CIRCUIT_BREAKER_TRAITS[e.circuitBreaker]?.autoModeDeny === !0;
}
/**
 * 是否有只能由宿主侧人工回答的熔断器。
 */
//@ chunk-ktpw8eqa.js:3582-3648 placement
function isHostPersonOnlyCircuitBreaker(e) {
  return d(e).some((o) => CIRCUIT_BREAKER_TRAITS[o]?.hostPersonOnly === !0);
}
/**
 * 是否有只在本地投影显示的熔断器。
 */
//@ chunk-ktpw8eqa.js:3648-3720 placement
function isLocalProjectionOnlyCircuitBreaker(e) {
  return d(e).some((o) => CIRCUIT_BREAKER_TRAITS[o]?.localProjectionOnly === !0);
}
//@ chunk-ktpw8eqa.js:3720-3772 placement
function isPreAskDeny(e) {
  return e.decideLocation === "pre-ask";
}
/**
 * 是否算作可记录的拒绝：非 allow、不是同一结果对象、不是输入无效的拒绝。
 */
//@ chunk-ktpw8eqa.js:3772-3834 placement
function isRecordableDenial(e, o) {
  return e.behavior !== "allow" && e !== o && !isInvalidInputDeny(e);
}
/**
 * 是否为“输入无效”导致的拒绝（behavior deny 且 invalidInput）。
 */
//@ chunk-ktpw8eqa.js:3834-3898 placement
function isInvalidInputDeny(e) {
  return e.behavior === "deny" && e.invalidInput === !0;
}
/**
 * decisionReason.type 的全部取值表：rule、mode、subcommandResults、permissionPromptTool、hook、asyncAgent、sandboxOverride、workingDir、safetyCheck、classifier、other。
 */
//@ chunk-ktpw8eqa.js:3898-4051 placement = serializeDecisionReason (1)
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
/**
 * 权限原因文字常量：沙箱/只读自动放行原因、服务端分类器持有、工作目录外读写被阻挡（blockReadsOutsideWorkingDirectories / blockWritesOutsideWorkingDirectories）、--restricted 等；以及 INLINE_CODE_FLAGS（python -c、node -e 等内联代码 flag 表）。
 */
//@ chunk-ktpw8eqa.js:4051-5889 placement
var PERMISSION_REQUEST_TOOL_KINDS = ["browser"],
  SANDBOX_AUTO_ALLOW_REASON = "Auto-allowed with sandbox (autoAllowBashIfSandboxed enabled)",
  READ_ONLY_AUTO_ALLOW_REASON = "Read-only command is allowed",
  POWERSHELL_READ_ONLY_ALLOW_REASON = "Command is read-only and safe to execute",
  POWERSHELL_COMPOUND_READ_ONLY_PART_REASON =
    "All pipeline commands are individually allowed, some only by the read-only allowlist",
  SERVER_HOLDS_SHELL_ALLOW_REASON = "Auto mode held this command for the server-side classifier to review",
  TOOL_HOST_ALLOW_IS_CLASSIFIED_REASON =
    "Auto mode reviews this action before it runs in the cloud environment",
  OUTSIDE_WORKING_DIRECTORIES_ASK_REASON = "Path is outside allowed working directories",
  RESTRICTED_MODE_DENY_REASON = "--restricted: path outside the working directory",
  OUTSIDE_READS_BLOCKED_DENY_REASON =
    "Reads outside the working directories are blocked (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.",
  OUTSIDE_WRITES_BLOCKED_DENY_REASON =
    "Writes outside the working directories are blocked (permissions.blockWritesOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.",
  SETTINGS_WRITES_BLOCKED_DENY_REASON =
    "Writes to Claude Code settings files are blocked while permissions.blockWritesOutsideWorkingDirectories is on, because a settings file can lift that block. While a managed settings folder cannot be resolved, any .json file counts as one.",
  NO_PROJECT_DIRECTORY_DENY_REASON = "permission check needs a working directory; the session has none",
  NO_CONFIG_HOME_DENY_REASON = "permission check needs a config or temp path; the session has none",
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
/**
 * 原因是否为 outsideReadsBlocked 熔断的 safetyCheck。
 */
//@ chunk-ktpw8eqa.js:5889-5977 placement
function isOutsideReadsBlockedAsk(e) {
  return e?.type === "safetyCheck" && e.circuitBreaker === "outsideReadsBlocked";
}
/**
 * 在开启读阻挡时，sandboxOverride 原因需要特殊处理的判定。
 */
//@ chunk-ktpw8eqa.js:5977-6074 placement
function isSandboxOverrideUnderReadBlock(e, o) {
  return e?.type === "sandboxOverride" && o.blockReadsOutsideWorkingDirectories === !0;
}
/**
 * 读阻挡下“路径在运行时才计算、无法检查”的 ask 结果（safetyCheck、不可交分类器、outsideReadsBlocked）。
 */
//@ chunk-ktpw8eqa.js:6074-6381 placement
function outsideReadsRuntimePathAsk(e) {
  let o = `${e} names a path that is computed at run time, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`;
  return {
    behavior: "ask",
    message: o,
    decisionReason: {
      type: "safetyCheck",
      reason: o,
      classifierApprovable: !1,
      circuitBreaker: "outsideReadsBlocked",
    },
  };
}
/**
 * 读阻挡下“命令太复杂、解析器无法分析”的 ask 结果，不带建议。
 */
//@ chunk-ktpw8eqa.js:6381-6693 placement
function outsideReadsTooComplexAsk(e) {
  let o = `${e}; under the read block (permissions.blockReadsOutsideWorkingDirectories) a command the shell parser cannot analyze asks the person`;
  return {
    behavior: "ask",
    message: o,
    decisionReason: {
      type: "safetyCheck",
      reason: o,
      classifierApprovable: !1,
      circuitBreaker: "outsideReadsBlocked",
    },
    suggestions: [],
  };
}
/**
 * 读阻挡下 sed 脚本不在白名单、可能读写任意文件时的 ask 结果。
 */
//@ chunk-ktpw8eqa.js:6693-7185 placement
function outsideReadsSedScriptAsk() {
  return {
    behavior: "ask",
    message:
      "This sed script is not on the allowlist and can read or write any file, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This sed script is not on the allowlist and can read or write any file, which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)",
      classifierApprovable: !1,
      circuitBreaker: "outsideReadsBlocked",
    },
  };
}
/**
 * 分类器相关原因文字常量：bashCommandClamp 拒绝/崩溃、Classifier unavailable、转录过长回退人工、钩子改写输入后无法复核、服务端分类器无解释等；B 为“分类器不可用类”原因集合。
 */
//@ chunk-ktpw8eqa.js:7185-8208 placement
var BASH_COMMAND_CLAMP_DENY_REASON = "bashCommandClamp: no clamp rule matches this command",
  BASH_COMMAND_CLAMP_CRASH_REASON = "bashCommandClamp fail-closed: permission check crashed",
  CLASSIFIER_UNAVAILABLE_REASON = "Classifier unavailable",
  AUTO_MODE_UNAVAILABLE_STOP_REASON =
    "Auto mode unavailable \u2014 stopped after repeated responses with no safety verdict",
  CLASSIFIER_SWITCHED_OFF_KIND = "classifier_switched_off",
  CLASSIFIER_PARSE_FAILURE_REASON_STEM =
    "Auto mode could not evaluate this action and is blocking it for safety",
  CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON =
    "Auto mode classifier transcript exceeded context window \u2014 falling back to manual approval (try /compact to reduce conversation size)",
  CLASSIFIER_TRANSCRIPT_TOO_LONG_PROMPT =
    "The conversation is too long for auto mode's check, so this needs your approval. Run /compact to shorten the conversation.",
  HOOK_REWROTE_INPUT_REVIEW_REASON =
    "A hook or plugin changed (or may have changed) a call in this response after auto mode reviewed it, so auto mode could not check what would run",
  CLASSIFIER_TOO_LONG_COMPACTING_REASON =
    "Auto mode classifier transcript exceeded context window; will try to compact the conversation before the next request",
  SERVER_CLASSIFIER_NO_EXPLANATION_REASON =
    "The server-side auto mode classifier judged this action dangerous (it gave no explanation)",
  B = new Set([
    CLASSIFIER_UNAVAILABLE_REASON,
    AUTO_MODE_UNAVAILABLE_STOP_REASON,
    CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON,
    CLASSIFIER_TOO_LONG_COMPACTING_REASON,
  ]);
//@ chunk-ktpw8eqa.js:8208-8258 placement
function classifierWrittenReason(e) {
  return B.has(e) ? `Blocked: ${e}` : e;
}
/**
 * 分类器拒绝的种类：unavailable（不可用或反复无结论停止）、no_verdict、block。
 */
//@ chunk-ktpw8eqa.js:8258-8368 placement
function classifierDenyKind(e) {
  if (e.reason === CLASSIFIER_UNAVAILABLE_REASON || e.reason === AUTO_MODE_UNAVAILABLE_STOP_REASON)
    return "unavailable";
  return e.noVerdict ? "no_verdict" : "block";
}
/**
 * 记忆暂停相关原因文字与对外原因代码表 DECISION_REASON_CODES（classifier_transcript_too_long、outside_reads_blocked、memory_paused）。
 */
//@ chunk-ktpw8eqa.js:8368-8572 placement
var MEMORY_PAUSED_MESSAGE = "Memory is paused for this session; only the user can turn it back on.",
  MEMORY_TOGGLED_OFF_REASON = "memory access blocked by /pause-memory",
  DECISION_REASON_CODES = ["classifier_transcript_too_long", "outside_reads_blocked", "memory_paused"];
/**
 * 决定原因在线上传输时的类型：subcommandResults 可带 typeOnWire 覆盖。
 */
//@ chunk-ktpw8eqa.js:8572-8654 placement
function decisionReasonTypeOnWire(e) {
  return e?.type === "subcommandResults" ? (e.typeOnWire ?? e.type) : e?.type;
}
/**
 * 把决定原因映射为对外原因代码（transcript 过长、读阻挡、记忆暂停）；subcommandResults 中读阻挡优先。
 */
//@ chunk-ktpw8eqa.js:8654-9152 placement
function decisionReasonCode(e) {
  switch (e?.type) {
    case "classifier":
      return e.noVerdict === !0 &&
        (e.reason === CLASSIFIER_TRANSCRIPT_TOO_LONG_REASON ||
          e.reason === CLASSIFIER_TOO_LONG_COMPACTING_REASON)
        ? "classifier_transcript_too_long"
        : void 0;
    case "other":
    case "safetyCheck":
      switch (e.reason) {
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
      let o;
      for (let s of e.reasons.values()) {
        let n = decisionReasonCode(s.decisionReason);
        if (n === "outside_reads_blocked") return n;
        o ??= n;
      }
      return o;
    }
    default:
      return;
  }
}
/**
 * headless/无提示场景的原因常量：钩子改写输入触发 ask、需要交互但无提示、无审批表面、无法确认是人发起本步等，均为 asyncAgent 类型。
 */
//@ chunk-ktpw8eqa.js:9152-9774 placement
var HOOK_REWRITTEN_INPUT_ASK_REASON = "ask rule on hook-rewritten input",
  HOOK_REWRITE_HEADLESS_DENY_REASON = { type: "asyncAgent", reason: HOOK_REWRITTEN_INPUT_ASK_REASON },
  HOOK_ALLOW_FLAGGED_HEADLESS_DENY_REASON = {
    type: "asyncAgent",
    reason: "tool requires user interaction; no prompt available in headless mode",
  },
  NO_APPROVAL_SURFACE_REASON = "no approval surface in this session; permission request denied automatically",
  NO_APPROVAL_SURFACE_DENY_REASON = { type: "asyncAgent", reason: NO_APPROVAL_SURFACE_REASON },
  NO_PROMPT_SURFACE_REASON =
    "nobody can be asked in this headless run; a call that needs a person's approval was denied automatically",
  NO_PROMPT_SURFACE_DENY_REASON = { type: "asyncAgent", reason: NO_PROMPT_SURFACE_REASON },
  NO_KNOWN_PERSON_STARTED_THE_TURN_REASON =
    "This action needs a person's approval. Nobody was asked, because Claude can't tell that a person in this session started this step. Claude may still finish it another way.";
/**
 * 把 ask 结果压缩成拒绝里附带的 ask 摘要：decisionReason、matchedAskRule、hooksMayRefuse。
 */
//@ chunk-ktpw8eqa.js:9774-9972 placement
function refusedAskOf(e) {
  return {
    ...(e.decisionReason !== void 0 && { decisionReason: e.decisionReason }),
    ...(e.matchedAskRule !== void 0 && { matchedAskRule: e.matchedAskRule }),
    ...(e.hooksMayRefuse === !0 && { hooksMayRefuse: !0 }),
  };
}
/**
 * 工具能否自行了结未询问的问题：结果 personOnly、工具实现 settleUnaskedQuestion，且不是钩子要求的 ask 地板。
 */
//@ chunk-ktpw8eqa.js:9972-10072 placement
function toolMaySettleUnaskedQuestion(e, o, s) {
  return o.personOnly === !0 && e.settleUnaskedQuestion !== void 0 && s.hookAskFloor !== !0;
}
/**
 * 是否必须留给人：ask 要求用户交互，或工具 owesPersonOnlyAsk 返回真。
 */
//@ chunk-ktpw8eqa.js:10072-10172 placement
function mustBeLeftToAPerson(e, o, s, n, r) {
  return e.askRequiresUserInteraction === !0 || o.owesPersonOnlyAsk?.(s, n, r) === !0;
}
/**
 * --permission-prompt-tool / SDK canUseTool 通道的拒绝原因常量：MCP 工具需交互、MCP 服务器名冒充 claude.ai 连接器、流关闭、结果不合 schema、请求失败/中止、提示工具断开等。
 */
//@ chunk-ktpw8eqa.js:10172-11027 placement
var PROMPT_TOOL_ALLOW_FLAGGED_MCP_DENY_REASON = {
    type: "other",
    reason: "MCP tool requires user interaction; not supported via --permission-prompt-tool",
  },
  PROMPT_TOOL_ALLOW_IMITATOR_DENY_REASON = {
    type: "other",
    reason:
      "This MCP server's name starts like a claude.ai connector's, so --permission-prompt-tool cannot approve its tools. To use them here, the server needs another name.",
  },
  CAN_USE_TOOL_STREAM_CLOSED_REASON = "tool permission stream closed before response received",
  CAN_USE_TOOL_INVALID_RESULT_REASON = "canUseTool returned a schema-invalid permission result",
  CAN_USE_TOOL_REQUEST_FAILED_REASON = "tool permission request failed",
  CAN_USE_TOOL_ABORTED_REASON = "tool permission request aborted",
  CANCELLED_AT_CLASSIFIER_NOTICE_REASON = "Cancelled at the classifier billing notice",
  CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON = { type: "other", reason: CAN_USE_TOOL_STREAM_CLOSED_REASON },
  CAN_USE_TOOL_INVALID_RESULT_DENY_REASON = { type: "other", reason: CAN_USE_TOOL_INVALID_RESULT_REASON },
  CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON = "permission prompt tool no longer connected",
  CAN_USE_TOOL_PROMPT_TOOL_GONE_DENY_REASON = { type: "other", reason: CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON },
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON =
    "permission prompt tool is on server remote-browser under its mode floor",
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_DENY_REASON = {
    type: "other",
    reason: CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON,
  },
  CAN_USE_TOOL_REQUEST_FAILED_DENY_REASON = { type: "other", reason: CAN_USE_TOOL_REQUEST_FAILED_REASON },
  CAN_USE_TOOL_ABORTED_DENY_REASON = { type: "other", reason: CAN_USE_TOOL_ABORTED_REASON };
/**
 * Shift+Tab 循环顺序：default→acceptEdits→plan→bypassPermissions（可用时）→auto（可用时）→default；bypassPermissions→auto 或 default；dontAsk、auto 及其他→default。316 已去掉旧版 ant 用户从 default 直接跳 bypass/auto 的分支。
 */
//@ chunk-n4pvm0gt.js:603-903 fingerprint = EXTERNAL_PERMISSION_MODES (0.908)
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
  EXTERNAL_PERMISSION_MODES,
  getNextPermissionMode_2,
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
  NO_APPROVAL_SURFACE_DENY_REASON,
  NO_PROMPT_SURFACE_DENY_REASON,
  decisionReasonCode,
  decisionReasonTypeOnWire,
  NO_KNOWN_PERSON_STARTED_THE_TURN_REASON,
  isInvalidInputDeny,
  CAN_USE_TOOL_STREAM_CLOSED_DENY_REASON,
  MEMORY_PAUSED_MESSAGE,
  CIRCUIT_BREAKER_TRAITS,
  CLASSIFIER_PARSE_FAILURE_REASON_STEM,
  isServedUnplaceableCircuitBreaker,
  isPreAskDeny,
  CAN_USE_TOOL_PROMPT_TOOL_GONE_REASON,
  CAN_USE_TOOL_PROMPT_TOOL_IS_CLOUD_BROWSER_REASON,
};
