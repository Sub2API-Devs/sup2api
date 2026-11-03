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
import { u, o, M, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import { _D, buildChildrenIndex, collectLinearChain, vG, lR, isAuxiliaryEntry } from "./transcriptFiles.js";
import { logError } from "../log.js";
import { toError } from "../errors.js";
import { memoryAttachmentSchema } from "../contextAttachments/memory.js";
import { sessionContextValuesSchema, sessionDateSchema } from "../contextAttachments/sessionContext.js";
import { trackedProjectReads } from "../../tools/ProjectsTool/readTracking.js";
import { logEvent } from "../../services/analytics/index.js";
import { SKIP_PRECOMPACT_THRESHOLD } from "../sessionStoragePortable.js";

//@ chunk-e6aww6q8.js:304122-304177 placement
var efn = DoctorLazy(() => u({ content: o(), changed: M().optional() }));
/**
 * 恢复/压缩后需重新公告的附件类型。
 */
//@ chunk-e6aww6q8.js:304177-304297 placement
var REANNOUNCED_ATTACHMENT_TYPES = new Set([
  "instructions",
  "session_context",
  "coordinator_context",
  "context_sections",
  "project_doc_reads",
  "date",
]);
//@ chunk-e6aww6q8.js:304297-304352 placement
var zbt = DoctorLazy(() => u({ sections: A(u({ name: o(), text: o() })) }));
//@ chunk-e6aww6q8.js:304352-304380 placement
var mfo = REANNOUNCED_ATTACHMENT_TYPES,
  weakSet = new WeakSet();
//@ chunk-e6aww6q8.js:304380-304453 placement = isCompactBoundaryMessage (1)
function isCompactBoundaryMessage_2(message) {
  return message.type === "system" && message.subtype === "compact_boundary";
}
//@ chunk-e6aww6q8.js:304453-304590 placement = isNullRenderingAttachment (1)
function getNullRenderingAttachmentType(msg) {
  if (msg.type !== "attachment" || !isPlainObject_4(msg.attachment)) return;
  let n = msg.attachment.type;
  return typeof n === "string" && mfo.has(n) ? n : void 0;
}
//@ chunk-e6aww6q8.js:304590-304655 placement
function N9(e) {
  return isPlainObject_4(e.attachment) && e.attachment.changed === !0;
}
//@ chunk-e6aww6q8.js:304655-304767 placement
function isRealUserPrompt(e) {
  return (
    e.type === "user" &&
    e.isMeta !== !0 &&
    !_D(isPlainObject_4(e.message) ? e.message.content : void 0, "tool_result")
  );
}
//@ chunk-e6aww6q8.js:304767-305008 placement
function findFirstTurn(e) {
  let index = e.findIndex((s) => s.type === "assistant");
  if (index < 0) return;
  let r;
  for (let s = index - 1; s >= 0; s--) {
    let h = e[s];
    if (isCompactBoundaryMessage_2(h) || h.isCompactSummary === !0) return;
    if (r === void 0 && isRealUserPrompt(h)) r = s;
  }
  return r === void 0 ? void 0 : { promptIndex: r, responseIndex: index };
}
//@ chunk-e6aww6q8.js:305008-305120 placement
function announceFirstTurnOnce(e, n, r) {
  try {
    if (weakSet.has(e)) return;
    let s = computeFirstTurnAnnouncements(e, n, r);
    if (s !== void 0) (weakSet.add(e), collectFirstTurnAnnouncements(s));
  } catch (error) {
    logError(toError(error));
  }
}
/**
 * 公告类附件的负载是否通过校验。
 */
//@ chunk-e6aww6q8.js:305120-305562 placement
function isValidAnnouncement(e) {
  if (e.type !== "attachment" || !isPlainObject_4(e.attachment)) return !1;
  let attachment = e.attachment;
  switch (getNullRenderingAttachmentType(e)) {
    case "instructions":
      return memoryAttachmentSchema().safeParse(attachment).success;
    case "session_context":
      return sessionContextValuesSchema().safeParse(attachment.context).success;
    case "date":
      return sessionDateSchema().safeParse(attachment).success;
    case "context_sections":
      return zbt().safeParse(attachment).success;
    case "project_doc_reads":
      return trackedProjectReads(attachment) !== void 0;
    case "coordinator_context":
      return efn().safeParse(attachment).success;
    default:
      return !1;
  }
}
//@ chunk-e6aww6q8.js:305562-305581 placement
var CHe = 64,
  gfo = 256;
//@ chunk-e6aww6q8.js:305581-305720 placement
function findRootAncestor(e, n) {
  let r = n;
  for (let s = 0; s < CHe; s++) {
    if (r.parentUuid === null) return r;
    let h = e.get(r.parentUuid);
    if (h === void 0) return;
    r = h;
  }
  return;
}
//@ chunk-e6aww6q8.js:305720-305779 placement
function hfo(e, n) {
  let r = findRootAncestor(e, n);
  return r !== void 0 && isRealUserPrompt(r);
}
//@ chunk-e6aww6q8.js:305779-305838 placement
function yfo(e, n) {
  let r = findRootAncestor(e, n);
  return r !== void 0 && isCompactBoundaryMessage_2(r);
}
//@ chunk-e6aww6q8.js:305838-305984 placement
function findIndexedAncestor(e, n, r) {
  let s = r;
  for (let h = 0; s && h < CHe; h++) {
    let y = n.get(s.uuid);
    if (y !== void 0) return y;
    s = s.parentUuid ? e.get(s.parentUuid) : void 0;
  }
  return;
}
//@ chunk-e6aww6q8.js:305984-306157 placement
function isBeforePromptAncestor(e, n, r, s) {
  let h = s;
  for (let y = 0; h && y < CHe; y++) {
    let S = h.parentUuid ? e.get(h.parentUuid) : void 0,
      w = S ? n.get(S.uuid) : void 0;
    if (w !== void 0) return w < r && isRealUserPrompt(h);
    h = S;
  }
  return !1;
}
/**
 * 在主链首回合（第一条用户提示与回复）之前，找出不在链上的公告类附件（指令、会话上下文、日期、项目文档已读等）， 判断哪些应该归属首回合并返回重放计划；条件不满足时返回 undefined。
 */
//@ chunk-e6aww6q8.js:306157-309487 placement
function computeFirstTurnAnnouncements(e, n, r) {
  let s = findFirstTurn(n);
  if (s === void 0) return;
  let { promptIndex: promptIndex, responseIndex: responseIndex } = s,
    S = n[responseIndex];
  if (S.isSidechain) return;
  let parse = Date.parse(S.timestamp),
    L = new Set();
  for (let un = 0; un < responseIndex; un++) L.add(n[un].uuid);
  let G = !1,
    q = !1,
    Z = !1;
  for (let un of e.values()) {
    if (r.has(un.uuid) || un.isSidechain) continue;
    let ao = un.parentUuid !== null && L.has(un.parentUuid);
    if (ao) G = !0;
    if (getNullRenderingAttachmentType(un) !== void 0) {
      if (((q = !0), !ao && !N9(un) && Date.parse(un.timestamp) < parse)) Z = !0;
    }
  }
  if (!(G && q) && !Z) return;
  let Se = new Map();
  n.forEach((un, ao) => Se.set(un.uuid, ao));
  let ke = new Set(),
    we = new Set(),
    Ee = new Set(),
    Ae = new Map(),
    Ie = new Set(),
    Me = [],
    We = 0;
  for (let un of e.values()) {
    if (un.isSidechain) continue;
    let ao = getNullRenderingAttachmentType(un);
    if (ao === void 0) continue;
    let $o = Se.get(un.uuid);
    if ($o !== void 0) {
      if ($o < responseIndex) ke.add(ao);
      else {
        let Ho = Ae.get(ao);
        if (Ho === void 0 || (Se.get(Ho.uuid) ?? -1) < $o) Ae.set(ao, un);
        if (N9(un)) Ie.add(ao);
        else we.add(ao);
      }
      continue;
    }
    if (N9(un)) continue;
    let yo = findIndexedAncestor(e, Se, un);
    if (yo !== void 0 && yo < responseIndex) {
      Me.push(un);
      continue;
    }
    if (yo !== void 0 || !(Date.parse(un.timestamp) < parse)) {
      if (yo !== void 0 || !yfo(e, un)) Ee.add(ao);
    } else if (!hfo(e, un)) We++;
  }
  let ze = buildChildrenIndex(e),
    lt = [],
    Je = new Set(),
    nt = new Set(),
    pt = 0,
    Et = 0,
    yt = !1,
    gt = !1,
    At = !1,
    It = !1,
    Yt = !1,
    qt = !1,
    Zt = !1,
    rn = !1;
  for (let un = 0; un < responseIndex; un++) {
    let ao = n[un],
      parse_2 = Date.parse(ao.timestamp);
    for (let yo of ze.get(ao.uuid) ?? []) {
      if (r.has(yo.uuid) || yo.isSidechain) continue;
      let Ho = collectLinearChain(yo, ao, ze, r);
      if (Ho.length === 0) {
        let Oo = countAnnouncementsUnder(yo, ze, r, nt);
        if (Oo > 0) ((pt += Oo), (yt = !0));
        continue;
      }
      let mapped = Ho.map(getNullRenderingAttachmentType),
        filtered = Ho.filter((Oo, jr) => mapped[jr] !== void 0);
      for (let Oo of filtered) nt.add(Oo.uuid);
      if (filtered.length === 0) {
        Et++;
        continue;
      }
      let Hr = filtered.length !== Ho.length,
        filtered_2 = mapped.filter((Oo) => Oo !== void 0),
        cs = new Set(filtered_2).size !== filtered_2.length,
        any = filtered.some(N9),
        any_2 = filtered.some((Oo) => !isValidAnnouncement(Oo)),
        any_3 = Ho.some(
          (Oo) => !(Date.parse(Oo.timestamp) >= parse_2) || !(Date.parse(Oo.timestamp) < parse),
        );
      if (Hr || cs || any || any_2 || any_3) {
        ((pt += filtered.length), (gt ||= Hr), (At ||= cs), (It ||= any), (Yt ||= any_2), (qt ||= any_3));
        continue;
      }
      if (mapped.some((Oo) => ke.has(Oo))) {
        ((pt += filtered.length), (Zt = !0));
        continue;
      }
      if (mapped.some((Oo) => Je.has(Oo))) rn = !0;
      for (let Oo of mapped) Je.add(Oo);
      lt.push({ parent: ao, rows: Ho });
    }
  }
  let pn = lt.length > 0 && !Je.has("date"),
    no = lt.length > 1,
    filtered = ["date", "session_context"].filter((un) => Je.has(un)),
    ho = filtered.length > 0 && filtered.every((un) => Ie.has(un)),
    reduced = lt.reduce((un, ao) => un + ao.rows.length, 0),
    Kn = findTurnStartByDuration(n, responseIndex),
    Xn = lt.length > 0 && Kn !== void 0 && Kn !== -reduced,
    fo = We > 0 || Me.some((un) => !nt.has(un.uuid) && !isBeforePromptAncestor(e, Se, promptIndex, un)),
    To = [...Je],
    any = To.some((un) => we.has(un)),
    any_2 = To.some((un) => Ee.has(un)),
    any_3 = To.some((un) => {
      if (un === "instructions") return !1;
      let ao = Ae.get(un);
      return ao !== void 0 && !isValidAnnouncement(ao);
    }),
    So = yt || gt || At || It || Yt || qt || Zt || pn || Xn || no || fo || any || any_2 || any_3 || rn;
  if (So) pt += lt.reduce((un, ao) => un + ao.rows.length, 0);
  if (lt.length === 0 && pt === 0 && We === 0) return;
  let ko = vG(e);
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
    anchorTypesMasked: ho,
    vetoedStrayFirstCopy: fo,
    vetoedLaterFirstCopyOnChain: any,
    vetoedLaterFirstCopyOffChain: any_2,
    vetoedUnreadableLaterCopy: any_3,
    vetoedTypeInTwoRuns: rn,
    candidateTypes: Je,
    writtenInFileBeforeParent: lt.some((un) => lR(ko, un.rows[0]) < lR(ko, un.parent)),
    parentIsPrompt: lt.some((un) => un.parent === n[promptIndex]),
    runParentDistanceToResponse: lt.length > 0 ? responseIndex - (Se.get(lt[0].parent.uuid) ?? 0) : 0,
    promptDistanceToResponse: responseIndex - promptIndex,
    firstTurnCheckpointDelta: Kn,
  };
}
//@ chunk-e6aww6q8.js:309487-309678 placement
function findTurnStartByDuration(e, n) {
  for (let r = n + 1; r < e.length; r++) {
    let s = e[r];
    if (isRealUserPrompt(s)) return;
    if (s.type === "system" && s.subtype === "turn_duration" && typeof s.messageCount === "number")
      return r - s.messageCount;
  }
  return;
}
//@ chunk-e6aww6q8.js:309678-309871 placement
function countAnnouncementsUnder(e, n, r, s) {
  let h = 0,
    y = [e];
  for (let S = 0; y.length > 0 && S < gfo; S++) {
    let w = y.pop();
    if (r.has(w.uuid) || !isAuxiliaryEntry(w)) continue;
    if (getNullRenderingAttachmentType(w) !== void 0) (h++, s.add(w.uuid));
    y.push(...(n.get(w.uuid) ?? []));
  }
  return h;
}
/**
 * 收集首回合需要重放的公告（指令、会话上下文、项目文档已读等）。
 */
//@ chunk-e6aww6q8.js:309871-311738 placement
function collectFirstTurnAnnouncements(e) {
  let n = e.vetoed ? 0 : e.runs.reduce((r, s) => r + s.rows.length, 0);
  logEvent("tengu_chain_first_turn_announcements_off_chain", {
    eligible_row_count: n,
    eligible_run_count: e.vetoed ? 0 : e.runs.length,
    candidate_row_count: e.runs.reduce((r, s) => r + s.rows.length, 0),
    candidate_run_count: e.runs.length,
    run_has_instructions: e.candidateTypes.has("instructions"),
    run_has_session_context: e.candidateTypes.has("session_context"),
    run_has_context_sections: e.candidateTypes.has("context_sections"),
    run_has_project_doc_reads: e.candidateTypes.has("project_doc_reads"),
    run_has_coordinator_context: e.candidateTypes.has("coordinator_context"),
    run_has_date: e.candidateTypes.has("date"),
    declined_row_count: e.declinedRows,
    unanchored_row_count: e.unanchoredRows,
    non_announcement_run_count: e.nonAnnouncementRuns,
    declined_open_run: e.declinedOpenRun,
    declined_mixed_run: e.declinedMixedRun,
    declined_repeated_type: e.declinedRepeatedType,
    declined_replacing_copy: e.declinedReplacingCopy,
    declined_unreadable_row: e.declinedUnreadableRow,
    declined_bad_timestamp: e.declinedBadTimestamp,
    declined_type_on_chain: e.declinedTypeOnChain,
    declined_no_date: e.declinedNoDate,
    declined_checkpoint_disagrees: e.declinedCheckpointDisagrees,
    vetoed_multiple_runs: e.vetoedMultipleRuns,
    anchor_types_masked: e.anchorTypesMasked,
    vetoed_stray_first_copy: e.vetoedStrayFirstCopy,
    vetoed_later_first_copy_on_chain: e.vetoedLaterFirstCopyOnChain,
    vetoed_later_first_copy_off_chain: e.vetoedLaterFirstCopyOffChain,
    vetoed_unreadable_later_copy: e.vetoedUnreadableLaterCopy,
    vetoed_type_in_two_runs: e.vetoedTypeInTwoRuns,
    written_in_file_before_parent: e.writtenInFileBeforeParent,
    parent_is_prompt: e.parentIsPrompt,
    run_parent_distance_to_response: e.runParentDistanceToResponse,
    prompt_distance_to_response: e.promptDistanceToResponse,
    has_first_turn_checkpoint: e.firstTurnCheckpointDelta !== void 0,
    first_turn_checkpoint_delta: e.firstTurnCheckpointDelta ?? 0,
  });
}
/**
 * 统计恢复会话首回合的公告附件。
 */
//@ chunk-e6aww6q8.js:311738-313084 placement
function censusResumeAnnouncements(e, n) {
  try {
    let r = findFirstTurn(e),
      s = {};
    for (let S of REANNOUNCED_ATTACHMENT_TYPES) s[S] = 0;
    let h = !1,
      y = {};
    for (let S of REANNOUNCED_ATTACHMENT_TYPES) y[S] = 0;
    if (r !== void 0) {
      for (let S = 0; S < r.responseIndex; S++) {
        let w = e[S],
          L = getNullRenderingAttachmentType(w);
        if (L !== void 0) s[L] = (s[L] ?? 0) + 1;
        else if (
          w.type === "attachment" &&
          isPlainObject_4(w.attachment) &&
          w.attachment.type === "prompt_snapshot"
        )
          h = !0;
      }
      for (let S = r.responseIndex + 1; S < e.length; S++) {
        let w = e[S];
        if (isCompactBoundaryMessage_2(w)) break;
        let L = getNullRenderingAttachmentType(w);
        if (L !== void 0 && !N9(w)) y[L] = (y[L] ?? 0) + 1;
      }
    }
    logEvent("tengu_resume_first_turn_announcement_census", {
      has_first_turn: r !== void 0,
      has_compact_boundary: e.some((S) => isCompactBoundaryMessage_2(S)),
      prompt_index: r?.promptIndex ?? -1,
      rows_between_prompt_and_response: r === void 0 ? 0 : r.responseIndex - r.promptIndex - 1,
      instructions_count: s.instructions ?? 0,
      session_context_count: s.session_context ?? 0,
      context_sections_count: s.context_sections ?? 0,
      project_doc_reads_count: s.project_doc_reads ?? 0,
      coordinator_context_count: s.coordinator_context ?? 0,
      date_count: s.date ?? 0,
      has_prompt_snapshot: h,
      transcript_size_known: n !== void 0,
      over_prune_threshold: n !== void 0 && n > SKIP_PRECOMPACT_THRESHOLD,
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
var AHe = 500,
  weakMap_2 = new WeakMap(),
  weakMap_3 = new WeakMap(),
  weakMap_4 = new WeakMap(),
  weakMap_5 = new WeakMap();

export {
  efn,
  zbt,
  censusResumeAnnouncements,
  announceFirstTurnOnce,
  weakMap_2,
  weakMap_3,
  weakMap_5,
  AHe,
  weakMap_4,
  REANNOUNCED_ATTACHMENT_TYPES,
};
