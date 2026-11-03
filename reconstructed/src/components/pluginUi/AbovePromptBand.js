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
import { Fyn } from "../../plugins/functionHooks/ui/renderInstances.js";
import {
  H_n,
  bumpPaneRender,
  N_n,
  VKt,
  $_n,
  KKt,
  tkt,
  ul,
  focusPane,
  settleFocusRequest,
  j4o,
} from "../../plugins/functionHooks/panes.js";
import { bRe, uiFocusForPlugin, f9s } from "../../plugins/functionHooks/uiApi.js";
import { collectSurfaceHandles } from "../../plugins/functionHooks/sessionEvents.js";
import { cachedHighlight } from "../HighlightedCode/Fallback.js";
import { getUniqueTags } from "../LogSelector.js";
import { useClickOutside, HotkeySeat } from "./render/MarkdownBlock.js";
import { useAppState } from "../../state/AppState.js";
import { getViewedTeammateTask } from "../../state/selectors.js";
import { Q, j, R, ce, y, P, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import {
  paneScrollHandlers,
  PaneBody,
  l1e,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
} from "./PaneBody.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { actionKeysNamespace, pressFromTerminal, ClickedPress } from "./render/actionKeys.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Button } from "../../ink/components/ErrorBoundary.js";
import { topWithin, measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
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
import { useShortDraftValue, op } from "../../screens/repl/storeHooks.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useHasAutoDialog } from "../../state/dialogQueue.js";
import { useShortcutDisplay as useShortcutDisplay_2 } from "../../keybindings/useShortcutDisplay.js";
import { HTe, Qrn } from "../../plugins/functionHooks/surfaceClients.js";
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
  bandCollapsed: () => Fyn,
  bandKeys: () => bandKeys,
  bandWindow: () => bandWindow,
  default: () => AbovePromptBandNamespace,
  entryIndex: () => entryIndex,
  fieldContext: () => fieldContext,
  fieldTexts: () => H_n,
  focusableAt: () => bRe,
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
  pickedValues: () => N_n,
  pressShownDigit: () => pressShownDigit,
  ringHandlers: () => ringHandlers,
  selectHandlers: () => selectHandlers,
  settledBudget: () => settledBudget,
  siteGeneration: () => VKt,
  siteGenerations: () => $_n,
  siteKey: () => KKt,
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
  withoutKeys: () => tkt,
});
//@ chunk-18hwfzwa.js:481499-481570 placement
function sY() {
  let h = useAppState(getViewedTeammateTask);
  return Q(() => (h === void 0 ? {} : { agentId: h }), [h]);
}
//@ chunk-18hwfzwa.js:481570-481697 placement
var bandKeys = (h, x, D) => ({
  ...h,
  ...paneScrollHandlers(x),
  ...(!D && { "pane:scrollUp": h["abovePrompt:previous"], "pane:scrollDown": h["abovePrompt:next"] }),
});
//@ chunk-18hwfzwa.js:481697-481891 placement
function bandWindow(h) {
  let { budget: budget, settledBudget: settledBudget, treeRows: treeRows } = h,
    max = Math.max(0, budget),
    ke = treeRows > max,
    Re = ke ? Math.max(0, max - 1) : max;
  return {
    windowRows: Re,
    hasCue: ke,
    maxOffset: Math.max(0, treeRows - Re),
    bodyRows: Math.max(0, settledBudget - 1),
  };
}
//@ chunk-18hwfzwa.js:481891-481895 placement
j();
//@ chunk-18hwfzwa.js:481895-482360 placement
function DimButton(h) {
  let $ = w(7),
    { label: label, onAction: onAction, isHeld: isHeld } = h,
    ee = R(null),
    Re;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((Re = () => actionKeysNamespace.releaseInkFocus(ee.current)), ($[0] = Re));
  else Re = $[0];
  let Be;
  if ($[1] !== isHeld || $[2] !== label)
    ((Be = (He) => {
      let We = He.hovered || isHeld === !0;
      return e(Text, { dimColor: !We, inverse: We, children: label });
    }),
      ($[1] = isHeld),
      ($[2] = label),
      ($[3] = Be));
  else Be = $[3];
  let ze;
  if ($[4] !== onAction || $[5] !== Be)
    ((ze = e(Box, {
      ref: ee,
      onClick: Re,
      children: e(Button, { tabIndex: -1, onAction: onAction, children: Be }),
    })),
      ($[4] = onAction),
      ($[5] = Be),
      ($[6] = ze));
  else ze = $[6];
  return ze;
}
//@ chunk-18hwfzwa.js:482360-482369 placement
var MARK_EDGE_COLUMNS = 1;
//@ chunk-18hwfzwa.js:482369-482561 placement
var CollapseHandle = (h) => {
  let x = w(2),
    D;
  if (x[0] !== h.onCollapse)
    ((D = e(Box, {
      position: "absolute",
      top: 0,
      right: MARK_EDGE_COLUMNS,
      children: e(DimButton, { label: "[-]", onAction: h.onCollapse }),
    })),
      (x[0] = h.onCollapse),
      (x[1] = D));
  else D = x[1];
  return D;
};
//@ chunk-18hwfzwa.js:482561-482571 placement
var COLLAPSE_HANDLE_COLUMNS = 5;
//@ chunk-18hwfzwa.js:482571-482974 placement
var CollapsedHint = (h) => {
  let x = w(5),
    D;
  if (x[0] !== h.shortcut)
    ((D = (L) =>
      e(Text, {
        dimColor: !0,
        inverse: L.hovered,
        wrap: "truncate-end",
        children: `\u25B8 plugin panel hidden \xB7 ${h.shortcut} or click to show`,
      })),
      (x[0] = h.shortcut),
      (x[1] = D));
  else D = x[1];
  let ee;
  if (x[2] !== h.onExpand || x[3] !== D)
    ((ee = e(Button, {
      tabIndex: -1,
      flexShrink: 0,
      alignSelf: "flex-start",
      onAction: h.onExpand,
      children: D,
    })),
      (x[2] = h.onExpand),
      (x[3] = D),
      (x[4] = ee));
  else ee = x[4];
  return ee;
};
//@ chunk-18hwfzwa.js:482974-483071 placement
function entryIndex(h) {
  let x = h.length === 0,
    index = h.findIndex((L) => L.isAutoFocus);
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
      let { hotkey: hotkey } = L.props;
      if (hotkey !== void 0) x.set(hotkey, L.press);
      return;
    }
    if (L.type !== "engine") for (let ee of L.children ?? []) D(ee);
  }
  if (h !== void 0) D(h);
  return x;
}
//@ chunk-18hwfzwa.js:483451-483696 placement
function isHotkeyShown(h, x) {
  let { hasCue: hasCue, content: content, offset: offset, windowRows: windowRows } = h;
  if (!hasCue) return !0;
  if (content === null || x === void 0 || x.size === 0) return !1;
  return [...x].every((Re) => {
    let Be = topWithin(Re, content),
      He = Re.yogaNode?.getComputedHeight() ?? 0;
    return He > 0 && Be >= offset && Be + He <= offset + windowRows;
  });
}
//@ chunk-18hwfzwa.js:483696-483782 placement
var isOtherDrawer = (h, x) =>
  h.length > 0 && x.length > 0 && !x.some((D) => h.some((L) => L.plugin === D.plugin));
//@ chunk-18hwfzwa.js:483782-483909 placement
function nextBandFocus(h) {
  let { focus: focus, count: count } = h,
    L = count > 0,
    ee = typeof focus === "number",
    ke = ee && focus + 1 < count ? focus + 1 : null;
  return ee ? ke : L ? 0 : focus === null ? "band" : null;
}
//@ chunk-18hwfzwa.js:483958-484061 placement
var overflowCueText = (h, x) =>
  [h > 0 ? `\u2191 ${h} more` : "", x > 0 ? `\u2193 ${x} more` : ""].filter((D) => D !== "").join(" \xB7 ");
//@ chunk-18hwfzwa.js:484061-484294 placement
var OverflowCue = (h) => {
  let x = w(5),
    D;
  if (x[0] !== h.above || x[1] !== h.below)
    ((D = overflowCueText(h.above, h.below)), (x[0] = h.above), (x[1] = h.below), (x[2] = D));
  else D = x[2];
  let L;
  if (x[3] !== D)
    ((L = e(Text, { dimColor: !0, wrap: "truncate-end", children: D })), (x[3] = D), (x[4] = L));
  else L = x[4];
  return L;
};
//@ chunk-18hwfzwa.js:484294-484344 placement
function pressShownDigit(h, x, D) {
  if (h !== void 0 && x()) (D(), pressFromTerminal(h));
}
//@ chunk-18hwfzwa.js:484344-484711 placement
function ringHandlers(h) {
  let {
      focusables: focusables,
      focusIndexNow: focusIndexNow,
      focusByPerson: focusByPerson,
      submit: submit,
    } = h,
    ke = focusables.length;
  return {
    "abovePrompt:next": () => {
      if (ke > 0) focusByPerson(((focusIndexNow() ?? -1) + 1) % ke);
    },
    "abovePrompt:previous": () => {
      if (ke > 0) focusByPerson(((focusIndexNow() ?? 0) - 1 + ke) % ke);
    },
    "abovePrompt:press": () => {
      let Re = focusIndexNow(),
        Be = Re === null ? null : (focusables[Re] ?? null);
      if (Be?.tag === "Button") pressFromTerminal(Be);
      else if (Be?.tag === "Input") submit(Be);
    },
    "abovePrompt:leave": h.leave,
  };
}
//@ chunk-18hwfzwa.js:484711-484746 placement
var settledBudget = ge(to(), (h) => h.set(void 0));
//@ chunk-18hwfzwa.js:484746-484750 placement
j();
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
var isTypedText = (h, x) =>
  !x.ctrl && !x.meta && !x.super && !x.escape && !x.tab && !x.return && /^[^\p{C}\p{Z}]+$/u.test(h);
//@ chunk-18hwfzwa.js:484962-485124 placement
function hotkeyPresses(h, x, D) {
  let L = isTypedText(h, x) ? [...h.normalize("NFKC").toLowerCase()].map((ke) => D.get(ke)) : [],
    filtered = L.filter((ke) => ke !== void 0);
  return filtered.length === L.length ? filtered : [];
}
//@ chunk-18hwfzwa.js:485124-485239 placement
var useHotkeyPresses = (h, x) =>
  usePreDispatchKeyHandler(
    (D, L, ee) => {
      let Re = hotkeyPresses(D === "" ? ee : D, L, h);
      for (let Be of Re) pressFromTerminal(Be);
      return Re.length > 0;
    },
    { isActive: x },
  );
//@ chunk-18hwfzwa.js:485239-485243 placement
j();
//@ chunk-18hwfzwa.js:485243-485431 placement
function useHotkeySeats() {
  let h = R(new Map());
  return Q(
    () => ({
      reportSeat: (x, D) => {
        let L = h.current.get(x) ?? new Set();
        return (
          L.add(D),
          h.current.set(x, L),
          () => {
            L.delete(D);
          }
        );
      },
      seatsOf: (x) => h.current.get(x),
    }),
    [],
  );
}
//@ chunk-18hwfzwa.js:485431-485435 placement
j();
//@ chunk-18hwfzwa.js:485435-485439 placement
j();
//@ chunk-18hwfzwa.js:485686-485690 placement
j();
//@ chunk-18hwfzwa.js:485690-485874 placement
function useSiteFields(h, x, D) {
  let L = KKt(x, D),
    [ee] = y(() => VKt(x, D)),
    ke = y(() => h.get()?.get(L) ?? new Map()),
    [Re] = ke;
  return (
    P(() => {
      if (VKt(x, D) === ee) h.set(new Map(h.get()).set(L, Re));
    }, [h, x, D, ee, L, Re]),
    ke
  );
}
//@ chunk-18hwfzwa.js:485874-486820 placement
function useInputFields(h, x, D) {
  let [L, ee] = useSiteFields(H_n, x, D),
    ke = R(new Map(L)),
    Re = R(new Set());
  getUniqueTags(h, "Input", (We) => {
    for (let ze of We) ke.current.delete(ze);
    ee((ze) => tkt(ze, We));
  });
  let Be = R(() => {
    return;
  });
  return {
    fields: Q(
      () => ({
        textOf: (We, ze) => L.get(fieldKey(We, ze)),
        edit({ plugin: We, handle: ze, element: Xe }, rt) {
          let kt = fieldKey(We, Xe);
          (ke.current.set(kt, rt),
            ee((At) => new Map(At).set(kt, rt)),
            inputFromTerminal({
              plugin: We,
              handle: ze,
              element: Xe,
              component: x,
              kind: "change",
              value: rt,
            }));
        },
        step: (We) => Be.current(We),
      }),
      [L, x],
    ),
    ringStep: Be,
    textNow: ({ plugin: plugin, element: element, value: Xe }) => {
      let rt = fieldKey(plugin, element);
      return ke.current.get(rt) ?? L.get(rt) ?? Xe ?? "";
    },
    submit({ plugin: We, handle: ze, element: Xe, value: rt }) {
      let kt = fieldKey(We, Xe),
        At = ke.current.get(kt) ?? L.get(kt) ?? rt ?? "";
      if (Re.current.has(kt)) return;
      (Re.current.add(kt),
        inputFromTerminal({
          plugin: We,
          handle: ze,
          element: Xe,
          component: x,
          kind: "submit",
          value: At,
        }).then((It) => {
          if ((Re.current.delete(kt), It !== void 0 && (ke.current.get(kt) ?? At) === At))
            (ke.current.set(kt, ""), ee((Et) => new Map(Et).set(kt, "")));
        }));
    },
  };
}
//@ chunk-18hwfzwa.js:486820-487023 layout
var isTextEditingKey = (h, x) =>
  x.leftArrow ||
  x.rightArrow ||
  x.upArrow ||
  x.downArrow ||
  x.home ||
  x.end ||
  x.delete ||
  x.pageUp ||
  x.pageDown ||
  (h.length === 1 && x.ctrl && "abdefhknpuwy".includes(h)) ||
  (h.length === 1 && x.meta && "bdfy".includes(h));
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
/**
 * 面板按键路由：按当前上下文匹配键绑定并转发。
 */
//@ chunk-18hwfzwa.js:487110-487945 layout
function usePaneKeyRouting(h) {
  let x = useKeybindingContext();
  usePreDispatchKeyHandler((D, L, ee) => {
    let contextNow = h.contextNow();
    if (x === null || contextNow === null) return !1;
    if (L.wheelUp || L.wheelDown) return !1;
    if (!h.isAhead()) return !1;
    let resolved = x.resolve(D, L, [contextNow]);
    if (resolved.type === "match") {
      let kt = h.handlers[contextNow]?.[resolved.action];
      if (kt !== void 0) return (kt(), !0);
    }
    let focusedNow = h.focusedNow();
    if (focusedNow?.tag === "Select" && h.selectKeys(D, L)) return !0;
    if (x.resolve(D, L, ["Global"]).type === "match") return !1;
    let He = D === "" ? ee : D;
    if (focusedNow?.tag === "Input") {
      let textNow = h.inputs.textNow(focusedNow);
      if (L.backspace) return (h.inputs.fields.edit(focusedNow, [...textNow].slice(0, -1).join("")), !0);
      if (isPlainTypedInput(He, L)) return (h.inputs.fields.edit(focusedNow, textNow + He), !0);
      if (isTextEditingKey(D, L)) return !0;
    }
    let contextRendered = h.contextRendered();
    if (contextRendered === null) return !1;
    let resolved_2 = x.resolve(D, L, [contextRendered]),
      Xe = resolved_2.type === "match" && h.handlers[contextRendered]?.[resolved_2.action] !== void 0,
      rt = L.backspace || isPlainTypedInput(He, L) || isTextEditingKey(D, L);
    return Xe || (h.focusedRendered()?.tag === "Input" && rt);
  });
}
//@ chunk-18hwfzwa.js:487945-487949 placement
j();
//@ chunk-18hwfzwa.js:487949-488004 placement
var useReleaseGoneHold = (h, x, D) =>
  P(() => {
    if (h !== null && h >= x) D();
  }, [h, x, D]);
//@ chunk-18hwfzwa.js:488004-488008 placement
j();
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
j();
//@ chunk-18hwfzwa.js:488310-490409 placement
function AbovePromptSelect(h) {
  let {
      focusables: focusables,
      focusIndex: focusIndex,
      focusIndexNow: focusIndexNow,
      setFocusIndex: setFocusIndex,
      working: working,
      component: component,
      requestId: requestId,
    } = h,
    He = Dt(focusIndex),
    [We, ze] = useSiteFields(N_n, component, requestId),
    [Xe, rt, kt] = useLatestState(() => oo(null));
  if ((getUniqueTags(focusables, "Select", (ao) => ze((co) => tkt(co, ao))), Xe.key !== Lt(He))) rt(oo(He));
  let At = He?.options?.length ?? 0,
    It = He !== null && Xe.isOpen,
    min = Math.min(Xe.highlight, Math.max(0, At - 1)),
    Et = Q(
      () => ({
        pickedOf: (ao, co) => We.get(fieldKey(ao, co)),
        open: It ? { plugin: He.plugin, handle: He.handle, highlight: min } : null,
      }),
      [We, He, It, min],
    );
  function Dt(ao) {
    let co = bRe(focusables, ao);
    return co?.tag === "Select" ? co : null;
  }
  function Lt(ao) {
    return ao === null ? null : fieldKey(ao.plugin, ao.element);
  }
  function oo(ao) {
    let co = Lt(ao),
      bo = co === null ? void 0 : (We.get(co) ?? ao?.value);
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
    return (rt(bo), bo);
  }
  function io(ao) {
    let co = Dt(focusIndexNow());
    if (co === null) return;
    let bo = Xt(co),
      Ao = co.options?.length ?? 0,
      min = Math.min(bo.highlight, Math.max(0, Ao - 1));
    rt(bo.isOpen ? { ...bo, highlight: (min + ao + Ao) % Math.max(1, Ao) } : { ...bo, isOpen: !0 });
  }
  function so() {
    let ao = Dt(focusIndexNow());
    if (ao === null) return;
    let co = fieldKey(ao.plugin, ao.element),
      bo = Xt(ao),
      Ao = ao.options ?? [],
      Bo = Ao[Math.min(bo.highlight, Ao.length - 1)];
    if (!bo.isOpen || Bo === void 0) {
      rt({ ...bo, isOpen: !0 });
      return;
    }
    (ze((Ro) => new Map(Ro).set(co, Bo.value)),
      rt({ ...bo, isOpen: !1 }),
      selectFromTerminal({
        plugin: ao.plugin,
        handle: ao.handle,
        element: ao.element,
        component: component,
        value: Bo.value,
      }).then((Ro) =>
        ze((Ho) => (Ro !== void 0 && Ho.get(co) === Bo.value ? new Map(Ho).set(co, Ro.value) : Ho)),
      ));
  }
  function po(ao, co) {
    let bo = Xt(ao),
      Ao = ao.options ?? [],
      Bo = Ao.length,
      Ro = bo.isOpen ? Math.min(bo.highlight, Bo - 1) : -1,
      found = Ao.map((Io, Wo) => (Ro + 1 + Wo) % Bo).find((Io) => {
        let Wo = Ao[Io];
        return Wo !== void 0 && optionText(Wo).toLowerCase().startsWith(co);
      });
    if (found !== void 0) rt({ ...bo, highlight: found, isOpen: !0 });
  }
  return {
    fields: Et,
    handlers: selectHandlers({ move: io, press: so }),
    intercept(ao, co) {
      let bo = Dt(focusIndexNow()),
        Ao = co.ctrl && ao === "c",
        Bo = isTypedText(ao, co) && [...ao].length === 1;
      if (bo === null || (Ao && working)) return !1;
      let Ro = Xt(bo);
      if (Ao && Ro.isOpen) return (rt({ ...Ro, isOpen: !1 }), !0);
      if (Ao) return (setFocusIndex(() => null), !0);
      if (Bo) po(bo, ao.toLowerCase());
      return Bo;
    },
  };
}
/**
 * AbovePromptBandView：插件在输入框上方的横幅带视图。
 */
//@ chunk-18hwfzwa.js:490409-496344 placement
function AbovePromptBandView({
  survey: survey,
  working: working,
  setInputValue: setInputValue,
  onHoldsBandChange: onHoldsBandChange,
}) {
  let { rows: rows, columns: columns } = useTerminalSize(),
    max = Math.max(0, columns - COLLAPSE_HANDLE_COLUMNS),
    Be = Se(ContextSlotA),
    [He, We, ze] = useLatestState(null),
    Xe = ce(() => {
      let qn = ze();
      return typeof qn === "number" ? qn : null;
    }, [ze]),
    rt = useClickOutside(ce(() => We(null), [])),
    kt = R(null),
    At = R(null),
    It = R(null),
    Ot = R(0),
    Et = R([]),
    Dt = useMeasured(() => {
      let qn = Be === null ? null : Be(),
        ps = settledBudget.get(),
        xs = qn === null || (rt.current === null && ps !== void 0);
      if (Be === null) return rows;
      return xs
        ? (ps ?? rows)
        : Math.max(0, Math.min(rows, (rt.current === null ? 0 : measureElement(rt.current).height) + qn));
    }),
    Lt = useMeasured(() => (kt.current === null ? 0 : measureElement(kt.current).height) - Ot.current),
    [oo, Xt] = y(Dt),
    [io, so] = y(0),
    po = useDebouncedCallback((qn) => {
      (settledBudget.set(qn), Xt(qn));
    }, HEIGHT_SETTLE_MS);
  P(() => (Dt === oo ? po.cancel() : po(Dt)), [Dt, oo, po]);
  let ao = He !== null,
    {
      windowRows: windowRows,
      hasCue: hasCue,
      maxOffset: maxOffset,
      bodyRows: bodyRows,
    } = bandWindow({ budget: Dt, settledBudget: oo, treeRows: Lt }),
    Ro = PaneBody({
      component: "AbovePrompt",
      requestId: ABOVE_PROMPT,
      owner: void 0,
      bodyRows: windowRows,
      contentRows: Lt,
      maxOffset: maxOffset,
      content: kt,
    }),
    { offset: offset, placed: placed, place: place } = Ro,
    mn = l1e(Ro, toLocalPoint(At)),
    Cn = sY(),
    No = useRenderDrawing(
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
              scroll: { offset: 0, bodyRows: bodyRows },
              view: Cn,
            },
          }),
          [survey, working, oo, max, bodyRows, Cn],
        ),
        Ro,
      ),
      () => null,
    ),
    [vo, Yo] = y(Fyn.get() === !0),
    { drawn: drawn, hasThrown: hasThrown } = No,
    bn = drawn !== void 0 && (typeof drawn === "string" || drawn.type !== "engine"),
    Go = vo ? void 0 : drawn,
    hn = hotkeysOf(Go),
    Mn = useHotkeySeats(),
    Xo = Q(() => collectSurfaceHandles(Go), [Go]),
    Sn = typeof He === "number" ? He : null,
    $n = Sn === null ? null : (Xo[Sn] ?? null),
    on = Q(() => ($n === null ? null : { plugin: $n.plugin, handle: $n.handle }), [$n]),
    _o = $n === null ? null : $n.tag,
    cn = Q(
      () => (qn) => {
        if (qn !== null) It.current = { node: qn, index: Sn };
      },
      [Sn],
    ),
    Dn = () => ({ held: It.current, index: Sn, content: kt.current }),
    wn = useMeasured(() => heldRowOffset(Dn(), "top")),
    mr = useMeasured(() => heldRowOffset(Dn(), "bottom")),
    Kn = ce((qn) => We((ps) => qn(typeof ps === "number" ? ps : null)), []),
    Wn = ce((qn) => {
      (We(qn), so((ps) => ps + 1));
    }, []),
    Fr = entryIndex(Xo),
    Zn = uiFocusForPlugin({
      component: "AbovePrompt",
      requestId: ABOVE_PROMPT,
      owner: void 0,
      focusables: Xo,
      isHeld: ao,
      isHeldNow: ce(() => ze() !== null, [ze]),
      indexNow: Xe,
      isEmptyNow: ce(() => ze() === "band", [ze]),
      land: Wn,
    }),
    Un = ce(
      (qn) => {
        let ps = ze() === null;
        if (ps) We("band");
        Zn.act(() => {
          let xs = qn(ps);
          if (typeof xs === "number") Zn.moveByPerson({ index: xs, apply: () => Wn(xs) });
          else (We((kr) => xs ?? kr), so((kr) => kr + 1));
        });
      },
      [Zn, Wn],
    ),
    dr = useInputFields(Xo, "AbovePrompt", ABOVE_PROMPT),
    or = AbovePromptSelect({
      focusables: Xo,
      focusIndex: Sn,
      focusIndexNow: Xe,
      setFocusIndex: Kn,
      working: working,
      component: "AbovePrompt",
      requestId: ABOVE_PROMPT,
    }),
    open = or.fields.open,
    Qn = $n?.options?.length ?? 0,
    ur = cachedHighlight(open, Qn);
  zt(() => {
    Ot.current = cachedHighlight(open, Qn);
  }, [open, Qn]);
  let Ir = useShortDraftValue(),
    Pr = op(),
    ts = useStoreSelector(ul(), (qn) => qn.focusedId),
    Gn = useStoreSelector(ul(), (qn) => qn.focusRequest),
    Ur = useHasAutoDialog(),
    Zr = useShortcutDisplay_2("abovePrompt:toggle", "Chat", "ctrl+x ctrl+a"),
    wr = !survey && (Xo.length > 0 || hasCue),
    zr = wr && !Ur,
    _r = nextBandFocus({ focus: null, count: Xo.length }),
    fr = ce(
      (qn) => {
        if (!zr) return;
        focusPane(null);
        let ps = qn ?? (ze() === null ? Fr : null);
        if (ps === null) return We((xs) => xs ?? _r);
        return Un(() => ps);
      },
      [zr, _r, Fr, Un],
    ),
    $r = useClickedPress(Xo, fr);
  function Yr(qn) {
    (Fyn.set(qn), Yo(qn), We(null));
  }
  useReleaseGoneHold(
    Sn,
    Xo.length,
    ce(() => We("band"), []),
  );
  let Er = ce(() => {
    (We(null), focusPane(null));
  }, []);
  (useReleaseOnEdit(Pr, He ?? ts, Er),
    P(Er, [survey, Er]),
    P(() => {
      if (!wr) We(null);
    }, [wr]),
    P(() => {
      if (ts !== null) We(null);
    }, [ts]));
  let Vr = useStoreSelector(HTe, (qn) => qn.focusedId);
  (P(() => {
    if (Vr !== null) We(null);
  }, [Vr]),
    P(() => {
      if (ao) Qrn(null);
    }, [ao]),
    P(() => {
      let qn = !vo && Lt > 0;
      if (!bn) place(() => 0);
      else if (qn && placed > maxOffset) place(() => maxOffset);
    }, [bn, vo, Lt, placed, maxOffset, place]),
    P(() => {
      if (isOtherDrawer(Et.current, Xo)) (place(() => 0), We(null));
      Et.current = Xo;
    }, [Xo, place]),
    P(() => {
      if (wn >= 0) place((qn) => nearestScrollTop({ offset: qn, bodyRows: windowRows, top: wn, bottom: mr }));
    }, [wn, mr, windowRows, io, place]),
    P(() => (settleFocusRequest(!1), () => settleFocusRequest(!1)), []),
    P(() => {
      let state = ul().getState();
      if (state.focusRequest === null) return;
      settleFocusRequest(
        Ir === "" && !survey && !Ur && He === null && state.focusedId === null && state.placements > 0,
      );
    }, [Gn, Ir, survey, Ur, He]),
    useKeybinding(
      "abovePrompt:toggle",
      () => {
        if (!bn) return !1;
        Yr(!vo);
      },
      { context: "Chat" },
    ),
    useKeybinding(
      "abovePrompt:focus",
      () => {
        let state = ul().getState(),
          ps = nextBandFocus({ focus: ze(), count: Xo.length }),
          xs = wr && state.focusedId === null && ps !== null,
          kr = (ls, Ms) => (ls && typeof Ms === "number" ? (Fr ?? Ms) : Ms);
        if (state.focusedId !== null) focusPane(j4o(state));
        else if (xs) Un((ls) => kr(ls, nextBandFocus({ focus: ze(), count: Xo.length })));
        else if (state.open.length > 0) (We(null), focusPane(j4o(state)));
        else if (wr) Un((ls) => kr(ls, _r));
        else return !1;
      },
      { context: "Chat" },
    ));
  let ms = _o === "Input",
    Xs = _o === "Select",
    Ls = ao && !ms && !Xs;
  (useRegisterKeybindingContext("AbovePrompt", Ls),
    useRegisterKeybindingContext("AbovePromptInput", ms),
    useRegisterKeybindingContext("AbovePromptSelect", Xs),
    useRegisterOverlay("above-prompt-input", ms),
    useRegisterOverlay("above-prompt-select", Xs));
  let is = f9s(
      Zn,
      ringHandlers({
        focusables: Xo,
        focusIndexNow: Xe,
        focusByPerson: (qn) => Zn.moveByPerson({ index: qn, apply: () => Wn(qn) }),
        leave: () => {
          (Zn.forget(), We(null));
        },
        submit: dr.submit,
      }),
      ["abovePrompt:leave"],
    ),
    ws = bandKeys(is, Ro, hasCue);
  P(() => {
    dr.ringStep.current = (qn) => is[`abovePrompt:${qn}`]?.();
  });
  let Ci = { ...is, ...or.handlers };
  function oi() {
    let qn = ze() !== null,
      ps = bRe(Xo, Xe());
    return qn ? fieldContext(ps, "AbovePrompt") : null;
  }
  (MessageActionsKeybindings(ws, { context: "AbovePrompt", isActive: Ls }),
    MessageActionsKeybindings(is, { context: "AbovePromptInput", isActive: ms }),
    MessageActionsKeybindings(Ci, { context: "AbovePromptSelect", isActive: Xs }),
    usePaneKeyRouting({
      isAhead: () => ze() !== He,
      contextNow: oi,
      focusedNow: () => bRe(Xo, Xe()),
      contextRendered: () => (He === null ? null : fieldContext($n, "AbovePrompt")),
      focusedRendered: () => $n,
      handlers: { AbovePrompt: ws, AbovePromptInput: is, AbovePromptSelect: Ci },
      inputs: dr,
      selectKeys: or.intercept,
    }),
    usePreDispatchKeyHandler(or.intercept, { isActive: Xs }),
    useHotkeyPresses(hn, Ls));
  let Oi = hn.size > 0;
  (zt(() => {
    onHoldsBandChange?.(Oi && !hasThrown(drawn));
  }, [Oi, hasThrown, drawn, onHoldsBandChange]),
    zt(() => () => onHoldsBandChange?.(!1), [onHoldsBandChange]));
  let Hi = (qn) =>
    isHotkeyShown(
      { hasCue: hasCue, content: kt.current, offset: offset, windowRows: windowRows },
      Mn.seatsOf(qn),
    );
  useDigitHotkeys({
    inputValue: Ir,
    enabled: !survey && hn.size > 0,
    enterConfirms: !1,
    isValidDigit: (qn) => /^[0-9]$/.test(qn) && hn.has(qn) && Hi(qn),
    onDigit: (qn) =>
      pressShownDigit(
        hn.get(qn),
        () => Hi(qn),
        () => setInputValue(""),
      ),
  });
  let Zi = vo && bn,
    da = hasCue && !Ur;
  return e(FocusedPress, {
    value: on,
    children: e(FocusedNode, {
      value: cn,
      children: e(ClickedPress, {
        value: $r,
        children: e(InputFields, {
          value: dr.fields,
          children: e(SelectFields, {
            value: or.fields,
            children: e(HotkeySeat, {
              value: Mn.reportSeat,
              children: r(Box, {
                ref: rt,
                flexDirection: "column",
                flexShrink: 0,
                maxHeight: Dt + ur,
                overflowY: "hidden",
                onWheel: da ? mn : void 0,
                children: [
                  Zi
                    ? e(CollapsedHint, { shortcut: Zr, onExpand: () => Yr(!1) })
                    : e(Box, {
                        ref: At,
                        flexDirection: "column",
                        flexShrink: 0,
                        maxHeight: windowRows + ur,
                        overflowY: "hidden",
                        onClick: focusClick(() => fr(null)),
                        children: e(PaneContent, {
                          content: kt,
                          offset: offset,
                          columns: max,
                          rows: bodyRows,
                          keptColumns: COLLAPSE_HANDLE_COLUMNS,
                          children: No.node,
                        }),
                      }),
                  hasCue && e(OverflowCue, { above: offset, below: maxOffset - offset }),
                  !vo && bn && e(CollapseHandle, { onCollapse: () => Yr(!0) }),
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
  sY,
  hotkeysOf,
  useInputFields,
  AbovePromptSelect,
  useClickedPress,
  useReleaseGoneHold,
  fieldContext,
  usePaneKeyRouting,
  useHotkeyPresses,
};
