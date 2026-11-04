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
import {
  createContext,
  useContext,
  childrenExport,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { OrderedListItem, OrderedListItemContext } from "./OrderedListItem.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { stripInvisibleChars } from "../../utils/invisibleChars.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:187858-187925 fingerprint (2.1.88 match: OrderedListContext, 0.722)
function OrderedListContext(items, marker) {
  return Object.freeze(items.filter((item) => item.marker === marker));
}
//@ chunk-p8fze0jh.js:19527-19549 sole-consumer
var orderedListMarker; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p8fze0jh.js:19527", () => {
  orderedListMarker = createContext({
    marker: "",
  });
});
//@ chunk-p8fze0jh.js:19549-20134 fingerprint (2.1.88 match: OrderedListComponent, 0.858)
function OrderedListComponent(props) {
  let $ = useMemoCache(9);
  let { children } = props;
  let { marker: parentMarker } = useContext(orderedListMarker);
  let numberOfItems = 0;
  for (const child of childrenExport.toArray(children)) {
    if (!isValidElement_default(child) || child.type !== OrderedListItem) {
      continue;
    }
    numberOfItems++;
  }
  let maxMarkerWidth = String(numberOfItems).length;
  let children_2;
  if ($[0] !== children || $[1] !== maxMarkerWidth || $[2] !== parentMarker) {
    let t2;
    if ($[4] !== maxMarkerWidth || $[5] !== parentMarker) {
      t2 = (child, index) => {
        if (!isValidElement_default(child) || child.type !== OrderedListItem) {
          return child;
        }
        let paddedMarker = `${String(index + 1).padStart(maxMarkerWidth)}.`;
        let marker = `${parentMarker}${paddedMarker}`;
        return jsxProd_default(orderedListMarker.Provider, {
          value: {
            marker,
          },
          children: jsxProd_default(OrderedListItemContext.Provider, {
            value: {
              marker,
            },
            children: child,
          }),
        });
      };
      $[4] = maxMarkerWidth;
      $[5] = parentMarker;
      $[6] = t2;
    } else t2 = $[6];
    children_2 = childrenExport.map(children, t2);
    $[0] = children;
    $[1] = maxMarkerWidth;
    $[2] = parentMarker;
    $[3] = children_2;
  } else children_2 = $[3];
  let t2;
  if ($[7] !== children_2) {
    t2 = jsxProd_default(Box, {
      flexDirection: "column",
      children: children_2,
    });
    $[7] = children_2;
    $[8] = t2;
  } else t2 = $[8];
  return t2;
}
//@ chunk-00qhwn8e.js:17541-17596 fingerprint
function renderSlashSkillItem(command) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: `/${stripInvisibleChars(command)}`,
    },
    command,
  );
}
export { renderSlashSkillItem, OrderedListComponent, OrderedListContext };
