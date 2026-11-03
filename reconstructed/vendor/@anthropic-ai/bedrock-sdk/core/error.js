/**
 * @anthropic-ai/bedrock-sdk/core/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-bwbq4xvm.js (3), chunk-fq0cr76a.js (3)
 * attribution: cjs-fingerprint 6
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Nb } from "../../../@opentelemetry/semantic-conventions/build/src/trace/SemanticAttributes.js";
import { dT } from "../../../@opentelemetry/semantic-conventions/build/src/resource/SemanticResourceAttributes.js";
import { _T } from "../../../@opentelemetry/semantic-conventions/build/src/stable_attributes.js";
import { ET } from "../../../@opentelemetry/semantic-conventions/build/src/stable_metrics.js";
import { wT } from "../../../@opentelemetry/semantic-conventions/build/src/stable_events.js";
import { fO } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/timestamp.js";
import { _O } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/duration.js";
import { MO } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/any.js";
import { Fu } from "../../../@bufbuild/protobuf/dist/cjs/wkt/wrappers.js";
import { Yg } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/any_pb.js";
import { i2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/api_pb.js";
import { m2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/cpp_features_pb.js";
import { Rl } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/gen/google/protobuf/descriptor_pb.js";
import { m_ } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/duration_pb.js";
import { _2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/empty_pb.js";
import { R2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/field_mask_pb.js";
import { U2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/go_features_pb.js";
import { K2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/java_features_pb.js";
import { Qg } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/source_context_pb.js";
import { X2 } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/struct_pb.js";
import { h_ } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/timestamp_pb.js";
import { y_ } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/type_pb.js";
import { nP } from "../../../@bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/wrappers_pb.js";
import { cP } from "../../../@bufbuild/protobuf/dist/commonjs/wkt/google/protobuf/compiler/plugin_pb.js";
import { xc } from "../../../@bufbuild/protobuf/dist/commonjs/wire/binary-encoding.js";
import { dp } from "../../../@bufbuild/protobuf/dist/cjs/wire/base64-encoding.js";
import { Rg } from "../../../@bufbuild/protobuf/dist/cjs/wire/text-encoding.js";
import { s_ } from "../../../@bufbuild/protobuf/dist/cjs/wire/text-format.js";
import { AP } from "../../../@bufbuild/protobuf/dist/commonjs/wire/size-delimited.js";
import { d_ } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/boot.js";
import { eU } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv2/embed.js";
import { Ea } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/enum.js";
import { hp } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/extension.js";
import { Ds } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/file.js";
import { Ts } from "../../../@bufbuild/protobuf/dist/cjs/codegenv2/message.js";
import { nU } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv1/service.js";
import { iU } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv2/symbols.js";
import { aU } from "../../../@bufbuild/protobuf/dist/commonjs/codegenv2/scalar.js";
import { cU } from "../../../unresolved-cjs/index.js";

//@ chunk-bwbq4xvm.js:85148-85668 cjs-fingerprint
var Pb = x(function (De) {
  var qD =
      (De && De.__createBinding) ||
      (Object.create
        ? function (e, s, n, r) {
            if (r === void 0) r = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(s, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !s.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return s[n];
                },
              };
            Object.defineProperty(e, r, ownPropertyDescriptor);
          }
        : function (e, s, n, r) {
            if (r === void 0) r = n;
            e[r] = s[n];
          }),
    VD =
      (De && De.__exportStar) ||
      function (e, s) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(s, key)) qD(s, e, key);
      };
  Object.defineProperty(De, "__esModule", { value: !0 });
  VD(Nb(), De);
});
//@ chunk-bwbq4xvm.js:98021-98541 cjs-fingerprint
var cT = x(function (Le) {
  var gq =
      (Le && Le.__createBinding) ||
      (Object.create
        ? function (e, s, n, r) {
            if (r === void 0) r = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(s, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !s.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return s[n];
                },
              };
            Object.defineProperty(e, r, ownPropertyDescriptor);
          }
        : function (e, s, n, r) {
            if (r === void 0) r = n;
            e[r] = s[n];
          }),
    fq =
      (Le && Le.__exportStar) ||
      function (e, s) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(s, key)) gq(s, e, key);
      };
  Object.defineProperty(Le, "__esModule", { value: !0 });
  fq(dT(), Le);
});
//@ chunk-bwbq4xvm.js:115465-116034 cjs-fingerprint
var p3e = x(function (le) {
  var GB =
      (le && le.__createBinding) ||
      (Object.create
        ? function (e, s, n, r) {
            if (r === void 0) r = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(s, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !s.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return s[n];
                },
              };
            Object.defineProperty(e, r, ownPropertyDescriptor);
          }
        : function (e, s, n, r) {
            if (r === void 0) r = n;
            e[r] = s[n];
          }),
    qt =
      (le && le.__exportStar) ||
      function (e, s) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(s, key)) GB(s, e, key);
      };
  Object.defineProperty(le, "__esModule", { value: !0 });
  qt(Pb(), le);
  qt(cT(), le);
  qt(_T(), le);
  qt(ET(), le);
  qt(wT(), le);
});
//@ chunk-fq0cr76a.js:440563-441299 cjs-fingerprint
var Os = x(function (Nr) {
  var jX =
      (Nr && Nr.__createBinding) ||
      (Object.create
        ? function (e, n, r, s) {
            if (s === void 0) s = r;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, r);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !n.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return n[r];
                },
              };
            Object.defineProperty(e, s, ownPropertyDescriptor);
          }
        : function (e, n, r, s) {
            if (s === void 0) s = r;
            e[s] = n[r];
          }),
    as =
      (Nr && Nr.__exportStar) ||
      function (e, n) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(n, key)) jX(n, e, key);
      };
  Object.defineProperty(Nr, "__esModule", { value: !0 });
  as(fO(), Nr);
  as(_O(), Nr);
  as(MO(), Nr);
  as(Fu(), Nr);
  as(Yg(), Nr);
  as(i2(), Nr);
  as(m2(), Nr);
  as(Rl(), Nr);
  as(m_(), Nr);
  as(_2(), Nr);
  as(R2(), Nr);
  as(U2(), Nr);
  as(K2(), Nr);
  as(Qg(), Nr);
  as(X2(), Nr);
  as(h_(), Nr);
  as(y_(), Nr);
  as(nP(), Nr);
  as(cP(), Nr);
});
//@ chunk-fq0cr76a.js:448705-449273 cjs-fingerprint
var hy = x(function (ao) {
  var SJ =
      (ao && ao.__createBinding) ||
      (Object.create
        ? function (e, n, r, s) {
            if (s === void 0) s = r;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, r);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !n.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return n[r];
                },
              };
            Object.defineProperty(e, s, ownPropertyDescriptor);
          }
        : function (e, n, r, s) {
            if (s === void 0) s = r;
            e[s] = n[r];
          }),
    yp =
      (ao && ao.__exportStar) ||
      function (e, n) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(n, key)) SJ(n, e, key);
      };
  Object.defineProperty(ao, "__esModule", { value: !0 });
  yp(xc(), ao);
  yp(dp(), ao);
  yp(Rg(), ao);
  yp(s_(), ao);
  yp(AP(), ao);
});
//@ chunk-fq0cr76a.js:519671-520301 cjs-fingerprint
var Z_ = x(function (Us) {
  var gie =
      (Us && Us.__createBinding) ||
      (Object.create
        ? function (e, n, r, s) {
            if (s === void 0) s = r;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(n, r);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !n.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return n[r];
                },
              };
            Object.defineProperty(e, s, ownPropertyDescriptor);
          }
        : function (e, n, r, s) {
            if (s === void 0) s = r;
            e[s] = n[r];
          }),
    jo =
      (Us && Us.__exportStar) ||
      function (e, n) {
        for (var key in e)
          if (key !== "default" && !Object.prototype.hasOwnProperty.call(n, key)) gie(n, e, key);
      };
  Object.defineProperty(Us, "__esModule", { value: !0 });
  jo(d_(), Us);
  jo(eU(), Us);
  jo(Ea(), Us);
  jo(hp(), Us);
  jo(Ds(), Us);
  jo(Ts(), Us);
  jo(nU(), Us);
  jo(iU(), Us);
  jo(aU(), Us);
  jo(cU(), Us);
});

export { p3e, Os, hy, Z_ };
