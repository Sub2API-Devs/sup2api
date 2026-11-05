/**
 * es-set-tostringtag/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: es-set-tostringtag@2.1.0
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { require_get_intrinsic } from "../get-intrinsic/index.js";
import { require_shams_2 } from "../has-tostringtag/shams.js";
import { require_hasown } from "../hasown/index.js";
import { require_es_object_atoms_7 } from "../es-object-atoms/index.js";

//@ chunk-ww9agm6g.js:20651-21208 cjs-fingerprint
var require_es_set_tostringtag = __commonJS(function (cjsExports, cjsModule) {
  var GetIntrinsic = require_get_intrinsic();
  var $defineProperty = GetIntrinsic("%Object.defineProperty%", true);
  var hasToStringTag = require_shams_2()();
  var hasOwn = require_hasown();
  var $TypeError = require_es_object_atoms_7();
  var toStringTag = hasToStringTag ? Symbol.toStringTag : null;
  cjsModule.exports = function (object, value) {
    var overrideIfSet = arguments.length > 2 && !!arguments[2] && arguments[2].force;
    var nonConfigurable = arguments.length > 2 && !!arguments[2] && arguments[2].nonConfigurable;
    if (
      (typeof overrideIfSet !== "undefined" && typeof overrideIfSet !== "boolean") ||
      (typeof nonConfigurable !== "undefined" && typeof nonConfigurable !== "boolean")
    )
      throw new $TypeError("if provided, the `overrideIfSet` and `nonConfigurable` options must be booleans");
    if (toStringTag && (overrideIfSet || !hasOwn(object, toStringTag)))
      if ($defineProperty)
        $defineProperty(object, toStringTag, {
          configurable: !nonConfigurable,
          enumerable: false,
          value,
          writable: false,
        });
      else object[toStringTag] = value;
  };
});
export { require_es_set_tostringtag };
