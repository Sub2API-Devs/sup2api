/**
 * es-set-tostringtag/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-set-tostringtag@2.1.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";
import { is } from "../get-intrinsic/index.js";
import { us } from "../has-tostringtag/shams.js";
import { fs } from "../hasown/index.js";
import { _t } from "../es-object-atoms/index.js";

//@ chunk-h6b7mazd.js:20651-21208 cjs-fingerprint
var ds = x(function (wp, ps) {
  var Ju = is(),
    ls = Ju("%Object.defineProperty%", !0),
    Ku = us()(),
    Xu = fs(),
    Yu = _t(),
    Tt = Ku ? Symbol.toStringTag : null;
  ps.exports = function (t, r) {
    var n = arguments.length > 2 && !!arguments[2] && arguments[2].force,
      o = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
    if ((typeof n < "u" && typeof n !== "boolean") || (typeof o < "u" && typeof o !== "boolean"))
      throw new Yu("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
    if (Tt && (n || !Xu(t, Tt)))
      if (ls) ls(t, Tt, { configurable: !o, enumerable: !1, value: r, writable: !1 });
      else t[Tt] = r;
  };
});

export { ds };
