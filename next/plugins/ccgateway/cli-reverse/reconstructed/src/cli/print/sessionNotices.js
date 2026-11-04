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
import { objectSchema, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { env } from "../../utils/env.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import {
  isPollEventIngressActive,
  isHostIngressPollEvents,
  normalizedEventLabel,
  MAX_POLL_EVENT_ENVELOPE_BYTES,
  escapeXmlText,
  validatePollEvent,
  SESSION_NOTICE,
  isPollEventMode,
  POLL_KIND_DEFAULT_TIMEOUT_MS,
} from "../../utils/pollEvents.js";
import { transportStateByHost } from "../transportState.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { normalizeUuidOrNull } from "../../utils/agentId.js";
import { escapedEventJsonBody } from "../../utils/pollEvents/declarations.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { errorMessage, isAbortError } from "../../utils/errors.js";
import { count } from "../../utils/collections.js";
import { getCommandQueueSnapshot, enqueuePollEvent } from "../../utils/messageQueueManager.js";
import { executeUserPromptSubmitHooksForSession } from "../../utils/hooks.js";
import { flushSessionStorage } from "../../utils/sessionStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tyg7f3ek.js:33333-33361 placement
function isNoticeKindServed(kind) {
  return NOTICE_KIND_SERVED[kind];
}
//@ chunk-tyg7f3ek.js:33361-33654 placement
var NOTICE_KIND_SERVED = {
  directories: false,
  file_state: false,
  unfit_text: false,
  no_file: false,
  tie: false,
  held_file_unreadable: false,
  needs_file_search: false,
  too_many: false,
  outside: false,
  hipaa: false,
  no_policy_answer: false,
  switched_off: false,
  lane: true,
  unfit_within: true,
  not_served: true,
  fault: true,
  time_limit: true,
  stranded: true,
  waited_too_long: true,
  session_ending: true,
};
//@ chunk-tyg7f3ek.js:33654-33738 placement
class LaneAssignmentMap {
  #t = new WeakMap();
  mark(key, lane) {
    this.#t.set(key, lane);
  }
  laneOf(key) {
    return this.#t.get(key);
  }
}
//@ chunk-tyg7f3ek.js:33738-33764 placement
var HOST_INGRESS_LANES; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:33738", () => {
  HOST_INGRESS_LANES = new SessionRootSlot(() => new LaneAssignmentMap());
});
//@ chunk-tyg7f3ek.js:33764-33775 placement
var MAX_TRACKED_NOTICE_UUIDS = 1e4;
//@ chunk-tyg7f3ek.js:33775-34034 placement
class RecentUuidSet {
  uuids = new Set();
  order = [];
  has(key) {
    return this.uuids.has(key);
  }
  track(key) {
    if (this.uuids.has(key)) return false;
    this.uuids.add(key);
    this.order.push(key);
    if (this.order.length > MAX_TRACKED_NOTICE_UUIDS) {
      let evicted = this.order.splice(0, this.order.length - MAX_TRACKED_NOTICE_UUIDS);
      for (let uuid of evicted) this.uuids.delete(uuid);
    }
    return true;
  }
}
//@ chunk-tyg7f3ek.js:34034-34060 placement
var RECEIVED_MESSAGE_UUIDS; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-tyg7f3ek.js:34034", () => {
  RECEIVED_MESSAGE_UUIDS = new SessionRootSlot(() => new RecentUuidSet());
});
//@ chunk-tyg7f3ek.js:34060-34371 placement
/**
 * session_notices 特性：默认关闭（false）、消息类型常量 session_notices，以及通知载荷的 zod schema。
 */
var SESSION_NOTICES_FLAG; // deferred: uses DoctorLazy (../handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var SESSION_NOTICES_DEFAULT_OFF;
var SESSION_NOTICES;
var sessionNoticeSchema;
deferInit("chunk-tyg7f3ek.js:34060", () => {
  SESSION_NOTICES_FLAG = "tengu_polished_lagoon";
  SESSION_NOTICES_DEFAULT_OFF = false;
  SESSION_NOTICES = "session_notices";
  sessionNoticeSchema = DoctorLazy(() =>
    objectSchema({
      type: literal("session_notice"),
      uuid: stringSchema().regex(/^[A-Za-z0-9_-]{1,128}$/),
      notice_class: stringSchema().regex(/^[a-z][a-z0-9_]{0,63}$/),
      from_session_id: stringSchema().regex(/^[A-Za-z0-9_.:-]{1,256}$/),
      content: stringSchema(),
      isSynthetic: literal(true),
      inbound_origin: literal("mcp_session_notice"),
    }),
  );
});
//@ chunk-tyg7f3ek.js:34371-34448 placement
function isSessionNoticesEnabled() {
  return (
    env.CLAUDE_CODE_REMOTE === true &&
    getIsNonInteractiveSession() &&
    getFeatureValue_CACHED_MAY_BE_STALE(SESSION_NOTICES_FLAG, SESSION_NOTICES_DEFAULT_OFF) &&
    isPollEventIngressActive() &&
    !isHostIngressPollEvents()
  );
}
//@ chunk-tyg7f3ek.js:34448-34754 placement
function sessionNoticesCapability(session, permissionMode) {
  let isRemote = transportStateByHost.of(session).active?.isRemoteTransport() === true;
  let noticesOn = permissionMode === "auto" && isSessionNoticesEnabled() && isRemote;
  let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    SESSION_NOTICES_FLAG,
    SESSION_NOTICES_DEFAULT_OFF,
  );
  logForDebugging(
    `[session-notices] advertise=${noticesOn} mode=${permissionMode} flag=${flagValue}(${source}) pollChannel=${isPollEventIngressActive()} ownEventsOnly=${isHostIngressPollEvents()} remote=${isRemote} remoteEnv=${env.CLAUDE_CODE_REMOTE === true} nonInteractive=${getIsNonInteractiveSession()}`,
  );
  return noticesOn;
}
//@ chunk-tyg7f3ek.js:34754-34845 placement
function completeCommandLifecycleForHost(uuid, session) {
  if (uuid === undefined) return;
  transportStateByHost.of(session).active?.onCommandLifecycle?.(uuid, "completed");
}
//@ chunk-tyg7f3ek.js:34845-38288 placement
/**
 * 处理 CCR 下发的 session_notice（仅 RemoteIO 传输）：校验载荷、去重、截断后作为系统提醒注入。
 */
function handleSessionNotice(
  event,
  { getAppState, setAppState, session, sessionHooks, isRemoteTransport, ingressTail, storageV5, credentials },
) {
  if (!isRemoteTransport()) {
    logForDebugging(
      "[session-notices] session_notice on a non-RemoteIO transport \u2014 dropping without ack",
      {
        level: "warn",
      },
    );
    logFeatureBad("ccr_session_notices", "not_remote_transport");
    return;
  }
  let uuid = normalizeUuidOrNull(event.uuid) ?? undefined;
  let parsed = sessionNoticeSchema().safeParse(event);
  if (!parsed.success) {
    logForDebugging("[session-notices] dropping malformed session_notice payload", {
      level: "error",
    });
    logFeatureBad("ccr_session_notices", "malformed_payload");
    completeCommandLifecycleForHost(uuid, session);
    return;
  }
  let notice = parsed.data;
  if (!isSessionNoticesEnabled()) {
    if (env.CLAUDE_CODE_REMOTE !== true || !getIsNonInteractiveSession()) {
      logFeatureBad("ccr_session_notices", "structurally_not_a_consumer");
      completeCommandLifecycleForHost(notice.uuid, session);
      return;
    }
    logFeatureSad(
      "ccr_session_notices",
      isPollEventIngressActive() && isHostIngressPollEvents() ? "own_events_only" : "flag_disabled",
    );
    return;
  }
  if (getAppState().toolPermissionContext.mode !== "auto") {
    logFeatureSad("ccr_session_notices", "mode_not_auto_will_retry");
    return;
  }
  if (getAppState().sessionNoticesPoll.pendingDeliveryUuids.includes(notice.uuid)) {
    logForDebugging("[session-notices] duplicate redelivery while delivery in flight \u2014 suppressed");
    return;
  }
  let prompt = normalizedEventLabel(notice.content);
  let bodyShrunk = false;
  let maxBodyBytes = MAX_POLL_EVENT_ENVELOPE_BYTES - 1024;
  let escapesJson = false;
  let promptEscaper = escapesJson ? escapedEventJsonBody : escapeXmlText;
  let escapedPrompt = promptEscaper(prompt);
  if (Buffer.byteLength(escapedPrompt, "utf8") > maxBodyBytes) {
    let low = 0;
    let high = prompt.length;
    while (low < high) {
      let mid = low + Math.ceil((high - low) / 2);
      let truncated = truncateToLength(prompt, mid);
      if (Buffer.byteLength(promptEscaper(truncated), "utf8") <= maxBodyBytes - 128) low = mid;
      else high = mid - 1;
    }
    let promptLength = prompt.length;
    let keptPrompt = truncateToLength(prompt, low);
    prompt =
      keptPrompt +
      `
\u2026[session_notice content truncated by the CLI: ${promptLength - keptPrompt.length} characters dropped]`;
    bodyShrunk = true;
  }
  let at = new Date().toISOString();
  let noticeFields = escapesJson
    ? {
        typed: {
          at,
          fields: {
            "notice-class": notice.notice_class,
            "from-session": notice.from_session_id,
            text: prompt,
          },
        },
      }
    : {
        element: validatePollEvent({
          kind: SESSION_NOTICE,
          at,
          content: prompt,
          attributes: {
            "notice-class": notice.notice_class,
            "from-session": notice.from_session_id,
          },
        }),
      };
  try {
    setAppState((state) => ({
      ...state,
      sessionNoticesPoll: {
        pendingDeliveryUuids: [...state.sessionNoticesPoll.pendingDeliveryUuids, notice.uuid],
      },
    }));
  } catch (error) {
    logForDebugging(`[session-notices] pending-add subscriber threw (contained): ${errorMessage(error)}`, {
      level: "error",
    });
  }
  let showNotice = () => {
    setAppState((state) => ({
      ...state,
      sessionNoticesPoll: {
        pendingDeliveryUuids: state.sessionNoticesPoll.pendingDeliveryUuids.filter(
          (pendingDeliveryUuid) => pendingDeliveryUuid !== notice.uuid,
        ),
      },
    }));
  };
  ingressTail.current = ingressTail.current
    .then(async () => {
      if (count(getCommandQueueSnapshot(), isPollEventMode) >= POLL_KIND_DEFAULT_TIMEOUT_MS) {
        showNotice();
        logFeatureSad("ccr_session_notices", "queue_cap_will_retry");
        return;
      }
      let failed = false;
      try {
        for await (let hookResult of executeUserPromptSubmitHooksForSession(
          session,
          sessionHooks,
          prompt,
          getAppState().toolPermissionContext.mode,
          undefined,
          storageV5,
          credentials,
        ))
          if (hookResult.blockingError) {
            failed = true;
            break;
          }
      } catch (error) {
        if (isAbortError(error)) logForDebugging("[session-notices] enqueue hook pass aborted");
        else
          logForDebugging(
            `[session-notices] enqueue hook pass failed (failing open): ${errorMessage(error)}`,
            {
              level: "error",
            },
          );
      }
      if (failed) {
        showNotice();
        logFeatureSad("ccr_session_notices", "hook_blocked_will_retry");
        return;
      }
      enqueuePollEvent({
        kind: SESSION_NOTICE,
        ...noticeFields,
        wake: true,
        allowReservedKind: true,
        provenance: {
          authority: "peer-agent",
          senderId: notice.from_session_id,
          senderText: prompt,
        },
      })
        .then(
          async () => {
            try {
              await flushSessionStorage();
              if (!(
                (await transportStateByHost.of(session).active?.flushInternalEventsConfirmed()) ?? true
              )) {
                showNotice();
                logFeatureSad("ccr_session_notices", "delivery_record_dropped_will_retry");
                return;
              }
            } catch (error) {
              logForDebugging(
                `[session-notices] persistence flush failed (ack skipped, will redeliver): ${errorMessage(error)}`,
                {
                  level: "error",
                },
              );
              showNotice();
              logFeatureSad("ccr_session_notices", "flush_failed_will_retry");
              return;
            }
            showNotice();
            completeCommandLifecycleForHost(notice.uuid, session);
            if (bodyShrunk) logFeatureSad("ccr_session_notices", "content_truncated");
            else logFeatureOk("ccr_session_notices");
          },
          (error) => {
            logForDebugging(`[session-notices] delivery rejected (will redeliver): ${errorMessage(error)}`, {
              level: "error",
            });
            showNotice();
            logFeatureSad("ccr_session_notices", "delivery_rejected_will_retry");
          },
        )
        .catch((error) => {
          logForDebugging(`[session-notices] settle handler failed: ${errorMessage(error)}`, {
            level: "error",
          });
          logFeatureBad("ccr_session_notices", "settle_handler_failed");
        });
    })
    .catch((error) => {
      logForDebugging(`[session-notices] ingress-tail link failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logFeatureBad("ccr_session_notices", "ingress_tail_link_failed");
    });
}
//@ chunk-tyg7f3ek.js:38288-38353 placement
var HELD_MESSAGE_FLAGS = "tengu_mellow_heron";
var TENGU_SNAPPY_SUNRISE_KILLSWITCH = "tengu_snappy_sunrise_killswitch";
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
