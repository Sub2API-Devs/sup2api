/**
 * components/hooks/SelectMatcherMode.tsx
 *
 * /hooks 第二级：某事件下的匹配器列表。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/SelectMatcherMode.tsx
 * pieces: chunk-bajxb7bf.js (4)
 * attribution: placement 1, file-local 1, fingerprint 2
 */
import { j } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Text } from "../../ink/components/Text.js";
import { hookSourceInlineDisplayString } from "../../utils/hooks/hooksSettings.js";
import { Mu, plural } from "../../utils/stringUtils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { uniq } from "../../utils/collections.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { HintText } from "../design-system/HintText.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-bajxb7bf.js:43222-43226 placement
j();
//@ chunk-bajxb7bf.js:43226-43257 file-local
function Mr(h) {
  return h.source;
}
//@ chunk-bajxb7bf.js:43257-43462 fingerprint = _temp3 (0.838)
function renderMatcherItem(item) {
  return e(
    OrderedListWithItem.Item,
    {
      icon: r(Text, {
        dimColor: !0,
        children: ["[", item.sources.map(hookSourceInlineDisplayString).join(", "), "]"],
      }),
      label: item.matcher ? Mu(item.matcher) : "(all)",
      meta: [`${item.hookCount} ${plural(item.hookCount, "hook")}`],
    },
    item.matcher,
  );
}
//@ chunk-bajxb7bf.js:43462-44720 fingerprint = SelectMatcherMode (0.657)
function SelectMatcherMode(t0) {
  let $ = w(26),
    {
      selectedEvent: selectedEvent,
      matchersForSelectedEvent: matchersForSelectedEvent,
      hooksByEventAndMatcher: hooksByEventAndMatcher,
      eventDescription: eventDescription,
      onSelect: onSelect,
      onCancel: onCancel,
    } = t0,
    k;
  if ($[0] !== hooksByEventAndMatcher || $[1] !== matchersForSelectedEvent || $[2] !== selectedEvent) {
    let C;
    if ($[4] !== hooksByEventAndMatcher || $[5] !== selectedEvent)
      ((C = (matcher) => {
        let hooks = hooksByEventAndMatcher[selectedEvent]?.[matcher] || [];
        let g = uniq(hooks.map(Mr));
        return { matcher: matcher, sources: g, hookCount: hooks.length };
      }),
        ($[4] = hooksByEventAndMatcher),
        ($[5] = selectedEvent),
        ($[6] = C));
    else C = $[6];
    k = matchersForSelectedEvent.map(C);
    (($[0] = hooksByEventAndMatcher), ($[1] = matchersForSelectedEvent), ($[2] = selectedEvent), ($[3] = k));
  } else k = $[3];
  let matchersWithSources = k;
  if (matchersForSelectedEvent.length === 0) {
    const t2 = `${selectedEvent} - Matchers`;
    let P, _;
    if ($[7] === MEMO_CACHE_SENTINEL)
      ((P = e(KeyboardShortcutHint, { chord: "escape", action: "go back" })),
        (_ = e(HintText, {
          hint: "To add hooks, edit settings.json directly or ask Claude",
          children: "No hooks configured for this event",
        })),
        ($[7] = P),
        ($[8] = _));
    else ((P = $[7]), (_ = $[8]));
    let b;
    if ($[9] !== eventDescription || $[10] !== onCancel || $[11] !== t2)
      ((b = e(Dialog, {
        title: t2,
        subtitle: eventDescription,
        onCancel: onCancel,
        inputGuide: P,
        children: _,
      })),
        ($[9] = eventDescription),
        ($[10] = onCancel),
        ($[11] = t2),
        ($[12] = b));
    else b = $[12];
    return b;
  }
  const t2 = `${selectedEvent} - Matchers`;
  let P;
  if ($[13] !== matchersWithSources || $[14] !== onSelect)
    ((P = (E) => {
      let B = matchersWithSources[E];
      if (B) onSelect(B.matcher);
    }),
      ($[13] = matchersWithSources),
      ($[14] = onSelect),
      ($[15] = P));
  else P = $[15];
  let _;
  if ($[16] !== matchersWithSources)
    ((_ = matchersWithSources.map(renderMatcherItem)), ($[16] = matchersWithSources), ($[17] = _));
  else _ = $[17];
  let b;
  if ($[18] !== P || $[19] !== _)
    ((b = e(OrderedListWithItem, { onSelect: P, children: _ })), ($[18] = P), ($[19] = _), ($[20] = b));
  else b = $[20];
  let N;
  if ($[21] !== eventDescription || $[22] !== onCancel || $[23] !== t2 || $[24] !== b)
    ((N = e(Dialog, { title: t2, subtitle: eventDescription, onCancel: onCancel, children: b })),
      ($[21] = eventDescription),
      ($[22] = onCancel),
      ($[23] = t2),
      ($[24] = b),
      ($[25] = N));
  else N = $[25];
  return N;
}

export { SelectMatcherMode };
