/**
 * lodash-es/deburr.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-8nhse09v.js (2)
 * attribution: esm-fingerprint 1, esm-layout 1
 */
import { vde } from "./toString.js";
import { s } from "./_deburrLetter.js";

//@ chunk-8nhse09v.js:2893-3041 esm-fingerprint
var j = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g,
  H = "\\u0300-\\u036f",
  B = "\\ufe20-\\ufe2f",
  G = "\\u20d0-\\u20ff",
  J = H + B + G,
  V = "[" + J + "]",
  Y = RegExp(V, "g");
//@ chunk-8nhse09v.js:3041-3103 esm-layout
function q(e) {
  return ((e = vde(e)), e && e.replace(j, s).replace(Y, ""));
}

export { q };
