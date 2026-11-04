/**
 * ajv/dist/vocabularies/applicator/additionalItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:92118-93166 cjs-fingerprint
var require_additionalItems = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateAdditionalItems = undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var error = {
    message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
    params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
  };
  var def = {
    keyword: "additionalItems",
    type: "array",
    schemaType: ["boolean", "object"],
    before: "uniqueItems",
    error,
    code(cxt) {
      let { parentSchema, it } = cxt;
      let { items } = parentSchema;
      if (!Array.isArray(items)) {
        util_1.checkStrictMode(it, '"additionalItems" is ignored when "items" is not an array of schemas');
        return;
      }
      validateAdditionalItems(cxt, items);
    },
  };
  function validateAdditionalItems(cxt, items) {
    let { gen, schema, data, keyword, it } = cxt;
    it.items = true;
    let len = gen.const("len", codegen_1._`${data}.length`);
    if (schema === false) {
      cxt.setParams({
        len: items.length,
      });
      cxt.pass(codegen_1._`${len} <= ${items.length}`);
    } else if (typeof schema == "object" && !util_1.alwaysValidSchema(it, schema)) {
      let valid = gen.var("valid", codegen_1._`${len} <= ${items.length}`);
      gen.if(codegen_1.not(valid), () => validateItems(valid));
      cxt.ok(valid);
    }
    function validateItems(valid) {
      gen.forRange("i", items.length, len, (i) => {
        cxt.subschema(
          {
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num,
          },
          valid,
        );
        if (!it.allErrors) gen.if(codegen_1.not(valid), () => gen.break());
      });
    }
  }
  cjsExports.validateAdditionalItems = validateAdditionalItems;
  cjsExports.default = def;
});
export { require_additionalItems };
