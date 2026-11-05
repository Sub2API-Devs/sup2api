/**
 * entrypoints/selfHostedRunner/metrics.ts
 *
 * 2.1.316 新增：自托管 runner 的耗时直方图指标
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-a3r2kq46.js (12), chunk-h7hgs1mf.js (5)
 * attribution: placement 17
 */
import { RUNNER_ERROR_CATEGORIES } from "../../selfHostedRunner/runnerApiErrors.js";
import {
  findAttributeValue,
  attributeValueToString,
} from "../../../vendor/@opentelemetry/otlp-transformer/build/esm/common/internal.js";
import { BACKOFF_SCHEDULE } from "./scmConnector.js";

//@ chunk-a3r2kq46.js:18032-18079 placement
/**
 * 导出值：METRIC_NAME_RE（指标名字符集）。
 */
var UNKNOWN = "unknown";
var METRIC_NAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;
//@ chunk-a3r2kq46.js:18079-18186 placement
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
//@ chunk-a3r2kq46.js:18186-18322 placement
/**
 * 转义指标标签值：保留字母数字与 _.-，其他字符转成 \\u{...}，最多 128 个字符。
 */
function escapeMetricValue(value) {
  return Array.from(value.slice(0, 128))
    .map((part) => (/[A-Za-z0-9_.-]/.test(part) ? part : `\\u{${part.codePointAt(0).toString(16)}}`))
    .join("");
}
//@ chunk-a3r2kq46.js:18322-18368 placement
var LATENCY_BUCKETS = [1, 2.5, 5, 10, 20, 40, 80, 160, 320, 640, 1280];
//@ chunk-a3r2kq46.js:18368-18427 placement
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
//@ chunk-a3r2kq46.js:18427-18520 placement
/**
 * 函数 observeHistogram（记录一次观测）。
 */
function observeHistogram(sessionInitDurations, durationSec) {
  sessionInitDurations.sum += durationSec;
  sessionInitDurations.count += 1;
  for (let i = 0; i < LATENCY_BUCKETS.length; i++)
    if (durationSec <= LATENCY_BUCKETS[i]) sessionInitDurations.buckets[i]++;
}
//@ chunk-a3r2kq46.js:18520-18609 placement
/**
 * 函数 escapeLabelValue（转义标签值）。
 */
function escapeLabelValue(value) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
//@ chunk-a3r2kq46.js:18609-18687 placement
function sanitizeMetricName(name) {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");
}
//@ chunk-a3r2kq46.js:18687-18727 placement
var CLAUDE_CODE_SELF_HOSTED_RUNNER = "claude_code_self_hosted_runner";
//@ chunk-a3r2kq46.js:18727-24596 placement
/**
 * 以 Prometheus 文本格式输出自托管 runner 指标（runner_id、version、client_label）
 */
function renderRunnerMetrics(state, now = Date.now()) {
  let pollAgeSec = state.lastPollAt > 0 ? (now - state.lastPollAt) / 1000 : 0;
  let labels = `runner_id="${escapeLabelValue(state.runnerId)}",version="${escapeLabelValue(state.version)}",client_label="${escapeLabelValue(state.clientLabel)}"`;
  let prefix = CLAUDE_CODE_SELF_HOSTED_RUNNER;
  let out = "";
  out += `# HELP ${prefix}_info Self-hosted runner identity (info-style gauge; value is always 1).
`;
  out += `# TYPE ${prefix}_info gauge
`;
  out += `${prefix}_info{${labels}} 1
`;
  out += `# HELP ${prefix}_capacity Max concurrent sessions this runner accepts (--capacity).
`;
  out += `# TYPE ${prefix}_capacity gauge
`;
  out += `${prefix}_capacity ${state.capacity}
`;
  out += `# HELP ${prefix}_active_sessions Sessions currently being handled by this runner.
`;
  out += `# TYPE ${prefix}_active_sessions gauge
`;
  out += `${prefix}_active_sessions ${state.activeSessions}
`;
  for (let [category, values] of [
    ["sessions_started_total", state.sessionsStarted],
    ["sessions_completed_total", state.sessionsCompleted],
    ["sessions_failed_total", state.sessionsFailed],
    ["sessions_interrupted_total", state.sessionsInterrupted],
  ]) {
    out += `# HELP ${prefix}_${category} ${category === "sessions_started_total" ? "Session child processes spawned over the runner's lifetime. One increment per child spawn; a session that is re-spawned (runner restart, re-assignment) counts again. NOT comparable to the orchestrator's spawn_hooks_total (which counts orchestrator spawn-runner hook runs, including warm hints)." : category === "sessions_completed_total" ? "Session child processes that ended cleanly over the runner's lifetime: child exited 0, the server closed the session (archive/delete), or the runner released the slot as a clean handoff (idle release, startup timeout, retire / max-session-age release, server deassign). Drain/SIGTERM and the max-lifetime hard-cap kill are NOT counted (those increment sessions_interrupted_total instead)." : category === "sessions_failed_total" ? "Session child processes that exited with a non-zero code over the runner's lifetime (crash, OOM, spawn error). Does NOT include idle-release or a server deassign the poll loop observed first (those count as completed); a deassign the child notices first via its epoch-409 exit still lands here." : "Session child processes that were terminated for a non-session-outcome reason over its lifetime (drain/SIGTERM, max-lifetime hard-cap kill, released=false backstop, or an external signal). Watchdog and external-signal kills are additionally reported to the server as session failures. Closes the accounting: started - (completed + failed + interrupted) equals the number of session children currently running."}
`;
    out += `# TYPE ${prefix}_${category} counter
`;
    for (let [bucket, count] of values)
      out += `${prefix}_${category}{client_platform="${escapeLabelValue(bucket)}"} ${count}
`;
  }
  out += `# HELP ${prefix}_locked_account Present (value 1) once the runner is locked to an account; absent while fungible.
`;
  out += `# TYPE ${prefix}_locked_account gauge
`;
  if (state.lockedAccountEmail !== null)
    out += `${prefix}_locked_account{email="${escapeLabelValue(state.lockedAccountEmail)}"} 1
`;
  out += `# HELP ${prefix}_last_poll_age_seconds Seconds since the last successful pollWork return.
`;
  out += `# TYPE ${prefix}_last_poll_age_seconds gauge
`;
  out += `${prefix}_last_poll_age_seconds ${pollAgeSec}
`;
  out += `# HELP ${prefix}_poll_errors_total PollWork request failures by error kind (transport=no HTTP response; timeout=client deadline; 5xx/429/4xx by status). All five series present from process start so rate() works and absent() means process-down.
`;
  out += `# TYPE ${prefix}_poll_errors_total counter
`;
  for (let category of RUNNER_ERROR_CATEGORIES)
    out += `${prefix}_poll_errors_total{error_kind="${category}"} ${state.pollErrors[category]}
`;
  out += `# HELP ${prefix}_initializing_sessions Sessions currently in the init phase (handleSession entry to child system/init).
`;
  out += `# TYPE ${prefix}_initializing_sessions gauge
`;
  out += `${prefix}_initializing_sessions ${state.initializingSessions}
`;
  out += `# HELP ${prefix}_session_init_errors_total Sessions that exited as failed before the child reached init (checkout hook / git prep / token issue / pre-init child crash).
`;
  out += `# TYPE ${prefix}_session_init_errors_total counter
`;
  out += `${prefix}_session_init_errors_total ${state.sessionInitErrors}
`;
  out += `# HELP ${prefix}_session_init_duration_seconds Wall-clock seconds from session assignment to child init (successful inits only).
`;
  out += `# TYPE ${prefix}_session_init_duration_seconds histogram
`;
  let sessionInitDurations = state.sessionInitDurations;
  for (let idx = 0; idx < LATENCY_BUCKETS.length; idx++)
    out += `${prefix}_session_init_duration_seconds_bucket{le="${LATENCY_BUCKETS[idx]}"} ${sessionInitDurations.buckets[idx]}
`;
  out += `${prefix}_session_init_duration_seconds_bucket{le="+Inf"} ${sessionInitDurations.count}
`;
  out += `${prefix}_session_init_duration_seconds_sum ${sessionInitDurations.sum}
`;
  out += `${prefix}_session_init_duration_seconds_count ${sessionInitDurations.count}
`;
  out += `# HELP ${prefix}_session_start_hook_errors_total SessionStart hooks that reported an error outcome (nonzero exit, validation/spawn failure, or HTTP/MCP error; one per failing hook execution).
`;
  out += `# TYPE ${prefix}_session_start_hook_errors_total counter
`;
  out += `${prefix}_session_start_hook_errors_total ${state.sessionStartHookErrors}
`;
  out += `# HELP ${prefix}_session_idle_seconds Seconds since the session went idle (turn-end or awaiting-action); 0 while a turn is running, background work is pending, or the session is initializing. One series per active session; disappears at session end.
`;
  out += `# TYPE ${prefix}_session_idle_seconds gauge
`;
  for (let [sessionId, idleSince] of state.sessionIdle) {
    let idleSeconds = idleSince === null ? 0 : ((now - idleSince) / 1000).toFixed(3);
    let platform = state.sessionClientPlatform.get(sessionId) ?? UNKNOWN;
    out += `${prefix}_session_idle_seconds{session_id="${escapeLabelValue(sessionId)}",client_platform="${escapeLabelValue(platform)}"} ${idleSeconds}
`;
  }
  out += `# HELP ${prefix}_session_turn_state The turn state the server reports for a session whose tools this runner hosts, in the state label; the value is always 1. busy: a worker holds the session. waiting: a question is waiting for the user. rest: no worker, and the last one reported idle. lost: no worker, and the last one did not report idle, or none has started.
`;
  out += `# TYPE ${prefix}_session_turn_state gauge
`;
  for (let [sessionId, turnState] of state.sessionTurnState) {
    let platform = state.sessionClientPlatform.get(sessionId) ?? UNKNOWN;
    out += `${prefix}_session_turn_state{session_id="${escapeLabelValue(sessionId)}",client_platform="${escapeLabelValue(platform)}",state="${turnState}"} 1
`;
  }
  for (let [childId, histogram] of state.childMetrics ?? []) {
    let replaced = histogram.help.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
    out += `# HELP ${childId} ${replaced}
`;
    out += `# TYPE ${childId} ${histogram.type}
`;
    for (let [bucket, count] of histogram.points)
      out += `${childId}${bucket} ${count}
`;
  }
  return out;
}
//@ chunk-a3r2kq46.js:24596-25763 placement
function recordRunnerCounter(state, payload) {
  let childMetrics = (state.childMetrics ??= new Map());
  let metrics = payload;
  for (let resourceMetric of metrics.resourceMetrics ?? []) {
    let sessionId = findAttributeValue(resourceMetric.resource?.attributes, "session.id");
    let clientPlatform = findAttributeValue(resourceMetric.resource?.attributes, "client.platform");
    for (let scopeMetric of resourceMetric.scopeMetrics ?? [])
      for (let metric of scopeMetric.metrics ?? []) {
        if (typeof metric.name !== "string" || metric.name === "") continue;
        let metricName = sanitizeMetricName(metric.name);
        let childKey;
        let histogram;
        let points;
        if (metric.sum) {
          childKey = metric.sum.isMonotonic ? "counter" : "gauge";
          histogram =
            metric.sum.isMonotonic && !metricName.endsWith("_total") ? `${metricName}_total` : metricName;
          points = metric.sum.dataPoints;
        } else if (metric.gauge) {
          childKey = "gauge";
          histogram = metricName;
          points = metric.gauge.dataPoints;
        } else continue;
        if (histogram.startsWith(CLAUDE_CODE_SELF_HOSTED_RUNNER)) continue;
        let histogram_2 = childMetrics.get(histogram) ?? {
          help: metric.description ?? "",
          type: childKey,
          points: new Map(),
        };
        for (let point of points ?? []) {
          let labelPairs = [];
          let seenKeys = new Set();
          if (sessionId !== undefined) {
            labelPairs.push(["session_id", sessionId]);
            seenKeys.add("session_id");
          }
          if (clientPlatform !== undefined) {
            labelPairs.push(["client_platform", clientPlatform]);
            seenKeys.add("client_platform");
          }
          for (let attribute of point.attributes ?? []) {
            if (typeof attribute.key !== "string") continue;
            let labelValue = attributeValueToString(attribute.value);
            if (labelValue === undefined) continue;
            let labelName = sanitizeMetricName(attribute.key);
            if (labelName === "" || seenKeys.has(labelName)) continue;
            seenKeys.add(labelName);
            labelPairs.push([labelName, labelValue]);
          }
          let suffix =
            labelPairs.length > 0
              ? `{${labelPairs.map(([name, value]) => `${name}="${escapeLabelValue(value)}"`).join(",")}}`
              : "";
          let line =
            typeof point.asDouble === "number"
              ? point.asDouble
              : point.asInt !== undefined
                ? Number(point.asInt)
                : undefined;
          if (line === undefined || !Number.isFinite(line)) continue;
          histogram_2.points.set(suffix, line);
        }
        childMetrics.set(histogram, histogram_2);
      }
  }
}
//@ chunk-a3r2kq46.js:25763-25971 placement
/**
 * 从子进程指标中删除某个会话 id 的所有数据点，删空的指标一并移除。
 */
function dropSessionMetrics(healthState, sessionId) {
  let childMetrics = healthState.childMetrics;
  if (childMetrics === undefined) return;
  let label = `session_id="${escapeLabelValue(sessionId)}"`;
  for (let [childKey, entry] of childMetrics) {
    for (let key of entry.points.keys()) if (key.includes(label)) entry.points.delete(key);
    if (entry.points.size === 0) childMetrics.delete(childKey);
  }
}
//@ chunk-h7hgs1mf.js:20537-20595 placement
function newDurationHistogram() {
  return {
    buckets: BACKOFF_SCHEDULE.map(() => 0),
    count: 0,
    sum: 0,
  };
}
//@ chunk-h7hgs1mf.js:20595-20687 placement
function observeDuration(spawnHookDurations, durationMs) {
  spawnHookDurations.sum += durationMs;
  spawnHookDurations.count += 1;
  for (let j = 0; j < BACKOFF_SCHEDULE.length; j++)
    if (durationMs <= BACKOFF_SCHEDULE[j]) spawnHookDurations.buckets[j]++;
}
//@ chunk-h7hgs1mf.js:20687-20747 placement
var SPAWN_SECONDS_BUCKETS = [0.5, 1, 2.5, 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
//@ chunk-h7hgs1mf.js:20747-20805 placement
function newSpawnHistogram() {
  return {
    buckets: SPAWN_SECONDS_BUCKETS.map(() => 0),
    count: 0,
    sum: 0,
  };
}
//@ chunk-h7hgs1mf.js:20805-20917 placement
function observeSpawnSeconds(sessionQueueWaits, seconds) {
  let max = Math.max(0, seconds);
  sessionQueueWaits.sum += max;
  sessionQueueWaits.count += 1;
  for (let j = 0; j < SPAWN_SECONDS_BUCKETS.length; j++)
    if (max <= SPAWN_SECONDS_BUCKETS[j]) sessionQueueWaits.buckets[j]++;
}
export {
  recordRunnerCounter,
  renderRunnerMetrics,
  sanitizeMetricLabel,
  UNKNOWN,
  createHistogram,
  METRIC_NAME_RE,
  escapeMetricValue,
  observeHistogram,
  dropSessionMetrics,
  escapeLabelValue,
  SPAWN_SECONDS_BUCKETS,
  observeSpawnSeconds,
  observeDuration,
  newDurationHistogram,
  newSpawnHistogram,
};
