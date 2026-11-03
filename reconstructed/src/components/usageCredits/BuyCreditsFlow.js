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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { y, P, R, Oo, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  discountPercentOfPay,
  percentOfBase,
  USAGE_SETTINGS_LINK,
  computeCreditOffer,
  CREDIT_MIN_AMOUNT_CENTS,
  formatDollarAmount,
  useAmountInputBuffer,
  parseAmountInput,
  CREDIT_PRESET_AMOUNTS_CENTS,
  toBinaryFlag,
  decrementClamped,
  CREDIT_AMOUNT_STEP_CENTS,
  decrementOrZero,
  incrementCappedAtTwo,
  decrementClampedLower,
  CONSUMER_TERMS_URL,
  CREDIT_MAX_POLL_COUNT,
  CREDIT_POLL_INTERVAL_MS,
} from "./creditOffers.js";
import { previewPurchaseTax, fetchPrepaidPurchaseStatus } from "../../services/api/billing.js";
import { formatCurrency, getCurrencySymbol } from "../../services/api/referral.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL, EARLY_RETURN_SENTINEL } from "../../../runtime/bun-runtime.js";
import { formatCardOnFile } from "./ExtraUsageDialog.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { TextInput } from "../TextInput.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";
import { AnimatedClawd } from "../LogoV2/AnimatedClawd.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";

//@ chunk-18hwfzwa.js:1154884-1155348 placement
/**
 * 左右两端对齐的标签-数值行（购买额度汇总）。
 */
function SummaryRow(props) {
  let $ = w(11);
  let { label, value: D, bold, dim } = props;
  let Re;
  if ($[0] !== bold || $[1] !== dim || $[2] !== label) {
    Re = jsxProd_default(Text, {
      dimColor: dim,
      bold,
      children: label,
    });
    $[0] = bold;
    $[1] = dim;
    $[2] = label;
    $[3] = Re;
  } else Re = $[3];
  let Be;
  if ($[4] !== bold || $[5] !== dim || $[6] !== D) {
    Be = jsxProd_default(Text, {
      dimColor: dim,
      bold,
      children: D,
    });
    $[4] = bold;
    $[5] = dim;
    $[6] = D;
    $[7] = Be;
  } else Be = $[7];
  let He;
  if ($[8] !== Re || $[9] !== Be) {
    He = jsxProd_default_2(Box, {
      justifyContent: "space-between",
      children: [Re, Be],
    });
    $[8] = Re;
    $[9] = Be;
    $[10] = He;
  } else He = $[10];
  return He;
}
//@ chunk-18hwfzwa.js:1155348-1160051 placement
/**
 * 购买额度流程中的确认购买步骤。
 */
function ConfirmPurchaseStep(props) {
  let $ = w(85);
  let {
    pm,
    cents,
    bundle,
    custom,
    capRemaining,
    offerKind,
    currency,
    stripeProductId,
    expiryMonths,
    onConfirm,
    onCancel,
  } = props;
  let { credentials } = useTheme_2();
  let [kt, At] = y(false);
  let It = bundle ? bundle.local_price_minor_units : (custom?.payMinor ?? cents);
  let Ot = bundle ? bundle.local_credit_minor_units : (custom?.creditMinor ?? cents);
  let Et = Ot - It;
  let Dt = discountPercentOfPay(Ot, It);
  let Lt = Ot > It && (custom ? custom.kind === "extra_credit" : offerKind === "extra_credit");
  let Xt;
  if ($[0] !== Ot || $[1] !== It) {
    Xt = percentOfBase(Ot, It);
    $[0] = Ot;
    $[1] = It;
    $[2] = Xt;
  } else Xt = $[2];
  let io = Xt;
  let so = expiryMonths !== null ? ` (valid for ${expiryMonths} ${expiryMonths === 1 ? "mo" : "mos"})` : "";
  let [po, ao] = y("loading");
  let co;
  let bo;
  if ($[3] !== credentials || $[4] !== currency || $[5] !== It || $[6] !== stripeProductId) {
    co = () => {
      let Ao = true;
      previewPurchaseTax(It, currency, stripeProductId, credentials).then((Bo) => {
        if (Ao) ao(Bo);
      });
      return () => {
        Ao = false;
      };
    };
    bo = [It, currency, stripeProductId, credentials];
    $[3] = credentials;
    $[4] = currency;
    $[5] = It;
    $[6] = stripeProductId;
    $[7] = co;
    $[8] = bo;
  } else {
    co = $[7];
    bo = $[8];
  }
  P(co, bo);
  let Ro = po === "loading";
  let Ho = po === null;
  let taxMinorUnits = Ro || Ho ? 0 : po.tax_minor_units;
  let Wo = It + taxMinorUnits;
  let mn;
  if ($[9] !== currency || $[10] !== Ro || $[11] !== Ho || $[12] !== Wo) {
    mn = Ho
      ? [
          {
            label: "Go back",
            value: "no",
          },
        ]
      : [
          {
            label: Ro ? "Pay (calculating\u2026)" : `Pay ${formatCurrency(Wo, currency)} now`,
            value: "yes",
            disabled: Ro,
          },
          {
            label: "Go back",
            value: "no",
          },
        ];
    $[9] = currency;
    $[10] = Ro;
    $[11] = Ho;
    $[12] = Wo;
    $[13] = mn;
  } else mn = $[13];
  let options = mn;
  let { columns } = useTerminalSize();
  let max = Math.max(0, Math.min(columns - 6, 44));
  let Yo = Ro || Ho ? "Tax" : (po.tax_label ?? "Tax");
  let children;
  if ($[14] !== max) {
    children = "\u2500".repeat(max);
    $[14] = max;
    $[15] = children;
  } else children = $[15];
  let Fn;
  if ($[16] !== children) {
    Fn = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[16] = children;
    $[17] = Fn;
  } else Fn = $[17];
  let bn = Fn;
  if (kt) {
    let onBack;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      onBack = () => At(false);
      $[18] = onBack;
    } else onBack = $[18];
    let hn;
    if ($[19] !== currency || $[20] !== onConfirm || $[21] !== Wo) {
      hn = jsxProd_default(ConfirmQuestion, {
        question: "Buy usage credits for",
        amountCents: Wo,
        currency,
        onConfirm,
        onBack,
      });
      $[19] = currency;
      $[20] = onConfirm;
      $[21] = Wo;
      $[22] = hn;
    } else hn = $[22];
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
  ) {
    Go = Lt
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(SummaryRow, {
              label:
                expiryMonths !== null
                  ? `Credits +${io}% (valid for ${expiryMonths} ${expiryMonths === 1 ? "mo" : "mos"})`
                  : `Usage credits (+${io}% extra)`,
              value: formatCurrency(Ot, currency),
            }),
            bn,
            jsxProd_default(SummaryRow, {
              label: "You pay",
              value: formatCurrency(It, currency),
            }),
          ],
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(SummaryRow, {
              label: expiryMonths !== null ? `Usage credits${so}` : "Subtotal",
              value: formatCurrency(Ot, currency),
            }),
            Et > 0 &&
              jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(SummaryRow, {
                    label: `Discount${Dt > 0 ? ` (${Dt}%)` : ""}`,
                    value: `\u2212${formatCurrency(Et, currency)}`,
                  }),
                  bn,
                  jsxProd_default(SummaryRow, {
                    label: "Subtotal after discount",
                    value: formatCurrency(It, currency),
                  }),
                ],
              }),
          ],
        });
    $[23] = Ot;
    $[24] = currency;
    $[25] = Et;
    $[26] = Dt;
    $[27] = bn;
    $[28] = expiryMonths;
    $[29] = Lt;
    $[30] = io;
    $[31] = It;
    $[32] = so;
    $[33] = Go;
  } else Go = $[33];
  let hn;
  if ($[34] !== currency || $[35] !== po || $[36] !== Yo || $[37] !== Ro || $[38] !== Ho) {
    hn = Ro
      ? jsxProd_default(SummaryRow, {
          label: Yo,
          value: "\u2026",
          dim: true,
        })
      : Ho
        ? jsxProd_default(SummaryRow, {
            label: Yo,
            value: "\u2014",
            dim: true,
          })
        : jsxProd_default(SummaryRow, {
            label: `${Yo} (${formatPercent(po.tax_rate_pct)})`,
            value: formatCurrency(po.tax_minor_units, currency),
          });
    $[34] = currency;
    $[35] = po;
    $[36] = Yo;
    $[37] = Ro;
    $[38] = Ho;
    $[39] = hn;
  } else hn = $[39];
  let value;
  if ($[40] !== currency || $[41] !== Ro || $[42] !== Ho || $[43] !== Wo) {
    value = Ro ? "\u2026" : Ho ? "\u2014" : formatCurrency(Wo, currency);
    $[40] = currency;
    $[41] = Ro;
    $[42] = Ho;
    $[43] = Wo;
    $[44] = value;
  } else value = $[44];
  let Xo;
  if ($[45] !== value) {
    Xo = jsxProd_default(SummaryRow, {
      label: "Total due",
      value,
      bold: true,
    });
    $[45] = value;
    $[46] = Xo;
  } else Xo = $[46];
  let Sn;
  if ($[47] !== max || $[48] !== bn || $[49] !== Xo || $[50] !== Go || $[51] !== hn) {
    Sn = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: max,
      children: [Go, hn, bn, Xo],
    });
    $[47] = max;
    $[48] = bn;
    $[49] = Xo;
    $[50] = Go;
    $[51] = hn;
    $[52] = Sn;
  } else Sn = $[52];
  let $n;
  if ($[53] !== capRemaining || $[54] !== currency || $[55] !== custom) {
    $n =
      custom?.withheld &&
      jsxProd_default(Text, {
        dimColor: true,
        children: describeWithheldBonus(custom, capRemaining, currency),
      });
    $[53] = capRemaining;
    $[54] = currency;
    $[55] = custom;
    $[56] = $n;
  } else $n = $[56];
  let on;
  if ($[57] === MEMO_CACHE_SENTINEL) {
    on = jsxProd_default(Text, {
      children: "Payment ",
    });
    $[57] = on;
  } else on = $[57];
  let children_2;
  if ($[58] !== pm) {
    children_2 = formatCardOnFile(pm);
    $[58] = pm;
    $[59] = children_2;
  } else children_2 = $[59];
  let cn;
  if ($[60] !== children_2) {
    cn = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[60] = children_2;
    $[61] = cn;
  } else cn = $[61];
  let Dn;
  if ($[62] !== max || $[63] !== cn) {
    Dn = jsxProd_default_2(Box, {
      width: max,
      children: [on, cn],
    });
    $[62] = max;
    $[63] = cn;
    $[64] = Dn;
  } else Dn = $[64];
  let wn;
  if ($[65] !== Ho) {
    wn =
      Ho &&
      jsxProd_default(Text, {
        color: "warning",
        children: `Couldn't calculate tax. Try again, or buy at ${USAGE_SETTINGS_LINK}`,
      });
    $[65] = Ho;
    $[66] = wn;
  } else wn = $[66];
  let onChange;
  if ($[67] !== onCancel) {
    onChange = (Kn) => {
      if (Kn !== "yes") {
        onCancel();
        return;
      }
      At(true);
    };
    $[67] = onCancel;
    $[68] = onChange;
  } else onChange = $[68];
  let Wn;
  if ($[69] !== onCancel || $[70] !== options || $[71] !== onChange) {
    Wn = jsxProd_default(ModelSelector, {
      options,
      onChange,
      onCancel,
      visibleOptionCount: 2,
    });
    $[69] = onCancel;
    $[70] = options;
    $[71] = onChange;
    $[72] = Wn;
  } else Wn = $[72];
  let Fr;
  if ($[73] !== Ho) {
    Fr =
      !Ho &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "By confirming, you allow Anthropic to charge your card in the amount above.",
      });
    $[73] = Ho;
    $[74] = Fr;
  } else Fr = $[74];
  let children_3;
  if ($[75] !== Sn || $[76] !== $n || $[77] !== Dn || $[78] !== wn || $[79] !== Wn || $[80] !== Fr) {
    children_3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Sn, $n, Dn, wn, Wn, Fr],
    });
    $[75] = Sn;
    $[76] = $n;
    $[77] = Dn;
    $[78] = wn;
    $[79] = Wn;
    $[80] = Fr;
    $[81] = children_3;
  } else children_3 = $[81];
  let Un;
  if ($[82] !== onCancel || $[83] !== children_3) {
    Un = jsxProd_default(Dialog, {
      title: "Buy usage credits",
      onCancel,
      color: "suggestion",
      children: children_3,
    });
    $[82] = onCancel;
    $[83] = children_3;
    $[84] = Un;
  } else Un = $[84];
  return Un;
}
//@ chunk-18hwfzwa.js:1160051-1160100 placement
function formatPercent(taxRatePct) {
  return `${Number(taxRatePct.toFixed(2))}%`;
}
//@ chunk-18hwfzwa.js:1160100-1160529 placement
/**
 * 说明为何此金额没有额外额度/折扣（超出上限或本月折扣额度已用完）。
 */
function describeWithheldBonus(h, capRemaining, currency) {
  let L = h.withheld === "bonus" ? "extra credit" : "discount";
  if (h.maxWithBonusMinor !== undefined)
    return h.maxWithBonusMinor > 0
      ? `No ${L} on an amount this large: up to ${formatCurrency(h.maxWithBonusMinor, currency)} still gets it.`
      : `No ${L}: this month's discount limit is used up.`;
  return capRemaining !== null && capRemaining <= 0
    ? `No ${L}: this month's discount limit is used up.`
    : `No ${L} on this amount: it would go over what's left of this month's discount limit.`;
}
//@ chunk-18hwfzwa.js:1160529-1162196 placement
function CustomAmountStep(props) {
  let $ = w(24);
  let { pm, initialCents, currency, offer, discountTiers, usdRate, capRemaining, onConfirm, onCancel } =
    props;
  let ze = offer?.kind === "extra_credit" && offer.customBonusTiers !== null;
  let rt;
  if ($[0] !== capRemaining || $[1] !== discountTiers || $[2] !== offer || $[3] !== usdRate) {
    rt = (typedMinor) =>
      computeCreditOffer({
        typedMinor,
        offer,
        discountTiers,
        rate: usdRate,
        capRemainingUsdMinor: capRemaining,
      });
    $[0] = capRemaining;
    $[1] = discountTiers;
    $[2] = offer;
    $[3] = usdRate;
    $[4] = rt;
  } else rt = $[4];
  let At = rt;
  let subtitle;
  if ($[5] !== ze || $[6] !== pm || $[7] !== usdRate) {
    subtitle =
      ze && usdRate !== null
        ? `Amount to pay \xB7 Payment: ${formatCardOnFile(pm)}`
        : `Payment: ${formatCardOnFile(pm)}`;
    $[5] = ze;
    $[6] = pm;
    $[7] = usdRate;
    $[8] = subtitle;
  } else subtitle = $[8];
  const initial = initialCents ? String(initialCents / 100) : "75";
  const minCents = currency === "USD" ? CREDIT_MIN_AMOUNT_CENTS : undefined;
  let preview;
  if ($[9] !== capRemaining || $[10] !== currency || $[11] !== At) {
    preview = (Lt) => {
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
            : undefined;
        }
      }
    };
    $[9] = capRemaining;
    $[10] = currency;
    $[11] = At;
    $[12] = preview;
  } else preview = $[12];
  let onSubmit;
  if ($[13] !== onConfirm || $[14] !== At) {
    onSubmit = (io) => {
      let so = At(io);
      onConfirm(io, so.kind === "plain" && !so.withheld ? undefined : so);
    };
    $[13] = onConfirm;
    $[14] = At;
    $[15] = onSubmit;
  } else onSubmit = $[15];
  let po;
  if (
    $[16] !== currency ||
    $[17] !== onCancel ||
    $[18] !== subtitle ||
    $[19] !== initial ||
    $[20] !== minCents ||
    $[21] !== preview ||
    $[22] !== onSubmit
  ) {
    po = jsxProd_default(AmountEntry, {
      title: "Buy usage credits",
      subtitle,
      initial,
      minCents,
      currency,
      preview,
      footer: "By confirming, you allow Anthropic to charge your card in the amount above.",
      onSubmit,
      onCancel,
    });
    $[16] = currency;
    $[17] = onCancel;
    $[18] = subtitle;
    $[19] = initial;
    $[20] = minCents;
    $[21] = preview;
    $[22] = onSubmit;
    $[23] = po;
  } else po = $[23];
  return po;
}
//@ chunk-18hwfzwa.js:1162196-1162209 placement
var YES = "yes";
//@ chunk-18hwfzwa.js:1162209-1163920 placement
function ConfirmQuestion(props) {
  let $ = w(30);
  let { question, amountCents, currency, onConfirm, onBack } = props;
  let { columns } = useTerminalSize();
  let [Be, He] = y("");
  let [We, ze] = y(0);
  let [Xe, rt] = y(false);
  let kt = R(false);
  let At = Be.trim().toLowerCase() === YES;
  let Ot = Xe && !At ? "error" : At ? "success" : undefined;
  let Dt;
  if ($[0] !== onBack) {
    Dt = {
      "confirm:no": onBack,
    };
    $[0] = onBack;
    $[1] = Dt;
  } else Dt = $[1];
  let Lt;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    Lt = {
      context: "Settings",
    };
    $[2] = Lt;
  } else Lt = $[2];
  MessageActionsKeybindings(Dt, Lt);
  let oo;
  if ($[3] !== amountCents || $[4] !== currency) {
    oo = formatCurrency(amountCents, currency);
    $[3] = amountCents;
    $[4] = currency;
    $[5] = oo;
  } else oo = $[5];
  let Xt;
  if ($[6] !== question || $[7] !== oo) {
    Xt = jsxProd_default_2(Text, {
      children: [question, " ", oo, "."],
    });
    $[6] = question;
    $[7] = oo;
    $[8] = Xt;
  } else Xt = $[8];
  const dimColor = !Ot;
  let so;
  if ($[9] !== Ot || $[10] !== dimColor) {
    so = jsxProd_default_2(Text, {
      color: Ot,
      dimColor,
      children: ["Type ", YES, " to confirm."],
    });
    $[9] = Ot;
    $[10] = dimColor;
    $[11] = so;
  } else so = $[11];
  const borderColor = Ot ?? "warning";
  let onSubmit;
  if ($[12] !== onConfirm) {
    onSubmit = (co) => {
      if (co.trim().toLowerCase() === YES) {
        if (kt.current) {
          return;
        }
        kt.current = true;
        onConfirm();
      } else {
        He("");
        ze(0);
        rt(true);
      }
    };
    $[12] = onConfirm;
    $[13] = onSubmit;
  } else onSubmit = $[13];
  let children;
  if ($[14] !== columns || $[15] !== We || $[16] !== onBack || $[17] !== onSubmit || $[18] !== Be) {
    children = jsxProd_default(TextInput, {
      value: Be,
      disableEscapeDoublePress: true,
      onChange: He,
      onSubmit,
      onExit: onBack,
      focus: true,
      showCursor: true,
      columns,
      cursorOffset: We,
      onChangeCursorOffset: ze,
    });
    $[14] = columns;
    $[15] = We;
    $[16] = onBack;
    $[17] = onSubmit;
    $[18] = Be;
    $[19] = children;
  } else children = $[19];
  let Ao;
  if ($[20] !== borderColor || $[21] !== children) {
    Ao = jsxProd_default(Box, {
      borderStyle: "single",
      borderColor,
      paddingX: 1,
      children,
    });
    $[20] = borderColor;
    $[21] = children;
    $[22] = Ao;
  } else Ao = $[22];
  let children_2;
  if ($[23] !== Ao || $[24] !== Xt || $[25] !== so) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Xt, so, Ao],
    });
    $[23] = Ao;
    $[24] = Xt;
    $[25] = so;
    $[26] = children_2;
  } else children_2 = $[26];
  let Ro;
  if ($[27] !== onBack || $[28] !== children_2) {
    Ro = jsxProd_default(Dialog, {
      title: "Confirm amount",
      onCancel: onBack,
      color: "warning",
      isCancelActive: false,
      children: children_2,
    });
    $[27] = onBack;
    $[28] = children_2;
    $[29] = Ro;
  } else Ro = $[29];
  return Ro;
}
//@ chunk-18hwfzwa.js:1163920-1167866 placement
/**
 * 购买额度流程中的花费上限设置步骤。
 */
function SpendLimitStep(props) {
  let $ = w(70);
  let { current: x, currency, onConfirm, onCancel } = props;
  let { columns } = useTerminalSize();
  let Be;
  if ($[0] !== x) {
    Be = x !== null ? formatDollarAmount(x) : "150";
    $[0] = x;
    $[1] = Be;
  } else Be = $[1];
  let He = Be;
  let { value: We, setValue, cursor, setCursor } = useAmountInputBuffer(He);
  let [kt, At] = y(0);
  let It;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    It = ["set", "unlimited", "cancel"];
    $[2] = It;
  } else It = $[2];
  let Ot = It;
  let [Et, Dt] = y(0);
  let [Lt, oo] = y(false);
  let Xt;
  let io;
  let so;
  let po;
  let color;
  let co;
  let gap;
  let onKeyDown;
  let Bo;
  let Ro;
  let Ho;
  let title;
  let onCancel_2;
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
      let amountInput = parseAmountInput(We);
      po = !amountInput.ok && (We.trim() !== "" || kt === 1) ? amountInput.error : "";
      let No = function No() {
        let Cn = Ot[Et];
        if (Cn === "set") {
          if (!amountInput.ok) {
            return;
          }
          if (amountInput.cents > CREDIT_PRESET_AMOUNTS_CENTS) {
            oo(true);
            return;
          }
          onConfirm(amountInput.cents);
        } else if (Cn === "unlimited") onConfirm(null);
        else onCancel();
      };
      let kn = function kn(event) {
        if (event.key === "tab") {
          event.preventDefault();
          At(toBinaryFlag);
          return;
        }
        if (kt !== 1) {
          return;
        }
        if (event.key === "up") {
          event.preventDefault();
          At(0);
        } else if (event.key === "down") event.preventDefault();
        else if (event.key === "left") {
          event.preventDefault();
          Dt(decrementClamped);
        } else if (event.key === "right") {
          event.preventDefault();
          Dt((Yo) => Math.min(Ot.length - 1, Yo + 1));
        } else if (event.key === "return") {
          event.preventDefault();
          No();
        }
      };
      let Fn;
      if ($[27] === MEMO_CACHE_SENTINEL) {
        Fn = {
          set: "Set limit",
          unlimited: "Set to unlimited",
          cancel: "Cancel",
        };
        $[27] = Fn;
      } else Fn = $[27];
      so = Fn;
      if (Lt && amountInput.ok) {
        let onBack;
        if ($[28] === MEMO_CACHE_SENTINEL) {
          onBack = () => oo(false);
          $[28] = onBack;
        } else onBack = $[28];
        co = jsxProd_default(ConfirmQuestion, {
          question: "Set your monthly spend limit to",
          amountCents: amountInput.cents,
          currency,
          onConfirm: () => onConfirm(amountInput.cents),
          onBack,
        });
        break Go;
      }
      io = Dialog;
      title = "Set monthly spend limit";
      onCancel_2 = onCancel;
      color = "suggestion";
      Xt = FocusColumn;
      gap = 1;
      onKeyDown = kn;
      if ($[29] === MEMO_CACHE_SENTINEL) {
        Bo = jsxProd_default(Text, {
          children: "You can set a maximum amount you can spend on usage credits per month.",
        });
        $[29] = Bo;
      } else Bo = $[29];
      const borderColor = kt === 0 ? "suggestion" : "inactive";
      let children;
      if ($[30] !== currency) {
        children = getCurrencySymbol(currency);
        $[30] = currency;
        $[31] = children;
      } else children = $[31];
      let Mn;
      if ($[32] !== children) {
        Mn = jsxProd_default(Text, {
          children,
        });
        $[32] = children;
        $[33] = Mn;
      } else Mn = $[33];
      let onSubmit;
      let onHistoryDown;
      if ($[34] === MEMO_CACHE_SENTINEL) {
        onSubmit = () => At(1);
        onHistoryDown = () => At(1);
        $[34] = onSubmit;
        $[35] = onHistoryDown;
      } else {
        onSubmit = $[34];
        onHistoryDown = $[35];
      }
      const focus = kt === 0;
      const showCursor = kt === 0;
      let _o;
      if (
        $[36] !== columns ||
        $[37] !== cursor ||
        $[38] !== setCursor ||
        $[39] !== setValue ||
        $[40] !== focus ||
        $[41] !== showCursor ||
        $[42] !== We
      ) {
        _o = jsxProd_default(TextInput, {
          value: We,
          onChange: setValue,
          onSubmit,
          onHistoryDown,
          disableCursorMovementForUpDownKeys: true,
          focus,
          showCursor,
          columns,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
        });
        $[36] = columns;
        $[37] = cursor;
        $[38] = setCursor;
        $[39] = setValue;
        $[40] = focus;
        $[41] = showCursor;
        $[42] = We;
        $[43] = _o;
      } else _o = $[43];
      if ($[44] !== borderColor || $[45] !== Mn || $[46] !== _o) {
        Ro = jsxProd_default_2(Box, {
          borderStyle: "single",
          borderColor,
          paddingX: 1,
          children: [Mn, _o],
        });
        $[44] = borderColor;
        $[45] = Mn;
        $[46] = _o;
        $[47] = Ro;
      } else Ro = $[47];
      Ho =
        amountInput.ok &&
        jsxProd_default_2(Text, {
          color: "success",
          children: ["Monthly limit: ", formatCurrency(amountInput.cents, currency)],
        });
    }
    $[3] = Et;
    $[4] = columns;
    $[5] = Lt;
    $[6] = currency;
    $[7] = cursor;
    $[8] = kt;
    $[9] = onCancel;
    $[10] = onConfirm;
    $[11] = setCursor;
    $[12] = setValue;
    $[13] = We;
    $[14] = Xt;
    $[15] = io;
    $[16] = so;
    $[17] = po;
    $[18] = color;
    $[19] = co;
    $[20] = gap;
    $[21] = onKeyDown;
    $[22] = Bo;
    $[23] = Ro;
    $[24] = Ho;
    $[25] = title;
    $[26] = onCancel_2;
  } else {
    Xt = $[14];
    io = $[15];
    so = $[16];
    po = $[17];
    color = $[18];
    co = $[19];
    gap = $[20];
    onKeyDown = $[21];
    Bo = $[22];
    Ro = $[23];
    Ho = $[24];
    title = $[25];
    onCancel_2 = $[26];
  }
  if (co !== EARLY_RETURN_SENTINEL) return co;
  let Fn;
  if ($[48] !== po) {
    Fn =
      po &&
      jsxProd_default(Text, {
        color: "error",
        children: po,
      });
    $[48] = po;
    $[49] = Fn;
  } else Fn = $[49];
  let bn;
  if ($[50] === MEMO_CACHE_SENTINEL) {
    bn = jsxProd_default(Text, {
      dimColor: true,
      children: "This spend limit goes into effect immediately.",
    });
    $[50] = bn;
  } else bn = $[50];
  let hn;
  if ($[51] !== Et || $[52] !== so || $[53] !== kt) {
    hn = jsxProd_default(Box, {
      flexDirection: "row",
      gap: 2,
      children: Ot.map((cn, Dn) =>
        jsxProd_default_2(
          Text,
          {
            color: kt === 1 && Et === Dn ? "suggestion" : undefined,
            children: [kt === 1 && Et === Dn ? figures_default.pointer : " ", " ", so[cn]],
          },
          cn,
        ),
      ),
    });
    $[51] = Et;
    $[52] = so;
    $[53] = kt;
    $[54] = hn;
  } else hn = $[54];
  let children;
  if (
    $[55] !== Xt ||
    $[56] !== Fn ||
    $[57] !== hn ||
    $[58] !== gap ||
    $[59] !== onKeyDown ||
    $[60] !== Bo ||
    $[61] !== Ro ||
    $[62] !== Ho
  ) {
    children = jsxProd_default_2(Xt, {
      gap,
      onKeyDown,
      children: [Bo, Ro, Ho, Fn, bn, hn],
    });
    $[55] = Xt;
    $[56] = Fn;
    $[57] = hn;
    $[58] = gap;
    $[59] = onKeyDown;
    $[60] = Bo;
    $[61] = Ro;
    $[62] = Ho;
    $[63] = children;
  } else children = $[63];
  let Xo;
  if ($[64] !== io || $[65] !== color || $[66] !== children || $[67] !== title || $[68] !== onCancel_2) {
    Xo = jsxProd_default(io, {
      title,
      onCancel: onCancel_2,
      color,
      children,
    });
    $[64] = io;
    $[65] = color;
    $[66] = children;
    $[67] = title;
    $[68] = onCancel_2;
    $[69] = Xo;
  } else Xo = $[69];
  return Xo;
}
//@ chunk-18hwfzwa.js:1167866-1175272 placement
/**
 * 购买额度流程中的自动充值设置步骤。
 */
function AutoReloadStep(props) {
  let $ = w(134);
  let { current: x, pm, currency, onSave, onTurnOff, onCancel } = props;
  let { columns } = useTerminalSize();
  let He = x?.enabled === true;
  let ze;
  if ($[0] !== x) {
    ze = x?.threshold_in_minor_units != null ? formatDollarAmount(x.threshold_in_minor_units) : "5";
    $[0] = x;
    $[1] = ze;
  } else ze = $[1];
  let Xe = ze;
  let rt;
  if ($[2] !== x) {
    rt = x?.reload_to_in_minor_units != null ? formatDollarAmount(x.reload_to_in_minor_units) : "15";
    $[2] = x;
    $[3] = rt;
  } else rt = $[3];
  let kt = rt;
  let { value: At, setValue, cursor, setCursor } = useAmountInputBuffer(Xe);
  let {
    value: Dt,
    setValue: setValue_2,
    cursor: cursor_2,
    setCursor: setCursor_2,
  } = useAmountInputBuffer(kt);
  let [io, so] = y(0);
  let po;
  if ($[4] !== He) {
    po = He ? ["save", "off", "cancel"] : ["save", "cancel"];
    $[4] = He;
    $[5] = po;
  } else po = $[5];
  let ao = po;
  let [co, bo] = y(0);
  let [Ao, Bo] = y(false);
  let Ro;
  let Ho;
  let Io;
  let Wo;
  let mn;
  let Cn;
  let No;
  let title;
  let onCancel_2;
  let color;
  let Fn;
  let gap;
  let onKeyDown;
  let hn;
  let Mn;
  let Xo;
  let Sn;
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
            : currency === "USD" && mn.cents - Cn.cents < CREDIT_AMOUNT_STEP_CENTS
              ? `Reload must be at least ${formatCurrency(CREDIT_AMOUNT_STEP_CENTS, currency, "whole")} above threshold`
              : "";
      let $n = !Wo;
      let error = !Cn.ok && (At.trim() !== "" || io !== 0) ? Cn.error : "";
      let error_2 = !mn.ok && (Dt.trim() !== "" || io === 2) ? mn.error : "";
      let Dn = function Dn() {
        let cn = ao[co];
        if (cn === "save") {
          if (!Cn.ok || !mn.ok || !$n) {
            return;
          }
          Bo(true);
          return;
        } else if (cn === "off") onTurnOff();
        else onCancel();
      };
      let wn;
      if ($[42] === MEMO_CACHE_SENTINEL) {
        wn = () => so(decrementOrZero);
        $[42] = wn;
      } else wn = $[42];
      let mr = wn;
      let Kn;
      if ($[43] === MEMO_CACHE_SENTINEL) {
        Kn = () => so(incrementCappedAtTwo);
        $[43] = Kn;
      } else Kn = $[43];
      let Wn = Kn;
      let Fr;
      if ($[44] !== Dn || $[45] !== ao.length || $[46] !== io) {
        Fr = function dr(event) {
          if (event.key === "tab") {
            event.preventDefault();
            if (event.shift) mr();
            else Wn();
            return;
          }
          if (io !== 2) {
            return;
          }
          if (event.key === "up") {
            event.preventDefault();
            mr();
          } else if (event.key === "down") event.preventDefault();
          else if (event.key === "left") {
            event.preventDefault();
            bo(decrementClampedLower);
          } else if (event.key === "right") {
            event.preventDefault();
            bo((Un) => Math.min(ao.length - 1, Un + 1));
          } else if (event.key === "return") {
            event.preventDefault();
            Dn();
          }
        };
        $[44] = Dn;
        $[45] = ao.length;
        $[46] = io;
        $[47] = Fr;
      } else Fr = $[47];
      let dr = Fr;
      let save = He ? "Agree and save" : "Agree and turn on";
      let pr;
      if ($[48] !== save) {
        pr = {
          save,
          off: "Turn off",
          cancel: "Cancel",
        };
        $[48] = save;
        $[49] = pr;
      } else pr = $[49];
      Io = pr;
      if (Ao && Cn.ok && mn.ok) {
        let onBack;
        if ($[50] === MEMO_CACHE_SENTINEL) {
          onBack = () => Bo(false);
          $[50] = onBack;
        } else onBack = $[50];
        Fn = jsxProd_default(ConfirmQuestion, {
          question: "Auto-reload will top your balance up to",
          amountCents: mn.cents,
          currency,
          onConfirm: () => onSave(Cn.cents, mn.cents),
          onBack,
        });
        break ur;
      }
      Ho = Dialog;
      title = "Auto-reload";
      onCancel_2 = onCancel;
      color = "suggestion";
      Ro = FocusColumn;
      gap = 1;
      onKeyDown = dr;
      let Qn;
      if ($[51] !== He) {
        Qn =
          He &&
          jsxProd_default(Text, {
            color: "success",
            children: " \xB7 Currently on",
          });
        $[51] = He;
        $[52] = Qn;
      } else Qn = $[52];
      if ($[53] !== Qn) {
        hn = jsxProd_default_2(Text, {
          children: ["Automatically buy more usage credits when your balance is low.", Qn],
        });
        $[53] = Qn;
        $[54] = hn;
      } else hn = $[54];
      let Ir;
      if ($[55] !== pm) {
        Ir = formatCardOnFile(pm);
        $[55] = pm;
        $[56] = Ir;
      } else Ir = $[56];
      if ($[57] !== Ir) {
        Mn = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Card on file: ", Ir],
        });
        $[57] = Ir;
        $[58] = Mn;
      } else Mn = $[58];
      let Pr;
      if ($[59] === MEMO_CACHE_SENTINEL) {
        Pr = jsxProd_default(Text, {
          dimColor: true,
          children: "When usage credit balance falls below:",
        });
        $[59] = Pr;
      } else Pr = $[59];
      const borderColor = error ? "error" : io === 0 ? "suggestion" : "inactive";
      let children;
      if ($[60] !== currency) {
        children = getCurrencySymbol(currency);
        $[60] = currency;
        $[61] = children;
      } else children = $[61];
      let Ur;
      if ($[62] !== children) {
        Ur = jsxProd_default(Text, {
          children,
        });
        $[62] = children;
        $[63] = Ur;
      } else Ur = $[63];
      let onSubmit;
      let onHistoryDown;
      if ($[64] === MEMO_CACHE_SENTINEL) {
        onSubmit = () => so(1);
        onHistoryDown = () => so(1);
        $[64] = onSubmit;
        $[65] = onHistoryDown;
      } else {
        onSubmit = $[64];
        onHistoryDown = $[65];
      }
      const focus = io === 0;
      const showCursor = io === 0;
      let fr;
      if (
        $[66] !== columns ||
        $[67] !== cursor ||
        $[68] !== setCursor ||
        $[69] !== setValue ||
        $[70] !== focus ||
        $[71] !== showCursor ||
        $[72] !== At
      ) {
        fr = jsxProd_default(TextInput, {
          value: At,
          onChange: setValue,
          onSubmit,
          onHistoryDown,
          disableCursorMovementForUpDownKeys: true,
          focus,
          showCursor,
          columns,
          cursorOffset: cursor,
          onChangeCursorOffset: setCursor,
        });
        $[66] = columns;
        $[67] = cursor;
        $[68] = setCursor;
        $[69] = setValue;
        $[70] = focus;
        $[71] = showCursor;
        $[72] = At;
        $[73] = fr;
      } else fr = $[73];
      let $r;
      if ($[74] !== borderColor || $[75] !== Ur || $[76] !== fr) {
        $r = jsxProd_default_2(Box, {
          borderStyle: "single",
          borderColor,
          paddingX: 1,
          children: [Ur, fr],
        });
        $[74] = borderColor;
        $[75] = Ur;
        $[76] = fr;
        $[77] = $r;
      } else $r = $[77];
      Xo = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          Pr,
          $r,
          error &&
            jsxProd_default(Text, {
              color: "error",
              children: error,
            }),
        ],
      });
      let Yr;
      if ($[78] === MEMO_CACHE_SENTINEL) {
        Yr = jsxProd_default(Text, {
          dimColor: true,
          children: "Reload balance to:",
        });
        $[78] = Yr;
      } else Yr = $[78];
      const borderColor_2 = error_2 ? "error" : io === 1 ? "suggestion" : "inactive";
      let children_2;
      if ($[79] !== currency) {
        children_2 = getCurrencySymbol(currency);
        $[79] = currency;
        $[80] = children_2;
      } else children_2 = $[80];
      let ms;
      if ($[81] !== children_2) {
        ms = jsxProd_default(Text, {
          children: children_2,
        });
        $[81] = children_2;
        $[82] = ms;
      } else ms = $[82];
      let onSubmit_2;
      let onHistoryUp;
      let onHistoryDown_2;
      if ($[83] === MEMO_CACHE_SENTINEL) {
        onSubmit_2 = () => so(2);
        onHistoryUp = () => so(0);
        onHistoryDown_2 = () => so(2);
        $[83] = onSubmit_2;
        $[84] = onHistoryUp;
        $[85] = onHistoryDown_2;
      } else {
        onSubmit_2 = $[83];
        onHistoryUp = $[84];
        onHistoryDown_2 = $[85];
      }
      const focus_2 = io === 1;
      const showCursor_2 = io === 1;
      let oi;
      if (
        $[86] !== columns ||
        $[87] !== cursor_2 ||
        $[88] !== Dt ||
        $[89] !== setCursor_2 ||
        $[90] !== setValue_2 ||
        $[91] !== focus_2 ||
        $[92] !== showCursor_2
      ) {
        oi = jsxProd_default(TextInput, {
          value: Dt,
          onChange: setValue_2,
          onSubmit: onSubmit_2,
          onHistoryUp,
          onHistoryDown: onHistoryDown_2,
          disableCursorMovementForUpDownKeys: true,
          focus: focus_2,
          showCursor: showCursor_2,
          columns,
          cursorOffset: cursor_2,
          onChangeCursorOffset: setCursor_2,
        });
        $[86] = columns;
        $[87] = cursor_2;
        $[88] = Dt;
        $[89] = setCursor_2;
        $[90] = setValue_2;
        $[91] = focus_2;
        $[92] = showCursor_2;
        $[93] = oi;
      } else oi = $[93];
      let Oi;
      if ($[94] !== borderColor_2 || $[95] !== ms || $[96] !== oi) {
        Oi = jsxProd_default_2(Box, {
          borderStyle: "single",
          borderColor: borderColor_2,
          paddingX: 1,
          children: [ms, oi],
        });
        $[94] = borderColor_2;
        $[95] = ms;
        $[96] = oi;
        $[97] = Oi;
      } else Oi = $[97];
      Sn = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          Yr,
          Oi,
          error_2 &&
            jsxProd_default(Text, {
              color: "error",
              children: error_2,
            }),
        ],
      });
      No =
        Cn.ok &&
        mn.ok &&
        $n &&
        jsxProd_default_2(Text, {
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
    $[6] = co;
    $[7] = ao;
    $[8] = columns;
    $[9] = Ao;
    $[10] = currency;
    $[11] = cursor;
    $[12] = cursor_2;
    $[13] = io;
    $[14] = He;
    $[15] = onCancel;
    $[16] = onSave;
    $[17] = onTurnOff;
    $[18] = pm;
    $[19] = Dt;
    $[20] = setCursor;
    $[21] = setCursor_2;
    $[22] = setValue_2;
    $[23] = setValue;
    $[24] = At;
    $[25] = Ro;
    $[26] = Ho;
    $[27] = Io;
    $[28] = Wo;
    $[29] = mn;
    $[30] = Cn;
    $[31] = No;
    $[32] = title;
    $[33] = onCancel_2;
    $[34] = color;
    $[35] = Fn;
    $[36] = gap;
    $[37] = onKeyDown;
    $[38] = hn;
    $[39] = Mn;
    $[40] = Xo;
    $[41] = Sn;
  } else {
    Ro = $[25];
    Ho = $[26];
    Io = $[27];
    Wo = $[28];
    mn = $[29];
    Cn = $[30];
    No = $[31];
    title = $[32];
    onCancel_2 = $[33];
    color = $[34];
    Fn = $[35];
    gap = $[36];
    onKeyDown = $[37];
    hn = $[38];
    Mn = $[39];
    Xo = $[40];
    Sn = $[41];
  }
  if (Fn !== EARLY_RETURN_SENTINEL) return Fn;
  let wn;
  if ($[98] !== pm) {
    wn = formatCardOnFile(pm);
    $[98] = pm;
    $[99] = wn;
  } else wn = $[99];
  let Kn;
  if ($[100] !== wn) {
    Kn = jsxProd_default_2(Text, {
      dimColor: true,
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
    });
    $[100] = wn;
    $[101] = Kn;
  } else Kn = $[101];
  let Fr;
  if ($[102] !== co || $[103] !== Io || $[104] !== ao || $[105] !== io) {
    Fr = ao.map((Hi, Zi) =>
      jsxProd_default_2(
        Text,
        {
          color: io === 2 && co === Zi ? "suggestion" : undefined,
          children: [io === 2 && co === Zi ? figures_default.pointer : " ", " ", Io[Hi]],
        },
        Hi,
      ),
    );
    $[102] = co;
    $[103] = Io;
    $[104] = ao;
    $[105] = io;
    $[106] = Fr;
  } else Fr = $[106];
  let pr;
  if ($[107] !== co || $[108] !== ao || $[109] !== Wo || $[110] !== io || $[111] !== mn || $[112] !== Cn) {
    pr =
      Wo &&
      Cn.ok &&
      mn.ok &&
      io === 2 &&
      ao[co] === "save" &&
      jsxProd_default_2(Text, {
        color: "error",
        children: ["\xB7 ", Wo],
      });
    $[107] = co;
    $[108] = ao;
    $[109] = Wo;
    $[110] = io;
    $[111] = mn;
    $[112] = Cn;
    $[113] = pr;
  } else pr = $[113];
  let Qn;
  if ($[114] !== Fr || $[115] !== pr) {
    Qn = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      children: [Fr, pr],
    });
    $[114] = Fr;
    $[115] = pr;
    $[116] = Qn;
  } else Qn = $[116];
  let children;
  if (
    $[117] !== Ro ||
    $[118] !== No ||
    $[119] !== Kn ||
    $[120] !== Qn ||
    $[121] !== gap ||
    $[122] !== onKeyDown ||
    $[123] !== hn ||
    $[124] !== Mn ||
    $[125] !== Xo ||
    $[126] !== Sn
  ) {
    children = jsxProd_default_2(Ro, {
      gap,
      onKeyDown,
      children: [hn, Mn, Xo, Sn, No, Kn, Qn],
    });
    $[117] = Ro;
    $[118] = No;
    $[119] = Kn;
    $[120] = Qn;
    $[121] = gap;
    $[122] = onKeyDown;
    $[123] = hn;
    $[124] = Mn;
    $[125] = Xo;
    $[126] = Sn;
    $[127] = children;
  } else children = $[127];
  let Pr;
  if ($[128] !== Ho || $[129] !== title || $[130] !== onCancel_2 || $[131] !== color || $[132] !== children) {
    Pr = jsxProd_default(Ho, {
      title,
      onCancel: onCancel_2,
      color,
      children,
    });
    $[128] = Ho;
    $[129] = title;
    $[130] = onCancel_2;
    $[131] = color;
    $[132] = children;
    $[133] = Pr;
  } else Pr = $[133];
  return Pr;
}
//@ chunk-18hwfzwa.js:1175272-1177637 placement
function AmountEntry(props) {
  let $ = w(52);
  let { title, subtitle, initial, minCents, currency, preview, footer, onSubmit, onCancel } = props;
  let { columns } = useTerminalSize();
  let { value: Xe, setValue, cursor, setCursor } = useAmountInputBuffer(initial);
  let [It, Ot] = y(false);
  let Dt;
  if ($[0] !== Xe) {
    Dt = parseAmountInput(Xe);
    $[0] = Xe;
    $[1] = Dt;
  } else Dt = $[1];
  let Lt = Dt;
  let oo = Lt.ok && minCents !== undefined && Lt.cents < minCents;
  let Xt;
  if (
    $[2] !== It ||
    $[3] !== oo ||
    $[4] !== currency ||
    $[5] !== minCents ||
    $[6] !== Lt.error ||
    $[7] !== Lt.ok ||
    $[8] !== Xe
  ) {
    Xt =
      !Lt.ok && (Xe.trim() !== "" || It)
        ? Lt.error
        : oo && minCents !== undefined
          ? `Minimum is ${formatCurrency(minCents, currency, "whole")}`
          : "";
    $[2] = It;
    $[3] = oo;
    $[4] = currency;
    $[5] = minCents;
    $[6] = Lt.error;
    $[7] = Lt.ok;
    $[8] = Xe;
    $[9] = Xt;
  } else Xt = $[9];
  let io = Xt;
  let so;
  if ($[10] !== oo || $[11] !== onSubmit || $[12] !== Lt.cents || $[13] !== Lt.ok) {
    so = function po() {
      if (!Lt.ok || oo) {
        Ot(true);
        return;
      }
      onSubmit(Lt.cents);
    };
    $[10] = oo;
    $[11] = onSubmit;
    $[12] = Lt.cents;
    $[13] = Lt.ok;
    $[14] = so;
  } else so = $[14];
  let onSubmit_2 = so;
  let ao;
  if ($[15] !== subtitle) {
    ao = jsxProd_default(Text, {
      dimColor: true,
      children: subtitle,
    });
    $[15] = subtitle;
    $[16] = ao;
  } else ao = $[16];
  let children;
  if ($[17] !== currency) {
    children = getCurrencySymbol(currency);
    $[17] = currency;
    $[18] = children;
  } else children = $[18];
  let bo;
  if ($[19] !== children) {
    bo = jsxProd_default(Text, {
      children,
    });
    $[19] = children;
    $[20] = bo;
  } else bo = $[20];
  let Ao;
  if (
    $[21] !== columns ||
    $[22] !== cursor ||
    $[23] !== onCancel ||
    $[24] !== setCursor ||
    $[25] !== setValue ||
    $[26] !== onSubmit_2 ||
    $[27] !== Xe
  ) {
    Ao = jsxProd_default(TextInput, {
      value: Xe,
      onChange: setValue,
      onSubmit: onSubmit_2,
      onExit: onCancel,
      focus: true,
      showCursor: true,
      columns,
      cursorOffset: cursor,
      onChangeCursorOffset: setCursor,
    });
    $[21] = columns;
    $[22] = cursor;
    $[23] = onCancel;
    $[24] = setCursor;
    $[25] = setValue;
    $[26] = onSubmit_2;
    $[27] = Xe;
    $[28] = Ao;
  } else Ao = $[28];
  let Bo;
  if ($[29] !== bo || $[30] !== Ao) {
    Bo = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [bo, Ao],
    });
    $[29] = bo;
    $[30] = Ao;
    $[31] = Bo;
  } else Bo = $[31];
  let Ro;
  if ($[32] !== footer) {
    Ro =
      footer &&
      jsxProd_default(Text, {
        dimColor: true,
        children: footer,
      });
    $[32] = footer;
    $[33] = Ro;
  } else Ro = $[33];
  let Ho;
  if ($[34] !== oo || $[35] !== currency || $[36] !== Lt.cents || $[37] !== Lt.ok || $[38] !== preview) {
    Ho =
      Lt.ok &&
      !oo &&
      jsxProd_default(Text, {
        color: "success",
        children: preview?.(Lt.cents) ?? `Buys ${formatCurrency(Lt.cents, currency)} of usage credits`,
      });
    $[34] = oo;
    $[35] = currency;
    $[36] = Lt.cents;
    $[37] = Lt.ok;
    $[38] = preview;
    $[39] = Ho;
  } else Ho = $[39];
  let Io;
  if ($[40] !== io) {
    Io =
      io &&
      jsxProd_default(Text, {
        color: "error",
        children: io,
      });
    $[40] = io;
    $[41] = Io;
  } else Io = $[41];
  let children_2;
  if ($[42] !== Ho || $[43] !== Io || $[44] !== ao || $[45] !== Bo || $[46] !== Ro) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [ao, Bo, Ro, Ho, Io],
    });
    $[42] = Ho;
    $[43] = Io;
    $[44] = ao;
    $[45] = Bo;
    $[46] = Ro;
    $[47] = children_2;
  } else children_2 = $[47];
  let mn;
  if ($[48] !== onCancel || $[49] !== children_2 || $[50] !== title) {
    mn = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "suggestion",
      children: children_2,
    });
    $[48] = onCancel;
    $[49] = children_2;
    $[50] = title;
    $[51] = mn;
  } else mn = $[51];
  return mn;
}
//@ chunk-18hwfzwa.js:1177637-1178928 placement
function PurchasePoller(props) {
  let $ = w(11);
  let { purchaseId, onSuccess, onError } = props;
  let { credentials } = useTheme_2();
  let ke = R(0);
  let Re = Oo(onSuccess);
  let Be = Oo(onError);
  let clock = useClock();
  let ze;
  if ($[0] !== clock || $[1] !== credentials || $[2] !== purchaseId || $[3] !== Be || $[4] !== Re) {
    ze = () => {
      let Xe = false;
      let rt;
      let At = function At(kt) {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: fromEnum(kt),
        });
      };
      async function Et() {
        if (Xe) {
          return;
        }
        ke.current = ke.current + 1;
        if (ke.current > CREDIT_MAX_POLL_COUNT) {
          Xe = true;
          Be(`Purchase timed out \u2014 check ${USAGE_SETTINGS_LINK}`);
          return;
        }
        try {
          let prepaidPurchaseStatus = await fetchPrepaidPurchaseStatus(purchaseId, credentials);
          if (Xe) {
            return;
          }
          if (prepaidPurchaseStatus.status === "paid") {
            Xe = true;
            At("success");
            Re();
          } else if (prepaidPurchaseStatus.status === "failed") {
            Xe = true;
            At("failed");
            Be("Payment failed");
          } else if (prepaidPurchaseStatus.status === "action_needed") {
            Xe = true;
            At("3ds_fallback");
            Be(
              `Your card requires additional verification \u2014 this purchase was not completed. Try again at ${USAGE_SETTINGS_LINK}`,
            );
          } else rt = clock.setTimeout(Et, CREDIT_POLL_INTERVAL_MS);
        } catch (error) {
          let Dt = error;
          if (Xe) {
            return;
          }
          Xe = true;
          if (isExpectedApiError(Dt))
            logForDebugging(`Purchase status poll failed: ${errorMessage(Dt)}`, {
              level: "error",
            });
          else logError(Dt);
          Be("Failed to check purchase status");
        }
      }
      Et();
      return () => {
        Xe = true;
        rt?.();
      };
    };
    $[0] = clock;
    $[1] = credentials;
    $[2] = purchaseId;
    $[3] = Be;
    $[4] = Re;
    $[5] = ze;
  } else ze = $[5];
  let It;
  if ($[6] !== clock || $[7] !== credentials || $[8] !== purchaseId) {
    It = [clock, purchaseId, credentials];
    $[6] = clock;
    $[7] = credentials;
    $[8] = purchaseId;
    $[9] = It;
  } else It = $[9];
  P(ze, It);
  let Lt;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    Lt = jsxProd_default(ClawdLoadingRow, {
      message: "Confirming payment\u2026 (may take a few seconds)",
    });
    $[10] = Lt;
  } else Lt = $[10];
  return Lt;
}
//@ chunk-18hwfzwa.js:1178928-1179193 placement
/**
 * 渲染带动画 Clawd 的加载行与提示信息。
 */
function ClawdLoadingRow(props) {
  let $ = w(3);
  let { message } = props;
  let L;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    L = jsxProd_default(AnimatedClawd, {
      autoplay: true,
    });
    $[0] = L;
  } else L = $[0];
  let ee;
  if ($[1] !== message) {
    ee = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 2,
      children: [
        L,
        jsxProd_default(Text, {
          dimColor: true,
          children: message,
        }),
      ],
    });
    $[1] = message;
    $[2] = ee;
  } else ee = $[2];
  return ee;
}
//@ chunk-18hwfzwa.js:1179193-1179628 placement
/**
 * 购买成功时显示 Clawd 庆祝动画与成功文案，动画结束后回调。
 */
function ClawdSuccessRow(props) {
  let $ = w(7);
  let { message, onDone } = props;
  let ee;
  if ($[0] !== onDone) {
    ee = jsxProd_default(AnimatedClawd, {
      sequence: "celebrate",
      reserveCrouchRow: true,
      onComplete: onDone,
    });
    $[0] = onDone;
    $[1] = ee;
  } else ee = $[1];
  let ke;
  if ($[2] !== message) {
    ke = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        color: "success",
        children: message,
      }),
    });
    $[2] = message;
    $[3] = ke;
  } else ke = $[3];
  let Re;
  if ($[4] !== ee || $[5] !== ke) {
    Re = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 1,
      children: [ee, ke],
    });
    $[4] = ee;
    $[5] = ke;
    $[6] = Re;
  } else Re = $[6];
  return Re;
}
//@ chunk-18hwfzwa.js:1179628-1180592 placement
function CelebrationMessage(props) {
  let $ = w(15);
  let { message, work, onDone, failure } = props;
  let ke = R(null);
  let Re = R(false);
  let Be = R(false);
  let We;
  if ($[0] !== failure || $[1] !== onDone) {
    We = (ze) => {
      let Xe = ze ?? {
        value: failure,
      };
      ke.current = Xe;
      if (Re.current && !Be.current) onDone(Xe.value);
    };
    $[0] = failure;
    $[1] = onDone;
    $[2] = We;
  } else We = $[2];
  let rt = Oo(We);
  let kt;
  if ($[3] !== rt || $[4] !== work) {
    kt = () => {
      work
        .then((value) =>
          rt({
            value,
          }),
        )
        .catch((error) => {
          logError(error);
          rt(null);
        });
      return () => {
        Be.current = true;
      };
    };
    $[3] = rt;
    $[4] = work;
    $[5] = kt;
  } else kt = $[5];
  let Ot;
  if ($[6] !== work) {
    Ot = [work];
    $[6] = work;
    $[7] = Ot;
  } else Ot = $[7];
  P(kt, Ot);
  let Et;
  if ($[8] !== onDone) {
    Et = jsxProd_default(AnimatedClawd, {
      sequence: "celebrate",
      reserveCrouchRow: true,
      onComplete: () => {
        Re.current = true;
        if (ke.current && !Be.current) onDone(ke.current.value);
      },
    });
    $[8] = onDone;
    $[9] = Et;
  } else Et = $[9];
  let Dt;
  if ($[10] !== message) {
    Dt = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: message,
      }),
    });
    $[10] = message;
    $[11] = Dt;
  } else Dt = $[11];
  let Lt;
  if ($[12] !== Et || $[13] !== Dt) {
    Lt = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 1,
      children: [Et, Dt],
    });
    $[12] = Et;
    $[13] = Dt;
    $[14] = Lt;
  } else Lt = $[14];
  return Lt;
}
//@ chunk-18hwfzwa.js:1180592-1181129 placement
/**
 * 显示等待提示并等待一个 Promise；完成时以结果调用 onDone，失败记错误并以 failure 值调用；卸载后不再回调。
 */
function AwaitWork(props) {
  let $ = w(10);
  let { message, work, onDone, failure } = props;
  let Re;
  if ($[0] !== failure || $[1] !== onDone) {
    Re = (Be) => onDone(Be ? Be.value : failure);
    $[0] = failure;
    $[1] = onDone;
    $[2] = Re;
  } else Re = $[2];
  let He = Oo(Re);
  let We;
  if ($[3] !== He || $[4] !== work) {
    We = () => {
      let ze = false;
      work
        .then((value) => {
          if (!ze)
            He({
              value,
            });
        })
        .catch((error) => {
          logError(error);
          if (!ze) He(null);
        });
      return () => {
        ze = true;
      };
    };
    $[3] = He;
    $[4] = work;
    $[5] = We;
  } else We = $[5];
  let kt;
  if ($[6] !== work) {
    kt = [work];
    $[6] = work;
    $[7] = kt;
  } else kt = $[7];
  P(We, kt);
  let At;
  if ($[8] !== message) {
    At = jsxProd_default(Box, {
      paddingTop: 1,
      children: jsxProd_default(WorkerBadge, {
        message,
      }),
    });
    $[8] = message;
    $[9] = At;
  } else At = $[9];
  return At;
}
//@ chunk-18hwfzwa.js:1181129-1181441 placement
/**
 * 判断购买用量额度流程的当前步骤是否处于忙碌（加载、开通、调整、保存自动充值、购买中、轮询）状态。
 */
function isBusyCreditsStep(h) {
  switch (h) {
    case "loading":
    case "enabling":
    case "adjusting":
    case "auto_reload_saving":
    case "buy_purchasing":
    case "buy_polling":
      return true;
    case "not_enabled":
    case "enabled":
    case "buy_select":
    case "buy_custom":
    case "buy_confirm":
    case "buy_success":
    case "adjust_limit":
    case "auto_reload_config":
    case "error":
      return false;
  }
}
//@ chunk-18hwfzwa.js:1181441-1181445 placement
init_react_production();
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
