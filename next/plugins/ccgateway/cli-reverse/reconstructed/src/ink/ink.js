/**
 * ink/ink.tsx
 *
 * 并入已有模块：校验终端尺寸读数，异常值时回退或钳位并记录；生成恢复终端模式的转义序列（鼠标、扩展键、光标保存等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/ink.tsx
 * pieces: chunk-bzr73sfg.js (20)
 * attribution: placement 4, sole-consumer 3, fingerprint 5, layout 4, affinity 4
 */
import { writeSync, openSync, constants, closeSync, readSync } from "fs";
import { format } from "util";
import {
  decreset,
  DEC,
  DISABLE_MOUSE_TRACKING,
  DFE,
  DISABLE_THEME_NOTIFY,
  DBP,
  SHOW_CURSOR,
  ENTER_ALT_SCREEN,
  EXIT_ALT_SCREEN,
  HIDE_CURSOR,
  EFE,
  mouseTrackingSequence,
} from "./termio/dec.js";
import {
  disableModifyOtherKeysSequence,
  popKittyKeyboardSequence,
  isProgressReportingAvailable,
  PROGRAM_STATUS_CLEAR,
  getSecondRootError,
  isSynchronizedOutputLikely,
  DECSTBM_ENABLED,
  isSynchronizedOutputSupported,
  writeDiffToTerminal,
  isXtermJs,
  recordSlowestWrite,
} from "./terminal.js";
import { RESET_CHARSET } from "./termio/ansi.js";
import {
  RESET_SCROLL_REGION,
  CURSOR_HOME,
  ERASE_SCREEN,
  cursorPosition,
  cursorMove,
  cursorTo,
  eraseToEndOfLine,
  CURSOR_LEFT,
  eraseLines,
} from "./termio/csi.js";
import {
  CLEAR_PROGRESS,
  isTabStatusEnabled,
  wrapForMultiplexer,
  CLEAR_TAB_STATUS,
  setClipboard,
} from "./termio/osc.js";
import {
  getTerminalCapabilities,
  getTerminalProbeState,
  isItermOrTmuxXtversion,
} from "./terminalCapabilities.js";
import {
  isSyscallError,
  isAbortError,
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  toError,
  withTelemetryMessage,
  getErrnoCode,
} from "../utils/errors.js";
import { logForDebugging } from "../utils/debug.js";
import { logError } from "../utils/log.js";
import { createSignal } from "../utils/signal.js";
import { cursorPosition as cursorPosition_2 } from "./terminal-querier.js";
import { getGraphemeSegmenter } from "../utils/intl.js";
import { TerminalImageManager, DECRC } from "./TerminalImageManager.js";
import { createRef } from "../../vendor/react/cjs/react.production.js";
import {
  createSelectionState,
  isSelectionFullyOffscreen,
  hasSelection,
  captureScrolledRows,
  shiftAnchor,
  shiftSelection,
  applySelectionOverlay,
  getSelectedText,
  clearSelection,
  moveFocus,
  findPlainTextUrl,
  startSelection,
  selectWordAt,
  selectLineAt,
  extendSelection,
  updateSelection,
} from "./selection.js";
import { TerminalModes, TerminalModesContextAlias } from "./terminalModes.js";
import { env } from "../utils/env.js";
import {
  rewriteHeldAnnouncement,
  endAnnouncementHold,
  startupQuietRemainingMs,
  endStartupQuiet,
  isAnnouncementHoldActive,
  drainAnnouncements,
  takeAnnouncementHoldMs,
  getAxPreparkMs,
  startAnnouncementHold,
} from "../utils/accessibility/screenReader.js";
import { autoBind } from "../../vendor/auto-bind/index.js";
import { getPlatform } from "../utils/platform.js";
import { isEnvTruthy } from "../utils/envUtils.js";
import {
  isNonBlockingStdoutInstalled,
  isNonBlockingStdoutEnabled,
  installNonBlockingStdout,
} from "./nonBlockingStdout.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import {
  StylePool,
  CharPool,
  HyperlinkPool,
  createScreen,
  fillScreenWithSpacers,
  conservativeWidth,
  wrapTextConservatively,
  STYLE_POOL_SOFT_LIMIT,
  migrateScreenPools,
} from "./screen.js";
import { RenderDebugHud } from "./renderTelemetry.js";
import { emptyFrame, PasteEvent, WheelEvent } from "./frame.js";
import { LogUpdate, isFrameOverflowing } from "./log-update.js";
import { onExit } from "../../vendor/signal-exit/dist/mjs/index.js";
import {
  createNode,
  underlineHyperlinkAt,
  findOwnerChainAtRow,
  countDomNodes,
  countFibers,
  markDirty,
  isOverBlankCell,
  hyperlinkAt,
  ImperativeTree,
  removeChildAndCleanup,
} from "./dom.js";
import { Yoga, ErrorBoundaryStateRef } from "./components/ErrorBoundary.js";
import { FocusManager } from "./focus.js";
import { dispatcher, reconcilerAlias } from "./reconciler.js";
import { createRenderer } from "./renderer.js";
import { concurrentRoot } from "../../vendor/yoga-layout/dist/src/generated/YGEnums.js";
import { import_noop } from "../../vendor/lodash-es/uniqBy.js";
import { SGR_RESET } from "./termio/sgr.js";
import { getYogaCounters } from "../native-ts/yoga-layout/index.js";
import {
  SCROLL_MAX_ROWS_PER_TICK,
  SCROLL_MIN_ROWS,
  SCROLL_JUMP_LINES,
  SCROLL_HISTORY_LIMIT,
  SCROLL_TICK_MS,
} from "./scrollConstants.js";
import { flushInteractionTime } from "../bootstrap/state.js";
import { applySearchHighlight } from "./searchHighlight.js";
import { applyPositionedHighlight, scanPositions } from "./render-to-screen.js";
import { optimize } from "./optimizer.js";
import { eraseViewportInPlace } from "./clearTerminal.js";
import { isFreshTmuxProbe } from "./terminalImages.js";
import {
  renderNodeToScreenReaderOutput,
  sanitizeForScreenReader,
  takeTranscriptFrontCut,
  screenReaderOffsetOf,
  renderNodeToOutputAlias,
} from "./render-to-screen-reader.js";
import { wrapAnsi } from "./wrapAnsi.js";
import { squashSingleText } from "./layout/node.js";
import { bunStringWidth } from "./stringWidth.js";
import { countCharInString } from "../utils/stringUtils.js";
import { handleEPIPE } from "../utils/process.js";
import { logEvent } from "../services/analytics/index.js";
import { setRawModeSafe } from "./setRawModeSafe.js";
import { Output } from "./output.js";
import { createRenderState, dropSubtreeCache } from "./render-node-to-output.js";
import { colorize } from "../../vendor/es-toolkit/dist/server/colors/index.mjs";
import {
  hitTest,
  dispatchClick,
  dispatchHover,
  dispatchHoverFollowsPaint,
  findPointerTarget,
  findSelectionScope,
} from "./hit-test.js";
import { ClickEvent, dispatchPointer } from "./events/click-event.js";
import { KeyboardEvent } from "./events/keyboard-event.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { App } from "./components/App.js";
import { TerminalWriteProvider } from "./useTerminalNotification.js";
import { OWED_REPLY_HOLD_MS } from "./terminalProbe.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-bzr73sfg.js:321779-321877 placement
function shouldCompactStylePool(framesSinceCompact, stylePool, liveStyles) {
  let threshold = stylePool.isNearCapacity ? 1000 : 30000;
  return (
    framesSinceCompact > threshold && (framesSinceCompact > 300000 || stylePool.needsCompaction(liveStyles))
  );
}
//@ chunk-bzr73sfg.js:321877-322260 placement
/**
 * 生成恢复终端模式的转义序列（鼠标、扩展键、光标保存等）。
 */
function restoreTerminalModes(modes, write) {
  let extraResets = [
    decreset(DEC.MOUSE_SGR_PIXELS),
    DISABLE_MOUSE_TRACKING,
    disableModifyOtherKeysSequence(),
    DFE,
    DISABLE_THEME_NOTIFY,
    DBP,
  ];
  let hasExtendedKeys = modes.isSet("extendedKeys") && !modes.isSuspended;
  let resetSeq = modes.resetAll();
  let seq =
    resetSeq +
    RESET_CHARSET +
    extraResets.filter((extraReset) => !resetSeq.includes(extraReset)).join("") +
    (hasExtendedKeys ? "" : popKittyKeyboardSequence()) +
    SHOW_CURSOR +
    "\x1B7" +
    RESET_SCROLL_REGION +
    "\x1B8" +
    (isProgressReportingAvailable() ? CLEAR_PROGRESS : "") +
    (isTabStatusEnabled() ? wrapForMultiplexer(CLEAR_TAB_STATUS) : "") +
    (getTerminalCapabilities().now("programStatus") ? PROGRAM_STATUS_CLEAR : "");
  try {
    write(seq);
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`restoreTerminalModes write failed: ${error}`, {
        level: "error",
      });
    else throw error;
  }
}
//@ chunk-bzr73sfg.js:322757-322843 sole-consumer
function runSelectionTakeDown(callback) {
  try {
    callback();
  } catch (error) {
    if (isAbortError(error)) logForDebugging(`selection take-down aborted: ${errorMessage(error)}`);
    else logError(error);
  }
}
//@ chunk-bzr73sfg.js:322843-322930 sole-consumer
function createSelectionTakeDownSignal() {
  let signal = createSignal();
  return {
    subscribe: (listener) => signal.subscribe(() => runSelectionTakeDown(listener)),
    announce: signal.emit,
  };
}
//@ chunk-bzr73sfg.js:322930-323156 fingerprint = ALT_SCREEN_ANCHOR_CURSOR (0.605)
var MAX_COLUMNS; // deferred: uses cursorPosition (./terminal-querier.js) of its import cycle while loading; runs once the cycle is complete
var FRAME_INTERVAL_MS;
var MAX_FRAME_SKIP;
var SLOW_FRAME_MS;
var STYLE_COMPACT_FRAMES;
var CURSOR_POSITION_QUERY;
var HIDDEN_CURSOR;
var ALT_SCREEN_ANCHOR_CURSOR;
var ALT_SCREEN_ANCHOR_HOME;
var RESET_COLOR_255;
var RESIZE_SETTLE_MS;
var QUERY_TIMEOUT_MS;
var MAX_RESIZE_RETRIES;
var STDIN_RESUME_GAP_MS;
deferInit("chunk-bzr73sfg.js:322930", () => {
  MAX_COLUMNS = 8192;
  FRAME_INTERVAL_MS = 16;
  MAX_FRAME_SKIP = 5;
  SLOW_FRAME_MS = 50;
  STYLE_COMPACT_FRAMES = 5;
  CURSOR_POSITION_QUERY = cursorPosition_2();
  HIDDEN_CURSOR = Object.freeze({
    x: 0,
    y: 0,
    visible: false,
  });
  ALT_SCREEN_ANCHOR_CURSOR = Object.freeze({
    type: "stdout",
    content: CURSOR_HOME,
  });
  ALT_SCREEN_ANCHOR_HOME = Object.freeze({
    type: "stdout",
    content: ERASE_SCREEN + CURSOR_HOME,
  });
  RESET_COLOR_255 = "\x1B]104;255\x07";
  RESIZE_SETTLE_MS = 2000;
  QUERY_TIMEOUT_MS = 2000;
  MAX_RESIZE_RETRIES = 4;
  STDIN_RESUME_GAP_MS = 1000;
});
//@ chunk-bzr73sfg.js:323156-323285 layout
function isGraphemeBoundary(text, index) {
  if (index <= 0) return true;
  for (let segment of getGraphemeSegmenter().segment(text)) {
    if (segment.index === index) return true;
    if (segment.index > index) return false;
  }
  return index >= text.length;
}
//@ chunk-bzr73sfg.js:323285-323354 fingerprint = CURSOR_HOME_PATCH (1)
function cursorToRow(row) {
  return Object.freeze({
    type: "stdout",
    content: cursorPosition(row, 1),
  });
}
//@ chunk-bzr73sfg.js:323354-323377 layout
var MAX_TERMINAL_COLS; // deferred: uses MAX_COLUMNS of its import cycle while loading; runs once the cycle is complete
var MAX_TERMINAL_ROWS;
var MAX_ROWS_ALIAS;
deferInit("chunk-bzr73sfg.js:323354", () => {
  MAX_TERMINAL_COLS = MAX_COLUMNS;
  MAX_TERMINAL_ROWS = 2048;
  MAX_ROWS_ALIAS = 3;
});
//@ chunk-bzr73sfg.js:323377-323775 placement
/**
 * 校验终端尺寸读数，异常值时回退或钳位并记录。
 */
function sanitizeWinsize(value, fallback, max, overflowPolicy, log) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    if (value !== undefined && value !== 0)
      log?.(
        `terminal winsize read returned a garbage dimension: ${String(value)} \u2014 falling back to ${fallback}`,
      );
    return fallback;
  }
  let floored = Math.floor(value);
  if (floored > max) {
    log?.(
      `terminal winsize read returned an absurd dimension: ${String(value)} \u2014 ${overflowPolicy === "clamp" ? `clamping to ${max}` : `falling back to ${fallback}`}`,
    );
    return overflowPolicy === "clamp" ? max : fallback;
  }
  return floored;
}
//@ chunk-bzr73sfg.js:323775-323868 placement = getTerminalSize (0.629)
/**
 * 读终端尺寸，缺省 80×24，列上限 8192、行上限 2048。
 */
function getTerminalSize(stream, log) {
  return {
    cols: sanitizeWinsize(stream.columns, 80, MAX_TERMINAL_COLS, "clamp", log),
    rows: sanitizeWinsize(stream.rows, 24, MAX_TERMINAL_ROWS, "clamp", log),
  };
}
//@ chunk-bzr73sfg.js:323868-377361 fingerprint = Ink (0.459)
/**
 * Ink 渲染器主类：持有终端与布局、帧调度与节流、鼠标/点击/悬停订阅、图像管理、备用屏与暂停交接、布局失败恢复与调试上报，负责把 React 树渲染成终端帧。
 */
class Ink {
  options;
  log;
  terminal;
  scheduleRender;
  ownTree;
  isUnmounted = false;
  layoutListeners = new Set();
  subscribeLayout = (cb) => {
    this.layoutListeners.add(cb);
    return () => {
      this.layoutListeners.delete(cb);
    };
  };
  hoverTrackedListeners = new Set();
  subscribeHoverTracked = (cb) => {
    this.hoverTrackedListeners.add(cb);
    return () => {
      this.hoverTrackedListeners.delete(cb);
    };
  };
  isHoverTracked = () => this.altScreenActive && this.altScreenMouseTracking === "full";
  layoutListenersPaused = false;
  reportedLayoutListenerFault = false;
  layoutListenerFaultDebugLines = 0;
  frameListeners = new Set();
  subscribeFrames = (cb) => {
    this.frameListeners.add(cb);
    return () => {
      this.frameListeners.delete(cb);
    };
  };
  tellFrameListeners() {
    for (let frameListener of this.frameListeners) frameListener();
  }
  clickListeners = new Set();
  subscribeClicks = (cb) => {
    this.clickListeners.add(cb);
    return () => {
      this.clickListeners.delete(cb);
    };
  };
  tellClickedNowhere() {
    let listeners = [...this.clickListeners];
    queueMicrotask(() => {
      for (let listener of listeners) if (this.clickListeners.has(listener)) listener(null, null);
    });
  }
  finePointerHolds = 0;
  cancelFinePointerSettle = undefined;
  retainFinePointer = () => {
    this.finePointerHolds++;
    this.cancelFinePointerSettle ??= getTerminalCapabilities().onSettle("mousePixels", () =>
      this.syncMousePixels(),
    );
    this.syncMousePixels();
    let isFirst = true;
    return () => {
      if (!isFirst) return;
      isFirst = false;
      this.finePointerHolds--;
      this.syncMousePixels();
    };
  };
  isPaused = false;
  get isHandedOff() {
    return (
      this.isPaused ||
      this.modes.isSuspended ||
      (this.ownTree !== undefined && getSecondRootError().has(this.options.stdout))
    );
  }
  container;
  rootNode;
  focusManager;
  renderer;
  stylePool;
  renderDebug;
  charPool;
  hyperlinkPool;
  exitPromise;
  hasExited = false;
  exitError;
  restoreConsole;
  restoreStderr;
  nonBlockingStdout = null;
  terminalImages = new TerminalImageManager(() => this.scheduleRender());
  imagesStale = false;
  appRef = createRef();
  unsubscribeTTYHandlers;
  terminalColumns;
  terminalRows;
  loggedGarbageWinsize = false;
  currentNode = null;
  frontFrame;
  backFrame;
  lastPoolResetTime = performance.now();
  lastAtlasResetAt = 0;
  lastStyleLiveSize = 0;
  drainTimer = null;
  lastPacedFrameAt = -1 / 0;
  frameTimer = null;
  frameTimerDueAt = 0;
  frameMicrotaskQueued = false;
  pacerNow = () => performance.now();
  inputPriorityUntil = 0;
  frameHeldForBacklog = false;
  lastYogaCounters = {
    ms: 0,
    visited: 0,
    measured: 0,
    cacheHits: 0,
    live: 0,
  };
  layoutFailed = false;
  consecutiveLayoutFailures = 0;
  layoutFaultDebugLines = 0;
  reportedLayoutFaultMessages = new Set();
  reportedLayoutFaultRecovered = false;
  reportedLayoutFaultDropped = false;
  reportedLayoutFaultPersisting = false;
  altScreenParkPatch;
  selection = createSelectionState();
  searchHighlightQuery = "";
  searchPositions = null;
  selectionListeners = new Set();
  selectionTakeDown = createSelectionTakeDownSignal();
  frameSink = null;
  hoveredNodes = new Set();
  hoverCol = -1;
  hoverRow = -1;
  hoveredLink;
  hoveredLinkSpans = [];
  hoverFollowStreak = 0;
  hoverFollowHeldUntil = 0;
  pointerCapture = null;
  hasRendered = false;
  renderCalled = false;
  isExiting = false;
  altScreenActive = false;
  _handoffRawMode = false;
  altScreenMouseTracking = "off";
  mainScreenBehindAlt;
  modes = new TerminalModes();
  prevFrameContaminated = false;
  prevOverlaySig = "";
  needsEraseBeforePaint = false;
  keptForNextFrame = "";
  leftAltScreenSinceFrame = false;
  altScreenHandOverAsked = false;
  heldAltScreenLeave;
  get altScreenFullRepaint() {
    return env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT;
  }
  bgWorkerForceShowCursor;
  fullRepaintSentinelScreen;
  cursorDeclaration = null;
  displayCursor = null;
  accessibilityMode;
  nativeCursorVisible;
  isScreenReaderEnabled;
  prevScreenReaderLines = [];
  prevScreenReaderPark = {
    row: 0,
    col: 0,
  };
  prevScreenReaderParkDeclared = false;
  prevScreenReaderAnchor = "clean";
  srStartupQuietTimer = null;
  srPreParkTimer = null;
  srAnnouncementHoldTimer = null;
  srHeldAnnouncements = [];
  srRewriteHeldAnnouncement = rewriteHeldAnnouncement();
  srPreParked = false;
  resetScreenReaderDiffState() {
    this.prevScreenReaderLines = [];
    this.prevScreenReaderPark = {
      row: 0,
      col: 0,
    };
    this.prevScreenReaderParkDeclared = false;
    this.prevScreenReaderAnchor = "clean";
    this.srPreParked = false;
  }
  constructor(inkOptions) {
    this.options = inkOptions;
    autoBind(this);
    this.accessibilityMode = env.CLAUDE_CODE_ACCESSIBILITY;
    this.bgWorkerForceShowCursor =
      this.altScreenFullRepaint &&
      !this.options.nativeCursor &&
      env.CLAUDE_CODE_SESSION_KIND === "bg" &&
      getPlatform() === "windows";
    this.nativeCursorVisible = this.accessibilityMode;
    this.liveCountsEnabled = env.CLAUDE_CODE_BENCH_LIVE_COUNTS;
    this.isScreenReaderEnabled =
      inkOptions.isScreenReaderEnabled ??
      (!!inkOptions.stdout.isTTY && isEnvTruthy(process.env.INK_SCREEN_READER));
    if (this.options.patchConsole) {
      this.restoreConsole = this.patchConsole();
      this.restoreStderr = this.patchStderr();
    }
    this.terminal = {
      stdout: inkOptions.stdout,
      stderr: inkOptions.stderr,
      tolerateDeadStdout: env.CLAUDE_BG_BACKEND === "daemon",
      stdoutDead: false,
    };
    if (
      inkOptions.stdout === process.stdout &&
      (isNonBlockingStdoutInstalled() ||
        isNonBlockingStdoutEnabled({
          envOverride: env.CLAUDE_CODE_NONBLOCKING_STDOUT,
          isAnt: false,
          remoteFlag: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_event_loop_stall", false) === true,
        }))
    )
      this.nonBlockingStdout = installNonBlockingStdout(this.handleStdoutBackpressure);
    if (inkOptions.stdout === process.stdout) {
      if (inkOptions.stdout.isTTY)
        inkOptions.stdout.write("\x1B7" + RESET_SCROLL_REGION + "\x1B8" + SHOW_CURSOR);
    }
    let { cols, rows } = getTerminalSize(inkOptions.stdout, this.warnGarbageWinsizeOnce);
    this.terminalColumns = cols;
    this.terminalRows = rows;
    this.altScreenParkPatch = cursorToRow(this.terminalRows);
    this.stylePool = new StylePool();
    if (inkOptions.atlasRecorder) {
      let atlasRecorder = this.stylePool.atlasRecorder;
      atlasRecorder.recording = inkOptions.atlasRecorder.recording;
      atlasRecorder.autoResetEnabled = inkOptions.atlasRecorder.autoResetEnabled;
    }
    this.renderDebug = new RenderDebugHud(this.stylePool);
    this.charPool = new CharPool();
    this.hyperlinkPool = new HyperlinkPool();
    this.frontFrame = emptyFrame(
      this.terminalRows,
      this.terminalColumns,
      this.stylePool,
      this.charPool,
      this.hyperlinkPool,
    );
    this.backFrame = emptyFrame(
      this.terminalRows,
      this.terminalColumns,
      this.stylePool,
      this.charPool,
      this.hyperlinkPool,
    );
    this.log = new LogUpdate({
      isTTY: inkOptions.stdout.isTTY || false,
      stylePool: this.stylePool,
    });
    this.scheduleRender = Object.assign(() => this.scheduleFrame(), {
      cancel: () => this.cancelScheduledFrame(),
    });
    this.isUnmounted = false;
    this.unsubscribeExit = onExit(this.unmount, {
      alwaysLast: false,
    });
    this.rootNode = createNode("ink-root", Yoga.Config.create());
    this.focusManager = new FocusManager((previous, next) => dispatcher.dispatchDiscrete(previous, next));
    this.rootNode.focusManager = this.focusManager;
    this.rootNode.debugRepaints = env.CLAUDE_CODE_DEBUG_REPAINTS;
    this.renderer = createRenderer(this.rootNode, this.stylePool);
    this.rootNode.onRender = this.scheduleRender;
    this.rootNode.onImmediateRender = this.onRender;
    this.rootNode.onComputeLayout = () => {
      if (this.isUnmounted) return;
      if (this.options.stdout.isTTY && this.syncTerminalSize()) {
        let currentNode = this.currentNode;
        if (currentNode !== null)
          queueMicrotask(() => {
            if (!this.isUnmounted) this.render(currentNode);
          });
      }
      if (this.rootNode.yogaNode) this.runLayoutPass(this.rootNode.yogaNode);
      this.notifyLayoutListeners();
    };
    this.container = reconcilerAlias.createContainer(
      this.rootNode,
      concurrentRoot,
      null,
      false,
      null,
      "id",
      import_noop,
      import_noop,
      import_noop,
      import_noop,
    );
  }
  handleResume = () => {
    this.forgetPointer();
    if (!this.options.stdout.isTTY) return;
    process.kill(process.pid, "SIGWINCH");
    if (this.altScreenActive) {
      if (this.modes.isSuspended) {
        this.resetFramesForAltScreen();
        this.imagesStale = true;
        this.scheduleRender();
        return;
      }
      this.reenterAltScreen();
      return;
    }
    this.mainScreenBehindAlt = undefined;
    this.frontFrame = emptyFrame(
      this.frontFrame.viewport.height,
      this.frontFrame.viewport.width,
      this.stylePool,
      this.charPool,
      this.hyperlinkPool,
    );
    this.backFrame = emptyFrame(
      this.backFrame.viewport.height,
      this.backFrame.viewport.width,
      this.stylePool,
      this.charPool,
      this.hyperlinkPool,
    );
    this.log.reset();
    this.prevFrameContaminated = true;
    this.imagesStale = true;
    this.displayCursor = null;
    this.nativeCursorVisible = this.accessibilityMode;
    this.resetScreenReaderDiffState();
    this.scheduleRender();
  };
  stdoutSize() {
    return {
      columns: sanitizeWinsize(
        this.options.stdout.columns,
        this.terminalColumns,
        MAX_TERMINAL_COLS,
        "fallback",
        this.warnGarbageWinsizeOnce,
      ),
      rows: sanitizeWinsize(
        this.options.stdout.rows,
        this.terminalRows,
        MAX_TERMINAL_ROWS,
        "fallback",
        this.warnGarbageWinsizeOnce,
      ),
    };
  }
  warnGarbageWinsizeOnce(message) {
    if (this.loggedGarbageWinsize) return;
    this.loggedGarbageWinsize = true;
    logForDebugging(message, {
      level: "warn",
    });
  }
  hasStaleTerminalSize() {
    let { columns, rows } = this.stdoutSize();
    return columns !== this.terminalColumns || rows !== this.terminalRows;
  }
  syncTerminalSize() {
    if (!this.hasStaleTerminalSize()) return false;
    let { columns, rows } = this.stdoutSize();
    this.terminalColumns = columns;
    this.terminalRows = rows;
    this.altScreenParkPatch = cursorToRow(this.terminalRows);
    this.resetScreenReaderDiffState();
    if (this.altScreenActive && !this.isHandedOff && this.options.stdout.isTTY) {
      if (this.altScreenMouseTracking !== "off") this.options.stdout.write(this.mouseOnSeq());
      this.resetFramesForAltScreen();
      this.needsEraseBeforePaint = true;
    }
    return true;
  }
  handleWinch = () => {
    this.appRef.current?.reprobeCellPixels();
  };
  handleResize = () => {
    if (!this.syncTerminalSize()) return;
    this.appRef.current?.reprobeCellPixels();
    this.appRef.current?.refreshTmuxPane(false);
    if (this.currentNode !== null) {
      this.render(this.currentNode);
      return;
    }
    this.rootNode.layoutStale = false;
    this.rootNode.onComputeLayout?.();
    this.scheduleRender();
  };
  resolveExitPromise = () => {
    this.exitPromise ??= Promise.resolve();
  };
  rejectExitPromise = (error) => {
    if (this.exitPromise === undefined) {
      this.exitPromise = Promise.reject(error);
      this.exitPromise.catch(() => {});
    }
  };
  unsubscribeExit = () => {};
  enterAlternateScreen() {
    this.pause();
    this.forgetPointer();
    this.options.stdout.write(
      this.modes.suspend("altScreen") +
        (this.altScreenActive ? "" : ENTER_ALT_SCREEN + popKittyKeyboardSequence()) +
        SGR_RESET +
        SHOW_CURSOR +
        ERASE_SCREEN +
        CURSOR_HOME,
    );
    this.nonBlockingStdout?.flush();
    this.suspendStdin();
  }
  exitAlternateScreen() {
    this.resumeStdin();
    let hideCursor = this.altScreenActive || !(this.accessibilityMode || this.isScreenReaderEnabled);
    this.options.stdout.write(
      (this.altScreenActive ? "" : EXIT_ALT_SCREEN) +
        (hideCursor ? HIDE_CURSOR : "") +
        this.modes.resume({
          clearKeys: true,
        }) +
        (this.altScreenActive ? HIDE_CURSOR : ""),
    );
    if (this.altScreenActive) {
      this.resetFramesForAltScreen();
      this.imagesStale = true;
    } else if (!this.isScreenReaderEnabled)
      if (isFrameOverflowing(this.frontFrame)) {
        this.log.forceFullReset();
        this.prevFrameContaminated = true;
        this.imagesStale = true;
      } else {
        this.options.stdout.write(eraseMainScreenFrame(this.frontFrame.cursor, this.displayCursor));
        this.repaint();
      }
    this.resume();
  }
  prepareTerminalForHandoff() {
    this.pause();
    this.forgetPointer();
    this.options.stdout.write((this.altScreenMouseTracking !== "off" ? DISABLE_MOUSE_TRACKING : "") + DFE);
    this.nonBlockingStdout?.flush();
    this.suspendStdin();
  }
  restoreTerminalAfterHandoff() {
    this.resumeStdin();
    this.options.stdout.write(this.mouseOnSeq() + EFE);
    this.resume();
  }
  ensureInteractive = () => {
    if (this.unsubscribeTTYHandlers || !this.options.stdout.isTTY) return;
    if (!this.accessibilityMode && !this.isScreenReaderEnabled) this.writeAfterKept(HIDE_CURSOR);
    this.options.stdout.on("resize", this.handleResize);
    process.on("SIGCONT", this.handleResume);
    process.on("SIGWINCH", this.handleWinch);
    this.unsubscribeTTYHandlers = () => {
      this.options.stdout.off("resize", this.handleResize);
      process.off("SIGCONT", this.handleResume);
      process.off("SIGWINCH", this.handleWinch);
    };
  };
  skipSyncMarkers() {
    if (!this.options.stdout.isTTY) return true;
    if (!isSynchronizedOutputLikely()) return true;
    if (!this.unsubscribeTTYHandlers) return true;
    return false;
  }
  notifyLayoutListeners() {
    if (this.layoutListenersPaused) return;
    for (let layoutListener of this.layoutListeners)
      try {
        layoutListener();
      } catch (error) {
        this.pauseLayoutListeners();
        this.reportLayoutListenerFault(Ink.describeLayoutFault(error));
        return;
      }
  }
  pauseLayoutListeners() {
    this.layoutListenersPaused = true;
    queueMicrotask(() => {
      this.layoutListenersPaused = false;
    });
  }
  reportLayoutListenerFault(fault) {
    try {
      this.reportLayoutFaultErrorOnce(fault);
      if (!this.reportedLayoutListenerFault) {
        this.reportedLayoutListenerFault = true;
        this.reportLayoutListenersPaused();
      }
      this.logLayoutListenerFaultForDebugging(fault);
    } catch {}
  }
  reportLayoutListenersPaused() {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "ink layout listener threw; layout listeners paused until this flush unwinds",
      ),
    );
  }
  logLayoutListenerFaultForDebugging(fault) {
    try {
      if (this.layoutListenerFaultDebugLines >= STYLE_COMPACT_FRAMES) return;
      this.layoutListenerFaultDebugLines++;
      let startTime =
        this.layoutListenerFaultDebugLines >= STYLE_COMPACT_FRAMES
          ? " \u2014 further layout listener faults in this session are not logged"
          : "";
      logForDebugging(
        `ink layout listener threw (contained; layout listeners paused until this flush unwinds): ${fault.name}: ${fault.message}${startTime}`,
        {
          level: "warn",
        },
      );
    } catch {}
  }
  runLayoutPass(yogaNode) {
    try {
      this.calculateYogaLayout(yogaNode);
      this.layoutFailed = false;
      this.consecutiveLayoutFailures = 0;
    } catch (error) {
      let result = this.relayoutFromScratch(yogaNode);
      this.layoutFailed = !result.recovered;
      this.consecutiveLayoutFailures = result.recovered ? 0 : this.consecutiveLayoutFailures + 1;
      let fault = Ink.describeLayoutFault(error);
      let retryFault = result.recovered ? undefined : Ink.describeLayoutFault(result.retryFault);
      this.reportLayoutFaultToErrorTracking(fault, retryFault);
      this.logLayoutFaultForDebugging(fault, retryFault);
    }
  }
  calculateYogaLayout(rootYoga) {
    let startTime = performance.now();
    if (this.options.stdout.isTTY || this.options.stdout.columns) {
      rootYoga.setWidth(this.terminalColumns);
      rootYoga.calculateLayout(this.terminalColumns);
    } else {
      rootYoga.setWidthAuto();
      rootYoga.calculateLayout();
      if (rootYoga.getComputedWidth() > MAX_COLUMNS) {
        rootYoga.setWidth(MAX_COLUMNS);
        rootYoga.calculateLayout(MAX_COLUMNS);
      }
    }
    let ms = performance.now() - startTime;
    let yogaCounters = getYogaCounters(rootYoga);
    this.lastYogaCounters = {
      ms,
      ...yogaCounters,
    };
  }
  relayoutFromScratch(yogaNode) {
    try {
      yogaNode.clearLayoutCacheRecursive();
      this.calculateYogaLayout(yogaNode);
      return {
        recovered: true,
      };
    } catch (error) {
      try {
        yogaNode.clearLayoutCacheRecursive();
      } catch {}
      return {
        recovered: false,
        retryFault: error,
      };
    }
  }
  retryFailedLayout() {
    let yogaNode = this.rootNode.yogaNode;
    if (!yogaNode || !this.relayoutFromScratch(yogaNode).recovered) return false;
    this.layoutFailed = false;
    this.consecutiveLayoutFailures = 0;
    return true;
  }
  static describeLayoutFault(error) {
    try {
      let error_2 = toError(error);
      if (typeof error_2.message === "string" && typeof error_2.name === "string") return error_2;
    } catch {}
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "ink layout pass threw a value that cannot be described",
    );
  }
  reportLayoutFaultToErrorTracking(fault, message) {
    try {
      this.reportLayoutFaultErrorOnce(fault);
      if (message === undefined) {
        if (!this.reportedLayoutFaultRecovered) {
          this.reportedLayoutFaultRecovered = true;
          this.reportLayoutFaultRecovered();
        }
        return;
      }
      this.reportLayoutFaultErrorOnce(message);
      if (!this.reportedLayoutFaultDropped) {
        this.reportedLayoutFaultDropped = true;
        this.reportLayoutFaultDropped();
      }
      if (!this.reportedLayoutFaultPersisting && this.consecutiveLayoutFailures >= SLOW_FRAME_MS) {
        this.reportedLayoutFaultPersisting = true;
        this.reportLayoutFaultPersisting();
      }
    } catch {}
  }
  reportLayoutFaultErrorOnce(fault) {
    let reportedLayoutFaultMessages = this.reportedLayoutFaultMessages;
    if (
      reportedLayoutFaultMessages.has(fault.message) ||
      reportedLayoutFaultMessages.size >= FRAME_INTERVAL_MS
    )
      return;
    reportedLayoutFaultMessages.add(fault.message);
    logError(fault);
  }
  reportLayoutFaultRecovered() {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "ink layout pass threw; recovered by immediate re-layout",
      ),
    );
  }
  reportLayoutFaultDropped() {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "ink layout pass threw; immediate re-layout also threw, frame dropped",
      ),
    );
  }
  reportLayoutFaultPersisting() {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "ink layout pass still throwing after many consecutive commits, frames dropped",
      ),
    );
  }
  logLayoutFaultForDebugging(fault, extra) {
    try {
      if (this.layoutFaultDebugLines >= MAX_FRAME_SKIP) return;
      this.layoutFaultDebugLines++;
      let startedAt =
        extra === undefined
          ? "recovered by immediate re-layout"
          : `immediate re-layout also threw (${extra.name}: ${extra.message}); frame dropped`;
      let lastPaintAt =
        this.layoutFaultDebugLines >= MAX_FRAME_SKIP
          ? " \u2014 further layout faults in this session are not logged"
          : "";
      logForDebugging(`ink layout pass threw (${startedAt}): ${fault.name}: ${fault.message}${lastPaintAt}`, {
        level: "warn",
      });
    } catch {}
  }
  requestInputPriorityFrame = () => {
    this.inputPriorityUntil = this.pacerNow() + SCROLL_MAX_ROWS_PER_TICK;
    let shouldBypassPacing = false;
    if (this.srAnnouncementHoldTimer !== null) {
      endAnnouncementHold();
      shouldBypassPacing = true;
    }
    if (this.isScreenReaderEnabled && this.srHeldAnnouncements.length > 0) {
      this.srHeldAnnouncements = [];
      shouldBypassPacing = true;
    }
    if (shouldBypassPacing) this.onRender();
  };
  scheduleFrame() {
    if (this.frameMicrotaskQueued) return;
    let nowMs = this.pacerNow();
    let msSinceFrame = nowMs - this.lastPacedFrameAt;
    let minRowDelta = nowMs < this.inputPriorityUntil ? SCROLL_MIN_ROWS : SCROLL_JUMP_LINES;
    if (msSinceFrame >= minRowDelta) {
      this.queuePacedFrame();
      return;
    }
    let earliestNextFrameAt = this.lastPacedFrameAt + minRowDelta;
    if (this.frameTimer === null || earliestNextFrameAt < this.frameTimerDueAt) {
      this.cancelScheduledFrame();
      this.frameTimerDueAt = earliestNextFrameAt;
      this.frameTimer = setTimeout(
        () => {
          this.frameTimer = null;
          this.queuePacedFrame();
        },
        Math.max(0, earliestNextFrameAt - nowMs),
      );
    }
  }
  queuePacedFrame() {
    this.cancelScheduledFrame();
    if (this.nonBlockingStdout !== null && this.nonBlockingStdout.queuedBytes() > SCROLL_HISTORY_LIMIT) {
      this.frameHeldForBacklog = true;
      this.frameTimerDueAt = this.pacerNow() + SCROLL_TICK_MS;
      this.frameTimer = setTimeout(() => {
        this.frameTimer = null;
        this.queuePacedFrame();
      }, SCROLL_TICK_MS);
      return;
    }
    this.frameHeldForBacklog = false;
    this.frameMicrotaskQueued = true;
    this.inputPriorityUntil = 0;
    this.lastPacedFrameAt = this.pacerNow();
    queueMicrotask(() => {
      this.frameMicrotaskQueued = false;
      this.onRender();
    });
  }
  cancelScheduledFrame() {
    if (this.frameTimer !== null) {
      clearTimeout(this.frameTimer);
      this.frameTimer = null;
    }
  }
  onRender() {
    if (this.isUnmounted || this.isHandedOff) return;
    if (this.hasRendered && !this.isExiting) this.ensureInteractive();
    this.hasRendered = true;
    if (this.drainTimer !== null) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    if (this.rootNode.layoutStale) {
      this.rootNode.layoutStale = false;
      if (this.options.stdout.isTTY && this.hasStaleTerminalSize()) this.handleResize();
      else {
        this.rootNode.onComputeLayout?.();
        reconcilerAlias.flushSyncWork();
      }
      if (this.isUnmounted || this.isHandedOff) return;
    }
    flushInteractionTime();
    if (this.isScreenReaderEnabled) {
      this.writeKeptForNextFrame();
      this.leftAltScreenSinceFrame = false;
      this.onRenderScreenReader();
      return;
    }
    if (this.layoutFailed && !this.retryFailedLayout()) return;
    let startTime = performance.now();
    let { columns, rows } = this.stdoutSize();
    let { anchor, focus } = this.selection;
    let searchPositions = this.searchPositions;
    let cacheKey = `${anchor?.row},${anchor?.col},${focus?.row},${focus?.col}|${this.searchHighlightQuery}|${searchPositions?.currentIdx},${searchPositions?.rowOffset},${searchPositions?.positions.length}`;
    let renderKey =
      this.prevFrameContaminated || cacheKey !== this.prevOverlaySig || this.hoveredLinkSpans.length > 0;
    this.prevOverlaySig = cacheKey;
    if (this.imagesStale) {
      this.imagesStale = false;
      this.terminalImages.retransmitAll();
    }
    let tmuxPane = env.TMUX ? getTerminalProbeState().tmuxPane : undefined;
    let tmuxPassthrough = tmuxPane !== undefined && tmuxPane.passthrough !== "off";
    this.terminalImages.isTmuxPassthrough = tmuxPassthrough;
    let overlayActive =
      (anchor !== null && focus !== null && !isSelectionFullyOffscreen(this.selection)) ||
      !!this.searchHighlightQuery ||
      !!searchPositions;
    let frame = this.renderer({
      frontFrame: this.frontFrame,
      backFrame: this.backFrame,
      isTTY: this.options.stdout.isTTY,
      terminalWidth: columns,
      terminalRows: rows,
      altScreen: this.altScreenActive,
      prevFrameContaminated: renderKey,
      overlayActive,
    });
    let renderer = performance.now() - startTime;
    if (this.frameSink) {
      let imageOutput = this.altScreenActive ? "" : this.terminalImages.drain();
      if (imageOutput !== "") this.writeContent(imageOutput);
      let frameOps = this.frameSink(frame, this.stylePool);
      if (frameOps) {
        this.leftAltScreenSinceFrame = false;
        this.backFrame = this.frontFrame;
        this.frontFrame = frame;
        this.prevFrameContaminated = false;
        this.mainScreenBehindAlt = undefined;
        this.repaintAfterStaleAbsolutePaint(frame);
        this.maybeResetPools(startTime);
        if (frameOps === "tick") this.drainTimer = setTimeout(() => this.onRender(), SCROLL_JUMP_LINES >> 2);
        this.tellFrameListeners();
        this.options.onFrame?.({
          durationMs: performance.now() - startTime,
          flickers: [],
        });
        return;
      }
    }
    let followScroll = frame.followScroll ?? null;
    if (
      followScroll &&
      this.selection.anchor &&
      this.selection.anchor.row >= followScroll.viewportTop &&
      this.selection.anchor.row <= followScroll.viewportBottom &&
      (this.selection.virtualAnchorCol ?? this.selection.anchor.col) >= followScroll.viewportLeft &&
      (this.selection.virtualAnchorCol ?? this.selection.anchor.col) <= followScroll.viewportRight
    ) {
      let { delta, viewportTop, viewportBottom } = followScroll;
      let firstRow = delta > 0 ? viewportTop : viewportBottom + delta + 1;
      let lastRow = delta > 0 ? viewportTop + delta - 1 : viewportBottom;
      let side = delta > 0 ? "above" : "below";
      if (this.selection.isDragging) {
        if (hasSelection(this.selection))
          captureScrolledRows(this.selection, this.frontFrame.screen, firstRow, lastRow, side);
        shiftAnchor(this.selection, -delta, viewportTop, viewportBottom);
      } else if (
        !this.selection.focus ||
        (this.selection.focus.row >= viewportTop &&
          this.selection.focus.row <= viewportBottom &&
          (this.selection.virtualFocusCol ?? this.selection.focus.col) >= followScroll.viewportLeft &&
          (this.selection.virtualFocusCol ?? this.selection.focus.col) <= followScroll.viewportRight)
      ) {
        if (hasSelection(this.selection))
          captureScrolledRows(this.selection, this.frontFrame.screen, firstRow, lastRow, side);
        shiftSelection(this.selection, -delta, viewportTop, viewportBottom, this.frontFrame.screen.width);
      }
    }
    let flagA = false;
    let flagB = false;
    if (this.altScreenActive) {
      if (this.hoveredLink !== undefined || this.hoveredLinkSpans.length > 0) {
        this.hoveredLinkSpans = underlineHyperlinkAt(
          frame.screen,
          this.hoverCol,
          this.hoverRow,
          this.hoveredLink,
          this.stylePool,
        );
        if (this.hoveredLinkSpans.length === 0) this.hoveredLink = undefined;
      }
      flagA = hasSelection(this.selection) && !isSelectionFullyOffscreen(this.selection);
      if (flagA) applySelectionOverlay(frame.screen, this.selection, this.stylePool);
      flagB = applySearchHighlight(frame.screen, this.searchHighlightQuery, this.stylePool);
      if (this.searchPositions) {
        let searchPositions = this.searchPositions;
        let posApplied = applyPositionedHighlight(
          frame.screen,
          this.stylePool,
          searchPositions.positions,
          searchPositions.rowOffset,
          searchPositions.currentIdx,
        );
        flagB = flagB || posApplied;
      }
    }
    if (
      frame.layoutShifted ||
      flagA ||
      flagB ||
      renderKey ||
      (this.altScreenFullRepaint && this.altScreenActive)
    )
      frame.screen.damage = {
        x: 0,
        y: 0,
        width: frame.screen.width,
        height: frame.screen.height,
      };
    let mainScreenBehindAlt = this.altScreenActive ? undefined : this.mainScreenBehindAlt;
    if (mainScreenBehindAlt !== undefined) {
      this.mainScreenBehindAlt = undefined;
      this.frontFrame = emptyFrame(
        mainScreenBehindAlt.viewport.height,
        mainScreenBehindAlt.viewport.width,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      );
    }
    let frontFrame = this.frontFrame;
    if (this.altScreenActive) {
      frontFrame = {
        ...this.frontFrame,
        cursor: HIDDEN_CURSOR,
      };
      if (this.altScreenFullRepaint) {
        let { width, height } = this.frontFrame.screen;
        if (
          this.fullRepaintSentinelScreen?.width !== width ||
          this.fullRepaintSentinelScreen.height !== height
        ) {
          this.fullRepaintSentinelScreen = createScreen(
            width,
            height,
            this.stylePool,
            this.charPool,
            this.hyperlinkPool,
          );
          fillScreenWithSpacers(this.fullRepaintSentinelScreen);
        }
        frontFrame = {
          ...frontFrame,
          screen: this.fullRepaintSentinelScreen,
        };
      }
    }
    let tDiff = performance.now();
    let diff = this.log.render(
      frontFrame,
      frame,
      this.altScreenActive,
      DECSTBM_ENABLED &&
        !this.altScreenFullRepaint &&
        !this.skipSyncMarkers() &&
        isSynchronizedOutputSupported(),
    );
    let diffMs = performance.now() - tDiff;
    this.backFrame = this.frontFrame;
    this.frontFrame = frame;
    let flickers = [];
    for (let patch of diff)
      if (patch.type === "clearTerminal") {
        flickers.push({
          desiredHeight: frame.screen.height,
          availableHeight: frame.viewport.height,
          reason: patch.reason,
        });
        if (this.rootNode.debugRepaints && patch.debug) {
          let chain = findOwnerChainAtRow(this.rootNode, patch.debug.triggerY);
          logForDebugging(
            `[REPAINT] full reset \xB7 ${patch.reason} \xB7 row ${patch.debug.triggerY}
  prev: "${patch.debug.prevLine}"
  next: "${patch.debug.nextLine}"
  culprit: ${chain.length ? chain.join(" < ") : "(no owner chain captured)"}`,
            {
              level: "warn",
            },
          );
        }
      }
    let tOptimize = performance.now();
    let patches = optimize(diff);
    let optimizeMs = performance.now() - tOptimize;
    let hasDiff = patches.length > 0;
    let any = diff.some((op) => op.type === "clearTerminal");
    if (this.altScreenActive && hasDiff) {
      if (this.needsEraseBeforePaint) {
        this.needsEraseBeforePaint = false;
        any = true;
        patches.unshift(
          isItermOrTmuxXtversion() && env.CLAUDE_BG_BACKEND !== "daemon"
            ? {
                type: "stdout",
                content: eraseViewportInPlace(rows),
              }
            : ALT_SCREEN_ANCHOR_HOME,
        );
      } else patches.unshift(ALT_SCREEN_ANCHOR_CURSOR);
      patches.push(this.altScreenParkPatch);
    }
    if (mainScreenBehindAlt !== undefined && mainScreenBehindAlt.erase !== "")
      patches.unshift({
        type: "stdout",
        content: mainScreenBehindAlt.erase,
      });
    let decl = this.cursorDeclaration;
    let rect = decl !== null ? decl.node.cachedLayout : undefined;
    let target =
      decl !== null && rect !== undefined
        ? {
            x: rect.x + decl.relativeX,
            y: rect.y + decl.relativeY,
          }
        : null;
    let parked = this.displayCursor;
    let targetMoved = target !== null && (parked === null || parked.x !== target.x || parked.y !== target.y);
    let deltaY =
      this.options.nativeCursor &&
      target !== null &&
      decl !== null &&
      (decl.visible || this.accessibilityMode) !== this.nativeCursorVisible;
    if (hasDiff || targetMoved || deltaY || (target === null && parked !== null)) {
      let maxDelta = rows - 1;
      let clampDelta = (value) => Math.max(-maxDelta, Math.min(maxDelta, value));
      if (parked !== null && !this.altScreenActive && hasDiff) {
        let pdx = frontFrame.cursor.x - parked.x;
        let pdy = clampDelta(frontFrame.cursor.y - parked.y);
        if (pdx !== 0 || pdy !== 0)
          patches.unshift({
            type: "stdout",
            content: cursorMove(pdx, pdy),
          });
      }
      if (target !== null) {
        if (this.altScreenActive) {
          let row = Math.min(Math.max(target.y + 1, 1), rows);
          let col = Math.min(Math.max(target.x + 1, 1), columns);
          patches.push({
            type: "stdout",
            content: cursorPosition(row, col),
          });
        } else {
          let from =
            !hasDiff && parked !== null
              ? parked
              : {
                  x: frame.cursor.x,
                  y: frame.cursor.y,
                };
          let dx = target.x - from.x;
          let dy = clampDelta(target.y - from.y);
          if (dx !== 0 || dy !== 0)
            patches.push({
              type: "stdout",
              content: cursorMove(dx, dy),
            });
        }
        this.displayCursor = {
          ...target,
          emittedRows: rows,
        };
        if (this.options.nativeCursor || this.bgWorkerForceShowCursor) {
          let placements =
            this.bgWorkerForceShowCursor || (decl !== null && decl.visible) || this.accessibilityMode;
          if (this.nativeCursorVisible)
            patches.unshift({
              type: "cursorHide",
            });
          if (placements)
            patches.push({
              type: "cursorShow",
            });
          this.nativeCursorVisible = placements;
        }
      } else {
        if (parked !== null && !this.altScreenActive && !hasDiff) {
          let rdx = frame.cursor.x - parked.x;
          let rdy = clampDelta(frame.cursor.y - parked.y);
          if (rdx !== 0 || rdy !== 0)
            patches.push({
              type: "stdout",
              content: cursorMove(rdx, rdy),
            });
        }
        this.displayCursor = null;
        if (
          (this.options.nativeCursor || this.bgWorkerForceShowCursor) &&
          this.nativeCursorVisible &&
          !this.accessibilityMode
        ) {
          patches.unshift({
            type: "cursorHide",
          });
          this.nativeCursorVisible = false;
        }
      }
    }
    if (hasDiff) this.maybeProactiveAtlasReset(patches);
    let placements = this.terminalImages.placeIterm(
      frame.screen,
      any ? undefined : frontFrame.screen,
      this.altScreenActive
        ? altScreenImagePlacer(columns, rows)
        : mainScreenImagePlacer(
            frame,
            this.displayCursor ?? frame.cursor,
            rows,
            this.log.scrolledOutRowsOf(frame) ?? 0,
          ),
      tmuxPassthrough
        ? tmuxPanePlacer(
            tmuxPane,
            this.altScreenActive && tmuxPane.isPlaced && !getTerminalProbeState().isTmuxPaneAsked,
            columns,
            rows,
          )
        : undefined,
      isFreshTmuxProbe(tmuxPassthrough, getTerminalProbeState().tmuxPaneAnsweredAt, performance.now()),
    );
    if (placements !== "")
      patches.push({
        type: "stdout",
        content: placements,
      });
    if (tmuxPassthrough && this.terminalImages.hasHeldDraw)
      queueMicrotask(() => this.appRef.current?.refreshTmuxPaneForPicture());
    let imageOps = this.terminalImages.drain();
    if (imageOps !== "")
      patches.unshift({
        type: "stdout",
        content: imageOps,
      });
    let startTime_2 = performance.now();
    this.leftAltScreenSinceFrame = false;
    writeDiffToTerminal(
      this.terminal,
      patches,
      this.skipSyncMarkers() || (tmuxPassthrough && (this.terminalImages.size > 0 || imageOps !== "")),
      rows,
      this.takeKeptForNextFrame(),
    );
    let writeMs = performance.now() - startTime_2;
    this.maybeResetPools(startTime);
    this.prevFrameContaminated = false;
    this.repaintAfterStaleAbsolutePaint(frame);
    if (frame.scrollDrainPending) this.drainTimer = setTimeout(() => this.onRender(), SCROLL_JUMP_LINES >> 2);
    let commit = this.rootNode.lastCommitMs ?? 0;
    let lastYogaCounters = this.lastYogaCounters;
    this.rootNode.lastCommitMs = 0;
    this.rootNode.scrollCommitStartedAt = undefined;
    this.lastYogaCounters = {
      ms: 0,
      visited: 0,
      measured: 0,
      cacheHits: 0,
      live: 0,
    };
    if (hasDiff || frame.layoutShifted) this.followHover();
    this.tellFrameListeners();
    this.options.onFrame?.({
      durationMs: performance.now() - startTime,
      phases: {
        renderer,
        diff: diffMs,
        optimize: optimizeMs,
        write: writeMs,
        patches: diff.length,
        yoga: lastYogaCounters.ms,
        commit,
        yogaVisited: lastYogaCounters.visited,
        yogaMeasured: lastYogaCounters.measured,
        yogaCacheHits: lastYogaCounters.cacheHits,
        yogaLive: lastYogaCounters.live,
        ...(this.liveCountsEnabled &&
          this.shouldSampleLiveCounts() && {
            domLive: countDomNodes(this.rootNode),
            fiberLive: countFibers(this.container.current),
          }),
      },
      flickers,
      front: {
        screen: this.frontFrame.screen,
        altScreen: this.altScreenActive,
        viewport: this.frontFrame.viewport,
        cursor: this.frontFrame.cursor,
        parked: this.displayCursor,
      },
    });
  }
  static LIVE_COUNTS_INTERVAL_MS = 100;
  liveCountsEnabled;
  lastLiveCountSampleAt = 0;
  shouldSampleLiveCounts() {
    let startTime = performance.now();
    if (startTime - this.lastLiveCountSampleAt < Ink.LIVE_COUNTS_INTERVAL_MS) return false;
    this.lastLiveCountSampleAt = startTime;
    return true;
  }
  onRenderScreenReader() {
    if (!this.isExiting) {
      let quietRemainingMs = startupQuietRemainingMs();
      if (quietRemainingMs > 0) {
        if (this.srStartupQuietTimer === null)
          this.srStartupQuietTimer = setTimeout(() => {
            this.srStartupQuietTimer = null;
            endStartupQuiet();
            this.onRender();
          }, quietRemainingMs);
        return;
      }
    }
    if (this.srPreParkTimer !== null) {
      if (!this.isExiting) return;
      clearTimeout(this.srPreParkTimer);
      this.srPreParkTimer = null;
    }
    if (this.srAnnouncementHoldTimer !== null) {
      if (isAnnouncementHoldActive() && !this.isExiting) return;
      clearTimeout(this.srAnnouncementHoldTimer);
      this.srAnnouncementHoldTimer = null;
    }
    let { text, preserveRanges, rowPrefixRanges } = renderNodeToScreenReaderOutput(this.rootNode);
    let { columns } = this.stdoutSize();
    let mergedRanges = [];
    for (let [start, end] of [...preserveRanges].sort((left, right) => left[0] - right[0])) {
      let last = mergedRanges.at(-1);
      if (last !== undefined && start <= last[1]) last[1] = Math.max(last[1], end);
      else mergedRanges.push([start, end]);
    }
    let parts =
      text === ""
        ? []
        : text.split(`
`);
    let lines = [];
    let prefixes = [];
    let offset = 0;
    for (let part of parts) {
      let partEnd = offset + part.length;
      let hasPrefix =
        offset + part.trimEnd().length < partEnd &&
        mergedRanges.some(([start, end]) => start < partEnd && partEnd <= end);
      let prefix =
        rowPrefixRanges.find(([start, end]) =>
          part === "" ? start <= offset && offset <= end : start < partEnd && offset < end,
        )?.[2] ?? "";
      let visiblePrefix = columns - conservativeWidth(prefix) >= 2 ? prefix : "";
      let trimmedPrefix = visiblePrefix.trimEnd();
      prefixes.push(lines.length);
      if (part === "") lines.push(trimmedPrefix);
      else {
        let linesList =
          prefix === "" || columns < 2
            ? wrapAnsi(part, columns, {
                trim: false,
                hard: true,
              }).split(`
`)
            : wrapTextConservatively(squashSingleText(part), columns - conservativeWidth(visiblePrefix));
        for (let idx = 0; idx < linesList.length; idx++) {
          let line = linesList[idx];
          let renderedLine = hasPrefix && idx === linesList.length - 1 ? line : line.trimEnd();
          lines.push(renderedLine === "" ? trimmedPrefix : visiblePrefix + renderedLine);
        }
      }
      offset = partEnd + 1;
    }
    let screenReaderPark = this.computeScreenReaderPark(text, prefixes, lines, columns);
    let previousLength = -1;
    let filtered = drainAnnouncements()
      .map((line) => sanitizeForScreenReader(line))
      .filter((line) => line !== "");
    if (filtered.length > 0 || this.isExiting) this.srHeldAnnouncements = filtered;
    let previousLineCount = lines.length;
    for (let srHeldAnnouncement of this.srHeldAnnouncements)
      for (let line of srHeldAnnouncement.split(`
`)) {
        if (previousLength === -1 && filtered.length > 0) previousLength = lines.length;
        if (line === "") lines.push("");
        else {
          let wrapped = wrapAnsi(line, columns, {
            trim: false,
            hard: true,
          });
          for (let line of wrapped.split(`
`))
            lines.push(line.trimEnd());
        }
      }
    let announcementHoldMs = takeAnnouncementHoldMs();
    let frontCutRows = takeTranscriptFrontCut(this.rootNode);
    if (frontCutRows !== null) this.applyTranscriptFrontCut(frontCutRows, text, prefixes, lines);
    let prevScreenReaderLines = this.prevScreenReaderLines;
    let newLineCount = lines.length - previousLineCount;
    let hasTooManyNewLines = newLineCount > Math.min(MAX_ROWS_ALIAS, Math.floor(this.terminalRows / 4));
    if (hasTooManyNewLines) this.srHeldAnnouncements = [];
    if (
      filtered.length === 0 &&
      newLineCount > 0 &&
      (hasTooManyNewLines ||
        (!this.srRewriteHeldAnnouncement &&
          (prevScreenReaderLines.length !== lines.length ||
            lines.some((line, index) => index < previousLineCount && line !== prevScreenReaderLines[index]))))
    ) {
      this.srHeldAnnouncements = [];
      lines.length = previousLineCount;
    }
    let max = Math.max(0, lines.length - 1);
    let park = screenReaderPark ?? {
      row: max,
      col: bunStringWidth(lines[max] ?? ""),
    };
    let lineIndex = 0;
    let min = Math.min(prevScreenReaderLines.length, lines.length);
    while (lineIndex < min && prevScreenReaderLines[lineIndex] === lines[lineIndex]) lineIndex++;
    if (previousLength !== -1 && lineIndex > previousLength) lineIndex = previousLength;
    let onlyAppended = lineIndex === prevScreenReaderLines.length && lineIndex === lines.length;
    let prevScreenReaderPark = this.prevScreenReaderPark;
    let parkUnchanged = park.row === prevScreenReaderPark.row && park.col === prevScreenReaderPark.col;
    if (onlyAppended && parkUnchanged) {
      if (this.srPreParked) {
        this.srPreParked = false;
        this.options.stdout.write(cursorTo(park.col + 1));
      }
      this.prevScreenReaderParkDeclared = screenReaderPark !== null;
      return;
    }
    if (
      !onlyAppended &&
      previousLength === -1 &&
      !this.srPreParked &&
      (this.prevScreenReaderAnchor === "clean" ||
        (this.prevScreenReaderAnchor === "lastRowAnchored" &&
          lineIndex === prevScreenReaderLines.length - 1 &&
          prevScreenReaderPark.row === lineIndex &&
          park.row === lineIndex)) &&
      prevScreenReaderLines.length === lines.length &&
      lineIndex >= prevScreenReaderLines.length - this.terminalRows &&
      prevScreenReaderPark.row >= prevScreenReaderLines.length - this.terminalRows &&
      lines[lineIndex].startsWith(prevScreenReaderLines[lineIndex]) &&
      !lines[lineIndex].includes("\t")
    ) {
      let isPrefix = true;
      for (let idx = lineIndex + 1; idx < prevScreenReaderLines.length; idx++)
        if (prevScreenReaderLines[idx] !== lines[idx]) {
          isPrefix = false;
          break;
        }
      let appended = isPrefix ? lines[lineIndex].slice(prevScreenReaderLines[lineIndex].length) : "";
      let column = appended === "" ? 0 : bunStringWidth(prevScreenReaderLines[lineIndex]);
      if (
        appended !== "" &&
        bunStringWidth(String.fromCodePoint(appended.codePointAt(0))) > 0 &&
        column + bunStringWidth(appended) === bunStringWidth(lines[lineIndex]) &&
        isGraphemeBoundary(lines[lineIndex], prevScreenReaderLines[lineIndex].length)
      ) {
        let lineOps =
          (lineIndex !== prevScreenReaderPark.row
            ? cursorMove(0, lineIndex - prevScreenReaderPark.row)
            : "") + cursorTo(column + 1);
        let parkOps =
          cursorTo(park.col + 1) + (park.row !== lineIndex ? cursorMove(0, park.row - lineIndex) : "");
        this.writeContent(lineOps + appended + parkOps);
        this.prevScreenReaderLines = lines;
        this.prevScreenReaderPark = park;
        this.prevScreenReaderParkDeclared = screenReaderPark !== null;
        return;
      }
    }
    if (
      !onlyAppended &&
      previousLength === -1 &&
      !this.srPreParked &&
      (this.prevScreenReaderAnchor === "clean" ||
        (this.prevScreenReaderAnchor === "lastRowAnchored" &&
          lineIndex === prevScreenReaderLines.length - 1 &&
          prevScreenReaderPark.row === lineIndex &&
          park.row === lineIndex)) &&
      prevScreenReaderLines.length === lines.length &&
      lineIndex >= prevScreenReaderLines.length - this.terminalRows &&
      prevScreenReaderLines[lineIndex].startsWith(lines[lineIndex]) &&
      !prevScreenReaderLines[lineIndex].includes("\t")
    ) {
      let isTruncation = true;
      for (let idx = lineIndex + 1; idx < prevScreenReaderLines.length; idx++)
        if (prevScreenReaderLines[idx] !== lines[idx]) {
          isTruncation = false;
          break;
        }
      let removed = isTruncation ? prevScreenReaderLines[lineIndex].slice(lines[lineIndex].length) : "";
      let column = removed === "" ? 0 : bunStringWidth(lines[lineIndex]);
      if (
        removed !== "" &&
        bunStringWidth(String.fromCodePoint(removed.codePointAt(0))) > 0 &&
        column + bunStringWidth(removed) === bunStringWidth(prevScreenReaderLines[lineIndex]) &&
        isGraphemeBoundary(prevScreenReaderLines[lineIndex], lines[lineIndex].length) &&
        (!/\s/.test(removed) || /^\s+$/.test(removed)) &&
        screenReaderPark !== null &&
        this.prevScreenReaderParkDeclared &&
        prevScreenReaderPark.row === lineIndex &&
        prevScreenReaderPark.col === bunStringWidth(prevScreenReaderLines[lineIndex])
      ) {
        let columnOps = cursorTo(column + 1);
        let rewriteOps =
          cursorTo(park.col + 1) + (park.row !== lineIndex ? cursorMove(0, park.row - lineIndex) : "");
        this.writeContent(columnOps + eraseToEndOfLine() + rewriteOps);
        this.prevScreenReaderLines = lines;
        this.prevScreenReaderPark = park;
        this.prevScreenReaderParkDeclared = screenReaderPark !== null;
        return;
      }
    }
    if (
      !this.isExiting &&
      !onlyAppended &&
      lineIndex < lines.length &&
      previousLength === -1 &&
      !this.srPreParked
    ) {
      let axPreparkMs = getAxPreparkMs();
      if (axPreparkMs > 0) {
        this.options.stdout.write(CURSOR_LEFT);
        this.srPreParked = true;
        this.srPreParkTimer = setTimeout(() => {
          this.srPreParkTimer = null;
          this.onRender();
        }, axPreparkMs);
        return;
      }
    }
    let max_2 = Math.max(0, prevScreenReaderLines.length - 1);
    let parkMove = prevScreenReaderPark.row !== max_2 ? cursorMove(0, max_2 - prevScreenReaderPark.row) : "";
    let overflowLines = prevScreenReaderLines.length - this.terminalRows;
    if (overflowLines > lineIndex && overflowLines < lines.length) {
      let lineIndexStart = lineIndex;
      let lineIndexEnd = lineIndex;
      while (lineIndexEnd < overflowLines) {
        if (lines[lineIndexEnd] === "") {
          lineIndexEnd++;
          continue;
        }
        while (lineIndexStart < overflowLines && prevScreenReaderLines[lineIndexStart] === "")
          lineIndexStart++;
        if (lineIndexStart === overflowLines || prevScreenReaderLines[lineIndexStart] !== lines[lineIndexEnd])
          break;
        lineIndexStart++;
        lineIndexEnd++;
      }
      if (lineIndexEnd === overflowLines) lineIndex = overflowLines;
    }
    let atLastLine = lineIndex === lines.length && lineIndex > 0;
    let shouldErase = overflowLines > lineIndex || (atLastLine && overflowLines === lineIndex);
    let eraseOps = eraseLines(Math.min(prevScreenReaderLines.length - lineIndex, this.terminalRows));
    let joined = lines.slice(lineIndex).join(`
`);
    let writeOps;
    if (onlyAppended) writeOps = "";
    else if (lineIndex === prevScreenReaderLines.length)
      writeOps =
        lineIndex > 0
          ? `
${joined}`
          : joined;
    else if (lineIndex === lines.length)
      writeOps = lineIndex > 0 && !shouldErase ? eraseOps + cursorMove(0, -1) : eraseOps;
    else writeOps = eraseOps + joined;
    let tailOps = cursorTo(park.col + 1) + (park.row !== max ? cursorMove(0, park.row - max) : "");
    this.writeContent(parkMove + writeOps + tailOps);
    if (previousLength !== -1 && announcementHoldMs > 0 && !this.isExiting) {
      startAnnouncementHold(announcementHoldMs);
      this.srAnnouncementHoldTimer = setTimeout(() => {
        this.srAnnouncementHoldTimer = null;
        this.onRender();
      }, announcementHoldMs);
    }
    this.prevScreenReaderLines = lines;
    this.prevScreenReaderPark = park;
    this.prevScreenReaderParkDeclared = screenReaderPark !== null;
    this.srPreParked = false;
    if (!onlyAppended) {
      let remainingLines = lines.length - lineIndex;
      let parkAtLastLine = park.row === lines.length - 1;
      let shrunk = lines.length < prevScreenReaderLines.length;
      let fitsViewport = prevScreenReaderLines.length <= this.terminalRows;
      if (shouldErase && remainingLines < this.terminalRows) this.prevScreenReaderAnchor = "broken";
      else if (remainingLines >= Math.min(lines.length, this.terminalRows))
        this.prevScreenReaderAnchor = "clean";
      else if (remainingLines > 0) {
        if (this.prevScreenReaderAnchor === "broken")
          this.prevScreenReaderAnchor = parkAtLastLine ? "lastRowAnchored" : "broken";
        else if (this.prevScreenReaderAnchor === "lastRowAnchored") {
          if (!parkAtLastLine) this.prevScreenReaderAnchor = "broken";
        } else if (shrunk && !fitsViewport)
          this.prevScreenReaderAnchor = parkAtLastLine ? "lastRowAnchored" : "broken";
      } else if (this.prevScreenReaderAnchor === "lastRowAnchored") this.prevScreenReaderAnchor = "broken";
      else if (shrunk && this.prevScreenReaderAnchor === "clean" && !fitsViewport)
        this.prevScreenReaderAnchor = parkAtLastLine ? "lastRowAnchored" : "broken";
    } else if (
      this.prevScreenReaderAnchor === "lastRowAnchored" &&
      (prevScreenReaderPark.row !== Math.max(0, prevScreenReaderLines.length - 1) || park.row !== max)
    )
      this.prevScreenReaderAnchor = "broken";
  }
  applyTranscriptFrontCut(target, targetNode, fromRow, toRow) {
    if (this.prevScreenReaderAnchor !== "clean") return;
    let prevScreenReaderLines = this.prevScreenReaderLines;
    let prevScreenReaderPark = this.prevScreenReaderPark;
    let dropRows = prevScreenReaderLines.length - this.terminalRows;
    if (dropRows <= 0) return;
    let offset = screenReaderOffsetOf(this.rootNode, target);
    if (offset === null) return;
    let frontCut =
      fromRow[
        countCharInString(
          targetNode.slice(0, offset),
          `
`,
        )
      ];
    if (frontCut === undefined) return;
    for (let idx = 1; frontCut + idx + 1 < dropRows; idx++) {
      let loop = true;
      let index = 0;
      for (let idx_2 = frontCut + idx + 1; idx_2 < dropRows; idx_2++) {
        let sliceLength = idx_2 - idx;
        if (sliceLength >= toRow.length || prevScreenReaderLines[idx_2] !== toRow[sliceLength]) {
          loop = false;
          break;
        }
        if (prevScreenReaderLines[idx_2] !== "") index++;
      }
      if (!loop || index < this.terminalRows) continue;
      if (prevScreenReaderPark.row >= frontCut && prevScreenReaderPark.row < frontCut + idx) return;
      this.prevScreenReaderLines = [
        ...prevScreenReaderLines.slice(0, frontCut),
        toRow[frontCut],
        ...prevScreenReaderLines.slice(frontCut + idx + 1),
      ];
      if (prevScreenReaderPark.row >= frontCut + idx)
        this.prevScreenReaderPark = {
          row: prevScreenReaderPark.row - idx,
          col: prevScreenReaderPark.col,
        };
      return;
    }
  }
  computeScreenReaderPark(lines, columns, emptyRow, linesPerRow) {
    let cursorDeclaration = this.cursorDeclaration;
    if (cursorDeclaration === null) return null;
    let cursorOffset = screenReaderOffsetOf(this.rootNode, cursorDeclaration.node);
    if (cursorOffset === null) return null;
    let sliced = lines.slice(0, cursorOffset);
    let row =
      countCharInString(
        sliced,
        `
`,
      ) + cursorDeclaration.relativeY;
    if (row < 0 || row >= columns.length) return null;
    let column =
      sliced.lastIndexOf(`
`) + 1;
    let lineInRow =
      (cursorDeclaration.relativeY === 0 ? bunStringWidth(lines.slice(column, cursorOffset)) : 0) +
      cursorDeclaration.relativeX;
    let rowIndex = linesPerRow > 0 ? Math.floor(lineInRow / linesPerRow) : 0;
    let min = Math.min(columns[row] + rowIndex, emptyRow.length - 1);
    let columnIndex = linesPerRow > 0 ? lineInRow % linesPerRow : lineInRow;
    return {
      row: Math.max(0, min),
      col: Math.max(0, columnIndex),
    };
  }
  pause() {
    reconcilerAlias.flushSyncFromReconciler();
    this.onRender();
    this.isPaused = true;
  }
  resume() {
    this.isPaused = false;
    this.onRender();
  }
  repaint() {
    this.mainScreenBehindAlt = undefined;
    this.frontFrame = emptyFrame(
      this.frontFrame.viewport.height,
      this.frontFrame.viewport.width,
      this.stylePool,
      this.charPool,
      this.hyperlinkPool,
    );
    this.backFrame = emptyFrame(
      this.backFrame.viewport.height,
      this.backFrame.viewport.width,
      this.stylePool,
      this.charPool,
      this.hyperlinkPool,
    );
    this.log.reset();
    this.displayCursor = null;
    this.prevFrameContaminated = true;
    this.imagesStale = true;
    this.resetScreenReaderDiffState();
  }
  emitAtlasReset(reason) {
    if (reason)
      reason.unshift({
        type: "stdout",
        content: RESET_COLOR_255,
      });
    else this.options.stdout.write(RESET_COLOR_255);
    this.stylePool.atlasRecorder.reset();
    this.lastAtlasResetAt = performance.now();
  }
  maybeProactiveAtlasReset(reason) {
    let atlasRecorder = this.stylePool.atlasRecorder;
    if (!atlasRecorder.autoResetEnabled) return;
    if (this.renderDebug.stressing) return;
    if (atlasRecorder.size < RESIZE_SETTLE_MS) return;
    if (!this.renderDebug.isBoxOpen() && performance.now() - this.lastAtlasResetAt < QUERY_TIMEOUT_MS) return;
    if (!isXtermJs()) return;
    this.emitAtlasReset(reason);
    atlasRecorder.recordProactiveReset("delta");
  }
  proactiveAtlasResetOnFocus() {
    let atlasRecorder = this.stylePool.atlasRecorder;
    if (
      atlasRecorder.autoResetEnabled &&
      !this.renderDebug.stressing &&
      this.options.stdout.isTTY &&
      !this.isUnmounted &&
      !this.isHandedOff &&
      isXtermJs()
    ) {
      this.emitAtlasReset();
      atlasRecorder.recordProactiveReset("focus");
    }
  }
  forceRedraw(reason) {
    if (!this.options.stdout.isTTY || this.isUnmounted || this.isHandedOff) return false;
    if (reason?.flushReact) reconcilerAlias.flushSyncFromReconciler();
    if (isXtermJs()) this.emitAtlasReset();
    if (this.hasStaleTerminalSize()) {
      this.handleResize();
      return true;
    }
    if (this.altScreenActive) {
      this.needsEraseBeforePaint = true;
      this.displayCursor = null;
      this.resetFramesForAltScreen();
      this.imagesStale = true;
    } else {
      this.log.forceFullReset();
      this.prevFrameContaminated = true;
      this.imagesStale = true;
    }
    this.resetScreenReaderDiffState();
    this.onRender();
    return true;
  }
  async probeExternalClear(channel) {
    if (!this.altScreenActive || this.isHandedOff || this.isUnmounted) return false;
    let displayCursor = this.displayCursor;
    if (!displayCursor) return false;
    let onCursorReport = (displayCursor) =>
      Math.min(Math.max(displayCursor.y + 1, 1), this.stdoutSize().rows, displayCursor.emittedRows);
    if (onCursorReport(displayCursor) <= 1) return false;
    let reply = await channel.send(CURSOR_POSITION_QUERY);
    if (reply?.row !== 1) return false;
    let displayCursor_2 = this.displayCursor;
    if (displayCursor_2 === null || onCursorReport(displayCursor_2) <= 1) return false;
    logForDebugging(
      `probeExternalClear: detected wipe (parked at y=${displayCursor_2.y}, sent at y=${displayCursor.y}, terminal reports row=1 col=${reply.col})`,
    );
    this.forceRedraw();
    return true;
  }
  invalidatePrevFrame() {
    this.prevFrameContaminated = true;
  }
  setAltScreenActive(active, mouseTracking = "off") {
    if (!active) {
      this.writeKeptForNextFrame();
      this.leftAltScreenSinceFrame = true;
    }
    if (this.altScreenActive === active) return "";
    this.altScreenActive = active;
    this.altScreenMouseTracking = active ? mouseTracking : "off";
    if (!active) {
      this.forgetPointer();
      this.hoveredLinkSpans = [];
    }
    queueMicrotask(() => {
      if (this.isUnmounted) return;
      for (let hoverTrackedListener of this.hoverTrackedListeners) hoverTrackedListener();
    });
    this.syncMousePixels();
    if (active) {
      this.ensureInteractive();
      let lifecycle =
        this.isHandedOff || this.isScreenReaderEnabled || getPlatform() === "windows"
          ? undefined
          : (this.mainScreenBehindAlt ??
            (this.options.stdout.isTTY && this.frameSink === null && !isFrameOverflowing(this.frontFrame)
              ? {
                  viewport: this.frontFrame.viewport,
                  erase:
                    this.frontFrame.screen.height === 0 && this.displayCursor === null
                      ? ""
                      : eraseMainScreenFrame(this.frontFrame.cursor, this.displayCursor),
                }
              : undefined));
      let size = this.stdoutSize();
      let mainScreenBehindAlt =
        lifecycle?.viewport.width === size.columns && lifecycle.viewport.height === size.rows
          ? lifecycle
          : undefined;
      this.resetFramesForAltScreen();
      this.mainScreenBehindAlt = mainScreenBehindAlt;
      return "";
    } else {
      this.endPointerCapture();
      this.tellClickedNowhere();
      let mainScreenBehindAlt = this.isHandedOff || this.isUnmounted ? undefined : this.mainScreenBehindAlt;
      this.repaint();
      this.mainScreenBehindAlt = mainScreenBehindAlt;
      return mainScreenBehindAlt === undefined
        ? ""
        : cursorPosition(this.terminalRows, 1) + eraseLines(this.terminalRows);
    }
  }
  get isAltScreenActive() {
    return this.altScreenActive;
  }
  keepForNextFrame(seq) {
    if (this.leftAltScreenSinceFrame || this.isUnmounted) return false;
    if (this.keptForNextFrame === "" && seq !== "") setImmediate(this.writeKeptForNextFrame);
    this.keptForNextFrame += seq;
    return true;
  }
  keepAltScreenForNextScreen() {
    this.altScreenHandOverAsked = true;
    setImmediate(this.forgetAltScreenHandOver);
  }
  forgetAltScreenHandOver = () => {
    this.altScreenHandOverAsked = false;
  };
  holdAltScreenLeave(heldAltScreenLeave) {
    if (!this.altScreenHandOverAsked || this.isUnmounted) return false;
    this.altScreenHandOverAsked = false;
    this.clearTextSelection();
    this.forgetPointer();
    this.hoveredLinkSpans = [];
    this.heldAltScreenLeave = heldAltScreenLeave;
    setImmediate(this.runHeldAltScreenLeave);
    return true;
  }
  claimHeldAltScreen() {
    let hasHeldLeave = this.heldAltScreenLeave !== undefined;
    this.heldAltScreenLeave = undefined;
    return hasHeldLeave;
  }
  runHeldAltScreenLeave = () => {
    let heldAltScreenLeave = this.heldAltScreenLeave;
    this.heldAltScreenLeave = undefined;
    if (heldAltScreenLeave !== undefined) {
      heldAltScreenLeave();
      this.forceRedraw();
    }
  };
  takeKeptForNextFrame() {
    let keptForNextFrame = this.keptForNextFrame;
    this.keptForNextFrame = "";
    return keptForNextFrame;
  }
  writeKeptForNextFrame = () => {
    let kept = this.takeKeptForNextFrame();
    if (kept !== "" && !this.isUnmounted) handleEPIPE(this.terminal, kept);
  };
  writeAfterKept(seq) {
    if (this.keptForNextFrame !== "") this.keptForNextFrame += seq;
    else this.options.stdout.write(seq);
  }
  get nativeCursorSeq() {
    if (this.accessibilityMode || this.isScreenReaderEnabled) return "";
    return this.nativeCursorVisible ? SHOW_CURSOR : HIDE_CURSOR;
  }
  get terminalSize() {
    return {
      columns: this.terminalColumns,
      rows: this.terminalRows,
    };
  }
  getMouseMode = () => this.altScreenMouseTracking;
  pixelReportsLive = false;
  mouseReportsInPixels = () => this.pixelReportsLive;
  syncMousePixels = () => {
    if (this.isUnmounted) return;
    let wantsPixels =
      this.finePointerHolds > 0 &&
      this.altScreenActive &&
      this.altScreenMouseTracking === "full" &&
      getTerminalCapabilities().now("mousePixels") &&
      getTerminalProbeState().cellPixels !== undefined;
    if (wantsPixels === this.modes.isSet("mousePixels")) return;
    let pixelSeq = wantsPixels ? this.modes.set("mousePixels") : this.modes.reset("mousePixels");
    let shouldWritePixels = pixelSeq !== "" && !this.isHandedOff;
    if (shouldWritePixels) this.writeAfterKept(pixelSeq);
    let querier = this.appRef.current?.querier;
    if (shouldWritePixels && querier && this.holdsRawMode)
      querier.flush().then(() => {
        this.pixelReportsLive = wantsPixels;
      });
    else this.pixelReportsLive = wantsPixels;
    logForDebugging(`Mouse reports in ${wantsPixels ? "pixels" : "cells"}`);
  };
  mouseOnSeq() {
    return mouseTrackingSequence(this.altScreenMouseTracking) + this.modes.reassert("mousePixels");
  }
  handoffAltScreen() {
    this.isPaused = true;
    this.altScreenActive = false;
    this.endPointerCapture();
    this.tellClickedNowhere();
    this.modes.reset("altScreen");
    this.modes.reset("surface");
  }
  get lastFrameFillsCurrentViewport() {
    let terminalSize = getTerminalSize(this.options.stdout, this.warnGarbageWinsizeOnce);
    return (
      this.frontFrame.screen.height > 0 &&
      isFrameOverflowing(this.frontFrame) &&
      this.frontFrame.viewport.height === terminalSize.rows &&
      this.frontFrame.viewport.width === terminalSize.cols
    );
  }
  handoffRawMode() {
    this._handoffRawMode = true;
  }
  get isHandoffRawMode() {
    return this._handoffRawMode;
  }
  get hasUnmounted() {
    return this.isUnmounted;
  }
  get holdsRawMode() {
    return (this.appRef.current?.rawModeEnabledCount ?? 0) > 0;
  }
  get domRoot() {
    return this.rootNode;
  }
  getStylePool() {
    return this.stylePool;
  }
  getCharPool() {
    return this.charPool;
  }
  getHyperlinkPool() {
    return this.hyperlinkPool;
  }
  takeSlowestFrameWrite() {
    let slowestWrite = this.terminal.slowestWrite;
    this.terminal.slowestWrite = undefined;
    return slowestWrite;
  }
  writeContent(content) {
    handleEPIPE(this.terminal, content);
  }
  recordContentWrite = (bytes, bytes_2) => {
    recordSlowestWrite(this.terminal, bytes, bytes_2);
  };
  handleStdoutBackpressure = (report) => {
    if (report.droppedBytes > 0) {
      let wasDrained = report.endedBy === "drain";
      this.appRef.current?.querier?.resync({
        probe: wasDrained,
      });
      if (wasDrained) {
        this.reassertTerminalModes();
        this.forceRedraw();
      } else this.repaint();
    }
    if (this.frameHeldForBacklog && report.endedBy === "drain") {
      this.frameHeldForBacklog = false;
      this.scheduleFrame();
    }
    if (report.droppedBytes > 0 || report.durationMs >= 1000)
      logEvent("tengu_stdout_backpressure", {
        duration_ms: report.durationMs,
        peak_queued_bytes: report.peakQueuedBytes,
        dropped_bytes: report.droppedBytes,
      });
  };
  reassertTerminalModes = (force = false) => {
    if (!this.options.stdout.isTTY) return;
    if (this.isHandedOff || this.isUnmounted) return;
    this.options.stdout.write(
      RESET_CHARSET +
        this.modes.reassert("bracketedPaste") +
        this.modes.reassert("extendedKeys") +
        this.modes.reassert("mouse") +
        this.modes.reassert("mousePixels"),
    );
    if (force && this.altScreenActive) this.reenterAltScreen();
  };
  detachForShutdown() {
    this.nonBlockingStdout?.flush();
    if (
      !this.isUnmounted &&
      !this.altScreenActive &&
      this.displayCursor !== null &&
      this.options.stdout.isTTY
    ) {
      let cursorDx = this.frontFrame.cursor.x - this.displayCursor.x;
      let cursorDy = this.frontFrame.cursor.y - this.displayCursor.y;
      if (cursorDx !== 0 || cursorDy !== 0) writeSync(1, cursorMove(cursorDx, cursorDy));
      this.displayCursor = null;
    }
    this.isUnmounted = true;
    this.scheduleRender.cancel?.();
    this.unsubscribeTTYHandlers?.();
    let stdin = this.options.stdin;
    this.drainStdin();
    if (stdin.isTTY && stdin.isRaw) setRawModeSafe(stdin, false);
    for (let stream of new Set([stdin, process.stdin])) {
      stream.removeAllListeners("readable");
      stream.removeAllListeners("data");
      stream.removeAllListeners("keypress");
      stream.pause();
      stream.unref?.();
    }
  }
  writeBeforeExit = (beforeExit) => {
    if (this.options.stdout === process.stdout) writeSync(1, beforeExit);
    else this.options.stdout.write(beforeExit);
  };
  drainStdin() {
    let querier = this.appRef.current?.querier;
    let drained = drainStdin(this.options.stdin, querier?.owed() ?? 0);
    if (querier && querier.owed() > 0)
      querier.resync({
        probe: false,
      });
    return drained;
  }
  reenterAltScreen() {
    this.options.stdout.write(this.modes.reassertFrom("altScreen"));
    this.resetFramesForAltScreen();
    this.imagesStale = true;
    this.onRender();
  }
  resetFramesForAltScreen() {
    let rows = this.terminalRows;
    let cols = this.terminalColumns;
    let blank = () => ({
      screen: createScreen(cols, rows, this.stylePool, this.charPool, this.hyperlinkPool),
      viewport: {
        width: cols,
        height: rows + 1,
      },
      cursor: {
        x: 0,
        y: 0,
        visible: true,
      },
    });
    this.mainScreenBehindAlt = undefined;
    this.frontFrame = blank();
    this.backFrame = blank();
    this.log.reset();
    this.displayCursor = null;
    this.prevFrameContaminated = true;
  }
  getSelectedText() {
    if (!hasSelection(this.selection)) return "";
    return getSelectedText(this.selection, this.frontFrame.screen);
  }
  copySelectionNoClear() {
    let text = this.getSelectedText();
    if (text)
      setClipboard(text).then((raw) => {
        if (raw) this.options.stdout.write(raw);
      });
    return text;
  }
  copySelection() {
    if (!hasSelection(this.selection)) return "";
    let text = this.copySelectionNoClear();
    this.notifySelectionTakeDown();
    clearSelection(this.selection);
    this.notifySelectionChange();
    return text;
  }
  clearTextSelection() {
    if (!hasSelection(this.selection)) return;
    this.notifySelectionTakeDown();
    clearSelection(this.selection);
    this.notifySelectionChange();
  }
  setSearchHighlight(query) {
    if (this.searchHighlightQuery === query) return;
    this.searchHighlightQuery = query;
    this.scheduleRender();
  }
  scanElementSubtree(element) {
    if (!this.searchHighlightQuery || !element.yogaNode) return [];
    let width = Math.ceil(element.yogaNode.getComputedWidth());
    let height = Math.ceil(element.yogaNode.getComputedHeight());
    if (width <= 0 || height <= 0) return [];
    let elLeft = element.yogaNode.getComputedLeft();
    let elTop = element.yogaNode.getComputedTop();
    let screen = createScreen(width, height, this.stylePool, this.charPool, this.hyperlinkPool);
    let output = new Output({
      width,
      height,
      stylePool: this.stylePool,
      screen,
    });
    renderNodeToOutputAlias(element, output, createRenderState(), {
      offsetX: -elLeft,
      offsetY: -elTop,
      prevScreen: undefined,
    });
    let rendered = output.get();
    dropSubtreeCache(element);
    markDirty(element);
    let positions = scanPositions(rendered, this.searchHighlightQuery);
    logForDebugging(
      `scanElementSubtree: q='${this.searchHighlightQuery}' el=${width}x${height}@(${elLeft},${elTop}) n=${positions.length} [${positions
        .slice(0, 10)
        .map((position) => `${position.row}:${position.col}`)
        .join(",")}${positions.length > 10 ? ",\u2026" : ""}]`,
    );
    return positions;
  }
  setSearchPositions(searchPositions) {
    this.searchPositions = searchPositions;
    this.scheduleRender();
  }
  setSelectionBgColor(color) {
    let wrapped = colorize("\x00", color, "background");
    let nul = wrapped.indexOf("\x00");
    if (nul <= 0 || nul === wrapped.length - 1) {
      this.stylePool.setSelectionBg(null);
      return;
    }
    this.stylePool.setSelectionBg({
      type: "ansi",
      code: wrapped.slice(0, nul),
      endCode: wrapped.slice(nul + 1),
    });
  }
  moveSelectionFocus(move) {
    if (!this.altScreenActive) return;
    let { focus, scope } = this.selection;
    if (!focus) return;
    let { width, height } = this.frontFrame.screen;
    let x1 = scope ? scope.x1 : 0;
    let maxCol = (scope ? Math.min(scope.x2, width) : width) - 1;
    let maxRow = height - 1;
    let { col, row } = focus;
    switch (move) {
      case "left":
        if (col > x1) col--;
        else if (row > 0) {
          col = maxCol;
          row--;
        }
        break;
      case "right":
        if (col < maxCol) col++;
        else if (row < maxRow) {
          col = x1;
          row++;
        }
        break;
      case "up":
        if (row > 0) row--;
        break;
      case "down":
        if (row < maxRow) row++;
        break;
      case "lineStart":
        col = x1;
        break;
      case "lineEnd":
        col = maxCol;
        break;
    }
    if (col === focus.col && row === focus.row) return;
    moveFocus(this.selection, col, row);
    this.notifySelectionChange();
  }
  hasTextSelection() {
    return hasSelection(this.selection);
  }
  subscribeToSelectionChange(cb) {
    this.selectionListeners.add(cb);
    return () => this.selectionListeners.delete(cb);
  }
  notifySelectionChange() {
    this.scheduleRender();
    for (let selectionListener of this.selectionListeners) selectionListener();
  }
  subscribeToSelectionTakeDown(listener) {
    return this.selectionTakeDown.subscribe(listener);
  }
  notifySelectionTakeDown() {
    if (!this.altScreenActive || !hasSelection(this.selection)) return;
    this.selectionTakeDown.announce();
  }
  dispatchClick(event, kind) {
    return this.dispatchMouseClick(event, kind, false) !== "unhandled";
  }
  dispatchMouseClick(col, row, isWindowActivation, mods) {
    if (!this.altScreenActive) return "unhandled";
    let target = hitTest(this.rootNode, col, row);
    let cellIsBlank =
      isOverBlankCell(this.rootNode, this.frontFrame.screen, target, col, row) &&
      !this.litWhereClicked(target, col, row);
    let hyperlinkUrl = this.getHyperlinkAt(col, row);
    let event = new ClickEvent(col, row, cellIsBlank, hyperlinkUrl, isWindowActivation, mods);
    for (let clickListener of this.clickListeners) clickListener(target, event);
    let handled = dispatchClick(this.rootNode, event);
    if (event.droppedAsStray) return "stray";
    if (handled && event.endsClickChain) return "repeat";
    return handled ? "handled" : "unhandled";
  }
  litWhereClicked(target, col, row) {
    if (col !== this.hoverCol || row !== this.hoverRow) return false;
    let node = target ?? undefined;
    while (node) {
      if (node.attributes.hoverIgnoresBlankCells && this.hoveredNodes.has(node)) return true;
      node = node.parentNode;
    }
    return false;
  }
  repaintAfterStaleAbsolutePaint(hasStale) {
    if (!hasStale.staleAbsolutePaint) return;
    this.prevFrameContaminated = true;
    this.scheduleRender();
  }
  dispatchHover(col, row) {
    if (!this.altScreenActive) return;
    let hyperlink = this.isHoverTracked() ? hyperlinkAt(this.frontFrame.screen, col, row) : undefined;
    let any = this.hoveredLinkSpans.some(
      (hoveredLinkSpan) =>
        hoveredLinkSpan.row === row && col >= hoveredLinkSpan.from && col <= hoveredLinkSpan.to,
    );
    if (hyperlink !== this.hoveredLink || (hyperlink !== undefined && !any)) {
      this.hoveredLink = hyperlink;
      this.scheduleRender();
    }
    this.hoverCol = col;
    this.hoverRow = row;
    this.hoverFollowStreak = 0;
    this.hoverFollowHeldUntil = 0;
    dispatchHover(this.rootNode, col, row, this.hoveredNodes, this.frontFrame.screen);
  }
  forgetPointer() {
    this.hoverCol = -1;
    this.hoverRow = -1;
    this.hoverFollowStreak = 0;
    this.hoverFollowHeldUntil = 0;
    if (this.hoveredLink !== undefined) {
      this.hoveredLink = undefined;
      this.scheduleRender();
    }
    let app = this.appRef.current;
    if (app !== null) {
      app.lastHoverCol = -1;
      app.lastHoverRow = -1;
      app.lastHoverOnTarget = false;
    }
  }
  followHover() {
    if (!this.altScreenActive || this.hoverCol < 0 || this.pacerNow() < this.hoverFollowHeldUntil) return;
    let hoverChanged = dispatchHoverFollowsPaint(
      this.rootNode,
      this.hoverCol,
      this.hoverRow,
      this.hoveredNodes,
      this.frontFrame.screen,
    );
    this.hoverFollowStreak = hoverChanged ? this.hoverFollowStreak + 1 : 0;
    if (this.hoverFollowStreak >= MAX_RESIZE_RETRIES) {
      this.hoverFollowStreak = 0;
      this.hoverFollowHeldUntil = this.pacerNow() + STDIN_RESUME_GAP_MS;
    }
  }
  handlePointerPress(col, row, button, mods, options) {
    if (!this.altScreenActive) return false;
    this.releasePointerCapture(col, row, mods, options, true);
    let pointerTarget = findPointerTarget(this.rootNode, col, row);
    if (!pointerTarget) return false;
    this.pointerCapture = {
      node: pointerTarget,
      button,
      col,
      row,
    };
    dispatchPointer(pointerTarget, {
      kind: "down",
      col,
      row,
      button,
      mods,
      fine: options,
    });
    return true;
  }
  handlePointerDrag(col, row, mods, fine) {
    let pointerCapture = this.pointerCapture;
    if (!pointerCapture) return false;
    pointerCapture.col = col;
    pointerCapture.row = row;
    dispatchPointer(pointerCapture.node, {
      kind: "move",
      col,
      row,
      button: pointerCapture.button,
      mods,
      fine,
    });
    return true;
  }
  handlePointerRelease(col, row, button, mods) {
    return this.releasePointerCapture(col, row, button, mods, false);
  }
  handlePointerHover(col, row, button, mods) {
    if (!this.altScreenActive) return false;
    this.releasePointerCapture(col, row, button, mods, true);
    let pointerTarget = findPointerTarget(this.rootNode, col, row);
    if (!pointerTarget) return false;
    dispatchPointer(pointerTarget, {
      kind: "move",
      col,
      row,
      button: undefined,
      mods: button,
      fine: mods,
    });
    return true;
  }
  isPointerCaptured() {
    return this.pointerCapture !== null;
  }
  endPointerCapture() {
    let pointerCapture = this.pointerCapture;
    if (pointerCapture)
      this.releasePointerCapture(
        pointerCapture.col,
        pointerCapture.row,
        {
          shift: false,
          alt: false,
          ctrl: false,
        },
        undefined,
        true,
      );
  }
  releasePointerCapture(col, row, mods, fine, unreported) {
    let pointerCapture = this.pointerCapture;
    if (!pointerCapture) return false;
    this.pointerCapture = null;
    dispatchPointer(pointerCapture.node, {
      kind: "up",
      col,
      row,
      button: pointerCapture.button,
      mods,
      fine,
      unreported,
    });
    return true;
  }
  dispatchPasteEvent(text) {
    let target = this.focusManager.activeElement ?? this.rootNode;
    dispatcher.dispatchDiscrete(target, new PasteEvent(text));
  }
  dispatchWheelEvent = (event) => {
    if (this.pointerCapture) return;
    let target =
      event.col != null && event.row != null
        ? {
            col: event.col - 1,
            row: event.row - 1,
          }
        : null;
    let node = target ? hitTest(this.rootNode, target.col, target.row) : null;
    let handled =
      (node && hasWheelHandler(node) ? node : null) ?? this.focusManager.activeElement ?? this.rootNode;
    let deltaY = event.name === "wheeldown" ? 1 : -1;
    dispatcher.dispatchContinuous(
      handled,
      new WheelEvent(deltaY, {
        ctrl: event.ctrl,
        shift: event.shift,
        meta: event.meta || event.option,
        col: target?.col,
        row: target?.row,
      }),
    );
  };
  dispatchKeyboardEvent(parsedKey, init) {
    let activeElement = this.focusManager.activeElement;
    let target = activeElement ?? this.rootNode;
    let event = new KeyboardEvent(parsedKey, init);
    dispatcher.dispatchDiscrete(target, event);
    if (!event.defaultPrevented && parsedKey.name === "tab" && !parsedKey.ctrl && !parsedKey.meta)
      if (parsedKey.shift) this.focusManager.focusPrevious(this.rootNode);
      else this.focusManager.focusNext(this.rootNode);
    if (
      !event.defaultPrevented &&
      !event._isPropagationStopped() &&
      !event.didStopImmediatePropagation() &&
      !parsedKey.ctrl &&
      !parsedKey.meta &&
      !parsedKey.option &&
      !parsedKey.shift &&
      activeElement &&
      this.focusManager.activeElement === activeElement &&
      (parsedKey.name === "up" ||
        parsedKey.name === "down" ||
        parsedKey.name === "left" ||
        parsedKey.name === "right")
    ) {
      if (this.focusManager.focusDirection(parsedKey.name, this.rootNode))
        logEvent("tengu_spatial_focus_nav", {
          direction: fromEnum(parsedKey.name),
        });
    }
    return event.isReadAsEscapeThenKey;
  }
  getHyperlinkAt(col, row) {
    if (!this.altScreenActive) return;
    let screen = this.frontFrame.screen;
    return hyperlinkAt(screen, col, row) ?? findPlainTextUrl(screen, col, row);
  }
  onHyperlinkClick;
  openHyperlink(url) {
    this.onHyperlinkClick?.(url);
  }
  fileHyperlinkOpensInPanel;
  fileLinkOpensInPanel() {
    return this.fileHyperlinkOpensInPanel?.() === true;
  }
  handleMultiClick(col, row, count) {
    if (!this.altScreenActive) return;
    let screen = this.frontFrame.screen;
    this.notifySelectionTakeDown();
    startSelection(this.selection, col, row, findSelectionScope(this.rootNode, col, row));
    if (count === 2) selectWordAt(this.selection, screen, col, row);
    else selectLineAt(this.selection, screen, row);
    if (!this.selection.focus) this.selection.focus = this.selection.anchor;
    this.notifySelectionChange();
  }
  handleSelectionStart(col, row) {
    this.notifySelectionTakeDown();
    startSelection(this.selection, col, row, findSelectionScope(this.rootNode, col, row));
  }
  handleSelectionDrag(col, row) {
    if (!this.altScreenActive) return;
    let sel = this.selection;
    if (sel.anchorSpan) extendSelection(sel, this.frontFrame.screen, col, row);
    else updateSelection(sel, col, row);
    this.notifySelectionChange();
  }
  stdinListeners = [];
  wasRawMode = false;
  suspendStdin() {
    let stdin = this.options.stdin;
    if (!stdin.isTTY) return;
    let readableListeners = stdin.listeners("readable");
    logForDebugging(
      `[stdin] suspendStdin: removing ${readableListeners.length} readable listener(s), wasRawMode=${stdin.isRaw ?? false}`,
    );
    readableListeners.forEach((listener) => {
      this.stdinListeners.push({
        event: "readable",
        listener,
      });
      stdin.removeListener("readable", listener);
    });
    let stdinWithRaw = stdin;
    if (stdinWithRaw.isRaw) {
      if ((this.appRef.current?.querier?.owed() ?? 0) > 0) this.drainStdin();
      setRawModeSafe(stdinWithRaw, false);
      this.wasRawMode = true;
    }
  }
  resumeStdin() {
    let stdin = this.options.stdin;
    if (!stdin.isTTY) return;
    if (this.stdinListeners.length === 0 && !this.wasRawMode)
      logForDebugging(
        "[stdin] resumeStdin: called with no stored listeners and wasRawMode=false (possible desync)",
        {
          level: "warn",
        },
      );
    logForDebugging(
      `[stdin] resumeStdin: re-attaching ${this.stdinListeners.length} listener(s), wasRawMode=${this.wasRawMode}`,
    );
    this.stdinListeners.forEach(({ event, listener }) => {
      stdin.addListener(event, listener);
    });
    this.stdinListeners = [];
    if (this.wasRawMode) {
      setRawModeSafe(stdin, true);
      this.wasRawMode = false;
    }
  }
  writeRaw(data) {
    this.options.stdout.write(data);
  }
  setCursorDeclaration = (decl, clearIfNode) => {
    if (decl === null && clearIfNode !== undefined && this.cursorDeclaration?.node !== clearIfNode) return;
    this.cursorDeclaration = decl;
  };
  takeBackTerminal() {
    if (this.isUnmounted || this.isHandedOff) return;
    this.repaint();
    this.onRender();
  }
  tree() {
    if (this.renderCalled)
      throw Error(
        "Ink: this root is React\u2019s (render() was called), so it can\u2019t be drawn with Tree too",
      );
    this.ensureInteractive();
    this.ownTree ??= new ImperativeTree(this.rootNode);
    return this.ownTree;
  }
  render(node) {
    if (this.ownTree)
      throw Error(
        "Ink: this root is drawn with Tree (tree() was called), so it can\u2019t be React\u2019s too",
      );
    this.renderCalled = true;
    this.currentNode = node;
    let element = jsxProd_default(App, {
      ref: this.appRef,
      stdin: this.options.stdin,
      stdout: this.options.stdout,
      stderr: this.options.stderr,
      exitOnCtrlC: this.options.exitOnCtrlC,
      onExit: this.unmount,
      subscribeLayout: this.subscribeLayout,
      subscribeFrames: this.subscribeFrames,
      subscribeClicks: this.subscribeClicks,
      subscribeHoverTracked: this.subscribeHoverTracked,
      isHoverTracked: this.isHoverTracked,
      retainFinePointer: this.retainFinePointer,
      terminalImages: this.terminalImages,
      terminalColumns: this.terminalColumns,
      terminalRows: this.terminalRows,
      selection: this.selection,
      onSelectionChange: this.notifySelectionChange,
      onSelectionTakeDown: this.notifySelectionTakeDown,
      onClickAt: this.dispatchMouseClick,
      onHoverAt: this.dispatchHover,
      onHoverLost: this.forgetPointer,
      onPointerPress: this.handlePointerPress,
      onPointerDrag: this.handlePointerDrag,
      onPointerRelease: this.handlePointerRelease,
      onPointerHover: this.handlePointerHover,
      getHyperlinkAt: this.getHyperlinkAt,
      onOpenHyperlink: this.openHyperlink,
      fileLinkOpensInPanel: this.fileLinkOpensInPanel,
      onMultiClick: this.handleMultiClick,
      onSelectionStart: this.handleSelectionStart,
      onSelectionDrag: this.handleSelectionDrag,
      onStdinResume: this.reassertTerminalModes,
      modes: this.modes,
      getMouseMode: this.getMouseMode,
      mouseReportsInPixels: this.mouseReportsInPixels,
      onCellPixels: this.syncMousePixels,
      onRawModeEnter: this.ensureInteractive,
      onCursorDeclaration: this.setCursorDeclaration,
      dispatchKeyboardEvent: this.dispatchKeyboardEvent,
      onInputPriorityFrame: this.requestInputPriorityFrame,
      dispatchPasteEvent: this.dispatchPasteEvent,
      dispatchWheelEvent: this.dispatchWheelEvent,
      focusManager: this.focusManager,
      rootNode: this.rootNode,
      isScreenReaderEnabled: this.isScreenReaderEnabled,
      children: jsxProd_default(ErrorBoundaryStateRef.Provider, {
        value: this.isScreenReaderEnabled,
        children: jsxProd_default(TerminalWriteProvider, {
          value: this.writeRaw,
          children: jsxProd_default(TerminalModesContextAlias.Provider, {
            value: this.modes,
            children: node,
          }),
        }),
      }),
    });
    reconcilerAlias.updateContainerSync(element, this.container, null, import_noop);
    reconcilerAlias.flushSyncWork();
  }
  restoreConsolePatches() {
    this.restoreConsole?.();
    this.restoreConsole = undefined;
    this.restoreStderr?.();
    this.restoreStderr = undefined;
  }
  unmount(error) {
    if (this.isUnmounted) return;
    if (error instanceof Error) {
      this.exitError = error;
      this.hasExited = true;
      this.rejectExitPromise(error);
    } else {
      this.hasExited = true;
      this.resolveExitPromise();
    }
    this.isExiting = true;
    if (this.srStartupQuietTimer !== null) {
      clearTimeout(this.srStartupQuietTimer);
      this.srStartupQuietTimer = null;
    }
    if (this.srPreParkTimer !== null) {
      clearTimeout(this.srPreParkTimer);
      this.srPreParkTimer = null;
    }
    if (this.srAnnouncementHoldTimer !== null) {
      clearTimeout(this.srAnnouncementHoldTimer);
      this.srAnnouncementHoldTimer = null;
    }
    this.writeKeptForNextFrame();
    this.onRender();
    this.unsubscribeExit();
    this.restoreConsolePatches();
    this.unsubscribeTTYHandlers?.();
    this.cancelFinePointerSettle?.();
    if (this.renderCalled && !this.isHandedOff) {
      let diff = this.log.renderPreviousOutput_DEPRECATED(this.frontFrame);
      writeDiffToTerminal(this.terminal, optimize(diff), this.skipSyncMarkers(), this.stdoutSize().rows);
    }
    this.nonBlockingStdout?.flush();
    if (this.options.stdout.isTTY)
      try {
        restoreTerminalModes(this.modes, this.writeBeforeExit);
        this.altScreenActive = false;
        this.drainStdin();
      } catch (error) {
        if (isSyscallError(error))
          logForDebugging(`unmount terminal cleanup writeSync failed: ${error}`, {
            level: "error",
          });
        else throw error;
      }
    this.isUnmounted = true;
    this.scheduleRender.cancel?.();
    if (this.drainTimer !== null) {
      clearTimeout(this.drainTimer);
      this.drainTimer = null;
    }
    reconcilerAlias.updateContainerSync(null, this.container, null, import_noop);
    reconcilerAlias.flushSyncWork();
    if (this.ownTree)
      for (let childNode of this.rootNode.childNodes.slice()) removeChildAndCleanup(this.rootNode, childNode);
    let secondRootError = getSecondRootError();
    if (secondRootError.treeRoots.get(this.options.stdout) === this)
      secondRootError.treeRoots.delete(this.options.stdout);
    if (secondRootError.get(this.options.stdout) === this) {
      secondRootError.delete(this.options.stdout);
      secondRootError.treeRoots.get(this.options.stdout)?.takeBackTerminal();
    }
    this.rootNode.yogaNode?.free();
    this.rootNode.yogaNode = undefined;
  }
  async waitUntilExit() {
    if (this.hasExited) {
      if (this.exitError) throw this.exitError;
      return;
    }
    this.exitPromise ||= new Promise((resolve, reject) => {
      this.resolveExitPromise = resolve;
      this.rejectExitPromise = reject;
    });
    return this.exitPromise;
  }
  maybeResetPools(scratchRendered) {
    let framesSinceCompact = scratchRendered - this.lastPoolResetTime;
    if (!shouldCompactStylePool(framesSinceCompact, this.stylePool, this.lastStyleLiveSize)) return;
    this.lastPoolResetTime = scratchRendered;
    this.resetPools();
  }
  resetPools() {
    let linkPoolLarge = this.hyperlinkPool.size > STYLE_POOL_SOFT_LIMIT;
    let stylePoolDirty = this.stylePool.needsCompaction(this.lastStyleLiveSize);
    if (!linkPoolLarge && !stylePoolDirty) return;
    if (linkPoolLarge) this.hyperlinkPool = new HyperlinkPool();
    migrateScreenPools(
      this.frontFrame.screen,
      this.charPool,
      this.hyperlinkPool,
      stylePoolDirty ? this.stylePool.compact() : undefined,
    );
    if (stylePoolDirty) this.lastStyleLiveSize = this.stylePool.size;
    this.backFrame.screen.hyperlinkPool = this.hyperlinkPool;
    this.fullRepaintSentinelScreen = undefined;
  }
  patchConsole() {
    let con = console;
    let originals = {};
    let toDebug = (...args) => logForDebugging(`console.log: ${format(...args)}`);
    let toError =
      (arg) =>
      (...args) =>
        logError(withTelemetryMessage(Error(`console.${arg}: ${format(...args)}`), `console.${arg} failed`));
    let proxy =
      (arg) =>
      (...args) =>
        logForDebugging(`console.${arg}: ${format(...args)}`, {
          level: "warn",
        });
    for (let m of CONSOLE_STDOUT_METHODS) {
      originals[m] = con[m];
      con[m] = toDebug;
    }
    for (let m of CONSOLE_STDERR_METHODS) {
      originals[m] = con[m];
      con[m] =
        m === "error"
          ? (...args) =>
              logForDebugging(`console.error: ${format(...args)}`, {
                level: "error",
              })
          : proxy(m);
    }
    originals.assert = con.assert;
    con.assert = (condition, ...args) => {
      if (!condition) toError("assert")(...args);
    };
    return () => Object.assign(con, originals);
  }
  patchStderr() {
    let stderr = process.stderr;
    let originalWrite = stderr.write;
    let reentered = false;
    let intercept = (chunk, encodingOrCb, cb) => {
      let callback = typeof encodingOrCb === "function" ? encodingOrCb : cb;
      if (reentered) {
        let encoding = typeof encodingOrCb === "string" ? encodingOrCb : undefined;
        return originalWrite.call(stderr, chunk, encoding, callback);
      }
      reentered = true;
      try {
        let text = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString("utf8");
        logForDebugging(`[stderr] ${text}`, {
          level: "warn",
        });
        if (this.altScreenActive && !this.isUnmounted && !this.isHandedOff) {
          this.prevFrameContaminated = true;
          this.scheduleRender();
        }
      } finally {
        reentered = false;
        callback?.();
      }
      return true;
    };
    stderr.write = intercept;
    return () => {
      if (stderr.write === intercept) stderr.write = originalWrite;
    };
  }
}
//@ chunk-bzr73sfg.js:377361-377981 fingerprint = drainStdin (0.771)
/**
 * 退出或交接前把 stdin 里残留的终端应答读干净：临时进原始模式，以非阻塞方式打开 /dev/tty 读取（最多 64 块），直到读到预期数量的 DA1 应答或超时（250ms），避免应答字节泄漏到 shell。
 */
function drainStdin(stdin = process.stdin, expectedDa1Replies = 0) {
  if (!stdin.isTTY) return;
  let chunks = [];
  try {
    let chunk;
    while ((chunk = stdin.read()) !== null)
      chunks.push(typeof chunk === "string" ? Buffer.from(chunk, "utf8") : chunk);
  } catch {}
  let tty = stdin;
  let wasRaw = tty.isRaw === true;
  let fd = -1;
  try {
    if (!wasRaw) tty.setRawMode?.(true);
    fd = openSync("/dev/tty", constants.O_RDONLY | constants.O_NONBLOCK);
    let buf = Buffer.alloc(1024);
    let deadline = expectedDa1Replies > 0 ? performance.now() + OWED_REPLY_HOLD_MS : 0;
    let remainingReplies = expectedDa1Replies - countDa1Replies(Buffer.concat(chunks));
    for (let reads = 0; reads < 64;) {
      let nonBlocking = readNonBlocking(fd, buf);
      if (nonBlocking > 0) {
        let buffer = Buffer.from(buf.subarray(0, nonBlocking));
        chunks.push(buffer);
        remainingReplies -= countDa1Replies(buffer);
        reads++;
        continue;
      }
      if (nonBlocking < 0 || remainingReplies <= 0 || performance.now() >= deadline) break;
      Bun.sleepSync(2);
    }
  } catch {
  } finally {
    if (fd >= 0)
      try {
        closeSync(fd);
      } catch {}
    if (!wasRaw)
      try {
        tty.setRawMode?.(false);
      } catch {}
  }
  return chunks.length ? Buffer.concat(chunks) : undefined;
}
//@ chunk-bzr73sfg.js:377981-378071 layout
function readNonBlocking(fd, buffer) {
  try {
    return readSync(fd, buffer, 0, buffer.length, null);
  } catch (error) {
    return getErrnoCode(error) === "EAGAIN" ? 0 : -1;
  }
}
//@ chunk-bzr73sfg.js:378071-378151 layout
function countDa1Replies(buffer) {
  return buffer.toString("latin1").match(/\x1b\[\?[\d;]*c/g)?.length ?? 0;
}
//@ chunk-bzr73sfg.js:378151-378316 fingerprint = CONSOLE_STDOUT_METHODS (0.966)
var CONSOLE_STDOUT_METHODS = [
  "log",
  "info",
  "debug",
  "dir",
  "dirxml",
  "count",
  "countReset",
  "group",
  "groupCollapsed",
  "groupEnd",
  "table",
  "time",
  "timeEnd",
  "timeLog",
];
var CONSOLE_STDERR_METHODS = ["warn", "error", "trace"];
//@ chunk-bzr73sfg.js:378316-378410 affinity
function hasWheelHandler(node) {
  let node_2 = node;
  while (node_2) {
    if (node_2._eventHandlers?.onWheel) return true;
    node_2 = node_2.parentNode;
  }
  return false;
}
//@ chunk-bzr73sfg.js:378410-378479 affinity = diff (1)
function eraseMainScreenFrame(frameCursor, displayCursor) {
  return (
    (displayCursor === null
      ? ""
      : cursorMove(frameCursor.x - displayCursor.x, frameCursor.y - displayCursor.y)) +
    eraseLines(frameCursor.y + 1)
  );
}
//@ chunk-bzr73sfg.js:378479-378578 affinity
function tmuxPanePlacer(pane, isPlaced, columns, rows) {
  return (col, row) =>
    isPlaced && col >= 0 && row >= 0 && col < columns && row < rows
      ? {
          row: pane.top + row + 1,
          column: pane.left + col + 1,
        }
      : undefined;
}
//@ chunk-bzr73sfg.js:378578-378648 affinity
function altScreenImagePlacer(columns, rows) {
  return (col, row) =>
    col >= 0 && row >= 0 && col < columns && row < rows ? cursorPosition(row + 1, col + 1) : undefined;
}
//@ chunk-bzr73sfg.js:378648-378840 sole-consumer
function mainScreenImagePlacer(frame, cursor, rows, scrolledOutRows) {
  let max = Math.max(frame.screen.height, frame.cursor.y + 1);
  let max_2 = Math.max(0, max - rows, scrolledOutRows);
  let min = Math.min(Math.max(cursor.y, max_2), max_2 + rows - 1);
  return (col, row) =>
    col < 0 || row < max_2 || row >= frame.screen.height
      ? undefined
      : `${DECRC}\r${cursorMove(col, row - min)}`;
}
export { getTerminalSize, drainStdin, restoreTerminalModes, Ink };
