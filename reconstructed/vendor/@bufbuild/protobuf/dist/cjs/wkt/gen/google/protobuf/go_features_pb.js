/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/go_features_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../../../runtime/bun-runtime.js";
import { Ds } from "../../../../codegenv2/file.js";
import { Rl } from "../../../../../commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { Ts } from "../../../../codegenv2/message.js";
import { Ea } from "../../../../codegenv2/enum.js";
import { hp } from "../../../../codegenv2/extension.js";

//@ chunk-fq0cr76a.js:429349-432292 cjs-fingerprint
var U2 = x(function (L2) {
  Object.defineProperty(L2, "__esModule", { value: !0 });
  L2.go =
    L2.GoFeatures_StripEnumPrefixSchema =
    L2.GoFeatures_StripEnumPrefix =
    L2.GoFeatures_APILevelSchema =
    L2.GoFeatures_APILevel =
    L2.GoFeatures_OptimizeModeFeature_OptimizeModeSchema =
    L2.GoFeatures_OptimizeModeFeature_OptimizeMode =
    L2.GoFeatures_OptimizeModeFeatureSchema =
    L2.GoFeaturesSchema =
    L2.file_google_protobuf_go_features =
      void 0;
  var D2 = Ds(),
    O2 = Rl(),
    ny = Ts(),
    Zu = Ea(),
    P2 = hp();
  L2.file_google_protobuf_go_features = D2.fileDesc(
    "CiFnb29nbGUvcHJvdG9idWYvZ29fZmVhdHVyZXMucHJvdG8SAnBiItEGCgpHb0ZlYXR1cmVzEqUBChpsZWdhY3lfdW5tYXJzaGFsX2pzb25fZW51bRgBIAEoCEKAAYgBAZgBBpgBAaIBCRIEdHJ1ZRiEB6IBChIFZmFsc2UY5weyAVsI6AcQ6AcaU1RoZSBsZWdhY3kgVW5tYXJzaGFsSlNPTiBBUEkgaXMgZGVwcmVjYXRlZCBhbmQgd2lsbCBiZSByZW1vdmVkIGluIGEgZnV0dXJlIGVkaXRpb24uEmoKCWFwaV9sZXZlbBgCIAEoDjIXLnBiLkdvRmVhdHVyZXMuQVBJTGV2ZWxCPogBAZgBA5gBAaIBGhIVQVBJX0xFVkVMX1VOU1BFQ0lGSUVEGIQHogEPEgpBUElfT1BBUVVFGOkHsgEDCOgHEmsKEXN0cmlwX2VudW1fcHJlZml4GAMgASgOMh4ucGIuR29GZWF0dXJlcy5TdHJpcEVudW1QcmVmaXhCMIgBAZgBBpgBB5gBAaIBGxIWU1RSSVBfRU5VTV9QUkVGSVhfS0VFUBiEB7IBAwjpBxJ4Cg1vcHRpbWl6ZV9tb2RlGAQgASgOMi8ucGIuR29GZWF0dXJlcy5PcHRpbWl6ZU1vZGVGZWF0dXJlLk9wdGltaXplTW9kZUIwiAEBmAEDmAEBogEeEhlPUFRJTUlaRV9NT0RFX1VOU1BFQ0lGSUVEGIQHsgEDCOkHGl4KE09wdGltaXplTW9kZUZlYXR1cmUiRwoMT3B0aW1pemVNb2RlEh0KGU9QVElNSVpFX01PREVfVU5TUEVDSUZJRUQQABIJCgVTUEVFRBABEg0KCUNPREVfU0laRRACIlMKCEFQSUxldmVsEhkKFUFQSV9MRVZFTF9VTlNQRUNJRklFRBAAEgwKCEFQSV9PUEVOEAESDgoKQVBJX0hZQlJJRBACEg4KCkFQSV9PUEFRVUUQAyKSAQoPU3RyaXBFbnVtUHJlZml4EiEKHVNUUklQX0VOVU1fUFJFRklYX1VOU1BFQ0lGSUVEEAASGgoWU1RSSVBfRU5VTV9QUkVGSVhfS0VFUBABEiMKH1NUUklQX0VOVU1fUFJFRklYX0dFTkVSQVRFX0JPVEgQAhIbChdTVFJJUF9FTlVNX1BSRUZJWF9TVFJJUBADOjwKAmdvEhsuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQY6gcgASgLMg4ucGIuR29GZWF0dXJlc1ICZ29CL1otZ29vZ2xlLmdvbGFuZy5vcmcvcHJvdG9idWYvdHlwZXMvZ29mZWF0dXJlc3Bi",
    [O2.file_google_protobuf_descriptor],
  );
  L2.GoFeaturesSchema = ny.messageDesc(L2.file_google_protobuf_go_features, 0);
  L2.GoFeatures_OptimizeModeFeatureSchema = ny.messageDesc(L2.file_google_protobuf_go_features, 0, 0);
  var I2;
  (function (e) {
    ((e[(e.OPTIMIZE_MODE_UNSPECIFIED = 0)] = "OPTIMIZE_MODE_UNSPECIFIED"),
      (e[(e.SPEED = 1)] = "SPEED"),
      (e[(e.CODE_SIZE = 2)] = "CODE_SIZE"));
  })(I2 || (L2.GoFeatures_OptimizeModeFeature_OptimizeMode = I2 = {}));
  L2.GoFeatures_OptimizeModeFeature_OptimizeModeSchema = Zu.enumDesc(
    L2.file_google_protobuf_go_features,
    0,
    0,
    0,
  );
  var N2;
  (function (e) {
    ((e[(e.API_LEVEL_UNSPECIFIED = 0)] = "API_LEVEL_UNSPECIFIED"),
      (e[(e.API_OPEN = 1)] = "API_OPEN"),
      (e[(e.API_HYBRID = 2)] = "API_HYBRID"),
      (e[(e.API_OPAQUE = 3)] = "API_OPAQUE"));
  })(N2 || (L2.GoFeatures_APILevel = N2 = {}));
  L2.GoFeatures_APILevelSchema = Zu.enumDesc(L2.file_google_protobuf_go_features, 0, 0);
  var k2;
  (function (e) {
    ((e[(e.UNSPECIFIED = 0)] = "UNSPECIFIED"),
      (e[(e.KEEP = 1)] = "KEEP"),
      (e[(e.GENERATE_BOTH = 2)] = "GENERATE_BOTH"),
      (e[(e.STRIP = 3)] = "STRIP"));
  })(k2 || (L2.GoFeatures_StripEnumPrefix = k2 = {}));
  L2.GoFeatures_StripEnumPrefixSchema = Zu.enumDesc(L2.file_google_protobuf_go_features, 0, 1);
  L2.go = P2.extDesc(L2.file_google_protobuf_go_features, 0);
});

export { U2 };
