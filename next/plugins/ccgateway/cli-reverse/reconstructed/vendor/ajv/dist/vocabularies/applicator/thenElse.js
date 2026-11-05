/**
 * ajv/dist/vocabularies/applicator/thenElse.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_util_2 } from "../../compile/util.js";

//@ chunk-xcs4sv9h.js:105688-105960 cjs-fingerprint
var require_thenElse = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var util_1 = require_util_2();
  var def = {
    keyword: ["then", "else"],
    schemaType: ["object", "boolean"],
    code({ keyword, parentSchema, it }) {
      if (parentSchema.if === undefined) util_1.checkStrictMode(it, `"${keyword}" without "if" is ignored`);
    },
  };
  cjsExports.default = def;
});
export { require_thenElse };
