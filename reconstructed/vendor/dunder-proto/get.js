/**
 * dunder-proto/get.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: dunder-proto@1.0.1
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { Mo } from "../call-bind-apply-helpers/index.js";
import { tr } from "../gopd/index.js";

//@ chunk-h6b7mazd.js:11418-11796 cjs-fingerprint
var Go = x(function (mp, Wo) {
  var hu = Mo(),
    Ho = tr(),
    $o;
  try {
    $o = [].__proto__ === Array.prototype;
  } catch (error) {
    if (!error || typeof error !== "object" || !("code" in error) || error.code !== "ERR_PROTO_ACCESS")
      throw error;
  }
  var ir = !!$o && Ho && Ho(Object.prototype, "__proto__"),
    Vo = Object,
    getPrototypeOf = Vo.getPrototypeOf;
  Wo.exports =
    ir && typeof ir.get === "function"
      ? hu([ir.get])
      : typeof getPrototypeOf === "function"
        ? function (t) {
            return getPrototypeOf(t == null ? t : Vo(t));
          }
        : !1;
});

export { Go };
