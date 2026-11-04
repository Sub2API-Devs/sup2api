/**
 * ajv/dist/vocabularies/validation/const.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_equal } from "../../runtime/equal.js";

//@ chunk-s82q9s4x.js:90404-90833 cjs-fingerprint
var require_const = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var equal_1 = require_equal();
  var error = {
    message: "must be equal to constant",
    params: ({ schemaCode }) => codegen_1._`{allowedValue: ${schemaCode}}`,
  };
  var def = {
    keyword: "const",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, $data, schemaCode, schema } = cxt;
      if ($data || (schema && typeof schema == "object"))
        cxt.fail$data(codegen_1._`!${util_1.useFunc(gen, equal_1.default)}(${data}, ${schemaCode})`);
      else cxt.fail(codegen_1._`${schema} !== ${data}`);
    },
  };
  cjsExports.default = def;
});
export { require_const };
