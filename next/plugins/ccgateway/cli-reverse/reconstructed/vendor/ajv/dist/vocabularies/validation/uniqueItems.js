/**
 * ajv/dist/vocabularies/validation/uniqueItems.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_dataType_2 } from "../../compile/validate/dataType.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";
import { require_equal } from "../../runtime/equal.js";

//@ chunk-xcs4sv9h.js:89001-90404 cjs-fingerprint
var require_uniqueItems = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var dataType_1 = require_dataType_2();
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var equal_1 = require_equal();
  var error = {
    message: ({ params: { i, j } }) =>
      codegen_1.str`must NOT have duplicate items (items ## ${j} and ${i} are identical)`,
    params: ({ params: { i, j } }) => codegen_1._`{i: ${i}, j: ${j}}`,
  };
  var def = {
    keyword: "uniqueItems",
    type: "array",
    schemaType: "boolean",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, $data, schema, parentSchema, schemaCode, it } = cxt;
      if (!$data && !schema) return;
      let valid = gen.let("valid");
      let itemTypes = parentSchema.items ? dataType_1.getSchemaTypes(parentSchema.items) : [];
      cxt.block$data(valid, validateUniqueItems, codegen_1._`${schemaCode} === false`);
      cxt.ok(valid);
      function validateUniqueItems() {
        let i = gen.let("i", codegen_1._`${data}.length`);
        let j = gen.let("j");
        cxt.setParams({
          i,
          j,
        });
        gen.assign(valid, true);
        gen.if(codegen_1._`${i} > 1`, () => (canOptimize() ? loopN : loopN2)(i, j));
      }
      function canOptimize() {
        return itemTypes.length > 0 && !itemTypes.some((t) => t === "object" || t === "array");
      }
      function loopN(i, j) {
        let item = gen.name("item");
        let wrongType = dataType_1.checkDataTypes(
          itemTypes,
          item,
          it.opts.strictNumbers,
          dataType_1.DataType.Wrong,
        );
        let indices = gen.const("indices", codegen_1._`{}`);
        gen.for(codegen_1._`;${i}--;`, () => {
          gen.let(item, codegen_1._`${data}[${i}]`);
          gen.if(wrongType, codegen_1._`continue`);
          if (itemTypes.length > 1)
            gen.if(codegen_1._`typeof ${item} == "string"`, codegen_1._`${item} += "_"`);
          gen
            .if(codegen_1._`typeof ${indices}[${item}] == "number"`, () => {
              gen.assign(j, codegen_1._`${indices}[${item}]`);
              cxt.error();
              gen.assign(valid, false).break();
            })
            .code(codegen_1._`${indices}[${item}] = ${i}`);
        });
      }
      function loopN2(i, j) {
        let eql = util_1.useFunc(gen, equal_1.default);
        let outer = gen.name("outer");
        gen.label(outer).for(codegen_1._`;${i}--;`, () =>
          gen.for(codegen_1._`${j} = ${i}; ${j}--;`, () =>
            gen.if(codegen_1._`${eql}(${data}[${i}], ${data}[${j}])`, () => {
              cxt.error();
              gen.assign(valid, false).break(outer);
            }),
          ),
        );
      }
    },
  };
  cjsExports.default = def;
});
export { require_uniqueItems };
