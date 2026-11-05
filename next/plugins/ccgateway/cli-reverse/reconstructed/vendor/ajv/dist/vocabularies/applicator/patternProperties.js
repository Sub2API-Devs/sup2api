/**
 * ajv/dist/vocabularies/applicator/patternProperties.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_code_2 } from "../code.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-xcs4sv9h.js:101484-102646 cjs-fingerprint
var require_patternProperties = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var code_1 = require_code_2();
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var util_2 = require_util_2();
  var def = {
    keyword: "patternProperties",
    type: "object",
    schemaType: "object",
    code(cxt) {
      let { gen, schema, data, parentSchema, it } = cxt;
      let { opts } = it;
      let patterns = code_1.allSchemaProperties(schema);
      let alwaysValidPatterns = patterns.filter((pattern) => util_1.alwaysValidSchema(it, schema[pattern]));
      if (
        patterns.length === 0 ||
        (alwaysValidPatterns.length === patterns.length && (!it.opts.unevaluated || it.props === true))
      )
        return;
      let checkProperties = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties;
      let valid = gen.name("valid");
      if (it.props !== true && !(it.props instanceof codegen_1.Name))
        it.props = util_2.evaluatedPropsToName(gen, it.props);
      let { props } = it;
      validatePatternProperties();
      function validatePatternProperties() {
        for (let pat of patterns) {
          if (checkProperties) checkMatchingProperties(pat);
          if (it.allErrors) validateProperties(pat);
          else {
            gen.var(valid, true);
            validateProperties(pat);
            gen.if(valid);
          }
        }
      }
      function checkMatchingProperties(pat) {
        for (let prop in checkProperties)
          if (new RegExp(pat).test(prop))
            util_1.checkStrictMode(
              it,
              `property ${prop} matches pattern ${pat} (use allowMatchingProperties)`,
            );
      }
      function validateProperties(pat) {
        gen.forIn("key", data, (key) => {
          gen.if(codegen_1._`${code_1.usePattern(cxt, pat)}.test(${key})`, () => {
            let alwaysValid = alwaysValidPatterns.includes(pat);
            if (!alwaysValid)
              cxt.subschema(
                {
                  keyword: "patternProperties",
                  schemaProp: pat,
                  dataProp: key,
                  dataPropType: util_2.Type.Str,
                },
                valid,
              );
            if (it.opts.unevaluated && props !== true) gen.assign(codegen_1._`${props}[${key}]`, true);
            else if (!alwaysValid && !it.allErrors) gen.if(codegen_1.not(valid), () => gen.break());
          });
        });
      }
    },
  };
  cjsExports.default = def;
});
export { require_patternProperties };
