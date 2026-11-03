/**
 * screens/repl/peerIdleNotices.ts
 *
 * 2.1.316 新增。同伴会话空闲通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { init_react_production, R, P, Oo } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { getSessionId } from "../../bootstrap/state.js";
import { logForDebugging } from "../../utils/debug.js";
import { plural } from "../../utils/stringUtils.js";
import { createSystemMessage, getLastAssistantTextForResult } from "../../utils/messages.js";
import {
  idleNoticeSystemLine,
  enqueueIdleNoticesForModel,
  setOnPeerIdleNotice,
  setOnIdleSubscribed,
  idleSubscribedSystemLine,
  setIdleLastTurnTextProvider,
  notePeerIdleStatus,
} from "../../utils/peerIdleSubscriptions.js";
import { useDebouncedCallback } from "../../ink/components/Input.js";
import { completeLabelOrUndefined } from "./sessionPresence.js";

//@ chunk-18hwfzwa.js:1426386-1426390 placement
init_react_production();
//@ chunk-18hwfzwa.js:1426390-1426423 placement
var DEBOUNCE_MS = 500;
var MAX_BURST_NOTICES = 50;
var MAX_NOTICES_PER_ROUND = 10;
var MAX_REPLAYED_NOTICES = 10;
//@ chunk-18hwfzwa.js:1426423-1428101 placement
function usePeerIdleNotices(transcript, x, isSessionWorking) {
  let L = R([]);
  let ee = R({
    windowStart: 0,
    count: 0,
    suppressed: 0,
    replayedShown: 0,
    premountSuppressed: 0,
    cancelSummary: null,
  });
  let clock = useClock();
  let Re = R(() => {});
  Re.current = () => {
    let sessionId = getSessionId();
    let mapped = L.current.filter((rt) => rt.sessionId === sessionId).map((rt) => rt.notice);
    let Xe = L.current.length - mapped.length;
    if (Xe > 0)
      logForDebugging(
        `[peer-idle] ${Xe} admitted idle ${plural(Xe, "notice")} dropped: conversation cleared inside the coalesce window`,
      );
    L.current = [];
    if (mapped.length === 0) return;
    transcript.apply({
      type: "append",
      messages: mapped.map((rt) => createSystemMessage(idleNoticeSystemLine(rt), "notice")),
    });
    enqueueIdleNoticesForModel(mapped.filter((rt) => rt.modelVisible));
  };
  let Be = useDebouncedCallback(() => Re.current(), DEBOUNCE_MS);
  P(() => {
    {
      setOnPeerIdleNotice((notice) => {
        if (L.current.length >= MAX_BURST_NOTICES) {
          Be.cancel();
          Re.current();
        }
        L.current.push({
          notice,
          sessionId: getSessionId(),
        });
        if (L.current.length === 1) Be();
      });
      let We = () => {
        let ze = ee.current;
        ze.cancelSummary = null;
        let suppressed = ze.suppressed;
        ze.suppressed = 0;
        if (suppressed > 0)
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(moreRecentIdleNotice(suppressed), "notice")],
          });
      };
      setOnIdleSubscribed(
        (ze, Xe, rt) => {
          let kt = ee.current;
          let At = () =>
            transcript.apply({
              type: "append",
              messages: [createSystemMessage(idleSubscribedSystemLine(ze, Xe), "notice")],
            });
          if (rt) {
            if (kt.replayedShown >= MAX_REPLAYED_NOTICES) kt.premountSuppressed++;
            else {
              kt.replayedShown++;
              At();
            }
            return;
          }
          let It = clock.now();
          if (It - kt.windowStart > 60000) {
            kt.windowStart = It;
            kt.count = 0;
          }
          if (kt.count >= MAX_NOTICES_PER_ROUND) {
            kt.suppressed++;
            if (kt.cancelSummary === null)
              kt.cancelSummary = clock.setTimeout(We, Math.max(0, 60000 - (It - kt.windowStart)));
            return;
          }
          kt.count++;
          At();
        },
        (ze) => {
          let Xe = ee.current;
          let rt = ze + Xe.premountSuppressed;
          Xe.premountSuppressed = 0;
          if (rt > 0)
            transcript.apply({
              type: "append",
              messages: [createSystemMessage(moreEarlierIdleNotice(rt), "notice")],
            });
        },
      );
      setIdleLastTurnTextProvider(() => getLastAssistantTextForResult(transcript.getSnapshot()));
      return () => {
        setOnPeerIdleNotice(null);
        setOnIdleSubscribed(null);
        setIdleLastTurnTextProvider(null);
        Be.cancel();
        Re.current();
        ee.current.cancelSummary?.();
        We();
      };
    }
  }, [Be, transcript, clock]);
  P(() => {
    notePeerIdleStatus(x === "idle" || x === "shell", x === "busy");
  }, [x]);
  let He = Oo(isSessionWorking);
  P(
    () => () => {
      notePeerIdleStatus(!He(), false);
    },
    [],
  );
}
//@ chunk-18hwfzwa.js:1428101-1428217 placement
/**
 * “最近一分钟还有 N 条空闲订阅”提示。
 */
function moreRecentIdleNotice(suppressed) {
  return `${suppressed} more idle ${plural(suppressed, "subscription was", "subscriptions were")} recorded in the last minute.`;
}
//@ chunk-18hwfzwa.js:1428217-1428338 placement
/**
 * “打开前还有 N 条空闲订阅”提示。
 */
function moreEarlierIdleNotice(h) {
  return `${h} more idle ${plural(h, "subscription was", "subscriptions were")} recorded before this view opened.`;
}
//@ chunk-18hwfzwa.js:1428338-1428342 placement
init_react_production();
//@ chunk-18hwfzwa.js:1428342-1428617 placement
/**
 * 阻塞原因到类型（permission/question）的映射、认证错误集合与上限。
 */
var BLOCKED_ON_KIND = {
  "permission prompt": "permission",
  "sandbox request": "permission",
  "worker request": "permission",
  "goal proposal": "permission",
  "input needed": "question",
  "dialog open": undefined,
};
var AUTH_ERROR_KINDS = new Set(["authentication_failed", "oauth_org_not_allowed", "cloud_credential_error"]);
var MAX_WAITERS = 32;
//@ chunk-18hwfzwa.js:1428617-1429198 placement
/**
 * 由会话状态得到展示状态（working/blocked/done/idle/error）。
 */
function sessionPresenceState(h) {
  if (h.status === "busy" || (h.status === "idle" && h.queued))
    return {
      state: "working",
      progress: h.progress,
      msg: h.workingDetail,
    };
  if (h.status === "waiting" && h.blockedOn !== undefined)
    return {
      state: "blocked",
      kind: BLOCKED_ON_KIND[h.blockedOn],
      progress: h.progress,
      msg: completeLabelOrUndefined(h.blockedText ?? h.blockedOn) ?? h.blockedOn,
    };
  let lastTurnEnd = h.lastTurnEnd;
  if (lastTurnEnd === "completed")
    return {
      state: "done",
      msg: h.doneDetail,
    };
  if (lastTurnEnd === null || lastTurnEnd === "stopped")
    return {
      state: "idle",
    };
  if (lastTurnEnd.errorKind === undefined || !AUTH_ERROR_KINDS.has(lastTurnEnd.errorKind))
    return {
      state: "error",
      msg: lastTurnEnd.failure,
    };
  return h.signedInSince
    ? {
        state: "idle",
      }
    : {
        state: "blocked",
        kind: "auth",
        msg: lastTurnEnd.failure,
      };
}
export { MAX_WAITERS, sessionPresenceState, usePeerIdleNotices };
