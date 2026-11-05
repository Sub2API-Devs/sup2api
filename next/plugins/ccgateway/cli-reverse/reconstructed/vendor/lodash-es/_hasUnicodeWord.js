/**
 * lodash-es/_hasUnicodeWord.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-47b8txen.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { asciiWords } from "./_asciiWords.js";

//@ chunk-47b8txen.js:3197-3205 esm-layout
var asciiWords_default = asciiWords;
//@ chunk-47b8txen.js:3205-3280 esm-fingerprint
var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
//@ chunk-47b8txen.js:3280-3312 esm-layout
function hasUnicodeWord(string) {
  return reHasUnicodeWord.test(string);
}
export { hasUnicodeWord, asciiWords_default };
