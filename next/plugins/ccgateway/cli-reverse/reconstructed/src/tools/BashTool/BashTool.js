/**
 * tools/BashTool/BashTool.tsx
 *
 * Bash 工具定义与执行：输入/输出 schema、validateInput（长 sleep 拦截、沙箱策略、重复后台命令）、call（沙箱、runShellCommand 进度与后台化、输出持久化、git 操作识别、编辑 diff、已读文件过期提示、遥测）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/BashTool.tsx
 * pieces: chunk-5xgkngpb.js (58)
 * attribution: placement 28, fingerprint 9, sole-consumer 3, affinity 3, layout 11, file-local 3, facade-exports 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { dirname, basename, relative } from "path";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import {
  INNER_TASK_SUFFIX,
  PREAMBLE_TASK_SUFFIX,
  backgroundTaskNotice,
  backgroundCompletionNoticeEnabled,
  parentTaskId,
  isPrintWithoutTidySloth,
} from "../../tasks/LocalShellTask/backgroundNotices.js";
import { TOOLU_PLUGIN } from "../../plugins/functionHooks/toolCallHooks.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { splitCommand } from "../../utils/bash/commands.js";
import {
  parseSedReadArgs,
  parseCatRead,
  parseHeadRead,
  parseTailRead,
  parseGrepReadArgs,
} from "./readCommandParsing.js";
import { getFsImplementation } from "../../utils/fsOperations.js";
import { expandPath } from "../../utils/path.js";
import { stripBomAndCarriageReturn } from "../../utils/remoteFileState.js";
import { hasReadDenyRuleForPath } from "../../utils/permissions/filesystem.js";
import { pushUnique } from "../../utils/filePathValidation.js";
import { matchesToolName, findToolByName } from "../../Tool.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { getSessionSkillCommands } from "../../services/mcp/mcpAccountKey.js";
import { getProjectRootOrNull, isDiskless, getOriginalCwd } from "../../bootstrap/state.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
  peekSessionPinnedFeatureValue,
} from "../../services/analytics/growthbook.js";
import { isOnClaudeCodeSessionSurface } from "../../utils/teammate.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  errorMessage,
  isENOENT,
  isSadResourceErrno,
  isEnvFsErrno,
  AbortError as AbortError_2,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  ShellError,
  toError,
} from "../../utils/errors.js";
import { getMaxOutputLength, getConfiguredBashOutputMaxChars } from "../../utils/shell/outputLimits.js";
import {
  truncateToLength,
  takeLastChars,
  firstLineOf,
  EndTruncatingAccumulator,
  plural,
} from "../../utils/stringUtils.js";
import {
  getOriginalCwd as getOriginalCwd_2,
  ensureToolResultsDir,
  getToolResultFilePath,
  toolResultsKey,
  PREVIEW_SIZE_CHARS,
  buildLargeToolResultMessage,
  generatePreview,
  buildPersistedOutputMessage,
  getPersistenceThreshold,
} from "../../utils/toolResultStorage.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import {
  persistShellOutput,
  MAX_BLOCKED_SLEEP_LINES,
  safeRequestedModelName,
  copyShellOutputFile,
  isBase64DataUri,
  trimBlankEdgeLines,
} from "../../utils/task/shellOutputPersist.js";
import {
  MAX_PERSISTED_OUTPUT_BYTES,
  getTaskOutputRootDir,
  persistTaskOutputSnapshot,
  getVerifiedTaskOutputTail,
  isTaskOutputSwapRefusal,
  isPlainAbsolutePath,
  isTaskOutputPathFor,
  getTaskOutputPath,
} from "../../utils/task/diskOutput.js";
import { logError } from "../../utils/log.js";
import { stripClaudeCodeHints, consumeClaudeCodeHints } from "../../utils/claudeCodeHints.js";
import { hasNewOomKills, currentOomKillCount } from "../../utils/toolCgroup.js";
import {
  MAX_OOM_NOTES,
  OOM_KILL_NOTE,
  tailInputKind,
  tailNoteRule,
  isTailNoteWanted,
  startTailInputCapture,
  tailInputAsker,
  persistTailInput,
  buildSandboxFailureHint,
  withTailNote,
} from "./sandboxFailureHints.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  zodStrictObject,
  _enum,
  numberSchema,
  booleanSchema,
  stringSchema,
  objectSchema,
  literal,
  anySchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { PROGRAM_CATEGORIES, classifyBashCommand } from "./commandClassification.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { prettifyError } from "../../../vendor/zod/v4/core/errors.js";
import { promptSnapshotUnlessRenderPoint } from "../../utils/contextAttachments/promptSnapshot.js";
import { getGlobalConfig } from "../../utils/config.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import {
  getMaxBashTimeout,
  getRunInBackgroundDescription,
  getSimplePrompt,
  isWoollyToastGateOn,
  getDefaultBashTimeout,
  getBackgroundTimeoutCapMs,
} from "./prompt.js";
import { booleanishSchema } from "../../utils/spellcheck.js";
import {
  areCommandNetworkListsOffered_2,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  commandNetworkListsInput,
  checkAllowedDomainsInput,
  takeCommandNetworkLists,
} from "./sandboxNetwork.js";
import {
  attachedMachineInputField,
  HOST_TOOL_INPUT_FIELD,
  isReservedMachineNameExact,
  isRemoteToolsForwardEnabled2,
  splitHostField,
  machineLabelForMessage,
  canRunToolsOnThisMachine,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { isBackgroundShellDisabled, isBackgroundTasksOff } from "../AgentTool/backgroundGates.js";
import { lit as lit_2, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import {
  gitOperationSchema,
  countGitOpsFromCommand,
  withSpilledOutputTail,
  trackGitOperations,
  GITHUB_RATE_LIMIT_REMINDER,
  PrLinkBackoffState,
  detectGitOperation,
  emitVcsStateChanges,
} from "../shared/gitOperationTracking.js";
import { hunkSchema } from "../../../vendor/diff/lib/index.mjs";
import {
  BACKGROUND_OUTPUT_FIELDS,
  getBackgroundOutputFieldNames,
  buildRuleRelevanceFilter,
} from "./bashCommandShape.js";
import { isTaskIdOfType } from "../../Task.js";
import { getLastCheckedSessionEnvVarKeys, sessionEnvVarNameSet } from "../../utils/shell/shellEnvSnapshot.js";
import {
  commandHasAnyCd,
  extractLiteralRmTargets,
  denyCrashedCheckUnderCommandClamp,
  mergeBashSubcommandVerdicts,
  bashPermissionWithTextFallback,
  findRmTargets,
} from "./bashPermissions.js";
import { checkReadOnlyConstraints } from "./readOnlyValidation.js";
import { reportOnce } from "../../utils/reportOnce.js";
import { getFileModificationTimeAsync } from "../../utils/file.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { MAX_CONTEXT_TOKENS, MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { env } from "../../utils/env.js";
import { shouldUseSandbox, sandboxPolicyRefusal } from "./shouldUseSandbox.js";
import { truncate, formatDuration } from "../../utils/format.js";
import { buildImageToolResult } from "../../bridge/inboundMessages.js";
import {
  formatBackgroundTaskMessage,
  getSubagentForegroundCapMs,
  resetCwdIfOutsideProject,
  stdErrAppendShellResetMessage,
  resizeShellImageOutput,
} from "./utils.js";
import { READ } from "../FileReadTool/constants.js";
import {
  isInputHoldOn,
  shouldHoldForPlugin,
  ENDED_INSTEAD_OF_BACKGROUND_MESSAGE,
} from "../../plugins/functionHooks/inputHold.js";
import { getCwd } from "../../utils/cwd.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { guardSyncedMemoryRemoval, prepareNamedRemoval } from "./syncedMemoryRemoval.js";
import { memoryWatchers } from "../../services/memorySync/memoryWatcher.js";
import { BashRepeatMeter, isBashRepeatMetered } from "./repeatMeter.js";
import { getAgentProxyFailures, describeAgentProxyFailures } from "./agentProxyFailures.js";
import {
  SandboxPolicyRefusalError,
  SandboxManager,
  getEffectiveFilesystemPolicy,
} from "../../utils/sandbox/sandbox-adapter.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { ensureDeviceSandboxPosture } from "../../remote/tools/deviceSandboxPosture.js";
import {
  getDestructiveTargetCategory,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
} from "./destructiveTargets.js";
import { getExecutorShellForAnalytics, exec } from "../../utils/Shell.js";
import { isBashEditDiffEnabled, shouldSkipEditDiff } from "./bashEditDiff/settings.js";
import {
  hasLiveRootObserver,
  isLinux,
  startWriteObserver,
  flushObservedWrites,
  beginCommandObservation,
  endCommandObservation,
  forgetRecorder,
  forgetObservedRepo,
} from "./writeObserver.js";
import {
  commandMovesWorkTree,
  isRepoSnapshotGivenUp,
  takeBashSnapshot,
  isSharedSnapshotEnabled,
  registerConcurrentCommand,
  unregisterConcurrentCommand,
  diffAfterCommand,
  logEditDiffWait,
} from "./bashEditDiff/snapshot.js";
import { findGitRootRecheckingNegative } from "../../utils/git.js";
import { startEditRecorder, recordEditedFilesSerially } from "./bashEditRecorder.js";
import { abortScopeOf, isTurnLevelAbort, onAbortDisposable } from "../../utils/abortReasons.js";
import { isolationWorktreeFor } from "../../utils/worktreeIsolation.js";
import { modelSupportsEffort, getEffortLevelOrHigh } from "../../utils/effort.js";
import { shouldUseShellTool } from "../../utils/shell/shellToolUtils.js";
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
import { trackWorkAfterStop } from "../../tasks/LocalShellTask/limitStopTelemetry.js";
import { getTaskRunState, emitTaskNotification } from "../../utils/task/taskNotifications.js";
import { classifyTestOutcome, buildCommandTimingFields } from "./bashTelemetry.js";
import { unwrapAbortReason, isUserInitiatedAbortReason } from "../../utils/abortController.js";
import { DEFAULT_SEMANTIC_2 } from "./commandSemantics.js";
import { logEvent } from "../../services/analytics/index.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { getParsedSandboxViolations, claimViolationReport } from "./sandboxViolations.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { detectShellDialectIssues } from "./sameEitherWayCommands.js";
import { classifySavedOutputPath } from "../FileReadTool/savedOutputPaths.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
import { detectCodeIndexingFromCommand } from "../../utils/codeIndexing.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { reapsShellsOnExit } from "../../utils/agentContext.js";
import { canonicalToolName as canonicalToolName_2 } from "../../services/tools/batchTools.js";
import { isBackgroundTasksDisabled } from "../AgentTool/AgentTool.js";
import { onCommand, onSpawn } from "../../utils/leftRunningFamilyWatch.js";
import { effectiveShellTimeoutMs, timeoutWhenPositive } from "../../utils/timeouts.js";
import { isNpmPluginSourcePath, bunOptionsGuard } from "../../utils/permissions/protectedSettingsPaths.js";
import { leftoverProcessTracker } from "../../utils/shell/cpuReport.js";
import { stripShellUsageUnlessBackgrounded } from "../../utils/ShellCommand.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:191012-191109 placement
/**
 * 需要非沙箱执行的 Bash 输入字段（dangerouslyDisableSandbox）；omitUnsandboxedFields 用它从输入 schema 里删字段。
 */
var UNSANDBOXED_INPUT_FIELDS = ["dangerouslyDisableSandbox", ...[]];
var REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED = [
  ...UNSANDBOXED_INPUT_FIELDS,
  "run_in_background",
  "_simulatedSedEdit",
];
//@ chunk-5xgkngpb.js:191109-191263 placement
/**
 * 宿主策略禁止非沙箱命令时，从 Bash 输入 schema 中去掉相关字段。
 */
function omitUnsandboxedFields(schema, fieldNames) {
  if (!getHostAgentPolicy().unsandboxedCommandsDisabled) return schema;
  let omitShape = Object.fromEntries(
    fieldNames.filter((fieldName) => fieldName in schema.shape).map((fieldName) => [fieldName, true]),
  );
  return schema.omit(omitShape);
}
//@ chunk-5xgkngpb.js:1174547-1174654 fingerprint (2.1.88 match: BASH_SEMANTIC_NEUTRAL_COMMANDS, 0.591)
/**
 * 不读写文件的命令集合（echo/printf/test/[/which/type/basename/dirname/df 等）；沙箱"读封锁"检查（chunk-e6aww6q8.js#kDo）遇到这些命令直接放过。
 */
var READ_BLOCK_EXEMPT_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1174547", () => {
  READ_BLOCK_EXEMPT_COMMANDS = new Set([
    "echo",
    "printf",
    "test",
    "[",
    "[[",
    "true",
    "false",
    "which",
    "type",
    "basename",
    "dirname",
    "df",
  ]);
});
//@ chunk-5xgkngpb.js:3191771-3192159 fingerprint (2.1.88 match: COMMON_BACKGROUND_COMMANDS, 0.601)
/**
 * 常见长时间运行/构建类命令前缀（npm、cargo、docker、pytest、gh、bazel、nix…），与 wget 合成遥测里的 command_type 白名单；也被后台任务模块使用。
 */
var COMMON_BACKGROUND_COMMANDS = [
  "npm",
  "yarn",
  "pnpm",
  "node",
  "python",
  "python3",
  "go",
  "cargo",
  "make",
  "docker",
  "terraform",
  "webpack",
  "vite",
  "jest",
  "pytest",
  "curl",
  "git",
  "gh",
  "dotnet",
  "msbuild",
  "nuget",
  "bun",
  "bunx",
  "npx",
  "deno",
  "pwsh",
  "pip",
  "uv",
  "poetry",
  "gradle",
  "mvn",
  "nx",
  "turbo",
  "tsc",
  "eslint",
  "prettier",
  "build",
  "test",
  "serve",
  "watch",
  "dev",
  "xcodebuild",
  "swift",
  "bazel",
  "nix",
  "nix-shell",
  "nix-build",
  "nix-env",
];
//@ chunk-5xgkngpb.js:4853865-4854201 placement
/**
 * 查找同一代理、同一目录下正在后台运行的相同 Bash 命令任务，用于避免重复启动。
 */
function findDuplicateBackgroundCommand(input, taskRegistry) {
  if (!isPlainToolUseId(input.toolUseId)) return;
  let trimmed = input.command.trim();
  return Object.values(taskRegistry.all())
    .filter(isLocalShellTask)
    .find(
      (task) =>
        task.isBackgrounded &&
        task.status === "running" &&
        task.shellCommand?.status === "backgrounded" &&
        (task.caller === "turn" || task.caller === "agent") &&
        isPlainToolUseId(task.toolUseId) &&
        task.shell === "bash" &&
        task.agentId === input.agentId &&
        task.cwd === input.cwd &&
        task.command.trim() === trimmed,
    );
}
//@ chunk-5xgkngpb.js:4854201-4854279 placement
/**
 * 判断 toolUseId 是否为普通调用：排除内层调用后缀 :inner、含 :preamble- 的调用和插件调用（toolu_plugin_）。
 */
function isPlainToolUseId(toolUseId) {
  return (
    toolUseId !== undefined &&
    !toolUseId.endsWith(INNER_TASK_SUFFIX) &&
    !toolUseId.includes(PREAMBLE_TASK_SUFFIX) &&
    !TOOLU_PLUGIN(toolUseId)
  );
}
//@ chunk-5xgkngpb.js:4882559-4883073 placement
/**
 * 把 Bash 输入中的别名字段规范化：timeout_ms → timeout，command_description → description（已有 description 时丢弃），返回改写结果与形状标签。
 */
function normalizeBashInputAliases(input) {
  if (!isPlainObject_6(input)) return null;
  let normalized = {
    ...input,
  };
  let aliasedFields = [];
  if ("timeout_ms" in normalized && !("timeout" in normalized)) {
    let timeoutMs = normalized.timeout_ms;
    if (typeof timeoutMs === "number" || (typeof timeoutMs === "string" && /^\d+$/.test(timeoutMs))) {
      normalized.timeout = timeoutMs;
      delete normalized.timeout_ms;
      aliasedFields.push("timeout_ms");
    }
  }
  if ("command_description" in normalized) {
    if (!("description" in normalized) && typeof normalized.command_description === "string") {
      normalized.description = normalized.command_description;
      aliasedFields.push("command_description");
    } else aliasedFields.push("command_description_dropped");
    delete normalized.command_description;
  }
  return aliasedFields.length
    ? {
        input: normalized,
        shapeClass: aliasedFields.join(","),
      }
    : null;
}
//@ chunk-5xgkngpb.js:4883073-4883160 placement
/**
 * head 的默认行数 10、tail 的默认行数 10、sed -n 'a,bp' 与 'Np' 的地址正则、以及复合命令里视为无副作用的 echo/printf/true/: 判定；extractReadOnlyFileReads 用它们识别只读文件查看命令。
 */
var DEFAULT_HEAD_LINES = 10;
var DEFAULT_TAIL_LINES = 10;
var SED_PRINT_RANGE_RE = /^(\d+),(\d+)p$/;
var SED_PRINT_LINE_RE = /^(\d+)p$/;
var BENIGN_SHELL_COMMAND_RE = /^\s*(echo|printf|true|:)\b/;
//@ chunk-5xgkngpb.js:4883160-4883418 placement
/**
 * 从不含管道与重定向的命令中提取只读的文件读取（cat/head/tail 等）。
 */
function extractReadOnlyFileReads(command) {
  if (/[|<>]/.test(command)) return [];
  let subcommands;
  try {
    subcommands = splitCommand(command);
  } catch {
    return [];
  }
  if (subcommands.length === 0) return [];
  let reads = [];
  for (let subcommand of subcommands) {
    let read =
      parseSedReadArgs(subcommand) ??
      parseCatRead(subcommand) ??
      parseHeadRead(subcommand) ??
      parseTailRead(subcommand) ??
      (subcommands.length === 1 ? parseGrepReadArgs(subcommand) : null);
    if (read) reads.push(read);
    else if (subcommands.length > 1 && !BENIGN_SHELL_COMMAND_RE.test(subcommand)) return [];
  }
  return reads;
}
//@ chunk-5xgkngpb.js:4886934-4887398 sole-consumer
/**
 * 按查看规格截取文件内容：tailLines 取末尾 N 行；否则按 startLine/endLine（1 起）切片，越界返回 null；无行号时返回全文。
 */
function sliceFileViewContent(fileContent, viewSpec) {
  if (viewSpec.tailLines !== undefined) {
    let lines = fileContent.split(`
`);
    if (lines.length > 0 && lines.at(-1) === "") lines.pop();
    if (lines.length === 0) return null;
    let min = Math.min(viewSpec.tailLines, lines.length);
    let startLine = lines.length - min + 1;
    return {
      content: lines.slice(startLine - 1).join(`
`),
      offset: startLine,
      limit: min,
    };
  }
  if (viewSpec.startLine === undefined)
    return {
      content: fileContent,
      offset: undefined,
      limit: undefined,
    };
  let lines = fileContent.split(`
`);
  let max = Math.max(1, viewSpec.startLine);
  let max_2 = Math.max(max, viewSpec.endLine ?? max);
  if (max > lines.length) return null;
  return {
    content: lines.slice(max - 1, max_2).join(`
`),
    offset: max,
    limit: max_2 - max + 1,
  };
}
//@ chunk-5xgkngpb.js:4887398-4887500 sole-consumer
function stripLineNumberPrefix(line) {
  let match = /^[ \t]*\d+[ \t]/.exec(line);
  return match ? line.slice(match[0].length) : /^[ \t]*$/.test(line) ? "" : line;
}
//@ chunk-5xgkngpb.js:4887500-4887662 affinity
/**
 * 判断命令的模型可见输出是否真的包含这段文件内容（统一 CRLF；numbered 时逐行去掉行号前缀再比）。用来避免把没展示给模型的内容记成"已读"。
 */
function outputContainsFileView(commandOutput, viewContent, isNumbered) {
  let normalizedViewContent = viewContent.replace(/^(\s*\n)+/, "").trimEnd();
  let replaced = commandOutput.replaceAll(
    `\r
`,
    `
`,
  );
  return (
    replaced.includes(normalizedViewContent) ||
    (isNumbered === true &&
      replaced
        .split(
          `
`,
        )
        .map(stripLineNumberPrefix)
        .join(
          `
`,
        )
        .includes(normalizedViewContent))
  );
}
//@ chunk-5xgkngpb.js:4887662-4888340 fingerprint (2.1.88 match: applySedEdit, 0.531)
/**
 * Bash 执行完后，把 cat/head/tail/sed -n 等单纯查看文件的命令识别出来（chunk-e6aww6q8.js#Kzo），读取文件（≤10MB）并按查看范围写入 readFileState，使后续 Edit 不再要求先 Read；已有记录则只触发嵌套 CLAUDE.md 附件。requiresExitZero 的规格只在退出码 0 时生效。
 */
async function recordShellFileReadsInReadState(
  command,
  readFileState,
  abortSignal,
  exitCode,
  modelVisibleOutput,
  memoryTriggerContext,
) {
  let filtered = extractReadOnlyFileReads(command).filter((read) => !read.requiresExitZero || exitCode === 0);
  if (filtered.length === 0) return;
  let fs = getFsImplementation();
  await Promise.all(
    filtered.map(async (read) => {
      let encoding = expandPath(read.filePath);
      try {
        if (readFileState.get(encoding)) {
          noteFileReadForMemoryTriggers(memoryTriggerContext, encoding);
          return;
        }
        let stats = await fs.stat(encoding);
        if (!stats.isFile() || stats.size > 10485760) return;
        if (abortSignal.aborted) return;
        let content = await fs.readFile(encoding, {
          encoding: "utf8",
        });
        let endings = stripBomAndCarriageReturn(content);
        let fileView = sliceFileViewContent(endings, read);
        if (fileView === null || (!fileView.content.trim() && endings.trim())) return;
        if (
          modelVisibleOutput !== undefined &&
          !read.contentNotInModelContext &&
          !outputContainsFileView(modelVisibleOutput, fileView.content, read.numbered)
        )
          return;
        readFileState.set(encoding, {
          content: fileView.content,
          timestamp: Math.floor(stats.mtimeMs),
          offset: fileView.offset,
          limit: fileView.limit,
          ...((read.contentNotInModelContext || modelVisibleOutput === undefined) && {
            contentNotInModelContext: true,
          }),
        });
        noteFileReadForMemoryTriggers(memoryTriggerContext, encoding);
      } catch {}
    }),
  );
}
//@ chunk-5xgkngpb.js:4888340-4888404 placement
/**
 * Bash 命令看过某个文件后，若无读拒绝规则就通知内存触发上下文登记该路径，供后续记忆写入使用。
 */
function noteFileReadForMemoryTriggers(memoryTriggerContext, encoding) {
  if (memoryTriggerContext && !hasReadDenyRuleForPath(encoding, memoryTriggerContext.permissions()))
    pushUnique(memoryTriggerContext.triggers, encoding);
}
//@ chunk-5xgkngpb.js:4888404-4888426 placement
/**
 * 探测大量删除占用（massDeleteHoldExposure）的超时时间，2000 毫秒，超时按无占用处理。
 */
var DISK_PROBE_TIMEOUT_MS = 2000;
var READ_ONLY_FAMILY_MS = 5000;
//@ chunk-5xgkngpb.js:4901445-4901519 placement
/**
 * 构造 Bash 工具 prompt 时，若可用工具里有 Skill，则列出本项目目录下已按允许清单过滤的技能命令。
 */
async function listPromptSkillCommands(tools) {
  if (!tools.some((tool) => matchesToolName(tool, SKILL))) return [];
  return getSessionSkillCommands(getProjectRootOrNull());
}
//@ chunk-5xgkngpb.js:4901568-4901616 placement
/**
 * 会话内固定的 tengu_quiet_pike 开关，决定持久化输出后是否再补读文件尾部内容到结果里。
 */
function shouldShowOutputTail() {
  return getFeatureValue_SESSION_PINNED("tengu_quiet_pike", false);
}
//@ chunk-5xgkngpb.js:4901616-4901670 placement
/**
 * 会话内固定的 tengu_hushed_wren 开关，决定输出过大时是否生成“完整输出已保存到文件”的提示。
 */
function shouldBuildLargeOutputMessage() {
  return getFeatureValue_SESSION_PINNED("tengu_parallel_sunrise", false);
}
//@ chunk-5xgkngpb.js:4901670-4901861 layout
function hasCcrFamily(outsideResultReader) {
  try {
    return (
      outsideResultReader !== undefined &&
      !isOnClaudeCodeSessionSurface() &&
      outsideResultReader("whole_result") === undefined
    );
  } catch (error) {
    logForDebugging(
      `Bash: could not tell who reads the result, so no raw output is kept: ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
    return false;
  }
}
//@ chunk-5xgkngpb.js:4901861-4901951 placement
/**
 * 截断输出时保留的尾部字符数（1500）与截断提示文本；三者一个声明组，HVn 与 readOutputTail 都用它拼装被截断的输出。
 */
var OUTPUT_CUT_TAIL_CHARS = 1500;
var OUTPUT_CUT_MARKER = `
[\u2026 output cut here; the full output was saved to a file \u2026]
`;
//@ chunk-5xgkngpb.js:4901951-4902040 placement
/**
 * 把输出截到最大长度，插入 OUTPUT_CUT_MARKER 和“完整输出已保存到文件”的说明，作为最终展示文本。
 */
function interleaveOutputCutMarker(head, tail) {
  let headBudget = getMaxOutputLength() - OUTPUT_CUT_MARKER.length - tail.length;
  return `${truncateToLength(head, Math.max(0, headBudget))}${OUTPUT_CUT_MARKER}${tail}`;
}
//@ chunk-5xgkngpb.js:4902040-4902179 placement
function splitOutputAtMarker(output) {
  let index = output.lastIndexOf(OUTPUT_CUT_MARKER);
  return index === -1
    ? {
        start: output,
        end: undefined,
      }
    : {
        start: output.slice(0, index),
        end:
          takeLastChars(output.slice(index + OUTPUT_CUT_MARKER.length), OUTPUT_CUT_TAIL_CHARS) || undefined,
      };
}
//@ chunk-5xgkngpb.js:4902179-4902192 placement
/**
 * 从后台任务输出文件补读尾部时的字节上限（6000）。
 */
var OUTPUT_TAIL_MAX_BYTES = 6000;
//@ chunk-5xgkngpb.js:4902192-4902606 placement
/**
 * 把后台任务输出文件持久化到工具结果目录（v5 存储或本地快照，大小有上限），返回 {path, size}；失败时回调 copyFailed。
 */
async function persistBashOutput({ outputFilePath, outputTaskId }, session, storageV5, onPersistFailed) {
  if (!outputFilePath || !outputTaskId) return;
  let toolResultsDir;
  try {
    let originalCwd = getOriginalCwd_2(session);
    toolResultsDir = await ensureToolResultsDir(originalCwd, storageV5);
    let toolResultFilePath = getToolResultFilePath(originalCwd, outputTaskId, false);
    let storageKey =
      isStorageV5Enabled() && storageV5 !== undefined
        ? toolResultsKey(dirname(toolResultFilePath), basename(toolResultFilePath))
        : undefined;
    if (isStorageV5Enabled() && storageV5 !== undefined && storageKey !== undefined) {
      let persistedSize = await persistShellOutput(
        storageV5,
        storageKey,
        outputFilePath,
        MAX_PERSISTED_OUTPUT_BYTES,
        getTaskOutputRootDir(),
      );
      if (typeof persistedSize === "number")
        return {
          path: toolResultFilePath,
          size: persistedSize,
        };
      if (persistedSize === undefined) {
        onPersistFailed?.copyFailed(undefined, toolResultsDir);
        return;
      }
    }
    let size = await persistTaskOutputSnapshot(
      outputFilePath,
      toolResultFilePath,
      MAX_PERSISTED_OUTPUT_BYTES,
    );
    return {
      path: toolResultFilePath,
      size,
    };
  } catch (error) {
    onPersistFailed?.copyFailed(error, toolResultsDir);
    return;
  }
}
//@ chunk-5xgkngpb.js:4902606-4903090 placement
/**
 * 输出很大时读取任务输出文件的尾部用于预览（跳过不完整的首行），读不到时记 warn 或错误。
 */
async function readOutputTail(
  { outputTaskId, outputFileSize = 0 },
  stdout,
  hintChars,
  maxTailBytes,
  withMarker = false,
) {
  let min = Math.min(
    maxTailBytes,
    getMaxOutputLength() - hintChars - (withMarker ? OUTPUT_CUT_MARKER.length : 0),
  );
  let minOmittedBytes = withMarker
    ? getMaxOutputLength()
    : (stdout.length - stripHintsAndLeadingBlankLines(stdout).length + hintChars) * 3;
  if (
    !outputTaskId ||
    min <= 0 ||
    outputFileSize >= MAX_PERSISTED_OUTPUT_BYTES ||
    outputFileSize <= minOmittedBytes + min
  )
    return;
  try {
    let { content, omittedBytes } = await getVerifiedTaskOutputTail(outputTaskId, min + 1, outputFileSize);
    if (omittedBytes < minOmittedBytes) return;
    let index = content.indexOf(`
`);
    let tailAfterFirstLine = index !== -1 && index < content.length / 2 ? content.slice(index + 1) : content;
    return stripHintsAndLeadingBlankLines(tailAfterFirstLine).trimEnd() || undefined;
  } catch (error) {
    if (isENOENT(error) || isSadResourceErrno(error) || isEnvFsErrno(error) || isTaskOutputSwapRefusal(error))
      logForDebugging(
        `Bash: could not read the end of task ${outputTaskId}'s output file: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
    else logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:4903090-4903333 placement
async function buildLargeOutputMessage(execResult, stdout, session, storageV5) {
  let outputTail = await readOutputTail(execResult, stdout, PREVIEW_SIZE_CHARS, OUTPUT_TAIL_MAX_BYTES);
  let persisted =
    outputTail === undefined ? undefined : await persistBashOutput(execResult, session, storageV5);
  if (persisted === undefined) return;
  return buildLargeToolResultMessage({
    filepath: persisted.path,
    originalSize: persisted.size,
    isJson: false,
    ...generatePreview(stripHintsAndLeadingBlankLines(stdout), PREVIEW_SIZE_CHARS),
    previewEnd: outputTail,
    truncatedAtBytes: persisted.size >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : undefined,
  });
}
//@ chunk-5xgkngpb.js:4903333-4903387 placement
/**
 * 去掉 Claude Code 注入的提示行并裁掉开头的空行；比较输出是否重复、生成预览、计算省略字节数前都先过它。
 */
function stripHintsAndLeadingBlankLines(output) {
  return stripClaudeCodeHints(output).replace(/^(\s*\n)+/, "");
}
//@ chunk-5xgkngpb.js:4953453-4953471 placement
/**
 * 记录 OOM 提示在本会话已显示次数，挂在工具状态上（maybeShowBashNote 使用）。
 */
class OomKillNoteState {
  shown = 0;
}
//@ chunk-5xgkngpb.js:4953471-4953615 placement
function maybeShowBashNote(toolResult, noteState) {
  let hasOomKills = hasNewOomKills(toolResult) === true;
  if (
    !hasOomKills ||
    noteState.shown >= MAX_OOM_NOTES ||
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_wiggly_gray", false)
  )
    return {
      hit: hasOomKills,
      note: undefined,
    };
  noteState.shown++;
  return {
    hit: hasOomKills,
    note: OOM_KILL_NOTE,
  };
}
//@ chunk-5xgkngpb.js:4953615-4954003 placement
/**
 * Bash 触发提示规则的常量与 schema：规则数上限、输出筛选类命令、每条规则的触发类型、最短时长、提示文本与每会话上限。
 */
var MAX_NOTE_RULES; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var FILTER_COMMANDS;
var bashNoteRulesSchema;
deferInit("chunk-5xgkngpb.js:4953615", () => {
  MAX_NOTE_RULES = 8;
  FILTER_COMMANDS = new Set(["tail", "head", "grep", "egrep", "fgrep", "rg", "ag", "wc"]);
  bashNoteRulesSchema = DoctorLazy(() =>
    array(
      zodStrictObject({
        kinds: array(_enum(PROGRAM_CATEGORIES)).min(1).max(PROGRAM_CATEGORIES.length),
        allKinds: array(_enum(PROGRAM_CATEGORIES)).min(1).max(PROGRAM_CATEGORIES.length).optional(),
        minSeconds: numberSchema().min(0),
        filtered: booleanSchema().optional(),
        failed: booleanSchema().optional(),
        text: stringSchema()
          .max(400)
          .regex(/^[!-;=-Z\\^-~](?:[ -;=-Z\\^-~]*[!-;=-Z\\^-~])?$/),
        maxPerSession: numberSchema().int().min(1).max(5),
        show: booleanSchema(),
      }),
    ).max(MAX_NOTE_RULES),
  );
});
//@ chunk-5xgkngpb.js:4954003-4954033 placement
/**
 * 保存 Bash 结果提示规则列表与每条规则的已显示次数；matchBashNoteRule 按配置匹配并限次。
 */
class BashNoteSessionState {
  rules;
  shown = new Map();
}
//@ chunk-5xgkngpb.js:4954033-4954692 placement
/**
 * 按 tengu_temporal_kazoo 配置的规则给 Bash 结果附加提示：匹配耗时、失败状态、命令种类、是否经过滤管道，每条规则每会话有显示上限。
 */
function matchBashNoteRule(command, shellUsage, failed, noteState) {
  let rules = (noteState.rules ??= loadBashNoteRules());
  let mapped = rules.map(
    (rule) =>
      shellUsage !== undefined &&
      shellUsage.wallMs >= rule.minSeconds * 1000 &&
      (rule.failed === undefined || rule.failed === failed),
  );
  if (!mapped.includes(true)) return;
  let {
    bash_command_kinds: bashCommandKinds,
    bash_last_argv0: bashLastArgv0,
    has_pipe: hasPipe,
    has_redirect: hasRedirect,
  } = classifyBashCommand(command);
  let parts = bashCommandKinds.split(",");
  let isFilterPipeline =
    hasPipe && !hasRedirect && FILTER_COMMANDS.has(bashLastArgv0) && !/\btee\b/.test(command);
  let index = rules.findIndex(
    (rule, idx) =>
      mapped[idx] === true &&
      rule.kinds.some((kind) => parts.includes(kind)) &&
      (rule.allKinds === undefined || rule.allKinds.every((kind) => parts.includes(kind))) &&
      (rule.filtered === undefined || (rule.filtered ? isFilterPipeline : !hasPipe)),
  );
  let rule = rules[index];
  if (rule === undefined) return;
  let shownCount = noteState.shown.get(index) ?? 0;
  if (!rule.show || shownCount >= rule.maxPerSession)
    return {
      rule: index + 1,
      note: undefined,
    };
  noteState.shown.set(index, shownCount + 1);
  return {
    rule: index + 1,
    note: `[${rule.text}]`,
  };
}
//@ chunk-5xgkngpb.js:4954692-4954868 layout
function tailInputNote(command, noteState) {
  return {
    async ask({ shellUsage }, failed) {
      let denial = matchBashNoteRule(command, shellUsage, failed, noteState);
      return {
        note: denial?.note,
        telemetry: {
          triggered_note_rule: denial?.rule ?? 0,
          triggered_note_shown: denial?.note !== undefined,
        },
      };
    },
  };
}
//@ chunk-5xgkngpb.js:4954868-4955277 placement
/**
 * 读取会话固定的 tengu_temporal_kazoo 开关作为 Bash 提示规则列表；格式不符或超过上限时记录并返回空列表。
 */
function loadBashNoteRules() {
  let featureValue_SESSION_PINNED = getFeatureValue_SESSION_PINNED("tengu_temporal_kazoo", null);
  if (featureValue_SESSION_PINNED === null) return [];
  let parsed =
    Array.isArray(featureValue_SESSION_PINNED) && featureValue_SESSION_PINNED.length > MAX_NOTE_RULES
      ? undefined
      : bashNoteRulesSchema().safeParse(featureValue_SESSION_PINNED);
  if (parsed?.success) {
    logFeatureOk("bash_triggered_notes");
    return parsed.data;
  }
  logFeatureSad("bash_triggered_notes", "invalid_value");
  logForDebugging(
    `Bash: tengu_temporal_kazoo is not a valid list of note rules, so this session adds no notes: ${parsed === undefined ? `more than ${MAX_NOTE_RULES} rules` : prettifyError(parsed.error)}`,
    {
      level: "error",
    },
  );
  return [];
}
//@ chunk-5xgkngpb.js:4955277-4955454 placement
/**
 * tengu_jiggly_harp 已知文本的 sha256 白名单；isPinnedPromptInSystemPrompt 用哈希+包含匹配判断这些文本是否出现在本次系统提示里并上报遥测。
 */
var TENGU_JIGGLY_HARP; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PINNED_PROMPT_TEXT_HASHES;
deferInit("chunk-5xgkngpb.js:4955277", () => {
  TENGU_JIGGLY_HARP = "tengu_jiggly_harp";
  PINNED_PROMPT_TEXT_HASHES = new Set([
    "2ae3ca8d81740b53d923a0885aca50d83cf055d760d4673deab302aea4b65633",
    "6089b336d7aa1867d84a6ecc55f514623dbe706909b5491033a7504571f20409",
  ]);
});
//@ chunk-5xgkngpb.js:4955454-4955904 placement
/**
 * 判断 tengu_jiggly_harp 配置的已知文本（按哈希白名单）是否出现在本次请求的系统提示中，用于遥测。
 */
function isPinnedPromptInSystemPrompt(shellCallContext) {
  try {
    let { toolUseId } = shellCallContext;
    if (
      toolUseId === undefined ||
      toolUseId.endsWith(INNER_TASK_SUFFIX) ||
      toolUseId.includes(PREAMBLE_TASK_SUFFIX) ||
      TOOLU_PLUGIN(toolUseId)
    )
      return;
    let messages = shellCallContext.messages();
    let lastIndex = messages.findLastIndex(
      (message) => message.type === "system" && message.subtype === "compact_boundary",
    );
    let systemPrompt = promptSnapshotUnlessRenderPoint(
      lastIndex === -1 ? messages : messages.slice(lastIndex),
      shellCallContext,
    )?.systemPrompt;
    if (systemPrompt === undefined) return;
    return [
      ...new Set([
        peekSessionPinnedFeatureValue(TENGU_JIGGLY_HARP),
        getGlobalConfig().cachedGrowthBookFeatures?.[TENGU_JIGGLY_HARP],
      ]),
    ].some((candidate) => {
      let candidateText = typeof candidate === "string" ? candidate.trim() : "";
      return (
        PINNED_PROMPT_TEXT_HASHES.has(computeContentHash(candidateText)) &&
        systemPrompt.some((promptBlock) => promptBlock.includes(candidateText))
      );
    });
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-5xgkngpb.js:4958329-4958822 fingerprint (2.1.88 match: BASH_READ_COMMANDS, 0.537)
/**
 * Bash 工具常量：换行、进度阈值 2000ms，以及搜索/读/列目录/中性/静默命令集合（用于折叠显示 isSearchOrReadCommand 与 noOutputExpected）。
 */
var NEWLINE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PROGRESS_THRESHOLD_MS;
var BASH_SEARCH_COMMANDS;
var BASH_READ_COMMANDS;
var BASH_LIST_COMMANDS;
var BASH_SEMANTIC_NEUTRAL_COMMANDS;
var BASH_COLLAPSIBLE_COMMANDS;
var FIRST_COMMAND_WORD_RE;
var BASH_SILENT_COMMANDS;
deferInit("chunk-5xgkngpb.js:4958329", () => {
  NEWLINE = `
`;
  PROGRESS_THRESHOLD_MS = 2000;
  BASH_SEARCH_COMMANDS = new Set(["find", "grep", "rg", "ag", "ack", "locate", "which", "whereis"]);
  BASH_READ_COMMANDS = new Set([
    "cat",
    "head",
    "tail",
    "less",
    "more",
    "wc",
    "stat",
    "file",
    "strings",
    "jq",
    "awk",
    "cut",
    "sort",
    "uniq",
    "tr",
  ]);
  BASH_LIST_COMMANDS = new Set(["ls", "tree", "du"]);
  BASH_SEMANTIC_NEUTRAL_COMMANDS = new Set(["echo", "printf", "true", "false", ":"]);
  BASH_COLLAPSIBLE_COMMANDS = new Set([
    ...BASH_SEARCH_COMMANDS,
    ...BASH_READ_COMMANDS,
    ...BASH_LIST_COMMANDS,
    ...BASH_SEMANTIC_NEUTRAL_COMMANDS,
  ]);
  FIRST_COMMAND_WORD_RE = /^\s*(?:(?:#[^\n]*|\\)\n\s*)*([^\s|&;<>()]+)/;
  BASH_SILENT_COMMANDS = new Set([
    "mv",
    "cp",
    "rm",
    "mkdir",
    "rmdir",
    "chmod",
    "chown",
    "chgrp",
    "touch",
    "ln",
    "cd",
    "export",
    "unset",
    "wait",
  ]);
});
//@ chunk-5xgkngpb.js:4958822-4959222 fingerprint (2.1.88 match: isSearchOrReadBashCommand, 1)
/**
 * 判断命令是否全部由搜索（find/grep/rg…）、读（cat/head/jq…）、列目录（ls/tree/du）命令组成（echo 等中性命令忽略），返回 {isSearch,isRead,isList}，供界面折叠显示。
 */
function isSearchOrReadBashCommand(command) {
  let partsWithOperators = FIRST_COMMAND_WORD_RE.exec(command)?.[1];
  if (!partsWithOperators || !BASH_COLLAPSIBLE_COMMANDS.has(partsWithOperators))
    return {
      isSearch: false,
      isRead: false,
      isList: false,
    };
  let hasSearch = false;
  let hasRead = false;
  let hasList = false;
  let hasNonNeutralCommand = false;
  for (let part of splitCommand(command)) {
    let baseCommand = part.trim().split(/\s+/)[0];
    if (!baseCommand || BASH_SEMANTIC_NEUTRAL_COMMANDS.has(baseCommand)) continue;
    if (!BASH_COLLAPSIBLE_COMMANDS.has(baseCommand))
      return {
        isSearch: false,
        isRead: false,
        isList: false,
      };
    hasNonNeutralCommand = true;
    if (BASH_SEARCH_COMMANDS.has(baseCommand)) hasSearch = true;
    if (BASH_READ_COMMANDS.has(baseCommand)) hasRead = true;
    if (BASH_LIST_COMMANDS.has(baseCommand)) hasList = true;
  }
  if (!hasNonNeutralCommand)
    return {
      isSearch: false,
      isRead: false,
      isList: false,
    };
  return {
    isSearch: hasSearch,
    isRead: hasRead,
    isList: hasList,
  };
}
//@ chunk-5xgkngpb.js:4959222-4959384 file-local
/**
 * 命令的每个子命令都在静默集合（mv/cp/rm/mkdir/chmod/cd/export…）里时返回 true，结果字段 noOutputExpected 由此得出。
 */
function isSilentBashCommand(command) {
  let partsWithOperators = splitCommand(command);
  if (partsWithOperators.length === 0) return false;
  let sawCommand = false;
  for (let part of partsWithOperators) {
    let baseCommand = part.trim().split(/\s+/)[0];
    if (!baseCommand) continue;
    sawCommand = true;
    if (!BASH_SILENT_COMMANDS.has(baseCommand)) return false;
  }
  return sawCommand;
}
//@ chunk-5xgkngpb.js:4959384-4961035 fingerprint (2.1.88 match: fullInputSchema, 0.509)
/**
 * Bash 输入 schema：command（拒绝会在审批框里隐藏的控制字符）、timeout、description、run_in_background、dangerouslyDisableSandbox，以及条件附加的字段；后台任务被禁用时去掉 run_in_background。
 */
var DISALLOWED_AUTO_BACKGROUND_COMMANDS; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var HIDDEN_CONTROL_CHARS_MESSAGE;
var fullInputSchema;
var coercedInputSchema;
var inputSchema;
var LOGGED_COMMAND_TYPES;
deferInit("chunk-5xgkngpb.js:4959384", () => {
  DISALLOWED_AUTO_BACKGROUND_COMMANDS = ["sleep"];
  HIDDEN_CONTROL_CHARS_MESSAGE =
    "command contains control characters that would be hidden in the approval dialog";
  fullInputSchema = DoctorLazy(() =>
    zodStrictObject({
      command: stringSchema()
        .refine(isAllPrintable, HIDDEN_CONTROL_CHARS_MESSAGE)
        .describe("The command to execute"),
      timeout: coercedNumberSchema(numberSchema().optional()).describe(
        `Optional timeout in milliseconds (max ${getMaxBashTimeout()} for a foreground command)`,
      ),
      description: stringSchema().optional()
        .describe(`Clear, concise description of what this command does in active voice. Never use words like "complex" or "risk" in the description - just describe what it does.

Say what the command does in plain words: do not echo the command's text, its flags, or file paths - the user reads this description, often without seeing the command.

For simple commands (git, npm, standard CLI tools), keep it brief (5-10 words):
- ls \u2192 "List files in current directory"
- git status \u2192 "Show working tree status"
- npm install \u2192 "Install package dependencies"

For commands that are harder to parse at a glance (piped commands, obscure flags, etc.), add enough context to clarify what it does:
- find . -name "*.tmp" -exec rm {} \\; \u2192 "Find and delete all .tmp files recursively"
- git reset --hard origin/main \u2192 "Discard all local changes and match remote main"
- curl -s url | jq '.data[]' \u2192 "Fetch JSON from URL and extract data array elements"`),
      run_in_background: booleanishSchema(booleanSchema().optional()).describe(
        getRunInBackgroundDescription(),
      ),
      dangerouslyDisableSandbox: booleanishSchema(booleanSchema().optional()).describe(
        "Set this to true to dangerously override sandbox mode and run commands without sandboxing.",
      ),
      ...false,
      ...(areCommandNetworkListsOffered_2() && allowedDomainsInputSchema()),
      ...attachedMachineInputField(),
    }),
  );
  coercedInputSchema = DoctorLazy(() => omitUnsandboxedFields(fullInputSchema(), UNSANDBOXED_INPUT_FIELDS));
  inputSchema = DoctorLazy(() =>
    (isBackgroundShellDisabled()
      ? coercedInputSchema().omit({
          run_in_background: true,
        })
      : coercedInputSchema()
    ).superRefine((value, ctx) => {}),
  );
  LOGGED_COMMAND_TYPES = [...COMMON_BACKGROUND_COMMANDS, "wget"];
});
//@ chunk-5xgkngpb.js:4961035-4961060 affinity
function getExtraCommandLogFields(input) {
  return {};
}
//@ chunk-5xgkngpb.js:4961138-4961281 affinity
/**
 * 把后台化原因（message/person）映射成结果标志 backgroundedToDeliverMessage / backgroundedByUser。
 */
function backgroundReasonToFlags(moveReason) {
  switch (moveReason) {
    case undefined:
      return;
    case "message":
      return {
        backgroundedToDeliverMessage: true,
      };
    case "person":
      return {
        backgroundedByUser: true,
      };
  }
}
//@ chunk-5xgkngpb.js:4961281-4961432 file-local
/**
 * 遥测用：取命令里第一个属于常见构建/运行命令表（LOGGED_COMMAND_TYPES）的首词，否则 "other"。
 */
function getCommandTypeForLogging(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return lit_2("other");
  for (let part of parts) {
    let firstToken = firstLineOf(part, " ");
    let found = LOGGED_COMMAND_TYPES.find((loggedType) => loggedType === firstToken);
    if (found) return fromEnum(found);
  }
  return lit_2("other");
}
//@ chunk-5xgkngpb.js:4961432-4965999 fingerprint (2.1.88 match: outputSchema, 0.531)
/**
 * Bash 输出 schema：stdout/stderr/interrupted/isImage、后台任务相关（backgroundTaskId、timedOutAfterMs、backgroundedBy*）、持久化输出、沙箱、各种给模型的提示（memoryLimitNote/triggeredNote/staleReadFileStateHint/ghRateLimitHint）、gitOperation 与 bashEditDiff。
 */
var outputSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var BACKGROUND_CWD_NOTE_SUFFIX;
deferInit("chunk-5xgkngpb.js:4961432", () => {
  outputSchema = DoctorLazy(() =>
    objectSchema({
      stdout: stringSchema().describe("The standard output of the command"),
      stderr: stringSchema().describe("The standard error output of the command"),
      rawOutputPath: stringSchema().optional().describe("Path to raw output file for large MCP tool outputs"),
      interrupted: booleanSchema().describe("Whether the command was interrupted"),
      isImage: booleanSchema().optional().describe("Flag to indicate if stdout contains image data"),
      backgroundTaskId: stringSchema()
        .optional()
        .describe("ID of the background task if command is running in background"),
      backgroundOutputPath: stringSchema()
        .optional()
        .describe(
          "@internal Path of the background task's output file on the machine that keeps the command, when that is not this process",
        ),
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
      backgroundCwdHint: stringSchema()
        .optional()
        .describe(
          "Model-facing note that the session cwd was not changed by a backgrounded command containing a directory-change builtin (cd/pushd/popd/chdir)",
        ),
      backgroundEndsWithFinalResponse: literal(true)
        .optional()
        .describe(
          "True when this backgrounded command is terminated at its caller's final response, so no completion notification can follow (a synchronous subagent's command, or a headless session that takes no further input and is not waiting for background commands); absent when the command survives",
        ),
      backgroundWakesOwner: literal(true)
        .optional()
        .describe(
          "True when the subagent that owns this backgrounded command parks for its end and is woken by it",
        ),
      dangerouslyDisableSandbox: booleanSchema()
        .optional()
        .describe("Flag to indicate if sandbox mode was overridden"),
      returnCodeInterpretation: stringSchema()
        .optional()
        .describe("Semantic interpretation for non-error exit codes with special meaning"),
      noOutputExpected: booleanSchema()
        .optional()
        .describe("Whether the command is expected to produce no output on success"),
      structuredContent: array(anySchema()).optional().describe("Structured content blocks"),
      persistedOutputPath: stringSchema()
        .optional()
        .describe(
          "Path to the persisted full output in tool-results dir (set when output is too large for inline)",
        ),
      persistedOutputSize: numberSchema()
        .optional()
        .describe("Total size of the output in bytes (set when output is too large for inline)"),
      stdoutHoldsOutputEnd: booleanSchema()
        .optional()
        .describe(
          "@internal True when stdout holds the first part of the persisted output, a line saying that the middle was left out, and then its last lines",
        ),
      tailInputPath: stringSchema()
        .optional()
        .describe("@internal Path to a saved copy of the output that the command piped into tail"),
      tailInputNote: stringSchema()
        .optional()
        .describe("@internal Model-facing note about the file at tailInputPath"),
      memoryLimitNote: stringSchema()
        .optional()
        .describe(
          "@internal Tells the model that the kernel killed a process for lack of memory while the command ran",
        ),
      triggeredNote: stringSchema()
        .optional()
        .describe(
          "@internal One line of advice for the model after a finished command, set by a rule in a feature flag",
        ),
      staleReadFileStateHint: stringSchema()
        .optional()
        .describe(
          "Model-facing note listing readFileState entries whose mtime bumped during this command (set when WRITE_COMMAND_MARKERS matches)",
        ),
      ghRateLimitHint: stringSchema()
        .optional()
        .describe(
          "Model-facing system-reminder appended when a gh command reports a GitHub API rate-limit error",
        ),
      gitOperation: gitOperationSchema()
        .optional()
        .describe(
          "Structured classification of git/gh operations detected in this command (commit/push/merge/rebase/PR). Client-facing \u2014 lets clients render git activity without re-parsing stdout; not surfaced to the model.",
        ),
      bashEditDiff: objectSchema({
        files: array(
          objectSchema({
            filePath: stringSchema(),
            hunks: array(hunkSchema()),
            created: literal(true).optional(),
            deleted: literal(true).optional(),
          }),
        ),
        moreFiles: numberSchema(),
        changedFiles: array(stringSchema()).optional(),
        unavailable: literal(true).optional(),
        skipped: literal(true).optional(),
        shared: literal(true).optional(),
      })
        .optional()
        .describe(
          "@internal Per-file diff of the working-tree changes this command made, for rendering and for PostToolUse Bash hooks (changedFiles: absolute paths of every changed file known, shown or not, at most 200; cut when shorter than files.length + moreFiles); not surfaced to the model.",
        ),
    }),
  );
  BACKGROUND_CWD_NOTE_SUFFIX =
    "directory changes made by the backgrounded command do not apply to subsequent commands.";
});
//@ chunk-5xgkngpb.js:4965999-4966056 layout
function formatBackgroundCwdHint(cwd) {
  return `Session cwd remains ${cwd}; ${BACKGROUND_CWD_NOTE_SUFFIX}`;
}
//@ chunk-5xgkngpb.js:4966056-4966191 layout
/**
 * 清洗跨进程传来的 backgroundCwdHint：只有形如本进程生成的 "Session cwd remains <合法路径>; …" 才保留，否则换成通用说法。
 */
function sanitizeBackgroundCwdHint(backgroundCwdHint) {
  let capturedCwd = /^Session cwd remains ([^;]+); /.exec(backgroundCwdHint)?.[1] ?? "";
  return isPlainAbsolutePath(capturedCwd) && backgroundCwdHint === formatBackgroundCwdHint(capturedCwd)
    ? backgroundCwdHint
    : `Session cwd is as it was; ${BACKGROUND_CWD_NOTE_SUFFIX}`;
}
//@ chunk-5xgkngpb.js:4966191-4966640 layout
/**
 * 跨进程（远程/另一台机器执行）结果的输出 schema：只挑选安全字段；后台任务 id 和输出路径只有在本地能对上时才保留。
 */
var outputSchemaAcrossProcesses; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4966191", () => {
  outputSchemaAcrossProcesses = DoctorLazy(() =>
    outputSchema()
      .pick({
        stdout: true,
        stderr: true,
        interrupted: true,
        isImage: true,
        timedOutAfterMs: true,
        noOutputExpected: true,
        ...BACKGROUND_OUTPUT_FIELDS,
      })
      .strip()
      .transform((output) => {
        let backgroundOutputFieldNames = getBackgroundOutputFieldNames(output);
        let { backgroundTaskId, backgroundOutputPath, backgroundEndsWithFinalResponse, backgroundCwdHint } =
          output;
        return backgroundTaskId === undefined ||
          backgroundOutputPath === undefined ||
          !isTaskIdOfType("local_bash", backgroundTaskId) ||
          !isTaskOutputPathFor(backgroundTaskId, backgroundOutputPath)
          ? backgroundOutputFieldNames
          : {
              ...backgroundOutputFieldNames,
              backgroundTaskId,
              backgroundOutputPath,
              backgroundEndsWithFinalResponse,
              ...(backgroundCwdHint !== undefined && {
                backgroundCwdHint: sanitizeBackgroundCwdHint(backgroundCwdHint),
              }),
            };
      }),
  );
});
//@ chunk-5xgkngpb.js:4966640-4966766 file-local
/**
 * 首个子命令不是 sleep 时允许超时自动转后台。
 */
function isAutobackgroundingAllowed(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return true;
  let baseCommand = parts[0]?.trim().split(/\s+/)[0];
  if (!baseCommand) return true;
  return !DISALLOWED_AUTO_BACKGROUND_COMMANDS.includes(baseCommand);
}
//@ chunk-5xgkngpb.js:4966766-4967046 fingerprint (2.1.88 match: detectBlockedSleepPattern, 1)
/**
 * 检测"sleep N（N≥阈值）"开头的阻塞写法，返回描述；validateInput 据此拒绝并建议改用 Monitor 或 run_in_background。
 */
function detectBlockedSleepPattern(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return null;
  let first = parts[0]?.trim() ?? "";
  let m = /^sleep\s+(\d+(?:\.\d*)?)\s*$/.exec(first);
  if (!m) return null;
  let secs = parseFloat(m[1]);
  if (secs < MAX_BLOCKED_SLEEP_LINES) return null;
  let rest = parts.slice(1).join(" ").trim();
  return rest ? `sleep ${secs} followed by: ${rest}` : `standalone sleep ${secs}`;
}
//@ chunk-5xgkngpb.js:4967046-4967093 layout
function getSessionEnvVarKeys(sandboxedCommand) {
  return sandboxedCommand === undefined
    ? getLastCheckedSessionEnvVarKeys()
    : sessionEnvVarNameSet(sandboxedCommand);
}
//@ chunk-5xgkngpb.js:4967093-4967189 layout
/**
 * 用 checkReadOnlyConstraints 判断这次 Bash 输入是否只读（考虑会话 env 变量键）；isReadOnly/isConcurrencySafe 都依赖它。
 */
function isReadOnlyBashInput(input, sessionEnvVarKeys) {
  let compoundCommandHasCd = commandHasAnyCd(input.command);
  return (
    checkReadOnlyConstraints(input, compoundCommandHasCd, {
      sessionEnvVarKeys,
    }).behavior === "allow"
  );
}
//@ chunk-5xgkngpb.js:4967189-4967276 layout
function isReadOnlyCommandOfflineEstimate(command) {
  return (
    checkReadOnlyConstraints(
      {
        command,
      },
      commandHasAnyCd(command),
      {
        offlineEstimate: true,
      },
    ).behavior === "allow"
  );
}
//@ chunk-5xgkngpb.js:4967276-4968966 layout
/**
 * 把工具实例上下文 e 与单次调用信息 n 合成一个 getter 视图：toolUseId、abortController、shellPermission（带本次 signal）、remoteCall、shellWallCapMs 等都取自本次调用。
 */
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
    get tools() {
      return baseContext.tools;
    },
    get readFileState() {
      return baseContext.readFileState;
    },
    get nestedMemoryAttachmentTriggers() {
      return baseContext.nestedMemoryAttachmentTriggers;
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
    get effort() {
      return baseContext.effort;
    },
    get effortLayerOverride() {
      return baseContext.effortLayerOverride;
    },
    get permissions() {
      return baseContext.permissions;
    },
    get unlayeredPermissions() {
      return baseContext.unlayeredPermissions;
    },
    get messages() {
      return baseContext.messages;
    },
    get systemPromptSnapshot() {
      return baseContext.systemPromptSnapshot;
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
    get remoteCall() {
      return callOptions.remoteCall;
    },
    get keptBackgroundShells() {
      return callOptions.keptBackgroundShells;
    },
    get inputFromAnotherMachine() {
      return callOptions.inputFromAnotherMachine;
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
  };
}
//@ chunk-5xgkngpb.js:4968966-4969376 layout
/**
 * "可能改写文件"的命令标记（--write/--fix/sed -i/prettier/black/cargo fmt/go fmt…），命中后才检查已读文件是否被改。
 */
var WRITE_COMMAND_MARKERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:4968966", () => {
  WRITE_COMMAND_MARKERS = new RegExp(
    [
      "--write",
      "--fix",
      "--in-place",
      "--auto-correct",
      "\\bg?sed\\b.*\\s-[a-zA-Z]*i",
      "\\brun\\s+format\\b",
      "\\brun\\s+fix\\b",
      "\\b(yarn|pnpm)\\s+format\\b",
      "\\blint:file\\b",
      "\\blint:fix\\b",
      "\\bblack\\b",
      "\\bisort\\b",
      "\\bruff\\s+format\\b",
      "\\bcargo\\s+(fmt|fix)\\b",
      "\\brustfmt\\b",
      "\\bgo\\s+fmt\\b",
      "\\bterraform\\s+fmt\\b",
      "\\bdprint\\s+fmt\\b",
      "\\bswiftformat\\b",
      "\\bphpcbf\\b",
    ].join("|"),
  );
});
//@ chunk-5xgkngpb.js:4969376-4969600 layout
/**
 * 命令匹配写入标记时，并发 stat readFileState 里的文件，找出 mtime 晚于命令开始且晚于记录时间的文件，用来生成"请先 Read 再编辑"的提示。
 */
async function findStaleReadFileStateEntries(command, readFileState, commandStartMs) {
  if (isDiskless()) {
    reportOnce("bash_staleness");
    return [];
  }
  if (!WRITE_COMMAND_MARKERS.test(command)) return [];
  let stalePaths = [];
  await Promise.all(
    Array.from(readFileState.entries(), ([filePath, readState]) =>
      getFileModificationTimeAsync(filePath)
        .then((fileModificationTime) => {
          if (fileModificationTime > commandStartMs && fileModificationTime > readState.timestamp)
            stalePaths.push(filePath);
        })
        .catch(() => {}),
    ),
  );
  return stalePaths;
}
//@ chunk-5xgkngpb.js:4969600-4989450 facade-exports (2.1.88 match: BashTool, 0.361)
/**
 * Bash 工具定义（name=Bash）。只读命令并发安全；checkPermissions 委托 bashPermissions；call 负责沙箱决策、执行（runShellCommand）、进度、错误转 ShellError、输出持久化/图片、git 操作识别、编辑 diff、已读文件过期提示和遥测。
 */
var BashTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:4969600", () => {
  BashTool = buildTool({
    name: BASH_TOOL_NAME,
    enablesCodeExecution: true,
    ruleContentField: "command",
    searchHint: "execute shell commands",
    remoteExecution: {
      supported: true,
      refusedInputFields: REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED,
      decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"],
    },
    backgrounding: "self",
    get maxResultSizeChars() {
      return getConfiguredBashOutputMaxChars();
    },
    persistenceThresholdCeiling: MAX_CONTEXT_TOKENS,
    strict: true,
    async description({ description }) {
      return description || "Run shell command";
    },
    async prompt({ model, tools, leanPrompt, bashFirstTrimmed, leanRewrite }) {
      return getSimplePrompt(
        model,
        await listPromptSkillCommands(tools),
        tools,
        leanPrompt,
        bashFirstTrimmed,
        leanRewrite,
      );
    },
    isConcurrencySafe(input) {
      return this.isReadOnly?.(input) ?? false;
    },
    suppressesAllPermissionUpdates(input) {
      let requestedHost = input?.[HOST_TOOL_INPUT_FIELD];
      return (
        typeof requestedHost === "string" &&
        requestedHost.trim() !== "" &&
        !isReservedMachineNameExact(requestedHost.trim())
      );
    },
    isReadOnly(input, toolUseContext) {
      return (
        !isRemoteOnlyCheck(BASH_TOOL_NAME) && isReadOnlyBashInput(input, getSessionEnvVarKeys(toolUseContext))
      );
    },
    notReadOnlyReason(input, toolUseContext) {
      if (isRemoteOnlyCheck(BASH_TOOL_NAME))
        return {
          message:
            "This session runs shell commands only in its cloud environment, so none can be verified as read-only here",
          everyInput: true,
        };
      let readOnlyResult = checkReadOnlyConstraints(input, commandHasAnyCd(input.command), {
        sessionEnvVarKeys: getSessionEnvVarKeys(toolUseContext),
      });
      if (readOnlyResult.behavior === "allow") return;
      return "notReadOnlyCommand" in readOnlyResult
        ? {
            message: readOnlyResult.message,
            part: readOnlyResult.notReadOnlyCommand,
          }
        : {
            message: readOnlyResult.message,
          };
    },
    sandboxNetworkLists(input) {
      return getCommandNetworkLists(input);
    },
    toAutoClassifierInput(input) {
      let dangerouslyDisableSandbox = input.dangerouslyDisableSandbox;
      let hasOtherFields = false;
      let requested = isRemoteToolsForwardEnabled2() ? splitHostField(input).requested : undefined;
      let hostLabel =
        requested !== undefined && !isReservedMachineNameExact(requested)
          ? machineLabelForMessage(requested) || undefined
          : undefined;
      let networkLists = commandNetworkListsInput(input);
      if (hostLabel !== undefined || networkLists !== undefined)
        return {
          command: input.command,
          ...false,
          ...(hostLabel !== undefined && {
            [HOST_TOOL_INPUT_FIELD]: hostLabel,
          }),
          ...networkLists,
        };
      return input.command;
    },
    async preparePermissionMatcher({ command }) {
      return buildRuleRelevanceFilter(command);
    },
    isSearchOrReadCommand(input) {
      let parsed = inputSchema().safeParse(input);
      if (!parsed.success)
        return {
          isSearch: false,
          isRead: false,
          isList: false,
        };
      return isSearchOrReadBashCommand(parsed.data.command);
    },
    get inputSchema() {
      return inputSchema();
    },
    coerceInput: normalizeBashInputAliases,
    get outputSchema() {
      return outputSchema();
    },
    get outputSchemaAcrossProcesses() {
      return outputSchemaAcrossProcesses();
    },
    fromAnotherProcess(result, input) {
      if (
        !result.interrupted &&
        result.timedOutAfterMs === undefined &&
        result.backgroundTaskId === undefined
      )
        countGitOpsFromCommand(String(input.command ?? ""));
      return {};
    },
    userFacingName(input) {
      if (!input) return "Bash";
      return env.CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR && shouldUseSandbox(input)
        ? "SandboxedBash"
        : "Bash";
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
    extractSearchText({ stdout, stderr }) {
      return stderr
        ? `${stdout}
${stderr}`
        : stdout;
    },
    stripForStorage(result, shouldStore) {
      if (!shouldStore) return result;
      if (
        typeof result !== "object" ||
        result === null ||
        typeof result.stdout !== "string" ||
        typeof result.stderr !== "string"
      )
        return result;
      if (result.stdout === "" && result.stderr === "") return result;
      return {
        ...result,
        stdout: "",
        stderr: "",
      };
    },
    mapToolResultToToolResultBlockParam(
      {
        interrupted,
        stdout,
        stderr,
        isImage,
        backgroundTaskId,
        backgroundOutputPath,
        backgroundedByUser,
        backgroundedToDeliverMessage,
        backgroundedByTurnAbort,
        timedOutAfterMs,
        subagentCapApplied,
        backgroundEndsWithFinalResponse,
        backgroundWakesOwner,
        backgroundCwdHint,
        structuredContent,
        persistedOutputPath,
        persistedOutputSize,
        stdoutHoldsOutputEnd,
        tailInputNote,
        memoryLimitNote,
        triggeredNote,
        staleReadFileStateHint,
        ghRateLimitHint,
      },
      toolUseId,
    ) {
      if (structuredContent && structuredContent.length > 0)
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: structuredContent,
        };
      if (isImage) {
        let imageToolResult = buildImageToolResult(stdout, toolUseId);
        if (imageToolResult) {
          let joined = [
            typeof stderr === "string" ? stderr.trim() : "",
            tailInputNote,
            memoryLimitNote,
          ].filter(Boolean).join(`
`);
          if (joined)
            return {
              ...imageToolResult,
              content: [
                ...(Array.isArray(imageToolResult.content) ? imageToolResult.content : []),
                {
                  type: "text",
                  text: joined,
                },
              ],
            };
          return imageToolResult;
        }
      }
      let stdoutTrimmed = stdout;
      if (stdout) {
        stdoutTrimmed = stdout.replace(/^(\s*\n)+/, "");
        stdoutTrimmed = stdoutTrimmed.trimEnd();
      }
      if (persistedOutputPath) {
        let { start, end } =
          stdoutHoldsOutputEnd === true
            ? splitOutputAtMarker(stdoutTrimmed)
            : {
                start: stdoutTrimmed,
                end: undefined,
              };
        let preview = generatePreview(
          start,
          end === undefined ? PREVIEW_SIZE_CHARS : PREVIEW_SIZE_CHARS - OUTPUT_CUT_TAIL_CHARS,
        );
        stdoutTrimmed = buildPersistedOutputMessage({
          filepath: persistedOutputPath,
          originalSize: persistedOutputSize ?? 0,
          isJson: false,
          preview: preview.preview,
          hasMore: preview.hasMore,
          previewEnd: end,
          truncatedAtBytes:
            (persistedOutputSize ?? 0) >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : undefined,
        });
      }
      let trimmed = stderr.trim();
      if (interrupted) {
        if (stderr) trimmed += NEWLINE;
        trimmed += "<error>Command was aborted before completion</error>";
      }
      let backgroundMessage = "";
      if (backgroundTaskId) {
        backgroundMessage = formatBackgroundTaskMessage({
          backgroundTaskId,
          outputPath: backgroundOutputPath ?? getTaskOutputPath(backgroundTaskId),
          backgroundedByUser,
          backgroundedToDeliverMessage,
          backgroundedByTurnAbort,
          timedOutAfterMs,
          subagentCapApplied,
          noOutputSeenAtTimeout: timedOutAfterMs !== undefined && !stdoutTrimmed,
          reapedAtFinalResponse: backgroundEndsWithFinalResponse,
          wakesItsOwner: backgroundWakesOwner,
          readToolName: READ,
        });
        if (backgroundCwdHint)
          backgroundMessage += `
${backgroundCwdHint}`;
        if (isInputHoldOn())
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: backgroundTaskNotice(
              backgroundTaskId,
              [trimmed, backgroundMessage].filter(Boolean).join(`
`),
              {
                backgroundedByUser,
                ending: backgroundEndsWithFinalResponse ? "final_response" : undefined,
              },
            ),
          };
      }
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: [
          stdoutTrimmed,
          trimmed,
          backgroundMessage,
          (tailInputNote || memoryLimitNote || triggeredNote) &&
            !stdoutTrimmed &&
            !trimmed &&
            !backgroundMessage &&
            `(${BASH_TOOL_NAME} completed with no output)`,
          tailInputNote,
          memoryLimitNote,
          triggeredNote,
          staleReadFileStateHint,
          ghRateLimitHint,
        ].filter(Boolean).join(`
`),
        is_error: interrupted,
      };
    },
    create(sessionCtx) {
      return {
        async validateInput(input, callCtx) {
          let toolCallCtx = callCtx;
          if (canRunToolsOnThisMachine() && splitHostField(input).requested !== undefined)
            return {
              result: false,
              message: hostFieldNotForwardedMessage(),
              errorCode: 11,
            };
          let useSandbox = shouldUseSandbox(input);
          let refusal = sandboxPolicyRefusal(useSandbox, input.command, false, "bash");
          if (refusal !== null) {
            logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
              tool: lit_2("bash"),
            });
            return {
              result: false,
              message: refusal,
              errorCode: 14,
            };
          }
          if (
            !isBackgroundTasksOff() &&
            backgroundCompletionNoticeEnabled() &&
            toolCallCtx.remoteCall?.constraints.background !== "forbidden" &&
            !input.run_in_background &&
            toolCallCtx.shellWallCapMs === undefined
          ) {
            let blockedSleepPattern = detectBlockedSleepPattern(input.command);
            if (blockedSleepPattern !== null)
              return {
                result: false,
                message: `Blocked: ${blockedSleepPattern}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`,
                errorCode: 10,
              };
          }
          let duplicateBackgroundCommand = findDuplicateBackgroundCommand(
            {
              command: input.command,
              cwd: getCwd(),
              agentId: sessionCtx.agentId,
              toolUseId: callCtx.toolUseId,
            },
            sessionCtx.taskRegistry,
          );
          if (
            duplicateBackgroundCommand !== undefined &&
            findToolByName(sessionCtx.tools, TASKSTOP) !== undefined &&
            isWoollyToastGateOn()
          )
            return {
              result: false,
              errorCode: 15,
              message: `Not started: this same command, in this directory, was moved to the background and has been running for ${formatDuration(
                Date.now() - duplicateBackgroundCommand.startTime,
                {
                  mostSignificantOnly: true,
                },
              )} (ID: ${duplicateBackgroundCommand.id}). Its output is being written to: ${duplicateBackgroundCommand.outputFile}. Let it finish, or, to run it again now, stop it first with ${TASKSTOP}.`,
            };
          let reservationMessage = input.run_in_background
            ? toolCallCtx.remoteCall?.backgroundShells?.reserve()
            : undefined;
          if (reservationMessage !== undefined)
            return {
              result: false,
              message: reservationMessage,
              errorCode: 12,
            };
          let domainsCheck = checkAllowedDomainsInput(input, useSandbox);
          if (domainsCheck !== undefined) return domainsCheck;
          return (
            (await guardSyncedMemoryRemoval(memoryWatchers.of(sessionCtx.session.host), () =>
              extractLiteralRmTargets(input.command, getCwd()),
            )) ?? {
              result: true,
            }
          );
        },
        permissionCheckFailureDecision(input, callCtx) {
          let shellCallContext = makeShellCallContext(sessionCtx, callCtx);
          return denyCrashedCheckUnderCommandClamp(BASH_TOOL_NAME, shellCallContext.shellPermission);
        },
        async checkPermissions(input, callCtx) {
          let shellCallContext = makeShellCallContext(sessionCtx, callCtx);
          return mergeBashSubcommandVerdicts(
            input,
            shellCallContext.shellPermission,
            await bashPermissionWithTextFallback(
              input,
              shellCallContext.shellPermission,
              undefined,
              (verdict) =>
                mergeBashSubcommandVerdicts(input, shellCallContext.shellPermission, verdict, "eachVerdict"),
            ),
            "chosenVerdict",
          );
        },
        async call(input, callCtx) {
          let shellCallContext = makeShellCallContext(sessionCtx, callCtx);
          let { parentMessage, onProgress } = callCtx;
          let model = safeRequestedModelName(parentMessage, shellCallContext.mainLoopModel());
          let commandStartMs = Math.floor(Date.now() / 1000) * 1000;
          let sameAsRunningBackground =
            findDuplicateBackgroundCommand(
              {
                command: input.command,
                cwd: getCwd(),
                agentId: shellCallContext.agentId,
                toolUseId: shellCallContext.toolUseId,
              },
              shellCallContext.taskRegistry,
            ) !== undefined;
          let isBackgroundLaunched = shellCallContext.toolState.get(BashRepeatMeter);
          using repeatMeter = isBashRepeatMetered(shellCallContext.session.id)
            ? isBackgroundLaunched.begin({
                input,
                cwd: getCwd(),
                agentId: shellCallContext.agentId,
                inAgentWorktree: shellCallContext.agentWorktree !== undefined,
                toolUseId:
                  isPlainToolUseId(shellCallContext.toolUseId) && shellCallContext.innerCall !== true
                    ? shellCallContext.toolUseId
                    : undefined,
                messages: shellCallContext.messages(),
                taskRegistry: shellCallContext.taskRegistry,
                isReadOnly: isReadOnlyCommandOfflineEstimate,
              })
            : isBackgroundLaunched.skip();
          let proxyFailureSeq = 0;
          try {
            proxyFailureSeq = getAgentProxyFailures();
          } catch (error) {
            logError(error);
          }
          let { abortController, emitToolProgress } = shellCallContext;
          let outputAccumulator = new EndTruncatingAccumulator();
          let cwdResetMessage = "";
          let sandboxViolationText = "";
          let cwd;
          let commandInterpretation;
          let progressIndex = 0;
          let interrupted = false;
          let hadSandboxViolation = false;
          let sandboxViolations;
          let execResult;
          await using outputFileCopier = copyShellOutputFile(shellCallContext.taskRegistry);
          let output;
          let commandClass;
          let bashTestOutcome;
          let isMainThread = !shellCallContext.agentId;
          let constraints = shellCallContext.remoteCall?.constraints;
          let sandboxRequired = constraints?.sandbox === "required";
          let preventCwdChanges = !isMainThread || constraints?.pinCwd === true;
          let isPlainLocalCall =
            !shellCallContext.userTypedShellDispatch &&
            shellCallContext.innerCall !== true &&
            shellCallContext.remoteCall === undefined;
          let isTrackedCall = isPlainLocalCall && shellCallContext.inputFromAnotherMachine !== true;
          let initialOomKillCount = isTrackedCall ? currentOomKillCount() : undefined;
          let oomNoteResult;
          let userTypedShellDispatch = shellCallContext.userTypedShellDispatch;
          let useSandbox = shouldUseSandbox(input, {
            disableUnsandboxedCommands: sandboxRequired,
            userTypedShellDispatch,
          });
          let refusal = sandboxPolicyRefusal(
            useSandbox,
            input.command,
            userTypedShellDispatch && input.dangerouslyDisableSandbox === true,
            "bash",
          );
          if (refusal !== null) {
            logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
              tool: lit_2("bash"),
            });
            throw new SandboxPolicyRefusalError(refusal);
          }
          let sandboxEnabled = SandboxManager.isSandboxingEnabled();
          let effectiveFilesystemPolicy = getEffectiveFilesystemPolicy();
          if (sandboxRequired) {
            let posture =
              !useSandbox || effectiveFilesystemPolicy !== "strict" || isScrubEnabled()
                ? {
                    confined: false,
                    reason: "sandbox_unconfined",
                  }
                : await ensureDeviceSandboxPosture();
            if (!posture.confined) {
              logFeatureSad("sandbox_exec", "remote_floor_refusal");
              throw new SandboxPolicyRefusalError(
                "This call must run inside a fully confining sandbox and none is available here. The command was not run.",
                posture.reason,
              );
            }
          }
          let sandboxed = useSandbox;
          let destructiveCategory = getDestructiveTargetCategory(input.command);
          let toolUseId = parentTaskId(shellCallContext.toolUseId);
          let zshNoteInPrompt = isPinnedPromptInSystemPrompt(shellCallContext);
          let repeatReason = isTrackedCall && !useSandbox ? tailInputKind(input.command) : undefined;
          let meter = repeatReason === undefined ? undefined : tailNoteRule();
          let isRepeated =
            repeatReason !== undefined &&
            !(input.run_in_background && shellCallContext.keptBackgroundShells) &&
            isTailNoteWanted(repeatReason, meter) &&
            callCtx.commandAsWritten === input.command &&
            hasCcrFamily(callCtx.outsideResultReader) &&
            (await getExecutorShellForAnalytics(shellCallContext.storageV5)) === "bash"
              ? await startTailInputCapture()
              : undefined;
          await using file = isRepeated?.file;
          let editDiffWanted =
            isBashEditDiffEnabled(shellCallContext.permissions().mode) &&
            !input.run_in_background &&
            !isReadOnlyBashInput(input, sessionEnvVarNameSet(shellCallContext));
          let editDiffSkipped =
            editDiffWanted &&
            shouldSkipEditDiff(
              shellCallContext.toolState,
              callCtx.outsideResultReader,
              hasLiveRootObserver(),
            );
          let commandMovesTree = editDiffSkipped && commandMovesWorkTree(input.command);
          let gitRoot =
            editDiffSkipped && !commandMovesTree && shellCallContext.toolUseId !== undefined && isLinux()
              ? (findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd()))
              : null;
          let observerRoot = gitRoot !== null && startWriteObserver(gitRoot) === "ready" ? gitRoot : null;
          if (observerRoot !== null) await flushObservedWrites(observerRoot);
          let hasEditRecorder =
            observerRoot !== null &&
            shellCallContext.toolUseId !== undefined &&
            (await startEditRecorder(observerRoot));
          if (hasEditRecorder && observerRoot && shellCallContext.toolUseId !== undefined)
            beginCommandObservation(shellCallContext.toolUseId, observerRoot);
          let now = Date.now();
          let snapshotGivenUp =
            observerRoot !== null && !hasEditRecorder && !isRepoSnapshotGivenUp(observerRoot);
          let now_2 = Date.now();
          let before =
            editDiffSkipped && !commandMovesTree && !hasEditRecorder
              ? snapshotGivenUp
                ? "unavailable"
                : ((await takeBashSnapshot(getCwd())) ?? (await takeBashSnapshot(getOriginalCwd())))
              : null;
          let editDiffWaitMs = Date.now() - now_2;
          let isSharedSnapshot =
            before === "unavailable" ? isSharedSnapshotEnabled() : before?.sharesTreeReads === true;
          let concurrentRepoRoot = editDiffWanted
            ? (observerRoot ??
              (before && before !== "unavailable"
                ? before.repoRoot
                : (findGitRootRecheckingNegative(getCwd()) ??
                  findGitRootRecheckingNegative(getOriginalCwd()))))
            : null;
          let concurrentToken =
            concurrentRepoRoot !== null ? registerConcurrentCommand(concurrentRepoRoot) : null;
          let stayedConcurrent = false;
          let watchedEditDiff = null;
          let postCommandDiff;
          let endedOnHold = false;
          let readOnlyCheck;
          let readOnlyResult = await prepareNamedRemoval(memoryWatchers.of(sessionCtx.session.host), () =>
            findRmTargets(input.command, getCwd()),
          );
          try {
            let shellRun = runShellCommand({
              input,
              useSandbox,
              networkLists: takeCommandNetworkLists(shellCallContext.toolUseId, input.command),
              constraints,
              backgroundHeld: () => shouldHoldForPlugin(shellCallContext),
              onHeldEnd: () => {
                endedOnHold = true;
              },
              servedBackground:
                shellCallContext.remoteCall?.backgroundShells ?? shellCallContext.keptBackgroundShells,
              keptStarter: shellCallContext.keptBackgroundShells,
              onNote: shellCallContext.remoteCall?.onNote,
              abortController,
              taskRegistry: shellCallContext.taskRegistry,
              emitToolProgress,
              session: shellCallContext.session,
              preventCwdChanges,
              isMainThread,
              subagentCapMs: getSubagentForegroundCapMs(shellCallContext, parentMessage),
              toolUseId: shellCallContext.toolUseId,
              toolState: shellCallContext.toolState,
              endNote: isTrackedCall
                ? tailInputAsker(
                    file,
                    input.command,
                    shellCallContext.session,
                    shellCallContext.storageV5,
                    callCtx.outsideResultReader,
                    tailInputNote(input.command, shellCallContext.toolState.get(BashNoteSessionState)),
                  )
                : undefined,
              startTelemetry: repeatMeter.forSettleRow(),
              attributionMessageId: parentMessage?.message.id,
              callTiming: callCtx.timing,
              agentId: shellCallContext.agentId,
              caller: abortScopeOf(shellCallContext),
              shellWallCapMs: shellCallContext.shellWallCapMs,
              promptShellPluginId: shellCallContext.promptShellPluginId,
              agentWorktree: shellCallContext.agentWorktree,
              isolationRoot: isolationWorktreeFor(shellCallContext),
              sessionEnvVars: shellCallContext.sessionEnvVars,
              storageV5: shellCallContext.storageV5,
              tailInput: file && {
                fd: file.handle.fd,
                path: file.path,
              },
              effortLevel: modelSupportsEffort(shellCallContext.mainLoopModel())
                ? getEffortLevelOrHigh(
                    shellCallContext.mainLoopModel(),
                    shellCallContext.effort(),
                    shellCallContext.effortLayerOverride(),
                  )
                : undefined,
            });
            let onProgressFn = shouldUseShellTool(
              shellCallContext.remoteCall !== undefined,
              shellCallContext.hasSpendCap,
            )
              ? onProgress
              : undefined;
            let nextResult;
            do {
              nextResult = await shellRun.next();
              if (!nextResult.done && onProgressFn) {
                let progressEvent = nextResult.value;
                onProgressFn({
                  type: "progress",
                  toolUseID: `bash-progress-${progressIndex++}`,
                  data: {
                    type: "bash_progress",
                    output: progressEvent.output,
                    fullOutput: progressEvent.fullOutput,
                    elapsedTimeSeconds: progressEvent.elapsedTimeSeconds,
                    totalLines: progressEvent.totalLines,
                    totalBytes: progressEvent.totalBytes,
                    taskId: progressEvent.taskId,
                    timeoutMs: progressEvent.timeoutMs,
                  },
                });
              }
            } while (!nextResult.done);
            execResult = nextResult.value;
            if (execResult.backgroundTaskId === undefined && !execResult.interrupted)
              await readOnlyResult?.();
            if (
              execResult.backgroundTaskId !== undefined &&
              execResult.timedOutAfterMs !== undefined &&
              shellCallContext.innerCall !== true
            )
              execResult = {
                ...execResult,
                stdout: await readShellOutputSoFar(execResult.backgroundTaskId, PREVIEW_SIZE_CHARS),
              };
            outputFileCopier.track(execResult);
            readOnlyCheck =
              file &&
              (await persistTailInput(
                file,
                input.command,
                execResult,
                shellCallContext.session,
                shellCallContext.storageV5,
                callCtx.outsideResultReader,
              ));
            if (execResult.intercepted) sandboxed = false;
            output = await withSpilledOutputTail(execResult.stdout, execResult.outputFilePath);
            commandClass = classifyBashCommand(input.command);
            trackWorkAfterStop(getTaskRunState().afterHeavyStops, {
              agentId: shellCallContext.agentId,
              kinds: commandClass.bash_command_kinds,
              usage: execResult.shellUsage,
              stoppedAtLimit: false,
            });
            bashTestOutcome = fromEnumOpt(
              classifyTestOutcome(commandClass, output, execResult, input.command),
            );
            if (
              !execResult.backgroundTaskId &&
              trackGitOperations(shellCallContext.session.host, input.command, execResult.code, output)
                .prResolved
            )
              shellCallContext.markPrResolvedThisSession();
            let abortReason = unwrapAbortReason(abortController.signal.reason);
            let isInterruptAbort = execResult.interrupted && abortReason === "interrupt";
            let interrupted_2 = execResult.interrupted && isUserInitiatedAbortReason(abortReason);
            if (execResult.interrupted && abortReason === "background") throw new AbortError_2();
            outputAccumulator.append((execResult.stdout || "").trimEnd() + NEWLINE);
            commandInterpretation = DEFAULT_SEMANTIC_2(
              input.command,
              execResult.code,
              execResult.stdout || "",
              "",
            );
            if (output.includes(".git/index.lock': File exists")) logEvent("tengu_git_index_lock_error", {});
            if (commandInterpretation.isError && !isInterruptAbort) {
              if (execResult.code !== 0) outputAccumulator.append(`Exit code ${execResult.code}`);
            }
            cwd = getSessionProject(shellCallContext.session).cwd;
            if (!preventCwdChanges) {
              if (
                resetCwdIfOutsideProject(shellCallContext.session, shellCallContext.unlayeredPermissions()) ||
                execResult.cwdChangeRefused
              )
                cwdResetMessage = stdErrAppendShellResetMessage("");
            }
            let stdout = execResult.stdout || "";
            let annotatedStdout = sandboxed
              ? SandboxManager.annotateStderrWithSandboxFailures(
                  shellCallContext.toolUseId ?? input.command,
                  stdout,
                )
              : stdout;
            hadSandboxViolation = annotatedStdout !== stdout;
            if (sandboxed && execResult.backgroundTaskId === undefined)
              sandboxViolations = getParsedSandboxViolations(shellCallContext.toolUseId ?? input.command);
            if (hadSandboxViolation) sandboxViolationText = annotatedStdout.slice(stdout.length).trim();
            if (execResult.preSpawnError) {
              if (/null bytes/.test(execResult.preSpawnError))
                throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                  execResult.preSpawnError,
                  "Bash: command contained null bytes (argv echo redacted)",
                );
              let preSpawnError = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                execResult.preSpawnError,
                "Bash: pre-spawn error (cwd/argv redacted)",
              );
              throw execResult.preSpawnErrorCode === "e2big"
                ? tagObject(preSpawnError, {
                    kind: "spawn_arg_limit",
                  })
                : preSpawnError;
            }
            if (isTrackedCall && execResult.backgroundTaskId === undefined && !execResult.intercepted)
              oomNoteResult = maybeShowBashNote(
                initialOomKillCount,
                shellCallContext.toolState.get(OomKillNoteState),
              );
            let isAbortedRun =
              execResult.interrupted ||
              execResult.timedOut === true ||
              execResult.timedOutAfterMs !== undefined;
            if (
              sandboxed &&
              shellCallContext.remoteCall !== undefined &&
              (hadSandboxViolation || !isAbortedRun)
            )
              shellCallContext.remoteCall.onNote(
                buildSandboxFailureHint({
                  command: input.command,
                  output: output + sandboxViolationText,
                  failed: commandInterpretation.isError && !isAbortedRun,
                  violationRecorded: hadSandboxViolation,
                  filesystemPolicy: effectiveFilesystemPolicy,
                  additionalDenyRead: () => constraints?.additionalDenyRead ?? [],
                }),
              );
            if (commandInterpretation.isError && !isInterruptAbort) {
              let largeOutputMessage =
                isPlainLocalCall &&
                !execResult.interrupted &&
                execResult.outputFilePath !== undefined &&
                !isBase64DataUri(trimBlankEdgeLines(stdout)) &&
                shouldBuildLargeOutputMessage() &&
                hasCcrFamily(callCtx.outsideResultReader)
                  ? await buildLargeOutputMessage(
                      execResult,
                      stdout,
                      shellCallContext.session,
                      shellCallContext.storageV5,
                    )
                  : undefined;
              let failureNote =
                isPlainLocalCall &&
                readOnlyCheck === undefined &&
                !execResult.interrupted &&
                execResult.timedOut !== true &&
                execResult.backgroundTaskId === undefined
                  ? matchBashNoteRule(
                      input.command,
                      execResult.shellUsage,
                      true,
                      shellCallContext.toolState.get(BashNoteSessionState),
                    )
                  : undefined;
              logEvent("tengu_bash_tool_command_failed", {
                model,
                command_type: getCommandTypeForLogging(input.command),
                ...commandClass,
                stdout_length: stdout.length,
                stderr_length: 0,
                exit_code: execResult.code,
                interrupted: execResult.interrupted,
                output_end_shown: largeOutputMessage !== undefined,
                tail_input_candidate: repeatReason === "check",
                tail_input_candidate_other: repeatReason === "other",
                ...(meter !== undefined && {
                  tail_input_flag_on: meter,
                }),
                tail_input_copied: file !== undefined,
                tail_input_kept: readOnlyCheck !== undefined,
                ...(readOnlyCheck !== undefined && {
                  tail_input_kept_bytes: readOnlyCheck.bytes,
                }),
                ...withTailNote(isRepeated),
                triggered_note_rule: failureNote?.rule ?? 0,
                triggered_note_shown: failureNote?.note !== undefined,
                oom_kill_during_command: oomNoteResult?.hit === true,
                oom_kill_note_shown: oomNoteResult?.note !== undefined,
                ...buildCommandTimingFields(execResult.shellUsage),
                zsh_note_in_prompt: zshNoteInPrompt,
                executor_shell: await getExecutorShellForAnalytics(shellCallContext.storageV5),
                executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL),
                ...detectShellDialectIssues(input.command, output),
                bash_test_outcome: bashTestOutcome,
                sandboxed,
                sandbox_enabled: sandboxEnabled,
                dangerously_disable_sandbox: input.dangerouslyDisableSandbox ?? false,
                user_typed_shell_dispatch: userTypedShellDispatch,
                filesystem_policy: fromEnum(effectiveFilesystemPolicy),
                call_origin: fromEnum(constraints ? "remote" : "local"),
                ...getExtraCommandLogFields(input),
                had_sandbox_violation: sandboxed && hadSandboxViolation,
                same_as_running_background: sameAsRunningBackground,
                tool_use_id: toolUseId,
                destructive_category: fromEnum(destructiveCategory ?? "none"),
                destructive_target_scope: fromEnum(
                  classifyDestructiveTargetScope(input.command, getCwd(), destructiveCategory),
                ),
                git_destructive_target: fromEnum(
                  classifyGitDestructiveTarget(input.command, destructiveCategory),
                ),
                permission_mode: fromEnum(shellCallContext.permissions().mode),
                ...repeatMeter.ended(
                  execResult,
                  true,
                  {
                    persisted: largeOutputMessage !== undefined,
                    endShown: largeOutputMessage !== undefined,
                  },
                  {
                    line: repeatReason,
                    flagOn: meter,
                    kept: readOnlyCheck !== undefined,
                  },
                ),
                reads_own_output: classifySavedOutputPath(input.command, shellCallContext.session),
              });
              let proxyFailureNote;
              try {
                proxyFailureNote = describeAgentProxyFailures(proxyFailureSeq);
              } catch (error) {
                logError(error);
              }
              throw new ShellError({
                stdout: "",
                stderr: [
                  proxyFailureNote,
                  endedOnHold ? ENDED_INSTEAD_OF_BACKGROUND_MESSAGE : undefined,
                  readOnlyCheck?.note,
                  oomNoteResult?.note,
                  failureNote?.note,
                ].reduce(
                  (acc, stderrPart) =>
                    stderrPart === undefined ? acc : `${acc.trimEnd()}${NEWLINE}${NEWLINE}${stderrPart}`,
                  largeOutputMessage === undefined
                    ? annotatedStdout
                    : largeOutputMessage + sandboxViolationText,
                ),
                code: execResult.code,
                interrupted: interrupted_2,
                hadSandboxViolation,
                sandboxViolations,
                sandboxed,
              });
            }
            interrupted = execResult.interrupted;
            watchedEditDiff =
              hasEditRecorder && observerRoot && shellCallContext.toolUseId
                ? await collectWatchedEditDiff(
                    observerRoot,
                    shellCallContext.toolUseId,
                    Boolean(execResult.backgroundTaskId),
                    interrupted,
                    shellCallContext.readFileState,
                    now,
                  )
                : null;
            let now_2 = Date.now();
            let onRead = () => {
              if (concurrentToken && concurrentRepoRoot !== null)
                unregisterConcurrentCommand(concurrentRepoRoot, concurrentToken);
            };
            postCommandDiff =
              !execResult.backgroundTaskId &&
              !commandMovesTree &&
              !watchedEditDiff &&
              before &&
              before !== "unavailable" &&
              !interrupted
                ? await diffAfterCommand(
                    before,
                    onRead,
                    before.sharesTreeReads &&
                      getAutoModeClassifierRole(shellCallContext.permissions().mode, {
                        peek: true,
                      }) !== "off"
                      ? {
                          signal: abortController.signal,
                          onReadFailed: onRead,
                        }
                      : undefined,
                  )
                : undefined;
            editDiffWaitMs += Date.now() - now_2;
          } catch (error) {
            if (hasEditRecorder && shellCallContext.toolUseId !== undefined) {
              let observation = await endCommandObservation(shellCallContext.toolUseId);
              if (
                observerRoot &&
                (observation === null ||
                  observation.paths.length > 0 ||
                  observation.overflow ||
                  observation.watchEnds)
              )
                forgetRecorder(observerRoot);
            }
            throw error;
          } finally {
            if (concurrentToken && concurrentRepoRoot !== null)
              stayedConcurrent = unregisterConcurrentCommand(concurrentRepoRoot, concurrentToken);
            if (before && !snapshotGivenUp) logEditDiffWait(editDiffWaitMs, isSharedSnapshot);
            if (before && before !== "unavailable" && postCommandDiff !== null)
              forgetRecorder(before.repoRoot);
            if (editDiffWanted && !editDiffSkipped && concurrentRepoRoot !== null)
              forgetRecorder(concurrentRepoRoot);
            if (commandMovesTree) {
              let gitRoot =
                findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd());
              if (gitRoot !== null) forgetRecorder(gitRoot);
            }
            if (shellCallContext.toolUseId)
              emitToolProgress?.({
                kind: "clear",
                toolUseId: shellCallContext.toolUseId,
              });
            if (!isReadOnlyBashInput(input, sessionEnvVarNameSet(shellCallContext))) {
              shellCallContext.applyFileHistoryOp({
                kind: "touch",
              });
              repeatMeter.mayHaveWritten = true;
            }
          }
          let stdout = outputAccumulator.toString();
          let persistedOutput = await persistBashOutput(
            execResult,
            shellCallContext.session,
            shellCallContext.storageV5,
            outputFileCopier,
          );
          let path = persistedOutput?.path;
          let size = persistedOutput?.size;
          let outputTail =
            persistedOutput !== undefined &&
            isTrackedCall &&
            !interrupted &&
            !isBase64DataUri(trimBlankEdgeLines(stdout)) &&
            shouldShowOutputTail()
              ? await readOutputTail(
                  execResult,
                  stdout,
                  PREVIEW_SIZE_CHARS - OUTPUT_CUT_TAIL_CHARS,
                  OUTPUT_CUT_TAIL_CHARS,
                  true,
                )
              : undefined;
          let successNote =
            isTrackedCall &&
            readOnlyCheck === undefined &&
            !interrupted &&
            execResult.backgroundTaskId === undefined &&
            !isBase64DataUri(trimBlankEdgeLines(stdout))
              ? matchBashNoteRule(
                  input.command,
                  execResult.shellUsage,
                  false,
                  shellCallContext.toolState.get(BashNoteSessionState),
                )
              : undefined;
          logEvent("tengu_bash_tool_command_executed", {
            model,
            command_type: getCommandTypeForLogging(input.command),
            ...commandClass,
            stdout_length: stdout.length,
            stderr_length: 0,
            exit_code: execResult.code,
            interrupted,
            output_end_shown: outputTail !== undefined,
            tail_input_candidate: repeatReason === "check",
            tail_input_candidate_other: repeatReason === "other",
            ...(meter !== undefined && {
              tail_input_flag_on: meter,
            }),
            tail_input_copied: file !== undefined,
            tail_input_kept: readOnlyCheck !== undefined,
            ...(readOnlyCheck !== undefined && {
              tail_input_kept_bytes: readOnlyCheck.bytes,
            }),
            ...withTailNote(isRepeated),
            triggered_note_rule: successNote?.rule ?? 0,
            triggered_note_shown: successNote?.note !== undefined,
            oom_kill_during_command: oomNoteResult?.hit === true,
            oom_kill_note_shown: oomNoteResult?.note !== undefined,
            ...buildCommandTimingFields(execResult.shellUsage),
            zsh_note_in_prompt: zshNoteInPrompt,
            executor_shell: await getExecutorShellForAnalytics(shellCallContext.storageV5),
            executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL),
            ...detectShellDialectIssues(input.command, output),
            bash_test_outcome: bashTestOutcome,
            sandboxed,
            sandbox_enabled: sandboxEnabled,
            dangerously_disable_sandbox: input.dangerouslyDisableSandbox ?? false,
            user_typed_shell_dispatch: userTypedShellDispatch,
            filesystem_policy: fromEnum(effectiveFilesystemPolicy),
            call_origin: fromEnum(constraints ? "remote" : "local"),
            ...getExtraCommandLogFields(input),
            had_sandbox_violation: sandboxed && hadSandboxViolation,
            was_backgrounded: Boolean(execResult.backgroundTaskId),
            same_as_running_background: sameAsRunningBackground,
            tool_use_id: toolUseId,
            destructive_category: fromEnum(destructiveCategory ?? "none"),
            destructive_target_scope: fromEnum(
              classifyDestructiveTargetScope(input.command, getCwd(), destructiveCategory),
            ),
            git_destructive_target: fromEnum(
              classifyGitDestructiveTarget(input.command, destructiveCategory),
            ),
            permission_mode: fromEnum(shellCallContext.permissions().mode),
            ...repeatMeter.ended(
              execResult,
              false,
              {
                persisted: path !== undefined,
                endShown: outputTail !== undefined,
              },
              {
                line: repeatReason,
                flagOn: meter,
                kept: readOnlyCheck !== undefined,
              },
            ),
            reads_own_output: classifySavedOutputPath(input.command, shellCallContext.session),
          });
          let codeIndexingFromCommand = detectCodeIndexingFromCommand(input.command);
          if (codeIndexingFromCommand)
            logEvent("tengu_code_indexing_tool_used", {
              tool: fromEnum(codeIndexingFromCommand),
              source: lit_2("cli"),
              success: execResult.code === 0,
            });
          let stdout_2 = trimBlankEdgeLines(stdout);
          stdout_2 = consumeClaudeCodeHints(stdout_2, {
            command: input.command,
            pendingHint: shellCallContext.session.pendingHint,
            isMainThread,
            surface: "shell",
          });
          let isImageOutput = execResult.timedOutAfterMs === undefined && isBase64DataUri(stdout_2);
          let outputText = stdout_2;
          if (isImageOutput) {
            let resizedImage = await resizeShellImageOutput(
              stdout_2,
              execResult.outputFilePath,
              size,
              imageLimitsForModel(shellCallContext.mainLoopModel()),
            );
            if (resizedImage) outputText = resizedImage;
            else isImageOutput = false;
          }
          let backgroundTaskId = execResult.backgroundTaskId
            ? undefined
            : GITHUB_RATE_LIMIT_REMINDER(
                input.command,
                output,
                shellCallContext.toolState.get(PrLinkBackoffState),
              );
          let backgroundCwdHint =
            execResult.backgroundTaskId && commandHasAnyCd(input.command)
              ? formatBackgroundCwdHint(getCwd())
              : undefined;
          let backgroundEndsWithFinalResponse =
            execResult.backgroundTaskId !== undefined &&
            (reapsShellsOnExit(shellCallContext.agentContext) ||
              (shellCallContext.agentId === undefined && isPrintWithoutTidySloth()))
              ? true
              : undefined;
          let gitOperation;
          if (!execResult.backgroundTaskId) {
            let gitOperation_2 = detectGitOperation(input.command, output);
            if (Object.keys(gitOperation_2).length > 0) gitOperation = gitOperation_2;
            if (!shellCallContext.remoteCall)
              emitVcsStateChanges(gitOperation_2, output, {
                command: input.command,
                exitCode: execResult.code,
                cwd,
              });
          }
          let staleReadFileStateHint;
          if (!interrupted && !isImageOutput && !execResult.backgroundTaskId) {
            let staleReadFileStateEntries = await findStaleReadFileStateEntries(
              input.command,
              shellCallContext.readFileState,
              commandStartMs,
            );
            if (staleReadFileStateEntries.length > 0) {
              let cwd = getCwd();
              let maxListedFiles = 5;
              let joined = staleReadFileStateEntries
                .slice(0, 5)
                .map(
                  (staleReadFileStateEntry) =>
                    relative(cwd, staleReadFileStateEntry) || staleReadFileStateEntry,
                )
                .join(", ");
              let moreSuffix =
                staleReadFileStateEntries.length > 5
                  ? ` and ${staleReadFileStateEntries.length - 5} more`
                  : "";
              let readToolName = canonicalToolName_2(READ, shellCallContext.tools);
              staleReadFileStateHint = `[This command modified ${staleReadFileStateEntries.length} ${plural(staleReadFileStateEntries.length, "file")} you've previously read: ${joined}${moreSuffix}. Call ${readToolName} before editing.]`;
            }
          }
          let diffResult = execResult.backgroundTaskId
            ? undefined
            : commandMovesTree
              ? {
                  files: [],
                  moreFiles: 0,
                  skipped: true,
                }
              : watchedEditDiff
                ? (watchedEditDiff.diff ?? undefined)
                : before === "unavailable"
                  ? {
                      files: [],
                      moreFiles: 0,
                      unavailable: true,
                    }
                  : before && interrupted
                    ? undefined
                    : before
                      ? (postCommandDiff ??
                        (stayedConcurrent
                          ? {
                              files: [],
                              moreFiles: 0,
                              shared: true,
                            }
                          : undefined))
                      : undefined;
          let bashEditDiff =
            diffResult && stayedConcurrent && !diffResult.skipped
              ? {
                  ...diffResult,
                  shared: true,
                }
              : diffResult;
          repeatMeter.sawEditDiff(
            bashEditDiff,
            !execResult.backgroundTaskId && (watchedEditDiff !== null || postCommandDiff !== undefined),
          );
          if (bashEditDiff?.unavailable)
            logFeatureSad(
              isSharedSnapshot ? "bash_edit_diff_shared" : "bash_edit_diff",
              interrupted ? "interrupted" : "unavailable",
            );
          else if (bashEditDiff && !bashEditDiff.skipped)
            logFeatureOk(isSharedSnapshot ? "bash_edit_diff_shared" : "bash_edit_diff");
          if (!interrupted && !isImageOutput && !execResult.backgroundTaskId) {
            let reduced = [
              cwdResetMessage,
              sandboxViolationText,
              readOnlyCheck?.note,
              oomNoteResult?.note,
              successNote?.note,
              staleReadFileStateHint,
              backgroundTaskId,
            ].reduce((acc, part) => acc + (part ? part.length + NEWLINE.length : 0), 0);
            let persistenceExceeded =
              path !== undefined ||
              stdout.length > getMaxOutputLength() ||
              shellCallContext.innerCall === true ||
              outputText.length + reduced >
                getPersistenceThreshold(
                  BASH_TOOL_NAME,
                  getConfiguredBashOutputMaxChars(),
                  MAX_CONTEXT_TOKENS,
                );
            await recordShellFileReadsInReadState(
              input.command,
              shellCallContext.readFileState,
              abortController.signal,
              execResult.code,
              persistenceExceeded ? undefined : outputText,
              shellCallContext.remoteCall === undefined && shellCallContext.nestedMemoryAttachmentTriggers
                ? {
                    triggers: shellCallContext.nestedMemoryAttachmentTriggers,
                    permissions: shellCallContext.permissions,
                  }
                : undefined,
            );
          }
          let hasOutputEnd = outputTail !== undefined && !isImageOutput && outputText !== "";
          let resultData = {
            stdout: hasOutputEnd ? interleaveOutputCutMarker(outputText, outputTail) : outputText,
            stderr: sandboxViolationText
              ? [cwdResetMessage, sandboxViolationText].filter(Boolean).join(NEWLINE)
              : cwdResetMessage,
            interrupted,
            isImage: isImageOutput,
            returnCodeInterpretation: commandInterpretation?.message,
            noOutputExpected: isSilentBashCommand(input.command),
            backgroundTaskId: execResult.backgroundTaskId,
            ...(execResult.backgroundTaskId !== undefined &&
              shellCallContext.keptBackgroundShells !== undefined && {
                backgroundOutputPath: getTaskOutputPath(execResult.backgroundTaskId),
              }),
            backgroundedByUser: execResult.backgroundedByUser,
            backgroundedByTurnAbort: execResult.backgroundedByTurnAbort,
            backgroundedToDeliverMessage: execResult.backgroundedToDeliverMessage,
            timedOutAfterMs: execResult.timedOutAfterMs,
            subagentCapApplied: execResult.subagentCapApplied,
            backgroundEndsWithFinalResponse,
            backgroundCwdHint,
            dangerouslyDisableSandbox:
              "dangerouslyDisableSandbox" in input ? input.dangerouslyDisableSandbox : undefined,
            persistedOutputPath: path,
            persistedOutputSize: size,
            ...(hasOutputEnd && {
              stdoutHoldsOutputEnd: hasOutputEnd,
            }),
            tailInputPath: readOnlyCheck?.path,
            tailInputNote: readOnlyCheck?.note,
            memoryLimitNote: oomNoteResult?.note,
            triggeredNote: successNote?.note,
            staleReadFileStateHint,
            ghRateLimitHint: backgroundTaskId,
            gitOperation,
            bashEditDiff,
          };
          if (resultData.backgroundTaskId !== undefined && isInputHoldOn())
            logEvent("tengu_bash_task_ack", {
              trigger: resultData.backgroundedByUser
                ? lit_2("user")
                : resultData.backgroundedByTurnAbort
                  ? lit_2("turn_abort")
                  : resultData.backgroundedToDeliverMessage
                    ? lit_2("deliver_message")
                    : resultData.timedOutAfterMs !== undefined
                      ? lit_2("timeout")
                      : lit_2("explicit"),
              ends_with_final_response: resultData.backgroundEndsWithFinalResponse === true,
              shell: lit_2("bash"),
            });
          return {
            data: resultData,
            ...(sandboxViolations !== undefined && {
              sandboxViolations,
            }),
            sandboxed,
            ...(hadSandboxViolation &&
              !interrupted && {
                remedy: {
                  kind: "sandbox_violation",
                },
              }),
          };
        },
      };
    },
  });
});
//@ chunk-5xgkngpb.js:4989450-4995607 fingerprint (2.1.88 match: runShellCommand, 0.44)
/**
 * 执行一条 Bash 命令的异步生成器：计算超时（前台/后台上限、子代理上限、远程约束），处理显式 run_in_background、超时自动转后台、用户 Ctrl+B / 回合中断转后台；2 秒后开始产出进度并登记为前台任务；返回执行结果或后台任务 id。
 */
async function* runShellCommand({
  input,
  useSandbox,
  networkLists,
  constraints,
  backgroundHeld,
  onHeldEnd,
  servedBackground,
  keptStarter,
  onNote,
  abortController,
  taskRegistry,
  emitToolProgress,
  session,
  preventCwdChanges,
  isMainThread,
  subagentCapMs,
  toolUseId,
  attributionMessageId,
  callTiming,
  agentId,
  caller,
  shellWallCapMs,
  promptShellPluginId,
  agentWorktree,
  isolationRoot,
  sessionEnvVars,
  effortLevel,
  storageV5,
  tailInput,
  toolState,
  endNote,
  startTelemetry,
}) {
  let { command, description, timeout, run_in_background } = input;
  let backgroundForbidden =
    isBackgroundTasksOff() || constraints?.background === "forbidden" || backgroundHeld?.() === true;
  let runInBackground =
    run_in_background === true &&
    (servedBackground === undefined
      ? !backgroundForbidden
      : !isBackgroundTasksDisabled() && backgroundHeld?.() !== true);
  let keptShellStarter =
    run_in_background !== true && !isBackgroundTasksDisabled() && backgroundHeld?.() !== true
      ? keptStarter
      : undefined;
  let reserveError = runInBackground ? servedBackground?.reserve() : undefined;
  if (reserveError !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reserveError,
      "served call has no background slot",
    );
  let maxTimeoutMs =
    shellWallCapMs !== undefined
      ? Math.min(timeout || getMaxBashTimeout(), shellWallCapMs, constraints?.maxTimeoutMs ?? 1 / 0)
      : Math.min(
          timeout || getDefaultBashTimeout(),
          runInBackground ? getBackgroundTimeoutCapMs() : getMaxBashTimeout(),
          constraints?.maxTimeoutMs ?? 1 / 0,
        );
  if (timeout && maxTimeoutMs < timeout)
    onNote?.({
      key: "timeout_clamped",
      requestedMs: timeout,
      appliedMs: maxTimeoutMs,
    });
  let sandboxed = caller !== "inner" && isPlainToolUseId(toolUseId);
  if (sandboxed) onCommand(command);
  let releaseViolationClaim = claimViolationReport(BASH_TOOL_NAME, command, toolState, {
    useSandbox,
  });
  let fullOutput = "";
  let lastProgressOutput = "";
  let lastTotalLines = 0;
  let lastTotalBytes = 0;
  let backgroundTaskId = undefined;
  let timedOutAfterMs = undefined;
  let moveReason = undefined;
  let resolveProgress = null;
  function createProgressSignal() {
    return new Promise((resolve) => {
      resolveProgress = () => resolve(null);
    });
  }
  let shellCommand;
  let shouldAutoBackground;
  let turnAbortBackgrounds;
  let effectiveTimeoutMs;
  try {
    shouldAutoBackground =
      (!backgroundForbidden || keptShellStarter !== undefined) && isAutobackgroundingAllowed(command);
    turnAbortBackgrounds = !backgroundForbidden;
    effectiveTimeoutMs = effectiveShellTimeoutMs({
      requestedTimeoutMs: maxTimeoutMs,
      isMainAgent: isMainThread === true,
      canAutoBackground: shouldAutoBackground && keptShellStarter === undefined,
      subagentCapMs: runInBackground ? 0 : subagentCapMs,
    });
    shellCommand = await exec(command, abortController.signal, "bash", {
      timeout: effectiveTimeoutMs,
      owningAgentId: agentId,
      caller,
      turnAbortBackgrounds,
      onProgress(lastLines, allLines, totalLines, totalBytes, isIncomplete) {
        lastProgressOutput = lastLines;
        fullOutput = allLines;
        lastTotalLines = totalLines;
        lastTotalBytes = isIncomplete ? totalBytes : 0;
        let resolve = resolveProgress;
        if (resolve) {
          resolveProgress = null;
          resolve();
        }
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
      shouldUseSandbox: useSandbox,
      sandboxAttributionId: toolUseId,
      sandboxNetworkLists: networkLists,
      attributionMessageId,
      callTiming,
      shouldAutoBackground,
      agentWorktree,
      isolationRoot,
      sessionEnvVars,
      effortLevel,
      storageV5,
      tailInput,
      ...(isNpmPluginSourcePath(promptShellPluginId) && {
        bunOptionsFor: (pluginPath) => bunOptionsGuard(promptShellPluginId, pluginPath),
      }),
    });
  } catch (error) {
    releaseViolationClaim?.();
    throw error;
  }
  let subagentCapApplied = isMainThread !== true && effectiveTimeoutMs < maxTimeoutMs ? true : undefined;
  if (shellCommand.status === "killed") releaseViolationClaim?.();
  let resultPromise = shellCommand.result;
  if (sandboxed)
    onSpawn({
      pid: shellCommand.pid,
      command,
      cwd: getCwd(),
      agentId,
      ended: resultPromise,
    });
  if (toolUseId !== undefined)
    resultPromise
      .then((result) => {
        if (result.leftRunningPgid !== undefined)
          leftoverProcessTracker.noteCommandLeftProcesses(result.leftRunningPgid, toolUseId);
      })
      .catch(() => {});
  if (releaseViolationClaim)
    resultPromise
      .then((result) => {
        if (result.preSpawnError) releaseViolationClaim();
      })
      .catch(() => {});
  async function startBackgrounding(eventName, backgroundFn) {
    return (
      await backgroundShellCommand(
        {
          command,
          shell: "bash",
          description: description || command,
          shellCommand,
          toolUseId,
          agentId,
          timeout: backgroundFn,
          endNote,
          startTelemetry,
          backgroundTrigger: eventName,
        },
        {
          abortController,
          taskRegistry,
        },
      )
    ).taskId;
  }
  function moveToBackground(part, reason, note, extra, backgroundFn) {
    if (backgroundHeld?.() === true) {
      onHeldEnd?.();
      shellCommand.kill();
      return;
    }
    if (keptShellStarter !== undefined) {
      if (shellCommand.status !== "running") return;
      try {
        backgroundTaskId = keptShellStarter.adopt(shellCommand, undefined, command, backgroundFn);
        moveReason = backgroundFn;
      } catch (error) {
        logError(toError(error));
        shellCommand.kill();
        return;
      }
      resolveAbortWait?.();
      let resolveProgressFn = resolveProgress;
      if (resolveProgressFn) {
        resolveProgress = null;
        resolveProgressFn();
      }
      logEvent(part, {
        command_type: getCommandTypeForLogging(command),
        ...extra,
      });
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
          undefined,
          reason,
        )
      )
        return;
      backgroundTaskId = foregroundTaskId;
      logEvent(part, {
        command_type: getCommandTypeForLogging(command),
        ...extra,
      });
      note?.(foregroundTaskId);
      return;
    }
    startBackgrounding(reason).then((shellId) => {
      backgroundTaskId = shellId;
      let resolve = resolveProgress;
      if (resolve) {
        resolveProgress = null;
        resolve();
      }
      logEvent(part, {
        command_type: getCommandTypeForLogging(command),
        ...extra,
      });
      if (note) note(shellId);
    });
  }
  let listMoveResult = keptShellStarter?.listMove?.((backgroundFn) => {
    if (backgroundHeld?.() === true) return false;
    moveToBackground(
      "tengu_bash_command_moved_on_request",
      backgroundFn === "person" ? "user" : "deliver_message",
      undefined,
      undefined,
      backgroundFn,
    );
    return backgroundTaskId !== undefined;
  });
  if (listMoveResult !== undefined) shellCommand.result.then(listMoveResult, listMoveResult);
  if (shellCommand.onTimeout && shouldAutoBackground)
    shellCommand.onTimeout((backgroundFn) => {
      timedOutAfterMs = effectiveTimeoutMs;
      moveToBackground("tengu_bash_command_timeout_backgrounded", "timeout", backgroundFn, {
        timeout_ms: effectiveTimeoutMs,
        requested_timeout_ms: timeoutWhenPositive(timeout, maxTimeoutMs) ?? 0,
        subagent_cap_applied: subagentCapApplied === true,
      });
    });
  if (runInBackground && shellCommand.status !== "killed") {
    if (shellCommand.status === "completed") {
      let completedResult = await resultPromise;
      if (completedResult.preSpawnError) return completedResult;
      if (servedBackground !== undefined) {
        shellCommand.cleanup();
        return completedResult;
      }
    }
    let backgroundFn = timeoutWhenPositive(timeout, maxTimeoutMs);
    let backgroundTaskId =
      servedBackground === undefined
        ? await startBackgrounding("explicit", backgroundFn)
        : servedBackground.adopt(shellCommand, backgroundFn, command);
    logEvent("tengu_bash_command_explicitly_backgrounded", {
      command_type: getCommandTypeForLogging(command),
      timeout_ms: backgroundFn ?? 0,
    });
    return {
      stdout: "",
      stderr: "",
      code: 0,
      interrupted: false,
      backgroundTaskId,
    };
  }
  let startTime = Date.now();
  let foregroundTaskId = undefined;
  let turnAborted = false;
  let resolveAbortWait = null;
  let isTurnAbortPending = () =>
    abortController.signal.aborted && isTurnLevelAbort(abortController.signal.reason, caller);
  let onTurnAbort = () => {
    if (!isTurnAbortPending()) return;
    resolveAbortWait?.();
    let resolvePending = resolveProgress;
    if (resolvePending) {
      resolveProgress = null;
      resolvePending();
    }
  };
  using abortDisposable = onAbortDisposable(abortController.signal, onTurnAbort);
  {
    let initialResult = await Promise.race([
      resultPromise,
      new Promise((resolve) => {
        setTimeout((settle) => settle(null), PROGRESS_THRESHOLD_MS, resolve).unref();
      }),
      new Promise((resolve) => {
        if (isTurnAbortPending()) resolve(null);
        else resolveAbortWait = () => resolve(null);
      }),
    ]);
    if (initialResult !== null) {
      shellCommand.cleanup();
      return stripShellUsageUnlessBackgrounded(initialResult);
    }
    if (backgroundTaskId)
      return {
        stdout: "",
        stderr: "",
        code: 0,
        interrupted: false,
        backgroundTaskId,
        ...backgroundReasonToFlags(moveReason),
        timedOutAfterMs,
        subagentCapApplied,
      };
  }
  TaskOutput.startPolling(shellCommand.taskOutput.taskId);
  let finalResult = null;
  try {
    while (true) {
      let progressSignal;
      if (!turnAborted && isTurnAbortPending()) progressSignal = Promise.resolve(null);
      else progressSignal = createProgressSignal();
      let result = await Promise.race([resultPromise, progressSignal]);
      if (result !== null) {
        finalResult = result;
        if (result.backgroundTaskId !== undefined) {
          if (markTaskNotified(result.backgroundTaskId, result, taskRegistry))
            emitTaskNotification(
              result.backgroundTaskId,
              shellStatusForDisplay(result, {
                command,
                shell: "bash",
              }),
              {
                toolUseId,
                summary: description || command,
              },
            );
          let fixedResult = {
            ...stripShellUsageUnlessBackgrounded(result),
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
      if (backgroundTaskId)
        return {
          stdout: turnAborted ? fullOutput : "",
          stderr: "",
          code: 0,
          interrupted: false,
          backgroundTaskId,
          ...(turnAborted && {
            backgroundedByTurnAbort: true,
          }),
          ...backgroundReasonToFlags(moveReason),
          timedOutAfterMs,
          subagentCapApplied,
        };
      if (!turnAborted && isTurnAbortPending()) {
        turnAborted = true;
        if (turnAbortBackgrounds) {
          moveToBackground("tengu_bash_command_turn_abort_backgrounded", "turn_abort");
          if (backgroundTaskId)
            return {
              stdout: fullOutput,
              stderr: "",
              code: 0,
              interrupted: false,
              backgroundTaskId,
              backgroundedByTurnAbort: true,
              timedOutAfterMs,
              subagentCapApplied,
            };
          continue;
        }
        if (shellCommand.status === "running") shellCommand.kill();
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
        !turnAborted &&
        backgroundTaskId === undefined &&
        elapsedSeconds >= PROGRESS_THRESHOLD_MS / 1000
      ) {
        if (!foregroundTaskId)
          foregroundTaskId = registerForeground(
            {
              command,
              shell: "bash",
              description: description || command,
              shellCommand,
              agentId,
              caller,
              autoBackgroundArmed: shouldAutoBackground,
              timeout: timeoutWhenPositive(timeout, maxTimeoutMs),
              endNote,
              startTelemetry,
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
              timeoutMs: effectiveTimeoutMs,
            }
          : undefined),
      };
    }
  } finally {
    TaskOutput.stopPolling(shellCommand.taskOutput.taskId);
    if (!backgroundTaskId && shellCommand.status !== "backgrounded") {
      if (foregroundTaskId)
        unregisterForeground(
          foregroundTaskId,
          finalResult
            ? shellStatusForDisplay(finalResult, {
                command,
                shell: "bash",
              })
            : "stopped",
          taskRegistry,
        );
      shellCommand.cleanup();
    }
  }
}
//@ chunk-5xgkngpb.js:4995607-4995938 sole-consumer
/**
 * 根据文件监视记录生成本次命令的编辑 diff（bashEditDiff）；后台化或中断时标记 unavailable 并停止监视。
 */
async function collectWatchedEditDiff(cwd, toolUseId, isBackground, interrupted, snapshotTakenAt, nowMs) {
  let unavailableDiff = {
    diff: {
      files: [],
      moreFiles: 0,
      unavailable: true,
    },
  };
  if (isBackground) {
    forgetObservedRepo(toolUseId);
    forgetRecorder(cwd);
    return unavailableDiff;
  }
  let observation = await endCommandObservation(toolUseId);
  if (observation === null) {
    forgetRecorder(cwd);
    return unavailableDiff;
  }
  if (interrupted) {
    if (observation.paths.length === 0 && !observation.overflow && !observation.watchEnds)
      return {
        diff: null,
      };
    forgetRecorder(cwd);
    return unavailableDiff;
  }
  let diff = await recordEditedFilesSerially(
    cwd,
    observation.paths,
    observation.overflow,
    snapshotTakenAt,
    nowMs,
    observation.shared,
  );
  if (observation.watchEnds) forgetRecorder(cwd);
  return {
    diff,
  };
}
export {
  BashTool,
  READ_BLOCK_EXEMPT_COMMANDS,
  COMMON_BACKGROUND_COMMANDS,
  isPlainToolUseId,
  SED_PRINT_RANGE_RE,
  SED_PRINT_LINE_RE,
  DEFAULT_HEAD_LINES,
  DEFAULT_TAIL_LINES,
  DISK_PROBE_TIMEOUT_MS,
  READ_ONLY_FAMILY_MS,
  hasCcrFamily,
  shouldBuildLargeOutputMessage,
  persistBashOutput,
  omitUnsandboxedFields,
  listPromptSkillCommands,
  REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED,
  extractReadOnlyFileReads,
};
