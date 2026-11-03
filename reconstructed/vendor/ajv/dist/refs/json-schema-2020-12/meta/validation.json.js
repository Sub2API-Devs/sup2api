/**
 * ajv/dist/refs/json-schema-2020-12/meta/validation.json
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-1r4fv9mg.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-1r4fv9mg.js:11392-12940 cjs-fingerprint
var Me = x(function (kr, Ft) {
  Ft.exports = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/validation",
    $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/validation": !0 },
    $dynamicAnchor: "meta",
    title: "Validation vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      type: {
        anyOf: [
          { $ref: "#/$defs/simpleTypes" },
          { type: "array", items: { $ref: "#/$defs/simpleTypes" }, minItems: 1, uniqueItems: !0 },
        ],
      },
      const: !0,
      enum: { type: "array", items: !0 },
      multipleOf: { type: "number", exclusiveMinimum: 0 },
      maximum: { type: "number" },
      exclusiveMaximum: { type: "number" },
      minimum: { type: "number" },
      exclusiveMinimum: { type: "number" },
      maxLength: { $ref: "#/$defs/nonNegativeInteger" },
      minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
      pattern: { type: "string", format: "regex" },
      maxItems: { $ref: "#/$defs/nonNegativeInteger" },
      minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
      uniqueItems: { type: "boolean", default: !1 },
      maxContains: { $ref: "#/$defs/nonNegativeInteger" },
      minContains: { $ref: "#/$defs/nonNegativeInteger", default: 1 },
      maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
      minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
      required: { $ref: "#/$defs/stringArray" },
      dependentRequired: { type: "object", additionalProperties: { $ref: "#/$defs/stringArray" } },
    },
    $defs: {
      nonNegativeInteger: { type: "integer", minimum: 0 },
      nonNegativeIntegerDefault0: { $ref: "#/$defs/nonNegativeInteger", default: 0 },
      simpleTypes: { enum: ["array", "boolean", "integer", "null", "number", "object", "string"] },
      stringArray: { type: "array", items: { type: "string" }, uniqueItems: !0, default: [] },
    },
  };
});

export { Me };
