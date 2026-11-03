/**
 * hooks/notifs/useNpmDeprecationNotification.tsx
 *
 * npm 安装方式弃用通知；本模块混入可信设备登记通知。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/notifs/useNpmDeprecationNotification.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { P } from "../../../vendor/react/cjs/react.production.js";
import {
  takeAutomaticEnrollmentNotice,
  AUTOMATIC_ENROLLMENT_NOTICE,
  onAutomaticEnrollmentNotice,
} from "../../bridge/trustedDevice.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-18hwfzwa.js:1623866-1624076 affinity
var TRUSTED_DEVICE_ENROLLED = "trusted-device-enrolled",
  Rvt = {
    fact: "this computer was enrolled as a trusted device for your account",
    hint: " \xB7 you'll also get an email \xB7 not expected? review your devices in claude.ai settings",
  };
//@ chunk-18hwfzwa.js:1624076-1624350 fingerprint = _temp (0.302)
function useTrustedDeviceEnrolledNotice(h, x) {
  P(() => {
    function D() {
      if (!takeAutomaticEnrollmentNotice()) return;
      (x.apply({ type: "append", messages: [createSystemMessage(AUTOMATIC_ENROLLMENT_NOTICE, "notice")] }),
        h({
          key: TRUSTED_DEVICE_ENROLLED,
          kind: "event",
          segments: [
            { text: Rvt.fact, color: "warning" },
            { text: Rvt.hint, dim: !0 },
          ],
          priority: "high",
          timeoutMs: 30000,
          fold: (L, ee) => ee,
        }));
    }
    return (D(), onAutomaticEnrollmentNotice(D));
  }, [h, x]);
}

export { useTrustedDeviceEnrolledNotice };
