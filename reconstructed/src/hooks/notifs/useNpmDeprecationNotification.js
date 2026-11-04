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
import { useEffect } from "../../../vendor/react/cjs/react.production.js";
import {
  takeAutomaticEnrollmentNotice,
  AUTOMATIC_ENROLLMENT_NOTICE,
  onAutomaticEnrollmentNotice,
} from "../../bridge/trustedDevice.js";
import { createSystemMessage } from "../../utils/messages.js";

//@ chunk-18hwfzwa.js:1623866-1624076 affinity
var TRUSTED_DEVICE_ENROLLED = "trusted-device-enrolled";
var trustedDeviceEnrolledNotice = {
  fact: "this computer was enrolled as a trusted device for your account",
  hint: " \xB7 you'll also get an email \xB7 not expected? review your devices in claude.ai settings",
};
//@ chunk-18hwfzwa.js:1624076-1624350 fingerprint = _temp (0.302)
function useTrustedDeviceEnrolledNotice(addNotification, transcript) {
  useEffect(() => {
    function listener() {
      if (!takeAutomaticEnrollmentNotice()) return;
      transcript.apply({
        type: "append",
        messages: [createSystemMessage(AUTOMATIC_ENROLLMENT_NOTICE, "notice")],
      });
      addNotification({
        key: TRUSTED_DEVICE_ENROLLED,
        kind: "event",
        segments: [
          {
            text: trustedDeviceEnrolledNotice.fact,
            color: "warning",
          },
          {
            text: trustedDeviceEnrolledNotice.hint,
            dim: true,
          },
        ],
        priority: "high",
        timeoutMs: 30000,
        fold: (previousNotice, nextNotice) => nextNotice,
      });
    }
    listener();
    return onAutomaticEnrollmentNotice(listener);
  }, [addNotification, transcript]);
}
export { useTrustedDeviceEnrolledNotice };
