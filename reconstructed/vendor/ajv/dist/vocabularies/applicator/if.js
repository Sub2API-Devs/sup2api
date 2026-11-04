/**
 * ajv/dist/vocabularies/applicator/if.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:104592-105688 cjs-fingerprint
var require_if = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var error = {
    message: ({ params }) => codegen_1.str`must match "${params.ifClause}" schema`,
    params: ({ params }) => codegen_1._`{failingKeyword: ${params.ifClause}}`,
  };
  var def = {
    keyword: "if",
    schemaType: ["object", "boolean"],
    trackErrors: true,
    error,
    code(cxt) {
      let { gen, parentSchema, it } = cxt;
      if (parentSchema.then === undefined && parentSchema.else === undefined)
        util_1.checkStrictMode(it, '"if" without "then" and "else" is ignored');
      let hasThen = hasSchema(it, "then");
      let hasElse = hasSchema(it, "else");
      if (!hasThen && !hasElse) return;
      let valid = gen.let("valid", true);
      let schValid = gen.name("_valid");
      validateIf();
      cxt.reset();
      if (hasThen && hasElse) {
        let ifClause = gen.let("ifClause");
        cxt.setParams({
          ifClause,
        });
        gen.if(schValid, validateClause("then", ifClause), validateClause("else", ifClause));
      } else if (hasThen) gen.if(schValid, validateClause("then"));
      else gen.if(codegen_1.not(schValid), validateClause("else"));
      cxt.pass(valid, () => cxt.error(true));
      function validateIf() {
        let schCxt = cxt.subschema(
          {
            keyword: "if",
            compositeRule: true,
            createErrors: false,
            allErrors: false,
          },
          schValid,
        );
        cxt.mergeEvaluated(schCxt);
      }
      function validateClause(keyword, ifClause) {
        return () => {
          let schCxt = cxt.subschema(
            {
              keyword,
            },
            schValid,
          );
          gen.assign(valid, schValid);
          cxt.mergeValidEvaluated(schCxt, valid);
          if (ifClause) gen.assign(ifClause, codegen_1._`${keyword}`);
          else
            cxt.setParams({
              ifClause: keyword,
            });
        };
      }
    },
  };
  function hasSchema(it, keyword) {
    let schema = it.schema[keyword];
    return schema !== undefined && !util_1.alwaysValidSchema(it, schema);
  }
  cjsExports.default = def;
});
export { require_if };
