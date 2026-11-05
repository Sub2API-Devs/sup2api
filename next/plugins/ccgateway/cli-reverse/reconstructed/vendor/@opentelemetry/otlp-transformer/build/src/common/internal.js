/**
 * @opentelemetry/otlp-transformer/build/src/common/internal.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/otlp-transformer@0.208.0..0.209.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-vxhm2nqe.js:243595-244551 cjs-fingerprint
var require_internal = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toAnyValue =
    cjsExports.toKeyValue =
    cjsExports.toAttributes =
    cjsExports.createInstrumentationScope =
    cjsExports.createResource =
      undefined;
  function createResource(resource) {
    let result = {
      attributes: toAttributes(resource.attributes),
      droppedAttributesCount: 0,
    };
    let schemaUrl = resource.schemaUrl;
    if (schemaUrl && schemaUrl !== "") result.schemaUrl = schemaUrl;
    return result;
  }
  cjsExports.createResource = createResource;
  function createInstrumentationScope(scope) {
    return {
      name: scope.name,
      version: scope.version,
    };
  }
  cjsExports.createInstrumentationScope = createInstrumentationScope;
  function toAttributes(attributes) {
    return Object.keys(attributes).map((key) => toKeyValue(key, attributes[key]));
  }
  cjsExports.toAttributes = toAttributes;
  function toKeyValue(key, value) {
    return {
      key,
      value: toAnyValue(value),
    };
  }
  cjsExports.toKeyValue = toKeyValue;
  function toAnyValue(value) {
    let t = typeof value;
    if (t === "string")
      return {
        stringValue: value,
      };
    if (t === "number") {
      if (!Number.isInteger(value))
        return {
          doubleValue: value,
        };
      return {
        intValue: value,
      };
    }
    if (t === "boolean")
      return {
        boolValue: value,
      };
    if (value instanceof Uint8Array)
      return {
        bytesValue: value,
      };
    if (Array.isArray(value))
      return {
        arrayValue: {
          values: value.map(toAnyValue),
        },
      };
    if (t === "object" && value != null)
      return {
        kvlistValue: {
          values: Object.entries(value).map(([k, v]) => toKeyValue(k, v)),
        },
      };
    return {};
  }
  cjsExports.toAnyValue = toAnyValue;
});
export { require_internal };
