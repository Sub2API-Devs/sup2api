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
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
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
import { __ } from "../../utils/remoteFileState.js";
import { hasReadDenyRuleForPath } from "../../utils/permissions/filesystem.js";
import { Vq } from "../../utils/filePathValidation.js";
import { toolMatchesName, findToolByName } from "../../Tool.js";
import { SKILL } from "../SkillTool/skillToolNames.js";
import { smn } from "../../services/mcp/mcpAccountKey.js";
import { getProjectRootOrNull, isDiskless, getOriginalCwd } from "../../bootstrap/state.js";
import { isLocalShellTask } from "../../tasks/LocalShellTask/guards.js";
import {
  Pxe,
  $qe,
  backgroundTaskNotice,
  oie,
  kVt,
  Okt,
} from "../../tasks/LocalShellTask/backgroundNotices.js";
import { UJn } from "../../plugins/functionHooks/toolCallHooks.js";
import {
  getFeatureValue_SESSION_PINNED,
  getFeatureValue_CACHED_MAY_BE_STALE,
  peekSessionPinnedFeatureValue,
} from "../../services/analytics/growthbook.js";
import { getMaxOutputLength, $rt } from "../../utils/shell/outputLimits.js";
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
  kWr,
  HWr,
  copyShellOutputFile,
  ywt,
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
import { hasNewOomKills, gDn } from "../../utils/toolCgroup.js";
import { MAX_OOM_NOTES, OOM_KILL_NOTE, buildSandboxFailureHint } from "./sandboxFailureHints.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, zodStrictObject, U, E, M, o, u, T, qne } from "../../../vendor/zod/v4/classic/schemas.js";
import { Kbn, classifyBashCommand } from "./commandClassification.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { pIi } from "../../../vendor/zod/v4/core/errors.js";
import { met } from "../../utils/contextAttachments/promptSnapshot.js";
import { getGlobalConfig } from "../../utils/config.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { isAllPrintable } from "../../utils/truncateGraphemes.js";
import { coercedNumberSchema } from "../ArtifactTool/publishEdits.js";
import {
  mB,
  getRunInBackgroundDescription,
  getSimplePrompt,
  isWoollyToastGateOn,
  hJ,
  Ixe,
} from "./prompt.js";
import { booleanishSchema } from "../../utils/spellcheck.js";
import {
  areCommandNetworkListsOffered,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  Tjt,
  checkAllowedDomainsInput,
  takeCommandNetworkLists,
} from "./sandboxNetwork.js";
import {
  attachedMachineInputField,
  $r,
  xH,
  splitHostField,
  HT,
  yO,
  hostFieldNotForwardedMessage,
} from "../../bridge/deviceRegistration.js";
import { isBackgroundShellDisabled, uf } from "../AgentTool/backgroundGates.js";
import { lit as lit_2, fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import {
  gitOperationSchema,
  countGitOpsFromCommand,
  withSpilledOutputTail,
  trackGitOperations,
  GITHUB_RATE_LIMIT_REMINDER,
  Xqo,
  detectGitOperation,
  emitVcsStateChanges,
} from "../shared/gitOperationTracking.js";
import { hunkSchema } from "../../../vendor/diff/lib/index.mjs";
import { BACKGROUND_OUTPUT_FIELDS, RVn, buildRuleRelevanceFilter } from "./bashCommandShape.js";
import { isTaskIdOfType } from "../../Task.js";
import { yqt, RA } from "../../utils/shell/shellEnvSnapshot.js";
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
import { Sdt, JT } from "../../constants/outputLimits.js";
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
import { L0e, PCe, ENDED_INSTEAD_OF_BACKGROUND_MESSAGE } from "../../plugins/functionHooks/inputHold.js";
import { getCwd } from "../../utils/cwd.js";
import { TASKSTOP } from "../TaskStopTool/prompt.js";
import { guardSyncedMemoryRemoval } from "./syncedMemoryRemoval.js";
import { memoryWatchers } from "../../services/memorySync/memoryWatcher.js";
import { BashRepeatMeter } from "./repeatMeter.js";
import { LEt, describeAgentProxyFailures } from "./agentProxyFailures.js";
import {
  SandboxPolicyRefusalError,
  SandboxManager,
  getEffectiveFilesystemPolicy,
} from "../../utils/sandbox/sandbox-adapter.js";
import { isScrubEnabled } from "../../utils/subprocessEnv.js";
import { ensureDeviceSandboxPosture } from "../../remote/tools/deviceSandboxPosture.js";
import { XCe, classifyDestructiveTargetScope, classifyGitDestructiveTarget } from "./destructiveTargets.js";
import { isBashEditDiffEnabled, shouldSkipEditDiff } from "./bashEditDiff/settings.js";
import {
  PYn,
  isLinux,
  startWriteObserver,
  zYn,
  beginCommandObservation,
  endCommandObservation,
  dS,
  IYn,
} from "./writeObserver.js";
import {
  dYn,
  h5,
  takeBashSnapshot,
  cW,
  registerConcurrentCommand,
  fmt,
  diffAfterCommand,
  logEditDiffWait,
} from "./bashEditDiff/snapshot.js";
import { findGitRootRecheckingNegative } from "../../utils/git.js";
import { startEditRecorder, VYn } from "./bashEditRecorder.js";
import { Vun, z6n, onAbortDisposable } from "../../utils/abortReasons.js";
import { isolationWorktreeFor } from "../../utils/worktreeIsolation.js";
import { modelSupportsEffort, getEffortLevelOrHigh } from "../../utils/effort.js";
import { shouldUseShellTool } from "../../utils/shell/shellToolUtils.js";
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
import { classifyTestOutcome, buildCommandTimingFields } from "./bashTelemetry.js";
import { unwrapAbortReason, isUserInitiatedAbortReason } from "../../utils/abortController.js";
import { DEFAULT_SEMANTIC_2 } from "./commandSemantics.js";
import { logEvent } from "../../services/analytics/index.js";
import { xo } from "../../bootstrap/sessionSlices.js";
import { OWr, claimViolationReport } from "./sandboxViolations.js";
import { tagObject } from "../../services/policyLimits/capabilityBlocks.js";
import { getExecutorShellForAnalytics, exec } from "../../utils/Shell.js";
import { detectShellDialectIssues } from "./sameEitherWayCommands.js";
import { classifySavedOutputPath } from "../FileReadTool/savedOutputPaths.js";
import { getAutoModeClassifierRole } from "../../utils/permissions/serverClassifier/arbiter.js";
import { detectCodeIndexingFromCommand } from "../../utils/codeIndexing.js";
import { imageLimitsForModel } from "../../utils/attachmentMedia.js";
import { reapsShellsOnExit } from "../../utils/agentContext.js";
import { Bri } from "../../services/tools/batchTools.js";
import { isBackgroundTasksDisabled } from "../AgentTool/AgentTool.js";
import { effectiveShellTimeoutMs, EVt } from "../../utils/timeouts.js";
import { VSn, bunOptionsGuard } from "../../utils/permissions/protectedSettingsPaths.js";
import { OEt } from "../../utils/shell/cpuReport.js";
import { stripShellUsageUnlessBackgrounded } from "../../utils/ShellCommand.js";
import { TaskOutput } from "../../utils/task/TaskOutput.js";
import { emitTaskNotification } from "../../utils/task/taskNotifications.js";

//@ chunk-e6aww6q8.js:190349-190446 placement
var x$e = ["dangerouslyDisableSandbox", ...[]],
  BUr = [...x$e, "run_in_background", "_simulatedSedEdit"];
/**
 * 宿主策略禁止非沙箱命令时，从 Bash 输入 schema 中去掉相关字段。
 */
//@ chunk-e6aww6q8.js:190446-190600 placement
function omitUnsandboxedFields(e, n) {
  if (!getHostAgentPolicy().unsandboxedCommandsDisabled) return e;
  let fromEntries = Object.fromEntries(n.filter((s) => s in e.shape).map((s) => [s, !0]));
  return e.omit(fromEntries);
}
/**
 * 不读写文件的命令集合（echo/printf/test/[/which/type/basename/dirname/df 等）；沙箱"读封锁"检查（chunk-e6aww6q8.js#kDo）遇到这些命令直接放过。
 */
//@ chunk-e6aww6q8.js:1178453-1178560 fingerprint = BASH_SEMANTIC_NEUTRAL_COMMANDS (0.59)
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
/**
 * 常见长时间运行/构建类命令前缀（npm、cargo、docker、pytest、gh、bazel、nix…），与 wget 合成遥测里的 command_type 白名单；也被后台任务模块使用。
 */
//@ chunk-e6aww6q8.js:3105251-3105639 fingerprint = COMMON_BACKGROUND_COMMANDS (0.602)
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
/**
 * 把 Bash 输入中的别名字段规范化：timeout_ms → timeout，command_description → description（已有 description 时丢弃），返回改写结果与形状标签。
 */
//@ chunk-e6aww6q8.js:4762311-4762825 placement
function normalizeBashInputAliases(e) {
  if (!isPlainObject_4(e)) return null;
  let n = { ...e },
    r = [];
  if ("timeout_ms" in n && !("timeout" in n)) {
    let timeout_ms = n.timeout_ms;
    if (typeof timeout_ms === "number" || (typeof timeout_ms === "string" && /^\d+$/.test(timeout_ms)))
      ((n.timeout = timeout_ms), delete n.timeout_ms, r.push("timeout_ms"));
  }
  if ("command_description" in n) {
    if (!("description" in n) && typeof n.command_description === "string")
      ((n.description = n.command_description), r.push("command_description"));
    else r.push("command_description_dropped");
    delete n.command_description;
  }
  return r.length ? { input: n, shapeClass: r.join(",") } : null;
}
//@ chunk-e6aww6q8.js:4762825-4762912 placement
var pRs = 10,
  mRs = 10,
  gRs = /^(\d+),(\d+)p$/,
  hRs = /^(\d+)p$/,
  yRs = /^\s*(echo|printf|true|:)\b/;
/**
 * 从不含管道与重定向的命令中提取只读的文件读取（cat/head/tail 等）。
 */
//@ chunk-e6aww6q8.js:4762912-4763170 placement
function extractReadOnlyFileReads(e) {
  if (/[|<>]/.test(e)) return [];
  let n;
  try {
    n = splitCommand(e);
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
    else if (n.length > 1 && !yRs.test(s)) return [];
  }
  return r;
}
/**
 * 按查看规格截取文件内容：tailLines 取末尾 N 行；否则按 startLine/endLine（1 起）切片，越界返回 null；无行号时返回全文。
 */
//@ chunk-e6aww6q8.js:4766686-4767150 sole-consumer
function sliceFileViewContent(fileContent, viewSpec) {
  if (viewSpec.tailLines !== void 0) {
    let parts = fileContent.split(`
`);
    if (parts.length > 0 && parts.at(-1) === "") parts.pop();
    if (parts.length === 0) return null;
    let min = Math.min(viewSpec.tailLines, parts.length),
      w = parts.length - min + 1;
    return {
      content: parts.slice(w - 1).join(`
`),
      offset: w,
      limit: min,
    };
  }
  if (viewSpec.startLine === void 0) return { content: fileContent, offset: void 0, limit: void 0 };
  let parts = fileContent.split(`
`),
    max = Math.max(1, viewSpec.startLine),
    max_2 = Math.max(max, viewSpec.endLine ?? max);
  if (max > parts.length) return null;
  return {
    content: parts.slice(max - 1, max_2).join(`
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
/**
 * 判断命令的模型可见输出是否真的包含这段文件内容（统一 CRLF；numbered 时逐行去掉行号前缀再比）。用来避免把没展示给模型的内容记成"已读"。
 */
//@ chunk-e6aww6q8.js:4767252-4767414 affinity
function outputContainsFileView(commandOutput, viewContent, isNumbered) {
  let trimEnd = viewContent.replace(/^(\s*\n)+/, "").trimEnd(),
    replaced = commandOutput.replaceAll(
      `\r
`,
      `
`,
    );
  return (
    replaced.includes(trimEnd) ||
    (isNumbered === !0 &&
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
        .includes(trimEnd))
  );
}
/**
 * Bash 执行完后，把 cat/head/tail/sed -n 等单纯查看文件的命令识别出来（chunk-e6aww6q8.js#Kzo），读取文件（≤10MB）并按查看范围写入 readFileState，使后续 Edit 不再要求先 Read；已有记录则只触发嵌套 CLAUDE.md 附件。requiresExitZero 的规格只在退出码 0 时生效。
 */
//@ chunk-e6aww6q8.js:4767414-4768090 fingerprint = applySedEdit (0.531)
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
          OVn(memoryTriggerContext, encoding);
          return;
        }
        let stats = await fs.stat(encoding);
        if (!stats.isFile() || stats.size > 10485760) return;
        if (abortSignal.aborted) return;
        let content = await fs.readFile(encoding, { encoding: "utf8" }),
          endings = __(content),
          ke = sliceFileViewContent(endings, L);
        if (ke === null || (!ke.content.trim() && endings.trim())) return;
        if (
          modelVisibleOutput !== void 0 &&
          !L.contentNotInModelContext &&
          !outputContainsFileView(modelVisibleOutput, ke.content, L.numbered)
        )
          return;
        (readFileState.set(encoding, {
          content: ke.content,
          timestamp: Math.floor(stats.mtimeMs),
          offset: ke.offset,
          limit: ke.limit,
          ...((L.contentNotInModelContext || modelVisibleOutput === void 0) && {
            contentNotInModelContext: !0,
          }),
        }),
          OVn(memoryTriggerContext, encoding));
      } catch {}
    }),
  );
}
//@ chunk-e6aww6q8.js:4768090-4768154 placement
function OVn(e, n) {
  if (e && !hasReadDenyRuleForPath(n, e.permissions())) Vq(e.triggers, n);
}
//@ chunk-e6aww6q8.js:4768154-4768167 placement
var IRs = 2000;
//@ chunk-e6aww6q8.js:4768903-4768977 placement
async function NVn(e) {
  if (!e.some((n) => toolMatchesName(n, SKILL))) return [];
  return smn(getProjectRootOrNull());
}
/**
 * 查找同一代理、同一目录下正在后台运行的相同 Bash 命令任务，用于避免重复启动。
 */
//@ chunk-e6aww6q8.js:4768977-4769315 placement
function findDuplicateBackgroundCommand(e, n) {
  if (!UDe(e.toolUseId)) return;
  let trimmed = e.command.trim();
  return Object.values(n.all())
    .filter(isLocalShellTask)
    .find(
      (s) =>
        s.isBackgrounded &&
        s.status === "running" &&
        s.shellCommand?.status === "backgrounded" &&
        (s.caller === "turn" || s.caller === "agent") &&
        UDe(s.toolUseId) &&
        s.shell === "bash" &&
        s.agentId === e.agentId &&
        s.cwd === e.cwd &&
        s.command.trim() === trimmed,
    );
}
//@ chunk-e6aww6q8.js:4769315-4769394 placement
function UDe(e) {
  return e !== void 0 && !e.endsWith(Pxe) && !e.includes($qe) && !UJn(e);
}
//@ chunk-e6aww6q8.js:4769443-4769491 placement
function FVn() {
  return getFeatureValue_SESSION_PINNED("tengu_quiet_pike", !1);
}
//@ chunk-e6aww6q8.js:4769491-4769540 placement
function $Vn() {
  return getFeatureValue_SESSION_PINNED("tengu_hushed_wren", !1);
}
//@ chunk-e6aww6q8.js:4769540-4769630 placement
var Oie = 1500,
  Pie = `
[\u2026 output cut here; the full output was saved to a file \u2026]
`;
//@ chunk-e6aww6q8.js:4769630-4769720 placement
function HVn(e, n) {
  let r = getMaxOutputLength() - Pie.length - n.length;
  return `${truncateToLength(e, Math.max(0, r))}${Pie}${n}`;
}
//@ chunk-e6aww6q8.js:4769720-4769859 placement
function splitOutputAtMarker(e) {
  let index = e.lastIndexOf(Pie);
  return index === -1
    ? { start: e, end: void 0 }
    : { start: e.slice(0, index), end: takeLastChars(e.slice(index + Pie.length), Oie) || void 0 };
}
//@ chunk-e6aww6q8.js:4769859-4769872 placement
var NRs = 6000;
/**
 * 把后台任务输出文件持久化到工具结果目录（v5 存储或本地快照，大小有上限），返回 {path, size}；失败时回调 copyFailed。
 */
//@ chunk-e6aww6q8.js:4769872-4770286 placement
async function persistBashOutput({ outputFilePath: outputFilePath, outputTaskId: outputTaskId }, r, s, h) {
  if (!outputFilePath || !outputTaskId) return;
  let y;
  try {
    let S = getOriginalCwd_2(r);
    y = await ensureToolResultsDir(S, s);
    let w = getToolResultFilePath(S, outputTaskId, !1),
      L = isStorageV5Enabled() && s !== void 0 ? toolResultsKey(dirname_74(w), basename_66(w)) : void 0;
    if (isStorageV5Enabled() && s !== void 0 && L !== void 0) {
      let q = await persistShellOutput(
        s,
        L,
        outputFilePath,
        MAX_PERSISTED_OUTPUT_BYTES,
        getTaskOutputRootDir(),
      );
      if (typeof q === "number") return { path: w, size: q };
      if (q === void 0) {
        h?.copyFailed(void 0, y);
        return;
      }
    }
    let G = await persistTaskOutputSnapshot(outputFilePath, w, MAX_PERSISTED_OUTPUT_BYTES);
    return { path: w, size: G };
  } catch (error) {
    h?.copyFailed(error, y);
    return;
  }
}
/**
 * 输出很大时读取任务输出文件的尾部用于预览（跳过不完整的首行），读不到时记 warn 或错误。
 */
//@ chunk-e6aww6q8.js:4770286-4770768 placement
async function readOutputTail(
  { outputTaskId: outputTaskId, outputFileSize: outputFileSize = 0 },
  r,
  s,
  h,
  y = !1,
) {
  let min = Math.min(h, getMaxOutputLength() - s - (y ? Pie.length : 0)),
    w = y ? getMaxOutputLength() : (r.length - nmt(r).length + s) * 3;
  if (!outputTaskId || min <= 0 || outputFileSize >= MAX_PERSISTED_OUTPUT_BYTES || outputFileSize <= w + min)
    return;
  try {
    let { content: content, omittedBytes: omittedBytes } = await getVerifiedTaskOutputTail(
      outputTaskId,
      min + 1,
      outputFileSize,
    );
    if (omittedBytes < w) return;
    let index = content.indexOf(`
`),
      Z = index !== -1 && index < content.length / 2 ? content.slice(index + 1) : content;
    return nmt(Z).trimEnd() || void 0;
  } catch (error) {
    if (isENOENT(error) || isSadResourceErrno(error) || isEnvFsErrno(error) || isTaskOutputSwapRefusal(error))
      logForDebugging(
        `Bash: could not read the end of task ${outputTaskId}'s output file: ${errorMessage(error)}`,
        { level: "warn" },
      );
    else logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:4770768-4771011 placement
async function buildLargeOutputMessage(e, n, r, s) {
  let h = await readOutputTail(e, n, PREVIEW_SIZE_CHARS, NRs),
    y = h === void 0 ? void 0 : await persistBashOutput(e, r, s);
  if (y === void 0) return;
  return buildLargeToolResultMessage({
    filepath: y.path,
    originalSize: y.size,
    isJson: !1,
    ...generatePreview(nmt(n), PREVIEW_SIZE_CHARS),
    previewEnd: h,
    truncatedAtBytes: y.size >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : void 0,
  });
}
//@ chunk-e6aww6q8.js:4771011-4771065 placement
function nmt(e) {
  return stripClaudeCodeHints(e).replace(/^(\s*\n)+/, "");
}
//@ chunk-e6aww6q8.js:4814999-4815017 placement
class Dmt {
  shown = 0;
}
//@ chunk-e6aww6q8.js:4815017-4815161 placement
function maybeShowBashNote(e, n) {
  let r = hasNewOomKills(e) === !0;
  if (!r || n.shown >= MAX_OOM_NOTES || !getFeatureValue_CACHED_MAY_BE_STALE("tengu_wiggly_gray", !1))
    return { hit: r, note: void 0 };
  return (n.shown++, { hit: r, note: OOM_KILL_NOTE });
}
/**
 * Bash 触发提示规则的常量与 schema：规则数上限、输出筛选类命令、每条规则的触发类型、最短时长、提示文本与每会话上限。
 */
//@ chunk-e6aww6q8.js:4815161-4815549 placement
var MAX_NOTE_RULES = 8,
  FILTER_COMMANDS = new Set(["tail", "head", "grep", "egrep", "fgrep", "rg", "ag", "wc"]),
  bashNoteRulesSchema = DoctorLazy(() =>
    A(
      zodStrictObject({
        kinds: A(U(Kbn)).min(1).max(Kbn.length),
        allKinds: A(U(Kbn)).min(1).max(Kbn.length).optional(),
        minSeconds: E().min(0),
        filtered: M().optional(),
        failed: M().optional(),
        text: o()
          .max(400)
          .regex(/^[!-;=-Z\\^-~](?:[ -;=-Z\\^-~]*[!-;=-Z\\^-~])?$/),
        maxPerSession: E().int().min(1).max(5),
        show: M(),
      }),
    ).max(MAX_NOTE_RULES),
  );
//@ chunk-e6aww6q8.js:4815549-4815579 placement
class tLe {
  rules;
  shown = new Map();
}
/**
 * 按 tengu_temporal_kazoo 配置的规则给 Bash 结果附加提示：匹配耗时、失败状态、命令种类、是否经过滤管道，每条规则每会话有显示上限。
 */
//@ chunk-e6aww6q8.js:4815579-4816237 placement
function matchBashNoteRule(e, n, r, s) {
  let h = (s.rules ??= loadBashNoteRules()),
    mapped = h.map(
      (Ee) => n !== void 0 && n.wallMs >= Ee.minSeconds * 1000 && (Ee.failed === void 0 || Ee.failed === r),
    );
  if (!mapped.includes(!0)) return;
  let {
      bash_command_kinds: bash_command_kinds,
      bash_last_argv0: bash_last_argv0,
      has_pipe: has_pipe,
      has_redirect: has_redirect,
    } = classifyBashCommand(e),
    parts = bash_command_kinds.split(","),
    Z = has_pipe && !has_redirect && FILTER_COMMANDS.has(bash_last_argv0) && !/\btee\b/.test(e),
    index = h.findIndex(
      (Ee, Ae) =>
        mapped[Ae] === !0 &&
        Ee.kinds.some((kind) => parts.includes(kind)) &&
        (Ee.allKinds === void 0 || Ee.allKinds.every((allKind) => parts.includes(allKind))) &&
        (Ee.filtered === void 0 || (Ee.filtered ? Z : !has_pipe)),
    ),
    ke = h[index];
  if (ke === void 0) return;
  let we = s.shown.get(index) ?? 0;
  if (!ke.show || we >= ke.maxPerSession) return { rule: index + 1, note: void 0 };
  return (s.shown.set(index, we + 1), { rule: index + 1, note: `[${ke.text}]` });
}
/**
 * 读取会话固定的 tengu_temporal_kazoo 开关作为 Bash 提示规则列表；格式不符或超过上限时记录并返回空列表。
 */
//@ chunk-e6aww6q8.js:4816237-4816646 placement
function loadBashNoteRules() {
  let e = getFeatureValue_SESSION_PINNED("tengu_temporal_kazoo", null);
  if (e === null) return [];
  let n = Array.isArray(e) && e.length > MAX_NOTE_RULES ? void 0 : bashNoteRulesSchema().safeParse(e);
  if (n?.success) return (logFeatureOk("bash_triggered_notes"), n.data);
  return (
    logFeatureSad("bash_triggered_notes", "invalid_value"),
    logForDebugging(
      `Bash: tengu_temporal_kazoo is not a valid list of note rules, so this session adds no notes: ${n === void 0 ? `more than ${MAX_NOTE_RULES} rules` : pIi(n.error)}`,
      { level: "error" },
    ),
    []
  );
}
//@ chunk-e6aww6q8.js:4816646-4816823 placement
var TENGU_JIGGLY_HARP = "tengu_jiggly_harp",
  mAs = new Set([
    "2ae3ca8d81740b53d923a0885aca50d83cf055d760d4673deab302aea4b65633",
    "6089b336d7aa1867d84a6ecc55f514623dbe706909b5491033a7504571f20409",
  ]);
/**
 * 判断 tengu_jiggly_harp 配置的已知文本（按哈希白名单）是否出现在本次请求的系统提示中，用于遥测。
 */
//@ chunk-e6aww6q8.js:4816823-4817273 placement
function isPinnedPromptInSystemPrompt(e) {
  try {
    let { toolUseId: toolUseId } = e;
    if (toolUseId === void 0 || toolUseId.endsWith(Pxe) || toolUseId.includes($qe) || UJn(toolUseId)) return;
    let messages = e.messages(),
      lastIndex = messages.findLastIndex((S) => S.type === "system" && S.subtype === "compact_boundary"),
      h = met(lastIndex === -1 ? messages : messages.slice(lastIndex), e)?.systemPrompt;
    if (h === void 0) return;
    return [
      ...new Set([
        peekSessionPinnedFeatureValue(TENGU_JIGGLY_HARP),
        getGlobalConfig().cachedGrowthBookFeatures?.[TENGU_JIGGLY_HARP],
      ]),
    ].some((S) => {
      let w = typeof S === "string" ? S.trim() : "";
      return mAs.has(computeContentHash(w)) && h.some((L) => L.includes(w));
    });
  } catch (error) {
    logError(error);
    return;
  }
}
/**
 * Bash 工具常量：换行、进度阈值 2000ms，以及搜索/读/列目录/中性/静默命令集合（用于折叠显示 isSearchOrReadCommand 与 noOutputExpected）。
 */
//@ chunk-e6aww6q8.js:4819586-4820079 fingerprint = BASH_READ_COMMANDS (0.539)
var NEWLINE = `
`,
  PROGRESS_THRESHOLD_MS = 2000,
  BASH_SEARCH_COMMANDS = new Set(["find", "grep", "rg", "ag", "ack", "locate", "which", "whereis"]),
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
  ]),
  BASH_LIST_COMMANDS = new Set(["ls", "tree", "du"]),
  BASH_SEMANTIC_NEUTRAL_COMMANDS = new Set(["echo", "printf", "true", "false", ":"]),
  BASH_COLLAPSIBLE_COMMANDS = new Set([
    ...BASH_SEARCH_COMMANDS,
    ...BASH_READ_COMMANDS,
    ...BASH_LIST_COMMANDS,
    ...BASH_SEMANTIC_NEUTRAL_COMMANDS,
  ]),
  FIRST_COMMAND_WORD_RE = /^\s*(?:(?:#[^\n]*|\\)\n\s*)*([^\s|&;<>()]+)/,
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
/**
 * 判断命令是否全部由搜索（find/grep/rg…）、读（cat/head/jq…）、列目录（ls/tree/du）命令组成（echo 等中性命令忽略），返回 {isSearch,isRead,isList}，供界面折叠显示。
 */
//@ chunk-e6aww6q8.js:4820079-4820479 fingerprint = isSearchOrReadBashCommand (1)
function isSearchOrReadBashCommand(command) {
  let n = FIRST_COMMAND_WORD_RE.exec(command)?.[1];
  if (!n || !BASH_COLLAPSIBLE_COMMANDS.has(n)) return { isSearch: !1, isRead: !1, isList: !1 };
  let r = !1,
    s = !1,
    h = !1,
    y = !1;
  for (let S of splitCommand(command)) {
    let baseCommand = S.trim().split(/\s+/)[0];
    if (!baseCommand || BASH_SEMANTIC_NEUTRAL_COMMANDS.has(baseCommand)) continue;
    if (!BASH_COLLAPSIBLE_COMMANDS.has(baseCommand)) return { isSearch: !1, isRead: !1, isList: !1 };
    if (((y = !0), BASH_SEARCH_COMMANDS.has(baseCommand))) r = !0;
    if (BASH_READ_COMMANDS.has(baseCommand)) s = !0;
    if (BASH_LIST_COMMANDS.has(baseCommand)) h = !0;
  }
  if (!y) return { isSearch: !1, isRead: !1, isList: !1 };
  return { isSearch: r, isRead: s, isList: h };
}
/**
 * 命令的每个子命令都在静默集合（mv/cp/rm/mkdir/chmod/cd/export…）里时返回 true，结果字段 noOutputExpected 由此得出。
 */
//@ chunk-e6aww6q8.js:4820479-4820641 file-local
function isSilentBashCommand(command) {
  let n = splitCommand(command);
  if (n.length === 0) return !1;
  let r = !1;
  for (let part of n) {
    let baseCommand = part.trim().split(/\s+/)[0];
    if (!baseCommand) continue;
    if (((r = !0), !BASH_SILENT_COMMANDS.has(baseCommand))) return !1;
  }
  return r;
}
/**
 * Bash 输入 schema：command（拒绝会在审批框里隐藏的控制字符）、timeout、description、run_in_background、dangerouslyDisableSandbox，以及条件附加的字段；后台任务被禁用时去掉 run_in_background。
 */
//@ chunk-e6aww6q8.js:4820641-4822292 fingerprint = fullInputSchema (0.509)
var DISALLOWED_AUTO_BACKGROUND_COMMANDS = ["sleep"],
  HIDDEN_CONTROL_CHARS_MESSAGE =
    "command contains control characters that would be hidden in the approval dialog",
  fullInputSchema = DoctorLazy(() =>
    zodStrictObject({
      command: o().refine(isAllPrintable, HIDDEN_CONTROL_CHARS_MESSAGE).describe("The command to execute"),
      timeout: coercedNumberSchema(E().optional()).describe(
        `Optional timeout in milliseconds (max ${mB()} for a foreground command)`,
      ),
      description: o().optional()
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
      ...!1,
      ...(areCommandNetworkListsOffered() && allowedDomainsInputSchema()),
      ...attachedMachineInputField(),
    }),
  ),
  coercedInputSchema = DoctorLazy(() => omitUnsandboxedFields(fullInputSchema(), x$e)),
  inputSchema = DoctorLazy(() =>
    (isBackgroundShellDisabled()
      ? coercedInputSchema().omit({ run_in_background: !0 })
      : coercedInputSchema()
    ).superRefine((e, n) => {}),
  ),
  LOGGED_COMMAND_TYPES = [...COMMON_BACKGROUND_COMMANDS, "wget"];
//@ chunk-e6aww6q8.js:4822292-4822317 affinity
function getExtraCommandLogFields(e) {
  return {};
}
/**
 * 把后台化原因（message/person）映射成结果标志 backgroundedToDeliverMessage / backgroundedByUser。
 */
//@ chunk-e6aww6q8.js:4822395-4822538 affinity
function backgroundReasonToFlags(e) {
  switch (e) {
    case void 0:
      return;
    case "message":
      return { backgroundedToDeliverMessage: !0 };
    case "person":
      return { backgroundedByUser: !0 };
  }
}
/**
 * 遥测用：取命令里第一个属于常见构建/运行命令表（LOGGED_COMMAND_TYPES）的首词，否则 "other"。
 */
//@ chunk-e6aww6q8.js:4822538-4822689 file-local
function getCommandTypeForLogging(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return lit_2("other");
  for (let part of parts) {
    let s = firstLineOf(part, " "),
      found = LOGGED_COMMAND_TYPES.find((y) => y === s);
    if (found) return fromEnum(found);
  }
  return lit_2("other");
}
/**
 * Bash 输出 schema：stdout/stderr/interrupted/isImage、后台任务相关（backgroundTaskId、timedOutAfterMs、backgroundedBy*）、持久化输出、沙箱、各种给模型的提示（memoryLimitNote/triggeredNote/staleReadFileStateHint/ghRateLimitHint）、gitOperation 与 bashEditDiff。
 */
//@ chunk-e6aww6q8.js:4822689-4827035 fingerprint = outputSchema (0.557)
var outputSchema = DoctorLazy(() =>
    u({
      stdout: o().describe("The standard output of the command"),
      stderr: o().describe("The standard error output of the command"),
      rawOutputPath: o().optional().describe("Path to raw output file for large MCP tool outputs"),
      interrupted: M().describe("Whether the command was interrupted"),
      isImage: M().optional().describe("Flag to indicate if stdout contains image data"),
      backgroundTaskId: o()
        .optional()
        .describe("ID of the background task if command is running in background"),
      backgroundOutputPath: o()
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
      subagentCapApplied: T(!0)
        .optional()
        .describe("@internal True if the async subagent foreground cap shortened the command's timeout"),
      backgroundCwdHint: o()
        .optional()
        .describe(
          "Model-facing note that the session cwd was not changed by a backgrounded command containing a directory-change builtin (cd/pushd/popd/chdir)",
        ),
      backgroundEndsWithFinalResponse: T(!0)
        .optional()
        .describe(
          "True when this backgrounded command is terminated at its caller's final response, so no completion notification can follow (a synchronous subagent's command, or a headless session that takes no further input and is not waiting for background commands); absent when the command survives",
        ),
      backgroundWakesOwner: T(!0)
        .optional()
        .describe(
          "True when the subagent that owns this backgrounded command parks for its end and is woken by it",
        ),
      dangerouslyDisableSandbox: M().optional().describe("Flag to indicate if sandbox mode was overridden"),
      returnCodeInterpretation: o()
        .optional()
        .describe("Semantic interpretation for non-error exit codes with special meaning"),
      noOutputExpected: M()
        .optional()
        .describe("Whether the command is expected to produce no output on success"),
      structuredContent: A(qne()).optional().describe("Structured content blocks"),
      persistedOutputPath: o()
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
      memoryLimitNote: o()
        .optional()
        .describe(
          "@internal Tells the model that the kernel killed a process for lack of memory while the command ran",
        ),
      triggeredNote: o()
        .optional()
        .describe(
          "@internal One line of advice for the model after a finished command, set by a rule in a feature flag",
        ),
      staleReadFileStateHint: o()
        .optional()
        .describe(
          "Model-facing note listing readFileState entries whose mtime bumped during this command (set when WRITE_COMMAND_MARKERS matches)",
        ),
      ghRateLimitHint: o()
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
        files: A(
          u({ filePath: o(), hunks: A(hunkSchema()), created: T(!0).optional(), deleted: T(!0).optional() }),
        ),
        moreFiles: E(),
        changedFiles: A(o()).optional(),
        unavailable: T(!0).optional(),
        skipped: T(!0).optional(),
        shared: T(!0).optional(),
      })
        .optional()
        .describe(
          "@internal Per-file diff of the working-tree changes this command made, for rendering and for PostToolUse Bash hooks (changedFiles: absolute paths of every changed file known, shown or not, at most 200; cut when shorter than files.length + moreFiles); not surfaced to the model.",
        ),
    }),
  ),
  BACKGROUND_CWD_NOTE_SUFFIX =
    "directory changes made by the backgrounded command do not apply to subsequent commands.";
//@ chunk-e6aww6q8.js:4827035-4827092 layout
function formatBackgroundCwdHint(e) {
  return `Session cwd remains ${e}; ${BACKGROUND_CWD_NOTE_SUFFIX}`;
}
/**
 * 清洗跨进程传来的 backgroundCwdHint：只有形如本进程生成的 "Session cwd remains <合法路径>; …" 才保留，否则换成通用说法。
 */
//@ chunk-e6aww6q8.js:4827092-4827227 layout
function sanitizeBackgroundCwdHint(e) {
  let n = /^Session cwd remains ([^;]+); /.exec(e)?.[1] ?? "";
  return isPlainAbsolutePath(n) && e === formatBackgroundCwdHint(n)
    ? e
    : `Session cwd is as it was; ${BACKGROUND_CWD_NOTE_SUFFIX}`;
}
/**
 * 跨进程（远程/另一台机器执行）结果的输出 schema：只挑选安全字段；后台任务 id 和输出路径只有在本地能对上时才保留。
 */
//@ chunk-e6aww6q8.js:4827227-4827676 layout
var outputSchemaAcrossProcesses = DoctorLazy(() =>
  outputSchema()
    .pick({
      stdout: !0,
      stderr: !0,
      interrupted: !0,
      isImage: !0,
      timedOutAfterMs: !0,
      noOutputExpected: !0,
      ...BACKGROUND_OUTPUT_FIELDS,
    })
    .strip()
    .transform((e) => {
      let n = RVn(e),
        {
          backgroundTaskId: backgroundTaskId,
          backgroundOutputPath: backgroundOutputPath,
          backgroundEndsWithFinalResponse: backgroundEndsWithFinalResponse,
          backgroundCwdHint: backgroundCwdHint,
        } = e;
      return backgroundTaskId === void 0 ||
        backgroundOutputPath === void 0 ||
        !isTaskIdOfType("local_bash", backgroundTaskId) ||
        !isTaskOutputPathFor(backgroundTaskId, backgroundOutputPath)
        ? n
        : {
            ...n,
            backgroundTaskId: backgroundTaskId,
            backgroundOutputPath: backgroundOutputPath,
            backgroundEndsWithFinalResponse: backgroundEndsWithFinalResponse,
            ...(backgroundCwdHint !== void 0 && {
              backgroundCwdHint: sanitizeBackgroundCwdHint(backgroundCwdHint),
            }),
          };
    }),
);
/**
 * 首个子命令不是 sleep 时允许超时自动转后台。
 */
//@ chunk-e6aww6q8.js:4827676-4827802 file-local
function isAutobackgroundingAllowed(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return !0;
  let r = parts[0]?.trim().split(/\s+/)[0];
  if (!r) return !0;
  return !DISALLOWED_AUTO_BACKGROUND_COMMANDS.includes(r);
}
/**
 * 检测"sleep N（N≥阈值）"开头的阻塞写法，返回描述；validateInput 据此拒绝并建议改用 Monitor 或 run_in_background。
 */
//@ chunk-e6aww6q8.js:4827802-4828082 fingerprint = detectBlockedSleepPattern (1)
function detectBlockedSleepPattern(command) {
  let parts = splitCommand(command);
  if (parts.length === 0) return null;
  let first = parts[0]?.trim() ?? "",
    match = /^sleep\s+(\d+(?:\.\d*)?)\s*$/.exec(first);
  if (!match) return null;
  let h = parseFloat(match[1]);
  if (h < kWr) return null;
  let rest = parts.slice(1).join(" ").trim();
  return rest ? `sleep ${h} followed by: ${rest}` : `standalone sleep ${h}`;
}
//@ chunk-e6aww6q8.js:4828082-4828128 layout
function getSessionEnvVarKeys(e) {
  return e === void 0 ? yqt() : RA(e);
}
/**
 * 用 checkReadOnlyConstraints 判断这次 Bash 输入是否只读（考虑会话 env 变量键）；isReadOnly/isConcurrencySafe 都依赖它。
 */
//@ chunk-e6aww6q8.js:4828128-4828224 layout
function isReadOnlyBashInput(e, n) {
  let r = commandHasAnyCd(e.command);
  return checkReadOnlyConstraints(e, r, { sessionEnvVarKeys: n }).behavior === "allow";
}
//@ chunk-e6aww6q8.js:4828224-4828311 layout
function isReadOnlyCommandOfflineEstimate(e) {
  return (
    checkReadOnlyConstraints({ command: e }, commandHasAnyCd(e), { offlineEstimate: !0 }).behavior === "allow"
  );
}
/**
 * 把工具实例上下文 e 与单次调用信息 n 合成一个 getter 视图：toolUseId、abortController、shellPermission（带本次 signal）、remoteCall、shellWallCapMs 等都取自本次调用。
 */
//@ chunk-e6aww6q8.js:4828311-4830001 layout
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
      return { ...e.shellPermission, abortController: { signal: n.signal }, toolUseId: n.toolUseId };
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
      return n.userTypedShellDispatch === !0;
    },
    get abortController() {
      return { signal: n.signal };
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
/**
 * "可能改写文件"的命令标记（--write/--fix/sed -i/prettier/black/cargo fmt/go fmt…），命中后才检查已读文件是否被改。
 */
//@ chunk-e6aww6q8.js:4830001-4830411 layout
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
/**
 * 命令匹配写入标记时，并发 stat readFileState 里的文件，找出 mtime 晚于命令开始且晚于记录时间的文件，用来生成"请先 Read 再编辑"的提示。
 */
//@ chunk-e6aww6q8.js:4830411-4830635 layout
async function findStaleReadFileStateEntries(command, readFileState, commandStartMs) {
  if (isDiskless()) return (reportOnce("bash_staleness"), []);
  if (!WRITE_COMMAND_MARKERS.test(command)) return [];
  let s = [];
  return (
    await Promise.all(
      Array.from(readFileState.entries(), ([h, y]) =>
        getFileModificationTimeAsync(h)
          .then((S) => {
            if (S > commandStartMs && S > y.timestamp) s.push(h);
          })
          .catch(() => {}),
      ),
    ),
    s
  );
}
/**
 * Bash 工具定义（name=Bash）。只读命令并发安全；checkPermissions 委托 bashPermissions；call 负责沙箱决策、执行（runShellCommand）、进度、错误转 ShellError、输出持久化/图片、git 操作识别、编辑 diff、已读文件过期提示和遥测。
 */
//@ chunk-e6aww6q8.js:4830635-4848828 facade-exports = BashTool (0.388)
var BashTool = buildTool({
  name: BASH_TOOL_NAME,
  enablesCodeExecution: !0,
  ruleContentField: "command",
  searchHint: "execute shell commands",
  remoteExecution: {
    supported: !0,
    refusedInputFields: BUr,
    decidingInputFields: ["command", "run_in_background", "dangerouslyDisableSandbox"],
  },
  backgrounding: "self",
  get maxResultSizeChars() {
    return $rt();
  },
  persistenceThresholdCeiling: Sdt,
  strict: !0,
  async description({ description: e }) {
    return e || "Run shell command";
  },
  async prompt({ model: e, tools: n, leanPrompt: r, bashFirstTrimmed: s, leanRewrite: h }) {
    return getSimplePrompt(e, await NVn(n), n, r, s, h);
  },
  isConcurrencySafe(e) {
    return this.isReadOnly?.(e) ?? !1;
  },
  suppressesAllPermissionUpdates(e) {
    let n = e?.[$r];
    return typeof n === "string" && n.trim() !== "" && !xH(n.trim());
  },
  isReadOnly(e, n) {
    return !isRemoteOnlyCheck(BASH_TOOL_NAME) && isReadOnlyBashInput(e, getSessionEnvVarKeys(n));
  },
  notReadOnlyReason(e, n) {
    if (isRemoteOnlyCheck(BASH_TOOL_NAME))
      return {
        message:
          "This session runs shell commands only in its cloud environment, so none can be verified as read-only here",
        everyInput: !0,
      };
    let r = checkReadOnlyConstraints(e, commandHasAnyCd(e.command), {
      sessionEnvVarKeys: getSessionEnvVarKeys(n),
    });
    if (r.behavior === "allow") return;
    return "notReadOnlyCommand" in r
      ? { message: r.message, part: r.notReadOnlyCommand }
      : { message: r.message };
  },
  sandboxNetworkLists(e) {
    return getCommandNetworkLists(e);
  },
  toAutoClassifierInput(e) {
    let dangerouslyDisableSandbox = e.dangerouslyDisableSandbox,
      r = !1,
      s = isRemoteToolForwardingSwitchOn() ? splitHostField(e).requested : void 0,
      h = s !== void 0 && !xH(s) ? HT(s) || void 0 : void 0,
      y = Tjt(e);
    if (h !== void 0 || y !== void 0)
      return { command: e.command, ...!1, ...(h !== void 0 && { [$r]: h }), ...y };
    return e.command;
  },
  async preparePermissionMatcher({ command: e }) {
    return buildRuleRelevanceFilter(e);
  },
  isSearchOrReadCommand(e) {
    let safeParse = inputSchema().safeParse(e);
    if (!safeParse.success) return { isSearch: !1, isRead: !1, isList: !1 };
    return isSearchOrReadBashCommand(safeParse.data.command);
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
    if (!e.interrupted && e.timedOutAfterMs === void 0 && e.backgroundTaskId === void 0)
      countGitOpsFromCommand(String(n.command ?? ""));
    return {};
  },
  userFacingName(e) {
    if (!e) return "Bash";
    return env.CLAUDE_CODE_BASH_SANDBOX_SHOW_INDICATOR && shouldUseSandbox(e) ? "SandboxedBash" : "Bash";
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
  extractSearchText({ stdout: e, stderr: n }) {
    return n
      ? `${e}
${n}`
      : e;
  },
  stripForStorage(e, n) {
    if (!n) return e;
    if (typeof e !== "object" || e === null || typeof e.stdout !== "string" || typeof e.stderr !== "string")
      return e;
    if (e.stdout === "" && e.stderr === "") return e;
    return { ...e, stdout: "", stderr: "" };
  },
  mapToolResultToToolResultBlockParam(
    {
      interrupted: e,
      stdout: n,
      stderr: r,
      isImage: s,
      backgroundTaskId: h,
      backgroundOutputPath: y,
      backgroundedByUser: S,
      backgroundedToDeliverMessage: w,
      backgroundedByTurnAbort: L,
      timedOutAfterMs: G,
      subagentCapApplied: q,
      backgroundEndsWithFinalResponse: Z,
      backgroundWakesOwner: Se,
      backgroundCwdHint: ke,
      structuredContent: we,
      persistedOutputPath: Ee,
      persistedOutputSize: Ae,
      stdoutHoldsOutputEnd: Ie,
      memoryLimitNote: Me,
      triggeredNote: We,
      staleReadFileStateHint: ze,
      ghRateLimitHint: lt,
    },
    Je,
  ) {
    if (we && we.length > 0) return { tool_use_id: Je, type: "tool_result", content: we };
    if (s) {
      let yt = buildImageToolResult(n, Je);
      if (yt) {
        let joined = [typeof r === "string" ? r.trim() : "", Me].filter(Boolean).join(`
`);
        if (joined)
          return {
            ...yt,
            content: [...(Array.isArray(yt.content) ? yt.content : []), { type: "text", text: joined }],
          };
        return yt;
      }
    }
    let nt = n;
    if (n) ((nt = n.replace(/^(\s*\n)+/, "")), (nt = nt.trimEnd()));
    if (Ee) {
      let { start: start, end: end } = Ie === !0 ? splitOutputAtMarker(nt) : { start: nt, end: void 0 },
        At = generatePreview(start, end === void 0 ? PREVIEW_SIZE_CHARS : PREVIEW_SIZE_CHARS - Oie);
      nt = buildPersistedOutputMessage({
        filepath: Ee,
        originalSize: Ae ?? 0,
        isJson: !1,
        preview: At.preview,
        hasMore: At.hasMore,
        previewEnd: end,
        truncatedAtBytes: (Ae ?? 0) >= MAX_PERSISTED_OUTPUT_BYTES ? MAX_PERSISTED_OUTPUT_BYTES : void 0,
      });
    }
    let trimmed = r.trim();
    if (e) {
      if (r) trimmed += NEWLINE;
      trimmed += "<error>Command was aborted before completion</error>";
    }
    let Et = "";
    if (h) {
      if (
        ((Et = formatBackgroundTaskMessage({
          backgroundTaskId: h,
          outputPath: y ?? getTaskOutputPath(h),
          backgroundedByUser: S,
          backgroundedToDeliverMessage: w,
          backgroundedByTurnAbort: L,
          timedOutAfterMs: G,
          subagentCapApplied: q,
          noOutputSeenAtTimeout: G !== void 0 && !nt,
          reapedAtFinalResponse: Z,
          wakesItsOwner: Se,
          readToolName: FILE_READ_TOOL_NAME,
        })),
        ke)
      )
        Et += `
${ke}`;
      if (L0e())
        return {
          tool_use_id: Je,
          type: "tool_result",
          content: backgroundTaskNotice(
            h,
            [trimmed, Et].filter(Boolean).join(`
`),
            { backgroundedByUser: S, ending: Z ? "final_response" : void 0 },
          ),
        };
    }
    return {
      tool_use_id: Je,
      type: "tool_result",
      content: [
        nt,
        trimmed,
        Et,
        (Me || We) && !nt && !trimmed && !Et && `(${BASH_TOOL_NAME} completed with no output)`,
        Me,
        We,
        ze,
        lt,
      ].filter(Boolean).join(`
`),
      is_error: e,
    };
  },
  create(e) {
    return {
      async validateInput(n, r) {
        let s = r;
        if (yO() && splitHostField(n).requested !== void 0)
          return { result: !1, message: hostFieldNotForwardedMessage(), errorCode: 11 };
        let h = shouldUseSandbox(n),
          y = sandboxPolicyRefusal(h, n.command, !1, "bash");
        if (y !== null)
          return (
            logFeatureSad("sandbox_exec", "sandbox_policy_refusal", { tool: lit_2("bash") }),
            { result: !1, message: y, errorCode: 14 }
          );
        if (
          !uf() &&
          oie() &&
          s.remoteCall?.constraints.background !== "forbidden" &&
          !n.run_in_background &&
          s.shellWallCapMs === void 0
        ) {
          let G = detectBlockedSleepPattern(n.command);
          if (G !== null)
            return {
              result: !1,
              message: `Blocked: ${G}. To wait for a condition, use Monitor with an until-loop (e.g. \`until <check>; do sleep 2; done\`). To wait for a command you started, use run_in_background: true. Do not chain shorter sleeps to work around this block.`,
              errorCode: 10,
            };
        }
        let S = findDuplicateBackgroundCommand(
          { command: n.command, cwd: getCwd(), agentId: e.agentId, toolUseId: r.toolUseId },
          e.taskRegistry,
        );
        if (S !== void 0 && findToolByName(e.tools, TASKSTOP) !== void 0 && isWoollyToastGateOn())
          return {
            result: !1,
            errorCode: 15,
            message: `Not started: this same command, in this directory, was moved to the background and has been running for ${formatDuration(Date.now() - S.startTime, { mostSignificantOnly: !0 })} (ID: ${S.id}). Its output is being written to: ${S.outputFile}. Let it finish, or, to run it again now, stop it first with ${TASKSTOP}.`,
          };
        let w = n.run_in_background ? s.remoteCall?.backgroundShells?.reserve() : void 0;
        if (w !== void 0) return { result: !1, message: w, errorCode: 12 };
        let L = checkAllowedDomainsInput(n, h);
        if (L !== void 0) return L;
        return (
          (await guardSyncedMemoryRemoval(memoryWatchers.of(e.session.host), () =>
            extractLiteralRmTargets(n.command, getCwd()),
          )) ?? { result: !0 }
        );
      },
      permissionCheckFailureDecision(n, r) {
        let s = makeShellCallContext(e, r);
        return denyCrashedCheckUnderCommandClamp(BASH_TOOL_NAME, s.shellPermission);
      },
      async checkPermissions(n, r) {
        let s = makeShellCallContext(e, r);
        return mergeBashSubcommandVerdicts(
          n,
          s.shellPermission,
          await bashToolHasPermissionTwoPass(n, s.shellPermission, void 0, (h) =>
            mergeBashSubcommandVerdicts(n, s.shellPermission, h, "eachVerdict"),
          ),
          "chosenVerdict",
        );
      },
      async call(n, r) {
        let s = makeShellCallContext(e, r),
          { parentMessage: parentMessage, onProgress: onProgress } = r,
          S = HWr(parentMessage, s.mainLoopModel()),
          w = Math.floor(Date.now() / 1000) * 1000,
          L =
            findDuplicateBackgroundCommand(
              { command: n.command, cwd: getCwd(), agentId: s.agentId, toolUseId: s.toolUseId },
              s.taskRegistry,
            ) !== void 0;
        using begin = s.toolState
          .get(BashRepeatMeter)
          .begin({
            input: n,
            cwd: getCwd(),
            agentId: s.agentId,
            toolUseId: UDe(s.toolUseId) && s.innerCall !== !0 ? s.toolUseId : void 0,
            messages: s.messages(),
            taskRegistry: s.taskRegistry,
            isReadOnly: isReadOnlyCommandOfflineEstimate,
          });
        let q = 0;
        try {
          q = LEt();
        } catch (error) {
          logError(error);
        }
        let { abortController: abortController, emitToolProgress: emitToolProgress } = s,
          outputAccumulator = new EndTruncatingAccumulator(),
          we = "",
          Ee = "",
          Ae,
          commandInterpretation,
          Me = 0,
          interrupted = !1,
          hadSandboxViolation = !1,
          lt,
          execResult;
        await using nt = copyShellOutputFile(s.taskRegistry);
        let pt,
          Et,
          yt,
          isMainThread = !s.agentId,
          At = s.remoteCall?.constraints,
          sandboxRequired = At?.sandbox === "required",
          preventCwdChanges = !isMainThread || At?.pinCwd === !0,
          qt = !s.userTypedShellDispatch && s.innerCall !== !0 && s.remoteCall === void 0,
          Zt = qt && s.inputFromAnotherMachine !== !0,
          rn = Zt ? gDn() : void 0,
          pn,
          userTypedShellDispatch = s.userTypedShellDispatch,
          useSandbox = shouldUseSandbox(n, {
            disableUnsandboxedCommands: sandboxRequired,
            userTypedShellDispatch: userTypedShellDispatch,
          }),
          ho = sandboxPolicyRefusal(
            useSandbox,
            n.command,
            userTypedShellDispatch && n.dangerouslyDisableSandbox === !0,
            "bash",
          );
        if (ho !== null)
          throw (
            logFeatureSad("sandbox_exec", "sandbox_policy_refusal", { tool: lit_2("bash") }),
            new SandboxPolicyRefusalError(ho)
          );
        let isSandboxingEnabled = SandboxManager.isSandboxingEnabled(),
          Kn = getEffectiveFilesystemPolicy();
        if (sandboxRequired) {
          let nr =
            !useSandbox || Kn !== "strict" || isScrubEnabled()
              ? { confined: !1, reason: "sandbox_unconfined" }
              : await ensureDeviceSandboxPosture();
          if (!nr.confined)
            throw (
              logFeatureSad("sandbox_exec", "remote_floor_refusal"),
              new SandboxPolicyRefusalError(
                "This call must run inside a fully confining sandbox and none is available here. The command was not run.",
                nr.reason,
              )
            );
        }
        let sandboxed = useSandbox,
          destructiveCategory = XCe(n.command),
          To = kVt(s.toolUseId),
          bo = isPinnedPromptInSystemPrompt(s),
          vn =
            isBashEditDiffEnabled(s.permissions().mode) &&
            !n.run_in_background &&
            !isReadOnlyBashInput(n, RA(s)),
          co = vn && shouldSkipEditDiff(s.toolState, r.outsideResultReader, PYn()),
          So = co && dYn(n.command),
          ko =
            co && !So && s.toolUseId !== void 0 && isLinux()
              ? (findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd()))
              : null,
          un = ko !== null && startWriteObserver(ko) === "ready" ? ko : null;
        if (un !== null) await zYn(un);
        let ao = un !== null && s.toolUseId !== void 0 && (await startEditRecorder(un));
        if (ao && un && s.toolUseId !== void 0) beginCommandObservation(s.toolUseId, un);
        let now = Date.now(),
          yo = un !== null && !ao && !h5(un),
          now_2 = Date.now(),
          rr =
            co && !So && !ao
              ? yo
                ? "unavailable"
                : ((await takeBashSnapshot(getCwd())) ?? (await takeBashSnapshot(getOriginalCwd())))
              : null,
          br = Date.now() - now_2,
          Hr = rr === "unavailable" ? cW() : rr?.sharesTreeReads === !0,
          Fr = vn
            ? (un ??
              (rr && rr !== "unavailable"
                ? rr.repoRoot
                : (findGitRootRecheckingNegative(getCwd()) ??
                  findGitRootRecheckingNegative(getOriginalCwd()))))
            : null,
          cs = Fr !== null ? registerConcurrentCommand(Fr) : null,
          _r = !1,
          Cr = null,
          Vr,
          Oo = !1;
        try {
          let nr = runShellCommand({
              input: n,
              useSandbox: useSandbox,
              networkLists: takeCommandNetworkLists(s.toolUseId, n.command),
              constraints: At,
              backgroundHeld: () => PCe(s),
              onHeldEnd: () => {
                Oo = !0;
              },
              servedBackground: s.remoteCall?.backgroundShells ?? s.keptBackgroundShells,
              keptStarter: s.keptBackgroundShells,
              onNote: s.remoteCall?.onNote,
              abortController: abortController,
              taskRegistry: s.taskRegistry,
              emitToolProgress: emitToolProgress,
              session: s.session,
              preventCwdChanges: preventCwdChanges,
              isMainThread: isMainThread,
              subagentCapMs: getSubagentForegroundCapMs(s),
              toolUseId: s.toolUseId,
              toolState: s.toolState,
              attributionMessageId: parentMessage?.message.id,
              callTiming: r.timing,
              agentId: s.agentId,
              caller: Vun(s),
              shellWallCapMs: s.shellWallCapMs,
              promptShellPluginId: s.promptShellPluginId,
              agentWorktree: s.agentWorktree,
              isolationRoot: isolationWorktreeFor(s),
              sessionEnvVars: s.sessionEnvVars,
              storageV5: s.storageV5,
              effortLevel: modelSupportsEffort(s.mainLoopModel())
                ? getEffortLevelOrHigh(s.mainLoopModel(), s.effort(), s.effortLayerOverride())
                : void 0,
            }),
            Ti = shouldUseShellTool(s.remoteCall !== void 0, s.hasSpendCap) ? onProgress : void 0,
            Vs;
          do
            if (((Vs = await nr.next()), !Vs.done && Ti)) {
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
          while (!Vs.done);
          if (
            ((execResult = Vs.value),
            execResult.backgroundTaskId !== void 0 &&
              execResult.timedOutAfterMs !== void 0 &&
              s.innerCall !== !0)
          )
            execResult = {
              ...execResult,
              stdout: await readShellOutputSoFar(execResult.backgroundTaskId, PREVIEW_SIZE_CHARS),
            };
          if ((nt.track(execResult), execResult.intercepted)) sandboxed = !1;
          if (
            ((pt = await withSpilledOutputTail(execResult.stdout, execResult.outputFilePath)),
            (Et = classifyBashCommand(n.command)),
            (yt = fromEnumOpt(classifyTestOutcome(Et, pt, execResult))),
            !execResult.backgroundTaskId &&
              trackGitOperations(s.session.host, n.command, execResult.code, pt).prResolved)
          )
            s.markPrResolvedThisSession();
          let _i = unwrapAbortReason(abortController.signal.reason),
            jo = execResult.interrupted && _i === "interrupt",
            Qr = execResult.interrupted && isUserInitiatedAbortReason(_i);
          if (execResult.interrupted && _i === "background") throw new AbortError_2();
          if (
            (outputAccumulator.append((execResult.stdout || "").trimEnd() + NEWLINE),
            (commandInterpretation = DEFAULT_SEMANTIC_2(
              n.command,
              execResult.code,
              execResult.stdout || "",
              "",
            )),
            pt.includes(".git/index.lock': File exists"))
          )
            logEvent("tengu_git_index_lock_error", {});
          if (commandInterpretation.isError && !jo) {
            if (execResult.code !== 0) outputAccumulator.append(`Exit code ${execResult.code}`);
          }
          if (((Ae = xo(s.session).cwd), !preventCwdChanges)) {
            if (resetCwdIfOutsideProject(s.session, s.unlayeredPermissions()) || execResult.cwdChangeRefused)
              we = stdErrAppendShellResetMessage("");
          }
          let fi = execResult.stdout || "",
            Ri = sandboxed
              ? SandboxManager.annotateStderrWithSandboxFailures(s.toolUseId ?? n.command, fi)
              : fi;
          if (((hadSandboxViolation = Ri !== fi), sandboxed && execResult.backgroundTaskId === void 0))
            lt = OWr(s.toolUseId ?? n.command);
          if (hadSandboxViolation) Ee = Ri.slice(fi.length).trim();
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
            throw execResult.preSpawnErrorCode === "e2big" ? tagObject(Kr, { kind: "spawn_arg_limit" }) : Kr;
          }
          if (Zt && execResult.backgroundTaskId === void 0 && !execResult.intercepted)
            pn = maybeShowBashNote(rn, s.toolState.get(Dmt));
          let Ja =
            execResult.interrupted || execResult.timedOut === !0 || execResult.timedOutAfterMs !== void 0;
          if (sandboxed && s.remoteCall !== void 0 && (hadSandboxViolation || !Ja))
            s.remoteCall.onNote(
              buildSandboxFailureHint({
                command: n.command,
                output: pt + Ee,
                failed: commandInterpretation.isError && !Ja,
                violationRecorded: hadSandboxViolation,
                filesystemPolicy: Kn,
                additionalDenyRead: () => At?.additionalDenyRead ?? [],
              }),
            );
          if (commandInterpretation.isError && !jo) {
            let Kr =
                qt &&
                !execResult.interrupted &&
                execResult.outputFilePath !== void 0 &&
                !ywt(trimBlankEdgeLines(fi)) &&
                $Vn()
                  ? await buildLargeOutputMessage(execResult, fi, s.session, s.storageV5)
                  : void 0,
              Li =
                qt &&
                !execResult.interrupted &&
                execResult.timedOut !== !0 &&
                execResult.backgroundTaskId === void 0
                  ? matchBashNoteRule(n.command, execResult.shellUsage, !0, s.toolState.get(tLe))
                  : void 0;
            logEvent("tengu_bash_tool_command_failed", {
              model: S,
              command_type: getCommandTypeForLogging(n.command),
              ...Et,
              stdout_length: fi.length,
              stderr_length: 0,
              exit_code: execResult.code,
              interrupted: execResult.interrupted,
              output_end_shown: Kr !== void 0,
              triggered_note_rule: Li?.rule ?? 0,
              triggered_note_shown: Li?.note !== void 0,
              oom_kill_during_command: pn?.hit === !0,
              oom_kill_note_shown: pn?.note !== void 0,
              ...buildCommandTimingFields(execResult.shellUsage),
              zsh_note_in_prompt: bo,
              executor_shell: await getExecutorShellForAnalytics(),
              executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL),
              ...detectShellDialectIssues(n.command, pt),
              bash_test_outcome: yt,
              sandboxed: sandboxed,
              sandbox_enabled: isSandboxingEnabled,
              dangerously_disable_sandbox: n.dangerouslyDisableSandbox ?? !1,
              user_typed_shell_dispatch: userTypedShellDispatch,
              filesystem_policy: fromEnum(Kn),
              call_origin: fromEnum(At ? "remote" : "local"),
              ...getExtraCommandLogFields(n),
              had_sandbox_violation: sandboxed && hadSandboxViolation,
              same_as_running_background: L,
              tool_use_id: To,
              destructive_category: fromEnum(destructiveCategory ?? "none"),
              destructive_target_scope: fromEnum(
                classifyDestructiveTargetScope(n.command, getCwd(), destructiveCategory),
              ),
              git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, destructiveCategory)),
              permission_mode: fromEnum(s.permissions().mode),
              ...begin.ended(execResult, !0, !1),
              reads_own_output: classifySavedOutputPath(n.command, s.session),
            });
            let Qs;
            try {
              Qs = describeAgentProxyFailures(q);
            } catch (error) {
              logError(error);
            }
            throw new ShellError({
              stdout: "",
              stderr: [Qs, Oo ? ENDED_INSTEAD_OF_BACKGROUND_MESSAGE : void 0, pn?.note, Li?.note].reduce(
                (Hi, Xa) => (Xa === void 0 ? Hi : `${Hi.trimEnd()}${NEWLINE}${NEWLINE}${Xa}`),
                Kr === void 0 ? Ri : Kr + Ee,
              ),
              code: execResult.code,
              interrupted: Qr,
              hadSandboxViolation: hadSandboxViolation,
              sandboxViolations: lt,
              sandboxed: sandboxed,
            });
          }
          ((interrupted = execResult.interrupted),
            (Cr =
              ao && un && s.toolUseId
                ? await collectWatchedEditDiff(
                    un,
                    s.toolUseId,
                    Boolean(execResult.backgroundTaskId),
                    interrupted,
                    s.readFileState,
                    now,
                  )
                : null));
          let now_2 = Date.now(),
            yr = () => {
              if (cs && Fr !== null) fmt(Fr, cs);
            };
          ((Vr =
            !execResult.backgroundTaskId && !So && !Cr && rr && rr !== "unavailable" && !interrupted
              ? await diffAfterCommand(
                  rr,
                  yr,
                  rr.sharesTreeReads &&
                    getAutoModeClassifierRole(s.permissions().mode, { peek: !0 }) !== "off"
                    ? { signal: abortController.signal, onReadFailed: yr }
                    : void 0,
                )
              : void 0),
            (br += Date.now() - now_2));
        } catch (error) {
          if (ao && s.toolUseId !== void 0) {
            let Ti = await endCommandObservation(s.toolUseId);
            if (un && (Ti === null || Ti.paths.length > 0 || Ti.overflow || Ti.watchEnds)) dS(un);
          }
          throw error;
        } finally {
          if (cs && Fr !== null) _r = fmt(Fr, cs);
          if (rr && !yo) logEditDiffWait(br, Hr);
          if (rr && rr !== "unavailable" && Vr !== null) dS(rr.repoRoot);
          if (vn && !co && Fr !== null) dS(Fr);
          if (So) {
            let nr =
              findGitRootRecheckingNegative(getCwd()) ?? findGitRootRecheckingNegative(getOriginalCwd());
            if (nr !== null) dS(nr);
          }
          if (s.toolUseId) emitToolProgress?.({ kind: "clear", toolUseId: s.toolUseId });
          if (!isReadOnlyBashInput(n, RA(s)))
            (s.applyFileHistoryOp({ kind: "touch" }), (begin.mayHaveWritten = !0));
        }
        let str = outputAccumulator.toString(),
          persistedOutput = await persistBashOutput(execResult, s.session, s.storageV5, nt),
          Io = persistedOutput?.path,
          zo = persistedOutput?.size,
          rs =
            persistedOutput !== void 0 && Zt && !interrupted && !ywt(trimBlankEdgeLines(str)) && FVn()
              ? await readOutputTail(execResult, str, PREVIEW_SIZE_CHARS - Oie, Oie, !0)
              : void 0,
          Es =
            Zt && !interrupted && execResult.backgroundTaskId === void 0 && !ywt(trimBlankEdgeLines(str))
              ? matchBashNoteRule(n.command, execResult.shellUsage, !1, s.toolState.get(tLe))
              : void 0;
        logEvent("tengu_bash_tool_command_executed", {
          model: S,
          command_type: getCommandTypeForLogging(n.command),
          ...Et,
          stdout_length: str.length,
          stderr_length: 0,
          exit_code: execResult.code,
          interrupted: interrupted,
          output_end_shown: rs !== void 0,
          triggered_note_rule: Es?.rule ?? 0,
          triggered_note_shown: Es?.note !== void 0,
          oom_kill_during_command: pn?.hit === !0,
          oom_kill_note_shown: pn?.note !== void 0,
          ...buildCommandTimingFields(execResult.shellUsage),
          zsh_note_in_prompt: bo,
          executor_shell: await getExecutorShellForAnalytics(),
          executor_shell_overridden: Boolean(process.env.CLAUDE_CODE_SHELL),
          ...detectShellDialectIssues(n.command, pt),
          bash_test_outcome: yt,
          sandboxed: sandboxed,
          sandbox_enabled: isSandboxingEnabled,
          dangerously_disable_sandbox: n.dangerouslyDisableSandbox ?? !1,
          user_typed_shell_dispatch: userTypedShellDispatch,
          filesystem_policy: fromEnum(Kn),
          call_origin: fromEnum(At ? "remote" : "local"),
          ...getExtraCommandLogFields(n),
          had_sandbox_violation: sandboxed && hadSandboxViolation,
          was_backgrounded: Boolean(execResult.backgroundTaskId),
          same_as_running_background: L,
          tool_use_id: To,
          destructive_category: fromEnum(destructiveCategory ?? "none"),
          destructive_target_scope: fromEnum(
            classifyDestructiveTargetScope(n.command, getCwd(), destructiveCategory),
          ),
          git_destructive_target: fromEnum(classifyGitDestructiveTarget(n.command, destructiveCategory)),
          permission_mode: fromEnum(s.permissions().mode),
          ...begin.ended(execResult, !1, Io !== void 0),
          reads_own_output: classifySavedOutputPath(n.command, s.session),
        });
        let Nr = detectCodeIndexingFromCommand(n.command);
        if (Nr)
          logEvent("tengu_code_indexing_tool_used", {
            tool: fromEnum(Nr),
            source: lit_2("cli"),
            success: execResult.code === 0,
          });
        let Is = trimBlankEdgeLines(str);
        Is = consumeClaudeCodeHints(Is, {
          command: n.command,
          pendingHint: s.session.pendingHint,
          isMainThread: isMainThread,
          surface: "shell",
        });
        let fs = execResult.timedOutAfterMs === void 0 && ywt(Is),
          as = Is;
        if (fs) {
          let nr = await resizeShellImageOutput(
            Is,
            execResult.outputFilePath,
            zo,
            imageLimitsForModel(s.mainLoopModel()),
          );
          if (nr) as = nr;
          else fs = !1;
        }
        let ghRateLimitHint = execResult.backgroundTaskId
            ? void 0
            : GITHUB_RATE_LIMIT_REMINDER(n.command, pt, s.toolState.get(Xqo)),
          ji =
            execResult.backgroundTaskId && commandHasAnyCd(n.command)
              ? formatBackgroundCwdHint(getCwd())
              : void 0,
          Wi =
            execResult.backgroundTaskId !== void 0 &&
            (reapsShellsOnExit(s.agentContext) || (s.agentId === void 0 && Okt()))
              ? !0
              : void 0,
          gitOperation;
        if (!execResult.backgroundTaskId) {
          let nr = detectGitOperation(n.command, pt);
          if (Object.keys(nr).length > 0) gitOperation = nr;
          if (!s.remoteCall)
            emitVcsStateChanges(nr, pt, { command: n.command, exitCode: execResult.code, cwd: Ae });
        }
        let staleReadFileStateHint;
        if (!interrupted && !fs && !execResult.backgroundTaskId) {
          let nr = await findStaleReadFileStateEntries(n.command, s.readFileState, w);
          if (nr.length > 0) {
            let Ti = getCwd(),
              Vs = 5,
              joined = nr
                .slice(0, 5)
                .map((fi) => relative_2(Ti, fi) || fi)
                .join(", "),
              jo = nr.length > 5 ? ` and ${nr.length - 5} more` : "",
              Qr = Bri(FILE_READ_TOOL_NAME, s.tools);
            staleReadFileStateHint = `[This command modified ${nr.length} ${plural(nr.length, "file")} you've previously read: ${joined}${jo}. Call ${Qr} before editing.]`;
          }
        }
        let hr = execResult.backgroundTaskId
            ? void 0
            : So
              ? { files: [], moreFiles: 0, skipped: !0 }
              : Cr
                ? (Cr.diff ?? void 0)
                : rr === "unavailable"
                  ? { files: [], moreFiles: 0, unavailable: !0 }
                  : rr && interrupted
                    ? void 0
                    : rr
                      ? (Vr ?? (_r ? { files: [], moreFiles: 0, shared: !0 } : void 0))
                      : void 0,
          bashEditDiff = hr && _r && !hr.skipped ? { ...hr, shared: !0 } : hr;
        if (
          (begin.sawEditDiff(bashEditDiff, !execResult.backgroundTaskId && (Cr !== null || Vr !== void 0)),
          bashEditDiff?.unavailable)
        )
          logFeatureSad(
            Hr ? "bash_edit_diff_shared" : "bash_edit_diff",
            interrupted ? "interrupted" : "unavailable",
          );
        else if (bashEditDiff && !bashEditDiff.skipped)
          logFeatureOk(Hr ? "bash_edit_diff_shared" : "bash_edit_diff");
        if (!interrupted && !fs && !execResult.backgroundTaskId) {
          let reduced = [we, Ee, pn?.note, Es?.note, staleReadFileStateHint, ghRateLimitHint].reduce(
              (Vs, _i) => Vs + (_i ? _i.length + NEWLINE.length : 0),
              0,
            ),
            Ti =
              Io !== void 0 ||
              str.length > getMaxOutputLength() ||
              s.innerCall === !0 ||
              as.length + reduced > getPersistenceThreshold(BASH_TOOL_NAME, $rt(), Sdt);
          await recordShellFileReadsInReadState(
            n.command,
            s.readFileState,
            abortController.signal,
            execResult.code,
            Ti ? void 0 : as,
            s.remoteCall === void 0 && s.nestedMemoryAttachmentTriggers
              ? { triggers: s.nestedMemoryAttachmentTriggers, permissions: s.permissions }
              : void 0,
          );
        }
        let Ha = rs !== void 0 && !fs && as !== "",
          resultData = {
            stdout: Ha ? HVn(as, rs) : as,
            stderr: Ee ? [we, Ee].filter(Boolean).join(NEWLINE) : we,
            interrupted: interrupted,
            isImage: fs,
            returnCodeInterpretation: commandInterpretation?.message,
            noOutputExpected: isSilentBashCommand(n.command),
            backgroundTaskId: execResult.backgroundTaskId,
            ...(execResult.backgroundTaskId !== void 0 &&
              s.keptBackgroundShells !== void 0 && {
                backgroundOutputPath: getTaskOutputPath(execResult.backgroundTaskId),
              }),
            backgroundedByUser: execResult.backgroundedByUser,
            backgroundedByTurnAbort: execResult.backgroundedByTurnAbort,
            backgroundedToDeliverMessage: execResult.backgroundedToDeliverMessage,
            timedOutAfterMs: execResult.timedOutAfterMs,
            subagentCapApplied: execResult.subagentCapApplied,
            backgroundEndsWithFinalResponse: Wi,
            backgroundCwdHint: ji,
            dangerouslyDisableSandbox:
              "dangerouslyDisableSandbox" in n ? n.dangerouslyDisableSandbox : void 0,
            persistedOutputPath: Io,
            persistedOutputSize: zo,
            ...(Ha && { stdoutHoldsOutputEnd: Ha }),
            memoryLimitNote: pn?.note,
            triggeredNote: Es?.note,
            staleReadFileStateHint: staleReadFileStateHint,
            ghRateLimitHint: ghRateLimitHint,
            gitOperation: gitOperation,
            bashEditDiff: bashEditDiff,
          };
        if (resultData.backgroundTaskId !== void 0 && L0e())
          logEvent("tengu_bash_task_ack", {
            trigger: resultData.backgroundedByUser
              ? lit_2("user")
              : resultData.backgroundedByTurnAbort
                ? lit_2("turn_abort")
                : resultData.backgroundedToDeliverMessage
                  ? lit_2("deliver_message")
                  : resultData.timedOutAfterMs !== void 0
                    ? lit_2("timeout")
                    : lit_2("explicit"),
            ends_with_final_response: resultData.backgroundEndsWithFinalResponse === !0,
            shell: lit_2("bash"),
          });
        return {
          data: resultData,
          ...(lt !== void 0 && { sandboxViolations: lt }),
          sandboxed: sandboxed,
          ...(hadSandboxViolation && !interrupted && { remedy: { kind: "sandbox_violation" } }),
        };
      },
    };
  },
});
/**
 * 执行一条 Bash 命令的异步生成器：计算超时（前台/后台上限、子代理上限、远程约束），处理显式 run_in_background、超时自动转后台、用户 Ctrl+B / 回合中断转后台；2 秒后开始产出进度并登记为前台任务；返回执行结果或后台任务 id。
 */
//@ chunk-e6aww6q8.js:4848828-4854744 fingerprint = runShellCommand (0.466)
async function* runShellCommand({
  input: input,
  useSandbox: useSandbox,
  networkLists: networkLists,
  constraints: constraints,
  backgroundHeld: backgroundHeld,
  onHeldEnd: onHeldEnd,
  servedBackground: servedBackground,
  keptStarter: keptStarter,
  onNote: onNote,
  abortController: abortController,
  taskRegistry: taskRegistry,
  emitToolProgress: emitToolProgress,
  session: session,
  preventCwdChanges: preventCwdChanges,
  isMainThread: isMainThread,
  subagentCapMs: subagentCapMs,
  toolUseId: toolUseId,
  attributionMessageId: attributionMessageId,
  callTiming: callTiming,
  agentId: agentId,
  caller: caller,
  shellWallCapMs: shellWallCapMs,
  promptShellPluginId: promptShellPluginId,
  agentWorktree: agentWorktree,
  isolationRoot: isolationRoot,
  sessionEnvVars: sessionEnvVars,
  effortLevel: effortLevel,
  storageV5: storageV5,
  toolState: toolState,
}) {
  let {
      command: command,
      description: description,
      timeout: timeout,
      run_in_background: run_in_background,
    } = input,
    backgroundForbidden = uf() || constraints?.background === "forbidden" || backgroundHeld?.() === !0,
    runInBackground =
      run_in_background === !0 &&
      (servedBackground === void 0
        ? !backgroundForbidden
        : !isBackgroundTasksDisabled() && backgroundHeld?.() !== !0),
    keptShellStarter =
      run_in_background !== !0 && !isBackgroundTasksDisabled() && backgroundHeld?.() !== !0
        ? keptStarter
        : void 0,
    reserveError = runInBackground ? servedBackground?.reserve() : void 0;
  if (reserveError !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reserveError,
      "served call has no background slot",
    );
  let maxTimeoutMs =
    shellWallCapMs !== void 0
      ? Math.min(timeout || mB(), shellWallCapMs, constraints?.maxTimeoutMs ?? 1 / 0)
      : Math.min(timeout || hJ(), runInBackground ? Ixe() : mB(), constraints?.maxTimeoutMs ?? 1 / 0);
  if (timeout && maxTimeoutMs < timeout)
    onNote?.({ key: "timeout_clamped", requestedMs: timeout, appliedMs: maxTimeoutMs });
  let yn = claimViolationReport(BASH_TOOL_NAME, command, toolState, { useSandbox: useSandbox }),
    fullOutput = "",
    lastProgressOutput = "",
    fo = 0,
    To = 0,
    backgroundTaskId = void 0,
    timedOutAfterMs = void 0,
    moveReason = void 0,
    resolveProgress = null;
  function createProgressSignal() {
    return new Promise((resolve) => {
      resolveProgress = () => resolve(null);
    });
  }
  let shellCommand, shouldAutoBackground, turnAbortBackgrounds, effectiveTimeoutMs;
  try {
    ((shouldAutoBackground =
      (!backgroundForbidden || keptShellStarter !== void 0) && isAutobackgroundingAllowed(command)),
      (turnAbortBackgrounds = !backgroundForbidden),
      (effectiveTimeoutMs = effectiveShellTimeoutMs({
        requestedTimeoutMs: maxTimeoutMs,
        isMainAgent: isMainThread === !0,
        canAutoBackground: shouldAutoBackground && keptShellStarter === void 0,
        subagentCapMs: runInBackground ? 0 : subagentCapMs,
      })),
      (shellCommand = await exec(command, abortController.signal, "bash", {
        timeout: effectiveTimeoutMs,
        owningAgentId: agentId,
        caller: caller,
        turnAbortBackgrounds: turnAbortBackgrounds,
        onProgress(zo, rs, Es, Nr, Is) {
          ((lastProgressOutput = zo), (fullOutput = rs), (fo = Es), (To = Is ? Nr : 0));
          let fs = resolveProgress;
          if (fs) ((resolveProgress = null), fs());
        },
        session: session,
        preventCwdChanges: preventCwdChanges,
        ...(constraints?.scrubCredentialEnv && { scrubCredentialEnv: !0 }),
        ...(constraints?.sandbox === "required" && { requireConfiningSandbox: !0 }),
        sandboxDenyRead: constraints?.additionalDenyRead,
        sandboxDenyWrite: constraints?.additionalDenyWrite,
        shouldUseSandbox: useSandbox,
        sandboxAttributionId: toolUseId,
        sandboxNetworkLists: networkLists,
        attributionMessageId: attributionMessageId,
        callTiming: callTiming,
        shouldAutoBackground: shouldAutoBackground,
        agentWorktree: agentWorktree,
        isolationRoot: isolationRoot,
        sessionEnvVars: sessionEnvVars,
        effortLevel: effortLevel,
        storageV5: storageV5,
        ...(VSn(promptShellPluginId) && { bunOptionsFor: (zo) => bunOptionsGuard(promptShellPluginId, zo) }),
      })));
  } catch (error) {
    throw (yn?.(), error);
  }
  let subagentCapApplied = isMainThread !== !0 && effectiveTimeoutMs < maxTimeoutMs ? !0 : void 0;
  if (shellCommand.status === "killed") yn?.();
  let resultPromise = shellCommand.result;
  if (toolUseId !== void 0)
    resultPromise
      .then((zo) => {
        if (zo.leftRunningPgid !== void 0) OEt.noteCommandLeftProcesses(zo.leftRunningPgid, toolUseId);
      })
      .catch(() => {});
  if (yn)
    resultPromise
      .then((zo) => {
        if (zo.preSpawnError) yn();
      })
      .catch(() => {});
  async function startBackgrounding(eventName, backgroundFn) {
    return (
      await backgroundShellCommand(
        {
          command: command,
          shell: "bash",
          description: description || command,
          shellCommand: shellCommand,
          toolUseId: toolUseId,
          agentId: agentId,
          timeout: backgroundFn,
          backgroundTrigger: eventName,
        },
        { abortController: abortController, taskRegistry: taskRegistry },
      )
    ).taskId;
  }
  function moveToBackground(zo, rs, Es, Nr, Is) {
    if (backgroundHeld?.() === !0) {
      (onHeldEnd?.(), shellCommand.kill());
      return;
    }
    if (keptShellStarter !== void 0) {
      if (shellCommand.status !== "running") return;
      try {
        ((backgroundTaskId = keptShellStarter.adopt(shellCommand, void 0, command, Is)), (moveReason = Is));
      } catch (error) {
        (logError(toError(error)), shellCommand.kill());
        return;
      }
      Vr?.();
      let fs = resolveProgress;
      if (fs) ((resolveProgress = null), fs());
      logEvent(zo, { command_type: getCommandTypeForLogging(command), ...Nr });
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
          void 0,
          rs,
        )
      )
        return;
      ((backgroundTaskId = foregroundTaskId),
        logEvent(zo, { command_type: getCommandTypeForLogging(command), ...Nr }),
        Es?.(foregroundTaskId));
      return;
    }
    startBackgrounding(rs).then((shellId) => {
      backgroundTaskId = shellId;
      let as = resolveProgress;
      if (as) ((resolveProgress = null), as());
      if ((logEvent(zo, { command_type: getCommandTypeForLogging(command), ...Nr }), Es)) Es(shellId);
    });
  }
  let Fr = keptShellStarter?.listMove?.((backgroundFn) => {
    if (backgroundHeld?.() === !0) return !1;
    return (
      moveToBackground(
        "tengu_bash_command_moved_on_request",
        backgroundFn === "person" ? "user" : "deliver_message",
        void 0,
        void 0,
        backgroundFn,
      ),
      backgroundTaskId !== void 0
    );
  });
  if (Fr !== void 0) shellCommand.result.then(Fr, Fr);
  if (shellCommand.onTimeout && shouldAutoBackground)
    shellCommand.onTimeout((zo) => {
      ((timedOutAfterMs = effectiveTimeoutMs),
        moveToBackground("tengu_bash_command_timeout_backgrounded", "timeout", zo, {
          timeout_ms: effectiveTimeoutMs,
          requested_timeout_ms: EVt(timeout, maxTimeoutMs) ?? 0,
          subagent_cap_applied: subagentCapApplied === !0,
        }));
    });
  if (runInBackground && shellCommand.status !== "killed") {
    if (shellCommand.status === "completed") {
      let Es = await resultPromise;
      if (Es.preSpawnError) return Es;
      if (servedBackground !== void 0) return (shellCommand.cleanup(), Es);
    }
    let zo = EVt(timeout, maxTimeoutMs),
      rs =
        servedBackground === void 0
          ? await startBackgrounding("explicit", zo)
          : servedBackground.adopt(shellCommand, zo, command);
    return (
      logEvent("tengu_bash_command_explicitly_backgrounded", {
        command_type: getCommandTypeForLogging(command),
        timeout_ms: zo ?? 0,
      }),
      { stdout: "", stderr: "", code: 0, interrupted: !1, backgroundTaskId: rs }
    );
  }
  let startTime = Date.now(),
    foregroundTaskId = void 0,
    turnAborted = !1,
    Vr = null,
    isTurnAbortPending = () => abortController.signal.aborted && z6n(abortController.signal.reason, caller),
    jr = () => {
      if (!isTurnAbortPending()) return;
      Vr?.();
      let zo = resolveProgress;
      if (zo) ((resolveProgress = null), zo());
    };
  using Or = onAbortDisposable(abortController.signal, jr);
  {
    let initialResult = await Promise.race([
      resultPromise,
      new Promise((resolve) => {
        setTimeout((Nr) => Nr(null), PROGRESS_THRESHOLD_MS, resolve).unref();
      }),
      new Promise((rs) => {
        if (isTurnAbortPending()) rs(null);
        else Vr = () => rs(null);
      }),
    ]);
    if (initialResult !== null)
      return (shellCommand.cleanup(), stripShellUsageUnlessBackgrounded(initialResult));
    if (backgroundTaskId)
      return {
        stdout: "",
        stderr: "",
        code: 0,
        interrupted: !1,
        backgroundTaskId: backgroundTaskId,
        ...backgroundReasonToFlags(moveReason),
        timedOutAfterMs: timedOutAfterMs,
        subagentCapApplied: subagentCapApplied,
      };
  }
  TaskOutput.startPolling(shellCommand.taskOutput.taskId);
  let finalResult = null;
  try {
    while (!0) {
      let zo;
      if (!turnAborted && isTurnAbortPending()) zo = Promise.resolve(null);
      else zo = createProgressSignal();
      let result = await Promise.race([resultPromise, zo]);
      if (result !== null) {
        if (((finalResult = result), result.backgroundTaskId !== void 0)) {
          if (markTaskNotified(result.backgroundTaskId, result, taskRegistry))
            emitTaskNotification(result.backgroundTaskId, fhn(result, { command: command, shell: "bash" }), {
              toolUseId: toolUseId,
              summary: description || command,
            });
          let fixedResult = { ...stripShellUsageUnlessBackgrounded(result), backgroundTaskId: void 0 },
            { taskOutput: taskOutput } = shellCommand;
          if (taskOutput.stdoutToFile && !taskOutput.outputFileRedundant)
            ((fixedResult.outputFilePath = taskOutput.path),
              (fixedResult.outputFileSize = taskOutput.outputFileSize),
              (fixedResult.outputTaskId = taskOutput.taskId));
          return fixedResult;
        }
        return result;
      }
      if (backgroundTaskId)
        return {
          stdout: turnAborted ? fullOutput : "",
          stderr: "",
          code: 0,
          interrupted: !1,
          backgroundTaskId: backgroundTaskId,
          ...(turnAborted && { backgroundedByTurnAbort: !0 }),
          ...backgroundReasonToFlags(moveReason),
          timedOutAfterMs: timedOutAfterMs,
          subagentCapApplied: subagentCapApplied,
        };
      if (!turnAborted && isTurnAbortPending()) {
        if (((turnAborted = !0), turnAbortBackgrounds)) {
          if (
            (moveToBackground("tengu_bash_command_turn_abort_backgrounded", "turn_abort"), backgroundTaskId)
          )
            return {
              stdout: fullOutput,
              stderr: "",
              code: 0,
              interrupted: !1,
              backgroundTaskId: backgroundTaskId,
              backgroundedByTurnAbort: !0,
              timedOutAfterMs: timedOutAfterMs,
              subagentCapApplied: subagentCapApplied,
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
            interrupted: !1,
            backgroundTaskId: foregroundTaskId,
            ...(wasBackgroundedToDeliverMessage(foregroundTaskId, taskRegistry)
              ? { backgroundedToDeliverMessage: !0 }
              : { backgroundedByUser: !0 }),
          };
      }
      let elapsed = Date.now() - startTime,
        elapsedSeconds = Math.floor(elapsed / 1000);
      if (
        !backgroundForbidden &&
        !turnAborted &&
        backgroundTaskId === void 0 &&
        elapsedSeconds >= PROGRESS_THRESHOLD_MS / 1000
      ) {
        if (!foregroundTaskId)
          foregroundTaskId = registerForeground(
            {
              command: command,
              shell: "bash",
              description: description || command,
              shellCommand: shellCommand,
              agentId: agentId,
              caller: caller,
              autoBackgroundArmed: shouldAutoBackground,
            },
            taskRegistry,
            toolUseId,
          );
        if (toolUseId) emitToolProgress?.({ kind: "background_hint", toolUseId: toolUseId });
      }
      yield {
        type: "progress",
        fullOutput: fullOutput,
        output: lastProgressOutput,
        elapsedTimeSeconds: elapsedSeconds,
        totalLines: fo,
        totalBytes: To,
        taskId: shellCommand.taskOutput.taskId,
        ...(timeout ? { timeoutMs: effectiveTimeoutMs } : void 0),
      };
    }
  } finally {
    if (
      (TaskOutput.stopPolling(shellCommand.taskOutput.taskId),
      !backgroundTaskId && shellCommand.status !== "backgrounded")
    ) {
      if (foregroundTaskId)
        unregisterForeground(
          foregroundTaskId,
          finalResult ? fhn(finalResult, { command: command, shell: "bash" }) : "stopped",
          taskRegistry,
        );
      shellCommand.cleanup();
    }
  }
}
/**
 * 根据文件监视记录生成本次命令的编辑 diff（bashEditDiff）；后台化或中断时标记 unavailable 并停止监视。
 */
//@ chunk-e6aww6q8.js:4854744-4855075 sole-consumer
async function collectWatchedEditDiff(e, n, r, s, h, y) {
  let S = { diff: { files: [], moreFiles: 0, unavailable: !0 } };
  if (r) return (IYn(n), dS(e), S);
  let w = await endCommandObservation(n);
  if (w === null) return (dS(e), S);
  if (s) {
    if (w.paths.length === 0 && !w.overflow && !w.watchEnds) return { diff: null };
    return (dS(e), S);
  }
  let L = await VYn(e, w.paths, w.overflow, h, y, w.shared);
  if (w.watchEnds) dS(e);
  return { diff: L };
}

export {
  BashTool,
  BUr,
  omitUnsandboxedFields,
  READ_BLOCK_EXEMPT_COMMANDS,
  COMMON_BACKGROUND_COMMANDS,
  gRs,
  hRs,
  pRs,
  mRs,
  IRs,
  extractReadOnlyFileReads,
};
