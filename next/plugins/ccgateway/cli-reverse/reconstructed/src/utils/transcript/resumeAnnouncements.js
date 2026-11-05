/**
 * utils/transcript/resumeAnnouncements.ts
 *
 * 2.1.316 新增：恢复时的首回合公告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (23)
 * attribution: placement 23
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, booleanSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import {
  contentHasBlockType,
  buildChildrenIndex,
  collectLinearChain,
  mapKeysToIndex,
  indexOrMax,
  isAuxiliaryEntry,
} from "./transcriptFiles.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { memoryAttachmentSchema } from "../contextAttachments/memory.js";
import { sessionContextValuesSchema, sessionDateSchema } from "../contextAttachments/sessionContext.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { logEvent } from "../../services/analytics/index.js";
import { SKIP_PRECOMPACT_THRESHOLD } from "../sessionStoragePortable.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:304937-304992 placement
/**
 * 公告附件 schema（content + 可选 changed）。
 */
var announcementSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:304937", () => {
  announcementSchema = DoctorLazy(() =>
    objectSchema({
      content: stringSchema(),
      changed: booleanSchema().optional(),
    }),
  );
});
//@ chunk-5xgkngpb.js:304992-305112 placement
/**
 * 恢复/压缩后需重新公告的附件类型。
 */
var REANNOUNCED_ATTACHMENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:304992", () => {
  REANNOUNCED_ATTACHMENT_TYPES = new Set([
    "instructions",
    "session_context",
    "coordinator_context",
    "context_sections",
    "project_doc_reads",
    "date",
  ]);
});
//@ chunk-5xgkngpb.js:305112-305167 placement
/**
 * 上下文分段公告 schema。
 */
var contextSectionsSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:305112", () => {
  contextSectionsSchema = DoctorLazy(() =>
    objectSchema({
      sections: array(
        objectSchema({
          name: stringSchema(),
          text: stringSchema(),
        }),
      ),
    }),
  );
});
//@ chunk-5xgkngpb.js:305167-305195 placement
var REANNOUNCED_ATTACHMENT_TYPE_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakSet;
deferInit("chunk-5xgkngpb.js:305167", () => {
  REANNOUNCED_ATTACHMENT_TYPE_SET = REANNOUNCED_ATTACHMENT_TYPES;
  weakSet = new WeakSet();
});
//@ chunk-5xgkngpb.js:305195-305268 placement (2.1.88 match: isCompactBoundaryMessage, 1)
function isCompactBoundaryMessage_2(message) {
  return message.type === "system" && message.subtype === "compact_boundary";
}
//@ chunk-5xgkngpb.js:305268-305405 placement (2.1.88 match: isNullRenderingAttachment, 1)
function getNullRenderingAttachmentType(msg) {
  if (msg.type !== "attachment" || !isPlainObject_6(msg.attachment)) return;
  let msg_2 = msg.attachment.type;
  return typeof msg_2 === "string" && REANNOUNCED_ATTACHMENT_TYPE_SET.has(msg_2) ? msg_2 : undefined;
}
//@ chunk-5xgkngpb.js:305405-305470 placement
function hasChangedFlag(msg) {
  return isPlainObject_6(msg.attachment) && msg.attachment.changed === true;
}
//@ chunk-5xgkngpb.js:305470-305582 placement
function isRealUserPrompt(msg) {
  return (
    msg.type === "user" &&
    msg.isMeta !== true &&
    !contentHasBlockType(isPlainObject_6(msg.message) ? msg.message.content : undefined, "tool_result")
  );
}
//@ chunk-5xgkngpb.js:305582-305823 placement
function findFirstTurn(messages) {
  let index = messages.findIndex((msg) => msg.type === "assistant");
  if (index < 0) return;
  let promptIndex;
  for (let idx = index - 1; idx >= 0; idx--) {
    let row = messages[idx];
    if (isCompactBoundaryMessage_2(row) || row.isCompactSummary === true) return;
    if (promptIndex === undefined && isRealUserPrompt(row)) promptIndex = idx;
  }
  return promptIndex === undefined
    ? undefined
    : {
        promptIndex,
        responseIndex: index,
      };
}
//@ chunk-5xgkngpb.js:305823-305935 placement
function announceFirstTurnOnce(messages, options, options_2) {
  try {
    if (weakSet.has(messages)) return;
    let firstTurnAnnouncements = computeFirstTurnAnnouncements(messages, options, options_2);
    if (firstTurnAnnouncements !== undefined) {
      weakSet.add(messages);
      collectFirstTurnAnnouncements(firstTurnAnnouncements);
    }
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:305935-306377 placement
/**
 * 公告类附件的负载是否通过校验。
 */
function isValidAnnouncement(msg) {
  if (msg.type !== "attachment" || !isPlainObject_6(msg.attachment)) return false;
  let attachment = msg.attachment;
  switch (getNullRenderingAttachmentType(msg)) {
    case "instructions":
      return memoryAttachmentSchema().safeParse(attachment).success;
    case "session_context":
      return sessionContextValuesSchema().safeParse(attachment.context).success;
    case "date":
      return sessionDateSchema().safeParse(attachment).success;
    case "context_sections":
      return contextSectionsSchema().safeParse(attachment).success;
    case "project_doc_reads":
      return trackedProjectReads(attachment) !== undefined;
    case "coordinator_context":
      return announcementSchema().safeParse(attachment).success;
    default:
      return false;
  }
}
//@ chunk-5xgkngpb.js:306377-306396 placement
var MAX_ANCESTOR_HOPS = 64;
var MAX_ANCESTOR_SCAN = 256;
//@ chunk-5xgkngpb.js:306396-306535 placement
function findRootAncestor(byUuid, index) {
  let row = index;
  for (let idx = 0; idx < MAX_ANCESTOR_HOPS; idx++) {
    if (row.parentUuid === null) return row;
    let parentRow = byUuid.get(row.parentUuid);
    if (parentRow === undefined) return;
    row = parentRow;
  }
  return;
}
//@ chunk-5xgkngpb.js:306535-306594 placement
function hasRealPromptAncestor(byUuid, index) {
  let rootAncestor = findRootAncestor(byUuid, index);
  return rootAncestor !== undefined && isRealUserPrompt(rootAncestor);
}
//@ chunk-5xgkngpb.js:306594-306653 placement
function hasCompactBoundaryAncestor(byUuid, index) {
  let rootAncestor = findRootAncestor(byUuid, index);
  return rootAncestor !== undefined && isCompactBoundaryMessage_2(rootAncestor);
}
//@ chunk-5xgkngpb.js:306653-306799 placement
function findIndexedAncestor(byUuid, indexByUuid, index) {
  let row = index;
  for (let idx = 0; row && idx < MAX_ANCESTOR_HOPS; idx++) {
    let index = indexByUuid.get(row.uuid);
    if (index !== undefined) return index;
    row = row.parentUuid ? byUuid.get(row.parentUuid) : undefined;
  }
  return;
}
//@ chunk-5xgkngpb.js:306799-306972 placement
function isBeforePromptAncestor(byUuid, index, promptIndex, startRow) {
  let row = startRow;
  for (let idx = 0; row && idx < MAX_ANCESTOR_HOPS; idx++) {
    let parentRow = row.parentUuid ? byUuid.get(row.parentUuid) : undefined;
    let parentIndex = parentRow ? index.get(parentRow.uuid) : undefined;
    if (parentIndex !== undefined) return parentIndex < promptIndex && isRealUserPrompt(row);
    row = parentRow;
  }
  return false;
}
//@ chunk-5xgkngpb.js:306972-310305 placement
/**
 * 在主链首回合（第一条用户提示与回复）之前，找出不在链上的公告类附件（指令、会话上下文、日期、项目文档已读等）， 判断哪些应该归属首回合并返回重放计划；条件不满足时返回 undefined。
 */
function computeFirstTurnAnnouncements(msg, messages, options) {
  let firstTurn = findFirstTurn(messages);
  if (firstTurn === undefined) return;
  let { promptIndex, responseIndex } = firstTurn;
  let responseRow = messages[responseIndex];
  if (responseRow.isSidechain) return;
  let timestamp = Date.parse(responseRow.timestamp);
  let preResponseUuids = new Set();
  for (let idx = 0; idx < responseIndex; idx++) preResponseUuids.add(messages[idx].uuid);
  let hasPreResponseParent = false;
  let hasAttachment = false;
  let hasUnanchoredAttachment = false;
  for (let row of msg.values()) {
    if (options.has(row.uuid) || row.isSidechain) continue;
    let isPreResponseChild = row.parentUuid !== null && preResponseUuids.has(row.parentUuid);
    if (isPreResponseChild) hasPreResponseParent = true;
    if (getNullRenderingAttachmentType(row) !== undefined) {
      hasAttachment = true;
      if (!isPreResponseChild && !hasChangedFlag(row) && Date.parse(row.timestamp) < timestamp)
        hasUnanchoredAttachment = true;
    }
  }
  if (!(hasPreResponseParent && hasAttachment) && !hasUnanchoredAttachment) return;
  let indexByUuid = new Map();
  messages.forEach((row, messageIndex) => indexByUuid.set(row.uuid, messageIndex));
  let announcedTypes = new Set();
  let unmaskedTypes = new Set();
  let offChainTypes = new Set();
  let latestByType = new Map();
  let changedTypes = new Set();
  let preResponseRows = [];
  let unanchoredCount = 0;
  for (let message of msg.values()) {
    if (message.isSidechain) continue;
    let nullRenderingAttachmentType = getNullRenderingAttachmentType(message);
    if (nullRenderingAttachmentType === undefined) continue;
    let rowIndex = indexByUuid.get(message.uuid);
    if (rowIndex !== undefined) {
      if (rowIndex < responseIndex) announcedTypes.add(nullRenderingAttachmentType);
      else {
        let latestRow = latestByType.get(nullRenderingAttachmentType);
        if (latestRow === undefined || (indexByUuid.get(latestRow.uuid) ?? -1) < rowIndex)
          latestByType.set(nullRenderingAttachmentType, message);
        if (hasChangedFlag(message)) changedTypes.add(nullRenderingAttachmentType);
        else unmaskedTypes.add(nullRenderingAttachmentType);
      }
      continue;
    }
    if (hasChangedFlag(message)) continue;
    let indexedAncestor = findIndexedAncestor(msg, indexByUuid, message);
    if (indexedAncestor !== undefined && indexedAncestor < responseIndex) {
      preResponseRows.push(message);
      continue;
    }
    if (indexedAncestor !== undefined || !(Date.parse(message.timestamp) < timestamp)) {
      if (indexedAncestor !== undefined || !hasCompactBoundaryAncestor(msg, message))
        offChainTypes.add(nullRenderingAttachmentType);
    } else if (!hasRealPromptAncestor(msg, message)) unanchoredCount++;
  }
  let childrenIndex = buildChildrenIndex(msg);
  let runs = [];
  let candidateTypes = new Set();
  let countedUuids = new Set();
  let declinedCount = 0;
  let nonAnnouncementRuns = 0;
  let declinedOpenRun = false;
  let declinedMixedRun = false;
  let declinedRepeatedType = false;
  let declinedReplacingCopy = false;
  let declinedUnreadableRow = false;
  let declinedBadTimestamp = false;
  let declinedTypeOnChain = false;
  let vetoedTypeInTwoRuns = false;
  for (let idx = 0; idx < responseIndex; idx++) {
    let parentMessage = messages[idx];
    let timestamp_2 = Date.parse(parentMessage.timestamp);
    for (let child of childrenIndex.get(parentMessage.uuid) ?? []) {
      if (options.has(child.uuid) || child.isSidechain) continue;
      let linearChain = collectLinearChain(child, parentMessage, childrenIndex, options);
      if (linearChain.length === 0) {
        let nestedCount = countAnnouncementsUnder(child, childrenIndex, options, countedUuids);
        if (nestedCount > 0) {
          declinedCount += nestedCount;
          declinedOpenRun = true;
        }
        continue;
      }
      let mapped = linearChain.map(getNullRenderingAttachmentType);
      let filtered = linearChain.filter((row, rowIndex) => mapped[rowIndex] !== undefined);
      for (let row of filtered) countedUuids.add(row.uuid);
      if (filtered.length === 0) {
        nonAnnouncementRuns++;
        continue;
      }
      let droppedRows = filtered.length !== linearChain.length;
      let filtered_2 = mapped.filter((type) => type !== undefined);
      let repeatedType = new Set(filtered_2).size !== filtered_2.length;
      let any = filtered.some(hasChangedFlag);
      let any_2 = filtered.some((row) => !isValidAnnouncement(row));
      let any_3 = linearChain.some(
        (row) => !(Date.parse(row.timestamp) >= timestamp_2) || !(Date.parse(row.timestamp) < timestamp),
      );
      if (droppedRows || repeatedType || any || any_2 || any_3) {
        declinedCount += filtered.length;
        declinedMixedRun ||= droppedRows;
        declinedRepeatedType ||= repeatedType;
        declinedReplacingCopy ||= any;
        declinedUnreadableRow ||= any_2;
        declinedBadTimestamp ||= any_3;
        continue;
      }
      if (mapped.some((type) => announcedTypes.has(type))) {
        declinedCount += filtered.length;
        declinedTypeOnChain = true;
        continue;
      }
      if (mapped.some((type) => candidateTypes.has(type))) vetoedTypeInTwoRuns = true;
      for (let type of mapped) candidateTypes.add(type);
      runs.push({
        parent: parentMessage,
        rows: linearChain,
      });
    }
  }
  let declinedNoDate = runs.length > 0 && !candidateTypes.has("date");
  let vetoedMultipleRuns = runs.length > 1;
  let filtered = ["date", "session_context"].filter((type) => candidateTypes.has(type));
  let anchorTypesMasked = filtered.length > 0 && filtered.every((type) => changedTypes.has(type));
  let reduced = runs.reduce((acc, run) => acc + run.rows.length, 0);
  let turnStartByDuration = findTurnStartByDuration(messages, responseIndex);
  let declinedCheckpointDisagrees =
    runs.length > 0 && turnStartByDuration !== undefined && turnStartByDuration !== -reduced;
  let vetoedStrayFirstCopy =
    unanchoredCount > 0 ||
    preResponseRows.some(
      (row) => !countedUuids.has(row.uuid) && !isBeforePromptAncestor(msg, indexByUuid, promptIndex, row),
    );
  let candidateTypeList = [...candidateTypes];
  let any = candidateTypeList.some((type) => unmaskedTypes.has(type));
  let any_2 = candidateTypeList.some((type) => offChainTypes.has(type));
  let any_3 = candidateTypeList.some((type) => {
    if (type === "instructions") return false;
    let latestRow = latestByType.get(type);
    return latestRow !== undefined && !isValidAnnouncement(latestRow);
  });
  let vetoed =
    declinedOpenRun ||
    declinedMixedRun ||
    declinedRepeatedType ||
    declinedReplacingCopy ||
    declinedUnreadableRow ||
    declinedBadTimestamp ||
    declinedTypeOnChain ||
    declinedNoDate ||
    declinedCheckpointDisagrees ||
    vetoedMultipleRuns ||
    vetoedStrayFirstCopy ||
    any ||
    any_2 ||
    any_3 ||
    vetoedTypeInTwoRuns;
  if (vetoed) declinedCount += runs.reduce((acc, run) => acc + run.rows.length, 0);
  if (runs.length === 0 && declinedCount === 0 && unanchoredCount === 0) return;
  let indexByUuid_2 = mapKeysToIndex(msg);
  return {
    runs,
    vetoed,
    declinedRows: declinedCount,
    unanchoredRows: unanchoredCount,
    nonAnnouncementRuns,
    declinedOpenRun,
    declinedMixedRun,
    declinedRepeatedType,
    declinedReplacingCopy,
    declinedUnreadableRow,
    declinedBadTimestamp,
    declinedTypeOnChain,
    declinedNoDate,
    declinedCheckpointDisagrees,
    vetoedMultipleRuns,
    anchorTypesMasked,
    vetoedStrayFirstCopy,
    vetoedLaterFirstCopyOnChain: any,
    vetoedLaterFirstCopyOffChain: any_2,
    vetoedUnreadableLaterCopy: any_3,
    vetoedTypeInTwoRuns,
    candidateTypes,
    writtenInFileBeforeParent: runs.some(
      (run) => indexOrMax(indexByUuid_2, run.rows[0]) < indexOrMax(indexByUuid_2, run.parent),
    ),
    parentIsPrompt: runs.some((run) => run.parent === messages[promptIndex]),
    runParentDistanceToResponse:
      runs.length > 0 ? responseIndex - (indexByUuid.get(runs[0].parent.uuid) ?? 0) : 0,
    promptDistanceToResponse: responseIndex - promptIndex,
    firstTurnCheckpointDelta: turnStartByDuration,
  };
}
//@ chunk-5xgkngpb.js:310305-310496 placement
function findTurnStartByDuration(messages, responseIndex) {
  for (let idx = responseIndex + 1; idx < messages.length; idx++) {
    let starts = messages[idx];
    if (isRealUserPrompt(starts)) return;
    if (
      starts.type === "system" &&
      starts.subtype === "turn_duration" &&
      typeof starts.messageCount === "number"
    )
      return idx - starts.messageCount;
  }
  return;
}
//@ chunk-5xgkngpb.js:310496-310689 placement
function countAnnouncementsUnder(index, parentIndex, keptUuids, newUuids) {
  let count = 0;
  let queue = [index];
  for (let idx = 0; queue.length > 0 && idx < MAX_ANCESTOR_SCAN; idx++) {
    let entry = queue.pop();
    if (keptUuids.has(entry.uuid) || !isAuxiliaryEntry(entry)) continue;
    if (getNullRenderingAttachmentType(entry) !== undefined) {
      count++;
      newUuids.add(entry.uuid);
    }
    queue.push(...(parentIndex.get(entry.uuid) ?? []));
  }
  return count;
}
//@ chunk-5xgkngpb.js:310689-312556 placement
/**
 * 收集首回合需要重放的公告（指令、会话上下文、项目文档已读等）。
 */
function collectFirstTurnAnnouncements(firstTurnAnnouncements) {
  let eligibleRowCount = firstTurnAnnouncements.vetoed
    ? 0
    : firstTurnAnnouncements.runs.reduce((acc, run) => acc + run.rows.length, 0);
  logEvent("tengu_chain_first_turn_announcements_off_chain", {
    eligible_row_count: eligibleRowCount,
    eligible_run_count: firstTurnAnnouncements.vetoed ? 0 : firstTurnAnnouncements.runs.length,
    candidate_row_count: firstTurnAnnouncements.runs.reduce((acc, run) => acc + run.rows.length, 0),
    candidate_run_count: firstTurnAnnouncements.runs.length,
    run_has_instructions: firstTurnAnnouncements.candidateTypes.has("instructions"),
    run_has_session_context: firstTurnAnnouncements.candidateTypes.has("session_context"),
    run_has_context_sections: firstTurnAnnouncements.candidateTypes.has("context_sections"),
    run_has_project_doc_reads: firstTurnAnnouncements.candidateTypes.has("project_doc_reads"),
    run_has_coordinator_context: firstTurnAnnouncements.candidateTypes.has("coordinator_context"),
    run_has_date: firstTurnAnnouncements.candidateTypes.has("date"),
    declined_row_count: firstTurnAnnouncements.declinedRows,
    unanchored_row_count: firstTurnAnnouncements.unanchoredRows,
    non_announcement_run_count: firstTurnAnnouncements.nonAnnouncementRuns,
    declined_open_run: firstTurnAnnouncements.declinedOpenRun,
    declined_mixed_run: firstTurnAnnouncements.declinedMixedRun,
    declined_repeated_type: firstTurnAnnouncements.declinedRepeatedType,
    declined_replacing_copy: firstTurnAnnouncements.declinedReplacingCopy,
    declined_unreadable_row: firstTurnAnnouncements.declinedUnreadableRow,
    declined_bad_timestamp: firstTurnAnnouncements.declinedBadTimestamp,
    declined_type_on_chain: firstTurnAnnouncements.declinedTypeOnChain,
    declined_no_date: firstTurnAnnouncements.declinedNoDate,
    declined_checkpoint_disagrees: firstTurnAnnouncements.declinedCheckpointDisagrees,
    vetoed_multiple_runs: firstTurnAnnouncements.vetoedMultipleRuns,
    anchor_types_masked: firstTurnAnnouncements.anchorTypesMasked,
    vetoed_stray_first_copy: firstTurnAnnouncements.vetoedStrayFirstCopy,
    vetoed_later_first_copy_on_chain: firstTurnAnnouncements.vetoedLaterFirstCopyOnChain,
    vetoed_later_first_copy_off_chain: firstTurnAnnouncements.vetoedLaterFirstCopyOffChain,
    vetoed_unreadable_later_copy: firstTurnAnnouncements.vetoedUnreadableLaterCopy,
    vetoed_type_in_two_runs: firstTurnAnnouncements.vetoedTypeInTwoRuns,
    written_in_file_before_parent: firstTurnAnnouncements.writtenInFileBeforeParent,
    parent_is_prompt: firstTurnAnnouncements.parentIsPrompt,
    run_parent_distance_to_response: firstTurnAnnouncements.runParentDistanceToResponse,
    prompt_distance_to_response: firstTurnAnnouncements.promptDistanceToResponse,
    has_first_turn_checkpoint: firstTurnAnnouncements.firstTurnCheckpointDelta !== undefined,
    first_turn_checkpoint_delta: firstTurnAnnouncements.firstTurnCheckpointDelta ?? 0,
  });
}
//@ chunk-5xgkngpb.js:312556-313902 placement
/**
 * 统计恢复会话首回合的公告附件。
 */
function censusResumeAnnouncements(messages, fileSize) {
  try {
    let firstTurn = findFirstTurn(messages);
    let byTurn = {};
    for (let attachmentType of REANNOUNCED_ATTACHMENT_TYPES) byTurn[attachmentType] = 0;
    let hasPromptSnapshot = false;
    let laterCounts = {};
    for (let attachmentType of REANNOUNCED_ATTACHMENT_TYPES) laterCounts[attachmentType] = 0;
    if (firstTurn !== undefined) {
      for (let idx = 0; idx < firstTurn.responseIndex; idx++) {
        let row = messages[idx];
        let nullRenderingAttachmentType = getNullRenderingAttachmentType(row);
        if (nullRenderingAttachmentType !== undefined)
          byTurn[nullRenderingAttachmentType] = (byTurn[nullRenderingAttachmentType] ?? 0) + 1;
        else if (
          row.type === "attachment" &&
          isPlainObject_6(row.attachment) &&
          row.attachment.type === "prompt_snapshot"
        )
          hasPromptSnapshot = true;
      }
      for (let idx = firstTurn.responseIndex + 1; idx < messages.length; idx++) {
        let row = messages[idx];
        if (isCompactBoundaryMessage_2(row)) break;
        let nullRenderingAttachmentType = getNullRenderingAttachmentType(row);
        if (nullRenderingAttachmentType !== undefined && !hasChangedFlag(row))
          laterCounts[nullRenderingAttachmentType] = (laterCounts[nullRenderingAttachmentType] ?? 0) + 1;
      }
    }
    logEvent("tengu_resume_first_turn_announcement_census", {
      has_first_turn: firstTurn !== undefined,
      has_compact_boundary: messages.some((row) => isCompactBoundaryMessage_2(row)),
      prompt_index: firstTurn?.promptIndex ?? -1,
      rows_between_prompt_and_response:
        firstTurn === undefined ? 0 : firstTurn.responseIndex - firstTurn.promptIndex - 1,
      instructions_count: byTurn.instructions ?? 0,
      session_context_count: byTurn.session_context ?? 0,
      context_sections_count: byTurn.context_sections ?? 0,
      project_doc_reads_count: byTurn.project_doc_reads ?? 0,
      coordinator_context_count: byTurn.coordinator_context ?? 0,
      date_count: byTurn.date ?? 0,
      has_prompt_snapshot: hasPromptSnapshot,
      transcript_size_known: fileSize !== undefined,
      over_prune_threshold: fileSize !== undefined && fileSize > SKIP_PRECOMPACT_THRESHOLD,
      later_instructions_first_copy_count: laterCounts.instructions ?? 0,
      later_session_context_first_copy_count: laterCounts.session_context ?? 0,
      later_context_sections_first_copy_count: laterCounts.context_sections ?? 0,
      later_project_doc_reads_first_copy_count: laterCounts.project_doc_reads ?? 0,
      later_coordinator_context_first_copy_count: laterCounts.coordinator_context ?? 0,
      later_date_first_copy_count: laterCounts.date ?? 0,
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-5xgkngpb.js:313902-313978 placement
var MAX_ANNOUNCEMENTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var weakMap_2;
var weakMap_3;
var weakMap_4;
var weakMap_5;
deferInit("chunk-5xgkngpb.js:313902", () => {
  MAX_ANNOUNCEMENTS = 500;
  weakMap_2 = new WeakMap();
  weakMap_3 = new WeakMap();
  weakMap_4 = new WeakMap();
  weakMap_5 = new WeakMap();
});
export {
  announceFirstTurnOnce,
  announcementSchema,
  contextSectionsSchema,
  censusResumeAnnouncements,
  weakMap_2,
  weakMap_3,
  weakMap_5,
  MAX_ANNOUNCEMENTS,
  weakMap_4,
  REANNOUNCED_ATTACHMENT_TYPES,
};
