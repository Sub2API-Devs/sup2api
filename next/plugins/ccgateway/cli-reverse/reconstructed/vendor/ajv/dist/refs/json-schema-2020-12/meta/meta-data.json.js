/**
 * ajv/dist/refs/json-schema-2020-12/meta/meta-data.json
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-1jdkttw7.js:10856-11393 cjs-fingerprint
var require_meta_data = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    },
    $dynamicAnchor: "meta",
    title: "Meta-data vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      title: {
        type: "string",
      },
      description: {
        type: "string",
      },
      default: true,
      deprecated: {
        type: "boolean",
        default: false,
      },
      readOnly: {
        type: "boolean",
        default: false,
      },
      writeOnly: {
        type: "boolean",
        default: false,
      },
      examples: {
        type: "array",
        items: true,
      },
    },
  };
});
export { require_meta_data };
