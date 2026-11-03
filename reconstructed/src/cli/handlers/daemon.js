/**
 * cli/handlers/daemon.ts
 *
 * 2.1.316 新增：claude daemon 子命令入口：run/status/logs/stop/install/hub 等服务生命周期操作；claude daemon 的用法文本与列宽等常量等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ss669z1x.js (20)
 * attribution: placement 20
 */
import { resolve, dirname } from "path";
import { homedir } from "os";
import { rm, rm as rm_2, rm as rm_3, open } from "fs/promises";
import { spawn, spawn as spawn_2 } from "child_process";
import {
  isDaemonServiceInstallEnabled,
  isDaemonWorkerRegistryEnabled,
  ensureFleetGateHydrated,
  isDaemonCliEnabled,
  fleetGateRejected,
  C2t,
  bgSupervisorNoun,
} from "../../utils/fleetGates.js";
import { isWorkerKindAdmitted } from "../../daemon/runDaemonWorker.js";
import { jL, Fye } from "../../services/daemon/paths.js";
import {
  LeaseClientSchema,
  BG_PROTO,
  CLOUD_SESSION_LEASE_LABEL,
} from "../../services/daemon/leaseProtocol.js";
import { safeParseJSON } from "../../utils/json.js";
import {
  stopDaemonHint,
  lockHolderProblemText,
  unknownDaemonText,
  getServerLockStatus,
  readLiveServerLock,
  hasProcIdentity,
  readDaemonLock,
  isClaudeProcess,
  daemonLockPath,
  signalPid,
  readProcCmdline,
} from "../../utils/daemon/daemonLock.js";
import { s5, waitForServiceDaemon, waitForDaemonPing } from "../../services/daemon/ensureDaemon.js";
import {
  shutdown1PEventLogging,
  initialize1PEventLogging,
  logEventTo1PAwaitable,
} from "../../services/analytics/firstPartyEventLogger.js";
import { shutdownDatadog, trackDatadogEvent } from "../../services/analytics/datadog.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { waitForInFlightOAuthRefresh, OAUTH_REFRESH_EXIT_WAIT_CAP_MS } from "../../utils/auth.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  hasWorkspaceTrust,
  initializeGrowthBook,
  setGrowthBookCredentials,
  setGrowthBookStorageBackend,
} from "../../services/analytics/growthbook.js";
import { setIsInteractive } from "../../bootstrap/state.js";
import { runFastPathPolicyHelper } from "../fastPathSettings.js";
import { logForDebugging, initDefaultDebugLog, getDebugFilePath } from "../../utils/debug.js";
import { errorMessage, getErrnoCode, sanitizeErrnoForTelemetry } from "../../utils/errors.js";
import { configureGlobalAgents } from "../../utils/proxy.js";
import { initializeAnalyticsSink } from "../../services/analytics/sink.js";
import { pinStorageV5 } from "../../utils/storage/pinStorageV5.js";
import { isStorageV5Enabled } from "../../utils/hoverRest.js";
import { watchGlobalConfigThroughStorage, seedInstallIDs } from "../../utils/config.js";
import { credentialsStoreFor } from "../../utils/secureStorage/credentialsFileStore.js";
import { processChdir } from "../../utils/fsOperations.js";
import { lockCurrentVersion } from "../../utils/nativeInstaller/installer.js";
import { runBgManager } from "../../daemon/bgManager.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  hasSystemdUserSession,
  installDaemonService,
  daemonServiceStatus,
  checkServiceExecStart,
  TAr,
  Exs,
  uninstallDaemonService,
  vtn,
} from "../../services/daemon/serviceInstall.js";
import {
  processWrapperProblem,
  processWrapperError,
  processWrapperRecord,
} from "../../utils/processWrapper.js";
import { getPlatform } from "../../utils/platform.js";
import { plural, truncateToLength, Dr } from "../../utils/stringUtils.js";
import {
  isProbeablePid,
  getProcessStartTimeAsync,
  procIdentityOf,
  hasExitedUnreaped,
  captureProcessStartTimeAsync,
} from "../../utils/processIdentity.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { P6 } from "../../services/remoteTools/backgroundCommands.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { reapAllBackgroundJobs } from "../../services/daemon/reapJobs.js";
import { Yn } from "../../utils/stripAnsi.js";
import { resolveAgentLauncher } from "../../services/daemon/spawnLauncher.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { $A } from "../../utils/sandbox/userNamespace.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { openBgDispatchLog } from "../../daemon/bgDispatch.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { Nd } from "../../utils/toolCgroup.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";

/**
 * claude daemon 的用法文本与列宽等常量。
 */
//@ chunk-ss669z1x.js:64258-65764 placement
var DAEMON_USAGE = 70,
  nt = 1e4,
  en = `Usage: claude daemon [subcommand] [options]

Service lifecycle:
  run [json-path]   Run the supervisor in the foreground (default when piped)
  status            Show daemon pid, version, uptime
  logs              Tail the daemon log (Ctrl-C to stop)
  uninstall         Remove the background service (launchctl/systemd)
  stop              Shut down the supervisor and terminate background sessions
                      --any           also stop a transient (non-service) daemon
                      --keep-workers  leave detached sessions running
`,
  tn = `  install           Install as a launchctl/systemd service (persists across reboot)
  start             Start the installed service
  restart           Restart the installed service
`,
  rn = `
  Service install is disabled in this version \u2014 the daemon runs on demand
  and exits when the last client disconnects.
`,
  nn = `  remote-control list [--json]              List remote-control servers
  remote-control add [--dir <path>] [--name <n>]
                     [--spawn-mode same-dir|worktree]
  remote-control remove <name-or-dir>
`,
  on = "",
  an = `
Remote Control servers (add/remove require the service to be installed):
${nn}`,
  sn = `
Options:
  --json-path <p>   Config file (default: ~/.claude/daemon.json)
  --log-file <p>    Log file (default: ~/.claude/daemon.log)
  --help, -h        Show this help
`,
  dn = new Set(["list", "scheduled", "remote-control", "hub"]),
  Kt = new Set(["status", "stop", "uninstall"]),
  ln = new Set(["run", ...Kt]);
//@ chunk-ss669z1x.js:65764-65843 placement
function Ot() {
  return (
    en +
    (isDaemonServiceInstallEnabled() ? tn : rn) +
    (isDaemonWorkerRegistryEnabled() ? on : isWorkerKindAdmitted("remoteControl") ? an : "") +
    sn
  );
}
/**
 * 解析 claude daemon 的参数（--json-path、--log-file、--origin、--spawned-by、子命令）。
 */
//@ chunk-ss669z1x.js:65843-67094 placement
function parseDaemonArgs(r) {
  let e = jL(),
    o = !1,
    n = Fye(),
    i,
    h,
    S = new Set();
  for (let w = 0; w < r.length; w++) {
    let A = r[w];
    if (A === "--json-path" && r[w + 1]) (S.add(w), S.add(++w), (e = r[w]), (o = !0));
    else if (A.startsWith("--json-path=")) (S.add(w), (e = A.slice(12)), (o = !0));
    else if (A === "--log-file" && r[w + 1]) (S.add(w), S.add(++w), (n = r[w]));
    else if (A.startsWith("--log-file=")) (S.add(w), (n = A.slice(11)));
    else if (A === "--origin" && r[w + 1]) (S.add(w), S.add(++w), (i = parseDaemonOrigin(r[w])));
    else if (A.startsWith("--origin=")) (S.add(w), (i = parseDaemonOrigin(A.slice(9))));
    else if (A === "--spawned-by" && r[w + 1]) (S.add(w), S.add(++w), (h = parseSpawnedByJson(r[w])));
  }
  let u = [];
  for (let w = 0; w < r.length; w++) if (!S.has(w)) u.push(r[w]);
  let y = new Set([
      "run",
      "install",
      "uninstall",
      "start",
      "stop",
      "restart",
      "status",
      "logs",
      "log",
      "list",
      "scheduled",
      "remote-control",
      "hub",
    ]),
    D = process.stdin.isTTY ? "hub" : "run",
    E = -1;
  for (let w = 0; w < u.length; w++)
    if (!u[w].startsWith("-")) {
      E = w;
      break;
    }
  if (E === -1) return { sub: D, jsonPath: e, logPath: n, origin: i, spawnedBy: h, rest: u };
  let L = u[E];
  if (!y.has(L)) {
    if (!/[./\\~]/.test(L)) return { sub: L, jsonPath: e, logPath: n, origin: i, spawnedBy: h, rest: [] };
    return { sub: "run", jsonPath: o ? e : L, logPath: n, origin: i, spawnedBy: h, rest: [] };
  }
  let P = [...u.slice(0, E), ...u.slice(E + 1)],
    R = L;
  if (R === "run" && !o) {
    let found = P.find((A) => !A.startsWith("-"));
    if (found) e = found;
  }
  return { sub: R, jsonPath: e, logPath: n, origin: i, spawnedBy: h, rest: P };
}
//@ chunk-ss669z1x.js:67094-67209 placement
function parseDaemonOrigin(value) {
  if (value === "service" || value === "transient" || value === "foreground") return value;
  if (value === "auto") return "transient";
  return;
}
//@ chunk-ss669z1x.js:67209-67479 placement
function describeDaemonOrigin(status) {
  let e = status.origin ?? "unknown";
  if (e !== "transient" && e !== "auto") return e;
  let o = LeaseClientSchema().safeParse(status.spawnedBy).data;
  if (!o) return "transient \u2014 started on-demand by a client";
  return `transient \u2014 started on-demand by \`${o.label}\` (pid ${o.pid}) in ${o.cwd}`;
}
//@ chunk-ss669z1x.js:67479-67685 placement
function parseSpawnedByJson(json) {
  let e = safeParseJSON(json, !1);
  if (e === null || typeof e !== "object") return;
  let o = e;
  if (typeof o.label === "string" && typeof o.cwd === "string" && typeof o.pid === "number")
    return { label: o.label, cwd: o.cwd, pid: o.pid };
  return;
}
//@ chunk-ss669z1x.js:67685-67727 placement
function j(r) {
  process.stdout.write(
    r +
      `
`,
  );
}
//@ chunk-ss669z1x.js:67727-67769 placement
function H(r) {
  process.stderr.write(
    r +
      `
`,
  );
}
/**
 * 去掉 argv 中的调试相关标志和指定参数。
 */
//@ chunk-ss669z1x.js:67769-68118 placement
function stripDebugArgs(r, e) {
  let o = [];
  for (let n = 0; n < r.length; n++) {
    let i = r[n];
    if (e.includes(i)) continue;
    if (
      i === "--debug" ||
      i === "-d" ||
      i === "--debug-to-stderr" ||
      i === "-d2e" ||
      i.startsWith("--debug=") ||
      i.startsWith("--debug-file=")
    )
      continue;
    if (i === "--debug-file" && n + 1 < r.length) {
      n++;
      continue;
    }
    o.push(i);
  }
  if (o.length > 0) H(`warning: extra arguments ignored: ${o.join(" ")}`);
}
//@ chunk-ss669z1x.js:68118-68318 placement
function foregroundDaemonRefusalMessage(action, pid) {
  return `${action} refused: a foreground daemon (pid ${pid}, started with \`claude daemon run\`) holds the daemon lock \u2014 stop it first (Ctrl-C in its terminal or \`claude daemon stop\`)`;
}
/**
 * 停止守护进程被拒时（eperm/unverified/timed-out）给出说明。
 */
//@ chunk-ss669z1x.js:68318-68653 placement
function describeDaemonStopRefusal(r, e) {
  let o;
  switch (e.outcome) {
    case "eperm":
      o = "Stop it from the account that owns it";
      break;
    case "unverified":
      o = stopDaemonHint();
      break;
    case "timed-out":
      o = `Wait for it to exit (or kill pid ${e.pid})`;
      break;
  }
  return `${r} refused: ${lockHolderProblemText(e)} \u2014 a freshly started service would lose the lockfile race to it and crash-loop. ${o}, then retry.`;
}
//@ chunk-ss669z1x.js:68653-68747 placement
function Ft(r, e) {
  return `${r} refused: ${unknownDaemonText(e)}. Stop it (\`claude daemon stop\`) and retry.`;
}
/**
 * 服务管理器已接受操作但守护进程在超时内不可达时的警告文字。
 */
//@ chunk-ss669z1x.js:68747-69128 placement
function daemonUnreachableWarning(r) {
  return `warning: the service manager accepted the ${r}, but the installed daemon is not reachable after ${s5 / 1000}s \u2014 the first start after an update can be slow. Check \`claude daemon status\` and \`claude daemon logs\`; if the service file points at a binary or launcher that no longer exists, \`claude daemon install\` rewrites it from the current settings.`;
}
//@ chunk-ss669z1x.js:69128-69268 placement
async function flushAndExitDaemon(exitCode) {
  (await Promise.race([
    Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
    sleep(500, void 0, { unref: !0 }),
  ]).catch(() => {}),
    await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS),
    process.exit(exitCode));
}
/**
 * claude daemon 子命令入口：run/status/logs/stop/install/hub 等服务生命周期操作。
 */
//@ chunk-ss669z1x.js:69268-86121 placement
async function daemonMain(r, e) {
  if ((await ensureFleetGateHydrated({ kickGrowthBook: !1 }), r.includes("--help") || r.includes("-h"))) {
    if (!isDaemonCliEnabled()) return fleetGateRejected("daemon");
    j(Ot());
    return;
  }
  let o = parseDaemonArgs(r),
    { jsonPath: jsonPath, logPath: logPath, origin: origin, spawnedBy: spawnedBy, rest: rest } = o,
    y = o.sub === "hub" && !isDaemonWorkerRegistryEnabled() ? "status" : o.sub;
  if (y !== "run") {
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_cosmos", !0) !== !1)
      setIsInteractive(Boolean(process.stdout.isTTY));
  }
  if (!ln.has(y)) {
    let E = await runFastPathPolicyHelper();
    if (E)
      (process.stderr.write(`${E}
`),
        process.exit(1));
    if (!isDaemonCliEnabled()) return fleetGateRejected("daemon");
  } else if (y === "run" || y === "status") {
    let E = await runFastPathPolicyHelper();
    if (E)
      logForDebugging(`daemon ${y}: policy helper failed (continuing on static managed settings): ${E}`, {
        level: "warn",
      });
  }
  if (
    dn.has(y) &&
    !(y === "remote-control" ? isWorkerKindAdmitted("remoteControl") : isDaemonWorkerRegistryEnabled())
  )
    return fleetGateRejected(`daemon ${y}`);
  try {
    let { restoreGatewayAuthForFastPath: restoreGatewayAuthForFastPath } =
      await import("./chunk-hfbqbw5b.js");
    await restoreGatewayAuthForFastPath();
  } catch (error) {
    logForDebugging(
      `daemon ${y}: could not load the Cloud gateway sign-in, so this daemon runs as if it were not signed in to the gateway, until it restarts. Fix this error: ${errorMessage(error)}`,
      { level: "warn" },
    );
  }
  if ((configureGlobalAgents(), initializeAnalyticsSink(), !Kt.has(y) && hasWorkspaceTrust()))
    initializeGrowthBook().catch(() => {});
  let D = pinStorageV5(e);
  if (isStorageV5Enabled() && D !== void 0) {
    (initDefaultDebugLog({ storageV5: D }), watchGlobalConfigThroughStorage(D));
    let [{ composePolicyLimitsClient: E, primePolicyLimitsCache: L }, { primeFastPathCredentials: P }] =
        await Promise.all([import("./chunk-qchbrsbw.js"), import("./chunk-ts9rfgqd.js")]),
      R = credentialsStoreFor(D);
    (setGrowthBookCredentials(R),
      setGrowthBookStorageBackend(D),
      E({ storageV5: D, credentials: R }),
      await P(R),
      await L(D),
      await seedInstallIDs(D));
  }
  switch ((initialize1PEventLogging(D), y)) {
    case "list": {
      stripDebugArgs(rest, ["--json"]);
      let { handleListAllKinds: handleListAllKinds } = await import("./chunk-7904g3ks.js");
      await handleListAllKinds(rest.includes("--json"), jsonPath, D);
      return;
    }
    case "scheduled":
    case "remote-control": {
      let { handleCliKind: handleCliKind } = await import("./chunk-7904g3ks.js");
      await handleCliKind(y, rest, jsonPath, D);
      return;
    }
    case "hub": {
      if ((stripDebugArgs(rest, []), !process.stdin.isTTY || !process.stdout.isTTY)) {
        j("Interactive hub requires a TTY. See `claude daemon --help`.");
        return;
      }
      let { renderDaemonHubStandalone: renderDaemonHubStandalone } = await import("./chunk-b7gstm5r.js");
      return (
        await renderDaemonHubStandalone(D),
        await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS),
        process.exit(0)
      );
    }
    case "run": {
      if (C2t()) return (H("claude daemon: background agents disabled (3P/opt-out)"), process.exit(0));
      process.title = "claude daemon";
      let E = resolve(jsonPath),
        L = resolve(logPath);
      getDebugFilePath();
      try {
        processChdir(homedir());
      } catch {}
      lockCurrentVersion();
      let abortController = new AbortController(),
        R = !1,
        w = () => {
          if (R) (H("forced shutdown"), process.exit(1));
          ((R = !0), abortController.abort());
        };
      (process.on("SIGINT", w), process.on("SIGTERM", w));
      let A = origin ?? "foreground",
        U,
        re;
      try {
        ({ upgradeDetected: U, exitCode: re } = await runBgManager({
          jsonPath: E,
          logPath: L,
          origin: A,
          spawnedBy: spawnedBy,
          signal: abortController.signal,
          storageV5: D,
        }));
      } catch (error) {
        return (
          logError(error),
          logFeatureBad("daemon_start", "daemon_start_crash"),
          await Promise.all([
            logEventTo1PAwaitable("tengu_daemon_startup_crash", {}),
            trackDatadogEvent("tengu_daemon_startup_crash", {}),
          ]),
          flushAndExitDaemon(1)
        );
      }
      if (U) {
        if (A === "service") return flushAndExitDaemon(DAEMON_USAGE);
        await spawnDaemon(E, L, A, spawnedBy);
      }
      return flushAndExitDaemon(re);
    }
    case "install": {
      if ((stripDebugArgs(rest, []), !isDaemonServiceInstallEnabled()))
        return (
          H(
            `\`claude daemon ${y}\` is disabled in this version \u2014 the daemon runs on demand and exits when the last client disconnects.`,
          ),
          await logEventTo1PAwaitable("tengu_daemon_install", { ok: !1, disabled: !0 }),
          flushAndExitDaemon(1)
        );
      if (!(await hasSystemdUserSession()))
        return (
          H(
            `Service install isn't available on ${"linux"} \u2014 the daemon still runs on demand when a client connects.`,
          ),
          logFeatureBad("daemon_service_install", "daemon_service_install_unsupported"),
          flushAndExitDaemon(1)
        );
      if (process.env.CLAUDE_CONFIG_DIR)
        return (
          H(
            "service install only supports the default config dir \u2014 the launchd/systemd unit is a per-user singleton",
          ),
          logFeatureBad("daemon_service_install", "daemon_service_install_config_dir"),
          flushAndExitDaemon(1)
        );
      let E = await processWrapperProblem();
      if (E)
        return (
          logFeatureBad("daemon_service_install", "daemon_service_install_launcher"),
          await logEventTo1PAwaitable("tengu_daemon_install", { ok: !1, launcher: !0 }),
          H(`install refused: ${E}`),
          flushAndExitDaemon(1)
        );
      let L = await getServerLockStatus(D);
      if (L.kind === "foreground")
        return (
          logFeatureBad("daemon_service_install", "daemon_service_install_foreground"),
          await logEventTo1PAwaitable("tengu_daemon_install", { ok: !1, foreground: !0 }),
          H(foregroundDaemonRefusalMessage("install", L.lock.pid)),
          flushAndExitDaemon(1)
        );
      if (L.kind === "not-stopped")
        return (
          logFeatureBad(
            "daemon_service_install",
            L.outcome === "unverified"
              ? "daemon_service_install_holder_unverified"
              : "daemon_service_install_holder_alive",
          ),
          await logEventTo1PAwaitable("tengu_daemon_install", {
            ok: !1,
            holderAlive: !0,
            holderUnverified: L.outcome === "unverified",
          }),
          H(describeDaemonStopRefusal("install", L)),
          flushAndExitDaemon(1)
        );
      if (L.kind === "unknown-origin")
        return (
          logFeatureBad("daemon_service_install", "daemon_service_install_holder_unknown_origin"),
          await logEventTo1PAwaitable("tengu_daemon_install", {
            ok: !1,
            holderAlive: !0,
            holderUnknownOrigin: !0,
          }),
          H(Ft("install", L.lock.pid)),
          flushAndExitDaemon(1)
        );
      if (L.kind === "stopped") j(`stopped detached daemon (pid ${L.pid})`);
      let P = await installDaemonService({ jsonPath: jsonPath, logPath: logPath });
      if (!P.ok) {
        if (
          (await logEventTo1PAwaitable("tengu_daemon_install", { ok: !1 }),
          logFeatureBad("daemon_service_install", "daemon_service_install_failed"),
          H(`install failed: ${P.error}`),
          P.servicePath)
        )
          H(`  (service file was written to ${P.servicePath})`);
        return flushAndExitDaemon(1);
      }
      (logFeatureOk("daemon_service_install"), j(`installed: ${P.servicePath}`));
      let R = await waitForServiceDaemon(s5, D);
      if ((await logEventTo1PAwaitable("tengu_daemon_install", { ok: !0, reachable: R !== null }), R))
        j(
          `running: pid=${R.pid} origin=${R.origin} (managed by ${getPlatform() === "macos" ? "launchd" : "systemd"})`,
        );
      else
        H(
          `warning: service installed but the daemon is not running as the installed service within ${s5 / 1000}s \u2014 check \`claude daemon logs\``,
        );
      return flushAndExitDaemon(0);
    }
    case "start":
    case "restart": {
      if ((stripDebugArgs(rest, []), !isDaemonServiceInstallEnabled()))
        return (
          H(
            `\`claude daemon ${y}\` is disabled in this version \u2014 the daemon runs on demand and exits when the last client disconnects.`,
          ),
          await logEventTo1PAwaitable("tengu_daemon_install", { ok: !1, disabled: !0 }),
          flushAndExitDaemon(1)
        );
      if (!(await hasSystemdUserSession()))
        (H(
          `\`claude daemon ${y}\` isn't available on ${"linux"} (no launchd/systemd) \u2014 the daemon runs on demand instead.`,
        ),
          process.exit(1));
      if (process.env.CLAUDE_CONFIG_DIR)
        (H("the launchd/systemd unit is a per-user singleton for the default config dir"), process.exit(1));
      if (!(await daemonServiceStatus()))
        (H("service not installed \u2014 run `claude daemon install` first"), process.exit(1));
      let E = await processWrapperProblem();
      if (E)
        return (
          logFeatureBad("daemon_service_install", "daemon_service_install_launcher"),
          await logEventTo1PAwaitable("tengu_daemon_control", {
            op_start: y === "start",
            op_restart: y === "restart",
            ok: !1,
            launcher: !0,
          }),
          H(`${y} refused: ${E}`),
          flushAndExitDaemon(1)
        );
      let L = await getServerLockStatus(D);
      if (L.kind === "foreground")
        return (
          logFeatureBad("daemon_service_install", "daemon_service_install_foreground"),
          await logEventTo1PAwaitable("tengu_daemon_control", {
            op_start: y === "start",
            op_restart: y === "restart",
            ok: !1,
            foreground: !0,
          }),
          H(foregroundDaemonRefusalMessage(y, L.lock.pid)),
          flushAndExitDaemon(1)
        );
      if (L.kind === "not-stopped")
        return (
          logFeatureBad(
            "daemon_service_install",
            L.outcome === "unverified"
              ? "daemon_service_install_holder_unverified"
              : "daemon_service_install_holder_alive",
          ),
          await logEventTo1PAwaitable("tengu_daemon_control", {
            op_start: y === "start",
            op_restart: y === "restart",
            holderUnverified: L.outcome === "unverified",
            ok: !1,
            holderAlive: !0,
          }),
          H(describeDaemonStopRefusal(y, L)),
          flushAndExitDaemon(1)
        );
      if (L.kind === "unknown-origin")
        return (
          logFeatureBad("daemon_service_install", "daemon_service_install_holder_unknown_origin"),
          await logEventTo1PAwaitable("tengu_daemon_control", {
            op_start: y === "start",
            op_restart: y === "restart",
            ok: !1,
            holderAlive: !0,
            holderUnknownOrigin: !0,
          }),
          H(Ft(y, L.lock.pid)),
          flushAndExitDaemon(1)
        );
      if (L.kind === "stopped") j(`stopped detached daemon (pid ${L.pid})`);
      let P = await checkServiceExecStart();
      if (P.execPathStale || P.launcherPrefixDead) {
        j(
          P.execPathStale
            ? "service binary missing \u2014 regenerating service file"
            : "installed service starts through a launcher that was deleted or is no longer executable \u2014 regenerating the service file from the current settings",
        );
        let A = await installDaemonService({ jsonPath: jsonPath, logPath: logPath }),
          U = A.ok && (await waitForServiceDaemon(s5, D)) !== null;
        if (
          (await logEventTo1PAwaitable("tengu_daemon_control", {
            op_start: y === "start",
            op_restart: y === "restart",
            ok: A.ok,
            regenerated: !0,
            reachable: U,
          }),
          A.ok && U)
        )
          j(y === "start" ? "started" : "restarted");
        else if (A.ok) H(daemonUnreachableWarning(y));
        else H(`regenerate failed: ${A.error}`);
        return flushAndExitDaemon(A.ok ? 0 : 1);
      }
      let R = await (y === "start" ? TAr() : Exs());
      if (!R.ok)
        return (
          await logEventTo1PAwaitable("tengu_daemon_control", {
            op_start: y === "start",
            op_restart: y === "restart",
            ok: !1,
          }),
          H(`${y} failed: ${R.error}`),
          flushAndExitDaemon(1)
        );
      let w = (await waitForServiceDaemon(s5, D)) !== null;
      if (
        (await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: y === "start",
          op_restart: y === "restart",
          ok: !0,
          reachable: w,
        }),
        w)
      )
        j(y === "start" ? "started" : "restarted");
      else H(daemonUnreachableWarning(y));
      return flushAndExitDaemon(0);
    }
    case "uninstall": {
      stripDebugArgs(rest, []);
      let E = await uninstallDaemonService();
      if ((await logEventTo1PAwaitable("tengu_daemon_control", { op_uninstall: !0, ok: E.ok }), E.ok))
        (logFeatureOk("daemon_service_uninstall"), j("uninstalled"));
      else
        (logFeatureBad("daemon_service_uninstall", "daemon_service_uninstall_failed"),
          H(`uninstall failed: ${E.error}`));
      return flushAndExitDaemon(E.ok ? 0 : 1);
    }
    case "stop": {
      let included = rest.includes("--keep-workers");
      stripDebugArgs(rest, ["--keep-workers", "--any"]);
      let L = (x) =>
          included || x === 0 ? "stopped" : `stopped (terminated ${x} ${plural(x, "background session")})`,
        P = (x) => {
          if (x > 0)
            H(
              `note: ${x} background ${plural(x, "session")} could not be verified as still ours and ${x === 1 ? "was" : "were"} left running (records kept). Re-run \`claude daemon stop\` to retry.`,
            );
        },
        R = !1,
        w = !1,
        A = async (x, ee, ae = "daemon_stop_failed") => {
          if (x) logFeatureOk("daemon_stop");
          else logFeatureBad("daemon_stop", ae);
          return (
            await logEventTo1PAwaitable("tengu_daemon_control", {
              op_stop: !0,
              ok: x,
              reaped: ee,
              holderUnverified: ae === "daemon_stop_holder_unverified",
              sigkill: R,
              commandLineRefused: w,
            }),
            flushAndExitDaemon(x ? 0 : 1)
          );
        },
        U = await daemonServiceStatus(),
        re = await readLiveServerLock(1, D),
        X = re && hasProcIdentity(re) && isProbeablePid(re.pid) ? re : null,
        Q = re,
        fe;
      if (!Q) {
        let x = await readDaemonLock(D);
        if (x && isProcessRunning(x.pid)) {
          let ee = await isClaudeProcess(x.pid),
            ae = ee ? await getProcessStartTimeAsync(x.pid, { skipCache: !0 }) : void 0,
            W = procIdentityOf(x),
            ge = W !== void 0 && ae !== void 0;
          if (!ee || (ge && ae !== W)) fe = x.pid;
          else if (ge) ((X = x), (Q = x));
          else Q = x;
        }
      }
      if (!U && Q && !rest.includes("--any"))
        return (
          H(
            X
              ? `no background service is installed, but a daemon is running (pid=${Q.pid}, origin=${Q.origin ?? "unknown"}). Run \`claude daemon stop --any\` to stop it.`
              : `no background service is installed, but pid=${Q.pid} is holding the daemon lock. Run \`claude daemon stop --any\` to stop any background sessions and report on the holder.`,
          ),
          flushAndExitDaemon(1)
        );
      let le = "";
      if (Q && P6()) {
        let [{ readServedFolders: x }, { servedBackgroundShellsIn: ee }] = await Promise.all([
            import("./chunk-m8tcv902.js"),
            import("./chunk-rskr11sp.js"),
          ]),
          ae = await withDeadline(
            x(Q.pid, D).then((W) => ee(W.map((ge) => ge.dir))),
            2000,
          );
        if (ae)
          le = `
note: cloud sessions had ${ae} background ${plural(ae, "command")} running in the folders this daemon served; the ones it was serving are stopped too`;
      }
      let _e = await controlRequest({ proto: BG_PROTO, op: "shutdown", reapWorkers: !included });
      if (_e.ok && _e.op === "shutdown") {
        let x = included
          ? { reaped: 0, kept: 0 }
          : await reapAllBackgroundJobs({ supervisorKilledAll: !0 }, D);
        P(x.kept);
        let max = Math.max(_e.reaped, x.reaped);
        if (U) {
          let ae = await vtn();
          if (!ae.ok) return (H(`stop failed: ${ae.error}`), A(!1, max));
        }
        if ((j(L(max) + le), !U)) j("note: the next `claude agents` or `claude --bg` will start a new one");
        return A(!0, max);
      }
      let q = !1,
        Z;
      if (U) {
        let x = await vtn();
        if (!x.ok) return (H(`stop failed: ${x.error}`), A(!1, 0));
        q = !0;
      } else if (X && getPlatform() !== "windows") {
        if (
          (H(
            `note: the ${bgSupervisorNoun()} (pid=${X.pid}) did not answer; asking it to exit (SIGTERM) and waiting up to ${nt / 1000}s`,
          ),
          (Z = await stopDaemonProcess(X, { gracefulMs: nt })),
          (w = Z === "not-a-daemon"),
          Z === "timed-out")
        )
          (H(`note: the ${bgSupervisorNoun()} (pid=${X.pid}) is still running; force-killing it (SIGKILL)`),
            (R = !0),
            (Z = await stopDaemonProcess(X, { signal: "SIGKILL" })));
        if (Z === "eperm")
          return (
            H(
              `could not stop the ${bgSupervisorNoun()} (pid=${X.pid}): it belongs to another user, so this account cannot signal it. Stop it from that account. No sessions were ended.`,
            ),
            A(!1, 0)
          );
        q = Z === "exited";
      }
      let B = included ? { reaped: 0, kept: 0 } : await reapAllBackgroundJobs({}, D),
        reaped = B.reaped;
      if ((P(B.kept), X && !q && getPlatform() === "windows"))
        return (
          H(
            (reaped > 0 ? `terminated ${reaped} background session(s); ` : "") +
              `supervisor (pid=${X.pid}) is still running \u2014 stop it with ` +
              `\`taskkill /PID ${X.pid}\` or close the terminal it was started in.`,
          ),
          A(!1, reaped)
        );
      if (X && !q) {
        let x = bgSupervisorNoun(),
          ee;
        if (Z === "timed-out")
          ee = `after SIGKILL. A process that outlives SIGKILL is usually waiting inside the operating system, for example on a network drive that stopped answering, and exits by itself once that wait ends. Until then, \`claude agents\` and \`claude --bg\` cannot start a new ${x}. \`claude daemon status\` says "not running" once it has gone; if it never goes, restart the computer.`;
        else if (R)
          ee = `after SIGKILL, and could no longer be verified as the ${x}. It should exit shortly. If \`claude agents\` or \`claude --bg\` still cannot start a new ${x} in a minute, restart the computer.`;
        else
          ee = `${nt / 1000}s after SIGTERM, and could no longer be verified as the ${x}, so it was not sent SIGKILL. While it runs, \`claude agents\` and \`claude --bg\` may not be able to start a new ${x}. Re-run \`claude daemon stop --any${included ? " --keep-workers" : ""}\`. If that does not stop it, run \`ps -ww -o args= -p ${X.pid}\`: if that shows Claude Code started with "daemon" (for example \`\u2026/claude daemon \u2026\` or \`\u2026/cli.js daemon \u2026\`), stop it with \`kill -9 ${X.pid}\`. If it shows anything else, another program probably has that pid: leave it alone, and if \`claude agents\` or \`claude --bg\` still cannot start a new ${x}, delete ${daemonLockPath()}.`;
        return (
          H(
            (reaped > 0 ? `terminated ${reaped} background ${plural(reaped, "session")}; ` : "") +
              `the ${x} was not stopped: pid=${X.pid} is still running ` +
              ee +
              (included ? " No sessions were ended." : ""),
          ),
          A(!1, reaped, "daemon_stop_still_running")
        );
      }
      if (!q && !X && Q) {
        let x = Q.pid === 1;
        return (
          H(
            (reaped > 0 ? `terminated ${reaped} background ${plural(reaped, "session")}; ` : "") +
              `the daemon was not stopped: pid=${Q.pid} is holding ${daemonLockPath()} ` +
              (x
                ? "and this command never signals pid 1. If that is a container's entrypoint, stop the container; if not, delete that file."
                : `but could not be verified as the daemon, so it was not signalled. If no daemon is running, delete that file; if pid ${Q.pid} is a live process you own, stop it yourself.`),
          ),
          A(!1, reaped, x ? "daemon_stop_holder_is_init" : "daemon_stop_holder_unverified")
        );
      }
      if (fe !== void 0)
        H(
          `note: ${daemonLockPath()} is stale (pid=${fe} is not the daemon). The next daemon start reclaims it automatically.`,
        );
      if (!q && !X && reaped === 0) j("no daemon running");
      else if ((j(L(reaped) + le), !U && X))
        j("note: the next `claude agents` or `claude --bg` will start a new one");
      return A(!0, reaped);
    }
    case "status": {
      stripDebugArgs(rest, []);
      let E = await readLiveServerLock(1, D);
      if (!E) {
        j("not running");
        let q = processWrapperError();
        if (q) j(`warning: ${q} \u2014 background sessions will refuse to start rather than run unwrapped`);
        else if (processWrapperRecord())
          j(
            `launcher: (none running) \u2014 this claude resolves \`${processWrapperRecord()}\` and will start the next ${bgSupervisorNoun()} through it`,
          );
        let { getBgDaemonStatus: getBgDaemonStatus, formatBgDaemonStatus: formatBgDaemonStatus } =
          await import("./chunk-czxapneg.js");
        return (
          j(formatBgDaemonStatus(await getBgDaemonStatus(D))),
          await printServedBackgroundShells(),
          flushAndExitDaemon(1)
        );
      }
      let floored = Math.floor((Date.now() - E.startedAt) / 1000);
      (j(`pid:     ${E.pid}`),
        j(`version: ${E.version}`),
        j(`uptime:  ${floored}s`),
        j(`origin:  ${describeDaemonOrigin(E)}`),
        j(`config:  ${E.jsonPath}`),
        j(`log:     ${E.logPath}`));
      let P = processWrapperError(),
        R = processWrapperRecord(),
        w = E.processWrapper ?? "",
        A = "";
      if (P || R || w) {
        let q = await controlRequest({ proto: BG_PROTO, op: "nudge" }).catch(() => null);
        A = q?.ok && q.op === "nudge" ? (q.processWrapper ?? "") : w;
      }
      let U = truncateToLength(Dr(Yn(A)), 200);
      if (P || A || R) {
        if ((j(`launcher: ${U || "(none)"}`), E.origin === "service" && (R || A)))
          j(
            "  note: the installed service process itself runs outside the launcher; the sessions it spawns are covered \u2014 a launcher-aware `claude daemon install` closes this",
          );
        if (P) {
          if (
            (j(""),
            j(`warning: ${P} \u2014 background sessions will refuse to start rather than run unwrapped`),
            A)
          )
            j(
              `  the running ${bgSupervisorNoun()} still launches sessions via \`${U}\`; do NOT restart it until this is fixed, or no daemon will start at all`,
            );
        } else if (A !== R)
          (j(""),
            j(
              `warning: the running ${bgSupervisorNoun()} launches sessions via \`${U || "(no launcher)"}\`, but this claude resolves \`${R || "(no launcher)"}\``,
            ),
            j(
              "  restart it \u2014 and your running claude sessions \u2014 to apply the current CLAUDE_CODE_PROCESS_WRAPPER",
            ));
      }
      let { getBgDaemonStatus: getBgDaemonStatus, formatBgDaemonStatus: formatBgDaemonStatus } =
          await import("./chunk-czxapneg.js"),
        Q = await getBgDaemonStatus(D);
      j(formatBgDaemonStatus(Q));
      let { readServedFolders: readServedFolders, servingToolsLines: servingToolsLines } =
        await import("./chunk-m8tcv902.js");
      for (let q of servingToolsLines(await readServedFolders(E.pid, D))) j(q);
      await printServedBackgroundShells();
      let origin = E.origin;
      if (origin === "transient" || origin === "auto") {
        j("");
        let q = Q.workersLive ?? 0,
          leaseClients = Q.leaseClients;
        if (q > 0 || leaseClients.length > 0) {
          if ((j("holding this daemon open:"), q > 0))
            j(`  ${q} ${plural(q, "bg worker")} running (daemon waits for them to settle)`);
          for (let B of leaseClients)
            j(`  \`${B.label}\`${B.cloudSessionId ? ` ${B.cloudSessionId}` : ""} (pid ${B.pid}) in ${B.cwd}`);
          (j(""),
            j(
              `to let it idle-exit: wait for (or cancel) bg workers and close any \`claude agents\`${leaseClients.some((B) => B.label === CLOUD_SESSION_LEASE_LABEL) ? " and the `cloud session` clients listed above" : ""}`,
            ));
        } else if (Q.workersLive === 0) j("nothing holding this daemon open \u2014 will idle-exit shortly");
      }
      if (
        E.version !==
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
        }.VERSION
      ) {
        (j(""),
          j(
            `warning: running daemon is ${E.version}, but this claude is ${{ ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues", PACKAGE_URL: "@anthropic-ai/claude-code", README_URL: "https://code.claude.com/docs/en/overview", VERSION: "2.1.316", FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues", BUILD_TIME: "2026-10-30T23:28:13Z", GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1", HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js", DD_SOURCEMAP_GROUP: "default" }.VERSION}`,
          ));
        let q = (await daemonServiceStatus()) ? "claude daemon stop" : "claude daemon stop --any";
        j(`  run \`${q}\` to pick up the new version`);
      }
      return flushAndExitDaemon(0);
    }
    case "logs":
    case "log": {
      (stripDebugArgs(rest, []), await tailDaemonLogFile(logPath, D));
      return;
    }
    default:
      (H(`unknown subcommand: ${y}`), H(""), H(Ot()), process.exit(1));
  }
}
/**
 * 停止守护进程并确认其退出（必要时 SIGKILL），返回结局。
 */
//@ chunk-ss669z1x.js:86121-86429 placement
async function stopDaemonProcess(r, e) {
  let o = await signalPid(r.pid, e);
  if (o !== "timed-out") return o;
  if (await hasExitedUnreaped(r.pid)) return "exited";
  let n = e.signal === "SIGKILL" || (await readProcCmdline(r.pid)),
    i = procIdentityOf(r),
    h = await captureProcessStartTimeAsync(r.pid);
  if (i === void 0 || h === void 0) return isProcessRunning(r.pid) ? "unverified" : "exited";
  if (h !== i) return "exited";
  return n ? "timed-out" : "not-a-daemon";
}
//@ chunk-ss669z1x.js:86429-86649 placement
async function printServedBackgroundShells() {
  if (!P6()) return;
  let {
    readServedBackgroundShells: readServedBackgroundShells,
    servedBackgroundShellLines: servedBackgroundShellLines,
  } = await import("./chunk-rskr11sp.js");
  for (let o of servedBackgroundShellLines(await readServedBackgroundShells(), {
    now: Date.now(),
    stopHint: isDaemonCliEnabled() && isWorkerKindAdmitted("remoteControl"),
  }))
    j(o);
}
/**
 * 后台拉起 claude daemon run 并等待其就绪，失败时报告 stderr 路径。
 */
//@ chunk-ss669z1x.js:86649-87577 placement
async function spawnDaemon(r, e, o, n) {
  let { err: err, stderrPath: stderrPath } = await resolveAgentLauncher([
      "daemon",
      "run",
      "--json-path",
      r,
      "--log-file",
      e,
      "--origin",
      o,
      ...(n ? ["--spawned-by", jsonStringify(n)] : []),
    ]),
    S = err
      ? `failed to spawn: ${errorMessage(err)}`
      : (await waitForDaemonPing(s5))
        ? null
        : `spawned but never became reachable within ${s5 / 1000}s`;
  if (S !== null) {
    let u = stderrPath
        ? $A(((await readSmallFileOrNull(stderrPath, 1048576)) ?? "").trim()).slice(-2000)
        : "",
      y = await openBgDispatchLog(e).catch(() => null);
    if (
      (y?.write(
        "supervisor",
        `upgrade self-respawn ${S} \u2014 bg workers may be orphan-reaped ~60s after this process exits unless a client restarts the daemon (run \`claude agents\`)` +
          (u ? `; successor stderr: ${u}` : ""),
      ),
      await y?.close(),
      !err)
    )
      await logEventTo1PAwaitable("tengu_daemon_upgrade_respawn_unreachable", {
        stderr_captured: u.length > 0,
      });
  }
  if (stderrPath) rm(dirname(stderrPath), { recursive: !0, force: !0 }).catch(() => {});
  if (err)
    (logError(`daemon: upgrade self-respawn failed: ${errorMessage(err)}`),
      await logEventTo1PAwaitable("tengu_bg_daemon_spawn_failed", {
        respawn: !0,
        errno_enoent: getErrnoCode(err) === "ENOENT",
        errno_eacces: getErrnoCode(err) === "EACCES",
        errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
      }));
}
/**
 * 用 tail -f 跟随守护进程日志文件。
 */
//@ chunk-ss669z1x.js:87577-88204 placement
async function tailDaemonLogFile(r, e) {
  {
    let S = spawn("tail", ["-f", r], { stdio: "inherit", ...Nd("helper") });
    await new Promise((u) => {
      (S.on("exit", (y) => {
        if (y) process.exitCode = y;
        u();
      }),
        S.on("error", (y) => {
          (H(`tail failed: ${y.message}`), process.exit(1));
        }));
    });
    return;
  }
  if (isStorageV5Enabled() && e !== void 0 && r === Fye()) {
    await tailDaemonLogStorage(r, e);
    return;
  }
  let o;
  try {
    o = await open(r, "r");
  } catch (error) {
    (H(`cannot open ${r}: ${errorMessage(error)}`), process.exit(1));
  }
  let size = (await o.stat()).size,
    alloc = Buffer.alloc(65536),
    h = !1;
  process.on("SIGINT", () => {
    h = !0;
  });
  while (!h) {
    if ((await o.stat()).size < size) size = 0;
    let { bytesRead: bytesRead } = await o.read(alloc, 0, alloc.length, size);
    if (bytesRead > 0) (process.stdout.write(alloc.subarray(0, bytesRead)), (size += bytesRead));
    else await sleep(500);
  }
  await o.close();
}
/**
 * 从存储后端读取并跟随 daemon-log 记录流。
 */
//@ chunk-ss669z1x.js:88204-89055 placement
async function tailDaemonLogStorage(r, e) {
  let state = STORAGE_SPACES.state("daemon-log"),
    read = await e.read([{ key: state, offset: 0, length: 0 }]);
  if (!read.ok || !read.value.items[0].found)
    (H(`cannot open ${r}: ${read.ok ? "no such file or directory" : formatStorageError(read.error)}`),
      process.exit(1));
  let totalBytes = read.value.items[0].totalBytes,
    h = !1;
  process.on("SIGINT", () => {
    h = !0;
  });
  let S = !1;
  while (!h) {
    let read = await e.read([{ key: state, offset: totalBytes, length: 65536 }]);
    if (!read.ok) {
      if (
        read.error.code === "Unavailable" ||
        (read.error.code === "Failed" && read.error.failureClass === "permission")
      ) {
        if (!S) (H(`cannot read ${r}: ${formatStorageError(read.error)}; retrying`), (S = !0));
        await sleep(500);
        continue;
      }
      (H(`cannot read ${r}: ${formatStorageError(read.error)}`), process.exit(1));
    }
    let y = read.value.items[0];
    if (!y.found) {
      if (!S) (H(`cannot read ${r}: no such file or directory; retrying`), (S = !0));
      await sleep(500);
      continue;
    }
    if (((S = !1), y.totalBytes < totalBytes)) {
      totalBytes = 0;
      continue;
    }
    if (y.value.length > 0) (process.stdout.write(y.value), (totalBytes += y.value.length));
    else await sleep(500);
  }
}
