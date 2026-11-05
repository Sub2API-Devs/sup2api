/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/restore-json-names.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_names } from "../reflect/names.js";
import { require_unsafe } from "../reflect/unsafe.js";

//@ chunk-qg41pqt6.js:362056-362313 cjs-require-graph
var require_restore_json_names = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.restoreJsonNames = restoreJsonNames;
  var names_js_1 = require_names();
  var unsafe_js_1 = require_unsafe();
  function restoreJsonNames(message) {
    for (let f of message.field)
      if (!unsafe_js_1.unsafeIsSetExplicit(f, "jsonName")) f.jsonName = names_js_1.protoCamelCase(f.name);
    message.nestedType.forEach(restoreJsonNames);
  }
});
export { require_restore_json_names };
