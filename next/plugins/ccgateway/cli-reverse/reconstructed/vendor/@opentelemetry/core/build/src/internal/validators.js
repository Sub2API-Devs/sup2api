/**
 * @opentelemetry/core/build/src/internal/validators.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:121243-121630 cjs-require-graph
var require_validators = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateValue = cjsExports.validateKey = undefined;
  var VALID_KEY_CHAR_RANGE = "[_0-9a-z-*/]";
  var VALID_KEY = `[a-z]${VALID_KEY_CHAR_RANGE}{0,255}`;
  var VALID_VENDOR_KEY = `[a-z0-9]${VALID_KEY_CHAR_RANGE}{0,240}@[a-z]${VALID_KEY_CHAR_RANGE}{0,13}`;
  var VALID_KEY_REGEX = new RegExp(`^(?:${VALID_KEY}|${VALID_VENDOR_KEY})$`);
  var VALID_VALUE_BASE_REGEX = /^[ -~]{0,255}[!-~]$/;
  var INVALID_VALUE_COMMA_EQUAL_REGEX = /,|=/;
  function validateKey(key) {
    return VALID_KEY_REGEX.test(key);
  }
  cjsExports.validateKey = validateKey;
  function validateValue(value) {
    return VALID_VALUE_BASE_REGEX.test(value) && !INVALID_VALUE_COMMA_EQUAL_REGEX.test(value);
  }
  cjsExports.validateValue = validateValue;
});
export { require_validators };
