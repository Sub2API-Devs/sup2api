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
import { rm, open } from "fs/promises";
import { spawn } from "child_process";
import {
  isDaemonServiceInstallEnabled,
  isDaemonWorkerRegistryEnabled,
  ensureFleetGateHydrated,
  isDaemonCliEnabled,
  fleetGateRejected,
  isAgentViewDisabled,
  bgSupervisorNoun,
} from "../../utils/fleetGates.js";
import { isWorkerKindAdmitted } from "../../daemon/runDaemonWorker.js";
import { daemonJsonPath, daemonLogPath } from "../../services/daemon/paths.js";
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
import {
  DAEMON_START_BUDGET_MS,
  waitForServiceDaemon,
  waitForDaemonPing,
} from "../../services/daemon/ensureDaemon.js";
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
  startDaemonService,
  restartDaemonService,
  uninstallDaemonService,
  stopDaemonService,
} from "../../services/daemon/serviceInstall.js";
import {
  processWrapperProblem,
  processWrapperError,
  processWrapperRecord,
} from "../../utils/processWrapper.js";
import { getPlatform } from "../../utils/platform.js";
import { plural, truncateToLength, collapseWhitespace } from "../../utils/stringUtils.js";
import {
  isProbeablePid,
  getProcessStartTimeAsync,
  procIdentityOf,
  hasExitedUnreaped,
  captureProcessStartTimeAsync,
} from "../../utils/processIdentity.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { isViolinVarnishOn } from "../../services/remoteTools/backgroundCommands.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { reapAllBackgroundJobs } from "../../services/daemon/reapJobs.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { resolveAgentLauncher } from "../../services/daemon/spawnLauncher.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { redactDaemonPipeKey } from "../../utils/sandbox/userNamespace.js";
import { readSmallFileOrNull } from "../../utils/readSmallFile.js";
import { openBgDispatchLog } from "../../daemon/bgDispatch.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { cgroupSpawnOptions } from "../../utils/toolCgroup.js";
import { STORAGE_SPACES } from "../../utils/storage/storageSpaces.js";
import { formatStorageError } from "../../utils/storage/storageErrors.js";

//@ chunk-ss669z1x.js:64258-65764 placement
/**
 * claude daemon 的用法文本与列宽等常量。
 */
var DAEMON_USAGE = 70;
var DAEMON_STOP_GRACE_MS = 1e4;
var DAEMON_USAGE_LIFECYCLE = `Usage: claude daemon [subcommand] [options]

Service lifecycle:
  run [json-path]   Run the supervisor in the foreground (default when piped)
  status            Show daemon pid, version, uptime
  logs              Tail the daemon log (Ctrl-C to stop)
  uninstall         Remove the background service (launchctl/systemd)
  stop              Shut down the supervisor and terminate background sessions
                      --any           also stop a transient (non-service) daemon
                      --keep-workers  leave detached sessions running
`;
var DAEMON_USAGE_SERVICE_INSTALL = `  install           Install as a launchctl/systemd service (persists across reboot)
  start             Start the installed service
  restart           Restart the installed service
`;
var DAEMON_USAGE_SERVICE_DISABLED = `
  Service install is disabled in this version \u2014 the daemon runs on demand
  and exits when the last client disconnects.
`;
var DAEMON_USAGE_REMOTE_CONTROL = `  remote-control list [--json]              List remote-control servers
  remote-control add [--dir <path>] [--name <n>]
                     [--spawn-mode same-dir|worktree]
  remote-control remove <name-or-dir>
`;
var DAEMON_USAGE_WORKER_REGISTRY_EMPTY = "";
var DAEMON_USAGE_REMOTE_CONTROL_SECTION = `
Remote Control servers (add/remove require the service to be installed):
${DAEMON_USAGE_REMOTE_CONTROL}`;
var DAEMON_USAGE_OPTIONS = `
Options:
  --json-path <p>   Config file (default: ~/.claude/daemon.json)
  --log-file <p>    Log file (default: ~/.claude/daemon.log)
  --help, -h        Show this help
`;
var DAEMON_SUBCOMMANDS_WITHOUT_TRUST = new Set(["list", "scheduled", "remote-control", "hub"]);
var DAEMON_SERVICE_SUBCOMMANDS = new Set(["status", "stop", "uninstall"]);
var DAEMON_DAEMON_COMMAND_NAMES = new Set(["run", ...DAEMON_SERVICE_SUBCOMMANDS]);
//@ chunk-ss669z1x.js:65764-65843 placement
function daemonUsageText() {
  return (
    DAEMON_USAGE_LIFECYCLE +
    (isDaemonServiceInstallEnabled() ? DAEMON_USAGE_SERVICE_INSTALL : DAEMON_USAGE_SERVICE_DISABLED) +
    (isDaemonWorkerRegistryEnabled()
      ? DAEMON_USAGE_WORKER_REGISTRY_EMPTY
      : isWorkerKindAdmitted("remoteControl")
        ? DAEMON_USAGE_REMOTE_CONTROL_SECTION
        : "") +
    DAEMON_USAGE_OPTIONS
  );
}
//@ chunk-ss669z1x.js:65843-67094 placement
/**
 * 解析 claude daemon 的参数（--json-path、--log-file、--origin、--spawned-by、子命令）。
 */
function parseDaemonArgs(r) {
  let e = daemonJsonPath();
  let o = false;
  let n = daemonLogPath();
  let i;
  let spawnedBy;
  let S = new Set();
  for (let idx = 0; idx < r.length; idx++) {
    let A = r[idx];
    if (A === "--json-path" && r[idx + 1]) {
      S.add(idx);
      S.add(++idx);
      e = r[idx];
      o = true;
    } else if (A.startsWith("--json-path=")) {
      S.add(idx);
      e = A.slice(12);
      o = true;
    } else if (A === "--log-file" && r[idx + 1]) {
      S.add(idx);
      S.add(++idx);
      n = r[idx];
    } else if (A.startsWith("--log-file=")) {
      S.add(idx);
      n = A.slice(11);
    } else if (A === "--origin" && r[idx + 1]) {
      S.add(idx);
      S.add(++idx);
      i = parseDaemonOrigin(r[idx]);
    } else if (A.startsWith("--origin=")) {
      S.add(idx);
      i = parseDaemonOrigin(A.slice(9));
    } else if (A === "--spawned-by" && r[idx + 1]) {
      S.add(idx);
      S.add(++idx);
      spawnedBy = parseSpawnedByJson(r[idx]);
    }
  }
  let u = [];
  for (let idx = 0; idx < r.length; idx++) if (!S.has(idx)) u.push(r[idx]);
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
  ]);
  let sub = process.stdin.isTTY ? "hub" : "run";
  let E = -1;
  for (let idx = 0; idx < u.length; idx++)
    if (!u[idx].startsWith("-")) {
      E = idx;
      break;
    }
  if (E === -1)
    return {
      sub,
      jsonPath: e,
      logPath: n,
      origin: i,
      spawnedBy,
      rest: u,
    };
  let L = u[E];
  if (!y.has(L)) {
    if (!/[./\\~]/.test(L))
      return {
        sub: L,
        jsonPath: e,
        logPath: n,
        origin: i,
        spawnedBy,
        rest: [],
      };
    return {
      sub: "run",
      jsonPath: o ? e : L,
      logPath: n,
      origin: i,
      spawnedBy,
      rest: [],
    };
  }
  let P = [...u.slice(0, E), ...u.slice(E + 1)];
  let R = L;
  if (R === "run" && !o) {
    let found = P.find((A) => !A.startsWith("-"));
    if (found) e = found;
  }
  return {
    sub: R,
    jsonPath: e,
    logPath: n,
    origin: i,
    spawnedBy,
    rest: P,
  };
}
//@ chunk-ss669z1x.js:67094-67209 placement
function parseDaemonOrigin(value) {
  if (value === "service" || value === "transient" || value === "foreground") return value;
  if (value === "auto") return "transient";
  return;
}
//@ chunk-ss669z1x.js:67209-67479 placement
function describeDaemonOrigin(status) {
  let origin = status.origin ?? "unknown";
  if (origin !== "transient" && origin !== "auto") return origin;
  let o = LeaseClientSchema().safeParse(status.spawnedBy).data;
  if (!o) return "transient \u2014 started on-demand by a client";
  return `transient \u2014 started on-demand by \`${o.label}\` (pid ${o.pid}) in ${o.cwd}`;
}
//@ chunk-ss669z1x.js:67479-67685 placement
function parseSpawnedByJson(json) {
  let e = safeParseJSON(json, false);
  if (e === null || typeof e !== "object") return;
  let o = e;
  if (typeof o.label === "string" && typeof o.cwd === "string" && typeof o.pid === "number")
    return {
      label: o.label,
      cwd: o.cwd,
      pid: o.pid,
    };
  return;
}
//@ chunk-ss669z1x.js:67685-67727 placement
function daemonPrint(r) {
  process.stdout.write(
    r +
      `
`,
  );
}
//@ chunk-ss669z1x.js:67727-67769 placement
function daemonPrintErr(r) {
  process.stderr.write(
    r +
      `
`,
  );
}
//@ chunk-ss669z1x.js:67769-68118 placement
/**
 * 去掉 argv 中的调试相关标志和指定参数。
 */
function stripDebugArgs(r, e) {
  let o = [];
  for (let idx = 0; idx < r.length; idx++) {
    let i = r[idx];
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
    if (i === "--debug-file" && idx + 1 < r.length) {
      idx++;
      continue;
    }
    o.push(i);
  }
  if (o.length > 0) daemonPrintErr(`warning: extra arguments ignored: ${o.join(" ")}`);
}
//@ chunk-ss669z1x.js:68118-68318 placement
function foregroundDaemonRefusalMessage(action, pid) {
  return `${action} refused: a foreground daemon (pid ${pid}, started with \`claude daemon run\`) holds the daemon lock \u2014 stop it first (Ctrl-C in its terminal or \`claude daemon stop\`)`;
}
//@ chunk-ss669z1x.js:68318-68653 placement
/**
 * 停止守护进程被拒时（eperm/unverified/timed-out）给出说明。
 */
function describeDaemonStopRefusal(r, serverLockStatus) {
  let o;
  switch (serverLockStatus.outcome) {
    case "eperm":
      o = "Stop it from the account that owns it";
      break;
    case "unverified":
      o = stopDaemonHint();
      break;
    case "timed-out":
      o = `Wait for it to exit (or kill pid ${serverLockStatus.pid})`;
      break;
  }
  return `${r} refused: ${lockHolderProblemText(serverLockStatus)} \u2014 a freshly started service would lose the lockfile race to it and crash-loop. ${o}, then retry.`;
}
//@ chunk-ss669z1x.js:68653-68747 placement
function daemonRefusalMessage(r, pid) {
  return `${r} refused: ${unknownDaemonText(pid)}. Stop it (\`claude daemon stop\`) and retry.`;
}
//@ chunk-ss669z1x.js:68747-69128 placement
/**
 * 服务管理器已接受操作但守护进程在超时内不可达时的警告文字。
 */
function daemonUnreachableWarning(r) {
  return `warning: the service manager accepted the ${r}, but the installed daemon is not reachable after ${DAEMON_START_BUDGET_MS / 1000}s \u2014 the first start after an update can be slow. Check \`claude daemon status\` and \`claude daemon logs\`; if the service file points at a binary or launcher that no longer exists, \`claude daemon install\` rewrites it from the current settings.`;
}
//@ chunk-ss669z1x.js:69128-69268 placement
async function flushAndExitDaemon(exitCode) {
  await Promise.race([
    Promise.all([shutdown1PEventLogging(), shutdownDatadog()]),
    sleep(500, undefined, {
      unref: true,
    }),
  ]).catch(() => {});
  await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
  process.exit(exitCode);
}
//@ chunk-ss669z1x.js:69268-86121 placement
/**
 * claude daemon 子命令入口：run/status/logs/stop/install/hub 等服务生命周期操作。
 */
async function daemonMain(r, e) {
  await ensureFleetGateHydrated({
    kickGrowthBook: false,
  });
  if (r.includes("--help") || r.includes("-h")) {
    if (!isDaemonCliEnabled()) return fleetGateRejected("daemon");
    daemonPrint(daemonUsageText());
    return;
  }
  let daemonArgs = parseDaemonArgs(r);
  let { jsonPath, logPath, origin, spawnedBy, rest } = daemonArgs;
  let sub = daemonArgs.sub === "hub" && !isDaemonWorkerRegistryEnabled() ? "status" : daemonArgs.sub;
  if (sub !== "run") {
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_cosmos", true) !== false)
      setIsInteractive(Boolean(process.stdout.isTTY));
  }
  if (!DAEMON_DAEMON_COMMAND_NAMES.has(sub)) {
    let E = await runFastPathPolicyHelper();
    if (E) {
      process.stderr.write(`${E}
`);
      process.exit(1);
    }
    if (!isDaemonCliEnabled()) return fleetGateRejected("daemon");
  } else if (sub === "run" || sub === "status") {
    let E = await runFastPathPolicyHelper();
    if (E)
      logForDebugging(`daemon ${sub}: policy helper failed (continuing on static managed settings): ${E}`, {
        level: "warn",
      });
  }
  if (
    DAEMON_SUBCOMMANDS_WITHOUT_TRUST.has(sub) &&
    !(sub === "remote-control" ? isWorkerKindAdmitted("remoteControl") : isDaemonWorkerRegistryEnabled())
  )
    return fleetGateRejected(`daemon ${sub}`);
  try {
    let { restoreGatewayAuthForFastPath } = await import("./chunk-hfbqbw5b.js");
    await restoreGatewayAuthForFastPath();
  } catch (error) {
    logForDebugging(
      `daemon ${sub}: could not load the Cloud gateway sign-in, so this daemon runs as if it were not signed in to the gateway, until it restarts. Fix this error: ${errorMessage(error)}`,
      {
        level: "warn",
      },
    );
  }
  configureGlobalAgents();
  initializeAnalyticsSink();
  if (!DAEMON_SERVICE_SUBCOMMANDS.has(sub) && hasWorkspaceTrust()) initializeGrowthBook().catch(() => {});
  let D = pinStorageV5(e);
  if (isStorageV5Enabled() && D !== undefined) {
    initDefaultDebugLog({
      storageV5: D,
    });
    watchGlobalConfigThroughStorage(D);
    let [{ composePolicyLimitsClient: E, primePolicyLimitsCache: L }, { primeFastPathCredentials: P }] =
      await Promise.all([import("./chunk-qchbrsbw.js"), import("./chunk-ts9rfgqd.js")]);
    let R = credentialsStoreFor(D);
    setGrowthBookCredentials(R);
    setGrowthBookStorageBackend(D);
    E({
      storageV5: D,
      credentials: R,
    });
    await P(R);
    await L(D);
    await seedInstallIDs(D);
  }
  switch ((initialize1PEventLogging(D), sub)) {
    case "list": {
      stripDebugArgs(rest, ["--json"]);
      let { handleListAllKinds } = await import("./chunk-7904g3ks.js");
      await handleListAllKinds(rest.includes("--json"), jsonPath, D);
      return;
    }
    case "scheduled":
    case "remote-control": {
      let { handleCliKind } = await import("./chunk-7904g3ks.js");
      await handleCliKind(sub, rest, jsonPath, D);
      return;
    }
    case "hub": {
      stripDebugArgs(rest, []);
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        daemonPrint("Interactive hub requires a TTY. See `claude daemon --help`.");
        return;
      }
      let { renderDaemonHubStandalone } = await import("./chunk-b7gstm5r.js");
      await renderDaemonHubStandalone(D);
      await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
      return process.exit(0);
    }
    case "run": {
      if (isAgentViewDisabled()) {
        daemonPrintErr("claude daemon: background agents disabled (3P/opt-out)");
        return process.exit(0);
      }
      process.title = "claude daemon";
      let E = resolve(jsonPath);
      let L = resolve(logPath);
      getDebugFilePath();
      try {
        processChdir(homedir());
      } catch {}
      lockCurrentVersion();
      let abortController = new AbortController();
      let R = false;
      let w = () => {
        if (R) {
          daemonPrintErr("forced shutdown");
          process.exit(1);
        }
        R = true;
        abortController.abort();
      };
      process.on("SIGINT", w);
      process.on("SIGTERM", w);
      let A = origin ?? "foreground";
      let U;
      let exitCode;
      try {
        ({ upgradeDetected: U, exitCode } = await runBgManager({
          jsonPath: E,
          logPath: L,
          origin: A,
          spawnedBy,
          signal: abortController.signal,
          storageV5: D,
        }));
      } catch (error) {
        logError(error);
        logFeatureBad("daemon_start", "daemon_start_crash");
        await Promise.all([
          logEventTo1PAwaitable("tengu_daemon_startup_crash", {}),
          trackDatadogEvent("tengu_daemon_startup_crash", {}),
        ]);
        return flushAndExitDaemon(1);
      }
      if (U) {
        if (A === "service") return flushAndExitDaemon(DAEMON_USAGE);
        await spawnDaemon(E, L, A, spawnedBy);
      }
      return flushAndExitDaemon(exitCode);
    }
    case "install": {
      stripDebugArgs(rest, []);
      if (!isDaemonServiceInstallEnabled()) {
        daemonPrintErr(
          `\`claude daemon ${sub}\` is disabled in this version \u2014 the daemon runs on demand and exits when the last client disconnects.`,
        );
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          disabled: true,
        });
        return flushAndExitDaemon(1);
      }
      if (!(await hasSystemdUserSession())) {
        daemonPrintErr(
          `Service install isn't available on ${"linux"} \u2014 the daemon still runs on demand when a client connects.`,
        );
        logFeatureBad("daemon_service_install", "daemon_service_install_unsupported");
        return flushAndExitDaemon(1);
      }
      if (process.env.CLAUDE_CONFIG_DIR) {
        daemonPrintErr(
          "service install only supports the default config dir \u2014 the launchd/systemd unit is a per-user singleton",
        );
        logFeatureBad("daemon_service_install", "daemon_service_install_config_dir");
        return flushAndExitDaemon(1);
      }
      let E = await processWrapperProblem();
      if (E) {
        logFeatureBad("daemon_service_install", "daemon_service_install_launcher");
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          launcher: true,
        });
        daemonPrintErr(`install refused: ${E}`);
        return flushAndExitDaemon(1);
      }
      let serverLockStatus = await getServerLockStatus(D);
      if (serverLockStatus.kind === "foreground") {
        logFeatureBad("daemon_service_install", "daemon_service_install_foreground");
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          foreground: true,
        });
        daemonPrintErr(foregroundDaemonRefusalMessage("install", serverLockStatus.lock.pid));
        return flushAndExitDaemon(1);
      }
      if (serverLockStatus.kind === "not-stopped") {
        logFeatureBad(
          "daemon_service_install",
          serverLockStatus.outcome === "unverified"
            ? "daemon_service_install_holder_unverified"
            : "daemon_service_install_holder_alive",
        );
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          holderAlive: true,
          holderUnverified: serverLockStatus.outcome === "unverified",
        });
        daemonPrintErr(describeDaemonStopRefusal("install", serverLockStatus));
        return flushAndExitDaemon(1);
      }
      if (serverLockStatus.kind === "unknown-origin") {
        logFeatureBad("daemon_service_install", "daemon_service_install_holder_unknown_origin");
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          holderAlive: true,
          holderUnknownOrigin: true,
        });
        daemonPrintErr(daemonRefusalMessage("install", serverLockStatus.lock.pid));
        return flushAndExitDaemon(1);
      }
      if (serverLockStatus.kind === "stopped")
        daemonPrint(`stopped detached daemon (pid ${serverLockStatus.pid})`);
      let P = await installDaemonService({
        jsonPath,
        logPath,
      });
      if (!P.ok) {
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
        });
        logFeatureBad("daemon_service_install", "daemon_service_install_failed");
        daemonPrintErr(`install failed: ${P.error}`);
        if (P.servicePath) daemonPrintErr(`  (service file was written to ${P.servicePath})`);
        return flushAndExitDaemon(1);
      }
      logFeatureOk("daemon_service_install");
      daemonPrint(`installed: ${P.servicePath}`);
      let R = await waitForServiceDaemon(DAEMON_START_BUDGET_MS, D);
      await logEventTo1PAwaitable("tengu_daemon_install", {
        ok: true,
        reachable: R !== null,
      });
      if (R)
        daemonPrint(
          `running: pid=${R.pid} origin=${R.origin} (managed by ${getPlatform() === "macos" ? "launchd" : "systemd"})`,
        );
      else
        daemonPrintErr(
          `warning: service installed but the daemon is not running as the installed service within ${DAEMON_START_BUDGET_MS / 1000}s \u2014 check \`claude daemon logs\``,
        );
      return flushAndExitDaemon(0);
    }
    case "start":
    case "restart": {
      stripDebugArgs(rest, []);
      if (!isDaemonServiceInstallEnabled()) {
        daemonPrintErr(
          `\`claude daemon ${sub}\` is disabled in this version \u2014 the daemon runs on demand and exits when the last client disconnects.`,
        );
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          disabled: true,
        });
        return flushAndExitDaemon(1);
      }
      if (!(await hasSystemdUserSession())) {
        daemonPrintErr(
          `\`claude daemon ${sub}\` isn't available on ${"linux"} (no launchd/systemd) \u2014 the daemon runs on demand instead.`,
        );
        process.exit(1);
      }
      if (process.env.CLAUDE_CONFIG_DIR) {
        daemonPrintErr("the launchd/systemd unit is a per-user singleton for the default config dir");
        process.exit(1);
      }
      if (!(await daemonServiceStatus())) {
        daemonPrintErr("service not installed \u2014 run `claude daemon install` first");
        process.exit(1);
      }
      let E = await processWrapperProblem();
      if (E) {
        logFeatureBad("daemon_service_install", "daemon_service_install_launcher");
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: false,
          launcher: true,
        });
        daemonPrintErr(`${sub} refused: ${E}`);
        return flushAndExitDaemon(1);
      }
      let serverLockStatus = await getServerLockStatus(D);
      if (serverLockStatus.kind === "foreground") {
        logFeatureBad("daemon_service_install", "daemon_service_install_foreground");
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: false,
          foreground: true,
        });
        daemonPrintErr(foregroundDaemonRefusalMessage(sub, serverLockStatus.lock.pid));
        return flushAndExitDaemon(1);
      }
      if (serverLockStatus.kind === "not-stopped") {
        logFeatureBad(
          "daemon_service_install",
          serverLockStatus.outcome === "unverified"
            ? "daemon_service_install_holder_unverified"
            : "daemon_service_install_holder_alive",
        );
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          holderUnverified: serverLockStatus.outcome === "unverified",
          ok: false,
          holderAlive: true,
        });
        daemonPrintErr(describeDaemonStopRefusal(sub, serverLockStatus));
        return flushAndExitDaemon(1);
      }
      if (serverLockStatus.kind === "unknown-origin") {
        logFeatureBad("daemon_service_install", "daemon_service_install_holder_unknown_origin");
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: false,
          holderAlive: true,
          holderUnknownOrigin: true,
        });
        daemonPrintErr(daemonRefusalMessage(sub, serverLockStatus.lock.pid));
        return flushAndExitDaemon(1);
      }
      if (serverLockStatus.kind === "stopped")
        daemonPrint(`stopped detached daemon (pid ${serverLockStatus.pid})`);
      let P = await checkServiceExecStart();
      if (P.execPathStale || P.launcherPrefixDead) {
        daemonPrint(
          P.execPathStale
            ? "service binary missing \u2014 regenerating service file"
            : "installed service starts through a launcher that was deleted or is no longer executable \u2014 regenerating the service file from the current settings",
        );
        let A = await installDaemonService({
          jsonPath,
          logPath,
        });
        let U = A.ok && (await waitForServiceDaemon(DAEMON_START_BUDGET_MS, D)) !== null;
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: A.ok,
          regenerated: true,
          reachable: U,
        });
        if (A.ok && U) daemonPrint(sub === "start" ? "started" : "restarted");
        else if (A.ok) daemonPrintErr(daemonUnreachableWarning(sub));
        else daemonPrintErr(`regenerate failed: ${A.error}`);
        return flushAndExitDaemon(A.ok ? 0 : 1);
      }
      let R = await (sub === "start" ? startDaemonService() : restartDaemonService());
      if (!R.ok) {
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: false,
        });
        daemonPrintErr(`${sub} failed: ${R.error}`);
        return flushAndExitDaemon(1);
      }
      let w = (await waitForServiceDaemon(DAEMON_START_BUDGET_MS, D)) !== null;
      await logEventTo1PAwaitable("tengu_daemon_control", {
        op_start: sub === "start",
        op_restart: sub === "restart",
        ok: true,
        reachable: w,
      });
      if (w) daemonPrint(sub === "start" ? "started" : "restarted");
      else daemonPrintErr(daemonUnreachableWarning(sub));
      return flushAndExitDaemon(0);
    }
    case "uninstall": {
      stripDebugArgs(rest, []);
      let E = await uninstallDaemonService();
      await logEventTo1PAwaitable("tengu_daemon_control", {
        op_uninstall: true,
        ok: E.ok,
      });
      if (E.ok) {
        logFeatureOk("daemon_service_uninstall");
        daemonPrint("uninstalled");
      } else {
        logFeatureBad("daemon_service_uninstall", "daemon_service_uninstall_failed");
        daemonPrintErr(`uninstall failed: ${E.error}`);
      }
      return flushAndExitDaemon(E.ok ? 0 : 1);
    }
    case "stop": {
      let included = rest.includes("--keep-workers");
      stripDebugArgs(rest, ["--keep-workers", "--any"]);
      let L = (x) =>
        included || x === 0 ? "stopped" : `stopped (terminated ${x} ${plural(x, "background session")})`;
      let P = (kept) => {
        if (kept > 0)
          daemonPrintErr(
            `note: ${kept} background ${plural(kept, "session")} could not be verified as still ours and ${kept === 1 ? "was" : "were"} left running (records kept). Re-run \`claude daemon stop\` to retry.`,
          );
      };
      let R = false;
      let commandLineRefused = false;
      let A = async (x, reaped, ae = "daemon_stop_failed") => {
        if (x) logFeatureOk("daemon_stop");
        else logFeatureBad("daemon_stop", ae);
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_stop: true,
          ok: x,
          reaped,
          holderUnverified: ae === "daemon_stop_holder_unverified",
          sigkill: R,
          commandLineRefused,
        });
        return flushAndExitDaemon(x ? 0 : 1);
      };
      let U = await daemonServiceStatus();
      let liveServerLock = await readLiveServerLock(1, D);
      let X =
        liveServerLock && hasProcIdentity(liveServerLock) && isProbeablePid(liveServerLock.pid)
          ? liveServerLock
          : null;
      let Q = liveServerLock;
      let fe;
      if (!Q) {
        let daemonLock = await readDaemonLock(D);
        if (daemonLock && isProcessRunning(daemonLock.pid)) {
          let ee = await isClaudeProcess(daemonLock.pid);
          let ae = ee
            ? await getProcessStartTimeAsync(daemonLock.pid, {
                skipCache: true,
              })
            : undefined;
          let W = procIdentityOf(daemonLock);
          let ge = W !== undefined && ae !== undefined;
          if (!ee || (ge && ae !== W)) fe = daemonLock.pid;
          else if (ge) {
            X = daemonLock;
            Q = daemonLock;
          } else Q = daemonLock;
        }
      }
      if (!U && Q && !rest.includes("--any")) {
        daemonPrintErr(
          X
            ? `no background service is installed, but a daemon is running (pid=${Q.pid}, origin=${Q.origin ?? "unknown"}). Run \`claude daemon stop --any\` to stop it.`
            : `no background service is installed, but pid=${Q.pid} is holding the daemon lock. Run \`claude daemon stop --any\` to stop any background sessions and report on the holder.`,
        );
        return flushAndExitDaemon(1);
      }
      let le = "";
      if (Q && isViolinVarnishOn()) {
        let [{ readServedFolders: x }, { servedBackgroundShellsIn: ee }] = await Promise.all([
          import("./chunk-m8tcv902.js"),
          import("./chunk-rskr11sp.js"),
        ]);
        let ae = await withDeadline(
          x(Q.pid, D).then((W) => ee(W.map((ge) => ge.dir))),
          2000,
        );
        if (ae)
          le = `
note: cloud sessions had ${ae} background ${plural(ae, "command")} running in the folders this daemon served; the ones it was serving are stopped too`;
      }
      let _e = await controlRequest({
        proto: BG_PROTO,
        op: "shutdown",
        reapWorkers: !included,
      });
      if (_e.ok && _e.op === "shutdown") {
        let x = included
          ? {
              reaped: 0,
              kept: 0,
            }
          : await reapAllBackgroundJobs(
              {
                supervisorKilledAll: true,
              },
              D,
            );
        P(x.kept);
        let max = Math.max(_e.reaped, x.reaped);
        if (U) {
          let ae = await stopDaemonService();
          if (!ae.ok) {
            daemonPrintErr(`stop failed: ${ae.error}`);
            return A(false, max);
          }
        }
        daemonPrint(L(max) + le);
        if (!U) daemonPrint("note: the next `claude agents` or `claude --bg` will start a new one");
        return A(true, max);
      }
      let q = false;
      let Z;
      if (U) {
        let x = await stopDaemonService();
        if (!x.ok) {
          daemonPrintErr(`stop failed: ${x.error}`);
          return A(false, 0);
        }
        q = true;
      } else if (X && getPlatform() !== "windows") {
        daemonPrintErr(
          `note: the ${bgSupervisorNoun()} (pid=${X.pid}) did not answer; asking it to exit (SIGTERM) and waiting up to ${DAEMON_STOP_GRACE_MS / 1000}s`,
        );
        Z = await stopDaemonProcess(X, {
          gracefulMs: DAEMON_STOP_GRACE_MS,
        });
        commandLineRefused = Z === "not-a-daemon";
        if (Z === "timed-out") {
          daemonPrintErr(
            `note: the ${bgSupervisorNoun()} (pid=${X.pid}) is still running; force-killing it (SIGKILL)`,
          );
          R = true;
          Z = await stopDaemonProcess(X, {
            signal: "SIGKILL",
          });
        }
        if (Z === "eperm") {
          daemonPrintErr(
            `could not stop the ${bgSupervisorNoun()} (pid=${X.pid}): it belongs to another user, so this account cannot signal it. Stop it from that account. No sessions were ended.`,
          );
          return A(false, 0);
        }
        q = Z === "exited";
      }
      let B = included
        ? {
            reaped: 0,
            kept: 0,
          }
        : await reapAllBackgroundJobs({}, D);
      let reaped = B.reaped;
      P(B.kept);
      if (X && !q && getPlatform() === "windows") {
        daemonPrintErr(
          (reaped > 0 ? `terminated ${reaped} background session(s); ` : "") +
            `supervisor (pid=${X.pid}) is still running \u2014 stop it with ` +
            `\`taskkill /PID ${X.pid}\` or close the terminal it was started in.`,
        );
        return A(false, reaped);
      }
      if (X && !q) {
        let x = bgSupervisorNoun();
        let ee;
        if (Z === "timed-out")
          ee = `after SIGKILL. A process that outlives SIGKILL is usually waiting inside the operating system, for example on a network drive that stopped answering, and exits by itself once that wait ends. Until then, \`claude agents\` and \`claude --bg\` cannot start a new ${x}. \`claude daemon status\` says "not running" once it has gone; if it never goes, restart the computer.`;
        else if (R)
          ee = `after SIGKILL, and could no longer be verified as the ${x}. It should exit shortly. If \`claude agents\` or \`claude --bg\` still cannot start a new ${x} in a minute, restart the computer.`;
        else
          ee = `${DAEMON_STOP_GRACE_MS / 1000}s after SIGTERM, and could no longer be verified as the ${x}, so it was not sent SIGKILL. While it runs, \`claude agents\` and \`claude --bg\` may not be able to start a new ${x}. Re-run \`claude daemon stop --any${included ? " --keep-workers" : ""}\`. If that does not stop it, run \`ps -ww -o args= -p ${X.pid}\`: if that shows Claude Code started with "daemon" (for example \`\u2026/claude daemon \u2026\` or \`\u2026/cli.js daemon \u2026\`), stop it with \`kill -9 ${X.pid}\`. If it shows anything else, another program probably has that pid: leave it alone, and if \`claude agents\` or \`claude --bg\` still cannot start a new ${x}, delete ${daemonLockPath()}.`;
        daemonPrintErr(
          (reaped > 0 ? `terminated ${reaped} background ${plural(reaped, "session")}; ` : "") +
            `the ${x} was not stopped: pid=${X.pid} is still running ` +
            ee +
            (included ? " No sessions were ended." : ""),
        );
        return A(false, reaped, "daemon_stop_still_running");
      }
      if (!q && !X && Q) {
        let x = Q.pid === 1;
        daemonPrintErr(
          (reaped > 0 ? `terminated ${reaped} background ${plural(reaped, "session")}; ` : "") +
            `the daemon was not stopped: pid=${Q.pid} is holding ${daemonLockPath()} ` +
            (x
              ? "and this command never signals pid 1. If that is a container's entrypoint, stop the container; if not, delete that file."
              : `but could not be verified as the daemon, so it was not signalled. If no daemon is running, delete that file; if pid ${Q.pid} is a live process you own, stop it yourself.`),
        );
        return A(false, reaped, x ? "daemon_stop_holder_is_init" : "daemon_stop_holder_unverified");
      }
      if (fe !== undefined)
        daemonPrintErr(
          `note: ${daemonLockPath()} is stale (pid=${fe} is not the daemon). The next daemon start reclaims it automatically.`,
        );
      if (!q && !X && reaped === 0) daemonPrint("no daemon running");
      else {
        daemonPrint(L(reaped) + le);
        if (!U && X) daemonPrint("note: the next `claude agents` or `claude --bg` will start a new one");
      }
      return A(true, reaped);
    }
    case "status": {
      stripDebugArgs(rest, []);
      let status = await readLiveServerLock(1, D);
      if (!status) {
        daemonPrint("not running");
        let q = processWrapperError();
        if (q)
          daemonPrint(
            `warning: ${q} \u2014 background sessions will refuse to start rather than run unwrapped`,
          );
        else if (processWrapperRecord())
          daemonPrint(
            `launcher: (none running) \u2014 this claude resolves \`${processWrapperRecord()}\` and will start the next ${bgSupervisorNoun()} through it`,
          );
        let { getBgDaemonStatus, formatBgDaemonStatus } = await import("./chunk-czxapneg.js");
        daemonPrint(formatBgDaemonStatus(await getBgDaemonStatus(D)));
        await printServedBackgroundShells();
        return flushAndExitDaemon(1);
      }
      let floored = Math.floor((Date.now() - status.startedAt) / 1000);
      daemonPrint(`pid:     ${status.pid}`);
      daemonPrint(`version: ${status.version}`);
      daemonPrint(`uptime:  ${floored}s`);
      daemonPrint(`origin:  ${describeDaemonOrigin(status)}`);
      daemonPrint(`config:  ${status.jsonPath}`);
      daemonPrint(`log:     ${status.logPath}`);
      let P = processWrapperError();
      let R = processWrapperRecord();
      let processWrapper = status.processWrapper ?? "";
      let A = "";
      if (P || R || processWrapper) {
        let q = await controlRequest({
          proto: BG_PROTO,
          op: "nudge",
        }).catch(() => null);
        A = q?.ok && q.op === "nudge" ? (q.processWrapper ?? "") : processWrapper;
      }
      let U = truncateToLength(collapseWhitespace(stripAnsi(A)), 200);
      if (P || A || R) {
        daemonPrint(`launcher: ${U || "(none)"}`);
        if (status.origin === "service" && (R || A))
          daemonPrint(
            "  note: the installed service process itself runs outside the launcher; the sessions it spawns are covered \u2014 a launcher-aware `claude daemon install` closes this",
          );
        if (P) {
          daemonPrint("");
          daemonPrint(
            `warning: ${P} \u2014 background sessions will refuse to start rather than run unwrapped`,
          );
          if (A)
            daemonPrint(
              `  the running ${bgSupervisorNoun()} still launches sessions via \`${U}\`; do NOT restart it until this is fixed, or no daemon will start at all`,
            );
        } else if (A !== R) {
          daemonPrint("");
          daemonPrint(
            `warning: the running ${bgSupervisorNoun()} launches sessions via \`${U || "(no launcher)"}\`, but this claude resolves \`${R || "(no launcher)"}\``,
          );
          daemonPrint(
            "  restart it \u2014 and your running claude sessions \u2014 to apply the current CLAUDE_CODE_PROCESS_WRAPPER",
          );
        }
      }
      let { getBgDaemonStatus, formatBgDaemonStatus } = await import("./chunk-czxapneg.js");
      let bgDaemonStatus = await getBgDaemonStatus(D);
      daemonPrint(formatBgDaemonStatus(bgDaemonStatus));
      let { readServedFolders, servingToolsLines } = await import("./chunk-m8tcv902.js");
      for (let q of servingToolsLines(await readServedFolders(status.pid, D))) daemonPrint(q);
      await printServedBackgroundShells();
      let origin = status.origin;
      if (origin === "transient" || origin === "auto") {
        daemonPrint("");
        let workersLive = bgDaemonStatus.workersLive ?? 0;
        let leaseClients = bgDaemonStatus.leaseClients;
        if (workersLive > 0 || leaseClients.length > 0) {
          daemonPrint("holding this daemon open:");
          if (workersLive > 0)
            daemonPrint(
              `  ${workersLive} ${plural(workersLive, "bg worker")} running (daemon waits for them to settle)`,
            );
          for (let leaseClient of leaseClients)
            daemonPrint(
              `  \`${leaseClient.label}\`${leaseClient.cloudSessionId ? ` ${leaseClient.cloudSessionId}` : ""} (pid ${leaseClient.pid}) in ${leaseClient.cwd}`,
            );
          daemonPrint("");
          daemonPrint(
            `to let it idle-exit: wait for (or cancel) bg workers and close any \`claude agents\`${leaseClients.some((leaseClient) => leaseClient.label === CLOUD_SESSION_LEASE_LABEL) ? " and the `cloud session` clients listed above" : ""}`,
          );
        } else if (bgDaemonStatus.workersLive === 0)
          daemonPrint("nothing holding this daemon open \u2014 will idle-exit shortly");
      }
      if (
        status.version !==
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
        daemonPrint("");
        daemonPrint(
          `warning: running daemon is ${status.version}, but this claude is ${
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
          }`,
        );
        let q = (await daemonServiceStatus()) ? "claude daemon stop" : "claude daemon stop --any";
        daemonPrint(`  run \`${q}\` to pick up the new version`);
      }
      return flushAndExitDaemon(0);
    }
    case "logs":
    case "log": {
      stripDebugArgs(rest, []);
      await tailDaemonLogFile(logPath, D);
      return;
    }
    default:
      daemonPrintErr(`unknown subcommand: ${sub}`);
      daemonPrintErr("");
      daemonPrintErr(daemonUsageText());
      process.exit(1);
  }
}
//@ chunk-ss669z1x.js:86121-86429 placement
/**
 * 停止守护进程并确认其退出（必要时 SIGKILL），返回结局。
 */
async function stopDaemonProcess(r, e) {
  let o = await signalPid(r.pid, e);
  if (o !== "timed-out") return o;
  if (await hasExitedUnreaped(r.pid)) return "exited";
  let n = e.signal === "SIGKILL" || (await readProcCmdline(r.pid));
  let i = procIdentityOf(r);
  let h = await captureProcessStartTimeAsync(r.pid);
  if (i === undefined || h === undefined) return isProcessRunning(r.pid) ? "unverified" : "exited";
  if (h !== i) return "exited";
  return n ? "timed-out" : "not-a-daemon";
}
//@ chunk-ss669z1x.js:86429-86649 placement
async function printServedBackgroundShells() {
  if (!isViolinVarnishOn()) return;
  let { readServedBackgroundShells, servedBackgroundShellLines } = await import("./chunk-rskr11sp.js");
  for (let o of servedBackgroundShellLines(await readServedBackgroundShells(), {
    now: Date.now(),
    stopHint: isDaemonCliEnabled() && isWorkerKindAdmitted("remoteControl"),
  }))
    daemonPrint(o);
}
//@ chunk-ss669z1x.js:86649-87577 placement
/**
 * 后台拉起 claude daemon run 并等待其就绪，失败时报告 stderr 路径。
 */
async function spawnDaemon(r, e, o, spawnedBy) {
  let { err, stderrPath } = await resolveAgentLauncher([
    "daemon",
    "run",
    "--json-path",
    r,
    "--log-file",
    e,
    "--origin",
    o,
    ...(spawnedBy ? ["--spawned-by", jsonStringify(spawnedBy)] : []),
  ]);
  let S = err
    ? `failed to spawn: ${errorMessage(err)}`
    : (await waitForDaemonPing(DAEMON_START_BUDGET_MS))
      ? null
      : `spawned but never became reachable within ${DAEMON_START_BUDGET_MS / 1000}s`;
  if (S !== null) {
    let u = stderrPath
      ? redactDaemonPipeKey(((await readSmallFileOrNull(stderrPath, 1048576)) ?? "").trim()).slice(-2000)
      : "";
    let y = await openBgDispatchLog(e).catch(() => null);
    y?.write(
      "supervisor",
      `upgrade self-respawn ${S} \u2014 bg workers may be orphan-reaped ~60s after this process exits unless a client restarts the daemon (run \`claude agents\`)` +
        (u ? `; successor stderr: ${u}` : ""),
    );
    await y?.close();
    if (!err)
      await logEventTo1PAwaitable("tengu_daemon_upgrade_respawn_unreachable", {
        stderr_captured: u.length > 0,
      });
  }
  if (stderrPath)
    rm(dirname(stderrPath), {
      recursive: true,
      force: true,
    }).catch(() => {});
  if (err) {
    logError(`daemon: upgrade self-respawn failed: ${errorMessage(err)}`);
    await logEventTo1PAwaitable("tengu_bg_daemon_spawn_failed", {
      respawn: true,
      errno_enoent: getErrnoCode(err) === "ENOENT",
      errno_eacces: getErrnoCode(err) === "EACCES",
      errno: sanitizeErrnoForTelemetry(err) ?? lit("unknown"),
    });
  }
}
//@ chunk-ss669z1x.js:87577-88204 placement
/**
 * 用 tail -f 跟随守护进程日志文件。
 */
async function tailDaemonLogFile(logPath, e) {
  {
    let S = spawn("tail", ["-f", logPath], {
      stdio: "inherit",
      ...cgroupSpawnOptions("helper"),
    });
    await new Promise((resolve) => {
      S.on("exit", (y) => {
        if (y) process.exitCode = y;
        resolve();
      });
      S.on("error", (y) => {
        daemonPrintErr(`tail failed: ${y.message}`);
        process.exit(1);
      });
    });
    return;
  }
  if (isStorageV5Enabled() && e !== undefined && logPath === daemonLogPath()) {
    await tailDaemonLogStorage(logPath, e);
    return;
  }
  let o;
  try {
    o = await open(logPath, "r");
  } catch (error) {
    daemonPrintErr(`cannot open ${logPath}: ${errorMessage(error)}`);
    process.exit(1);
  }
  let size = (await o.stat()).size;
  let i = Buffer.alloc(65536);
  let h = false;
  process.on("SIGINT", () => {
    h = true;
  });
  while (!h) {
    if ((await o.stat()).size < size) size = 0;
    let { bytesRead } = await o.read(i, 0, i.length, size);
    if (bytesRead > 0) {
      process.stdout.write(i.subarray(0, bytesRead));
      size += bytesRead;
    } else await sleep(500);
  }
  await o.close();
}
//@ chunk-ss669z1x.js:88204-89055 placement
/**
 * 从存储后端读取并跟随 daemon-log 记录流。
 */
async function tailDaemonLogStorage(r, e) {
  let key = STORAGE_SPACES.state("daemon-log");
  let n = await e.read([
    {
      key,
      offset: 0,
      length: 0,
    },
  ]);
  if (!n.ok || !n.value.items[0].found) {
    daemonPrintErr(`cannot open ${r}: ${n.ok ? "no such file or directory" : formatStorageError(n.error)}`);
    process.exit(1);
  }
  let totalBytes = n.value.items[0].totalBytes;
  let h = false;
  process.on("SIGINT", () => {
    h = true;
  });
  let S = false;
  while (!h) {
    let u = await e.read([
      {
        key,
        offset: totalBytes,
        length: 65536,
      },
    ]);
    if (!u.ok) {
      if (
        u.error.code === "Unavailable" ||
        (u.error.code === "Failed" && u.error.failureClass === "permission")
      ) {
        if (!S) {
          daemonPrintErr(`cannot read ${r}: ${formatStorageError(u.error)}; retrying`);
          S = true;
        }
        await sleep(500);
        continue;
      }
      daemonPrintErr(`cannot read ${r}: ${formatStorageError(u.error)}`);
      process.exit(1);
    }
    let y = u.value.items[0];
    if (!y.found) {
      if (!S) {
        daemonPrintErr(`cannot read ${r}: no such file or directory; retrying`);
        S = true;
      }
      await sleep(500);
      continue;
    }
    S = false;
    if (y.totalBytes < totalBytes) {
      totalBytes = 0;
      continue;
    }
    if (y.value.length > 0) {
      process.stdout.write(y.value);
      totalBytes += y.value.length;
    } else await sleep(500);
  }
}
