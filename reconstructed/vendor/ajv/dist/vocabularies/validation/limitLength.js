/**
 * ajv/dist/vocabularies/validation/limitLength.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_ucs2length } from "../../runtime/ucs2length.js";

//@ chunk-s82q9s4x.js:85340-85927 cjs-fingerprint
var require_limitLength = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var ucs2length_1 = require_ucs2length();
  var error = {
    message({ keyword, schemaCode }) {
      return codegen_1.str`must NOT have ${keyword === "maxLength" ? "more" : "fewer"} than ${schemaCode} characters`;
    },
    params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
  };
  var def = {
    keyword: ["maxLength", "minLength"],
    type: "string",
    schemaType: "number",
    $data: true,
    error,
    code(cxt) {
      let { keyword, data, schemaCode, it } = cxt;
      let op = keyword === "maxLength" ? codegen_1.operators.GT : codegen_1.operators.LT;
      let len =
        it.opts.unicode === false
          ? codegen_1._`${data}.length`
          : codegen_1._`${util_1.useFunc(cxt.gen, ucs2length_1.default)}(${data})`;
      cxt.fail$data(codegen_1._`${len} ${op} ${schemaCode}`);
    },
  };
  cjsExports.default = def;
});
export { require_limitLength };
