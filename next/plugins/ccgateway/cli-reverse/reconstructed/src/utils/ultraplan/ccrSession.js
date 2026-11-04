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
var POLL_INTERVAL_MS = 3000;
var MAX_CONSECUTIVE_FAILURES = 5;
//@ chunk-e6aww6q8.js:2010185-2010355 fingerprint (2.1.88 match: UltraplanPollError, 0.667)
class UltraplanPollError extends Error {
  reason;
  rejectCount;
  eventStats;
  constructor(message, reason, rejectCount, eventStats, options) {
    super(message, options);
    this.reason = reason;
    this.rejectCount = rejectCount;
    this.eventStats = eventStats;
    this.name = "UltraplanPollError";
  }
}
//@ chunk-e6aww6q8.js:2010355-2010394 fingerprint (2.1.88 match: ULTRAPLAN_TELEPORT_SENTINEL, 1)
var ULTRAPLAN_TELEPORT_SENTINEL = "__ULTRAPLAN_TELEPORT_LOCAL__";
//@ chunk-e6aww6q8.js:2010394-2011874 fingerprint (2.1.88 match: ExitPlanModeScanner, 1)
/**
 * 扫描远程事件：记录 ExitPlanMode 调用及其 tool_result，判定最新一次为 pending / approved（含计划）/ teleport（回本地执行）/ rejected / terminated。
 */
class ExitPlanModeScanner {
  exitPlanCalls = [];
  results = new Map();
  rejectedIds = new Set();
  terminated = null;
  rescanAfterRejection = false;
  everSeenPending = false;
  get rejectCount() {
    return this.rejectedIds.size;
  }
  get hasPendingPlan() {
    let id = this.exitPlanCalls.findLast((exitPlanCall) => !this.rejectedIds.has(exitPlanCall));
    return id !== undefined && !this.results.has(id);
  }
  ingest(newEvents) {
    for (let m of newEvents)
      if (m.type === "assistant")
        for (let block of m.message.content) {
          if (block.type !== "tool_use") continue;
          let toolUseBlock = block;
          if (toolUseBlock.name === EXITPLANMODE_2) this.exitPlanCalls.push(toolUseBlock.id);
        }
      else if (m.type === "user") {
        let content = m.message.content;
        if (!Array.isArray(content)) continue;
        for (let block of content)
          if (block.type === "tool_result" && this.exitPlanCalls.includes(block.tool_use_id))
            this.results.set(block.tool_use_id, block);
      } else if (m.type === "result" && m.subtype !== "success")
        this.terminated = {
          subtype: m.subtype,
        };
    let shouldScan = newEvents.length > 0 || this.rescanAfterRejection;
    this.rescanAfterRejection = false;
    let found = null;
    if (shouldScan) {
      for (let i = this.exitPlanCalls.length - 1; i >= 0; i--) {
        let id = this.exitPlanCalls[i];
        if (this.rejectedIds.has(id)) continue;
        let result = this.results.get(id);
        if (!result)
          found = {
            kind: "pending",
          };
        else if (result.is_error === true) {
          let teleportPlan = extractTeleportPlan(result.content);
          found =
            teleportPlan !== null
              ? {
                  kind: "teleport",
                  plan: teleportPlan,
                }
              : {
                  kind: "rejected",
                  id,
                };
        } else
          found = {
            kind: "approved",
            plan: extractApprovedPlan(result.content),
          };
        break;
      }
      if (found?.kind === "approved" || found?.kind === "teleport") return found;
    }
    if (found?.kind === "rejected") {
      this.rejectedIds.add(found.id);
      this.rescanAfterRejection = true;
    }
    if (this.terminated)
      return {
        kind: "terminated",
        subtype: this.terminated.subtype,
      };
    if (found?.kind === "rejected") return found;
    if (found?.kind === "pending") {
      this.everSeenPending = true;
      return found;
    }
    return {
      kind: "unchanged",
    };
  }
}
//@ chunk-e6aww6q8.js:2011874-2013559 fingerprint (2.1.88 match: pollForApprovedExitPlanMode, 0.86)
/**
 * 每 3 秒轮询云会话事件直到批准或超时：approved → executionTarget=remote，teleport → local；网络错误连续 5 次放弃；阶段变化（running/needs_input/plan_ready）回调通知。
 */
async function pollForApprovedExitPlanMode(sessionId, timeoutMs, onPhaseChange, shouldStop, credentials) {
  let deadline = Date.now() + timeoutMs;
  let scanner = new ExitPlanModeScanner();
  let stats = {
    eventsReceived: 0,
    firstEventAt: undefined,
    lastEventAt: undefined,
  };
  let cursor = null;
  let failures = 0;
  let lastPhase = "running";
  while (Date.now() < deadline) {
    if (shouldStop()) throw Error("poll stopped by caller");
    let newEvents;
    let sessionStatus;
    try {
      let resp = await pollRemoteSessionEvents(sessionId, cursor, {
        credentials,
      });
      newEvents = resp.newEvents;
      cursor = resp.lastEventId;
      sessionStatus = resp.sessionStatus;
      failures = 0;
      if (newEvents.length > 0) {
        let now = Date.now();
        stats.eventsReceived += newEvents.length;
        stats.firstEventAt ??= now;
        stats.lastEventAt = now;
      }
    } catch (e) {
      if (!isTransientNetworkError(e))
        throw new UltraplanPollError(
          e instanceof Error ? e.message : String(e),
          "network_or_unknown",
          scanner.rejectCount,
          stats,
          {
            cause: e,
          },
        );
      if (++failures >= MAX_CONSECUTIVE_FAILURES)
        throw new UltraplanPollError(
          "Lost connection to the cloud session after repeated retries \u2014 the session may still be running",
          "network_or_unknown",
          scanner.rejectCount,
          stats,
          {
            cause: e,
          },
        );
      await sleep(POLL_INTERVAL_MS);
      continue;
    }
    let result;
    try {
      result = scanner.ingest(newEvents);
    } catch (e) {
      throw new UltraplanPollError(
        e instanceof Error ? e.message : String(e),
        "extract_marker_missing",
        scanner.rejectCount,
        stats,
      );
    }
    if (result.kind === "approved")
      return {
        plan: result.plan,
        rejectCount: scanner.rejectCount,
        executionTarget: "remote",
      };
    if (result.kind === "teleport")
      return {
        plan: result.plan,
        rejectCount: scanner.rejectCount,
        executionTarget: "local",
      };
    if (result.kind === "terminated")
      throw new UltraplanPollError(
        `cloud session ended (${result.subtype}) before plan approval`,
        "terminated",
        scanner.rejectCount,
        stats,
      );
    let quietIdle =
      (sessionStatus === "idle" || sessionStatus === "requires_action") && newEvents.length === 0;
    let phase = scanner.hasPendingPlan ? "plan_ready" : quietIdle ? "needs_input" : "running";
    if (phase !== lastPhase) {
      logForDebugging(`[ultraplan] phase ${lastPhase} \u2192 ${phase}`);
      lastPhase = phase;
      onPhaseChange(phase);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  let rounded = Math.round(timeoutMs / 60000);
  let minuteUnit = rounded === 1 ? "minute" : "minutes";
  throw new UltraplanPollError(
    scanner.everSeenPending
      ? `no approval after ${rounded} ${minuteUnit}`
      : `ExitPlanMode never reached after ${rounded} ${minuteUnit} (the remote container failed to start, or session ID mismatch?)`,
    scanner.everSeenPending ? "timeout_pending" : "timeout_no_plan",
    scanner.rejectCount,
    stats,
  );
}
//@ chunk-e6aww6q8.js:2013559-2013668 callgraph-witnessed (2.1.88 match: contentToText, 0)
function contentToText(content) {
  return typeof content === "string"
    ? content
    : Array.isArray(content)
      ? content.map((content) => ("text" in content ? content.text : "")).join("")
      : "";
}
//@ chunk-e6aww6q8.js:2013668-2013783 callgraph-witnessed (2.1.88 match: extractTeleportPlan, 1)
function extractTeleportPlan(content) {
  let text = contentToText(content);
  let marker = `${ULTRAPLAN_TELEPORT_SENTINEL}
`;
  let idx = text.indexOf(marker);
  if (idx === -1) return null;
  return text.slice(idx + marker.length).trimEnd();
}
//@ chunk-e6aww6q8.js:2013783-2014140 fingerprint (2.1.88 match: extractApprovedPlan, 0.565)
function extractApprovedPlan(content) {
  let text = contentToText(content);
  let markers = [
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
