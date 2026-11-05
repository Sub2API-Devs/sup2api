/**
 * components/Settings/configGates.ts
 *
 * 2.1.316 新增：设置页的小开关判定
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h281hkvs.js (1)
 * attribution: placement 1
 */
import { isKairosPushEnabled } from "../../tools/PushNotificationTool/prompt.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";

//@ chunk-h281hkvs.js:300-341 placement
/**
 * 函数 shouldShowConfigGate（多项条件同时满足）。
 */
function shouldShowConfigGate() {
  return isKairosPushEnabled() && !isEssentialTrafficOnly() && hasStoredOAuthToken();
}
export { shouldShowConfigGate };
