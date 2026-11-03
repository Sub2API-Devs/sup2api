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
  MIN_BODY_ROWS,
  MIN_BODY_COLUMNS,
  DIALOG_HORIZONTAL_CHROME,
  offerTelemetryFields,
  describeCurrentWindow,
  currentWindowLabel,
} from "../services/compact/autocompactOffer.js";
import { R, Se, y, Q, zt, ce, Oo, P } from "../../vendor/react/cjs/react.production.js";
import { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS } from "./design-system/ScrollColumn.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "./ScrollViewportContext.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { countCharInString } from "../utils/stringUtils.js";
import { useTimeout, measureElement, topWithin } from "../ink/hooks/useTerminalHooks.js";
import {
  RECENT_INPUT_GUARD_MS_2,
  INPUT_SETTLE_MS,
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3,
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";

//@ chunk-18hwfzwa.js:1115692-1116037 placement
/**
 * 把文本按宽度折行后截取不超过 maxRows 的窗口（从 start 行开始），返回文本、隐藏行数、上方隐藏行数与下一页起点。
 */
function fitTextToRows(text, width, maxRows, start = 0) {
  let lines = wrapText(text, Math.max(1, width), "wrap").split(`
`);
  let max = Math.max(MIN_BODY_ROWS, maxRows);
  if (lines.length <= max)
    return {
      text,
      hiddenRows: 0,
      hiddenAbove: 0,
      nextStart: 0,
    };
  let Re = max - 1;
  let min = Math.min(Math.max(0, start), lines.length - Re);
  let sliced = lines.slice(min, min + Re);
  let We = lines.length - min - sliced.length;
  return {
    text: sliced.join(`
`),
    hiddenRows: We,
    hiddenAbove: min,
    nextStart: We === 0 ? 0 : min + sliced.length,
  };
}
//@ chunk-18hwfzwa.js:1116037-1116609 placement
/**
 * 计算自动压缩提议对话框的布局：是否显示常驻选项、是否保持常驻、正文可用行数与稳定后的模式。
 */
function planOfferLayout(measure, bodyRows, mode) {
  let L = measure?.chromeWithout ?? measure?.chromeWith ?? null;
  let ee = measure?.chromeWith ?? measure?.chromeWithout ?? null;
  if (measure === null || L === null || ee === null)
    return {
      offersStanding: mode === "standing",
      isStandingHeld: mode === "standing",
      room: MIN_BODY_ROWS,
      settles: null,
    };
  let ke = measure.overdraw === 0 && ee + bodyRows <= measure.available;
  if (mode === "bare" || (mode === "unsettled" && !ke))
    return {
      offersStanding: false,
      isStandingHeld: false,
      room: Math.max(MIN_BODY_ROWS, measure.available - L - measure.overdraw),
      settles: measure.chromeWithout === null ? null : "bare",
    };
  return {
    offersStanding: true,
    isStandingHeld: !ke,
    room: ke ? bodyRows : Math.max(MIN_BODY_ROWS, measure.available - ee - measure.overdraw),
    settles: measure.chromeWith === null ? null : "standing",
  };
}
//@ chunk-18hwfzwa.js:1116609-1119923 placement
/**
 * 自动压缩提议对话框的正文（适配宽度）。
 */
function FittedOfferBody(text, { isActive, isCut, contentKey, maxRows, lateBody, keptForRequest }) {
  let Be = R(null);
  let He = R(null);
  let scrollColumnContext = useScrollColumnContext();
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let { subscribeLayout } = Se(kp);
  let [At, It] = y(null);
  let Ot = At?.contentKey === contentKey ? At : null;
  let width = Ot?.columns ?? Math.max(MIN_BODY_COLUMNS, terminalSize.columns - DIALOG_HORIZONTAL_CHROME);
  let bodyRows = Q(
    () =>
      isActive
        ? countCharInString(
            wrapText(text, Math.max(1, width), "wrap"),
            `
`,
          ) + 1
        : 0,
    [isActive, text, width],
  );
  let [Lt, oo] = y(null);
  let start = Lt !== null && Lt.contentKey === contentKey && Lt.columns === width ? Lt.start : 0;
  let [io, so] = y(() => (keptForRequest?.has("bare") === true ? "bare" : "unsettled"));
  let measure = Ot === null && io === "standing" && At !== null ? At.fit : (Ot?.fit ?? null);
  let ao = isActive && lateBody === "pending";
  let { offersStanding, isStandingHeld, room, settles } = isActive
    ? planOfferLayout(measure, bodyRows, ao && io === "unsettled" ? "standing" : io)
    : {
        offersStanding: true,
        isStandingHeld: false,
        room: bodyRows,
        settles: null,
      };
  let timeout = useTimeout(isActive && io === "unsettled" ? RECENT_INPUT_GUARD_MS_2 : null);
  if (isActive && io === "unsettled") {
    if (settles !== null && Ot !== null && lateBody === undefined) so(settles);
    else if (timeout) so(offersStanding ? "standing" : "bare");
  }
  let Ho = isStandingHeld || ao;
  let [Io, Wo] = y(() => keptForRequest?.has("held") ?? false);
  if (isActive && io === "standing" && (Ot !== null || ao) && Ho && !Io) Wo(true);
  let isStandingHeld_2 = Ho || Io;
  zt(() => {
    if (keptForRequest === undefined) return;
    if (Io) keptForRequest.keep("held");
    if (io === "bare") keptForRequest.keep("bare");
  }, [keptForRequest, Io, io]);
  let Cn = Q(
    () =>
      isActive && isCut
        ? fitTextToRows(text, width, Math.min(room, maxRows ?? room), start)
        : {
            text,
            hiddenRows: 0,
            hiddenAbove: 0,
            nextStart: 0,
          },
    [isActive, isCut, text, width, room, maxRows, start],
  );
  let No = (offersStanding ? Ot?.fit.chromeWith : Ot?.fit.chromeWithout) ?? null;
  let shortRows =
    isActive && Ot !== null && No !== null
      ? Math.max(0, No + MIN_BODY_ROWS + Ot.fit.overdraw - Ot.fit.available)
      : 0;
  let nextStart = Cn.nextStart;
  let showNextRows = ce(
    () =>
      oo({
        contentKey,
        columns: width,
        start: nextStart,
      }),
    [contentKey, width, nextStart],
  );
  let Fn = Oo(() => {
    if (!isActive || Be.current === null || He.current === null) return;
    let node = scrollColumnContext?.box.current ?? Be.current;
    while (scrollColumnContext === null && node.parentNode !== undefined) node = node.parentNode;
    let height = measureElement(Be.current).height;
    if (height === 0) return;
    let height_2 = measureElement(node).height;
    let Mn = height_2 - height;
    if (Mn <= 0) return;
    let Xo = hasScrollViewport
      ? (scrollColumnContext?.rows ?? rows)
      : measureRoomAbove(node, terminalSize.rows, scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS);
    let Sn = topWithin(Be.current, node);
    let $n = measureElement(He.current);
    let on = {
      contentKey,
      text,
      columns: $n.width,
      terminalRows: terminalSize.rows,
      terminalColumns: terminalSize.columns,
    };
    let _o =
      Cn.hiddenRows + Cn.hiddenAbove === 0
        ? bodyRows
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
          : {
              available: Xo,
              chromeWithout: null,
              chromeWith: null,
              overdraw: 0,
            };
      let max = Math.max(
        cn?.text === text && cn.columns === on.columns ? cn.fit.overdraw : 0,
        width === on.columns ? $n.height - _o : 0,
      );
      let mr = offersStanding ? Dn.chromeWith : Dn.chromeWithout;
      let min = Math.min(height, MIN_BODY_ROWS + max);
      let Fr =
        (hasScrollViewport ? Sn + min : height_2 - Sn - height + min) <= Xo &&
        (Dn !== cn?.fit || cn.isBodyOnScreen);
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
  zt(() => {
    Fn();
    return subscribeLayout(Fn);
  }, [subscribeLayout]);
  usePreDispatchKeyHandler(
    (input, key) => {
      if (key.wheelUp || key.wheelDown) return false;
      if (keptForRequest !== undefined && !offersStanding) keptForRequest.keep("bare");
      so((hn) => (hn === "unsettled" ? (offersStanding ? "standing" : "bare") : hn));
      return false;
    },
    {
      isActive: isActive && io === "unsettled",
    },
  );
  return {
    text: Cn.text,
    hiddenRows: Cn.hiddenRows,
    hiddenAbove: Cn.hiddenAbove,
    showNextRows,
    offersStanding,
    isStandingHeld: isStandingHeld_2,
    isHeldForGood: Io,
    isMeasured:
      settles !== null &&
      Ot !== null &&
      Ot.terminalRows === terminalSize.rows &&
      Ot.terminalColumns === terminalSize.columns,
    fitsScreen:
      settles !== null &&
      Ot !== null &&
      Ot.terminalRows === terminalSize.rows &&
      Ot.terminalColumns === terminalSize.columns &&
      ((offersStanding ? Ot.fit.chromeWith : Ot.fit.chromeWithout) ?? Number.POSITIVE_INFINITY) +
        Math.min(bodyRows, room) +
        Ot.fit.overdraw <=
        Ot.fit.available,
    box: Be,
    textBox: He,
    columns: width,
    shortRows,
    isBodyOnScreen: Ot?.isBodyOnScreen ?? null,
  };
}
//@ chunk-18hwfzwa.js:1119923-1120222 placement
function useOfferRoom() {
  let h = R(null);
  let terminalSize = useTerminalSize();
  let reserve = useScrollColumnContext()?.reserve ?? SCROLL_COLUMN_MIN_ROWS;
  let L = Se(ContextSlotA);
  function ee() {
    if (h.current === null) return null;
    let Re = L?.() ?? null;
    return Re === null
      ? measureRoomAbove(h.current, terminalSize.rows, reserve, true)
      : Re + measureElement(h.current).height;
  }
  let measured = useMeasured(ee);
  return {
    box: h,
    rows: measured ?? terminalSize.rows - reserve,
    rowsNow: () => ee() ?? terminalSize.rows - reserve,
    isCutFromTheBottom: L !== null,
  };
}
//@ chunk-18hwfzwa.js:1120222-1120776 placement
/**
 * 自下而上测量节点之后的兄弟元素高度，求出该节点可用的终端行数；遇到可滚动父容器时以其内高为准。
 */
function measureRoomAbove(node, rows, reserve, withMargins = false) {
  let ee = 0;
  let ke = node;
  while (ke.parentNode !== undefined) {
    let parentNode = ke.parentNode;
    if ((parentNode.style.overflowY ?? parentNode.style.overflow) === "scroll") {
      let Be =
        measureElement(parentNode).height -
        (parentNode.yogaNode?.getComputedPadding(1) ?? 0) -
        (parentNode.yogaNode?.getComputedPadding(3) ?? 0);
      return Math.min(Be, rows - SCROLL_COLUMN_MIN_ROWS) - ee;
    }
    for (let childNode of parentNode.childNodes.slice(parentNode.childNodes.indexOf(ke) + 1))
      if (
        childNode.nodeName !== "#text" &&
        childNode.style.position !== "absolute" &&
        !(childNode.style.flexGrow ?? 0)
      )
        ee +=
          measureElement(childNode).height +
          (withMargins
            ? (childNode.yogaNode?.getComputedMargin(1) ?? 0) +
              (childNode.yogaNode?.getComputedMargin(3) ?? 0)
            : 0);
    ke = parentNode;
  }
  return rows - Math.max(reserve, SCROLL_COLUMN_MIN_ROWS + ee);
}
//@ chunk-18hwfzwa.js:1120776-1120805 placement
function increment_2(Vl) {
  return Vl + 1;
}
//@ chunk-18hwfzwa.js:1120805-1120834 placement
function increment_2_2(Hd) {
  return Hd + 1;
}
//@ chunk-18hwfzwa.js:1120834-1121034 placement
var AUTOCOMPACT_OFFER_TITLE = "We recommend compacting earlier";
var AUTOCOMPACT_OFFER_KEYS_HINT =
  "\u2191/\u2193 choose \xB7 \u2190/\u2192 change size \xB7 enter confirm \xB7 esc not now";
var MORE_TEXT_ABOVE_HINT = "More text above: scroll up, or enlarge the terminal";
var OFFER_MIN_ROWS = 2;
//@ chunk-18hwfzwa.js:1121034-1127615 placement
/**
 * AutocompactOfferDialog：上下文接近上限时提议开启自动压缩的对话框。
 */
function AutocompactOfferDialog(props) {
  let $ = w(101);
  let { payload, onDone } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let globalExitKeybindings = useGlobalExitKeybindings();
  let Re = payload.order === "lower_first" ? "accept" : "keep";
  const preselected = Re === "accept" ? "lower" : "keep";
  let We;
  if ($[0] !== isScreenReaderEnabled || $[1] !== preselected) {
    We = {
      preselected,
      isScreenReader: isScreenReaderEnabled,
    };
    $[0] = isScreenReaderEnabled;
    $[1] = preselected;
    $[2] = We;
  } else We = $[2];
  let ze = We;
  let Xe;
  if ($[3] !== payload || $[4] !== ze) {
    Xe = () => {
      logEvent("tengu_autocompact_offer_shown", offerTelemetryFields(payload, ze));
    };
    $[3] = payload;
    $[4] = ze;
    $[5] = Xe;
  } else Xe = $[5];
  useOnFirstReveal("impression", Xe);
  let rt;
  if ($[6] !== payload.defaultTokens || $[7] !== payload.sizes) {
    rt = () => payload.sizes.findIndex((siz) => siz.tokens === payload.defaultTokens);
    $[6] = payload.defaultTokens;
    $[7] = payload.sizes;
    $[8] = rt;
  } else rt = $[8];
  let [At, It] = y(rt);
  let [Ot, Et] = y(0);
  let Dt = payload.sizes[At] ?? payload.sizes[0];
  let Lt;
  if ($[9] !== payload.sizes.length || $[10] !== At) {
    Lt = function io(oo) {
      let Xt = At + oo;
      if (Xt < 0 || Xt >= payload.sizes.length) {
        return;
      }
      It(Xt);
      Et(increment_2);
    };
    $[9] = payload.sizes.length;
    $[10] = At;
    $[11] = Lt;
  } else Lt = $[11];
  let io = Lt;
  let confirmArmed = useConfirmArmed(CONFIRM_ARM_DELAY_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let timeout = useTimeout(INPUT_SETTLE_MS, epoch);
  let Ao = epoch === 0 || timeout;
  let [Bo, Ro] = y(false);
  let Ho = fitVisibleOptionCount(2, "compact-vertical") === 2 || isScreenReaderEnabled;
  let Io = confirmArmed && Ao && !Bo && Ho;
  let { box, rows } = useOfferRoom();
  let Cn;
  if ($[12] !== box.current) {
    Cn = () => (box.current === null ? 0 : measureElement(box.current).height);
    $[12] = box.current;
    $[13] = Cn;
  } else Cn = $[13];
  let vo = useMeasured(Cn) - OFFER_MIN_ROWS - rows;
  let { columns, rows: rows_2 } = useTerminalSize();
  let Fn;
  if ($[14] !== columns || $[15] !== rows_2) {
    Fn = {
      columns,
      rows: rows_2,
      overflow: -Infinity,
    };
    $[14] = columns;
    $[15] = rows_2;
    $[16] = Fn;
  } else Fn = $[16];
  let [bn, Go] = y(Fn);
  let hn = bn.columns === columns && bn.rows === rows_2;
  let Mn;
  let Xo;
  if ($[17] !== columns || $[18] !== hn || $[19] !== bn.overflow || $[20] !== vo || $[21] !== rows_2) {
    Mn = () => {
      if (!hn)
        Go({
          columns,
          rows: rows_2,
          overflow: -Infinity,
        });
      else if (vo > bn.overflow)
        Go({
          columns,
          rows: rows_2,
          overflow: vo,
        });
    };
    Xo = [hn, columns, rows_2, vo, bn.overflow];
    $[17] = columns;
    $[18] = hn;
    $[19] = bn.overflow;
    $[20] = vo;
    $[21] = rows_2;
    $[22] = Mn;
    $[23] = Xo;
  } else {
    Mn = $[22];
    Xo = $[23];
  }
  zt(Mn, Xo);
  let $n = (useIsFullscreen() ? vo : Math.max(vo, hn ? bn.overflow : -Infinity)) > 0;
  let [on, _o] = y(0);
  let [cn, Dn] = y(0);
  let wn;
  if ($[24] !== noteRefused) {
    wn = function Wn(mr) {
      Ro(true);
      noteRefused();
      _o((Kn) => Kn + mr);
      Dn(increment_2_2);
    };
    $[24] = noteRefused;
    $[25] = wn;
  } else wn = $[25];
  let Wn = wn;
  let Fr;
  if ($[26] !== onDone || $[27] !== ze || $[28] !== Dt.tokens || $[29] !== Ot || $[30] !== on) {
    Fr = (choice) =>
      onDone({
        choice,
        tokens: Dt.tokens,
        stepperMoves: Ot,
        strayKeys: on,
        ...ze,
      });
    $[26] = onDone;
    $[27] = ze;
    $[28] = Dt.tokens;
    $[29] = Ot;
    $[30] = on;
    $[31] = Fr;
  } else Fr = $[31];
  let refusableAnswer = useRefusableAnswer(Fr);
  let inputClock = useInputClock();
  let or = R(null);
  let pr;
  if (
    $[32] !== Ho ||
    $[33] !== confirmArmed ||
    $[34] !== inputClock ||
    $[35] !== Io ||
    $[36] !== isScreenReaderEnabled ||
    $[37] !== Bo ||
    $[38] !== noteRefused ||
    $[39] !== Wn ||
    $[40] !== refusedWithin ||
    $[41] !== refusableAnswer ||
    $[42] !== io
  ) {
    pr = (input, key, Ir) => {
      if (key.wheelUp || key.wheelDown) {
        return false;
      }
      let Pr = !key.ctrl && !key.meta && !key.shift && !key.super;
      let ts = Pr && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow);
      let Gn = Pr && (key.return || key.escape);
      let Ur = isScreenReaderEnabled && /^[0-9]$/.test(input);
      if (!ts && !Gn && !Ur) {
        Wn(input.length || (Ir.startsWith("\x1B") ? 1 : Ir.length) || 1);
        return !(key.ctrl && (input === "c" || input === "d"));
      }
      if (!confirmArmed || refusedWithin(INPUT_SETTLE_MS)) {
        noteRefused();
        return true;
      }
      if (Bo) {
        Ro(false);
        noteRefused();
        return true;
      }
      if (!Ho) {
        if (key.escape) refusableAnswer.answer("esc");
        else noteRefused();
        return true;
      }
      if (!Io) {
        return true;
      }
      if (ts) or.current = Date.now();
      else if (or.current !== null && isWithinRecentInput(inputClock, or.current, RECENT_INPUT_GUARD_MS_3)) {
        noteRefused();
        return true;
      }
      if (!isScreenReaderEnabled && (key.leftArrow || key.rightArrow)) {
        io(key.rightArrow ? 1 : -1);
        return true;
      }
      return false;
    };
    $[32] = Ho;
    $[33] = confirmArmed;
    $[34] = inputClock;
    $[35] = Io;
    $[36] = isScreenReaderEnabled;
    $[37] = Bo;
    $[38] = noteRefused;
    $[39] = Wn;
    $[40] = refusedWithin;
    $[41] = refusableAnswer;
    $[42] = io;
    $[43] = pr;
  } else pr = $[43];
  usePreDispatchKeyHandler(pr);
  let [Zr, wr] = y(false);
  let zr;
  let _r;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    zr = () => {
      wr(true);
    };
    _r = [];
    $[44] = zr;
    $[45] = _r;
  } else {
    zr = $[44];
    _r = $[45];
  }
  P(zr, _r);
  let defaultFocusValue =
    (refusableAnswer.refused === "esc" ? null : refusableAnswer.refused) ?? (Zr ? undefined : Re);
  let Yr;
  if ($[46] !== Dt.tokens) {
    Yr = formatTokens(Dt.tokens);
    $[46] = Dt.tokens;
    $[47] = Yr;
  } else Yr = $[47];
  let Er = Yr;
  let Vr;
  if ($[48] !== payload) {
    Vr = describeCurrentWindow(payload);
    $[48] = payload;
    $[49] = Vr;
  } else Vr = $[49];
  const ms = `Each message re-sends the whole conversation, so long conversations use up your plan's usage limits faster. With your current settings, Claude Code autocompacts (replaces older messages with a summary) at ${Vr}. Compacting earlier can reduce usage, but it happens more often, and some details can be lost each time.`;
  const Xs = `Want to autocompact at ${Er} tokens instead? Your model doesn't change. Switch back any time with /autocompact.`;
  let Ls;
  if ($[50] !== ms || $[51] !== Xs) {
    Ls = [ms, Xs];
    $[50] = ms;
    $[51] = Xs;
    $[52] = Ls;
  } else Ls = $[52];
  let children = Ls.join(`

`);
  let ws;
  if ($[53] !== Io || $[54] !== isScreenReaderEnabled) {
    ws = (Ci) =>
      Io || isScreenReaderEnabled
        ? Ci
        : jsxProd_default(Text, {
            dimColor: true,
            children: Ci,
          });
    $[53] = Io;
    $[54] = isScreenReaderEnabled;
    $[55] = ws;
  } else ws = $[55];
  let oi = ws;
  const Oi = isScreenReaderEnabled
    ? `Autocompact at ${Er} tokens`
    : `Autocompact at \u2039 ${Er} \u203A tokens`;
  let label;
  if ($[56] !== oi || $[57] !== Oi) {
    label = oi(Oi);
    $[56] = oi;
    $[57] = Oi;
    $[58] = label;
  } else label = $[58];
  let description;
  if ($[59] !== payload.contextTokens || $[60] !== Dt.firesAt) {
    description =
      payload.contextTokens >= Dt.firesAt
        ? `This conversation is at ${formatTokens(payload.contextTokens)}, so it will be summarized on your next message.`
        : undefined;
    $[59] = payload.contextTokens;
    $[60] = Dt.firesAt;
    $[61] = description;
  } else description = $[61];
  let da;
  if ($[62] !== label || $[63] !== description) {
    da = {
      label,
      value: "accept",
      description,
    };
    $[62] = label;
    $[63] = description;
    $[64] = da;
  } else da = $[64];
  let qn = da;
  let ps;
  if ($[65] !== payload) {
    ps = currentWindowLabel(payload);
    $[65] = payload;
    $[66] = ps;
  } else ps = $[66];
  const xs = `Keep ${ps}`;
  let label_2;
  if ($[67] !== oi || $[68] !== xs) {
    label_2 = oi(xs);
    $[67] = oi;
    $[68] = xs;
    $[69] = label_2;
  } else label_2 = $[69];
  let ls;
  if ($[70] !== label_2) {
    ls = {
      label: label_2,
      value: "keep",
    };
    $[70] = label_2;
    $[71] = ls;
  } else ls = $[71];
  let Ms = ls;
  const ref = isScreenReaderEnabled ? undefined : box;
  let onPaste;
  if ($[72] !== Wn) {
    onPaste = (es) => Wn(es.text.length);
    $[72] = Wn;
    $[73] = onPaste;
  } else onPaste = $[73];
  let ds;
  if ($[74] !== children) {
    ds = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children,
      }),
    });
    $[74] = children;
    $[75] = ds;
  } else ds = $[75];
  const Hs = `${refusableAnswer.attempts}:${isScreenReaderEnabled ? `${cn}:${Io}` : ""}`;
  const isDisabled = !Io;
  let options;
  if ($[76] !== qn || $[77] !== Re || $[78] !== Ms) {
    options = Re === "accept" ? [qn, Ms] : [Ms, qn];
    $[76] = qn;
    $[77] = Re;
    $[78] = Ms;
    $[79] = options;
  } else options = $[79];
  let onCancel;
  if ($[80] !== refusableAnswer) {
    onCancel = () => refusableAnswer.answer("esc");
    $[80] = refusableAnswer;
    $[81] = onCancel;
  } else onCancel = $[81];
  let ua;
  if (
    $[82] !== defaultFocusValue ||
    $[83] !== refusableAnswer.answer ||
    $[84] !== Hs ||
    $[85] !== isDisabled ||
    $[86] !== options ||
    $[87] !== onCancel
  ) {
    ua = jsxProd_default(
      ModelSelector,
      {
        isDisabled,
        hidePromptWhileDisabled: true,
        options,
        layout: "compact-vertical",
        selectedValue: NO_COMMITTED_ROW,
        defaultFocusValue,
        hideIndexes: true,
        disablePrintableKeybindings: true,
        onChange: refusableAnswer.answer,
        onCancel,
      },
      Hs,
    );
    $[82] = defaultFocusValue;
    $[83] = refusableAnswer.answer;
    $[84] = Hs;
    $[85] = isDisabled;
    $[86] = options;
    $[87] = onCancel;
    $[88] = ua;
  } else ua = $[88];
  let La;
  if ($[89] !== globalExitKeybindings || $[90] !== $n || $[91] !== isScreenReaderEnabled) {
    La =
      (!isScreenReaderEnabled || globalExitKeybindings.pending) &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: $n ? 0 : 1,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: globalExitKeybindings.pending
              ? `Press ${globalExitKeybindings.keyName} again to exit`
              : AUTOCOMPACT_OFFER_KEYS_HINT,
          }),
          $n &&
            jsxProd_default(Text, {
              color: "warning",
              wrap: "truncate-end",
              children: MORE_TEXT_ABOVE_HINT,
            }),
        ],
      });
    $[89] = globalExitKeybindings;
    $[90] = $n;
    $[91] = isScreenReaderEnabled;
    $[92] = La;
  } else La = $[92];
  let children_2;
  if ($[93] !== ds || $[94] !== ua || $[95] !== La) {
    children_2 = jsxProd_default(PermissionDialog_2, {
      title: AUTOCOMPACT_OFFER_TITLE,
      srPrefix: null,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 2,
        paddingY: 1,
        children: [ds, ua, La],
      }),
    });
    $[93] = ds;
    $[94] = ua;
    $[95] = La;
    $[96] = children_2;
  } else children_2 = $[96];
  let dl;
  if ($[97] !== ref || $[98] !== onPaste || $[99] !== children_2) {
    dl = jsxProd_default(Box, {
      ref,
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      onPaste,
      children: children_2,
    });
    $[97] = ref;
    $[98] = onPaste;
    $[99] = children_2;
    $[100] = dl;
  } else dl = $[100];
  return dl;
}
export { FittedOfferBody, AutocompactOfferDialog };
