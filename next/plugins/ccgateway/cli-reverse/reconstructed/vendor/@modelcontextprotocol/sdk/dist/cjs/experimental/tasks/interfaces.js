/**
 * @modelcontextprotocol/sdk/dist/cjs/experimental/tasks/interfaces.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-efaj9q04.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-efaj9q04.js:11024-11092 esm-fingerprint
function isTerminal(status) {
  return status === "completed" || status === "failed" || status === "cancelled";
}
export { isTerminal };
