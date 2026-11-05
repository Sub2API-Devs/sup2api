/**
 * ajv/dist/vocabularies/validation/limitItems.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";

//@ chunk-xcs4sv9h.js:88514-89001 cjs-fingerprint
var require_limitItems = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var error = {
    message({ keyword, schemaCode }) {
      return codegen_1.str`must NOT have ${keyword === "maxItems" ? "more" : "fewer"} than ${schemaCode} items`;
    },
    params: ({ schemaCode }) => codegen_1._`{limit: ${schemaCode}}`,
  };
  var def = {
    keyword: ["maxItems", "minItems"],
    type: "array",
    schemaType: "number",
    $data: true,
    error,
    code(cxt) {
      let { keyword, data, schemaCode } = cxt;
      let op = keyword === "maxItems" ? codegen_1.operators.GT : codegen_1.operators.LT;
      cxt.fail$data(codegen_1._`${data}.length ${op} ${schemaCode}`);
    },
  };
  cjsExports.default = def;
});
export { require_limitItems };
