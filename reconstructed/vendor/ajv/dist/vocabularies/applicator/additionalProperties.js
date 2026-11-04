/**
 * ajv/dist/vocabularies/applicator/additionalProperties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_code_2 } from "../code.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_names } from "../../compile/names.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:98810-100498 cjs-fingerprint
var require_additionalProperties = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var code_1 = require_code_2();
  var codegen_1 = require_codegen_2();
  var names_1 = require_names();
  var util_1 = require_util_2();
  var error = {
    message: "must NOT have additional properties",
    params: ({ params }) => codegen_1._`{additionalProperty: ${params.additionalProperty}}`,
  };
  var def = {
    keyword: "additionalProperties",
    type: ["object"],
    schemaType: ["boolean", "object"],
    allowUndefined: true,
    trackErrors: true,
    error,
    code(cxt) {
      let { gen, schema, parentSchema, data, errsCount, it } = cxt;
      if (!errsCount) throw Error("ajv implementation error");
      let { allErrors, opts } = it;
      it.props = true;
      if (opts.removeAdditional !== "all" && util_1.alwaysValidSchema(it, schema)) return;
      let props = code_1.allSchemaProperties(parentSchema.properties);
      let patProps = code_1.allSchemaProperties(parentSchema.patternProperties);
      checkAdditionalProperties();
      cxt.ok(codegen_1._`${errsCount} === ${names_1.default.errors}`);
      function checkAdditionalProperties() {
        gen.forIn("key", data, (key) => {
          if (!props.length && !patProps.length) additionalPropertyCode(key);
          else gen.if(isAdditional(key), () => additionalPropertyCode(key));
        });
      }
      function isAdditional(key) {
        let definedProp;
        if (props.length > 8) {
          let propsSchema = util_1.schemaRefOrVal(it, parentSchema.properties, "properties");
          definedProp = code_1.isOwnProperty(gen, propsSchema, key);
        } else if (props.length)
          definedProp = codegen_1.or(...props.map((p) => codegen_1._`${key} === ${p}`));
        else definedProp = codegen_1.nil;
        if (patProps.length)
          definedProp = codegen_1.or(
            definedProp,
            ...patProps.map((p) => codegen_1._`${code_1.usePattern(cxt, p)}.test(${key})`),
          );
        return codegen_1.not(definedProp);
      }
      function deleteAdditional(key) {
        gen.code(codegen_1._`delete ${data}[${key}]`);
      }
      function additionalPropertyCode(key) {
        if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === false)) {
          deleteAdditional(key);
          return;
        }
        if (schema === false) {
          cxt.setParams({
            additionalProperty: key,
          });
          cxt.error();
          if (!allErrors) gen.break();
          return;
        }
        if (typeof schema == "object" && !util_1.alwaysValidSchema(it, schema)) {
          let valid = gen.name("valid");
          if (opts.removeAdditional === "failing") {
            applyAdditionalSchema(key, valid, false);
            gen.if(codegen_1.not(valid), () => {
              cxt.reset();
              deleteAdditional(key);
            });
          } else {
            applyAdditionalSchema(key, valid);
            if (!allErrors) gen.if(codegen_1.not(valid), () => gen.break());
          }
        }
      }
      function applyAdditionalSchema(key, valid, errors) {
        let subschema = {
          keyword: "additionalProperties",
          dataProp: key,
          dataPropType: util_1.Type.Str,
        };
        if (errors === false)
          Object.assign(subschema, {
            compositeRule: true,
            createErrors: false,
            allErrors: false,
          });
        cxt.subschema(subschema, valid);
      }
    },
  };
  cjsExports.default = def;
});
export { require_additionalProperties };
