/**
 * utils/authPortable.ts
 *
 * 可移植的认证辅助：从 macOS 钥匙串删除 API key。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/authPortable.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-5xgkngpb.js:103658-103753 fingerprint (2.1.88 match: maybeRemoveApiKeyFromMacOSKeychainThrows, 0.433)
function maybeRemoveApiKeyFromMacOSKeychainThrows(latest, previous) {
  return (
    latest.platform === previous.platform &&
    latest.shell === previous.shell &&
    latest.osVersion === previous.osVersion
  );
}
export { maybeRemoveApiKeyFromMacOSKeychainThrows };
