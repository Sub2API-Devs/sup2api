/**
 * @bufbuild/protobuf/dist/cjs/is-message.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:324434-324690 cjs-require-graph
var require_is_message = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isMessage = isMessage;
  function isMessage(arg, schema) {
    if (!(arg !== null && typeof arg == "object" && "$typeName" in arg && typeof arg.$typeName == "string"))
      return false;
    if (schema === undefined) return true;
    return schema.typeName === arg.$typeName;
  }
});
export { require_is_message };
