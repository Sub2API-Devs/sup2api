/**
 * ajv/dist/vocabularies/dynamic/dynamicRef.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 as require_codegen } from "../../compile/codegen/index.js";
import { require_names } from "../../compile/names.js";
import { require_ref } from "../core/ref.js";

//@ chunk-1r4fv9mg.js:1267-1958 cjs-fingerprint
var require_dynamicRef = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.dynamicRef = undefined;
  var codegen_1 = require_codegen();
  var names_1 = require_names();
  var ref_1 = require_ref();
  var def = {
    keyword: "$dynamicRef",
    schemaType: "string",
    code: (cxt) => dynamicRef(cxt, cxt.schema),
  };
  function dynamicRef(cxt, ref) {
    let { gen, keyword, it } = cxt;
    if (ref[0] !== "#") throw Error(`"${keyword}" only supports hash fragment reference`);
    let anchor = ref.slice(1);
    if (it.allErrors) _dynamicRef();
    else {
      let valid = gen.let("valid", false);
      _dynamicRef(valid);
      cxt.ok(valid);
    }
    function _dynamicRef(valid) {
      if (it.schemaEnv.root.dynamicAnchors[anchor]) {
        let v = gen.let("_v", codegen_1._`${names_1.default.dynamicAnchors}${codegen_1.getProperty(anchor)}`);
        gen.if(v, _callRef(v, valid), _callRef(it.validateName, valid));
      } else _callRef(it.validateName, valid)();
    }
    function _callRef(validate, valid) {
      return valid
        ? () =>
            gen.block(() => {
              ref_1.callRef(cxt, validate);
              gen.let(valid, true);
            })
        : () => ref_1.callRef(cxt, validate);
    }
  }
  cjsExports.dynamicRef = dynamicRef;
  cjsExports.default = def;
});
export { require_dynamicRef };
