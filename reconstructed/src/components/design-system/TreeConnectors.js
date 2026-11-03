/**
 * components/design-system/TreeConnectors.tsx
 *
 * 2.1.316 新增：树形连接线组件（Tree/Node/Group）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3n80spb1.js (10)
 * attribution: placement 10
 */
import { j, qt, Fy, Se, dh } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { _S } from "../../../vendor/chart.js/dist/chart.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { NoSelect } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-3n80spb1.js:421-425 placement
j();
//@ chunk-3n80spb1.js:425-507 placement
function _(p, d) {
  return e(Box, { width: 2, children: e(Text, { dimColor: !0, children: k[p] }) }, d);
}
//@ chunk-3n80spb1.js:507-567 placement
var k = { branch: _S.branch, last: _S.last, pipe: _S.pipe, space: "" };
//@ chunk-3n80spb1.js:567-970 placement
function TreeConnectorsRow(u) {
  let a = w(7),
    { connectors: connectors, children: children } = u,
    o;
  if (a[0] !== connectors)
    ((o =
      connectors.length > 0 &&
      e(NoSelect, {
        "aria-hidden": !0,
        fromLeftEdge: !0,
        flexShrink: 0,
        flexDirection: "row",
        children: connectors.map(_),
      })),
      (a[0] = connectors),
      (a[1] = o));
  else o = a[1];
  let l;
  if (a[2] !== children)
    ((l = e(Box, { flexGrow: 1, flexShrink: 1, children: children })), (a[2] = children), (a[3] = l));
  else l = a[3];
  let i;
  if (a[4] !== o || a[5] !== l)
    ((i = r(Box, { flexDirection: "row", children: [o, l] })), (a[4] = o), (a[5] = l), (a[6] = i));
  else i = a[6];
  return i;
}
//@ chunk-3n80spb1.js:970-1022 placement
var R = qt({ variant: "outline", ancestors: [] }),
  f = qt(!0);
//@ chunk-3n80spb1.js:1022-1135 placement
function wrapWithLastChildFlag(u, t = !0) {
  let toArray = Fy.toArray(u);
  return toArray.map((a, o) => e(f.Provider, { value: t && o === toArray.length - 1, children: a }, o));
}
//@ chunk-3n80spb1.js:1135-1564 placement
function Tree(u) {
  let o = w(10),
    { children: children, variant: variant } = u,
    a = variant === void 0 ? "outline" : variant,
    l;
  if (o[0] === MEMO_CACHE_SENTINEL) ((l = []), (o[0] = l));
  else l = o[0];
  let i;
  if (o[1] !== a) ((i = { variant: a, ancestors: l }), (o[1] = a), (o[2] = i));
  else i = o[2];
  let p;
  if (o[3] !== children) ((p = wrapWithLastChildFlag(children)), (o[3] = children), (o[4] = p));
  else p = o[4];
  let d;
  if (o[5] !== p) ((d = e(Box, { flexDirection: "column", children: p })), (o[5] = p), (o[6] = d));
  else d = o[6];
  let v;
  if (o[7] !== i || o[8] !== d)
    ((v = e(R.Provider, { value: i, children: d })), (o[7] = i), (o[8] = d), (o[9] = v));
  else v = o[9];
  return v;
}
//@ chunk-3n80spb1.js:1564-2386 placement
function TreeNode(u) {
  let N = w(19),
    { label: label, children: children, dimColor: dimColor, color: color } = u,
    { variant: variant, ancestors: ancestors } = Se(R),
    p = Se(f),
    d = variant === "outline" ? "last" : p ? "last" : "branch",
    v = variant === "outline" ? "space" : p ? "space" : "pipe",
    m = label != null && label !== !1,
    C = m ? label : children,
    x;
  if (N[0] !== ancestors || N[1] !== d) ((x = [...ancestors, d]), (N[0] = ancestors), (N[1] = d), (N[2] = x));
  else x = N[2];
  let b;
  if (N[3] !== color || N[4] !== dimColor || N[5] !== C)
    ((b = dh(C) ? C : e(Text, { dimColor: dimColor, color: color, children: C })),
      (N[3] = color),
      (N[4] = dimColor),
      (N[5] = C),
      (N[6] = b));
  else b = N[6];
  let P;
  if (N[7] !== x || N[8] !== b)
    ((P = e(TreeConnectorsRow, { connectors: x, children: b })), (N[7] = x), (N[8] = b), (N[9] = P));
  else P = N[9];
  let T;
  if (N[10] !== ancestors || N[11] !== children || N[12] !== v || N[13] !== m || N[14] !== variant)
    ((T =
      m &&
      e(R.Provider, {
        value: { variant: variant, ancestors: [...ancestors, v] },
        children: wrapWithLastChildFlag(children),
      })),
      (N[10] = ancestors),
      (N[11] = children),
      (N[12] = v),
      (N[13] = m),
      (N[14] = variant),
      (N[15] = T));
  else T = N[15];
  let z;
  if (N[16] !== P || N[17] !== T)
    ((z = r(Box, { flexDirection: "column", children: [P, T] })), (N[16] = P), (N[17] = T), (N[18] = z));
  else z = N[18];
  return z;
}
//@ chunk-3n80spb1.js:2386-2509 placement
function TreeGroup(u) {
  let a = w(3),
    { children: children } = u,
    c = Se(f),
    o;
  if (a[0] !== children || a[1] !== c)
    ((o = wrapWithLastChildFlag(children, c)), (a[0] = children), (a[1] = c), (a[2] = o));
  else o = a[2];
  return o;
}
//@ chunk-3n80spb1.js:2509-2550 placement
var TreeConnectors = Object.assign(Tree, { Node: TreeNode, Group: TreeGroup });

export { TreeConnectors, TreeConnectorsRow };
