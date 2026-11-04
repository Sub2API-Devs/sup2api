/**
 * setup.ts
 *
 * setup()：Node 版本检查、--session-id、跨会话消息、终端恢复、chdir、钩子快照、worktree/tmux、锁定当前版本、tengu_started
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/setup.ts
 * pieces: chunk-fhdzwff4.js (15)
 * attribution: placement 5, sole-consumer 9, fingerprint 1
 */
import { realpath } from "fs/promises";
import { resolve, basename } from "path";
import { onGrowthBookRefresh, getFeatureValue_CACHED_MAY_BE_STALE } from "./services/analytics/growthbook.js";
import { isShuttingDown, markOwnsControllingTerminal } from "./utils/gracefulShutdown.js";
import {
  getIsRemoteMode,
  isRestrictedSession,
  getIsNonInteractiveSession,
  getSessionId,
  switchSession,
  getRootSession,
  setInlinePlugins,
  getInlinePlugins,
  setInlinePluginsNoMcp,
  getInlinePluginsNoMcp,
  setOriginalCwd,
  setProjectRoot,
  getProjectRoot,
} from "./bootstrap/state.js";
import { isCrossSessionMessagingEnabled } from "./utils/crossSessionMessagingGate.js";
import { registerCleanup } from "./utils/cleanupRegistry.js";
import { CliUserError, errorMessage, sanitizeErrnoForTelemetry } from "./utils/errors.js";
import { logForDebugging } from "./utils/debug.js";
import { logError } from "./utils/log.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "./services/analytics/featureTelemetry.js";
import { isTerminalShutdown } from "./utils/terminalShutdown.js";
import { publishInboundAvailability } from "./utils/crossSessionInbound/inboundMode.js";
import { env, udsEnv } from "./utils/env.js";
import { isBareMode, isSafeMode } from "./utils/envUtils.js";
import { isWorktreeMadeElsewhereStub } from "./utils/worktree/worktreeRegistrations.js";
import { findCanonicalGitRoot, isLinkedWorktree, getIsGit } from "./utils/git.js";
import {
  isAgentWorktreeOf,
  validateWorktreeSlug,
  isWorktreeMadeElsewhere,
  lockClaudeWorktree,
  releaseOwnWorktreeLock,
  worktreeBranchName,
  readWorktreeBaseline,
  restoreWorktreeSession,
  claudeWorktreeLockPid,
  readWorktreeLockReason,
  generateTmuxSessionName,
  createWorktreeForSession,
  createTmuxSessionForWorktree,
  killTmuxSession,
  getCurrentWorktreeSession,
} from "./utils/worktree.js";
import { checkWorktreeIsolation, gitRootsForPath } from "./utils/worktreeIsolation.js";
import { sleep } from "./utils/sleep.js";
import { saveWorktreeState } from "./utils/sessionStorage.js";
import { initManagedModulesPending } from "./utils/plugins/hooksModulesLoadGate.js";
import { logForDiagnosticsNoPII } from "./utils/diagLogs.js";
import { sequential } from "./utils/sequential.js";
import { acquireControllingTty, hasControllingTty } from "./utils/bgControllingTty.js";
import { identityAgentId } from "./utils/agentId.js";
import { profileCheckpoint } from "./utils/startupProfiler.js";
import { ownProcStartAsync } from "./utils/processIdentity.js";
import { ownPidDomain } from "./utils/pidSpace.js";
import { recordPhase } from "./utils/startupTiming.js";
import { logEvent } from "./services/analytics/index.js";
import { captureTeammateModeSnapshotIfEnabled, isAgentSwarmsEnabled } from "./utils/agentSwarmsEnabled.js";
import { checkAndRestoreITerm2Backup } from "./utils/iTermBackup.js";
import { checkAndRestoreTerminalBackup } from "./utils/appleTerminalBackup.js";
import { setCwd } from "./utils/Shell.js";
import { setBgExitCause } from "./utils/bgExitSidecars.js";
import { isStorageV5Enabled } from "./utils/hoverRest.js";
import {
  updateHooksConfigSnapshotThroughBackend,
  captureHooksConfigSnapshotFromLoadedSettings,
  updateHooksConfigSnapshot,
} from "./utils/hooks/hooksConfigSnapshot.js";
import { initialize } from "./utils/hooks/fileChangedWatcher.js";
import { hasWorktreeCreateHook } from "./utils/hooks/worktreeHooks.js";
import { getPlanSlug, getPlansDirectory, primePlanSlugCollisions } from "./utils/plans.js";
import { getCwd } from "./utils/cwd.js";
import { processChdir } from "./utils/fsOperations.js";
import { flushAnalyticsSinks } from "./services/analytics/flushSinks.js";
import { reanchorGitFileWatcher } from "./utils/git/gitFilesystem.js";
import { clearMemoryFilesCacheForHost } from "./utils/claudemd.js";
import { isBgSession, getBgJobDir } from "./utils/concurrentSessions.js";
import { lockCurrentVersion } from "./utils/nativeInstaller/installer.js";
import { shouldFillPluginLoadWithStore, loadAllPluginsCacheOnly } from "./utils/plugins/pluginLoader.js";
import { warmCommandSourceCaches } from "./commands.js";
import { getPluginRegistry } from "./utils/plugins/pluginLoadState.js";
import { checkHasTrustDialogAccepted, getCurrentProjectConfig } from "./utils/config.js";
import { initSinks } from "./utils/sinks.js";
import { sanitizeMarkName } from "./utils/startupMarks.js";
import { configureProxyAuthHelperFromSettings } from "./utils/auth/proxyAuthHelperConfig.js";
import { prefetchProxyAuthFromHelperIfSafe } from "./utils/proxy.js";
import { probeTmuxOptionsForFullscreen } from "./utils/fullscreen.js";
import { loadCustomThemes } from "./utils/customThemes.js";
import { warmKeybindingsFromBackend, keybindingsState } from "./keybindings/loadUserBindings.js";
import { fetchReleaseNotes } from "./utils/releaseNotes.js";
import { writeStartupFailureResult } from "./cli/startupFailureResult.js";
import { sanitizeVersion } from "./services/analytics/metadata.js";
import { isStoredLoginPinned } from "./cli/headlessCloud/attachServe.js";
import { prefetchApiKeyFromApiKeyHelperIfSafe } from "./utils/auth.js";
import { HostScoped } from "./utils/hostScoped.js";

//@ chunk-fhdzwff4.js:12919-13043 placement
function bindInboxOnFlagRefresh(inboxOptions, session) {
  let didBind = false;
  let unsubscribe = onGrowthBookRefresh(() => {
    if (
      didBind ||
      isShuttingDown() ||
      getIsRemoteMode() ||
      isRestrictedSession() ||
      !isCrossSessionMessagingEnabled()
    )
      return;
    didBind = true;
    unsubscribe();
    return lateBindCrossSessionInbox(inboxOptions, session);
  });
  registerCleanup(async () => unsubscribe());
  return unsubscribe;
}
//@ chunk-fhdzwff4.js:13043-13979 placement
/**
 * 开关在启动后打开时补绑定跨会话收件箱
 */
async function lateBindCrossSessionInbox(inboxOptions, session) {
  let inboxModule = await import("./utils/udsMessaging.js");
  let closeInbox;
  try {
    closeInbox = await inboxModule.startCrossSessionInbox(inboxOptions, session);
  } catch (error) {
    if (error instanceof CliUserError)
      logForDebugging(`[uds-messaging] Late bind refused: ${error.message}`, {
        level: "warn",
      });
    else logError(error);
    logFeatureBad(
      "agents_cross_session_inbox",
      `${inboxModule.getUdsStartFailureCause() ?? "bind_failed"}_late`,
    );
    return;
  }
  if (!closeInbox) {
    logFeatureBad(
      "agents_cross_session_inbox",
      `${inboxModule.getUdsStartFailureCause() ?? "bind_failed"}_late`,
    );
    return;
  }
  if (isTerminalShutdown()) {
    await closeInbox();
    logForDebugging("[uds-messaging] Late bind landed during shutdown \u2014 torn down, not published");
    logFeatureSad("agents_cross_session_inbox", "shutdown_discarded");
    return;
  }
  logForDebugging("[uds-messaging] Late bind: gate enabled by a GrowthBook refresh after startup");
  publishInboundAvailability();
  let udsStartDegradedCause = inboxModule.getUdsStartDegradedCause();
  if (udsStartDegradedCause)
    logFeatureSad("agents_cross_session_inbox", udsStartDegradedCause, {
      bind_late: true,
    });
  else
    logFeatureOk("agents_cross_session_inbox", {
      bind_late: true,
    });
  let { updateSessionMessagingSocketPath } = await import("./utils/concurrentSessions.js");
  let udsMessagingSocketPath = inboxModule.getUdsMessagingSocketPath();
  if (udsMessagingSocketPath !== undefined)
    await updateSessionMessagingSocketPath(udsMessagingSocketPath, session);
}
//@ chunk-fhdzwff4.js:13979-14030 placement
/**
 * 先记录错误再把同一个错误抛出。
 */
function logThenRethrow(promise, error) {
  logError(error);
  return promise.then(() => {
    throw error;
  });
}
//@ chunk-fhdzwff4.js:14030-14087 placement
/**
 * 是否处于同步插件安装模式（非交互 + 环境变量开启 + 非 bare）。
 */
var isSyncPluginInstallMode = () =>
  getIsNonInteractiveSession() && env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL && !isBareMode();
//@ chunk-fhdzwff4.js:14087-14113 placement
/**
 * 跳过常规插件安装：同步安装、bare 或 safe 模式。
 */
var isPluginInstallBypassed = () => isSyncPluginInstallMode() || isBareMode() || isSafeMode();
//@ chunk-fhdzwff4.js:15033-15976 sole-consumer
/**
 * 后台会话启动时接管所在的代理 worktree：确认是规范 git 根下的关联 worktree 且 slug 合法，检查状态后加锁（必要时重试），恢复并保存 worktree 会话状态。
 */
async function adoptBackgroundWorktree(cwd, options) {
  let worktreePath = options?.worktreePath || undefined;
  if (options?.worktreeHookBased || (worktreePath === undefined && !isWorktreeMadeElsewhereStub()))
    return null;
  let realCwd = await realpath(cwd).catch(() => cwd);
  if (!(
    worktreePath === undefined ||
    worktreePath === cwd ||
    worktreePath === realCwd ||
    resolve(worktreePath) === realCwd
  ))
    return null;
  let storageV5 = findCanonicalGitRoot(cwd);
  if (!storageV5 || !isLinkedWorktree(cwd) || !isAgentWorktreeOf(cwd, storageV5)) return null;
  let replaced = basename(cwd).replaceAll("+", "/");
  try {
    validateWorktreeSlug(replaced);
  } catch {
    return null;
  }
  let isolationCheck = await checkWorktreeIsolation(cwd, [], gitRootsForPath(cwd, storageV5));
  if (!isolationCheck.ok) {
    logForDebugging(`[worktree] bg boot: not adopting ${cwd} \u2014 ${isolationCheck.message}`, {
      level: "warn",
    });
    return null;
  }
  if (worktreePath === undefined && !(await isWorktreeMadeElsewhere(cwd))) return null;
  let lockResult = await lockClaudeWorktree(cwd, storageV5, replaced, "session");
  if (!lockResult || !(await isLockHolderProcess(cwd, storageV5))) {
    await sleep(250);
    lockResult = await lockClaudeWorktree(cwd, storageV5, replaced, "session");
    if (lockResult && !(await isLockHolderProcess(cwd, storageV5)))
      logForDebugging(`[worktree] bg boot: adopted ${cwd} but no worktree lock names this process`, {
        level: "warn",
      });
  }
  if (!lockResult) return null;
  if (worktreePath === undefined) {
    if (await isLockHolderProcess(cwd, storageV5))
      registerCleanup(() => releaseOwnWorktreeLock(cwd, storageV5));
    return null;
  }
  let worktreeState = {
    originalCwd: storageV5,
    worktreePath: cwd,
    worktreeName: replaced,
    worktreeBranch: worktreeBranchName(replaced),
    originalHeadCommit: (await readWorktreeBaseline(cwd)) ?? undefined,
    sessionId: getSessionId(),
    hookBased: false,
    enteredExisting: false,
  };
  restoreWorktreeSession(worktreeState);
  saveWorktreeState(worktreeState);
  return worktreeState;
}
//@ chunk-fhdzwff4.js:15976-16059 sole-consumer
/**
 * 当前进程是否持有该 worktree 的锁。
 */
async function isLockHolderProcess(cwd, storageV5) {
  try {
    return claudeWorktreeLockPid(await readWorktreeLockReason(cwd, storageV5)) === process.pid;
  } catch {
    return false;
  }
}
//@ chunk-fhdzwff4.js:16059-24868 fingerprint (2.1.88 match: setup, 0.523)
/**
 * setup(cwd, permissionMode, …)：检查 Node≥22、后台 worker 抢控制终端、--session-id 切换会话、跨会话消息 UDS、恢复 iTerm2/Terminal.app 备份、chdir、捕获钩子快照、文件监视、--worktree（含 tmux）创建与切换、锁定当前版本、插件钩子预加载、上报 tengu_started 等。
 */
async function setup(
  cwd,
  permissionMode,
  allowDangerouslySkipPermissions,
  worktreeRequested,
  worktreeName,
  unused,
  agentId,
  prInfo,
  messagingSocketPath,
  storageV5,
  credentials,
  resumeAsIs,
  reanchorWatcher = true,
) {
  initManagedModulesPending();
  logForDiagnosticsNoPII("info", "setup_started");
  let nodeVersion = process.version.match(/^v(\d+)\./)?.[1];
  if (!nodeVersion || parseInt(nodeVersion) < 22) {
    console.error(sequential.bold.red("Error: Claude Code requires Node.js version 22 or higher."));
    process.exit(1);
  }
  if (env.CLAUDE_BG_BACKEND === "daemon") {
    let cttyOutcome = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_worker_ctty", true)
      ? await acquireControllingTty()
      : (await hasControllingTty())
        ? "already"
        : "switched_off";
    switch (
      (logForDiagnosticsNoPII("info", "bg_worker_ctty", {
        outcome: cttyOutcome,
      }),
      cttyOutcome)
    ) {
      case "acquired":
        markOwnsControllingTerminal();
        logFeatureOk("bg_worker_ctty");
        break;
      case "already":
        markOwnsControllingTerminal();
        break;
      case "failed":
        logFeatureSad("bg_worker_ctty", cttyOutcome);
        break;
      case "ffi_unavailable":
      case "not_a_tty":
        logFeatureSad("bg_worker_ctty", cttyOutcome);
        break;
      case "unsupported":
      case "switched_off":
        break;
    }
  }
  if (agentId) switchSession(identityAgentId(agentId), "startup_custom_id");
  udsEnv.unset("CLAUDE_CODE_MESSAGING_SOCKET");
  udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN");
  if (!isBareMode() || messagingSocketPath !== undefined)
    if (isRestrictedSession())
      logForDebugging(
        messagingSocketPath === undefined
          ? "[uds-messaging] Skipped: restricted session"
          : "[uds-messaging] Skipped: restricted session (--messaging-socket-path ignored)",
      );
    else if (!isCrossSessionMessagingEnabled()) {
      if (!getIsRemoteMode()) {
        if (messagingSocketPath !== undefined) {
          let inboxModule = await import("./utils/udsMessaging.js");
          await inboxModule.validateExplicitMessagingSocketPath(messagingSocketPath);
        }
        logForDebugging(
          "[uds-messaging] Skipped: cross-session messaging gate off (will late-bind if a GrowthBook refresh enables it)",
        );
        bindInboxOnFlagRefresh(messagingSocketPath, storageV5);
      } else logForDebugging("[uds-messaging] Skipped: cross-session messaging gate off");
    } else if (getIsRemoteMode()) logForDebugging("[uds-messaging] Skipped: remote thin client");
    else {
      let startTime = performance.now();
      profileCheckpoint("setup_uds_start");
      ownProcStartAsync().catch(() => {});
      ownPidDomain().catch(() => {});
      let inboxModule = await import("./utils/udsMessaging.js");
      profileCheckpoint("setup_uds_imported");
      let closeInbox = await inboxModule.startCrossSessionInbox(messagingSocketPath, storageV5, {
        profileStartup: true,
      });
      profileCheckpoint("setup_uds_end");
      if (closeInbox) {
        let udsStartDegradedCause = inboxModule.getUdsStartDegradedCause();
        if (udsStartDegradedCause) logFeatureSad("agents_cross_session_inbox", udsStartDegradedCause);
        else logFeatureOk("agents_cross_session_inbox");
      } else
        logFeatureBad("agents_cross_session_inbox", inboxModule.getUdsStartFailureCause() ?? "bind_failed");
      let bindMs = performance.now() - startTime;
      recordPhase("setup_uds_messaging_ms", bindMs, startTime);
      logEvent("tengu_uds_startup_bind", {
        durationMs: Math.round(bindMs),
        bound: !!closeInbox,
      });
    }
  if (process.env.CLAUDE_BG_BACKEND === "daemon") {
    let { startRendezvousServer } = await import("./services/daemon/rendezvous.js");
    startRendezvousServer(storageV5);
  }
  await captureTeammateModeSnapshotIfEnabled();
  {
    let { installObserverSpawner } = await import("./tasks/installObserverSpawner.lazy.js");
    installObserverSpawner(getRootSession());
  }
  if (!getIsNonInteractiveSession()) {
    if (isAgentSwarmsEnabled()) {
      let restoredIterm2Backup = await checkAndRestoreITerm2Backup(storageV5);
      if (restoredIterm2Backup.status === "restored")
        console.log(
          sequential.yellow(
            "Detected an interrupted iTerm2 setup. Your original settings have been restored. You may need to restart iTerm2 for the changes to take effect.",
          ),
        );
      else if (restoredIterm2Backup.status === "failed")
        console.error(
          sequential.red(
            `Failed to restore iTerm2 settings. Please manually restore your original settings with: defaults import com.googlecode.iterm2 ${restoredIterm2Backup.backupPath}.`,
          ),
        );
    }
    try {
      let restoredTerminalBackup = await checkAndRestoreTerminalBackup(storageV5);
      if (restoredTerminalBackup.status === "restored")
        console.log(
          sequential.yellow(
            "Detected an interrupted Terminal.app setup. Your original settings have been restored. You may need to restart Terminal.app for the changes to take effect.",
          ),
        );
      else if (restoredTerminalBackup.status === "failed")
        console.error(
          sequential.red(
            `Failed to restore Terminal.app settings. Please manually restore your original settings with: defaults import com.apple.Terminal ${restoredTerminalBackup.backupPath}.`,
          ),
        );
    } catch (error) {
      logError(error);
    }
  }
  try {
    setCwd(cwd);
  } catch (error) {
    process.stderr.write(
      sequential.red(`Error: Can't access working directory ${sequential.bold(cwd)}: ${errorMessage(error)}
`),
    );
    setBgExitCause("setcwd");
    process.exit(1);
  }
  let hooksStart = performance.now();
  if (isStorageV5Enabled() && storageV5 !== undefined)
    await updateHooksConfigSnapshotThroughBackend(storageV5);
  else captureHooksConfigSnapshotFromLoadedSettings();
  recordPhase("setup_hooks_snapshot_ms", performance.now() - hooksStart, hooksStart);
  logForDiagnosticsNoPII("info", "setup_hooks_captured", {
    duration_ms: Math.round(performance.now() - hooksStart),
  });
  if (!getIsRemoteMode()) {
    let startTime = performance.now();
    initialize(cwd, storageV5, credentials);
    recordPhase("setup_file_watcher_ms", performance.now() - startTime, startTime);
  }
  let startTime = performance.now();
  if (worktreeRequested) {
    setInlinePlugins(getInlinePlugins().map((pluginPath) => resolve(pluginPath)));
    setInlinePluginsNoMcp(getInlinePluginsNoMcp().map((pluginPath) => resolve(pluginPath)));
    if (isPluginInstallBypassed() || env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL)
      logForDebugging(
        "plugin worktree hooks not registered before creating the worktree: startup lists no plugins here",
      );
    else {
      let { registerPluginWorktreeHooks } = await import("./utils/plugins/loadPluginHooks.js");
      await registerPluginWorktreeHooks(storageV5, credentials).catch((error) => {
        logForDebugging(
          `plugin worktree hooks not registered before creating the worktree (a plugin's WorktreeCreate hook will not run): ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      });
    }
    let hasHook = hasWorktreeCreateHook();
    let inGit = await getIsGit();
    if (!hasHook && !inGit) {
      process.stderr.write(
        sequential.red(`Error: Can only use --worktree in a git repository, but ${sequential.bold(cwd)} is not a git repository. Configure a WorktreeCreate hook to use --worktree with other VCS systems.
`),
      );
      process.exit(1);
    }
    let slug = prInfo?.number ? `pr-${prInfo.number}` : (worktreeName ?? getPlanSlug());
    let tmuxSessionName;
    let mainRepoRoot = null;
    if (inGit) {
      mainRepoRoot = findCanonicalGitRoot(getCwd());
      if (!mainRepoRoot) {
        process.stderr.write(
          sequential.red(`Error: Could not determine the main git repository root.
`),
        );
        process.exit(1);
      }
      if (isLinkedWorktree(getCwd())) {
        logForDiagnosticsNoPII("info", "worktree_resolved_to_main_repo");
        processChdir(mainRepoRoot);
        setCwd(mainRepoRoot);
      }
      tmuxSessionName = unused ? generateTmuxSessionName(mainRepoRoot, worktreeBranchName(slug)) : undefined;
    } else tmuxSessionName = unused ? generateTmuxSessionName(getCwd(), worktreeBranchName(slug)) : undefined;
    let worktree;
    try {
      worktree = await createWorktreeForSession(getSessionId(), slug, tmuxSessionName, {
        prNumber: prInfo?.number,
        prForge: prInfo?.forge,
        resumeAsIs,
        fromCwd: cwd,
        repoRoot: mainRepoRoot ?? undefined,
        storageV5,
        credentials,
      });
    } catch (error) {
      process.stderr.write(
        sequential.red(`Error creating worktree: ${errorMessage(error)}
`),
      );
      setBgExitCause("worktree_create");
      process.exit(1);
    }
    logEvent("tengu_worktree_created", {
      tmux_enabled: unused,
      ...(resumeAsIs && {
        for_cloud_attach: true,
        ...(!worktree.hookBased && {
          resumed_existing: worktree.resumedExisting === true,
        }),
      }),
    });
    let didCreateTmux = false;
    if (unused && tmuxSessionName) {
      let tmuxResult = await createTmuxSessionForWorktree(tmuxSessionName, worktree.worktreePath);
      if (tmuxResult.created) {
        didCreateTmux = true;
        console.log(
          sequential.green(`Created tmux session: ${sequential.bold(tmuxSessionName)}
To attach: ${sequential.bold(`tmux attach -t ${tmuxSessionName}`)}`),
        );
      } else console.error(sequential.yellow(`Warning: Failed to create tmux session: ${tmuxResult.error}`));
    }
    try {
      processChdir(worktree.worktreePath);
    } catch (error) {
      let mainRepoRoot = sanitizeErrnoForTelemetry(error);
      if (!mainRepoRoot) throw error;
      let chdirProblem;
      if (mainRepoRoot === "ENOENT" || mainRepoRoot === "ENOTDIR")
        chdirProblem = worktree.hookBased
          ? "does not exist or is not a directory. The path came from a " +
            "WorktreeCreate hook \u2014 the hook must print the directory it " +
            "created as the last line of its stdout."
          : "does not exist or is not a directory. It may have been removed out from under this session; retrying will recreate it.";
      else if (mainRepoRoot === "EACCES" || mainRepoRoot === "EPERM")
        chdirProblem = `is not accessible (${mainRepoRoot}). Check the directory's permissions.`;
      else chdirProblem = `cannot be entered (${errorMessage(error)}).`;
      process.stderr.write(
        sequential.red(`Error: worktree directory ${worktree.worktreePath} ${chdirProblem}
`),
      );
      logError(error);
      if (didCreateTmux && tmuxSessionName) await killTmuxSession(tmuxSessionName);
      setBgExitCause(`worktree_chdir:${mainRepoRoot}`);
      await flushAnalyticsSinks();
      process.exit(1);
    }
    setCwd(worktree.worktreePath);
    setOriginalCwd(getCwd());
    setProjectRoot(getCwd());
    if (reanchorWatcher) reanchorGitFileWatcher();
    saveWorktreeState(worktree);
    clearMemoryFilesCacheForHost();
    if (isStorageV5Enabled() && storageV5 !== undefined)
      await updateHooksConfigSnapshotThroughBackend(storageV5);
    else updateHooksConfigSnapshot();
    getPlansDirectory.cache.clear?.();
    primePlanSlugCollisions(storageV5);
    recordPhase("setup_worktree_ms", performance.now() - startTime, startTime);
  } else if (isBgSession() && !getCurrentWorktreeSession()) {
    let startTime = performance.now();
    try {
      let bgJobDir = getBgJobDir();
      let options = bgJobDir
        ? await (await import("./services/daemon/jobState.js")).readJobState(bgJobDir, storageV5)
        : null;
      await adoptBackgroundWorktree(cwd, options);
    } catch (error) {
      logForDebugging(`[worktree] bg adopt-time reclaim skipped: ${errorMessage(error)}`);
    }
    recordPhase("setup_bg_worktree_adopt_ms", performance.now() - startTime, startTime);
  }
  logForDiagnosticsNoPII("info", "setup_background_jobs_starting");
  lockCurrentVersion();
  logForDiagnosticsNoPII("info", "setup_background_jobs_launched");
  profileCheckpoint("setup_before_prefetch");
  logForDiagnosticsNoPII("info", "setup_prefetch_starting");
  let isSyncInstall = isSyncPluginInstallMode();
  if (!isPluginInstallBypassed()) {
    if (shouldFillPluginLoadWithStore(credentials))
      loadAllPluginsCacheOnly(storageV5, credentials).catch(() => {});
    warmCommandSourceCaches(getProjectRoot(), storageV5);
  }
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.hookRegistrationOwed = pluginRegistry.hookRegistrationEpoch === 0;
  pluginRegistry.hooksLoadAtStartup = import("./utils/plugins/loadPluginHooks.js").then((hooksModule) => {
    if (isSyncInstall) return;
    let hooksLoad = hooksModule.loadPluginHooks(storageV5, credentials).catch((error) => {
      logForDebugging(`plugin hooks prefetch: ${errorMessage(error)}`);
    });
    try {
      hooksModule.setupPluginHookHotReload(storageV5, credentials);
    } catch (error) {
      return logThenRethrow(hooksLoad, error);
    }
    return hooksLoad;
  });
  if (!isBareMode()) {
    import("./utils/sessionFileAccessHooks.js").then((m) => m.registerSessionFileAccessHooks());
    import("./commands/review/registerUltrareviewPostCommitHook.lazy.js").then((ultrareviewModule) =>
      ultrareviewModule.registerUltrareviewPostCommitHook(),
    );
    import("./services/cloudSessions/registerWebSetupPostPushHook.lazy.js").then((m) =>
      m.registerWebSetupPostPushHook(),
    );
    if (!getIsRemoteMode() && checkHasTrustDialogAccepted())
      import("./services/memorySync/memoryWatcher.js").then((m) =>
        m.startMemoryWatcher(storageV5, credentials),
      );
  }
  initSinks();
  logEvent("tengu_started", {
    trigger_id: sanitizeMarkName(env.CLAUDE_CODE_TRIGGER_ID),
    worktree_flag: worktreeRequested,
    tmux_flag: unused,
    in_tmux_worktree: Boolean(env.CLAUDE_CODE_TMUX_SESSION && env.TMUX),
  });
  prefetchApiKeyIfUnpinned();
  configureProxyAuthHelperFromSettings();
  prefetchProxyAuthFromHelperIfSafe();
  if (
    shouldShowStartupDialogs({
      isNonInteractiveSession: getIsNonInteractiveSession(),
      isRemoteMode: getIsRemoteMode(),
      isBareMode: isBareMode(),
      exitAfterFirstRender: env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER,
      trustAccepted: checkHasTrustDialogAccepted(),
    })
  )
    probeTmuxOptionsForFullscreen();
  profileCheckpoint("setup_after_prefetch");
  {
    let startTime = performance.now();
    let pendingTasks = [
      loadCustomThemes(storageV5),
      ...(isStorageV5Enabled() && storageV5 !== undefined
        ? [warmKeybindingsFromBackend(keybindingsState, storageV5)]
        : []),
    ];
    if (!isBareMode() && !getIsNonInteractiveSession())
      pendingTasks.push(fetchReleaseNotes(undefined, storageV5));
    await Promise.all(pendingTasks);
    recordPhase("setup_release_notes_ms", performance.now() - startTime, startTime);
  }
  if (permissionMode === "bypassPermissions" || allowDangerouslySkipPermissions) {
    if (
      typeof process.getuid === "function" &&
      process.getuid() === 0 &&
      process.env.IS_SANDBOX !== "1" &&
      !env.CLAUDE_CODE_BUBBLEWRAP
    ) {
      console.error(
        "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
      );
      await writeStartupFailureResult({
        sessionId: getSessionId(),
        message:
          "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
        reason: "bypass_root",
      });
      process.exit(1);
    }
  }
  let projectConfig = getCurrentProjectConfig();
  if (projectConfig.lastCost !== undefined && projectConfig.lastDuration !== undefined)
    logEvent("tengu_exit", {
      last_session_cost: projectConfig.lastCost,
      last_session_api_duration: projectConfig.lastAPIDuration,
      last_session_tool_duration: projectConfig.lastToolDuration,
      last_session_duration: projectConfig.lastDuration,
      last_session_lines_added: projectConfig.lastLinesAdded,
      last_session_lines_removed: projectConfig.lastLinesRemoved,
      last_session_total_input_tokens: projectConfig.lastTotalInputTokens,
      last_session_total_output_tokens: projectConfig.lastTotalOutputTokens,
      last_session_total_cache_creation_input_tokens: projectConfig.lastTotalCacheCreationInputTokens,
      last_session_total_cache_read_input_tokens: projectConfig.lastTotalCacheReadInputTokens,
      last_session_fps_average: projectConfig.lastFpsAverage,
      last_session_fps_low_1_pct: projectConfig.lastFpsLow1Pct,
      last_session_graceful_shutdown: projectConfig.lastGracefulShutdown ?? false,
      last_session_version_base: sanitizeVersion(projectConfig.lastVersionBase),
      last_session_id: sanitizeMarkName(projectConfig.lastSessionId),
      ...projectConfig.lastSessionMetrics,
    });
}
//@ chunk-fhdzwff4.js:24868-24892 sole-consumer
/**
 * 恒返回 false 的占位判断。
 */
function alwaysFalseHt(session) {
  return false;
}
//@ chunk-fhdzwff4.js:24892-24916 sole-consumer
/**
 * 恒返回 false 的占位判断。
 */
function alwaysFalseOt(session) {
  return false;
}
//@ chunk-fhdzwff4.js:24916-24955 sole-consumer
/**
 * 登录未被固定时预取 API Key。
 */
function prefetchApiKeyIfUnpinned() {
  if (isStoredLoginPinned()) return;
  prefetchApiKeyFromApiKeyHelperIfSafe(getIsNonInteractiveSession());
}
//@ chunk-fhdzwff4.js:24955-25087 sole-consumer
/**
 * 判断是否显示启动对话框（交互、非远程、非 bare、不在首帧后退出且已信任）。
 */
function shouldShowStartupDialogs({
  isNonInteractiveSession,
  isRemoteMode,
  isBareMode,
  exitAfterFirstRender,
  trustAccepted,
}) {
  return !isNonInteractiveSession && !isRemoteMode && !isBareMode && !exitAfterFirstRender && trustAccepted;
}
//@ chunk-fhdzwff4.js:25087-25161 sole-consumer
/**
 * 一次性认领标记。
 */
class OneShotClaim {
  fired = false;
  claim() {
    if (this.fired) return false;
    this.fired = true;
    return true;
  }
}
//@ chunk-fhdzwff4.js:25161-25186 sole-consumer
/**
 * 按 host 保存的记忆预热认领标记。
 */
var memoryPrewarmClaimSlots = new HostScoped(() => new OneShotClaim());
//@ chunk-fhdzwff4.js:25186-26353 sole-consumer
/**
 * 交互会话（非恢复/继续）在信任已接受、记忆与索引召回开启时，后台预热记忆索引；有组织记忆决策时先等待决策落定。每宿主只做一次。
 */
function prewarmMemoryRecall(session) {
  if (!memoryPrewarmClaimSlots.of(session.host).claim()) return;
  if (getIsRemoteMode() || !checkHasTrustDialogAccepted()) return;
  (async () => {
    let [memdirModule, recallModule, fenceModule] = await Promise.all([
      import("./memdir/paths.lazy.js"),
      import("./memdir/memoryScan.js"),
      import("./utils/permissions/readBlock.js"),
    ]);
    if (
      !process.argv.some(
        (arg) =>
          /^-(?!-)[A-Za-z]*[cr]/.test(arg) ||
          ["--resume", "--continue", "--from-pr"].some((flag) => arg === flag || arg.startsWith(`${flag}=`)),
      ) &&
      recallModule.loadedIndexExclusions() === null &&
      memdirModule.isAutoMemoryEnabled() &&
      !fenceModule.isAutoMemReadFenced() &&
      memdirModule.isMemoryRecallEnabled() &&
      memdirModule.isIndexRecallEnabled()
    ) {
      let prewarmModule = await import("./memdir/prewarmMemoryIndex.lazy.js");
      let orgMemoryModule = await import("./services/orgMemory/orgMemoryDecision.js");
      let multiStoreModule = await import("./services/memorySync/availability.js");
      let pullModule = await import("./services/orgMemory/storePulls.js");
      let orgDecisionModule = await import("./services/orgMemory/discovery.js");
      if (
        multiStoreModule.isMultiStoreSyncAvailable() ||
        orgDecisionModule.hasOrgMemoryDecisionRunStarted()
      ) {
        await orgMemoryModule.waitForOrgMemoryDecisionSettled(
          pullModule.FIRST_STORE_PULL_WAIT_DEADLINE_MS,
          new AbortController().signal,
        );
        if (orgMemoryModule.getOrgMemoryDecision().state === "undecided") return;
      }
      await memdirModule.getAutoMemPathState().warmCanonicalWcRoot();
      let visibleMounts = recallModule.recallVisibleTeamMounts(memdirModule.getAutoMemPath());
      prewarmModule.prewarmMemoryIndex(
        session,
        memdirModule.getAutoMemPath(),
        memdirModule.activeSessionLogExcluder(),
        (candidatePath) => recallModule.isRecallVisiblePath(candidatePath, visibleMounts),
      );
    }
  })().catch((error) => logForDebugging(`recall prewarm skipped: ${errorMessage(error)}`));
}
export {
  alwaysFalseHt,
  alwaysFalseOt,
  prewarmMemoryRecall,
  prefetchApiKeyIfUnpinned,
  memoryPrewarmClaimSlots,
  setup,
  shouldShowStartupDialogs,
};
