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

//@ chunk-e6aww6q8.js:100853-100948 fingerprint = maybeRemoveApiKeyFromMacOSKeychainThrows (0.434)
function maybeRemoveApiKeyFromMacOSKeychainThrows(latest, n) {
  return latest.platform === n.platform && latest.shell === n.shell && latest.osVersion === n.osVersion;
}
export { maybeRemoveApiKeyFromMacOSKeychainThrows };
