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
import { Me } from "../components/design-system/ThemeProvider.js";
import { y, P } from "../../vendor/react/cjs/react.production.js";
import { useInterval } from "../ink/components/Input.js";
import { Yhn } from "../utils/hooks/hookEvents.js";
import { gB } from "../utils/terminalProbe.js";

//@ chunk-18hwfzwa.js:1445194-1445250 file-local
function getTimeSinceLastInteraction(h, x) {
  return Date.now() - Math.max(getLastInteractionTime(), x) >= h;
}
//@ chunk-18hwfzwa.js:1445250-1445523 fingerprint = useNotifyAfterTimeout (1)
function useNotifyAfterTimeout(h, x, D) {
  let terminal = useTerminalNotification(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    [Re, Be] = y(!1),
    [He] = y(() => Date.now());
  (P(() => {
    Be(!1);
  }, [h, x, terminal]),
    useInterval(
      () => {
        if (!getTimeSinceLastInteraction(Yhn, He)) return;
        if ((Be(!0), D !== void 0 && !D())) return;
        gB({ message: h, notificationType: x }, terminal, { storageV5: storageV5, credentials: credentials });
      },
      Re ? null : Yhn,
    ));
}

export { useNotifyAfterTimeout };
