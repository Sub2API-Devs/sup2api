/**
 * get-proto/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-proto@1.0.1
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { nr, or } from "./Reflect.getPrototypeOf.js";
import { Go } from "../dunder-proto/get.js";

//@ chunk-h6b7mazd.js:11796-12047 cjs-fingerprint
var Qo = x(function (yp, Yo) {
  var Jo = nr(),
    Ko = or(),
    Xo = Go();
  Yo.exports = Jo
    ? function (t) {
        return Jo(t);
      }
    : Ko
      ? function (t) {
          if (!t || (typeof t !== "object" && typeof t !== "function"))
            throw TypeError("getProto: not an object");
          return Ko(t);
        }
      : Xo
        ? function (t) {
            return Xo(t);
          }
        : null;
});

export { Qo };
