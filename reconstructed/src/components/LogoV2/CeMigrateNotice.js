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
import { CC_CE_MIGRATE, tHr } from "../../utils/subscriptionNoticeIds.js";
import { getOauthAccountInfo } from "../../utils/auth.js";
import { Xj } from "../../utils/sessionRestore.js";
import { getRootSession } from "../../bootstrap/state.js";
import { isActingAsBgJob } from "../../utils/concurrentSessions.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { Dt, at } from "./CondensedLogo.js";
import { y, j } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Link, Text, Box } from "../../ink/components/Text.js";

//@ chunk-ag5x7vhf.js:89444-89472 placement
function C0() {
  return getCeMigrateCohort(!1);
}
//@ chunk-ag5x7vhf.js:89472-89754 placement
var CE_MIGRATE_FLAG = "tengu_velvet_harbor_owl",
  HTTPS_CLAUDE_COM_ENTERPRISE = "https://claude.com/enterprise",
  replaced = HTTPS_CLAUDE_COM_ENTERPRISE.replace(/^https?:\/\//, ""),
  S0 = new Set(["admin", "billing", "owner", "primary_owner"]),
  Cl = {
    has_ce: {
      headline: "Get more out of Claude Code on Claude Enterprise",
      ctaLabel: "Learn more at ",
      ctaUrlText: replaced,
      ctaHref: HTTPS_CLAUDE_COM_ENTERPRISE,
    },
  };
//@ chunk-ag5x7vhf.js:89754-89826 placement
function hS() {
  let m = getFeatureValue_CACHED_MAY_BE_STALE(CE_MIGRATE_FLAG, "off");
  return m === "has_ce" || m === "no_ce" ? m : null;
}
//@ chunk-ag5x7vhf.js:89826-89885 placement
function w0() {
  return (getGlobalConfig().seenNotifications?.[CC_CE_MIGRATE] ?? 0) < tHr;
}
/**
 * 判断是否显示 CE 迁移提示：账号属于实验分组、组织角色在允许列表、满足显示条件，且不在后台任务或桥接重连会话里。
 */
//@ chunk-ag5x7vhf.js:89885-90083 placement
function shouldShowCeMigrateNotice() {
  let m = hS();
  if (m === null || Cl[m] === void 0) return !1;
  let h = getOauthAccountInfo()?.organizationRole;
  if (!h || !S0.has(h)) return !1;
  if (!w0()) return !1;
  return !Xj(getRootSession().host) && !isActingAsBgJob() && !env.CLAUDE_BRIDGE_REATTACH_SESSION;
}
//@ chunk-ag5x7vhf.js:90083-90259 placement
function recordCeMigrateNoticeShown(m, h) {
  (saveGlobalConfig((x) => {
    let T = x.seenNotifications ?? {};
    return { ...x, seenNotifications: { ...T, [CC_CE_MIGRATE]: (T[CC_CE_MIGRATE] ?? 0) + 1 } };
  }, h),
    logEvent("tengu_cc_ce_migrate_notice_shown", { cohort_group: fromEnum(m) }));
}
//@ chunk-ag5x7vhf.js:90259-90414 placement
function getCeMigrateCohort(m) {
  let h = announcementState();
  if (h.ccCeMigrateGroup !== void 0) return h.ccCeMigrateGroup;
  let x = hS();
  if (m && x !== null && Cl[x] !== void 0) h.ccCeMigrateGroup = x;
  return x;
}
//@ chunk-ag5x7vhf.js:90414-91252 placement
function CeMigrateNotice() {
  let T = w(17),
    { storageV5: storageV5 } = Me(),
    h = Dt(),
    [x] = y(C0),
    k;
  if (T[0] !== h || T[1] !== x) ((k = h ? getCeMigrateCohort(!0) : x), (T[0] = h), (T[1] = x), (T[2] = k));
  else k = T[2];
  let _ = k,
    I = _ !== null ? Cl[_] : void 0,
    D;
  if (T[3] !== _ || T[4] !== storageV5)
    ((D = () => {
      if (_ !== null) recordCeMigrateNoticeShown(_, storageV5);
    }),
      (T[3] = _),
      (T[4] = storageV5),
      (T[5] = D));
  else D = T[5];
  let A = D;
  const L = I !== void 0;
  let V;
  if (T[6] !== L) ((V = { enabled: L }), (T[6] = L), (T[7] = V));
  else V = T[7];
  if ((at("cc-ce-migrate", A, V), !I)) {
    return null;
  }
  let W;
  if (T[8] !== I.ctaHref || T[9] !== I.ctaUrlText)
    ((W = e(Link, { url: I.ctaHref, children: I.ctaUrlText })),
      (T[8] = I.ctaHref),
      (T[9] = I.ctaUrlText),
      (T[10] = W));
  else W = T[10];
  let z;
  if (T[11] !== I.ctaLabel || T[12] !== W)
    ((z = r(Text, { color: "text", dimColor: !0, children: [" \xB7 ", I.ctaLabel, W] })),
      (T[11] = I.ctaLabel),
      (T[12] = W),
      (T[13] = z));
  else z = T[13];
  let K;
  if (T[14] !== I.headline || T[15] !== z)
    ((K = e(Box, { children: r(Text, { color: "suggestion", children: [I.headline, z] }) })),
      (T[14] = I.headline),
      (T[15] = z),
      (T[16] = K));
  else K = T[16];
  return K;
}
//@ chunk-ag5x7vhf.js:91252-91256 placement
j();

export { shouldShowCeMigrateNotice, CeMigrateNotice };
