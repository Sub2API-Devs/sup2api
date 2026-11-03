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
import { Yde, SPAWN_SECONDS_BUCKETS, observeSpawnSeconds, observeDuration } from "./metrics.js";
import { ne, $e, bt, gt, wt, St, Re, Tt, kt, ft } from "./scmConnector.js";
import { gvr, classifyRunnerError, getHttpStatus } from "../../selfHostedRunner/runnerApiErrors.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { runSpawnRunnerHook } from "./spawnHints.js";
import { HHn, Y9e } from "../../selfHostedRunner/serverAutoMode.js";
import { sleep, withDeadline } from "../../utils/sleep.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { errorMessage } from "../../utils/errors.js";
import { ORCHESTRATOR_DEBUG_LIMITS } from "./orchestratorDebugDir.js";
import { ageMs, workOrderClaims } from "./runnerConfig.js";

/**
 * 把 orchestrator 健康状态渲染为 Prometheus 文本格式（/metrics）。
 */
//@ chunk-2cbdmxy9.js:26067-33681 placement
function renderRunnerMetrics(e, t = Date.now()) {
  let r = e.last_poll_at > 0 ? (t - e.last_poll_at) / 1000 : 0,
    n = `version="${Yde(e.version)}",pool_id="${Yde(e.pool_id)}",orchestrator_uuid="${Yde(e.orchestratorUuid)}",hostname="${Yde(e.hostname)}"`,
    h = "claude_code_self_hosted_orchestrator",
    o = "";
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_info Self-hosted orchestrator identity (info-style gauge; value is always 1).
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_info gauge
`),
    (o += `claude_code_self_hosted_orchestrator_info{${n}} 1
`),
    (o += `# HELP claude_code_self_hosted_orchestrator_connected 1 when the last PollSpawnHints returned successfully; 0 on transport/5xx error.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_connected gauge
`),
    (o += `claude_code_self_hosted_orchestrator_connected ${e.connected ? 1 : 0}
`),
    (o += `# HELP claude_code_self_hosted_orchestrator_last_poll_age_seconds Seconds since the last PollSpawnHints attempt (success or failure).
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_last_poll_age_seconds gauge
`),
    (o += `claude_code_self_hosted_orchestrator_last_poll_age_seconds ${r}
`),
    (o += `# HELP claude_code_self_hosted_orchestrator_queue_pending_sessions Spawn-hint queue rows claimable right now (eta < now, unclaimed, not circuit-broken). Server-side aggregate for this environment.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_queue_pending_sessions gauge
`),
    e.queue_counts !== null)
  )
    o += `claude_code_self_hosted_orchestrator_queue_pending_sessions ${e.queue_counts.pending}
`;
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_queue_backing_off_sessions Spawn-hint queue rows in retry backoff (nacked retryable; eta in the future). Server-side aggregate for this environment.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_queue_backing_off_sessions gauge
`),
    e.queue_counts !== null)
  )
    o += `claude_code_self_hosted_orchestrator_queue_backing_off_sessions ${e.queue_counts.backing_off}
`;
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions Spawn-hint queue rows circuit-broken (nacked non-retryable; operator must RetrySpawnHint to re-admit). Server-side aggregate for this environment.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions gauge
`),
    e.queue_counts !== null)
  )
    o += `claude_code_self_hosted_orchestrator_queue_circuit_broken_sessions ${e.queue_counts.circuit_broken}
`;
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_pool_pending_sessions Total sessions currently waiting on a runner for this environment (the UI "N ahead of you" number). Autoscale on this, not on queue_pending_sessions.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_pool_pending_sessions gauge
`),
    e.pool_pending_session_count !== null)
  )
    o += `claude_code_self_hosted_orchestrator_pool_pending_sessions ${e.pool_pending_session_count}
`;
  if (
    ((o += `# HELP ${"claude_code_self_hosted_orchestrator"}_pool_active_sessions Sessions currently assigned to an alive runner in this environment (the server's environment-wide sum of the per-runner _active_sessions gauges). Environment-wide aggregate \u2014 identical on every orchestrator for one environment; use MAX not SUM across orchestrator instances.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_pool_active_sessions gauge
`),
    e.pool_active_session_count !== null)
  )
    o += `claude_code_self_hosted_orchestrator_pool_active_sessions ${e.pool_active_session_count}
`;
  ((o += `# HELP claude_code_self_hosted_orchestrator_warm_hints_dispatched_total Standby (warm) hints dispatched since process start.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_warm_hints_dispatched_total counter
`),
    (o += `claude_code_self_hosted_orchestrator_warm_hints_dispatched_total ${e.warm_hints_dispatched}
`),
    (o += `# HELP ${"claude_code_self_hosted_orchestrator"}_spawn_hooks_total spawn-runner hook outcomes since process start (exit-code contract: ok=0, retryable=1/timeout/signal, non_retryable=>=2/ENOENT/EACCES). Counts orchestrator hook invocations (seat + warm), NOT runner child spawns \u2014 NOT comparable to the runner's sessions_started_total (capacity>1, warm environments, and per-runner re-spawns all diverge them).
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_spawn_hooks_total counter
`),
    (o += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="ok"} ${e.spawnHooks.ok}
`),
    (o += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="retryable"} ${e.spawnHooks.retryable}
`),
    (o += `claude_code_self_hosted_orchestrator_spawn_hooks_total{result="non_retryable"} ${e.spawnHooks.nonRetryable}
`),
    (o += `# HELP claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds Wall-clock seconds per spawn-runner hook run (all outcomes; seat + warm).
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds histogram
`));
  let spawnHookDurations = e.spawnHookDurations;
  for (let c = 0; c < ne.length; c++)
    o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_bucket{le="${ne[c]}"} ${spawnHookDurations.buckets[c]}
`;
  ((o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_bucket{le="+Inf"} ${spawnHookDurations.count}
`),
    (o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_sum ${spawnHookDurations.sum}
`),
    (o += `claude_code_self_hosted_orchestrator_spawn_hook_duration_seconds_count ${spawnHookDurations.count}
`),
    (o += `# HELP claude_code_self_hosted_orchestrator_session_queue_wait_seconds Seconds each session waited in the queue before the orchestrator claimed it for spawn (HTTP Date header - SpawnHint.queue_wait_started_at; seat hints only). For p50/p99 queue-time SLOs and "queue wait > N" alerting.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_session_queue_wait_seconds histogram
`));
  let sessionQueueWaits = e.sessionQueueWaits;
  for (let c = 0; c < SPAWN_SECONDS_BUCKETS.length; c++)
    o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_bucket{le="${SPAWN_SECONDS_BUCKETS[c]}"} ${sessionQueueWaits.buckets[c]}
`;
  ((o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_bucket{le="+Inf"} ${sessionQueueWaits.count}
`),
    (o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_sum ${sessionQueueWaits.sum}
`),
    (o += `claude_code_self_hosted_orchestrator_session_queue_wait_seconds_count ${sessionQueueWaits.count}
`),
    (o += `# HELP claude_code_self_hosted_orchestrator_poll_errors_total PollSpawnHints request failures by error kind (transport=no HTTP response; timeout=client deadline; 5xx/429/4xx by status). All five series present from process start so rate() works and absent() means process-down.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_poll_errors_total counter
`));
  for (let c of gvr)
    o += `claude_code_self_hosted_orchestrator_poll_errors_total{error_kind="${c}"} ${e.pollErrors[c]}
`;
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_clock_skew_seconds Local-minus-server clock skew from the most recent PollSpawnHints Date header. Sample omitted until measured.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_clock_skew_seconds gauge
`),
    e.clock_skew_ms !== null)
  )
    o += `claude_code_self_hosted_orchestrator_clock_skew_seconds ${e.clock_skew_ms / 1000}
`;
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_scm_connector_connected 1 when the standing SCM connector WebSocket is OPEN; 0 when dialing/backing off. Series absent when --scm-connector-host is not set.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_scm_connector_connected gauge
`),
    e.scm_connector !== null)
  )
    o += `claude_code_self_hosted_orchestrator_scm_connector_connected ${e.scm_connector.connected ? 1 : 0}
`;
  if (
    ((o += `# HELP claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total Cumulative HTTP requests proxied to the configured SCM host since process start.
`),
    (o += `# TYPE claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total counter
`),
    e.scm_connector !== null)
  )
    o += `claude_code_self_hosted_orchestrator_scm_connector_requests_forwarded_total ${e.scm_connector.requests_forwarded}
`;
  return o;
}
//@ chunk-2cbdmxy9.js:33681-35678 placement
function startRunnerHealthServer(e, t, r) {
  let n = createServer((o, l) => {
    if (o.method === "GET" && o.url === "/metrics") {
      let c = renderRunnerMetrics(t);
      (l.writeHead(200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
        "Content-Length": Buffer.byteLength(c),
      }),
        l.end(c));
      return;
    }
    if (o.method !== "GET" || o.url !== "/healthz") {
      (l.writeHead(404, { "Content-Type": "text/plain" }),
        l.end(`not found
`));
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
    (l.writeHead(200, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(g) }),
      l.end(g));
  });
  n.unref();
  let h = 0;
  return (
    n.on("error", (o) => {
      if (o.code === "EADDRINUSE" && h === 0) {
        (h++,
          r(`[runner:warn] /healthz port ${e} busy, retrying in ${$e}ms`),
          setTimeout((l, g) => l.listen(g), $e, n, e).unref());
        return;
      }
      r(
        `[runner:warn] /healthz listener failed on port ${e}: ${o.message} \u2014 continuing without health endpoint`,
      );
    }),
    n.on("listening", () => {
      let address = n.address(),
        l = typeof address === "object" && address ? address.port : e;
      r(`[runner:health] orchestrator /healthz and /metrics listening on :${l}`);
    }),
    n.listen(e),
    n
  );
}
//@ chunk-2cbdmxy9.js:35678-35733 placement
function Mt(e, t) {
  return Math.round(e * (1 + bt * (2 * t() - 1)));
}
/**
 * self-hosted runner 轮询主循环：向服务器领取工作单、调用 spawn-runner 钩子启动会话、处理排空与停止。
 */
//@ chunk-2cbdmxy9.js:35733-44043 placement
async function runOrchestratorLoop(e, t) {
  let {
      apiClient: apiClient,
      healthState: healthState,
      onStatus: onStatus,
      onDebug: onDebug,
      args: args,
      hookPath: hookPath,
      runHook: runHook = runSpawnRunnerHook,
      fatalExit: fatalExit = Ft,
      pollIntervalMs: pollIntervalMs = gt,
      minPollGapMs: minPollGapMs = wt,
      fullAnswerSettleMs: fullAnswerSettleMs = St,
      random: random = Math.random,
      drain: drain,
      now: now = () => performance.now(),
    } = e,
    T = drain?.stopSignal ?? t,
    D = () => (drain && T.aborted && !t.aborted ? AbortSignal.timeout(HHn) : t),
    w = {
      at: void 0,
      pollInFlight: !1,
      hooksRunning: 0,
      started: 0,
      handedBack: 0,
      standbyDropped: 0,
      hooksOk: 0,
      hooksFailed: 0,
      hooksStopped: 0,
      nacksFailed: 0,
    },
    x = !1,
    O = 0,
    I = () => {
      ((w.at = now()), (w.pollInFlight = x), (w.hooksRunning = O));
    };
  if (drain) {
    if ((drain.stopSignal.addEventListener("abort", I, { once: !0 }), drain.stopSignal.aborted)) I();
  }
  let G = Re,
    L = new Set(),
    hookConcurrency = args.hookConcurrency,
    q = -1 / 0,
    b = -1 / 0,
    K = !1,
    m = 0;
  while (!T.aborted && !t.aborted) {
    if (L.size >= hookConcurrency) {
      await Promise.race(L);
      continue;
    }
    let startTime = performance.now();
    if (K && startTime - q < pollIntervalMs && startTime - b < pollIntervalMs) {
      await sleep(pollIntervalMs - (startTime - b), T);
      continue;
    }
    let R = hookConcurrency - L.size;
    ((healthState.last_poll_at = Date.now()), (b = startTime), (x = !0));
    let k;
    try {
      ((k = await apiClient.pollSpawnHints(
        {
          orchestrator_uuid: healthState.orchestratorUuid,
          hostname: healthState.hostname,
          client_version: Y9e,
          max: R,
          expected_spawn_seconds: args.expectedSpawnSeconds,
          ...(args.minIdle > 0 && { min_idle: args.minIdle }),
        },
        t,
      )),
        (x = !1));
    } catch (error) {
      if (((x = !1), t.aborted)) break;
      healthState.pollErrors[classifyRunnerError(error)]++;
      let M = getHttpStatus(error),
        Y = redactSecretsInText(errorMessage(error));
      if (T.aborted) {
        ((healthState.connected = !1),
          (healthState.last_error = Y),
          onStatus(
            `[runner:orchestrator] stop: the poll in flight failed${M ? ` (HTTP ${M})` : ""}: ${Y}. If the server had claimed a session for this poll, that session is requested again only after --expected-spawn-seconds`,
          ));
        break;
      }
      if (M !== void 0 && Tt.has(M)) {
        if (((healthState.connected = !1), (healthState.last_error = Y), L.size > 0))
          (onStatus(
            `[runner:orchestrator] poll rejected (HTTP ${M}): waiting for ${L.size} running hook(s) to end, then exiting`,
          ),
            await Promise.allSettled(L));
        fatalExit(
          M === 426
            ? `orchestrator version too old (HTTP 426): ${Y} \u2014 upgrade and restart`
            : `PollSpawnHints rejected (HTTP ${M}): ${Y}`,
        );
      }
      ((healthState.connected = !1),
        (healthState.last_error = Y),
        onStatus(
          `[runner:orchestrator] poll failed${M ? ` (HTTP ${M})` : ""}: ${Y} \u2014 retrying in ${Math.round(G / 1000)}s`,
        ),
        await sleep(G, T),
        (G = Math.min(G * 2, kt)));
      continue;
    }
    ((healthState.connected = !0),
      (healthState.last_error = null),
      (G = Re),
      a(k.server_date),
      (healthState.queue_counts = {
        pending: k.pending_count,
        backing_off: k.backing_off_count,
        circuit_broken: k.circuit_broken_count,
      }),
      (healthState.pool_pending_session_count = k.pool_pending_session_count ?? null),
      (healthState.pool_active_session_count = k.pool_active_session_count ?? null));
    {
      let v = k.server_date !== null ? Date.parse(k.server_date) : Date.now(),
        M = Number.isFinite(v) ? v : Date.now();
      for (let hint of k.hints) {
        if (typeof hint.queue_wait_started_at !== "string") continue;
        let parse = Date.parse(hint.queue_wait_started_at);
        if (!Number.isFinite(parse)) continue;
        observeSpawnSeconds(healthState.sessionQueueWaits, (M - parse) / 1000);
      }
    }
    let sliced = k.hints.slice(0, R),
      sliced_2 = k.hints.slice(R);
    for (let v of sliced_2)
      (onStatus(
        `[runner:orchestrator] server over-returned hint session=${v.session_uuid} (got ${k.hints.length}, max=${R}) \u2014 nacking retryably`,
      ),
        await apiClient
          .nackSpawnHint(
            {
              session_uuid: v.session_uuid,
              attempt: v.attempt,
              error: "orchestrator: server over-returned hints (>max)",
              retryable: !0,
            },
            D(),
          )
          .catch((M) =>
            onStatus(
              `[runner:orchestrator] nack of over-returned hint failed: ${errorMessage(M)} \u2014 lease expiry will re-admit`,
            ),
          ));
    let max = Math.max(0, R - sliced.length),
      P = args.minIdle > 0 ? k.warm_hints.slice(0, max) : [];
    if (k.warm_hints.length > P.length)
      onDebug(
        `[runner:orchestrator] dropping ${k.warm_hints.length - P.length} warm hint(s) (budget=${max}, minIdle=${args.minIdle})`,
      );
    let y = drain !== void 0 && T.aborted,
      A = drain?.abortAt(),
      C = A === void 0 ? 0 : A - now(),
      V = !y || (!t.aborted && C >= args.hookTimeoutMs + 2 * ORCHESTRATOR_DEBUG_LIMITS),
      X = V ? sliced : [],
      ie = V ? [] : sliced,
      ee = V ? P : [];
    if (y) {
      w.started += X.length + ee.length;
      for (let v of X)
        onStatus(
          `[runner:orchestrator] stop: starting session=${v.session_uuid} attempt=${v.attempt} jti=${v.jti}, which the poll in flight brought: ${Math.floor(C / 1000)}s of the shutdown drain are left`,
        );
      if (!V && P.length > 0)
        ((w.standbyDropped += P.length),
          onStatus(
            `[runner:orchestrator] stop: not starting ${P.length} standby runner(s) that the poll in flight brought: too little of the shutdown drain is left. The server asks for them again once their lease has ended`,
          ));
    }
    if (X.length > 0)
      onStatus(`[runner:orchestrator] dispatching ${X.length} hint(s) (concurrency=${args.hookConcurrency})`);
    if (ee.length > 0)
      onStatus(`[runner:orchestrator] dispatching ${ee.length} warm hint(s) (min_idle=${args.minIdle})`);
    let he = [
        ...X.map((v) => ({ hint: v, hook: f(v, k.server_date, !1) })),
        ...ie.map((v) => ({ hint: v, hook: N(v) })),
        ...ee.map((v) => ({ hint: v, hook: f(v, k.server_date, !0) })),
      ],
      ae = void 0;
    if (
      ((hookConcurrency = Math.min(args.hookConcurrency, ae ?? args.hookConcurrency)),
      (K = ae !== void 0),
      ae === void 0)
    )
      await Promise.all([...he.map((v) => v.hook), ...L]);
    else {
      let v = [...L],
        M = [];
      for (let { hint: hint, hook: hook } of he) {
        let ce = hook
          .catch((Ie) => {
            ((healthState.last_error = redactSecretsInText(errorMessage(Ie))),
              onStatus(
                `[runner:orchestrator] hint dispatch threw session=${hint.session_uuid} jti=${hint.jti}: ${healthState.last_error} \u2014 not retried here; the server's state is whatever its hook or nack already set`,
              ));
          })
          .finally(() => L.delete(ce));
        (L.add(ce), M.push(ce));
      }
      if (sliced.length > 0) {
        if (M.length >= Math.min(R, hookConcurrency) && m < fullAnswerSettleMs)
          await withDeadline(Promise.race([Promise.all(M), ...v]), fullAnswerSettleMs);
        await sleep(
          Math.min(minPollGapMs, Math.max(0, minPollGapMs - (Date.now() - healthState.last_poll_at))),
          T,
        );
        continue;
      }
    }
    await sleep(Mt(pollIntervalMs, random), T);
  }
  if ((await Promise.all(L), drain?.stopSignal.removeEventListener("abort", I), w.at !== void 0))
    onStatus(
      `[runner:orchestrator] stop summary: poll_in_flight=${w.pollInFlight ? 1 : 0} hooks_running=${w.hooksRunning} started_after_stop=${w.started} handed_back=${w.handedBack} standby_dropped=${w.standbyDropped} hooks_ok=${w.hooksOk} hooks_failed=${w.hooksFailed} hooks_stopped=${w.hooksStopped} nacks_failed=${w.nacksFailed} aborted=${t.aborted ? 1 : 0} seconds=${((now() - w.at) / 1000).toFixed(1)}`,
    );
  function a(p) {
    let R = ageMs(p);
    if (R === null) return;
    if (((healthState.clock_skew_ms = R), Math.abs(R) > ft))
      onStatus(
        `[runner:warn] clock skew ${Math.round(R / 1000)}s vs server \u2014 check NTP (work-order exp checks may fail)`,
      );
  }
  async function f(p, R, k) {
    if (((healthState.last_hint_at = Date.now()), k)) healthState.warm_hints_dispatched++;
    let E,
      F = !1;
    O++;
    try {
      let C = workOrderClaims(p, R);
      ((E = await runHook({
        hookPath: hookPath,
        jwt: p.work_order_jwt,
        claims: C,
        timeoutMs: args.hookTimeoutMs,
        debugDir: args.debugDir,
        signal: t,
        onStatus: onStatus,
        onDebug: onDebug,
      })),
        (F = !0));
    } catch (error) {
      E = {
        ok: !1,
        exitCode: 1,
        timedOut: !1,
        execError: !1,
        stderrTail: `spawn-runner hook setup failed: ${errorMessage(error)}`,
        durationMs: 0,
      };
    }
    if (
      (O--, (m = E.durationMs), observeDuration(healthState.spawnHookDurations, E.durationMs / 1000), E.ok)
    ) {
      if ((healthState.spawnHooks.ok++, (healthState.last_hook_ok_at = Date.now()), k))
        healthState.last_warm_hook_ok_at = healthState.last_hook_ok_at;
      if (
        (onDebug(
          `[runner:orchestrator] ok session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti} (${E.durationMs}ms)`,
        ),
        w.at !== void 0)
      )
        (w.hooksOk++,
          onStatus(
            `[runner:orchestrator] stop: hook ended ok session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti} (${E.durationMs}ms)`,
          ));
      return;
    }
    let Q = !E.timedOut && !E.execError && (E.exitCode === null || (E.exitCode > 128 && E.exitCode <= 159));
    if (w.at !== void 0)
      if (Q) w.hooksStopped++;
      else w.hooksFailed++;
    let P = redactSecretsInText(
        E.stderrTail ||
          (E.exitCode === null ? "hook killed by external signal (no stderr)" : `exit ${E.exitCode}`),
      ),
      y = E.exitCode === 1 || E.timedOut || (E.exitCode === null && !E.execError),
      A = !F
        ? void 0
        : E.timedOut
          ? "SESSION_FAILURE_KIND_SPAWN_TIMEOUT"
          : "SESSION_FAILURE_KIND_SPAWN_HOOK_ERROR";
    if (y) healthState.spawnHooks.retryable++;
    else healthState.spawnHooks.nonRetryable++;
    if (((healthState.last_error = `spawn-runner hook failed: ${P}`), k)) {
      onStatus(
        `[runner:orchestrator] warm hook failed jti=${p.jti} exit=${E.exitCode} timedOut=${E.timedOut}: ${P} \u2014 lease expiry will re-mint`,
      );
      return;
    }
    if (drain && T.aborted && !t.aborted && Q) {
      (w.nacksFailed++,
        onStatus(
          `[runner:orchestrator] stop: no nack for session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti} exit=${E.exitCode}: a signal ended its hook during the shutdown drain, and the hook may already have submitted its runner \u2014 if it had not, lease expiry will re-admit`,
        ));
      return;
    }
    ((q = performance.now()),
      onStatus(
        `[runner:orchestrator] nack session=${p.session_uuid} attempt=${p.attempt} exit=${E.exitCode} timedOut=${E.timedOut} retryable=${y}: ${P}`,
      ));
    try {
      await apiClient.nackSpawnHint(
        {
          session_uuid: p.session_uuid,
          attempt: p.attempt,
          error: P,
          retryable: y,
          ...(A && { failure_kind: A }),
        },
        D(),
      );
    } catch (error) {
      if (w.at !== void 0) w.nacksFailed++;
      onStatus(
        `[runner:orchestrator] nack failed session=${p.session_uuid}: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
      );
    }
  }
  async function N(p) {
    (w.handedBack++,
      onStatus(
        `[runner:orchestrator] stop: handing back session=${p.session_uuid} attempt=${p.attempt} jti=${p.jti}, which the poll in flight brought: too little of the shutdown drain is left to run its hook`,
      ));
    try {
      await apiClient.nackSpawnHint(
        {
          session_uuid: p.session_uuid,
          attempt: p.attempt,
          error: "orchestrator is shutting down: the spawn-runner hook was not run",
          retryable: !0,
        },
        AbortSignal.timeout(HHn),
      );
    } catch (error) {
      (w.nacksFailed++,
        onStatus(
          `[runner:orchestrator] nack failed session=${p.session_uuid}: ${errorMessage(error)} \u2014 lease expiry will re-admit`,
        ));
    }
  }
}
//@ chunk-2cbdmxy9.js:44043-44165 placement
function fatalExitWith(e) {
  return (t) => {
    (e(`${new Date().toISOString()} [self-hosted-runner] [runner:fatal] ${redactSecretsInText(t)}`),
      process.exit(1));
  };
}
//@ chunk-2cbdmxy9.js:44165-44198 placement
var Ft = fatalExitWith((e) => console.error(e));

export { startRunnerHealthServer, runOrchestratorLoop, fatalExitWith };
