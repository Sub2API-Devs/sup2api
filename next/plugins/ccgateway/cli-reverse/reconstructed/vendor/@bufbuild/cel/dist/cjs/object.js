/**
 * @bufbuild/cel/dist/cjs/object.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_protobuf } from "../../../protobuf/dist/commonjs/index.js";
import { require_uint } from "./uint.js";
import { require_value } from "./value.js";
import { require_eval } from "./eval.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_list } from "./list.js";
import { require_map } from "./map.js";
import { require_error_4, require_error_5 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_type } from "./type.js";

//@ chunk-qg41pqt6.js:612177-618001 cjs-fingerprint
var require_object = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.celObject = celObject;
  var protobuf_1 = require_protobuf();
  var uint_js_1 = require_uint();
  var value_js_1 = require_value();
  var eval_js_1 = require_eval();
  var reflect_1 = require_reflect_2();
  var list_js_1 = require_list();
  var map_js_1 = require_map();
  var wkt_1 = require_error_4();
  var wire_1 = require_error_5();
  var type_js_1 = require_type();
  var wire_2 = require_error_5();
  function celObject(typeName, fields) {
    let desc = eval_js_1.getMsgDesc(typeName);
    let msg = reflect_1.reflect(desc);
    for (let [k, v] of fields.entries()) {
      let field = desc.fields.find((f) => f.name === k);
      if (field === undefined) throw Error(`Unknown field ${k} for ${typeName}`);
      setMsgField(msg, field, v);
    }
    return value_js_1.reflectMsgToCel(msg);
  }
  function setMsgField(msg, field, v) {
    switch (field.fieldKind) {
      case "list":
        if (!list_js_1.isCelList(v)) throw unexpectedTypeError(field, "list", v);
        let list = reflect_1.reflectList(field, undefined, false);
        copyList(list, v);
        msg.set(field, list);
        return;
      case "map":
        if (!map_js_1.isCelMap(v)) throw unexpectedTypeError(field, "map", v);
        let map = reflect_1.reflectMap(field, undefined, false);
        copyMap(map, v);
        msg.set(field, map);
        return;
      case "enum":
        msg.set(field, enumFromCel(field, v));
        return;
      case "message":
        let msgVal = msgFromCel(field, v);
        if (msgVal !== null) msg.set(field, msgVal);
        return;
    }
    msg.set(field, scalarFromCel(field, field.scalar, v));
  }
  function copyList(list, cList) {
    let field = list.field();
    for (let v of cList)
      switch (field.listKind) {
        case "enum":
          list.add(enumFromCel(field, v));
          break;
        case "message":
          list.add(msgFromCel(field, v));
          break;
        case "scalar":
          list.add(scalarFromCel(field, field.scalar, v));
          break;
      }
  }
  function copyMap(map, cMap) {
    let field = map.field();
    for (let [k, v] of cMap.entries()) {
      let key = scalarFromCel(field, field.mapKey, k);
      switch (field.mapKind) {
        case "enum":
          map.set(key, enumFromCel(field, v));
          break;
        case "scalar":
          map.set(key, scalarFromCel(field, field.scalar, v));
          break;
        case "message":
          map.set(key, msgFromCel(field, v));
          break;
      }
    }
  }
  function enumFromCel(field, v) {
    if (typeof v !== "bigint") throw unexpectedTypeError(field, "int", v);
    return intToInt32(v);
  }
  function msgFromCel(field, v) {
    switch (field.message.typeName) {
      case wkt_1.AnySchema.typeName:
        if (reflect_1.isReflectMessage(v, wkt_1.AnySchema)) return v;
        return reflect_1.reflect(wkt_1.AnySchema, anyFromCel(v));
      case wkt_1.ValueSchema.typeName:
        return reflect_1.reflect(wkt_1.ValueSchema, valueFromCel(v));
      case wkt_1.StructSchema.typeName:
        if (!map_js_1.isCelMap(v)) throw unexpectedTypeError(field, "map", v);
        return reflect_1.reflect(wkt_1.StructSchema, structFromCel(v));
      case wkt_1.ListValueSchema.typeName:
        if (!list_js_1.isCelList(v)) throw unexpectedTypeError(field, "list", v);
        return reflect_1.reflect(wkt_1.ListValueSchema, listValueFromCel(v));
    }
    if (v === null) return null;
    if (wkt_1.isWrapperDesc(field.message)) {
      let msg = reflect_1.reflect(field.message, undefined, false);
      msg.set(
        field.message.fields[0],
        scalarFromCel(field.message.fields[0], field.message.fields[0].scalar, v),
      );
      return msg;
    }
    if (!reflect_1.isReflectMessage(v, field.message))
      throw unexpectedTypeError(field, field.message.typeName, v);
    return v;
  }
  function anyFromCel(v) {
    switch (typeof v) {
      case "string":
        return wkt_1.anyPack(
          wkt_1.StringValueSchema,
          protobuf_1.create(wkt_1.StringValueSchema, {
            value: v,
          }),
        );
      case "boolean":
        return wkt_1.anyPack(
          wkt_1.BoolValueSchema,
          protobuf_1.create(wkt_1.BoolValueSchema, {
            value: v,
          }),
        );
      case "bigint":
        return wkt_1.anyPack(
          wkt_1.Int64ValueSchema,
          protobuf_1.create(wkt_1.Int64ValueSchema, {
            value: v,
          }),
        );
      case "number":
        return wkt_1.anyPack(
          wkt_1.DoubleValueSchema,
          protobuf_1.create(wkt_1.DoubleValueSchema, {
            value: v,
          }),
        );
      default:
        switch (true) {
          case v instanceof Uint8Array:
            return wkt_1.anyPack(
              wkt_1.BytesValueSchema,
              protobuf_1.create(wkt_1.BytesValueSchema, {
                value: v,
              }),
            );
          case v == null:
            return wkt_1.anyPack(
              wkt_1.ValueSchema,
              protobuf_1.create(wkt_1.ValueSchema, {
                kind: {
                  case: "nullValue",
                  value: wkt_1.NullValue.NULL_VALUE,
                },
              }),
            );
          case list_js_1.isCelList(v):
            return wkt_1.anyPack(wkt_1.ListValueSchema, listValueFromCel(v));
          case map_js_1.isCelMap(v):
            return wkt_1.anyPack(wkt_1.StructSchema, structFromCel(v));
          case uint_js_1.isCelUint(v):
            return wkt_1.anyPack(
              wkt_1.UInt64ValueSchema,
              protobuf_1.create(wkt_1.UInt64ValueSchema, {
                value: v.value,
              }),
            );
          case reflect_1.isReflectMessage(v):
            return wkt_1.anyPack(v.desc, v.message);
          default:
            throw Error(`type cannot be converted ${wkt_1.AnySchema}`);
        }
    }
  }
  function valueFromCel(v) {
    let value = protobuf_1.create(wkt_1.ValueSchema);
    switch (typeof v) {
      case "string":
        value.kind = {
          case: "stringValue",
          value: v,
        };
        break;
      case "boolean":
        value.kind = {
          case: "boolValue",
          value: v,
        };
        break;
      case "bigint":
        if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < BigInt(Number.MIN_SAFE_INTEGER))
          value.kind = {
            case: "stringValue",
            value: v.toString(),
          };
        else
          value.kind = {
            case: "numberValue",
            value: Number(v),
          };
        break;
      case "number":
        if (Number.isNaN(v))
          value.kind = {
            case: "stringValue",
            value: "NaN",
          };
        else if (v === Number.POSITIVE_INFINITY)
          value.kind = {
            case: "stringValue",
            value: "Infinity",
          };
        else if (v === Number.NEGATIVE_INFINITY)
          value.kind = {
            case: "stringValue",
            value: "-Infinity",
          };
        else
          value.kind = {
            case: "numberValue",
            value: Number(v),
          };
        break;
      default:
        switch (true) {
          case v instanceof Uint8Array:
            value.kind = {
              case: "stringValue",
              value: wire_1.base64Encode(v),
            };
            break;
          case v == null:
            value.kind = {
              case: "nullValue",
              value: wkt_1.NullValue.NULL_VALUE,
            };
            break;
          case list_js_1.isCelList(v):
            value.kind = {
              case: "listValue",
              value: listValueFromCel(v),
            };
            break;
          case map_js_1.isCelMap(v):
            value.kind = {
              case: "structValue",
              value: structFromCel(v),
            };
            break;
          case uint_js_1.isCelUint(v):
            if (v.value > BigInt(Number.MAX_SAFE_INTEGER))
              value.kind = {
                case: "stringValue",
                value: v.value.toString(),
              };
            else
              value.kind = {
                case: "numberValue",
                value: Number(v.value),
              };
            break;
          case reflect_1.isReflectMessage(v):
            return protobuf_1.fromJson(wkt_1.ValueSchema, protobuf_1.toJson(v.desc, v.message));
          default:
            throw Error(`type cannot be converted ${wkt_1.ValueSchema}`);
        }
    }
    return value;
  }
  function listValueFromCel(list) {
    let listValue = protobuf_1.create(wkt_1.ListValueSchema);
    for (let v of list) listValue.values.push(valueFromCel(v));
    return listValue;
  }
  function structFromCel(map) {
    let struct = protobuf_1.create(wkt_1.StructSchema);
    for (let [k, v] of map.entries()) {
      if (typeof k !== "string")
        throw Error(`Invalid key type: ${typeof k} for google.protobuf.Struct, expected string`);
      struct.fields[k] = valueFromCel(v);
    }
    return struct;
  }
  function scalarFromCel(field, type, v) {
    if (uint_js_1.isCelUint(v)) v = v.value;
    switch (type) {
      case protobuf_1.ScalarType.UINT32:
      case protobuf_1.ScalarType.FIXED32:
        if (typeof v !== "bigint") throw unexpectedTypeError(field, "int", v);
        return intToUint32(v);
      case protobuf_1.ScalarType.INT32:
      case protobuf_1.ScalarType.SINT32:
      case protobuf_1.ScalarType.SFIXED32:
        if (typeof v !== "bigint") throw unexpectedTypeError(field, "int", v);
        return intToInt32(v);
      case protobuf_1.ScalarType.UINT64:
      case protobuf_1.ScalarType.FIXED64:
      case protobuf_1.ScalarType.INT64:
      case protobuf_1.ScalarType.SINT64:
      case protobuf_1.ScalarType.SFIXED64:
        if (typeof v !== "bigint") throw unexpectedTypeError(field, "int", v);
        return v;
      case protobuf_1.ScalarType.FLOAT:
        if (typeof v !== "number") throw unexpectedTypeError(field, "double", v);
        return Math.fround(v);
      case protobuf_1.ScalarType.DOUBLE:
        if (typeof v !== "number") throw unexpectedTypeError(field, "double", v);
        return v;
      case protobuf_1.ScalarType.STRING:
        if (typeof v !== "string") throw unexpectedTypeError(field, "string", v);
        return v;
      case protobuf_1.ScalarType.BOOL:
        if (typeof v !== "boolean") throw unexpectedTypeError(field, "bool", v);
        return v;
      case protobuf_1.ScalarType.BYTES:
        if (!(v instanceof Uint8Array)) throw unexpectedTypeError(field, "bytes", v);
        return v;
    }
  }
  function unexpectedTypeError(field, expected, actValue) {
    return Error(
      `Expected ${expected} but got ${type_js_1.celType(actValue)} for ${field.parent}.${field.name}`,
    );
  }
  function intToInt32(v) {
    if (v < wire_2.INT32_MIN || v > wire_2.INT32_MAX) throw Error("int32 out of range");
    return Number(v);
  }
  function intToUint32(v) {
    if (v < 0 || v > wire_2.UINT32_MAX) throw Error("uint32 out of range");
    return Number(v);
  }
});
export { require_object };
