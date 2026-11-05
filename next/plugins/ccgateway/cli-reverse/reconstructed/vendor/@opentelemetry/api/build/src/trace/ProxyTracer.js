/**
 * @opentelemetry/api/build/src/trace/ProxyTracer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_NoopTracer } from "./NoopTracer.js";

//@ chunk-7kayq7nc.js:42298-42879 cjs-fingerprint
var require_ProxyTracer = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ProxyTracer = undefined;
  var NoopTracer_1 = require_NoopTracer();
  var NOOP_TRACER = new NoopTracer_1.NoopTracer();
  class ProxyTracer {
    constructor(_provider, name, version, options) {
      this._provider = _provider;
      this.name = name;
      this.version = version;
      this.options = options;
    }
    startSpan(name, options, context) {
      return this._getTracer().startSpan(name, options, context);
    }
    startActiveSpan(_name, _options, _context, _fn) {
      let tracer = this._getTracer();
      return Reflect.apply(tracer.startActiveSpan, tracer, arguments);
    }
    _getTracer() {
      if (this._delegate) return this._delegate;
      let tracer = this._provider.getDelegateTracer(this.name, this.version, this.options);
      if (!tracer) return NOOP_TRACER;
      this._delegate = tracer;
      return this._delegate;
    }
  }
  cjsExports.ProxyTracer = ProxyTracer;
});
export { require_ProxyTracer };
