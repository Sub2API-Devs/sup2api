/**
 * services/remoteTools/callOutcome.ts
 *
 * 2.1.316 新增：远程调用结果解析：信封（result/answer/refused）、迟到结果、调用账本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5vfqv7sk.js (15)
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5vfqv7sk.js:9835-9958 placement
function isRefusedDrop(outcome) {
  if (outcome.kind !== "dropped") return false;
  let envelope = outcome.reported?.envelope;
  return envelope?.outcome === "refused" && envelope.code === "unbound";
}
//@ chunk-5vfqv7sk.js:9958-10030 placement
var NON_RETRYABLE_REFUSALS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5vfqv7sk.js:9958", () => {
  NON_RETRYABLE_REFUSALS = new Set(["invalid_request", "unsupported_protocol", "not_served"]);
});
//@ chunk-5vfqv7sk.js:10030-10825 placement
/**
 * 解析远程调用信封（envelope）：result/answer/refused/in_progress/unknown_call 等，转为统一结局。
 */
function interpretCallOutcome(transported, dispatchEpoch) {
  let { envelope } = transported;
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
            transported,
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
          transported,
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
        transported,
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
//@ chunk-5vfqv7sk.js:10825-10916 placement
function hostEpochOf(envelope) {
  return envelope.outcome === "refused" || envelope.outcome === "in_progress"
    ? envelope.host_epoch
    : undefined;
}
//@ chunk-5vfqv7sk.js:10916-11151 placement
function isTransportFailure(outcome) {
  switch (outcome.kind) {
    case "dropped":
    case "unreachable":
    case "stalled":
    case "timed_out":
    case "approval_unverified":
      return true;
    case "transport_error":
      return outcome.unreadableResult !== true;
    case "result":
    case "host_gone":
    case "cancelled":
      return false;
  }
}
//@ chunk-5vfqv7sk.js:11151-11237 placement
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
//@ chunk-5vfqv7sk.js:11237-15011 placement
/**
 * 每个会话的远程调用账本：记录已放弃/未确认的调用，以便之后对端回来时追问结局并补发更正说明。
 */
class RemoteCallLedger {
  now;
  #e = new Map();
  #n = [];
  #t = createSignal();
  constructor(now = Date.now) {
    this.now = now;
  }
  onLastWordQueued(listener) {
    return this.#t.subscribe(listener);
  }
  lastWordWaitsForMain() {
    return this.#n.some((line) => line.agentId === undefined && line.toldAs === undefined);
  }
  mainCallOpenOn(hostName) {
    for (let entry of this.#e.values())
      if (entry.agentId === undefined && entry.hostName === hostName) return true;
    return false;
  }
  gaveUp(entry) {
    this.#s();
    evictOldest(this.#e, MAX_LEDGER_ENTRIES).set(entry.callId, {
      ...entry,
      askedAt: undefined,
      stoppedAt: entry.toldAs === "interrupted" ? entry.givenUpAt : undefined,
    });
    logEvent("tengu_remote_tool_targets", {
      event: lit("given_up"),
      told_as: fromEnum(entry.toldAs),
      standing: entry.standing,
    });
  }
  answeredLate(callId, transported) {
    let entry = this.#e.get(callId);
    if (entry === undefined) return false;
    let settled = {
      ...entry,
      standing: false,
      withdraw: undefined,
      givenUpAt: this.now(),
      askedAt: undefined,
    };
    if (transported.kind !== "result" || transported.envelope === undefined) {
      this.#e.set(callId, settled);
      return false;
    }
    let message = lateOutcomeMessage(entry, transported);
    logRemoteTools(callId, "late outcome: answer on the standing request", {
      outcome: transported.envelope.outcome,
      final: message !== undefined,
    });
    if (message === undefined) {
      let runningMessage =
        transported.envelope.outcome === "in_progress" && transported.envelope.state === "running"
          ? askedOutcomeMessage(entry, {
              kind: "still_running",
              state: "running",
            })
          : undefined;
      this.#e.set(
        callId,
        runningMessage === undefined
          ? settled
          : {
              ...settled,
              toldAs: "still_running",
            },
      );
      if (runningMessage !== undefined) this.#r(entry, runningMessage, "standing_request", "still_running");
      return true;
    }
    this.#e.delete(callId);
    this.#r(entry, message, "standing_request");
    return true;
  }
  outstandingOn(hostName, agentId) {
    let now = this.now();
    return [...this.#e.values()].some(
      (entry) =>
        entry.hostName === hostName &&
        entry.agentId === agentId &&
        (entry.standing || now - entry.givenUpAt <= GIVEN_UP_RETENTION_MS),
    );
  }
  forget(callId) {
    this.#e.delete(callId);
    this.#n = this.#n.filter((line) => line.callId !== callId);
  }
  dueForQuery(cutoff, stillWanted, wanted) {
    this.#s();
    let sliced = [...this.#e.values()]
      .filter(
        (entry) =>
          entry.askedAt === undefined &&
          entry.givenUpAt < cutoff &&
          (!entry.standing || stillWanted(entry.hostName, entry.givenUpAt)) &&
          wanted(entry),
      )
      .slice(0, MAX_QUERIES_PER_SWEEP);
    let askedAt = this.now();
    for (let entry of sliced)
      this.#e.set(entry.callId, {
        ...entry,
        askedAt,
      });
    return sliced;
  }
  askedAfterward(callId, transported) {
    let entry = this.#e.get(callId);
    if (entry === undefined) return;
    if (transported.kind !== "result") {
      this.#e.set(callId, {
        ...entry,
        askedAt: undefined,
      });
      return;
    }
    this.settleVerdict(callId, interpretCallOutcome(transported, entry.dispatchEpoch));
  }
  settleVerdict(callId, verdict, inferred = false) {
    let entry = this.#e.get(callId);
    if (entry === undefined) return;
    let settleUnasked = (target = entry) => {
      this.#e.set(callId, {
        ...target,
        askedAt: undefined,
      });
    };
    let settleAsked = () => {
      if (entry.standing)
        this.#e.set(callId, {
          ...entry,
          askedAt: this.now(),
        });
      else this.#e.delete(callId);
    };
    switch (
      (logRemoteTools(callId, "late outcome: record verdict", {
        verdict: verdict.kind,
      }),
      logEvent("tengu_remote_tool_targets", {
        event: lit("late_query"),
        told_as: fromEnum(entry.toldAs),
        verdict: fromEnum(verdict.kind),
        source: fromEnum(inferred ? "inferred" : "record"),
      }),
      verdict.kind)
    ) {
      case "query_turned_away":
        settleUnasked();
        return;
      case "unknown":
        settleAsked();
        return;
      case "still_running":
      case "answer":
      case "not_received":
      case "host_restarted": {
        if (verdict.kind === "not_received" && entry.machineHadCall) {
          settleAsked();
          return;
        }
        let message =
          verdict.kind === "still_running" &&
          entry.stoppedAt !== undefined &&
          this.now() - entry.stoppedAt < STILL_RUNNING_GRACE_MS
            ? undefined
            : askedOutcomeMessage(entry, verdict);
        let finalAnswer = verdict.kind !== "still_running" && message !== undefined;
        let alreadyTold =
          !finalAnswer && this.#n.some((line) => line.callId === callId && line.toldAs === "still_running");
        if (message !== undefined && !alreadyTold)
          this.#r(entry, message, "record", finalAnswer ? undefined : "still_running");
        if (finalAnswer) {
          entry.withdraw?.();
          this.#e.delete(callId);
          return;
        }
        let nextEntry =
          verdict.kind === "still_running"
            ? {
                ...entry,
                givenUpAt: this.now(),
              }
            : entry;
        if (entry.standing)
          this.#e.set(callId, {
            ...nextEntry,
            askedAt: this.now(),
          });
        else settleUnasked(nextEntry);
        return;
      }
    }
  }
  takeCorrections(agentId, { turnStart = false } = {}) {
    let now = this.now();
    let isStaleSubagentLine = (line) =>
      agentId === undefined &&
      turnStart &&
      line.agentId !== undefined &&
      now - line.at > SUBAGENT_CORRECTION_STALE_MS;
    let belongs = (line) => line.agentId === agentId || isStaleSubagentLine(line);
    let filtered = this.#n.filter(belongs);
    this.#n = this.#n.filter((line) => !belongs(line));
    for (let line of filtered) this.#o(line);
    return filtered.map((line) =>
      isStaleSubagentLine(line) ? `${SUBAGENT_EARLIER_WORK_PREFIX}${line.line}` : line.line,
    );
  }
  #o(line) {
    let entry = line.toldAs === undefined ? undefined : this.#e.get(line.callId);
    if (line.toldAs !== undefined && entry !== undefined)
      this.#e.set(line.callId, {
        ...entry,
        toldAs: line.toldAs,
      });
  }
  #r(entry, line, source, toldAs) {
    this.#n = this.#n.filter((line) => line.callId !== entry.callId);
    if (this.#n.length >= MAX_PENDING_CORRECTIONS) {
      let dropped = this.#n.shift();
      if (dropped !== undefined) this.#o(dropped);
    }
    this.#n.push({
      callId: entry.callId,
      agentId: entry.agentId,
      line,
      at: this.now(),
      toldAs,
    });
    logEvent("tengu_remote_tool_targets", {
      event: lit("late_outcome"),
      told_as: fromEnum(entry.toldAs),
      source: fromEnum(source),
    });
    if (toldAs === undefined)
      try {
        this.#t.emit(entry.agentId);
      } catch (error) {
        logError(toError(error));
      }
  }
  #s() {
    let now = this.now();
    for (let [callId, entry] of this.#e)
      if (!entry.standing && now - entry.givenUpAt > GIVEN_UP_RETENTION_MS) {
        this.#e.delete(callId);
        logEvent("tengu_remote_tool_targets", {
          event: lit("given_up_expired"),
          told_as: fromEnum(entry.toldAs),
        });
      }
  }
}
//@ chunk-5vfqv7sk.js:15011-15114 placement
function evictOldest(map, maxSize) {
  while (map.size >= maxSize) {
    let oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
  return map;
}
//@ chunk-5vfqv7sk.js:15114-15784 placement
function givenUpCallPreamble(givenUp) {
  let reasonText = {
    host_unresponsive:
      "was reported with its state unknown after that machine stopped answering this session's checks on it",
    host_asleep: "was reported as paused, its state unknown, when that machine went to sleep",
    stalled: "was reported as most likely not run (it was withdrawn while this session was backed up)",
    timed_out: "was reported as unanswered (that machine did not answer in time)",
    still_running: "was reported as still running there",
    delivery_unknown: "was reported with its outcome unknown",
    interrupted: "was reported as interrupted",
  }[givenUp.toldAs];
  return `Correction: the earlier ${givenUp.toolName} call on ${givenUp.hostName} \u2014 ${givenUp.spelled} \u2014 ${reasonText}.`;
}
//@ chunk-5vfqv7sk.js:15784-16962 placement
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
//@ chunk-5vfqv7sk.js:16962-17089 placement
function checkEffectsAdvice(call) {
  return `Check its effects on ${call.hostName} with a read-only command there before relying on it or repeating it.`;
}
//@ chunk-5vfqv7sk.js:17089-17404 placement
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
//@ chunk-5vfqv7sk.js:17404-18363 placement
function lateOutcomeMessage(givenUp, transported) {
  if (transported.kind !== "result" || transported.envelope === undefined) return;
  let { envelope } = transported;
  let preamble = givenUpCallPreamble(givenUp);
  switch (envelope.outcome) {
    case "completed": {
      if (isRanOutcome(envelope.disposition))
        return envelope.is_error
          ? `${preamble} That machine now reports it ended there with an error (recorded there, not delivered here): the command ran and failed, or was refused before it started. ${checkEffectsAdvice(givenUp)}`
          : `${preamble} That machine now reports it DID run and completed (its output was recorded there, not delivered here). ${checkEffectsAdvice(givenUp)}`;
      let refusalPhrase = HOST_REFUSAL_PHRASES[envelope.disposition ?? "ran"];
      return refusalPhrase === undefined
        ? undefined
        : `${preamble} That machine now reports it did not run it (${refusalPhrase}).`;
    }
    case "failed":
      return `${preamble} That machine now reports ${LATE_OUTCOME_REASONS[envelope.code]} \u2014 ${PARTIAL_RUN_HINT}`;
    case "refused": {
      if (envelope.code === "result_lost")
        return `${preamble} That machine now reports it DID run and ended; its result is no longer held there. ${checkEffectsAdvice(givenUp)}`;
      let refusalPhrase = CANNOT_FULFILL_PHRASES[envelope.code];
      return refusalPhrase === undefined
        ? undefined
        : `${preamble} That machine now reports it did not run it (${refusalPhrase}).`;
    }
    case "acknowledged":
    case "needs_approval":
    case "in_progress":
      return;
  }
}
//@ chunk-5vfqv7sk.js:18363-18481 placement
function isDuplicateCompleted(transported) {
  return (
    transported.kind === "result" &&
    transported.envelope?.outcome === "completed" &&
    transported.envelope.disposition === "duplicate_call"
  );
}
//@ chunk-5vfqv7sk.js:18481-19306 placement
function askedOutcomeMessage(givenUp, outcome) {
  let preamble = givenUpCallPreamble(givenUp);
  switch (outcome.kind) {
    case "answer":
      return isDuplicateCompleted(outcome.transported)
        ? `${preamble} That machine's record shows the call reached it and has ended there, but the result is no longer held. ${checkEffectsAdvice(givenUp)}`
        : lateOutcomeMessage(givenUp, outcome.transported);
    case "not_received":
      return givenUp.machineHadCall
        ? undefined
        : `${preamble} That machine has no record of it: it never ran there, and it is safe to send again if still wanted.`;
    case "host_restarted":
      return `${preamble} Claude Code on ${givenUp.hostName} has restarted since, and the command was lost with it \u2014 it may have partially run before the restart; check its effects before repeating it.`;
    case "still_running":
      return outcome.state === "running" && givenUp.toldAs !== "still_running"
        ? `${preamble} That machine now reports it IS running there; its outcome is not known yet \u2014 do not run it again.`
        : undefined;
    case "unknown":
    case "query_turned_away":
      return;
  }
}
export { RemoteCallLedger, isTransportFailure, interpretCallOutcome, hostEpochOf, isRefusedDrop };
