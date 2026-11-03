/**
 * hooks/useScreenReaderBell.ts
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
import { Vv } from "../bridge/inboundMessages.js";

/**
 * 返回一个回调：仅在开启屏幕阅读器时按最小间隔（Vv）通过终端通知发出响铃，间隔记录在每宿主的 claimOnceStore 里。
 */
//@ chunk-ah34pb7m.js:7917-8081 placement
function useScreenReaderBell() {
  let m = useIsScreenReaderEnabled(),
    d = useTerminalNotification(),
    c = useHost();
  return ce(() => {
    if (!m) return;
    let of = claimOnceStore.of(c),
      now = Date.now();
    if (now - of.lastBellAt < Vv) return;
    ((of.lastBellAt = now), d.notifyBell());
  }, [m, d, c]);
}

export { useScreenReaderBell };
