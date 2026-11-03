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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";

//@ chunk-p8fze0jh.js:19189-19211 callgraph-witnessed = OrderedListItemContext (1)
var OrderedListItemContext = qt({ marker: "" });
//@ chunk-p8fze0jh.js:19211-19527 fingerprint = OrderedListItem (1)
function OrderedListItem(t0) {
  let $ = w(7),
    { children: children } = t0,
    { marker: marker } = Se(OrderedListItemContext),
    h;
  if ($[0] !== marker) ((h = e(Text, { dimColor: !0, children: marker })), ($[0] = marker), ($[1] = h));
  else h = $[1];
  let p;
  if ($[2] !== children)
    ((p = e(Box, { flexDirection: "column", children: children })), ($[2] = children), ($[3] = p));
  else p = $[3];
  let c;
  if ($[4] !== h || $[5] !== p)
    ((c = r(Box, { gap: 1, children: [h, p] })), ($[4] = h), ($[5] = p), ($[6] = c));
  else c = $[6];
  return c;
}

export { OrderedListItem, OrderedListItemContext };
