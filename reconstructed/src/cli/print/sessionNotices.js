/**
 * cli/print/sessionNotices.ts
 *
 * 2.1.316 新增：会话通知（session notices）的处理与能力声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (13)
 * attribution: placement 13
 */
import { logForDebugging } from "../../utils/debug.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { DoctorLazy } from "../handlers/util.js";
import { u, T, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import {
  G2,
  Hvn,
  rfi,
  ime,
  escapeXmlText,
  validatePollEvent,
  SESSION_NOTICE,
  Kv,
  vFe,
} from "../../utils/pollEvents.js";
import { transportStateByHost } from "../transportState.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { Vt } from "../../utils/agentId.js";
import { CVs } from "../../utils/pollEvents/declarations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { errorMessage, isAbortError } from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { t7n, enqueuePollEvent } from "../../utils/messageQueueManager.js";
import { executeUserPromptSubmitHooksForSession } from "../../utils/hooks.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";

//@ chunk-tyg7f3ek.js:33333-33361 placement
function isNoticeKindServed(e) {
  return NOTICE_KIND_SERVED[e];
}
//@ chunk-tyg7f3ek.js:33361-33654 placement
var NOTICE_KIND_SERVED = {
  directories: !1,
  file_state: !1,
  unfit_text: !1,
  no_file: !1,
  tie: !1,
  held_file_unreadable: !1,
  needs_file_search: !1,
  too_many: !1,
  outside: !1,
  hipaa: !1,
  no_policy_answer: !1,
  switched_off: !1,
  lane: !0,
  unfit_within: !0,
  not_served: !0,
  fault: !0,
  time_limit: !0,
  stranded: !0,
  waited_too_long: !0,
  session_ending: !0,
};
//@ chunk-tyg7f3ek.js:33654-33738 placement
class Sb {
  #t = new WeakMap();
  mark(e, n) {
    this.#t.set(e, n);
  }
  laneOf(e) {
    return this.#t.get(e);
  }
}
//@ chunk-tyg7f3ek.js:33738-33764 placement
var HOST_INGRESS_LANES = new SessionRootSlot(() => new Sb());
//@ chunk-tyg7f3ek.js:33764-33775 placement
var wb = 1e4;
//@ chunk-tyg7f3ek.js:33775-34034 placement
class RecentUuidSet {
  uuids = new Set();
  order = [];
  has(e) {
    return this.uuids.has(e);
  }
  track(e) {
    if (this.uuids.has(e)) return !1;
    if ((this.uuids.add(e), this.order.push(e), this.order.length > wb)) {
      let splice = this.order.splice(0, this.order.length - wb);
      for (let r of splice) this.uuids.delete(r);
    }
    return !0;
  }
}
//@ chunk-tyg7f3ek.js:34034-34060 placement
var RECEIVED_MESSAGE_UUIDS = new SessionRootSlot(() => new RecentUuidSet());
//@ chunk-tyg7f3ek.js:34060-34371 placement
var SESSION_NOTICES_FLAG = "tengu_polished_lagoon",
  Rb = !1,
  SESSION_NOTICES = "session_notices",
  jL = DoctorLazy(() =>
    u({
      type: T("session_notice"),
      uuid: o().regex(/^[A-Za-z0-9_-]{1,128}$/),
      notice_class: o().regex(/^[a-z][a-z0-9_]{0,63}$/),
      from_session_id: o().regex(/^[A-Za-z0-9_.:-]{1,256}$/),
      content: o(),
      isSynthetic: T(!0),
      inbound_origin: T("mcp_session_notice"),
    }),
  );
//@ chunk-tyg7f3ek.js:34371-34448 placement
function Pb() {
  return (
    env.CLAUDE_CODE_REMOTE === !0 &&
    getIsNonInteractiveSession() &&
    getFeatureValue_CACHED_MAY_BE_STALE(SESSION_NOTICES_FLAG, Rb) &&
    G2() &&
    !Hvn()
  );
}
//@ chunk-tyg7f3ek.js:34448-34754 placement
function sessionNoticesCapability(e, n) {
  let r = transportStateByHost.of(e).active?.isRemoteTransport() === !0,
    s = n === "auto" && Pb() && r,
    { value: h, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(SESSION_NOTICES_FLAG, Rb);
  return (
    logForDebugging(
      `[session-notices] advertise=${s} mode=${n} flag=${h}(${source}) pollChannel=${G2()} ownEventsOnly=${Hvn()} remote=${r} remoteEnv=${env.CLAUDE_CODE_REMOTE === !0} nonInteractive=${getIsNonInteractiveSession()}`,
    ),
    s
  );
}
//@ chunk-tyg7f3ek.js:34754-34845 placement
function _h(e, n) {
  if (e === void 0) return;
  transportStateByHost.of(n).active?.onCommandLifecycle?.(e, "completed");
}
/**
 * 处理 CCR 下发的 session_notice（仅 RemoteIO 传输）：校验载荷、去重、截断后作为系统提醒注入。
 */
//@ chunk-tyg7f3ek.js:34845-38288 placement
function handleSessionNotice(
  e,
  {
    getAppState: getAppState,
    setAppState: setAppState,
    session: session,
    sessionHooks: sessionHooks,
    isRemoteTransport: isRemoteTransport,
    ingressTail: ingressTail,
    storageV5: storageV5,
    credentials: credentials,
  },
) {
  if (!isRemoteTransport()) {
    (logForDebugging(
      "[session-notices] session_notice on a non-RemoteIO transport \u2014 dropping without ack",
      { level: "warn" },
    ),
      logFeatureBad("ccr_session_notices", "not_remote_transport"));
    return;
  }
  let P = Vt(e.uuid) ?? void 0,
    safeParse = jL().safeParse(e);
  if (!safeParse.success) {
    (logForDebugging("[session-notices] dropping malformed session_notice payload", { level: "error" }),
      logFeatureBad("ccr_session_notices", "malformed_payload"),
      _h(P, session));
    return;
  }
  let q = safeParse.data;
  if (!Pb()) {
    if (env.CLAUDE_CODE_REMOTE !== !0 || !getIsNonInteractiveSession()) {
      (logFeatureBad("ccr_session_notices", "structurally_not_a_consumer"), _h(q.uuid, session));
      return;
    }
    logFeatureSad("ccr_session_notices", G2() && Hvn() ? "own_events_only" : "flag_disabled");
    return;
  }
  if (getAppState().toolPermissionContext.mode !== "auto") {
    logFeatureSad("ccr_session_notices", "mode_not_auto_will_retry");
    return;
  }
  if (getAppState().sessionNoticesPoll.pendingDeliveryUuids.includes(q.uuid)) {
    logForDebugging("[session-notices] duplicate redelivery while delivery in flight \u2014 suppressed");
    return;
  }
  let Z = rfi(q.content),
    re = !1,
    Ae = ime - 1024,
    Ue = !1,
    ce = Ue ? CVs : escapeXmlText,
    nt = ce(Z);
  if (Buffer.byteLength(nt, "utf8") > Ae) {
    let Ee = 0,
      He = Z.length;
    while (Ee < He) {
      let St = Ee + Math.ceil((He - Ee) / 2),
        wt = truncateToLength(Z, St);
      if (Buffer.byteLength(ce(wt), "utf8") <= Ae - 128) Ee = St;
      else He = St - 1;
    }
    let Xe = Z.length,
      We = truncateToLength(Z, Ee);
    ((Z =
      We +
      `
\u2026[session_notice content truncated by the CLI: ${Xe - We.length} characters dropped]`),
      (re = !0));
  }
  let iso = new Date().toISOString(),
    Se = Ue
      ? {
          typed: {
            at: iso,
            fields: { "notice-class": q.notice_class, "from-session": q.from_session_id, text: Z },
          },
        }
      : {
          element: validatePollEvent({
            kind: SESSION_NOTICE,
            at: iso,
            content: Z,
            attributes: { "notice-class": q.notice_class, "from-session": q.from_session_id },
          }),
        };
  try {
    setAppState((Me) => ({
      ...Me,
      sessionNoticesPoll: { pendingDeliveryUuids: [...Me.sessionNoticesPoll.pendingDeliveryUuids, q.uuid] },
    }));
  } catch (error) {
    logForDebugging(`[session-notices] pending-add subscriber threw (contained): ${errorMessage(error)}`, {
      level: "error",
    });
  }
  let me = () => {
    setAppState((Me) => ({
      ...Me,
      sessionNoticesPoll: {
        pendingDeliveryUuids: Me.sessionNoticesPoll.pendingDeliveryUuids.filter(
          (pendingDeliveryUuid) => pendingDeliveryUuid !== q.uuid,
        ),
      },
    }));
  };
  ingressTail.current = ingressTail.current
    .then(async () => {
      if (count(t7n(), Kv) >= vFe) {
        (me(), logFeatureSad("ccr_session_notices", "queue_cap_will_retry"));
        return;
      }
      let Me = !1;
      try {
        for await (let Ee of executeUserPromptSubmitHooksForSession(
          session,
          sessionHooks,
          Z,
          getAppState().toolPermissionContext.mode,
          void 0,
          storageV5,
          credentials,
        ))
          if (Ee.blockingError) {
            Me = !0;
            break;
          }
      } catch (error) {
        if (isAbortError(error)) logForDebugging("[session-notices] enqueue hook pass aborted");
        else
          logForDebugging(
            `[session-notices] enqueue hook pass failed (failing open): ${errorMessage(error)}`,
            { level: "error" },
          );
      }
      if (Me) {
        (me(), logFeatureSad("ccr_session_notices", "hook_blocked_will_retry"));
        return;
      }
      enqueuePollEvent({
        kind: SESSION_NOTICE,
        ...Se,
        wake: !0,
        allowReservedKind: !0,
        provenance: { authority: "peer-agent", senderId: q.from_session_id, senderText: Z },
      })
        .then(
          async () => {
            try {
              if (
                (await flushSessionStorage(),
                !((await transportStateByHost.of(session).active?.flushInternalEventsConfirmed()) ?? !0))
              ) {
                (me(), logFeatureSad("ccr_session_notices", "delivery_record_dropped_will_retry"));
                return;
              }
            } catch (error) {
              (logForDebugging(
                `[session-notices] persistence flush failed (ack skipped, will redeliver): ${errorMessage(error)}`,
                { level: "error" },
              ),
                me(),
                logFeatureSad("ccr_session_notices", "flush_failed_will_retry"));
              return;
            }
            if ((me(), _h(q.uuid, session), re)) logFeatureSad("ccr_session_notices", "content_truncated");
            else logFeatureOk("ccr_session_notices");
          },
          (Ee) => {
            (logForDebugging(`[session-notices] delivery rejected (will redeliver): ${errorMessage(Ee)}`, {
              level: "error",
            }),
              me(),
              logFeatureSad("ccr_session_notices", "delivery_rejected_will_retry"));
          },
        )
        .catch((Ee) => {
          (logForDebugging(`[session-notices] settle handler failed: ${errorMessage(Ee)}`, {
            level: "error",
          }),
            logFeatureBad("ccr_session_notices", "settle_handler_failed"));
        });
    })
    .catch((Me) => {
      (logForDebugging(`[session-notices] ingress-tail link failed: ${errorMessage(Me)}`, { level: "error" }),
        logFeatureBad("ccr_session_notices", "ingress_tail_link_failed"));
    });
}
//@ chunk-tyg7f3ek.js:38288-38353 placement
var HELD_MESSAGE_FLAGS = "tengu_mellow_heron",
  TENGU_SNAPPY_SUNRISE_KILLSWITCH = "tengu_snappy_sunrise_killswitch";

export {
  RECEIVED_MESSAGE_UUIDS,
  HOST_INGRESS_LANES,
  isNoticeKindServed,
  handleSessionNotice,
  sessionNoticesCapability,
  SESSION_NOTICES,
  HELD_MESSAGE_FLAGS,
  TENGU_SNAPPY_SUNRISE_KILLSWITCH,
};
