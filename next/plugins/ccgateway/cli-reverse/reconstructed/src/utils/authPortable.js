/**
 * utils/authPortable.ts
 *
 * 可移植的认证辅助：从 macOS 钥匙串删除 API key。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/authPortable.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-e6aww6q8.js:100853-100948 fingerprint (2.1.88 match: maybeRemoveApiKeyFromMacOSKeychainThrows, 0.434)
function maybeRemoveApiKeyFromMacOSKeychainThrows(latest, previous) {
  return (
    latest.platform === previous.platform &&
    latest.shell === previous.shell &&
    latest.osVersion === previous.osVersion
  );
}
export { maybeRemoveApiKeyFromMacOSKeychainThrows };
