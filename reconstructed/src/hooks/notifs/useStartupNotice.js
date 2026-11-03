/**
 * hooks/notifs/useStartupNotice.tsx
 *
 * 2.1.316 新增：把 GrowthBook 开关 tengu_startup_notice 的文字显示成一条限时高优先级通知，值变化时更新、清空时移除。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { useNotifications } from "../../context/notifications.js";
import { P } from "../../../vendor/react/cjs/react.production.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";

//@ chunk-18hwfzwa.js:1810038-1810063 placement
var STARTUP_NOTICE_KEY = "startup-notice";
//@ chunk-18hwfzwa.js:1810063-1810342 placement = useKeybindingWarnings (0.463)
/**
 * 把 GrowthBook tengu_startup_notice 的文字显示成 30 秒的高优先级警告通知，值变化时更新、清空时移除。
 */
function useStartupNotice() {
  let { addNotification, removeNotification } = useNotifications();
  P(() => {
    let D = "";
    let L = () => {
      let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_startup_notice", "");
      if (featureValue_CACHED_MAY_BE_STALE === D) return;
      D = featureValue_CACHED_MAY_BE_STALE;
      if (!featureValue_CACHED_MAY_BE_STALE) {
        removeNotification(STARTUP_NOTICE_KEY);
        return;
      }
      addNotification({
        key: STARTUP_NOTICE_KEY,
        text: featureValue_CACHED_MAY_BE_STALE,
        color: "warning",
        priority: "high",
        timeoutMs: 30000,
        fold: (ke, Re) => Re,
      });
    };
    L();
    return onGrowthBookRefresh(L);
  }, [addNotification, removeNotification]);
}
export { useStartupNotice };
