/**
 * components/pluginUi/AbovePromptBand.tsx
 *
 * 2.1.316 新增。插件 UI：输入框上方的横幅带。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (47)
 * attribution: placement 45, layout 2
 */
import { __export, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ABOVE_PROMPT, nearestScrollTop } from "../../plugins/functionHooks/uiHooks.js";
import { renderBurstSlot } from "../../plugins/functionHooks/ui/renderInstances.js";
import {
  focusSlot,
  bumpPaneRender,
  placementSlot,
  askCountFor,
  askSlot,
  paneAskKey,
  withoutKeys,
  paneRegistry,
  focusPane,
  settleFocusRequest,
  nextPaneId,
} from "../../plugins/functionHooks/panes.js";
import { pickOrNull, uiFocusForPlugin, wrapActHandlers } from "../../plugins/functionHooks/uiApi.js";
import { collectSurfaceHandles } from "../../plugins/functionHooks/sessionEvents.js";
import { cachedHighlight } from "../HighlightedCode/Fallback.js";
import { getUniqueTags } from "../LogSelector.js";
import { useClickOutside, HotkeySeat } from "./render/MarkdownBlock.js";
import { useAppState } from "../../state/AppState.js";
import { getViewedTeammateTask } from "../../state/selectors.js";
import {
  useMemo,
  init_react_production,
  useRef,
  useCallback,
  useState,
  useEffect,
  useContext,
  useLayoutEffect,
} from "../../../vendor/react/cjs/react.production.js";
import {
  paneScrollHandlers,
  PaneBody,
  wheelScrollRows,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
} from "./PaneBody.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace, pressFromTerminal, ClickedPress } from "./render/actionKeys.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Button } from "../../ink/components/ErrorBoundary.js";
import { topWithin, measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { identity as identity_4 } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import {
  fieldKey,
  inputFromTerminal,
  selectFromTerminal,
  useRenderDrawing,
  useRenderInput,
  SelectFields,
} from "./render/RenderInstance.js";
import { hasControlCharacter } from "../../plugins/functionHooks/ui/validateTree.js";
import { useKeybindingContext, useRegisterKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { ContextSlotA } from "../../context/contextSlots.js";
import { useMeasured, useDebouncedCallback } from "../../ink/components/Input.js";
import { useShortDraftValue, sessionStore } from "../../screens/repl/storeHooks.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useHasAutoDialog } from "../../state/dialogQueue.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { focusStore, setFocusedClient } from "../../plugins/functionHooks/surfaceClients.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { useDigitHotkeys } from "./digitHotkeys.js";
import { FocusedPress, FocusedNode, InputFields, focusClick } from "./render/elements.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:34353-34363 placement
var AbovePromptBandNamespace = {};
//@ chunk-18hwfzwa.js:34363-35469 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:34363", () => {
  __export(AbovePromptBandNamespace, {
    AbovePromptSite: () => AbovePromptBandView,
    BAND_REQUEST_ID: () => ABOVE_PROMPT,
    COLLAPSE_HANDLE_COLUMNS: () => COLLAPSE_HANDLE_COLUMNS,
    CollapseHandle: () => CollapseHandle,
    CollapsedHint: () => CollapsedHint,
    DimButton: () => DimButton,
    HEIGHT_SETTLE_MS: () => HEIGHT_SETTLE_MS,
    MARK_EDGE_COLUMNS: () => MARK_EDGE_COLUMNS,
    OverflowCue: () => OverflowCue,
    bandCollapsed: () => renderBurstSlot,
    bandKeys: () => bandKeys,
    bandWindow: () => bandWindow,
    default: () => AbovePromptBandNamespace,
    entryIndex: () => entryIndex,
    fieldContext: () => fieldContext,
    fieldTexts: () => focusSlot,
    focusableAt: () => pickOrNull,
    focusablesOf: () => collectSurfaceHandles,
    forgetSiteFields: () => bumpPaneRender,
    hotkeyPresses: () => hotkeyPresses,
    hotkeysOf: () => hotkeysOf,
    isFieldOwnKey: () => isTextEditingKey,
    isFieldText: () => isPlainTypedInput,
    isHotkeyShown: () => isHotkeyShown,
    isOtherDrawer: () => isOtherDrawer,
    isTypedText: () => isTypedText,
    nextBandFocus: () => nextBandFocus,
    openListRows: () => cachedHighlight,
    optionText: () => optionText,
    overflowCueText: () => overflowCueText,
    pickedValues: () => placementSlot,
    pressShownDigit: () => pressShownDigit,
    ringHandlers: () => ringHandlers,
    selectHandlers: () => selectHandlers,
    settledBudget: () => settledBudget,
    siteGeneration: () => askCountFor,
    siteGenerations: () => askSlot,
    siteKey: () => paneAskKey,
    useClickedPress: () => useClickedPress,
    useHotkeyPresses: () => useHotkeyPresses,
    useHotkeySeats: () => useHotkeySeats,
    useInputFields: () => useInputFields,
    useKeysAheadOfRender: () => usePaneKeyRouting,
    useRedrawnValues: () => getUniqueTags,
    useReleaseGoneHold: () => useReleaseGoneHold,
    useReleaseOnClickElsewhere: () => useClickOutside,
    useReleaseOnEdit: () => useReleaseOnEdit,
    useSelectFields: () => AbovePromptSelect,
    useSiteFields: () => useSiteFields,
    withoutKeys: () => withoutKeys,
  });
});
//@ chunk-18hwfzwa.js:481499-481570 placement
function useViewedAgentIdProps() {
  let appState = useAppState(getViewedTeammateTask);
  return useMemo(
    () =>
      appState === undefined
        ? {}
        : {
            agentId: appState,
          },
    [appState],
  );
}
//@ chunk-18hwfzwa.js:481570-481697 placement
var bandKeys = (keys, scrollRef, hasCue) => ({
  ...keys,
  ...paneScrollHandlers(scrollRef),
  ...(!hasCue && {
    "pane:scrollUp": keys["abovePrompt:previous"],
    "pane:scrollDown": keys["abovePrompt:next"],
  }),
});
//@ chunk-18hwfzwa.js:481697-481891 placement
function bandWindow(layout) {
  let { budget, settledBudget, treeRows } = layout;
  let max = Math.max(0, budget);
  let hasCue = treeRows > max;
  let windowRows = hasCue ? Math.max(0, max - 1) : max;
  return {
    windowRows,
    hasCue,
    maxOffset: Math.max(0, treeRows - windowRows),
    bodyRows: Math.max(0, settledBudget - 1),
  };
}
//@ chunk-18hwfzwa.js:481891-481895 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:481891", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:481895-482360 placement
function DimButton(props) {
  let $ = useMemoCache(7);
  let { label, onAction, isHeld } = props;
  let buttonRef = useRef(null);
  let onClick;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onClick = () => actionKeysNamespace.releaseInkFocus(buttonRef.current);
    $[0] = onClick;
  } else onClick = $[0];
  let children;
  if ($[1] !== isHeld || $[2] !== label) {
    children = (state) => {
      let isActive = state.hovered || isHeld === true;
      return jsxProd_default(Text, {
        dimColor: !isActive,
        inverse: isActive,
        children: label,
      });
    };
    $[1] = isHeld;
    $[2] = label;
    $[3] = children;
  } else children = $[3];
  let buttonElement;
  if ($[4] !== onAction || $[5] !== children) {
    buttonElement = jsxProd_default(Box, {
      ref: buttonRef,
      onClick,
      children: jsxProd_default(Button, {
        tabIndex: -1,
        onAction,
        children,
      }),
    });
    $[4] = onAction;
    $[5] = children;
    $[6] = buttonElement;
  } else buttonElement = $[6];
  return buttonElement;
}
//@ chunk-18hwfzwa.js:482360-482369 placement
var MARK_EDGE_COLUMNS = 1;
//@ chunk-18hwfzwa.js:482369-482561 placement
var CollapseHandle = (props) => {
  let $ = useMemoCache(2);
  let handleElement;
  if ($[0] !== props.onCollapse) {
    handleElement = jsxProd_default(Box, {
      position: "absolute",
      top: 0,
      right: MARK_EDGE_COLUMNS,
      children: jsxProd_default(DimButton, {
        label: "[-]",
        onAction: props.onCollapse,
      }),
    });
    $[0] = props.onCollapse;
    $[1] = handleElement;
  } else handleElement = $[1];
  return handleElement;
};
//@ chunk-18hwfzwa.js:482561-482571 placement
var COLLAPSE_HANDLE_COLUMNS = 5;
//@ chunk-18hwfzwa.js:482571-482974 placement
var CollapsedHint = (props) => {
  let $ = useMemoCache(5);
  let children;
  if ($[0] !== props.shortcut) {
    children = (state) =>
      jsxProd_default(Text, {
        dimColor: true,
        inverse: state.hovered,
        wrap: "truncate-end",
        children: `\u25B8 plugin panel hidden \xB7 ${props.shortcut} or click to show`,
      });
    $[0] = props.shortcut;
    $[1] = children;
  } else children = $[1];
  let hintButton;
  if ($[2] !== props.onExpand || $[3] !== children) {
    hintButton = jsxProd_default(Button, {
      tabIndex: -1,
      flexShrink: 0,
      alignSelf: "flex-start",
      onAction: props.onExpand,
      children,
    });
    $[2] = props.onExpand;
    $[3] = children;
    $[4] = hintButton;
  } else hintButton = $[4];
  return hintButton;
};
//@ chunk-18hwfzwa.js:482974-483071 placement
function entryIndex(entries) {
  let isPristine = entries.length === 0;
  let index = entries.findIndex((entry) => entry.isAutoFocus);
  return isPristine ? null : Math.max(0, index);
}
//@ chunk-18hwfzwa.js:483071-483197 placement
function fieldContext(panelKind, fallbackContext) {
  switch (panelKind?.tag) {
    case "Input":
      return "AbovePromptInput";
    case "Select":
      return "AbovePromptSelect";
    default:
      return fallbackContext;
  }
}
//@ chunk-18hwfzwa.js:483197-483209 placement
var HEIGHT_SETTLE_MS = 150;
//@ chunk-18hwfzwa.js:483209-483451 placement
function hotkeysOf(node) {
  let hotkeys = new Map();
  function visit(childNode) {
    if (typeof childNode === "string") return;
    if (childNode.type === "Button") {
      let { hotkey } = childNode.props;
      if (hotkey !== undefined) hotkeys.set(hotkey, childNode.press);
      return;
    }
    if (childNode.type !== "engine") for (let nestedChild of childNode.children ?? []) visit(nestedChild);
  }
  if (node !== undefined) visit(node);
  return hotkeys;
}
//@ chunk-18hwfzwa.js:483451-483696 placement
function isHotkeyShown(bandState, hotkeyNodes) {
  let { hasCue, content, offset, windowRows } = bandState;
  if (!hasCue) return true;
  if (content === null || hotkeyNodes === undefined || hotkeyNodes.size === 0) return false;
  return [...hotkeyNodes].every((node) => {
    let nodeTop = topWithin(node, content);
    let nodeHeight = node.yogaNode?.getComputedHeight() ?? 0;
    return nodeHeight > 0 && nodeTop >= offset && nodeTop + nodeHeight <= offset + windowRows;
  });
}
//@ chunk-18hwfzwa.js:483696-483782 placement
var isOtherDrawer = (drawerIds, otherDrawers) =>
  drawerIds.length > 0 &&
  otherDrawers.length > 0 &&
  !otherDrawers.some((drawer) => drawerIds.some((currentDrawer) => currentDrawer.plugin === drawer.plugin));
//@ chunk-18hwfzwa.js:483782-483909 placement
function nextBandFocus(state) {
  let { focus, count } = state;
  let hasFocusables = count > 0;
  let isFocusIndex = typeof focus === "number";
  let nextIndex = isFocusIndex && focus + 1 < count ? focus + 1 : null;
  return isFocusIndex ? nextIndex : hasFocusables ? 0 : focus === null ? "band" : null;
}
//@ chunk-18hwfzwa.js:483958-484061 placement
var overflowCueText = (above, below) =>
  [above > 0 ? `\u2191 ${above} more` : "", below > 0 ? `\u2193 ${below} more` : ""]
    .filter((part) => part !== "")
    .join(" \xB7 ");
//@ chunk-18hwfzwa.js:484061-484294 placement
var OverflowCue = (props) => {
  let $ = useMemoCache(5);
  let children;
  if ($[0] !== props.above || $[1] !== props.below) {
    children = overflowCueText(props.above, props.below);
    $[0] = props.above;
    $[1] = props.below;
    $[2] = children;
  } else children = $[2];
  let cueElement;
  if ($[3] !== children) {
    cueElement = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children,
    });
    $[3] = children;
    $[4] = cueElement;
  } else cueElement = $[4];
  return cueElement;
};
//@ chunk-18hwfzwa.js:484294-484344 placement
function pressShownDigit(digitHotkey, isAcceptingInput, releaseFocus) {
  if (digitHotkey !== undefined && isAcceptingInput()) {
    releaseFocus();
    pressFromTerminal(digitHotkey);
  }
}
//@ chunk-18hwfzwa.js:484344-484711 placement
function ringHandlers(ring) {
  let { focusables, focusIndexNow, focusByPerson, submit } = ring;
  let focusableCount = focusables.length;
  return {
    "abovePrompt:next": () => {
      if (focusableCount > 0) focusByPerson(((focusIndexNow() ?? -1) + 1) % focusableCount);
    },
    "abovePrompt:previous": () => {
      if (focusableCount > 0) focusByPerson(((focusIndexNow() ?? 0) - 1 + focusableCount) % focusableCount);
    },
    "abovePrompt:press": () => {
      let focusIndex = focusIndexNow();
      let focused = focusIndex === null ? null : (focusables[focusIndex] ?? null);
      if (focused?.tag === "Button") pressFromTerminal(focused);
      else if (focused?.tag === "Input") submit(focused);
    },
    "abovePrompt:leave": ring.leave,
  };
}
//@ chunk-18hwfzwa.js:484711-484746 placement
var settledBudget; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:484711", () => {
  settledBudget = identity_4(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-18hwfzwa.js:484746-484750 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:484746", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:484750-484862 placement
var useClickedPress = (focusables, setFocusIndex) =>
  useCallback(
    (target) => {
      let index = focusables.findIndex(
        (focusable) => focusable.plugin === target.plugin && focusable.handle === target.handle,
      );
      if (index >= 0) setFocusIndex(index);
    },
    [focusables, setFocusIndex],
  );
//@ chunk-18hwfzwa.js:484862-484962 placement
var isTypedText = (input, key) =>
  !key.ctrl &&
  !key.meta &&
  !key.super &&
  !key.escape &&
  !key.tab &&
  !key.return &&
  /^[^\p{C}\p{Z}]+$/u.test(input);
//@ chunk-18hwfzwa.js:484962-485124 placement
function hotkeyPresses(input, key, hotkeyMap) {
  let candidates = isTypedText(input, key)
    ? [...input.normalize("NFKC").toLowerCase()].map((char) => hotkeyMap.get(char))
    : [];
  let filtered = candidates.filter((press) => press !== undefined);
  return filtered.length === candidates.length ? filtered : [];
}
//@ chunk-18hwfzwa.js:485124-485239 placement
var useHotkeyPresses = (hotkeyMap, isActive) =>
  usePreDispatchKeyHandler(
    (input, key, pastedText) => {
      let presses = hotkeyPresses(input === "" ? pastedText : input, key, hotkeyMap);
      for (let press of presses) pressFromTerminal(press);
      return presses.length > 0;
    },
    {
      isActive,
    },
  );
//@ chunk-18hwfzwa.js:485239-485243 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:485239", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:485243-485431 placement
function useHotkeySeats() {
  let seatsRef = useRef(new Map());
  return useMemo(
    () => ({
      reportSeat: (hotkey, seat) => {
        let seats = seatsRef.current.get(hotkey) ?? new Set();
        seats.add(seat);
        seatsRef.current.set(hotkey, seats);
        return () => {
          seats.delete(seat);
        };
      },
      seatsOf: (hotkey) => seatsRef.current.get(hotkey),
    }),
    [],
  );
}
//@ chunk-18hwfzwa.js:485431-485435 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:485431", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:485435-485439 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:485435", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:485686-485690 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:485686", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:485690-485874 placement
function useSiteFields(storeRef, paneId, siteKey) {
  let askKey = paneAskKey(paneId, siteKey);
  let [askCount] = useState(() => askCountFor(paneId, siteKey));
  let fieldsState = useState(() => storeRef.get()?.get(askKey) ?? new Map());
  let [fields] = fieldsState;
  useEffect(() => {
    if (askCountFor(paneId, siteKey) === askCount) storeRef.set(new Map(storeRef.get()).set(askKey, fields));
  }, [storeRef, paneId, siteKey, askCount, askKey, fields]);
  return fieldsState;
}
//@ chunk-18hwfzwa.js:485874-486820 placement
function useInputFields(focusables, component, requestId) {
  let [values, setValues] = useSiteFields(focusSlot, component, requestId);
  let localValues = useRef(new Map(values));
  let submitting = useRef(new Set());
  getUniqueTags(focusables, "Input", (staleKeys) => {
    for (let key of staleKeys) localValues.current.delete(key);
    setValues((values) => withoutKeys(values, staleKeys));
  });
  let stepRef = useRef(() => {
    return;
  });
  return {
    fields: useMemo(
      () => ({
        textOf: (plugin, element) => values.get(fieldKey(plugin, element)),
        edit({ plugin, handle, element }, value) {
          let key = fieldKey(plugin, element);
          localValues.current.set(key, value);
          setValues((map) => new Map(map).set(key, value));
          inputFromTerminal({
            plugin,
            handle,
            element,
            component,
            kind: "change",
            value,
          });
        },
        step: (step) => stepRef.current(step),
      }),
      [values, component],
    ),
    ringStep: stepRef,
    textNow: ({ plugin, element, value: fallback }) => {
      let key = fieldKey(plugin, element);
      return localValues.current.get(key) ?? values.get(key) ?? fallback ?? "";
    },
    submit({ plugin, handle, element, value: fallback }) {
      let key = fieldKey(plugin, element);
      let value = localValues.current.get(key) ?? values.get(key) ?? fallback ?? "";
      if (submitting.current.has(key)) return;
      submitting.current.add(key);
      inputFromTerminal({
        plugin,
        handle,
        element,
        component,
        kind: "submit",
        value,
      }).then((result) => {
        submitting.current.delete(key);
        if (result !== undefined && (localValues.current.get(key) ?? value) === value) {
          localValues.current.set(key, "");
          setValues((map) => new Map(map).set(key, ""));
        }
      });
    },
  };
}
//@ chunk-18hwfzwa.js:486820-487023 layout
var isTextEditingKey = (input, key) =>
  key.leftArrow ||
  key.rightArrow ||
  key.upArrow ||
  key.downArrow ||
  key.home ||
  key.end ||
  key.delete ||
  key.pageUp ||
  key.pageDown ||
  (input.length === 1 && key.ctrl && "abdefhknpuwy".includes(input)) ||
  (input.length === 1 && key.meta && "bdfy".includes(input));
//@ chunk-18hwfzwa.js:487023-487110 placement (2.1.88 match: buildKeystroke, 0.659)
var isPlainTypedInput = (input, key) =>
  input !== "" &&
  !key.ctrl &&
  !key.meta &&
  !key.super &&
  !key.tab &&
  !key.return &&
  !key.escape &&
  !hasControlCharacter(input);
//@ chunk-18hwfzwa.js:487110-487945 layout
/**
 * 面板按键路由：按当前上下文匹配键绑定并转发。
 */
function usePaneKeyRouting(routing) {
  let keybindingContext = useKeybindingContext();
  usePreDispatchKeyHandler((input, key, pastedText) => {
    let focusContext = routing.contextNow();
    if (keybindingContext === null || focusContext === null) return false;
    if (key.wheelUp || key.wheelDown) return false;
    if (!routing.isAhead()) return false;
    let resolved = keybindingContext.resolve(input, key, [focusContext]);
    if (resolved.type === "match") {
      let handler = routing.handlers[focusContext]?.[resolved.action];
      if (handler !== undefined) {
        handler();
        return true;
      }
    }
    let focused = routing.focusedNow();
    if (focused?.tag === "Select" && routing.selectKeys(input, key)) return true;
    if (keybindingContext.resolve(input, key, ["Global"]).type === "match") return false;
    let text = input === "" ? pastedText : input;
    if (focused?.tag === "Input") {
      let fieldText = routing.inputs.textNow(focused);
      if (key.backspace) {
        routing.inputs.fields.edit(focused, [...fieldText].slice(0, -1).join(""));
        return true;
      }
      if (isPlainTypedInput(text, key)) {
        routing.inputs.fields.edit(focused, fieldText + text);
        return true;
      }
      if (isTextEditingKey(input, key)) return true;
    }
    let renderedContext = routing.contextRendered();
    if (renderedContext === null) return false;
    let resolved_2 = keybindingContext.resolve(input, key, [renderedContext]);
    let isContextMatch =
      resolved_2.type === "match" && routing.handlers[renderedContext]?.[resolved_2.action] !== undefined;
    let isEditingText = key.backspace || isPlainTypedInput(text, key) || isTextEditingKey(input, key);
    return isContextMatch || (routing.focusedRendered()?.tag === "Input" && isEditingText);
  });
}
//@ chunk-18hwfzwa.js:487945-487949 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:487945", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:487949-488004 placement
var useReleaseGoneHold = (holdStart, holdUntil, onRelease) =>
  useEffect(() => {
    if (holdStart !== null && holdStart >= holdUntil) onRelease();
  }, [holdStart, holdUntil, onRelease]);
//@ chunk-18hwfzwa.js:488004-488008 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:488004", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:488008-488142 placement
var useReleaseOnEdit = (store, resetKey, onEdit) =>
  useEffect(() => {
    if (resetKey === null) return;
    let initialValue = store.getState().value;
    return store.subscribe(() => {
      if (store.getState().value !== initialValue) onEdit();
    });
  }, [resetKey, store, onEdit]);
//@ chunk-18hwfzwa.js:488142-488172 placement
var optionText = (option) => option.label ?? option.value;
//@ chunk-18hwfzwa.js:488172-488306 placement
var selectHandlers = (select) => ({
  "abovePrompt:highlightNext": () => select.move(1),
  "abovePrompt:highlightPrevious": () => select.move(-1),
  "abovePrompt:press": select.press,
});
//@ chunk-18hwfzwa.js:488306-488310 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:488306", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:488310-490409 placement
function AbovePromptSelect(props) {
  let { focusables, focusIndex, focusIndexNow, setFocusIndex, working, component, requestId } = props;
  let focusedSelect = pickSelect(focusIndex);
  let [pickedValues, setPickedValues] = useSiteFields(placementSlot, component, requestId);
  let [selectState, setSelectState, getSelectState] = useLatestState(() => buildSelectState(null));
  getUniqueTags(focusables, "Select", (staleKey) =>
    setPickedValues((pickedMap) => withoutKeys(pickedMap, staleKey)),
  );
  if (selectState.key !== fieldKeyOf(focusedSelect)) setSelectState(buildSelectState(focusedSelect));
  let optionCount = focusedSelect?.options?.length ?? 0;
  let isOpen = focusedSelect !== null && selectState.isOpen;
  let min = Math.min(selectState.highlight, Math.max(0, optionCount - 1));
  let fields = useMemo(
    () => ({
      pickedOf: (plugin, element) => pickedValues.get(fieldKey(plugin, element)),
      open: isOpen
        ? {
            plugin: focusedSelect.plugin,
            handle: focusedSelect.handle,
            highlight: min,
          }
        : null,
    }),
    [pickedValues, focusedSelect, isOpen, min],
  );
  function pickSelect(index) {
    let focusable = pickOrNull(focusables, index);
    return focusable?.tag === "Select" ? focusable : null;
  }
  function fieldKeyOf(select) {
    return select === null ? null : fieldKey(select.plugin, select.element);
  }
  function buildSelectState(select) {
    let key = fieldKeyOf(select);
    let value = key === null ? undefined : (pickedValues.get(key) ?? select?.value);
    return {
      key,
      isOpen: select !== null,
      highlight: Math.max(
        0,
        (select?.options ?? []).findIndex((option) => option.value === value),
      ),
    };
  }
  function ensureState(select) {
    let current = getSelectState();
    if (current.key === fieldKeyOf(select)) return current;
    let next = buildSelectState(select);
    setSelectState(next);
    return next;
  }
  function move(delta) {
    let select = pickSelect(focusIndexNow());
    if (select === null) return;
    let state = ensureState(select);
    let optionCount = select.options?.length ?? 0;
    let min = Math.min(state.highlight, Math.max(0, optionCount - 1));
    setSelectState(
      state.isOpen
        ? {
            ...state,
            highlight: (min + delta + optionCount) % Math.max(1, optionCount),
          }
        : {
            ...state,
            isOpen: true,
          },
    );
  }
  function press() {
    let select = pickSelect(focusIndexNow());
    if (select === null) return;
    let key = fieldKey(select.plugin, select.element);
    let state = ensureState(select);
    let options = select.options ?? [];
    let option = options[Math.min(state.highlight, options.length - 1)];
    if (!state.isOpen || option === undefined) {
      setSelectState({
        ...state,
        isOpen: true,
      });
      return;
    }
    setPickedValues((prev) => new Map(prev).set(key, option.value));
    setSelectState({
      ...state,
      isOpen: false,
    });
    selectFromTerminal({
      plugin: select.plugin,
      handle: select.handle,
      element: select.element,
      component,
      value: option.value,
    }).then((result) =>
      setPickedValues((prev) =>
        result !== undefined && prev.get(key) === option.value ? new Map(prev).set(key, result.value) : prev,
      ),
    );
  }
  function typeahead(select, lowerCase) {
    let state = ensureState(select);
    let options = select.options ?? [];
    let count = options.length;
    let start = state.isOpen ? Math.min(state.highlight, count - 1) : -1;
    let found = options
      .map((option, offset) => (start + 1 + offset) % count)
      .find((index) => {
        let option = options[index];
        return option !== undefined && optionText(option).toLowerCase().startsWith(lowerCase);
      });
    if (found !== undefined)
      setSelectState({
        ...state,
        highlight: found,
        isOpen: true,
      });
  }
  return {
    fields,
    handlers: selectHandlers({
      move,
      press,
    }),
    intercept(input, key) {
      let select = pickSelect(focusIndexNow());
      let isCtrlC = key.ctrl && input === "c";
      let isTypedChar = isTypedText(input, key) && [...input].length === 1;
      if (select === null || (isCtrlC && working)) return false;
      let state = ensureState(select);
      if (isCtrlC && state.isOpen) {
        setSelectState({
          ...state,
          isOpen: false,
        });
        return true;
      }
      if (isCtrlC) {
        setFocusIndex(() => null);
        return true;
      }
      if (isTypedChar) typeahead(select, input.toLowerCase());
      return isTypedChar;
    },
  };
}
//@ chunk-18hwfzwa.js:490409-496344 placement
/**
 * AbovePromptBandView：插件在输入框上方的横幅带视图。
 */
function AbovePromptBandView({ survey, working, setInputValue, onHoldsBandChange }) {
  let { rows, columns } = useTerminalSize();
  let max = Math.max(0, columns - COLLAPSE_HANDLE_COLUMNS);
  let treeRowsReader = useContext(ContextSlotA);
  let [focusIndex, setFocusIndexRaw, getFocusIndex] = useLatestState(null);
  let focusIndexNow = useCallback(() => {
    let currentIndex = getFocusIndex();
    return typeof currentIndex === "number" ? currentIndex : null;
  }, [getFocusIndex]);
  let clickOutside = useClickOutside(useCallback(() => setFocusIndexRaw(null), []));
  let contentRef = useRef(null);
  let scrollTargetRef = useRef(null);
  let heldRef = useRef(null);
  let lastHighlight = useRef(0);
  let prevFocusables = useRef([]);
  let budgetRows = useMeasured(() => {
    let treeRows = treeRowsReader === null ? null : treeRowsReader();
    let settledBudgetValue = settledBudget.get();
    let useSettled = treeRows === null || (clickOutside.current === null && settledBudgetValue !== undefined);
    if (treeRowsReader === null) return rows;
    return useSettled
      ? (settledBudgetValue ?? rows)
      : Math.max(
          0,
          Math.min(
            rows,
            (clickOutside.current === null ? 0 : measureElement(clickOutside.current).height) + treeRows,
          ),
        );
  });
  let treeHeight = useMeasured(
    () =>
      (contentRef.current === null ? 0 : measureElement(contentRef.current).height) - lastHighlight.current,
  );
  let [settledRows, setSettledRows] = useState(budgetRows);
  let [scrollTick, setScrollTick] = useState(0);
  let settleBudget = useDebouncedCallback((rows) => {
    settledBudget.set(rows);
    setSettledRows(rows);
  }, HEIGHT_SETTLE_MS);
  useEffect(
    () => (budgetRows === settledRows ? settleBudget.cancel() : settleBudget(budgetRows)),
    [budgetRows, settledRows, settleBudget],
  );
  let isHeld = focusIndex !== null;
  let { windowRows, hasCue, maxOffset, bodyRows } = bandWindow({
    budget: budgetRows,
    settledBudget: settledRows,
    treeRows: treeHeight,
  });
  let paneBody = PaneBody({
    component: "AbovePrompt",
    requestId: ABOVE_PROMPT,
    owner: undefined,
    bodyRows: windowRows,
    contentRows: treeHeight,
    maxOffset,
    content: contentRef,
  });
  let { offset, placed, place } = paneBody;
  let onWheel = wheelScrollRows(paneBody, toLocalPoint(scrollTargetRef));
  let viewedAgentIdProps = useViewedAgentIdProps();
  let drawing = useRenderDrawing(
    withScrollOffset(
      useRenderInput(
        "AbovePrompt",
        () => ({
          requestId: ABOVE_PROMPT,
          props: {
            hasSurvey: survey,
            isWorking: working,
            maxRows: settledRows,
            bodyColumns: max,
            scroll: {
              offset: 0,
              bodyRows,
            },
            view: viewedAgentIdProps,
          },
        }),
        [survey, working, settledRows, max, bodyRows, viewedAgentIdProps],
      ),
      paneBody,
    ),
    () => null,
  );
  let [isCollapsed, setIsCollapsed] = useState(renderBurstSlot.get() === true);
  let { drawn, hasThrown } = drawing;
  let hasContent = drawn !== undefined && (typeof drawn === "string" || drawn.type !== "engine");
  let visibleDrawing = isCollapsed ? undefined : drawn;
  let hotkeys = hotkeysOf(visibleDrawing);
  let hotkeySeats = useHotkeySeats();
  let focusables = useMemo(() => collectSurfaceHandles(visibleDrawing), [visibleDrawing]);
  let focusIndexNumber = typeof focusIndex === "number" ? focusIndex : null;
  let focusedHandle = focusIndexNumber === null ? null : (focusables[focusIndexNumber] ?? null);
  let value = useMemo(
    () =>
      focusedHandle === null
        ? null
        : {
            plugin: focusedHandle.plugin,
            handle: focusedHandle.handle,
          },
    [focusedHandle],
  );
  let tag = focusedHandle === null ? null : focusedHandle.tag;
  let value_2 = useMemo(
    () => (node) => {
      if (node !== null)
        heldRef.current = {
          node,
          index: focusIndexNumber,
        };
    },
    [focusIndexNumber],
  );
  let heldState = () => ({
    held: heldRef.current,
    index: focusIndexNumber,
    content: contentRef.current,
  });
  let heldTop = useMeasured(() => heldRowOffset(heldState(), "top"));
  let heldBottom = useMeasured(() => heldRowOffset(heldState(), "bottom"));
  let setFocusIndex = useCallback(
    (updater) => setFocusIndexRaw((prev) => updater(typeof prev === "number" ? prev : null)),
    [],
  );
  let land = useCallback((index) => {
    setFocusIndexRaw(index);
    setScrollTick((tick) => tick + 1);
  }, []);
  let firstIndex = entryIndex(focusables);
  let uiFocus = uiFocusForPlugin({
    component: "AbovePrompt",
    requestId: ABOVE_PROMPT,
    owner: undefined,
    focusables,
    isHeld,
    isHeldNow: useCallback(() => getFocusIndex() !== null, [getFocusIndex]),
    indexNow: focusIndexNow,
    isEmptyNow: useCallback(() => getFocusIndex() === "band", [getFocusIndex]),
    land,
  });
  let moveFocus = useCallback(
    (updater) => {
      let wasUnfocused = getFocusIndex() === null;
      if (wasUnfocused) setFocusIndexRaw("band");
      uiFocus.act(() => {
        let next = updater(wasUnfocused);
        if (typeof next === "number")
          uiFocus.moveByPerson({
            index: next,
            apply: () => land(next),
          });
        else {
          setFocusIndexRaw((prev) => next ?? prev);
          setScrollTick((tick) => tick + 1);
        }
      });
    },
    [uiFocus, land],
  );
  let inputFields = useInputFields(focusables, "AbovePrompt", ABOVE_PROMPT);
  let selectState = AbovePromptSelect({
    focusables,
    focusIndex: focusIndexNumber,
    focusIndexNow,
    setFocusIndex,
    working,
    component: "AbovePrompt",
    requestId: ABOVE_PROMPT,
  });
  let open = selectState.fields.open;
  let optionCount = focusedHandle?.options?.length ?? 0;
  let highlightRows = cachedHighlight(open, optionCount);
  useLayoutEffect(() => {
    lastHighlight.current = cachedHighlight(open, optionCount);
  }, [open, optionCount]);
  let shortDraftValue = useShortDraftValue();
  let sessionStoreValue = sessionStore();
  let focusedPaneId = useStoreSelector(paneRegistry(), (registry) => registry.focusedId);
  let focusRequest = useStoreSelector(paneRegistry(), (registry) => registry.focusRequest);
  let hasAutoDialog = useHasAutoDialog();
  let shortcut = useShortcutDisplay_2("abovePrompt:toggle", "Chat", "ctrl+x ctrl+a");
  let canHold = !survey && (focusables.length > 0 || hasCue);
  let canFocus = canHold && !hasAutoDialog;
  let defaultFocus = nextBandFocus({
    focus: null,
    count: focusables.length,
  });
  let onClickFocus = useCallback(
    (requestedIndex) => {
      if (!canFocus) return;
      focusPane(null);
      let targetIndex = requestedIndex ?? (getFocusIndex() === null ? firstIndex : null);
      if (targetIndex === null) return setFocusIndexRaw((prevFocus) => prevFocus ?? defaultFocus);
      return moveFocus(() => targetIndex);
    },
    [canFocus, defaultFocus, firstIndex, moveFocus],
  );
  let value_3 = useClickedPress(focusables, onClickFocus);
  function setCollapsed(collapsed) {
    renderBurstSlot.set(collapsed);
    setIsCollapsed(collapsed);
    setFocusIndexRaw(null);
  }
  useReleaseGoneHold(
    focusIndexNumber,
    focusables.length,
    useCallback(() => setFocusIndexRaw("band"), []),
  );
  let release = useCallback(() => {
    setFocusIndexRaw(null);
    focusPane(null);
  }, []);
  useReleaseOnEdit(sessionStoreValue, focusIndex ?? focusedPaneId, release);
  useEffect(release, [survey, release]);
  useEffect(() => {
    if (!canHold) setFocusIndexRaw(null);
  }, [canHold]);
  useEffect(() => {
    if (focusedPaneId !== null) setFocusIndexRaw(null);
  }, [focusedPaneId]);
  let focusedId = useStoreSelector(focusStore, (state) => state.focusedId);
  useEffect(() => {
    if (focusedId !== null) setFocusIndexRaw(null);
  }, [focusedId]);
  useEffect(() => {
    if (isHeld) setFocusedClient(null);
  }, [isHeld]);
  useEffect(() => {
    let shouldClamp = !isCollapsed && treeHeight > 0;
    if (!hasContent) place(() => 0);
    else if (shouldClamp && placed > maxOffset) place(() => maxOffset);
  }, [hasContent, isCollapsed, treeHeight, placed, maxOffset, place]);
  useEffect(() => {
    if (isOtherDrawer(prevFocusables.current, focusables)) {
      place(() => 0);
      setFocusIndexRaw(null);
    }
    prevFocusables.current = focusables;
  }, [focusables, place]);
  useEffect(() => {
    if (heldTop >= 0)
      place((offset) =>
        nearestScrollTop({
          offset,
          bodyRows: windowRows,
          top: heldTop,
          bottom: heldBottom,
        }),
      );
  }, [heldTop, heldBottom, windowRows, scrollTick, place]);
  useEffect(() => {
    settleFocusRequest(false);
    return () => settleFocusRequest(false);
  }, []);
  useEffect(() => {
    let state = paneRegistry().getState();
    if (state.focusRequest === null) return;
    settleFocusRequest(
      shortDraftValue === "" &&
        !survey &&
        !hasAutoDialog &&
        focusIndex === null &&
        state.focusedId === null &&
        state.placements > 0,
    );
  }, [focusRequest, shortDraftValue, survey, hasAutoDialog, focusIndex]);
  useKeybinding(
    "abovePrompt:toggle",
    () => {
      if (!hasContent) return false;
      setCollapsed(!isCollapsed);
    },
    {
      context: "Chat",
    },
  );
  useKeybinding(
    "abovePrompt:focus",
    () => {
      let state = paneRegistry().getState();
      let nextFocus = nextBandFocus({
        focus: getFocusIndex(),
        count: focusables.length,
      });
      let shouldLandFocus = canHold && state.focusedId === null && nextFocus !== null;
      let resolveIndex = (current, fallback) =>
        current && typeof fallback === "number" ? (firstIndex ?? fallback) : fallback;
      if (state.focusedId !== null) focusPane(nextPaneId(state));
      else if (shouldLandFocus)
        moveFocus((current) =>
          resolveIndex(
            current,
            nextBandFocus({
              focus: getFocusIndex(),
              count: focusables.length,
            }),
          ),
        );
      else if (state.open.length > 0) {
        setFocusIndexRaw(null);
        focusPane(nextPaneId(state));
      } else if (canHold) moveFocus((current) => resolveIndex(current, defaultFocus));
      else return false;
    },
    {
      context: "Chat",
    },
  );
  let isInputTag = tag === "Input";
  let isSelectTag = tag === "Select";
  let isActive = isHeld && !isInputTag && !isSelectTag;
  useRegisterKeybindingContext("AbovePrompt", isActive);
  useRegisterKeybindingContext("AbovePromptInput", isInputTag);
  useRegisterKeybindingContext("AbovePromptSelect", isSelectTag);
  useRegisterOverlay("above-prompt-input", isInputTag);
  useRegisterOverlay("above-prompt-select", isSelectTag);
  let inputHandlers = wrapActHandlers(
    uiFocus,
    ringHandlers({
      focusables,
      focusIndexNow,
      focusByPerson: (index) =>
        uiFocus.moveByPerson({
          index,
          apply: () => land(index),
        }),
      leave: () => {
        uiFocus.forget();
        setFocusIndexRaw(null);
      },
      submit: inputFields.submit,
    }),
    ["abovePrompt:leave"],
  );
  let bandHandlers = bandKeys(inputHandlers, paneBody, hasCue);
  useEffect(() => {
    inputFields.ringStep.current = (step) => inputHandlers[`abovePrompt:${step}`]?.();
  });
  let selectHandlers = {
    ...inputHandlers,
    ...selectState.handlers,
  };
  function contextNow() {
    let isHeldNow = getFocusIndex() !== null;
    let focused = pickOrNull(focusables, focusIndexNow());
    return isHeldNow ? fieldContext(focused, "AbovePrompt") : null;
  }
  MessageActionsKeybindings(bandHandlers, {
    context: "AbovePrompt",
    isActive,
  });
  MessageActionsKeybindings(inputHandlers, {
    context: "AbovePromptInput",
    isActive: isInputTag,
  });
  MessageActionsKeybindings(selectHandlers, {
    context: "AbovePromptSelect",
    isActive: isSelectTag,
  });
  usePaneKeyRouting({
    isAhead: () => getFocusIndex() !== focusIndex,
    contextNow,
    focusedNow: () => pickOrNull(focusables, focusIndexNow()),
    contextRendered: () => (focusIndex === null ? null : fieldContext(focusedHandle, "AbovePrompt")),
    focusedRendered: () => focusedHandle,
    handlers: {
      AbovePrompt: bandHandlers,
      AbovePromptInput: inputHandlers,
      AbovePromptSelect: selectHandlers,
    },
    inputs: inputFields,
    selectKeys: selectState.intercept,
  });
  usePreDispatchKeyHandler(selectState.intercept, {
    isActive: isSelectTag,
  });
  useHotkeyPresses(hotkeys, isActive);
  let holdsBand = hotkeys.size > 0;
  useLayoutEffect(() => {
    onHoldsBandChange?.(holdsBand && !hasThrown(drawn));
  }, [holdsBand, hasThrown, drawn, onHoldsBandChange]);
  useLayoutEffect(() => () => onHoldsBandChange?.(false), [onHoldsBandChange]);
  let isSeatShown = (digit) =>
    isHotkeyShown(
      {
        hasCue,
        content: contentRef.current,
        offset,
        windowRows,
      },
      hotkeySeats.seatsOf(digit),
    );
  useDigitHotkeys({
    inputValue: shortDraftValue,
    enabled: !survey && hotkeys.size > 0,
    enterConfirms: false,
    isValidDigit: (digit) => /^[0-9]$/.test(digit) && hotkeys.has(digit) && isSeatShown(digit),
    onDigit: (digit) =>
      pressShownDigit(
        hotkeys.get(digit),
        () => isSeatShown(digit),
        () => setInputValue(""),
      ),
  });
  let isCollapsedContent = isCollapsed && hasContent;
  let wheelEnabled = hasCue && !hasAutoDialog;
  return jsxProd_default(FocusedPress, {
    value,
    children: jsxProd_default(FocusedNode, {
      value: value_2,
      children: jsxProd_default(ClickedPress, {
        value: value_3,
        children: jsxProd_default(InputFields, {
          value: inputFields.fields,
          children: jsxProd_default(SelectFields, {
            value: selectState.fields,
            children: jsxProd_default(HotkeySeat, {
              value: hotkeySeats.reportSeat,
              children: jsxProd_default_2(Box, {
                ref: clickOutside,
                flexDirection: "column",
                flexShrink: 0,
                maxHeight: budgetRows + highlightRows,
                overflowY: "hidden",
                onWheel: wheelEnabled ? onWheel : undefined,
                children: [
                  isCollapsedContent
                    ? jsxProd_default(CollapsedHint, {
                        shortcut,
                        onExpand: () => setCollapsed(false),
                      })
                    : jsxProd_default(Box, {
                        ref: scrollTargetRef,
                        flexDirection: "column",
                        flexShrink: 0,
                        maxHeight: windowRows + highlightRows,
                        overflowY: "hidden",
                        onClick: focusClick(() => onClickFocus(null)),
                        children: jsxProd_default(PaneContent, {
                          content: contentRef,
                          offset,
                          columns: max,
                          rows: bodyRows,
                          keptColumns: COLLAPSE_HANDLE_COLUMNS,
                          children: drawing.node,
                        }),
                      }),
                  hasCue &&
                    jsxProd_default(OverflowCue, {
                      above: offset,
                      below: maxOffset - offset,
                    }),
                  !isCollapsed &&
                    hasContent &&
                    jsxProd_default(CollapseHandle, {
                      onCollapse: () => setCollapsed(true),
                    }),
                ],
              }),
            }),
          }),
        }),
      }),
    }),
  });
}
export {
  AbovePromptBandNamespace,
  ringHandlers,
  MARK_EDGE_COLUMNS,
  useViewedAgentIdProps,
  hotkeysOf,
  useInputFields,
  AbovePromptSelect,
  useClickedPress,
  useReleaseGoneHold,
  fieldContext,
  usePaneKeyRouting,
  useHotkeyPresses,
};
