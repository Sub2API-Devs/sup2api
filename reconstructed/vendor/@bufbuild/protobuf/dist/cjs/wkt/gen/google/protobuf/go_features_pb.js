/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/go_features_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_file } from "../../../../codegenv2/file.js";
import { require_descriptor_pb } from "../../../../../commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { require_message } from "../../../../codegenv2/message.js";
import { require_enum } from "../../../../codegenv2/enum.js";
import { require_extension } from "../../../../codegenv2/extension.js";

//@ chunk-fq0cr76a.js:429349-432292 cjs-fingerprint
var require_go_features_pb = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.go =
    cjsExports.GoFeatures_StripEnumPrefixSchema =
    cjsExports.GoFeatures_StripEnumPrefix =
    cjsExports.GoFeatures_APILevelSchema =
    cjsExports.GoFeatures_APILevel =
    cjsExports.GoFeatures_OptimizeModeFeature_OptimizeModeSchema =
    cjsExports.GoFeatures_OptimizeModeFeature_OptimizeMode =
    cjsExports.GoFeatures_OptimizeModeFeatureSchema =
    cjsExports.GoFeaturesSchema =
    cjsExports.file_google_protobuf_go_features =
      undefined;
  var file_js_1 = require_file();
  var descriptor_pb_js_1 = require_descriptor_pb();
  var message_js_1 = require_message();
  var enum_js_1 = require_enum();
  var extension_js_1 = require_extension();
  cjsExports.file_google_protobuf_go_features = file_js_1.fileDesc(
    "CiFnb29nbGUvcHJvdG9idWYvZ29fZmVhdHVyZXMucHJvdG8SAnBiItEGCgpHb0ZlYXR1cmVzEqUBChpsZWdhY3lfdW5tYXJzaGFsX2pzb25fZW51bRgBIAEoCEKAAYgBAZgBBpgBAaIBCRIEdHJ1ZRiEB6IBChIFZmFsc2UY5weyAVsI6AcQ6AcaU1RoZSBsZWdhY3kgVW5tYXJzaGFsSlNPTiBBUEkgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIGVkaXRpb24uEmoKCWFwaV9sZXZlbBgCIAEoDjIXLnBiLkdvRmVhdHVyZXMuQVBJTGV2ZWxCPogBAZgBA5gBAaIBGhIVQVBJX0xFVkVMX1VOU1BFQ0lGSUVEGIQHogEPEgpBUElfT1BBUVVFGOkHsgEDCOgHEmsKEXN0cmlwX2VudW1fcHJlZml4GAMgASgOMh4ucGIuR29GZWF0dXJlcy5TdHJpcEVudW1QcmVmaXhCMIgBAZgBBpgBB5gBAaIBGxIWU1RSSVBfRU5VTV9QUkVGSVhfS0VFUBiEB7IBAwjpBxJ4Cg1vcHRpbWl6ZV9tb2RlGAQgASgOMi8ucGIuR29GZWF0dXJlcy5PcHRpbWl6ZU1vZGVGZWF0dXJlLk9wdGltaXplTW9kZUIwiAEBmAEDmAEBogEeEhlPUFRJTUlaRV9NT0RFX1VOU1BFQ0lGSUVEGIQHsgEDCOkHGl4KE09wdGltaXplTW9kZUZlYXR1cmUiRwoMT3B0aW1pemVNb2RlEh0KGU9QVElNSVpFX01PREVfVU5TUEVDSUZJRUQQABIJCgVTUEVFRBABEg0KCUNPREVfU0laRRACIlMKCEFQSUxldmVsEhkKFUFQSV9MRVZFTF9VTlNQRUNJRklFRBAAEgwKCEFQSV9PUEVOEAESDgoKQVBJX0hZQlJJRBACEg4KCkFQSV9PUEFRVUUQAyKSAQoPU3RyaXBFbnVtUHJlZml4EiEKHVNUUklQX0VOVU1fUFJFRklYX1VOU1BFQ0lGSUVEEAASGgoWU1RSSVBfRU5VTV9QUkVGSVhfS0VFUBABEiMKH1NUUklQX0VOVU1fUFJFRklYX0dFTkVSQVRFX0JPVEgQAhIbChdTVFJJUF9FTlVNX1BSRUZJWF9TVFJJUBADOjwKAmdvEhsuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQY6gcgASgLMg4ucGIuR29GZWF0dXJlc1ICZ29CL1otZ29vZ2xlLmdvbGFuZy5vcmcvcHJvdG9idWYvdHlwZXMvZ29mZWF0dXJlc3Bi",
    [descriptor_pb_js_1.file_google_protobuf_descriptor],
  );
  cjsExports.GoFeaturesSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_go_features, 0);
  cjsExports.GoFeatures_OptimizeModeFeatureSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_go_features,
    0,
    0,
  );
  var GoFeatures_OptimizeModeFeature_OptimizeMode;
  (function (GoFeatures_OptimizeModeFeature_OptimizeMode) {
    GoFeatures_OptimizeModeFeature_OptimizeMode[
      (GoFeatures_OptimizeModeFeature_OptimizeMode.OPTIMIZE_MODE_UNSPECIFIED = 0)
    ] = "OPTIMIZE_MODE_UNSPECIFIED";
    GoFeatures_OptimizeModeFeature_OptimizeMode[(GoFeatures_OptimizeModeFeature_OptimizeMode.SPEED = 1)] =
      "SPEED";
    GoFeatures_OptimizeModeFeature_OptimizeMode[(GoFeatures_OptimizeModeFeature_OptimizeMode.CODE_SIZE = 2)] =
      "CODE_SIZE";
  })(
    GoFeatures_OptimizeModeFeature_OptimizeMode ||
      (cjsExports.GoFeatures_OptimizeModeFeature_OptimizeMode = GoFeatures_OptimizeModeFeature_OptimizeMode =
        {}),
  );
  cjsExports.GoFeatures_OptimizeModeFeature_OptimizeModeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_go_features,
    0,
    0,
    0,
  );
  var GoFeatures_APILevel;
  (function (GoFeatures_APILevel) {
    GoFeatures_APILevel[(GoFeatures_APILevel.API_LEVEL_UNSPECIFIED = 0)] = "API_LEVEL_UNSPECIFIED";
    GoFeatures_APILevel[(GoFeatures_APILevel.API_OPEN = 1)] = "API_OPEN";
    GoFeatures_APILevel[(GoFeatures_APILevel.API_HYBRID = 2)] = "API_HYBRID";
    GoFeatures_APILevel[(GoFeatures_APILevel.API_OPAQUE = 3)] = "API_OPAQUE";
  })(GoFeatures_APILevel || (cjsExports.GoFeatures_APILevel = GoFeatures_APILevel = {}));
  cjsExports.GoFeatures_APILevelSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_go_features,
    0,
    0,
  );
  var GoFeatures_StripEnumPrefix;
  (function (GoFeatures_StripEnumPrefix) {
    GoFeatures_StripEnumPrefix[(GoFeatures_StripEnumPrefix.UNSPECIFIED = 0)] = "UNSPECIFIED";
    GoFeatures_StripEnumPrefix[(GoFeatures_StripEnumPrefix.KEEP = 1)] = "KEEP";
    GoFeatures_StripEnumPrefix[(GoFeatures_StripEnumPrefix.GENERATE_BOTH = 2)] = "GENERATE_BOTH";
    GoFeatures_StripEnumPrefix[(GoFeatures_StripEnumPrefix.STRIP = 3)] = "STRIP";
  })(GoFeatures_StripEnumPrefix || (cjsExports.GoFeatures_StripEnumPrefix = GoFeatures_StripEnumPrefix = {}));
  cjsExports.GoFeatures_StripEnumPrefixSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_go_features,
    0,
    1,
  );
  cjsExports.go = extension_js_1.extDesc(cjsExports.file_google_protobuf_go_features, 0);
});
export { require_go_features_pb };
