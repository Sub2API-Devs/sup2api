/**
 * entrypoints/selfHostedRunner/orchestrator.ts
 *
 * 2.1.316 新增：自托管 runner 编排循环、健康检查服务与指标输出
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7hgs1mf.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeSpawnReason } from "./runId.js";

//@ chunk-h7hgs1mf.js:26961-34575 placement
/**
 * 把 orchestrator 健康状态渲染为 Prometheus 文本格式（/metrics）。
 */
function renderRunnerMetrics(state, now = Date.now()) {
  let pollAgeSec = state.last_poll_at > 0 ? (now - state.last_poll_at) / 1000 : 0;
  let labelSet = `version="${escapeLabelValue(state.version)}",pool_id="${escapeLabelValue(state.pool_id)}",orchestrator_uuid="${escapeLabelValue(state.orchestratorUuid)}",hostname="${escapeLabelValue(state.hostname)}"`;
  let prefix = "claude_code_self_hosted_orchestrator";
  let out = "";
  out += `# HELP claude_code_self_hosted_orchestrator_info Self-hosted orchestrator identity (info-style gauge; value is always 1).
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_info gauge
`;
  out += `claude_code_self_hosted_orchestrator_info{${labelSet}} 1
`;
  out += `# HELP claude_code_self_hosted_orchestrator_connected 1 when the last PollSpawnHints returned successfully; 0 on transport/5xx error.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_connected gauge
`;
  out += `claude_code_self_hosted_orchestrator_connected ${state.connected ? 1 : 0}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_last_poll_age_seconds Seconds since the last PollSpawnHints attempt (success or failure).
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_last_poll_age_seconds gauge
`;
  out += `claude_code_self_hosted_orchestrator_last_poll_age_seconds ${pollAgeSec}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_queue_pending_sessions Spawn-hint queue rows claimable right now (eta < now, unclaimed, not circuit-broken). Server-side aggregate for this environment.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_queue_pending_sessions gauge
`;
  if (state.queue_counts !== null)
    out += `claude_code_self_hosted_orchestrator_queue_pending_sessions ${state.queue_counts.pending}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_queue_backing_off_sessions Spawn-hint queue rows in retry backoff (nacked retryable; eta in the future). Server-side aggregate for this environment.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_queue_backing_off_sessions gauge
`;
  if (state.queue_counts !== null)
    out += `claude_code_self_hosted_orchestrator_queue_backing_off_sessions ${state.queue_counts.backing_off}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions Spawn-hint queue rows circuit-broken (nacked non-retryable; operator must RetrySpawnHint to re-admit). Server-side aggregate for this environment.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions gauge
`;
  if (state.queue_counts !== null)
    out += `claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions ${state.queue_counts.circuit_broken}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_pool_pending_sessions Total sessions currently waiting on a runner for this environment (the UI "N ahead of you" number). Autoscale on this, not on queue_pending_sessions.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_pool_pending_sessions gauge
`;
  if (state.pool_pending_session_count !== null)
    out += `claude_code_self_hosted_orchestrator_pool_pending_sessions ${state.pool_pending_session_count}
`;
  out += `# HELP ${"claude_code_self_hosted_orchestrator"}_pool_active_sessions Sessions currently assigned to an alive runner in this environment (the server's environment-wide sum of the per-runner _active_sessions gauges). Environment-wide aggregate \u2014 identical on every orchestrator for one environment; use MAX not SUM across orchestrator instances.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_pool_active_sessions gauge
`;
  if (state.pool_active_session_count !== null)
    out += `claude_code_self_hosted_orchestrator_pool_active_sessions ${state.pool_active_session_count}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_warm_hints_dispatched_total Standby (warm) hints dispatched since process start.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_warm_hints_dispatched_total counter
`;
  out += `claude_code_self_hosted_orchestrator_warm_hints_dispatched_total ${state.warm_hints_dispatched}
`;
  out += `# HELP ${"claude_code_self_hosted_orchestrator"}_spawn_hooks_total spawn-runner hook outcomes since process start (exit-code contract: ok=0, retryable=1/timeout/signal, non_retryable=>=2/ENOENT/EACCES). Counts orchestrator hook invocations (seat + warm), NOT runner child spawns \u2014 NOT comparable to the runner's sessions_started_total (capacity>1, warm environments, and per-runner re-spawns all diverge them).
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_spawn_hooks_total counter
`;
  out += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="ok"} ${state.spawnHooks.ok}
`;
  out += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="retryable"} ${state.spawnHooks.retryable}
`;
  out += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="non_retryable"} ${state.spawnHooks.nonRetryable}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds Wall-clock seconds per spawn-runner hook run (all outcomes; seat + warm).
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds histogram
`;
  let spawnHookDurations = state.spawnHookDurations;
  for (let j = 0; j < BACKOFF_SCHEDULE.length; j++)
    out += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_bucket{le="${BACKOFF_SCHEDULE[j]}"} ${spawnHookDurations.buckets[j]}
`;
  out += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_bucket{le="+Inf"} ${spawnHookDurations.count}
`;
  out += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_sum ${spawnHookDurations.sum}
`;
  out += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_count ${spawnHookDurations.count}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_session_queue_wait_seconds Seconds each session waited in the queue before the orchestrator claimed it for spawn (HTTP Date header - SpawnHint.queue_wait_started_at; seat hints only). For p50/p99 queue-time SLOs and "queue wait > N" alerting.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_session_queue_wait_seconds histogram
`;
  let sessionQueueWaits = state.sessionQueueWaits;
  for (let j = 0; j < SPAWN_SECONDS_BUCKETS.length; j++)
    out += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_bucket{le="${SPAWN_SECONDS_BUCKETS[j]}"} ${sessionQueueWaits.buckets[j]}
`;
  out += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_bucket{le="+Inf"} ${sessionQueueWaits.count}
`;
  out += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_sum ${sessionQueueWaits.sum}
`;
  out += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_count ${sessionQueueWaits.count}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_poll_errors_total PollSpawnHints request failures by error kind (transport=no HTTP response; timeout=client deadline; 5xx/429/4xx by status). All five series present from process start so rate() works and absent() means process-down.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_poll_errors_total counter
`;
  for (let category of RUNNER_ERROR_CATEGORIES)
    out += `claude_code_self_hosted_orchestrator_poll_errors_total{error_kind="${category}"} ${state.pollErrors[category]}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_clock_skew_seconds Local-minus-server clock skew from the most recent PollSpawnHints Date header. Sample omitted until measured.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_clock_skew_seconds gauge
`;
  if (state.clock_skew_ms !== null)
    out += `claude_code_self_hosted_orchestrator_clock_skew_seconds ${state.clock_skew_ms / 1000}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_scm_connector_connected 1 when the standing SCM connector WebSocket is OPEN; 0 when dialing/backing off. Series absent when --scm-connector-host is not set.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_scm_connector_connected gauge
`;
  if (state.scm_connector !== null)
    out += `claude_code_self_hosted_orchestrator_scm_connector_connected ${state.scm_connector.connected ? 1 : 0}
`;
  out += `# HELP claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total Cumulative HTTP requests proxied to the configured SCM host since process start.
`;
  out += `# TYPE claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total counter
`;
  if (state.scm_connector !== null)
    out += `claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total ${state.scm_connector.requests_forwarded}
`;
  return out;
}
//@ chunk-h7hgs1mf.js:34575-36572 placement
function startRunnerHealthServer(healthPort, state, log) {
  let server = createServer((req, res) => {
    if (req.method === "GET" && req.url === "/metrics") {
      let metricsText = renderRunnerMetrics(state);
      res.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Content-Length": Buffer.byteLength(metricsText),
      });
      res.end(metricsText);
      return;
    }
    if (req.method !== "GET" || req.url !== "/healthz") {
      res.writeHead(404, {
        "Content-Type": "text/plain",
      });
      res.end(`not found
`);
      return;
    }
    let healthBody = jsonStringify({
      status: "ok",
      orchestrator_uuid: state.orchestratorUuid,
      hostname: state.hostname,
      version: state.version,
      pool_id: state.pool_id,
      connected: state.connected,
      last_poll_at: state.last_poll_at > 0 ? new Date(state.last_poll_at).toISOString() : null,
      last_hint_at: state.last_hint_at > 0 ? new Date(state.last_hint_at).toISOString() : null,
      last_hook_ok_at: state.last_hook_ok_at > 0 ? new Date(state.last_hook_ok_at).toISOString() : null,
      last_warm_hook_ok_at:
        state.last_warm_hook_ok_at > 0 ? new Date(state.last_warm_hook_ok_at).toISOString() : null,
      last_error: state.last_error,
      clock_skew_ms: state.clock_skew_ms,
      queue_counts: state.queue_counts,
      pool_pending_session_count: state.pool_pending_session_count,
      pool_active_session_count: state.pool_active_session_count,
      warm_hints_dispatched: state.warm_hints_dispatched,
      scm_connector_connected: state.scm_connector?.connected ?? null,
      scm_connector: state.scm_connector
        ? {
            connected: state.scm_connector.connected,
            last_connected_at:
              state.scm_connector.last_connected_at > 0
                ? new Date(state.scm_connector.last_connected_at).toISOString()
                : null,
            last_error: state.scm_connector.last_error,
            reconnects: state.scm_connector.reconnects,
            requests_forwarded: state.scm_connector.requests_forwarded,
          }
        : null,
    });
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(healthBody),
    });
    res.end(healthBody);
  });
  server.unref();
  let nextPort = 0;
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && nextPort === 0) {
      nextPort++;
      log(`[runner:warn] /healthz port ${healthPort} busy, retrying in ${HANDSHAKE_POLL_MS}ms`);
      setTimeout((server_, port) => server_.listen(port), HANDSHAKE_POLL_MS, server, healthPort).unref();
      return;
    }
    log(
      `[runner:warn] /healthz listener failed on port ${healthPort}: ${error.message} \u2014 continuing without health endpoint`,
    );
  });
  server.on("listening", () => {
    let address = server.address();
    let boundPort = typeof address === "object" && address ? address.port : healthPort;
    log(`[runner:health] orchestrator /healthz and /metrics listening on :${boundPort}`);
  });
  server.listen(healthPort);
  return server;
}
//@ chunk-h7hgs1mf.js:36572-36627 placement
function jitteredValue(pollIntervalMs, random) {
  return Math.round(pollIntervalMs * (1 + BACKOFF_RATIO * (2 * random() - 1)));
}
//@ chunk-h7hgs1mf.js:36627-45027 placement
/**
 * self-hosted runner 轮询主循环：向服务器领取工作单、调用 spawn-runner 钩子启动会话、处理排空与停止。
 */
async function runOrchestratorLoop(args, signal) {
  let {
    apiClient,
    healthState,
    onStatus,
    onDebug,
    args: args_2,
    hookPath,
    runHook = runSpawnRunnerHook,
    fatalExit = errorLogger,
    pollIntervalMs = KEEPALIVE_MS,
    minPollGapMs = BACKOFF_JITTER_MS,
    fullAnswerSettleMs = REPORT_INTERVAL_MS,
    random = Math.random,
    drain,
    now = () => performance.now(),
  } = args;
  let stopSignal = drain?.stopSignal ?? signal;
  let now_2 = () =>
    drain && stopSignal.aborted && !signal.aborted ? AbortSignal.timeout(ENV_MAX_TIMEOUT_MS) : signal;
  let state = {
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
  let isStopping = false;
  let pollCount = 0;
  let onStop = () => {
    state.at = now();
    state.pollInFlight = isStopping;
    state.hooksRunning = pollCount;
  };
  if (drain) {
    drain.stopSignal.addEventListener("abort", onStop, {
      once: true,
    });
    if (drain.stopSignal.aborted) onStop();
  }
  let backoffMs = MIN_BACKOFF_MS;
  let pendingHooks = new Set();
  let hookConcurrency = args_2.hookConcurrency;
  let lastPollAt = -1 / 0;
  let lastOkAt = -1 / 0;
  let connected = false;
  let consecutiveFailures = 0;
  while (!stopSignal.aborted && !signal.aborted) {
    if (pendingHooks.size >= hookConcurrency) {
      await Promise.race(pendingHooks);
      continue;
    }
    let startTime = performance.now();
    if (connected && startTime - lastPollAt < pollIntervalMs && startTime - lastOkAt < pollIntervalMs) {
      await sleep(pollIntervalMs - (startTime - lastOkAt), stopSignal);
      continue;
    }
    let freeSlots = hookConcurrency - pendingHooks.size;
    healthState.last_poll_at = Date.now();
    lastOkAt = startTime;
    isStopping = true;
    let poll;
    try {
      poll = await apiClient.pollSpawnHints(
        {
          orchestrator_uuid: healthState.orchestratorUuid,
          hostname: healthState.hostname,
          client_version: RUNNER_CLIENT_VERSION,
          max: freeSlots,
          expected_spawn_seconds: args_2.expectedSpawnSeconds,
          ...(args_2.minIdle > 0 && {
            min_idle: args_2.minIdle,
          }),
        },
        signal,
      );
      isStopping = false;
    } catch (error) {
      isStopping = false;
      if (signal.aborted) break;
      healthState.pollErrors[classifyRunnerError(error)]++;
      let httpStatus = getHttpStatus(error);
      let errorText = redactSecretsInText(errorMessage(error));
      if (stopSignal.aborted) {
        healthState.connected = false;
        healthState.last_error = errorText;
        onStatus(
          `[runner:orchestrator] stop: the poll in flight failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${errorText}. If the server had claimed a session for this poll, that session is requested again only after --expected-spawn-seconds`,
        );
        break;
      }
      if (httpStatus !== undefined && RETRYABLE_STATUS.has(httpStatus)) {
        healthState.connected = false;
        healthState.last_error = errorText;
        if (pendingHooks.size > 0) {
          onStatus(
            `[runner:orchestrator] poll rejected (HTTP ${httpStatus}): waiting for ${pendingHooks.size} running hook(s) to end, then exiting`,
          );
          await Promise.allSettled(pendingHooks);
        }
        fatalExit(
          httpStatus === 426
            ? `orchestrator version too old (HTTP 426): ${errorText} \u2014 upgrade and restart`
            : `PollSpawnHints rejected (HTTP ${httpStatus}): ${errorText}`,
        );
      }
      healthState.connected = false;
      healthState.last_error = errorText;
      onStatus(
        `[runner:orchestrator] poll failed${httpStatus ? ` (HTTP ${httpStatus})` : ""}: ${errorText} \u2014 retrying in ${Math.round(backoffMs / 1000)}s`,
      );
      await sleep(backoffMs, stopSignal);
      backoffMs = Math.min(backoffMs * 2, BACKOFF_MAX_MS);
      continue;
    }
    healthState.connected = true;
    healthState.last_error = null;
    backoffMs = MIN_BACKOFF_MS;
    dateSetter(poll.server_date);
    healthState.queue_counts = {
      pending: poll.pending_count,
      backing_off: poll.backing_off_count,
      circuit_broken: poll.circuit_broken_count,
    };
    healthState.pool_pending_session_count = poll.pool_pending_session_count ?? null;
    healthState.pool_active_session_count = poll.pool_active_session_count ?? null;
    {
      let serverEpoch = poll.server_date !== null ? Date.parse(poll.server_date) : Date.now();
      let serverDateMs = Number.isFinite(serverEpoch) ? serverEpoch : Date.now();
      for (let hint of poll.hints) {
        if (typeof hint.queue_wait_started_at !== "string") continue;
        let timestamp = Date.parse(hint.queue_wait_started_at);
        if (!Number.isFinite(timestamp)) continue;
        observeSpawnSeconds(healthState.sessionQueueWaits, (serverDateMs - timestamp) / 1000);
      }
    }
    let sliced = poll.hints.slice(0, freeSlots);
    let sliced_2 = poll.hints.slice(freeSlots);
    for (let hint of sliced_2) {
      onStatus(
        `[runner:orchestrator] server over-returned hint session=${hint.session_uuid} (got ${poll.hints.length}, max=${freeSlots}) \u2014 nacking retryably`,
      );
      await apiClient
        .nackSpawnHint(
          {
            session_uuid: hint.session_uuid,
            attempt: hint.attempt,
            error: "orchestrator: server over-returned hints (>max)",
            retryable: true,
          },
          now_2(),
        )
        .catch((error) =>
          onStatus(
            `[runner:orchestrator] nack of over-returned hint failed: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
          ),
        );
    }
    let max = Math.max(0, freeSlots - sliced.length);
    let idleHints = args_2.minIdle > 0 ? poll.warm_hints.slice(0, max) : [];
    if (poll.warm_hints.length > idleHints.length)
      onDebug(
        `[runner:orchestrator] dropping ${poll.warm_hints.length - idleHints.length} warm hint(s) (budget=${max}, minIdle=${args_2.minIdle})`,
      );
    let aborted = drain !== undefined && stopSignal.aborted;
    let drainAt = drain?.abortAt();
    let remainingMs = drainAt === undefined ? 0 : drainAt - now();
    let isIdlePass =
      !aborted || (!signal.aborted && remainingMs >= args_2.hookTimeoutMs + 2 * ORCHESTRATOR_DEBUG_LIMITS);
    let sessionHints = isIdlePass ? sliced : [];
    let standbyHints = isIdlePass ? [] : sliced;
    let extraIdleHints = isIdlePass ? idleHints : [];
    if (aborted) {
      state.started += sessionHints.length + extraIdleHints.length;
      for (let hint of sessionHints)
        onStatus(
          `[runner:orchestrator] stop: starting session=${hint.session_uuid} attempt=${hint.attempt} jti=${hint.jti}, which the poll in flight brought: ${Math.floor(remainingMs / 1000)}s of the shutdown drain are left`,
        );
      if (!isIdlePass && idleHints.length > 0) {
        state.standbyDropped += idleHints.length;
        onStatus(
          `[runner:orchestrator] stop: not starting ${idleHints.length} standby runner(s) that the poll in flight brought: too little of the shutdown drain is left. The server asks for them again once their lease has ended`,
        );
      }
    }
    if (sessionHints.length > 0)
      onStatus(
        `[runner:orchestrator] dispatching ${sessionHints.length} hint(s) (concurrency=${args_2.hookConcurrency})`,
      );
    if (extraIdleHints.length > 0)
      onStatus(
        `[runner:orchestrator] dispatching ${extraIdleHints.length} warm hint(s) (min_idle=${args_2.minIdle})`,
      );
    let preparedHooks = [
      ...sessionHints.map((hint) => ({
        hint,
        hook: sessionHook(hint, poll.server_date, false),
      })),
      ...standbyHints.map((hint) => ({
        hint,
        hook: standbyHook(hint),
      })),
      ...extraIdleHints.map((hint) => ({
        hint,
        hook: sessionHook(hint, poll.server_date, true),
      })),
    ];
    let abortReason = undefined;
    hookConcurrency = Math.min(args_2.hookConcurrency, abortReason ?? args_2.hookConcurrency);
    connected = abortReason !== undefined;
    if (abortReason === undefined)
      await Promise.all([...preparedHooks.map((entry) => entry.hook), ...pendingHooks]);
    else {
      let pendingSnapshot = [...pendingHooks];
      let results = [];
      for (let { hint, hook } of preparedHooks) {
        let hook_2 = hook
          .catch((error) => {
            healthState.last_error = redactSecretsInText(errorMessage(error));
            onStatus(
              `[runner:orchestrator] hint dispatch threw session=${hint.session_uuid} jti=${hint.jti}: ${healthState.last_error} \u2014 not retried here; the server's state is whatever its hook or nack already set`,
            );
          })
          .finally(() => pendingHooks.delete(hook_2));
        pendingHooks.add(hook_2);
        results.push(hook_2);
      }
      if (sliced.length > 0) {
        if (
          results.length >= Math.min(freeSlots, hookConcurrency) &&
          consecutiveFailures < fullAnswerSettleMs
        )
          await withDeadline(Promise.race([Promise.all(results), ...pendingSnapshot]), fullAnswerSettleMs);
        await sleep(
          Math.min(minPollGapMs, Math.max(0, minPollGapMs - (Date.now() - healthState.last_poll_at))),
          stopSignal,
        );
        continue;
      }
    }
    await sleep(jitteredValue(pollIntervalMs, random), stopSignal);
  }
  await Promise.all(pendingHooks);
  drain?.stopSignal.removeEventListener("abort", onStop);
  if (state.at !== undefined)
    onStatus(
      `[runner:orchestrator] stop summary: poll_in_flight=${state.pollInFlight ? 1 : 0} hooks_running=${state.hooksRunning} started_after_stop=${state.started} handed_back=${state.handedBack} standby_dropped=${state.standbyDropped} hooks_ok=${state.hooksOk} hooks_failed=${state.hooksFailed} hooks_stopped=${state.hooksStopped} nacks_failed=${state.nacksFailed} aborted=${signal.aborted ? 1 : 0} seconds=${((now() - state.at) / 1000).toFixed(1)}`,
    );
  function dateSetter(timestamp) {
    let serverAgeMs = ageMs(timestamp);
    if (serverAgeMs === null) return;
    healthState.clock_skew_ms = serverAgeMs;
    if (Math.abs(serverAgeMs) > SCM_TIMEOUT_MS)
      onStatus(
        `[runner:warn] clock skew ${Math.round(serverAgeMs / 1000)}s vs server \u2014 check NTP (work-order exp checks may fail)`,
      );
  }
  async function sessionHook(hint, serverTime, isIdle) {
    healthState.last_hint_at = Date.now();
    if (isIdle) healthState.warm_hints_dispatched++;
    let reason =
      normalizeSpawnReason(typeof hint.spawn_reason === "string" ? hint.spawn_reason : undefined) ?? "-";
    let hookResult;
    let sawRetryable = false;
    pollCount++;
    try {
      let claims = workOrderClaims(hint, serverTime);
      hookResult = await runHook({
        hookPath,
        jwt: hint.work_order_jwt,
        claims,
        timeoutMs: args_2.hookTimeoutMs,
        debugDir: args_2.debugDir,
        signal,
        onStatus,
        onDebug,
      });
      sawRetryable = true;
    } catch (error) {
      hookResult = {
        ok: false,
        exitCode: 1,
        timedOut: false,
        execError: false,
        stderrTail: `spawn-runner hook setup failed: ${errorMessage(error)}`,
        durationMs: 0,
      };
    }
    pollCount--;
    consecutiveFailures = hookResult.durationMs;
    observeDuration(healthState.spawnHookDurations, hookResult.durationMs / 1000);
    if (hookResult.ok) {
      healthState.spawnHooks.ok++;
      healthState.last_hook_ok_at = Date.now();
      if (isIdle) healthState.last_warm_hook_ok_at = healthState.last_hook_ok_at;
      onStatus(
        `[runner:orchestrator] ok session=${hint.session_uuid} attempt=${hint.attempt} jti=${hint.jti} reason=${reason} (${hookResult.durationMs}ms)`,
      );
      if (state.at !== undefined) {
        state.hooksOk++;
        onStatus(
          `[runner:orchestrator] stop: hook ended ok session=${hint.session_uuid} attempt=${hint.attempt} jti=${hint.jti} (${hookResult.durationMs}ms)`,
        );
      }
      return;
    }
    let nackText =
      !hookResult.timedOut &&
      !hookResult.execError &&
      (hookResult.exitCode === null || (hookResult.exitCode > 128 && hookResult.exitCode <= 159));
    if (state.at !== undefined)
      if (nackText) state.hooksStopped++;
      else state.hooksFailed++;
    let stderrTail = redactSecretsInText(
      hookResult.stderrTail ||
        (hookResult.exitCode === null
          ? "hook killed by external signal (no stderr)"
          : `exit ${hookResult.exitCode}`),
    );
    let outcome =
      hookResult.exitCode === 1 ||
      hookResult.timedOut ||
      (hookResult.exitCode === null && !hookResult.execError);
    let isFinal = !sawRetryable
      ? undefined
      : hookResult.timedOut
        ? "SESSION_FAILURE_KIND_SPAWN_TIMEOUT"
        : "SESSION_FAILURE_KIND_SPAWN_HOOK_ERROR";
    if (outcome) healthState.spawnHooks.retryable++;
    else healthState.spawnHooks.nonRetryable++;
    healthState.last_error = `spawn-runner hook failed: ${stderrTail}`;
    if (isIdle) {
      onStatus(
        `[runner:orchestrator] warm hook failed jti=${hint.jti} exit=${hookResult.exitCode} timedOut=${hookResult.timedOut}: ${stderrTail} \u2014 lease expiry will re-mint`,
      );
      return;
    }
    if (drain && stopSignal.aborted && !signal.aborted && nackText) {
      state.nacksFailed++;
      onStatus(
        `[runner:orchestrator] stop: no nack for session=${hint.session_uuid} attempt=${hint.attempt} jti=${hint.jti} exit=${hookResult.exitCode}: a signal ended its hook during the shutdown drain, and the hook may already have submitted its runner \u2014 if it had not, lease expiry will re-admit`,
      );
      return;
    }
    lastPollAt = performance.now();
    onStatus(
      `[runner:orchestrator] nack session=${hint.session_uuid} attempt=${hint.attempt} exit=${hookResult.exitCode} timedOut=${hookResult.timedOut} retryable=${outcome} reason=${reason}: ${stderrTail}`,
    );
    try {
      await apiClient.nackSpawnHint(
        {
          session_uuid: hint.session_uuid,
          attempt: hint.attempt,
          error: stderrTail,
          retryable: outcome,
          ...(isFinal && {
            failure_kind: isFinal,
          }),
        },
        now_2(),
      );
    } catch (error) {
      if (state.at !== undefined) state.nacksFailed++;
      onStatus(
        `[runner:orchestrator] nack failed session=${hint.session_uuid}: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
      );
    }
  }
  async function standbyHook(hint) {
    state.handedBack++;
    onStatus(
      `[runner:orchestrator] stop: handing back session=${hint.session_uuid} attempt=${hint.attempt} jti=${hint.jti}, which the poll in flight brought: too little of the shutdown drain is left to run its hook`,
    );
    try {
      await apiClient.nackSpawnHint(
        {
          session_uuid: hint.session_uuid,
          attempt: hint.attempt,
          error: "orchestrator is shutting down: the spawn-runner hook was not run",
          retryable: true,
        },
        AbortSignal.timeout(ENV_MAX_TIMEOUT_MS),
      );
    } catch (error) {
      state.nacksFailed++;
      onStatus(
        `[runner:orchestrator] nack failed session=${hint.session_uuid}: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
      );
    }
  }
}
//@ chunk-h7hgs1mf.js:45027-45149 placement
function fatalExitWith(emit) {
  return (message) => {
    emit(`${new Date().toISOString()} [self-hosted-runner] [runner:fatal] ${redactSecretsInText(message)}`);
    process.exit(1);
  };
}
//@ chunk-h7hgs1mf.js:45149-45182 placement
var errorLogger = fatalExitWith((message) => console.error(message));
export { startRunnerHealthServer, runOrchestratorLoop, fatalExitWith };
