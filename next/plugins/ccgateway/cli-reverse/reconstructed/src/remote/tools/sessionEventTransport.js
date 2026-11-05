/**
 * remote/tools/sessionEventTransport.ts
 *
 * 2.1.316 新增：基于会话事件的调用传输（发送、等待答复、存活探测、期限处理）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sjeyntvz.js (29)
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

//@ chunk-sjeyntvz.js:10591-10666 placement
/**
 * 导出常量或表 `SESSION_TRANSPORT_LIMITS`：值为 { maxRequestBytes: 4128768, defaultDeadlineMs: 58000 }, he = 60000, PROBE_DEADLINE_MS = 1e4。
 */
var SESSION_TRANSPORT_LIMITS = {
  maxRequestBytes: 4128768,
  defaultDeadlineMs: 58000,
};
var HOST_SILENCE_MS = 60000;
var PROBE_DEADLINE_MS = 1e4;
//@ chunk-sjeyntvz.js:10666-12372 placement
function createSessionEventTransport(options) {
  let state = {
    stale: false,
    quietMisses: [],
  };
  let limits = options.limits ?? SESSION_TRANSPORT_LIMITS;
  return {
    kind: "session",
    limits,
    call: (name, args, callMeta, opts) =>
      callOverSessionChannel(options, state, limits, name, args, callMeta, opts),
    markUnresponsive: () => {
      state.stale = true;
    },
    checkLive: async ({ signal, hold }) => {
      let host = options.host();
      let live = host?.live();
      let now = options.now ?? Date.now;
      if (
        host === undefined ||
        live === undefined ||
        signal.aborted ||
        !(live.status === "offline" || state.stale || now() - live.lastHeardAt > HOST_SILENCE_MS)
      )
        return;
      if (isHostAsleep(host, now())) return unreachableOutcome(host);
      let probeResult = await probeMachine(options, state, host, signal);
      if (
        probeResult === "missed" &&
        hold !== undefined &&
        host.live()?.status === "online" &&
        !state.stale
      ) {
        hold.notify("waiting");
        probeResult = await holdForLiveness(options, state, host, signal, hold.ms);
        if (probeResult === "there") hold.notify("back");
      }
      if (probeResult !== "missed") return;
      host.markAway("probe_missed");
      return unreachableOutcome(host);
    },
    saidAsleep: () => options.host()?.live()?.asleepSince !== undefined,
    probeLive: async ({ signal }) => {
      let host = options.host();
      if (host === undefined || host.live() === undefined || signal.aborted) return;
      let startedAtMs = (options.now ?? Date.now)();
      let probeResult = await sendLivenessProbe(options, host, signal);
      let heardSinceProbe = (host.live()?.lastHeardAt ?? -1 / 0) > startedAtMs;
      if (probeResult === "answered" || heardSinceProbe) {
        state.stale = false;
        return true;
      }
      if (probeResult !== "missed") return;
      host.markAway("probe_missed");
      return false;
    },
    isAway: () => options.host()?.live()?.status === "offline",
    silence: {
      quietForMs: () => {
        let live = options.host()?.live();
        return live === undefined || live.status === "offline" || live.asleepSince !== undefined
          ? undefined
          : (options.now ?? Date.now)() - live.lastHeardAt;
      },
      probe: (signal) => quietProbe(options, state, signal),
      missed: () => currentQuietMisses(options, state),
      ownStreamFrameAt: () => options.sender.readStreamFrameAt?.(),
      giveUp: () => {
        options.host()?.markAway("probe_missed");
      },
    },
    isRechecked: () => options.rechecked?.() === true,
    ...(options.sender.withdrawStandingServedCall !== undefined && {
      withdrawStanding: (callId) => {
        options.sender.withdrawStandingServedCall?.(callId);
      },
    }),
    callPlumbing: async (name, input, callMeta) => {
      let host = options.host();
      if (host === undefined)
        return {
          kind: "unreachable",
          detail: "the machine is no longer announced on this session",
        };
      let result = await callPlumbingOverSession(
        options.sender,
        {
          instanceId: host.instanceId,
          host: host.hostName,
        },
        name,
        input,
        callMeta,
      );
      if (result.kind === "result") host.heard((options.now ?? Date.now)());
      return result;
    },
  };
}
//@ chunk-sjeyntvz.js:12372-12839 placement
function unreachableOutcome(channel) {
  let live = channel.live();
  return live?.asleepSince !== undefined
    ? {
        kind: "unreachable",
        detail: "it said it was going to sleep",
        machineNotAnswering: true,
        saidAsleep: true,
        lastHeardAt: live.asleepSince,
      }
    : {
        kind: "unreachable",
        detail: "the machine did not answer a liveness check on this session; nothing was sent",
        machineNotAnswering: true,
        ...(live !== undefined && {
          lastHeardAt: Math.max(live.lastHeardAt, live.lastStillHereAt ?? 0),
        }),
        ...(live?.lastStillHereAt !== undefined &&
          live.lastStillHereAt > live.lastHeardAt && {
            saidBusy: true,
          }),
      };
}
//@ chunk-sjeyntvz.js:12839-12917 placement
function isHostAsleep(channel, at) {
  let asleepSince = channel.live()?.asleepSince;
  return asleepSince !== undefined && at >= asleepSince && at - asleepSince < SLEEPING_GRACE_MS;
}
//@ chunk-sjeyntvz.js:12917-16820 placement
/**
 * 经会话事件流把调用发给附着机器：检查在线/睡眠、发送、等待回复或截止、活性探测。
 */
async function callOverSessionChannel(channel, state, limits, name, input, callMeta, opts) {
  let now = channel.now ?? Date.now;
  if (opts.signal.aborted)
    return {
      kind: "cancelled",
    };
  let host = channel.host();
  let live = host?.live();
  if (host === undefined || live === undefined)
    return {
      kind: "unreachable",
      detail: "the machine is not announcing on this session",
      machineNotAnswering: true,
      ...(channel.signedOff?.() === true && {
        signedOff: true,
        ...leftForOutcome(channel.leftFor?.()),
      }),
    };
  let isOutcomeQuery = "op" in callMeta && callMeta.op === "outcome_of";
  if (
    !isOutcomeQuery &&
    (live.status === "offline" || state.stale || now() - live.lastHeardAt > HOST_SILENCE_MS)
  ) {
    if (isHostAsleep(host, now())) return unreachableOutcome(host);
    let probeStartedAt = now();
    let probeResult = await sendLivenessProbe(channel, host, opts.signal);
    if (probeResult === "cancelled")
      return {
        kind: "cancelled",
      };
    if (probeResult === "unsent")
      return {
        kind: "unreachable",
        detail:
          channel.sender.whyNotSending?.() ??
          "this session's event stream is not accepting requests; nothing was sent",
      };
    if (probeResult === "stalled" || probeResult === "taken_back")
      return {
        kind: "stalled",
        capMs: channel.probeDeadlineMs ?? PROBE_DEADLINE_MS,
        request: "probe",
        takenBack: probeResult === "taken_back",
      };
    if (probeResult === "stream_lost")
      return {
        kind: "unreachable",
        detail:
          "this session could not complete the liveness check for a reason on its own side (its event stream closed, the service refused the write that carried it, or that write had not completed in time); the machine was not reached and nothing was sent",
      };
    let heardDuringProbe = probeResult === "missed" && (host.live()?.lastHeardAt ?? -1 / 0) > probeStartedAt;
    if (probeResult !== "answered" && !heardDuringProbe) {
      if (probeResult === "missed") host.markAway("probe_missed");
      let otherHost = channel.host();
      let otherLive = otherHost?.live();
      if (
        otherHost === undefined ||
        otherHost.instanceId === host.instanceId ||
        otherLive === undefined ||
        otherLive.status === "offline"
      )
        return probeResult === "gone"
          ? {
              kind: "unreachable",
              detail:
                "the machine withdrew from this session while it was being asked whether it is still there; nothing was sent",
              machineNotAnswering: true,
              signedOff: true,
              ...leftForOutcome(channel.leftFor?.()),
            }
          : unreachableOutcome(host);
      host = otherHost;
    }
    state.stale = false;
  }
  let deadlineMs = clampToMaxPageSize(opts.deadlineMs);
  let startedAt = now();
  let hostEpoch = host.epoch();
  let sentUnderEpoch =
    hostEpoch === undefined
      ? {}
      : {
          sentUnderEpoch: hostEpoch,
        };
  let leg = "op" in callMeta ? callMeta.op : callMeta.approval ? 2 : 1;
  let logLevel = remoteToolsLogLevel(leg);
  let transit = {
    posts: 0,
  };
  let onUpload = (outcome) => {
    switch (outcome) {
      case "sending":
        transit.posts += 1;
        transit.startedAt ??= now();
        logRemoteTools(
          callMeta.call_id,
          "post started",
          {
            leg,
            queue_ms: transit.startedAt - startedAt,
            attempt: transit.posts,
          },
          logLevel,
        );
        return;
      case "accepted":
        if (transit.acceptedAt === undefined) {
          transit.acceptedAt = now();
          try {
            opts.onAccepted?.();
          } catch (error) {
            logForDebugging(`[remote-tools] a leg's acceptance was not reported: ${errorMessage(error)}`);
          }
        }
        logRemoteTools(
          callMeta.call_id,
          "post accepted",
          {
            leg,
            post_ms: transit.startedAt === undefined ? undefined : transit.acceptedAt - transit.startedAt,
            attempt: transit.posts,
          },
          logLevel,
        );
        return;
      case "not_accepted":
      case "indeterminate":
        logRemoteTools(
          callMeta.call_id,
          "post not accepted",
          {
            leg,
            phase: outcome,
            attempt: transit.posts,
          },
          logLevel,
        );
    }
  };
  let belowFloorAnswer;
  let sent;
  try {
    sent = channel.sender.sendServedCallRequest({
      onUpload,
      request: {
        subtype: "remote_tool_call",
        ...buildServedCallRequest({
          instanceId: host.instanceId,
          host: host.hostName,
          name,
          input,
          envelope: callMeta,
          toolUseId: opts.toolUseId,
          issuedAt: startedAt,
          deadlineMs,
        }),
      },
      accepts: (deliveryState) => {
        if (!isReplyForCallSafe(deliveryState, callMeta.call_id)) return false;
        if (isOutcomeQuery && isRemoteToolCallMeta(deliveryState)) {
          belowFloorAnswer = deliveryState;
          return false;
        }
        return true;
      },
      signal: opts.signal,
    });
  } catch (error) {
    return {
      kind: "transport_error",
      detail: `send failed: ${errorMessage(error)}`,
    };
  }
  if (!sent.sent)
    return {
      kind: "unreachable",
      detail: channel.sender.whyNotSending?.() ?? "this session's event stream is closed; nothing was sent",
    };
  logRemoteTools(callMeta.call_id, "sent", {
    leg,
    host_inst: host.instanceId,
    host_epoch: hostEpoch,
    deadline_ms: deadlineMs,
  });
  opts.onSent?.({
    instanceId: host.instanceId,
    epoch: hostEpoch,
    requestId: sent.requestId,
  });
  let withdrawable = !isOutcomeQuery && !("approval" in callMeta && callMeta.approval?.decision === "deny");
  let { settled, late } = await awaitCallReply(sent, deadlineMs, opts.signal, {
    holdAtDeadline: opts.onHeldAtDeadline !== undefined,
    withdrawable,
  });
  let settle = (entry) => {
    let callAtDeadline = resolveCallAtDeadline(entry, {
      state,
      limits,
      entry: host,
      sent,
      toolName: name,
      callId: callMeta.call_id,
      capMs: deadlineMs,
      held: late !== undefined,
      sentUnderEpoch,
      elapsedMs: () => now() - startedAt,
      heardNow: () => now(),
      heldBelowFloorAnswer: () => belowFloorAnswer,
    });
    if (callAtDeadline.kind === "result")
      try {
        let settledAt = now();
        let transitTiming = {
          ...(transit.startedAt !== undefined && {
            queueMs: transit.startedAt - startedAt,
          }),
          ...(transit.startedAt !== undefined &&
            transit.acceptedAt !== undefined && {
              postMs: transit.acceptedAt - transit.startedAt,
            }),
          ...(transit.acceptedAt !== undefined && {
            replyWaitMs: settledAt - transit.acceptedAt,
          }),
          totalMs: settledAt - startedAt,
          posts: transit.posts,
        };
        logRemoteTools(
          callMeta.call_id,
          "answered",
          {
            leg,
            total_ms: transitTiming.totalMs,
            queue_ms: transitTiming.queueMs,
            post_ms: transitTiming.postMs,
            reply_wait_ms: transitTiming.replyWaitMs,
            posts: transitTiming.posts,
          },
          logLevel,
        );
        opts.onTransit?.(transitTiming);
      } catch (error) {
        logForDebugging(`[remote-tools] a leg's transit was not reported: ${errorMessage(error)}`);
      }
    return callAtDeadline;
  };
  if (late !== undefined)
    opts.onHeldAtDeadline?.({
      late: late.then(settle),
      withdraw: () => sent.cancel(),
      takeBack: () => withdrawable && sent.withdraw(),
      accepted: () => {
        let deliveryState = sent.delivery();
        return deliveryState === "delivered" || deliveryState === "untracked";
      },
    });
  return settle(settled);
}
//@ chunk-sjeyntvz.js:16820-19088 placement
function resolveCallAtDeadline(
  entry,
  {
    state,
    limits,
    entry: entry_2,
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
  let takeHeldAnswer = () => {
    let heldReply = heldBelowFloorAnswer();
    if (heldReply === undefined) return;
    logRemoteTools(callId, "query deadline; taking the below-floor answer held for it", {
      deadline_ms: capMs,
      host_inst: entry_2.instanceId,
    });
    let callReply = readCallReply(heldReply, elapsedMs());
    return callReply.kind === "dropped"
      ? {
          ...callReply,
          ...sentUnderEpoch,
        }
      : callReply;
  };
  switch (entry.kind) {
    case "answered": {
      let callReply = readCallReply(entry.payload, elapsedMs());
      if (isFreshReply(callReply)) {
        state.stale = false;
        entry_2.heard(heardNow());
      }
      return callReply.kind === "dropped"
        ? {
            ...callReply,
            ...sentUnderEpoch,
          }
        : callReply;
    }
    case "deadline": {
      let held_2 = takeHeldAnswer();
      if (held_2 !== undefined) return held_2;
      if (held) {
        logRemoteTools(callId, "no answer by the deadline; request left standing, checking on it", {
          deadline_ms: capMs,
          host_inst: entry_2.instanceId,
        });
        return {
          kind: "timed_out",
          capMs,
          ...sentUnderEpoch,
        };
      }
      logRemoteTools(callId, "no answer by the deadline; request withdrawn", {
        deadline_ms: capMs,
        host_inst: entry_2.instanceId,
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
        entry.takenBack
          ? "still queued here at the deadline; taken back before any write carried it"
          : "still queued here at the deadline; cancelled behind it",
        {
          deadline_ms: capMs,
          host_inst: entry_2.instanceId,
        },
      );
      return {
        kind: "stalled",
        capMs,
        request: "call",
        takenBack: entry.takenBack,
      };
    case "unconfirmed": {
      let held = takeHeldAnswer();
      if (held !== undefined) return held;
      logRemoteTools(
        callId,
        "deadline reached with the write carrying the request unresolved; withdrawn, delivery unknown",
        {
          deadline_ms: capMs,
          host_inst: entry_2.instanceId,
          delivery: entry.delivery,
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
        detail: `the session service refused the request${entry.status !== undefined ? ` (HTTP ${entry.status})` : ""}; nothing was delivered`,
      };
    case "delivery_unknown":
      return {
        kind: "dropped",
        detail: `an upload of the request ended without an answer and a later attempt was refused${entry.status !== undefined ? ` (HTTP ${entry.status})` : ""}; whether the machine received it is unknown`,
        ...sentUnderEpoch,
      };
    case "gone":
      return {
        kind: "host_gone",
        why: entry.why,
        unsent: entry.unsent,
      };
    case "failed":
      return {
        kind: "transport_error",
        detail: entry.detail,
      };
  }
}
//@ chunk-sjeyntvz.js:19088-19951 placement
async function awaitCallReply(call, state, signal, { holdAtDeadline, withdrawable }) {
  let answerPromise = call.reply.then(
    (payload) => ({
      kind: "answered",
      payload,
    }),
    (error) => {
      if (signal.aborted)
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
          unsent: call.delivery() === "queued",
        };
      return {
        kind: "failed",
        detail: errorMessage(error),
      };
    },
  );
  let settled = await withDeadline(answerPromise, state);
  if (settled !== undefined)
    return {
      settled,
      late: undefined,
    };
  let deliveryState = call.delivery();
  if (deliveryState === "queued") {
    if (withdrawable && call.withdraw())
      return {
        settled: {
          kind: "stalled",
          takenBack: true,
        },
        late: undefined,
      };
    call.cancel();
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
      late: answerPromise,
    };
  call.cancel();
  return {
    settled:
      deliveryState === "in_flight" || deliveryState === "indeterminate"
        ? {
            kind: "unconfirmed",
            delivery: deliveryState,
          }
        : {
            kind: "deadline",
          },
    late: undefined,
  };
}
//@ chunk-sjeyntvz.js:19951-20056 placement
function isRefusalReply(reply) {
  return (
    reply.kind === "approval_unverified" || (reply.kind === "result" && reply.envelope?.outcome === "refused")
  );
}
//@ chunk-sjeyntvz.js:20056-20104 placement
function isFreshReply(reply) {
  return !isRefusalReply(reply) && reply.kind !== "dropped";
}
//@ chunk-sjeyntvz.js:20104-20236 placement
function isReplyForCallSafe(reply, callId) {
  try {
    return isReplyForCall(reply, callId);
  } catch (error) {
    logForDebugging(`[remote-tools] an unreadable reply was not taken as an answer: ${errorMessage(error)}`);
    return false;
  }
}
//@ chunk-sjeyntvz.js:20236-20423 placement
function isReplyForCall(reply, callId) {
  let result = isPlainObject(reply) ? reply.result : undefined;
  let callResult = readCallResult(result);
  switch (callResult.envelope.status) {
    case "present":
      return callResult.envelope.envelope.call_id === callId;
    case "malformed":
      return readMalformedReplyCallId(result) === callId;
    case "absent":
      return false;
  }
}
//@ chunk-sjeyntvz.js:20423-20533 placement
function readMalformedReplyCallId(reply) {
  if (!isPlainObject(reply)) return;
  return [reply.structuredContent, reply._meta]
    .filter(isPlainObject)
    .map((meta) => meta[ANTHROPIC_REMOTETOOLEXECUTION])
    .find(isPlainObject)?.call_id;
}
//@ chunk-sjeyntvz.js:20533-21610 placement
function readCallReply(reply, callId) {
  if (isRemoteToolCallMeta(reply)) {
    let { [SENDER_BELOW_FLOOR]: belowFloor, ...rest } = reply;
    let callReply = readCallReply(rest, callId);
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
  let result = isPlainObject(reply) ? reply.result : undefined;
  let callResult = readCallResult(result);
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
    elapsedMs: callId,
    responseBytes: byteLengthOf(result),
    ...{},
  };
}
//@ chunk-sjeyntvz.js:21610-21931 placement
async function probeMachine(channel, state, entry, signal) {
  let startedAt = (channel.now ?? Date.now)();
  let probeResult = await sendLivenessProbe(channel, entry, signal);
  let heardSince = (entry.live()?.lastHeardAt ?? -1 / 0) > startedAt;
  let host = channel.host();
  let instanceChanged = host?.instanceId !== entry.instanceId;
  if (probeResult === "answered" || (probeResult === "missed" && (heardSince || instanceChanged)))
    state.stale = false;
  if (
    probeResult === "answered" ||
    (probeResult === "missed" && heardSince) ||
    (probeResult !== "cancelled" && instanceChanged && host !== undefined)
  )
    return "there";
  return probeResult === "missed" && !instanceChanged ? "missed" : "unknown";
}
//@ chunk-sjeyntvz.js:21931-22236 placement
async function holdForLiveness(channel, state, entry, signal, budgetMs) {
  if (state.hold === undefined) {
    let abortController = new AbortController();
    let ended = probeUntilAnswered(channel, state, entry, abortController.signal, budgetMs);
    state.hold = {
      ended: ended.finally(() => {
        state.hold = undefined;
      }),
      stop: abortController,
      waiting: 0,
    };
  }
  let hold = state.hold;
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
//@ chunk-sjeyntvz.js:22236-22380 placement
async function probeUntilAnswered(channel, state, entry, signal, budgetMs) {
  let probeDeadlineMs = channel.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  for (let remainingMs = budgetMs; remainingMs > 0; remainingMs -= probeDeadlineMs) {
    let result = await probeMachine(channel, state, entry, signal);
    if (result !== "missed") return result;
  }
  return "missed";
}
//@ chunk-sjeyntvz.js:22380-22524 placement
function currentQuietMisses(channel, state) {
  let miss = state.quietMisses[0];
  let live = channel.host()?.live();
  if (miss !== undefined && (live === undefined || wasHeardAfter(live, miss.writtenAt)))
    state.quietMisses = [];
  return state.quietMisses;
}
//@ chunk-sjeyntvz.js:22524-22613 placement
function wasHeardAfter(live, at) {
  return live.lastHeardAt > at || (live.lastStillHereAt !== undefined && live.lastStillHereAt > at);
}
//@ chunk-sjeyntvz.js:22613-23345 placement
function quietProbe(channel, state, deadlineMs) {
  if (state.quietProbe !== undefined) return state.quietProbe;
  let host = channel.host();
  let live = host?.live();
  if (host === undefined || live === undefined || live.asleepSince !== undefined)
    return Promise.resolve(undefined);
  let nowMs = (channel.now ?? Date.now)();
  let deadline = deadlineMs ?? channel.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  let probe = sendLivenessProbe(channel, host, new AbortController().signal, {
    putWithinMs: LIVENESS_PROBE_TIMEOUT_MS,
    deadlineMs: deadline,
  })
    .then((result) => {
      let after = host.live();
      if (
        result === "answered" ||
        (result === "missed" && after !== undefined && wasHeardAfter(after, nowMs))
      ) {
        if (result === "answered" || (after?.lastHeardAt ?? -1 / 0) > nowMs) state.stale = false;
        state.quietMisses = [];
        return true;
      }
      if (result !== "missed" || after === undefined || after.asleepSince !== undefined) return;
      state.quietMisses = [
        ...currentQuietMisses(channel, state),
        {
          writtenAt: nowMs,
          waitedMs: deadline,
        },
      ];
      return false;
    })
    .catch((error) => {
      logForDebugging(`[remote-tools] a liveness probe for a waiting call failed: ${errorMessage(error)}`);
      return;
    })
    .finally(() => {
      state.quietProbe = undefined;
    });
  state.quietProbe = probe;
  return probe;
}
//@ chunk-sjeyntvz.js:23345-24339 placement
async function sendLivenessProbe(channel, entry, signal, opts) {
  let now = channel.now ?? Date.now;
  let deadlineMs = opts?.deadlineMs ?? channel.probeDeadlineMs ?? PROBE_DEADLINE_MS;
  let issuedAt = now();
  let timer;
  let sent;
  try {
    sent = channel.sender.sendServedCallRequest({
      request: {
        subtype: "remote_tools_probe",
        instance_id: entry.instanceId,
        issued_at: issuedAt,
        deadline_ms: deadlineMs,
      },
      accepts: acceptsAnnounceResult,
      signal,
      ...(opts !== undefined && {
        onUpload: (outcome) => {
          if (outcome === "accepted") timer ??= now();
        },
      }),
    });
  } catch (error) {
    logForDebugging(
      `[remote-tools] liveness probe to ${entry.hostName} could not be sent: ${errorMessage(error)}`,
    );
    return "unsent";
  }
  if (!sent.sent) return "unsent";
  let { settled } = await awaitCallReply(sent, deadlineMs, signal, {
    holdAtDeadline: false,
    withdrawable: true,
  });
  if (settled.kind === "answered") {
    let result = isPlainObject(settled.payload) ? settled.payload.result : undefined;
    entry.heard(now(), isPlainObject(result) ? parseAnnounce(result.epoch) : undefined);
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
      return opts !== undefined &&
        (timer === undefined ||
          issuedAt + deadlineMs - timer < (channel.probeDeadlineMs ?? PROBE_DEADLINE_MS) - opts.putWithinMs)
        ? "stream_lost"
        : "missed";
    case "dropped":
    case "delivery_unknown":
    case "unconfirmed":
      return "stream_lost";
  }
}
//@ chunk-sjeyntvz.js:24339-24416 placement
function acceptsAnnounceResult(reply) {
  let result = isPlainObject(reply) ? reply.result : undefined;
  return isPlainObject(result) && parseAnnounce(result.epoch) !== undefined;
}
//@ chunk-sjeyntvz.js:24416-24464 placement
function leftForOutcome(leftFor) {
  return leftFor === undefined
    ? {}
    : {
        leftFor,
      };
}
//@ chunk-sjeyntvz.js:24464-24534 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-sjeyntvz.js:24534-24629 placement
function remoteToolsContext(context) {
  return {
    toolState: context.toolState,
    agentContext: context.agentContext,
    mcpClients: () => currentMcpClients(context),
  };
}
//@ chunk-sjeyntvz.js:24629-24681 placement
/**
 * 远程工具目标的列表节奏：首次探测 8 s 截止、分页上限 5000、失败清单 30 s 内不重试、失效记录仅当失败超过 2 s 才记，重新列举最短 5 s / 最长 30 s，临时目标 60 s 内视为新鲜。
 */
var REMOTE_TARGET_TIMINGS = 8000;
var MAX_LIST_PAGE_SIZE = 5000;
var FAILED_LIST_RETRY_MS = 30000;
var FAILED_LIST_WINDOW_MS = 2000;
var MIN_RELIST_INTERVAL_MS = 5000;
var PROVISIONAL_FRESH_MS = 60000;
//@ chunk-sjeyntvz.js:24681-24940 placement
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
//@ chunk-sjeyntvz.js:24940-25341 placement
function nextListingInterval(context) {
  let state = context.toolState.get(RemoteToolTargetsState);
  let now = Date.now();
  let minInterval =
    state.provisional !== undefined &&
    (state.provisional.stub || now - state.provisional.since < PROVISIONAL_FRESH_MS)
      ? MIN_RELIST_INTERVAL_MS
      : MAX_RELIST_INTERVAL_MS;
  if (
    (state.lastForcedRelistAt !== undefined && now - state.lastForcedRelistAt < minInterval) ||
    (state.lastListedAt !== undefined && now - state.lastListedAt < MIN_RELIST_INTERVAL_MS)
  )
    return false;
  state.lastForcedRelistAt = now;
  let connection = state.connection;
  if (connection !== undefined)
    mcpClientModule().fetchToolsForClient.cache.delete(serverCacheKey(connection.name, connection.config));
  state.synced = false;
  state.listingMemo = undefined;
  return true;
}
//@ chunk-sjeyntvz.js:25341-25354 placement
var MAX_RELIST_INTERVAL_MS = 30000;
//@ chunk-sjeyntvz.js:25354-25418 placement
async function refreshRemoteToolTargets(context, hosts, trigger) {
  syncRemoteToolTargets(context, hosts, trigger);
  await refreshDeviceBridgeTargets(context, hosts, trigger);
  syncRemoteToolTargets(context, hosts, trigger);
}
export {
  remoteToolsContext,
  refreshRemoteToolTargets,
  nextListingInterval,
  PROBE_DEADLINE_MS,
  RemoteToolTargetsState,
  FAILED_LIST_RETRY_MS,
  REMOTE_TARGET_TIMINGS,
  MAX_LIST_PAGE_SIZE,
  FAILED_LIST_WINDOW_MS,
  SESSION_TRANSPORT_LIMITS,
  MIN_RELIST_INTERVAL_MS,
  PROVISIONAL_FRESH_MS,
  createSessionEventTransport,
};
