/**
 * @opentelemetry/api/build/src/metrics/NoopMeterProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_NoopMeter } from "./NoopMeter.js";

//@ chunk-7kayq7nc.js:46250-46488 cjs-fingerprint
var require_NoopMeterProvider = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NOOP_METER_PROVIDER = cjsExports.NoopMeterProvider = undefined;
  var NoopMeter_1 = require_NoopMeter();
  class NoopMeterProvider {
    getMeter(_name, _version, _options) {
      return NoopMeter_1.NOOP_METER;
    }
  }
  cjsExports.NoopMeterProvider = NoopMeterProvider;
  cjsExports.NOOP_METER_PROVIDER = new NoopMeterProvider();
});
export { require_NoopMeterProvider };
