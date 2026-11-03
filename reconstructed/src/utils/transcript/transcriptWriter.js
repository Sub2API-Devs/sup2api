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
import { sep } from "path";
import { createToolResultSlimmer } from "../wireToolInputEcho.js";
import { logError } from "../log.js";
import { mainTranscriptKeyOf } from "./transcriptFiles.js";
import { getErrnoCode, sanitizedErrCodeForTelemetry } from "../errors.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-e6aww6q8.js:325108-325238 placement
function createToolResultSlimmer_2() {
  let toolResultSlimmer = createToolResultSlimmer();
  return (n) => {
    try {
      let r = toolResultSlimmer(n)?.slim();
      return r === undefined
        ? n
        : {
            ...n,
            toolUseResult: r,
          };
    } catch (error) {
      logError(error);
      return n;
    }
  };
}
//@ chunk-e6aww6q8.js:325238-325330 placement
function slimCharsOf(e) {
  let toolResultSlimmer = createToolResultSlimmer();
  let r = 0;
  for (let s of e)
    try {
      r += toolResultSlimmer(s)?.chars ?? 0;
    } catch (error) {
      logError(error);
    }
  return r;
}
//@ chunk-e6aww6q8.js:325359-325543 placement
var FATAL_WRITE_ERRORS = new Set(["ENOSPC", "EROFS", "EDQUOT", "ENAMETOOLONG"]);
var PERMISSION_WRITE_ERRORS = new Set(["EACCES", "EPERM"]);
var WRITE_ERROR_REASONS = new Map([
  ["ENOSPC", "enospc"],
  ["EACCES", "eacces"],
  ["EPERM", "eacces"],
  ["EROFS", "erofs"],
]);
//@ chunk-e6aww6q8.js:325543-325627 placement = getUnameSR (0.793)
function getUnameSR_2(errnoCode, n) {
  if (errnoCode === undefined) return false;
  return FATAL_WRITE_ERRORS.has(errnoCode) || (n !== "win32" && PERMISSION_WRITE_ERRORS.has(errnoCode));
}
//@ chunk-e6aww6q8.js:325627-325658 placement
var FAILURE_REPORT_THRESHOLD = 3;
var FAILURE_SPAN_MS = 60000;
var OK_REPORT_QUIET_MS = 300000;
//@ chunk-e6aww6q8.js:325658-325829 placement
function isSidecarOfMainKey(e, n, r) {
  let s = mainTranscriptKeyOf(n.key);
  let { key } = e;
  return (
    s !== undefined &&
    key.namespace === "transcript" &&
    mainTranscriptKeyOf(key) === undefined &&
    key.sessionId === s.sessionId &&
    (r || key.projectKey === s.projectKey)
  );
}
//@ chunk-e6aww6q8.js:325829-325944 placement
function matchesPrefix(e, n) {
  return typeof e === "string"
    ? typeof n === "string" && e.startsWith(n)
    : typeof n !== "string" && isSidecarOfMainKey(e, n, false);
}
//@ chunk-e6aww6q8.js:325944-326057 placement
function matchesMarker(e, n) {
  return typeof e === "string"
    ? typeof n === "string" && e.includes(n)
    : typeof n !== "string" && isSidecarOfMainKey(e, n, true);
}
//@ chunk-e6aww6q8.js:326057-326076 placement
var UNKNOWN_FILE_KEY = "<no-file>";
//@ chunk-e6aww6q8.js:326076-326319 placement
function isLiveServedPath(e, n) {
  if (e.liveServing === null) return false;
  if (n === e.liveServing.mainFile) return true;
  if (e.liveServing.sidecarPrefix !== null && matchesPrefix(n, e.liveServing.sidecarPrefix)) return true;
  return e.liveServing.sidMarker !== null && matchesMarker(n, e.liveServing.sidMarker);
}
//@ chunk-e6aww6q8.js:326319-326468 placement
function isAbandonedPath(e, n) {
  if (e.abandonedPaths.has(n) || e.abandonedPendingPaths.has(n)) return true;
  for (let abandonedPrefix of e.abandonedPrefixes) if (matchesPrefix(n, abandonedPrefix)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:326468-326517 placement
var FLUSH_OPERATIONS = new Set(["drain", "materialize", "adopt"]);
//@ chunk-e6aww6q8.js:326517-327410 placement
function reportTranscriptWriteFailure(writerHealth, n, error, s, h = Date.now()) {
  let errnoCode = getErrnoCode(error);
  writerHealth.failureSeq++;
  let S = s ?? UNKNOWN_FILE_KEY;
  let w = writerHealth.failuresByFile.get(S);
  let G =
    w !== undefined && h - w.lastAtMs < OK_REPORT_QUIET_MS
      ? {
          consecutive: w.consecutive + 1,
          firstAtMs: w.firstAtMs,
          lastAtMs: h,
        }
      : {
          consecutive: 1,
          firstAtMs: h,
          lastAtMs: h,
        };
  writerHealth.failuresByFile.set(S, G);
  if (!writerHealth.latchingEnabled && S !== UNKNOWN_FILE_KEY) {
    writerHealth.abandonedPaths.add(S);
    writerHealth.abandonedPendingPaths.delete(S);
  }
  if (
    writerHealth.degradedStore.getState() === null &&
    S !== UNKNOWN_FILE_KEY &&
    FLUSH_OPERATIONS.has(n) &&
    writerHealth.latchingEnabled &&
    !isAbandonedPath(writerHealth, S)
  ) {
    let q = G.consecutive >= FAILURE_REPORT_THRESHOLD && h - G.firstAtMs >= FAILURE_SPAN_MS;
    if (getUnameSR_2(errnoCode, "linux") || q) {
      writerHealth.degradedStore.setState(() => ({
        code: errnoCode ?? "unknown",
        source: n,
        filePath: S,
      }));
      logFeatureSad("session_transcript_write", WRITE_ERROR_REASONS.get(errnoCode ?? "") ?? "other", {
        source: fromEnum(n),
        consecutive_failures: G.consecutive,
        sustained: q,
      });
    }
  }
  logEvent("tengu_transcript_write_failed", {
    source: fromEnum(n),
    errno_code: sanitizedErrCodeForTelemetry(error) ?? lit_2("none"),
    errno_enospc: errnoCode === "ENOSPC",
    errno_emfile: errnoCode === "EMFILE",
    consecutive_failures: G.consecutive,
    degraded: writerHealth.degradedStore.getState() !== null,
  });
}
//@ chunk-e6aww6q8.js:327410-327793 placement
/**
 * 写成功：首次记 ok，清失败计数，降级状态恢复时记 tengu_transcript_writer_recovered。
 */
function noteTranscriptWriteOk(writerHealth, n) {
  if (!writerHealth.firstWriteOkEmitted) {
    writerHealth.firstWriteOkEmitted = true;
    logFeatureOk("session_transcript_write");
  }
  writerHealth.failuresByFile.delete(n);
  if (isLiveServedPath(writerHealth, n)) writerHealth.abandonedPendingPaths.delete(n);
  let state = writerHealth.degradedStore.getState();
  if (state?.filePath === n) {
    writerHealth.degradedStore.setState(() => null);
    logEvent("tengu_transcript_writer_recovered", {
      source: fromEnum(state.source),
    });
    logFeatureOk("session_transcript_write", {
      recovered: true,
      source: fromEnum(state.source),
    });
  }
}
//@ chunk-e6aww6q8.js:327793-329597 placement
/**
 * 写入转录 .jsonl 文件。
 */
function writeTranscriptFile(writerHealth, sessionFile, r, s = sep, h = []) {
  let y = (q) => (typeof q !== "string" ? q : q.endsWith(".jsonl") ? `${q.slice(0, -6)}${s}` : null);
  let S = r === null ? null : y(r);
  if (r !== null) {
    writerHealth.latchingEnabled = true;
    writerHealth.abandonedPaths.delete(r);
    writerHealth.abandonedPendingPaths.delete(r);
    if (S !== null) writerHealth.abandonedPrefixes.delete(S);
    let q = typeof r === "string" ? r.slice(r.lastIndexOf(s) + 1) : undefined;
    let Z = q?.endsWith(".jsonl") ? q.slice(0, -6) : null;
    let Se = typeof r !== "string" ? r : Z !== null ? `${s}${Z}${s}` : null;
    if (Se !== null) {
      for (let abandonedPath of writerHealth.abandonedPaths)
        if (matchesMarker(abandonedPath, Se)) writerHealth.abandonedPaths.delete(abandonedPath);
    }
    writerHealth.liveServing = {
      mainFile: r,
      sidecarPrefix: S,
      sidMarker: Se,
    };
  }
  if (sessionFile === null || sessionFile === r) {
    if (r === null) {
      writerHealth.latchingEnabled = false;
      writerHealth.liveServing = null;
      for (let key of writerHealth.failuresByFile.keys())
        if (key !== UNKNOWN_FILE_KEY) writerHealth.abandonedPaths.add(key);
      for (let q of h) if (!writerHealth.failuresByFile.has(q)) writerHealth.abandonedPendingPaths.add(q);
      writerHealth.failuresByFile.clear();
      if (writerHealth.degradedStore.getState() !== null) writerHealth.degradedStore.setState(() => null);
    }
    return;
  }
  let w = y(sessionFile);
  if (r === null) {
    writerHealth.latchingEnabled = false;
    writerHealth.liveServing = null;
    writerHealth.abandonedPaths.clear();
    writerHealth.abandonedPrefixes.clear();
    writerHealth.abandonedPendingPaths.clear();
    writerHealth.abandonedPaths.add(sessionFile);
    if (w !== null) writerHealth.abandonedPrefixes.add(w);
    for (let key of writerHealth.failuresByFile.keys())
      if (key !== UNKNOWN_FILE_KEY) writerHealth.abandonedPaths.add(key);
    for (let q of h) if (!writerHealth.failuresByFile.has(q)) writerHealth.abandonedPendingPaths.add(q);
    writerHealth.failuresByFile.clear();
    if (writerHealth.degradedStore.getState() !== null) writerHealth.degradedStore.setState(() => null);
    return;
  }
  let L = (q) => {
    if (q === sessionFile) return r;
    if (w !== null && matchesPrefix(q, w))
      return typeof q !== "string" || typeof w !== "string" || typeof S !== "string"
        ? null
        : S + q.slice(w.length);
    return q;
  };
  for (let [q, Z] of Array.from(writerHealth.failuresByFile.entries())) {
    let Se = L(q);
    if (Se !== q) {
      writerHealth.failuresByFile.delete(q);
      if (Se !== null) writerHealth.failuresByFile.set(Se, Z);
    }
  }
  let state = writerHealth.degradedStore.getState();
  if (state !== null) {
    let q = L(state.filePath);
    if (q !== state.filePath)
      writerHealth.degradedStore.setState(() =>
        q === null
          ? null
          : {
              ...state,
              filePath: q,
            },
      );
  }
}
export {
  createToolResultSlimmer_2,
  writeTranscriptFile,
  reportTranscriptWriteFailure,
  noteTranscriptWriteOk,
  slimCharsOf,
};
