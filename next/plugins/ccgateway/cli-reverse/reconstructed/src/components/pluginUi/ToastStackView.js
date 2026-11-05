/**
 * components/pluginUi/ToastStackView.tsx
 *
 * 2.1.316 新增。插件 toast 堆叠视图。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (36)
 * attribution: placement 36
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  init_react_production,
  useEffect,
  useState,
  useContext,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import { max } from "../PromptInput/promptInputState.js";
import { DOCK_MIN_COLUMNS } from "./PaneDock.js";
import { useAutoDialogKindAlt } from "../../screens/repl/storeHooks.js";
import { useDialogSelector, topAutoDialog } from "../../state/dialogQueue.js";
import { MCP_ELICITATION_DIALOG } from "../../services/mcp/elicitationDialogs.js";
import { hasPluginUserConfig } from "../../plugins/bundled/claudeTest/userConfig.js";
import { drawnToasts, TOAST_FADE_MS, toastStackNamespace, pauseToasts } from "./toastStack.js";
import { toldRefusals } from "../../plugins/functionHooks/ui/renderNotices.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { countWhere } from "../../utils/collections.js";
import { sayPlainCode, logLine, loadOf, leadOf } from "../../plugins/functionHooks/ui/renderDispatch.js";
import { errorMessage } from "../../utils/errors.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { wrapText } from "../../ink/wrap-text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { TranscriptOverlaySlot } from "../FullscreenLayout.js";
import { useMeasured } from "../../ink/components/Input.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { paneRegistry, holdsToasts } from "../../plugins/functionHooks/panes.js";
import { EMPTY_STATE_EXPORTS } from "../../plugins/functionHooks/api/state.js";
import { SentryErrorBoundary } from "../SentryErrorBoundary.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:38320-38330 placement
var ToastStackViewNamespace = {};
//@ chunk-czq1j3j2.js:38330-38835 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:38330", () => {
  __export(ToastStackViewNamespace, {
    DrawnNote: () => DrawnNote,
    TOAST_BOX_COLUMNS: () => TOAST_BOX_COLUMNS,
    TOAST_EDGE_COLUMNS: () => TOAST_EDGE_COLUMNS,
    TOAST_FRAME_COLUMNS: () => TOAST_FRAME_COLUMNS,
    TOAST_FRAME_MS: () => TOAST_FRAME_MS,
    TOAST_RESERVED_ROWS: () => TOAST_RESERVED_ROWS,
    TOAST_STACK_VISIBLE: () => TOAST_STACK_VISIBLE,
    TOAST_TEXT_ROWS: () => TOAST_TEXT_ROWS,
    ToastBox: () => ToastBox,
    ToastBoxes: () => ToastBoxes,
    ToastStackView: () => ToastStackView,
    default: () => ToastStackViewNamespace,
    firstToastsReport: () => firstToastsReport,
    fittingToasts: () => fittingToasts,
    seatedToasts: () => seatedToasts,
    slideColumnsOf: () => slideColumnsOf,
    stackedTops: () => stackedTops,
    tellToastsThrown: () => tellToastsThrown,
    toastShapeOf: () => toastShapeOf,
    toastsTeller: () => toastsTeller,
    useSlideColumns: () => useSlideColumns,
    useToastPause: () => useToastPause,
  });
});
//@ chunk-czq1j3j2.js:1857557-1857561 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1857557", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1857610-1857614 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1857610", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1858013-1858017 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1858013", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1858321-1858343 placement
var TOAST_MIN_VISIBLE_COLUMNS; // deferred: uses MAX_DEFAULT_TRUNCATE_LINES (../PromptInput/promptInputState.js) of its import cycle while loading; runs once the cycle is complete
var TOAST_RESERVED_COLUMNS;
deferInit("chunk-czq1j3j2.js:1858321", () => {
  TOAST_MIN_VISIBLE_COLUMNS = 72;
  TOAST_RESERVED_COLUMNS = TOAST_MIN_VISIBLE_COLUMNS + max;
});
//@ chunk-czq1j3j2.js:1858343-1858407 placement
function fitToastWidth(requestedColumns, columns) {
  let availableColumns = columns - TOAST_RESERVED_COLUMNS;
  if (requestedColumns <= availableColumns) return requestedColumns;
  return availableColumns >= DOCK_MIN_COLUMNS ? availableColumns : 0;
}
//@ chunk-czq1j3j2.js:1858407-1858474 placement
function toastRegionWidth(isShown, columns, terminalColumns) {
  let hasPluginConfigDialog = useHasPluginConfigDialog();
  if (!isShown) return 0;
  return hasPluginConfigDialog ? fitToastWidth(columns, terminalColumns) : columns;
}
//@ chunk-czq1j3j2.js:1858474-1858786 placement
/**
 * 当前是否显示插件 MCP 用户配置对话框。
 */
function useHasPluginConfigDialog() {
  let hasAutoDialog = useAutoDialogKindAlt() !== undefined;
  let isPluginConfigDialog = useDialogSelector((dialogState) => {
    let dialog = topAutoDialog(dialogState);
    if (dialog === null || dialog.kind !== MCP_ELICITATION_DIALOG.kind) return false;
    let payload = dialog.payload;
    return (
      typeof payload === "object" &&
      payload !== null &&
      "serverName" in payload &&
      typeof payload.serverName === "string" &&
      "pluginSource" in payload &&
      typeof payload.pluginSource === "string" &&
      hasPluginUserConfig(payload.serverName, payload.pluginSource)
    );
  });
  return hasAutoDialog && isPluginConfigDialog;
}
//@ chunk-czq1j3j2.js:1858786-1858790 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1858786", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1858790-1858846 placement
function DrawnNote({ id }) {
  useEffect(() => {
    drawnToasts.add(id);
  }, [id]);
  return null;
}
//@ chunk-czq1j3j2.js:1858846-1859055 placement
function firstToastsReport(error) {
  let reportKey = `reported ${error.load} ${error.lead} ui.toast`;
  if (toldRefusals.has(reportKey)) return null;
  toldRefusals.add(reportKey);
  logFeatureBad("plugin_function_hooks_toast_stack", "threw_while_drawn");
  return "ui.toast: the toast stack threw while drawn";
}
//@ chunk-czq1j3j2.js:1859055-1859123 placement
var stackedTops = (sizes, start) =>
  sizes.map((size, index) => start + sizes.slice(0, index).reduce((acc, size) => acc + size, 0));
//@ chunk-czq1j3j2.js:1859123-1859325 placement
function fittingToasts(layout) {
  let { heights, mostBoxes, roomRows } = layout;
  let sizes = heights.toReversed().slice(0, mostBoxes);
  let tops = stackedTops(sizes, 0);
  return Math.min(
    heights.length,
    Math.max(
      1,
      countWhere(
        sizes.map(
          (height, index) => (tops[index] ?? 0) + height + (heights.length > index + 1 ? 1 : 0) <= roomRows,
        ),
        (fits) => fits,
      ),
    ),
  );
}
//@ chunk-czq1j3j2.js:1859325-1859625 placement
function seatedToasts(toasts) {
  let placeById = new Map(toasts.map((toast, index) => [toast.id, index]));
  return [...Map.groupBy(toasts, (toast) => toast.owner).values()]
    .flatMap((owned) =>
      owned.map((toast, index) => ({
        toast,
        turn: owned.length - index,
        place: placeById.get(toast.id) ?? 0,
      })),
    )
    .toSorted(
      (a, b) => Number(a.toast.isManaged) - Number(b.toast.isManaged) || b.turn - a.turn || a.place - b.place,
    )
    .map((seated) => seated.toast);
}
//@ chunk-czq1j3j2.js:1859625-1859730 placement
function slideColumnsOf(animation) {
  let max = Math.max(0, animation.at - animation.shownAt);
  return animation.isStill || max >= TOAST_FADE_MS
    ? 0
    : Math.ceil(animation.columns * (1 - max / TOAST_FADE_MS));
}
//@ chunk-czq1j3j2.js:1859730-1859916 placement
var tellToastsThrown = (error, thrown) =>
  sayPlainCode({
    key: `${error.load} ${error.lead} ui.toast threw while drawn`,
    lead: error.lead,
    text: `ui.toast threw while drawn: ${logLine(String(errorMessage(thrown)))}; no toast is drawn until the stack changes`,
  });
//@ chunk-czq1j3j2.js:1859916-1859920 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1859916", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1859920-1859924 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1859920", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1859924-1859935 placement
var TOAST_FRAME_MS = 48;
//@ chunk-czq1j3j2.js:1859935-1860108 placement
function useSlideColumns(animation) {
  let [now, setNow] = useState(Date.now);
  let slideColumns = slideColumnsOf({
    ...animation,
    at: now,
  });
  useEffect(() => {
    if (slideColumns === 0) return;
    let timer = setTimeout(
      (setNow) => {
        setNow(Date.now());
      },
      TOAST_FRAME_MS,
      setNow,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [now, slideColumns]);
  return slideColumns;
}
//@ chunk-czq1j3j2.js:1860108-1861850 placement
function ToastBox(props) {
  let $ = useMemoCache(31);
  let { toast, shape, top, isFramed } = props;
  let [isHovered, setIsHovered] = useState(false);
  const shownAt = toast.shownAt;
  const columns = shape.columns;
  const isStill = usePrefersReducedMotion() || !isFramed;
  let animation;
  if ($[0] !== shape.columns || $[1] !== isStill || $[2] !== toast.shownAt) {
    animation = {
      shownAt,
      columns,
      isStill,
    };
    $[0] = shape.columns;
    $[1] = isStill;
    $[2] = toast.shownAt;
    $[3] = animation;
  } else animation = $[3];
  let slideColumns = useSlideColumns(animation);
  let dimColor = toast.phase === "leaving";
  let releaseHoldEffect;
  let releaseHoldDeps;
  if ($[4] !== toast.id) {
    releaseHoldEffect = () => () =>
      toastStackNamespace.holdToast({
        id: toast.id,
        isHeld: false,
      });
    releaseHoldDeps = [toast.id];
    $[4] = toast.id;
    $[5] = releaseHoldEffect;
    $[6] = releaseHoldDeps;
  } else {
    releaseHoldEffect = $[5];
    releaseHoldDeps = $[6];
  }
  useEffect(releaseHoldEffect, releaseHoldDeps);
  const right = -slideColumns;
  const { columns: columns_2, rows } = shape;
  const borderStyle = isFramed ? "round" : undefined;
  const borderDimColor = !isHovered;
  const paddingX = isFramed ? 1 : 0;
  let onClick;
  let onMouseEnter;
  let onMouseLeave;
  if ($[7] !== toast.id) {
    onClick = (event) => {
      event.stopImmediatePropagation();
      if (!event.isWindowActivation) toastStackNamespace.dismissToast(toast.id);
    };
    onMouseEnter = () => {
      setIsHovered(true);
      toastStackNamespace.holdToast({
        id: toast.id,
        isHeld: true,
      });
    };
    onMouseLeave = () => {
      setIsHovered(false);
      toastStackNamespace.holdToast({
        id: toast.id,
        isHeld: false,
      });
    };
    $[7] = toast.id;
    $[8] = onClick;
    $[9] = onMouseEnter;
    $[10] = onMouseLeave;
  } else {
    onClick = $[8];
    onMouseEnter = $[9];
    onMouseLeave = $[10];
  }
  let pluginLabel;
  if ($[11] !== toast.plugin) {
    pluginLabel = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: toast.plugin,
    });
    $[11] = toast.plugin;
    $[12] = pluginLabel;
  } else pluginLabel = $[12];
  let lineElements;
  if ($[13] !== dimColor || $[14] !== shape.lines) {
    let renderLine;
    if ($[16] !== dimColor) {
      renderLine = (children, key) =>
        jsxProd_default(
          Text,
          {
            dimColor,
            wrap: "truncate-end",
            children,
          },
          key,
        );
      $[16] = dimColor;
      $[17] = renderLine;
    } else renderLine = $[17];
    lineElements = shape.lines.map(renderLine);
    $[13] = dimColor;
    $[14] = shape.lines;
    $[15] = lineElements;
  } else lineElements = $[15];
  let toastBox;
  if (
    $[18] !== shape.columns ||
    $[19] !== shape.rows ||
    $[20] !== borderDimColor ||
    $[21] !== paddingX ||
    $[22] !== onClick ||
    $[23] !== onMouseEnter ||
    $[24] !== onMouseLeave ||
    $[25] !== pluginLabel ||
    $[26] !== lineElements ||
    $[27] !== right ||
    $[28] !== borderStyle ||
    $[29] !== top
  ) {
    toastBox = jsxProd_default_2(Box, {
      position: "absolute",
      top,
      right,
      width: columns_2,
      height: rows,
      flexDirection: "column",
      borderStyle,
      borderDimColor,
      paddingX,
      opaque: true,
      noSelect: true,
      onClick,
      onMouseEnter,
      onMouseLeave,
      children: [pluginLabel, lineElements],
    });
    $[18] = shape.columns;
    $[19] = shape.rows;
    $[20] = borderDimColor;
    $[21] = paddingX;
    $[22] = onClick;
    $[23] = onMouseEnter;
    $[24] = onMouseLeave;
    $[25] = pluginLabel;
    $[26] = lineElements;
    $[27] = right;
    $[28] = borderStyle;
    $[29] = top;
    $[30] = toastBox;
  } else toastBox = $[30];
  return toastBox;
}
//@ chunk-czq1j3j2.js:1861850-1861861 placement
var TOAST_BOX_COLUMNS = 44;
//@ chunk-czq1j3j2.js:1861861-1861865 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1861861", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1861865-1861875 placement
var TOAST_EDGE_COLUMNS = 2;
//@ chunk-czq1j3j2.js:1861875-1861885 placement
var TOAST_RESERVED_ROWS = 8;
//@ chunk-czq1j3j2.js:1861885-1861895 placement
var TOAST_FRAME_COLUMNS = 4;
//@ chunk-czq1j3j2.js:1861895-1861905 placement
var TOAST_TEXT_ROWS = 3;
//@ chunk-czq1j3j2.js:1861905-1862240 placement
function toastShapeOf(options) {
  let { toast, roomColumns, isFramed } = options;
  let frameWidth = isFramed ? TOAST_FRAME_COLUMNS : 0;
  let max = Math.max(1, Math.min(roomColumns, TOAST_BOX_COLUMNS));
  let lines = wrapText(toast.text, Math.max(1, max - frameWidth), "wrap").split(`
`);
  let filtered = [...lines.slice(0, TOAST_TEXT_ROWS - 1), lines.slice(TOAST_TEXT_ROWS - 1).join(" ")].filter(
    (line, index) => index === 0 || line !== "",
  );
  return {
    columns: Math.min(
      max,
      Math.max(bunStringWidth(toast.plugin), ...filtered.map(bunStringWidth)) + frameWidth,
    ),
    lines: filtered,
    rows: filtered.length + 1 + (isFramed ? 2 : 0),
  };
}
//@ chunk-czq1j3j2.js:1862240-1862250 placement
var TOAST_STACK_VISIBLE = 3;
//@ chunk-czq1j3j2.js:1862250-1862282 placement
function selectRows(shape) {
  return shape.rows;
}
//@ chunk-czq1j3j2.js:1862282-1862330 placement
function renderToastNote(toast) {
  return jsxProd_default(
    DrawnNote,
    {
      id: toast.id,
    },
    toast.id,
  );
}
//@ chunk-czq1j3j2.js:1862330-1863922 placement
function ToastBoxes(props) {
  let $ = useMemoCache(26);
  let { toasts, isPaused } = props;
  let isFramed = !useIsScreenReaderEnabled();
  let { columns, rows } = useTerminalSize();
  let overlayOffset = useContext(TranscriptOverlaySlot);
  let containerRef = useRef(null);
  let measureHeight;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    measureHeight = () => containerRef.current?.yogaNode?.getComputedHeight() ?? 0;
    $[0] = measureHeight;
  } else measureHeight = $[0];
  let measured = useMeasured(measureHeight);
  if (isPaused || toasts.length === 0) {
    return null;
  }
  let roomColumns = Math.max(1, columns - TOAST_EDGE_COLUMNS);
  let visibleIds;
  if (
    $[1] !== measured ||
    $[2] !== overlayOffset ||
    $[3] !== isFramed ||
    $[4] !== roomColumns ||
    $[5] !== rows ||
    $[6] !== toasts
  ) {
    let seated = seatedToasts(toasts);
    let shapeRows;
    if ($[8] !== isFramed || $[9] !== roomColumns) {
      shapeRows = (toast) =>
        toastShapeOf({
          toast,
          roomColumns,
          isFramed,
        }).rows;
      $[8] = isFramed;
      $[9] = roomColumns;
      $[10] = shapeRows;
    } else shapeRows = $[10];
    visibleIds = new Set(
      seated.slice(
        -fittingToasts({
          heights: seated.map(shapeRows),
          mostBoxes: TOAST_STACK_VISIBLE,
          roomRows: (measured > 0 ? measured : rows - TOAST_RESERVED_ROWS) - overlayOffset,
        }),
      ),
    );
    $[1] = measured;
    $[2] = overlayOffset;
    $[3] = isFramed;
    $[4] = roomColumns;
    $[5] = rows;
    $[6] = toasts;
    $[7] = visibleIds;
  } else visibleIds = $[7];
  let visibleIdSet = visibleIds;
  let content;
  if (
    $[11] !== visibleIdSet ||
    $[12] !== overlayOffset ||
    $[13] !== isFramed ||
    $[14] !== roomColumns ||
    $[15] !== toasts
  ) {
    let isVisible;
    if ($[17] !== visibleIdSet) {
      isVisible = (toast) => visibleIdSet.has(toast);
      $[17] = visibleIdSet;
      $[18] = isVisible;
    } else isVisible = $[18];
    let filtered = toasts.filter(isVisible);
    let hiddenCount = toasts.length - filtered.length;
    let shapeOf;
    if ($[19] !== isFramed || $[20] !== roomColumns) {
      shapeOf = (toast) =>
        toastShapeOf({
          toast,
          roomColumns,
          isFramed,
        });
      $[19] = isFramed;
      $[20] = roomColumns;
      $[21] = shapeOf;
    } else shapeOf = $[21];
    let mapped = filtered.map(shapeOf);
    let tops = stackedTops(mapped.map(selectRows), overlayOffset + (hiddenCount > 0 ? 1 : 0));
    let placeholderBox;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      placeholderBox = jsxProd_default(Box, {
        ref: containerRef,
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: 0,
      });
      $[22] = placeholderBox;
    } else placeholderBox = $[22];
    let moreIndicator;
    if ($[23] !== overlayOffset || $[24] !== hiddenCount) {
      moreIndicator =
        hiddenCount > 0 &&
        jsxProd_default(Box, {
          position: "absolute",
          top: overlayOffset,
          right: 0,
          opaque: true,
          noSelect: true,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: ` +${hiddenCount} more `,
          }),
        });
      $[23] = overlayOffset;
      $[24] = hiddenCount;
      $[25] = moreIndicator;
    } else moreIndicator = $[25];
    content = jsxProd_default_2(Fragment, {
      children: [
        placeholderBox,
        moreIndicator,
        filtered.map((toast, index) =>
          jsxProd_default(
            ToastBox,
            {
              toast,
              shape: mapped[index] ?? {
                columns: 1,
                lines: [],
                rows: 1,
              },
              top: tops[index] ?? 0,
              isFramed,
            },
            toast.id,
          ),
        ),
        filtered.map(renderToastNote),
      ],
    });
    $[11] = visibleIdSet;
    $[12] = overlayOffset;
    $[13] = isFramed;
    $[14] = roomColumns;
    $[15] = toasts;
    $[16] = content;
  } else content = $[16];
  return content;
}
//@ chunk-czq1j3j2.js:1863922-1864053 placement
function toastsTeller(storeSelector) {
  let owners = new Set(storeSelector.map((toast) => toast.owner));
  return {
    load: loadOf(getPluginRegistry().loadedModules.filter((loadedModule) => owners.has(loadedModule.name))),
    lead: leadOf([...owners]),
  };
}
//@ chunk-czq1j3j2.js:1864057-1864156 placement
function useToastPause() {
  let storeSelector = useStoreSelector(paneRegistry(), holdsToasts);
  useEffect(() => {
    pauseToasts({
      isPaused: storeSelector,
    });
    return () => {
      pauseToasts({
        isPaused: false,
      });
    };
  }, [storeSelector]);
  return storeSelector;
}
//@ chunk-czq1j3j2.js:1864156-1864662 placement
function ToastStackView() {
  let $ = useMemoCache(12);
  let sessionState;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    sessionState = EMPTY_STATE_EXPORTS.stateSession();
    $[0] = sessionState;
  } else sessionState = $[0];
  let storeSelector = useStoreSelector(sessionState.values, toastStackNamespace.stackedToasts);
  let isPaused = useToastPause();
  let telemetryMessage;
  let onError;
  if ($[1] !== storeSelector) {
    telemetryMessage = () => firstToastsReport(toastsTeller(storeSelector));
    onError = (error) => tellToastsThrown(toastsTeller(storeSelector), error);
    $[1] = storeSelector;
    $[2] = telemetryMessage;
    $[3] = onError;
  } else {
    telemetryMessage = $[2];
    onError = $[3];
  }
  let children;
  if ($[4] !== isPaused || $[5] !== storeSelector) {
    children = jsxProd_default(ToastBoxes, {
      toasts: storeSelector,
      isPaused,
    });
    $[4] = isPaused;
    $[5] = storeSelector;
    $[6] = children;
  } else children = $[6];
  let boundaryElement;
  if ($[7] !== telemetryMessage || $[8] !== onError || $[9] !== children || $[10] !== storeSelector) {
    boundaryElement = jsxProd_default(SentryErrorBoundary, {
      resetKey: storeSelector,
      telemetryMessage,
      onError,
      children,
    });
    $[7] = telemetryMessage;
    $[8] = onError;
    $[9] = children;
    $[10] = storeSelector;
    $[11] = boundaryElement;
  } else boundaryElement = $[11];
  return boundaryElement;
}
export { toastRegionWidth, ToastStackViewNamespace };
