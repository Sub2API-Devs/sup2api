/**
 * context.ts
 *
 * 会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context.ts
 * pieces: chunk-e6aww6q8.js (25)
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
  isDiskless,
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
import { getOauthAccountInfo, isAnthropicAuthEnabled } from "./utils/auth.js";
import { sessionDateCell } from "./utils/sessionTimeZone.js";
import { resolvePromptContext } from "./plugins/functionHooks/promptComposition.js";
import { clearMemoryFilesCache } from "./components/Message.js";

//@ chunk-e6aww6q8.js:1353381-1353444 sole-consumer
/**
 * 2000：git status 输出超过此长度截断；tqo 为 git status 参数（--no-optional-locks status --short）。
 */
var MAX_GIT_STATUS_CHARS = 2000;
var GIT_STATUS_ARGS = ["--no-optional-locks", "status", "--short", IGNORE_SUBMODULES_DIRTY_FLAG];
//@ chunk-e6aww6q8.js:1353444-1353480 affinity
/**
 * getGitStatus 的转调。
 */
async function computeGitStatus(e) {
  return getGitStatus(e);
}
//@ chunk-e6aww6q8.js:1353480-1355662 fingerprint = getGitStatus (0.787)
/**
 * 生成 gitStatus 文本："This is the git status at the start of the conversation…"、当前分支、主分支、Git user、Status（截断 2000 字）、Recent commits；非 git 仓库返回 null；worktree 时对比主检出。
 */
async function getGitStatus(e) {
  let id = e.id;
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
    let S = null;
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
      let We = originalCwdOrNull === null ? null : findGitRoot(originalCwdOrNull);
      let ze = We === null ? null : resolveGitDirs(We);
      let gitDirs = resolveGitDirs(gitRoot);
      if (
        ze !== null &&
        gitDirs !== null &&
        gitDirs.workTree !== null &&
        gitDirs.gitDir !== gitDirs.commonDir &&
        gitDirs.commonDir === ze.commonDir &&
        gitDirs.gitDir !== ze.gitDir
      ) {
        let filterNeutralizingArgs = await buildFilterNeutralizingArgs(gitDirs.workTree, {
          pin: gitDirs,
        });
        if (filterNeutralizingArgs.ok)
          S = {
            cwd,
            pin: gitDirs,
            filterDriversOff: filterNeutralizingArgs.args,
          };
      }
    }
    let w =
      S === null
        ? {
            preserveOutputOnError: false,
            env: getRemoteHostSessionCount(undefined, {
              userLocale: true,
            }),
          }
        : {
            cwd: S.cwd,
            preserveOutputOnError: false,
            env: getRemoteHostSessionCount(undefined, {
              repository: S.pin,
              userLocale: true,
            }),
          };
    let L = execFileNoThrow(gitExe(), [...(S?.filterDriversOff ?? []), ...GIT_STATUS_ARGS], w);
    if (S === null) primeRulesForCritique(e, id, L);
    let [G, defaultBranch, status, Se, ke] = await Promise.all([
      S === null
        ? getBranch()
        : readGitHead(S.pin.gitDir).then((gitHead) => (gitHead?.type === "branch" ? gitHead.name : "HEAD")),
      getDefaultBranch(),
      L.then(({ stdout }) => stdout.trim()),
      execFileNoThrow(gitExe(), ["--no-optional-locks", "log", "--oneline", "-n", "5"], w).then(
        ({ stdout }) => stdout.trim(),
      ),
      execFileNoThrow(gitExe(), ["config", "user.name"], w).then(({ stdout }) => stdout.trim()),
    ]);
    logForDiagnosticsNoPII("info", "git_commands_completed", {
      duration_ms: Date.now() - gitCmdsStart,
      status_length: status.length,
    });
    let we = isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME;
    let Ee =
      status.length > MAX_GIT_STATUS_CHARS
        ? status.substring(0, MAX_GIT_STATUS_CHARS) +
          `
... (truncated because it exceeds 2k characters. If you need more information, run "git status" using ${we})`
        : status;
    logForDiagnosticsNoPII("info", "git_status_completed", {
      duration_ms: Date.now() - startTime,
      truncated: status.length > MAX_GIT_STATUS_CHARS,
    });
    logFeatureOk("context_git_detect");
    return [
      "This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.",
      `Current branch: ${G}`,
      `Main branch (you will usually use this for PRs): ${defaultBranch}`,
      ...(ke ? [`Git user: ${ke}`] : []),
      `Status:
${Ee || "(clean)"}`,
      `Recent commits:
${Se}`,
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
//@ chunk-e6aww6q8.js:1355784-1356192 placement
var getProjectContextBlock = require("./chunk-5eyj98zq.js").getProjectContextBlock;
var retryProjectContextWhenPolicyLands = require("./chunk-5eyj98zq.js").retryProjectContextWhenPolicyLands;
var forgetKeptProjectDetail = require("./chunk-5eyj98zq.js").forgetKeptProjectDetail;
var clearProjectMemoryCache = require("./chunk-frr1hkdd.js").clearProjectMemoryCache;
var PROJECT_REREAD_BACKOFF_MS = [5000, 30000, 120000];
var EMPTY_FILE_LIST = [];
var sessionContextStore = new SessionRootSlot(() => ({
  byId: new Map(),
  userContextBuildsStarted: 0,
  classifierClaudeMdBuildOrdinal: 0,
  hasLoggedPluginInstructionFiles: false,
}));
//@ chunk-e6aww6q8.js:1356192-1356491 placement
/**
 * 取（或创建）当前会话的上下文缓存记录：git 状态预取、用户上下文与记忆/指令文件、刷新原因、项目重读计数、按短语缓存的系统上下文。
 */
function getSessionContextState(e) {
  let byId = sessionContextStore.of(e).byId;
  let r = byId.get(e.id);
  if (!r) {
    r = {
      gitStatusPrefetch: undefined,
      userContext: undefined,
      userContextMemoryFiles: undefined,
      userContextInstructionFiles: undefined,
      refreshReason: "session_start",
      projectReadFailures: 0,
      projectRereadDueAt: undefined,
      systemContextByPhrase: new Map(),
    };
    byId.set(e.id, r);
  }
  return r;
}
//@ chunk-e6aww6q8.js:1356491-1356541 placement
/**
 * 函数 shouldPrefetchGitStatus（非远程模式且需要 git 指令）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function shouldPrefetchGitStatus() {
  return !env.CLAUDE_CODE_REMOTE && shouldIncludeGitInstructions();
}
//@ chunk-e6aww6q8.js:1356541-1356682 placement
/**
 * 预取 git 状态（远程模式下跳过），结果缓存在会话上下文中。
 */
function prefetchGitStatus(e) {
  if (getIsRemoteMode()) {
    logForDiagnosticsNoPII("info", "git_status_skipped_remote_mode");
    return;
  }
  if (shouldPrefetchGitStatus())
    getSessionContextState(e).gitStatusPrefetch ??= computeGitStatus(e).catch((error) => {
      logError(error);
      return null;
    });
}
//@ chunk-e6aww6q8.js:1356682-1356729 placement
function getGitStatusPrefetch(e) {
  return getSessionContextState(e).gitStatusPrefetch;
}
//@ chunk-e6aww6q8.js:1356729-1356815 placement
/**
 * 函数 takeGitStatusPrefetch（取出并清空预取结果）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function takeGitStatusPrefetch(session) {
  let sessionContextState = getSessionContextState(session);
  let gitStatusPrefetch = sessionContextState.gitStatusPrefetch;
  sessionContextState.gitStatusPrefetch = undefined;
  return gitStatusPrefetch;
}
//@ chunk-e6aww6q8.js:1356815-1356944 placement
/**
 * 按措辞缓存并返回系统上下文的计算结果。
 */
function getCachedSystemContext(session, cacheBreakerPhrase) {
  let sessionContextState = getSessionContextState(session);
  let s = cacheBreakerPhrase ?? "";
  let h = sessionContextState.systemContextByPhrase.get(s);
  if (!h) {
    h = getSystemContext(session, cacheBreakerPhrase);
    sessionContextState.systemContextByPhrase.set(s, h);
  }
  return h;
}
//@ chunk-e6aww6q8.js:1356944-1357428 fingerprint = getSystemContext (0.604)
/**
 * 系统上下文：CLAUDE_CODE_PERFORCE_MODE 时加 perforceMode 说明；其余为空对象（gitStatus 另行通告）。
 */
async function getSystemContext(e, n) {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "system_context_started");
  logForDiagnosticsNoPII("info", "system_context_completed", {
    duration_ms: Date.now() - startTime,
    has_injection: n !== undefined,
  });
  return {
    ...(isEnvTruthy(env.CLAUDE_CODE_PERFORCE_MODE) && {
      perforceMode: `This is a Perforce workspace. Files not yet opened for edit are read-only; if a file is read-only, run \`p4 edit <file>\` via ${isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME} to check it out before modifying. Files that are already writable have been opened and can be edited directly.`,
    }),
    ...{},
  };
}
//@ chunk-e6aww6q8.js:1357428-1359130 layout
/**
 * 取会话缓存的用户上下文（没有则调用 getUserContext 并缓存），项目读取失败时按 5s/30s/120s 退避重读，记录插件指令文件统计。
 */
function getOrBuildUserContext(session, storageV5, credentials) {
  let sessionContextState = getSessionContextState(session);
  let h =
    sessionContextState.projectRereadDueAt !== undefined &&
    Date.now() >= sessionContextState.projectRereadDueAt
      ? {
          userContext: sessionContextState.userContext,
          userContextMemoryFiles: sessionContextState.userContextMemoryFiles,
          userContextInstructionFiles: sessionContextState.userContextInstructionFiles,
          refreshReason: sessionContextState.refreshReason,
        }
      : undefined;
  if (h !== undefined) {
    logForDiagnosticsNoPII("info", "user_context_project_reread", {
      failed_reads: sessionContextState.projectReadFailures,
    });
    invalidateUserContext(session, "project_reread");
  }
  if (sessionContextState.userContext === undefined) {
    let y = sessionContextStore.of(session);
    let S = ++y.userContextBuildsStarted;
    noteUserContextBuild();
    let userContext = getUserContext(session, storageV5, credentials);
    let L = userContext.then(
      ({ blocks, claudeMd, instructionFiles, pluginInstructionFiles, isProjectWorthReadingAgain }) => {
        if (sessionContextState.userContext === L) {
          let we = isProjectWorthReadingAgain
            ? PROJECT_REREAD_BACKOFF_MS[sessionContextState.projectReadFailures]
            : undefined;
          sessionContextState.projectReadFailures = isProjectWorthReadingAgain
            ? sessionContextState.projectReadFailures + 1
            : 0;
          sessionContextState.projectRereadDueAt = we === undefined ? undefined : Date.now() + we;
        }
        if (S > y.classifierClaudeMdBuildOrdinal) {
          y.classifierClaudeMdBuildOrdinal = S;
          setCachedClaudeMdContent(claudeMd);
          if (pluginInstructionFiles !== undefined && !y.hasLoggedPluginInstructionFiles) {
            y.hasLoggedPluginInstructionFiles = true;
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
        if (h?.userContext === undefined) throw error;
        logForDiagnosticsNoPII("warn", "user_context_project_reread_threw");
        logForDebugging(
          `user context: the project re-read's build threw: ${error instanceof Error ? error.name : typeof error}`,
          {
            level: "warn",
          },
        );
        if (sessionContextState.userContext === L) {
          sessionContextState.userContext = h.userContext;
          sessionContextState.userContextMemoryFiles = h.userContextMemoryFiles;
          sessionContextState.userContextInstructionFiles = h.userContextInstructionFiles;
          sessionContextState.refreshReason = h.refreshReason;
        }
        return h.userContext;
      },
    );
    sessionContextState.userContext = L;
    sessionContextState.userContextMemoryFiles = userContext.then(
      ({ memoryFiles }) => memoryFiles,
      () => h?.userContextMemoryFiles ?? EMPTY_FILE_LIST,
    );
    sessionContextState.userContextInstructionFiles = userContext.then(
      ({ instructionFiles }) => instructionFiles,
      () => h?.userContextInstructionFiles,
    );
  }
  return sessionContextState.userContext;
}
//@ chunk-e6aww6q8.js:1359130-1359240 layout
/**
 * 触发用户上下文构建并返回指令文件列表 promise。
 */
function getUserContextInstructionFiles(e, n, r) {
  getOrBuildUserContext(e, n, r).catch(() => {});
  return getSessionContextState(e).userContextInstructionFiles ?? Promise.resolve(undefined);
}
//@ chunk-e6aww6q8.js:1359240-1359249 layout
/**
 * 模块加载时登记 getUserContextInstructionFiles（q3t）。
 */
setMarkdownLexer(getUserContextInstructionFiles);
//@ chunk-e6aww6q8.js:1359249-1359347 layout
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
//@ chunk-e6aww6q8.js:1359347-1359421 layout
/**
 * 会话缓存里的记忆文件。
 */
function getUserContextMemoryFiles(session) {
  return sessionContextStore.peek(session)?.byId.get(session.id)?.userContextMemoryFiles;
}
//@ chunk-e6aww6q8.js:1359421-1359668 layout
/**
 * 指令文件中不在记忆文件里的部分。
 */
async function getNonMemoryInstructionFiles(session) {
  let n = sessionContextStore.peek(session)?.byId.get(session.id);
  let [r, s] = await Promise.all([n?.userContextInstructionFiles, n?.userContextMemoryFiles]);
  if (r === undefined || s === undefined) return EMPTY_FILE_LIST;
  let h = new Set(s.map((y) => y.path));
  return r.filter((y) => !h.has(y.path));
}
//@ chunk-e6aww6q8.js:1359668-1359784 layout
/**
 * 合并两个文件列表，按 path 去重。
 */
function mergeByPath(e, n) {
  let r = new Set(e.map((h) => h.path));
  let filtered = n.filter((h) => !r.has(h.path));
  return filtered.length > 0 ? e.concat(filtered) : e;
}
//@ chunk-e6aww6q8.js:1359784-1361624 fingerprint = getUserContext (0.462)
/**
 * 构建用户上下文块 {claudeMd, userEmail?, attachedProject?, currentDate:"Today's date is …"}；CLAUDE.md 可被关闭；块可经 resolvePromptContext 钩子改写；这些块在请求里成为首条 user 消息前的 system-reminder 或 role=system 消息。
 */
async function getUserContext(e, n, r) {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "user_context_started");
  let h = isClaudeMdLoadingDisabled();
  let y = null;
  let S = EMPTY_FILE_LIST;
  let w = EMPTY_FILE_LIST;
  try {
    if (!h) {
      S = filterAutoMemWhenDisabled(await getMemoryFilesCached(e, false, n));
      w = includedMemoryFiles(S);
      y = formatMemoryInstruction(w);
    }
  } catch (error) {
    logFeatureBad("context_claude_md_load", "load_threw");
    throw error;
  }
  if (!h) logFeatureOk("context_claude_md_load");
  let L = env.ANTHROPIC_UNIX_SOCKET
    ? undefined
    : (getOauthAccountInfo()?.emailAddress ??
      (isDiskless() && isAnthropicAuthEnabled() ? env.CLAUDE_CODE_USER_EMAIL : undefined));
  let projectContextBlock = await getProjectContextBlock(r, e);
  let block = projectContextBlock.block;
  let isProjectWorthReadingAgain =
    projectContextBlock.block === null && projectContextBlock.isWorthReadingAgain;
  if (block === null) retryProjectContextWhenPolicyLands(e, () => invalidateUserContext(e, "policy_verdict"));
  logForDiagnosticsNoPII("info", "user_context_completed", {
    duration_ms: Date.now() - startTime,
    claudemd_length: y?.length ?? 0,
    claudemd_disabled: Boolean(h),
    has_user_email: Boolean(L),
    has_project_context: Boolean(block),
  });
  let Se = {
    claudeMd: y ?? "",
    ...(L && {
      userEmail: `The user's email address is ${L}. Use it only to identify the user, such as for authorship, attribution, or filtering their own work. Never send it to an unrelated service, such as in a request header, URL, or payload, unless the user explicitly asks.`,
    }),
    ...(block && {
      attachedProject: block,
    }),
    currentDate: `Today's date is ${sessionDateCell(e)}.`,
  };
  let ke = [];
  let promptContext = await resolvePromptContext(() => {
    ke = w.map(toPluginInstructionFile);
    return {
      blocks: Object.entries(Se).map(([key, value]) => ({
        name: key,
        text: value,
      })),
      instructionFiles: ke,
    };
  });
  if (promptContext === undefined)
    return {
      blocks: Se,
      memoryFiles: S,
      instructionFiles: w,
      claudeMd: y || null,
      pluginInstructionFiles: undefined,
      isProjectWorthReadingAgain,
    };
  let Ee =
    promptContext.instructionFiles !== undefined && sameInstructionFiles(promptContext.instructionFiles, ke);
  let Ae =
    promptContext.instructionFiles === undefined || Ee
      ? []
      : excludeInstructionFiles(promptContext.instructionFiles, ke);
  let pluginInstructionFiles = {
    fileCount: Ae.length,
    totalContentLength: Ae.reduce((acc, Je) => acc + Je.content.length, 0),
  };
  let Me =
    promptContext.instructionFiles === undefined
      ? undefined
      : Ee
        ? w
        : fromPluginInstructionFiles(promptContext.instructionFiles, w);
  let We = Me === undefined ? undefined : Ee ? Se.claudeMd : formatMemoryInstruction(Me);
  let ze = Object.fromEntries(
    promptContext.blocks.map(({ name: lt, text }) => [lt, lt === "claudeMd" && We !== undefined ? We : text]),
  );
  return {
    blocks: ze,
    memoryFiles: S,
    instructionFiles: Me,
    claudeMd: ze.claudeMd || null,
    pluginInstructionFiles,
    isProjectWorthReadingAgain,
  };
}
//@ chunk-e6aww6q8.js:1361624-1361758 placement
/**
 * 清除会话的项目记忆缓存与上下文缓存，并记录分类器 CLAUDE.md 构建序号。
 */
function clearSessionContextCaches(e) {
  clearProjectMemoryCache();
  clearAgentAnswers(e);
  let n = sessionContextStore.peek(e);
  if (!n) return;
  n.byId.clear();
  n.classifierClaudeMdBuildOrdinal = n.userContextBuildsStarted;
}
//@ chunk-e6aww6q8.js:1361758-1361833 placement
/**
 * 函数 resetPluginInstructionLogged（清掉"已记录插件指令文件"标记）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function resetPluginInstructionLogged(e) {
  let n = sessionContextStore.peek(e);
  if (n) n.hasLoggedPluginInstructionFiles = false;
}
//@ chunk-e6aww6q8.js:1361833-1362165 placement
/**
 * 使所有会话的用户上下文失效并记录刷新原因（account_change 时同时丢弃保留的项目详情；非 project_reread 时重置读失败计数）。
 */
function invalidateUserContext(e, n) {
  clearProjectMemoryCache();
  if (n === "account_change") forgetKeptProjectDetail();
  let r = sessionContextStore.peek(e);
  if (!r) return;
  for (let s of r.byId.values()) {
    let h = s.userContext !== undefined;
    s.userContext = undefined;
    s.userContextMemoryFiles = undefined;
    s.userContextInstructionFiles = undefined;
    s.projectRereadDueAt = undefined;
    if (n !== "project_reread") s.projectReadFailures = 0;
    if (h) s.refreshReason = n;
  }
}
//@ chunk-e6aww6q8.js:1362165-1362333 placement
/**
 * 订阅记忆暂停与自动记忆开关的变化，触发上下文刷新；返回取消订阅函数。
 */
function subscribeMemoryToggleRefresh(rootSession) {
  let root = rootSession.root;
  let r = onMemoryPauseChange(
    (h) => invalidateUserContextSafely(root, h ? "memory_paused" : "memory_resumed"),
    root,
  );
  let s = onAutoMemorySessionSwitchChange(
    (h) => invalidateUserContextSafely(root, h ? "auto_memory_off" : "auto_memory_back_on"),
    root,
  );
  return () => {
    r();
    s();
  };
}
//@ chunk-e6aww6q8.js:1362333-1362384 placement
function invalidateUserContextSafely(root, n) {
  try {
    clearMemoryFilesCache(root);
    invalidateUserContext(root, n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1362384-1362449 placement
/**
 * 函数 getUserContextRefreshReason（用户上下文上次刷新原因）；位于「会话上下文：git 状态快照（getGitStatus）、系统上下文（Perforce 说明等，按短语缓存）、用户上下文（CLAUDE.md、用户邮箱、附加项目、当前日期）的构建、缓存与定期重读」模块。
 */
function getUserContextRefreshReason(session) {
  return sessionContextStore.peek(session)?.byId.get(session.id)?.refreshReason;
}
export {
  getOrBuildUserContext,
  getCachedSystemContext,
  getManagedInstructionText,
  prefetchGitStatus,
  invalidateUserContext,
  mergeByPath,
  getUserContextMemoryFiles,
  subscribeMemoryToggleRefresh,
  resetPluginInstructionLogged,
  clearSessionContextCaches,
  getNonMemoryInstructionFiles,
  getGitStatusPrefetch,
  getUserContextInstructionFiles,
  getUserContextRefreshReason,
  takeGitStatusPrefetch,
  shouldPrefetchGitStatus,
  computeGitStatus,
};
