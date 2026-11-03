/**
 * utils/transcript/resumeAnnouncements.ts
 *
 * 2.1.316 新增：恢复时的首回合公告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (23)
 * attribution: placement 23
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, M, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
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

//@ chunk-e6aww6q8.js:304122-304177 placement
/**
 * 公告附件 schema（content + 可选 changed）。
 */
var announcementSchema = DoctorLazy(() =>
  u({
    content: string(),
    changed: M().optional(),
  }),
);
//@ chunk-e6aww6q8.js:304177-304297 placement
/**
 * 恢复/压缩后需重新公告的附件类型。
 */
var REANNOUNCED_ATTACHMENT_TYPES = new Set([
  "instructions",
  "session_context",
  "coordinator_context",
  "context_sections",
  "project_doc_reads",
  "date",
]);
//@ chunk-e6aww6q8.js:304297-304352 placement
/**
 * 上下文分段公告 schema。
 */
var contextSectionsSchema = DoctorLazy(() =>
  u({
    sections: array(
      u({
        name: string(),
        text: string(),
      }),
    ),
  }),
);
//@ chunk-e6aww6q8.js:304352-304380 placement
var REANNOUNCED_ATTACHMENT_TYPE_SET = REANNOUNCED_ATTACHMENT_TYPES;
var weakSet = new WeakSet();
//@ chunk-e6aww6q8.js:304380-304453 placement = isCompactBoundaryMessage (1)
function isCompactBoundaryMessage_2(message) {
  return message.type === "system" && message.subtype === "compact_boundary";
}
//@ chunk-e6aww6q8.js:304453-304590 placement = isNullRenderingAttachment (1)
function getNullRenderingAttachmentType(msg) {
  if (msg.type !== "attachment" || !isPlainObject_5(msg.attachment)) return;
  let n = msg.attachment.type;
  return typeof n === "string" && REANNOUNCED_ATTACHMENT_TYPE_SET.has(n) ? n : undefined;
}
//@ chunk-e6aww6q8.js:304590-304655 placement
function hasChangedFlag(e) {
  return isPlainObject_5(e.attachment) && e.attachment.changed === true;
}
//@ chunk-e6aww6q8.js:304655-304767 placement
function isRealUserPrompt(e) {
  return (
    e.type === "user" &&
    e.isMeta !== true &&
    !contentHasBlockType(isPlainObject_5(e.message) ? e.message.content : undefined, "tool_result")
  );
}
//@ chunk-e6aww6q8.js:304767-305008 placement
function findFirstTurn(e) {
  let index = e.findIndex((s) => s.type === "assistant");
  if (index < 0) return;
  let r;
  for (let idx = index - 1; idx >= 0; idx--) {
    let h = e[idx];
    if (isCompactBoundaryMessage_2(h) || h.isCompactSummary === true) return;
    if (r === undefined && isRealUserPrompt(h)) r = idx;
  }
  return r === undefined
    ? undefined
    : {
        promptIndex: r,
        responseIndex: index,
      };
}
//@ chunk-e6aww6q8.js:305008-305120 placement
function announceFirstTurnOnce(e, n, seen) {
  try {
    if (weakSet.has(e)) return;
    let firstTurnAnnouncements = computeFirstTurnAnnouncements(e, n, seen);
    if (firstTurnAnnouncements !== undefined) {
      weakSet.add(e);
      collectFirstTurnAnnouncements(firstTurnAnnouncements);
    }
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:305120-305562 placement
/**
 * 公告类附件的负载是否通过校验。
 */
function isValidAnnouncement(e) {
  if (e.type !== "attachment" || !isPlainObject_5(e.attachment)) return false;
  let attachment = e.attachment;
  switch (getNullRenderingAttachmentType(e)) {
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
//@ chunk-e6aww6q8.js:305562-305581 placement
var MAX_ANCESTOR_HOPS = 64;
var MAX_ANCESTOR_SCAN = 256;
//@ chunk-e6aww6q8.js:305581-305720 placement
function findRootAncestor(e, n) {
  let r = n;
  for (let idx = 0; idx < MAX_ANCESTOR_HOPS; idx++) {
    if (r.parentUuid === null) return r;
    let h = e.get(r.parentUuid);
    if (h === undefined) return;
    r = h;
  }
  return;
}
//@ chunk-e6aww6q8.js:305720-305779 placement
function hasRealPromptAncestor(e, n) {
  let rootAncestor = findRootAncestor(e, n);
  return rootAncestor !== undefined && isRealUserPrompt(rootAncestor);
}
//@ chunk-e6aww6q8.js:305779-305838 placement
function hasCompactBoundaryAncestor(e, n) {
  let rootAncestor = findRootAncestor(e, n);
  return rootAncestor !== undefined && isCompactBoundaryMessage_2(rootAncestor);
}
//@ chunk-e6aww6q8.js:305838-305984 placement
function findIndexedAncestor(e, n, r) {
  let s = r;
  for (let idx = 0; s && idx < MAX_ANCESTOR_HOPS; idx++) {
    let y = n.get(s.uuid);
    if (y !== undefined) return y;
    s = s.parentUuid ? e.get(s.parentUuid) : undefined;
  }
  return;
}
//@ chunk-e6aww6q8.js:305984-306157 placement
function isBeforePromptAncestor(e, n, promptIndex, s) {
  let h = s;
  for (let idx = 0; h && idx < MAX_ANCESTOR_HOPS; idx++) {
    let S = h.parentUuid ? e.get(h.parentUuid) : undefined;
    let w = S ? n.get(S.uuid) : undefined;
    if (w !== undefined) return w < promptIndex && isRealUserPrompt(h);
    h = S;
  }
  return false;
}
//@ chunk-e6aww6q8.js:306157-309487 placement
/**
 * 在主链首回合（第一条用户提示与回复）之前，找出不在链上的公告类附件（指令、会话上下文、日期、项目文档已读等）， 判断哪些应该归属首回合并返回重放计划；条件不满足时返回 undefined。
 */
function computeFirstTurnAnnouncements(e, n, r) {
  let firstTurn = findFirstTurn(n);
  if (firstTurn === undefined) return;
  let { promptIndex, responseIndex } = firstTurn;
  let S = n[responseIndex];
  if (S.isSidechain) return;
  let timestamp = Date.parse(S.timestamp);
  let L = new Set();
  for (let idx = 0; idx < responseIndex; idx++) L.add(n[idx].uuid);
  let G = false;
  let q = false;
  let Z = false;
  for (let un of e.values()) {
    if (r.has(un.uuid) || un.isSidechain) continue;
    let ao = un.parentUuid !== null && L.has(un.parentUuid);
    if (ao) G = true;
    if (getNullRenderingAttachmentType(un) !== undefined) {
      q = true;
      if (!ao && !hasChangedFlag(un) && Date.parse(un.timestamp) < timestamp) Z = true;
    }
  }
  if (!(G && q) && !Z) return;
  let Se = new Map();
  n.forEach((un, ao) => Se.set(un.uuid, ao));
  let ke = new Set();
  let we = new Set();
  let Ee = new Set();
  let Ae = new Map();
  let Ie = new Set();
  let Me = [];
  let We = 0;
  for (let un of e.values()) {
    if (un.isSidechain) continue;
    let nullRenderingAttachmentType = getNullRenderingAttachmentType(un);
    if (nullRenderingAttachmentType === undefined) continue;
    let $o = Se.get(un.uuid);
    if ($o !== undefined) {
      if ($o < responseIndex) ke.add(nullRenderingAttachmentType);
      else {
        let Ho = Ae.get(nullRenderingAttachmentType);
        if (Ho === undefined || (Se.get(Ho.uuid) ?? -1) < $o) Ae.set(nullRenderingAttachmentType, un);
        if (hasChangedFlag(un)) Ie.add(nullRenderingAttachmentType);
        else we.add(nullRenderingAttachmentType);
      }
      continue;
    }
    if (hasChangedFlag(un)) continue;
    let indexedAncestor = findIndexedAncestor(e, Se, un);
    if (indexedAncestor !== undefined && indexedAncestor < responseIndex) {
      Me.push(un);
      continue;
    }
    if (indexedAncestor !== undefined || !(Date.parse(un.timestamp) < timestamp)) {
      if (indexedAncestor !== undefined || !hasCompactBoundaryAncestor(e, un))
        Ee.add(nullRenderingAttachmentType);
    } else if (!hasRealPromptAncestor(e, un)) We++;
  }
  let childrenIndex = buildChildrenIndex(e);
  let lt = [];
  let Je = new Set();
  let nt = new Set();
  let pt = 0;
  let Et = 0;
  let yt = false;
  let gt = false;
  let At = false;
  let It = false;
  let Yt = false;
  let qt = false;
  let Zt = false;
  let rn = false;
  for (let idx = 0; idx < responseIndex; idx++) {
    let ao = n[idx];
    let timestamp_2 = Date.parse(ao.timestamp);
    for (let yo of childrenIndex.get(ao.uuid) ?? []) {
      if (r.has(yo.uuid) || yo.isSidechain) continue;
      let linearChain = collectLinearChain(yo, ao, childrenIndex, r);
      if (linearChain.length === 0) {
        let Oo = countAnnouncementsUnder(yo, childrenIndex, r, nt);
        if (Oo > 0) {
          pt += Oo;
          yt = true;
        }
        continue;
      }
      let mapped = linearChain.map(getNullRenderingAttachmentType);
      let filtered = linearChain.filter((Oo, jr) => mapped[jr] !== undefined);
      for (let Oo of filtered) nt.add(Oo.uuid);
      if (filtered.length === 0) {
        Et++;
        continue;
      }
      let Hr = filtered.length !== linearChain.length;
      let filtered_2 = mapped.filter((Oo) => Oo !== undefined);
      let cs = new Set(filtered_2).size !== filtered_2.length;
      let any = filtered.some(hasChangedFlag);
      let any_2 = filtered.some((Oo) => !isValidAnnouncement(Oo));
      let any_3 = linearChain.some(
        (Oo) => !(Date.parse(Oo.timestamp) >= timestamp_2) || !(Date.parse(Oo.timestamp) < timestamp),
      );
      if (Hr || cs || any || any_2 || any_3) {
        pt += filtered.length;
        gt ||= Hr;
        At ||= cs;
        It ||= any;
        Yt ||= any_2;
        qt ||= any_3;
        continue;
      }
      if (mapped.some((Oo) => ke.has(Oo))) {
        pt += filtered.length;
        Zt = true;
        continue;
      }
      if (mapped.some((Oo) => Je.has(Oo))) rn = true;
      for (let Oo of mapped) Je.add(Oo);
      lt.push({
        parent: ao,
        rows: linearChain,
      });
    }
  }
  let pn = lt.length > 0 && !Je.has("date");
  let no = lt.length > 1;
  let filtered = ["date", "session_context"].filter((un) => Je.has(un));
  let anchorTypesMasked = filtered.length > 0 && filtered.every((un) => Ie.has(un));
  let reduced = lt.reduce((acc, ao) => acc + ao.rows.length, 0);
  let turnStartByDuration = findTurnStartByDuration(n, responseIndex);
  let Xn = lt.length > 0 && turnStartByDuration !== undefined && turnStartByDuration !== -reduced;
  let fo = We > 0 || Me.some((un) => !nt.has(un.uuid) && !isBeforePromptAncestor(e, Se, promptIndex, un));
  let To = [...Je];
  let any = To.some((un) => we.has(un));
  let any_2 = To.some((un) => Ee.has(un));
  let any_3 = To.some((un) => {
    if (un === "instructions") return false;
    let ao = Ae.get(un);
    return ao !== undefined && !isValidAnnouncement(ao);
  });
  let So = yt || gt || At || It || Yt || qt || Zt || pn || Xn || no || fo || any || any_2 || any_3 || rn;
  if (So) pt += lt.reduce((acc, ao) => acc + ao.rows.length, 0);
  if (lt.length === 0 && pt === 0 && We === 0) return;
  let ko = mapKeysToIndex(e);
  return {
    runs: lt,
    vetoed: So,
    declinedRows: pt,
    unanchoredRows: We,
    nonAnnouncementRuns: Et,
    declinedOpenRun: yt,
    declinedMixedRun: gt,
    declinedRepeatedType: At,
    declinedReplacingCopy: It,
    declinedUnreadableRow: Yt,
    declinedBadTimestamp: qt,
    declinedTypeOnChain: Zt,
    declinedNoDate: pn,
    declinedCheckpointDisagrees: Xn,
    vetoedMultipleRuns: no,
    anchorTypesMasked,
    vetoedStrayFirstCopy: fo,
    vetoedLaterFirstCopyOnChain: any,
    vetoedLaterFirstCopyOffChain: any_2,
    vetoedUnreadableLaterCopy: any_3,
    vetoedTypeInTwoRuns: rn,
    candidateTypes: Je,
    writtenInFileBeforeParent: lt.some((un) => indexOrMax(ko, un.rows[0]) < indexOrMax(ko, un.parent)),
    parentIsPrompt: lt.some((un) => un.parent === n[promptIndex]),
    runParentDistanceToResponse: lt.length > 0 ? responseIndex - (Se.get(lt[0].parent.uuid) ?? 0) : 0,
    promptDistanceToResponse: responseIndex - promptIndex,
    firstTurnCheckpointDelta: turnStartByDuration,
  };
}
//@ chunk-e6aww6q8.js:309487-309678 placement
function findTurnStartByDuration(e, responseIndex) {
  for (let idx = responseIndex + 1; idx < e.length; idx++) {
    let s = e[idx];
    if (isRealUserPrompt(s)) return;
    if (s.type === "system" && s.subtype === "turn_duration" && typeof s.messageCount === "number")
      return idx - s.messageCount;
  }
  return;
}
//@ chunk-e6aww6q8.js:309678-309871 placement
function countAnnouncementsUnder(e, childrenIndex, r, s) {
  let h = 0;
  let y = [e];
  for (let idx = 0; y.length > 0 && idx < MAX_ANCESTOR_SCAN; idx++) {
    let w = y.pop();
    if (r.has(w.uuid) || !isAuxiliaryEntry(w)) continue;
    if (getNullRenderingAttachmentType(w) !== undefined) {
      h++;
      s.add(w.uuid);
    }
    y.push(...(childrenIndex.get(w.uuid) ?? []));
  }
  return h;
}
//@ chunk-e6aww6q8.js:309871-311738 placement
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
//@ chunk-e6aww6q8.js:311738-313084 placement
/**
 * 统计恢复会话首回合的公告附件。
 */
function censusResumeAnnouncements(messages, fileSize) {
  try {
    let firstTurn = findFirstTurn(messages);
    let s = {};
    for (let S of REANNOUNCED_ATTACHMENT_TYPES) s[S] = 0;
    let hasPromptSnapshot = false;
    let y = {};
    for (let S of REANNOUNCED_ATTACHMENT_TYPES) y[S] = 0;
    if (firstTurn !== undefined) {
      for (let idx = 0; idx < firstTurn.responseIndex; idx++) {
        let w = messages[idx];
        let nullRenderingAttachmentType = getNullRenderingAttachmentType(w);
        if (nullRenderingAttachmentType !== undefined)
          s[nullRenderingAttachmentType] = (s[nullRenderingAttachmentType] ?? 0) + 1;
        else if (
          w.type === "attachment" &&
          isPlainObject_5(w.attachment) &&
          w.attachment.type === "prompt_snapshot"
        )
          hasPromptSnapshot = true;
      }
      for (let idx = firstTurn.responseIndex + 1; idx < messages.length; idx++) {
        let w = messages[idx];
        if (isCompactBoundaryMessage_2(w)) break;
        let nullRenderingAttachmentType = getNullRenderingAttachmentType(w);
        if (nullRenderingAttachmentType !== undefined && !hasChangedFlag(w))
          y[nullRenderingAttachmentType] = (y[nullRenderingAttachmentType] ?? 0) + 1;
      }
    }
    logEvent("tengu_resume_first_turn_announcement_census", {
      has_first_turn: firstTurn !== undefined,
      has_compact_boundary: messages.some((S) => isCompactBoundaryMessage_2(S)),
      prompt_index: firstTurn?.promptIndex ?? -1,
      rows_between_prompt_and_response:
        firstTurn === undefined ? 0 : firstTurn.responseIndex - firstTurn.promptIndex - 1,
      instructions_count: s.instructions ?? 0,
      session_context_count: s.session_context ?? 0,
      context_sections_count: s.context_sections ?? 0,
      project_doc_reads_count: s.project_doc_reads ?? 0,
      coordinator_context_count: s.coordinator_context ?? 0,
      date_count: s.date ?? 0,
      has_prompt_snapshot: hasPromptSnapshot,
      transcript_size_known: fileSize !== undefined,
      over_prune_threshold: fileSize !== undefined && fileSize > SKIP_PRECOMPACT_THRESHOLD,
      later_instructions_first_copy_count: y.instructions ?? 0,
      later_session_context_first_copy_count: y.session_context ?? 0,
      later_context_sections_first_copy_count: y.context_sections ?? 0,
      later_project_doc_reads_first_copy_count: y.project_doc_reads ?? 0,
      later_coordinator_context_first_copy_count: y.coordinator_context ?? 0,
      later_date_first_copy_count: y.date ?? 0,
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:313084-313160 placement
var MAX_ANNOUNCEMENTS = 500;
var weakMap_2 = new WeakMap();
var weakMap_3 = new WeakMap();
var weakMap_4 = new WeakMap();
var weakMap_5 = new WeakMap();
export {
  announcementSchema,
  contextSectionsSchema,
  censusResumeAnnouncements,
  announceFirstTurnOnce,
  weakMap_2,
  weakMap_3,
  weakMap_5,
  MAX_ANNOUNCEMENTS,
  weakMap_4,
  REANNOUNCED_ATTACHMENT_TYPES,
};
