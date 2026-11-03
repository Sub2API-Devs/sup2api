/**
 * utils/transcript/resumeLoadReport.ts
 *
 * 2.1.316 新增：恢复加载报告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: placement 18
 */
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { getDiagnosticLogFile, logForDiagnosticsNoPII } from "../diagLogs.js";
import { weakMap_2, weakMap_3, weakMap_5, AHe, weakMap_4 } from "./resumeAnnouncements.js";
import { logError } from "../log.js";
import { count } from "../collections.js";

//@ chunk-e6aww6q8.js:313222-313344 placement = extractErrorTypeFromData (1)
function listBlockTypes(content) {
  return Array.isArray(content)
    ? content.map((n) => (typeof n === "object" && n !== null && "type" in n ? String(n.type) : "other"))
    : [];
}
//@ chunk-e6aww6q8.js:313344-313532 placement
function hasVisibleText(e) {
  if (typeof e === "string") return e.trim() !== "";
  return (
    Array.isArray(e) &&
    e.some(
      (n) =>
        typeof n === "object" &&
        n !== null &&
        "text" in n &&
        typeof n.text === "string" &&
        n.text.trim() !== "",
    )
  );
}
/**
 * 把转录末条消息归类用于恢复报告：助手消息分 synthetic/calls/text/thinking/blank，用户消息分 tool_result/summary/meta/prompt，其余按类型。
 */
//@ chunk-e6aww6q8.js:313532-314111 placement
function classifyTailMessage(e) {
  if (e === void 0) return "none";
  let n = e.message?.content,
    r = listBlockTypes(n);
  if (e.type === "assistant") {
    if (e.isApiErrorMessage || e.message?.model === SYNTHETIC_MODEL) return "assistant_synthetic";
    if (r.includes("tool_use")) return "assistant_calls";
    if (hasVisibleText(n)) return "assistant_text";
    return r.some((s) => s === "thinking" || s === "redacted_thinking")
      ? "assistant_thinking"
      : "assistant_blank";
  }
  if (e.type === "user") {
    if (r.includes("tool_result")) return "user_tool_result";
    if (e.isCompactSummary) return "user_summary";
    return e.isMeta ? "user_meta" : "user_prompt";
  }
  return e.type === "attachment" || e.type === "system" ? e.type : "other";
}
//@ chunk-e6aww6q8.js:314111-314271 placement
function secondsBetween(e, n) {
  let parse = Date.parse(e ?? ""),
    s = typeof n === "number" ? n : Date.parse(n ?? "");
  return Number.isFinite(parse) && Number.isFinite(s) ? Math.round((s - parse) / 1000) : void 0;
}
//@ chunk-e6aww6q8.js:314271-314359 placement
function PHe(e) {
  return !e.isSidechain && !(e.type === "system" && e.subtype === "file_snapshot");
}
//@ chunk-e6aww6q8.js:314359-314399 placement
function Hxt(e, n) {
  if (getDiagnosticLogFile()) weakMap_2.set(e, n);
}
//@ chunk-e6aww6q8.js:314399-314453 placement
function Bxt(e, n) {
  if (typeof n === "string") weakMap_3.set(e, n);
}
//@ chunk-e6aww6q8.js:314453-314505 placement
function DHe(e) {
  return e === void 0 ? void 0 : weakMap_3.get(e);
}
//@ chunk-e6aww6q8.js:314505-314565 placement
function F9(e, n, r) {
  if (getDiagnosticLogFile()) weakMap_5.set(e, { sessionId: n, note: r });
}
//@ chunk-e6aww6q8.js:314565-314636 placement
function Uxt(e, n, r, s) {
  if (!getDiagnosticLogFile()) return;
  try {
    recordLoadReport(e, n, r, s);
  } catch (error) {
    logError(error);
  }
}
/**
 * 记录本次加载的行数与被排除的可见行（供恢复报告）。
 */
//@ chunk-e6aww6q8.js:314636-315072 placement
function recordLoadReport(e, n, r, s) {
  let h = s && weakMap_5.get(s.writer);
  if (s) weakMap_5.delete(s.writer);
  let y = 0;
  for (let L of n.values()) if (PHe(L)) y++;
  let S = [],
    w = 0;
  if (y > count(r, PHe)) {
    let L = new Set();
    for (let G of r) L.add(G.uuid);
    for (let G of n.values()) {
      if (!PHe(G) || L.has(G.uuid)) continue;
      if ((w++, S.push(G), S.length > 2 * AHe)) S.splice(0, AHe);
    }
  }
  weakMap_4.set(e, {
    hydrate: h?.sessionId === s?.sessionId ? h?.note : void 0,
    pick: weakMap_2.get(n),
    rowsLoaded: n.size,
    leftOutTotal: w,
    leftOut: S.slice(-AHe),
  });
}
//@ chunk-e6aww6q8.js:315072-315114 placement
function jxt(e) {
  try {
    buildResumeLoadReport(e);
  } catch (error) {
    logError(error);
  }
}
/**
 * 生成恢复加载报告，记录加载了哪些消息。
 */
//@ chunk-e6aww6q8.js:315114-318109 placement
function buildResumeLoadReport({
  log: log,
  stored: stored,
  verdict: verdict,
  rescueSuppressed: rescueSuppressed,
  rewound: rewound,
  autoResume: autoResume,
  openerVouched: openerVouched,
  supersededCalls: supersededCalls,
  cutOffCalls: cutOffCalls,
  isTypedPrompt: isTypedPrompt,
}) {
  let q = weakMap_4.get(log);
  if (q === void 0) return;
  weakMap_4.delete(log);
  let { hydrate: hydrate } = q;
  if (verdict === "none" && q.leftOut.length === 0) return;
  let leftOut = q.leftOut,
    lastIndex = stored.findLastIndex(isTypedPrompt),
    we = stored[Math.max(lastIndex, 0)]?.timestamp,
    Ee = we === void 0 ? [] : leftOut.filter((Ie) => typeof Ie.timestamp === "string" && Ie.timestamp > we),
    filtered = Ee.filter(isTypedPrompt);
  if (verdict === "none" && filtered.length === 0) return;
  logForDiagnosticsNoPII("warn", "resume_load_report", () => {
    let filtered_2 = Ee.filter((Zt) => classifyTailMessage(Zt) === "assistant_text"),
      lastIndex_2 = stored.findLastIndex((Zt) => Zt.type === "user" || Zt.type === "assistant"),
      We = stored[lastIndex_2],
      { pick: pick } = q,
      lt = pick?.checkpoint,
      Je = new Set([lt, pick?.lastRow, pick?.newestRow, ...leftOut.map((Zt) => Zt.parentUuid)]),
      nt = new Map();
    stored.forEach((Zt, rn) => {
      if (Je.has(Zt.uuid)) nt.set(Zt.uuid, rn);
    });
    let pt = new Map(leftOut.map((Zt) => [Zt.uuid, Zt])),
      Et = filtered.at(-1) ?? filtered_2.at(-1) ?? Ee.at(-1),
      yt,
      gt,
      At = !1,
      It = new Set();
    for (let Zt = Et; Zt !== void 0 && !It.has(Zt.uuid); Zt = pt.get(Zt.parentUuid ?? "")) {
      if ((It.add(Zt.uuid), (yt = Zt), (gt = nt.get(Zt.parentUuid ?? "")), gt !== void 0)) break;
      At = Boolean(Zt.parentUuid) && !pt.has(Zt.parentUuid ?? "");
    }
    let Yt = lastIndex === -1 ? [] : stored.slice(lastIndex + 1),
      qt = nt.get(lt ?? "");
    return {
      verdict: verdict,
      rescue_suppressed: rescueSuppressed,
      rewound: rewound,
      auto_resume: autoResume,
      opener_vouched: openerVouched,
      superseded_calls: supersededCalls,
      ...(cutOffCalls !== void 0 && {
        interrupted_tail_kind: cutOffCalls.tailKind,
        cut_off_calls_shown: cutOffCalls.shown,
        cut_off_calls_answered_in_turn: cutOffCalls.inTurn,
        repeats_previous_cut_off_call: cutOffCalls.repeatsPrevious,
      }),
      stored_tail_row: classifyTailMessage(We),
      stored_tail_age_s: secondsBetween(We?.timestamp, Date.now()),
      rows_after_tail: stored.length - 1 - lastIndex_2,
      conversation_has_prompt: lastIndex !== -1,
      rows_after_last_prompt: Yt.length,
      replies_after_last_prompt: count(Yt, (Zt) => classifyTailMessage(Zt) === "assistant_text"),
      other_user_rows_after_last_prompt: count(
        Yt,
        (Zt) => Zt.type === "user" && classifyTailMessage(Zt) !== "user_tool_result",
      ),
      later_prompts_left_out: filtered.length,
      later_replies_left_out: filtered_2.length,
      later_rows_left_out: Ee.length,
      rows_left_out: q.leftOutTotal,
      rows_left_out_capped: q.leftOutTotal > leftOut.length,
      fork_rows_above_tail: gt === void 0 ? -1 : Math.max(lastIndex_2 - gt, 0),
      fork_inside_last_turn: gt !== void 0 && lastIndex !== -1 && gt >= lastIndex,
      fork_walk_parent_not_found: At,
      branch_first_row: classifyTailMessage(yt),
      branch_tip_row: classifyTailMessage(Et),
      seconds_tail_to_branch_first: secondsBetween(We?.timestamp, yt?.timestamp),
      seconds_tail_to_branch_tip: secondsBetween(We?.timestamp, Et?.timestamp),
      chose: pick?.chose ?? "none",
      pruned_before_fold: pick?.prunedBeforeFold ?? !1,
      has_checkpoint: lt !== void 0,
      checkpoint_ever_explicit: pick?.checkpointEverExplicit ?? !1,
      checkpoint_names_tail: qt !== void 0 && qt >= lastIndex_2,
      checkpoint_in_conversation: qt !== void 0,
      checkpoint_has_child:
        (qt !== void 0 && qt < lastIndex_2) || (lt !== void 0 && leftOut.some((Zt) => Zt.parentUuid === lt)),
      rows_after_last_checkpoint: pick?.rowsAfterLastCheckpoint ?? -1,
      last_row_in_conversation: nt.has(pick?.lastRow ?? ""),
      newest_row_in_conversation: nt.has(pick?.newestRow ?? ""),
      rows_loaded: q.rowsLoaded,
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
//@ chunk-e6aww6q8.js:318109-318129 placement
var weakMap_6 = new WeakMap();
//@ chunk-e6aww6q8.js:318129-318163 placement
function zxt(e) {
  return weakMap_6.get(e);
}
/**
 * 跟踪显式回退检查点后被剪掉的行。
 */
//@ chunk-e6aww6q8.js:318163-318486 placement
function createRewindTracker(e) {
  let n = new Set();
  return {
    noteCheckpoint(r) {
      if (r.explicit !== !0) return;
      if (r.rewound !== !0 || r.cutUuid === void 0) {
        n.clear();
        return;
      }
      let s = e.get(r.cutUuid);
      if (s === void 0) return;
      if ((dropAncestorsUntilBoundary(n, e, s), !Xxt(s))) n.add(s.uuid);
    },
    noteRow(r) {
      if (n.size > 0) dropAncestorsUntilBoundary(n, e, r);
    },
    noteCompactBoundary() {
      n.clear();
    },
    publish() {
      if (n.size > 0) weakMap_6.set(e, n);
    },
  };
}
//@ chunk-e6aww6q8.js:318486-318653 placement
function dropAncestorsUntilBoundary(e, n, r) {
  let s = r.parentUuid ? n.get(r.parentUuid) : void 0;
  for (let h = 0; h < 64 && s !== void 0 && !Xxt(s); h++)
    (e.delete(s.uuid), (s = s.parentUuid ? n.get(s.parentUuid) : void 0));
}
//@ chunk-e6aww6q8.js:318653-318714 placement
function Xxt(e) {
  return e.type === "user" || e.type === "assistant";
}

export { classifyTailMessage, jxt, Bxt, DHe, F9, zxt, createRewindTracker, Hxt, Uxt };
