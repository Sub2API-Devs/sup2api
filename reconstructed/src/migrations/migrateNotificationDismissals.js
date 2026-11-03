/**
 * migrations/migrateNotificationDismissals.ts
 *
 * 2.1.316 新增：迁移：把订阅切换通知的关闭计数迁移到新的通知关闭记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cjydagjy.js (2)
 * attribution: placement 2
 */
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";

//@ chunk-cjydagjy.js:10044-10101 placement
var NOTIFICATION_DISMISSAL_KEYS = { "subscription-switch": "subscriptionNoticeCount" };
/**
 * 316 新增迁移：subscriptionNoticeCount 等通知计数 → seenNotifications。
 */
//@ chunk-cjydagjy.js:10101-10386 placement
function migrateNotificationDismissals(e) {
  let r = getGlobalConfig();
  if (r.seenNotifications !== void 0) return;
  let n = {};
  for (let [s, S] of Object.entries(NOTIFICATION_DISMISSAL_KEYS)) {
    let y = r[S];
    if (typeof y === "number" && y > 0) n[s] = y;
    else if (y === !0) n[s] = 1;
  }
  (saveGlobalConfig((s) => (s.seenNotifications !== void 0 ? s : { ...s, seenNotifications: n }), e),
    logFeatureOk("migration_notification_dismissals"));
}

export { migrateNotificationDismissals };
