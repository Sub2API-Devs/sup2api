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
import { ylr, _lr } from "./protocolConstants.js";
import { AJ, iv } from "./callResults.js";
import { Can, logRemoteTools } from "../../services/remoteTools/remoteToolsDebug.js";
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
import { ir } from "../../services/mcp/client.js";
import { syncRemoteToolTargets, refreshDeviceBridgeTargets } from "./remoteToolTargets.js";

//@ chunk-25sm7c4g.js:10503-10578 placement
var SESSION_TRANSPORT_LIMITS = { maxRequestBytes: 4128768, defaultDeadlineMs: 58000 },
  he = 60000,
  PROBE_DEADLINE_MS = 1e4;
//@ chunk-25sm7c4g.js:10578-12284 placement
function createSessionEventTransport(e) {
  let n = { stale: !1, quietMisses: [] },
    r = e.limits ?? SESSION_TRANSPORT_LIMITS;
  return {
    kind: "session",
    limits: r,
    call: (o, u, s, m) => callOverSessionChannel(e, n, r, o, u, s, m),
    markUnresponsive: () => {
      n.stale = !0;
    },
    checkLive: async ({ signal: signal, hold: hold }) => {
      let host = e.host(),
        m = host?.live(),
        p = e.now ?? Date.now;
      if (
        host === void 0 ||
        m === void 0 ||
        signal.aborted ||
        !(m.status === "offline" || n.stale || p() - m.lastHeardAt > he)
      )
        return;
      if (_e(host, p())) return unreachableOutcome(host);
      let f = await probeMachine(e, n, host, signal);
      if (f === "missed" && hold !== void 0 && host.live()?.status === "online" && !n.stale) {
        if ((hold.notify("waiting"), (f = await holdForLiveness(e, n, host, signal, hold.ms)), f === "there"))
          hold.notify("back");
      }
      if (f !== "missed") return;
      return (host.markAway("probe_missed"), unreachableOutcome(host));
    },
    saidAsleep: () => e.host()?.live()?.asleepSince !== void 0,
    probeLive: async ({ signal: signal }) => {
      let host = e.host();
      if (host === void 0 || host.live() === void 0 || signal.aborted) return;
      let s = (e.now ?? Date.now)(),
        m = await sendLivenessProbe(e, host, signal),
        p = (host.live()?.lastHeardAt ?? -1 / 0) > s;
      if (m === "answered" || p) return ((n.stale = !1), !0);
      if (m !== "missed") return;
      return (host.markAway("probe_missed"), !1);
    },
    isAway: () => e.host()?.live()?.status === "offline",
    silence: {
      quietForMs: () => {
        let o = e.host()?.live();
        return o === void 0 || o.status === "offline" || o.asleepSince !== void 0
          ? void 0
          : (e.now ?? Date.now)() - o.lastHeardAt;
      },
      probe: (o) => quietProbe(e, n, o),
      missed: () => currentQuietMisses(e, n),
      ownStreamFrameAt: () => e.sender.readStreamFrameAt?.(),
      giveUp: () => {
        e.host()?.markAway("probe_missed");
      },
    },
    isRechecked: () => e.rechecked?.() === !0,
    ...(e.sender.withdrawStandingServedCall !== void 0 && {
      withdrawStanding: (o) => {
        e.sender.withdrawStandingServedCall?.(o);
      },
    }),
    callPlumbing: async (o, u, s) => {
      let host = e.host();
      if (host === void 0)
        return { kind: "unreachable", detail: "the machine is no longer announced on this session" };
      let p = await callPlumbingOverSession(
        e.sender,
        { instanceId: host.instanceId, host: host.hostName },
        o,
        u,
        s,
      );
      if (p.kind === "result") host.heard((e.now ?? Date.now)());
      return p;
    },
  };
}
//@ chunk-25sm7c4g.js:12284-12751 placement
function unreachableOutcome(e) {
  let live = e.live();
  return live?.asleepSince !== void 0
    ? {
        kind: "unreachable",
        detail: "it said it was going to sleep",
        machineNotAnswering: !0,
        saidAsleep: !0,
        lastHeardAt: live.asleepSince,
      }
    : {
        kind: "unreachable",
        detail: "the machine did not answer a liveness check on this session; nothing was sent",
        machineNotAnswering: !0,
        ...(live !== void 0 && { lastHeardAt: Math.max(live.lastHeardAt, live.lastStillHereAt ?? 0) }),
        ...(live?.lastStillHereAt !== void 0 && live.lastStillHereAt > live.lastHeardAt && { saidBusy: !0 }),
      };
}
//@ chunk-25sm7c4g.js:12751-12829 placement
function _e(e, n) {
  let r = e.live()?.asleepSince;
  return r !== void 0 && n >= r && n - r < ylr;
}
/**
 * 经会话事件流把调用发给附着机器：检查在线/睡眠、发送、等待回复或截止、活性探测。
 */
//@ chunk-25sm7c4g.js:12829-16676 placement
async function callOverSessionChannel(e, n, r, o, u, s, m) {
  let p = e.now ?? Date.now;
  if (m.signal.aborted) return { kind: "cancelled" };
  let host = e.host(),
    _ = host?.live();
  if (host === void 0 || _ === void 0)
    return {
      kind: "unreachable",
      detail: "the machine is not announcing on this session",
      machineNotAnswering: !0,
      ...(e.signedOff?.() === !0 && { signedOff: !0, ...ge(e.leftFor?.()) }),
    };
  let g = "op" in s && s.op === "outcome_of";
  if (!g && (_.status === "offline" || n.stale || p() - _.lastHeardAt > he)) {
    if (_e(host, p())) return unreachableOutcome(host);
    let C = p(),
      E = await sendLivenessProbe(e, host, m.signal);
    if (E === "cancelled") return { kind: "cancelled" };
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
    let B = E === "missed" && (host.live()?.lastHeardAt ?? -1 / 0) > C;
    if (E !== "answered" && !B) {
      if (E === "missed") host.markAway("probe_missed");
      let host_2 = e.host(),
        ne = host_2?.live();
      if (
        host_2 === void 0 ||
        host_2.instanceId === host.instanceId ||
        ne === void 0 ||
        ne.status === "offline"
      )
        return E === "gone"
          ? {
              kind: "unreachable",
              detail:
                "the machine withdrew from this session while it was being asked whether it is still there; nothing was sent",
              machineNotAnswering: !0,
              signedOff: !0,
              ...ge(e.leftFor?.()),
            }
          : unreachableOutcome(host);
      host = host_2;
    }
    n.stale = !1;
  }
  let w = AJ(m.deadlineMs),
    S = p(),
    epoch = host.epoch(),
    T = epoch === void 0 ? {} : { sentUnderEpoch: epoch },
    A = "op" in s ? s.op : s.approval ? 2 : 1,
    M = Can(A),
    y = { posts: 0 },
    x = (C) => {
      switch (C) {
        case "sending":
          ((y.posts += 1),
            (y.startedAt ??= p()),
            logRemoteTools(
              s.call_id,
              "post started",
              { leg: A, queue_ms: y.startedAt - S, attempt: y.posts },
              M,
            ));
          return;
        case "accepted":
          if (y.acceptedAt === void 0) {
            y.acceptedAt = p();
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
              post_ms: y.startedAt === void 0 ? void 0 : y.acceptedAt - y.startedAt,
              attempt: y.posts,
            },
            M,
          );
          return;
        case "not_accepted":
        case "indeterminate":
          logRemoteTools(s.call_id, "post not accepted", { leg: A, phase: C, attempt: y.posts }, M);
      }
    },
    q,
    P;
  try {
    P = e.sender.sendServedCallRequest({
      onUpload: x,
      request: {
        subtype: "remote_tool_call",
        ...buildServedCallRequest({
          instanceId: host.instanceId,
          host: host.hostName,
          name: o,
          input: u,
          envelope: s,
          toolUseId: m.toolUseId,
          issuedAt: S,
          deadlineMs: w,
        }),
      },
      accepts: (C) => {
        if (!isReplyForCallSafe(C, s.call_id)) return !1;
        if (g && isRemoteToolCallMeta(C)) return ((q = C), !1);
        return !0;
      },
      signal: m.signal,
    });
  } catch (error) {
    return { kind: "transport_error", detail: `send failed: ${errorMessage(error)}` };
  }
  if (!P.sent)
    return { kind: "unreachable", detail: "this session's event stream is closed; nothing was sent" };
  (logRemoteTools(s.call_id, "sent", {
    leg: A,
    host_inst: host.instanceId,
    host_epoch: epoch,
    deadline_ms: w,
  }),
    m.onSent?.({ instanceId: host.instanceId, epoch: epoch, requestId: P.requestId }));
  let U = !g && !("approval" in s && s.approval?.decision === "deny"),
    { settled: settled, late: late } = await awaitCallReply(P, w, m.signal, {
      holdAtDeadline: m.onHeldAtDeadline !== void 0,
      withdrawable: U,
    }),
    O = (C) => {
      let E = resolveCallAtDeadline(C, {
        state: n,
        limits: r,
        entry: host,
        sent: P,
        toolName: o,
        callId: s.call_id,
        capMs: w,
        held: late !== void 0,
        sentUnderEpoch: T,
        elapsedMs: () => p() - S,
        heardNow: () => p(),
        heldBelowFloorAnswer: () => q,
      });
      if (E.kind === "result")
        try {
          let B = p(),
            D = {
              ...(y.startedAt !== void 0 && { queueMs: y.startedAt - S }),
              ...(y.startedAt !== void 0 &&
                y.acceptedAt !== void 0 && { postMs: y.acceptedAt - y.startedAt }),
              ...(y.acceptedAt !== void 0 && { replyWaitMs: B - y.acceptedAt }),
              totalMs: B - S,
              posts: y.posts,
            };
          (logRemoteTools(
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
          ),
            m.onTransit?.(D));
        } catch (error) {
          logForDebugging(`[remote-tools] a leg's transit was not reported: ${errorMessage(error)}`);
        }
      return E;
    };
  if (late !== void 0)
    m.onHeldAtDeadline?.({
      late: late.then(O),
      withdraw: () => P.cancel(),
      takeBack: () => U && P.withdraw(),
      accepted: () => {
        let delivery = P.delivery();
        return delivery === "delivered" || delivery === "untracked";
      },
    });
  return O(settled);
}
//@ chunk-25sm7c4g.js:16676-18944 placement
function resolveCallAtDeadline(
  e,
  {
    state: state,
    limits: limits,
    entry: entry,
    sent: sent,
    toolName: toolName,
    callId: callId,
    capMs: capMs,
    held: held,
    sentUnderEpoch: sentUnderEpoch,
    elapsedMs: elapsedMs,
    heardNow: heardNow,
    heldBelowFloorAnswer: heldBelowFloorAnswer,
  },
) {
  let R = () => {
    let T = heldBelowFloorAnswer();
    if (T === void 0) return;
    logRemoteTools(callId, "query deadline; taking the below-floor answer held for it", {
      deadline_ms: capMs,
      host_inst: entry.instanceId,
    });
    let A = readCallReply(T, elapsedMs());
    return A.kind === "dropped" ? { ...A, ...sentUnderEpoch } : A;
  };
  switch (e.kind) {
    case "answered": {
      let T = readCallReply(e.payload, elapsedMs());
      if (tn(T)) ((state.stale = !1), entry.heard(heardNow()));
      return T.kind === "dropped" ? { ...T, ...sentUnderEpoch } : T;
    }
    case "deadline": {
      let T = R();
      if (T !== void 0) return T;
      if (held)
        return (
          logRemoteTools(callId, "no answer by the deadline; request left standing, checking on it", {
            deadline_ms: capMs,
            host_inst: entry.instanceId,
          }),
          { kind: "timed_out", capMs: capMs, ...sentUnderEpoch }
        );
      if (
        (logRemoteTools(callId, "no answer by the deadline; request withdrawn", {
          deadline_ms: capMs,
          host_inst: entry.instanceId,
          error_replies_ignored: sent.errorRepliesIgnored(),
        }),
        capMs >= limits.defaultDeadlineMs)
      )
        state.stale = !0;
      return { kind: "timed_out", capMs: capMs, ...sentUnderEpoch };
    }
    case "stalled":
      return (
        logRemoteTools(
          callId,
          e.takenBack
            ? "still queued here at the deadline; taken back before any write carried it"
            : "still queued here at the deadline; cancelled behind it",
          { deadline_ms: capMs, host_inst: entry.instanceId },
        ),
        { kind: "stalled", capMs: capMs, request: "call", takenBack: e.takenBack }
      );
    case "unconfirmed": {
      let T = R();
      if (T !== void 0) return T;
      return (
        logRemoteTools(
          callId,
          "deadline reached with the write carrying the request unresolved; withdrawn, delivery unknown",
          { deadline_ms: capMs, host_inst: entry.instanceId, delivery: e.delivery },
        ),
        {
          kind: "dropped",
          why: "write_unresolved",
          detail:
            "the write carrying the request to the session service had not completed, or ended without an answer, by its deadline; whether the machine received it is unknown",
          ...sentUnderEpoch,
        }
      );
    }
    case "cancelled":
      return { kind: "cancelled" };
    case "dropped":
      return {
        kind: "dropped",
        detail: "this session's event stream closed after the call was sent",
        ...sentUnderEpoch,
      };
    case "undelivered":
      return {
        kind: "unreachable",
        detail: `the session service refused the request${e.status !== void 0 ? ` (HTTP ${e.status})` : ""}; nothing was delivered`,
      };
    case "delivery_unknown":
      return {
        kind: "dropped",
        detail: `an upload of the request ended without an answer and a later attempt was refused${e.status !== void 0 ? ` (HTTP ${e.status})` : ""}; whether the machine received it is unknown`,
        ...sentUnderEpoch,
      };
    case "gone":
      return { kind: "host_gone", why: e.why, unsent: e.unsent };
    case "failed":
      return { kind: "transport_error", detail: e.detail };
  }
}
//@ chunk-25sm7c4g.js:18944-19807 placement
async function awaitCallReply(e, n, r, { holdAtDeadline: holdAtDeadline, withdrawable: withdrawable }) {
  let s = e.reply.then(
      (f) => ({ kind: "answered", payload: f }),
      (f) => {
        if (r.aborted) return { kind: "cancelled" };
        if (f instanceof RequestNotDeliveredError) return { kind: "undelivered", status: f.status };
        if (f instanceof RequestDeliveryUnknownError) return { kind: "delivery_unknown", status: f.status };
        if (f instanceof StreamClosedAbortError) return { kind: "dropped" };
        if (f instanceof ServingInstanceGoneError)
          return { kind: "gone", why: f.why, unsent: e.delivery() === "queued" };
        return { kind: "failed", detail: errorMessage(f) };
      },
    ),
    m = await withDeadline(s, n);
  if (m !== void 0) return { settled: m, late: void 0 };
  let delivery = e.delivery();
  if (delivery === "queued") {
    if (withdrawable && e.withdraw()) return { settled: { kind: "stalled", takenBack: !0 }, late: void 0 };
    return (e.cancel(), { settled: { kind: "stalled", takenBack: !1 }, late: void 0 });
  }
  if (holdAtDeadline) return { settled: { kind: "deadline" }, late: s };
  return (
    e.cancel(),
    {
      settled:
        delivery === "in_flight" || delivery === "indeterminate"
          ? { kind: "unconfirmed", delivery: delivery }
          : { kind: "deadline" },
      late: void 0,
    }
  );
}
//@ chunk-25sm7c4g.js:19807-19912 placement
function isRefusalReply(e) {
  return e.kind === "approval_unverified" || (e.kind === "result" && e.envelope?.outcome === "refused");
}
//@ chunk-25sm7c4g.js:19912-19960 placement
function tn(e) {
  return !isRefusalReply(e) && e.kind !== "dropped";
}
//@ chunk-25sm7c4g.js:19960-20092 placement
function isReplyForCallSafe(e, n) {
  try {
    return isReplyForCall(e, n);
  } catch (error) {
    return (
      logForDebugging(
        `[remote-tools] an unreadable reply was not taken as an answer: ${errorMessage(error)}`,
      ),
      !1
    );
  }
}
//@ chunk-25sm7c4g.js:20092-20279 placement
function isReplyForCall(e, n) {
  let r = L(e) ? e.result : void 0,
    o = readCallResult(r);
  switch (o.envelope.status) {
    case "present":
      return o.envelope.envelope.call_id === n;
    case "malformed":
      return readMalformedReplyCallId(r) === n;
    case "absent":
      return !1;
  }
}
//@ chunk-25sm7c4g.js:20279-20389 placement
function readMalformedReplyCallId(e) {
  if (!L(e)) return;
  return [e.structuredContent, e._meta]
    .filter(L)
    .map((r) => r[ANTHROPIC_REMOTETOOLEXECUTION])
    .find(L)?.call_id;
}
//@ chunk-25sm7c4g.js:20389-21466 placement
function readCallReply(e, n) {
  if (isRemoteToolCallMeta(e)) {
    let { [SENDER_BELOW_FLOOR]: s, ...m } = e,
      p = readCallReply(m, n),
      f = p.kind === "result" && p.envelope?.outcome === "refused" ? p.envelope : void 0;
    return {
      kind: "dropped",
      why: "unverified_refusal",
      detail:
        "a sender this session could not verify reported the call refused; the machine itself is asked what became of it",
      ...(p.kind === "result" &&
        f !== void 0 && {
          reported: {
            kind: "result",
            content: "",
            isError: p.isError,
            envelope: {
              v: f.v,
              outcome: f.outcome,
              target: { name: "", working_dir: "" },
              code: f.code,
              ...(f.reason !== void 0 && { reason: f.reason }),
              ...(f.limit !== void 0 && { limit: f.limit }),
              message: "",
            },
            elapsedMs: p.elapsedMs,
            responseBytes: p.responseBytes,
          },
        }),
    };
  }
  let r = L(e) ? e.result : void 0,
    o = readCallResult(r);
  if (o.envelope.status === "malformed")
    return { kind: "transport_error", detail: "malformed result envelope", unreadableResult: !0 };
  if (o.envelope.status === "absent")
    return { kind: "transport_error", detail: "answer without an envelope" };
  let envelope = o.envelope.envelope;
  if (envelope.outcome === "refused" && envelope.code === "no_approval")
    return { kind: "approval_unverified" };
  return {
    kind: "result",
    content: o.content,
    isError: o.isError,
    envelope: envelope,
    elapsedMs: n,
    responseBytes: iv(r),
    ...{},
  };
}
//@ chunk-25sm7c4g.js:21466-21787 placement
async function probeMachine(e, n, r, o) {
  let u = (e.now ?? Date.now)(),
    s = await sendLivenessProbe(e, r, o),
    m = (r.live()?.lastHeardAt ?? -1 / 0) > u,
    host = e.host(),
    f = host?.instanceId !== r.instanceId;
  if (s === "answered" || (s === "missed" && (m || f))) n.stale = !1;
  if (s === "answered" || (s === "missed" && m) || (s !== "cancelled" && f && host !== void 0))
    return "there";
  return s === "missed" && !f ? "missed" : "unknown";
}
//@ chunk-25sm7c4g.js:21787-22092 placement
async function holdForLiveness(e, n, r, o, u) {
  if (n.hold === void 0) {
    let abortController = new AbortController(),
      p = probeUntilAnswered(e, n, r, abortController.signal, u);
    n.hold = {
      ended: p.finally(() => {
        n.hold = void 0;
      }),
      stop: abortController,
      waiting: 0,
    };
  }
  let hold = n.hold;
  hold.waiting += 1;
  try {
    return await raceWithAbortSignal(hold.ended, o, () => new AbortError());
  } catch {
    return "unknown";
  } finally {
    if (((hold.waiting -= 1), hold.waiting === 0)) hold.stop.abort();
  }
}
//@ chunk-25sm7c4g.js:22092-22236 placement
async function probeUntilAnswered(e, n, r, o, u) {
  let s = e.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  for (let m = u; m > 0; m -= s) {
    let p = await probeMachine(e, n, r, o);
    if (p !== "missed") return p;
  }
  return "missed";
}
//@ chunk-25sm7c4g.js:22236-22380 placement
function currentQuietMisses(e, n) {
  let r = n.quietMisses[0],
    o = e.host()?.live();
  if (r !== void 0 && (o === void 0 || ve(o, r.writtenAt))) n.quietMisses = [];
  return n.quietMisses;
}
//@ chunk-25sm7c4g.js:22380-22469 placement
function ve(e, n) {
  return e.lastHeardAt > n || (e.lastStillHereAt !== void 0 && e.lastStillHereAt > n);
}
//@ chunk-25sm7c4g.js:22469-23201 placement
function quietProbe(e, n, r) {
  if (n.quietProbe !== void 0) return n.quietProbe;
  let host = e.host(),
    u = host?.live();
  if (host === void 0 || u === void 0 || u.asleepSince !== void 0) return Promise.resolve(void 0);
  let s = (e.now ?? Date.now)(),
    m = r ?? e.probeDeadlineMs ?? PROBE_DEADLINE_MS,
    p = sendLivenessProbe(e, host, new AbortController().signal, { putWithinMs: _lr, deadlineMs: m })
      .then((f) => {
        let live = host.live();
        if (f === "answered" || (f === "missed" && live !== void 0 && ve(live, s))) {
          if (f === "answered" || (live?.lastHeardAt ?? -1 / 0) > s) n.stale = !1;
          return ((n.quietMisses = []), !0);
        }
        if (f !== "missed" || live === void 0 || live.asleepSince !== void 0) return;
        return ((n.quietMisses = [...currentQuietMisses(e, n), { writtenAt: s, waitedMs: m }]), !1);
      })
      .catch((f) => {
        logForDebugging(`[remote-tools] a liveness probe for a waiting call failed: ${errorMessage(f)}`);
        return;
      })
      .finally(() => {
        n.quietProbe = void 0;
      });
  return ((n.quietProbe = p), p);
}
//@ chunk-25sm7c4g.js:23201-24195 placement
async function sendLivenessProbe(e, n, r, o) {
  let u = e.now ?? Date.now,
    s = o?.deadlineMs ?? e.probeDeadlineMs ?? PROBE_DEADLINE_MS,
    m = u(),
    p,
    f;
  try {
    f = e.sender.sendServedCallRequest({
      request: { subtype: "remote_tools_probe", instance_id: n.instanceId, issued_at: m, deadline_ms: s },
      accepts: un,
      signal: r,
      ...(o !== void 0 && {
        onUpload: (g) => {
          if (g === "accepted") p ??= u();
        },
      }),
    });
  } catch (error) {
    return (
      logForDebugging(
        `[remote-tools] liveness probe to ${n.hostName} could not be sent: ${errorMessage(error)}`,
      ),
      "unsent"
    );
  }
  if (!f.sent) return "unsent";
  let { settled: settled } = await awaitCallReply(f, s, r, { holdAtDeadline: !1, withdrawable: !0 });
  if (settled.kind === "answered") {
    let g = L(settled.payload) ? settled.payload.result : void 0;
    return (n.heard(u(), L(g) ? parseAnnounce(g.epoch) : void 0), "answered");
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
      return o !== void 0 &&
        (p === void 0 || m + s - p < (e.probeDeadlineMs ?? PROBE_DEADLINE_MS) - o.putWithinMs)
        ? "stream_lost"
        : "missed";
    case "dropped":
    case "delivery_unknown":
    case "unconfirmed":
      return "stream_lost";
  }
}
//@ chunk-25sm7c4g.js:24195-24272 placement
function un(e) {
  let n = L(e) ? e.result : void 0;
  return L(n) && parseAnnounce(n.epoch) !== void 0;
}
//@ chunk-25sm7c4g.js:24272-24320 placement
function ge(e) {
  return e === void 0 ? {} : { leftFor: e };
}
//@ chunk-25sm7c4g.js:24320-24390 placement
function L(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-25sm7c4g.js:24390-24485 placement
function remoteToolsContext(e) {
  return { toolState: e.toolState, agentContext: e.agentContext, mcpClients: () => currentMcpClients(e) };
}
//@ chunk-25sm7c4g.js:24485-24537 placement
var REMOTE_TARGET_TIMINGS = 8000,
  fn = 5000,
  mn = 30000,
  pn = 2000,
  W = 5000,
  Y = 60000;
//@ chunk-25sm7c4g.js:24537-24796 placement
class RemoteToolTargetsState {
  recovery = new BridgeSessionRecovery();
  connection = void 0;
  listingMemo = void 0;
  synced = !1;
  lastListingFailed = !1;
  lastForcedRelistAt = void 0;
  reportedUnmatched = !1;
  provisional = void 0;
  setAside = 0;
  offer = "unread";
  lastListedAt = void 0;
  unconnectedSince = void 0;
  failedAt = void 0;
  inFlight = void 0;
}
//@ chunk-25sm7c4g.js:24796-25197 placement
function nextListingInterval(e) {
  let n = e.toolState.get(RemoteToolTargetsState),
    now = Date.now(),
    o = n.provisional !== void 0 && (n.provisional.stub || now - n.provisional.since < Y) ? W : gn;
  if (
    (n.lastForcedRelistAt !== void 0 && now - n.lastForcedRelistAt < o) ||
    (n.lastListedAt !== void 0 && now - n.lastListedAt < W)
  )
    return !1;
  n.lastForcedRelistAt = now;
  let connection = n.connection;
  if (connection !== void 0)
    mcpClientModule().fetchToolsForClient.cache.delete(ir(connection.name, connection.config));
  return ((n.synced = !1), (n.listingMemo = void 0), !0);
}
//@ chunk-25sm7c4g.js:25197-25210 placement
var gn = 30000;
//@ chunk-25sm7c4g.js:25210-25274 placement
async function refreshRemoteToolTargets(e, n, r) {
  (syncRemoteToolTargets(e, n, r), await refreshDeviceBridgeTargets(e, n, r), syncRemoteToolTargets(e, n, r));
}

export {
  RemoteToolTargetsState,
  mn,
  REMOTE_TARGET_TIMINGS,
  fn,
  pn,
  SESSION_TRANSPORT_LIMITS,
  W,
  Y,
  refreshRemoteToolTargets,
  remoteToolsContext,
  nextListingInterval,
  PROBE_DEADLINE_MS,
};
