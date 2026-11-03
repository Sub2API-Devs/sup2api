/**
 * utils/permissions/bypassPermissionsAccepted.ts
 *
 * 2.1.316 新增：bypassPermissions 已接受标记。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8ryrpd67.js (1)
 * attribution: placement 1
 */
import { hasVouchedSkipDangerousModePermissionPrompt } from "../settings/settings.js";
import { getGlobalConfig } from "../config.js";

//@ chunk-8ryrpd67.js:264-337 placement
function nHt() {
  return (
    hasVouchedSkipDangerousModePermissionPrompt() || Boolean(getGlobalConfig().bypassPermissionsModeAccepted)
  );
}

export { nHt };
