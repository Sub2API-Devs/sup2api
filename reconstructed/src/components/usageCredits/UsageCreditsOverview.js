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
import { Cat, _h } from "./ExtraUsageDialog.js";
import { formatCurrency } from "../../services/api/referral.js";
import { startOfDay } from "../../utils/formatBriefTimestamp.js";
import { wwi } from "../../services/claudeAiLimits.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ProgressBar } from "../design-system/ProgressBar.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";
import { readErrorCodeFromAxios } from "../../services/api/verificationRequired.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { promoOfferStrings, fillUsageTemplate } from "../../services/api/usage.js";
import { i1, r1, selectBonusPct } from "./creditOffers.js";
import { logCreditOfferShown } from "../../services/usageCreditOffers.js";
import { P } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:1146666-1147575 placement
function promoCreditExpiry(h, x) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_juniper_bassoon", !1)) return null;
  let D = null;
  for (let He of h?.promo_tranches ?? []) {
    let remaining_amount_minor_units = He.remaining_amount_minor_units,
      parse = Date.parse(He.expires_at ?? "");
    if (
      typeof remaining_amount_minor_units !== "number" ||
      remaining_amount_minor_units <= 0 ||
      Number.isNaN(parse)
    )
      continue;
    if (parse <= x.getTime()) continue;
    let Xe = Cat(He.currency ?? "");
    if (!Xe) continue;
    if (!D || parse < D.expiresMs) {
      let rt = He.name ? Cat(He.name) : "";
      D = {
        expiresMs: parse,
        amountMinorUnits: remaining_amount_minor_units,
        currency: Xe,
        name: rt || null,
      };
    }
  }
  if (!D) return null;
  let L = formatCurrency(D.amountMinorUnits, D.currency),
    ee = D.name ? ` \xB7 ${D.name}` : "";
  if (D.expiresMs - x.getTime() < 864000000) {
    let He = startOfDay(x, new Date(D.expiresMs)),
      We = He <= 0 ? "today" : He === 1 ? "in 1 day" : `in ${He} days`;
    return { text: `${L} of your balance expires ${We}${ee}`, urgent: !0 };
  }
  let date = new Date(D.expiresMs),
    toLocaleDateString = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      ...(date.getFullYear() !== x.getFullYear() && { year: "numeric" }),
    });
  return { text: `${L} expires ${toLocaleDateString}${ee}`, urgent: !1 };
}
/**
 * 开关开启且月数有效时，返回"用量额度有效期 N 个月"的说明与了解更多链接。
 */
//@ chunk-18hwfzwa.js:1147575-1147774 placement
function getCreditsValidityNote(h) {
  if (!getFeatureValue_CACHED_MAY_BE_STALE("tengu_satchel_banjo", !1)) return null;
  if (h === null || !Number.isInteger(h) || h <= 0) return null;
  return `Usage credits are valid for ${h} ${h === 1 ? "month" : "months"}. Learn more: ${wwi}`;
}
/**
 * UsageCreditsOverview：用量额度概览界面。
 */
//@ chunk-18hwfzwa.js:1147774-1151352 placement
function UsageCreditsOverview(h) {
  let $ = w(61),
    { step: step, currency: currency, onAction: onAction, onCancel: onCancel } = h,
    { columns: columns } = useTerminalSize(),
    min = Math.min(columns - 6, 50),
    { usage: usage, balance: balance } = step,
    ze;
  if ($[0] !== currency || $[1] !== usage.used_credits)
    ((ze = usage.used_credits !== null ? formatCurrency(usage.used_credits, currency) : "\u2014"),
      ($[0] = currency),
      ($[1] = usage.used_credits),
      ($[2] = ze));
  else ze = $[2];
  let Xe = ze,
    rt;
  if ($[3] !== currency || $[4] !== usage.monthly_limit)
    ((rt = usage.monthly_limit !== null ? formatCurrency(usage.monthly_limit, currency, "fit") : "Unlimited"),
      ($[3] = currency),
      ($[4] = usage.monthly_limit),
      ($[5] = rt));
  else rt = $[5];
  let kt = rt,
    At;
  if ($[6] !== usage.utilization)
    ((At = usage.utilization !== null ? Math.round(usage.utilization) : 0),
      ($[6] = usage.utilization),
      ($[7] = At));
  else At = $[7];
  let It = At,
    Ot;
  if ($[8] !== balance || $[9] !== currency)
    ((Ot = balance ? formatCurrency(balance.amount, currency) : "\u2014"),
      ($[8] = balance),
      ($[9] = currency),
      ($[10] = Ot));
  else Ot = $[10];
  let Et = Ot,
    Dt = balance?.auto_reload_settings?.enabled === !0,
    Lt,
    oo;
  if ($[11] !== balance) {
    let date = new Date();
    let date_2 = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    Lt = date_2.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    oo = promoCreditExpiry(balance, date);
    (($[11] = balance), ($[12] = Lt), ($[13] = oo));
  } else ((Lt = $[12]), (oo = $[13]));
  let so = oo,
    po = usage.is_enabled === !1;
  const ao = `${Et} balance \xB7 auto-reload ${Dt ? "on" : "off"}
`;
  let co;
  if ($[14] !== ao) ((co = { label: ao, value: "auto_reload" }), ($[14] = ao), ($[15] = co));
  else co = $[15];
  let bo;
  if ($[16] === MEMO_CACHE_SENTINEL) ((bo = { label: "Buy more", value: "buy" }), ($[16] = bo));
  else bo = $[16];
  let Ao;
  if ($[17] !== po)
    ((Ao = po ? [] : [{ label: "Continue with usage credits", value: "continue" }]),
      ($[17] = po),
      ($[18] = Ao));
  else Ao = $[18];
  let Bo, Ro;
  if ($[19] === MEMO_CACHE_SENTINEL)
    ((Bo = { label: "Adjust monthly limit", value: "adjust" }),
      (Ro = { label: "Manage on claude.ai", value: "manage" }),
      ($[19] = Bo),
      ($[20] = Ro));
  else ((Bo = $[19]), (Ro = $[20]));
  let Ho;
  if ($[21] !== co || $[22] !== Ao)
    ((Ho = [co, bo, ...Ao, Bo, Ro]), ($[21] = co), ($[22] = Ao), ($[23] = Ho));
  else Ho = $[23];
  let Io = Ho,
    Wo;
  if ($[24] !== po || $[25] !== usage.disabled_reason)
    ((Wo =
      po &&
      e(Text, {
        color: "warning",
        children:
          usage.disabled_reason === "out_of_credits"
            ? "Out of usage credits \u2014 buy more below to keep going."
            : "You've hit your monthly limit \u2014 raise it below, or it resets next month.",
      })),
      ($[24] = po),
      ($[25] = usage.disabled_reason),
      ($[26] = Wo));
  else Wo = $[26];
  let mn;
  if ($[27] !== so)
    ((mn = so !== null && so.urgent && e(Text, { color: "warning", children: so.text })),
      ($[27] = so),
      ($[28] = mn));
  else mn = $[28];
  let Cn;
  if ($[29] !== Xe) ((Cn = r(Text, { children: [Xe, " spent"] })), ($[29] = Xe), ($[30] = Cn));
  else Cn = $[30];
  const No = It / 100;
  let vo;
  if ($[31] !== No || $[32] !== min)
    ((vo = e(ProgressBar, {
      ratio: No,
      width: min,
      fillColor: "rate_limit_fill",
      emptyColor: "rate_limit_empty",
    })),
      ($[31] = No),
      ($[32] = min),
      ($[33] = vo));
  else vo = $[33];
  let Yo;
  if ($[34] !== It) ((Yo = r(Text, { children: [It, "% used"] })), ($[34] = It), ($[35] = Yo));
  else Yo = $[35];
  let kn;
  if ($[36] !== Cn || $[37] !== vo || $[38] !== Yo)
    ((kn = r(Box, { flexDirection: "row", gap: 1, children: [Cn, vo, Yo] })),
      ($[36] = Cn),
      ($[37] = vo),
      ($[38] = Yo),
      ($[39] = kn));
  else kn = $[39];
  let Fn;
  if ($[40] !== kt || $[41] !== Lt)
    ((Fn = r(Text, { dimColor: !0, children: ["Resets ", Lt, " \xB7 ", kt, " monthly limit"] })),
      ($[40] = kt),
      ($[41] = Lt),
      ($[42] = Fn));
  else Fn = $[42];
  let bn;
  if ($[43] !== so)
    ((bn = so !== null && !so.urgent && e(Text, { dimColor: !0, children: so.text })),
      ($[43] = so),
      ($[44] = bn));
  else bn = $[44];
  let Go;
  if ($[45] !== kn || $[46] !== Fn || $[47] !== bn)
    ((Go = r(Box, { flexDirection: "column", children: [kn, Fn, bn] })),
      ($[45] = kn),
      ($[46] = Fn),
      ($[47] = bn),
      ($[48] = Go));
  else Go = $[48];
  let hn;
  if ($[49] !== onAction || $[50] !== onCancel || $[51] !== Io)
    ((hn = e(ModelSelector, {
      options: Io,
      onChange: onAction,
      onCancel: onCancel,
      visibleOptionCount: Io.length,
    })),
      ($[49] = onAction),
      ($[50] = onCancel),
      ($[51] = Io),
      ($[52] = hn));
  else hn = $[52];
  let Mn;
  if ($[53] !== Wo || $[54] !== mn || $[55] !== Go || $[56] !== hn)
    ((Mn = r(Box, { flexDirection: "column", gap: 1, children: [Wo, mn, Go, hn] })),
      ($[53] = Wo),
      ($[54] = mn),
      ($[55] = Go),
      ($[56] = hn),
      ($[57] = Mn));
  else Mn = $[57];
  let Xo;
  if ($[58] !== onCancel || $[59] !== Mn)
    ((Xo = e(Dialog, { title: "Usage credits", onCancel: onCancel, color: "suggestion", children: Mn })),
      ($[58] = onCancel),
      ($[59] = Mn),
      ($[60] = Xo));
  else Xo = $[60];
  return Xo;
}
//@ chunk-18hwfzwa.js:1151352-1151441 placement
function b_e(h) {
  let x = readErrorCodeFromAxios(h);
  return x === "discount_price_drift" || x === "bundle_offer_drift";
}
/**
 * 生成用量额度优惠的遥测字段（类型、实验组、标题百分比）。
 */
//@ chunk-18hwfzwa.js:1151441-1151553 placement
function getOfferAnalytics(h) {
  return h === null
    ? {}
    : { offer_kind: fromEnum(h.kind), offer_arm: ye(h.armId), offer_headline_pct: h.headlinePct };
}
//@ chunk-18hwfzwa.js:1151553-1151729 placement
function getOfferDialogHeader(h) {
  if (h === null) return null;
  let x = promoOfferStrings();
  return (
    fillUsageTemplate(h.kind === "pct_off" ? x.dialogHeaderPctOff : x.dialogHeaderExtraCredit, {
      pct: h.headlinePct,
      daysLeft: h.daysLeft,
    }) ?? null
  );
}
/**
 * 额度包选择器。
 */
//@ chunk-18hwfzwa.js:1151729-1154884 placement
function CreditBundlePicker(h) {
  let $ = w(54),
    {
      pm: pm,
      presets: presets,
      offer: offer,
      customPreviewable: customPreviewable,
      currency: currency,
      expiryNotice: expiryNotice,
      onConfirm: onConfirm,
      onCustom: onCustom,
      onCancel: onCancel,
    } = h,
    ze = offer?.kind === "extra_credit",
    rt;
  if ($[0] !== currency || $[1] !== customPreviewable || $[2] !== ze || $[3] !== offer || $[4] !== presets) {
    let kt;
    if ($[6] !== currency || $[7] !== ze)
      ((kt = (At, It) => {
        if (ze && At.local_credit_minor_units > At.local_price_minor_units) {
          let Ot = i1(At.credit_minor_units, At.price_minor_units);
          return {
            label: `Pay ${formatCurrency(At.local_price_minor_units, currency, "fit")} \xB7 Get ${formatCurrency(At.local_credit_minor_units, currency, "fit")}`,
            description: Ot > 0 ? `+${Ot}% credit` : void 0,
            value: `p${It}`,
          };
        }
        let Et = r1(At.credit_minor_units, At.price_minor_units);
        return {
          label: formatCurrency(At.local_credit_minor_units, currency, "fit"),
          description: Et > 0 ? `Save ${Et}%` : void 0,
          value: `p${It}`,
        };
      }),
        ($[6] = currency),
        ($[7] = ze),
        ($[8] = kt));
    else kt = $[8];
    const mapped = presets.map(kt);
    let Lt;
    if ($[9] !== customPreviewable || $[10] !== ze || $[11] !== offer)
      ((Lt =
        ze && offer.customBonusTiers !== null && customPreviewable
          ? `Get ${Math.min(...offer.customBonusTiers.map(selectBonusPct))}% extra credit or more`
          : void 0),
        ($[9] = customPreviewable),
        ($[10] = ze),
        ($[11] = offer),
        ($[12] = Lt));
    else Lt = $[12];
    let oo;
    if ($[13] !== Lt)
      ((oo = { label: "Custom amount\u2026", description: Lt, value: "custom" }), ($[13] = Lt), ($[14] = oo));
    else oo = $[14];
    let Xt;
    if ($[15] === MEMO_CACHE_SENTINEL) ((Xt = { label: "Cancel", value: "cancel" }), ($[15] = Xt));
    else Xt = $[15];
    rt = [...mapped, oo, Xt];
    (($[0] = currency),
      ($[1] = customPreviewable),
      ($[2] = ze),
      ($[3] = offer),
      ($[4] = presets),
      ($[5] = rt));
  } else rt = $[5];
  let io = rt,
    kt;
  if ($[16] !== offer) ((kt = getOfferDialogHeader(offer)), ($[16] = offer), ($[17] = kt));
  else kt = $[17];
  let so = kt,
    Dt,
    Lt;
  if ($[18] !== so || $[19] !== offer)
    ((Dt = () => {
      if (so !== null) logCreditOfferShown("cli_purchase_dialog", getOfferAnalytics(offer));
    }),
      (Lt = [so, offer]),
      ($[18] = so),
      ($[19] = offer),
      ($[20] = Dt),
      ($[21] = Lt));
  else ((Dt = $[20]), (Lt = $[21]));
  P(Dt, Lt);
  let oo;
  if ($[22] !== offer || $[23] !== presets)
    ((oo =
      offer?.defaultBundleId === null || offer === null
        ? -1
        : presets.findIndex((po) => po.id === offer.defaultBundleId)),
      ($[22] = offer),
      ($[23] = presets),
      ($[24] = oo));
  else oo = $[24];
  let ao = oo,
    Xt;
  if ($[25] !== onCancel || $[26] !== onConfirm || $[27] !== onCustom || $[28] !== presets)
    ((Xt = function Ao(co) {
      if (co === "custom") {
        return onCustom();
      }
      if (co === "cancel") {
        return onCancel();
      }
      let bo = Number(co.slice(1));
      onConfirm(presets[bo]);
    }),
      ($[25] = onCancel),
      ($[26] = onConfirm),
      ($[27] = onCustom),
      ($[28] = presets),
      ($[29] = Xt));
  else Xt = $[29];
  let Ao = Xt,
    Bo;
  if ($[30] !== so)
    ((Bo = so !== null && e(Text, { color: "success", children: so })), ($[30] = so), ($[31] = Bo));
  else Bo = $[31];
  let Ro;
  if ($[32] !== pm) ((Ro = _h(pm)), ($[32] = pm), ($[33] = Ro));
  else Ro = $[33];
  let Ho;
  if ($[34] !== Ro)
    ((Ho = r(Text, { dimColor: !0, children: ["Payment: ", Ro] })), ($[34] = Ro), ($[35] = Ho));
  else Ho = $[35];
  let Io;
  if ($[36] !== ao) ((Io = ao >= 0 && { defaultFocusValue: `p${ao}` }), ($[36] = ao), ($[37] = Io));
  else Io = $[37];
  let Wo;
  if ($[38] !== Ao || $[39] !== onCancel || $[40] !== io || $[41] !== Io)
    ((Wo = e(ModelSelector, {
      options: io,
      ...Io,
      onChange: Ao,
      onCancel: onCancel,
      visibleOptionCount: io.length,
    })),
      ($[38] = Ao),
      ($[39] = onCancel),
      ($[40] = io),
      ($[41] = Io),
      ($[42] = Wo));
  else Wo = $[42];
  let mn;
  if ($[43] === MEMO_CACHE_SENTINEL)
    ((mn = e(Text, {
      dimColor: !0,
      children: "By confirming, you allow Anthropic to charge your card in the amount above.",
    })),
      ($[43] = mn));
  else mn = $[43];
  let Cn;
  if ($[44] !== expiryNotice)
    ((Cn = expiryNotice !== null && e(Text, { dimColor: !0, children: expiryNotice })),
      ($[44] = expiryNotice),
      ($[45] = Cn));
  else Cn = $[45];
  let No;
  if ($[46] !== Wo || $[47] !== Cn || $[48] !== Bo || $[49] !== Ho)
    ((No = r(Box, { flexDirection: "column", gap: 1, children: [Bo, Ho, Wo, mn, Cn] })),
      ($[46] = Wo),
      ($[47] = Cn),
      ($[48] = Bo),
      ($[49] = Ho),
      ($[50] = No));
  else No = $[50];
  let vo;
  if ($[51] !== onCancel || $[52] !== No)
    ((vo = e(Dialog, { title: "Buy usage credits", onCancel: onCancel, color: "suggestion", children: No })),
      ($[51] = onCancel),
      ($[52] = No),
      ($[53] = vo));
  else vo = $[53];
  return vo;
}

export { getOfferAnalytics, b_e, getCreditsValidityNote, UsageCreditsOverview, CreditBundlePicker };
