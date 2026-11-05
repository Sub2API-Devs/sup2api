/**
 * ajv/dist/vocabularies/core/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_id } from "./id.js";
import { require_ref } from "./ref.js";

//@ chunk-xcs4sv9h.js:83654-83864 cjs-fingerprint
var require_core = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var id_1 = require_id();
  var ref_1 = require_ref();
  var core = [
    "$schema",
    "$id",
    "$defs",
    "$vocabulary",
    {
      keyword: "$comment",
    },
    "definitions",
    id_1.default,
    ref_1.default,
  ];
  cjsExports.default = core;
});
export { require_core };
