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
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { getRootSession } from "../../bootstrap/state.js";

//@ chunk-mw789w2b.js:268-272 placement
init_react_production();
//@ chunk-mw789w2b.js:272-291 placement
var CONTINUE_COMMAND = "continue";
//@ chunk-mw789w2b.js:291-460 placement
function normalizeContinueInput(t, e, n) {
  if (n && e === CONTINUE_COMMAND && t === CONTINUE_COMMAND + "/") return "/";
  if (
    e.startsWith("/") &&
    t.length === CONTINUE_COMMAND.length + e.length + 1 &&
    t.startsWith(CONTINUE_COMMAND + e)
  )
    return t.slice(CONTINUE_COMMAND.length);
  return t;
}
//@ chunk-mw789w2b.js:460-516 placement
class ContinueState {
  lastResult = null;
  listeners = new Set();
  inFlight = null;
}
//@ chunk-mw789w2b.js:516-540 placement
var CONTINUE_STATE_SLOT = new SessionRootSlot(() => new ContinueState());
//@ chunk-mw789w2b.js:540-570 placement
function continueState() {
  return CONTINUE_STATE_SLOT.of(getRootSession());
}
//@ chunk-mw789w2b.js:570-641 placement
function publishContinueResult(t) {
  let e = continueState();
  e.lastResult = t;
  for (let listener of e.listeners) listener(t);
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
  let [t, e] = y(() => continueState().lastResult);
  P(() => {
    let n = continueState();
    e(n.lastResult);
    n.listeners.add(e);
    return () => {
      n.listeners.delete(e);
    };
  }, []);
  return t;
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
