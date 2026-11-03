/**
 * entities/lib/esm/decode_codepoint.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: entities@4.5.0
 * pieces: chunk-6ja29j2n.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-6ja29j2n.js:57157-57661 esm-layout
var Ee,
  bt = new Map([
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
  ]),
  Le =
    (Ee = String.fromCodePoint) !== null && Ee !== void 0
      ? Ee
      : function (e) {
          let t = "";
          if (e > 65535)
            ((e -= 65536), (t += String.fromCharCode(((e >>> 10) & 1023) | 55296)), (e = 56320 | (e & 1023)));
          return ((t += String.fromCharCode(e)), t);
        };
//@ chunk-6ja29j2n.js:57661-57771 esm-fingerprint
function Re(e) {
  var t;
  if ((e >= 55296 && e <= 57343) || e > 1114111) return 65533;
  return (t = bt.get(e)) !== null && t !== void 0 ? t : e;
}

export { Re, Le };
