/**
 * @modelcontextprotocol/sdk/dist/cjs/experimental/tasks/interfaces.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-zykv69v4.js (1)
 * attribution: esm-fingerprint 1
 */

//@ chunk-zykv69v4.js:11023-11091 esm-fingerprint
function isTerminal(status) {
  return status === "completed" || status === "failed" || status === "cancelled";
}
export { isTerminal };
