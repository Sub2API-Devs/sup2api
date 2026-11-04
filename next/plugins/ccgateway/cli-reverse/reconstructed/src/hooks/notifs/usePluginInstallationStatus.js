/**
 * hooks/notifs/usePluginInstallationStatus.tsx
 *
 * 插件安装失败状态通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/usePluginInstallationStatus.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: callgraph-fingerprint 1
 */
import { useNotifications } from "../../context/notifications.js";
import { useEffect } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:433650-433876 callgraph-fingerprint (2.1.88 match: usePluginInstallationStatus, 0.338)
function usePluginInstallationStatus(noticeKey, priority, status, renderStatus, options) {
  let { addNotification, removeNotification } = useNotifications();
  useEffect(() => {
    if (status === null) {
      removeNotification(noticeKey);
      return;
    }
    addNotification({
      key: noticeKey,
      kind: options?.kind ?? "warning",
      color: options?.color,
      wrap: options?.wrap,
      priority,
      pinned: true,
      jsx: renderStatus(status),
    });
  }, [status, noticeKey, priority, renderStatus, options, addNotification, removeNotification]);
}
export { usePluginInstallationStatus };
