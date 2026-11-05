/**
 * ajv/dist/refs/json-schema-2020-12/meta/unevaluated.json
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-1jdkttw7.js:8622-9051 cjs-fingerprint
var require_unevaluated = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
    },
    $dynamicAnchor: "meta",
    title: "Unevaluated applicator vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      unevaluatedItems: {
        $dynamicRef: "#meta",
      },
      unevaluatedProperties: {
        $dynamicRef: "#meta",
      },
    },
  };
});
export { require_unevaluated };
