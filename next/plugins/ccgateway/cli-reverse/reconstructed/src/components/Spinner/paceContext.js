/**
 * components/Spinner/paceContext.ts
 *
 * 2.1.316 新增：Spinner 节奏控制上下文与默认（不延迟）实现。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-jbst5r02.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, createContext } from "../../../vendor/react/cjs/react.production.js";
import { SCROLL_JUMP_LINES } from "../../ink/scrollConstants.js";

//@ chunk-jbst5r02.js:265-269 placement
init_react_production();
//@ chunk-jbst5r02.js:269-280 placement
var PACE_INTERVAL = 3 * SCROLL_JUMP_LINES;
//@ chunk-jbst5r02.js:280-365 placement
/**
 * Spinner 节奏控制上下文与默认（不延迟）实现。
 */
var SpinnerPaceContext = createContext(null);
var IMMEDIATE_PACER = {
  deferred: (callback) => callback(),
  paced: (thunk) => thunk,
  flush: () => {},
  isDeferring: () => false,
};
export { SpinnerPaceContext, IMMEDIATE_PACER };
