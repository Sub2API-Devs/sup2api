/**
 * ajv/dist/refs/data.json
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-xcs4sv9h.js:57215-57579 cjs-fingerprint
var require_data_2 = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
    description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
    type: "object",
    required: ["$data"],
    properties: {
      $data: {
        type: "string",
        anyOf: [
          {
            format: "relative-json-pointer",
          },
          {
            format: "json-pointer",
          },
        ],
      },
    },
    additionalProperties: false,
  };
});
export { require_data_2 };
