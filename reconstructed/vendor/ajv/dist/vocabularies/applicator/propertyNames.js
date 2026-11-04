/**
 * ajv/dist/vocabularies/applicator/propertyNames.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:98190-98810 cjs-fingerprint
var require_propertyNames = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var error = {
    message: "property name must be valid",
    params: ({ params }) => codegen_1._`{propertyName: ${params.propertyName}}`,
  };
  var def = {
    keyword: "propertyNames",
    type: "object",
    schemaType: ["object", "boolean"],
    error,
    code(cxt) {
      let { gen, schema, data, it } = cxt;
      if (util_1.alwaysValidSchema(it, schema)) return;
      let valid = gen.name("valid");
      gen.forIn("key", data, (key) => {
        cxt.setParams({
          propertyName: key,
        });
        cxt.subschema(
          {
            keyword: "propertyNames",
            data: key,
            dataTypes: ["string"],
            propertyName: key,
            compositeRule: true,
          },
          valid,
        );
        gen.if(codegen_1.not(valid), () => {
          cxt.error(true);
          if (!it.allErrors) gen.break();
        });
      });
      cxt.ok(valid);
    },
  };
  cjsExports.default = def;
});
export { require_propertyNames };
