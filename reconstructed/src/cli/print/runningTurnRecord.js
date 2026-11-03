/**
 * cli/print/runningTurnRecord.ts
 *
 * 2.1.316 新增：运行中回合记录的构建、对账与压缩保留行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (20)
 * attribution: placement 20
 */
import {
  MAX_HELD_MESSAGES,
  heldUuidsIfEnabled,
  findMessageIndex,
  heldMessageUuidSet,
  isHeldMessageRecognitionOn,
  heldMessageUuids,
} from "./queuedMessageUtils.js";
import { logError } from "../../utils/log.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_CHEEKY_TOUCAN, TENGU_TWINKLY_CLOVER } from "../../services/api/withRetry.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { tRe } from "../../utils/transcript/deserialize.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { env } from "../../utils/env.js";
import { rBo, Jet } from "../../utils/conversationRecovery.js";
import {
  isSyntheticApiErrorMessage,
  isInterruptionOnlyMessage,
  isToolResultMessage,
  isHarnessMetaMessage,
} from "../../utils/messages.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { localCommandTagKindOf } from "../../utils/messages/localCommandTags.js";
import { isTurnUnanswered } from "../../utils/sessionStorage.js";

/**
 * 为正在运行的轮次构造压缩元数据中的 runningTurnSends（opener、已送达的消息 uuid 列表）。
 */
//@ chunk-tyg7f3ek.js:39294-40494 placement
function buildRunningTurnRecord(
  e,
  n,
  { primaryIsMeta: r = !1, resultsAlsoList: s = [], standIn: h, wasPutBack: y } = {},
) {
  let S = [],
    R = [],
    w = (Z) => y !== void 0 && R.includes(Z) && y(Z),
    P = new Set(),
    L = e === void 0 || r,
    q = (Z) => {
      if (Z === "" || S.includes(Z)) return;
      if (S.length < MAX_HELD_MESSAGES) S.push(Z);
      else if (L) S[MAX_HELD_MESSAGES - 1] = Z;
    };
  for (let Z of n ?? []) q(Z);
  if (e !== void 0) {
    if (!S.includes(e))
      if (S.length >= MAX_HELD_MESSAGES) S[MAX_HELD_MESSAGES - 1] = e;
      else S.push(e);
  }
  let x = () => {
      let filtered = S.filter((ce) => !w(ce)),
        at = filtered.at(-1);
      if (at === void 0) return;
      let last = R.findLast((ce) => filtered.includes(ce));
      return {
        user_message_uuid:
          e !== void 0 && !(r && last !== void 0) ? e : (last ?? (h !== void 0 && S.includes(h) ? h : at)),
        user_message_uuids: filtered,
      };
    },
    G = () => {
      let Z = x();
      try {
        let filtered = s.filter((Ue) => !S.includes(Ue)),
          at = filtered.at(-1);
        if (at === void 0) return Z;
        return {
          user_message_uuid: Z?.user_message_uuid ?? at,
          user_message_uuids: [
            ...filtered,
            ...(Z?.user_message_uuids ?? []).slice(-(MAX_HELD_MESSAGES - filtered.length)),
          ],
        };
      } catch (error) {
        return (logError(error), Z);
      }
    };
  return {
    fields: x,
    resultFields: G,
    errorVariantFields: () =>
      G() ?? { user_message_uuid: void 0, ...(R.some(w) && { user_message_uuids: [] }) },
    noteAttachment: (Z) => {
      if (
        Z.type === "queued_command" &&
        Z.commandMode === "prompt" &&
        Z.isMeta !== !0 &&
        Z.source_uuid !== void 0 &&
        P.size < MAX_HELD_MESSAGES
      )
        P.add(Z.source_uuid);
    },
    noteCommandStarted: (Z) => {
      if (P.delete(Z)) {
        if ((q(Z), S.includes(Z))) R.push(Z);
        return !0;
      }
      return !1;
    },
  };
}
//@ chunk-tyg7f3ek.js:40494-40504 placement
var KL = 64;
//@ chunk-tyg7f3ek.js:40504-40910 placement
function createRunningTurnTracker(e) {
  let n = [],
    r,
    s = [],
    h,
    y = !1,
    S = (R) => {
      if (y) return;
      try {
        y = R() === !1;
      } catch (error) {
        ((y = !0), logError(error));
        try {
          logFeatureBad("compact_running_turn_record", "tracker_threw");
        } catch (error) {
          logError(error);
        }
      }
    };
  return {
    onAssistantRow: (R) =>
      S(() => {
        if (countUserPromptsFromEntries_2(R)) ((n = e()), (r = R.uuid));
      }),
    onRoundStart: () =>
      S(() => {
        s = n;
      }),
    onRetraction: (R) =>
      S(() => {
        if (R === r) n = s;
      }),
    onBoundary: (R, w) =>
      S(() => {
        let P = reconcileRunningTurnRecord(R, {
          ...w,
          takenIn: e(),
          takenInAtLastReply: n,
          boundaryOfThisTurn: h,
        });
        return ((h = R), P);
      }),
  };
}
//@ chunk-tyg7f3ek.js:40910-41059 placement = countUserPromptsFromEntries (0.769)
function countUserPromptsFromEntries_2(entries) {
  return (
    entries.type === "assistant" &&
    !("isSidechain" in entries && entries.isSidechain === !0) &&
    !entries.isApiErrorMessage &&
    entries.isVirtual !== !0 &&
    entries.message.model !== SYNTHETIC_MODEL
  );
}
//@ chunk-tyg7f3ek.js:41059-42197 placement
function reconcileRunningTurnRecord(
  e,
  {
    boundaryOfThisTurn: boundaryOfThisTurn,
    continuedTurnsRows: continuedTurnsRows,
    conversation: conversation,
    ...h
  },
) {
  try {
    let y = h.openerUuid?.toLowerCase(),
      S =
        continuedTurnsRows?.findLastIndex((Z) => typeof Z.uuid === "string" && Z.uuid.toLowerCase() === y) ??
        -1,
      R = S === -1 ? [] : (continuedTurnsRows?.slice(S + 1) ?? []),
      w =
        boundaryOfThisTurn ??
        (continuedTurnsRows && findRunningTurnBoundary(h.openerUuid, continuedTurnsRows)),
      P =
        getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) === "on"
          ? w?.compactMetadata?.preservedMessages?.uuids
          : void 0,
      L = new Set(Array.isArray(P) ? P.map((Z) => String(Z).toLowerCase()) : []),
      lastIndex = conversation.findLastIndex((Z) => Z.uuid === w?.uuid),
      x =
        L.size === 0 || lastIndex === -1
          ? []
          : conversation.filter(
              (Z, re) =>
                re > lastIndex &&
                typeof Z.uuid === "string" &&
                L.has(Z.uuid.toLowerCase()) &&
                !(
                  Z.type === "attachment" &&
                  Z.attachment?.type === "queued_command" &&
                  Z.attachment.renderedByBatchHead
                ),
            ),
      G = mergeRunningTurnSends({
        ...h,
        keptAtTheLastBoundary: [...x.map((Z) => Z.uuid), ...heldUuidsIfEnabled(x)],
        takenInAtLastReply:
          h.openerUuid !== void 0 &&
          R.some(countUserPromptsFromEntries_2) &&
          !R.some(isCompactBoundaryMessage)
            ? [...h.takenInAtLastReply, h.openerUuid]
            : h.takenInAtLastReply,
        earlierBoundary: w,
      });
    if (G === "too_many_unanswered")
      return (logFeatureSad("compact_running_turn_record", "too_many_unanswered"), !1);
    if ((logFeatureOk("compact_running_turn_record", { recorded: G !== void 0 }), G !== void 0))
      e.compactMetadata.runningTurnSends = G;
    return !0;
  } catch (error) {
    logError(error);
    try {
      logFeatureBad("compact_running_turn_record", "threw");
    } catch (error) {
      logError(error);
    }
    return !1;
  }
}
//@ chunk-tyg7f3ek.js:42197-42463 placement
function findRunningTurnBoundary(e, n) {
  let lastIndex = n.findLastIndex(isCompactBoundaryMessage),
    s = n[lastIndex];
  if (s === void 0 || !isCompactBoundaryMessage(s)) return;
  let h = s.compactMetadata?.runningTurnSends?.openerUuid;
  return (
    e !== void 0
      ? typeof h === "string" && h.toLowerCase() === e.toLowerCase()
      : !n.slice(lastIndex + 1).some((y) => y.type === "user" && !tRe(y))
  )
    ? s
    : void 0;
}
//@ chunk-tyg7f3ek.js:42463-43363 placement
function mergeRunningTurnSends({
  takenIn: takenIn,
  takenInAtLastReply: takenInAtLastReply,
  keptAtTheLastBoundary: keptAtTheLastBoundary,
  openerUuid: openerUuid,
  earlierBoundary: earlierBoundary,
}) {
  let y = earlierBoundary?.compactMetadata,
    S = typeof y === "object" && y !== null ? Reflect.get(y, "runningTurnSends") : void 0,
    R = (ce) => (typeof S === "object" && S !== null ? Reflect.get(S, ce) : void 0),
    w = (ce) => {
      let nt = R(ce);
      return Array.isArray(nt) ? nt.slice(0, MAX_HELD_MESSAGES) : [];
    },
    P = (ce) => (typeof ce === "string" ? ce.toLowerCase() : ce),
    L = (ce, nt) => ce.some((ie) => P(ie) === P(nt)),
    q = (ce) =>
      Ji(
        ce.filter((nt) => typeof nt === "string" && nt !== "" && nt.length <= KL),
        P,
      ),
    x = w("summarisedOnly"),
    filtered = x.filter(
      (ce) => !(L(keptAtTheLastBoundary, ce) && L(takenIn, ce) && L(takenInAtLastReply, ce)),
    ),
    Z = [
      ...w("uuids").filter((ce) => !L(filtered, ce)),
      ...takenIn.filter((ce) => L(takenInAtLastReply, ce) && !L(filtered, ce)),
    ],
    sliced = q(Z).slice(0, MAX_HELD_MESSAGES),
    Ae = q([...x, ...takenIn].filter((ce) => !L(Z, ce)));
  if (Ae.length > MAX_HELD_MESSAGES) return "too_many_unanswered";
  if (sliced.length === 0 && Ae.length === 0) return;
  let [Ue] = q([openerUuid, R("openerUuid")]);
  return {
    uuids: sliced,
    ...(Ue !== void 0 && { openerUuid: Ue }),
    ...(Ae.length > 0 && { summarisedOnly: Ae }),
  };
}
//@ chunk-tyg7f3ek.js:43363-43374 placement
var YL = 1e4;
//@ chunk-tyg7f3ek.js:43374-43462 placement
function lowercaseUuidSet(e) {
  return new Set(e.flatMap((n) => (typeof n === "string" ? [n.toLowerCase()] : [])));
}
//@ chunk-tyg7f3ek.js:43462-44099 placement
function compactionPreservedRows(e, n, r = e) {
  let s,
    h = !1,
    y = !1;
  try {
    s = e.findLast(isCompactBoundaryMessage);
    let uuids = Object(Object(s?.compactMetadata).preservedMessages).uuids,
      P = lowercaseUuidSet(Array.isArray(uuids) ? uuids : []);
    if (P.size > 0) {
      let L = lowercaseUuidSet(r.map((q) => q.uuid));
      y = !(L.has(String(s?.uuid).toLowerCase()) && [...P].some((q) => L.has(q)));
    }
    h = findRunningTurnBoundary(void 0, e) !== void 0 && findRunningTurnBoundary(n, e) !== void 0;
  } catch (error) {
    logError(error);
    return;
  }
  if (s === void 0) return;
  let parse = Date.parse(String(s.timestamp)),
    R = Object(Object(s.compactMetadata).runningTurnSends);
  return {
    listed: Array.isArray(R.uuids) ? lowercaseUuidSet(R.uuids) : void 0,
    takenInSince: lowercaseUuidSet(Array.isArray(R.summarisedOnly) ? R.summarisedOnly : []),
    atMs: parse <= Date.now() ? parse : void 0,
    ranInsideTheCutOffTurn: h,
    keptRowsNotLoaded: y,
  };
}
//@ chunk-tyg7f3ek.js:44099-44453 placement
function isRowFromLoadedCompaction({
  uuid: uuid,
  conversation: conversation,
  loadedCompaction: loadedCompaction,
}) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    (loadedCompaction?.listed?.has(uuid.toLowerCase()) === !0 ||
      loadedCompaction?.takenInSince.has(uuid.toLowerCase()) === !0) &&
    loadedCompaction.atMs !== void 0 &&
    Date.now() - loadedCompaction.atMs < rBo &&
    !Jet(conversation.filter((s) => !isSyntheticApiErrorMessage(s))) &&
    isFoamySpringEnabled() &&
    conversation
      .slice(conversation.findLastIndex(isCompactBoundaryMessage) + 1)
      .every((s) =>
        s.type === "assistant"
          ? isSyntheticApiErrorMessage(s)
          : s.type !== "user" || s.isCompactSummary === !0,
      )
  );
}
//@ chunk-tyg7f3ek.js:44453-44581 placement
function cutOffTurnFlagFor({
  uuid: uuid,
  loadedCompaction: loadedCompaction,
  carriesTheCutOffTurnOn: carriesTheCutOffTurnOn,
}) {
  return carriesTheCutOffTurnOn && loadedCompaction?.listed?.has(uuid.toLowerCase()) === !0
    ? getRemoteFeatureGateState(TENGU_TWINKLY_CLOVER)
    : void 0;
}
//@ chunk-tyg7f3ek.js:44581-44736 placement
function turnStartedBeforeCompaction({
  startedAtMs: startedAtMs,
  loadedCompaction: loadedCompaction,
  carriesTheCutOffTurnOn: carriesTheCutOffTurnOn,
}) {
  return (
    carriesTheCutOffTurnOn &&
    loadedCompaction !== void 0 &&
    loadedCompaction.listed === void 0 &&
    loadedCompaction.atMs !== void 0 &&
    startedAtMs !== void 0 &&
    startedAtMs + YL < loadedCompaction.atMs
  );
}
//@ chunk-tyg7f3ek.js:44736-44914 placement
var TERMINAL_TURN_OUTCOMES = new Set([
  "reply",
  "reply_then_reminder",
  "stop_marker",
  "terminal_api_error",
  "terminal_tool_result",
  "silent_reply_after_terminal_tool",
  "deliberate_stop_result",
  "max_turns",
]);
//@ chunk-tyg7f3ek.js:44914-45970 placement
function compactionCopyTelemetry({
  uuid: uuid,
  loadedCompaction: loadedCompaction,
  carriesTheCutOffTurnOn: carriesTheCutOffTurnOn,
  finishedTail: finishedTail,
  growthBookCold: growthBookCold,
}) {
  if (loadedCompaction === void 0) return {};
  if (loadedCompaction.listed === void 0) return { ended_turn_copy_no_record: !0 };
  if (!loadedCompaction.listed.has(uuid.toLowerCase())) return { ended_turn_copy_not_in_record: !0 };
  let y =
      finishedTail !== void 0 &&
      (TERMINAL_TURN_OUTCOMES.has(finishedTail.because) ||
        (finishedTail.because === "not_continued_api_error_too_old" &&
          finishedTail.rateLimitRowSteppedOver === !0)),
    S = {
      ...(carriesTheCutOffTurnOn && { ended_turn_copy_turn_carried_on: !0 }),
      ...(loadedCompaction.keptRowsNotLoaded && { ended_turn_copy_kept_rows_not_loaded: !0 }),
      ...(finishedTail !== void 0 &&
        !loadedCompaction.ranInsideTheCutOffTurn && { ended_turn_copy_user_row_after_boundary: !0 }),
      ...(!y && { ended_turn_copy_last_turn_not_ended: !0 }),
      ...(finishedTail !== void 0 &&
        finishedTail.callsWithoutResult > 0 && { ended_turn_copy_tool_calls_without_result: !0 }),
    };
  return {
    ...(Object.keys(S).length === 0 ? { ended_turn_copy_would_skip: !0 } : S),
    ...(growthBookCold && { ended_turn_copy_growthbook_cold: !0 }),
    ...(finishedTail !== void 0 && {
      ...(finishedTail.lastPromptUuid !== void 0 && { ended_turn_copy_sent_prompt_loaded: !0 }),
      ended_turn_copy_finished_because: finishedTail.because,
      ended_turn_copy_last_reply_stop_reason: finishedTail.lastReplyStopReason,
      ended_turn_copy_stored_tail_row: finishedTail.tailRows[0],
    }),
  };
}
//@ chunk-tyg7f3ek.js:45970-46684 placement
function classifyRedeliveredRow(e, n) {
  let carriesTheCutOffTurnOn = n.carriesTheCutOffTurnOn();
  if (n.loadedCompaction?.ranInsideTheCutOffTurn === !1) {
    if (
      cutOffTurnFlagFor({
        uuid: e,
        loadedCompaction: n.loadedCompaction,
        carriesTheCutOffTurnOn: carriesTheCutOffTurnOn,
      }) !== "on" ||
      !n.anInheritedPromptWaits()
    )
      return;
    return (n.noteCopyAwaitsTheCutOffTurn(), { whileStillOwed: n.cutOffTurnIsStillOwed });
  }
  let { loadedCompaction: loadedCompaction } = n,
    h = cutOffTurnFlagFor({
      uuid: e,
      loadedCompaction: loadedCompaction,
      carriesTheCutOffTurnOn: carriesTheCutOffTurnOn,
    });
  if (h === void 0) {
    if (carriesTheCutOffTurnOn && loadedCompaction?.takenInSince.has(e.toLowerCase()))
      return "taken_in_since";
    return turnStartedBeforeCompaction({
      startedAtMs: n.startedAtMs(e),
      loadedCompaction: loadedCompaction,
      carriesTheCutOffTurnOn: carriesTheCutOffTurnOn,
    })
      ? "unlisted"
      : void 0;
  }
  if (loadedCompaction?.keptRowsNotLoaded === !0) return "kept_rows_not_loaded";
  if (h !== "on") return h;
  return (n.noteCopyAwaitsTheCutOffTurn(), n.cutOffTurnIsStillOwed);
}
//@ chunk-tyg7f3ek.js:46684-46774 placement
function Bb(e) {
  return (
    ("isCompactSummary" in e && e.isCompactSummary === !0) ||
    isInterruptionOnlyMessage(e) ||
    isToolResultMessage(e) ||
    isHarnessMetaMessage(e)
  );
}
//@ chunk-tyg7f3ek.js:46774-46879 placement
function isSyntheticUserMessage(e) {
  return (
    e.type === "user" &&
    e.promptSource === void 0 &&
    !Bb(e) &&
    (e.isMeta === !0 || localCommandTagKindOf(e) !== void 0)
  );
}
//@ chunk-tyg7f3ek.js:46879-47303 placement
function isOpenerUnanswered(e, n) {
  let r = findMessageIndex(e, n),
    s = e[r];
  if (s === void 0 || s.uuid === n) return isTurnUnanswered(e, n);
  let filtered = e.filter(
      (S, R) =>
        R > r &&
        (S.type === "user" || S.type === "assistant") &&
        !("isSidechain" in S && S.isSidechain === !0) &&
        !isSyntheticApiErrorMessage(S) &&
        !isSyntheticUserMessage(S),
    ),
    y = (S) => S.type === "user" && S.interruptedByShutdown !== !0 && isInterruptionOnlyMessage(S);
  if (
    !filtered.some((S) => S.type === "assistant") &&
    !(s.type === "attachment"
      ? filtered.length > 0 && y(filtered.at(-1)) && filtered.some((S) => !Bb(S))
      : filtered.some(y))
  )
    return !0;
  return isTurnUnanswered([s, ...filtered], s.uuid);
}
//@ chunk-tyg7f3ek.js:47303-47443 placement
function makeHeldMessageMatcher(e, n, r) {
  let s = new Set();
  try {
    s = heldMessageUuidSet(e);
  } catch (error) {
    logError(error);
  }
  let h = r();
  return (y) =>
    isHeldMessageRecognitionOn() &&
    ((r() === h && s.has(y)) || n().some((S) => heldMessageUuids(S).includes(y)));
}

export {
  makeHeldMessageMatcher,
  compactionPreservedRows,
  classifyRedeliveredRow,
  isRowFromLoadedCompaction,
  compactionCopyTelemetry,
  buildRunningTurnRecord,
  createRunningTurnTracker,
  isSyntheticUserMessage,
  findRunningTurnBoundary,
  lowercaseUuidSet,
  isOpenerUnanswered,
};
