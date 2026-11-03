/**
 * components/AutocompactOfferDialog.tsx
 *
 * 2.1.316 新增。提议开启自动压缩的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { wrapText } from "../ink/wrap-text.js";
import {
  AL,
  yko,
  hko,
  offerTelemetryFields,
  describeCurrentWindow,
  currentWindowLabel,
} from "../services/compact/autocompactOffer.js";
import { R, Se, y, Q, zt, ce, Oo, P } from "../../vendor/react/cjs/react.production.js";
import { $V, NV } from "./design-system/ScrollColumn.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useScrollViewportSize, Tl } from "./ScrollViewportContext.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { countCharInString } from "../utils/stringUtils.js";
import { useTimeout, measureElement, topWithin } from "../ink/hooks/useTerminalHooks.js";
import {
  RECENT_INPUT_GUARD_MS,
  INPUT_SETTLE_MS,
  isWithinRecentInput,
  So,
} from "../hooks/useRecentInputGuard.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { ContextSlotA } from "../context/contextSlots.js";
import { useMeasured, useInputClock } from "../ink/components/Input.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { logEvent } from "../services/analytics/index.js";
import { useOnFirstReveal } from "./permissions/PermissionRequestTitle.js";
import { useConfirmArmed, CONFIRM_ARM_DELAY_MS } from "./design-system/ConfirmSelect.js";
import { useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { fitVisibleOptionCount, NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useRefusableAnswer } from "../hooks/useRefusableAnswer.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { formatTokens } from "../utils/format.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";

/**
 * 把文本按宽度折行后截取不超过 maxRows 的窗口（从 start 行开始），返回文本、隐藏行数、上方隐藏行数与下一页起点。
 */
//@ chunk-18hwfzwa.js:1115692-1116037 placement
function fitTextToRows(text, width, maxRows, start = 0) {
  let parts = wrapText(text, Math.max(1, width), "wrap").split(`
`),
    max = Math.max(AL, maxRows);
  if (parts.length <= max) return { text: text, hiddenRows: 0, hiddenAbove: 0, nextStart: 0 };
  let Re = max - 1,
    min = Math.min(Math.max(0, start), parts.length - Re),
    sliced = parts.slice(min, min + Re),
    We = parts.length - min - sliced.length;
  return {
    text: sliced.join(`
`),
    hiddenRows: We,
    hiddenAbove: min,
    nextStart: We === 0 ? 0 : min + sliced.length,
  };
}
/**
 * 计算自动压缩提议对话框的布局：是否显示常驻选项、是否保持常驻、正文可用行数与稳定后的模式。
 */
//@ chunk-18hwfzwa.js:1116037-1116609 placement
function planOfferLayout(measure, bodyRows, mode) {
  let L = measure?.chromeWithout ?? measure?.chromeWith ?? null,
    ee = measure?.chromeWith ?? measure?.chromeWithout ?? null;
  if (measure === null || L === null || ee === null)
    return {
      offersStanding: mode === "standing",
      isStandingHeld: mode === "standing",
      room: AL,
      settles: null,
    };
  let ke = measure.overdraw === 0 && ee + bodyRows <= measure.available;
  if (mode === "bare" || (mode === "unsettled" && !ke))
    return {
      offersStanding: !1,
      isStandingHeld: !1,
      room: Math.max(AL, measure.available - L - measure.overdraw),
      settles: measure.chromeWithout === null ? null : "bare",
    };
  return {
    offersStanding: !0,
    isStandingHeld: !ke,
    room: ke ? bodyRows : Math.max(AL, measure.available - ee - measure.overdraw),
    settles: measure.chromeWith === null ? null : "standing",
  };
}
/**
 * 自动压缩提议对话框的正文（适配宽度）。
 */
//@ chunk-18hwfzwa.js:1116609-1119923 placement
function FittedOfferBody(
  h,
  {
    isActive: isActive,
    isCut: isCut,
    contentKey: contentKey,
    maxRows: maxRows,
    lateBody: lateBody,
    keptForRequest: keptForRequest,
  },
) {
  let Be = R(null),
    He = R(null),
    We = $V(),
    ze = useTerminalSize(),
    { rows: rows } = useScrollViewportSize(ze),
    rt = Tl(),
    { subscribeLayout: subscribeLayout } = Se(kp),
    [At, It] = y(null),
    Ot = At?.contentKey === contentKey ? At : null,
    Et = Ot?.columns ?? Math.max(yko, ze.columns - hko),
    Dt = Q(
      () =>
        isActive
          ? countCharInString(
              wrapText(h, Math.max(1, Et), "wrap"),
              `
`,
            ) + 1
          : 0,
      [isActive, h, Et],
    ),
    [Lt, oo] = y(null),
    Xt = Lt !== null && Lt.contentKey === contentKey && Lt.columns === Et ? Lt.start : 0,
    [io, so] = y(() => (keptForRequest?.has("bare") === !0 ? "bare" : "unsettled")),
    po = Ot === null && io === "standing" && At !== null ? At.fit : (Ot?.fit ?? null),
    ao = isActive && lateBody === "pending",
    {
      offersStanding: offersStanding,
      isStandingHeld: isStandingHeld,
      room: room,
      settles: settles,
    } = isActive
      ? planOfferLayout(po, Dt, ao && io === "unsettled" ? "standing" : io)
      : { offersStanding: !0, isStandingHeld: !1, room: Dt, settles: null },
    Ro = useTimeout(isActive && io === "unsettled" ? RECENT_INPUT_GUARD_MS : null);
  if (isActive && io === "unsettled") {
    if (settles !== null && Ot !== null && lateBody === void 0) so(settles);
    else if (Ro) so(offersStanding ? "standing" : "bare");
  }
  let Ho = isStandingHeld || ao,
    [Io, Wo] = y(() => keptForRequest?.has("held") ?? !1);
  if (isActive && io === "standing" && (Ot !== null || ao) && Ho && !Io) Wo(!0);
  let mn = Ho || Io;
  zt(() => {
    if (keptForRequest === void 0) return;
    if (Io) keptForRequest.keep("held");
    if (io === "bare") keptForRequest.keep("bare");
  }, [keptForRequest, Io, io]);
  let Cn = Q(
      () =>
        isActive && isCut
          ? fitTextToRows(h, Et, Math.min(room, maxRows ?? room), Xt)
          : { text: h, hiddenRows: 0, hiddenAbove: 0, nextStart: 0 },
      [isActive, isCut, h, Et, room, maxRows, Xt],
    ),
    No = (offersStanding ? Ot?.fit.chromeWith : Ot?.fit.chromeWithout) ?? null,
    vo =
      isActive && Ot !== null && No !== null ? Math.max(0, No + AL + Ot.fit.overdraw - Ot.fit.available) : 0,
    nextStart = Cn.nextStart,
    kn = ce(() => oo({ contentKey: contentKey, columns: Et, start: nextStart }), [contentKey, Et, nextStart]),
    Fn = Oo(() => {
      if (!isActive || Be.current === null || He.current === null) return;
      let bn = We?.box.current ?? Be.current;
      while (We === null && bn.parentNode !== void 0) bn = bn.parentNode;
      let height = measureElement(Be.current).height;
      if (height === 0) return;
      let height_2 = measureElement(bn).height,
        Mn = height_2 - height;
      if (Mn <= 0) return;
      let Xo = rt ? (We?.rows ?? rows) : measureRoomAbove(bn, ze.rows, We?.reserve ?? NV),
        Sn = topWithin(Be.current, bn),
        $n = measureElement(He.current),
        on = {
          contentKey: contentKey,
          text: h,
          columns: $n.width,
          terminalRows: ze.rows,
          terminalColumns: ze.columns,
        },
        _o =
          Cn.hiddenRows + Cn.hiddenAbove === 0
            ? Dt
            : countCharInString(
                Cn.text,
                `
`,
              ) + 1;
      It((cn) => {
        let Dn =
            cn !== null &&
            cn.contentKey === on.contentKey &&
            cn.columns === on.columns &&
            cn.terminalRows === on.terminalRows &&
            cn.terminalColumns === on.terminalColumns
              ? cn.fit
              : { available: Xo, chromeWithout: null, chromeWith: null, overdraw: 0 },
          max = Math.max(
            cn?.text === h && cn.columns === on.columns ? cn.fit.overdraw : 0,
            Et === on.columns ? $n.height - _o : 0,
          ),
          mr = offersStanding ? Dn.chromeWith : Dn.chromeWithout,
          min = Math.min(height, AL + max),
          Fr = (rt ? Sn + min : height_2 - Sn - height + min) <= Xo && (Dn !== cn?.fit || cn.isBodyOnScreen);
        if (
          Dn === cn?.fit &&
          mr === Mn &&
          Dn.available === Xo &&
          Dn.overdraw === max &&
          cn.isBodyOnScreen === Fr
        )
          return cn;
        return {
          ...on,
          isBodyOnScreen: Fr,
          fit: {
            ...Dn,
            available: Xo,
            overdraw: max,
            chromeWith: offersStanding ? Mn : Dn.chromeWith,
            chromeWithout: offersStanding ? Dn.chromeWithout : Mn,
          },
        };
      });
    });
  return (
    zt(() => (Fn(), subscribeLayout(Fn)), [subscribeLayout]),
    usePreDispatchKeyHandler(
      (bn, Go) => {
        if (Go.wheelUp || Go.wheelDown) return !1;
        if (keptForRequest !== void 0 && !offersStanding) keptForRequest.keep("bare");
        return (so((hn) => (hn === "unsettled" ? (offersStanding ? "standing" : "bare") : hn)), !1);
      },
      { isActive: isActive && io === "unsettled" },
    ),
    {
      text: Cn.text,
      hiddenRows: Cn.hiddenRows,
      hiddenAbove: Cn.hiddenAbove,
      showNextRows: kn,
      offersStanding: offersStanding,
      isStandingHeld: mn,
      isHeldForGood: Io,
      isMeasured:
        settles !== null && Ot !== null && Ot.terminalRows === ze.rows && Ot.terminalColumns === ze.columns,
      fitsScreen:
        settles !== null &&
        Ot !== null &&
        Ot.terminalRows === ze.rows &&
        Ot.terminalColumns === ze.columns &&
        ((offersStanding ? Ot.fit.chromeWith : Ot.fit.chromeWithout) ?? Number.POSITIVE_INFINITY) +
          Math.min(Dt, room) +
          Ot.fit.overdraw <=
          Ot.fit.available,
      box: Be,
      textBox: He,
      columns: Et,
      shortRows: vo,
      isBodyOnScreen: Ot?.isBodyOnScreen ?? null,
    }
  );
}
//@ chunk-18hwfzwa.js:1119923-1120222 placement
function useOfferRoom() {
  let h = R(null),
    x = useTerminalSize(),
    D = $V()?.reserve ?? NV,
    L = Se(ContextSlotA);
  function ee() {
    if (h.current === null) return null;
    let Re = L?.() ?? null;
    return Re === null ? measureRoomAbove(h.current, x.rows, D, !0) : Re + measureElement(h.current).height;
  }
  let ke = useMeasured(ee);
  return {
    box: h,
    rows: ke ?? x.rows - D,
    rowsNow: () => ee() ?? x.rows - D,
    isCutFromTheBottom: L !== null,
  };
}
/**
 * 自下而上测量节点之后的兄弟元素高度，求出该节点可用的终端行数；遇到可滚动父容器时以其内高为准。
 */
//@ chunk-18hwfzwa.js:1120222-1120776 placement
function measureRoomAbove(node, rows, reserve, withMargins = !1) {
  let ee = 0,
    ke = node;
  while (ke.parentNode !== void 0) {
    let parentNode = ke.parentNode;
    if ((parentNode.style.overflowY ?? parentNode.style.overflow) === "scroll") {
      let Be =
        measureElement(parentNode).height -
        (parentNode.yogaNode?.getComputedPadding(1) ?? 0) -
        (parentNode.yogaNode?.getComputedPadding(3) ?? 0);
      return Math.min(Be, rows - NV) - ee;
    }
    for (let Be of parentNode.childNodes.slice(parentNode.childNodes.indexOf(ke) + 1))
      if (Be.nodeName !== "#text" && Be.style.position !== "absolute" && !(Be.style.flexGrow ?? 0))
        ee +=
          measureElement(Be).height +
          (withMargins
            ? (Be.yogaNode?.getComputedMargin(1) ?? 0) + (Be.yogaNode?.getComputedMargin(3) ?? 0)
            : 0);
    ke = parentNode;
  }
  return rows - Math.max(reserve, NV + ee);
}
//@ chunk-18hwfzwa.js:1120776-1120805 placement
function ovo(Vl) {
  return Vl + 1;
}
//@ chunk-18hwfzwa.js:1120805-1120834 placement
function nvo(Hd) {
  return Hd + 1;
}
//@ chunk-18hwfzwa.js:1120834-1121034 placement
var AUTOCOMPACT_OFFER_TITLE = "We recommend compacting earlier",
  AUTOCOMPACT_OFFER_KEYS_HINT =
    "\u2191/\u2193 choose \xB7 \u2190/\u2192 change size \xB7 enter confirm \xB7 esc not now",
  MORE_TEXT_ABOVE_HINT = "More text above: scroll up, or enlarge the terminal",
  OFFER_MIN_ROWS = 2;
/**
 * AutocompactOfferDialog：上下文接近上限时提议开启自动压缩的对话框。
 */
//@ chunk-18hwfzwa.js:1121034-1127615 placement
function AutocompactOfferDialog(h) {
  let $ = w(101),
    { payload: payload, onDone: onDone } = h,
    ee = useIsScreenReaderEnabled(),
    ke = useGlobalExitKeybindings(),
    Re = payload.order === "lower_first" ? "accept" : "keep";
  const Be = Re === "accept" ? "lower" : "keep";
  let We;
  if ($[0] !== ee || $[1] !== Be)
    ((We = { preselected: Be, isScreenReader: ee }), ($[0] = ee), ($[1] = Be), ($[2] = We));
  else We = $[2];
  let ze = We,
    Xe;
  if ($[3] !== payload || $[4] !== ze)
    ((Xe = () => {
      logEvent("tengu_autocompact_offer_shown", offerTelemetryFields(payload, ze));
    }),
      ($[3] = payload),
      ($[4] = ze),
      ($[5] = Xe));
  else Xe = $[5];
  useOnFirstReveal("impression", Xe);
  let rt;
  if ($[6] !== payload.defaultTokens || $[7] !== payload.sizes)
    ((rt = () => payload.sizes.findIndex((size) => size.tokens === payload.defaultTokens)),
      ($[6] = payload.defaultTokens),
      ($[7] = payload.sizes),
      ($[8] = rt));
  else rt = $[8];
  let [At, It] = y(rt),
    [Ot, Et] = y(0),
    Dt = payload.sizes[At] ?? payload.sizes[0],
    Lt;
  if ($[9] !== payload.sizes.length || $[10] !== At)
    ((Lt = function io(oo) {
      let Xt = At + oo;
      if (Xt < 0 || Xt >= payload.sizes.length) {
        return;
      }
      (It(Xt), Et(ovo));
    }),
      ($[9] = payload.sizes.length),
      ($[10] = At),
      ($[11] = Lt));
  else Lt = $[11];
  let io = Lt,
    so = useConfirmArmed(CONFIRM_ARM_DELAY_MS),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    bo = useTimeout(INPUT_SETTLE_MS, epoch),
    Ao = epoch === 0 || bo,
    [Bo, Ro] = y(!1),
    Ho = fitVisibleOptionCount(2, "compact-vertical") === 2 || ee,
    Io = so && Ao && !Bo && Ho,
    { box: box, rows: rows } = useOfferRoom(),
    Cn;
  if ($[12] !== box.current)
    ((Cn = () => (box.current === null ? 0 : measureElement(box.current).height)),
      ($[12] = box.current),
      ($[13] = Cn));
  else Cn = $[13];
  let vo = useMeasured(Cn) - OFFER_MIN_ROWS - rows,
    { columns: columns, rows: rows_2 } = useTerminalSize(),
    Fn;
  if ($[14] !== columns || $[15] !== rows_2)
    ((Fn = { columns: columns, rows: rows_2, overflow: -Infinity }),
      ($[14] = columns),
      ($[15] = rows_2),
      ($[16] = Fn));
  else Fn = $[16];
  let [bn, Go] = y(Fn),
    hn = bn.columns === columns && bn.rows === rows_2,
    Mn,
    Xo;
  if ($[17] !== columns || $[18] !== hn || $[19] !== bn.overflow || $[20] !== vo || $[21] !== rows_2)
    ((Mn = () => {
      if (!hn) Go({ columns: columns, rows: rows_2, overflow: -Infinity });
      else if (vo > bn.overflow) Go({ columns: columns, rows: rows_2, overflow: vo });
    }),
      (Xo = [hn, columns, rows_2, vo, bn.overflow]),
      ($[17] = columns),
      ($[18] = hn),
      ($[19] = bn.overflow),
      ($[20] = vo),
      ($[21] = rows_2),
      ($[22] = Mn),
      ($[23] = Xo));
  else ((Mn = $[22]), (Xo = $[23]));
  zt(Mn, Xo);
  let $n = (useIsFullscreen() ? vo : Math.max(vo, hn ? bn.overflow : -Infinity)) > 0,
    [on, _o] = y(0),
    [cn, Dn] = y(0),
    wn;
  if ($[24] !== noteRefused)
    ((wn = function Wn(mr) {
      (Ro(!0), noteRefused(), _o((Kn) => Kn + mr), Dn(nvo));
    }),
      ($[24] = noteRefused),
      ($[25] = wn));
  else wn = $[25];
  let Wn = wn,
    Fr;
  if ($[26] !== onDone || $[27] !== ze || $[28] !== Dt.tokens || $[29] !== Ot || $[30] !== on)
    ((Fr = (Zn) => onDone({ choice: Zn, tokens: Dt.tokens, stepperMoves: Ot, strayKeys: on, ...ze })),
      ($[26] = onDone),
      ($[27] = ze),
      ($[28] = Dt.tokens),
      ($[29] = Ot),
      ($[30] = on),
      ($[31] = Fr));
  else Fr = $[31];
  let Un = useRefusableAnswer(Fr),
    dr = useInputClock(),
    or = R(null),
    pr;
  if (
    $[32] !== Ho ||
    $[33] !== so ||
    $[34] !== dr ||
    $[35] !== Io ||
    $[36] !== ee ||
    $[37] !== Bo ||
    $[38] !== noteRefused ||
    $[39] !== Wn ||
    $[40] !== refusedWithin ||
    $[41] !== Un ||
    $[42] !== io
  )
    ((pr = (Qn, ur, Ir) => {
      if (ur.wheelUp || ur.wheelDown) {
        return !1;
      }
      let Pr = !ur.ctrl && !ur.meta && !ur.shift && !ur.super;
      let ts = Pr && (ur.upArrow || ur.downArrow || ur.leftArrow || ur.rightArrow);
      let Gn = Pr && (ur.return || ur.escape);
      let Ur = ee && /^[0-9]$/.test(Qn);
      if (!ts && !Gn && !Ur) {
        return (
          Wn(Qn.length || (Ir.startsWith("\x1B") ? 1 : Ir.length) || 1),
          !(ur.ctrl && (Qn === "c" || Qn === "d"))
        );
      }
      if (!so || refusedWithin(INPUT_SETTLE_MS)) {
        return (noteRefused(), !0);
      }
      if (Bo) {
        return (Ro(!1), noteRefused(), !0);
      }
      if (!Ho) {
        if (ur.escape) Un.answer("esc");
        else noteRefused();
        return !0;
      }
      if (!Io) {
        return !0;
      }
      if (ts) or.current = Date.now();
      else if (or.current !== null && isWithinRecentInput(dr, or.current, So)) {
        return (noteRefused(), !0);
      }
      if (!ee && (ur.leftArrow || ur.rightArrow)) {
        return (io(ur.rightArrow ? 1 : -1), !0);
      }
      return !1;
    }),
      ($[32] = Ho),
      ($[33] = so),
      ($[34] = dr),
      ($[35] = Io),
      ($[36] = ee),
      ($[37] = Bo),
      ($[38] = noteRefused),
      ($[39] = Wn),
      ($[40] = refusedWithin),
      ($[41] = Un),
      ($[42] = io),
      ($[43] = pr));
  else pr = $[43];
  usePreDispatchKeyHandler(pr);
  let [Zr, wr] = y(!1),
    zr,
    _r;
  if ($[44] === MEMO_CACHE_SENTINEL)
    ((zr = () => {
      wr(!0);
    }),
      (_r = []),
      ($[44] = zr),
      ($[45] = _r));
  else ((zr = $[44]), (_r = $[45]));
  P(zr, _r);
  let $r = (Un.refused === "esc" ? null : Un.refused) ?? (Zr ? void 0 : Re),
    Yr;
  if ($[46] !== Dt.tokens) ((Yr = formatTokens(Dt.tokens)), ($[46] = Dt.tokens), ($[47] = Yr));
  else Yr = $[47];
  let Er = Yr,
    Vr;
  if ($[48] !== payload) ((Vr = describeCurrentWindow(payload)), ($[48] = payload), ($[49] = Vr));
  else Vr = $[49];
  const ms = `Each message re-sends the whole conversation, so long conversations use up your plan's usage limits faster. With your current settings, Claude Code autocompacts (replaces older messages with a summary) at ${Vr}. Compacting earlier can reduce usage, but it happens more often, and some details can be lost each time.`,
    Xs = `Want to autocompact at ${Er} tokens instead? Your model doesn't change. Switch back any time with /autocompact.`;
  let Ls;
  if ($[50] !== ms || $[51] !== Xs) ((Ls = [ms, Xs]), ($[50] = ms), ($[51] = Xs), ($[52] = Ls));
  else Ls = $[52];
  let joined = Ls.join(`

`),
    ws;
  if ($[53] !== Io || $[54] !== ee)
    ((ws = (Ci) => (Io || ee ? Ci : e(Text, { dimColor: !0, children: Ci }))),
      ($[53] = Io),
      ($[54] = ee),
      ($[55] = ws));
  else ws = $[55];
  let oi = ws;
  const Oi = ee ? `Autocompact at ${Er} tokens` : `Autocompact at \u2039 ${Er} \u203A tokens`;
  let Hi;
  if ($[56] !== oi || $[57] !== Oi) ((Hi = oi(Oi)), ($[56] = oi), ($[57] = Oi), ($[58] = Hi));
  else Hi = $[58];
  let Zi;
  if ($[59] !== payload.contextTokens || $[60] !== Dt.firesAt)
    ((Zi =
      payload.contextTokens >= Dt.firesAt
        ? `This conversation is at ${formatTokens(payload.contextTokens)}, so it will be summarized on your next message.`
        : void 0),
      ($[59] = payload.contextTokens),
      ($[60] = Dt.firesAt),
      ($[61] = Zi));
  else Zi = $[61];
  let da;
  if ($[62] !== Hi || $[63] !== Zi)
    ((da = { label: Hi, value: "accept", description: Zi }), ($[62] = Hi), ($[63] = Zi), ($[64] = da));
  else da = $[64];
  let qn = da,
    ps;
  if ($[65] !== payload) ((ps = currentWindowLabel(payload)), ($[65] = payload), ($[66] = ps));
  else ps = $[66];
  const xs = `Keep ${ps}`;
  let kr;
  if ($[67] !== oi || $[68] !== xs) ((kr = oi(xs)), ($[67] = oi), ($[68] = xs), ($[69] = kr));
  else kr = $[69];
  let ls;
  if ($[70] !== kr) ((ls = { label: kr, value: "keep" }), ($[70] = kr), ($[71] = ls));
  else ls = $[71];
  let Ms = ls;
  const qs = ee ? void 0 : box;
  let gs;
  if ($[72] !== Wn) ((gs = (es) => Wn(es.text.length)), ($[72] = Wn), ($[73] = gs));
  else gs = $[73];
  let ds;
  if ($[74] !== joined)
    ((ds = e(Box, { marginBottom: 1, children: e(Text, { children: joined }) })),
      ($[74] = joined),
      ($[75] = ds));
  else ds = $[75];
  const Hs = `${Un.attempts}:${ee ? `${cn}:${Io}` : ""}`,
    _s = !Io;
  let fs;
  if ($[76] !== qn || $[77] !== Re || $[78] !== Ms)
    ((fs = Re === "accept" ? [qn, Ms] : [Ms, qn]), ($[76] = qn), ($[77] = Re), ($[78] = Ms), ($[79] = fs));
  else fs = $[79];
  let ii;
  if ($[80] !== Un) ((ii = () => Un.answer("esc")), ($[80] = Un), ($[81] = ii));
  else ii = $[81];
  let ua;
  if ($[82] !== $r || $[83] !== Un.answer || $[84] !== Hs || $[85] !== _s || $[86] !== fs || $[87] !== ii)
    ((ua = e(
      ModelSelector,
      {
        isDisabled: _s,
        hidePromptWhileDisabled: !0,
        options: fs,
        layout: "compact-vertical",
        selectedValue: NO_COMMITTED_ROW,
        defaultFocusValue: $r,
        hideIndexes: !0,
        disablePrintableKeybindings: !0,
        onChange: Un.answer,
        onCancel: ii,
      },
      Hs,
    )),
      ($[82] = $r),
      ($[83] = Un.answer),
      ($[84] = Hs),
      ($[85] = _s),
      ($[86] = fs),
      ($[87] = ii),
      ($[88] = ua));
  else ua = $[88];
  let La;
  if ($[89] !== ke || $[90] !== $n || $[91] !== ee)
    ((La =
      (!ee || ke.pending) &&
      r(Box, {
        flexDirection: "column",
        marginTop: $n ? 0 : 1,
        children: [
          e(Text, {
            dimColor: !0,
            children: ke.pending ? `Press ${ke.keyName} again to exit` : AUTOCOMPACT_OFFER_KEYS_HINT,
          }),
          $n && e(Text, { color: "warning", wrap: "truncate-end", children: MORE_TEXT_ABOVE_HINT }),
        ],
      })),
      ($[89] = ke),
      ($[90] = $n),
      ($[91] = ee),
      ($[92] = La));
  else La = $[92];
  let Xa;
  if ($[93] !== ds || $[94] !== ua || $[95] !== La)
    ((Xa = e(PermissionDialog_2, {
      title: AUTOCOMPACT_OFFER_TITLE,
      srPrefix: null,
      children: r(Box, { flexDirection: "column", paddingX: 2, paddingY: 1, children: [ds, ua, La] }),
    })),
      ($[93] = ds),
      ($[94] = ua),
      ($[95] = La),
      ($[96] = Xa));
  else Xa = $[96];
  let dl;
  if ($[97] !== qs || $[98] !== gs || $[99] !== Xa)
    ((dl = e(Box, {
      ref: qs,
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: !0,
      onPaste: gs,
      children: Xa,
    })),
      ($[97] = qs),
      ($[98] = gs),
      ($[99] = Xa),
      ($[100] = dl));
  else dl = $[100];
  return dl;
}

export { FittedOfferBody, AutocompactOfferDialog };
