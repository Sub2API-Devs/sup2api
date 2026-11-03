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
import { logRemoteTools, Can } from "../../services/remoteTools/remoteToolsDebug.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import {
  Ft,
  UNVERIFIED_SENDER,
  createAnnounceLoop,
} from "../../utils/hooks/deviceHooks/deviceHookSession.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { STILL_HERE_TEXT } from "./protocolConstants.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "./consentText.js";
import { untrustedDeviceHint } from "../../bridge/trustedDevice.js";
import { Hdr } from "../../bridge/deviceRegistration.js";
import { SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema } from "../../entrypoints/sdk/controlSchemas.js";
import { PTe, Cye } from "../../services/remoteTools/toolHostAttestation.js";
import { p5 } from "../../services/remoteTools/lease.js";
import { Vkr, QAs } from "../../services/homeSeed/firstSend.js";
import { sleep } from "../../utils/sleep.js";
import { classifyControlRequestError } from "../controlRequestErrors.js";
import { sanitizeDisplayText } from "../../utils/resultError.js";
import { errorMessage } from "../../utils/errors.js";
import { isServedCornerEnabled } from "./serve/servingFlags.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";

/**
 * 处理会话通道上的 served-call 请求：为每个请求建立中止控制、转交服务端、回帖结果。
 */
//@ chunk-mthxbav8.js:148048-148610 placement
function createServedChannelHandler({ serving: serving, manager: manager, observer: observer }) {
  let s = new Map();
  return {
    onServedChannelRequest: (u) => {
      let abortController = new AbortController();
      (s.set(u.requestId, abortController), wt(() => observer?.requestStarted?.()));
      let w = { ...u, signal: AbortSignal.any([u.signal, abortController.signal]) };
      answerServedChannelRequest(w, serving, manager, observer)
        .catch((h) => {
          (logError(h), manager()?.releaseServedChannelRequest(u.requestId));
        })
        .finally(() => {
          (s.delete(u.requestId), wt(() => observer?.requestEnded?.()));
        });
    },
    onServedChannelRequestCancelled: () => {},
    onControlRequestRefused: (u) => serving()?.noteUnlistedKind?.(u),
    abandonInHand: () => {
      for (let [u, S] of s) (S.abort(), manager()?.releaseServedChannelRequest(u));
      s.clear();
    },
  };
}
//@ chunk-mthxbav8.js:148610-149832 placement
async function answerServedChannelRequest(e, n, r, s) {
  let u = (x) => {
      (logForDebugging(
        `[servedChannel] ${e.subtype} ${printableExcerpt(e.requestId)} not answered here: ${x}`,
      ),
        r()?.releaseServedChannelRequest(e.requestId));
    },
    S = n();
  if (S === null) return u("nothing serving");
  let startTime = performance.now(),
    h = e.subtype === "remote_tool_call" ? parseServedCallRequest(e.request) : void 0,
    v =
      h?.request.ok === !0 && h.instance_id === S.instanceId
        ? {
            callId: h.request.value.call_id,
            leg:
              h.request.kind === "outcome_query" ? "outcome_of" : h.request.value.approval === void 0 ? 1 : 2,
            approval:
              h.request.kind === "outcome_query" ? "none" : (h.request.value.approval?.decision ?? "none"),
          }
        : void 0;
  wt(() => {
    if (v !== void 0)
      logRemoteTools(
        v.callId,
        "leg received",
        { leg: v.leg, age_ms: e.ageMs === void 0 ? void 0 : Math.round(e.ageMs) },
        Can(v.leg),
      );
  });
  let y = s !== void 0 && h !== void 0 && h.instance_id === S.instanceId ? { observer: s, leg: h } : void 0;
  wt(() => y?.observer.legStarted(y.leg, e.ageMs));
  let C;
  try {
    C = await handleServedChannelRequest(e, S, h);
  } finally {
    wt(() => y?.observer.legAnswered(y.leg, C?.result));
  }
  if (C === void 0) return u("not this client's to answer");
  if (e.signal.aborted) return;
  let rounded = Math.round(performance.now() - startTime);
  if (
    r()?.respondToServedChannelRequest(
      e.requestId,
      C,
      v === void 0 ? void 0 : (x, R) => logServedChannelReply(v, rounded, x, R),
    ) !== !0
  )
    logForDebugging(
      `[servedChannel] ${e.subtype} ${printableExcerpt(e.requestId)} answered after it was withdrawn \u2014 result dropped`,
    );
}
//@ chunk-mthxbav8.js:149832-150320 placement
function logServedChannelReply(e, n, r, s) {
  let u = r.outcome === "accepted" ? r.signMs : void 0,
    S = r.outcome === "accepted" ? r.postMs : void 0;
  if (
    (logRemoteTools(
      e.callId,
      "reply posted",
      { leg: e.leg, serve_ms: n, reply_ms: s, sign_ms: u, post_ms: S, post_outcome: r.outcome },
      Can(e.leg),
    ),
    e.leg === "outcome_of")
  )
    return;
  logEvent("tengu_remote_tool_serve", {
    op: lit("reply"),
    call_id: ye(e.callId),
    transport: lit("session"),
    second_leg: e.leg === 2,
    approval_decision: fromEnum(e.approval),
    serve_ms: n,
    reply_ms: s,
    reply_sign_ms: u,
    reply_post_ms: S,
    reply_accepted: r.outcome === "accepted",
  });
}
//@ chunk-mthxbav8.js:150320-150358 placement
function wt(e) {
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
      return r === void 0 ? void 0 : n.serveSessionToolCall(r, s);
    case "remote_plumbing_call": {
      let u = parseMachineAdvert(e.request);
      return u === void 0 ? void 0 : n.servePlumbingCall(u, s);
    }
    case "remote_tools_probe":
      return e.request.instance_id === n.instanceId ? n.answerProbe() : void 0;
    case "remote_tools_reannounce":
      return;
  }
}
//@ chunk-mthxbav8.js:150852-151067 placement
var isEmptyAnnouncement = (e) => e.tools.length + e.plumbing.length + (e.passthrough?.length ?? 0) === 0,
  REANNOUNCE_DEBOUNCE_MS = 1e4,
  KNOWN_ANNOUNCE_FAILURE_REASONS = new Set([
    ...Ft,
    "invalid_announce",
    "no_answer_parked",
    "remote_tools_disabled",
    "remote_tools_not_ready",
    "stale_worker_epoch",
    UNVERIFIED_SENDER,
  ]);
//@ chunk-mthxbav8.js:151067-151158 placement
function ea(e) {
  let n = /^[a-z_]+(?=:|$)/.exec(e)?.[0];
  return n !== void 0 && KNOWN_ANNOUNCE_FAILURE_REASONS.has(n) ? n : "other";
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
    e.kind === "unsupported" ? "unsupported" : `${e.kind}_${ea(e.reason)}`,
  );
}
/**
 * REPL 远程会话连接（云会话）：注册设备钩子与远程工具、维持心跳与重连、同步权限模式与 served 调用。
 */
//@ chunk-mthxbav8.js:151389-157149 placement
function createRemoteSessionConnection(e) {
  let n = `cc-${randomUUID()}`,
    r = null,
    s = !1,
    u = null,
    S = null,
    w = () => {},
    h,
    v,
    y,
    C,
    O,
    x,
    R,
    j,
    M = !1,
    q = !1,
    T = !1,
    P = !1,
    L = !1,
    N = !1,
    F,
    X = new Map(),
    B = createAnnounceLoop({
      hostAsleep: () => N,
      session: e.manager,
      workerLive: () => e.manager()?.workerLive() ?? !1,
      build: () => {
        let V = r?.servedTools?.();
        if (V === void 0) return;
        return ((q = isEmptyAnnouncement(V)), (x = h ?? O), e.buildAnnounce(V, n, h));
      },
      onOutcome: (V, te) => {
        let le = x;
        O = void 0;
        let ue = te === "returned" && V.kind === "failed";
        if (V.kind === "announced") {
          if (V.workerEpoch !== void 0) R = Math.max(R ?? 0, V.workerEpoch);
          if (V.workerEpoch !== void 0 && (h === void 0 || V.workerEpoch >= h)) h = V.workerEpoch;
          else if (V.workerEpoch !== h)
            logRemoteTools(void 0, "epoch ratchet ignored", { heard: V.workerEpoch, kept: h });
          ((v = V.passthroughDeclined === "pending" ? void 0 : V.workerEpoch),
            (y = void 0),
            (C = void 0),
            (M = !1),
            (T = q),
            (P = V.workerCapabilities?.includes(STILL_HERE_TEXT) === !0));
        } else if (!ue) {
          if (
            ((v = void 0),
            (M =
              V.kind === "failed" ||
              V.kind === "retry" ||
              (V.kind === "refused" && V.reason === "no_answer_parked")),
            V.kind === "refused" && V.reason === "no_answer_parked")
          )
            C = le;
          else if (V.kind === "refused" || V.kind === "unsupported") {
            if (((y = le), V.kind === "refused" && V.reason === UNVERIFIED_SENDER && !L))
              ((L = !0),
                e.onNotice?.(
                  "announce_unverified",
                  REMOTE_TOOLS_CONSENT_TEXT.announce_unverified(untrustedDeviceHint()),
                ));
          } else if (V.kind === "retry" && V.reason === "stale_worker_epoch") ((h = void 0), (R = void 0));
        }
        if (te !== "returned" || (!ue && V.kind !== "announced")) logAnnounceOutcome(V);
        e.onAnnounceOutcome?.(V, te);
      },
      ...(e.signal && { signal: e.signal }),
      ...e.announcer,
    }),
    Q = (V) => {
      if (s) {
        V.dispose();
        return;
      }
      if (
        ((r = V),
        ee(),
        (w =
          V.onServedToolsChanged?.((te) => {
            (ee(),
              D("tools_changed", {
                coalesceMs: te === void 0 || te === "adopted" || te === "redescribed" ? 0 : Hdr[te],
              }));
          }) ?? w),
        u !== null)
      ) {
        let { reason: reason, opts: opts } = u;
        ((u = null), D(reason, opts));
      }
    },
    ee = () => {
      if (s) return;
      let V = r?.servedTools?.();
      e.manager()?.markServing(V !== void 0 && !isEmptyAnnouncement(V));
    },
    D = (V, te) => {
      if (r === null) {
        u = { reason: V, ...(te && { opts: te }) };
        return;
      }
      if (V === "attached") ee();
      if (V === "worker_asked") {
        ((v = void 0), (y = void 0), (C = void 0), (O = void 0), B.requestAnnounce("worker_asked"));
        return;
      }
      if (V === "returned") {
        if (v === void 0 || T) {
          D("reconnected");
          return;
        }
        B.requestAnnounce("returned");
        return;
      }
      if ((V === "reconnected" && v !== void 0) || (V === "attached" && (v !== void 0 || O !== void 0))) {
        logForDebugging(
          `[servedChannel] ${V}: nothing to announce \u2014 worker epoch ${v ?? O} already has (or is being told) this machine's tools`,
        );
        return;
      }
      if (
        V === "worker_init" &&
        te?.workerEpoch !== void 0 &&
        (te.workerEpoch === v ||
          te.workerEpoch === y ||
          te.workerEpoch === C ||
          te.workerEpoch === O ||
          (h !== void 0 && te.workerEpoch < h))
      )
        return;
      if (((v = void 0), V === "reconnected")) C = void 0;
      if (V === "worker_init") {
        if (te?.workerEpoch !== void 0) R = Math.max(R ?? 0, te.workerEpoch);
        O = te?.workerEpoch;
        let le = te?.workerEpoch === void 0 || h === void 0 || te.workerEpoch === h;
        if (te?.workerEpoch !== void 0) h = te.workerEpoch;
        if (le && B.outstanding()) return;
      } else if (V === "tools_changed") ((y = void 0), (C = void 0));
      B.requestAnnounce(V, { ...(te?.coalesceMs !== void 0 && { coalesceMs: te.coalesceMs }) });
    },
    G = (V) => {
      e.manager()?.releaseServedChannelRequest(V.requestId);
      let safeParse = SDKRemoteToolsReannounceRemoteToolsReannounceMessageSchema().safeParse(V.request),
        now = Date.now(),
        ue =
          !safeParse.success ||
          V.ageMs === void 0 ||
          V.ageMs > safeParse.data.deadline_ms ||
          PTe(Cye(V.attestationStatus)) ||
          (R !== void 0 && safeParse.data.worker_epoch < R) ||
          (j?.epoch === safeParse.data.worker_epoch && !M) ||
          (j !== void 0 && now - j.at < REANNOUNCE_DEBOUNCE_MS) ||
          B.outstanding();
      if (!safeParse.success || ue) {
        logForDebugging(
          "[servedChannel] remote_tools_reannounce not honoured: unreadable, undated, past its wait, from a sender held back, from an older worker, already answered, rate limited, or an announce is already out",
        );
        return;
      }
      ((j = { epoch: safeParse.data.worker_epoch, at: now }), (M = !1), D("worker_asked"));
    },
    servingContext = e.createServingContext({
      sessionId: e.sessionId,
      instanceId: n,
      ...(e.onNotice && { onNotice: e.onNotice }),
    }),
    Z =
      servingContext instanceof Promise
        ? servingContext.then(Q).catch((V) => {
            logError(V);
          })
        : Promise.resolve(Q(servingContext)),
    z = () => {},
    K,
    re = (V) => {
      let te = K?.relaunchIsNext.aborted === !1 ? K.withdraw() : void 0,
        le = (S ??= (async () => {
          ((s = !0), z());
          for (let he of X.keys()) e.manager()?.releaseServedChannelRequest(he);
          X.clear();
          let ue = r?.servedTools?.(),
            we = ue === void 0 || isEmptyAnnouncement(ue),
            Se = T && q && we ? Promise.resolve(B.dispose()) : B.withdraw(V);
          (e.manager()?.markServing(!1), await Z, w(), await Se, r?.dispose(), B.dispose());
        })());
      return te === void 0 ? le : te.then(() => le);
    },
    {
      abandonInHand: abandonInHand,
      onServedChannelRequest: onServedChannelRequest,
      ...ie
    } = createServedChannelHandler({
      serving: () => (s ? null : r),
      manager: e.manager,
      observer: e.onServedCall,
    }),
    ce = (V) => (V.subtype === "remote_tools_reannounce" ? G(V) : onServedChannelRequest?.(V)),
    oe = {
      instanceId: n,
      callbacks: {
        ...ie,
        onServedChannelRequest: (V) => {
          let te = V.subtype === "remote_tools_reannounce" ? V : { ...V, workerEpoch: V.workerEpoch ?? h };
          if (
            te.subtype === "remote_tools_probe" &&
            (N || (F !== void 0 && te.ageMs !== void 0 && Date.now() - te.ageMs < F))
          )
            (logForDebugging(
              `[servedChannel] remote_tools_probe ${printableExcerpt(te.requestId)} not answered: the host ${N ? "says this computer sleeps" : "had not yet said it woke when it was stored"}`,
            ),
              e.manager()?.releaseServedChannelRequest(te.requestId));
          else if (N && !s)
            (logForDebugging(
              `[servedChannel] ${te.subtype} ${printableExcerpt(te.requestId)} held until the host says this computer woke`,
            ),
              X.set(te.requestId, { request: te, at: Date.now() }));
          else ce(te);
        },
        onWorkerLive: () => B.workerLive(),
        onWorkerGone: () => {
          ((v = void 0), r?.workerGone?.());
        },
      },
      requestAnnounce: D,
      sayAsleep: () => ((N = !0), s || v === void 0 || T ? null : B.sayAsleep(v)),
      sayStillHere: () => !s && !N && v !== void 0 && !T && P && B.sayStillHere(v),
      hostWoke: (V) => {
        if (!N) return;
        N = !1;
        let now = Date.now();
        if (((F = now), !V)) B.workerLive();
        let le = [...X.values()];
        X.clear();
        for (let { request: request, at: at } of le) {
          if (request.signal.aborted) continue;
          try {
            ce({ ...request, ageMs: request.ageMs === void 0 ? void 0 : request.ageMs + (now - at) });
          } catch (error) {
            (logError(error), e.manager()?.releaseServedChannelRequest(request.requestId));
          }
        }
      },
      heldServedCall: (V) => (s || r === null ? p5 : (r.heldServedCall?.(V) ?? p5)),
      servedHost: () => (s ? void 0 : r?.servedTools?.()?.host),
      hasBackgroundWork: () => !s && r?.hasBackgroundWork?.() === !0,
      close: re,
      leaveForRestart: (V) => {
        if (K !== void 0) return K.withdraw;
        abandonInHand();
        let disposeKeepingWithdraw = B.disposeKeepingWithdraw();
        re();
        let le = T && q ? () => Promise.resolve() : disposeKeepingWithdraw;
        return ((K = { withdraw: le, relaunchIsNext: V }), le);
      },
    };
  if (
    ((z =
      e.onRevoked?.((V) => {
        (logForDebugging(`[servedChannel] serving revoked on this machine (${V}) \u2014 closing the channel`),
          abandonInHand(),
          e.manager()?.giveUpKeptServedResults(),
          re());
      }) ?? z),
    s)
  )
    z();
  return oe;
}
//@ chunk-mthxbav8.js:157149-157581 placement
var REMOTE_SESSION_TIMINGS = [400, 1200],
  oa = 5000,
  kmo =
    "Switch permission modes away and back once to keep this session's mode: it couldn't be saved on the server, so the session may fall back to default after idling.",
  ra = "Switch permission modes away and back once: this session's mode couldn't be saved on the server.",
  ia =
    "This session's permission mode couldn't be saved: the server says the session isn't active. Switch modes away and back once it is.";
//@ chunk-mthxbav8.js:157581-157698 placement
function isRetryablePostFailure(e) {
  return (
    e.outcome === "failed" &&
    (e.cause === "network" || (e.cause === "http" && (e.status >= 500 || e.status === 429)))
  );
}
//@ chunk-mthxbav8.js:157698-159927 placement
function syncRemotePermissionMode({
  manager: manager,
  mode: mode,
  surface: surface,
  sessionId: sessionId,
  superseded: superseded,
  observedMode: observedMode,
  seededModeReported: seededModeReported,
  onRefused: onRefused,
  onGaveUp: onGaveUp,
  onTaken: onTaken,
  linkDown: linkDown,
}) {
  let O = (M) => {
      logEvent("tengu_remote_create_permission_mode_push", {
        surface: fromEnum(surface),
        mode: fromEnum(mode),
        kind: fromEnum(M.kind),
        posted_mode: fromEnum(M.postedMode),
        outcome: fromEnum(M.outcome),
        ...("cause" in M && { cause: fromEnum(M.cause) }),
        ...("status" in M && { status: M.status }),
        ...(M.attempt !== void 0 && { attempt: M.attempt }),
        session_id: ye(sessionId),
      });
    },
    x = () => {
      let M = observedMode?.();
      return (
        superseded() || (M !== void 0 && M !== mode && (M !== "default" || (seededModeReported?.() ?? !1)))
      );
    },
    R = async (M, q, T = Date.now(), P = 1) => {
      let abortController = new AbortController(),
        postControlRequest = manager.postControlRequest(
          { subtype: "set_permission_mode", mode: M },
          { answerExpected: !1, background: !0, timeoutMs: Vkr, signal: abortController.signal },
        );
      postControlRequest.response.catch(() => {});
      let posted = await postControlRequest.posted;
      if ((O({ ...posted, kind: q, postedMode: M, attempt: P }), posted.outcome === "accepted"))
        return { result: posted, response: postControlRequest.response };
      if ((abortController.abort(), x()))
        return (O({ kind: q, postedMode: M, outcome: "superseded" }), { result: posted, response: null });
      let X = REMOTE_SESSION_TIMINGS[P - 1];
      if (X !== void 0 && isRetryablePostFailure(posted) && Date.now() - T < oa) {
        if ((await sleep(X), !x())) return R(M, q, T, P + 1);
        return (O({ kind: q, postedMode: M, outcome: "superseded" }), { result: posted, response: null });
      }
      if (
        (O({ kind: q, postedMode: M, outcome: "gave_up" }),
        logFeatureBad("remote_create_mode_push", `${q}_gave_up`),
        !(posted.outcome === "failed" && posted.cause === "closed"))
      )
        onGaveUp?.(posted.outcome === "session_inactive" ? ia : q === "push" ? kmo : ra);
      return { result: posted, response: null };
    },
    j = (M) => {
      M.then(
        () => {
          (O({ kind: "push", postedMode: mode, outcome: "taken" }),
            onTaken?.(),
            logFeatureOk("remote_create_mode_push"),
            logForDebugging(
              `[remote] The session took its create's ${mode} permission mode as a live request`,
            ));
        },
        (q) => {
          let T = classifyControlRequestError(q);
          if (
            (logForDebugging(
              `[remote] The create's ${mode} permission mode push was not taken (${T}): ${sanitizeDisplayText(errorMessage(q), { maxCodeUnits: 200 })}`,
            ),
            !(
              T === "server_error" ||
              ((T === "disconnected" || T === "not_connected") && linkDown !== void 0 && !linkDown())
            ))
          ) {
            (O({ kind: "push", postedMode: mode, outcome: "unanswered" }),
              logFeatureSad("remote_create_mode_push", "unanswered"));
            return;
          }
          if (
            (O({ kind: "push", postedMode: mode, outcome: "refused" }),
            logFeatureSad("remote_create_mode_push", "refused"),
            x() || mode === "default")
          )
            return;
          let L = R("default", "converge");
          (L.then(({ response: response }) =>
            response?.catch((F) => {
              logForDebugging(
                `[remote] The default mode sent after that refusal was not taken either: ${sanitizeDisplayText(errorMessage(F), { maxCodeUnits: 200 })}`,
              );
            }),
          ),
            onRefused?.(L.then(({ result: N }) => N)));
        },
      );
    };
  return R(mode, "push").then(({ result: M, response: response }) => {
    if (response !== null) j(response);
    return M;
  });
}
//@ chunk-mthxbav8.js:159927-160292 placement
function retirePostedMode({ posted: posted, mode: mode, latch: latch, retire: retire, now: now = Date.now }) {
  let S = posted.then(
    (w) => w.outcome === "accepted",
    () => !1,
  );
  return (
    S.then((w) => {
      if (w) retire();
      else latch.notTakenAtMs ??= now();
    }),
    async ({ submittedAtMs: submittedAtMs }) => {
      let h = submittedAtMs ?? now();
      if (await S) return;
      if (h - (latch.notTakenAtMs ?? h) < QAs)
        return {
          go: !1,
          reason: `the session's ${mode} permission mode couldn't be saved on the server first`,
        };
      retire();
      return;
    }
  );
}
//@ chunk-mthxbav8.js:160292-160489 placement
var REMOTE_RESPONSE_TIMEOUTS = 60000,
  la = 180000,
  ONn = "Cloud session may be unresponsive. Attempting to reconnect\u2026",
  MNn = "Claude is waiting for you to answer its request and will continue with this message once you do.";
//@ chunk-mthxbav8.js:160489-160520 placement
function responseTimeoutMs(e) {
  return e ? la : REMOTE_RESPONSE_TIMEOUTS;
}
//@ chunk-mthxbav8.js:160520-161274 placement
class ServedCallWatch {
  holdsWhileAsked;
  openRequests = new Set();
  watched = null;
  watch(e, n) {
    let holds = this.holds();
    if (holds) this.clear();
    let s = { onSilent: e, schedule: n, cancel: null };
    if (((this.watched = s), holds && this.openRequests.size > 0))
      return (logFeatureOk("remote_response_watch_hold"), !1);
    return (this.start(s), !0);
  }
  clear() {
    (this.watched?.cancel?.(), (this.watched = null));
  }
  requestOpened(e) {
    if ((this.openRequests.add(e), this.holds() && this.watched?.cancel))
      (this.watched.cancel(), (this.watched.cancel = null), logFeatureOk("remote_response_watch_hold"));
  }
  requestClosed(e) {
    if ((this.openRequests.delete(e), this.openRequests.size === 0 && this.watched?.cancel === null))
      this.start(this.watched);
  }
  holds() {
    return ((this.holdsWhileAsked ??= isServedCornerEnabled()), this.holdsWhileAsked);
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
    return getFeatureValue_SESSION_PINNED(TENGU_VIOLIN_COLOPHONY, !1) === !0;
  } catch {
    return !1;
  }
}

export {
  ServedCallWatch,
  isServedCallWatchEnabled,
  createRemoteSessionConnection,
  syncRemotePermissionMode,
  retirePostedMode,
  kmo,
  ONn,
  responseTimeoutMs,
  MNn,
};
