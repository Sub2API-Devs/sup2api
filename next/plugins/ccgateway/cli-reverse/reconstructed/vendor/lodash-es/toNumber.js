/**
 * lodash-es/toNumber.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-k1t1w9mg.js (9)
 * attribution: placement 9
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSymbolAlias } from "./toString.js";
import { isObjectAlias } from "../@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";

//@ chunk-k1t1w9mg.js:457-468 placement
var reWhitespace = /\s/;
//@ chunk-k1t1w9mg.js:468-538 placement
function trimmedEndIndex(string) {
  var index = string.length;
  while (index-- && reWhitespace.test(string.charAt(index)));
  return index;
}
//@ chunk-k1t1w9mg.js:538-546 placement
var trimmedEndIndexExport = trimmedEndIndex;
//@ chunk-k1t1w9mg.js:546-559 placement
var reTrimStart = /^\s+/;
//@ chunk-k1t1w9mg.js:559-616 placement
function baseTrim(string) {
  return string ? string.slice(0, trimmedEndIndexExport(string) + 1).replace(reTrimStart, "") : string;
}
//@ chunk-k1t1w9mg.js:616-624 placement
var baseTrimExport = baseTrim;
//@ chunk-k1t1w9mg.js:624-699 placement
var NAN = NaN;
var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
var reIsBinary = /^0b[01]+$/i;
var reIsOctal = /^0o[0-7]+$/i;
var freeParseInt = parseInt;
//@ chunk-k1t1w9mg.js:699-954 placement
function toNumber(value) {
  if (typeof value == "number") return value;
  if (isSymbolAlias(value)) return NAN;
  if (isObjectAlias(value)) {
    var other = typeof value.valueOf == "function" ? value.valueOf() : value;
    value = isObjectAlias(other) ? other + "" : other;
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
//@ chunk-k1t1w9mg.js:954-964 placement
var toNumberExport = toNumber;
export { toNumberExport };
