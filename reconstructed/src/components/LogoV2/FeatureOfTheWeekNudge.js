/**
 * components/LogoV2/FeatureOfTheWeekNudge.tsx
 *
 * 2.1.316 新增："本周功能"提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (9)
 * attribution: placement 9
 */
import {
  parsePromoCampaign,
  promoCreditAmount,
  canClaimPromoCredit,
  shouldShowPromoUpsell,
} from "../../services/api/featureOfTheWeek.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";
import { Text, Box } from "../../ink/components/Text.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { Dt, at } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, j } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { formatCurrency } from "../../services/api/referral.js";

//@ chunk-ag5x7vhf.js:80712-80762 placement
function J_() {
  return { campaign: parsePromoCampaign(), cached: promoCreditAmount() };
}
//@ chunk-ag5x7vhf.js:80762-80827 placement
function Q_(We, fe) {
  return e(HighlightedCommandText, { text: We.text, style: We.style }, fe);
}
//@ chunk-ag5x7vhf.js:80827-80884 placement
var PROMOTION_TERMS_URL = "https://www.anthropic.com/legal/promotion-terms";
/**
 * 渲染一段提示文字，把其中识别出的 /命令（去掉尾部标点）加粗并用 permission 色；整体可选 bold 或 dim 样式。
 */
//@ chunk-ag5x7vhf.js:80884-81411 placement
function HighlightedCommandText(props) {
  let T = w(9),
    { text: text, style: style } = props,
    k;
  if (T[0] !== text) {
    k = [];
    let _ = 0;
    for (const { start: start, end: end } of findSlashMentionRanges(text)) {
      if (start > _) k.push(text.slice(_, start));
      let replaced = text.slice(start, end).replace(/[:\-_]+$/, "");
      (k.push(e(Text, { bold: !0, color: "permission", children: replaced }, start)),
        (_ = start + replaced.length));
    }
    if (_ < text.length) {
      let L;
      if (T[2] !== _ || T[3] !== text) ((L = text.slice(_)), (T[2] = _), (T[3] = text), (T[4] = L));
      else L = T[4];
      k.push(L);
    }
    ((T[0] = text), (T[1] = k));
  } else k = T[1];
  const L = style === "bold",
    V = style === "dim";
  let W;
  if (T[5] !== k || T[6] !== L || T[7] !== V)
    ((W = e(Text, { bold: L, dimColor: V, children: k })), (T[5] = k), (T[6] = L), (T[7] = V), (T[8] = W));
  else W = T[8];
  return W;
}
//@ chunk-ag5x7vhf.js:81411-81495 placement
function Sl() {
  if (!parsePromoCampaign()?.command) return !1;
  if (canClaimPromoCredit()) return promoCreditAmount() !== null;
  return shouldShowPromoUpsell();
}
//@ chunk-ag5x7vhf.js:81495-81711 placement
function getFeatureOfTheWeekContent(m) {
  let h = announcementState();
  if (h.fotwContent !== null) return h.fotwContent;
  if (!Sl()) return null;
  let x = parsePromoCampaign();
  if (!x) return null;
  let T = { variant: canClaimPromoCredit() ? "credit" : "upsell", campaign: x, cached: promoCreditAmount() };
  if (m) h.fotwContent = T;
  return T;
}
//@ chunk-ag5x7vhf.js:81711-81921 placement
function FeatureOfTheWeekNotice() {
  let h = w(4),
    m = Dt(),
    x;
  if (h[0] !== m) ((x = getFeatureOfTheWeekContent(m)), (h[0] = m), (h[1] = x));
  else x = h[1];
  let T = x;
  if (T === null) {
    return null;
  }
  let k;
  if (h[2] !== T.variant)
    ((k = e(FeatureOfTheWeekNudge, { variant: T.variant })), (h[2] = T.variant), (h[3] = k));
  else k = h[3];
  return k;
}
//@ chunk-ag5x7vhf.js:81921-83765 placement
function FeatureOfTheWeekNudge(m) {
  let x = w(24),
    { variant: variant } = m,
    T;
  if (x[0] === MEMO_CACHE_SENTINEL) ((T = announcementState()), (x[0] = T));
  else T = x[0];
  let fotwContent = T.fotwContent,
    [_] = y(J_),
    I = fotwContent !== null ? fotwContent.campaign : _.campaign,
    D = fotwContent !== null ? fotwContent.cached : _.cached,
    A = Boolean(I?.command) && (variant === "upsell" || D !== null),
    L;
  if (x[1] !== I || x[2] !== variant)
    ((L = () => {
      if (!I) {
        return;
      }
      logEvent("tengu_fotw_nudge_shown", {
        feature: sanitizedMachineReasonForTelemetry(I.feature),
        campaign: lit("feature_of_the_week"),
        audience: lit(variant === "credit" ? "claimant" : "viewer"),
      });
    }),
      (x[1] = I),
      (x[2] = variant),
      (x[3] = L));
  else L = x[3];
  let V;
  if (x[4] !== A) ((V = { enabled: A }), (x[4] = A), (x[5] = V));
  else V = x[5];
  if ((at("fotw-nudge", L, V), !I?.command)) {
    return null;
  }
  let W = I.hideCommandChip !== !0,
    z;
  if (
    x[6] !== I.announcementLines ||
    x[7] !== I.command ||
    x[8] !== I.commandBlurb ||
    x[9] !== I.titleLabel ||
    x[10] !== W
  )
    ((z = I.announcementLines?.length
      ? e(Box, { flexDirection: "column", children: I.announcementLines.map(Q_) })
      : r(Text, {
          children: [
            e(Text, { bold: !0, children: I.titleLabel ?? "Feature of the week:" }),
            W
              ? r(Fragment, {
                  children: [" ", r(Text, { bold: !0, color: "permission", children: ["/", I.command] })],
                })
              : null,
            I.commandBlurb ? `${W ? " \u2014 " : " "}${I.commandBlurb}` : "",
          ],
        })),
      (x[6] = I.announcementLines),
      (x[7] = I.command),
      (x[8] = I.commandBlurb),
      (x[9] = I.titleLabel),
      (x[10] = W),
      (x[11] = z));
  else z = x[11];
  let K = z;
  if (variant === "upsell") {
    let q;
    if (x[12] !== K) ((q = e(Box, { flexDirection: "column", children: K })), (x[12] = K), (x[13] = q));
    else q = x[13];
    return q;
  }
  if (D === null) {
    return null;
  }
  let q;
  if (x[14] !== D.amountMinorUnits || x[15] !== D.currency)
    ((q = formatCurrency(D.amountMinorUnits, D.currency, "fit")),
      (x[14] = D.amountMinorUnits),
      (x[15] = D.currency),
      (x[16] = q));
  else q = x[16];
  let Y = q;
  const pe = I.redeemBy ? ` \xB7 Redeem by ${I.redeemBy}` : "";
  let xe;
  if (x[17] !== Y || x[18] !== pe)
    ((xe = r(Text, { children: ["Get ", Y, " in usage credits when you run it", pe] })),
      (x[17] = Y),
      (x[18] = pe),
      (x[19] = xe));
  else xe = x[19];
  let ge;
  if (x[20] === MEMO_CACHE_SENTINEL)
    ((ge = r(Text, { dimColor: !0, children: ["Terms apply: ", PROMOTION_TERMS_URL] })), (x[20] = ge));
  else ge = x[20];
  let Re;
  if (x[21] !== K || x[22] !== xe)
    ((Re = r(Box, { flexDirection: "column", children: [K, xe, ge] })),
      (x[21] = K),
      (x[22] = xe),
      (x[23] = Re));
  else Re = x[23];
  return Re;
}
//@ chunk-ag5x7vhf.js:83765-83769 placement
j();

export { Sl, FeatureOfTheWeekNotice };
