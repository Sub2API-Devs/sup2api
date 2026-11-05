/**
 * ajv/dist/vocabularies/dynamic/recursiveAnchor.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_dynamicAnchor } from "./dynamicAnchor.js";
import { require_util_2 as require_util } from "../../compile/util.js";

//@ chunk-1jdkttw7.js:1959-2226 cjs-fingerprint
var require_recursiveAnchor = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var dynamicAnchor_1 = require_dynamicAnchor();
  var util_1 = require_util();
  var def = {
    keyword: "$recursiveAnchor",
    schemaType: "boolean",
    code(cxt) {
      if (cxt.schema) dynamicAnchor_1.dynamicAnchor(cxt, "");
      else util_1.checkStrictMode(cxt.it, "$recursiveAnchor: false is ignored");
    },
  };
  cjsExports.default = def;
});
export { require_recursiveAnchor };
