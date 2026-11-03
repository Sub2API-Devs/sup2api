/**
 * hooks/useScreenReaderBell.ts
 *
 * 2.1.316 新增：返回一个回调：仅在开启屏幕阅读器时按最小间隔通过终端通知发出响铃（间隔按宿主记录）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: placement 1
 */
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useHost } from "../context/session.js";
import { ce } from "../../vendor/react/cjs/react.production.js";
import { claimOnceStore } from "../services/api/verificationRequired.js";
import { MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED } from "../bridge/inboundMessages.js";

//@ chunk-ah34pb7m.js:7917-8081 placement
/**
 * 返回一个回调：仅在开启屏幕阅读器时按最小间隔（Vv）通过终端通知发出响铃，间隔记录在每宿主的 claimOnceStore 里。
 */
function useScreenReaderBell() {
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let terminalNotification = useTerminalNotification();
  let host = useHost();
  return ce(() => {
    if (!isScreenReaderEnabled) return;
    let g = claimOnceStore.of(host);
    let now = Date.now();
    if (now - g.lastBellAt < MAX_LIST_ENTRIES_WITHOUT_UUID_LOGGED) return;
    g.lastBellAt = now;
    terminalNotification.notifyBell();
  }, [isScreenReaderEnabled, terminalNotification, host]);
}
export { useScreenReaderBell };
