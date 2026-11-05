/**
 * bridge/bridgeDebug.ts
 *
 * 调试用故障注入
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeDebug.ts
 * pieces: chunk-h61dq9nz.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { exitRefusingManagedConfig } from "../cli/managedConfigRefusal.js";

//@ chunk-h61dq9nz.js:73711-73775 placement
function exitRefusingBridgeFailure(errorType, message, reason) {
  return exitRefusingManagedConfig({
    message,
    reason,
    errorType,
  });
}
export { exitRefusingBridgeFailure };
