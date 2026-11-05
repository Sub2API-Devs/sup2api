/**
 * ajv/dist/vocabularies/validation/required.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_code_2 } from "../code.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-xcs4sv9h.js:87116-88514 cjs-fingerprint
var require_required = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var code_1 = require_code_2();
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var error = {
    message: ({ params: { missingProperty } }) =>
      codegen_1.str`must have required property '${missingProperty}'`,
    params: ({ params: { missingProperty } }) => codegen_1._`{missingProperty: ${missingProperty}}`,
  };
  var def = {
    keyword: "required",
    type: "object",
    schemaType: "array",
    $data: true,
    error,
    code(cxt) {
      let { gen, schema, schemaCode, data, $data, it } = cxt;
      let { opts } = it;
      if (!$data && schema.length === 0) return;
      let useLoop = schema.length >= opts.loopRequired;
      if (it.allErrors) allErrorsMode();
      else exitOnErrorMode();
      if (opts.strictRequired) {
        let props = cxt.parentSchema.properties;
        let { definedProperties } = cxt.it;
        for (let requiredKey of schema)
          if (
            (props === null || props === undefined ? undefined : props[requiredKey]) === undefined &&
            !definedProperties.has(requiredKey)
          ) {
            let schemaPath = it.schemaEnv.baseId + it.errSchemaPath;
            let msg = `required property "${requiredKey}" is not defined at "${schemaPath}" (strictRequired)`;
            util_1.checkStrictMode(it, msg, it.opts.strictRequired);
          }
      }
      function allErrorsMode() {
        if (useLoop || $data) cxt.block$data(codegen_1.nil, loopAllRequired);
        else for (let prop of schema) code_1.checkReportMissingProp(cxt, prop);
      }
      function exitOnErrorMode() {
        let missing = gen.let("missing");
        if (useLoop || $data) {
          let valid = gen.let("valid", true);
          cxt.block$data(valid, () => loopUntilMissing(missing, valid));
          cxt.ok(valid);
        } else {
          gen.if(code_1.checkMissingProp(cxt, schema, missing));
          code_1.reportMissingProp(cxt, missing);
          gen.else();
        }
      }
      function loopAllRequired() {
        gen.forOf("prop", schemaCode, (prop) => {
          cxt.setParams({
            missingProperty: prop,
          });
          gen.if(code_1.noPropertyInData(gen, data, prop, opts.ownProperties), () => cxt.error());
        });
      }
      function loopUntilMissing(missing, valid) {
        cxt.setParams({
          missingProperty: missing,
        });
        gen.forOf(
          missing,
          schemaCode,
          () => {
            gen.assign(valid, code_1.propertyInData(gen, data, missing, opts.ownProperties));
            gen.if(codegen_1.not(valid), () => {
              cxt.error();
              gen.break();
            });
          },
          codegen_1.nil,
        );
      }
    },
  };
  cjsExports.default = def;
});
export { require_required };
