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
import { daemonJsonPath, daemonLogPath, redactDaemonPipeKey } from "../../services/daemon/paths.js";
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
function parseDaemonArgs(argv) {
  let jsonPath = daemonJsonPath();
  let hasExplicitJsonPath = false;
  let logPath = daemonLogPath();
  let origin;
  let spawnedBy;
  let consumedIndices = new Set();
  for (let idx = 0; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (arg === "--json-path" && argv[idx + 1]) {
      consumedIndices.add(idx);
      consumedIndices.add(++idx);
      jsonPath = argv[idx];
      hasExplicitJsonPath = true;
    } else if (arg.startsWith("--json-path=")) {
      consumedIndices.add(idx);
      jsonPath = arg.slice(12);
      hasExplicitJsonPath = true;
    } else if (arg === "--log-file" && argv[idx + 1]) {
      consumedIndices.add(idx);
      consumedIndices.add(++idx);
      logPath = argv[idx];
    } else if (arg.startsWith("--log-file=")) {
      consumedIndices.add(idx);
      logPath = arg.slice(11);
    } else if (arg === "--origin" && argv[idx + 1]) {
      consumedIndices.add(idx);
      consumedIndices.add(++idx);
      origin = parseDaemonOrigin(argv[idx]);
    } else if (arg.startsWith("--origin=")) {
      consumedIndices.add(idx);
      origin = parseDaemonOrigin(arg.slice(9));
    } else if (arg === "--spawned-by" && argv[idx + 1]) {
      consumedIndices.add(idx);
      consumedIndices.add(++idx);
      spawnedBy = parseSpawnedByJson(argv[idx]);
    }
  }
  let rest = [];
  for (let idx = 0; idx < argv.length; idx++) if (!consumedIndices.has(idx)) rest.push(argv[idx]);
  let knownSubcommands = new Set([
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
  let subIndex = -1;
  for (let idx = 0; idx < rest.length; idx++)
    if (!rest[idx].startsWith("-")) {
      subIndex = idx;
      break;
    }
  if (subIndex === -1)
    return {
      sub,
      jsonPath,
      logPath,
      origin,
      spawnedBy,
      rest,
    };
  let first = rest[subIndex];
  if (!knownSubcommands.has(first)) {
    if (!/[./\\~]/.test(first))
      return {
        sub: first,
        jsonPath,
        logPath,
        origin,
        spawnedBy,
        rest: [],
      };
    return {
      sub: "run",
      jsonPath: hasExplicitJsonPath ? jsonPath : first,
      logPath,
      origin,
      spawnedBy,
      rest: [],
    };
  }
  let remaining = [...rest.slice(0, subIndex), ...rest.slice(subIndex + 1)];
  let subName = first;
  if (subName === "run" && !hasExplicitJsonPath) {
    let found = remaining.find((arg) => !arg.startsWith("-"));
    if (found) jsonPath = found;
  }
  return {
    sub: subName,
    jsonPath,
    logPath,
    origin,
    spawnedBy,
    rest: remaining,
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
  let spawnedBy = LeaseClientSchema().safeParse(status.spawnedBy).data;
  if (!spawnedBy) return "transient \u2014 started on-demand by a client";
  return `transient \u2014 started on-demand by \`${spawnedBy.label}\` (pid ${spawnedBy.pid}) in ${spawnedBy.cwd}`;
}
//@ chunk-ss669z1x.js:67479-67685 placement
function parseSpawnedByJson(json) {
  let parsed = safeParseJSON(json, false);
  if (parsed === null || typeof parsed !== "object") return;
  let value = parsed;
  if (typeof value.label === "string" && typeof value.cwd === "string" && typeof value.pid === "number")
    return {
      label: value.label,
      cwd: value.cwd,
      pid: value.pid,
    };
  return;
}
//@ chunk-ss669z1x.js:67685-67727 placement
function daemonPrint(line) {
  process.stdout.write(
    line +
      `
`,
  );
}
//@ chunk-ss669z1x.js:67727-67769 placement
function daemonPrintErr(line) {
  process.stderr.write(
    line +
      `
`,
  );
}
//@ chunk-ss669z1x.js:67769-68118 placement
/**
 * 去掉 argv 中的调试相关标志和指定参数。
 */
function stripDebugArgs(argv, alreadyConsumed) {
  let kept = [];
  for (let idx = 0; idx < argv.length; idx++) {
    let arg = argv[idx];
    if (alreadyConsumed.includes(arg)) continue;
    if (
      arg === "--debug" ||
      arg === "-d" ||
      arg === "--debug-to-stderr" ||
      arg === "-d2e" ||
      arg.startsWith("--debug=") ||
      arg.startsWith("--debug-file=")
    )
      continue;
    if (arg === "--debug-file" && idx + 1 < argv.length) {
      idx++;
      continue;
    }
    kept.push(arg);
  }
  if (kept.length > 0) daemonPrintErr(`warning: extra arguments ignored: ${kept.join(" ")}`);
}
//@ chunk-ss669z1x.js:68118-68318 placement
function foregroundDaemonRefusalMessage(action, pid) {
  return `${action} refused: a foreground daemon (pid ${pid}, started with \`claude daemon run\`) holds the daemon lock \u2014 stop it first (Ctrl-C in its terminal or \`claude daemon stop\`)`;
}
//@ chunk-ss669z1x.js:68318-68653 placement
/**
 * 停止守护进程被拒时（eperm/unverified/timed-out）给出说明。
 */
function describeDaemonStopRefusal(action, serverLockStatus) {
  let remedy;
  switch (serverLockStatus.outcome) {
    case "eperm":
      remedy = "Stop it from the account that owns it";
      break;
    case "unverified":
      remedy = stopDaemonHint();
      break;
    case "timed-out":
      remedy = `Wait for it to exit (or kill pid ${serverLockStatus.pid})`;
      break;
  }
  return `${action} refused: ${lockHolderProblemText(serverLockStatus)} \u2014 a freshly started service would lose the lockfile race to it and crash-loop. ${remedy}, then retry.`;
}
//@ chunk-ss669z1x.js:68653-68747 placement
function daemonRefusalMessage(action, pid) {
  return `${action} refused: ${unknownDaemonText(pid)}. Stop it (\`claude daemon stop\`) and retry.`;
}
//@ chunk-ss669z1x.js:68747-69128 placement
/**
 * 服务管理器已接受操作但守护进程在超时内不可达时的警告文字。
 */
function daemonUnreachableWarning(action) {
  return `warning: the service manager accepted the ${action}, but the installed daemon is not reachable after ${DAEMON_START_BUDGET_MS / 1000}s \u2014 the first start after an update can be slow. Check \`claude daemon status\` and \`claude daemon logs\`; if the service file points at a binary or launcher that no longer exists, \`claude daemon install\` rewrites it from the current settings.`;
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
async function daemonMain(argv, runtime) {
  await ensureFleetGateHydrated({
    kickGrowthBook: false,
  });
  if (argv.includes("--help") || argv.includes("-h")) {
    if (!isDaemonCliEnabled()) return fleetGateRejected("daemon");
    daemonPrint(daemonUsageText());
    return;
  }
  let daemonArgs = parseDaemonArgs(argv);
  let { jsonPath, logPath, origin, spawnedBy, rest } = daemonArgs;
  let sub = daemonArgs.sub === "hub" && !isDaemonWorkerRegistryEnabled() ? "status" : daemonArgs.sub;
  if (sub !== "run") {
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_iterative_cosmos", true) !== false)
      setIsInteractive(Boolean(process.stdout.isTTY));
  }
  if (!DAEMON_DAEMON_COMMAND_NAMES.has(sub)) {
    let policyError = await runFastPathPolicyHelper();
    if (policyError) {
      process.stderr.write(`${policyError}
`);
      process.exit(1);
    }
    if (!isDaemonCliEnabled()) return fleetGateRejected("daemon");
  } else if (sub === "run" || sub === "status") {
    let policyError = await runFastPathPolicyHelper();
    if (policyError)
      logForDebugging(
        `daemon ${sub}: policy helper failed (continuing on static managed settings): ${policyError}`,
        {
          level: "warn",
        },
      );
  }
  if (
    DAEMON_SUBCOMMANDS_WITHOUT_TRUST.has(sub) &&
    !(sub === "remote-control" ? isWorkerKindAdmitted("remoteControl") : isDaemonWorkerRegistryEnabled())
  )
    return fleetGateRejected(`daemon ${sub}`);
  try {
    let { restoreGatewayAuthForFastPath } = await import("../../utils/auth/gatewayAuthFastPath.js");
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
  let storage = pinStorageV5(runtime);
  if (isStorageV5Enabled() && storage !== undefined) {
    initDefaultDebugLog({
      storageV5: storage,
    });
    watchGlobalConfigThroughStorage(storage);
    let [{ composePolicyLimitsClient, primePolicyLimitsCache }, { primeFastPathCredentials }] =
      await Promise.all([
        import("../../services/policyLimits/DefaultPolicyLimitsClientSlot.lazy.js"),
        import("../../utils/primeFastPathCredentials.lazy.js"),
      ]);
    let credentialsStore = credentialsStoreFor(storage);
    setGrowthBookCredentials(credentialsStore);
    setGrowthBookStorageBackend(storage);
    composePolicyLimitsClient({
      storageV5: storage,
      credentials: credentialsStore,
    });
    await primeFastPathCredentials(credentialsStore);
    await primePolicyLimitsCache(storage);
    await seedInstallIDs(storage);
  }
  switch ((initialize1PEventLogging(storage), sub)) {
    case "list": {
      stripDebugArgs(rest, ["--json"]);
      let { handleListAllKinds } = await import("../daemon/handleCliKind.lazy.js");
      await handleListAllKinds(rest.includes("--json"), jsonPath, storage);
      return;
    }
    case "scheduled":
    case "remote-control": {
      let { handleCliKind } = await import("../daemon/handleCliKind.lazy.js");
      await handleCliKind(sub, rest, jsonPath, storage);
      return;
    }
    case "hub": {
      stripDebugArgs(rest, []);
      if (!process.stdin.isTTY || !process.stdout.isTTY) {
        daemonPrint("Interactive hub requires a TTY. See `claude daemon --help`.");
        return;
      }
      let { renderDaemonHubStandalone } = await import("../../components/daemon/DaemonHub.lazy.js");
      await renderDaemonHubStandalone(storage);
      await waitForInFlightOAuthRefresh(OAUTH_REFRESH_EXIT_WAIT_CAP_MS);
      return process.exit(0);
    }
    case "run": {
      if (isAgentViewDisabled()) {
        daemonPrintErr("claude daemon: background agents disabled (3P/opt-out)");
        return process.exit(0);
      }
      process.title = "claude daemon";
      let resolvedJsonPath = resolve(jsonPath);
      let resolvedLogPath = resolve(logPath);
      getDebugFilePath();
      try {
        processChdir(homedir());
      } catch {}
      lockCurrentVersion();
      let abortController = new AbortController();
      let isStopping = false;
      let onSignal = () => {
        if (isStopping) {
          daemonPrintErr("forced shutdown");
          process.exit(1);
        }
        isStopping = true;
        abortController.abort();
      };
      process.on("SIGINT", onSignal);
      process.on("SIGTERM", onSignal);
      let daemonOrigin = origin ?? "foreground";
      let upgradeDetected;
      let exitCode;
      try {
        ({ upgradeDetected, exitCode } = await runBgManager({
          jsonPath: resolvedJsonPath,
          logPath: resolvedLogPath,
          origin: daemonOrigin,
          spawnedBy,
          signal: abortController.signal,
          storageV5: storage,
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
      if (upgradeDetected) {
        if (daemonOrigin === "service") return flushAndExitDaemon(DAEMON_USAGE);
        await spawnDaemon(resolvedJsonPath, resolvedLogPath, daemonOrigin, spawnedBy);
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
      let wrapperProblem = await processWrapperProblem();
      if (wrapperProblem) {
        logFeatureBad("daemon_service_install", "daemon_service_install_launcher");
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
          launcher: true,
        });
        daemonPrintErr(`install refused: ${wrapperProblem}`);
        return flushAndExitDaemon(1);
      }
      let serverLockStatus = await getServerLockStatus(storage);
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
      let installResult = await installDaemonService({
        jsonPath,
        logPath,
      });
      if (!installResult.ok) {
        await logEventTo1PAwaitable("tengu_daemon_install", {
          ok: false,
        });
        logFeatureBad("daemon_service_install", "daemon_service_install_failed");
        daemonPrintErr(`install failed: ${installResult.error}`);
        if (installResult.servicePath)
          daemonPrintErr(`  (service file was written to ${installResult.servicePath})`);
        return flushAndExitDaemon(1);
      }
      logFeatureOk("daemon_service_install");
      daemonPrint(`installed: ${installResult.servicePath}`);
      let installResult2 = await waitForServiceDaemon(DAEMON_START_BUDGET_MS, storage);
      await logEventTo1PAwaitable("tengu_daemon_install", {
        ok: true,
        reachable: installResult2 !== null,
      });
      if (installResult2)
        daemonPrint(
          `running: pid=${installResult2.pid} origin=${installResult2.origin} (managed by ${getPlatform() === "macos" ? "launchd" : "systemd"})`,
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
      let wrapperProblem = await processWrapperProblem();
      if (wrapperProblem) {
        logFeatureBad("daemon_service_install", "daemon_service_install_launcher");
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: false,
          launcher: true,
        });
        daemonPrintErr(`${sub} refused: ${wrapperProblem}`);
        return flushAndExitDaemon(1);
      }
      let serverLockStatus = await getServerLockStatus(storage);
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
      let execStart = await checkServiceExecStart();
      if (execStart.execPathStale || execStart.launcherPrefixDead) {
        daemonPrint(
          execStart.execPathStale
            ? "service binary missing \u2014 regenerating service file"
            : "installed service starts through a launcher that was deleted or is no longer executable \u2014 regenerating the service file from the current settings",
        );
        let reinstall = await installDaemonService({
          jsonPath,
          logPath,
        });
        let isReachable =
          reinstall.ok && (await waitForServiceDaemon(DAEMON_START_BUDGET_MS, storage)) !== null;
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: reinstall.ok,
          regenerated: true,
          reachable: isReachable,
        });
        if (reinstall.ok && isReachable) daemonPrint(sub === "start" ? "started" : "restarted");
        else if (reinstall.ok) daemonPrintErr(daemonUnreachableWarning(sub));
        else daemonPrintErr(`regenerate failed: ${reinstall.error}`);
        return flushAndExitDaemon(reinstall.ok ? 0 : 1);
      }
      let startResult = await (sub === "start" ? startDaemonService() : restartDaemonService());
      if (!startResult.ok) {
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_start: sub === "start",
          op_restart: sub === "restart",
          ok: false,
        });
        daemonPrintErr(`${sub} failed: ${startResult.error}`);
        return flushAndExitDaemon(1);
      }
      let isReachable = (await waitForServiceDaemon(DAEMON_START_BUDGET_MS, storage)) !== null;
      await logEventTo1PAwaitable("tengu_daemon_control", {
        op_start: sub === "start",
        op_restart: sub === "restart",
        ok: true,
        reachable: isReachable,
      });
      if (isReachable) daemonPrint(sub === "start" ? "started" : "restarted");
      else daemonPrintErr(daemonUnreachableWarning(sub));
      return flushAndExitDaemon(0);
    }
    case "uninstall": {
      stripDebugArgs(rest, []);
      let uninstallResult = await uninstallDaemonService();
      await logEventTo1PAwaitable("tengu_daemon_control", {
        op_uninstall: true,
        ok: uninstallResult.ok,
      });
      if (uninstallResult.ok) {
        logFeatureOk("daemon_service_uninstall");
        daemonPrint("uninstalled");
      } else {
        logFeatureBad("daemon_service_uninstall", "daemon_service_uninstall_failed");
        daemonPrintErr(`uninstall failed: ${uninstallResult.error}`);
      }
      return flushAndExitDaemon(uninstallResult.ok ? 0 : 1);
    }
    case "stop": {
      let included = rest.includes("--keep-workers");
      stripDebugArgs(rest, ["--keep-workers", "--any"]);
      let stopSummary = (count) =>
        included || count === 0
          ? "stopped"
          : `stopped (terminated ${count} ${plural(count, "background session")})`;
      let reportLeftRunning = (kept) => {
        if (kept > 0)
          daemonPrintErr(
            `note: ${kept} background ${plural(kept, "session")} could not be verified as still ours and ${kept === 1 ? "was" : "were"} left running (records kept). Re-run \`claude daemon stop\` to retry.`,
          );
      };
      let usedSigkill = false;
      let commandLineRefused = false;
      let finishStop = async (ok, reaped, causeCode = "daemon_stop_failed") => {
        if (ok) logFeatureOk("daemon_stop");
        else logFeatureBad("daemon_stop", causeCode);
        await logEventTo1PAwaitable("tengu_daemon_control", {
          op_stop: true,
          ok,
          reaped,
          holderUnverified: causeCode === "daemon_stop_holder_unverified",
          sigkill: usedSigkill,
          commandLineRefused,
        });
        return flushAndExitDaemon(ok ? 0 : 1);
      };
      let serviceInstalled = await daemonServiceStatus();
      let liveServerLock = await readLiveServerLock(1, storage);
      let verifiedLock =
        liveServerLock && hasProcIdentity(liveServerLock) && isProbeablePid(liveServerLock.pid)
          ? liveServerLock
          : null;
      let lock = liveServerLock;
      let stalePid;
      if (!lock) {
        let daemonLock = await readDaemonLock(storage);
        if (daemonLock && isProcessRunning(daemonLock.pid)) {
          let isClaude = await isClaudeProcess(daemonLock.pid);
          let startTime = isClaude
            ? await getProcessStartTimeAsync(daemonLock.pid, {
                skipCache: true,
              })
            : undefined;
          let expectedIdentity = procIdentityOf(daemonLock);
          let hasIdentity = expectedIdentity !== undefined && startTime !== undefined;
          if (!isClaude || (hasIdentity && startTime !== expectedIdentity)) stalePid = daemonLock.pid;
          else if (hasIdentity) {
            verifiedLock = daemonLock;
            lock = daemonLock;
          } else lock = daemonLock;
        }
      }
      if (!serviceInstalled && lock && !rest.includes("--any")) {
        daemonPrintErr(
          verifiedLock
            ? `no background service is installed, but a daemon is running (pid=${lock.pid}, origin=${lock.origin ?? "unknown"}). Run \`claude daemon stop --any\` to stop it.`
            : `no background service is installed, but pid=${lock.pid} is holding the daemon lock. Run \`claude daemon stop --any\` to stop any background sessions and report on the holder.`,
        );
        return flushAndExitDaemon(1);
      }
      let servedShellNote = "";
      if (lock && isViolinVarnishOn()) {
        let [{ readServedFolders }, { servedBackgroundShellsIn }] = await Promise.all([
          import("../../daemon/daemonStatus.js"),
          import("../../remote/tools/serve/servedBackgroundShells.js"),
        ]);
        let shellCount = await withDeadline(
          readServedFolders(lock.pid, storage).then((folders) =>
            servedBackgroundShellsIn(folders.map((folder) => folder.dir)),
          ),
          2000,
        );
        if (shellCount)
          servedShellNote = `
note: cloud sessions had ${shellCount} background ${plural(shellCount, "command")} running in the folders this daemon served; the ones it was serving are stopped too`;
      }
      let shutdownResult = await controlRequest({
        proto: BG_PROTO,
        op: "shutdown",
        reapWorkers: !included,
      });
      if (shutdownResult.ok && shutdownResult.op === "shutdown") {
        let reapResult = included
          ? {
              reaped: 0,
              kept: 0,
            }
          : await reapAllBackgroundJobs(
              {
                supervisorKilledAll: true,
              },
              storage,
            );
        reportLeftRunning(reapResult.kept);
        let max = Math.max(shutdownResult.reaped, reapResult.reaped);
        if (serviceInstalled) {
          let stopResult = await stopDaemonService();
          if (!stopResult.ok) {
            daemonPrintErr(`stop failed: ${stopResult.error}`);
            return finishStop(false, max);
          }
        }
        daemonPrint(stopSummary(max) + servedShellNote);
        if (!serviceInstalled)
          daemonPrint("note: the next `claude agents` or `claude --bg` will start a new one");
        return finishStop(true, max);
      }
      let didExit = false;
      let stopOutcome;
      if (serviceInstalled) {
        let stopResult = await stopDaemonService();
        if (!stopResult.ok) {
          daemonPrintErr(`stop failed: ${stopResult.error}`);
          return finishStop(false, 0);
        }
        didExit = true;
      } else if (verifiedLock && getPlatform() !== "windows") {
        daemonPrintErr(
          `note: the ${bgSupervisorNoun()} (pid=${verifiedLock.pid}) did not answer; asking it to exit (SIGTERM) and waiting up to ${DAEMON_STOP_GRACE_MS / 1000}s`,
        );
        stopOutcome = await stopDaemonProcess(verifiedLock, {
          gracefulMs: DAEMON_STOP_GRACE_MS,
        });
        commandLineRefused = stopOutcome === "not-a-daemon";
        if (stopOutcome === "timed-out") {
          daemonPrintErr(
            `note: the ${bgSupervisorNoun()} (pid=${verifiedLock.pid}) is still running; force-killing it (SIGKILL)`,
          );
          usedSigkill = true;
          stopOutcome = await stopDaemonProcess(verifiedLock, {
            signal: "SIGKILL",
          });
        }
        if (stopOutcome === "eperm") {
          daemonPrintErr(
            `could not stop the ${bgSupervisorNoun()} (pid=${verifiedLock.pid}): it belongs to another user, so this account cannot signal it. Stop it from that account. No sessions were ended.`,
          );
          return finishStop(false, 0);
        }
        didExit = stopOutcome === "exited";
      }
      let reapResult = included
        ? {
            reaped: 0,
            kept: 0,
          }
        : await reapAllBackgroundJobs({}, storage);
      let reaped = reapResult.reaped;
      reportLeftRunning(reapResult.kept);
      if (verifiedLock && !didExit && getPlatform() === "windows") {
        daemonPrintErr(
          (reaped > 0 ? `terminated ${reaped} background session(s); ` : "") +
            `supervisor (pid=${verifiedLock.pid}) is still running \u2014 stop it with ` +
            `\`taskkill /PID ${verifiedLock.pid}\` or close the terminal it was started in.`,
        );
        return finishStop(false, reaped);
      }
      if (verifiedLock && !didExit) {
        let noun = bgSupervisorNoun();
        let whyStillRunning;
        if (stopOutcome === "timed-out")
          whyStillRunning = `after SIGKILL. A process that outlives SIGKILL is usually waiting inside the operating system, for example on a network drive that stopped answering, and exits by itself once that wait ends. Until then, \`claude agents\` and \`claude --bg\` cannot start a new ${noun}. \`claude daemon status\` says "not running" once it has gone; if it never goes, restart the computer.`;
        else if (usedSigkill)
          whyStillRunning = `after SIGKILL, and could no longer be verified as the ${noun}. It should exit shortly. If \`claude agents\` or \`claude --bg\` still cannot start a new ${noun} in a minute, restart the computer.`;
        else
          whyStillRunning = `${DAEMON_STOP_GRACE_MS / 1000}s after SIGTERM, and could no longer be verified as the ${noun}, so it was not sent SIGKILL. While it runs, \`claude agents\` and \`claude --bg\` may not be able to start a new ${noun}. Re-run \`claude daemon stop --any${included ? " --keep-workers" : ""}\`. If that does not stop it, run \`ps -ww -o args= -p ${verifiedLock.pid}\`: if that shows Claude Code started with "daemon" (for example \`\u2026/claude daemon \u2026\` or \`\u2026/cli.js daemon \u2026\`), stop it with \`kill -9 ${verifiedLock.pid}\`. If it shows anything else, another program probably has that pid: leave it alone, and if \`claude agents\` or \`claude --bg\` still cannot start a new ${noun}, delete ${daemonLockPath()}.`;
        daemonPrintErr(
          (reaped > 0 ? `terminated ${reaped} background ${plural(reaped, "session")}; ` : "") +
            `the ${noun} was not stopped: pid=${verifiedLock.pid} is still running ` +
            whyStillRunning +
            (included ? " No sessions were ended." : ""),
        );
        return finishStop(false, reaped, "daemon_stop_still_running");
      }
      if (!didExit && !verifiedLock && lock) {
        let isPidOne = lock.pid === 1;
        daemonPrintErr(
          (reaped > 0 ? `terminated ${reaped} background ${plural(reaped, "session")}; ` : "") +
            `the daemon was not stopped: pid=${lock.pid} is holding ${daemonLockPath()} ` +
            (isPidOne
              ? "and this command never signals pid 1. If that is a container's entrypoint, stop the container; if not, delete that file."
              : `but could not be verified as the daemon, so it was not signalled. If no daemon is running, delete that file; if pid ${lock.pid} is a live process you own, stop it yourself.`),
        );
        return finishStop(
          false,
          reaped,
          isPidOne ? "daemon_stop_holder_is_init" : "daemon_stop_holder_unverified",
        );
      }
      if (stalePid !== undefined)
        daemonPrintErr(
          `note: ${daemonLockPath()} is stale (pid=${stalePid} is not the daemon). The next daemon start reclaims it automatically.`,
        );
      if (!didExit && !verifiedLock && reaped === 0) daemonPrint("no daemon running");
      else {
        daemonPrint(stopSummary(reaped) + servedShellNote);
        if (!serviceInstalled && verifiedLock)
          daemonPrint("note: the next `claude agents` or `claude --bg` will start a new one");
      }
      return finishStop(true, reaped);
    }
    case "status": {
      stripDebugArgs(rest, []);
      let status = await readLiveServerLock(1, storage);
      if (!status) {
        daemonPrint("not running");
        let nudgeResult = processWrapperError();
        if (nudgeResult)
          daemonPrint(
            `warning: ${nudgeResult} \u2014 background sessions will refuse to start rather than run unwrapped`,
          );
        else if (processWrapperRecord())
          daemonPrint(
            `launcher: (none running) \u2014 this claude resolves \`${processWrapperRecord()}\` and will start the next ${bgSupervisorNoun()} through it`,
          );
        let { getBgDaemonStatus, formatBgDaemonStatus } =
          await import("../daemon/formatBgDaemonStatus.lazy.js");
        daemonPrint(formatBgDaemonStatus(await getBgDaemonStatus(storage)));
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
      let wrapperError = processWrapperError();
      let wrapperRecord = processWrapperRecord();
      let processWrapper = status.processWrapper ?? "";
      let wrapperText = "";
      if (wrapperError || wrapperRecord || processWrapper) {
        let nudgeResult = await controlRequest({
          proto: BG_PROTO,
          op: "nudge",
        }).catch(() => null);
        wrapperText =
          nudgeResult?.ok && nudgeResult.op === "nudge" ? (nudgeResult.processWrapper ?? "") : processWrapper;
      }
      let wrapperSummary = truncateToLength(collapseWhitespace(stripAnsi(wrapperText)), 200);
      if (wrapperError || wrapperText || wrapperRecord) {
        daemonPrint(`launcher: ${wrapperSummary || "(none)"}`);
        if (status.origin === "service" && (wrapperRecord || wrapperText))
          daemonPrint(
            "  note: the installed service process itself runs outside the launcher; the sessions it spawns are covered \u2014 a launcher-aware `claude daemon install` closes this",
          );
        if (wrapperError) {
          daemonPrint("");
          daemonPrint(
            `warning: ${wrapperError} \u2014 background sessions will refuse to start rather than run unwrapped`,
          );
          if (wrapperText)
            daemonPrint(
              `  the running ${bgSupervisorNoun()} still launches sessions via \`${wrapperSummary}\`; do NOT restart it until this is fixed, or no daemon will start at all`,
            );
        } else if (wrapperText !== wrapperRecord) {
          daemonPrint("");
          daemonPrint(
            `warning: the running ${bgSupervisorNoun()} launches sessions via \`${wrapperSummary || "(no launcher)"}\`, but this claude resolves \`${wrapperRecord || "(no launcher)"}\``,
          );
          daemonPrint(
            "  restart it \u2014 and your running claude sessions \u2014 to apply the current CLAUDE_CODE_PROCESS_WRAPPER",
          );
        }
      }
      let { getBgDaemonStatus, formatBgDaemonStatus } =
        await import("../daemon/formatBgDaemonStatus.lazy.js");
      let bgDaemonStatus = await getBgDaemonStatus(storage);
      daemonPrint(formatBgDaemonStatus(bgDaemonStatus));
      let { readServedFolders, servingToolsLines } = await import("../../daemon/daemonStatus.js");
      for (let leaseClient of servingToolsLines(await readServedFolders(status.pid, storage)))
        daemonPrint(leaseClient);
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
        let stopHint = (await daemonServiceStatus()) ? "claude daemon stop" : "claude daemon stop --any";
        daemonPrint(`  run \`${stopHint}\` to pick up the new version`);
      }
      return flushAndExitDaemon(0);
    }
    case "logs":
    case "log": {
      stripDebugArgs(rest, []);
      await tailDaemonLogFile(logPath, storage);
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
async function stopDaemonProcess(lock, options) {
  let signalResult = await signalPid(lock.pid, options);
  if (signalResult !== "timed-out") return signalResult;
  if (await hasExitedUnreaped(lock.pid)) return "exited";
  let isSigkill = options.signal === "SIGKILL" || (await readProcCmdline(lock.pid));
  let expectedIdentity = procIdentityOf(lock);
  let startTime = await captureProcessStartTimeAsync(lock.pid);
  if (expectedIdentity === undefined || startTime === undefined)
    return isProcessRunning(lock.pid) ? "unverified" : "exited";
  if (startTime !== expectedIdentity) return "exited";
  return isSigkill ? "timed-out" : "not-a-daemon";
}
//@ chunk-ss669z1x.js:86429-86649 placement
async function printServedBackgroundShells() {
  if (!isViolinVarnishOn()) return;
  let { readServedBackgroundShells, servedBackgroundShellLines } =
    await import("../../remote/tools/serve/servedBackgroundShells.js");
  for (let line of servedBackgroundShellLines(await readServedBackgroundShells(), {
    now: Date.now(),
    stopHint: isDaemonCliEnabled() && isWorkerKindAdmitted("remoteControl"),
  }))
    daemonPrint(line);
}
//@ chunk-ss669z1x.js:86649-87577 placement
/**
 * 后台拉起 claude daemon run 并等待其就绪，失败时报告 stderr 路径。
 */
async function spawnDaemon(jsonPath, logPath, origin, spawnedBy) {
  let { err, stderrPath } = await resolveAgentLauncher([
    "daemon",
    "run",
    "--json-path",
    jsonPath,
    "--log-file",
    logPath,
    "--origin",
    origin,
    ...(spawnedBy ? ["--spawned-by", jsonStringify(spawnedBy)] : []),
  ]);
  let problem = err
    ? `failed to spawn: ${errorMessage(err)}`
    : (await waitForDaemonPing(DAEMON_START_BUDGET_MS))
      ? null
      : `spawned but never became reachable within ${DAEMON_START_BUDGET_MS / 1000}s`;
  if (problem !== null) {
    let stderrTail = stderrPath
      ? redactDaemonPipeKey(((await readSmallFileOrNull(stderrPath, 1048576)) ?? "").trim()).slice(-2000)
      : "";
    let dispatchLog = await openBgDispatchLog(logPath).catch(() => null);
    dispatchLog?.write(
      "supervisor",
      `upgrade self-respawn ${problem} \u2014 bg workers may be orphan-reaped ~60s after this process exits unless a client restarts the daemon (run \`claude agents\`)` +
        (stderrTail ? `; successor stderr: ${stderrTail}` : ""),
    );
    await dispatchLog?.close();
    if (!err)
      await logEventTo1PAwaitable("tengu_daemon_upgrade_respawn_unreachable", {
        stderr_captured: stderrTail.length > 0,
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
async function tailDaemonLogFile(logPath, storage) {
  {
    let child = spawn("tail", ["-f", logPath], {
      stdio: "inherit",
      ...cgroupSpawnOptions("helper"),
    });
    await new Promise((resolve) => {
      child.on("exit", (exitCode) => {
        if (exitCode) process.exitCode = exitCode;
        resolve();
      });
      child.on("error", (error) => {
        daemonPrintErr(`tail failed: ${error.message}`);
        process.exit(1);
      });
    });
    return;
  }
  if (isStorageV5Enabled() && storage !== undefined && logPath === daemonLogPath()) {
    await tailDaemonLogStorage(logPath, storage);
    return;
  }
  let handle;
  try {
    handle = await open(logPath, "r");
  } catch (error) {
    daemonPrintErr(`cannot open ${logPath}: ${errorMessage(error)}`);
    process.exit(1);
  }
  let size = (await handle.stat()).size;
  let buffer = Buffer.alloc(65536);
  let isStopping = false;
  process.on("SIGINT", () => {
    isStopping = true;
  });
  while (!isStopping) {
    if ((await handle.stat()).size < size) size = 0;
    let { bytesRead } = await handle.read(buffer, 0, buffer.length, size);
    if (bytesRead > 0) {
      process.stdout.write(buffer.subarray(0, bytesRead));
      size += bytesRead;
    } else await sleep(500);
  }
  await handle.close();
}
//@ chunk-ss669z1x.js:88204-89055 placement
/**
 * 从存储后端读取并跟随 daemon-log 记录流。
 */
async function tailDaemonLogStorage(logPath, storage) {
  let key = STORAGE_SPACES.state("daemon-log");
  let firstRead = await storage.read([
    {
      key,
      offset: 0,
      length: 0,
    },
  ]);
  if (!firstRead.ok || !firstRead.value.items[0].found) {
    daemonPrintErr(
      `cannot open ${logPath}: ${firstRead.ok ? "no such file or directory" : formatStorageError(firstRead.error)}`,
    );
    process.exit(1);
  }
  let totalBytes = firstRead.value.items[0].totalBytes;
  let isStopping = false;
  process.on("SIGINT", () => {
    isStopping = true;
  });
  let reportedRetry = false;
  while (!isStopping) {
    let readResult = await storage.read([
      {
        key,
        offset: totalBytes,
        length: 65536,
      },
    ]);
    if (!readResult.ok) {
      if (
        readResult.error.code === "Unavailable" ||
        (readResult.error.code === "Failed" && readResult.error.failureClass === "permission")
      ) {
        if (!reportedRetry) {
          daemonPrintErr(`cannot read ${logPath}: ${formatStorageError(readResult.error)}; retrying`);
          reportedRetry = true;
        }
        await sleep(500);
        continue;
      }
      daemonPrintErr(`cannot read ${logPath}: ${formatStorageError(readResult.error)}`);
      process.exit(1);
    }
    let item = readResult.value.items[0];
    if (!item.found) {
      if (!reportedRetry) {
        daemonPrintErr(`cannot read ${logPath}: no such file or directory; retrying`);
        reportedRetry = true;
      }
      await sleep(500);
      continue;
    }
    reportedRetry = false;
    if (item.totalBytes < totalBytes) {
      totalBytes = 0;
      continue;
    }
    if (item.value.length > 0) {
      process.stdout.write(item.value);
      totalBytes += item.value.length;
    } else await sleep(500);
  }
}
export { daemonMain };
