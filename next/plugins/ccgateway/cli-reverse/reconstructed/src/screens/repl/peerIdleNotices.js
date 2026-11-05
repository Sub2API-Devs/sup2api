/**
 * screens/repl/peerIdleNotices.ts
 *
 * 2.1.316 新增。同伴会话空闲通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (8)
 * attribution: placement 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useRef,
  useEffect,
  useEffectEvent,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1465036-1465040 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1465036", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1466080-1466084 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1466080", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1466579-1466612 placement
var DEBOUNCE_MS = 500;
var MAX_BURST_NOTICES = 50;
var MAX_NOTICES_PER_ROUND = 10;
var MAX_REPLAYED_NOTICES = 10;
//@ chunk-czq1j3j2.js:1466612-1468290 placement
function usePeerIdleNotices(transcript, messages, isSessionWorking) {
  let lines = useRef([]);
  let counters = useRef({
    windowStart: 0,
    count: 0,
    suppressed: 0,
    replayedShown: 0,
    premountSuppressed: 0,
    cancelSummary: null,
  });
  let clock = useClock();
  let flushRef = useRef(() => {});
  flushRef.current = () => {
    let sessionId = getSessionId();
    let mapped = lines.current.filter((entry) => entry.sessionId === sessionId).map((entry) => entry.notice);
    let droppedCount = lines.current.length - mapped.length;
    if (droppedCount > 0)
      logForDebugging(
        `[peer-idle] ${droppedCount} admitted idle ${plural(droppedCount, "notice")} dropped: conversation cleared inside the coalesce window`,
      );
    lines.current = [];
    if (mapped.length === 0) return;
    transcript.apply({
      type: "append",
      messages: mapped.map((notice) => createSystemMessage(idleNoticeSystemLine(notice), "notice")),
    });
    enqueueIdleNoticesForModel(mapped.filter((notice) => notice.modelVisible));
  };
  let scheduleFlush = useDebouncedCallback(() => flushRef.current(), DEBOUNCE_MS);
  useEffect(() => {
    {
      setOnPeerIdleNotice((notice) => {
        if (lines.current.length >= MAX_BURST_NOTICES) {
          scheduleFlush.cancel();
          flushRef.current();
        }
        lines.current.push({
          notice,
          sessionId: getSessionId(),
        });
        if (lines.current.length === 1) scheduleFlush();
      });
      let emitSuppressedSummary = () => {
        let counters_2 = counters.current;
        counters_2.cancelSummary = null;
        let suppressed = counters_2.suppressed;
        counters_2.suppressed = 0;
        if (suppressed > 0)
          transcript.apply({
            type: "append",
            messages: [createSystemMessage(moreRecentIdleNotice(suppressed), "notice")],
          });
      };
      setOnIdleSubscribed(
        (peerId, peerName, isReplay) => {
          let counters_2 = counters.current;
          let emitNotice = () =>
            transcript.apply({
              type: "append",
              messages: [createSystemMessage(idleSubscribedSystemLine(peerId, peerName), "notice")],
            });
          if (isReplay) {
            if (counters_2.replayedShown >= MAX_REPLAYED_NOTICES) counters_2.premountSuppressed++;
            else {
              counters_2.replayedShown++;
              emitNotice();
            }
            return;
          }
          let nowMs = clock.now();
          if (nowMs - counters_2.windowStart > 60000) {
            counters_2.windowStart = nowMs;
            counters_2.count = 0;
          }
          if (counters_2.count >= MAX_NOTICES_PER_ROUND) {
            counters_2.suppressed++;
            if (counters_2.cancelSummary === null)
              counters_2.cancelSummary = clock.setTimeout(
                emitSuppressedSummary,
                Math.max(0, 60000 - (nowMs - counters_2.windowStart)),
              );
            return;
          }
          counters_2.count++;
          emitNotice();
        },
        (premountSuppressed) => {
          let counters_2 = counters.current;
          let totalSuppressed = premountSuppressed + counters_2.premountSuppressed;
          counters_2.premountSuppressed = 0;
          if (totalSuppressed > 0)
            transcript.apply({
              type: "append",
              messages: [createSystemMessage(moreEarlierIdleNotice(totalSuppressed), "notice")],
            });
        },
      );
      setIdleLastTurnTextProvider(() => getLastAssistantTextForResult(transcript.getSnapshot()));
      return () => {
        setOnPeerIdleNotice(null);
        setOnIdleSubscribed(null);
        setIdleLastTurnTextProvider(null);
        scheduleFlush.cancel();
        flushRef.current();
        counters.current.cancelSummary?.();
        emitSuppressedSummary();
      };
    }
  }, [scheduleFlush, transcript, clock]);
  useEffect(() => {
    notePeerIdleStatus(messages === "idle" || messages === "shell", messages === "busy");
  }, [messages]);
  let isWorking = useEffectEvent(isSessionWorking);
  useEffect(
    () => () => {
      notePeerIdleStatus(!isWorking(), false);
    },
    [],
  );
}
//@ chunk-czq1j3j2.js:1468290-1468406 placement
/**
 * “最近一分钟还有 N 条空闲订阅”提示。
 */
function moreRecentIdleNotice(suppressed) {
  return `${suppressed} more idle ${plural(suppressed, "subscription was", "subscriptions were")} recorded in the last minute.`;
}
//@ chunk-czq1j3j2.js:1468406-1468527 placement
/**
 * “打开前还有 N 条空闲订阅”提示。
 */
function moreEarlierIdleNotice(count) {
  return `${count} more idle ${plural(count, "subscription was", "subscriptions were")} recorded before this view opened.`;
}
//@ chunk-czq1j3j2.js:1468531-1468806 placement
/**
 * 阻塞原因到类型（permission/question）的映射、认证错误集合与上限。
 */
var BLOCKED_ON_KIND; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var AUTH_ERROR_KINDS;
var MAX_WAITERS;
deferInit("chunk-czq1j3j2.js:1468531", () => {
  BLOCKED_ON_KIND = {
    "permission prompt": "permission",
    "sandbox request": "permission",
    "worker request": "permission",
    "goal proposal": "permission",
    "input needed": "question",
    "dialog open": undefined,
  };
  AUTH_ERROR_KINDS = new Set(["authentication_failed", "oauth_org_not_allowed", "cloud_credential_error"]);
  MAX_WAITERS = 32;
});
//@ chunk-czq1j3j2.js:1468806-1469387 placement
/**
 * 由会话状态得到展示状态（working/blocked/done/idle/error）。
 */
function sessionPresenceState(presence) {
  if (presence.status === "busy" || (presence.status === "idle" && presence.queued))
    return {
      state: "working",
      progress: presence.progress,
      msg: presence.workingDetail,
    };
  if (presence.status === "waiting" && presence.blockedOn !== undefined)
    return {
      state: "blocked",
      kind: BLOCKED_ON_KIND[presence.blockedOn],
      progress: presence.progress,
      msg: completeLabelOrUndefined(presence.blockedText ?? presence.blockedOn) ?? presence.blockedOn,
    };
  let lastTurnEnd = presence.lastTurnEnd;
  if (lastTurnEnd === "completed")
    return {
      state: "done",
      msg: presence.doneDetail,
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
  return presence.signedInSince
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
