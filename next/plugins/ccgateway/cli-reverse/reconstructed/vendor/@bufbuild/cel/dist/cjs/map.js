/**
 * @bufbuild/cel/dist/cjs/map.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_uint } from "./uint.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_proto } from "./proto.js";
import { require_value } from "./value.js";

//@ chunk-qg41pqt6.js:475967-478299 cjs-fingerprint
var require_map = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.EMPTY_MAP = undefined;
  cjsExports.celMap = celMap;
  cjsExports.isCelMap = isCelMap;
  var reflect_1 = require_reflect_2();
  var uint_js_1 = require_uint();
  var protobuf_1 = require_protobuf();
  var proto_js_1 = require_proto();
  var value_js_1 = require_value();
  var privateSymbol = Symbol.for("@bufbuild/cel/map");
  function celMap(mapOrReflectMap) {
    if (reflect_1.isReflectMap(mapOrReflectMap)) return new ProtoMap(mapOrReflectMap);
    return new NativeMap(mapOrReflectMap);
  }
  function isCelMap(v) {
    return typeof v === "object" && v !== null && privateSymbol in v;
  }
  class NativeMap {
    _map;
    [privateSymbol] = {};
    constructor(_map) {
      this._map = _map;
    }
    get size() {
      return this._map.size;
    }
    get(key) {
      if (uint_js_1.isCelUint(key)) key = key.value;
      if (typeof key === "number") {
        if (!Number.isInteger(key)) return;
        key = BigInt(key);
      }
      let value = this._map.get(key);
      if (value !== undefined) return value_js_1.toCel(value);
      if (typeof key === "bigint")
        for (let mapKey of this._map.keys()) {
          if (!uint_js_1.isCelUint(mapKey)) continue;
          if (mapKey.value === key) return value_js_1.toCel(this._map.get(mapKey));
        }
      return;
    }
    has(key) {
      return this.get(key) != null;
    }
    forEach(callback, thisArg) {
      this._map.forEach((value, key, _) => callback.call(thisArg, value_js_1.toCel(value), key, this));
    }
    *entries() {
      for (let [key, value] of this._map.entries()) yield [key, value_js_1.toCel(value)];
    }
    keys() {
      return this._map.keys();
    }
    *values() {
      for (let value of this._map.values()) yield value_js_1.toCel(value);
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  }
  class ProtoMap {
    _map;
    [privateSymbol] = {};
    constructor(_map) {
      this._map = _map;
    }
    get size() {
      return this._map.size;
    }
    get(key) {
      let value = this._map.get(mapKeyFromCel(this._map.field(), key));
      if (value === undefined) return;
      return celFromMapValue(this._map.field(), value);
    }
    has(key) {
      return this._map.has(mapKeyFromCel(this._map.field(), key));
    }
    forEach(callback, thisArg) {
      this._map.forEach((value, key, _) =>
        callback.call(
          thisArg,
          celFromMapValue(this._map.field(), value),
          celFromMapKey(this._map.field(), key),
          this,
        ),
      );
    }
    *entries() {
      for (let [key, value] of this._map.entries())
        yield [celFromMapKey(this._map.field(), key), celFromMapValue(this._map.field(), value)];
    }
    *keys() {
      for (let key of this._map.keys()) yield celFromMapKey(this._map.field(), key);
    }
    *values() {
      for (let value of this._map.keys()) yield celFromMapValue(this._map.field(), value);
    }
    [Symbol.iterator]() {
      return this.entries();
    }
  }
  function mapKeyFromCel(desc, v) {
    if (uint_js_1.isCelUint(v)) v = v.value;
    switch (desc.mapKey) {
      case protobuf_1.ScalarType.SINT32:
      case protobuf_1.ScalarType.INT32:
      case protobuf_1.ScalarType.FIXED32:
      case protobuf_1.ScalarType.UINT32:
      case protobuf_1.ScalarType.SFIXED32:
        if (typeof v === "bigint") return Number(v);
        return v;
      case protobuf_1.ScalarType.SINT64:
      case protobuf_1.ScalarType.INT64:
      case protobuf_1.ScalarType.FIXED64:
      case protobuf_1.ScalarType.UINT64:
      case protobuf_1.ScalarType.SFIXED64:
        if (v === "number" && Number.isInteger(v)) return BigInt(v);
        return v;
      default:
        return v;
    }
  }
  function celFromMapKey(desc, v) {
    return proto_js_1.celFromScalar(desc.mapKey, v);
  }
  function celFromMapValue(desc, v) {
    switch (desc.mapKind) {
      case "enum":
        return BigInt(v);
      case "message":
        return value_js_1.reflectMsgToCel(v);
      case "scalar":
        return proto_js_1.celFromScalar(desc.scalar, v);
    }
  }
  cjsExports.EMPTY_MAP = celMap(new Map());
});
export { require_map };
