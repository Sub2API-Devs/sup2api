/**
 * utils/transcript/resumeLoadReport.ts
 *
 * 2.1.316 新增：恢复加载报告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: affinity 1, placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../env.js";
import { SYNTHETIC_MODEL } from "../messages.js";
import { weakMap_2, weakMap_3, weakMap_5, MAX_ANNOUNCEMENTS, weakMap_4 } from "./resumeAnnouncements.js";
import { logError } from "../log.js";
import { countWhere } from "../collections.js";
import { logForDiagnosticsNoPII } from "../diagLogs.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:313978-314040 affinity (2.1.88 match: getDiagnosticLogFile, 1)
function getDiagnosticLogFile() {
  return Boolean(env.CLAUDE_CODE_DIAGNOSTICS_FILE);
}
//@ chunk-5xgkngpb.js:314040-314162 placement (2.1.88 match: extractErrorTypeFromData, 1)
function listBlockTypes(content) {
  return Array.isArray(content)
    ? content.map((block) =>
        typeof block === "object" && block !== null && "type" in block ? String(block.type) : "other",
      )
    : [];
}
//@ chunk-5xgkngpb.js:314162-314350 placement
function hasVisibleText(content) {
  if (typeof content === "string") return content.trim() !== "";
  return (
    Array.isArray(content) &&
    content.some(
      (block) =>
        typeof block === "object" &&
        block !== null &&
        "text" in block &&
        typeof block.text === "string" &&
        block.text.trim() !== "",
    )
  );
}
//@ chunk-5xgkngpb.js:314350-314929 placement
/**
 * 把转录末条消息归类用于恢复报告：助手消息分 synthetic/calls/text/thinking/blank，用户消息分 tool_result/summary/meta/prompt，其余按类型。
 */
function classifyTailMessage(entry) {
  if (entry === undefined) return "none";
  let content = entry.message?.content;
  let blockTypes = listBlockTypes(content);
  if (entry.type === "assistant") {
    if (entry.isApiErrorMessage || entry.message?.model === SYNTHETIC_MODEL) return "assistant_synthetic";
    if (blockTypes.includes("tool_use")) return "assistant_calls";
    if (hasVisibleText(content)) return "assistant_text";
    return blockTypes.some((blockType) => blockType === "thinking" || blockType === "redacted_thinking")
      ? "assistant_thinking"
      : "assistant_blank";
  }
  if (entry.type === "user") {
    if (blockTypes.includes("tool_result")) return "user_tool_result";
    if (entry.isCompactSummary) return "user_summary";
    return entry.isMeta ? "user_meta" : "user_prompt";
  }
  return entry.type === "attachment" || entry.type === "system" ? entry.type : "other";
}
//@ chunk-5xgkngpb.js:314929-315089 placement
function secondsBetween(timestamp, timestamp_2) {
  let timestamp_3 = Date.parse(timestamp ?? "");
  let seconds = typeof timestamp_2 === "number" ? timestamp_2 : Date.parse(timestamp_2 ?? "");
  return Number.isFinite(timestamp_3) && Number.isFinite(seconds)
    ? Math.round((seconds - timestamp_3) / 1000)
    : undefined;
}
//@ chunk-5xgkngpb.js:315089-315177 placement
function isCountedRow(row) {
  return !row.isSidechain && !(row.type === "system" && row.subtype === "file_snapshot");
}
//@ chunk-5xgkngpb.js:315177-315208 placement
function recordLoadReportFor(messages, report) {
  weakMap_2.set(messages, report);
}
//@ chunk-5xgkngpb.js:315208-315262 placement
function rememberValidatedTip(entry, updatedAt) {
  if (typeof updatedAt === "string") weakMap_3.set(entry, updatedAt);
}
//@ chunk-5xgkngpb.js:315262-315314 placement
function validatedTipOf(validatedCCRTip) {
  return validatedCCRTip === undefined ? undefined : weakMap_3.get(validatedCCRTip);
}
//@ chunk-5xgkngpb.js:315314-315374 placement
function rememberHydrateNote(project, sessionId, note) {
  if (getDiagnosticLogFile())
    weakMap_5.set(project, {
      sessionId,
      note,
    });
}
//@ chunk-5xgkngpb.js:315374-315445 placement
function recordLoadReportSafely(report, rows, priorRows, outcome) {
  if (!getDiagnosticLogFile()) return;
  try {
    recordLoadReport(report, rows, priorRows, outcome);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:315445-315881 placement
/**
 * 记录本次加载的行数与被排除的可见行（供恢复报告）。
 */
function recordLoadReport(report, rows, priorRows, pick) {
  let hydrateNote = pick && weakMap_5.get(pick.writer);
  if (pick) weakMap_5.delete(pick.writer);
  let countedRows = 0;
  for (let row of rows.values()) if (isCountedRow(row)) countedRows++;
  let leftOutRows = [];
  let leftOutTotal = 0;
  if (countedRows > countWhere(priorRows, isCountedRow)) {
    let priorUuids = new Set();
    for (let row of priorRows) priorUuids.add(row.uuid);
    for (let row of rows.values()) {
      if (!isCountedRow(row) || priorUuids.has(row.uuid)) continue;
      leftOutTotal++;
      leftOutRows.push(row);
      if (leftOutRows.length > 2 * MAX_ANNOUNCEMENTS) leftOutRows.splice(0, MAX_ANNOUNCEMENTS);
    }
  }
  weakMap_4.set(report, {
    hydrate: hydrateNote?.sessionId === pick?.sessionId ? hydrateNote?.note : undefined,
    pick: weakMap_2.get(rows),
    rowsLoaded: rows.size,
    leftOutTotal,
    leftOut: leftOutRows.slice(-MAX_ANNOUNCEMENTS),
  });
}
//@ chunk-5xgkngpb.js:315881-315923 placement
function reportResumeLoad(log) {
  try {
    buildResumeLoadReport(log);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:315923-318928 placement
/**
 * 生成恢复加载报告，记录加载了哪些消息。
 */
function buildResumeLoadReport({
  log,
  stored,
  verdict,
  rescueSuppressed,
  rewound,
  autoResume,
  openerVouched,
  supersededCalls,
  cutOffCalls,
  isTypedPrompt,
}) {
  let report = weakMap_4.get(log);
  if (report === undefined) return;
  weakMap_4.delete(log);
  let { hydrate } = report;
  if (verdict === "none" && report.leftOut.length === 0) return;
  let leftOut = report.leftOut;
  let lastIndex = stored.findLastIndex(isTypedPrompt);
  let timestamp = stored[Math.max(lastIndex, 0)]?.timestamp;
  let laterLeftOut =
    timestamp === undefined
      ? []
      : leftOut.filter((row) => typeof row.timestamp === "string" && row.timestamp > timestamp);
  let filtered = laterLeftOut.filter(isTypedPrompt);
  if (verdict === "none" && filtered.length === 0) return;
  logForDiagnosticsNoPII("warn", "resume_load_report", () => {
    let filtered_2 = laterLeftOut.filter((row) => classifyTailMessage(row) === "assistant_text");
    let lastIndex_2 = stored.findLastIndex((row) => row.type === "user" || row.type === "assistant");
    let tailRow = stored[lastIndex_2];
    let { pick } = report;
    let checkpoint = pick?.checkpoint;
    let markedUuids = new Set([
      checkpoint,
      pick?.lastRow,
      pick?.newestRow,
      ...leftOut.map((row) => row.parentUuid),
    ]);
    let positions = new Map();
    stored.forEach((row, position) => {
      if (markedUuids.has(row.uuid)) positions.set(row.uuid, position);
    });
    let leftOutByUuid = new Map(leftOut.map((row) => [row.uuid, row]));
    let branchTip = filtered.at(-1) ?? filtered_2.at(-1) ?? laterLeftOut.at(-1);
    let branchFirst;
    let parentPosition;
    let forkWalkParentNotFound = false;
    let walked = new Set();
    for (
      let row = branchTip;
      row !== undefined && !walked.has(row.uuid);
      row = leftOutByUuid.get(row.parentUuid ?? "")
    ) {
      walked.add(row.uuid);
      branchFirst = row;
      parentPosition = positions.get(row.parentUuid ?? "");
      if (parentPosition !== undefined) break;
      forkWalkParentNotFound = Boolean(row.parentUuid) && !leftOutByUuid.has(row.parentUuid ?? "");
    }
    let rowsAfterPrompt = lastIndex === -1 ? [] : stored.slice(lastIndex + 1);
    let checkpointPosition = positions.get(checkpoint ?? "");
    return {
      verdict,
      rescue_suppressed: rescueSuppressed,
      rewound,
      auto_resume: autoResume,
      opener_vouched: openerVouched,
      superseded_calls: supersededCalls,
      ...(cutOffCalls !== undefined && {
        interrupted_tail_kind: cutOffCalls.tailKind,
        cut_off_calls_shown: cutOffCalls.shown,
        cut_off_calls_answered_in_turn: cutOffCalls.inTurn,
        repeats_previous_cut_off_call: cutOffCalls.repeatsPrevious,
      }),
      stored_tail_row: classifyTailMessage(tailRow),
      stored_tail_age_s: secondsBetween(tailRow?.timestamp, Date.now()),
      rows_after_tail: stored.length - 1 - lastIndex_2,
      conversation_has_prompt: lastIndex !== -1,
      rows_after_last_prompt: rowsAfterPrompt.length,
      replies_after_last_prompt: countWhere(
        rowsAfterPrompt,
        (row) => classifyTailMessage(row) === "assistant_text",
      ),
      other_user_rows_after_last_prompt: countWhere(
        rowsAfterPrompt,
        (row) => row.type === "user" && classifyTailMessage(row) !== "user_tool_result",
      ),
      later_prompts_left_out: filtered.length,
      later_replies_left_out: filtered_2.length,
      later_rows_left_out: laterLeftOut.length,
      rows_left_out: report.leftOutTotal,
      rows_left_out_capped: report.leftOutTotal > leftOut.length,
      fork_rows_above_tail: parentPosition === undefined ? -1 : Math.max(lastIndex_2 - parentPosition, 0),
      fork_inside_last_turn: parentPosition !== undefined && lastIndex !== -1 && parentPosition >= lastIndex,
      fork_walk_parent_not_found: forkWalkParentNotFound,
      branch_first_row: classifyTailMessage(branchFirst),
      branch_tip_row: classifyTailMessage(branchTip),
      seconds_tail_to_branch_first: secondsBetween(tailRow?.timestamp, branchFirst?.timestamp),
      seconds_tail_to_branch_tip: secondsBetween(tailRow?.timestamp, branchTip?.timestamp),
      chose: pick?.chose ?? "none",
      pruned_before_fold: pick?.prunedBeforeFold ?? false,
      has_checkpoint: checkpoint !== undefined,
      checkpoint_ever_explicit: pick?.checkpointEverExplicit ?? false,
      checkpoint_names_tail: checkpointPosition !== undefined && checkpointPosition >= lastIndex_2,
      checkpoint_in_conversation: checkpointPosition !== undefined,
      checkpoint_has_child:
        (checkpointPosition !== undefined && checkpointPosition < lastIndex_2) ||
        (checkpoint !== undefined && leftOut.some((row) => row.parentUuid === checkpoint)),
      rows_after_last_checkpoint: pick?.rowsAfterLastCheckpoint ?? -1,
      last_row_in_conversation: positions.has(pick?.lastRow ?? ""),
      newest_row_in_conversation: positions.has(pick?.newestRow ?? ""),
      rows_loaded: report.rowsLoaded,
      hydrate: hydrate?.outcome ?? "none",
      ...(hydrate?.outcome === "ok" && {
        delta_fetch_applied: hydrate.deltaApplied,
        delta_events: hydrate.deltaEvents,
        delta_appended: hydrate.deltaAppended,
        delta_fallback_reason: hydrate.fallbackReason ?? "none",
        hydrate_wrote_file: hydrate.wroteFile,
        on_disk_bytes: hydrate.onDiskBytes,
        tip_age_s: hydrate.tipAgeSeconds,
      }),
    };
  });
}
//@ chunk-5xgkngpb.js:318928-318948 placement
var weakMap_6; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:318928", () => {
  weakMap_6 = new WeakMap();
});
//@ chunk-5xgkngpb.js:318948-318982 placement
function conversationChainOf(messages) {
  return weakMap_6.get(messages);
}
//@ chunk-5xgkngpb.js:318982-319305 placement
/**
 * 跟踪显式回退检查点后被剪掉的行。
 */
function createRewindTracker(byUuid) {
  let seen = new Set();
  return {
    noteCheckpoint(checkpoint) {
      if (checkpoint.explicit !== true) return;
      if (checkpoint.rewound !== true || checkpoint.cutUuid === undefined) {
        seen.clear();
        return;
      }
      let cutRow = byUuid.get(checkpoint.cutUuid);
      if (cutRow === undefined) return;
      dropAncestorsUntilBoundary(seen, byUuid, cutRow);
      if (!isConversationRow(cutRow)) seen.add(cutRow.uuid);
    },
    noteRow(row) {
      if (seen.size > 0) dropAncestorsUntilBoundary(seen, byUuid, row);
    },
    noteCompactBoundary() {
      seen.clear();
    },
    publish() {
      if (seen.size > 0) weakMap_6.set(byUuid, seen);
    },
  };
}
//@ chunk-5xgkngpb.js:319305-319472 placement
function dropAncestorsUntilBoundary(messages, byUuid, row) {
  let ancestorRow = row.parentUuid ? byUuid.get(row.parentUuid) : undefined;
  for (let idx = 0; idx < 64 && ancestorRow !== undefined && !isConversationRow(ancestorRow); idx++) {
    messages.delete(ancestorRow.uuid);
    ancestorRow = ancestorRow.parentUuid ? byUuid.get(ancestorRow.parentUuid) : undefined;
  }
}
//@ chunk-5xgkngpb.js:319472-319533 placement
function isConversationRow(row) {
  return row.type === "user" || row.type === "assistant";
}
export {
  rememberValidatedTip,
  validatedTipOf,
  rememberHydrateNote,
  conversationChainOf,
  createRewindTracker,
  recordLoadReportFor,
  recordLoadReportSafely,
  classifyTailMessage,
  reportResumeLoad,
};
