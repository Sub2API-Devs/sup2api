/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/type_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../../../runtime/bun-runtime.js";
import { Ds } from "../../../../codegenv2/file.js";
import { Yg } from "../../../../../commonjs/wkt/google/protobuf/any_pb.js";
import { Qg } from "./source_context_pb.js";
import { Ts } from "../../../../codegenv2/message.js";
import { Ea } from "../../../../codegenv2/enum.js";

//@ chunk-fq0cr76a.js:420978-425017 cjs-fingerprint
var y_ = x(function (JO) {
  Object.defineProperty(JO, "__esModule", { value: !0 });
  JO.SyntaxSchema =
    JO.Syntax =
    JO.OptionSchema =
    JO.EnumValueSchema =
    JO.EnumSchema =
    JO.Field_CardinalitySchema =
    JO.Field_Cardinality =
    JO.Field_KindSchema =
    JO.Field_Kind =
    JO.FieldSchema =
    JO.TypeSchema =
    JO.file_google_protobuf_type =
      void 0;
  var ZO = Ds(),
    zO = Yg(),
    XO = Qg(),
    Bo = Ts(),
    ju = Ea();
  JO.file_google_protobuf_type = ZO.fileDesc(
    "Chpnb29nbGUvcHJvdG9idWYvdHlwZS5wcm90bxIPZ29vZ2xlLnByb3RvYnVmIugBCgRUeXBlEgwKBG5hbWUYASABKAkSJgoGZmllbGRzGAIgAygLMhYuZ29vZ2xlLnByb3RvYnVmLkZpZWxkEg4KBm9uZW9mcxgDIAMoCRIoCgdvcHRpb25zGAQgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhI2Cg5zb3VyY2VfY29udGV4dBgFIAEoCzIeLmdvb2dsZS5wcm90b2J1Zi5Tb3VyY2VDb250ZXh0EicKBnN5bnRheBgGIAEoDjIXLmdvb2dsZS5wcm90b2J1Zi5TeW50YXgSDwoHZWRpdGlvbhgHIAEoCSLVBQoFRmllbGQSKQoEa2luZBgBIAEoDjIbLmdvb2dsZS5wcm90b2J1Zi5GaWVsZC5LaW5kEjcKC2NhcmRpbmFsaXR5GAIgASgOMiIuZ29vZ2xlLnByb3RvYnVmLkZpZWxkLkNhcmRpbmFsaXR5Eg4KBm51bWJlchgDIAEoBRIMCgRuYW1lGAQgASgJEhAKCHR5cGVfdXJsGAYgASgJEhMKC29uZW9mX2luZGV4GAcgASgFEg4KBnBhY2tlZBgIIAEoCBIoCgdvcHRpb25zGAkgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhIRCglqc29uX25hbWUYCiABKAkSFQoNZGVmYXVsdF92YWx1ZRgLIAEoCSLIAgoES2luZBIQCgxUWVBFX1VOS05PV04QABIPCgtUWVBFX0RPVUJMRRABEg4KClRZUEVfRkxPQVQQAhIOCgpUWVBFX0lOVDY0EAMSDwoLVFlQRV9VSU5UNjQQBBIOCgpUWVBFX0lOVDMyEAUSEAoMVFlQRV9GSVhFRDY0EAYSEAoMVFlQRV9GSVhFRDMyEAcSDQoJVFlQRV9CT09MEAgSDwoLVFlQRV9TVFJJTkcQCRIOCgpUWVBFX0dST1VQEAoSEAoMVFlQRV9NRVNTQUdFEAsSDgoKVFlQRV9CWVRFUxAMEg8KC1RZUEVfVUlOVDMyEA0SDQoJVFlQRV9FTlVNEA4SEQoNVFlQRV9TRklYRUQzMhAPEhEKDVRZUEVfU0ZJWEVENjQQEBIPCgtUWVBFX1NJTlQzMhAREg8KC1RZUEVfU0lOVDY0EBIidAoLQ2FyZGluYWxpdHkSFwoTQ0FSRElOQUxJVFlfVU5LTk9XThAAEhgKFENBUkRJTkFMSVRZX09QVElPTkFMEAESGAoUQ0FSRElOQUxJVFlfUkVRVUlSRUQQAhIYChRDQVJESU5BTElUWV9SRVBFQVRFRBADIt8BCgRFbnVtEgwKBG5hbWUYASABKAkSLQoJZW51bXZhbHVlGAIgAygLMhouZ29vZ2xlLnByb3RvYnVmLkVudW1WYWx1ZRIoCgdvcHRpb25zGAMgAygLMhcuZ29vZ2xlLnByb3RvYnVmLk9wdGlvbhI2Cg5zb3VyY2VfY29udGV4dBgEIAEoCzIeLmdvb2dsZS5wcm90b2J1Zi5Tb3VyY2VDb250ZXh0EicKBnN5bnRheBgFIAEoDjIXLmdvb2dsZS5wcm90b2J1Zi5TeW50YXgSDwoHZWRpdGlvbhgGIAEoCSJTCglFbnVtVmFsdWUSDAoEbmFtZRgBIAEoCRIOCgZudW1iZXIYAiABKAUSKAoHb3B0aW9ucxgDIAMoCzIXLmdvb2dsZS5wcm90b2J1Zi5PcHRpb24iOwoGT3B0aW9uEgwKBG5hbWUYASABKAkSIwoFdmFsdWUYAiABKAsyFC5nb29nbGUucHJvdG9idWYuQW55KkMKBlN5bnRheBIRCg1TWU5UQVhfUFJPVE8yEAASEQoNU1lOVEFYX1BST1RPMxABEhMKD1NZTlRBWF9FRElUSU9OUxACQnsKE2NvbS5nb29nbGUucHJvdG9idWZCCVR5cGVQcm90b1ABWi1nb29nbGUuZ29sYW5nLm9yZy9wcm90b2J1Zi90eXBlcy9rbm93bi90eXBlcGL4AQGiAgNHUEKqAh5Hb29nbGUuUHJvdG9idWYuV2VsbEtub3duVHlwZXNiBnByb3RvMw",
    [zO.file_google_protobuf_any, XO.file_google_protobuf_source_context],
  );
  JO.TypeSchema = Bo.messageDesc(JO.file_google_protobuf_type, 0);
  JO.FieldSchema = Bo.messageDesc(JO.file_google_protobuf_type, 1);
  var KO;
  (function (e) {
    ((e[(e.TYPE_UNKNOWN = 0)] = "TYPE_UNKNOWN"),
      (e[(e.TYPE_DOUBLE = 1)] = "TYPE_DOUBLE"),
      (e[(e.TYPE_FLOAT = 2)] = "TYPE_FLOAT"),
      (e[(e.TYPE_INT64 = 3)] = "TYPE_INT64"),
      (e[(e.TYPE_UINT64 = 4)] = "TYPE_UINT64"),
      (e[(e.TYPE_INT32 = 5)] = "TYPE_INT32"),
      (e[(e.TYPE_FIXED64 = 6)] = "TYPE_FIXED64"),
      (e[(e.TYPE_FIXED32 = 7)] = "TYPE_FIXED32"),
      (e[(e.TYPE_BOOL = 8)] = "TYPE_BOOL"),
      (e[(e.TYPE_STRING = 9)] = "TYPE_STRING"),
      (e[(e.TYPE_GROUP = 10)] = "TYPE_GROUP"),
      (e[(e.TYPE_MESSAGE = 11)] = "TYPE_MESSAGE"),
      (e[(e.TYPE_BYTES = 12)] = "TYPE_BYTES"),
      (e[(e.TYPE_UINT32 = 13)] = "TYPE_UINT32"),
      (e[(e.TYPE_ENUM = 14)] = "TYPE_ENUM"),
      (e[(e.TYPE_SFIXED32 = 15)] = "TYPE_SFIXED32"),
      (e[(e.TYPE_SFIXED64 = 16)] = "TYPE_SFIXED64"),
      (e[(e.TYPE_SINT32 = 17)] = "TYPE_SINT32"),
      (e[(e.TYPE_SINT64 = 18)] = "TYPE_SINT64"));
  })(KO || (JO.Field_Kind = KO = {}));
  JO.Field_KindSchema = ju.enumDesc(JO.file_google_protobuf_type, 1, 0);
  var jO;
  (function (e) {
    ((e[(e.UNKNOWN = 0)] = "UNKNOWN"),
      (e[(e.OPTIONAL = 1)] = "OPTIONAL"),
      (e[(e.REQUIRED = 2)] = "REQUIRED"),
      (e[(e.REPEATED = 3)] = "REPEATED"));
  })(jO || (JO.Field_Cardinality = jO = {}));
  JO.Field_CardinalitySchema = ju.enumDesc(JO.file_google_protobuf_type, 1, 1);
  JO.EnumSchema = Bo.messageDesc(JO.file_google_protobuf_type, 2);
  JO.EnumValueSchema = Bo.messageDesc(JO.file_google_protobuf_type, 3);
  JO.OptionSchema = Bo.messageDesc(JO.file_google_protobuf_type, 4);
  var YO;
  (function (e) {
    ((e[(e.PROTO2 = 0)] = "PROTO2"), (e[(e.PROTO3 = 1)] = "PROTO3"), (e[(e.EDITIONS = 2)] = "EDITIONS"));
  })(YO || (JO.Syntax = YO = {}));
  JO.SyntaxSchema = ju.enumDesc(JO.file_google_protobuf_type, 0);
});

export { y_ };
