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
import { P } from "../../../vendor/react/cjs/react.production.js";

//@ chunk-18hwfzwa.js:433650-433876 callgraph-fingerprint = usePluginInstallationStatus (0.338)
function usePluginInstallationStatus(h, x, D, L, ee) {
  let { addNotification: addNotification, removeNotification: removeNotification } = useNotifications();
  P(() => {
    if (D === null) {
      removeNotification(h);
      return;
    }
    addNotification({
      key: h,
      kind: ee?.kind ?? "warning",
      color: ee?.color,
      wrap: ee?.wrap,
      priority: x,
      pinned: !0,
      jsx: L(D),
    });
  }, [D, h, x, L, ee, addNotification, removeNotification]);
}

export { usePluginInstallationStatus };
