/**
 * commands/continue/continueState.ts
 *
 * 2.1.316 新增：/continue（Continue in Projects）的进行中状态与结果发布
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ahda5p7e.js (11)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ahda5p7e.js:301-305 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ahda5p7e.js:301", () => {
  init_react_production();
});
//@ chunk-ahda5p7e.js:305-324 placement (2.1.88 match: matchesKeepGoingKeyword, 1)
var CONTINUE_COMMAND = "continue";
//@ chunk-ahda5p7e.js:324-493 placement
function normalizeContinueInput(input, state, options) {
  if (options && state === CONTINUE_COMMAND && input === CONTINUE_COMMAND + "/") return "/";
  if (
    state.startsWith("/") &&
    input.length === CONTINUE_COMMAND.length + state.length + 1 &&
    input.startsWith(CONTINUE_COMMAND + state)
  )
    return input.slice(CONTINUE_COMMAND.length);
  return input;
}
//@ chunk-ahda5p7e.js:493-549 placement
class ContinueState {
  lastResult = null;
  listeners = new Set();
  inFlight = null;
}
//@ chunk-ahda5p7e.js:549-573 placement
var CONTINUE_STATE_SLOT; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ahda5p7e.js:549", () => {
  CONTINUE_STATE_SLOT = new SessionRootSlot(() => new ContinueState());
});
//@ chunk-ahda5p7e.js:573-603 placement
function continueState() {
  return CONTINUE_STATE_SLOT.of(getRootSession());
}
//@ chunk-ahda5p7e.js:603-674 placement
function publishContinueResult(result) {
  let state = continueState();
  state.lastResult = result;
  for (let listener of state.listeners) listener(result);
}
//@ chunk-ahda5p7e.js:674-709 placement
function getContinueInFlight() {
  return continueState().inFlight;
}
//@ chunk-ahda5p7e.js:709-740 placement
function setContinueInFlight(inFlight) {
  continueState().inFlight = inFlight;
}
//@ chunk-ahda5p7e.js:740-783 placement
function resetContinueState() {
  publishContinueResult(null);
  continueState().inFlight = null;
}
//@ chunk-ahda5p7e.js:783-930 placement
function useContinueResult() {
  let [state, setState] = useState(() => continueState().lastResult);
  useEffect(() => {
    let state = continueState();
    setState(state.lastResult);
    state.listeners.add(setState);
    return () => {
      state.listeners.delete(setState);
    };
  }, []);
  return state;
}
export {
  resetContinueState,
  CONTINUE_COMMAND,
  normalizeContinueInput,
  getContinueInFlight,
  publishContinueResult,
  setContinueInFlight,
  useContinueResult,
};
