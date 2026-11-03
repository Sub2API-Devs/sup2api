/**
 * ink/ink.tsx
 *
 * 并入已有模块：校验终端尺寸读数，异常值时回退或钳位并记录；生成恢复终端模式的转义序列（鼠标、扩展键、光标保存等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/ink.tsx
 * pieces: chunk-bzr73sfg.js (20)
 * attribution: placement 4, sole-consumer 2, fingerprint 5, layout 4, affinity 5
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
  ZUn,
} from "./termio/dec.js";
import {
  disableModifyOtherKeysSequence,
  popKittyKeyboardSequence,
  isProgressReportingAvailable,
  rZn,
  di,
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
import { EA, gk, isItermOrTmuxXtversion } from "./terminalCapabilities.js";
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
import { TerminalImageManager, DECRC } from "./_new/TerminalImageManager.js";
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
  oAi,
  endAnnouncementHold,
  startupQuietRemainingMs,
  Roo,
  lAi,
  dAi,
  takeAnnouncementHoldMs,
  rAi,
  aAi,
} from "../utils/accessibility/screenReader.js";
import { kc } from "../../vendor/auto-bind/index.js";
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
import { RenderDebugHud } from "./_new/RenderDebugHud.js";
import { emptyFrame, PasteEvent, WheelEvent } from "./frame.js";
import { LogUpdate, isFrameOverflowing } from "./log-update.js";
import { onExit } from "../../vendor/signal-exit/dist/mjs/index.js";
import {
  createNode,
  underlineHyperlinkAt,
  findOwnerChainAtRow,
  markDirty,
  isOverBlankCell,
  hyperlinkAt,
  ImperativeTree,
  removeChildAndCleanup,
} from "./dom.js";
import { Yoga, GRr } from "./components/ErrorBoundary.js";
import { FocusManager } from "./focus.js";
import { dispatcher, reconcilerAlias } from "./reconciler.js";
import { createRenderer } from "./renderer.js";
import { zc } from "../../vendor/yoga-layout/dist/src/generated/YGEnums.js";
import { Bct } from "../../vendor/lodash-es/uniqBy.js";
import { SGR_RESET } from "./termio/sgr.js";
import { getYogaCounters } from "../native-ts/yoga-layout/index.js";
import { ADs, CDs, Xh, RDs, kwo } from "./scrollConstants.js";
import { flushInteractionTime } from "../bootstrap/state.js";
import { applySearchHighlight } from "./searchHighlight.js";
import { applyPositionedHighlight, scanPositions } from "./render-to-screen.js";
import { optimize } from "./optimizer.js";
import { eraseViewportInPlace } from "./clearTerminal.js";
import { nQs } from "./terminalImages.js";
import { countDomNodes, countFibers } from "./_new/countDomNodes.js";
import {
  renderNodeToScreenReaderOutput,
  sanitizeForScreenReader,
  takeTranscriptFrontCut,
  screenReaderOffsetOf,
  renderNodeToOutputAlias,
} from "./render-to-screen-reader.js";
import { wrapAnsi } from "./wrapAnsi.js";
import { QWe } from "./layout/node.js";
import { bunStringWidth } from "./stringWidth.js";
import { countCharInString } from "../utils/stringUtils.js";
import { handleEPIPE } from "../utils/process.js";
import { logEvent } from "../services/analytics/index.js";
import { setRawModeSafe } from "./setRawModeSafe.js";
import { Output } from "./output.js";
import { createRenderState, dropSubtreeCache } from "./render-node-to-output.js";
import { colorize } from "../../vendor/es-toolkit/dist/server/colors/index.mjs";
import { hitTest, dispatchClick, dispatchHover, findSelectionScope } from "./hit-test.js";
import { ClickEvent, dispatchPointer } from "./events/click-event.js";
import { dispatchHoverFollowsPaint } from "./_new/dispatchHoverFollowsPaint.js";
import { findPointerTarget } from "./_new/findPointerTarget.js";
import { KeyboardEvent } from "./events/keyboard-event.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { App } from "./components/App.js";
import { TerminalWriteProvider } from "./useTerminalNotification.js";
import { OWED_REPLY_HOLD_MS } from "./terminalProbe.js";

//@ chunk-bzr73sfg.js:321779-321877 placement
function shouldCompactStylePool(framesSinceCompact, stylePool, liveStyles) {
  let p = stylePool.isNearCapacity ? 1000 : 30000;
  return framesSinceCompact > p && (framesSinceCompact > 300000 || stylePool.needsCompaction(liveStyles));
}
/**
 * 生成恢复终端模式的转义序列（鼠标、扩展键、光标保存等）。
 */
//@ chunk-bzr73sfg.js:321877-322260 placement
function restoreTerminalModes(modes, write) {
  let extraResets = [
      decreset(DEC.MOUSE_SGR_PIXELS),
      DISABLE_MOUSE_TRACKING,
      disableModifyOtherKeysSequence(),
      DFE,
      DISABLE_THEME_NOTIFY,
      DBP,
    ],
    m = modes.isSet("extendedKeys") && !modes.isSuspended,
    resetSeq = modes.resetAll(),
    seq =
      resetSeq +
      RESET_CHARSET +
      extraResets.filter((E) => !resetSeq.includes(E)).join("") +
      (m ? "" : popKittyKeyboardSequence()) +
      SHOW_CURSOR +
      "\x1B7" +
      RESET_SCROLL_REGION +
      "\x1B8" +
      (isProgressReportingAvailable() ? CLEAR_PROGRESS : "") +
      (isTabStatusEnabled() ? wrapForMultiplexer(CLEAR_TAB_STATUS) : "") +
      (EA().now("programStatus") ? rZn : "");
  try {
    write(seq);
  } catch (error) {
    if (isSyscallError(error))
      logForDebugging(`restoreTerminalModes write failed: ${error}`, { level: "error" });
    else throw error;
  }
}
//@ chunk-bzr73sfg.js:322757-322843 sole-consumer
function runSelectionTakeDown(n) {
  try {
    n();
  } catch (error) {
    isAbortError(error)
      ? logForDebugging(`selection take-down aborted: ${errorMessage(error)}`)
      : logError(error);
  }
}
//@ chunk-bzr73sfg.js:322843-322930 sole-consumer
function createSelectionTakeDownSignal() {
  let n = createSignal();
  return { subscribe: (u) => n.subscribe(() => runSelectionTakeDown(u)), announce: n.emit };
}
//@ chunk-bzr73sfg.js:322930-323156 fingerprint = ALT_SCREEN_ANCHOR_CURSOR (0.605)
var MAX_COLUMNS = 8192,
  FRAME_INTERVAL_MS = 16,
  MAX_FRAME_SKIP = 5,
  SLOW_FRAME_MS = 50,
  STYLE_COMPACT_FRAMES = 5,
  CURSOR_POSITION_QUERY = cursorPosition_2(),
  HIDDEN_CURSOR = Object.freeze({ x: 0, y: 0, visible: !1 }),
  ALT_SCREEN_ANCHOR_CURSOR = Object.freeze({ type: "stdout", content: CURSOR_HOME }),
  ALT_SCREEN_ANCHOR_HOME = Object.freeze({ type: "stdout", content: ERASE_SCREEN + CURSOR_HOME }),
  RESET_COLOR_255 = "\x1B]104;255\x07",
  RESIZE_SETTLE_MS = 2000,
  QUERY_TIMEOUT_MS = 2000,
  MAX_RESIZE_RETRIES = 4,
  STDIN_RESUME_GAP_MS = 1000;
//@ chunk-bzr73sfg.js:323156-323285 layout
function isGraphemeBoundary(text, index) {
  if (index <= 0) return !0;
  for (let f of getGraphemeSegmenter().segment(text)) {
    if (f.index === index) return !0;
    if (f.index > index) return !1;
  }
  return index >= text.length;
}
//@ chunk-bzr73sfg.js:323285-323354 fingerprint = CURSOR_HOME_PATCH (1)
function cursorToRow(row) {
  return Object.freeze({ type: "stdout", content: cursorPosition(row, 1) });
}
//@ chunk-bzr73sfg.js:323354-323377 layout
var MAX_TERMINAL_COLS = MAX_COLUMNS,
  MAX_TERMINAL_ROWS = 2048,
  MAX_ROWS_ALIAS = 3;
/**
 * 校验终端尺寸读数，异常值时回退或钳位并记录。
 */
//@ chunk-bzr73sfg.js:323377-323775 placement
function sanitizeWinsize(value, fallback, max, overflowPolicy, log) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 1) {
    if (value !== void 0 && value !== 0)
      log?.(
        `terminal winsize read returned a garbage dimension: ${String(value)} \u2014 falling back to ${fallback}`,
      );
    return fallback;
  }
  let floored = Math.floor(value);
  if (floored > max)
    return (
      log?.(
        `terminal winsize read returned an absurd dimension: ${String(value)} \u2014 ${overflowPolicy === "clamp" ? `clamping to ${max}` : `falling back to ${fallback}`}`,
      ),
      overflowPolicy === "clamp" ? max : fallback
    );
  return floored;
}
/**
 * 读终端尺寸，缺省 80×24，列上限 8192、行上限 2048。
 */
//@ chunk-bzr73sfg.js:323775-323868 placement = getTerminalSize (0.629)
function getTerminalSize(stream, log) {
  return {
    cols: sanitizeWinsize(stream.columns, 80, MAX_TERMINAL_COLS, "clamp", log),
    rows: sanitizeWinsize(stream.rows, 24, MAX_TERMINAL_ROWS, "clamp", log),
  };
}
/**
 * Ink 实例（每个 stdout 一个，见 root.ts 的实例表）：持有根 DOM 节点、FocusManager、React 容器（ConcurrentRoot）、样式/字符/超链接池、前后两帧（双缓冲）、LogUpdate、帧渲染函数、终端模式管理、终端图片管理、选区与搜索高亮状态。
 * 渲染节奏：React 提交后 resetAfterCommit → onComputeLayout（计算 yoga 布局、通知布局监听）→ onRender（scheduleFrame 按帧间隔节流，输入优先时缩短间隔；stdout 积压时暂缓）。onRender：renderer 生成新帧 → 叠加选区/搜索高亮/链接下划线 → LogUpdate.render 与前帧 diff → optimize → 加备用屏锚点、光标声明定位、iTerm2 图片 → writeDiffToTerminal（同步输出 DEC 2026 包裹）→ 交换前后帧、按需压缩池子、发 onFrame 统计。
 * 另有：备用屏进出（setAltScreenActive，保存主屏内容以便返回时擦除）、窗口尺寸变化、挂起/恢复、外部清屏探测、屏幕阅读器模式（onRenderScreenReader 输出线性文本 diff）、复制选区、指针捕获、console/stderr 劫持、交接终端给子进程（handoff）、退出时恢复终端模式。
 */
//@ chunk-bzr73sfg.js:323868-377361 fingerprint = Ink (0.459)
class Ink {
  options;
  log;
  terminal;
  scheduleRender;
  ownTree;
  isUnmounted = !1;
  layoutListeners = new Set();
  subscribeLayout = (n) => (
    this.layoutListeners.add(n),
    () => {
      this.layoutListeners.delete(n);
    }
  );
  hoverTrackedListeners = new Set();
  subscribeHoverTracked = (n) => (
    this.hoverTrackedListeners.add(n),
    () => {
      this.hoverTrackedListeners.delete(n);
    }
  );
  isHoverTracked = () => this.altScreenActive && this.altScreenMouseTracking === "full";
  layoutListenersPaused = !1;
  reportedLayoutListenerFault = !1;
  layoutListenerFaultDebugLines = 0;
  frameListeners = new Set();
  subscribeFrames = (n) => (
    this.frameListeners.add(n),
    () => {
      this.frameListeners.delete(n);
    }
  );
  tellFrameListeners() {
    for (let frameListener of this.frameListeners) frameListener();
  }
  clickListeners = new Set();
  subscribeClicks = (n) => (
    this.clickListeners.add(n),
    () => {
      this.clickListeners.delete(n);
    }
  );
  tellClickedNowhere() {
    let n = [...this.clickListeners];
    queueMicrotask(() => {
      for (let u of n) if (this.clickListeners.has(u)) u(null, null);
    });
  }
  finePointerHolds = 0;
  cancelFinePointerSettle = void 0;
  retainFinePointer = () => {
    (this.finePointerHolds++,
      (this.cancelFinePointerSettle ??= EA().onSettle("mousePixels", () => this.syncMousePixels())),
      this.syncMousePixels());
    let n = !0;
    return () => {
      if (!n) return;
      ((n = !1), this.finePointerHolds--, this.syncMousePixels());
    };
  };
  isPaused = !1;
  get isHandedOff() {
    return (
      this.isPaused || this.modes.isSuspended || (this.ownTree !== void 0 && di().has(this.options.stdout))
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
  hasExited = !1;
  exitError;
  restoreConsole;
  restoreStderr;
  nonBlockingStdout = null;
  terminalImages = new TerminalImageManager(() => this.scheduleRender());
  imagesStale = !1;
  appRef = a5o();
  unsubscribeTTYHandlers;
  terminalColumns;
  terminalRows;
  loggedGarbageWinsize = !1;
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
  frameMicrotaskQueued = !1;
  pacerNow = () => performance.now();
  inputPriorityUntil = 0;
  frameHeldForBacklog = !1;
  lastYogaCounters = { ms: 0, visited: 0, measured: 0, cacheHits: 0, live: 0 };
  layoutFailed = !1;
  consecutiveLayoutFailures = 0;
  layoutFaultDebugLines = 0;
  reportedLayoutFaultMessages = new Set();
  reportedLayoutFaultRecovered = !1;
  reportedLayoutFaultDropped = !1;
  reportedLayoutFaultPersisting = !1;
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
  hasRendered = !1;
  renderCalled = !1;
  isExiting = !1;
  altScreenActive = !1;
  _handoffRawMode = !1;
  altScreenMouseTracking = "off";
  mainScreenBehindAlt;
  modes = new TerminalModes();
  prevFrameContaminated = !1;
  prevOverlaySig = "";
  needsEraseBeforePaint = !1;
  keptForNextFrame = "";
  leftAltScreenSinceFrame = !1;
  altScreenHandOverAsked = !1;
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
  prevScreenReaderPark = { row: 0, col: 0 };
  prevScreenReaderParkDeclared = !1;
  prevScreenReaderAnchor = "clean";
  srStartupQuietTimer = null;
  srPreParkTimer = null;
  srAnnouncementHoldTimer = null;
  srHeldAnnouncements = [];
  srRewriteHeldAnnouncement = oAi();
  srPreParked = !1;
  resetScreenReaderDiffState() {
    ((this.prevScreenReaderLines = []),
      (this.prevScreenReaderPark = { row: 0, col: 0 }),
      (this.prevScreenReaderParkDeclared = !1),
      (this.prevScreenReaderAnchor = "clean"),
      (this.srPreParked = !1));
  }
  constructor(n) {
    this.options = n;
    if (
      (kc(this),
      (this.accessibilityMode = env.CLAUDE_CODE_ACCESSIBILITY),
      (this.bgWorkerForceShowCursor =
        this.altScreenFullRepaint &&
        !this.options.nativeCursor &&
        env.CLAUDE_CODE_SESSION_KIND === "bg" &&
        getPlatform() === "windows"),
      (this.nativeCursorVisible = this.accessibilityMode),
      (this.liveCountsEnabled = env.CLAUDE_CODE_BENCH_LIVE_COUNTS),
      (this.isScreenReaderEnabled =
        n.isScreenReaderEnabled ?? (!!n.stdout.isTTY && isEnvTruthy(process.env.INK_SCREEN_READER))),
      this.options.patchConsole)
    )
      ((this.restoreConsole = this.patchConsole()), (this.restoreStderr = this.patchStderr()));
    if (
      ((this.terminal = {
        stdout: n.stdout,
        stderr: n.stderr,
        tolerateDeadStdout: env.CLAUDE_BG_BACKEND === "daemon",
        stdoutDead: !1,
      }),
      n.stdout === process.stdout &&
        (isNonBlockingStdoutInstalled() ||
          isNonBlockingStdoutEnabled({
            envOverride: env.CLAUDE_CODE_NONBLOCKING_STDOUT,
            isAnt: !1,
            remoteFlag: () => getFeatureValue_CACHED_MAY_BE_STALE("tengu_event_loop_stall", !1) === !0,
          })))
    )
      this.nonBlockingStdout = installNonBlockingStdout(this.handleStdoutBackpressure);
    if (n.stdout === process.stdout) {
      if (n.stdout.isTTY) n.stdout.write("\x1B7" + RESET_SCROLL_REGION + "\x1B8" + SHOW_CURSOR);
    }
    let { cols: cols, rows: rows } = getTerminalSize(n.stdout, this.warnGarbageWinsizeOnce);
    if (
      ((this.terminalColumns = cols),
      (this.terminalRows = rows),
      (this.altScreenParkPatch = cursorToRow(this.terminalRows)),
      (this.stylePool = new StylePool()),
      n.atlasRecorder)
    ) {
      let atlasRecorder = this.stylePool.atlasRecorder;
      ((atlasRecorder.recording = n.atlasRecorder.recording),
        (atlasRecorder.autoResetEnabled = n.atlasRecorder.autoResetEnabled));
    }
    ((this.renderDebug = new RenderDebugHud(this.stylePool)),
      (this.charPool = new CharPool()),
      (this.hyperlinkPool = new HyperlinkPool()),
      (this.frontFrame = emptyFrame(
        this.terminalRows,
        this.terminalColumns,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      )),
      (this.backFrame = emptyFrame(
        this.terminalRows,
        this.terminalColumns,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      )),
      (this.log = new LogUpdate({ isTTY: n.stdout.isTTY || !1, stylePool: this.stylePool })),
      (this.scheduleRender = Object.assign(() => this.scheduleFrame(), {
        cancel: () => this.cancelScheduledFrame(),
      })),
      (this.isUnmounted = !1),
      (this.unsubscribeExit = onExit(this.unmount, { alwaysLast: !1 })),
      (this.rootNode = createNode("ink-root", Yoga.Config.create())),
      (this.focusManager = new FocusManager((m, p) => dispatcher.dispatchDiscrete(m, p))),
      (this.rootNode.focusManager = this.focusManager),
      (this.rootNode.debugRepaints = env.CLAUDE_CODE_DEBUG_REPAINTS),
      (this.renderer = createRenderer(this.rootNode, this.stylePool)),
      (this.rootNode.onRender = this.scheduleRender),
      (this.rootNode.onImmediateRender = this.onRender),
      (this.rootNode.onComputeLayout = () => {
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
      }),
      (this.container = reconcilerAlias.createContainer(
        this.rootNode,
        zc,
        null,
        !1,
        null,
        "id",
        Bct,
        Bct,
        Bct,
        Bct,
      )));
  }
  handleResume = () => {
    if ((this.forgetPointer(), !this.options.stdout.isTTY)) return;
    if ((process.kill(process.pid, "SIGWINCH"), this.altScreenActive)) {
      if (this.modes.isSuspended) {
        (this.resetFramesForAltScreen(), (this.imagesStale = !0), this.scheduleRender());
        return;
      }
      this.reenterAltScreen();
      return;
    }
    ((this.mainScreenBehindAlt = void 0),
      (this.frontFrame = emptyFrame(
        this.frontFrame.viewport.height,
        this.frontFrame.viewport.width,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      )),
      (this.backFrame = emptyFrame(
        this.backFrame.viewport.height,
        this.backFrame.viewport.width,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      )),
      this.log.reset(),
      (this.prevFrameContaminated = !0),
      (this.imagesStale = !0),
      (this.displayCursor = null),
      (this.nativeCursorVisible = this.accessibilityMode),
      this.resetScreenReaderDiffState(),
      this.scheduleRender());
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
    ((this.loggedGarbageWinsize = !0), logForDebugging(n, { level: "warn" }));
  }
  hasStaleTerminalSize() {
    let { columns: columns, rows: rows } = this.stdoutSize();
    return columns !== this.terminalColumns || rows !== this.terminalRows;
  }
  syncTerminalSize() {
    if (!this.hasStaleTerminalSize()) return !1;
    let { columns: columns, rows: rows } = this.stdoutSize();
    if (
      ((this.terminalColumns = columns),
      (this.terminalRows = rows),
      (this.altScreenParkPatch = cursorToRow(this.terminalRows)),
      this.resetScreenReaderDiffState(),
      this.altScreenActive && !this.isHandedOff && this.options.stdout.isTTY)
    ) {
      if (this.altScreenMouseTracking !== "off") this.options.stdout.write(this.mouseOnSeq());
      (this.resetFramesForAltScreen(), (this.needsEraseBeforePaint = !0));
    }
    return !0;
  }
  handleWinch = () => {
    this.appRef.current?.reprobeCellPixels();
  };
  handleResize = () => {
    if (!this.syncTerminalSize()) return;
    if (
      (this.appRef.current?.reprobeCellPixels(),
      this.appRef.current?.refreshTmuxPane(!1),
      this.currentNode !== null)
    ) {
      this.render(this.currentNode);
      return;
    }
    ((this.rootNode.layoutStale = !1), this.rootNode.onComputeLayout?.(), this.scheduleRender());
  };
  resolveExitPromise = () => {
    this.exitPromise ??= Promise.resolve();
  };
  rejectExitPromise = (n) => {
    if (this.exitPromise === void 0)
      ((this.exitPromise = Promise.reject(n)), this.exitPromise.catch(() => {}));
  };
  unsubscribeExit = () => {};
  enterAlternateScreen() {
    (this.pause(),
      this.forgetPointer(),
      this.options.stdout.write(
        this.modes.suspend("altScreen") +
          (this.altScreenActive ? "" : ENTER_ALT_SCREEN + popKittyKeyboardSequence()) +
          SGR_RESET +
          SHOW_CURSOR +
          ERASE_SCREEN +
          CURSOR_HOME,
      ),
      this.nonBlockingStdout?.flush(),
      this.suspendStdin());
  }
  exitAlternateScreen() {
    this.resumeStdin();
    let n = this.altScreenActive || !(this.accessibilityMode || this.isScreenReaderEnabled);
    if (
      (this.options.stdout.write(
        (this.altScreenActive ? "" : EXIT_ALT_SCREEN) +
          (n ? HIDE_CURSOR : "") +
          this.modes.resume({ clearKeys: !0 }) +
          (this.altScreenActive ? HIDE_CURSOR : ""),
      ),
      this.altScreenActive)
    )
      (this.resetFramesForAltScreen(), (this.imagesStale = !0));
    else if (!this.isScreenReaderEnabled)
      if (isFrameOverflowing(this.frontFrame))
        (this.log.forceFullReset(), (this.prevFrameContaminated = !0), (this.imagesStale = !0));
      else
        (this.options.stdout.write(eraseMainScreenFrame(this.frontFrame.cursor, this.displayCursor)),
          this.repaint());
    this.resume();
  }
  prepareTerminalForHandoff() {
    (this.pause(),
      this.forgetPointer(),
      this.options.stdout.write((this.altScreenMouseTracking !== "off" ? DISABLE_MOUSE_TRACKING : "") + DFE),
      this.nonBlockingStdout?.flush(),
      this.suspendStdin());
  }
  restoreTerminalAfterHandoff() {
    (this.resumeStdin(), this.options.stdout.write(this.mouseOnSeq() + EFE), this.resume());
  }
  ensureInteractive = () => {
    if (this.unsubscribeTTYHandlers || !this.options.stdout.isTTY) return;
    if (!this.accessibilityMode && !this.isScreenReaderEnabled) this.writeAfterKept(HIDE_CURSOR);
    (this.options.stdout.on("resize", this.handleResize),
      process.on("SIGCONT", this.handleResume),
      process.on("SIGWINCH", this.handleWinch),
      (this.unsubscribeTTYHandlers = () => {
        (this.options.stdout.off("resize", this.handleResize),
          process.off("SIGCONT", this.handleResume),
          process.off("SIGWINCH", this.handleWinch));
      }));
  };
  skipSyncMarkers() {
    if (!this.options.stdout.isTTY) return !0;
    if (!isSynchronizedOutputLikely()) return !0;
    if (!this.unsubscribeTTYHandlers) return !0;
    return !1;
  }
  notifyLayoutListeners() {
    if (this.layoutListenersPaused) return;
    for (let layoutListener of this.layoutListeners)
      try {
        layoutListener();
      } catch (error) {
        (this.pauseLayoutListeners(), this.reportLayoutListenerFault(Ink.describeLayoutFault(error)));
        return;
      }
  }
  pauseLayoutListeners() {
    ((this.layoutListenersPaused = !0),
      queueMicrotask(() => {
        this.layoutListenersPaused = !1;
      }));
  }
  reportLayoutListenerFault(n) {
    try {
      if ((this.reportLayoutFaultErrorOnce(n), !this.reportedLayoutListenerFault))
        ((this.reportedLayoutListenerFault = !0), this.reportLayoutListenersPaused());
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
        { level: "warn" },
      );
    } catch {}
  }
  runLayoutPass(n) {
    try {
      (this.calculateYogaLayout(n), (this.layoutFailed = !1), (this.consecutiveLayoutFailures = 0));
    } catch (error) {
      let relayoutFromScratch = this.relayoutFromScratch(n);
      ((this.layoutFailed = !relayoutFromScratch.recovered),
        (this.consecutiveLayoutFailures = relayoutFromScratch.recovered
          ? 0
          : this.consecutiveLayoutFailures + 1));
      let describeLayoutFault = Ink.describeLayoutFault(error),
        p = relayoutFromScratch.recovered ? void 0 : Ink.describeLayoutFault(relayoutFromScratch.retryFault);
      (this.reportLayoutFaultToErrorTracking(describeLayoutFault, p),
        this.logLayoutFaultForDebugging(describeLayoutFault, p));
    }
  }
  calculateYogaLayout(n) {
    let startTime = performance.now();
    if (this.options.stdout.isTTY || this.options.stdout.columns)
      (n.setWidth(this.terminalColumns), n.calculateLayout(this.terminalColumns));
    else if ((n.setWidthAuto(), n.calculateLayout(), n.getComputedWidth() > MAX_COLUMNS))
      (n.setWidth(MAX_COLUMNS), n.calculateLayout(MAX_COLUMNS));
    let f = performance.now() - startTime,
      m = getYogaCounters(n);
    this.lastYogaCounters = { ms: f, ...m };
  }
  relayoutFromScratch(n) {
    try {
      return (n.clearLayoutCacheRecursive(), this.calculateYogaLayout(n), { recovered: !0 });
    } catch (error) {
      try {
        n.clearLayoutCacheRecursive();
      } catch {}
      return { recovered: !1, retryFault: error };
    }
  }
  retryFailedLayout() {
    let yogaNode = this.rootNode.yogaNode;
    if (!yogaNode || !this.relayoutFromScratch(yogaNode).recovered) return !1;
    return ((this.layoutFailed = !1), (this.consecutiveLayoutFailures = 0), !0);
  }
  static describeLayoutFault(n) {
    try {
      let u = toError(n);
      if (typeof u.message === "string" && typeof u.name === "string") return u;
    } catch {}
    return new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "ink layout pass threw a value that cannot be described",
    );
  }
  reportLayoutFaultToErrorTracking(n, u) {
    try {
      if ((this.reportLayoutFaultErrorOnce(n), u === void 0)) {
        if (!this.reportedLayoutFaultRecovered)
          ((this.reportedLayoutFaultRecovered = !0), this.reportLayoutFaultRecovered());
        return;
      }
      if ((this.reportLayoutFaultErrorOnce(u), !this.reportedLayoutFaultDropped))
        ((this.reportedLayoutFaultDropped = !0), this.reportLayoutFaultDropped());
      if (!this.reportedLayoutFaultPersisting && this.consecutiveLayoutFailures >= SLOW_FRAME_MS)
        ((this.reportedLayoutFaultPersisting = !0), this.reportLayoutFaultPersisting());
    } catch {}
  }
  reportLayoutFaultErrorOnce(n) {
    let reportedLayoutFaultMessages = this.reportedLayoutFaultMessages;
    if (reportedLayoutFaultMessages.has(n.message) || reportedLayoutFaultMessages.size >= FRAME_INTERVAL_MS)
      return;
    (reportedLayoutFaultMessages.add(n.message), logError(n));
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
          u === void 0
            ? "recovered by immediate re-layout"
            : `immediate re-layout also threw (${u.name}: ${u.message}); frame dropped`,
        m =
          this.layoutFaultDebugLines >= MAX_FRAME_SKIP
            ? " \u2014 further layout faults in this session are not logged"
            : "";
      logForDebugging(`ink layout pass threw (${f}): ${n.name}: ${n.message}${m}`, { level: "warn" });
    } catch {}
  }
  requestInputPriorityFrame = () => {
    this.inputPriorityUntil = this.pacerNow() + ADs;
    let n = !1;
    if (this.srAnnouncementHoldTimer !== null) (endAnnouncementHold(), (n = !0));
    if (this.isScreenReaderEnabled && this.srHeldAnnouncements.length > 0)
      ((this.srHeldAnnouncements = []), (n = !0));
    if (n) this.onRender();
  };
  scheduleFrame() {
    if (this.frameMicrotaskQueued) return;
    let pacerNow = this.pacerNow(),
      u = pacerNow - this.lastPacedFrameAt,
      f = pacerNow < this.inputPriorityUntil ? CDs : Xh;
    if (u >= f) {
      this.queuePacedFrame();
      return;
    }
    let m = this.lastPacedFrameAt + f;
    if (this.frameTimer === null || m < this.frameTimerDueAt)
      (this.cancelScheduledFrame(),
        (this.frameTimerDueAt = m),
        (this.frameTimer = setTimeout(
          () => {
            ((this.frameTimer = null), this.queuePacedFrame());
          },
          Math.max(0, m - pacerNow),
        )));
  }
  queuePacedFrame() {
    if (
      (this.cancelScheduledFrame(),
      this.nonBlockingStdout !== null && this.nonBlockingStdout.queuedBytes() > RDs)
    ) {
      ((this.frameHeldForBacklog = !0),
        (this.frameTimerDueAt = this.pacerNow() + kwo),
        (this.frameTimer = setTimeout(() => {
          ((this.frameTimer = null), this.queuePacedFrame());
        }, kwo)));
      return;
    }
    ((this.frameHeldForBacklog = !1),
      (this.frameMicrotaskQueued = !0),
      (this.inputPriorityUntil = 0),
      (this.lastPacedFrameAt = this.pacerNow()),
      queueMicrotask(() => {
        ((this.frameMicrotaskQueued = !1), this.onRender());
      }));
  }
  cancelScheduledFrame() {
    if (this.frameTimer !== null) (clearTimeout(this.frameTimer), (this.frameTimer = null));
  }
  onRender() {
    if (this.isUnmounted || this.isHandedOff) return;
    if (this.hasRendered && !this.isExiting) this.ensureInteractive();
    if (((this.hasRendered = !0), this.drainTimer !== null))
      (clearTimeout(this.drainTimer), (this.drainTimer = null));
    if (this.rootNode.layoutStale) {
      if (((this.rootNode.layoutStale = !1), this.options.stdout.isTTY && this.hasStaleTerminalSize()))
        this.handleResize();
      else (this.rootNode.onComputeLayout?.(), reconcilerAlias.flushSyncWork());
      if (this.isUnmounted || this.isHandedOff) return;
    }
    if ((flushInteractionTime(), this.isScreenReaderEnabled)) {
      (this.writeKeptForNextFrame(), (this.leftAltScreenSinceFrame = !1), this.onRenderScreenReader());
      return;
    }
    if (this.layoutFailed && !this.retryFailedLayout()) return;
    let startTime = performance.now(),
      { columns: columns, rows: rows } = this.stdoutSize(),
      { anchor: anchor, focus: focus } = this.selection,
      searchPositions = this.searchPositions,
      E = `${anchor?.row},${anchor?.col},${focus?.row},${focus?.col}|${this.searchHighlightQuery}|${searchPositions?.currentIdx},${searchPositions?.rowOffset},${searchPositions?.positions.length}`,
      T = this.prevFrameContaminated || E !== this.prevOverlaySig || this.hoveredLinkSpans.length > 0;
    if (((this.prevOverlaySig = E), this.imagesStale))
      ((this.imagesStale = !1), this.terminalImages.retransmitAll());
    let A = env.TMUX ? gk().tmuxPane : void 0,
      D = A !== void 0 && A.passthrough !== "off";
    this.terminalImages.isTmuxPassthrough = D;
    let O =
        (anchor !== null && focus !== null && !isSelectionFullyOffscreen(this.selection)) ||
        !!this.searchHighlightQuery ||
        !!searchPositions,
      renderer = this.renderer({
        frontFrame: this.frontFrame,
        backFrame: this.backFrame,
        isTTY: this.options.stdout.isTTY,
        terminalWidth: columns,
        terminalRows: rows,
        altScreen: this.altScreenActive,
        prevFrameContaminated: T,
        overlayActive: O,
      }),
      U = performance.now() - startTime;
    if (this.frameSink) {
      let Ce = this.altScreenActive ? "" : this.terminalImages.drain();
      if (Ce !== "") this.writeContent(Ce);
      let frameSink = this.frameSink(renderer, this.stylePool);
      if (frameSink) {
        if (
          ((this.leftAltScreenSinceFrame = !1),
          (this.backFrame = this.frontFrame),
          (this.frontFrame = renderer),
          (this.prevFrameContaminated = !1),
          (this.mainScreenBehindAlt = void 0),
          this.repaintAfterStaleAbsolutePaint(renderer),
          this.maybeResetPools(startTime),
          frameSink === "tick")
        )
          this.drainTimer = setTimeout(() => this.onRender(), Xh >> 2);
        (this.tellFrameListeners(),
          this.options.onFrame?.({ durationMs: performance.now() - startTime, flickers: [] }));
        return;
      }
    }
    let L = renderer.followScroll ?? null;
    if (
      L &&
      this.selection.anchor &&
      this.selection.anchor.row >= L.viewportTop &&
      this.selection.anchor.row <= L.viewportBottom &&
      (this.selection.virtualAnchorCol ?? this.selection.anchor.col) >= L.viewportLeft &&
      (this.selection.virtualAnchorCol ?? this.selection.anchor.col) <= L.viewportRight
    ) {
      let { delta: delta, viewportTop: viewportTop, viewportBottom: viewportBottom } = L,
        Pe = delta > 0 ? viewportTop : viewportBottom + delta + 1,
        Ze = delta > 0 ? viewportTop + delta - 1 : viewportBottom,
        it = delta > 0 ? "above" : "below";
      if (this.selection.isDragging) {
        if (hasSelection(this.selection))
          captureScrolledRows(this.selection, this.frontFrame.screen, Pe, Ze, it);
        shiftAnchor(this.selection, -delta, viewportTop, viewportBottom);
      } else if (
        !this.selection.focus ||
        (this.selection.focus.row >= viewportTop &&
          this.selection.focus.row <= viewportBottom &&
          (this.selection.virtualFocusCol ?? this.selection.focus.col) >= L.viewportLeft &&
          (this.selection.virtualFocusCol ?? this.selection.focus.col) <= L.viewportRight)
      ) {
        if (hasSelection(this.selection))
          captureScrolledRows(this.selection, this.frontFrame.screen, Pe, Ze, it);
        shiftSelection(this.selection, -delta, viewportTop, viewportBottom, this.frontFrame.screen.width);
      }
    }
    let P = !1,
      z = !1;
    if (this.altScreenActive) {
      if (this.hoveredLink !== void 0 || this.hoveredLinkSpans.length > 0) {
        if (
          ((this.hoveredLinkSpans = underlineHyperlinkAt(
            renderer.screen,
            this.hoverCol,
            this.hoverRow,
            this.hoveredLink,
            this.stylePool,
          )),
          this.hoveredLinkSpans.length === 0)
        )
          this.hoveredLink = void 0;
      }
      if (((P = hasSelection(this.selection) && !isSelectionFullyOffscreen(this.selection)), P))
        applySelectionOverlay(renderer.screen, this.selection, this.stylePool);
      if (
        ((z = applySearchHighlight(renderer.screen, this.searchHighlightQuery, this.stylePool)),
        this.searchPositions)
      ) {
        let searchPositions = this.searchPositions,
          Te = applyPositionedHighlight(
            renderer.screen,
            this.stylePool,
            searchPositions.positions,
            searchPositions.rowOffset,
            searchPositions.currentIdx,
          );
        z = z || Te;
      }
    }
    if (renderer.layoutShifted || P || z || T || (this.altScreenFullRepaint && this.altScreenActive))
      renderer.screen.damage = { x: 0, y: 0, width: renderer.screen.width, height: renderer.screen.height };
    let G = this.altScreenActive ? void 0 : this.mainScreenBehindAlt;
    if (G !== void 0)
      ((this.mainScreenBehindAlt = void 0),
        (this.frontFrame = emptyFrame(
          G.viewport.height,
          G.viewport.width,
          this.stylePool,
          this.charPool,
          this.hyperlinkPool,
        )));
    let frontFrame = this.frontFrame;
    if (this.altScreenActive) {
      if (((frontFrame = { ...this.frontFrame, cursor: HIDDEN_CURSOR }), this.altScreenFullRepaint)) {
        let { width: width, height: height } = this.frontFrame.screen;
        if (
          this.fullRepaintSentinelScreen?.width !== width ||
          this.fullRepaintSentinelScreen.height !== height
        )
          ((this.fullRepaintSentinelScreen = createScreen(
            width,
            height,
            this.stylePool,
            this.charPool,
            this.hyperlinkPool,
          )),
            fillScreenWithSpacers(this.fullRepaintSentinelScreen));
        frontFrame = { ...frontFrame, screen: this.fullRepaintSentinelScreen };
      }
    }
    let startTime_2 = performance.now(),
      render = this.log.render(
        frontFrame,
        renderer,
        this.altScreenActive,
        DECSTBM_ENABLED &&
          !this.altScreenFullRepaint &&
          !this.skipSyncMarkers() &&
          isSynchronizedOutputSupported(),
      ),
      Y = performance.now() - startTime_2;
    ((this.backFrame = this.frontFrame), (this.frontFrame = renderer));
    let J = [];
    for (let Ce of render)
      if (Ce.type === "clearTerminal") {
        if (
          (J.push({
            desiredHeight: renderer.screen.height,
            availableHeight: renderer.viewport.height,
            reason: Ce.reason,
          }),
          this.rootNode.debugRepaints && Ce.debug)
        ) {
          let Te = findOwnerChainAtRow(this.rootNode, Ce.debug.triggerY);
          logForDebugging(
            `[REPAINT] full reset \xB7 ${Ce.reason} \xB7 row ${Ce.debug.triggerY}
  prev: "${Ce.debug.prevLine}"
  next: "${Ce.debug.nextLine}"
  culprit: ${Te.length ? Te.join(" < ") : "(no owner chain captured)"}`,
            { level: "warn" },
          );
        }
      }
    let startTime_3 = performance.now(),
      ee = optimize(render),
      ae = performance.now() - startTime_3,
      ne = ee.length > 0,
      any = render.some((Ce) => Ce.type === "clearTerminal");
    if (this.altScreenActive && ne) {
      if (this.needsEraseBeforePaint)
        ((this.needsEraseBeforePaint = !1),
          (any = !0),
          ee.unshift(
            isItermOrTmuxXtversion() && env.CLAUDE_BG_BACKEND !== "daemon"
              ? { type: "stdout", content: eraseViewportInPlace(rows) }
              : ALT_SCREEN_ANCHOR_HOME,
          ));
      else ee.unshift(ALT_SCREEN_ANCHOR_CURSOR);
      ee.push(this.altScreenParkPatch);
    }
    if (G !== void 0 && G.erase !== "") ee.unshift({ type: "stdout", content: G.erase });
    let cursorDeclaration = this.cursorDeclaration,
      ye = cursorDeclaration !== null ? cursorDeclaration.node.cachedLayout : void 0,
      ue =
        cursorDeclaration !== null && ye !== void 0
          ? { x: ye.x + cursorDeclaration.relativeX, y: ye.y + cursorDeclaration.relativeY }
          : null,
      displayCursor = this.displayCursor,
      pe = ue !== null && (displayCursor === null || displayCursor.x !== ue.x || displayCursor.y !== ue.y),
      Se =
        this.options.nativeCursor &&
        ue !== null &&
        cursorDeclaration !== null &&
        (cursorDeclaration.visible || this.accessibilityMode) !== this.nativeCursorVisible;
    if (ne || pe || Se || (ue === null && displayCursor !== null)) {
      let Ce = rows - 1,
        Te = (Ae) => Math.max(-Ce, Math.min(Ce, Ae));
      if (displayCursor !== null && !this.altScreenActive && ne) {
        let Ae = frontFrame.cursor.x - displayCursor.x,
          Pe = Te(frontFrame.cursor.y - displayCursor.y);
        if (Ae !== 0 || Pe !== 0) ee.unshift({ type: "stdout", content: cursorMove(Ae, Pe) });
      }
      if (ue !== null) {
        if (this.altScreenActive) {
          let min = Math.min(Math.max(ue.y + 1, 1), rows),
            min_2 = Math.min(Math.max(ue.x + 1, 1), columns);
          ee.push({ type: "stdout", content: cursorPosition(min, min_2) });
        } else {
          let Ae =
              !ne && displayCursor !== null ? displayCursor : { x: renderer.cursor.x, y: renderer.cursor.y },
            Pe = ue.x - Ae.x,
            Ze = Te(ue.y - Ae.y);
          if (Pe !== 0 || Ze !== 0) ee.push({ type: "stdout", content: cursorMove(Pe, Ze) });
        }
        if (
          ((this.displayCursor = { ...ue, emittedRows: rows }),
          this.options.nativeCursor || this.bgWorkerForceShowCursor)
        ) {
          let Ae =
            this.bgWorkerForceShowCursor ||
            (cursorDeclaration !== null && cursorDeclaration.visible) ||
            this.accessibilityMode;
          if (this.nativeCursorVisible) ee.unshift({ type: "cursorHide" });
          if (Ae) ee.push({ type: "cursorShow" });
          this.nativeCursorVisible = Ae;
        }
      } else {
        if (displayCursor !== null && !this.altScreenActive && !ne) {
          let Ae = renderer.cursor.x - displayCursor.x,
            Pe = Te(renderer.cursor.y - displayCursor.y);
          if (Ae !== 0 || Pe !== 0) ee.push({ type: "stdout", content: cursorMove(Ae, Pe) });
        }
        if (
          ((this.displayCursor = null),
          (this.options.nativeCursor || this.bgWorkerForceShowCursor) &&
            this.nativeCursorVisible &&
            !this.accessibilityMode)
        )
          (ee.unshift({ type: "cursorHide" }), (this.nativeCursorVisible = !1));
      }
    }
    if (ne) this.maybeProactiveAtlasReset(ee);
    let placeIterm = this.terminalImages.placeIterm(
      renderer.screen,
      any ? void 0 : frontFrame.screen,
      this.altScreenActive
        ? altScreenImagePlacer(columns, rows)
        : mainScreenImagePlacer(
            renderer,
            this.displayCursor ?? renderer.cursor,
            rows,
            this.log.scrolledOutRowsOf(renderer) ?? 0,
          ),
      D
        ? tmuxPanePlacer(A, this.altScreenActive && A.isPlaced && !gk().isTmuxPaneAsked, columns, rows)
        : void 0,
      nQs(D, gk().tmuxPaneAnsweredAt, performance.now()),
    );
    if (placeIterm !== "") ee.push({ type: "stdout", content: placeIterm });
    if (D && this.terminalImages.hasHeldDraw)
      queueMicrotask(() => this.appRef.current?.refreshTmuxPaneForPicture());
    let drain = this.terminalImages.drain();
    if (drain !== "") ee.unshift({ type: "stdout", content: drain });
    let startTime_4 = performance.now();
    ((this.leftAltScreenSinceFrame = !1),
      writeDiffToTerminal(
        this.terminal,
        ee,
        this.skipSyncMarkers() || (D && (this.terminalImages.size > 0 || drain !== "")),
        rows,
        this.takeKeptForNextFrame(),
      ));
    let we = performance.now() - startTime_4;
    if (
      (this.maybeResetPools(startTime),
      (this.prevFrameContaminated = !1),
      this.repaintAfterStaleAbsolutePaint(renderer),
      renderer.scrollDrainPending)
    )
      this.drainTimer = setTimeout(() => this.onRender(), Xh >> 2);
    let Fe = this.rootNode.lastCommitMs ?? 0,
      lastYogaCounters = this.lastYogaCounters;
    if (
      ((this.rootNode.lastCommitMs = 0),
      (this.rootNode.scrollCommitStartedAt = void 0),
      (this.lastYogaCounters = { ms: 0, visited: 0, measured: 0, cacheHits: 0, live: 0 }),
      ne || renderer.layoutShifted)
    )
      this.followHover();
    (this.tellFrameListeners(),
      this.options.onFrame?.({
        durationMs: performance.now() - startTime,
        phases: {
          renderer: U,
          diff: Y,
          optimize: ae,
          write: we,
          patches: render.length,
          yoga: lastYogaCounters.ms,
          commit: Fe,
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
        flickers: J,
        front: {
          screen: this.frontFrame.screen,
          altScreen: this.altScreenActive,
          viewport: this.frontFrame.viewport,
          cursor: this.frontFrame.cursor,
          parked: this.displayCursor,
        },
      }));
  }
  static LIVE_COUNTS_INTERVAL_MS = 100;
  liveCountsEnabled;
  lastLiveCountSampleAt = 0;
  shouldSampleLiveCounts() {
    let startTime = performance.now();
    if (startTime - this.lastLiveCountSampleAt < Ink.LIVE_COUNTS_INTERVAL_MS) return !1;
    return ((this.lastLiveCountSampleAt = startTime), !0);
  }
  onRenderScreenReader() {
    if (!this.isExiting) {
      let fe = startupQuietRemainingMs();
      if (fe > 0) {
        if (this.srStartupQuietTimer === null)
          this.srStartupQuietTimer = setTimeout(() => {
            ((this.srStartupQuietTimer = null), Roo(), this.onRender());
          }, fe);
        return;
      }
    }
    if (this.srPreParkTimer !== null) {
      if (!this.isExiting) return;
      (clearTimeout(this.srPreParkTimer), (this.srPreParkTimer = null));
    }
    if (this.srAnnouncementHoldTimer !== null) {
      if (lAi() && !this.isExiting) return;
      (clearTimeout(this.srAnnouncementHoldTimer), (this.srAnnouncementHoldTimer = null));
    }
    let {
        text: text,
        preserveRanges: preserveRanges,
        rowPrefixRanges: rowPrefixRanges,
      } = renderNodeToScreenReaderOutput(this.rootNode),
      { columns: columns } = this.stdoutSize(),
      p = [];
    for (let [fe, ge] of [...preserveRanges].sort((we, Fe) => we[0] - Fe[0])) {
      let at = p.at(-1);
      if (at !== void 0 && fe <= at[1]) at[1] = Math.max(at[1], ge);
      else p.push([fe, ge]);
    }
    let g =
        text === ""
          ? []
          : text.split(`
`),
      E = [],
      T = [],
      A = 0;
    for (let fe of g) {
      let ge = A + fe.length,
        Fe = A + fe.trimEnd().length < ge && p.some(([Ae, Pe]) => Ae < ge && ge <= Pe),
        Ne =
          rowPrefixRanges.find(([Ae, Pe]) => (fe === "" ? Ae <= A && A <= Pe : Ae < ge && A < Pe))?.[2] ?? "",
        Ce = columns - conservativeWidth(Ne) >= 2 ? Ne : "",
        trimEnd = Ce.trimEnd();
      if ((T.push(E.length), fe === "")) E.push(trimEnd);
      else {
        let Ae =
          Ne === "" || columns < 2
            ? wrapAnsi(fe, columns, { trim: !1, hard: !0 }).split(`
`)
            : wrapTextConservatively(QWe(fe), columns - conservativeWidth(Ce));
        for (let Pe = 0; Pe < Ae.length; Pe++) {
          let Ze = Ae[Pe],
            it = Fe && Pe === Ae.length - 1 ? Ze : Ze.trimEnd();
          E.push(it === "" ? trimEnd : Ce + it);
        }
      }
      A = ge + 1;
    }
    let screenReaderPark = this.computeScreenReaderPark(text, T, E, columns),
      O = -1,
      filtered = dAi()
        .map((fe) => sanitizeForScreenReader(fe))
        .filter((fe) => fe !== "");
    if (filtered.length > 0 || this.isExiting) this.srHeldAnnouncements = filtered;
    let U = E.length;
    for (let srHeldAnnouncement of this.srHeldAnnouncements)
      for (let ge of srHeldAnnouncement.split(`
`)) {
        if (O === -1 && filtered.length > 0) O = E.length;
        if (ge === "") E.push("");
        else {
          let we = wrapAnsi(ge, columns, { trim: !1, hard: !0 });
          for (let Fe of we.split(`
`))
            E.push(Fe.trimEnd());
        }
      }
    let L = takeAnnouncementHoldMs(),
      P = takeTranscriptFrontCut(this.rootNode);
    if (P !== null) this.applyTranscriptFrontCut(P, text, T, E);
    let prevScreenReaderLines = this.prevScreenReaderLines,
      G = E.length - U,
      X = G > Math.min(MAX_ROWS_ALIAS, Math.floor(this.terminalRows / 4));
    if (X) this.srHeldAnnouncements = [];
    if (
      filtered.length === 0 &&
      G > 0 &&
      (X ||
        (!this.srRewriteHeldAnnouncement &&
          (prevScreenReaderLines.length !== E.length ||
            E.some((fe, ge) => ge < U && fe !== prevScreenReaderLines[ge]))))
    )
      ((this.srHeldAnnouncements = []), (E.length = U));
    let max = Math.max(0, E.length - 1),
      q = screenReaderPark ?? { row: max, col: bunStringWidth(E[max] ?? "") },
      Y = 0,
      min = Math.min(prevScreenReaderLines.length, E.length);
    while (Y < min && prevScreenReaderLines[Y] === E[Y]) Y++;
    if (O !== -1 && Y > O) Y = O;
    let V = Y === prevScreenReaderLines.length && Y === E.length,
      prevScreenReaderPark = this.prevScreenReaderPark,
      ae = q.row === prevScreenReaderPark.row && q.col === prevScreenReaderPark.col;
    if (V && ae) {
      if (this.srPreParked) ((this.srPreParked = !1), this.options.stdout.write(cursorTo(q.col + 1)));
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
      let fe = !0;
      for (let Ne = Y + 1; Ne < prevScreenReaderLines.length; Ne++)
        if (prevScreenReaderLines[Ne] !== E[Ne]) {
          fe = !1;
          break;
        }
      let ge = fe ? E[Y].slice(prevScreenReaderLines[Y].length) : "",
        we = ge === "" ? 0 : bunStringWidth(prevScreenReaderLines[Y]);
      if (
        ge !== "" &&
        bunStringWidth(String.fromCodePoint(ge.codePointAt(0))) > 0 &&
        we + bunStringWidth(ge) === bunStringWidth(E[Y]) &&
        isGraphemeBoundary(E[Y], prevScreenReaderLines[Y].length)
      ) {
        let Ne =
            (Y !== prevScreenReaderPark.row ? cursorMove(0, Y - prevScreenReaderPark.row) : "") +
            cursorTo(we + 1),
          Ce = cursorTo(q.col + 1) + (q.row !== Y ? cursorMove(0, q.row - Y) : "");
        (this.writeContent(Ne + ge + Ce),
          (this.prevScreenReaderLines = E),
          (this.prevScreenReaderPark = q),
          (this.prevScreenReaderParkDeclared = screenReaderPark !== null));
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
      let fe = !0;
      for (let Ne = Y + 1; Ne < prevScreenReaderLines.length; Ne++)
        if (prevScreenReaderLines[Ne] !== E[Ne]) {
          fe = !1;
          break;
        }
      let ge = fe ? prevScreenReaderLines[Y].slice(E[Y].length) : "",
        we = ge === "" ? 0 : bunStringWidth(E[Y]);
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
        let Ne = cursorTo(we + 1),
          Ce = cursorTo(q.col + 1) + (q.row !== Y ? cursorMove(0, q.row - Y) : "");
        (this.writeContent(Ne + eraseToEndOfLine() + Ce),
          (this.prevScreenReaderLines = E),
          (this.prevScreenReaderPark = q),
          (this.prevScreenReaderParkDeclared = screenReaderPark !== null));
        return;
      }
    }
    if (!this.isExiting && !V && Y < E.length && O === -1 && !this.srPreParked) {
      let fe = rAi();
      if (fe > 0) {
        (this.options.stdout.write(CURSOR_LEFT),
          (this.srPreParked = !0),
          (this.srPreParkTimer = setTimeout(() => {
            ((this.srPreParkTimer = null), this.onRender());
          }, fe)));
        return;
      }
    }
    let max_2 = Math.max(0, prevScreenReaderLines.length - 1),
      de = prevScreenReaderPark.row !== max_2 ? cursorMove(0, max_2 - prevScreenReaderPark.row) : "",
      se = prevScreenReaderLines.length - this.terminalRows;
    if (se > Y && se < E.length) {
      let fe = Y,
        ge = Y;
      while (ge < se) {
        if (E[ge] === "") {
          ge++;
          continue;
        }
        while (fe < se && prevScreenReaderLines[fe] === "") fe++;
        if (fe === se || prevScreenReaderLines[fe] !== E[ge]) break;
        (fe++, ge++);
      }
      if (ge === se) Y = se;
    }
    let ye = Y === E.length && Y > 0,
      ue = se > Y || (ye && se === Y),
      ce = eraseLines(Math.min(prevScreenReaderLines.length - Y, this.terminalRows)),
      joined = E.slice(Y).join(`
`),
      Se;
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
    if ((this.writeContent(de + Se + xe), O !== -1 && L > 0 && !this.isExiting))
      (aAi(L),
        (this.srAnnouncementHoldTimer = setTimeout(() => {
          ((this.srAnnouncementHoldTimer = null), this.onRender());
        }, L)));
    if (
      ((this.prevScreenReaderLines = E),
      (this.prevScreenReaderPark = q),
      (this.prevScreenReaderParkDeclared = screenReaderPark !== null),
      (this.srPreParked = !1),
      !V)
    ) {
      let fe = E.length - Y,
        ge = q.row === E.length - 1,
        we = E.length < prevScreenReaderLines.length,
        Fe = prevScreenReaderLines.length <= this.terminalRows;
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
  applyTranscriptFrontCut(n, u, f, m) {
    if (this.prevScreenReaderAnchor !== "clean") return;
    let prevScreenReaderLines = this.prevScreenReaderLines,
      prevScreenReaderPark = this.prevScreenReaderPark,
      E = prevScreenReaderLines.length - this.terminalRows;
    if (E <= 0) return;
    let T = screenReaderOffsetOf(this.rootNode, n);
    if (T === null) return;
    let A =
      f[
        countCharInString(
          u.slice(0, T),
          `
`,
        )
      ];
    if (A === void 0) return;
    for (let D = 1; A + D + 1 < E; D++) {
      let O = !0,
        _ = 0;
      for (let U = A + D + 1; U < E; U++) {
        let L = U - D;
        if (L >= m.length || prevScreenReaderLines[U] !== m[L]) {
          O = !1;
          break;
        }
        if (prevScreenReaderLines[U] !== "") _++;
      }
      if (!O || _ < this.terminalRows) continue;
      if (prevScreenReaderPark.row >= A && prevScreenReaderPark.row < A + D) return;
      if (
        ((this.prevScreenReaderLines = [
          ...prevScreenReaderLines.slice(0, A),
          m[A],
          ...prevScreenReaderLines.slice(A + D + 1),
        ]),
        prevScreenReaderPark.row >= A + D)
      )
        this.prevScreenReaderPark = { row: prevScreenReaderPark.row - D, col: prevScreenReaderPark.col };
      return;
    }
  }
  computeScreenReaderPark(n, u, f, m) {
    let cursorDeclaration = this.cursorDeclaration;
    if (cursorDeclaration === null) return null;
    let g = screenReaderOffsetOf(this.rootNode, cursorDeclaration.node);
    if (g === null) return null;
    let sliced = n.slice(0, g),
      A =
        countCharInString(
          sliced,
          `
`,
        ) + cursorDeclaration.relativeY;
    if (A < 0 || A >= u.length) return null;
    let D =
        sliced.lastIndexOf(`
`) + 1,
      _ =
        (cursorDeclaration.relativeY === 0 ? bunStringWidth(n.slice(D, g)) : 0) + cursorDeclaration.relativeX,
      U = m > 0 ? Math.floor(_ / m) : 0,
      min = Math.min(u[A] + U, f.length - 1),
      P = m > 0 ? _ % m : _;
    return { row: Math.max(0, min), col: Math.max(0, P) };
  }
  pause() {
    (reconcilerAlias.flushSyncFromReconciler(), this.onRender(), (this.isPaused = !0));
  }
  resume() {
    ((this.isPaused = !1), this.onRender());
  }
  repaint() {
    ((this.mainScreenBehindAlt = void 0),
      (this.frontFrame = emptyFrame(
        this.frontFrame.viewport.height,
        this.frontFrame.viewport.width,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      )),
      (this.backFrame = emptyFrame(
        this.backFrame.viewport.height,
        this.backFrame.viewport.width,
        this.stylePool,
        this.charPool,
        this.hyperlinkPool,
      )),
      this.log.reset(),
      (this.displayCursor = null),
      (this.prevFrameContaminated = !0),
      (this.imagesStale = !0),
      this.resetScreenReaderDiffState());
  }
  emitAtlasReset(n) {
    if (n) n.unshift({ type: "stdout", content: RESET_COLOR_255 });
    else this.options.stdout.write(RESET_COLOR_255);
    (this.stylePool.atlasRecorder.reset(), (this.lastAtlasResetAt = performance.now()));
  }
  maybeProactiveAtlasReset(n) {
    let atlasRecorder = this.stylePool.atlasRecorder;
    if (!atlasRecorder.autoResetEnabled) return;
    if (this.renderDebug.stressing) return;
    if (atlasRecorder.size < RESIZE_SETTLE_MS) return;
    if (!this.renderDebug.isBoxOpen() && performance.now() - this.lastAtlasResetAt < QUERY_TIMEOUT_MS) return;
    if (!isXtermJs()) return;
    (this.emitAtlasReset(n), atlasRecorder.recordProactiveReset("delta"));
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
    )
      (this.emitAtlasReset(), atlasRecorder.recordProactiveReset("focus"));
  }
  forceRedraw(n) {
    if (!this.options.stdout.isTTY || this.isUnmounted || this.isHandedOff) return !1;
    if (n?.flushReact) reconcilerAlias.flushSyncFromReconciler();
    if (isXtermJs()) this.emitAtlasReset();
    if (this.hasStaleTerminalSize()) return (this.handleResize(), !0);
    if (this.altScreenActive)
      ((this.needsEraseBeforePaint = !0),
        (this.displayCursor = null),
        this.resetFramesForAltScreen(),
        (this.imagesStale = !0));
    else (this.log.forceFullReset(), (this.prevFrameContaminated = !0), (this.imagesStale = !0));
    return (this.resetScreenReaderDiffState(), this.onRender(), !0);
  }
  async probeExternalClear(n) {
    if (!this.altScreenActive || this.isHandedOff || this.isUnmounted) return !1;
    let displayCursor = this.displayCursor;
    if (!displayCursor) return !1;
    let f = (g) => Math.min(Math.max(g.y + 1, 1), this.stdoutSize().rows, g.emittedRows);
    if (f(displayCursor) <= 1) return !1;
    let send = await n.send(CURSOR_POSITION_QUERY);
    if (send?.row !== 1) return !1;
    let displayCursor_2 = this.displayCursor;
    if (displayCursor_2 === null || f(displayCursor_2) <= 1) return !1;
    return (
      logForDebugging(
        `probeExternalClear: detected wipe (parked at y=${displayCursor_2.y}, sent at y=${displayCursor.y}, terminal reports row=1 col=${send.col})`,
      ),
      this.forceRedraw(),
      !0
    );
  }
  invalidatePrevFrame() {
    this.prevFrameContaminated = !0;
  }
  setAltScreenActive(n, u = "off") {
    if (!n) (this.writeKeptForNextFrame(), (this.leftAltScreenSinceFrame = !0));
    if (this.altScreenActive === n) return "";
    if (((this.altScreenActive = n), (this.altScreenMouseTracking = n ? u : "off"), !n))
      (this.forgetPointer(), (this.hoveredLinkSpans = []));
    if (
      (queueMicrotask(() => {
        if (this.isUnmounted) return;
        for (let hoverTrackedListener of this.hoverTrackedListeners) hoverTrackedListener();
      }),
      this.syncMousePixels(),
      n)
    ) {
      this.ensureInteractive();
      let f =
          this.isHandedOff || this.isScreenReaderEnabled || getPlatform() === "windows"
            ? void 0
            : (this.mainScreenBehindAlt ??
              (this.options.stdout.isTTY && this.frameSink === null && !isFrameOverflowing(this.frontFrame)
                ? {
                    viewport: this.frontFrame.viewport,
                    erase:
                      this.frontFrame.screen.height === 0 && this.displayCursor === null
                        ? ""
                        : eraseMainScreenFrame(this.frontFrame.cursor, this.displayCursor),
                  }
                : void 0)),
        stdoutSize = this.stdoutSize(),
        p = f?.viewport.width === stdoutSize.columns && f.viewport.height === stdoutSize.rows ? f : void 0;
      return (this.resetFramesForAltScreen(), (this.mainScreenBehindAlt = p), "");
    } else {
      (this.endPointerCapture(), this.tellClickedNowhere());
      let f = this.isHandedOff || this.isUnmounted ? void 0 : this.mainScreenBehindAlt;
      return (
        this.repaint(),
        (this.mainScreenBehindAlt = f),
        f === void 0 ? "" : cursorPosition(this.terminalRows, 1) + eraseLines(this.terminalRows)
      );
    }
  }
  get isAltScreenActive() {
    return this.altScreenActive;
  }
  keepForNextFrame(n) {
    if (this.leftAltScreenSinceFrame || this.isUnmounted) return !1;
    if (this.keptForNextFrame === "" && n !== "") setImmediate(this.writeKeptForNextFrame);
    return ((this.keptForNextFrame += n), !0);
  }
  keepAltScreenForNextScreen() {
    ((this.altScreenHandOverAsked = !0), setImmediate(this.forgetAltScreenHandOver));
  }
  forgetAltScreenHandOver = () => {
    this.altScreenHandOverAsked = !1;
  };
  holdAltScreenLeave(n) {
    if (!this.altScreenHandOverAsked || this.isUnmounted) return !1;
    return (
      (this.altScreenHandOverAsked = !1),
      this.clearTextSelection(),
      this.forgetPointer(),
      (this.hoveredLinkSpans = []),
      (this.heldAltScreenLeave = n),
      setImmediate(this.runHeldAltScreenLeave),
      !0
    );
  }
  claimHeldAltScreen() {
    let n = this.heldAltScreenLeave !== void 0;
    return ((this.heldAltScreenLeave = void 0), n);
  }
  runHeldAltScreenLeave = () => {
    let heldAltScreenLeave = this.heldAltScreenLeave;
    if (((this.heldAltScreenLeave = void 0), heldAltScreenLeave !== void 0))
      (heldAltScreenLeave(), this.forceRedraw());
  };
  takeKeptForNextFrame() {
    let keptForNextFrame = this.keptForNextFrame;
    return ((this.keptForNextFrame = ""), keptForNextFrame);
  }
  writeKeptForNextFrame = () => {
    let takeKeptForNextFrame = this.takeKeptForNextFrame();
    if (takeKeptForNextFrame !== "" && !this.isUnmounted) handleEPIPE(this.terminal, takeKeptForNextFrame);
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
    return { columns: this.terminalColumns, rows: this.terminalRows };
  }
  getMouseMode = () => this.altScreenMouseTracking;
  pixelReportsLive = !1;
  mouseReportsInPixels = () => this.pixelReportsLive;
  syncMousePixels = () => {
    if (this.isUnmounted) return;
    let n =
      this.finePointerHolds > 0 &&
      this.altScreenActive &&
      this.altScreenMouseTracking === "full" &&
      EA().now("mousePixels") &&
      gk().cellPixels !== void 0;
    if (n === this.modes.isSet("mousePixels")) return;
    let u = n ? this.modes.set("mousePixels") : this.modes.reset("mousePixels"),
      f = u !== "" && !this.isHandedOff;
    if (f) this.writeAfterKept(u);
    let m = this.appRef.current?.querier;
    if (f && m && this.holdsRawMode)
      m.flush().then(() => {
        this.pixelReportsLive = n;
      });
    else this.pixelReportsLive = n;
    logForDebugging(`Mouse reports in ${n ? "pixels" : "cells"}`);
  };
  mouseOnSeq() {
    return ZUn(this.altScreenMouseTracking) + this.modes.reassert("mousePixels");
  }
  handoffAltScreen() {
    ((this.isPaused = !0),
      (this.altScreenActive = !1),
      this.endPointerCapture(),
      this.tellClickedNowhere(),
      this.modes.reset("altScreen"),
      this.modes.reset("surface"));
  }
  get lastFrameFillsCurrentViewport() {
    let n = getTerminalSize(this.options.stdout, this.warnGarbageWinsizeOnce);
    return (
      this.frontFrame.screen.height > 0 &&
      isFrameOverflowing(this.frontFrame) &&
      this.frontFrame.viewport.height === n.rows &&
      this.frontFrame.viewport.width === n.cols
    );
  }
  handoffRawMode() {
    this._handoffRawMode = !0;
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
    return ((this.terminal.slowestWrite = void 0), slowestWrite);
  }
  writeContent(n) {
    handleEPIPE(this.terminal, n);
  }
  recordContentWrite = (n, u) => {
    recordSlowestWrite(this.terminal, n, u);
  };
  handleStdoutBackpressure = (n) => {
    if (n.droppedBytes > 0) {
      let u = n.endedBy === "drain";
      if ((this.appRef.current?.querier?.resync({ probe: u }), u))
        (this.reassertTerminalModes(), this.forceRedraw());
      else this.repaint();
    }
    if (this.frameHeldForBacklog && n.endedBy === "drain")
      ((this.frameHeldForBacklog = !1), this.scheduleFrame());
    if (n.droppedBytes > 0 || n.durationMs >= 1000)
      logEvent("tengu_stdout_backpressure", {
        duration_ms: n.durationMs,
        peak_queued_bytes: n.peakQueuedBytes,
        dropped_bytes: n.droppedBytes,
      });
  };
  reassertTerminalModes = (n = !1) => {
    if (!this.options.stdout.isTTY) return;
    if (this.isHandedOff || this.isUnmounted) return;
    if (
      (this.options.stdout.write(
        RESET_CHARSET +
          this.modes.reassert("bracketedPaste") +
          this.modes.reassert("extendedKeys") +
          this.modes.reassert("mouse") +
          this.modes.reassert("mousePixels"),
      ),
      n && this.altScreenActive)
    )
      this.reenterAltScreen();
  };
  detachForShutdown() {
    if (
      (this.nonBlockingStdout?.flush(),
      !this.isUnmounted && !this.altScreenActive && this.displayCursor !== null && this.options.stdout.isTTY)
    ) {
      let u = this.frontFrame.cursor.x - this.displayCursor.x,
        f = this.frontFrame.cursor.y - this.displayCursor.y;
      if (u !== 0 || f !== 0) writeSync(1, cursorMove(u, f));
      this.displayCursor = null;
    }
    ((this.isUnmounted = !0), this.scheduleRender.cancel?.(), this.unsubscribeTTYHandlers?.());
    let stdin = this.options.stdin;
    if ((this.drainStdin(), stdin.isTTY && stdin.isRaw)) setRawModeSafe(stdin, !1);
    for (let u of new Set([stdin, process.stdin]))
      (u.removeAllListeners("readable"),
        u.removeAllListeners("data"),
        u.removeAllListeners("keypress"),
        u.pause(),
        u.unref?.());
  }
  writeBeforeExit = (n) => {
    if (this.options.stdout === process.stdout) writeSync(1, n);
    else this.options.stdout.write(n);
  };
  drainStdin() {
    let n = this.appRef.current?.querier,
      u = drainStdin(this.options.stdin, n?.owed() ?? 0);
    if (n && n.owed() > 0) n.resync({ probe: !1 });
    return u;
  }
  reenterAltScreen() {
    (this.options.stdout.write(this.modes.reassertFrom("altScreen")),
      this.resetFramesForAltScreen(),
      (this.imagesStale = !0),
      this.onRender());
  }
  resetFramesForAltScreen() {
    let terminalRows = this.terminalRows,
      terminalColumns = this.terminalColumns,
      f = () => ({
        screen: createScreen(
          terminalColumns,
          terminalRows,
          this.stylePool,
          this.charPool,
          this.hyperlinkPool,
        ),
        viewport: { width: terminalColumns, height: terminalRows + 1 },
        cursor: { x: 0, y: 0, visible: !0 },
      });
    ((this.mainScreenBehindAlt = void 0),
      (this.frontFrame = f()),
      (this.backFrame = f()),
      this.log.reset(),
      (this.displayCursor = null),
      (this.prevFrameContaminated = !0));
  }
  getSelectedText() {
    if (!hasSelection(this.selection)) return "";
    return getSelectedText(this.selection, this.frontFrame.screen);
  }
  copySelectionNoClear() {
    let selectedText = this.getSelectedText();
    if (selectedText)
      setClipboard(selectedText).then((u) => {
        if (u) this.options.stdout.write(u);
      });
    return selectedText;
  }
  copySelection() {
    if (!hasSelection(this.selection)) return "";
    let copySelectionNoClear = this.copySelectionNoClear();
    return (
      this.notifySelectionTakeDown(),
      clearSelection(this.selection),
      this.notifySelectionChange(),
      copySelectionNoClear
    );
  }
  clearTextSelection() {
    if (!hasSelection(this.selection)) return;
    (this.notifySelectionTakeDown(), clearSelection(this.selection), this.notifySelectionChange());
  }
  setSearchHighlight(n) {
    if (this.searchHighlightQuery === n) return;
    ((this.searchHighlightQuery = n), this.scheduleRender());
  }
  scanElementSubtree(n) {
    if (!this.searchHighlightQuery || !n.yogaNode) return [];
    let ceil = Math.ceil(n.yogaNode.getComputedWidth()),
      ceil_2 = Math.ceil(n.yogaNode.getComputedHeight());
    if (ceil <= 0 || ceil_2 <= 0) return [];
    let computedLeft = n.yogaNode.getComputedLeft(),
      computedTop = n.yogaNode.getComputedTop(),
      g = createScreen(ceil, ceil_2, this.stylePool, this.charPool, this.hyperlinkPool),
      E = new Output({ width: ceil, height: ceil_2, stylePool: this.stylePool, screen: g });
    renderNodeToOutputAlias(n, E, createRenderState(), {
      offsetX: -computedLeft,
      offsetY: -computedTop,
      prevScreen: void 0,
    });
    let T = E.get();
    (dropSubtreeCache(n), markDirty(n));
    let A = scanPositions(T, this.searchHighlightQuery);
    return (
      logForDebugging(
        `scanElementSubtree: q='${this.searchHighlightQuery}' el=${ceil}x${ceil_2}@(${computedLeft},${computedTop}) n=${A.length} [${A.slice(
          0,
          10,
        )
          .map((D) => `${D.row}:${D.col}`)
          .join(",")}${A.length > 10 ? ",\u2026" : ""}]`,
      ),
      A
    );
  }
  setSearchPositions(n) {
    ((this.searchPositions = n), this.scheduleRender());
  }
  setSelectionBgColor(n) {
    let u = colorize("\x00", n, "background"),
      index = u.indexOf("\x00");
    if (index <= 0 || index === u.length - 1) {
      this.stylePool.setSelectionBg(null);
      return;
    }
    this.stylePool.setSelectionBg({ type: "ansi", code: u.slice(0, index), endCode: u.slice(index + 1) });
  }
  moveSelectionFocus(n) {
    if (!this.altScreenActive) return;
    let { focus: focus, scope: scope } = this.selection;
    if (!focus) return;
    let { width: width, height: height } = this.frontFrame.screen,
      g = scope ? scope.x1 : 0,
      E = (scope ? Math.min(scope.x2, width) : width) - 1,
      T = height - 1,
      { col: col, row: row } = focus;
    switch (n) {
      case "left":
        if (col > g) col--;
        else if (row > 0) ((col = E), row--);
        break;
      case "right":
        if (col < E) col++;
        else if (row < T) ((col = g), row++);
        break;
      case "up":
        if (row > 0) row--;
        break;
      case "down":
        if (row < T) row++;
        break;
      case "lineStart":
        col = g;
        break;
      case "lineEnd":
        col = E;
        break;
    }
    if (col === focus.col && row === focus.row) return;
    (moveFocus(this.selection, col, row), this.notifySelectionChange());
  }
  hasTextSelection() {
    return hasSelection(this.selection);
  }
  subscribeToSelectionChange(n) {
    return (this.selectionListeners.add(n), () => this.selectionListeners.delete(n));
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
    return this.dispatchMouseClick(n, u, !1) !== "unhandled";
  }
  dispatchMouseClick(n, u, f, m) {
    if (!this.altScreenActive) return "unhandled";
    let p = hitTest(this.rootNode, n, u),
      g = isOverBlankCell(this.rootNode, this.frontFrame.screen, p, n, u) && !this.litWhereClicked(p, n, u),
      hyperlinkAt = this.getHyperlinkAt(n, u),
      T = new ClickEvent(n, u, g, hyperlinkAt, f, m);
    for (let clickListener of this.clickListeners) clickListener(p, T);
    let A = dispatchClick(this.rootNode, T);
    if (T.droppedAsStray) return "stray";
    if (A && T.endsClickChain) return "repeat";
    return A ? "handled" : "unhandled";
  }
  litWhereClicked(n, u, f) {
    if (u !== this.hoverCol || f !== this.hoverRow) return !1;
    let m = n ?? void 0;
    while (m) {
      if (m.attributes.hoverIgnoresBlankCells && this.hoveredNodes.has(m)) return !0;
      m = m.parentNode;
    }
    return !1;
  }
  repaintAfterStaleAbsolutePaint(n) {
    if (!n.staleAbsolutePaint) return;
    ((this.prevFrameContaminated = !0), this.scheduleRender());
  }
  dispatchHover(n, u) {
    if (!this.altScreenActive) return;
    let f = this.isHoverTracked() ? hyperlinkAt(this.frontFrame.screen, n, u) : void 0,
      any = this.hoveredLinkSpans.some(
        (hoveredLinkSpan) =>
          hoveredLinkSpan.row === u && n >= hoveredLinkSpan.from && n <= hoveredLinkSpan.to,
      );
    if (f !== this.hoveredLink || (f !== void 0 && !any)) ((this.hoveredLink = f), this.scheduleRender());
    ((this.hoverCol = n),
      (this.hoverRow = u),
      (this.hoverFollowStreak = 0),
      (this.hoverFollowHeldUntil = 0),
      dispatchHover(this.rootNode, n, u, this.hoveredNodes, this.frontFrame.screen));
  }
  forgetPointer() {
    if (
      ((this.hoverCol = -1),
      (this.hoverRow = -1),
      (this.hoverFollowStreak = 0),
      (this.hoverFollowHeldUntil = 0),
      this.hoveredLink !== void 0)
    )
      ((this.hoveredLink = void 0), this.scheduleRender());
    let n = this.appRef.current;
    if (n !== null) ((n.lastHoverCol = -1), (n.lastHoverRow = -1), (n.lastHoverOnTarget = !1));
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
    if (
      ((this.hoverFollowStreak = n ? this.hoverFollowStreak + 1 : 0),
      this.hoverFollowStreak >= MAX_RESIZE_RETRIES)
    )
      ((this.hoverFollowStreak = 0), (this.hoverFollowHeldUntil = this.pacerNow() + STDIN_RESUME_GAP_MS));
  }
  handlePointerPress(n, u, f, m, p) {
    if (!this.altScreenActive) return !1;
    this.releasePointerCapture(n, u, m, p, !0);
    let g = findPointerTarget(this.rootNode, n, u);
    if (!g) return !1;
    return (
      (this.pointerCapture = { node: g, button: f, col: n, row: u }),
      dispatchPointer(g, { kind: "down", col: n, row: u, button: f, mods: m, fine: p }),
      !0
    );
  }
  handlePointerDrag(n, u, f, m) {
    let pointerCapture = this.pointerCapture;
    if (!pointerCapture) return !1;
    return (
      (pointerCapture.col = n),
      (pointerCapture.row = u),
      dispatchPointer(pointerCapture.node, {
        kind: "move",
        col: n,
        row: u,
        button: pointerCapture.button,
        mods: f,
        fine: m,
      }),
      !0
    );
  }
  handlePointerRelease(n, u, f, m) {
    return this.releasePointerCapture(n, u, f, m, !1);
  }
  handlePointerHover(n, u, f, m) {
    if (!this.altScreenActive) return !1;
    this.releasePointerCapture(n, u, f, m, !0);
    let p = findPointerTarget(this.rootNode, n, u);
    if (!p) return !1;
    return (dispatchPointer(p, { kind: "move", col: n, row: u, button: void 0, mods: f, fine: m }), !0);
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
        { shift: !1, alt: !1, ctrl: !1 },
        void 0,
        !0,
      );
  }
  releasePointerCapture(n, u, f, m, p) {
    let pointerCapture = this.pointerCapture;
    if (!pointerCapture) return !1;
    return (
      (this.pointerCapture = null),
      dispatchPointer(pointerCapture.node, {
        kind: "up",
        col: n,
        row: u,
        button: pointerCapture.button,
        mods: f,
        fine: m,
        unreported: p,
      }),
      !0
    );
  }
  dispatchPasteEvent(n) {
    let u = this.focusManager.activeElement ?? this.rootNode;
    dispatcher.dispatchDiscrete(u, new PasteEvent(n));
  }
  dispatchWheelEvent = (n) => {
    if (this.pointerCapture) return;
    let u = n.col != null && n.row != null ? { col: n.col - 1, row: n.row - 1 } : null,
      f = u ? hitTest(this.rootNode, u.col, u.row) : null,
      p = (f && hasWheelHandler(f) ? f : null) ?? this.focusManager.activeElement ?? this.rootNode,
      g = n.name === "wheeldown" ? 1 : -1;
    dispatcher.dispatchContinuous(
      p,
      new WheelEvent(g, { ctrl: n.ctrl, shift: n.shift, meta: n.meta || n.option, col: u?.col, row: u?.row }),
    );
  };
  dispatchKeyboardEvent(n, u) {
    let activeElement = this.focusManager.activeElement,
      m = activeElement ?? this.rootNode,
      p = new KeyboardEvent(n, u);
    if ((dispatcher.dispatchDiscrete(m, p), !p.defaultPrevented && n.name === "tab" && !n.ctrl && !n.meta))
      if (n.shift) this.focusManager.focusPrevious(this.rootNode);
      else this.focusManager.focusNext(this.rootNode);
    if (
      !p.defaultPrevented &&
      !p._isPropagationStopped() &&
      !p.didStopImmediatePropagation() &&
      !n.ctrl &&
      !n.meta &&
      !n.option &&
      !n.shift &&
      activeElement &&
      this.focusManager.activeElement === activeElement &&
      (n.name === "up" || n.name === "down" || n.name === "left" || n.name === "right")
    ) {
      if (this.focusManager.focusDirection(n.name, this.rootNode))
        logEvent("tengu_spatial_focus_nav", { direction: fromEnum(n.name) });
    }
    return p.isReadAsEscapeThenKey;
  }
  getHyperlinkAt(n, u) {
    if (!this.altScreenActive) return;
    let screen = this.frontFrame.screen;
    return hyperlinkAt(screen, n, u) ?? findPlainTextUrl(screen, n, u);
  }
  onHyperlinkClick;
  openHyperlink(n) {
    this.onHyperlinkClick?.(n);
  }
  fileHyperlinkOpensInPanel;
  fileLinkOpensInPanel() {
    return this.fileHyperlinkOpensInPanel?.() === !0;
  }
  handleMultiClick(n, u, f) {
    if (!this.altScreenActive) return;
    let screen = this.frontFrame.screen;
    if (
      (this.notifySelectionTakeDown(),
      startSelection(this.selection, n, u, findSelectionScope(this.rootNode, n, u)),
      f === 2)
    )
      selectWordAt(this.selection, screen, n, u);
    else selectLineAt(this.selection, screen, u);
    if (!this.selection.focus) this.selection.focus = this.selection.anchor;
    this.notifySelectionChange();
  }
  handleSelectionStart(n, u) {
    (this.notifySelectionTakeDown(),
      startSelection(this.selection, n, u, findSelectionScope(this.rootNode, n, u)));
  }
  handleSelectionDrag(n, u) {
    if (!this.altScreenActive) return;
    let selection = this.selection;
    if (selection.anchorSpan) extendSelection(selection, this.frontFrame.screen, n, u);
    else updateSelection(selection, n, u);
    this.notifySelectionChange();
  }
  stdinListeners = [];
  wasRawMode = !1;
  suspendStdin() {
    let stdin = this.options.stdin;
    if (!stdin.isTTY) return;
    let listeners = stdin.listeners("readable");
    (logForDebugging(
      `[stdin] suspendStdin: removing ${listeners.length} readable listener(s), wasRawMode=${stdin.isRaw ?? !1}`,
    ),
      listeners.forEach((m) => {
        (this.stdinListeners.push({ event: "readable", listener: m }), stdin.removeListener("readable", m));
      }));
    let f = stdin;
    if (f.isRaw) {
      if ((this.appRef.current?.querier?.owed() ?? 0) > 0) this.drainStdin();
      (setRawModeSafe(f, !1), (this.wasRawMode = !0));
    }
  }
  resumeStdin() {
    let stdin = this.options.stdin;
    if (!stdin.isTTY) return;
    if (this.stdinListeners.length === 0 && !this.wasRawMode)
      logForDebugging(
        "[stdin] resumeStdin: called with no stored listeners and wasRawMode=false (possible desync)",
        { level: "warn" },
      );
    if (
      (logForDebugging(
        `[stdin] resumeStdin: re-attaching ${this.stdinListeners.length} listener(s), wasRawMode=${this.wasRawMode}`,
      ),
      this.stdinListeners.forEach(({ event: event, listener: listener }) => {
        stdin.addListener(event, listener);
      }),
      (this.stdinListeners = []),
      this.wasRawMode)
    )
      (setRawModeSafe(stdin, !0), (this.wasRawMode = !1));
  }
  writeRaw(n) {
    this.options.stdout.write(n);
  }
  setCursorDeclaration = (n, u) => {
    if (n === null && u !== void 0 && this.cursorDeclaration?.node !== u) return;
    this.cursorDeclaration = n;
  };
  takeBackTerminal() {
    if (this.isUnmounted || this.isHandedOff) return;
    (this.repaint(), this.onRender());
  }
  tree() {
    if (this.renderCalled)
      throw Error(
        "Ink: this root is React\u2019s (render() was called), so it can\u2019t be drawn with Tree too",
      );
    return (this.ensureInteractive(), (this.ownTree ??= new ImperativeTree(this.rootNode)), this.ownTree);
  }
  render(n) {
    if (this.ownTree)
      throw Error(
        "Ink: this root is drawn with Tree (tree() was called), so it can\u2019t be React\u2019s too",
      );
    ((this.renderCalled = !0), (this.currentNode = n));
    let u = e(App, {
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
      children: e(GRr.Provider, {
        value: this.isScreenReaderEnabled,
        children: e(TerminalWriteProvider, {
          value: this.writeRaw,
          children: e(TerminalModesContextAlias.Provider, { value: this.modes, children: n }),
        }),
      }),
    });
    (reconcilerAlias.updateContainerSync(u, this.container, null, Bct), reconcilerAlias.flushSyncWork());
  }
  restoreConsolePatches() {
    (this.restoreConsole?.(),
      (this.restoreConsole = void 0),
      this.restoreStderr?.(),
      (this.restoreStderr = void 0));
  }
  unmount(n) {
    if (this.isUnmounted) return;
    if (n instanceof Error) ((this.exitError = n), (this.hasExited = !0), this.rejectExitPromise(n));
    else ((this.hasExited = !0), this.resolveExitPromise());
    if (((this.isExiting = !0), this.srStartupQuietTimer !== null))
      (clearTimeout(this.srStartupQuietTimer), (this.srStartupQuietTimer = null));
    if (this.srPreParkTimer !== null) (clearTimeout(this.srPreParkTimer), (this.srPreParkTimer = null));
    if (this.srAnnouncementHoldTimer !== null)
      (clearTimeout(this.srAnnouncementHoldTimer), (this.srAnnouncementHoldTimer = null));
    if (
      (this.writeKeptForNextFrame(),
      this.onRender(),
      this.unsubscribeExit(),
      this.restoreConsolePatches(),
      this.unsubscribeTTYHandlers?.(),
      this.cancelFinePointerSettle?.(),
      this.renderCalled && !this.isHandedOff)
    ) {
      let renderPreviousOutput_DEPRECATED = this.log.renderPreviousOutput_DEPRECATED(this.frontFrame);
      writeDiffToTerminal(
        this.terminal,
        optimize(renderPreviousOutput_DEPRECATED),
        this.skipSyncMarkers(),
        this.stdoutSize().rows,
      );
    }
    if ((this.nonBlockingStdout?.flush(), this.options.stdout.isTTY))
      try {
        (restoreTerminalModes(this.modes, this.writeBeforeExit),
          (this.altScreenActive = !1),
          this.drainStdin());
      } catch (error) {
        if (isSyscallError(error))
          logForDebugging(`unmount terminal cleanup writeSync failed: ${error}`, { level: "error" });
        else throw error;
      }
    if (((this.isUnmounted = !0), this.scheduleRender.cancel?.(), this.drainTimer !== null))
      (clearTimeout(this.drainTimer), (this.drainTimer = null));
    if (
      (reconcilerAlias.updateContainerSync(null, this.container, null, Bct),
      reconcilerAlias.flushSyncWork(),
      this.ownTree)
    )
      for (let f of this.rootNode.childNodes.slice()) removeChildAndCleanup(this.rootNode, f);
    let u = di();
    if (u.treeRoots.get(this.options.stdout) === this) u.treeRoots.delete(this.options.stdout);
    if (u.get(this.options.stdout) === this)
      (u.delete(this.options.stdout), u.treeRoots.get(this.options.stdout)?.takeBackTerminal());
    (this.rootNode.yogaNode?.free(), (this.rootNode.yogaNode = void 0));
  }
  async waitUntilExit() {
    if (this.hasExited) {
      if (this.exitError) throw this.exitError;
      return;
    }
    return (
      (this.exitPromise ||= new Promise((n, u) => {
        ((this.resolveExitPromise = n), (this.rejectExitPromise = u));
      })),
      this.exitPromise
    );
  }
  maybeResetPools(n) {
    let u = n - this.lastPoolResetTime;
    if (!shouldCompactStylePool(u, this.stylePool, this.lastStyleLiveSize)) return;
    ((this.lastPoolResetTime = n), this.resetPools());
  }
  resetPools() {
    let n = this.hyperlinkPool.size > STYLE_POOL_SOFT_LIMIT,
      needsCompaction = this.stylePool.needsCompaction(this.lastStyleLiveSize);
    if (!n && !needsCompaction) return;
    if (n) this.hyperlinkPool = new HyperlinkPool();
    if (
      (migrateScreenPools(
        this.frontFrame.screen,
        this.charPool,
        this.hyperlinkPool,
        needsCompaction ? this.stylePool.compact() : void 0,
      ),
      needsCompaction)
    )
      this.lastStyleLiveSize = this.stylePool.size;
    ((this.backFrame.screen.hyperlinkPool = this.hyperlinkPool), (this.fullRepaintSentinelScreen = void 0));
  }
  patchConsole() {
    let n = console,
      u = {},
      f = (...g) => logForDebugging(`console.log: ${format(...g)}`),
      m =
        (g) =>
        (...E) =>
          logError(withTelemetryMessage(Error(`console.${g}: ${format(...E)}`), `console.${g} failed`)),
      p =
        (g) =>
        (...E) =>
          logForDebugging(`console.${g}: ${format(...E)}`, { level: "warn" });
    for (let g of CONSOLE_STDOUT_METHODS) ((u[g] = n[g]), (n[g] = f));
    for (let g of CONSOLE_STDERR_METHODS)
      ((u[g] = n[g]),
        (n[g] =
          g === "error"
            ? (...E) => logForDebugging(`console.error: ${format(...E)}`, { level: "error" })
            : p(g)));
    return (
      (u.assert = n.assert),
      (n.assert = (g, ...E) => {
        if (!g) m("assert")(...E);
      }),
      () => Object.assign(n, u)
    );
  }
  patchStderr() {
    let stderr = process.stderr,
      write = stderr.write,
      f = !1,
      m = (p, g, E) => {
        let T = typeof g === "function" ? g : E;
        if (f) {
          let A = typeof g === "string" ? g : void 0;
          return write.call(stderr, p, A, T);
        }
        f = !0;
        try {
          let A = typeof p === "string" ? p : Buffer.from(p).toString("utf8");
          if (
            (logForDebugging(`[stderr] ${A}`, { level: "warn" }),
            this.altScreenActive && !this.isUnmounted && !this.isHandedOff)
          )
            ((this.prevFrameContaminated = !0), this.scheduleRender());
        } finally {
          ((f = !1), T?.());
        }
        return !0;
      };
    return (
      (stderr.write = m),
      () => {
        if (stderr.write === m) stderr.write = write;
      }
    );
  }
}
/**
 * 退出或交接前把 stdin 里残留的终端应答读干净：临时进原始模式，以非阻塞方式打开 /dev/tty 读取（最多 64 块），直到读到预期数量的 DA1 应答或超时（250ms），避免应答字节泄漏到 shell。
 */
//@ chunk-bzr73sfg.js:377361-377981 fingerprint = drainStdin (0.771)
function drainStdin(stdin = process.stdin, expectedDa1Replies = 0) {
  if (!stdin.isTTY) return;
  let chunks = [];
  try {
    let E;
    while ((E = stdin.read()) !== null) chunks.push(typeof E === "string" ? Buffer.from(E, "utf8") : E);
  } catch {}
  let tty = stdin,
    wasRaw = tty.isRaw === !0,
    fd = -1;
  try {
    if (!wasRaw) tty.setRawMode?.(!0);
    fd = openSync("/dev/tty", constants.O_RDONLY | constants.O_NONBLOCK);
    let buf = Buffer.alloc(1024),
      deadline = expectedDa1Replies > 0 ? performance.now() + OWED_REPLY_HOLD_MS : 0,
      remainingReplies = expectedDa1Replies - countDa1Replies(Buffer.concat(chunks));
    for (let D = 0; D < 64;) {
      let O = readNonBlocking(fd, buf);
      if (O > 0) {
        let buffer = Buffer.from(buf.subarray(0, O));
        (chunks.push(buffer), (remainingReplies -= countDa1Replies(buffer)), D++);
        continue;
      }
      if (O < 0 || remainingReplies <= 0 || performance.now() >= deadline) break;
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
        tty.setRawMode?.(!1);
      } catch {}
  }
  return chunks.length ? Buffer.concat(chunks) : void 0;
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
  ],
  CONSOLE_STDERR_METHODS = ["warn", "error", "trace"];
//@ chunk-bzr73sfg.js:378316-378410 affinity
function hasWheelHandler(node) {
  let u = node;
  while (u) {
    if (u._eventHandlers?.onWheel) return !0;
    u = u.parentNode;
  }
  return !1;
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
      ? { row: pane.top + g + 1, column: pane.left + p + 1 }
      : void 0;
}
//@ chunk-bzr73sfg.js:378578-378648 affinity
function altScreenImagePlacer(columns, rows) {
  return (f, m) => (f >= 0 && m >= 0 && f < columns && m < rows ? cursorPosition(m + 1, f + 1) : void 0);
}
//@ chunk-bzr73sfg.js:378648-378840 affinity
function mainScreenImagePlacer(frame, cursor, rows, scrolledOutRows) {
  let max = Math.max(frame.screen.height, frame.cursor.y + 1),
    max_2 = Math.max(0, max - rows, scrolledOutRows),
    min = Math.min(Math.max(cursor.y, max_2), max_2 + rows - 1);
  return (T, A) =>
    T < 0 || A < max_2 || A >= frame.screen.height ? void 0 : `${DECRC}\r${cursorMove(T, A - min)}`;
}

export { getTerminalSize, drainStdin, Ink, restoreTerminalModes };
