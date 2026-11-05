/**
 * entities/lib/esm/decode_codepoint.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: entities@4.5.0
 * pieces: chunk-p9ac6cnb.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-p9ac6cnb.js:57157-57661 esm-layout
var _a_2;
var decodeMap = new Map([
  [0, 65533],
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376],
]);
var fromCodePoint =
  (_a_2 = String.fromCodePoint) !== null && _a_2 !== undefined
    ? _a_2
    : function (codePoint) {
        let output = "";
        if (codePoint > 65535) {
          codePoint -= 65536;
          output += String.fromCharCode(((codePoint >>> 10) & 1023) | 55296);
          codePoint = 56320 | (codePoint & 1023);
        }
        output += String.fromCharCode(codePoint);
        return output;
      };
//@ chunk-p9ac6cnb.js:57661-57771 esm-fingerprint
function decodeCodePoint(codePoint) {
  var _a;
  if ((codePoint >= 55296 && codePoint <= 57343) || codePoint > 1114111) return 65533;
  return (_a = decodeMap.get(codePoint)) !== null && _a !== undefined ? _a : codePoint;
}
export { decodeCodePoint, fromCodePoint };
