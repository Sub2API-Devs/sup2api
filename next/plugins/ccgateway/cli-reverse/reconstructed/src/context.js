/**
 * context.ts
 *
 * 会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context.ts
 * pieces: chunk-5xgkngpb.js (25)
 * attribution: sole-consumer 1, affinity 1, fingerprint 3, placement 13, layout 7
 */
import { IGNORE_SUBMODULES_DIRTY_FLAG } from "./utils/git/gitSafeEnv.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { getIsGit, findGitRoot, gitExe, getBranch, getDefaultBranch } from "./utils/git.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "./services/analytics/featureTelemetry.js";
import { hasOutermostCallFrame, getCwd } from "./utils/cwd.js";
import { isRemoteSessionAvailable } from "./remote/remoteMode.js";
import {
  getOriginalCwdOrNull,
  getIsRemoteMode,
  setCachedClaudeMdContent,
  onMemoryPauseChange,
  onAutoMemorySessionSwitchChange,
} from "./bootstrap/state.js";
import { resolveGitDirs } from "./utils/git/gitDirResolution.js";
import { buildFilterNeutralizingArgs } from "./utils/git/gitConfigFilters.js";
import { getRemoteHostSessionCount } from "./commands/insights.js";
import { execFileNoThrow } from "./utils/execFileNoThrow.js";
import { primeRulesForCritique, clearAgentAnswers } from "./utils/agentContext.js";
import { readGitHead } from "./utils/git/gitFilesystem.js";
import { isBashAvailable } from "./utils/shell/shellToolUtils.js";
import { BASH_TOOL_NAME } from "./tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "./tools/PowerShellTool/toolName.js";
import { logForDebugging } from "./utils/debug.js";
import { errorMessage } from "./utils/errors.js";
import { SessionRootSlot } from "./bootstrap/sessionSlices.js";
import { env } from "./utils/env.js";
import { shouldIncludeGitInstructions } from "./utils/gitSettings.js";
import { logError } from "./utils/log.js";
import { isEnvTruthy } from "./utils/envUtils.js";
import { noteUserContextBuild } from "./utils/startupTiming.js";
import { logEvent } from "./services/analytics/index.js";
import { setMarkdownLexer, getMemoryFilesCached, includedMemoryFiles } from "./utils/claudemd.js";
import {
  formatMemoryInstruction,
  toPluginInstructionFile,
  sameInstructionFiles,
  excludeInstructionFiles,
  fromPluginInstructionFiles,
} from "./plugins/functionHooks/sites/promptContextSites.js";
import { isClaudeMdLoadingDisabled } from "./utils/settings/customizationDisabled.js";
import { filterAutoMemWhenDisabled } from "./components/memory/MemoryFileSelector.js";
import { getEmail } from "./utils/user.js";
import { sessionDateCell } from "./utils/sessionTimeZone.js";
import { resolvePromptContext } from "./plugins/functionHooks/promptComposition.js";
import { reason } from "./utils/contextAttachments/sessionContext.js";
import { clearMemoryFilesCache } from "./components/Message.js";
import { deferInit } from "../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1352553-1352616 sole-consumer
/**
 * 2000：git status 输出超过此长度截断；tqo 为 git status 参数（--no-optional-locks status --short）。
 */
var MAX_GIT_STATUS_CHARS = 2000;
var GIT_STATUS_ARGS = ["--no-optional-locks", "status", "--short", IGNORE_SUBMODULES_DIRTY_FLAG];
//@ chunk-5xgkngpb.js:1352616-1352652 affinity
/**
 * getGitStatus 的转调。
 */
async function computeGitStatus(session) {
  return getGitStatus(session);
}
//@ chunk-5xgkngpb.js:1352652-1354869 fingerprint (2.1.88 match: getGitStatus, 0.787)
/**
 * 生成 gitStatus 文本："This is the git status at the start of the conversation…"、当前分支、主分支、Git user、Status（截断 2000 字）、Recent commits；非 git 仓库返回 null；worktree 时对比主检出。
 */
async function getGitStatus(session) {
  let id = session.id;
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "git_status_started");
  let isGitStart = Date.now();
  let isGit = await getIsGit();
  logForDiagnosticsNoPII("info", "git_is_git_check_completed", {
    duration_ms: Date.now() - isGitStart,
    is_git: isGit,
  });
  if (!isGit) {
    logForDiagnosticsNoPII("info", "git_status_skipped_not_git", {
      duration_ms: Date.now() - startTime,
    });
    logFeatureOk("context_git_detect");
    return null;
  }
  try {
    let gitCmdsStart = Date.now();
    let pinnedContext = null;
    if (hasOutermostCallFrame() && !isRemoteSessionAvailable()) {
      let cwd = getCwd();
      let gitRoot = findGitRoot(cwd);
      if (gitRoot === null) {
        logForDiagnosticsNoPII("info", "git_status_skipped_not_git", {
          duration_ms: Date.now() - startTime,
        });
        logFeatureOk("context_git_detect");
        return null;
      }
      let originalCwdOrNull = getOriginalCwdOrNull();
      let originalGitRoot = originalCwdOrNull === null ? null : findGitRoot(originalCwdOrNull);
      let originalGitDirs = originalGitRoot === null ? null : resolveGitDirs(originalGitRoot);
      let gitDirs = resolveGitDirs(gitRoot);
      if (
        originalGitDirs !== null &&
        gitDirs !== null &&
        gitDirs.workTree !== null &&
        gitDirs.gitDir !== gitDirs.commonDir &&
        gitDirs.commonDir === originalGitDirs.commonDir &&
        gitDirs.gitDir !== originalGitDirs.gitDir
      ) {
        let filterNeutralizingArgs = await buildFilterNeutralizingArgs(gitDirs.workTree, {
          pin: gitDirs,
        });
        if (filterNeutralizingArgs.ok)
          pinnedContext = {
            cwd,
            pin: gitDirs,
            filterDriversOff: filterNeutralizingArgs.args,
          };
      }
    }
    let execOptions =
      pinnedContext === null
        ? {
            preserveOutputOnError: false,
            env: getRemoteHostSessionCount(undefined, {
              userLocale: true,
            }),
          }
        : {
            cwd: pinnedContext.cwd,
            preserveOutputOnError: false,
            env: getRemoteHostSessionCount(undefined, {
              repository: pinnedContext.pin,
              userLocale: true,
            }),
          };
    let statusResult = execFileNoThrow(
      gitExe(),
      [...(pinnedContext?.filterDriversOff ?? []), ...GIT_STATUS_ARGS],
      execOptions,
    );
    if (pinnedContext === null) primeRulesForCritique(session, id, statusResult);
    let [currentBranch, defaultBranch, status, recentCommits, gitUserName] = await Promise.all([
      pinnedContext === null
        ? getBranch()
        : readGitHead(pinnedContext.pin.gitDir).then((gitHead) =>
            gitHead?.type === "branch" ? gitHead.name : "HEAD",
          ),
      getDefaultBranch(),
      statusResult.then(({ stdout }) => stdout.trim()),
      execFileNoThrow(gitExe(), ["--no-optional-locks", "log", "--oneline", "-n", "5"], execOptions).then(
        ({ stdout }) => stdout.trim(),
      ),
      execFileNoThrow(gitExe(), ["config", "user.name"], execOptions).then(({ stdout }) => stdout.trim()),
    ]);
    logForDiagnosticsNoPII("info", "git_commands_completed", {
      duration_ms: Date.now() - gitCmdsStart,
      status_length: status.length,
    });
    let shellToolName = isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
    let statusText =
      status.length > MAX_GIT_STATUS_CHARS
        ? status.substring(0, MAX_GIT_STATUS_CHARS) +
          `
... (truncated because it exceeds 2k characters. If you need more information, run "git status" using ${shellToolName})`
        : status;
    logForDiagnosticsNoPII("info", "git_status_completed", {
      duration_ms: Date.now() - startTime,
      truncated: status.length > MAX_GIT_STATUS_CHARS,
    });
    logFeatureOk("context_git_detect");
    let extraStatusLine;
    return [
      "This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.",
      `Current branch: ${currentBranch}`,
      `Main branch (you will usually use this for PRs): ${defaultBranch}`,
      ...(gitUserName ? [`Git user: ${gitUserName}`] : []),
      `Status:
${statusText || "(clean)"}`,
      `Recent commits:
${recentCommits}`,
      ...(extraStatusLine === undefined ? [] : [extraStatusLine]),
    ].join(`

`);
  } catch (error) {
    logForDiagnosticsNoPII("error", "git_status_failed", {
      duration_ms: Date.now() - startTime,
    });
    logFeatureSad("context_git_detect", "git_cmd_failed");
    logForDebugging(`Failed to get git status for system context: ${errorMessage(error)}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-5xgkngpb.js:1354991-1355399 placement
var getProjectContextBlock; // deferred: loads other modules while loading; runs once its import cycle is complete
var retryProjectContextWhenPolicyLands;
var forgetKeptProjectDetail;
var clearProjectMemoryCache;
var PROJECT_REREAD_BACKOFF_MS;
var EMPTY_FILE_LIST;
var sessionContextStore;
deferInit("chunk-5xgkngpb.js:1354991", () => {
  getProjectContextBlock = require("./services/projects/projectContext.js").getProjectContextBlock;
  retryProjectContextWhenPolicyLands =
    require("./services/projects/projectContext.js").retryProjectContextWhenPolicyLands;
  forgetKeptProjectDetail = require("./services/projects/projectContext.js").forgetKeptProjectDetail;
  clearProjectMemoryCache = require("./services/projects/projectMemory.js").clearProjectMemoryCache;
  PROJECT_REREAD_BACKOFF_MS = [5000, 30000, 120000];
  EMPTY_FILE_LIST = [];
  sessionContextStore = new SessionRootSlot(() => ({
    byId: new Map(),
    userContextBuildsStarted: 0,
    classifierClaudeMdBuildOrdinal: 0,
    hasLoggedPluginInstructionFiles: false,
  }));
});
//@ chunk-5xgkngpb.js:1355399-1355698 placement
/**
 * 取（或创建）当前会话的上下文缓存记录：git 状态预取、用户上下文与记忆/指令文件、刷新原因、项目重读计数、按短语缓存的系统上下文。
 */
function getSessionContextState(session) {
  let byId = sessionContextStore.of(session).byId;
  let sessionState = byId.get(session.id);
  if (!sessionState) {
    sessionState = {
      gitStatusPrefetch: undefined,
      userContext: undefined,
      userContextMemoryFiles: undefined,
      userContextInstructionFiles: undefined,
      refreshReason: "session_start",
      projectReadFailures: 0,
      projectRereadDueAt: undefined,
      systemContextByPhrase: new Map(),
    };
    byId.set(session.id, sessionState);
  }
  return sessionState;
}
//@ chunk-5xgkngpb.js:1355698-1355748 placement
/**
 * 函数 shouldPrefetchGitStatus（非远程模式且需要 git 指令）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function shouldPrefetchGitStatus() {
  return !env.CLAUDE_CODE_REMOTE && shouldIncludeGitInstructions();
}
//@ chunk-5xgkngpb.js:1355748-1355889 placement
/**
 * 预取 git 状态（远程模式下跳过），结果缓存在会话上下文中。
 */
function prefetchGitStatus(session) {
  if (getIsRemoteMode()) {
    logForDiagnosticsNoPII("info", "git_status_skipped_remote_mode");
    return;
  }
  if (shouldPrefetchGitStatus())
    getSessionContextState(session).gitStatusPrefetch ??= computeGitStatus(session).catch((error) => {
      logError(error);
      return null;
    });
}
//@ chunk-5xgkngpb.js:1355889-1355936 placement
function getGitStatusPrefetch(session) {
  return getSessionContextState(session).gitStatusPrefetch;
}
//@ chunk-5xgkngpb.js:1355936-1356022 placement
/**
 * 函数 takeGitStatusPrefetch（取出并清空预取结果）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function takeGitStatusPrefetch(session) {
  let sessionContextState = getSessionContextState(session);
  let gitStatusPrefetch = sessionContextState.gitStatusPrefetch;
  sessionContextState.gitStatusPrefetch = undefined;
  return gitStatusPrefetch;
}
//@ chunk-5xgkngpb.js:1356022-1356151 placement
/**
 * 按措辞缓存并返回系统上下文的计算结果。
 */
function getCachedSystemContext(session, cacheBreakerPhrase) {
  let sessionContextState = getSessionContextState(session);
  let phrase = cacheBreakerPhrase ?? "";
  let cached = sessionContextState.systemContextByPhrase.get(phrase);
  if (!cached) {
    cached = getSystemContext(session, cacheBreakerPhrase);
    sessionContextState.systemContextByPhrase.set(phrase, cached);
  }
  return cached;
}
//@ chunk-5xgkngpb.js:1356151-1356635 fingerprint (2.1.88 match: getSystemContext, 0.604)
/**
 * 系统上下文：CLAUDE_CODE_PERFORCE_MODE 时加 perforceMode 说明；其余为空对象（gitStatus 另行通告）。
 */
async function getSystemContext(session, cacheBreakerPhrase) {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "system_context_started");
  logForDiagnosticsNoPII("info", "system_context_completed", {
    duration_ms: Date.now() - startTime,
    has_injection: cacheBreakerPhrase !== undefined,
  });
  return {
    ...(isEnvTruthy(env.CLAUDE_CODE_PERFORCE_MODE) && {
      perforceMode: `This is a Perforce workspace. Files not yet opened for edit are read-only; if a file is read-only, run \`p4 edit <file>\` via ${isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME} to check it out before modifying. Files that are already writable have been opened and can be edited directly.`,
    }),
    ...{},
  };
}
//@ chunk-5xgkngpb.js:1356635-1358338 layout
/**
 * 取会话缓存的用户上下文（没有则调用 getUserContext 并缓存），项目读取失败时按 5s/30s/120s 退避重读，记录插件指令文件统计。
 */
function getOrBuildUserContext(session, storageV5, credentials) {
  let sessionContextState = getSessionContextState(session);
  let previousContext =
    sessionContextState.projectRereadDueAt !== undefined &&
    Date.now() >= sessionContextState.projectRereadDueAt
      ? {
          userContext: sessionContextState.userContext,
          userContextMemoryFiles: sessionContextState.userContextMemoryFiles,
          userContextInstructionFiles: sessionContextState.userContextInstructionFiles,
          refreshReason: sessionContextState.refreshReason,
        }
      : undefined;
  if (previousContext !== undefined) {
    logForDiagnosticsNoPII("info", "user_context_project_reread", {
      failed_reads: sessionContextState.projectReadFailures,
    });
    invalidateUserContext(session, "project_reread");
  }
  if (sessionContextState.userContext === undefined) {
    let sessionState = sessionContextStore.of(session);
    let buildStarted = ++sessionState.userContextBuildsStarted;
    noteUserContextBuild();
    let userContext = getUserContext(session, storageV5, credentials);
    let userContextPromise = userContext.then(
      ({ blocks, claudeMd, instructionFiles, pluginInstructionFiles, isProjectWorthReadingAgain }) => {
        if (sessionContextState.userContext === userContextPromise) {
          let isWorthReadingAgain = isProjectWorthReadingAgain
            ? PROJECT_REREAD_BACKOFF_MS[sessionContextState.projectReadFailures]
            : undefined;
          sessionContextState.projectReadFailures = isProjectWorthReadingAgain
            ? sessionContextState.projectReadFailures + 1
            : 0;
          sessionContextState.projectRereadDueAt =
            isWorthReadingAgain === undefined ? undefined : Date.now() + isWorthReadingAgain;
        }
        if (buildStarted > sessionState.classifierClaudeMdBuildOrdinal) {
          sessionState.classifierClaudeMdBuildOrdinal = buildStarted;
          setCachedClaudeMdContent(claudeMd);
          if (pluginInstructionFiles !== undefined && !sessionState.hasLoggedPluginInstructionFiles) {
            sessionState.hasLoggedPluginInstructionFiles = true;
            if (pluginInstructionFiles.fileCount > 0)
              logEvent("tengu_instruction_files_from_plugins", {
                file_count: pluginInstructionFiles.fileCount,
                total_content_length: pluginInstructionFiles.totalContentLength,
              });
          }
        }
        return blocks;
      },
      (error) => {
        if (previousContext?.userContext === undefined) throw error;
        logForDiagnosticsNoPII("warn", "user_context_project_reread_threw");
        logForDebugging(
          `user context: the project re-read's build threw: ${error instanceof Error ? error.name : typeof error}`,
          {
            level: "warn",
          },
        );
        if (sessionContextState.userContext === userContextPromise) {
          sessionContextState.userContext = previousContext.userContext;
          sessionContextState.userContextMemoryFiles = previousContext.userContextMemoryFiles;
          sessionContextState.userContextInstructionFiles = previousContext.userContextInstructionFiles;
          sessionContextState.refreshReason = previousContext.refreshReason;
        }
        return previousContext.userContext;
      },
    );
    sessionContextState.userContext = userContextPromise;
    sessionContextState.userContextMemoryFiles = userContext.then(
      ({ memoryFiles }) => memoryFiles,
      () => previousContext?.userContextMemoryFiles ?? EMPTY_FILE_LIST,
    );
    sessionContextState.userContextInstructionFiles = userContext.then(
      ({ instructionFiles }) => instructionFiles,
      () => previousContext?.userContextInstructionFiles,
    );
  }
  return sessionContextState.userContext;
}
//@ chunk-5xgkngpb.js:1358338-1358448 layout
/**
 * 触发用户上下文构建并返回指令文件列表 promise。
 */
function getUserContextInstructionFiles(session, storageV5, credentials) {
  getOrBuildUserContext(session, storageV5, credentials).catch(() => {});
  return getSessionContextState(session).userContextInstructionFiles ?? Promise.resolve(undefined);
}
//@ chunk-5xgkngpb.js:1358448-1358457 layout
/**
 * 模块加载时登记 getUserContextInstructionFiles（q3t）。
 */
// deferred: uses setMarkdownLexer (./utils/claudemd.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1358448", () => {
  setMarkdownLexer(getUserContextInstructionFiles);
});
//@ chunk-5xgkngpb.js:1358457-1358555 layout
/**
 * 指令文件中 Managed 类型的合并文本。
 */
async function getManagedInstructionText(session, storageV5, credentials) {
  let userContextInstructionFiles = await getUserContextInstructionFiles(session, storageV5, credentials);
  return (
    userContextInstructionFiles &&
    formatMemoryInstruction(
      userContextInstructionFiles.filter(
        (userContextInstructionFile) => userContextInstructionFile.type === "Managed",
      ),
    )
  );
}
//@ chunk-5xgkngpb.js:1358555-1358629 layout
/**
 * 会话缓存里的记忆文件。
 */
function getUserContextMemoryFiles(session) {
  return sessionContextStore.peek(session)?.byId.get(session.id)?.userContextMemoryFiles;
}
//@ chunk-5xgkngpb.js:1358629-1358876 layout
/**
 * 指令文件中不在记忆文件里的部分。
 */
async function getNonMemoryInstructionFiles(session) {
  let pluginFiles = sessionContextStore.peek(session)?.byId.get(session.id);
  let [nonMemoryFiles, memoryFiles] = await Promise.all([
    pluginFiles?.userContextInstructionFiles,
    pluginFiles?.userContextMemoryFiles,
  ]);
  if (nonMemoryFiles === undefined || memoryFiles === undefined) return EMPTY_FILE_LIST;
  let memoryPaths = new Set(memoryFiles.map((file) => file.path));
  return nonMemoryFiles.filter((file) => !memoryPaths.has(file.path));
}
//@ chunk-5xgkngpb.js:1358876-1358992 layout
/**
 * 合并两个文件列表，按 path 去重。
 */
function mergeByPath(first, second) {
  let seenPaths = new Set(first.map((file) => file.path));
  let filtered = second.filter((file) => !seenPaths.has(file.path));
  return filtered.length > 0 ? first.concat(filtered) : first;
}
//@ chunk-5xgkngpb.js:1358992-1360915 fingerprint (2.1.88 match: getUserContext, 0.486)
/**
 * 构建用户上下文块 {claudeMd, userEmail?, attachedProject?, currentDate:"Today's date is …"}；CLAUDE.md 可被关闭；块可经 resolvePromptContext 钩子改写；这些块在请求里成为首条 user 消息前的 system-reminder 或 role=system 消息。
 */
async function getUserContext(session, storageV5, credentials) {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "user_context_started");
  let isMemoryDisabled = isClaudeMdLoadingDisabled();
  let claudeMd = null;
  let memoryFiles = EMPTY_FILE_LIST;
  let includedFiles = EMPTY_FILE_LIST;
  try {
    if (!isMemoryDisabled) {
      memoryFiles = filterAutoMemWhenDisabled(await getMemoryFilesCached(session, false, storageV5));
      includedFiles = includedMemoryFiles(memoryFiles);
      claudeMd = formatMemoryInstruction(includedFiles);
    }
  } catch (error) {
    logFeatureBad("context_claude_md_load", "load_threw");
    throw error;
  }
  if (!isMemoryDisabled) logFeatureOk("context_claude_md_load");
  let userEmail = getEmail();
  let projectContextBlock = await getProjectContextBlock(credentials, session);
  let block = projectContextBlock.block;
  let isProjectWorthReadingAgain =
    projectContextBlock.block === null && projectContextBlock.isWorthReadingAgain;
  if (block === null)
    retryProjectContextWhenPolicyLands(session, () => invalidateUserContext(session, "policy_verdict"));
  logForDiagnosticsNoPII("info", "user_context_completed", {
    duration_ms: Date.now() - startTime,
    claudemd_length: claudeMd?.length ?? 0,
    claudemd_disabled: Boolean(isMemoryDisabled),
    has_user_email: Boolean(userEmail),
    has_project_context: Boolean(block),
  });
  let blocks = {
    claudeMd: claudeMd ?? "",
    ...(userEmail && {
      userEmail: `The user's email address is ${userEmail}. Use it only to identify the user, such as for authorship, attribution, or filtering their own work. Never send it to an unrelated service, such as in a request header, URL, or payload, unless the user explicitly asks. A site asking automated clients for contact details, such as an email in the User-Agent, is not a reason to use this address: use a generic client name or ask the user.`,
    }),
    ...(block && {
      attachedProject: block,
    }),
    currentDate: `Today's date is ${sessionDateCell(session)}.`,
  };
  let pluginInstructionFiles = [];
  let promptContext = await resolvePromptContext(() => {
    pluginInstructionFiles = includedFiles.map(toPluginInstructionFile);
    return {
      blocks: Object.entries(blocks).map(([key, value]) => ({
        name: key,
        text: value,
      })),
      instructionFiles: pluginInstructionFiles,
    };
  });
  if (promptContext === undefined)
    return {
      blocks,
      memoryFiles,
      instructionFiles: includedFiles,
      claudeMd: claudeMd || null,
      pluginInstructionFiles: undefined,
      isProjectWorthReadingAgain,
    };
  let instructionFilesMatch =
    promptContext.instructionFiles !== undefined &&
    sameInstructionFiles(promptContext.instructionFiles, pluginInstructionFiles);
  let extraPluginFiles =
    promptContext.instructionFiles === undefined || instructionFilesMatch
      ? []
      : excludeInstructionFiles(promptContext.instructionFiles, pluginInstructionFiles);
  let pluginInstructionFiles_2 = {
    fileCount: extraPluginFiles.length,
    totalContentLength: extraPluginFiles.reduce((acc, file) => acc + file.content.length, 0),
  };
  let mergedFiles =
    promptContext.instructionFiles === undefined
      ? undefined
      : instructionFilesMatch
        ? includedFiles
        : fromPluginInstructionFiles(promptContext.instructionFiles, includedFiles);
  let mergedClaudeMd =
    mergedFiles === undefined
      ? undefined
      : instructionFilesMatch
        ? blocks.claudeMd
        : formatMemoryInstruction(mergedFiles);
  let blocksByKey = Object.fromEntries(
    promptContext.blocks.map(({ name, text }) => [
      name,
      name === "claudeMd" && mergedClaudeMd !== undefined ? mergedClaudeMd : text,
    ]),
  );
  return {
    blocks: blocksByKey,
    memoryFiles,
    instructionFiles: mergedFiles,
    claudeMd: blocksByKey.claudeMd || null,
    pluginInstructionFiles: pluginInstructionFiles_2,
    isProjectWorthReadingAgain,
  };
}
//@ chunk-5xgkngpb.js:1360915-1361049 placement
/**
 * 清除会话的项目记忆缓存与上下文缓存，并记录分类器 CLAUDE.md 构建序号。
 */
function clearSessionContextCaches(rootSession) {
  clearProjectMemoryCache();
  clearAgentAnswers(rootSession);
  let sessionState = sessionContextStore.peek(rootSession);
  if (!sessionState) return;
  sessionState.byId.clear();
  sessionState.classifierClaudeMdBuildOrdinal = sessionState.userContextBuildsStarted;
}
//@ chunk-5xgkngpb.js:1361049-1361124 placement
/**
 * 函数 resetPluginInstructionLogged（清掉"已记录插件指令文件"标记）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function resetPluginInstructionLogged(rootSession) {
  let sessionState = sessionContextStore.peek(rootSession);
  if (sessionState) sessionState.hasLoggedPluginInstructionFiles = false;
}
//@ chunk-5xgkngpb.js:1361124-1361486 placement
/**
 * 使所有会话的用户上下文失效并记录刷新原因（account_change 时同时丢弃保留的项目详情；非 project_reread 时重置读失败计数）。
 */
function invalidateUserContext(rootSession, reason_2) {
  clearProjectMemoryCache();
  if (reason_2 === "account_change") forgetKeptProjectDetail();
  let sessionState = sessionContextStore.peek(rootSession);
  if (!sessionState) return;
  for (let sessionState_ of sessionState.byId.values()) {
    let hasUserContext = sessionState_.userContext !== undefined;
    sessionState_.userContext = undefined;
    sessionState_.userContextMemoryFiles = undefined;
    sessionState_.userContextInstructionFiles = undefined;
    sessionState_.projectRereadDueAt = undefined;
    if (reason_2 !== "project_reread") sessionState_.projectReadFailures = 0;
    if (hasUserContext || (reason(reason_2) && reason(sessionState_.refreshReason)))
      sessionState_.refreshReason = reason_2;
  }
}
//@ chunk-5xgkngpb.js:1361486-1361654 placement
/**
 * 订阅记忆暂停与自动记忆开关的变化，触发上下文刷新；返回取消订阅函数。
 */
function subscribeMemoryToggleRefresh(rootSession) {
  let root = rootSession.root;
  let unsubscribePause = onMemoryPauseChange(
    (isPaused) => invalidateUserContextSafely(root, isPaused ? "memory_paused" : "memory_resumed"),
    root,
  );
  let unsubscribeSwitch = onAutoMemorySessionSwitchChange(
    (enabled) => invalidateUserContextSafely(root, enabled ? "auto_memory_off" : "auto_memory_back_on"),
    root,
  );
  return () => {
    unsubscribePause();
    unsubscribeSwitch();
  };
}
//@ chunk-5xgkngpb.js:1361654-1361705 placement
function invalidateUserContextSafely(root, reason) {
  try {
    clearMemoryFilesCache(root);
    invalidateUserContext(root, reason);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:1361705-1361770 placement
/**
 * 函数 getUserContextRefreshReason（用户上下文上次刷新原因）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function getUserContextRefreshReason(session) {
  return sessionContextStore.peek(session)?.byId.get(session.id)?.refreshReason;
}
export {
  invalidateUserContext,
  prefetchGitStatus,
  getUserContextMemoryFiles,
  getOrBuildUserContext,
  getCachedSystemContext,
  getGitStatusPrefetch,
  mergeByPath,
  getNonMemoryInstructionFiles,
  clearSessionContextCaches,
  subscribeMemoryToggleRefresh,
  getManagedInstructionText,
  resetPluginInstructionLogged,
  getUserContextInstructionFiles,
  getUserContextRefreshReason,
  takeGitStatusPrefetch,
  shouldPrefetchGitStatus,
  computeGitStatus,
};
