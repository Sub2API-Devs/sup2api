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
import { Ar, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
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
import { Q, init_react_production, R, ce, y, P, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import {
  paneScrollHandlers,
  PaneBody,
  wheelScrollRows,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
} from "./PaneBody.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:34353-34363 placement
var AbovePromptBandNamespace = {};
//@ chunk-18hwfzwa.js:34363-35469 placement
Ar(AbovePromptBandNamespace, {
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
//@ chunk-18hwfzwa.js:481499-481570 placement
function useViewedAgentIdProps() {
  let appState = useAppState(getViewedTeammateTask);
  return Q(
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
var bandKeys = (h, x, hasCue) => ({
  ...h,
  ...paneScrollHandlers(x),
  ...(!hasCue && {
    "pane:scrollUp": h["abovePrompt:previous"],
    "pane:scrollDown": h["abovePrompt:next"],
  }),
});
//@ chunk-18hwfzwa.js:481697-481891 placement
function bandWindow(h) {
  let { budget, settledBudget, treeRows } = h;
  let max = Math.max(0, budget);
  let ke = treeRows > max;
  let Re = ke ? Math.max(0, max - 1) : max;
  return {
    windowRows: Re,
    hasCue: ke,
    maxOffset: Math.max(0, treeRows - Re),
    bodyRows: Math.max(0, settledBudget - 1),
  };
}
//@ chunk-18hwfzwa.js:481891-481895 placement
init_react_production();
//@ chunk-18hwfzwa.js:481895-482360 placement
function DimButton(props) {
  let $ = w(7);
  let { label, onAction, isHeld } = props;
  let ee = R(null);
  let onClick;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onClick = () => actionKeysNamespace.releaseInkFocus(ee.current);
    $[0] = onClick;
  } else onClick = $[0];
  let children;
  if ($[1] !== isHeld || $[2] !== label) {
    children = (He) => {
      let We = He.hovered || isHeld === true;
      return jsxProd_default(Text, {
        dimColor: !We,
        inverse: We,
        children: label,
      });
    };
    $[1] = isHeld;
    $[2] = label;
    $[3] = children;
  } else children = $[3];
  let ze;
  if ($[4] !== onAction || $[5] !== children) {
    ze = jsxProd_default(Box, {
      ref: ee,
      onClick,
      children: jsxProd_default(Button, {
        tabIndex: -1,
        onAction,
        children,
      }),
    });
    $[4] = onAction;
    $[5] = children;
    $[6] = ze;
  } else ze = $[6];
  return ze;
}
//@ chunk-18hwfzwa.js:482360-482369 placement
var MARK_EDGE_COLUMNS = 1;
//@ chunk-18hwfzwa.js:482369-482561 placement
var CollapseHandle = (h) => {
  let x = w(2);
  let D;
  if (x[0] !== h.onCollapse) {
    D = jsxProd_default(Box, {
      position: "absolute",
      top: 0,
      right: MARK_EDGE_COLUMNS,
      children: jsxProd_default(DimButton, {
        label: "[-]",
        onAction: h.onCollapse,
      }),
    });
    x[0] = h.onCollapse;
    x[1] = D;
  } else D = x[1];
  return D;
};
//@ chunk-18hwfzwa.js:482561-482571 placement
var COLLAPSE_HANDLE_COLUMNS = 5;
//@ chunk-18hwfzwa.js:482571-482974 placement
var CollapsedHint = (h) => {
  let x = w(5);
  let children;
  if (x[0] !== h.shortcut) {
    children = (L) =>
      jsxProd_default(Text, {
        dimColor: true,
        inverse: L.hovered,
        wrap: "truncate-end",
        children: `\u25B8 plugin panel hidden \xB7 ${h.shortcut} or click to show`,
      });
    x[0] = h.shortcut;
    x[1] = children;
  } else children = x[1];
  let ee;
  if (x[2] !== h.onExpand || x[3] !== children) {
    ee = jsxProd_default(Button, {
      tabIndex: -1,
      flexShrink: 0,
      alignSelf: "flex-start",
      onAction: h.onExpand,
      children,
    });
    x[2] = h.onExpand;
    x[3] = children;
    x[4] = ee;
  } else ee = x[4];
  return ee;
};
//@ chunk-18hwfzwa.js:482974-483071 placement
function entryIndex(h) {
  let x = h.length === 0;
  let index = h.findIndex((L) => L.isAutoFocus);
  return x ? null : Math.max(0, index);
}
//@ chunk-18hwfzwa.js:483071-483197 placement
function fieldContext(h, x) {
  switch (h?.tag) {
    case "Input":
      return "AbovePromptInput";
    case "Select":
      return "AbovePromptSelect";
    default:
      return x;
  }
}
//@ chunk-18hwfzwa.js:483197-483209 placement
var HEIGHT_SETTLE_MS = 150;
//@ chunk-18hwfzwa.js:483209-483451 placement
function hotkeysOf(h) {
  let x = new Map();
  function D(L) {
    if (typeof L === "string") return;
    if (L.type === "Button") {
      let { hotkey } = L.props;
      if (hotkey !== undefined) x.set(hotkey, L.press);
      return;
    }
    if (L.type !== "engine") for (let ee of L.children ?? []) D(ee);
  }
  if (h !== undefined) D(h);
  return x;
}
//@ chunk-18hwfzwa.js:483451-483696 placement
function isHotkeyShown(h, x) {
  let { hasCue, content, offset, windowRows } = h;
  if (!hasCue) return true;
  if (content === null || x === undefined || x.size === 0) return false;
  return [...x].every((Re) => {
    let Be = topWithin(Re, content);
    let He = Re.yogaNode?.getComputedHeight() ?? 0;
    return He > 0 && Be >= offset && Be + He <= offset + windowRows;
  });
}
//@ chunk-18hwfzwa.js:483696-483782 placement
var isOtherDrawer = (h, x) =>
  h.length > 0 && x.length > 0 && !x.some((D) => h.some((L) => L.plugin === D.plugin));
//@ chunk-18hwfzwa.js:483782-483909 placement
function nextBandFocus(h) {
  let { focus, count } = h;
  let L = count > 0;
  let ee = typeof focus === "number";
  let ke = ee && focus + 1 < count ? focus + 1 : null;
  return ee ? ke : L ? 0 : focus === null ? "band" : null;
}
//@ chunk-18hwfzwa.js:483958-484061 placement
var overflowCueText = (above, below) =>
  [above > 0 ? `\u2191 ${above} more` : "", below > 0 ? `\u2193 ${below} more` : ""]
    .filter((D) => D !== "")
    .join(" \xB7 ");
//@ chunk-18hwfzwa.js:484061-484294 placement
var OverflowCue = (h) => {
  let x = w(5);
  let children;
  if (x[0] !== h.above || x[1] !== h.below) {
    children = overflowCueText(h.above, h.below);
    x[0] = h.above;
    x[1] = h.below;
    x[2] = children;
  } else children = x[2];
  let L;
  if (x[3] !== children) {
    L = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children,
    });
    x[3] = children;
    x[4] = L;
  } else L = x[4];
  return L;
};
//@ chunk-18hwfzwa.js:484294-484344 placement
function pressShownDigit(h, x, D) {
  if (h !== undefined && x()) {
    D();
    pressFromTerminal(h);
  }
}
//@ chunk-18hwfzwa.js:484344-484711 placement
function ringHandlers(ring) {
  let { focusables, focusIndexNow, focusByPerson, submit } = ring;
  let ke = focusables.length;
  return {
    "abovePrompt:next": () => {
      if (ke > 0) focusByPerson(((focusIndexNow() ?? -1) + 1) % ke);
    },
    "abovePrompt:previous": () => {
      if (ke > 0) focusByPerson(((focusIndexNow() ?? 0) - 1 + ke) % ke);
    },
    "abovePrompt:press": () => {
      let Re = focusIndexNow();
      let Be = Re === null ? null : (focusables[Re] ?? null);
      if (Be?.tag === "Button") pressFromTerminal(Be);
      else if (Be?.tag === "Input") submit(Be);
    },
    "abovePrompt:leave": ring.leave,
  };
}
//@ chunk-18hwfzwa.js:484711-484746 placement
var settledBudget = identity_4(createValueSlot(), (h) => h.set(undefined));
//@ chunk-18hwfzwa.js:484746-484750 placement
init_react_production();
//@ chunk-18hwfzwa.js:484750-484862 placement
var useClickedPress = (h, x) =>
  ce(
    (D) => {
      let index = h.findIndex((ee) => ee.plugin === D.plugin && ee.handle === D.handle);
      if (index >= 0) x(index);
    },
    [h, x],
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
function hotkeyPresses(h, key, D) {
  let L = isTypedText(h, key) ? [...h.normalize("NFKC").toLowerCase()].map((ke) => D.get(ke)) : [];
  let filtered = L.filter((ke) => ke !== undefined);
  return filtered.length === L.length ? filtered : [];
}
//@ chunk-18hwfzwa.js:485124-485239 placement
var useHotkeyPresses = (h, isActive) =>
  usePreDispatchKeyHandler(
    (D, L, ee) => {
      let Re = hotkeyPresses(D === "" ? ee : D, L, h);
      for (let Be of Re) pressFromTerminal(Be);
      return Re.length > 0;
    },
    {
      isActive,
    },
  );
//@ chunk-18hwfzwa.js:485239-485243 placement
init_react_production();
//@ chunk-18hwfzwa.js:485243-485431 placement
function useHotkeySeats() {
  let h = R(new Map());
  return Q(
    () => ({
      reportSeat: (x, D) => {
        let L = h.current.get(x) ?? new Set();
        L.add(D);
        h.current.set(x, L);
        return () => {
          L.delete(D);
        };
      },
      seatsOf: (x) => h.current.get(x),
    }),
    [],
  );
}
//@ chunk-18hwfzwa.js:485431-485435 placement
init_react_production();
//@ chunk-18hwfzwa.js:485435-485439 placement
init_react_production();
//@ chunk-18hwfzwa.js:485686-485690 placement
init_react_production();
//@ chunk-18hwfzwa.js:485690-485874 placement
function useSiteFields(h, x, D) {
  let L = paneAskKey(x, D);
  let [ee] = y(() => askCountFor(x, D));
  let ke = y(() => h.get()?.get(L) ?? new Map());
  let [Re] = ke;
  P(() => {
    if (askCountFor(x, D) === ee) h.set(new Map(h.get()).set(L, Re));
  }, [h, x, D, ee, L, Re]);
  return ke;
}
//@ chunk-18hwfzwa.js:485874-486820 placement
function useInputFields(h, x, D) {
  let [L, ee] = useSiteFields(focusSlot, x, D);
  let ke = R(new Map(L));
  let Re = R(new Set());
  getUniqueTags(h, "Input", (We) => {
    for (let ze of We) ke.current.delete(ze);
    ee((ze) => withoutKeys(ze, We));
  });
  let Be = R(() => {
    return;
  });
  return {
    fields: Q(
      () => ({
        textOf: (We, ze) => L.get(fieldKey(We, ze)),
        edit({ plugin, handle, element }, rt) {
          let kt = fieldKey(plugin, element);
          ke.current.set(kt, rt);
          ee((At) => new Map(At).set(kt, rt));
          inputFromTerminal({
            plugin,
            handle,
            element,
            component: x,
            kind: "change",
            value: rt,
          });
        },
        step: (We) => Be.current(We),
      }),
      [L, x],
    ),
    ringStep: Be,
    textNow: ({ plugin, element, value: Xe }) => {
      let rt = fieldKey(plugin, element);
      return ke.current.get(rt) ?? L.get(rt) ?? Xe ?? "";
    },
    submit({ plugin, handle, element, value: rt }) {
      let kt = fieldKey(plugin, element);
      let At = ke.current.get(kt) ?? L.get(kt) ?? rt ?? "";
      if (Re.current.has(kt)) return;
      Re.current.add(kt);
      inputFromTerminal({
        plugin,
        handle,
        element,
        component: x,
        kind: "submit",
        value: At,
      }).then((It) => {
        Re.current.delete(kt);
        if (It !== undefined && (ke.current.get(kt) ?? At) === At) {
          ke.current.set(kt, "");
          ee((Et) => new Map(Et).set(kt, ""));
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
//@ chunk-18hwfzwa.js:487023-487110 placement = buildKeystroke (0.659)
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
function usePaneKeyRouting(h) {
  let keybindingContext = useKeybindingContext();
  usePreDispatchKeyHandler((input, key, ee) => {
    let ke = h.contextNow();
    if (keybindingContext === null || ke === null) return false;
    if (key.wheelUp || key.wheelDown) return false;
    if (!h.isAhead()) return false;
    let resolved = keybindingContext.resolve(input, key, [ke]);
    if (resolved.type === "match") {
      let kt = h.handlers[ke]?.[resolved.action];
      if (kt !== undefined) {
        kt();
        return true;
      }
    }
    let Be = h.focusedNow();
    if (Be?.tag === "Select" && h.selectKeys(input, key)) return true;
    if (keybindingContext.resolve(input, key, ["Global"]).type === "match") return false;
    let He = input === "" ? ee : input;
    if (Be?.tag === "Input") {
      let kt = h.inputs.textNow(Be);
      if (key.backspace) {
        h.inputs.fields.edit(Be, [...kt].slice(0, -1).join(""));
        return true;
      }
      if (isPlainTypedInput(He, key)) {
        h.inputs.fields.edit(Be, kt + He);
        return true;
      }
      if (isTextEditingKey(input, key)) return true;
    }
    let We = h.contextRendered();
    if (We === null) return false;
    let resolved_2 = keybindingContext.resolve(input, key, [We]);
    let Xe = resolved_2.type === "match" && h.handlers[We]?.[resolved_2.action] !== undefined;
    let rt = key.backspace || isPlainTypedInput(He, key) || isTextEditingKey(input, key);
    return Xe || (h.focusedRendered()?.tag === "Input" && rt);
  });
}
//@ chunk-18hwfzwa.js:487945-487949 placement
init_react_production();
//@ chunk-18hwfzwa.js:487949-488004 placement
var useReleaseGoneHold = (h, x, D) =>
  P(() => {
    if (h !== null && h >= x) D();
  }, [h, x, D]);
//@ chunk-18hwfzwa.js:488004-488008 placement
init_react_production();
//@ chunk-18hwfzwa.js:488008-488142 placement
var useReleaseOnEdit = (h, x, D) =>
  P(() => {
    if (x === null) return;
    let L = h.getState().value;
    return h.subscribe(() => {
      if (h.getState().value !== L) D();
    });
  }, [x, h, D]);
//@ chunk-18hwfzwa.js:488142-488172 placement
var optionText = (h) => h.label ?? h.value;
//@ chunk-18hwfzwa.js:488172-488306 placement
var selectHandlers = (h) => ({
  "abovePrompt:highlightNext": () => h.move(1),
  "abovePrompt:highlightPrevious": () => h.move(-1),
  "abovePrompt:press": h.press,
});
//@ chunk-18hwfzwa.js:488306-488310 placement
init_react_production();
//@ chunk-18hwfzwa.js:488310-490409 placement
function AbovePromptSelect(props) {
  let { focusables, focusIndex, focusIndexNow, setFocusIndex, working, component, requestId } = props;
  let He = Dt(focusIndex);
  let [We, ze] = useSiteFields(placementSlot, component, requestId);
  let [Xe, rt, kt] = useLatestState(() => oo(null));
  getUniqueTags(focusables, "Select", (ao) => ze((co) => withoutKeys(co, ao)));
  if (Xe.key !== Lt(He)) rt(oo(He));
  let At = He?.options?.length ?? 0;
  let isOpen = He !== null && Xe.isOpen;
  let min = Math.min(Xe.highlight, Math.max(0, At - 1));
  let fields = Q(
    () => ({
      pickedOf: (ao, co) => We.get(fieldKey(ao, co)),
      open: isOpen
        ? {
            plugin: He.plugin,
            handle: He.handle,
            highlight: min,
          }
        : null,
    }),
    [We, He, isOpen, min],
  );
  function Dt(ao) {
    let co = pickOrNull(focusables, ao);
    return co?.tag === "Select" ? co : null;
  }
  function Lt(ao) {
    return ao === null ? null : fieldKey(ao.plugin, ao.element);
  }
  function oo(ao) {
    let co = Lt(ao);
    let bo = co === null ? undefined : (We.get(co) ?? ao?.value);
    return {
      key: co,
      isOpen: ao !== null,
      highlight: Math.max(
        0,
        (ao?.options ?? []).findIndex((Ao) => Ao.value === bo),
      ),
    };
  }
  function Xt(ao) {
    let co = kt();
    if (co.key === Lt(ao)) return co;
    let bo = oo(ao);
    rt(bo);
    return bo;
  }
  function io(ao) {
    let co = Dt(focusIndexNow());
    if (co === null) return;
    let bo = Xt(co);
    let Ao = co.options?.length ?? 0;
    let min = Math.min(bo.highlight, Math.max(0, Ao - 1));
    rt(
      bo.isOpen
        ? {
            ...bo,
            highlight: (min + ao + Ao) % Math.max(1, Ao),
          }
        : {
            ...bo,
            isOpen: true,
          },
    );
  }
  function so() {
    let ao = Dt(focusIndexNow());
    if (ao === null) return;
    let co = fieldKey(ao.plugin, ao.element);
    let bo = Xt(ao);
    let options = ao.options ?? [];
    let Bo = options[Math.min(bo.highlight, options.length - 1)];
    if (!bo.isOpen || Bo === undefined) {
      rt({
        ...bo,
        isOpen: true,
      });
      return;
    }
    ze((Ro) => new Map(Ro).set(co, Bo.value));
    rt({
      ...bo,
      isOpen: false,
    });
    selectFromTerminal({
      plugin: ao.plugin,
      handle: ao.handle,
      element: ao.element,
      component,
      value: Bo.value,
    }).then((Ro) =>
      ze((Ho) => (Ro !== undefined && Ho.get(co) === Bo.value ? new Map(Ho).set(co, Ro.value) : Ho)),
    );
  }
  function po(ao, lowerCase) {
    let bo = Xt(ao);
    let options = ao.options ?? [];
    let Bo = options.length;
    let Ro = bo.isOpen ? Math.min(bo.highlight, Bo - 1) : -1;
    let found = options
      .map((option, Wo) => (Ro + 1 + Wo) % Bo)
      .find((Io) => {
        let Wo = options[Io];
        return Wo !== undefined && optionText(Wo).toLowerCase().startsWith(lowerCase);
      });
    if (found !== undefined)
      rt({
        ...bo,
        highlight: found,
        isOpen: true,
      });
  }
  return {
    fields,
    handlers: selectHandlers({
      move: io,
      press: so,
    }),
    intercept(ao, key) {
      let bo = Dt(focusIndexNow());
      let Ao = key.ctrl && ao === "c";
      let Bo = isTypedText(ao, key) && [...ao].length === 1;
      if (bo === null || (Ao && working)) return false;
      let Ro = Xt(bo);
      if (Ao && Ro.isOpen) {
        rt({
          ...Ro,
          isOpen: false,
        });
        return true;
      }
      if (Ao) {
        setFocusIndex(() => null);
        return true;
      }
      if (Bo) po(bo, ao.toLowerCase());
      return Bo;
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
  let Be = Se(ContextSlotA);
  let [He, We, ze] = useLatestState(null);
  let Xe = ce(() => {
    let qn = ze();
    return typeof qn === "number" ? qn : null;
  }, [ze]);
  let clickOutside = useClickOutside(ce(() => We(null), []));
  let kt = R(null);
  let At = R(null);
  let It = R(null);
  let Ot = R(0);
  let Et = R([]);
  let Dt = useMeasured(() => {
    let qn = Be === null ? null : Be();
    let ps = settledBudget.get();
    let xs = qn === null || (clickOutside.current === null && ps !== undefined);
    if (Be === null) return rows;
    return xs
      ? (ps ?? rows)
      : Math.max(
          0,
          Math.min(
            rows,
            (clickOutside.current === null ? 0 : measureElement(clickOutside.current).height) + qn,
          ),
        );
  });
  let Lt = useMeasured(() => (kt.current === null ? 0 : measureElement(kt.current).height) - Ot.current);
  let [oo, Xt] = y(Dt);
  let [io, so] = y(0);
  let po = useDebouncedCallback((qn) => {
    settledBudget.set(qn);
    Xt(qn);
  }, HEIGHT_SETTLE_MS);
  P(() => (Dt === oo ? po.cancel() : po(Dt)), [Dt, oo, po]);
  let ao = He !== null;
  let { windowRows, hasCue, maxOffset, bodyRows } = bandWindow({
    budget: Dt,
    settledBudget: oo,
    treeRows: Lt,
  });
  let Ro = PaneBody({
    component: "AbovePrompt",
    requestId: ABOVE_PROMPT,
    owner: undefined,
    bodyRows: windowRows,
    contentRows: Lt,
    maxOffset,
    content: kt,
  });
  let { offset, placed, place } = Ro;
  let mn = wheelScrollRows(Ro, toLocalPoint(At));
  let viewedAgentIdProps = useViewedAgentIdProps();
  let No = useRenderDrawing(
    withScrollOffset(
      useRenderInput(
        "AbovePrompt",
        () => ({
          requestId: ABOVE_PROMPT,
          props: {
            hasSurvey: survey,
            isWorking: working,
            maxRows: oo,
            bodyColumns: max,
            scroll: {
              offset: 0,
              bodyRows,
            },
            view: viewedAgentIdProps,
          },
        }),
        [survey, working, oo, max, bodyRows, viewedAgentIdProps],
      ),
      Ro,
    ),
    () => null,
  );
  let [vo, Yo] = y(renderBurstSlot.get() === true);
  let { drawn, hasThrown } = No;
  let bn = drawn !== undefined && (typeof drawn === "string" || drawn.type !== "engine");
  let Go = vo ? undefined : drawn;
  let hn = hotkeysOf(Go);
  let hotkeySeats = useHotkeySeats();
  let Xo = Q(() => collectSurfaceHandles(Go), [Go]);
  let Sn = typeof He === "number" ? He : null;
  let $n = Sn === null ? null : (Xo[Sn] ?? null);
  let value = Q(
    () =>
      $n === null
        ? null
        : {
            plugin: $n.plugin,
            handle: $n.handle,
          },
    [$n],
  );
  let tag = $n === null ? null : $n.tag;
  let value_2 = Q(
    () => (qn) => {
      if (qn !== null)
        It.current = {
          node: qn,
          index: Sn,
        };
    },
    [Sn],
  );
  let Dn = () => ({
    held: It.current,
    index: Sn,
    content: kt.current,
  });
  let wn = useMeasured(() => heldRowOffset(Dn(), "top"));
  let mr = useMeasured(() => heldRowOffset(Dn(), "bottom"));
  let setFocusIndex = ce((qn) => We((ps) => qn(typeof ps === "number" ? ps : null)), []);
  let Wn = ce((qn) => {
    We(qn);
    so((ps) => ps + 1);
  }, []);
  let Fr = entryIndex(Xo);
  let Zn = uiFocusForPlugin({
    component: "AbovePrompt",
    requestId: ABOVE_PROMPT,
    owner: undefined,
    focusables: Xo,
    isHeld: ao,
    isHeldNow: ce(() => ze() !== null, [ze]),
    indexNow: Xe,
    isEmptyNow: ce(() => ze() === "band", [ze]),
    land: Wn,
  });
  let Un = ce(
    (qn) => {
      let ps = ze() === null;
      if (ps) We("band");
      Zn.act(() => {
        let xs = qn(ps);
        if (typeof xs === "number")
          Zn.moveByPerson({
            index: xs,
            apply: () => Wn(xs),
          });
        else {
          We((kr) => xs ?? kr);
          so((kr) => kr + 1);
        }
      });
    },
    [Zn, Wn],
  );
  let inputFields = useInputFields(Xo, "AbovePrompt", ABOVE_PROMPT);
  let or = AbovePromptSelect({
    focusables: Xo,
    focusIndex: Sn,
    focusIndexNow: Xe,
    setFocusIndex,
    working,
    component: "AbovePrompt",
    requestId: ABOVE_PROMPT,
  });
  let open = or.fields.open;
  let Qn = $n?.options?.length ?? 0;
  let ur = cachedHighlight(open, Qn);
  zt(() => {
    Ot.current = cachedHighlight(open, Qn);
  }, [open, Qn]);
  let shortDraftValue = useShortDraftValue();
  let Pr = sessionStore();
  let ts = useStoreSelector(paneRegistry(), (qn) => qn.focusedId);
  let Gn = useStoreSelector(paneRegistry(), (qn) => qn.focusRequest);
  let hasAutoDialog = useHasAutoDialog();
  let shortcut = useShortcutDisplay_2("abovePrompt:toggle", "Chat", "ctrl+x ctrl+a");
  let wr = !survey && (Xo.length > 0 || hasCue);
  let zr = wr && !hasAutoDialog;
  let _r = nextBandFocus({
    focus: null,
    count: Xo.length,
  });
  let fr = ce(
    (qn) => {
      if (!zr) return;
      focusPane(null);
      let ps = qn ?? (ze() === null ? Fr : null);
      if (ps === null) return We((xs) => xs ?? _r);
      return Un(() => ps);
    },
    [zr, _r, Fr, Un],
  );
  let value_3 = useClickedPress(Xo, fr);
  function Yr(qn) {
    renderBurstSlot.set(qn);
    Yo(qn);
    We(null);
  }
  useReleaseGoneHold(
    Sn,
    Xo.length,
    ce(() => We("band"), []),
  );
  let Er = ce(() => {
    We(null);
    focusPane(null);
  }, []);
  useReleaseOnEdit(Pr, He ?? ts, Er);
  P(Er, [survey, Er]);
  P(() => {
    if (!wr) We(null);
  }, [wr]);
  P(() => {
    if (ts !== null) We(null);
  }, [ts]);
  let Vr = useStoreSelector(focusStore, (qn) => qn.focusedId);
  P(() => {
    if (Vr !== null) We(null);
  }, [Vr]);
  P(() => {
    if (ao) setFocusedClient(null);
  }, [ao]);
  P(() => {
    let qn = !vo && Lt > 0;
    if (!bn) place(() => 0);
    else if (qn && placed > maxOffset) place(() => maxOffset);
  }, [bn, vo, Lt, placed, maxOffset, place]);
  P(() => {
    if (isOtherDrawer(Et.current, Xo)) {
      place(() => 0);
      We(null);
    }
    Et.current = Xo;
  }, [Xo, place]);
  P(() => {
    if (wn >= 0)
      place((offset) =>
        nearestScrollTop({
          offset,
          bodyRows: windowRows,
          top: wn,
          bottom: mr,
        }),
      );
  }, [wn, mr, windowRows, io, place]);
  P(() => {
    settleFocusRequest(false);
    return () => settleFocusRequest(false);
  }, []);
  P(() => {
    let state = paneRegistry().getState();
    if (state.focusRequest === null) return;
    settleFocusRequest(
      shortDraftValue === "" &&
        !survey &&
        !hasAutoDialog &&
        He === null &&
        state.focusedId === null &&
        state.placements > 0,
    );
  }, [Gn, shortDraftValue, survey, hasAutoDialog, He]);
  useKeybinding(
    "abovePrompt:toggle",
    () => {
      if (!bn) return false;
      Yr(!vo);
    },
    {
      context: "Chat",
    },
  );
  useKeybinding(
    "abovePrompt:focus",
    () => {
      let state = paneRegistry().getState();
      let ps = nextBandFocus({
        focus: ze(),
        count: Xo.length,
      });
      let xs = wr && state.focusedId === null && ps !== null;
      let kr = (ls, Ms) => (ls && typeof Ms === "number" ? (Fr ?? Ms) : Ms);
      if (state.focusedId !== null) focusPane(nextPaneId(state));
      else if (xs)
        Un((ls) =>
          kr(
            ls,
            nextBandFocus({
              focus: ze(),
              count: Xo.length,
            }),
          ),
        );
      else if (state.open.length > 0) {
        We(null);
        focusPane(nextPaneId(state));
      } else if (wr) Un((ls) => kr(ls, _r));
      else return false;
    },
    {
      context: "Chat",
    },
  );
  let ms = tag === "Input";
  let Xs = tag === "Select";
  let isActive = ao && !ms && !Xs;
  useRegisterKeybindingContext("AbovePrompt", isActive);
  useRegisterKeybindingContext("AbovePromptInput", ms);
  useRegisterKeybindingContext("AbovePromptSelect", Xs);
  useRegisterOverlay("above-prompt-input", ms);
  useRegisterOverlay("above-prompt-select", Xs);
  let is = wrapActHandlers(
    Zn,
    ringHandlers({
      focusables: Xo,
      focusIndexNow: Xe,
      focusByPerson: (qn) =>
        Zn.moveByPerson({
          index: qn,
          apply: () => Wn(qn),
        }),
      leave: () => {
        Zn.forget();
        We(null);
      },
      submit: inputFields.submit,
    }),
    ["abovePrompt:leave"],
  );
  let ws = bandKeys(is, Ro, hasCue);
  P(() => {
    inputFields.ringStep.current = (qn) => is[`abovePrompt:${qn}`]?.();
  });
  let Ci = {
    ...is,
    ...or.handlers,
  };
  function oi() {
    let qn = ze() !== null;
    let ps = pickOrNull(Xo, Xe());
    return qn ? fieldContext(ps, "AbovePrompt") : null;
  }
  MessageActionsKeybindings(ws, {
    context: "AbovePrompt",
    isActive,
  });
  MessageActionsKeybindings(is, {
    context: "AbovePromptInput",
    isActive: ms,
  });
  MessageActionsKeybindings(Ci, {
    context: "AbovePromptSelect",
    isActive: Xs,
  });
  usePaneKeyRouting({
    isAhead: () => ze() !== He,
    contextNow: oi,
    focusedNow: () => pickOrNull(Xo, Xe()),
    contextRendered: () => (He === null ? null : fieldContext($n, "AbovePrompt")),
    focusedRendered: () => $n,
    handlers: {
      AbovePrompt: ws,
      AbovePromptInput: is,
      AbovePromptSelect: Ci,
    },
    inputs: inputFields,
    selectKeys: or.intercept,
  });
  usePreDispatchKeyHandler(or.intercept, {
    isActive: Xs,
  });
  useHotkeyPresses(hn, isActive);
  let Oi = hn.size > 0;
  zt(() => {
    onHoldsBandChange?.(Oi && !hasThrown(drawn));
  }, [Oi, hasThrown, drawn, onHoldsBandChange]);
  zt(() => () => onHoldsBandChange?.(false), [onHoldsBandChange]);
  let Hi = (qn) =>
    isHotkeyShown(
      {
        hasCue,
        content: kt.current,
        offset,
        windowRows,
      },
      hotkeySeats.seatsOf(qn),
    );
  useDigitHotkeys({
    inputValue: shortDraftValue,
    enabled: !survey && hn.size > 0,
    enterConfirms: false,
    isValidDigit: (qn) => /^[0-9]$/.test(qn) && hn.has(qn) && Hi(qn),
    onDigit: (qn) =>
      pressShownDigit(
        hn.get(qn),
        () => Hi(qn),
        () => setInputValue(""),
      ),
  });
  let Zi = vo && bn;
  let da = hasCue && !hasAutoDialog;
  return jsxProd_default(FocusedPress, {
    value,
    children: jsxProd_default(FocusedNode, {
      value: value_2,
      children: jsxProd_default(ClickedPress, {
        value: value_3,
        children: jsxProd_default(InputFields, {
          value: inputFields.fields,
          children: jsxProd_default(SelectFields, {
            value: or.fields,
            children: jsxProd_default(HotkeySeat, {
              value: hotkeySeats.reportSeat,
              children: jsxProd_default_2(Box, {
                ref: clickOutside,
                flexDirection: "column",
                flexShrink: 0,
                maxHeight: Dt + ur,
                overflowY: "hidden",
                onWheel: da ? mn : undefined,
                children: [
                  Zi
                    ? jsxProd_default(CollapsedHint, {
                        shortcut,
                        onExpand: () => Yr(false),
                      })
                    : jsxProd_default(Box, {
                        ref: At,
                        flexDirection: "column",
                        flexShrink: 0,
                        maxHeight: windowRows + ur,
                        overflowY: "hidden",
                        onClick: focusClick(() => fr(null)),
                        children: jsxProd_default(PaneContent, {
                          content: kt,
                          offset,
                          columns: max,
                          rows: bodyRows,
                          keptColumns: COLLAPSE_HANDLE_COLUMNS,
                          children: No.node,
                        }),
                      }),
                  hasCue &&
                    jsxProd_default(OverflowCue, {
                      above: offset,
                      below: maxOffset - offset,
                    }),
                  !vo &&
                    bn &&
                    jsxProd_default(CollapseHandle, {
                      onCollapse: () => Yr(true),
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
