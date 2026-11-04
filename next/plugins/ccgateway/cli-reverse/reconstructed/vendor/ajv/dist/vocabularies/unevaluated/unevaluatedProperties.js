/**
 * ajv/dist/vocabularies/unevaluated/unevaluatedProperties.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 as require_codegen } from "../../compile/codegen/index.js";
import { require_util_2 as require_util } from "../../compile/util.js";
import { require_names } from "../../compile/names.js";

//@ chunk-1r4fv9mg.js:3452-4567 cjs-fingerprint
var require_unevaluatedProperties = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen();
  var util_1 = require_util();
  var names_1 = require_names();
  var error = {
    message: "must NOT have unevaluated properties",
    params: ({ params }) => codegen_1._`{unevaluatedProperty: ${params.unevaluatedProperty}}`,
  };
  var def = {
    keyword: "unevaluatedProperties",
    type: "object",
    schemaType: ["boolean", "object"],
    trackErrors: true,
    error,
    code(cxt) {
      let { gen, schema, data, errsCount, it } = cxt;
      if (!errsCount) throw Error("ajv implementation error");
      let { allErrors, props } = it;
      if (props instanceof codegen_1.Name)
        gen.if(codegen_1._`${props} !== true`, () =>
          gen.forIn("key", data, (key) =>
            gen.if(unevaluatedDynamic(props, key), () => unevaluatedPropCode(key)),
          ),
        );
      else if (props !== true)
        gen.forIn("key", data, (key) =>
          props === undefined
            ? unevaluatedPropCode(key)
            : gen.if(unevaluatedStatic(props, key), () => unevaluatedPropCode(key)),
        );
      it.props = true;
      cxt.ok(codegen_1._`${errsCount} === ${names_1.default.errors}`);
      function unevaluatedPropCode(key) {
        if (schema === false) {
          cxt.setParams({
            unevaluatedProperty: key,
          });
          cxt.error();
          if (!allErrors) gen.break();
          return;
        }
        if (!util_1.alwaysValidSchema(it, schema)) {
          let valid = gen.name("valid");
          cxt.subschema(
            {
              keyword: "unevaluatedProperties",
              dataProp: key,
              dataPropType: util_1.Type.Str,
            },
            valid,
          );
          if (!allErrors) gen.if(codegen_1.not(valid), () => gen.break());
        }
      }
      function unevaluatedDynamic(evaluatedProps, key) {
        return codegen_1._`!${evaluatedProps} || !${evaluatedProps}[${key}]`;
      }
      function unevaluatedStatic(evaluatedProps, key) {
        let ps = [];
        for (let p in evaluatedProps) if (evaluatedProps[p] === true) ps.push(codegen_1._`${key} !== ${p}`);
        return codegen_1.and(...ps);
      }
    },
  };
  cjsExports.default = def;
});
export { require_unevaluatedProperties };
