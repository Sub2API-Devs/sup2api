/**
 * components/ui/TreeSelect.tsx
 *
 * 树形选择组件（左右键展开/折叠）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ui/TreeSelect.tsx
 * pieces: chunk-b79vwm1h.js (4)
 * attribution: placement 1, file-last-pair 1, fingerprint 2
 */
import { init_react_production, useState, useRef } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-b79vwm1h.js:4216-4220 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-b79vwm1h.js:4216", () => {
  init_react_production();
});
//@ chunk-b79vwm1h.js:4220-4266 file-last-pair
function treeExpandGlyph(isExpanded) {
  return isExpanded ? "\u25BC " : "\u25B6 ";
}
//@ chunk-b79vwm1h.js:4266-4299 fingerprint = _temp2 (1)
function treeChildGlyph(_depth) {
  return "  \u25B8 ";
}
//@ chunk-b79vwm1h.js:4299-7428 fingerprint = TreeSelect (0.902)
function TreeSelect(props) {
  let $ = useMemoCache(49);
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
    getParentPrefix,
    getChildPrefix,
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
  let defaultGetParentPrefix = treeExpandGlyph;
  let defaultGetChildPrefix = treeChildGlyph;
  let parentPrefixFn = getParentPrefix ?? defaultGetParentPrefix;
  let childPrefixFn = getChildPrefix ?? defaultGetChildPrefix;
  let t6;
  if ($[7] !== childPrefixFn || $[8] !== parentPrefixFn) {
    t6 = (flatNode) => {
      let prefix = "";
      if (flatNode.hasChildren) prefix = parentPrefixFn(flatNode.isExpanded);
      else if (flatNode.depth > 0) prefix = childPrefixFn(flatNode.depth);
      return prefix + flatNode.node.label;
    };
    $[7] = childPrefixFn;
    $[8] = parentPrefixFn;
    $[9] = t6;
  } else t6 = $[9];
  let buildLabel = t6;
  let t7;
  if ($[10] !== buildLabel || $[11] !== flattenedNodes) {
    t7 = flattenedNodes.map((flatNode) => ({
      label: buildLabel(flatNode),
      description: flatNode.node.description,
      dimDescription: flatNode.node.dimDescription ?? true,
      value: flatNode.node.id,
    }));
    $[10] = buildLabel;
    $[11] = flattenedNodes;
    $[12] = t7;
  } else t7 = $[12];
  let options = t7;
  let map;
  if ($[13] !== flattenedNodes) {
    let nodeById = new Map();
    map = (flattenedNodes.forEach((fn) => nodeById.set(fn.node.id, fn.node)), nodeById);
    $[13] = flattenedNodes;
    $[14] = map;
  } else map = $[14];
  let nodeMap = map;
  let t8;
  if ($[15] !== flattenedNodes) {
    t8 = (nodeId) => flattenedNodes.find((fn_0) => fn_0.node.id === nodeId);
    $[15] = flattenedNodes;
    $[16] = t8;
  } else t8 = $[16];
  let findFlattenedNode = t8;
  let t9;
  if ($[17] !== findFlattenedNode || $[18] !== onCollapse || $[19] !== onExpand) {
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
    $[17] = findFlattenedNode;
    $[18] = onCollapse;
    $[19] = onExpand;
    $[20] = t9;
  } else t9 = $[20];
  let toggleExpand = t9;
  let t10;
  if (
    $[21] !== findFlattenedNode ||
    $[22] !== focusNodeId ||
    $[23] !== isDisabled_ ||
    $[24] !== nodeMap ||
    $[25] !== onFocus ||
    $[26] !== toggleExpand
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
    $[21] = findFlattenedNode;
    $[22] = focusNodeId;
    $[23] = isDisabled_;
    $[24] = nodeMap;
    $[25] = onFocus;
    $[26] = toggleExpand;
    $[27] = t10;
  } else t10 = $[27];
  let handleKeyDown = t10;
  let t11;
  if ($[28] !== nodeMap || $[29] !== onSelect) {
    t11 = (nodeId) => {
      let node = nodeMap.get(nodeId);
      if (!node) {
        return;
      }
      onSelect(node);
    };
    $[28] = nodeMap;
    $[29] = onSelect;
    $[30] = t11;
  } else t11 = $[30];
  let handleChange = t11;
  let t12;
  if ($[31] !== nodeMap || $[32] !== onFocus) {
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
    $[31] = nodeMap;
    $[32] = onFocus;
    $[33] = t12;
  } else t12 = $[33];
  let handleFocus = t12;
  let children;
  if (
    $[34] !== focusNodeId ||
    $[35] !== handleChange ||
    $[36] !== handleFocus ||
    $[37] !== hideIndexes_2 ||
    $[38] !== hidePromptWhileDisabled ||
    $[39] !== isDisabled_ ||
    $[40] !== layout_2 ||
    $[41] !== onCancel ||
    $[42] !== onUpFromFirstItem ||
    $[43] !== options ||
    $[44] !== visibleOptionCount
  ) {
    children = jsxProd_default(ModelSelector, {
      options,
      onChange: handleChange,
      onFocus: handleFocus,
      onCancel,
      defaultFocusValue: focusNodeId,
      visibleOptionCount,
      layout: layout_2,
      isDisabled: isDisabled_,
      hidePromptWhileDisabled,
      hideIndexes: hideIndexes_2,
      onUpFromFirstItem,
    });
    $[34] = focusNodeId;
    $[35] = handleChange;
    $[36] = handleFocus;
    $[37] = hideIndexes_2;
    $[38] = hidePromptWhileDisabled;
    $[39] = isDisabled_;
    $[40] = layout_2;
    $[41] = onCancel;
    $[42] = onUpFromFirstItem;
    $[43] = options;
    $[44] = visibleOptionCount;
    $[45] = children;
  } else children = $[45];
  let t14;
  if ($[46] !== handleKeyDown || $[47] !== children) {
    t14 = jsxProd_default(Box, {
      tabIndex: 0,
      autoFocus: true,
      onKeyDown: handleKeyDown,
      children,
    });
    $[46] = handleKeyDown;
    $[47] = children;
    $[48] = t14;
  } else t14 = $[48];
  return t14;
}
export { TreeSelect };
