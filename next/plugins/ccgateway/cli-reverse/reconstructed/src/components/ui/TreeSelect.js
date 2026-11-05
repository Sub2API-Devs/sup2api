/**
 * components/ui/TreeSelect.tsx
 *
 * 树形选择组件（左右键展开/折叠）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ui/TreeSelect.tsx
 * pieces: chunk-y1bp9wp9.js (3)
 * attribution: placement 1, fingerprint 2
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y1bp9wp9.js:4202-4206 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-y1bp9wp9.js:4202", () => {
  init_react_production();
});
//@ chunk-y1bp9wp9.js:4206-4345 fingerprint (2.1.88 match: _temp2, 0.565)
function treeExpandGlyph(flatNode) {
  let prefix = "";
  if (flatNode.hasChildren) prefix = flatNode.isExpanded ? "\u25BC " : "\u25B6 ";
  else if (flatNode.depth > 0) prefix = "  \u25B8 ";
  return prefix + flatNode.node.label;
}
//@ chunk-y1bp9wp9.js:4345-7193 fingerprint (2.1.88 match: TreeSelect, 0.894)
function TreeSelect(props) {
  let $ = useMemoCache(45);
  let {
    nodes,
    onSelect,
    onCancel,
    onFocus,
    focusNodeId,
    visibleOptionCount,
    layout,
    isDisabled,
    hidePromptWhileDisabled,
    hideIndexes,
    isNodeExpanded,
    onExpand,
    onCollapse,
    onUpFromFirstItem,
  } = props;
  let layout_2 = layout === undefined ? "expanded" : layout;
  let isDisabled_ = isDisabled === undefined ? false : isDisabled;
  let hideIndexes_2 = hideIndexes === undefined ? false : hideIndexes;
  let t4;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t4 = new Set();
    $[0] = t4;
  } else t4 = $[0];
  let [internalExpandedIds, setInternalExpandedIds] = useState(t4);
  let isProgrammaticFocusRef = useRef(false);
  let lastFocusedIdRef = useRef(null);
  let t5;
  if ($[1] !== internalExpandedIds || $[2] !== isNodeExpanded) {
    t5 = (nodeId) => {
      if (isNodeExpanded) {
        return isNodeExpanded(nodeId);
      }
      return internalExpandedIds.has(nodeId);
    };
    $[1] = internalExpandedIds;
    $[2] = isNodeExpanded;
    $[3] = t5;
  } else t5 = $[3];
  let isExpanded = t5;
  let result;
  if ($[4] !== isExpanded || $[5] !== nodes) {
    result = [];
    function traverse(node, depth, parentId) {
      let hasChildren = !!node.children && node.children.length > 0;
      let nodeIsExpanded = isExpanded(node.id);
      result.push({
        node,
        depth,
        isExpanded: nodeIsExpanded,
        hasChildren,
        parentId,
      });
      if (hasChildren && nodeIsExpanded && node.children) {
        for (const child of node.children) traverse(child, depth + 1, node.id);
      }
    }
    for (const node of nodes) traverse(node, 0);
    $[4] = isExpanded;
    $[5] = nodes;
    $[6] = result;
  } else result = $[6];
  let flattenedNodes = result;
  let glyphOf = treeExpandGlyph;
  let t7;
  if ($[7] !== flattenedNodes) {
    t7 = flattenedNodes.map((flatNode) => ({
      label: glyphOf(flatNode),
      description: flatNode.node.description,
      dimDescription: flatNode.node.dimDescription ?? true,
      value: flatNode.node.id,
    }));
    $[7] = flattenedNodes;
    $[8] = t7;
  } else t7 = $[8];
  let options = t7;
  let map;
  if ($[9] !== flattenedNodes) {
    let nodeById = new Map();
    map = (flattenedNodes.forEach((fn) => nodeById.set(fn.node.id, fn.node)), nodeById);
    $[9] = flattenedNodes;
    $[10] = map;
  } else map = $[10];
  let nodeMap = map;
  let t8;
  if ($[11] !== flattenedNodes) {
    t8 = (nodeId) => flattenedNodes.find((fn_0) => fn_0.node.id === nodeId);
    $[11] = flattenedNodes;
    $[12] = t8;
  } else t8 = $[12];
  let findFlattenedNode = t8;
  let t9;
  if ($[13] !== findFlattenedNode || $[14] !== onCollapse || $[15] !== onExpand) {
    t9 = (nodeId, shouldExpand) => {
      let flatNode = findFlattenedNode(nodeId);
      if (!flatNode || !flatNode.hasChildren) {
        return;
      }
      if (shouldExpand) {
        if (onExpand) onExpand(nodeId);
        else setInternalExpandedIds((prev) => new Set(prev).add(nodeId));
      } else if (onCollapse) onCollapse(nodeId);
      else
        setInternalExpandedIds((prev) => {
          let newSet = new Set(prev);
          newSet.delete(nodeId);
          return newSet;
        });
    };
    $[13] = findFlattenedNode;
    $[14] = onCollapse;
    $[15] = onExpand;
    $[16] = t9;
  } else t9 = $[16];
  let toggleExpand = t9;
  let t10;
  if (
    $[17] !== findFlattenedNode ||
    $[18] !== focusNodeId ||
    $[19] !== isDisabled_ ||
    $[20] !== nodeMap ||
    $[21] !== onFocus ||
    $[22] !== toggleExpand
  ) {
    t10 = (e) => {
      if (!focusNodeId || isDisabled_) {
        return;
      }
      let flatNode = findFlattenedNode(focusNodeId);
      if (!flatNode) {
        return;
      }
      if (e.key === "right" && flatNode.hasChildren) {
        e.preventDefault();
        toggleExpand(focusNodeId, true);
      } else if (e.key === "left") {
        if (flatNode.hasChildren && flatNode.isExpanded) {
          e.preventDefault();
          toggleExpand(focusNodeId, false);
        } else if (flatNode.parentId !== undefined) {
          e.preventDefault();
          isProgrammaticFocusRef.current = true;
          toggleExpand(flatNode.parentId, false);
          if (onFocus) {
            let parentNode = nodeMap.get(flatNode.parentId);
            if (parentNode) onFocus(parentNode);
          }
        }
      }
    };
    $[17] = findFlattenedNode;
    $[18] = focusNodeId;
    $[19] = isDisabled_;
    $[20] = nodeMap;
    $[21] = onFocus;
    $[22] = toggleExpand;
    $[23] = t10;
  } else t10 = $[23];
  let handleKeyDown = t10;
  let t11;
  if ($[24] !== nodeMap || $[25] !== onSelect) {
    t11 = (nodeId) => {
      let node = nodeMap.get(nodeId);
      if (!node) {
        return;
      }
      onSelect(node);
    };
    $[24] = nodeMap;
    $[25] = onSelect;
    $[26] = t11;
  } else t11 = $[26];
  let onChange = t11;
  let t12;
  if ($[27] !== nodeMap || $[28] !== onFocus) {
    t12 = (nodeId) => {
      if (isProgrammaticFocusRef.current) {
        isProgrammaticFocusRef.current = false;
        return;
      }
      if (lastFocusedIdRef.current === nodeId) {
        return;
      }
      lastFocusedIdRef.current = nodeId;
      if (onFocus) {
        let node = nodeMap.get(nodeId);
        if (node) onFocus(node);
      }
    };
    $[27] = nodeMap;
    $[28] = onFocus;
    $[29] = t12;
  } else t12 = $[29];
  let onFocus_2 = t12;
  let children;
  if (
    $[30] !== focusNodeId ||
    $[31] !== onChange ||
    $[32] !== onFocus_2 ||
    $[33] !== hideIndexes_2 ||
    $[34] !== hidePromptWhileDisabled ||
    $[35] !== isDisabled_ ||
    $[36] !== layout_2 ||
    $[37] !== onCancel ||
    $[38] !== onUpFromFirstItem ||
    $[39] !== options ||
    $[40] !== visibleOptionCount
  ) {
    children = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onFocus: onFocus_2,
      onCancel,
      defaultFocusValue: focusNodeId,
      visibleOptionCount,
      layout: layout_2,
      isDisabled: isDisabled_,
      hidePromptWhileDisabled,
      hideIndexes: hideIndexes_2,
      onUpFromFirstItem,
    });
    $[30] = focusNodeId;
    $[31] = onChange;
    $[32] = onFocus_2;
    $[33] = hideIndexes_2;
    $[34] = hidePromptWhileDisabled;
    $[35] = isDisabled_;
    $[36] = layout_2;
    $[37] = onCancel;
    $[38] = onUpFromFirstItem;
    $[39] = options;
    $[40] = visibleOptionCount;
    $[41] = children;
  } else children = $[41];
  let t14;
  if ($[42] !== handleKeyDown || $[43] !== children) {
    t14 = jsxProd_default(Box, {
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: handleKeyDown,
      children,
    });
    $[42] = handleKeyDown;
    $[43] = children;
    $[44] = t14;
  } else t14 = $[44];
  return t14;
}
export { TreeSelect };
