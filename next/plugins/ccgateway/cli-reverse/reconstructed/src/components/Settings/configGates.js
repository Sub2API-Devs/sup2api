/**
 * components/Settings/configGates.ts
 *
 * 2.1.316 新增：设置页的小开关判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-44c3bx89.js (1)
 * attribution: placement 1
 */
import { isKairosPushEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";

//@ chunk-44c3bx89.js:300-341 placement
/**
 * 函数 shouldShowConfigGate（多项条件同时满足）。
 */
function shouldShowConfigGate() {
  return isKairosPushEnabled() && !isEssentialTrafficOnly() && hasStoredOAuthToken();
}
export { shouldShowConfigGate };
