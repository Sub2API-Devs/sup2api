/**
 * components/LogoV2/GuestPassesUpsell.tsx
 *
 * 欢迎区 guest passes 推广：判定是否显示、计数并在 /passes 刷新后重置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/GuestPassesUpsell.tsx
 * pieces: chunk-ag5x7vhf.js (10)
 * attribution: placement 6, fingerprint 4
 */
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { Dt, at } from "./CondensedLogo.js";
import { y, Se, j } from "../../../vendor/react/cjs/react.production.js";
import { SlashLinkContexts } from "../SlashCommandLink.js";
import { env } from "../../utils/env.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import {
  getCachedRemainingPasses,
  checkCachedPassesEligibility,
  getCachedReferrerReward,
  formatMinorUnits,
} from "../../services/api/referral.js";
import { logEvent } from "../../services/analytics/index.js";
import { Me } from "../design-system/ThemeProvider.js";

//@ chunk-ag5x7vhf.js:78702-78730 placement
function W_() {
  return pickCompanyAnnouncement(!1);
}
//@ chunk-ag5x7vhf.js:78730-78802 placement
function hasCompanyAnnouncements() {
  let companyAnnouncements = getInitialSettings_2().companyAnnouncements;
  return !!companyAnnouncements && companyAnnouncements.some((h) => h);
}
//@ chunk-ag5x7vhf.js:78802-79096 placement
function pickCompanyAnnouncement(m) {
  let h = announcementState();
  if (h.companyAnnouncement !== null) return h.companyAnnouncement;
  let filtered = (getInitialSettings_2().companyAnnouncements ?? []).filter((k) => k);
  if (filtered.length === 0) return null;
  let T =
    getGlobalConfig().numStartups === 1 ? filtered[0] : filtered[Math.floor(Math.random() * filtered.length)];
  if (!T) return null;
  if (m) h.companyAnnouncement = T;
  return T;
}
//@ chunk-ag5x7vhf.js:79096-79655 placement
function CompanyAnnouncementNotice() {
  let m = w(10),
    h;
  if (m[0] === MEMO_CACHE_SENTINEL) ((h = getOauthAccountInfo()), (m[0] = h));
  else h = m[0];
  let x = h,
    T = Dt(),
    [k] = y(W_),
    _;
  if (m[1] !== T || m[2] !== k)
    ((_ = T ? pickCompanyAnnouncement(!0) : k), (m[1] = T), (m[2] = k), (m[3] = _));
  else _ = m[3];
  let I = _,
    D = Se(SlashLinkContexts);
  if (!I) {
    return null;
  }
  const A = D ? "center" : void 0;
  let L;
  if (m[4] === MEMO_CACHE_SENTINEL)
    ((L =
      !env.IS_DEMO &&
      x?.organizationName &&
      r(Text, { dimColor: !0, children: ["Message from ", x.organizationName, ":"] })),
      (m[4] = L));
  else L = m[4];
  let V;
  if (m[5] !== I) ((V = e(Text, { children: I })), (m[5] = I), (m[6] = V));
  else V = m[6];
  let W;
  if (m[7] !== A || m[8] !== V)
    ((W = r(Box, { flexDirection: "column", alignItems: A, children: [L, V] })),
      (m[7] = A),
      (m[8] = V),
      (m[9] = W));
  else W = m[9];
  return W;
}
//@ chunk-ag5x7vhf.js:79655-79841 fingerprint = resetIfPassesRefreshed (1)
function resetIfPassesRefreshed(m) {
  let remaining = getCachedRemainingPasses();
  if (remaining == null || remaining <= 0) return;
  let lastSeen = getGlobalConfig().passesLastSeenRemaining ?? 0;
  if (remaining > lastSeen)
    saveGlobalConfig(
      (prev) => ({
        ...prev,
        passesUpsellSeenCount: 0,
        hasVisitedPasses: !1,
        passesLastSeenRemaining: remaining,
      }),
      m,
    );
}
//@ chunk-ag5x7vhf.js:79841-80009 fingerprint = shouldShowGuestPassesUpsell (1)
function shouldShowGuestPassesUpsell(m) {
  let { eligible: eligible, hasCache: hasCache } = checkCachedPassesEligibility();
  if (!eligible || !hasCache) return !1;
  resetIfPassesRefreshed(m);
  let config = getGlobalConfig();
  if ((config.passesUpsellSeenCount ?? 0) >= 3) return !1;
  if (config.hasVisitedPasses) return !1;
  return !0;
}
//@ chunk-ag5x7vhf.js:80009-80161 fingerprint = incrementGuestPassesSeenCount (1)
function incrementGuestPassesSeenCount(m) {
  let newCount = 0;
  (saveGlobalConfig(
    (prev) => (
      (newCount = (prev.passesUpsellSeenCount ?? 0) + 1),
      { ...prev, passesUpsellSeenCount: newCount }
    ),
    m,
  ),
    logEvent("tengu_guest_passes_upsell_shown", { seen_count: newCount }));
}
//@ chunk-ag5x7vhf.js:80161-80518 fingerprint = GuestPassesUpsell (0.607)
function GuestPassesUpsell() {
  let $ = w(1),
    t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    let reward = getCachedReferrerReward();
    t0 = r(Text, {
      dimColor: !0,
      children: [
        e(Text, { color: "claude", children: "[\u273B]" }),
        " ",
        e(Text, { color: "claude", children: "[\u273B]" }),
        " ",
        e(Text, { color: "claude", children: "[\u273B]" }),
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
//@ chunk-ag5x7vhf.js:80518-80708 placement
function GuestPassesNotice() {
  let h = w(3),
    { storageV5: storageV5 } = Me(),
    x;
  if (h[0] !== storageV5)
    ((x = () => incrementGuestPassesSeenCount(storageV5)), (h[0] = storageV5), (h[1] = x));
  else x = h[1];
  at("guest-passes", x);
  let k;
  if (h[2] === MEMO_CACHE_SENTINEL) ((k = e(Box, { children: e(GuestPassesUpsell, {}) })), (h[2] = k));
  else k = h[2];
  return k;
}
//@ chunk-ag5x7vhf.js:80708-80712 placement
j();

export { hasCompanyAnnouncements, CompanyAnnouncementNotice, shouldShowGuestPassesUpsell, GuestPassesNotice };
