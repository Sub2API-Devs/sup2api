/**
 * entrypoints/selfHostedRunner/main.ts
 *
 * 2.1.316 新增：自托管 runner 编排器入口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (2)
 * attribution: placement 2
 */
import { mkdir, readFile } from "fs/promises";
import { randomUUID } from "crypto";
import { hostname } from "os";
import {
  RUNNER_DEFAULTS,
  MAX_CONNECT_ATTEMPTS,
  HANDSHAKE_TIMEOUT_MS,
  MAX_IDLE_SECONDS,
  DEFAULT_LISTEN_PORT,
  newScmConnectorStatus,
  startScmConnector,
  CONNECT_RETRY_MS,
} from "./scmConnector.js";
import { configureGlobalAgents } from "../../utils/proxy.js";
import { openStdioWriter } from "../../selfHostedRunner/stdioWriter.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { assertLifecycleHooksSupported } from "../../selfHostedRunner/lifecycleHooks.js";
import { rejectOrchestratorProxyAuth } from "../../services/selfHostedRunner/egressProxy.js";
import { parseRunnerArgs, resolveSpawnRunnerHook, poolIdFromSecret } from "./runnerConfig.js";
import { checkRunnerAgentProxyStandaloneUrl } from "../../services/selfHostedRunner/agentProxyStandalone.js";
import { env } from "../../utils/env.js";
import { errorMessage } from "../../utils/errors.js";
import { ENV_MAX_TIMEOUT_MS, RUNNER_CLIENT_VERSION } from "../../selfHostedRunner/serverAutoMode.js";
import { ORCHESTRATOR_DEBUG_LIMITS } from "./orchestratorDebugDir.js";
import { createDefaultEnvironment } from "../../commands/remote-setup/api.js";
import { newDurationHistogram, newSpawnHistogram } from "./metrics.js";
import { emptyErrorCategoryCounts } from "../../selfHostedRunner/runnerApiErrors.js";
import { startRunnerHealthServer, runOrchestratorLoop, fatalExitWith } from "./orchestrator.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";

//@ chunk-2cbdmxy9.js:44198-52374 placement
/**
 * claude self-hosted-runner orchestrator 入口：解析参数、读取环境密钥、启动健康/指标服务与 spawn-runner 轮询循环。
 */
async function runSelfHostedRunnerOrchestrator(argv) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(`Usage: claude self-hosted-runner orchestrator [options]

Polls the spawn-hints queue (server returns immediately) and runs \${hooks-dir}/spawn-runner once per
hint. The hook must submit work asynchronously (kubectl create job, EC2
RunInstances, ...) and exit within --hook-timeout. Exit-code contract (session
spawns): 0 = success (no-op); 1 = retryable failure (backoff); >=2 = non-retryable
(circuit-break); stderr tail is forwarded as the nack error. Standby (--min-idle)
spawns: any non-zero exit is logged locally and re-requested after the lease.

Connection:
  --api-url <url>             API base URL (default: ${RUNNER_DEFAULTS})
  --environment-secret-file <path>
                              Path to environment secret file (or set SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET)
                              (--pool-secret-file / SELF_HOSTED_RUNNER_POOL_SECRET are deprecated aliases.)

Hook:
  --hooks-dir <path>          Directory containing the spawn-runner hook (REQUIRED).
                              [env: SELF_HOSTED_RUNNER_HOOKS_DIR]
  --hook-concurrency <n>      Max spawn-runner hooks running in parallel (default: ${MAX_CONNECT_ATTEMPTS}).
                              Also caps how many hints are claimed per poll.
  --hook-timeout <sec>        SIGTERM the hook after <sec> seconds (default: ${HANDSHAKE_TIMEOUT_MS / 1000}).
  --expected-spawn-seconds <n>  p99 boot time for runners this orchestrator spawns
                              (default: ${MAX_IDLE_SECONDS}). Sent on every Poll as the
                              server-side lease; if the runner doesn't register before then, the
                              session is re-hinted with a fresh jti. HA replicas MUST use the same value.
  --min-idle <n>              Keep at least <n> idle slots free (free capacity across runners, not
                              runner count; default: 0, disabled). The server mints standby
                              work_orders (no session binding) for the gap on every Poll.

SCM connector (optional \u2014 standing tunnel so Anthropic-hosted pre-session flows can
reach a GHES host that is only routable from inside your network):
  --scm-connector-host <h[:p]>   GHES hostname to forward to (port defaults to 443).
                                 Setting this enables the connector.
  --scm-connector-id <n>         ghe_configurations.id for this org (REQUIRED with --scm-connector-host).
  --scm-connector-provider <s>   Provider slug (default: ghe).
  --scm-connector-ca-file <path> Extra CA bundle (PEM) for TLS to the GHES host.
  --scm-connector-host-rewrite <from>=<to_host:to_port>
                                 e2e only \u2014 redirect the TCP connect while keeping
                                 Host/SNI as --scm-connector-host.

Runtime:
  --shutdown-drain-sec <n>    On SIGTERM, stop polling but give the poll in flight and the running hooks
                              up to <n> seconds to end before they are stopped (default: 0, stop them
                              at once). SIGINT, or a second SIGTERM, stops them at once; a signal after
                              that exits at once, without waiting for them. Set <n> to at least
                              --hook-timeout + 10, and the process manager's kill delay to at least
                              <n> + 15.
  --health-port <port>        Port for /healthz HTTP listener (default: ${DEFAULT_LISTEN_PORT}). 0 disables.
                              ALWAYS returns 200 (liveness). Body carries connected/last_*/queue_counts/warm_hints_dispatched
                              for readiness/alerting. [env: SELF_HOSTED_RUNNER_HEALTH_PORT]
  --log-level <level>         Log level: info or debug (default: info)
  --agent-proxy-url <url>     Agent proxy for the runners the spawn-runner hook starts. Passed to the
                              hook as SELF_HOSTED_RUNNER_AGENT_PROXY_URL (the hook must pass it on to
                              each runner, as it would the variable); checked here as the runners
                              check it. The flag wins over the variable when both are set.
                              [env: SELF_HOSTED_RUNNER_AGENT_PROXY_URL]

Debug:
  --debug-dir <path>          DEV ONLY \u2014 writes each work-order JWT + decoded JSON + hook stderr to
                              <dir>/<jti>.{jwt,json,stderr}. Auto-pruned after 5m.
                              [env: SELF_HOSTED_RUNNER_DEBUG_DIR]

  --help, -h                  Show this help message`);
    return;
  }
  configureGlobalAgents();
  let timestamp = () => new Date().toISOString();
  let stdioWriter = openStdioWriter({
    stamp: (line) => `${timestamp()} [self-hosted-runner] ${redactSecretsInText(line)}`,
  });
  let config;
  try {
    assertLifecycleHooksSupported("orchestrator mode");
    rejectOrchestratorProxyAuth(argv);
    config = parseRunnerArgs(argv);
    checkRunnerAgentProxyStandaloneUrl(
      env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
      "SELF_HOSTED_RUNNER_AGENT_PROXY_URL",
    );
  } catch (error) {
    stdioWriter.write(
      "stderr",
      `error: ${redactSecretsInText(errorMessage(error))}
Run 'claude self-hosted-runner orchestrator --help' for usage.`,
    );
    process.exit(2);
  }
  let isDebug = config.logLevel === "debug";
  let sanitize = (text) => redactSecretsInText(text).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, "");
  let debugLog = (text) => {
    if (isDebug) stdioWriter.write("stderr", `${timestamp()} [DEBUG] ${sanitize(text)}`);
  };
  let statusLog = (text) => {
    stdioWriter.write("stdout", `${timestamp()} [self-hosted-runner] ${sanitize(text)}`);
  };
  debugLog(`[runner:log] ${stdioWriter.describe()}`);
  let hookPath;
  try {
    hookPath = await resolveSpawnRunnerHook(config.hooksDir);
  } catch (error) {
    statusLog(`[runner:fatal] ${errorMessage(error)}`);
    process.exit(1);
  }
  statusLog(`[runner:hook] spawn-runner hook found at ${hookPath}`);
  let environmentSecret;
  try {
    environmentSecret = await readPoolSecret(config, (text) => stdioWriter.write("stderr", text));
  } catch (error) {
    statusLog(`[runner:fatal] ${errorMessage(error)}`);
    process.exit(1);
  }
  if (config.debugDir)
    await mkdir(config.debugDir, {
      recursive: true,
      mode: 448,
    }).catch((error) =>
      statusLog(
        `[runner:warn] failed to create --debug-dir ${config.debugDir}: ${errorMessage(error)} \u2014 continuing without debug artifacts`,
      ),
    );
  let runnerId = randomUUID();
  let hostName = hostname();
  statusLog(
    `[runner:orchestrator] starting orchestrator_uuid=${runnerId} hostname=${hostName} hook-concurrency=${config.hookConcurrency} hook-timeout=${config.hookTimeoutMs}ms`,
  );
  if (config.shutdownDrainMs > 0) {
    let drainSeconds = config.shutdownDrainMs / 1000;
    statusLog(
      `[runner:orchestrator] shutdown drain: ${drainSeconds}s after SIGTERM; SIGINT or a second SIGTERM ends it early. Allow up to ${drainSeconds + ENV_MAX_TIMEOUT_MS / 1000}s for the exit, longer if a hook cannot be killed`,
    );
    let maxHookMs = config.hookTimeoutMs + 2 * ORCHESTRATOR_DEBUG_LIMITS;
    if (config.shutdownDrainMs < maxHookMs)
      statusLog(
        `[runner:warn] --shutdown-drain-sec (${drainSeconds}s) is less than --hook-timeout + ${(2 * ORCHESTRATOR_DEBUG_LIMITS) / 1000}s (${maxHookMs / 1000}s): a hook that is running at SIGTERM may be stopped before it ends, and every spawn request that arrives after SIGTERM is handed back to the server`,
      );
  }
  let loopController;
  try {
    loopController = poolIdFromSecret(environmentSecret);
  } catch (error) {
    statusLog(`[runner:fatal] ${errorMessage(error)}`);
    process.exit(1);
  }
  statusLog(`[runner:orchestrator] environment_id=${loopController}`);
  let apiClient = createDefaultEnvironment({
    baseUrl: config.apiUrl,
    poolSecret: environmentSecret,
    onDebug: debugLog,
    capabilities: [],
  });
  let orchestrator = {
    orchestratorUuid: runnerId,
    hostname: hostName,
    version: RUNNER_CLIENT_VERSION,
    pool_id: loopController,
    connected: false,
    last_poll_at: 0,
    last_hint_at: 0,
    last_hook_ok_at: 0,
    last_warm_hook_ok_at: 0,
    last_error: null,
    clock_skew_ms: null,
    queue_counts: null,
    pool_pending_session_count: null,
    pool_active_session_count: null,
    warm_hints_dispatched: 0,
    spawnHooks: {
      ok: 0,
      retryable: 0,
      nonRetryable: 0,
    },
    spawnHookDurations: newDurationHistogram(),
    pollErrors: emptyErrorCategoryCounts(),
    scm_connector: config.scmConnector ? newScmConnectorStatus() : null,
    sessionQueueWaits: newSpawnHistogram(),
  };
  let healthServer =
    config.healthPort > 0 ? startRunnerHealthServer(config.healthPort, orchestrator, statusLog) : undefined;
  let abortController = new AbortController();
  let abortController_2 = new AbortController();
  let signalPromise;
  let resolveSignal;
  let loopPromise =
    config.shutdownDrainMs > 0
      ? {
          stopSignal: abortController_2.signal,
          abortAt: () => signalPromise,
        }
      : undefined;
  let exitPromise =
    config.scmConnector && orchestrator.scm_connector
      ? startScmConnector(
          config.scmConnector,
          orchestrator.scm_connector,
          {
            apiUrl: config.apiUrl,
            poolSecret: environmentSecret,
            onStatus: statusLog,
            onDebug: debugLog,
          },
          abortController.signal,
        )
      : undefined;
  let isDraining = false;
  let drain = (hard) => {
    if (loopPromise && !abortController.signal.aborted) {
      if (hard && !abortController_2.signal.aborted) {
        statusLog(
          `Received SIGTERM, stopping poll loop; the poll in flight and running hooks have up to ${config.shutdownDrainMs / 1000}s to end...`,
        );
        signalPromise = performance.now() + config.shutdownDrainMs;
        resolveSignal = setTimeout(
          (onDrained, sig) => {
            onDrained("Shutdown drain time is over, stopping what is still running...");
            sig.abort();
          },
          config.shutdownDrainMs,
          statusLog,
          abortController,
        );
        abortController_2.abort();
        return;
      }
      statusLog(
        abortController_2.signal.aborted
          ? "Received a second shutdown signal, stopping what is still running..."
          : "Received SIGINT, stopping poll loop and running hooks...",
      );
      clearTimeout(resolveSignal);
      signalPromise = performance.now();
      abortController_2.abort();
      abortController.abort();
      return;
    }
    if (isDraining || loopPromise) {
      statusLog("Forced shutdown");
      process.exit(1);
    }
    isDraining = true;
    statusLog("Received shutdown signal, stopping poll loop...");
    abortController.abort();
  };
  let onTerm = () => drain(true);
  let onInt = () => drain(false);
  process.on("SIGTERM", onTerm);
  process.on("SIGINT", onInt);
  try {
    await runOrchestratorLoop(
      {
        apiClient,
        hookPath,
        args: config,
        healthState: orchestrator,
        onStatus: statusLog,
        onDebug: debugLog,
        drain: loopPromise,
        fatalExit: fatalExitWith((message) => stdioWriter.write("stderr", message)),
      },
      abortController.signal,
    );
  } finally {
    clearTimeout(resolveSignal);
    exitPromise?.stop();
    healthServer?.closeAllConnections?.();
    healthServer?.close();
    process.removeListener("SIGTERM", onTerm);
    process.removeListener("SIGINT", onInt);
  }
}
//@ chunk-2cbdmxy9.js:52374-52935 placement
async function readPoolSecret(config, warn = (message) => console.error(message)) {
  if (config.poolSecretFile)
    return (
      await withBoundedTimeout(
        readFile(config.poolSecretFile, {
          encoding: "utf-8",
        }),
        CONNECT_RETRY_MS,
        `environment-secret read from ${config.poolSecretFile}`,
      )
    ).trim();
  let envSelfHostedRunnerEnvironmentSecret = process.env.SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET;
  if (envSelfHostedRunnerEnvironmentSecret) return envSelfHostedRunnerEnvironmentSecret.trim();
  let envSelfHostedRunnerPoolSecret = process.env.SELF_HOSTED_RUNNER_POOL_SECRET;
  if (envSelfHostedRunnerPoolSecret) {
    warn(
      "[runner:warn] SELF_HOSTED_RUNNER_POOL_SECRET is deprecated; use SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET",
    );
    return envSelfHostedRunnerPoolSecret.trim();
  }
  throw Error(
    "No environment secret provided. Use --environment-secret-file or set SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET.",
  );
}
export { runSelfHostedRunnerOrchestrator };
