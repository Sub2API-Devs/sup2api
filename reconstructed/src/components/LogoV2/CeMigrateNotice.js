/**
 * components/LogoV2/CeMigrateNotice.tsx
 *
 * 2.1.316 新增：CE 迁移提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (9)
 * attribution: placement 9
 */
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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useNoticeImpressionEnabled, useNoticeImpression } from "./CondensedLogo.js";
import { y, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:89444-89472 placement
function getCeMigrateCohortCached() {
  return getCeMigrateCohort(false);
}
//@ chunk-ag5x7vhf.js:89472-89754 placement
var CE_MIGRATE_FLAG = "tengu_velvet_harbor_owl";
var HTTPS_CLAUDE_COM_ENTERPRISE = "https://claude.com/enterprise";
var replaced = HTTPS_CLAUDE_COM_ENTERPRISE.replace(/^https?:\/\//, "");
var CE_MIGRATE_ROLES = new Set(["admin", "billing", "owner", "primary_owner"]);
var CE_MIGRATE_COPY = {
  has_ce: {
    headline: "Get more out of Claude Code on Claude Enterprise",
    ctaLabel: "Learn more at ",
    ctaUrlText: replaced,
    ctaHref: HTTPS_CLAUDE_COM_ENTERPRISE,
  },
};
//@ chunk-ag5x7vhf.js:89754-89826 placement
function getCeMigrateGroup() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(CE_MIGRATE_FLAG, "off");
  return featureValue_CACHED_MAY_BE_STALE === "has_ce" || featureValue_CACHED_MAY_BE_STALE === "no_ce"
    ? featureValue_CACHED_MAY_BE_STALE
    : null;
}
//@ chunk-ag5x7vhf.js:89826-89885 placement
function canShowCeMigrateNotice() {
  return (getGlobalConfig().seenNotifications?.[CC_CE_MIGRATE] ?? 0) < CC_CE_MIGRATE_MAX_IMPRESSIONS_LIMIT;
}
//@ chunk-ag5x7vhf.js:89885-90083 placement
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
//@ chunk-ag5x7vhf.js:90083-90259 placement
function recordCeMigrateNoticeShown(m, storageV5) {
  saveGlobalConfig((x) => {
    let seenNotifications = x.seenNotifications ?? {};
    return {
      ...x,
      seenNotifications: {
        ...seenNotifications,
        [CC_CE_MIGRATE]: (seenNotifications[CC_CE_MIGRATE] ?? 0) + 1,
      },
    };
  }, storageV5);
  logEvent("tengu_cc_ce_migrate_notice_shown", {
    cohort_group: fromEnum(m),
  });
}
//@ chunk-ag5x7vhf.js:90259-90414 placement
function getCeMigrateCohort(m) {
  let h = announcementState();
  if (h.ccCeMigrateGroup !== undefined) return h.ccCeMigrateGroup;
  let ceMigrateGroup = getCeMigrateGroup();
  if (m && ceMigrateGroup !== null && CE_MIGRATE_COPY[ceMigrateGroup] !== undefined)
    h.ccCeMigrateGroup = ceMigrateGroup;
  return ceMigrateGroup;
}
//@ chunk-ag5x7vhf.js:90414-91252 placement
function CeMigrateNotice() {
  let T = w(17);
  let { storageV5 } = useTheme_2();
  let noticeImpressionEnabled = useNoticeImpressionEnabled();
  let [x] = y(getCeMigrateCohortCached);
  let k;
  if (T[0] !== noticeImpressionEnabled || T[1] !== x) {
    k = noticeImpressionEnabled ? getCeMigrateCohort(true) : x;
    T[0] = noticeImpressionEnabled;
    T[1] = x;
    T[2] = k;
  } else k = T[2];
  let _ = k;
  let I = _ !== null ? CE_MIGRATE_COPY[_] : undefined;
  let D;
  if (T[3] !== _ || T[4] !== storageV5) {
    D = () => {
      if (_ !== null) recordCeMigrateNoticeShown(_, storageV5);
    };
    T[3] = _;
    T[4] = storageV5;
    T[5] = D;
  } else D = T[5];
  let A = D;
  const enabled = I !== undefined;
  let V;
  if (T[6] !== enabled) {
    V = {
      enabled,
    };
    T[6] = enabled;
    T[7] = V;
  } else V = T[7];
  useNoticeImpression("cc-ce-migrate", A, V);
  if (!I) {
    return null;
  }
  let W;
  if (T[8] !== I.ctaHref || T[9] !== I.ctaUrlText) {
    W = jsxProd_default(Link, {
      url: I.ctaHref,
      children: I.ctaUrlText,
    });
    T[8] = I.ctaHref;
    T[9] = I.ctaUrlText;
    T[10] = W;
  } else W = T[10];
  let z;
  if (T[11] !== I.ctaLabel || T[12] !== W) {
    z = jsxProd_default_2(Text, {
      color: "text",
      dimColor: true,
      children: [" \xB7 ", I.ctaLabel, W],
    });
    T[11] = I.ctaLabel;
    T[12] = W;
    T[13] = z;
  } else z = T[13];
  let K;
  if (T[14] !== I.headline || T[15] !== z) {
    K = jsxProd_default(Box, {
      children: jsxProd_default_2(Text, {
        color: "suggestion",
        children: [I.headline, z],
      }),
    });
    T[14] = I.headline;
    T[15] = z;
    T[16] = K;
  } else K = T[16];
  return K;
}
//@ chunk-ag5x7vhf.js:91252-91256 placement
init_react_production();
export { shouldShowCeMigrateNotice, CeMigrateNotice };
