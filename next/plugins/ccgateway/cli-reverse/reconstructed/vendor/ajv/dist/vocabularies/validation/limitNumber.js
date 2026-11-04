/**
 * ajv/dist/vocabularies/validation/limitNumber.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:83864-84514 cjs-fingerprint
var require_limitNumber = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var ops = codegen_1.operators;
  var KWDs = {
    maximum: {
      okStr: "<=",
      ok: ops.LTE,
      fail: ops.GT,
    },
    minimum: {
      okStr: ">=",
      ok: ops.GTE,
      fail: ops.LT,
    },
    exclusiveMaximum: {
      okStr: "<",
      ok: ops.LT,
      fail: ops.GTE,
    },
    exclusiveMinimum: {
      okStr: ">",
      ok: ops.GT,
      fail: ops.LTE,
    },
  };
  var error = {
    message: ({ keyword, schemaCode }) => codegen_1.str`must be ${KWDs[keyword].okStr} ${schemaCode}`,
    params: ({ keyword, schemaCode }) =>
      codegen_1._`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
  };
  var def = {
    keyword: Object.keys(KWDs),
    type: "number",
    schemaType: "number",
    $data: true,
    error,
    code(cxt) {
      let { keyword, data, schemaCode } = cxt;
      cxt.fail$data(codegen_1._`${data} ${KWDs[keyword].fail} ${schemaCode} || isNaN(${data})`);
    },
  };
  cjsExports.default = def;
});
export { require_limitNumber };
