/**
 * utils/transcript/transcriptWriter.ts
 *
 * 2.1.316 新增：转录写入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (15)
 * attribution: placement 15
 */
import {
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { createToolResultSlimmer } from "../wireToolInputEcho.js";
import { logError } from "../log.js";
import { mainTranscriptKeyOf } from "./transcriptFiles.js";
import { getErrnoCode, sanitizedErrCodeForTelemetry } from "../errors.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:325108-325238 placement
function createToolResultSlimmer_2() {
  let e = createToolResultSlimmer();
  return (n) => {
    try {
      let r = e(n)?.slim();
      return r === void 0 ? n : { ...n, toolUseResult: r };
    } catch (error) {
      return (logError(error), n);
    }
  };
}
//@ chunk-e6aww6q8.js:325238-325330 placement
function bPt(e) {
  let n = createToolResultSlimmer(),
    r = 0;
  for (let s of e)
    try {
      r += n(s)?.chars ?? 0;
    } catch (error) {
      logError(error);
    }
  return r;
}
//@ chunk-e6aww6q8.js:325359-325543 placement
var FATAL_WRITE_ERRORS = new Set(["ENOSPC", "EROFS", "EDQUOT", "ENAMETOOLONG"]),
  PERMISSION_WRITE_ERRORS = new Set(["EACCES", "EPERM"]),
  WRITE_ERROR_REASONS = new Map([
    ["ENOSPC", "enospc"],
    ["EACCES", "eacces"],
    ["EPERM", "eacces"],
    ["EROFS", "erofs"],
  ]);
//@ chunk-e6aww6q8.js:325543-325627 placement = getUnameSR (0.793)
function getUnameSR_2(e, n) {
  if (e === void 0) return !1;
  return FATAL_WRITE_ERRORS.has(e) || (n !== "win32" && PERMISSION_WRITE_ERRORS.has(e));
}
//@ chunk-e6aww6q8.js:325627-325658 placement
var $fo = 3,
  Hfo = 60000,
  Bfo = 300000;
//@ chunk-e6aww6q8.js:325658-325829 placement
function isSidecarOfMainKey(e, n, r) {
  let s = mainTranscriptKeyOf(n.key),
    { key: key } = e;
  return (
    s !== void 0 &&
    key.namespace === "transcript" &&
    mainTranscriptKeyOf(key) === void 0 &&
    key.sessionId === s.sessionId &&
    (r || key.projectKey === s.projectKey)
  );
}
//@ chunk-e6aww6q8.js:325829-325944 placement
function matchesPrefix(e, n) {
  return typeof e === "string"
    ? typeof n === "string" && e.startsWith(n)
    : typeof n !== "string" && isSidecarOfMainKey(e, n, !1);
}
//@ chunk-e6aww6q8.js:325944-326057 placement
function matchesMarker(e, n) {
  return typeof e === "string"
    ? typeof n === "string" && e.includes(n)
    : typeof n !== "string" && isSidecarOfMainKey(e, n, !0);
}
//@ chunk-e6aww6q8.js:326057-326076 placement
var H9 = "<no-file>";
//@ chunk-e6aww6q8.js:326076-326319 placement
function isLiveServedPath(e, n) {
  if (e.liveServing === null) return !1;
  if (n === e.liveServing.mainFile) return !0;
  if (e.liveServing.sidecarPrefix !== null && matchesPrefix(n, e.liveServing.sidecarPrefix)) return !0;
  return e.liveServing.sidMarker !== null && matchesMarker(n, e.liveServing.sidMarker);
}
//@ chunk-e6aww6q8.js:326319-326468 placement
function isAbandonedPath(e, n) {
  if (e.abandonedPaths.has(n) || e.abandonedPendingPaths.has(n)) return !0;
  for (let abandonedPrefixe of e.abandonedPrefixes) if (matchesPrefix(n, abandonedPrefixe)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:326468-326517 placement
var Wfo = new Set(["drain", "materialize", "adopt"]);
//@ chunk-e6aww6q8.js:326517-327410 placement
function reportTranscriptWriteFailure(e, n, r, s, h = Date.now()) {
  let y = getErrnoCode(r);
  e.failureSeq++;
  let S = s ?? H9,
    w = e.failuresByFile.get(S),
    G =
      w !== void 0 && h - w.lastAtMs < Bfo
        ? { consecutive: w.consecutive + 1, firstAtMs: w.firstAtMs, lastAtMs: h }
        : { consecutive: 1, firstAtMs: h, lastAtMs: h };
  if ((e.failuresByFile.set(S, G), !e.latchingEnabled && S !== H9))
    (e.abandonedPaths.add(S), e.abandonedPendingPaths.delete(S));
  if (
    e.degradedStore.getState() === null &&
    S !== H9 &&
    Wfo.has(n) &&
    e.latchingEnabled &&
    !isAbandonedPath(e, S)
  ) {
    let q = G.consecutive >= $fo && h - G.firstAtMs >= Hfo;
    if (getUnameSR_2(y, "linux") || q)
      (e.degradedStore.setState(() => ({ code: y ?? "unknown", source: n, filePath: S })),
        logFeatureSad("session_transcript_write", WRITE_ERROR_REASONS.get(y ?? "") ?? "other", {
          source: fromEnum(n),
          consecutive_failures: G.consecutive,
          sustained: q,
        }));
  }
  logEvent("tengu_transcript_write_failed", {
    source: fromEnum(n),
    errno_code: sanitizedErrCodeForTelemetry(r) ?? lit_2("none"),
    errno_enospc: y === "ENOSPC",
    errno_emfile: y === "EMFILE",
    consecutive_failures: G.consecutive,
    degraded: e.degradedStore.getState() !== null,
  });
}
/**
 * 写成功：首次记 ok，清失败计数，降级状态恢复时记 tengu_transcript_writer_recovered。
 */
//@ chunk-e6aww6q8.js:327410-327793 placement
function noteTranscriptWriteOk(e, n) {
  if (!e.firstWriteOkEmitted) ((e.firstWriteOkEmitted = !0), logFeatureOk("session_transcript_write"));
  if ((e.failuresByFile.delete(n), isLiveServedPath(e, n))) e.abandonedPendingPaths.delete(n);
  let state = e.degradedStore.getState();
  if (state?.filePath === n)
    (e.degradedStore.setState(() => null),
      logEvent("tengu_transcript_writer_recovered", { source: fromEnum(state.source) }),
      logFeatureOk("session_transcript_write", { recovered: !0, source: fromEnum(state.source) }));
}
/**
 * 写入转录 .jsonl 文件。
 */
//@ chunk-e6aww6q8.js:327793-329597 placement
function writeTranscriptFile(e, n, r, s = sep_5, h = []) {
  let y = (q) => (typeof q !== "string" ? q : q.endsWith(".jsonl") ? `${q.slice(0, -6)}${s}` : null),
    S = r === null ? null : y(r);
  if (r !== null) {
    if (((e.latchingEnabled = !0), e.abandonedPaths.delete(r), e.abandonedPendingPaths.delete(r), S !== null))
      e.abandonedPrefixes.delete(S);
    let q = typeof r === "string" ? r.slice(r.lastIndexOf(s) + 1) : void 0,
      Z = q?.endsWith(".jsonl") ? q.slice(0, -6) : null,
      Se = typeof r !== "string" ? r : Z !== null ? `${s}${Z}${s}` : null;
    if (Se !== null) {
      for (let abandonedPath of e.abandonedPaths)
        if (matchesMarker(abandonedPath, Se)) e.abandonedPaths.delete(abandonedPath);
    }
    e.liveServing = { mainFile: r, sidecarPrefix: S, sidMarker: Se };
  }
  if (n === null || n === r) {
    if (r === null) {
      ((e.latchingEnabled = !1), (e.liveServing = null));
      for (let q of e.failuresByFile.keys()) if (q !== H9) e.abandonedPaths.add(q);
      for (let q of h) if (!e.failuresByFile.has(q)) e.abandonedPendingPaths.add(q);
      if ((e.failuresByFile.clear(), e.degradedStore.getState() !== null))
        e.degradedStore.setState(() => null);
    }
    return;
  }
  let w = y(n);
  if (r === null) {
    if (
      ((e.latchingEnabled = !1),
      (e.liveServing = null),
      e.abandonedPaths.clear(),
      e.abandonedPrefixes.clear(),
      e.abandonedPendingPaths.clear(),
      e.abandonedPaths.add(n),
      w !== null)
    )
      e.abandonedPrefixes.add(w);
    for (let q of e.failuresByFile.keys()) if (q !== H9) e.abandonedPaths.add(q);
    for (let q of h) if (!e.failuresByFile.has(q)) e.abandonedPendingPaths.add(q);
    if ((e.failuresByFile.clear(), e.degradedStore.getState() !== null)) e.degradedStore.setState(() => null);
    return;
  }
  let L = (q) => {
    if (q === n) return r;
    if (w !== null && matchesPrefix(q, w))
      return typeof q !== "string" || typeof w !== "string" || typeof S !== "string"
        ? null
        : S + q.slice(w.length);
    return q;
  };
  for (let [q, Z] of Array.from(e.failuresByFile.entries())) {
    let Se = L(q);
    if (Se !== q) {
      if ((e.failuresByFile.delete(q), Se !== null)) e.failuresByFile.set(Se, Z);
    }
  }
  let state = e.degradedStore.getState();
  if (state !== null) {
    let q = L(state.filePath);
    if (q !== state.filePath) e.degradedStore.setState(() => (q === null ? null : { ...state, filePath: q }));
  }
}

export {
  createToolResultSlimmer_2,
  writeTranscriptFile,
  reportTranscriptWriteFailure,
  noteTranscriptWriteOk,
  bPt,
};
