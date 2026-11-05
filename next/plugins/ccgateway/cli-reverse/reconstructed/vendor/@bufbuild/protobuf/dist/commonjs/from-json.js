/**
 * @bufbuild/protobuf/dist/commonjs/from-json.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../cjs/descriptors.js";
import { require_proto_int64 } from "./proto-int64.js";
import { require_create } from "../cjs/create.js";
import { require_reflect } from "../cjs/reflect/reflect.js";
import { require_error_2 } from "../cjs/reflect/error.js";
import { require_reflect_check } from "../cjs/reflect/reflect-check.js";
import { require_names } from "../cjs/reflect/names.js";
import { require_base64_encoding } from "../cjs/wire/base64-encoding.js";
import { require_error_4 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_extensions } from "./extensions.js";

//@ chunk-qg41pqt6.js:456645-466044 cjs-require-graph
var require_from_json = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.fromJsonString = fromJsonString;
  cjsExports.mergeFromJsonString = mergeFromJsonString;
  cjsExports.fromJson = fromJson;
  cjsExports.mergeFromJson = mergeFromJson;
  cjsExports.enumFromJson = enumFromJson;
  cjsExports.isEnumJson = isEnumJson;
  var descriptors_js_1 = require_descriptors();
  var proto_int64_js_1 = require_proto_int64();
  var create_js_1 = require_create();
  var reflect_js_1 = require_reflect();
  var error_js_1 = require_error_2();
  var reflect_check_js_1 = require_reflect_check();
  var names_js_1 = require_names();
  var base64_encoding_js_1 = require_base64_encoding();
  var index_js_1 = require_error_4();
  var extensions_js_1 = require_extensions();
  var readOptions = {
    ignoreUnknownFields: false,
  };
  function makeReadContext(options) {
    return options ? Object.assign(Object.assign({}, readOptions), options) : readOptions;
  }
  function fromJsonString(schema, json, options) {
    return fromJson(schema, parseJsonString(json, schema.typeName), options);
  }
  function mergeFromJsonString(schema, target, json, options) {
    return mergeFromJson(schema, target, parseJsonString(json, schema.typeName), options);
  }
  function fromJson(schema, json, options) {
    let msg = reflect_js_1.reflect(schema);
    try {
      readMessage(msg, json, makeReadContext(options));
    } catch (e) {
      if (error_js_1.isFieldError(e))
        throw Error(`cannot decode ${e.field()} from JSON: ${e.message}`, {
          cause: e,
        });
      throw e;
    }
    return msg.message;
  }
  function mergeFromJson(schema, target, json, options) {
    try {
      readMessage(reflect_js_1.reflect(schema, target), json, makeReadContext(options));
    } catch (e) {
      if (error_js_1.isFieldError(e))
        throw Error(`cannot decode ${e.field()} from JSON: ${e.message}`, {
          cause: e,
        });
      throw e;
    }
    return target;
  }
  function enumFromJson(descEnum, json) {
    return readEnum(descEnum, json, false);
  }
  function isEnumJson(descEnum, value) {
    return descEnum.values.find((v) => v.name === value) !== undefined;
  }
  var messageJsonFields = new WeakMap();
  function getJsonField(desc, jsonKey) {
    var _a;
    if (!messageJsonFields.has(desc)) {
      let jsonNames = new Map();
      for (let field of desc.fields) jsonNames.set(field.name, field).set(field.jsonName, field);
      messageJsonFields.set(desc, jsonNames);
    }
    return (_a = messageJsonFields.get(desc)) === null || _a === undefined ? undefined : _a.get(jsonKey);
  }
  function readMessage(msg, json, ctx) {
    var _a;
    if (tryWktFromJson(msg, json, ctx)) return;
    if (json == null || Array.isArray(json) || typeof json != "object")
      throw Error(`cannot decode ${msg.desc} from JSON: ${reflect_check_js_1.formatVal(json)}`);
    let oneofSeen = new Map();
    for (let [jsonKey, jsonValue] of Object.entries(json)) {
      let field = getJsonField(msg.desc, jsonKey);
      if (field) {
        if (field.oneof) {
          if (jsonValue === null && field.fieldKind == "scalar") continue;
          let seen = oneofSeen.get(field.oneof);
          if (seen !== undefined)
            throw new error_js_1.FieldError(
              field.oneof,
              `oneof set multiple times by ${seen.name} and ${field.name}`,
            );
          oneofSeen.set(field.oneof, field);
        }
        readField(msg, field, jsonValue, ctx);
      } else {
        let extension = undefined;
        if (
          jsonKey.startsWith("[") &&
          jsonKey.endsWith("]") &&
          (extension =
            (_a = ctx.registry) === null || _a === undefined
              ? undefined
              : _a.getExtension(jsonKey.substring(1, jsonKey.length - 1))) &&
          extension.extendee.typeName === msg.desc.typeName
        ) {
          let [container, field, get] = extensions_js_1.createExtensionContainer(extension);
          readField(container, field, jsonValue, ctx);
          extensions_js_1.setExtension(msg.message, extension, get());
        }
        if (!extension && !ctx.ignoreUnknownFields)
          throw Error(`cannot decode ${msg.desc} from JSON: key "${jsonKey}" is unknown`);
      }
    }
  }
  function readField(msg, field, json, ctx) {
    switch (field.fieldKind) {
      case "scalar":
        readScalarField(msg, field, json);
        break;
      case "enum":
        readEnumField(msg, field, json, ctx);
        break;
      case "message":
        readMessageField(msg, field, json, ctx);
        break;
      case "list":
        readListField(msg.get(field), json, ctx);
        break;
      case "map":
        readMapField(msg.get(field), json, ctx);
        break;
    }
  }
  function readListOrMapItem(field, json, ctx) {
    if (field.scalar && json !== null) return scalarFromJson(field, json);
    if (field.message && !isResetSentinelNullValue(field, json)) {
      let msgValue = reflect_js_1.reflect(field.message);
      readMessage(msgValue, json, ctx);
      return msgValue;
    }
    if (field.enum && !isResetSentinelNullValue(field, json))
      return readEnum(field.enum, json, ctx.ignoreUnknownFields);
    throw new error_js_1.FieldError(
      field,
      `${field.fieldKind === "list" ? "list item" : "map value"} must not be null`,
    );
  }
  function readMapField(map, json, ctx) {
    if (json === null) return;
    let field = map.field();
    if (typeof json != "object" || Array.isArray(json))
      throw new error_js_1.FieldError(field, "expected object, got " + reflect_check_js_1.formatVal(json));
    for (let [jsonMapKey, value] of Object.entries(json)) {
      let key = mapKeyFromJson(field.mapKey, jsonMapKey);
      let value_2 = readListOrMapItem(field, value, ctx);
      if (value_2 !== tokenIgnoredUnknownEnum) map.set(key, value_2);
    }
  }
  function readListField(list, json, ctx) {
    if (json === null) return;
    let field = list.field();
    if (!Array.isArray(json))
      throw new error_js_1.FieldError(field, "expected Array, got " + reflect_check_js_1.formatVal(json));
    for (let jsonItem of json) {
      let value = readListOrMapItem(field, jsonItem, ctx);
      if (value !== tokenIgnoredUnknownEnum) list.add(value);
    }
  }
  function readMessageField(msg, field, json, ctx) {
    if (isResetSentinelNullValue(field, json)) {
      msg.clear(field);
      return;
    }
    let msgValue = msg.isSet(field) ? msg.get(field) : reflect_js_1.reflect(field.message);
    readMessage(msgValue, json, ctx);
    msg.set(field, msgValue);
  }
  function readEnumField(msg, field, json, ctx) {
    if (isResetSentinelNullValue(field, json)) {
      msg.clear(field);
      return;
    }
    let enumValue = readEnum(field.enum, json, ctx.ignoreUnknownFields);
    if (enumValue !== tokenIgnoredUnknownEnum) msg.set(field, enumValue);
  }
  function readScalarField(msg, field, json) {
    if (json === null) msg.clear(field);
    else msg.set(field, scalarFromJson(field, json));
  }
  function isResetSentinelNullValue(field, json) {
    var _a;
    var _b;
    return (
      json === null &&
      ((_a = field.message) === null || _a === undefined ? undefined : _a.typeName) !=
        "google.protobuf.Value" &&
      ((_b = field.enum) === null || _b === undefined ? undefined : _b.typeName) !=
        "google.protobuf.NullValue"
    );
  }
  var tokenIgnoredUnknownEnum = Symbol();
  function readEnum(desc, json, ignoreUnknownFields) {
    if (json === null) return desc.values[0].number;
    switch (typeof json) {
      case "number":
        if (Number.isInteger(json)) return json;
        break;
      case "string":
        let value = desc.values.find((ev) => ev.name === json);
        if (value !== undefined) return value.number;
        if (ignoreUnknownFields) return tokenIgnoredUnknownEnum;
        break;
    }
    throw Error(`cannot decode ${desc} from JSON: ${reflect_check_js_1.formatVal(json)}`);
  }
  function scalarFromJson(field, json) {
    switch (field.scalar) {
      case descriptors_js_1.ScalarType.DOUBLE:
      case descriptors_js_1.ScalarType.FLOAT:
        if (json === "NaN") return NaN;
        if (json === "Infinity") return Number.POSITIVE_INFINITY;
        if (json === "-Infinity") return Number.NEGATIVE_INFINITY;
        if (typeof json == "number") {
          if (Number.isNaN(json)) throw new error_js_1.FieldError(field, "unexpected NaN number");
          if (!Number.isFinite(json)) throw new error_js_1.FieldError(field, "unexpected infinite number");
          break;
        }
        if (typeof json == "string") {
          if (json === "") break;
          if (json.trim().length !== json.length) break;
          let float = Number(json);
          if (!Number.isFinite(float)) break;
          return float;
        }
        break;
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.SINT32:
      case descriptors_js_1.ScalarType.UINT32:
        return int32FromJson(json);
      case descriptors_js_1.ScalarType.BYTES:
        if (typeof json == "string") {
          if (json === "") return new Uint8Array(0);
          try {
            return base64_encoding_js_1.base64Decode(json);
          } catch (e) {
            let message = e instanceof Error ? e.message : String(e);
            throw new error_js_1.FieldError(field, message);
          }
        }
        break;
    }
    return json;
  }
  function mapKeyFromJson(type, jsonString) {
    switch (type) {
      case descriptors_js_1.ScalarType.BOOL:
        switch (jsonString) {
          case "true":
            return true;
          case "false":
            return false;
        }
        return jsonString;
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.UINT32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.SINT32:
        return int32FromJson(jsonString);
      default:
        return jsonString;
    }
  }
  function int32FromJson(json) {
    if (typeof json == "string") {
      if (json === "") return json;
      if (json.trim().length !== json.length) return json;
      let num = Number(json);
      if (Number.isNaN(num)) return json;
      return num;
    }
    return json;
  }
  function parseJsonString(jsonString, typeName) {
    try {
      return JSON.parse(jsonString);
    } catch (e) {
      let message = e instanceof Error ? e.message : String(e);
      throw Error(`cannot decode message ${typeName} from JSON: ${message}`, {
        cause: e,
      });
    }
  }
  function tryWktFromJson(msg, jsonValue, ctx) {
    if (!msg.desc.typeName.startsWith("google.protobuf.")) return false;
    switch (msg.desc.typeName) {
      case "google.protobuf.Any":
        anyFromJson(msg.message, jsonValue, ctx);
        return true;
      case "google.protobuf.Timestamp":
        timestampFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.Duration":
        durationFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.FieldMask":
        fieldMaskFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.Struct":
        structFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.Value":
        valueFromJson(msg.message, jsonValue);
        return true;
      case "google.protobuf.ListValue":
        listValueFromJson(msg.message, jsonValue);
        return true;
      default:
        if (index_js_1.isWrapperDesc(msg.desc)) {
          let valueField = msg.desc.fields[0];
          if (jsonValue === null) msg.clear(valueField);
          else msg.set(valueField, scalarFromJson(valueField, jsonValue));
          return true;
        }
        return false;
    }
  }
  function anyFromJson(any, json, ctx) {
    var _a;
    if (json === null || Array.isArray(json) || typeof json != "object")
      throw Error(
        `cannot decode message ${any.$typeName} from JSON: expected object but got ${reflect_check_js_1.formatVal(json)}`,
      );
    if (Object.keys(json).length == 0) return;
    let typeUrl = json["@type"];
    if (typeof typeUrl != "string" || typeUrl == "")
      throw Error(`cannot decode message ${any.$typeName} from JSON: "@type" is empty`);
    let typeName = typeUrl.includes("/") ? typeUrl.substring(typeUrl.lastIndexOf("/") + 1) : typeUrl;
    if (!typeName.length) throw Error(`cannot decode message ${any.$typeName} from JSON: "@type" is invalid`);
    let desc = (_a = ctx.registry) === null || _a === undefined ? undefined : _a.getMessage(typeName);
    if (!desc)
      throw Error(`cannot decode message ${any.$typeName} from JSON: ${typeUrl} is not in the type registry`);
    let msg = reflect_js_1.reflect(desc);
    if (index_js_1.hasCustomJsonRepresentation(desc) && Object.prototype.hasOwnProperty.call(json, "value")) {
      let value = json.value;
      readMessage(msg, value, ctx);
    } else {
      let copy = Object.assign({}, json);
      delete copy["@type"];
      readMessage(msg, copy, ctx);
    }
    index_js_1.anyPack(msg.desc, msg.message, any);
  }
  function timestampFromJson(timestamp, json) {
    if (typeof json !== "string")
      throw Error(
        `cannot decode message ${timestamp.$typeName} from JSON: ${reflect_check_js_1.formatVal(json)}`,
      );
    let matches = json.match(
      /^([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2})(?:\.([0-9]{1,9}))?(?:Z|([+-][0-9][0-9]:[0-9][0-9]))$/,
    );
    if (!matches)
      throw Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
    let ms = Date.parse(
      matches[1] +
        "-" +
        matches[2] +
        "-" +
        matches[3] +
        "T" +
        matches[4] +
        ":" +
        matches[5] +
        ":" +
        matches[6] +
        (matches[8] ? matches[8] : "Z"),
    );
    if (Number.isNaN(ms))
      throw Error(`cannot decode message ${timestamp.$typeName} from JSON: invalid RFC 3339 string`);
    if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z"))
      throw Error(
        `cannot decode message ${timestamp.$typeName} from JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`,
      );
    timestamp.seconds = proto_int64_js_1.protoInt64.parse(ms / 1000);
    timestamp.nanos = 0;
    if (matches[7]) timestamp.nanos = parseInt("1" + matches[7] + "0".repeat(9 - matches[7].length)) - 1e9;
  }
  function durationFromJson(duration, json) {
    if (typeof json !== "string")
      throw Error(
        `cannot decode message ${duration.$typeName} from JSON: ${reflect_check_js_1.formatVal(json)}`,
      );
    let match = json.match(/^(-?[0-9]+)(?:\.([0-9]+))?s/);
    if (match === null)
      throw Error(
        `cannot decode message ${duration.$typeName} from JSON: ${reflect_check_js_1.formatVal(json)}`,
      );
    let longSeconds = Number(match[1]);
    if (longSeconds > 315576000000 || longSeconds < -315576000000)
      throw Error(
        `cannot decode message ${duration.$typeName} from JSON: ${reflect_check_js_1.formatVal(json)}`,
      );
    duration.seconds = proto_int64_js_1.protoInt64.parse(longSeconds);
    if (typeof match[2] !== "string") return;
    let nanosStr = match[2] + "0".repeat(9 - match[2].length);
    duration.nanos = parseInt(nanosStr);
    if (longSeconds < 0 || Object.is(longSeconds, -0)) duration.nanos = -duration.nanos;
  }
  function fieldMaskFromJson(fieldMask, json) {
    if (typeof json !== "string")
      throw Error(
        `cannot decode message ${fieldMask.$typeName} from JSON: ${reflect_check_js_1.formatVal(json)}`,
      );
    if (json === "") return;
    fieldMask.paths = json.split(",").map((path) => {
      if (path.includes("_"))
        throw Error(
          `cannot decode message ${fieldMask.$typeName} from JSON: path names must be lowerCamelCase`,
        );
      return names_js_1.protoSnakeCase(path);
    });
  }
  function structFromJson(struct, json) {
    if (typeof json != "object" || json == null || Array.isArray(json))
      throw Error(
        `cannot decode message ${struct.$typeName} from JSON ${reflect_check_js_1.formatVal(json)}`,
      );
    for (let [k, v] of Object.entries(json)) {
      let parsedV = create_js_1.create(index_js_1.ValueSchema);
      valueFromJson(parsedV, v);
      struct.fields[k] = parsedV;
    }
  }
  function valueFromJson(value, json) {
    switch (typeof json) {
      case "number":
        value.kind = {
          case: "numberValue",
          value: json,
        };
        break;
      case "string":
        value.kind = {
          case: "stringValue",
          value: json,
        };
        break;
      case "boolean":
        value.kind = {
          case: "boolValue",
          value: json,
        };
        break;
      case "object":
        if (json === null)
          value.kind = {
            case: "nullValue",
            value: index_js_1.NullValue.NULL_VALUE,
          };
        else if (Array.isArray(json)) {
          let listValue = create_js_1.create(index_js_1.ListValueSchema);
          listValueFromJson(listValue, json);
          value.kind = {
            case: "listValue",
            value: listValue,
          };
        } else {
          let struct = create_js_1.create(index_js_1.StructSchema);
          structFromJson(struct, json);
          value.kind = {
            case: "structValue",
            value: struct,
          };
        }
        break;
      default:
        throw Error(
          `cannot decode message ${value.$typeName} from JSON ${reflect_check_js_1.formatVal(json)}`,
        );
    }
    return value;
  }
  function listValueFromJson(listValue, json) {
    if (!Array.isArray(json))
      throw Error(
        `cannot decode message ${listValue.$typeName} from JSON ${reflect_check_js_1.formatVal(json)}`,
      );
    for (let value of json) {
      let value_2 = create_js_1.create(index_js_1.ValueSchema);
      valueFromJson(value_2, value);
      listValue.values.push(value_2);
    }
  }
});
export { require_from_json };
