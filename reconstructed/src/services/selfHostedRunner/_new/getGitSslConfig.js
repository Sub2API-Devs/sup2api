/**
 * services/selfHostedRunner/_new/getGitSslConfig.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-t3sg9e26.js (1)
 * attribution: sole-consumer-new 1
 */
import { truncatePath } from "../../../utils/logoV2Utils.js";

//@ chunk-t3sg9e26.js:1014-1126 sole-consumer-new
function getGitSslConfig(e, n) {
  return {
    certificateFile: truncatePath(e, "GIT_SSL_CAINFO", n),
    skipVerification: truncatePath(e, "GIT_SSL_NO_VERIFY", n),
  };
}

export { getGitSslConfig };
