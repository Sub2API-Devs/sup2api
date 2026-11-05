/**
 * components/pluginUi/PaneDock.tsx
 *
 * 2.1.316 新增。插件面板停靠区（多面板布局、焦点）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6zn3tmh5.js (2), chunk-czq1j3j2.js (86)
 * attribution: placement 88
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { createSignal } from "../../utils/signal.js";
import { identity } from "../../utils/identity.js";
import { __export, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
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
import {
  init_react_production,
  useRef,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
  useSelectFields,
  useClickedPress,
  useReleaseGoneHold,
  fieldContext,
  useKeysAheadOfRender,
  useHotkeyPresses,
} from "./AbovePromptBand.js";
import { HEAVY_MULTIPLICATION_X } from "../../constants/figures.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DIFF_SIDEBAR_MIN_COLUMNS } from "../../plugins/bundled/diff/index.js";
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
  EMPTY_BAR_TOASTS,
} from "../../plugins/functionHooks/uiToast.js";
import { holdsToasts as holdsToasts_2, useNotifications } from "../../context/notifications.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { stateSession } from "../../plugins/functionHooks/api/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-6zn3tmh5.js:298-320 placement
var paneDockRoomSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6zn3tmh5.js:298", () => {
  paneDockRoomSlot = new HostScoped(() => createSignal());
});
//@ chunk-6zn3tmh5.js:320-377 placement
var noRoomForTabsSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-6zn3tmh5.js:320", () => {
  noRoomForTabsSignal = identity(
    {
      hasRoomForTabs: false,
    },
    (signal) => {
      signal.hasRoomForTabs = false;
    },
  );
});
//@ chunk-czq1j3j2.js:34507-34517 placement
var PaneDockNamespace = {};
//@ chunk-czq1j3j2.js:34517-35787 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:34517", () => {
  __export(PaneDockNamespace, {
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
    dealBarToasts: () => dealBarToasts,
    default: () => PaneDockNamespace,
    dockColumns: () => dockColumns,
    dockLitStore: () => dockLitStore,
    firstDrawnTab: () => firstDrawnTab,
    focusedPaneId: () => focusedPaneId,
    hasOpenPanes: () => hasOpenPanes,
    hasShownPane: () => hasShownPane,
    inlineRows: () => inlineRows,
    isHoldingKeys: () => isHoldingKeys,
    keepRoom: () => keepRoom,
    keptCells: () => keptCells,
    keptLatch: () => keptLatch,
    keptRoom: () => keptRoom,
    openPanes: () => openPanes,
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
});
//@ chunk-czq1j3j2.js:35787-35797 placement
var PaneDockNamespace2 = {};
//@ chunk-czq1j3j2.js:35797-35914 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:35797", () => {
  __export(PaneDockNamespace2, {
    BORDER_MARK_INSET: () => BORDER_MARK_INSET,
    CLOSE_MARK_CELLS: () => CLOSE_MARK_CELLS,
    CLOSE_MARK_COLUMNS: () => CLOSE_MARK_COLUMNS,
    CloseMark: () => CloseMark,
    default: () => PaneDockNamespace2,
  });
});
//@ chunk-czq1j3j2.js:37030-37040 placement
var PaneDockNamespace3 = {};
//@ chunk-czq1j3j2.js:37040-37197 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37040", () => {
  __export(PaneDockNamespace3, {
    DOCK_GRIP_COLUMNS: () => DOCK_GRIP_COLUMNS,
    DOCK_KEY_COLUMNS: () => DOCK_KEY_COLUMNS,
    DOCK_MAX_SHARE: () => DOCK_MAX_SHARE,
    DOCK_MIN_COLUMNS: () => DOCK_MIN_COLUMNS,
    DOCK_TRANSCRIPT_MIN_COLUMNS: () => DOCK_TRANSCRIPT_MIN_COLUMNS,
    default: () => PaneDockNamespace3,
  });
});
//@ chunk-czq1j3j2.js:37197-37207 placement
var PaneDockNamespace4 = {};
//@ chunk-czq1j3j2.js:37207-37251 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37207", () => {
  __export(PaneDockNamespace4, {
    default: () => PaneDockNamespace4,
    dockLitStore: () => dockLitStore,
  });
});
//@ chunk-czq1j3j2.js:37251-37261 placement
var PaneDockNamespace5 = {};
//@ chunk-czq1j3j2.js:37261-37388 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37261", () => {
  __export(PaneDockNamespace5, {
    INLINE_KEY_ROWS: () => INLINE_KEY_ROWS,
    INLINE_MIN_ROWS: () => INLINE_MIN_ROWS,
    PROMPT_FLOOR_ROWS: () => PROMPT_FLOOR_ROWS,
    TRANSCRIPT_PEEK_ROWS: () => TRANSCRIPT_PEEK_ROWS,
    default: () => PaneDockNamespace5,
  });
});
//@ chunk-czq1j3j2.js:37388-37398 placement
var PaneDockNamespace6 = {};
//@ chunk-czq1j3j2.js:37398-37568 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:37398", () => {
  __export(PaneDockNamespace6, {
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
});
//@ chunk-czq1j3j2.js:512162-512166 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:512162", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:514421-514425 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:514421", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:514480-514484 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:514480", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:514782-514786 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:514782", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:522821-522875 placement
function stopClickPropagation(event) {
  return event.stopImmediatePropagation();
}
//@ chunk-czq1j3j2.js:522875-523206 placement
var CloseMark = (props) => {
  let $ = useMemoCache(6);
  let children;
  if ($[0] !== props.isHeld || $[1] !== props.onClose) {
    children = jsxProd_default(AbovePromptBandNamespace.DimButton, {
      label: HEAVY_MULTIPLICATION_X,
      isHeld: props.isHeld,
      onAction: props.onClose,
    });
    $[0] = props.isHeld;
    $[1] = props.onClose;
    $[2] = children;
  } else children = $[2];
  let markElement;
  if ($[3] !== props.inset || $[4] !== children) {
    markElement = jsxProd_default(Box, {
      position: "absolute",
      top: 0,
      right: props.inset,
      onClick: stopClickPropagation,
      children,
    });
    $[3] = props.inset;
    $[4] = children;
    $[5] = markElement;
  } else markElement = $[5];
  return markElement;
};
//@ chunk-czq1j3j2.js:523206-523215 placement
var CLOSE_MARK_CELLS = 1;
//@ chunk-czq1j3j2.js:523215-523225 placement
var CLOSE_MARK_COLUMNS = 2;
//@ chunk-czq1j3j2.js:523225-523234 placement
var DOCK_GRIP_COLUMNS = 1;
//@ chunk-czq1j3j2.js:523234-523244 placement
var DOCK_KEY_COLUMNS = 4;
//@ chunk-czq1j3j2.js:523244-523257 placement
var DOCK_MAX_SHARE_2 = 0.45;
//@ chunk-czq1j3j2.js:523257-523306 placement
var computeMaxDockColumns = (columns) => Math.min(Math.floor(columns * 0.45), 90, columns - 70);
//@ chunk-czq1j3j2.js:523306-523318 placement
var DOCK_MAX_SHARE = DOCK_MAX_SHARE_2;
//@ chunk-czq1j3j2.js:523318-523328 placement
var DOCK_MIN_COLUMNS = 24;
//@ chunk-czq1j3j2.js:523328-523339 placement
var DOCK_TRANSCRIPT_MIN_COLUMNS = 60;
//@ chunk-czq1j3j2.js:523339-523554 placement
function dockColumns(columns, preferred) {
  let isTooNarrow = columns < DIFF_SIDEBAR_MIN_COLUMNS;
  let min = Math.min(Math.floor(columns * DOCK_MAX_SHARE), columns - DOCK_TRANSCRIPT_MIN_COLUMNS);
  let chosen = preferred?.chosen;
  let requested = preferred?.requested;
  let hasChosen = chosen !== undefined && chosen !== null;
  let hasRequested = requested !== undefined;
  let clampColumns = (value) => Math.min(min, Math.max(DOCK_MIN_COLUMNS, value));
  let columnsOut = hasChosen
    ? clampColumns(chosen)
    : hasRequested
      ? clampColumns(requested)
      : computeMaxDockColumns(columns);
  return isTooNarrow ? 0 : columnsOut;
}
//@ chunk-czq1j3j2.js:523554-523558 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:523554", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:523558-523600 placement
var dockLitStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:523558", () => {
  dockLitStore = identity(createStore(false), (store) => store.setState(() => false));
});
//@ chunk-czq1j3j2.js:523600-524094 placement
var DockRule = (props) => {
  let $ = useMemoCache(6);
  const borderLeftDimColor = !props.isLit;
  const borderLeftColor = props.isLit ? "suggestion" : undefined;
  const onPointer = props.grip?.onPointer;
  const onMouseEnter = props.grip?.onMouseEnter;
  const onMouseLeave = props.grip?.onMouseLeave;
  let ruleElement;
  if (
    $[0] !== borderLeftDimColor ||
    $[1] !== borderLeftColor ||
    $[2] !== onPointer ||
    $[3] !== onMouseEnter ||
    $[4] !== onMouseLeave
  ) {
    ruleElement = jsxProd_default(Box, {
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
    $[0] = borderLeftDimColor;
    $[1] = borderLeftColor;
    $[2] = onPointer;
    $[3] = onMouseEnter;
    $[4] = onMouseLeave;
    $[5] = ruleElement;
  } else ruleElement = $[5];
  return ruleElement;
};
//@ chunk-czq1j3j2.js:524094-524098 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:524094", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:524098-524640 placement
function useGrip(props) {
  let { axis, cells, onResize, onSettle } = props;
  let dragStateRef = useRef(null);
  let [isHovered, setIsHovered] = useState(false);
  let [isDragging, setIsDragging] = useState(false);
  let hasAutoDialog = useHasAutoDialog();
  let onPointer = useCallback(
    (event) => {
      let position = axis === "column" ? event.col : event.row;
      let dragState = dragStateRef.current;
      let isPrimaryDown = event.button === 0 && !hasAutoDialog;
      switch (event.type) {
        case "down":
          if (isPrimaryDown) {
            dragStateRef.current = {
              at: position,
              cells,
              now: cells,
            };
            setIsDragging(true);
          }
          break;
        case "move":
          if (dragState !== null && !hasAutoDialog)
            dragState.now = onResize(dragState.cells + dragState.at - position);
          break;
        case "up":
          if (dragState !== null) {
            dragStateRef.current = null;
            setIsDragging(false);
            if (dragState.now !== dragState.cells) onSettle();
          }
          break;
      }
    },
    [axis, cells, onResize, onSettle, hasAutoDialog],
  );
  let onMouseEnter = useCallback(() => setIsHovered(true), []);
  let onMouseLeave = useCallback(() => setIsHovered(false), []);
  return {
    isLit: !hasAutoDialog && (isHovered || isDragging),
    onPointer,
    onMouseEnter,
    onMouseLeave,
  };
}
//@ chunk-czq1j3j2.js:524640-524664 placement
function getFalseFlag() {
  return false;
}
//@ chunk-czq1j3j2.js:524664-524716 placement
function clearDockLit() {
  return PaneDockNamespace4.dockLitStore.setState(getFalseFlag);
}
//@ chunk-czq1j3j2.js:524716-525221 placement
function DockGrip(props) {
  let $ = useMemoCache(10);
  let props_2;
  if ($[0] !== props.columns || $[1] !== props.onResize || $[2] !== props.onSettle) {
    props_2 = {
      axis: "column",
      cells: props.columns,
      onResize: props.onResize,
      onSettle: props.onSettle,
    };
    $[0] = props.columns;
    $[1] = props.onResize;
    $[2] = props.onSettle;
    $[3] = props_2;
  } else props_2 = $[3];
  let grip = useGrip(props_2);
  let isLit = grip.isLit;
  let syncLitEffect;
  let syncLitDeps;
  if ($[4] !== isLit) {
    syncLitEffect = () => {
      PaneDockNamespace4.dockLitStore.setState(() => isLit);
      return clearDockLit;
    };
    syncLitDeps = [isLit];
    $[4] = isLit;
    $[5] = syncLitEffect;
    $[6] = syncLitDeps;
  } else {
    syncLitEffect = $[5];
    syncLitDeps = $[6];
  }
  useEffect(syncLitEffect, syncLitDeps);
  const isLit_2 = isLit || props.isFocused;
  let ruleElement;
  if ($[7] !== grip || $[8] !== isLit_2) {
    ruleElement = jsxProd_default(DockRule, {
      isLit: isLit_2,
      grip,
    });
    $[7] = grip;
    $[8] = isLit_2;
    $[9] = ruleElement;
  } else ruleElement = $[9];
  return ruleElement;
}
//@ chunk-czq1j3j2.js:525221-525252 placement
var isHoldingKeys = (state) => state.focusedId !== null;
//@ chunk-czq1j3j2.js:525252-525289 placement
var askedFill = (state) => shownPane(state)?.backgroundColor;
//@ chunk-czq1j3j2.js:525289-525293 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:525289", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:525293-525372 placement
function usePanesAtOnce(selector) {
  let registry = paneRegistry();
  return useSyncExternalStore(
    registry.subscribe,
    useCallback(() => selector(registry.getState()), [selector, registry]),
  );
}
//@ chunk-czq1j3j2.js:525372-525452 placement
function useDockFill() {
  return usePanesAtOnce(askedFill) === "transparent" ? undefined : "composerSidebarBackground";
}
//@ chunk-czq1j3j2.js:525452-525753 placement
function DockTail() {
  let $ = useMemoCache(5);
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
  let tailBox;
  if ($[2] !== backgroundColor || $[3] !== children) {
    tailBox = jsxProd_default(Box, {
      flexGrow: 1,
      flexDirection: "row",
      backgroundColor,
      children,
    });
    $[2] = backgroundColor;
    $[3] = children;
    $[4] = tailBox;
  } else tailBox = $[4];
  return tailBox;
}
//@ chunk-czq1j3j2.js:525753-525782 placement
var hasOpenPanes = (state) => state.open.length > 0;
//@ chunk-czq1j3j2.js:525782-525810 placement
var hasShownPane = (state) => shownPane(state) !== undefined;
//@ chunk-czq1j3j2.js:525810-525820 placement
var INLINE_KEY_ROWS = 1;
//@ chunk-czq1j3j2.js:525820-525830 placement
var INLINE_MIN_ROWS = 5;
//@ chunk-czq1j3j2.js:525830-525840 placement
var PROMPT_FLOOR_ROWS = 8;
//@ chunk-czq1j3j2.js:525840-525850 placement
var TRANSCRIPT_PEEK_ROWS = 3;
//@ chunk-czq1j3j2.js:525850-525854 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:525850", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:525854-525864 placement
var INLINE_ROWS_SHARE = 3;
//@ chunk-czq1j3j2.js:525864-526108 placement
function inlineRows(rows, mode, preferred) {
  let floored = Math.floor(rows / INLINE_ROWS_SHARE);
  let maxRows =
    mode === "fullscreen" ? floored : Math.max(floored, rows - TRANSCRIPT_PEEK_ROWS - PROMPT_FLOOR_ROWS);
  let min = Math.min(INLINE_MIN_ROWS, maxRows);
  let chosen = preferred?.chosen;
  let requested = preferred?.requested;
  let hasChosen = chosen !== undefined && chosen !== null;
  let hasRequested = requested !== undefined;
  let clampRows = (value) => Math.min(maxRows, Math.max(min, value));
  return hasChosen ? clampRows(chosen) : hasRequested ? clampRows(requested) : floored;
}
//@ chunk-czq1j3j2.js:526108-526133 placement
var focusedPaneId = (state) => state.focusedId;
//@ chunk-czq1j3j2.js:526133-526153 placement
var openPanes = (state) => state.open;
//@ chunk-czq1j3j2.js:526153-526157 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:526153", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:526157-526161 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:526157", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:526161-526233 placement
function paneFill(backgroundColor) {
  return backgroundColor === undefined || backgroundColor === "transparent"
    ? undefined
    : validThemeName(resolvePaneColor(backgroundColor));
}
//@ chunk-czq1j3j2.js:526233-526292 placement
var resizeHandlers = (resize) => ({
  "pane:grow": resize.grow,
  "pane:shrink": resize.shrink,
});
//@ chunk-czq1j3j2.js:526292-526502 placement
function paneHandlers(pane) {
  let {
    "pane:scrollUp": scrollUp,
    "pane:scrollDown": scrollDown,
    ...restHandlers
  } = paneScrollHandlers(pane.scroll);
  let canScroll = pane.scroll.maxOffset > 0;
  return {
    ...pane.ring,
    ...restHandlers,
    ...(canScroll && {
      "pane:scrollUp": scrollUp,
      "pane:scrollDown": scrollDown,
    }),
    ...resizeHandlers(pane.resize),
    "pane:close": pane.close,
  };
}
//@ chunk-czq1j3j2.js:526502-527248 placement
function paneRing(props) {
  let { ring, engine, moveByPerson, setIndex, leave } = props;
  let ringBindings = ringHandlers(ring);
  let focusableCount = ring.focusables.length;
  let slotCount = focusableCount + engine.tabCount + 1;
  let heldIndexNow = () => engine.heldNow();
  let currentSlot = () =>
    heldIndexNow() === null ? ring.focusIndexNow() : focusableCount + (heldIndexNow() ?? 0);
  function moveToSlot(slot) {
    let isRingSlot = slot < focusableCount;
    moveByPerson({
      index: isRingSlot ? slot : null,
      apply: () => {
        engine.hold(isRingSlot ? null : slot - focusableCount);
        setIndex(isRingSlot ? slot : null);
      },
    });
  }
  function stepRing(delta) {
    let fallbackSlot = delta === 1 ? -1 : focusableCount;
    let fromSlot = heldIndexNow() === null ? (ring.focusIndexNow() ?? fallbackSlot) : fallbackSlot;
    if (focusableCount > 0) moveToSlot((fromSlot + delta + focusableCount) % focusableCount);
  }
  function pickSlot(index) {
    return index === engine.tabCount ? engine.close() : engine.pick(index);
  }
  function handlePress() {
    let held = heldIndexNow();
    return held === null ? ringBindings["abovePrompt:press"]?.() : pickSlot(held);
  }
  return {
    ...ringBindings,
    "abovePrompt:next": () => moveToSlot(((currentSlot() ?? -1) + 1) % slotCount),
    "abovePrompt:previous": () => moveToSlot(((currentSlot() ?? 0) - 1 + slotCount) % slotCount),
    "abovePrompt:press": handlePress,
    "abovePrompt:leave": leave,
    "pane:scrollUp": () => stepRing(-1),
    "pane:scrollDown": () => stepRing(1),
  };
}
//@ chunk-czq1j3j2.js:527248-527259 placement
var TAB_MIN_COLUMNS = 12;
//@ chunk-czq1j3j2.js:527259-527293 placement
var tabFloorColumns = (title) => Math.min(bunStringWidth(title) + 2, TAB_MIN_COLUMNS);
//@ chunk-czq1j3j2.js:527293-527481 placement
function firstDrawnTab({ open, shownId, columns }) {
  let index = open.findIndex((tab) => tab.id === shownId);
  let max = Math.max(0, index);
  let usedColumns = -1;
  for (let scanIndex = index; scanIndex >= 0; scanIndex--) {
    usedColumns += 1 + tabFloorColumns(open[scanIndex]?.title ?? "");
    if (usedColumns > columns && scanIndex < index) break;
    max = scanIndex;
  }
  return max;
}
//@ chunk-czq1j3j2.js:527481-527485 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:527481", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:527485-528359 placement
function PaneTab(props) {
  let $ = useMemoCache(16);
  let { pane, isShown, isHeld, onPick } = props;
  let [isHovered, setIsHovered] = useState(false);
  let isActive = isHovered || isHeld;
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
    onMouseEnter = () => setIsHovered(true);
    onMouseLeave = () => setIsHovered(false);
    $[5] = onMouseEnter;
    $[6] = onMouseLeave;
  } else {
    onMouseEnter = $[5];
    onMouseLeave = $[6];
  }
  const inverse = isShown || isActive;
  const dimColor = isActive && !isShown;
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
  let tabElement;
  if ($[12] !== minWidth || $[13] !== onClick || $[14] !== children_2) {
    tabElement = jsxProd_default(Box, {
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
    $[15] = tabElement;
  } else tabElement = $[15];
  return tabElement;
}
//@ chunk-czq1j3j2.js:528359-528896 placement
var PaneTabs = (props) => {
  let $ = useMemoCache(9);
  const width = props.columns;
  let children;
  if ($[0] !== props) {
    const sliced = props.open.slice(firstDrawnTab(props));
    let renderTab;
    if ($[2] !== props.heldId || $[3] !== props.onPick || $[4] !== props.shownId) {
      renderTab = (pane) =>
        jsxProd_default(
          PaneTab,
          {
            pane,
            isShown: pane.id === props.shownId,
            isHeld: pane.id === props.heldId,
            onPick: props.onPick,
          },
          pane.id,
        );
      $[2] = props.heldId;
      $[3] = props.onPick;
      $[4] = props.shownId;
      $[5] = renderTab;
    } else renderTab = $[5];
    children = sliced.map(renderTab);
    $[0] = props;
    $[1] = children;
  } else children = $[1];
  let tabsRow;
  if ($[6] !== props.columns || $[7] !== children) {
    tabsRow = jsxProd_default(Box, {
      flexDirection: "row",
      flexShrink: 0,
      width,
      height: 1,
      gap: 1,
      overflow: "hidden",
      children,
    });
    $[6] = props.columns;
    $[7] = children;
    $[8] = tabsRow;
  } else tabsRow = $[8];
  return tabsRow;
};
//@ chunk-czq1j3j2.js:528896-528900 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:528896", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:528900-529446 placement
function usePromptEscapeClose(props) {
  let { pane, focused, working, promptOwnsEscape } = props;
  let hasOpenDialog = useHasOpenDialog_2();
  let secondOverlayKeys = useSecondOverlayKeys();
  let isViewingAgent = useAppState((state) => state.viewSelectionMode === "viewing-agent");
  let hasFooterSelection = useAppState((state) => state.footerSelection !== null);
  let appStoreDirect = useAppStoreDirect();
  let sessionState = sessionStore();
  let [isClosing, setIsClosing] = useState(false);
  useEffect(() => setIsClosing(false), [focused, pane]);
  useKeybinding(
    "chat:cancel",
    () => {
      let included = paneRegistry().getState().closing.includes(pane.id);
      if (
        sessionState.getState().value !== "" ||
        appStoreDirect.getState().queueEditIndex !== null ||
        included
      )
        return false;
      closePane(pane.id, {
        kind: "person",
      }).then(() =>
        setIsClosing(
          paneRegistry()
            .getState()
            .open.some((otherPane) => otherPane.id === pane.id),
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
        !hasFooterSelection &&
        !isViewingAgent &&
        !isClosing,
    },
  );
}
//@ chunk-czq1j3j2.js:529446-534370 placement
/**
 * PaneSite：插件面板停靠区中的单个面板位置，负责尺寸、焦点与渲染。
 */
function PaneSite(props) {
  let { pane, open, focused, working, promptOwnsEscape, columns, rows, fill, lit, resize } = props;
  let contentRef = useRef(null);
  let scrollTargetRef = useRef(null);
  let heldRef = useRef(null);
  let contentHeight = useMeasured(() => (contentRef.current ? measureElement(contentRef.current).height : 0));
  let [focusIndex, setFocusIndex, getFocusIndex] = useLatestState(null);
  let [heldTab, setHeldTab, getHeldTab] = useLatestState(null);
  let [scrollTick, setScrollTick] = useState(0);
  let releaseFocus = useCallback(() => {
    setFocusIndex(null);
    setHeldTab(null);
    focusPane(null);
  }, []);
  let ref = useClickOutside(
    useCallback(() => {
      if (paneRegistry().getState().focusedId === pane.id) releaseFocus();
    }, [releaseFocus, pane.id]),
  );
  let hasBorder = !fill;
  let hasTabs = open.length > 1;
  let otherPanes = useMemo(
    () => (hasTabs ? open.filter((otherPane) => otherPane.id !== pane.id) : []),
    [hasTabs, open, pane.id],
  );
  let tabCount = otherPanes.length;
  let max = Math.max(0, rows - chromeRows(hasTabs, hasBorder));
  let bodyRows = fill ? max : Math.min(max, contentHeight);
  let max_2 = Math.max(0, columns - (hasBorder ? BORDER_COLUMNS : 0));
  let markInset = hasBorder ? BORDER_MARK_INSET : MARK_EDGE_COLUMNS;
  let columns_2 = hasBorder ? max_2 : Math.max(0, max_2 - CLOSE_MARK_COLUMNS - markInset);
  let max_3 = Math.max(0, contentHeight - bodyRows);
  let paneBody = PaneBody({
    component: "Pane",
    requestId: pane.id,
    owner: pane.plugin,
    bodyRows,
    contentRows: contentHeight,
    maxOffset: max_3,
    content: contentRef,
  });
  let { offset, placed, place } = paneBody;
  let onWheel = wheelScrollRows(paneBody, toLocalPoint(scrollTargetRef));
  let viewedAgentIdProps = useViewedAgentIdProps();
  let drawing = useRenderDrawing(
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
      paneBody,
    ),
    () => null,
  );
  let { drawn } = drawing;
  let focusables = useMemo(() => collectSurfaceHandles(drawn), [drawn]);
  let hotkeys = useMemo(() => hotkeysOf(drawn), [drawn]);
  let tabIndexFor = useCallback(
    (held) => {
      if (held === null || held === "mark") return held === null ? null : tabCount;
      let index = otherPanes.findIndex((otherPane) => otherPane.id === held.tab);
      return index < 0 ? null : index;
    },
    [otherPanes, tabCount],
  );
  let focusIndexValue = focused ? focusIndex : null;
  let heldIndex = focused ? tabIndexFor(heldTab) : null;
  let isHeld = heldIndex === tabCount;
  let heldId = otherPanes[heldIndex ?? tabCount]?.id ?? null;
  let isFocusedNow = useCallback(() => paneRegistry().getState().focusedId === pane.id, [pane.id]);
  let focusIndexNow = useCallback(
    () => (isFocusedNow() ? getFocusIndex() : null),
    [isFocusedNow, getFocusIndex],
  );
  let heldNow = useCallback(
    () => (isFocusedNow() ? tabIndexFor(getHeldTab()) : null),
    [isFocusedNow, tabIndexFor, getHeldTab],
  );
  function tabTarget(index) {
    let id = otherPanes[index ?? tabCount]?.id;
    return index === tabCount
      ? "mark"
      : id === undefined
        ? null
        : {
            tab: id,
          };
  }
  let focusedHandle = focusIndexValue === null ? null : (focusables[focusIndexValue] ?? null);
  let tag = focusedHandle ? focusedHandle.tag : null;
  let value = useMemo(
    () =>
      focusedHandle
        ? {
            plugin: focusedHandle.plugin,
            handle: focusedHandle.handle,
          }
        : null,
    [focusedHandle],
  );
  let value_2 = useMemo(
    () => (node) => {
      heldRef.current = node
        ? {
            node,
            index: focusIndexValue,
          }
        : null;
    },
    [focusIndexValue],
  );
  let heldState = () => ({
    held: heldRef.current,
    index: focusIndexValue,
    content: contentRef.current,
  });
  let heldTop = useMeasured(() => heldRowOffset(heldState(), "top"));
  let heldBottom = useMeasured(() => heldRowOffset(heldState(), "bottom"));
  let inputFields = useInputFields(focusables, "Pane", pane.id);
  let selectState = useSelectFields({
    focusables,
    focusIndex: focusIndexValue,
    focusIndexNow,
    setFocusIndex,
    working,
    component: "Pane",
    requestId: pane.id,
  });
  let hasAutoDialog = useHasAutoDialog();
  let land = useCallback((index) => {
    setFocusIndex(index);
    setHeldTab(null);
    setScrollTick((tick) => tick + 1);
  }, []);
  let uiFocus = uiFocusForPlugin({
    component: "Pane",
    requestId: pane.id,
    owner: pane.plugin,
    focusables,
    isHeld: focused,
    isHeldNow: isFocusedNow,
    indexNow: focusIndexNow,
    isEmptyNow: useCallback(() => focusIndexNow() === null && heldNow() === null, [focusIndexNow, heldNow]),
    land,
  });
  let onClickFocus = useCallback(
    (index) => {
      if (hasAutoDialog) return;
      focusPane(pane.id);
      if (index !== null)
        uiFocus.act(() =>
          uiFocus.moveByPerson({
            index,
            apply: () => land(index),
          }),
        );
    },
    [hasAutoDialog, pane.id, uiFocus, land],
  );
  let value_3 = useClickedPress(focusables, onClickFocus);
  let showPaneById = useCallback(
    (id) => {
      if (!hasAutoDialog) showPane(id);
    },
    [hasAutoDialog],
  );
  let closePaneAction = useCallback(() => {
    releaseFocus();
    closePane(pane.id, {
      kind: "person",
    });
  }, [releaseFocus, pane.id]);
  useEffect(() => {
    if (!focused) {
      setFocusIndex(null);
      setHeldTab(null);
    }
  }, [focused]);
  useReleaseGoneHold(
    focusIndex,
    focusables.length,
    useCallback(() => setFocusIndex(null), []),
  );
  useEffect(() => {
    if (placed > max_3) place(() => max_3);
  }, [placed, max_3, place]);
  useEffect(() => {
    if (heldTop >= 0)
      place((offset) =>
        nearestScrollTop({
          offset,
          bodyRows,
          top: heldTop,
          bottom: heldBottom,
        }),
      );
  }, [heldTop, heldBottom, bodyRows, scrollTick, place]);
  let isInputTag = focused && tag === "Input";
  let isSelectTag = focused && tag === "Select";
  let isActive = focused && !isInputTag && !isSelectTag;
  let isFieldActive = isInputTag || isSelectTag;
  useRegisterKeybindingContext("Pane", isActive);
  useRegisterKeybindingContext("PaneField", isFieldActive);
  useRegisterKeybindingContext("AbovePromptInput", isInputTag);
  useRegisterKeybindingContext("AbovePromptSelect", isSelectTag);
  useRegisterOverlay("above-prompt-input", isInputTag);
  useRegisterOverlay("above-prompt-select", isSelectTag);
  let onEscape = pane.closeOnEscape ? closePaneAction : releaseFocus;
  let ringHandlers = wrapActHandlers(
    uiFocus,
    paneRing({
      ring: {
        focusables,
        focusIndexNow,
        focusByPerson: (index) =>
          uiFocus.moveByPerson({
            index,
            apply: () => land(index),
          }),
        leave: releaseFocus,
        submit: inputFields.submit,
      },
      engine: {
        tabCount,
        heldNow,
        hold: (index) => setHeldTab(tabTarget(index)),
        pick: (index) => showPaneById(otherPanes[index]?.id ?? pane.id),
        close: closePaneAction,
      },
      moveByPerson: uiFocus.moveByPerson,
      setIndex: (index) => {
        setFocusIndex(index);
        setScrollTick((tick) => tick + 1);
      },
      leave: () => {
        uiFocus.forget();
        onEscape();
      },
    }),
    ["abovePrompt:leave"],
  );
  let cyclePane = (direction) => showPaneById(cyclePaneId(paneRegistry().getState(), direction) ?? pane.id);
  let paneKeyHandlers = paneHandlers({
    ring: ringHandlers,
    scroll: paneBody,
    resize,
    close: closePaneAction,
  });
  useEffect(() => {
    inputFields.ringStep.current = (step) =>
      ringHandlers[step === "next" ? "pane:scrollDown" : "pane:scrollUp"]?.();
  });
  let selectHandlers = {
    ...ringHandlers,
    ...selectState.handlers,
  };
  function contextNow() {
    let focusedNowAtRender = isFocusedNow();
    let focused = pickOrNull(focusables, focusIndexNow());
    return focusedNowAtRender ? fieldContext(focused, "Pane") : null;
  }
  MessageActionsKeybindings(paneKeyHandlers, {
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
      "pane:next": () => cyclePane(1),
      "pane:previous": () => cyclePane(-1),
    },
    {
      context: "Global",
      isActive: hasTabs,
    },
  );
  MessageActionsKeybindings(
    {
      "pane:close": closePaneAction,
    },
    {
      context: "PaneField",
      isActive: isFieldActive,
    },
  );
  MessageActionsKeybindings(ringHandlers, {
    context: "AbovePromptInput",
    isActive: isInputTag,
  });
  MessageActionsKeybindings(selectHandlers, {
    context: "AbovePromptSelect",
    isActive: isSelectTag,
  });
  useKeysAheadOfRender({
    isAhead: () =>
      isFocusedNow() !== focused || focusIndexNow() !== focusIndexValue || heldNow() !== heldIndex,
    contextNow,
    focusedNow: () => pickOrNull(focusables, focusIndexNow()),
    contextRendered: () => (focused ? fieldContext(focusedHandle, "Pane") : null),
    focusedRendered: () => focusedHandle,
    handlers: {
      Pane: paneKeyHandlers,
      AbovePromptInput: ringHandlers,
      AbovePromptSelect: selectHandlers,
    },
    inputs: inputFields,
    selectKeys: selectState.intercept,
  });
  usePreDispatchKeyHandler(selectState.intercept, {
    isActive: isSelectTag,
  });
  useHotkeyPresses(hotkeys, isActive);
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
            children: jsxProd_default_2(Box, {
              ref,
              flexDirection: "column",
              flexShrink: 0,
              width: columns,
              onClick: focusClick(() => onClickFocus(null)),
              onWheel: hasAutoDialog ? undefined : onWheel,
              selectionScope: true,
              children: [
                jsxProd_default_2(Box, {
                  flexDirection: "column",
                  flexShrink: 0,
                  height: fill ? rows : undefined,
                  selectionScope: true,
                  borderStyle: hasBorder ? "round" : undefined,
                  borderDimColor: !focused,
                  borderTopDimColor: !focused && !lit,
                  borderTopColor: lit ? "suggestion" : undefined,
                  paddingX: hasBorder ? 1 : 0,
                  children: [
                    hasTabs
                      ? jsxProd_default(PaneTabs, {
                          open,
                          shownId: pane.id,
                          columns: columns_2,
                          heldId,
                          onPick: showPaneById,
                        })
                      : !hasBorder &&
                        jsxProd_default(Box, {
                          flexShrink: 0,
                          height: 1,
                        }),
                    jsxProd_default(Box, {
                      ref: scrollTargetRef,
                      backgroundColor: paneFill(pane.backgroundColor),
                      flexDirection: "column",
                      flexShrink: 0,
                      height: fill ? max : undefined,
                      maxHeight: max,
                      overflowY: "hidden",
                      children: jsxProd_default(PaneContent, {
                        content: contentRef,
                        offset,
                        columns: max_2,
                        rows: max,
                        keptColumns: 0,
                        children: jsxProd_default(BodyColumns, {
                          value: max_2,
                          children: drawing.node,
                        }),
                      }),
                    }),
                  ],
                }),
                jsxProd_default(CloseMark, {
                  inset: markInset,
                  isHeld,
                  onClose: closePaneAction,
                }),
              ],
            }),
          }),
        }),
      }),
    }),
  });
}
//@ chunk-czq1j3j2.js:534370-534994 placement
function PaneHost(props) {
  let panesAt = usePanesAtOnce(shownPane);
  let open = usePanesAtOnce(openPanes);
  let panesAt_2 = usePanesAtOnce(focusedPaneId);
  let hasAutoDialog = useHasAutoDialog();
  useEffect(() => {
    if (hasAutoDialog) focusPane(null);
  }, [hasAutoDialog]);
  useEffect(() => () => focusPane(null), []);
  if (!(panesAt !== undefined && props.rows > 0 && props.columns > 0)) return null;
  let instanceKey = {
    surface: "terminal",
    component: "Pane",
    requestId: panesAt.id,
  };
  let cachedTeller;
  let getTeller = () =>
    (cachedTeller ??= thrownTeller(renderModulesForInstance(instanceKey), renderDraws.held(instanceKey)));
  return jsxProd_default(
    SentryErrorBoundary,
    {
      telemetryMessage: () => firstThrowReport("Pane", getTeller(), "answer"),
      onError: (error) => {
        focusPane(null);
        closePane(panesAt.id, {
          kind: "unload",
        });
        tellThrown({
          component: "Pane",
          teller: getTeller(),
          error,
        });
      },
      children: jsxProd_default(PaneSite, {
        pane: panesAt,
        open,
        focused: panesAt_2 === panesAt.id,
        working: props.working,
        promptOwnsEscape: props.promptOwnsEscape,
        columns: props.columns,
        rows: props.rows,
        fill: props.fill,
        lit: props.lit,
        resize: props.resize,
      }),
    },
    `${panesAt.id} ${askCountFor("Pane", panesAt.id)}`,
  );
}
//@ chunk-czq1j3j2.js:534994-535102 placement
var roomStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:534994", () => {
  roomStore = identity(
    createStore({
      dockColumns: null,
      inlineRows: null,
    }),
    (store) =>
      store.setState(() => ({
        dockColumns: null,
        inlineRows: null,
      })),
  );
});
//@ chunk-czq1j3j2.js:535102-535222 placement
var chooseRoom = (patch) =>
  roomStore.setState((state) => {
    let next = {
      ...state,
      ...patch,
    };
    return next.dockColumns === state.dockColumns && next.inlineRows === state.inlineRows ? state : next;
  });
//@ chunk-czq1j3j2.js:535222-535561 placement
function keepRoom() {
  let state = roomStore.getState();
  saveGlobalConfigDurably((config) => {
    let pluginPanes = config.pluginPanes;
    let dockColumns = state.dockColumns ?? pluginPanes?.dockColumns;
    let inlineRows = state.inlineRows ?? pluginPanes?.inlineRows;
    return dockColumns === pluginPanes?.dockColumns && inlineRows === pluginPanes?.inlineRows
      ? config
      : {
          ...config,
          pluginPanes: {
            ...pluginPanes,
            dockColumns,
            inlineRows,
          },
        };
  }).then((saved) => {
    if (saved) logFeatureOk("plugin_function_hooks_pane_resize");
    else logFeatureSad("plugin_function_hooks_pane_resize", "not_persisted");
  });
}
//@ chunk-czq1j3j2.js:535561-535648 placement
function keptCells(cells) {
  return typeof cells === "number" && Number.isFinite(cells) && cells >= 1 ? Math.floor(cells) : null;
}
//@ chunk-czq1j3j2.js:535648-535683 placement
var keptLatch; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:535648", () => {
  keptLatch = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-czq1j3j2.js:535683-535841 placement
function keptRoom() {
  let cached = keptLatch.get();
  if (cached !== undefined) return cached;
  let pluginPanes = getGlobalConfig().pluginPanes;
  let room = {
    dockColumns: keptCells(pluginPanes?.dockColumns),
    inlineRows: keptCells(pluginPanes?.inlineRows),
  };
  keptLatch.set(room);
  return room;
}
//@ chunk-czq1j3j2.js:535841-535909 placement
function requestedColumns(state) {
  let columns = shownPane(state)?.columns;
  return columns === undefined ? undefined : columns + DOCK_GRIP_COLUMNS;
}
//@ chunk-czq1j3j2.js:535909-535999 placement
var useDockColumns = (columns) =>
  dockColumns(columns, {
    chosen: useStoreSelector(roomStore, (state) => state.dockColumns) ?? keptRoom().dockColumns,
    requested: usePanesAtOnce(requestedColumns),
  });
//@ chunk-czq1j3j2.js:535999-536087 placement
function requestedRows(state) {
  let rows = shownPane(state)?.rows;
  if (rows === undefined) return;
  return rows + chromeRows(state.open.length > 1, true);
}
//@ chunk-czq1j3j2.js:536087-536179 placement
var useInlineRows = (rows, mode) =>
  inlineRows(rows, mode, {
    chosen: useStoreSelector(roomStore, (state) => state.inlineRows) ?? keptRoom().inlineRows,
    requested: usePanesAtOnce(requestedRows),
  });
//@ chunk-czq1j3j2.js:536179-536614 placement
var RowGrip = (props) => {
  let $ = useMemoCache(6);
  let gripProps;
  if (
    $[0] !== props.columns ||
    $[1] !== props.grip.onMouseEnter ||
    $[2] !== props.grip.onMouseLeave ||
    $[3] !== props.grip.onPointer ||
    $[4] !== props.left
  ) {
    gripProps = jsxProd_default(Box, {
      position: "absolute",
      top: 0,
      left: props.left,
      width: props.columns,
      height: 1,
      onPointer: props.grip.onPointer,
      onMouseEnter: props.grip.onMouseEnter,
      onMouseLeave: props.grip.onMouseLeave,
    });
    $[0] = props.columns;
    $[1] = props.grip.onMouseEnter;
    $[2] = props.grip.onMouseLeave;
    $[3] = props.grip.onPointer;
    $[4] = props.left;
    $[5] = gripProps;
  } else gripProps = $[5];
  return gripProps;
};
//@ chunk-czq1j3j2.js:536618-536762 placement
function useResize(props) {
  let { cells, step, resizeTo } = props;
  return useMemo(() => {
    let makeStep = (step) => () => {
      if (resizeTo(cells + step) !== cells) keepRoom();
    };
    return {
      grow: makeStep(step),
      shrink: makeStep(-step),
    };
  }, [cells, step, resizeTo]);
}
//@ chunk-czq1j3j2.js:536762-538333 placement
function InlinePanes(props) {
  let $ = useMemoCache(24);
  let { rows, columns } = useTerminalSize();
  let mode = useRenderMode();
  let inlineRowsValue = PaneDockNamespace6.useInlineRows(rows, mode);
  let containerRef = useRef(null);
  let measureHeight;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    measureHeight = () => (containerRef.current === null ? 0 : measureElement(containerRef.current).height);
    $[0] = measureHeight;
  } else measureHeight = $[0];
  let measured = useMeasured(measureHeight);
  let cells = measured > 0 ? Math.min(inlineRowsValue, measured) : inlineRowsValue;
  let panesAt = usePanesAtOnce(hasShownPane);
  let isInline = !props.docked;
  let resizeTo;
  if ($[1] !== inlineRowsValue || $[2] !== mode || $[3] !== rows) {
    resizeTo = (chosen) => {
      let nextRows = inlineRows(rows, mode, {
        chosen,
      });
      if (PaneDockNamespace6.roomStore.getState().inlineRows !== null || nextRows !== inlineRowsValue)
        PaneDockNamespace6.chooseRoom({
          inlineRows: nextRows,
        });
      return nextRows;
    };
    $[1] = inlineRowsValue;
    $[2] = mode;
    $[3] = rows;
    $[4] = resizeTo;
  } else resizeTo = $[4];
  let resizeToInlineRows = resizeTo;
  let props_2;
  if ($[5] !== cells || $[6] !== resizeToInlineRows) {
    props_2 = {
      cells,
      step: PaneDockNamespace5.INLINE_KEY_ROWS,
      resizeTo: resizeToInlineRows,
    };
    $[5] = cells;
    $[6] = resizeToInlineRows;
    $[7] = props_2;
  } else props_2 = $[7];
  let resize = useResize(props_2);
  let props_3;
  if ($[8] !== cells || $[9] !== resizeToInlineRows) {
    props_3 = {
      axis: "row",
      cells,
      onResize: resizeToInlineRows,
      onSettle: PaneDockNamespace6.keepRoom,
    };
    $[8] = cells;
    $[9] = resizeToInlineRows;
    $[10] = props_3;
  } else props_3 = $[10];
  let grip = useGrip(props_3);
  let max = Math.max(0, columns - PaneDockNamespace2.BORDER_MARK_INSET - PaneDockNamespace2.CLOSE_MARK_CELLS);
  let offerPlacement;
  let offerDeps;
  if ($[11] !== isInline) {
    offerPlacement = () => (isInline ? EMPTY_PANES.offerPlacement() : undefined);
    offerDeps = [isInline];
    $[11] = isInline;
    $[12] = offerPlacement;
    $[13] = offerDeps;
  } else {
    offerPlacement = $[12];
    offerDeps = $[13];
  }
  useEffect(offerPlacement, offerDeps);
  let contentElement;
  if (
    $[14] !== inlineRowsValue ||
    $[15] !== columns ||
    $[16] !== grip ||
    $[17] !== panesAt ||
    $[18] !== isInline ||
    $[19] !== max ||
    $[20] !== props.promptOwnsEscape ||
    $[21] !== props.working ||
    $[22] !== resize
  ) {
    contentElement = isInline
      ? jsxProd_default_2(Box, {
          ref: containerRef,
          flexDirection: "column",
          flexShrink: 0,
          width: columns,
          children: [
            jsxProd_default(PaneHost, {
              columns,
              rows: inlineRowsValue,
              fill: false,
              lit: grip.isLit,
              resize,
              working: props.working,
              promptOwnsEscape: props.promptOwnsEscape,
            }),
            panesAt &&
              inlineRowsValue > 0 &&
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
    $[14] = inlineRowsValue;
    $[15] = columns;
    $[16] = grip;
    $[17] = panesAt;
    $[18] = isInline;
    $[19] = max;
    $[20] = props.promptOwnsEscape;
    $[21] = props.working;
    $[22] = resize;
    $[23] = contentElement;
  } else contentElement = $[23];
  return contentElement;
}
//@ chunk-czq1j3j2.js:538337-539586 placement
function PaneDock(props) {
  let $ = useMemoCache(19);
  let { columns } = useTerminalSize();
  let containerRef = useRef(null);
  let measureHeight;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    measureHeight = () => (containerRef.current === null ? 0 : measureElement(containerRef.current).height);
    $[0] = measureHeight;
  } else measureHeight = $[0];
  let rows = useMeasured(measureHeight);
  let resizeTo;
  if ($[1] !== columns) {
    resizeTo = (chosen) => {
      let nextColumns = dockColumns(columns, {
        chosen,
      });
      PaneDockNamespace6.chooseRoom({
        dockColumns: nextColumns,
      });
      return nextColumns;
    };
    $[1] = columns;
    $[2] = resizeTo;
  } else resizeTo = $[2];
  let resizeToDockColumns = resizeTo;
  let props_2;
  if ($[3] !== props.width || $[4] !== resizeToDockColumns) {
    props_2 = {
      cells: props.width,
      step: PaneDockNamespace3.DOCK_KEY_COLUMNS,
      resizeTo: resizeToDockColumns,
    };
    $[3] = props.width;
    $[4] = resizeToDockColumns;
    $[5] = props_2;
  } else props_2 = $[5];
  let resize = useResize(props_2);
  let isFocused = usePanesAtOnce(isHoldingKeys);
  let offerPlacement;
  let offerDeps;
  if ($[6] !== props.isOffered) {
    offerPlacement = () => (props.isOffered ? EMPTY_PANES.offerPlacement() : undefined);
    offerDeps = [props.isOffered];
    $[6] = props.isOffered;
    $[7] = offerPlacement;
    $[8] = offerDeps;
  } else {
    offerPlacement = $[7];
    offerDeps = $[8];
  }
  useEffect(offerPlacement, offerDeps);
  let backgroundColor = useDockFill();
  let isHidden = props.width <= 0;
  let dockElement;
  if (
    $[9] !== backgroundColor ||
    $[10] !== isFocused ||
    $[11] !== isHidden ||
    $[12] !== props.promptOwnsEscape ||
    $[13] !== props.width ||
    $[14] !== props.working ||
    $[15] !== resize ||
    $[16] !== resizeToDockColumns ||
    $[17] !== rows
  ) {
    dockElement = isHidden
      ? null
      : jsxProd_default_2(Box, {
          ref: containerRef,
          flexGrow: 1,
          flexDirection: "row",
          width: props.width,
          backgroundColor,
          children: [
            jsxProd_default(DockGrip, {
              columns: props.width,
              onResize: resizeToDockColumns,
              onSettle: PaneDockNamespace6.keepRoom,
              isFocused,
            }),
            jsxProd_default(Box, {
              flexGrow: 1,
              flexDirection: "column",
              children: jsxProd_default(PaneHost, {
                columns: props.width - PaneDockNamespace3.DOCK_GRIP_COLUMNS,
                rows,
                fill: true,
                lit: false,
                resize,
                working: props.working,
                promptOwnsEscape: props.promptOwnsEscape,
              }),
            }),
          ],
        });
    $[9] = backgroundColor;
    $[10] = isFocused;
    $[11] = isHidden;
    $[12] = props.promptOwnsEscape;
    $[13] = props.width;
    $[14] = props.working;
    $[15] = resize;
    $[16] = resizeToDockColumns;
    $[17] = rows;
    $[18] = dockElement;
  } else dockElement = $[18];
  return dockElement;
}
//@ chunk-czq1j3j2.js:539586-540026 placement
function dealBarToasts(options) {
  let { clock, store, pending, last } = options;
  let queueView = pluginToastQueueView(
    store.getState().notifications,
    holdsToasts_2(store.getState()),
    TOAST_DEFAULT_MS,
  );
  let plan = planBarToasts(mergeToastLedgers(last.current, readBarToasts()), queueView, clock.now());
  pending.current?.();
  saveBarToasts(plan.ledger);
  last.current = plan.ledger;
  plan.lost.forEach(logToastTimeLost);
  store.setState((state) => {
    let notifications = rekeyToastQueue(state.notifications, plan.texts);
    return notifications === state.notifications
      ? state
      : {
          ...state,
          notifications,
        };
  });
  pending.current = [shownToastEndsAt(plan.ledger)]
    .flatMap((finishAt) => finishAt ?? [])
    .map((finishAt) => clock.setTimeout(() => dealBarToasts(options), finishAt - clock.now()))
    .at(0);
}
//@ chunk-czq1j3j2.js:540030-540336 placement
function useBarToasts() {
  let clock = useClock();
  let appStoreDirect = useAppStoreDirect();
  let pendingRef = useRef(undefined);
  let last = useRef(EMPTY_BAR_TOASTS);
  let toastKey = useAppState((state) =>
    [state.notifications.current, ...state.notifications.queue].map((toast) => toast?.key).join(" "),
  );
  let appState = useAppState(holdsToasts_2);
  let barToastKey = useStoreSelector(stateSession().values, (values) =>
    readBarToasts(values)
      .toasts.map((toast) => toast.key)
      .join(" "),
  );
  useEffect(() => {
    dealBarToasts({
      clock,
      store: appStoreDirect,
      pending: pendingRef,
      last,
    });
    return () => pendingRef.current?.();
  }, [clock, appStoreDirect, toastKey, appState, barToastKey]);
}
//@ chunk-czq1j3j2.js:540340-540558 placement
function usePaneToastHold() {
  let storeSelector = useStoreSelector(paneRegistry(), holdsToasts);
  let setAppState = useSetAppState();
  let { processQueue } = useNotifications();
  useEffect(() => {
    if (!storeSelector) return;
    setAppState((state) =>
      state.paneHoldsToasts
        ? state
        : {
            ...state,
            paneHoldsToasts: true,
          },
    );
    return () => {
      setAppState((state) =>
        state.paneHoldsToasts
          ? {
              ...state,
              paneHoldsToasts: false,
            }
          : state,
      );
      processQueue();
    };
  }, [storeSelector, setAppState, processQueue]);
}
export { DOCK_MIN_COLUMNS, PaneDockNamespace, computeMaxDockColumns };
