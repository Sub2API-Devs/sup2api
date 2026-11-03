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
import { KH } from "../../screens/repl/storeHooks.js";
import { useDialogSelector, topAutoDialog } from "../../state/dialogQueue.js";
import { MCP_ELICITATION_DIALOG } from "../../services/mcp/elicitationDialogs.js";
import { hasPluginUserConfig } from "../../plugins/bundled/claudeTest/userConfig.js";
import { j, P, y, Se, R } from "../../../vendor/react/cjs/react.production.js";
import { drawnToasts, TOAST_FADE_MS, toastStackNamespace, pauseToasts } from "./toastStack.js";
import { toldRefusals } from "../../plugins/functionHooks/ui/renderNotices.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { count } from "../../utils/collections.js";
import { sayPlainCode, logLine, loadOf, leadOf } from "../../plugins/functionHooks/ui/renderDispatch.js";
import { errorMessage } from "../../utils/errors.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { wrapText } from "../../ink/wrap-text.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { dtn } from "../FullscreenLayout.js";
import { useMeasured } from "../../ink/components/Input.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { ul, B4o } from "../../plugins/functionHooks/panes.js";
import { uSe } from "../../plugins/functionHooks/api/state.js";
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
var dQo = 72,
  cQo = dQo + max;
//@ chunk-18hwfzwa.js:1810364-1810428 placement
function uQo(h, x) {
  let D = x - cQo;
  if (h <= D) return h;
  return D >= DOCK_MIN_COLUMNS ? D : 0;
}
//@ chunk-18hwfzwa.js:1810428-1810495 placement
function mDe(h, x, D) {
  let L = useHasPluginConfigDialog();
  if (!h) return 0;
  return L ? uQo(x, D) : x;
}
/**
 * 当前是否显示插件 MCP 用户配置对话框。
 */
//@ chunk-18hwfzwa.js:1810495-1810806 placement
function useHasPluginConfigDialog() {
  let h = KH() !== void 0,
    x = useDialogSelector((D) => {
      let L = topAutoDialog(D);
      if (L === null || L.kind !== MCP_ELICITATION_DIALOG.kind) return !1;
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
j();
//@ chunk-18hwfzwa.js:1810810-1810866 placement
function DrawnNote({ id: id }) {
  return (
    P(() => {
      drawnToasts.add(id);
    }, [id]),
    null
  );
}
//@ chunk-18hwfzwa.js:1810866-1811075 placement
function firstToastsReport(h) {
  let x = `reported ${h.load} ${h.lead} ui.toast`;
  if (toldRefusals.has(x)) return null;
  return (
    toldRefusals.add(x),
    logFeatureBad("plugin_function_hooks_toast_stack", "threw_while_drawn"),
    "ui.toast: the toast stack threw while drawn"
  );
}
//@ chunk-18hwfzwa.js:1811075-1811143 placement
var stackedTops = (h, x) => h.map((D, L) => x + h.slice(0, L).reduce((ee, ke) => ee + ke, 0));
//@ chunk-18hwfzwa.js:1811143-1811345 placement
function fittingToasts(h) {
  let { heights: heights, mostBoxes: mostBoxes, roomRows: roomRows } = h,
    sliced = heights.toReversed().slice(0, mostBoxes),
    ke = stackedTops(sliced, 0);
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
function seatedToasts(h) {
  let x = new Map(h.map((D, L) => [D.id, L]));
  return [...Map.groupBy(h, (D) => D.owner).values()]
    .flatMap((D) => D.map((L, ee) => ({ toast: L, turn: D.length - ee, place: x.get(L.id) ?? 0 })))
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
j();
//@ chunk-18hwfzwa.js:1811940-1811944 placement
j();
//@ chunk-18hwfzwa.js:1811944-1811955 placement
var TOAST_FRAME_MS = 48;
//@ chunk-18hwfzwa.js:1811955-1812128 placement
function useSlideColumns(h) {
  let [x, D] = y(Date.now),
    L = slideColumnsOf({ ...h, at: x });
  return (
    P(() => {
      if (L === 0) return;
      let ee = setTimeout(
        (ke) => {
          ke(Date.now());
        },
        TOAST_FRAME_MS,
        D,
      );
      return () => {
        clearTimeout(ee);
      };
    }, [x, L]),
    L
  );
}
//@ chunk-18hwfzwa.js:1812128-1813870 placement
function ToastBox(h) {
  let $ = w(31),
    { toast: toast, shape: shape, top: top, isFramed: isFramed } = h,
    [ke, Re] = y(!1);
  const shownAt = toast.shownAt,
    columns = shape.columns,
    We = usePrefersReducedMotion() || !isFramed;
  let Xe;
  if ($[0] !== shape.columns || $[1] !== We || $[2] !== toast.shownAt)
    ((Xe = { shownAt: shownAt, columns: columns, isStill: We }),
      ($[0] = shape.columns),
      ($[1] = We),
      ($[2] = toast.shownAt),
      ($[3] = Xe));
  else Xe = $[3];
  let rt = useSlideColumns(Xe),
    kt = toast.phase === "leaving",
    At,
    It;
  if ($[4] !== toast.id)
    ((At = () => () => toastStackNamespace.holdToast({ id: toast.id, isHeld: !1 })),
      (It = [toast.id]),
      ($[4] = toast.id),
      ($[5] = At),
      ($[6] = It));
  else ((At = $[5]), (It = $[6]));
  P(At, It);
  const Ot = -rt,
    { columns: columns_2, rows: rows } = shape,
    Lt = isFramed ? "round" : void 0,
    oo = !ke,
    Xt = isFramed ? 1 : 0;
  let io, so, po;
  if ($[7] !== toast.id)
    ((io = (ao) => {
      if ((ao.stopImmediatePropagation(), !ao.isWindowActivation)) toastStackNamespace.dismissToast(toast.id);
    }),
      (so = () => {
        (Re(!0), toastStackNamespace.holdToast({ id: toast.id, isHeld: !0 }));
      }),
      (po = () => {
        (Re(!1), toastStackNamespace.holdToast({ id: toast.id, isHeld: !1 }));
      }),
      ($[7] = toast.id),
      ($[8] = io),
      ($[9] = so),
      ($[10] = po));
  else ((io = $[8]), (so = $[9]), (po = $[10]));
  let co;
  if ($[11] !== toast.plugin)
    ((co = e(Text, { dimColor: !0, wrap: "truncate-end", children: toast.plugin })),
      ($[11] = toast.plugin),
      ($[12] = co));
  else co = $[12];
  let bo;
  if ($[13] !== kt || $[14] !== shape.lines) {
    let Ao;
    if ($[16] !== kt)
      ((Ao = (Bo, Ro) => e(Text, { dimColor: kt, wrap: "truncate-end", children: Bo }, Ro)),
        ($[16] = kt),
        ($[17] = Ao));
    else Ao = $[17];
    bo = shape.lines.map(Ao);
    (($[13] = kt), ($[14] = shape.lines), ($[15] = bo));
  } else bo = $[15];
  let Ao;
  if (
    $[18] !== shape.columns ||
    $[19] !== shape.rows ||
    $[20] !== oo ||
    $[21] !== Xt ||
    $[22] !== io ||
    $[23] !== so ||
    $[24] !== po ||
    $[25] !== co ||
    $[26] !== bo ||
    $[27] !== Ot ||
    $[28] !== Lt ||
    $[29] !== top
  )
    ((Ao = r(Box, {
      position: "absolute",
      top: top,
      right: Ot,
      width: columns_2,
      height: rows,
      flexDirection: "column",
      borderStyle: Lt,
      borderDimColor: oo,
      paddingX: Xt,
      opaque: !0,
      noSelect: !0,
      onClick: io,
      onMouseEnter: so,
      onMouseLeave: po,
      children: [co, bo],
    })),
      ($[18] = shape.columns),
      ($[19] = shape.rows),
      ($[20] = oo),
      ($[21] = Xt),
      ($[22] = io),
      ($[23] = so),
      ($[24] = po),
      ($[25] = co),
      ($[26] = bo),
      ($[27] = Ot),
      ($[28] = Lt),
      ($[29] = top),
      ($[30] = Ao));
  else Ao = $[30];
  return Ao;
}
//@ chunk-18hwfzwa.js:1813870-1813881 placement
var TOAST_BOX_COLUMNS = 44;
//@ chunk-18hwfzwa.js:1813881-1813885 placement
j();
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
  let { toast: toast, roomColumns: roomColumns, isFramed: isFramed } = h,
    ee = isFramed ? TOAST_FRAME_COLUMNS : 0,
    max = Math.max(1, Math.min(roomColumns, TOAST_BOX_COLUMNS)),
    parts = wrapText(toast.text, Math.max(1, max - ee), "wrap").split(`
`),
    filtered = [...parts.slice(0, TOAST_TEXT_ROWS - 1), parts.slice(TOAST_TEXT_ROWS - 1).join(" ")].filter(
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
function ZQo(Ro) {
  return e(DrawnNote, { id: Ro.id }, Ro.id);
}
//@ chunk-18hwfzwa.js:1814350-1815941 placement
function ToastBoxes(h) {
  let $ = w(26),
    { toasts: toasts, isPaused: isPaused } = h,
    L = !useIsScreenReaderEnabled(),
    { columns: columns, rows: rows } = useTerminalSize(),
    Re = Se(dtn),
    Be = R(null),
    We;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((We = () => Be.current?.yogaNode?.getComputedHeight() ?? 0), ($[0] = We));
  else We = $[0];
  let ze = useMeasured(We);
  if (isPaused || toasts.length === 0) {
    return null;
  }
  let max = Math.max(1, columns - TOAST_EDGE_COLUMNS),
    rt;
  if ($[1] !== ze || $[2] !== Re || $[3] !== L || $[4] !== max || $[5] !== rows || $[6] !== toasts) {
    let kt = seatedToasts(toasts);
    let At;
    if ($[8] !== L || $[9] !== max)
      ((At = (It) => toastShapeOf({ toast: It, roomColumns: max, isFramed: L }).rows),
        ($[8] = L),
        ($[9] = max),
        ($[10] = At));
    else At = $[10];
    rt = new Set(
      kt.slice(
        -fittingToasts({
          heights: kt.map(At),
          mostBoxes: TOAST_STACK_VISIBLE,
          roomRows: (ze > 0 ? ze : rows - TOAST_RESERVED_ROWS) - Re,
        }),
      ),
    );
    (($[1] = ze), ($[2] = Re), ($[3] = L), ($[4] = max), ($[5] = rows), ($[6] = toasts), ($[7] = rt));
  } else rt = $[7];
  let Ot = rt,
    At;
  if ($[11] !== Ot || $[12] !== Re || $[13] !== L || $[14] !== max || $[15] !== toasts) {
    let Et;
    if ($[17] !== Ot) ((Et = (Dt) => Ot.has(Dt)), ($[17] = Ot), ($[18] = Et));
    else Et = $[18];
    let filtered = toasts.filter(Et);
    let oo = toasts.length - filtered.length;
    let Xt;
    if ($[19] !== L || $[20] !== max)
      ((Xt = (io) => toastShapeOf({ toast: io, roomColumns: max, isFramed: L })),
        ($[19] = L),
        ($[20] = max),
        ($[21] = Xt));
    else Xt = $[21];
    let mapped = filtered.map(Xt);
    let po = stackedTops(mapped.map(selectRows), Re + (oo > 0 ? 1 : 0));
    let ao;
    if ($[22] === MEMO_CACHE_SENTINEL)
      ((ao = e(Box, { ref: Be, position: "absolute", top: 0, bottom: 0, right: 0, width: 0 })), ($[22] = ao));
    else ao = $[22];
    let co;
    if ($[23] !== Re || $[24] !== oo)
      ((co =
        oo > 0 &&
        e(Box, {
          position: "absolute",
          top: Re,
          right: 0,
          opaque: !0,
          noSelect: !0,
          children: e(Text, { dimColor: !0, children: ` +${oo} more ` }),
        })),
        ($[23] = Re),
        ($[24] = oo),
        ($[25] = co));
    else co = $[25];
    At = r(Fragment, {
      children: [
        ao,
        co,
        filtered.map((bo, Ao) =>
          e(
            ToastBox,
            {
              toast: bo,
              shape: mapped[Ao] ?? { columns: 1, lines: [], rows: 1 },
              top: po[Ao] ?? 0,
              isFramed: L,
            },
            bo.id,
          ),
        ),
        filtered.map(ZQo),
      ],
    });
    (($[11] = Ot), ($[12] = Re), ($[13] = L), ($[14] = max), ($[15] = toasts), ($[16] = At));
  } else At = $[16];
  return At;
}
//@ chunk-18hwfzwa.js:1815941-1816072 placement
function toastsTeller(h) {
  let x = new Set(h.map((D) => D.owner));
  return {
    load: loadOf(getPluginRegistry().loadedModules.filter((loadedModule) => x.has(loadedModule.name))),
    lead: leadOf([...x]),
  };
}
//@ chunk-18hwfzwa.js:1816072-1816076 placement
j();
//@ chunk-18hwfzwa.js:1816076-1816175 placement
function useToastPause() {
  let h = useStoreSelector(ul(), B4o);
  return (
    P(
      () => (
        pauseToasts({ isPaused: h }),
        () => {
          pauseToasts({ isPaused: !1 });
        }
      ),
      [h],
    ),
    h
  );
}
//@ chunk-18hwfzwa.js:1816175-1816681 placement
function ToastStackView() {
  let $ = w(12),
    x;
  if ($[0] === MEMO_CACHE_SENTINEL) ((x = uSe.stateSession()), ($[0] = x));
  else x = $[0];
  let D = useStoreSelector(x.values, toastStackNamespace.stackedToasts),
    L = useToastPause(),
    ee,
    ke;
  if ($[1] !== D)
    ((ee = () => firstToastsReport(toastsTeller(D))),
      (ke = (Re) => tellToastsThrown(toastsTeller(D), Re)),
      ($[1] = D),
      ($[2] = ee),
      ($[3] = ke));
  else ((ee = $[2]), (ke = $[3]));
  let Be;
  if ($[4] !== L || $[5] !== D)
    ((Be = e(ToastBoxes, { toasts: D, isPaused: L })), ($[4] = L), ($[5] = D), ($[6] = Be));
  else Be = $[6];
  let He;
  if ($[7] !== ee || $[8] !== ke || $[9] !== Be || $[10] !== D)
    ((He = e(SentryErrorBoundary, { resetKey: D, telemetryMessage: ee, onError: ke, children: Be })),
      ($[7] = ee),
      ($[8] = ke),
      ($[9] = Be),
      ($[10] = D),
      ($[11] = He));
  else He = $[11];
  return He;
}
//@ chunk-18hwfzwa.js:1816681-1816685 placement
j();
//@ chunk-18hwfzwa.js:1816718-1816722 placement
j();

export { mDe, ToastStackViewNamespace };
