/**
 * @bufbuild/protobuf/dist/commonjs/fields.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_unsafe } from "../cjs/reflect/unsafe.js";

//@ chunk-fq0cr76a.js:445879-446147 cjs-fingerprint
var require_fields = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isFieldSet = isFieldSet;
  cjsExports.clearField = clearField;
  var unsafe_js_1 = require_unsafe();
  function isFieldSet(message, field) {
    return field.parent.typeName == message.$typeName && unsafe_js_1.unsafeIsSet(message, field);
  }
  function clearField(message, field) {
    if (field.parent.typeName == message.$typeName) unsafe_js_1.unsafeClear(message, field);
  }
});
export { require_fields };
