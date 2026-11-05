/**
 * components/LogoV2/GuestPassesUpsell.tsx
 *
 * 欢迎区 guest passes 推广：判定是否显示、计数并在 /passes 刷新后重置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/GuestPassesUpsell.tsx
 * pieces: chunk-hnxhr3bs.js (10)
 * attribution: placement 6, fingerprint 4
 */
import { init_react_production, useState, useContext } from "../../../vendor/react/cjs/react.production.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";
import { env } from "../../utils/env.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  getCachedRemainingPasses,
  checkCachedPassesEligibility,
  getCachedReferrerReward,
  formatMinorUnits,
} from "../../services/api/referral.js";
import { logEvent } from "../../services/analytics/index.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:78182-78186 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:78182", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:78186-78214 placement
function pickGuestPassAnnouncement() {
  return pickCompanyAnnouncement(false);
}
//@ chunk-hnxhr3bs.js:78214-78286 placement
function hasCompanyAnnouncements() {
  let companyAnnouncements = getInitialSettings().companyAnnouncements;
  return !!companyAnnouncements && companyAnnouncements.some((companyAnnouncement) => companyAnnouncement);
}
//@ chunk-hnxhr3bs.js:78286-78580 placement
function pickCompanyAnnouncement(cache) {
  let state = announcementState();
  if (state.companyAnnouncement !== null) return state.companyAnnouncement;
  let filtered = (getInitialSettings().companyAnnouncements ?? []).filter((announcement) => announcement);
  if (filtered.length === 0) return null;
  let picked =
    getGlobalConfig().numStartups === 1 ? filtered[0] : filtered[Math.floor(Math.random() * filtered.length)];
  if (!picked) return null;
  if (cache) state.companyAnnouncement = picked;
  return picked;
}
//@ chunk-hnxhr3bs.js:78580-79139 placement
function CompanyAnnouncementNotice() {
  let $ = useMemoCache(10);
  let account;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    account = getOauthAccountInfo();
    $[0] = account;
  } else account = $[0];
  let account_2 = account;
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let [cachedAnnouncement] = useState(pickGuestPassAnnouncement);
  let announcement;
  if ($[1] !== noticeImpressionEnabled || $[2] !== cachedAnnouncement) {
    announcement = noticeImpressionEnabled ? pickCompanyAnnouncement(true) : cachedAnnouncement;
    $[1] = noticeImpressionEnabled;
    $[2] = cachedAnnouncement;
    $[3] = announcement;
  } else announcement = $[3];
  let announcement_2 = announcement;
  let linkContexts = useContext(SlashLinkContexts);
  if (!announcement_2) {
    return null;
  }
  const alignItems = linkContexts ? "center" : undefined;
  let fromLine;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    fromLine =
      !env.IS_DEMO &&
      account_2?.organizationName &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Message from ", account_2.organizationName, ":"],
      });
    $[4] = fromLine;
  } else fromLine = $[4];
  let messageText;
  if ($[5] !== announcement_2) {
    messageText = jsxProd_default(Text, {
      children: announcement_2,
    });
    $[5] = announcement_2;
    $[6] = messageText;
  } else messageText = $[6];
  let notice;
  if ($[7] !== alignItems || $[8] !== messageText) {
    notice = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems,
      children: [fromLine, messageText],
    });
    $[7] = alignItems;
    $[8] = messageText;
    $[9] = notice;
  } else notice = $[9];
  return notice;
}
//@ chunk-hnxhr3bs.js:79139-79325 fingerprint (2.1.88 match: resetIfPassesRefreshed, 1)
function resetIfPassesRefreshed(storageV5) {
  let remaining = getCachedRemainingPasses();
  if (remaining == null || remaining <= 0) return;
  let lastSeen = getGlobalConfig().passesLastSeenRemaining ?? 0;
  if (remaining > lastSeen)
    saveGlobalConfig(
      (prev) => ({
        ...prev,
        passesUpsellSeenCount: 0,
        hasVisitedPasses: false,
        passesLastSeenRemaining: remaining,
      }),
      storageV5,
    );
}
//@ chunk-hnxhr3bs.js:79325-79493 fingerprint (2.1.88 match: shouldShowGuestPassesUpsell, 1)
function shouldShowGuestPassesUpsell(storageV5) {
  let { eligible, hasCache } = checkCachedPassesEligibility();
  if (!eligible || !hasCache) return false;
  resetIfPassesRefreshed(storageV5);
  let config = getGlobalConfig();
  if ((config.passesUpsellSeenCount ?? 0) >= 3) return false;
  if (config.hasVisitedPasses) return false;
  return true;
}
//@ chunk-hnxhr3bs.js:79493-79645 fingerprint (2.1.88 match: incrementGuestPassesSeenCount, 1)
function incrementGuestPassesSeenCount(storageV5) {
  let newCount = 0;
  saveGlobalConfig((prev) => {
    newCount = (prev.passesUpsellSeenCount ?? 0) + 1;
    return {
      ...prev,
      passesUpsellSeenCount: newCount,
    };
  }, storageV5);
  logEvent("tengu_guest_passes_upsell_shown", {
    seen_count: newCount,
  });
}
//@ chunk-hnxhr3bs.js:79645-80002 fingerprint (2.1.88 match: GuestPassesUpsell, 0.607)
function GuestPassesUpsell() {
  let $ = useMemoCache(1);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let reward = getCachedReferrerReward();
    t0 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        jsxProd_default(Text, {
          color: "claude",
          children: "[\u273B]",
        }),
        " ",
        jsxProd_default(Text, {
          color: "claude",
          children: "[\u273B]",
        }),
        " ",
        jsxProd_default(Text, {
          color: "claude",
          children: "[\u273B]",
        }),
        " \xB7",
        " ",
        reward
          ? `Share Claude Code and earn ${formatMinorUnits(reward)} in usage credits \xB7 /passes`
          : "3 guest passes at /passes",
      ],
    });
    $[0] = t0;
  } else t0 = $[0];
  return t0;
}
//@ chunk-hnxhr3bs.js:80002-80192 placement
function GuestPassesNotice() {
  let $ = useMemoCache(3);
  let { storageV5 } = useTheme_2();
  let onShown;
  if ($[0] !== storageV5) {
    onShown = () => incrementGuestPassesSeenCount(storageV5);
    $[0] = storageV5;
    $[1] = onShown;
  } else onShown = $[1];
  useNoticeImpression("guest-passes", onShown);
  let upsell;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    upsell = jsxProd_default(Box, {
      children: jsxProd_default(GuestPassesUpsell, {}),
    });
    $[2] = upsell;
  } else upsell = $[2];
  return upsell;
}
export { hasCompanyAnnouncements, CompanyAnnouncementNotice, shouldShowGuestPassesUpsell, GuestPassesNotice };
