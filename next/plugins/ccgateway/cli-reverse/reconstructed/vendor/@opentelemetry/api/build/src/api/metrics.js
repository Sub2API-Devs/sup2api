/**
 * @opentelemetry/api/build/src/api/metrics.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_NoopMeterProvider } from "../metrics/NoopMeterProvider.js";
import { require_global_utils } from "../internal/global-utils.js";
import { require_diag } from "./diag.js";

//@ chunk-7kayq7nc.js:46488-47015 cjs-fingerprint
var require_metrics = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.MetricsAPI = undefined;
  var NoopMeterProvider_1 = require_NoopMeterProvider();
  var global_utils_1 = require_global_utils();
  var diag_1 = require_diag();
  var API_NAME = "metrics";
  class MetricsAPI {
    constructor() {}
    static getInstance() {
      if (!this._instance) this._instance = new MetricsAPI();
      return this._instance;
    }
    setGlobalMeterProvider(provider) {
      return global_utils_1.registerGlobal(API_NAME, provider, diag_1.DiagAPI.instance());
    }
    getMeterProvider() {
      return global_utils_1.getGlobal(API_NAME) || NoopMeterProvider_1.NOOP_METER_PROVIDER;
    }
    getMeter(name, version, options) {
      return this.getMeterProvider().getMeter(name, version, options);
    }
    disable() {
      global_utils_1.unregisterGlobal(API_NAME, diag_1.DiagAPI.instance());
    }
  }
  cjsExports.MetricsAPI = MetricsAPI;
});
export { require_metrics };
