/**
 * components/permissions/PermissionRequest.tsx
 *
 * 权限请求的通知副作用：等待超时后发系统通知（permission_prompt），对话框被遮挡时发 buried-idle-cue。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionRequest.tsx
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useNotifyAfterTimeout } from "../../hooks/useNotifyAfterTimeout.js";

//@ chunk-czq1j3j2.js:1494019-1494078 fingerprint (2.1.88 match: PermissionRequest, 0.307)
function usePermissionPromptNotification(notification, delayMs) {
  useNotifyAfterTimeout(notification.text, notification.type ?? "permission_prompt", delayMs);
}
export { usePermissionPromptNotification };
