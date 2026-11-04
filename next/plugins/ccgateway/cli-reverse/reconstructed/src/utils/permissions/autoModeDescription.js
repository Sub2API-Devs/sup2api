/**
 * utils/permissions/autoModeDescription.ts
 *
 * 2.1.316 新增：auto mode 的介绍文本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-w1graenk.js (2)
 * attribution: placement 2
 */
import { getSubscriptionType } from "../auth.js";

//@ chunk-w1graenk.js:3307-3863 placement
/**
 * auto mode 的介绍文本。
 */
var AUTO_MODE_DESCRIPTION =
  "Auto mode lets Claude handle permission prompts automatically \u2014 Claude checks each tool call for risky actions and prompt injection before executing. Actions Claude identifies as safe are executed, while actions Claude identifies as risky are blocked and Claude may try a different approach. Ideal for long-running tasks.";
var EXPENSIVE_SESSIONS_NOTE = "Sessions are slightly more expensive.";
var AUTO_MODE_RISK_NOTE =
  "Claude can make mistakes that allow harmful commands to run, it's recommended to only use in isolated environments. Shift+Tab to change mode.";
var AUTO_MODE_DESCRIPTION_FULL = `${AUTO_MODE_DESCRIPTION} ${EXPENSIVE_SESSIONS_NOTE} ${AUTO_MODE_RISK_NOTE}`;
var AUTO_MODE_DESCRIPTION_SHORT = `${AUTO_MODE_DESCRIPTION} ${AUTO_MODE_RISK_NOTE}`;
//@ chunk-w1graenk.js:3863-3931 placement (2.1.88 match: hasOpusAccess, 0.86)
function hasOpusAccess() {
  let subscriptionType = getSubscriptionType();
  return subscriptionType === "pro" || subscriptionType === "max" || subscriptionType === "team"
    ? AUTO_MODE_DESCRIPTION_SHORT
    : AUTO_MODE_DESCRIPTION_FULL;
}
export { hasOpusAccess };
