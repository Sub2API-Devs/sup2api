/**
 * @opentelemetry/api/build/src/api/trace.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_global_utils } from "../internal/global-utils.js";
import { require_ProxyTracerProvider } from "../trace/ProxyTracerProvider.js";
import { require_spancontext_utils } from "../trace/spancontext-utils.js";
import { require_context_utils } from "../trace/context-utils.js";
import { require_diag } from "./diag.js";

//@ chunk-7kayq7nc.js:48908-49908 cjs-fingerprint
var require_trace = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TraceAPI = undefined;
  var global_utils_1 = require_global_utils();
  var ProxyTracerProvider_1 = require_ProxyTracerProvider();
  var spancontext_utils_1 = require_spancontext_utils();
  var context_utils_1 = require_context_utils();
  var diag_1 = require_diag();
  var API_NAME = "trace";
  class TraceAPI {
    constructor() {
      this._proxyTracerProvider = new ProxyTracerProvider_1.ProxyTracerProvider();
      this.wrapSpanContext = spancontext_utils_1.wrapSpanContext;
      this.isSpanContextValid = spancontext_utils_1.isSpanContextValid;
      this.deleteSpan = context_utils_1.deleteSpan;
      this.getSpan = context_utils_1.getSpan;
      this.getActiveSpan = context_utils_1.getActiveSpan;
      this.getSpanContext = context_utils_1.getSpanContext;
      this.setSpan = context_utils_1.setSpan;
      this.setSpanContext = context_utils_1.setSpanContext;
    }
    static getInstance() {
      if (!this._instance) this._instance = new TraceAPI();
      return this._instance;
    }
    setGlobalTracerProvider(provider) {
      let success = global_utils_1.registerGlobal(
        API_NAME,
        this._proxyTracerProvider,
        diag_1.DiagAPI.instance(),
      );
      if (success) this._proxyTracerProvider.setDelegate(provider);
      return success;
    }
    getTracerProvider() {
      return global_utils_1.getGlobal(API_NAME) || this._proxyTracerProvider;
    }
    getTracer(name, version) {
      return this.getTracerProvider().getTracer(name, version);
    }
    disable() {
      global_utils_1.unregisterGlobal(API_NAME, diag_1.DiagAPI.instance());
      this._proxyTracerProvider = new ProxyTracerProvider_1.ProxyTracerProvider();
    }
  }
  cjsExports.TraceAPI = TraceAPI;
});
export { require_trace };
