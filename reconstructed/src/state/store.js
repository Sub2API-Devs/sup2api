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

/**
 * 极简状态容器：getState/setState(updater)/subscribe；状态引用不变时不通知，变化时先调用 onChange({newState, oldState}) 再通知订阅者。
 */
//@ chunk-2mbp91tg.js:706-962 fingerprint = createStore (0.922)
function createStore(initialState, onChange) {
  let r = initialState,
    listeners = new Set(),
    a = onChange && bindAsyncResource(onChange),
    s = () => r;
  return {
    getSnapshot: s,
    getState: s,
    setState: (updater) => {
      let o = r,
        next = updater(o);
      if (Object.is(next, o)) return;
      ((r = next), a?.({ newState: next, oldState: o }));
      for (let listener of listeners) listener();
    },
    subscribe: (listener) => {
      let o = bindAsyncResource(listener);
      return (listeners.add(o), () => listeners.delete(o));
    },
  };
}

export { createStore };
