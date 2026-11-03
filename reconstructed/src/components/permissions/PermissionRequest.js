/**
 * components/permissions/PermissionRequest.tsx
 *
 * 权限请求的通知副作用：等待超时后发系统通知（permission_prompt），对话框被遮挡时发 buried-idle-cue。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionRequest.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { useNotifyAfterTimeout } from "../../hooks/useNotifyAfterTimeout.js";

//@ chunk-18hwfzwa.js:1452925-1452984 fingerprint = PermissionRequest (0.307)
function usePermissionPromptNotification(h, x) {
  useNotifyAfterTimeout(h.text, h.type ?? "permission_prompt", x);
}

export { usePermissionPromptNotification };
