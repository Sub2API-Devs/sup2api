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
import { dirname, basename } from "path";
import { resolveToCanonical, hasSyncSecurityConcerns, isReadOnlyCommand } from "./readOnlyValidation.js";
import {
  MAX_BLOCKED_SLEEP_LINES,
  safeRequestedModelName,
  copyShellOutputFile,
  trimBlankEdgeLines,
  persistShellOutput,
  isBase64DataUri,
} from "../../utils/task/shellOutputPersist.js";
import { shouldUseSandbox, sandboxPolicyRefusal } from "../BashTool/shouldUseSandbox.js";
import { getPlatform } from "../../utils/platform.js";
import {
  PS_REFUSED_INPUT_FIELDS,
  psMaxTimeoutMs,
  PS_UNSANDBOXED_FIELDS,
  getPowerShellPrompt,
  psDefaultTimeoutMs,
} from "./prompt.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { zodStrictObject, string, E, M, u, literal } from "../../../vendor/zod/v4/classic/schemas.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import { booleanishSchema } from "../../utils/spellcheck.js";
import { getRunInBackgroundDescription, getBackgroundTimeoutCapMs } from "../BashTool/prompt.js";
import {
  areCommandNetworkListsOffered_2,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  commandNetworkListsInput,
  checkAllowedDomainsInput,
  takeCommandNetworkLists,
} from "../BashTool/sandboxNetwork.js";
import {
  attachedMachineInputField,
  hasHostField,
  HOST_TOOL_INPUT_FIELD,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { omitUnsandboxedFields } from "../BashTool/BashTool.js";
import { isBackgroundTasksOff } from "../AgentTool/backgroundGates.js";
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
import { getConfiguredBashOutputMaxChars } from "../../utils/shell/outputLimits.js";
import { MAX_CONTEXT_TOKENS, MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { remoteRoutingCandidate } from "../../utils/remoteTools/toolHostRouting.js";
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
import {
  isInputHoldOn,
  shouldHoldForPlugin,
  ENDED_INSTEAD_OF_BACKGROUND_MESSAGE,
} from "../../plugins/functionHooks/inputHold.js";
import {
  backgroundTaskNotice,
  backgroundCompletionNoticeEnabled,
  isPrintWithoutTidySloth,
} from "../../tasks/LocalShellTask/backgroundNotices.js";
import { hasInvisibleCommandChars, INVISIBLE_CHAR_REFUSAL } from "../../utils/promptShellExecution.js";
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
import {
  noopToolUseHook,
  getParsedSandboxViolations,
  claimViolationReport,
} from "../BashTool/sandboxViolations.js";
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
import { abortScopeOf, isTurnLevelAbort, onAbortDisposable } from "../../utils/abortReasons.js";
import { isolationWorktreeFor } from "../../utils/worktreeIsolation.js";
import { getPowerShellDestructiveCategory } from "./destructiveCommandWarning.js";
import { unwrapAbortReason, isUserInitiatedAbortReason } from "../../utils/abortController.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { reapsShellsOnExit } from "../../utils/agentContext.js";
import { consumeClaudeCodeHints } from "../../utils/claudeCodeHints.js";
import {
  readShellOutputSoFar,
  backgroundShellCommand,
  backgroundExistingForegroundTask,
  markTaskNotified,
  shellStatusForDisplay,
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
  classifyPowerShellParseErrorKind,
  detectBashSyntax,
} from "./commandTelemetry.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { getPowerShellEditionAsync, getCachedPowerShellPath } from "../../utils/shell/powershellDetection.js";
import { classifyDestructiveTargetScope } from "../BashTool/destructiveTargets.js";
import { getCwd } from "../../utils/cwd.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { effectiveShellTimeoutMs, timeoutWhenPositive } from "../../utils/timeouts.js";
import { exec } from "../../utils/Shell.js";
import { isNpmPluginSourcePath, bunOptionsGuard } from "../../utils/permissions/protectedSettingsPaths.js";
import { KNOWN_ERROR_CLASS_NAMES } from "../../utils/telemetry/errorClassNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isShellToolName } from "../shared/textSearchTools.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";

//@ chunk-v0yfsee9.js:89450-89734 fingerprint = PS_READ_COMMANDS (0.818)
/**
 * PowerShell 折叠显示用的命令集合：搜索（select-string/get-childitem/findstr/where.exe）、读（get-content/get-item/test-path…）、中性（write-output/write-host）。
 */
var NEWLINE = `
`;
var PS_SEARCH_COMMANDS = new Set(["select-string", "get-childitem", "findstr", "where.exe"]);
var PS_READ_COMMANDS = new Set([
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
]);
var PS_SEMANTIC_NEUTRAL_COMMANDS = new Set(["write-output", "write-host"]);
//@ chunk-v0yfsee9.js:89734-90162 placement = classifyMcpToolForCollapse (1)
/**
 * PowerShell 命令是否只是搜索/读取（用于结果折叠）：按 ; 和 | 拆分，跳过 write-output 等，所有段都必须是已知搜索或读取命令。
 */
function isSearchOrReadPowerShellCommand(command) {
  let trimmed = command.trim();
  if (!trimmed)
    return {
      isSearch: false,
      isRead: false,
    };
  let filtered = trimmed.split(/\s*[;|]\s*/).filter(Boolean);
  if (filtered.length === 0)
    return {
      isSearch: false,
      isRead: false,
    };
  let isSearch = false;
  let isRead = false;
  let g = false;
  for (let y of filtered) {
    let w = y.trim().split(/\s+/)[0];
    if (!w) continue;
    let normalized = resolveToCanonical(w);
    if (PS_SEMANTIC_NEUTRAL_COMMANDS.has(normalized)) continue;
    g = true;
    let O = PS_SEARCH_COMMANDS.has(normalized);
    let S = PS_READ_COMMANDS.has(normalized);
    if (!O && !S)
      return {
        isSearch: false,
        isRead: false,
      };
    if (O) isSearch = true;
    if (S) isRead = true;
  }
  if (!g)
    return {
      isSearch: false,
      isRead: false,
    };
  return {
    isSearch,
    isRead,
  };
}
//@ chunk-v0yfsee9.js:90162-90209 fingerprint = DISALLOWED_AUTO_BACKGROUND_COMMANDS (1)
/**
 * 超时后自动转后台的等待时间（1000 毫秒）。
 */
var PROGRESS_THRESHOLD_MS = 2000;
var AUTO_BACKGROUND_GRACE_MS = 1000;
var DISALLOWED_AUTO_BACKGROUND_COMMANDS = ["start-sleep", "sleep"];
//@ chunk-v0yfsee9.js:90209-90310 file-local
/**
 * 首个命令（按别名解析为规范 cmdlet）不是 start-sleep/sleep 时允许超时自动转后台。
 */
async function isAutobackgroundingAllowed(command) {
  let firstWord = command.trim().split(/\s+/)[0];
  if (!firstWord) return true;
  let canonical = resolveToCanonical(firstWord);
  return !DISALLOWED_AUTO_BACKGROUND_COMMANDS.includes(canonical);
}
//@ chunk-v0yfsee9.js:90310-90646 fingerprint = detectBlockedSleepPattern (1)
/**
 * 检测首段为 Start-Sleep/sleep N（N≥阈值）的阻塞写法；validateInput 据此拒绝（仅在 Monitor 可用等条件下）。
 */
function detectBlockedSleepPattern(command) {
  let first =
    command
      .trim()
      .split(/[;|&\r\n]/)[0]
      ?.trim() ?? "";
  let m_2 = /^(?:start-sleep|sleep)(?:\s+-s(?:econds)?)?\s+(\d+(?:\.\d*)?)\s*$/i.exec(first);
  if (!m_2) return null;
  let secs = parseFloat(m_2[1]);
  if (secs < MAX_BLOCKED_SLEEP_LINES) return null;
  let rest = command
    .trim()
    .slice(first.length)
    .replace(/^[\s;|&]+/, "");
  return rest ? `Start-Sleep ${secs} followed by: ${rest}` : `standalone Start-Sleep ${secs}`;
}
//@ chunk-v0yfsee9.js:90646-90773 layout
/**
 * PowerShell 版 shouldUseSandbox（shellType=powershell）。
 */
function shouldUsePowerShellSandbox(e, n) {
  return shouldUseSandbox(
    {
      command: e.command,
      dangerouslyDisableSandbox: e.dangerouslyDisableSandbox,
      shellType: "powershell",
    },
    n,
  );
}
//@ chunk-v0yfsee9.js:90773-90810 layout
function isWindowsPlatform() {
  return getPlatform() === "windows";
}
//@ chunk-v0yfsee9.js:90810-93611 fingerprint = outputSchema (0.54)
/**
 * PowerShell 输入/输出 schema：command（拒绝隐藏控制字符）、timeout、description、run_in_background（后台禁用时去掉）、dangerouslyDisableSandbox，Windows 上可带远程机器字段；输出含 stdout/stderr/interrupted/持久化/后台任务/gitOperation。远程执行配置 no。
 */
var REMOTE_EXECUTION_CONFIG = {
  supported: true,
  refusedInputFields: PS_REFUSED_INPUT_FIELDS,
  decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"],
};
var HIDDEN_CONTROL_CHARS_MESSAGE =
  "command contains control characters that would be hidden in the approval dialog";
var fullInputSchema = DoctorLazy(() =>
  zodStrictObject({
    command: string()
      .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_MESSAGE)
      .describe("The PowerShell command to execute"),
    timeout: coercedNumberSchema(E().optional()).describe(
      `Optional timeout in milliseconds (max ${psMaxTimeoutMs()} for a foreground command)`,
    ),
    description: string()
      .optional()
      .describe("Clear, concise description of what this command does in active voice."),
    run_in_background: booleanishSchema(M().optional()).describe(getRunInBackgroundDescription()),
    dangerouslyDisableSandbox: booleanishSchema(M().optional()).describe(
      "Set this to true to dangerously override sandbox mode and run commands without sandboxing.",
    ),
    ...(areCommandNetworkListsOffered_2() && allowedDomainsInputSchema()),
    ...(isWindowsPlatform() && attachedMachineInputField()),
  }),
);
var coercedInputSchema = DoctorLazy(() => omitUnsandboxedFields(fullInputSchema(), PS_UNSANDBOXED_FIELDS));
var inputSchema = DoctorLazy(() =>
  isBackgroundTasksOff()
    ? coercedInputSchema().omit({
        run_in_background: true,
      })
    : coercedInputSchema(),
);
var outputSchema = DoctorLazy(() =>
  u({
    stdout: string().describe("The standard output of the command"),
    stderr: string().describe("The standard error output of the command"),
    interrupted: M().describe("Whether the command was interrupted"),
    returnCodeInterpretation: string()
      .optional()
      .describe("Semantic interpretation for non-error exit codes with special meaning"),
    isImage: M().optional().describe("Flag to indicate if stdout contains image data"),
    persistedOutputPath: string()
      .optional()
      .describe("Path to persisted full output when too large for inline"),
    persistedOutputSize: E().optional().describe("Total output size in bytes when persisted"),
    backgroundTaskId: string()
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
    subagentCapApplied: literal(true)
      .optional()
      .describe("@internal True if the async subagent foreground cap shortened the command's timeout"),
    backgroundEndsWithFinalResponse: literal(true)
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
//@ chunk-v0yfsee9.js:93611-93675 layout
/**
 * PowerShell 只读判定：无同步安全隐患（hasSyncSecurityConcerns）且 isReadOnlyCommand。
 */
function isReadOnlyPowerShellInput(e) {
  if (hasSyncSecurityConcerns(e.command)) return false;
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
      return {
        ...e.shellPermission,
        abortController: {
          signal: n.signal,
        },
        toolUseId: n.toolUseId,
      };
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
      return n.userTypedShellDispatch === true;
    },
    get abortController() {
      return {
        signal: n.signal,
      };
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
//@ chunk-v0yfsee9.js:94856-105226 fingerprint = PowerShellTool (0.461)
/**
 * PowerShell 工具定义（name=PowerShell，searchHint "execute Windows PowerShell commands"）。只读即并发安全；validateInput 拒绝 BOM/U+180E 不可见字符、沙箱策略拒绝、长 Start-Sleep；checkPermissions 走 powershellPermissions，dangerouslyDisableSandbox 时额外要求"在沙箱外运行"确认；call 与 Bash 类似（进度、后台化、持久化、git 操作识别、cwd 重置），版本记入遥测。
 */
var PowerShellTool = buildTool({
  name: POWERSHELL_TOOL_NAME,
  ruleContentField: "command",
  searchHint: "execute Windows PowerShell commands",
  enablesCodeExecution: true,
  get remoteExecution() {
    return isWindowsPlatform() ? REMOTE_EXECUTION_CONFIG : REMOTE_EXECUTION_UNSUPPORTED;
  },
  backgrounding: "self",
  get maxResultSizeChars() {
    return getConfiguredBashOutputMaxChars();
  },
  persistenceThresholdCeiling: MAX_CONTEXT_TOKENS,
  strict: true,
  async description({ description }) {
    return description || "Run PowerShell command";
  },
  async prompt() {
    return getPowerShellPrompt();
  },
  isConcurrencySafe(input) {
    return this.isReadOnly?.(input) ?? false;
  },
  suppressesAllPermissionUpdates(e) {
    return hasHostField(e);
  },
  isSearchOrReadCommand(input) {
    if (typeof input?.command !== "string")
      return {
        isSearch: false,
        isRead: false,
      };
    return isSearchOrReadPowerShellCommand(input.command);
  },
  isReadOnly(e) {
    return isReadOnlyPowerShellInput(e);
  },
  sandboxNetworkLists(e) {
    return getCommandNetworkLists(e);
  },
  toAutoClassifierInput(e) {
    let dangerouslyDisableSandbox = e.dangerouslyDisableSandbox;
    let r = false;
    let s = remoteRoutingCandidate(e);
    let m = commandNetworkListsInput(e);
    if (s !== undefined || m !== undefined)
      return {
        command: e.command,
        ...false,
        ...(s !== undefined && {
          [HOST_TOOL_INPUT_FIELD]: s,
        }),
        ...m,
      };
    return e.command;
  },
  async preparePermissionMatcher({ command }) {
    let powerShellCommand = await parsePowerShellCommand(command);
    if (!powerShellCommand.valid) return () => true;
    let flattened = getAllCommands(powerShellCommand).flatMap((s) => {
      let joined = [s.name, ...s.args].join(" ");
      let joined_2 = [resolveToCanonical(s.name), ...s.args].join(" ");
      return joined.toLowerCase() === joined_2 ? [joined] : [joined, joined_2];
    });
    return (s) => {
      let m = permissionRuleExtractPrefix(s);
      return flattened.some((g) => {
        if (m !== null) {
          let lower = m.toLowerCase();
          let lower_2 = g.toLowerCase();
          return lower_2 === lower || lower_2.startsWith(`${lower} `);
        }
        return matchWildcardPattern(s, g, true, true);
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
  getToolUseSummary(input) {
    if (!input?.command) return null;
    let { command, description } = input;
    if (description) return description;
    return truncate(command, MAX_DESCRIPTION_CHARS);
  },
  getActivityDescription(input) {
    if (!input?.command) return "Running command";
    return `Running ${input.description ?? truncate(input.command, MAX_DESCRIPTION_CHARS)}`;
  },
  isEnabled() {
    return true;
  },
  mapToolResultToToolResultBlockParam(
    {
      interrupted,
      stdout,
      stderr,
      isImage,
      persistedOutputPath,
      persistedOutputSize,
      backgroundTaskId,
      backgroundedByUser,
      backgroundedToDeliverMessage,
      backgroundedByTurnAbort,
      timedOutAfterMs,
      subagentCapApplied,
      backgroundEndsWithFinalResponse,
    },
    toolUseID,
  ) {
    if (isImage) {
      let block = buildImageToolResult(stdout, toolUseID);
      if (block) return block;
    }
    let processedStdout = stdout;
    if (persistedOutputPath) {
      let trimmed = stdout ? stdout.replace(/^(\s*\n)+/, "").trimEnd() : "";
      let preview = generatePreview(trimmed, PREVIEW_SIZE_CHARS);
      processedStdout = buildPersistedOutputMessage({
        filepath: persistedOutputPath,
        originalSize: persistedOutputSize ?? 0,
        isJson: false,
        preview: preview.preview,
        hasMore: preview.hasMore,
        truncatedAtBytes:
          (persistedOutputSize ?? 0) >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : undefined,
      });
    } else if (stdout) {
      processedStdout = stdout.replace(/^(\s*\n)+/, "");
      processedStdout = processedStdout.trimEnd();
    }
    let errorMessage = stderr.trim();
    if (interrupted) {
      if (stderr) errorMessage += NEWLINE;
      errorMessage += "<error>Command was aborted before completion</error>";
    }
    let D = backgroundTaskId
      ? formatBackgroundTaskMessage({
          backgroundTaskId,
          outputPath: getTaskOutputPath(backgroundTaskId),
          backgroundedByUser,
          backgroundedToDeliverMessage,
          backgroundedByTurnAbort,
          timedOutAfterMs,
          subagentCapApplied,
          noOutputSeenAtTimeout: timedOutAfterMs !== undefined && !processedStdout,
          reapedAtFinalResponse: backgroundEndsWithFinalResponse,
          readToolName: FILE_READ_TOOL_NAME,
        })
      : "";
    if (backgroundTaskId && isInputHoldOn())
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: backgroundTaskNotice(
          backgroundTaskId,
          [errorMessage, D].filter(Boolean).join(`
`),
          {
            backgroundedByUser,
            ending: backgroundEndsWithFinalResponse ? "final_response" : undefined,
          },
        ),
      };
    return {
      tool_use_id: toolUseID,
      type: "tool_result",
      content: [processedStdout, errorMessage, D].filter(Boolean).join(`
`),
      is_error: interrupted,
    };
  },
  create(e) {
    return {
      async validateInput(n, r) {
        if (canRunToolsOnThisMachine() && hasHostField(n))
          return {
            result: false,
            message: hostFieldNotForwardedMessage(),
            errorCode: 12,
          };
        if (hasInvisibleCommandChars(n.command))
          return {
            result: false,
            message: INVISIBLE_CHAR_REFUSAL,
            errorCode: 13,
          };
        let s = sandboxPolicyRefusal(shouldUsePowerShellSandbox(n), n.command, false, "powershell");
        if (s !== null) {
          logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
            tool: lit("powershell"),
          });
          return {
            result: false,
            message: s,
            errorCode: 11,
          };
        }
        let m = checkAllowedDomainsInput(n, shouldUsePowerShellSandbox(n));
        if (m !== undefined) return m;
        if (
          isBashAvailable() &&
          !isBackgroundTasksOff() &&
          backgroundCompletionNoticeEnabled() &&
          r.remoteCall?.constraints.background !== "forbidden" &&
          !n.run_in_background &&
          r.shellWallCapMs === undefined
        ) {
          let blockedSleepPattern = detectBlockedSleepPattern(n.command);
          if (blockedSleepPattern !== null)
            return {
              result: false,
              message: `Blocked: ${blockedSleepPattern}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\` \u2014 Monitor runs bash). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`,
              errorCode: 10,
            };
        }
        return {
          result: true,
        };
      },
      permissionCheckFailureDecision(n, r) {
        let shellCallContext = makeShellCallContext(e, r);
        return denyCrashedCheckUnderCommandClamp(shellCallContext.shellPermission);
      },
      async checkPermissions(n, r) {
        let shellCallContext = makeShellCallContext(e, r);
        let m = await checkPowerShellPermissions(n, shellCallContext.shellPermission);
        if (
          n.dangerouslyDisableSandbox &&
          m.behavior !== "deny" &&
          !isAllRuleReason(m.decisionReason) &&
          !shouldUsePowerShellSandbox(n) &&
          shouldUsePowerShellSandbox({
            ...n,
            dangerouslyDisableSandbox: false,
          }) &&
          (m.behavior !== "ask" || shouldRetagAskAsSandboxOverride(m))
        ) {
          let g = noopToolUseHook({
            toolName: POWERSHELL_TOOL_NAME,
            input: n,
            context: shellCallContext.shellPermission,
          });
          if (g) return g;
          if (m.behavior !== "ask")
            return {
              behavior: "ask",
              decisionReason: {
                type: "sandboxOverride",
                reason: "dangerouslyDisableSandbox",
              },
              message: "Run outside of the sandbox",
            };
          return {
            behavior: "ask",
            decisionReason: {
              type: "sandboxOverride",
              reason: "dangerouslyDisableSandbox",
              replaces: {
                decisionReason: m.decisionReason,
                message: m.message,
                blockedPath: m.blockedPath,
              },
            },
            message: "Run outside of the sandbox",
          };
        }
        return m;
      },
      async call(n, r) {
        let shellCallContext = makeShellCallContext(e, r);
        let { onProgress } = r;
        let model = safeRequestedModelName(r.parentMessage, shellCallContext.mainLoopModel());
        let userTypedShellDispatch = shellCallContext.userTypedShellDispatch;
        let constraints = shellCallContext.remoteCall?.constraints;
        let h = constraints?.sandbox === "required";
        let O = shouldUsePowerShellSandbox(n, {
          userTypedShellDispatch,
          disableUnsandboxedCommands: h,
        });
        if (!userTypedShellDispatch && hasInvisibleCommandChars(n.command))
          throw new MalformedCommandError(INVISIBLE_CHAR_REFUSAL);
        let S = sandboxPolicyRefusal(
          O,
          n.command,
          userTypedShellDispatch && n.dangerouslyDisableSandbox === true,
          "powershell",
        );
        if (S !== null) {
          logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
            tool: lit("powershell"),
          });
          throw new SandboxPolicyRefusalError(S);
        }
        if (h) {
          let z =
            !O || getEffectiveFilesystemPolicy() !== "strict" || isScrubEnabled()
              ? {
                  confined: false,
                  reason: "sandbox_unconfined",
                }
              : await ensureDeviceSandboxPosture();
          if (!z.confined) {
            logFeatureSad("sandbox_exec", "remote_floor_refusal");
            throw new SandboxPolicyRefusalError(
              "This call must run inside a fully confining sandbox and none is available here. The command was not run.",
              z.reason,
            );
          }
        }
        let { abortController, emitToolProgress } = shellCallContext;
        let _ = !shellCallContext.agentId;
        let P = !_ || constraints?.pinCwd === true;
        let progressCounter = 0;
        await using D = copyShellOutputFile(shellCallContext.taskRegistry);
        let V = false;
        try {
          let commandGenerator = runPowerShellCommand({
            input: n,
            useSandbox: O,
            networkLists: takeCommandNetworkLists(shellCallContext.toolUseId, n.command),
            constraints,
            backgroundHeld: () => shouldHoldForPlugin(shellCallContext),
            onHeldEnd: () => {
              V = true;
            },
            onNote: shellCallContext.remoteCall?.onNote,
            abortController,
            taskRegistry: shellCallContext.taskRegistry,
            emitToolProgress,
            session: shellCallContext.session,
            preventCwdChanges: P,
            isMainThread: _,
            subagentCapMs: getSubagentForegroundCapMs(shellCallContext),
            toolUseId: shellCallContext.toolUseId,
            toolState: shellCallContext.toolState,
            agentId: shellCallContext.agentId,
            caller: abortScopeOf(shellCallContext),
            shellWallCapMs: shellCallContext.shellWallCapMs,
            promptShellPluginId: shellCallContext.promptShellPluginId,
            agentWorktree: shellCallContext.agentWorktree,
            isolationRoot: isolationWorktreeFor(shellCallContext),
            sessionEnvVars: shellCallContext.sessionEnvVars,
          });
          let W = shouldUseShellTool(shellCallContext.remoteCall !== undefined, shellCallContext.hasSpendCap)
            ? onProgress
            : undefined;
          let generatorResult;
          do {
            generatorResult = await commandGenerator.next();
            if (!generatorResult.done && W) {
              let progress = generatorResult.value;
              W({
                type: "progress",
                toolUseID: `ps-progress-${progressCounter++}`,
                data: {
                  type: "powershell_progress",
                  output: progress.output,
                  fullOutput: progress.fullOutput,
                  elapsedTimeSeconds: progress.elapsedTimeSeconds,
                  totalLines: progress.totalLines,
                  totalBytes: progress.totalBytes,
                  timeoutMs: progress.timeoutMs,
                  taskId: progress.taskId,
                },
              });
            }
          } while (!generatorResult.done);
          let R = generatorResult.value;
          D.track(R);
          let G = R.code === 0 && !R.stdout && R.stderr && !R.backgroundTaskId;
          let B =
            O && !G && !R.backgroundTaskId && shellCallContext.toolUseId
              ? getParsedSandboxViolations(shellCallContext.toolUseId)
              : undefined;
          let q = G ? undefined : O;
          let output = await withSpilledOutputTail(R.stdout, R.outputFilePath);
          if (
            !G &&
            !R.backgroundTaskId &&
            trackGitOperations(shellCallContext.session.host, n.command, R.code, output).prResolved
          )
            shellCallContext.markPrResolvedThisSession();
          let powerShellDestructiveCategory = getPowerShellDestructiveCategory(n.command);
          let ne = unwrapAbortReason(abortController.signal.reason);
          let de = R.interrupted && ne === "interrupt";
          let interrupted = R.interrupted && isUserInitiatedAbortReason(ne);
          if (R.interrupted && ne === "background") throw new AbortError();
          let he = "";
          let cwd = getSessionProject(shellCallContext.session).cwd;
          if (!P) {
            if (
              resetCwdIfOutsideProject(shellCallContext.session, shellCallContext.permissions()) ||
              R.cwdChangeRefused
            )
              he = stdErrAppendShellResetMessage("");
          }
          let Ee =
            R.backgroundTaskId !== undefined &&
            (reapsShellsOnExit(shellCallContext.agentContext) ||
              (shellCallContext.agentId === undefined && isPrintWithoutTidySloth()))
              ? true
              : undefined;
          if (R.backgroundTaskId) {
            let stdout = consumeClaudeCodeHints(
              R.timedOutAfterMs !== undefined && shellCallContext.innerCall !== true
                ? await readShellOutputSoFar(R.backgroundTaskId, PREVIEW_SIZE_CHARS)
                : R.stdout || "",
              {
                command: n.command,
                pendingHint: shellCallContext.session.pendingHint,
                isMainThread: _,
                surface: "shell",
              },
            );
            if (isInputHoldOn())
              logEvent("tengu_bash_task_ack", {
                trigger: R.backgroundedByUser
                  ? lit("user")
                  : R.backgroundedByTurnAbort
                    ? lit("turn_abort")
                    : R.backgroundedToDeliverMessage
                      ? lit("deliver_message")
                      : R.timedOutAfterMs !== undefined
                        ? lit("timeout")
                        : lit("explicit"),
                ends_with_final_response: Ee === true,
                shell: lit("powershell"),
              });
            return {
              data: {
                stdout,
                stderr: [R.stderr || "", he].filter(Boolean).join(`
`),
                interrupted: false,
                backgroundTaskId: R.backgroundTaskId,
                backgroundedByUser: R.backgroundedByUser,
                backgroundedByTurnAbort: R.backgroundedByTurnAbort,
                backgroundedToDeliverMessage: R.backgroundedToDeliverMessage,
                timedOutAfterMs: R.timedOutAfterMs,
                subagentCapApplied: R.subagentCapApplied,
                backgroundEndsWithFinalResponse: Ee,
              },
              ...(q !== undefined && {
                sandboxed: q,
              }),
            };
          }
          let stdoutAccumulator = new EndTruncatingAccumulator();
          let ee = (R.stdout || "").trimEnd();
          stdoutAccumulator.append(ee + NEWLINE);
          let interpretation = interpretCommandResult(n.command, R.code, ee, R.stderr || "");
          let stdout = trimBlankEdgeLines(stdoutAccumulator.toString());
          stdout = consumeClaudeCodeHints(stdout, {
            command: n.command,
            pendingHint: shellCallContext.session.pendingHint,
            isMainThread: _,
            surface: "shell",
          });
          if (R.preSpawnError) {
            let F = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              R.preSpawnError,
              "PowerShell: pre-spawn error (cwd/argv redacted)",
            );
            throw R.preSpawnErrorCode === "e2big"
              ? tagObject(F, {
                  kind: "spawn_arg_limit",
                })
              : F;
          }
          if (interpretation.isError && !de) {
            let F = ee.length <= 8192 ? ee : ee.slice(0, 4096) + ee.slice(-4096);
            let K = classifyPowerShellError(F, R.code);
            logEvent("tengu_powershell_tool_command_failed", {
              model,
              command_type: fromEnum(classifyPowerShellCommand(n.command)),
              exit_code: R.code,
              stdout_length: ee.length,
              error_class: sanitizedMachineReasonForTelemetry(K),
              not_recognized_kind:
                K === "not_recognized" || K === "command_not_found"
                  ? fromEnum(classifyNotRecognizedCommand(F) ?? "unextracted")
                  : undefined,
              parser_error_kind:
                K === "parser_error" || K === "ps5_chain_op"
                  ? fromEnum(classifyPowerShellParseErrorKind(F) ?? "unextracted")
                  : undefined,
              bash_syntax_shape: fromEnum(detectBashSyntax(n.command)),
              powershell_edition: fromEnum((await getPowerShellEditionAsync()) ?? "unknown"),
              user_typed_shell_dispatch: userTypedShellDispatch,
              call_origin: fromEnum(constraints ? "remote" : "local"),
              destructive_category: fromEnum(powerShellDestructiveCategory ?? "none"),
              destructive_target_scope: fromEnum(
                classifyDestructiveTargetScope(n.command, getCwd(), powerShellDestructiveCategory),
              ),
              permission_mode: fromEnum(shellCallContext.permissions().mode),
            });
            throw new ShellError({
              stdout,
              stderr: V
                ? `${(R.stderr || "").trimEnd()}

${ENDED_INSTEAD_OF_BACKGROUND_MESSAGE}`
                : R.stderr || "",
              code: R.code,
              interrupted,
              sandboxViolations: B,
              sandboxed: q,
            });
          }
          let me;
          let ge;
          if (R.outputFilePath && R.outputTaskId) {
            let F;
            let K;
            try {
              let originalCwd = getOriginalCwd_2(shellCallContext.session);
              F = await ensureToolResultsDir(originalCwd, shellCallContext.storageV5);
              let toolResultFilePath = getToolResultFilePath(originalCwd, R.outputTaskId, false);
              let J =
                isStorageV5Enabled() && shellCallContext.storageV5 !== undefined
                  ? toolResultsKey(dirname(toolResultFilePath), basename(toolResultFilePath))
                  : undefined;
              let we = true;
              if (isStorageV5Enabled() && shellCallContext.storageV5 !== undefined && J !== undefined) {
                let se = await persistShellOutput(
                  shellCallContext.storageV5,
                  J,
                  R.outputFilePath,
                  MAX_PERSISTED_OUTPUT_BYTES,
                  getTaskOutputRootDir(),
                );
                we = se === "today";
                if (typeof se === "number") {
                  me = toolResultFilePath;
                  ge = se;
                }
              }
              if (we) {
                ge = await persistTaskOutputSnapshot(
                  R.outputFilePath,
                  toolResultFilePath,
                  MAX_PERSISTED_OUTPUT_BYTES,
                );
                me = toolResultFilePath;
              }
            } catch (error) {
              K = error;
            }
            if (me === undefined) D.copyFailed(K, F);
          }
          let isImage = isBase64DataUri(stdout);
          let compressedStdout = stdout;
          if (isImage) {
            let resized = await resizeShellImageOutput(
              stdout,
              R.outputFilePath,
              ge,
              imageLimitsForModel(shellCallContext.mainLoopModel()),
            );
            if (resized) compressedStdout = resized;
            else isImage = false;
          }
          let finalStderr = [R.stderr || "", he].filter(Boolean).join(`
`);
          let gitOperation;
          if (!G) {
            let gitOperation_2 = detectGitOperation(n.command, output);
            if (Object.keys(gitOperation_2).length > 0) gitOperation = gitOperation_2;
            if (!shellCallContext.remoteCall)
              emitVcsStateChanges(gitOperation_2, output, {
                command: n.command,
                exitCode: R.code,
                cwd,
              });
          }
          logEvent("tengu_powershell_tool_command_executed", {
            model,
            command_type: fromEnum(classifyPowerShellCommand(n.command)),
            stdout_length: compressedStdout.length,
            stderr_length: finalStderr.length,
            exit_code: R.code,
            interrupted: R.interrupted,
            powershell_edition: fromEnum((await getPowerShellEditionAsync()) ?? "unknown"),
            user_typed_shell_dispatch: userTypedShellDispatch,
            call_origin: fromEnum(constraints ? "remote" : "local"),
            destructive_category: fromEnum(powerShellDestructiveCategory ?? "none"),
            destructive_target_scope: fromEnum(
              classifyDestructiveTargetScope(n.command, getCwd(), powerShellDestructiveCategory),
            ),
            permission_mode: fromEnum(shellCallContext.permissions().mode),
          });
          return {
            data: {
              stdout: compressedStdout,
              stderr: finalStderr,
              interrupted: R.interrupted,
              returnCodeInterpretation: interpretation.message,
              isImage,
              persistedOutputPath: me,
              persistedOutputSize: ge,
              gitOperation,
            },
            ...(B !== undefined && {
              sandboxViolations: B,
            }),
            ...(q !== undefined && {
              sandboxed: q,
            }),
          };
        } finally {
          if (shellCallContext.toolUseId)
            emitToolProgress?.({
              kind: "clear",
              toolUseId: shellCallContext.toolUseId,
            });
          if (!isReadOnlyPowerShellInput(n))
            shellCallContext.applyFileHistoryOp({
              kind: "touch",
            });
        }
      },
    };
  },
});
//@ chunk-v0yfsee9.js:105226-110221 fingerprint = runPowerShellCommand (0.565)
/**
 * 执行 PowerShell 命令的异步生成器：计算超时、检测 PowerShell 是否可用（不可用时返回 "PowerShell is not available on this system."）、exec(shell=powershell)、超时/回合中断/用户转后台、2 秒后产出进度。
 */
async function* runPowerShellCommand({
  input,
  useSandbox,
  networkLists,
  constraints,
  backgroundHeld,
  onHeldEnd,
  onNote,
  abortController,
  taskRegistry,
  emitToolProgress,
  session,
  preventCwdChanges,
  isMainThread,
  subagentCapMs,
  toolUseId,
  agentId,
  caller,
  shellWallCapMs,
  promptShellPluginId,
  agentWorktree,
  isolationRoot,
  sessionEnvVars,
  toolState,
}) {
  let { command, description, timeout, run_in_background } = input;
  let ne = isBackgroundTasksOff() || constraints?.background === "forbidden" || backgroundHeld?.() === true;
  let de = run_in_background === true && !ne;
  let oe =
    shellWallCapMs !== undefined
      ? Math.min(timeout || psMaxTimeoutMs(), shellWallCapMs, constraints?.maxTimeoutMs ?? 1 / 0)
      : Math.min(
          timeout || psDefaultTimeoutMs(),
          de ? getBackgroundTimeoutCapMs() : psMaxTimeoutMs(),
          constraints?.maxTimeoutMs ?? 1 / 0,
        );
  if (timeout && oe < timeout)
    onNote?.({
      key: "timeout_clamped",
      requestedMs: timeout,
      appliedMs: oe,
    });
  let fullOutput = "";
  let lastProgressOutput = "";
  let lastTotalLines = 0;
  let lastTotalBytes = 0;
  let backgroundShellId = undefined;
  let timedOutAfterMs = undefined;
  let interruptBackgroundingStarted = false;
  let me = () => abortController.signal.aborted && isTurnLevelAbort(abortController.signal.reason, caller);
  let resolveProgress = null;
  function createProgressSignal() {
    return new Promise((resolve) => {
      resolveProgress = () => resolve(null);
    });
  }
  using A = onAbortDisposable(abortController.signal, () => {
    if (!me()) return;
    let Z = resolveProgress;
    if (Z) {
      resolveProgress = null;
      Z();
    }
  });
  let L = !ne && (await isAutobackgroundingAllowed(command));
  let j = !ne;
  let F = effectiveShellTimeoutMs({
    requestedTimeoutMs: oe,
    isMainAgent: isMainThread === true,
    canAutoBackground: L,
    subagentCapMs: de ? 0 : subagentCapMs,
  });
  let K = isMainThread !== true && F < oe ? true : undefined;
  if (!(await getCachedPowerShellPath()))
    return {
      stdout: "",
      stderr: "PowerShell is not available on this system.",
      code: 0,
      interrupted: false,
    };
  let shellCommand;
  try {
    shellCommand = await exec(command, abortController.signal, "powershell", {
      timeout: F,
      owningAgentId: agentId,
      caller,
      turnAbortBackgrounds: j,
      sandboxAttributionId: toolUseId,
      sandboxNetworkLists: networkLists,
      onProgress(lastLines, allLines, totalLines, totalBytes, isIncomplete) {
        lastProgressOutput = lastLines;
        fullOutput = allLines;
        lastTotalLines = totalLines;
        lastTotalBytes = isIncomplete ? totalBytes : 0;
      },
      session,
      preventCwdChanges,
      ...(constraints?.scrubCredentialEnv && {
        scrubCredentialEnv: true,
      }),
      ...(constraints?.sandbox === "required" && {
        requireConfiningSandbox: true,
      }),
      sandboxDenyRead: constraints?.additionalDenyRead,
      sandboxDenyWrite: constraints?.additionalDenyWrite,
      agentWorktree,
      isolationRoot,
      shouldUseSandbox: useSandbox,
      shouldAutoBackground: L,
      sessionEnvVars,
      ...(isNpmPluginSourcePath(promptShellPluginId) && {
        bunOptionsFor: (Z) => bunOptionsGuard(promptShellPluginId, Z),
      }),
    });
  } catch (error) {
    if (isAbortError(error))
      return {
        stdout: "",
        stderr: "Command aborted before execution",
        code: 145,
        interrupted: true,
      };
    if (error instanceof Error && KNOWN_ERROR_CLASS_NAMES.has(error.name)) throw error;
    if (isSyscallError(error)) {
      logForDebugging(`PowerShellTool: exec spawn failed: ${error}`);
      return {
        stdout: "",
        stderr: `Failed to execute PowerShell command: ${errorMessage(error)}`,
        code: 0,
        interrupted: false,
      };
    }
    logError(withTelemetryMessage(toError(error), "PowerShell exec() pre-spawn setup failed"));
    return {
      stdout: "",
      stderr: `Failed to execute PowerShell command: ${errorMessage(error)}`,
      code: 0,
      interrupted: false,
    };
  }
  let J =
    shellCommand.status !== "killed"
      ? claimViolationReport(POWERSHELL_TOOL_NAME, command, toolState, {
          useSandbox,
        })
      : null;
  let resultPromise = shellCommand.result;
  if (J)
    resultPromise
      .then((Z) => {
        if (Z.preSpawnError) J();
      })
      .catch(() => {});
  async function spawnBackgroundTask(timeout) {
    return (
      await backgroundShellCommand(
        {
          command,
          shell: "powershell",
          description: description || command,
          shellCommand,
          toolUseId,
          agentId,
          timeout,
        },
        {
          abortController,
          taskRegistry,
        },
      )
    ).taskId;
  }
  function startBackgrounding(eventName, backgroundFn, ye) {
    if (backgroundHeld?.() === true) {
      onHeldEnd?.();
      shellCommand.kill();
      return;
    }
    if (foregroundTaskId) {
      if (
        !backgroundExistingForegroundTask(
          foregroundTaskId,
          shellCommand,
          description || command,
          taskRegistry,
          toolUseId,
        )
      )
        return;
      backgroundShellId = foregroundTaskId;
      logEvent(eventName, {
        command_type: fromEnum(classifyPowerShellCommand(command)),
        ...ye,
      });
      backgroundFn?.(foregroundTaskId);
      return;
    }
    spawnBackgroundTask().then((shellId) => {
      backgroundShellId = shellId;
      let resolve = resolveProgress;
      if (resolve) {
        resolveProgress = null;
        resolve();
      }
      logEvent(eventName, {
        command_type: fromEnum(classifyPowerShellCommand(command)),
        ...ye,
      });
      if (backgroundFn) backgroundFn(shellId);
    });
  }
  if (shellCommand.onTimeout && L)
    shellCommand.onTimeout((backgroundFn) => {
      timedOutAfterMs = F;
      startBackgrounding("tengu_powershell_command_timeout_backgrounded", backgroundFn, {
        timeout_ms: F,
        requested_timeout_ms: timeoutWhenPositive(timeout, oe) ?? 0,
        subagent_cap_applied: K === true,
      });
    });
  if (de && shellCommand.status !== "killed") {
    if (shellCommand.status === "completed") {
      let ye = await resultPromise;
      if (ye.preSpawnError) return ye;
    }
    let timeout_2 = timeoutWhenPositive(timeout, oe);
    let shellId = await spawnBackgroundTask(timeout_2);
    logEvent("tengu_powershell_command_explicitly_backgrounded", {
      command_type: fromEnum(classifyPowerShellCommand(command)),
      timeout_ms: timeout_2 ?? 0,
    });
    return {
      stdout: "",
      stderr: "",
      code: 0,
      interrupted: false,
      backgroundTaskId: shellId,
    };
  }
  TaskOutput.startPolling(shellCommand.taskOutput.taskId);
  let startTime = Date.now();
  let nextProgressTime = startTime + PROGRESS_THRESHOLD_MS;
  let foregroundTaskId = undefined;
  let ze = null;
  try {
    while (true) {
      let now = Date.now();
      let timeUntilNextProgress = Math.max(0, nextProgressTime - now);
      let ye;
      if (!interruptBackgroundingStarted && me()) ye = Promise.resolve(null);
      else ye = createProgressSignal();
      let result = await Promise.race([
        resultPromise,
        new Promise((resolve) => setTimeout((Le) => Le(null), timeUntilNextProgress, resolve).unref()),
        ye,
      ]);
      if (result !== null) {
        ze = result;
        if (result.backgroundTaskId !== undefined) {
          if (markTaskNotified(result.backgroundTaskId, result, taskRegistry))
            emitTaskNotification(
              result.backgroundTaskId,
              shellStatusForDisplay(result, {
                command,
                shell: "powershell",
              }),
              {
                toolUseId,
                summary: description || command,
              },
            );
          let fixedResult = {
            ...result,
            backgroundTaskId: undefined,
          };
          let { taskOutput } = shellCommand;
          if (taskOutput.stdoutToFile && !taskOutput.outputFileRedundant) {
            fixedResult.outputFilePath = taskOutput.path;
            fixedResult.outputFileSize = taskOutput.outputFileSize;
            fixedResult.outputTaskId = taskOutput.taskId;
          }
          return fixedResult;
        }
        return result;
      }
      if (backgroundShellId)
        return {
          stdout: interruptBackgroundingStarted ? fullOutput : "",
          stderr: "",
          code: 0,
          interrupted: false,
          backgroundTaskId: backgroundShellId,
          ...(me() && {
            backgroundedByTurnAbort: true,
          }),
          timedOutAfterMs,
          subagentCapApplied: K,
        };
      if (
        abortController.signal.aborted &&
        (unwrapAbortReason(abortController.signal.reason) === "interrupt" || me()) &&
        !interruptBackgroundingStarted
      ) {
        interruptBackgroundingStarted = true;
        if (L || (me() && j)) {
          startBackgrounding(
            me()
              ? "tengu_powershell_command_turn_abort_backgrounded"
              : "tengu_powershell_command_interrupt_backgrounded",
          );
          continue;
        }
        shellCommand.kill();
        continue;
      }
      if (foregroundTaskId) {
        if (shellCommand.status === "backgrounded")
          return {
            stdout: "",
            stderr: "",
            code: 0,
            interrupted: false,
            backgroundTaskId: foregroundTaskId,
            ...(wasBackgroundedToDeliverMessage(foregroundTaskId, taskRegistry)
              ? {
                  backgroundedToDeliverMessage: true,
                }
              : {
                  backgroundedByUser: true,
                }),
          };
      }
      let elapsed = Date.now() - startTime;
      let elapsedSeconds = Math.floor(elapsed / 1000);
      if (
        !ne &&
        !interruptBackgroundingStarted &&
        backgroundShellId === undefined &&
        elapsedSeconds >= PROGRESS_THRESHOLD_MS / 1000
      ) {
        if (!foregroundTaskId)
          foregroundTaskId = registerForeground(
            {
              command,
              shell: "powershell",
              description: description || command,
              shellCommand,
              agentId,
              caller,
              autoBackgroundArmed: L,
            },
            taskRegistry,
            toolUseId,
          );
        if (toolUseId)
          emitToolProgress?.({
            kind: "background_hint",
            toolUseId,
          });
      }
      yield {
        type: "progress",
        fullOutput,
        output: lastProgressOutput,
        elapsedTimeSeconds: elapsedSeconds,
        totalLines: lastTotalLines,
        totalBytes: lastTotalBytes,
        taskId: shellCommand.taskOutput.taskId,
        ...(timeout
          ? {
              timeoutMs: F,
            }
          : undefined),
      };
      nextProgressTime = Date.now() + AUTO_BACKGROUND_GRACE_MS;
    }
  } finally {
    TaskOutput.stopPolling(shellCommand.taskOutput.taskId);
    if (!backgroundShellId && shellCommand.status !== "backgrounded") {
      if (foregroundTaskId)
        unregisterForeground(
          foregroundTaskId,
          ze
            ? shellStatusForDisplay(ze, {
                command,
                shell: "powershell",
              })
            : "stopped",
          taskRegistry,
        );
      shellCommand.cleanup();
    }
  }
}
//@ chunk-5ghnps9r.js:562-634 placement
/**
 * 读取 tengu_violin_table 开关，读取异常时返回 false。
 */
function isViolinTableFlagOn() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_table", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-5ghnps9r.js:634-707 placement
/**
 * 结果为 needs_approval 时返回其建议规则列表。
 */
function needsApprovalSuggestions(envelope) {
  return envelope.outcome === "needs_approval" ? (envelope.suggestions ?? []) : [];
}
//@ chunk-5ghnps9r.js:707-935 placement
/**
 * 若规则列表只有一条该工具的前缀/通配规则（非精确匹配），返回其工具名与规则内容。
 */
function singlePrefixRuleFor(e, o) {
  let [t, ...r] = e;
  if (t === undefined || r.length > 0 || !isShellToolName(o)) return;
  let { toolName, ruleContent } = permissionRuleValueFromString(t);
  return toolName === o &&
    ruleContent !== undefined &&
    formatPermissionRule({
      toolName: o,
      ruleContent,
    }) === t &&
    parseShellPermissionRule(ruleContent).type !== "exact"
    ? {
        toolName: o,
        ruleContent,
      }
    : undefined;
}
export { isViolinTableFlagOn, singlePrefixRuleFor, needsApprovalSuggestions };
