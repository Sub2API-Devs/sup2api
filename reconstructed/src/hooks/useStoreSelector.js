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
import { j, Se, R, yt } from "../../vendor/react/cjs/react.production.js";
import { SpinnerPaceContext } from "../components/Spinner/paceContext.js";

//@ chunk-yn45f1gp.js:270-274 placement
j();
//@ chunk-yn45f1gp.js:274-312 placement
var NRr = () => a,
  a = () => {},
  c = () => {
    return;
  };
/**
 * 订阅状态仓库并按选择器取值：缓存上次快照与结果避免重复计算，订阅可经节奏控制器限速，仓库为空时返回默认值。
 */
//@ chunk-yn45f1gp.js:312-842 placement
function useStoreSelector(store, selector) {
  let pacer = Se(SpinnerPaceContext),
    stateRef = R(null);
  if (stateRef.current === null)
    stateRef.current = {
      select: selector,
      last: null,
      source: null,
      get: c,
      notifier: pacer,
      subscribe: NRr,
    };
  let state = stateRef.current;
  if (((state.select = selector), state.source !== store || state.notifier !== pacer))
    ((state.notifier = pacer),
      (state.subscribe = store ? (pacer?.paced(store.subscribe) ?? store.subscribe) : NRr));
  if (state.source !== store)
    ((state.source = store),
      (state.last = null),
      (state.get = store
        ? () => {
            let snapshot = store.getSnapshot(),
              select = state.select;
            if (!select) return snapshot;
            let last = state.last;
            if (last !== null && last.snapshot === snapshot && last.select === select) return last.selected;
            let selected = select(snapshot);
            return ((state.last = { snapshot: snapshot, select: select, selected: selected }), selected);
          }
        : c));
  return yt(state.subscribe, state.get, state.get);
}

export { useStoreSelector, NRr };
