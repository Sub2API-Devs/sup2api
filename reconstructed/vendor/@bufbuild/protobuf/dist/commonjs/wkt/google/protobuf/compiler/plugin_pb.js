/**
 * @bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/compiler/plugin_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../../../runtime/bun-runtime.js";
import { Ds } from "../../../../../cjs/codegenv2/file.js";
import { Rl } from "../../../gen/google/protobuf/descriptor_pb.js";
import { Ts } from "../../../../../cjs/codegenv2/message.js";
import { Ea } from "../../../../../cjs/codegenv2/enum.js";

//@ chunk-fq0cr76a.js:438286-440563 cjs-fingerprint
var cP = x(function (aP) {
  Object.defineProperty(aP, "__esModule", { value: !0 });
  aP.CodeGeneratorResponse_FeatureSchema =
    aP.CodeGeneratorResponse_Feature =
    aP.CodeGeneratorResponse_FileSchema =
    aP.CodeGeneratorResponseSchema =
    aP.CodeGeneratorRequestSchema =
    aP.VersionSchema =
    aP.file_google_protobuf_compiler_plugin =
      void 0;
  var sP = Ds(),
    iP = Rl(),
    Nl = Ts(),
    oP = Ea();
  aP.file_google_protobuf_compiler_plugin = sP.fileDesc(
    "CiVnb29nbGUvcHJvdG9idWYvY29tcGlsZXIvcGx1Z2luLnByb3RvEhhnb29nbGUucHJvdG9idWYuY29tcGlsZXIiRgoHVmVyc2lvbhINCgVtYWpvchgBIAEoBRINCgVtaW5vchgCIAEoBRINCgVwYXRjaBgDIAEoBRIOCgZzdWZmaXgYBCABKAkigQIKFENvZGVHZW5lcmF0b3JSZXF1ZXN0EhgKEGZpbGVfdG9fZ2VuZXJhdGUYASADKAkSEQoJcGFyYW1ldGVyGAIgASgJEjgKCnByb3RvX2ZpbGUYDyADKAsyJC5nb29nbGUucHJvdG9idWYuRmlsZURlc2NyaXB0b3JQcm90bxJFChdzb3VyY2VfZmlsZV9kZXNjcmlwdG9ycxgRIAMoCzIkLmdvb2dsZS5wcm90b2J1Zi5GaWxlRGVzY3JpcHRvclByb3RvEjsKEGNvbXBpbGVyX3ZlcnNpb24YAyABKAsyIS5nb29nbGUucHJvdG9idWYuY29tcGlsZXIuVmVyc2lvbiKSAwoVQ29kZUdlbmVyYXRvclJlc3BvbnNlEg0KBWVycm9yGAEgASgJEhoKEnN1cHBvcnRlZF9mZWF0dXJlcxgCIAEoBBIXCg9taW5pbXVtX2VkaXRpb24YAyABKAUSFwoPbWF4aW11bV9lZGl0aW9uGAQgASgFEkIKBGZpbGUYDyADKAsyNC5nb29nbGUucHJvdG9idWYuY29tcGlsZXIuQ29kZUdlbmVyYXRvclJlc3BvbnNlLkZpbGUafwoERmlsZRIMCgRuYW1lGAEgASgJEhcKD2luc2VydGlvbl9wb2ludBgCIAEoCRIPCgdjb250ZW50GA8gASgJEj8KE2dlbmVyYXRlZF9jb2RlX2luZm8YECABKAsyIi5nb29nbGUucHJvdG9idWYuR2VuZXJhdGVkQ29kZUluZm8iVwoHRmVhdHVyZRIQCgxGRUFUVVJFX05PTkUQABIbChdGRUFUVVJFX1BST1RPM19PUFRJT05BTBABEh0KGUZFQVRVUkVfU1VQUE9SVFNfRURJVElPTlMQAkJyChxjb20uZ29vZ2xlLnByb3RvYnVmLmNvbXBpbGVyQgxQbHVnaW5Qcm90b3NaKWdvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL3BsdWdpbnBiqgIYR29vZ2xlLlByb3RvYnVmLkNvbXBpbGVy",
    [iP.file_google_protobuf_descriptor],
  );
  aP.VersionSchema = Nl.messageDesc(aP.file_google_protobuf_compiler_plugin, 0);
  aP.CodeGeneratorRequestSchema = Nl.messageDesc(aP.file_google_protobuf_compiler_plugin, 1);
  aP.CodeGeneratorResponseSchema = Nl.messageDesc(aP.file_google_protobuf_compiler_plugin, 2);
  aP.CodeGeneratorResponse_FileSchema = Nl.messageDesc(aP.file_google_protobuf_compiler_plugin, 2, 0);
  var rP;
  (function (e) {
    ((e[(e.NONE = 0)] = "NONE"),
      (e[(e.PROTO3_OPTIONAL = 1)] = "PROTO3_OPTIONAL"),
      (e[(e.SUPPORTS_EDITIONS = 2)] = "SUPPORTS_EDITIONS"));
  })(rP || (aP.CodeGeneratorResponse_Feature = rP = {}));
  aP.CodeGeneratorResponse_FeatureSchema = oP.enumDesc(aP.file_google_protobuf_compiler_plugin, 2, 0);
});

export { cP };
