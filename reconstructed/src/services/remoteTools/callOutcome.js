/**
 * services/remoteTools/callOutcome.ts
 *
 * 2.1.316 新增：远程调用结果解析：信封（result/answer/refused）、迟到结果、调用账本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qmsrnapp.js (15)
 * attribution: placement 15
 */
import { logForDebugging } from "../../utils/debug.js";
import { createSignal } from "../../utils/signal.js";
import { logEvent } from "../analytics/index.js";
import { lit, fromEnum } from "../analytics/safeMetadata.js";
import { logRemoteTools } from "./remoteToolsDebug.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { isRanOutcome } from "../../remote/tools/protocolConstants.js";

//@ chunk-qmsrnapp.js:9616-9739 placement
function isRefusedDrop(e) {
  if (e.kind !== "dropped") return !1;
  let n = e.reported?.envelope;
  return n?.outcome === "refused" && n.code === "unbound";
}
//@ chunk-qmsrnapp.js:9739-9811 placement
var NON_RETRYABLE_REFUSALS = new Set(["invalid_request", "unsupported_protocol", "not_served"]);
/**
 * 解析远程调用信封（envelope）：result/answer/refused/in_progress/unknown_call 等，转为统一结局。
 */
//@ chunk-qmsrnapp.js:9811-10606 placement
function interpretCallOutcome(e, n) {
  let { envelope: envelope } = e;
  if (envelope === void 0) return { kind: "unknown", why: "unreadable" };
  switch (envelope.outcome) {
    case "completed":
    case "failed":
      return envelope.replayed === !0
        ? { kind: "answer", transported: e }
        : { kind: "unknown", why: "unreadable" };
    case "refused":
      if (envelope.code === "unknown_call") {
        if (envelope.host_epoch === void 0 || n === void 0) return { kind: "unknown", why: "no_epoch" };
        return envelope.host_epoch === n ? { kind: "not_received" } : { kind: "host_restarted" };
      }
      if (envelope.replayed === !0) return { kind: "answer", transported: e };
      return NON_RETRYABLE_REFUSALS.has(envelope.code)
        ? { kind: "unknown", why: "refused" }
        : { kind: "query_turned_away" };
    case "needs_approval":
      return { kind: "answer", transported: e };
    case "in_progress":
      return {
        kind: "still_running",
        state: envelope.state,
        ...(envelope.state === "running" &&
          envelope.output_tail !== void 0 && { output: envelope.output_tail }),
      };
    case "acknowledged":
      return { kind: "unknown", why: "unreadable" };
  }
}
//@ chunk-qmsrnapp.js:10606-10697 placement
function hostEpochOf(e) {
  return e.outcome === "refused" || e.outcome === "in_progress" ? e.host_epoch : void 0;
}
//@ chunk-qmsrnapp.js:10697-10932 placement
function isTransportFailure(e) {
  switch (e.kind) {
    case "dropped":
    case "unreachable":
    case "stalled":
    case "timed_out":
    case "approval_unverified":
      return !0;
    case "transport_error":
      return e.unreadableResult !== !0;
    case "result":
    case "host_gone":
    case "cancelled":
      return !1;
  }
}
//@ chunk-qmsrnapp.js:10932-11018 placement
var tn = 32,
  nn = 32,
  on = 4,
  He = 600000,
  rn = 30000,
  sn = 300000,
  an = "In a subagent's earlier work: ";
/**
 * 每个会话的远程调用账本：记录已放弃/未确认的调用，以便之后对端回来时追问结局并补发更正说明。
 */
//@ chunk-qmsrnapp.js:11018-14792 placement
class RemoteCallLedger {
  now;
  #e = new Map();
  #t = [];
  #n = createSignal();
  constructor(e = Date.now) {
    this.now = e;
  }
  onLastWordQueued(e) {
    return this.#n.subscribe(e);
  }
  lastWordWaitsForMain() {
    return this.#t.some((e) => e.agentId === void 0 && e.toldAs === void 0);
  }
  mainCallOpenOn(e) {
    for (let n of this.#e.values()) if (n.agentId === void 0 && n.hostName === e) return !0;
    return !1;
  }
  gaveUp(e) {
    (this.#s(),
      evictOldest(this.#e, tn).set(e.callId, {
        ...e,
        askedAt: void 0,
        stoppedAt: e.toldAs === "interrupted" ? e.givenUpAt : void 0,
      }),
      logEvent("tengu_remote_tool_targets", {
        event: lit("given_up"),
        told_as: fromEnum(e.toldAs),
        standing: e.standing,
      }));
  }
  answeredLate(e, n) {
    let o = this.#e.get(e);
    if (o === void 0) return !1;
    let r = { ...o, standing: !1, withdraw: void 0, givenUpAt: this.now(), askedAt: void 0 };
    if (n.kind !== "result" || n.envelope === void 0) return (this.#e.set(e, r), !1);
    let s = lateOutcomeMessage(o, n);
    if (
      (logRemoteTools(e, "late outcome: answer on the standing request", {
        outcome: n.envelope.outcome,
        final: s !== void 0,
      }),
      s === void 0)
    ) {
      let u =
        n.envelope.outcome === "in_progress" && n.envelope.state === "running"
          ? askedOutcomeMessage(o, { kind: "still_running", state: "running" })
          : void 0;
      if ((this.#e.set(e, u === void 0 ? r : { ...r, toldAs: "still_running" }), u !== void 0))
        this.#r(o, u, "standing_request", "still_running");
      return !0;
    }
    return (this.#e.delete(e), this.#r(o, s, "standing_request"), !0);
  }
  outstandingOn(e, n) {
    let now = this.now();
    return [...this.#e.values()].some(
      (r) => r.hostName === e && r.agentId === n && (r.standing || now - r.givenUpAt <= He),
    );
  }
  forget(e) {
    (this.#e.delete(e), (this.#t = this.#t.filter((n) => n.callId !== e)));
  }
  dueForQuery(e, n, o) {
    this.#s();
    let sliced = [...this.#e.values()]
        .filter(
          (i) =>
            i.askedAt === void 0 && i.givenUpAt < e && (!i.standing || n(i.hostName, i.givenUpAt)) && o(i),
        )
        .slice(0, on),
      now = this.now();
    for (let i of sliced) this.#e.set(i.callId, { ...i, askedAt: now });
    return sliced;
  }
  askedAfterward(e, n) {
    let o = this.#e.get(e);
    if (o === void 0) return;
    if (n.kind !== "result") {
      this.#e.set(e, { ...o, askedAt: void 0 });
      return;
    }
    this.settleVerdict(e, interpretCallOutcome(n, o.dispatchEpoch));
  }
  settleVerdict(e, n, o = !1) {
    let r = this.#e.get(e);
    if (r === void 0) return;
    let s = (u = r) => {
        this.#e.set(e, { ...u, askedAt: void 0 });
      },
      i = () => {
        if (r.standing) this.#e.set(e, { ...r, askedAt: this.now() });
        else this.#e.delete(e);
      };
    switch (
      (logRemoteTools(e, "late outcome: record verdict", { verdict: n.kind }),
      logEvent("tengu_remote_tool_targets", {
        event: lit("late_query"),
        told_as: fromEnum(r.toldAs),
        verdict: fromEnum(n.kind),
        source: fromEnum(o ? "inferred" : "record"),
      }),
      n.kind)
    ) {
      case "query_turned_away":
        s();
        return;
      case "unknown":
        i();
        return;
      case "still_running":
      case "answer":
      case "not_received":
      case "host_restarted": {
        if (n.kind === "not_received" && r.machineHadCall) {
          i();
          return;
        }
        let h =
            n.kind === "still_running" && r.stoppedAt !== void 0 && this.now() - r.stoppedAt < rn
              ? void 0
              : askedOutcomeMessage(r, n),
          p = n.kind !== "still_running" && h !== void 0,
          y = !p && this.#t.some((S) => S.callId === e && S.toldAs === "still_running");
        if (h !== void 0 && !y) this.#r(r, h, "record", p ? void 0 : "still_running");
        if (p) {
          (r.withdraw?.(), this.#e.delete(e));
          return;
        }
        let _ = n.kind === "still_running" ? { ...r, givenUpAt: this.now() } : r;
        if (r.standing) this.#e.set(e, { ..._, askedAt: this.now() });
        else s(_);
        return;
      }
    }
  }
  takeCorrections(e, { turnStart: n = !1 } = {}) {
    let now = this.now(),
      r = (u) => e === void 0 && n && u.agentId !== void 0 && now - u.at > sn,
      s = (u) => u.agentId === e || r(u),
      filtered = this.#t.filter(s);
    this.#t = this.#t.filter((u) => !s(u));
    for (let u of filtered) this.#o(u);
    return filtered.map((u) => (r(u) ? `${an}${u.line}` : u.line));
  }
  #o(e) {
    let n = e.toldAs === void 0 ? void 0 : this.#e.get(e.callId);
    if (e.toldAs !== void 0 && n !== void 0) this.#e.set(e.callId, { ...n, toldAs: e.toldAs });
  }
  #r(e, n, o, r) {
    if (((this.#t = this.#t.filter((s) => s.callId !== e.callId)), this.#t.length >= nn)) {
      let s = this.#t.shift();
      if (s !== void 0) this.#o(s);
    }
    if (
      (this.#t.push({ callId: e.callId, agentId: e.agentId, line: n, at: this.now(), toldAs: r }),
      logEvent("tengu_remote_tool_targets", {
        event: lit("late_outcome"),
        told_as: fromEnum(e.toldAs),
        source: fromEnum(o),
      }),
      r === void 0)
    )
      try {
        this.#n.emit(e.agentId);
      } catch (error) {
        logError(toError(error));
      }
  }
  #s() {
    let now = this.now();
    for (let [n, o] of this.#e)
      if (!o.standing && now - o.givenUpAt > He)
        (this.#e.delete(n),
          logEvent("tengu_remote_tool_targets", {
            event: lit("given_up_expired"),
            told_as: fromEnum(o.toldAs),
          }));
  }
}
//@ chunk-qmsrnapp.js:14792-14895 placement
function evictOldest(e, n) {
  while (e.size >= n) {
    let o = e.keys().next().value;
    if (o === void 0) break;
    e.delete(o);
  }
  return e;
}
//@ chunk-qmsrnapp.js:14895-15565 placement
function givenUpCallPreamble(e) {
  let n = {
    host_unresponsive:
      "was reported with its state unknown after that machine stopped answering this session's checks on it",
    host_asleep: "was reported as paused, its state unknown, when that machine went to sleep",
    stalled: "was reported as most likely not run (it was withdrawn while this session was backed up)",
    timed_out: "was reported as unanswered (that machine did not answer in time)",
    still_running: "was reported as still running there",
    delivery_unknown: "was reported with its outcome unknown",
    interrupted: "was reported as interrupted",
  }[e.toldAs];
  return `Correction: the earlier ${e.toolName} call on ${e.hostName} \u2014 ${e.spelled} \u2014 ${n}.`;
}
//@ chunk-qmsrnapp.js:15565-16743 placement
var HOST_REFUSAL_PHRASES = {
    hook_blocked: "a hook there blocked it",
    denied_by_rule: "a rule there denied it",
    denied_by_user: "the user declined it there",
    ask_refused_no_surface: "it needed approval and nobody could be asked",
    validation_failed: "its input was rejected there",
    asked_in_session: "it was waiting on an approval that never came",
    denied_by_session: "this session declined it",
    ask_expired: "its approval request expired",
  },
  cn = {
    invalid_request: "it could not read the request",
    unsupported_protocol: "the two Claude Code builds could not agree on a protocol",
    not_served: "it does not offer that tool",
    no_session: "it no longer served this session",
    unbound: "it was no longer attached to this session",
    session_mismatch: "the call named another session",
    too_many_in_flight: "it already had as many calls running as it accepts",
    refused_field: "the request asked for something it does not allow",
    sandbox_unavailable: "its sandbox was not available",
    no_approval: "the approval it needed was not one it could accept",
    stale: "the call reached it too late",
    queue_full: "too many calls were waiting there",
    rate_limited: "this session was sending it calls too fast",
    withdrawn: "its pending approval request was withdrawn",
  };
//@ chunk-qmsrnapp.js:16743-16870 placement
function checkEffectsAdvice(e) {
  return `Check its effects on ${e.hostName} with a read-only command there before relying on it or repeating it.`;
}
/**
 * 迟到的远程调用结果说明：可能已部分执行的提示，以及取消、超时、工具错误、内部错误的原因文字。
 */
//@ chunk-qmsrnapp.js:16870-17185 placement
var PARTIAL_RUN_HINT = "it may have partially run; check its effects there before repeating it.",
  LATE_OUTCOME_REASONS = {
    cancelled: "it was cancelled there (before or while it ran)",
    timed_out: "it was stopped at its time limit there",
    tool_error: "the tool ran there and reported an error",
    internal_error: "it failed there",
    unrecognized: "it failed there",
  };
//@ chunk-qmsrnapp.js:17185-18144 placement
function lateOutcomeMessage(e, n) {
  if (n.kind !== "result" || n.envelope === void 0) return;
  let { envelope: envelope } = n,
    r = givenUpCallPreamble(e);
  switch (envelope.outcome) {
    case "completed": {
      if (isRanOutcome(envelope.disposition))
        return envelope.is_error
          ? `${r} That machine now reports it ended there with an error (recorded there, not delivered here): the command ran and failed, or was refused before it started. ${checkEffectsAdvice(e)}`
          : `${r} That machine now reports it DID run and completed (its output was recorded there, not delivered here). ${checkEffectsAdvice(e)}`;
      let s = HOST_REFUSAL_PHRASES[envelope.disposition ?? "ran"];
      return s === void 0 ? void 0 : `${r} That machine now reports it did not run it (${s}).`;
    }
    case "failed":
      return `${r} That machine now reports ${LATE_OUTCOME_REASONS[envelope.code]} \u2014 ${PARTIAL_RUN_HINT}`;
    case "refused": {
      if (envelope.code === "result_lost")
        return `${r} That machine now reports it DID run and ended; its result is no longer held there. ${checkEffectsAdvice(e)}`;
      let s = cn[envelope.code];
      return s === void 0 ? void 0 : `${r} That machine now reports it did not run it (${s}).`;
    }
    case "acknowledged":
    case "needs_approval":
    case "in_progress":
      return;
  }
}
//@ chunk-qmsrnapp.js:18144-18262 placement
function isDuplicateCompleted(e) {
  return (
    e.kind === "result" && e.envelope?.outcome === "completed" && e.envelope.disposition === "duplicate_call"
  );
}
//@ chunk-qmsrnapp.js:18262-19087 placement
function askedOutcomeMessage(e, n) {
  let o = givenUpCallPreamble(e);
  switch (n.kind) {
    case "answer":
      return isDuplicateCompleted(n.transported)
        ? `${o} That machine's record shows the call reached it and has ended there, but the result is no longer held. ${checkEffectsAdvice(e)}`
        : lateOutcomeMessage(e, n.transported);
    case "not_received":
      return e.machineHadCall
        ? void 0
        : `${o} That machine has no record of it: it never ran there, and it is safe to send again if still wanted.`;
    case "host_restarted":
      return `${o} Claude Code on ${e.hostName} has restarted since, and the command was lost with it \u2014 it may have partially run before the restart; check its effects before repeating it.`;
    case "still_running":
      return n.state === "running" && e.toldAs !== "still_running"
        ? `${o} That machine now reports it IS running there; its outcome is not known yet \u2014 do not run it again.`
        : void 0;
    case "unknown":
    case "query_turned_away":
      return;
  }
}

export { interpretCallOutcome, RemoteCallLedger, isTransportFailure, hostEpochOf, isRefusedDrop };
