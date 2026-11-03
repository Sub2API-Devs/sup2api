/**
 * components/ui/OrderedListItem.tsx
 *
 * 有序列表项（编号 + 内容）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ui/OrderedListItem.tsx
 * pieces: chunk-p8fze0jh.js (2)
 * attribution: callgraph-witnessed 1, fingerprint 1
 */
import { qt, Se } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-p8fze0jh.js:19189-19211 callgraph-witnessed = OrderedListItemContext (1)
var OrderedListItemContext = qt({
  marker: "",
});
//@ chunk-p8fze0jh.js:19211-19527 fingerprint = OrderedListItem (1)
function OrderedListItem(props) {
  let $ = w(7);
  let { children } = props;
  let { marker } = Se(OrderedListItemContext);
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
