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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { count } from "../../utils/collections.js";
import { plural } from "../../utils/stringUtils.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { useEnterEscape } from "./cloudHooks.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-bajxb7bf.js:40776-41839 fingerprint (2.1.88 match: SelectEventMode, 0.324)
function SelectEventMode(props) {
  let $ = useMemoCache(22);
  let { hookEventMetadata, hooksByEvent, onSelectEvent, onCancel } = props;
  let entries;
  let withHooks;
  if ($[0] !== hookEventMetadata || $[1] !== hooksByEvent) {
    entries = Object.entries(hookEventMetadata);
    let hasHooks;
    if ($[4] !== hooksByEvent) {
      hasHooks = (entry) => {
        let [event] = entry;
        return (hooksByEvent[event] ?? 0) > 0;
      };
      $[4] = hooksByEvent;
      $[5] = hasHooks;
    } else hasHooks = $[5];
    withHooks = count(entries, hasHooks);
    $[0] = hookEventMetadata;
    $[1] = hooksByEvent;
    $[2] = entries;
    $[3] = withHooks;
  } else {
    entries = $[2];
    withHooks = $[3];
  }
  let withHooks_2 = withHooks;
  const eventCount = entries.length;
  let eventPlural;
  if ($[6] !== entries.length) {
    eventPlural = plural(entries.length, "event");
    $[6] = entries.length;
    $[7] = eventPlural;
  } else eventPlural = $[7];
  const subtitle = `${eventCount} ${eventPlural} \xB7 ${withHooks_2} with hooks`;
  let inputGuide;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default(useEnterEscape, {
      enter: "open",
      escape: "go back",
    });
    $[8] = inputGuide;
  } else inputGuide = $[8];
  let onSelect;
  if ($[9] !== entries || $[10] !== onSelectEvent) {
    onSelect = (value) => {
      let entry = entries[value];
      if (entry) onSelectEvent(entry[0]);
    };
    $[9] = entries;
    $[10] = onSelectEvent;
    $[11] = onSelect;
  } else onSelect = $[11];
  let children;
  if ($[12] !== entries || $[13] !== hooksByEvent) {
    children = entries.map((t7) => {
      let [event, metadata] = t7;
      let count = hooksByEvent[event] || 0;
      return jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: event,
          meta: count > 0 ? [`${count} ${plural(count, "hook")}`] : [],
          description: metadata.summary,
        },
        event,
      );
    });
    $[12] = entries;
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
  let dialog;
  if ($[18] !== onCancel || $[19] !== subtitle || $[20] !== children_2) {
    dialog = jsxProd_default(Dialog, {
      title: "Hook events",
      subtitle,
      onCancel,
      inputGuide,
      children: children_2,
    });
    $[18] = onCancel;
    $[19] = subtitle;
    $[20] = children_2;
    $[21] = dialog;
  } else dialog = $[21];
  return dialog;
}
export { SelectEventMode };
