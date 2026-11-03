/**
 * @bufbuild/cel/dist/cjs/value.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_uint } from "./uint.js";
import { require_map } from "./map.js";
import { require_list } from "./list.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_eval } from "./eval.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_type } from "./type.js";

//@ chunk-fq0cr76a.js:473203-475393 cjs-fingerprint
var require_value = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toCel = toCel;
  cjsExports.unwrapAny = unwrapAny;
  cjsExports.reflectMsgToCel = reflectMsgToCel;
  var uint_js_1 = require_uint();
  var map_js_1 = require_map();
  var list_js_1 = require_list();
  var reflect_1 = require_reflect_2();
  var protobuf_1 = require_protobuf();
  var eval_js_1 = require_eval();
  var wkt_1 = require_error_4();
  var type_js_1 = require_type();
  function toCel(v) {
    switch (typeof v) {
      case "bigint":
      case "boolean":
      case "number":
      case "string":
        return v;
      case "object":
        break;
      default:
        throw Error(`unsupported input ${typeof v}`);
    }
    switch (true) {
      case v === null:
      case v instanceof Uint8Array:
      case list_js_1.isCelList(v):
      case map_js_1.isCelMap(v):
      case uint_js_1.isCelUint(v):
      case type_js_1.isCelType(v):
        return v;
    }
    if (isArray(v) || reflect_1.isReflectList(v)) return list_js_1.celList(v);
    if (isMap(v) || reflect_1.isReflectMap(v)) return map_js_1.celMap(v);
    if (protobuf_1.isMessage(v)) {
      let value = wktToCel(v);
      if (value !== undefined) return value;
      return reflect_1.reflect(eval_js_1.getMsgDesc(v.$typeName), v);
    }
    if (reflect_1.isReflectMessage(v)) return reflectMsgToCel(v);
    if (v.constructor.name === "Object") return map_js_1.celMap(new Map(Object.entries(v)));
    throw Error(`Unsupported input ${v}`);
  }
  function unwrapAny(v) {
    if (!isReflectAny(v)) return v;
    let unpacked = wkt_1.anyUnpack(v.message, eval_js_1.getEvalContext().registry);
    if (unpacked === undefined) throw Error(`invalid Any or ${v.message.typeUrl} not found in registry`);
    let value = wktToCel(unpacked);
    if (value !== undefined) return value;
    return reflect_1.reflect(eval_js_1.getMsgDesc(unpacked.$typeName), unpacked);
  }
  function reflectMsgToCel(v) {
    let value = wktToCel(v.message);
    if (value !== undefined) return value;
    return v;
  }
  function isReflectAny(v) {
    return reflect_1.isReflectMessage(v, wkt_1.AnySchema);
  }
  function isArray(v) {
    return Array.isArray(v);
  }
  function isMap(v) {
    return v instanceof Map;
  }
  function wktToCel(msg) {
    if (wkt_1.isWrapper(msg)) return unwrapWrapper(msg);
    return jsonWrapperToCel(msg);
  }
  function unwrapWrapper(v) {
    switch (v.$typeName) {
      case wkt_1.Int32ValueSchema.typeName:
        return BigInt(v.value);
      case wkt_1.UInt32ValueSchema.typeName:
        return uint_js_1.celUint(BigInt(v.value));
      case wkt_1.UInt64ValueSchema.typeName:
        return uint_js_1.celUint(v.value);
    }
    return v.value;
  }
  function jsonWrapperToCel(msg) {
    switch (true) {
      case protobuf_1.isMessage(msg, wkt_1.StructSchema):
        return structToCel(msg);
      case protobuf_1.isMessage(msg, wkt_1.ValueSchema):
        return valueToCel(msg);
      case protobuf_1.isMessage(msg, wkt_1.ListValueSchema):
        return listValueToCel(msg);
    }
    return;
  }
  function structToCel(s_2) {
    let map = new Map();
    for (let [k, v] of Object.entries(s_2.fields)) map.set(k, valueToCel(v));
    return map_js_1.celMap(map);
  }
  function valueToCel(v) {
    switch (v.kind.case) {
      case "boolValue":
      case "numberValue":
      case "stringValue":
        return v.kind.value;
      case "nullValue":
      case undefined:
        return null;
      case "structValue":
        return structToCel(v.kind.value);
      case "listValue":
        return listValueToCel(v.kind.value);
    }
  }
  function listValueToCel(l) {
    return list_js_1.celList(l.values);
  }
});
export { require_value };
