/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/cpp_features_pb.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_file } from "../../../../codegenv2/file.js";
import { require_descriptor_pb } from "../../../../../commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { require_message } from "../../../../codegenv2/message.js";
import { require_enum } from "../../../../codegenv2/enum.js";
import { require_extension } from "../../../../codegenv2/extension.js";

//@ chunk-qg41pqt6.js:427283-428834 cjs-fingerprint
var require_cpp_features_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.cpp =
    cjsExports.CppFeatures_StringTypeSchema =
    cjsExports.CppFeatures_StringType =
    cjsExports.CppFeaturesSchema =
    cjsExports.file_google_protobuf_cpp_features =
      undefined;
  var file_js_1 = require_file();
  var descriptor_pb_js_1 = require_descriptor_pb();
  var message_js_1 = require_message();
  var enum_js_1 = require_enum();
  var extension_js_1 = require_extension();
  cjsExports.file_google_protobuf_cpp_features = file_js_1.fileDesc(
    "CiJnb29nbGUvcHJvdG9idWYvY3BwX2ZlYXR1cmVzLnByb3RvEgJwYiL8AwoLQ3BwRmVhdHVyZXMS+wEKEmxlZ2FjeV9jbG9zZWRfZW51bRgBIAEoCELeAYgBAZgBBJgBAaIBCRIEdHJ1ZRiEB6IBChIFZmFsc2UY5weyAbgBCOgHEOgHGq8BVGhlIGxlZ2FjeSBjbG9zZWQgZW51bSBiZWhhdmlvciBpbiBDKysgaXMgZGVwcmVjYXRlZCBhbmQgaXMgc2NoZWR1bGVkIHRvIGJlIHJlbW92ZWQgaW4gZWRpdGlvbiAyMDI1LiAgU2VlIGh0dHA6Ly9wcm90b2J1Zi5kZXYvcHJvZ3JhbW1pbmctZ3VpZGVzL2VudW0vI2NwcCBmb3IgbW9yZSBpbmZvcm1hdGlvbhJaCgtzdHJpbmdfdHlwZRgCIAEoDjIaLnBiLkNwcEZlYXR1cmVzLlN0cmluZ1R5cGVCKYgBAZgBBJgBAaIBCxIGU1RSSU5HGIQHogEJEgRWSUVXGOkHsgEDCOgHEkwKGmVudW1fbmFtZV91c2VzX3N0cmluZ192aWV3GAMgASgIQiiIAQGYAQaYAQGiAQoSBWZhbHNlGIQHogEJEgR0cnVlGOkHsgEDCOkHIkUKClN0cmluZ1R5cGUSFwoTU1RSSU5HX1RZUEVfVU5LTk9XThAAEggKBFZJRVcQARIICgRDT1JEEAISCgoGU1RSSU5HEAM6PwoDY3BwEhsuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQY6AcgASgLMg8ucGIuQ3BwRmVhdHVyZXNSA2NwcA",
    [descriptor_pb_js_1.file_google_protobuf_descriptor],
  );
  cjsExports.CppFeaturesSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_cpp_features, 0);
  var CppFeatures_StringType;
  (function (CppFeatures_StringType) {
    CppFeatures_StringType[(CppFeatures_StringType.STRING_TYPE_UNKNOWN = 0)] = "STRING_TYPE_UNKNOWN";
    CppFeatures_StringType[(CppFeatures_StringType.VIEW = 1)] = "VIEW";
    CppFeatures_StringType[(CppFeatures_StringType.CORD = 2)] = "CORD";
    CppFeatures_StringType[(CppFeatures_StringType.STRING = 3)] = "STRING";
  })(CppFeatures_StringType || (cjsExports.CppFeatures_StringType = CppFeatures_StringType = {}));
  cjsExports.CppFeatures_StringTypeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_cpp_features,
    0,
    0,
  );
  cjsExports.cpp = extension_js_1.extDesc(cjsExports.file_google_protobuf_cpp_features, 0);
});
export { require_cpp_features_pb };
