/**
 * components/Spinner/paceContext.ts
 *
 * 2.1.316 新增：Spinner 节奏控制上下文与默认（不延迟）实现。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mfvgtsgj.js (3)
 * attribution: placement 3
 */
import { init_react_production, qt } from "../../../vendor/react/cjs/react.production.js";
import { SCROLL_JUMP_LINES } from "../../ink/scrollConstants.js";

//@ chunk-mfvgtsgj.js:265-269 placement
init_react_production();
//@ chunk-mfvgtsgj.js:269-280 placement
var PACE_INTERVAL = 3 * SCROLL_JUMP_LINES;
//@ chunk-mfvgtsgj.js:280-365 placement
/**
 * Spinner 节奏控制上下文与默认（不延迟）实现。
 */
var SpinnerPaceContext = qt(null);
var IMMEDIATE_PACER = {
  deferred: (e) => e(),
  paced: (e) => e,
  flush: () => {},
  isDeferring: () => false,
};
export { SpinnerPaceContext, IMMEDIATE_PACER };
