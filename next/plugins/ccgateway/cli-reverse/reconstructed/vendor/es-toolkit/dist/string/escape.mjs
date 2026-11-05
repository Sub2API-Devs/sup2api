/**
 * es-toolkit/dist/string/escape.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-6ba0wca3.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-6ba0wca3.js:14314-14381 esm-fingerprint
var HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};
//@ chunk-6ba0wca3.js:14381-14439 esm-fingerprint
function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (match) => HTML_ESCAPES[match] ?? match);
}
export { escapeHtml };
