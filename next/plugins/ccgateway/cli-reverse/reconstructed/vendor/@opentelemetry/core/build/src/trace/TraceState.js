/**
 * @opentelemetry/core/build/src/trace/TraceState.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/core@2.7.1
 * pieces: chunk-7kayq7nc.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_validators } from "../internal/validators.js";

//@ chunk-7kayq7nc.js:121630-123101 cjs-fingerprint
var require_TraceState = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.TraceState = undefined;
  var validators_1 = require_validators();
  var MAX_TRACE_STATE_ITEMS = 32;
  var MAX_TRACE_STATE_LEN = 512;
  var LIST_MEMBERS_SEPARATOR = ",";
  var LIST_MEMBER_KEY_VALUE_SPLITTER = "=";
  class TraceState {
    _length;
    _rawTraceState;
    _internalState;
    constructor(rawTraceState) {
      this._rawTraceState = typeof rawTraceState === "string" ? rawTraceState : "";
      this._length = this._rawTraceState.length;
    }
    set(key, value) {
      if (!validators_1.validateKey(key) || !validators_1.validateValue(value)) return this;
      let currState = this._getState();
      let currValue = currState.get(key);
      let newLength = this._length;
      if (typeof currValue === "string") newLength += value.length - currValue.length;
      else newLength += key.length + value.length + (currState.size > 0 ? 2 : 1);
      if (newLength > MAX_TRACE_STATE_LEN) return this;
      let newState = new Map(currState);
      newState.delete(key);
      newState.set(key, value);
      return this._fromState(newState, newLength);
    }
    unset(key) {
      let currState = this._getState();
      let currValue = currState.get(key);
      if (typeof currValue !== "string") return this;
      let newLength = this._length - (key.length + currValue.length + 1);
      if (currState.size > 1) newLength = newLength - 1;
      let newState = new Map(currState);
      newState.delete(key);
      return this._fromState(newState, newLength);
    }
    get(key) {
      return this._getState().get(key);
    }
    serialize() {
      let serialized = "";
      let index = 0;
      for (let entry of this._getState()) {
        if (index > 0) serialized = LIST_MEMBERS_SEPARATOR + serialized;
        serialized = `${entry[0]}${LIST_MEMBER_KEY_VALUE_SPLITTER}${entry[1]}` + serialized;
        index++;
      }
      return serialized;
    }
    _getState() {
      if (this._internalState) return this._internalState;
      let vendorMembers = this._rawTraceState.split(LIST_MEMBERS_SEPARATOR);
      let vendorEntries = new Map();
      let currentLength = 0;
      for (let member of vendorMembers) {
        let m_2 = member.trim();
        let idx = m_2.indexOf(LIST_MEMBER_KEY_VALUE_SPLITTER);
        if (idx === -1) continue;
        let key = m_2.slice(0, idx);
        let value = m_2.slice(idx + 1);
        if (!validators_1.validateKey(key) || !validators_1.validateValue(value)) continue;
        let futureLength = currentLength + m_2.length + (vendorEntries.size > 0 ? 1 : 0);
        if (futureLength > MAX_TRACE_STATE_LEN) continue;
        vendorEntries.set(key, value);
        currentLength = futureLength;
        if (vendorEntries.size >= MAX_TRACE_STATE_ITEMS) break;
      }
      this._length = currentLength;
      this._internalState = new Map(Array.from(vendorEntries.entries()).reverse());
      return this._internalState;
    }
    _fromState(state, length) {
      let traceState = Object.create(TraceState.prototype);
      traceState._internalState = state;
      traceState._length = length;
      return traceState;
    }
  }
  cjsExports.TraceState = TraceState;
});
export { require_TraceState };
