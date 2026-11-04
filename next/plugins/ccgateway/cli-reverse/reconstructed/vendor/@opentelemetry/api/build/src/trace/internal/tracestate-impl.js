/**
 * @opentelemetry/api/build/src/trace/internal/tracestate-impl.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../runtime/bun-runtime.js";
import { require_tracestate_validators } from "./tracestate-validators.js";

//@ chunk-bwbq4xvm.js:44652-45707 cjs-fingerprint
var require_tracestate_impl = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TraceStateImpl = undefined;
  var tracestate_validators_1 = require_tracestate_validators();
  var MAX_TRACE_STATE_ITEMS = 32;
  var MAX_TRACE_STATE_LEN = 512;
  var LIST_MEMBERS_SEPARATOR = ",";
  var LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  class TraceStateImpl {
    constructor(rawTraceState) {
      this._internalState = new Map();
      if (rawTraceState) this._parse(rawTraceState);
    }
    set(key, value) {
      let traceState = this._clone();
      if (traceState._internalState.has(key)) traceState._internalState.delete(key);
      traceState._internalState.set(key, value);
      return traceState;
    }
    unset(key) {
      let traceState = this._clone();
      traceState._internalState.delete(key);
      return traceState;
    }
    get(key) {
      return this._internalState.get(key);
    }
    serialize() {
      return this._keys()
        .reduce((agg, key) => {
          agg.push(key + LIST_MEMBER_KEY_VALUE_SPLITTER + this.get(key));
          return agg;
        }, [])
        .join(LIST_MEMBERS_SEPARATOR);
    }
    _parse(rawTraceState) {
      if (rawTraceState.length > MAX_TRACE_STATE_LEN) return;
      this._internalState = rawTraceState
        .split(LIST_MEMBERS_SEPARATOR)
        .reverse()
        .reduce((agg, part) => {
          let listMember = part.trim();
          let i = listMember.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
          if (i !== -1) {
            let key = listMember.slice(0, i);
            let value = listMember.slice(i + 1, part.length);
            if (tracestate_validators_1.validateKey(key) && tracestate_validators_1.validateValue(value))
              agg.set(key, value);
          }
          return agg;
        }, new Map());
      if (this._internalState.size > MAX_TRACE_STATE_ITEMS)
        this._internalState = new Map(
          Array.from(this._internalState.entries()).reverse().slice(0, MAX_TRACE_STATE_ITEMS),
        );
    }
    _keys() {
      return Array.from(this._internalState.keys()).reverse();
    }
    _clone() {
      let traceState = new TraceStateImpl();
      traceState._internalState = new Map(this._internalState);
      return traceState;
    }
  }
  cjsExports.TraceStateImpl = TraceStateImpl;
});
export { require_tracestate_impl };
