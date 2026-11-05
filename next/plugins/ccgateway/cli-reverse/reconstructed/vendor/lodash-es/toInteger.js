/**
 * lodash-es/toInteger.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: lodash-es@4.17.22..4.18.1
 * pieces: chunk-k1t1w9mg.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { toNumberExport } from "./toNumber.js";

//@ chunk-k1t1w9mg.js:964-1286 placement
var INFINITY = 1 / 0;
var MAX_INTEGER = 179769313486231570000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000;
//@ chunk-k1t1w9mg.js:1286-1393 placement
function toFinite(value) {
  if (!value) return value === 0 ? value : 0;
  value = toNumberExport(value);
  if (value === INFINITY || value === -INFINITY) {
    var sign = value < 0 ? -1 : 1;
    return sign * MAX_INTEGER;
  }
  return value === value ? value : 0;
}
//@ chunk-k1t1w9mg.js:1393-1401 placement
var toFiniteExport = toFinite;
//@ chunk-k1t1w9mg.js:1401-1455 placement
function toInteger(value) {
  var finiteExport = toFiniteExport(value);
  var remainder = finiteExport % 1;
  return finiteExport === finiteExport ? (remainder ? finiteExport - remainder : finiteExport) : 0;
}
//@ chunk-k1t1w9mg.js:1455-1465 placement
var toInteger_default = toInteger;
export { toInteger_default };
