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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:325108-325238 placement
function createToolResultSlimmer_2() {
  let toolResultSlimmer = createToolResultSlimmer();
  return (slim) => {
    try {
      let slimmed = toolResultSlimmer(slim)?.slim();
      return slimmed === undefined
        ? slim
        : {
            ...slim,
            toolUseResult: slimmed,
          };
    } catch (error) {
      logError(error);
      return slim;
    }
  };
}
//@ chunk-e6aww6q8.js:325238-325330 placement
function slimCharsOf(content) {
  let toolResultSlimmer = createToolResultSlimmer();
  let slimChars = 0;
  for (let block of content)
    try {
      slimChars += toolResultSlimmer(block)?.chars ?? 0;
    } catch (error) {
      logError(error);
    }
  return slimChars;
}
//@ chunk-e6aww6q8.js:325359-325543 placement
var FATAL_WRITE_ERRORS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PERMISSION_WRITE_ERRORS;
var WRITE_ERROR_REASONS;
deferInit("chunk-e6aww6q8.js:325359", () => {
  FATAL_WRITE_ERRORS = new Set(["ENOSPC", "EROFS", "EDQUOT", "ENAMETOOLONG"]);
  PERMISSION_WRITE_ERRORS = new Set(["EACCES", "EPERM"]);
  WRITE_ERROR_REASONS = new Map([
    ["ENOSPC", "enospc"],
    ["EACCES", "eacces"],
    ["EPERM", "eacces"],
    ["EROFS", "erofs"],
  ]);
});
//@ chunk-e6aww6q8.js:325543-325627 placement (2.1.88 match: getUnameSR, 0.793)
function getUnameSR_2(errnoCode, platform) {
  if (errnoCode === undefined) return false;
  return (
    FATAL_WRITE_ERRORS.has(errnoCode) || (platform !== "win32" && PERMISSION_WRITE_ERRORS.has(errnoCode))
  );
}
//@ chunk-e6aww6q8.js:325627-325658 placement
var FAILURE_REPORT_THRESHOLD = 3;
var FAILURE_SPAN_MS = 60000;
var OK_REPORT_QUIET_MS = 300000;
//@ chunk-e6aww6q8.js:325658-325829 placement
function isSidecarOfMainKey(writerHealth, pathKey, sameProjectOnly) {
  let mainKey = mainTranscriptKeyOf(pathKey.key);
  let { key } = writerHealth;
  return (
    mainKey !== undefined &&
    key.namespace === "transcript" &&
    mainTranscriptKeyOf(key) === undefined &&
    key.sessionId === mainKey.sessionId &&
    (sameProjectOnly || key.projectKey === mainKey.projectKey)
  );
}
//@ chunk-e6aww6q8.js:325829-325944 placement
function matchesPrefix(key, prefix) {
  return typeof key === "string"
    ? typeof prefix === "string" && key.startsWith(prefix)
    : typeof prefix !== "string" && isSidecarOfMainKey(key, prefix, false);
}
//@ chunk-e6aww6q8.js:325944-326057 placement
function matchesMarker(key, marker) {
  return typeof key === "string"
    ? typeof marker === "string" && key.includes(marker)
    : typeof marker !== "string" && isSidecarOfMainKey(key, marker, true);
}
//@ chunk-e6aww6q8.js:326057-326076 placement
var UNKNOWN_FILE_KEY = "<no-file>";
//@ chunk-e6aww6q8.js:326076-326319 placement
function isLiveServedPath(writerHealth, path) {
  if (writerHealth.liveServing === null) return false;
  if (path === writerHealth.liveServing.mainFile) return true;
  if (
    writerHealth.liveServing.sidecarPrefix !== null &&
    matchesPrefix(path, writerHealth.liveServing.sidecarPrefix)
  )
    return true;
  return (
    writerHealth.liveServing.sidMarker !== null && matchesMarker(path, writerHealth.liveServing.sidMarker)
  );
}
//@ chunk-e6aww6q8.js:326319-326468 placement
function isAbandonedPath(writerHealth, path) {
  if (writerHealth.abandonedPaths.has(path) || writerHealth.abandonedPendingPaths.has(path)) return true;
  for (let abandonedPrefix of writerHealth.abandonedPrefixes)
    if (matchesPrefix(path, abandonedPrefix)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:326468-326517 placement
var FLUSH_OPERATIONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:326468", () => {
  FLUSH_OPERATIONS = new Set(["drain", "materialize", "adopt"]);
});
//@ chunk-e6aww6q8.js:326517-327410 placement
function reportTranscriptWriteFailure(writerHealth, source, error, fileKey, nowMs = Date.now()) {
  let errnoCode = getErrnoCode(error);
  writerHealth.failureSeq++;
  let failureKey = fileKey ?? UNKNOWN_FILE_KEY;
  let previous = writerHealth.failuresByFile.get(failureKey);
  let failureState =
    previous !== undefined && nowMs - previous.lastAtMs < OK_REPORT_QUIET_MS
      ? {
          consecutive: previous.consecutive + 1,
          firstAtMs: previous.firstAtMs,
          lastAtMs: nowMs,
        }
      : {
          consecutive: 1,
          firstAtMs: nowMs,
          lastAtMs: nowMs,
        };
  writerHealth.failuresByFile.set(failureKey, failureState);
  if (!writerHealth.latchingEnabled && failureKey !== UNKNOWN_FILE_KEY) {
    writerHealth.abandonedPaths.add(failureKey);
    writerHealth.abandonedPendingPaths.delete(failureKey);
  }
  if (
    writerHealth.degradedStore.getState() === null &&
    failureKey !== UNKNOWN_FILE_KEY &&
    FLUSH_OPERATIONS.has(source) &&
    writerHealth.latchingEnabled &&
    !isAbandonedPath(writerHealth, failureKey)
  ) {
    let isSustained =
      failureState.consecutive >= FAILURE_REPORT_THRESHOLD &&
      nowMs - failureState.firstAtMs >= FAILURE_SPAN_MS;
    if (getUnameSR_2(errnoCode, "linux") || isSustained) {
      writerHealth.degradedStore.setState(() => ({
        code: errnoCode ?? "unknown",
        source,
        filePath: failureKey,
      }));
      logFeatureSad("session_transcript_write", WRITE_ERROR_REASONS.get(errnoCode ?? "") ?? "other", {
        source: fromEnum(source),
        consecutive_failures: failureState.consecutive,
        sustained: isSustained,
      });
    }
  }
  logEvent("tengu_transcript_write_failed", {
    source: fromEnum(source),
    errno_code: sanitizedErrCodeForTelemetry(error) ?? lit_2("none"),
    errno_enospc: errnoCode === "ENOSPC",
    errno_emfile: errnoCode === "EMFILE",
    consecutive_failures: failureState.consecutive,
    degraded: writerHealth.degradedStore.getState() !== null,
  });
}
//@ chunk-e6aww6q8.js:327410-327793 placement
/**
 * 写成功：首次记 ok，清失败计数，降级状态恢复时记 tengu_transcript_writer_recovered。
 */
function noteTranscriptWriteOk(writerHealth, fileKey) {
  if (!writerHealth.firstWriteOkEmitted) {
    writerHealth.firstWriteOkEmitted = true;
    logFeatureOk("session_transcript_write");
  }
  writerHealth.failuresByFile.delete(fileKey);
  if (isLiveServedPath(writerHealth, fileKey)) writerHealth.abandonedPendingPaths.delete(fileKey);
  let state = writerHealth.degradedStore.getState();
  if (state?.filePath === fileKey) {
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
function writeTranscriptFile(writerHealth, filePath, servingFile, lineEnding = sep, entries = []) {
  let sidecarPrefixOf = (filePath) =>
    typeof filePath !== "string"
      ? filePath
      : filePath.endsWith(".jsonl")
        ? `${filePath.slice(0, -6)}${lineEnding}`
        : null;
  let servingPrefix = servingFile === null ? null : sidecarPrefixOf(servingFile);
  if (servingFile !== null) {
    writerHealth.latchingEnabled = true;
    writerHealth.abandonedPaths.delete(servingFile);
    writerHealth.abandonedPendingPaths.delete(servingFile);
    if (servingPrefix !== null) writerHealth.abandonedPrefixes.delete(servingPrefix);
    let fileName =
      typeof servingFile === "string"
        ? servingFile.slice(servingFile.lastIndexOf(lineEnding) + 1)
        : undefined;
    let fileNameStem = fileName?.endsWith(".jsonl") ? fileName.slice(0, -6) : null;
    let sidMarker =
      typeof servingFile !== "string"
        ? servingFile
        : fileNameStem !== null
          ? `${lineEnding}${fileNameStem}${lineEnding}`
          : null;
    if (sidMarker !== null) {
      for (let abandonedPath of writerHealth.abandonedPaths)
        if (matchesMarker(abandonedPath, sidMarker)) writerHealth.abandonedPaths.delete(abandonedPath);
    }
    writerHealth.liveServing = {
      mainFile: servingFile,
      sidecarPrefix: servingPrefix,
      sidMarker,
    };
  }
  if (filePath === null || filePath === servingFile) {
    if (servingFile === null) {
      writerHealth.latchingEnabled = false;
      writerHealth.liveServing = null;
      for (let key of writerHealth.failuresByFile.keys())
        if (key !== UNKNOWN_FILE_KEY) writerHealth.abandonedPaths.add(key);
      for (let fileKey of entries)
        if (!writerHealth.failuresByFile.has(fileKey)) writerHealth.abandonedPendingPaths.add(fileKey);
      writerHealth.failuresByFile.clear();
      if (writerHealth.degradedStore.getState() !== null) writerHealth.degradedStore.setState(() => null);
    }
    return;
  }
  let sessionPrefix = sidecarPrefixOf(filePath);
  if (servingFile === null) {
    writerHealth.latchingEnabled = false;
    writerHealth.liveServing = null;
    writerHealth.abandonedPaths.clear();
    writerHealth.abandonedPrefixes.clear();
    writerHealth.abandonedPendingPaths.clear();
    writerHealth.abandonedPaths.add(filePath);
    if (sessionPrefix !== null) writerHealth.abandonedPrefixes.add(sessionPrefix);
    for (let key of writerHealth.failuresByFile.keys())
      if (key !== UNKNOWN_FILE_KEY) writerHealth.abandonedPaths.add(key);
    for (let fileKey of entries)
      if (!writerHealth.failuresByFile.has(fileKey)) writerHealth.abandonedPendingPaths.add(fileKey);
    writerHealth.failuresByFile.clear();
    if (writerHealth.degradedStore.getState() !== null) writerHealth.degradedStore.setState(() => null);
    return;
  }
  let remapPath = (filePath_2) => {
    if (filePath_2 === filePath) return servingFile;
    if (sessionPrefix !== null && matchesPrefix(filePath_2, sessionPrefix))
      return typeof filePath_2 !== "string" ||
        typeof sessionPrefix !== "string" ||
        typeof servingPrefix !== "string"
        ? null
        : servingPrefix + filePath_2.slice(sessionPrefix.length);
    return filePath_2;
  };
  for (let [filePath, failure] of Array.from(writerHealth.failuresByFile.entries())) {
    let rewrittenPath = remapPath(filePath);
    if (rewrittenPath !== filePath) {
      writerHealth.failuresByFile.delete(filePath);
      if (rewrittenPath !== null) writerHealth.failuresByFile.set(rewrittenPath, failure);
    }
  }
  let state = writerHealth.degradedStore.getState();
  if (state !== null) {
    let rewrittenPath = remapPath(state.filePath);
    if (rewrittenPath !== state.filePath)
      writerHealth.degradedStore.setState(() =>
        rewrittenPath === null
          ? null
          : {
              ...state,
              filePath: rewrittenPath,
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
