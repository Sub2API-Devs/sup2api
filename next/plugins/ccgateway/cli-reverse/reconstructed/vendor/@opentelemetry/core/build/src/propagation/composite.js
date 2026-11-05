/**
 * @opentelemetry/core/build/src/propagation/composite.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_api } from "../../../../api/build/src/index.js";

//@ chunk-7kayq7nc.js:120494-121243 cjs-fingerprint
var require_composite = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CompositePropagator = undefined;
  var api_1 = require_api();
  class CompositePropagator {
    _propagators;
    _fields;
    constructor(config = {}) {
      this._propagators = config.propagators ?? [];
      let fields = new Set();
      for (let propagator of this._propagators) {
        let propagatorFields = typeof propagator.fields === "function" ? propagator.fields() : [];
        for (let field of propagatorFields) fields.add(field);
      }
      this._fields = Array.from(fields);
    }
    inject(context, carrier, setter) {
      for (let propagator of this._propagators)
        try {
          propagator.inject(context, carrier, setter);
        } catch (err) {
          api_1.diag.warn(`Failed to inject with ${propagator.constructor.name}. Err: ${err.message}`);
        }
    }
    extract(context, carrier, getter) {
      return this._propagators.reduce((ctx, propagator) => {
        try {
          return propagator.extract(ctx, carrier, getter);
        } catch (err) {
          api_1.diag.warn(`Failed to extract with ${propagator.constructor.name}. Err: ${err.message}`);
        }
        return ctx;
      }, context);
    }
    fields() {
      return this._fields.slice();
    }
  }
  cjsExports.CompositePropagator = CompositePropagator;
});
export { require_composite };
