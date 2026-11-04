/**
 * commands/continue/continueState.ts
 *
 * 2.1.316 新增：/continue（Continue in Projects）的进行中状态与结果发布
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mw789w2b.js (11)
 * attribution: placement 11
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-mw789w2b.js:268-272 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-mw789w2b.js:268", () => {
  init_react_production();
});
//@ chunk-mw789w2b.js:272-291 placement
var CONTINUE_COMMAND = "continue";
//@ chunk-mw789w2b.js:291-460 placement
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
//@ chunk-mw789w2b.js:460-516 placement
class ContinueState {
  lastResult = null;
  listeners = new Set();
  inFlight = null;
}
//@ chunk-mw789w2b.js:516-540 placement
var CONTINUE_STATE_SLOT; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-mw789w2b.js:516", () => {
  CONTINUE_STATE_SLOT = new SessionRootSlot(() => new ContinueState());
});
//@ chunk-mw789w2b.js:540-570 placement
function continueState() {
  return CONTINUE_STATE_SLOT.of(getRootSession());
}
//@ chunk-mw789w2b.js:570-641 placement
function publishContinueResult(result) {
  let state = continueState();
  state.lastResult = result;
  for (let listener of state.listeners) listener(result);
}
//@ chunk-mw789w2b.js:641-676 placement
function getContinueInFlight() {
  return continueState().inFlight;
}
//@ chunk-mw789w2b.js:676-707 placement
function setContinueInFlight(inFlight) {
  continueState().inFlight = inFlight;
}
//@ chunk-mw789w2b.js:707-750 placement
function resetContinueState() {
  publishContinueResult(null);
  continueState().inFlight = null;
}
//@ chunk-mw789w2b.js:750-897 placement
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
