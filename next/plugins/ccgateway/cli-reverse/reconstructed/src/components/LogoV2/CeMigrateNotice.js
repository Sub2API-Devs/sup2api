/**
 * components/LogoV2/CeMigrateNotice.tsx
 *
 * 2.1.316 新增：CE 迁移提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (9)
 * attribution: placement 9
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { CC_CE_MIGRATE, CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT } from "../../utils/subscriptionNoticeIds.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { isSessionRestored } from "../../utils/sessionRestore.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:87661-87665 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hnxhr3bs.js:87661", () => {
  init_react_production();
});
//@ chunk-hnxhr3bs.js:92361-92389 placement
function getCeMigrateCohortCached() {
  return getCeMigrateCohort(false);
}
//@ chunk-hnxhr3bs.js:92389-92671 placement
var CE_MIGRATE_FLAG; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var HTTPS_CLAUDE_COM_ENTERPRISE;
var replaced;
var CE_MIGRATE_ROLES;
var CE_MIGRATE_COPY;
deferInit("chunk-hnxhr3bs.js:92389", () => {
  CE_MIGRATE_FLAG = "tengu_velvet_harbor_owl";
  HTTPS_CLAUDE_COM_ENTERPRISE = "https://claude.com/enterprise";
  replaced = HTTPS_CLAUDE_COM_ENTERPRISE.replace(/^https?:\/\//, "");
  CE_MIGRATE_ROLES = new Set(["admin", "billing", "owner", "primary_owner"]);
  CE_MIGRATE_COPY = {
    has_ce: {
      headline: "Get more out of Claude Code on Claude Enterprise",
      ctaLabel: "Learn more at ",
      ctaUrlText: replaced,
      ctaHref: HTTPS_CLAUDE_COM_ENTERPRISE,
    },
  };
});
//@ chunk-hnxhr3bs.js:92671-92743 placement
function getCeMigrateGroup() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(CE_MIGRATE_FLAG, "off");
  return featureValue_CACHED_MAY_BE_STALE === "has_ce" || featureValue_CACHED_MAY_BE_STALE === "no_ce"
    ? featureValue_CACHED_MAY_BE_STALE
    : null;
}
//@ chunk-hnxhr3bs.js:92743-92802 placement
function canShowCeMigrateNotice() {
  return (getGlobalConfig().seenNotifications?.[CC_CE_MIGRATE] ?? 0) < CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT;
}
//@ chunk-hnxhr3bs.js:92802-93000 placement
/**
 * 判断是否显示 CE 迁移提示：账号属于实验分组、组织角色在允许列表、满足显示条件，且不在后台任务或桥接重连会话里。
 */
function shouldShowCeMigrateNotice() {
  let ceMigrateGroup = getCeMigrateGroup();
  if (ceMigrateGroup === null || CE_MIGRATE_COPY[ceMigrateGroup] === undefined) return false;
  let organizationRole = getOauthAccountInfo()?.organizationRole;
  if (!organizationRole || !CE_MIGRATE_ROLES.has(organizationRole)) return false;
  if (!canShowCeMigrateNotice()) return false;
  return (
    !isSessionRestored(getRootSession().host) && !isActingAsBgJob() && !env.CLAUDE_BRIDGE_REATTACH_SESSION
  );
}
//@ chunk-hnxhr3bs.js:93000-93176 placement
function recordCeMigrateNoticeShown(cohort, storageV5) {
  saveGlobalConfig((config) => {
    let seenNotifications = config.seenNotifications ?? {};
    return {
      ...config,
      seenNotifications: {
        ...seenNotifications,
        [CC_CE_MIGRATE]: (seenNotifications[CC_CE_MIGRATE] ?? 0) + 1,
      },
    };
  }, storageV5);
  logEvent("tengu_cc_ce_migrate_notice_shown", {
    cohort_group: fromEnum(cohort),
  });
}
//@ chunk-hnxhr3bs.js:93176-93331 placement
function getCeMigrateCohort(enabled) {
  let state = announcementState();
  if (state.ccCeMigrateGroup !== undefined) return state.ccCeMigrateGroup;
  let ceMigrateGroup = getCeMigrateGroup();
  if (enabled && ceMigrateGroup !== null && CE_MIGRATE_COPY[ceMigrateGroup] !== undefined)
    state.ccCeMigrateGroup = ceMigrateGroup;
  return ceMigrateGroup;
}
//@ chunk-hnxhr3bs.js:93331-94169 placement
function CeMigrateNotice() {
  let $ = useMemoCache(17);
  let { storageV5 } = useTheme_2();
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let [cachedCohort] = useState(getCeMigrateCohortCached);
  let cohort;
  if ($[0] !== noticeImpressionEnabled || $[1] !== cachedCohort) {
    cohort = noticeImpressionEnabled ? getCeMigrateCohort(true) : cachedCohort;
    $[0] = noticeImpressionEnabled;
    $[1] = cachedCohort;
    $[2] = cohort;
  } else cohort = $[2];
  let cohort_2 = cohort;
  let copy = cohort_2 !== null ? CE_MIGRATE_COPY[cohort_2] : undefined;
  let onShown;
  if ($[3] !== cohort_2 || $[4] !== storageV5) {
    onShown = () => {
      if (cohort_2 !== null) recordCeMigrateNoticeShown(cohort_2, storageV5);
    };
    $[3] = cohort_2;
    $[4] = storageV5;
    $[5] = onShown;
  } else onShown = $[5];
  let onShown_2 = onShown;
  const enabled = copy !== undefined;
  let impressionOptions;
  if ($[6] !== enabled) {
    impressionOptions = {
      enabled,
    };
    $[6] = enabled;
    $[7] = impressionOptions;
  } else impressionOptions = $[7];
  useNoticeImpression("cc-ce-migrate", onShown_2, impressionOptions);
  if (!copy) {
    return null;
  }
  let link;
  if ($[8] !== copy.ctaHref || $[9] !== copy.ctaUrlText) {
    link = jsxProd_default(Link, {
      url: copy.ctaHref,
      children: copy.ctaUrlText,
    });
    $[8] = copy.ctaHref;
    $[9] = copy.ctaUrlText;
    $[10] = link;
  } else link = $[10];
  let ctaText;
  if ($[11] !== copy.ctaLabel || $[12] !== link) {
    ctaText = jsxProd_default_2(Text, {
      color: "text",
      dimColor: true,
      children: [" \xB7 ", copy.ctaLabel, link],
    });
    $[11] = copy.ctaLabel;
    $[12] = link;
    $[13] = ctaText;
  } else ctaText = $[13];
  let box;
  if ($[14] !== copy.headline || $[15] !== ctaText) {
    box = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "suggestion",
        children: [copy.headline, ctaText],
      }),
    });
    $[14] = copy.headline;
    $[15] = ctaText;
    $[16] = box;
  } else box = $[16];
  return box;
}
export { shouldShowCeMigrateNotice, CeMigrateNotice };
