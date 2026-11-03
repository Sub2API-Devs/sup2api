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
import { mkdir, readFile, readFile as readFile_2 } from "fs/promises";
import { randomUUID } from "crypto";
import { hostname } from "os";
import {
  RUNNER_DEFAULTS,
  Ne,
  Oe,
  He,
  ve,
  newScmConnectorStatus,
  startScmConnector,
  mt,
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
import { HHn, Y9e } from "../../selfHostedRunner/serverAutoMode.js";
import { ORCHESTRATOR_DEBUG_LIMITS } from "./orchestratorDebugDir.js";
import { createDefaultEnvironment } from "../../commands/remote-setup/api.js";
import { newDurationHistogram, newSpawnHistogram } from "./metrics.js";
import { NHn } from "../../selfHostedRunner/runnerApiErrors.js";
import { startRunnerHealthServer, runOrchestratorLoop, fatalExitWith } from "./orchestrator.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";

/**
 * claude self-hosted-runner orchestrator 入口：解析参数、读取环境密钥、启动健康/指标服务与 spawn-runner 轮询循环。
 */
//@ chunk-2cbdmxy9.js:44198-52374 placement
async function runSelfHostedRunnerOrchestrator(e) {
  if (e.includes("--help") || e.includes("-h")) {
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
  --hook-concurrency <n>      Max spawn-runner hooks running in parallel (default: ${Ne}).
                              Also caps how many hints are claimed per poll.
  --hook-timeout <sec>        SIGTERM the hook after <sec> seconds (default: ${Oe / 1000}).
  --expected-spawn-seconds <n>  p99 boot time for runners this orchestrator spawns
                              (default: ${He}). Sent on every Poll as the
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
  --health-port <port>        Port for /healthz HTTP listener (default: ${ve}). 0 disables.
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
  let t = () => new Date().toISOString(),
    r = openStdioWriter({ stamp: (b) => `${t()} [self-hosted-runner] ${redactSecretsInText(b)}` }),
    n;
  try {
    (assertLifecycleHooksSupported("orchestrator mode"),
      rejectOrchestratorProxyAuth(e),
      (n = parseRunnerArgs(e)),
      checkRunnerAgentProxyStandaloneUrl(
        env.SELF_HOSTED_RUNNER_AGENT_PROXY_URL,
        "SELF_HOSTED_RUNNER_AGENT_PROXY_URL",
      ));
  } catch (error) {
    (r.write(
      "stderr",
      `error: ${redactSecretsInText(errorMessage(error))}
Run 'claude self-hosted-runner orchestrator --help' for usage.`,
    ),
      process.exit(2));
  }
  let h = n.logLevel === "debug",
    o = (b) => redactSecretsInText(b).replace(/[\x00-\x08\x0b-\x1f\x7f]/g, ""),
    l = (b) => {
      if (h) r.write("stderr", `${t()} [DEBUG] ${o(b)}`);
    },
    g = (b) => {
      r.write("stdout", `${t()} [self-hosted-runner] ${o(b)}`);
    };
  l(`[runner:log] ${r.describe()}`);
  let c;
  try {
    c = await resolveSpawnRunnerHook(n.hooksDir);
  } catch (error) {
    (g(`[runner:fatal] ${errorMessage(error)}`), process.exit(1));
  }
  g(`[runner:hook] spawn-runner hook found at ${c}`);
  let S;
  try {
    S = await readPoolSecret(n, (b) => r.write("stderr", b));
  } catch (error) {
    (g(`[runner:fatal] ${errorMessage(error)}`), process.exit(1));
  }
  if (n.debugDir)
    await mkdir(n.debugDir, { recursive: !0, mode: 448 }).catch((b) =>
      g(
        `[runner:warn] failed to create --debug-dir ${n.debugDir}: ${errorMessage(b)} \u2014 continuing without debug artifacts`,
      ),
    );
  let s = randomUUID(),
    u = hostname();
  if (
    (g(
      `[runner:orchestrator] starting orchestrator_uuid=${s} hostname=${u} hook-concurrency=${n.hookConcurrency} hook-timeout=${n.hookTimeoutMs}ms`,
    ),
    n.shutdownDrainMs > 0)
  ) {
    let b = n.shutdownDrainMs / 1000;
    g(
      `[runner:orchestrator] shutdown drain: ${b}s after SIGTERM; SIGINT or a second SIGTERM ends it early. Allow up to ${b + HHn / 1000}s for the exit, longer if a hook cannot be killed`,
    );
    let K = n.hookTimeoutMs + 2 * ORCHESTRATOR_DEBUG_LIMITS;
    if (n.shutdownDrainMs < K)
      g(
        `[runner:warn] --shutdown-drain-sec (${b}s) is less than --hook-timeout + ${(2 * ORCHESTRATOR_DEBUG_LIMITS) / 1000}s (${K / 1000}s): a hook that is running at SIGTERM may be stopped before it ends, and every spawn request that arrives after SIGTERM is handed back to the server`,
      );
  }
  let U;
  try {
    U = poolIdFromSecret(S);
  } catch (error) {
    (g(`[runner:fatal] ${errorMessage(error)}`), process.exit(1));
  }
  g(`[runner:orchestrator] environment_id=${U}`);
  let j = createDefaultEnvironment({ baseUrl: n.apiUrl, poolSecret: S, onDebug: l, capabilities: [] }),
    H = {
      orchestratorUuid: s,
      hostname: u,
      version: Y9e,
      pool_id: U,
      connected: !1,
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
      spawnHooks: { ok: 0, retryable: 0, nonRetryable: 0 },
      spawnHookDurations: newDurationHistogram(),
      pollErrors: NHn(),
      scm_connector: n.scmConnector ? newScmConnectorStatus() : null,
      sessionQueueWaits: newSpawnHistogram(),
    },
    W = n.healthPort > 0 ? startRunnerHealthServer(n.healthPort, H, g) : void 0,
    abortController = new AbortController(),
    abortController_2 = new AbortController(),
    w,
    x,
    O = n.shutdownDrainMs > 0 ? { stopSignal: abortController_2.signal, abortAt: () => w } : void 0,
    I =
      n.scmConnector && H.scm_connector
        ? startScmConnector(
            n.scmConnector,
            H.scm_connector,
            { apiUrl: n.apiUrl, poolSecret: S, onStatus: g, onDebug: l },
            abortController.signal,
          )
        : void 0,
    G = !1,
    L = (b) => {
      if (O && !abortController.signal.aborted) {
        if (b && !abortController_2.signal.aborted) {
          (g(
            `Received SIGTERM, stopping poll loop; the poll in flight and running hooks have up to ${n.shutdownDrainMs / 1000}s to end...`,
          ),
            (w = performance.now() + n.shutdownDrainMs),
            (x = setTimeout(
              (K, m) => {
                (K("Shutdown drain time is over, stopping what is still running..."), m.abort());
              },
              n.shutdownDrainMs,
              g,
              abortController,
            )),
            abortController_2.abort());
          return;
        }
        (g(
          abortController_2.signal.aborted
            ? "Received a second shutdown signal, stopping what is still running..."
            : "Received SIGINT, stopping poll loop and running hooks...",
        ),
          clearTimeout(x),
          (w = performance.now()),
          abortController_2.abort(),
          abortController.abort());
        return;
      }
      if (G || O) (g("Forced shutdown"), process.exit(1));
      ((G = !0), g("Received shutdown signal, stopping poll loop..."), abortController.abort());
    },
    B = () => L(!0),
    q = () => L(!1);
  (process.on("SIGTERM", B), process.on("SIGINT", q));
  try {
    await runOrchestratorLoop(
      {
        apiClient: j,
        hookPath: c,
        args: n,
        healthState: H,
        onStatus: g,
        onDebug: l,
        drain: O,
        fatalExit: fatalExitWith((b) => r.write("stderr", b)),
      },
      abortController.signal,
    );
  } finally {
    (clearTimeout(x),
      I?.stop(),
      W?.closeAllConnections?.(),
      W?.close(),
      process.removeListener("SIGTERM", B),
      process.removeListener("SIGINT", q));
  }
}
//@ chunk-2cbdmxy9.js:52374-52935 placement
async function readPoolSecret(e, t = (r) => console.error(r)) {
  if (e.poolSecretFile)
    return (
      await withBoundedTimeout(
        readFile(e.poolSecretFile, { encoding: "utf-8" }),
        mt,
        `environment-secret read from ${e.poolSecretFile}`,
      )
    ).trim();
  let envSelfHostedRunnerEnvironmentSecret = process.env.SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET;
  if (envSelfHostedRunnerEnvironmentSecret) return envSelfHostedRunnerEnvironmentSecret.trim();
  let envSelfHostedRunnerPoolSecret = process.env.SELF_HOSTED_RUNNER_POOL_SECRET;
  if (envSelfHostedRunnerPoolSecret)
    return (
      t(
        "[runner:warn] SELF_HOSTED_RUNNER_POOL_SECRET is deprecated; use SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET",
      ),
      envSelfHostedRunnerPoolSecret.trim()
    );
  throw Error(
    "No environment secret provided. Use --environment-secret-file or set SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET.",
  );
}
