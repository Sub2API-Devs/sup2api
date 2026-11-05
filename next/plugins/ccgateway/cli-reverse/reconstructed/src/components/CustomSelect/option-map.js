/**
 * components/CustomSelect/option-map.ts
 *
 * 选项链表映射（OptionMap：按 value 查前后选项，用于键盘导航）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/option-map.ts
 * pieces: chunk-p1yqn9ds.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { init_react_production, useState, useCallback } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-p1yqn9ds.js:36635-36639 placement
init_react_production();
//@ chunk-p1yqn9ds.js:36639-36643 placement
init_react_production();
//@ chunk-p1yqn9ds.js:36685-36689 placement
init_react_production();
//@ chunk-p1yqn9ds.js:36689-36885 placement
/**
 * 同时返回状态值、setter 与读取最新值的 getter 的 state hook。
 */
function useLatestState(initial) {
  let [holder] = useState(() => ({
    value: isFunction(initial) ? initial() : initial,
  }));
  let [value, setValue] = useState(holder.value);
  let update = useCallback(
    (next) => {
      let nextValue = isFunction_2(next) ? next(holder.value) : next;
      if (Object.is(nextValue, holder.value)) return;
      holder.value = nextValue;
      setValue(() => nextValue);
    },
    [holder],
  );
  let getLatest = useCallback(() => holder.value, [holder]);
  return [value, update, getLatest];
}
//@ chunk-p1yqn9ds.js:36885-36929 placement
function isFunction(value) {
  return typeof value === "function";
}
//@ chunk-p1yqn9ds.js:36929-36973 placement
function isFunction_2(value) {
  return typeof value === "function";
}
//@ chunk-p1yqn9ds.js:36973-37195 fingerprint (2.1.88 match: OptionMap, 1)
class OptionMap extends Map {
  first;
  last;
  constructor(options) {
    let items = [];
    let firstItem;
    let lastItem;
    let previous;
    let index = 0;
    for (let option of options) {
      let item = {
        value: option.value,
        previous,
        next: undefined,
        index,
      };
      if (previous) previous.next = item;
      firstItem ||= item;
      lastItem = item;
      items.push([option.value, item]);
      index++;
      previous = item;
    }
    super(items);
    this.first = firstItem;
    this.last = lastItem;
  }
}
export { useLatestState, OptionMap };
