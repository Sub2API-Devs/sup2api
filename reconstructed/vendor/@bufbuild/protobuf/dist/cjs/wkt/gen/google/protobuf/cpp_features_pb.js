/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/cpp_features_pb.js
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

//@ chunk-fq0cr76a.js:426713-428264 cjs-fingerprint
var m2 = x(function (p2) {
  Object.defineProperty(p2, "__esModule", { value: !0 });
  p2.cpp =
    p2.CppFeatures_StringTypeSchema =
    p2.CppFeatures_StringType =
    p2.CppFeaturesSchema =
    p2.file_google_protobuf_cpp_features =
      void 0;
  var l2 = Ds(),
    c2 = Rl(),
    u2 = Ts(),
    d2 = Ea(),
    f2 = hp();
  p2.file_google_protobuf_cpp_features = l2.fileDesc(
    "CiJnb29nbGUvcHJvdG9idWYvY3BwX2ZlYXR1cmVzLnByb3RvEgJwYiL8AwoLQ3BwRmVhdHVyZXMS+wEKEmxlZ2FjeV9jbG9zZWRfZW51bRgBIAEoCELeAYgBAZgBBJgBAaIBCRIEdHJ1ZRiEB6IBChIFZmFsc2UY5weyAbgBCOgHEOgHGq8BVGhlIGxlZ2FjeSBjbG9zZWQgZW51bSBiZWhhdmlvciBpbiBDKysgaXMgZGVwcmVjYXRlZCBhbmQgaXMgc2NoZWR1bGVkIHRvIGJlIHJlbW92ZWQgaW4gZWRpdGlvbiAyMDI1LiAgU2VlIGh0dHA6Ly9wcm90b2J1Zi5kZXYvcHJvZ3JhbW1pbmctZ3VpZGVzL2VudW0vI2NwcCBmb3IgbW9yZSBpbmZvcm1hdGlvbhJaCgtzdHJpbmdfdHlwZRgCIAEoDjIaLnBiLkNwcEZlYXR1cmVzLlN0cmluZ1R5cGVCKYgBAZgBBJgBAaIBCxIGU1RSSU5HGIQHogEJEgRWSUVXGOkHsgEDCOgHEkwKGmVudW1fbmFtZV91c2VzX3N0cmluZ192aWV3GAMgASgIQiiIAQGYAQaYAQGiAQoSBWZhbHNlGIQHogEJEgR0cnVlGOkHsgEDCOkHIkUKClN0cmluZ1R5cGUSFwoTU1RSSU5HX1RZUEVfVU5LTk9XThAAEggKBFZJRVcQARIICgRDT1JEEAISCgoGU1RSSU5HEAM6PwoDY3BwEhsuZ29vZ2xlLnByb3RvYnVmLkZlYXR1cmVTZXQY6AcgASgLMg8ucGIuQ3BwRmVhdHVyZXNSA2NwcA",
    [c2.file_google_protobuf_descriptor],
  );
  p2.CppFeaturesSchema = u2.messageDesc(p2.file_google_protobuf_cpp_features, 0);
  var a2;
  (function (e) {
    ((e[(e.STRING_TYPE_UNKNOWN = 0)] = "STRING_TYPE_UNKNOWN"),
      (e[(e.VIEW = 1)] = "VIEW"),
      (e[(e.CORD = 2)] = "CORD"),
      (e[(e.STRING = 3)] = "STRING"));
  })(a2 || (p2.CppFeatures_StringType = a2 = {}));
  p2.CppFeatures_StringTypeSchema = d2.enumDesc(p2.file_google_protobuf_cpp_features, 0, 0);
  p2.cpp = f2.extDesc(p2.file_google_protobuf_cpp_features, 0);
});

export { m2 };
