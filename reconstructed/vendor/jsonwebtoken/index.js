/**
 * jsonwebtoken/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jsonwebtoken@9.0.1
 * pieces: chunk-mrx6y2r5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { ic } from "./decode.js";
import { Xh } from "./verify.js";
import { Mf } from "./sign.js";
import { vo } from "./lib/JsonWebTokenError.js";
import { sc } from "./lib/NotBeforeError.js";
import { ac } from "./lib/TokenExpiredError.js";

//@ chunk-mrx6y2r5.js:22157-22297 cjs-fingerprint
var Uf = x(function (gL, Df) {
  Df.exports = {
    decode: ic(),
    verify: Xh(),
    sign: Mf(),
    JsonWebTokenError: vo(),
    NotBeforeError: sc(),
    TokenExpiredError: ac(),
  };
});

export { Uf };
