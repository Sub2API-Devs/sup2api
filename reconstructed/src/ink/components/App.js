/**
 * ink/components/App.tsx
 *
 * Ink 根组件：管理 stdin 原始模式、读取并解析输入、分发键盘/粘贴/鼠标/焦点事件、点击与悬停、终端应答、挂起恢复
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/App.tsx
 * pieces: chunk-bzr73sfg.js (14)
 * attribution: affinity 2, fingerprint 3, sole-consumer 4, layout 5
 */
import { i5o } from "../../../vendor/react/cjs/react.production.js";
import { EventEmitter } from "../events/emitter.js";
import {
  createInputReaderState,
  EventLoopLagWatcher,
  hasPendingInput,
  ESC_FLUSH_TIMEOUT_MS,
  flushInputReader,
  feedInputReader,
  splitEscPrefixedChunk,
} from "../line-width-cache.js";
import { TerminalQuerier } from "../terminal-querier.js";
import { createJediTermInputState, fixJediTermWheelInput } from "../wheelScroll.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TerminalSizeContext, StdinContextAlias } from "../terminalModes.js";
import { kp, KRr } from "../../../vendor/convert-to-spaces/dist/index.js";
import {
  noopRetainFinePointer,
  noopCursorDeclaration,
  InputNowContext,
  reprobeCellSize,
  probeTerminalCapabilities,
  releaseOwedReplyHold,
  OWED_REPLY_HOLD_MS,
  isSuspendAllowed,
} from "../terminalProbe.js";
import { TerminalFocusProvider } from "./TerminalFocusContext.js";
import { ClockProvider } from "./ClockContext.js";
import { ErrorOverview } from "./ErrorOverview.js";
import { EA, gk, g$s } from "../terminalCapabilities.js";
import { env } from "../../utils/env.js";
import { G2o, queryTmuxPaneInfo } from "../terminalImages.js";
import { SHOW_CURSOR, DISABLE_WIN32_INPUT_MODE, DISABLE_MOUSE_TRACKING, HIDE_CURSOR } from "../termio/dec.js";
import { setRawModeSafe } from "../setRawModeSafe.js";
import { reportRenderError, MULTI_CLICK_MAX_MS } from "./ErrorBoundary.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { getPlatform } from "../../utils/platform.js";
import { di, STDIN_IDLE_REASSERT_MS, isXtermJs } from "../terminal.js";
import { isKeyOrPaste } from "../parse-keypress.js";
import { reconcilerAlias } from "../reconciler.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { getTerminalFocus, getTerminalFocused, getTerminalFocusGainedAt } from "../terminal-focus-state.js";
import { useAwaySummary } from "../../hooks/useAwaySummary.js";
import { waitForAttachSettle, lon, oQe } from "../../utils/attachStamp.js";
import { resumeNonBlockingStdout } from "../nonBlockingStdout.js";
import { updateLastInteractionTime } from "../../bootstrap/state.js";
import { Roo } from "../../utils/accessibility/screenReader.js";
import { count } from "../../utils/collections.js";
import { EKo } from "../../utils/fullscreen.js";
import { finishSelection, hasSelection, clearSelection } from "../selection.js";
import { pixelToCellPoint } from "./AppContext.js";
import { readClipboard } from "../termio/osc.js";
import { terminalDetector } from "../terminalColorSupport.js";

//@ chunk-bzr73sfg.js:233477-233493 affinity
var CLICK_SLOP_CELLS = 1,
  WINDOW_ACTIVATION_WINDOW_MS = 400;
/**
 * Ink 根组件（类组件 InternalApp）：提供尺寸、AppContext、StdinContext、终端焦点、时钟等上下文；原始模式引用计数（打开时写括号粘贴/主题报告/焦点事件/扩展键模式并启动能力探测，关闭时复位）；stdin readable → 输入读取器（feedInputReader/flushInputReader）→ processKeysInBatch；鼠标点击/多击/悬停/拖动选区；Ctrl+Z 挂起与 SIGCONT 恢复；tmux pane 与单元格尺寸重探测；渲染错误时显示 ErrorOverview。
 */
//@ chunk-bzr73sfg.js:233493-243685 fingerprint = App (0.507)
class App extends i5o {
  static displayName = "InternalApp";
  static getDerivedStateFromError(n) {
    return { error: n };
  }
  state = { error: void 0 };
  rawModeEnabledCount = 0;
  internal_eventEmitter = new EventEmitter();
  cancelExtendedKeysSettle;
  owedReplyHold;
  keyReader = createInputReaderState(performance.now());
  incompleteEscapeTimer = null;
  readArrivedAt = null;
  loopWatch = new EventLoopLagWatcher();
  watchLoop = () => this.loopWatch.watch();
  querier = this.props.stdout.isTTY && this.props.stdin.isTTY ? new TerminalQuerier(this.props.stdout) : null;
  lastClickTime = 0;
  lastClickCol = -1;
  lastClickRow = -1;
  clickCount = 0;
  pressIsWindowActivation = !1;
  windowActivationClickArmed = !0;
  lastActivationInputTime = Number.NEGATIVE_INFINITY;
  pendingHyperlinkTimer = null;
  pendingHyperlinkOpensInPanel = !1;
  lastHoverCol = -1;
  lastHoverRow = -1;
  pendingPastePress = null;
  lastHoverOnTarget = !1;
  lastStdinTime = performance.now();
  arrowWindow = [];
  arrowWindowDir = "";
  jediTermInput = createJediTermInputState();
  emitJediTermScrollBug = () => this.internal_eventEmitter.emit("jediterm-scroll-bug");
  isRawModeSupported() {
    return this.props.stdin.isTTY;
  }
  render() {
    return e(TerminalSizeContext.Provider, {
      value: { columns: this.props.terminalColumns, rows: this.props.terminalRows },
      children: e(kp.Provider, {
        value: {
          exit: this.handleExit,
          focusManager: this.props.focusManager,
          rootNode: this.props.rootNode,
          dispatchPasteEvent: this.props.dispatchPasteEvent,
          subscribeLayout: this.props.subscribeLayout,
          subscribeFrames: this.props.subscribeFrames,
          subscribeClicks: this.props.subscribeClicks,
          subscribeHoverTracked: this.props.subscribeHoverTracked,
          isHoverTracked: this.props.isHoverTracked,
          retainFinePointer: this.props.retainFinePointer ?? noopRetainFinePointer,
          watchLoop: this.watchLoop,
          terminalImages: this.props.terminalImages,
        },
        children: e(StdinContextAlias.Provider, {
          value: {
            stdin: this.props.stdin,
            setRawMode: this.handleSetRawMode,
            isRawModeSupported: this.isRawModeSupported(),
            internal_eventEmitter: this.internal_eventEmitter,
            internal_querier: this.querier,
            internal_jediTermInput: this.jediTermInput,
          },
          children: e(TerminalFocusProvider, {
            children: e(ClockProvider, {
              children: e(KRr.Provider, {
                value: this.props.onCursorDeclaration ?? noopCursorDeclaration,
                children: e(InputNowContext.Provider, {
                  value: this.inputNow,
                  children: this.state.error
                    ? e(ErrorOverview, { error: this.state.error })
                    : this.props.children,
                }),
              }),
            }),
          }),
        }),
      }),
    });
  }
  componentDidMount() {
    let rootNode = this.props.rootNode,
      u = rootNode._pendingRawModeDelta ?? 0;
    rootNode._pendingRawModeDelta = 0;
    for (let f = 0; f < u; f++) this.handleSetRawMode(!0);
    for (let f = 0; f > u; f--) this.handleSetRawMode(!1);
    rootNode.setRawMode = this.handleSetRawMode;
  }
  reprobeCellPixels() {
    if (!(
      this.querier !== null &&
      this.rawModeEnabledCount > 0 &&
      !this.hasReleasedTerminal &&
      EA().now("mousePixels")
    ))
      return;
    if (this.cellReprobe === "idle") ((this.cellReprobe = "asking"), this.runCellReprobe());
    else this.cellReprobe = "again";
  }
  cellReprobe = "idle";
  tmuxPaneAsk = "idle";
  isTmuxResendDue = !1;
  isTmuxRedrawDue = !1;
  refreshTmuxPane(n, u = !1) {
    let f = gk(),
      m = EA(),
      p = m.now("kittyGraphics") || m.now("itermImages");
    if (
      !env.TMUX ||
      this.hasReleasedTerminal ||
      this.props.terminalImages.size === 0 ||
      (f.tmuxPane?.passthrough ?? "off") === "off" ||
      !p
    )
      return;
    if (((this.isTmuxResendDue ||= n), (this.isTmuxRedrawDue ||= !n && !u), this.tmuxPaneAsk !== "idle")) {
      this.tmuxPaneAsk = "again";
      return;
    }
    ((this.tmuxPaneAsk = "asking"), (f.isTmuxPaneAsked = !0), this.runTmuxPaneAsk());
  }
  tmuxPaneSilentAt = void 0;
  refreshTmuxPaneForPicture() {
    let tmuxPaneSilentAt = this.tmuxPaneSilentAt;
    if (tmuxPaneSilentAt !== void 0 && performance.now() - tmuxPaneSilentAt < G2o) return;
    this.refreshTmuxPane(!1, !0);
  }
  async runTmuxPaneAsk() {
    let n = await queryTmuxPaneInfo(),
      u = gk();
    if (this.tmuxPaneAsk === "again" && !this.hasReleasedTerminal) {
      ((this.tmuxPaneAsk = "asking"), this.runTmuxPaneAsk());
      return;
    }
    ((this.tmuxPaneAsk = "idle"), (u.isTmuxPaneAsked = !1));
    let isTmuxResendDue = this.isTmuxResendDue,
      isTmuxRedrawDue = this.isTmuxRedrawDue;
    if (((this.isTmuxResendDue = !1), (this.isTmuxRedrawDue = !1), this.hasReleasedTerminal)) return;
    let tmuxPane = u.tmuxPane,
      g = n !== void 0 && tmuxPane !== void 0,
      E =
        n !== void 0 &&
        tmuxPane !== void 0 &&
        (n.pane.top !== tmuxPane.top ||
          n.pane.left !== tmuxPane.left ||
          n.pane.isPlaced !== tmuxPane.isPlaced);
    if (n !== void 0 && tmuxPane !== void 0)
      ((u.tmuxPane = { ...n.pane, passthrough: tmuxPane.passthrough }),
        (u.tmuxPaneAnsweredAt = performance.now()),
        (this.tmuxPaneSilentAt = void 0));
    else
      ((u.tmuxPaneAnsweredAt = void 0),
        (this.tmuxPaneSilentAt = performance.now()),
        (this.isTmuxRedrawDue ||= isTmuxRedrawDue));
    if (isTmuxResendDue) this.props.terminalImages.resendAll();
    else if (g && (isTmuxRedrawDue || E)) this.props.terminalImages.redrawInline();
    else if (g) this.props.terminalImages.requestDraw();
  }
  async runCellReprobe() {
    if (this.querier) await reprobeCellSize(this.querier);
    if (this.hasReleasedTerminal || !this.querier) return;
    if ((this.props.onCellPixels?.(), this.cellReprobe === "again")) {
      ((this.cellReprobe = "asking"), this.runCellReprobe());
      return;
    }
    this.cellReprobe = "idle";
  }
  componentWillUnmount() {
    if (((this.appUnmounted = !0), (this.props.rootNode.setRawMode = void 0), this.props.stdout.isTTY))
      this.props.stdout.write(SHOW_CURSOR);
    if (this.incompleteEscapeTimer)
      (clearTimeout(this.incompleteEscapeTimer), (this.incompleteEscapeTimer = null));
    if (this.pendingHyperlinkTimer)
      (clearTimeout(this.pendingHyperlinkTimer),
        (this.pendingHyperlinkTimer = null),
        (this.pendingHyperlinkOpensInPanel = !1));
    if (this.owedReplyHold !== void 0)
      (clearTimeout(this.owedReplyHold), (this.owedReplyHold = void 0), setRawModeSafe(this.props.stdin, !1));
    if (this.isRawModeSupported()) while (this.rawModeEnabledCount > 0) this.handleSetRawMode(!1);
  }
  componentDidCatch(n, u) {
    (reportRenderError(n, u), this.handleExit(n));
  }
  handleSetRawMode = (n) => {
    let { stdin: stdin } = this.props;
    if (!this.isRawModeSupported())
      if (stdin === process.stdin)
        throw Error(`Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.
Read about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported`);
      else
        throw Error(`Raw mode is not supported on the stdin provided to Ink.
Read about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported`);
    if ((stdin.setEncoding("utf8"), n)) {
      if (this.rawModeEnabledCount === 0) {
        if ((stopCapturingEarlyInput(), this.owedReplyHold !== void 0))
          (clearTimeout(this.owedReplyHold), (this.owedReplyHold = void 0));
        if (
          (this.props.onRawModeEnter?.(),
          stdin.ref(),
          setRawModeSafe(stdin, !0),
          stdin.addListener("readable", this.handleReadable),
          this.querier?.setInputAttached(!0),
          getPlatform() === "windows")
        )
          (stdin.resume(), stdin.pause());
        let { modes: modes } = this.props;
        if (
          (this.props.stdout.write(
            modes.set("bracketedPaste") + modes.set("themeReports") + modes.set("focusEvents"),
          ),
          getPlatform() === "windows")
        )
          this.props.stdout.write(DISABLE_WIN32_INPUT_MODE);
        this.props.stdout.write(modes.set("extendedKeys"));
        let m = EA();
        if (m.get("extendedKeys").state === "pending")
          this.cancelExtendedKeysSettle = m.onSettle("extendedKeys", (p) => {
            if (p && !this.hasReleasedTerminal) this.props.stdout.write(modes.reassertKeys());
          });
        if (env.CLAUDE_BG_BACKEND !== "daemon")
          setImmediate(() => {
            if (this.querier && !this.hasReleasedTerminal) probeTerminalCapabilities(this.querier, EA());
          });
      }
      this.rawModeEnabledCount++;
      return;
    }
    if (this.rawModeEnabledCount <= 0) return;
    if (--this.rawModeEnabledCount === 0) {
      (this.cancelExtendedKeysSettle?.(), (this.cancelExtendedKeysSettle = void 0));
      let { modes: modes } = this.props;
      if (
        (this.props.stdout.write(
          modes.reset("extendedKeys") +
            modes.reset("focusEvents") +
            modes.reset("themeReports") +
            modes.reset("bracketedPaste"),
        ),
        !di().get(this.props.stdout)?.isHandoffRawMode)
      )
        if (this.querier && this.querier.owed() > 0 && !this.appUnmounted)
          ((this.owedReplyHold = setTimeout(releaseOwedReplyHold, OWED_REPLY_HOLD_MS, this, stdin)),
            this.owedReplyHold.unref?.());
        else {
          if (this.querier && this.querier.owed() > 0) di().get(this.props.stdout)?.drainStdin();
          setRawModeSafe(stdin, !1);
        }
      (this.querier?.setInputAttached(!1),
        stdin.removeListener("readable", this.handleReadable),
        stdin.unref());
    }
  };
  flushIncomplete = () => {
    if (((this.incompleteEscapeTimer = null), !hasPendingInput(this.keyReader))) return;
    if (this.props.stdin.readableLength > 0) {
      this.incompleteEscapeTimer = setTimeout(this.flushIncomplete, ESC_FLUSH_TIMEOUT_MS);
      return;
    }
    let startTime = performance.now();
    this.applyKeysRead(flushInputReader(this.keyReader, startTime), startTime);
  };
  processInput = (n, u, f) => {
    this.applyKeysRead(feedInputReader(this.keyReader, n, u, f), u);
  };
  applyKeysRead({ keys: n, reader: u, wakeAt: f }, m) {
    if (((this.keyReader = u), this.incompleteEscapeTimer))
      (clearTimeout(this.incompleteEscapeTimer), (this.incompleteEscapeTimer = null));
    if (f !== null) this.incompleteEscapeTimer = setTimeout(this.flushIncomplete, Math.max(0, f - m));
    if (n.length > 0) {
      if (n.some(isKeyOrPaste)) this.props.onInputPriorityFrame();
      let readArrivedAt = this.readArrivedAt;
      this.readArrivedAt = Date.now();
      try {
        reconcilerAlias.discreteUpdates(processKeysInBatch, this, n, !1, void 0);
      } finally {
        this.readArrivedAt = readArrivedAt;
      }
    }
  }
  inputNow = () => this.readArrivedAt ?? Date.now();
  handleReadable = () => {
    let startTime = performance.now();
    if (startTime - this.lastStdinTime > STDIN_IDLE_REASSERT_MS) this.props.onStdinResume?.();
    this.lastStdinTime = startTime;
    let isLate = this.loopWatch.isLate(startTime);
    try {
      let f;
      while ((f = this.props.stdin.read()) !== null) this.processInput(f, startTime, isLate);
    } catch (error) {
      logError(withTelemetryMessage(toError(error), "stdin readable handler threw during input processing"));
      let { stdin: stdin } = this.props;
      if (this.rawModeEnabledCount > 0 && !stdin.listeners("readable").includes(this.handleReadable))
        (logForDebugging("handleReadable: re-attaching stdin readable listener after error recovery", {
          level: "warn",
        }),
          stdin.addListener("readable", this.handleReadable));
    }
  };
  handleInput = (n) => {
    if (n === "\x03" && this.props.exitOnCtrlC) this.handleExit();
  };
  handleExit = (n) => {
    if (this.isRawModeSupported()) this.handleSetRawMode(!1);
    this.props.onExit(n);
  };
  attachProbeDeferred = !1;
  appUnmounted = !1;
  get hasReleasedTerminal() {
    return this.appUnmounted || isTerminalShutdown() || di().get(this.props.stdout)?.hasUnmounted === !0;
  }
  handleTerminalFocus = (n) => {
    let u = getTerminalFocus();
    if (!n || Date.now() - this.lastActivationInputTime >= WINDOW_ACTIVATION_WINDOW_MS)
      this.windowActivationClickArmed = !0;
    if ((useAwaySummary(n), !n)) this.props.onHoverLost?.();
    if (n) this.refreshTmuxPane(!0);
    if (n && u === "blurred") this.reprobeCellPixels();
    if (n && u === "blurred") di().get(this.props.stdout)?.proactiveAtlasResetOnFocus();
    if (
      n &&
      u !== "focused" &&
      env.CLAUDE_BG_BACKEND === "daemon" &&
      this.querier &&
      !this.attachProbeDeferred
    )
      ((this.attachProbeDeferred = !0),
        waitForAttachSettle().then(() => {
          if (((this.attachProbeDeferred = !1), this.querier && !this.hasReleasedTerminal))
            (gk().resetCapabilities(), probeTerminalCapabilities(this.querier, EA()));
        }));
  };
  consumeWindowActivationLatch(n) {
    if (((this.lastActivationInputTime = n), !this.windowActivationClickArmed)) return !1;
    return ((this.windowActivationClickArmed = !1), !0);
  }
  handleSuspend = () => {
    if (!this.isRawModeSupported()) return;
    let rawModeEnabledCount = this.rawModeEnabledCount;
    if (this.props.stdout.isTTY)
      this.props.stdout.write(SHOW_CURSOR + DISABLE_MOUSE_TRACKING + this.props.modes.suspend());
    while (this.rawModeEnabledCount > 0) this.handleSetRawMode(!1);
    this.internal_eventEmitter.emit("suspend");
    let u = setInterval(() => {}, 1073741824),
      f = () => {
        if ((clearInterval(u), process.removeListener("SIGCONT", f), this.hasReleasedTerminal)) return;
        for (let m = 0; m < rawModeEnabledCount; m++)
          if (this.isRawModeSupported()) this.handleSetRawMode(!0);
        if (this.props.stdout.isTTY) {
          let m = this.props.isScreenReaderEnabled ?? !1;
          this.props.stdout.write(
            this.props.modes.resume() + (env.CLAUDE_CODE_ACCESSIBILITY || m ? "" : HIDE_CURSOR),
          );
        }
        this.internal_eventEmitter.emit("resume");
      };
    if ((process.on("SIGCONT", f), this.owedReplyHold !== void 0))
      (di().get(this.props.stdout)?.drainStdin(), releaseOwedReplyHold(this, this.props.stdin));
    (resumeNonBlockingStdout(), process.kill(0, "SIGTSTP"));
  };
}
/**
 * 输入项是否算用户操作（粘贴、按键、非悬停移动的鼠标），用于空闲计时与附着后静默期过滤。
 */
//@ chunk-bzr73sfg.js:243685-243839 affinity
function isUserInput(item) {
  switch (item.kind) {
    case "response":
    case "focus":
      return !1;
    case "paste":
      return !0;
    case "mouse":
      return !isHoverMotion(item.button);
    case "key":
      return item.name !== "mouse";
  }
}
//@ chunk-bzr73sfg.js:243954-244012 sole-consumer
function isMouseButtonEvent(item) {
  return item.kind === "mouse" && (item.button & 32) === 0;
}
//@ chunk-bzr73sfg.js:244012-244065 sole-consumer
function isDiscreteInput(item) {
  return isKeyOrPaste(item) || isMouseButtonEvent(item) || item.kind === "focus";
}
/**
 * 在 discreteUpdates 里处理一批输入：JetBrains 终端滚动 bug 修正、方向键连发检测；终端应答交给 querier；鼠标交给 handleMouseEvent（滚动模式下忽略按键）；焦点事件；粘贴 → dispatchPasteEvent；Ctrl+Z 挂起；滚轮 → dispatchWheelEvent；其余 → dispatchKeyboardEvent，若处理器要求按“ESC + 键”重读则拆开重放。同批多个离散输入之间 flushSyncWork，保证逐个生效。
 */
//@ chunk-bzr73sfg.js:244065-245685 fingerprint = processKeysInBatch (0.506)
function processKeysInBatch(app, items, isReplay, _unused2) {
  let inQuietDrain = lon(Date.now());
  if (!inQuietDrain && items.some(isUserInput)) (updateLastInteractionTime(), Roo());
  let filtered = fixJediTermWheelInput(
    app.jediTermInput,
    items,
    performance.now(),
    app.emitJediTermScrollBug,
  );
  detectArrowBurst(app, filtered);
  let soloKeypress = count(filtered, isUserInput) === 1,
    multipleDiscrete = count(filtered, isDiscreteInput) > 1,
    flushedOne = !1;
  for (let item of filtered) {
    if (inQuietDrain && !isReplay && isUserInput(item) && !(item.kind === "key" && item.name === "left")) {
      logForDebugging(`attachQuietDrain: dropped ${item.kind} (ms_since_stamp=${Date.now() - oQe()})`, {
        level: "debug",
      });
      continue;
    }
    if (item.kind === "response") {
      if (!(app.querier?.onResponse(item.response) ?? !1) && item.response.type === "kittyGraphics")
        app.props.terminalImages.refused(item.response.id, item.response.message);
      continue;
    }
    if (item.kind === "mouse") {
      if ((EKo(), item.action === "press" && !isHoverMotion(item.button) && !getTerminalFocused()))
        app.handleTerminalFocus(!0);
      if (app.props.getMouseMode?.() === "scroll" && (item.button & 3) === 0) {
        app.pendingPastePress = null;
        continue;
      }
      if (isMouseButtonEvent(item)) {
        if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
        flushedOne = !0;
      }
      handleMouseEvent(app, mouseToCells(app, item));
      continue;
    }
    if (item.kind === "focus") {
      if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
      if ((app.handleTerminalFocus(item.focused), multipleDiscrete)) reconcilerAlias.flushSyncWork();
      if (((flushedOne = !0), !item.focused && app.props.selection.isDragging))
        (finishSelection(app.props.selection), app.props.onSelectionChange());
      continue;
    }
    if (
      item.kind === "paste" ||
      (item.name !== "wheelup" && item.name !== "wheeldown" && item.name !== "mouse")
    ) {
      if (!getTerminalFocused()) (useAwaySummary(!0), reconcilerAlias.flushSyncWork());
      app.consumeWindowActivationLatch(Date.now());
    }
    if (isKeyOrPaste(item)) {
      if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
      flushedOne = !0;
    }
    if (item.kind === "paste") {
      app.props.dispatchPasteEvent(item.text);
      continue;
    }
    if (item.name === "z" && item.ctrl && isSuspendAllowed()) {
      app.handleSuspend();
      continue;
    }
    if (
      (app.handleInput(item.sequence),
      item.name === "wheelup" || item.name === "wheeldown" || item.name === "mouse")
    ) {
      if (item.name !== "mouse") (EKo(), app.props.dispatchWheelEvent(wheelKeyToCells(app, item)));
    } else if (app.props.dispatchKeyboardEvent(item, { soloKeypress: soloKeypress }))
      (reconcilerAlias.flushSyncWork(),
        processKeysInBatch(app, splitEscPrefixedChunk(item.sequence ?? ""), !0, void 0));
  }
  if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
}
/**
 * SGR 鼠标按钮码表示“无按键移动”（运动位 32 且按钮=3）。
 */
//@ chunk-bzr73sfg.js:245685-245728 layout
function isHoverMotion(button) {
  return (button & 32) !== 0 && (button & 3) === 3;
}
/**
 * 像素鼠标模式下把像素坐标换算成格坐标（保留 fine 精确值）。
 */
//@ chunk-bzr73sfg.js:245728-245859 layout
function mouseToCells(app, mouse) {
  let cellPixels = gk().cellPixels;
  if (!app.props.mouseReportsInPixels?.() || cellPixels === void 0) return mouse;
  return { ...mouse, ...pixelToCellPoint(mouse.col, mouse.row, cellPixels) };
}
//@ chunk-bzr73sfg.js:245859-246045 layout
function wheelKeyToCells(app, key) {
  let cellPixels = gk().cellPixels,
    { col: col, row: row } = key;
  if (!app.props.mouseReportsInPixels?.() || cellPixels === void 0 || col === void 0 || row === void 0)
    return key;
  let g = pixelToCellPoint(col, row, cellPixels);
  return { ...key, col: g.col, row: g.row };
}
//@ chunk-bzr73sfg.js:246045-246114 layout
function mouseMods(button) {
  return { shift: (button & 4) !== 0, alt: (button & 8) !== 0, ctrl: (button & 16) !== 0 };
}
/**
 * 右键/中键松开（与按下位置相同）时：Windows/WSL/Linux 右键有选区则清除选区（复制已发生），否则粘贴系统剪贴板（xterm.js 除外）；Linux 中键粘贴 PRIMARY 选区。
 */
//@ chunk-bzr73sfg.js:246114-246607 layout
function handleMiddleOrRightClickPaste(app, button, col, row) {
  let pendingPastePress = app.pendingPastePress;
  if (
    ((app.pendingPastePress = null),
    pendingPastePress === null ||
      (button !== pendingPastePress.button && button !== 3) ||
      Math.abs(col - pendingPastePress.col) > CLICK_SLOP_CELLS ||
      Math.abs(row - pendingPastePress.row) > CLICK_SLOP_CELLS)
  )
    return;
  let selection = app.props.selection,
    platform = getPlatform();
  if (
    pendingPastePress.button === 2 &&
    (platform === "windows" || platform === "wsl" || platform === "linux")
  ) {
    if (hasSelection(selection))
      (app.props.onSelectionTakeDown(), clearSelection(selection), app.props.onSelectionChange());
    else if (!isXtermJs())
      readClipboard("clipboard").then((T) => {
        if (T) app.props.dispatchPasteEvent(T);
      });
  } else if (pendingPastePress.button === 1 && platform === "linux")
    readClipboard("primary").then((T) => {
      if (T) app.props.dispatchPasteEvent(T);
    });
}
/**
 * 处理一个鼠标事件：悬停（onHoverAt/onPointerHover）；按下时左键开始选区或计多击（双击选词、三击选行，窗口激活点击不计）；拖动更新选区；右/中键记下待粘贴；松开时结束选区，没有选区则当点击（onClickAt），点在超链接上且带 Cmd/Ctrl 时延迟 500ms 打开（多击取消）。
 */
//@ chunk-bzr73sfg.js:246607-249193 fingerprint = handleMouseEvent (0.731)
function handleMouseEvent(app, mouse) {
  let selection = app.props.selection,
    col = mouse.col - 1,
    row = mouse.row - 1,
    button = mouse.button & 3,
    isHover = mouse.action === "press" && isHoverMotion(mouse.button);
  if (!isHover && app.lastHoverCol !== -1 && (col !== app.lastHoverCol || row !== app.lastHoverRow))
    ((app.lastHoverCol = -1),
      (app.lastHoverRow = -1),
      (app.lastHoverOnTarget = !1),
      app.props.onHoverLost?.());
  if (mouse.action === "press") {
    if (isHover) {
      if (selection.isDragging) (finishSelection(selection), app.props.onSelectionChange());
      let A = col === app.lastHoverCol && row === app.lastHoverRow;
      if (!A) ((app.lastHoverCol = col), (app.lastHoverRow = row), app.props.onHoverAt(col, row));
      if (!A || (mouse.fine !== void 0 && app.lastHoverOnTarget))
        app.lastHoverOnTarget =
          app.props.onPointerHover?.(col, row, mouseMods(mouse.button), mouse.fine) ?? !1;
      return;
    }
    if ((mouse.button & 32) === 0) app.pendingPastePress = null;
    if ((mouse.button & 32) !== 0 && app.props.onPointerDrag !== void 0) {
      if (app.props.onPointerDrag(col, row, mouseMods(mouse.button), mouse.fine)) return;
    }
    if (button !== 0) {
      if (
        ((app.clickCount = 0),
        (mouse.button & 32) === 0 &&
          (button === 1 || button === 2) &&
          app.props.onPointerPress?.(col, row, button, mouseMods(mouse.button), mouse.fine))
      )
        return;
      if ((mouse.button & 32) === 0) app.consumeWindowActivationLatch(Date.now());
      if ((mouse.button & 32) === 0 && (button === 1 || button === 2))
        app.pendingPastePress = { button: button, col: col, row: row };
      return;
    }
    if ((mouse.button & 32) !== 0) {
      app.props.onSelectionDrag(col, row);
      return;
    }
    if (selection.isDragging) (finishSelection(selection), app.props.onSelectionChange());
    if (app.props.onPointerPress?.(col, row, 0, mouseMods(mouse.button), mouse.fine)) {
      app.clickCount = 0;
      return;
    }
    let now = Date.now();
    if (
      ((app.pressIsWindowActivation =
        app.consumeWindowActivationLatch(now) &&
        now - getTerminalFocusGainedAt() < WINDOW_ACTIVATION_WINDOW_MS),
      app.pressIsWindowActivation)
    )
      app.clickCount = 0;
    else {
      let A =
        now - app.lastClickTime < MULTI_CLICK_MAX_MS &&
        Math.abs(col - app.lastClickCol) <= CLICK_SLOP_CELLS &&
        Math.abs(row - app.lastClickRow) <= CLICK_SLOP_CELLS;
      ((app.clickCount = A ? app.clickCount + 1 : 1),
        (app.lastClickTime = now),
        (app.lastClickCol = col),
        (app.lastClickRow = row));
    }
    if (app.clickCount >= 2) {
      if (app.pendingHyperlinkTimer && !app.pendingHyperlinkOpensInPanel)
        (clearTimeout(app.pendingHyperlinkTimer), (app.pendingHyperlinkTimer = null));
      let count = app.clickCount === 2 ? 2 : 3;
      app.props.onMultiClick(col, row, count);
      return;
    }
    (app.props.onSelectionStart(col, row),
      (selection.lastPressHadAlt = (mouse.button & 8) !== 0),
      app.props.onSelectionChange());
    return;
  }
  if (
    (handleMiddleOrRightClickPaste(app, button, col, row),
    app.props.onPointerRelease?.(col, row, mouseMods(mouse.button), mouse.fine))
  )
    return;
  if (button !== 0) {
    if (!selection.isDragging) return;
    (finishSelection(selection), app.props.onSelectionChange());
    return;
  }
  if ((finishSelection(selection), !hasSelection(selection) && selection.anchor)) {
    let onClickAt = app.props.onClickAt(col, row, app.pressIsWindowActivation, mouseMods(mouse.button));
    if (onClickAt === "stray" || onClickAt === "repeat") ((app.clickCount = 0), (app.lastClickTime = 0));
    if (onClickAt === "unhandled" && !app.pressIsWindowActivation) {
      let url = app.props.getHyperlinkAt(col, row);
      if (
        url &&
        env.TERM_PROGRAM !== "vscode" &&
        !isXtermJs() &&
        ((mouse.button & 24) !== 0 || terminalDetector.macCmdClickArrivesWithoutSgrModifierBit() || g$s())
      ) {
        if (app.pendingHyperlinkTimer) clearTimeout(app.pendingHyperlinkTimer);
        ((app.pendingHyperlinkOpensInPanel = !1),
          (app.pendingHyperlinkTimer = setTimeout(
            (app, url) => {
              ((app.pendingHyperlinkTimer = null),
                (app.pendingHyperlinkOpensInPanel = !1),
                app.props.onOpenHyperlink(url));
            },
            MULTI_CLICK_MAX_MS,
            app,
            url,
          )));
      }
    }
  }
  app.props.onSelectionChange();
}
//@ chunk-bzr73sfg.js:249193-249209 sole-consumer
var ARROW_BURST_WINDOW_MS = 100,
  ARROW_BURST_THRESHOLD = 8;
/**
 * 100ms 内同方向无修饰上/下方向键累计 ≥8 个时发出 arrow-burst 事件（滚轮被终端翻译成方向键的情况）。
 */
//@ chunk-bzr73sfg.js:249209-249748 sole-consumer
function detectArrowBurst(app, items) {
  let first = items[0];
  if (
    first?.kind !== "key" ||
    (first.name !== "up" && first.name !== "down") ||
    first.ctrl ||
    first.meta ||
    first.shift ||
    !items.every((E) => E.kind === "key" && E.name === first.name && !E.ctrl && !E.meta && !E.shift)
  ) {
    app.arrowWindow.length = 0;
    return;
  }
  if (app.arrowWindowDir !== first.name) ((app.arrowWindow.length = 0), (app.arrowWindowDir = first.name));
  let startTime = performance.now(),
    arrowWindow = app.arrowWindow;
  arrowWindow.push({ t: startTime, n: items.length });
  while (arrowWindow.length > 0 && startTime - arrowWindow[0].t > ARROW_BURST_WINDOW_MS) arrowWindow.shift();
  let g = 0;
  for (let E of arrowWindow) g += E.n;
  if (g >= ARROW_BURST_THRESHOLD)
    (app.internal_eventEmitter.emit("arrow-burst", { direction: first.name, count: g }),
      app.props.onStdinResume?.(),
      (arrowWindow.length = 0));
}

export { App };
