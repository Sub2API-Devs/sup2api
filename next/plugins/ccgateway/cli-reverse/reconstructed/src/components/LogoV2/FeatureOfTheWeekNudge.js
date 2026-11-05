/**
 * components/LogoV2/FeatureOfTheWeekNudge.tsx
 *
 * 2.1.316 新增："本周功能"提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (9)
 * attribution: placement 9
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { findSlashMentionRanges } from "../../utils/attachments/skillMentions.js";
import { Text, Box } from "../../ink/components/Text.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { logEvent } from "../../services/analytics/index.js";
import { sanitizedMachineReasonForTelemetry } from "../../utils/errors.js";
import { lit } from "../../services/analytics/safeMetadata.js";
import { formatCurrency } from "../../services/api/referral.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:80192-80196 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:80192", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:80196-80246 placement
function fotwState() {
  return {
    campaign: parsePromoCampaign(),
    cached: promoCreditAmount(),
  };
}
//@ chunk-hnxhr3bs.js:80246-80311 placement
function renderAnnouncementLine(line, key) {
  return jsxProd_default(
    HighlightedCommandText,
    {
      text: line.text,
      style: line.style,
    },
    key,
  );
}
//@ chunk-hnxhr3bs.js:80311-80368 placement
var PROMOTION_TERMS_URL = "https://www.anthropic.com/legal/promotion-terms";
//@ chunk-hnxhr3bs.js:80368-80895 placement
/**
 * 渲染一段提示文字，把其中识别出的 /命令（去掉尾部标点）加粗并用 permission 色；整体可选 bold 或 dim 样式。
 */
function HighlightedCommandText(props) {
  let $ = useMemoCache(9);
  let { text, style } = props;
  let parts;
  if ($[0] !== text) {
    parts = [];
    let lastEnd = 0;
    for (const { start, end } of findSlashMentionRanges(text)) {
      if (start > lastEnd) parts.push(text.slice(lastEnd, start));
      let replaced = text.slice(start, end).replace(/[:\-_]+$/, "");
      parts.push(
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
      lastEnd = start + replaced.length;
    }
    if (lastEnd < text.length) {
      let tail;
      if ($[2] !== lastEnd || $[3] !== text) {
        tail = text.slice(lastEnd);
        $[2] = lastEnd;
        $[3] = text;
        $[4] = tail;
      } else tail = $[4];
      parts.push(tail);
    }
    $[0] = text;
    $[1] = parts;
  } else parts = $[1];
  const bold = style === "bold";
  const dimColor = style === "dim";
  let textNode;
  if ($[5] !== parts || $[6] !== bold || $[7] !== dimColor) {
    textNode = jsxProd_default(Text, {
      bold,
      dimColor,
      children: parts,
    });
    $[5] = parts;
    $[6] = bold;
    $[7] = dimColor;
    $[8] = textNode;
  } else textNode = $[8];
  return textNode;
}
//@ chunk-hnxhr3bs.js:80895-80979 placement
function shouldShowFotw() {
  if (!parsePromoCampaign()?.command) return false;
  if (canClaimPromoCredit()) return promoCreditAmount() !== null;
  return shouldShowPromoUpsell();
}
//@ chunk-hnxhr3bs.js:80979-81195 placement
function getFeatureOfTheWeekContent(noticeImpressionEnabled) {
  let state = announcementState();
  if (state.fotwContent !== null) return state.fotwContent;
  if (!shouldShowFotw()) return null;
  let promoCampaign = parsePromoCampaign();
  if (!promoCampaign) return null;
  let content = {
    variant: canClaimPromoCredit() ? "credit" : "upsell",
    campaign: promoCampaign,
    cached: promoCreditAmount(),
  };
  if (noticeImpressionEnabled) state.fotwContent = content;
  return content;
}
//@ chunk-hnxhr3bs.js:81195-81405 placement
function FeatureOfTheWeekNotice() {
  let $ = useMemoCache(4);
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let content;
  if ($[0] !== noticeImpressionEnabled) {
    content = getFeatureOfTheWeekContent(noticeImpressionEnabled);
    $[0] = noticeImpressionEnabled;
    $[1] = content;
  } else content = $[1];
  let content_2 = content;
  if (content_2 === null) {
    return null;
  }
  let nudge;
  if ($[2] !== content_2.variant) {
    nudge = jsxProd_default(FeatureOfTheWeekNudge, {
      variant: content_2.variant,
    });
    $[2] = content_2.variant;
    $[3] = nudge;
  } else nudge = $[3];
  return nudge;
}
//@ chunk-hnxhr3bs.js:81405-83250 placement
function FeatureOfTheWeekNudge(props) {
  let $ = useMemoCache(24);
  let { variant } = props;
  let state;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    state = announcementState();
    $[0] = state;
  } else state = $[0];
  let fotwContent = state.fotwContent;
  let [fallback] = useState(fotwState);
  let campaign = fotwContent !== null ? fotwContent.campaign : fallback.campaign;
  let cached = fotwContent !== null ? fotwContent.cached : fallback.cached;
  let enabled = Boolean(campaign?.command) && (variant === "upsell" || cached !== null);
  let onShown;
  if ($[1] !== campaign || $[2] !== variant) {
    onShown = () => {
      if (!campaign) {
        return;
      }
      logEvent("tengu_fotw_nudge_shown", {
        feature: sanitizedMachineReasonForTelemetry(campaign.feature),
        campaign: lit("feature_of_the_week"),
        audience: lit(variant === "credit" ? "claimant" : "viewer"),
      });
    };
    $[1] = campaign;
    $[2] = variant;
    $[3] = onShown;
  } else onShown = $[3];
  let impressionOptions;
  if ($[4] !== enabled) {
    impressionOptions = {
      enabled,
    };
    $[4] = enabled;
    $[5] = impressionOptions;
  } else impressionOptions = $[5];
  useNoticeImpression("fotw-nudge", onShown, impressionOptions);
  if (!campaign?.command) {
    return null;
  }
  let showCommandChip = campaign.hideCommandChip !== true;
  let headline;
  if (
    $[6] !== campaign.announcementLines ||
    $[7] !== campaign.command ||
    $[8] !== campaign.commandBlurb ||
    $[9] !== campaign.titleLabel ||
    $[10] !== showCommandChip
  ) {
    headline = campaign.announcementLines?.length
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
            showCommandChip
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
            campaign.commandBlurb ? `${showCommandChip ? " \u2014 " : " "}${campaign.commandBlurb}` : "",
          ],
        });
    $[6] = campaign.announcementLines;
    $[7] = campaign.command;
    $[8] = campaign.commandBlurb;
    $[9] = campaign.titleLabel;
    $[10] = showCommandChip;
    $[11] = headline;
  } else headline = $[11];
  let headline_2 = headline;
  if (variant === "upsell") {
    let upsellBox;
    if ($[12] !== headline_2) {
      upsellBox = jsxProd_default(Box, {
        flexDirection: "column",
        children: headline_2,
      });
      $[12] = headline_2;
      $[13] = upsellBox;
    } else upsellBox = $[13];
    return upsellBox;
  }
  if (cached === null) {
    return null;
  }
  let amountText;
  if ($[14] !== cached.amountMinorUnits || $[15] !== cached.currency) {
    amountText = formatCurrency(cached.amountMinorUnits, cached.currency, "fit");
    $[14] = cached.amountMinorUnits;
    $[15] = cached.currency;
    $[16] = amountText;
  } else amountText = $[16];
  let amountText_2 = amountText;
  const redeemSuffix = campaign.redeemBy ? ` \xB7 Redeem by ${campaign.redeemBy}` : "";
  let creditLine;
  if ($[17] !== amountText_2 || $[18] !== redeemSuffix) {
    creditLine = jsxProd_default_2(Text, {
      children: ["Get ", amountText_2, " in usage credits when you run it", redeemSuffix],
    });
    $[17] = amountText_2;
    $[18] = redeemSuffix;
    $[19] = creditLine;
  } else creditLine = $[19];
  let termsLine;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    termsLine = jsxProd_default_2(Text, {
      dimColor: true,
      children: ["Terms apply: ", PROMOTION_TERMS_URL],
    });
    $[20] = termsLine;
  } else termsLine = $[20];
  let creditBox;
  if ($[21] !== headline_2 || $[22] !== creditLine) {
    creditBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [headline_2, creditLine, termsLine],
    });
    $[21] = headline_2;
    $[22] = creditLine;
    $[23] = creditBox;
  } else creditBox = $[23];
  return creditBox;
}
export { shouldShowFotw, FeatureOfTheWeekNotice };
