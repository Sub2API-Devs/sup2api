/**
 * hooks/useRecentInputGuard.ts
 *
 * 2.1.316 新增：防止刚输入时误触对话框的最近输入保护 hook
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-pq6d88wp.js (5)
 * attribution: placement 5
 */
import { init_react_production, useState } from "../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../ink/components/Input.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-pq6d88wp.js:264-268 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-pq6d88wp.js:264", () => {
  init_react_production();
});
//@ chunk-pq6d88wp.js:268-286 placement
/**
 * 导出值：RECENT_INPUT_GUARD_MS（250）。
 */
var RECENT_INPUT_GUARD_MS_2 = 150;
var RECENT_INPUT_GUARD_MS = 250;
//@ chunk-pq6d88wp.js:286-297 placement
var INPUT_SETTLE_MS = 600;
//@ chunk-pq6d88wp.js:297-371 placement
function isWithinRecentInput(inputClock, at, windowMs = RECENT_INPUT_GUARD_MS_2) {
  let elapsedMs = inputClock() - at;
  if (elapsedMs >= 0) return elapsedMs < windowMs;
  return at <= Date.now();
}
//@ chunk-pq6d88wp.js:371-510 placement
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
  return function () {
    return isWithinRecentInput(inputClock, state.at);
  };
}
export {
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS,
  RECENT_INPUT_GUARD_MS_2,
  INPUT_SETTLE_MS,
  useRecentInputGuard,
};
