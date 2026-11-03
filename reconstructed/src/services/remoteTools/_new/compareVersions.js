/**
 * services/remoteTools/_new/compareVersions.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: sole-consumer-new 1
 */
import { order } from "../../../utils/semver.js";

//@ chunk-aepeg2w5.js:221076-221109 sole-consumer-new
function compareVersions(e, n) {
  return order(e, n);
}

export { compareVersions };
