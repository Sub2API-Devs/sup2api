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
import { R, Oo, P, j } from "../../vendor/react/cjs/react.production.js";
import {
  WHEEL_GESTURE_GAP_MS,
  takeArrowBoost,
  createJediTermInputState,
  isJediTermScrollBugConfirmed,
} from "../ink/wheelScroll.js";
import { b9, HX, describeMetaKey } from "../ink/terminal.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { logForDebugging } from "../utils/debug.js";
import { useStdin, Me } from "./design-system/ThemeProvider.js";
import { useSelection } from "../ink/components/Input.js";
import { useKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useInputSelectionBridge } from "../ink/inputSelectionBridge.js";
import { useNotifications } from "../context/notifications.js";
import { P0t } from "../context/overlayContext.js";
import { getClipboardPath, getOsc52Utf8Warning } from "../ink/termio/osc.js";
import { getGlobalConfig } from "../utils/config.js";
import { getSessionsSinceTipShown } from "../services/tips/tipHistory.js";
import { recordTipShown } from "../services/tips/tipIds.js";
import { MessageActionsKeybindings } from "./messageActions.js";
import { sBr, oBr, m3n } from "../utils/scrollTelemetry.js";
import { recordScrollPosition, recordScrollInput } from "../ink/widest-line.js";
import { isSelectionFullyOffscreen } from "../ink/selection.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { clearKeptClawdPose } from "./LogoV2/Clawd.js";
import { useCopyOnSelect, useSelectionBgColor } from "../hooks/useCopyOnSelect.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { countGraphemes } from "../ink/output.js";
import { tE } from "../utils/permissions/currentPermissionContext.js";
import { env } from "../utils/env.js";

//@ chunk-18hwfzwa.js:108851-108876 affinity
var MFe = 2,
  EFe = 50,
  aIt = 200;
//@ chunk-18hwfzwa.js:108876-110291 fingerprint = useDragToScroll (0.788)
function useDragToScroll(h, x, D, L, ee) {
  let ke = useClock(),
    timerRef = R(null),
    dirRef = R(0),
    lastScrolledDirRef = R(0),
    ticksRef = R(0),
    onScrollRef = Oo((rt, kt) => L?.(rt, kt)),
    Xe = ee?.requireScope ?? !1;
  P(() => {
    if (!D) return;
    function stop() {
      ((dirRef.current = 0), timerRef.current?.(), (timerRef.current = null));
    }
    function tick() {
      let sel = x.getState(),
        handle = h.handle,
        Lt = dirRef.current;
      if (!sel?.isDragging || !sel.focus || !handle || Lt === 0 || ++ticksRef.current > aIt) {
        stop();
        return;
      }
      if (handle.getPendingDelta() !== 0) return;
      if (Lt < 0) {
        if (handle.getScrollTop() <= 0) {
          stop();
          return;
        }
        handle.scrollBy(-MFe);
      } else {
        let max = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
        if (handle.getScrollTop() >= max) {
          stop();
          return;
        }
        handle.scrollBy(MFe);
      }
      onScrollRef(!1, handle);
    }
    function start(dir_0) {
      if (((lastScrolledDirRef.current = dir_0), dirRef.current === dir_0)) return;
      if ((stop(), (dirRef.current = dir_0), (ticksRef.current = 0), tick(), dirRef.current === dir_0)) {
        let Dt = () => {
          if ((tick(), dirRef.current !== 0)) timerRef.current = ke.setTimeout(Dt, EFe);
        };
        timerRef.current = ke.setTimeout(Dt, EFe);
      }
    }
    function check() {
      let handle = h.handle;
      if (!handle) {
        stop();
        return;
      }
      let state = x.getState();
      if (!Bre(state, handle) || (Xe && !state?.scope?.node)) {
        ((lastScrolledDirRef.current = 0), stop());
        return;
      }
      let top_0 = handle.getViewportTop(),
        oo = top_0 + handle.getViewportHeight() - 1;
      if (!state?.isDragging || (state.scrolledOffAbove.length === 0 && state.scrolledOffBelow.length === 0))
        lastScrolledDirRef.current = 0;
      let dir_1 = dragScrollDirection(state, top_0, oo, lastScrolledDirRef.current);
      if (dir_1 === 0) {
        if (lastScrolledDirRef.current !== 0 && state?.focus) {
          let want = state.focus.row < top_0 ? -1 : state.focus.row > oo ? 1 : 0;
          if (want !== 0 && want !== lastScrolledDirRef.current)
            ((state.scrolledOffAbove = []),
              (state.scrolledOffBelow = []),
              (state.scrolledOffAboveSW = []),
              (state.scrolledOffBelowSW = []),
              (lastScrolledDirRef.current = 0));
        }
        stop();
      } else start(dir_1);
    }
    let unsubscribe = x.subscribe(check);
    return () => {
      (unsubscribe(), stop(), (lastScrolledDirRef.current = 0));
    };
  }, [ke, D, Xe, h, x]);
}
//@ chunk-18hwfzwa.js:110291-110363 layout
function Bre(h, x) {
  let D = h?.scope?.node;
  return !D || D === x?.getDomElement();
}
//@ chunk-18hwfzwa.js:110363-110555 fingerprint = dragScrollDirection (1)
function dragScrollDirection(sel, top, bottom, alreadyScrollingDir = 0) {
  if (!sel?.isDragging || !sel.anchor || !sel.focus) return 0;
  let row = sel.focus.row,
    want = row < top ? -1 : row > bottom ? 1 : 0;
  if (alreadyScrollingDir !== 0) return want === alreadyScrollingDir ? want : 0;
  if (sel.anchor.row < top || sel.anchor.row > bottom) return 0;
  return want;
}
//@ chunk-18hwfzwa.js:110555-110671 layout
var WHEEL_ACCEL_WINDOW_MS = 40,
  dIt = 0.3,
  cIt = 6,
  uIt = 3,
  mIt = 200,
  fIt = 15,
  hIt = 15,
  yIt = 3,
  SIt = 1500,
  OFe = 150,
  bIt = 7,
  NFe = 5,
  kIt = 80,
  vIt = 3,
  CIt = 36,
  _It = 500;
//@ chunk-18hwfzwa.js:110671-110830 callgraph-fingerprint = selectionFocusMoveForKey (0.247)
function selectionFocusMoveForKey(h, x) {
  if (x.upArrow || x.downArrow || x.home || x.end) return !0;
  if (h.length !== 1) return !1;
  if (x.ctrl) return "udbfnp".includes(h);
  return "jkgGb {}".includes(h);
}
//@ chunk-18hwfzwa.js:110830-110867 layout
var RIt = 0.35,
  xIt = 0.008,
  PIt = 0.4,
  AIt = 4;
//@ chunk-18hwfzwa.js:110867-112542 fingerprint = computeWheelStep (0.674)
function computeWheelStep(state, dir, now) {
  if (state.jediTerm.trackpadGesture) {
    let Be = now - state.time;
    if (!state.jbBypass || Be > WHEEL_GESTURE_GAP_MS)
      ((state.jbBypass = !0), (state.frac = 0), (state.mult = 1));
    else if (dir !== state.dir) state.frac = 0;
    ((state.dir = dir), (state.time = now));
    let He = takeArrowBoost(state.jediTerm);
    if (state.accelEnabled) state.mult = Math.min(AIt, state.mult + xIt + He * PIt);
    state.frac += RIt * state.mult;
    let floored = Math.floor(state.frac);
    return ((state.frac -= floored), floored);
  }
  if (state.jbBypass)
    ((state.jbBypass = !1),
      (state.pendingFlip = !1),
      (state.wheelMode = !1),
      (state.burstCount = 0),
      (state.frac = 0),
      (state.dir = 0));
  if (!state.useDecayCurve) {
    if (state.wheelFlood) {
      let He = now - state.time;
      return (
        (state.time = now),
        (state.dir = dir),
        (state.mult = He > WHEEL_ACCEL_WINDOW_MS ? state.base * uIt : state.base),
        Math.max(1, Math.floor(state.mult))
      );
    }
    if (state.wheelMode && now - state.time > SIt)
      ((state.wheelMode = !1), (state.burstCount = 0), (state.mult = state.base));
    if (state.pendingFlip) {
      if (((state.pendingFlip = !1), dir !== state.dir || now - state.time > mIt))
        return (
          (state.dir = dir),
          (state.time = now),
          (state.mult = state.base),
          Math.max(1, Math.floor(state.mult))
        );
      state.wheelMode = !0;
    }
    let Be = now - state.time;
    if (dir !== state.dir && state.dir !== 0) return ((state.pendingFlip = !0), (state.time = now), 0);
    if (((state.dir = dir), (state.time = now), state.wheelMode))
      if (Be < NFe)
        if (++state.burstCount >= 5)
          ((state.wheelMode = !1), (state.burstCount = 0), (state.mult = state.base));
        else return 1;
      else state.burstCount = 0;
    if (state.wheelMode && state.accelEnabled) {
      let pow = Math.pow(0.5, Be / OFe),
        cap = Math.max(hIt * Math.min(state.base, 1), state.base * 2),
        ze = 1 + (state.mult - 1) * pow + fIt * pow;
      return ((state.mult = Math.min(cap, ze, state.mult + yIt)), Math.max(1, Math.floor(state.mult)));
    }
    if (Be > WHEEL_ACCEL_WINDOW_MS || !state.accelEnabled) state.mult = state.base;
    else {
      let cap = Math.max(cIt * Math.min(state.base, 1), state.base * 2);
      state.mult = Math.min(cap, state.mult + dIt);
    }
    return Math.max(1, Math.floor(state.mult));
  }
  let L = now - state.time,
    ee = dir === state.dir;
  if (((state.time = now), (state.dir = dir), ee && L < NFe)) return 1;
  if (!state.accelEnabled) return Math.max(1, Math.floor(state.base));
  if (!ee || L > _It) ((state.mult = Math.max(2, state.base)), (state.frac = 0));
  else {
    let pow = Math.pow(0.5, L / OFe),
      cap = L >= kIt ? vIt : CIt;
    state.mult = Math.min(cap, 1 + (state.mult - 1) * pow + bIt * pow);
  }
  let ke = state.mult + state.frac,
    rows = Math.floor(ke);
  return ((state.frac = ke - rows), rows);
}
//@ chunk-18hwfzwa.js:112542-112735 fingerprint = initWheelAccel (0.683)
function initWheelAccel(h = !1, x = 1, D = !1, L = !0, ee = createJediTermInputState()) {
  return {
    time: 0,
    mult: x,
    dir: 0,
    useDecayCurve: h,
    frac: 0,
    base: x,
    pendingFlip: !1,
    wheelMode: !1,
    burstCount: 0,
    jbBypass: !1,
    jediTerm: ee,
    wheelFlood: D,
    accelEnabled: L,
  };
}
//@ chunk-18hwfzwa.js:112735-113142 fingerprint = initAndLogWheelAccel (0.434)
function initAndLogWheelAccel(h) {
  let xtermJs = b9(),
    D = resolveSetting("wheelScrollAccelerationEnabled", !0).value;
  return (
    logForDebugging(
      `wheel accel: ${xtermJs.useDecayCurve ? "decay" : "window (native)"} \xB7 base=${xtermJs.base} \xB7 platform=${xtermJs.platform} \xB7 TERM_PROGRAM=${xtermJs.termProgram}${xtermJs.wheelFlood ? " \xB7 wheelFlood" : ""}${xtermJs.jediTerm ? " \xB7 jediTerm" : ""}${isJediTermScrollBugConfirmed(h) ? " \xB7 jbBugConfirmed" : ""}${D ? "" : " \xB7 accelDisabled"}`,
    ),
    initWheelAccel(xtermJs.useDecayCurve, xtermJs.base, xtermJs.wheelFlood, D, h)
  );
}
/**
 * 返回滚轮步长计算函数：按终端（含 JediTerm）初始化滚轮加速状态并缓存，滚动速度基准变化时重建。
 */
//@ chunk-18hwfzwa.js:113142-113375 layout
function useWheelScrollStep() {
  let h = R(null),
    x = R(null),
    { internal_jediTermInput: internal_jediTermInput } = useStdin();
  return (L, ee) => {
    if (b9() !== x.current) ((x.current = b9()), (h.current = null));
    ((h.current ??= initAndLogWheelAccel(internal_jediTermInput)), (h.current.base = b9().base));
    let ke = h.current;
    return { rows: computeWheelStep(ke, L, ee), state: ke };
  };
}
//@ chunk-18hwfzwa.js:113375-113420 layout
var AUTO_COPY_CONFIG_HINT = "auto-copy-config-hint",
  OIt = 10,
  FFe = 5;
//@ chunk-18hwfzwa.js:113420-117547 fingerprint = ScrollKeybindingHandler (0.573)
function ScrollKeybindingHandler({
  scrollViewport: scrollViewport,
  isActive: isActive,
  onScroll: onScroll,
  recordsTelemetry: recordsTelemetry,
  isModal: isModal = !1,
  yieldsPageKeysWhenContentFits: yieldsPageKeysWhenContentFits = !1,
}) {
  let selection = useSelection(),
    Be = useKeybindingContext(),
    He = useInputSelectionBridge(),
    { addNotification: addNotification } = useNotifications(),
    { storageV5: storageV5 } = Me(),
    Xe = P0t(),
    rt = isActive && !Xe,
    kt = useWheelScrollStep(),
    wheelAccel = R(-1);
  useScrollAnomalyNotices(addNotification);
  function It(Xt, io = !1) {
    let so = buildCopiedNotification(Xt);
    if (io && getClipboardPath() === "native" && getGlobalConfig().copyOnSelect === void 0) {
      if (wheelAccel.current === -1)
        if (getSessionsSinceTipShown(AUTO_COPY_CONFIG_HINT) >= OIt)
          (recordTipShown(AUTO_COPY_CONFIG_HINT, storageV5), (wheelAccel.current = 0));
        else wheelAccel.current = FFe;
      if (wheelAccel.current < FFe) {
        (wheelAccel.current++,
          addNotification({
            ...so,
            text: `${so.text} \xB7 disable auto-copy in /config`,
            row1Hint: void 0,
            timeoutMs: Math.max(so.timeoutMs, 4000),
          }));
        return;
      }
    }
    addNotification(so);
  }
  function copyAndToast() {
    let text_0 = selection.copySelection();
    if (text_0) It(text_0);
  }
  let Et = recordsTelemetry ?? onScroll != null;
  (MessageActionsKeybindings(
    {
      "scroll:pageUp": () => {
        let handle = scrollViewport.handle;
        if (!handle) return;
        if (yieldsPageKeysWhenContentFits && handle.getScrollHeight() <= handle.getViewportHeight())
          return !1;
        if (Et) sBr();
        let io = -Math.max(1, Math.floor(handle.getViewportHeight() / 2)),
          so = jumpBy(handle, io, Et);
        onScroll?.(so, handle);
      },
      "scroll:pageDown": () => {
        let handle = scrollViewport.handle;
        if (!handle) return;
        if (yieldsPageKeysWhenContentFits && handle.getScrollHeight() <= handle.getViewportHeight())
          return !1;
        if (Et) sBr();
        let d_0 = Math.max(1, Math.floor(handle.getViewportHeight() / 2)),
          so = jumpBy(handle, d_0, Et);
        onScroll?.(so, handle);
      },
      "scroll:lineUp": () => {
        let handle = scrollViewport.handle;
        if (!handle || handle.getScrollHeight() <= handle.getViewportHeight()) return !1;
        if (Et) oBr();
        let startTime = performance.now(),
          { rows: rows, state: state } = kt(-1, startTime);
        (recordScrollPosition(handle),
          recordScrollInput(-1, rows, state, startTime),
          scrollUp(handle, rows, Et),
          onScroll?.(!1, handle));
      },
      "scroll:lineDown": () => {
        let handle = scrollViewport.handle;
        if (!handle || handle.getScrollHeight() <= handle.getViewportHeight()) return !1;
        if (Et) oBr();
        let startTime = performance.now(),
          { rows: rows, state: state } = kt(1, startTime);
        (recordScrollPosition(handle), recordScrollInput(1, rows, state, startTime));
        let sticky_0 = scrollDown(handle, rows);
        onScroll?.(sticky_0, handle);
      },
      "scroll:top": () => {
        let handle = scrollViewport.handle;
        if (!handle) return;
        if (Et) m3n();
        (handle.scrollTo(0), onScroll?.(!1, handle));
      },
      "scroll:bottom": () => {
        let handle = scrollViewport.handle;
        if (!handle) return;
        (handle.scrollToBottom(), onScroll?.(!0, handle));
      },
      "selection:copy": copyAndToast,
    },
    { context: "Scroll", isActive: rt },
  ),
    useSelectionClearKeybinding(selection, rt));
  function Dt(Xt) {
    let handle = scrollViewport.handle;
    if (!handle) return;
    if (Et) {
      if (Xt === "lineUp" || Xt === "lineDown") oBr();
      else if (Xt === "top") m3n();
      else if (Xt !== "bottom") sBr();
    }
    let step = applyModalPagerAction(handle, Xt, Et);
    if (step === null) return;
    onScroll?.(step, handle);
  }
  (MessageActionsKeybindings(
    {
      "scroll:halfPageUp": () => Dt("halfPageUp"),
      "scroll:halfPageDown": () => Dt("halfPageDown"),
      "scroll:fullPageUp": () => Dt("fullPageUp"),
      "scroll:fullPageDown": () => Dt("fullPageDown"),
    },
    { context: "Scroll", isActive: rt },
  ),
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
      { context: "Transcript", isActive: rt && isModal },
    ));
  function Lt(Xt) {
    if (!selection.hasSelection()) return !1;
    let state = selection.getState();
    if (state && isSelectionFullyOffscreen(state)) return;
    if (Xt === "up" || Xt === "down") {
      let handle = scrollViewport.handle;
      if (handle && Bre(state, handle) && state?.anchor && state.focus) {
        let viewportTop = handle.getViewportTop(),
          ao = viewportTop + handle.getViewportHeight() - 1,
          co = state.anchor.row >= viewportTop && state.anchor.row <= ao,
          bo = co && Xt === "up" && state.focus.row <= viewportTop,
          Ao = co && Xt === "down" && state.focus.row >= ao;
        if (bo || Ao) {
          let max_0 = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight()),
            Ro = bo ? handle.getScrollTop() > 0 : handle.getScrollTop() < max_0;
          if (handle.getPendingDelta() === 0 && Ro)
            (sticky_5.invalidate(),
              (state.focus = { col: state.focus.col, row: bo ? viewportTop : ao }),
              (state.virtualFocusRow = bo ? viewportTop - 1 : ao + 1),
              (state.virtualFocusCol = void 0),
              handle.scrollBy(bo ? -1 : 1),
              onScroll?.(!1, handle));
          return;
        }
      }
    }
    selection.moveFocus(Xt);
  }
  (MessageActionsKeybindings(
    {
      "selection:extendLeft": () => Lt("left"),
      "selection:extendRight": () => Lt("right"),
      "selection:extendUp": () => Lt("up"),
      "selection:extendDown": () => Lt("down"),
      "selection:extendLineStart": () => Lt("lineStart"),
      "selection:extendLineEnd": () => Lt("lineEnd"),
    },
    { context: "Scroll", isActive: rt },
  ),
    usePreDispatchKeyHandler(
      (Xt, io) => {
        if (!selection.hasSelection()) return;
        if (io.ctrl && !io.shift && !io.meta && Xt === "c") {
          let peek = sticky_5.peek();
          if (peek !== null) (selection.clearSelection(), It(peek));
          else copyAndToast();
          return (clearKeptClawdPose(), !0);
        }
        if (isModal && selectionFocusMoveForKey(Xt, io)) return;
        if (!isModal && (io.backspace || io.delete) && !io.ctrl && !io.meta && !io.shift && !io.super) {
          let state = selection.getState();
          if (state && He.tryDelete(state)) return (selection.clearSelection(), !0);
        }
        if (shouldClearSelectionOnKey(io)) {
          if (Be) {
            let resolved = Be.resolve(Xt, io, [...Be.activeContexts, "Scroll", "Global"]);
            if (resolved.type === "match" && resolved.action === "selection:copy") return;
            if (resolved.type === "match" && resolved.action === "selection:clear") {
              (selection.clearSelection(), clearKeptClawdPose());
              return;
            }
          }
          selection.clearSelection();
        }
      },
      { isActive: rt },
    ),
    useDragToScroll(scrollViewport, selection, rt, onScroll));
  let sticky_5 = useCopyOnSelect(selection, rt, (d_5) => It(d_5, !0));
  return (useSelectionBgColor(selection), null);
}
//@ chunk-18hwfzwa.js:117547-117698 layout
function scrollToBottomRespectingAutoScroll(h) {
  if (resolveSetting("autoScrollEnabled", !0).value) h.scrollToBottom();
  else h.scrollTo(Math.max(0, h.getScrollHeight() - h.getViewportHeight()));
  return !0;
}
//@ chunk-18hwfzwa.js:117698-117913 fingerprint = jumpBy (0.903)
function jumpBy(h, x, D = !0) {
  let max = Math.max(0, h.getScrollHeight() - h.getViewportHeight()),
    target = Math.min(h.getScrollTop(), max) + h.getPendingDelta() + x;
  if (target >= max) return scrollToBottomRespectingAutoScroll(h);
  if (target <= 0 && D) m3n();
  return (h.scrollTo(Math.max(0, target)), !1);
}
//@ chunk-18hwfzwa.js:117913-118074 fingerprint = scrollDown (0.903)
function scrollDown(s, amount) {
  let max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
  if (s.getScrollTop() + s.getPendingDelta() + amount >= max) return scrollToBottomRespectingAutoScroll(s);
  return (s.scrollBy(amount), !1);
}
//@ chunk-18hwfzwa.js:118074-118190 fingerprint = scrollUp (1)
function scrollUp(h, x, D = !0) {
  if (h.getScrollTop() + h.getPendingDelta() - x <= 0) {
    if (D) m3n();
    h.scrollTo(0);
    return;
  }
  h.scrollBy(-x);
}
//@ chunk-18hwfzwa.js:118190-118634 fingerprint = applyModalPagerAction (0.928)
function applyModalPagerAction(s, act, onBeforeJump = !0) {
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
      return (s.scrollTo(0), !1);
    case "bottom":
      return (s.scrollToBottom(), !0);
  }
}
/**
 * 监听"滚轮发送方向键"和 JetBrains 2025.2 终端滚动缺陷事件，记录遥测并弹出提示。
 */
//@ chunk-18hwfzwa.js:118634-119573 sole-consumer
function useScrollAnomalyNotices(h) {
  let ee = w(5),
    { internal_eventEmitter: internal_eventEmitter } = useStdin(),
    D = useClock(),
    L = R(!1),
    ke,
    Re;
  if (ee[0] !== h || ee[1] !== D || ee[2] !== internal_eventEmitter)
    ((ke = () => {
      let He = function He(Be) {
        if (!L.current)
          ((L.current = !0),
            logEvent("tengu_scroll_arrows_detected", { count: Be.count, up: Be.direction === "up" }));
        D.setTimeout(
          () =>
            h({
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
        (logEvent("tengu_jediterm_scroll_bug_detected", {}),
          h({
            key: "jediterm-scroll-bug",
            kind: "contextual",
            priority: "immediate",
            text: "Scroll support in JetBrains IDE 2025.2 terminals is experimental \xB7 upgrade to 2025.3+ for the best experience",
            color: "suggestion",
            timeoutMs: 15000,
          }));
      };
      return (
        internal_eventEmitter.on("arrow-burst", He),
        internal_eventEmitter.on("jediterm-scroll-bug", We),
        () => {
          (internal_eventEmitter.off("arrow-burst", He),
            internal_eventEmitter.off("jediterm-scroll-bug", We));
        }
      );
    }),
      (Re = [internal_eventEmitter, h, D]),
      (ee[0] = h),
      (ee[1] = D),
      (ee[2] = internal_eventEmitter),
      (ee[3] = ke),
      (ee[4] = Re));
  else ((ke = ee[3]), (Re = ee[4]));
  P(ke, Re);
}
//@ chunk-18hwfzwa.js:119573-119577 sole-consumer
j();
//@ chunk-18hwfzwa.js:119577-119581 sole-consumer
j();
//@ chunk-18hwfzwa.js:119581-119585 sole-consumer
j();
//@ chunk-tzghj6zv.js:2704-2950 fingerprint = shouldClearSelectionOnKey (0.934)
function shouldClearSelectionOnKey(key) {
  if (key.wheelUp || key.wheelDown || key.escape) return !1;
  if (key.pageUp || key.pageDown) return !1;
  if ((key.home || key.end) && key.ctrl) return !1;
  if (
    (key.leftArrow || key.rightArrow || key.upArrow || key.downArrow || key.home || key.end) &&
    (key.shift || key.meta || key.super)
  )
    return !1;
  return !0;
}
//@ chunk-tzghj6zv.js:2950-3242 placement
function isPagerPassthroughKey(d) {
  if (d.name === "escape" || d.name === "pageup" || d.name === "pagedown") return !1;
  if ((d.name === "home" || d.name === "end") && d.ctrl) return !1;
  if (
    (d.name === "left" ||
      d.name === "right" ||
      d.name === "up" ||
      d.name === "down" ||
      d.name === "home" ||
      d.name === "end") &&
    (d.shift || d.meta || d.superKey)
  )
    return !1;
  return !0;
}
//@ chunk-tzghj6zv.js:3242-3502 placement
function modalPagerAction(d, h, x) {
  return (C) => {
    if (!d.hasSelection()) return;
    if (C.key === "c" && !C.meta && (C.ctrl || C.superKey)) {
      if (h.peek() !== null) d.clearSelection();
      else {
        let copySelection = d.copySelection();
        if (copySelection) x?.(copySelection);
      }
      if (C.ctrl && !C.shift) clearKeptClawdPose();
      C.consume();
      return;
    }
    if (isPagerPassthroughKey(C)) d.clearSelection();
  };
}
/**
 * 在 Scroll 上下文注册 selection:clear：有选区时清除选区。
 */
//@ chunk-tzghj6zv.js:3502-3638 placement
function useSelectionClearKeybinding(d, h = !0) {
  MessageActionsKeybindings(
    {
      "selection:clear": () => {
        if (!d.hasSelection()) return !1;
        (d.clearSelection(), clearKeptClawdPose());
      },
    },
    { context: "Scroll", isActive: h },
  );
}
//@ chunk-tzghj6zv.js:3638-3642 placement
j();
/**
 * 选中文字复制后的通知：按复制通道（系统剪贴板、tmux buffer、OSC 52）给出文案与时长，OSC 52 含非 UTF-8 风险时加警告。
 */
//@ chunk-tzghj6zv.js:3642-4400 placement
function buildCopiedNotification(d) {
  let h = getClipboardPath(),
    x = countGraphemes(d),
    C = x === 1 ? "char" : "chars",
    A,
    M;
  switch (h) {
    case "native":
      ((A = `copied ${x} ${C} to clipboard`), (M = `copied ${x} ${C}`));
      break;
    case "tmux-buffer":
      ((A = `copied ${x} ${C} to tmux buffer \xB7 paste with prefix + ]`),
        (M = "copied \xB7 paste with prefix + ]"));
      break;
    case "osc52":
      if (HX()) {
        A = `couldn't copy ${x} ${C} \xB7 select with ${describeMetaKey()} held, then use your terminal's Copy`;
        break;
      }
      ((A = `sent ${x} ${C} via OSC 52 \xB7 if paste fails, hold ${describeMetaKey()} while selecting for native copy`),
        (M = `sent ${x} ${C} via OSC 52`));
      break;
  }
  let O = getOsc52Utf8Warning(d);
  if (O) A = `\u26A0 ${O} \xB7 ${A}`;
  return {
    key: "selection-copied",
    kind: "feedback",
    text: A,
    color: tE() ? (O ? "warning" : void 0) : "suggestion",
    priority: "immediate",
    timeoutMs: O ? 6000 : h === "native" ? 2000 : 4000,
    ...(O || M === void 0 ? {} : { row1Hint: M }),
  };
}
//@ chunk-24t3dkzb.js:1978-2023 placement
function scrollStepLines(r, n, o) {
  return !n && (r || !1 || o) ? 3 : 1;
}
//@ chunk-24t3dkzb.js:2023-2169 fingerprint = readScrollSpeedBase (1)
function readScrollSpeedBase(r, n, o) {
  let u = scrollStepLines(r, n, o),
    raw = env.CLAUDE_CODE_SCROLL_SPEED;
  if (!raw) return u;
  let p = parseFloat(raw);
  return Number.isNaN(p) || p <= 0 ? u : Math.min(p, 20);
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
