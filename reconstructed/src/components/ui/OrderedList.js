/**
 * components/ui/OrderedList.tsx
 *
 * 有序列表组件（自动编号上下文）；本模块混入若干无关小函数。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ui/OrderedList.tsx
 * pieces: chunk-00qhwn8e.js (1), chunk-dcmhvw5a.js (1), chunk-p8fze0jh.js (2)
 * attribution: fingerprint 3, sole-consumer 1
 */
import { qt, Se, Fy, dh } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { OrderedListItem, OrderedListItemContext } from "./OrderedListItem.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { hr } from "../../utils/invisibleChars.js";

//@ chunk-p8fze0jh.js:19527-19549 sole-consumer
var M = qt({ marker: "" });
//@ chunk-p8fze0jh.js:19549-20134 fingerprint = OrderedListComponent (0.858)
function OrderedListComponent(t0) {
  let $ = w(9),
    { children: children } = t0,
    { marker: parentMarker } = Se(M),
    numberOfItems = 0;
  for (const child of Fy.toArray(children)) {
    if (!dh(child) || child.type !== OrderedListItem) {
      continue;
    }
    numberOfItems++;
  }
  let maxMarkerWidth = String(numberOfItems).length,
    k;
  if ($[0] !== children || $[1] !== maxMarkerWidth || $[2] !== parentMarker) {
    let u;
    if ($[4] !== maxMarkerWidth || $[5] !== parentMarker)
      ((u = (child_0, index) => {
        if (!dh(child_0) || child_0.type !== OrderedListItem) {
          return child_0;
        }
        let paddedMarker = `${String(index + 1).padStart(maxMarkerWidth)}.`;
        let marker = `${parentMarker}${paddedMarker}`;
        return e(M.Provider, {
          value: { marker: marker },
          children: e(OrderedListItemContext.Provider, { value: { marker: marker }, children: child_0 }),
        });
      }),
        ($[4] = maxMarkerWidth),
        ($[5] = parentMarker),
        ($[6] = u));
    else u = $[6];
    k = Fy.map(children, u);
    (($[0] = children), ($[1] = maxMarkerWidth), ($[2] = parentMarker), ($[3] = k));
  } else k = $[3];
  let u;
  if ($[7] !== k) ((u = e(Box, { flexDirection: "column", children: k })), ($[7] = k), ($[8] = u));
  else u = $[8];
  return u;
}
//@ chunk-00qhwn8e.js:17541-17596 fingerprint
function ls(v) {
  return e(OrderedListWithItem.Item, { label: `/${hr(v)}` }, v);
}
//@ chunk-dcmhvw5a.js:187858-187925 fingerprint = OrderedListContext (0.722)
function OrderedListContext(e, n) {
  return Object.freeze(e.filter((r) => r.marker === n));
}

export { ls, OrderedListComponent, OrderedListContext };
