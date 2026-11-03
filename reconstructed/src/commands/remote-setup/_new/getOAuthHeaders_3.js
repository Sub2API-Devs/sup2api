/**
 * commands/remote-setup/_new/getOAuthHeaders_3.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3nztfxrw.js (1)
 * attribution: sole-consumer-new 1
 */
import { claudeCodeUserAgent } from "../../../utils/http.js";
import { Y9e } from "../../../selfHostedRunner/serverAutoMode.js";

//@ chunk-3nztfxrw.js:5177-5348 sole-consumer-new = getOAuthHeaders (0.778)
function getOAuthHeaders_3(accessToken) {
  return {
    "User-Agent": claudeCodeUserAgent(),
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
    "x-self-hosted-runner-version": Y9e,
  };
}

export { getOAuthHeaders_3 };
