/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/type_pb.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_file } from "../../../../codegenv2/file.js";
import { require_any_pb } from "../../../../../commonjs/wkt/google/protobuf/any_pb.js";
import { require_source_context_pb } from "./source_context_pb.js";
import { require_message } from "../../../../codegenv2/message.js";
import { require_enum } from "../../../../codegenv2/enum.js";

//@ chunk-qg41pqt6.js:421548-425587 cjs-fingerprint
var require_type_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SyntaxSchema =
    cjsExports.Syntax =
    cjsExports.OptionSchema =
    cjsExports.EnumValueSchema =
    cjsExports.EnumSchema =
    cjsExports.Field_CardinalitySchema =
    cjsExports.Field_Cardinality =
    cjsExports.Field_KindSchema =
    cjsExports.Field_Kind =
    cjsExports.FieldSchema =
    cjsExports.TypeSchema =
    cjsExports.file_google_protobuf_type =
      undefined;
  var file_js_1 = require_file();
  var any_pb_js_1 = require_any_pb();
  var source_context_pb_js_1 = require_source_context_pb();
  var message_js_1 = require_message();
  var enum_js_1 = require_enum();
  cjsExports.file_google_protobuf_type = file_js_1.fileDesc(
    "Chpnb29nbGUvcHJvdG9idWYvdHlwZS5wcm90bxIPZ29vZ2xlLnByb3RvYnVmIugBCgRUeXBlEgwKBG5hbWUYASABKAkSJgoGZmllbGRzGAIgAygLMhYuZ29vZ2xlLnByb3RvYnVmLkZpZWxkEg4KBm9uZW9mcxgDIAMoCRIoCgdvcHRpb25zGAQgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhI2Cg5zb3VyY2VfY29udGV4dBgFIAEoCzIeLmdvb2dsZS5wcm90b2J1Zi5Tb3VyY2VDb250ZXh0EicKBnN5bnRheBgGIAEoDjIXLmdvb2dsZS5wcm90b2J1Zi5TeW50YXgSDwoHZWRpdGlvbhgHIAEoCSLVBQoFRmllbGQSKQoEa2luZBgBIAEoDjIbLmdvb2dsZS5wcm90b2J1Zi5GaWVsZC5LaW5kEjcKC2NhcmRpbmFsaXR5GAIgASgOMiIuZ29vZ2xlLnByb3RvYnVmLkZpZWxkLkNhcmRpbmFsaXR5Eg4KBm51bWJlchgDIAEoBRIMCgRuYW1lGAQgASgJEhAKCHR5cGVfdXJsGAYgASgJEhMKC29uZW9mX2luZGV4GAcgASgFEg4KBnBhY2tlZBgIIAEoCBIoCgdvcHRpb25zGAkgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhIRCglqc29uX25hbWUYCiABKAkSFQoNZGVmYXVsdF92YWx1ZRgLIAEoCSLIAgoES2luZBIQCgxUWVBFX1VOS05PV04QABIPCgtUWVBFX0RPVUJMRRABEg4KClRZUEVfRkxPQVQQAhIOCgpUWVBFX0lOVDY0EAMSDwoLVFlQRV9VSU5UNjQQBBIOCgpUWVBFX0lOVDMyEAUSEAoMVFlQRV9GSVhFRDY0EAYSEAoMVFlQRV9GSVhFRDMyEAcSDQoJVFlQRV9CT09MEAgSDwoLVFlQRV9TVFJJTkcQCRIOCgpUWVBFX0dST1VQEAoSEAoMVFlQRV9NRVNTQUdFEAsSDgoKVFlQRV9CWVRFUxAMEg8KC1RZUEVfVUlOVDMyEA0SDQoJVFlQRV9FTlVNEA4SEQoNVFlQRV9TRklYRUQzMhAPEhEKDVRZUEVfU0ZJWEVENjQQEBIPCgtUWVBFX1NJTlQzMhAREg8KC1RZUEVfU0lOVDY0EBIidAoLQ2FyZGluYWxpdHkSFwoTQ0FSRElOQUxJVFlfVU5LTk9XThAAEhgKFENBUkRJTkFMSVRZX09QVElPTkFMEAESGAoUQ0FSRElOQUxJVFlfUkVRVUlSRUQQAhIYChRDQVJESU5BTElUWV9SRVBFQVRFRBADIt8BCgRFbnVtEgwKBG5hbWUYASABKAkSLQoJZW51bXZhbHVlGAIgAygLMhouZ29vZ2xlLnByb3RvYnVmLkVudW1WYWx1ZRIoCgdvcHRpb25zGAMgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhI2Cg5zb3VyY2VfY29udGV4dBgEIAEoCzIeLmdvb2dsZS5wcm90b2J1Zi5Tb3VyY2VDb250ZXh0EicKBnN5bnRheBgFIAEoDjIXLmdvb2dsZS5wcm90b2J1Zi5TeW50YXgSDwoHZWRpdGlvbhgGIAEoCSJTCglFbnVtVmFsdWUSDAoEbmFtZRgBIAEoCRIOCgZudW1iZXIYAiABKAUSKAoHb3B0aW9ucxgDIAMoCzIXLmdvb2dsZS5wcm90b2J1Zi5PcHRpb24iOwoGT3B0aW9uEgwKBG5hbWUYASABKAkSIwoFdmFsdWUYAiABKAsyFC5nb29nbGUucHJvdG9idWYuQW55KkMKBlN5bnRheBIRCg1TWU5UQVhfUFJPVE8yEAASEQoNU1lOVEFYX1BST1RPMxABEhMKD1NZTlRBWF9FRElUSU9OUxACQnsKE2NvbS5nb29nbGUucHJvdG9idWZCCVR5cGVQcm90b1ABWi1nb29nbGUuZ29sYW5nLm9yZy9wcm90b2J1Zi90eXBlcy9rbm93bi90eXBlcGL4AQGiAgNHUEKqAh5Hb29nbGUuUHJvdG9idWYuV2VsbEtub3duVHlwZXNiBnByb3RvMw",
    [any_pb_js_1.file_google_protobuf_any, source_context_pb_js_1.file_google_protobuf_source_context],
  );
  cjsExports.TypeSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_type, 0);
  cjsExports.FieldSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_type, 1);
  var Field_Kind;
  (function (Field_Kind) {
    Field_Kind[(Field_Kind.TYPE_UNKNOWN = 0)] = "TYPE_UNKNOWN";
    Field_Kind[(Field_Kind.TYPE_DOUBLE = 1)] = "TYPE_DOUBLE";
    Field_Kind[(Field_Kind.TYPE_FLOAT = 2)] = "TYPE_FLOAT";
    Field_Kind[(Field_Kind.TYPE_INT64 = 3)] = "TYPE_INT64";
    Field_Kind[(Field_Kind.TYPE_UINT64 = 4)] = "TYPE_UINT64";
    Field_Kind[(Field_Kind.TYPE_INT32 = 5)] = "TYPE_INT32";
    Field_Kind[(Field_Kind.TYPE_FIXED64 = 6)] = "TYPE_FIXED64";
    Field_Kind[(Field_Kind.TYPE_FIXED32 = 7)] = "TYPE_FIXED32";
    Field_Kind[(Field_Kind.TYPE_BOOL = 8)] = "TYPE_BOOL";
    Field_Kind[(Field_Kind.TYPE_STRING = 9)] = "TYPE_STRING";
    Field_Kind[(Field_Kind.TYPE_GROUP = 10)] = "TYPE_GROUP";
    Field_Kind[(Field_Kind.TYPE_MESSAGE = 11)] = "TYPE_MESSAGE";
    Field_Kind[(Field_Kind.TYPE_BYTES = 12)] = "TYPE_BYTES";
    Field_Kind[(Field_Kind.TYPE_UINT32 = 13)] = "TYPE_UINT32";
    Field_Kind[(Field_Kind.TYPE_ENUM = 14)] = "TYPE_ENUM";
    Field_Kind[(Field_Kind.TYPE_SFIXED32 = 15)] = "TYPE_SFIXED32";
    Field_Kind[(Field_Kind.TYPE_SFIXED64 = 16)] = "TYPE_SFIXED64";
    Field_Kind[(Field_Kind.TYPE_SINT32 = 17)] = "TYPE_SINT32";
    Field_Kind[(Field_Kind.TYPE_SINT64 = 18)] = "TYPE_SINT64";
  })(Field_Kind || (cjsExports.Field_Kind = Field_Kind = {}));
  cjsExports.Field_KindSchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_type, 1, 0);
  var Field_Cardinality;
  (function (Field_Cardinality) {
    Field_Cardinality[(Field_Cardinality.UNKNOWN = 0)] = "UNKNOWN";
    Field_Cardinality[(Field_Cardinality.OPTIONAL = 1)] = "OPTIONAL";
    Field_Cardinality[(Field_Cardinality.REQUIRED = 2)] = "REQUIRED";
    Field_Cardinality[(Field_Cardinality.REPEATED = 3)] = "REPEATED";
  })(Field_Cardinality || (cjsExports.Field_Cardinality = Field_Cardinality = {}));
  cjsExports.Field_CardinalitySchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_type, 1, 1);
  cjsExports.EnumSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_type, 2);
  cjsExports.EnumValueSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_type, 3);
  cjsExports.OptionSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_type, 4);
  var Syntax;
  (function (Syntax) {
    Syntax[(Syntax.PROTO2 = 0)] = "PROTO2";
    Syntax[(Syntax.PROTO3 = 1)] = "PROTO3";
    Syntax[(Syntax.EDITIONS = 2)] = "EDITIONS";
  })(Syntax || (cjsExports.Syntax = Syntax = {}));
  cjsExports.SyntaxSchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_type, 0);
});
export { require_type_pb };
