/**
 * @bufbuild/protobuf/dist/commonjs/fields.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_unsafe } from "../cjs/reflect/unsafe.js";

//@ chunk-qg41pqt6.js:446449-446717 cjs-fingerprint
var require_fields = __commonJS(function (cjsExports) {
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
