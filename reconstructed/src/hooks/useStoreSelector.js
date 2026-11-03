/**
 * hooks/useStoreSelector.ts
 *
 * 状态仓库选择器 hook（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-yn45f1gp.js (3)
 * attribution: placement 3
 */
import { init_react_production, Se, R, yt } from "../../vendor/react/cjs/react.production.js";
import { SpinnerPaceContext } from "../components/Spinner/paceContext.js";

//@ chunk-yn45f1gp.js:270-274 placement
init_react_production();
//@ chunk-yn45f1gp.js:274-312 placement
/**
 * 导出值：同一声明里的多个绑定：ZERO_SELECTOR（选择器返回常量 a）；returnConstantA（返回 a）；returnUndefined（返回 undefined）；位于「状态仓库选择器 hook（2.1.316 新增）」模块。
 */
var ZERO_SELECTOR = () => returnConstantA;
var returnConstantA = () => {};
var returnUndefined = () => {
  return;
};
//@ chunk-yn45f1gp.js:312-842 placement
/**
 * 订阅状态仓库并按选择器取值：缓存上次快照与结果避免重复计算，订阅可经节奏控制器限速，仓库为空时返回默认值。
 */
function useStoreSelector(store, selector) {
  let pacer = Se(SpinnerPaceContext);
  let stateRef = R(null);
  if (stateRef.current === null)
    stateRef.current = {
      select: selector,
      last: null,
      source: null,
      get: returnUndefined,
      notifier: pacer,
      subscribe: ZERO_SELECTOR,
    };
  let state = stateRef.current;
  state.select = selector;
  if (state.source !== store || state.notifier !== pacer) {
    state.notifier = pacer;
    state.subscribe = store ? (pacer?.paced(store.subscribe) ?? store.subscribe) : ZERO_SELECTOR;
  }
  if (state.source !== store) {
    state.source = store;
    state.last = null;
    state.get = store
      ? () => {
          let snapshot = store.getSnapshot();
          let select = state.select;
          if (!select) return snapshot;
          let last = state.last;
          if (last !== null && last.snapshot === snapshot && last.select === select) return last.selected;
          let selected = select(snapshot);
          state.last = {
            snapshot,
            select,
            selected,
          };
          return selected;
        }
      : returnUndefined;
  }
  return yt(state.subscribe, state.get, state.get);
}
export { useStoreSelector, ZERO_SELECTOR };
