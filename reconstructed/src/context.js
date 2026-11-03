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
import { lb } from "./utils/git/gitSafeEnv.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { getIsGit, findGitRoot, gitExe, getBranch, getDefaultBranch } from "./utils/git.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "./services/analytics/featureTelemetry.js";
import { M$, getCwd } from "./utils/cwd.js";
import { wt } from "./remote/remoteMode.js";
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
import { primeRulesForCritique, cTi } from "./utils/agentContext.js";
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
import { Vhi } from "./utils/startupTiming.js";
import { logEvent } from "./services/analytics/index.js";
import { q3t, getMemoryFilesCached, L_e } from "./utils/claudemd.js";
import {
  L5e,
  toPluginInstructionFile,
  sameInstructionFiles,
  excludeInstructionFiles,
  fromPluginInstructionFiles,
} from "./plugins/functionHooks/sites/promptContextSites.js";
import { isClaudeMdLoadingDisabled } from "./utils/settings/customizationDisabled.js";
import { D_e } from "./components/memory/MemoryFileSelector.js";
import { getOauthAccountInfo, isAnthropicAuthEnabled } from "./utils/auth.js";
import { zQo } from "./utils/sessionTimeZone.js";
import { resolvePromptContext } from "./plugins/functionHooks/promptComposition.js";
import { clearMemoryFilesCache } from "./components/Message.js";

/**
 * 2000：git status 输出超过此长度截断；tqo 为 git status 参数（--no-optional-locks status --short）。
 */
//@ chunk-e6aww6q8.js:1353381-1353444 sole-consumer
var MAX_GIT_STATUS_CHARS = 2000,
  GIT_STATUS_ARGS = ["--no-optional-locks", "status", "--short", lb];
/**
 * getGitStatus 的转调。
 */
//@ chunk-e6aww6q8.js:1353444-1353480 affinity
async function computeGitStatus(e) {
  return getGitStatus(e);
}
/**
 * 生成 gitStatus 文本："This is the git status at the start of the conversation…"、当前分支、主分支、Git user、Status（截断 2000 字）、Recent commits；非 git 仓库返回 null；worktree 时对比主检出。
 */
//@ chunk-e6aww6q8.js:1353480-1355662 fingerprint = getGitStatus (0.787)
async function getGitStatus(e) {
  let id = e.id,
    startTime = Date.now();
  logForDiagnosticsNoPII("info", "git_status_started");
  let isGitStart = Date.now(),
    isGit = await getIsGit();
  if (
    (logForDiagnosticsNoPII("info", "git_is_git_check_completed", {
      duration_ms: Date.now() - isGitStart,
      is_git: isGit,
    }),
    !isGit)
  )
    return (
      logForDiagnosticsNoPII("info", "git_status_skipped_not_git", { duration_ms: Date.now() - startTime }),
      logFeatureOk("context_git_detect"),
      null
    );
  try {
    let gitCmdsStart = Date.now(),
      S = null;
    if (M$() && !wt()) {
      let Ae = getCwd(),
        Ie = findGitRoot(Ae);
      if (Ie === null)
        return (
          logForDiagnosticsNoPII("info", "git_status_skipped_not_git", {
            duration_ms: Date.now() - startTime,
          }),
          logFeatureOk("context_git_detect"),
          null
        );
      let Me = getOriginalCwdOrNull(),
        We = Me === null ? null : findGitRoot(Me),
        ze = We === null ? null : resolveGitDirs(We),
        lt = resolveGitDirs(Ie);
      if (
        ze !== null &&
        lt !== null &&
        lt.workTree !== null &&
        lt.gitDir !== lt.commonDir &&
        lt.commonDir === ze.commonDir &&
        lt.gitDir !== ze.gitDir
      ) {
        let Je = await buildFilterNeutralizingArgs(lt.workTree, { pin: lt });
        if (Je.ok) S = { cwd: Ae, pin: lt, filterDriversOff: Je.args };
      }
    }
    let w =
        S === null
          ? { preserveOutputOnError: !1, env: getRemoteHostSessionCount(void 0, { userLocale: !0 }) }
          : {
              cwd: S.cwd,
              preserveOutputOnError: !1,
              env: getRemoteHostSessionCount(void 0, { repository: S.pin, userLocale: !0 }),
            },
      L = execFileNoThrow(gitExe(), [...(S?.filterDriversOff ?? []), ...GIT_STATUS_ARGS], w);
    if (S === null) primeRulesForCritique(e, id, L);
    let [G, q, Z, Se, ke] = await Promise.all([
      S === null
        ? getBranch()
        : readGitHead(S.pin.gitDir).then((Ae) => (Ae?.type === "branch" ? Ae.name : "HEAD")),
      getDefaultBranch(),
      L.then(({ stdout: stdout }) => stdout.trim()),
      execFileNoThrow(gitExe(), ["--no-optional-locks", "log", "--oneline", "-n", "5"], w).then(
        ({ stdout: stdout }) => stdout.trim(),
      ),
      execFileNoThrow(gitExe(), ["config", "user.name"], w).then(({ stdout: stdout }) => stdout.trim()),
    ]);
    logForDiagnosticsNoPII("info", "git_commands_completed", {
      duration_ms: Date.now() - gitCmdsStart,
      status_length: Z.length,
    });
    let we = isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME,
      Ee =
        Z.length > MAX_GIT_STATUS_CHARS
          ? Z.substring(0, MAX_GIT_STATUS_CHARS) +
            `
... (truncated because it exceeds 2k characters. If you need more information, run "git status" using ${we})`
          : Z;
    return (
      logForDiagnosticsNoPII("info", "git_status_completed", {
        duration_ms: Date.now() - startTime,
        truncated: Z.length > MAX_GIT_STATUS_CHARS,
      }),
      logFeatureOk("context_git_detect"),
      [
        "This is the git status at the start of the conversation. Note that this status is a snapshot in time, and will not update during the conversation.",
        `Current branch: ${G}`,
        `Main branch (you will usually use this for PRs): ${q}`,
        ...(ke ? [`Git user: ${ke}`] : []),
        `Status:
${Ee || "(clean)"}`,
        `Recent commits:
${Se}`,
      ].join(`

`)
    );
  } catch (error) {
    return (
      logForDiagnosticsNoPII("error", "git_status_failed", { duration_ms: Date.now() - startTime }),
      logFeatureSad("context_git_detect", "git_cmd_failed"),
      logForDebugging(`Failed to get git status for system context: ${errorMessage(error)}`, {
        level: "error",
      }),
      null
    );
  }
}
//@ chunk-e6aww6q8.js:1355784-1356192 placement
var getProjectContextBlock = require("./chunk-5eyj98zq.js").getProjectContextBlock,
  retryProjectContextWhenPolicyLands = require("./chunk-5eyj98zq.js").retryProjectContextWhenPolicyLands,
  forgetKeptProjectDetail = require("./chunk-5eyj98zq.js").forgetKeptProjectDetail,
  clearProjectMemoryCache = require("./chunk-frr1hkdd.js").clearProjectMemoryCache,
  fqo = [5000, 30000, 120000],
  H_e = [],
  OL = new SessionRootSlot(() => ({
    byId: new Map(),
    userContextBuildsStarted: 0,
    classifierClaudeMdBuildOrdinal: 0,
    hasLoggedPluginInstructionFiles: !1,
  }));
/**
 * 取（或创建）当前会话的上下文缓存记录：git 状态预取、用户上下文与记忆/指令文件、刷新原因、项目重读计数、按短语缓存的系统上下文。
 */
//@ chunk-e6aww6q8.js:1356192-1356491 placement
function getSessionContextState(e) {
  let byId = OL.of(e).byId,
    r = byId.get(e.id);
  if (!r)
    ((r = {
      gitStatusPrefetch: void 0,
      userContext: void 0,
      userContextMemoryFiles: void 0,
      userContextInstructionFiles: void 0,
      refreshReason: "session_start",
      projectReadFailures: 0,
      projectRereadDueAt: void 0,
      systemContextByPhrase: new Map(),
    }),
      byId.set(e.id, r));
  return r;
}
//@ chunk-e6aww6q8.js:1356491-1356541 placement
function _Wo() {
  return !env.CLAUDE_CODE_REMOTE && shouldIncludeGitInstructions();
}
/**
 * 预取 git 状态（远程模式下跳过），结果缓存在会话上下文中。
 */
//@ chunk-e6aww6q8.js:1356541-1356682 placement
function prefetchGitStatus(e) {
  if (getIsRemoteMode()) {
    logForDiagnosticsNoPII("info", "git_status_skipped_remote_mode");
    return;
  }
  if (_Wo())
    getSessionContextState(e).gitStatusPrefetch ??= computeGitStatus(e).catch((n) => (logError(n), null));
}
//@ chunk-e6aww6q8.js:1356682-1356729 placement
function J3t(e) {
  return getSessionContextState(e).gitStatusPrefetch;
}
//@ chunk-e6aww6q8.js:1356729-1356815 placement
function s9s(e) {
  let n = getSessionContextState(e),
    gitStatusPrefetch = n.gitStatusPrefetch;
  return ((n.gitStatusPrefetch = void 0), gitStatusPrefetch);
}
/**
 * 按措辞缓存并返回系统上下文的计算结果。
 */
//@ chunk-e6aww6q8.js:1356815-1356944 placement
function getCachedSystemContext(e, n) {
  let r = getSessionContextState(e),
    s = n ?? "",
    h = r.systemContextByPhrase.get(s);
  if (!h) ((h = getSystemContext(e, n)), r.systemContextByPhrase.set(s, h));
  return h;
}
/**
 * 系统上下文：CLAUDE_CODE_PERFORCE_MODE 时加 perforceMode 说明；其余为空对象（gitStatus 另行通告）。
 */
//@ chunk-e6aww6q8.js:1356944-1357428 fingerprint = getSystemContext (0.604)
async function getSystemContext(e, n) {
  let startTime = Date.now();
  return (
    logForDiagnosticsNoPII("info", "system_context_started"),
    logForDiagnosticsNoPII("info", "system_context_completed", {
      duration_ms: Date.now() - startTime,
      has_injection: n !== void 0,
    }),
    {
      ...(isEnvTruthy(env.CLAUDE_CODE_PERFORCE_MODE) && {
        perforceMode: `This is a Perforce workspace. Files not yet opened for edit are read-only; if a file is read-only, run \`p4 edit <file>\` via ${isBashAvailable() ? BASH_TOOL_NAME : POWERSHELL_TOOL_NAME} to check it out before modifying. Files that are already writable have been opened and can be edited directly.`,
      }),
      ...{},
    }
  );
}
/**
 * 取会话缓存的用户上下文（没有则调用 getUserContext 并缓存），项目读取失败时按 5s/30s/120s 退避重读，记录插件指令文件统计。
 */
//@ chunk-e6aww6q8.js:1357428-1359130 layout
function getOrBuildUserContext(e, n, r) {
  let s = getSessionContextState(e),
    h =
      s.projectRereadDueAt !== void 0 && Date.now() >= s.projectRereadDueAt
        ? {
            userContext: s.userContext,
            userContextMemoryFiles: s.userContextMemoryFiles,
            userContextInstructionFiles: s.userContextInstructionFiles,
            refreshReason: s.refreshReason,
          }
        : void 0;
  if (h !== void 0)
    (logForDiagnosticsNoPII("info", "user_context_project_reread", { failed_reads: s.projectReadFailures }),
      invalidateUserContext(e, "project_reread"));
  if (s.userContext === void 0) {
    let of = OL.of(e),
      S = ++of.userContextBuildsStarted;
    Vhi();
    let w = getUserContext(e, n, r),
      L = w.then(
        ({
          blocks: blocks,
          claudeMd: claudeMd,
          instructionFiles: instructionFiles,
          pluginInstructionFiles: pluginInstructionFiles,
          isProjectWorthReadingAgain: isProjectWorthReadingAgain,
        }) => {
          if (s.userContext === L) {
            let we = isProjectWorthReadingAgain ? fqo[s.projectReadFailures] : void 0;
            ((s.projectReadFailures = isProjectWorthReadingAgain ? s.projectReadFailures + 1 : 0),
              (s.projectRereadDueAt = we === void 0 ? void 0 : Date.now() + we));
          }
          if (S > of.classifierClaudeMdBuildOrdinal) {
            if (
              ((of.classifierClaudeMdBuildOrdinal = S),
              setCachedClaudeMdContent(claudeMd),
              pluginInstructionFiles !== void 0 && !of.hasLoggedPluginInstructionFiles)
            ) {
              if (((of.hasLoggedPluginInstructionFiles = !0), pluginInstructionFiles.fileCount > 0))
                logEvent("tengu_instruction_files_from_plugins", {
                  file_count: pluginInstructionFiles.fileCount,
                  total_content_length: pluginInstructionFiles.totalContentLength,
                });
            }
          }
          return blocks;
        },
        (G) => {
          if (h?.userContext === void 0) throw G;
          if (
            (logForDiagnosticsNoPII("warn", "user_context_project_reread_threw"),
            logForDebugging(
              `user context: the project re-read's build threw: ${G instanceof Error ? G.name : typeof G}`,
              { level: "warn" },
            ),
            s.userContext === L)
          )
            ((s.userContext = h.userContext),
              (s.userContextMemoryFiles = h.userContextMemoryFiles),
              (s.userContextInstructionFiles = h.userContextInstructionFiles),
              (s.refreshReason = h.refreshReason));
          return h.userContext;
        },
      );
    ((s.userContext = L),
      (s.userContextMemoryFiles = w.then(
        ({ memoryFiles: memoryFiles }) => memoryFiles,
        () => h?.userContextMemoryFiles ?? H_e,
      )),
      (s.userContextInstructionFiles = w.then(
        ({ instructionFiles: instructionFiles }) => instructionFiles,
        () => h?.userContextInstructionFiles,
      )));
  }
  return s.userContext;
}
/**
 * 触发用户上下文构建并返回指令文件列表 promise。
 */
//@ chunk-e6aww6q8.js:1359130-1359240 layout
function getUserContextInstructionFiles(e, n, r) {
  return (
    getOrBuildUserContext(e, n, r).catch(() => {}),
    getSessionContextState(e).userContextInstructionFiles ?? Promise.resolve(void 0)
  );
}
/**
 * 模块加载时登记 getUserContextInstructionFiles（q3t）。
 */
//@ chunk-e6aww6q8.js:1359240-1359249 layout
q3t(getUserContextInstructionFiles);
/**
 * 指令文件中 Managed 类型的合并文本。
 */
//@ chunk-e6aww6q8.js:1359249-1359347 layout
async function getManagedInstructionText(e, n, r) {
  let s = await getUserContextInstructionFiles(e, n, r);
  return s && L5e(s.filter((h) => h.type === "Managed"));
}
/**
 * 会话缓存里的记忆文件。
 */
//@ chunk-e6aww6q8.js:1359347-1359421 layout
function getUserContextMemoryFiles(e) {
  return OL.peek(e)?.byId.get(e.id)?.userContextMemoryFiles;
}
/**
 * 指令文件中不在记忆文件里的部分。
 */
//@ chunk-e6aww6q8.js:1359421-1359668 layout
async function getNonMemoryInstructionFiles(e) {
  let n = OL.peek(e)?.byId.get(e.id),
    [r, s] = await Promise.all([n?.userContextInstructionFiles, n?.userContextMemoryFiles]);
  if (r === void 0 || s === void 0) return H_e;
  let h = new Set(s.map((y) => y.path));
  return r.filter((y) => !h.has(y.path));
}
/**
 * 合并两个文件列表，按 path 去重。
 */
//@ chunk-e6aww6q8.js:1359668-1359784 layout
function mergeByPath(e, n) {
  let r = new Set(e.map((h) => h.path)),
    filtered = n.filter((h) => !r.has(h.path));
  return filtered.length > 0 ? e.concat(filtered) : e;
}
/**
 * 构建用户上下文块 {claudeMd, userEmail?, attachedProject?, currentDate:"Today's date is …"}；CLAUDE.md 可被关闭；块可经 resolvePromptContext 钩子改写；这些块在请求里成为首条 user 消息前的 system-reminder 或 role=system 消息。
 */
//@ chunk-e6aww6q8.js:1359784-1361624 fingerprint = getUserContext (0.462)
async function getUserContext(e, n, r) {
  let startTime = Date.now();
  logForDiagnosticsNoPII("info", "user_context_started");
  let h = isClaudeMdLoadingDisabled(),
    y = null,
    S = H_e,
    w = H_e;
  try {
    if (!h) ((S = D_e(await getMemoryFilesCached(e, !1, n))), (w = L_e(S)), (y = L5e(w)));
  } catch (error) {
    throw (logFeatureBad("context_claude_md_load", "load_threw"), error);
  }
  if (!h) logFeatureOk("context_claude_md_load");
  let L = env.ANTHROPIC_UNIX_SOCKET
      ? void 0
      : (getOauthAccountInfo()?.emailAddress ??
        (isDiskless() && isAnthropicAuthEnabled() ? env.CLAUDE_CODE_USER_EMAIL : void 0)),
    G = await getProjectContextBlock(r, e),
    block = G.block,
    Z = G.block === null && G.isWorthReadingAgain;
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
      ...(block && { attachedProject: block }),
      currentDate: `Today's date is ${zQo(e)}.`,
    },
    ke = [],
    we = await resolvePromptContext(
      () => (
        (ke = w.map(toPluginInstructionFile)),
        { blocks: Object.entries(Se).map(([lt, Je]) => ({ name: lt, text: Je })), instructionFiles: ke }
      ),
    );
  if (we === void 0)
    return {
      blocks: Se,
      memoryFiles: S,
      instructionFiles: w,
      claudeMd: y || null,
      pluginInstructionFiles: void 0,
      isProjectWorthReadingAgain: Z,
    };
  let Ee = we.instructionFiles !== void 0 && sameInstructionFiles(we.instructionFiles, ke),
    Ae = we.instructionFiles === void 0 || Ee ? [] : excludeInstructionFiles(we.instructionFiles, ke),
    Ie = { fileCount: Ae.length, totalContentLength: Ae.reduce((lt, Je) => lt + Je.content.length, 0) },
    Me =
      we.instructionFiles === void 0 ? void 0 : Ee ? w : fromPluginInstructionFiles(we.instructionFiles, w),
    We = Me === void 0 ? void 0 : Ee ? Se.claudeMd : L5e(Me),
    fromEntries = Object.fromEntries(
      we.blocks.map(({ name: lt, text: text }) => [lt, lt === "claudeMd" && We !== void 0 ? We : text]),
    );
  return {
    blocks: fromEntries,
    memoryFiles: S,
    instructionFiles: Me,
    claudeMd: fromEntries.claudeMd || null,
    pluginInstructionFiles: Ie,
    isProjectWorthReadingAgain: Z,
  };
}
/**
 * 清除会话的项目记忆缓存与上下文缓存，并记录分类器 CLAUDE.md 构建序号。
 */
//@ chunk-e6aww6q8.js:1361624-1361758 placement
function clearSessionContextCaches(e) {
  (clearProjectMemoryCache(), cTi(e));
  let peek = OL.peek(e);
  if (!peek) return;
  (peek.byId.clear(), (peek.classifierClaudeMdBuildOrdinal = peek.userContextBuildsStarted));
}
//@ chunk-e6aww6q8.js:1361758-1361833 placement
function l9s(e) {
  let peek = OL.peek(e);
  if (peek) peek.hasLoggedPluginInstructionFiles = !1;
}
/**
 * 使所有会话的用户上下文失效并记录刷新原因（account_change 时同时丢弃保留的项目详情；非 project_reread 时重置读失败计数）。
 */
//@ chunk-e6aww6q8.js:1361833-1362165 placement
function invalidateUserContext(e, n) {
  if ((clearProjectMemoryCache(), n === "account_change")) forgetKeptProjectDetail();
  let peek = OL.peek(e);
  if (!peek) return;
  for (let s of peek.byId.values()) {
    let h = s.userContext !== void 0;
    if (
      ((s.userContext = void 0),
      (s.userContextMemoryFiles = void 0),
      (s.userContextInstructionFiles = void 0),
      (s.projectRereadDueAt = void 0),
      n !== "project_reread")
    )
      s.projectReadFailures = 0;
    if (h) s.refreshReason = n;
  }
}
/**
 * 订阅记忆暂停与自动记忆开关的变化，触发上下文刷新；返回取消订阅函数。
 */
//@ chunk-e6aww6q8.js:1362165-1362333 placement
function subscribeMemoryToggleRefresh(e) {
  let root = e.root,
    r = onMemoryPauseChange((h) => X3t(root, h ? "memory_paused" : "memory_resumed"), root),
    s = onAutoMemorySessionSwitchChange(
      (h) => X3t(root, h ? "auto_memory_off" : "auto_memory_back_on"),
      root,
    );
  return () => {
    (r(), s());
  };
}
//@ chunk-e6aww6q8.js:1362333-1362384 placement
function X3t(e, n) {
  try {
    (clearMemoryFilesCache(e), invalidateUserContext(e, n));
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1362384-1362449 placement
function c9s(e) {
  return OL.peek(e)?.byId.get(e.id)?.refreshReason;
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
  l9s,
  clearSessionContextCaches,
  getNonMemoryInstructionFiles,
  J3t,
  getUserContextInstructionFiles,
  c9s,
  s9s,
  _Wo,
  computeGitStatus,
};
