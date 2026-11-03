/**
 * ink/components/ClockContext.tsx
 *
 * 并入时钟上下文 useClock 与 StyledText
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/components/ClockContext.tsx
 * pieces: chunk-cg10fy59.js (5), chunk-x6v6jz2y.js (4)
 * attribution: placement 8, fingerprint 1
 */
import { SCROLL_JUMP_LINES } from "../scrollConstants.js";
import { qt, y, P, init_react_production, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalFocus } from "../hooks/use-terminal-focus.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText } from "./Text.js";

//@ chunk-cg10fy59.js:902-928 placement
function useClockTick() {
  return ClockProvider_2(SCROLL_JUMP_LINES);
}
//@ chunk-cg10fy59.js:928-1020 placement
/**
 * 导出值：同一声明里的多个绑定：defaultSetTimeout（setTimeout 包装）；noopClock（空时钟）；nullClock（恒 null）；位于「并入时钟上下文 useClock 与 StyledText」模块。
 */
var defaultSetTimeout = (c, r) => {
  let timer = setTimeout(c, r);
  return () => clearTimeout(timer);
};
var noopClock = () => () => {};
var nullClock = () => null;
//@ chunk-cg10fy59.js:1020-1614 placement
function ClockProvider_2(tickIntervalMs) {
  let subscribers = new Map();
  let interval = null;
  let currentTickIntervalMs = tickIntervalMs;
  let startTime = performance.now();
  let tickTime = 0;
  function tick() {
    tickTime = performance.now() - startTime;
    for (let onChange of subscribers.keys()) onChange();
  }
  function updateInterval() {
    if ([...subscribers.values()].some(Boolean)) {
      if (interval !== null) clearInterval(interval);
      else tickTime = performance.now() - startTime;
      interval = setInterval(tick, currentTickIntervalMs);
    } else if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
  }
  function f(onChange, keepAlive) {
    subscribers.set(onChange, keepAlive);
    updateInterval();
    return () => {
      subscribers.delete(onChange);
      updateInterval();
    };
  }
  return {
    subscribeKeepAlive(onChange) {
      return f(onChange, true);
    },
    subscribeFollower(onChange) {
      return f(onChange, false);
    },
    now() {
      if (interval !== null) return tickTime;
      return performance.now() - startTime;
    },
    setTickInterval(ms) {
      if (ms === currentTickIntervalMs) return;
      currentTickIntervalMs = ms;
      updateInterval();
    },
    setTimeout(o, m) {
      let timer = setTimeout(o, m);
      return () => clearTimeout(timer);
    },
  };
}
//@ chunk-cg10fy59.js:1614-1637 placement
/**
 * 导出值：同一声明里的多个绑定：clockContext（时钟上下文）；CLOCK_INTERVAL_MS（tick 的两倍）；位于「并入时钟上下文 useClock 与 StyledText」模块。
 */
var clockContext = qt(null);
var CLOCK_INTERVAL_MS = SCROLL_JUMP_LINES * 2;
//@ chunk-cg10fy59.js:1637-1925 fingerprint = createClock (0.744)
/**
 * 动画时钟 Provider：终端有焦点时按正常帧间隔滴答，失焦时放慢，供 useAnimationFrame 等订阅。
 */
function ClockProvider(props) {
  let $ = w(7);
  let { children } = props;
  let [clock] = y(useClockTick);
  let isFocused = useTerminalFocus();
  let t1;
  let t2;
  if ($[0] !== clock || $[1] !== isFocused) {
    t1 = () => {
      clock.setTickInterval(isFocused ? SCROLL_JUMP_LINES : CLOCK_INTERVAL_MS);
    };
    t2 = [clock, isFocused];
    $[0] = clock;
    $[1] = isFocused;
    $[2] = t1;
    $[3] = t2;
  } else {
    t1 = $[2];
    t2 = $[3];
  }
  P(t1, t2);
  let t3;
  if ($[4] !== children || $[5] !== clock) {
    t3 = jsxProd_default(clockContext.Provider, {
      value: clock,
      children,
    });
    $[4] = children;
    $[5] = clock;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
//@ chunk-x6v6jz2y.js:16990-17463 placement = StyledText (1)
/**
 * <Ansi> 渲染每个样式段用的小组件：粗体与暗不能同时生效时优先暗，否则粗体，再否则普通 <Text>。
 */
function StyledText(t0) {
  let $ = w(14);
  let bold;
  let children;
  let dim;
  let rest;
  if ($[0] !== t0) {
    ({ bold, dim, children, ...rest } = t0);
    $[0] = t0;
    $[1] = bold;
    $[2] = children;
    $[3] = dim;
    $[4] = rest;
  } else {
    bold = $[1];
    children = $[2];
    dim = $[3];
    rest = $[4];
  }
  if (dim) {
    let t1;
    if ($[5] !== children || $[6] !== rest) {
      t1 = jsxProd_default(BaseText, {
        ...rest,
        dim: true,
        children,
      });
      $[5] = children;
      $[6] = rest;
      $[7] = t1;
    } else t1 = $[7];
    return t1;
  }
  if (bold) {
    let t1;
    if ($[8] !== children || $[9] !== rest) {
      t1 = jsxProd_default(BaseText, {
        ...rest,
        bold: true,
        children,
      });
      $[8] = children;
      $[9] = rest;
      $[10] = t1;
    } else t1 = $[10];
    return t1;
  }
  let t1;
  if ($[11] !== children || $[12] !== rest) {
    t1 = jsxProd_default(BaseText, {
      ...rest,
      children,
    });
    $[11] = children;
    $[12] = rest;
    $[13] = t1;
  } else t1 = $[13];
  return t1;
}
//@ chunk-x6v6jz2y.js:17463-17467 placement
init_react_production();
//@ chunk-x6v6jz2y.js:17467-17471 placement
init_react_production();
//@ chunk-x6v6jz2y.js:17471-17573 placement
function useClock() {
  let o = Se(clockContext);
  if (!o) throw Error("useClock must be used within a ClockProvider");
  return o;
}
export { useClock, clockContext, defaultSetTimeout, ClockProvider, noopClock, StyledText, nullClock };
