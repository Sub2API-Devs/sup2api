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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { P } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1146666-1147575 placement
function promoCreditExpiry(balance, date) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_bassoon", false)) return null;
  let D = null;
  for (let He of balance?.promo_tranches ?? []) {
    let remainingAmountMinorUnits = He.remaining_amount_minor_units;
    let timestamp = Date.parse(He.expires_at ?? "");
    if (
      typeof remainingAmountMinorUnits !== "number" ||
      remainingAmountMinorUnits <= 0 ||
      Number.isNaN(timestamp)
    )
      continue;
    if (timestamp <= date.getTime()) continue;
    let Xe = sanitizeUserText(He.currency ?? "");
    if (!Xe) continue;
    if (!D || timestamp < D.expiresMs) {
      let rt = He.name ? sanitizeUserText(He.name) : "";
      D = {
        expiresMs: timestamp,
        amountMinorUnits: remainingAmountMinorUnits,
        currency: Xe,
        name: rt || null,
      };
    }
  }
  if (!D) return null;
  let L = formatCurrency(D.amountMinorUnits, D.currency);
  let ee = D.name ? ` \xB7 ${D.name}` : "";
  if (D.expiresMs - date.getTime() < 864000000) {
    let ofDay = startOfDay(date, new Date(D.expiresMs));
    let We = ofDay <= 0 ? "today" : ofDay === 1 ? "in 1 day" : `in ${ofDay} days`;
    return {
      text: `${L} of your balance expires ${We}${ee}`,
      urgent: true,
    };
  }
  let date_2 = new Date(D.expiresMs);
  let Be = date_2.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date_2.getFullYear() !== date.getFullYear() && {
      year: "numeric",
    }),
  });
  return {
    text: `${L} expires ${Be}${ee}`,
    urgent: false,
  };
}
//@ chunk-18hwfzwa.js:1147575-1147774 placement
/**
 * 开关开启且月数有效时，返回"用量额度有效期 N 个月"的说明与了解更多链接。
 */
function getCreditsValidityNote(h) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_satchel_banjo", false)) return null;
  if (h === null || !Number.isInteger(h) || h <= 0) return null;
  return `Usage credits are valid for ${h} ${h === 1 ? "month" : "months"}. Learn more: ${EXTRA_USAGE_SUPPORT_URL}`;
}
//@ chunk-18hwfzwa.js:1147774-1151352 placement
/**
 * UsageCreditsOverview：用量额度概览界面。
 */
function UsageCreditsOverview(props) {
  let $ = w(61);
  let { step, currency, onAction, onCancel } = props;
  let { columns } = useTerminalSize();
  let width = Math.min(columns - 6, 50);
  let { usage, balance } = step;
  let ze;
  if ($[0] !== currency || $[1] !== usage.used_credits) {
    ze = usage.used_credits !== null ? formatCurrency(usage.used_credits, currency) : "\u2014";
    $[0] = currency;
    $[1] = usage.used_credits;
    $[2] = ze;
  } else ze = $[2];
  let Xe = ze;
  let rt;
  if ($[3] !== currency || $[4] !== usage.monthly_limit) {
    rt = usage.monthly_limit !== null ? formatCurrency(usage.monthly_limit, currency, "fit") : "Unlimited";
    $[3] = currency;
    $[4] = usage.monthly_limit;
    $[5] = rt;
  } else rt = $[5];
  let kt = rt;
  let At;
  if ($[6] !== usage.utilization) {
    At = usage.utilization !== null ? Math.round(usage.utilization) : 0;
    $[6] = usage.utilization;
    $[7] = At;
  } else At = $[7];
  let It = At;
  let Ot;
  if ($[8] !== balance || $[9] !== currency) {
    Ot = balance ? formatCurrency(balance.amount, currency) : "\u2014";
    $[8] = balance;
    $[9] = currency;
    $[10] = Ot;
  } else Ot = $[10];
  let Et = Ot;
  let Dt = balance?.auto_reload_settings?.enabled === true;
  let Lt;
  let oo;
  if ($[11] !== balance) {
    let date = new Date();
    let date_2 = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    Lt = date_2.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
    oo = promoCreditExpiry(balance, date);
    $[11] = balance;
    $[12] = Lt;
    $[13] = oo;
  } else {
    Lt = $[12];
    oo = $[13];
  }
  let so = oo;
  let po = usage.is_enabled === false;
  const label = `${Et} balance \xB7 auto-reload ${Dt ? "on" : "off"}
`;
  let co;
  if ($[14] !== label) {
    co = {
      label,
      value: "auto_reload",
    };
    $[14] = label;
    $[15] = co;
  } else co = $[15];
  let bo;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    bo = {
      label: "Buy more",
      value: "buy",
    };
    $[16] = bo;
  } else bo = $[16];
  let Ao;
  if ($[17] !== po) {
    Ao = po
      ? []
      : [
          {
            label: "Continue with usage credits",
            value: "continue",
          },
        ];
    $[17] = po;
    $[18] = Ao;
  } else Ao = $[18];
  let Bo;
  let Ro;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    Bo = {
      label: "Adjust monthly limit",
      value: "adjust",
    };
    Ro = {
      label: "Manage on claude.ai",
      value: "manage",
    };
    $[19] = Bo;
    $[20] = Ro;
  } else {
    Bo = $[19];
    Ro = $[20];
  }
  let Ho;
  if ($[21] !== co || $[22] !== Ao) {
    Ho = [co, bo, ...Ao, Bo, Ro];
    $[21] = co;
    $[22] = Ao;
    $[23] = Ho;
  } else Ho = $[23];
  let Io = Ho;
  let Wo;
  if ($[24] !== po || $[25] !== usage.disabled_reason) {
    Wo =
      po &&
      jsxProd_default(Text, {
        color: "warning",
        children:
          usage.disabled_reason === "out_of_credits"
            ? "Out of usage credits \u2014 buy more below to keep going."
            : "You've hit your monthly limit \u2014 raise it below, or it resets next month.",
      });
    $[24] = po;
    $[25] = usage.disabled_reason;
    $[26] = Wo;
  } else Wo = $[26];
  let mn;
  if ($[27] !== so) {
    mn =
      so !== null &&
      so.urgent &&
      jsxProd_default(Text, {
        color: "warning",
        children: so.text,
      });
    $[27] = so;
    $[28] = mn;
  } else mn = $[28];
  let Cn;
  if ($[29] !== Xe) {
    Cn = jsxProd_default_2(Text, {
      children: [Xe, " spent"],
    });
    $[29] = Xe;
    $[30] = Cn;
  } else Cn = $[30];
  const ratio = It / 100;
  let vo;
  if ($[31] !== ratio || $[32] !== width) {
    vo = jsxProd_default(ProgressBar, {
      ratio,
      width,
      fillColor: "rate_limit_fill",
      emptyColor: "rate_limit_empty",
    });
    $[31] = ratio;
    $[32] = width;
    $[33] = vo;
  } else vo = $[33];
  let Yo;
  if ($[34] !== It) {
    Yo = jsxProd_default_2(Text, {
      children: [It, "% used"],
    });
    $[34] = It;
    $[35] = Yo;
  } else Yo = $[35];
  let kn;
  if ($[36] !== Cn || $[37] !== vo || $[38] !== Yo) {
    kn = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [Cn, vo, Yo],
    });
    $[36] = Cn;
    $[37] = vo;
    $[38] = Yo;
    $[39] = kn;
  } else kn = $[39];
  let Fn;
  if ($[40] !== kt || $[41] !== Lt) {
    Fn = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Resets ", Lt, " \xB7 ", kt, " monthly limit"],
    });
    $[40] = kt;
    $[41] = Lt;
    $[42] = Fn;
  } else Fn = $[42];
  let bn;
  if ($[43] !== so) {
    bn =
      so !== null &&
      !so.urgent &&
      jsxProd_default(Text, {
        dimColor: true,
        children: so.text,
      });
    $[43] = so;
    $[44] = bn;
  } else bn = $[44];
  let Go;
  if ($[45] !== kn || $[46] !== Fn || $[47] !== bn) {
    Go = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [kn, Fn, bn],
    });
    $[45] = kn;
    $[46] = Fn;
    $[47] = bn;
    $[48] = Go;
  } else Go = $[48];
  let hn;
  if ($[49] !== onAction || $[50] !== onCancel || $[51] !== Io) {
    hn = jsxProd_default(ModelSelector, {
      options: Io,
      onChange: onAction,
      onCancel,
      visibleOptionCount: Io.length,
    });
    $[49] = onAction;
    $[50] = onCancel;
    $[51] = Io;
    $[52] = hn;
  } else hn = $[52];
  let children;
  if ($[53] !== Wo || $[54] !== mn || $[55] !== Go || $[56] !== hn) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Wo, mn, Go, hn],
    });
    $[53] = Wo;
    $[54] = mn;
    $[55] = Go;
    $[56] = hn;
    $[57] = children;
  } else children = $[57];
  let Xo;
  if ($[58] !== onCancel || $[59] !== children) {
    Xo = jsxProd_default(Dialog, {
      title: "Usage credits",
      onCancel,
      color: "suggestion",
      children,
    });
    $[58] = onCancel;
    $[59] = children;
    $[60] = Xo;
  } else Xo = $[60];
  return Xo;
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
function getOfferAnalytics(h) {
  return h === null
    ? {}
    : {
        offer_kind: fromEnum(h.kind),
        offer_arm: sanitizeMarkName(h.armId),
        offer_headline_pct: h.headlinePct,
      };
}
//@ chunk-18hwfzwa.js:1151553-1151729 placement
function getOfferDialogHeader(offer) {
  if (offer === null) return null;
  let x = promoOfferStrings();
  return (
    fillUsageTemplate(offer.kind === "pct_off" ? x.dialogHeaderPctOff : x.dialogHeaderExtraCredit, {
      pct: offer.headlinePct,
      daysLeft: offer.daysLeft,
    }) ?? null
  );
}
//@ chunk-18hwfzwa.js:1151729-1154884 placement
/**
 * 额度包选择器。
 */
function CreditBundlePicker(props) {
  let $ = w(54);
  let { pm, presets, offer, customPreviewable, currency, expiryNotice, onConfirm, onCustom, onCancel } =
    props;
  let ze = offer?.kind === "extra_credit";
  let rt;
  if ($[0] !== currency || $[1] !== customPreviewable || $[2] !== ze || $[3] !== offer || $[4] !== presets) {
    let kt;
    if ($[6] !== currency || $[7] !== ze) {
      kt = (At, It) => {
        if (ze && At.local_credit_minor_units > At.local_price_minor_units) {
          let Ot = percentOfBase(At.credit_minor_units, At.price_minor_units);
          return {
            label: `Pay ${formatCurrency(At.local_price_minor_units, currency, "fit")} \xB7 Get ${formatCurrency(At.local_credit_minor_units, currency, "fit")}`,
            description: Ot > 0 ? `+${Ot}% credit` : undefined,
            value: `p${It}`,
          };
        }
        let Et = discountPercentOfPay(At.credit_minor_units, At.price_minor_units);
        return {
          label: formatCurrency(At.local_credit_minor_units, currency, "fit"),
          description: Et > 0 ? `Save ${Et}%` : undefined,
          value: `p${It}`,
        };
      };
      $[6] = currency;
      $[7] = ze;
      $[8] = kt;
    } else kt = $[8];
    const mapped = presets.map(kt);
    let description;
    if ($[9] !== customPreviewable || $[10] !== ze || $[11] !== offer) {
      description =
        ze && offer.customBonusTiers !== null && customPreviewable
          ? `Get ${Math.min(...offer.customBonusTiers.map(selectBonusPct))}% extra credit or more`
          : undefined;
      $[9] = customPreviewable;
      $[10] = ze;
      $[11] = offer;
      $[12] = description;
    } else description = $[12];
    let oo;
    if ($[13] !== description) {
      oo = {
        label: "Custom amount\u2026",
        description,
        value: "custom",
      };
      $[13] = description;
      $[14] = oo;
    } else oo = $[14];
    let Xt;
    if ($[15] === MEMO_CACHE_SENTINEL) {
      Xt = {
        label: "Cancel",
        value: "cancel",
      };
      $[15] = Xt;
    } else Xt = $[15];
    rt = [...mapped, oo, Xt];
    $[0] = currency;
    $[1] = customPreviewable;
    $[2] = ze;
    $[3] = offer;
    $[4] = presets;
    $[5] = rt;
  } else rt = $[5];
  let io = rt;
  let kt;
  if ($[16] !== offer) {
    kt = getOfferDialogHeader(offer);
    $[16] = offer;
    $[17] = kt;
  } else kt = $[17];
  let so = kt;
  let Dt;
  let Lt;
  if ($[18] !== so || $[19] !== offer) {
    Dt = () => {
      if (so !== null) logCreditOfferShown("cli_purchase_dialog", getOfferAnalytics(offer));
    };
    Lt = [so, offer];
    $[18] = so;
    $[19] = offer;
    $[20] = Dt;
    $[21] = Lt;
  } else {
    Dt = $[20];
    Lt = $[21];
  }
  P(Dt, Lt);
  let oo;
  if ($[22] !== offer || $[23] !== presets) {
    oo =
      offer?.defaultBundleId === null || offer === null
        ? -1
        : presets.findIndex((preset) => preset.id === offer.defaultBundleId);
    $[22] = offer;
    $[23] = presets;
    $[24] = oo;
  } else oo = $[24];
  let ao = oo;
  let Xt;
  if ($[25] !== onCancel || $[26] !== onConfirm || $[27] !== onCustom || $[28] !== presets) {
    Xt = function Ao(co) {
      if (co === "custom") {
        return onCustom();
      }
      if (co === "cancel") {
        return onCancel();
      }
      let bo = Number(co.slice(1));
      onConfirm(presets[bo]);
    };
    $[25] = onCancel;
    $[26] = onConfirm;
    $[27] = onCustom;
    $[28] = presets;
    $[29] = Xt;
  } else Xt = $[29];
  let onChange = Xt;
  let Bo;
  if ($[30] !== so) {
    Bo =
      so !== null &&
      jsxProd_default(Text, {
        color: "success",
        children: so,
      });
    $[30] = so;
    $[31] = Bo;
  } else Bo = $[31];
  let Ro;
  if ($[32] !== pm) {
    Ro = formatCardOnFile(pm);
    $[32] = pm;
    $[33] = Ro;
  } else Ro = $[33];
  let Ho;
  if ($[34] !== Ro) {
    Ho = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Payment: ", Ro],
    });
    $[34] = Ro;
    $[35] = Ho;
  } else Ho = $[35];
  let Io;
  if ($[36] !== ao) {
    Io = ao >= 0 && {
      defaultFocusValue: `p${ao}`,
    };
    $[36] = ao;
    $[37] = Io;
  } else Io = $[37];
  let Wo;
  if ($[38] !== onChange || $[39] !== onCancel || $[40] !== io || $[41] !== Io) {
    Wo = jsxProd_default(ModelSelector, {
      options: io,
      ...Io,
      onChange,
      onCancel,
      visibleOptionCount: io.length,
    });
    $[38] = onChange;
    $[39] = onCancel;
    $[40] = io;
    $[41] = Io;
    $[42] = Wo;
  } else Wo = $[42];
  let mn;
  if ($[43] === MEMO_CACHE_SENTINEL) {
    mn = jsxProd_default(Text, {
      dimColor: true,
      children: "By confirming, you allow Anthropic to charge your card in the amount above.",
    });
    $[43] = mn;
  } else mn = $[43];
  let Cn;
  if ($[44] !== expiryNotice) {
    Cn =
      expiryNotice !== null &&
      jsxProd_default(Text, {
        dimColor: true,
        children: expiryNotice,
      });
    $[44] = expiryNotice;
    $[45] = Cn;
  } else Cn = $[45];
  let children;
  if ($[46] !== Wo || $[47] !== Cn || $[48] !== Bo || $[49] !== Ho) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [Bo, Ho, Wo, mn, Cn],
    });
    $[46] = Wo;
    $[47] = Cn;
    $[48] = Bo;
    $[49] = Ho;
    $[50] = children;
  } else children = $[50];
  let vo;
  if ($[51] !== onCancel || $[52] !== children) {
    vo = jsxProd_default(Dialog, {
      title: "Buy usage credits",
      onCancel,
      color: "suggestion",
      children,
    });
    $[51] = onCancel;
    $[52] = children;
    $[53] = vo;
  } else vo = $[53];
  return vo;
}
export {
  getOfferAnalytics,
  isOfferDriftError,
  getCreditsValidityNote,
  UsageCreditsOverview,
  CreditBundlePicker,
};
