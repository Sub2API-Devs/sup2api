/**
 * ajv/dist/refs/json-schema-2020-12/meta/core.json
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1jdkttw7.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-1jdkttw7.js:9475-10468 cjs-fingerprint
var require_core = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/core",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/core": true,
    },
    $dynamicAnchor: "meta",
    title: "Core vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      $id: {
        $ref: "#/$defs/uriReferenceString",
        $comment: "Non-empty fragments not allowed.",
        pattern: "^[^#]*#?$",
      },
      $schema: {
        $ref: "#/$defs/uriString",
      },
      $ref: {
        $ref: "#/$defs/uriReferenceString",
      },
      $anchor: {
        $ref: "#/$defs/anchorString",
      },
      $dynamicRef: {
        $ref: "#/$defs/uriReferenceString",
      },
      $dynamicAnchor: {
        $ref: "#/$defs/anchorString",
      },
      $vocabulary: {
        type: "object",
        propertyNames: {
          $ref: "#/$defs/uriString",
        },
        additionalProperties: {
          type: "boolean",
        },
      },
      $comment: {
        type: "string",
      },
      $defs: {
        type: "object",
        additionalProperties: {
          $dynamicRef: "#meta",
        },
      },
    },
    $defs: {
      anchorString: {
        type: "string",
        pattern: "^[A-Za-z_][-A-Za-z0-9._]*$",
      },
      uriString: {
        type: "string",
        format: "uri",
      },
      uriReferenceString: {
        type: "string",
        format: "uri-reference",
      },
    },
  };
});
export { require_core };
