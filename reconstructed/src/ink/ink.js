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
import { a5o } from "../../vendor/react/cjs/react.production.js";
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
import { zc } from "../../vendor/yoga-layout/dist/src/generated/YGEnums.js";
import { Bct } from "../../vendor/lodash-es/uniqBy.js";
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

//@ chunk-bzr73sfg.js:321779-321877 placement
function shouldCompactStylePool(framesSinceCompact, stylePool, liveStyles) {
  let p = stylePool.isNearCapacity ? 1000 : 30000;
  return framesSinceCompact > p && (framesSinceCompact > 300000 || stylePool.needsCompaction(liveStyles));
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
  let m = modes.isSet("extendedKeys") && !modes.isSuspended;
  let resetSeq = modes.resetAll();
  let seq =
    resetSeq +
    RESET_CHARSET +
    extraResets.filter((extraReset) => !resetSeq.includes(extraReset)).join("") +
    (m ? "" : popKittyKeyboardSequence()) +
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
function runSelectionTakeDown(n) {
  try {
    n();
  } catch (error) {
    if (isAbortError(error)) logForDebugging(`selection take-down aborted: ${errorMessage(error)}`);
    else logError(error);
  }
}
//@ chunk-bzr73sfg.js:322843-322930 sole-consumer
function createSelectionTakeDownSignal() {
  let signal = createSignal();
  return {
    subscribe: (u) => signal.subscribe(() => runSelectionTakeDown(u)),
    announce: signal.emit,
  };
}
//@ chunk-bzr73sfg.js:322930-323156 fingerprint = ALT_SCREEN_ANCHOR_CURSOR (0.605)
var MAX_COLUMNS = 8192;
var FRAME_INTERVAL_MS = 16;
var MAX_FRAME_SKIP = 5;
var SLOW_FRAME_MS = 50;
var STYLE_COMPACT_FRAMES = 5;
var CURSOR_POSITION_QUERY = cursorPosition_2();
var HIDDEN_CURSOR = Object.freeze({
  x: 0,
  y: 0,
  visible: false,
});
var ALT_SCREEN_ANCHOR_CURSOR = Object.freeze({
  type: "stdout",
  content: CURSOR_HOME,
});
var ALT_SCREEN_ANCHOR_HOME = Object.freeze({
  type: "stdout",
  content: ERASE_SCREEN + CURSOR_HOME,
});
var RESET_COLOR_255 = "\x1B]104;255\x07";
var RESIZE_SETTLE_MS = 2000;
var QUERY_TIMEOUT_MS = 2000;
var MAX_RESIZE_RETRIES = 4;
var STDIN_RESUME_GAP_MS = 1000;
//@ chunk-bzr73sfg.js:323156-323285 layout
function isGraphemeBoundary(text, index) {
  if (index <= 0) return true;
  for (let f of getGraphemeSegmenter().segment(text)) {
    if (f.index === index) return true;
    if (f.index > index) return false;
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
var MAX_TERMINAL_COLS = MAX_COLUMNS;
var MAX_TERMINAL_ROWS = 2048;
var MAX_ROWS_ALIAS = 3;
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
    let n = [...this.clickListeners];
    queueMicrotask(() => {
      for (let u of n) if (this.clickListeners.has(u)) u(null, null);
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
    let n = true;
    return () => {
      if (!n) return;
      n = false;
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
  appRef = a5o();
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
    this.focusManager = new FocusManager((m, p) => dispatcher.dispatchDiscrete(m, p));
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
      zc,
      null,
      false,
      null,
      "id",
      Bct,
      Bct,
      Bct,
      Bct,
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
  warnGarbageWinsizeOnce(n) {
    if (this.loggedGarbageWinsize) return;
    this.loggedGarbageWinsize = true;
    logForDebugging(n, {
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
  rejectExitPromise = (n) => {
    if (this.exitPromise === undefined) {
      this.exitPromise = Promise.reject(n);
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
    let n = this.altScreenActive || !(this.accessibilityMode || this.isScreenReaderEnabled);
    this.options.stdout.write(
      (this.altScreenActive ? "" : EXIT_ALT_SCREEN) +
        (n ? HIDE_CURSOR : "") +
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
  reportLayoutListenerFault(n) {
    try {
      this.reportLayoutFaultErrorOnce(n);
      if (!this.reportedLayoutListenerFault) {
        this.reportedLayoutListenerFault = true;
        this.reportLayoutListenersPaused();
      }
      this.logLayoutListenerFaultForDebugging(n);
    } catch {}
  }
  reportLayoutListenersPaused() {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "ink layout listener threw; layout listeners paused until this flush unwinds",
      ),
    );
  }
  logLayoutListenerFaultForDebugging(n) {
    try {
      if (this.layoutListenerFaultDebugLines >= STYLE_COMPACT_FRAMES) return;
      this.layoutListenerFaultDebugLines++;
      let u =
        this.layoutListenerFaultDebugLines >= STYLE_COMPACT_FRAMES
          ? " \u2014 further layout listener faults in this session are not logged"
          : "";
      logForDebugging(
        `ink layout listener threw (contained; layout listeners paused until this flush unwinds): ${n.name}: ${n.message}${u}`,
        {
          level: "warn",
        },
      );
    } catch {}
  }
  runLayoutPass(n) {
    try {
      this.calculateYogaLayout(n);
      this.layoutFailed = false;
      this.consecutiveLayoutFailures = 0;
    } catch (error) {
      let f = this.relayoutFromScratch(n);
      this.layoutFailed = !f.recovered;
      this.consecutiveLayoutFailures = f.recovered ? 0 : this.consecutiveLayoutFailures + 1;
      let m = Ink.describeLayoutFault(error);
      let p = f.recovered ? undefined : Ink.describeLayoutFault(f.retryFault);
      this.reportLayoutFaultToErrorTracking(m, p);
      this.logLayoutFaultForDebugging(m, p);
    }
  }
  calculateYogaLayout(n) {
    let startTime = performance.now();
    if (this.options.stdout.isTTY || this.options.stdout.columns) {
      n.setWidth(this.terminalColumns);
      n.calculateLayout(this.terminalColumns);
    } else {
      n.setWidthAuto();
      n.calculateLayout();
      if (n.getComputedWidth() > MAX_COLUMNS) {
        n.setWidth(MAX_COLUMNS);
        n.calculateLayout(MAX_COLUMNS);
      }
    }
    let ms = performance.now() - startTime;
    let yogaCounters = getYogaCounters(n);
    this.lastYogaCounters = {
      ms,
      ...yogaCounters,
    };
  }
  relayoutFromScratch(n) {
    try {
      n.clearLayoutCacheRecursive();
      this.calculateYogaLayout(n);
      return {
        recovered: true,
      };
    } catch (error) {
      try {
        n.clearLayoutCacheRecursive();
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
  static describeLayoutFault(n) {
    try {
      let error = toError(n);
      if (typeof error.message === "string" && typeof error.name === "string") return error;
    } catch {}
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "ink layout pass threw a value that cannot be described",
    );
  }
  reportLayoutFaultToErrorTracking(n, u) {
    try {
      this.reportLayoutFaultErrorOnce(n);
      if (u === undefined) {
        if (!this.reportedLayoutFaultRecovered) {
          this.reportedLayoutFaultRecovered = true;
          this.reportLayoutFaultRecovered();
        }
        return;
      }
      this.reportLayoutFaultErrorOnce(u);
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
  reportLayoutFaultErrorOnce(n) {
    let reportedLayoutFaultMessages = this.reportedLayoutFaultMessages;
    if (reportedLayoutFaultMessages.has(n.message) || reportedLayoutFaultMessages.size >= FRAME_INTERVAL_MS)
      return;
    reportedLayoutFaultMessages.add(n.message);
    logError(n);
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
  logLayoutFaultForDebugging(n, u) {
    try {
      if (this.layoutFaultDebugLines >= MAX_FRAME_SKIP) return;
      this.layoutFaultDebugLines++;
      let f =
        u === undefined
          ? "recovered by immediate re-layout"
          : `immediate re-layout also threw (${u.name}: ${u.message}); frame dropped`;
      let m =
        this.layoutFaultDebugLines >= MAX_FRAME_SKIP
          ? " \u2014 further layout faults in this session are not logged"
          : "";
      logForDebugging(`ink layout pass threw (${f}): ${n.name}: ${n.message}${m}`, {
        level: "warn",
      });
    } catch {}
  }
  requestInputPriorityFrame = () => {
    this.inputPriorityUntil = this.pacerNow() + SCROLL_MAX_ROWS_PER_TICK;
    let n = false;
    if (this.srAnnouncementHoldTimer !== null) {
      endAnnouncementHold();
      n = true;
    }
    if (this.isScreenReaderEnabled && this.srHeldAnnouncements.length > 0) {
      this.srHeldAnnouncements = [];
      n = true;
    }
    if (n) this.onRender();
  };
  scheduleFrame() {
    if (this.frameMicrotaskQueued) return;
    let n = this.pacerNow();
    let u = n - this.lastPacedFrameAt;
    let f = n < this.inputPriorityUntil ? SCROLL_MIN_ROWS : SCROLL_JUMP_LINES;
    if (u >= f) {
      this.queuePacedFrame();
      return;
    }
    let m = this.lastPacedFrameAt + f;
    if (this.frameTimer === null || m < this.frameTimerDueAt) {
      this.cancelScheduledFrame();
      this.frameTimerDueAt = m;
      this.frameTimer = setTimeout(
        () => {
          this.frameTimer = null;
          this.queuePacedFrame();
        },
        Math.max(0, m - n),
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
    let E = `${anchor?.row},${anchor?.col},${focus?.row},${focus?.col}|${this.searchHighlightQuery}|${searchPositions?.currentIdx},${searchPositions?.rowOffset},${searchPositions?.positions.length}`;
    let T = this.prevFrameContaminated || E !== this.prevOverlaySig || this.hoveredLinkSpans.length > 0;
    this.prevOverlaySig = E;
    if (this.imagesStale) {
      this.imagesStale = false;
      this.terminalImages.retransmitAll();
    }
    let tmuxPane = env.TMUX ? getTerminalProbeState().tmuxPane : undefined;
    let D = tmuxPane !== undefined && tmuxPane.passthrough !== "off";
    this.terminalImages.isTmuxPassthrough = D;
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
      prevFrameContaminated: T,
      overlayActive,
    });
    let renderer = performance.now() - startTime;
    if (this.frameSink) {
      let Ce = this.altScreenActive ? "" : this.terminalImages.drain();
      if (Ce !== "") this.writeContent(Ce);
      let Te = this.frameSink(frame, this.stylePool);
      if (Te) {
        this.leftAltScreenSinceFrame = false;
        this.backFrame = this.frontFrame;
        this.frontFrame = frame;
        this.prevFrameContaminated = false;
        this.mainScreenBehindAlt = undefined;
        this.repaintAfterStaleAbsolutePaint(frame);
        this.maybeResetPools(startTime);
        if (Te === "tick") this.drainTimer = setTimeout(() => this.onRender(), SCROLL_JUMP_LINES >> 2);
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
    let P = false;
    let z = false;
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
      P = hasSelection(this.selection) && !isSelectionFullyOffscreen(this.selection);
      if (P) applySelectionOverlay(frame.screen, this.selection, this.stylePool);
      z = applySearchHighlight(frame.screen, this.searchHighlightQuery, this.stylePool);
      if (this.searchPositions) {
        let searchPositions = this.searchPositions;
        let posApplied = applyPositionedHighlight(
          frame.screen,
          this.stylePool,
          searchPositions.positions,
          searchPositions.rowOffset,
          searchPositions.currentIdx,
        );
        z = z || posApplied;
      }
    }
    if (frame.layoutShifted || P || z || T || (this.altScreenFullRepaint && this.altScreenActive))
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
    let any = diff.some((Ce) => Ce.type === "clearTerminal");
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
    let Se =
      this.options.nativeCursor &&
      target !== null &&
      decl !== null &&
      (decl.visible || this.accessibilityMode) !== this.nativeCursorVisible;
    if (hasDiff || targetMoved || Se || (target === null && parked !== null)) {
      let Ce = rows - 1;
      let Te = (Ae) => Math.max(-Ce, Math.min(Ce, Ae));
      if (parked !== null && !this.altScreenActive && hasDiff) {
        let pdx = frontFrame.cursor.x - parked.x;
        let pdy = Te(frontFrame.cursor.y - parked.y);
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
          let Pe = target.x - from.x;
          let Ze = Te(target.y - from.y);
          if (Pe !== 0 || Ze !== 0)
            patches.push({
              type: "stdout",
              content: cursorMove(Pe, Ze),
            });
        }
        this.displayCursor = {
          ...target,
          emittedRows: rows,
        };
        if (this.options.nativeCursor || this.bgWorkerForceShowCursor) {
          let Ae = this.bgWorkerForceShowCursor || (decl !== null && decl.visible) || this.accessibilityMode;
          if (this.nativeCursorVisible)
            patches.unshift({
              type: "cursorHide",
            });
          if (Ae)
            patches.push({
              type: "cursorShow",
            });
          this.nativeCursorVisible = Ae;
        }
      } else {
        if (parked !== null && !this.altScreenActive && !hasDiff) {
          let rdx = frame.cursor.x - parked.x;
          let rdy = Te(frame.cursor.y - parked.y);
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
    let xe = this.terminalImages.placeIterm(
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
      D
        ? tmuxPanePlacer(
            tmuxPane,
            this.altScreenActive && tmuxPane.isPlaced && !getTerminalProbeState().isTmuxPaneAsked,
            columns,
            rows,
          )
        : undefined,
      isFreshTmuxProbe(D, getTerminalProbeState().tmuxPaneAnsweredAt, performance.now()),
    );
    if (xe !== "")
      patches.push({
        type: "stdout",
        content: xe,
      });
    if (D && this.terminalImages.hasHeldDraw)
      queueMicrotask(() => this.appRef.current?.refreshTmuxPaneForPicture());
    let fe = this.terminalImages.drain();
    if (fe !== "")
      patches.unshift({
        type: "stdout",
        content: fe,
      });
    let startTime_2 = performance.now();
    this.leftAltScreenSinceFrame = false;
    writeDiffToTerminal(
      this.terminal,
      patches,
      this.skipSyncMarkers() || (D && (this.terminalImages.size > 0 || fe !== "")),
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
      let fe = startupQuietRemainingMs();
      if (fe > 0) {
        if (this.srStartupQuietTimer === null)
          this.srStartupQuietTimer = setTimeout(() => {
            this.srStartupQuietTimer = null;
            endStartupQuiet();
            this.onRender();
          }, fe);
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
    let p = [];
    for (let [fe, ge] of [...preserveRanges].sort((we, Fe) => we[0] - Fe[0])) {
      let last = p.at(-1);
      if (last !== undefined && fe <= last[1]) last[1] = Math.max(last[1], ge);
      else p.push([fe, ge]);
    }
    let g =
      text === ""
        ? []
        : text.split(`
`);
    let E = [];
    let T = [];
    let A = 0;
    for (let fe of g) {
      let ge = A + fe.length;
      let Fe = A + fe.trimEnd().length < ge && p.some(([Ae, Pe]) => Ae < ge && ge <= Pe);
      let Ne =
        rowPrefixRanges.find(([Ae, Pe]) => (fe === "" ? Ae <= A && A <= Pe : Ae < ge && A < Pe))?.[2] ?? "";
      let Ce = columns - conservativeWidth(Ne) >= 2 ? Ne : "";
      let Te = Ce.trimEnd();
      T.push(E.length);
      if (fe === "") E.push(Te);
      else {
        let Ae =
          Ne === "" || columns < 2
            ? wrapAnsi(fe, columns, {
                trim: false,
                hard: true,
              }).split(`
`)
            : wrapTextConservatively(squashSingleText(fe), columns - conservativeWidth(Ce));
        for (let idx = 0; idx < Ae.length; idx++) {
          let Ze = Ae[idx];
          let it = Fe && idx === Ae.length - 1 ? Ze : Ze.trimEnd();
          E.push(it === "" ? Te : Ce + it);
        }
      }
      A = ge + 1;
    }
    let screenReaderPark = this.computeScreenReaderPark(text, T, E, columns);
    let O = -1;
    let filtered = drainAnnouncements()
      .map((fe) => sanitizeForScreenReader(fe))
      .filter((fe) => fe !== "");
    if (filtered.length > 0 || this.isExiting) this.srHeldAnnouncements = filtered;
    let U = E.length;
    for (let srHeldAnnouncement of this.srHeldAnnouncements)
      for (let line of srHeldAnnouncement.split(`
`)) {
        if (O === -1 && filtered.length > 0) O = E.length;
        if (line === "") E.push("");
        else {
          let we = wrapAnsi(line, columns, {
            trim: false,
            hard: true,
          });
          for (let line of we.split(`
`))
            E.push(line.trimEnd());
        }
      }
    let L = takeAnnouncementHoldMs();
    let P = takeTranscriptFrontCut(this.rootNode);
    if (P !== null) this.applyTranscriptFrontCut(P, text, T, E);
    let prevScreenReaderLines = this.prevScreenReaderLines;
    let G = E.length - U;
    let X = G > Math.min(MAX_ROWS_ALIAS, Math.floor(this.terminalRows / 4));
    if (X) this.srHeldAnnouncements = [];
    if (
      filtered.length === 0 &&
      G > 0 &&
      (X ||
        (!this.srRewriteHeldAnnouncement &&
          (prevScreenReaderLines.length !== E.length ||
            E.some((fe, ge) => ge < U && fe !== prevScreenReaderLines[ge]))))
    ) {
      this.srHeldAnnouncements = [];
      E.length = U;
    }
    let max = Math.max(0, E.length - 1);
    let q = screenReaderPark ?? {
      row: max,
      col: bunStringWidth(E[max] ?? ""),
    };
    let Y = 0;
    let min = Math.min(prevScreenReaderLines.length, E.length);
    while (Y < min && prevScreenReaderLines[Y] === E[Y]) Y++;
    if (O !== -1 && Y > O) Y = O;
    let V = Y === prevScreenReaderLines.length && Y === E.length;
    let prevScreenReaderPark = this.prevScreenReaderPark;
    let ae = q.row === prevScreenReaderPark.row && q.col === prevScreenReaderPark.col;
    if (V && ae) {
      if (this.srPreParked) {
        this.srPreParked = false;
        this.options.stdout.write(cursorTo(q.col + 1));
      }
      this.prevScreenReaderParkDeclared = screenReaderPark !== null;
      return;
    }
    if (
      !V &&
      O === -1 &&
      !this.srPreParked &&
      (this.prevScreenReaderAnchor === "clean" ||
        (this.prevScreenReaderAnchor === "lastRowAnchored" &&
          Y === prevScreenReaderLines.length - 1 &&
          prevScreenReaderPark.row === Y &&
          q.row === Y)) &&
      prevScreenReaderLines.length === E.length &&
      Y >= prevScreenReaderLines.length - this.terminalRows &&
      prevScreenReaderPark.row >= prevScreenReaderLines.length - this.terminalRows &&
      E[Y].startsWith(prevScreenReaderLines[Y]) &&
      !E[Y].includes("\t")
    ) {
      let fe = true;
      for (let idx = Y + 1; idx < prevScreenReaderLines.length; idx++)
        if (prevScreenReaderLines[idx] !== E[idx]) {
          fe = false;
          break;
        }
      let ge = fe ? E[Y].slice(prevScreenReaderLines[Y].length) : "";
      let we = ge === "" ? 0 : bunStringWidth(prevScreenReaderLines[Y]);
      if (
        ge !== "" &&
        bunStringWidth(String.fromCodePoint(ge.codePointAt(0))) > 0 &&
        we + bunStringWidth(ge) === bunStringWidth(E[Y]) &&
        isGraphemeBoundary(E[Y], prevScreenReaderLines[Y].length)
      ) {
        let Ne =
          (Y !== prevScreenReaderPark.row ? cursorMove(0, Y - prevScreenReaderPark.row) : "") +
          cursorTo(we + 1);
        let Ce = cursorTo(q.col + 1) + (q.row !== Y ? cursorMove(0, q.row - Y) : "");
        this.writeContent(Ne + ge + Ce);
        this.prevScreenReaderLines = E;
        this.prevScreenReaderPark = q;
        this.prevScreenReaderParkDeclared = screenReaderPark !== null;
        return;
      }
    }
    if (
      !V &&
      O === -1 &&
      !this.srPreParked &&
      (this.prevScreenReaderAnchor === "clean" ||
        (this.prevScreenReaderAnchor === "lastRowAnchored" &&
          Y === prevScreenReaderLines.length - 1 &&
          prevScreenReaderPark.row === Y &&
          q.row === Y)) &&
      prevScreenReaderLines.length === E.length &&
      Y >= prevScreenReaderLines.length - this.terminalRows &&
      prevScreenReaderLines[Y].startsWith(E[Y]) &&
      !prevScreenReaderLines[Y].includes("\t")
    ) {
      let fe = true;
      for (let idx = Y + 1; idx < prevScreenReaderLines.length; idx++)
        if (prevScreenReaderLines[idx] !== E[idx]) {
          fe = false;
          break;
        }
      let ge = fe ? prevScreenReaderLines[Y].slice(E[Y].length) : "";
      let we = ge === "" ? 0 : bunStringWidth(E[Y]);
      if (
        ge !== "" &&
        bunStringWidth(String.fromCodePoint(ge.codePointAt(0))) > 0 &&
        we + bunStringWidth(ge) === bunStringWidth(prevScreenReaderLines[Y]) &&
        isGraphemeBoundary(prevScreenReaderLines[Y], E[Y].length) &&
        (!/\s/.test(ge) || /^\s+$/.test(ge)) &&
        screenReaderPark !== null &&
        this.prevScreenReaderParkDeclared &&
        prevScreenReaderPark.row === Y &&
        prevScreenReaderPark.col === bunStringWidth(prevScreenReaderLines[Y])
      ) {
        let Ne = cursorTo(we + 1);
        let Ce = cursorTo(q.col + 1) + (q.row !== Y ? cursorMove(0, q.row - Y) : "");
        this.writeContent(Ne + eraseToEndOfLine() + Ce);
        this.prevScreenReaderLines = E;
        this.prevScreenReaderPark = q;
        this.prevScreenReaderParkDeclared = screenReaderPark !== null;
        return;
      }
    }
    if (!this.isExiting && !V && Y < E.length && O === -1 && !this.srPreParked) {
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
    let de = prevScreenReaderPark.row !== max_2 ? cursorMove(0, max_2 - prevScreenReaderPark.row) : "";
    let se = prevScreenReaderLines.length - this.terminalRows;
    if (se > Y && se < E.length) {
      let fe = Y;
      let ge = Y;
      while (ge < se) {
        if (E[ge] === "") {
          ge++;
          continue;
        }
        while (fe < se && prevScreenReaderLines[fe] === "") fe++;
        if (fe === se || prevScreenReaderLines[fe] !== E[ge]) break;
        fe++;
        ge++;
      }
      if (ge === se) Y = se;
    }
    let ye = Y === E.length && Y > 0;
    let ue = se > Y || (ye && se === Y);
    let ce = eraseLines(Math.min(prevScreenReaderLines.length - Y, this.terminalRows));
    let joined = E.slice(Y).join(`
`);
    let Se;
    if (V) Se = "";
    else if (Y === prevScreenReaderLines.length)
      Se =
        Y > 0
          ? `
${joined}`
          : joined;
    else if (Y === E.length) Se = Y > 0 && !ue ? ce + cursorMove(0, -1) : ce;
    else Se = ce + joined;
    let xe = cursorTo(q.col + 1) + (q.row !== max ? cursorMove(0, q.row - max) : "");
    this.writeContent(de + Se + xe);
    if (O !== -1 && L > 0 && !this.isExiting) {
      startAnnouncementHold(L);
      this.srAnnouncementHoldTimer = setTimeout(() => {
        this.srAnnouncementHoldTimer = null;
        this.onRender();
      }, L);
    }
    this.prevScreenReaderLines = E;
    this.prevScreenReaderPark = q;
    this.prevScreenReaderParkDeclared = screenReaderPark !== null;
    this.srPreParked = false;
    if (!V) {
      let fe = E.length - Y;
      let ge = q.row === E.length - 1;
      let we = E.length < prevScreenReaderLines.length;
      let Fe = prevScreenReaderLines.length <= this.terminalRows;
      if (ue && fe < this.terminalRows) this.prevScreenReaderAnchor = "broken";
      else if (fe >= Math.min(E.length, this.terminalRows)) this.prevScreenReaderAnchor = "clean";
      else if (fe > 0) {
        if (this.prevScreenReaderAnchor === "broken")
          this.prevScreenReaderAnchor = ge ? "lastRowAnchored" : "broken";
        else if (this.prevScreenReaderAnchor === "lastRowAnchored") {
          if (!ge) this.prevScreenReaderAnchor = "broken";
        } else if (we && !Fe) this.prevScreenReaderAnchor = ge ? "lastRowAnchored" : "broken";
      } else if (this.prevScreenReaderAnchor === "lastRowAnchored") this.prevScreenReaderAnchor = "broken";
      else if (we && this.prevScreenReaderAnchor === "clean" && !Fe)
        this.prevScreenReaderAnchor = ge ? "lastRowAnchored" : "broken";
    } else if (
      this.prevScreenReaderAnchor === "lastRowAnchored" &&
      (prevScreenReaderPark.row !== Math.max(0, prevScreenReaderLines.length - 1) || q.row !== max)
    )
      this.prevScreenReaderAnchor = "broken";
  }
  applyTranscriptFrontCut(target, u, f, m) {
    if (this.prevScreenReaderAnchor !== "clean") return;
    let prevScreenReaderLines = this.prevScreenReaderLines;
    let prevScreenReaderPark = this.prevScreenReaderPark;
    let E = prevScreenReaderLines.length - this.terminalRows;
    if (E <= 0) return;
    let T = screenReaderOffsetOf(this.rootNode, target);
    if (T === null) return;
    let A =
      f[
        countCharInString(
          u.slice(0, T),
          `
`,
        )
      ];
    if (A === undefined) return;
    for (let idx = 1; A + idx + 1 < E; idx++) {
      let O = true;
      let _ = 0;
      for (let idx_2 = A + idx + 1; idx_2 < E; idx_2++) {
        let L = idx_2 - idx;
        if (L >= m.length || prevScreenReaderLines[idx_2] !== m[L]) {
          O = false;
          break;
        }
        if (prevScreenReaderLines[idx_2] !== "") _++;
      }
      if (!O || _ < this.terminalRows) continue;
      if (prevScreenReaderPark.row >= A && prevScreenReaderPark.row < A + idx) return;
      this.prevScreenReaderLines = [
        ...prevScreenReaderLines.slice(0, A),
        m[A],
        ...prevScreenReaderLines.slice(A + idx + 1),
      ];
      if (prevScreenReaderPark.row >= A + idx)
        this.prevScreenReaderPark = {
          row: prevScreenReaderPark.row - idx,
          col: prevScreenReaderPark.col,
        };
      return;
    }
  }
  computeScreenReaderPark(n, u, f, m) {
    let cursorDeclaration = this.cursorDeclaration;
    if (cursorDeclaration === null) return null;
    let g = screenReaderOffsetOf(this.rootNode, cursorDeclaration.node);
    if (g === null) return null;
    let sliced = n.slice(0, g);
    let A =
      countCharInString(
        sliced,
        `
`,
      ) + cursorDeclaration.relativeY;
    if (A < 0 || A >= u.length) return null;
    let D =
      sliced.lastIndexOf(`
`) + 1;
    let _ =
      (cursorDeclaration.relativeY === 0 ? bunStringWidth(n.slice(D, g)) : 0) + cursorDeclaration.relativeX;
    let U = m > 0 ? Math.floor(_ / m) : 0;
    let min = Math.min(u[A] + U, f.length - 1);
    let P = m > 0 ? _ % m : _;
    return {
      row: Math.max(0, min),
      col: Math.max(0, P),
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
  emitAtlasReset(n) {
    if (n)
      n.unshift({
        type: "stdout",
        content: RESET_COLOR_255,
      });
    else this.options.stdout.write(RESET_COLOR_255);
    this.stylePool.atlasRecorder.reset();
    this.lastAtlasResetAt = performance.now();
  }
  maybeProactiveAtlasReset(n) {
    let atlasRecorder = this.stylePool.atlasRecorder;
    if (!atlasRecorder.autoResetEnabled) return;
    if (this.renderDebug.stressing) return;
    if (atlasRecorder.size < RESIZE_SETTLE_MS) return;
    if (!this.renderDebug.isBoxOpen() && performance.now() - this.lastAtlasResetAt < QUERY_TIMEOUT_MS) return;
    if (!isXtermJs()) return;
    this.emitAtlasReset(n);
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
  forceRedraw(n) {
    if (!this.options.stdout.isTTY || this.isUnmounted || this.isHandedOff) return false;
    if (n?.flushReact) reconcilerAlias.flushSyncFromReconciler();
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
  async probeExternalClear(n) {
    if (!this.altScreenActive || this.isHandedOff || this.isUnmounted) return false;
    let displayCursor = this.displayCursor;
    if (!displayCursor) return false;
    let f = (displayCursor) =>
      Math.min(Math.max(displayCursor.y + 1, 1), this.stdoutSize().rows, displayCursor.emittedRows);
    if (f(displayCursor) <= 1) return false;
    let m = await n.send(CURSOR_POSITION_QUERY);
    if (m?.row !== 1) return false;
    let displayCursor_2 = this.displayCursor;
    if (displayCursor_2 === null || f(displayCursor_2) <= 1) return false;
    logForDebugging(
      `probeExternalClear: detected wipe (parked at y=${displayCursor_2.y}, sent at y=${displayCursor.y}, terminal reports row=1 col=${m.col})`,
    );
    this.forceRedraw();
    return true;
  }
  invalidatePrevFrame() {
    this.prevFrameContaminated = true;
  }
  setAltScreenActive(n, u = "off") {
    if (!n) {
      this.writeKeptForNextFrame();
      this.leftAltScreenSinceFrame = true;
    }
    if (this.altScreenActive === n) return "";
    this.altScreenActive = n;
    this.altScreenMouseTracking = n ? u : "off";
    if (!n) {
      this.forgetPointer();
      this.hoveredLinkSpans = [];
    }
    queueMicrotask(() => {
      if (this.isUnmounted) return;
      for (let hoverTrackedListener of this.hoverTrackedListeners) hoverTrackedListener();
    });
    this.syncMousePixels();
    if (n) {
      this.ensureInteractive();
      let f =
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
      let m = this.stdoutSize();
      let mainScreenBehindAlt =
        f?.viewport.width === m.columns && f.viewport.height === m.rows ? f : undefined;
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
  keepForNextFrame(n) {
    if (this.leftAltScreenSinceFrame || this.isUnmounted) return false;
    if (this.keptForNextFrame === "" && n !== "") setImmediate(this.writeKeptForNextFrame);
    this.keptForNextFrame += n;
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
    let n = this.heldAltScreenLeave !== undefined;
    this.heldAltScreenLeave = undefined;
    return n;
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
    let n = this.takeKeptForNextFrame();
    if (n !== "" && !this.isUnmounted) handleEPIPE(this.terminal, n);
  };
  writeAfterKept(n) {
    if (this.keptForNextFrame !== "") this.keptForNextFrame += n;
    else this.options.stdout.write(n);
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
    let n =
      this.finePointerHolds > 0 &&
      this.altScreenActive &&
      this.altScreenMouseTracking === "full" &&
      getTerminalCapabilities().now("mousePixels") &&
      getTerminalProbeState().cellPixels !== undefined;
    if (n === this.modes.isSet("mousePixels")) return;
    let u = n ? this.modes.set("mousePixels") : this.modes.reset("mousePixels");
    let f = u !== "" && !this.isHandedOff;
    if (f) this.writeAfterKept(u);
    let querier = this.appRef.current?.querier;
    if (f && querier && this.holdsRawMode)
      querier.flush().then(() => {
        this.pixelReportsLive = n;
      });
    else this.pixelReportsLive = n;
    logForDebugging(`Mouse reports in ${n ? "pixels" : "cells"}`);
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
  writeContent(n) {
    handleEPIPE(this.terminal, n);
  }
  recordContentWrite = (n, bytes) => {
    recordSlowestWrite(this.terminal, n, bytes);
  };
  handleStdoutBackpressure = (n) => {
    if (n.droppedBytes > 0) {
      let u = n.endedBy === "drain";
      this.appRef.current?.querier?.resync({
        probe: u,
      });
      if (u) {
        this.reassertTerminalModes();
        this.forceRedraw();
      } else this.repaint();
    }
    if (this.frameHeldForBacklog && n.endedBy === "drain") {
      this.frameHeldForBacklog = false;
      this.scheduleFrame();
    }
    if (n.droppedBytes > 0 || n.durationMs >= 1000)
      logEvent("tengu_stdout_backpressure", {
        duration_ms: n.durationMs,
        peak_queued_bytes: n.peakQueuedBytes,
        dropped_bytes: n.droppedBytes,
      });
  };
  reassertTerminalModes = (n = false) => {
    if (!this.options.stdout.isTTY) return;
    if (this.isHandedOff || this.isUnmounted) return;
    this.options.stdout.write(
      RESET_CHARSET +
        this.modes.reassert("bracketedPaste") +
        this.modes.reassert("extendedKeys") +
        this.modes.reassert("mouse") +
        this.modes.reassert("mousePixels"),
    );
    if (n && this.altScreenActive) this.reenterAltScreen();
  };
  detachForShutdown() {
    this.nonBlockingStdout?.flush();
    if (
      !this.isUnmounted &&
      !this.altScreenActive &&
      this.displayCursor !== null &&
      this.options.stdout.isTTY
    ) {
      let u = this.frontFrame.cursor.x - this.displayCursor.x;
      let f = this.frontFrame.cursor.y - this.displayCursor.y;
      if (u !== 0 || f !== 0) writeSync(1, cursorMove(u, f));
      this.displayCursor = null;
    }
    this.isUnmounted = true;
    this.scheduleRender.cancel?.();
    this.unsubscribeTTYHandlers?.();
    let stdin = this.options.stdin;
    this.drainStdin();
    if (stdin.isTTY && stdin.isRaw) setRawModeSafe(stdin, false);
    for (let u of new Set([stdin, process.stdin])) {
      u.removeAllListeners("readable");
      u.removeAllListeners("data");
      u.removeAllListeners("keypress");
      u.pause();
      u.unref?.();
    }
  }
  writeBeforeExit = (n) => {
    if (this.options.stdout === process.stdout) writeSync(1, n);
    else this.options.stdout.write(n);
  };
  drainStdin() {
    let querier = this.appRef.current?.querier;
    let u = drainStdin(this.options.stdin, querier?.owed() ?? 0);
    if (querier && querier.owed() > 0)
      querier.resync({
        probe: false,
      });
    return u;
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
  setSearchHighlight(n) {
    if (this.searchHighlightQuery === n) return;
    this.searchHighlightQuery = n;
    this.scheduleRender();
  }
  scanElementSubtree(n) {
    if (!this.searchHighlightQuery || !n.yogaNode) return [];
    let width = Math.ceil(n.yogaNode.getComputedWidth());
    let height = Math.ceil(n.yogaNode.getComputedHeight());
    if (width <= 0 || height <= 0) return [];
    let elLeft = n.yogaNode.getComputedLeft();
    let elTop = n.yogaNode.getComputedTop();
    let screen = createScreen(width, height, this.stylePool, this.charPool, this.hyperlinkPool);
    let output = new Output({
      width,
      height,
      stylePool: this.stylePool,
      screen,
    });
    renderNodeToOutputAlias(n, output, createRenderState(), {
      offsetX: -elLeft,
      offsetY: -elTop,
      prevScreen: undefined,
    });
    let rendered = output.get();
    dropSubtreeCache(n);
    markDirty(n);
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
  subscribeToSelectionTakeDown(n) {
    return this.selectionTakeDown.subscribe(n);
  }
  notifySelectionTakeDown() {
    if (!this.altScreenActive || !hasSelection(this.selection)) return;
    this.selectionTakeDown.announce();
  }
  dispatchClick(n, u) {
    return this.dispatchMouseClick(n, u, false) !== "unhandled";
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
    let A = dispatchClick(this.rootNode, event);
    if (event.droppedAsStray) return "stray";
    if (A && event.endsClickChain) return "repeat";
    return A ? "handled" : "unhandled";
  }
  litWhereClicked(n, u, f) {
    if (u !== this.hoverCol || f !== this.hoverRow) return false;
    let m = n ?? undefined;
    while (m) {
      if (m.attributes.hoverIgnoresBlankCells && this.hoveredNodes.has(m)) return true;
      m = m.parentNode;
    }
    return false;
  }
  repaintAfterStaleAbsolutePaint(n) {
    if (!n.staleAbsolutePaint) return;
    this.prevFrameContaminated = true;
    this.scheduleRender();
  }
  dispatchHover(col, row) {
    if (!this.altScreenActive) return;
    let f = this.isHoverTracked() ? hyperlinkAt(this.frontFrame.screen, col, row) : undefined;
    let any = this.hoveredLinkSpans.some(
      (hoveredLinkSpan) =>
        hoveredLinkSpan.row === row && col >= hoveredLinkSpan.from && col <= hoveredLinkSpan.to,
    );
    if (f !== this.hoveredLink || (f !== undefined && !any)) {
      this.hoveredLink = f;
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
    let n = this.appRef.current;
    if (n !== null) {
      n.lastHoverCol = -1;
      n.lastHoverRow = -1;
      n.lastHoverOnTarget = false;
    }
  }
  followHover() {
    if (!this.altScreenActive || this.hoverCol < 0 || this.pacerNow() < this.hoverFollowHeldUntil) return;
    let n = dispatchHoverFollowsPaint(
      this.rootNode,
      this.hoverCol,
      this.hoverRow,
      this.hoveredNodes,
      this.frontFrame.screen,
    );
    this.hoverFollowStreak = n ? this.hoverFollowStreak + 1 : 0;
    if (this.hoverFollowStreak >= MAX_RESIZE_RETRIES) {
      this.hoverFollowStreak = 0;
      this.hoverFollowHeldUntil = this.pacerNow() + STDIN_RESUME_GAP_MS;
    }
  }
  handlePointerPress(col, row, button, m, p) {
    if (!this.altScreenActive) return false;
    this.releasePointerCapture(col, row, m, p, true);
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
      mods: m,
      fine: p,
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
  handlePointerRelease(n, u, f, m) {
    return this.releasePointerCapture(n, u, f, m, false);
  }
  handlePointerHover(col, row, f, m) {
    if (!this.altScreenActive) return false;
    this.releasePointerCapture(col, row, f, m, true);
    let pointerTarget = findPointerTarget(this.rootNode, col, row);
    if (!pointerTarget) return false;
    dispatchPointer(pointerTarget, {
      kind: "move",
      col,
      row,
      button: undefined,
      mods: f,
      fine: m,
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
  dispatchPasteEvent(n) {
    let u = this.focusManager.activeElement ?? this.rootNode;
    dispatcher.dispatchDiscrete(u, new PasteEvent(n));
  }
  dispatchWheelEvent = (n) => {
    if (this.pointerCapture) return;
    let u =
      n.col != null && n.row != null
        ? {
            col: n.col - 1,
            row: n.row - 1,
          }
        : null;
    let node = u ? hitTest(this.rootNode, u.col, u.row) : null;
    let p = (node && hasWheelHandler(node) ? node : null) ?? this.focusManager.activeElement ?? this.rootNode;
    let deltaY = n.name === "wheeldown" ? 1 : -1;
    dispatcher.dispatchContinuous(
      p,
      new WheelEvent(deltaY, {
        ctrl: n.ctrl,
        shift: n.shift,
        meta: n.meta || n.option,
        col: u?.col,
        row: u?.row,
      }),
    );
  };
  dispatchKeyboardEvent(parsedKey, u) {
    let activeElement = this.focusManager.activeElement;
    let m = activeElement ?? this.rootNode;
    let p = new KeyboardEvent(parsedKey, u);
    dispatcher.dispatchDiscrete(m, p);
    if (!p.defaultPrevented && parsedKey.name === "tab" && !parsedKey.ctrl && !parsedKey.meta)
      if (parsedKey.shift) this.focusManager.focusPrevious(this.rootNode);
      else this.focusManager.focusNext(this.rootNode);
    if (
      !p.defaultPrevented &&
      !p._isPropagationStopped() &&
      !p.didStopImmediatePropagation() &&
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
    return p.isReadAsEscapeThenKey;
  }
  getHyperlinkAt(col, row) {
    if (!this.altScreenActive) return;
    let screen = this.frontFrame.screen;
    return hyperlinkAt(screen, col, row) ?? findPlainTextUrl(screen, col, row);
  }
  onHyperlinkClick;
  openHyperlink(n) {
    this.onHyperlinkClick?.(n);
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
  writeRaw(n) {
    this.options.stdout.write(n);
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
  render(n) {
    if (this.ownTree)
      throw Error(
        "Ink: this root is drawn with Tree (tree() was called), so it can\u2019t be React\u2019s too",
      );
    this.renderCalled = true;
    this.currentNode = n;
    let u = jsxProd_default(App, {
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
            children: n,
          }),
        }),
      }),
    });
    reconcilerAlias.updateContainerSync(u, this.container, null, Bct);
    reconcilerAlias.flushSyncWork();
  }
  restoreConsolePatches() {
    this.restoreConsole?.();
    this.restoreConsole = undefined;
    this.restoreStderr?.();
    this.restoreStderr = undefined;
  }
  unmount(n) {
    if (this.isUnmounted) return;
    if (n instanceof Error) {
      this.exitError = n;
      this.hasExited = true;
      this.rejectExitPromise(n);
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
    reconcilerAlias.updateContainerSync(null, this.container, null, Bct);
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
  maybeResetPools(n) {
    let framesSinceCompact = n - this.lastPoolResetTime;
    if (!shouldCompactStylePool(framesSinceCompact, this.stylePool, this.lastStyleLiveSize)) return;
    this.lastPoolResetTime = n;
    this.resetPools();
  }
  resetPools() {
    let n = this.hyperlinkPool.size > STYLE_POOL_SOFT_LIMIT;
    let u = this.stylePool.needsCompaction(this.lastStyleLiveSize);
    if (!n && !u) return;
    if (n) this.hyperlinkPool = new HyperlinkPool();
    migrateScreenPools(
      this.frontFrame.screen,
      this.charPool,
      this.hyperlinkPool,
      u ? this.stylePool.compact() : undefined,
    );
    if (u) this.lastStyleLiveSize = this.stylePool.size;
    this.backFrame.screen.hyperlinkPool = this.hyperlinkPool;
    this.fullRepaintSentinelScreen = undefined;
  }
  patchConsole() {
    let con = console;
    let originals = {};
    let toDebug = (...args) => logForDebugging(`console.log: ${format(...args)}`);
    let toError =
      (g) =>
      (...args) =>
        logError(withTelemetryMessage(Error(`console.${g}: ${format(...args)}`), `console.${g} failed`));
    let p =
      (g) =>
      (...E) =>
        logForDebugging(`console.${g}: ${format(...E)}`, {
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
          ? (...E) =>
              logForDebugging(`console.error: ${format(...E)}`, {
                level: "error",
              })
          : p(m);
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
    let E;
    while ((E = stdin.read()) !== null) chunks.push(typeof E === "string" ? Buffer.from(E, "utf8") : E);
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
    for (let D = 0; D < 64;) {
      let nonBlocking = readNonBlocking(fd, buf);
      if (nonBlocking > 0) {
        let buffer = Buffer.from(buf.subarray(0, nonBlocking));
        chunks.push(buffer);
        remainingReplies -= countDa1Replies(buffer);
        D++;
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
  let u = node;
  while (u) {
    if (u._eventHandlers?.onWheel) return true;
    u = u.parentNode;
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
  return (p, g) =>
    isPlaced && p >= 0 && g >= 0 && p < columns && g < rows
      ? {
          row: pane.top + g + 1,
          column: pane.left + p + 1,
        }
      : undefined;
}
//@ chunk-bzr73sfg.js:378578-378648 affinity
function altScreenImagePlacer(columns, rows) {
  return (f, m) => (f >= 0 && m >= 0 && f < columns && m < rows ? cursorPosition(m + 1, f + 1) : undefined);
}
//@ chunk-bzr73sfg.js:378648-378840 sole-consumer
function mainScreenImagePlacer(frame, cursor, rows, scrolledOutRows) {
  let max = Math.max(frame.screen.height, frame.cursor.y + 1);
  let max_2 = Math.max(0, max - rows, scrolledOutRows);
  let min = Math.min(Math.max(cursor.y, max_2), max_2 + rows - 1);
  return (T, A) =>
    T < 0 || A < max_2 || A >= frame.screen.height ? undefined : `${DECRC}\r${cursorMove(T, A - min)}`;
}
export { getTerminalSize, drainStdin, Ink, restoreTerminalModes };
