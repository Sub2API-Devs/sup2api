/**
 * components/pluginUi/ToastStackView.tsx
 *
 * 2.1.316 新增。插件 toast 堆叠视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (36)
 * attribution: placement 36
 */
import { Ar, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { max } from "../PromptInput/promptInputState.js";
import { DOCK_MIN_COLUMNS } from "./PaneDock.js";
import { useAutoDialogKindAlt } from "../../screens/repl/storeHooks.js";
import { useDialogSelector, topAutoDialog } from "../../state/dialogQueue.js";
import { MCP_ELICITATION_DIALOG } from "../../services/mcp/elicitationDialogs.js";
import { hasPluginUserConfig } from "../../plugins/bundled/claudeTest/userConfig.js";
import { init_react_production, P, y, Se, R } from "../../../vendor/react/cjs/react.production.js";
import { drawnToasts, TOAST_FADE_MS, toastStackNamespace, pauseToasts } from "./toastStack.js";
import { toldRefusals } from "../../plugins/functionHooks/ui/renderNotices.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { count } from "../../utils/collections.js";
import { sayPlainCode, logLine, loadOf, leadOf } from "../../plugins/functionHooks/ui/renderDispatch.js";
import { errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-18hwfzwa.js:36759-36769 placement
var ToastStackViewNamespace = {};
//@ chunk-18hwfzwa.js:36769-37274 placement
Ar(ToastStackViewNamespace, {
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
//@ chunk-18hwfzwa.js:1810342-1810364 placement
var TOAST_MIN_VISIBLE_COLUMNS = 72;
var TOAST_RESERVED_COLUMNS = TOAST_MIN_VISIBLE_COLUMNS + max;
//@ chunk-18hwfzwa.js:1810364-1810428 placement
function fitToastWidth(h, x) {
  let D = x - TOAST_RESERVED_COLUMNS;
  if (h <= D) return h;
  return D >= DOCK_MIN_COLUMNS ? D : 0;
}
//@ chunk-18hwfzwa.js:1810428-1810495 placement
function toastRegionWidth(h, x, D) {
  let hasPluginConfigDialog = useHasPluginConfigDialog();
  if (!h) return 0;
  return hasPluginConfigDialog ? fitToastWidth(x, D) : x;
}
//@ chunk-18hwfzwa.js:1810495-1810806 placement
/**
 * 当前是否显示插件 MCP 用户配置对话框。
 */
function useHasPluginConfigDialog() {
  let h = useAutoDialogKindAlt() !== undefined;
  let x = useDialogSelector((D) => {
    let L = topAutoDialog(D);
    if (L === null || L.kind !== MCP_ELICITATION_DIALOG.kind) return false;
    let payload = L.payload;
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
  return h && x;
}
//@ chunk-18hwfzwa.js:1810806-1810810 placement
init_react_production();
//@ chunk-18hwfzwa.js:1810810-1810866 placement
function DrawnNote({ id }) {
  P(() => {
    drawnToasts.add(id);
  }, [id]);
  return null;
}
//@ chunk-18hwfzwa.js:1810866-1811075 placement
function firstToastsReport(h) {
  let x = `reported ${h.load} ${h.lead} ui.toast`;
  if (toldRefusals.has(x)) return null;
  toldRefusals.add(x);
  logFeatureBad("plugin_function_hooks_toast_stack", "threw_while_drawn");
  return "ui.toast: the toast stack threw while drawn";
}
//@ chunk-18hwfzwa.js:1811075-1811143 placement
var stackedTops = (h, x) => h.map((D, L) => x + h.slice(0, L).reduce((acc, ke) => acc + ke, 0));
//@ chunk-18hwfzwa.js:1811143-1811345 placement
function fittingToasts(h) {
  let { heights, mostBoxes, roomRows } = h;
  let sliced = heights.toReversed().slice(0, mostBoxes);
  let ke = stackedTops(sliced, 0);
  return Math.min(
    heights.length,
    Math.max(
      1,
      count(
        sliced.map((Re, Be) => (ke[Be] ?? 0) + Re + (heights.length > Be + 1 ? 1 : 0) <= roomRows),
        (Re) => Re,
      ),
    ),
  );
}
//@ chunk-18hwfzwa.js:1811345-1811645 placement
function seatedToasts(toasts) {
  let x = new Map(toasts.map((D, L) => [D.id, L]));
  return [...Map.groupBy(toasts, (D) => D.owner).values()]
    .flatMap((D) =>
      D.map((L, ee) => ({
        toast: L,
        turn: D.length - ee,
        place: x.get(L.id) ?? 0,
      })),
    )
    .toSorted(
      (D, L) => Number(D.toast.isManaged) - Number(L.toast.isManaged) || L.turn - D.turn || D.place - L.place,
    )
    .map((D) => D.toast);
}
//@ chunk-18hwfzwa.js:1811645-1811750 placement
function slideColumnsOf(h) {
  let max = Math.max(0, h.at - h.shownAt);
  return h.isStill || max >= TOAST_FADE_MS ? 0 : Math.ceil(h.columns * (1 - max / TOAST_FADE_MS));
}
//@ chunk-18hwfzwa.js:1811750-1811936 placement
var tellToastsThrown = (h, x) =>
  sayPlainCode({
    key: `${h.load} ${h.lead} ui.toast threw while drawn`,
    lead: h.lead,
    text: `ui.toast threw while drawn: ${logLine(String(errorMessage(x)))}; no toast is drawn until the stack changes`,
  });
//@ chunk-18hwfzwa.js:1811936-1811940 placement
init_react_production();
//@ chunk-18hwfzwa.js:1811940-1811944 placement
init_react_production();
//@ chunk-18hwfzwa.js:1811944-1811955 placement
var TOAST_FRAME_MS = 48;
//@ chunk-18hwfzwa.js:1811955-1812128 placement
function useSlideColumns(h) {
  let [now, setNow] = y(Date.now);
  let L = slideColumnsOf({
    ...h,
    at: now,
  });
  P(() => {
    if (L === 0) return;
    let timer = setTimeout(
      (ke) => {
        ke(Date.now());
      },
      TOAST_FRAME_MS,
      setNow,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [now, L]);
  return L;
}
//@ chunk-18hwfzwa.js:1812128-1813870 placement
function ToastBox(props) {
  let $ = w(31);
  let { toast, shape, top, isFramed } = props;
  let [ke, Re] = y(false);
  const shownAt = toast.shownAt;
  const columns = shape.columns;
  const isStill = usePrefersReducedMotion() || !isFramed;
  let Xe;
  if ($[0] !== shape.columns || $[1] !== isStill || $[2] !== toast.shownAt) {
    Xe = {
      shownAt,
      columns,
      isStill,
    };
    $[0] = shape.columns;
    $[1] = isStill;
    $[2] = toast.shownAt;
    $[3] = Xe;
  } else Xe = $[3];
  let slideColumns = useSlideColumns(Xe);
  let dimColor = toast.phase === "leaving";
  let At;
  let It;
  if ($[4] !== toast.id) {
    At = () => () =>
      toastStackNamespace.holdToast({
        id: toast.id,
        isHeld: false,
      });
    It = [toast.id];
    $[4] = toast.id;
    $[5] = At;
    $[6] = It;
  } else {
    At = $[5];
    It = $[6];
  }
  P(At, It);
  const right = -slideColumns;
  const { columns: columns_2, rows } = shape;
  const borderStyle = isFramed ? "round" : undefined;
  const borderDimColor = !ke;
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
      Re(true);
      toastStackNamespace.holdToast({
        id: toast.id,
        isHeld: true,
      });
    };
    onMouseLeave = () => {
      Re(false);
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
  let co;
  if ($[11] !== toast.plugin) {
    co = jsxProd_default(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: toast.plugin,
    });
    $[11] = toast.plugin;
    $[12] = co;
  } else co = $[12];
  let bo;
  if ($[13] !== dimColor || $[14] !== shape.lines) {
    let Ao;
    if ($[16] !== dimColor) {
      Ao = (children, Ro) =>
        jsxProd_default(
          Text,
          {
            dimColor,
            wrap: "truncate-end",
            children,
          },
          Ro,
        );
      $[16] = dimColor;
      $[17] = Ao;
    } else Ao = $[17];
    bo = shape.lines.map(Ao);
    $[13] = dimColor;
    $[14] = shape.lines;
    $[15] = bo;
  } else bo = $[15];
  let Ao;
  if (
    $[18] !== shape.columns ||
    $[19] !== shape.rows ||
    $[20] !== borderDimColor ||
    $[21] !== paddingX ||
    $[22] !== onClick ||
    $[23] !== onMouseEnter ||
    $[24] !== onMouseLeave ||
    $[25] !== co ||
    $[26] !== bo ||
    $[27] !== right ||
    $[28] !== borderStyle ||
    $[29] !== top
  ) {
    Ao = jsxProd_default_2(Box, {
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
      children: [co, bo],
    });
    $[18] = shape.columns;
    $[19] = shape.rows;
    $[20] = borderDimColor;
    $[21] = paddingX;
    $[22] = onClick;
    $[23] = onMouseEnter;
    $[24] = onMouseLeave;
    $[25] = co;
    $[26] = bo;
    $[27] = right;
    $[28] = borderStyle;
    $[29] = top;
    $[30] = Ao;
  } else Ao = $[30];
  return Ao;
}
//@ chunk-18hwfzwa.js:1813870-1813881 placement
var TOAST_BOX_COLUMNS = 44;
//@ chunk-18hwfzwa.js:1813881-1813885 placement
init_react_production();
//@ chunk-18hwfzwa.js:1813885-1813895 placement
var TOAST_EDGE_COLUMNS = 2;
//@ chunk-18hwfzwa.js:1813895-1813905 placement
var TOAST_RESERVED_ROWS = 8;
//@ chunk-18hwfzwa.js:1813905-1813915 placement
var TOAST_FRAME_COLUMNS = 4;
//@ chunk-18hwfzwa.js:1813915-1813925 placement
var TOAST_TEXT_ROWS = 3;
//@ chunk-18hwfzwa.js:1813925-1814260 placement
function toastShapeOf(h) {
  let { toast, roomColumns, isFramed } = h;
  let ee = isFramed ? TOAST_FRAME_COLUMNS : 0;
  let max = Math.max(1, Math.min(roomColumns, TOAST_BOX_COLUMNS));
  let lines = wrapText(toast.text, Math.max(1, max - ee), "wrap").split(`
`);
  let filtered = [...lines.slice(0, TOAST_TEXT_ROWS - 1), lines.slice(TOAST_TEXT_ROWS - 1).join(" ")].filter(
    (He, We) => We === 0 || He !== "",
  );
  return {
    columns: Math.min(max, Math.max(bunStringWidth(toast.plugin), ...filtered.map(bunStringWidth)) + ee),
    lines: filtered,
    rows: filtered.length + 1 + (isFramed ? 2 : 0),
  };
}
//@ chunk-18hwfzwa.js:1814260-1814270 placement
var TOAST_STACK_VISIBLE = 3;
//@ chunk-18hwfzwa.js:1814270-1814302 placement
function selectRows(Bo) {
  return Bo.rows;
}
//@ chunk-18hwfzwa.js:1814302-1814350 placement
function renderToastNote(Ro) {
  return jsxProd_default(
    DrawnNote,
    {
      id: Ro.id,
    },
    Ro.id,
  );
}
//@ chunk-18hwfzwa.js:1814350-1815941 placement
function ToastBoxes(props) {
  let $ = w(26);
  let { toasts, isPaused } = props;
  let isFramed = !useIsScreenReaderEnabled();
  let { columns, rows } = useTerminalSize();
  let Re = Se(TranscriptOverlaySlot);
  let Be = R(null);
  let We;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    We = () => Be.current?.yogaNode?.getComputedHeight() ?? 0;
    $[0] = We;
  } else We = $[0];
  let measured = useMeasured(We);
  if (isPaused || toasts.length === 0) {
    return null;
  }
  let roomColumns = Math.max(1, columns - TOAST_EDGE_COLUMNS);
  let rt;
  if (
    $[1] !== measured ||
    $[2] !== Re ||
    $[3] !== isFramed ||
    $[4] !== roomColumns ||
    $[5] !== rows ||
    $[6] !== toasts
  ) {
    let kt = seatedToasts(toasts);
    let At;
    if ($[8] !== isFramed || $[9] !== roomColumns) {
      At = (toast) =>
        toastShapeOf({
          toast,
          roomColumns,
          isFramed,
        }).rows;
      $[8] = isFramed;
      $[9] = roomColumns;
      $[10] = At;
    } else At = $[10];
    rt = new Set(
      kt.slice(
        -fittingToasts({
          heights: kt.map(At),
          mostBoxes: TOAST_STACK_VISIBLE,
          roomRows: (measured > 0 ? measured : rows - TOAST_RESERVED_ROWS) - Re,
        }),
      ),
    );
    $[1] = measured;
    $[2] = Re;
    $[3] = isFramed;
    $[4] = roomColumns;
    $[5] = rows;
    $[6] = toasts;
    $[7] = rt;
  } else rt = $[7];
  let Ot = rt;
  let At;
  if ($[11] !== Ot || $[12] !== Re || $[13] !== isFramed || $[14] !== roomColumns || $[15] !== toasts) {
    let Et;
    if ($[17] !== Ot) {
      Et = (Dt) => Ot.has(Dt);
      $[17] = Ot;
      $[18] = Et;
    } else Et = $[18];
    let filtered = toasts.filter(Et);
    let oo = toasts.length - filtered.length;
    let Xt;
    if ($[19] !== isFramed || $[20] !== roomColumns) {
      Xt = (toast) =>
        toastShapeOf({
          toast,
          roomColumns,
          isFramed,
        });
      $[19] = isFramed;
      $[20] = roomColumns;
      $[21] = Xt;
    } else Xt = $[21];
    let mapped = filtered.map(Xt);
    let po = stackedTops(mapped.map(selectRows), Re + (oo > 0 ? 1 : 0));
    let ao;
    if ($[22] === MEMO_CACHE_SENTINEL) {
      ao = jsxProd_default(Box, {
        ref: Be,
        position: "absolute",
        top: 0,
        bottom: 0,
        right: 0,
        width: 0,
      });
      $[22] = ao;
    } else ao = $[22];
    let co;
    if ($[23] !== Re || $[24] !== oo) {
      co =
        oo > 0 &&
        jsxProd_default(Box, {
          position: "absolute",
          top: Re,
          right: 0,
          opaque: true,
          noSelect: true,
          children: jsxProd_default(Text, {
            dimColor: true,
            children: ` +${oo} more `,
          }),
        });
      $[23] = Re;
      $[24] = oo;
      $[25] = co;
    } else co = $[25];
    At = jsxProd_default_2(Fragment, {
      children: [
        ao,
        co,
        filtered.map((bo, Ao) =>
          jsxProd_default(
            ToastBox,
            {
              toast: bo,
              shape: mapped[Ao] ?? {
                columns: 1,
                lines: [],
                rows: 1,
              },
              top: po[Ao] ?? 0,
              isFramed,
            },
            bo.id,
          ),
        ),
        filtered.map(renderToastNote),
      ],
    });
    $[11] = Ot;
    $[12] = Re;
    $[13] = isFramed;
    $[14] = roomColumns;
    $[15] = toasts;
    $[16] = At;
  } else At = $[16];
  return At;
}
//@ chunk-18hwfzwa.js:1815941-1816072 placement
function toastsTeller(storeSelector) {
  let x = new Set(storeSelector.map((D) => D.owner));
  return {
    load: loadOf(getPluginRegistry().loadedModules.filter((loadedModule) => x.has(loadedModule.name))),
    lead: leadOf([...x]),
  };
}
//@ chunk-18hwfzwa.js:1816072-1816076 placement
init_react_production();
//@ chunk-18hwfzwa.js:1816076-1816175 placement
function useToastPause() {
  let storeSelector = useStoreSelector(paneRegistry(), holdsToasts);
  P(() => {
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
//@ chunk-18hwfzwa.js:1816175-1816681 placement
function ToastStackView() {
  let $ = w(12);
  let x;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    x = EMPTY_STATE_EXPORTS.stateSession();
    $[0] = x;
  } else x = $[0];
  let storeSelector = useStoreSelector(x.values, toastStackNamespace.stackedToasts);
  let isPaused = useToastPause();
  let telemetryMessage;
  let onError;
  if ($[1] !== storeSelector) {
    telemetryMessage = () => firstToastsReport(toastsTeller(storeSelector));
    onError = (Re) => tellToastsThrown(toastsTeller(storeSelector), Re);
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
  let He;
  if ($[7] !== telemetryMessage || $[8] !== onError || $[9] !== children || $[10] !== storeSelector) {
    He = jsxProd_default(SentryErrorBoundary, {
      resetKey: storeSelector,
      telemetryMessage,
      onError,
      children,
    });
    $[7] = telemetryMessage;
    $[8] = onError;
    $[9] = children;
    $[10] = storeSelector;
    $[11] = He;
  } else He = $[11];
  return He;
}
//@ chunk-18hwfzwa.js:1816681-1816685 placement
init_react_production();
//@ chunk-18hwfzwa.js:1816718-1816722 placement
init_react_production();
export { toastRegionWidth, ToastStackViewNamespace };
