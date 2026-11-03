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
import { j, qt } from "../../../vendor/react/cjs/react.production.js";
import { Xh } from "../../ink/scrollConstants.js";

//@ chunk-mfvgtsgj.js:265-269 placement
j();
//@ chunk-mfvgtsgj.js:269-280 placement
var c = 3 * Xh;
/**
 * Spinner 节奏控制上下文与默认（不延迟）实现。
 */
//@ chunk-mfvgtsgj.js:280-365 placement
var SpinnerPaceContext = qt(null),
  j_o = { deferred: (e) => e(), paced: (e) => e, flush: () => {}, isDeferring: () => !1 };

export { SpinnerPaceContext, j_o };
