/**
 * @bufbuild/protobuf/dist/cjs/wkt/wrappers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-qg41pqt6.js:343104-343886 cjs-require-graph
var require_wrappers = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isWrapper = isWrapper;
  cjsExports.isWrapperDesc = isWrapperDesc;
  cjsExports.hasCustomJsonRepresentation = hasCustomJsonRepresentation;
  function isWrapper(arg) {
    return isWrapperTypeName(arg.$typeName);
  }
  function isWrapperDesc(messageDesc) {
    let f = messageDesc.fields[0];
    return (
      isWrapperTypeName(messageDesc.typeName) &&
      f !== undefined &&
      f.fieldKind == "scalar" &&
      f.name == "value" &&
      f.number == 1
    );
  }
  function hasCustomJsonRepresentation(desc) {
    switch (desc.typeName) {
      case "google.protobuf.Any":
      case "google.protobuf.Timestamp":
      case "google.protobuf.Duration":
      case "google.protobuf.FieldMask":
      case "google.protobuf.Struct":
      case "google.protobuf.Value":
      case "google.protobuf.ListValue":
        return true;
      default:
        return isWrapperDesc(desc);
    }
  }
  function isWrapperTypeName(name) {
    return (
      name.startsWith("google.protobuf.") &&
      [
        "DoubleValue",
        "FloatValue",
        "Int64Value",
        "UInt64Value",
        "Int32Value",
        "UInt32Value",
        "BoolValue",
        "StringValue",
        "BytesValue",
      ].includes(name.substring(16))
    );
  }
});
export { require_wrappers };
