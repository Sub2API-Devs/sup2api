/**
 * components/ui/OrderedListItem.tsx
 *
 * 有序列表项（编号 + 内容）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ui/OrderedListItem.tsx
 * pieces: chunk-s0v4e2v6.js (2)
 * attribution: callgraph-witnessed 1, fingerprint 1
 */
import { createContext, useContext } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s0v4e2v6.js:20366-20388 callgraph-witnessed (2.1.88 match: OrderedListItemContext, 1)
var OrderedListItemContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s0v4e2v6.js:20366", () => {
  OrderedListItemContext = createContext({
    marker: "",
  });
});
//@ chunk-s0v4e2v6.js:20388-20704 fingerprint (2.1.88 match: OrderedListItem, 1)
function OrderedListItem(props) {
  let $ = useMemoCache(7);
  let { children } = props;
  let { marker } = useContext(OrderedListItemContext);
  let t1;
  if ($[0] !== marker) {
    t1 = jsxProd_default(Text, {
      dimColor: true,
      children: marker,
    });
    $[0] = marker;
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] !== children) {
    t2 = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    $[2] = children;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] !== t1 || $[5] !== t2) {
    t3 = jsxProd_default_2(Box, {
      gap: 1,
      children: [t1, t2],
    });
    $[4] = t1;
    $[5] = t2;
    $[6] = t3;
  } else t3 = $[6];
  return t3;
}
export { OrderedListItem, OrderedListItemContext };
