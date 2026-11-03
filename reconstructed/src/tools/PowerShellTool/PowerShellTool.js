/**
 * tools/PowerShellTool/PowerShellTool.tsx
 *
 * PowerShell 工具定义与执行：schema、validateInput（不可见字符、沙箱、Start-Sleep）、checkPermissions（含沙箱外运行确认）、runPowerShellCommand
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/PowerShellTool.tsx
 * pieces: chunk-5ghnps9r.js (3), chunk-v0yfsee9.js (12)
 * attribution: placement 4, fingerprint 6, file-local 1, layout 4
 */
import { dirname, dirname as dirname_2, dirname as dirname_3, basename, basename as basename_2 } from "path";
import { resolveToCanonical, hasSyncSecurityConcerns, isReadOnlyCommand } from "./readOnlyValidation.js";
import {
  kWr,
  HWr,
  copyShellOutputFile,
  trimBlankEdgeLines,
  persistShellOutput,
  ywt,
} from "../../utils/task/shellOutputPersist.js";
import { shouldUseSandbox, sandboxPolicyRefusal } from "../BashTool/shouldUseSandbox.js";
import { getPlatform } from "../../utils/platform.js";
import { pVn, hln, yOo, getPowerShellPrompt, w0r } from "./prompt.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, o, E, M, u, T } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import { booleanishSchema } from "../../utils/spellcheck.js";
import { getRunInBackgroundDescription, Ixe } from "../BashTool/prompt.js";
import {
  areCommandNetworkListsOffered,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  Tjt,
  checkAllowedDomainsInput,
  takeCommandNetworkLists,
} from "../BashTool/sandboxNetwork.js";
import {
  attachedMachineInputField,
  Cf,
  $r,
  yO,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { omitUnsandboxedFields } from "../BashTool/BashTool.js";
import { uf } from "../AgentTool/backgroundGates.js";
import {
  gitOperationSchema,
  withSpilledOutputTail,
  trackGitOperations,
  detectGitOperation,
  emitVcsStateChanges,
} from "../shared/gitOperationTracking.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { POWERSHELL_TOOL_NAME } from "./toolName.js";
import { REMOTE_EXECUTION_UNSUPPORTED } from "../../Tool.js";
import { $rt } from "../../utils/shell/outputLimits.js";
import { Sdt, JT } from "../../constants/outputLimits.js";
import { zCe } from "../../utils/remoteTools/toolHostRouting.js";
import { parsePowerShellCommand, getAllCommands } from "../../utils/powershell/parser.js";
import {
  permissionRuleExtractPrefix,
  matchWildcardPattern,
} from "../../utils/permissions/shellRuleMatching.js";
import { truncate } from "../../utils/format.js";
import { buildImageToolResult } from "../../bridge/inboundMessages.js";
import {
  generatePreview,
  PREVIEW_SIZE_CHARS,
  buildPersistedOutputMessage,
  getOriginalCwd as getOriginalCwd_2,
  ensureToolResultsDir,
  getToolResultFilePath,
  toolResultsKey,
} from "../../utils/toolResultStorage.js";
import {
  MAX_PERSISTED_OUTPUT_BYTES,
  getTaskOutputPath,
  getTaskOutputRootDir,
  persistTaskOutputSnapshot,
} from "../../utils/task/diskOutput.js";
import {
  formatBackgroundTaskMessage,
  getSubagentForegroundCapMs,
  resetCwdIfOutsideProject,
  stdErrAppendShellResetMessage,
  resizeShellImageOutput,
} from "../BashTool/utils.js";
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import { L0e, PCe, ENDED_INSTEAD_OF_BACKGROUND_MESSAGE } from "../../plugins/functionHooks/inputHold.js";
import { backgroundTaskNotice, oie, Okt } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { q9n, INVISIBLE_CHAR_REFUSAL } from "../../utils/promptShellExecution.js";
import { logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { isBashAvailable, shouldUseShellTool } from "../../utils/shell/shellToolUtils.js";
import {
  denyCrashedCheckUnderCommandClamp,
  checkPowerShellPermissions,
  parseShellPermissionRule,
} from "./powershellPermissions.js";
import { isAllRuleReason } from "../../utils/permissions/decisionReasons.js";
import { shouldRetagAskAsSandboxOverride } from "../../utils/permissions/permissions.js";
import { DWr, OWr, claimViolationReport } from "../BashTool/sandboxViolations.js";
import {
  MalformedCommandError,
  AbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  sanitizedMachineReasonForTelemetry,
  ShellError,
  isAbortError,
  isSyscallError,
  errorMessage,
  withTelemetryMessage,
  toError,
} from "../../utils/errors.js";
import {
  SandboxPolicyRefusalError,
  getEffectiveFilesystemPolicy,
} from "../../utils/sandbox/sandbox-adapter.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { ensureDeviceSandboxPosture } from "../../remote/tools/deviceSandboxPosture.js";
import { Vun, z6n, onAbortDisposable } from "../../utils/abortReasons.js";
import { isolationWorktreeFor } from "../../utils/worktreeIsolation.js";
import { WSt } from "./destructiveCommandWarning.js";
import { unwrapAbortReason, isUserInitiatedAbortReason } from "../../utils/abortController.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { reapsShellsOnExit } from "../../utils/agentContext.js";
import { consumeClaudeCodeHints } from "../../utils/claudeCodeHints.js";
import {
  readShellOutputSoFar,
  backgroundShellCommand,
  backgroundExistingForegroundTask,
  markTaskNotified,
  fhn,
  wasBackgroundedToDeliverMessage,
  registerForeground,
  unregisterForeground,
} from "../../tasks/LocalShellTask/LocalShellTask.js";
import { logEvent } from "../../services/analytics/index.js";
import { EndTruncatingAccumulator } from "../../utils/stringUtils.js";
import {
  interpretCommandResult,
  classifyPowerShellError,
  classifyPowerShellCommand,
  classifyNotRecognizedCommand,
  UBo,
  detectBashSyntax,
} from "./commandTelemetry.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { getPowerShellEditionAsync, getCachedPowerShellPath } from "../../utils/shell/powershellDetection.js";
import { classifyDestructiveTargetScope } from "../BashTool/destructiveTargets.js";
import { getCwd } from "../../utils/cwd.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { effectiveShellTimeoutMs, EVt } from "../../utils/timeouts.js";
import { exec } from "../../utils/Shell.js";
import { VSn, bunOptionsGuard } from "../../utils/permissions/protectedSettingsPaths.js";
import { KNOWN_ERROR_CLASS_NAMES } from "../../utils/telemetry/errorClassNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { xTe } from "../shared/textSearchTools.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";

/**
 * PowerShell 折叠显示用的命令集合：搜索（select-string/get-childitem/findstr/where.exe）、读（get-content/get-item/test-path…）、中性（write-output/write-host）。
 */
//@ chunk-v0yfsee9.js:89450-89734 fingerprint = PS_READ_COMMANDS (0.818)
var NEWLINE = `
`,
  PS_SEARCH_COMMANDS = new Set(["select-string", "get-childitem", "findstr", "where.exe"]),
  PS_READ_COMMANDS = new Set([
    "get-content",
    "get-item",
    "test-path",
    "resolve-path",
    "get-process",
    "get-service",
    "get-childitem",
    "get-location",
    "get-filehash",
    "get-acl",
    "format-hex",
  ]),
  PS_SEMANTIC_NEUTRAL_COMMANDS = new Set(["write-output", "write-host"]);
/**
 * PowerShell 命令是否只是搜索/读取（用于结果折叠）：按 ; 和 | 拆分，跳过 write-output 等，所有段都必须是已知搜索或读取命令。
 */
//@ chunk-v0yfsee9.js:89734-90162 placement = classifyMcpToolForCollapse (1)
function isSearchOrReadPowerShellCommand(e) {
  let trimmed = e.trim();
  if (!trimmed) return { isSearch: !1, isRead: !1 };
  let filtered = trimmed.split(/\s*[;|]\s*/).filter(Boolean);
  if (filtered.length === 0) return { isSearch: !1, isRead: !1 };
  let s = !1,
    m = !1,
    g = !1;
  for (let y of filtered) {
    let w = y.trim().split(/\s+/)[0];
    if (!w) continue;
    let normalized = resolveToCanonical(w);
    if (PS_SEMANTIC_NEUTRAL_COMMANDS.has(normalized)) continue;
    g = !0;
    let O = PS_SEARCH_COMMANDS.has(normalized),
      S = PS_READ_COMMANDS.has(normalized);
    if (!O && !S) return { isSearch: !1, isRead: !1 };
    if (O) s = !0;
    if (S) m = !0;
  }
  if (!g) return { isSearch: !1, isRead: !1 };
  return { isSearch: s, isRead: m };
}
//@ chunk-v0yfsee9.js:90162-90209 fingerprint = DISALLOWED_AUTO_BACKGROUND_COMMANDS (1)
var PROGRESS_THRESHOLD_MS = 2000,
  Qs = 1000,
  DISALLOWED_AUTO_BACKGROUND_COMMANDS = ["start-sleep", "sleep"];
/**
 * 首个命令（按别名解析为规范 cmdlet）不是 start-sleep/sleep 时允许超时自动转后台。
 */
//@ chunk-v0yfsee9.js:90209-90310 file-local
async function isAutobackgroundingAllowed(command) {
  let firstWord = command.trim().split(/\s+/)[0];
  if (!firstWord) return !0;
  let canonical = resolveToCanonical(firstWord);
  return !DISALLOWED_AUTO_BACKGROUND_COMMANDS.includes(canonical);
}
/**
 * 检测首段为 Start-Sleep/sleep N（N≥阈值）的阻塞写法；validateInput 据此拒绝（仅在 Monitor 可用等条件下）。
 */
//@ chunk-v0yfsee9.js:90310-90646 fingerprint = detectBlockedSleepPattern (1)
function detectBlockedSleepPattern(command) {
  let first =
      command
        .trim()
        .split(/[;|&\r\n]/)[0]
        ?.trim() ?? "",
    match = /^(?:start-sleep|sleep)(?:\s+-s(?:econds)?)?\s+(\d+(?:\.\d*)?)\s*$/i.exec(first);
  if (!match) return null;
  let s = parseFloat(match[1]);
  if (s < kWr) return null;
  let rest = command
    .trim()
    .slice(first.length)
    .replace(/^[\s;|&]+/, "");
  return rest ? `Start-Sleep ${s} followed by: ${rest}` : `standalone Start-Sleep ${s}`;
}
/**
 * PowerShell 版 shouldUseSandbox（shellType=powershell）。
 */
//@ chunk-v0yfsee9.js:90646-90773 layout
function shouldUsePowerShellSandbox(e, n) {
  return shouldUseSandbox(
    { command: e.command, dangerouslyDisableSandbox: e.dangerouslyDisableSandbox, shellType: "powershell" },
    n,
  );
}
//@ chunk-v0yfsee9.js:90773-90810 layout
function isWindowsPlatform() {
  return getPlatform() === "windows";
}
/**
 * PowerShell 输入/输出 schema：command（拒绝隐藏控制字符）、timeout、description、run_in_background（后台禁用时去掉）、dangerouslyDisableSandbox，Windows 上可带远程机器字段；输出含 stdout/stderr/interrupted/持久化/后台任务/gitOperation。远程执行配置 no。
 */
//@ chunk-v0yfsee9.js:90810-93611 fingerprint = outputSchema (0.54)
var REMOTE_EXECUTION_CONFIG = {
    supported: !0,
    refusedInputFields: pVn,
    decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"],
  },
  HIDDEN_CONTROL_CHARS_MESSAGE =
    "command contains control characters that would be hidden in the approval dialog",
  fullInputSchema = DoctorLazy(() =>
    zodStrictObject({
      command: o()
        .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_MESSAGE)
        .describe("The PowerShell command to execute"),
      timeout: coercedNumberSchema(E().optional()).describe(
        `Optional timeout in milliseconds (max ${hln()} for a foreground command)`,
      ),
      description: o()
        .optional()
        .describe("Clear, concise description of what this command does in active voice."),
      run_in_background: booleanishSchema(M().optional()).describe(getRunInBackgroundDescription()),
      dangerouslyDisableSandbox: booleanishSchema(M().optional()).describe(
        "Set this to true to dangerously override sandbox mode and run commands without sandboxing.",
      ),
      ...(areCommandNetworkListsOffered() && allowedDomainsInputSchema()),
      ...(isWindowsPlatform() && attachedMachineInputField()),
    }),
  ),
  coercedInputSchema = DoctorLazy(() => omitUnsandboxedFields(fullInputSchema(), yOo)),
  inputSchema = DoctorLazy(() =>
    uf() ? coercedInputSchema().omit({ run_in_background: !0 }) : coercedInputSchema(),
  ),
  outputSchema = DoctorLazy(() =>
    u({
      stdout: o().describe("The standard output of the command"),
      stderr: o().describe("The standard error output of the command"),
      interrupted: M().describe("Whether the command was interrupted"),
      returnCodeInterpretation: o()
        .optional()
        .describe("Semantic interpretation for non-error exit codes with special meaning"),
      isImage: M().optional().describe("Flag to indicate if stdout contains image data"),
      persistedOutputPath: o().optional().describe("Path to persisted full output when too large for inline"),
      persistedOutputSize: E().optional().describe("Total output size in bytes when persisted"),
      backgroundTaskId: o()
        .optional()
        .describe("ID of the background task if command is running in background"),
      backgroundedByUser: M()
        .optional()
        .describe("True if the user manually backgrounded the command with Ctrl+B"),
      backgroundedByTurnAbort: M()
        .optional()
        .describe("@internal True if a plugin's turn abort moved the running command to the background"),
      backgroundedToDeliverMessage: M()
        .optional()
        .describe(
          "@internal True if the command was moved to the background so a message queued for the model could reach it",
        ),
      timedOutAfterMs: E()
        .optional()
        .describe("Set when the command hit its timeout and was auto-backgrounded; the timeout value in ms"),
      subagentCapApplied: T(!0)
        .optional()
        .describe("@internal True if the async subagent foreground cap shortened the command's timeout"),
      backgroundEndsWithFinalResponse: T(!0)
        .optional()
        .describe(
          "True when this backgrounded command is terminated at its caller's final response, so no completion notification can follow (a synchronous subagent's command, or a headless session that takes no further input and is not waiting for background commands); absent when the command survives",
        ),
      gitOperation: gitOperationSchema()
        .optional()
        .describe(
          "Structured classification of git/gh operations detected in this command (commit/push/merge/rebase/PR). Client-facing \u2014 lets clients render git activity without re-parsing stdout; not surfaced to the model.",
        ),
    }),
  );
/**
 * PowerShell 只读判定：无同步安全隐患（hasSyncSecurityConcerns）且 isReadOnlyCommand。
 */
//@ chunk-v0yfsee9.js:93611-93675 layout
function isReadOnlyPowerShellInput(e) {
  if (hasSyncSecurityConcerns(e.command)) return !1;
  return isReadOnlyCommand(e.command);
}
//@ chunk-v0yfsee9.js:93675-94856 layout
function makeShellCallContext(e, n) {
  return {
    get session() {
      return e.session;
    },
    get storageV5() {
      return e.storageV5;
    },
    get agentId() {
      return e.agentId;
    },
    get agentContext() {
      return e.agentContext;
    },
    get agentWorktree() {
      return e.agentWorktree;
    },
    get hookCaller() {
      return e.hookCaller;
    },
    get hookServesModel() {
      return e.hookServesModel;
    },
    get pluginUnnamed() {
      return e.pluginUnnamed;
    },
    get taskRegistry() {
      return e.taskRegistry;
    },
    get toolState() {
      return e.toolState;
    },
    get applyFileHistoryOp() {
      return e.applyFileHistoryOp;
    },
    get sessionEnvVars() {
      return e.sessionEnvVars;
    },
    get markPrResolvedThisSession() {
      return e.markPrResolvedThisSession;
    },
    emitToolProgress: e.emitToolProgress,
    get shellPermission() {
      return { ...e.shellPermission, abortController: { signal: n.signal }, toolUseId: n.toolUseId };
    },
    get mainLoopModel() {
      return e.mainLoopModel;
    },
    get permissions() {
      return e.permissions;
    },
    get hasSpendCap() {
      return e.hasSpendCap;
    },
    get toolUseId() {
      return n.toolUseId;
    },
    get userTypedShellDispatch() {
      return n.userTypedShellDispatch === !0;
    },
    get abortController() {
      return { signal: n.signal };
    },
    get innerCall() {
      return n.innerCall;
    },
    get shellWallCapMs() {
      return n.shellWallCapMs;
    },
    get promptShellPluginId() {
      return n.promptShellPluginId;
    },
    get remoteCall() {
      return n.remoteCall;
    },
  };
}
/**
 * PowerShell 工具定义（name=PowerShell，searchHint "execute Windows PowerShell commands"）。只读即并发安全；validateInput 拒绝 BOM/U+180E 不可见字符、沙箱策略拒绝、长 Start-Sleep；checkPermissions 走 powershellPermissions，dangerouslyDisableSandbox 时额外要求"在沙箱外运行"确认；call 与 Bash 类似（进度、后台化、持久化、git 操作识别、cwd 重置），版本记入遥测。
 */
//@ chunk-v0yfsee9.js:94856-105226 fingerprint = PowerShellTool (0.461)
var PowerShellTool = buildTool({
  name: POWERSHELL_TOOL_NAME,
  ruleContentField: "command",
  searchHint: "execute Windows PowerShell commands",
  enablesCodeExecution: !0,
  get remoteExecution() {
    return isWindowsPlatform() ? REMOTE_EXECUTION_CONFIG : REMOTE_EXECUTION_UNSUPPORTED;
  },
  backgrounding: "self",
  get maxResultSizeChars() {
    return $rt();
  },
  persistenceThresholdCeiling: Sdt,
  strict: !0,
  async description({ description: e }) {
    return e || "Run PowerShell command";
  },
  async prompt() {
    return getPowerShellPrompt();
  },
  isConcurrencySafe(e) {
    return this.isReadOnly?.(e) ?? !1;
  },
  suppressesAllPermissionUpdates(e) {
    return Cf(e);
  },
  isSearchOrReadCommand(e) {
    if (typeof e?.command !== "string") return { isSearch: !1, isRead: !1 };
    return isSearchOrReadPowerShellCommand(e.command);
  },
  isReadOnly(e) {
    return isReadOnlyPowerShellInput(e);
  },
  sandboxNetworkLists(e) {
    return getCommandNetworkLists(e);
  },
  toAutoClassifierInput(e) {
    let dangerouslyDisableSandbox = e.dangerouslyDisableSandbox,
      r = !1,
      s = zCe(e),
      m = Tjt(e);
    if (s !== void 0 || m !== void 0)
      return { command: e.command, ...!1, ...(s !== void 0 && { [$r]: s }), ...m };
    return e.command;
  },
  async preparePermissionMatcher({ command: e }) {
    let n = await parsePowerShellCommand(e);
    if (!n.valid) return () => !0;
    let flattened = getAllCommands(n).flatMap((s) => {
      let joined = [s.name, ...s.args].join(" "),
        joined_2 = [resolveToCanonical(s.name), ...s.args].join(" ");
      return joined.toLowerCase() === joined_2 ? [joined] : [joined, joined_2];
    });
    return (s) => {
      let m = permissionRuleExtractPrefix(s);
      return flattened.some((g) => {
        if (m !== null) {
          let lower = m.toLowerCase(),
            lower_2 = g.toLowerCase();
          return lower_2 === lower || lower_2.startsWith(`${lower} `);
        }
        return matchWildcardPattern(s, g, !0, !0);
      });
    };
  },
  get inputSchema() {
    return inputSchema();
  },
  get outputSchema() {
    return outputSchema();
  },
  userFacingName() {
    return "PowerShell";
  },
  getToolUseSummary(e) {
    if (!e?.command) return null;
    let { command: command, description: description } = e;
    if (description) return description;
    return truncate(command, JT);
  },
  getActivityDescription(e) {
    if (!e?.command) return "Running command";
    return `Running ${e.description ?? truncate(e.command, JT)}`;
  },
  isEnabled() {
    return !0;
  },
  mapToolResultToToolResultBlockParam(
    {
      interrupted: e,
      stdout: n,
      stderr: r,
      isImage: s,
      persistedOutputPath: m,
      persistedOutputSize: g,
      backgroundTaskId: y,
      backgroundedByUser: w,
      backgroundedToDeliverMessage: h,
      backgroundedByTurnAbort: O,
      timedOutAfterMs: S,
      subagentCapApplied: v,
      backgroundEndsWithFinalResponse: x,
    },
    _,
  ) {
    if (s) {
      let V = buildImageToolResult(n, _);
      if (V) return V;
    }
    let P = n;
    if (m) {
      let V = n ? n.replace(/^(\s*\n)+/, "").trimEnd() : "",
        z = generatePreview(V, PREVIEW_SIZE_CHARS);
      P = buildPersistedOutputMessage({
        filepath: m,
        originalSize: g ?? 0,
        isJson: !1,
        preview: z.preview,
        hasMore: z.hasMore,
        truncatedAtBytes: (g ?? 0) >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : void 0,
      });
    } else if (n) ((P = n.replace(/^(\s*\n)+/, "")), (P = P.trimEnd()));
    let trimmed = r.trim();
    if (e) {
      if (r) trimmed += NEWLINE;
      trimmed += "<error>Command was aborted before completion</error>";
    }
    let D = y
      ? formatBackgroundTaskMessage({
          backgroundTaskId: y,
          outputPath: getTaskOutputPath(y),
          backgroundedByUser: w,
          backgroundedToDeliverMessage: h,
          backgroundedByTurnAbort: O,
          timedOutAfterMs: S,
          subagentCapApplied: v,
          noOutputSeenAtTimeout: S !== void 0 && !P,
          reapedAtFinalResponse: x,
          readToolName: FILE_READ_TOOL_NAME,
        })
      : "";
    if (y && L0e())
      return {
        tool_use_id: _,
        type: "tool_result",
        content: backgroundTaskNotice(
          y,
          [trimmed, D].filter(Boolean).join(`
`),
          { backgroundedByUser: w, ending: x ? "final_response" : void 0 },
        ),
      };
    return {
      tool_use_id: _,
      type: "tool_result",
      content: [P, trimmed, D].filter(Boolean).join(`
`),
      is_error: e,
    };
  },
  create(e) {
    return {
      async validateInput(n, r) {
        if (yO() && Cf(n)) return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 12 };
        if (q9n(n.command)) return { result: !1, message: INVISIBLE_CHAR_REFUSAL, errorCode: 13 };
        let s = sandboxPolicyRefusal(shouldUsePowerShellSandbox(n), n.command, !1, "powershell");
        if (s !== null)
          return (
            logFeatureSad("sandbox_exec", "sandbox_policy_refusal", { tool: lit("powershell") }),
            { result: !1, message: s, errorCode: 11 }
          );
        let m = checkAllowedDomainsInput(n, shouldUsePowerShellSandbox(n));
        if (m !== void 0) return m;
        if (
          isBashAvailable() &&
          !uf() &&
          oie() &&
          r.remoteCall?.constraints.background !== "forbidden" &&
          !n.run_in_background &&
          r.shellWallCapMs === void 0
        ) {
          let g = detectBlockedSleepPattern(n.command);
          if (g !== null)
            return {
              result: !1,
              message: `Blocked: ${g}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\` \u2014 Monitor runs bash). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`,
              errorCode: 10,
            };
        }
        return { result: !0 };
      },
      permissionCheckFailureDecision(n, r) {
        let s = makeShellCallContext(e, r);
        return denyCrashedCheckUnderCommandClamp(s.shellPermission);
      },
      async checkPermissions(n, r) {
        let s = makeShellCallContext(e, r),
          m = await checkPowerShellPermissions(n, s.shellPermission);
        if (
          n.dangerouslyDisableSandbox &&
          m.behavior !== "deny" &&
          !isAllRuleReason(m.decisionReason) &&
          !shouldUsePowerShellSandbox(n) &&
          shouldUsePowerShellSandbox({ ...n, dangerouslyDisableSandbox: !1 }) &&
          (m.behavior !== "ask" || shouldRetagAskAsSandboxOverride(m))
        ) {
          let g = DWr({ toolName: POWERSHELL_TOOL_NAME, input: n, context: s.shellPermission });
          if (g) return g;
          if (m.behavior !== "ask")
            return {
              behavior: "ask",
              decisionReason: { type: "sandboxOverride", reason: "dangerouslyDisableSandbox" },
              message: "Run outside of the sandbox",
            };
          return {
            behavior: "ask",
            decisionReason: {
              type: "sandboxOverride",
              reason: "dangerouslyDisableSandbox",
              replaces: { decisionReason: m.decisionReason, message: m.message, blockedPath: m.blockedPath },
            },
            message: "Run outside of the sandbox",
          };
        }
        return m;
      },
      async call(n, r) {
        let s = makeShellCallContext(e, r),
          { onProgress: onProgress } = r,
          g = HWr(r.parentMessage, s.mainLoopModel()),
          userTypedShellDispatch = s.userTypedShellDispatch,
          w = s.remoteCall?.constraints,
          h = w?.sandbox === "required",
          O = shouldUsePowerShellSandbox(n, {
            userTypedShellDispatch: userTypedShellDispatch,
            disableUnsandboxedCommands: h,
          });
        if (!userTypedShellDispatch && q9n(n.command))
          throw new MalformedCommandError(INVISIBLE_CHAR_REFUSAL);
        let S = sandboxPolicyRefusal(
          O,
          n.command,
          userTypedShellDispatch && n.dangerouslyDisableSandbox === !0,
          "powershell",
        );
        if (S !== null)
          throw (
            logFeatureSad("sandbox_exec", "sandbox_policy_refusal", { tool: lit("powershell") }),
            new SandboxPolicyRefusalError(S)
          );
        if (h) {
          let z =
            !O || getEffectiveFilesystemPolicy() !== "strict" || isScrubEnabled()
              ? { confined: !1, reason: "sandbox_unconfined" }
              : await ensureDeviceSandboxPosture();
          if (!z.confined)
            throw (
              logFeatureSad("sandbox_exec", "remote_floor_refusal"),
              new SandboxPolicyRefusalError(
                "This call must run inside a fully confining sandbox and none is available here. The command was not run.",
                z.reason,
              )
            );
        }
        let { abortController: abortController, emitToolProgress: emitToolProgress } = s,
          _ = !s.agentId,
          P = !_ || w?.pinCwd === !0,
          k = 0;
        await using D = copyShellOutputFile(s.taskRegistry);
        let V = !1;
        try {
          let z = runPowerShellCommand({
              input: n,
              useSandbox: O,
              networkLists: takeCommandNetworkLists(s.toolUseId, n.command),
              constraints: w,
              backgroundHeld: () => PCe(s),
              onHeldEnd: () => {
                V = !0;
              },
              onNote: s.remoteCall?.onNote,
              abortController: abortController,
              taskRegistry: s.taskRegistry,
              emitToolProgress: emitToolProgress,
              session: s.session,
              preventCwdChanges: P,
              isMainThread: _,
              subagentCapMs: getSubagentForegroundCapMs(s),
              toolUseId: s.toolUseId,
              toolState: s.toolState,
              agentId: s.agentId,
              caller: Vun(s),
              shellWallCapMs: s.shellWallCapMs,
              promptShellPluginId: s.promptShellPluginId,
              agentWorktree: s.agentWorktree,
              isolationRoot: isolationWorktreeFor(s),
              sessionEnvVars: s.sessionEnvVars,
            }),
            W = shouldUseShellTool(s.remoteCall !== void 0, s.hasSpendCap) ? onProgress : void 0,
            H;
          do
            if (((H = await z.next()), !H.done && W)) {
              let F = H.value;
              W({
                type: "progress",
                toolUseID: `ps-progress-${k++}`,
                data: {
                  type: "powershell_progress",
                  output: F.output,
                  fullOutput: F.fullOutput,
                  elapsedTimeSeconds: F.elapsedTimeSeconds,
                  totalLines: F.totalLines,
                  totalBytes: F.totalBytes,
                  timeoutMs: F.timeoutMs,
                  taskId: F.taskId,
                },
              });
            }
          while (!H.done);
          let R = H.value;
          D.track(R);
          let G = R.code === 0 && !R.stdout && R.stderr && !R.backgroundTaskId,
            B = O && !G && !R.backgroundTaskId && s.toolUseId ? OWr(s.toolUseId) : void 0,
            q = G ? void 0 : O,
            X = await withSpilledOutputTail(R.stdout, R.outputFilePath);
          if (
            !G &&
            !R.backgroundTaskId &&
            trackGitOperations(s.session.host, n.command, R.code, X).prResolved
          )
            s.markPrResolvedThisSession();
          let te = WSt(n.command),
            ne = unwrapAbortReason(abortController.signal.reason),
            de = R.interrupted && ne === "interrupt",
            oe = R.interrupted && isUserInitiatedAbortReason(ne);
          if (R.interrupted && ne === "background") throw new AbortError();
          let he = "",
            cwd = xo(s.session).cwd;
          if (!P) {
            if (resetCwdIfOutsideProject(s.session, s.permissions()) || R.cwdChangeRefused)
              he = stdErrAppendShellResetMessage("");
          }
          let Ee =
            R.backgroundTaskId !== void 0 &&
            (reapsShellsOnExit(s.agentContext) || (s.agentId === void 0 && Okt()))
              ? !0
              : void 0;
          if (R.backgroundTaskId) {
            let F = consumeClaudeCodeHints(
              R.timedOutAfterMs !== void 0 && s.innerCall !== !0
                ? await readShellOutputSoFar(R.backgroundTaskId, PREVIEW_SIZE_CHARS)
                : R.stdout || "",
              { command: n.command, pendingHint: s.session.pendingHint, isMainThread: _, surface: "shell" },
            );
            if (L0e())
              logEvent("tengu_bash_task_ack", {
                trigger: R.backgroundedByUser
                  ? lit("user")
                  : R.backgroundedByTurnAbort
                    ? lit("turn_abort")
                    : R.backgroundedToDeliverMessage
                      ? lit("deliver_message")
                      : R.timedOutAfterMs !== void 0
                        ? lit("timeout")
                        : lit("explicit"),
                ends_with_final_response: Ee === !0,
                shell: lit("powershell"),
              });
            return {
              data: {
                stdout: F,
                stderr: [R.stderr || "", he].filter(Boolean).join(`
`),
                interrupted: !1,
                backgroundTaskId: R.backgroundTaskId,
                backgroundedByUser: R.backgroundedByUser,
                backgroundedByTurnAbort: R.backgroundedByTurnAbort,
                backgroundedToDeliverMessage: R.backgroundedToDeliverMessage,
                timedOutAfterMs: R.timedOutAfterMs,
                subagentCapApplied: R.subagentCapApplied,
                backgroundEndsWithFinalResponse: Ee,
              },
              ...(q !== void 0 && { sandboxed: q }),
            };
          }
          let Pe = new EndTruncatingAccumulator(),
            trimEnd = (R.stdout || "").trimEnd();
          Pe.append(trimEnd + NEWLINE);
          let Ae = interpretCommandResult(n.command, R.code, trimEnd, R.stderr || ""),
            ue = trimBlankEdgeLines(Pe.toString());
          if (
            ((ue = consumeClaudeCodeHints(ue, {
              command: n.command,
              pendingHint: s.session.pendingHint,
              isMainThread: _,
              surface: "shell",
            })),
            R.preSpawnError)
          ) {
            let F = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              R.preSpawnError,
              "PowerShell: pre-spawn error (cwd/argv redacted)",
            );
            throw R.preSpawnErrorCode === "e2big" ? tagObject(F, { kind: "spawn_arg_limit" }) : F;
          }
          if (Ae.isError && !de) {
            let F = trimEnd.length <= 8192 ? trimEnd : trimEnd.slice(0, 4096) + trimEnd.slice(-4096),
              K = classifyPowerShellError(F, R.code);
            throw (
              logEvent("tengu_powershell_tool_command_failed", {
                model: g,
                command_type: fromEnum(classifyPowerShellCommand(n.command)),
                exit_code: R.code,
                stdout_length: trimEnd.length,
                error_class: sanitizedMachineReasonForTelemetry(K),
                not_recognized_kind:
                  K === "not_recognized" || K === "command_not_found"
                    ? fromEnum(classifyNotRecognizedCommand(F) ?? "unextracted")
                    : void 0,
                parser_error_kind:
                  K === "parser_error" || K === "ps5_chain_op" ? fromEnum(UBo(F) ?? "unextracted") : void 0,
                bash_syntax_shape: fromEnum(detectBashSyntax(n.command)),
                powershell_edition: fromEnum((await getPowerShellEditionAsync()) ?? "unknown"),
                user_typed_shell_dispatch: userTypedShellDispatch,
                call_origin: fromEnum(w ? "remote" : "local"),
                destructive_category: fromEnum(te ?? "none"),
                destructive_target_scope: fromEnum(classifyDestructiveTargetScope(n.command, getCwd(), te)),
                permission_mode: fromEnum(s.permissions().mode),
              }),
              new ShellError({
                stdout: ue,
                stderr: V
                  ? `${(R.stderr || "").trimEnd()}

${ENDED_INSTEAD_OF_BACKGROUND_MESSAGE}`
                  : R.stderr || "",
                code: R.code,
                interrupted: oe,
                sandboxViolations: B,
                sandboxed: q,
              })
            );
          }
          let me, ge;
          if (R.outputFilePath && R.outputTaskId) {
            let F, K;
            try {
              let Q = getOriginalCwd_2(s.session);
              F = await ensureToolResultsDir(Q, s.storageV5);
              let U = getToolResultFilePath(Q, R.outputTaskId, !1),
                J =
                  isStorageV5Enabled() && s.storageV5 !== void 0
                    ? toolResultsKey(dirname(U), basename(U))
                    : void 0,
                we = !0;
              if (isStorageV5Enabled() && s.storageV5 !== void 0 && J !== void 0) {
                let se = await persistShellOutput(
                  s.storageV5,
                  J,
                  R.outputFilePath,
                  MAX_PERSISTED_OUTPUT_BYTES,
                  getTaskOutputRootDir(),
                );
                if (((we = se === "today"), typeof se === "number")) ((me = U), (ge = se));
              }
              if (we)
                ((ge = await persistTaskOutputSnapshot(R.outputFilePath, U, MAX_PERSISTED_OUTPUT_BYTES)),
                  (me = U));
            } catch (error) {
              K = error;
            }
            if (me === void 0) D.copyFailed(K, F);
          }
          let _e = ywt(ue),
            A = ue;
          if (_e) {
            let F = await resizeShellImageOutput(
              ue,
              R.outputFilePath,
              ge,
              imageLimitsForModel(s.mainLoopModel()),
            );
            if (F) A = F;
            else _e = !1;
          }
          let joined = [R.stderr || "", he].filter(Boolean).join(`
`),
            j;
          if (!G) {
            let F = detectGitOperation(n.command, X);
            if (Object.keys(F).length > 0) j = F;
            if (!s.remoteCall) emitVcsStateChanges(F, X, { command: n.command, exitCode: R.code, cwd: cwd });
          }
          return (
            logEvent("tengu_powershell_tool_command_executed", {
              model: g,
              command_type: fromEnum(classifyPowerShellCommand(n.command)),
              stdout_length: A.length,
              stderr_length: joined.length,
              exit_code: R.code,
              interrupted: R.interrupted,
              powershell_edition: fromEnum((await getPowerShellEditionAsync()) ?? "unknown"),
              user_typed_shell_dispatch: userTypedShellDispatch,
              call_origin: fromEnum(w ? "remote" : "local"),
              destructive_category: fromEnum(te ?? "none"),
              destructive_target_scope: fromEnum(classifyDestructiveTargetScope(n.command, getCwd(), te)),
              permission_mode: fromEnum(s.permissions().mode),
            }),
            {
              data: {
                stdout: A,
                stderr: joined,
                interrupted: R.interrupted,
                returnCodeInterpretation: Ae.message,
                isImage: _e,
                persistedOutputPath: me,
                persistedOutputSize: ge,
                gitOperation: j,
              },
              ...(B !== void 0 && { sandboxViolations: B }),
              ...(q !== void 0 && { sandboxed: q }),
            }
          );
        } finally {
          if (s.toolUseId) emitToolProgress?.({ kind: "clear", toolUseId: s.toolUseId });
          if (!isReadOnlyPowerShellInput(n)) s.applyFileHistoryOp({ kind: "touch" });
        }
      },
    };
  },
});
/**
 * 执行 PowerShell 命令的异步生成器：计算超时、检测 PowerShell 是否可用（不可用时返回 "PowerShell is not available on this system."）、exec(shell=powershell)、超时/回合中断/用户转后台、2 秒后产出进度。
 */
//@ chunk-v0yfsee9.js:105226-110221 fingerprint = runPowerShellCommand (0.565)
async function* runPowerShellCommand({
  input: input,
  useSandbox: useSandbox,
  networkLists: networkLists,
  constraints: constraints,
  backgroundHeld: backgroundHeld,
  onHeldEnd: onHeldEnd,
  onNote: onNote,
  abortController: abortController,
  taskRegistry: taskRegistry,
  emitToolProgress: emitToolProgress,
  session: session,
  preventCwdChanges: preventCwdChanges,
  isMainThread: isMainThread,
  subagentCapMs: subagentCapMs,
  toolUseId: toolUseId,
  agentId: agentId,
  caller: caller,
  shellWallCapMs: shellWallCapMs,
  promptShellPluginId: promptShellPluginId,
  agentWorktree: agentWorktree,
  isolationRoot: isolationRoot,
  sessionEnvVars: sessionEnvVars,
  toolState: toolState,
}) {
  let {
      command: command,
      description: description,
      timeout: timeout,
      run_in_background: run_in_background,
    } = input,
    ne = uf() || constraints?.background === "forbidden" || backgroundHeld?.() === !0,
    de = run_in_background === !0 && !ne,
    oe =
      shellWallCapMs !== void 0
        ? Math.min(timeout || hln(), shellWallCapMs, constraints?.maxTimeoutMs ?? 1 / 0)
        : Math.min(timeout || w0r(), de ? Ixe() : hln(), constraints?.maxTimeoutMs ?? 1 / 0);
  if (timeout && oe < timeout) onNote?.({ key: "timeout_clamped", requestedMs: timeout, appliedMs: oe });
  let fullOutput = "",
    lastProgressOutput = "",
    Ee = 0,
    Pe = 0,
    ee = void 0,
    Ae = void 0,
    ue = !1,
    me = () => abortController.signal.aborted && z6n(abortController.signal.reason, caller),
    resolveProgress = null;
  function createProgressSignal() {
    return new Promise((resolve) => {
      resolveProgress = () => resolve(null);
    });
  }
  using A = onAbortDisposable(abortController.signal, () => {
    if (!me()) return;
    let Z = resolveProgress;
    if (Z) ((resolveProgress = null), Z());
  });
  let L = !ne && (await isAutobackgroundingAllowed(command)),
    j = !ne,
    F = effectiveShellTimeoutMs({
      requestedTimeoutMs: oe,
      isMainAgent: isMainThread === !0,
      canAutoBackground: L,
      subagentCapMs: de ? 0 : subagentCapMs,
    }),
    K = isMainThread !== !0 && F < oe ? !0 : void 0;
  if (!(await getCachedPowerShellPath()))
    return { stdout: "", stderr: "PowerShell is not available on this system.", code: 0, interrupted: !1 };
  let U;
  try {
    U = await exec(command, abortController.signal, "powershell", {
      timeout: F,
      owningAgentId: agentId,
      caller: caller,
      turnAbortBackgrounds: j,
      sandboxAttributionId: toolUseId,
      sandboxNetworkLists: networkLists,
      onProgress(Z, be, ye, pe, $e) {
        ((lastProgressOutput = Z), (fullOutput = be), (Ee = ye), (Pe = $e ? pe : 0));
      },
      session: session,
      preventCwdChanges: preventCwdChanges,
      ...(constraints?.scrubCredentialEnv && { scrubCredentialEnv: !0 }),
      ...(constraints?.sandbox === "required" && { requireConfiningSandbox: !0 }),
      sandboxDenyRead: constraints?.additionalDenyRead,
      sandboxDenyWrite: constraints?.additionalDenyWrite,
      agentWorktree: agentWorktree,
      isolationRoot: isolationRoot,
      shouldUseSandbox: useSandbox,
      shouldAutoBackground: L,
      sessionEnvVars: sessionEnvVars,
      ...(VSn(promptShellPluginId) && { bunOptionsFor: (Z) => bunOptionsGuard(promptShellPluginId, Z) }),
    });
  } catch (error) {
    if (isAbortError(error))
      return { stdout: "", stderr: "Command aborted before execution", code: 145, interrupted: !0 };
    if (error instanceof Error && KNOWN_ERROR_CLASS_NAMES.has(error.name)) throw error;
    if (isSyscallError(error))
      return (
        logForDebugging(`PowerShellTool: exec spawn failed: ${error}`),
        {
          stdout: "",
          stderr: `Failed to execute PowerShell command: ${errorMessage(error)}`,
          code: 0,
          interrupted: !1,
        }
      );
    return (
      logError(withTelemetryMessage(toError(error), "PowerShell exec() pre-spawn setup failed")),
      {
        stdout: "",
        stderr: `Failed to execute PowerShell command: ${errorMessage(error)}`,
        code: 0,
        interrupted: !1,
      }
    );
  }
  let J =
      U.status !== "killed"
        ? claimViolationReport(POWERSHELL_TOOL_NAME, command, toolState, { useSandbox: useSandbox })
        : null,
    resultPromise = U.result;
  if (J)
    resultPromise
      .then((Z) => {
        if (Z.preSpawnError) J();
      })
      .catch(() => {});
  async function se(Z) {
    return (
      await backgroundShellCommand(
        {
          command: command,
          shell: "powershell",
          description: description || command,
          shellCommand: U,
          toolUseId: toolUseId,
          agentId: agentId,
          timeout: Z,
        },
        { abortController: abortController, taskRegistry: taskRegistry },
      )
    ).taskId;
  }
  function ke(Z, be, ye) {
    if (backgroundHeld?.() === !0) {
      (onHeldEnd?.(), U.kill());
      return;
    }
    if (ie) {
      if (!backgroundExistingForegroundTask(ie, U, description || command, taskRegistry, toolUseId)) return;
      ((ee = ie),
        logEvent(Z, { command_type: fromEnum(classifyPowerShellCommand(command)), ...ye }),
        be?.(ie));
      return;
    }
    se().then((shellId) => {
      ee = shellId;
      let $e = resolveProgress;
      if ($e) ((resolveProgress = null), $e());
      if ((logEvent(Z, { command_type: fromEnum(classifyPowerShellCommand(command)), ...ye }), be))
        be(shellId);
    });
  }
  if (U.onTimeout && L)
    U.onTimeout((backgroundFn) => {
      ((Ae = F),
        ke("tengu_powershell_command_timeout_backgrounded", backgroundFn, {
          timeout_ms: F,
          requested_timeout_ms: EVt(timeout, oe) ?? 0,
          subagent_cap_applied: K === !0,
        }));
    });
  if (de && U.status !== "killed") {
    if (U.status === "completed") {
      let ye = await resultPromise;
      if (ye.preSpawnError) return ye;
    }
    let Z = EVt(timeout, oe),
      be = await se(Z);
    return (
      logEvent("tengu_powershell_command_explicitly_backgrounded", {
        command_type: fromEnum(classifyPowerShellCommand(command)),
        timeout_ms: Z ?? 0,
      }),
      { stdout: "", stderr: "", code: 0, interrupted: !1, backgroundTaskId: be }
    );
  }
  TaskOutput.startPolling(U.taskOutput.taskId);
  let startTime = Date.now(),
    Fe = startTime + PROGRESS_THRESHOLD_MS,
    ie = void 0,
    ze = null;
  try {
    while (!0) {
      let now = Date.now(),
        timeUntilNextProgress = Math.max(0, Fe - now),
        ye;
      if (!ue && me()) ye = Promise.resolve(null);
      else ye = createProgressSignal();
      let result = await Promise.race([
        resultPromise,
        new Promise((resolve) => setTimeout((Le) => Le(null), timeUntilNextProgress, resolve).unref()),
        ye,
      ]);
      if (result !== null) {
        if (((ze = result), result.backgroundTaskId !== void 0)) {
          if (markTaskNotified(result.backgroundTaskId, result, taskRegistry))
            emitTaskNotification(
              result.backgroundTaskId,
              fhn(result, { command: command, shell: "powershell" }),
              { toolUseId: toolUseId, summary: description || command },
            );
          let fixedResult = { ...result, backgroundTaskId: void 0 },
            { taskOutput: taskOutput } = U;
          if (taskOutput.stdoutToFile && !taskOutput.outputFileRedundant)
            ((fixedResult.outputFilePath = taskOutput.path),
              (fixedResult.outputFileSize = taskOutput.outputFileSize),
              (fixedResult.outputTaskId = taskOutput.taskId));
          return fixedResult;
        }
        return result;
      }
      if (ee)
        return {
          stdout: ue ? fullOutput : "",
          stderr: "",
          code: 0,
          interrupted: !1,
          backgroundTaskId: ee,
          ...(me() && { backgroundedByTurnAbort: !0 }),
          timedOutAfterMs: Ae,
          subagentCapApplied: K,
        };
      if (
        abortController.signal.aborted &&
        (unwrapAbortReason(abortController.signal.reason) === "interrupt" || me()) &&
        !ue
      ) {
        if (((ue = !0), L || (me() && j))) {
          ke(
            me()
              ? "tengu_powershell_command_turn_abort_backgrounded"
              : "tengu_powershell_command_interrupt_backgrounded",
          );
          continue;
        }
        U.kill();
        continue;
      }
      if (ie) {
        if (U.status === "backgrounded")
          return {
            stdout: "",
            stderr: "",
            code: 0,
            interrupted: !1,
            backgroundTaskId: ie,
            ...(wasBackgroundedToDeliverMessage(ie, taskRegistry)
              ? { backgroundedToDeliverMessage: !0 }
              : { backgroundedByUser: !0 }),
          };
      }
      let $e = Date.now() - startTime,
        elapsedSeconds = Math.floor($e / 1000);
      if (!ne && !ue && ee === void 0 && elapsedSeconds >= PROGRESS_THRESHOLD_MS / 1000) {
        if (!ie)
          ie = registerForeground(
            {
              command: command,
              shell: "powershell",
              description: description || command,
              shellCommand: U,
              agentId: agentId,
              caller: caller,
              autoBackgroundArmed: L,
            },
            taskRegistry,
            toolUseId,
          );
        if (toolUseId) emitToolProgress?.({ kind: "background_hint", toolUseId: toolUseId });
      }
      (yield {
        type: "progress",
        fullOutput: fullOutput,
        output: lastProgressOutput,
        elapsedTimeSeconds: elapsedSeconds,
        totalLines: Ee,
        totalBytes: Pe,
        taskId: U.taskOutput.taskId,
        ...(timeout ? { timeoutMs: F } : void 0),
      },
        (Fe = Date.now() + Qs));
    }
  } finally {
    if ((TaskOutput.stopPolling(U.taskOutput.taskId), !ee && U.status !== "backgrounded")) {
      if (ie)
        unregisterForeground(
          ie,
          ze ? fhn(ze, { command: command, shell: "powershell" }) : "stopped",
          taskRegistry,
        );
      U.cleanup();
    }
  }
}
//@ chunk-5ghnps9r.js:562-634 placement
function i() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_table", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-5ghnps9r.js:634-707 placement
function LOs(e) {
  return e.outcome === "needs_approval" ? (e.suggestions ?? []) : [];
}
/**
 * 若规则列表只有一条该工具的前缀/通配规则（非精确匹配），返回其工具名与规则内容。
 */
//@ chunk-5ghnps9r.js:707-935 placement
function singlePrefixRuleFor(e, o) {
  let [t, ...r] = e;
  if (t === void 0 || r.length > 0 || !xTe(o)) return;
  let { toolName: toolName, ruleContent: ruleContent } = permissionRuleValueFromString(t);
  return toolName === o &&
    ruleContent !== void 0 &&
    formatPermissionRule({ toolName: o, ruleContent: ruleContent }) === t &&
    parseShellPermissionRule(ruleContent).type !== "exact"
    ? { toolName: o, ruleContent: ruleContent }
    : void 0;
}

export { i, singlePrefixRuleFor, LOs };
