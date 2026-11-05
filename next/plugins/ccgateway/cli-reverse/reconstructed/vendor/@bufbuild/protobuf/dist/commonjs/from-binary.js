/**
 * @bufbuild/protobuf/dist/commonjs/from-binary.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../cjs/descriptors.js";
import { require_scalar } from "./reflect/scalar.js";
import { require_reflect } from "../cjs/reflect/reflect.js";
import { require_binary_encoding } from "./wire/binary-encoding.js";
import { require_varint } from "../cjs/wire/varint.js";

//@ chunk-qg41pqt6.js:410850-413994 cjs-require-graph
var require_from_binary = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.fromBinary = fromBinary;
  cjsExports.mergeFromBinary = mergeFromBinary;
  cjsExports.readField = readField;
  var descriptors_js_1 = require_descriptors();
  var scalar_js_1 = require_scalar();
  var reflect_js_1 = require_reflect();
  var binary_encoding_js_1 = require_binary_encoding();
  var varint_js_1 = require_varint();
  var readOptions = {
    readUnknownFields: true,
  };
  function makeReadContext(options) {
    return options ? Object.assign(Object.assign({}, readOptions), options) : readOptions;
  }
  function fromBinary(schema, bytes, options) {
    let msg = reflect_js_1.reflect(schema, undefined, false);
    readMessage(
      msg,
      new binary_encoding_js_1.BinaryReader(bytes),
      makeReadContext(options),
      false,
      bytes.byteLength,
    );
    return msg.message;
  }
  function mergeFromBinary(schema, target, bytes, options) {
    readMessage(
      reflect_js_1.reflect(schema, target, false),
      new binary_encoding_js_1.BinaryReader(bytes),
      makeReadContext(options),
      false,
      bytes.byteLength,
    );
    return target;
  }
  function readMessage(message, reader, ctx, delimited, lengthOrDelimitedFieldNo) {
    var _a;
    let end = delimited ? reader.len : reader.pos + lengthOrDelimitedFieldNo;
    let fieldNo;
    let wireType;
    let unknownFields = (_a = message.getUnknown()) !== null && _a !== undefined ? _a : [];
    while (reader.pos < end) {
      [fieldNo, wireType] = reader.tag();
      if (delimited && wireType == binary_encoding_js_1.WireType.EndGroup) break;
      let field = message.findNumber(fieldNo);
      if (!field) {
        let data = reader.skip(wireType, fieldNo);
        if (ctx.readUnknownFields)
          unknownFields.push({
            no: fieldNo,
            wireType,
            data,
          });
        continue;
      }
      readField(message, reader, field, wireType, ctx);
    }
    if (delimited) {
      if (wireType != binary_encoding_js_1.WireType.EndGroup || fieldNo !== lengthOrDelimitedFieldNo)
        throw Error("invalid end group tag");
    }
    if (unknownFields.length > 0) message.setUnknown(unknownFields);
  }
  function readField(message, reader, field, wireType, ctx) {
    var _a;
    switch (field.fieldKind) {
      case "scalar":
        message.set(field, readScalar(reader, field.scalar, field.utf8Validation));
        break;
      case "enum":
        let val = readScalar(reader, descriptors_js_1.ScalarType.INT32);
        if (field.enum.open) message.set(field, val);
        else if (field.enum.values.some((v) => v.number === val)) message.set(field, val);
        else if (ctx.readUnknownFields) {
          let bytes = [];
          varint_js_1.varint32write(val, bytes);
          let unknownFields = (_a = message.getUnknown()) !== null && _a !== undefined ? _a : [];
          unknownFields.push({
            no: field.number,
            wireType,
            data: new Uint8Array(bytes),
          });
          message.setUnknown(unknownFields);
        }
        break;
      case "message":
        message.set(field, readMessageField(reader, ctx, field, message.get(field)));
        break;
      case "list":
        readListField(reader, wireType, message.get(field), ctx);
        break;
      case "map":
        readMapEntry(reader, message.get(field), ctx);
        break;
    }
  }
  function readMapEntry(reader, map, ctx) {
    let field = map.field();
    let key;
    let val;
    let len = reader.uint32();
    let end = reader.pos + len;
    while (reader.pos < end) {
      let [fieldNo] = reader.tag();
      switch (fieldNo) {
        case 1:
          key = readScalar(reader, field.mapKey, field.utf8Validation);
          break;
        case 2:
          switch (field.mapKind) {
            case "scalar":
              val = readScalar(reader, field.scalar, field.utf8Validation);
              break;
            case "enum":
              val = reader.int32();
              break;
            case "message":
              val = readMessageField(reader, ctx, field);
              break;
          }
          break;
      }
    }
    if (key === undefined) key = scalar_js_1.scalarZeroValue(field.mapKey, false);
    if (val === undefined)
      switch (field.mapKind) {
        case "scalar":
          val = scalar_js_1.scalarZeroValue(field.scalar, false);
          break;
        case "enum":
          val = field.enum.values[0].number;
          break;
        case "message":
          val = reflect_js_1.reflect(field.message, undefined, false);
          break;
      }
    map.set(key, val);
  }
  function readListField(reader, wireType, list, ctx) {
    var _a;
    let field = list.field();
    if (field.listKind === "message") {
      list.add(readMessageField(reader, ctx, field));
      return;
    }
    let scalarType =
      (_a = field.scalar) !== null && _a !== undefined ? _a : descriptors_js_1.ScalarType.INT32;
    if (!(
      wireType == binary_encoding_js_1.WireType.LengthDelimited &&
      scalarType != descriptors_js_1.ScalarType.STRING &&
      scalarType != descriptors_js_1.ScalarType.BYTES
    )) {
      list.add(readScalar(reader, scalarType, field.utf8Validation));
      return;
    }
    let e = reader.uint32() + reader.pos;
    while (reader.pos < e) list.add(readScalar(reader, scalarType, field.utf8Validation));
  }
  function readMessageField(reader, ctx, field, mergeMessage) {
    let delimited = field.delimitedEncoding;
    let message =
      mergeMessage !== null && mergeMessage !== undefined
        ? mergeMessage
        : reflect_js_1.reflect(field.message, undefined, false);
    readMessage(message, reader, ctx, delimited, delimited ? field.number : reader.uint32());
    return message;
  }
  function readScalar(reader, type, validateUtf8 = false) {
    switch (type) {
      case descriptors_js_1.ScalarType.STRING:
        return reader.string(validateUtf8);
      case descriptors_js_1.ScalarType.BOOL:
        return reader.bool();
      case descriptors_js_1.ScalarType.DOUBLE:
        return reader.double();
      case descriptors_js_1.ScalarType.FLOAT:
        return reader.float();
      case descriptors_js_1.ScalarType.INT32:
        return reader.int32();
      case descriptors_js_1.ScalarType.INT64:
        return reader.int64();
      case descriptors_js_1.ScalarType.UINT64:
        return reader.uint64();
      case descriptors_js_1.ScalarType.FIXED64:
        return reader.fixed64();
      case descriptors_js_1.ScalarType.BYTES:
        return reader.bytes();
      case descriptors_js_1.ScalarType.FIXED32:
        return reader.fixed32();
      case descriptors_js_1.ScalarType.SFIXED32:
        return reader.sfixed32();
      case descriptors_js_1.ScalarType.SFIXED64:
        return reader.sfixed64();
      case descriptors_js_1.ScalarType.SINT64:
        return reader.sint64();
      case descriptors_js_1.ScalarType.UINT32:
        return reader.uint32();
      case descriptors_js_1.ScalarType.SINT32:
        return reader.sint32();
    }
  }
});
export { require_from_binary };
