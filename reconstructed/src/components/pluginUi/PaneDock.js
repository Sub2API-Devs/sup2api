/**
 * components/pluginUi/PaneDock.tsx
 *
 * 2.1.316 新增。插件面板停靠区（多面板布局、焦点）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (86), chunk-agxr4brz.js (2)
 * attribution: placement 88
 */
import { Ar, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  BORDER_COLUMNS,
  BORDER_MARK_INSET,
  chromeRows,
  paneScrollHandlers,
  PaneBody,
  wheelScrollRows,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
} from "./PaneBody.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
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
} from "./AbovePromptBand.js";
import { HEAVY_MULTIPLICATION_X } from "../../constants/figures.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DIFF_SIDEBAR_MIN_COLUMNS } from "../../plugins/bundled/diff/index.js";
import { init_react_production, R, y, ce, P, yt, Q } from "../../../vendor/react/cjs/react.production.js";
import { identity } from "../../utils/identity.js";
import { createStore } from "../../state/store.js";
import { useHasAutoDialog, useHasOpenDialog as useHasOpenDialog_2 } from "../../state/dialogQueue.js";
import {
  shownPane,
  paneRegistry,
  validThemeName,
  resolvePaneColor,
  closePane,
  focusPane,
  showPane,
  cyclePaneId,
  askCountFor,
  EMPTY_PANES,
  holdsToasts,
} from "../../plugins/functionHooks/panes.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useSecondOverlayKeys, useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState, useAppStoreDirect, useSetAppState } from "../../state/AppState.js";
import { sessionStore } from "../../screens/repl/storeHooks.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useMeasured } from "../../ink/components/Input.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { useClickOutside } from "./render/MarkdownBlock.js";
import { useRenderDrawing, useRenderInput, SelectFields } from "./render/RenderInstance.js";
import { collectSurfaceHandles } from "../../plugins/functionHooks/sessionEvents.js";
import { uiFocusForPlugin, wrapActHandlers, pickOrNull } from "../../plugins/functionHooks/uiApi.js";
import { nearestScrollTop } from "../../plugins/functionHooks/uiHooks.js";
import { useRegisterKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { FocusedPress, FocusedNode, InputFields, focusClick } from "./render/elements.js";
import { ClickedPress, BodyColumns } from "./render/actionKeys.js";
import {
  thrownTeller,
  renderDraws,
  firstThrowReport,
  tellThrown,
} from "../../plugins/functionHooks/ui/renderDispatch.js";
import { renderModulesForInstance } from "../../plugins/functionHooks/ui/renderInstances.js";
import { SentryErrorBoundary } from "../SentryErrorBoundary.js";
import { saveGlobalConfigDurably, getGlobalConfig } from "../../utils/config.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useRenderMode } from "../../ink/renderModeContext.js";
import {
  pluginToastQueueView,
  TOAST_DEFAULT_MS,
  planBarToasts,
  mergeToastLedgers,
  readBarToasts,
  saveBarToasts,
  logToastTimeLost,
  rekeyToastQueue,
  shownToastEndsAt,
  J$o,
} from "../../plugins/functionHooks/uiToast.js";
import { holdsToasts as holdsToasts_2, useNotifications } from "../../context/notifications.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { pluginStateRegistry } from "../../plugins/functionHooks/api/state.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { createSignal } from "../../utils/signal.js";

//@ chunk-18hwfzwa.js:32946-32956 placement
var PaneDockNamespace = {};
//@ chunk-18hwfzwa.js:32956-34226 placement
Ar(PaneDockNamespace, {
  BORDER_COLUMNS: () => BORDER_COLUMNS,
  BORDER_MARK_INSET: () => BORDER_MARK_INSET,
  CLOSE_MARK_CELLS: () => CLOSE_MARK_CELLS,
  CLOSE_MARK_COLUMNS: () => CLOSE_MARK_COLUMNS,
  CloseMark: () => CloseMark,
  DOCK_GRIP_COLUMNS: () => DOCK_GRIP_COLUMNS,
  DOCK_KEY_COLUMNS: () => DOCK_KEY_COLUMNS,
  DOCK_MAX_SHARE: () => DOCK_MAX_SHARE,
  DOCK_MIN_COLUMNS: () => DOCK_MIN_COLUMNS,
  DOCK_TRANSCRIPT_MIN_COLUMNS: () => DOCK_TRANSCRIPT_MIN_COLUMNS,
  DockGrip: () => DockGrip,
  DockRule: () => DockRule,
  DockTail: () => DockTail,
  INLINE_KEY_ROWS: () => INLINE_KEY_ROWS,
  INLINE_MIN_ROWS: () => INLINE_MIN_ROWS,
  INLINE_ROWS_SHARE: () => INLINE_ROWS_SHARE,
  InlinePanes: () => InlinePanes,
  PROMPT_FLOOR_ROWS: () => PROMPT_FLOOR_ROWS,
  PaneDock: () => PaneDock,
  PaneHost: () => PaneHost,
  PaneSite: () => PaneSite,
  PaneTab: () => PaneTab,
  PaneTabs: () => PaneTabs,
  RowGrip: () => RowGrip,
  TAB_MIN_COLUMNS: () => TAB_MIN_COLUMNS,
  TRANSCRIPT_PEEK_ROWS: () => TRANSCRIPT_PEEK_ROWS,
  askedFill: () => askedFill,
  chooseRoom: () => chooseRoom,
  chromeRows: () => chromeRows,
  dealBarToasts: () => useToastQueueBridge,
  default: () => PaneDockNamespace,
  dockColumns: () => dockColumns,
  dockLitStore: () => dockLitStore,
  firstDrawnTab: () => firstDrawnTab,
  focusedPaneId: () => selectFocusedId,
  hasOpenPanes: () => hasOpenPanes,
  hasShownPane: () => hasShownPane,
  inlineRows: () => inlineRows,
  isHoldingKeys: () => isHoldingKeys,
  keepRoom: () => keepRoom,
  keptCells: () => keptCells,
  keptLatch: () => keptLatch,
  keptRoom: () => keptRoom,
  openPanes: () => selectOpen,
  paneFill: () => paneFill,
  paneHandlers: () => paneHandlers,
  paneRing: () => paneRing,
  requestedColumns: () => requestedColumns,
  requestedRows: () => requestedRows,
  resizeHandlers: () => resizeHandlers,
  roomStore: () => roomStore,
  tabFloorColumns: () => tabFloorColumns,
  useBarToasts: () => useBarToasts,
  useDockColumns: () => useDockColumns,
  useDockFill: () => useDockFill,
  useGrip: () => useGrip,
  useInlineRows: () => useInlineRows,
  usePaneToastHold: () => usePaneToastHold,
  usePanesAtOnce: () => usePanesAtOnce,
  usePromptEscapeClose: () => usePromptEscapeClose,
  useResize: () => useResize,
});
//@ chunk-18hwfzwa.js:34226-34236 placement
var PaneDockNamespace2 = {};
//@ chunk-18hwfzwa.js:34236-34353 placement
Ar(PaneDockNamespace2, {
  BORDER_MARK_INSET: () => BORDER_MARK_INSET,
  CLOSE_MARK_CELLS: () => CLOSE_MARK_CELLS,
  CLOSE_MARK_COLUMNS: () => CLOSE_MARK_COLUMNS,
  CloseMark: () => CloseMark,
  default: () => PaneDockNamespace2,
});
//@ chunk-18hwfzwa.js:35469-35479 placement
var PaneDockNamespace3 = {};
//@ chunk-18hwfzwa.js:35479-35636 placement
Ar(PaneDockNamespace3, {
  DOCK_GRIP_COLUMNS: () => DOCK_GRIP_COLUMNS,
  DOCK_KEY_COLUMNS: () => DOCK_KEY_COLUMNS,
  DOCK_MAX_SHARE: () => DOCK_MAX_SHARE,
  DOCK_MIN_COLUMNS: () => DOCK_MIN_COLUMNS,
  DOCK_TRANSCRIPT_MIN_COLUMNS: () => DOCK_TRANSCRIPT_MIN_COLUMNS,
  default: () => PaneDockNamespace3,
});
//@ chunk-18hwfzwa.js:35636-35646 placement
var PaneDockNamespace4 = {};
//@ chunk-18hwfzwa.js:35646-35690 placement
Ar(PaneDockNamespace4, {
  default: () => PaneDockNamespace4,
  dockLitStore: () => dockLitStore,
});
//@ chunk-18hwfzwa.js:35690-35700 placement
var PaneDockNamespace5 = {};
//@ chunk-18hwfzwa.js:35700-35827 placement
Ar(PaneDockNamespace5, {
  INLINE_KEY_ROWS: () => INLINE_KEY_ROWS,
  INLINE_MIN_ROWS: () => INLINE_MIN_ROWS,
  PROMPT_FLOOR_ROWS: () => PROMPT_FLOOR_ROWS,
  TRANSCRIPT_PEEK_ROWS: () => TRANSCRIPT_PEEK_ROWS,
  default: () => PaneDockNamespace5,
});
//@ chunk-18hwfzwa.js:35827-35837 placement
var PaneDockNamespace6 = {};
//@ chunk-18hwfzwa.js:35837-36007 placement
Ar(PaneDockNamespace6, {
  chooseRoom: () => chooseRoom,
  default: () => PaneDockNamespace6,
  keepRoom: () => keepRoom,
  keptCells: () => keptCells,
  keptLatch: () => keptLatch,
  keptRoom: () => keptRoom,
  roomStore: () => roomStore,
  useDockColumns: () => useDockColumns,
  useInlineRows: () => useInlineRows,
});
//@ chunk-18hwfzwa.js:496344-496398 placement
function stopClickPropagation(event) {
  return event.stopImmediatePropagation();
}
//@ chunk-18hwfzwa.js:496398-496729 placement
var CloseMark = (h) => {
  let x = w(6);
  let children;
  if (x[0] !== h.isHeld || x[1] !== h.onClose) {
    children = jsxProd_default(AbovePromptBandNamespace.DimButton, {
      label: HEAVY_MULTIPLICATION_X,
      isHeld: h.isHeld,
      onAction: h.onClose,
    });
    x[0] = h.isHeld;
    x[1] = h.onClose;
    x[2] = children;
  } else children = x[2];
  let L;
  if (x[3] !== h.inset || x[4] !== children) {
    L = jsxProd_default(Box, {
      position: "absolute",
      top: 0,
      right: h.inset,
      onClick: stopClickPropagation,
      children,
    });
    x[3] = h.inset;
    x[4] = children;
    x[5] = L;
  } else L = x[5];
  return L;
};
//@ chunk-18hwfzwa.js:496729-496738 placement
var CLOSE_MARK_CELLS = 1;
//@ chunk-18hwfzwa.js:496738-496748 placement
var CLOSE_MARK_COLUMNS = 2;
//@ chunk-18hwfzwa.js:496748-496757 placement
var DOCK_GRIP_COLUMNS = 1;
//@ chunk-18hwfzwa.js:496757-496767 placement
var DOCK_KEY_COLUMNS = 4;
//@ chunk-18hwfzwa.js:496767-496780 placement
var DOCK_MAX_SHARE_2 = 0.45;
//@ chunk-18hwfzwa.js:496780-496829 placement
var computeMaxDockColumns = (h) => Math.min(Math.floor(h * 0.45), 90, h - 70);
//@ chunk-18hwfzwa.js:496829-496841 placement
var DOCK_MAX_SHARE = DOCK_MAX_SHARE_2;
//@ chunk-18hwfzwa.js:496841-496851 placement
var DOCK_MIN_COLUMNS = 24;
//@ chunk-18hwfzwa.js:496851-496862 placement
var DOCK_TRANSCRIPT_MIN_COLUMNS = 60;
//@ chunk-18hwfzwa.js:496862-497077 placement
function dockColumns(h, x) {
  let D = h < DIFF_SIDEBAR_MIN_COLUMNS;
  let min = Math.min(Math.floor(h * DOCK_MAX_SHARE), h - DOCK_TRANSCRIPT_MIN_COLUMNS);
  let chosen = x?.chosen;
  let requested = x?.requested;
  let Re = chosen !== undefined && chosen !== null;
  let Be = requested !== undefined;
  let He = (ze) => Math.min(min, Math.max(DOCK_MIN_COLUMNS, ze));
  let We = Re ? He(chosen) : Be ? He(requested) : computeMaxDockColumns(h);
  return D ? 0 : We;
}
//@ chunk-18hwfzwa.js:497077-497081 placement
init_react_production();
//@ chunk-18hwfzwa.js:497081-497123 placement
var dockLitStore = identity(createStore(false), (h) => h.setState(() => false));
//@ chunk-18hwfzwa.js:497123-497617 placement
var DockRule = (h) => {
  let Re = w(6);
  const borderLeftDimColor = !h.isLit;
  const borderLeftColor = h.isLit ? "suggestion" : undefined;
  const onPointer = h.grip?.onPointer;
  const onMouseEnter = h.grip?.onMouseEnter;
  const onMouseLeave = h.grip?.onMouseLeave;
  let Be;
  if (
    Re[0] !== borderLeftDimColor ||
    Re[1] !== borderLeftColor ||
    Re[2] !== onPointer ||
    Re[3] !== onMouseEnter ||
    Re[4] !== onMouseLeave
  ) {
    Be = jsxProd_default(Box, {
      flexShrink: 0,
      width: PaneDockNamespace3.DOCK_GRIP_COLUMNS,
      borderStyle: "single",
      borderLeft: true,
      borderRight: false,
      borderTop: false,
      borderBottom: false,
      borderLeftDimColor,
      borderLeftColor,
      onPointer,
      onMouseEnter,
      onMouseLeave,
    });
    Re[0] = borderLeftDimColor;
    Re[1] = borderLeftColor;
    Re[2] = onPointer;
    Re[3] = onMouseEnter;
    Re[4] = onMouseLeave;
    Re[5] = Be;
  } else Be = Re[5];
  return Be;
};
//@ chunk-18hwfzwa.js:497617-497621 placement
init_react_production();
//@ chunk-18hwfzwa.js:497621-498163 placement
function useGrip(props) {
  let { axis, cells, onResize, onSettle } = props;
  let ke = R(null);
  let [Re, Be] = y(false);
  let [He, We] = y(false);
  let hasAutoDialog = useHasAutoDialog();
  let onPointer = ce(
    (At) => {
      let It = axis === "column" ? At.col : At.row;
      let Ot = ke.current;
      let Et = At.button === 0 && !hasAutoDialog;
      switch (At.type) {
        case "down":
          if (Et) {
            ke.current = {
              at: It,
              cells,
              now: cells,
            };
            We(true);
          }
          break;
        case "move":
          if (Ot !== null && !hasAutoDialog) Ot.now = onResize(Ot.cells + Ot.at - It);
          break;
        case "up":
          if (Ot !== null) {
            ke.current = null;
            We(false);
            if (Ot.now !== Ot.cells) onSettle();
          }
          break;
      }
    },
    [axis, cells, onResize, onSettle, hasAutoDialog],
  );
  let onMouseEnter = ce(() => Be(true), []);
  let onMouseLeave = ce(() => Be(false), []);
  return {
    isLit: !hasAutoDialog && (Re || He),
    onPointer,
    onMouseEnter,
    onMouseLeave,
  };
}
//@ chunk-18hwfzwa.js:498163-498187 placement
function getFalseFlag() {
  return false;
}
//@ chunk-18hwfzwa.js:498187-498239 placement
function clearDockLit() {
  return PaneDockNamespace4.dockLitStore.setState(getFalseFlag);
}
//@ chunk-18hwfzwa.js:498239-498744 placement
function DockGrip(h) {
  let $ = w(10);
  let props;
  if ($[0] !== h.columns || $[1] !== h.onResize || $[2] !== h.onSettle) {
    props = {
      axis: "column",
      cells: h.columns,
      onResize: h.onResize,
      onSettle: h.onSettle,
    };
    $[0] = h.columns;
    $[1] = h.onResize;
    $[2] = h.onSettle;
    $[3] = props;
  } else props = $[3];
  let grip = useGrip(props);
  let isLit = grip.isLit;
  let ke;
  let Re;
  if ($[4] !== isLit) {
    ke = () => {
      PaneDockNamespace4.dockLitStore.setState(() => isLit);
      return clearDockLit;
    };
    Re = [isLit];
    $[4] = isLit;
    $[5] = ke;
    $[6] = Re;
  } else {
    ke = $[5];
    Re = $[6];
  }
  P(ke, Re);
  const isLit_2 = isLit || h.isFocused;
  let He;
  if ($[7] !== grip || $[8] !== isLit_2) {
    He = jsxProd_default(DockRule, {
      isLit: isLit_2,
      grip,
    });
    $[7] = grip;
    $[8] = isLit_2;
    $[9] = He;
  } else He = $[9];
  return He;
}
//@ chunk-18hwfzwa.js:498744-498775 placement
var isHoldingKeys = (h) => h.focusedId !== null;
//@ chunk-18hwfzwa.js:498775-498812 placement
var askedFill = (h) => shownPane(h)?.backgroundColor;
//@ chunk-18hwfzwa.js:498812-498816 placement
init_react_production();
//@ chunk-18hwfzwa.js:498816-498895 placement
function usePanesAtOnce(h) {
  let x = paneRegistry();
  return yt(
    x.subscribe,
    ce(() => h(x.getState()), [h, x]),
  );
}
//@ chunk-18hwfzwa.js:498895-498975 placement
function useDockFill() {
  return usePanesAtOnce(askedFill) === "transparent" ? undefined : "composerSidebarBackground";
}
//@ chunk-18hwfzwa.js:498975-499276 placement
function DockTail() {
  let $ = w(5);
  let backgroundColor = useDockFill();
  let storeSelector = useStoreSelector(PaneDockNamespace4.dockLitStore);
  let panesAt = usePanesAtOnce(isHoldingKeys);
  const isLit = storeSelector || panesAt;
  let children;
  if ($[0] !== isLit) {
    children = jsxProd_default(DockRule, {
      isLit,
    });
    $[0] = isLit;
    $[1] = children;
  } else children = $[1];
  let Re;
  if ($[2] !== backgroundColor || $[3] !== children) {
    Re = jsxProd_default(Box, {
      flexGrow: 1,
      flexDirection: "row",
      backgroundColor,
      children,
    });
    $[2] = backgroundColor;
    $[3] = children;
    $[4] = Re;
  } else Re = $[4];
  return Re;
}
//@ chunk-18hwfzwa.js:499276-499305 placement
var hasOpenPanes = (h) => h.open.length > 0;
//@ chunk-18hwfzwa.js:499305-499333 placement
var hasShownPane = (h) => shownPane(h) !== undefined;
//@ chunk-18hwfzwa.js:499333-499343 placement
var INLINE_KEY_ROWS = 1;
//@ chunk-18hwfzwa.js:499343-499353 placement
var INLINE_MIN_ROWS = 5;
//@ chunk-18hwfzwa.js:499353-499363 placement
var PROMPT_FLOOR_ROWS = 8;
//@ chunk-18hwfzwa.js:499363-499373 placement
var TRANSCRIPT_PEEK_ROWS = 3;
//@ chunk-18hwfzwa.js:499373-499377 placement
init_react_production();
//@ chunk-18hwfzwa.js:499377-499387 placement
var INLINE_ROWS_SHARE = 3;
//@ chunk-18hwfzwa.js:499387-499631 placement
function inlineRows(h, x, D) {
  let floored = Math.floor(h / INLINE_ROWS_SHARE);
  let ke = x === "fullscreen" ? floored : Math.max(floored, h - TRANSCRIPT_PEEK_ROWS - PROMPT_FLOOR_ROWS);
  let min = Math.min(INLINE_MIN_ROWS, ke);
  let chosen = D?.chosen;
  let requested = D?.requested;
  let We = chosen !== undefined && chosen !== null;
  let ze = requested !== undefined;
  let Xe = (rt) => Math.min(ke, Math.max(min, rt));
  return We ? Xe(chosen) : ze ? Xe(requested) : floored;
}
//@ chunk-18hwfzwa.js:499631-499656 placement
var selectFocusedId = (h) => h.focusedId;
//@ chunk-18hwfzwa.js:499656-499676 placement
var selectOpen = (h) => h.open;
//@ chunk-18hwfzwa.js:499676-499680 placement
init_react_production();
//@ chunk-18hwfzwa.js:499680-499684 placement
init_react_production();
//@ chunk-18hwfzwa.js:499684-499756 placement
function paneFill(backgroundColor) {
  return backgroundColor === undefined || backgroundColor === "transparent"
    ? undefined
    : validThemeName(resolvePaneColor(backgroundColor));
}
//@ chunk-18hwfzwa.js:499756-499815 placement
var resizeHandlers = (resize) => ({
  "pane:grow": resize.grow,
  "pane:shrink": resize.shrink,
});
//@ chunk-18hwfzwa.js:499815-500025 placement
function paneHandlers(h) {
  let { "pane:scrollUp": x, "pane:scrollDown": D, ...L } = paneScrollHandlers(h.scroll);
  let ee = h.scroll.maxOffset > 0;
  return {
    ...h.ring,
    ...L,
    ...(ee && {
      "pane:scrollUp": x,
      "pane:scrollDown": D,
    }),
    ...resizeHandlers(h.resize),
    "pane:close": h.close,
  };
}
//@ chunk-18hwfzwa.js:500025-500771 placement
function paneRing(h) {
  let { ring, engine, moveByPerson, setIndex, leave } = h;
  let Re = ringHandlers(ring);
  let Be = ring.focusables.length;
  let He = Be + engine.tabCount + 1;
  let We = () => engine.heldNow();
  let ze = () => (We() === null ? ring.focusIndexNow() : Be + (We() ?? 0));
  function Xe(It) {
    let Ot = It < Be;
    moveByPerson({
      index: Ot ? It : null,
      apply: () => {
        engine.hold(Ot ? null : It - Be);
        setIndex(Ot ? It : null);
      },
    });
  }
  function rt(It) {
    let Ot = It === 1 ? -1 : Be;
    let Et = We() === null ? (ring.focusIndexNow() ?? Ot) : Ot;
    if (Be > 0) Xe((Et + It + Be) % Be);
  }
  function kt(It) {
    return It === engine.tabCount ? engine.close() : engine.pick(It);
  }
  function At() {
    let It = We();
    return It === null ? Re["abovePrompt:press"]?.() : kt(It);
  }
  return {
    ...Re,
    "abovePrompt:next": () => Xe(((ze() ?? -1) + 1) % He),
    "abovePrompt:previous": () => Xe(((ze() ?? 0) - 1 + He) % He),
    "abovePrompt:press": At,
    "abovePrompt:leave": leave,
    "pane:scrollUp": () => rt(-1),
    "pane:scrollDown": () => rt(1),
  };
}
//@ chunk-18hwfzwa.js:500771-500782 placement
var TAB_MIN_COLUMNS = 12;
//@ chunk-18hwfzwa.js:500782-500816 placement
var tabFloorColumns = (title) => Math.min(bunStringWidth(title) + 2, TAB_MIN_COLUMNS);
//@ chunk-18hwfzwa.js:500816-501004 placement
function firstDrawnTab({ open, shownId, columns }) {
  let index = open.findIndex((Re) => Re.id === shownId);
  let max = Math.max(0, index);
  let ke = -1;
  for (let Re = index; Re >= 0; Re--) {
    ke += 1 + tabFloorColumns(open[Re]?.title ?? "");
    if (ke > columns && Re < index) break;
    max = Re;
  }
  return max;
}
//@ chunk-18hwfzwa.js:501004-501008 placement
init_react_production();
//@ chunk-18hwfzwa.js:501008-501882 placement
function PaneTab(props) {
  let $ = w(16);
  let { pane, isShown, isHeld, onPick } = props;
  let [ke, Re] = y(false);
  let Be = ke || isHeld;
  let minWidth;
  if ($[0] !== pane.title) {
    minWidth = tabFloorColumns(pane.title);
    $[0] = pane.title;
    $[1] = minWidth;
  } else minWidth = $[1];
  let onClick;
  if ($[2] !== onPick || $[3] !== pane.id) {
    onClick = (event) => {
      event.stopImmediatePropagation();
      if (!event.isWindowActivation) onPick(pane.id);
    };
    $[2] = onPick;
    $[3] = pane.id;
    $[4] = onClick;
  } else onClick = $[4];
  let onMouseEnter;
  let onMouseLeave;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    onMouseEnter = () => Re(true);
    onMouseLeave = () => Re(false);
    $[5] = onMouseEnter;
    $[6] = onMouseLeave;
  } else {
    onMouseEnter = $[5];
    onMouseLeave = $[6];
  }
  const inverse = isShown || Be;
  const dimColor = Be && !isShown;
  const children = ` ${pane.title} `;
  let children_2;
  if ($[7] !== isShown || $[8] !== inverse || $[9] !== dimColor || $[10] !== children) {
    children_2 = jsxProd_default(Text, {
      inverse,
      bold: isShown,
      dimColor,
      wrap: "truncate-end",
      children,
    });
    $[7] = isShown;
    $[8] = inverse;
    $[9] = dimColor;
    $[10] = children;
    $[11] = children_2;
  } else children_2 = $[11];
  let Dt;
  if ($[12] !== minWidth || $[13] !== onClick || $[14] !== children_2) {
    Dt = jsxProd_default(Box, {
      flexShrink: 1,
      minWidth,
      height: 1,
      overflow: "hidden",
      onClick,
      onMouseEnter,
      onMouseLeave,
      children: children_2,
    });
    $[12] = minWidth;
    $[13] = onClick;
    $[14] = children_2;
    $[15] = Dt;
  } else Dt = $[15];
  return Dt;
}
//@ chunk-18hwfzwa.js:501882-502419 placement
var PaneTabs = (h) => {
  let D = w(9);
  const width = h.columns;
  let children;
  if (D[0] !== h) {
    const sliced = h.open.slice(firstDrawnTab(h));
    let ke;
    if (D[2] !== h.heldId || D[3] !== h.onPick || D[4] !== h.shownId) {
      ke = (Re) =>
        jsxProd_default(
          PaneTab,
          {
            pane: Re,
            isShown: Re.id === h.shownId,
            isHeld: Re.id === h.heldId,
            onPick: h.onPick,
          },
          Re.id,
        );
      D[2] = h.heldId;
      D[3] = h.onPick;
      D[4] = h.shownId;
      D[5] = ke;
    } else ke = D[5];
    children = sliced.map(ke);
    D[0] = h;
    D[1] = children;
  } else children = D[1];
  let ee;
  if (D[6] !== h.columns || D[7] !== children) {
    ee = jsxProd_default(Box, {
      flexDirection: "row",
      flexShrink: 0,
      width,
      height: 1,
      gap: 1,
      overflow: "hidden",
      children,
    });
    D[6] = h.columns;
    D[7] = children;
    D[8] = ee;
  } else ee = D[8];
  return ee;
};
//@ chunk-18hwfzwa.js:502419-502423 placement
init_react_production();
//@ chunk-18hwfzwa.js:502423-502969 placement
function usePromptEscapeClose(props) {
  let { pane, focused, working, promptOwnsEscape } = props;
  let hasOpenDialog = useHasOpenDialog_2();
  let secondOverlayKeys = useSecondOverlayKeys();
  let Be = useAppState((kt) => kt.viewSelectionMode === "viewing-agent");
  let He = useAppState((kt) => kt.footerSelection !== null);
  let appStoreDirect = useAppStoreDirect();
  let ze = sessionStore();
  let [Xe, rt] = y(false);
  P(() => rt(false), [focused, pane]);
  useKeybinding(
    "chat:cancel",
    () => {
      let included = paneRegistry().getState().closing.includes(pane.id);
      if (ze.getState().value !== "" || appStoreDirect.getState().queueEditIndex !== null || included)
        return false;
      closePane(pane.id, {
        kind: "person",
      }).then(() =>
        rt(
          paneRegistry()
            .getState()
            .open.some((It) => It.id === pane.id),
        ),
      );
    },
    {
      context: "Chat",
      isActive:
        pane.closeOnEscape === true &&
        !focused &&
        !working &&
        !promptOwnsEscape &&
        !hasOpenDialog &&
        !secondOverlayKeys &&
        !He &&
        !Be &&
        !Xe,
    },
  );
}
//@ chunk-18hwfzwa.js:502969-507893 placement
/**
 * PaneSite：插件面板停靠区中的单个面板位置，负责尺寸、焦点与渲染。
 */
function PaneSite(props) {
  let { pane, open, focused, working, promptOwnsEscape, columns, rows, fill, lit, resize } = props;
  let Xe = R(null);
  let rt = R(null);
  let kt = R(null);
  let At = useMeasured(() => (Xe.current ? measureElement(Xe.current).height : 0));
  let [It, Ot, Et] = useLatestState(null);
  let [Dt, Lt, oo] = useLatestState(null);
  let [Xt, io] = y(0);
  let so = ce(() => {
    Ot(null);
    Lt(null);
    focusPane(null);
  }, []);
  let ref = useClickOutside(
    ce(() => {
      if (paneRegistry().getState().focusedId === pane.id) so();
    }, [so, pane.id]),
  );
  let ao = !fill;
  let co = open.length > 1;
  let bo = Q(() => (co ? open.filter((Ls) => Ls.id !== pane.id) : []), [co, open, pane.id]);
  let Ao = bo.length;
  let max = Math.max(0, rows - chromeRows(co, ao));
  let Ro = fill ? max : Math.min(max, At);
  let max_2 = Math.max(0, columns - (ao ? BORDER_COLUMNS : 0));
  let Io = ao ? BORDER_MARK_INSET : MARK_EDGE_COLUMNS;
  let columns_2 = ao ? max_2 : Math.max(0, max_2 - CLOSE_MARK_COLUMNS - Io);
  let max_3 = Math.max(0, At - Ro);
  let Cn = PaneBody({
    component: "Pane",
    requestId: pane.id,
    owner: pane.plugin,
    bodyRows: Ro,
    contentRows: At,
    maxOffset: max_3,
    content: Xe,
  });
  let { offset, placed, place } = Cn;
  let kn = wheelScrollRows(Cn, toLocalPoint(rt));
  let viewedAgentIdProps = useViewedAgentIdProps();
  let bn = useRenderDrawing(
    withScrollOffset(
      useRenderInput(
        "Pane",
        () => ({
          requestId: pane.id,
          props: {
            title: pane.title,
            isFocused: focused,
            bodyColumns: max_2,
            placement: fill ? "dock" : "inline",
            scroll: {
              offset: 0,
              bodyRows: max,
            },
            view: viewedAgentIdProps,
          },
        }),
        [pane.id, pane.title, focused, max_2, fill, max, viewedAgentIdProps],
      ),
      Cn,
    ),
    () => null,
  );
  let { drawn } = bn;
  let hn = Q(() => collectSurfaceHandles(drawn), [drawn]);
  let Mn = Q(() => hotkeysOf(drawn), [drawn]);
  let Xo = ce(
    (Ls) => {
      if (Ls === null || Ls === "mark") return Ls === null ? null : Ao;
      let index = bo.findIndex((ws) => ws.id === Ls.tab);
      return index < 0 ? null : index;
    },
    [bo, Ao],
  );
  let Sn = focused ? It : null;
  let $n = focused ? Xo(Dt) : null;
  let isHeld = $n === Ao;
  let heldId = bo[$n ?? Ao]?.id ?? null;
  let cn = ce(() => paneRegistry().getState().focusedId === pane.id, [pane.id]);
  let Dn = ce(() => (cn() ? Et() : null), [cn, Et]);
  let wn = ce(() => (cn() ? Xo(oo()) : null), [cn, Xo, oo]);
  function mr(Ls) {
    let id = bo[Ls ?? Ao]?.id;
    return Ls === Ao
      ? "mark"
      : id === undefined
        ? null
        : {
            tab: id,
          };
  }
  let Kn = Sn === null ? null : (hn[Sn] ?? null);
  let tag = Kn ? Kn.tag : null;
  let value = Q(
    () =>
      Kn
        ? {
            plugin: Kn.plugin,
            handle: Kn.handle,
          }
        : null,
    [Kn],
  );
  let value_2 = Q(
    () => (Ls) => {
      kt.current = Ls
        ? {
            node: Ls,
            index: Sn,
          }
        : null;
    },
    [Sn],
  );
  let Un = () => ({
    held: kt.current,
    index: Sn,
    content: Xe.current,
  });
  let dr = useMeasured(() => heldRowOffset(Un(), "top"));
  let or = useMeasured(() => heldRowOffset(Un(), "bottom"));
  let inputFields = useInputFields(hn, "Pane", pane.id);
  let Qn = AbovePromptSelect({
    focusables: hn,
    focusIndex: Sn,
    focusIndexNow: Dn,
    setFocusIndex: Ot,
    working,
    component: "Pane",
    requestId: pane.id,
  });
  let hasAutoDialog = useHasAutoDialog();
  let Ir = ce((Ls) => {
    Ot(Ls);
    Lt(null);
    io((is) => is + 1);
  }, []);
  let Pr = uiFocusForPlugin({
    component: "Pane",
    requestId: pane.id,
    owner: pane.plugin,
    focusables: hn,
    isHeld: focused,
    isHeldNow: cn,
    indexNow: Dn,
    isEmptyNow: ce(() => Dn() === null && wn() === null, [Dn, wn]),
    land: Ir,
  });
  let ts = ce(
    (Ls) => {
      if (hasAutoDialog) return;
      focusPane(pane.id);
      if (Ls !== null)
        Pr.act(() =>
          Pr.moveByPerson({
            index: Ls,
            apply: () => Ir(Ls),
          }),
        );
    },
    [hasAutoDialog, pane.id, Pr, Ir],
  );
  let value_3 = useClickedPress(hn, ts);
  let Ur = ce(
    (Ls) => {
      if (!hasAutoDialog) showPane(Ls);
    },
    [hasAutoDialog],
  );
  let Zr = ce(() => {
    so();
    closePane(pane.id, {
      kind: "person",
    });
  }, [so, pane.id]);
  P(() => {
    if (!focused) {
      Ot(null);
      Lt(null);
    }
  }, [focused]);
  useReleaseGoneHold(
    It,
    hn.length,
    ce(() => Ot(null), []),
  );
  P(() => {
    if (placed > max_3) place(() => max_3);
  }, [placed, max_3, place]);
  P(() => {
    if (dr >= 0)
      place((offset) =>
        nearestScrollTop({
          offset,
          bodyRows: Ro,
          top: dr,
          bottom: or,
        }),
      );
  }, [dr, or, Ro, Xt, place]);
  let wr = focused && tag === "Input";
  let zr = focused && tag === "Select";
  let isActive = focused && !wr && !zr;
  let fr = wr || zr;
  useRegisterKeybindingContext("Pane", isActive);
  useRegisterKeybindingContext("PaneField", fr);
  useRegisterKeybindingContext("AbovePromptInput", wr);
  useRegisterKeybindingContext("AbovePromptSelect", zr);
  useRegisterOverlay("above-prompt-input", wr);
  useRegisterOverlay("above-prompt-select", zr);
  let $r = pane.closeOnEscape ? Zr : so;
  let Yr = wrapActHandlers(
    Pr,
    paneRing({
      ring: {
        focusables: hn,
        focusIndexNow: Dn,
        focusByPerson: (Ls) =>
          Pr.moveByPerson({
            index: Ls,
            apply: () => Ir(Ls),
          }),
        leave: so,
        submit: inputFields.submit,
      },
      engine: {
        tabCount: Ao,
        heldNow: wn,
        hold: (Ls) => Lt(mr(Ls)),
        pick: (Ls) => Ur(bo[Ls]?.id ?? pane.id),
        close: Zr,
      },
      moveByPerson: Pr.moveByPerson,
      setIndex: (Ls) => {
        Ot(Ls);
        io((is) => is + 1);
      },
      leave: () => {
        Pr.forget();
        $r();
      },
    }),
    ["abovePrompt:leave"],
  );
  let Er = (Ls) => Ur(cyclePaneId(paneRegistry().getState(), Ls) ?? pane.id);
  let Vr = paneHandlers({
    ring: Yr,
    scroll: Cn,
    resize,
    close: Zr,
  });
  P(() => {
    inputFields.ringStep.current = (Ls) => Yr[Ls === "next" ? "pane:scrollDown" : "pane:scrollUp"]?.();
  });
  let ms = {
    ...Yr,
    ...Qn.handlers,
  };
  function Xs() {
    let Ls = cn();
    let is = pickOrNull(hn, Dn());
    return Ls ? fieldContext(is, "Pane") : null;
  }
  MessageActionsKeybindings(Vr, {
    context: "Pane",
    isActive,
  });
  usePromptEscapeClose({
    pane,
    focused,
    working,
    promptOwnsEscape,
  });
  MessageActionsKeybindings(
    {
      "pane:next": () => Er(1),
      "pane:previous": () => Er(-1),
    },
    {
      context: "Global",
      isActive: co,
    },
  );
  MessageActionsKeybindings(
    {
      "pane:close": Zr,
    },
    {
      context: "PaneField",
      isActive: fr,
    },
  );
  MessageActionsKeybindings(Yr, {
    context: "AbovePromptInput",
    isActive: wr,
  });
  MessageActionsKeybindings(ms, {
    context: "AbovePromptSelect",
    isActive: zr,
  });
  usePaneKeyRouting({
    isAhead: () => cn() !== focused || Dn() !== Sn || wn() !== $n,
    contextNow: Xs,
    focusedNow: () => pickOrNull(hn, Dn()),
    contextRendered: () => (focused ? fieldContext(Kn, "Pane") : null),
    focusedRendered: () => Kn,
    handlers: {
      Pane: Vr,
      AbovePromptInput: Yr,
      AbovePromptSelect: ms,
    },
    inputs: inputFields,
    selectKeys: Qn.intercept,
  });
  usePreDispatchKeyHandler(Qn.intercept, {
    isActive: zr,
  });
  useHotkeyPresses(Mn, isActive);
  return jsxProd_default(FocusedPress, {
    value,
    children: jsxProd_default(FocusedNode, {
      value: value_2,
      children: jsxProd_default(ClickedPress, {
        value: value_3,
        children: jsxProd_default(InputFields, {
          value: inputFields.fields,
          children: jsxProd_default(SelectFields, {
            value: Qn.fields,
            children: jsxProd_default_2(Box, {
              ref,
              flexDirection: "column",
              flexShrink: 0,
              width: columns,
              onClick: focusClick(() => ts(null)),
              onWheel: hasAutoDialog ? undefined : kn,
              selectionScope: true,
              children: [
                jsxProd_default_2(Box, {
                  flexDirection: "column",
                  flexShrink: 0,
                  height: fill ? rows : undefined,
                  selectionScope: true,
                  borderStyle: ao ? "round" : undefined,
                  borderDimColor: !focused,
                  borderTopDimColor: !focused && !lit,
                  borderTopColor: lit ? "suggestion" : undefined,
                  paddingX: ao ? 1 : 0,
                  children: [
                    co
                      ? jsxProd_default(PaneTabs, {
                          open,
                          shownId: pane.id,
                          columns: columns_2,
                          heldId,
                          onPick: Ur,
                        })
                      : !ao &&
                        jsxProd_default(Box, {
                          flexShrink: 0,
                          height: 1,
                        }),
                    jsxProd_default(Box, {
                      ref: rt,
                      backgroundColor: paneFill(pane.backgroundColor),
                      flexDirection: "column",
                      flexShrink: 0,
                      height: fill ? max : undefined,
                      maxHeight: max,
                      overflowY: "hidden",
                      children: jsxProd_default(PaneContent, {
                        content: Xe,
                        offset,
                        columns: max_2,
                        rows: max,
                        keptColumns: 0,
                        children: jsxProd_default(BodyColumns, {
                          value: max_2,
                          children: bn.node,
                        }),
                      }),
                    }),
                  ],
                }),
                jsxProd_default(CloseMark, {
                  inset: Io,
                  isHeld,
                  onClose: Zr,
                }),
              ],
            }),
          }),
        }),
      }),
    }),
  });
}
//@ chunk-18hwfzwa.js:507893-508517 placement
function PaneHost(h) {
  let panesAt = usePanesAtOnce(shownPane);
  let open = usePanesAtOnce(selectOpen);
  let panesAt_2 = usePanesAtOnce(selectFocusedId);
  let hasAutoDialog = useHasAutoDialog();
  P(() => {
    if (hasAutoDialog) focusPane(null);
  }, [hasAutoDialog]);
  P(() => () => focusPane(null), []);
  if (!(panesAt !== undefined && h.rows > 0 && h.columns > 0)) return null;
  let Re = {
    surface: "terminal",
    component: "Pane",
    requestId: panesAt.id,
  };
  let Be;
  let He = () => (Be ??= thrownTeller(renderModulesForInstance(Re), renderDraws.held(Re)));
  return jsxProd_default(
    SentryErrorBoundary,
    {
      telemetryMessage: () => firstThrowReport("Pane", He(), "answer"),
      onError: (error) => {
        focusPane(null);
        closePane(panesAt.id, {
          kind: "unload",
        });
        tellThrown({
          component: "Pane",
          teller: He(),
          error,
        });
      },
      children: jsxProd_default(PaneSite, {
        pane: panesAt,
        open,
        focused: panesAt_2 === panesAt.id,
        working: h.working,
        promptOwnsEscape: h.promptOwnsEscape,
        columns: h.columns,
        rows: h.rows,
        fill: h.fill,
        lit: h.lit,
        resize: h.resize,
      }),
    },
    `${panesAt.id} ${askCountFor("Pane", panesAt.id)}`,
  );
}
//@ chunk-18hwfzwa.js:508517-508625 placement
var roomStore = identity(
  createStore({
    dockColumns: null,
    inlineRows: null,
  }),
  (h) =>
    h.setState(() => ({
      dockColumns: null,
      inlineRows: null,
    })),
);
//@ chunk-18hwfzwa.js:508625-508745 placement
var chooseRoom = (h) =>
  roomStore.setState((x) => {
    let D = {
      ...x,
      ...h,
    };
    return D.dockColumns === x.dockColumns && D.inlineRows === x.inlineRows ? x : D;
  });
//@ chunk-18hwfzwa.js:508745-509084 placement
function keepRoom() {
  let state = roomStore.getState();
  saveGlobalConfigDurably((x) => {
    let pluginPanes = x.pluginPanes;
    let dockColumns = state.dockColumns ?? pluginPanes?.dockColumns;
    let inlineRows = state.inlineRows ?? pluginPanes?.inlineRows;
    return dockColumns === pluginPanes?.dockColumns && inlineRows === pluginPanes?.inlineRows
      ? x
      : {
          ...x,
          pluginPanes: {
            ...pluginPanes,
            dockColumns,
            inlineRows,
          },
        };
  }).then((x) => {
    if (x) logFeatureOk("plugin_function_hooks_pane_resize");
    else logFeatureSad("plugin_function_hooks_pane_resize", "not_persisted");
  });
}
//@ chunk-18hwfzwa.js:509084-509171 placement
function keptCells(h) {
  return typeof h === "number" && Number.isFinite(h) && h >= 1 ? Math.floor(h) : null;
}
//@ chunk-18hwfzwa.js:509171-509206 placement
var keptLatch = identity(createValueSlot(), (h) => h.set(undefined));
//@ chunk-18hwfzwa.js:509206-509364 placement
function keptRoom() {
  let h = keptLatch.get();
  if (h !== undefined) return h;
  let pluginPanes = getGlobalConfig().pluginPanes;
  let D = {
    dockColumns: keptCells(pluginPanes?.dockColumns),
    inlineRows: keptCells(pluginPanes?.inlineRows),
  };
  keptLatch.set(D);
  return D;
}
//@ chunk-18hwfzwa.js:509364-509432 placement
function requestedColumns(h) {
  let columns = shownPane(h)?.columns;
  return columns === undefined ? undefined : columns + DOCK_GRIP_COLUMNS;
}
//@ chunk-18hwfzwa.js:509432-509522 placement
var useDockColumns = (h) =>
  dockColumns(h, {
    chosen: useStoreSelector(roomStore, (x) => x.dockColumns) ?? keptRoom().dockColumns,
    requested: usePanesAtOnce(requestedColumns),
  });
//@ chunk-18hwfzwa.js:509522-509610 placement
function requestedRows(h) {
  let rows = shownPane(h)?.rows;
  if (rows === undefined) return;
  return rows + chromeRows(h.open.length > 1, true);
}
//@ chunk-18hwfzwa.js:509610-509702 placement
var useInlineRows = (h, x) =>
  inlineRows(h, x, {
    chosen: useStoreSelector(roomStore, (D) => D.inlineRows) ?? keptRoom().inlineRows,
    requested: usePanesAtOnce(requestedRows),
  });
//@ chunk-18hwfzwa.js:509702-510137 placement
var RowGrip = (h) => {
  let x = w(6);
  let D;
  if (
    x[0] !== h.columns ||
    x[1] !== h.grip.onMouseEnter ||
    x[2] !== h.grip.onMouseLeave ||
    x[3] !== h.grip.onPointer ||
    x[4] !== h.left
  ) {
    D = jsxProd_default(Box, {
      position: "absolute",
      top: 0,
      left: h.left,
      width: h.columns,
      height: 1,
      onPointer: h.grip.onPointer,
      onMouseEnter: h.grip.onMouseEnter,
      onMouseLeave: h.grip.onMouseLeave,
    });
    x[0] = h.columns;
    x[1] = h.grip.onMouseEnter;
    x[2] = h.grip.onMouseLeave;
    x[3] = h.grip.onPointer;
    x[4] = h.left;
    x[5] = D;
  } else D = x[5];
  return D;
};
//@ chunk-18hwfzwa.js:510137-510141 placement
init_react_production();
//@ chunk-18hwfzwa.js:510141-510285 placement
function useResize(props) {
  let { cells, step, resizeTo } = props;
  return Q(() => {
    let ee = (step) => () => {
      if (resizeTo(cells + step) !== cells) keepRoom();
    };
    return {
      grow: ee(step),
      shrink: ee(-step),
    };
  }, [cells, step, resizeTo]);
}
//@ chunk-18hwfzwa.js:510285-511855 placement
function InlinePanes(h) {
  let $ = w(24);
  let { rows, columns } = useTerminalSize();
  let renderMode = useRenderMode();
  let ee = PaneDockNamespace6.useInlineRows(rows, renderMode);
  let ke = R(null);
  let Be;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    Be = () => (ke.current === null ? 0 : measureElement(ke.current).height);
    $[0] = Be;
  } else Be = $[0];
  let measured = useMeasured(Be);
  let cells = measured > 0 ? Math.min(ee, measured) : ee;
  let panesAt = usePanesAtOnce(hasShownPane);
  let Xe = !h.docked;
  let rt;
  if ($[1] !== ee || $[2] !== renderMode || $[3] !== rows) {
    rt = (chosen) => {
      let At = inlineRows(rows, renderMode, {
        chosen,
      });
      if (PaneDockNamespace6.roomStore.getState().inlineRows !== null || At !== ee)
        PaneDockNamespace6.chooseRoom({
          inlineRows: At,
        });
      return At;
    };
    $[1] = ee;
    $[2] = renderMode;
    $[3] = rows;
    $[4] = rt;
  } else rt = $[4];
  let It = rt;
  let props;
  if ($[5] !== cells || $[6] !== It) {
    props = {
      cells,
      step: PaneDockNamespace5.INLINE_KEY_ROWS,
      resizeTo: It,
    };
    $[5] = cells;
    $[6] = It;
    $[7] = props;
  } else props = $[7];
  let resize = useResize(props);
  let props_2;
  if ($[8] !== cells || $[9] !== It) {
    props_2 = {
      axis: "row",
      cells,
      onResize: It,
      onSettle: PaneDockNamespace6.keepRoom,
    };
    $[8] = cells;
    $[9] = It;
    $[10] = props_2;
  } else props_2 = $[10];
  let grip = useGrip(props_2);
  let max = Math.max(0, columns - PaneDockNamespace2.BORDER_MARK_INSET - PaneDockNamespace2.CLOSE_MARK_CELLS);
  let Xt;
  let io;
  if ($[11] !== Xe) {
    Xt = () => (Xe ? EMPTY_PANES.offerPlacement() : undefined);
    io = [Xe];
    $[11] = Xe;
    $[12] = Xt;
    $[13] = io;
  } else {
    Xt = $[12];
    io = $[13];
  }
  P(Xt, io);
  let so;
  if (
    $[14] !== ee ||
    $[15] !== columns ||
    $[16] !== grip ||
    $[17] !== panesAt ||
    $[18] !== Xe ||
    $[19] !== max ||
    $[20] !== h.promptOwnsEscape ||
    $[21] !== h.working ||
    $[22] !== resize
  ) {
    so = Xe
      ? jsxProd_default_2(Box, {
          ref: ke,
          flexDirection: "column",
          flexShrink: 0,
          width: columns,
          children: [
            jsxProd_default(PaneHost, {
              columns,
              rows: ee,
              fill: false,
              lit: grip.isLit,
              resize,
              working: h.working,
              promptOwnsEscape: h.promptOwnsEscape,
            }),
            panesAt &&
              ee > 0 &&
              columns > 0 &&
              jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(RowGrip, {
                    left: 0,
                    columns: max,
                    grip,
                  }),
                  jsxProd_default(RowGrip, {
                    left: max + PaneDockNamespace2.CLOSE_MARK_CELLS,
                    columns: PaneDockNamespace2.BORDER_MARK_INSET,
                    grip,
                  }),
                ],
              }),
          ],
        })
      : null;
    $[14] = ee;
    $[15] = columns;
    $[16] = grip;
    $[17] = panesAt;
    $[18] = Xe;
    $[19] = max;
    $[20] = h.promptOwnsEscape;
    $[21] = h.working;
    $[22] = resize;
    $[23] = so;
  } else so = $[23];
  return so;
}
//@ chunk-18hwfzwa.js:511855-511859 placement
init_react_production();
//@ chunk-18hwfzwa.js:511859-513108 placement
function PaneDock(h) {
  let $ = w(19);
  let { columns } = useTerminalSize();
  let D = R(null);
  let ee;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ee = () => (D.current === null ? 0 : measureElement(D.current).height);
    $[0] = ee;
  } else ee = $[0];
  let rows = useMeasured(ee);
  let Re;
  if ($[1] !== columns) {
    Re = (chosen) => {
      let He = dockColumns(columns, {
        chosen,
      });
      PaneDockNamespace6.chooseRoom({
        dockColumns: He,
      });
      return He;
    };
    $[1] = columns;
    $[2] = Re;
  } else Re = $[2];
  let We = Re;
  let props;
  if ($[3] !== h.width || $[4] !== We) {
    props = {
      cells: h.width,
      step: PaneDockNamespace3.DOCK_KEY_COLUMNS,
      resizeTo: We,
    };
    $[3] = h.width;
    $[4] = We;
    $[5] = props;
  } else props = $[5];
  let resize = useResize(props);
  let isFocused = usePanesAtOnce(isHoldingKeys);
  let kt;
  let At;
  if ($[6] !== h.isOffered) {
    kt = () => (h.isOffered ? EMPTY_PANES.offerPlacement() : undefined);
    At = [h.isOffered];
    $[6] = h.isOffered;
    $[7] = kt;
    $[8] = At;
  } else {
    kt = $[7];
    At = $[8];
  }
  P(kt, At);
  let backgroundColor = useDockFill();
  let Ot = h.width <= 0;
  let Et;
  if (
    $[9] !== backgroundColor ||
    $[10] !== isFocused ||
    $[11] !== Ot ||
    $[12] !== h.promptOwnsEscape ||
    $[13] !== h.width ||
    $[14] !== h.working ||
    $[15] !== resize ||
    $[16] !== We ||
    $[17] !== rows
  ) {
    Et = Ot
      ? null
      : jsxProd_default_2(Box, {
          ref: D,
          flexGrow: 1,
          flexDirection: "row",
          width: h.width,
          backgroundColor,
          children: [
            jsxProd_default(DockGrip, {
              columns: h.width,
              onResize: We,
              onSettle: PaneDockNamespace6.keepRoom,
              isFocused,
            }),
            jsxProd_default(Box, {
              flexGrow: 1,
              flexDirection: "column",
              children: jsxProd_default(PaneHost, {
                columns: h.width - PaneDockNamespace3.DOCK_GRIP_COLUMNS,
                rows,
                fill: true,
                lit: false,
                resize,
                working: h.working,
                promptOwnsEscape: h.promptOwnsEscape,
              }),
            }),
          ],
        });
    $[9] = backgroundColor;
    $[10] = isFocused;
    $[11] = Ot;
    $[12] = h.promptOwnsEscape;
    $[13] = h.width;
    $[14] = h.working;
    $[15] = resize;
    $[16] = We;
    $[17] = rows;
    $[18] = Et;
  } else Et = $[18];
  return Et;
}
//@ chunk-18hwfzwa.js:513108-513548 placement
function useToastQueueBridge(h) {
  let { clock, store, pending, last } = h;
  let ke = pluginToastQueueView(
    store.getState().notifications,
    holdsToasts_2(store.getState()),
    TOAST_DEFAULT_MS,
  );
  let Re = planBarToasts(mergeToastLedgers(last.current, readBarToasts()), ke, clock.now());
  pending.current?.();
  saveBarToasts(Re.ledger);
  last.current = Re.ledger;
  Re.lost.forEach(logToastTimeLost);
  store.setState((Be) => {
    let He = rekeyToastQueue(Be.notifications, Re.texts);
    return He === Be.notifications
      ? Be
      : {
          ...Be,
          notifications: He,
        };
  });
  pending.current = [shownToastEndsAt(Re.ledger)]
    .flatMap((Be) => Be ?? [])
    .map((Be) => clock.setTimeout(() => useToastQueueBridge(h), Be - clock.now()))
    .at(0);
}
//@ chunk-18hwfzwa.js:513548-513552 placement
init_react_production();
//@ chunk-18hwfzwa.js:513552-513858 placement
function useBarToasts() {
  let clock = useClock();
  let appStoreDirect = useAppStoreDirect();
  let D = R(undefined);
  let last = R(J$o);
  let ee = useAppState((Be) =>
    [Be.notifications.current, ...Be.notifications.queue].map((He) => He?.key).join(" "),
  );
  let appState = useAppState(holdsToasts_2);
  let Re = useStoreSelector(pluginStateRegistry().values, (Be) =>
    readBarToasts(Be)
      .toasts.map((toast) => toast.key)
      .join(" "),
  );
  P(() => {
    useToastQueueBridge({
      clock,
      store: appStoreDirect,
      pending: D,
      last,
    });
    return () => D.current?.();
  }, [clock, appStoreDirect, ee, appState, Re]);
}
//@ chunk-18hwfzwa.js:513858-513862 placement
init_react_production();
//@ chunk-18hwfzwa.js:513862-514080 placement
function usePaneToastHold() {
  let storeSelector = useStoreSelector(paneRegistry(), holdsToasts);
  let setAppState = useSetAppState();
  let { processQueue } = useNotifications();
  P(() => {
    if (!storeSelector) return;
    setAppState((L) =>
      L.paneHoldsToasts
        ? L
        : {
            ...L,
            paneHoldsToasts: true,
          },
    );
    return () => {
      setAppState((L) =>
        L.paneHoldsToasts
          ? {
              ...L,
              paneHoldsToasts: false,
            }
          : L,
      );
      processQueue();
    };
  }, [storeSelector, setAppState, processQueue]);
}
//@ chunk-agxr4brz.js:298-320 placement
var paneDockRoomSlot = new HostScoped(() => createSignal());
//@ chunk-agxr4brz.js:320-377 placement
var noRoomForTabsSignal = identity(
  {
    hasRoomForTabs: false,
  },
  (e) => {
    e.hasRoomForTabs = false;
  },
);
export { DOCK_MIN_COLUMNS, PaneDockNamespace, computeMaxDockColumns };
