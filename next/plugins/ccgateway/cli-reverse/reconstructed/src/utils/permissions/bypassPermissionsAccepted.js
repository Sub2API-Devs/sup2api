/**
 * utils/permissions/bypassPermissionsAccepted.ts
 *
 * 2.1.316 新增：bypassPermissions 已接受标记。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5pbe9zgv.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { hasVouchedSkipDangerousModePermissionPrompt } from "../settings/settings.js";
import { getGlobalConfig } from "../config.js";

//@ chunk-5pbe9zgv.js:264-337 placement
/**
 * isBypassPermissionsAccepted：bypass 权限是否已被接受。
 */
function isBypassPermissionsAccepted() {
  return (
    hasVouchedSkipDangerousModePermissionPrompt() || Boolean(getGlobalConfig().bypassPermissionsModeAccepted)
  );
}
export { isBypassPermissionsAccepted };
