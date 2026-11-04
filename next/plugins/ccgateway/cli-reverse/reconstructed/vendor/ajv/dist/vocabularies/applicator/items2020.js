/**
 * ajv/dist/vocabularies/applicator/items2020.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_code_2 } from "../code.js";
import { require_additionalItems } from "./additionalItems.js";

//@ chunk-s82q9s4x.js:94448-94968 cjs-fingerprint
var require_items2020 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var code_1 = require_code_2();
  var additionalItems_1 = require_additionalItems();
  var error = {
    message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
    params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
  };
  var def = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    error,
    code(cxt) {
      let { schema, parentSchema, it } = cxt;
      let { prefixItems } = parentSchema;
      it.items = true;
      if (util_1.alwaysValidSchema(it, schema)) return;
      if (prefixItems) additionalItems_1.validateAdditionalItems(cxt, prefixItems);
      else cxt.ok(code_1.validateArray(cxt));
    },
  };
  cjsExports.default = def;
});
export { require_items2020 };
