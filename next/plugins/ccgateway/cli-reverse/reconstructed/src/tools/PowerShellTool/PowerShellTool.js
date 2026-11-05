/**
 * tools/PowerShellTool/PowerShellTool.tsx
 *
 * PowerShell 工具定义与执行：schema、validateInput（不可见字符、沙箱、Start-Sleep）、checkPermissions（含沙箱外运行确认）、runPowerShellCommand
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/PowerShellTool/PowerShellTool.tsx
 * pieces: chunk-6zpsr8vx.js (12), chunk-azq8n2fy.js (3)
 * attribution: fingerprint 6, placement 4, file-local 1, layout 4
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
import {
  zodStrictObject,
  stringSchema,
  numberSchema,
  booleanSchema,
  objectSchema,
  literal,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { READ } from "../FileReadTool/constants.js";
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
import {
  parseRuleString,
  permissionRuleValueFromString,
} from "../../utils/permissions/permissionRuleParser.js";

//@ chunk-6zpsr8vx.js:90684-90968 fingerprint (2.1.88 match: PS_READ_COMMANDS, 0.818)
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
//@ chunk-6zpsr8vx.js:90968-91396 placement (2.1.88 match: classifyMcpToolForCollapse, 1)
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
  let sawRealCommand = false;
  for (let segment of filtered) {
    let firstToken = segment.trim().split(/\s+/)[0];
    if (!firstToken) continue;
    let normalized = resolveToCanonical(firstToken);
    if (PS_SEMANTIC_NEUTRAL_COMMANDS.has(normalized)) continue;
    sawRealCommand = true;
    let isSearchCmd = PS_SEARCH_COMMANDS.has(normalized);
    let isReadCmd = PS_READ_COMMANDS.has(normalized);
    if (!isSearchCmd && !isReadCmd)
      return {
        isSearch: false,
        isRead: false,
      };
    if (isSearchCmd) isSearch = true;
    if (isReadCmd) isRead = true;
  }
  if (!sawRealCommand)
    return {
      isSearch: false,
      isRead: false,
    };
  return {
    isSearch,
    isRead,
  };
}
//@ chunk-6zpsr8vx.js:91396-91443 fingerprint (2.1.88 match: DISALLOWED_AUTO_BACKGROUND_COMMANDS, 1)
/**
 * 超时后自动转后台的等待时间（1000 毫秒）。
 */
var PROGRESS_THRESHOLD_MS = 2000;
var AUTO_BACKGROUND_GRACE_MS = 1000;
var DISALLOWED_AUTO_BACKGROUND_COMMANDS = ["start-sleep", "sleep"];
//@ chunk-6zpsr8vx.js:91443-91544 file-local
/**
 * 首个命令（按别名解析为规范 cmdlet）不是 start-sleep/sleep 时允许超时自动转后台。
 */
async function isAutobackgroundingAllowed(command) {
  let firstWord = command.trim().split(/\s+/)[0];
  if (!firstWord) return true;
  let canonical = resolveToCanonical(firstWord);
  return !DISALLOWED_AUTO_BACKGROUND_COMMANDS.includes(canonical);
}
//@ chunk-6zpsr8vx.js:91544-91880 fingerprint (2.1.88 match: detectBlockedSleepPattern, 1)
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
//@ chunk-6zpsr8vx.js:91880-92007 layout
/**
 * PowerShell 版 shouldUseSandbox（shellType=powershell）。
 */
function shouldUsePowerShellSandbox(input, sandboxContext) {
  return shouldUseSandbox(
    {
      command: input.command,
      dangerouslyDisableSandbox: input.dangerouslyDisableSandbox,
      shellType: "powershell",
    },
    sandboxContext,
  );
}
//@ chunk-6zpsr8vx.js:92007-92044 layout
function isWindowsPlatform() {
  return getPlatform() === "windows";
}
//@ chunk-6zpsr8vx.js:92044-94845 fingerprint (2.1.88 match: outputSchema, 0.539)
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
    command: stringSchema()
      .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_MESSAGE)
      .describe("The PowerShell command to execute"),
    timeout: coercedNumberSchema(numberSchema().optional()).describe(
      `Optional timeout in milliseconds (max ${psMaxTimeoutMs()} for a foreground command)`,
    ),
    description: stringSchema()
      .optional()
      .describe("Clear, concise description of what this command does in active voice."),
    run_in_background: booleanishSchema(booleanSchema().optional()).describe(getRunInBackgroundDescription()),
    dangerouslyDisableSandbox: booleanishSchema(booleanSchema().optional()).describe(
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
  objectSchema({
    stdout: stringSchema().describe("The standard output of the command"),
    stderr: stringSchema().describe("The standard error output of the command"),
    interrupted: booleanSchema().describe("Whether the command was interrupted"),
    returnCodeInterpretation: stringSchema()
      .optional()
      .describe("Semantic interpretation for non-error exit codes with special meaning"),
    isImage: booleanSchema().optional().describe("Flag to indicate if stdout contains image data"),
    persistedOutputPath: stringSchema()
      .optional()
      .describe("Path to persisted full output when too large for inline"),
    persistedOutputSize: numberSchema().optional().describe("Total output size in bytes when persisted"),
    backgroundTaskId: stringSchema()
      .optional()
      .describe("ID of the background task if command is running in background"),
    backgroundedByUser: booleanSchema()
      .optional()
      .describe("True if the user manually backgrounded the command with Ctrl+B"),
    backgroundedByTurnAbort: booleanSchema()
      .optional()
      .describe("@internal True if a plugin's turn abort moved the running command to the background"),
    backgroundedToDeliverMessage: booleanSchema()
      .optional()
      .describe(
        "@internal True if the command was moved to the background so a message queued for the model could reach it",
      ),
    timedOutAfterMs: numberSchema()
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
//@ chunk-6zpsr8vx.js:94845-94909 layout
/**
 * PowerShell 只读判定：无同步安全隐患（hasSyncSecurityConcerns）且 isReadOnlyCommand。
 */
function isReadOnlyPowerShellInput(input) {
  if (hasSyncSecurityConcerns(input.command)) return false;
  return isReadOnlyCommand(input.command);
}
//@ chunk-6zpsr8vx.js:94909-96090 layout
function makeShellCallContext(baseContext, callOptions) {
  return {
    get session() {
      return baseContext.session;
    },
    get storageV5() {
      return baseContext.storageV5;
    },
    get agentId() {
      return baseContext.agentId;
    },
    get agentContext() {
      return baseContext.agentContext;
    },
    get agentWorktree() {
      return baseContext.agentWorktree;
    },
    get hookCaller() {
      return baseContext.hookCaller;
    },
    get hookServesModel() {
      return baseContext.hookServesModel;
    },
    get pluginUnnamed() {
      return baseContext.pluginUnnamed;
    },
    get taskRegistry() {
      return baseContext.taskRegistry;
    },
    get toolState() {
      return baseContext.toolState;
    },
    get applyFileHistoryOp() {
      return baseContext.applyFileHistoryOp;
    },
    get sessionEnvVars() {
      return baseContext.sessionEnvVars;
    },
    get markPrResolvedThisSession() {
      return baseContext.markPrResolvedThisSession;
    },
    emitToolProgress: baseContext.emitToolProgress,
    get shellPermission() {
      return {
        ...baseContext.shellPermission,
        abortController: {
          signal: callOptions.signal,
        },
        toolUseId: callOptions.toolUseId,
      };
    },
    get mainLoopModel() {
      return baseContext.mainLoopModel;
    },
    get permissions() {
      return baseContext.permissions;
    },
    get hasSpendCap() {
      return baseContext.hasSpendCap;
    },
    get toolUseId() {
      return callOptions.toolUseId;
    },
    get userTypedShellDispatch() {
      return callOptions.userTypedShellDispatch === true;
    },
    get abortController() {
      return {
        signal: callOptions.signal,
      };
    },
    get innerCall() {
      return callOptions.innerCall;
    },
    get shellWallCapMs() {
      return callOptions.shellWallCapMs;
    },
    get promptShellPluginId() {
      return callOptions.promptShellPluginId;
    },
    get remoteCall() {
      return callOptions.remoteCall;
    },
  };
}
//@ chunk-6zpsr8vx.js:96090-106476 fingerprint (2.1.88 match: PowerShellTool, 0.456)
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
  suppressesAllPermissionUpdates(input) {
    return hasHostField(input);
  },
  isSearchOrReadCommand(input) {
    if (typeof input?.command !== "string")
      return {
        isSearch: false,
        isRead: false,
      };
    return isSearchOrReadPowerShellCommand(input.command);
  },
  isReadOnly(input) {
    return isReadOnlyPowerShellInput(input);
  },
  sandboxNetworkLists(input) {
    return getCommandNetworkLists(input);
  },
  toAutoClassifierInput(input) {
    let dangerouslyDisableSandbox = input.dangerouslyDisableSandbox;
    let unusedFlag = false;
    let hostCandidate = remoteRoutingCandidate(input);
    let networkLists = commandNetworkListsInput(input);
    if (hostCandidate !== undefined || networkLists !== undefined)
      return {
        command: input.command,
        ...false,
        ...(hostCandidate !== undefined && {
          [HOST_TOOL_INPUT_FIELD]: hostCandidate,
        }),
        ...networkLists,
      };
    return input.command;
  },
  async preparePermissionMatcher({ command }) {
    let powerShellCommand = await parsePowerShellCommand(command);
    if (!powerShellCommand.valid) return () => true;
    let flattened = getAllCommands(powerShellCommand).flatMap((command) => {
      let joined = [command.name, ...command.args].join(" ");
      let joined_2 = [resolveToCanonical(command.name), ...command.args].join(" ");
      return joined.toLowerCase() === joined_2 ? [joined] : [joined, joined_2];
    });
    return (ruleContent) => {
      let rulePrefix = permissionRuleExtractPrefix(ruleContent);
      return flattened.some((candidate) => {
        if (rulePrefix !== null) {
          let lower = rulePrefix.toLowerCase();
          let lower_2 = candidate.toLowerCase();
          return lower_2 === lower || lower_2.startsWith(`${lower} `);
        }
        return matchWildcardPattern(ruleContent, candidate, true, true);
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
    let backgroundNotice = backgroundTaskId
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
          readToolName: READ,
        })
      : "";
    if (backgroundTaskId && isInputHoldOn())
      return {
        tool_use_id: toolUseID,
        type: "tool_result",
        content: backgroundTaskNotice(
          backgroundTaskId,
          [errorMessage, backgroundNotice].filter(Boolean).join(`
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
      content: [processedStdout, errorMessage, backgroundNotice].filter(Boolean).join(`
`),
      is_error: interrupted,
    };
  },
  create(toolContext) {
    return {
      async validateInput(input, callOptions) {
        if (canRunToolsOnThisMachine() && hasHostField(input))
          return {
            result: false,
            message: hostFieldNotForwardedMessage(),
            errorCode: 12,
          };
        if (hasInvisibleCommandChars(input.command))
          return {
            result: false,
            message: INVISIBLE_CHAR_REFUSAL,
            errorCode: 13,
          };
        let sandboxRefusal = sandboxPolicyRefusal(
          shouldUsePowerShellSandbox(input),
          input.command,
          false,
          "powershell",
        );
        if (sandboxRefusal !== null) {
          logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
            tool: lit("powershell"),
          });
          return {
            result: false,
            message: sandboxRefusal,
            errorCode: 11,
          };
        }
        let domainRefusal = checkAllowedDomainsInput(input, shouldUsePowerShellSandbox(input));
        if (domainRefusal !== undefined) return domainRefusal;
        if (
          isBashAvailable() &&
          !isBackgroundTasksOff() &&
          backgroundCompletionNoticeEnabled() &&
          callOptions.remoteCall?.constraints.background !== "forbidden" &&
          !input.run_in_background &&
          callOptions.shellWallCapMs === undefined
        ) {
          let blockedSleepPattern = detectBlockedSleepPattern(input.command);
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
      permissionCheckFailureDecision(input, callOptions) {
        let shellCallContext = makeShellCallContext(toolContext, callOptions);
        return denyCrashedCheckUnderCommandClamp(shellCallContext.shellPermission);
      },
      async checkPermissions(input, callOptions) {
        let shellCallContext = makeShellCallContext(toolContext, callOptions);
        let decision = await checkPowerShellPermissions(input, shellCallContext.shellPermission);
        if (
          input.dangerouslyDisableSandbox &&
          decision.behavior !== "deny" &&
          !isAllRuleReason(decision.decisionReason) &&
          !shouldUsePowerShellSandbox(input) &&
          shouldUsePowerShellSandbox({
            ...input,
            dangerouslyDisableSandbox: false,
          }) &&
          (decision.behavior !== "ask" || shouldRetagAskAsSandboxOverride(decision))
        ) {
          let hookResult = noopToolUseHook({
            toolName: POWERSHELL_TOOL_NAME,
            input,
            context: shellCallContext.shellPermission,
          });
          if (hookResult) return hookResult;
          if (decision.behavior !== "ask")
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
                decisionReason: decision.decisionReason,
                message: decision.message,
                blockedPath: decision.blockedPath,
              },
            },
            message: "Run outside of the sandbox",
          };
        }
        return decision;
      },
      async call(input, callOptions) {
        let shellCallContext = makeShellCallContext(toolContext, callOptions);
        let { onProgress } = callOptions;
        let model = safeRequestedModelName(callOptions.parentMessage, shellCallContext.mainLoopModel());
        let userTypedShellDispatch = shellCallContext.userTypedShellDispatch;
        let constraints = shellCallContext.remoteCall?.constraints;
        let sandboxRequired = constraints?.sandbox === "required";
        let useSandbox = shouldUsePowerShellSandbox(input, {
          userTypedShellDispatch,
          disableUnsandboxedCommands: sandboxRequired,
        });
        if (!userTypedShellDispatch && hasInvisibleCommandChars(input.command))
          throw new MalformedCommandError(INVISIBLE_CHAR_REFUSAL);
        let sandboxRefusal = sandboxPolicyRefusal(
          useSandbox,
          input.command,
          userTypedShellDispatch && input.dangerouslyDisableSandbox === true,
          "powershell",
        );
        if (sandboxRefusal !== null) {
          logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
            tool: lit("powershell"),
          });
          throw new SandboxPolicyRefusalError(sandboxRefusal);
        }
        if (sandboxRequired) {
          let sandboxPosture =
            !useSandbox || getEffectiveFilesystemPolicy() !== "strict" || isScrubEnabled()
              ? {
                  confined: false,
                  reason: "sandbox_unconfined",
                }
              : await ensureDeviceSandboxPosture();
          if (!sandboxPosture.confined) {
            logFeatureSad("sandbox_exec", "remote_floor_refusal");
            throw new SandboxPolicyRefusalError(
              "This call must run inside a fully confining sandbox and none is available here. The command was not run.",
              sandboxPosture.reason,
            );
          }
        }
        let { abortController, emitToolProgress } = shellCallContext;
        let isMainThread = !shellCallContext.agentId;
        let preventCwdChanges = !isMainThread || constraints?.pinCwd === true;
        let progressCounter = 0;
        await using outputTracker = copyShellOutputFile(shellCallContext.taskRegistry);
        let heldForPlugin = false;
        try {
          let commandGenerator = runPowerShellCommand({
            input,
            useSandbox,
            networkLists: takeCommandNetworkLists(shellCallContext.toolUseId, input.command),
            constraints,
            backgroundHeld: () => shouldHoldForPlugin(shellCallContext),
            onHeldEnd: () => {
              heldForPlugin = true;
            },
            onNote: shellCallContext.remoteCall?.onNote,
            abortController,
            taskRegistry: shellCallContext.taskRegistry,
            emitToolProgress,
            session: shellCallContext.session,
            preventCwdChanges,
            isMainThread,
            subagentCapMs: getSubagentForegroundCapMs(shellCallContext, callOptions.parentMessage),
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
          let reportProgress = shouldUseShellTool(
            shellCallContext.remoteCall !== undefined,
            shellCallContext.hasSpendCap,
          )
            ? onProgress
            : undefined;
          let generatorResult;
          do {
            generatorResult = await commandGenerator.next();
            if (!generatorResult.done && reportProgress) {
              let progress = generatorResult.value;
              reportProgress({
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
          let finalYield = generatorResult.value;
          outputTracker.track(finalYield);
          let stderrOnlySuccess =
            finalYield.code === 0 && !finalYield.stdout && finalYield.stderr && !finalYield.backgroundTaskId;
          let sandboxViolations =
            useSandbox && !stderrOnlySuccess && !finalYield.backgroundTaskId && shellCallContext.toolUseId
              ? getParsedSandboxViolations(shellCallContext.toolUseId)
              : undefined;
          let sandboxed = stderrOnlySuccess ? undefined : useSandbox;
          let output = await withSpilledOutputTail(finalYield.stdout, finalYield.outputFilePath);
          if (
            !stderrOnlySuccess &&
            !finalYield.backgroundTaskId &&
            trackGitOperations(shellCallContext.session.host, input.command, finalYield.code, output)
              .prResolved
          )
            shellCallContext.markPrResolvedThisSession();
          let powerShellDestructiveCategory = getPowerShellDestructiveCategory(input.command);
          let abortReason = unwrapAbortReason(abortController.signal.reason);
          let interruptedByInterrupt = finalYield.interrupted && abortReason === "interrupt";
          let interrupted = finalYield.interrupted && isUserInitiatedAbortReason(abortReason);
          if (finalYield.interrupted && abortReason === "background") throw new AbortError();
          let resetNotice = "";
          let cwd = getSessionProject(shellCallContext.session).cwd;
          if (!preventCwdChanges) {
            if (
              resetCwdIfOutsideProject(shellCallContext.session, shellCallContext.permissions()) ||
              finalYield.cwdChangeRefused
            )
              resetNotice = stdErrAppendShellResetMessage("");
          }
          let endsWithFinalResponse =
            finalYield.backgroundTaskId !== undefined &&
            (reapsShellsOnExit(shellCallContext.agentContext) ||
              (shellCallContext.agentId === undefined && isPrintWithoutTidySloth()))
              ? true
              : undefined;
          if (finalYield.backgroundTaskId) {
            let stdout = consumeClaudeCodeHints(
              finalYield.timedOutAfterMs !== undefined && shellCallContext.innerCall !== true
                ? await readShellOutputSoFar(finalYield.backgroundTaskId, PREVIEW_SIZE_CHARS)
                : finalYield.stdout || "",
              {
                command: input.command,
                pendingHint: shellCallContext.session.pendingHint,
                isMainThread,
                surface: "shell",
              },
            );
            if (isInputHoldOn())
              logEvent("tengu_bash_task_ack", {
                trigger: finalYield.backgroundedByUser
                  ? lit("user")
                  : finalYield.backgroundedByTurnAbort
                    ? lit("turn_abort")
                    : finalYield.backgroundedToDeliverMessage
                      ? lit("deliver_message")
                      : finalYield.timedOutAfterMs !== undefined
                        ? lit("timeout")
                        : lit("explicit"),
                ends_with_final_response: endsWithFinalResponse === true,
                shell: lit("powershell"),
              });
            return {
              data: {
                stdout,
                stderr: [finalYield.stderr || "", resetNotice].filter(Boolean).join(`
`),
                interrupted: false,
                backgroundTaskId: finalYield.backgroundTaskId,
                backgroundedByUser: finalYield.backgroundedByUser,
                backgroundedByTurnAbort: finalYield.backgroundedByTurnAbort,
                backgroundedToDeliverMessage: finalYield.backgroundedToDeliverMessage,
                timedOutAfterMs: finalYield.timedOutAfterMs,
                subagentCapApplied: finalYield.subagentCapApplied,
                backgroundEndsWithFinalResponse: endsWithFinalResponse,
              },
              ...(sandboxed !== undefined && {
                sandboxed,
              }),
            };
          }
          let stdoutAccumulator = new EndTruncatingAccumulator();
          let trimmedStdout = (finalYield.stdout || "").trimEnd();
          stdoutAccumulator.append(trimmedStdout + NEWLINE);
          let interpretation = interpretCommandResult(
            input.command,
            finalYield.code,
            trimmedStdout,
            finalYield.stderr || "",
          );
          let stdout = trimBlankEdgeLines(stdoutAccumulator.toString());
          stdout = consumeClaudeCodeHints(stdout, {
            command: input.command,
            pendingHint: shellCallContext.session.pendingHint,
            isMainThread,
            surface: "shell",
          });
          if (finalYield.preSpawnError) {
            let spawnError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              finalYield.preSpawnError,
              "PowerShell: pre-spawn error (cwd/argv redacted)",
            );
            throw finalYield.preSpawnErrorCode === "e2big"
              ? tagObject(spawnError, {
                  kind: "spawn_arg_limit",
                })
              : spawnError;
          }
          if (interpretation.isError && !interruptedByInterrupt) {
            let stdoutExcerpt =
              trimmedStdout.length <= 8192
                ? trimmedStdout
                : trimmedStdout.slice(0, 4096) + trimmedStdout.slice(-4096);
            let errorClass = classifyPowerShellError(stdoutExcerpt, finalYield.code);
            logEvent("tengu_powershell_tool_command_failed", {
              model,
              command_type: fromEnum(classifyPowerShellCommand(input.command)),
              exit_code: finalYield.code,
              stdout_length: trimmedStdout.length,
              error_class: sanitizedMachineReasonForTelemetry(errorClass),
              not_recognized_kind:
                errorClass === "not_recognized" || errorClass === "command_not_found"
                  ? fromEnum(classifyNotRecognizedCommand(stdoutExcerpt) ?? "unextracted")
                  : undefined,
              parser_error_kind:
                errorClass === "parser_error" || errorClass === "ps5_chain_op"
                  ? fromEnum(classifyPowerShellParseErrorKind(stdoutExcerpt) ?? "unextracted")
                  : undefined,
              bash_syntax_shape: fromEnum(detectBashSyntax(input.command)),
              powershell_edition: fromEnum((await getPowerShellEditionAsync()) ?? "unknown"),
              user_typed_shell_dispatch: userTypedShellDispatch,
              call_origin: fromEnum(constraints ? "remote" : "local"),
              destructive_category: fromEnum(powerShellDestructiveCategory ?? "none"),
              destructive_target_scope: fromEnum(
                classifyDestructiveTargetScope(input.command, getCwd(), powerShellDestructiveCategory),
              ),
              permission_mode: fromEnum(shellCallContext.permissions().mode),
            });
            throw new ShellError({
              stdout,
              stderr: heldForPlugin
                ? `${(finalYield.stderr || "").trimEnd()}

${ENDED_INSTEAD_OF_BACKGROUND_MESSAGE}`
                : finalYield.stderr || "",
              code: finalYield.code,
              interrupted,
              sandboxViolations,
              sandboxed,
            });
          }
          let toolResultsDir;
          let toolResultPath;
          if (finalYield.outputFilePath && finalYield.outputTaskId) {
            let resultsDir;
            let outputPath;
            try {
              let originalCwd = getOriginalCwd_2(shellCallContext.session);
              resultsDir = await ensureToolResultsDir(originalCwd, shellCallContext.storageV5);
              let toolResultFilePath = getToolResultFilePath(originalCwd, finalYield.outputTaskId, false);
              let storageKey =
                isStorageV5Enabled() && shellCallContext.storageV5 !== undefined
                  ? toolResultsKey(dirname(toolResultFilePath), basename(toolResultFilePath))
                  : undefined;
              let storeOutput = true;
              if (
                isStorageV5Enabled() &&
                shellCallContext.storageV5 !== undefined &&
                storageKey !== undefined
              ) {
                let persistedPath = await persistShellOutput(
                  shellCallContext.storageV5,
                  storageKey,
                  finalYield.outputFilePath,
                  MAX_PERSISTED_OUTPUT_BYTES,
                  getTaskOutputRootDir(),
                );
                storeOutput = persistedPath === "today";
                if (typeof persistedPath === "number") {
                  toolResultsDir = toolResultFilePath;
                  toolResultPath = persistedPath;
                }
              }
              if (storeOutput) {
                toolResultPath = await persistTaskOutputSnapshot(
                  finalYield.outputFilePath,
                  toolResultFilePath,
                  MAX_PERSISTED_OUTPUT_BYTES,
                );
                toolResultsDir = toolResultFilePath;
              }
            } catch (error) {
              outputPath = error;
            }
            if (toolResultsDir === undefined) outputTracker.copyFailed(outputPath, resultsDir);
          }
          let isImage = isBase64DataUri(stdout);
          let compressedStdout = stdout;
          if (isImage) {
            let resized = await resizeShellImageOutput(
              stdout,
              finalYield.outputFilePath,
              toolResultPath,
              imageLimitsForModel(shellCallContext.mainLoopModel()),
            );
            if (resized) compressedStdout = resized;
            else isImage = false;
          }
          let finalStderr = [finalYield.stderr || "", resetNotice].filter(Boolean).join(`
`);
          let gitOperation;
          if (!stderrOnlySuccess) {
            let gitOperation_2 = detectGitOperation(input.command, output);
            if (Object.keys(gitOperation_2).length > 0) gitOperation = gitOperation_2;
            if (!shellCallContext.remoteCall)
              emitVcsStateChanges(gitOperation_2, output, {
                command: input.command,
                exitCode: finalYield.code,
                cwd,
              });
          }
          logEvent("tengu_powershell_tool_command_executed", {
            model,
            command_type: fromEnum(classifyPowerShellCommand(input.command)),
            stdout_length: compressedStdout.length,
            stderr_length: finalStderr.length,
            exit_code: finalYield.code,
            interrupted: finalYield.interrupted,
            powershell_edition: fromEnum((await getPowerShellEditionAsync()) ?? "unknown"),
            user_typed_shell_dispatch: userTypedShellDispatch,
            call_origin: fromEnum(constraints ? "remote" : "local"),
            destructive_category: fromEnum(powerShellDestructiveCategory ?? "none"),
            destructive_target_scope: fromEnum(
              classifyDestructiveTargetScope(input.command, getCwd(), powerShellDestructiveCategory),
            ),
            permission_mode: fromEnum(shellCallContext.permissions().mode),
          });
          return {
            data: {
              stdout: compressedStdout,
              stderr: finalStderr,
              interrupted: finalYield.interrupted,
              returnCodeInterpretation: interpretation.message,
              isImage,
              persistedOutputPath: toolResultsDir,
              persistedOutputSize: toolResultPath,
              gitOperation,
            },
            ...(sandboxViolations !== undefined && {
              sandboxViolations,
            }),
            ...(sandboxed !== undefined && {
              sandboxed,
            }),
          };
        } finally {
          if (shellCallContext.toolUseId)
            emitToolProgress?.({
              kind: "clear",
              toolUseId: shellCallContext.toolUseId,
            });
          if (!isReadOnlyPowerShellInput(input))
            shellCallContext.applyFileHistoryOp({
              kind: "touch",
            });
        }
      },
    };
  },
});
//@ chunk-6zpsr8vx.js:106476-111489 fingerprint (2.1.88 match: runPowerShellCommand, 0.559)
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
  let backgroundForbidden =
    isBackgroundTasksOff() || constraints?.background === "forbidden" || backgroundHeld?.() === true;
  let shouldRunInBackground = run_in_background === true && !backgroundForbidden;
  let effectiveTimeoutMs =
    shellWallCapMs !== undefined
      ? Math.min(timeout || psMaxTimeoutMs(), shellWallCapMs, constraints?.maxTimeoutMs ?? 1 / 0)
      : Math.min(
          timeout || psDefaultTimeoutMs(),
          shouldRunInBackground ? getBackgroundTimeoutCapMs() : psMaxTimeoutMs(),
          constraints?.maxTimeoutMs ?? 1 / 0,
        );
  if (timeout && effectiveTimeoutMs < timeout)
    onNote?.({
      key: "timeout_clamped",
      requestedMs: timeout,
      appliedMs: effectiveTimeoutMs,
    });
  let fullOutput = "";
  let lastProgressOutput = "";
  let lastTotalLines = 0;
  let lastTotalBytes = 0;
  let backgroundShellId = undefined;
  let timedOutAfterMs = undefined;
  let interruptBackgroundingStarted = false;
  let isTurnAbort = () =>
    abortController.signal.aborted && isTurnLevelAbort(abortController.signal.reason, caller);
  let resolveProgress = null;
  function createProgressSignal() {
    return new Promise((resolve) => {
      resolveProgress = () => resolve(null);
    });
  }
  using abortDisposable = onAbortDisposable(abortController.signal, () => {
    if (!isTurnAbort()) return;
    let abortResolve = resolveProgress;
    if (abortResolve) {
      resolveProgress = null;
      abortResolve();
    }
  });
  let canAutoBackground = !backgroundForbidden && (await isAutobackgroundingAllowed(command));
  let turnAbortBackgrounds = !backgroundForbidden;
  let shellTimeoutMs = effectiveShellTimeoutMs({
    requestedTimeoutMs: effectiveTimeoutMs,
    isMainAgent: isMainThread === true,
    canAutoBackground,
    subagentCapMs: shouldRunInBackground ? 0 : subagentCapMs,
  });
  let subagentCapApplied = isMainThread !== true && shellTimeoutMs < effectiveTimeoutMs ? true : undefined;
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
      timeout: shellTimeoutMs,
      owningAgentId: agentId,
      caller,
      turnAbortBackgrounds,
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
      shouldAutoBackground: canAutoBackground,
      sessionEnvVars,
      ...(isNpmPluginSourcePath(promptShellPluginId) && {
        bunOptionsFor: (commandText) => bunOptionsGuard(promptShellPluginId, commandText),
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
  let releaseViolationReport =
    shellCommand.status !== "killed"
      ? claimViolationReport(POWERSHELL_TOOL_NAME, command, toolState, {
          useSandbox,
        })
      : null;
  let resultPromise = shellCommand.result;
  if (releaseViolationReport)
    resultPromise
      .then((shellResult) => {
        if (shellResult.preSpawnError) releaseViolationReport();
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
  function startBackgrounding(eventName, backgroundFn, extraEventFields) {
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
        ...extraEventFields,
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
        ...extraEventFields,
      });
      if (backgroundFn) backgroundFn(shellId);
    });
  }
  if (shellCommand.onTimeout && canAutoBackground)
    shellCommand.onTimeout((backgroundFn) => {
      timedOutAfterMs = shellTimeoutMs;
      startBackgrounding("tengu_powershell_command_timeout_backgrounded", backgroundFn, {
        timeout_ms: shellTimeoutMs,
        requested_timeout_ms: timeoutWhenPositive(timeout, effectiveTimeoutMs) ?? 0,
        subagent_cap_applied: subagentCapApplied === true,
      });
    });
  if (shouldRunInBackground && shellCommand.status !== "killed") {
    if (shellCommand.status === "completed") {
      let completedResult = await resultPromise;
      if (completedResult.preSpawnError) return completedResult;
    }
    let timeout_2 = timeoutWhenPositive(timeout, effectiveTimeoutMs);
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
  let finalResult = null;
  try {
    while (true) {
      let now = Date.now();
      let timeUntilNextProgress = Math.max(0, nextProgressTime - now);
      let progressSignal;
      if (!interruptBackgroundingStarted && isTurnAbort()) progressSignal = Promise.resolve(null);
      else progressSignal = createProgressSignal();
      let result = await Promise.race([
        resultPromise,
        new Promise((resolve) =>
          setTimeout((resolveTimer) => resolveTimer(null), timeUntilNextProgress, resolve).unref(),
        ),
        progressSignal,
      ]);
      if (result !== null) {
        finalResult = result;
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
          ...(isTurnAbort() && {
            backgroundedByTurnAbort: true,
          }),
          timedOutAfterMs,
          subagentCapApplied,
        };
      if (
        abortController.signal.aborted &&
        (unwrapAbortReason(abortController.signal.reason) === "interrupt" || isTurnAbort()) &&
        !interruptBackgroundingStarted
      ) {
        interruptBackgroundingStarted = true;
        if (canAutoBackground || (isTurnAbort() && turnAbortBackgrounds)) {
          startBackgrounding(
            isTurnAbort()
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
        !backgroundForbidden &&
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
              autoBackgroundArmed: canAutoBackground,
              timeout: timeoutWhenPositive(timeout, effectiveTimeoutMs),
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
              timeoutMs: shellTimeoutMs,
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
          finalResult
            ? shellStatusForDisplay(finalResult, {
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
//@ chunk-azq8n2fy.js:595-667 placement
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
//@ chunk-azq8n2fy.js:667-740 placement
/**
 * 结果为 needs_approval 时返回其建议规则列表。
 */
function needsApprovalSuggestions(envelope) {
  return envelope.outcome === "needs_approval" ? (envelope.suggestions ?? []) : [];
}
//@ chunk-azq8n2fy.js:740-968 placement
/**
 * 若规则列表只有一条该工具的前缀/通配规则（非精确匹配），返回其工具名与规则内容。
 */
function singlePrefixRuleFor(rules, firstToolName) {
  let [ruleString, ...rest] = rules;
  if (ruleString === undefined || rest.length > 0 || !isShellToolName(firstToolName)) return;
  let { toolName, ruleContent } = parseRuleString(ruleString);
  return toolName === firstToolName &&
    ruleContent !== undefined &&
    permissionRuleValueFromString({
      toolName: firstToolName,
      ruleContent,
    }) === ruleString &&
    parseShellPermissionRule(ruleContent).type !== "exact"
    ? {
        toolName: firstToolName,
        ruleContent,
      }
    : undefined;
}
export { singlePrefixRuleFor, isViolinTableFlagOn, needsApprovalSuggestions, PowerShellTool };
