/**
 * ajv/dist/vocabularies/applicator/properties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_validate_2 } from "../../compile/validate/index.js";
import { require_code_2 } from "../code.js";
import { require_util_2 } from "../../compile/util.js";
import { require_additionalProperties } from "./additionalProperties.js";

//@ chunk-s82q9s4x.js:100498-101484 cjs-fingerprint
var require_properties = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var validate_1 = require_validate_2();
  var code_1 = require_code_2();
  var util_1 = require_util_2();
  var additionalProperties_1 = require_additionalProperties();
  var def = {
    keyword: "properties",
    type: "object",
    schemaType: "object",
    code(cxt) {
      let { gen, schema, parentSchema, data, it } = cxt;
      if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === undefined)
        additionalProperties_1.default.code(
          new validate_1.KeywordCxt(it, additionalProperties_1.default, "additionalProperties"),
        );
      let allProps = code_1.allSchemaProperties(schema);
      for (let prop of allProps) it.definedProperties.add(prop);
      if (it.opts.unevaluated && allProps.length && it.props !== true)
        it.props = util_1.mergeEvaluated.props(gen, util_1.toHash(allProps), it.props);
      let properties = allProps.filter((p) => !util_1.alwaysValidSchema(it, schema[p]));
      if (properties.length === 0) return;
      let valid = gen.name("valid");
      for (let prop of properties) {
        if (hasDefault(prop)) applyPropertySchema(prop);
        else {
          gen.if(code_1.propertyInData(gen, data, prop, it.opts.ownProperties));
          applyPropertySchema(prop);
          if (!it.allErrors) gen.else().var(valid, true);
          gen.endIf();
        }
        cxt.it.definedProperties.add(prop);
        cxt.ok(valid);
      }
      function hasDefault(prop) {
        return it.opts.useDefaults && !it.compositeRule && schema[prop].default !== undefined;
      }
      function applyPropertySchema(prop) {
        cxt.subschema(
          {
            keyword: "properties",
            schemaProp: prop,
            dataProp: prop,
          },
          valid,
        );
      }
    },
  };
  cjsExports.default = def;
});
export { require_properties };
