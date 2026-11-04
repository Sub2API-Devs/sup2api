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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { getHookStatusText, hookSourceHeaderDisplayString } from "../../utils/hooks/hooksSettings.js";
import { escapeControlCharsForDisplay } from "../../utils/stringUtils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { HintText } from "../design-system/HintText.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-bajxb7bf.js:41839-42023 sole-consumer (2.1.88 match: _temp2, 0.774)
function renderHookItem(hook, index) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: getHookStatusText(hook.config),
      meta: [hook.config.type],
      description:
        hook.source === "pluginHook" && hook.pluginName
          ? `${hookSourceHeaderDisplayString(hook.source)} (${escapeControlCharsForDisplay(hook.pluginName)})`
          : hookSourceHeaderDisplayString(hook.source),
    },
    index,
  );
}
//@ chunk-bajxb7bf.js:42023-43222 fingerprint (2.1.88 match: SelectHookMode, 0.67)
function SelectHookMode(props) {
  let $ = useMemoCache(23);
  let { selectedEvent, selectedMatcher, hooksForSelectedMatcher, hookEventMetadata, onSelect, onCancel } =
    props;
  let title;
  if ($[0] !== hookEventMetadata.matcherMetadata || $[1] !== selectedEvent || $[2] !== selectedMatcher) {
    title =
      hookEventMetadata.matcherMetadata !== undefined
        ? `${selectedEvent} - Matcher: ${selectedMatcher ? escapeControlCharsForDisplay(selectedMatcher) : "(all)"}`
        : selectedEvent;
    $[0] = hookEventMetadata.matcherMetadata;
    $[1] = selectedEvent;
    $[2] = selectedMatcher;
    $[3] = title;
  } else title = $[3];
  let title_2 = title;
  if (hooksForSelectedMatcher.length === 0) {
    let inputGuide;
    let children;
    if ($[4] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "go back",
      });
      children = jsxProd_default(HintText, {
        hint: "To add hooks, edit settings.json directly or ask Claude",
        children: "No hooks configured for this event",
      });
      $[4] = inputGuide;
      $[5] = children;
    } else {
      inputGuide = $[4];
      children = $[5];
    }
    let t2;
    if ($[6] !== hookEventMetadata.description || $[7] !== onCancel || $[8] !== title_2) {
      t2 = jsxProd_default(Dialog, {
        title: title_2,
        subtitle: hookEventMetadata.description,
        onCancel,
        inputGuide,
        children,
      });
      $[6] = hookEventMetadata.description;
      $[7] = onCancel;
      $[8] = title_2;
      $[9] = t2;
    } else t2 = $[9];
    return t2;
  }
  const subtitle = hookEventMetadata.description;
  let onSelect_2;
  if ($[10] !== hooksForSelectedMatcher || $[11] !== onSelect) {
    onSelect_2 = (value) => {
      let hook_0 = hooksForSelectedMatcher[value];
      if (hook_0) onSelect(hook_0);
    };
    $[10] = hooksForSelectedMatcher;
    $[11] = onSelect;
    $[12] = onSelect_2;
  } else onSelect_2 = $[12];
  let children;
  if ($[13] !== hooksForSelectedMatcher) {
    children = hooksForSelectedMatcher.map(renderHookItem);
    $[13] = hooksForSelectedMatcher;
    $[14] = children;
  } else children = $[14];
  let children_2;
  if ($[15] !== onSelect_2 || $[16] !== children) {
    children_2 = jsxProd_default(OrderedListWithItem, {
      onSelect: onSelect_2,
      children,
    });
    $[15] = onSelect_2;
    $[16] = children;
    $[17] = children_2;
  } else children_2 = $[17];
  let t5;
  if (
    $[18] !== hookEventMetadata.description ||
    $[19] !== onCancel ||
    $[20] !== children_2 ||
    $[21] !== title_2
  ) {
    t5 = jsxProd_default(Dialog, {
      title: title_2,
      subtitle,
      onCancel,
      children: children_2,
    });
    $[18] = hookEventMetadata.description;
    $[19] = onCancel;
    $[20] = children_2;
    $[21] = title_2;
    $[22] = t5;
  } else t5 = $[22];
  return t5;
}
//@ chunk-bajxb7bf.js:48480-48528 fingerprint (2.1.88 match: _temp2, 0.844)
function isPluginHook(hook) {
  return hook.source === "pluginHook";
}
//@ chunk-bajxb7bf.js:48528-48563 affinity
function hasAnyPluginHook(hooks) {
  return hooks.some(isPluginHook);
}
export { hasAnyPluginHook, SelectHookMode };
