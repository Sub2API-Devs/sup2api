/**
 * jose/dist/browser/runtime/base64url.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (3)
 * attribution: esm-layout 2, esm-fingerprint 1
 */
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { Ie } from "../../node/esm/lib/buffer_utils.js";

//@ chunk-2tyrgda4.js:1175-1197 esm-layout
var l,
  C,
  le = 4294967296;
//@ chunk-2tyrgda4.js:1197-1254 esm-layout
var v = Xa(() => {
  Ie();
  ((l = new TextEncoder()), (C = new TextDecoder()));
});
//@ chunk-2tyrgda4.js:1254-1828 esm-fingerprint
var ur = (e) => {
    let t = e;
    if (typeof t === "string") t = l.encode(t);
    let r = 32768,
      o = [];
    for (let n = 0; n < t.length; n += r) o.push(String.fromCharCode.apply(null, t.subarray(n, n + r)));
    return btoa(o.join(""));
  },
  w = (e) => ur(e).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_"),
  lr = (e) => {
    let t = atob(e),
      uint8Array = new Uint8Array(t.length);
    for (let o = 0; o < t.length; o++) uint8Array[o] = t.charCodeAt(o);
    return uint8Array;
  },
  S = (e) => {
    let t = e;
    if (t instanceof Uint8Array) t = C.decode(t);
    t = t.replace(/-/g, "+").replace(/_/g, "/").replace(/\s/g, "");
    try {
      return lr(t);
    } catch (error) {
      throw TypeError("The input to be decoded is not correctly encoded.");
    }
  };

export { l, le, v, w, S, C };
