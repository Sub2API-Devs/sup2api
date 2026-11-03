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
import { useClock } from "../ink/components/ClockContext.js";
import { R, Oo, P, init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  WHEEL_GESTURE_GAP_MS,
  takeArrowBoost,
  createJediTermInputState,
  isJediTermScrollBugConfirmed,
} from "../ink/wheelScroll.js";
import {
  hasCursorUpViewportYankBug,
  hasUnknownSequencePrintingBug,
  describeMetaKey,
} from "../ink/terminal.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { logForDebugging } from "../utils/debug.js";
import { useStdin, useTheme_2 } from "./design-system/ThemeProvider.js";
import { useSelection } from "../ink/components/Input.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useInputSelectionBridge } from "../ink/inputSelectionBridge.js";
import { useNotifications } from "../context/notifications.js";
import { useOverlayFlagA } from "../context/overlayContext.js";
import { getClipboardPath, getOsc52Utf8Warning } from "../ink/termio/osc.js";
import { getGlobalConfig } from "../utils/config.js";
import { getSessionsSinceTipShown } from "../services/tips/tipHistory.js";
import { recordTipShown } from "../services/tips/tipIds.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { countPageJump, countScroll, markScrollbackCapReached } from "../utils/scrollTelemetry.js";
import { recordScrollPosition, recordScrollInput } from "../ink/widest-line.js";
import { isSelectionFullyOffscreen } from "../ink/selection.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { clearKeptClawdPose } from "./LogoV2/Clawd.js";
import { useCopyOnSelect, useSelectionBgColor } from "../hooks/useCopyOnSelect.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { countGraphemes } from "../ink/output.js";
import { currentToolPermissionContext } from "../utils/permissions/currentPermissionContext.js";
import { env } from "../utils/env.js";

//@ chunk-18hwfzwa.js:108851-108876 affinity
var DRAG_SCROLL_STEP_ROWS = 2;
var DRAG_SCROLL_TICK_MS = 50;
var MAX_DRAG_TICKS = 200;
//@ chunk-18hwfzwa.js:108876-110291 fingerprint = useDragToScroll (0.788)
function useDragToScroll(scrollRef, selection, isActive, L, ee) {
  let clock = useClock();
  let timerRef = R(null);
  let dirRef = R(0);
  let lastScrolledDirRef = R(0);
  let ticksRef = R(0);
  let onScrollRef = Oo((rt, kt) => L?.(rt, kt));
  let requireScope = ee?.requireScope ?? false;
  P(() => {
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
        let Dt = () => {
          tick();
          if (dirRef.current !== 0) timerRef.current = clock.setTimeout(Dt, DRAG_SCROLL_TICK_MS);
        };
        timerRef.current = clock.setTimeout(Dt, DRAG_SCROLL_TICK_MS);
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
function isSameScrollScope(h, x) {
  let node = h?.scope?.node;
  return !node || node === x?.getDomElement();
}
//@ chunk-18hwfzwa.js:110363-110555 fingerprint = dragScrollDirection (1)
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
//@ chunk-18hwfzwa.js:110671-110830 callgraph-fingerprint = selectionFocusMoveForKey (0.247)
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
//@ chunk-18hwfzwa.js:110867-112542 fingerprint = computeWheelStep (0.674)
function computeWheelStep(state, dir, now) {
  if (state.jediTerm.trackpadGesture) {
    let Be = now - state.time;
    if (!state.jbBypass || Be > WHEEL_GESTURE_GAP_MS) {
      state.jbBypass = true;
      state.frac = 0;
      state.mult = 1;
    } else if (dir !== state.dir) state.frac = 0;
    state.dir = dir;
    state.time = now;
    let He = takeArrowBoost(state.jediTerm);
    if (state.accelEnabled)
      state.mult = Math.min(WHEEL_ACCEL_MAX, state.mult + WHEEL_ACCEL_BASE_STEP + He * WHEEL_ACCEL_PER_TICK);
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
      let He = now - state.time;
      state.time = now;
      state.dir = dir;
      state.mult = He > WHEEL_ACCEL_WINDOW_MS ? state.base * WHEEL_BURST_FACTOR : state.base;
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
//@ chunk-18hwfzwa.js:112542-112735 fingerprint = initWheelAccel (0.683)
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
//@ chunk-18hwfzwa.js:112735-113142 fingerprint = initAndLogWheelAccel (0.434)
function initAndLogWheelAccel(jediTerm) {
  let xtermJs = hasCursorUpViewportYankBug();
  let accelEnabled = resolveSetting("wheelScrollAccelerationEnabled", true).value;
  logForDebugging(
    `wheel accel: ${xtermJs.useDecayCurve ? "decay" : "window (native)"} \xB7 base=${xtermJs.base} \xB7 platform=${xtermJs.platform} \xB7 TERM_PROGRAM=${xtermJs.termProgram}${xtermJs.wheelFlood ? " \xB7 wheelFlood" : ""}${xtermJs.jediTerm ? " \xB7 jediTerm" : ""}${isJediTermScrollBugConfirmed(jediTerm) ? " \xB7 jbBugConfirmed" : ""}${accelEnabled ? "" : " \xB7 accelDisabled"}`,
  );
  return initWheelAccel(xtermJs.useDecayCurve, xtermJs.base, xtermJs.wheelFlood, accelEnabled, jediTerm);
}
//@ chunk-18hwfzwa.js:113142-113375 layout
/**
 * 返回滚轮步长计算函数：按终端（含 JediTerm）初始化滚轮加速状态并缓存，滚动速度基准变化时重建。
 */
function useWheelScrollStep() {
  let h = R(null);
  let x = R(null);
  let { internal_jediTermInput } = useStdin();
  return (dir, now) => {
    if (hasCursorUpViewportYankBug() !== x.current) {
      x.current = hasCursorUpViewportYankBug();
      h.current = null;
    }
    h.current ??= initAndLogWheelAccel(internal_jediTermInput);
    h.current.base = hasCursorUpViewportYankBug().base;
    let state = h.current;
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
//@ chunk-18hwfzwa.js:113420-117547 fingerprint = ScrollKeybindingHandler (0.573)
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
  let wheelAccel = R(-1);
  useScrollAnomalyNotices(addNotification);
  function It(Xt, io = false) {
    let copiedNotification = buildCopiedNotification(Xt);
    if (io && getClipboardPath() === "native" && getGlobalConfig().copyOnSelect === undefined) {
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
    if (text_0) It(text_0);
  }
  let onBeforeJump = recordsTelemetry ?? onScroll != null;
  MessageActionsKeybindings(
    {
      "scroll:pageUp": () => {
        let s_0 = scrollViewport.handle;
        if (!s_0) return;
        if (yieldsPageKeysWhenContentFits && s_0.getScrollHeight() <= s_0.getViewportHeight()) return false;
        if (onBeforeJump) countPageJump();
        let io = -Math.max(1, Math.floor(s_0.getViewportHeight() / 2));
        let so = jumpBy(s_0, io, onBeforeJump);
        onScroll?.(so, s_0);
      },
      "scroll:pageDown": () => {
        let s_1 = scrollViewport.handle;
        if (!s_1) return;
        if (yieldsPageKeysWhenContentFits && s_1.getScrollHeight() <= s_1.getViewportHeight()) return false;
        if (onBeforeJump) countPageJump();
        let d_0 = Math.max(1, Math.floor(s_1.getViewportHeight() / 2));
        let so = jumpBy(s_1, d_0, onBeforeJump);
        onScroll?.(so, s_1);
      },
      "scroll:lineUp": () => {
        let handle = scrollViewport.handle;
        if (!handle || handle.getScrollHeight() <= handle.getViewportHeight()) return false;
        if (onBeforeJump) countScroll();
        let startTime = performance.now();
        let { rows, state } = wheelScrollStep(-1, startTime);
        recordScrollPosition(handle);
        recordScrollInput(-1, rows, state, startTime);
        scrollUp(handle, rows, onBeforeJump);
        onScroll?.(false, handle);
      },
      "scroll:lineDown": () => {
        let s_3 = scrollViewport.handle;
        if (!s_3 || s_3.getScrollHeight() <= s_3.getViewportHeight()) return false;
        if (onBeforeJump) countScroll();
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
        if (onBeforeJump) markScrollbackCapReached();
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
  function Dt(Xt) {
    let handle = scrollViewport.handle;
    if (!handle) return;
    if (onBeforeJump) {
      if (Xt === "lineUp" || Xt === "lineDown") countScroll();
      else if (Xt === "top") markScrollbackCapReached();
      else if (Xt !== "bottom") countPageJump();
    }
    let step = applyModalPagerAction(handle, Xt, onBeforeJump);
    if (step === null) return;
    onScroll?.(step, handle);
  }
  MessageActionsKeybindings(
    {
      "scroll:halfPageUp": () => Dt("halfPageUp"),
      "scroll:halfPageDown": () => Dt("halfPageDown"),
      "scroll:fullPageUp": () => Dt("fullPageUp"),
      "scroll:fullPageDown": () => Dt("fullPageDown"),
    },
    {
      context: "Scroll",
      isActive: isActive_2,
    },
  );
  MessageActionsKeybindings(
    {
      "scroll:lineUp": () => Dt("lineUp"),
      "scroll:lineDown": () => Dt("lineDown"),
      "scroll:halfPageUp": () => Dt("halfPageUp"),
      "scroll:halfPageDown": () => Dt("halfPageDown"),
      "scroll:fullPageUp": () => Dt("fullPageUp"),
      "scroll:fullPageDown": () => Dt("fullPageDown"),
      "scroll:top": () => Dt("top"),
      "scroll:bottom": () => Dt("bottom"),
    },
    {
      context: "Transcript",
      isActive: isActive_2 && isModal,
    },
  );
  function Lt(Xt) {
    if (!selection.hasSelection()) return false;
    let state = selection.getState();
    if (state && isSelectionFullyOffscreen(state)) return;
    if (Xt === "up" || Xt === "down") {
      let handle = scrollViewport.handle;
      if (handle && isSameScrollScope(state, handle) && state?.anchor && state.focus) {
        let viewportTop = handle.getViewportTop();
        let ao = viewportTop + handle.getViewportHeight() - 1;
        let co = state.anchor.row >= viewportTop && state.anchor.row <= ao;
        let bo = co && Xt === "up" && state.focus.row <= viewportTop;
        let Ao = co && Xt === "down" && state.focus.row >= ao;
        if (bo || Ao) {
          let max_0 = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
          let Ro = bo ? handle.getScrollTop() > 0 : handle.getScrollTop() < max_0;
          if (handle.getPendingDelta() === 0 && Ro) {
            sticky_5.invalidate();
            state.focus = {
              col: state.focus.col,
              row: bo ? viewportTop : ao,
            };
            state.virtualFocusRow = bo ? viewportTop - 1 : ao + 1;
            state.virtualFocusCol = undefined;
            handle.scrollBy(bo ? -1 : 1);
            onScroll?.(false, handle);
          }
          return;
        }
      }
    }
    selection.moveFocus(Xt);
  }
  MessageActionsKeybindings(
    {
      "selection:extendLeft": () => Lt("left"),
      "selection:extendRight": () => Lt("right"),
      "selection:extendUp": () => Lt("up"),
      "selection:extendDown": () => Lt("down"),
      "selection:extendLineStart": () => Lt("lineStart"),
      "selection:extendLineEnd": () => Lt("lineEnd"),
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
        let so = sticky_5.peek();
        if (so !== null) {
          selection.clearSelection();
          It(so);
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
  let sticky_5 = useCopyOnSelect(selection, isActive_2, (d_5) => It(d_5, true));
  useSelectionBgColor(selection);
  return null;
}
//@ chunk-18hwfzwa.js:117547-117698 layout
function scrollToBottomRespectingAutoScroll(h) {
  if (resolveSetting("autoScrollEnabled", true).value) h.scrollToBottom();
  else h.scrollTo(Math.max(0, h.getScrollHeight() - h.getViewportHeight()));
  return true;
}
//@ chunk-18hwfzwa.js:117698-117913 fingerprint = jumpBy (0.903)
function jumpBy(h, delta, D = true) {
  let max = Math.max(0, h.getScrollHeight() - h.getViewportHeight());
  let target = Math.min(h.getScrollTop(), max) + h.getPendingDelta() + delta;
  if (target >= max) return scrollToBottomRespectingAutoScroll(h);
  if (target <= 0 && D) markScrollbackCapReached();
  h.scrollTo(Math.max(0, target));
  return false;
}
//@ chunk-18hwfzwa.js:117913-118074 fingerprint = scrollDown (0.903)
function scrollDown(s, amount) {
  let max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
  if (s.getScrollTop() + s.getPendingDelta() + amount >= max) return scrollToBottomRespectingAutoScroll(s);
  s.scrollBy(amount);
  return false;
}
//@ chunk-18hwfzwa.js:118074-118190 fingerprint = scrollUp (1)
function scrollUp(handle, amount, D = true) {
  if (handle.getScrollTop() + handle.getPendingDelta() - amount <= 0) {
    if (D) markScrollbackCapReached();
    handle.scrollTo(0);
    return;
  }
  handle.scrollBy(-amount);
}
//@ chunk-18hwfzwa.js:118190-118634 fingerprint = applyModalPagerAction (0.928)
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
  let ee = w(5);
  let { internal_eventEmitter } = useStdin();
  let clock = useClock();
  let L = R(false);
  let ke;
  let Re;
  if (ee[0] !== addNotification || ee[1] !== clock || ee[2] !== internal_eventEmitter) {
    ke = () => {
      let He = function He(Be) {
        if (!L.current) {
          L.current = true;
          logEvent("tengu_scroll_arrows_detected", {
            count: Be.count,
            up: Be.direction === "up",
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
      let We = function We() {
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
      internal_eventEmitter.on("arrow-burst", He);
      internal_eventEmitter.on("jediterm-scroll-bug", We);
      return () => {
        internal_eventEmitter.off("arrow-burst", He);
        internal_eventEmitter.off("jediterm-scroll-bug", We);
      };
    };
    Re = [internal_eventEmitter, addNotification, clock];
    ee[0] = addNotification;
    ee[1] = clock;
    ee[2] = internal_eventEmitter;
    ee[3] = ke;
    ee[4] = Re;
  } else {
    ke = ee[3];
    Re = ee[4];
  }
  P(ke, Re);
}
//@ chunk-18hwfzwa.js:119573-119577 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:119577-119581 sole-consumer
init_react_production();
//@ chunk-18hwfzwa.js:119581-119585 sole-consumer
init_react_production();
//@ chunk-tzghj6zv.js:2704-2950 fingerprint = shouldClearSelectionOnKey (0.934)
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
function isPagerPassthroughKey(d) {
  if (d.name === "escape" || d.name === "pageup" || d.name === "pagedown") return false;
  if ((d.name === "home" || d.name === "end") && d.ctrl) return false;
  if (
    (d.name === "left" ||
      d.name === "right" ||
      d.name === "up" ||
      d.name === "down" ||
      d.name === "home" ||
      d.name === "end") &&
    (d.shift || d.meta || d.superKey)
  )
    return false;
  return true;
}
//@ chunk-tzghj6zv.js:3242-3502 placement
function modalPagerAction(d, copyOnSelect, x) {
  return (C) => {
    if (!d.hasSelection()) return;
    if (C.key === "c" && !C.meta && (C.ctrl || C.superKey)) {
      if (copyOnSelect.peek() !== null) d.clearSelection();
      else {
        let A = d.copySelection();
        if (A) x?.(A);
      }
      if (C.ctrl && !C.shift) clearKeptClawdPose();
      C.consume();
      return;
    }
    if (isPagerPassthroughKey(C)) d.clearSelection();
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
init_react_production();
//@ chunk-tzghj6zv.js:3642-4400 placement
/**
 * 选中文字复制后的通知：按复制通道（系统剪贴板、tmux buffer、OSC 52）给出文案与时长，OSC 52 含非 UTF-8 风险时加警告。
 */
function buildCopiedNotification(text) {
  let clipboardPath = getClipboardPath();
  let x = countGraphemes(text);
  let C = x === 1 ? "char" : "chars";
  let A;
  let M;
  switch (clipboardPath) {
    case "native":
      A = `copied ${x} ${C} to clipboard`;
      M = `copied ${x} ${C}`;
      break;
    case "tmux-buffer":
      A = `copied ${x} ${C} to tmux buffer \xB7 paste with prefix + ]`;
      M = "copied \xB7 paste with prefix + ]";
      break;
    case "osc52":
      if (hasUnknownSequencePrintingBug()) {
        A = `couldn't copy ${x} ${C} \xB7 select with ${describeMetaKey()} held, then use your terminal's Copy`;
        break;
      }
      A = `sent ${x} ${C} via OSC 52 \xB7 if paste fails, hold ${describeMetaKey()} while selecting for native copy`;
      M = `sent ${x} ${C} via OSC 52`;
      break;
  }
  let O = getOsc52Utf8Warning(text);
  if (O) A = `\u26A0 ${O} \xB7 ${A}`;
  return {
    key: "selection-copied",
    kind: "feedback",
    text: A,
    color: currentToolPermissionContext() ? (O ? "warning" : undefined) : "suggestion",
    priority: "immediate",
    timeoutMs: O ? 6000 : clipboardPath === "native" ? 2000 : 4000,
    ...(O || M === undefined
      ? {}
      : {
          row1Hint: M,
        }),
  };
}
//@ chunk-24t3dkzb.js:1978-2023 placement
function scrollStepLines(r, n, o) {
  return !n && (r || false || o) ? 3 : 1;
}
//@ chunk-24t3dkzb.js:2023-2169 fingerprint = readScrollSpeedBase (1)
function readScrollSpeedBase(r, n, o) {
  let u = scrollStepLines(r, n, o);
  let raw = env.CLAUDE_CODE_SCROLL_SPEED;
  if (!raw) return u;
  let n_2 = parseFloat(raw);
  return Number.isNaN(n_2) || n_2 <= 0 ? u : Math.min(n_2, 20);
}
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
