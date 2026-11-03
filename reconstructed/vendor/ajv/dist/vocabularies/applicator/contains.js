/**
 * ajv/dist/vocabularies/applicator/contains.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:94968-96663 cjs-fingerprint
var require_contains = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var error = {
    message: ({ params: { min, max } }) =>
      max === undefined
        ? codegen_1.str`must contain at least ${min} valid item(s)`
        : codegen_1.str`must contain at least ${min} and no more than ${max} valid item(s)`,
    params: ({ params: { min, max } }) =>
      max === undefined
        ? codegen_1._`{minContains: ${min}}`
        : codegen_1._`{minContains: ${min}, maxContains: ${max}}`,
  };
  var def = {
    keyword: "contains",
    type: "array",
    schemaType: ["object", "boolean"],
    before: "uniqueItems",
    trackErrors: true,
    error,
    code(cxt) {
      let { gen, schema, parentSchema, data, it } = cxt;
      let min;
      let max;
      let { minContains, maxContains } = parentSchema;
      if (it.opts.next) {
        min = minContains === undefined ? 1 : minContains;
        max = maxContains;
      } else min = 1;
      let len = gen.const("len", codegen_1._`${data}.length`);
      cxt.setParams({
        min,
        max,
      });
      if (max === undefined && min === 0) {
        util_1.checkStrictMode(it, '"minContains" == 0 without "maxContains": "contains" keyword ignored');
        return;
      }
      if (max !== undefined && min > max) {
        util_1.checkStrictMode(it, '"minContains" > "maxContains" is always invalid');
        cxt.fail();
        return;
      }
      if (util_1.alwaysValidSchema(it, schema)) {
        let cond = codegen_1._`${len} >= ${min}`;
        if (max !== undefined) cond = codegen_1._`${cond} && ${len} <= ${max}`;
        cxt.pass(cond);
        return;
      }
      it.items = true;
      let valid = gen.name("valid");
      if (max === undefined && min === 1) validateItems(valid, () => gen.if(valid, () => gen.break()));
      else if (min === 0) {
        gen.let(valid, true);
        if (max !== undefined) gen.if(codegen_1._`${data}.length > 0`, validateItemsWithCount);
      } else {
        gen.let(valid, false);
        validateItemsWithCount();
      }
      cxt.result(valid, () => cxt.reset());
      function validateItemsWithCount() {
        let schValid = gen.name("_valid");
        let count = gen.let("count", 0);
        validateItems(schValid, () => gen.if(schValid, () => checkLimits(count)));
      }
      function validateItems(_valid, block) {
        gen.forRange("i", 0, len, (i) => {
          cxt.subschema(
            {
              keyword: "contains",
              dataProp: i,
              dataPropType: util_1.Type.Num,
              compositeRule: true,
            },
            _valid,
          );
          block();
        });
      }
      function checkLimits(count) {
        gen.code(codegen_1._`${count}++`);
        if (max === undefined) gen.if(codegen_1._`${count} >= ${min}`, () => gen.assign(valid, true).break());
        else {
          gen.if(codegen_1._`${count} > ${max}`, () => gen.assign(valid, false).break());
          if (min === 1) gen.assign(valid, true);
          else gen.if(codegen_1._`${count} >= ${min}`, () => gen.assign(valid, true));
        }
      }
    },
  };
  cjsExports.default = def;
});
export { require_contains };
