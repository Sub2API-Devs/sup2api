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
import { resolve, resolve as resolve_2, basename } from "path";
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
import { o$t } from "./utils/crossSessionInbound/inboundMode.js";
import { env, udsEnv } from "./utils/env.js";
import { isBareMode, isSafeMode } from "./utils/envUtils.js";
import { mXn } from "./utils/worktree/worktreeRegistrations.js";
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
import { LE } from "./utils/agentId.js";
import { profileCheckpoint } from "./utils/startupProfiler.js";
import { ownProcStartAsync } from "./utils/processIdentity.js";
import { ownPidDomain } from "./utils/pidSpace.js";
import { Br } from "./utils/startupTiming.js";
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
import { ye } from "./utils/startupMarks.js";
import { configureProxyAuthHelperFromSettings } from "./utils/auth/proxyAuthHelperConfig.js";
import { prefetchProxyAuthFromHelperIfSafe } from "./utils/proxy.js";
import { c7s } from "./utils/fullscreen.js";
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
  let r = !1,
    _ = onGrowthBookRefresh(() => {
      if (
        r ||
        isShuttingDown() ||
        getIsRemoteMode() ||
        isRestrictedSession() ||
        !isCrossSessionMessagingEnabled()
      )
        return;
      return ((r = !0), _(), lateBindCrossSessionInbox(o, s));
    });
  return (registerCleanup(async () => _()), _);
}
/**
 * 开关在启动后打开时补绑定跨会话收件箱
 */
//@ chunk-fhdzwff4.js:13043-13979 placement
async function lateBindCrossSessionInbox(o, s) {
  let r = await import("./chunk-cgamr0t5.js"),
    _;
  try {
    _ = await r.startCrossSessionInbox(o, s);
  } catch (error) {
    if (error instanceof CliUserError)
      logForDebugging(`[uds-messaging] Late bind refused: ${error.message}`, { level: "warn" });
    else logError(error);
    logFeatureBad("agents_cross_session_inbox", `${r.getUdsStartFailureCause() ?? "bind_failed"}_late`);
    return;
  }
  if (!_) {
    logFeatureBad("agents_cross_session_inbox", `${r.getUdsStartFailureCause() ?? "bind_failed"}_late`);
    return;
  }
  if (isTerminalShutdown()) {
    (await _(),
      logForDebugging("[uds-messaging] Late bind landed during shutdown \u2014 torn down, not published"),
      logFeatureSad("agents_cross_session_inbox", "shutdown_discarded"));
    return;
  }
  (logForDebugging("[uds-messaging] Late bind: gate enabled by a GrowthBook refresh after startup"), o$t());
  let udsStartDegradedCause = r.getUdsStartDegradedCause();
  if (udsStartDegradedCause)
    logFeatureSad("agents_cross_session_inbox", udsStartDegradedCause, { bind_late: !0 });
  else logFeatureOk("agents_cross_session_inbox", { bind_late: !0 });
  let { updateSessionMessagingSocketPath: updateSessionMessagingSocketPath } =
      await import("./chunk-gtq2y7h2.js"),
    udsMessagingSocketPath = r.getUdsMessagingSocketPath();
  if (udsMessagingSocketPath !== void 0) await updateSessionMessagingSocketPath(udsMessagingSocketPath, s);
}
//@ chunk-fhdzwff4.js:13979-14030 placement
function se(o, s) {
  return (
    logError(s),
    o.then(() => {
      throw s;
    })
  );
}
//@ chunk-fhdzwff4.js:14030-14087 placement
var N = () => getIsNonInteractiveSession() && env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL && !isBareMode();
//@ chunk-fhdzwff4.js:14087-14113 placement
var X = () => N() || isBareMode() || isSafeMode();
/**
 * 后台会话启动时接管所在的代理 worktree：确认是规范 git 根下的关联 worktree 且 slug 合法，检查状态后加锁（必要时重试），恢复并保存 worktree 会话状态。
 */
//@ chunk-fhdzwff4.js:15033-15976 sole-consumer
async function adoptBackgroundWorktree(cwd, options) {
  let r = options?.worktreePath || void 0;
  if (options?.worktreeHookBased || (r === void 0 && !mXn())) return null;
  let _ = await realpath(cwd).catch(() => cwd);
  if (!(r === void 0 || r === cwd || r === _ || resolve_2(r) === _)) return null;
  let p = findCanonicalGitRoot(cwd);
  if (!p || !isLinkedWorktree(cwd) || !isAgentWorktreeOf(cwd, p)) return null;
  let replaced = basename(cwd).replaceAll("+", "/");
  try {
    validateWorktreeSlug(replaced);
  } catch {
    return null;
  }
  let S = await checkWorktreeIsolation(cwd, [], gitRootsForPath(cwd, p));
  if (!S.ok)
    return (
      logForDebugging(`[worktree] bg boot: not adopting ${cwd} \u2014 ${S.message}`, { level: "warn" }),
      null
    );
  if (r === void 0 && !(await isWorktreeMadeElsewhere(cwd))) return null;
  let y = await lockClaudeWorktree(cwd, p, replaced, "session");
  if (!y || !(await H(cwd, p))) {
    if (
      (await sleep(250), (y = await lockClaudeWorktree(cwd, p, replaced, "session")), y && !(await H(cwd, p)))
    )
      logForDebugging(`[worktree] bg boot: adopted ${cwd} but no worktree lock names this process`, {
        level: "warn",
      });
  }
  if (!y) return null;
  if (r === void 0) {
    if (await H(cwd, p)) registerCleanup(() => releaseOwnWorktreeLock(cwd, p));
    return null;
  }
  let n = {
    originalCwd: p,
    worktreePath: cwd,
    worktreeName: replaced,
    worktreeBranch: worktreeBranchName(replaced),
    originalHeadCommit: (await readWorktreeBaseline(cwd)) ?? void 0,
    sessionId: getSessionId(),
    hookBased: !1,
    enteredExisting: !1,
  };
  return (restoreWorktreeSession(n), saveWorktreeState(n), n);
}
//@ chunk-fhdzwff4.js:15976-16059 sole-consumer
async function H(o, s) {
  try {
    return claudeWorktreeLockPid(await readWorktreeLockReason(o, s)) === process.pid;
  } catch {
    return !1;
  }
}
/**
 * setup(cwd, permissionMode, …)：检查 Node≥22、后台 worker 抢控制终端、--session-id 切换会话、跨会话消息 UDS、恢复 iTerm2/Terminal.app 备份、chdir、捕获钩子快照、文件监视、--worktree（含 tmux）创建与切换、锁定当前版本、插件钩子预加载、上报 tengu_started 等。
 */
//@ chunk-fhdzwff4.js:16059-24868 fingerprint = setup (0.523)
async function setup(o, s, r, _, w, p, b, S, y, n, E, O, oe = !0) {
  (initManagedModulesPending(), logForDiagnosticsNoPII("info", "setup_started"));
  let nodeVersion = process.version.match(/^v(\d+)\./)?.[1];
  if (!nodeVersion || parseInt(nodeVersion) < 22)
    (console.error(sequential.bold.red("Error: Claude Code requires Node.js version 22 or higher.")),
      process.exit(1));
  if (env.CLAUDE_BG_BACKEND === "daemon") {
    let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_bg_worker_ctty", !0)
      ? await acquireControllingTty()
      : (await hasControllingTty())
        ? "already"
        : "switched_off";
    switch ((logForDiagnosticsNoPII("info", "bg_worker_ctty", { outcome: e }), e)) {
      case "acquired":
        (markOwnsControllingTerminal(), logFeatureOk("bg_worker_ctty"));
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
  if (b) switchSession(LE(b), "startup_custom_id");
  if (
    (udsEnv.unset("CLAUDE_CODE_MESSAGING_SOCKET"),
    udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN"),
    !isBareMode() || y !== void 0)
  )
    if (isRestrictedSession())
      logForDebugging(
        y === void 0
          ? "[uds-messaging] Skipped: restricted session"
          : "[uds-messaging] Skipped: restricted session (--messaging-socket-path ignored)",
      );
    else if (!isCrossSessionMessagingEnabled())
      if (!getIsRemoteMode()) {
        if (y !== void 0) {
          let e = await import("./chunk-cgamr0t5.js");
          await e.validateExplicitMessagingSocketPath(y);
        }
        (logForDebugging(
          "[uds-messaging] Skipped: cross-session messaging gate off (will late-bind if a GrowthBook refresh enables it)",
        ),
          bindInboxOnFlagRefresh(y, n));
      } else logForDebugging("[uds-messaging] Skipped: cross-session messaging gate off");
    else if (getIsRemoteMode()) logForDebugging("[uds-messaging] Skipped: remote thin client");
    else {
      let startTime = performance.now();
      (profileCheckpoint("setup_uds_start"),
        ownProcStartAsync().catch(() => {}),
        ownPidDomain().catch(() => {}));
      let u = await import("./chunk-cgamr0t5.js");
      profileCheckpoint("setup_uds_imported");
      let startCrossSessionInbox = await u.startCrossSessionInbox(y, n, { profileStartup: !0 });
      if ((profileCheckpoint("setup_uds_end"), startCrossSessionInbox)) {
        let udsStartDegradedCause = u.getUdsStartDegradedCause();
        if (udsStartDegradedCause) logFeatureSad("agents_cross_session_inbox", udsStartDegradedCause);
        else logFeatureOk("agents_cross_session_inbox");
      } else logFeatureBad("agents_cross_session_inbox", u.getUdsStartFailureCause() ?? "bind_failed");
      let P = performance.now() - startTime;
      (Br("setup_uds_messaging_ms", P, startTime),
        logEvent("tengu_uds_startup_bind", { durationMs: Math.round(P), bound: !!startCrossSessionInbox }));
    }
  if (process.env.CLAUDE_BG_BACKEND === "daemon") {
    let { startRendezvousServer: startRendezvousServer } = await import("./chunk-bc1hsbps.js");
    startRendezvousServer(n);
  }
  await captureTeammateModeSnapshotIfEnabled();
  {
    let { installObserverSpawner: installObserverSpawner } = await import("./chunk-3h5pdzw6.js");
    installObserverSpawner(getRootSession());
  }
  if (!getIsNonInteractiveSession()) {
    if (isAgentSwarmsEnabled()) {
      let e = await checkAndRestoreITerm2Backup(n);
      if (e.status === "restored")
        console.log(
          sequential.yellow(
            "Detected an interrupted iTerm2 setup. Your original settings have been restored. You may need to restart iTerm2 for the changes to take effect.",
          ),
        );
      else if (e.status === "failed")
        console.error(
          sequential.red(
            `Failed to restore iTerm2 settings. Please manually restore your original settings with: defaults import com.googlecode.iterm2 ${e.backupPath}.`,
          ),
        );
    }
    try {
      let e = await checkAndRestoreTerminalBackup(n);
      if (e.status === "restored")
        console.log(
          sequential.yellow(
            "Detected an interrupted Terminal.app setup. Your original settings have been restored. You may need to restart Terminal.app for the changes to take effect.",
          ),
        );
      else if (e.status === "failed")
        console.error(
          sequential.red(
            `Failed to restore Terminal.app settings. Please manually restore your original settings with: defaults import com.apple.Terminal ${e.backupPath}.`,
          ),
        );
    } catch (error) {
      logError(error);
    }
  }
  try {
    setCwd(o);
  } catch (error) {
    (process.stderr.write(
      sequential.red(`Error: Can't access working directory ${sequential.bold(o)}: ${errorMessage(error)}
`),
    ),
      setBgExitCause("setcwd"),
      process.exit(1));
  }
  let hooksStart = performance.now();
  if (isStorageV5Enabled() && n !== void 0) await updateHooksConfigSnapshotThroughBackend(n);
  else captureHooksConfigSnapshotFromLoadedSettings();
  if (
    (Br("setup_hooks_snapshot_ms", performance.now() - hooksStart, hooksStart),
    logForDiagnosticsNoPII("info", "setup_hooks_captured", {
      duration_ms: Math.round(performance.now() - hooksStart),
    }),
    !getIsRemoteMode())
  ) {
    let startTime = performance.now();
    (initialize(o, n, E), Br("setup_file_watcher_ms", performance.now() - startTime, startTime));
  }
  let startTime = performance.now();
  if (_) {
    if (
      (setInlinePlugins(getInlinePlugins().map((h) => resolve(h))),
      setInlinePluginsNoMcp(getInlinePluginsNoMcp().map((h) => resolve(h))),
      X() || env.CLAUDE_CODE_SYNC_PLUGIN_INSTALL)
    )
      logForDebugging(
        "plugin worktree hooks not registered before creating the worktree: startup lists no plugins here",
      );
    else {
      let { registerPluginWorktreeHooks: registerPluginWorktreeHooks } = await import("./chunk-c7p56eem.js");
      await registerPluginWorktreeHooks(n, E).catch((A) => {
        logForDebugging(
          `plugin worktree hooks not registered before creating the worktree (a plugin's WorktreeCreate hook will not run): ${errorMessage(A)}`,
          { level: "warn" },
        );
      });
    }
    let hasHook = hasWorktreeCreateHook(),
      inGit = await getIsGit();
    if (!hasHook && !inGit)
      (process.stderr.write(
        sequential.red(`Error: Can only use --worktree in a git repository, but ${sequential.bold(o)} is not a git repository. Configure a WorktreeCreate hook to use --worktree with other VCS systems.
`),
      ),
        process.exit(1));
    let C = S?.number ? `pr-${S.number}` : (w ?? getPlanSlug()),
      P,
      I = null;
    if (inGit) {
      if (((I = findCanonicalGitRoot(getCwd())), !I))
        (process.stderr.write(
          sequential.red(`Error: Could not determine the main git repository root.
`),
        ),
          process.exit(1));
      if (isLinkedWorktree(getCwd()))
        (logForDiagnosticsNoPII("info", "worktree_resolved_to_main_repo"), processChdir(I), setCwd(I));
      P = p ? generateTmuxSessionName(I, worktreeBranchName(C)) : void 0;
    } else P = p ? generateTmuxSessionName(getCwd(), worktreeBranchName(C)) : void 0;
    let x;
    try {
      x = await createWorktreeForSession(getSessionId(), C, P, {
        prNumber: S?.number,
        prForge: S?.forge,
        resumeAsIs: O,
        fromCwd: o,
        repoRoot: I ?? void 0,
        storageV5: n,
        credentials: E,
      });
    } catch (error) {
      (process.stderr.write(
        sequential.red(`Error creating worktree: ${errorMessage(error)}
`),
      ),
        setBgExitCause("worktree_create"),
        process.exit(1));
    }
    logEvent("tengu_worktree_created", {
      tmux_enabled: p,
      ...(O && { for_cloud_attach: !0, ...(!x.hookBased && { resumed_existing: x.resumedExisting === !0 }) }),
    });
    let L = !1;
    if (p && P) {
      let h = await createTmuxSessionForWorktree(P, x.worktreePath);
      if (h.created)
        ((L = !0),
          console.log(
            sequential.green(`Created tmux session: ${sequential.bold(P)}
To attach: ${sequential.bold(`tmux attach -t ${P}`)}`),
          ));
      else console.error(sequential.yellow(`Warning: Failed to create tmux session: ${h.error}`));
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
      if (
        (process.stderr.write(
          sequential.red(`Error: worktree directory ${x.worktreePath} ${R}
`),
        ),
        logError(error),
        L && P)
      )
        await killTmuxSession(P);
      (setBgExitCause(`worktree_chdir:${mainRepoRoot}`), await flushAnalyticsSinks(), process.exit(1));
    }
    if ((setCwd(x.worktreePath), setOriginalCwd(getCwd()), setProjectRoot(getCwd()), oe))
      reanchorGitFileWatcher();
    if ((saveWorktreeState(x), clearMemoryFilesCacheForHost(), isStorageV5Enabled() && n !== void 0))
      await updateHooksConfigSnapshotThroughBackend(n);
    else updateHooksConfigSnapshot();
    (getPlansDirectory.cache.clear?.(),
      primePlanSlugCollisions(n),
      Br("setup_worktree_ms", performance.now() - startTime, startTime));
  } else if (isBgSession() && !getCurrentWorktreeSession()) {
    let startTime = performance.now();
    try {
      let u = getBgJobDir(),
        C = u ? await (await import("./chunk-bytagq68.js")).readJobState(u, n) : null;
      await adoptBackgroundWorktree(o, C);
    } catch (error) {
      logForDebugging(`[worktree] bg adopt-time reclaim skipped: ${errorMessage(error)}`);
    }
    Br("setup_bg_worktree_adopt_ms", performance.now() - startTime, startTime);
  }
  (logForDiagnosticsNoPII("info", "setup_background_jobs_starting"),
    lockCurrentVersion(),
    logForDiagnosticsNoPII("info", "setup_background_jobs_launched"),
    profileCheckpoint("setup_before_prefetch"),
    logForDiagnosticsNoPII("info", "setup_prefetch_starting"));
  let te = N();
  if (!X()) {
    if (shouldFillPluginLoadWithStore(E)) loadAllPluginsCacheOnly(n, E).catch(() => {});
    warmCommandSourceCaches(getProjectRoot(), n);
  }
  let F = getPluginRegistry();
  if (
    ((F.hookRegistrationOwed = F.hookRegistrationEpoch === 0),
    (F.hooksLoadAtStartup = import("./chunk-c7p56eem.js").then((e) => {
      if (te) return;
      let u = e.loadPluginHooks(n, E).catch((C) => {
        logForDebugging(`plugin hooks prefetch: ${errorMessage(C)}`);
      });
      try {
        e.setupPluginHookHotReload(n, E);
      } catch (error) {
        return se(u, error);
      }
      return u;
    })),
    !isBareMode())
  ) {
    if (
      (import("./chunk-a3vwvaw0.js").then((e) => e.registerSessionFileAccessHooks()),
      import("./chunk-e9cc3yq9.js").then((e) => e.registerUltrareviewPostCommitHook()),
      import("./chunk-m2yw48pg.js").then((e) => e.registerWebSetupPostPushHook()),
      !getIsRemoteMode() && checkHasTrustDialogAccepted())
    )
      import("./chunk-6cezjbyv.js").then((e) => e.startMemoryWatcher(n, E));
  }
  if (
    (initSinks(),
    logEvent("tengu_started", {
      trigger_id: ye(env.CLAUDE_CODE_TRIGGER_ID),
      worktree_flag: _,
      tmux_flag: p,
      in_tmux_worktree: Boolean(env.CLAUDE_CODE_TMUX_SESSION && env.TMUX),
    }),
    ke(),
    configureProxyAuthHelperFromSettings(),
    prefetchProxyAuthFromHelperIfSafe(),
    shouldShowStartupDialogs({
      isNonInteractiveSession: getIsNonInteractiveSession(),
      isRemoteMode: getIsRemoteMode(),
      isBareMode: isBareMode(),
      exitAfterFirstRender: env.CLAUDE_CODE_EXIT_AFTER_FIRST_RENDER,
      trustAccepted: checkHasTrustDialogAccepted(),
    }))
  )
    c7s();
  profileCheckpoint("setup_after_prefetch");
  {
    let startTime = performance.now(),
      u = [
        loadCustomThemes(n),
        ...(isStorageV5Enabled() && n !== void 0 ? [warmKeybindingsFromBackend(keybindingsState, n)] : []),
      ];
    if (!isBareMode() && !getIsNonInteractiveSession()) u.push(fetchReleaseNotes(void 0, n));
    (await Promise.all(u), Br("setup_release_notes_ms", performance.now() - startTime, startTime));
  }
  if (s === "bypassPermissions" || r) {
    if (
      typeof process.getuid === "function" &&
      process.getuid() === 0 &&
      process.env.IS_SANDBOX !== "1" &&
      !env.CLAUDE_CODE_BUBBLEWRAP
    )
      (console.error(
        "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
      ),
        await writeStartupFailureResult({
          sessionId: getSessionId(),
          message:
            "--dangerously-skip-permissions cannot be used with root/sudo privileges for security reasons",
          reason: "bypass_root",
        }),
        process.exit(1));
  }
  let projectConfig = getCurrentProjectConfig();
  if (projectConfig.lastCost !== void 0 && projectConfig.lastDuration !== void 0)
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
      last_session_graceful_shutdown: projectConfig.lastGracefulShutdown ?? !1,
      last_session_version_base: sanitizeVersion(projectConfig.lastVersionBase),
      last_session_id: ye(projectConfig.lastSessionId),
      ...projectConfig.lastSessionMetrics,
    });
}
//@ chunk-fhdzwff4.js:24868-24892 sole-consumer
function Ht(o) {
  return !1;
}
//@ chunk-fhdzwff4.js:24892-24916 sole-consumer
function Ot(o) {
  return !1;
}
//@ chunk-fhdzwff4.js:24916-24955 sole-consumer
function ke() {
  if (isStoredLoginPinned()) return;
  prefetchApiKeyFromApiKeyHelperIfSafe(getIsNonInteractiveSession());
}
/**
 * 判断是否显示启动对话框（交互、非远程、非 bare、不在首帧后退出且已信任）。
 */
//@ chunk-fhdzwff4.js:24955-25087 sole-consumer
function shouldShowStartupDialogs({
  isNonInteractiveSession: isNonInteractiveSession,
  isRemoteMode: isRemoteMode,
  isBareMode: isBareMode,
  exitAfterFirstRender: exitAfterFirstRender,
  trustAccepted: trustAccepted,
}) {
  return !isNonInteractiveSession && !isRemoteMode && !isBareMode && !exitAfterFirstRender && trustAccepted;
}
//@ chunk-fhdzwff4.js:25087-25161 sole-consumer
class ee {
  fired = !1;
  claim() {
    if (this.fired) return !1;
    return ((this.fired = !0), !0);
  }
}
//@ chunk-fhdzwff4.js:25161-25186 sole-consumer
var be = new HostScoped(() => new ee());
/**
 * 交互会话（非恢复/继续）在信任已接受、记忆与索引召回开启时，后台预热记忆索引；有组织记忆决策时先等待决策落定。每宿主只做一次。
 */
//@ chunk-fhdzwff4.js:25186-26353 sole-consumer
function prewarmMemoryRecall(o) {
  if (!be.of(o.host).claim()) return;
  if (getIsRemoteMode() || !checkHasTrustDialogAccepted()) return;
  (async () => {
    let [memdirModule, recallModule, _] = await Promise.all([
      import("./chunk-5bkgthks.js"),
      import("./chunk-5051d7ze.js"),
      import("./chunk-xbqr939z.js"),
    ]);
    if (
      !process.argv.some(
        (w) =>
          /^-(?!-)[A-Za-z]*[cr]/.test(w) ||
          ["--resume", "--continue", "--from-pr"].some((p) => w === p || w.startsWith(`${p}=`)),
      ) &&
      recallModule.loadedIndexExclusions() === null &&
      memdirModule.isAutoMemoryEnabled() &&
      !_.isAutoMemReadFenced() &&
      memdirModule.isMemoryRecallEnabled() &&
      memdirModule.isIndexRecallEnabled()
    ) {
      let w = await import("./chunk-vp5gef34.js"),
        p = await import("./chunk-n61y4e8f.js"),
        b = await import("./chunk-g13qtecd.js"),
        S = await import("./chunk-r9fd71r4.js"),
        y = await import("./chunk-q86bmmjg.js");
      if (b.isMultiStoreSyncAvailable() || y.hasOrgMemoryDecisionRunStarted()) {
        if (
          (await p.waitForOrgMemoryDecisionSettled(
            S.FIRST_STORE_PULL_WAIT_DEADLINE_MS,
            new AbortController().signal,
          ),
          p.getOrgMemoryDecision().state === "undecided")
        )
          return;
      }
      await memdirModule.getAutoMemPathState().warmCanonicalWcRoot();
      let recallVisibleTeamMounts = recallModule.recallVisibleTeamMounts(memdirModule.getAutoMemPath());
      w.prewarmMemoryIndex(o, memdirModule.getAutoMemPath(), memdirModule.activeSessionLogExcluder(), (E) =>
        recallModule.isRecallVisiblePath(E, recallVisibleTeamMounts),
      );
    }
  })().catch((s) => logForDebugging(`recall prewarm skipped: ${errorMessage(s)}`));
}
