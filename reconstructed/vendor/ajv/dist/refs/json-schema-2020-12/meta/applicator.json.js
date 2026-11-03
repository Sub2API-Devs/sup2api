/**
 * ajv/dist/refs/json-schema-2020-12/meta/applicator.json
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-1r4fv9mg.js:7539-8621 cjs-fingerprint
var require_applicator = x(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/applicator",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    },
    $dynamicAnchor: "meta",
    title: "Applicator vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      prefixItems: {
        $ref: "#/$defs/schemaArray",
      },
      items: {
        $dynamicRef: "#meta",
      },
      contains: {
        $dynamicRef: "#meta",
      },
      additionalProperties: {
        $dynamicRef: "#meta",
      },
      properties: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        default: {},
      },
      patternProperties: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        propertyNames: {
          format: "regex",
        },
        default: {},
      },
      dependentSchemas: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
        default: {},
      },
      propertyNames: {
        $dynamicRef: "#meta",
      },
      if: {
        $dynamicRef: "#meta",
      },
      then: {
        $dynamicRef: "#meta",
      },
      else: {
        $dynamicRef: "#meta",
      },
      allOf: {
        $ref: "#/$defs/schemaArray",
      },
      anyOf: {
        $ref: "#/$defs/schemaArray",
      },
      oneOf: {
        $ref: "#/$defs/schemaArray",
      },
      not: {
        $dynamicRef: "#meta",
      },
    },
    $defs: {
      schemaArray: {
        type: "array",
        minItems: 1,
        items: {
          $dynamicRef: "#meta",
        },
      },
    },
  };
});
export { require_applicator };
