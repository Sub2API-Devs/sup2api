/**
 * ink/components/App.tsx
 *
 * Ink 根组件：管理 stdin 原始模式、读取并解析输入、分发键盘/粘贴/鼠标/焦点事件、点击与悬停、终端应答、挂起恢复
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/App.tsx
 * pieces: chunk-2avr6cej.js (13)
 * attribution: affinity 2, fingerprint 3, placement 1, layout 5, sole-consumer 2
 */
import { PureComponent_default } from "../../../vendor/react/cjs/react.production.js";
import { EventEmitter } from "../events/emitter.js";
import {
  createInputReaderState,
  hasPendingInput,
  ESC_FLUSH_TIMEOUT_MS,
  flushInputReader,
  feedInputReader,
  splitEscPrefixedChunk,
} from "../stdinReader.js";
import { EventLoopLagWatcher } from "../eventLoopLag.js";
import { TerminalQuerier } from "../terminal-querier.js";
import { createJediTermInputState, fixJediTermWheelInput } from "../wheelScroll.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { TerminalSizeContext, StdinContextAlias } from "../terminalModes.js";
import { APP_CONTEXT, createContextLazy } from "../../../vendor/convert-to-spaces/dist/index.js";
import {
  noopRetainFinePointer,
  noopCursorDeclaration,
  InputNowContext,
  terminalProbeContext,
  reprobeCellSize,
  probeTerminalCapabilities,
  releaseOwedReplyHold,
  OWED_REPLY_HOLD_MS,
  isSuspendAllowed,
} from "../terminalProbe.js";
import { TerminalFocusProvider } from "./TerminalFocusContext.js";
import { ClockProvider } from "./ClockContext.js";
import { ErrorOverview } from "./ErrorOverview.js";
import { getTerminalCapabilities, getTerminalProbeState, isGhostty } from "../terminalCapabilities.js";
import { env } from "../../utils/env.js";
import { TMUX_PANE_ASK_GRACE_MS, queryTmuxPaneInfo } from "../terminalImages.js";
import { SHOW_CURSOR, DISABLE_WIN32_INPUT_MODE, DISABLE_MOUSE_TRACKING, HIDE_CURSOR } from "../termio/dec.js";
import { setRawModeSafe } from "../setRawModeSafe.js";
import { reportRenderError, MULTI_CLICK_MAX_MS } from "./ErrorBoundary.js";
import { stopCapturingEarlyInput } from "../../utils/earlyInput.js";
import { getPlatform } from "../../utils/platform.js";
import { getSecondRootError, STDIN_IDLE_REASSERT_MS, isXtermJs } from "../terminal.js";
import { isKeyOrPaste } from "../parse-keypress.js";
import { reconcilerAlias } from "../reconciler.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { isTerminalShutdown } from "../../utils/terminalShutdown.js";
import { getTerminalFocus, getTerminalFocused, getTerminalFocusGainedAt } from "../terminal-focus-state.js";
import { useAwaySummary } from "../../hooks/useAwaySummary.js";
import { waitForAttachSettle, isAttachSettled, getAttachStampMs } from "../../utils/attachStamp.js";
import { resumeNonBlockingStdout } from "../nonBlockingStdout.js";
import { updateLastInteractionTime } from "../../bootstrap/state.js";
import { endStartupQuiet } from "../../utils/accessibility/screenReader.js";
import { countWhere } from "../../utils/collections.js";
import { isDiscreteInput } from "../../components/teams/TeamsDialog.js";
import { noteFullscreenObserved } from "../../utils/fullscreen.js";
import { finishSelection, hasSelection, clearSelection } from "../selection.js";
import { pixelToCellPoint } from "./AppContext.js";
import { readClipboard } from "../termio/osc.js";
import { terminalDetector } from "../terminalColorSupport.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:233093-233109 affinity
var CLICK_SLOP_CELLS = 1;
var WINDOW_ACTIVATION_WINDOW_MS = 400;
//@ chunk-2avr6cej.js:233109-243361 fingerprint (2.1.88 match: App, 0.507)
/**
 * Ink 根组件（类组件 InternalApp）：提供尺寸、AppContext、StdinContext、终端焦点、时钟等上下文；原始模式引用计数（打开时写括号粘贴/主题报告/焦点事件/扩展键模式并启动能力探测，关闭时复位）；stdin readable → 输入读取器（feedInputReader/flushInputReader）→ processKeysInBatch；鼠标点击/多击/悬停/拖动选区；Ctrl+Z 挂起与 SIGCONT 恢复；tmux pane 与单元格尺寸重探测；渲染错误时显示 ErrorOverview。
 */
let App; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:233109", () => {
  App = class App extends PureComponent_default {
    static displayName = "InternalApp";
    static getDerivedStateFromError(error) {
      return {
        error,
      };
    }
    state = {
      error: undefined,
    };
    rawModeEnabledCount = 0;
    internal_eventEmitter = new EventEmitter();
    cancelExtendedKeysSettle;
    owedReplyHold;
    keyReader = createInputReaderState(performance.now());
    incompleteEscapeTimer = null;
    readArrivedAt = null;
    loopWatch = new EventLoopLagWatcher();
    watchLoop = () => this.loopWatch.watch();
    querier =
      this.props.stdout.isTTY && this.props.stdin.isTTY ? new TerminalQuerier(this.props.stdout) : null;
    lastClickTime = 0;
    lastClickCol = -1;
    lastClickRow = -1;
    clickCount = 0;
    pressIsWindowActivation = false;
    windowActivationClickArmed = true;
    lastActivationInputTime = Number.NEGATIVE_INFINITY;
    pendingHyperlinkTimer = null;
    pendingHyperlinkOpensInPanel = false;
    lastHoverCol = -1;
    lastHoverRow = -1;
    pendingPastePress = null;
    lastHoverOnTarget = false;
    lastStdinTime = performance.now();
    arrowWindow = [];
    arrowWindowDir = "";
    jediTermInput = createJediTermInputState();
    emitJediTermScrollBug = () => this.internal_eventEmitter.emit("jediterm-scroll-bug");
    isRawModeSupported() {
      return this.props.stdin.isTTY;
    }
    render() {
      return jsxProd_default(TerminalSizeContext.Provider, {
        value: {
          columns: this.props.terminalColumns,
          rows: this.props.terminalRows,
        },
        children: jsxProd_default(APP_CONTEXT.Provider, {
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
          children: jsxProd_default(StdinContextAlias.Provider, {
            value: {
              stdin: this.props.stdin,
              setRawMode: this.handleSetRawMode,
              isRawModeSupported: this.isRawModeSupported(),
              internal_eventEmitter: this.internal_eventEmitter,
              internal_querier: this.querier,
              internal_jediTermInput: this.jediTermInput,
            },
            children: jsxProd_default(TerminalFocusProvider, {
              children: jsxProd_default(ClockProvider, {
                children: jsxProd_default(createContextLazy.Provider, {
                  value: this.props.onCursorDeclaration ?? noopCursorDeclaration,
                  children: jsxProd_default(InputNowContext.Provider, {
                    value: this.inputNow,
                    children: jsxProd_default(terminalProbeContext.Provider, {
                      value: this.props.subscribeFrames,
                      children: this.state.error
                        ? jsxProd_default(ErrorOverview, {
                            error: this.state.error,
                          })
                        : this.props.children,
                    }),
                  }),
                }),
              }),
            }),
          }),
        }),
      });
    }
    componentDidMount() {
      let rootNode = this.props.rootNode;
      let _pendingRawModeDelta = rootNode._pendingRawModeDelta ?? 0;
      rootNode._pendingRawModeDelta = 0;
      for (let idx = 0; idx < _pendingRawModeDelta; idx++) this.handleSetRawMode(true);
      for (let idx = 0; idx > _pendingRawModeDelta; idx--) this.handleSetRawMode(false);
      rootNode.setRawMode = this.handleSetRawMode;
    }
    reprobeCellPixels() {
      if (!(
        this.querier !== null &&
        this.rawModeEnabledCount > 0 &&
        !this.hasReleasedTerminal &&
        getTerminalCapabilities().now("mousePixels")
      ))
        return;
      if (this.cellReprobe === "idle") {
        this.cellReprobe = "asking";
        this.runCellReprobe();
      } else this.cellReprobe = "again";
    }
    cellReprobe = "idle";
    tmuxPaneAsk = "idle";
    isTmuxResendDue = false;
    isTmuxRedrawDue = false;
    refreshTmuxPane(resend, picture = false) {
      let terminalProbeState = getTerminalProbeState();
      let terminalCapabilities = getTerminalCapabilities();
      let supportsImages =
        terminalCapabilities.now("kittyGraphics") || terminalCapabilities.now("itermImages");
      if (
        !env.TMUX ||
        this.hasReleasedTerminal ||
        this.props.terminalImages.size === 0 ||
        (terminalProbeState.tmuxPane?.passthrough ?? "off") === "off" ||
        !supportsImages
      )
        return;
      this.isTmuxResendDue ||= resend;
      this.isTmuxRedrawDue ||= !resend && !picture;
      if (this.tmuxPaneAsk !== "idle") {
        this.tmuxPaneAsk = "again";
        return;
      }
      this.tmuxPaneAsk = "asking";
      terminalProbeState.isTmuxPaneAsked = true;
      this.runTmuxPaneAsk();
    }
    tmuxPaneSilentAt = undefined;
    refreshTmuxPaneForPicture() {
      let tmuxPaneSilentAt = this.tmuxPaneSilentAt;
      if (tmuxPaneSilentAt !== undefined && performance.now() - tmuxPaneSilentAt < TMUX_PANE_ASK_GRACE_MS)
        return;
      this.refreshTmuxPane(false, true);
    }
    async runTmuxPaneAsk() {
      let tmuxPaneInfo = await queryTmuxPaneInfo();
      let terminalProbeState = getTerminalProbeState();
      if (this.tmuxPaneAsk === "again" && !this.hasReleasedTerminal) {
        this.tmuxPaneAsk = "asking";
        this.runTmuxPaneAsk();
        return;
      }
      this.tmuxPaneAsk = "idle";
      terminalProbeState.isTmuxPaneAsked = false;
      let isTmuxResendDue = this.isTmuxResendDue;
      let isTmuxRedrawDue = this.isTmuxRedrawDue;
      this.isTmuxResendDue = false;
      this.isTmuxRedrawDue = false;
      if (this.hasReleasedTerminal) return;
      let tmuxPane = terminalProbeState.tmuxPane;
      let hasPaneInfo = tmuxPaneInfo !== undefined && tmuxPane !== undefined;
      let paneMoved =
        tmuxPaneInfo !== undefined &&
        tmuxPane !== undefined &&
        (tmuxPaneInfo.pane.top !== tmuxPane.top ||
          tmuxPaneInfo.pane.left !== tmuxPane.left ||
          tmuxPaneInfo.pane.isPlaced !== tmuxPane.isPlaced);
      if (tmuxPaneInfo !== undefined && tmuxPane !== undefined) {
        terminalProbeState.tmuxPane = {
          ...tmuxPaneInfo.pane,
          passthrough: tmuxPane.passthrough,
        };
        terminalProbeState.tmuxPaneAnsweredAt = performance.now();
        this.tmuxPaneSilentAt = undefined;
      } else {
        terminalProbeState.tmuxPaneAnsweredAt = undefined;
        this.tmuxPaneSilentAt = performance.now();
        this.isTmuxRedrawDue ||= isTmuxRedrawDue;
      }
      if (isTmuxResendDue) this.props.terminalImages.resendAll();
      else if (hasPaneInfo && (isTmuxRedrawDue || paneMoved)) this.props.terminalImages.redrawInline();
      else if (hasPaneInfo) this.props.terminalImages.requestDraw();
    }
    async runCellReprobe() {
      if (this.querier) await reprobeCellSize(this.querier);
      if (this.hasReleasedTerminal || !this.querier) return;
      this.props.onCellPixels?.();
      if (this.cellReprobe === "again") {
        this.cellReprobe = "asking";
        this.runCellReprobe();
        return;
      }
      this.cellReprobe = "idle";
    }
    componentWillUnmount() {
      this.appUnmounted = true;
      this.props.rootNode.setRawMode = undefined;
      if (this.props.stdout.isTTY) this.props.stdout.write(SHOW_CURSOR);
      if (this.incompleteEscapeTimer) {
        clearTimeout(this.incompleteEscapeTimer);
        this.incompleteEscapeTimer = null;
      }
      if (this.pendingHyperlinkTimer) {
        clearTimeout(this.pendingHyperlinkTimer);
        this.pendingHyperlinkTimer = null;
        this.pendingHyperlinkOpensInPanel = false;
      }
      if (this.owedReplyHold !== undefined) {
        clearTimeout(this.owedReplyHold);
        this.owedReplyHold = undefined;
        setRawModeSafe(this.props.stdin, false);
      }
      if (this.isRawModeSupported()) while (this.rawModeEnabledCount > 0) this.handleSetRawMode(false);
    }
    componentDidCatch(error, info) {
      reportRenderError(error, info);
      this.handleExit(error);
    }
    handleSetRawMode = (isEnabled) => {
      let { stdin } = this.props;
      if (!this.isRawModeSupported())
        if (stdin === process.stdin)
          throw Error(`Raw mode is not supported on the current process.stdin, which Ink uses as input stream by default.
Read about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported`);
        else
          throw Error(`Raw mode is not supported on the stdin provided to Ink.
Read about how to prevent this error on https://github.com/vadimdemedes/ink/#israwmodesupported`);
      stdin.setEncoding("utf8");
      if (isEnabled) {
        if (this.rawModeEnabledCount === 0) {
          stopCapturingEarlyInput();
          if (this.owedReplyHold !== undefined) {
            clearTimeout(this.owedReplyHold);
            this.owedReplyHold = undefined;
          }
          this.props.onRawModeEnter?.();
          stdin.ref();
          setRawModeSafe(stdin, true);
          stdin.addListener("readable", this.handleReadable);
          this.querier?.setInputAttached(true);
          if (getPlatform() === "windows") {
            stdin.resume();
            stdin.pause();
          }
          let { modes } = this.props;
          this.props.stdout.write(
            modes.set("bracketedPaste") + modes.set("themeReports") + modes.set("focusEvents"),
          );
          if (getPlatform() === "windows") this.props.stdout.write(DISABLE_WIN32_INPUT_MODE);
          this.props.stdout.write(modes.set("extendedKeys"));
          let terminalCapabilities = getTerminalCapabilities();
          if (terminalCapabilities.get("extendedKeys").state === "pending")
            this.cancelExtendedKeysSettle = terminalCapabilities.onSettle("extendedKeys", (settled) => {
              if (settled && !this.hasReleasedTerminal) this.props.stdout.write(modes.reassertKeys());
            });
          if (env.CLAUDE_BG_BACKEND !== "daemon")
            setImmediate(() => {
              if (this.querier && !this.hasReleasedTerminal)
                probeTerminalCapabilities(this.querier, getTerminalCapabilities());
            });
        }
        this.rawModeEnabledCount++;
        return;
      }
      if (this.rawModeEnabledCount <= 0) return;
      if (--this.rawModeEnabledCount === 0) {
        this.cancelExtendedKeysSettle?.();
        this.cancelExtendedKeysSettle = undefined;
        let { modes } = this.props;
        this.props.stdout.write(
          modes.reset("extendedKeys") +
            modes.reset("focusEvents") +
            modes.reset("themeReports") +
            modes.reset("bracketedPaste"),
        );
        if (!getSecondRootError().get(this.props.stdout)?.isHandoffRawMode)
          if (this.querier && this.querier.owed() > 0 && !this.appUnmounted) {
            this.owedReplyHold = setTimeout(releaseOwedReplyHold, OWED_REPLY_HOLD_MS, this, stdin);
            this.owedReplyHold.unref?.();
          } else {
            if (this.querier && this.querier.owed() > 0)
              getSecondRootError().get(this.props.stdout)?.drainStdin();
            setRawModeSafe(stdin, false);
          }
        this.querier?.setInputAttached(false);
        stdin.removeListener("readable", this.handleReadable);
        stdin.unref();
      }
    };
    flushIncomplete = () => {
      this.incompleteEscapeTimer = null;
      if (!hasPendingInput(this.keyReader)) return;
      if (this.props.stdin.readableLength > 0) {
        this.incompleteEscapeTimer = setTimeout(this.flushIncomplete, ESC_FLUSH_TIMEOUT_MS);
        return;
      }
      let startTime = performance.now();
      this.applyKeysRead(flushInputReader(this.keyReader, startTime), startTime);
    };
    processInput = (chunk, now, isReadLate) => {
      this.applyKeysRead(feedInputReader(this.keyReader, chunk, now, isReadLate), now);
    };
    applyKeysRead({ keys, reader, wakeAt }, now) {
      this.keyReader = reader;
      if (this.incompleteEscapeTimer) {
        clearTimeout(this.incompleteEscapeTimer);
        this.incompleteEscapeTimer = null;
      }
      if (wakeAt !== null)
        this.incompleteEscapeTimer = setTimeout(this.flushIncomplete, Math.max(0, wakeAt - now));
      if (keys.length > 0) {
        if (keys.some(isKeyOrPaste)) this.props.onInputPriorityFrame();
        let readArrivedAt = this.readArrivedAt;
        this.readArrivedAt = Date.now();
        try {
          reconcilerAlias.discreteUpdates(processKeysInBatch, this, keys, false, undefined);
        } finally {
          this.readArrivedAt = readArrivedAt;
        }
      }
    }
    inputNow = () => this.readArrivedAt ?? Date.now();
    handleReadable = () => {
      let now = performance.now();
      if (now - this.lastStdinTime > STDIN_IDLE_REASSERT_MS) this.props.onStdinResume?.();
      this.lastStdinTime = now;
      let isLate = this.loopWatch.isLate(now);
      try {
        let chunk;
        while ((chunk = this.props.stdin.read()) !== null) this.processInput(chunk, now, isLate);
      } catch (error) {
        logError(
          withTelemetryMessage(toError(error), "stdin readable handler threw during input processing"),
        );
        let { stdin } = this.props;
        if (this.rawModeEnabledCount > 0 && !stdin.listeners("readable").includes(this.handleReadable)) {
          logForDebugging("handleReadable: re-attaching stdin readable listener after error recovery", {
            level: "warn",
          });
          stdin.addListener("readable", this.handleReadable);
        }
      }
    };
    handleInput = (input) => {
      if (input === "\x03" && this.props.exitOnCtrlC) this.handleExit();
    };
    handleExit = (error) => {
      if (this.isRawModeSupported()) this.handleSetRawMode(false);
      this.props.onExit(error);
    };
    attachProbeDeferred = false;
    appUnmounted = false;
    get hasReleasedTerminal() {
      return (
        this.appUnmounted ||
        isTerminalShutdown() ||
        getSecondRootError().get(this.props.stdout)?.hasUnmounted === true
      );
    }
    handleTerminalFocus = (event) => {
      let terminalFocus = getTerminalFocus();
      if (!event || Date.now() - this.lastActivationInputTime >= WINDOW_ACTIVATION_WINDOW_MS)
        this.windowActivationClickArmed = true;
      useAwaySummary(event);
      if (!event) this.props.onHoverLost?.();
      if (event) this.refreshTmuxPane(true);
      if (event && terminalFocus === "blurred") this.reprobeCellPixels();
      if (event && terminalFocus === "blurred")
        getSecondRootError().get(this.props.stdout)?.proactiveAtlasResetOnFocus();
      if (
        event &&
        terminalFocus !== "focused" &&
        env.CLAUDE_BG_BACKEND === "daemon" &&
        this.querier &&
        !this.attachProbeDeferred
      ) {
        this.attachProbeDeferred = true;
        waitForAttachSettle().then(() => {
          this.attachProbeDeferred = false;
          if (this.querier && !this.hasReleasedTerminal) {
            getTerminalProbeState().resetCapabilities();
            probeTerminalCapabilities(this.querier, getTerminalCapabilities());
          }
        });
      }
    };
    consumeWindowActivationLatch(lastActivationInputTime) {
      this.lastActivationInputTime = lastActivationInputTime;
      if (!this.windowActivationClickArmed) return false;
      this.windowActivationClickArmed = false;
      return true;
    }
    handleSuspend = () => {
      if (!this.isRawModeSupported()) return;
      let rawModeCountBeforeSuspend = this.rawModeEnabledCount;
      if (this.props.stdout.isTTY)
        this.props.stdout.write(SHOW_CURSOR + DISABLE_MOUSE_TRACKING + this.props.modes.suspend());
      while (this.rawModeEnabledCount > 0) this.handleSetRawMode(false);
      this.internal_eventEmitter.emit("suspend");
      let interval = setInterval(() => {}, 1073741824);
      let onSettle = () => {
        clearInterval(interval);
        process.removeListener("SIGCONT", onSettle);
        if (this.hasReleasedTerminal) return;
        for (let i = 0; i < rawModeCountBeforeSuspend; i++)
          if (this.isRawModeSupported()) this.handleSetRawMode(true);
        if (this.props.stdout.isTTY) {
          let isScreenReaderEnabled = this.props.isScreenReaderEnabled ?? false;
          this.props.stdout.write(
            this.props.modes.resume() +
              (env.CLAUDE_CODE_ACCESSIBILITY || isScreenReaderEnabled ? "" : HIDE_CURSOR),
          );
        }
        this.internal_eventEmitter.emit("resume");
      };
      process.on("SIGCONT", onSettle);
      if (this.owedReplyHold !== undefined) {
        getSecondRootError().get(this.props.stdout)?.drainStdin();
        releaseOwedReplyHold(this, this.props.stdin);
      }
      resumeNonBlockingStdout();
      process.kill(0, "SIGTSTP");
    };
  };
});
//@ chunk-2avr6cej.js:243361-243515 affinity
/**
 * 输入项是否算用户操作（粘贴、按键、非悬停移动的鼠标），用于空闲计时与附着后静默期过滤。
 */
function isUserInput(item) {
  switch (item.kind) {
    case "response":
    case "focus":
      return false;
    case "paste":
      return true;
    case "mouse":
      return !isHoverMotion(item.button);
    case "key":
      return item.name !== "mouse";
  }
}
//@ chunk-2avr6cej.js:243630-243688 placement
function isMouseButtonEvent(item) {
  return item.kind === "mouse" && (item.button & 32) === 0;
}
//@ chunk-2avr6cej.js:243741-245361 fingerprint (2.1.88 match: processKeysInBatch, 0.506)
/**
 * 在 discreteUpdates 里处理一批输入：JetBrains 终端滚动 bug 修正、方向键连发检测；终端应答交给 querier；鼠标交给 handleMouseEvent（滚动模式下忽略按键）；焦点事件；粘贴 → dispatchPasteEvent；Ctrl+Z 挂起；滚轮 → dispatchWheelEvent；其余 → dispatchKeyboardEvent，若处理器要求按“ESC + 键”重读则拆开重放。同批多个离散输入之间 flushSyncWork，保证逐个生效。
 */
function processKeysInBatch(app, items, isReplay, _unused2) {
  let inQuietDrain = isAttachSettled(Date.now());
  if (!inQuietDrain && items.some(isUserInput)) {
    updateLastInteractionTime();
    endStartupQuiet();
  }
  let filtered = fixJediTermWheelInput(
    app.jediTermInput,
    items,
    performance.now(),
    app.emitJediTermScrollBug,
  );
  detectArrowBurst(app, filtered);
  let soloKeypress = countWhere(filtered, isUserInput) === 1;
  let multipleDiscrete = countWhere(filtered, isDiscreteInput) > 1;
  let flushedOne = false;
  for (let item of filtered) {
    if (inQuietDrain && !isReplay && isUserInput(item) && !(item.kind === "key" && item.name === "left")) {
      logForDebugging(
        `attachQuietDrain: dropped ${item.kind} (ms_since_stamp=${Date.now() - getAttachStampMs()})`,
        {
          level: "debug",
        },
      );
      continue;
    }
    if (item.kind === "response") {
      if (!(app.querier?.onResponse(item.response) ?? false) && item.response.type === "kittyGraphics")
        app.props.terminalImages.refused(item.response.id, item.response.message);
      continue;
    }
    if (item.kind === "mouse") {
      noteFullscreenObserved();
      if (item.action === "press" && !isHoverMotion(item.button) && !getTerminalFocused())
        app.handleTerminalFocus(true);
      if (app.props.getMouseMode?.() === "scroll" && (item.button & 3) === 0) {
        app.pendingPastePress = null;
        continue;
      }
      if (isMouseButtonEvent(item)) {
        if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
        flushedOne = true;
      }
      handleMouseEvent(app, mouseToCells(app, item));
      continue;
    }
    if (item.kind === "focus") {
      if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
      app.handleTerminalFocus(item.focused);
      if (multipleDiscrete) reconcilerAlias.flushSyncWork();
      flushedOne = true;
      if (!item.focused && app.props.selection.isDragging) {
        finishSelection(app.props.selection);
        app.props.onSelectionChange();
      }
      continue;
    }
    if (
      item.kind === "paste" ||
      (item.name !== "wheelup" && item.name !== "wheeldown" && item.name !== "mouse")
    ) {
      if (!getTerminalFocused()) {
        useAwaySummary(true);
        reconcilerAlias.flushSyncWork();
      }
      app.consumeWindowActivationLatch(Date.now());
    }
    if (isKeyOrPaste(item)) {
      if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
      flushedOne = true;
    }
    if (item.kind === "paste") {
      app.props.dispatchPasteEvent(item.text);
      continue;
    }
    if (item.name === "z" && item.ctrl && isSuspendAllowed()) {
      app.handleSuspend();
      continue;
    }
    app.handleInput(item.sequence);
    if (item.name === "wheelup" || item.name === "wheeldown" || item.name === "mouse") {
      if (item.name !== "mouse") {
        noteFullscreenObserved();
        app.props.dispatchWheelEvent(wheelKeyToCells(app, item));
      }
    } else if (
      app.props.dispatchKeyboardEvent(item, {
        soloKeypress,
      })
    ) {
      reconcilerAlias.flushSyncWork();
      processKeysInBatch(app, splitEscPrefixedChunk(item.sequence ?? ""), true, undefined);
    }
  }
  if (multipleDiscrete && flushedOne) reconcilerAlias.flushSyncWork();
}
//@ chunk-2avr6cej.js:245361-245404 layout
/**
 * SGR 鼠标按钮码表示“无按键移动”（运动位 32 且按钮=3）。
 */
function isHoverMotion(button) {
  return (button & 32) !== 0 && (button & 3) === 3;
}
//@ chunk-2avr6cej.js:245404-245535 layout
/**
 * 像素鼠标模式下把像素坐标换算成格坐标（保留 fine 精确值）。
 */
function mouseToCells(app, mouse) {
  let cellPixels = getTerminalProbeState().cellPixels;
  if (!app.props.mouseReportsInPixels?.() || cellPixels === undefined) return mouse;
  return {
    ...mouse,
    ...pixelToCellPoint(mouse.col, mouse.row, cellPixels),
  };
}
//@ chunk-2avr6cej.js:245535-245721 layout
function wheelKeyToCells(app, key) {
  let cellPixels = getTerminalProbeState().cellPixels;
  let { col, row } = key;
  if (
    !app.props.mouseReportsInPixels?.() ||
    cellPixels === undefined ||
    col === undefined ||
    row === undefined
  )
    return key;
  let point = pixelToCellPoint(col, row, cellPixels);
  return {
    ...key,
    col: point.col,
    row: point.row,
  };
}
//@ chunk-2avr6cej.js:245721-245790 layout
function mouseMods(button) {
  return {
    shift: (button & 4) !== 0,
    alt: (button & 8) !== 0,
    ctrl: (button & 16) !== 0,
  };
}
//@ chunk-2avr6cej.js:245790-246283 layout
/**
 * 右键/中键松开（与按下位置相同）时：Windows/WSL/Linux 右键有选区则清除选区（复制已发生），否则粘贴系统剪贴板（xterm.js 除外）；Linux 中键粘贴 PRIMARY 选区。
 */
function handleMiddleOrRightClickPaste(app, button, col, row) {
  let pendingPastePress = app.pendingPastePress;
  app.pendingPastePress = null;
  if (
    pendingPastePress === null ||
    (button !== pendingPastePress.button && button !== 3) ||
    Math.abs(col - pendingPastePress.col) > CLICK_SLOP_CELLS ||
    Math.abs(row - pendingPastePress.row) > CLICK_SLOP_CELLS
  )
    return;
  let selection = app.props.selection;
  let platform = getPlatform();
  if (
    pendingPastePress.button === 2 &&
    (platform === "windows" || platform === "wsl" || platform === "linux")
  ) {
    if (hasSelection(selection)) {
      app.props.onSelectionTakeDown();
      clearSelection(selection);
      app.props.onSelectionChange();
    } else if (!isXtermJs())
      readClipboard("clipboard").then((clipboard) => {
        if (clipboard) app.props.dispatchPasteEvent(clipboard);
      });
  } else if (pendingPastePress.button === 1 && platform === "linux")
    readClipboard("primary").then((clipboard) => {
      if (clipboard) app.props.dispatchPasteEvent(clipboard);
    });
}
//@ chunk-2avr6cej.js:246283-248869 fingerprint (2.1.88 match: handleMouseEvent, 0.731)
/**
 * 处理一个鼠标事件：悬停（onHoverAt/onPointerHover）；按下时左键开始选区或计多击（双击选词、三击选行，窗口激活点击不计）；拖动更新选区；右/中键记下待粘贴；松开时结束选区，没有选区则当点击（onClickAt），点在超链接上且带 Cmd/Ctrl 时延迟 500ms 打开（多击取消）。
 */
function handleMouseEvent(app, mouse) {
  let selection = app.props.selection;
  let col = mouse.col - 1;
  let row = mouse.row - 1;
  let button = mouse.button & 3;
  let isHover = mouse.action === "press" && isHoverMotion(mouse.button);
  if (!isHover && app.lastHoverCol !== -1 && (col !== app.lastHoverCol || row !== app.lastHoverRow)) {
    app.lastHoverCol = -1;
    app.lastHoverRow = -1;
    app.lastHoverOnTarget = false;
    app.props.onHoverLost?.();
  }
  if (mouse.action === "press") {
    if (isHover) {
      if (selection.isDragging) {
        finishSelection(selection);
        app.props.onSelectionChange();
      }
      let sameCell = col === app.lastHoverCol && row === app.lastHoverRow;
      if (!sameCell) {
        app.lastHoverCol = col;
        app.lastHoverRow = row;
        app.props.onHoverAt(col, row);
      }
      if (!sameCell || (mouse.fine !== undefined && app.lastHoverOnTarget))
        app.lastHoverOnTarget =
          app.props.onPointerHover?.(col, row, mouseMods(mouse.button), mouse.fine) ?? false;
      return;
    }
    if ((mouse.button & 32) === 0) app.pendingPastePress = null;
    if ((mouse.button & 32) !== 0 && app.props.onPointerDrag !== undefined) {
      if (app.props.onPointerDrag(col, row, mouseMods(mouse.button), mouse.fine)) return;
    }
    if (button !== 0) {
      app.clickCount = 0;
      if (
        (mouse.button & 32) === 0 &&
        (button === 1 || button === 2) &&
        app.props.onPointerPress?.(col, row, button, mouseMods(mouse.button), mouse.fine)
      )
        return;
      if ((mouse.button & 32) === 0) app.consumeWindowActivationLatch(Date.now());
      if ((mouse.button & 32) === 0 && (button === 1 || button === 2))
        app.pendingPastePress = {
          button,
          col,
          row,
        };
      return;
    }
    if ((mouse.button & 32) !== 0) {
      app.props.onSelectionDrag(col, row);
      return;
    }
    if (selection.isDragging) {
      finishSelection(selection);
      app.props.onSelectionChange();
    }
    if (app.props.onPointerPress?.(col, row, 0, mouseMods(mouse.button), mouse.fine)) {
      app.clickCount = 0;
      return;
    }
    let now = Date.now();
    app.pressIsWindowActivation =
      app.consumeWindowActivationLatch(now) && now - getTerminalFocusGainedAt() < WINDOW_ACTIVATION_WINDOW_MS;
    if (app.pressIsWindowActivation) app.clickCount = 0;
    else {
      let nearLast =
        now - app.lastClickTime < MULTI_CLICK_MAX_MS &&
        Math.abs(col - app.lastClickCol) <= CLICK_SLOP_CELLS &&
        Math.abs(row - app.lastClickRow) <= CLICK_SLOP_CELLS;
      app.clickCount = nearLast ? app.clickCount + 1 : 1;
      app.lastClickTime = now;
      app.lastClickCol = col;
      app.lastClickRow = row;
    }
    if (app.clickCount >= 2) {
      if (app.pendingHyperlinkTimer && !app.pendingHyperlinkOpensInPanel) {
        clearTimeout(app.pendingHyperlinkTimer);
        app.pendingHyperlinkTimer = null;
      }
      let count = app.clickCount === 2 ? 2 : 3;
      app.props.onMultiClick(col, row, count);
      return;
    }
    app.props.onSelectionStart(col, row);
    selection.lastPressHadAlt = (mouse.button & 8) !== 0;
    app.props.onSelectionChange();
    return;
  }
  handleMiddleOrRightClickPaste(app, button, col, row);
  if (app.props.onPointerRelease?.(col, row, mouseMods(mouse.button), mouse.fine)) return;
  if (button !== 0) {
    if (!selection.isDragging) return;
    finishSelection(selection);
    app.props.onSelectionChange();
    return;
  }
  finishSelection(selection);
  if (!hasSelection(selection) && selection.anchor) {
    let handled = app.props.onClickAt(col, row, app.pressIsWindowActivation, mouseMods(mouse.button));
    if (handled === "stray" || handled === "repeat") {
      app.clickCount = 0;
      app.lastClickTime = 0;
    }
    if (handled === "unhandled" && !app.pressIsWindowActivation) {
      let url = app.props.getHyperlinkAt(col, row);
      if (
        url &&
        env.TERM_PROGRAM !== "vscode" &&
        !isXtermJs() &&
        ((mouse.button & 24) !== 0 ||
          terminalDetector.macCmdClickArrivesWithoutSgrModifierBit() ||
          isGhostty())
      ) {
        if (app.pendingHyperlinkTimer) clearTimeout(app.pendingHyperlinkTimer);
        app.pendingHyperlinkOpensInPanel = false;
        app.pendingHyperlinkTimer = setTimeout(
          (app, url) => {
            app.pendingHyperlinkTimer = null;
            app.pendingHyperlinkOpensInPanel = false;
            app.props.onOpenHyperlink(url);
          },
          MULTI_CLICK_MAX_MS,
          app,
          url,
        );
      }
    }
  }
  app.props.onSelectionChange();
}
//@ chunk-2avr6cej.js:248869-248885 sole-consumer
var ARROW_BURST_WINDOW_MS = 100;
var ARROW_BURST_THRESHOLD = 8;
//@ chunk-2avr6cej.js:248885-249424 sole-consumer
/**
 * 100ms 内同方向无修饰上/下方向键累计 ≥8 个时发出 arrow-burst 事件（滚轮被终端翻译成方向键的情况）。
 */
function detectArrowBurst(app, items) {
  let first = items[0];
  if (
    first?.kind !== "key" ||
    (first.name !== "up" && first.name !== "down") ||
    first.ctrl ||
    first.meta ||
    first.shift ||
    !items.every(
      (item) => item.kind === "key" && item.name === first.name && !item.ctrl && !item.meta && !item.shift,
    )
  ) {
    app.arrowWindow.length = 0;
    return;
  }
  if (app.arrowWindowDir !== first.name) {
    app.arrowWindow.length = 0;
    app.arrowWindowDir = first.name;
  }
  let startTime = performance.now();
  let arrowWindow = app.arrowWindow;
  arrowWindow.push({
    t: startTime,
    n: items.length,
  });
  while (arrowWindow.length > 0 && startTime - arrowWindow[0].t > ARROW_BURST_WINDOW_MS) arrowWindow.shift();
  let total = 0;
  for (let entry of arrowWindow) total += entry.n;
  if (total >= ARROW_BURST_THRESHOLD) {
    app.internal_eventEmitter.emit("arrow-burst", {
      direction: first.name,
      count: total,
    });
    app.props.onStdinResume?.();
    arrowWindow.length = 0;
  }
}
export { isMouseButtonEvent, App };
