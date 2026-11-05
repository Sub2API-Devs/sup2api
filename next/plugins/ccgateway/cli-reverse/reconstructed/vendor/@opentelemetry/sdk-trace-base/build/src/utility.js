/**
 * @opentelemetry/sdk-trace-base/build/src/utility.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-trace-base@2.2.0
 * pieces: chunk-3wgj3rdg.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  import_core_8,
  DEFAULT_ATTRIBUTE_COUNT_LIMIT,
  DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT,
} from "../esm/utility.js";

//@ chunk-3wgj3rdg.js:15607-16143 esm-fingerprint
function configureDefaultLimits(userConfig) {
  let spanLimits = Object.assign({}, userConfig.spanLimits);
  spanLimits.attributeCountLimit =
    userConfig.spanLimits?.attributeCountLimit ??
    userConfig.generalLimits?.attributeCountLimit ??
    import_core_8.getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_COUNT_LIMIT") ??
    import_core_8.getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ??
    DEFAULT_ATTRIBUTE_COUNT_LIMIT;
  spanLimits.attributeValueLengthLimit =
    userConfig.spanLimits?.attributeValueLengthLimit ??
    userConfig.generalLimits?.attributeValueLengthLimit ??
    import_core_8.getNumberFromEnv("OTEL_SPAN_ATTRIBUTE_VALUE_LENGTH_LIMIT") ??
    import_core_8.getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ??
    DEFAULT_ATTRIBUTE_VALUE_LENGTH_LIMIT;
  return Object.assign({}, userConfig, {
    spanLimits,
  });
}
export { configureDefaultLimits };
