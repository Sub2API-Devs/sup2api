/**
 * lodash-es/_asciiWords.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-8nhse09v.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { deburr } from "./deburr.js";

//@ chunk-8nhse09v.js:3103-3111 esm-layout
var deburr_default = deburr;
//@ chunk-8nhse09v.js:3111-3161 esm-fingerprint
var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
//@ chunk-8nhse09v.js:3161-3197 esm-layout
function asciiWords(string) {
  return string.match(reAsciiWord) || [];
}
export { asciiWords, deburr_default };
