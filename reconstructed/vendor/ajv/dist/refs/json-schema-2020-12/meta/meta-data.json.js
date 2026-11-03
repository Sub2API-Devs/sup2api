/**
 * ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-1r4fv9mg.js:10855-11392 cjs-fingerprint
var xe = x(function (Or, Tt) {
  Tt.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
    $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/meta-data": !0 },
    $dynamicAnchor: "meta",
    title: "Meta-data vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      default: !0,
      deprecated: { type: "boolean", default: !1 },
      readOnly: { type: "boolean", default: !1 },
      writeOnly: { type: "boolean", default: !1 },
      examples: { type: "array", items: !0 },
    },
  };
});

export { xe };
