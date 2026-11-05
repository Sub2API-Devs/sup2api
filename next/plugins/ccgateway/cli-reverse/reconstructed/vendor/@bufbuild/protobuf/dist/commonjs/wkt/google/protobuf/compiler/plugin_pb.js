/**
 * @bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/compiler/plugin_pb.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_file } from "../../../../../cjs/codegenv2/file.js";
import { require_descriptor_pb } from "../../../gen/google/protobuf/descriptor_pb.js";
import { require_message } from "../../../../../cjs/codegenv2/message.js";
import { require_enum } from "../../../../../cjs/codegenv2/enum.js";

//@ chunk-qg41pqt6.js:438856-441133 cjs-fingerprint
var require_plugin_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CodeGeneratorResponse_FeatureSchema =
    cjsExports.CodeGeneratorResponse_Feature =
    cjsExports.CodeGeneratorResponse_FileSchema =
    cjsExports.CodeGeneratorResponseSchema =
    cjsExports.CodeGeneratorRequestSchema =
    cjsExports.VersionSchema =
    cjsExports.file_google_protobuf_compiler_plugin =
      undefined;
  var file_js_1 = require_file();
  var descriptor_pb_js_1 = require_descriptor_pb();
  var message_js_1 = require_message();
  var enum_js_1 = require_enum();
  cjsExports.file_google_protobuf_compiler_plugin = file_js_1.fileDesc(
    "CiVnb29nbGUvcHJvdG9idWYvY29tcGlsZXIvcGx1Z2luLnByb3RvEhhnb29nbGUucHJvdG9idWYuY29tcGlsZXIiRgoHVmVyc2lvbhINCgVtYWpvchgBIAEoBRINCgVtaW5vchgCIAEoBRINCgVwYXRjaBgDIAEoBRIOCgZzdWZmaXgYBCABKAkigQIKFENvZGVHZW5lcmF0b3JSZXF1ZXN0EhgKEGZpbGVfdG9fZ2VuZXJhdGUYASADKAkSEQoJcGFyYW1ldGVyGAIgASgJEjgKCnByb3RvX2ZpbGUYDyADKAsyJC5nb29nbGUucHJvdG9idWYuRmlsZURlc2NyaXB0b3JQcm90bxJFChdzb3VyY2VfZmlsZV9kZXNjcmlwdG9ycxgRIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5GaWxlRGVzY3JpcHRvclByb3RvEjsKEGNvbXBpbGVyX3ZlcnNpb24YAyABKAsyIS5nb29nbGUucHJvdG9idWYuY29tcGlsZXIuVmVyc2lvbiKSAwoVQ29kZUdlbmVyYXRvclJlc3BvbnNlEg0KBWVycm9yGAEgASgJEhoKEnN1cHBvcnRlZF9mZWF0dXJlcxgCIAEoBBIXCg9taW5pbXVtX2VkaXRpb24YAyABKAUSFwoPbWF4aW11bV9lZGl0aW9uGAQgASgFEkIKBGZpbGUYDyADKAsyNC5nb29nbGUucHJvdG9idWYuY29tcGlsZXIuQ29kZUdlbmVyYXRvclJlc3BvbnNlLkZpbGUafwoERmlsZRIMCgRuYW1lGAEgASgJEhcKD2luc2VydGlvbl9wb2ludBgCIAEoCRIPCgdjb250ZW50GA8gASgJEj8KE2dlbmVyYXRlZF9jb2RlX2luZm8YECABKAsyIi5nb29nbGUucHJvdG9idWYuR2VuZXJhdGVkQ29kZUluZm8iVwoHRmVhdHVyZRIQCgxGRUFUVVJFX05PTkUQABIbChdGRUFUVVJFX1BST1RPM19PUFRJT05BTBABEh0KGUZFQVRVUkVfU1VQUE9SVFNfRURJVElPTlMQAkJyChxjb20uZ29vZ2xlLnByb3RvYnVmLmNvbXBpbGVyQgxQbHVnaW5Qcm90b3NaKWdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL3BsdWdpbnBiqgIYR29vZ2xlLlByb3RvYnVmLkNvbXBpbGVy",
    [descriptor_pb_js_1.file_google_protobuf_descriptor],
  );
  cjsExports.VersionSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_compiler_plugin, 0);
  cjsExports.CodeGeneratorRequestSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_compiler_plugin,
    1,
  );
  cjsExports.CodeGeneratorResponseSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_compiler_plugin,
    2,
  );
  cjsExports.CodeGeneratorResponse_FileSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_compiler_plugin,
    2,
    0,
  );
  var CodeGeneratorResponse_Feature;
  (function (CodeGeneratorResponse_Feature) {
    CodeGeneratorResponse_Feature[(CodeGeneratorResponse_Feature.NONE = 0)] = "NONE";
    CodeGeneratorResponse_Feature[(CodeGeneratorResponse_Feature.PROTO3_OPTIONAL = 1)] = "PROTO3_OPTIONAL";
    CodeGeneratorResponse_Feature[(CodeGeneratorResponse_Feature.SUPPORTS_EDITIONS = 2)] =
      "SUPPORTS_EDITIONS";
  })(
    CodeGeneratorResponse_Feature ||
      (cjsExports.CodeGeneratorResponse_Feature = CodeGeneratorResponse_Feature = {}),
  );
  cjsExports.CodeGeneratorResponse_FeatureSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_compiler_plugin,
    2,
    0,
  );
});
export { require_plugin_pb };
