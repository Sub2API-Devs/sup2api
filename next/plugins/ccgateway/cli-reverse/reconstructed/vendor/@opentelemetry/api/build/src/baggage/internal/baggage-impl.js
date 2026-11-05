/**
 * @opentelemetry/api/build/src/baggage/internal/baggage-impl.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";

//@ chunk-7kayq7nc.js:33601-34192 cjs-fingerprint
var require_baggage_impl = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BaggageImpl = undefined;
  class BaggageImpl {
    constructor(entries) {
      this._entries = entries ? new Map(entries) : new Map();
    }
    getEntry(key) {
      let entry = this._entries.get(key);
      if (!entry) return;
      return Object.assign({}, entry);
    }
    getAllEntries() {
      return Array.from(this._entries.entries()).map(([k, v]) => [k, v]);
    }
    setEntry(key, entry) {
      let newBaggage = new BaggageImpl(this._entries);
      newBaggage._entries.set(key, entry);
      return newBaggage;
    }
    removeEntry(key) {
      let newBaggage = new BaggageImpl(this._entries);
      newBaggage._entries.delete(key);
      return newBaggage;
    }
    removeEntries(...keys) {
      let newBaggage = new BaggageImpl(this._entries);
      for (let key of keys) newBaggage._entries.delete(key);
      return newBaggage;
    }
    clear() {
      return new BaggageImpl();
    }
  }
  cjsExports.BaggageImpl = BaggageImpl;
});
export { require_baggage_impl };
