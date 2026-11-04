/**
 * hooks/useNotifyAfterTimeout.ts
 *
 * 等待用户输入超过阈值后发送终端/系统通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useNotifyAfterTimeout.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: file-local 1, fingerprint 1
 */
import { getLastInteractionTime } from "../bootstrap/state.js";
import { useTerminalNotification } from "../ink/useTerminalNotification.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useState, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useInterval } from "../ink/components/Input.js";
import { HOOK_PROGRESS_INTERVAL_MS } from "../utils/hooks/hookEvents.js";
import { notifyAsync } from "../utils/terminalProbe.js";

//@ chunk-18hwfzwa.js:1445194-1445250 file-local
function getTimeSinceLastInteraction(minimumIdleMs, sinceMs) {
  return Date.now() - Math.max(getLastInteractionTime(), sinceMs) >= minimumIdleMs;
}
//@ chunk-18hwfzwa.js:1445250-1445523 fingerprint (2.1.88 match: useNotifyAfterTimeout, 1)
function useNotifyAfterTimeout(text, notificationType, isActive) {
  let terminal = useTerminalNotification();
  let { storageV5, credentials } = useTheme_2();
  let [isNotifying, setIsNotifying] = useState(false);
  let [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    setIsNotifying(false);
  }, [text, notificationType, terminal]);
  useInterval(
    () => {
      if (!getTimeSinceLastInteraction(HOOK_PROGRESS_INTERVAL_MS, mountedAt)) return;
      setIsNotifying(true);
      if (isActive !== undefined && !isActive()) return;
      notifyAsync(
        {
          message: text,
          notificationType,
        },
        terminal,
        {
          storageV5,
          credentials,
        },
      );
    },
    isNotifying ? null : HOOK_PROGRESS_INTERVAL_MS,
  );
}
export { useNotifyAfterTimeout };
