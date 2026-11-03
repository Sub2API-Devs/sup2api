/**
 * entrypoints/selfHostedRunner/metrics.ts
 *
 * 2.1.316 新增：自托管 runner 的耗时直方图指标
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (5), chunk-3nztfxrw.js (12)
 * attribution: placement 17
 */
import { RUNNER_ERROR_CATEGORIES } from "../../selfHostedRunner/runnerApiErrors.js";
import { xe, Fe } from "../../../vendor/@opentelemetry/otlp-transformer/build/esm/common/internal.js";
import { BACKOFF_SCHEDULE } from "./scmConnector.js";

//@ chunk-3nztfxrw.js:17958-18005 placement
/**
 * 导出值：METRIC_NAME_RE（指标名字符集）。
 */
var UNKNOWN = "unknown";
var METRIC_NAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
//@ chunk-3nztfxrw.js:18005-18112 placement
/**
 * 校验指标标签值：为空、unknown、不合法字符、以 - 开头或为 ./.. 时返回 undefined。
 */
function sanitizeMetricLabel(clientPlatform) {
  if (
    !clientPlatform ||
    clientPlatform === "unknown" ||
    !METRIC_NAME_RE.test(clientPlatform) ||
    clientPlatform.startsWith("-") ||
    /^\.{1,2}$/.test(clientPlatform)
  )
    return;
  return clientPlatform;
}
//@ chunk-3nztfxrw.js:18112-18248 placement
/**
 * 转义指标标签值：保留字母数字与 _.-，其他字符转成 \\u{...}，最多 128 个字符。
 */
function escapeMetricValue(e) {
  return Array.from(e.slice(0, 128))
    .map((n) => (/[A-Za-z0-9_.-]/.test(n) ? n : `\\u{${n.codePointAt(0).toString(16)}}`))
    .join("");
}
//@ chunk-3nztfxrw.js:18248-18294 placement
var LATENCY_BUCKETS = [1, 2.5, 5, 10, 20, 40, 80, 160, 320, 640, 1280];
//@ chunk-3nztfxrw.js:18294-18353 placement
/**
 * 函数 createHistogram（新建直方图）。
 */
function createHistogram() {
  return {
    buckets: LATENCY_BUCKETS.map(() => 0),
    count: 0,
    sum: 0,
  };
}
//@ chunk-3nztfxrw.js:18353-18446 placement
/**
 * 函数 observeHistogram（记录一次观测）。
 */
function observeHistogram(sessionInitDurations, durationSec) {
  sessionInitDurations.sum += durationSec;
  sessionInitDurations.count += 1;
  for (let i = 0; i < LATENCY_BUCKETS.length; i++)
    if (durationSec <= LATENCY_BUCKETS[i]) sessionInitDurations.buckets[i]++;
}
//@ chunk-3nztfxrw.js:18446-18535 placement
/**
 * 函数 escapeLabelValue（转义标签值）。
 */
function escapeLabelValue(e) {
  return e.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
//@ chunk-3nztfxrw.js:18535-18613 placement
function sanitizeMetricName(e) {
  return e.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");
}
//@ chunk-3nztfxrw.js:18613-18653 placement
var CLAUDE_CODE_SELF_HOSTED_RUNNER = "claude_code_self_hosted_runner";
//@ chunk-3nztfxrw.js:18653-23942 placement
/**
 * 以 Prometheus 文本格式输出自托管 runner 指标（runner_id、version、client_label）
 */
function renderRunnerMetrics(e, n = Date.now()) {
  let r = e.lastPollAt > 0 ? (n - e.lastPollAt) / 1000 : 0;
  let m = `runner_id="${escapeLabelValue(e.runnerId)}",version="${escapeLabelValue(e.version)}",client_label="${escapeLabelValue(e.clientLabel)}"`;
  let a = CLAUDE_CODE_SELF_HOSTED_RUNNER;
  let t = "";
  t += `# HELP ${a}_info Self-hosted runner identity (info-style gauge; value is always 1).
`;
  t += `# TYPE ${a}_info gauge
`;
  t += `${a}_info{${m}} 1
`;
  t += `# HELP ${a}_capacity Max concurrent sessions this runner accepts (--capacity).
`;
  t += `# TYPE ${a}_capacity gauge
`;
  t += `${a}_capacity ${e.capacity}
`;
  t += `# HELP ${a}_active_sessions Sessions currently being handled by this runner.
`;
  t += `# TYPE ${a}_active_sessions gauge
`;
  t += `${a}_active_sessions ${e.activeSessions}
`;
  for (let [s, c] of [
    ["sessions_started_total", e.sessionsStarted],
    ["sessions_completed_total", e.sessionsCompleted],
    ["sessions_failed_total", e.sessionsFailed],
    ["sessions_interrupted_total", e.sessionsInterrupted],
  ]) {
    t += `# HELP ${a}_${s} ${s === "sessions_started_total" ? "Session child processes spawned over the runner's lifetime. One increment per child spawn; a session that is re-spawned (runner restart, re-assignment) counts again. NOT comparable to the orchestrator's spawn_hooks_total (which counts orchestrator spawn-runner hook runs, including warm hints)." : s === "sessions_completed_total" ? "Session child processes that ended cleanly over the runner's lifetime: child exited 0, the server closed the session (archive/delete), or the runner released the slot as a clean handoff (idle release, startup timeout, retire / max-session-age release, server deassign). Drain/SIGTERM and the max-lifetime hard-cap kill are NOT counted (those increment sessions_interrupted_total instead)." : s === "sessions_failed_total" ? "Session child processes that exited with a non-zero code over the runner's lifetime (crash, OOM, spawn error). Does NOT include idle-release or a server deassign the poll loop observed first (those count as completed); a deassign the child notices first via its epoch-409 exit still lands here." : "Session child processes that were terminated for a non-session-outcome reason over its lifetime (drain/SIGTERM, max-lifetime hard-cap kill, released=false backstop, or an external signal). Watchdog and external-signal kills are additionally reported to the server as session failures. Closes the accounting: started - (completed + failed + interrupted) equals the number of session children currently running."}
`;
    t += `# TYPE ${a}_${s} counter
`;
    for (let [b, w] of c)
      t += `${a}_${s}{client_platform="${escapeLabelValue(b)}"} ${w}
`;
  }
  t += `# HELP ${a}_locked_account Present (value 1) once the runner is locked to an account; absent while fungible.
`;
  t += `# TYPE ${a}_locked_account gauge
`;
  if (e.lockedAccountEmail !== null)
    t += `${a}_locked_account{email="${escapeLabelValue(e.lockedAccountEmail)}"} 1
`;
  t += `# HELP ${a}_last_poll_age_seconds Seconds since the last successful pollWork return.
`;
  t += `# TYPE ${a}_last_poll_age_seconds gauge
`;
  t += `${a}_last_poll_age_seconds ${r}
`;
  t += `# HELP ${a}_poll_errors_total PollWork request failures by error kind (transport=no HTTP response; timeout=client deadline; 5xx/429/4xx by status). All five series present from process start so rate() works and absent() means process-down.
`;
  t += `# TYPE ${a}_poll_errors_total counter
`;
  for (let s of RUNNER_ERROR_CATEGORIES)
    t += `${a}_poll_errors_total{error_kind="${s}"} ${e.pollErrors[s]}
`;
  t += `# HELP ${a}_initializing_sessions Sessions currently in the init phase (handleSession entry to child system/init).
`;
  t += `# TYPE ${a}_initializing_sessions gauge
`;
  t += `${a}_initializing_sessions ${e.initializingSessions}
`;
  t += `# HELP ${a}_session_init_errors_total Sessions that exited as failed before the child reached init (checkout hook / git prep / token issue / pre-init child crash).
`;
  t += `# TYPE ${a}_session_init_errors_total counter
`;
  t += `${a}_session_init_errors_total ${e.sessionInitErrors}
`;
  t += `# HELP ${a}_session_init_duration_seconds Wall-clock seconds from session assignment to child init (successful inits only).
`;
  t += `# TYPE ${a}_session_init_duration_seconds histogram
`;
  let sessionInitDurations = e.sessionInitDurations;
  for (let idx = 0; idx < LATENCY_BUCKETS.length; idx++)
    t += `${a}_session_init_duration_seconds_bucket{le="${LATENCY_BUCKETS[idx]}"} ${sessionInitDurations.buckets[idx]}
`;
  t += `${a}_session_init_duration_seconds_bucket{le="+Inf"} ${sessionInitDurations.count}
`;
  t += `${a}_session_init_duration_seconds_sum ${sessionInitDurations.sum}
`;
  t += `${a}_session_init_duration_seconds_count ${sessionInitDurations.count}
`;
  t += `# HELP ${a}_session_start_hook_errors_total SessionStart hooks that reported an error outcome (nonzero exit, validation/spawn failure, or HTTP/MCP error; one per failing hook execution).
`;
  t += `# TYPE ${a}_session_start_hook_errors_total counter
`;
  t += `${a}_session_start_hook_errors_total ${e.sessionStartHookErrors}
`;
  t += `# HELP ${a}_session_idle_seconds Seconds since the session went idle (turn-end or awaiting-action); 0 while a turn is running, background work is pending, or the session is initializing. One series per active session; disappears at session end.
`;
  t += `# TYPE ${a}_session_idle_seconds gauge
`;
  for (let [s, c] of e.sessionIdle) {
    let l = c === null ? 0 : ((n - c) / 1000).toFixed(3);
    let b = e.sessionClientPlatform.get(s) ?? UNKNOWN;
    t += `${a}_session_idle_seconds{session_id="${escapeLabelValue(s)}",client_platform="${escapeLabelValue(b)}"} ${l}
`;
  }
  for (let [s, c] of e.childMetrics ?? []) {
    let replaced = c.help.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
    t += `# HELP ${s} ${replaced}
`;
    t += `# TYPE ${s} ${c.type}
`;
    for (let [b, w] of c.points)
      t += `${s}${b} ${w}
`;
  }
  return t;
}
//@ chunk-3nztfxrw.js:23942-25109 placement
function recordRunnerCounter(e, n) {
  let r = (e.childMetrics ??= new Map());
  let m = n;
  for (let a of m.resourceMetrics ?? []) {
    let t = xe(a.resource?.attributes, "session.id");
    let i = xe(a.resource?.attributes, "client.platform");
    for (let s of a.scopeMetrics ?? [])
      for (let c of s.metrics ?? []) {
        if (typeof c.name !== "string" || c.name === "") continue;
        let l = sanitizeMetricName(c.name);
        let b;
        let w;
        let S;
        if (c.sum) {
          b = c.sum.isMonotonic ? "counter" : "gauge";
          w = c.sum.isMonotonic && !l.endsWith("_total") ? `${l}_total` : l;
          S = c.sum.dataPoints;
        } else if (c.gauge) {
          b = "gauge";
          w = l;
          S = c.gauge.dataPoints;
        } else continue;
        if (w.startsWith(CLAUDE_CODE_SELF_HOSTED_RUNNER)) continue;
        let T = r.get(w) ?? {
          help: c.description ?? "",
          type: b,
          points: new Map(),
        };
        for (let N of S ?? []) {
          let D = [];
          let R = new Set();
          if (t !== undefined) {
            D.push(["session_id", t]);
            R.add("session_id");
          }
          if (i !== undefined) {
            D.push(["client_platform", i]);
            R.add("client_platform");
          }
          for (let K of N.attributes ?? []) {
            if (typeof K.key !== "string") continue;
            let X = Fe(K.value);
            if (X === undefined) continue;
            let V = sanitizeMetricName(K.key);
            if (V === "" || R.has(V)) continue;
            R.add(V);
            D.push([V, X]);
          }
          let A = D.length > 0 ? `{${D.map(([K, X]) => `${K}="${escapeLabelValue(X)}"`).join(",")}}` : "";
          let F =
            typeof N.asDouble === "number" ? N.asDouble : N.asInt !== undefined ? Number(N.asInt) : undefined;
          if (F === undefined || !Number.isFinite(F)) continue;
          T.points.set(A, F);
        }
        r.set(w, T);
      }
  }
}
//@ chunk-3nztfxrw.js:25109-25317 placement
/**
 * 从子进程指标中删除某个会话 id 的所有数据点，删空的指标一并移除。
 */
function dropSessionMetrics(healthState, n) {
  let childMetrics = healthState.childMetrics;
  if (childMetrics === undefined) return;
  let m = `session_id="${escapeLabelValue(n)}"`;
  for (let [a, t] of childMetrics) {
    for (let key of t.points.keys()) if (key.includes(m)) t.points.delete(key);
    if (t.points.size === 0) childMetrics.delete(a);
  }
}
//@ chunk-2cbdmxy9.js:19707-19765 placement
function newDurationHistogram() {
  return {
    buckets: BACKOFF_SCHEDULE.map(() => 0),
    count: 0,
    sum: 0,
  };
}
//@ chunk-2cbdmxy9.js:19765-19857 placement
function observeDuration(spawnHookDurations, t) {
  spawnHookDurations.sum += t;
  spawnHookDurations.count += 1;
  for (let j = 0; j < BACKOFF_SCHEDULE.length; j++)
    if (t <= BACKOFF_SCHEDULE[j]) spawnHookDurations.buckets[j]++;
}
//@ chunk-2cbdmxy9.js:19857-19917 placement
var SPAWN_SECONDS_BUCKETS = [0.5, 1, 2.5, 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
//@ chunk-2cbdmxy9.js:19917-19975 placement
function newSpawnHistogram() {
  return {
    buckets: SPAWN_SECONDS_BUCKETS.map(() => 0),
    count: 0,
    sum: 0,
  };
}
//@ chunk-2cbdmxy9.js:19975-20087 placement
function observeSpawnSeconds(sessionQueueWaits, t) {
  let max = Math.max(0, t);
  sessionQueueWaits.sum += max;
  sessionQueueWaits.count += 1;
  for (let j = 0; j < SPAWN_SECONDS_BUCKETS.length; j++)
    if (max <= SPAWN_SECONDS_BUCKETS[j]) sessionQueueWaits.buckets[j]++;
}
export {
  sanitizeMetricLabel,
  UNKNOWN,
  escapeMetricValue,
  escapeLabelValue,
  SPAWN_SECONDS_BUCKETS,
  observeSpawnSeconds,
  observeDuration,
  newDurationHistogram,
  newSpawnHistogram,
  recordRunnerCounter,
  renderRunnerMetrics,
  createHistogram,
  METRIC_NAME_RE,
  observeHistogram,
  dropSessionMetrics,
};
