/**
 * es-toolkit/dist/string/escape.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-cq05wh48.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-cq05wh48.js:14278-14345 esm-fingerprint
var HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
//@ chunk-cq05wh48.js:14345-14403 esm-fingerprint
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (match) => HTML_ESCAPES[match] ?? match);
}
export { escapeHtml };
