/**
 * @bufbuild/protobuf/dist/cjs/to-binary.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_reflect } from "./reflect/reflect.js";
import { require_binary_encoding } from "../commonjs/wire/binary-encoding.js";
import { require_descriptors } from "./descriptors.js";

//@ chunk-qg41pqt6.js:417071-420112 cjs-require-graph
var require_to_binary = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.toBinary = toBinary;
  cjsExports.writeField = writeField;
  var reflect_js_1 = require_reflect();
  var binary_encoding_js_1 = require_binary_encoding();
  var descriptors_js_1 = require_descriptors();
  var LEGACY_REQUIRED = 3;
  var writeDefaults = {
    writeUnknownFields: true,
  };
  function makeWriteOptions(options) {
    return options ? Object.assign(Object.assign({}, writeDefaults), options) : writeDefaults;
  }
  function toBinary(schema, message, options) {
    return writeFields(
      new binary_encoding_js_1.BinaryWriter(),
      makeWriteOptions(options),
      reflect_js_1.reflect(schema, message),
    ).finish();
  }
  function writeFields(writer, opts, msg) {
    var _a;
    for (let f of msg.sortedFields) {
      if (!msg.isSet(f)) {
        if (f.presence == LEGACY_REQUIRED)
          throw Error(`cannot encode ${f} to binary: required field not set`);
        continue;
      }
      writeField(writer, opts, msg, f);
    }
    if (opts.writeUnknownFields)
      for (let { no, wireType, data } of (_a = msg.getUnknown()) !== null && _a !== undefined ? _a : [])
        writer.tag(no, wireType).raw(data);
    return writer;
  }
  function writeField(writer, opts, msg, field) {
    var _a;
    switch (field.fieldKind) {
      case "scalar":
      case "enum":
        writeScalar(
          writer,
          msg.desc.typeName,
          field.name,
          (_a = field.scalar) !== null && _a !== undefined ? _a : descriptors_js_1.ScalarType.INT32,
          field.number,
          msg.get(field),
        );
        break;
      case "list":
        writeListField(writer, opts, field, msg.get(field));
        break;
      case "message":
        writeMessageField(writer, opts, field, msg.get(field));
        break;
      case "map":
        for (let [key, val] of msg.get(field)) writeMapEntry(writer, opts, field, key, val);
        break;
    }
  }
  function writeScalar(writer, msgName, fieldName, scalarType, fieldNo, value) {
    writeScalarValue(
      writer.tag(fieldNo, writeTypeOfScalar(scalarType)),
      msgName,
      fieldName,
      scalarType,
      value,
    );
  }
  function writeMessageField(writer, opts, field, message) {
    if (field.delimitedEncoding)
      writeFields(writer.tag(field.number, binary_encoding_js_1.WireType.StartGroup), opts, message).tag(
        field.number,
        binary_encoding_js_1.WireType.EndGroup,
      );
    else
      writeFields(
        writer.tag(field.number, binary_encoding_js_1.WireType.LengthDelimited).fork(),
        opts,
        message,
      ).join();
  }
  function writeListField(writer, opts, field, list) {
    var _a;
    if (field.listKind == "message") {
      for (let item of list) writeMessageField(writer, opts, field, item);
      return;
    }
    let scalarType =
      (_a = field.scalar) !== null && _a !== undefined ? _a : descriptors_js_1.ScalarType.INT32;
    if (field.packed) {
      if (!list.size) return;
      writer.tag(field.number, binary_encoding_js_1.WireType.LengthDelimited).fork();
      for (let item of list) writeScalarValue(writer, field.parent.typeName, field.name, scalarType, item);
      writer.join();
      return;
    }
    for (let item of list)
      writeScalar(writer, field.parent.typeName, field.name, scalarType, field.number, item);
  }
  function writeMapEntry(writer, opts, field, key, value) {
    var _a;
    switch (
      (writer.tag(field.number, binary_encoding_js_1.WireType.LengthDelimited).fork(),
      writeScalar(writer, field.parent.typeName, field.name, field.mapKey, 1, key),
      field.mapKind)
    ) {
      case "scalar":
      case "enum":
        writeScalar(
          writer,
          field.parent.typeName,
          field.name,
          (_a = field.scalar) !== null && _a !== undefined ? _a : descriptors_js_1.ScalarType.INT32,
          2,
          value,
        );
        break;
      case "message":
        writeFields(writer.tag(2, binary_encoding_js_1.WireType.LengthDelimited).fork(), opts, value).join();
        break;
    }
    writer.join();
  }
  function writeScalarValue(writer, msgName, fieldName, type, value) {
    try {
      switch (type) {
        case descriptors_js_1.ScalarType.STRING:
          writer.string(value);
          break;
        case descriptors_js_1.ScalarType.BOOL:
          writer.bool(value);
          break;
        case descriptors_js_1.ScalarType.DOUBLE:
          writer.double(value);
          break;
        case descriptors_js_1.ScalarType.FLOAT:
          writer.float(value);
          break;
        case descriptors_js_1.ScalarType.INT32:
          writer.int32(value);
          break;
        case descriptors_js_1.ScalarType.INT64:
          writer.int64(value);
          break;
        case descriptors_js_1.ScalarType.UINT64:
          writer.uint64(value);
          break;
        case descriptors_js_1.ScalarType.FIXED64:
          writer.fixed64(value);
          break;
        case descriptors_js_1.ScalarType.BYTES:
          writer.bytes(value);
          break;
        case descriptors_js_1.ScalarType.FIXED32:
          writer.fixed32(value);
          break;
        case descriptors_js_1.ScalarType.SFIXED32:
          writer.sfixed32(value);
          break;
        case descriptors_js_1.ScalarType.SFIXED64:
          writer.sfixed64(value);
          break;
        case descriptors_js_1.ScalarType.SINT64:
          writer.sint64(value);
          break;
        case descriptors_js_1.ScalarType.UINT32:
          writer.uint32(value);
          break;
        case descriptors_js_1.ScalarType.SINT32:
          writer.sint32(value);
          break;
      }
    } catch (e) {
      if (e instanceof Error)
        throw Error(`cannot encode field ${msgName}.${fieldName} to binary: ${e.message}`);
      throw e;
    }
  }
  function writeTypeOfScalar(type) {
    switch (type) {
      case descriptors_js_1.ScalarType.BYTES:
      case descriptors_js_1.ScalarType.STRING:
        return binary_encoding_js_1.WireType.LengthDelimited;
      case descriptors_js_1.ScalarType.DOUBLE:
      case descriptors_js_1.ScalarType.FIXED64:
      case descriptors_js_1.ScalarType.SFIXED64:
        return binary_encoding_js_1.WireType.Bit64;
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.SFIXED32:
      case descriptors_js_1.ScalarType.FLOAT:
        return binary_encoding_js_1.WireType.Bit32;
      default:
        return binary_encoding_js_1.WireType.Varint;
    }
  }
});
export { require_to_binary };
