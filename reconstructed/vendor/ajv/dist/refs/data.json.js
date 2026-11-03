/**
 * ajv/dist/refs/data.json
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-s82q9s4x.js:57215-57579 cjs-fingerprint
var zn = x(function (dm, Al) {
  Al.exports = {
    $id: "https://raw.githubusercontent.com/ajv-validator/ajv/master/lib/refs/data.json#",
    description: "Meta-schema for $data reference (JSON AnySchema extension proposal)",
    type: "object",
    required: ["$data"],
    properties: {
      $data: { type: "string", anyOf: [{ format: "relative-json-pointer" }, { format: "json-pointer" }] },
    },
    additionalProperties: !1,
  };
});

export { zn };
