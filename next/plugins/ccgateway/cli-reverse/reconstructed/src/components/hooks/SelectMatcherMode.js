/**
 * components/hooks/SelectMatcherMode.tsx
 *
 * /hooks 第二级：某事件下的匹配器列表。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/hooks/SelectMatcherMode.tsx
 * pieces: chunk-5tpnqyt5.js (4)
 * attribution: placement 1, file-local 1, fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { Text } from "../../ink/components/Text.js";
import { hookSourceInlineDisplayString } from "../../utils/hooks/hooksSettings.js";
import { escapeControlCharsForDisplay, plural } from "../../utils/stringUtils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { normalizeCaseForComparison_2 } from "../../utils/permissions/filesystem.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { HintText } from "../design-system/HintText.js";
import { Dialog } from "../design-system/Dialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5tpnqyt5.js:44718-44722 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5tpnqyt5.js:44718", () => {
  init_react_production();
});
//@ chunk-5tpnqyt5.js:44722-44753 file-local
function hookSource(h) {
  return h.source;
}
//@ chunk-5tpnqyt5.js:44753-44958 fingerprint (2.1.88 match: _temp3, 0.838)
function renderMatcherItem(item) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      icon: jsxProd_default_2(Text, {
        dimColor: true,
        children: ["[", item.sources.map(hookSourceInlineDisplayString).join(", "), "]"],
      }),
      label: item.matcher ? escapeControlCharsForDisplay(item.matcher) : "(all)",
      meta: [`${item.hookCount} ${plural(item.hookCount, "hook")}`],
    },
    item.matcher,
  );
}
//@ chunk-5tpnqyt5.js:44958-46216 fingerprint (2.1.88 match: SelectMatcherMode, 0.657)
function SelectMatcherMode(props) {
  let $ = useMemoCache(26);
  let {
    selectedEvent,
    matchersForSelectedEvent,
    hooksByEventAndMatcher,
    eventDescription,
    onSelect,
    onCancel,
  } = props;
  let t1;
  if ($[0] !== hooksByEventAndMatcher || $[1] !== matchersForSelectedEvent || $[2] !== selectedEvent) {
    let t2;
    if ($[4] !== hooksByEventAndMatcher || $[5] !== selectedEvent) {
      t2 = (matcher) => {
        let hooks = hooksByEventAndMatcher[selectedEvent]?.[matcher] || [];
        let sources = normalizeCaseForComparison_2(hooks.map(hookSource));
        return {
          matcher,
          sources,
          hookCount: hooks.length,
        };
      };
      $[4] = hooksByEventAndMatcher;
      $[5] = selectedEvent;
      $[6] = t2;
    } else t2 = $[6];
    t1 = matchersForSelectedEvent.map(t2);
    $[0] = hooksByEventAndMatcher;
    $[1] = matchersForSelectedEvent;
    $[2] = selectedEvent;
    $[3] = t1;
  } else t1 = $[3];
  let matchersWithSources = t1;
  if (matchersForSelectedEvent.length === 0) {
    const title = `${selectedEvent} - Matchers`;
    let inputGuide;
    let children;
    if ($[7] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "go back",
      });
      children = jsxProd_default(HintText, {
        hint: "To add hooks, edit settings.json directly or ask Claude",
        children: "No hooks configured for this event",
      });
      $[7] = inputGuide;
      $[8] = children;
    } else {
      inputGuide = $[7];
      children = $[8];
    }
    let emptyDialog;
    if ($[9] !== eventDescription || $[10] !== onCancel || $[11] !== title) {
      emptyDialog = jsxProd_default(Dialog, {
        title,
        subtitle: eventDescription,
        onCancel,
        inputGuide,
        children,
      });
      $[9] = eventDescription;
      $[10] = onCancel;
      $[11] = title;
      $[12] = emptyDialog;
    } else emptyDialog = $[12];
    return emptyDialog;
  }
  const title = `${selectedEvent} - Matchers`;
  let onSelect_2;
  if ($[13] !== matchersWithSources || $[14] !== onSelect) {
    onSelect_2 = (index) => {
      let entry = matchersWithSources[index];
      if (entry) onSelect(entry.matcher);
    };
    $[13] = matchersWithSources;
    $[14] = onSelect;
    $[15] = onSelect_2;
  } else onSelect_2 = $[15];
  let children;
  if ($[16] !== matchersWithSources) {
    children = matchersWithSources.map(renderMatcherItem);
    $[16] = matchersWithSources;
    $[17] = children;
  } else children = $[17];
  let children_2;
  if ($[18] !== onSelect_2 || $[19] !== children) {
    children_2 = jsxProd_default(OrderedListWithItem, {
      onSelect: onSelect_2,
      children,
    });
    $[18] = onSelect_2;
    $[19] = children;
    $[20] = children_2;
  } else children_2 = $[20];
  let dialog;
  if ($[21] !== eventDescription || $[22] !== onCancel || $[23] !== title || $[24] !== children_2) {
    dialog = jsxProd_default(Dialog, {
      title,
      subtitle: eventDescription,
      onCancel,
      children: children_2,
    });
    $[21] = eventDescription;
    $[22] = onCancel;
    $[23] = title;
    $[24] = children_2;
    $[25] = dialog;
  } else dialog = $[25];
  return dialog;
}
export { SelectMatcherMode };
