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
import { j, R, P, Oo } from "../../../vendor/react/cjs/react.production.js";
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
j();
//@ chunk-18hwfzwa.js:1426390-1426423 placement
var xBo = 500,
  PBo = 50,
  ABo = 10,
  IBo = 10;
//@ chunk-18hwfzwa.js:1426423-1428101 placement
function usePeerIdleNotices(h, x, D) {
  let L = R([]),
    ee = R({
      windowStart: 0,
      count: 0,
      suppressed: 0,
      replayedShown: 0,
      premountSuppressed: 0,
      cancelSummary: null,
    }),
    ke = useClock(),
    Re = R(() => {});
  Re.current = () => {
    let We = getSessionId(),
      mapped = L.current.filter((rt) => rt.sessionId === We).map((rt) => rt.notice),
      Xe = L.current.length - mapped.length;
    if (Xe > 0)
      logForDebugging(
        `[peer-idle] ${Xe} admitted idle ${plural(Xe, "notice")} dropped: conversation cleared inside the coalesce window`,
      );
    if (((L.current = []), mapped.length === 0)) return;
    (h.apply({
      type: "append",
      messages: mapped.map((rt) => createSystemMessage(idleNoticeSystemLine(rt), "notice")),
    }),
      enqueueIdleNoticesForModel(mapped.filter((rt) => rt.modelVisible)));
  };
  let Be = useDebouncedCallback(() => Re.current(), xBo);
  (P(() => {
    {
      setOnPeerIdleNotice((ze) => {
        if (L.current.length >= PBo) (Be.cancel(), Re.current());
        if ((L.current.push({ notice: ze, sessionId: getSessionId() }), L.current.length === 1)) Be();
      });
      let We = () => {
        let ze = ee.current;
        ze.cancelSummary = null;
        let suppressed = ze.suppressed;
        if (((ze.suppressed = 0), suppressed > 0))
          h.apply({
            type: "append",
            messages: [createSystemMessage(moreRecentIdleNotice(suppressed), "notice")],
          });
      };
      return (
        setOnIdleSubscribed(
          (ze, Xe, rt) => {
            let kt = ee.current,
              At = () =>
                h.apply({
                  type: "append",
                  messages: [createSystemMessage(idleSubscribedSystemLine(ze, Xe), "notice")],
                });
            if (rt) {
              if (kt.replayedShown >= IBo) kt.premountSuppressed++;
              else (kt.replayedShown++, At());
              return;
            }
            let now = ke.now();
            if (now - kt.windowStart > 60000) ((kt.windowStart = now), (kt.count = 0));
            if (kt.count >= ABo) {
              if ((kt.suppressed++, kt.cancelSummary === null))
                kt.cancelSummary = ke.setTimeout(We, Math.max(0, 60000 - (now - kt.windowStart)));
              return;
            }
            (kt.count++, At());
          },
          (ze) => {
            let Xe = ee.current,
              rt = ze + Xe.premountSuppressed;
            if (((Xe.premountSuppressed = 0), rt > 0))
              h.apply({
                type: "append",
                messages: [createSystemMessage(moreEarlierIdleNotice(rt), "notice")],
              });
          },
        ),
        setIdleLastTurnTextProvider(() => getLastAssistantTextForResult(h.getSnapshot())),
        () => {
          (setOnPeerIdleNotice(null),
            setOnIdleSubscribed(null),
            setIdleLastTurnTextProvider(null),
            Be.cancel(),
            Re.current(),
            ee.current.cancelSummary?.(),
            We());
        }
      );
    }
  }, [Be, h, ke]),
    P(() => {
      notePeerIdleStatus(x === "idle" || x === "shell", x === "busy");
    }, [x]));
  let He = Oo(D);
  P(
    () => () => {
      notePeerIdleStatus(!He(), !1);
    },
    [],
  );
}
/**
 * “最近一分钟还有 N 条空闲订阅”提示。
 */
//@ chunk-18hwfzwa.js:1428101-1428217 placement
function moreRecentIdleNotice(h) {
  return `${h} more idle ${plural(h, "subscription was", "subscriptions were")} recorded in the last minute.`;
}
/**
 * “打开前还有 N 条空闲订阅”提示。
 */
//@ chunk-18hwfzwa.js:1428217-1428338 placement
function moreEarlierIdleNotice(h) {
  return `${h} more idle ${plural(h, "subscription was", "subscriptions were")} recorded before this view opened.`;
}
//@ chunk-18hwfzwa.js:1428338-1428342 placement
j();
/**
 * 阻塞原因到类型（permission/question）的映射、认证错误集合与上限。
 */
//@ chunk-18hwfzwa.js:1428342-1428617 placement
var BLOCKED_ON_KIND = {
    "permission prompt": "permission",
    "sandbox request": "permission",
    "worker request": "permission",
    "goal proposal": "permission",
    "input needed": "question",
    "dialog open": void 0,
  },
  AUTH_ERROR_KINDS = new Set(["authentication_failed", "oauth_org_not_allowed", "cloud_credential_error"]),
  LBo = 32;
/**
 * 由会话状态得到展示状态（working/blocked/done/idle/error）。
 */
//@ chunk-18hwfzwa.js:1428617-1429198 placement
function sessionPresenceState(h) {
  if (h.status === "busy" || (h.status === "idle" && h.queued))
    return { state: "working", progress: h.progress, msg: h.workingDetail };
  if (h.status === "waiting" && h.blockedOn !== void 0)
    return {
      state: "blocked",
      kind: BLOCKED_ON_KIND[h.blockedOn],
      progress: h.progress,
      msg: completeLabelOrUndefined(h.blockedText ?? h.blockedOn) ?? h.blockedOn,
    };
  let lastTurnEnd = h.lastTurnEnd;
  if (lastTurnEnd === "completed") return { state: "done", msg: h.doneDetail };
  if (lastTurnEnd === null || lastTurnEnd === "stopped") return { state: "idle" };
  if (lastTurnEnd.errorKind === void 0 || !AUTH_ERROR_KINDS.has(lastTurnEnd.errorKind))
    return { state: "error", msg: lastTurnEnd.failure };
  return h.signedInSince ? { state: "idle" } : { state: "blocked", kind: "auth", msg: lastTurnEnd.failure };
}

export { LBo, sessionPresenceState, usePeerIdleNotices };
