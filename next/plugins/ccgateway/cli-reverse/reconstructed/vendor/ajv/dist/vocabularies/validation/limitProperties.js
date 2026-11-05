/**
 * ajv/dist/vocabularies/validation/limitProperties.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";

//@ chunk-xcs4sv9h.js:86590-87116 cjs-fingerprint
var require_limitProperties = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var error = {
    message({ keyword, schemaCode }) {
      return codegen_1.str`must NOT have ${keyword === "maxProperties" ? "more" : "fewer"} than ${schemaCode} properties`;
    },
    params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
  };
  var def = {
    keyword: ["maxProperties", "minProperties"],
    type: "object",
    schemaType: "number",
    $data: true,
    error,
    code(cxt) {
      let { keyword, data, schemaCode } = cxt;
      let op = keyword === "maxProperties" ? codegen_1.operators.GT : codegen_1.operators.LT;
      cxt.fail$data(codegen_1._`Object.keys(${data}).length ${op} ${schemaCode}`);
    },
  };
  cjsExports.default = def;
});
export { require_limitProperties };
