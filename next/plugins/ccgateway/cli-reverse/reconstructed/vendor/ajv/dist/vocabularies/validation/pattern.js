/**
 * ajv/dist/vocabularies/validation/pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_code_2 } from "../code.js";
import { require_util_2 } from "../../compile/util.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:85927-86590 cjs-fingerprint
var require_pattern = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var code_1 = require_code_2();
  var util_1 = require_util_2();
  var codegen_1 = require_codegen_2();
  var error = {
    message: ({ schemaCode }) => codegen_1.str`must match pattern "${schemaCode}"`,
    params: ({ schemaCode }) => codegen_1._`{pattern: ${schemaCode}}`,
  };
  var def = {
    keyword: "pattern",
    type: "string",
    schemaType: "string",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, $data, schema, schemaCode, it } = cxt;
      let u_2 = it.opts.unicodeRegExp ? "u" : "";
      if ($data) {
        let { regExp } = it.opts.code;
        let regExpCode = regExp.code === "new RegExp" ? codegen_1._`new RegExp` : util_1.useFunc(gen, regExp);
        let valid = gen.let("valid");
        gen.try(
          () => gen.assign(valid, codegen_1._`${regExpCode}(${schemaCode}, ${u_2}).test(${data})`),
          () => gen.assign(valid, false),
        );
        cxt.fail$data(codegen_1._`!${valid}`);
      } else {
        let regExp = code_1.usePattern(cxt, schema);
        cxt.fail$data(codegen_1._`!${regExp}.test(${data})`);
      }
    },
  };
  cjsExports.default = def;
});
export { require_pattern };
