/**
 * components/usageCredits/BuyCreditsFlow.tsx
 *
 * 2.1.316 新增。购买额度流程。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (17)
 * attribution: placement 17
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Me } from "../design-system/ThemeProvider.js";
import { y, P, R, Oo, j } from "../../../vendor/react/cjs/react.production.js";
import {
  r1,
  i1,
  USAGE_SETTINGS_LINK,
  computeCreditOffer,
  sat,
  WL,
  useAmountInputBuffer,
  parseAmountInput,
  iat,
  wTo,
  kTo,
  E8,
  vTo,
  CTo,
  _To,
  CONSUMER_TERMS_URL,
  rat,
  nat,
} from "./creditOffers.js";
import { previewPurchaseTax, fetchPrepaidPurchaseStatus } from "../../services/api/billing.js";
import { formatCurrency, getCurrencySymbol } from "../../services/api/referral.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { _h } from "./ExtraUsageDialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { TextInput } from "../TextInput.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { AnimatedClawd } from "../LogoV2/AnimatedClawd.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";

/**
 * 左右两端对齐的标签-数值行（购买额度汇总）。
 */
//@ chunk-18hwfzwa.js:1154884-1155348 placement
function SummaryRow(h) {
  let $ = w(11),
    { label: label, value: D, bold: bold, dim: dim } = h,
    Re;
  if ($[0] !== bold || $[1] !== dim || $[2] !== label)
    ((Re = e(Text, { dimColor: dim, bold: bold, children: label })),
      ($[0] = bold),
      ($[1] = dim),
      ($[2] = label),
      ($[3] = Re));
  else Re = $[3];
  let Be;
  if ($[4] !== bold || $[5] !== dim || $[6] !== D)
    ((Be = e(Text, { dimColor: dim, bold: bold, children: D })),
      ($[4] = bold),
      ($[5] = dim),
      ($[6] = D),
      ($[7] = Be));
  else Be = $[7];
  let He;
  if ($[8] !== Re || $[9] !== Be)
    ((He = r(Box, { justifyContent: "space-between", children: [Re, Be] })),
      ($[8] = Re),
      ($[9] = Be),
      ($[10] = He));
  else He = $[10];
  return He;
}
/**
 * 购买额度流程中的确认购买步骤。
 */
//@ chunk-18hwfzwa.js:1155348-1160051 placement
function ConfirmPurchaseStep(h) {
  let $ = w(85),
    {
      pm: pm,
      cents: cents,
      bundle: bundle,
      custom: custom,
      capRemaining: capRemaining,
      offerKind: offerKind,
      currency: currency,
      stripeProductId: stripeProductId,
      expiryMonths: expiryMonths,
      onConfirm: onConfirm,
      onCancel: onCancel,
    } = h,
    { credentials: credentials } = Me(),
    [kt, At] = y(!1),
    It = bundle ? bundle.local_price_minor_units : (custom?.payMinor ?? cents),
    Ot = bundle ? bundle.local_credit_minor_units : (custom?.creditMinor ?? cents),
    Et = Ot - It,
    Dt = r1(Ot, It),
    Lt = Ot > It && (custom ? custom.kind === "extra_credit" : offerKind === "extra_credit"),
    Xt;
  if ($[0] !== Ot || $[1] !== It) ((Xt = i1(Ot, It)), ($[0] = Ot), ($[1] = It), ($[2] = Xt));
  else Xt = $[2];
  let io = Xt,
    so = expiryMonths !== null ? ` (valid for ${expiryMonths} ${expiryMonths === 1 ? "mo" : "mos"})` : "",
    [po, ao] = y("loading"),
    co,
    bo;
  if ($[3] !== credentials || $[4] !== currency || $[5] !== It || $[6] !== stripeProductId)
    ((co = () => {
      let Ao = !0;
      return (
        previewPurchaseTax(It, currency, stripeProductId, credentials).then((Bo) => {
          if (Ao) ao(Bo);
        }),
        () => {
          Ao = !1;
        }
      );
    }),
      (bo = [It, currency, stripeProductId, credentials]),
      ($[3] = credentials),
      ($[4] = currency),
      ($[5] = It),
      ($[6] = stripeProductId),
      ($[7] = co),
      ($[8] = bo));
  else ((co = $[7]), (bo = $[8]));
  P(co, bo);
  let Ro = po === "loading",
    Ho = po === null,
    Io = Ro || Ho ? 0 : po.tax_minor_units,
    Wo = It + Io,
    mn;
  if ($[9] !== currency || $[10] !== Ro || $[11] !== Ho || $[12] !== Wo)
    ((mn = Ho
      ? [{ label: "Go back", value: "no" }]
      : [
          {
            label: Ro ? "Pay (calculating\u2026)" : `Pay ${formatCurrency(Wo, currency)} now`,
            value: "yes",
            disabled: Ro,
          },
          { label: "Go back", value: "no" },
        ]),
      ($[9] = currency),
      ($[10] = Ro),
      ($[11] = Ho),
      ($[12] = Wo),
      ($[13] = mn));
  else mn = $[13];
  let Cn = mn,
    { columns: columns } = useTerminalSize(),
    max = Math.max(0, Math.min(columns - 6, 44)),
    Yo = Ro || Ho ? "Tax" : (po.tax_label ?? "Tax"),
    kn;
  if ($[14] !== max) ((kn = "\u2500".repeat(max)), ($[14] = max), ($[15] = kn));
  else kn = $[15];
  let Fn;
  if ($[16] !== kn) ((Fn = e(Text, { dimColor: !0, children: kn })), ($[16] = kn), ($[17] = Fn));
  else Fn = $[17];
  let bn = Fn;
  if (kt) {
    let Go;
    if ($[18] === MEMO_CACHE_SENTINEL) ((Go = () => At(!1)), ($[18] = Go));
    else Go = $[18];
    let hn;
    if ($[19] !== currency || $[20] !== onConfirm || $[21] !== Wo)
      ((hn = e(ConfirmQuestion, {
        question: "Buy usage credits for",
        amountCents: Wo,
        currency: currency,
        onConfirm: onConfirm,
        onBack: Go,
      })),
        ($[19] = currency),
        ($[20] = onConfirm),
        ($[21] = Wo),
        ($[22] = hn));
    else hn = $[22];
    return hn;
  }
  let Go;
  if (
    $[23] !== Ot ||
    $[24] !== currency ||
    $[25] !== Et ||
    $[26] !== Dt ||
    $[27] !== bn ||
    $[28] !== expiryMonths ||
    $[29] !== Lt ||
    $[30] !== io ||
    $[31] !== It ||
    $[32] !== so
  )
    ((Go = Lt
      ? r(Fragment, {
          children: [
            e(SummaryRow, {
              label:
                expiryMonths !== null
                  ? `Credits +${io}% (valid for ${expiryMonths} ${expiryMonths === 1 ? "mo" : "mos"})`
                  : `Usage credits (+${io}% extra)`,
              value: formatCurrency(Ot, currency),
            }),
            bn,
            e(SummaryRow, { label: "You pay", value: formatCurrency(It, currency) }),
          ],
        })
      : r(Fragment, {
          children: [
            e(SummaryRow, {
              label: expiryMonths !== null ? `Usage credits${so}` : "Subtotal",
              value: formatCurrency(Ot, currency),
            }),
            Et > 0 &&
              r(Fragment, {
                children: [
                  e(SummaryRow, {
                    label: `Discount${Dt > 0 ? ` (${Dt}%)` : ""}`,
                    value: `\u2212${formatCurrency(Et, currency)}`,
                  }),
                  bn,
                  e(SummaryRow, { label: "Subtotal after discount", value: formatCurrency(It, currency) }),
                ],
              }),
          ],
        })),
      ($[23] = Ot),
      ($[24] = currency),
      ($[25] = Et),
      ($[26] = Dt),
      ($[27] = bn),
      ($[28] = expiryMonths),
      ($[29] = Lt),
      ($[30] = io),
      ($[31] = It),
      ($[32] = so),
      ($[33] = Go));
  else Go = $[33];
  let hn;
  if ($[34] !== currency || $[35] !== po || $[36] !== Yo || $[37] !== Ro || $[38] !== Ho)
    ((hn = Ro
      ? e(SummaryRow, { label: Yo, value: "\u2026", dim: !0 })
      : Ho
        ? e(SummaryRow, { label: Yo, value: "\u2014", dim: !0 })
        : e(SummaryRow, {
            label: `${Yo} (${zat(po.tax_rate_pct)})`,
            value: formatCurrency(po.tax_minor_units, currency),
          })),
      ($[34] = currency),
      ($[35] = po),
      ($[36] = Yo),
      ($[37] = Ro),
      ($[38] = Ho),
      ($[39] = hn));
  else hn = $[39];
  let Mn;
  if ($[40] !== currency || $[41] !== Ro || $[42] !== Ho || $[43] !== Wo)
    ((Mn = Ro ? "\u2026" : Ho ? "\u2014" : formatCurrency(Wo, currency)),
      ($[40] = currency),
      ($[41] = Ro),
      ($[42] = Ho),
      ($[43] = Wo),
      ($[44] = Mn));
  else Mn = $[44];
  let Xo;
  if ($[45] !== Mn)
    ((Xo = e(SummaryRow, { label: "Total due", value: Mn, bold: !0 })), ($[45] = Mn), ($[46] = Xo));
  else Xo = $[46];
  let Sn;
  if ($[47] !== max || $[48] !== bn || $[49] !== Xo || $[50] !== Go || $[51] !== hn)
    ((Sn = r(Box, { flexDirection: "column", width: max, children: [Go, hn, bn, Xo] })),
      ($[47] = max),
      ($[48] = bn),
      ($[49] = Xo),
      ($[50] = Go),
      ($[51] = hn),
      ($[52] = Sn));
  else Sn = $[52];
  let $n;
  if ($[53] !== capRemaining || $[54] !== currency || $[55] !== custom)
    (($n =
      custom?.withheld &&
      e(Text, { dimColor: !0, children: describeWithheldBonus(custom, capRemaining, currency) })),
      ($[53] = capRemaining),
      ($[54] = currency),
      ($[55] = custom),
      ($[56] = $n));
  else $n = $[56];
  let on;
  if ($[57] === MEMO_CACHE_SENTINEL) ((on = e(Text, { children: "Payment " })), ($[57] = on));
  else on = $[57];
  let _o;
  if ($[58] !== pm) ((_o = _h(pm)), ($[58] = pm), ($[59] = _o));
  else _o = $[59];
  let cn;
  if ($[60] !== _o) ((cn = e(Text, { dimColor: !0, children: _o })), ($[60] = _o), ($[61] = cn));
  else cn = $[61];
  let Dn;
  if ($[62] !== max || $[63] !== cn)
    ((Dn = r(Box, { width: max, children: [on, cn] })), ($[62] = max), ($[63] = cn), ($[64] = Dn));
  else Dn = $[64];
  let wn;
  if ($[65] !== Ho)
    ((wn =
      Ho &&
      e(Text, {
        color: "warning",
        children: `Couldn't calculate tax. Try again, or buy at ${USAGE_SETTINGS_LINK}`,
      })),
      ($[65] = Ho),
      ($[66] = wn));
  else wn = $[66];
  let mr;
  if ($[67] !== onCancel)
    ((mr = (Kn) => {
      if (Kn !== "yes") {
        onCancel();
        return;
      }
      At(!0);
    }),
      ($[67] = onCancel),
      ($[68] = mr));
  else mr = $[68];
  let Wn;
  if ($[69] !== onCancel || $[70] !== Cn || $[71] !== mr)
    ((Wn = e(ModelSelector, { options: Cn, onChange: mr, onCancel: onCancel, visibleOptionCount: 2 })),
      ($[69] = onCancel),
      ($[70] = Cn),
      ($[71] = mr),
      ($[72] = Wn));
  else Wn = $[72];
  let Fr;
  if ($[73] !== Ho)
    ((Fr =
      !Ho &&
      e(Text, {
        dimColor: !0,
        children: "By confirming, you allow Anthropic to charge your card in the amount above.",
      })),
      ($[73] = Ho),
      ($[74] = Fr));
  else Fr = $[74];
  let Zn;
  if ($[75] !== Sn || $[76] !== $n || $[77] !== Dn || $[78] !== wn || $[79] !== Wn || $[80] !== Fr)
    ((Zn = r(Box, { flexDirection: "column", gap: 1, children: [Sn, $n, Dn, wn, Wn, Fr] })),
      ($[75] = Sn),
      ($[76] = $n),
      ($[77] = Dn),
      ($[78] = wn),
      ($[79] = Wn),
      ($[80] = Fr),
      ($[81] = Zn));
  else Zn = $[81];
  let Un;
  if ($[82] !== onCancel || $[83] !== Zn)
    ((Un = e(Dialog, { title: "Buy usage credits", onCancel: onCancel, color: "suggestion", children: Zn })),
      ($[82] = onCancel),
      ($[83] = Zn),
      ($[84] = Un));
  else Un = $[84];
  return Un;
}
//@ chunk-18hwfzwa.js:1160051-1160100 placement
function zat(h) {
  return `${Number(h.toFixed(2))}%`;
}
/**
 * 说明为何此金额没有额外额度/折扣（超出上限或本月折扣额度已用完）。
 */
//@ chunk-18hwfzwa.js:1160100-1160529 placement
function describeWithheldBonus(h, x, D) {
  let L = h.withheld === "bonus" ? "extra credit" : "discount";
  if (h.maxWithBonusMinor !== void 0)
    return h.maxWithBonusMinor > 0
      ? `No ${L} on an amount this large: up to ${formatCurrency(h.maxWithBonusMinor, D)} still gets it.`
      : `No ${L}: this month's discount limit is used up.`;
  return x !== null && x <= 0
    ? `No ${L}: this month's discount limit is used up.`
    : `No ${L} on this amount: it would go over what's left of this month's discount limit.`;
}
//@ chunk-18hwfzwa.js:1160529-1162196 placement
function CustomAmountStep(h) {
  let $ = w(24),
    {
      pm: pm,
      initialCents: initialCents,
      currency: currency,
      offer: offer,
      discountTiers: discountTiers,
      usdRate: usdRate,
      capRemaining: capRemaining,
      onConfirm: onConfirm,
      onCancel: onCancel,
    } = h,
    ze = offer?.kind === "extra_credit" && offer.customBonusTiers !== null,
    rt;
  if ($[0] !== capRemaining || $[1] !== discountTiers || $[2] !== offer || $[3] !== usdRate)
    ((rt = (kt) =>
      computeCreditOffer({
        typedMinor: kt,
        offer: offer,
        discountTiers: discountTiers,
        rate: usdRate,
        capRemainingUsdMinor: capRemaining,
      })),
      ($[0] = capRemaining),
      ($[1] = discountTiers),
      ($[2] = offer),
      ($[3] = usdRate),
      ($[4] = rt));
  else rt = $[4];
  let At = rt,
    It;
  if ($[5] !== ze || $[6] !== pm || $[7] !== usdRate)
    ((It = ze && usdRate !== null ? `Amount to pay \xB7 Payment: ${_h(pm)}` : `Payment: ${_h(pm)}`),
      ($[5] = ze),
      ($[6] = pm),
      ($[7] = usdRate),
      ($[8] = It));
  else It = $[8];
  const Ot = initialCents ? String(initialCents / 100) : "75",
    Et = currency === "USD" ? sat : void 0;
  let Dt;
  if ($[9] !== capRemaining || $[10] !== currency || $[11] !== At)
    ((Dt = (Lt) => {
      let oo = At(Lt);
      switch (oo.kind) {
        case "extra_credit": {
          return `Pay ${formatCurrency(oo.payMinor, currency)} \xB7 Get ${formatCurrency(oo.creditMinor, currency)} of usage credits (+${oo.pct}%)`;
        }
        case "discount": {
          return `Buys ${formatCurrency(oo.creditMinor, currency)} of usage credits for ${formatCurrency(oo.payMinor, currency)} (${oo.pct}% off)`;
        }
        case "plain": {
          return oo.withheld
            ? `Buys ${formatCurrency(oo.creditMinor, currency)} of usage credits \xB7 ${describeWithheldBonus(oo, capRemaining, currency)}`
            : void 0;
        }
      }
    }),
      ($[9] = capRemaining),
      ($[10] = currency),
      ($[11] = At),
      ($[12] = Dt));
  else Dt = $[12];
  let Xt;
  if ($[13] !== onConfirm || $[14] !== At)
    ((Xt = (io) => {
      let so = At(io);
      onConfirm(io, so.kind === "plain" && !so.withheld ? void 0 : so);
    }),
      ($[13] = onConfirm),
      ($[14] = At),
      ($[15] = Xt));
  else Xt = $[15];
  let po;
  if (
    $[16] !== currency ||
    $[17] !== onCancel ||
    $[18] !== It ||
    $[19] !== Ot ||
    $[20] !== Et ||
    $[21] !== Dt ||
    $[22] !== Xt
  )
    ((po = e(AmountEntry, {
      title: "Buy usage credits",
      subtitle: It,
      initial: Ot,
      minCents: Et,
      currency: currency,
      preview: Dt,
      footer: "By confirming, you allow Anthropic to charge your card in the amount above.",
      onSubmit: Xt,
      onCancel: onCancel,
    })),
      ($[16] = currency),
      ($[17] = onCancel),
      ($[18] = It),
      ($[19] = Ot),
      ($[20] = Et),
      ($[21] = Dt),
      ($[22] = Xt),
      ($[23] = po));
  else po = $[23];
  return po;
}
//@ chunk-18hwfzwa.js:1162196-1162209 placement
var YES = "yes";
//@ chunk-18hwfzwa.js:1162209-1163920 placement
function ConfirmQuestion(h) {
  let $ = w(30),
    {
      question: question,
      amountCents: amountCents,
      currency: currency,
      onConfirm: onConfirm,
      onBack: onBack,
    } = h,
    { columns: columns } = useTerminalSize(),
    [Be, He] = y(""),
    [We, ze] = y(0),
    [Xe, rt] = y(!1),
    kt = R(!1),
    At = Be.trim().toLowerCase() === YES,
    Ot = Xe && !At ? "error" : At ? "success" : void 0,
    Dt;
  if ($[0] !== onBack) ((Dt = { "confirm:no": onBack }), ($[0] = onBack), ($[1] = Dt));
  else Dt = $[1];
  let Lt;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Lt = { context: "Settings" }), ($[2] = Lt));
  else Lt = $[2];
  MessageActionsKeybindings(Dt, Lt);
  let oo;
  if ($[3] !== amountCents || $[4] !== currency)
    ((oo = formatCurrency(amountCents, currency)), ($[3] = amountCents), ($[4] = currency), ($[5] = oo));
  else oo = $[5];
  let Xt;
  if ($[6] !== question || $[7] !== oo)
    ((Xt = r(Text, { children: [question, " ", oo, "."] })), ($[6] = question), ($[7] = oo), ($[8] = Xt));
  else Xt = $[8];
  const io = !Ot;
  let so;
  if ($[9] !== Ot || $[10] !== io)
    ((so = r(Text, { color: Ot, dimColor: io, children: ["Type ", YES, " to confirm."] })),
      ($[9] = Ot),
      ($[10] = io),
      ($[11] = so));
  else so = $[11];
  const po = Ot ?? "warning";
  let ao;
  if ($[12] !== onConfirm)
    ((ao = (co) => {
      if (co.trim().toLowerCase() === YES) {
        if (kt.current) {
          return;
        }
        ((kt.current = !0), onConfirm());
      } else (He(""), ze(0), rt(!0));
    }),
      ($[12] = onConfirm),
      ($[13] = ao));
  else ao = $[13];
  let bo;
  if ($[14] !== columns || $[15] !== We || $[16] !== onBack || $[17] !== ao || $[18] !== Be)
    ((bo = e(TextInput, {
      value: Be,
      disableEscapeDoublePress: !0,
      onChange: He,
      onSubmit: ao,
      onExit: onBack,
      focus: !0,
      showCursor: !0,
      columns: columns,
      cursorOffset: We,
      onChangeCursorOffset: ze,
    })),
      ($[14] = columns),
      ($[15] = We),
      ($[16] = onBack),
      ($[17] = ao),
      ($[18] = Be),
      ($[19] = bo));
  else bo = $[19];
  let Ao;
  if ($[20] !== po || $[21] !== bo)
    ((Ao = e(Box, { borderStyle: "single", borderColor: po, paddingX: 1, children: bo })),
      ($[20] = po),
      ($[21] = bo),
      ($[22] = Ao));
  else Ao = $[22];
  let Bo;
  if ($[23] !== Ao || $[24] !== Xt || $[25] !== so)
    ((Bo = r(Box, { flexDirection: "column", gap: 1, children: [Xt, so, Ao] })),
      ($[23] = Ao),
      ($[24] = Xt),
      ($[25] = so),
      ($[26] = Bo));
  else Bo = $[26];
  let Ro;
  if ($[27] !== onBack || $[28] !== Bo)
    ((Ro = e(Dialog, {
      title: "Confirm amount",
      onCancel: onBack,
      color: "warning",
      isCancelActive: !1,
      children: Bo,
    })),
      ($[27] = onBack),
      ($[28] = Bo),
      ($[29] = Ro));
  else Ro = $[29];
  return Ro;
}
/**
 * 购买额度流程中的花费上限设置步骤。
 */
//@ chunk-18hwfzwa.js:1163920-1167866 placement
function SpendLimitStep(h) {
  let $ = w(70),
    { current: x, currency: currency, onConfirm: onConfirm, onCancel: onCancel } = h,
    { columns: columns } = useTerminalSize(),
    Be;
  if ($[0] !== x) ((Be = x !== null ? WL(x) : "150"), ($[0] = x), ($[1] = Be));
  else Be = $[1];
  let He = Be,
    { value: We, setValue: setValue, cursor: cursor, setCursor: setCursor } = useAmountInputBuffer(He),
    [kt, At] = y(0),
    It;
  if ($[2] === MEMO_CACHE_SENTINEL) ((It = ["set", "unlimited", "cancel"]), ($[2] = It));
  else It = $[2];
  let Ot = It,
    [Et, Dt] = y(0),
    [Lt, oo] = y(!1),
    Xt,
    io,
    so,
    po,
    ao,
    co,
    bo,
    Ao,
    Bo,
    Ro,
    Ho,
    Io,
    Wo;
  if (
    $[3] !== Et ||
    $[4] !== columns ||
    $[5] !== Lt ||
    $[6] !== currency ||
    $[7] !== cursor ||
    $[8] !== kt ||
    $[9] !== onCancel ||
    $[10] !== onConfirm ||
    $[11] !== setCursor ||
    $[12] !== setValue ||
    $[13] !== We
  ) {
    co = EARLY_RETURN_SENTINEL;
    Go: {
      let mn = parseAmountInput(We);
      po = !mn.ok && (We.trim() !== "" || kt === 1) ? mn.error : "";
      let No = function No() {
        let Cn = Ot[Et];
        if (Cn === "set") {
          if (!mn.ok) {
            return;
          }
          if (mn.cents > iat) {
            oo(!0);
            return;
          }
          onConfirm(mn.cents);
        } else if (Cn === "unlimited") onConfirm(null);
        else onCancel();
      };
      let kn = function kn(vo) {
        if (vo.key === "tab") {
          (vo.preventDefault(), At(wTo));
          return;
        }
        if (kt !== 1) {
          return;
        }
        if (vo.key === "up") (vo.preventDefault(), At(0));
        else if (vo.key === "down") vo.preventDefault();
        else if (vo.key === "left") (vo.preventDefault(), Dt(kTo));
        else if (vo.key === "right") (vo.preventDefault(), Dt((Yo) => Math.min(Ot.length - 1, Yo + 1)));
        else if (vo.key === "return") (vo.preventDefault(), No());
      };
      let Fn;
      if ($[27] === MEMO_CACHE_SENTINEL)
        ((Fn = { set: "Set limit", unlimited: "Set to unlimited", cancel: "Cancel" }), ($[27] = Fn));
      else Fn = $[27];
      so = Fn;
      if (Lt && mn.ok) {
        let bn;
        if ($[28] === MEMO_CACHE_SENTINEL) ((bn = () => oo(!1)), ($[28] = bn));
        else bn = $[28];
        co = e(ConfirmQuestion, {
          question: "Set your monthly spend limit to",
          amountCents: mn.cents,
          currency: currency,
          onConfirm: () => onConfirm(mn.cents),
          onBack: bn,
        });
        break Go;
      }
      io = Dialog;
      Io = "Set monthly spend limit";
      Wo = onCancel;
      ao = "suggestion";
      Xt = FocusColumn;
      bo = 1;
      Ao = kn;
      if ($[29] === MEMO_CACHE_SENTINEL)
        ((Bo = e(Text, {
          children: "You can set a maximum amount you can spend on usage credits per month.",
        })),
          ($[29] = Bo));
      else Bo = $[29];
      const bn = kt === 0 ? "suggestion" : "inactive";
      let hn;
      if ($[30] !== currency) ((hn = getCurrencySymbol(currency)), ($[30] = currency), ($[31] = hn));
      else hn = $[31];
      let Mn;
      if ($[32] !== hn) ((Mn = e(Text, { children: hn })), ($[32] = hn), ($[33] = Mn));
      else Mn = $[33];
      let Xo, Sn;
      if ($[34] === MEMO_CACHE_SENTINEL) ((Xo = () => At(1)), (Sn = () => At(1)), ($[34] = Xo), ($[35] = Sn));
      else ((Xo = $[34]), (Sn = $[35]));
      const $n = kt === 0;
      const on = kt === 0;
      let _o;
      if (
        $[36] !== columns ||
        $[37] !== cursor ||
        $[38] !== setCursor ||
        $[39] !== setValue ||
        $[40] !== $n ||
        $[41] !== on ||
        $[42] !== We
      )
        ((_o = e(TextInput, {
          value: We,
          onChange: setValue,
          onSubmit: Xo,
          onHistoryDown: Sn,
          disableCursorMovementForUpDownKeys: !0,
          focus: $n,
          showCursor: on,
          columns: columns,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
        })),
          ($[36] = columns),
          ($[37] = cursor),
          ($[38] = setCursor),
          ($[39] = setValue),
          ($[40] = $n),
          ($[41] = on),
          ($[42] = We),
          ($[43] = _o));
      else _o = $[43];
      if ($[44] !== bn || $[45] !== Mn || $[46] !== _o)
        ((Ro = r(Box, { borderStyle: "single", borderColor: bn, paddingX: 1, children: [Mn, _o] })),
          ($[44] = bn),
          ($[45] = Mn),
          ($[46] = _o),
          ($[47] = Ro));
      else Ro = $[47];
      Ho =
        mn.ok &&
        r(Text, { color: "success", children: ["Monthly limit: ", formatCurrency(mn.cents, currency)] });
    }
    (($[3] = Et),
      ($[4] = columns),
      ($[5] = Lt),
      ($[6] = currency),
      ($[7] = cursor),
      ($[8] = kt),
      ($[9] = onCancel),
      ($[10] = onConfirm),
      ($[11] = setCursor),
      ($[12] = setValue),
      ($[13] = We),
      ($[14] = Xt),
      ($[15] = io),
      ($[16] = so),
      ($[17] = po),
      ($[18] = ao),
      ($[19] = co),
      ($[20] = bo),
      ($[21] = Ao),
      ($[22] = Bo),
      ($[23] = Ro),
      ($[24] = Ho),
      ($[25] = Io),
      ($[26] = Wo));
  } else
    ((Xt = $[14]),
      (io = $[15]),
      (so = $[16]),
      (po = $[17]),
      (ao = $[18]),
      (co = $[19]),
      (bo = $[20]),
      (Ao = $[21]),
      (Bo = $[22]),
      (Ro = $[23]),
      (Ho = $[24]),
      (Io = $[25]),
      (Wo = $[26]));
  if (co !== EARLY_RETURN_SENTINEL) return co;
  let Fn;
  if ($[48] !== po) ((Fn = po && e(Text, { color: "error", children: po })), ($[48] = po), ($[49] = Fn));
  else Fn = $[49];
  let bn;
  if ($[50] === MEMO_CACHE_SENTINEL)
    ((bn = e(Text, { dimColor: !0, children: "This spend limit goes into effect immediately." })),
      ($[50] = bn));
  else bn = $[50];
  let hn;
  if ($[51] !== Et || $[52] !== so || $[53] !== kt)
    ((hn = e(Box, {
      flexDirection: "row",
      gap: 2,
      children: Ot.map((cn, Dn) =>
        r(
          Text,
          {
            color: kt === 1 && Et === Dn ? "suggestion" : void 0,
            children: [kt === 1 && Et === Dn ? re.pointer : " ", " ", so[cn]],
          },
          cn,
        ),
      ),
    })),
      ($[51] = Et),
      ($[52] = so),
      ($[53] = kt),
      ($[54] = hn));
  else hn = $[54];
  let Mn;
  if (
    $[55] !== Xt ||
    $[56] !== Fn ||
    $[57] !== hn ||
    $[58] !== bo ||
    $[59] !== Ao ||
    $[60] !== Bo ||
    $[61] !== Ro ||
    $[62] !== Ho
  )
    ((Mn = r(Xt, { gap: bo, onKeyDown: Ao, children: [Bo, Ro, Ho, Fn, bn, hn] })),
      ($[55] = Xt),
      ($[56] = Fn),
      ($[57] = hn),
      ($[58] = bo),
      ($[59] = Ao),
      ($[60] = Bo),
      ($[61] = Ro),
      ($[62] = Ho),
      ($[63] = Mn));
  else Mn = $[63];
  let Xo;
  if ($[64] !== io || $[65] !== ao || $[66] !== Mn || $[67] !== Io || $[68] !== Wo)
    ((Xo = e(io, { title: Io, onCancel: Wo, color: ao, children: Mn })),
      ($[64] = io),
      ($[65] = ao),
      ($[66] = Mn),
      ($[67] = Io),
      ($[68] = Wo),
      ($[69] = Xo));
  else Xo = $[69];
  return Xo;
}
/**
 * 购买额度流程中的自动充值设置步骤。
 */
//@ chunk-18hwfzwa.js:1167866-1175272 placement
function AutoReloadStep(h) {
  let $ = w(134),
    { current: x, pm: pm, currency: currency, onSave: onSave, onTurnOff: onTurnOff, onCancel: onCancel } = h,
    { columns: columns } = useTerminalSize(),
    He = x?.enabled === !0,
    ze;
  if ($[0] !== x)
    ((ze = x?.threshold_in_minor_units != null ? WL(x.threshold_in_minor_units) : "5"),
      ($[0] = x),
      ($[1] = ze));
  else ze = $[1];
  let Xe = ze,
    rt;
  if ($[2] !== x)
    ((rt = x?.reload_to_in_minor_units != null ? WL(x.reload_to_in_minor_units) : "15"),
      ($[2] = x),
      ($[3] = rt));
  else rt = $[3];
  let kt = rt,
    { value: At, setValue: setValue, cursor: cursor, setCursor: setCursor } = useAmountInputBuffer(Xe),
    { value: Dt, setValue: setValue_2, cursor: cursor_2, setCursor: setCursor_2 } = useAmountInputBuffer(kt),
    [io, so] = y(0),
    po;
  if ($[4] !== He) ((po = He ? ["save", "off", "cancel"] : ["save", "cancel"]), ($[4] = He), ($[5] = po));
  else po = $[5];
  let ao = po,
    [co, bo] = y(0),
    [Ao, Bo] = y(!1),
    Ro,
    Ho,
    Io,
    Wo,
    mn,
    Cn,
    No,
    vo,
    Yo,
    kn,
    Fn,
    bn,
    Go,
    hn,
    Mn,
    Xo,
    Sn;
  if (
    $[6] !== co ||
    $[7] !== ao ||
    $[8] !== columns ||
    $[9] !== Ao ||
    $[10] !== currency ||
    $[11] !== cursor ||
    $[12] !== cursor_2 ||
    $[13] !== io ||
    $[14] !== He ||
    $[15] !== onCancel ||
    $[16] !== onSave ||
    $[17] !== onTurnOff ||
    $[18] !== pm ||
    $[19] !== Dt ||
    $[20] !== setCursor ||
    $[21] !== setCursor_2 ||
    $[22] !== setValue_2 ||
    $[23] !== setValue ||
    $[24] !== At
  ) {
    Fn = EARLY_RETURN_SENTINEL;
    ur: {
      Cn = parseAmountInput(At);
      mn = parseAmountInput(Dt);
      Wo = !Cn.ok
        ? Cn.error
        : !mn.ok
          ? mn.error
          : mn.cents <= Cn.cents
            ? "Reload-to must be above threshold"
            : currency === "USD" && mn.cents - Cn.cents < E8
              ? `Reload must be at least ${formatCurrency(E8, currency, "whole")} above threshold`
              : "";
      let $n = !Wo;
      let on = !Cn.ok && (At.trim() !== "" || io !== 0) ? Cn.error : "";
      let _o = !mn.ok && (Dt.trim() !== "" || io === 2) ? mn.error : "";
      let Dn = function Dn() {
        let cn = ao[co];
        if (cn === "save") {
          if (!Cn.ok || !mn.ok || !$n) {
            return;
          }
          Bo(!0);
          return;
        } else if (cn === "off") onTurnOff();
        else onCancel();
      };
      let wn;
      if ($[42] === MEMO_CACHE_SENTINEL) ((wn = () => so(vTo)), ($[42] = wn));
      else wn = $[42];
      let mr = wn;
      let Kn;
      if ($[43] === MEMO_CACHE_SENTINEL) ((Kn = () => so(CTo)), ($[43] = Kn));
      else Kn = $[43];
      let Wn = Kn;
      let Fr;
      if ($[44] !== Dn || $[45] !== ao.length || $[46] !== io)
        ((Fr = function dr(Zn) {
          if (Zn.key === "tab") {
            if ((Zn.preventDefault(), Zn.shift)) mr();
            else Wn();
            return;
          }
          if (io !== 2) {
            return;
          }
          if (Zn.key === "up") (Zn.preventDefault(), mr());
          else if (Zn.key === "down") Zn.preventDefault();
          else if (Zn.key === "left") (Zn.preventDefault(), bo(_To));
          else if (Zn.key === "right") (Zn.preventDefault(), bo((Un) => Math.min(ao.length - 1, Un + 1)));
          else if (Zn.key === "return") (Zn.preventDefault(), Dn());
        }),
          ($[44] = Dn),
          ($[45] = ao.length),
          ($[46] = io),
          ($[47] = Fr));
      else Fr = $[47];
      let dr = Fr;
      let or = He ? "Agree and save" : "Agree and turn on";
      let pr;
      if ($[48] !== or) ((pr = { save: or, off: "Turn off", cancel: "Cancel" }), ($[48] = or), ($[49] = pr));
      else pr = $[49];
      Io = pr;
      if (Ao && Cn.ok && mn.ok) {
        let Qn;
        if ($[50] === MEMO_CACHE_SENTINEL) ((Qn = () => Bo(!1)), ($[50] = Qn));
        else Qn = $[50];
        Fn = e(ConfirmQuestion, {
          question: "Auto-reload will top your balance up to",
          amountCents: mn.cents,
          currency: currency,
          onConfirm: () => onSave(Cn.cents, mn.cents),
          onBack: Qn,
        });
        break ur;
      }
      Ho = Dialog;
      vo = "Auto-reload";
      Yo = onCancel;
      kn = "suggestion";
      Ro = FocusColumn;
      bn = 1;
      Go = dr;
      let Qn;
      if ($[51] !== He)
        ((Qn = He && e(Text, { color: "success", children: " \xB7 Currently on" })),
          ($[51] = He),
          ($[52] = Qn));
      else Qn = $[52];
      if ($[53] !== Qn)
        ((hn = r(Text, { children: ["Automatically buy more usage credits when your balance is low.", Qn] })),
          ($[53] = Qn),
          ($[54] = hn));
      else hn = $[54];
      let Ir;
      if ($[55] !== pm) ((Ir = _h(pm)), ($[55] = pm), ($[56] = Ir));
      else Ir = $[56];
      if ($[57] !== Ir)
        ((Mn = r(Text, { dimColor: !0, children: ["Card on file: ", Ir] })), ($[57] = Ir), ($[58] = Mn));
      else Mn = $[58];
      let Pr;
      if ($[59] === MEMO_CACHE_SENTINEL)
        ((Pr = e(Text, { dimColor: !0, children: "When usage credit balance falls below:" })), ($[59] = Pr));
      else Pr = $[59];
      const ts = on ? "error" : io === 0 ? "suggestion" : "inactive";
      let Gn;
      if ($[60] !== currency) ((Gn = getCurrencySymbol(currency)), ($[60] = currency), ($[61] = Gn));
      else Gn = $[61];
      let Ur;
      if ($[62] !== Gn) ((Ur = e(Text, { children: Gn })), ($[62] = Gn), ($[63] = Ur));
      else Ur = $[63];
      let Zr, wr;
      if ($[64] === MEMO_CACHE_SENTINEL) ((Zr = () => so(1)), (wr = () => so(1)), ($[64] = Zr), ($[65] = wr));
      else ((Zr = $[64]), (wr = $[65]));
      const zr = io === 0;
      const _r = io === 0;
      let fr;
      if (
        $[66] !== columns ||
        $[67] !== cursor ||
        $[68] !== setCursor ||
        $[69] !== setValue ||
        $[70] !== zr ||
        $[71] !== _r ||
        $[72] !== At
      )
        ((fr = e(TextInput, {
          value: At,
          onChange: setValue,
          onSubmit: Zr,
          onHistoryDown: wr,
          disableCursorMovementForUpDownKeys: !0,
          focus: zr,
          showCursor: _r,
          columns: columns,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
        })),
          ($[66] = columns),
          ($[67] = cursor),
          ($[68] = setCursor),
          ($[69] = setValue),
          ($[70] = zr),
          ($[71] = _r),
          ($[72] = At),
          ($[73] = fr));
      else fr = $[73];
      let $r;
      if ($[74] !== ts || $[75] !== Ur || $[76] !== fr)
        (($r = r(Box, { borderStyle: "single", borderColor: ts, paddingX: 1, children: [Ur, fr] })),
          ($[74] = ts),
          ($[75] = Ur),
          ($[76] = fr),
          ($[77] = $r));
      else $r = $[77];
      Xo = r(Box, {
        flexDirection: "column",
        children: [Pr, $r, on && e(Text, { color: "error", children: on })],
      });
      let Yr;
      if ($[78] === MEMO_CACHE_SENTINEL)
        ((Yr = e(Text, { dimColor: !0, children: "Reload balance to:" })), ($[78] = Yr));
      else Yr = $[78];
      const Er = _o ? "error" : io === 1 ? "suggestion" : "inactive";
      let Vr;
      if ($[79] !== currency) ((Vr = getCurrencySymbol(currency)), ($[79] = currency), ($[80] = Vr));
      else Vr = $[80];
      let ms;
      if ($[81] !== Vr) ((ms = e(Text, { children: Vr })), ($[81] = Vr), ($[82] = ms));
      else ms = $[82];
      let Xs, Ls, is;
      if ($[83] === MEMO_CACHE_SENTINEL)
        ((Xs = () => so(2)),
          (Ls = () => so(0)),
          (is = () => so(2)),
          ($[83] = Xs),
          ($[84] = Ls),
          ($[85] = is));
      else ((Xs = $[83]), (Ls = $[84]), (is = $[85]));
      const ws = io === 1;
      const Ci = io === 1;
      let oi;
      if (
        $[86] !== columns ||
        $[87] !== cursor_2 ||
        $[88] !== Dt ||
        $[89] !== setCursor_2 ||
        $[90] !== setValue_2 ||
        $[91] !== ws ||
        $[92] !== Ci
      )
        ((oi = e(TextInput, {
          value: Dt,
          onChange: setValue_2,
          onSubmit: Xs,
          onHistoryUp: Ls,
          onHistoryDown: is,
          disableCursorMovementForUpDownKeys: !0,
          focus: ws,
          showCursor: Ci,
          columns: columns,
          cursorOffset: cursor_2,
          onChangeCursorOffset: setCursor_2,
        })),
          ($[86] = columns),
          ($[87] = cursor_2),
          ($[88] = Dt),
          ($[89] = setCursor_2),
          ($[90] = setValue_2),
          ($[91] = ws),
          ($[92] = Ci),
          ($[93] = oi));
      else oi = $[93];
      let Oi;
      if ($[94] !== Er || $[95] !== ms || $[96] !== oi)
        ((Oi = r(Box, { borderStyle: "single", borderColor: Er, paddingX: 1, children: [ms, oi] })),
          ($[94] = Er),
          ($[95] = ms),
          ($[96] = oi),
          ($[97] = Oi));
      else Oi = $[97];
      Sn = r(Box, {
        flexDirection: "column",
        children: [Yr, Oi, _o && e(Text, { color: "error", children: _o })],
      });
      No =
        Cn.ok &&
        mn.ok &&
        $n &&
        r(Text, {
          color: "success",
          children: [
            "Tops up to ",
            formatCurrency(mn.cents, currency),
            " when your balance falls below",
            " ",
            formatCurrency(Cn.cents, currency),
          ],
        });
    }
    (($[6] = co),
      ($[7] = ao),
      ($[8] = columns),
      ($[9] = Ao),
      ($[10] = currency),
      ($[11] = cursor),
      ($[12] = cursor_2),
      ($[13] = io),
      ($[14] = He),
      ($[15] = onCancel),
      ($[16] = onSave),
      ($[17] = onTurnOff),
      ($[18] = pm),
      ($[19] = Dt),
      ($[20] = setCursor),
      ($[21] = setCursor_2),
      ($[22] = setValue_2),
      ($[23] = setValue),
      ($[24] = At),
      ($[25] = Ro),
      ($[26] = Ho),
      ($[27] = Io),
      ($[28] = Wo),
      ($[29] = mn),
      ($[30] = Cn),
      ($[31] = No),
      ($[32] = vo),
      ($[33] = Yo),
      ($[34] = kn),
      ($[35] = Fn),
      ($[36] = bn),
      ($[37] = Go),
      ($[38] = hn),
      ($[39] = Mn),
      ($[40] = Xo),
      ($[41] = Sn));
  } else
    ((Ro = $[25]),
      (Ho = $[26]),
      (Io = $[27]),
      (Wo = $[28]),
      (mn = $[29]),
      (Cn = $[30]),
      (No = $[31]),
      (vo = $[32]),
      (Yo = $[33]),
      (kn = $[34]),
      (Fn = $[35]),
      (bn = $[36]),
      (Go = $[37]),
      (hn = $[38]),
      (Mn = $[39]),
      (Xo = $[40]),
      (Sn = $[41]));
  if (Fn !== EARLY_RETURN_SENTINEL) return Fn;
  let wn;
  if ($[98] !== pm) ((wn = _h(pm)), ($[98] = pm), ($[99] = wn));
  else wn = $[99];
  let Kn;
  if ($[100] !== wn)
    ((Kn = r(Text, {
      dimColor: !0,
      children: [
        "By selecting Agree, you authorize Anthropic to automatically charge",
        " ",
        wn,
        " on a recurring basis whenever your balance reaches the threshold, per the Consumer Terms (",
        CONSUMER_TERMS_URL,
        "). Turn off any time here or at ",
        USAGE_SETTINGS_LINK,
        ".",
      ],
    })),
      ($[100] = wn),
      ($[101] = Kn));
  else Kn = $[101];
  let Fr;
  if ($[102] !== co || $[103] !== Io || $[104] !== ao || $[105] !== io)
    ((Fr = ao.map((Hi, Zi) =>
      r(
        Text,
        {
          color: io === 2 && co === Zi ? "suggestion" : void 0,
          children: [io === 2 && co === Zi ? re.pointer : " ", " ", Io[Hi]],
        },
        Hi,
      ),
    )),
      ($[102] = co),
      ($[103] = Io),
      ($[104] = ao),
      ($[105] = io),
      ($[106] = Fr));
  else Fr = $[106];
  let pr;
  if ($[107] !== co || $[108] !== ao || $[109] !== Wo || $[110] !== io || $[111] !== mn || $[112] !== Cn)
    ((pr =
      Wo &&
      Cn.ok &&
      mn.ok &&
      io === 2 &&
      ao[co] === "save" &&
      r(Text, { color: "error", children: ["\xB7 ", Wo] })),
      ($[107] = co),
      ($[108] = ao),
      ($[109] = Wo),
      ($[110] = io),
      ($[111] = mn),
      ($[112] = Cn),
      ($[113] = pr));
  else pr = $[113];
  let Qn;
  if ($[114] !== Fr || $[115] !== pr)
    ((Qn = r(Box, { flexDirection: "row", gap: 2, children: [Fr, pr] })),
      ($[114] = Fr),
      ($[115] = pr),
      ($[116] = Qn));
  else Qn = $[116];
  let Ir;
  if (
    $[117] !== Ro ||
    $[118] !== No ||
    $[119] !== Kn ||
    $[120] !== Qn ||
    $[121] !== bn ||
    $[122] !== Go ||
    $[123] !== hn ||
    $[124] !== Mn ||
    $[125] !== Xo ||
    $[126] !== Sn
  )
    ((Ir = r(Ro, { gap: bn, onKeyDown: Go, children: [hn, Mn, Xo, Sn, No, Kn, Qn] })),
      ($[117] = Ro),
      ($[118] = No),
      ($[119] = Kn),
      ($[120] = Qn),
      ($[121] = bn),
      ($[122] = Go),
      ($[123] = hn),
      ($[124] = Mn),
      ($[125] = Xo),
      ($[126] = Sn),
      ($[127] = Ir));
  else Ir = $[127];
  let Pr;
  if ($[128] !== Ho || $[129] !== vo || $[130] !== Yo || $[131] !== kn || $[132] !== Ir)
    ((Pr = e(Ho, { title: vo, onCancel: Yo, color: kn, children: Ir })),
      ($[128] = Ho),
      ($[129] = vo),
      ($[130] = Yo),
      ($[131] = kn),
      ($[132] = Ir),
      ($[133] = Pr));
  else Pr = $[133];
  return Pr;
}
//@ chunk-18hwfzwa.js:1175272-1177637 placement
function AmountEntry(h) {
  let $ = w(52),
    {
      title: title,
      subtitle: subtitle,
      initial: initial,
      minCents: minCents,
      currency: currency,
      preview: preview,
      footer: footer,
      onSubmit: onSubmit,
      onCancel: onCancel,
    } = h,
    { columns: columns } = useTerminalSize(),
    { value: Xe, setValue: setValue, cursor: cursor, setCursor: setCursor } = useAmountInputBuffer(initial),
    [It, Ot] = y(!1),
    Dt;
  if ($[0] !== Xe) ((Dt = parseAmountInput(Xe)), ($[0] = Xe), ($[1] = Dt));
  else Dt = $[1];
  let Lt = Dt,
    oo = Lt.ok && minCents !== void 0 && Lt.cents < minCents,
    Xt;
  if (
    $[2] !== It ||
    $[3] !== oo ||
    $[4] !== currency ||
    $[5] !== minCents ||
    $[6] !== Lt.error ||
    $[7] !== Lt.ok ||
    $[8] !== Xe
  )
    ((Xt =
      !Lt.ok && (Xe.trim() !== "" || It)
        ? Lt.error
        : oo && minCents !== void 0
          ? `Minimum is ${formatCurrency(minCents, currency, "whole")}`
          : ""),
      ($[2] = It),
      ($[3] = oo),
      ($[4] = currency),
      ($[5] = minCents),
      ($[6] = Lt.error),
      ($[7] = Lt.ok),
      ($[8] = Xe),
      ($[9] = Xt));
  else Xt = $[9];
  let io = Xt,
    so;
  if ($[10] !== oo || $[11] !== onSubmit || $[12] !== Lt.cents || $[13] !== Lt.ok)
    ((so = function po() {
      if (!Lt.ok || oo) {
        Ot(!0);
        return;
      }
      onSubmit(Lt.cents);
    }),
      ($[10] = oo),
      ($[11] = onSubmit),
      ($[12] = Lt.cents),
      ($[13] = Lt.ok),
      ($[14] = so));
  else so = $[14];
  let po = so,
    ao;
  if ($[15] !== subtitle)
    ((ao = e(Text, { dimColor: !0, children: subtitle })), ($[15] = subtitle), ($[16] = ao));
  else ao = $[16];
  let co;
  if ($[17] !== currency) ((co = getCurrencySymbol(currency)), ($[17] = currency), ($[18] = co));
  else co = $[18];
  let bo;
  if ($[19] !== co) ((bo = e(Text, { children: co })), ($[19] = co), ($[20] = bo));
  else bo = $[20];
  let Ao;
  if (
    $[21] !== columns ||
    $[22] !== cursor ||
    $[23] !== onCancel ||
    $[24] !== setCursor ||
    $[25] !== setValue ||
    $[26] !== po ||
    $[27] !== Xe
  )
    ((Ao = e(TextInput, {
      value: Xe,
      onChange: setValue,
      onSubmit: po,
      onExit: onCancel,
      focus: !0,
      showCursor: !0,
      columns: columns,
      cursorOffset: cursor,
      onChangeCursorOffset: setCursor,
    })),
      ($[21] = columns),
      ($[22] = cursor),
      ($[23] = onCancel),
      ($[24] = setCursor),
      ($[25] = setValue),
      ($[26] = po),
      ($[27] = Xe),
      ($[28] = Ao));
  else Ao = $[28];
  let Bo;
  if ($[29] !== bo || $[30] !== Ao)
    ((Bo = r(Box, { flexDirection: "row", gap: 1, children: [bo, Ao] })),
      ($[29] = bo),
      ($[30] = Ao),
      ($[31] = Bo));
  else Bo = $[31];
  let Ro;
  if ($[32] !== footer)
    ((Ro = footer && e(Text, { dimColor: !0, children: footer })), ($[32] = footer), ($[33] = Ro));
  else Ro = $[33];
  let Ho;
  if ($[34] !== oo || $[35] !== currency || $[36] !== Lt.cents || $[37] !== Lt.ok || $[38] !== preview)
    ((Ho =
      Lt.ok &&
      !oo &&
      e(Text, {
        color: "success",
        children: preview?.(Lt.cents) ?? `Buys ${formatCurrency(Lt.cents, currency)} of usage credits`,
      })),
      ($[34] = oo),
      ($[35] = currency),
      ($[36] = Lt.cents),
      ($[37] = Lt.ok),
      ($[38] = preview),
      ($[39] = Ho));
  else Ho = $[39];
  let Io;
  if ($[40] !== io) ((Io = io && e(Text, { color: "error", children: io })), ($[40] = io), ($[41] = Io));
  else Io = $[41];
  let Wo;
  if ($[42] !== Ho || $[43] !== Io || $[44] !== ao || $[45] !== Bo || $[46] !== Ro)
    ((Wo = r(Box, { flexDirection: "column", gap: 1, children: [ao, Bo, Ro, Ho, Io] })),
      ($[42] = Ho),
      ($[43] = Io),
      ($[44] = ao),
      ($[45] = Bo),
      ($[46] = Ro),
      ($[47] = Wo));
  else Wo = $[47];
  let mn;
  if ($[48] !== onCancel || $[49] !== Wo || $[50] !== title)
    ((mn = e(Dialog, { title: title, onCancel: onCancel, color: "suggestion", children: Wo })),
      ($[48] = onCancel),
      ($[49] = Wo),
      ($[50] = title),
      ($[51] = mn));
  else mn = $[51];
  return mn;
}
//@ chunk-18hwfzwa.js:1177637-1178928 placement
function PurchasePoller(h) {
  let $ = w(11),
    { purchaseId: purchaseId, onSuccess: onSuccess, onError: onError } = h,
    { credentials: credentials } = Me(),
    ke = R(0),
    Re = Oo(onSuccess),
    Be = Oo(onError),
    He = useClock(),
    ze;
  if ($[0] !== He || $[1] !== credentials || $[2] !== purchaseId || $[3] !== Be || $[4] !== Re)
    ((ze = () => {
      let Xe = !1;
      let rt;
      let At = function At(kt) {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", { status: fromEnum(kt) });
      };
      async function Et() {
        if (Xe) {
          return;
        }
        if (((ke.current = ke.current + 1), ke.current > rat)) {
          ((Xe = !0), Be(`Purchase timed out \u2014 check ${USAGE_SETTINGS_LINK}`));
          return;
        }
        try {
          let Ot = await fetchPrepaidPurchaseStatus(purchaseId, credentials);
          if (Xe) {
            return;
          }
          if (Ot.status === "paid") ((Xe = !0), At("success"), Re());
          else if (Ot.status === "failed") ((Xe = !0), At("failed"), Be("Payment failed"));
          else if (Ot.status === "action_needed")
            ((Xe = !0),
              At("3ds_fallback"),
              Be(
                `Your card requires additional verification \u2014 this purchase was not completed. Try again at ${USAGE_SETTINGS_LINK}`,
              ));
          else rt = He.setTimeout(Et, nat);
        } catch (error) {
          let Dt = error;
          if (Xe) {
            return;
          }
          if (((Xe = !0), isExpectedApiError(Dt)))
            logForDebugging(`Purchase status poll failed: ${errorMessage(Dt)}`, { level: "error" });
          else logError(Dt);
          Be("Failed to check purchase status");
        }
      }
      return (
        Et(),
        () => {
          ((Xe = !0), rt?.());
        }
      );
    }),
      ($[0] = He),
      ($[1] = credentials),
      ($[2] = purchaseId),
      ($[3] = Be),
      ($[4] = Re),
      ($[5] = ze));
  else ze = $[5];
  let It;
  if ($[6] !== He || $[7] !== credentials || $[8] !== purchaseId)
    ((It = [He, purchaseId, credentials]),
      ($[6] = He),
      ($[7] = credentials),
      ($[8] = purchaseId),
      ($[9] = It));
  else It = $[9];
  P(ze, It);
  let Lt;
  if ($[10] === MEMO_CACHE_SENTINEL)
    ((Lt = e(ClawdLoadingRow, { message: "Confirming payment\u2026 (may take a few seconds)" })),
      ($[10] = Lt));
  else Lt = $[10];
  return Lt;
}
/**
 * 渲染带动画 Clawd 的加载行与提示信息。
 */
//@ chunk-18hwfzwa.js:1178928-1179193 placement
function ClawdLoadingRow(h) {
  let $ = w(3),
    { message: message } = h,
    L;
  if ($[0] === MEMO_CACHE_SENTINEL) ((L = e(AnimatedClawd, { autoplay: !0 })), ($[0] = L));
  else L = $[0];
  let ee;
  if ($[1] !== message)
    ((ee = r(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 2,
      children: [L, e(Text, { dimColor: !0, children: message })],
    })),
      ($[1] = message),
      ($[2] = ee));
  else ee = $[2];
  return ee;
}
/**
 * 购买成功时显示 Clawd 庆祝动画与成功文案，动画结束后回调。
 */
//@ chunk-18hwfzwa.js:1179193-1179628 placement
function ClawdSuccessRow(h) {
  let $ = w(7),
    { message: message, onDone: onDone } = h,
    ee;
  if ($[0] !== onDone)
    ((ee = e(AnimatedClawd, { sequence: "celebrate", reserveCrouchRow: !0, onComplete: onDone })),
      ($[0] = onDone),
      ($[1] = ee));
  else ee = $[1];
  let ke;
  if ($[2] !== message)
    ((ke = e(Box, { marginTop: 1, children: e(Text, { color: "success", children: message }) })),
      ($[2] = message),
      ($[3] = ke));
  else ke = $[3];
  let Re;
  if ($[4] !== ee || $[5] !== ke)
    ((Re = r(Box, { flexDirection: "row", gap: 2, alignItems: "center", paddingTop: 1, children: [ee, ke] })),
      ($[4] = ee),
      ($[5] = ke),
      ($[6] = Re));
  else Re = $[6];
  return Re;
}
//@ chunk-18hwfzwa.js:1179628-1180592 placement
function CelebrationMessage(h) {
  let $ = w(15),
    { message: message, work: work, onDone: onDone, failure: failure } = h,
    ke = R(null),
    Re = R(!1),
    Be = R(!1),
    We;
  if ($[0] !== failure || $[1] !== onDone)
    ((We = (ze) => {
      let Xe = ze ?? { value: failure };
      if (((ke.current = Xe), Re.current && !Be.current)) onDone(Xe.value);
    }),
      ($[0] = failure),
      ($[1] = onDone),
      ($[2] = We));
  else We = $[2];
  let rt = Oo(We),
    kt;
  if ($[3] !== rt || $[4] !== work)
    ((kt = () => (
      work
        .then((At) => rt({ value: At }))
        .catch((It) => {
          (logError(It), rt(null));
        }),
      () => {
        Be.current = !0;
      }
    )),
      ($[3] = rt),
      ($[4] = work),
      ($[5] = kt));
  else kt = $[5];
  let Ot;
  if ($[6] !== work) ((Ot = [work]), ($[6] = work), ($[7] = Ot));
  else Ot = $[7];
  P(kt, Ot);
  let Et;
  if ($[8] !== onDone)
    ((Et = e(AnimatedClawd, {
      sequence: "celebrate",
      reserveCrouchRow: !0,
      onComplete: () => {
        if (((Re.current = !0), ke.current && !Be.current)) onDone(ke.current.value);
      },
    })),
      ($[8] = onDone),
      ($[9] = Et));
  else Et = $[9];
  let Dt;
  if ($[10] !== message)
    ((Dt = e(Box, { marginTop: 1, children: e(Text, { dimColor: !0, children: message }) })),
      ($[10] = message),
      ($[11] = Dt));
  else Dt = $[11];
  let Lt;
  if ($[12] !== Et || $[13] !== Dt)
    ((Lt = r(Box, { flexDirection: "row", gap: 2, alignItems: "center", paddingTop: 1, children: [Et, Dt] })),
      ($[12] = Et),
      ($[13] = Dt),
      ($[14] = Lt));
  else Lt = $[14];
  return Lt;
}
/**
 * 显示等待提示并等待一个 Promise；完成时以结果调用 onDone，失败记错误并以 failure 值调用；卸载后不再回调。
 */
//@ chunk-18hwfzwa.js:1180592-1181129 placement
function AwaitWork(h) {
  let $ = w(10),
    { message: message, work: work, onDone: onDone, failure: failure } = h,
    Re;
  if ($[0] !== failure || $[1] !== onDone)
    ((Re = (Be) => onDone(Be ? Be.value : failure)), ($[0] = failure), ($[1] = onDone), ($[2] = Re));
  else Re = $[2];
  let He = Oo(Re),
    We;
  if ($[3] !== He || $[4] !== work)
    ((We = () => {
      let ze = !1;
      return (
        work
          .then((Xe) => {
            if (!ze) He({ value: Xe });
          })
          .catch((rt) => {
            if ((logError(rt), !ze)) He(null);
          }),
        () => {
          ze = !0;
        }
      );
    }),
      ($[3] = He),
      ($[4] = work),
      ($[5] = We));
  else We = $[5];
  let kt;
  if ($[6] !== work) ((kt = [work]), ($[6] = work), ($[7] = kt));
  else kt = $[7];
  P(We, kt);
  let At;
  if ($[8] !== message)
    ((At = e(Box, { paddingTop: 1, children: e(WorkerBadge, { message: message }) })),
      ($[8] = message),
      ($[9] = At));
  else At = $[9];
  return At;
}
/**
 * 判断购买用量额度流程的当前步骤是否处于忙碌（加载、开通、调整、保存自动充值、购买中、轮询）状态。
 */
//@ chunk-18hwfzwa.js:1181129-1181441 placement
function isBusyCreditsStep(h) {
  switch (h) {
    case "loading":
    case "enabling":
    case "adjusting":
    case "auto_reload_saving":
    case "buy_purchasing":
    case "buy_polling":
      return !0;
    case "not_enabled":
    case "enabled":
    case "buy_select":
    case "buy_custom":
    case "buy_confirm":
    case "buy_success":
    case "adjust_limit":
    case "auto_reload_config":
    case "error":
      return !1;
  }
}
//@ chunk-18hwfzwa.js:1181441-1181445 placement
j();

export {
  isBusyCreditsStep,
  CelebrationMessage,
  AwaitWork,
  ClawdLoadingRow,
  ClawdSuccessRow,
  PurchasePoller,
  CustomAmountStep,
  ConfirmPurchaseStep,
  SpendLimitStep,
  AutoReloadStep,
};
