/**
 * remote/tools/serve/callStatusQuery.ts
 *
 * 2.1.316 新增：调用状态查询的说明文本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (11)
 * attribution: placement 11
 */
import { clipText, ANTHROPIC_REMOTETOOLEXECUTION } from "../protocolSchemas.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../protocolConstants.js";
import {
  DISOWNED,
  TERMINAL_CALL_STATES,
  JOINED_RETRY,
  REPLACED_BY_RETRY,
  LOST_IN_RESTART,
} from "../servedCallLog.js";
import { withdrawnRequestMessage } from "../../../services/remoteTools/hostRefusals.js";

//@ chunk-tr0s0d0k.js:6396-6588 placement
function withdrawnEnvelope({ target, callId, reason, message }) {
  let s = clipText(message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      call_id: callId,
      target,
      code: "withdrawn",
      reason,
      message: s,
    },
    content: [
      {
        type: "text",
        text: s,
      },
    ],
  };
}
//@ chunk-tr0s0d0k.js:6588-6836 placement
function failedEnvelope(target, facts, code, r, s = {}) {
  let d = clipText(r);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      ...(facts.envelope && {
        call_id: facts.envelope.call_id,
      }),
      target,
      code,
      message: d,
      ...s.partial,
      ...(s.notes !== undefined &&
        s.notes.length > 0 && {
          notes: s.notes,
        }),
    },
    content: [
      {
        type: "text",
        text: d,
      },
    ],
  };
}
//@ chunk-tr0s0d0k.js:6836-6908 placement
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-tr0s0d0k.js:6908-7485 placement
function isSessionDenial(e) {
  if (e?.envelope.outcome === "completed") {
    let { disposition } = e.envelope;
    return disposition === "ask_expired" || disposition === "denied_by_session"
      ? {
          state: "failed",
          code: disposition,
        }
      : {
          state: "completed",
          isError: e.envelope.is_error,
        };
  }
  if (e?.envelope.outcome === "needs_approval")
    return {
      state: "asked",
      askId: e.envelope.ask_id,
    };
  return {
    state: "failed",
    ...((e?.envelope.outcome === "failed" || e?.envelope.outcome === "refused") && {
      code: e.envelope.code,
    }),
    ...(e?.ranNothing === true && {
      ranNothing: true,
    }),
    ...(e?.envelope.outcome === "refused" &&
      e.envelope.reason !== undefined &&
      e.envelope.reason !== "unrecognized" && {
        endedAs: e.envelope.reason,
      }),
  };
}
//@ chunk-tr0s0d0k.js:7485-7986 placement
function describeLateArrival(name, n) {
  if (n.state === "failed" && n.code === DISOWNED) {
    let sliced = new Date(n.servedAt).toISOString().slice(11, 19);
    return `This call reached ${name} only after the session had been told (at ${sliced} UTC) that it never arrived here \u2014 it was not run.`;
  }
  return n.state === "failed" &&
    n.code !== undefined &&
    (TERMINAL_CALL_STATES.has(n.code) || n.code === "stale" || n.ranNothing === true)
    ? `This request was already answered on ${name}: nothing was run for it (${describeCallState(n)}).`
    : `This call was already delivered to ${name} (${describeCallState(n)}) \u2014 it was not run again.`;
}
//@ chunk-tr0s0d0k.js:7986-9018 placement
function describeCallState(e) {
  let sliced = new Date(e.servedAt).toISOString().slice(11, 19);
  switch (e.state) {
    case "received":
      return `it was received at ${sliced} UTC and is still being admitted`;
    case "running":
      return `it has been running since ${sliced} UTC`;
    case "asked":
      return `it has been waiting for the session's approval since ${sliced} UTC`;
    case "completed":
      return `it ${e.isError ? "completed with an error" : "completed"} at ${sliced} UTC`;
    case "failed":
      switch (e.code) {
        case "timed_out":
        case "cancelled":
          return e.ranNothing === true
            ? `it ended as ${e.code} at ${sliced} UTC`
            : `it ended as ${e.code} at ${sliced} UTC; if it had started, it may have partially run`;
        case JOINED_RETRY:
          return `at ${sliced} UTC it joined the same command already under way here from an earlier request, since forgotten`;
        case REPLACED_BY_RETRY:
          return `its permission question was handed to a newer request for the same command at ${sliced} UTC`;
        case LOST_IN_RESTART:
          return `it was started here at ${sliced} UTC and Claude Code on this machine restarted before its outcome was recorded: it may have partially run`;
        default:
          return `it ended as ${e.code ?? "failed"} at ${sliced} UTC`;
      }
  }
}
//@ chunk-tr0s0d0k.js:9018-9305 placement
function rebindEnvelopeCallId(e, callId) {
  let { envelope } = e;
  if (envelope.call_id === callId) return e;
  if (envelope.outcome !== "needs_approval" || envelope.elicitation === undefined)
    return {
      ...e,
      envelope: {
        ...envelope,
        call_id: callId,
      },
    };
  let r = envelope.elicitation._meta[ANTHROPIC_REMOTETOOLEXECUTION];
  return {
    ...e,
    envelope: {
      ...envelope,
      call_id: callId,
      elicitation: {
        ...envelope.elicitation,
        _meta: {
          [ANTHROPIC_REMOTETOOLEXECUTION]: {
            ...r,
            call_id: callId,
          },
        },
      },
    },
  };
}
//@ chunk-tr0s0d0k.js:9305-9473 placement
function markReplayed(e, servedAt) {
  let { envelope } = e;
  switch (envelope.outcome) {
    case "completed":
    case "refused":
    case "failed":
      return {
        ...e,
        envelope: {
          ...envelope,
          replayed: true,
          served_at: servedAt,
        },
      };
    default:
      return e;
  }
}
//@ chunk-tr0s0d0k.js:9473-10107 placement
function callStillRunningText({ target, callId, state, sinceMs, hostEpoch, outputTail }) {
  let max = Math.max(0, Math.round(sinceMs / 1000));
  let text =
    state === "running"
      ? `This call is still running on ${target.name} (received ${max} s ago); its outcome is not known yet.`
      : state === "admitting"
        ? `This call was received on ${target.name} ${max} s ago and is still being admitted; nothing has started yet.`
        : `This call is waiting on ${target.name} for the session's approval (received ${max} s ago); nothing has run yet.`;
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "in_progress",
      call_id: callId,
      target,
      state,
      since_ms: Math.max(0, Math.floor(sinceMs)),
      host_epoch: hostEpoch,
      ...(outputTail !== undefined && {
        output_tail: outputTail,
      }),
    },
    content: [
      {
        type: "text",
        text,
      },
    ],
  };
}
//@ chunk-tr0s0d0k.js:10107-10604 placement
function noCallRecordText({ target, callId, hostEpoch }) {
  let r =
    hostEpoch === undefined
      ? `${target.name} has no record of this call (it may never have arrived, or its record here was dropped); nothing is running for it here now.`
      : `${target.name} has no record of this call: it never arrived here, or this machine's Claude Code has restarted since; nothing is running for it here.`;
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      call_id: callId,
      target,
      code: "unknown_call",
      message: r,
      ...(hostEpoch !== undefined && {
        host_epoch: hostEpoch,
      }),
    },
    content: [
      {
        type: "text",
        text: r,
      },
    ],
  };
}
//@ chunk-tr0s0d0k.js:10604-10966 placement
function envelopeFromRecord(e, n, summary) {
  if (summary.state === "failed" && summary.code === "withdrawn" && summary.endedAs !== undefined)
    return withdrawnEnvelope({
      target: e,
      callId: n,
      reason: summary.endedAs,
      message:
        summary.endedMessage ??
        withdrawnRequestMessage({
          targetName: e.name,
          reason: summary.endedAs,
        }),
    });
  let content = [
    {
      type: "text",
      text: describeLateArrival(e.name, summary),
    },
  ];
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      call_id: n,
      target: e,
      is_error: true,
      content,
      disposition: "duplicate_call",
    },
    content,
  };
}
export {
  isSessionDenial,
  failedEnvelope,
  rebindEnvelopeCallId,
  envelopeFromRecord,
  noCallRecordText,
  callStillRunningText,
  markReplayed,
  isPlainObject,
  withdrawnEnvelope,
};
