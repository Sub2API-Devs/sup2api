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
import { j, y, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-b79vwm1h.js:4216-4220 placement
j();
//@ chunk-b79vwm1h.js:4220-4266 file-last-pair
function Eo(isExpanded_0) {
  return isExpanded_0 ? "\u25BC " : "\u25B6 ";
}
//@ chunk-b79vwm1h.js:4266-4299 fingerprint = _temp2 (1)
function To(_depth) {
  return "  \u25B8 ";
}
//@ chunk-b79vwm1h.js:4299-7428 fingerprint = TreeSelect (0.902)
function TreeSelect(t0) {
  let $ = w(49),
    {
      nodes: nodes,
      onSelect: onSelect,
      onCancel: onCancel,
      onFocus: onFocus,
      focusNodeId: focusNodeId,
      visibleOptionCount: visibleOptionCount,
      layout: t1,
      isDisabled: t2,
      hidePromptWhileDisabled: hidePromptWhileDisabled,
      hideIndexes: t3,
      isNodeExpanded: isNodeExpanded,
      onExpand: onExpand,
      onCollapse: onCollapse,
      getParentPrefix: getParentPrefix,
      getChildPrefix: getChildPrefix,
      onUpFromFirstItem: onUpFromFirstItem,
    } = t0,
    Ce = t1 === void 0 ? "expanded" : t1,
    ee = t2 === void 0 ? !1 : t2,
    M = t3 === void 0 ? !1 : t3,
    qe;
  if ($[0] === MEMO_CACHE_SENTINEL) ((qe = new Set()), ($[0] = qe));
  else qe = $[0];
  let [te, G] = y(qe),
    Y = R(!1),
    Te = R(null),
    ne;
  if ($[1] !== te || $[2] !== isNodeExpanded)
    ((ne = (nodeId) => {
      if (isNodeExpanded) {
        return isNodeExpanded(nodeId);
      }
      return te.has(nodeId);
    }),
      ($[1] = te),
      ($[2] = isNodeExpanded),
      ($[3] = ne));
  else ne = $[3];
  let re = ne,
    A;
  if ($[4] !== re || $[5] !== nodes) {
    A = [];
    function traverse(node, depth, parentId) {
      let de = !!node.children && node.children.length > 0;
      let nodeIsExpanded = re(node.id);
      if (
        (A.push({
          node: node,
          depth: depth,
          isExpanded: nodeIsExpanded,
          hasChildren: de,
          parentId: parentId,
        }),
        de && nodeIsExpanded && node.children)
      ) {
        for (const child of node.children) traverse(child, depth + 1, node.id);
      }
    }
    for (const node_0 of nodes) traverse(node_0, 0);
    (($[4] = re), ($[5] = nodes), ($[6] = A));
  } else A = $[6];
  let V = A,
    Xe = Eo,
    Rt = To,
    ke = getParentPrefix ?? Xe,
    Ye = getChildPrefix ?? Rt,
    Ze;
  if ($[7] !== Ye || $[8] !== ke)
    ((Ze = (flatNode) => {
      let prefix = "";
      if (flatNode.hasChildren) prefix = ke(flatNode.isExpanded);
      else if (flatNode.depth > 0) prefix = Ye(flatNode.depth);
      return prefix + flatNode.node.label;
    }),
      ($[7] = Ye),
      ($[8] = ke),
      ($[9] = Ze));
  else Ze = $[9];
  let H = Ze,
    Oe;
  if ($[10] !== H || $[11] !== V)
    ((Oe = V.map((flatNode_0) => ({
      label: H(flatNode_0),
      description: flatNode_0.node.description,
      dimDescription: flatNode_0.node.dimDescription ?? !0,
      value: flatNode_0.node.id,
    }))),
      ($[10] = H),
      ($[11] = V),
      ($[12] = Oe));
  else Oe = $[12];
  let tt = Oe,
    mt;
  if ($[13] !== V) {
    let nt = new Map();
    mt = (V.forEach((fn) => nt.set(fn.node.id, fn.node)), nt);
    (($[13] = V), ($[14] = mt));
  } else mt = $[14];
  let U = mt,
    ht;
  if ($[15] !== V)
    ((ht = (nodeId_0) => V.find((fn_0) => fn_0.node.id === nodeId_0)), ($[15] = V), ($[16] = ht));
  else ht = $[16];
  let x = ht,
    D;
  if ($[17] !== x || $[18] !== onCollapse || $[19] !== onExpand)
    ((D = (nodeId_1, shouldExpand) => {
      let flatNode_1 = x(nodeId_1);
      if (!flatNode_1 || !flatNode_1.hasChildren) {
        return;
      }
      if (shouldExpand) {
        if (onExpand) onExpand(nodeId_1);
        else G((prev) => new Set(prev).add(nodeId_1));
      } else if (onCollapse) onCollapse(nodeId_1);
      else
        G((prev_0) => {
          let newSet = new Set(prev_0);
          return (newSet.delete(nodeId_1), newSet);
        });
    }),
      ($[17] = x),
      ($[18] = onCollapse),
      ($[19] = onExpand),
      ($[20] = D));
  else D = $[20];
  let Ie = D,
    De;
  if (
    $[21] !== x ||
    $[22] !== focusNodeId ||
    $[23] !== ee ||
    $[24] !== U ||
    $[25] !== onFocus ||
    $[26] !== Ie
  )
    ((De = (z) => {
      if (!focusNodeId || ee) {
        return;
      }
      let flatNode_2 = x(focusNodeId);
      if (!flatNode_2) {
        return;
      }
      if (z.key === "right" && flatNode_2.hasChildren) (z.preventDefault(), Ie(focusNodeId, !0));
      else if (z.key === "left") {
        if (flatNode_2.hasChildren && flatNode_2.isExpanded) (z.preventDefault(), Ie(focusNodeId, !1));
        else if (flatNode_2.parentId !== void 0) {
          if ((z.preventDefault(), (Y.current = !0), Ie(flatNode_2.parentId, !1), onFocus)) {
            let parentNode = U.get(flatNode_2.parentId);
            if (parentNode) onFocus(parentNode);
          }
        }
      }
    }),
      ($[21] = x),
      ($[22] = focusNodeId),
      ($[23] = ee),
      ($[24] = U),
      ($[25] = onFocus),
      ($[26] = Ie),
      ($[27] = De));
  else De = $[27];
  let se = De,
    Be;
  if ($[28] !== U || $[29] !== onSelect)
    ((Be = (nodeId_2) => {
      let node_1 = U.get(nodeId_2);
      if (!node_1) {
        return;
      }
      onSelect(node_1);
    }),
      ($[28] = U),
      ($[29] = onSelect),
      ($[30] = Be));
  else Be = $[30];
  let We = Be,
    pe;
  if ($[31] !== U || $[32] !== onFocus)
    ((pe = (nodeId_3) => {
      if (Y.current) {
        Y.current = !1;
        return;
      }
      if (Te.current === nodeId_3) {
        return;
      }
      if (((Te.current = nodeId_3), onFocus)) {
        let node_2 = U.get(nodeId_3);
        if (node_2) onFocus(node_2);
      }
    }),
      ($[31] = U),
      ($[32] = onFocus),
      ($[33] = pe));
  else pe = $[33];
  let Ne = pe,
    me;
  if (
    $[34] !== focusNodeId ||
    $[35] !== We ||
    $[36] !== Ne ||
    $[37] !== M ||
    $[38] !== hidePromptWhileDisabled ||
    $[39] !== ee ||
    $[40] !== Ce ||
    $[41] !== onCancel ||
    $[42] !== onUpFromFirstItem ||
    $[43] !== tt ||
    $[44] !== visibleOptionCount
  )
    ((me = e(ModelSelector, {
      options: tt,
      onChange: We,
      onFocus: Ne,
      onCancel: onCancel,
      defaultFocusValue: focusNodeId,
      visibleOptionCount: visibleOptionCount,
      layout: Ce,
      isDisabled: ee,
      hidePromptWhileDisabled: hidePromptWhileDisabled,
      hideIndexes: M,
      onUpFromFirstItem: onUpFromFirstItem,
    })),
      ($[34] = focusNodeId),
      ($[35] = We),
      ($[36] = Ne),
      ($[37] = M),
      ($[38] = hidePromptWhileDisabled),
      ($[39] = ee),
      ($[40] = Ce),
      ($[41] = onCancel),
      ($[42] = onUpFromFirstItem),
      ($[43] = tt),
      ($[44] = visibleOptionCount),
      ($[45] = me));
  else me = $[45];
  let Pe;
  if ($[46] !== se || $[47] !== me)
    ((Pe = e(Box, { tabIndex: 0, autoFocus: !0, onKeyDown: se, children: me })),
      ($[46] = se),
      ($[47] = me),
      ($[48] = Pe));
  else Pe = $[48];
  return Pe;
}

export { TreeSelect };
