/**
 * components/usageCredits/UsageCreditsOverview.tsx
 *
 * 2.1.316 新增。额度概览。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { sanitizeUserText, formatCardOnFile } from "./ExtraUsageDialog.js";
import { formatCurrency } from "../../services/api/referral.js";
import { startOfDay } from "../../utils/formatBriefTimestamp.js";
import { EXTRA_USAGE_SUPPORT_URL } from "../../services/claudeAiLimits.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";
import { readErrorCodeFromAxios } from "../../services/api/verificationRequired.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { promoOfferStrings, fillUsageTemplate } from "../../services/api/usage.js";
import { percentOfBase, discountPercentOfPay, selectBonusPct } from "./creditOffers.js";
import { logCreditOfferShown } from "../../services/usageCreditOffers.js";
import { useEffect } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1146666-1147575 placement
function promoCreditExpiry(balance, startDate) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_bassoon", false)) return null;
  let earliest = null;
  for (let tranche of balance?.promo_tranches ?? []) {
    let remainingAmountMinorUnits = tranche.remaining_amount_minor_units;
    let timestamp = Date.parse(tranche.expires_at ?? "");
    if (
      typeof remainingAmountMinorUnits !== "number" ||
      remainingAmountMinorUnits <= 0 ||
      Number.isNaN(timestamp)
    )
      continue;
    if (timestamp <= startDate.getTime()) continue;
    let currency = sanitizeUserText(tranche.currency ?? "");
    if (!currency) continue;
    if (!earliest || timestamp < earliest.expiresMs) {
      let trancheName = tranche.name ? sanitizeUserText(tranche.name) : "";
      earliest = {
        expiresMs: timestamp,
        amountMinorUnits: remainingAmountMinorUnits,
        currency,
        name: trancheName || null,
      };
    }
  }
  if (!earliest) return null;
  let amountLabel = formatCurrency(earliest.amountMinorUnits, earliest.currency);
  let nameSuffix = earliest.name ? ` \xB7 ${earliest.name}` : "";
  if (earliest.expiresMs - startDate.getTime() < 864000000) {
    let ofDay = startOfDay(startDate, new Date(earliest.expiresMs));
    let daysLabel = ofDay <= 0 ? "today" : ofDay === 1 ? "in 1 day" : `in ${ofDay} days`;
    return {
      text: `${amountLabel} of your balance expires ${daysLabel}${nameSuffix}`,
      urgent: true,
    };
  }
  let date = new Date(earliest.expiresMs);
  let expiryDateLabel = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== startDate.getFullYear() && {
      year: "numeric",
    }),
  });
  return {
    text: `${amountLabel} expires ${expiryDateLabel}${nameSuffix}`,
    urgent: false,
  };
}
//@ chunk-18hwfzwa.js:1147575-1147774 placement
/**
 * 开关开启且月数有效时，返回"用量额度有效期 N 个月"的说明与了解更多链接。
 */
function getCreditsValidityNote(validityMonths) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_satchel_banjo", false)) return null;
  if (validityMonths === null || !Number.isInteger(validityMonths) || validityMonths <= 0) return null;
  return `Usage credits are valid for ${validityMonths} ${validityMonths === 1 ? "month" : "months"}. Learn more: ${EXTRA_USAGE_SUPPORT_URL}`;
}
//@ chunk-18hwfzwa.js:1147774-1151352 placement
/**
 * UsageCreditsOverview：用量额度概览界面。
 */
function UsageCreditsOverview(props) {
  let $ = useMemoCache(61);
  let { step, currency, onAction, onCancel } = props;
  let { columns } = useTerminalSize();
  let width = Math.min(columns - 6, 50);
  let { usage, balance } = step;
  let spentLabel;
  if ($[0] !== currency || $[1] !== usage.used_credits) {
    spentLabel = usage.used_credits !== null ? formatCurrency(usage.used_credits, currency) : "\u2014";
    $[0] = currency;
    $[1] = usage.used_credits;
    $[2] = spentLabel;
  } else spentLabel = $[2];
  let spentText = spentLabel;
  let limitLabel;
  if ($[3] !== currency || $[4] !== usage.monthly_limit) {
    limitLabel =
      usage.monthly_limit !== null ? formatCurrency(usage.monthly_limit, currency, "fit") : "Unlimited";
    $[3] = currency;
    $[4] = usage.monthly_limit;
    $[5] = limitLabel;
  } else limitLabel = $[5];
  let limitText = limitLabel;
  let usedPercent;
  if ($[6] !== usage.utilization) {
    usedPercent = usage.utilization !== null ? Math.round(usage.utilization) : 0;
    $[6] = usage.utilization;
    $[7] = usedPercent;
  } else usedPercent = $[7];
  let usedPercent_ = usedPercent;
  let balanceLabel;
  if ($[8] !== balance || $[9] !== currency) {
    balanceLabel = balance ? formatCurrency(balance.amount, currency) : "\u2014";
    $[8] = balance;
    $[9] = currency;
    $[10] = balanceLabel;
  } else balanceLabel = $[10];
  let balanceText = balanceLabel;
  let autoReloadOn = balance?.auto_reload_settings?.enabled === true;
  let resetDateLabel;
  let expiryNotice;
  if ($[11] !== balance) {
    let date = new Date();
    let date_2 = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    resetDateLabel = date_2.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    expiryNotice = promoCreditExpiry(balance, date);
    $[11] = balance;
    $[12] = resetDateLabel;
    $[13] = expiryNotice;
  } else {
    resetDateLabel = $[12];
    expiryNotice = $[13];
  }
  let expiryNotice_ = expiryNotice;
  let isDisabledUsage = usage.is_enabled === false;
  const label = `${balanceText} balance \xB7 auto-reload ${autoReloadOn ? "on" : "off"}
`;
  let autoReloadOption;
  if ($[14] !== label) {
    autoReloadOption = {
      label,
      value: "auto_reload",
    };
    $[14] = label;
    $[15] = autoReloadOption;
  } else autoReloadOption = $[15];
  let buyOption;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    buyOption = {
      label: "Buy more",
      value: "buy",
    };
    $[16] = buyOption;
  } else buyOption = $[16];
  let continueOptions;
  if ($[17] !== isDisabledUsage) {
    continueOptions = isDisabledUsage
      ? []
      : [
          {
            label: "Continue with usage credits",
            value: "continue",
          },
        ];
    $[17] = isDisabledUsage;
    $[18] = continueOptions;
  } else continueOptions = $[18];
  let adjustOption;
  let manageOption;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    adjustOption = {
      label: "Adjust monthly limit",
      value: "adjust",
    };
    manageOption = {
      label: "Manage on claude.ai",
      value: "manage",
    };
    $[19] = adjustOption;
    $[20] = manageOption;
  } else {
    adjustOption = $[19];
    manageOption = $[20];
  }
  let options;
  if ($[21] !== autoReloadOption || $[22] !== continueOptions) {
    options = [autoReloadOption, buyOption, ...continueOptions, adjustOption, manageOption];
    $[21] = autoReloadOption;
    $[22] = continueOptions;
    $[23] = options;
  } else options = $[23];
  let options_ = options;
  let disabledNoticeElement;
  if ($[24] !== isDisabledUsage || $[25] !== usage.disabled_reason) {
    disabledNoticeElement =
      isDisabledUsage &&
      jsxProd_default(Text, {
        color: "warning",
        children:
          usage.disabled_reason === "out_of_credits"
            ? "Out of usage credits \u2014 buy more below to keep going."
            : "You've hit your monthly limit \u2014 raise it below, or it resets next month.",
      });
    $[24] = isDisabledUsage;
    $[25] = usage.disabled_reason;
    $[26] = disabledNoticeElement;
  } else disabledNoticeElement = $[26];
  let urgentExpiryElement;
  if ($[27] !== expiryNotice_) {
    urgentExpiryElement =
      expiryNotice_ !== null &&
      expiryNotice_.urgent &&
      jsxProd_default(Text, {
        color: "warning",
        children: expiryNotice_.text,
      });
    $[27] = expiryNotice_;
    $[28] = urgentExpiryElement;
  } else urgentExpiryElement = $[28];
  let spentElement;
  if ($[29] !== spentText) {
    spentElement = jsxProd_default_2(Text, {
      children: [spentText, " spent"],
    });
    $[29] = spentText;
    $[30] = spentElement;
  } else spentElement = $[30];
  const ratio = usedPercent_ / 100;
  let progressBar;
  if ($[31] !== ratio || $[32] !== width) {
    progressBar = jsxProd_default(ProgressBar, {
      ratio,
      width,
      fillColor: "rate_limit_fill",
      emptyColor: "rate_limit_empty",
    });
    $[31] = ratio;
    $[32] = width;
    $[33] = progressBar;
  } else progressBar = $[33];
  let percentElement;
  if ($[34] !== usedPercent_) {
    percentElement = jsxProd_default_2(Text, {
      children: [usedPercent_, "% used"],
    });
    $[34] = usedPercent_;
    $[35] = percentElement;
  } else percentElement = $[35];
  let usageRow;
  if ($[36] !== spentElement || $[37] !== progressBar || $[38] !== percentElement) {
    usageRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [spentElement, progressBar, percentElement],
    });
    $[36] = spentElement;
    $[37] = progressBar;
    $[38] = percentElement;
    $[39] = usageRow;
  } else usageRow = $[39];
  let resetElement;
  if ($[40] !== limitText || $[41] !== resetDateLabel) {
    resetElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Resets ", resetDateLabel, " \xB7 ", limitText, " monthly limit"],
    });
    $[40] = limitText;
    $[41] = resetDateLabel;
    $[42] = resetElement;
  } else resetElement = $[42];
  let expiryElement;
  if ($[43] !== expiryNotice_) {
    expiryElement =
      expiryNotice_ !== null &&
      !expiryNotice_.urgent &&
      jsxProd_default(Text, {
        dimColor: true,
        children: expiryNotice_.text,
      });
    $[43] = expiryNotice_;
    $[44] = expiryElement;
  } else expiryElement = $[44];
  let usageBlock;
  if ($[45] !== usageRow || $[46] !== resetElement || $[47] !== expiryElement) {
    usageBlock = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [usageRow, resetElement, expiryElement],
    });
    $[45] = usageRow;
    $[46] = resetElement;
    $[47] = expiryElement;
    $[48] = usageBlock;
  } else usageBlock = $[48];
  let selectorElement;
  if ($[49] !== onAction || $[50] !== onCancel || $[51] !== options_) {
    selectorElement = jsxProd_default(ModelSelector, {
      options: options_,
      onChange: onAction,
      onCancel,
      visibleOptionCount: options_.length,
    });
    $[49] = onAction;
    $[50] = onCancel;
    $[51] = options_;
    $[52] = selectorElement;
  } else selectorElement = $[52];
  let children;
  if (
    $[53] !== disabledNoticeElement ||
    $[54] !== urgentExpiryElement ||
    $[55] !== usageBlock ||
    $[56] !== selectorElement
  ) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [disabledNoticeElement, urgentExpiryElement, usageBlock, selectorElement],
    });
    $[53] = disabledNoticeElement;
    $[54] = urgentExpiryElement;
    $[55] = usageBlock;
    $[56] = selectorElement;
    $[57] = children;
  } else children = $[57];
  let dialogElement;
  if ($[58] !== onCancel || $[59] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Usage credits",
      onCancel,
      color: "suggestion",
      children,
    });
    $[58] = onCancel;
    $[59] = children;
    $[60] = dialogElement;
  } else dialogElement = $[60];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1151352-1151441 placement
function isOfferDriftError(error) {
  let errorCodeFromAxios = readErrorCodeFromAxios(error);
  return errorCodeFromAxios === "discount_price_drift" || errorCodeFromAxios === "bundle_offer_drift";
}
//@ chunk-18hwfzwa.js:1151441-1151553 placement
/**
 * 生成用量额度优惠的遥测字段（类型、实验组、标题百分比）。
 */
function getOfferAnalytics(offer) {
  return offer === null
    ? {}
    : {
        offer_kind: fromEnum(offer.kind),
        offer_arm: sanitizeMarkName(offer.armId),
        offer_headline_pct: offer.headlinePct,
      };
}
//@ chunk-18hwfzwa.js:1151553-1151729 placement
function getOfferDialogHeader(offer) {
  if (offer === null) return null;
  let offerStrings = promoOfferStrings();
  return (
    fillUsageTemplate(
      offer.kind === "pct_off" ? offerStrings.dialogHeaderPctOff : offerStrings.dialogHeaderExtraCredit,
      {
        pct: offer.headlinePct,
        daysLeft: offer.daysLeft,
      },
    ) ?? null
  );
}
//@ chunk-18hwfzwa.js:1151729-1154884 placement
/**
 * 额度包选择器。
 */
function CreditBundlePicker(props) {
  let $ = useMemoCache(54);
  let { pm, presets, offer, customPreviewable, currency, expiryNotice, onConfirm, onCustom, onCancel } =
    props;
  let isExtraCredit = offer?.kind === "extra_credit";
  let options;
  if (
    $[0] !== currency ||
    $[1] !== customPreviewable ||
    $[2] !== isExtraCredit ||
    $[3] !== offer ||
    $[4] !== presets
  ) {
    let toPresetOption;
    if ($[6] !== currency || $[7] !== isExtraCredit) {
      toPresetOption = (preset, presetIndex) => {
        if (isExtraCredit && preset.local_credit_minor_units > preset.local_price_minor_units) {
          let bonusPct = percentOfBase(preset.credit_minor_units, preset.price_minor_units);
          return {
            label: `Pay ${formatCurrency(preset.local_price_minor_units, currency, "fit")} \xB7 Get ${formatCurrency(preset.local_credit_minor_units, currency, "fit")}`,
            description: bonusPct > 0 ? `+${bonusPct}% credit` : undefined,
            value: `p${presetIndex}`,
          };
        }
        let discountPct = discountPercentOfPay(preset.credit_minor_units, preset.price_minor_units);
        return {
          label: formatCurrency(preset.local_credit_minor_units, currency, "fit"),
          description: discountPct > 0 ? `Save ${discountPct}%` : undefined,
          value: `p${presetIndex}`,
        };
      };
      $[6] = currency;
      $[7] = isExtraCredit;
      $[8] = toPresetOption;
    } else toPresetOption = $[8];
    const mapped = presets.map(toPresetOption);
    let description;
    if ($[9] !== customPreviewable || $[10] !== isExtraCredit || $[11] !== offer) {
      description =
        isExtraCredit && offer.customBonusTiers !== null && customPreviewable
          ? `Get ${Math.min(...offer.customBonusTiers.map(selectBonusPct))}% extra credit or more`
          : undefined;
      $[9] = customPreviewable;
      $[10] = isExtraCredit;
      $[11] = offer;
      $[12] = description;
    } else description = $[12];
    let customOption;
    if ($[13] !== description) {
      customOption = {
        label: "Custom amount\u2026",
        description,
        value: "custom",
      };
      $[13] = description;
      $[14] = customOption;
    } else customOption = $[14];
    let cancelOption;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      cancelOption = {
        label: "Cancel",
        value: "cancel",
      };
      $[15] = cancelOption;
    } else cancelOption = $[15];
    options = [...mapped, customOption, cancelOption];
    $[0] = currency;
    $[1] = customPreviewable;
    $[2] = isExtraCredit;
    $[3] = offer;
    $[4] = presets;
    $[5] = options;
  } else options = $[5];
  let options_ = options;
  let headerText;
  if ($[16] !== offer) {
    headerText = getOfferDialogHeader(offer);
    $[16] = offer;
    $[17] = headerText;
  } else headerText = $[17];
  let headerText_ = headerText;
  let logShown;
  let logShownDeps;
  if ($[18] !== headerText_ || $[19] !== offer) {
    logShown = () => {
      if (headerText_ !== null) logCreditOfferShown("cli_purchase_dialog", getOfferAnalytics(offer));
    };
    logShownDeps = [headerText_, offer];
    $[18] = headerText_;
    $[19] = offer;
    $[20] = logShown;
    $[21] = logShownDeps;
  } else {
    logShown = $[20];
    logShownDeps = $[21];
  }
  useEffect(logShown, logShownDeps);
  let defaultPresetIndex;
  if ($[22] !== offer || $[23] !== presets) {
    defaultPresetIndex =
      offer?.defaultBundleId === null || offer === null
        ? -1
        : presets.findIndex((preset) => preset.id === offer.defaultBundleId);
    $[22] = offer;
    $[23] = presets;
    $[24] = defaultPresetIndex;
  } else defaultPresetIndex = $[24];
  let defaultPresetIndex_ = defaultPresetIndex;
  let handleChange;
  if ($[25] !== onCancel || $[26] !== onConfirm || $[27] !== onCustom || $[28] !== presets) {
    handleChange = function handleChange_(value) {
      if (value === "custom") {
        return onCustom();
      }
      if (value === "cancel") {
        return onCancel();
      }
      let presetIndex = Number(value.slice(1));
      onConfirm(presets[presetIndex]);
    };
    $[25] = onCancel;
    $[26] = onConfirm;
    $[27] = onCustom;
    $[28] = presets;
    $[29] = handleChange;
  } else handleChange = $[29];
  let onChange = handleChange;
  let headerElement;
  if ($[30] !== headerText_) {
    headerElement =
      headerText_ !== null &&
      jsxProd_default(Text, {
        color: "success",
        children: headerText_,
      });
    $[30] = headerText_;
    $[31] = headerElement;
  } else headerElement = $[31];
  let cardLabel;
  if ($[32] !== pm) {
    cardLabel = formatCardOnFile(pm);
    $[32] = pm;
    $[33] = cardLabel;
  } else cardLabel = $[33];
  let cardElement;
  if ($[34] !== cardLabel) {
    cardElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Payment: ", cardLabel],
    });
    $[34] = cardLabel;
    $[35] = cardElement;
  } else cardElement = $[35];
  let focusProps;
  if ($[36] !== defaultPresetIndex_) {
    focusProps = defaultPresetIndex_ >= 0 && {
      defaultFocusValue: `p${defaultPresetIndex_}`,
    };
    $[36] = defaultPresetIndex_;
    $[37] = focusProps;
  } else focusProps = $[37];
  let selectorElement;
  if ($[38] !== onChange || $[39] !== onCancel || $[40] !== options_ || $[41] !== focusProps) {
    selectorElement = jsxProd_default(ModelSelector, {
      options: options_,
      ...focusProps,
      onChange,
      onCancel,
      visibleOptionCount: options_.length,
    });
    $[38] = onChange;
    $[39] = onCancel;
    $[40] = options_;
    $[41] = focusProps;
    $[42] = selectorElement;
  } else selectorElement = $[42];
  let chargeNoticeElement;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    chargeNoticeElement = jsxProd_default(Text, {
      dimColor: true,
      children: "By confirming, you allow Anthropic to charge your card in the amount above.",
    });
    $[43] = chargeNoticeElement;
  } else chargeNoticeElement = $[43];
  let expiryElement;
  if ($[44] !== expiryNotice) {
    expiryElement =
      expiryNotice !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        children: expiryNotice,
      });
    $[44] = expiryNotice;
    $[45] = expiryElement;
  } else expiryElement = $[45];
  let children;
  if (
    $[46] !== selectorElement ||
    $[47] !== expiryElement ||
    $[48] !== headerElement ||
    $[49] !== cardElement
  ) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [headerElement, cardElement, selectorElement, chargeNoticeElement, expiryElement],
    });
    $[46] = selectorElement;
    $[47] = expiryElement;
    $[48] = headerElement;
    $[49] = cardElement;
    $[50] = children;
  } else children = $[50];
  let dialogElement;
  if ($[51] !== onCancel || $[52] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Buy usage credits",
      onCancel,
      color: "suggestion",
      children,
    });
    $[51] = onCancel;
    $[52] = children;
    $[53] = dialogElement;
  } else dialogElement = $[53];
  return dialogElement;
}
export {
  getOfferAnalytics,
  isOfferDriftError,
  getCreditsValidityNote,
  UsageCreditsOverview,
  CreditBundlePicker,
};
