/**
 * @opentelemetry/sdk-logs/build/src/config.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-logs@0.208.0
 * pieces: chunk-exfmq47h.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_core } from "../../../core/build/src/index.js";

//@ chunk-exfmq47h.js:666101-666117 esm-layout
var import_core_3 = __toESM(require_core());
//@ chunk-exfmq47h.js:666117-666393 esm-fingerprint
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
//@ chunk-exfmq47h.js:666393-666760 esm-fingerprint
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
