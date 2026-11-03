/**
 * entrypoints/selfHostedRunner/orchestrator.ts
 *
 * 2.1.316 新增：自托管 runner 编排循环、健康检查服务与指标输出
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (6)
 * attribution: placement 6
 */
import { createServer } from "http";
import { escapeLabelValue, SPAWN_SECONDS_BUCKETS, observeSpawnSeconds, observeDuration } from "./metrics.js";
import {
  BACKOFF_SCHEDULE,
  HANDSHAKE_POLL_MS,
  BACKOFF_RATIO,
  KEEPALIVE_MS,
  BACKOFF_JITTER_MS,
  REPORT_INTERVAL_MS,
  MIN_BACKOFF_MS,
  RETRYABLE_STATUS,
  BACKOFF_MAX_MS,
  SCM_TIMEOUT_MS,
} from "./scmConnector.js";
import {
  RUNNER_ERROR_CATEGORIES,
  classifyRunnerError,
  getHttpStatus,
} from "../../selfHostedRunner/runnerApiErrors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { runSpawnRunnerHook } from "./spawnHints.js";
import { ENV_MAX_TIMEOUT_MS, RUNNER_CLIENT_VERSION } from "../../selfHostedRunner/serverAutoMode.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { errorMessage } from "../../utils/errors.js";
import { ORCHESTRATOR_DEBUG_LIMITS } from "./orchestratorDebugDir.js";
import { ageMs, workOrderClaims } from "./runnerConfig.js";

//@ chunk-2cbdmxy9.js:26067-33681 placement
/**
 * 把 orchestrator 健康状态渲染为 Prometheus 文本格式（/metrics）。
 */
function renderRunnerMetrics(e, t = Date.now()) {
  let r = e.last_poll_at > 0 ? (t - e.last_poll_at) / 1000 : 0;
  let n = `version="${escapeLabelValue(e.version)}",pool_id="${escapeLabelValue(e.pool_id)}",orchestrator_uuid="${escapeLabelValue(e.orchestratorUuid)}",hostname="${escapeLabelValue(e.hostname)}"`;
  let h = "claude_code_self_hosted_orchestrator";
  let o = "";
  o += `# HELP claude_code_self_hosted_orchestrator_info Self-hosted orchestrator identity (info-style gauge; value is always 1).
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_info gauge
`;
  o += `claude_code_self_hosted_orchestrator_info{${n}} 1
`;
  o += `# HELP claude_code_self_hosted_orchestrator_connected 1 when the last PollSpawnHints returned successfully; 0 on transport/5xx error.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_connected gauge
`;
  o += `claude_code_self_hosted_orchestrator_connected ${e.connected ? 1 : 0}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_last_poll_age_seconds Seconds since the last PollSpawnHints attempt (success or failure).
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_last_poll_age_seconds gauge
`;
  o += `claude_code_self_hosted_orchestrator_last_poll_age_seconds ${r}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_queue_pending_sessions Spawn-hint queue rows claimable right now (eta < now, unclaimed, not circuit-broken). Server-side aggregate for this environment.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_queue_pending_sessions gauge
`;
  if (e.queue_counts !== null)
    o += `claude_code_self_hosted_orchestrator_queue_pending_sessions ${e.queue_counts.pending}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_queue_backing_off_sessions Spawn-hint queue rows in retry backoff (nacked retryable; eta in the future). Server-side aggregate for this environment.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_queue_backing_off_sessions gauge
`;
  if (e.queue_counts !== null)
    o += `claude_code_self_hosted_orchestrator_queue_backing_off_sessions ${e.queue_counts.backing_off}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions Spawn-hint queue rows circuit-broken (nacked non-retryable; operator must RetrySpawnHint to re-admit). Server-side aggregate for this environment.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions gauge
`;
  if (e.queue_counts !== null)
    o += `claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions ${e.queue_counts.circuit_broken}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_pool_pending_sessions Total sessions currently waiting on a runner for this environment (the UI "N ahead of you" number). Autoscale on this, not on queue_pending_sessions.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_pool_pending_sessions gauge
`;
  if (e.pool_pending_session_count !== null)
    o += `claude_code_self_hosted_orchestrator_pool_pending_sessions ${e.pool_pending_session_count}
`;
  o += `# HELP ${"claude_code_self_hosted_orchestrator"}_pool_active_sessions Sessions currently assigned to an alive runner in this environment (the server's environment-wide sum of the per-runner _active_sessions gauges). Environment-wide aggregate \u2014 identical on every orchestrator for one environment; use MAX not SUM across orchestrator instances.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_pool_active_sessions gauge
`;
  if (e.pool_active_session_count !== null)
    o += `claude_code_self_hosted_orchestrator_pool_active_sessions ${e.pool_active_session_count}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_warm_hints_dispatched_total Standby (warm) hints dispatched since process start.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_warm_hints_dispatched_total counter
`;
  o += `claude_code_self_hosted_orchestrator_warm_hints_dispatched_total ${e.warm_hints_dispatched}
`;
  o += `# HELP ${"claude_code_self_hosted_orchestrator"}_spawn_hooks_total spawn-runner hook outcomes since process start (exit-code contract: ok=0, retryable=1/timeout/signal, non_retryable=>=2/ENOENT/EACCES). Counts orchestrator hook invocations (seat + warm), NOT runner child spawns \u2014 NOT comparable to the runner's sessions_started_total (capacity>1, warm environments, and per-runner re-spawns all diverge them).
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_spawn_hooks_total counter
`;
  o += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="ok"} ${e.spawnHooks.ok}
`;
  o += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="retryable"} ${e.spawnHooks.retryable}
`;
  o += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="non_retryable"} ${e.spawnHooks.nonRetryable}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds Wall-clock seconds per spawn-runner hook run (all outcomes; seat + warm).
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds histogram
`;
  let spawnHookDurations = e.spawnHookDurations;
  for (let j = 0; j < BACKOFF_SCHEDULE.length; j++)
    o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_bucket{le="${BACKOFF_SCHEDULE[j]}"} ${spawnHookDurations.buckets[j]}
`;
  o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_bucket{le="+Inf"} ${spawnHookDurations.count}
`;
  o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_sum ${spawnHookDurations.sum}
`;
  o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_count ${spawnHookDurations.count}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_session_queue_wait_seconds Seconds each session waited in the queue before the orchestrator claimed it for spawn (HTTP Date header - SpawnHint.queue_wait_started_at; seat hints only). For p50/p99 queue-time SLOs and "queue wait > N" alerting.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_session_queue_wait_seconds histogram
`;
  let sessionQueueWaits = e.sessionQueueWaits;
  for (let j = 0; j < SPAWN_SECONDS_BUCKETS.length; j++)
    o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_bucket{le="${SPAWN_SECONDS_BUCKETS[j]}"} ${sessionQueueWaits.buckets[j]}
`;
  o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_bucket{le="+Inf"} ${sessionQueueWaits.count}
`;
  o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_sum ${sessionQueueWaits.sum}
`;
  o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_count ${sessionQueueWaits.count}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_poll_errors_total PollSpawnHints request failures by error kind (transport=no HTTP response; timeout=client deadline; 5xx/429/4xx by status). All five series present from process start so rate() works and absent() means process-down.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_poll_errors_total counter
`;
  for (let c of RUNNER_ERROR_CATEGORIES)
    o += `claude_code_self_hosted_orchestrator_poll_errors_total{error_kind="${c}"} ${e.pollErrors[c]}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_clock_skew_seconds Local-minus-server clock skew from the most recent PollSpawnHints Date header. Sample omitted until measured.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_clock_skew_seconds gauge
`;
  if (e.clock_skew_ms !== null)
    o += `claude_code_self_hosted_orchestrator_clock_skew_seconds ${e.clock_skew_ms / 1000}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_scm_connector_connected 1 when the standing SCM connector WebSocket is OPEN; 0 when dialing/backing off. Series absent when --scm-connector-host is not set.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_scm_connector_connected gauge
`;
  if (e.scm_connector !== null)
    o += `claude_code_self_hosted_orchestrator_scm_connector_connected ${e.scm_connector.connected ? 1 : 0}
`;
  o += `# HELP claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total Cumulative HTTP requests proxied to the configured SCM host since process start.
`;
  o += `# TYPE claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total counter
`;
  if (e.scm_connector !== null)
    o += `claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total ${e.scm_connector.requests_forwarded}
`;
  return o;
}
//@ chunk-2cbdmxy9.js:33681-35678 placement
function startRunnerHealthServer(healthPort, t, r) {
  let server = createServer((o, l) => {
    if (o.method === "GET" && o.url === "/metrics") {
      let c = renderRunnerMetrics(t);
      l.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Content-Length": Buffer.byteLength(c),
      });
      l.end(c);
      return;
    }
    if (o.method !== "GET" || o.url !== "/healthz") {
      l.writeHead(404, {
        "Content-Type": "text/plain",
      });
      l.end(`not found
`);
      return;
    }
    let g = jsonStringify({
      status: "ok",
      orchestrator_uuid: t.orchestratorUuid,
      hostname: t.hostname,
      version: t.version,
      pool_id: t.pool_id,
      connected: t.connected,
      last_poll_at: t.last_poll_at > 0 ? new Date(t.last_poll_at).toISOString() : null,
      last_hint_at: t.last_hint_at > 0 ? new Date(t.last_hint_at).toISOString() : null,
      last_hook_ok_at: t.last_hook_ok_at > 0 ? new Date(t.last_hook_ok_at).toISOString() : null,
      last_warm_hook_ok_at:
        t.last_warm_hook_ok_at > 0 ? new Date(t.last_warm_hook_ok_at).toISOString() : null,
      last_error: t.last_error,
      clock_skew_ms: t.clock_skew_ms,
      queue_counts: t.queue_counts,
      pool_pending_session_count: t.pool_pending_session_count,
      pool_active_session_count: t.pool_active_session_count,
      warm_hints_dispatched: t.warm_hints_dispatched,
      scm_connector_connected: t.scm_connector?.connected ?? null,
      scm_connector: t.scm_connector
        ? {
            connected: t.scm_connector.connected,
            last_connected_at:
              t.scm_connector.last_connected_at > 0
                ? new Date(t.scm_connector.last_connected_at).toISOString()
                : null,
            last_error: t.scm_connector.last_error,
            reconnects: t.scm_connector.reconnects,
            requests_forwarded: t.scm_connector.requests_forwarded,
          }
        : null,
    });
    l.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(g),
    });
    l.end(g);
  });
  server.unref();
  let h = 0;
  server.on("error", (o) => {
    if (o.code === "EADDRINUSE" && h === 0) {
      h++;
      r(`[runner:warn] /healthz port ${healthPort} busy, retrying in ${HANDSHAKE_POLL_MS}ms`);
      setTimeout((l, g) => l.listen(g), HANDSHAKE_POLL_MS, server, healthPort).unref();
      return;
    }
    r(
      `[runner:warn] /healthz listener failed on port ${healthPort}: ${o.message} \u2014 continuing without health endpoint`,
    );
  });
  server.on("listening", () => {
    let o = server.address();
    let l = typeof o === "object" && o ? o.port : healthPort;
    r(`[runner:health] orchestrator /healthz and /metrics listening on :${l}`);
  });
  server.listen(healthPort);
  return server;
}
//@ chunk-2cbdmxy9.js:35678-35733 placement
function jitteredValue(pollIntervalMs, random) {
  return Math.round(pollIntervalMs * (1 + BACKOFF_RATIO * (2 * random() - 1)));
}
//@ chunk-2cbdmxy9.js:35733-44043 placement
/**
 * self-hosted runner 轮询主循环：向服务器领取工作单、调用 spawn-runner 钩子启动会话、处理排空与停止。
 */
async function runOrchestratorLoop(e, signal) {
  let {
    apiClient,
    healthState,
    onStatus,
    onDebug,
    args,
    hookPath,
    runHook = runSpawnRunnerHook,
    fatalExit = errorLogger,
    pollIntervalMs = KEEPALIVE_MS,
    minPollGapMs = BACKOFF_JITTER_MS,
    fullAnswerSettleMs = REPORT_INTERVAL_MS,
    random = Math.random,
    drain,
    now = () => performance.now(),
  } = e;
  let stopSignal = drain?.stopSignal ?? signal;
  let D = () =>
    drain && stopSignal.aborted && !signal.aborted ? AbortSignal.timeout(ENV_MAX_TIMEOUT_MS) : signal;
  let w = {
    at: undefined,
    pollInFlight: false,
    hooksRunning: 0,
    started: 0,
    handedBack: 0,
    standbyDropped: 0,
    hooksOk: 0,
    hooksFailed: 0,
    hooksStopped: 0,
    nacksFailed: 0,
  };
  let x = false;
  let O = 0;
  let I = () => {
    w.at = now();
    w.pollInFlight = x;
    w.hooksRunning = O;
  };
  if (drain) {
    drain.stopSignal.addEventListener("abort", I, {
      once: true,
    });
    if (drain.stopSignal.aborted) I();
  }
  let G = MIN_BACKOFF_MS;
  let L = new Set();
  let hookConcurrency = args.hookConcurrency;
  let q = -1 / 0;
  let b = -1 / 0;
  let K = false;
  let m = 0;
  while (!stopSignal.aborted && !signal.aborted) {
    if (L.size >= hookConcurrency) {
      await Promise.race(L);
      continue;
    }
    let startTime = performance.now();
    if (K && startTime - q < pollIntervalMs && startTime - b < pollIntervalMs) {
      await sleep(pollIntervalMs - (startTime - b), stopSignal);
      continue;
    }
    let R = hookConcurrency - L.size;
    healthState.last_poll_at = Date.now();
    b = startTime;
    x = true;
    let k;
    try {
      k = await apiClient.pollSpawnHints(
        {
          orchestrator_uuid: healthState.orchestratorUuid,
          hostname: healthState.hostname,
          client_version: RUNNER_CLIENT_VERSION,
          max: R,
          expected_spawn_seconds: args.expectedSpawnSeconds,
          ...(args.minIdle > 0 && {
            min_idle: args.minIdle,
          }),
        },
        signal,
      );
      x = false;
    } catch (error) {
      x = false;
      if (signal.aborted) break;
      healthState.pollErrors[classifyRunnerError(error)]++;
      let httpStatus = getHttpStatus(error);
      let Y = redactSecretsInText(errorMessage(error));
      if (stopSignal.aborted) {
        healthState.connected = false;
        healthState.last_error = Y;
        onStatus(
          `[runner:orchestrator] stop: the poll in flight failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${Y}. If the server had claimed a session for this poll, that session is requested again only after --expected-spawn-seconds`,
        );
        break;
      }
      if (httpStatus !== undefined && RETRYABLE_STATUS.has(httpStatus)) {
        healthState.connected = false;
        healthState.last_error = Y;
        if (L.size > 0) {
          onStatus(
            `[runner:orchestrator] poll rejected (HTTP ${httpStatus}): waiting for ${L.size} running hook(s) to end, then exiting`,
          );
          await Promise.allSettled(L);
        }
        fatalExit(
          httpStatus === 426
            ? `orchestrator version too old (HTTP 426): ${Y} \u2014 upgrade and restart`
            : `PollSpawnHints rejected (HTTP ${httpStatus}): ${Y}`,
        );
      }
      healthState.connected = false;
      healthState.last_error = Y;
      onStatus(
        `[runner:orchestrator] poll failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${Y} \u2014 retrying in ${Math.round(G / 1000)}s`,
      );
      await sleep(G, stopSignal);
      G = Math.min(G * 2, BACKOFF_MAX_MS);
      continue;
    }
    healthState.connected = true;
    healthState.last_error = null;
    G = MIN_BACKOFF_MS;
    a(k.server_date);
    healthState.queue_counts = {
      pending: k.pending_count,
      backing_off: k.backing_off_count,
      circuit_broken: k.circuit_broken_count,
    };
    healthState.pool_pending_session_count = k.pool_pending_session_count ?? null;
    healthState.pool_active_session_count = k.pool_active_session_count ?? null;
    {
      let v = k.server_date !== null ? Date.parse(k.server_date) : Date.now();
      let M = Number.isFinite(v) ? v : Date.now();
      for (let hint of k.hints) {
        if (typeof hint.queue_wait_started_at !== "string") continue;
        let timestamp = Date.parse(hint.queue_wait_started_at);
        if (!Number.isFinite(timestamp)) continue;
        observeSpawnSeconds(healthState.sessionQueueWaits, (M - timestamp) / 1000);
      }
    }
    let sliced = k.hints.slice(0, R);
    let sliced_2 = k.hints.slice(R);
    for (let v of sliced_2) {
      onStatus(
        `[runner:orchestrator] server over-returned hint session=${v.session_uuid} (got ${k.hints.length}, max=${R}) \u2014 nacking retryably`,
      );
      await apiClient
        .nackSpawnHint(
          {
            session_uuid: v.session_uuid,
            attempt: v.attempt,
            error: "orchestrator: server over-returned hints (>max)",
            retryable: true,
          },
          D(),
        )
        .catch((error) =>
          onStatus(
            `[runner:orchestrator] nack of over-returned hint failed: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
          ),
        );
    }
    let max = Math.max(0, R - sliced.length);
    let P = args.minIdle > 0 ? k.warm_hints.slice(0, max) : [];
    if (k.warm_hints.length > P.length)
      onDebug(
        `[runner:orchestrator] dropping ${k.warm_hints.length - P.length} warm hint(s) (budget=${max}, minIdle=${args.minIdle})`,
      );
    let aborted = drain !== undefined && stopSignal.aborted;
    let A = drain?.abortAt();
    let C = A === undefined ? 0 : A - now();
    let V = !aborted || (!signal.aborted && C >= args.hookTimeoutMs + 2 * ORCHESTRATOR_DEBUG_LIMITS);
    let X = V ? sliced : [];
    let ie = V ? [] : sliced;
    let ee = V ? P : [];
    if (aborted) {
      w.started += X.length + ee.length;
      for (let v of X)
        onStatus(
          `[runner:orchestrator] stop: starting session=${v.session_uuid} attempt=${v.attempt} jti=${v.jti}, which the poll in flight brought: ${Math.floor(C / 1000)}s of the shutdown drain are left`,
        );
      if (!V && P.length > 0) {
        w.standbyDropped += P.length;
        onStatus(
          `[runner:orchestrator] stop: not starting ${P.length} standby runner(s) that the poll in flight brought: too little of the shutdown drain is left. The server asks for them again once their lease has ended`,
        );
      }
    }
    if (X.length > 0)
      onStatus(`[runner:orchestrator] dispatching ${X.length} hint(s) (concurrency=${args.hookConcurrency})`);
    if (ee.length > 0)
      onStatus(`[runner:orchestrator] dispatching ${ee.length} warm hint(s) (min_idle=${args.minIdle})`);
    let he = [
      ...X.map((v) => ({
        hint: v,
        hook: f(v, k.server_date, false),
      })),
      ...ie.map((v) => ({
        hint: v,
        hook: N(v),
      })),
      ...ee.map((v) => ({
        hint: v,
        hook: f(v, k.server_date, true),
      })),
    ];
    let ae = undefined;
    hookConcurrency = Math.min(args.hookConcurrency, ae ?? args.hookConcurrency);
    K = ae !== undefined;
    if (ae === undefined) await Promise.all([...he.map((v) => v.hook), ...L]);
    else {
      let v = [...L];
      let M = [];
      for (let { hint, hook } of he) {
        let ce = hook
          .catch((error) => {
            healthState.last_error = redactSecretsInText(errorMessage(error));
            onStatus(
              `[runner:orchestrator] hint dispatch threw session=${hint.session_uuid} jti=${hint.jti}: ${healthState.last_error} \u2014 not retried here; the server's state is whatever its hook or nack already set`,
            );
          })
          .finally(() => L.delete(ce));
        L.add(ce);
        M.push(ce);
      }
      if (sliced.length > 0) {
        if (M.length >= Math.min(R, hookConcurrency) && m < fullAnswerSettleMs)
          await withDeadline(Promise.race([Promise.all(M), ...v]), fullAnswerSettleMs);
        await sleep(
          Math.min(minPollGapMs, Math.max(0, minPollGapMs - (Date.now() - healthState.last_poll_at))),
          stopSignal,
        );
        continue;
      }
    }
    await sleep(jitteredValue(pollIntervalMs, random), stopSignal);
  }
  await Promise.all(L);
  drain?.stopSignal.removeEventListener("abort", I);
  if (w.at !== undefined)
    onStatus(
      `[runner:orchestrator] stop summary: poll_in_flight=${w.pollInFlight ? 1 : 0} hooks_running=${w.hooksRunning} started_after_stop=${w.started} handed_back=${w.handedBack} standby_dropped=${w.standbyDropped} hooks_ok=${w.hooksOk} hooks_failed=${w.hooksFailed} hooks_stopped=${w.hooksStopped} nacks_failed=${w.nacksFailed} aborted=${signal.aborted ? 1 : 0} seconds=${((now() - w.at) / 1000).toFixed(1)}`,
    );
  function a(serverDate) {
    let R = ageMs(serverDate);
    if (R === null) return;
    healthState.clock_skew_ms = R;
    if (Math.abs(R) > SCM_TIMEOUT_MS)
      onStatus(
        `[runner:warn] clock skew ${Math.round(R / 1000)}s vs server \u2014 check NTP (work-order exp checks may fail)`,
      );
  }
  async function f(p, serverDate, k) {
    healthState.last_hint_at = Date.now();
    if (k) healthState.warm_hints_dispatched++;
    let E;
    let F = false;
    O++;
    try {
      let claims = workOrderClaims(p, serverDate);
      E = await runHook({
        hookPath,
        jwt: p.work_order_jwt,
        claims,
        timeoutMs: args.hookTimeoutMs,
        debugDir: args.debugDir,
        signal,
        onStatus,
        onDebug,
      });
      F = true;
    } catch (error) {
      E = {
        ok: false,
        exitCode: 1,
        timedOut: false,
        execError: false,
        stderrTail: `spawn-runner hook setup failed: ${errorMessage(error)}`,
        durationMs: 0,
      };
    }
    O--;
    m = E.durationMs;
    observeDuration(healthState.spawnHookDurations, E.durationMs / 1000);
    if (E.ok) {
      healthState.spawnHooks.ok++;
      healthState.last_hook_ok_at = Date.now();
      if (k) healthState.last_warm_hook_ok_at = healthState.last_hook_ok_at;
      onDebug(
        `[runner:orchestrator] ok session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti} (${E.durationMs}ms)`,
      );
      if (w.at !== undefined) {
        w.hooksOk++;
        onStatus(
          `[runner:orchestrator] stop: hook ended ok session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti} (${E.durationMs}ms)`,
        );
      }
      return;
    }
    let Q = !E.timedOut && !E.execError && (E.exitCode === null || (E.exitCode > 128 && E.exitCode <= 159));
    if (w.at !== undefined)
      if (Q) w.hooksStopped++;
      else w.hooksFailed++;
    let P = redactSecretsInText(
      E.stderrTail ||
        (E.exitCode === null ? "hook killed by external signal (no stderr)" : `exit ${E.exitCode}`),
    );
    let y = E.exitCode === 1 || E.timedOut || (E.exitCode === null && !E.execError);
    let A = !F
      ? undefined
      : E.timedOut
        ? "SESSION_FAILURE_KIND_SPAWN_TIMEOUT"
        : "SESSION_FAILURE_KIND_SPAWN_HOOK_ERROR";
    if (y) healthState.spawnHooks.retryable++;
    else healthState.spawnHooks.nonRetryable++;
    healthState.last_error = `spawn-runner hook failed: ${P}`;
    if (k) {
      onStatus(
        `[runner:orchestrator] warm hook failed jti=${p.jti} exit=${E.exitCode} timedOut=${E.timedOut}: ${P} \u2014 lease expiry will re-mint`,
      );
      return;
    }
    if (drain && stopSignal.aborted && !signal.aborted && Q) {
      w.nacksFailed++;
      onStatus(
        `[runner:orchestrator] stop: no nack for session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti} exit=${E.exitCode}: a signal ended its hook during the shutdown drain, and the hook may already have submitted its runner \u2014 if it had not, lease expiry will re-admit`,
      );
      return;
    }
    q = performance.now();
    onStatus(
      `[runner:orchestrator] nack session=${p.session_uuid} attempt=${p.attempt} exit=${E.exitCode} timedOut=${E.timedOut} retryable=${y}: ${P}`,
    );
    try {
      await apiClient.nackSpawnHint(
        {
          session_uuid: p.session_uuid,
          attempt: p.attempt,
          error: P,
          retryable: y,
          ...(A && {
            failure_kind: A,
          }),
        },
        D(),
      );
    } catch (error) {
      if (w.at !== undefined) w.nacksFailed++;
      onStatus(
        `[runner:orchestrator] nack failed session=${p.session_uuid}: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
      );
    }
  }
  async function N(p) {
    w.handedBack++;
    onStatus(
      `[runner:orchestrator] stop: handing back session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti}, which the poll in flight brought: too little of the shutdown drain is left to run its hook`,
    );
    try {
      await apiClient.nackSpawnHint(
        {
          session_uuid: p.session_uuid,
          attempt: p.attempt,
          error: "orchestrator is shutting down: the spawn-runner hook was not run",
          retryable: true,
        },
        AbortSignal.timeout(ENV_MAX_TIMEOUT_MS),
      );
    } catch (error) {
      w.nacksFailed++;
      onStatus(
        `[runner:orchestrator] nack failed session=${p.session_uuid}: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
      );
    }
  }
}
//@ chunk-2cbdmxy9.js:44043-44165 placement
function fatalExitWith(e) {
  return (t) => {
    e(`${new Date().toISOString()} [self-hosted-runner] [runner:fatal] ${redactSecretsInText(t)}`);
    process.exit(1);
  };
}
//@ chunk-2cbdmxy9.js:44165-44198 placement
var errorLogger = fatalExitWith((e) => console.error(e));
export { startRunnerHealthServer, runOrchestratorLoop, fatalExitWith };
