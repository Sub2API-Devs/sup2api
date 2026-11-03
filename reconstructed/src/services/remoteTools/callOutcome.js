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
  if (e.kind !== "dropped") return false;
  let envelope = e.reported?.envelope;
  return envelope?.outcome === "refused" && envelope.code === "unbound";
}
//@ chunk-qmsrnapp.js:9739-9811 placement
var NON_RETRYABLE_REFUSALS = new Set(["invalid_request", "unsupported_protocol", "not_served"]);
//@ chunk-qmsrnapp.js:9811-10606 placement
/**
 * 解析远程调用信封（envelope）：result/answer/refused/in_progress/unknown_call 等，转为统一结局。
 */
function interpretCallOutcome(e, dispatchEpoch) {
  let { envelope } = e;
  if (envelope === undefined)
    return {
      kind: "unknown",
      why: "unreadable",
    };
  switch (envelope.outcome) {
    case "completed":
    case "failed":
      return envelope.replayed === true
        ? {
            kind: "answer",
            transported: e,
          }
        : {
            kind: "unknown",
            why: "unreadable",
          };
    case "refused":
      if (envelope.code === "unknown_call") {
        if (envelope.host_epoch === undefined || dispatchEpoch === undefined)
          return {
            kind: "unknown",
            why: "no_epoch",
          };
        return envelope.host_epoch === dispatchEpoch
          ? {
              kind: "not_received",
            }
          : {
              kind: "host_restarted",
            };
      }
      if (envelope.replayed === true)
        return {
          kind: "answer",
          transported: e,
        };
      return NON_RETRYABLE_REFUSALS.has(envelope.code)
        ? {
            kind: "unknown",
            why: "refused",
          }
        : {
            kind: "query_turned_away",
          };
    case "needs_approval":
      return {
        kind: "answer",
        transported: e,
      };
    case "in_progress":
      return {
        kind: "still_running",
        state: envelope.state,
        ...(envelope.state === "running" &&
          envelope.output_tail !== undefined && {
            output: envelope.output_tail,
          }),
      };
    case "acknowledged":
      return {
        kind: "unknown",
        why: "unreadable",
      };
  }
}
//@ chunk-qmsrnapp.js:10606-10697 placement
function hostEpochOf(envelope) {
  return envelope.outcome === "refused" || envelope.outcome === "in_progress"
    ? envelope.host_epoch
    : undefined;
}
//@ chunk-qmsrnapp.js:10697-10932 placement
function isTransportFailure(e) {
  switch (e.kind) {
    case "dropped":
    case "unreachable":
    case "stalled":
    case "timed_out":
    case "approval_unverified":
      return true;
    case "transport_error":
      return e.unreadableResult !== true;
    case "result":
    case "host_gone":
    case "cancelled":
      return false;
  }
}
//@ chunk-qmsrnapp.js:10932-11018 placement
/**
 * 远程调用账本的保留上限常量（条目数、待发更正数、每轮追问数、放弃保留时长、子代理更正前缀等）。
 */
var MAX_LEDGER_ENTRIES = 32;
var MAX_PENDING_CORRECTIONS = 32;
var MAX_QUERIES_PER_SWEEP = 4;
var GIVEN_UP_RETENTION_MS = 600000;
var STILL_RUNNING_GRACE_MS = 30000;
var SUBAGENT_CORRECTION_STALE_MS = 300000;
var SUBAGENT_EARLIER_WORK_PREFIX = "In a subagent's earlier work: ";
//@ chunk-qmsrnapp.js:11018-14792 placement
/**
 * 每个会话的远程调用账本：记录已放弃/未确认的调用，以便之后对端回来时追问结局并补发更正说明。
 */
class RemoteCallLedger {
  now;
  #e = new Map();
  #t = [];
  #n = createSignal();
  constructor(now = Date.now) {
    this.now = now;
  }
  onLastWordQueued(e) {
    return this.#n.subscribe(e);
  }
  lastWordWaitsForMain() {
    return this.#t.some((e) => e.agentId === undefined && e.toldAs === undefined);
  }
  mainCallOpenOn(e) {
    for (let n of this.#e.values()) if (n.agentId === undefined && n.hostName === e) return true;
    return false;
  }
  gaveUp(e) {
    this.#s();
    evictOldest(this.#e, MAX_LEDGER_ENTRIES).set(e.callId, {
      ...e,
      askedAt: undefined,
      stoppedAt: e.toldAs === "interrupted" ? e.givenUpAt : undefined,
    });
    logEvent("tengu_remote_tool_targets", {
      event: lit("given_up"),
      told_as: fromEnum(e.toldAs),
      standing: e.standing,
    });
  }
  answeredLate(e, n) {
    let o = this.#e.get(e);
    if (o === undefined) return false;
    let r = {
      ...o,
      standing: false,
      withdraw: undefined,
      givenUpAt: this.now(),
      askedAt: undefined,
    };
    if (n.kind !== "result" || n.envelope === undefined) {
      this.#e.set(e, r);
      return false;
    }
    let s = lateOutcomeMessage(o, n);
    logRemoteTools(e, "late outcome: answer on the standing request", {
      outcome: n.envelope.outcome,
      final: s !== undefined,
    });
    if (s === undefined) {
      let u =
        n.envelope.outcome === "in_progress" && n.envelope.state === "running"
          ? askedOutcomeMessage(o, {
              kind: "still_running",
              state: "running",
            })
          : undefined;
      this.#e.set(
        e,
        u === undefined
          ? r
          : {
              ...r,
              toldAs: "still_running",
            },
      );
      if (u !== undefined) this.#r(o, u, "standing_request", "still_running");
      return true;
    }
    this.#e.delete(e);
    this.#r(o, s, "standing_request");
    return true;
  }
  outstandingOn(e, n) {
    let o = this.now();
    return [...this.#e.values()].some(
      (r) => r.hostName === e && r.agentId === n && (r.standing || o - r.givenUpAt <= GIVEN_UP_RETENTION_MS),
    );
  }
  forget(e) {
    this.#e.delete(e);
    this.#t = this.#t.filter((n) => n.callId !== e);
  }
  dueForQuery(e, n, o) {
    this.#s();
    let sliced = [...this.#e.values()]
      .filter(
        (i) =>
          i.askedAt === undefined && i.givenUpAt < e && (!i.standing || n(i.hostName, i.givenUpAt)) && o(i),
      )
      .slice(0, MAX_QUERIES_PER_SWEEP);
    let askedAt = this.now();
    for (let i of sliced)
      this.#e.set(i.callId, {
        ...i,
        askedAt,
      });
    return sliced;
  }
  askedAfterward(e, n) {
    let o = this.#e.get(e);
    if (o === undefined) return;
    if (n.kind !== "result") {
      this.#e.set(e, {
        ...o,
        askedAt: undefined,
      });
      return;
    }
    this.settleVerdict(e, interpretCallOutcome(n, o.dispatchEpoch));
  }
  settleVerdict(e, n, o = false) {
    let r = this.#e.get(e);
    if (r === undefined) return;
    let s = (u = r) => {
      this.#e.set(e, {
        ...u,
        askedAt: undefined,
      });
    };
    let i = () => {
      if (r.standing)
        this.#e.set(e, {
          ...r,
          askedAt: this.now(),
        });
      else this.#e.delete(e);
    };
    switch (
      (logRemoteTools(e, "late outcome: record verdict", {
        verdict: n.kind,
      }),
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
          n.kind === "still_running" &&
          r.stoppedAt !== undefined &&
          this.now() - r.stoppedAt < STILL_RUNNING_GRACE_MS
            ? undefined
            : askedOutcomeMessage(r, n);
        let p = n.kind !== "still_running" && h !== undefined;
        let y = !p && this.#t.some((S) => S.callId === e && S.toldAs === "still_running");
        if (h !== undefined && !y) this.#r(r, h, "record", p ? undefined : "still_running");
        if (p) {
          r.withdraw?.();
          this.#e.delete(e);
          return;
        }
        let _ =
          n.kind === "still_running"
            ? {
                ...r,
                givenUpAt: this.now(),
              }
            : r;
        if (r.standing)
          this.#e.set(e, {
            ..._,
            askedAt: this.now(),
          });
        else s(_);
        return;
      }
    }
  }
  takeCorrections(e, { turnStart: n = false } = {}) {
    let o = this.now();
    let r = (u) => e === undefined && n && u.agentId !== undefined && o - u.at > SUBAGENT_CORRECTION_STALE_MS;
    let s = (u) => u.agentId === e || r(u);
    let filtered = this.#t.filter(s);
    this.#t = this.#t.filter((u) => !s(u));
    for (let u of filtered) this.#o(u);
    return filtered.map((u) => (r(u) ? `${SUBAGENT_EARLIER_WORK_PREFIX}${u.line}` : u.line));
  }
  #o(e) {
    let n = e.toldAs === undefined ? undefined : this.#e.get(e.callId);
    if (e.toldAs !== undefined && n !== undefined)
      this.#e.set(e.callId, {
        ...n,
        toldAs: e.toldAs,
      });
  }
  #r(e, line, o, r) {
    this.#t = this.#t.filter((s) => s.callId !== e.callId);
    if (this.#t.length >= MAX_PENDING_CORRECTIONS) {
      let s = this.#t.shift();
      if (s !== undefined) this.#o(s);
    }
    this.#t.push({
      callId: e.callId,
      agentId: e.agentId,
      line,
      at: this.now(),
      toldAs: r,
    });
    logEvent("tengu_remote_tool_targets", {
      event: lit("late_outcome"),
      told_as: fromEnum(e.toldAs),
      source: fromEnum(o),
    });
    if (r === undefined)
      try {
        this.#n.emit(e.agentId);
      } catch (error) {
        logError(toError(error));
      }
  }
  #s() {
    let e = this.now();
    for (let [n, o] of this.#e)
      if (!o.standing && e - o.givenUpAt > GIVEN_UP_RETENTION_MS) {
        this.#e.delete(n);
        logEvent("tengu_remote_tool_targets", {
          event: lit("given_up_expired"),
          told_as: fromEnum(o.toldAs),
        });
      }
  }
}
//@ chunk-qmsrnapp.js:14792-14895 placement
function evictOldest(e, n) {
  while (e.size >= n) {
    let o = e.keys().next().value;
    if (o === undefined) break;
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
/**
 * 远程调用「无法完成」的原因短语表：拒绝类（hook 拦下、规则拒绝、用户拒绝等）与不可服务类（协议不符、未提供工具、会话失效等）。
 */
var HOST_REFUSAL_PHRASES = {
  hook_blocked: "a hook there blocked it",
  denied_by_rule: "a rule there denied it",
  denied_by_user: "the user declined it there",
  ask_refused_no_surface: "it needed approval and nobody could be asked",
  validation_failed: "its input was rejected there",
  asked_in_session: "it was waiting on an approval that never came",
  denied_by_session: "this session declined it",
  ask_expired: "its approval request expired",
};
var CANNOT_FULFILL_PHRASES = {
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
//@ chunk-qmsrnapp.js:16870-17185 placement
/**
 * 迟到的远程调用结果说明：可能已部分执行的提示，以及取消、超时、工具错误、内部错误的原因文字。
 */
var PARTIAL_RUN_HINT = "it may have partially run; check its effects there before repeating it.";
var LATE_OUTCOME_REASONS = {
  cancelled: "it was cancelled there (before or while it ran)",
  timed_out: "it was stopped at its time limit there",
  tool_error: "the tool ran there and reported an error",
  internal_error: "it failed there",
  unrecognized: "it failed there",
};
//@ chunk-qmsrnapp.js:17185-18144 placement
function lateOutcomeMessage(e, n) {
  if (n.kind !== "result" || n.envelope === undefined) return;
  let { envelope } = n;
  let r = givenUpCallPreamble(e);
  switch (envelope.outcome) {
    case "completed": {
      if (isRanOutcome(envelope.disposition))
        return envelope.is_error
          ? `${r} That machine now reports it ended there with an error (recorded there, not delivered here): the command ran and failed, or was refused before it started. ${checkEffectsAdvice(e)}`
          : `${r} That machine now reports it DID run and completed (its output was recorded there, not delivered here). ${checkEffectsAdvice(e)}`;
      let s = HOST_REFUSAL_PHRASES[envelope.disposition ?? "ran"];
      return s === undefined ? undefined : `${r} That machine now reports it did not run it (${s}).`;
    }
    case "failed":
      return `${r} That machine now reports ${LATE_OUTCOME_REASONS[envelope.code]} \u2014 ${PARTIAL_RUN_HINT}`;
    case "refused": {
      if (envelope.code === "result_lost")
        return `${r} That machine now reports it DID run and ended; its result is no longer held there. ${checkEffectsAdvice(e)}`;
      let s = CANNOT_FULFILL_PHRASES[envelope.code];
      return s === undefined ? undefined : `${r} That machine now reports it did not run it (${s}).`;
    }
    case "acknowledged":
    case "needs_approval":
    case "in_progress":
      return;
  }
}
//@ chunk-qmsrnapp.js:18144-18262 placement
function isDuplicateCompleted(transported) {
  return (
    transported.kind === "result" &&
    transported.envelope?.outcome === "completed" &&
    transported.envelope.disposition === "duplicate_call"
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
        ? undefined
        : `${o} That machine has no record of it: it never ran there, and it is safe to send again if still wanted.`;
    case "host_restarted":
      return `${o} Claude Code on ${e.hostName} has restarted since, and the command was lost with it \u2014 it may have partially run before the restart; check its effects before repeating it.`;
    case "still_running":
      return n.state === "running" && e.toldAs !== "still_running"
        ? `${o} That machine now reports it IS running there; its outcome is not known yet \u2014 do not run it again.`
        : undefined;
    case "unknown":
    case "query_turned_away":
      return;
  }
}
export { interpretCallOutcome, RemoteCallLedger, isTransportFailure, hostEpochOf, isRefusedDrop };
