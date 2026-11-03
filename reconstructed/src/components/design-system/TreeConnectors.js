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
import {
  init_react_production,
  qt,
  Fy,
  Se,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { _S } from "../../../vendor/chart.js/dist/chart.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { NoSelect } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-3n80spb1.js:421-425 placement
init_react_production();
//@ chunk-3n80spb1.js:425-507 placement
function _(p, d) {
  return jsxProd_default(
    Box,
    {
      width: 2,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: TREE_CONNECTOR_GLYPHS[p],
      }),
    },
    d,
  );
}
//@ chunk-3n80spb1.js:507-567 placement
var TREE_CONNECTOR_GLYPHS = {
  branch: _S.branch,
  last: _S.last,
  pipe: _S.pipe,
  space: "",
};
//@ chunk-3n80spb1.js:567-970 placement
function TreeConnectorsRow(props) {
  let a = w(7);
  let { connectors, children } = props;
  let o;
  if (a[0] !== connectors) {
    o =
      connectors.length > 0 &&
      jsxProd_default(NoSelect, {
        "aria-hidden": true,
        fromLeftEdge: true,
        flexShrink: 0,
        flexDirection: "row",
        children: connectors.map(_),
      });
    a[0] = connectors;
    a[1] = o;
  } else o = a[1];
  let l;
  if (a[2] !== children) {
    l = jsxProd_default(Box, {
      flexGrow: 1,
      flexShrink: 1,
      children,
    });
    a[2] = children;
    a[3] = l;
  } else l = a[3];
  let i;
  if (a[4] !== o || a[5] !== l) {
    i = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [o, l],
    });
    a[4] = o;
    a[5] = l;
    a[6] = i;
  } else i = a[6];
  return i;
}
//@ chunk-3n80spb1.js:970-1022 placement
var LIST_CONTEXT = qt({
  variant: "outline",
  ancestors: [],
});
var IS_LAST_ITEM_CONTEXT = qt(true);
//@ chunk-3n80spb1.js:1022-1135 placement
function wrapWithLastChildFlag(children, t = true) {
  let c = Fy.toArray(children);
  return c.map((children, o) =>
    jsxProd_default(
      IS_LAST_ITEM_CONTEXT.Provider,
      {
        value: t && o === c.length - 1,
        children,
      },
      o,
    ),
  );
}
//@ chunk-3n80spb1.js:1135-1564 placement
function Tree(props) {
  let o = w(10);
  let { children, variant } = props;
  let variant_2 = variant === undefined ? "outline" : variant;
  let ancestors;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    ancestors = [];
    o[0] = ancestors;
  } else ancestors = o[0];
  let value;
  if (o[1] !== variant_2) {
    value = {
      variant: variant_2,
      ancestors,
    };
    o[1] = variant_2;
    o[2] = value;
  } else value = o[2];
  let children_2;
  if (o[3] !== children) {
    children_2 = wrapWithLastChildFlag(children);
    o[3] = children;
    o[4] = children_2;
  } else children_2 = o[4];
  let children_3;
  if (o[5] !== children_2) {
    children_3 = jsxProd_default(Box, {
      flexDirection: "column",
      children: children_2,
    });
    o[5] = children_2;
    o[6] = children_3;
  } else children_3 = o[6];
  let v;
  if (o[7] !== value || o[8] !== children_3) {
    v = jsxProd_default(LIST_CONTEXT.Provider, {
      value,
      children: children_3,
    });
    o[7] = value;
    o[8] = children_3;
    o[9] = v;
  } else v = o[9];
  return v;
}
//@ chunk-3n80spb1.js:1564-2386 placement
function TreeNode(props) {
  let N = w(19);
  let { label, children, dimColor, color } = props;
  let { variant, ancestors } = Se(LIST_CONTEXT);
  let p = Se(IS_LAST_ITEM_CONTEXT);
  let d = variant === "outline" ? "last" : p ? "last" : "branch";
  let v = variant === "outline" ? "space" : p ? "space" : "pipe";
  let m = label != null && label !== false;
  let C = m ? label : children;
  let connectors;
  if (N[0] !== ancestors || N[1] !== d) {
    connectors = [...ancestors, d];
    N[0] = ancestors;
    N[1] = d;
    N[2] = connectors;
  } else connectors = N[2];
  let children_2;
  if (N[3] !== color || N[4] !== dimColor || N[5] !== C) {
    children_2 = isValidElement_default(C)
      ? C
      : jsxProd_default(Text, {
          dimColor,
          color,
          children: C,
        });
    N[3] = color;
    N[4] = dimColor;
    N[5] = C;
    N[6] = children_2;
  } else children_2 = N[6];
  let P;
  if (N[7] !== connectors || N[8] !== children_2) {
    P = jsxProd_default(TreeConnectorsRow, {
      connectors,
      children: children_2,
    });
    N[7] = connectors;
    N[8] = children_2;
    N[9] = P;
  } else P = N[9];
  let T;
  if (N[10] !== ancestors || N[11] !== children || N[12] !== v || N[13] !== m || N[14] !== variant) {
    T =
      m &&
      jsxProd_default(LIST_CONTEXT.Provider, {
        value: {
          variant,
          ancestors: [...ancestors, v],
        },
        children: wrapWithLastChildFlag(children),
      });
    N[10] = ancestors;
    N[11] = children;
    N[12] = v;
    N[13] = m;
    N[14] = variant;
    N[15] = T;
  } else T = N[15];
  let z;
  if (N[16] !== P || N[17] !== T) {
    z = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [P, T],
    });
    N[16] = P;
    N[17] = T;
    N[18] = z;
  } else z = N[18];
  return z;
}
//@ chunk-3n80spb1.js:2386-2509 placement
function TreeGroup(props) {
  let a = w(3);
  let { children } = props;
  let c = Se(IS_LAST_ITEM_CONTEXT);
  let o;
  if (a[0] !== children || a[1] !== c) {
    o = wrapWithLastChildFlag(children, c);
    a[0] = children;
    a[1] = c;
    a[2] = o;
  } else o = a[2];
  return o;
}
//@ chunk-3n80spb1.js:2509-2550 placement
var TreeConnectors = Object.assign(Tree, {
  Node: TreeNode,
  Group: TreeGroup,
});
export { TreeConnectors, TreeConnectorsRow };
