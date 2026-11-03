/**
 * lodash-es/_hasUnicodeWord.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-8nhse09v.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Q } from "./_asciiWords.js";

//@ chunk-8nhse09v.js:3197-3205 esm-layout
var b = Q;
//@ chunk-8nhse09v.js:3205-3280 esm-fingerprint
var X = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
//@ chunk-8nhse09v.js:3280-3312 esm-layout
function ee(e) {
  return X.test(e);
}

export { ee, b };
