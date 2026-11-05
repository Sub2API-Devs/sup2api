/**
 * ajv/dist/vocabularies/applicator/items.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_code_2 } from "../code.js";

//@ chunk-xcs4sv9h.js:93166-94228 cjs-fingerprint
var require_items = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateTuple = undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var code_1 = require_code_2();
  var def = {
    keyword: "items",
    type: "array",
    schemaType: ["object", "array", "boolean"],
    before: "uniqueItems",
    code(cxt) {
      let { schema, it } = cxt;
      if (Array.isArray(schema)) return validateTuple(cxt, "additionalItems", schema);
      it.items = true;
      if (util_1.alwaysValidSchema(it, schema)) return;
      cxt.ok(code_1.validateArray(cxt));
    },
  };
  function validateTuple(cxt, extraItems, schArr = cxt.schema) {
    let { gen, parentSchema, data, keyword, it } = cxt;
    checkStrictTuple(parentSchema);
    if (it.opts.unevaluated && schArr.length && it.items !== true)
      it.items = util_1.mergeEvaluated.items(gen, schArr.length, it.items);
    let valid = gen.name("valid");
    let len = gen.const("len", codegen_1._`${data}.length`);
    schArr.forEach((sch, i) => {
      if (util_1.alwaysValidSchema(it, sch)) return;
      gen.if(codegen_1._`${len} > ${i}`, () =>
        cxt.subschema(
          {
            keyword,
            schemaProp: i,
            dataProp: i,
          },
          valid,
        ),
      );
      cxt.ok(valid);
    });
    function checkStrictTuple(sch) {
      let { opts, errSchemaPath } = it;
      let l = schArr.length;
      let fullTuple = l === sch.minItems && (l === sch.maxItems || sch[extraItems] === false);
      if (opts.strictTuples && !fullTuple) {
        let msg = `"${keyword}" is ${l}-tuple, but minItems or maxItems/${extraItems} are not specified or different at path "${errSchemaPath}"`;
        util_1.checkStrictMode(it, msg, opts.strictTuples);
      }
    }
  }
  cjsExports.validateTuple = validateTuple;
  cjsExports.default = def;
});
export { require_items };
