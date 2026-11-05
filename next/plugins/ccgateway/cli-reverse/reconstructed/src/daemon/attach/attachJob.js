/**
 * daemon/attach/attachJob.ts
 *
 * 2.1.316 新增：附加到后台会话的 PTY：转发输入输出、处理窗口大小、分离键与遥测；收集终端能力信息（mux、ssh、超链接等）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-bjxz9pt3.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { connect } from "net";
import {
  DAEMON_DETACH_APC,
  DAEMON_HINT_APC,
  BG_PROTO,
  extractInteractiveMarks,
  parseDetachMsg,
  CLOUD_SESSION_ID_RE,
} from "../../services/daemon/leaseProtocol.js";
import { readDaemonToken, daemonControlSocket, redactDaemonPipeKey } from "../../services/daemon/paths.js";
import { recordAttachAttempt, updateAttachBeacon } from "../jobs/attachBeacon.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { fromEnumOpt, fromEnum } from "../../services/analytics/safeMetadata.js";
import { daemonSessionStateLabel, normalizeDaemonSessionState } from "../../services/daemon/sessionStatus.js";
import { createPrivateModeTracker } from "../../services/daemon/reapJobs.js";
import {
  enableExtendedKeysSequence,
  isProgressReportingAvailable,
  exitAltScreenSequence,
  STDIN_IDLE_REASSERT_MS,
  enterAltScreenSequence,
  isXtermJsTerminal,
  hasUnknownSequencePrintingBug,
  detectMinimalTerminal,
  isSyncOutputKnownSupported,
} from "../../ink/terminal.js";
import { getPlatform } from "../../utils/platform.js";
import { isBackspaceCtrlBackspaceHere } from "../../ink/parse-keypress.js";
import {
  SHOW_CURSOR,
  HIDE_CURSOR,
  ESU,
  decreset,
  DISABLE_WIN32_INPUT_MODE,
  decset,
} from "../../ink/termio/dec.js";
import { isNativeCursorRequested } from "../../ink/nativeCursor.js";
import { errorMessage } from "../../utils/errors.js";
import { bgSupervisorStalledMessage } from "../../utils/fleetGates.js";
import { RESET_SCROLL_REGION, ERASE_SCREEN, CURSOR_HOME } from "../../ink/termio/csi.js";
import { CLEAR_PROGRESS } from "../../ink/termio/osc.js";
import { setRawModeSafe } from "../../ink/setRawModeSafe.js";
import {
  ENORESPONSE,
  SESSION_NOT_RESPONDING_TEXT,
  classifyAttachError,
  attachErrorCode,
  ATTACH_ERROR_CODES_2,
} from "../jobs/attachErrors.js";
import { controlRequest } from "../../services/daemon/controlClient.js";
import { createTerminalReplyFilter, getSpawnLauncherState } from "../../services/daemon/spawnLauncher.js";
import { jsonParse, jsonStringify } from "../../utils/slowOperations.js";
import { env } from "../../utils/env.js";
import { execFileNoThrow } from "../../utils/execFileNoThrow.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import { sequential } from "../../utils/sequential.js";
import { getSystemTheme } from "../../utils/systemTheme.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-bjxz9pt3.js:10946-11353 placement
/**
 * 分离快捷键相关的字节常量。
 */
var DETACH_KEYS; // deferred: uses DAEMON_DETACH_APC (../../services/daemon/leaseProtocol.js) of its import cycle while loading; runs once the cycle is complete
var CTRL_Z_BYTE;
var DETACH_BYTE_NL;
var BACKSPACE_DETACH_BYTE;
var buffer;
var DETACH_LETTER_B;
var DETACH_LETTER_Z;
var buffer_2;
var buffer_3;
var buffer_4;
var buffer_5;
var CTRL_C_BYTE;
var DETACH_LETTER_C;
var buffer_6;
var buffer_7;
var buffer_8;
var buffer_9;
var buffer_10;
var CURSOR_HIDE_DELAY_MS;
deferInit("chunk-bjxz9pt3.js:10946", () => {
  DETACH_KEYS = 2;
  CTRL_Z_BYTE = 26;
  DETACH_BYTE_NL = 100;
  BACKSPACE_DETACH_BYTE = 8;
  buffer = Buffer.from([127]);
  DETACH_LETTER_B = 98;
  DETACH_LETTER_Z = 122;
  buffer_2 = Buffer.from("\x1B[27;5;98~", "latin1");
  buffer_3 = Buffer.from("\x1B[27;5;122~", "latin1");
  buffer_4 = Buffer.from("\x1B[27u", "latin1");
  buffer_5 = Buffer.from("\x1B[27;1u", "latin1");
  CTRL_C_BYTE = 3;
  DETACH_LETTER_C = 99;
  buffer_6 = Buffer.from("\x1B[27;5;99~", "latin1");
  buffer_7 = Buffer.from(DAEMON_DETACH_APC, "ascii");
  buffer_8 = Buffer.from(DAEMON_HINT_APC, "ascii");
  buffer_9 = Buffer.from("\x1B_cc-d", "ascii");
  buffer_10 = Buffer.from("\x1B[?9001", "ascii");
  CURSOR_HIDE_DELAY_MS = 100;
});
//@ chunk-bjxz9pt3.js:11353-11442 placement (2.1.88 match: hasPrefix, 1)
function hasPrefix(src, start, prefix) {
  return (
    src.length - start >= prefix.length &&
    src.compare(prefix, 0, prefix.length, start, start + prefix.length) === 0
  );
}
//@ chunk-bjxz9pt3.js:11442-11783 placement
/**
 * 匹配 CSI 形式的按键序列。
 */
function matchCsiKey(bytes, start, letter) {
  if (bytes[start] !== 27 || bytes[start + 1] !== 91) return 0;
  let pos = start + 2;
  let readNumber = () => {
    let value = -1;
    for (let j = 0; j < 8 && pos < bytes.length; j++) {
      let byte = bytes[pos];
      if (byte < 48 || byte > 57) break;
      value = (value < 0 ? 0 : value) * 10 + (byte - 48);
      pos++;
    }
    return value;
  };
  let param = readNumber();
  if (param < 0) return 0;
  let modifier = -1;
  if (bytes[pos] === 58) {
    pos++;
    readNumber();
    if (bytes[pos] === 58) {
      pos++;
      modifier = readNumber();
    }
  }
  if (bytes[pos] !== 59 || bytes[pos + 1] !== 53 || bytes[pos + 2] !== 117) return 0;
  return (param > 127 && modifier >= 0 ? modifier : param) === letter ? pos + 3 - start : 0;
}
//@ chunk-bjxz9pt3.js:11783-11942 placement
function suffixPrefixOverlap(a, b) {
  let min = Math.min(a.length, b.length - 1);
  e: for (let length = min; length > 0; length--) {
    let offset = a.length - length;
    for (let j = 0; j < length; j++) if (a[offset + j] !== b[j]) continue e;
    return length;
  }
  return 0;
}
//@ chunk-bjxz9pt3.js:11942-11964 placement
var EMPTY_BUFFER; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-bjxz9pt3.js:11942", () => {
  EMPTY_BUFFER = Buffer.alloc(0);
});
//@ chunk-bjxz9pt3.js:11964-12286 placement
/**
 * 在输入字节中查找分离键。
 */
function scanForDetachKey(bytes, prefixArmed) {
  for (let j = 0; j < bytes.length; j++) {
    let byte = bytes[j];
    if (prefixArmed) {
      prefixArmed = false;
      if (byte === DETACH_BYTE_NL)
        return {
          matched: true,
          prefixArmed: false,
        };
      continue;
    }
    if (
      byte === CTRL_Z_BYTE ||
      byte === CTRL_C_BYTE ||
      matchCsiKey(bytes, j, DETACH_LETTER_Z) ||
      hasPrefix(bytes, j, buffer_3) ||
      matchCsiKey(bytes, j, DETACH_LETTER_C) ||
      hasPrefix(bytes, j, buffer_6)
    )
      return {
        matched: true,
        prefixArmed: false,
      };
    let skip =
      byte === DETACH_KEYS
        ? 1
        : matchCsiKey(bytes, j, DETACH_LETTER_B) || (hasPrefix(bytes, j, buffer_2) ? buffer_2.length : 0);
    if (skip) {
      j += skip - 1;
      prefixArmed = true;
    }
  }
  return {
    matched: false,
    prefixArmed,
  };
}
//@ chunk-bjxz9pt3.js:12286-12645 placement
/**
 * 等待用户按下分离键。
 */
function waitForDetachKey(stdin) {
  let done = false;
  let prefixArmed = false;
  let detachKeyMatched;
  let promise = new Promise((resolve) => {
    detachKeyMatched = resolve;
  });
  let onData = () => {
    if (done) return;
    let chunk;
    while ((chunk = stdin.read()) !== null) {
      let buffer = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
      let result = scanForDetachKey(buffer, prefixArmed);
      prefixArmed = result.prefixArmed;
      if (result.matched) {
        done = true;
        detachKeyMatched();
        return;
      }
    }
  };
  stdin.on("readable", onData);
  if ("resume" in stdin && "pause" in stdin) {
    stdin.resume();
    stdin.pause();
  }
  onData();
  return {
    promise,
    cancel: () => {
      done = true;
      stdin.removeListener("readable", onData);
    },
  };
}
//@ chunk-bjxz9pt3.js:12645-12685 placement
function containsInterruptKey(bytes) {
  return scanForDetachKey(bytes, false).matched;
}
//@ chunk-bjxz9pt3.js:12685-25354 placement
/**
 * 附加到后台会话的 PTY：转发输入输出、处理窗口大小、分离键与遥测。
 */
async function attachToJob(short, options = {}) {
  let stdin = options.stdin ?? process.stdin;
  let stdout = options.stdout ?? process.stdout;
  let cols = "columns" in stdout ? stdout.columns || 120 : 120;
  let rows = "rows" in stdout ? stdout.rows || 30 : 30;
  let currentCols = cols;
  let currentRows = rows;
  let attachId = randomUUID();
  let auth = await readDaemonToken();
  let now = Date.now();
  let startTime = performance.now();
  let t0 = options.telemetry?.t0;
  let attachStartMs =
    t0 !== undefined && Number.isFinite(t0) && t0 >= 0 && t0 <= startTime && startTime - t0 < 86400000
      ? t0
      : startTime;
  if (options.telemetry?.gestureId !== undefined)
    recordAttachAttempt(options.telemetry.gestureId, options.telemetry.attempt, options.telemetry.storageV5);
  let contentPaintMs;
  let promptIdleMs;
  let msgsLoaded;
  let msgsInJsonl;
  let msgsRenderedAtFirstPaint;
  let imarkCarry = EMPTY_BUFFER;
  let reached = options.telemetry?.interactive?.reached;
  let attachTimeoutFired = false;
  let timeoutAttachMs;
  let timer = setTimeout(
    () => {
      if (reached === undefined && (contentPaintMs === undefined || promptIdleMs === undefined)) {
        attachTimeoutFired = true;
        timeoutAttachMs = performance.now() - attachStartMs;
      }
    },
    Math.max(0, 30000 - (startTime - attachStartMs)),
  );
  let isFirstFrameMeaningless = false;
  let ackMs;
  let viaState;
  let booting;
  let tempo;
  let sessionState;
  let stale;
  let workerCliVersion;
  let cached;
  let imarkNonce;
  let gotFirstFrame = false;
  let meaningfulMs;
  function recordFirstFrame(meaningful) {
    let elapsedMs = Date.now() - now;
    if (meaningful && meaningfulMs === undefined) meaningfulMs = elapsedMs;
    if (gotFirstFrame) return;
    gotFirstFrame = true;
    isFirstFrameMeaningless = !meaningful;
    logEvent("tengu_bg_attach_first_frame", {
      ms: elapsedMs,
      meaningful_ms: meaningfulMs,
      ack_ms: ackMs,
      gesture_id: sanitizeMarkName(options.telemetry?.gestureId),
      attempt: options.telemetry?.attempt,
      via: fromEnumOpt(viaState),
      tempo: fromEnumOpt(tempo),
      stale,
      state: daemonSessionStateLabel(sessionState),
      cached,
    });
  }
  let resolveOutcome;
  let promise = new Promise((resolve) => {
    resolveOutcome = resolve;
  });
  let isFinished = false;
  let gotAck = false;
  let noResponseTimer;
  let isDetachEscape = false;
  let resizeTimer;
  let previousCols = cols;
  let previousRows = rows;
  let privateModeTracker = createPrivateModeTracker();
  let extendedKeysSequence = () =>
    enableExtendedKeysSequence({
      legacyKitty:
        workerCliVersion !==
        {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
    });
  let isWindowsBackspaceDetach = getPlatform() === "windows" && !isBackspaceCtrlBackspaceHere();
  let shouldRestoreRawMode =
    options.holdScreenOnDisconnect && getPlatform() === "windows"
      ? true
      : "isRaw" in stdin
        ? Boolean(stdin.isRaw)
        : false;
  let isWindowsPlatform = getPlatform() === "windows";
  let buffer_6 = Buffer.from(SHOW_CURSOR, "ascii");
  let buffer_11 = Buffer.from(HIDE_CURSOR, "ascii");
  let needsCursorTracking = isWindowsPlatform && isNativeCursorRequested();
  let cursorHiddenByApp = false;
  let cursorHideTimer;
  let socket;
  try {
    socket = connect(daemonControlSocket());
  } catch (error) {
    let reached = options.telemetry?.interactive?.reached;
    let marksExpected =
      typeof options.telemetry?.interactive?.marksExpected === "boolean"
        ? options.telemetry.interactive.marksExpected
        : undefined;
    logEvent("tengu_bg_attach_outcome", {
      outcome: fromEnum("error"),
      got_ack: false,
      got_first_frame: false,
      ms: Date.now() - now,
      apc_detach: false,
      failure_class: fromEnum("connect_throw"),
      gesture_id: sanitizeMarkName(options.telemetry?.gestureId),
      attempt: options.telemetry?.attempt,
      surface: fromEnumOpt(options.telemetry?.surface),
      daemon_booted: options.telemetry?.daemonBooted,
      attach_ms:
        reached !== undefined
          ? reached.attachMs
          : marksExpected === true
            ? Math.round(performance.now() - attachStartMs)
            : undefined,
      content_paint_ms: reached !== undefined ? Math.round(reached.contentPaintMs) : undefined,
      prompt_idle_ms: reached !== undefined ? Math.round(reached.promptIdleMs) : undefined,
      msgs_loaded: reached?.msgsLoaded,
      msgs_in_jsonl: reached?.msgsInJsonl,
      msgs_rendered_at_first_paint: reached?.msgsRenderedAtFirstPaint,
      first_frame_kind: fromEnumOpt(reached !== undefined ? "real" : undefined),
      marks_expected: reached !== undefined ? true : marksExpected,
      attach_censored: reached === undefined && marksExpected === true ? true : undefined,
      via: fromEnumOpt(options.telemetry?.interactive?.via),
      attach_cold: options.telemetry?.interactive?.attachCold,
    });
    clearTimeout(timer);
    return {
      outcome: "error",
      msg: redactDaemonPipeKey(errorMessage(error)),
    };
  }
  socket.setTimeout(1e4, () => {
    if (!gotAck)
      finish("error", bgSupervisorStalledMessage(), {
        failureClass: "ack_timeout",
      });
  });
  function finish(outcome, msg, finishOptions) {
    if (isFinished) return;
    let { viaApc, beforeFirstFrame, failureClass } = finishOptions ?? {};
    isFinished = true;
    clearTimeout(cursorHideTimer);
    clearTimeout(timer);
    clearTimeout(noResponseTimer);
    let rounded = Math.round(performance.now() - attachStartMs);
    let maxMarkMs =
      contentPaintMs !== undefined && promptIdleMs !== undefined
        ? Math.round(Math.max(contentPaintMs, promptIdleMs))
        : undefined;
    let marksExpectedKnown =
      imarkNonce !== undefined || options.telemetry?.interactive?.marksExpected === true;
    let isTimedOut =
      reached === undefined && marksExpectedKnown && attachTimeoutFired && maxMarkMs === undefined;
    let isCensored = reached === undefined && marksExpectedKnown && !isTimedOut && maxMarkMs === undefined;
    let attachMs =
      reached !== undefined
        ? reached.attachMs
        : isTimedOut
          ? Math.round(timeoutAttachMs ?? rounded)
          : isCensored
            ? rounded
            : maxMarkMs;
    let firstFrameKind =
      reached !== undefined
        ? "real"
        : maxMarkMs !== undefined
          ? "real"
          : gotFirstFrame
            ? isFirstFrameMeaningless && meaningfulMs === undefined
              ? "dimhint"
              : "unknown"
            : undefined;
    logEvent("tengu_bg_attach_outcome", {
      outcome: fromEnum(outcome),
      got_ack: gotAck,
      got_first_frame: gotFirstFrame,
      ms: Date.now() - now,
      gesture_id: sanitizeMarkName(options.telemetry?.gestureId),
      attempt: options.telemetry?.attempt,
      via: fromEnumOpt(options.telemetry?.interactive?.via ?? viaState),
      tempo: fromEnumOpt(tempo),
      apc_detach: viaApc === true,
      failure_class: fromEnumOpt(failureClass),
      state: daemonSessionStateLabel(sessionState),
      cached,
      meaningful_ms: meaningfulMs,
      input_accepted_ms: inputAcceptedMs,
      input_delivered_ms: inputAcceptedMs,
      keys_dropped: keysDropped,
      attach_ms: attachMs,
      content_paint_ms:
        reached !== undefined
          ? Math.round(reached.contentPaintMs)
          : contentPaintMs !== undefined
            ? Math.round(contentPaintMs)
            : undefined,
      prompt_idle_ms:
        reached !== undefined
          ? Math.round(reached.promptIdleMs)
          : promptIdleMs !== undefined
            ? Math.round(promptIdleMs)
            : undefined,
      timed_out: isTimedOut,
      attach_censored: isCensored,
      marks_expected:
        reached !== undefined
          ? true
          : gotAck || typeof options.telemetry?.interactive?.marksExpected === "boolean"
            ? marksExpectedKnown
            : undefined,
      attach_cold:
        options.telemetry?.interactive?.attachCold ??
        (viaState !== undefined ? viaState === "cold" && (booting ?? true) : undefined),
      daemon_booted: options.telemetry?.daemonBooted,
      surface: fromEnumOpt(options.telemetry?.surface),
      first_frame_kind: fromEnumOpt(firstFrameKind),
      msgs_loaded: reached?.msgsLoaded ?? msgsLoaded,
      msgs_in_jsonl: reached?.msgsInJsonl ?? msgsInJsonl,
      msgs_rendered_at_first_paint: reached?.msgsRenderedAtFirstPaint ?? msgsRenderedAtFirstPaint,
    });
    if (gotAck) {
      let keepAltScreen =
        options.alreadyInAlt || (outcome === "disconnected" && options.holdScreenOnDisconnect);
      stdout.write(
        ESU +
          privateModeTracker.snapshot().map(decreset).reverse().join("") +
          SHOW_CURSOR +
          (getPlatform() === "windows" ? DISABLE_WIN32_INPUT_MODE : "") +
          "\x1B[0m\x1B7" +
          RESET_SCROLL_REGION +
          "\x1B8" +
          (isProgressReportingAvailable() ? CLEAR_PROGRESS : "") +
          (keepAltScreen ? "" : exitAltScreenSequence()),
      );
    }
    if (!shouldRestoreRawMode) setRawModeSafe(stdin, false);
    stdin.removeListener("readable", handleReadable);
    stdin.removeListener("end", handleStdinEnd);
    if ("removeListener" in stdout) stdout.removeListener("resize", handleResize);
    clearTimeout(resizeTimer);
    socket.destroy();
    resolveOutcome({
      outcome,
      msg,
      viaApc,
      beforeFirstFrame,
    });
  }
  function handleNoResponse() {
    finish("error", `${ENORESPONSE}: ${SESSION_NOT_RESPONDING_TEXT}`, {
      failureClass: "no_response",
    });
  }
  function handleResize() {
    if (isFinished) return;
    if (resizeTimer === undefined) {
      previousCols = currentCols;
      previousRows = currentRows;
    }
    currentCols = "columns" in stdout ? stdout.columns || cols : cols;
    currentRows = "rows" in stdout ? stdout.rows || rows : rows;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resizeTimer = undefined;
      if (isFinished) return;
      if (currentCols < previousCols || currentRows < previousRows) stdout.write(ERASE_SCREEN + CURSOR_HOME);
      reassertPrivateModes();
      controlRequest({
        proto: BG_PROTO,
        op: "resize",
        short,
        cols: currentCols,
        rows: currentRows,
        attachId,
      });
    }, 50);
  }
  let startTime_2 = performance.now();
  function reassertPrivateModes() {
    let decModes = privateModeTracker.snapshot();
    if (!decModes.includes(1004)) return;
    stdout.write(extendedKeysSequence() + decModes.map(decset).join(""));
  }
  let gateStdin = options.gateStdinUntilFirstFrame === true && "isTTY" in stdin && stdin.isTTY === true;
  let inputAcceptedMs;
  let keysDropped = 0;
  let terminalReplyFilter = createTerminalReplyFilter();
  function forwardInput(data) {
    let isTerminalReply = () => terminalReplyFilter(data.toString("latin1"));
    if (!gateStdin || gotFirstFrame) {
      if (inputAcceptedMs === undefined && !isTerminalReply()) inputAcceptedMs = Date.now() - now;
      socket.write(data);
    } else if (!isTerminalReply()) keysDropped++;
  }
  function handleStdinChunk(chunk) {
    if (isFinished) return;
    let buffer_6 = typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk;
    let emittedEnd = 0;
    for (let idx = 0; idx < buffer_6.length; idx++) {
      let byte = buffer_6[idx];
      if (isDetachEscape) {
        isDetachEscape = false;
        if (idx > emittedEnd) forwardInput(buffer_6.subarray(emittedEnd, idx));
        if (byte === DETACH_BYTE_NL) return finish("detached");
        forwardInput(Buffer.from([DETACH_KEYS, byte]));
        emittedEnd = idx + 1;
        continue;
      }
      if (
        gateStdin &&
        !gotFirstFrame &&
        ((byte === 27 && buffer_6.length === 1) ||
          hasPrefix(buffer_6, idx, buffer_4) ||
          hasPrefix(buffer_6, idx, buffer_5))
      )
        return finish("detached", undefined, {
          beforeFirstFrame: true,
        });
      if (
        byte === CTRL_Z_BYTE ||
        matchCsiKey(buffer_6, idx, DETACH_LETTER_Z) ||
        hasPrefix(buffer_6, idx, buffer_3)
      ) {
        if (idx > emittedEnd) forwardInput(buffer_6.subarray(emittedEnd, idx));
        return finish("detached");
      }
      if (isWindowsBackspaceDetach && byte === BACKSPACE_DETACH_BYTE) {
        if (idx > emittedEnd) forwardInput(buffer_6.subarray(emittedEnd, idx));
        forwardInput(buffer);
        emittedEnd = idx + 1;
        continue;
      }
      let detachSequenceLength =
        byte === DETACH_KEYS
          ? 1
          : matchCsiKey(buffer_6, idx, DETACH_LETTER_B) ||
            (hasPrefix(buffer_6, idx, buffer_2) ? buffer_2.length : 0);
      if (detachSequenceLength) {
        if (idx > emittedEnd) forwardInput(buffer_6.subarray(emittedEnd, idx));
        idx += detachSequenceLength - 1;
        emittedEnd = idx + 1;
        isDetachEscape = true;
      }
    }
    if (emittedEnd < buffer_6.length) forwardInput(buffer_6.subarray(emittedEnd));
  }
  function handleReadable() {
    let startTime = performance.now();
    if (startTime - startTime_2 > STDIN_IDLE_REASSERT_MS) reassertPrivateModes();
    startTime_2 = startTime;
    let readChunk;
    while ((readChunk = stdin.read()) !== null) handleStdinChunk(readChunk);
  }
  function handleStdinEnd() {
    finish("detached");
  }
  let ackBuffer = EMPTY_BUFFER;
  let apcCarry = EMPTY_BUFFER;
  let privateModeQueryCarry = EMPTY_BUFFER;
  let apcFilterCarry = EMPTY_BUFFER;
  function filterCursorQueries(buffer) {
    if (!isWindowsPlatform) return buffer;
    let hasCarry = privateModeQueryCarry.length > 0;
    let combined = hasCarry ? Buffer.concat([privateModeQueryCarry, buffer]) : buffer;
    if (hasCarry) privateModeQueryCarry = EMPTY_BUFFER;
    if (needsCursorTracking) {
      let index = combined.lastIndexOf(buffer_6);
      let index_2 = combined.lastIndexOf(buffer_11);
      if (index !== index_2) cursorHiddenByApp = index > index_2;
    }
    let index = combined.indexOf(buffer_6);
    if (index < 0) {
      let overlap = suffixPrefixOverlap(combined, buffer_6);
      if (overlap === 0) return combined;
      privateModeQueryCarry = Buffer.from(combined.subarray(combined.length - overlap));
      return combined.subarray(0, combined.length - overlap);
    }
    let pieces = [];
    let segmentStart = 0;
    let queryIndex = index;
    for (;;) {
      if (queryIndex > segmentStart) pieces.push(combined.subarray(segmentStart, queryIndex));
      segmentStart = queryIndex + buffer_6.length;
      queryIndex = combined.indexOf(buffer_6, segmentStart);
      if (queryIndex < 0) break;
    }
    let chunk = combined.subarray(segmentStart);
    let overlap = suffixPrefixOverlap(chunk, buffer_6);
    if (overlap > 0) privateModeQueryCarry = Buffer.from(chunk.subarray(chunk.length - overlap));
    if (chunk.length > overlap) pieces.push(chunk.subarray(0, chunk.length - overlap));
    if (pieces.length === 0) return EMPTY_BUFFER;
    if (pieces.length === 1) return pieces[0];
    return Buffer.concat(pieces);
  }
  function filterApc(buffer) {
    let hasCarry = apcFilterCarry.length > 0;
    let combined = hasCarry ? Buffer.concat([apcFilterCarry, buffer]) : buffer;
    if (hasCarry) apcFilterCarry = EMPTY_BUFFER;
    let index = combined.indexOf(buffer_10);
    if (index < 0) {
      let overlap = suffixPrefixOverlap(combined, buffer_10);
      if (overlap === 0) return combined;
      apcFilterCarry = Buffer.from(combined.subarray(combined.length - overlap));
      return combined.subarray(0, combined.length - overlap);
    }
    let pieces = [];
    let segmentStart = 0;
    let apcIndex = index;
    while (apcIndex >= 0) {
      let contentStart = apcIndex + buffer_10.length;
      if (contentStart >= combined.length) {
        if (apcIndex > segmentStart) pieces.push(combined.subarray(segmentStart, apcIndex));
        apcFilterCarry = Buffer.from(combined.subarray(apcIndex));
        segmentStart = combined.length;
        break;
      }
      let markerByte = combined[contentStart];
      if (markerByte === 104 || markerByte === 108) {
        if (apcIndex > segmentStart) pieces.push(combined.subarray(segmentStart, apcIndex));
        segmentStart = contentStart + 1;
      }
      apcIndex = combined.indexOf(buffer_10, Math.max(segmentStart, apcIndex + 1));
    }
    if (segmentStart < combined.length) {
      let chunk = combined.subarray(segmentStart);
      let overlap = suffixPrefixOverlap(chunk, buffer_10);
      if (overlap > 0) apcFilterCarry = Buffer.from(chunk.subarray(chunk.length - overlap));
      if (chunk.length > overlap) pieces.push(chunk.subarray(0, chunk.length - overlap));
    }
    if (pieces.length === 0) return EMPTY_BUFFER;
    if (pieces.length === 1) return pieces[0];
    return Buffer.concat(pieces);
  }
  let clearBeforeFirstWrite = options.alreadyInAlt && !options.holdingFrame;
  function writeOutput(buffer) {
    let { out, meaningful, renders } = splitSyncBlocks(buffer);
    if (out.length === 0) return;
    if (!renders) {
      stdout.write(out);
      return;
    }
    if (clearBeforeFirstWrite) {
      clearBeforeFirstWrite = false;
      stdout.write(ERASE_SCREEN + CURSOR_HOME);
    }
    stdout.write(out);
    privateModeTracker.feed(out.toString("latin1"), (mode) => {
      if (mode === 1004) {
        let sequence = extendedKeysSequence();
        if (sequence) stdout.write(sequence);
      }
    });
    recordFirstFrame(meaningful);
  }
  let syncCarry = EMPTY_BUFFER;
  let inSyncBlock = false;
  let inEscape = false;
  let pendingEscape = false;
  function hasMeaningfulText(buffer) {
    let sawMeaningful = false;
    let scanIndex = 0;
    if (pendingEscape) {
      pendingEscape = false;
      inEscape = false;
      if (buffer[0] === 92) scanIndex = 1;
    }
    while (scanIndex < buffer.length) {
      if (inEscape) {
        let byteIndex = scanIndex;
        while (
          byteIndex < buffer.length &&
          buffer[byteIndex] !== 27 &&
          buffer[byteIndex] !== 24 &&
          buffer[byteIndex] !== 26
        )
          byteIndex++;
        if (byteIndex >= buffer.length) return sawMeaningful;
        if (buffer[byteIndex] !== 27) {
          inEscape = false;
          scanIndex = byteIndex + 1;
          continue;
        }
        if (byteIndex === buffer.length - 1) {
          pendingEscape = true;
          return sawMeaningful;
        }
        if (buffer[byteIndex + 1] === 92) {
          inEscape = false;
          scanIndex = byteIndex + 2;
          continue;
        }
        inEscape = false;
        scanIndex = byteIndex;
        continue;
      }
      let index = buffer.indexOf(buffer_9, scanIndex);
      if (index < 0) return true;
      sawMeaningful ||= index > scanIndex;
      inEscape = true;
      scanIndex = index + buffer_9.length;
    }
    return sawMeaningful;
  }
  function splitSyncBlocks(buffer) {
    let combined = syncCarry.length > 0 ? Buffer.concat([syncCarry, buffer]) : buffer;
    syncCarry = EMPTY_BUFFER;
    let sawMeaningful = false;
    let sawUnchecked = false;
    let pieces = [];
    let blockIndex = 0;
    for (;;) {
      let index = combined.indexOf(buffer_8, blockIndex);
      if (index < 0) break;
      if (index > blockIndex) {
        let buffer = combined.subarray(blockIndex, index);
        pieces.push(buffer);
        if (!inSyncBlock) sawMeaningful = hasMeaningfulText(buffer) || sawMeaningful;
        else sawUnchecked = true;
      }
      inSyncBlock = !inSyncBlock;
      blockIndex = index + buffer_8.length;
    }
    let buffer_2 = combined.subarray(blockIndex);
    let overlap = suffixPrefixOverlap(buffer_2, buffer_8);
    if (overlap > 0) {
      syncCarry = Buffer.from(buffer_2.subarray(buffer_2.length - overlap));
      buffer_2 = buffer_2.subarray(0, buffer_2.length - overlap);
    }
    if (buffer_2.length > 0) {
      pieces.push(buffer_2);
      if (!inSyncBlock) sawMeaningful = hasMeaningfulText(buffer_2) || sawMeaningful;
      else sawUnchecked = true;
    }
    return {
      out: pieces.length === 0 ? EMPTY_BUFFER : pieces.length === 1 ? pieces[0] : Buffer.concat(pieces),
      meaningful: sawMeaningful,
      renders: sawMeaningful || sawUnchecked,
    };
  }
  function handleSocketData(data) {
    if (isFinished) return;
    let collectingMarks =
      imarkNonce !== undefined &&
      reached === undefined &&
      (contentPaintMs === undefined || promptIdleMs === undefined);
    let interactiveMarks = extractInteractiveMarks(imarkCarry, data, {
      requireNonce: imarkNonce,
    });
    imarkCarry = interactiveMarks.carry;
    let cleaned = interactiveMarks.cleaned;
    if (collectingMarks)
      for (let mark of interactiveMarks.marks) {
        let markMs = performance.now() - attachStartMs;
        if (mark.kind === "content_paint" && contentPaintMs === undefined) {
          contentPaintMs = markMs;
          msgsLoaded = mark.msgsLoaded;
          msgsInJsonl = mark.msgsInJsonl;
          msgsRenderedAtFirstPaint = mark.msgsRenderedAtFirstPaint;
        } else if (mark.kind === "prompt_idle" && promptIdleMs === undefined) promptIdleMs = markMs;
        if (contentPaintMs !== undefined && promptIdleMs !== undefined) {
          clearTimeout(timer);
          let attachMs = Math.round(Math.max(contentPaintMs, promptIdleMs));
          if (options.telemetry?.interactive !== undefined)
            options.telemetry.interactive.reached = {
              attachMs,
              contentPaintMs,
              promptIdleMs,
              msgsLoaded,
              msgsInJsonl,
              msgsRenderedAtFirstPaint,
            };
          if (options.telemetry?.gestureId !== undefined)
            updateAttachBeacon(
              options.telemetry.gestureId,
              {
                interactiveReached: true,
                attachMs,
                msgsLoaded,
                msgsInJsonl,
                msgsRenderedAtFirstPaint,
              },
              options.telemetry.storageV5,
            );
        }
      }
    let combined = apcCarry.length > 0 ? Buffer.concat([apcCarry, cleaned]) : cleaned;
    let index = combined.indexOf(buffer_7);
    if (index >= 0) {
      let buffer = combined.subarray(0, index);
      if (index > 0) {
        let filteredOutput = filterApc(filterCursorQueries(buffer));
        if (filteredOutput.length > 0) writeOutput(filteredOutput);
      }
      apcCarry = EMPTY_BUFFER;
      privateModeQueryCarry = EMPTY_BUFFER;
      apcFilterCarry = EMPTY_BUFFER;
      let detachMsg = parseDetachMsg(buffer);
      return finish("detached", detachMsg, {
        viaApc: true,
        failureClass: classifyAttachError(detachMsg),
      });
    }
    let overlap = suffixPrefixOverlap(combined, buffer_7);
    if (combined.length > overlap) {
      let buffer = combined.subarray(0, combined.length - overlap);
      let cleanChunk = filterApc(filterCursorQueries(buffer));
      if (cleanChunk.length > 0) writeOutput(cleanChunk);
    }
    apcCarry = overlap > 0 ? Buffer.from(combined.subarray(combined.length - overlap)) : EMPTY_BUFFER;
    if (needsCursorTracking) {
      clearTimeout(cursorHideTimer);
      cursorHideTimer = setTimeout(() => {
        if (!isFinished && cursorHiddenByApp) stdout.write(SHOW_CURSOR);
      }, CURSOR_HIDE_DELAY_MS);
    }
  }
  socket.on("data", (data) => {
    if (isFinished) return;
    if (gotAck) {
      clearTimeout(noResponseTimer);
      handleSocketData(data);
      return;
    }
    ackBuffer = Buffer.concat([ackBuffer, data]);
    let index = ackBuffer.indexOf(10);
    if (index < 0) return;
    let str = ackBuffer.subarray(0, index).toString("utf8");
    let chunk = ackBuffer.subarray(index + 1);
    let ack;
    try {
      ack = jsonParse(str);
    } catch (error) {
      return finish("error", `bad ack: ${errorMessage(error)}`, {
        failureClass: "bad_ack",
      });
    }
    if (typeof ack !== "object" || ack === null)
      return finish("error", "bad ack: non-object ack line", {
        failureClass: "bad_ack",
      });
    if (!ack.ok)
      return finish("error", `${ack.code}: ${ack.error}`, {
        failureClass: attachErrorCode(ack.code),
      });
    gotAck = true;
    socket.setTimeout(0);
    if (!options.holdingFrame && chunk.length === 0)
      noResponseTimer = setTimeout(handleNoResponse, ATTACH_ERROR_CODES_2);
    ackMs = Date.now() - now;
    viaState = ack.op === "attach" ? normalizeDaemonSessionState(ack.via) : undefined;
    booting = ack.op === "attach" && typeof ack.booting === "boolean" ? ack.booting : undefined;
    imarkNonce = ack.op === "attach" && typeof ack.imarkNonce === "string" ? ack.imarkNonce : undefined;
    if (options.telemetry?.gestureId !== undefined)
      updateAttachBeacon(
        options.telemetry.gestureId,
        {
          marksExpected: imarkNonce !== undefined,
          daemonBooted:
            typeof options.telemetry.daemonBooted === "boolean" ? options.telemetry.daemonBooted : undefined,
          attachCold: viaState !== undefined ? viaState === "cold" && (booting ?? true) : undefined,
          via: viaState,
        },
        options.telemetry.storageV5,
      );
    if (options.telemetry?.interactive !== undefined) {
      options.telemetry.interactive.marksExpected =
        options.telemetry.interactive.marksExpected === true || imarkNonce !== undefined;
      if (viaState !== undefined && options.telemetry.interactive.reached === undefined) {
        options.telemetry.interactive.attachCold = viaState === "cold" && (booting ?? true);
        options.telemetry.interactive.via = viaState;
      }
    }
    tempo = ack.op === "attach" ? ack.tempo : undefined;
    sessionState = ack.op === "attach" ? ack.state : undefined;
    stale = ack.op === "attach" ? ack.stale : undefined;
    workerCliVersion = ack.op === "attach" ? ack.workerCliVersion : undefined;
    cached = ack.op === "attach" ? ack.cached : undefined;
    if (env.TMUX && !getSpawnLauncherState().tmuxRgbApplied) {
      getSpawnLauncherState().tmuxRgbApplied = true;
      execFileNoThrow("tmux", ["set", "-as", "terminal-features", ",*:RGB"]);
    }
    let joined = ((ack.op === "attach" ? ack.decModes : undefined) ?? []).map(decset).join("");
    privateModeTracker.feed(joined);
    if ("ref" in stdin) stdin.ref();
    setRawModeSafe(stdin, true);
    let legacyKitty =
      workerCliVersion !==
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION;
    stdout.write(
      options.alreadyInAlt
        ? HIDE_CURSOR +
            enableExtendedKeysSequence({
              legacyKitty,
            }) +
            joined
        : enterAltScreenSequence({
            legacyKitty,
          }) +
            joined +
            (isWindowsPlatform ? HIDE_CURSOR : "") +
            `
  \x1B[2mAttaching\u2026\x1B[0m
`,
    );
    if ("on" in stdout) stdout.on("resize", handleResize);
    if (
      ("columns" in stdout && (stdout.columns || cols) !== cols) ||
      ("rows" in stdout && (stdout.rows || rows) !== rows)
    )
      handleResize();
    stdin.on("readable", handleReadable);
    if ("resume" in stdin && "pause" in stdin) {
      stdin.resume();
      stdin.pause();
    }
    stdin.once("end", handleStdinEnd);
    handleReadable();
    if (chunk.length) handleSocketData(chunk);
  });
  socket.on("error", (socketError) =>
    finish("error", redactDaemonPipeKey(errorMessage(socketError)), {
      failureClass: "socket_error",
    }),
  );
  socket.once("close", () => {
    if (!isFinished)
      finish(gotAck ? "disconnected" : "error", "control socket closed", {
        failureClass: "socket_closed",
      });
  });
  socket.once("connect", () => {
    socket.write(
      jsonStringify({
        proto: BG_PROTO,
        op: "attach",
        short,
        auth,
        cols,
        rows,
        attachId,
        caps: {
          ...terminalCapabilities(),
          ...(options.sessionTabs !== undefined && {
            sessionTabs: options.sessionTabs,
            ...(options.cloudTabs === true && {
              cloudTabs: true,
            }),
            ...(options.tabsLanding && {
              tabsLanding: options.tabsLanding,
            }),
          }),
        },
        ...(options.holdingFrame && {
          holdingFrame: true,
        }),
      }) +
        `
`,
    );
  });
  return promise;
}
//@ chunk-bjxz9pt3.js:25354-25813 placement
/**
 * 收集终端能力信息（mux、ssh、超链接等）。
 */
function terminalCapabilities() {
  return {
    imark: true,
    terminal: env.terminal,
    mux: env.TMUX ? "tmux" : process.env.ZELLIJ != null ? "zellij" : env.STY ? "screen" : null,
    ssh: env.isSSH(),
    wheelFlood: isXtermJsTerminal(),
    hyperlinks: supportsHyperlinks(),
    progressReporting: isProgressReportingAvailable(),
    printsUnknownSequences: hasUnknownSequencePrintingBug(),
    wtSession: !!env.WT_SESSION,
    isVscodeTerm: env.TERM_PROGRAM === "vscode",
    keyDialect: detectMinimalTerminal(env.TERM),
    browser: env.BROWSER ?? null,
    colorLevel: sequential.level,
    syncOutput: isSyncOutputKnownSupported(),
    editor: env.VISUAL || env.EDITOR || null,
    systemTheme: getSystemTheme(),
    ...(env.TMUX && {
      tmuxSocket: firstLineOf(env.TMUX, ","),
    }),
  };
}
//@ chunk-bjxz9pt3.js:25813-25899 placement
function parseSwitchTarget(target) {
  return CLOUD_SESSION_ID_RE.test(target)
    ? {
        kind: "cloud",
        sessionId: target,
      }
    : {
        kind: "switch",
        short: target,
      };
}
export { waitForDetachKey, containsInterruptKey, attachToJob, parseSwitchTarget };
