/**
 * @bufbuild/protobuf/dist/cjs/reflect/reflect-check.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../descriptors.js";
import { require_is_message } from "../is-message.js";
import { require_error_2 } from "./error.js";
import { require_guard } from "./guard.js";
import { require_binary_encoding } from "../../commonjs/wire/binary-encoding.js";
import { require_text_encoding } from "../wire/text-encoding.js";
import { require_proto_int64 } from "../../commonjs/proto-int64.js";

//@ chunk-qg41pqt6.js:338777-343104 cjs-require-graph
var require_reflect_check = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.checkField = checkField;
  cjsExports.checkListItem = checkListItem;
  cjsExports.checkMapEntry = checkMapEntry;
  cjsExports.formatVal = formatVal;
  var descriptors_js_1 = require_descriptors();
  var is_message_js_1 = require_is_message();
  var error_js_1 = require_error_2();
  var guard_js_1 = require_guard();
  var binary_encoding_js_1 = require_binary_encoding();
  var text_encoding_js_1 = require_text_encoding();
  var proto_int64_js_1 = require_proto_int64();
  function checkField(field, value) {
    let check =
      field.fieldKind == "list"
        ? guard_js_1.isReflectList(value, field)
        : field.fieldKind == "map"
          ? guard_js_1.isReflectMap(value, field)
          : checkSingular(field, value);
    if (check === true) return;
    let reason;
    switch (field.fieldKind) {
      case "list":
        reason = `expected ${formatReflectList(field)}, got ${formatVal(value)}`;
        break;
      case "map":
        reason = `expected ${formatReflectMap(field)}, got ${formatVal(value)}`;
        break;
      default:
        reason = reasonSingular(field, value, check);
    }
    return new error_js_1.FieldError(field, reason);
  }
  function checkListItem(field, index, value) {
    let check = checkSingular(field, value);
    if (check !== true)
      return new error_js_1.FieldError(
        field,
        `list item #${index + 1}: ${reasonSingular(field, value, check)}`,
      );
    return;
  }
  function checkMapEntry(field, key, value) {
    let checkKey = checkScalarValue(key, field.mapKey);
    if (checkKey !== true)
      return new error_js_1.FieldError(
        field,
        `invalid map key: ${reasonSingular(
          {
            scalar: field.mapKey,
          },
          key,
          checkKey,
        )}`,
      );
    let checkVal = checkSingular(field, value);
    if (checkVal !== true)
      return new error_js_1.FieldError(
        field,
        `map entry ${formatVal(key)}: ${reasonSingular(field, value, checkVal)}`,
      );
    return;
  }
  function checkSingular(field, value) {
    if (field.scalar !== undefined) return checkScalarValue(value, field.scalar);
    if (field.enum !== undefined) {
      if (field.enum.open) return Number.isInteger(value);
      return field.enum.values.some((v) => v.number === value);
    }
    return guard_js_1.isReflectMessage(value, field.message);
  }
  function checkScalarValue(value, scalar) {
    switch (scalar) {
      case descriptors_js_1.ScalarType.DOUBLE:
        return typeof value == "number";
      case descriptors_js_1.ScalarType.FLOAT:
        if (typeof value != "number") return false;
        if (Number.isNaN(value) || !Number.isFinite(value)) return true;
        if (value > binary_encoding_js_1.FLOAT32_MAX || value < binary_encoding_js_1.FLOAT32_MIN)
          return `${value.toFixed()} out of range`;
        return true;
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.SINT32:
        if (typeof value !== "number" || !Number.isInteger(value)) return false;
        if (value > binary_encoding_js_1.INT32_MAX || value < binary_encoding_js_1.INT32_MIN)
          return `${value.toFixed()} out of range`;
        return true;
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.UINT32:
        if (typeof value !== "number" || !Number.isInteger(value)) return false;
        if (value > binary_encoding_js_1.UINT32_MAX || value < 0) return `${value.toFixed()} out of range`;
        return true;
      case descriptors_js_1.ScalarType.BOOL:
        return typeof value == "boolean";
      case descriptors_js_1.ScalarType.STRING:
        if (typeof value != "string") return false;
        return text_encoding_js_1.getTextEncoding().checkUtf8(value) || "invalid UTF8";
      case descriptors_js_1.ScalarType.BYTES:
        return value instanceof Uint8Array;
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.SINT64:
        if (
          typeof value == "bigint" ||
          typeof value == "number" ||
          (typeof value == "string" && value.length > 0)
        )
          try {
            proto_int64_js_1.protoInt64.parse(value);
            return true;
          } catch (_) {
            return `${value} out of range`;
          }
        return false;
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.UINT64:
        if (
          typeof value == "bigint" ||
          typeof value == "number" ||
          (typeof value == "string" && value.length > 0)
        )
          try {
            proto_int64_js_1.protoInt64.uParse(value);
            return true;
          } catch (_) {
            return `${value} out of range`;
          }
        return false;
    }
  }
  function reasonSingular(field, val, details) {
    details = typeof details == "string" ? `: ${details}` : `, got ${formatVal(val)}`;
    if (field.scalar !== undefined) return `expected ${scalarTypeDescription(field.scalar)}` + details;
    if (field.enum !== undefined) return `expected ${field.enum.toString()}` + details;
    return `expected ${formatReflectMessage(field.message)}` + details;
  }
  function formatVal(val) {
    switch (typeof val) {
      case "object":
        if (val === null) return "null";
        if (val instanceof Uint8Array) return `Uint8Array(${val.length})`;
        if (Array.isArray(val)) return `Array(${val.length})`;
        if (guard_js_1.isReflectList(val)) return formatReflectList(val.field());
        if (guard_js_1.isReflectMap(val)) return formatReflectMap(val.field());
        if (guard_js_1.isReflectMessage(val)) return formatReflectMessage(val.desc);
        if (is_message_js_1.isMessage(val)) return `message ${val.$typeName}`;
        return "object";
      case "string":
        return val.length > 30 ? "string" : `"${val.split('"').join('\\"')}"`;
      case "boolean":
        return String(val);
      case "number":
        return String(val);
      case "bigint":
        return String(val) + "n";
      default:
        return typeof val;
    }
  }
  function formatReflectMessage(desc) {
    return `ReflectMessage (${desc.typeName})`;
  }
  function formatReflectList(field) {
    switch (field.listKind) {
      case "message":
        return `ReflectList (${field.message.toString()})`;
      case "enum":
        return `ReflectList (${field.enum.toString()})`;
      case "scalar":
        return `ReflectList (${descriptors_js_1.ScalarType[field.scalar]})`;
    }
  }
  function formatReflectMap(field) {
    switch (field.mapKind) {
      case "message":
        return `ReflectMap (${descriptors_js_1.ScalarType[field.mapKey]}, ${field.message.toString()})`;
      case "enum":
        return `ReflectMap (${descriptors_js_1.ScalarType[field.mapKey]}, ${field.enum.toString()})`;
      case "scalar":
        return `ReflectMap (${descriptors_js_1.ScalarType[field.mapKey]}, ${descriptors_js_1.ScalarType[field.scalar]})`;
    }
  }
  function scalarTypeDescription(scalar) {
    switch (scalar) {
      case descriptors_js_1.ScalarType.STRING:
        return "string";
      case descriptors_js_1.ScalarType.BOOL:
        return "boolean";
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.SINT64:
      case descriptors_js_1.ScalarType.SFIXED64:
        return "bigint (int64)";
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.FIXED64:
        return "bigint (uint64)";
      case descriptors_js_1.ScalarType.BYTES:
        return "Uint8Array";
      case descriptors_js_1.ScalarType.DOUBLE:
        return "number (float64)";
      case descriptors_js_1.ScalarType.FLOAT:
        return "number (float32)";
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.UINT32:
        return "number (uint32)";
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.SINT32:
        return "number (int32)";
    }
  }
});
export { require_reflect_check };
