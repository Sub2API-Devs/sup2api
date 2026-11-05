/**
 * @opentelemetry/api/build/src/trace/ProxyTracerProvider.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_ProxyTracer } from "./ProxyTracer.js";
import { require_NoopTracerProvider } from "./NoopTracerProvider.js";

//@ chunk-7kayq7nc.js:43071-43577 cjs-fingerprint
var require_ProxyTracerProvider = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProxyTracerProvider = undefined;
  var ProxyTracer_1 = require_ProxyTracer();
  var NoopTracerProvider_1 = require_NoopTracerProvider();
  var NOOP_TRACER_PROVIDER = new NoopTracerProvider_1.NoopTracerProvider();
  class ProxyTracerProvider {
    getTracer(name, version, options) {
      var _a;
      return (_a = this.getDelegateTracer(name, version, options)) !== null && _a !== undefined
        ? _a
        : new ProxyTracer_1.ProxyTracer(this, name, version, options);
    }
    getDelegate() {
      var _a;
      return (_a = this._delegate) !== null && _a !== undefined ? _a : NOOP_TRACER_PROVIDER;
    }
    setDelegate(delegate) {
      this._delegate = delegate;
    }
    getDelegateTracer(name, version, options) {
      var _a;
      return (_a = this._delegate) === null || _a === undefined
        ? undefined
        : _a.getTracer(name, version, options);
    }
  }
  cjsExports.ProxyTracerProvider = ProxyTracerProvider;
});
export { require_ProxyTracerProvider };
