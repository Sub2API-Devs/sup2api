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
import { isNonPromptUserRow } from "../../utils/transcript/deserialize.js";
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { env } from "../../utils/env.js";
import { MAX_RESUME_TAIL_AGE_MS, isResumeTooOld } from "../../utils/conversationRecovery.js";
import {
  isSyntheticApiErrorMessage,
  isInterruptionOnlyMessage,
  isToolResultMessage,
  isHarnessMetaMessage,
} from "../../utils/messages.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { localCommandTagKindOf } from "../../utils/messages/localCommandTags.js";
import { isTurnUnanswered } from "../../utils/sessionStorage.js";

//@ chunk-tyg7f3ek.js:39294-40494 placement
/**
 * 为正在运行的轮次构造压缩元数据中的 runningTurnSends（opener、已送达的消息 uuid 列表）。
 */
function buildRunningTurnRecord(
  e,
  n,
  { primaryIsMeta: r = false, resultsAlsoList: s = [], standIn: h, wasPutBack: y } = {},
) {
  let S = [];
  let R = [];
  let w = (Z) => y !== undefined && R.includes(Z) && y(Z);
  let P = new Set();
  let L = e === undefined || r;
  let q = (Z) => {
    if (Z === "" || S.includes(Z)) return;
    if (S.length < MAX_HELD_MESSAGES) S.push(Z);
    else if (L) S[MAX_HELD_MESSAGES - 1] = Z;
  };
  for (let Z of n ?? []) q(Z);
  if (e !== undefined) {
    if (!S.includes(e))
      if (S.length >= MAX_HELD_MESSAGES) S[MAX_HELD_MESSAGES - 1] = e;
      else S.push(e);
  }
  let x = () => {
    let filtered = S.filter((ce) => !w(ce));
    let last = filtered.at(-1);
    if (last === undefined) return;
    let last_2 = R.findLast((ce) => filtered.includes(ce));
    return {
      user_message_uuid:
        e !== undefined && !(r && last_2 !== undefined)
          ? e
          : (last_2 ?? (h !== undefined && S.includes(h) ? h : last)),
      user_message_uuids: filtered,
    };
  };
  let G = () => {
    let Z = x();
    try {
      let filtered = s.filter((Ue) => !S.includes(Ue));
      let last = filtered.at(-1);
      if (last === undefined) return Z;
      return {
        user_message_uuid: Z?.user_message_uuid ?? last,
        user_message_uuids: [
          ...filtered,
          ...(Z?.user_message_uuids ?? []).slice(-(MAX_HELD_MESSAGES - filtered.length)),
        ],
      };
    } catch (error) {
      logError(error);
      return Z;
    }
  };
  return {
    fields: x,
    resultFields: G,
    errorVariantFields: () =>
      G() ?? {
        user_message_uuid: undefined,
        ...(R.some(w) && {
          user_message_uuids: [],
        }),
      },
    noteAttachment: (Z) => {
      if (
        Z.type === "queued_command" &&
        Z.commandMode === "prompt" &&
        Z.isMeta !== true &&
        Z.source_uuid !== undefined &&
        P.size < MAX_HELD_MESSAGES
      )
        P.add(Z.source_uuid);
    },
    noteCommandStarted: (Z) => {
      if (P.delete(Z)) {
        q(Z);
        if (S.includes(Z)) R.push(Z);
        return true;
      }
      return false;
    },
  };
}
//@ chunk-tyg7f3ek.js:40494-40504 placement
var MAX_RUNNING_ROW_ID_CHARS = 64;
//@ chunk-tyg7f3ek.js:40504-40910 placement
function createRunningTurnTracker(e) {
  let n = [];
  let r;
  let s = [];
  let boundaryOfThisTurn;
  let y = false;
  let S = (R) => {
    if (y) return;
    try {
      y = R() === false;
    } catch (error) {
      y = true;
      logError(error);
      try {
        logFeatureBad("compact_running_turn_record", "tracker_threw");
      } catch (error) {
        logError(error);
      }
    }
  };
  return {
    onAssistantRow: (entries) =>
      S(() => {
        if (countUserPromptsFromEntries_2(entries)) {
          n = e();
          r = entries.uuid;
        }
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
          boundaryOfThisTurn,
        });
        boundaryOfThisTurn = R;
        return P;
      }),
  };
}
//@ chunk-tyg7f3ek.js:40910-41059 placement = countUserPromptsFromEntries (0.769)
function countUserPromptsFromEntries_2(entries) {
  return (
    entries.type === "assistant" &&
    !("isSidechain" in entries && entries.isSidechain === true) &&
    !entries.isApiErrorMessage &&
    entries.isVirtual !== true &&
    entries.message.model !== SYNTHETIC_MODEL
  );
}
//@ chunk-tyg7f3ek.js:41059-42197 placement
function reconcileRunningTurnRecord(e, { boundaryOfThisTurn, continuedTurnsRows, conversation, ...h }) {
  try {
    let lower = h.openerUuid?.toLowerCase();
    let S =
      continuedTurnsRows?.findLastIndex(
        (Z) => typeof Z.uuid === "string" && Z.uuid.toLowerCase() === lower,
      ) ?? -1;
    let R = S === -1 ? [] : (continuedTurnsRows?.slice(S + 1) ?? []);
    let w =
      boundaryOfThisTurn ?? (continuedTurnsRows && findRunningTurnBoundary(h.openerUuid, continuedTurnsRows));
    let uuids =
      getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) === "on"
        ? w?.compactMetadata?.preservedMessages?.uuids
        : undefined;
    let L = new Set(Array.isArray(uuids) ? uuids.map((uuid) => String(uuid).toLowerCase()) : []);
    let lastIndex = conversation.findLastIndex((Z) => Z.uuid === w?.uuid);
    let x =
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
          );
    let G = mergeRunningTurnSends({
      ...h,
      keptAtTheLastBoundary: [...x.map((Z) => Z.uuid), ...heldUuidsIfEnabled(x)],
      takenInAtLastReply:
        h.openerUuid !== undefined &&
        R.some(countUserPromptsFromEntries_2) &&
        !R.some(isCompactBoundaryMessage)
          ? [...h.takenInAtLastReply, h.openerUuid]
          : h.takenInAtLastReply,
      earlierBoundary: w,
    });
    if (G === "too_many_unanswered") {
      logFeatureSad("compact_running_turn_record", "too_many_unanswered");
      return false;
    }
    logFeatureOk("compact_running_turn_record", {
      recorded: G !== undefined,
    });
    if (G !== undefined) e.compactMetadata.runningTurnSends = G;
    return true;
  } catch (error) {
    logError(error);
    try {
      logFeatureBad("compact_running_turn_record", "threw");
    } catch (error) {
      logError(error);
    }
    return false;
  }
}
//@ chunk-tyg7f3ek.js:42197-42463 placement
function findRunningTurnBoundary(e, n) {
  let lastIndex = n.findLastIndex(isCompactBoundaryMessage);
  let s = n[lastIndex];
  if (s === undefined || !isCompactBoundaryMessage(s)) return;
  let openerUuid = s.compactMetadata?.runningTurnSends?.openerUuid;
  return (
    e !== undefined
      ? typeof openerUuid === "string" && openerUuid.toLowerCase() === e.toLowerCase()
      : !n.slice(lastIndex + 1).some((y) => y.type === "user" && !isNonPromptUserRow(y))
  )
    ? s
    : undefined;
}
//@ chunk-tyg7f3ek.js:42463-43363 placement
function mergeRunningTurnSends({
  takenIn,
  takenInAtLastReply,
  keptAtTheLastBoundary,
  openerUuid,
  earlierBoundary,
}) {
  let compactMetadata = earlierBoundary?.compactMetadata;
  let S =
    typeof compactMetadata === "object" && compactMetadata !== null
      ? Reflect.get(compactMetadata, "runningTurnSends")
      : undefined;
  let R = (ce) => (typeof S === "object" && S !== null ? Reflect.get(S, ce) : undefined);
  let w = (ce) => {
    let nt = R(ce);
    return Array.isArray(nt) ? nt.slice(0, MAX_HELD_MESSAGES) : [];
  };
  let P = (ce) => (typeof ce === "string" ? ce.toLowerCase() : ce);
  let L = (ce, nt) => ce.some((ie) => P(ie) === P(nt));
  let q = (ce) =>
    Ji(
      ce.filter((nt) => typeof nt === "string" && nt !== "" && nt.length <= MAX_RUNNING_ROW_ID_CHARS),
      P,
    );
  let x = w("summarisedOnly");
  let filtered = x.filter(
    (ce) => !(L(keptAtTheLastBoundary, ce) && L(takenIn, ce) && L(takenInAtLastReply, ce)),
  );
  let Z = [
    ...w("uuids").filter((ce) => !L(filtered, ce)),
    ...takenIn.filter((ce) => L(takenInAtLastReply, ce) && !L(filtered, ce)),
  ];
  let sliced = q(Z).slice(0, MAX_HELD_MESSAGES);
  let Ae = q([...x, ...takenIn].filter((ce) => !L(Z, ce)));
  if (Ae.length > MAX_HELD_MESSAGES) return "too_many_unanswered";
  if (sliced.length === 0 && Ae.length === 0) return;
  let [Ue] = q([openerUuid, R("openerUuid")]);
  return {
    uuids: sliced,
    ...(Ue !== undefined && {
      openerUuid: Ue,
    }),
    ...(Ae.length > 0 && {
      summarisedOnly: Ae,
    }),
  };
}
//@ chunk-tyg7f3ek.js:43363-43374 placement
var COMPACTION_FRESHNESS_MS = 1e4;
//@ chunk-tyg7f3ek.js:43374-43462 placement
function lowercaseUuidSet(uuids) {
  return new Set(uuids.flatMap((n) => (typeof n === "string" ? [n.toLowerCase()] : [])));
}
//@ chunk-tyg7f3ek.js:43462-44099 placement
function compactionPreservedRows(e, turnInterruption, r = e) {
  let s;
  let ranInsideTheCutOffTurn = false;
  let keptRowsNotLoaded = false;
  try {
    s = e.findLast(isCompactBoundaryMessage);
    let uuids = Object(Object(s?.compactMetadata).preservedMessages).uuids;
    let P = lowercaseUuidSet(Array.isArray(uuids) ? uuids : []);
    if (P.size > 0) {
      let L = lowercaseUuidSet(r.map((q) => q.uuid));
      keptRowsNotLoaded = !(L.has(String(s?.uuid).toLowerCase()) && [...P].some((q) => L.has(q)));
    }
    ranInsideTheCutOffTurn =
      findRunningTurnBoundary(undefined, e) !== undefined &&
      findRunningTurnBoundary(turnInterruption, e) !== undefined;
  } catch (error) {
    logError(error);
    return;
  }
  if (s === undefined) return;
  let timestamp = Date.parse(String(s.timestamp));
  let R = Object(Object(s.compactMetadata).runningTurnSends);
  return {
    listed: Array.isArray(R.uuids) ? lowercaseUuidSet(R.uuids) : undefined,
    takenInSince: lowercaseUuidSet(Array.isArray(R.summarisedOnly) ? R.summarisedOnly : []),
    atMs: timestamp <= Date.now() ? timestamp : undefined,
    ranInsideTheCutOffTurn,
    keptRowsNotLoaded,
  };
}
//@ chunk-tyg7f3ek.js:44099-44453 placement
function isRowFromLoadedCompaction({ uuid, conversation, loadedCompaction }) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    (loadedCompaction?.listed?.has(uuid.toLowerCase()) === true ||
      loadedCompaction?.takenInSince.has(uuid.toLowerCase()) === true) &&
    loadedCompaction.atMs !== undefined &&
    Date.now() - loadedCompaction.atMs < MAX_RESUME_TAIL_AGE_MS &&
    !isResumeTooOld(conversation.filter((s) => !isSyntheticApiErrorMessage(s))) &&
    isFoamySpringEnabled() &&
    conversation
      .slice(conversation.findLastIndex(isCompactBoundaryMessage) + 1)
      .every((s) =>
        s.type === "assistant"
          ? isSyntheticApiErrorMessage(s)
          : s.type !== "user" || s.isCompactSummary === true,
      )
  );
}
//@ chunk-tyg7f3ek.js:44453-44581 placement
function cutOffTurnFlagFor({ uuid, loadedCompaction, carriesTheCutOffTurnOn }) {
  return carriesTheCutOffTurnOn && loadedCompaction?.listed?.has(uuid.toLowerCase()) === true
    ? getRemoteFeatureGateState(TENGU_TWINKLY_CLOVER)
    : undefined;
}
//@ chunk-tyg7f3ek.js:44581-44736 placement
function turnStartedBeforeCompaction({ startedAtMs, loadedCompaction, carriesTheCutOffTurnOn }) {
  return (
    carriesTheCutOffTurnOn &&
    loadedCompaction !== undefined &&
    loadedCompaction.listed === undefined &&
    loadedCompaction.atMs !== undefined &&
    startedAtMs !== undefined &&
    startedAtMs + COMPACTION_FRESHNESS_MS < loadedCompaction.atMs
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
  uuid,
  loadedCompaction,
  carriesTheCutOffTurnOn,
  finishedTail,
  growthBookCold,
}) {
  if (loadedCompaction === undefined) return {};
  if (loadedCompaction.listed === undefined)
    return {
      ended_turn_copy_no_record: true,
    };
  if (!loadedCompaction.listed.has(uuid.toLowerCase()))
    return {
      ended_turn_copy_not_in_record: true,
    };
  let y =
    finishedTail !== undefined &&
    (TERMINAL_TURN_OUTCOMES.has(finishedTail.because) ||
      (finishedTail.because === "not_continued_api_error_too_old" &&
        finishedTail.rateLimitRowSteppedOver === true));
  let S = {
    ...(carriesTheCutOffTurnOn && {
      ended_turn_copy_turn_carried_on: true,
    }),
    ...(loadedCompaction.keptRowsNotLoaded && {
      ended_turn_copy_kept_rows_not_loaded: true,
    }),
    ...(finishedTail !== undefined &&
      !loadedCompaction.ranInsideTheCutOffTurn && {
        ended_turn_copy_user_row_after_boundary: true,
      }),
    ...(!y && {
      ended_turn_copy_last_turn_not_ended: true,
    }),
    ...(finishedTail !== undefined &&
      finishedTail.callsWithoutResult > 0 && {
        ended_turn_copy_tool_calls_without_result: true,
      }),
  };
  return {
    ...(Object.keys(S).length === 0
      ? {
          ended_turn_copy_would_skip: true,
        }
      : S),
    ...(growthBookCold && {
      ended_turn_copy_growthbook_cold: true,
    }),
    ...(finishedTail !== undefined && {
      ...(finishedTail.lastPromptUuid !== undefined && {
        ended_turn_copy_sent_prompt_loaded: true,
      }),
      ended_turn_copy_finished_because: finishedTail.because,
      ended_turn_copy_last_reply_stop_reason: finishedTail.lastReplyStopReason,
      ended_turn_copy_stored_tail_row: finishedTail.tailRows[0],
    }),
  };
}
//@ chunk-tyg7f3ek.js:45970-46684 placement
function classifyRedeliveredRow(e, n) {
  let r = n.carriesTheCutOffTurnOn();
  if (n.loadedCompaction?.ranInsideTheCutOffTurn === false) {
    if (
      cutOffTurnFlagFor({
        uuid: e,
        loadedCompaction: n.loadedCompaction,
        carriesTheCutOffTurnOn: r,
      }) !== "on" ||
      !n.anInheritedPromptWaits()
    )
      return;
    n.noteCopyAwaitsTheCutOffTurn();
    return {
      whileStillOwed: n.cutOffTurnIsStillOwed,
    };
  }
  let { loadedCompaction } = n;
  let h = cutOffTurnFlagFor({
    uuid: e,
    loadedCompaction,
    carriesTheCutOffTurnOn: r,
  });
  if (h === undefined) {
    if (r && loadedCompaction?.takenInSince.has(e.toLowerCase())) return "taken_in_since";
    return turnStartedBeforeCompaction({
      startedAtMs: n.startedAtMs(e),
      loadedCompaction,
      carriesTheCutOffTurnOn: r,
    })
      ? "unlisted"
      : undefined;
  }
  if (loadedCompaction?.keptRowsNotLoaded === true) return "kept_rows_not_loaded";
  if (h !== "on") return h;
  n.noteCopyAwaitsTheCutOffTurn();
  return n.cutOffTurnIsStillOwed;
}
//@ chunk-tyg7f3ek.js:46684-46774 placement
function isNonUserRow(e) {
  return (
    ("isCompactSummary" in e && e.isCompactSummary === true) ||
    isInterruptionOnlyMessage(e) ||
    isToolResultMessage(e) ||
    isHarnessMetaMessage(e)
  );
}
//@ chunk-tyg7f3ek.js:46774-46879 placement
function isSyntheticUserMessage(e) {
  return (
    e.type === "user" &&
    e.promptSource === undefined &&
    !isNonUserRow(e) &&
    (e.isMeta === true || localCommandTagKindOf(e) !== undefined)
  );
}
//@ chunk-tyg7f3ek.js:46879-47303 placement
function isOpenerUnanswered(e, n) {
  let messageIndex = findMessageIndex(e, n);
  let s = e[messageIndex];
  if (s === undefined || s.uuid === n) return isTurnUnanswered(e, n);
  let filtered = e.filter(
    (S, R) =>
      R > messageIndex &&
      (S.type === "user" || S.type === "assistant") &&
      !("isSidechain" in S && S.isSidechain === true) &&
      !isSyntheticApiErrorMessage(S) &&
      !isSyntheticUserMessage(S),
  );
  let y = (S) => S.type === "user" && S.interruptedByShutdown !== true && isInterruptionOnlyMessage(S);
  if (
    !filtered.some((S) => S.type === "assistant") &&
    !(s.type === "attachment"
      ? filtered.length > 0 && y(filtered.at(-1)) && filtered.some((S) => !isNonUserRow(S))
      : filtered.some(y))
  )
    return true;
  return isTurnUnanswered([s, ...filtered], s.uuid);
}
//@ chunk-tyg7f3ek.js:47303-47443 placement
function makeHeldMessageMatcher(e, n, getSessionId) {
  let s = new Set();
  try {
    s = heldMessageUuidSet(e);
  } catch (error) {
    logError(error);
  }
  let h = getSessionId();
  return (y) =>
    isHeldMessageRecognitionOn() &&
    ((getSessionId() === h && s.has(y)) || n().some((S) => heldMessageUuids(S).includes(y)));
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
