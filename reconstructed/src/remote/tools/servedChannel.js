/**
 * remote/tools/servedChannel.ts
 *
 * 2.1.316 新增：远程会话连接与服务通道请求处理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mthxbav8.js (18)
 * attribution: placement 18
 */
import { randomUUID } from "crypto";
import { logError } from "../../utils/log.js";
import { logForDebugging } from "../../utils/debug.js";
import { printableExcerpt } from "../RemoteSessionManager.js";
import { parseServedCallRequest, parseMachineAdvert } from "./toolDescriptors.js";
import { logRemoteTools, remoteToolsLogLevel } from "../../services/remoteTools/remoteToolsDebug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import {
  ANNOUNCE_FAILURE_REASONS,
  UNVERIFIED_SENDER_2,
  createAnnounceLoop,
} from "../../utils/hooks/deviceHooks/deviceHookSession.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { STILL_HERE_TEXT } from "./protocolConstants.js";
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

//@ chunk-mthxbav8.js:148048-148610 placement
/**
 * 处理会话通道上的 served-call 请求：为每个请求建立中止控制、转交服务端、回帖结果。
 */
function createServedChannelHandler({ serving, manager, observer }) {
  let s = new Map();
  return {
    onServedChannelRequest: (u) => {
      let abortController = new AbortController();
      s.set(u.requestId, abortController);
      runSafely(() => observer?.requestStarted?.());
      let w = {
        ...u,
        signal: AbortSignal.any([u.signal, abortController.signal]),
      };
      answerServedChannelRequest(w, serving, manager, observer)
        .catch((error) => {
          logError(error);
          manager()?.releaseServedChannelRequest(u.requestId);
        })
        .finally(() => {
          s.delete(u.requestId);
          runSafely(() => observer?.requestEnded?.());
        });
    },
    onServedChannelRequestCancelled: () => {},
    onControlRequestRefused: (u) => serving()?.noteUnlistedKind?.(u),
    abandonInHand: () => {
      for (let [u, S] of s) {
        S.abort();
        manager()?.releaseServedChannelRequest(u);
      }
      s.clear();
    },
  };
}
//@ chunk-mthxbav8.js:148610-149832 placement
async function answerServedChannelRequest(e, serving, manager, observer) {
  let u = (x) => {
    logForDebugging(`[servedChannel] ${e.subtype} ${printableExcerpt(e.requestId)} not answered here: ${x}`);
    manager()?.releaseServedChannelRequest(e.requestId);
  };
  let S = serving();
  if (S === null) return u("nothing serving");
  let startTime = performance.now();
  let h = e.subtype === "remote_tool_call" ? parseServedCallRequest(e.request) : undefined;
  let v =
    h?.request.ok === true && h.instance_id === S.instanceId
      ? {
          callId: h.request.value.call_id,
          leg:
            h.request.kind === "outcome_query"
              ? "outcome_of"
              : h.request.value.approval === undefined
                ? 1
                : 2,
          approval:
            h.request.kind === "outcome_query" ? "none" : (h.request.value.approval?.decision ?? "none"),
        }
      : undefined;
  runSafely(() => {
    if (v !== undefined)
      logRemoteTools(
        v.callId,
        "leg received",
        {
          leg: v.leg,
          age_ms: e.ageMs === undefined ? undefined : Math.round(e.ageMs),
        },
        remoteToolsLogLevel(v.leg),
      );
  });
  let y =
    observer !== undefined && h !== undefined && h.instance_id === S.instanceId
      ? {
          observer,
          leg: h,
        }
      : undefined;
  runSafely(() => y?.observer.legStarted(y.leg, e.ageMs));
  let C;
  try {
    C = await handleServedChannelRequest(e, S, h);
  } finally {
    runSafely(() => y?.observer.legAnswered(y.leg, C?.result));
  }
  if (C === undefined) return u("not this client's to answer");
  if (e.signal.aborted) return;
  let rounded = Math.round(performance.now() - startTime);
  if (
    manager()?.respondToServedChannelRequest(
      e.requestId,
      C,
      v === undefined ? undefined : (x, replyMs) => logServedChannelReply(v, rounded, x, replyMs),
    ) !== true
  )
    logForDebugging(
      `[servedChannel] ${e.subtype} ${printableExcerpt(e.requestId)} answered after it was withdrawn \u2014 result dropped`,
    );
}
//@ chunk-mthxbav8.js:149832-150320 placement
function logServedChannelReply(e, serveMs, r, replyMs) {
  let signMs = r.outcome === "accepted" ? r.signMs : undefined;
  let postMs = r.outcome === "accepted" ? r.postMs : undefined;
  logRemoteTools(
    e.callId,
    "reply posted",
    {
      leg: e.leg,
      serve_ms: serveMs,
      reply_ms: replyMs,
      sign_ms: signMs,
      post_ms: postMs,
      post_outcome: r.outcome,
    },
    remoteToolsLogLevel(e.leg),
  );
  if (e.leg === "outcome_of") return;
  logEvent("tengu_remote_tool_serve", {
    op: lit("reply"),
    call_id: sanitizeMarkName(e.callId),
    transport: lit("session"),
    second_leg: e.leg === 2,
    approval_decision: fromEnum(e.approval),
    serve_ms: serveMs,
    reply_ms: replyMs,
    reply_sign_ms: signMs,
    reply_post_ms: postMs,
    reply_accepted: r.outcome === "accepted",
  });
}
//@ chunk-mthxbav8.js:150320-150358 placement
function runSafely(e) {
  try {
    e();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-mthxbav8.js:150358-150852 placement
async function handleServedChannelRequest(e, n, r) {
  let s = {
    signal: e.signal,
    requestId: e.requestId,
    ageMs: e.ageMs,
    workerEpoch: e.workerEpoch,
    attestationStatus: e.attestationStatus,
    modeStamp: e.modeStamp,
  };
  switch (e.subtype) {
    case "remote_tool_call":
      return r === undefined ? undefined : n.serveSessionToolCall(r, s);
    case "remote_plumbing_call": {
      let machineAdvert = parseMachineAdvert(e.request);
      return machineAdvert === undefined ? undefined : n.servePlumbingCall(machineAdvert, s);
    }
    case "remote_tools_probe":
      return e.request.instance_id === n.instanceId ? n.answerProbe() : undefined;
    case "remote_tools_reannounce":
      return;
  }
}
//@ chunk-mthxbav8.js:150852-151067 placement
var isEmptyAnnouncement = (e) => e.tools.length + e.plumbing.length + (e.passthrough?.length ?? 0) === 0;
var REANNOUNCE_DEBOUNCE_MS = 1e4;
var KNOWN_ANNOUNCE_FAILURE_REASONS = new Set([
  ...ANNOUNCE_FAILURE_REASONS,
  "invalid_announce",
  "no_answer_parked",
  "remote_tools_disabled",
  "remote_tools_not_ready",
  "stale_worker_epoch",
  UNVERIFIED_SENDER_2,
]);
//@ chunk-mthxbav8.js:151067-151158 placement
function normalizeAnnounceFailureReason(reason) {
  let n = /^[a-z_]+(?=:|$)/.exec(reason)?.[0];
  return n !== undefined && KNOWN_ANNOUNCE_FAILURE_REASONS.has(n) ? n : "other";
}
//@ chunk-mthxbav8.js:151158-151389 placement
function logAnnounceOutcome(e) {
  if (e.kind === "failed" && e.reason === "replaced") return;
  if (e.kind === "announced") {
    logFeatureOk("remote_tools_client_announce");
    return;
  }
  logFeatureSad(
    "remote_tools_client_announce",
    e.kind === "unsupported" ? "unsupported" : `${e.kind}_${normalizeAnnounceFailureReason(e.reason)}`,
  );
}
//@ chunk-mthxbav8.js:151389-157149 placement
/**
 * REPL 远程会话连接（云会话）：注册设备钩子与远程工具、维持心跳与重连、同步权限模式与 served 调用。
 */
function createRemoteSessionConnection(e) {
  let n = `cc-${randomUUID()}`;
  let r = null;
  let s = false;
  let u = null;
  let S = null;
  let w = () => {};
  let h;
  let v;
  let y;
  let C;
  let O;
  let x;
  let R;
  let j;
  let M = false;
  let q = false;
  let T = false;
  let P = false;
  let L = false;
  let N = false;
  let F;
  let X = new Map();
  let announceLoop = createAnnounceLoop({
    hostAsleep: () => N,
    session: e.manager,
    workerLive: () => e.manager()?.workerLive() ?? false,
    build: () => {
      let V = r?.servedTools?.();
      if (V === undefined) return;
      q = isEmptyAnnouncement(V);
      x = h ?? O;
      return e.buildAnnounce(V, n, h);
    },
    onOutcome: (V, te) => {
      let le = x;
      O = undefined;
      let ue = te === "returned" && V.kind === "failed";
      if (V.kind === "announced") {
        if (V.workerEpoch !== undefined) R = Math.max(R ?? 0, V.workerEpoch);
        if (V.workerEpoch !== undefined && (h === undefined || V.workerEpoch >= h)) h = V.workerEpoch;
        else if (V.workerEpoch !== h)
          logRemoteTools(undefined, "epoch ratchet ignored", {
            heard: V.workerEpoch,
            kept: h,
          });
        v = V.passthroughDeclined === "pending" ? undefined : V.workerEpoch;
        y = undefined;
        C = undefined;
        M = false;
        T = q;
        P = V.workerCapabilities?.includes(STILL_HERE_TEXT) === true;
      } else if (!ue) {
        v = undefined;
        M =
          V.kind === "failed" ||
          V.kind === "retry" ||
          (V.kind === "refused" && V.reason === "no_answer_parked");
        if (V.kind === "refused" && V.reason === "no_answer_parked") C = le;
        else if (V.kind === "refused" || V.kind === "unsupported") {
          y = le;
          if (V.kind === "refused" && V.reason === UNVERIFIED_SENDER_2 && !L) {
            L = true;
            e.onNotice?.(
              "announce_unverified",
              REMOTE_TOOLS_CONSENT_TEXT.announce_unverified(untrustedDeviceHint()),
            );
          }
        } else if (V.kind === "retry" && V.reason === "stale_worker_epoch") {
          h = undefined;
          R = undefined;
        }
      }
      if (te !== "returned" || (!ue && V.kind !== "announced")) logAnnounceOutcome(V);
      e.onAnnounceOutcome?.(V, te);
    },
    ...(e.signal && {
      signal: e.signal,
    }),
    ...e.announcer,
  });
  let Q = (V) => {
    if (s) {
      V.dispose();
      return;
    }
    r = V;
    ee();
    w =
      V.onServedToolsChanged?.((te) => {
        ee();
        D("tools_changed", {
          coalesceMs:
            te === undefined || te === "adopted" || te === "redescribed" ? 0 : REANNOUNCE_DELAYS_MS[te],
        });
      }) ?? w;
    if (u !== null) {
      let { reason, opts } = u;
      u = null;
      D(reason, opts);
    }
  };
  let ee = () => {
    if (s) return;
    let V = r?.servedTools?.();
    e.manager()?.markServing(V !== undefined && !isEmptyAnnouncement(V));
  };
  let D = (reason, opts) => {
    if (r === null) {
      u = {
        reason,
        ...(opts && {
          opts,
        }),
      };
      return;
    }
    if (reason === "attached") ee();
    if (reason === "worker_asked") {
      v = undefined;
      y = undefined;
      C = undefined;
      O = undefined;
      announceLoop.requestAnnounce("worker_asked");
      return;
    }
    if (reason === "returned") {
      if (v === undefined || T) {
        D("reconnected");
        return;
      }
      announceLoop.requestAnnounce("returned");
      return;
    }
    if (
      (reason === "reconnected" && v !== undefined) ||
      (reason === "attached" && (v !== undefined || O !== undefined))
    ) {
      logForDebugging(
        `[servedChannel] ${reason}: nothing to announce \u2014 worker epoch ${v ?? O} already has (or is being told) this machine's tools`,
      );
      return;
    }
    if (
      reason === "worker_init" &&
      opts?.workerEpoch !== undefined &&
      (opts.workerEpoch === v ||
        opts.workerEpoch === y ||
        opts.workerEpoch === C ||
        opts.workerEpoch === O ||
        (h !== undefined && opts.workerEpoch < h))
    )
      return;
    v = undefined;
    if (reason === "reconnected") C = undefined;
    if (reason === "worker_init") {
      if (opts?.workerEpoch !== undefined) R = Math.max(R ?? 0, opts.workerEpoch);
      O = opts?.workerEpoch;
      let le = opts?.workerEpoch === undefined || h === undefined || opts.workerEpoch === h;
      if (opts?.workerEpoch !== undefined) h = opts.workerEpoch;
      if (le && announceLoop.outstanding()) return;
    } else if (reason === "tools_changed") {
      y = undefined;
      C = undefined;
    }
    announceLoop.requestAnnounce(reason, {
      ...(opts?.coalesceMs !== undefined && {
        coalesceMs: opts.coalesceMs,
      }),
    });
  };
  let G = (V) => {
    e.manager()?.releaseServedChannelRequest(V.requestId);
    let te = SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema().safeParse(V.request);
    let now = Date.now();
    let ue =
      !te.success ||
      V.ageMs === undefined ||
      V.ageMs > te.data.deadline_ms ||
      isBelowFloorEnforced(attestationFor_2(V.attestationStatus)) ||
      (R !== undefined && te.data.worker_epoch < R) ||
      (j?.epoch === te.data.worker_epoch && !M) ||
      (j !== undefined && now - j.at < REANNOUNCE_DEBOUNCE_MS) ||
      announceLoop.outstanding();
    if (!te.success || ue) {
      logForDebugging(
        "[servedChannel] remote_tools_reannounce not honoured: unreadable, undated, past its wait, from a sender held back, from an older worker, already answered, rate limited, or an announce is already out",
      );
      return;
    }
    j = {
      epoch: te.data.worker_epoch,
      at: now,
    };
    M = false;
    D("worker_asked");
  };
  let servingContext = e.createServingContext({
    sessionId: e.sessionId,
    instanceId: n,
    ...(e.onNotice && {
      onNotice: e.onNotice,
    }),
  });
  let Z =
    servingContext instanceof Promise
      ? servingContext.then(Q).catch((error) => {
          logError(error);
        })
      : Promise.resolve(Q(servingContext));
  let z = () => {};
  let K;
  let re = (V) => {
    let te = K?.relaunchIsNext.aborted === false ? K.withdraw() : undefined;
    let le = (S ??= (async () => {
      s = true;
      z();
      for (let key of X.keys()) e.manager()?.releaseServedChannelRequest(key);
      X.clear();
      let ue = r?.servedTools?.();
      let we = ue === undefined || isEmptyAnnouncement(ue);
      let Se = T && q && we ? Promise.resolve(announceLoop.dispose()) : announceLoop.withdraw(V);
      e.manager()?.markServing(false);
      await Z;
      w();
      await Se;
      r?.dispose();
      announceLoop.dispose();
    })());
    return te === undefined ? le : te.then(() => le);
  };
  let { abandonInHand, onServedChannelRequest, ...ie } = createServedChannelHandler({
    serving: () => (s ? null : r),
    manager: e.manager,
    observer: e.onServedCall,
  });
  let ce = (V) => (V.subtype === "remote_tools_reannounce" ? G(V) : onServedChannelRequest?.(V));
  let oe = {
    instanceId: n,
    callbacks: {
      ...ie,
      onServedChannelRequest: (V) => {
        let te =
          V.subtype === "remote_tools_reannounce"
            ? V
            : {
                ...V,
                workerEpoch: V.workerEpoch ?? h,
              };
        if (
          te.subtype === "remote_tools_probe" &&
          (N || (F !== undefined && te.ageMs !== undefined && Date.now() - te.ageMs < F))
        ) {
          logForDebugging(
            `[servedChannel] remote_tools_probe ${printableExcerpt(te.requestId)} not answered: the host ${N ? "says this computer sleeps" : "had not yet said it woke when it was stored"}`,
          );
          e.manager()?.releaseServedChannelRequest(te.requestId);
        } else if (N && !s) {
          logForDebugging(
            `[servedChannel] ${te.subtype} ${printableExcerpt(te.requestId)} held until the host says this computer woke`,
          );
          X.set(te.requestId, {
            request: te,
            at: Date.now(),
          });
        } else ce(te);
      },
      onWorkerLive: () => announceLoop.workerLive(),
      onWorkerGone: () => {
        v = undefined;
        r?.workerGone?.();
      },
    },
    requestAnnounce: D,
    sayAsleep: () => {
      N = true;
      return s || v === undefined || T ? null : announceLoop.sayAsleep(v);
    },
    sayStillHere: () => !s && !N && v !== undefined && !T && P && announceLoop.sayStillHere(v),
    hostWoke: (V) => {
      if (!N) return;
      N = false;
      let now = Date.now();
      F = now;
      if (!V) announceLoop.workerLive();
      let le = [...X.values()];
      X.clear();
      for (let { request, at } of le) {
        if (request.signal.aborted) continue;
        try {
          ce({
            ...request,
            ageMs: request.ageMs === undefined ? undefined : request.ageMs + (now - at),
          });
        } catch (error) {
          logError(error);
          e.manager()?.releaseServedChannelRequest(request.requestId);
        }
      }
    },
    heldServedCall: (V) => (s || r === null ? NOT_HELD_LEASE : (r.heldServedCall?.(V) ?? NOT_HELD_LEASE)),
    servedHost: () => (s ? undefined : r?.servedTools?.()?.host),
    hasBackgroundWork: () => !s && r?.hasBackgroundWork?.() === true,
    close: re,
    leaveForRestart: (relaunchIsNext) => {
      if (K !== undefined) return K.withdraw;
      abandonInHand();
      let te = announceLoop.disposeKeepingWithdraw();
      re();
      let le = T && q ? () => Promise.resolve() : te;
      K = {
        withdraw: le,
        relaunchIsNext,
      };
      return le;
    },
  };
  z =
    e.onRevoked?.((V) => {
      logForDebugging(`[servedChannel] serving revoked on this machine (${V}) \u2014 closing the channel`);
      abandonInHand();
      e.manager()?.giveUpKeptServedResults();
      re();
    }) ?? z;
  if (s) z();
  return oe;
}
//@ chunk-mthxbav8.js:157149-157581 placement
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
//@ chunk-mthxbav8.js:157581-157698 placement
function isRetryablePostFailure(posted) {
  return (
    posted.outcome === "failed" &&
    (posted.cause === "network" ||
      (posted.cause === "http" && (posted.status >= 500 || posted.status === 429)))
  );
}
//@ chunk-mthxbav8.js:157698-159927 placement
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
  let O = (M) => {
    logEvent("tengu_remote_create_permission_mode_push", {
      surface: fromEnum(surface),
      mode: fromEnum(mode),
      kind: fromEnum(M.kind),
      posted_mode: fromEnum(M.postedMode),
      outcome: fromEnum(M.outcome),
      ...("cause" in M && {
        cause: fromEnum(M.cause),
      }),
      ...("status" in M && {
        status: M.status,
      }),
      ...(M.attempt !== undefined && {
        attempt: M.attempt,
      }),
      session_id: sanitizeMarkName(sessionId),
    });
  };
  let x = () => {
    let M = observedMode?.();
    return (
      superseded() ||
      (M !== undefined && M !== mode && (M !== "default" || (seededModeReported?.() ?? false)))
    );
  };
  let R = async (M, q, T = Date.now(), P = 1) => {
    let abortController = new AbortController();
    let N = manager.postControlRequest(
      {
        subtype: "set_permission_mode",
        mode: M,
      },
      {
        answerExpected: false,
        background: true,
        timeoutMs: HOLD_MAX_MS,
        signal: abortController.signal,
      },
    );
    N.response.catch(() => {});
    let posted = await N.posted;
    O({
      ...posted,
      kind: q,
      postedMode: M,
      attempt: P,
    });
    if (posted.outcome === "accepted")
      return {
        result: posted,
        response: N.response,
      };
    abortController.abort();
    if (x()) {
      O({
        kind: q,
        postedMode: M,
        outcome: "superseded",
      });
      return {
        result: posted,
        response: null,
      };
    }
    let X = REMOTE_SESSION_TIMINGS[P - 1];
    if (X !== undefined && isRetryablePostFailure(posted) && Date.now() - T < MODE_PUSH_RETRY_WINDOW_MS) {
      await sleep(X);
      if (!x()) return R(M, q, T, P + 1);
      O({
        kind: q,
        postedMode: M,
        outcome: "superseded",
      });
      return {
        result: posted,
        response: null,
      };
    }
    O({
      kind: q,
      postedMode: M,
      outcome: "gave_up",
    });
    logFeatureBad("remote_create_mode_push", `${q}_gave_up`);
    if (!(posted.outcome === "failed" && posted.cause === "closed"))
      onGaveUp?.(
        posted.outcome === "session_inactive"
          ? MODE_NOT_SAVED_INACTIVE_TEXT
          : q === "push"
            ? MODE_NOT_SAVED_IDLE_TEXT
            : MODE_NOT_SAVED_TEXT,
      );
    return {
      result: posted,
      response: null,
    };
  };
  let j = (response) => {
    response.then(
      () => {
        O({
          kind: "push",
          postedMode: mode,
          outcome: "taken",
        });
        onTaken?.();
        logFeatureOk("remote_create_mode_push");
        logForDebugging(`[remote] The session took its create's ${mode} permission mode as a live request`);
      },
      (error) => {
        let T = classifyControlRequestError(error);
        logForDebugging(
          `[remote] The create's ${mode} permission mode push was not taken (${T}): ${sanitizeDisplayText(
            errorMessage(error),
            {
              maxCodeUnits: 200,
            },
          )}`,
        );
        if (!(
          T === "server_error" ||
          ((T === "disconnected" || T === "not_connected") && linkDown !== undefined && !linkDown())
        )) {
          O({
            kind: "push",
            postedMode: mode,
            outcome: "unanswered",
          });
          logFeatureSad("remote_create_mode_push", "unanswered");
          return;
        }
        O({
          kind: "push",
          postedMode: mode,
          outcome: "refused",
        });
        logFeatureSad("remote_create_mode_push", "refused");
        if (x() || mode === "default") return;
        let L = R("default", "converge");
        L.then(({ response }) =>
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
        onRefused?.(L.then(({ result: N }) => N));
      },
    );
  };
  return R(mode, "push").then(({ result: M, response }) => {
    if (response !== null) j(response);
    return M;
  });
}
//@ chunk-mthxbav8.js:159927-160292 placement
function retirePostedMode({ posted, mode, latch, retire, now = Date.now }) {
  let S = posted.then(
    (w) => w.outcome === "accepted",
    () => false,
  );
  S.then((w) => {
    if (w) retire();
    else latch.notTakenAtMs ??= now();
  });
  return async ({ submittedAtMs }) => {
    let h = submittedAtMs ?? now();
    if (await S) return;
    if (h - (latch.notTakenAtMs ?? h) < DEFAULT_TYPED_AHEAD_GRACE_MS)
      return {
        go: false,
        reason: `the session's ${mode} permission mode couldn't be saved on the server first`,
      };
    retire();
    return;
  };
}
//@ chunk-mthxbav8.js:160292-160489 placement
/**
 * 远程响应等待超时与提示：普通 60 s、等待用户答复 180 s，以及“云端可能无响应”“Claude 在等你回答”两段文案。
 */
var REMOTE_RESPONSE_TIMEOUTS = 60000;
var REMOTE_RESPONSE_ASK_TIMEOUT_MS = 180000;
var UNRESPONSIVE_NOTICE = "Cloud session may be unresponsive. Attempting to reconnect\u2026";
var WAITING_FOR_ANSWER_NOTICE =
  "Claude is waiting for you to answer its request and will continue with this message once you do.";
//@ chunk-mthxbav8.js:160489-160520 placement
function responseTimeoutMs(e) {
  return e ? REMOTE_RESPONSE_ASK_TIMEOUT_MS : REMOTE_RESPONSE_TIMEOUTS;
}
//@ chunk-mthxbav8.js:160520-161274 placement
class ServedCallWatch {
  holdsWhileAsked;
  openRequests = new Set();
  watched = null;
  watch(onSilent, schedule) {
    let r = this.holds();
    if (r) this.clear();
    let s = {
      onSilent,
      schedule,
      cancel: null,
    };
    this.watched = s;
    if (r && this.openRequests.size > 0) {
      logFeatureOk("remote_response_watch_hold");
      return false;
    }
    this.start(s);
    return true;
  }
  clear() {
    this.watched?.cancel?.();
    this.watched = null;
  }
  requestOpened(e) {
    this.openRequests.add(e);
    if (this.holds() && this.watched?.cancel) {
      this.watched.cancel();
      this.watched.cancel = null;
      logFeatureOk("remote_response_watch_hold");
    }
  }
  requestClosed(e) {
    this.openRequests.delete(e);
    if (this.openRequests.size === 0 && this.watched?.cancel === null) this.start(this.watched);
  }
  holds() {
    this.holdsWhileAsked ??= isServedCornerEnabled();
    return this.holdsWhileAsked;
  }
  start(e) {
    e.cancel = e.schedule(() => {
      if (this.watched === e) this.watched = null;
      e.onSilent();
    });
  }
}
//@ chunk-mthxbav8.js:161274-161306 placement
var TENGU_VIOLIN_COLOPHONY = "tengu_violin_colophony";
//@ chunk-mthxbav8.js:161306-161363 placement
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
