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
import { Ljr, Djr } from "../../utils/transcript/turnClassification.js";
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
import { Ji } from "../../../vendor/lodash-es/uniqBy.js";
import { logError } from "../../utils/log.js";

//@ chunk-tyg7f3ek.js:47530-47630 affinity
function isMetaPromptEntry(e, n) {
  let r = e[n];
  return (
    r.type === "user" && r.isMeta === !0 && r.promptSource === void 0 && countUserPromptsFromEntries(e, n)
  );
}
//@ chunk-tyg7f3ek.js:47630-47691 placement
function isPartialAssistantRow(e) {
  return e.type === "assistant" && (Ljr(e) || Djr(e));
}
//@ chunk-tyg7f3ek.js:47691-47733 placement
function Th(e, n) {
  return countUserPromptsFromEntries(e, n) && !isMetaPromptEntry(e, n);
}
//@ chunk-tyg7f3ek.js:47733-47810 placement
function nextTurnStartIndex(e, n) {
  return e.findIndex((r, s) => s > n && r.uuid !== e[n].uuid && Th(e, s));
}
//@ chunk-tyg7f3ek.js:47810-47946 placement
function trimTrailingAfterTurn(e, n, r) {
  let s = findMessageIndex(e, n, r);
  if (s === -1) return e;
  let h = nextTurnStartIndex(e, s);
  return e.filter(
    (y, S) => (h === -1 || S < h) && (S <= s || !(isMetaPromptEntry(e, S) || isPartialAssistantRow(e[S]))),
  );
}
//@ chunk-tyg7f3ek.js:47946-48019 placement
function isRealAssistantReply(e) {
  return e.type === "assistant" && !e.isApiErrorMessage && !isSyntheticApiErrorMessage(e);
}
//@ chunk-tyg7f3ek.js:48019-48248 placement
function isStopInterruption(e, n) {
  let r = e[n],
    s = e[n - 1];
  return (
    r.type === "user" &&
    r.interruptedByShutdown !== !0 &&
    isInterruptionOnlyMessage(r) &&
    !isToolResultMessage(r) &&
    (r.retiredByStop ??
      !(
        s?.type === "user" &&
        (s.toolUseResult === APPROVAL_EXPIRED_MESSAGE ||
          s.toolUseResult === APPROVAL_UNANSWERED_MESSAGE ||
          (s.toolDenialEndsTurn === !0 && !isStopInterruptionRow(s)))
      ))
  );
}
//@ chunk-tyg7f3ek.js:48248-48652 placement = countUserPromptsFromEntries (0.786)
function countUserPromptsFromEntries_3(e, n, r) {
  let s = findMessageIndex(e, n, r),
    h = e[s];
  if (h === void 0 || h.uuid === n) return;
  let last = e.findLast((P, L) => L <= s && Th(e, L)),
    S = trimTrailingAfterTurn(e, n, r),
    nonSidechain = S.slice(S.indexOf(h) + 1).filter(
      (entry) =>
        (entry.type === "user" || entry.type === "assistant") &&
        !("isSidechain" in entry && entry.isSidechain === !0) &&
        !isSyntheticApiErrorMessage(entry) &&
        !isSyntheticUserMessage(entry),
    ),
    at = nonSidechain.at(-1);
  return (
    at !== void 0 &&
    (isStopInterruption(nonSidechain, nonSidechain.length - 1) ||
      (at.type === "assistant" && at.isApiErrorMessage === !0)) &&
    isTurnAnswered(e, n, r) &&
    last !== void 0 &&
    findLastUserPromptUuid([last]) !== void 0
  );
}
//@ chunk-tyg7f3ek.js:48652-48901 placement
function isTurnAnswered(e, n, r) {
  let s = e[findMessageIndex(e, n, r)];
  if (s?.type !== "attachment") return s !== void 0;
  let h = trimTrailingAfterTurn(e, n, r),
    sliced = h.slice(h.indexOf(s) + 1),
    index = sliced.findIndex((R) => isSyntheticApiErrorMessage(R) || isInterruptMarkerRow(R));
  return (index === -1 ? sliced : sliced.slice(0, index)).some(
    (R) => isRealAssistantReply(R) && !("isSidechain" in R && R.isSidechain === !0),
  );
}
//@ chunk-tyg7f3ek.js:48901-49334 placement
function isQueuedPromptAnswered(e, n) {
  if (isTurnAnswered(e, n)) return !0;
  let r = e[findMessageIndex(e, n)];
  return (
    r?.type === "attachment" &&
    r.attachment.type === "queued_command" &&
    r.attachment.commandMode === "prompt" &&
    (typeof r.attachment.prompt === "string" ||
      (Array.isArray(r.attachment.prompt) && r.attachment.prompt.every((s) => s.type === "text"))) &&
    r.attachment.isMeta !== !0 &&
    r.attachment.verifiedSlackHumanTurn !== !0 &&
    isHumanOrUnset(r.attachment.origin) &&
    !r.attachment.fileAttachments?.length &&
    getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) === "on"
  );
}
//@ chunk-tyg7f3ek.js:49334-49393 placement
function isTurnOpen(e, n) {
  let r = countUserPromptsFromEntries_3(e, n);
  return r === void 0 ? void 0 : !r;
}
//@ chunk-tyg7f3ek.js:49393-49610 placement
function rowsSinceTurnStart(e, n) {
  let lastIndex = e.findLastIndex((R) => R.uuid === n),
    s = lastIndex === -1 ? e : e.slice(0, lastIndex + 1),
    lastIndex_2 = s.findLastIndex((R, w) => Th(e, w));
  if (lastIndex_2 !== -1) return s.slice(lastIndex_2);
  let y = runningTurnRowsFromBoundary(e),
    S = y === void 0 ? -1 : s.lastIndexOf(y);
  return S === -1 ? [] : s.slice(S);
}
//@ chunk-tyg7f3ek.js:49610-49963 placement
function runningTurnRowsFromBoundary(e) {
  if (
    getRemoteFeatureGateState(TENGU_CHEEKY_TOUCAN) !== "on" ||
    getRemoteFeatureGateState(TENGU_TWINKLY_CLOVER) !== "on" ||
    !isHeldMessageRecognitionOn()
  )
    return;
  let n = findRunningTurnBoundary(void 0, e),
    r = Object(n?.compactMetadata?.runningTurnSends),
    uuids = Object(n?.compactMetadata?.preservedMessages).uuids,
    h = lowercaseUuidSet(e.map((y) => y.uuid));
  return Array.isArray(r.uuids) &&
    lowercaseUuidSet(r.uuids).has(String(r.openerUuid).toLowerCase()) &&
    [...lowercaseUuidSet(Array.isArray(uuids) ? uuids : [])].every((y) => h.has(y))
    ? n
    : void 0;
}
//@ chunk-tyg7f3ek.js:49963-50210 placement
function runningTurnSendsForTurn(e, n, r = new Set()) {
  try {
    let s = rowsSinceTurnStart(e, n),
      h = s[0];
    if (h === void 0 || !isCompactBoundaryMessage(h)) return;
    return Ji(
      [
        ...(h.compactMetadata.runningTurnSends?.uuids ?? []),
        ...mergedMessageUuids(s, h.uuid).filter(
          (y) => y !== h.uuid && (r.has(y) || isQueuedPromptAnswered(e, y)),
        ),
      ],
      (y) => y.toLowerCase(),
    );
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-tyg7f3ek.js:50210-50315 placement
function answeredHeldUuids(e, n) {
  try {
    return new Set(
      [...heldUuidsIfEnabled(rowsSinceTurnStart(e, n))].filter((r) => isQueuedPromptAnswered(e, r)),
    );
  } catch (error) {
    return (logError(error), new Set());
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
