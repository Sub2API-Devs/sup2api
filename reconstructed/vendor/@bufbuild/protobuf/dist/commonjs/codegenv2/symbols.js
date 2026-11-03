/**
 * @bufbuild/protobuf/dist/commonjs/codegenv2/symbols.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:515339-518581 cjs-fingerprint
var iU = x(function (rU) {
  Object.defineProperty(rU, "__esModule", { value: !0 });
  rU.symbols = rU.wktPublicImportPaths = rU.packageName = void 0;
  rU.packageName = "@bufbuild/protobuf";
  rU.wktPublicImportPaths = {
    "google/protobuf/compiler/plugin.proto": rU.packageName + "/wkt",
    "google/protobuf/any.proto": rU.packageName + "/wkt",
    "google/protobuf/api.proto": rU.packageName + "/wkt",
    "google/protobuf/cpp_features.proto": rU.packageName + "/wkt",
    "google/protobuf/descriptor.proto": rU.packageName + "/wkt",
    "google/protobuf/duration.proto": rU.packageName + "/wkt",
    "google/protobuf/empty.proto": rU.packageName + "/wkt",
    "google/protobuf/field_mask.proto": rU.packageName + "/wkt",
    "google/protobuf/go_features.proto": rU.packageName + "/wkt",
    "google/protobuf/java_features.proto": rU.packageName + "/wkt",
    "google/protobuf/source_context.proto": rU.packageName + "/wkt",
    "google/protobuf/struct.proto": rU.packageName + "/wkt",
    "google/protobuf/timestamp.proto": rU.packageName + "/wkt",
    "google/protobuf/type.proto": rU.packageName + "/wkt",
    "google/protobuf/wrappers.proto": rU.packageName + "/wkt",
  };
  rU.symbols = {
    isMessage: { typeOnly: !1, bootstrapWktFrom: "../../is-message.js", from: rU.packageName },
    Message: { typeOnly: !0, bootstrapWktFrom: "../../types.js", from: rU.packageName },
    create: { typeOnly: !1, bootstrapWktFrom: "../../create.js", from: rU.packageName },
    fromJson: { typeOnly: !1, bootstrapWktFrom: "../../from-json.js", from: rU.packageName },
    fromJsonString: { typeOnly: !1, bootstrapWktFrom: "../../from-json.js", from: rU.packageName },
    fromBinary: { typeOnly: !1, bootstrapWktFrom: "../../from-binary.js", from: rU.packageName },
    toBinary: { typeOnly: !1, bootstrapWktFrom: "../../to-binary.js", from: rU.packageName },
    toJson: { typeOnly: !1, bootstrapWktFrom: "../../to-json.js", from: rU.packageName },
    toJsonString: { typeOnly: !1, bootstrapWktFrom: "../../to-json.js", from: rU.packageName },
    protoInt64: { typeOnly: !1, bootstrapWktFrom: "../../proto-int64.js", from: rU.packageName },
    JsonValue: { typeOnly: !0, bootstrapWktFrom: "../../json-value.js", from: rU.packageName },
    JsonObject: { typeOnly: !0, bootstrapWktFrom: "../../json-value.js", from: rU.packageName },
    codegen: {
      boot: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/boot.js",
        from: rU.packageName + "/codegenv2",
      },
      fileDesc: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/file.js",
        from: rU.packageName + "/codegenv2",
      },
      enumDesc: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/enum.js",
        from: rU.packageName + "/codegenv2",
      },
      extDesc: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/extension.js",
        from: rU.packageName + "/codegenv2",
      },
      messageDesc: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/message.js",
        from: rU.packageName + "/codegenv2",
      },
      serviceDesc: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/service.js",
        from: rU.packageName + "/codegenv2",
      },
      tsEnum: {
        typeOnly: !1,
        bootstrapWktFrom: "../../codegenv2/enum.js",
        from: rU.packageName + "/codegenv2",
      },
      GenFile: {
        typeOnly: !0,
        bootstrapWktFrom: "../../codegenv2/types.js",
        from: rU.packageName + "/codegenv2",
      },
      GenEnum: {
        typeOnly: !0,
        bootstrapWktFrom: "../../codegenv2/types.js",
        from: rU.packageName + "/codegenv2",
      },
      GenExtension: {
        typeOnly: !0,
        bootstrapWktFrom: "../../codegenv2/types.js",
        from: rU.packageName + "/codegenv2",
      },
      GenMessage: {
        typeOnly: !0,
        bootstrapWktFrom: "../../codegenv2/types.js",
        from: rU.packageName + "/codegenv2",
      },
      GenService: {
        typeOnly: !0,
        bootstrapWktFrom: "../../codegenv2/types.js",
        from: rU.packageName + "/codegenv2",
      },
    },
  };
});

export { iU };
