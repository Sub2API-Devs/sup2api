/**
 * remote/tools/sessionEventTransport.ts
 *
 * 2.1.316 新增：基于会话事件的调用传输（发送、等待答复、存活探测、期限处理）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-25sm7c4g.js (29)
 * attribution: placement 29
 */
import { callPlumbingOverSession, BridgeSessionRecovery, mcpClientModule } from "./callPlumbing.js";
import { SLEEPING_GRACE_MS, LIVENESS_PROBE_TIMEOUT_MS } from "./protocolConstants.js";
import { clampToMaxPageSize, byteLengthOf } from "./callResults.js";
import { remoteToolsLogLevel, logRemoteTools } from "../../services/remoteTools/remoteToolsDebug.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, StreamClosedAbortError, AbortError } from "../../utils/errors.js";
import { buildServedCallRequest, readCallResult } from "./toolDescriptors.js";
import {
  isRemoteToolCallMeta,
  ANTHROPIC_REMOTETOOLEXECUTION,
  SENDER_BELOW_FLOOR,
  parseAnnounce,
} from "./protocolSchemas.js";
import {
  RequestNotDeliveredError,
  RequestDeliveryUnknownError,
  ServingInstanceGoneError,
} from "../../services/remoteTools/servingErrors.js";
import { withDeadline, raceWithAbortSignal } from "../../utils/sleep.js";
import { currentMcpClients } from "../../services/compact/idleToolResultClearing.js";
import { serverCacheKey } from "../../services/mcp/client.js";
import { syncRemoteToolTargets, refreshDeviceBridgeTargets } from "./remoteToolTargets.js";

//@ chunk-25sm7c4g.js:10503-10578 placement
/**
 * 导出常量或表 `SESSION_TRANSPORT_LIMITS`：值为 { maxRequestBytes: 4128768, defaultDeadlineMs: 58000 }, he = 60000, PROBE_DEADLINE_MS = 1e4。
 */
var SESSION_TRANSPORT_LIMITS = {
  maxRequestBytes: 4128768,
  defaultDeadlineMs: 58000,
};
var HOST_SILENCE_MS = 60000;
var PROBE_DEADLINE_MS = 1e4;
//@ chunk-25sm7c4g.js:10578-12284 placement
function createSessionEventTransport(e) {
  let n = {
    stale: false,
    quietMisses: [],
  };
  let limits = e.limits ?? SESSION_TRANSPORT_LIMITS;
  return {
    kind: "session",
    limits,
    call: (o, u, s, m) => callOverSessionChannel(e, n, limits, o, u, s, m),
    markUnresponsive: () => {
      n.stale = true;
    },
    checkLive: async ({ signal, hold }) => {
      let s = e.host();
      let m = s?.live();
      let now = e.now ?? Date.now;
      if (
        s === undefined ||
        m === undefined ||
        signal.aborted ||
        !(m.status === "offline" || n.stale || now() - m.lastHeardAt > HOST_SILENCE_MS)
      )
        return;
      if (isHostAsleep(s, now())) return unreachableOutcome(s);
      let f = await probeMachine(e, n, s, signal);
      if (f === "missed" && hold !== undefined && s.live()?.status === "online" && !n.stale) {
        hold.notify("waiting");
        f = await holdForLiveness(e, n, s, signal, hold.ms);
        if (f === "there") hold.notify("back");
      }
      if (f !== "missed") return;
      s.markAway("probe_missed");
      return unreachableOutcome(s);
    },
    saidAsleep: () => e.host()?.live()?.asleepSince !== undefined,
    probeLive: async ({ signal }) => {
      let u = e.host();
      if (u === undefined || u.live() === undefined || signal.aborted) return;
      let s = (e.now ?? Date.now)();
      let m = await sendLivenessProbe(e, u, signal);
      let p = (u.live()?.lastHeardAt ?? -1 / 0) > s;
      if (m === "answered" || p) {
        n.stale = false;
        return true;
      }
      if (m !== "missed") return;
      u.markAway("probe_missed");
      return false;
    },
    isAway: () => e.host()?.live()?.status === "offline",
    silence: {
      quietForMs: () => {
        let o = e.host()?.live();
        return o === undefined || o.status === "offline" || o.asleepSince !== undefined
          ? undefined
          : (e.now ?? Date.now)() - o.lastHeardAt;
      },
      probe: (o) => quietProbe(e, n, o),
      missed: () => currentQuietMisses(e, n),
      ownStreamFrameAt: () => e.sender.readStreamFrameAt?.(),
      giveUp: () => {
        e.host()?.markAway("probe_missed");
      },
    },
    isRechecked: () => e.rechecked?.() === true,
    ...(e.sender.withdrawStandingServedCall !== undefined && {
      withdrawStanding: (o) => {
        e.sender.withdrawStandingServedCall?.(o);
      },
    }),
    callPlumbing: async (o, u, s) => {
      let m = e.host();
      if (m === undefined)
        return {
          kind: "unreachable",
          detail: "the machine is no longer announced on this session",
        };
      let p = await callPlumbingOverSession(
        e.sender,
        {
          instanceId: m.instanceId,
          host: m.hostName,
        },
        o,
        u,
        s,
      );
      if (p.kind === "result") m.heard((e.now ?? Date.now)());
      return p;
    },
  };
}
//@ chunk-25sm7c4g.js:12284-12751 placement
function unreachableOutcome(e) {
  let n = e.live();
  return n?.asleepSince !== undefined
    ? {
        kind: "unreachable",
        detail: "it said it was going to sleep",
        machineNotAnswering: true,
        saidAsleep: true,
        lastHeardAt: n.asleepSince,
      }
    : {
        kind: "unreachable",
        detail: "the machine did not answer a liveness check on this session; nothing was sent",
        machineNotAnswering: true,
        ...(n !== undefined && {
          lastHeardAt: Math.max(n.lastHeardAt, n.lastStillHereAt ?? 0),
        }),
        ...(n?.lastStillHereAt !== undefined &&
          n.lastStillHereAt > n.lastHeardAt && {
            saidBusy: true,
          }),
      };
}
//@ chunk-25sm7c4g.js:12751-12829 placement
function isHostAsleep(e, n) {
  let asleepSince = e.live()?.asleepSince;
  return asleepSince !== undefined && n >= asleepSince && n - asleepSince < SLEEPING_GRACE_MS;
}
//@ chunk-25sm7c4g.js:12829-16676 placement
/**
 * 经会话事件流把调用发给附着机器：检查在线/睡眠、发送、等待回复或截止、活性探测。
 */
async function callOverSessionChannel(e, n, limits, o, input, s, m) {
  let now = e.now ?? Date.now;
  if (m.signal.aborted)
    return {
      kind: "cancelled",
    };
  let f = e.host();
  let _ = f?.live();
  if (f === undefined || _ === undefined)
    return {
      kind: "unreachable",
      detail: "the machine is not announcing on this session",
      machineNotAnswering: true,
      ...(e.signedOff?.() === true && {
        signedOff: true,
        ...leftForOutcome(e.leftFor?.()),
      }),
    };
  let g = "op" in s && s.op === "outcome_of";
  if (!g && (_.status === "offline" || n.stale || now() - _.lastHeardAt > HOST_SILENCE_MS)) {
    if (isHostAsleep(f, now())) return unreachableOutcome(f);
    let C = now();
    let E = await sendLivenessProbe(e, f, m.signal);
    if (E === "cancelled")
      return {
        kind: "cancelled",
      };
    if (E === "unsent")
      return {
        kind: "unreachable",
        detail: "this session's event stream is not accepting requests; nothing was sent",
      };
    if (E === "stalled" || E === "taken_back")
      return {
        kind: "stalled",
        capMs: e.probeDeadlineMs ?? PROBE_DEADLINE_MS,
        request: "probe",
        takenBack: E === "taken_back",
      };
    if (E === "stream_lost")
      return {
        kind: "unreachable",
        detail:
          "this session could not complete the liveness check for a reason on its own side (its event stream closed, the service refused the write that carried it, or that write had not completed in time); the machine was not reached and nothing was sent",
      };
    let B = E === "missed" && (f.live()?.lastHeardAt ?? -1 / 0) > C;
    if (E !== "answered" && !B) {
      if (E === "missed") f.markAway("probe_missed");
      let D = e.host();
      let ne = D?.live();
      if (D === undefined || D.instanceId === f.instanceId || ne === undefined || ne.status === "offline")
        return E === "gone"
          ? {
              kind: "unreachable",
              detail:
                "the machine withdrew from this session while it was being asked whether it is still there; nothing was sent",
              machineNotAnswering: true,
              signedOff: true,
              ...leftForOutcome(e.leftFor?.()),
            }
          : unreachableOutcome(f);
      f = D;
    }
    n.stale = false;
  }
  let w = clampToMaxPageSize(m.deadlineMs);
  let S = now();
  let R = f.epoch();
  let sentUnderEpoch =
    R === undefined
      ? {}
      : {
          sentUnderEpoch: R,
        };
  let A = "op" in s ? s.op : s.approval ? 2 : 1;
  let M = remoteToolsLogLevel(A);
  let y = {
    posts: 0,
  };
  let onUpload = (C) => {
    switch (C) {
      case "sending":
        y.posts += 1;
        y.startedAt ??= now();
        logRemoteTools(
          s.call_id,
          "post started",
          {
            leg: A,
            queue_ms: y.startedAt - S,
            attempt: y.posts,
          },
          M,
        );
        return;
      case "accepted":
        if (y.acceptedAt === undefined) {
          y.acceptedAt = now();
          try {
            m.onAccepted?.();
          } catch (error) {
            logForDebugging(`[remote-tools] a leg's acceptance was not reported: ${errorMessage(error)}`);
          }
        }
        logRemoteTools(
          s.call_id,
          "post accepted",
          {
            leg: A,
            post_ms: y.startedAt === undefined ? undefined : y.acceptedAt - y.startedAt,
            attempt: y.posts,
          },
          M,
        );
        return;
      case "not_accepted":
      case "indeterminate":
        logRemoteTools(
          s.call_id,
          "post not accepted",
          {
            leg: A,
            phase: C,
            attempt: y.posts,
          },
          M,
        );
    }
  };
  let q;
  let P;
  try {
    P = e.sender.sendServedCallRequest({
      onUpload,
      request: {
        subtype: "remote_tool_call",
        ...buildServedCallRequest({
          instanceId: f.instanceId,
          host: f.hostName,
          name: o,
          input,
          envelope: s,
          toolUseId: m.toolUseId,
          issuedAt: S,
          deadlineMs: w,
        }),
      },
      accepts: (C) => {
        if (!isReplyForCallSafe(C, s.call_id)) return false;
        if (g && isRemoteToolCallMeta(C)) {
          q = C;
          return false;
        }
        return true;
      },
      signal: m.signal,
    });
  } catch (error) {
    return {
      kind: "transport_error",
      detail: `send failed: ${errorMessage(error)}`,
    };
  }
  if (!P.sent)
    return {
      kind: "unreachable",
      detail: "this session's event stream is closed; nothing was sent",
    };
  logRemoteTools(s.call_id, "sent", {
    leg: A,
    host_inst: f.instanceId,
    host_epoch: R,
    deadline_ms: w,
  });
  m.onSent?.({
    instanceId: f.instanceId,
    epoch: R,
    requestId: P.requestId,
  });
  let U = !g && !("approval" in s && s.approval?.decision === "deny");
  let { settled, late } = await awaitCallReply(P, w, m.signal, {
    holdAtDeadline: m.onHeldAtDeadline !== undefined,
    withdrawable: U,
  });
  let O = (settled) => {
    let callAtDeadline = resolveCallAtDeadline(settled, {
      state: n,
      limits,
      entry: f,
      sent: P,
      toolName: o,
      callId: s.call_id,
      capMs: w,
      held: late !== undefined,
      sentUnderEpoch,
      elapsedMs: () => now() - S,
      heardNow: () => now(),
      heldBelowFloorAnswer: () => q,
    });
    if (callAtDeadline.kind === "result")
      try {
        let B = now();
        let D = {
          ...(y.startedAt !== undefined && {
            queueMs: y.startedAt - S,
          }),
          ...(y.startedAt !== undefined &&
            y.acceptedAt !== undefined && {
              postMs: y.acceptedAt - y.startedAt,
            }),
          ...(y.acceptedAt !== undefined && {
            replyWaitMs: B - y.acceptedAt,
          }),
          totalMs: B - S,
          posts: y.posts,
        };
        logRemoteTools(
          s.call_id,
          "answered",
          {
            leg: A,
            total_ms: D.totalMs,
            queue_ms: D.queueMs,
            post_ms: D.postMs,
            reply_wait_ms: D.replyWaitMs,
            posts: D.posts,
          },
          M,
        );
        m.onTransit?.(D);
      } catch (error) {
        logForDebugging(`[remote-tools] a leg's transit was not reported: ${errorMessage(error)}`);
      }
    return callAtDeadline;
  };
  if (late !== undefined)
    m.onHeldAtDeadline?.({
      late: late.then(O),
      withdraw: () => P.cancel(),
      takeBack: () => U && P.withdraw(),
      accepted: () => {
        let C = P.delivery();
        return C === "delivered" || C === "untracked";
      },
    });
  return O(settled);
}
//@ chunk-25sm7c4g.js:16676-18944 placement
function resolveCallAtDeadline(
  e,
  {
    state,
    limits,
    entry,
    sent,
    toolName,
    callId,
    capMs,
    held,
    sentUnderEpoch,
    elapsedMs,
    heardNow,
    heldBelowFloorAnswer,
  },
) {
  let R = () => {
    let T = heldBelowFloorAnswer();
    if (T === undefined) return;
    logRemoteTools(callId, "query deadline; taking the below-floor answer held for it", {
      deadline_ms: capMs,
      host_inst: entry.instanceId,
    });
    let callReply = readCallReply(T, elapsedMs());
    return callReply.kind === "dropped"
      ? {
          ...callReply,
          ...sentUnderEpoch,
        }
      : callReply;
  };
  switch (e.kind) {
    case "answered": {
      let callReply = readCallReply(e.payload, elapsedMs());
      if (isFreshReply(callReply)) {
        state.stale = false;
        entry.heard(heardNow());
      }
      return callReply.kind === "dropped"
        ? {
            ...callReply,
            ...sentUnderEpoch,
          }
        : callReply;
    }
    case "deadline": {
      let T = R();
      if (T !== undefined) return T;
      if (held) {
        logRemoteTools(callId, "no answer by the deadline; request left standing, checking on it", {
          deadline_ms: capMs,
          host_inst: entry.instanceId,
        });
        return {
          kind: "timed_out",
          capMs,
          ...sentUnderEpoch,
        };
      }
      logRemoteTools(callId, "no answer by the deadline; request withdrawn", {
        deadline_ms: capMs,
        host_inst: entry.instanceId,
        error_replies_ignored: sent.errorRepliesIgnored(),
      });
      if (capMs >= limits.defaultDeadlineMs) state.stale = true;
      return {
        kind: "timed_out",
        capMs,
        ...sentUnderEpoch,
      };
    }
    case "stalled":
      logRemoteTools(
        callId,
        e.takenBack
          ? "still queued here at the deadline; taken back before any write carried it"
          : "still queued here at the deadline; cancelled behind it",
        {
          deadline_ms: capMs,
          host_inst: entry.instanceId,
        },
      );
      return {
        kind: "stalled",
        capMs,
        request: "call",
        takenBack: e.takenBack,
      };
    case "unconfirmed": {
      let T = R();
      if (T !== undefined) return T;
      logRemoteTools(
        callId,
        "deadline reached with the write carrying the request unresolved; withdrawn, delivery unknown",
        {
          deadline_ms: capMs,
          host_inst: entry.instanceId,
          delivery: e.delivery,
        },
      );
      return {
        kind: "dropped",
        why: "write_unresolved",
        detail:
          "the write carrying the request to the session service had not completed, or ended without an answer, by its deadline; whether the machine received it is unknown",
        ...sentUnderEpoch,
      };
    }
    case "cancelled":
      return {
        kind: "cancelled",
      };
    case "dropped":
      return {
        kind: "dropped",
        detail: "this session's event stream closed after the call was sent",
        ...sentUnderEpoch,
      };
    case "undelivered":
      return {
        kind: "unreachable",
        detail: `the session service refused the request${e.status !== undefined ? ` (HTTP ${e.status})` : ""}; nothing was delivered`,
      };
    case "delivery_unknown":
      return {
        kind: "dropped",
        detail: `an upload of the request ended without an answer and a later attempt was refused${e.status !== undefined ? ` (HTTP ${e.status})` : ""}; whether the machine received it is unknown`,
        ...sentUnderEpoch,
      };
    case "gone":
      return {
        kind: "host_gone",
        why: e.why,
        unsent: e.unsent,
      };
    case "failed":
      return {
        kind: "transport_error",
        detail: e.detail,
      };
  }
}
//@ chunk-25sm7c4g.js:18944-19807 placement
async function awaitCallReply(e, n, r, { holdAtDeadline, withdrawable }) {
  let s = e.reply.then(
    (payload) => ({
      kind: "answered",
      payload,
    }),
    (error) => {
      if (r.aborted)
        return {
          kind: "cancelled",
        };
      if (error instanceof RequestNotDeliveredError)
        return {
          kind: "undelivered",
          status: error.status,
        };
      if (error instanceof RequestDeliveryUnknownError)
        return {
          kind: "delivery_unknown",
          status: error.status,
        };
      if (error instanceof StreamClosedAbortError)
        return {
          kind: "dropped",
        };
      if (error instanceof ServingInstanceGoneError)
        return {
          kind: "gone",
          why: error.why,
          unsent: e.delivery() === "queued",
        };
      return {
        kind: "failed",
        detail: errorMessage(error),
      };
    },
  );
  let m = await withDeadline(s, n);
  if (m !== undefined)
    return {
      settled: m,
      late: undefined,
    };
  let p = e.delivery();
  if (p === "queued") {
    if (withdrawable && e.withdraw())
      return {
        settled: {
          kind: "stalled",
          takenBack: true,
        },
        late: undefined,
      };
    e.cancel();
    return {
      settled: {
        kind: "stalled",
        takenBack: false,
      },
      late: undefined,
    };
  }
  if (holdAtDeadline)
    return {
      settled: {
        kind: "deadline",
      },
      late: s,
    };
  e.cancel();
  return {
    settled:
      p === "in_flight" || p === "indeterminate"
        ? {
            kind: "unconfirmed",
            delivery: p,
          }
        : {
            kind: "deadline",
          },
    late: undefined,
  };
}
//@ chunk-25sm7c4g.js:19807-19912 placement
function isRefusalReply(e) {
  return e.kind === "approval_unverified" || (e.kind === "result" && e.envelope?.outcome === "refused");
}
//@ chunk-25sm7c4g.js:19912-19960 placement
function isFreshReply(callReply) {
  return !isRefusalReply(callReply) && callReply.kind !== "dropped";
}
//@ chunk-25sm7c4g.js:19960-20092 placement
function isReplyForCallSafe(e, callId) {
  try {
    return isReplyForCall(e, callId);
  } catch (error) {
    logForDebugging(`[remote-tools] an unreadable reply was not taken as an answer: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-25sm7c4g.js:20092-20279 placement
function isReplyForCall(e, n) {
  let r = isPlainObject(e) ? e.result : undefined;
  let callResult = readCallResult(r);
  switch (callResult.envelope.status) {
    case "present":
      return callResult.envelope.envelope.call_id === n;
    case "malformed":
      return readMalformedReplyCallId(r) === n;
    case "absent":
      return false;
  }
}
//@ chunk-25sm7c4g.js:20279-20389 placement
function readMalformedReplyCallId(e) {
  if (!isPlainObject(e)) return;
  return [e.structuredContent, e._meta]
    .filter(isPlainObject)
    .map((r) => r[ANTHROPIC_REMOTETOOLEXECUTION])
    .find(isPlainObject)?.call_id;
}
//@ chunk-25sm7c4g.js:20389-21466 placement
function readCallReply(e, n) {
  if (isRemoteToolCallMeta(e)) {
    let { [SENDER_BELOW_FLOOR]: s, ...m } = e;
    let callReply = readCallReply(m, n);
    let envelope =
      callReply.kind === "result" && callReply.envelope?.outcome === "refused"
        ? callReply.envelope
        : undefined;
    return {
      kind: "dropped",
      why: "unverified_refusal",
      detail:
        "a sender this session could not verify reported the call refused; the machine itself is asked what became of it",
      ...(callReply.kind === "result" &&
        envelope !== undefined && {
          reported: {
            kind: "result",
            content: "",
            isError: callReply.isError,
            envelope: {
              v: envelope.v,
              outcome: envelope.outcome,
              target: {
                name: "",
                working_dir: "",
              },
              code: envelope.code,
              ...(envelope.reason !== undefined && {
                reason: envelope.reason,
              }),
              ...(envelope.limit !== undefined && {
                limit: envelope.limit,
              }),
              message: "",
            },
            elapsedMs: callReply.elapsedMs,
            responseBytes: callReply.responseBytes,
          },
        }),
    };
  }
  let r = isPlainObject(e) ? e.result : undefined;
  let callResult = readCallResult(r);
  if (callResult.envelope.status === "malformed")
    return {
      kind: "transport_error",
      detail: "malformed result envelope",
      unreadableResult: true,
    };
  if (callResult.envelope.status === "absent")
    return {
      kind: "transport_error",
      detail: "answer without an envelope",
    };
  let envelope = callResult.envelope.envelope;
  if (envelope.outcome === "refused" && envelope.code === "no_approval")
    return {
      kind: "approval_unverified",
    };
  return {
    kind: "result",
    content: callResult.content,
    isError: callResult.isError,
    envelope,
    elapsedMs: n,
    responseBytes: byteLengthOf(r),
    ...{},
  };
}
//@ chunk-25sm7c4g.js:21466-21787 placement
async function probeMachine(e, n, r, o) {
  let u = (e.now ?? Date.now)();
  let s = await sendLivenessProbe(e, r, o);
  let m = (r.live()?.lastHeardAt ?? -1 / 0) > u;
  let p = e.host();
  let f = p?.instanceId !== r.instanceId;
  if (s === "answered" || (s === "missed" && (m || f))) n.stale = false;
  if (s === "answered" || (s === "missed" && m) || (s !== "cancelled" && f && p !== undefined))
    return "there";
  return s === "missed" && !f ? "missed" : "unknown";
}
//@ chunk-25sm7c4g.js:21787-22092 placement
async function holdForLiveness(e, n, r, signal, ms) {
  if (n.hold === undefined) {
    let abortController = new AbortController();
    let p = probeUntilAnswered(e, n, r, abortController.signal, ms);
    n.hold = {
      ended: p.finally(() => {
        n.hold = undefined;
      }),
      stop: abortController,
      waiting: 0,
    };
  }
  let hold = n.hold;
  hold.waiting += 1;
  try {
    return await raceWithAbortSignal(hold.ended, signal, () => new AbortError());
  } catch {
    return "unknown";
  } finally {
    hold.waiting -= 1;
    if (hold.waiting === 0) hold.stop.abort();
  }
}
//@ chunk-25sm7c4g.js:22092-22236 placement
async function probeUntilAnswered(e, n, r, signal, u) {
  let probeDeadlineMs = e.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  for (let m = u; m > 0; m -= probeDeadlineMs) {
    let p = await probeMachine(e, n, r, signal);
    if (p !== "missed") return p;
  }
  return "missed";
}
//@ chunk-25sm7c4g.js:22236-22380 placement
function currentQuietMisses(e, n) {
  let r = n.quietMisses[0];
  let o = e.host()?.live();
  if (r !== undefined && (o === undefined || wasHeardAfter(o, r.writtenAt))) n.quietMisses = [];
  return n.quietMisses;
}
//@ chunk-25sm7c4g.js:22380-22469 placement
function wasHeardAfter(e, n) {
  return e.lastHeardAt > n || (e.lastStillHereAt !== undefined && e.lastStillHereAt > n);
}
//@ chunk-25sm7c4g.js:22469-23201 placement
function quietProbe(e, n, r) {
  if (n.quietProbe !== undefined) return n.quietProbe;
  let o = e.host();
  let u = o?.live();
  if (o === undefined || u === undefined || u.asleepSince !== undefined) return Promise.resolve(undefined);
  let s = (e.now ?? Date.now)();
  let m = r ?? e.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  let p = sendLivenessProbe(e, o, new AbortController().signal, {
    putWithinMs: LIVENESS_PROBE_TIMEOUT_MS,
    deadlineMs: m,
  })
    .then((f) => {
      let _ = o.live();
      if (f === "answered" || (f === "missed" && _ !== undefined && wasHeardAfter(_, s))) {
        if (f === "answered" || (_?.lastHeardAt ?? -1 / 0) > s) n.stale = false;
        n.quietMisses = [];
        return true;
      }
      if (f !== "missed" || _ === undefined || _.asleepSince !== undefined) return;
      n.quietMisses = [
        ...currentQuietMisses(e, n),
        {
          writtenAt: s,
          waitedMs: m,
        },
      ];
      return false;
    })
    .catch((error) => {
      logForDebugging(`[remote-tools] a liveness probe for a waiting call failed: ${errorMessage(error)}`);
      return;
    })
    .finally(() => {
      n.quietProbe = undefined;
    });
  n.quietProbe = p;
  return p;
}
//@ chunk-25sm7c4g.js:23201-24195 placement
async function sendLivenessProbe(e, n, signal, o) {
  let now = e.now ?? Date.now;
  let s = o?.deadlineMs ?? e.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  let m = now();
  let p;
  let f;
  try {
    f = e.sender.sendServedCallRequest({
      request: {
        subtype: "remote_tools_probe",
        instance_id: n.instanceId,
        issued_at: m,
        deadline_ms: s,
      },
      accepts: acceptsAnnounceResult,
      signal,
      ...(o !== undefined && {
        onUpload: (g) => {
          if (g === "accepted") p ??= now();
        },
      }),
    });
  } catch (error) {
    logForDebugging(
      `[remote-tools] liveness probe to ${n.hostName} could not be sent: ${errorMessage(error)}`,
    );
    return "unsent";
  }
  if (!f.sent) return "unsent";
  let { settled } = await awaitCallReply(f, s, signal, {
    holdAtDeadline: false,
    withdrawable: true,
  });
  if (settled.kind === "answered") {
    let g = isPlainObject(settled.payload) ? settled.payload.result : undefined;
    n.heard(now(), isPlainObject(g) ? parseAnnounce(g.epoch) : undefined);
    return "answered";
  }
  switch (settled.kind) {
    case "cancelled":
      return "cancelled";
    case "undelivered":
    case "failed":
      return "unsent";
    case "stalled":
      return settled.takenBack ? "taken_back" : "stalled";
    case "gone":
      return "gone";
    case "deadline":
      return o !== undefined &&
        (p === undefined || m + s - p < (e.probeDeadlineMs ?? PROBE_DEADLINE_MS) - o.putWithinMs)
        ? "stream_lost"
        : "missed";
    case "dropped":
    case "delivery_unknown":
    case "unconfirmed":
      return "stream_lost";
  }
}
//@ chunk-25sm7c4g.js:24195-24272 placement
function acceptsAnnounceResult(e) {
  let n = isPlainObject(e) ? e.result : undefined;
  return isPlainObject(n) && parseAnnounce(n.epoch) !== undefined;
}
//@ chunk-25sm7c4g.js:24272-24320 placement
function leftForOutcome(e) {
  return e === undefined
    ? {}
    : {
        leftFor: e,
      };
}
//@ chunk-25sm7c4g.js:24320-24390 placement
function isPlainObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-25sm7c4g.js:24390-24485 placement
function remoteToolsContext(e) {
  return {
    toolState: e.toolState,
    agentContext: e.agentContext,
    mcpClients: () => currentMcpClients(e),
  };
}
//@ chunk-25sm7c4g.js:24485-24537 placement
/**
 * 远程工具目标的列表节奏：首次探测 8 s 截止、分页上限 5000、失败清单 30 s 内不重试、失效记录仅当失败超过 2 s 才记，重新列举最短 5 s / 最长 30 s，临时目标 60 s 内视为新鲜。
 */
var REMOTE_TARGET_TIMINGS = 8000;
var MAX_LIST_PAGE_SIZE = 5000;
var FAILED_LIST_RETRY_MS = 30000;
var FAILED_LIST_WINDOW_MS = 2000;
var MIN_RELIST_INTERVAL_MS = 5000;
var PROVISIONAL_FRESH_MS = 60000;
//@ chunk-25sm7c4g.js:24537-24796 placement
class RemoteToolTargetsState {
  recovery = new BridgeSessionRecovery();
  connection = undefined;
  listingMemo = undefined;
  synced = false;
  lastListingFailed = false;
  lastForcedRelistAt = undefined;
  reportedUnmatched = false;
  provisional = undefined;
  setAside = 0;
  offer = "unread";
  lastListedAt = undefined;
  unconnectedSince = undefined;
  failedAt = undefined;
  inFlight = undefined;
}
//@ chunk-25sm7c4g.js:24796-25197 placement
function nextListingInterval(e) {
  let n = e.toolState.get(RemoteToolTargetsState);
  let now = Date.now();
  let o =
    n.provisional !== undefined && (n.provisional.stub || now - n.provisional.since < PROVISIONAL_FRESH_MS)
      ? MIN_RELIST_INTERVAL_MS
      : MAX_RELIST_INTERVAL_MS;
  if (
    (n.lastForcedRelistAt !== undefined && now - n.lastForcedRelistAt < o) ||
    (n.lastListedAt !== undefined && now - n.lastListedAt < MIN_RELIST_INTERVAL_MS)
  )
    return false;
  n.lastForcedRelistAt = now;
  let connection = n.connection;
  if (connection !== undefined)
    mcpClientModule().fetchToolsForClient.cache.delete(serverCacheKey(connection.name, connection.config));
  n.synced = false;
  n.listingMemo = undefined;
  return true;
}
//@ chunk-25sm7c4g.js:25197-25210 placement
var MAX_RELIST_INTERVAL_MS = 30000;
//@ chunk-25sm7c4g.js:25210-25274 placement
async function refreshRemoteToolTargets(e, n, r) {
  syncRemoteToolTargets(e, n, r);
  await refreshDeviceBridgeTargets(e, n, r);
  syncRemoteToolTargets(e, n, r);
}
export {
  RemoteToolTargetsState,
  FAILED_LIST_RETRY_MS,
  REMOTE_TARGET_TIMINGS,
  MAX_LIST_PAGE_SIZE,
  FAILED_LIST_WINDOW_MS,
  SESSION_TRANSPORT_LIMITS,
  MIN_RELIST_INTERVAL_MS,
  PROVISIONAL_FRESH_MS,
  refreshRemoteToolTargets,
  remoteToolsContext,
  nextListingInterval,
  PROBE_DEADLINE_MS,
};
