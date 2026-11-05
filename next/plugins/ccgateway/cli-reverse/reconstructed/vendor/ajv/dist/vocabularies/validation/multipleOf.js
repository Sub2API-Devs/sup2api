/**
 * ajv/dist/vocabularies/validation/multipleOf.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";

//@ chunk-xcs4sv9h.js:84514-85041 cjs-fingerprint
var require_multipleOf = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var error = {
    message: ({ schemaCode }) => codegen_1.str`must be multiple of ${schemaCode}`,
    params: ({ schemaCode }) => codegen_1._`{multipleOf: ${schemaCode}}`,
  };
  var def = {
    keyword: "multipleOf",
    type: "number",
    schemaType: "number",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, schemaCode, it } = cxt;
      let prec = it.opts.multipleOfPrecision;
      let res = gen.let("res");
      let invalid = prec
        ? codegen_1._`Math.abs(Math.round(${res}) - ${res}) > 1e-${prec}`
        : codegen_1._`${res} !== parseInt(${res})`;
      cxt.fail$data(codegen_1._`(${schemaCode} === 0 || (${res} = ${data}/${schemaCode}, ${invalid}))`);
    },
  };
  cjsExports.default = def;
});
export { require_multipleOf };
