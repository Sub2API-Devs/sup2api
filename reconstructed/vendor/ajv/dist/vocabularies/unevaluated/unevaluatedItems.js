/**
 * ajv/dist/vocabularies/unevaluated/unevaluatedItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 as require_codegen } from "../../compile/codegen/index.js";
import { require_util_2 as require_util } from "../../compile/util.js";

//@ chunk-1r4fv9mg.js:4567-5354 cjs-fingerprint
var require_unevaluatedItems = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen();
  var util_1 = require_util();
  var error = {
    message: ({ params: { len } }) => codegen_1.str`must NOT have more than ${len} items`,
    params: ({ params: { len } }) => codegen_1._`{limit: ${len}}`,
  };
  var def = {
    keyword: "unevaluatedItems",
    type: "array",
    schemaType: ["boolean", "object"],
    error,
    code(cxt) {
      let { gen, schema, data, it } = cxt;
      let items = it.items || 0;
      if (items === true) return;
      let len = gen.const("len", codegen_1._`${data}.length`);
      if (schema === false) {
        cxt.setParams({
          len: items,
        });
        cxt.fail(codegen_1._`${len} > ${items}`);
      } else if (typeof schema == "object" && !util_1.alwaysValidSchema(it, schema)) {
        let valid = gen.var("valid", codegen_1._`${len} <= ${items}`);
        gen.if(codegen_1.not(valid), () => validateItems(valid, items));
        cxt.ok(valid);
      }
      it.items = true;
      function validateItems(valid, from) {
        gen.forRange("i", from, len, (i) => {
          cxt.subschema(
            {
              keyword: "unevaluatedItems",
              dataProp: i,
              dataPropType: util_1.Type.Num,
            },
            valid,
          );
          if (!it.allErrors) gen.if(codegen_1.not(valid), () => gen.break());
        });
      }
    },
  };
  cjsExports.default = def;
});
export { require_unevaluatedItems };
