/**
 * components/design-system/TreeConnectors.tsx
 *
 * 2.1.316 新增：树形连接线组件（Tree/Node/Group）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xq6cmpjt.js (10)
 * attribution: placement 10
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  createContext,
  childrenExport,
  useContext,
  isValidElement_default,
} from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { TREE_GLYPHS } from "../../../vendor/chart.js/dist/chart.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { NoSelect } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xq6cmpjt.js:421-425 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xq6cmpjt.js:421", () => {
  init_react_production();
});
//@ chunk-xq6cmpjt.js:425-507 placement
function _(connector, key) {
  return jsxProd_default(
    Box,
    {
      width: 2,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: TREE_CONNECTOR_GLYPHS[connector],
      }),
    },
    key,
  );
}
//@ chunk-xq6cmpjt.js:507-567 placement
var TREE_CONNECTOR_GLYPHS; // deferred: uses ROUNDED_BOX_CORNERS (../../../vendor/chart.js/dist/chart.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xq6cmpjt.js:507", () => {
  TREE_CONNECTOR_GLYPHS = {
    branch: TREE_GLYPHS.branch,
    last: TREE_GLYPHS.last,
    pipe: TREE_GLYPHS.pipe,
    space: "",
  };
});
//@ chunk-xq6cmpjt.js:567-970 placement
function TreeConnectorsRow(props) {
  let $ = useMemoCache(7);
  let { connectors, children } = props;
  let connectorCells;
  if ($[0] !== connectors) {
    connectorCells =
      connectors.length > 0 &&
      jsxProd_default(NoSelect, {
        "aria-hidden": true,
        fromLeftEdge: true,
        flexShrink: 0,
        flexDirection: "row",
        children: connectors.map(_),
      });
    $[0] = connectors;
    $[1] = connectorCells;
  } else connectorCells = $[1];
  let content;
  if ($[2] !== children) {
    content = jsxProd_default(Box, {
      flexGrow: 1,
      flexShrink: 1,
      children,
    });
    $[2] = children;
    $[3] = content;
  } else content = $[3];
  let row;
  if ($[4] !== connectorCells || $[5] !== content) {
    row = jsxProd_default_2(Box, {
      flexDirection: "row",
      children: [connectorCells, content],
    });
    $[4] = connectorCells;
    $[5] = content;
    $[6] = row;
  } else row = $[6];
  return row;
}
//@ chunk-xq6cmpjt.js:970-1022 placement
var LIST_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var IS_LAST_ITEM_CONTEXT;
deferInit("chunk-xq6cmpjt.js:970", () => {
  LIST_CONTEXT = createContext({
    variant: "outline",
    ancestors: [],
  });
  IS_LAST_ITEM_CONTEXT = createContext(true);
});
//@ chunk-xq6cmpjt.js:1022-1135 placement
function wrapWithLastChildFlag(children, isLastParent = true) {
  let items = childrenExport.toArray(children);
  return items.map((children, index) =>
    jsxProd_default(
      IS_LAST_ITEM_CONTEXT.Provider,
      {
        value: isLastParent && index === items.length - 1,
        children,
      },
      index,
    ),
  );
}
//@ chunk-xq6cmpjt.js:1135-1564 placement
function Tree(props) {
  let $ = useMemoCache(10);
  let { children, variant } = props;
  let variant_2 = variant === undefined ? "outline" : variant;
  let ancestors;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ancestors = [];
    $[0] = ancestors;
  } else ancestors = $[0];
  let value;
  if ($[1] !== variant_2) {
    value = {
      variant: variant_2,
      ancestors,
    };
    $[1] = variant_2;
    $[2] = value;
  } else value = $[2];
  let children_2;
  if ($[3] !== children) {
    children_2 = wrapWithLastChildFlag(children);
    $[3] = children;
    $[4] = children_2;
  } else children_2 = $[4];
  let children_3;
  if ($[5] !== children_2) {
    children_3 = jsxProd_default(Box, {
      flexDirection: "column",
      children: children_2,
    });
    $[5] = children_2;
    $[6] = children_3;
  } else children_3 = $[6];
  let tree;
  if ($[7] !== value || $[8] !== children_3) {
    tree = jsxProd_default(LIST_CONTEXT.Provider, {
      value,
      children: children_3,
    });
    $[7] = value;
    $[8] = children_3;
    $[9] = tree;
  } else tree = $[9];
  return tree;
}
//@ chunk-xq6cmpjt.js:1564-2386 placement
function TreeNode(props) {
  let $ = useMemoCache(19);
  let { label, children, dimColor, color } = props;
  let { variant, ancestors } = useContext(LIST_CONTEXT);
  let isLast = useContext(IS_LAST_ITEM_CONTEXT);
  let ownConnector = variant === "outline" ? "last" : isLast ? "last" : "branch";
  let childConnector = variant === "outline" ? "space" : isLast ? "space" : "pipe";
  let hasLabel = label != null && label !== false;
  let nodeContent = hasLabel ? label : children;
  let connectors;
  if ($[0] !== ancestors || $[1] !== ownConnector) {
    connectors = [...ancestors, ownConnector];
    $[0] = ancestors;
    $[1] = ownConnector;
    $[2] = connectors;
  } else connectors = $[2];
  let children_2;
  if ($[3] !== color || $[4] !== dimColor || $[5] !== nodeContent) {
    children_2 = isValidElement_default(nodeContent)
      ? nodeContent
      : jsxProd_default(Text, {
          dimColor,
          color,
          children: nodeContent,
        });
    $[3] = color;
    $[4] = dimColor;
    $[5] = nodeContent;
    $[6] = children_2;
  } else children_2 = $[6];
  let nodeRow;
  if ($[7] !== connectors || $[8] !== children_2) {
    nodeRow = jsxProd_default(TreeConnectorsRow, {
      connectors,
      children: children_2,
    });
    $[7] = connectors;
    $[8] = children_2;
    $[9] = nodeRow;
  } else nodeRow = $[9];
  let childrenBlock;
  if (
    $[10] !== ancestors ||
    $[11] !== children ||
    $[12] !== childConnector ||
    $[13] !== hasLabel ||
    $[14] !== variant
  ) {
    childrenBlock =
      hasLabel &&
      jsxProd_default(LIST_CONTEXT.Provider, {
        value: {
          variant,
          ancestors: [...ancestors, childConnector],
        },
        children: wrapWithLastChildFlag(children),
      });
    $[10] = ancestors;
    $[11] = children;
    $[12] = childConnector;
    $[13] = hasLabel;
    $[14] = variant;
    $[15] = childrenBlock;
  } else childrenBlock = $[15];
  let column;
  if ($[16] !== nodeRow || $[17] !== childrenBlock) {
    column = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [nodeRow, childrenBlock],
    });
    $[16] = nodeRow;
    $[17] = childrenBlock;
    $[18] = column;
  } else column = $[18];
  return column;
}
//@ chunk-xq6cmpjt.js:2386-2509 placement
function TreeGroup(props) {
  let $ = useMemoCache(3);
  let { children } = props;
  let isLast = useContext(IS_LAST_ITEM_CONTEXT);
  let items;
  if ($[0] !== children || $[1] !== isLast) {
    items = wrapWithLastChildFlag(children, isLast);
    $[0] = children;
    $[1] = isLast;
    $[2] = items;
  } else items = $[2];
  return items;
}
//@ chunk-xq6cmpjt.js:2509-2550 placement
var TreeConnectors; // deferred: uses Tree of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xq6cmpjt.js:2509", () => {
  TreeConnectors = Object.assign(Tree, {
    Node: TreeNode,
    Group: TreeGroup,
  });
});
export { TreeConnectors, TreeConnectorsRow };
