/**
 * components/CustomSelect/option-map.ts
 *
 * 选项链表映射（OptionMap：按 value 查前后选项，用于键盘导航）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/option-map.ts
 * pieces: chunk-ey2qag4x.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { init_react_production, y, ce } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ey2qag4x.js:37014-37018 placement
init_react_production();
//@ chunk-ey2qag4x.js:37018-37022 placement
init_react_production();
//@ chunk-ey2qag4x.js:37064-37068 placement
init_react_production();
//@ chunk-ey2qag4x.js:37068-37264 placement
/**
 * 同时返回状态值、setter 与读取最新值的 getter 的 state hook。
 */
function useLatestState(t) {
  let [o] = y(() => ({
    value: isFunction(t) ? t() : t,
  }));
  let [i, a] = y(o.value);
  let l = ce(
    (d) => {
      let u = isFunction_2(d) ? d(o.value) : d;
      if (Object.is(u, o.value)) return;
      o.value = u;
      a(() => u);
    },
    [o],
  );
  let f = ce(() => o.value, [o]);
  return [i, l, f];
}
//@ chunk-ey2qag4x.js:37264-37308 placement
function isFunction(t) {
  return typeof t === "function";
}
//@ chunk-ey2qag4x.js:37308-37352 placement
function isFunction_2(t) {
  return typeof t === "function";
}
//@ chunk-ey2qag4x.js:37352-37574 fingerprint = OptionMap (1)
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
