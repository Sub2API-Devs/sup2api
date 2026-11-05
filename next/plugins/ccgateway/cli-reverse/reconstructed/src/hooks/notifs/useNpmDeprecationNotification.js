/**
 * hooks/notifs/useNpmDeprecationNotification.tsx
 *
 * npm 安装方式弃用通知；本模块混入可信设备登记通知。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useNpmDeprecationNotification.tsx
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { useEffect } from "../../../vendor/react/cjs/react.production.js";
import { codeModeAccepted } from "../../utils/codeMode/accepted.js";

//@ chunk-czq1j3j2.js:1798860-1798886 affinity
var CODE_MODE_MODEL = "code-mode-model";
//@ chunk-czq1j3j2.js:1798886-1799144 fingerprint (2.1.88 match: _temp, 0.451)
function subscribeCodeModeNotices(session, addNotification, removeNotification) {
  useEffect(() => {
    if (codeModeAccepted()) {
      let { codeModeModelNotices } = require("../../utils/codeMode/codeModeModelNotices.lazy.js");
      return codeModeModelNotices.of(session).subscribe((notice) => {
        if (notice === null) {
          removeNotification(CODE_MODE_MODEL);
          return;
        }
        addNotification({
          key: CODE_MODE_MODEL,
          kind: "warning",
          text: notice,
          color: "warning",
          priority: "high",
          timeoutMs: 15000,
        });
      });
    }
    return;
  }, [session, addNotification, removeNotification]);
}
export { subscribeCodeModeNotices };
