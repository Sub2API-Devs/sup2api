/**
 * services/analytics/_new/telemetryCredentialGuard.helpers-aepe.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: sole-consumer-new 1
 */
import { Da } from "../telemetryCredentialGuard.js";
import { getSettingsSyncEndpoint } from "../../settingsSync/index.js";

//@ chunk-aepeg2w5.js:129758-129791 sole-consumer-new
function mD(e) {
  return Da(getSettingsSyncEndpoint(), e);
}

export { mD };
