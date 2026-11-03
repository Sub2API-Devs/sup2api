/**
 * @smithy/util-uri-escape/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-uri-escape@2.2.0..3.0.0
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-hq88884p.js:4952-5166 cjs-fingerprint
var ahs = x(function (Xr) {
  var ot = (e) => encodeURIComponent(e).replace(/[!'()*]/g, qr),
    qr = (e) => `%${e.charCodeAt(0).toString(16).toUpperCase()}`,
    Kr = (e) => e.split("/").map(ot).join("/");
  Xr.escapeUri = ot;
  Xr.escapeUriPath = Kr;
});

export { ahs };
