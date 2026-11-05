/**
 * remote/tools/servedChannel.ts
 *
 * 2.1.316 新增：远程会话连接与服务通道请求处理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-4z1ntdgk.js (19)
 * attribution: placement 18, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { printableExcerpt } from "../RemoteSessionManager.js";
import { parseServedCallRequest, parseMachineAdvert } from "./toolDescriptors.js";
import { REQUEST_REAUTHORED } from "./reauthoredRequest.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { logRemoteTools, remoteToolsLogLevel } from "../../services/remoteTools/remoteToolsDebug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import {
  ANNOUNCE_FAILURE_REASONS,
  UNVERIFIED_SENDER_2,
  createAnnounceLoop,
} from "../../utils/hooks/deviceHooks/deviceHookSession.js";
import {
  compareWithStated,
  misfitOfFit,
  interfaceTelemetry,
  misfitDirection,
  STILL_HERE_TEXT,
} from "./protocolConstants.js";
import { MINIMAL_INTERFACE_VERSION } from "./protocolNegotiation.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";
import { untrustedDeviceHint } from "../../bridge/trustedDevice.js";
import { REANNOUNCE_DELAYS_MS } from "../../bridge/deviceRegistration.js";
import { SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import {
  isBelowFloorEnforced,
  attestationFor as attestationFor_2,
} from "../../services/remoteTools/toolHostAttestation.js";
import { NOT_HELD_LEASE } from "../../services/remoteTools/lease.js";
import { HOLD_MAX_MS, DEFAULT_TYPED_AHEAD_GRACE_MS } from "../../services/homeSeed/firstSend.js";
import { sleep } from "../../utils/sleep.js";
import { classifyControlRequestError } from "../controlRequestErrors.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { errorMessage } from "../../utils/errors.js";
import { isServedCornerEnabled } from "./serve/servingFlags.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-4z1ntdgk.js:162247-162809 placement
/**
 * 处理会话通道上的 served-call 请求：为每个请求建立中止控制、转交服务端、回帖结果。
 */
function createServedChannelHandler({ serving, manager, observer }) {
  let inFlight = new Map();
  return {
    onServedChannelRequest: (request) => {
      let abortController = new AbortController();
      inFlight.set(request.requestId, abortController);
      runSafely(() => observer?.requestStarted?.());
      let requestWithSignal = {
        ...request,
        signal: AbortSignal.any([request.signal, abortController.signal]),
      };
      answerServedChannelRequest(requestWithSignal, serving, manager, observer)
        .catch((error) => {
          logError(error);
          manager()?.releaseServedChannelRequest(request.requestId);
        })
        .finally(() => {
          inFlight.delete(request.requestId);
          runSafely(() => observer?.requestEnded?.());
        });
    },
    onServedChannelRequestCancelled: () => {},
    onControlRequestRefused: (kind) => serving()?.noteUnlistedKind?.(kind),
    abandonInHand: () => {
      for (let [requestId, controller] of inFlight) {
        controller.abort();
        manager()?.releaseServedChannelRequest(requestId);
      }
      inFlight.clear();
    },
  };
}
//@ chunk-4z1ntdgk.js:162809-164283 placement
async function answerServedChannelRequest(request, serving, manager, observer) {
  let logNotAnswered = (reason) => {
    logForDebugging(
      `[servedChannel] ${request.subtype} ${printableExcerpt(request.requestId)} not answered here: ${reason}`,
    );
    manager()?.releaseServedChannelRequest(request.requestId);
  };
  let current = serving();
  if (current === null) return logNotAnswered("nothing serving");
  let startTime = performance.now();
  let parsed =
    request.subtype === "remote_tool_call"
      ? parseServedCallRequest(request.request, request.modeStamp)
      : undefined;
  if (
    request.subtype === "remote_tool_call" &&
    parsed === undefined &&
    request.modeStamp === REQUEST_REAUTHORED
  ) {
    logFeatureBad("remote_tool_serve", "shared_request_frame_unreadable");
    return logNotAnswered(
      "the session service vouched for this request's envelope, but the rest of the request could not be read",
    );
  }
  let legInfo =
    parsed?.request.ok === true && parsed.instance_id === current.instanceId
      ? {
          callId: parsed.request.value.call_id,
          leg:
            parsed.request.kind === "outcome_query"
              ? "outcome_of"
              : parsed.request.value.approval === undefined
                ? 1
                : 2,
          approval:
            parsed.request.kind === "outcome_query"
              ? "none"
              : (parsed.request.value.approval?.decision ?? "none"),
        }
      : undefined;
  runSafely(() => {
    if (legInfo !== undefined)
      logRemoteTools(
        legInfo.callId,
        "leg received",
        {
          leg: legInfo.leg,
          age_ms: request.ageMs === undefined ? undefined : Math.round(request.ageMs),
        },
        remoteToolsLogLevel(legInfo.leg),
      );
  });
  let observerInfo =
    observer !== undefined && parsed !== undefined && parsed.instance_id === current.instanceId
      ? {
          observer,
          leg: parsed,
        }
      : undefined;
  runSafely(() => observerInfo?.observer.legStarted(observerInfo.leg, request.ageMs));
  let answer;
  try {
    answer = await handleServedChannelRequest(request, current, parsed);
  } finally {
    runSafely(() => observerInfo?.observer.legAnswered(observerInfo.leg, answer?.result));
  }
  if (answer === undefined) return logNotAnswered("not this client's to answer");
  if (request.signal.aborted) return;
  let rounded = Math.round(performance.now() - startTime);
  if (
    manager()?.respondToServedChannelRequest(
      request.requestId,
      answer,
      legInfo === undefined
        ? undefined
        : (reply, replyMs) => logServedChannelReply(legInfo, rounded, reply, replyMs),
    ) !== true
  )
    logForDebugging(
      `[servedChannel] ${request.subtype} ${printableExcerpt(request.requestId)} answered after it was withdrawn \u2014 result dropped`,
    );
}
//@ chunk-4z1ntdgk.js:164283-164771 placement
function logServedChannelReply(legInfo, serveMs, reply, replyMs) {
  let signMs = reply.outcome === "accepted" ? reply.signMs : undefined;
  let postMs = reply.outcome === "accepted" ? reply.postMs : undefined;
  logRemoteTools(
    legInfo.callId,
    "reply posted",
    {
      leg: legInfo.leg,
      serve_ms: serveMs,
      reply_ms: replyMs,
      sign_ms: signMs,
      post_ms: postMs,
      post_outcome: reply.outcome,
    },
    remoteToolsLogLevel(legInfo.leg),
  );
  if (legInfo.leg === "outcome_of") return;
  logEvent("tengu_remote_tool_serve", {
    op: lit("reply"),
    call_id: sanitizeMarkName(legInfo.callId),
    transport: lit("session"),
    second_leg: legInfo.leg === 2,
    approval_decision: fromEnum(legInfo.approval),
    serve_ms: serveMs,
    reply_ms: replyMs,
    reply_sign_ms: signMs,
    reply_post_ms: postMs,
    reply_accepted: reply.outcome === "accepted",
  });
}
//@ chunk-4z1ntdgk.js:164771-164809 placement
function runSafely(fn) {
  try {
    fn();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-4z1ntdgk.js:164809-165303 placement
async function handleServedChannelRequest(request, serving, parsed) {
  let ctx = {
    signal: request.signal,
    requestId: request.requestId,
    ageMs: request.ageMs,
    workerEpoch: request.workerEpoch,
    attestationStatus: request.attestationStatus,
    modeStamp: request.modeStamp,
  };
  switch (request.subtype) {
    case "remote_tool_call":
      return parsed === undefined ? undefined : serving.serveSessionToolCall(parsed, ctx);
    case "remote_plumbing_call": {
      let machineAdvert = parseMachineAdvert(request.request);
      return machineAdvert === undefined ? undefined : serving.servePlumbingCall(machineAdvert, ctx);
    }
    case "remote_tools_probe":
      return request.request.instance_id === serving.instanceId ? serving.answerProbe() : undefined;
    case "remote_tools_reannounce":
      return;
  }
}
//@ chunk-4z1ntdgk.js:165303-165518 placement
var isEmptyAnnouncement; // deferred: uses announceResponseSchema (../../utils/hooks/deviceHooks/deviceHookSession.js) of its import cycle while loading; runs once the cycle is complete
var REANNOUNCE_DEBOUNCE_MS;
var KNOWN_ANNOUNCE_FAILURE_REASONS;
deferInit("chunk-4z1ntdgk.js:165303", () => {
  isEmptyAnnouncement = (announcement) =>
    announcement.tools.length + announcement.plumbing.length + (announcement.passthrough?.length ?? 0) === 0;
  REANNOUNCE_DEBOUNCE_MS = 1e4;
  KNOWN_ANNOUNCE_FAILURE_REASONS = new Set([
    ...ANNOUNCE_FAILURE_REASONS,
    "invalid_announce",
    "no_answer_parked",
    "remote_tools_disabled",
    "remote_tools_not_ready",
    "stale_worker_epoch",
    UNVERIFIED_SENDER_2,
  ]);
});
//@ chunk-4z1ntdgk.js:165518-165609 placement
function normalizeAnnounceFailureReason(reason) {
  let prefix = /^[a-z_]+(?=:|$)/.exec(reason)?.[0];
  return prefix !== undefined && KNOWN_ANNOUNCE_FAILURE_REASONS.has(prefix) ? prefix : "other";
}
//@ chunk-4z1ntdgk.js:165609-165769 layout
function judgeAnnouncedInterface(ours, outcome) {
  if (outcome.kind !== "announced" || outcome.status !== "announced") return;
  let stated = outcome.sessionInterface ?? {
    kind: "none",
  };
  let fit = compareWithStated(ours, stated);
  return {
    stated,
    fit,
    misfit: misfitOfFit(fit),
  };
}
//@ chunk-4z1ntdgk.js:165769-166110 placement
function logAnnounceOutcome(outcome, judgement) {
  if (outcome.kind === "failed" && outcome.reason === "replaced") return;
  if (outcome.kind === "announced") {
    let telemetry = judgement && interfaceTelemetry(judgement.stated, judgement.fit);
    if (judgement?.misfit === undefined) logFeatureOk("remote_tools_client_announce", telemetry);
    else logFeatureSad("remote_tools_client_announce", misfitDirection(judgement.misfit), telemetry);
    return;
  }
  logFeatureSad(
    "remote_tools_client_announce",
    outcome.kind === "unsupported"
      ? "unsupported"
      : `${outcome.kind}_${normalizeAnnounceFailureReason(outcome.reason)}`,
  );
}
//@ chunk-4z1ntdgk.js:166110-172251 placement
/**
 * REPL 远程会话连接（云会话）：注册设备钩子与远程工具、维持心跳与重连、同步权限模式与 served 调用。
 */
function createRemoteSessionConnection(options) {
  let instanceId = `cc-${randomUUID()}`;
  let servingContext = null;
  let closed = false;
  let pendingAnnounce = null;
  let closePromise = null;
  let unsubscribeTools = () => {};
  let workerEpoch;
  let announcedEpoch;
  let unsupportedEpoch;
  let noAnswerEpoch;
  let inflightEpoch;
  let announcedAtBuild;
  let highestEpoch;
  let lastAsked;
  let answeredSinceAsk = false;
  let announcedEmpty = false;
  let announcedNothing = false;
  let workerWantsStillHere = false;
  let toldUnverified = false;
  let seenEpoch;
  let hostAsleep = false;
  let lastWokeAt;
  let heldRequests = new Map();
  let announceLoop = createAnnounceLoop({
    hostAsleep: () => hostAsleep,
    session: options.manager,
    workerLive: () => options.manager()?.workerLive() ?? false,
    build: () => {
      let tools = servingContext?.servedTools?.();
      if (tools === undefined) return;
      announcedEmpty = isEmptyAnnouncement(tools);
      announcedAtBuild = workerEpoch ?? inflightEpoch;
      return options.buildAnnounce(tools, instanceId, workerEpoch);
    },
    onOutcome: (outcome, mode) => {
      let epochAtBuild = announcedAtBuild;
      inflightEpoch = undefined;
      let returnedFailed = mode === "returned" && outcome.kind === "failed";
      let judgement = judgeAnnouncedInterface(options.interfaceRange ?? MINIMAL_INTERFACE_VERSION, outcome);
      if (outcome.kind === "announced") {
        if (outcome.workerEpoch !== undefined)
          highestEpoch = Math.max(highestEpoch ?? 0, outcome.workerEpoch);
        if (
          outcome.workerEpoch !== undefined &&
          (workerEpoch === undefined || outcome.workerEpoch >= workerEpoch)
        )
          workerEpoch = outcome.workerEpoch;
        else if (outcome.workerEpoch !== workerEpoch)
          logRemoteTools(undefined, "epoch ratchet ignored", {
            heard: outcome.workerEpoch,
            kept: workerEpoch,
          });
        announcedEpoch = outcome.passthroughDeclined === "pending" ? undefined : outcome.workerEpoch;
        unsupportedEpoch = undefined;
        noAnswerEpoch = undefined;
        answeredSinceAsk = false;
        announcedNothing = announcedEmpty;
        workerWantsStillHere = outcome.workerCapabilities?.includes(STILL_HERE_TEXT) === true;
        if (judgement !== undefined)
          logRemoteTools(undefined, "session ToolHost interface versions", {
            stated: judgement.stated.kind,
            fit: judgement.fit.kind,
          });
        if (
          judgement?.misfit !== undefined &&
          (seenEpoch === undefined || (outcome.workerEpoch ?? 0) > seenEpoch)
        ) {
          seenEpoch = outcome.workerEpoch ?? 0;
          let misfit = misfitDirection(judgement.misfit);
          options.onNotice?.(misfit, REMOTE_TOOLS_CONSENT_TEXT[`serving_off.${misfit}`]);
        }
      } else if (!returnedFailed) {
        announcedEpoch = undefined;
        answeredSinceAsk =
          outcome.kind === "failed" ||
          outcome.kind === "retry" ||
          (outcome.kind === "refused" && outcome.reason === "no_answer_parked");
        if (outcome.kind === "refused" && outcome.reason === "no_answer_parked") noAnswerEpoch = epochAtBuild;
        else if (outcome.kind === "refused" || outcome.kind === "unsupported") {
          unsupportedEpoch = epochAtBuild;
          if (outcome.kind === "refused" && outcome.reason === UNVERIFIED_SENDER_2 && !toldUnverified) {
            toldUnverified = true;
            options.onNotice?.(
              "announce_unverified",
              REMOTE_TOOLS_CONSENT_TEXT.announce_unverified(untrustedDeviceHint()),
            );
          }
        } else if (outcome.kind === "retry" && outcome.reason === "stale_worker_epoch") {
          workerEpoch = undefined;
          highestEpoch = undefined;
        }
      }
      if (mode !== "returned" || (!returnedFailed && outcome.kind !== "announced"))
        logAnnounceOutcome(outcome, judgement);
      options.onAnnounceOutcome?.(outcome, mode, judgement?.misfit);
    },
    ...(options.signal && {
      signal: options.signal,
    }),
    ...options.announcer,
  });
  let attachServing = (context) => {
    if (closed) {
      context.dispose();
      return;
    }
    servingContext = context;
    markServing();
    unsubscribeTools =
      context.onServedToolsChanged?.((cause) => {
        markServing();
        requestAnnounce("tools_changed", {
          coalesceMs:
            cause === undefined || cause === "adopted" || cause === "redescribed"
              ? 0
              : REANNOUNCE_DELAYS_MS[cause],
        });
      }) ?? unsubscribeTools;
    if (pendingAnnounce !== null) {
      let { reason, opts } = pendingAnnounce;
      pendingAnnounce = null;
      requestAnnounce(reason, opts);
    }
  };
  let markServing = () => {
    if (closed) return;
    let tools = servingContext?.servedTools?.();
    options.manager()?.markServing(tools !== undefined && !isEmptyAnnouncement(tools));
  };
  let requestAnnounce = (reason, opts) => {
    if (servingContext === null) {
      pendingAnnounce = {
        reason,
        ...(opts && {
          opts,
        }),
      };
      return;
    }
    if (reason === "attached") markServing();
    if (reason === "worker_asked") {
      announcedEpoch = undefined;
      unsupportedEpoch = undefined;
      noAnswerEpoch = undefined;
      inflightEpoch = undefined;
      announceLoop.requestAnnounce("worker_asked");
      return;
    }
    if (reason === "returned") {
      if (announcedEpoch === undefined || announcedNothing) {
        requestAnnounce("reconnected");
        return;
      }
      announceLoop.requestAnnounce("returned");
      return;
    }
    if (
      (reason === "reconnected" && announcedEpoch !== undefined) ||
      (reason === "attached" && (announcedEpoch !== undefined || inflightEpoch !== undefined))
    ) {
      logForDebugging(
        `[servedChannel] ${reason}: nothing to announce \u2014 worker epoch ${announcedEpoch ?? inflightEpoch} already has (or is being told) this machine's tools`,
      );
      return;
    }
    if (
      reason === "worker_init" &&
      opts?.workerEpoch !== undefined &&
      (opts.workerEpoch === announcedEpoch ||
        opts.workerEpoch === unsupportedEpoch ||
        opts.workerEpoch === noAnswerEpoch ||
        opts.workerEpoch === inflightEpoch ||
        (workerEpoch !== undefined && opts.workerEpoch < workerEpoch))
    )
      return;
    announcedEpoch = undefined;
    if (reason === "reconnected") noAnswerEpoch = undefined;
    if (reason === "worker_init") {
      if (opts?.workerEpoch !== undefined) highestEpoch = Math.max(highestEpoch ?? 0, opts.workerEpoch);
      inflightEpoch = opts?.workerEpoch;
      let epochIsCurrent =
        opts?.workerEpoch === undefined || workerEpoch === undefined || opts.workerEpoch === workerEpoch;
      if (opts?.workerEpoch !== undefined) workerEpoch = opts.workerEpoch;
      if (epochIsCurrent && announceLoop.outstanding()) return;
    } else if (reason === "tools_changed") {
      unsupportedEpoch = undefined;
      noAnswerEpoch = undefined;
    }
    announceLoop.requestAnnounce(reason, {
      ...(opts?.coalesceMs !== undefined && {
        coalesceMs: opts.coalesceMs,
      }),
    });
  };
  let onReannounceRequested = (request) => {
    options.manager()?.releaseServedChannelRequest(request.requestId);
    let parsed = SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema().safeParse(request.request);
    let now = Date.now();
    let ignore =
      !parsed.success ||
      request.ageMs === undefined ||
      request.ageMs > parsed.data.deadline_ms ||
      isBelowFloorEnforced(attestationFor_2(request.attestationStatus)) ||
      (highestEpoch !== undefined && parsed.data.worker_epoch < highestEpoch) ||
      (lastAsked?.epoch === parsed.data.worker_epoch && !answeredSinceAsk) ||
      (lastAsked !== undefined && now - lastAsked.at < REANNOUNCE_DEBOUNCE_MS) ||
      announceLoop.outstanding();
    if (!parsed.success || ignore) {
      logForDebugging(
        "[servedChannel] remote_tools_reannounce not honoured: unreadable, undated, past its wait, from a sender held back, from an older worker, already answered, rate limited, or an announce is already out",
      );
      return;
    }
    lastAsked = {
      epoch: parsed.data.worker_epoch,
      at: now,
    };
    answeredSinceAsk = false;
    requestAnnounce("worker_asked");
  };
  let context = options.createServingContext({
    sessionId: options.sessionId,
    instanceId,
    ...(options.onNotice && {
      onNotice: options.onNotice,
    }),
  });
  let servingReady =
    context instanceof Promise
      ? context.then(attachServing).catch((error) => {
          logError(error);
        })
      : Promise.resolve(attachServing(context));
  let unsubscribeRevoked = () => {};
  let leaveState;
  let close = (relaunchIsNext) => {
    let withdraw = leaveState?.relaunchIsNext.aborted === false ? leaveState.withdraw() : undefined;
    let closeWork = (closePromise ??= (async () => {
      closed = true;
      unsubscribeRevoked();
      for (let key of heldRequests.keys()) options.manager()?.releaseServedChannelRequest(key);
      heldRequests.clear();
      let tools = servingContext?.servedTools?.();
      let announcementEmpty = tools === undefined || isEmptyAnnouncement(tools);
      let withdrawWork =
        announcedNothing && announcedEmpty && announcementEmpty
          ? Promise.resolve(announceLoop.dispose())
          : announceLoop.withdraw(relaunchIsNext);
      options.manager()?.markServing(false);
      await servingReady;
      unsubscribeTools();
      await withdrawWork;
      servingContext?.dispose();
      announceLoop.dispose();
    })());
    return withdraw === undefined ? closeWork : withdraw.then(() => closeWork);
  };
  let { abandonInHand, onServedChannelRequest, ...handlerRest } = createServedChannelHandler({
    serving: () => (closed ? null : servingContext),
    manager: options.manager,
    observer: options.onServedCall,
  });
  let routeRequest = (request) =>
    request.subtype === "remote_tools_reannounce"
      ? onReannounceRequested(request)
      : onServedChannelRequest?.(request);
  let handle = {
    instanceId,
    callbacks: {
      ...handlerRest,
      onServedChannelRequest: (request) => {
        let withEpoch =
          request.subtype === "remote_tools_reannounce"
            ? request
            : {
                ...request,
                workerEpoch: request.workerEpoch ?? workerEpoch,
              };
        if (
          withEpoch.subtype === "remote_tools_probe" &&
          (hostAsleep ||
            (lastWokeAt !== undefined &&
              withEpoch.ageMs !== undefined &&
              Date.now() - withEpoch.ageMs < lastWokeAt))
        ) {
          logForDebugging(
            `[servedChannel] remote_tools_probe ${printableExcerpt(withEpoch.requestId)} not answered: the host ${hostAsleep ? "says this computer sleeps" : "had not yet said it woke when it was stored"}`,
          );
          options.manager()?.releaseServedChannelRequest(withEpoch.requestId);
        } else if (hostAsleep && !closed) {
          logForDebugging(
            `[servedChannel] ${withEpoch.subtype} ${printableExcerpt(withEpoch.requestId)} held until the host says this computer woke`,
          );
          heldRequests.set(withEpoch.requestId, {
            request: withEpoch,
            at: Date.now(),
          });
        } else routeRequest(withEpoch);
      },
      onWorkerLive: () => announceLoop.workerLive(),
      onWorkerGone: () => {
        announcedEpoch = undefined;
        servingContext?.workerGone?.();
      },
    },
    requestAnnounce,
    sayAsleep: () => {
      hostAsleep = true;
      return closed || announcedEpoch === undefined || announcedNothing
        ? null
        : announceLoop.sayAsleep(announcedEpoch);
    },
    sayStillHere: () =>
      !closed &&
      !hostAsleep &&
      announcedEpoch !== undefined &&
      !announcedNothing &&
      workerWantsStillHere &&
      announceLoop.sayStillHere(announcedEpoch),
    hostWoke: (workerLiveFirst) => {
      if (!hostAsleep) return;
      hostAsleep = false;
      let now = Date.now();
      lastWokeAt = now;
      if (!workerLiveFirst) announceLoop.workerLive();
      let held = [...heldRequests.values()];
      heldRequests.clear();
      for (let { request, at } of held) {
        if (request.signal.aborted) continue;
        try {
          routeRequest({
            ...request,
            ageMs: request.ageMs === undefined ? undefined : request.ageMs + (now - at),
          });
        } catch (error) {
          logError(error);
          options.manager()?.releaseServedChannelRequest(request.requestId);
        }
      }
    },
    heldServedCall: (params) =>
      closed || servingContext === null
        ? NOT_HELD_LEASE
        : (servingContext.heldServedCall?.(params) ?? NOT_HELD_LEASE),
    servedHost: () => (closed ? undefined : servingContext?.servedTools?.()?.host),
    hasBackgroundWork: () => !closed && servingContext?.hasBackgroundWork?.() === true,
    close,
    leaveForRestart: (relaunchIsNext) => {
      if (leaveState !== undefined) return leaveState.withdraw;
      abandonInHand();
      let withdrawPromise = announceLoop.disposeKeepingWithdraw();
      close();
      let withdrawFn = announcedNothing && announcedEmpty ? () => Promise.resolve() : withdrawPromise;
      leaveState = {
        withdraw: withdrawFn,
        relaunchIsNext,
      };
      return withdrawFn;
    },
  };
  unsubscribeRevoked =
    options.onRevoked?.((reason) => {
      logForDebugging(
        `[servedChannel] serving revoked on this machine (${reason}) \u2014 closing the channel`,
      );
      abandonInHand();
      options.manager()?.giveUpKeptServedResults();
      close();
    }) ?? unsubscribeRevoked;
  if (closed) unsubscribeRevoked();
  return handle;
}
//@ chunk-4z1ntdgk.js:172251-172683 placement
/**
 * 权限模式推送失败的退避与三段提示文案：重试 400/1200 ms、5 s 窗口，以及 server 未保存、会话空闲、会话未激活三种说明。
 */
var REMOTE_SESSION_TIMINGS = [400, 1200];
var MODE_PUSH_RETRY_WINDOW_MS = 5000;
var MODE_NOT_SAVED_IDLE_TEXT =
  "Switch permission modes away and back once to keep this session's mode: it couldn't be saved on the server, so the session may fall back to default after idling.";
var MODE_NOT_SAVED_TEXT =
  "Switch permission modes away and back once: this session's mode couldn't be saved on the server.";
var MODE_NOT_SAVED_INACTIVE_TEXT =
  "This session's permission mode couldn't be saved: the server says the session isn't active. Switch modes away and back once it is.";
//@ chunk-4z1ntdgk.js:172683-172800 placement
function isRetryablePostFailure(posted) {
  return (
    posted.outcome === "failed" &&
    (posted.cause === "network" ||
      (posted.cause === "http" && (posted.status >= 500 || posted.status === 429)))
  );
}
//@ chunk-4z1ntdgk.js:172800-175029 placement
function syncRemotePermissionMode({
  manager,
  mode,
  surface,
  sessionId,
  superseded,
  observedMode,
  seededModeReported,
  onRefused,
  onGaveUp,
  onTaken,
  linkDown,
}) {
  let logPush = (posted) => {
    logEvent("tengu_remote_create_permission_mode_push", {
      surface: fromEnum(surface),
      mode: fromEnum(mode),
      kind: fromEnum(posted.kind),
      posted_mode: fromEnum(posted.postedMode),
      outcome: fromEnum(posted.outcome),
      ...("cause" in posted && {
        cause: fromEnum(posted.cause),
      }),
      ...("status" in posted && {
        status: posted.status,
      }),
      ...(posted.attempt !== undefined && {
        attempt: posted.attempt,
      }),
      session_id: sanitizeMarkName(sessionId),
    });
  };
  let isSuperseded = () => {
    let currentObserved = observedMode?.();
    return (
      superseded() ||
      (currentObserved !== undefined &&
        currentObserved !== mode &&
        (currentObserved !== "default" || (seededModeReported?.() ?? false)))
    );
  };
  let pushMode = async (postedMode, kind, startedAt = Date.now(), attempt = 1) => {
    let abortController = new AbortController();
    let call = manager.postControlRequest(
      {
        subtype: "set_permission_mode",
        mode: postedMode,
      },
      {
        answerExpected: false,
        background: true,
        timeoutMs: HOLD_MAX_MS,
        signal: abortController.signal,
      },
    );
    call.response.catch(() => {});
    let posted = await call.posted;
    logPush({
      ...posted,
      kind,
      postedMode,
      attempt,
    });
    if (posted.outcome === "accepted")
      return {
        result: posted,
        response: call.response,
      };
    abortController.abort();
    if (isSuperseded()) {
      logPush({
        kind,
        postedMode,
        outcome: "superseded",
      });
      return {
        result: posted,
        response: null,
      };
    }
    let delayMs = REMOTE_SESSION_TIMINGS[attempt - 1];
    if (
      delayMs !== undefined &&
      isRetryablePostFailure(posted) &&
      Date.now() - startedAt < MODE_PUSH_RETRY_WINDOW_MS
    ) {
      await sleep(delayMs);
      if (!isSuperseded()) return pushMode(postedMode, kind, startedAt, attempt + 1);
      logPush({
        kind,
        postedMode,
        outcome: "superseded",
      });
      return {
        result: posted,
        response: null,
      };
    }
    logPush({
      kind,
      postedMode,
      outcome: "gave_up",
    });
    logFeatureBad("remote_create_mode_push", `${kind}_gave_up`);
    if (!(posted.outcome === "failed" && posted.cause === "closed"))
      onGaveUp?.(
        posted.outcome === "session_inactive"
          ? MODE_NOT_SAVED_INACTIVE_TEXT
          : kind === "push"
            ? MODE_NOT_SAVED_IDLE_TEXT
            : MODE_NOT_SAVED_TEXT,
      );
    return {
      result: posted,
      response: null,
    };
  };
  let watchResponse = (response) => {
    response.then(
      () => {
        logPush({
          kind: "push",
          postedMode: mode,
          outcome: "taken",
        });
        onTaken?.();
        logFeatureOk("remote_create_mode_push");
        logForDebugging(`[remote] The session took its create's ${mode} permission mode as a live request`);
      },
      (error) => {
        let errorKind = classifyControlRequestError(error);
        logForDebugging(
          `[remote] The create's ${mode} permission mode push was not taken (${errorKind}): ${sanitizeDisplayText(
            errorMessage(error),
            {
              maxCodeUnits: 200,
            },
          )}`,
        );
        if (!(
          errorKind === "server_error" ||
          ((errorKind === "disconnected" || errorKind === "not_connected") &&
            linkDown !== undefined &&
            !linkDown())
        )) {
          logPush({
            kind: "push",
            postedMode: mode,
            outcome: "unanswered",
          });
          logFeatureSad("remote_create_mode_push", "unanswered");
          return;
        }
        logPush({
          kind: "push",
          postedMode: mode,
          outcome: "refused",
        });
        logFeatureSad("remote_create_mode_push", "refused");
        if (isSuperseded() || mode === "default") return;
        let converge = pushMode("default", "converge");
        converge.then(({ response }) =>
          response?.catch((error) => {
            logForDebugging(
              `[remote] The default mode sent after that refusal was not taken either: ${sanitizeDisplayText(
                errorMessage(error),
                {
                  maxCodeUnits: 200,
                },
              )}`,
            );
          }),
        );
        onRefused?.(converge.then(({ result }) => result));
      },
    );
  };
  return pushMode(mode, "push").then(({ result, response }) => {
    if (response !== null) watchResponse(response);
    return result;
  });
}
//@ chunk-4z1ntdgk.js:175029-175394 placement
function retirePostedMode({ posted, mode, latch, retire, now = Date.now }) {
  let accepted = posted.then(
    (posted) => posted.outcome === "accepted",
    () => false,
  );
  accepted.then((isAccepted) => {
    if (isAccepted) retire();
    else latch.notTakenAtMs ??= now();
  });
  return async ({ submittedAtMs }) => {
    let submittedAt = submittedAtMs ?? now();
    if (await accepted) return;
    if (submittedAt - (latch.notTakenAtMs ?? submittedAt) < DEFAULT_TYPED_AHEAD_GRACE_MS)
      return {
        go: false,
        reason: `the session's ${mode} permission mode couldn't be saved on the server first`,
      };
    retire();
    return;
  };
}
//@ chunk-4z1ntdgk.js:175394-175591 placement
/**
 * 远程响应等待超时与提示：普通 60 s、等待用户答复 180 s，以及“云端可能无响应”“Claude 在等你回答”两段文案。
 */
var REMOTE_RESPONSE_TIMEOUTS = 60000;
var REMOTE_RESPONSE_ASK_TIMEOUT_MS = 180000;
var UNRESPONSIVE_NOTICE = "Cloud session may be unresponsive. Attempting to reconnect\u2026";
var WAITING_FOR_ANSWER_NOTICE =
  "Claude is waiting for you to answer its request and will continue with this message once you do.";
//@ chunk-4z1ntdgk.js:175591-175622 placement
function responseTimeoutMs(whileAsked) {
  return whileAsked ? REMOTE_RESPONSE_ASK_TIMEOUT_MS : REMOTE_RESPONSE_TIMEOUTS;
}
//@ chunk-4z1ntdgk.js:175622-176376 placement
class ServedCallWatch {
  holdsWhileAsked;
  openRequests = new Set();
  watched = null;
  watch(onSilent, schedule) {
    let wasHolding = this.holds();
    if (wasHolding) this.clear();
    let watch = {
      onSilent,
      schedule,
      cancel: null,
    };
    this.watched = watch;
    if (wasHolding && this.openRequests.size > 0) {
      logFeatureOk("remote_response_watch_hold");
      return false;
    }
    this.start(watch);
    return true;
  }
  clear() {
    this.watched?.cancel?.();
    this.watched = null;
  }
  requestOpened(requestId) {
    this.openRequests.add(requestId);
    if (this.holds() && this.watched?.cancel) {
      this.watched.cancel();
      this.watched.cancel = null;
      logFeatureOk("remote_response_watch_hold");
    }
  }
  requestClosed(requestId) {
    this.openRequests.delete(requestId);
    if (this.openRequests.size === 0 && this.watched?.cancel === null) this.start(this.watched);
  }
  holds() {
    this.holdsWhileAsked ??= isServedCornerEnabled();
    return this.holdsWhileAsked;
  }
  start(watch) {
    watch.cancel = watch.schedule(() => {
      if (this.watched === watch) this.watched = null;
      watch.onSilent();
    });
  }
}
//@ chunk-4z1ntdgk.js:176376-176408 placement
var TENGU_VIOLIN_COLOPHONY = "tengu_violin_colophony";
//@ chunk-4z1ntdgk.js:176408-176465 placement
function isServedCallWatchEnabled() {
  try {
    return getFeatureValue_SESSION_PINNED(TENGU_VIOLIN_COLOPHONY, false) === true;
  } catch {
    return false;
  }
}
export {
  ServedCallWatch,
  isServedCallWatchEnabled,
  createRemoteSessionConnection,
  syncRemotePermissionMode,
  retirePostedMode,
  MODE_NOT_SAVED_IDLE_TEXT,
  UNRESPONSIVE_NOTICE,
  responseTimeoutMs,
  WAITING_FOR_ANSWER_NOTICE,
};
