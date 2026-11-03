/**
 * @anthropic-ai/sdk/internal/qs/utils.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (4)
 * attribution: esm-fingerprint 3, esm-layout 1
 */
import { RFC1738 } from "./formats.mjs";
import { Ye } from "../utils/values.mjs";

//@ chunk-hwmsct5x.js:19193-19407 esm-fingerprint
var Wo = (e, n) => (
    (Wo = Object.hasOwn ?? Function.prototype.call.bind(Object.prototype.hasOwnProperty)),
    Wo(e, n)
  ),
  yt = (() => {
    let e = [];
    for (let n = 0; n < 256; ++n) e.push("%" + ((n < 16 ? "0" : "") + n.toString(16)).toUpperCase());
    return e;
  })();
//@ chunk-hwmsct5x.js:19407-20285 esm-fingerprint
var Wi = 1024,
  Ql = (e, n, r, s, h) => {
    if (e.length === 0) return e;
    let y = e;
    if (typeof e === "symbol") y = Symbol.prototype.toString.call(e);
    else if (typeof e !== "string") y = String(e);
    if (r === "iso-8859-1")
      return escape(y).replace(/%u[0-9a-f]{4}/gi, function (S) {
        return "%26%23" + parseInt(S.slice(2), 16) + "%3B";
      });
    let w = "";
    for (let S = 0; S < y.length; S += Wi) {
      let E = y.length >= Wi ? y.slice(S, S + Wi) : y,
        R = [];
      for (let L = 0; L < E.length; ++L) {
        let code = E.charCodeAt(L);
        if (
          code === 45 ||
          code === 46 ||
          code === 95 ||
          code === 126 ||
          (code >= 48 && code <= 57) ||
          (code >= 65 && code <= 90) ||
          (code >= 97 && code <= 122) ||
          (h === RFC1738 && (code === 40 || code === 41))
        ) {
          R[R.length] = E.charAt(L);
          continue;
        }
        if (code < 128) {
          R[R.length] = yt[code];
          continue;
        }
        if (code < 2048) {
          R[R.length] = yt[192 | (code >> 6)] + yt[128 | (code & 63)];
          continue;
        }
        if (code < 55296 || code >= 57344) {
          R[R.length] = yt[224 | (code >> 12)] + yt[128 | ((code >> 6) & 63)] + yt[128 | (code & 63)];
          continue;
        }
        ((L += 1),
          (code = 65536 + (((code & 1023) << 10) | (E.charCodeAt(L) & 1023))),
          (R[R.length] =
            yt[240 | (code >> 18)] +
            yt[128 | ((code >> 12) & 63)] +
            yt[128 | ((code >> 6) & 63)] +
            yt[128 | (code & 63)]));
      }
      w += R.join("");
    }
    return w;
  };
//@ chunk-hwmsct5x.js:20285-20411 esm-fingerprint
function isBufferLike(e) {
  if (!e || typeof e !== "object") return !1;
  return !!(e.constructor && e.constructor.isBuffer && e.constructor.isBuffer(e));
}
//@ chunk-hwmsct5x.js:20411-20512 esm-layout
function zi(e, n) {
  if (Ye(e)) {
    let r = [];
    for (let s = 0; s < e.length; s += 1) r.push(n(e[s]));
    return r;
  }
  return n(e);
}

export { Ql, zi, isBufferLike, Wo };
