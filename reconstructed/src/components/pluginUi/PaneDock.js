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
  l1e,
  toLocalPoint,
  withScrollOffset,
  heldRowOffset,
  PaneContent,
} from "./PaneBody.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import {
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
} from "./AbovePromptBand.js";
import { HEAVY_MULTIPLICATION_X } from "../../constants/figures.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DIFF_SIDEBAR_MIN_COLUMNS } from "../../plugins/bundled/diff/index.js";
import { j, R, y, ce, P, yt, Q } from "../../../vendor/react/cjs/react.production.js";
import { ge } from "../../utils/identity.js";
import { createStore } from "../../state/store.js";
import { useHasAutoDialog, useHasOpenDialog as useHasOpenDialog_2 } from "../../state/dialogQueue.js";
import {
  rkt,
  ul,
  ekt,
  JNe,
  closePane,
  focusPane,
  showPane,
  cyclePaneId,
  VKt,
  Uq,
  B4o,
} from "../../plugins/functionHooks/panes.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { SUn, useRegisterOverlay } from "../../context/overlayContext.js";
import { useAppState, Cr, useSetAppState } from "../../state/AppState.js";
import { op } from "../../screens/repl/storeHooks.js";
import { useKeybinding } from "../../keybindings/useKeybinding.js";
import { useMeasured } from "../../ink/components/Input.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { useLatestState } from "../CustomSelect/option-map.js";
import { useClickOutside } from "./render/MarkdownBlock.js";
import { useRenderDrawing, useRenderInput, SelectFields } from "./render/RenderInstance.js";
import { collectSurfaceHandles } from "../../plugins/functionHooks/sessionEvents.js";
import { uiFocusForPlugin, f9s, bRe } from "../../plugins/functionHooks/uiApi.js";
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
import { to } from "../../utils/valueSlot.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useRenderMode } from "../../ink/renderModeContext.js";
import {
  pluginToastQueueView,
  gfn,
  planBarToasts,
  mergeToastLedgers,
  readBarToasts,
  saveBarToasts,
  logToastTimeLost,
  rekeyToastQueue,
  shownToastEndsAt,
  freeze_4 as freeze_4_2,
} from "../../plugins/functionHooks/uiToast.js";
import { Kj, useNotifications } from "../../context/notifications.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { zS } from "../../plugins/functionHooks/api/state.js";
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
Ar(PaneDockNamespace4, { default: () => PaneDockNamespace4, dockLitStore: () => dockLitStore });
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
function R1t(ee) {
  return ee.stopImmediatePropagation();
}
//@ chunk-18hwfzwa.js:496398-496729 placement
var CloseMark = (h) => {
  let x = w(6),
    D;
  if (x[0] !== h.isHeld || x[1] !== h.onClose)
    ((D = e(AbovePromptBandNamespace.DimButton, {
      label: HEAVY_MULTIPLICATION_X,
      isHeld: h.isHeld,
      onAction: h.onClose,
    })),
      (x[0] = h.isHeld),
      (x[1] = h.onClose),
      (x[2] = D));
  else D = x[2];
  let L;
  if (x[3] !== h.inset || x[4] !== D)
    ((L = e(Box, { position: "absolute", top: 0, right: h.inset, onClick: R1t, children: D })),
      (x[3] = h.inset),
      (x[4] = D),
      (x[5] = L));
  else L = x[5];
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
var w1e = 0.45;
//@ chunk-18hwfzwa.js:496780-496829 placement
var NU = (h) => Math.min(Math.floor(h * 0.45), 90, h - 70);
//@ chunk-18hwfzwa.js:496829-496841 placement
var DOCK_MAX_SHARE = w1e;
//@ chunk-18hwfzwa.js:496841-496851 placement
var DOCK_MIN_COLUMNS = 24;
//@ chunk-18hwfzwa.js:496851-496862 placement
var DOCK_TRANSCRIPT_MIN_COLUMNS = 60;
//@ chunk-18hwfzwa.js:496862-497077 placement
function dockColumns(h, x) {
  let D = h < DIFF_SIDEBAR_MIN_COLUMNS,
    min = Math.min(Math.floor(h * DOCK_MAX_SHARE), h - DOCK_TRANSCRIPT_MIN_COLUMNS),
    ee = x?.chosen,
    ke = x?.requested,
    Re = ee !== void 0 && ee !== null,
    Be = ke !== void 0,
    He = (ze) => Math.min(min, Math.max(DOCK_MIN_COLUMNS, ze)),
    We = Re ? He(ee) : Be ? He(ke) : NU(h);
  return D ? 0 : We;
}
//@ chunk-18hwfzwa.js:497077-497081 placement
j();
//@ chunk-18hwfzwa.js:497081-497123 placement
var dockLitStore = ge(createStore(!1), (h) => h.setState(() => !1));
//@ chunk-18hwfzwa.js:497123-497617 placement
var DockRule = (h) => {
  let Re = w(6);
  const x = !h.isLit,
    D = h.isLit ? "suggestion" : void 0,
    L = h.grip?.onPointer,
    ee = h.grip?.onMouseEnter,
    ke = h.grip?.onMouseLeave;
  let Be;
  if (Re[0] !== x || Re[1] !== D || Re[2] !== L || Re[3] !== ee || Re[4] !== ke)
    ((Be = e(Box, {
      flexShrink: 0,
      width: PaneDockNamespace3.DOCK_GRIP_COLUMNS,
      borderStyle: "single",
      borderLeft: !0,
      borderRight: !1,
      borderTop: !1,
      borderBottom: !1,
      borderLeftDimColor: x,
      borderLeftColor: D,
      onPointer: L,
      onMouseEnter: ee,
      onMouseLeave: ke,
    })),
      (Re[0] = x),
      (Re[1] = D),
      (Re[2] = L),
      (Re[3] = ee),
      (Re[4] = ke),
      (Re[5] = Be));
  else Be = Re[5];
  return Be;
};
//@ chunk-18hwfzwa.js:497617-497621 placement
j();
//@ chunk-18hwfzwa.js:497621-498163 placement
function useGrip(h) {
  let { axis: axis, cells: cells, onResize: onResize, onSettle: onSettle } = h,
    ke = R(null),
    [Re, Be] = y(!1),
    [He, We] = y(!1),
    ze = useHasAutoDialog(),
    Xe = ce(
      (At) => {
        let It = axis === "column" ? At.col : At.row,
          Ot = ke.current,
          Et = At.button === 0 && !ze;
        switch (At.type) {
          case "down":
            if (Et) ((ke.current = { at: It, cells: cells, now: cells }), We(!0));
            break;
          case "move":
            if (Ot !== null && !ze) Ot.now = onResize(Ot.cells + Ot.at - It);
            break;
          case "up":
            if (Ot !== null) {
              if (((ke.current = null), We(!1), Ot.now !== Ot.cells)) onSettle();
            }
            break;
        }
      },
      [axis, cells, onResize, onSettle, ze],
    ),
    rt = ce(() => Be(!0), []),
    kt = ce(() => Be(!1), []);
  return { isLit: !ze && (Re || He), onPointer: Xe, onMouseEnter: rt, onMouseLeave: kt };
}
//@ chunk-18hwfzwa.js:498163-498187 placement
function N1t() {
  return !1;
}
//@ chunk-18hwfzwa.js:498187-498239 placement
function O1t() {
  return PaneDockNamespace4.dockLitStore.setState(N1t);
}
//@ chunk-18hwfzwa.js:498239-498744 placement
function DockGrip(h) {
  let $ = w(10),
    D;
  if ($[0] !== h.columns || $[1] !== h.onResize || $[2] !== h.onSettle)
    ((D = { axis: "column", cells: h.columns, onResize: h.onResize, onSettle: h.onSettle }),
      ($[0] = h.columns),
      ($[1] = h.onResize),
      ($[2] = h.onSettle),
      ($[3] = D));
  else D = $[3];
  let L = useGrip(D),
    isLit = L.isLit,
    ke,
    Re;
  if ($[4] !== isLit)
    ((ke = () => (PaneDockNamespace4.dockLitStore.setState(() => isLit), O1t)),
      (Re = [isLit]),
      ($[4] = isLit),
      ($[5] = ke),
      ($[6] = Re));
  else ((ke = $[5]), (Re = $[6]));
  P(ke, Re);
  const Be = isLit || h.isFocused;
  let He;
  if ($[7] !== L || $[8] !== Be)
    ((He = e(DockRule, { isLit: Be, grip: L })), ($[7] = L), ($[8] = Be), ($[9] = He));
  else He = $[9];
  return He;
}
//@ chunk-18hwfzwa.js:498744-498775 placement
var isHoldingKeys = (h) => h.focusedId !== null;
//@ chunk-18hwfzwa.js:498775-498812 placement
var askedFill = (h) => rkt(h)?.backgroundColor;
//@ chunk-18hwfzwa.js:498812-498816 placement
j();
//@ chunk-18hwfzwa.js:498816-498895 placement
function usePanesAtOnce(h) {
  let x = ul();
  return yt(
    x.subscribe,
    ce(() => h(x.getState()), [h, x]),
  );
}
//@ chunk-18hwfzwa.js:498895-498975 placement
function useDockFill() {
  return usePanesAtOnce(askedFill) === "transparent" ? void 0 : "composerSidebarBackground";
}
//@ chunk-18hwfzwa.js:498975-499276 placement
function DockTail() {
  let $ = w(5),
    h = useDockFill(),
    x = useStoreSelector(PaneDockNamespace4.dockLitStore),
    D = usePanesAtOnce(isHoldingKeys);
  const L = x || D;
  let ke;
  if ($[0] !== L) ((ke = e(DockRule, { isLit: L })), ($[0] = L), ($[1] = ke));
  else ke = $[1];
  let Re;
  if ($[2] !== h || $[3] !== ke)
    ((Re = e(Box, { flexGrow: 1, flexDirection: "row", backgroundColor: h, children: ke })),
      ($[2] = h),
      ($[3] = ke),
      ($[4] = Re));
  else Re = $[4];
  return Re;
}
//@ chunk-18hwfzwa.js:499276-499305 placement
var hasOpenPanes = (h) => h.open.length > 0;
//@ chunk-18hwfzwa.js:499305-499333 placement
var hasShownPane = (h) => rkt(h) !== void 0;
//@ chunk-18hwfzwa.js:499333-499343 placement
var INLINE_KEY_ROWS = 1;
//@ chunk-18hwfzwa.js:499343-499353 placement
var INLINE_MIN_ROWS = 5;
//@ chunk-18hwfzwa.js:499353-499363 placement
var PROMPT_FLOOR_ROWS = 8;
//@ chunk-18hwfzwa.js:499363-499373 placement
var TRANSCRIPT_PEEK_ROWS = 3;
//@ chunk-18hwfzwa.js:499373-499377 placement
j();
//@ chunk-18hwfzwa.js:499377-499387 placement
var INLINE_ROWS_SHARE = 3;
//@ chunk-18hwfzwa.js:499387-499631 placement
function inlineRows(h, x, D) {
  let floored = Math.floor(h / INLINE_ROWS_SHARE),
    ke = x === "fullscreen" ? floored : Math.max(floored, h - TRANSCRIPT_PEEK_ROWS - PROMPT_FLOOR_ROWS),
    min = Math.min(INLINE_MIN_ROWS, ke),
    Be = D?.chosen,
    He = D?.requested,
    We = Be !== void 0 && Be !== null,
    ze = He !== void 0,
    Xe = (rt) => Math.min(ke, Math.max(min, rt));
  return We ? Xe(Be) : ze ? Xe(He) : floored;
}
//@ chunk-18hwfzwa.js:499631-499656 placement
var selectFocusedId = (h) => h.focusedId;
//@ chunk-18hwfzwa.js:499656-499676 placement
var selectOpen = (h) => h.open;
//@ chunk-18hwfzwa.js:499676-499680 placement
j();
//@ chunk-18hwfzwa.js:499680-499684 placement
j();
//@ chunk-18hwfzwa.js:499684-499756 placement
function paneFill(h) {
  return h === void 0 || h === "transparent" ? void 0 : ekt(JNe(h));
}
//@ chunk-18hwfzwa.js:499756-499815 placement
var resizeHandlers = (h) => ({ "pane:grow": h.grow, "pane:shrink": h.shrink });
//@ chunk-18hwfzwa.js:499815-500025 placement
function paneHandlers(h) {
  let { "pane:scrollUp": x, "pane:scrollDown": D, ...L } = paneScrollHandlers(h.scroll),
    ee = h.scroll.maxOffset > 0;
  return {
    ...h.ring,
    ...L,
    ...(ee && { "pane:scrollUp": x, "pane:scrollDown": D }),
    ...resizeHandlers(h.resize),
    "pane:close": h.close,
  };
}
//@ chunk-18hwfzwa.js:500025-500771 placement
function paneRing(h) {
  let { ring: ring, engine: engine, moveByPerson: moveByPerson, setIndex: setIndex, leave: leave } = h,
    Re = ringHandlers(ring),
    Be = ring.focusables.length,
    He = Be + engine.tabCount + 1,
    We = () => engine.heldNow(),
    ze = () => (We() === null ? ring.focusIndexNow() : Be + (We() ?? 0));
  function Xe(It) {
    let Ot = It < Be;
    moveByPerson({
      index: Ot ? It : null,
      apply: () => {
        (engine.hold(Ot ? null : It - Be), setIndex(Ot ? It : null));
      },
    });
  }
  function rt(It) {
    let Ot = It === 1 ? -1 : Be,
      Et = We() === null ? (ring.focusIndexNow() ?? Ot) : Ot;
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
var tabFloorColumns = (h) => Math.min(bunStringWidth(h) + 2, TAB_MIN_COLUMNS);
//@ chunk-18hwfzwa.js:500816-501004 placement
function firstDrawnTab({ open: open, shownId: shownId, columns: columns }) {
  let index = open.findIndex((Re) => Re.id === shownId),
    max = Math.max(0, index),
    ke = -1;
  for (let Re = index; Re >= 0; Re--) {
    if (((ke += 1 + tabFloorColumns(open[Re]?.title ?? "")), ke > columns && Re < index)) break;
    max = Re;
  }
  return max;
}
//@ chunk-18hwfzwa.js:501004-501008 placement
j();
//@ chunk-18hwfzwa.js:501008-501882 placement
function PaneTab(h) {
  let $ = w(16),
    { pane: pane, isShown: isShown, isHeld: isHeld, onPick: onPick } = h,
    [ke, Re] = y(!1),
    Be = ke || isHeld,
    We;
  if ($[0] !== pane.title) ((We = tabFloorColumns(pane.title)), ($[0] = pane.title), ($[1] = We));
  else We = $[1];
  let ze;
  if ($[2] !== onPick || $[3] !== pane.id)
    ((ze = (Xe) => {
      if ((Xe.stopImmediatePropagation(), !Xe.isWindowActivation)) onPick(pane.id);
    }),
      ($[2] = onPick),
      ($[3] = pane.id),
      ($[4] = ze));
  else ze = $[4];
  let rt, kt;
  if ($[5] === MEMO_CACHE_SENTINEL) ((rt = () => Re(!0)), (kt = () => Re(!1)), ($[5] = rt), ($[6] = kt));
  else ((rt = $[5]), (kt = $[6]));
  const At = isShown || Be,
    It = Be && !isShown,
    Ot = ` ${pane.title} `;
  let Et;
  if ($[7] !== isShown || $[8] !== At || $[9] !== It || $[10] !== Ot)
    ((Et = e(Text, { inverse: At, bold: isShown, dimColor: It, wrap: "truncate-end", children: Ot })),
      ($[7] = isShown),
      ($[8] = At),
      ($[9] = It),
      ($[10] = Ot),
      ($[11] = Et));
  else Et = $[11];
  let Dt;
  if ($[12] !== We || $[13] !== ze || $[14] !== Et)
    ((Dt = e(Box, {
      flexShrink: 1,
      minWidth: We,
      height: 1,
      overflow: "hidden",
      onClick: ze,
      onMouseEnter: rt,
      onMouseLeave: kt,
      children: Et,
    })),
      ($[12] = We),
      ($[13] = ze),
      ($[14] = Et),
      ($[15] = Dt));
  else Dt = $[15];
  return Dt;
}
//@ chunk-18hwfzwa.js:501882-502419 placement
var PaneTabs = (h) => {
  let D = w(9);
  const columns = h.columns;
  let L;
  if (D[0] !== h) {
    const sliced = h.open.slice(firstDrawnTab(h));
    let ke;
    if (D[2] !== h.heldId || D[3] !== h.onPick || D[4] !== h.shownId)
      ((ke = (Re) =>
        e(
          PaneTab,
          { pane: Re, isShown: Re.id === h.shownId, isHeld: Re.id === h.heldId, onPick: h.onPick },
          Re.id,
        )),
        (D[2] = h.heldId),
        (D[3] = h.onPick),
        (D[4] = h.shownId),
        (D[5] = ke));
    else ke = D[5];
    L = sliced.map(ke);
    ((D[0] = h), (D[1] = L));
  } else L = D[1];
  let ee;
  if (D[6] !== h.columns || D[7] !== L)
    ((ee = e(Box, {
      flexDirection: "row",
      flexShrink: 0,
      width: columns,
      height: 1,
      gap: 1,
      overflow: "hidden",
      children: L,
    })),
      (D[6] = h.columns),
      (D[7] = L),
      (D[8] = ee));
  else ee = D[8];
  return ee;
};
//@ chunk-18hwfzwa.js:502419-502423 placement
j();
//@ chunk-18hwfzwa.js:502423-502969 placement
function usePromptEscapeClose(h) {
  let { pane: pane, focused: focused, working: working, promptOwnsEscape: promptOwnsEscape } = h,
    ke = useHasOpenDialog_2(),
    Re = SUn(),
    Be = useAppState((kt) => kt.viewSelectionMode === "viewing-agent"),
    He = useAppState((kt) => kt.footerSelection !== null),
    We = Cr(),
    ze = op(),
    [Xe, rt] = y(!1);
  (P(() => rt(!1), [focused, pane]),
    useKeybinding(
      "chat:cancel",
      () => {
        let included = ul().getState().closing.includes(pane.id);
        if (ze.getState().value !== "" || We.getState().queueEditIndex !== null || included) return !1;
        closePane(pane.id, { kind: "person" }).then(() =>
          rt(
            ul()
              .getState()
              .open.some((It) => It.id === pane.id),
          ),
        );
      },
      {
        context: "Chat",
        isActive:
          pane.closeOnEscape === !0 &&
          !focused &&
          !working &&
          !promptOwnsEscape &&
          !ke &&
          !Re &&
          !He &&
          !Be &&
          !Xe,
      },
    ));
}
/**
 * PaneSite：插件面板停靠区中的单个面板位置，负责尺寸、焦点与渲染。
 */
//@ chunk-18hwfzwa.js:502969-507893 placement
function PaneSite(h) {
  let {
      pane: pane,
      open: open,
      focused: focused,
      working: working,
      promptOwnsEscape: promptOwnsEscape,
      columns: columns,
      rows: rows,
      fill: fill,
      lit: lit,
      resize: resize,
    } = h,
    Xe = R(null),
    rt = R(null),
    kt = R(null),
    At = useMeasured(() => (Xe.current ? measureElement(Xe.current).height : 0)),
    [It, Ot, Et] = useLatestState(null),
    [Dt, Lt, oo] = useLatestState(null),
    [Xt, io] = y(0),
    so = ce(() => {
      (Ot(null), Lt(null), focusPane(null));
    }, []),
    po = useClickOutside(
      ce(() => {
        if (ul().getState().focusedId === pane.id) so();
      }, [so, pane.id]),
    ),
    ao = !fill,
    co = open.length > 1,
    bo = Q(() => (co ? open.filter((Ls) => Ls.id !== pane.id) : []), [co, open, pane.id]),
    Ao = bo.length,
    max = Math.max(0, rows - chromeRows(co, ao)),
    Ro = fill ? max : Math.min(max, At),
    max_2 = Math.max(0, columns - (ao ? BORDER_COLUMNS : 0)),
    Io = ao ? BORDER_MARK_INSET : MARK_EDGE_COLUMNS,
    Wo = ao ? max_2 : Math.max(0, max_2 - CLOSE_MARK_COLUMNS - Io),
    max_3 = Math.max(0, At - Ro),
    Cn = PaneBody({
      component: "Pane",
      requestId: pane.id,
      owner: pane.plugin,
      bodyRows: Ro,
      contentRows: At,
      maxOffset: max_3,
      content: Xe,
    }),
    { offset: offset, placed: placed, place: place } = Cn,
    kn = l1e(Cn, toLocalPoint(rt)),
    Fn = sY(),
    bn = useRenderDrawing(
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
              scroll: { offset: 0, bodyRows: max },
              view: Fn,
            },
          }),
          [pane.id, pane.title, focused, max_2, fill, max, Fn],
        ),
        Cn,
      ),
      () => null,
    ),
    { drawn: drawn } = bn,
    hn = Q(() => collectSurfaceHandles(drawn), [drawn]),
    Mn = Q(() => hotkeysOf(drawn), [drawn]),
    Xo = ce(
      (Ls) => {
        if (Ls === null || Ls === "mark") return Ls === null ? null : Ao;
        let index = bo.findIndex((ws) => ws.id === Ls.tab);
        return index < 0 ? null : index;
      },
      [bo, Ao],
    ),
    Sn = focused ? It : null,
    $n = focused ? Xo(Dt) : null,
    on = $n === Ao,
    _o = bo[$n ?? Ao]?.id ?? null,
    cn = ce(() => ul().getState().focusedId === pane.id, [pane.id]),
    Dn = ce(() => (cn() ? Et() : null), [cn, Et]),
    wn = ce(() => (cn() ? Xo(oo()) : null), [cn, Xo, oo]);
  function mr(Ls) {
    let is = bo[Ls ?? Ao]?.id;
    return Ls === Ao ? "mark" : is === void 0 ? null : { tab: is };
  }
  let Kn = Sn === null ? null : (hn[Sn] ?? null),
    Wn = Kn ? Kn.tag : null,
    Fr = Q(() => (Kn ? { plugin: Kn.plugin, handle: Kn.handle } : null), [Kn]),
    Zn = Q(
      () => (Ls) => {
        kt.current = Ls ? { node: Ls, index: Sn } : null;
      },
      [Sn],
    ),
    Un = () => ({ held: kt.current, index: Sn, content: Xe.current }),
    dr = useMeasured(() => heldRowOffset(Un(), "top")),
    or = useMeasured(() => heldRowOffset(Un(), "bottom")),
    pr = useInputFields(hn, "Pane", pane.id),
    Qn = AbovePromptSelect({
      focusables: hn,
      focusIndex: Sn,
      focusIndexNow: Dn,
      setFocusIndex: Ot,
      working: working,
      component: "Pane",
      requestId: pane.id,
    }),
    ur = useHasAutoDialog(),
    Ir = ce((Ls) => {
      (Ot(Ls), Lt(null), io((is) => is + 1));
    }, []),
    Pr = uiFocusForPlugin({
      component: "Pane",
      requestId: pane.id,
      owner: pane.plugin,
      focusables: hn,
      isHeld: focused,
      isHeldNow: cn,
      indexNow: Dn,
      isEmptyNow: ce(() => Dn() === null && wn() === null, [Dn, wn]),
      land: Ir,
    }),
    ts = ce(
      (Ls) => {
        if (ur) return;
        if ((focusPane(pane.id), Ls !== null))
          Pr.act(() => Pr.moveByPerson({ index: Ls, apply: () => Ir(Ls) }));
      },
      [ur, pane.id, Pr, Ir],
    ),
    Gn = useClickedPress(hn, ts),
    Ur = ce(
      (Ls) => {
        if (!ur) showPane(Ls);
      },
      [ur],
    ),
    Zr = ce(() => {
      (so(), closePane(pane.id, { kind: "person" }));
    }, [so, pane.id]);
  (P(() => {
    if (!focused) (Ot(null), Lt(null));
  }, [focused]),
    useReleaseGoneHold(
      It,
      hn.length,
      ce(() => Ot(null), []),
    ),
    P(() => {
      if (placed > max_3) place(() => max_3);
    }, [placed, max_3, place]),
    P(() => {
      if (dr >= 0) place((Ls) => nearestScrollTop({ offset: Ls, bodyRows: Ro, top: dr, bottom: or }));
    }, [dr, or, Ro, Xt, place]));
  let wr = focused && Wn === "Input",
    zr = focused && Wn === "Select",
    _r = focused && !wr && !zr,
    fr = wr || zr;
  (useRegisterKeybindingContext("Pane", _r),
    useRegisterKeybindingContext("PaneField", fr),
    useRegisterKeybindingContext("AbovePromptInput", wr),
    useRegisterKeybindingContext("AbovePromptSelect", zr),
    useRegisterOverlay("above-prompt-input", wr),
    useRegisterOverlay("above-prompt-select", zr));
  let $r = pane.closeOnEscape ? Zr : so,
    Yr = f9s(
      Pr,
      paneRing({
        ring: {
          focusables: hn,
          focusIndexNow: Dn,
          focusByPerson: (Ls) => Pr.moveByPerson({ index: Ls, apply: () => Ir(Ls) }),
          leave: so,
          submit: pr.submit,
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
          (Ot(Ls), io((is) => is + 1));
        },
        leave: () => {
          (Pr.forget(), $r());
        },
      }),
      ["abovePrompt:leave"],
    ),
    Er = (Ls) => Ur(cyclePaneId(ul().getState(), Ls) ?? pane.id),
    Vr = paneHandlers({ ring: Yr, scroll: Cn, resize: resize, close: Zr });
  P(() => {
    pr.ringStep.current = (Ls) => Yr[Ls === "next" ? "pane:scrollDown" : "pane:scrollUp"]?.();
  });
  let ms = { ...Yr, ...Qn.handlers };
  function Xs() {
    let Ls = cn(),
      is = bRe(hn, Dn());
    return Ls ? fieldContext(is, "Pane") : null;
  }
  return (
    MessageActionsKeybindings(Vr, { context: "Pane", isActive: _r }),
    usePromptEscapeClose({
      pane: pane,
      focused: focused,
      working: working,
      promptOwnsEscape: promptOwnsEscape,
    }),
    MessageActionsKeybindings(
      { "pane:next": () => Er(1), "pane:previous": () => Er(-1) },
      { context: "Global", isActive: co },
    ),
    MessageActionsKeybindings({ "pane:close": Zr }, { context: "PaneField", isActive: fr }),
    MessageActionsKeybindings(Yr, { context: "AbovePromptInput", isActive: wr }),
    MessageActionsKeybindings(ms, { context: "AbovePromptSelect", isActive: zr }),
    usePaneKeyRouting({
      isAhead: () => cn() !== focused || Dn() !== Sn || wn() !== $n,
      contextNow: Xs,
      focusedNow: () => bRe(hn, Dn()),
      contextRendered: () => (focused ? fieldContext(Kn, "Pane") : null),
      focusedRendered: () => Kn,
      handlers: { Pane: Vr, AbovePromptInput: Yr, AbovePromptSelect: ms },
      inputs: pr,
      selectKeys: Qn.intercept,
    }),
    usePreDispatchKeyHandler(Qn.intercept, { isActive: zr }),
    useHotkeyPresses(Mn, _r),
    e(FocusedPress, {
      value: Fr,
      children: e(FocusedNode, {
        value: Zn,
        children: e(ClickedPress, {
          value: Gn,
          children: e(InputFields, {
            value: pr.fields,
            children: e(SelectFields, {
              value: Qn.fields,
              children: r(Box, {
                ref: po,
                flexDirection: "column",
                flexShrink: 0,
                width: columns,
                onClick: focusClick(() => ts(null)),
                onWheel: ur ? void 0 : kn,
                selectionScope: !0,
                children: [
                  r(Box, {
                    flexDirection: "column",
                    flexShrink: 0,
                    height: fill ? rows : void 0,
                    selectionScope: !0,
                    borderStyle: ao ? "round" : void 0,
                    borderDimColor: !focused,
                    borderTopDimColor: !focused && !lit,
                    borderTopColor: lit ? "suggestion" : void 0,
                    paddingX: ao ? 1 : 0,
                    children: [
                      co
                        ? e(PaneTabs, { open: open, shownId: pane.id, columns: Wo, heldId: _o, onPick: Ur })
                        : !ao && e(Box, { flexShrink: 0, height: 1 }),
                      e(Box, {
                        ref: rt,
                        backgroundColor: paneFill(pane.backgroundColor),
                        flexDirection: "column",
                        flexShrink: 0,
                        height: fill ? max : void 0,
                        maxHeight: max,
                        overflowY: "hidden",
                        children: e(PaneContent, {
                          content: Xe,
                          offset: offset,
                          columns: max_2,
                          rows: max,
                          keptColumns: 0,
                          children: e(BodyColumns, { value: max_2, children: bn.node }),
                        }),
                      }),
                    ],
                  }),
                  e(CloseMark, { inset: Io, isHeld: on, onClose: Zr }),
                ],
              }),
            }),
          }),
        }),
      }),
    })
  );
}
//@ chunk-18hwfzwa.js:507893-508517 placement
function PaneHost(h) {
  let x = usePanesAtOnce(rkt),
    D = usePanesAtOnce(selectOpen),
    L = usePanesAtOnce(selectFocusedId),
    ee = useHasAutoDialog();
  if (
    (P(() => {
      if (ee) focusPane(null);
    }, [ee]),
    P(() => () => focusPane(null), []),
    !(x !== void 0 && h.rows > 0 && h.columns > 0))
  )
    return null;
  let Re = { surface: "terminal", component: "Pane", requestId: x.id },
    Be,
    He = () => (Be ??= thrownTeller(renderModulesForInstance(Re), renderDraws.held(Re)));
  return e(
    SentryErrorBoundary,
    {
      telemetryMessage: () => firstThrowReport("Pane", He(), "answer"),
      onError: (We) => {
        (focusPane(null),
          closePane(x.id, { kind: "unload" }),
          tellThrown({ component: "Pane", teller: He(), error: We }));
      },
      children: e(PaneSite, {
        pane: x,
        open: D,
        focused: L === x.id,
        working: h.working,
        promptOwnsEscape: h.promptOwnsEscape,
        columns: h.columns,
        rows: h.rows,
        fill: h.fill,
        lit: h.lit,
        resize: h.resize,
      }),
    },
    `${x.id} ${VKt("Pane", x.id)}`,
  );
}
//@ chunk-18hwfzwa.js:508517-508625 placement
var roomStore = ge(createStore({ dockColumns: null, inlineRows: null }), (h) =>
  h.setState(() => ({ dockColumns: null, inlineRows: null })),
);
//@ chunk-18hwfzwa.js:508625-508745 placement
var chooseRoom = (h) =>
  roomStore.setState((x) => {
    let D = { ...x, ...h };
    return D.dockColumns === x.dockColumns && D.inlineRows === x.inlineRows ? x : D;
  });
//@ chunk-18hwfzwa.js:508745-509084 placement
function keepRoom() {
  let state = roomStore.getState();
  saveGlobalConfigDurably((x) => {
    let pluginPanes = x.pluginPanes,
      L = state.dockColumns ?? pluginPanes?.dockColumns,
      ee = state.inlineRows ?? pluginPanes?.inlineRows;
    return L === pluginPanes?.dockColumns && ee === pluginPanes?.inlineRows
      ? x
      : { ...x, pluginPanes: { ...pluginPanes, dockColumns: L, inlineRows: ee } };
  }).then((x) => {
    x
      ? logFeatureOk("plugin_function_hooks_pane_resize")
      : logFeatureSad("plugin_function_hooks_pane_resize", "not_persisted");
  });
}
//@ chunk-18hwfzwa.js:509084-509171 placement
function keptCells(h) {
  return typeof h === "number" && Number.isFinite(h) && h >= 1 ? Math.floor(h) : null;
}
//@ chunk-18hwfzwa.js:509171-509206 placement
var keptLatch = ge(to(), (h) => h.set(void 0));
//@ chunk-18hwfzwa.js:509206-509364 placement
function keptRoom() {
  let h = keptLatch.get();
  if (h !== void 0) return h;
  let pluginPanes = getGlobalConfig().pluginPanes,
    D = { dockColumns: keptCells(pluginPanes?.dockColumns), inlineRows: keptCells(pluginPanes?.inlineRows) };
  return (keptLatch.set(D), D);
}
//@ chunk-18hwfzwa.js:509364-509432 placement
function requestedColumns(h) {
  let x = rkt(h)?.columns;
  return x === void 0 ? void 0 : x + DOCK_GRIP_COLUMNS;
}
//@ chunk-18hwfzwa.js:509432-509522 placement
var useDockColumns = (h) =>
  dockColumns(h, {
    chosen: useStoreSelector(roomStore, (x) => x.dockColumns) ?? keptRoom().dockColumns,
    requested: usePanesAtOnce(requestedColumns),
  });
//@ chunk-18hwfzwa.js:509522-509610 placement
function requestedRows(h) {
  let x = rkt(h)?.rows;
  if (x === void 0) return;
  return x + chromeRows(h.open.length > 1, !0);
}
//@ chunk-18hwfzwa.js:509610-509702 placement
var useInlineRows = (h, x) =>
  inlineRows(h, x, {
    chosen: useStoreSelector(roomStore, (D) => D.inlineRows) ?? keptRoom().inlineRows,
    requested: usePanesAtOnce(requestedRows),
  });
//@ chunk-18hwfzwa.js:509702-510137 placement
var RowGrip = (h) => {
  let x = w(6),
    D;
  if (
    x[0] !== h.columns ||
    x[1] !== h.grip.onMouseEnter ||
    x[2] !== h.grip.onMouseLeave ||
    x[3] !== h.grip.onPointer ||
    x[4] !== h.left
  )
    ((D = e(Box, {
      position: "absolute",
      top: 0,
      left: h.left,
      width: h.columns,
      height: 1,
      onPointer: h.grip.onPointer,
      onMouseEnter: h.grip.onMouseEnter,
      onMouseLeave: h.grip.onMouseLeave,
    })),
      (x[0] = h.columns),
      (x[1] = h.grip.onMouseEnter),
      (x[2] = h.grip.onMouseLeave),
      (x[3] = h.grip.onPointer),
      (x[4] = h.left),
      (x[5] = D));
  else D = x[5];
  return D;
};
//@ chunk-18hwfzwa.js:510137-510141 placement
j();
//@ chunk-18hwfzwa.js:510141-510285 placement
function useResize(h) {
  let { cells: cells, step: step, resizeTo: resizeTo } = h;
  return Q(() => {
    let ee = (ke) => () => {
      if (resizeTo(cells + ke) !== cells) keepRoom();
    };
    return { grow: ee(step), shrink: ee(-step) };
  }, [cells, step, resizeTo]);
}
//@ chunk-18hwfzwa.js:510285-511855 placement
function InlinePanes(h) {
  let $ = w(24),
    { rows: rows, columns: columns } = useTerminalSize(),
    L = useRenderMode(),
    useInlineRows = PaneDockNamespace6.useInlineRows(rows, L),
    ke = R(null),
    Be;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((Be = () => (ke.current === null ? 0 : measureElement(ke.current).height)), ($[0] = Be));
  else Be = $[0];
  let He = useMeasured(Be),
    We = He > 0 ? Math.min(useInlineRows, He) : useInlineRows,
    ze = usePanesAtOnce(hasShownPane),
    Xe = !h.docked,
    rt;
  if ($[1] !== useInlineRows || $[2] !== L || $[3] !== rows)
    ((rt = (kt) => {
      let At = inlineRows(rows, L, { chosen: kt });
      if (PaneDockNamespace6.roomStore.getState().inlineRows !== null || At !== useInlineRows)
        PaneDockNamespace6.chooseRoom({ inlineRows: At });
      return At;
    }),
      ($[1] = useInlineRows),
      ($[2] = L),
      ($[3] = rows),
      ($[4] = rt));
  else rt = $[4];
  let It = rt,
    Ot;
  if ($[5] !== We || $[6] !== It)
    ((Ot = { cells: We, step: PaneDockNamespace5.INLINE_KEY_ROWS, resizeTo: It }),
      ($[5] = We),
      ($[6] = It),
      ($[7] = Ot));
  else Ot = $[7];
  let Et = useResize(Ot),
    Dt;
  if ($[8] !== We || $[9] !== It)
    ((Dt = { axis: "row", cells: We, onResize: It, onSettle: PaneDockNamespace6.keepRoom }),
      ($[8] = We),
      ($[9] = It),
      ($[10] = Dt));
  else Dt = $[10];
  let Lt = useGrip(Dt),
    max = Math.max(0, columns - PaneDockNamespace2.BORDER_MARK_INSET - PaneDockNamespace2.CLOSE_MARK_CELLS),
    Xt,
    io;
  if ($[11] !== Xe)
    ((Xt = () => (Xe ? Uq.offerPlacement() : void 0)), (io = [Xe]), ($[11] = Xe), ($[12] = Xt), ($[13] = io));
  else ((Xt = $[12]), (io = $[13]));
  P(Xt, io);
  let so;
  if (
    $[14] !== useInlineRows ||
    $[15] !== columns ||
    $[16] !== Lt ||
    $[17] !== ze ||
    $[18] !== Xe ||
    $[19] !== max ||
    $[20] !== h.promptOwnsEscape ||
    $[21] !== h.working ||
    $[22] !== Et
  )
    ((so = Xe
      ? r(Box, {
          ref: ke,
          flexDirection: "column",
          flexShrink: 0,
          width: columns,
          children: [
            e(PaneHost, {
              columns: columns,
              rows: useInlineRows,
              fill: !1,
              lit: Lt.isLit,
              resize: Et,
              working: h.working,
              promptOwnsEscape: h.promptOwnsEscape,
            }),
            ze &&
              useInlineRows > 0 &&
              columns > 0 &&
              r(Fragment, {
                children: [
                  e(RowGrip, { left: 0, columns: max, grip: Lt }),
                  e(RowGrip, {
                    left: max + PaneDockNamespace2.CLOSE_MARK_CELLS,
                    columns: PaneDockNamespace2.BORDER_MARK_INSET,
                    grip: Lt,
                  }),
                ],
              }),
          ],
        })
      : null),
      ($[14] = useInlineRows),
      ($[15] = columns),
      ($[16] = Lt),
      ($[17] = ze),
      ($[18] = Xe),
      ($[19] = max),
      ($[20] = h.promptOwnsEscape),
      ($[21] = h.working),
      ($[22] = Et),
      ($[23] = so));
  else so = $[23];
  return so;
}
//@ chunk-18hwfzwa.js:511855-511859 placement
j();
//@ chunk-18hwfzwa.js:511859-513108 placement
function PaneDock(h) {
  let $ = w(19),
    { columns: columns } = useTerminalSize(),
    D = R(null),
    ee;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ee = () => (D.current === null ? 0 : measureElement(D.current).height)), ($[0] = ee));
  else ee = $[0];
  let ke = useMeasured(ee),
    Re;
  if ($[1] !== columns)
    ((Re = (Be) => {
      let He = dockColumns(columns, { chosen: Be });
      return (PaneDockNamespace6.chooseRoom({ dockColumns: He }), He);
    }),
      ($[1] = columns),
      ($[2] = Re));
  else Re = $[2];
  let We = Re,
    ze;
  if ($[3] !== h.width || $[4] !== We)
    ((ze = { cells: h.width, step: PaneDockNamespace3.DOCK_KEY_COLUMNS, resizeTo: We }),
      ($[3] = h.width),
      ($[4] = We),
      ($[5] = ze));
  else ze = $[5];
  let Xe = useResize(ze),
    rt = usePanesAtOnce(isHoldingKeys),
    kt,
    At;
  if ($[6] !== h.isOffered)
    ((kt = () => (h.isOffered ? Uq.offerPlacement() : void 0)),
      (At = [h.isOffered]),
      ($[6] = h.isOffered),
      ($[7] = kt),
      ($[8] = At));
  else ((kt = $[7]), (At = $[8]));
  P(kt, At);
  let It = useDockFill(),
    Ot = h.width <= 0,
    Et;
  if (
    $[9] !== It ||
    $[10] !== rt ||
    $[11] !== Ot ||
    $[12] !== h.promptOwnsEscape ||
    $[13] !== h.width ||
    $[14] !== h.working ||
    $[15] !== Xe ||
    $[16] !== We ||
    $[17] !== ke
  )
    ((Et = Ot
      ? null
      : r(Box, {
          ref: D,
          flexGrow: 1,
          flexDirection: "row",
          width: h.width,
          backgroundColor: It,
          children: [
            e(DockGrip, {
              columns: h.width,
              onResize: We,
              onSettle: PaneDockNamespace6.keepRoom,
              isFocused: rt,
            }),
            e(Box, {
              flexGrow: 1,
              flexDirection: "column",
              children: e(PaneHost, {
                columns: h.width - PaneDockNamespace3.DOCK_GRIP_COLUMNS,
                rows: ke,
                fill: !0,
                lit: !1,
                resize: Xe,
                working: h.working,
                promptOwnsEscape: h.promptOwnsEscape,
              }),
            }),
          ],
        })),
      ($[9] = It),
      ($[10] = rt),
      ($[11] = Ot),
      ($[12] = h.promptOwnsEscape),
      ($[13] = h.width),
      ($[14] = h.working),
      ($[15] = Xe),
      ($[16] = We),
      ($[17] = ke),
      ($[18] = Et));
  else Et = $[18];
  return Et;
}
//@ chunk-18hwfzwa.js:513108-513548 placement
function useToastQueueBridge(h) {
  let { clock: clock, store: store, pending: pending, last: last } = h,
    ke = pluginToastQueueView(store.getState().notifications, Kj(store.getState()), gfn),
    Re = planBarToasts(mergeToastLedgers(last.current, readBarToasts()), ke, clock.now());
  (pending.current?.(),
    saveBarToasts(Re.ledger),
    (last.current = Re.ledger),
    Re.lost.forEach(logToastTimeLost),
    store.setState((Be) => {
      let He = rekeyToastQueue(Be.notifications, Re.texts);
      return He === Be.notifications ? Be : { ...Be, notifications: He };
    }),
    (pending.current = [shownToastEndsAt(Re.ledger)]
      .flatMap((Be) => Be ?? [])
      .map((Be) => clock.setTimeout(() => useToastQueueBridge(h), Be - clock.now()))
      .at(0)));
}
//@ chunk-18hwfzwa.js:513548-513552 placement
j();
//@ chunk-18hwfzwa.js:513552-513858 placement
function useBarToasts() {
  let h = useClock(),
    x = Cr(),
    D = R(void 0),
    L = R(freeze_4_2),
    ee = useAppState((Be) =>
      [Be.notifications.current, ...Be.notifications.queue].map((He) => He?.key).join(" "),
    ),
    ke = useAppState(Kj),
    Re = useStoreSelector(zS().values, (Be) =>
      readBarToasts(Be)
        .toasts.map((toast) => toast.key)
        .join(" "),
    );
  P(
    () => (useToastQueueBridge({ clock: h, store: x, pending: D, last: L }), () => D.current?.()),
    [h, x, ee, ke, Re],
  );
}
//@ chunk-18hwfzwa.js:513858-513862 placement
j();
//@ chunk-18hwfzwa.js:513862-514080 placement
function usePaneToastHold() {
  let h = useStoreSelector(ul(), B4o),
    x = useSetAppState(),
    { processQueue: processQueue } = useNotifications();
  P(() => {
    if (!h) return;
    return (
      x((L) => (L.paneHoldsToasts ? L : { ...L, paneHoldsToasts: !0 })),
      () => {
        (x((L) => (L.paneHoldsToasts ? { ...L, paneHoldsToasts: !1 } : L)), processQueue());
      }
    );
  }, [h, x, processQueue]);
}
//@ chunk-agxr4brz.js:298-320 placement
var F = new HostScoped(() => createSignal());
//@ chunk-agxr4brz.js:320-377 placement
var B = ge({ hasRoomForTabs: !1 }, (e) => {
  e.hasRoomForTabs = !1;
});

export { DOCK_MIN_COLUMNS, PaneDockNamespace, NU };
