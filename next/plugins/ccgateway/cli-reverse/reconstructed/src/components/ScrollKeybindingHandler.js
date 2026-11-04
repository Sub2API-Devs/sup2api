/**
 * components/ScrollKeybindingHandler.tsx
 *
 * 全屏滚动按键与滚轮：PageUp/Down、行滚动、鼠标拖拽滚动、滚轮加速、模态分页器动作与选区清除规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ScrollKeybindingHandler.tsx
 * pieces: chunk-18hwfzwa.js (22), chunk-24t3dkzb.js (2), chunk-tzghj6zv.js (6)
 * attribution: affinity 1, fingerprint 12, layout 6, callgraph-fingerprint 1, sole-consumer 4, placement 6
 */
import { env } from "../utils/env.js";
import { clearKeptClawdPose } from "./LogoV2/Clawd.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import {
  init_react_production,
  useRef,
  useEffectEvent,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { getClipboardPath, getOsc52Utf8Warning } from "../ink/termio/osc.js";
import { countGraphemes } from "../ink/output.js";
import {
  hasUnknownSequencePrintingBug,
  describeMetaKey,
  hasCursorUpViewportYankBug,
} from "../ink/terminal.js";
import { currentToolPermissionContext } from "../utils/permissions/currentPermissionContext.js";
import { useClock } from "../ink/components/ClockContext.js";
import {
  WHEEL_GESTURE_GAP_MS,
  takeArrowBoost,
  createJediTermInputState,
  isJediTermScrollBugConfirmed,
} from "../ink/wheelScroll.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { logForDebugging } from "../utils/debug.js";
import { useStdin, useTheme_2 } from "./design-system/ThemeProvider.js";
import { useSelection } from "../ink/components/Input.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useInputSelectionBridge } from "../ink/inputSelectionBridge.js";
import { useNotifications } from "../context/notifications.js";
import { useOverlayFlagA } from "../context/overlayContext.js";
import { getGlobalConfig } from "../utils/config.js";
import { getSessionsSinceTipShown } from "../services/tips/tipHistory.js";
import { recordTipShown } from "../services/tips/tipIds.js";
import { countPageJump, countScroll, markScrollbackCapReached } from "../utils/scrollTelemetry.js";
import { recordScrollPosition, recordScrollInput } from "../ink/widest-line.js";
import { isSelectionFullyOffscreen } from "../ink/selection.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { useCopyOnSelect, useSelectionBgColor } from "../hooks/useCopyOnSelect.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-24t3dkzb.js:1978-2023 placement
function scrollStepLines(isSelecting, isPaging, isFast) {
  return !isPaging && (isSelecting || false || isFast) ? 3 : 1;
}
//@ chunk-24t3dkzb.js:2023-2169 fingerprint (2.1.88 match: readScrollSpeedBase, 1)
function readScrollSpeedBase(isSelecting, isPaging, isFast) {
  let baseLines = scrollStepLines(isSelecting, isPaging, isFast);
  let raw = env.CLAUDE_CODE_SCROLL_SPEED;
  if (!raw) return baseLines;
  let n = parseFloat(raw);
  return Number.isNaN(n) || n <= 0 ? baseLines : Math.min(n, 20);
}
//@ chunk-tzghj6zv.js:2704-2950 fingerprint (2.1.88 match: shouldClearSelectionOnKey, 0.934)
function shouldClearSelectionOnKey(key) {
  if (key.wheelUp || key.wheelDown || key.escape) return false;
  if (key.pageUp || key.pageDown) return false;
  if ((key.home || key.end) && key.ctrl) return false;
  if (
    (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow || key.home || key.end) &&
    (key.shift || key.meta || key.super)
  )
    return false;
  return true;
}
//@ chunk-tzghj6zv.js:2950-3242 placement
function isPagerPassthroughKey(key) {
  if (key.name === "escape" || key.name === "pageup" || key.name === "pagedown") return false;
  if ((key.name === "home" || key.name === "end") && key.ctrl) return false;
  if (
    (key.name === "left" ||
      key.name === "right" ||
      key.name === "up" ||
      key.name === "down" ||
      key.name === "home" ||
      key.name === "end") &&
    (key.shift || key.meta || key.superKey)
  )
    return false;
  return true;
}
//@ chunk-tzghj6zv.js:3242-3502 placement
function modalPagerAction(selection, copyOnSelect, onCopied) {
  return (event) => {
    if (!selection.hasSelection()) return;
    if (event.key === "c" && !event.meta && (event.ctrl || event.superKey)) {
      if (copyOnSelect.peek() !== null) selection.clearSelection();
      else {
        let copiedText = selection.copySelection();
        if (copiedText) onCopied?.(copiedText);
      }
      if (event.ctrl && !event.shift) clearKeptClawdPose();
      event.consume();
      return;
    }
    if (isPagerPassthroughKey(event)) selection.clearSelection();
  };
}
//@ chunk-tzghj6zv.js:3502-3638 placement
/**
 * 在 Scroll 上下文注册 selection:clear：有选区时清除选区。
 */
function useSelectionClearKeybinding(selection, isActive = true) {
  MessageActionsKeybindings(
    {
      "selection:clear": () => {
        if (!selection.hasSelection()) return false;
        selection.clearSelection();
        clearKeptClawdPose();
      },
    },
    {
      context: "Scroll",
      isActive,
    },
  );
}
//@ chunk-tzghj6zv.js:3638-3642 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:3638", () => {
  init_react_production();
});
//@ chunk-tzghj6zv.js:3642-4400 placement
/**
 * 选中文字复制后的通知：按复制通道（系统剪贴板、tmux buffer、OSC 52）给出文案与时长，OSC 52 含非 UTF-8 风险时加警告。
 */
function buildCopiedNotification(text) {
  let clipboardPath = getClipboardPath();
  let charCount = countGraphemes(text);
  let charNoun = charCount === 1 ? "char" : "chars";
  let clipboardMessage;
  let shortMessage;
  switch (clipboardPath) {
    case "native":
      clipboardMessage = `copied ${charCount} ${charNoun} to clipboard`;
      shortMessage = `copied ${charCount} ${charNoun}`;
      break;
    case "tmux-buffer":
      clipboardMessage = `copied ${charCount} ${charNoun} to tmux buffer \xB7 paste with prefix + ]`;
      shortMessage = "copied \xB7 paste with prefix + ]";
      break;
    case "osc52":
      if (hasUnknownSequencePrintingBug()) {
        clipboardMessage = `couldn't copy ${charCount} ${charNoun} \xB7 select with ${describeMetaKey()} held, then use your terminal's Copy`;
        break;
      }
      clipboardMessage = `sent ${charCount} ${charNoun} via OSC 52 \xB7 if paste fails, hold ${describeMetaKey()} while selecting for native copy`;
      shortMessage = `sent ${charCount} ${charNoun} via OSC 52`;
      break;
  }
  let copiedNotification = getOsc52Utf8Warning(text);
  if (copiedNotification) clipboardMessage = `\u26A0 ${copiedNotification} \xB7 ${clipboardMessage}`;
  return {
    key: "selection-copied",
    kind: "feedback",
    text: clipboardMessage,
    color: currentToolPermissionContext() ? (copiedNotification ? "warning" : undefined) : "suggestion",
    priority: "immediate",
    timeoutMs: copiedNotification ? 6000 : clipboardPath === "native" ? 2000 : 4000,
    ...(copiedNotification || shortMessage === undefined
      ? {}
      : {
          row1Hint: shortMessage,
        }),
  };
}
//@ chunk-18hwfzwa.js:108851-108876 affinity
var DRAG_SCROLL_STEP_ROWS = 2;
var DRAG_SCROLL_TICK_MS = 50;
var MAX_DRAG_TICKS = 200;
//@ chunk-18hwfzwa.js:108876-110291 fingerprint (2.1.88 match: useDragToScroll, 0.788)
function useDragToScroll(scrollRef, selection, isActive, onScroll, options) {
  let clock = useClock();
  let timerRef = useRef(null);
  let dirRef = useRef(0);
  let lastScrolledDirRef = useRef(0);
  let ticksRef = useRef(0);
  let onScrollRef = useEffectEvent((moved, handle) => onScroll?.(moved, handle));
  let requireScope = options?.requireScope ?? false;
  useEffect(() => {
    if (!isActive) return;
    function stop() {
      dirRef.current = 0;
      timerRef.current?.();
      timerRef.current = null;
    }
    function tick() {
      let sel = selection.getState();
      let handle = scrollRef.handle;
      let dir = dirRef.current;
      if (!sel?.isDragging || !sel.focus || !handle || dir === 0 || ++ticksRef.current > MAX_DRAG_TICKS) {
        stop();
        return;
      }
      if (handle.getPendingDelta() !== 0) return;
      if (dir < 0) {
        if (handle.getScrollTop() <= 0) {
          stop();
          return;
        }
        handle.scrollBy(-DRAG_SCROLL_STEP_ROWS);
      } else {
        let max = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
        if (handle.getScrollTop() >= max) {
          stop();
          return;
        }
        handle.scrollBy(DRAG_SCROLL_STEP_ROWS);
      }
      onScrollRef(false, handle);
    }
    function start(dir) {
      lastScrolledDirRef.current = dir;
      if (dirRef.current === dir) return;
      stop();
      dirRef.current = dir;
      ticksRef.current = 0;
      tick();
      if (dirRef.current === dir) {
        let tickNext = () => {
          tick();
          if (dirRef.current !== 0) timerRef.current = clock.setTimeout(tickNext, DRAG_SCROLL_TICK_MS);
        };
        timerRef.current = clock.setTimeout(tickNext, DRAG_SCROLL_TICK_MS);
      }
    }
    function check() {
      let s_0 = scrollRef.handle;
      if (!s_0) {
        stop();
        return;
      }
      let sel = selection.getState();
      if (!isSameScrollScope(sel, s_0) || (requireScope && !sel?.scope?.node)) {
        lastScrolledDirRef.current = 0;
        stop();
        return;
      }
      let top = s_0.getViewportTop();
      let bottom = top + s_0.getViewportHeight() - 1;
      if (!sel?.isDragging || (sel.scrolledOffAbove.length === 0 && sel.scrolledOffBelow.length === 0))
        lastScrolledDirRef.current = 0;
      let dir = dragScrollDirection(sel, top, bottom, lastScrolledDirRef.current);
      if (dir === 0) {
        if (lastScrolledDirRef.current !== 0 && sel?.focus) {
          let want = sel.focus.row < top ? -1 : sel.focus.row > bottom ? 1 : 0;
          if (want !== 0 && want !== lastScrolledDirRef.current) {
            sel.scrolledOffAbove = [];
            sel.scrolledOffBelow = [];
            sel.scrolledOffAboveSW = [];
            sel.scrolledOffBelowSW = [];
            lastScrolledDirRef.current = 0;
          }
        }
        stop();
      } else start(dir);
    }
    let unsubscribe = selection.subscribe(check);
    return () => {
      unsubscribe();
      stop();
      lastScrolledDirRef.current = 0;
    };
  }, [clock, isActive, requireScope, scrollRef, selection]);
}
//@ chunk-18hwfzwa.js:110291-110363 layout
function isSameScrollScope(event, scope) {
  let node = event?.scope?.node;
  return !node || node === scope?.getDomElement();
}
//@ chunk-18hwfzwa.js:110363-110555 fingerprint (2.1.88 match: dragScrollDirection, 1)
function dragScrollDirection(sel, top, bottom, alreadyScrollingDir = 0) {
  if (!sel?.isDragging || !sel.anchor || !sel.focus) return 0;
  let row = sel.focus.row;
  let want = row < top ? -1 : row > bottom ? 1 : 0;
  if (alreadyScrollingDir !== 0) return want === alreadyScrollingDir ? want : 0;
  if (sel.anchor.row < top || sel.anchor.row > bottom) return 0;
  return want;
}
//@ chunk-18hwfzwa.js:110555-110671 layout
var WHEEL_ACCEL_WINDOW_MS = 40;
var WHEEL_ACCEL_STEP = 0.3;
var WHEEL_ACCEL_CAP_FACTOR = 6;
var WHEEL_BURST_FACTOR = 3;
var WHEEL_FLIP_WINDOW_MS = 200;
var WHEEL_DECAY_GAIN = 15;
var WHEEL_DECAY_BASE_FACTOR = 15;
var WHEEL_DECAY_STEP = 3;
var WHEEL_MODE_TIMEOUT_MS = 1500;
var WHEEL_DECAY_HALF_LIFE_MS = 150;
var WHEEL_DECAY_BOOST = 7;
var WHEEL_FLIP_GUARD_TICKS = 5;
var WHEEL_DECAY_CAP_AFTER_MS = 80;
var WHEEL_DECAY_CAP_LOW = 3;
var WHEEL_DECAY_CAP_HIGH = 36;
var WHEEL_RESET_WINDOW_MS = 500;
//@ chunk-18hwfzwa.js:110671-110830 callgraph-fingerprint (2.1.88 match: selectionFocusMoveForKey, 0.247)
function selectionFocusMoveForKey(input, key) {
  if (key.upArrow || key.downArrow || key.home || key.end) return true;
  if (input.length !== 1) return false;
  if (key.ctrl) return "udbfnp".includes(input);
  return "jkgGb {}".includes(input);
}
//@ chunk-18hwfzwa.js:110830-110867 layout
var WHEEL_FRACTION_STEP = 0.35;
var WHEEL_ACCEL_BASE_STEP = 0.008;
var WHEEL_ACCEL_PER_TICK = 0.4;
var WHEEL_ACCEL_MAX = 4;
//@ chunk-18hwfzwa.js:110867-112542 fingerprint (2.1.88 match: computeWheelStep, 0.674)
function computeWheelStep(state, dir, now) {
  if (state.jediTerm.trackpadGesture) {
    let gapMs = now - state.time;
    if (!state.jbBypass || gapMs > WHEEL_GESTURE_GAP_MS) {
      state.jbBypass = true;
      state.frac = 0;
      state.mult = 1;
    } else if (dir !== state.dir) state.frac = 0;
    state.dir = dir;
    state.time = now;
    let boost = takeArrowBoost(state.jediTerm);
    if (state.accelEnabled)
      state.mult = Math.min(
        WHEEL_ACCEL_MAX,
        state.mult + WHEEL_ACCEL_BASE_STEP + boost * WHEEL_ACCEL_PER_TICK,
      );
    state.frac += WHEEL_FRACTION_STEP * state.mult;
    let floored = Math.floor(state.frac);
    state.frac -= floored;
    return floored;
  }
  if (state.jbBypass) {
    state.jbBypass = false;
    state.pendingFlip = false;
    state.wheelMode = false;
    state.burstCount = 0;
    state.frac = 0;
    state.dir = 0;
  }
  if (!state.useDecayCurve) {
    if (state.wheelFlood) {
      let idleMs = now - state.time;
      state.time = now;
      state.dir = dir;
      state.mult = idleMs > WHEEL_ACCEL_WINDOW_MS ? state.base * WHEEL_BURST_FACTOR : state.base;
      return Math.max(1, Math.floor(state.mult));
    }
    if (state.wheelMode && now - state.time > WHEEL_MODE_TIMEOUT_MS) {
      state.wheelMode = false;
      state.burstCount = 0;
      state.mult = state.base;
    }
    if (state.pendingFlip) {
      state.pendingFlip = false;
      if (dir !== state.dir || now - state.time > WHEEL_FLIP_WINDOW_MS) {
        state.dir = dir;
        state.time = now;
        state.mult = state.base;
        return Math.max(1, Math.floor(state.mult));
      }
      state.wheelMode = true;
    }
    let gap = now - state.time;
    if (dir !== state.dir && state.dir !== 0) {
      state.pendingFlip = true;
      state.time = now;
      return 0;
    }
    state.dir = dir;
    state.time = now;
    if (state.wheelMode)
      if (gap < WHEEL_FLIP_GUARD_TICKS) {
        if (++state.burstCount >= 5) {
          state.wheelMode = false;
          state.burstCount = 0;
          state.mult = state.base;
        } else return 1;
      } else state.burstCount = 0;
    if (state.wheelMode && state.accelEnabled) {
      let m = Math.pow(0.5, gap / WHEEL_DECAY_HALF_LIFE_MS);
      let cap = Math.max(WHEEL_DECAY_BASE_FACTOR * Math.min(state.base, 1), state.base * 2);
      let next = 1 + (state.mult - 1) * m + WHEEL_DECAY_GAIN * m;
      state.mult = Math.min(cap, next, state.mult + WHEEL_DECAY_STEP);
      return Math.max(1, Math.floor(state.mult));
    }
    if (gap > WHEEL_ACCEL_WINDOW_MS || !state.accelEnabled) state.mult = state.base;
    else {
      let cap = Math.max(WHEEL_ACCEL_CAP_FACTOR * Math.min(state.base, 1), state.base * 2);
      state.mult = Math.min(cap, state.mult + WHEEL_ACCEL_STEP);
    }
    return Math.max(1, Math.floor(state.mult));
  }
  let gap = now - state.time;
  let sameDir = dir === state.dir;
  state.time = now;
  state.dir = dir;
  if (sameDir && gap < WHEEL_FLIP_GUARD_TICKS) return 1;
  if (!state.accelEnabled) return Math.max(1, Math.floor(state.base));
  if (!sameDir || gap > WHEEL_RESET_WINDOW_MS) {
    state.mult = Math.max(2, state.base);
    state.frac = 0;
  } else {
    let m = Math.pow(0.5, gap / WHEEL_DECAY_HALF_LIFE_MS);
    let cap = gap >= WHEEL_DECAY_CAP_AFTER_MS ? WHEEL_DECAY_CAP_LOW : WHEEL_DECAY_CAP_HIGH;
    state.mult = Math.min(cap, 1 + (state.mult - 1) * m + WHEEL_DECAY_BOOST * m);
  }
  let total = state.mult + state.frac;
  let rows = Math.floor(total);
  state.frac = total - rows;
  return rows;
}
//@ chunk-18hwfzwa.js:112542-112735 fingerprint (2.1.88 match: initWheelAccel, 0.683)
function initWheelAccel(
  useDecayCurve = false,
  base = 1,
  wheelFlood = false,
  accelEnabled = true,
  jediTerm = createJediTermInputState(),
) {
  return {
    time: 0,
    mult: base,
    dir: 0,
    useDecayCurve,
    frac: 0,
    base,
    pendingFlip: false,
    wheelMode: false,
    burstCount: 0,
    jbBypass: false,
    jediTerm,
    wheelFlood,
    accelEnabled,
  };
}
//@ chunk-18hwfzwa.js:112735-113142 fingerprint (2.1.88 match: initAndLogWheelAccel, 0.434)
function initAndLogWheelAccel(jediTermInput) {
  let xtermJs = hasCursorUpViewportYankBug();
  let accelEnabled = resolveSetting("wheelScrollAccelerationEnabled", true).value;
  logForDebugging(
    `wheel accel: ${xtermJs.useDecayCurve ? "decay" : "window (native)"} \xB7 base=${xtermJs.base} \xB7 platform=${xtermJs.platform} \xB7 TERM_PROGRAM=${xtermJs.termProgram}${xtermJs.wheelFlood ? " \xB7 wheelFlood" : ""}${xtermJs.jediTerm ? " \xB7 jediTerm" : ""}${isJediTermScrollBugConfirmed(jediTermInput) ? " \xB7 jbBugConfirmed" : ""}${accelEnabled ? "" : " \xB7 accelDisabled"}`,
  );
  return initWheelAccel(xtermJs.useDecayCurve, xtermJs.base, xtermJs.wheelFlood, accelEnabled, jediTermInput);
}
//@ chunk-18hwfzwa.js:113142-113375 layout
/**
 * 返回滚轮步长计算函数：按终端（含 JediTerm）初始化滚轮加速状态并缓存，滚动速度基准变化时重建。
 */
function useWheelScrollStep() {
  let stateRef = useRef(null);
  let yankBugRef = useRef(null);
  let { internal_jediTermInput } = useStdin();
  return (dir, now) => {
    if (hasCursorUpViewportYankBug() !== yankBugRef.current) {
      yankBugRef.current = hasCursorUpViewportYankBug();
      stateRef.current = null;
    }
    stateRef.current ??= initAndLogWheelAccel(internal_jediTermInput);
    stateRef.current.base = hasCursorUpViewportYankBug().base;
    let state = stateRef.current;
    return {
      rows: computeWheelStep(state, dir, now),
      state,
    };
  };
}
//@ chunk-18hwfzwa.js:113375-113420 layout
var AUTO_COPY_CONFIG_HINT = "auto-copy-config-hint";
var AUTO_COPY_HINT_SESSION_LIMIT = 10;
var AUTO_COPY_HINT_SKIP_SESSIONS = 5;
//@ chunk-18hwfzwa.js:113420-117547 fingerprint (2.1.88 match: ScrollKeybindingHandler, 0.573)
function ScrollKeybindingHandler({
  scrollViewport,
  isActive,
  onScroll,
  recordsTelemetry,
  isModal = false,
  yieldsPageKeysWhenContentFits = false,
}) {
  let selection = useSelection();
  let keybindingContext = useKeybindingContext();
  let inputSelectionBridge = useInputSelectionBridge();
  let { addNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let overlayFlagA = useOverlayFlagA();
  let isActive_2 = isActive && !overlayFlagA;
  let wheelScrollStep = useWheelScrollStep();
  let wheelAccel = useRef(-1);
  useScrollAnomalyNotices(addNotification);
  function copyWithNotice(text, fromSelection = false) {
    let copiedNotification = buildCopiedNotification(text);
    if (fromSelection && getClipboardPath() === "native" && getGlobalConfig().copyOnSelect === undefined) {
      if (wheelAccel.current === -1)
        if (getSessionsSinceTipShown(AUTO_COPY_CONFIG_HINT) >= AUTO_COPY_HINT_SESSION_LIMIT) {
          recordTipShown(AUTO_COPY_CONFIG_HINT, storageV5);
          wheelAccel.current = 0;
        } else wheelAccel.current = AUTO_COPY_HINT_SKIP_SESSIONS;
      if (wheelAccel.current < AUTO_COPY_HINT_SKIP_SESSIONS) {
        wheelAccel.current++;
        addNotification({
          ...copiedNotification,
          text: `${copiedNotification.text} \xB7 disable auto-copy in /config`,
          row1Hint: undefined,
          timeoutMs: Math.max(copiedNotification.timeoutMs, 4000),
        });
        return;
      }
    }
    addNotification(copiedNotification);
  }
  function copyAndToast() {
    let text_0 = selection.copySelection();
    if (text_0) copyWithNotice(text_0);
  }
  let shouldRecordTelemetry = recordsTelemetry ?? onScroll != null;
  MessageActionsKeybindings(
    {
      "scroll:pageUp": () => {
        let s_0 = scrollViewport.handle;
        if (!s_0) return;
        if (yieldsPageKeysWhenContentFits && s_0.getScrollHeight() <= s_0.getViewportHeight()) return false;
        if (shouldRecordTelemetry) countPageJump();
        let delta = -Math.max(1, Math.floor(s_0.getViewportHeight() / 2));
        let jumped = jumpBy(s_0, delta, shouldRecordTelemetry);
        onScroll?.(jumped, s_0);
      },
      "scroll:pageDown": () => {
        let s_1 = scrollViewport.handle;
        if (!s_1) return;
        if (yieldsPageKeysWhenContentFits && s_1.getScrollHeight() <= s_1.getViewportHeight()) return false;
        if (shouldRecordTelemetry) countPageJump();
        let d_0 = Math.max(1, Math.floor(s_1.getViewportHeight() / 2));
        let jumped = jumpBy(s_1, d_0, shouldRecordTelemetry);
        onScroll?.(jumped, s_1);
      },
      "scroll:lineUp": () => {
        let handle = scrollViewport.handle;
        if (!handle || handle.getScrollHeight() <= handle.getViewportHeight()) return false;
        if (shouldRecordTelemetry) countScroll();
        let startTime = performance.now();
        let { rows, state } = wheelScrollStep(-1, startTime);
        recordScrollPosition(handle);
        recordScrollInput(-1, rows, state, startTime);
        scrollUp(handle, rows, shouldRecordTelemetry);
        onScroll?.(false, handle);
      },
      "scroll:lineDown": () => {
        let s_3 = scrollViewport.handle;
        if (!s_3 || s_3.getScrollHeight() <= s_3.getViewportHeight()) return false;
        if (shouldRecordTelemetry) countScroll();
        let startTime = performance.now();
        let { rows, state } = wheelScrollStep(1, startTime);
        recordScrollPosition(s_3);
        recordScrollInput(1, rows, state, startTime);
        let reachedBottom = scrollDown(s_3, rows);
        onScroll?.(reachedBottom, s_3);
      },
      "scroll:top": () => {
        let s_4 = scrollViewport.handle;
        if (!s_4) return;
        if (shouldRecordTelemetry) markScrollbackCapReached();
        s_4.scrollTo(0);
        onScroll?.(false, s_4);
      },
      "scroll:bottom": () => {
        let s_5 = scrollViewport.handle;
        if (!s_5) return;
        s_5.scrollToBottom();
        onScroll?.(true, s_5);
      },
      "selection:copy": copyAndToast,
    },
    {
      context: "Scroll",
      isActive: isActive_2,
    },
  );
  useSelectionClearKeybinding(selection, isActive_2);
  function jumpTo(target) {
    let handle = scrollViewport.handle;
    if (!handle) return;
    if (shouldRecordTelemetry) {
      if (target === "lineUp" || target === "lineDown") countScroll();
      else if (target === "top") markScrollbackCapReached();
      else if (target !== "bottom") countPageJump();
    }
    let step = applyModalPagerAction(handle, target, shouldRecordTelemetry);
    if (step === null) return;
    onScroll?.(step, handle);
  }
  MessageActionsKeybindings(
    {
      "scroll:halfPageUp": () => jumpTo("halfPageUp"),
      "scroll:halfPageDown": () => jumpTo("halfPageDown"),
      "scroll:fullPageUp": () => jumpTo("fullPageUp"),
      "scroll:fullPageDown": () => jumpTo("fullPageDown"),
    },
    {
      context: "Scroll",
      isActive: isActive_2,
    },
  );
  MessageActionsKeybindings(
    {
      "scroll:lineUp": () => jumpTo("lineUp"),
      "scroll:lineDown": () => jumpTo("lineDown"),
      "scroll:halfPageUp": () => jumpTo("halfPageUp"),
      "scroll:halfPageDown": () => jumpTo("halfPageDown"),
      "scroll:fullPageUp": () => jumpTo("fullPageUp"),
      "scroll:fullPageDown": () => jumpTo("fullPageDown"),
      "scroll:top": () => jumpTo("top"),
      "scroll:bottom": () => jumpTo("bottom"),
    },
    {
      context: "Transcript",
      isActive: isActive_2 && isModal,
    },
  );
  function scrollSelectionFocus(direction) {
    if (!selection.hasSelection()) return false;
    let event = selection.getState();
    if (event && isSelectionFullyOffscreen(event)) return;
    if (direction === "up" || direction === "down") {
      let handle = scrollViewport.handle;
      if (handle && isSameScrollScope(event, handle) && event?.anchor && event.focus) {
        let viewportTop = handle.getViewportTop();
        let viewportBottom = viewportTop + handle.getViewportHeight() - 1;
        let anchorVisible = event.anchor.row >= viewportTop && event.anchor.row <= viewportBottom;
        let atTopEdge = anchorVisible && direction === "up" && event.focus.row <= viewportTop;
        let atBottomEdge = anchorVisible && direction === "down" && event.focus.row >= viewportBottom;
        if (atTopEdge || atBottomEdge) {
          let max_0 = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
          let canScroll = atTopEdge ? handle.getScrollTop() > 0 : handle.getScrollTop() < max_0;
          if (handle.getPendingDelta() === 0 && canScroll) {
            sticky_5.invalidate();
            event.focus = {
              col: event.focus.col,
              row: atTopEdge ? viewportTop : viewportBottom,
            };
            event.virtualFocusRow = atTopEdge ? viewportTop - 1 : viewportBottom + 1;
            event.virtualFocusCol = undefined;
            handle.scrollBy(atTopEdge ? -1 : 1);
            onScroll?.(false, handle);
          }
          return;
        }
      }
    }
    selection.moveFocus(direction);
  }
  MessageActionsKeybindings(
    {
      "selection:extendLeft": () => scrollSelectionFocus("left"),
      "selection:extendRight": () => scrollSelectionFocus("right"),
      "selection:extendUp": () => scrollSelectionFocus("up"),
      "selection:extendDown": () => scrollSelectionFocus("down"),
      "selection:extendLineStart": () => scrollSelectionFocus("lineStart"),
      "selection:extendLineEnd": () => scrollSelectionFocus("lineEnd"),
    },
    {
      context: "Scroll",
      isActive: isActive_2,
    },
  );
  usePreDispatchKeyHandler(
    (input, key) => {
      if (!selection.hasSelection()) return;
      if (key.ctrl && !key.shift && !key.meta && input === "c") {
        let stickySelection = sticky_5.peek();
        if (stickySelection !== null) {
          selection.clearSelection();
          copyWithNotice(stickySelection);
        } else copyAndToast();
        clearKeptClawdPose();
        return true;
      }
      if (isModal && selectionFocusMoveForKey(input, key)) return;
      if (!isModal && (key.backspace || key.delete) && !key.ctrl && !key.meta && !key.shift && !key.super) {
        let state = selection.getState();
        if (state && inputSelectionBridge.tryDelete(state)) {
          selection.clearSelection();
          return true;
        }
      }
      if (shouldClearSelectionOnKey(key)) {
        if (keybindingContext) {
          let resolved = keybindingContext.resolve(input, key, [
            ...keybindingContext.activeContexts,
            "Scroll",
            "Global",
          ]);
          if (resolved.type === "match" && resolved.action === "selection:copy") return;
          if (resolved.type === "match" && resolved.action === "selection:clear") {
            selection.clearSelection();
            clearKeptClawdPose();
            return;
          }
        }
        selection.clearSelection();
      }
    },
    {
      isActive: isActive_2,
    },
  );
  useDragToScroll(scrollViewport, selection, isActive_2, onScroll);
  let sticky_5 = useCopyOnSelect(selection, isActive_2, (d_5) => copyWithNotice(d_5, true));
  useSelectionBgColor(selection);
  return null;
}
//@ chunk-18hwfzwa.js:117547-117698 layout
function scrollToBottomRespectingAutoScroll(scrollHandle) {
  if (resolveSetting("autoScrollEnabled", true).value) scrollHandle.scrollToBottom();
  else scrollHandle.scrollTo(Math.max(0, scrollHandle.getScrollHeight() - scrollHandle.getViewportHeight()));
  return true;
}
//@ chunk-18hwfzwa.js:117698-117913 fingerprint (2.1.88 match: jumpBy, 0.903)
function jumpBy(handle, delta, markCap = true) {
  let max = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
  let target = Math.min(handle.getScrollTop(), max) + handle.getPendingDelta() + delta;
  if (target >= max) return scrollToBottomRespectingAutoScroll(handle);
  if (target <= 0 && markCap) markScrollbackCapReached();
  handle.scrollTo(Math.max(0, target));
  return false;
}
//@ chunk-18hwfzwa.js:117913-118074 fingerprint (2.1.88 match: scrollDown, 0.903)
function scrollDown(s, amount) {
  let max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
  if (s.getScrollTop() + s.getPendingDelta() + amount >= max) return scrollToBottomRespectingAutoScroll(s);
  s.scrollBy(amount);
  return false;
}
//@ chunk-18hwfzwa.js:118074-118190 fingerprint (2.1.88 match: scrollUp, 1)
function scrollUp(handle, amount, markCap = true) {
  if (handle.getScrollTop() + handle.getPendingDelta() - amount <= 0) {
    if (markCap) markScrollbackCapReached();
    handle.scrollTo(0);
    return;
  }
  handle.scrollBy(-amount);
}
//@ chunk-18hwfzwa.js:118190-118634 fingerprint (2.1.88 match: applyModalPagerAction, 0.928)
function applyModalPagerAction(s, act, onBeforeJump = true) {
  switch (act) {
    case null:
      return null;
    case "lineUp":
    case "lineDown":
      return jumpBy(s, act === "lineDown" ? 1 : -1, onBeforeJump);
    case "halfPageUp":
    case "halfPageDown": {
      let half = Math.max(1, Math.floor(s.getViewportHeight() / 2));
      return jumpBy(s, act === "halfPageDown" ? half : -half, onBeforeJump);
    }
    case "fullPageUp":
    case "fullPageDown": {
      let page = Math.max(1, s.getViewportHeight());
      return jumpBy(s, act === "fullPageDown" ? page : -page, onBeforeJump);
    }
    case "top":
      s.scrollTo(0);
      return false;
    case "bottom":
      s.scrollToBottom();
      return true;
  }
}
//@ chunk-18hwfzwa.js:118634-119573 sole-consumer
/**
 * 监听"滚轮发送方向键"和 JetBrains 2025.2 终端滚动缺陷事件，记录遥测并弹出提示。
 */
function useScrollAnomalyNotices(addNotification) {
  let $ = useMemoCache(5);
  let { internal_eventEmitter } = useStdin();
  let clock = useClock();
  let isDragging = useRef(false);
  let startRef;
  let directionRef;
  if ($[0] !== addNotification || $[1] !== clock || $[2] !== internal_eventEmitter) {
    startRef = () => {
      let ticksRef = function timerRef(onScrollRef) {
        if (!isDragging.current) {
          isDragging.current = true;
          logEvent("tengu_scroll_arrows_detected", {
            count: onScrollRef.count,
            up: onScrollRef.direction === "up",
          });
        }
        clock.setTimeout(
          () =>
            addNotification({
              key: "scroll-as-arrows",
              kind: "contextual",
              priority: "immediate",
              text: "Scroll wheel is sending arrow keys \xB7 use PgUp/PgDn to scroll",
              color: "warning",
              timeoutMs: 12000,
            }),
          200,
        );
      };
      let tick = function stop() {
        logEvent("tengu_jediterm_scroll_bug_detected", {});
        addNotification({
          key: "jediterm-scroll-bug",
          kind: "contextual",
          priority: "immediate",
          text: "Scroll support in JetBrains IDE 2025.2 terminals is experimental \xB7 upgrade to 2025.3+ for the best experience",
          color: "suggestion",
          timeoutMs: 15000,
        });
      };
      internal_eventEmitter.on("arrow-burst", ticksRef);
      internal_eventEmitter.on("jediterm-scroll-bug", tick);
      return () => {
        internal_eventEmitter.off("arrow-burst", ticksRef);
        internal_eventEmitter.off("jediterm-scroll-bug", tick);
      };
    };
    directionRef = [internal_eventEmitter, addNotification, clock];
    $[0] = addNotification;
    $[1] = clock;
    $[2] = internal_eventEmitter;
    $[3] = startRef;
    $[4] = directionRef;
  } else {
    startRef = $[3];
    directionRef = $[4];
  }
  useEffect(startRef, directionRef);
}
//@ chunk-18hwfzwa.js:119573-119577 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:119573", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:119577-119581 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:119577", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:119581-119585 sole-consumer
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:119581", () => {
  init_react_production();
});
export {
  useDragToScroll,
  ScrollKeybindingHandler,
  useWheelScrollStep,
  useSelectionClearKeybinding,
  shouldClearSelectionOnKey,
  readScrollSpeedBase,
  buildCopiedNotification,
  modalPagerAction,
  jumpBy,
  scrollStepLines,
};
