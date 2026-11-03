/**
 * components/hooks/SelectHookMode.tsx
 *
 * /hooks 第三级：某匹配器下的 hook 列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/SelectHookMode.tsx
 * pieces: chunk-bajxb7bf.js (4)
 * attribution: sole-consumer 1, fingerprint 2, affinity 1
 */
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { getHookStatusText, hookSourceHeaderDisplayString } from "../../utils/hooks/hooksSettings.js";
import { Mu } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { HintText } from "../design-system/HintText.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-bajxb7bf.js:41839-42023 sole-consumer = _temp2 (0.774)
function renderHookItem(hook, index) {
  return e(
    OrderedListWithItem.Item,
    {
      label: getHookStatusText(hook.config),
      meta: [hook.config.type],
      description:
        hook.source === "pluginHook" && hook.pluginName
          ? `${hookSourceHeaderDisplayString(hook.source)} (${Mu(hook.pluginName)})`
          : hookSourceHeaderDisplayString(hook.source),
    },
    index,
  );
}
//@ chunk-bajxb7bf.js:42023-43222 fingerprint = SelectHookMode (0.67)
function SelectHookMode(t0) {
  let $ = w(23),
    {
      selectedEvent: selectedEvent,
      selectedMatcher: selectedMatcher,
      hooksForSelectedMatcher: hooksForSelectedMatcher,
      hookEventMetadata: hookEventMetadata,
      onSelect: onSelect,
      onCancel: onCancel,
    } = t0,
    k;
  if ($[0] !== hookEventMetadata.matcherMetadata || $[1] !== selectedEvent || $[2] !== selectedMatcher)
    ((k =
      hookEventMetadata.matcherMetadata !== void 0
        ? `${selectedEvent} - Matcher: ${selectedMatcher ? Mu(selectedMatcher) : "(all)"}`
        : selectedEvent),
      ($[0] = hookEventMetadata.matcherMetadata),
      ($[1] = selectedEvent),
      ($[2] = selectedMatcher),
      ($[3] = k));
  else k = $[3];
  let C = k;
  if (hooksForSelectedMatcher.length === 0) {
    let D, M;
    if ($[4] === MEMO_CACHE_SENTINEL)
      ((D = e(KeyboardShortcutHint, { chord: "escape", action: "go back" })),
        (M = e(HintText, {
          hint: "To add hooks, edit settings.json directly or ask Claude",
          children: "No hooks configured for this event",
        })),
        ($[4] = D),
        ($[5] = M));
    else ((D = $[4]), (M = $[5]));
    let g;
    if ($[6] !== hookEventMetadata.description || $[7] !== onCancel || $[8] !== C)
      ((g = e(Dialog, {
        title: C,
        subtitle: hookEventMetadata.description,
        onCancel: onCancel,
        inputGuide: D,
        children: M,
      })),
        ($[6] = hookEventMetadata.description),
        ($[7] = onCancel),
        ($[8] = C),
        ($[9] = g));
    else g = $[9];
    return g;
  }
  const t1 = hookEventMetadata.description;
  let M;
  if ($[10] !== hooksForSelectedMatcher || $[11] !== onSelect)
    ((M = (value) => {
      let hook_0 = hooksForSelectedMatcher[value];
      if (hook_0) onSelect(hook_0);
    }),
      ($[10] = hooksForSelectedMatcher),
      ($[11] = onSelect),
      ($[12] = M));
  else M = $[12];
  let g;
  if ($[13] !== hooksForSelectedMatcher)
    ((g = hooksForSelectedMatcher.map(renderHookItem)), ($[13] = hooksForSelectedMatcher), ($[14] = g));
  else g = $[14];
  let _;
  if ($[15] !== M || $[16] !== g)
    ((_ = e(OrderedListWithItem, { onSelect: M, children: g })), ($[15] = M), ($[16] = g), ($[17] = _));
  else _ = $[17];
  let b;
  if ($[18] !== hookEventMetadata.description || $[19] !== onCancel || $[20] !== _ || $[21] !== C)
    ((b = e(Dialog, { title: C, subtitle: t1, onCancel: onCancel, children: _ })),
      ($[18] = hookEventMetadata.description),
      ($[19] = onCancel),
      ($[20] = _),
      ($[21] = C),
      ($[22] = b));
  else b = $[22];
  return b;
}
//@ chunk-bajxb7bf.js:48480-48528 fingerprint = _temp2 (0.844)
function bi(Ai) {
  return Ai.source === "pluginHook";
}
//@ chunk-bajxb7bf.js:48528-48563 affinity
function Ei(Li) {
  return Li.some(bi);
}

export { Ei, SelectHookMode };
