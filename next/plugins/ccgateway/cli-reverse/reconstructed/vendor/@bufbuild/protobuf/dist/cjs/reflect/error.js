/**
 * @bufbuild/protobuf/dist/cjs/reflect/error.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:321635-322052 cjs-require-graph
var require_error_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.FieldError = undefined;
  cjsExports.isFieldError = isFieldError;
  var errorNames = ["FieldValueInvalidError", "FieldListRangeError", "ForeignFieldError"];
  class FieldError extends Error {
    constructor(fieldOrOneof, message, name = "FieldValueInvalidError") {
      super(message);
      this.name = name;
      this.field = () => fieldOrOneof;
    }
  }
  cjsExports.FieldError = FieldError;
  function isFieldError(arg) {
    return (
      arg instanceof Error &&
      errorNames.includes(arg.name) &&
      "field" in arg &&
      typeof arg.field == "function"
    );
  }
});
export { require_error_2 };
