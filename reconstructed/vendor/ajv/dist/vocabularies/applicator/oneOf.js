/**
 * ajv/dist/vocabularies/applicator/oneOf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:103296-104197 cjs-fingerprint
var require_oneOf = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var error = {
    message: "must match exactly one schema in oneOf",
    params: ({ params }) => codegen_1._`{passingSchemas: ${params.passing}}`,
  };
  var def = {
    keyword: "oneOf",
    schemaType: "array",
    trackErrors: true,
    error,
    code(cxt) {
      let { gen, schema, parentSchema, it } = cxt;
      if (!Array.isArray(schema)) throw Error("ajv implementation error");
      if (it.opts.discriminator && parentSchema.discriminator) return;
      let schArr = schema;
      let valid = gen.let("valid", false);
      let passing = gen.let("passing", null);
      let schValid = gen.name("_valid");
      cxt.setParams({
        passing,
      });
      gen.block(validateOneOf);
      cxt.result(
        valid,
        () => cxt.reset(),
        () => cxt.error(true),
      );
      function validateOneOf() {
        schArr.forEach((sch, i) => {
          let schCxt;
          if (util_1.alwaysValidSchema(it, sch)) gen.var(schValid, true);
          else
            schCxt = cxt.subschema(
              {
                keyword: "oneOf",
                schemaProp: i,
                compositeRule: true,
              },
              schValid,
            );
          if (i > 0)
            gen
              .if(codegen_1._`${schValid} && ${valid}`)
              .assign(valid, false)
              .assign(passing, codegen_1._`[${passing}, ${i}]`)
              .else();
          gen.if(schValid, () => {
            gen.assign(valid, true);
            gen.assign(passing, i);
            if (schCxt) cxt.mergeEvaluated(schCxt, codegen_1.Name);
          });
        });
      }
    },
  };
  cjsExports.default = def;
});
export { require_oneOf };
