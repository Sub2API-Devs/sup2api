/**
 * ajv/dist/compile/validate/defaults.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../codegen/index.js";
import { require_util_2 } from "../util.js";

//@ chunk-xcs4sv9h.js:30071-30715 cjs-fingerprint
var require_defaults = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.assignDefaults = undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  function assignDefaults(it, ty) {
    let { properties, items } = it.schema;
    if (ty === "object" && properties)
      for (let key in properties) assignDefault(it, key, properties[key].default);
    else if (ty === "array" && Array.isArray(items))
      items.forEach((sch, i) => assignDefault(it, i, sch.default));
  }
  cjsExports.assignDefaults = assignDefaults;
  function assignDefault(it, prop, defaultValue) {
    let { gen, compositeRule, data, opts } = it;
    if (defaultValue === undefined) return;
    let childData = codegen_1._`${data}${codegen_1.getProperty(prop)}`;
    if (compositeRule) {
      util_1.checkStrictMode(it, `default is ignored for: ${childData}`);
      return;
    }
    let condition = codegen_1._`${childData} === undefined`;
    if (opts.useDefaults === "empty")
      condition = codegen_1._`${condition} || ${childData} === null || ${childData} === ""`;
    gen.if(condition, codegen_1._`${childData} = ${codegen_1.stringify(defaultValue)}`);
  }
});
export { require_defaults };
