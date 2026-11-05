/**
 * ajv/dist/vocabularies/dynamic/dynamicAnchor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 as require_codegen } from "../../compile/codegen/index.js";
import { require_names } from "../../compile/names.js";
import { require_compile_2 as require_compile } from "../../compile/index.js";
import { require_ref } from "../core/ref.js";

//@ chunk-1jdkttw7.js:577-1268 cjs-fingerprint
var require_dynamicAnchor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.dynamicAnchor = undefined;
  var codegen_1 = require_codegen();
  var names_1 = require_names();
  var compile_1 = require_compile();
  var ref_1 = require_ref();
  var def = {
    keyword: "$dynamicAnchor",
    schemaType: "string",
    code: (cxt) => dynamicAnchor(cxt, cxt.schema),
  };
  function dynamicAnchor(cxt, anchor) {
    let { gen, it } = cxt;
    it.schemaEnv.root.dynamicAnchors[anchor] = true;
    let v = codegen_1._`${names_1.default.dynamicAnchors}${codegen_1.getProperty(anchor)}`;
    let validate = it.errSchemaPath === "#" ? it.validateName : _getValidate(cxt);
    gen.if(codegen_1._`!${v}`, () => gen.assign(v, validate));
  }
  cjsExports.dynamicAnchor = dynamicAnchor;
  function _getValidate(cxt) {
    let { schemaEnv, schema, self: ajvInstance } = cxt.it;
    let { root, baseId, localRefs, meta } = schemaEnv.root;
    let { schemaId } = ajvInstance.opts;
    let sch = new compile_1.SchemaEnv({
      schema,
      schemaId,
      root,
      baseId,
      localRefs,
      meta,
    });
    compile_1.compileSchema.call(ajvInstance, sch);
    return ref_1.getValidate(cxt, sch);
  }
  cjsExports.default = def;
});
export { require_dynamicAnchor };
