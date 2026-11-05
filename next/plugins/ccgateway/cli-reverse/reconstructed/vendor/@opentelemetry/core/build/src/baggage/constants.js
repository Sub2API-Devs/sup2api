/**
 * @opentelemetry/core/build/src/baggage/constants.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:54021-54544 cjs-fingerprint
var require_constants_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BAGGAGE_MAX_TOTAL_LENGTH =
    cjsExports.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS =
    cjsExports.BAGGAGE_MAX_NAME_VALUE_PAIRS =
    cjsExports.BAGGAGE_HEADER =
    cjsExports.BAGGAGE_ITEMS_SEPARATOR =
    cjsExports.BAGGAGE_PROPERTIES_SEPARATOR =
    cjsExports.BAGGAGE_KEY_PAIR_SEPARATOR =
      undefined;
  cjsExports.BAGGAGE_KEY_PAIR_SEPARATOR = "=";
  cjsExports.BAGGAGE_PROPERTIES_SEPARATOR = ";";
  cjsExports.BAGGAGE_ITEMS_SEPARATOR = ",";
  cjsExports.BAGGAGE_HEADER = "baggage";
  cjsExports.BAGGAGE_MAX_NAME_VALUE_PAIRS = 180;
  cjsExports.BAGGAGE_MAX_PER_NAME_VALUE_PAIRS = 4096;
  cjsExports.BAGGAGE_MAX_TOTAL_LENGTH = 8192;
});
export { require_constants_2 };
