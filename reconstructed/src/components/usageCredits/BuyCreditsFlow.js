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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import {
  useState,
  useEffect,
  useRef,
  useEffectEvent,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1154884-1155348 placement
/**
 * 左右两端对齐的标签-数值行（购买额度汇总）。
 */
function SummaryRow(props) {
  let $ = useMemoCache(11);
  let { label, value, bold, dim } = props;
  let labelElement;
  if ($[0] !== bold || $[1] !== dim || $[2] !== label) {
    labelElement = jsxProd_default(Text, {
      dimColor: dim,
      bold,
      children: label,
    });
    $[0] = bold;
    $[1] = dim;
    $[2] = label;
    $[3] = labelElement;
  } else labelElement = $[3];
  let valueElement;
  if ($[4] !== bold || $[5] !== dim || $[6] !== value) {
    valueElement = jsxProd_default(Text, {
      dimColor: dim,
      bold,
      children: value,
    });
    $[4] = bold;
    $[5] = dim;
    $[6] = value;
    $[7] = valueElement;
  } else valueElement = $[7];
  let rowElement;
  if ($[8] !== labelElement || $[9] !== valueElement) {
    rowElement = jsxProd_default_2(Box, {
      justifyContent: "space-between",
      children: [labelElement, valueElement],
    });
    $[8] = labelElement;
    $[9] = valueElement;
    $[10] = rowElement;
  } else rowElement = $[10];
  return rowElement;
}
//@ chunk-18hwfzwa.js:1155348-1160051 placement
/**
 * 购买额度流程中的确认购买步骤。
 */
function ConfirmPurchaseStep(props) {
  let $ = useMemoCache(85);
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
  let [isConfirming, setIsConfirming] = useState(false);
  let payMinor = bundle ? bundle.local_price_minor_units : (custom?.payMinor ?? cents);
  let creditMinor = bundle ? bundle.local_credit_minor_units : (custom?.creditMinor ?? cents);
  let bonusMinor = creditMinor - payMinor;
  let discountPercent = discountPercentOfPay(creditMinor, payMinor);
  let isExtraCredit =
    creditMinor > payMinor && (custom ? custom.kind === "extra_credit" : offerKind === "extra_credit");
  let bonusPercent;
  if ($[0] !== creditMinor || $[1] !== payMinor) {
    bonusPercent = percentOfBase(creditMinor, payMinor);
    $[0] = creditMinor;
    $[1] = payMinor;
    $[2] = bonusPercent;
  } else bonusPercent = $[2];
  let bonusPercent_ = bonusPercent;
  let expirySuffix =
    expiryMonths !== null ? ` (valid for ${expiryMonths} ${expiryMonths === 1 ? "mo" : "mos"})` : "";
  let [taxState, setTaxState] = useState("loading");
  let loadTax;
  let loadTaxDeps;
  if ($[3] !== credentials || $[4] !== currency || $[5] !== payMinor || $[6] !== stripeProductId) {
    loadTax = () => {
      let isMounted = true;
      previewPurchaseTax(payMinor, currency, stripeProductId, credentials).then((taxResult) => {
        if (isMounted) setTaxState(taxResult);
      });
      return () => {
        isMounted = false;
      };
    };
    loadTaxDeps = [payMinor, currency, stripeProductId, credentials];
    $[3] = credentials;
    $[4] = currency;
    $[5] = payMinor;
    $[6] = stripeProductId;
    $[7] = loadTax;
    $[8] = loadTaxDeps;
  } else {
    loadTax = $[7];
    loadTaxDeps = $[8];
  }
  useEffect(loadTax, loadTaxDeps);
  let isTaxLoading = taxState === "loading";
  let isTaxUnavailable = taxState === null;
  let taxMinorUnits = isTaxLoading || isTaxUnavailable ? 0 : taxState.tax_minor_units;
  let totalMinor = payMinor + taxMinorUnits;
  let options;
  if ($[9] !== currency || $[10] !== isTaxLoading || $[11] !== isTaxUnavailable || $[12] !== totalMinor) {
    options = isTaxUnavailable
      ? [
          {
            label: "Go back",
            value: "no",
          },
        ]
      : [
          {
            label: isTaxLoading
              ? "Pay (calculating\u2026)"
              : `Pay ${formatCurrency(totalMinor, currency)} now`,
            value: "yes",
            disabled: isTaxLoading,
          },
          {
            label: "Go back",
            value: "no",
          },
        ];
    $[9] = currency;
    $[10] = isTaxLoading;
    $[11] = isTaxUnavailable;
    $[12] = totalMinor;
    $[13] = options;
  } else options = $[13];
  let options_2 = options;
  let { columns } = useTerminalSize();
  let max = Math.max(0, Math.min(columns - 6, 44));
  let taxLabel = isTaxLoading || isTaxUnavailable ? "Tax" : (taxState.tax_label ?? "Tax");
  let children;
  if ($[14] !== max) {
    children = "\u2500".repeat(max);
    $[14] = max;
    $[15] = children;
  } else children = $[15];
  let dividerElement;
  if ($[16] !== children) {
    dividerElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[16] = children;
    $[17] = dividerElement;
  } else dividerElement = $[17];
  let divider = dividerElement;
  if (isConfirming) {
    let onBack;
    if ($[18] === MEMO_CACHE_SENTINEL) {
      onBack = () => setIsConfirming(false);
      $[18] = onBack;
    } else onBack = $[18];
    let confirmElement;
    if ($[19] !== currency || $[20] !== onConfirm || $[21] !== totalMinor) {
      confirmElement = jsxProd_default(ConfirmQuestion, {
        question: "Buy usage credits for",
        amountCents: totalMinor,
        currency,
        onConfirm,
        onBack,
      });
      $[19] = currency;
      $[20] = onConfirm;
      $[21] = totalMinor;
      $[22] = confirmElement;
    } else confirmElement = $[22];
    return confirmElement;
  }
  let summaryElement;
  if (
    $[23] !== creditMinor ||
    $[24] !== currency ||
    $[25] !== bonusMinor ||
    $[26] !== discountPercent ||
    $[27] !== divider ||
    $[28] !== expiryMonths ||
    $[29] !== isExtraCredit ||
    $[30] !== bonusPercent_ ||
    $[31] !== payMinor ||
    $[32] !== expirySuffix
  ) {
    summaryElement = isExtraCredit
      ? jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(SummaryRow, {
              label:
                expiryMonths !== null
                  ? `Credits +${bonusPercent_}% (valid for ${expiryMonths} ${expiryMonths === 1 ? "mo" : "mos"})`
                  : `Usage credits (+${bonusPercent_}% extra)`,
              value: formatCurrency(creditMinor, currency),
            }),
            divider,
            jsxProd_default(SummaryRow, {
              label: "You pay",
              value: formatCurrency(payMinor, currency),
            }),
          ],
        })
      : jsxProd_default_2(Fragment, {
          children: [
            jsxProd_default(SummaryRow, {
              label: expiryMonths !== null ? `Usage credits${expirySuffix}` : "Subtotal",
              value: formatCurrency(creditMinor, currency),
            }),
            bonusMinor > 0 &&
              jsxProd_default_2(Fragment, {
                children: [
                  jsxProd_default(SummaryRow, {
                    label: `Discount${discountPercent > 0 ? ` (${discountPercent}%)` : ""}`,
                    value: `\u2212${formatCurrency(bonusMinor, currency)}`,
                  }),
                  divider,
                  jsxProd_default(SummaryRow, {
                    label: "Subtotal after discount",
                    value: formatCurrency(payMinor, currency),
                  }),
                ],
              }),
          ],
        });
    $[23] = creditMinor;
    $[24] = currency;
    $[25] = bonusMinor;
    $[26] = discountPercent;
    $[27] = divider;
    $[28] = expiryMonths;
    $[29] = isExtraCredit;
    $[30] = bonusPercent_;
    $[31] = payMinor;
    $[32] = expirySuffix;
    $[33] = summaryElement;
  } else summaryElement = $[33];
  let taxRowElement;
  if (
    $[34] !== currency ||
    $[35] !== taxState ||
    $[36] !== taxLabel ||
    $[37] !== isTaxLoading ||
    $[38] !== isTaxUnavailable
  ) {
    taxRowElement = isTaxLoading
      ? jsxProd_default(SummaryRow, {
          label: taxLabel,
          value: "\u2026",
          dim: true,
        })
      : isTaxUnavailable
        ? jsxProd_default(SummaryRow, {
            label: taxLabel,
            value: "\u2014",
            dim: true,
          })
        : jsxProd_default(SummaryRow, {
            label: `${taxLabel} (${formatPercent(taxState.tax_rate_pct)})`,
            value: formatCurrency(taxState.tax_minor_units, currency),
          });
    $[34] = currency;
    $[35] = taxState;
    $[36] = taxLabel;
    $[37] = isTaxLoading;
    $[38] = isTaxUnavailable;
    $[39] = taxRowElement;
  } else taxRowElement = $[39];
  let value;
  if ($[40] !== currency || $[41] !== isTaxLoading || $[42] !== isTaxUnavailable || $[43] !== totalMinor) {
    value = isTaxLoading ? "\u2026" : isTaxUnavailable ? "\u2014" : formatCurrency(totalMinor, currency);
    $[40] = currency;
    $[41] = isTaxLoading;
    $[42] = isTaxUnavailable;
    $[43] = totalMinor;
    $[44] = value;
  } else value = $[44];
  let totalRowElement;
  if ($[45] !== value) {
    totalRowElement = jsxProd_default(SummaryRow, {
      label: "Total due",
      value,
      bold: true,
    });
    $[45] = value;
    $[46] = totalRowElement;
  } else totalRowElement = $[46];
  let summaryBox;
  if (
    $[47] !== max ||
    $[48] !== divider ||
    $[49] !== totalRowElement ||
    $[50] !== summaryElement ||
    $[51] !== taxRowElement
  ) {
    summaryBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: max,
      children: [summaryElement, taxRowElement, divider, totalRowElement],
    });
    $[47] = max;
    $[48] = divider;
    $[49] = totalRowElement;
    $[50] = summaryElement;
    $[51] = taxRowElement;
    $[52] = summaryBox;
  } else summaryBox = $[52];
  let withheldNotice;
  if ($[53] !== capRemaining || $[54] !== currency || $[55] !== custom) {
    withheldNotice =
      custom?.withheld &&
      jsxProd_default(Text, {
        dimColor: true,
        children: describeWithheldBonus(custom, capRemaining, currency),
      });
    $[53] = capRemaining;
    $[54] = currency;
    $[55] = custom;
    $[56] = withheldNotice;
  } else withheldNotice = $[56];
  let paymentLabelElement;
  if ($[57] === MEMO_CACHE_SENTINEL) {
    paymentLabelElement = jsxProd_default(Text, {
      children: "Payment ",
    });
    $[57] = paymentLabelElement;
  } else paymentLabelElement = $[57];
  let children_2;
  if ($[58] !== pm) {
    children_2 = formatCardOnFile(pm);
    $[58] = pm;
    $[59] = children_2;
  } else children_2 = $[59];
  let cardOnFileElement;
  if ($[60] !== children_2) {
    cardOnFileElement = jsxProd_default(Text, {
      dimColor: true,
      children: children_2,
    });
    $[60] = children_2;
    $[61] = cardOnFileElement;
  } else cardOnFileElement = $[61];
  let paymentRowBox;
  if ($[62] !== max || $[63] !== cardOnFileElement) {
    paymentRowBox = jsxProd_default_2(Box, {
      width: max,
      children: [paymentLabelElement, cardOnFileElement],
    });
    $[62] = max;
    $[63] = cardOnFileElement;
    $[64] = paymentRowBox;
  } else paymentRowBox = $[64];
  let taxErrorNotice;
  if ($[65] !== isTaxUnavailable) {
    taxErrorNotice =
      isTaxUnavailable &&
      jsxProd_default(Text, {
        color: "warning",
        children: `Couldn't calculate tax. Try again, or buy at ${USAGE_SETTINGS_LINK}`,
      });
    $[65] = isTaxUnavailable;
    $[66] = taxErrorNotice;
  } else taxErrorNotice = $[66];
  let onChange;
  if ($[67] !== onCancel) {
    onChange = (choice) => {
      if (choice !== "yes") {
        onCancel();
        return;
      }
      setIsConfirming(true);
    };
    $[67] = onCancel;
    $[68] = onChange;
  } else onChange = $[68];
  let actionsElement;
  if ($[69] !== onCancel || $[70] !== options_2 || $[71] !== onChange) {
    actionsElement = jsxProd_default(ModelSelector, {
      options: options_2,
      onChange,
      onCancel,
      visibleOptionCount: 2,
    });
    $[69] = onCancel;
    $[70] = options_2;
    $[71] = onChange;
    $[72] = actionsElement;
  } else actionsElement = $[72];
  let consentNotice;
  if ($[73] !== isTaxUnavailable) {
    consentNotice =
      !isTaxUnavailable &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "By confirming, you allow Anthropic to charge your card in the amount above.",
      });
    $[73] = isTaxUnavailable;
    $[74] = consentNotice;
  } else consentNotice = $[74];
  let children_3;
  if (
    $[75] !== summaryBox ||
    $[76] !== withheldNotice ||
    $[77] !== paymentRowBox ||
    $[78] !== taxErrorNotice ||
    $[79] !== actionsElement ||
    $[80] !== consentNotice
  ) {
    children_3 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [summaryBox, withheldNotice, paymentRowBox, taxErrorNotice, actionsElement, consentNotice],
    });
    $[75] = summaryBox;
    $[76] = withheldNotice;
    $[77] = paymentRowBox;
    $[78] = taxErrorNotice;
    $[79] = actionsElement;
    $[80] = consentNotice;
    $[81] = children_3;
  } else children_3 = $[81];
  let dialogElement;
  if ($[82] !== onCancel || $[83] !== children_3) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Buy usage credits",
      onCancel,
      color: "suggestion",
      children: children_3,
    });
    $[82] = onCancel;
    $[83] = children_3;
    $[84] = dialogElement;
  } else dialogElement = $[84];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1160051-1160100 placement
function formatPercent(taxRatePct) {
  return `${Number(taxRatePct.toFixed(2))}%`;
}
//@ chunk-18hwfzwa.js:1160100-1160529 placement
/**
 * 说明为何此金额没有额外额度/折扣（超出上限或本月折扣额度已用完）。
 */
function describeWithheldBonus(offer, capRemaining, currency) {
  let bonusLabel = offer.withheld === "bonus" ? "extra credit" : "discount";
  if (offer.maxWithBonusMinor !== undefined)
    return offer.maxWithBonusMinor > 0
      ? `No ${bonusLabel} on an amount this large: up to ${formatCurrency(offer.maxWithBonusMinor, currency)} still gets it.`
      : `No ${bonusLabel}: this month's discount limit is used up.`;
  return capRemaining !== null && capRemaining <= 0
    ? `No ${bonusLabel}: this month's discount limit is used up.`
    : `No ${bonusLabel} on this amount: it would go over what's left of this month's discount limit.`;
}
//@ chunk-18hwfzwa.js:1160529-1162196 placement
function CustomAmountStep(props) {
  let $ = useMemoCache(24);
  let { pm, initialCents, currency, offer, discountTiers, usdRate, capRemaining, onConfirm, onCancel } =
    props;
  let supportsBonusTiers = offer?.kind === "extra_credit" && offer.customBonusTiers !== null;
  let computeOffer;
  if ($[0] !== capRemaining || $[1] !== discountTiers || $[2] !== offer || $[3] !== usdRate) {
    computeOffer = (typedMinor) =>
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
    $[4] = computeOffer;
  } else computeOffer = $[4];
  let computeOffer_ = computeOffer;
  let subtitle;
  if ($[5] !== supportsBonusTiers || $[6] !== pm || $[7] !== usdRate) {
    subtitle =
      supportsBonusTiers && usdRate !== null
        ? `Amount to pay \xB7 Payment: ${formatCardOnFile(pm)}`
        : `Payment: ${formatCardOnFile(pm)}`;
    $[5] = supportsBonusTiers;
    $[6] = pm;
    $[7] = usdRate;
    $[8] = subtitle;
  } else subtitle = $[8];
  const initial = initialCents ? String(initialCents / 100) : "75";
  const minCents = currency === "USD" ? CREDIT_MIN_AMOUNT_CENTS : undefined;
  let preview;
  if ($[9] !== capRemaining || $[10] !== currency || $[11] !== computeOffer_) {
    preview = (typedMinor) => {
      let computed = computeOffer_(typedMinor);
      switch (computed.kind) {
        case "extra_credit": {
          return `Pay ${formatCurrency(computed.payMinor, currency)} \xB7 Get ${formatCurrency(computed.creditMinor, currency)} of usage credits (+${computed.pct}%)`;
        }
        case "discount": {
          return `Buys ${formatCurrency(computed.creditMinor, currency)} of usage credits for ${formatCurrency(computed.payMinor, currency)} (${computed.pct}% off)`;
        }
        case "plain": {
          return computed.withheld
            ? `Buys ${formatCurrency(computed.creditMinor, currency)} of usage credits \xB7 ${describeWithheldBonus(computed, capRemaining, currency)}`
            : undefined;
        }
      }
    };
    $[9] = capRemaining;
    $[10] = currency;
    $[11] = computeOffer_;
    $[12] = preview;
  } else preview = $[12];
  let onSubmit;
  if ($[13] !== onConfirm || $[14] !== computeOffer_) {
    onSubmit = (typedMinor) => {
      let computed = computeOffer_(typedMinor);
      onConfirm(typedMinor, computed.kind === "plain" && !computed.withheld ? undefined : computed);
    };
    $[13] = onConfirm;
    $[14] = computeOffer_;
    $[15] = onSubmit;
  } else onSubmit = $[15];
  let amountEntryElement;
  if (
    $[16] !== currency ||
    $[17] !== onCancel ||
    $[18] !== subtitle ||
    $[19] !== initial ||
    $[20] !== minCents ||
    $[21] !== preview ||
    $[22] !== onSubmit
  ) {
    amountEntryElement = jsxProd_default(AmountEntry, {
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
    $[23] = amountEntryElement;
  } else amountEntryElement = $[23];
  return amountEntryElement;
}
//@ chunk-18hwfzwa.js:1162196-1162209 placement
var YES = "yes";
//@ chunk-18hwfzwa.js:1162209-1163920 placement
function ConfirmQuestion(props) {
  let $ = useMemoCache(30);
  let { question, amountCents, currency, onConfirm, onBack } = props;
  let { columns } = useTerminalSize();
  let [typedText, setTypedText] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let [hasMismatch, setHasMismatch] = useState(false);
  let submittedRef = useRef(false);
  let isConfirmed = typedText.trim().toLowerCase() === YES;
  let feedbackColor = hasMismatch && !isConfirmed ? "error" : isConfirmed ? "success" : undefined;
  let keybindingHandlers;
  if ($[0] !== onBack) {
    keybindingHandlers = {
      "confirm:no": onBack,
    };
    $[0] = onBack;
    $[1] = keybindingHandlers;
  } else keybindingHandlers = $[1];
  let settingsKeybindingOptions;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    settingsKeybindingOptions = {
      context: "Settings",
    };
    $[2] = settingsKeybindingOptions;
  } else settingsKeybindingOptions = $[2];
  MessageActionsKeybindings(keybindingHandlers, settingsKeybindingOptions);
  let amountText;
  if ($[3] !== amountCents || $[4] !== currency) {
    amountText = formatCurrency(amountCents, currency);
    $[3] = amountCents;
    $[4] = currency;
    $[5] = amountText;
  } else amountText = $[5];
  let questionElement;
  if ($[6] !== question || $[7] !== amountText) {
    questionElement = jsxProd_default_2(Text, {
      children: [question, " ", amountText, "."],
    });
    $[6] = question;
    $[7] = amountText;
    $[8] = questionElement;
  } else questionElement = $[8];
  const dimColor = !feedbackColor;
  let promptElement;
  if ($[9] !== feedbackColor || $[10] !== dimColor) {
    promptElement = jsxProd_default_2(Text, {
      color: feedbackColor,
      dimColor,
      children: ["Type ", YES, " to confirm."],
    });
    $[9] = feedbackColor;
    $[10] = dimColor;
    $[11] = promptElement;
  } else promptElement = $[11];
  const borderColor = feedbackColor ?? "warning";
  let onSubmit;
  if ($[12] !== onConfirm) {
    onSubmit = (submittedText) => {
      if (submittedText.trim().toLowerCase() === YES) {
        if (submittedRef.current) {
          return;
        }
        submittedRef.current = true;
        onConfirm();
      } else {
        setTypedText("");
        setCursorOffset(0);
        setHasMismatch(true);
      }
    };
    $[12] = onConfirm;
    $[13] = onSubmit;
  } else onSubmit = $[13];
  let children;
  if (
    $[14] !== columns ||
    $[15] !== cursorOffset ||
    $[16] !== onBack ||
    $[17] !== onSubmit ||
    $[18] !== typedText
  ) {
    children = jsxProd_default(TextInput, {
      value: typedText,
      disableEscapeDoublePress: true,
      onChange: setTypedText,
      onSubmit,
      onExit: onBack,
      focus: true,
      showCursor: true,
      columns,
      cursorOffset,
      onChangeCursorOffset: setCursorOffset,
    });
    $[14] = columns;
    $[15] = cursorOffset;
    $[16] = onBack;
    $[17] = onSubmit;
    $[18] = typedText;
    $[19] = children;
  } else children = $[19];
  let inputFrame;
  if ($[20] !== borderColor || $[21] !== children) {
    inputFrame = jsxProd_default(Box, {
      borderStyle: "single",
      borderColor,
      paddingX: 1,
      children,
    });
    $[20] = borderColor;
    $[21] = children;
    $[22] = inputFrame;
  } else inputFrame = $[22];
  let children_2;
  if ($[23] !== inputFrame || $[24] !== questionElement || $[25] !== promptElement) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [questionElement, promptElement, inputFrame],
    });
    $[23] = inputFrame;
    $[24] = questionElement;
    $[25] = promptElement;
    $[26] = children_2;
  } else children_2 = $[26];
  let dialogElement;
  if ($[27] !== onBack || $[28] !== children_2) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Confirm amount",
      onCancel: onBack,
      color: "warning",
      isCancelActive: false,
      children: children_2,
    });
    $[27] = onBack;
    $[28] = children_2;
    $[29] = dialogElement;
  } else dialogElement = $[29];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1163920-1167866 placement
/**
 * 购买额度流程中的花费上限设置步骤。
 */
function SpendLimitStep(props) {
  let $ = useMemoCache(70);
  let { current: currentLimit, currency, onConfirm, onCancel } = props;
  let { columns } = useTerminalSize();
  let initialAmountText;
  if ($[0] !== currentLimit) {
    initialAmountText = currentLimit !== null ? formatDollarAmount(currentLimit) : "150";
    $[0] = currentLimit;
    $[1] = initialAmountText;
  } else initialAmountText = $[1];
  let amountInputInitial = initialAmountText;
  let { value: amountText, setValue, cursor, setCursor } = useAmountInputBuffer(amountInputInitial);
  let [focusIndex, setFocusIndex] = useState(0);
  let actionIds;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    actionIds = ["set", "unlimited", "cancel"];
    $[2] = actionIds;
  } else actionIds = $[2];
  let actionChoices = actionIds;
  let [selectedActionIndex, setSelectedActionIndex] = useState(0);
  let [isConfirming, setIsConfirming] = useState(false);
  let contentColumnComponent;
  let dialogComponent;
  let actionLabels;
  let amountError;
  let color;
  let earlyReturnElement;
  let gap;
  let onKeyDown;
  let descriptionElement;
  let amountInputBox;
  let limitPreviewElement;
  let title;
  let onCancel_2;
  if (
    $[3] !== selectedActionIndex ||
    $[4] !== columns ||
    $[5] !== isConfirming ||
    $[6] !== currency ||
    $[7] !== cursor ||
    $[8] !== focusIndex ||
    $[9] !== onCancel ||
    $[10] !== onConfirm ||
    $[11] !== setCursor ||
    $[12] !== setValue ||
    $[13] !== amountText
  ) {
    earlyReturnElement = EARLY_RETURN_SENTINEL;
    Go: {
      let amountInput = parseAmountInput(amountText);
      amountError =
        !amountInput.ok && (amountText.trim() !== "" || focusIndex === 1) ? amountInput.error : "";
      let handleAction = function handleAction() {
        let selectedAction = actionChoices[selectedActionIndex];
        if (selectedAction === "set") {
          if (!amountInput.ok) {
            return;
          }
          if (amountInput.cents > CREDIT_PRESET_AMOUNTS_CENTS) {
            setIsConfirming(true);
            return;
          }
          onConfirm(amountInput.cents);
        } else if (selectedAction === "unlimited") onConfirm(null);
        else onCancel();
      };
      let handleKeyDown = function onKeyDown(event) {
        if (event.key === "tab") {
          event.preventDefault();
          setFocusIndex(toBinaryFlag);
          return;
        }
        if (focusIndex !== 1) {
          return;
        }
        if (event.key === "up") {
          event.preventDefault();
          setFocusIndex(0);
        } else if (event.key === "down") event.preventDefault();
        else if (event.key === "left") {
          event.preventDefault();
          setSelectedActionIndex(decrementClamped);
        } else if (event.key === "right") {
          event.preventDefault();
          setSelectedActionIndex((nextActionIndex) =>
            Math.min(actionChoices.length - 1, nextActionIndex + 1),
          );
        } else if (event.key === "return") {
          event.preventDefault();
          handleAction();
        }
      };
      let actionLabelMap;
      if ($[27] === MEMO_CACHE_SENTINEL) {
        actionLabelMap = {
          set: "Set limit",
          unlimited: "Set to unlimited",
          cancel: "Cancel",
        };
        $[27] = actionLabelMap;
      } else actionLabelMap = $[27];
      actionLabels = actionLabelMap;
      if (isConfirming && amountInput.ok) {
        let onBack;
        if ($[28] === MEMO_CACHE_SENTINEL) {
          onBack = () => setIsConfirming(false);
          $[28] = onBack;
        } else onBack = $[28];
        earlyReturnElement = jsxProd_default(ConfirmQuestion, {
          question: "Set your monthly spend limit to",
          amountCents: amountInput.cents,
          currency,
          onConfirm: () => onConfirm(amountInput.cents),
          onBack,
        });
        break Go;
      }
      dialogComponent = Dialog;
      title = "Set monthly spend limit";
      onCancel_2 = onCancel;
      color = "suggestion";
      contentColumnComponent = FocusColumn;
      gap = 1;
      onKeyDown = handleKeyDown;
      if ($[29] === MEMO_CACHE_SENTINEL) {
        descriptionElement = jsxProd_default(Text, {
          children: "You can set a maximum amount you can spend on usage credits per month.",
        });
        $[29] = descriptionElement;
      } else descriptionElement = $[29];
      const borderColor = focusIndex === 0 ? "suggestion" : "inactive";
      let children;
      if ($[30] !== currency) {
        children = getCurrencySymbol(currency);
        $[30] = currency;
        $[31] = children;
      } else children = $[31];
      let currencySymbolElement;
      if ($[32] !== children) {
        currencySymbolElement = jsxProd_default(Text, {
          children,
        });
        $[32] = children;
        $[33] = currencySymbolElement;
      } else currencySymbolElement = $[33];
      let onSubmit;
      let onHistoryDown;
      if ($[34] === MEMO_CACHE_SENTINEL) {
        onSubmit = () => setFocusIndex(1);
        onHistoryDown = () => setFocusIndex(1);
        $[34] = onSubmit;
        $[35] = onHistoryDown;
      } else {
        onSubmit = $[34];
        onHistoryDown = $[35];
      }
      const focus = focusIndex === 0;
      const showCursor = focusIndex === 0;
      let amountTextInputElement;
      if (
        $[36] !== columns ||
        $[37] !== cursor ||
        $[38] !== setCursor ||
        $[39] !== setValue ||
        $[40] !== focus ||
        $[41] !== showCursor ||
        $[42] !== amountText
      ) {
        amountTextInputElement = jsxProd_default(TextInput, {
          value: amountText,
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
        $[42] = amountText;
        $[43] = amountTextInputElement;
      } else amountTextInputElement = $[43];
      if ($[44] !== borderColor || $[45] !== currencySymbolElement || $[46] !== amountTextInputElement) {
        amountInputBox = jsxProd_default_2(Box, {
          borderStyle: "single",
          borderColor,
          paddingX: 1,
          children: [currencySymbolElement, amountTextInputElement],
        });
        $[44] = borderColor;
        $[45] = currencySymbolElement;
        $[46] = amountTextInputElement;
        $[47] = amountInputBox;
      } else amountInputBox = $[47];
      limitPreviewElement =
        amountInput.ok &&
        jsxProd_default_2(Text, {
          color: "success",
          children: ["Monthly limit: ", formatCurrency(amountInput.cents, currency)],
        });
    }
    $[3] = selectedActionIndex;
    $[4] = columns;
    $[5] = isConfirming;
    $[6] = currency;
    $[7] = cursor;
    $[8] = focusIndex;
    $[9] = onCancel;
    $[10] = onConfirm;
    $[11] = setCursor;
    $[12] = setValue;
    $[13] = amountText;
    $[14] = contentColumnComponent;
    $[15] = dialogComponent;
    $[16] = actionLabels;
    $[17] = amountError;
    $[18] = color;
    $[19] = earlyReturnElement;
    $[20] = gap;
    $[21] = onKeyDown;
    $[22] = descriptionElement;
    $[23] = amountInputBox;
    $[24] = limitPreviewElement;
    $[25] = title;
    $[26] = onCancel_2;
  } else {
    contentColumnComponent = $[14];
    dialogComponent = $[15];
    actionLabels = $[16];
    amountError = $[17];
    color = $[18];
    earlyReturnElement = $[19];
    gap = $[20];
    onKeyDown = $[21];
    descriptionElement = $[22];
    amountInputBox = $[23];
    limitPreviewElement = $[24];
    title = $[25];
    onCancel_2 = $[26];
  }
  if (earlyReturnElement !== EARLY_RETURN_SENTINEL) return earlyReturnElement;
  let amountErrorElement;
  if ($[48] !== amountError) {
    amountErrorElement =
      amountError &&
      jsxProd_default(Text, {
        color: "error",
        children: amountError,
      });
    $[48] = amountError;
    $[49] = amountErrorElement;
  } else amountErrorElement = $[49];
  let immediateNoticeElement;
  if ($[50] === MEMO_CACHE_SENTINEL) {
    immediateNoticeElement = jsxProd_default(Text, {
      dimColor: true,
      children: "This spend limit goes into effect immediately.",
    });
    $[50] = immediateNoticeElement;
  } else immediateNoticeElement = $[50];
  let actionButtonsRow;
  if ($[51] !== selectedActionIndex || $[52] !== actionLabels || $[53] !== focusIndex) {
    actionButtonsRow = jsxProd_default(Box, {
      flexDirection: "row",
      gap: 2,
      children: actionChoices.map((actionId, actionIndex) =>
        jsxProd_default_2(
          Text,
          {
            color: focusIndex === 1 && selectedActionIndex === actionIndex ? "suggestion" : undefined,
            children: [
              focusIndex === 1 && selectedActionIndex === actionIndex ? figures_default.pointer : " ",
              " ",
              actionLabels[actionId],
            ],
          },
          actionId,
        ),
      ),
    });
    $[51] = selectedActionIndex;
    $[52] = actionLabels;
    $[53] = focusIndex;
    $[54] = actionButtonsRow;
  } else actionButtonsRow = $[54];
  let children;
  if (
    $[55] !== contentColumnComponent ||
    $[56] !== amountErrorElement ||
    $[57] !== actionButtonsRow ||
    $[58] !== gap ||
    $[59] !== onKeyDown ||
    $[60] !== descriptionElement ||
    $[61] !== amountInputBox ||
    $[62] !== limitPreviewElement
  ) {
    children = jsxProd_default_2(contentColumnComponent, {
      gap,
      onKeyDown,
      children: [
        descriptionElement,
        amountInputBox,
        limitPreviewElement,
        amountErrorElement,
        immediateNoticeElement,
        actionButtonsRow,
      ],
    });
    $[55] = contentColumnComponent;
    $[56] = amountErrorElement;
    $[57] = actionButtonsRow;
    $[58] = gap;
    $[59] = onKeyDown;
    $[60] = descriptionElement;
    $[61] = amountInputBox;
    $[62] = limitPreviewElement;
    $[63] = children;
  } else children = $[63];
  let dialogElement;
  if (
    $[64] !== dialogComponent ||
    $[65] !== color ||
    $[66] !== children ||
    $[67] !== title ||
    $[68] !== onCancel_2
  ) {
    dialogElement = jsxProd_default(dialogComponent, {
      title,
      onCancel: onCancel_2,
      color,
      children,
    });
    $[64] = dialogComponent;
    $[65] = color;
    $[66] = children;
    $[67] = title;
    $[68] = onCancel_2;
    $[69] = dialogElement;
  } else dialogElement = $[69];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1167866-1175272 placement
/**
 * 购买额度流程中的自动充值设置步骤。
 */
function AutoReloadStep(props) {
  let $ = useMemoCache(134);
  let { current: currentSettings, pm, currency, onSave, onTurnOff, onCancel } = props;
  let { columns } = useTerminalSize();
  let isEnabled = currentSettings?.enabled === true;
  let thresholdText;
  if ($[0] !== currentSettings) {
    thresholdText =
      currentSettings?.threshold_in_minor_units != null
        ? formatDollarAmount(currentSettings.threshold_in_minor_units)
        : "5";
    $[0] = currentSettings;
    $[1] = thresholdText;
  } else thresholdText = $[1];
  let initialThresholdText = thresholdText;
  let reloadToText;
  if ($[2] !== currentSettings) {
    reloadToText =
      currentSettings?.reload_to_in_minor_units != null
        ? formatDollarAmount(currentSettings.reload_to_in_minor_units)
        : "15";
    $[2] = currentSettings;
    $[3] = reloadToText;
  } else reloadToText = $[3];
  let initialReloadToText = reloadToText;
  let { value: thresholdValue, setValue, cursor, setCursor } = useAmountInputBuffer(initialThresholdText);
  let {
    value: reloadToValue,
    setValue: setValue_2,
    cursor: cursor_2,
    setCursor: setCursor_2,
  } = useAmountInputBuffer(initialReloadToText);
  let [focusIndex, setFocusIndex] = useState(0);
  let actionIds;
  if ($[4] !== isEnabled) {
    actionIds = isEnabled ? ["save", "off", "cancel"] : ["save", "cancel"];
    $[4] = isEnabled;
    $[5] = actionIds;
  } else actionIds = $[5];
  let actionChoices = actionIds;
  let [selectedActionIndex, setSelectedActionIndex] = useState(0);
  let [isConfirming, setIsConfirming] = useState(false);
  let contentColumnComponent;
  let dialogComponent;
  let actionLabelMap;
  let thresholdError;
  let reloadToInput;
  let thresholdInput;
  let summaryElement;
  let title;
  let onCancel_2;
  let color;
  let earlyReturnElement;
  let gap;
  let onKeyDown;
  let descriptionElement;
  let cardOnFileElement;
  let thresholdSectionElement;
  let reloadToSectionElement;
  if (
    $[6] !== selectedActionIndex ||
    $[7] !== actionChoices ||
    $[8] !== columns ||
    $[9] !== isConfirming ||
    $[10] !== currency ||
    $[11] !== cursor ||
    $[12] !== cursor_2 ||
    $[13] !== focusIndex ||
    $[14] !== isEnabled ||
    $[15] !== onCancel ||
    $[16] !== onSave ||
    $[17] !== onTurnOff ||
    $[18] !== pm ||
    $[19] !== reloadToValue ||
    $[20] !== setCursor ||
    $[21] !== setCursor_2 ||
    $[22] !== setValue_2 ||
    $[23] !== setValue ||
    $[24] !== thresholdValue
  ) {
    earlyReturnElement = EARLY_RETURN_SENTINEL;
    ur: {
      thresholdInput = parseAmountInput(thresholdValue);
      reloadToInput = parseAmountInput(reloadToValue);
      thresholdError = !thresholdInput.ok
        ? thresholdInput.error
        : !reloadToInput.ok
          ? reloadToInput.error
          : reloadToInput.cents <= thresholdInput.cents
            ? "Reload-to must be above threshold"
            : currency === "USD" && reloadToInput.cents - thresholdInput.cents < CREDIT_AMOUNT_STEP_CENTS
              ? `Reload must be at least ${formatCurrency(CREDIT_AMOUNT_STEP_CENTS, currency, "whole")} above threshold`
              : "";
      let isValidReload = !thresholdError;
      let error =
        !thresholdInput.ok && (thresholdValue.trim() !== "" || focusIndex !== 0) ? thresholdInput.error : "";
      let error_2 =
        !reloadToInput.ok && (reloadToValue.trim() !== "" || focusIndex === 2) ? reloadToInput.error : "";
      let handleAction = function handleActionSelection() {
        let actionId = actionChoices[selectedActionIndex];
        if (actionId === "save") {
          if (!thresholdInput.ok || !reloadToInput.ok || !isValidReload) {
            return;
          }
          setIsConfirming(true);
          return;
        } else if (actionId === "off") onTurnOff();
        else onCancel();
      };
      let goToPreviousSection;
      if ($[42] === MEMO_CACHE_SENTINEL) {
        goToPreviousSection = () => setFocusIndex(decrementOrZero);
        $[42] = goToPreviousSection;
      } else goToPreviousSection = $[42];
      let previousSectionCallback = goToPreviousSection;
      let goToNextSection;
      if ($[43] === MEMO_CACHE_SENTINEL) {
        goToNextSection = () => setFocusIndex(incrementCappedAtTwo);
        $[43] = goToNextSection;
      } else goToNextSection = $[43];
      let nextSectionCallback = goToNextSection;
      let handleKeyDown;
      if ($[44] !== handleAction || $[45] !== actionChoices.length || $[46] !== focusIndex) {
        handleKeyDown = function handleKeyDownImpl(event) {
          if (event.key === "tab") {
            event.preventDefault();
            if (event.shift) previousSectionCallback();
            else nextSectionCallback();
            return;
          }
          if (focusIndex !== 2) {
            return;
          }
          if (event.key === "up") {
            event.preventDefault();
            previousSectionCallback();
          } else if (event.key === "down") event.preventDefault();
          else if (event.key === "left") {
            event.preventDefault();
            setSelectedActionIndex(decrementClampedLower);
          } else if (event.key === "right") {
            event.preventDefault();
            setSelectedActionIndex((nextActionIndex) =>
              Math.min(actionChoices.length - 1, nextActionIndex + 1),
            );
          } else if (event.key === "return") {
            event.preventDefault();
            handleAction();
          }
        };
        $[44] = handleAction;
        $[45] = actionChoices.length;
        $[46] = focusIndex;
        $[47] = handleKeyDown;
      } else handleKeyDown = $[47];
      let keyDownHandler = handleKeyDown;
      let save = isEnabled ? "Agree and save" : "Agree and turn on";
      let actionLabelMap_2;
      if ($[48] !== save) {
        actionLabelMap_2 = {
          save,
          off: "Turn off",
          cancel: "Cancel",
        };
        $[48] = save;
        $[49] = actionLabelMap_2;
      } else actionLabelMap_2 = $[49];
      actionLabelMap = actionLabelMap_2;
      if (isConfirming && thresholdInput.ok && reloadToInput.ok) {
        let onBack;
        if ($[50] === MEMO_CACHE_SENTINEL) {
          onBack = () => setIsConfirming(false);
          $[50] = onBack;
        } else onBack = $[50];
        earlyReturnElement = jsxProd_default(ConfirmQuestion, {
          question: "Auto-reload will top your balance up to",
          amountCents: reloadToInput.cents,
          currency,
          onConfirm: () => onSave(thresholdInput.cents, reloadToInput.cents),
          onBack,
        });
        break ur;
      }
      dialogComponent = Dialog;
      title = "Auto-reload";
      onCancel_2 = onCancel;
      color = "suggestion";
      contentColumnComponent = FocusColumn;
      gap = 1;
      onKeyDown = keyDownHandler;
      let currentStatusElement;
      if ($[51] !== isEnabled) {
        currentStatusElement =
          isEnabled &&
          jsxProd_default(Text, {
            color: "success",
            children: " \xB7 Currently on",
          });
        $[51] = isEnabled;
        $[52] = currentStatusElement;
      } else currentStatusElement = $[52];
      if ($[53] !== currentStatusElement) {
        descriptionElement = jsxProd_default_2(Text, {
          children: ["Automatically buy more usage credits when your balance is low.", currentStatusElement],
        });
        $[53] = currentStatusElement;
        $[54] = descriptionElement;
      } else descriptionElement = $[54];
      let cardOnFileText;
      if ($[55] !== pm) {
        cardOnFileText = formatCardOnFile(pm);
        $[55] = pm;
        $[56] = cardOnFileText;
      } else cardOnFileText = $[56];
      if ($[57] !== cardOnFileText) {
        cardOnFileElement = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["Card on file: ", cardOnFileText],
        });
        $[57] = cardOnFileText;
        $[58] = cardOnFileElement;
      } else cardOnFileElement = $[58];
      let thresholdPromptElement;
      if ($[59] === MEMO_CACHE_SENTINEL) {
        thresholdPromptElement = jsxProd_default(Text, {
          dimColor: true,
          children: "When usage credit balance falls below:",
        });
        $[59] = thresholdPromptElement;
      } else thresholdPromptElement = $[59];
      const borderColor = error ? "error" : focusIndex === 0 ? "suggestion" : "inactive";
      let children;
      if ($[60] !== currency) {
        children = getCurrencySymbol(currency);
        $[60] = currency;
        $[61] = children;
      } else children = $[61];
      let thresholdCurrencyElement;
      if ($[62] !== children) {
        thresholdCurrencyElement = jsxProd_default(Text, {
          children,
        });
        $[62] = children;
        $[63] = thresholdCurrencyElement;
      } else thresholdCurrencyElement = $[63];
      let onSubmit;
      let onHistoryDown;
      if ($[64] === MEMO_CACHE_SENTINEL) {
        onSubmit = () => setFocusIndex(1);
        onHistoryDown = () => setFocusIndex(1);
        $[64] = onSubmit;
        $[65] = onHistoryDown;
      } else {
        onSubmit = $[64];
        onHistoryDown = $[65];
      }
      const focus = focusIndex === 0;
      const showCursor = focusIndex === 0;
      let thresholdTextInputElement;
      if (
        $[66] !== columns ||
        $[67] !== cursor ||
        $[68] !== setCursor ||
        $[69] !== setValue ||
        $[70] !== focus ||
        $[71] !== showCursor ||
        $[72] !== thresholdValue
      ) {
        thresholdTextInputElement = jsxProd_default(TextInput, {
          value: thresholdValue,
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
        $[72] = thresholdValue;
        $[73] = thresholdTextInputElement;
      } else thresholdTextInputElement = $[73];
      let thresholdInputBox;
      if (
        $[74] !== borderColor ||
        $[75] !== thresholdCurrencyElement ||
        $[76] !== thresholdTextInputElement
      ) {
        thresholdInputBox = jsxProd_default_2(Box, {
          borderStyle: "single",
          borderColor,
          paddingX: 1,
          children: [thresholdCurrencyElement, thresholdTextInputElement],
        });
        $[74] = borderColor;
        $[75] = thresholdCurrencyElement;
        $[76] = thresholdTextInputElement;
        $[77] = thresholdInputBox;
      } else thresholdInputBox = $[77];
      thresholdSectionElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          thresholdPromptElement,
          thresholdInputBox,
          error &&
            jsxProd_default(Text, {
              color: "error",
              children: error,
            }),
        ],
      });
      let reloadPromptElement;
      if ($[78] === MEMO_CACHE_SENTINEL) {
        reloadPromptElement = jsxProd_default(Text, {
          dimColor: true,
          children: "Reload balance to:",
        });
        $[78] = reloadPromptElement;
      } else reloadPromptElement = $[78];
      const borderColor_2 = error_2 ? "error" : focusIndex === 1 ? "suggestion" : "inactive";
      let children_2;
      if ($[79] !== currency) {
        children_2 = getCurrencySymbol(currency);
        $[79] = currency;
        $[80] = children_2;
      } else children_2 = $[80];
      let reloadCurrencyElement;
      if ($[81] !== children_2) {
        reloadCurrencyElement = jsxProd_default(Text, {
          children: children_2,
        });
        $[81] = children_2;
        $[82] = reloadCurrencyElement;
      } else reloadCurrencyElement = $[82];
      let onSubmit_2;
      let onHistoryUp;
      let onHistoryDown_2;
      if ($[83] === MEMO_CACHE_SENTINEL) {
        onSubmit_2 = () => setFocusIndex(2);
        onHistoryUp = () => setFocusIndex(0);
        onHistoryDown_2 = () => setFocusIndex(2);
        $[83] = onSubmit_2;
        $[84] = onHistoryUp;
        $[85] = onHistoryDown_2;
      } else {
        onSubmit_2 = $[83];
        onHistoryUp = $[84];
        onHistoryDown_2 = $[85];
      }
      const focus_2 = focusIndex === 1;
      const showCursor_2 = focusIndex === 1;
      let reloadTextInputElement;
      if (
        $[86] !== columns ||
        $[87] !== cursor_2 ||
        $[88] !== reloadToValue ||
        $[89] !== setCursor_2 ||
        $[90] !== setValue_2 ||
        $[91] !== focus_2 ||
        $[92] !== showCursor_2
      ) {
        reloadTextInputElement = jsxProd_default(TextInput, {
          value: reloadToValue,
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
        $[88] = reloadToValue;
        $[89] = setCursor_2;
        $[90] = setValue_2;
        $[91] = focus_2;
        $[92] = showCursor_2;
        $[93] = reloadTextInputElement;
      } else reloadTextInputElement = $[93];
      let reloadInputBox;
      if ($[94] !== borderColor_2 || $[95] !== reloadCurrencyElement || $[96] !== reloadTextInputElement) {
        reloadInputBox = jsxProd_default_2(Box, {
          borderStyle: "single",
          borderColor: borderColor_2,
          paddingX: 1,
          children: [reloadCurrencyElement, reloadTextInputElement],
        });
        $[94] = borderColor_2;
        $[95] = reloadCurrencyElement;
        $[96] = reloadTextInputElement;
        $[97] = reloadInputBox;
      } else reloadInputBox = $[97];
      reloadToSectionElement = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          reloadPromptElement,
          reloadInputBox,
          error_2 &&
            jsxProd_default(Text, {
              color: "error",
              children: error_2,
            }),
        ],
      });
      summaryElement =
        thresholdInput.ok &&
        reloadToInput.ok &&
        isValidReload &&
        jsxProd_default_2(Text, {
          color: "success",
          children: [
            "Tops up to ",
            formatCurrency(reloadToInput.cents, currency),
            " when your balance falls below",
            " ",
            formatCurrency(thresholdInput.cents, currency),
          ],
        });
    }
    $[6] = selectedActionIndex;
    $[7] = actionChoices;
    $[8] = columns;
    $[9] = isConfirming;
    $[10] = currency;
    $[11] = cursor;
    $[12] = cursor_2;
    $[13] = focusIndex;
    $[14] = isEnabled;
    $[15] = onCancel;
    $[16] = onSave;
    $[17] = onTurnOff;
    $[18] = pm;
    $[19] = reloadToValue;
    $[20] = setCursor;
    $[21] = setCursor_2;
    $[22] = setValue_2;
    $[23] = setValue;
    $[24] = thresholdValue;
    $[25] = contentColumnComponent;
    $[26] = dialogComponent;
    $[27] = actionLabelMap;
    $[28] = thresholdError;
    $[29] = reloadToInput;
    $[30] = thresholdInput;
    $[31] = summaryElement;
    $[32] = title;
    $[33] = onCancel_2;
    $[34] = color;
    $[35] = earlyReturnElement;
    $[36] = gap;
    $[37] = onKeyDown;
    $[38] = descriptionElement;
    $[39] = cardOnFileElement;
    $[40] = thresholdSectionElement;
    $[41] = reloadToSectionElement;
  } else {
    contentColumnComponent = $[25];
    dialogComponent = $[26];
    actionLabelMap = $[27];
    thresholdError = $[28];
    reloadToInput = $[29];
    thresholdInput = $[30];
    summaryElement = $[31];
    title = $[32];
    onCancel_2 = $[33];
    color = $[34];
    earlyReturnElement = $[35];
    gap = $[36];
    onKeyDown = $[37];
    descriptionElement = $[38];
    cardOnFileElement = $[39];
    thresholdSectionElement = $[40];
    reloadToSectionElement = $[41];
  }
  if (earlyReturnElement !== EARLY_RETURN_SENTINEL) return earlyReturnElement;
  let consentCardText;
  if ($[98] !== pm) {
    consentCardText = formatCardOnFile(pm);
    $[98] = pm;
    $[99] = consentCardText;
  } else consentCardText = $[99];
  let consentElement;
  if ($[100] !== consentCardText) {
    consentElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "By selecting Agree, you authorize Anthropic to automatically charge",
        " ",
        consentCardText,
        " on a recurring basis whenever your balance reaches the threshold, per the Consumer Terms (",
        CONSUMER_TERMS_URL,
        "). Turn off any time here or at ",
        USAGE_SETTINGS_LINK,
        ".",
      ],
    });
    $[100] = consentCardText;
    $[101] = consentElement;
  } else consentElement = $[101];
  let actionButtonsRow;
  if (
    $[102] !== selectedActionIndex ||
    $[103] !== actionLabelMap ||
    $[104] !== actionChoices ||
    $[105] !== focusIndex
  ) {
    actionButtonsRow = actionChoices.map((actionId, actionIndex) =>
      jsxProd_default_2(
        Text,
        {
          color: focusIndex === 2 && selectedActionIndex === actionIndex ? "suggestion" : undefined,
          children: [
            focusIndex === 2 && selectedActionIndex === actionIndex ? figures_default.pointer : " ",
            " ",
            actionLabelMap[actionId],
          ],
        },
        actionId,
      ),
    );
    $[102] = selectedActionIndex;
    $[103] = actionLabelMap;
    $[104] = actionChoices;
    $[105] = focusIndex;
    $[106] = actionButtonsRow;
  } else actionButtonsRow = $[106];
  let actionErrorElement;
  if (
    $[107] !== selectedActionIndex ||
    $[108] !== actionChoices ||
    $[109] !== thresholdError ||
    $[110] !== focusIndex ||
    $[111] !== reloadToInput ||
    $[112] !== thresholdInput
  ) {
    actionErrorElement =
      thresholdError &&
      thresholdInput.ok &&
      reloadToInput.ok &&
      focusIndex === 2 &&
      actionChoices[selectedActionIndex] === "save" &&
      jsxProd_default_2(Text, {
        color: "error",
        children: ["\xB7 ", thresholdError],
      });
    $[107] = selectedActionIndex;
    $[108] = actionChoices;
    $[109] = thresholdError;
    $[110] = focusIndex;
    $[111] = reloadToInput;
    $[112] = thresholdInput;
    $[113] = actionErrorElement;
  } else actionErrorElement = $[113];
  let actionsRowBox;
  if ($[114] !== actionButtonsRow || $[115] !== actionErrorElement) {
    actionsRowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      children: [actionButtonsRow, actionErrorElement],
    });
    $[114] = actionButtonsRow;
    $[115] = actionErrorElement;
    $[116] = actionsRowBox;
  } else actionsRowBox = $[116];
  let children;
  if (
    $[117] !== contentColumnComponent ||
    $[118] !== summaryElement ||
    $[119] !== consentElement ||
    $[120] !== actionsRowBox ||
    $[121] !== gap ||
    $[122] !== onKeyDown ||
    $[123] !== descriptionElement ||
    $[124] !== cardOnFileElement ||
    $[125] !== thresholdSectionElement ||
    $[126] !== reloadToSectionElement
  ) {
    children = jsxProd_default_2(contentColumnComponent, {
      gap,
      onKeyDown,
      children: [
        descriptionElement,
        cardOnFileElement,
        thresholdSectionElement,
        reloadToSectionElement,
        summaryElement,
        consentElement,
        actionsRowBox,
      ],
    });
    $[117] = contentColumnComponent;
    $[118] = summaryElement;
    $[119] = consentElement;
    $[120] = actionsRowBox;
    $[121] = gap;
    $[122] = onKeyDown;
    $[123] = descriptionElement;
    $[124] = cardOnFileElement;
    $[125] = thresholdSectionElement;
    $[126] = reloadToSectionElement;
    $[127] = children;
  } else children = $[127];
  let dialogElement;
  if (
    $[128] !== dialogComponent ||
    $[129] !== title ||
    $[130] !== onCancel_2 ||
    $[131] !== color ||
    $[132] !== children
  ) {
    dialogElement = jsxProd_default(dialogComponent, {
      title,
      onCancel: onCancel_2,
      color,
      children,
    });
    $[128] = dialogComponent;
    $[129] = title;
    $[130] = onCancel_2;
    $[131] = color;
    $[132] = children;
    $[133] = dialogElement;
  } else dialogElement = $[133];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1175272-1177637 placement
function AmountEntry(props) {
  let $ = useMemoCache(52);
  let { title, subtitle, initial, minCents, currency, preview, footer, onSubmit, onCancel } = props;
  let { columns } = useTerminalSize();
  let { value: amountText, setValue, cursor, setCursor } = useAmountInputBuffer(initial);
  let [hasEdited, setHasEdited] = useState(false);
  let parsedAmount;
  if ($[0] !== amountText) {
    parsedAmount = parseAmountInput(amountText);
    $[0] = amountText;
    $[1] = parsedAmount;
  } else parsedAmount = $[1];
  let amountParse = parsedAmount;
  let isBelowMinimum = amountParse.ok && minCents !== undefined && amountParse.cents < minCents;
  let amountError;
  if (
    $[2] !== hasEdited ||
    $[3] !== isBelowMinimum ||
    $[4] !== currency ||
    $[5] !== minCents ||
    $[6] !== amountParse.error ||
    $[7] !== amountParse.ok ||
    $[8] !== amountText
  ) {
    amountError =
      !amountParse.ok && (amountText.trim() !== "" || hasEdited)
        ? amountParse.error
        : isBelowMinimum && minCents !== undefined
          ? `Minimum is ${formatCurrency(minCents, currency, "whole")}`
          : "";
    $[2] = hasEdited;
    $[3] = isBelowMinimum;
    $[4] = currency;
    $[5] = minCents;
    $[6] = amountParse.error;
    $[7] = amountParse.ok;
    $[8] = amountText;
    $[9] = amountError;
  } else amountError = $[9];
  let errorMessage = amountError;
  let handleSubmit;
  if (
    $[10] !== isBelowMinimum ||
    $[11] !== onSubmit ||
    $[12] !== amountParse.cents ||
    $[13] !== amountParse.ok
  ) {
    handleSubmit = function submitAmount() {
      if (!amountParse.ok || isBelowMinimum) {
        setHasEdited(true);
        return;
      }
      onSubmit(amountParse.cents);
    };
    $[10] = isBelowMinimum;
    $[11] = onSubmit;
    $[12] = amountParse.cents;
    $[13] = amountParse.ok;
    $[14] = handleSubmit;
  } else handleSubmit = $[14];
  let onSubmit_2 = handleSubmit;
  let subtitleElement;
  if ($[15] !== subtitle) {
    subtitleElement = jsxProd_default(Text, {
      dimColor: true,
      children: subtitle,
    });
    $[15] = subtitle;
    $[16] = subtitleElement;
  } else subtitleElement = $[16];
  let children;
  if ($[17] !== currency) {
    children = getCurrencySymbol(currency);
    $[17] = currency;
    $[18] = children;
  } else children = $[18];
  let currencySymbolElement;
  if ($[19] !== children) {
    currencySymbolElement = jsxProd_default(Text, {
      children,
    });
    $[19] = children;
    $[20] = currencySymbolElement;
  } else currencySymbolElement = $[20];
  let amountTextInputElement;
  if (
    $[21] !== columns ||
    $[22] !== cursor ||
    $[23] !== onCancel ||
    $[24] !== setCursor ||
    $[25] !== setValue ||
    $[26] !== onSubmit_2 ||
    $[27] !== amountText
  ) {
    amountTextInputElement = jsxProd_default(TextInput, {
      value: amountText,
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
    $[27] = amountText;
    $[28] = amountTextInputElement;
  } else amountTextInputElement = $[28];
  let amountRowBox;
  if ($[29] !== currencySymbolElement || $[30] !== amountTextInputElement) {
    amountRowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [currencySymbolElement, amountTextInputElement],
    });
    $[29] = currencySymbolElement;
    $[30] = amountTextInputElement;
    $[31] = amountRowBox;
  } else amountRowBox = $[31];
  let footerElement;
  if ($[32] !== footer) {
    footerElement =
      footer &&
      jsxProd_default(Text, {
        dimColor: true,
        children: footer,
      });
    $[32] = footer;
    $[33] = footerElement;
  } else footerElement = $[33];
  let previewElement;
  if (
    $[34] !== isBelowMinimum ||
    $[35] !== currency ||
    $[36] !== amountParse.cents ||
    $[37] !== amountParse.ok ||
    $[38] !== preview
  ) {
    previewElement =
      amountParse.ok &&
      !isBelowMinimum &&
      jsxProd_default(Text, {
        color: "success",
        children:
          preview?.(amountParse.cents) ??
          `Buys ${formatCurrency(amountParse.cents, currency)} of usage credits`,
      });
    $[34] = isBelowMinimum;
    $[35] = currency;
    $[36] = amountParse.cents;
    $[37] = amountParse.ok;
    $[38] = preview;
    $[39] = previewElement;
  } else previewElement = $[39];
  let errorElement;
  if ($[40] !== errorMessage) {
    errorElement =
      errorMessage &&
      jsxProd_default(Text, {
        color: "error",
        children: errorMessage,
      });
    $[40] = errorMessage;
    $[41] = errorElement;
  } else errorElement = $[41];
  let children_2;
  if (
    $[42] !== previewElement ||
    $[43] !== errorElement ||
    $[44] !== subtitleElement ||
    $[45] !== amountRowBox ||
    $[46] !== footerElement
  ) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [subtitleElement, amountRowBox, footerElement, previewElement, errorElement],
    });
    $[42] = previewElement;
    $[43] = errorElement;
    $[44] = subtitleElement;
    $[45] = amountRowBox;
    $[46] = footerElement;
    $[47] = children_2;
  } else children_2 = $[47];
  let dialogElement;
  if ($[48] !== onCancel || $[49] !== children_2 || $[50] !== title) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      onCancel,
      color: "suggestion",
      children: children_2,
    });
    $[48] = onCancel;
    $[49] = children_2;
    $[50] = title;
    $[51] = dialogElement;
  } else dialogElement = $[51];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1177637-1178928 placement
function PurchasePoller(props) {
  let $ = useMemoCache(11);
  let { purchaseId, onSuccess, onError } = props;
  let { credentials } = useTheme_2();
  let pollCountRef = useRef(0);
  let onSuccessRef = useEffectEvent(onSuccess);
  let onErrorRef = useEffectEvent(onError);
  let clock = useClock();
  let pollEffect;
  if (
    $[0] !== clock ||
    $[1] !== credentials ||
    $[2] !== purchaseId ||
    $[3] !== onErrorRef ||
    $[4] !== onSuccessRef
  ) {
    pollEffect = () => {
      let isStopped = false;
      let timerId;
      let logPollStatus = function logPollStatus(status) {
        logEvent("tengu_extra_usage_inline_dialog_buy_result", {
          status: fromEnum(status),
        });
      };
      async function pollOnce() {
        if (isStopped) {
          return;
        }
        pollCountRef.current = pollCountRef.current + 1;
        if (pollCountRef.current > CREDIT_MAX_POLL_COUNT) {
          isStopped = true;
          onErrorRef(`Purchase timed out \u2014 check ${USAGE_SETTINGS_LINK}`);
          return;
        }
        try {
          let prepaidPurchaseStatus = await fetchPrepaidPurchaseStatus(purchaseId, credentials);
          if (isStopped) {
            return;
          }
          if (prepaidPurchaseStatus.status === "paid") {
            isStopped = true;
            logPollStatus("success");
            onSuccessRef();
          } else if (prepaidPurchaseStatus.status === "failed") {
            isStopped = true;
            logPollStatus("failed");
            onErrorRef("Payment failed");
          } else if (prepaidPurchaseStatus.status === "action_needed") {
            isStopped = true;
            logPollStatus("3ds_fallback");
            onErrorRef(
              `Your card requires additional verification \u2014 this purchase was not completed. Try again at ${USAGE_SETTINGS_LINK}`,
            );
          } else timerId = clock.setTimeout(pollOnce, CREDIT_POLL_INTERVAL_MS);
        } catch (error) {
          let caughtError = error;
          if (isStopped) {
            return;
          }
          isStopped = true;
          if (isExpectedApiError(caughtError))
            logForDebugging(`Purchase status poll failed: ${errorMessage(caughtError)}`, {
              level: "error",
            });
          else logError(caughtError);
          onErrorRef("Failed to check purchase status");
        }
      }
      pollOnce();
      return () => {
        isStopped = true;
        timerId?.();
      };
    };
    $[0] = clock;
    $[1] = credentials;
    $[2] = purchaseId;
    $[3] = onErrorRef;
    $[4] = onSuccessRef;
    $[5] = pollEffect;
  } else pollEffect = $[5];
  let effectDeps;
  if ($[6] !== clock || $[7] !== credentials || $[8] !== purchaseId) {
    effectDeps = [clock, purchaseId, credentials];
    $[6] = clock;
    $[7] = credentials;
    $[8] = purchaseId;
    $[9] = effectDeps;
  } else effectDeps = $[9];
  useEffect(pollEffect, effectDeps);
  let loadingElement;
  if ($[10] === MEMO_CACHE_SENTINEL) {
    loadingElement = jsxProd_default(ClawdLoadingRow, {
      message: "Confirming payment\u2026 (may take a few seconds)",
    });
    $[10] = loadingElement;
  } else loadingElement = $[10];
  return loadingElement;
}
//@ chunk-18hwfzwa.js:1178928-1179193 placement
/**
 * 渲染带动画 Clawd 的加载行与提示信息。
 */
function ClawdLoadingRow(props) {
  let $ = useMemoCache(3);
  let { message } = props;
  let clawdElement;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    clawdElement = jsxProd_default(AnimatedClawd, {
      autoplay: true,
    });
    $[0] = clawdElement;
  } else clawdElement = $[0];
  let rowBox;
  if ($[1] !== message) {
    rowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 2,
      children: [
        clawdElement,
        jsxProd_default(Text, {
          dimColor: true,
          children: message,
        }),
      ],
    });
    $[1] = message;
    $[2] = rowBox;
  } else rowBox = $[2];
  return rowBox;
}
//@ chunk-18hwfzwa.js:1179193-1179628 placement
/**
 * 购买成功时显示 Clawd 庆祝动画与成功文案，动画结束后回调。
 */
function ClawdSuccessRow(props) {
  let $ = useMemoCache(7);
  let { message, onDone } = props;
  let clawdElement;
  if ($[0] !== onDone) {
    clawdElement = jsxProd_default(AnimatedClawd, {
      sequence: "celebrate",
      reserveCrouchRow: true,
      onComplete: onDone,
    });
    $[0] = onDone;
    $[1] = clawdElement;
  } else clawdElement = $[1];
  let messageBox;
  if ($[2] !== message) {
    messageBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        color: "success",
        children: message,
      }),
    });
    $[2] = message;
    $[3] = messageBox;
  } else messageBox = $[3];
  let rowBox;
  if ($[4] !== clawdElement || $[5] !== messageBox) {
    rowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 1,
      children: [clawdElement, messageBox],
    });
    $[4] = clawdElement;
    $[5] = messageBox;
    $[6] = rowBox;
  } else rowBox = $[6];
  return rowBox;
}
//@ chunk-18hwfzwa.js:1179628-1180592 placement
function CelebrationMessage(props) {
  let $ = useMemoCache(15);
  let { message, work, onDone, failure } = props;
  let resultRef = useRef(null);
  let animationDoneRef = useRef(false);
  let isUnmountedRef = useRef(false);
  let handleResult;
  if ($[0] !== failure || $[1] !== onDone) {
    handleResult = (resultArg) => {
      let result = resultArg ?? {
        value: failure,
      };
      resultRef.current = result;
      if (animationDoneRef.current && !isUnmountedRef.current) onDone(result.value);
    };
    $[0] = failure;
    $[1] = onDone;
    $[2] = handleResult;
  } else handleResult = $[2];
  let onResultReady = useEffectEvent(handleResult);
  let workEffect;
  if ($[3] !== onResultReady || $[4] !== work) {
    workEffect = () => {
      work
        .then((value) =>
          onResultReady({
            value,
          }),
        )
        .catch((error) => {
          logError(error);
          onResultReady(null);
        });
      return () => {
        isUnmountedRef.current = true;
      };
    };
    $[3] = onResultReady;
    $[4] = work;
    $[5] = workEffect;
  } else workEffect = $[5];
  let effectDeps;
  if ($[6] !== work) {
    effectDeps = [work];
    $[6] = work;
    $[7] = effectDeps;
  } else effectDeps = $[7];
  useEffect(workEffect, effectDeps);
  let celebrationElement;
  if ($[8] !== onDone) {
    celebrationElement = jsxProd_default(AnimatedClawd, {
      sequence: "celebrate",
      reserveCrouchRow: true,
      onComplete: () => {
        animationDoneRef.current = true;
        if (resultRef.current && !isUnmountedRef.current) onDone(resultRef.current.value);
      },
    });
    $[8] = onDone;
    $[9] = celebrationElement;
  } else celebrationElement = $[9];
  let messageBox;
  if ($[10] !== message) {
    messageBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: message,
      }),
    });
    $[10] = message;
    $[11] = messageBox;
  } else messageBox = $[11];
  let rowBox;
  if ($[12] !== celebrationElement || $[13] !== messageBox) {
    rowBox = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 2,
      alignItems: "center",
      paddingTop: 1,
      children: [celebrationElement, messageBox],
    });
    $[12] = celebrationElement;
    $[13] = messageBox;
    $[14] = rowBox;
  } else rowBox = $[14];
  return rowBox;
}
//@ chunk-18hwfzwa.js:1180592-1181129 placement
/**
 * 显示等待提示并等待一个 Promise；完成时以结果调用 onDone，失败记错误并以 failure 值调用；卸载后不再回调。
 */
function AwaitWork(props) {
  let $ = useMemoCache(10);
  let { message, work, onDone, failure } = props;
  let handleResult;
  if ($[0] !== failure || $[1] !== onDone) {
    handleResult = (resultArg) => onDone(resultArg ? resultArg.value : failure);
    $[0] = failure;
    $[1] = onDone;
    $[2] = handleResult;
  } else handleResult = $[2];
  let onResultReady = useEffectEvent(handleResult);
  let workEffect;
  if ($[3] !== onResultReady || $[4] !== work) {
    workEffect = () => {
      let isCancelled = false;
      work
        .then((value) => {
          if (!isCancelled)
            onResultReady({
              value,
            });
        })
        .catch((error) => {
          logError(error);
          if (!isCancelled) onResultReady(null);
        });
      return () => {
        isCancelled = true;
      };
    };
    $[3] = onResultReady;
    $[4] = work;
    $[5] = workEffect;
  } else workEffect = $[5];
  let effectDeps;
  if ($[6] !== work) {
    effectDeps = [work];
    $[6] = work;
    $[7] = effectDeps;
  } else effectDeps = $[7];
  useEffect(workEffect, effectDeps);
  let badgeBox;
  if ($[8] !== message) {
    badgeBox = jsxProd_default(Box, {
      paddingTop: 1,
      children: jsxProd_default(WorkerBadge, {
        message,
      }),
    });
    $[8] = message;
    $[9] = badgeBox;
  } else badgeBox = $[9];
  return badgeBox;
}
//@ chunk-18hwfzwa.js:1181129-1181441 placement
/**
 * 判断购买用量额度流程的当前步骤是否处于忙碌（加载、开通、调整、保存自动充值、购买中、轮询）状态。
 */
function isBusyCreditsStep(stepKind) {
  switch (stepKind) {
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
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1181441", () => {
  init_react_production();
});
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
