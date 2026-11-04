/**
 * @opentelemetry/sdk-logs/build/src/config.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-aepeg2w5.js:653495-653511 esm-layout
var import_core_3 = __toESM(require_core());
//@ chunk-aepeg2w5.js:653511-653787 esm-fingerprint
function loadDefaultConfig() {
  return {
    forceFlushTimeoutMillis: 30000,
    logRecordLimits: {
      attributeValueLengthLimit:
        import_core_3.getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT") ?? 1 / 0,
      attributeCountLimit: import_core_3.getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT") ?? 128,
    },
    includeTraceContext: true,
  };
}
//@ chunk-aepeg2w5.js:653787-654154 esm-fingerprint
function reconfigureLimits(logRecordLimits) {
  return {
    attributeCountLimit:
      logRecordLimits.attributeCountLimit ??
      import_core_3.getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_COUNT_LIMIT") ??
      import_core_3.getNumberFromEnv("OTEL_ATTRIBUTE_COUNT_LIMIT") ??
      128,
    attributeValueLengthLimit:
      logRecordLimits.attributeValueLengthLimit ??
      import_core_3.getNumberFromEnv("OTEL_LOGRECORD_ATTRIBUTE_VALUE_LENGTH_LIMIT") ??
      import_core_3.getNumberFromEnv("OTEL_ATTRIBUTE_VALUE_LENGTH_LIMIT") ??
      1 / 0,
  };
}
export { loadDefaultConfig, reconfigureLimits };
