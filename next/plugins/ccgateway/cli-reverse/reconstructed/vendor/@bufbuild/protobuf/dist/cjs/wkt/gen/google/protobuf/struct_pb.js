/**
 * @bufbuild/protobuf/dist/cjs/wkt/gen/google/protobuf/struct_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_file } from "../../../../codegenv2/file.js";
import { require_message } from "../../../../codegenv2/message.js";
import { require_enum } from "../../../../codegenv2/enum.js";

//@ chunk-fq0cr76a.js:435210-436671 cjs-fingerprint
var require_struct_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NullValueSchema =
    cjsExports.NullValue =
    cjsExports.ListValueSchema =
    cjsExports.ValueSchema =
    cjsExports.StructSchema =
    cjsExports.file_google_protobuf_struct =
      undefined;
  var file_js_1 = require_file();
  var message_js_1 = require_message();
  var enum_js_1 = require_enum();
  cjsExports.file_google_protobuf_struct = file_js_1.fileDesc(
    "Chxnb29nbGUvcHJvdG9idWYvc3RydWN0LnByb3RvEg9nb29nbGUucHJvdG9idWYihAEKBlN0cnVjdBIzCgZmaWVsZHMYASADKAsyIy5nb29nbGUucHJvdG9idWYuU3RydWN0LkZpZWxkc0VudHJ5GkUKC0ZpZWxkc0VudHJ5EgsKA2tleRgBIAEoCRIlCgV2YWx1ZRgCIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZToCOAEi6gEKBVZhbHVlEjAKCm51bGxfdmFsdWUYASABKA4yGi5nb29nbGUucHJvdG9idWYuTnVsbFZhbHVlSAASFgoMbnVtYmVyX3ZhbHVlGAIgASgBSAASFgoMc3RyaW5nX3ZhbHVlGAMgASgJSAASFAoKYm9vbF92YWx1ZRgEIAEoCEgAEi8KDHN0cnVjdF92YWx1ZRgFIAEoCzIXLmdvb2dsZS5wcm90b2J1Zi5TdHJ1Y3RIABIwCgpsaXN0X3ZhbHVlGAYgASgLMhouZ29vZ2xlLnByb3RvYnVmLkxpc3RWYWx1ZUgAQgYKBGtpbmQiMwoJTGlzdFZhbHVlEiYKBnZhbHVlcxgBIAMoCzIWLmdvb2dsZS5wcm90b2J1Zi5WYWx1ZSobCglOdWxsVmFsdWUSDgoKTlVMTF9WQUxVRRAAQn8KE2NvbS5nb29nbGUucHJvdG9idWZCC1N0cnVjdFByb3RvUAFaL2dvb2dsZS5nb2xhbmcub3JnL3Byb3RvYnVmL3R5cGVzL2tub3duL3N0cnVjdHBi+AEBogIDR1BCqgIeR29vZ2xlLlByb3RvYnVmLldlbGxLbm93blR5cGVzYgZwcm90bzM",
  );
  cjsExports.StructSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_struct, 0);
  cjsExports.ValueSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_struct, 1);
  cjsExports.ListValueSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_struct, 2);
  var NullValue;
  (function (NullValue) {
    NullValue[(NullValue.NULL_VALUE = 0)] = "NULL_VALUE";
  })(NullValue || (cjsExports.NullValue = NullValue = {}));
  cjsExports.NullValueSchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_struct, 0);
});
export { require_struct_pb };
