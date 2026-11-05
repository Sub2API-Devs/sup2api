/**
 * hooks/useRecentInputGuard.ts
 *
 * 2.1.316 新增：防止刚输入时误触对话框的最近输入保护 hook
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y9ge9zb9.js (7)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useState,
  useRef,
  useContext,
  useInsertionEffect,
  useLayoutEffect,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { terminalProbeContext } from "../ink/terminalProbe.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-y9ge9zb9.js:316-320 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y9ge9zb9.js:316", () => {
  init_react_production();
});
//@ chunk-y9ge9zb9.js:320-338 placement
/**
 * 导出值：RECENT_INPUT_GUARD_MS（250）。
 */
var RECENT_INPUT_GUARD_MS_2 = 150;
var RECENT_INPUT_GUARD_MS = 250;
//@ chunk-y9ge9zb9.js:338-349 placement
var INPUT_SETTLE_MS = 600;
//@ chunk-y9ge9zb9.js:349-423 placement
function isWithinRecentInput(inputClock, at, windowMs = RECENT_INPUT_GUARD_MS_2) {
  let elapsedMs = inputClock() - at;
  if (elapsedMs >= 0) return elapsedMs < windowMs;
  return at <= Date.now();
}
//@ chunk-y9ge9zb9.js:423-580 placement
function useRecentInputGuard(key) {
  let inputClock = useInputClock();
  let [state, setState] = useState(() => ({
    key,
    at: Date.now(),
  }));
  if (state.key !== key)
    setState({
      key,
      at: Date.now(),
    });
  let atGuard = useRecentInputStamp(state.at);
  return function () {
    return isWithinRecentInput(inputClock, atGuard(state.at));
  };
}
//@ chunk-y9ge9zb9.js:580-1114 placement
/**
 * 最近输入保护的时间戳转换：把刚收到的输入时间在绘制后保留一段，供对话框延迟弹出。
 */
function useRecentInputStamp(stamp) {
  let [frozen] = useState(() => (stamp !== 0 && Date.now() - stamp >= RECENT_INPUT_GUARD_MS_2 ? stamp : 0));
  let active = stamp === frozen ? 0 : stamp;
  let state = useRef({
    stamp: 0,
    at: 0,
    painted: false,
  });
  let schedule = useContext(terminalProbeContext) ?? noopSchedule;
  useInsertionEffect(() => {
    if (active === 0 || (state.current.stamp === active && state.current.painted)) return;
    let at = state.current.stamp === active ? state.current.at : active;
    state.current = {
      stamp: active,
      at,
      painted: false,
    };
    let frame = schedule(() => {
      state.current = {
        stamp: active,
        at: Math.max(state.current.at, Date.now()),
        painted: true,
      };
      frame();
    });
    return frame;
  }, [active, schedule]);
  useLayoutEffect(() => {
    if (active !== 0 && state.current.stamp === active && !state.current.painted)
      state.current = {
        stamp: active,
        at: Math.max(active, Date.now()),
        painted: false,
      };
  }, [active]);
  return useCallback((value) => (value === state.current.stamp ? state.current.at : value), []);
}
//@ chunk-y9ge9zb9.js:1114-1140 placement
function noopSchedule() {
  return () => {};
}
export {
  isWithinRecentInput,
  INPUT_SETTLE_MS,
  RECENT_INPUT_GUARD_MS,
  useRecentInputStamp,
  RECENT_INPUT_GUARD_MS_2,
  useRecentInputGuard,
};
