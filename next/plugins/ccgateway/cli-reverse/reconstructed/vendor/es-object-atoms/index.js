/**
 * es-object-atoms/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: es-object-atoms@1.1.2
 * pieces: chunk-ww9agm6g.js (9)
 * attribution: cjs-require-graph 9
 */
import { __commonJS } from "../../runtime/bun-runtime.js";
import { isNaNFallbackModule } from "../unresolved-cjs/index.js";

//@ chunk-ww9agm6g.js:7433-7478 cjs-require-graph
var require_es_object_atoms = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Object;
});
//@ chunk-ww9agm6g.js:7478-7522 cjs-require-graph
var require_es_object_atoms_2 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Error;
});
//@ chunk-ww9agm6g.js:7522-7570 cjs-require-graph
var require_es_object_atoms_3 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = EvalError;
});
//@ chunk-ww9agm6g.js:7570-7619 cjs-require-graph
var require_es_object_atoms_4 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = RangeError;
});
//@ chunk-ww9agm6g.js:7619-7672 cjs-require-graph
var require_es_object_atoms_5 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = ReferenceError;
});
//@ chunk-ww9agm6g.js:7672-7722 cjs-require-graph
var require_es_object_atoms_6 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = SyntaxError;
});
//@ chunk-ww9agm6g.js:7722-7770 cjs-require-graph
var require_es_object_atoms_7 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = TypeError;
});
//@ chunk-ww9agm6g.js:7770-7817 cjs-require-graph
var require_es_object_atoms_8 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = URIError;
});
//@ chunk-ww9agm6g.js:8181-8285 cjs-require-graph
var require_es_object_atoms_9 = __commonJS(function (cjsExports, cjsModule) {
  var isObject = isNaNFallbackModule();
  cjsModule.exports = function (value) {
    if (isObject(value) || value === 0) return value;
    return value < 0 ? -1 : 1;
  };
});
export {
  require_es_object_atoms,
  require_es_object_atoms_7,
  require_es_object_atoms_2,
  require_es_object_atoms_3,
  require_es_object_atoms_4,
  require_es_object_atoms_5,
  require_es_object_atoms_6,
  require_es_object_atoms_8,
  require_es_object_atoms_9,
};
