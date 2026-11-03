/**
 * tools/BashTool/BashTool.tsx
 *
 * Bash 工具定义与执行：输入/输出 schema、validateInput（长 sleep 拦截、沙箱策略、重复后台命令）、call（沙箱、runShellCommand 进度与后台化、输出持久化、git 操作识别、编辑 diff、已读文件过期提示、遥测）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/BashTool.tsx
 * pieces: chunk-e6aww6q8.js (56)
 * attribution: placement 28, fingerprint 9, sole-consumer 3, affinity 3, file-local 3, layout 9, facade-exports 1
 */
import { dirname, basename, relative } from "path";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
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
import { toolMatchesName, findToolByName } from "../../Tool.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { getSessionSkillCommands } from "../../services/mcp/mcpAccountKey.js";
import { getProjectRootOrNull, isDiskless, getOriginalCwd } from "../../bootstrap/state.js";
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
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
  peekSessionPinnedFeatureValue,
} from "../../services/analytics/growthbook.js";
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
import {
  isENOENT,
  isSadResourceErrno,
  isEnvFsErrno,
  errorMessage,
  AbortError as AbortError_2,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  ShellError,
  toError,
} from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { stripClaudeCodeHints, consumeClaudeCodeHints } from "../../utils/claudeCodeHints.js";
import { hasNewOomKills, currentOomKillCount } from "../../utils/toolCgroup.js";
import { MAX_OOM_NOTES, OOM_KILL_NOTE, buildSandboxFailureHint } from "./sandboxFailureHints.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  array,
  zodStrictObject,
  _enum,
  E,
  M,
  string,
  u,
  literal,
  qne,
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
  bashToolHasPermissionTwoPass,
} from "./bashPermissions.js";
import { checkReadOnlyConstraints } from "./readOnlyValidation.js";
import { reportOnce } from "../../utils/reportOnce.js";
import { getFileModificationTimeAsync } from "../../utils/file.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { MAX_CONTEXT_TOKENS, MAX_DESCRIPTION_CHARS } from "../../constants/outputLimits.js";
import { isRemoteOnlyCheck } from "../../utils/permissions/checkRegistry.js";
import { isRemoteToolForwardingSwitchOn } from "../../services/remoteTools/servingGates.js";
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
import { FILE_READ_TOOL_NAME } from "../FileReadTool/constants.js";
import {
  isInputHoldOn,
  shouldHoldForPlugin,
  ENDED_INSTEAD_OF_BACKGROUND_MESSAGE,
} from "../../plugins/functionHooks/inputHold.js";
import { getCwd } from "../../utils/cwd.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { guardSyncedMemoryRemoval } from "./syncedMemoryRemoval.js";
import { memoryWatchers } from "../../services/memorySync/memoryWatcher.js";
import { BashRepeatMeter } from "./repeatMeter.js";
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
import { classifyTestOutcome, buildCommandTimingFields } from "./bashTelemetry.js";
import { unwrapAbortReason, isUserInitiatedAbortReason } from "../../utils/abortController.js";
import { DEFAULT_SEMANTIC_2 } from "./commandSemantics.js";
import { logEvent } from "../../services/analytics/index.js";
import { getSessionProject } from "../../bootstrap/sessionSlices.js";
import { getParsedSandboxViolations, claimViolationReport } from "./sandboxViolations.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { getExecutorShellForAnalytics, exec } from "../../utils/Shell.js";
import { detectShellDialectIssues } from "./sameEitherWayCommands.js";
import { classifySavedOutputPath } from "../FileReadTool/savedOutputPaths.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
import { detectCodeIndexingFromCommand } from "../../utils/codeIndexing.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { reapsShellsOnExit } from "../../utils/agentContext.js";
import { canonicalToolName as canonicalToolName_2 } from "../../services/tools/batchTools.js";
import { isBackgroundTasksDisabled } from "../AgentTool/AgentTool.js";
import { effectiveShellTimeoutMs, timeoutWhenPositive } from "../../utils/timeouts.js";
import { isNpmPluginSourcePath, bunOptionsGuard } from "../../utils/permissions/protectedSettingsPaths.js";
import { leftoverProcessTracker } from "../../utils/shell/cpuReport.js";
import { stripShellUsageUnlessBackgrounded } from "../../utils/ShellCommand.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-e6aww6q8.js:190349-190446 placement
/**
 * 需要非沙箱执行的 Bash 输入字段（dangerouslyDisableSandbox）；omitUnsandboxedFields 用它从输入 schema 里删字段。
 */
var UNSANDBOXED_INPUT_FIELDS = ["dangerouslyDisableSandbox", ...[]];
var REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED = [
  ...UNSANDBOXED_INPUT_FIELDS,
  "run_in_background",
  "_simulatedSedEdit",
];
//@ chunk-e6aww6q8.js:190446-190600 placement
/**
 * 宿主策略禁止非沙箱命令时，从 Bash 输入 schema 中去掉相关字段。
 */
function omitUnsandboxedFields(e, n) {
  if (!getHostAgentPolicy().unsandboxedCommandsDisabled) return e;
  let r = Object.fromEntries(n.filter((s) => s in e.shape).map((s) => [s, true]));
  return e.omit(r);
}
//@ chunk-e6aww6q8.js:1178453-1178560 fingerprint = BASH_SEMANTIC_NEUTRAL_COMMANDS (0.59)
/**
 * 不读写文件的命令集合（echo/printf/test/[/which/type/basename/dirname/df 等）；沙箱"读封锁"检查（chunk-e6aww6q8.js#kDo）遇到这些命令直接放过。
 */
var READ_BLOCK_EXEMPT_COMMANDS = new Set([
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
//@ chunk-e6aww6q8.js:3105251-3105639 fingerprint = COMMON_BACKGROUND_COMMANDS (0.602)
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
//@ chunk-e6aww6q8.js:4762311-4762825 placement
/**
 * 把 Bash 输入中的别名字段规范化：timeout_ms → timeout，command_description → description（已有 description 时丢弃），返回改写结果与形状标签。
 */
function normalizeBashInputAliases(e) {
  if (!isPlainObject_5(e)) return null;
  let n = {
    ...e,
  };
  let r = [];
  if ("timeout_ms" in n && !("timeout" in n)) {
    let timeoutMs = n.timeout_ms;
    if (typeof timeoutMs === "number" || (typeof timeoutMs === "string" && /^\d+$/.test(timeoutMs))) {
      n.timeout = timeoutMs;
      delete n.timeout_ms;
      r.push("timeout_ms");
    }
  }
  if ("command_description" in n) {
    if (!("description" in n) && typeof n.command_description === "string") {
      n.description = n.command_description;
      r.push("command_description");
    } else r.push("command_description_dropped");
    delete n.command_description;
  }
  return r.length
    ? {
        input: n,
        shapeClass: r.join(","),
      }
    : null;
}
//@ chunk-e6aww6q8.js:4762825-4762912 placement
/**
 * head 的默认行数 10、tail 的默认行数 10、sed -n 'a,bp' 与 'Np' 的地址正则、以及复合命令里视为无副作用的 echo/printf/true/: 判定；extractReadOnlyFileReads 用它们识别只读文件查看命令。
 */
var DEFAULT_HEAD_LINES = 10;
var DEFAULT_TAIL_LINES = 10;
var SED_PRINT_RANGE_RE = /^(\d+),(\d+)p$/;
var SED_PRINT_LINE_RE = /^(\d+)p$/;
var BENIGN_SHELL_COMMAND_RE = /^\s*(echo|printf|true|:)\b/;
//@ chunk-e6aww6q8.js:4762912-4763170 placement
/**
 * 从不含管道与重定向的命令中提取只读的文件读取（cat/head/tail 等）。
 */
function extractReadOnlyFileReads(command) {
  if (/[|<>]/.test(command)) return [];
  let n;
  try {
    n = splitCommand(command);
  } catch {
    return [];
  }
  if (n.length === 0) return [];
  let r = [];
  for (let s of n) {
    let h =
      parseSedReadArgs(s) ??
      parseCatRead(s) ??
      parseHeadRead(s) ??
      parseTailRead(s) ??
      (n.length === 1 ? parseGrepReadArgs(s) : null);
    if (h) r.push(h);
    else if (n.length > 1 && !BENIGN_SHELL_COMMAND_RE.test(s)) return [];
  }
  return r;
}
//@ chunk-e6aww6q8.js:4766686-4767150 sole-consumer
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
    let w = lines.length - min + 1;
    return {
      content: lines.slice(w - 1).join(`
`),
      offset: w,
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
//@ chunk-e6aww6q8.js:4767150-4767252 sole-consumer
function stripLineNumberPrefix(e) {
  let match = /^[ \t]*\d+[ \t]/.exec(e);
  return match ? e.slice(match[0].length) : /^[ \t]*$/.test(e) ? "" : e;
}
//@ chunk-e6aww6q8.js:4767252-4767414 affinity
/**
 * 判断命令的模型可见输出是否真的包含这段文件内容（统一 CRLF；numbered 时逐行去掉行号前缀再比）。用来避免把没展示给模型的内容记成"已读"。
 */
function outputContainsFileView(commandOutput, viewContent, isNumbered) {
  let s = viewContent.replace(/^(\s*\n)+/, "").trimEnd();
  let replaced = commandOutput.replaceAll(
    `\r
`,
    `
`,
  );
  return (
    replaced.includes(s) ||
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
        .includes(s))
  );
}
//@ chunk-e6aww6q8.js:4767414-4768090 fingerprint = applySedEdit (0.531)
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
  let filtered = extractReadOnlyFileReads(command).filter((L) => !L.requiresExitZero || exitCode === 0);
  if (filtered.length === 0) return;
  let fs = getFsImplementation();
  await Promise.all(
    filtered.map(async (L) => {
      let encoding = expandPath(L.filePath);
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
        let ke = sliceFileViewContent(endings, L);
        if (ke === null || (!ke.content.trim() && endings.trim())) return;
        if (
          modelVisibleOutput !== undefined &&
          !L.contentNotInModelContext &&
          !outputContainsFileView(modelVisibleOutput, ke.content, L.numbered)
        )
          return;
        readFileState.set(encoding, {
          content: ke.content,
          timestamp: Math.floor(stats.mtimeMs),
          offset: ke.offset,
          limit: ke.limit,
          ...((L.contentNotInModelContext || modelVisibleOutput === undefined) && {
            contentNotInModelContext: true,
          }),
        });
        noteFileReadForMemoryTriggers(memoryTriggerContext, encoding);
      } catch {}
    }),
  );
}
//@ chunk-e6aww6q8.js:4768090-4768154 placement
/**
 * Bash 命令看过某个文件后，若无读拒绝规则就通知内存触发上下文登记该路径，供后续记忆写入使用。
 */
function noteFileReadForMemoryTriggers(memoryTriggerContext, encoding) {
  if (memoryTriggerContext && !hasReadDenyRuleForPath(encoding, memoryTriggerContext.permissions()))
    pushUnique(memoryTriggerContext.triggers, encoding);
}
//@ chunk-e6aww6q8.js:4768154-4768167 placement
/**
 * 探测大量删除占用（massDeleteHoldExposure）的超时时间，2000 毫秒，超时按无占用处理。
 */
var DISK_PROBE_TIMEOUT_MS = 2000;
//@ chunk-e6aww6q8.js:4768903-4768977 placement
/**
 * 构造 Bash 工具 prompt 时，若可用工具里有 Skill，则列出本项目目录下已按允许清单过滤的技能命令。
 */
async function listPromptSkillCommands(tools) {
  if (!tools.some((n) => toolMatchesName(n, SKILL))) return [];
  return getSessionSkillCommands(getProjectRootOrNull());
}
//@ chunk-e6aww6q8.js:4768977-4769315 placement
/**
 * 查找同一代理、同一目录下正在后台运行的相同 Bash 命令任务，用于避免重复启动。
 */
function findDuplicateBackgroundCommand(e, taskRegistry) {
  if (!isPlainToolUseId(e.toolUseId)) return;
  let trimmed = e.command.trim();
  return Object.values(taskRegistry.all())
    .filter(isLocalShellTask)
    .find(
      (s) =>
        s.isBackgrounded &&
        s.status === "running" &&
        s.shellCommand?.status === "backgrounded" &&
        (s.caller === "turn" || s.caller === "agent") &&
        isPlainToolUseId(s.toolUseId) &&
        s.shell === "bash" &&
        s.agentId === e.agentId &&
        s.cwd === e.cwd &&
        s.command.trim() === trimmed,
    );
}
//@ chunk-e6aww6q8.js:4769315-4769394 placement
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
//@ chunk-e6aww6q8.js:4769443-4769491 placement
/**
 * 会话内固定的 tengu_quiet_pike 开关，决定持久化输出后是否再补读文件尾部内容到结果里。
 */
function shouldShowOutputTail() {
  return getFeatureValue_SESSION_PINNED("tengu_quiet_pike", false);
}
//@ chunk-e6aww6q8.js:4769491-4769540 placement
/**
 * 会话内固定的 tengu_hushed_wren 开关，决定输出过大时是否生成“完整输出已保存到文件”的提示。
 */
function shouldBuildLargeOutputMessage() {
  return getFeatureValue_SESSION_PINNED("tengu_hushed_wren", false);
}
//@ chunk-e6aww6q8.js:4769540-4769630 placement
/**
 * 截断输出时保留的尾部字符数（1500）与截断提示文本；三者一个声明组，HVn 与 readOutputTail 都用它拼装被截断的输出。
 */
var OUTPUT_CUT_TAIL_CHARS = 1500;
var OUTPUT_CUT_MARKER = `
[\u2026 output cut here; the full output was saved to a file \u2026]
`;
//@ chunk-e6aww6q8.js:4769630-4769720 placement
/**
 * 把输出截到最大长度，插入 OUTPUT_CUT_MARKER 和“完整输出已保存到文件”的说明，作为最终展示文本。
 */
function interleaveOutputCutMarker(e, n) {
  let r = getMaxOutputLength() - OUTPUT_CUT_MARKER.length - n.length;
  return `${truncateToLength(e, Math.max(0, r))}${OUTPUT_CUT_MARKER}${n}`;
}
//@ chunk-e6aww6q8.js:4769720-4769859 placement
function splitOutputAtMarker(e) {
  let index = e.lastIndexOf(OUTPUT_CUT_MARKER);
  return index === -1
    ? {
        start: e,
        end: undefined,
      }
    : {
        start: e.slice(0, index),
        end: takeLastChars(e.slice(index + OUTPUT_CUT_MARKER.length), OUTPUT_CUT_TAIL_CHARS) || undefined,
      };
}
//@ chunk-e6aww6q8.js:4769859-4769872 placement
/**
 * 从后台任务输出文件补读尾部时的字节上限（6000）。
 */
var OUTPUT_TAIL_MAX_BYTES = 6000;
//@ chunk-e6aww6q8.js:4769872-4770286 placement
/**
 * 把后台任务输出文件持久化到工具结果目录（v5 存储或本地快照，大小有上限），返回 {path, size}；失败时回调 copyFailed。
 */
async function persistBashOutput({ outputFilePath, outputTaskId }, r, s, h) {
  if (!outputFilePath || !outputTaskId) return;
  let y;
  try {
    let originalCwd = getOriginalCwd_2(r);
    y = await ensureToolResultsDir(originalCwd, s);
    let toolResultFilePath = getToolResultFilePath(originalCwd, outputTaskId, false);
    let L =
      isStorageV5Enabled() && s !== undefined
        ? toolResultsKey(dirname(toolResultFilePath), basename(toolResultFilePath))
        : undefined;
    if (isStorageV5Enabled() && s !== undefined && L !== undefined) {
      let q = await persistShellOutput(
        s,
        L,
        outputFilePath,
        MAX_PERSISTED_OUTPUT_BYTES,
        getTaskOutputRootDir(),
      );
      if (typeof q === "number")
        return {
          path: toolResultFilePath,
          size: q,
        };
      if (q === undefined) {
        h?.copyFailed(undefined, y);
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
    h?.copyFailed(error, y);
    return;
  }
}
//@ chunk-e6aww6q8.js:4770286-4770768 placement
/**
 * 输出很大时读取任务输出文件的尾部用于预览（跳过不完整的首行），读不到时记 warn 或错误。
 */
async function readOutputTail({ outputTaskId, outputFileSize = 0 }, r, s, h, y = false) {
  let min = Math.min(h, getMaxOutputLength() - s - (y ? OUTPUT_CUT_MARKER.length : 0));
  let w = y ? getMaxOutputLength() : (r.length - stripHintsAndLeadingBlankLines(r).length + s) * 3;
  if (!outputTaskId || min <= 0 || outputFileSize >= MAX_PERSISTED_OUTPUT_BYTES || outputFileSize <= w + min)
    return;
  try {
    let { content, omittedBytes } = await getVerifiedTaskOutputTail(outputTaskId, min + 1, outputFileSize);
    if (omittedBytes < w) return;
    let index = content.indexOf(`
`);
    let Z = index !== -1 && index < content.length / 2 ? content.slice(index + 1) : content;
    return stripHintsAndLeadingBlankLines(Z).trimEnd() || undefined;
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
//@ chunk-e6aww6q8.js:4770768-4771011 placement
async function buildLargeOutputMessage(execResult, stdout, session, storageV5) {
  let outputTail = await readOutputTail(execResult, stdout, PREVIEW_SIZE_CHARS, OUTPUT_TAIL_MAX_BYTES);
  let y = outputTail === undefined ? undefined : await persistBashOutput(execResult, session, storageV5);
  if (y === undefined) return;
  return buildLargeToolResultMessage({
    filepath: y.path,
    originalSize: y.size,
    isJson: false,
    ...generatePreview(stripHintsAndLeadingBlankLines(stdout), PREVIEW_SIZE_CHARS),
    previewEnd: outputTail,
    truncatedAtBytes: y.size >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : undefined,
  });
}
//@ chunk-e6aww6q8.js:4771011-4771065 placement
/**
 * 去掉 Claude Code 注入的提示行并裁掉开头的空行；比较输出是否重复、生成预览、计算省略字节数前都先过它。
 */
function stripHintsAndLeadingBlankLines(e) {
  return stripClaudeCodeHints(e).replace(/^(\s*\n)+/, "");
}
//@ chunk-e6aww6q8.js:4814999-4815017 placement
/**
 * 记录 OOM 提示在本会话已显示次数，挂在工具状态上（maybeShowBashNote 使用）。
 */
class OomKillNoteState {
  shown = 0;
}
//@ chunk-e6aww6q8.js:4815017-4815161 placement
function maybeShowBashNote(e, n) {
  let r = hasNewOomKills(e) === true;
  if (!r || n.shown >= MAX_OOM_NOTES || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_wiggly_gray", false))
    return {
      hit: r,
      note: undefined,
    };
  n.shown++;
  return {
    hit: r,
    note: OOM_KILL_NOTE,
  };
}
//@ chunk-e6aww6q8.js:4815161-4815549 placement
/**
 * Bash 触发提示规则的常量与 schema：规则数上限、输出筛选类命令、每条规则的触发类型、最短时长、提示文本与每会话上限。
 */
var MAX_NOTE_RULES = 8;
var FILTER_COMMANDS = new Set(["tail", "head", "grep", "egrep", "fgrep", "rg", "ag", "wc"]);
var bashNoteRulesSchema = DoctorLazy(() =>
  array(
    zodStrictObject({
      kinds: array(_enum(PROGRAM_CATEGORIES)).min(1).max(PROGRAM_CATEGORIES.length),
      allKinds: array(_enum(PROGRAM_CATEGORIES)).min(1).max(PROGRAM_CATEGORIES.length).optional(),
      minSeconds: E().min(0),
      filtered: M().optional(),
      failed: M().optional(),
      text: string()
        .max(400)
        .regex(/^[!-;=-Z\\^-~](?:[ -;=-Z\\^-~]*[!-;=-Z\\^-~])?$/),
      maxPerSession: E().int().min(1).max(5),
      show: M(),
    }),
  ).max(MAX_NOTE_RULES),
);
//@ chunk-e6aww6q8.js:4815549-4815579 placement
/**
 * 保存 Bash 结果提示规则列表与每条规则的已显示次数；matchBashNoteRule 按配置匹配并限次。
 */
class BashNoteSessionState {
  rules;
  shown = new Map();
}
//@ chunk-e6aww6q8.js:4815579-4816237 placement
/**
 * 按 tengu_temporal_kazoo 配置的规则给 Bash 结果附加提示：匹配耗时、失败状态、命令种类、是否经过滤管道，每条规则每会话有显示上限。
 */
function matchBashNoteRule(command, shellUsage, r, s) {
  let h = (s.rules ??= loadBashNoteRules());
  let mapped = h.map(
    (Ee) =>
      shellUsage !== undefined &&
      shellUsage.wallMs >= Ee.minSeconds * 1000 &&
      (Ee.failed === undefined || Ee.failed === r),
  );
  if (!mapped.includes(true)) return;
  let {
    bash_command_kinds: bashCommandKinds,
    bash_last_argv0: bashLastArgv0,
    has_pipe: hasPipe,
    has_redirect: hasRedirect,
  } = classifyBashCommand(command);
  let parts = bashCommandKinds.split(",");
  let Z = hasPipe && !hasRedirect && FILTER_COMMANDS.has(bashLastArgv0) && !/\btee\b/.test(command);
  let index = h.findIndex(
    (Ee, Ae) =>
      mapped[Ae] === true &&
      Ee.kinds.some((kind) => parts.includes(kind)) &&
      (Ee.allKinds === undefined || Ee.allKinds.every((kind) => parts.includes(kind))) &&
      (Ee.filtered === undefined || (Ee.filtered ? Z : !hasPipe)),
  );
  let ke = h[index];
  if (ke === undefined) return;
  let we = s.shown.get(index) ?? 0;
  if (!ke.show || we >= ke.maxPerSession)
    return {
      rule: index + 1,
      note: undefined,
    };
  s.shown.set(index, we + 1);
  return {
    rule: index + 1,
    note: `[${ke.text}]`,
  };
}
//@ chunk-e6aww6q8.js:4816237-4816646 placement
/**
 * 读取会话固定的 tengu_temporal_kazoo 开关作为 Bash 提示规则列表；格式不符或超过上限时记录并返回空列表。
 */
function loadBashNoteRules() {
  let featureValue_SESSION_PINNED = getFeatureValue_SESSION_PINNED("tengu_temporal_kazoo", null);
  if (featureValue_SESSION_PINNED === null) return [];
  let n =
    Array.isArray(featureValue_SESSION_PINNED) && featureValue_SESSION_PINNED.length > MAX_NOTE_RULES
      ? undefined
      : bashNoteRulesSchema().safeParse(featureValue_SESSION_PINNED);
  if (n?.success) {
    logFeatureOk("bash_triggered_notes");
    return n.data;
  }
  logFeatureSad("bash_triggered_notes", "invalid_value");
  logForDebugging(
    `Bash: tengu_temporal_kazoo is not a valid list of note rules, so this session adds no notes: ${n === undefined ? `more than ${MAX_NOTE_RULES} rules` : prettifyError(n.error)}`,
    {
      level: "error",
    },
  );
  return [];
}
//@ chunk-e6aww6q8.js:4816646-4816823 placement
/**
 * tengu_jiggly_harp 已知文本的 sha256 白名单；isPinnedPromptInSystemPrompt 用哈希+包含匹配判断这些文本是否出现在本次系统提示里并上报遥测。
 */
var TENGU_JIGGLY_HARP = "tengu_jiggly_harp";
var PINNED_PROMPT_TEXT_HASHES = new Set([
  "2ae3ca8d81740b53d923a0885aca50d83cf055d760d4673deab302aea4b65633",
  "6089b336d7aa1867d84a6ecc55f514623dbe706909b5491033a7504571f20409",
]);
//@ chunk-e6aww6q8.js:4816823-4817273 placement
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
    let r = shellCallContext.messages();
    let lastIndex = r.findLastIndex((S) => S.type === "system" && S.subtype === "compact_boundary");
    let systemPrompt = promptSnapshotUnlessRenderPoint(
      lastIndex === -1 ? r : r.slice(lastIndex),
      shellCallContext,
    )?.systemPrompt;
    if (systemPrompt === undefined) return;
    return [
      ...new Set([
        peekSessionPinnedFeatureValue(TENGU_JIGGLY_HARP),
        getGlobalConfig().cachedGrowthBookFeatures?.[TENGU_JIGGLY_HARP],
      ]),
    ].some((S) => {
      let w = typeof S === "string" ? S.trim() : "";
      return PINNED_PROMPT_TEXT_HASHES.has(computeContentHash(w)) && systemPrompt.some((L) => L.includes(w));
    });
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:4819586-4820079 fingerprint = BASH_READ_COMMANDS (0.539)
/**
 * Bash 工具常量：换行、进度阈值 2000ms，以及搜索/读/列目录/中性/静默命令集合（用于折叠显示 isSearchOrReadCommand 与 noOutputExpected）。
 */
var NEWLINE = `
`;
var PROGRESS_THRESHOLD_MS = 2000;
var BASH_SEARCH_COMMANDS = new Set(["find", "grep", "rg", "ag", "ack", "locate", "which", "whereis"]);
var BASH_READ_COMMANDS = new Set([
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
var BASH_LIST_COMMANDS = new Set(["ls", "tree", "du"]);
var BASH_SEMANTIC_NEUTRAL_COMMANDS = new Set(["echo", "printf", "true", "false", ":"]);
var BASH_COLLAPSIBLE_COMMANDS = new Set([
  ...BASH_SEARCH_COMMANDS,
  ...BASH_READ_COMMANDS,
  ...BASH_LIST_COMMANDS,
  ...BASH_SEMANTIC_NEUTRAL_COMMANDS,
]);
var FIRST_COMMAND_WORD_RE = /^\s*(?:(?:#[^\n]*|\\)\n\s*)*([^\s|&;<>()]+)/;
var BASH_SILENT_COMMANDS = new Set([
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
//@ chunk-e6aww6q8.js:4820079-4820479 fingerprint = isSearchOrReadBashCommand (1)
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
//@ chunk-e6aww6q8.js:4820479-4820641 file-local
/**
 * 命令的每个子命令都在静默集合（mv/cp/rm/mkdir/chmod/cd/export…）里时返回 true，结果字段 noOutputExpected 由此得出。
 */
function isSilentBashCommand(command) {
  let partsWithOperators = splitCommand(command);
  if (partsWithOperators.length === 0) return false;
  let r = false;
  for (let part of partsWithOperators) {
    let baseCommand = part.trim().split(/\s+/)[0];
    if (!baseCommand) continue;
    r = true;
    if (!BASH_SILENT_COMMANDS.has(baseCommand)) return false;
  }
  return r;
}
//@ chunk-e6aww6q8.js:4820641-4822292 fingerprint = fullInputSchema (0.509)
/**
 * Bash 输入 schema：command（拒绝会在审批框里隐藏的控制字符）、timeout、description、run_in_background、dangerouslyDisableSandbox，以及条件附加的字段；后台任务被禁用时去掉 run_in_background。
 */
var DISALLOWED_AUTO_BACKGROUND_COMMANDS = ["sleep"];
var HIDDEN_CONTROL_CHARS_MESSAGE =
  "command contains control characters that would be hidden in the approval dialog";
var fullInputSchema = DoctorLazy(() =>
  zodStrictObject({
    command: string().refine(isAllPrintable, HIDDEN_CONTROL_CHARS_MESSAGE).describe("The command to execute"),
    timeout: coercedNumberSchema(E().optional()).describe(
      `Optional timeout in milliseconds (max ${getMaxBashTimeout()} for a foreground command)`,
    ),
    description: string().optional()
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
    run_in_background: booleanishSchema(M().optional()).describe(getRunInBackgroundDescription()),
    dangerouslyDisableSandbox: booleanishSchema(M().optional()).describe(
      "Set this to true to dangerously override sandbox mode and run commands without sandboxing.",
    ),
    ...false,
    ...(areCommandNetworkListsOffered_2() && allowedDomainsInputSchema()),
    ...attachedMachineInputField(),
  }),
);
var coercedInputSchema = DoctorLazy(() => omitUnsandboxedFields(fullInputSchema(), UNSANDBOXED_INPUT_FIELDS));
var inputSchema = DoctorLazy(() =>
  (isBackgroundShellDisabled()
    ? coercedInputSchema().omit({
        run_in_background: true,
      })
    : coercedInputSchema()
  ).superRefine((e, n) => {}),
);
var LOGGED_COMMAND_TYPES = [...COMMON_BACKGROUND_COMMANDS, "wget"];
//@ chunk-e6aww6q8.js:4822292-4822317 affinity
function getExtraCommandLogFields(e) {
  return {};
}
//@ chunk-e6aww6q8.js:4822395-4822538 affinity
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
//@ chunk-e6aww6q8.js:4822538-4822689 file-local
/**
 * 遥测用：取命令里第一个属于常见构建/运行命令表（LOGGED_COMMAND_TYPES）的首词，否则 "other"。
 */
function getCommandTypeForLogging(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return lit_2("other");
  for (let part of parts) {
    let s = firstLineOf(part, " ");
    let found = LOGGED_COMMAND_TYPES.find((y) => y === s);
    if (found) return fromEnum(found);
  }
  return lit_2("other");
}
//@ chunk-e6aww6q8.js:4822689-4827035 fingerprint = outputSchema (0.557)
/**
 * Bash 输出 schema：stdout/stderr/interrupted/isImage、后台任务相关（backgroundTaskId、timedOutAfterMs、backgroundedBy*）、持久化输出、沙箱、各种给模型的提示（memoryLimitNote/triggeredNote/staleReadFileStateHint/ghRateLimitHint）、gitOperation 与 bashEditDiff。
 */
var outputSchema = DoctorLazy(() =>
  u({
    stdout: string().describe("The standard output of the command"),
    stderr: string().describe("The standard error output of the command"),
    rawOutputPath: string().optional().describe("Path to raw output file for large MCP tool outputs"),
    interrupted: M().describe("Whether the command was interrupted"),
    isImage: M().optional().describe("Flag to indicate if stdout contains image data"),
    backgroundTaskId: string()
      .optional()
      .describe("ID of the background task if command is running in background"),
    backgroundOutputPath: string()
      .optional()
      .describe(
        "@internal Path of the background task's output file on the machine that keeps the command, when that is not this process",
      ),
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
    backgroundCwdHint: string()
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
    dangerouslyDisableSandbox: M().optional().describe("Flag to indicate if sandbox mode was overridden"),
    returnCodeInterpretation: string()
      .optional()
      .describe("Semantic interpretation for non-error exit codes with special meaning"),
    noOutputExpected: M()
      .optional()
      .describe("Whether the command is expected to produce no output on success"),
    structuredContent: array(qne()).optional().describe("Structured content blocks"),
    persistedOutputPath: string()
      .optional()
      .describe(
        "Path to the persisted full output in tool-results dir (set when output is too large for inline)",
      ),
    persistedOutputSize: E()
      .optional()
      .describe("Total size of the output in bytes (set when output is too large for inline)"),
    stdoutHoldsOutputEnd: M()
      .optional()
      .describe(
        "@internal True when stdout holds the first part of the persisted output, a line saying that the middle was left out, and then its last lines",
      ),
    memoryLimitNote: string()
      .optional()
      .describe(
        "@internal Tells the model that the kernel killed a process for lack of memory while the command ran",
      ),
    triggeredNote: string()
      .optional()
      .describe(
        "@internal One line of advice for the model after a finished command, set by a rule in a feature flag",
      ),
    staleReadFileStateHint: string()
      .optional()
      .describe(
        "Model-facing note listing readFileState entries whose mtime bumped during this command (set when WRITE_COMMAND_MARKERS matches)",
      ),
    ghRateLimitHint: string()
      .optional()
      .describe(
        "Model-facing system-reminder appended when a gh command reports a GitHub API rate-limit error",
      ),
    gitOperation: gitOperationSchema()
      .optional()
      .describe(
        "Structured classification of git/gh operations detected in this command (commit/push/merge/rebase/PR). Client-facing \u2014 lets clients render git activity without re-parsing stdout; not surfaced to the model.",
      ),
    bashEditDiff: u({
      files: array(
        u({
          filePath: string(),
          hunks: array(hunkSchema()),
          created: literal(true).optional(),
          deleted: literal(true).optional(),
        }),
      ),
      moreFiles: E(),
      changedFiles: array(string()).optional(),
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
var BACKGROUND_CWD_NOTE_SUFFIX =
  "directory changes made by the backgrounded command do not apply to subsequent commands.";
//@ chunk-e6aww6q8.js:4827035-4827092 layout
function formatBackgroundCwdHint(e) {
  return `Session cwd remains ${e}; ${BACKGROUND_CWD_NOTE_SUFFIX}`;
}
//@ chunk-e6aww6q8.js:4827092-4827227 layout
/**
 * 清洗跨进程传来的 backgroundCwdHint：只有形如本进程生成的 "Session cwd remains <合法路径>; …" 才保留，否则换成通用说法。
 */
function sanitizeBackgroundCwdHint(backgroundCwdHint) {
  let n = /^Session cwd remains ([^;]+); /.exec(backgroundCwdHint)?.[1] ?? "";
  return isPlainAbsolutePath(n) && backgroundCwdHint === formatBackgroundCwdHint(n)
    ? backgroundCwdHint
    : `Session cwd is as it was; ${BACKGROUND_CWD_NOTE_SUFFIX}`;
}
//@ chunk-e6aww6q8.js:4827227-4827676 layout
/**
 * 跨进程（远程/另一台机器执行）结果的输出 schema：只挑选安全字段；后台任务 id 和输出路径只有在本地能对上时才保留。
 */
var outputSchemaAcrossProcesses = DoctorLazy(() =>
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
    .transform((e) => {
      let backgroundOutputFieldNames = getBackgroundOutputFieldNames(e);
      let { backgroundTaskId, backgroundOutputPath, backgroundEndsWithFinalResponse, backgroundCwdHint } = e;
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
//@ chunk-e6aww6q8.js:4827676-4827802 file-local
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
//@ chunk-e6aww6q8.js:4827802-4828082 fingerprint = detectBlockedSleepPattern (1)
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
//@ chunk-e6aww6q8.js:4828082-4828128 layout
function getSessionEnvVarKeys(e) {
  return e === undefined ? getLastCheckedSessionEnvVarKeys() : sessionEnvVarNameSet(e);
}
//@ chunk-e6aww6q8.js:4828128-4828224 layout
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
//@ chunk-e6aww6q8.js:4828224-4828311 layout
function isReadOnlyCommandOfflineEstimate(e) {
  return (
    checkReadOnlyConstraints(
      {
        command: e,
      },
      commandHasAnyCd(e),
      {
        offlineEstimate: true,
      },
    ).behavior === "allow"
  );
}
//@ chunk-e6aww6q8.js:4828311-4830001 layout
/**
 * 把工具实例上下文 e 与单次调用信息 n 合成一个 getter 视图：toolUseId、abortController、shellPermission（带本次 signal）、remoteCall、shellWallCapMs 等都取自本次调用。
 */
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
    get tools() {
      return e.tools;
    },
    get readFileState() {
      return e.readFileState;
    },
    get nestedMemoryAttachmentTriggers() {
      return e.nestedMemoryAttachmentTriggers;
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
    get effort() {
      return e.effort;
    },
    get effortLayerOverride() {
      return e.effortLayerOverride;
    },
    get permissions() {
      return e.permissions;
    },
    get unlayeredPermissions() {
      return e.unlayeredPermissions;
    },
    get messages() {
      return e.messages;
    },
    get systemPromptSnapshot() {
      return e.systemPromptSnapshot;
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
    get remoteCall() {
      return n.remoteCall;
    },
    get keptBackgroundShells() {
      return n.keptBackgroundShells;
    },
    get inputFromAnotherMachine() {
      return n.inputFromAnotherMachine;
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
  };
}
//@ chunk-e6aww6q8.js:4830001-4830411 layout
/**
 * "可能改写文件"的命令标记（--write/--fix/sed -i/prettier/black/cargo fmt/go fmt…），命中后才检查已读文件是否被改。
 */
var WRITE_COMMAND_MARKERS = new RegExp(
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
//@ chunk-e6aww6q8.js:4830411-4830635 layout
/**
 * 命令匹配写入标记时，并发 stat readFileState 里的文件，找出 mtime 晚于命令开始且晚于记录时间的文件，用来生成"请先 Read 再编辑"的提示。
 */
async function findStaleReadFileStateEntries(command, readFileState, commandStartMs) {
  if (isDiskless()) {
    reportOnce("bash_staleness");
    return [];
  }
  if (!WRITE_COMMAND_MARKERS.test(command)) return [];
  let s = [];
  await Promise.all(
    Array.from(readFileState.entries(), ([h, y]) =>
      getFileModificationTimeAsync(h)
        .then((fileModificationTime) => {
          if (fileModificationTime > commandStartMs && fileModificationTime > y.timestamp) s.push(h);
        })
        .catch(() => {}),
    ),
  );
  return s;
}
//@ chunk-e6aww6q8.js:4830635-4848828 facade-exports = BashTool (0.388)
/**
 * Bash 工具定义（name=Bash）。只读命令并发安全；checkPermissions 委托 bashPermissions；call 负责沙箱决策、执行（runShellCommand）、进度、错误转 ShellError、输出持久化/图片、git 操作识别、编辑 diff、已读文件过期提示和遥测。
 */
var BashTool = buildTool({
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
  isConcurrencySafe(e) {
    return this.isReadOnly?.(e) ?? false;
  },
  suppressesAllPermissionUpdates(e) {
    let n = e?.[HOST_TOOL_INPUT_FIELD];
    return typeof n === "string" && n.trim() !== "" && !isReservedMachineNameExact(n.trim());
  },
  isReadOnly(e, n) {
    return !isRemoteOnlyCheck(BASH_TOOL_NAME) && isReadOnlyBashInput(e, getSessionEnvVarKeys(n));
  },
  notReadOnlyReason(e, n) {
    if (isRemoteOnlyCheck(BASH_TOOL_NAME))
      return {
        message:
          "This session runs shell commands only in its cloud environment, so none can be verified as read-only here",
        everyInput: true,
      };
    let r = checkReadOnlyConstraints(e, commandHasAnyCd(e.command), {
      sessionEnvVarKeys: getSessionEnvVarKeys(n),
    });
    if (r.behavior === "allow") return;
    return "notReadOnlyCommand" in r
      ? {
          message: r.message,
          part: r.notReadOnlyCommand,
        }
      : {
          message: r.message,
        };
  },
  sandboxNetworkLists(e) {
    return getCommandNetworkLists(e);
  },
  toAutoClassifierInput(e) {
    let dangerouslyDisableSandbox = e.dangerouslyDisableSandbox;
    let r = false;
    let requested = isRemoteToolForwardingSwitchOn() ? splitHostField(e).requested : undefined;
    let h =
      requested !== undefined && !isReservedMachineNameExact(requested)
        ? machineLabelForMessage(requested) || undefined
        : undefined;
    let y = commandNetworkListsInput(e);
    if (h !== undefined || y !== undefined)
      return {
        command: e.command,
        ...false,
        ...(h !== undefined && {
          [HOST_TOOL_INPUT_FIELD]: h,
        }),
        ...y,
      };
    return e.command;
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
  fromAnotherProcess(e, n) {
    if (!e.interrupted && e.timedOutAfterMs === undefined && e.backgroundTaskId === undefined)
      countGitOpsFromCommand(String(n.command ?? ""));
    return {};
  },
  userFacingName(e) {
    if (!e) return "Bash";
    return env.CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR && shouldUseSandbox(e) ? "SandboxedBash" : "Bash";
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
  stripForStorage(e, n) {
    if (!n) return e;
    if (typeof e !== "object" || e === null || typeof e.stdout !== "string" || typeof e.stderr !== "string")
      return e;
    if (e.stdout === "" && e.stderr === "") return e;
    return {
      ...e,
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
        let joined = [typeof stderr === "string" ? stderr.trim() : "", memoryLimitNote].filter(Boolean).join(`
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
    let nt = stdout;
    if (stdout) {
      nt = stdout.replace(/^(\s*\n)+/, "");
      nt = nt.trimEnd();
    }
    if (persistedOutputPath) {
      let { start, end } =
        stdoutHoldsOutputEnd === true
          ? splitOutputAtMarker(nt)
          : {
              start: nt,
              end: undefined,
            };
      let preview = generatePreview(
        start,
        end === undefined ? PREVIEW_SIZE_CHARS : PREVIEW_SIZE_CHARS - OUTPUT_CUT_TAIL_CHARS,
      );
      nt = buildPersistedOutputMessage({
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
    let Et = "";
    if (backgroundTaskId) {
      Et = formatBackgroundTaskMessage({
        backgroundTaskId,
        outputPath: backgroundOutputPath ?? getTaskOutputPath(backgroundTaskId),
        backgroundedByUser,
        backgroundedToDeliverMessage,
        backgroundedByTurnAbort,
        timedOutAfterMs,
        subagentCapApplied,
        noOutputSeenAtTimeout: timedOutAfterMs !== undefined && !nt,
        reapedAtFinalResponse: backgroundEndsWithFinalResponse,
        wakesItsOwner: backgroundWakesOwner,
        readToolName: FILE_READ_TOOL_NAME,
      });
      if (backgroundCwdHint)
        Et += `
${backgroundCwdHint}`;
      if (isInputHoldOn())
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: backgroundTaskNotice(
            backgroundTaskId,
            [trimmed, Et].filter(Boolean).join(`
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
        nt,
        trimmed,
        Et,
        (memoryLimitNote || triggeredNote) &&
          !nt &&
          !trimmed &&
          !Et &&
          `(${BASH_TOOL_NAME} completed with no output)`,
        memoryLimitNote,
        triggeredNote,
        staleReadFileStateHint,
        ghRateLimitHint,
      ].filter(Boolean).join(`
`),
      is_error: interrupted,
    };
  },
  create(e) {
    return {
      async validateInput(n, r) {
        let s = r;
        if (canRunToolsOnThisMachine() && splitHostField(n).requested !== undefined)
          return {
            result: false,
            message: hostFieldNotForwardedMessage(),
            errorCode: 11,
          };
        let h = shouldUseSandbox(n);
        let y = sandboxPolicyRefusal(h, n.command, false, "bash");
        if (y !== null) {
          logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
            tool: lit_2("bash"),
          });
          return {
            result: false,
            message: y,
            errorCode: 14,
          };
        }
        if (
          !isBackgroundTasksOff() &&
          backgroundCompletionNoticeEnabled() &&
          s.remoteCall?.constraints.background !== "forbidden" &&
          !n.run_in_background &&
          s.shellWallCapMs === undefined
        ) {
          let blockedSleepPattern = detectBlockedSleepPattern(n.command);
          if (blockedSleepPattern !== null)
            return {
              result: false,
              message: `Blocked: ${blockedSleepPattern}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`,
              errorCode: 10,
            };
        }
        let duplicateBackgroundCommand = findDuplicateBackgroundCommand(
          {
            command: n.command,
            cwd: getCwd(),
            agentId: e.agentId,
            toolUseId: r.toolUseId,
          },
          e.taskRegistry,
        );
        if (
          duplicateBackgroundCommand !== undefined &&
          findToolByName(e.tools, TASKSTOP) !== undefined &&
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
        let w = n.run_in_background ? s.remoteCall?.backgroundShells?.reserve() : undefined;
        if (w !== undefined)
          return {
            result: false,
            message: w,
            errorCode: 12,
          };
        let L = checkAllowedDomainsInput(n, h);
        if (L !== undefined) return L;
        return (
          (await guardSyncedMemoryRemoval(memoryWatchers.of(e.session.host), () =>
            extractLiteralRmTargets(n.command, getCwd()),
          )) ?? {
            result: true,
          }
        );
      },
      permissionCheckFailureDecision(n, r) {
        let shellCallContext = makeShellCallContext(e, r);
        return denyCrashedCheckUnderCommandClamp(BASH_TOOL_NAME, shellCallContext.shellPermission);
      },
      async checkPermissions(n, r) {
        let shellCallContext = makeShellCallContext(e, r);
        return mergeBashSubcommandVerdicts(
          n,
          shellCallContext.shellPermission,
          await bashToolHasPermissionTwoPass(n, shellCallContext.shellPermission, undefined, (h) =>
            mergeBashSubcommandVerdicts(n, shellCallContext.shellPermission, h, "eachVerdict"),
          ),
          "chosenVerdict",
        );
      },
      async call(n, r) {
        let shellCallContext = makeShellCallContext(e, r);
        let { parentMessage, onProgress } = r;
        let model = safeRequestedModelName(parentMessage, shellCallContext.mainLoopModel());
        let commandStartMs = Math.floor(Date.now() / 1000) * 1000;
        let sameAsRunningBackground =
          findDuplicateBackgroundCommand(
            {
              command: n.command,
              cwd: getCwd(),
              agentId: shellCallContext.agentId,
              toolUseId: shellCallContext.toolUseId,
            },
            shellCallContext.taskRegistry,
          ) !== undefined;
        using G = shellCallContext.toolState.get(BashRepeatMeter).begin({
          input: n,
          cwd: getCwd(),
          agentId: shellCallContext.agentId,
          toolUseId:
            isPlainToolUseId(shellCallContext.toolUseId) && shellCallContext.innerCall !== true
              ? shellCallContext.toolUseId
              : undefined,
          messages: shellCallContext.messages(),
          taskRegistry: shellCallContext.taskRegistry,
          isReadOnly: isReadOnlyCommandOfflineEstimate,
        });
        let q = 0;
        try {
          q = getAgentProxyFailures();
        } catch (error) {
          logError(error);
        }
        let { abortController, emitToolProgress } = shellCallContext;
        let outputAccumulator = new EndTruncatingAccumulator();
        let we = "";
        let Ee = "";
        let cwd;
        let commandInterpretation;
        let Me = 0;
        let interrupted = false;
        let hadSandboxViolation = false;
        let lt;
        let execResult;
        await using nt = copyShellOutputFile(shellCallContext.taskRegistry);
        let output;
        let Et;
        let bashTestOutcome;
        let isMainThread = !shellCallContext.agentId;
        let constraints = shellCallContext.remoteCall?.constraints;
        let sandboxRequired = constraints?.sandbox === "required";
        let preventCwdChanges = !isMainThread || constraints?.pinCwd === true;
        let qt =
          !shellCallContext.userTypedShellDispatch &&
          shellCallContext.innerCall !== true &&
          shellCallContext.remoteCall === undefined;
        let Zt = qt && shellCallContext.inputFromAnotherMachine !== true;
        let rn = Zt ? currentOomKillCount() : undefined;
        let pn;
        let userTypedShellDispatch = shellCallContext.userTypedShellDispatch;
        let useSandbox = shouldUseSandbox(n, {
          disableUnsandboxedCommands: sandboxRequired,
          userTypedShellDispatch,
        });
        let ho = sandboxPolicyRefusal(
          useSandbox,
          n.command,
          userTypedShellDispatch && n.dangerouslyDisableSandbox === true,
          "bash",
        );
        if (ho !== null) {
          logFeatureSad("sandbox_exec", "sandbox_policy_refusal", {
            tool: lit_2("bash"),
          });
          throw new SandboxPolicyRefusalError(ho);
        }
        let sandboxEnabled = SandboxManager.isSandboxingEnabled();
        let effectiveFilesystemPolicy = getEffectiveFilesystemPolicy();
        if (sandboxRequired) {
          let nr =
            !useSandbox || effectiveFilesystemPolicy !== "strict" || isScrubEnabled()
              ? {
                  confined: false,
                  reason: "sandbox_unconfined",
                }
              : await ensureDeviceSandboxPosture();
          if (!nr.confined) {
            logFeatureSad("sandbox_exec", "remote_floor_refusal");
            throw new SandboxPolicyRefusalError(
              "This call must run inside a fully confining sandbox and none is available here. The command was not run.",
              nr.reason,
            );
          }
        }
        let sandboxed = useSandbox;
        let destructiveCategory = getDestructiveTargetCategory(n.command);
        let toolUseId = parentTaskId(shellCallContext.toolUseId);
        let zshNoteInPrompt = isPinnedPromptInSystemPrompt(shellCallContext);
        let vn =
          isBashEditDiffEnabled(shellCallContext.permissions().mode) &&
          !n.run_in_background &&
          !isReadOnlyBashInput(n, sessionEnvVarNameSet(shellCallContext));
        let co =
          vn && shouldSkipEditDiff(shellCallContext.toolState, r.outsideResultReader, hasLiveRootObserver());
        let So = co && commandMovesWorkTree(n.command);
        let ko =
          co && !So && shellCallContext.toolUseId !== undefined && isLinux()
            ? (findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd()))
            : null;
        let un = ko !== null && startWriteObserver(ko) === "ready" ? ko : null;
        if (un !== null) await flushObservedWrites(un);
        let ao = un !== null && shellCallContext.toolUseId !== undefined && (await startEditRecorder(un));
        if (ao && un && shellCallContext.toolUseId !== undefined)
          beginCommandObservation(shellCallContext.toolUseId, un);
        let now = Date.now();
        let yo = un !== null && !ao && !isRepoSnapshotGivenUp(un);
        let now_2 = Date.now();
        let before =
          co && !So && !ao
            ? yo
              ? "unavailable"
              : ((await takeBashSnapshot(getCwd())) ?? (await takeBashSnapshot(getOriginalCwd())))
            : null;
        let br = Date.now() - now_2;
        let Hr = before === "unavailable" ? isSharedSnapshotEnabled() : before?.sharesTreeReads === true;
        let Fr = vn
          ? (un ??
            (before && before !== "unavailable"
              ? before.repoRoot
              : (findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd()))))
          : null;
        let cs = Fr !== null ? registerConcurrentCommand(Fr) : null;
        let _r = false;
        let Cr = null;
        let Vr;
        let Oo = false;
        try {
          let nr = runShellCommand({
            input: n,
            useSandbox,
            networkLists: takeCommandNetworkLists(shellCallContext.toolUseId, n.command),
            constraints,
            backgroundHeld: () => shouldHoldForPlugin(shellCallContext),
            onHeldEnd: () => {
              Oo = true;
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
            subagentCapMs: getSubagentForegroundCapMs(shellCallContext),
            toolUseId: shellCallContext.toolUseId,
            toolState: shellCallContext.toolState,
            attributionMessageId: parentMessage?.message.id,
            callTiming: r.timing,
            agentId: shellCallContext.agentId,
            caller: abortScopeOf(shellCallContext),
            shellWallCapMs: shellCallContext.shellWallCapMs,
            promptShellPluginId: shellCallContext.promptShellPluginId,
            agentWorktree: shellCallContext.agentWorktree,
            isolationRoot: isolationWorktreeFor(shellCallContext),
            sessionEnvVars: shellCallContext.sessionEnvVars,
            storageV5: shellCallContext.storageV5,
            effortLevel: modelSupportsEffort(shellCallContext.mainLoopModel())
              ? getEffortLevelOrHigh(
                  shellCallContext.mainLoopModel(),
                  shellCallContext.effort(),
                  shellCallContext.effortLayerOverride(),
                )
              : undefined,
          });
          let Ti = shouldUseShellTool(shellCallContext.remoteCall !== undefined, shellCallContext.hasSpendCap)
            ? onProgress
            : undefined;
          let Vs;
          do {
            Vs = await nr.next();
            if (!Vs.done && Ti) {
              let Kr = Vs.value;
              Ti({
                type: "progress",
                toolUseID: `bash-progress-${Me++}`,
                data: {
                  type: "bash_progress",
                  output: Kr.output,
                  fullOutput: Kr.fullOutput,
                  elapsedTimeSeconds: Kr.elapsedTimeSeconds,
                  totalLines: Kr.totalLines,
                  totalBytes: Kr.totalBytes,
                  taskId: Kr.taskId,
                  timeoutMs: Kr.timeoutMs,
                },
              });
            }
          } while (!Vs.done);
          execResult = Vs.value;
          if (
            execResult.backgroundTaskId !== undefined &&
            execResult.timedOutAfterMs !== undefined &&
            shellCallContext.innerCall !== true
          )
            execResult = {
              ...execResult,
              stdout: await readShellOutputSoFar(execResult.backgroundTaskId, PREVIEW_SIZE_CHARS),
            };
          nt.track(execResult);
          if (execResult.intercepted) sandboxed = false;
          output = await withSpilledOutputTail(execResult.stdout, execResult.outputFilePath);
          Et = classifyBashCommand(n.command);
          bashTestOutcome = fromEnumOpt(classifyTestOutcome(Et, output, execResult));
          if (
            !execResult.backgroundTaskId &&
            trackGitOperations(shellCallContext.session.host, n.command, execResult.code, output).prResolved
          )
            shellCallContext.markPrResolvedThisSession();
          let _i = unwrapAbortReason(abortController.signal.reason);
          let jo = execResult.interrupted && _i === "interrupt";
          let interrupted_2 = execResult.interrupted && isUserInitiatedAbortReason(_i);
          if (execResult.interrupted && _i === "background") throw new AbortError_2();
          outputAccumulator.append((execResult.stdout || "").trimEnd() + NEWLINE);
          commandInterpretation = DEFAULT_SEMANTIC_2(n.command, execResult.code, execResult.stdout || "", "");
          if (output.includes(".git/index.lock': File exists")) logEvent("tengu_git_index_lock_error", {});
          if (commandInterpretation.isError && !jo) {
            if (execResult.code !== 0) outputAccumulator.append(`Exit code ${execResult.code}`);
          }
          cwd = getSessionProject(shellCallContext.session).cwd;
          if (!preventCwdChanges) {
            if (
              resetCwdIfOutsideProject(shellCallContext.session, shellCallContext.unlayeredPermissions()) ||
              execResult.cwdChangeRefused
            )
              we = stdErrAppendShellResetMessage("");
          }
          let stdout = execResult.stdout || "";
          let Ri = sandboxed
            ? SandboxManager.annotateStderrWithSandboxFailures(
                shellCallContext.toolUseId ?? n.command,
                stdout,
              )
            : stdout;
          hadSandboxViolation = Ri !== stdout;
          if (sandboxed && execResult.backgroundTaskId === undefined)
            lt = getParsedSandboxViolations(shellCallContext.toolUseId ?? n.command);
          if (hadSandboxViolation) Ee = Ri.slice(stdout.length).trim();
          if (execResult.preSpawnError) {
            if (/null bytes/.test(execResult.preSpawnError))
              throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
                execResult.preSpawnError,
                "Bash: command contained null bytes (argv echo redacted)",
              );
            let Kr = new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
              execResult.preSpawnError,
              "Bash: pre-spawn error (cwd/argv redacted)",
            );
            throw execResult.preSpawnErrorCode === "e2big"
              ? tagObject(Kr, {
                  kind: "spawn_arg_limit",
                })
              : Kr;
          }
          if (Zt && execResult.backgroundTaskId === undefined && !execResult.intercepted)
            pn = maybeShowBashNote(rn, shellCallContext.toolState.get(OomKillNoteState));
          let Ja =
            execResult.interrupted ||
            execResult.timedOut === true ||
            execResult.timedOutAfterMs !== undefined;
          if (sandboxed && shellCallContext.remoteCall !== undefined && (hadSandboxViolation || !Ja))
            shellCallContext.remoteCall.onNote(
              buildSandboxFailureHint({
                command: n.command,
                output: output + Ee,
                failed: commandInterpretation.isError && !Ja,
                violationRecorded: hadSandboxViolation,
                filesystemPolicy: effectiveFilesystemPolicy,
                additionalDenyRead: () => constraints?.additionalDenyRead ?? [],
              }),
            );
          if (commandInterpretation.isError && !jo) {
            let Kr =
              qt &&
              !execResult.interrupted &&
              execResult.outputFilePath !== undefined &&
              !isBase64DataUri(trimBlankEdgeLines(stdout)) &&
              shouldBuildLargeOutputMessage()
                ? await buildLargeOutputMessage(
                    execResult,
                    stdout,
                    shellCallContext.session,
                    shellCallContext.storageV5,
                  )
                : undefined;
            let Li =
              qt &&
              !execResult.interrupted &&
              execResult.timedOut !== true &&
              execResult.backgroundTaskId === undefined
                ? matchBashNoteRule(
                    n.command,
                    execResult.shellUsage,
                    true,
                    shellCallContext.toolState.get(BashNoteSessionState),
                  )
                : undefined;
            logEvent("tengu_bash_tool_command_failed", {
              model,
              command_type: getCommandTypeForLogging(n.command),
              ...Et,
              stdout_length: stdout.length,
              stderr_length: 0,
              exit_code: execResult.code,
              interrupted: execResult.interrupted,
              output_end_shown: Kr !== undefined,
              triggered_note_rule: Li?.rule ?? 0,
              triggered_note_shown: Li?.note !== undefined,
              oom_kill_during_command: pn?.hit === true,
              oom_kill_note_shown: pn?.note !== undefined,
              ...buildCommandTimingFields(execResult.shellUsage),
              zsh_note_in_prompt: zshNoteInPrompt,
              executor_shell: await getExecutorShellForAnalytics(),
              executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL),
              ...detectShellDialectIssues(n.command, output),
              bash_test_outcome: bashTestOutcome,
              sandboxed,
              sandbox_enabled: sandboxEnabled,
              dangerously_disable_sandbox: n.dangerouslyDisableSandbox ?? false,
              user_typed_shell_dispatch: userTypedShellDispatch,
              filesystem_policy: fromEnum(effectiveFilesystemPolicy),
              call_origin: fromEnum(constraints ? "remote" : "local"),
              ...getExtraCommandLogFields(n),
              had_sandbox_violation: sandboxed && hadSandboxViolation,
              same_as_running_background: sameAsRunningBackground,
              tool_use_id: toolUseId,
              destructive_category: fromEnum(destructiveCategory ?? "none"),
              destructive_target_scope: fromEnum(
                classifyDestructiveTargetScope(n.command, getCwd(), destructiveCategory),
              ),
              git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, destructiveCategory)),
              permission_mode: fromEnum(shellCallContext.permissions().mode),
              ...G.ended(execResult, true, false),
              reads_own_output: classifySavedOutputPath(n.command, shellCallContext.session),
            });
            let Qs;
            try {
              Qs = describeAgentProxyFailures(q);
            } catch (error) {
              logError(error);
            }
            throw new ShellError({
              stdout: "",
              stderr: [Qs, Oo ? ENDED_INSTEAD_OF_BACKGROUND_MESSAGE : undefined, pn?.note, Li?.note].reduce(
                (acc, Xa) => (Xa === undefined ? acc : `${acc.trimEnd()}${NEWLINE}${NEWLINE}${Xa}`),
                Kr === undefined ? Ri : Kr + Ee,
              ),
              code: execResult.code,
              interrupted: interrupted_2,
              hadSandboxViolation,
              sandboxViolations: lt,
              sandboxed,
            });
          }
          interrupted = execResult.interrupted;
          Cr =
            ao && un && shellCallContext.toolUseId
              ? await collectWatchedEditDiff(
                  un,
                  shellCallContext.toolUseId,
                  Boolean(execResult.backgroundTaskId),
                  interrupted,
                  shellCallContext.readFileState,
                  now,
                )
              : null;
          let now_2 = Date.now();
          let onRead = () => {
            if (cs && Fr !== null) unregisterConcurrentCommand(Fr, cs);
          };
          Vr =
            !execResult.backgroundTaskId && !So && !Cr && before && before !== "unavailable" && !interrupted
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
          br += Date.now() - now_2;
        } catch (error) {
          if (ao && shellCallContext.toolUseId !== undefined) {
            let Ti = await endCommandObservation(shellCallContext.toolUseId);
            if (un && (Ti === null || Ti.paths.length > 0 || Ti.overflow || Ti.watchEnds)) forgetRecorder(un);
          }
          throw error;
        } finally {
          if (cs && Fr !== null) _r = unregisterConcurrentCommand(Fr, cs);
          if (before && !yo) logEditDiffWait(br, Hr);
          if (before && before !== "unavailable" && Vr !== null) forgetRecorder(before.repoRoot);
          if (vn && !co && Fr !== null) forgetRecorder(Fr);
          if (So) {
            let nr =
              findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd());
            if (nr !== null) forgetRecorder(nr);
          }
          if (shellCallContext.toolUseId)
            emitToolProgress?.({
              kind: "clear",
              toolUseId: shellCallContext.toolUseId,
            });
          if (!isReadOnlyBashInput(n, sessionEnvVarNameSet(shellCallContext))) {
            shellCallContext.applyFileHistoryOp({
              kind: "touch",
            });
            G.mayHaveWritten = true;
          }
        }
        let str = outputAccumulator.toString();
        let persistedOutput = await persistBashOutput(
          execResult,
          shellCallContext.session,
          shellCallContext.storageV5,
          nt,
        );
        let path = persistedOutput?.path;
        let size = persistedOutput?.size;
        let rs =
          persistedOutput !== undefined &&
          Zt &&
          !interrupted &&
          !isBase64DataUri(trimBlankEdgeLines(str)) &&
          shouldShowOutputTail()
            ? await readOutputTail(
                execResult,
                str,
                PREVIEW_SIZE_CHARS - OUTPUT_CUT_TAIL_CHARS,
                OUTPUT_CUT_TAIL_CHARS,
                true,
              )
            : undefined;
        let Es =
          Zt &&
          !interrupted &&
          execResult.backgroundTaskId === undefined &&
          !isBase64DataUri(trimBlankEdgeLines(str))
            ? matchBashNoteRule(
                n.command,
                execResult.shellUsage,
                false,
                shellCallContext.toolState.get(BashNoteSessionState),
              )
            : undefined;
        logEvent("tengu_bash_tool_command_executed", {
          model,
          command_type: getCommandTypeForLogging(n.command),
          ...Et,
          stdout_length: str.length,
          stderr_length: 0,
          exit_code: execResult.code,
          interrupted,
          output_end_shown: rs !== undefined,
          triggered_note_rule: Es?.rule ?? 0,
          triggered_note_shown: Es?.note !== undefined,
          oom_kill_during_command: pn?.hit === true,
          oom_kill_note_shown: pn?.note !== undefined,
          ...buildCommandTimingFields(execResult.shellUsage),
          zsh_note_in_prompt: zshNoteInPrompt,
          executor_shell: await getExecutorShellForAnalytics(),
          executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL),
          ...detectShellDialectIssues(n.command, output),
          bash_test_outcome: bashTestOutcome,
          sandboxed,
          sandbox_enabled: sandboxEnabled,
          dangerously_disable_sandbox: n.dangerouslyDisableSandbox ?? false,
          user_typed_shell_dispatch: userTypedShellDispatch,
          filesystem_policy: fromEnum(effectiveFilesystemPolicy),
          call_origin: fromEnum(constraints ? "remote" : "local"),
          ...getExtraCommandLogFields(n),
          had_sandbox_violation: sandboxed && hadSandboxViolation,
          was_backgrounded: Boolean(execResult.backgroundTaskId),
          same_as_running_background: sameAsRunningBackground,
          tool_use_id: toolUseId,
          destructive_category: fromEnum(destructiveCategory ?? "none"),
          destructive_target_scope: fromEnum(
            classifyDestructiveTargetScope(n.command, getCwd(), destructiveCategory),
          ),
          git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, destructiveCategory)),
          permission_mode: fromEnum(shellCallContext.permissions().mode),
          ...G.ended(execResult, false, path !== undefined),
          reads_own_output: classifySavedOutputPath(n.command, shellCallContext.session),
        });
        let codeIndexingFromCommand = detectCodeIndexingFromCommand(n.command);
        if (codeIndexingFromCommand)
          logEvent("tengu_code_indexing_tool_used", {
            tool: fromEnum(codeIndexingFromCommand),
            source: lit_2("cli"),
            success: execResult.code === 0,
          });
        let stdout = trimBlankEdgeLines(str);
        stdout = consumeClaudeCodeHints(stdout, {
          command: n.command,
          pendingHint: shellCallContext.session.pendingHint,
          isMainThread,
          surface: "shell",
        });
        let fs = execResult.timedOutAfterMs === undefined && isBase64DataUri(stdout);
        let as = stdout;
        if (fs) {
          let nr = await resizeShellImageOutput(
            stdout,
            execResult.outputFilePath,
            size,
            imageLimitsForModel(shellCallContext.mainLoopModel()),
          );
          if (nr) as = nr;
          else fs = false;
        }
        let ghRateLimitHint = execResult.backgroundTaskId
          ? undefined
          : GITHUB_RATE_LIMIT_REMINDER(n.command, output, shellCallContext.toolState.get(PrLinkBackoffState));
        let backgroundCwdHint =
          execResult.backgroundTaskId && commandHasAnyCd(n.command)
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
          let gitOperation_2 = detectGitOperation(n.command, output);
          if (Object.keys(gitOperation_2).length > 0) gitOperation = gitOperation_2;
          if (!shellCallContext.remoteCall)
            emitVcsStateChanges(gitOperation_2, output, {
              command: n.command,
              exitCode: execResult.code,
              cwd,
            });
        }
        let staleReadFileStateHint;
        if (!interrupted && !fs && !execResult.backgroundTaskId) {
          let staleReadFileStateEntries = await findStaleReadFileStateEntries(
            n.command,
            shellCallContext.readFileState,
            commandStartMs,
          );
          if (staleReadFileStateEntries.length > 0) {
            let cwd = getCwd();
            let Vs = 5;
            let joined = staleReadFileStateEntries
              .slice(0, 5)
              .map(
                (staleReadFileStateEntry) =>
                  relative(cwd, staleReadFileStateEntry) || staleReadFileStateEntry,
              )
              .join(", ");
            let jo =
              staleReadFileStateEntries.length > 5 ? ` and ${staleReadFileStateEntries.length - 5} more` : "";
            let Qr = canonicalToolName_2(FILE_READ_TOOL_NAME, shellCallContext.tools);
            staleReadFileStateHint = `[This command modified ${staleReadFileStateEntries.length} ${plural(staleReadFileStateEntries.length, "file")} you've previously read: ${joined}${jo}. Call ${Qr} before editing.]`;
          }
        }
        let hr = execResult.backgroundTaskId
          ? undefined
          : So
            ? {
                files: [],
                moreFiles: 0,
                skipped: true,
              }
            : Cr
              ? (Cr.diff ?? undefined)
              : before === "unavailable"
                ? {
                    files: [],
                    moreFiles: 0,
                    unavailable: true,
                  }
                : before && interrupted
                  ? undefined
                  : before
                    ? (Vr ??
                      (_r
                        ? {
                            files: [],
                            moreFiles: 0,
                            shared: true,
                          }
                        : undefined))
                    : undefined;
        let bashEditDiff =
          hr && _r && !hr.skipped
            ? {
                ...hr,
                shared: true,
              }
            : hr;
        G.sawEditDiff(bashEditDiff, !execResult.backgroundTaskId && (Cr !== null || Vr !== undefined));
        if (bashEditDiff?.unavailable)
          logFeatureSad(
            Hr ? "bash_edit_diff_shared" : "bash_edit_diff",
            interrupted ? "interrupted" : "unavailable",
          );
        else if (bashEditDiff && !bashEditDiff.skipped)
          logFeatureOk(Hr ? "bash_edit_diff_shared" : "bash_edit_diff");
        if (!interrupted && !fs && !execResult.backgroundTaskId) {
          let reduced = [we, Ee, pn?.note, Es?.note, staleReadFileStateHint, ghRateLimitHint].reduce(
            (acc, _i) => acc + (_i ? _i.length + NEWLINE.length : 0),
            0,
          );
          let Ti =
            path !== undefined ||
            str.length > getMaxOutputLength() ||
            shellCallContext.innerCall === true ||
            as.length + reduced >
              getPersistenceThreshold(BASH_TOOL_NAME, getConfiguredBashOutputMaxChars(), MAX_CONTEXT_TOKENS);
          await recordShellFileReadsInReadState(
            n.command,
            shellCallContext.readFileState,
            abortController.signal,
            execResult.code,
            Ti ? undefined : as,
            shellCallContext.remoteCall === undefined && shellCallContext.nestedMemoryAttachmentTriggers
              ? {
                  triggers: shellCallContext.nestedMemoryAttachmentTriggers,
                  permissions: shellCallContext.permissions,
                }
              : undefined,
          );
        }
        let Ha = rs !== undefined && !fs && as !== "";
        let resultData = {
          stdout: Ha ? interleaveOutputCutMarker(as, rs) : as,
          stderr: Ee ? [we, Ee].filter(Boolean).join(NEWLINE) : we,
          interrupted,
          isImage: fs,
          returnCodeInterpretation: commandInterpretation?.message,
          noOutputExpected: isSilentBashCommand(n.command),
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
            "dangerouslyDisableSandbox" in n ? n.dangerouslyDisableSandbox : undefined,
          persistedOutputPath: path,
          persistedOutputSize: size,
          ...(Ha && {
            stdoutHoldsOutputEnd: Ha,
          }),
          memoryLimitNote: pn?.note,
          triggeredNote: Es?.note,
          staleReadFileStateHint,
          ghRateLimitHint,
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
          ...(lt !== undefined && {
            sandboxViolations: lt,
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
//@ chunk-e6aww6q8.js:4848828-4854744 fingerprint = runShellCommand (0.466)
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
  toolState,
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
  let yn = claimViolationReport(BASH_TOOL_NAME, command, toolState, {
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
      ...(isNpmPluginSourcePath(promptShellPluginId) && {
        bunOptionsFor: (zo) => bunOptionsGuard(promptShellPluginId, zo),
      }),
    });
  } catch (error) {
    yn?.();
    throw error;
  }
  let subagentCapApplied = isMainThread !== true && effectiveTimeoutMs < maxTimeoutMs ? true : undefined;
  if (shellCommand.status === "killed") yn?.();
  let resultPromise = shellCommand.result;
  if (toolUseId !== undefined)
    resultPromise
      .then((zo) => {
        if (zo.leftRunningPgid !== undefined)
          leftoverProcessTracker.noteCommandLeftProcesses(zo.leftRunningPgid, toolUseId);
      })
      .catch(() => {});
  if (yn)
    resultPromise
      .then((zo) => {
        if (zo.preSpawnError) yn();
      })
      .catch(() => {});
  async function spawnBackgroundTask(eventName, backgroundFn) {
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
          backgroundTrigger: eventName,
        },
        {
          abortController,
          taskRegistry,
        },
      )
    ).taskId;
  }
  function moveToBackground(eventName, rs, Es, Nr, backgroundFn) {
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
      Vr?.();
      let fs = resolveProgress;
      if (fs) {
        resolveProgress = null;
        fs();
      }
      logEvent(eventName, {
        command_type: getCommandTypeForLogging(command),
        ...Nr,
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
          rs,
        )
      )
        return;
      backgroundTaskId = foregroundTaskId;
      logEvent(eventName, {
        command_type: getCommandTypeForLogging(command),
        ...Nr,
      });
      Es?.(foregroundTaskId);
      return;
    }
    spawnBackgroundTask(rs).then((shellId) => {
      backgroundTaskId = shellId;
      let resolve = resolveProgress;
      if (resolve) {
        resolveProgress = null;
        resolve();
      }
      logEvent(eventName, {
        command_type: getCommandTypeForLogging(command),
        ...Nr,
      });
      if (Es) Es(shellId);
    });
  }
  let Fr = keptShellStarter?.listMove?.((backgroundFn) => {
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
  if (Fr !== undefined) shellCommand.result.then(Fr, Fr);
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
      let Es = await resultPromise;
      if (Es.preSpawnError) return Es;
      if (servedBackground !== undefined) {
        shellCommand.cleanup();
        return Es;
      }
    }
    let backgroundFn = timeoutWhenPositive(timeout, maxTimeoutMs);
    let backgroundTaskId =
      servedBackground === undefined
        ? await spawnBackgroundTask("explicit", backgroundFn)
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
  let Vr = null;
  let isTurnAbortPending = () =>
    abortController.signal.aborted && isTurnLevelAbort(abortController.signal.reason, caller);
  let jr = () => {
    if (!isTurnAbortPending()) return;
    Vr?.();
    let zo = resolveProgress;
    if (zo) {
      resolveProgress = null;
      zo();
    }
  };
  using Or = onAbortDisposable(abortController.signal, jr);
  {
    let initialResult = await Promise.race([
      resultPromise,
      new Promise((resolve) => {
        setTimeout((Nr) => Nr(null), PROGRESS_THRESHOLD_MS, resolve).unref();
      }),
      new Promise((resolve) => {
        if (isTurnAbortPending()) resolve(null);
        else Vr = () => resolve(null);
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
//@ chunk-e6aww6q8.js:4854744-4855075 sole-consumer
/**
 * 根据文件监视记录生成本次命令的编辑 diff（bashEditDiff）；后台化或中断时标记 unavailable 并停止监视。
 */
async function collectWatchedEditDiff(e, toolUseId, r, interrupted, readFileState, y) {
  let S = {
    diff: {
      files: [],
      moreFiles: 0,
      unavailable: true,
    },
  };
  if (r) {
    forgetObservedRepo(toolUseId);
    forgetRecorder(e);
    return S;
  }
  let w = await endCommandObservation(toolUseId);
  if (w === null) {
    forgetRecorder(e);
    return S;
  }
  if (interrupted) {
    if (w.paths.length === 0 && !w.overflow && !w.watchEnds)
      return {
        diff: null,
      };
    forgetRecorder(e);
    return S;
  }
  let diff = await recordEditedFilesSerially(e, w.paths, w.overflow, readFileState, y, w.shared);
  if (w.watchEnds) forgetRecorder(e);
  return {
    diff,
  };
}
export {
  BashTool,
  REFUSED_INPUT_FIELDS_WHEN_SANDBOX_REQUIRED,
  omitUnsandboxedFields,
  READ_BLOCK_EXEMPT_COMMANDS,
  COMMON_BACKGROUND_COMMANDS,
  SED_PRINT_RANGE_RE,
  SED_PRINT_LINE_RE,
  DEFAULT_HEAD_LINES,
  DEFAULT_TAIL_LINES,
  DISK_PROBE_TIMEOUT_MS,
  extractReadOnlyFileReads,
};
