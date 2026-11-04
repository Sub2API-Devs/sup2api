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
var NOTIFICATION_DISMISSAL_KEYS = {
  "subscription-switch": "subscriptionNoticeCount",
};
//@ chunk-cjydagjy.js:10101-10386 placement
/**
 * 316 新增迁移：subscriptionNoticeCount 等通知计数 → seenNotifications。
 */
function migrateNotificationDismissals(context) {
  let globalConfig = getGlobalConfig();
  if (globalConfig.seenNotifications !== undefined) return;
  let seenNotifications = {};
  for (let [key, value] of Object.entries(NOTIFICATION_DISMISSAL_KEYS)) {
    let dismissCount = globalConfig[value];
    if (typeof dismissCount === "number" && dismissCount > 0) seenNotifications[key] = dismissCount;
    else if (dismissCount === true) seenNotifications[key] = 1;
  }
  saveGlobalConfig(
    (config) =>
      config.seenNotifications !== undefined
        ? config
        : {
            ...config,
            seenNotifications,
          },
    context,
  );
  logFeatureOk("migration_notification_dismissals");
}
export { migrateNotificationDismissals };
