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
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";
import { Text, Box } from "../../ink/components/Text.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { y, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { formatCurrency } from "../../services/api/referral.js";

//@ chunk-ag5x7vhf.js:80712-80762 placement
function fotwState() {
  return {
    campaign: parsePromoCampaign(),
    cached: promoCreditAmount(),
  };
}
//@ chunk-ag5x7vhf.js:80762-80827 placement
function renderAnnouncementLine(We, fe) {
  return jsxProd_default(
    HighlightedCommandText,
    {
      text: We.text,
      style: We.style,
    },
    fe,
  );
}
//@ chunk-ag5x7vhf.js:80827-80884 placement
var PROMOTION_TERMS_URL = "https://www.anthropic.com/legal/promotion-terms";
//@ chunk-ag5x7vhf.js:80884-81411 placement
/**
 * 渲染一段提示文字，把其中识别出的 /命令（去掉尾部标点）加粗并用 permission 色；整体可选 bold 或 dim 样式。
 */
function HighlightedCommandText(props) {
  let T = w(9);
  let { text, style } = props;
  let k;
  if (T[0] !== text) {
    k = [];
    let _ = 0;
    for (const { start, end } of findSlashMentionRanges(text)) {
      if (start > _) k.push(text.slice(_, start));
      let replaced = text.slice(start, end).replace(/[:\-_]+$/, "");
      k.push(
        jsxProd_default(
          Text,
          {
            bold: true,
            color: "permission",
            children: replaced,
          },
          start,
        ),
      );
      _ = start + replaced.length;
    }
    if (_ < text.length) {
      let L;
      if (T[2] !== _ || T[3] !== text) {
        L = text.slice(_);
        T[2] = _;
        T[3] = text;
        T[4] = L;
      } else L = T[4];
      k.push(L);
    }
    T[0] = text;
    T[1] = k;
  } else k = T[1];
  const bold = style === "bold";
  const dimColor = style === "dim";
  let W;
  if (T[5] !== k || T[6] !== bold || T[7] !== dimColor) {
    W = jsxProd_default(Text, {
      bold,
      dimColor,
      children: k,
    });
    T[5] = k;
    T[6] = bold;
    T[7] = dimColor;
    T[8] = W;
  } else W = T[8];
  return W;
}
//@ chunk-ag5x7vhf.js:81411-81495 placement
function shouldShowFotw() {
  if (!parsePromoCampaign()?.command) return false;
  if (canClaimPromoCredit()) return promoCreditAmount() !== null;
  return shouldShowPromoUpsell();
}
//@ chunk-ag5x7vhf.js:81495-81711 placement
function getFeatureOfTheWeekContent(noticeImpressionEnabled) {
  let h = announcementState();
  if (h.fotwContent !== null) return h.fotwContent;
  if (!shouldShowFotw()) return null;
  let promoCampaign = parsePromoCampaign();
  if (!promoCampaign) return null;
  let T = {
    variant: canClaimPromoCredit() ? "credit" : "upsell",
    campaign: promoCampaign,
    cached: promoCreditAmount(),
  };
  if (noticeImpressionEnabled) h.fotwContent = T;
  return T;
}
//@ chunk-ag5x7vhf.js:81711-81921 placement
function FeatureOfTheWeekNotice() {
  let h = w(4);
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let x;
  if (h[0] !== noticeImpressionEnabled) {
    x = getFeatureOfTheWeekContent(noticeImpressionEnabled);
    h[0] = noticeImpressionEnabled;
    h[1] = x;
  } else x = h[1];
  let T = x;
  if (T === null) {
    return null;
  }
  let k;
  if (h[2] !== T.variant) {
    k = jsxProd_default(FeatureOfTheWeekNudge, {
      variant: T.variant,
    });
    h[2] = T.variant;
    h[3] = k;
  } else k = h[3];
  return k;
}
//@ chunk-ag5x7vhf.js:81921-83765 placement
function FeatureOfTheWeekNudge(props) {
  let x = w(24);
  let { variant } = props;
  let T;
  if (x[0] === MEMO_CACHE_SENTINEL) {
    T = announcementState();
    x[0] = T;
  } else T = x[0];
  let fotwContent = T.fotwContent;
  let [_] = y(fotwState);
  let campaign = fotwContent !== null ? fotwContent.campaign : _.campaign;
  let cached = fotwContent !== null ? fotwContent.cached : _.cached;
  let enabled = Boolean(campaign?.command) && (variant === "upsell" || cached !== null);
  let L;
  if (x[1] !== campaign || x[2] !== variant) {
    L = () => {
      if (!campaign) {
        return;
      }
      logEvent("tengu_fotw_nudge_shown", {
        feature: sanitizedMachineReasonForTelemetry(campaign.feature),
        campaign: lit("feature_of_the_week"),
        audience: lit(variant === "credit" ? "claimant" : "viewer"),
      });
    };
    x[1] = campaign;
    x[2] = variant;
    x[3] = L;
  } else L = x[3];
  let V;
  if (x[4] !== enabled) {
    V = {
      enabled,
    };
    x[4] = enabled;
    x[5] = V;
  } else V = x[5];
  useNoticeImpression("fotw-nudge", L, V);
  if (!campaign?.command) {
    return null;
  }
  let W = campaign.hideCommandChip !== true;
  let z;
  if (
    x[6] !== campaign.announcementLines ||
    x[7] !== campaign.command ||
    x[8] !== campaign.commandBlurb ||
    x[9] !== campaign.titleLabel ||
    x[10] !== W
  ) {
    z = campaign.announcementLines?.length
      ? jsxProd_default(Box, {
          flexDirection: "column",
          children: campaign.announcementLines.map(renderAnnouncementLine),
        })
      : jsxProd_default_2(Text, {
          children: [
            jsxProd_default(Text, {
              bold: true,
              children: campaign.titleLabel ?? "Feature of the week:",
            }),
            W
              ? jsxProd_default_2(Fragment, {
                  children: [
                    " ",
                    jsxProd_default_2(Text, {
                      bold: true,
                      color: "permission",
                      children: ["/", campaign.command],
                    }),
                  ],
                })
              : null,
            campaign.commandBlurb ? `${W ? " \u2014 " : " "}${campaign.commandBlurb}` : "",
          ],
        });
    x[6] = campaign.announcementLines;
    x[7] = campaign.command;
    x[8] = campaign.commandBlurb;
    x[9] = campaign.titleLabel;
    x[10] = W;
    x[11] = z;
  } else z = x[11];
  let K = z;
  if (variant === "upsell") {
    let q;
    if (x[12] !== K) {
      q = jsxProd_default(Box, {
        flexDirection: "column",
        children: K,
      });
      x[12] = K;
      x[13] = q;
    } else q = x[13];
    return q;
  }
  if (cached === null) {
    return null;
  }
  let q;
  if (x[14] !== cached.amountMinorUnits || x[15] !== cached.currency) {
    q = formatCurrency(cached.amountMinorUnits, cached.currency, "fit");
    x[14] = cached.amountMinorUnits;
    x[15] = cached.currency;
    x[16] = q;
  } else q = x[16];
  let Y = q;
  const pe = campaign.redeemBy ? ` \xB7 Redeem by ${campaign.redeemBy}` : "";
  let xe;
  if (x[17] !== Y || x[18] !== pe) {
    xe = jsxProd_default_2(Text, {
      children: ["Get ", Y, " in usage credits when you run it", pe],
    });
    x[17] = Y;
    x[18] = pe;
    x[19] = xe;
  } else xe = x[19];
  let ge;
  if (x[20] === MEMO_CACHE_SENTINEL) {
    ge = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Terms apply: ", PROMOTION_TERMS_URL],
    });
    x[20] = ge;
  } else ge = x[20];
  let Re;
  if (x[21] !== K || x[22] !== xe) {
    Re = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [K, xe, ge],
    });
    x[21] = K;
    x[22] = xe;
    x[23] = Re;
  } else Re = x[23];
  return Re;
}
//@ chunk-ag5x7vhf.js:83765-83769 placement
init_react_production();
export { shouldShowFotw, FeatureOfTheWeekNotice };
