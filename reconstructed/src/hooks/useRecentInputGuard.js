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
import { j, y } from "../../vendor/react/cjs/react.production.js";
import { useInputClock } from "../ink/components/Input.js";

//@ chunk-pq6d88wp.js:264-268 placement
j();
//@ chunk-pq6d88wp.js:268-286 placement
var RECENT_INPUT_GUARD_MS = 150,
  So = 250;
//@ chunk-pq6d88wp.js:286-297 placement
var INPUT_SETTLE_MS = 600;
//@ chunk-pq6d88wp.js:297-371 placement
function isWithinRecentInput(e, t, n = RECENT_INPUT_GUARD_MS) {
  let o = e() - t;
  if (o >= 0) return o < n;
  return t <= Date.now();
}
//@ chunk-pq6d88wp.js:371-510 placement
function useRecentInputGuard(e) {
  let t = useInputClock(),
    [n, o] = y(() => ({ key: e, at: Date.now() }));
  if (n.key !== e) o({ key: e, at: Date.now() });
  return function () {
    return isWithinRecentInput(t, n.at);
  };
}

export { isWithinRecentInput, So, RECENT_INPUT_GUARD_MS, INPUT_SETTLE_MS, useRecentInputGuard };
