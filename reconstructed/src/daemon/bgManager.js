/**
 * daemon/bgManager.ts
 *
 * 2.1.316 新增：后台管理器（bg manager）入口：监听、过期检查、空闲退出、升级。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ss669z1x.js (3)
 * attribution: placement 3
 */
import { isRunningFromVersionsDir, getLaunchCommand } from "../utils/deepLink/registerProtocol.js";
import { isSyscallError, getErrnoCode, toError } from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { initialize } from "./daemonConfigWatcher.js";
import { createDaemonAuthManager } from "./daemonAuth.js";
import {
  Vr,
  Mt,
  jr,
  Gr,
  openBgDispatchLog,
  Fr,
  runBgManagerLoop,
  runDaemonSupervisor,
} from "./bgDispatch.js";
import { credentialsStoreFor } from "../utils/secureStorage/credentialsFileStore.js";
import {
  initializeGrowthBook,
  getFeatureValue_CACHED_MAY_BE_STALE,
} from "../services/analytics/growthbook.js";
import {
  readLiveServerLock,
  LOCK_PROBE_LIMITS,
  KOr,
  writeDaemonLockRemote,
  readDaemonLock,
  isClaudeProcess,
  waitForProcessExit,
  verifyLockHolder,
  writeDaemonLock,
  releaseDaemonLock,
  deleteDaemonLock,
} from "../utils/daemon/daemonLock.js";
import { controlRequest } from "../services/daemon/controlClient.js";
import { BG_PROTO } from "../services/daemon/leaseProtocol.js";
import { sleep } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { $A, redactErrorPaths } from "../utils/sandbox/userNamespace.js";
import { getPlatform } from "../utils/platform.js";
import { logFeatureSad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { Eho, uninstallDaemonService } from "../services/daemon/serviceInstall.js";
import { statRealPath } from "../services/autoDream/consolidationLock.js";
import {
  getProcessStartTimeAsync,
  procIdentityFields,
  procIdentityOf,
  reapDetachedRepl,
} from "../utils/processIdentity.js";
import {
  processWrapperRecord,
  processWrapperError,
  processWrapperArgv,
  isProcessWrapperUsable,
} from "../utils/processWrapper.js";
import { Axs, killVerifiedProcess } from "../services/daemon/reapJobs.js";
import { WORKER_KINDS } from "./runDaemonWorker.js";
import { isDaemonServiceRecalled } from "../utils/fleetGates.js";
import { readRoster } from "../services/daemon/roster.js";

//@ chunk-ss669z1x.js:50966-51051 placement
function Hr(r, e) {
  if (r.target !== e.target) return !0;
  return !isRunningFromVersionsDir() && r.mtimeMs !== e.mtimeMs;
}
//@ chunk-ss669z1x.js:51051-51231 placement
function logBgManagerStartError(r) {
  if (isSyscallError(r) && r.syscall === "listen" && (r.code === "EADDRINUSE" || r.code === "EACCES")) {
    logForDebugging(`bg manager start failed (listen): ${r.code} ${r.message}`, { level: "warn" });
    return;
  }
  logError(r);
}
/**
 * 后台管理器（bg manager）入口：监听、过期检查、空闲退出、升级。
 */
//@ chunk-ss669z1x.js:51231-64258 placement
async function runBgManager(r) {
  let {
      jsonPath: jsonPath,
      logPath: logPath,
      origin: origin,
      spawnedBy: spawnedBy,
      signal: signal,
      watch: watch = initialize,
      createAuth: createAuth = createDaemonAuthManager,
      staleCheckIntervalMs: staleCheckIntervalMs = Vr,
      idleGraceMs: idleGraceMs = Mt,
      startupIdleGraceMs: startupIdleGraceMs = jr,
      upgradeBusyDeferCapMs: upgradeBusyDeferCapMs = Gr,
      storageV5: storageV5,
    } = r,
    R = credentialsStoreFor(storageV5),
    w = await openBgDispatchLog(logPath);
  (w.write(
    "supervisor",
    `\u2500\u2500\u2500 daemon start \u2500\u2500\u2500 version=${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION} pid=${process.pid} origin=${origin}`,
  ),
    initializeGrowthBook());
  let A = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5),
    U = !1;
  if (A && A.origin === "transient" && origin !== "transient") {
    ((U = !0),
      w.write(
        "supervisor",
        `transient daemon running (pid=${A.pid}, origin=transient) \u2014 asking it to yield to origin=${origin}`,
      ));
    let s = await controlRequest({ proto: BG_PROTO, op: "yield" });
    if (s.ok && s.op === "yield" && s.yielding) {
      let M = Date.now() + 5000;
      while (A && Date.now() < M)
        (await sleep(100), (A = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5)));
      if ((logEvent("tengu_daemon_yield_takeover", { ok: !A, new_origin: fromEnum(origin) }), A))
        w.write("supervisor", "yield acked but lock still held after 5s \u2014 refusing to start");
    } else
      w.write(
        "supervisor",
        s.ok
          ? "existing daemon refused to yield (it reports origin!=transient)"
          : `existing daemon unreachable on control socket (${$A(s.error)}); not taking over`,
      );
  }
  if (A) {
    let s = U
        ? `origin=${A.origin ?? "unknown"}; asked it to yield but the handover failed (see above)`
        : origin === "transient"
          ? `origin=${A.origin ?? "unknown"}; an on-demand daemon never displaces a running one`
          : `origin=${A.origin ?? "unknown"}; only a transient daemon can be displaced`,
      M =
        getPlatform() === "windows"
          ? `Stop it with \`taskkill /PID ${A.pid}\`, then retry.`
          : "Run `claude daemon stop` to stop it, then retry.";
    if (
      (w.write(
        "supervisor",
        `another daemon is already running (pid=${A.pid}, version=${A.version}, ${s}). ${M}`,
      ),
      U)
    )
      logFeatureSad("daemon_start", "daemon_start_yield_failed");
    else logFeatureOk("daemon_start");
    return (await w.close(), { upgradeDetected: !1, exitCode: 1 });
  }
  let re = getLaunchCommand({ pinToCurrentBinary: !0 }),
    X = isRunningFromVersionsDir() ? Eho() : re.target,
    Q = await statRealPath(X).catch((s) => {
      if (isSyscallError(s))
        logForDebugging(`binaryIdentity(${X}) failed at startup: ${s.code}`, { level: "error" });
      else logError(s);
      return null;
    }),
    fe = await getProcessStartTimeAsync(process.pid);
  if (fe === void 0) {
    if (
      (await sleep(KOr), (fe = await getProcessStartTimeAsync(process.pid, { skipCache: !0 })), fe === void 0)
    )
      w.write(
        "supervisor",
        "own process start-time probe failed twice \u2014 writing a procStart-less lock; kill paths will refuse to signal this daemon",
      );
  }
  let le = {
      pid: process.pid,
      version: {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      jsonPath: jsonPath,
      logPath: logPath,
      startedAt: Date.now(),
      origin: origin,
      spawnedBy: spawnedBy,
      ...procIdentityFields(fe),
      launchTarget: Q?.target,
      processWrapper: processWrapperRecord(),
    },
    _e = await writeDaemonLockRemote(le, storageV5);
  if (!_e) {
    let s = await readDaemonLock(storageV5);
    if (s) {
      let G = !1,
        de = null;
      try {
        (process.kill(s.pid, 0),
          (G =
            (await isClaudeProcess(s.pid)) &&
            (await waitForProcessExit(s.pid, procIdentityOf(s), LOCK_PROBE_LIMITS))));
      } catch (error) {
        if (getErrnoCode(error) !== "ESRCH") {
          if (((de = await verifyLockHolder(s)), (G = de === null), de !== null))
            w.write(
              "supervisor",
              `daemon.lock names pid=${s.pid}, which this user cannot signal, but ${de === "predates_boot" ? "the lock predates this boot" : "that pid now belongs to another process"} \u2014 replacing the stale lock`,
            );
        }
      }
      if (G)
        return (
          w.write("supervisor", `another daemon won the lock race (pid=${s.pid}) \u2014 exiting`),
          logFeatureOk("daemon_start"),
          await w.close(),
          { upgradeDetected: !1, exitCode: 1 }
        );
      if (((_e = await writeDaemonLock(le, storageV5)), de !== null))
        logEvent("tengu_daemon_stale_lock_replaced", {
          proof: de === "predates_boot" ? lit("predates_boot") : lit("pid_recycled"),
          acquired: _e,
          holder_age_ms: Math.max(0, Date.now() - s.startedAt),
          holder_version_skew:
            s.version !==
            {
              ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
              PACKAGE_URL: "@anthropic-ai/claude-code",
              README_URL: "https://code.claude.com/docs/en/overview",
              VERSION: "2.1.316",
              FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
              BUILD_TIME: "2026-10-30T23:28:13Z",
              GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
              HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
              DD_SOURCEMAP_GROUP: "default",
            }.VERSION,
        });
    } else _e = await writeDaemonLock(le, storageV5);
    if (!_e)
      return (
        w.write("supervisor", "another daemon won the lock race \u2014 exiting"),
        logFeatureOk("daemon_start"),
        await w.close(),
        { upgradeDetected: !1, exitCode: 1 }
      );
    await sleep(Fr);
    let M = await readDaemonLock(storageV5).catch(() => le);
    if (!M || M.pid !== le.pid || M.startedAt !== le.startedAt) {
      if (
        (w.write(
          "supervisor",
          `another daemon won the lock race (lock now ${M ? `held by pid=${M.pid}` : "gone"}) \u2014 exiting`,
        ),
        M)
      )
        logFeatureOk("daemon_start");
      else logFeatureSad("daemon_start", "lock_vanished_after_replace");
      return (await w.close(), { upgradeDetected: !1, exitCode: 1 });
    }
  }
  let q = async () => {
      for (let s = 0; ; s++)
        try {
          let M = await readLiveServerLock(LOCK_PROBE_LIMITS, storageV5);
          return M !== null && M.pid !== le.pid ? M.pid : null;
        } catch (error) {
          if (s === 0) {
            await sleep(KOr);
            continue;
          }
          return (
            logForDebugging(
              `daemon displacement probe: daemon.lock read failed twice (${error instanceof Error ? error.message : String(error)}) \u2014 treating as non-displaced`,
              { level: "warn" },
            ),
            null
          );
        }
    },
    Z = null,
    B = { manager: null },
    V = createAuth(
      signal,
      (s) => w.write("supervisor", s),
      () => Z?.hasOAuthConsumer() ?? !1,
      storageV5,
      R,
      () =>
        origin === "service" && getPlatform() === "macos" && (B.manager?.snapshotConsumerCount() ?? 0) > 0,
    ),
    x = !1,
    ee = null,
    ae = !1,
    W = null,
    ge = !1,
    ce = !1,
    se = !1,
    be = !1,
    ve = !1,
    Ee = !1,
    Re = () => signal.aborted || se || ge || ve || x || ce || be || Ee,
    Pe = null,
    ze = () => {
      if (origin !== "transient") return !1;
      if (!se)
        ((se = !0),
          w.write(
            "supervisor",
            "yielding to a foreground/service daemon \u2014 bg workers will be re-adopted",
          ),
          logEvent("tengu_daemon_yield", {}),
          Pe?.());
      return !0;
    },
    Oe = async () => {
      if (x || !Q) return x;
      if (Re()) return !1;
      let s;
      try {
        s = await statRealPath(X);
      } catch (error) {
        if (isSyscallError(error))
          logForDebugging(`binaryIdentity(${X}) poll failed: ${error.code}`, { level: "error" });
        else logError(error);
        if (W !== null) {
          if ((Z?.busyWorkerCount() ?? 0) === 0) {
            if (!W.capExpiredEmitted)
              logEvent("tengu_daemon_upgrade_deferred_busy", {
                busy_workers: 0,
                deferred_ms: (W.suspendedAt ?? Date.now()) - W.start,
                cap_expired: !1,
                phase: lit("resolved"),
              });
            W = null;
          } else if (W.suspendedAt === null) W.suspendedAt = Date.now();
        }
        return !1;
      }
      if (Re()) return !1;
      if (W !== null && W.suspendedAt !== null)
        ((W.start += Date.now() - W.suspendedAt), (W.suspendedAt = null));
      if (s !== null && !Hr(Q, s)) return ((ee = null), (W = null), !1);
      if (
        s !== null &&
        Axs(Q.target, s.target) &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_daemon_refuse_stale_upgrade", !0)
      ) {
        if (((W = null), ee !== s.target))
          ((ee = s.target),
            w.write(
              "supervisor",
              `binary at ${X} changed to an OLDER build (${Q.target} \u2192 ${s.target}) \u2014 refusing self-restart for upgrade; keeping the running build (\`claude daemon stop --any\` to override)`,
            ),
            logEvent("tengu_daemon_upgrade_refused_stale_binary", {}));
        return !1;
      }
      let M = processWrapperError(),
        G = processWrapperArgv();
      if (origin !== "service" && (G.length > 0 || M !== null)) {
        if (!(await isProcessWrapperUsable())) {
          if (!ae)
            ((ae = !0),
              w.write(
                "supervisor",
                M !== null
                  ? `binary at ${X} changed but CLAUDE_CODE_PROCESS_WRAPPER cannot be used (${M}) \u2014 deferring the upgrade restart until it is fixed (re-checked every poll)`
                  : `binary at ${X} changed but launcher \`${G[0]}\` is not runnable right now \u2014 deferring the upgrade restart until it is (re-checked every poll)`,
              ),
              logFeatureSad("agent_launcher", "upgrade_deferred_launcher_unrunnable"));
          return ((W = null), !1);
        }
        ae = !1;
      }
      let de = Z?.busyWorkerCount() ?? 0;
      if (
        de > 0 &&
        s !== null &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_daemon_upgrade_defer_busy", !0)
      ) {
        if (W === null)
          W = { target: s.target, start: Date.now(), logged: !1, suspendedAt: null, capExpiredEmitted: !1 };
        else if (W.target !== s.target) ((W.target = s.target), (W.logged = !1));
        if (Date.now() - W.start < upgradeBusyDeferCapMs) {
          if (!W.logged)
            ((W.logged = !0),
              w.write(
                "supervisor",
                `binary at ${X} changed but ${de} registry worker(s) report a mid-turn session \u2014 deferring the upgrade restart until idle (re-checked every poll, capped at ${Math.round(upgradeBusyDeferCapMs / 60000)}m)`,
              ),
              logEvent("tengu_daemon_upgrade_deferred_busy", {
                busy_workers: de,
                cap_expired: !1,
                phase: lit("start"),
              }));
          return !1;
        }
        if (!W.capExpiredEmitted)
          ((W.capExpiredEmitted = !0),
            w.write(
              "supervisor",
              `busy-worker upgrade defer cap reached \u2014 proceeding with the restart while ${de} worker(s) are still busy`,
            ),
            logEvent("tengu_daemon_upgrade_deferred_busy", {
              busy_workers: de,
              deferred_ms: Date.now() - W.start,
              cap_expired: !0,
              phase: lit("cap_expired"),
            }));
      } else {
        if (W !== null)
          logEvent("tengu_daemon_upgrade_deferred_busy", {
            busy_workers: de,
            deferred_ms: Date.now() - W.start,
            cap_expired: !1,
            phase: lit("resolved"),
          });
        W = null;
      }
      if (Re()) return !1;
      if (((x = !0), s === null))
        w.write("supervisor", `binary at ${X} was deleted (was ${Q.target}) \u2014 exiting for upgrade`);
      else {
        let Se = Q.target === s.target ? "mtime changed" : `${Q.target} \u2192 ${s.target}`;
        w.write("supervisor", `binary at ${X} changed (${Se}) \u2014 self-restarting for upgrade`);
      }
      return (Pe?.(), !0);
    },
    p = null,
    T = !1,
    K = () => (B.manager?.leaseCount() ?? 0) + (B.manager?.liveHandleCount() ?? 0),
    oe = () => {
      if (origin !== "transient") return;
      if (ve || x || ge || se || be || signal.aborted) return;
      if (K() > 0) {
        if (((T = !0), p)) (clearTimeout(p), (p = null));
        return;
      }
      if (p) return;
      let s = T ? idleGraceMs : startupIdleGraceMs;
      p = setTimeout(() => {
        if (((p = null), K() > 0)) {
          T = !0;
          return;
        }
        if (signal.aborted || x) return;
        if (W !== null) {
          oe();
          return;
        }
        ve = !0;
        let M = Z?.workerCount() ?? 0;
        (w.write(
          "supervisor",
          `idle ${Math.round(s / 1000)}s with no clients \u2014 exiting` +
            (M > 0 ? ` (stopping ${M} configured workers)` : ""),
        ),
          logEvent("tengu_daemon_idle_exit", { grace_ms: s, never_had_client: !T, cfg_workers: M }),
          Pe?.());
      }, s);
    };
  (V.ready
    .then(() =>
      runBgManagerLoop((s) => w.write("bg", s), {
        getAuthSnapshot: origin === "service" ? () => V.getAuthSnapshot() : void 0,
        onNudge: async () => ({ restarting: await Oe(), upgradePending: W !== null }),
        onShutdown: () => {
          ((ge = !0), w.write("supervisor", "shutdown requested via control socket"), Pe?.());
        },
        onYield: ze,
        onKeepAliveChange: oe,
        storageV5: storageV5,
        credentials: R,
        isShuttingDown: Re,
      }),
    )
    .then((s) => {
      if (Re())
        return void (async () => {
          if (ce && !Ee && (await q()) === null) s.killAll("SIGTERM");
          await s.close({ skipPathCleanup: !0 });
        })().catch((G) => logError(redactErrorPaths(G)));
      ((B.manager = s), oe());
    })
    .catch((s) => {
      if ((logBgManagerStartError(redactErrorPaths(s)), Re())) return;
      let M = getErrnoCode(s),
        G = `${M ? `[${M}] ` : ""}${$A(toError(s).message.replace(/\s*\n\s*/g, " "))}`;
      if (origin === "service") {
        (w.write(
          "supervisor",
          `bg manager failed to start: ${G} \u2014 control pipe unavailable; bg sessions disabled (registry workers keep running)`,
        ),
          releaseDaemonLock(le, storageV5).catch(logError));
        return;
      }
      (w.write("supervisor", `bg manager failed to start: ${G} \u2014 control pipe unavailable; exiting`),
        process.stderr.write(`bg manager failed to start: ${G}
`),
        (be = !0),
        Pe?.());
    }),
    (Z = await runDaemonSupervisor({
      jsonPath: jsonPath,
      invocation: re,
      logger: w,
      authManager: V,
      watch: watch,
      storageV5: storageV5,
    })));
  let workerCount = Z.workerCount();
  if ((w.write("supervisor", `workers=${workerCount}`), workerCount > 0))
    w.write(
      "supervisor",
      "daemon.json has configured workers but they do not pin the supervisor \u2014 they stop when the last client lease and bg job are gone",
    );
  (logEvent("tengu_daemon_start", {
    worker_kinds: Object.keys(WORKER_KINDS).length,
    worker_count: workerCount,
    origin: fromEnum(origin),
  }),
    logFeatureOk("daemon_start"),
    oe());
  let he = null;
  try {
    await new Promise((s) => {
      if (((Pe = s), signal.aborted || x || ve || ge || se || be)) return void s();
      if ((signal.addEventListener("abort", () => s(), { once: !0 }), !Q))
        w.write("supervisor", `binary identity unresolvable at ${X}; upgrade polling disabled`);
      he = setInterval(() => {
        if (signal.aborted || x || ce || se) {
          if (he) (clearInterval(he), (he = null));
          return;
        }
        if ((Oe(), origin === "service" && isDaemonServiceRecalled()))
          ((ce = !0),
            w.write("supervisor", "service recall flag set \u2014 draining workers and uninstalling service"),
            Pe?.());
        if (origin === "transient" && !se)
          q()
            .then((M) => {
              if (M !== null && !se && !signal.aborted)
                ((Ee = !0),
                  (se = !0),
                  w.write("supervisor", `lockfile now held by pid=${M} \u2014 displaced, yielding`),
                  logEvent("tengu_daemon_yield", { displaced: !0, displaced_by_pid: M }),
                  Pe?.());
            })
            .catch((M) => logError(redactErrorPaths(M)));
      }, staleCheckIntervalMs);
    });
  } finally {
    if (((Pe = null), he)) (clearInterval(he), (he = null));
    if (p) (clearTimeout(p), (p = null));
  }
  if (x) logEvent("tengu_daemon_self_restart_on_upgrade", {});
  if (ce) logEvent("tengu_copper_lantern", {});
  if ((Z.disposeWatcher(), await Z.drainReloads(), !Ee)) {
    let s = await q();
    if (s !== null)
      ((Ee = !0),
        w.write(
          "supervisor",
          `lockfile now held by pid=${s} \u2014 displaced; leaving successor's control.sock in place`,
        ));
  }
  let pe =
      x && !Ee
        ? "upgrade"
        : ce
          ? "service_recall"
          : Ee
            ? "displaced"
            : se
              ? "yield"
              : ge
                ? "shutdown_op"
                : ve
                  ? "idle_exit"
                  : be
                    ? "bg_manager_failed"
                    : signal.aborted
                      ? "signal"
                      : "unknown",
    ke = Date.now() - le.startedAt;
  (w.write(
    "supervisor",
    `shutting down (cause=${pe}, uptime=${Math.round(ke / 1000)}s, leases=${B.manager?.leaseCount() ?? -1}, live_workers=${B.manager?.liveHandleCount() ?? -1})`,
  ),
    logEvent("tengu_daemon_exit", {
      cause: fromEnum(pe),
      uptime_ms: ke,
      lease_count: B.manager?.leaseCount() ?? -1,
      live_handles: B.manager?.liveHandleCount() ?? -1,
      ever_had_keep_alive: T,
      origin: fromEnum(origin),
    }),
    B.manager?.announceExit(pe));
  let De = !1,
    $e = async () => {
      if (De) return;
      De = !0;
      let s = await readDaemonLock(storageV5);
      if (s && s.pid === le.pid && s.startedAt === le.startedAt) await deleteDaemonLock(storageV5);
    };
  if (se) (await B.manager?.close({ displaced: Ee }), (B.manager = null));
  if (ve || ce || se || be) {
    if ((await $e(), ce && !Ee)) {
      if ((B.manager?.killAll("SIGTERM"), !B.manager)) {
        let s = await readRoster({ silent: !0 }, storageV5).catch(() => null);
        for (let M of Object.values(s?.workers ?? {}))
          if (M.pid > 0)
            (await killVerifiedProcess(M.pid, M.procStart).catch(() => !1),
              await reapDetachedRepl(M.replPid, M.replProcStart).catch(() => !1));
      }
    }
  }
  if (
    (await Promise.all([
      B.manager?.close({ displaced: Ee }),
      Z.stop(pe === "upgrade" ? "upgrade" : pe === "yield" ? "yield" : void 0),
    ]),
    await $e(),
    ce)
  )
    await uninstallDaemonService();
  return (await w.close(), V.dispose(), { upgradeDetected: x, exitCode: be ? 1 : 0 });
}

export { runBgManager };
