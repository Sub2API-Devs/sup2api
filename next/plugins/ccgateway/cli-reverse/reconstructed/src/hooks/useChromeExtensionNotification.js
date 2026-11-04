/**
 * hooks/useChromeExtensionNotification.tsx
 *
 * Chrome 扩展相关通知（只剩小片段）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useChromeExtensionNotification.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { cancelQuotaAutoResume } from "../services/quotaAutoResume/quotaAutoResume.js";
import {
  QUOTA_AUTO_RESUME_CANCELLED,
  AUTO_CONTINUE_CANCELLED_TEXT,
} from "../components/rateLimit/quotaAutoResume.js";

//@ chunk-18hwfzwa.js:465224-465321 fingerprint (2.1.88 match: _temp, 0.576)
function cancelQuotaAutoResumeWithNotice(addNotification, gesture) {
  cancelQuotaAutoResume(gesture);
  addNotification({
    key: QUOTA_AUTO_RESUME_CANCELLED,
    kind: "feedback",
    text: AUTO_CONTINUE_CANCELLED_TEXT,
    priority: "immediate",
    timeoutMs: 8000,
  });
}
export { cancelQuotaAutoResumeWithNotice };
