/**
 * utils/permissions/currentPermissionContext.ts
 *
 * 2.1.316 新增：当前权限上下文
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xmjc6e38.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isColorCommandForceHidden } from "../../commands/color/index.js";

//@ chunk-xmjc6e38.js:228-255 placement
/**
 * currentToolPermissionContext：取当前工具权限上下文。
 */
function currentToolPermissionContext() {
  return isColorCommandForceHidden();
}
export { currentToolPermissionContext };
