/**
 * openid-client/lib/helpers/base64url.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:7302-7617 cjs-fingerprint
var vu = x(function (sF, iy) {
  var ry;
  if (Buffer.isEncoding("base64url")) ry = (e, t = "utf8") => Buffer.from(e, t).toString("base64url");
  else {
    let e = (t) => t.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
    ry = (t, n = "utf8") => e(Buffer.from(t, n).toString("base64"));
  }
  var oF = (e) => Buffer.from(e, "base64");
  sF.decode = oF;
  sF.encode = ry;
});

export { vu };
