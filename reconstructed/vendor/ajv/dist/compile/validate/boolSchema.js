/**
 * ajv/dist/compile/validate/boolSchema.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_errors } from "../errors.js";
import { require_codegen_2 } from "../codegen/index.js";
import { require_names } from "../names.js";

//@ chunk-s82q9s4x.js:24395-25072 cjs-fingerprint
var require_boolSchema = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.boolOrEmptySchema = cjsExports.topBoolOrEmptySchema = undefined;
  var bs = require_errors();
  var codegen_1 = require_codegen_2();
  var names_1 = require_names();
  var boolError = {
    message: "boolean schema is false",
  };
  function topBoolOrEmptySchema(it) {
    let { gen, schema, validateName } = it;
    if (schema === false) falseSchemaError(it, false);
    else if (typeof schema == "object" && schema.$async === true) gen.return(names_1.default.data);
    else {
      gen.assign(codegen_1._`${validateName}.errors`, null);
      gen.return(true);
    }
  }
  cjsExports.topBoolOrEmptySchema = topBoolOrEmptySchema;
  function boolOrEmptySchema(it, valid) {
    let { gen, schema } = it;
    if (schema === false) {
      gen.var(valid, false);
      falseSchemaError(it);
    } else gen.var(valid, true);
  }
  cjsExports.boolOrEmptySchema = boolOrEmptySchema;
  function falseSchemaError(it, overrideAllErrors) {
    let { gen, data } = it;
    bs.reportError(
      {
        gen,
        keyword: "false schema",
        data,
        schema: false,
        schemaCode: false,
        schemaValue: false,
        params: {},
        it,
      },
      boolError,
      undefined,
      overrideAllErrors,
    );
  }
});
export { require_boolSchema };
