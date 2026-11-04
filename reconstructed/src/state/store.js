/**
 * state/store.ts
 *
 * 极简状态容器 createStore（getState/setState/subscribe，变化时调用 onChange）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/state/store.ts
 * pieces: chunk-2mbp91tg.js (1)
 * attribution: fingerprint 1
 */
import { bindAsyncResource } from "../utils/asyncResourceBind.js";

//@ chunk-2mbp91tg.js:706-962 fingerprint = createStore (0.922)
/**
 * 极简状态容器：getState/setState(updater)/subscribe；状态引用不变时不通知，变化时先调用 onChange({newState, oldState}) 再通知订阅者。
 */
function createStore(initialState, onChange) {
  let state = initialState;
  let listeners = new Set();
  let boundOnChange = onChange && bindAsyncResource(onChange);
  let getState = () => state;
  return {
    getSnapshot: getState,
    getState,
    setState: (updater) => {
      let prev = state;
      let next = updater(prev);
      if (Object.is(next, prev)) return;
      state = next;
      boundOnChange?.({
        newState: next,
        oldState: prev,
      });
      for (let listener of listeners) listener();
    },
    subscribe: (listener) => {
      let boundListener = bindAsyncResource(listener);
      listeners.add(boundListener);
      return () => listeners.delete(boundListener);
    },
  };
}
export { createStore };
