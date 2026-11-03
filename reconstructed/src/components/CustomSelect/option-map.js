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
import { j, y, ce } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-ey2qag4x.js:37014-37018 placement
j();
//@ chunk-ey2qag4x.js:37018-37022 placement
j();
//@ chunk-ey2qag4x.js:37064-37068 placement
j();
/**
 * 同时返回状态值、setter 与读取最新值的 getter 的 state hook。
 */
//@ chunk-ey2qag4x.js:37068-37264 placement
function useLatestState(t) {
  let [o] = y(() => ({ value: hc(t) ? t() : t })),
    [i, a] = y(o.value),
    l = ce(
      (d) => {
        let u = bc(d) ? d(o.value) : d;
        if (Object.is(u, o.value)) return;
        ((o.value = u), a(() => u));
      },
      [o],
    ),
    f = ce(() => o.value, [o]);
  return [i, l, f];
}
//@ chunk-ey2qag4x.js:37264-37308 placement
function hc(t) {
  return typeof t === "function";
}
//@ chunk-ey2qag4x.js:37308-37352 placement
function bc(t) {
  return typeof t === "function";
}
//@ chunk-ey2qag4x.js:37352-37574 fingerprint = OptionMap (1)
class OptionMap extends Map {
  first;
  last;
  constructor(t) {
    let o = [],
      i,
      a,
      l,
      f = 0;
    for (let d of t) {
      let u = { value: d.value, previous: l, next: void 0, index: f };
      if (l) l.next = u;
      ((i ||= u), (a = u), o.push([d.value, u]), f++, (l = u));
    }
    super(o);
    ((this.first = i), (this.last = a));
  }
}

export { useLatestState, OptionMap };
