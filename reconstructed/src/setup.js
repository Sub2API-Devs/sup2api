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
function bindInboxOnFlagRefresh(o, s) {
  let r = false;
  let _ = onGrowthBookRefresh(() => {
    if (
      r ||
      isShuttingDown() ||
      getIsRemoteMode() ||
      isRestrictedSession() ||
      !isCrossSessionMessagingEnabled()
    )
      return;
    r = true;
    _();
    return lateBindCrossSessionInbox(o, s);
  });
  registerCleanup(async () => _());
  return _;
}
//@ chunk-fhdzwff4.js:13043-13979 placement
/**
 * 开关在启动后打开时补绑定跨会话收件箱
 */
async function lateBindCrossSessionInbox(o, s) {
  let r = await import("./chunk-cgamr0t5.js");
  let _;
  try {
    _ = await r.startCrossSessionInbox(o, s);
  } catch (error) {
    if (error instanceof CliUserError)
      logForDebugging(`[uds-messaging] Late bind refused: ${error.message}`, {
        level: "warn",
      });
    else logError(error);
    logFeatureBad("agents_cross_session_inbox", `${r.getUdsStartFailureCause() ?? "bind_failed"}_late`);
    return;
  }
  if (!_) {
    logFeatureBad("agents_cross_session_inbox", `${r.getUdsStartFailureCause() ?? "bind_failed"}_late`);
    return;
  }
  if (isTerminalShutdown()) {
    await _();
    logForDebugging("[uds-messaging] Late bind landed during shutdown \u2014 torn down, not published");
    logFeatureSad("agents_cross_session_inbox", "shutdown_discarded");
    return;
  }
  logForDebugging("[uds-messaging] Late bind: gate enabled by a GrowthBook refresh after startup");
  publishInboundAvailability();
  let udsStartDegradedCause = r.getUdsStartDegradedCause();
  if (udsStartDegradedCause)
    logFeatureSad("agents_cross_session_inbox", udsStartDegradedCause, {
      bind_late: true,
    });
  else
    logFeatureOk("agents_cross_session_inbox", {
      bind_late: true,
    });
  let { updateSessionMessagingSocketPath } = await import("./chunk-gtq2y7h2.js");
  let udsMessagingSocketPath = r.getUdsMessagingSocketPath();
  if (udsMessagingSocketPath !== undefined) await updateSessionMessagingSocketPath(udsMessagingSocketPath, s);
}
//@ chunk-fhdzwff4.js:13979-14030 placement
/**
 * 先记录错误再把同一个错误抛出。
 */
function logThenRethrow(o, error) {
  logError(error);
  return o.then(() => {
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
  let _ = await realpath(cwd).catch(() => cwd);
  if (!(
    worktreePath === undefined ||
    worktreePath === cwd ||
    worktreePath === _ ||
    resolve(worktreePath) === _
  ))
    return null;
  let canonicalGitRoot = findCanonicalGitRoot(cwd);
  if (!canonicalGitRoot || !isLinkedWorktree(cwd) || !isAgentWorktreeOf(cwd, canonicalGitRoot)) return null;
  let replaced = basename(cwd).replaceAll("+", "/");
  try {
    validateWorktreeSlug(replaced);
  } catch {
    return null;
  }
  let S = await checkWorktreeIsolation(cwd, [], gitRootsForPath(cwd, canonicalGitRoot));
  if (!S.ok) {
    logForDebugging(`[worktree] bg boot: not adopting ${cwd} \u2014 ${S.message}`, {
      level: "warn",
    });
    return null;
  }
  if (worktreePath === undefined && !(await isWorktreeMadeElsewhere(cwd))) return null;
  let y = await lockClaudeWorktree(cwd, canonicalGitRoot, replaced, "session");
  if (!y || !(await isLockHolderProcess(cwd, canonicalGitRoot))) {
    await sleep(250);
    y = await lockClaudeWorktree(cwd, canonicalGitRoot, replaced, "session");
    if (y && !(await isLockHolderProcess(cwd, canonicalGitRoot)))
      logForDebugging(`[worktree] bg boot: adopted ${cwd} but no worktree lock names this process`, {
        level: "warn",
      });
  }
  if (!y) return null;
  if (worktreePath === undefined) {
    if (await isLockHolderProcess(cwd, canonicalGitRoot))
      registerCleanup(() => releaseOwnWorktreeLock(cwd, canonicalGitRoot));
    return null;
  }
  let n = {
    originalCwd: canonicalGitRoot,
    worktreePath: cwd,
    worktreeName: replaced,
    worktreeBranch: worktreeBranchName(replaced),
    originalHeadCommit: (await readWorktreeBaseline(cwd)) ?? undefined,
    sessionId: getSessionId(),
    hookBased: false,
    enteredExisting: false,
  };
  restoreWorktreeSession(n);
  saveWorktreeState(n);
  return n;
}
//@ chunk-fhdzwff4.js:15976-16059 sole-consumer
/**
 * 当前进程是否持有该 worktree 的锁。
 */
async function isLockHolderProcess(cwd, canonicalGitRoot) {
  try {
    return claudeWorktreeLockPid(await readWorktreeLockReason(cwd, canonicalGitRoot)) === process.pid;
  } catch {
    return false;
  }
}
//@ chunk-fhdzwff4.js:16059-24868 fingerprint = setup (0.523)
/**
 * setup(cwd, permissionMode, …)：检查 Node≥22、后台 worker 抢控制终端、--session-id 切换会话、跨会话消息 UDS、恢复 iTerm2/Terminal.app 备份、chdir、捕获钩子快照、文件监视、--worktree（含 tmux）创建与切换、锁定当前版本、插件钩子预加载、上报 tengu_started 等。
 */
async function setup(
  cwd,
  permissionMode,
  allowDangerouslySkipPermissions,
  _,
  worktreeName,
  tmuxEnabled,
  b,
  S,
  y,
  n,
  E,
  O,
  oe = true,
) {
  initManagedModulesPending();
  logForDiagnosticsNoPII("info", "setup_started");
  let nodeVersion = process.version.match(/^v(\d+)\./)?.[1];
  if (!nodeVersion || parseInt(nodeVersion) < 22) {
    console.error(sequential.bold.red("Error: Claude Code requires Node.js version 22 or higher."));
    process.exit(1);
  }
  if (env.CLAUDE_BG_BACKEND === "daemon") {
    let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_worker_ctty", true)
      ? await acquireControllingTty()
      : (await hasControllingTty())
        ? "already"
        : "switched_off";
    switch (
      (logForDiagnosticsNoPII("info", "bg_worker_ctty", {
        outcome: e,
      }),
      e)
    ) {
      case "acquired":
        markOwnsControllingTerminal();
        logFeatureOk("bg_worker_ctty");
        break;
      case "already":
        markOwnsControllingTerminal();
        break;
      case "failed":
        logFeatureSad("bg_worker_ctty", e);
        break;
      case "ffi_unavailable":
      case "not_a_tty":
        logFeatureSad("bg_worker_ctty", e);
        break;
      case "unsupported":
      case "switched_off":
        break;
    }
  }
  if (b) switchSession(identityAgentId(b), "startup_custom_id");
  udsEnv.unset("CLAUDE_CODE_MESSAGING_SOCKET");
  udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN");
  if (!isBareMode() || y !== undefined)
    if (isRestrictedSession())
      logForDebugging(
        y === undefined
          ? "[uds-messaging] Skipped: restricted session"
          : "[uds-messaging] Skipped: restricted session (--messaging-socket-path ignored)",
      );
    else if (!isCrossSessionMessagingEnabled()) {
      if (!getIsRemoteMode()) {
        if (y !== undefined) {
          let e = await import("./chunk-cgamr0t5.js");
          await e.validateExplicitMessagingSocketPath(y);
        }
        logForDebugging(
          "[uds-messaging] Skipped: cross-session messaging gate off (will late-bind if a GrowthBook refresh enables it)",
        );
        bindInboxOnFlagRefresh(y, n);
      } else logForDebugging("[uds-messaging] Skipped: cross-session messaging gate off");
    } else if (getIsRemoteMode()) logForDebugging("[uds-messaging] Skipped: remote thin client");
    else {
      let startTime = performance.now();
      profileCheckpoint("setup_uds_start");
      ownProcStartAsync().catch(() => {});
      ownPidDomain().catch(() => {});
      let u = await import("./chunk-cgamr0t5.js");
      profileCheckpoint("setup_uds_imported");
      let C = await u.startCrossSessionInbox(y, n, {
        profileStartup: true,
      });
      profileCheckpoint("setup_uds_end");
      if (C) {
        let udsStartDegradedCause = u.getUdsStartDegradedCause();
        if (udsStartDegradedCause) logFeatureSad("agents_cross_session_inbox", udsStartDegradedCause);
        else logFeatureOk("agents_cross_session_inbox");
      } else logFeatureBad("agents_cross_session_inbox", u.getUdsStartFailureCause() ?? "bind_failed");
      let P = performance.now() - startTime;
      recordPhase("setup_uds_messaging_ms", P, startTime);
      logEvent("tengu_uds_startup_bind", {
        durationMs: Math.round(P),
        bound: !!C,
      });
    }
  if (process.env.CLAUDE_BG_BACKEND === "daemon") {
    let { startRendezvousServer } = await import("./chunk-bc1hsbps.js");
    startRendezvousServer(n);
  }
  await captureTeammateModeSnapshotIfEnabled();
  {
    let { installObserverSpawner } = await import("./chunk-3h5pdzw6.js");
    installObserverSpawner(getRootSession());
  }
  if (!getIsNonInteractiveSession()) {
    if (isAgentSwarmsEnabled()) {
      let restoredIterm2Backup = await checkAndRestoreITerm2Backup(n);
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
      let restoredTerminalBackup = await checkAndRestoreTerminalBackup(n);
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
  if (isStorageV5Enabled() && n !== undefined) await updateHooksConfigSnapshotThroughBackend(n);
  else captureHooksConfigSnapshotFromLoadedSettings();
  recordPhase("setup_hooks_snapshot_ms", performance.now() - hooksStart, hooksStart);
  logForDiagnosticsNoPII("info", "setup_hooks_captured", {
    duration_ms: Math.round(performance.now() - hooksStart),
  });
  if (!getIsRemoteMode()) {
    let startTime = performance.now();
    initialize(cwd, n, E);
    recordPhase("setup_file_watcher_ms", performance.now() - startTime, startTime);
  }
  let startTime = performance.now();
  if (_) {
    setInlinePlugins(getInlinePlugins().map((h) => resolve(h)));
    setInlinePluginsNoMcp(getInlinePluginsNoMcp().map((h) => resolve(h)));
    if (isPluginInstallBypassed() || env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL)
      logForDebugging(
        "plugin worktree hooks not registered before creating the worktree: startup lists no plugins here",
      );
    else {
      let { registerPluginWorktreeHooks } = await import("./chunk-c7p56eem.js");
      await registerPluginWorktreeHooks(n, E).catch((error) => {
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
    let slug = S?.number ? `pr-${S.number}` : (worktreeName ?? getPlanSlug());
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
      tmuxSessionName = tmuxEnabled
        ? generateTmuxSessionName(mainRepoRoot, worktreeBranchName(slug))
        : undefined;
    } else
      tmuxSessionName = tmuxEnabled ? generateTmuxSessionName(getCwd(), worktreeBranchName(slug)) : undefined;
    let x;
    try {
      x = await createWorktreeForSession(getSessionId(), slug, tmuxSessionName, {
        prNumber: S?.number,
        prForge: S?.forge,
        resumeAsIs: O,
        fromCwd: cwd,
        repoRoot: mainRepoRoot ?? undefined,
        storageV5: n,
        credentials: E,
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
      tmux_enabled: tmuxEnabled,
      ...(O && {
        for_cloud_attach: true,
        ...(!x.hookBased && {
          resumed_existing: x.resumedExisting === true,
        }),
      }),
    });
    let L = false;
    if (tmuxEnabled && tmuxSessionName) {
      let tmuxResult = await createTmuxSessionForWorktree(tmuxSessionName, x.worktreePath);
      if (tmuxResult.created) {
        L = true;
        console.log(
          sequential.green(`Created tmux session: ${sequential.bold(tmuxSessionName)}
To attach: ${sequential.bold(`tmux attach -t ${tmuxSessionName}`)}`),
        );
      } else console.error(sequential.yellow(`Warning: Failed to create tmux session: ${tmuxResult.error}`));
    }
    try {
      processChdir(x.worktreePath);
    } catch (error) {
      let mainRepoRoot = sanitizeErrnoForTelemetry(error);
      if (!mainRepoRoot) throw error;
      let R;
      if (mainRepoRoot === "ENOENT" || mainRepoRoot === "ENOTDIR")
        R = x.hookBased
          ? "does not exist or is not a directory. The path came from a " +
            "WorktreeCreate hook \u2014 the hook must print the directory it " +
            "created as the last line of its stdout."
          : "does not exist or is not a directory. It may have been removed out from under this session; retrying will recreate it.";
      else if (mainRepoRoot === "EACCES" || mainRepoRoot === "EPERM")
        R = `is not accessible (${mainRepoRoot}). Check the directory's permissions.`;
      else R = `cannot be entered (${errorMessage(error)}).`;
      process.stderr.write(
        sequential.red(`Error: worktree directory ${x.worktreePath} ${R}
`),
      );
      logError(error);
      if (L && tmuxSessionName) await killTmuxSession(tmuxSessionName);
      setBgExitCause(`worktree_chdir:${mainRepoRoot}`);
      await flushAnalyticsSinks();
      process.exit(1);
    }
    setCwd(x.worktreePath);
    setOriginalCwd(getCwd());
    setProjectRoot(getCwd());
    if (oe) reanchorGitFileWatcher();
    saveWorktreeState(x);
    clearMemoryFilesCacheForHost();
    if (isStorageV5Enabled() && n !== undefined) await updateHooksConfigSnapshotThroughBackend(n);
    else updateHooksConfigSnapshot();
    getPlansDirectory.cache.clear?.();
    primePlanSlugCollisions(n);
    recordPhase("setup_worktree_ms", performance.now() - startTime, startTime);
  } else if (isBgSession() && !getCurrentWorktreeSession()) {
    let startTime = performance.now();
    try {
      let bgJobDir = getBgJobDir();
      let options = bgJobDir ? await (await import("./chunk-bytagq68.js")).readJobState(bgJobDir, n) : null;
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
  let te = isSyncPluginInstallMode();
  if (!isPluginInstallBypassed()) {
    if (shouldFillPluginLoadWithStore(E)) loadAllPluginsCacheOnly(n, E).catch(() => {});
    warmCommandSourceCaches(getProjectRoot(), n);
  }
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.hookRegistrationOwed = pluginRegistry.hookRegistrationEpoch === 0;
  pluginRegistry.hooksLoadAtStartup = import("./chunk-c7p56eem.js").then((e) => {
    if (te) return;
    let u = e.loadPluginHooks(n, E).catch((error) => {
      logForDebugging(`plugin hooks prefetch: ${errorMessage(error)}`);
    });
    try {
      e.setupPluginHookHotReload(n, E);
    } catch (error) {
      return logThenRethrow(u, error);
    }
    return u;
  });
  if (!isBareMode()) {
    import("./chunk-a3vwvaw0.js").then((m) => m.registerSessionFileAccessHooks());
    import("./chunk-e9cc3yq9.js").then((e) => e.registerUltrareviewPostCommitHook());
    import("./chunk-m2yw48pg.js").then((m) => m.registerWebSetupPostPushHook());
    if (!getIsRemoteMode() && checkHasTrustDialogAccepted())
      import("./chunk-6cezjbyv.js").then((m) => m.startMemoryWatcher(n, E));
  }
  initSinks();
  logEvent("tengu_started", {
    trigger_id: sanitizeMarkName(env.CLAUDE_CODE_TRIGGER_ID),
    worktree_flag: _,
    tmux_flag: tmuxEnabled,
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
    let u = [
      loadCustomThemes(n),
      ...(isStorageV5Enabled() && n !== undefined ? [warmKeybindingsFromBackend(keybindingsState, n)] : []),
    ];
    if (!isBareMode() && !getIsNonInteractiveSession()) u.push(fetchReleaseNotes(undefined, n));
    await Promise.all(u);
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
function alwaysFalseHt(o) {
  return false;
}
//@ chunk-fhdzwff4.js:24892-24916 sole-consumer
/**
 * 恒返回 false 的占位判断。
 */
function alwaysFalseOt(o) {
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
function prewarmMemoryRecall(o) {
  if (!memoryPrewarmClaimSlots.of(o.host).claim()) return;
  if (getIsRemoteMode() || !checkHasTrustDialogAccepted()) return;
  (async () => {
    let [memdirModule, recallModule, _] = await Promise.all([
      import("./chunk-5bkgthks.js"),
      import("./chunk-5051d7ze.js"),
      import("./chunk-xbqr939z.js"),
    ]);
    if (
      !process.argv.some(
        (arg) =>
          /^-(?!-)[A-Za-z]*[cr]/.test(arg) ||
          ["--resume", "--continue", "--from-pr"].some((p) => arg === p || arg.startsWith(`${p}=`)),
      ) &&
      recallModule.loadedIndexExclusions() === null &&
      memdirModule.isAutoMemoryEnabled() &&
      !_.isAutoMemReadFenced() &&
      memdirModule.isMemoryRecallEnabled() &&
      memdirModule.isIndexRecallEnabled()
    ) {
      let w = await import("./chunk-vp5gef34.js");
      let p = await import("./chunk-n61y4e8f.js");
      let b = await import("./chunk-g13qtecd.js");
      let S = await import("./chunk-r9fd71r4.js");
      let y = await import("./chunk-q86bmmjg.js");
      if (b.isMultiStoreSyncAvailable() || y.hasOrgMemoryDecisionRunStarted()) {
        await p.waitForOrgMemoryDecisionSettled(
          S.FIRST_STORE_PULL_WAIT_DEADLINE_MS,
          new AbortController().signal,
        );
        if (p.getOrgMemoryDecision().state === "undecided") return;
      }
      await memdirModule.getAutoMemPathState().warmCanonicalWcRoot();
      let n = recallModule.recallVisibleTeamMounts(memdirModule.getAutoMemPath());
      w.prewarmMemoryIndex(o, memdirModule.getAutoMemPath(), memdirModule.activeSessionLogExcluder(), (E) =>
        recallModule.isRecallVisiblePath(E, n),
      );
    }
  })().catch((error) => logForDebugging(`recall prewarm skipped: ${errorMessage(error)}`));
}
