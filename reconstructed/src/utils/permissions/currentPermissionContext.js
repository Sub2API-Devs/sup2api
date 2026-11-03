/**
 * utils/permissions/currentPermissionContext.ts
 *
 * 2.1.316 新增：当前权限上下文
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ged1ddrv.js (1)
 * attribution: placement 1
 */
import { isColorCommandForceHidden } from "../../commands/color/index.js";

//@ chunk-ged1ddrv.js:228-255 placement
/**
 * currentToolPermissionContext：取当前工具权限上下文。
 */
function currentToolPermissionContext() {
  return isColorCommandForceHidden();
}
export { currentToolPermissionContext };
