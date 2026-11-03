/**
 * @bufbuild/protobuf/dist/commonjs/to-json.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../cjs/descriptors.js";
import { require_names } from "../cjs/reflect/names.js";
import { require_reflect } from "../cjs/reflect/reflect.js";
import { require_error_4, require_error_5 } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_wrappers } from "../cjs/wkt/wrappers.js";
import { require_extensions } from "./extensions.js";
import { require_reflect_check } from "../cjs/reflect/reflect-check.js";

//@ chunk-fq0cr76a.js:449273-456071 cjs-fingerprint
var require_to_json = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toJson = toJson;
  cjsExports.toJsonString = toJsonString;
  cjsExports.enumToJson = enumToJson;
  var descriptors_js_1 = require_descriptors();
  var names_js_1 = require_names();
  var reflect_js_1 = require_reflect();
  var index_js_1 = require_error_4();
  var wrappers_js_1 = require_wrappers();
  var index_js_2 = require_error_5();
  var extensions_js_1 = require_extensions();
  var reflect_check_js_1 = require_reflect_check();
  var LEGACY_REQUIRED = 3;
  var IMPLICIT = 2;
  var jsonWriteDefaults = {
    alwaysEmitImplicit: false,
    enumAsInteger: false,
    useProtoFieldName: false,
  };
  function makeWriteOptions(options) {
    return options ? Object.assign(Object.assign({}, jsonWriteDefaults), options) : jsonWriteDefaults;
  }
  function toJson(schema, message, options) {
    return reflectToJson(reflect_js_1.reflect(schema, message), makeWriteOptions(options));
  }
  function toJsonString(schema, message, options) {
    var _a;
    let jsonValue = toJson(schema, message, options);
    return JSON.stringify(
      jsonValue,
      null,
      (_a = options === null || options === undefined ? undefined : options.prettySpaces) !== null &&
        _a !== undefined
        ? _a
        : 0,
    );
  }
  function enumToJson(descEnum, value) {
    var _a;
    if (descEnum.typeName == "google.protobuf.NullValue") return null;
    let name = (_a = descEnum.value[value]) === null || _a === undefined ? undefined : _a.name;
    if (name === undefined) throw Error(`${value} is not a value in ${descEnum}`);
    return name;
  }
  function reflectToJson(msg, opts) {
    var _a;
    let wktJson = tryWktToJson(msg, opts);
    if (wktJson !== undefined) return wktJson;
    let json = {};
    for (let f of msg.sortedFields) {
      if (!msg.isSet(f)) {
        if (f.presence == LEGACY_REQUIRED) throw Error(`cannot encode ${f} to JSON: required field not set`);
        if (!opts.alwaysEmitImplicit || f.presence !== IMPLICIT) continue;
      }
      let jsonValue = fieldToJson(f, msg.get(f), opts);
      if (jsonValue !== undefined) json[jsonName(f, opts)] = jsonValue;
    }
    if (opts.registry) {
      let tagSeen = new Set();
      for (let { no } of (_a = msg.getUnknown()) !== null && _a !== undefined ? _a : [])
        if (!tagSeen.has(no)) {
          tagSeen.add(no);
          let extension = opts.registry.getExtensionFor(msg.desc, no);
          if (!extension) continue;
          let value = extensions_js_1.getExtension(msg.message, extension);
          let [container, field] = extensions_js_1.createExtensionContainer(extension, value);
          let jsonValue = fieldToJson(field, container.get(field), opts);
          if (jsonValue !== undefined) json[extension.jsonName] = jsonValue;
        }
    }
    return json;
  }
  function fieldToJson(f, val, opts) {
    switch (f.fieldKind) {
      case "scalar":
        return scalarToJson(f, val);
      case "message":
        return reflectToJson(val, opts);
      case "enum":
        return enumToJsonInternal(f.enum, val, opts.enumAsInteger);
      case "list":
        return listToJson(val, opts);
      case "map":
        return mapToJson(val, opts);
    }
  }
  function mapToJson(map, opts) {
    let f = map.field();
    let jsonObj = {};
    switch (f.mapKind) {
      case "scalar":
        for (let [entryKey, entryValue] of map) jsonObj[entryKey] = scalarToJson(f, entryValue);
        break;
      case "message":
        for (let [entryKey, entryValue] of map) jsonObj[entryKey] = reflectToJson(entryValue, opts);
        break;
      case "enum":
        for (let [entryKey, entryValue] of map)
          jsonObj[entryKey] = enumToJsonInternal(f.enum, entryValue, opts.enumAsInteger);
        break;
    }
    return opts.alwaysEmitImplicit || map.size > 0 ? jsonObj : undefined;
  }
  function listToJson(list, opts) {
    let f = list.field();
    let jsonArr = [];
    switch (f.listKind) {
      case "scalar":
        for (let item of list) jsonArr.push(scalarToJson(f, item));
        break;
      case "enum":
        for (let item of list) jsonArr.push(enumToJsonInternal(f.enum, item, opts.enumAsInteger));
        break;
      case "message":
        for (let item of list) jsonArr.push(reflectToJson(item, opts));
        break;
    }
    return opts.alwaysEmitImplicit || jsonArr.length > 0 ? jsonArr : undefined;
  }
  function enumToJsonInternal(desc, value, enumAsInteger) {
    var _a;
    if (typeof value != "number")
      throw Error(
        `cannot encode ${desc} to JSON: expected number, got ${reflect_check_js_1.formatVal(value)}`,
      );
    if (desc.typeName == "google.protobuf.NullValue") return null;
    if (enumAsInteger) return value;
    let val = desc.value[value];
    return (_a = val === null || val === undefined ? undefined : val.name) !== null && _a !== undefined
      ? _a
      : value;
  }
  function scalarToJson(field, value) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    var _f;
    switch (field.scalar) {
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.SINT32:
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.UINT32:
        if (typeof value != "number")
          throw Error(
            `cannot encode ${field} to JSON: ${(_a = reflect_check_js_1.checkField(field, value)) === null || _a === undefined ? undefined : _a.message}`,
          );
        return value;
      case descriptors_js_1.ScalarType.FLOAT:
      case descriptors_js_1.ScalarType.DOUBLE:
        if (typeof value != "number")
          throw Error(
            `cannot encode ${field} to JSON: ${(_b = reflect_check_js_1.checkField(field, value)) === null || _b === undefined ? undefined : _b.message}`,
          );
        if (Number.isNaN(value)) return "NaN";
        if (value === Number.POSITIVE_INFINITY) return "Infinity";
        if (value === Number.NEGATIVE_INFINITY) return "-Infinity";
        return value;
      case descriptors_js_1.ScalarType.STRING:
        if (typeof value != "string")
          throw Error(
            `cannot encode ${field} to JSON: ${(_c = reflect_check_js_1.checkField(field, value)) === null || _c === undefined ? undefined : _c.message}`,
          );
        return value;
      case descriptors_js_1.ScalarType.BOOL:
        if (typeof value != "boolean")
          throw Error(
            `cannot encode ${field} to JSON: ${(_d = reflect_check_js_1.checkField(field, value)) === null || _d === undefined ? undefined : _d.message}`,
          );
        return value;
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.SINT64:
        if (
          typeof value == "bigint" ||
          typeof value == "string" ||
          (typeof value == "number" && Number.isInteger(value))
        )
          return value.toString();
        throw Error(
          `cannot encode ${field} to JSON: ${(_e = reflect_check_js_1.checkField(field, value)) === null || _e === undefined ? undefined : _e.message}`,
        );
      case descriptors_js_1.ScalarType.BYTES:
        if (value instanceof Uint8Array) return index_js_2.base64Encode(value);
        throw Error(
          `cannot encode ${field} to JSON: ${(_f = reflect_check_js_1.checkField(field, value)) === null || _f === undefined ? undefined : _f.message}`,
        );
    }
  }
  function jsonName(f, opts) {
    return opts.useProtoFieldName ? f.name : f.jsonName;
  }
  function tryWktToJson(msg, opts) {
    if (!msg.desc.typeName.startsWith("google.protobuf.")) return;
    switch (msg.desc.typeName) {
      case "google.protobuf.Any":
        return anyToJson(msg.message, opts);
      case "google.protobuf.Timestamp":
        return timestampToJson(msg.message);
      case "google.protobuf.Duration":
        return durationToJson(msg.message);
      case "google.protobuf.FieldMask":
        return fieldMaskToJson(msg.message);
      case "google.protobuf.Struct":
        return structToJson(msg.message);
      case "google.protobuf.Value":
        return valueToJson(msg.message);
      case "google.protobuf.ListValue":
        return listValueToJson(msg.message);
      default:
        if (wrappers_js_1.isWrapperDesc(msg.desc)) {
          let valueField = msg.desc.fields[0];
          return scalarToJson(valueField, msg.get(valueField));
        }
        return;
    }
  }
  function anyToJson(val, opts) {
    if (val.typeUrl === "") return {};
    let { registry } = opts;
    let message;
    let desc;
    if (registry) {
      message = index_js_1.anyUnpack(val, registry);
      if (message) desc = registry.getMessage(message.$typeName);
    }
    if (!desc || !message)
      throw Error(
        `cannot encode message ${val.$typeName} to JSON: "${val.typeUrl}" is not in the type registry`,
      );
    let reflected = reflect_js_1.reflect(desc, message);
    let json = wrappers_js_1.hasCustomJsonRepresentation(desc)
      ? {
          value: tryWktToJson(reflected, opts),
        }
      : reflectToJson(reflected, opts);
    json["@type"] = val.typeUrl;
    return json;
  }
  function durationToJson(val) {
    let seconds = Number(val.seconds);
    let nanos = val.nanos;
    if (seconds > 315576000000 || seconds < -315576000000)
      throw Error(`cannot encode message ${val.$typeName} to JSON: value out of range`);
    if ((seconds > 0 && nanos < 0) || (seconds < 0 && nanos > 0))
      throw Error(`cannot encode message ${val.$typeName} to JSON: nanos sign must match seconds sign`);
    let text = val.seconds.toString();
    if (nanos !== 0) {
      let nanosStr = Math.abs(nanos).toString();
      nanosStr = "0".repeat(9 - nanosStr.length) + nanosStr;
      if (nanosStr.substring(3) === "000000") nanosStr = nanosStr.substring(0, 3);
      else if (nanosStr.substring(6) === "000") nanosStr = nanosStr.substring(0, 6);
      text += "." + nanosStr;
      if (nanos < 0 && seconds == 0) text = "-" + text;
    }
    return text + "s";
  }
  function fieldMaskToJson(val) {
    return val.paths
      .map((p) => {
        if (names_js_1.protoSnakeCase(names_js_1.protoCamelCase(p)) !== p)
          throw Error(
            `cannot encode message ${val.$typeName} to JSON: lowerCamelCase of path name "${p}" is irreversible`,
          );
        return names_js_1.protoCamelCase(p);
      })
      .join(",");
  }
  function structToJson(val) {
    let json = {};
    for (let [k, v] of Object.entries(val.fields)) json[k] = valueToJson(v);
    return json;
  }
  function valueToJson(val) {
    switch (val.kind.case) {
      case "nullValue":
        return null;
      case "numberValue":
        if (!Number.isFinite(val.kind.value)) throw Error(`${val.$typeName} cannot be NaN or Infinity`);
        return val.kind.value;
      case "boolValue":
        return val.kind.value;
      case "stringValue":
        return val.kind.value;
      case "structValue":
        return structToJson(val.kind.value);
      case "listValue":
        return listValueToJson(val.kind.value);
      default:
        throw Error(`${val.$typeName} must have a value`);
    }
  }
  function listValueToJson(val) {
    return val.values.map(valueToJson);
  }
  function timestampToJson(val) {
    let ms = Number(val.seconds) * 1000;
    if (ms < Date.parse("0001-01-01T00:00:00Z") || ms > Date.parse("9999-12-31T23:59:59Z"))
      throw Error(
        `cannot encode message ${val.$typeName} to JSON: must be from 0001-01-01T00:00:00Z to 9999-12-31T23:59:59Z inclusive`,
      );
    if (val.nanos < 0)
      throw Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be negative`);
    if (val.nanos > 999999999)
      throw Error(`cannot encode message ${val.$typeName} to JSON: nanos must not be greater than 99999999`);
    let z = "Z";
    if (val.nanos > 0) {
      let nanosStr = (val.nanos + 1e9).toString().substring(1);
      if (nanosStr.substring(3) === "000000") z = "." + nanosStr.substring(0, 3) + "Z";
      else if (nanosStr.substring(6) === "000") z = "." + nanosStr.substring(0, 6) + "Z";
      else z = "." + nanosStr + "Z";
    }
    return new Date(ms).toISOString().replace(".000Z", z);
  }
});
export { require_to_json };
