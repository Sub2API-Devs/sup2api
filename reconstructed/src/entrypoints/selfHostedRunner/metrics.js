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
import { gvr } from "../../selfHostedRunner/runnerApiErrors.js";
import { xe, Fe } from "../../../vendor/@opentelemetry/otlp-transformer/build/esm/common/internal.js";
import { ne } from "./scmConnector.js";

//@ chunk-3nztfxrw.js:17958-18005 placement
var UNKNOWN = "unknown",
  Wuo = /^[A-Za-z0-9_.-]{1,64}$/;
/**
 * 校验指标标签值：为空、unknown、不合法字符、以 - 开头或为 ./.. 时返回 undefined。
 */
//@ chunk-3nztfxrw.js:18005-18112 placement
function sanitizeMetricLabel(e) {
  if (!e || e === "unknown" || !Wuo.test(e) || e.startsWith("-") || /^\.{1,2}$/.test(e)) return;
  return e;
}
/**
 * 转义指标标签值：保留字母数字与 _.-，其他字符转成 \\u{...}，最多 128 个字符。
 */
//@ chunk-3nztfxrw.js:18112-18248 placement
function escapeMetricValue(e) {
  return Array.from(e.slice(0, 128))
    .map((n) => (/[A-Za-z0-9_.-]/.test(n) ? n : `\\u{${n.codePointAt(0).toString(16)}}`))
    .join("");
}
//@ chunk-3nztfxrw.js:18248-18294 placement
var ce = [1, 2.5, 5, 10, 20, 40, 80, 160, 320, 640, 1280];
//@ chunk-3nztfxrw.js:18294-18353 placement
function xks() {
  return { buckets: ce.map(() => 0), count: 0, sum: 0 };
}
//@ chunk-3nztfxrw.js:18353-18446 placement
function Pks(e, n) {
  ((e.sum += n), (e.count += 1));
  for (let r = 0; r < ce.length; r++) if (n <= ce[r]) e.buckets[r]++;
}
//@ chunk-3nztfxrw.js:18446-18535 placement
function Yde(e) {
  return e.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
}
//@ chunk-3nztfxrw.js:18535-18613 placement
function He(e) {
  return e.replace(/[^a-zA-Z0-9_]/g, "_").replace(/^[0-9]/, "_$&");
}
//@ chunk-3nztfxrw.js:18613-18653 placement
var CLAUDE_CODE_SELF_HOSTED_RUNNER = "claude_code_self_hosted_runner";
/**
 * 以 Prometheus 文本格式输出自托管 runner 指标（runner_id、version、client_label）
 */
//@ chunk-3nztfxrw.js:18653-23942 placement
function renderRunnerMetrics(e, n = Date.now()) {
  let r = e.lastPollAt > 0 ? (n - e.lastPollAt) / 1000 : 0,
    m = `runner_id="${Yde(e.runnerId)}",version="${Yde(e.version)}",client_label="${Yde(e.clientLabel)}"`,
    a = CLAUDE_CODE_SELF_HOSTED_RUNNER,
    t = "";
  ((t += `# HELP ${a}_info Self-hosted runner identity (info-style gauge; value is always 1).
`),
    (t += `# TYPE ${a}_info gauge
`),
    (t += `${a}_info{${m}} 1
`),
    (t += `# HELP ${a}_capacity Max concurrent sessions this runner accepts (--capacity).
`),
    (t += `# TYPE ${a}_capacity gauge
`),
    (t += `${a}_capacity ${e.capacity}
`),
    (t += `# HELP ${a}_active_sessions Sessions currently being handled by this runner.
`),
    (t += `# TYPE ${a}_active_sessions gauge
`),
    (t += `${a}_active_sessions ${e.activeSessions}
`));
  for (let [s, c] of [
    ["sessions_started_total", e.sessionsStarted],
    ["sessions_completed_total", e.sessionsCompleted],
    ["sessions_failed_total", e.sessionsFailed],
    ["sessions_interrupted_total", e.sessionsInterrupted],
  ]) {
    ((t += `# HELP ${a}_${s} ${s === "sessions_started_total" ? "Session child processes spawned over the runner's lifetime. One increment per child spawn; a session that is re-spawned (runner restart, re-assignment) counts again. NOT comparable to the orchestrator's spawn_hooks_total (which counts orchestrator spawn-runner hook runs, including warm hints)." : s === "sessions_completed_total" ? "Session child processes that ended cleanly over the runner's lifetime: child exited 0, the server closed the session (archive/delete), or the runner released the slot as a clean handoff (idle release, startup timeout, retire / max-session-age release, server deassign). Drain/SIGTERM and the max-lifetime hard-cap kill are NOT counted (those increment sessions_interrupted_total instead)." : s === "sessions_failed_total" ? "Session child processes that exited with a non-zero code over the runner's lifetime (crash, OOM, spawn error). Does NOT include idle-release or a server deassign the poll loop observed first (those count as completed); a deassign the child notices first via its epoch-409 exit still lands here." : "Session child processes that were terminated for a non-session-outcome reason over its lifetime (drain/SIGTERM, max-lifetime hard-cap kill, released=false backstop, or an external signal). Watchdog and external-signal kills are additionally reported to the server as session failures. Closes the accounting: started - (completed + failed + interrupted) equals the number of session children currently running."}
`),
      (t += `# TYPE ${a}_${s} counter
`));
    for (let [b, w] of c)
      t += `${a}_${s}{client_platform="${Yde(b)}"} ${w}
`;
  }
  if (
    ((t += `# HELP ${a}_locked_account Present (value 1) once the runner is locked to an account; absent while fungible.
`),
    (t += `# TYPE ${a}_locked_account gauge
`),
    e.lockedAccountEmail !== null)
  )
    t += `${a}_locked_account{email="${Yde(e.lockedAccountEmail)}"} 1
`;
  ((t += `# HELP ${a}_last_poll_age_seconds Seconds since the last successful pollWork return.
`),
    (t += `# TYPE ${a}_last_poll_age_seconds gauge
`),
    (t += `${a}_last_poll_age_seconds ${r}
`),
    (t += `# HELP ${a}_poll_errors_total PollWork request failures by error kind (transport=no HTTP response; timeout=client deadline; 5xx/429/4xx by status). All five series present from process start so rate() works and absent() means process-down.
`),
    (t += `# TYPE ${a}_poll_errors_total counter
`));
  for (let s of gvr)
    t += `${a}_poll_errors_total{error_kind="${s}"} ${e.pollErrors[s]}
`;
  ((t += `# HELP ${a}_initializing_sessions Sessions currently in the init phase (handleSession entry to child system/init).
`),
    (t += `# TYPE ${a}_initializing_sessions gauge
`),
    (t += `${a}_initializing_sessions ${e.initializingSessions}
`),
    (t += `# HELP ${a}_session_init_errors_total Sessions that exited as failed before the child reached init (checkout hook / git prep / token issue / pre-init child crash).
`),
    (t += `# TYPE ${a}_session_init_errors_total counter
`),
    (t += `${a}_session_init_errors_total ${e.sessionInitErrors}
`),
    (t += `# HELP ${a}_session_init_duration_seconds Wall-clock seconds from session assignment to child init (successful inits only).
`),
    (t += `# TYPE ${a}_session_init_duration_seconds histogram
`));
  let sessionInitDurations = e.sessionInitDurations;
  for (let s = 0; s < ce.length; s++)
    t += `${a}_session_init_duration_seconds_bucket{le="${ce[s]}"} ${sessionInitDurations.buckets[s]}
`;
  ((t += `${a}_session_init_duration_seconds_bucket{le="+Inf"} ${sessionInitDurations.count}
`),
    (t += `${a}_session_init_duration_seconds_sum ${sessionInitDurations.sum}
`),
    (t += `${a}_session_init_duration_seconds_count ${sessionInitDurations.count}
`),
    (t += `# HELP ${a}_session_start_hook_errors_total SessionStart hooks that reported an error outcome (nonzero exit, validation/spawn failure, or HTTP/MCP error; one per failing hook execution).
`),
    (t += `# TYPE ${a}_session_start_hook_errors_total counter
`),
    (t += `${a}_session_start_hook_errors_total ${e.sessionStartHookErrors}
`),
    (t += `# HELP ${a}_session_idle_seconds Seconds since the session went idle (turn-end or awaiting-action); 0 while a turn is running, background work is pending, or the session is initializing. One series per active session; disappears at session end.
`),
    (t += `# TYPE ${a}_session_idle_seconds gauge
`));
  for (let [s, c] of e.sessionIdle) {
    let l = c === null ? 0 : ((n - c) / 1000).toFixed(3),
      b = e.sessionClientPlatform.get(s) ?? UNKNOWN;
    t += `${a}_session_idle_seconds{session_id="${Yde(s)}",client_platform="${Yde(b)}"} ${l}
`;
  }
  for (let [s, c] of e.childMetrics ?? []) {
    let replaced = c.help.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");
    ((t += `# HELP ${s} ${replaced}
`),
      (t += `# TYPE ${s} ${c.type}
`));
    for (let [b, w] of c.points)
      t += `${s}${b} ${w}
`;
  }
  return t;
}
//@ chunk-3nztfxrw.js:23942-25109 placement
function recordRunnerCounter(e, n) {
  let r = (e.childMetrics ??= new Map()),
    m = n;
  for (let a of m.resourceMetrics ?? []) {
    let t = xe(a.resource?.attributes, "session.id"),
      i = xe(a.resource?.attributes, "client.platform");
    for (let s of a.scopeMetrics ?? [])
      for (let c of s.metrics ?? []) {
        if (typeof c.name !== "string" || c.name === "") continue;
        let l = He(c.name),
          b,
          w,
          S;
        if (c.sum)
          ((b = c.sum.isMonotonic ? "counter" : "gauge"),
            (w = c.sum.isMonotonic && !l.endsWith("_total") ? `${l}_total` : l),
            (S = c.sum.dataPoints));
        else if (c.gauge) ((b = "gauge"), (w = l), (S = c.gauge.dataPoints));
        else continue;
        if (w.startsWith(CLAUDE_CODE_SELF_HOSTED_RUNNER)) continue;
        let T = r.get(w) ?? { help: c.description ?? "", type: b, points: new Map() };
        for (let N of S ?? []) {
          let D = [],
            R = new Set();
          if (t !== void 0) (D.push(["session_id", t]), R.add("session_id"));
          if (i !== void 0) (D.push(["client_platform", i]), R.add("client_platform"));
          for (let K of N.attributes ?? []) {
            if (typeof K.key !== "string") continue;
            let X = Fe(K.value);
            if (X === void 0) continue;
            let V = He(K.key);
            if (V === "" || R.has(V)) continue;
            (R.add(V), D.push([V, X]));
          }
          let A = D.length > 0 ? `{${D.map(([K, X]) => `${K}="${Yde(X)}"`).join(",")}}` : "",
            F = typeof N.asDouble === "number" ? N.asDouble : N.asInt !== void 0 ? Number(N.asInt) : void 0;
          if (F === void 0 || !Number.isFinite(F)) continue;
          T.points.set(A, F);
        }
        r.set(w, T);
      }
  }
}
/**
 * 从子进程指标中删除某个会话 id 的所有数据点，删空的指标一并移除。
 */
//@ chunk-3nztfxrw.js:25109-25317 placement
function dropSessionMetrics(e, n) {
  let childMetrics = e.childMetrics;
  if (childMetrics === void 0) return;
  let m = `session_id="${Yde(n)}"`;
  for (let [a, t] of childMetrics) {
    for (let i of t.points.keys()) if (i.includes(m)) t.points.delete(i);
    if (t.points.size === 0) childMetrics.delete(a);
  }
}
//@ chunk-2cbdmxy9.js:19707-19765 placement
function newDurationHistogram() {
  return { buckets: ne.map(() => 0), count: 0, sum: 0 };
}
//@ chunk-2cbdmxy9.js:19765-19857 placement
function observeDuration(e, t) {
  ((e.sum += t), (e.count += 1));
  for (let r = 0; r < ne.length; r++) if (t <= ne[r]) e.buckets[r]++;
}
//@ chunk-2cbdmxy9.js:19857-19917 placement
var SPAWN_SECONDS_BUCKETS = [0.5, 1, 2.5, 5, 10, 20, 40, 80, 160, 320, 640, 1280, 2560, 5120];
//@ chunk-2cbdmxy9.js:19917-19975 placement
function newSpawnHistogram() {
  return { buckets: SPAWN_SECONDS_BUCKETS.map(() => 0), count: 0, sum: 0 };
}
//@ chunk-2cbdmxy9.js:19975-20087 placement
function observeSpawnSeconds(e, t) {
  let max = Math.max(0, t);
  ((e.sum += max), (e.count += 1));
  for (let n = 0; n < SPAWN_SECONDS_BUCKETS.length; n++) if (max <= SPAWN_SECONDS_BUCKETS[n]) e.buckets[n]++;
}

export {
  sanitizeMetricLabel,
  UNKNOWN,
  escapeMetricValue,
  Yde,
  SPAWN_SECONDS_BUCKETS,
  observeSpawnSeconds,
  observeDuration,
  newDurationHistogram,
  newSpawnHistogram,
  recordRunnerCounter,
  renderRunnerMetrics,
  xks,
  Wuo,
  Pks,
  dropSessionMetrics,
};
