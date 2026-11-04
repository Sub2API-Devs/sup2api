/**
 * bridge/bridgeDebug.ts
 *
 * 调试用故障注入
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/bridgeDebug.ts
 * pieces: chunk-cjydagjy.js (1)
 * attribution: fingerprint 1
 */
import { exitRefusingManagedConfig } from "../cli/managedConfigRefusal.js";

//@ chunk-cjydagjy.js:71821-71885 fingerprint (2.1.88 match: injectBridgeFault, 0.593)
function injectBridgeFault(errorType, message, reason) {
  return exitRefusingManagedConfig({
    message,
    reason,
    errorType,
  });
}
export { injectBridgeFault };
