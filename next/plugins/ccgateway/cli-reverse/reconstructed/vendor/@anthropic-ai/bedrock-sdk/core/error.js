/**
 * @anthropic-ai/bedrock-sdk/core/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-bwbq4xvm.js (3), chunk-fq0cr76a.js (3)
 * attribution: cjs-fingerprint 6
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_SemanticAttributes } from "../../../@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js";
import { require_SemanticResourceAttributes } from "../../../@opentelemetry/semantic-conventions/build/src/resource/SemanticResourceAttributes.js";
import { require_stable_attributes } from "../../../@opentelemetry/semantic-conventions/build/src/stable_attributes.js";
import { require_stable_metrics } from "../../../@opentelemetry/semantic-conventions/build/src/stable_metrics.js";
import { require_stable_events } from "../../../@opentelemetry/semantic-conventions/build/src/stable_events.js";
import { require_timestamp } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/timestamp.js";
import { require_duration_2 } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/duration.js";
import { require_any } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/any.js";
import { require_wrappers } from "../../../@bufbuild/protobuf/dist/cjs/wkt/wrappers.js";
import { require_any_pb } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/any_pb.js";
import { require_api_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/api_pb.js";
import { require_cpp_features_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/cpp_features_pb.js";
import { require_descriptor_pb } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { require_duration_pb } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/duration_pb.js";
import { require_empty_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/empty_pb.js";
import { require_field_mask_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/field_mask_pb.js";
import { require_go_features_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/go_features_pb.js";
import { require_java_features_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/java_features_pb.js";
import { require_source_context_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/source_context_pb.js";
import { require_struct_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/struct_pb.js";
import { require_timestamp_pb } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/timestamp_pb.js";
import { require_type_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/type_pb.js";
import { require_wrappers_pb } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/wrappers_pb.js";
import { require_plugin_pb } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/compiler/plugin_pb.js";
import { require_binary_encoding } from "../../../@bufbuild/protobuf/dist/commonjs/wire/binary-encoding.js";
import { require_base64_encoding } from "../../../@bufbuild/protobuf/dist/cjs/wire/base64-encoding.js";
import { require_text_encoding } from "../../../@bufbuild/protobuf/dist/cjs/wire/text-encoding.js";
import { require_text_format } from "../../../@bufbuild/protobuf/dist/cjs/wire/text-format.js";
import { require_size_delimited } from "../../../@bufbuild/protobuf/dist/commonjs/wire/size-delimited.js";
import { require_boot } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/boot.js";
import { require_embed } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv2/embed.js";
import { require_enum } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/enum.js";
import { require_extension } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/extension.js";
import { require_file } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/file.js";
import { require_message } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/message.js";
import { require_service } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv1/service.js";
import { require_symbols } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv2/symbols.js";
import { require_scalar_2 } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv2/scalar.js";
import { emptyModule } from "../../../unresolved-cjs/index.js";

//@ chunk-bwbq4xvm.js:85148-85668 cjs-fingerprint
var require_error = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_SemanticAttributes(), cjsExports);
});
//@ chunk-bwbq4xvm.js:98021-98541 cjs-fingerprint
var require_error_2 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_SemanticResourceAttributes(), cjsExports);
});
//@ chunk-bwbq4xvm.js:115465-116034 cjs-fingerprint
var require_error_3 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_error(), cjsExports);
  __exportStar(require_error_2(), cjsExports);
  __exportStar(require_stable_attributes(), cjsExports);
  __exportStar(require_stable_metrics(), cjsExports);
  __exportStar(require_stable_events(), cjsExports);
});
//@ chunk-fq0cr76a.js:440563-441299 cjs-fingerprint
var require_error_4 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_timestamp(), cjsExports);
  __exportStar(require_duration_2(), cjsExports);
  __exportStar(require_any(), cjsExports);
  __exportStar(require_wrappers(), cjsExports);
  __exportStar(require_any_pb(), cjsExports);
  __exportStar(require_api_pb(), cjsExports);
  __exportStar(require_cpp_features_pb(), cjsExports);
  __exportStar(require_descriptor_pb(), cjsExports);
  __exportStar(require_duration_pb(), cjsExports);
  __exportStar(require_empty_pb(), cjsExports);
  __exportStar(require_field_mask_pb(), cjsExports);
  __exportStar(require_go_features_pb(), cjsExports);
  __exportStar(require_java_features_pb(), cjsExports);
  __exportStar(require_source_context_pb(), cjsExports);
  __exportStar(require_struct_pb(), cjsExports);
  __exportStar(require_timestamp_pb(), cjsExports);
  __exportStar(require_type_pb(), cjsExports);
  __exportStar(require_wrappers_pb(), cjsExports);
  __exportStar(require_plugin_pb(), cjsExports);
});
//@ chunk-fq0cr76a.js:448705-449273 cjs-fingerprint
var require_error_5 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_binary_encoding(), cjsExports);
  __exportStar(require_base64_encoding(), cjsExports);
  __exportStar(require_text_encoding(), cjsExports);
  __exportStar(require_text_format(), cjsExports);
  __exportStar(require_size_delimited(), cjsExports);
});
//@ chunk-fq0cr76a.js:519671-520301 cjs-fingerprint
var require_error_6 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o, k2, desc);
        }
      : function (o, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o[k2] = m[k];
        });
  var __exportStar =
    (cjsExports && cjsExports.__exportStar) ||
    function (m, exportTarget) {
      for (var p in m)
        if (p !== "default" && !Object.prototype.hasOwnProperty.call(exportTarget, p))
          __createBinding(exportTarget, m, p);
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  __exportStar(require_boot(), cjsExports);
  __exportStar(require_embed(), cjsExports);
  __exportStar(require_enum(), cjsExports);
  __exportStar(require_extension(), cjsExports);
  __exportStar(require_file(), cjsExports);
  __exportStar(require_message(), cjsExports);
  __exportStar(require_service(), cjsExports);
  __exportStar(require_symbols(), cjsExports);
  __exportStar(require_scalar_2(), cjsExports);
  __exportStar(emptyModule(), cjsExports);
});
export { require_error_3, require_error_4, require_error_5, require_error_6 };
