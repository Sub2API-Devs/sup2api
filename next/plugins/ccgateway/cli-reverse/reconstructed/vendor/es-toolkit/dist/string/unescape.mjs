/**
 * es-toolkit/dist/string/unescape.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-72da5r6r.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-72da5r6r.js:35249-35314 esm-fingerprint
var HTML_ENTITY_RE = /&(?:amp|lt|gt);/g;
var HTML_ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
};
export { HTML_ENTITY_RE, HTML_ENTITY_MAP };
