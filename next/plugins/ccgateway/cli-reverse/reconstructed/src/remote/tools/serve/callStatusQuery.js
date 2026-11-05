/**
 * remote/tools/serve/callStatusQuery.ts
 *
 * 2.1.316 新增：调用状态查询的说明文本
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6d2p9h2d.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-6d2p9h2d.js:6642-6834 placement
function withdrawnEnvelope({ target, callId, reason, message }) {
  let clippedMessage = clipText(message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "refused",
      call_id: callId,
      target,
      code: "withdrawn",
      reason,
      message: clippedMessage,
    },
    content: [
      {
        type: "text",
        text: clippedMessage,
      },
    ],
  };
}
//@ chunk-6d2p9h2d.js:6834-7083 placement
function failedEnvelope(target, facts, code, message, options = {}) {
  let clippedMessage = clipText(message);
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "failed",
      ...(facts.envelope && {
        call_id: facts.envelope.call_id,
      }),
      target,
      code,
      message: clippedMessage,
      ...options.partial,
      ...(options.notes !== undefined &&
        options.notes.length > 0 && {
          notes: options.notes,
        }),
    },
    content: [
      {
        type: "text",
        text: clippedMessage,
      },
    ],
  };
}
//@ chunk-6d2p9h2d.js:7083-7155 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-6d2p9h2d.js:7155-7732 placement
function isSessionDenial(record) {
  if (record?.envelope.outcome === "completed") {
    let { disposition } = record.envelope;
    return disposition === "ask_expired" || disposition === "denied_by_session"
      ? {
          state: "failed",
          code: disposition,
        }
      : {
          state: "completed",
          isError: record.envelope.is_error,
        };
  }
  if (record?.envelope.outcome === "needs_approval")
    return {
      state: "asked",
      askId: record.envelope.ask_id,
    };
  return {
    state: "failed",
    ...((record?.envelope.outcome === "failed" || record?.envelope.outcome === "refused") && {
      code: record.envelope.code,
    }),
    ...(record?.ranNothing === true && {
      ranNothing: true,
    }),
    ...(record?.envelope.outcome === "refused" &&
      record.envelope.reason !== undefined &&
      record.envelope.reason !== "unrecognized" && {
        endedAs: record.envelope.reason,
      }),
  };
}
//@ chunk-6d2p9h2d.js:7732-8233 placement
function describeLateArrival(name, summary) {
  if (summary.state === "failed" && summary.code === DISOWNED) {
    let sliced = new Date(summary.servedAt).toISOString().slice(11, 19);
    return `This call reached ${name} only after the session had been told (at ${sliced} UTC) that it never arrived here \u2014 it was not run.`;
  }
  return summary.state === "failed" &&
    summary.code !== undefined &&
    (TERMINAL_CALL_STATES.has(summary.code) || summary.code === "stale" || summary.ranNothing === true)
    ? `This request was already answered on ${name}: nothing was run for it (${describeCallState(summary)}).`
    : `This call was already delivered to ${name} (${describeCallState(summary)}) \u2014 it was not run again.`;
}
//@ chunk-6d2p9h2d.js:8233-9265 placement
function describeCallState(summary) {
  let sliced = new Date(summary.servedAt).toISOString().slice(11, 19);
  switch (summary.state) {
    case "received":
      return `it was received at ${sliced} UTC and is still being admitted`;
    case "running":
      return `it has been running since ${sliced} UTC`;
    case "asked":
      return `it has been waiting for the session's approval since ${sliced} UTC`;
    case "completed":
      return `it ${summary.isError ? "completed with an error" : "completed"} at ${sliced} UTC`;
    case "failed":
      switch (summary.code) {
        case "timed_out":
        case "cancelled":
          return summary.ranNothing === true
            ? `it ended as ${summary.code} at ${sliced} UTC`
            : `it ended as ${summary.code} at ${sliced} UTC; if it had started, it may have partially run`;
        case JOINED_RETRY:
          return `at ${sliced} UTC it joined the same command already under way here from an earlier request, since forgotten`;
        case REPLACED_BY_RETRY:
          return `its permission question was handed to a newer request for the same command at ${sliced} UTC`;
        case LOST_IN_RESTART:
          return `it was started here at ${sliced} UTC and Claude Code on this machine restarted before its outcome was recorded: it may have partially run`;
        default:
          return `it ended as ${summary.code ?? "failed"} at ${sliced} UTC`;
      }
  }
}
//@ chunk-6d2p9h2d.js:9265-9552 placement
function rebindEnvelopeCallId(record, callId) {
  let { envelope } = record;
  if (envelope.call_id === callId) return record;
  if (envelope.outcome !== "needs_approval" || envelope.elicitation === undefined)
    return {
      ...record,
      envelope: {
        ...envelope,
        call_id: callId,
      },
    };
  let meta = envelope.elicitation._meta[ANTHROPIC_REMOTETOOLEXECUTION];
  return {
    ...record,
    envelope: {
      ...envelope,
      call_id: callId,
      elicitation: {
        ...envelope.elicitation,
        _meta: {
          [ANTHROPIC_REMOTETOOLEXECUTION]: {
            ...meta,
            call_id: callId,
          },
        },
      },
    },
  };
}
//@ chunk-6d2p9h2d.js:9552-9720 placement
function markReplayed(record, servedAt) {
  let { envelope } = record;
  switch (envelope.outcome) {
    case "completed":
    case "refused":
    case "failed":
      return {
        ...record,
        envelope: {
          ...envelope,
          replayed: true,
          served_at: servedAt,
        },
      };
    default:
      return record;
  }
}
//@ chunk-6d2p9h2d.js:9720-10354 placement
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
//@ chunk-6d2p9h2d.js:10354-10851 placement
function noCallRecordText({ target, callId, hostEpoch }) {
  let message =
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
      message,
      ...(hostEpoch !== undefined && {
        host_epoch: hostEpoch,
      }),
    },
    content: [
      {
        type: "text",
        text: message,
      },
    ],
  };
}
//@ chunk-6d2p9h2d.js:10851-11213 placement
function envelopeFromRecord(target, callId, summary) {
  if (summary.state === "failed" && summary.code === "withdrawn" && summary.endedAs !== undefined)
    return withdrawnEnvelope({
      target,
      callId,
      reason: summary.endedAs,
      message:
        summary.endedMessage ??
        withdrawnRequestMessage({
          targetName: target.name,
          reason: summary.endedAs,
        }),
    });
  let content = [
    {
      type: "text",
      text: describeLateArrival(target.name, summary),
    },
  ];
  return {
    envelope: {
      v: REMOTE_TOOL_PROTOCOL_VERSION,
      outcome: "completed",
      call_id: callId,
      target,
      is_error: true,
      content,
      disposition: "duplicate_call",
    },
    content,
  };
}
export {
  isSessionDenial,
  withdrawnEnvelope,
  failedEnvelope,
  rebindEnvelopeCallId,
  envelopeFromRecord,
  noCallRecordText,
  callStillRunningText,
  markReplayed,
  isPlainObject,
};
