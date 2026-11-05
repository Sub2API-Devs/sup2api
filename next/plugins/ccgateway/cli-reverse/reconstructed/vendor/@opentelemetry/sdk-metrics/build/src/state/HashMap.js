/**
 * @opentelemetry/sdk-metrics/build/src/state/HashMap.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @opentelemetry/sdk-metrics@2.7.1
 * pieces: chunk-q87n5wsq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_utils } from "../utils.js";

//@ chunk-q87n5wsq.js:37064-38037 cjs-fingerprint
var require_HashMap = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.AttributeHashMap = cjsExports.HashMap = undefined;
  var utils_1 = require_utils();
  class HashMap {
    _valueMap = new Map();
    _keyMap = new Map();
    _hash;
    constructor(hash) {
      this._hash = hash;
    }
    get(key, hashCode) {
      hashCode ??= this._hash(key);
      return this._valueMap.get(hashCode);
    }
    getOrDefault(key, defaultFactory) {
      let hash = this._hash(key);
      if (this._valueMap.has(hash)) return this._valueMap.get(hash);
      let val = defaultFactory();
      if (!this._keyMap.has(hash)) this._keyMap.set(hash, key);
      this._valueMap.set(hash, val);
      return val;
    }
    set(key, value, hashCode) {
      hashCode ??= this._hash(key);
      if (!this._keyMap.has(hashCode)) this._keyMap.set(hashCode, key);
      this._valueMap.set(hashCode, value);
    }
    has(key, hashCode) {
      hashCode ??= this._hash(key);
      return this._valueMap.has(hashCode);
    }
    *keys() {
      let keyIterator = this._keyMap.entries();
      let next = keyIterator.next();
      while (next.done !== true) {
        yield [next.value[1], next.value[0]];
        next = keyIterator.next();
      }
    }
    *entries() {
      let valueIterator = this._valueMap.entries();
      let next = valueIterator.next();
      while (next.done !== true) {
        yield [this._keyMap.get(next.value[0]), next.value[1], next.value[0]];
        next = valueIterator.next();
      }
    }
    get size() {
      return this._valueMap.size;
    }
  }
  cjsExports.HashMap = HashMap;
  class AttributeHashMap extends HashMap {
    constructor() {
      super(utils_1.hashAttributes);
    }
  }
  cjsExports.AttributeHashMap = AttributeHashMap;
});
export { require_HashMap };
