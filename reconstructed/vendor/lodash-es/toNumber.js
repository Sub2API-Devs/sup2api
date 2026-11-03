/**
 * lodash-es/toNumber.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-bwbq4xvm.js (9)
 * attribution: placement 9
 */
import { isSymbolAlias } from "./toString.js";
import { RR } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-bwbq4xvm.js:149990-150002 placement
var reWhitespace = /\s/;
//@ chunk-bwbq4xvm.js:150002-150074 placement
function trimmedEndIndex(e) {
  var s = e.length;
  while (s-- && reWhitespace.test(e.charAt(s)));
  return s;
}
//@ chunk-bwbq4xvm.js:150074-150084 placement
var trimmedEndIndexExport = trimmedEndIndex;
//@ chunk-bwbq4xvm.js:150084-150098 placement
var reTrimStart = /^\s+/;
//@ chunk-bwbq4xvm.js:150098-150158 placement
function baseTrim(e) {
  return e ? e.slice(0, trimmedEndIndexExport(e) + 1).replace(reTrimStart, "") : e;
}
//@ chunk-bwbq4xvm.js:150158-150168 placement
var baseTrimExport = baseTrim;
//@ chunk-bwbq4xvm.js:150168-150248 placement
var NAN = NaN;
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
var reIsBinary = /^0b[01]+$/i;
var reIsOctal = /^0o[0-7]+$/i;
var freeParseInt = parseInt;
//@ chunk-bwbq4xvm.js:150248-150512 placement
function toNumber(value) {
  if (typeof value == "number") return value;
  if (isSymbolAlias(value)) return NAN;
  if (RR(value)) {
    var other = typeof value.valueOf == "function" ? value.valueOf() : value;
    value = RR(other) ? other + "" : other;
  }
  if (typeof value != "string") return value === 0 ? value : +value;
  value = baseTrimExport(value);
  var isBinary = reIsBinary.test(value);
  return isBinary || reIsOctal.test(value)
    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
    : reIsBadHex.test(value)
      ? NAN
      : +value;
}
//@ chunk-bwbq4xvm.js:150512-150523 placement
var toNumberExport = toNumber;
export { toNumberExport };
