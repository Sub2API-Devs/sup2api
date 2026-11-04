/**
 * cli/print/transcriptChain.ts
 *
 * 2.1.316 新增：记录链上的回合答复判定与运行中回合行
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (15)
 * attribution: affinity 1, placement 14
 */
import { countUserPromptsFromEntries } from "../../utils/attribution.js";
import {
  isApiErrorWithoutRefusal,
  isMalformedToolUseExhausted,
} from "../../utils/transcript/turnClassification.js";
import {
  findMessageIndex,
  isHeldMessageRecognitionOn,
  mergedMessageUuids,
  heldUuidsIfEnabled,
} from "./queuedMessageUtils.js";
import {
  isSyntheticApiErrorMessage,
  isInterruptionOnlyMessage,
  isToolResultMessage,
  APPROVAL_EXPIRED_MESSAGE,
  APPROVAL_UNANSWERED_MESSAGE,
} from "../../utils/messages.js";
import {
  isStopInterruptionRow,
  findLastUserPromptUuid,
  isInterruptMarkerRow,
} from "../../utils/transcript/deserialize.js";
import { isSyntheticUserMessage, findRunningTurnBoundary, lowercaseUuidSet } from "./runningTurnRecord.js";
import { isHumanOrUnset } from "../../utils/messageProvenance.js";
import { getRemoteFeatureGateState } from "../../utils/permissions/yoloClassifier.js";
import { TENGU_CHEEKY_TOUCAN, TENGU_TWINKLY_CLOVER } from "../../services/api/withRetry.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { uniqByExport } from "../../../vendor/lodash-es/uniqBy.js";
import { logError } from "../../utils/log.js";

//@ chunk-tyg7f3ek.js:47530-47630 affinity
function isMetaPromptEntry(entries, index) {
  let entry = entries[index];
  return (
    entry.type === "user" &&
    entry.isMeta === true &&
    entry.promptSource === undefined &&
    countUserPromptsFromEntries(entries, index)
  );
}
//@ chunk-tyg7f3ek.js:47630-47691 placement
function isPartialAssistantRow(row) {
  return row.type === "assistant" && (isApiErrorWithoutRefusal(row) || isMalformedToolUseExhausted(row));
}
//@ chunk-tyg7f3ek.js:47691-47733 placement
function isUserPromptRowAtIndex(entries, index) {
  return countUserPromptsFromEntries(entries, index) && !isMetaPromptEntry(entries, index);
}
//@ chunk-tyg7f3ek.js:47733-47810 placement
function nextTurnStartIndex(entries, messageIndex) {
  return entries.findIndex(
    (entry, index) =>
      index > messageIndex &&
      entry.uuid !== entries[messageIndex].uuid &&
      isUserPromptRowAtIndex(entries, index),
  );
}
//@ chunk-tyg7f3ek.js:47810-47946 placement
function trimTrailingAfterTurn(entries, uuid, enabled) {
  let messageIndex = findMessageIndex(entries, uuid, enabled);
  if (messageIndex === -1) return entries;
  let turnStartIndex = nextTurnStartIndex(entries, messageIndex);
  return entries.filter(
    (entry, index) =>
      (turnStartIndex === -1 || index < turnStartIndex) &&
      (index <= messageIndex ||
        !(isMetaPromptEntry(entries, index) || isPartialAssistantRow(entries[index]))),
  );
}
//@ chunk-tyg7f3ek.js:47946-48019 placement
function isRealAssistantReply(row) {
  return row.type === "assistant" && !row.isApiErrorMessage && !isSyntheticApiErrorMessage(row);
}
//@ chunk-tyg7f3ek.js:48019-48248 placement
function isStopInterruption(rows, index) {
  let row = rows[index];
  let previous = rows[index - 1];
  return (
    row.type === "user" &&
    row.interruptedByShutdown !== true &&
    isInterruptionOnlyMessage(row) &&
    !isToolResultMessage(row) &&
    (row.retiredByStop ??
      !(
        previous?.type === "user" &&
        (previous.toolUseResult === APPROVAL_EXPIRED_MESSAGE ||
          previous.toolUseResult === APPROVAL_UNANSWERED_MESSAGE ||
          (previous.toolDenialEndsTurn === true && !isStopInterruptionRow(previous)))
      ))
  );
}
//@ chunk-tyg7f3ek.js:48248-48652 placement (2.1.88 match: countUserPromptsFromEntries, 0.786)
function countUserPromptsFromEntries_3(entries, uuid, enabled) {
  let messageIndex = findMessageIndex(entries, uuid, enabled);
  let entry = entries[messageIndex];
  if (entry === undefined || entry.uuid === uuid) return;
  let last = entries.findLast(
    (entry, index) => index <= messageIndex && isUserPromptRowAtIndex(entries, index),
  );
  let trimmed = trimTrailingAfterTurn(entries, uuid, enabled);
  let nonSidechain = trimmed
    .slice(trimmed.indexOf(entry) + 1)
    .filter(
      (entry) =>
        (entry.type === "user" || entry.type === "assistant") &&
        !("isSidechain" in entry && entry.isSidechain === true) &&
        !isSyntheticApiErrorMessage(entry) &&
        !isSyntheticUserMessage(entry),
    );
  let last_2 = nonSidechain.at(-1);
  return (
    last_2 !== undefined &&
    (isStopInterruption(nonSidechain, nonSidechain.length - 1) ||
      (last_2.type === "assistant" && last_2.isApiErrorMessage === true)) &&
    isTurnAnswered(entries, uuid, enabled) &&
    last !== undefined &&
    findLastUserPromptUuid([last]) !== undefined
  );
}
//@ chunk-tyg7f3ek.js:48652-48901 placement
function isTurnAnswered(entries, uuid, enabled) {
  let entry = entries[findMessageIndex(entries, uuid, enabled)];
  if (entry?.type !== "attachment") return entry !== undefined;
  let trimmed = trimTrailingAfterTurn(entries, uuid, enabled);
  let sliced = trimmed.slice(trimmed.indexOf(entry) + 1);
  let index = sliced.findIndex((row) => isSyntheticApiErrorMessage(row) || isInterruptMarkerRow(row));
  return (index === -1 ? sliced : sliced.slice(0, index)).some(
    (row) => isRealAssistantReply(row) && !("isSidechain" in row && row.isSidechain === true),
  );
}
//@ chunk-tyg7f3ek.js:48901-49334 placement
function isQueuedPromptAnswered(entries, uuid) {
  if (isTurnAnswered(entries, uuid)) return true;
  let entry = entries[findMessageIndex(entries, uuid)];
  return (
    entry?.type === "attachment" &&
    entry.attachment.type === "queued_command" &&
    entry.attachment.commandMode === "prompt" &&
    (typeof entry.attachment.prompt === "string" ||
      (Array.isArray(entry.attachment.prompt) &&
        entry.attachment.prompt.every((block) => block.type === "text"))) &&
    entry.attachment.isMeta !== true &&
    entry.attachment.verifiedSlackHumanTurn !== true &&
    isHumanOrUnset(entry.attachment.origin) &&
    !entry.attachment.fileAttachments?.length &&
    getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) === "on"
  );
}
//@ chunk-tyg7f3ek.js:49334-49393 placement
function isTurnOpen(entries, uuid) {
  let answered = countUserPromptsFromEntries_3(entries, uuid);
  return answered === undefined ? undefined : !answered;
}
//@ chunk-tyg7f3ek.js:49393-49610 placement
function rowsSinceTurnStart(entries, uuid) {
  let lastIndex = entries.findLastIndex((row) => row.uuid === uuid);
  let prefix = lastIndex === -1 ? entries : entries.slice(0, lastIndex + 1);
  let lastIndex_2 = prefix.findLastIndex((row, index) => isUserPromptRowAtIndex(entries, index));
  if (lastIndex_2 !== -1) return prefix.slice(lastIndex_2);
  let boundary = runningTurnRowsFromBoundary(entries);
  let index = boundary === undefined ? -1 : prefix.lastIndexOf(boundary);
  return index === -1 ? [] : prefix.slice(index);
}
//@ chunk-tyg7f3ek.js:49610-49963 placement
function runningTurnRowsFromBoundary(entries) {
  if (
    getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) !== "on" ||
    getRemoteFeatureGateState(TENGU_TWINKLY_CLOVER) !== "on" ||
    !isHeldMessageRecognitionOn()
  )
    return;
  let runningTurnBoundary = findRunningTurnBoundary(undefined, entries);
  let sends = Object(runningTurnBoundary?.compactMetadata?.runningTurnSends);
  let uuids = Object(runningTurnBoundary?.compactMetadata?.preservedMessages).uuids;
  let knownUuids = lowercaseUuidSet(entries.map((row) => row.uuid));
  return Array.isArray(sends.uuids) &&
    lowercaseUuidSet(sends.uuids).has(String(sends.openerUuid).toLowerCase()) &&
    [...lowercaseUuidSet(Array.isArray(uuids) ? uuids : [])].every((uuid) => knownUuids.has(uuid))
    ? runningTurnBoundary
    : undefined;
}
//@ chunk-tyg7f3ek.js:49963-50210 placement
function runningTurnSendsForTurn(entries, uuid, answered = new Set()) {
  try {
    let rows = rowsSinceTurnStart(entries, uuid);
    let boundary = rows[0];
    if (boundary === undefined || !isCompactBoundaryMessage(boundary)) return;
    return uniqByExport(
      [
        ...(boundary.compactMetadata.runningTurnSends?.uuids ?? []),
        ...mergedMessageUuids(rows, boundary.uuid).filter(
          (uuid) => uuid !== boundary.uuid && (answered.has(uuid) || isQueuedPromptAnswered(entries, uuid)),
        ),
      ],
      (uuid) => uuid.toLowerCase(),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:50210-50315 placement
function answeredHeldUuids(entries, uuid) {
  try {
    return new Set(
      [...heldUuidsIfEnabled(rowsSinceTurnStart(entries, uuid))].filter((uuid) =>
        isQueuedPromptAnswered(entries, uuid),
      ),
    );
  } catch (error) {
    logError(error);
    return new Set();
  }
}
export {
  rowsSinceTurnStart,
  isQueuedPromptAnswered,
  answeredHeldUuids,
  runningTurnSendsForTurn,
  trimTrailingAfterTurn,
  isTurnAnswered,
  nextTurnStartIndex,
  isStopInterruption,
  isPartialAssistantRow,
  isRealAssistantReply,
  isTurnOpen,
  countUserPromptsFromEntries_3,
};
