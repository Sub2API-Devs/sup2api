/**
 * utils/ultraplan/ccrSession.ts
 *
 * ultraplan：轮询云会话事件，跟踪 ExitPlanMode 调用与结果，判定计划批准/拒绝/传送回本地/终止
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/ultraplan/ccrSession.ts
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: affinity 1, fingerprint 5, callgraph-witnessed 2
 */
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { pollRemoteSessionEvents, isTransientNetworkError } from "../teleport/api.js";
import { sleep } from "../sleep.js";
import { logForDebugging } from "../debug.js";

//@ chunk-e6aww6q8.js:2010166-2010185 affinity
var POLL_INTERVAL_MS = 3000,
  MAX_CONSECUTIVE_FAILURES = 5;
//@ chunk-e6aww6q8.js:2010185-2010355 fingerprint = UltraplanPollError (0.667)
class UltraplanPollError extends Error {
  reason;
  rejectCount;
  eventStats;
  constructor(e, n, r, s, h) {
    super(e, h);
    this.reason = n;
    this.rejectCount = r;
    this.eventStats = s;
    this.name = "UltraplanPollError";
  }
}
//@ chunk-e6aww6q8.js:2010355-2010394 fingerprint = ULTRAPLAN_TELEPORT_SENTINEL (1)
var ULTRAPLAN_TELEPORT_SENTINEL = "__ULTRAPLAN_TELEPORT_LOCAL__";
/**
 * 扫描远程事件：记录 ExitPlanMode 调用及其 tool_result，判定最新一次为 pending / approved（含计划）/ teleport（回本地执行）/ rejected / terminated。
 */
//@ chunk-e6aww6q8.js:2010394-2011874 fingerprint = ExitPlanModeScanner (1)
class ExitPlanModeScanner {
  exitPlanCalls = [];
  results = new Map();
  rejectedIds = new Set();
  terminated = null;
  rescanAfterRejection = !1;
  everSeenPending = !1;
  get rejectCount() {
    return this.rejectedIds.size;
  }
  get hasPendingPlan() {
    let last = this.exitPlanCalls.findLast((n) => !this.rejectedIds.has(n));
    return last !== void 0 && !this.results.has(last);
  }
  ingest(e) {
    for (let s of e)
      if (s.type === "assistant")
        for (let h of s.message.content) {
          if (h.type !== "tool_use") continue;
          let y = h;
          if (y.name === EXITPLANMODE_2) this.exitPlanCalls.push(y.id);
        }
      else if (s.type === "user") {
        let content = s.message.content;
        if (!Array.isArray(content)) continue;
        for (let y of content)
          if (y.type === "tool_result" && this.exitPlanCalls.includes(y.tool_use_id))
            this.results.set(y.tool_use_id, y);
      } else if (s.type === "result" && s.subtype !== "success") this.terminated = { subtype: s.subtype };
    let n = e.length > 0 || this.rescanAfterRejection;
    this.rescanAfterRejection = !1;
    let r = null;
    if (n) {
      for (let s = this.exitPlanCalls.length - 1; s >= 0; s--) {
        let h = this.exitPlanCalls[s];
        if (this.rejectedIds.has(h)) continue;
        let y = this.results.get(h);
        if (!y) r = { kind: "pending" };
        else if (y.is_error === !0) {
          let S = extractTeleportPlan(y.content);
          r = S !== null ? { kind: "teleport", plan: S } : { kind: "rejected", id: h };
        } else r = { kind: "approved", plan: extractApprovedPlan(y.content) };
        break;
      }
      if (r?.kind === "approved" || r?.kind === "teleport") return r;
    }
    if (r?.kind === "rejected") (this.rejectedIds.add(r.id), (this.rescanAfterRejection = !0));
    if (this.terminated) return { kind: "terminated", subtype: this.terminated.subtype };
    if (r?.kind === "rejected") return r;
    if (r?.kind === "pending") return ((this.everSeenPending = !0), r);
    return { kind: "unchanged" };
  }
}
/**
 * 每 3 秒轮询云会话事件直到批准或超时：approved → executionTarget=remote，teleport → local；网络错误连续 5 次放弃；阶段变化（running/needs_input/plan_ready）回调通知。
 */
//@ chunk-e6aww6q8.js:2011874-2013559 fingerprint = pollForApprovedExitPlanMode (0.86)
async function pollForApprovedExitPlanMode(sessionId, timeoutMs, onPhaseChange, shouldStop, credentials) {
  let deadline = Date.now() + timeoutMs,
    scanner = new ExitPlanModeScanner(),
    w = { eventsReceived: 0, firstEventAt: void 0, lastEventAt: void 0 },
    cursor = null,
    failures = 0,
    lastPhase = "running";
  while (Date.now() < deadline) {
    if (shouldStop()) throw Error("poll stopped by caller");
    let ke, we;
    try {
      let Me = await pollRemoteSessionEvents(sessionId, cursor, { credentials: credentials });
      if (
        ((ke = Me.newEvents),
        (cursor = Me.lastEventId),
        (we = Me.sessionStatus),
        (failures = 0),
        ke.length > 0)
      ) {
        let now = Date.now();
        ((w.eventsReceived += ke.length), (w.firstEventAt ??= now), (w.lastEventAt = now));
      }
    } catch (error) {
      if (!isTransientNetworkError(error))
        throw new UltraplanPollError(
          error instanceof Error ? error.message : String(error),
          "network_or_unknown",
          scanner.rejectCount,
          w,
          { cause: error },
        );
      if (++failures >= MAX_CONSECUTIVE_FAILURES)
        throw new UltraplanPollError(
          "Lost connection to the cloud session after repeated retries \u2014 the session may still be running",
          "network_or_unknown",
          scanner.rejectCount,
          w,
          { cause: error },
        );
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    let Ee;
    try {
      Ee = scanner.ingest(ke);
    } catch (error) {
      throw new UltraplanPollError(
        error instanceof Error ? error.message : String(error),
        "extract_marker_missing",
        scanner.rejectCount,
        w,
      );
    }
    if (Ee.kind === "approved")
      return { plan: Ee.plan, rejectCount: scanner.rejectCount, executionTarget: "remote" };
    if (Ee.kind === "teleport")
      return { plan: Ee.plan, rejectCount: scanner.rejectCount, executionTarget: "local" };
    if (Ee.kind === "terminated")
      throw new UltraplanPollError(
        `cloud session ended (${Ee.subtype}) before plan approval`,
        "terminated",
        scanner.rejectCount,
        w,
      );
    let quietIdle = (we === "idle" || we === "requires_action") && ke.length === 0,
      Ie = scanner.hasPendingPlan ? "plan_ready" : quietIdle ? "needs_input" : "running";
    if (Ie !== lastPhase)
      (logForDebugging(`[ultraplan] phase ${lastPhase} \u2192 ${Ie}`), (lastPhase = Ie), onPhaseChange(Ie));
    await sleep(POLL_INTERVAL_MS);
  }
  let rounded = Math.round(timeoutMs / 60000),
    Se = rounded === 1 ? "minute" : "minutes";
  throw new UltraplanPollError(
    scanner.everSeenPending
      ? `no approval after ${rounded} ${Se}`
      : `ExitPlanMode never reached after ${rounded} ${Se} (the remote container failed to start, or session ID mismatch?)`,
    scanner.everSeenPending ? "timeout_pending" : "timeout_no_plan",
    scanner.rejectCount,
    w,
  );
}
//@ chunk-e6aww6q8.js:2013559-2013668 callgraph-witnessed = contentToText (0)
function contentToText(content) {
  return typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((n) => ("text" in n ? n.text : "")).join("")
      : "";
}
//@ chunk-e6aww6q8.js:2013668-2013783 callgraph-witnessed = extractTeleportPlan (1)
function extractTeleportPlan(content) {
  let text = contentToText(content),
    marker = `${ULTRAPLAN_TELEPORT_SENTINEL}
`,
    idx = text.indexOf(marker);
  if (idx === -1) return null;
  return text.slice(idx + marker.length).trimEnd();
}
//@ chunk-e6aww6q8.js:2013783-2014140 fingerprint = extractApprovedPlan (0.565)
function extractApprovedPlan(content) {
  let text = contentToText(content),
    markers = [
      `## Approved Plan (edited by user):
`,
      `## Approved Plan:
`,
    ];
  for (let marker of markers) {
    let idx = text.indexOf(marker);
    if (idx !== -1) return text.slice(idx + marker.length).trimEnd();
  }
  throw Error(
    `ExitPlanMode approved but tool_result has no "## Approved Plan:" marker \u2014 remote may have hit the empty-plan or isAgent branch. Content preview: ${text.slice(0, 200)}`,
  );
}

export { pollForApprovedExitPlanMode, UltraplanPollError };
