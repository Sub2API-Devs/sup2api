/**
 * cli/print/runningTurnRecord.ts
 *
 * 2.1.316 新增：运行中回合记录的构建、对账与压缩保留行
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (20)
 * attribution: placement 20
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import {
  SYNTHETIC_MODEL,
  isNoResponseRequestedMessage,
  isInterruptionOnlyMessage,
  isToolResultMessage,
  isHarnessMetaMessage,
} from "../../utils/messages.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import {
  TENGU_CHEEKY_TOUCAN,
  TENGU_TWINKLY_CLOVER,
  TENGU_SHINY_HAMMING,
} from "../../services/api/withRetry.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { isNonPromptUserRow } from "../../utils/transcript/deserialize.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { env } from "../../utils/env.js";
import { MAX_RESUME_TAIL_AGE_MS, isResumeTooOld } from "../../utils/conversationRecovery.js";
import { isFoamySpringEnabled } from "../../services/analytics/growthbookGates.js";
import { localCommandTagKindOf } from "../../utils/messages/localCommandTags.js";
import { isTurnUnanswered } from "../../utils/sessionStorage.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0yw3taqg.js:57852-59082 placement
/**
 * 为正在运行的轮次构造压缩元数据中的 runningTurnSends（opener、已送达的消息 uuid 列表）。
 */
function buildRunningTurnRecord(
  primaryUuid,
  extraUuids,
  { primaryIsMeta = false, resultsAlsoList: resultsList = [], standIn, wasPutBack } = {},
) {
  let held = [];
  let started = [];
  let wasNoted = (uuid) => wasPutBack !== undefined && started.includes(uuid) && wasPutBack(uuid);
  let noted = new Set();
  let primaryIsMetaOrUndefined = primaryUuid === undefined || primaryIsMeta;
  let remember = (uuid) => {
    if (uuid === "" || held.includes(uuid)) return;
    if (held.length < MAX_HELD_MESSAGES) held.push(uuid);
    else if (primaryIsMetaOrUndefined) held[MAX_HELD_MESSAGES - 1] = uuid;
  };
  for (let uuid of extraUuids ?? []) remember(uuid);
  if (primaryUuid !== undefined) {
    if (!held.includes(primaryUuid))
      if (held.length >= MAX_HELD_MESSAGES) held[MAX_HELD_MESSAGES - 1] = primaryUuid;
      else held.push(primaryUuid);
  }
  let note = () => {
    let filtered = held.filter((uuid) => !wasNoted(uuid));
    let last = filtered.at(-1);
    if (last === undefined) return;
    let last_2 = started.findLast((uuid) => filtered.includes(uuid));
    return {
      user_message_uuid:
        primaryUuid !== undefined && !(primaryIsMeta && last_2 !== undefined)
          ? primaryUuid
          : (last_2 ?? (standIn !== undefined && held.includes(standIn) ? standIn : last)),
      user_message_uuids: filtered,
    };
  };
  let noteOnce = () => {
    let noteResult = note();
    try {
      let filtered = resultsList.filter((uuid) => !held.includes(uuid));
      let last = filtered.at(-1);
      if (last === undefined) return noteResult;
      return {
        user_message_uuid: noteResult?.user_message_uuid ?? last,
        user_message_uuids: [
          ...filtered,
          ...(noteResult?.user_message_uuids ?? []).slice(-(MAX_HELD_MESSAGES - filtered.length)),
        ],
      };
    } catch (error) {
      logError(error);
      return noteResult;
    }
  };
  return {
    fields: note,
    resultFields: noteOnce,
    errorVariantFields: () =>
      noteOnce() ?? {
        user_message_uuid: undefined,
        ...(started.some(wasNoted) && {
          user_message_uuids: [],
        }),
      },
    noteAttachment: (attachment) => {
      if (
        attachment.type === "queued_command" &&
        attachment.commandMode === "prompt" &&
        attachment.isMeta !== true &&
        attachment.source_uuid !== undefined &&
        noted.size < MAX_HELD_MESSAGES
      )
        noted.add(attachment.source_uuid);
    },
    noteCommandStarted: (uuid) => {
      if (noted.delete(uuid)) {
        remember(uuid);
        if (held.includes(uuid)) started.push(uuid);
        return true;
      }
      return false;
    },
  };
}
//@ chunk-0yw3taqg.js:59082-59092 placement
var MAX_RUNNING_ROW_ID_CHARS = 64;
//@ chunk-0yw3taqg.js:59092-59498 placement
function createRunningTurnTracker(readTakenIn) {
  let takenIn = [];
  let lastReplyUuid;
  let previousTakenIn = [];
  let boundaryOfThisTurn;
  let stopped = false;
  let guard = (fn) => {
    if (stopped) return;
    try {
      stopped = fn() === false;
    } catch (error) {
      stopped = true;
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
      guard(() => {
        if (countUserPromptsFromEntries_2(entries)) {
          takenIn = readTakenIn();
          lastReplyUuid = entries.uuid;
        }
      }),
    onRoundStart: () =>
      guard(() => {
        previousTakenIn = takenIn;
      }),
    onRetraction: (uuid) =>
      guard(() => {
        if (uuid === lastReplyUuid) takenIn = previousTakenIn;
      }),
    onBoundary: (boundary, options) =>
      guard(() => {
        let ok = reconcileRunningTurnRecord(boundary, {
          ...options,
          takenIn: readTakenIn(),
          takenInAtLastReply: takenIn,
          boundaryOfThisTurn,
        });
        boundaryOfThisTurn = boundary;
        return ok;
      }),
  };
}
//@ chunk-0yw3taqg.js:59498-59647 placement (2.1.88 match: countUserPromptsFromEntries, 0.774)
function countUserPromptsFromEntries_2(entries) {
  return (
    entries.type === "assistant" &&
    !("isSidechain" in entries && entries.isSidechain === true) &&
    !entries.isApiErrorMessage &&
    entries.isVirtual !== true &&
    entries.message.model !== SYNTHETIC_MODEL
  );
}
//@ chunk-0yw3taqg.js:59647-60800 placement
function reconcileRunningTurnRecord(
  boundary,
  { boundaryOfThisTurn, continuedTurnsRows, conversation, ...options },
) {
  try {
    let lower = options.openerUuid?.toLowerCase();
    let openerIndex =
      continuedTurnsRows?.findLastIndex(
        (row) => typeof row.uuid === "string" && row.uuid.toLowerCase() === lower,
      ) ?? -1;
    let rowsAfterOpener = openerIndex === -1 ? [] : (continuedTurnsRows?.slice(openerIndex + 1) ?? []);
    let earlierBoundary =
      boundaryOfThisTurn ??
      (continuedTurnsRows && findRunningTurnBoundary(options.openerUuid, continuedTurnsRows));
    let uuids =
      getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) === "on"
        ? earlierBoundary?.compactMetadata?.preservedMessages?.uuids
        : undefined;
    let preservedUuidSet = new Set(
      Array.isArray(uuids) ? uuids.map((uuid) => String(uuid).toLowerCase()) : [],
    );
    let lastIndex = conversation.findLastIndex((row) => row.uuid === earlierBoundary?.uuid);
    let noteValue =
      preservedUuidSet.size === 0 || lastIndex === -1
        ? []
        : conversation.filter(
            (row, index) =>
              index > lastIndex &&
              typeof row.uuid === "string" &&
              preservedUuidSet.has(row.uuid.toLowerCase()) &&
              !(
                row.type === "attachment" &&
                row.attachment?.type === "queued_command" &&
                row.attachment.renderedByBatchHead
              ),
          );
    let merged = mergeRunningTurnSends({
      ...options,
      keptAtTheLastBoundary: [...noteValue.map((row) => row.uuid), ...heldUuidsIfEnabled(noteValue)],
      takenInAtLastReply:
        options.openerUuid !== undefined &&
        rowsAfterOpener.some(countUserPromptsFromEntries_2) &&
        !rowsAfterOpener.some(isCompactBoundaryMessage)
          ? [...options.takenInAtLastReply, options.openerUuid]
          : options.takenInAtLastReply,
      earlierBoundary,
    });
    if (merged === "too_many_unanswered") {
      logFeatureSad("compact_running_turn_record", "too_many_unanswered");
      return false;
    }
    logFeatureOk("compact_running_turn_record", {
      recorded: merged !== undefined,
    });
    if (merged !== undefined) boundary.compactMetadata.runningTurnSends = merged;
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
//@ chunk-0yw3taqg.js:60800-61094 placement
function findRunningTurnBoundary(openerUuid, rows) {
  let lastIndex = rows.findLastIndex(isCompactBoundaryMessage);
  let boundary = rows[lastIndex];
  if (boundary === undefined || !isCompactBoundaryMessage(boundary)) return;
  let openerUuid_2 = boundary.compactMetadata?.runningTurnSends?.openerUuid;
  return (
    openerUuid !== undefined
      ? typeof openerUuid_2 === "string" && openerUuid_2.toLowerCase() === openerUuid.toLowerCase()
      : !rows
          .slice(lastIndex + 1)
          .some((row) => row.type === "user" && row.queueTranscriptOnly !== true && !isNonPromptUserRow(row))
  )
    ? boundary
    : undefined;
}
//@ chunk-0yw3taqg.js:61094-61997 placement
function mergeRunningTurnSends({
  takenIn,
  takenInAtLastReply,
  keptAtTheLastBoundary,
  openerUuid,
  earlierBoundary,
}) {
  let compactMetadata = earlierBoundary?.compactMetadata;
  let metadata =
    typeof compactMetadata === "object" && compactMetadata !== null
      ? Reflect.get(compactMetadata, "runningTurnSends")
      : undefined;
  let get = (key) =>
    typeof metadata === "object" && metadata !== null ? Reflect.get(metadata, key) : undefined;
  let list = (key) => {
    let value = get(key);
    return Array.isArray(value) ? value.slice(0, MAX_HELD_MESSAGES) : [];
  };
  let lower = (uuid) => (typeof uuid === "string" ? uuid.toLowerCase() : uuid);
  let has = (uuids, uuid) => uuids.some((rowUuid) => lower(rowUuid) === lower(uuid));
  let normalize = (uuids) =>
    uniqByExport(
      uuids.filter(
        (uuid) => typeof uuid === "string" && uuid !== "" && uuid.length <= MAX_RUNNING_ROW_ID_CHARS,
      ),
      lower,
    );
  let summarisedOnly = list("summarisedOnly");
  let filtered = summarisedOnly.filter(
    (uuid) => !(has(keptAtTheLastBoundary, uuid) && has(takenIn, uuid) && has(takenInAtLastReply, uuid)),
  );
  let uuids = [
    ...list("uuids").filter((uuid) => !has(filtered, uuid)),
    ...takenIn.filter((uuid) => has(takenInAtLastReply, uuid) && !has(filtered, uuid)),
  ];
  let sliced = normalize(uuids).slice(0, MAX_HELD_MESSAGES);
  let summarisedUuids = normalize([...summarisedOnly, ...takenIn].filter((uuid) => !has(uuids, uuid)));
  if (summarisedUuids.length > MAX_HELD_MESSAGES) return "too_many_unanswered";
  if (sliced.length === 0 && summarisedUuids.length === 0) return;
  let [mergedOpenerUuid] = normalize([openerUuid, get("openerUuid")]);
  return {
    uuids: sliced,
    ...(mergedOpenerUuid !== undefined && {
      openerUuid: mergedOpenerUuid,
    }),
    ...(summarisedUuids.length > 0 && {
      summarisedOnly: summarisedUuids,
    }),
  };
}
//@ chunk-0yw3taqg.js:61997-62008 placement
var COMPACTION_FRESHNESS_MS = 1e4;
//@ chunk-0yw3taqg.js:62008-62096 placement
function lowercaseUuidSet(uuids) {
  return new Set(uuids.flatMap((uuid) => (typeof uuid === "string" ? [uuid.toLowerCase()] : [])));
}
//@ chunk-0yw3taqg.js:62096-62891 placement
function compactionPreservedRows(messages, runningTurnBoundaryId, loadedRows = messages) {
  let boundary;
  let ranInsideTheCutOffTurn = false;
  let keptRowsNotLoaded = false;
  let openedBehindIt = false;
  try {
    boundary = messages.findLast(isCompactBoundaryMessage);
    let uuids = Object(Object(boundary?.compactMetadata).preservedMessages).uuids;
    let preservedUuids = lowercaseUuidSet(Array.isArray(uuids) ? uuids : []);
    if (preservedUuids.size > 0) {
      let loadedUuids = lowercaseUuidSet(loadedRows.map((row) => row.uuid));
      keptRowsNotLoaded = !(
        loadedUuids.has(String(boundary?.uuid).toLowerCase()) &&
        [...preservedUuids].some((uuid) => loadedUuids.has(uuid))
      );
    }
    let turnMovedOn =
      runningTurnBoundaryId !== undefined &&
      findRunningTurnBoundary(runningTurnBoundaryId, messages) === undefined;
    ranInsideTheCutOffTurn = findRunningTurnBoundary(undefined, messages) !== undefined && !turnMovedOn;
    openedBehindIt =
      turnMovedOn ||
      messages
        .slice(messages.findLastIndex(isCompactBoundaryMessage) + 1)
        .some(
          (message) =>
            message.type === "user" &&
            message.isMeta !== true &&
            message.queueTranscriptOnly !== true &&
            !isNonPromptUserRow(message),
        );
  } catch (error) {
    logError(error);
    return;
  }
  if (boundary === undefined) return;
  let timestamp = Date.parse(String(boundary.timestamp));
  let runningTurnSends = Object(Object(boundary.compactMetadata).runningTurnSends);
  return {
    listed: Array.isArray(runningTurnSends.uuids) ? lowercaseUuidSet(runningTurnSends.uuids) : undefined,
    takenInSince: lowercaseUuidSet(
      Array.isArray(runningTurnSends.summarisedOnly) ? runningTurnSends.summarisedOnly : [],
    ),
    atMs: timestamp <= Date.now() ? timestamp : undefined,
    ranInsideTheCutOffTurn,
    keptRowsNotLoaded,
    openedBehindIt,
  };
}
//@ chunk-0yw3taqg.js:62891-63245 placement
function isRowFromLoadedCompaction({ uuid, conversation, loadedCompaction }) {
  return (
    env.CLAUDE_CODE_REMOTE &&
    (loadedCompaction?.listed?.has(uuid.toLowerCase()) === true ||
      loadedCompaction?.takenInSince.has(uuid.toLowerCase()) === true) &&
    loadedCompaction.atMs !== undefined &&
    Date.now() - loadedCompaction.atMs < MAX_RESUME_TAIL_AGE_MS &&
    !isResumeTooOld(conversation.filter((row) => !isNoResponseRequestedMessage(row))) &&
    isFoamySpringEnabled() &&
    conversation
      .slice(conversation.findLastIndex(isCompactBoundaryMessage) + 1)
      .every((row) =>
        row.type === "assistant"
          ? isNoResponseRequestedMessage(row)
          : row.type !== "user" || row.isCompactSummary === true,
      )
  );
}
//@ chunk-0yw3taqg.js:63245-63373 placement
function cutOffTurnFlagFor({ uuid, loadedCompaction, carriesTheCutOffTurnOn }) {
  return carriesTheCutOffTurnOn && loadedCompaction?.listed?.has(uuid.toLowerCase()) === true
    ? getRemoteFeatureGateState(TENGU_TWINKLY_CLOVER)
    : undefined;
}
//@ chunk-0yw3taqg.js:63373-63528 placement
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
//@ chunk-0yw3taqg.js:63528-63706 placement
var TERMINAL_TURN_OUTCOMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0yw3taqg.js:63528", () => {
  TERMINAL_TURN_OUTCOMES = new Set([
    "reply",
    "reply_then_reminder",
    "stop_marker",
    "terminal_api_error",
    "terminal_tool_result",
    "silent_reply_after_terminal_tool",
    "deliberate_stop_result",
    "max_turns",
  ]);
});
//@ chunk-0yw3taqg.js:63706-64762 placement
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
  let turnEnded =
    finishedTail !== undefined &&
    (TERMINAL_TURN_OUTCOMES.has(finishedTail.because) ||
      (finishedTail.because === "not_continued_api_error_too_old" &&
        finishedTail.rateLimitRowSteppedOver === true));
  let skipFields = {
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
    ...(!turnEnded && {
      ended_turn_copy_last_turn_not_ended: true,
    }),
    ...(finishedTail !== undefined &&
      finishedTail.callsWithoutResult > 0 && {
        ended_turn_copy_tool_calls_without_result: true,
      }),
  };
  return {
    ...(Object.keys(skipFields).length === 0
      ? {
          ended_turn_copy_would_skip: true,
        }
      : skipFields),
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
//@ chunk-0yw3taqg.js:64762-65596 placement
function classifyRedeliveredRow(uuid, copy) {
  let carriedOn = copy.carriesTheCutOffTurnOn();
  if (copy.loadedCompaction?.ranInsideTheCutOffTurn === false) {
    if (
      cutOffTurnFlagFor({
        uuid,
        loadedCompaction: copy.loadedCompaction,
        carriesTheCutOffTurnOn: carriedOn,
      }) !== "on" ||
      !copy.anInheritedPromptWaits()
    )
      return;
    let mustWaitWhileOwed =
      copy.loadedCompaction.keptRowsNotLoaded ||
      copy.loadedCompaction.openedBehindIt ||
      getRemoteFeatureGateState(TENGU_SHINY_HAMMING) !== "on";
    copy.noteCopyAwaitsTheCutOffTurn();
    return mustWaitWhileOwed
      ? {
          whileStillOwed: copy.cutOffTurnIsStillOwed,
        }
      : copy.cutOffTurnIsStillOwed;
  }
  let { loadedCompaction } = copy;
  let flag = cutOffTurnFlagFor({
    uuid,
    loadedCompaction,
    carriesTheCutOffTurnOn: carriedOn,
  });
  if (flag === undefined) {
    if (carriedOn && loadedCompaction?.takenInSince.has(uuid.toLowerCase())) return "taken_in_since";
    return turnStartedBeforeCompaction({
      startedAtMs: copy.startedAtMs(uuid),
      loadedCompaction,
      carriesTheCutOffTurnOn: carriedOn,
    })
      ? "unlisted"
      : undefined;
  }
  if (loadedCompaction?.keptRowsNotLoaded === true) return "kept_rows_not_loaded";
  if (flag !== "on") return flag;
  copy.noteCopyAwaitsTheCutOffTurn();
  return copy.cutOffTurnIsStillOwed;
}
//@ chunk-0yw3taqg.js:65596-65686 placement
function isNonUserRow(row) {
  return (
    ("isCompactSummary" in row && row.isCompactSummary === true) ||
    isInterruptionOnlyMessage(row) ||
    isToolResultMessage(row) ||
    isHarnessMetaMessage(row)
  );
}
//@ chunk-0yw3taqg.js:65686-65791 placement
function isSyntheticUserMessage(row) {
  return (
    row.type === "user" &&
    row.promptSource === undefined &&
    !isNonUserRow(row) &&
    (row.isMeta === true || localCommandTagKindOf(row) !== undefined)
  );
}
//@ chunk-0yw3taqg.js:65791-66215 placement
function isOpenerUnanswered(messages, openerUuid) {
  let messageIndex = findMessageIndex(messages, openerUuid);
  let opener = messages[messageIndex];
  if (opener === undefined || opener.uuid === openerUuid) return isTurnUnanswered(messages, openerUuid);
  let filtered = messages.filter(
    (message, index) =>
      index > messageIndex &&
      (message.type === "user" || message.type === "assistant") &&
      !("isSidechain" in message && message.isSidechain === true) &&
      !isNoResponseRequestedMessage(message) &&
      !isSyntheticUserMessage(message),
  );
  let isInterruptionRow = (row) =>
    row.type === "user" && row.interruptedByShutdown !== true && isInterruptionOnlyMessage(row);
  if (
    !filtered.some((row) => row.type === "assistant") &&
    !(opener.type === "attachment"
      ? filtered.length > 0 &&
        isInterruptionRow(filtered.at(-1)) &&
        filtered.some((row) => !isNonUserRow(row))
      : filtered.some(isInterruptionRow))
  )
    return true;
  return isTurnUnanswered([opener, ...filtered], opener.uuid);
}
//@ chunk-0yw3taqg.js:66215-66355 placement
function makeHeldMessageMatcher(getTranscript, heldFrames, getSessionId) {
  let seen = new Set();
  try {
    seen = heldMessageUuidSet(getTranscript);
  } catch (error) {
    logError(error);
  }
  let sessionId = getSessionId();
  return (uuid) =>
    isHeldMessageRecognitionOn() &&
    ((getSessionId() === sessionId && seen.has(uuid)) ||
      heldFrames().some((frame) => heldMessageUuids(frame).includes(uuid)));
}
export {
  makeHeldMessageMatcher,
  compactionPreservedRows,
  classifyRedeliveredRow,
  isRowFromLoadedCompaction,
  compactionCopyTelemetry,
  isSyntheticUserMessage,
  findRunningTurnBoundary,
  lowercaseUuidSet,
  isOpenerUnanswered,
  buildRunningTurnRecord,
  createRunningTurnTracker,
};
