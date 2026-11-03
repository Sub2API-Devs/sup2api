/**
 * components/hooks/SelectEventMode.tsx
 *
 * /hooks 第一级：选择 hook 事件（显示各事件 hook 数）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/SelectEventMode.tsx
 * pieces: chunk-bajxb7bf.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { count } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useEnterEscape } from "./cloudHooks.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-bajxb7bf.js:40776-41839 fingerprint = SelectEventMode (0.324)
function SelectEventMode(props) {
  let $ = w(22);
  let { hookEventMetadata, hooksByEvent, onSelectEvent, onCancel } = props;
  let t;
  let f;
  if ($[0] !== hookEventMetadata || $[1] !== hooksByEvent) {
    t = Object.entries(hookEventMetadata);
    let k;
    if ($[4] !== hooksByEvent) {
      k = (C) => {
        let [D] = C;
        return (hooksByEvent[D] ?? 0) > 0;
      };
      $[4] = hooksByEvent;
      $[5] = k;
    } else k = $[5];
    f = count(t, k);
    $[0] = hookEventMetadata;
    $[1] = hooksByEvent;
    $[2] = t;
    $[3] = f;
  } else {
    t = $[2];
    f = $[3];
  }
  let M = f;
  const k = t.length;
  let C;
  if ($[6] !== t.length) {
    C = plural(t.length, "event");
    $[6] = t.length;
    $[7] = C;
  } else C = $[7];
  const subtitle = `${k} ${C} \xB7 ${M} with hooks`;
  let inputGuide;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(useEnterEscape, {
      enter: "open",
      escape: "go back",
    });
    $[8] = inputGuide;
  } else inputGuide = $[8];
  let onSelect;
  if ($[9] !== t || $[10] !== onSelectEvent) {
    onSelect = (value) => {
      let b = t[value];
      if (b) onSelectEvent(b[0]);
    };
    $[9] = t;
    $[10] = onSelectEvent;
    $[11] = onSelect;
  } else onSelect = $[11];
  let children;
  if ($[12] !== t || $[13] !== hooksByEvent) {
    children = t.map((t7) => {
      let [N, metadata] = t7;
      let count = hooksByEvent[N] || 0;
      return jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: N,
          meta: count > 0 ? [`${count} ${plural(count, "hook")}`] : [],
          description: metadata.summary,
        },
        N,
      );
    });
    $[12] = t;
    $[13] = hooksByEvent;
    $[14] = children;
  } else children = $[14];
  let children_2;
  if ($[15] !== onSelect || $[16] !== children) {
    children_2 = jsxProd_default(OrderedListWithItem, {
      onSelect,
      children,
    });
    $[15] = onSelect;
    $[16] = children;
    $[17] = children_2;
  } else children_2 = $[17];
  let Y;
  if ($[18] !== onCancel || $[19] !== subtitle || $[20] !== children_2) {
    Y = jsxProd_default(Dialog, {
      title: "Hook events",
      subtitle,
      onCancel,
      inputGuide,
      children: children_2,
    });
    $[18] = onCancel;
    $[19] = subtitle;
    $[20] = children_2;
    $[21] = Y;
  } else Y = $[21];
  return Y;
}
export { SelectEventMode };
