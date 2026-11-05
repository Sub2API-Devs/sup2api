/**
 * @bufbuild/cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/cel-spec@0.0.1..0.6.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../runtime/bun-runtime.js";
import {
  require_error_6,
  require_error_4,
} from "../../../../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-qg41pqt6.js:520875-525743 cjs-fingerprint
var require_syntax_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.SourceInfo_Extension_ComponentSchema =
    cjsExports.SourceInfo_Extension_Component =
    cjsExports.SourceInfo_Extension_VersionSchema =
    cjsExports.SourceInfo_ExtensionSchema =
    cjsExports.SourceInfoSchema =
    cjsExports.ConstantSchema =
    cjsExports.Expr_ComprehensionSchema =
    cjsExports.Expr_CreateStruct_EntrySchema =
    cjsExports.Expr_CreateStructSchema =
    cjsExports.Expr_CreateListSchema =
    cjsExports.Expr_CallSchema =
    cjsExports.Expr_SelectSchema =
    cjsExports.Expr_IdentSchema =
    cjsExports.ExprSchema =
    cjsExports.ParsedExprSchema =
    cjsExports.file_cel_expr_syntax =
      undefined;
  var codegenv2_1 = require_error_6();
  var wkt_1 = require_error_4();
  cjsExports.file_cel_expr_syntax = codegenv2_1.fileDesc(
    "ChVjZWwvZXhwci9zeW50YXgucHJvdG8SCGNlbC5leHByIlUKClBhcnNlZEV4cHISHAoEZXhwchgCIAEoCzIOLmNlbC5leHByLkV4cHISKQoLc291cmNlX2luZm8YAyABKAsyFC5jZWwuZXhwci5Tb3VyY2VJbmZvItoICgRFeHByEgoKAmlkGAIgASgDEigKCmNvbnN0X2V4cHIYAyABKAsyEi5jZWwuZXhwci5Db25zdGFudEgAEioKCmlkZW50X2V4cHIYBCABKAsyFC5jZWwuZXhwci5FeHByLklkZW50SAASLAoLc2VsZWN0X2V4cHIYBSABKAsyFS5jZWwuZXhwci5FeHByLlNlbGVjdEgAEigKCWNhbGxfZXhwchgGIAEoCzITLmNlbC5leHByLkV4cHIuQ2FsbEgAEi4KCWxpc3RfZXhwchgHIAEoCzIZLmNlbC5leHByLkV4cHIuQ3JlYXRlTGlzdEgAEjIKC3N0cnVjdF9leHByGAggASgLMhsuY2VsLmV4cHIuRXhwci5DcmVhdGVTdHJ1Y3RIABI6ChJjb21wcmVoZW5zaW9uX2V4cHIYCSABKAsyHC5jZWwuZXhwci5FeHByLkNvbXByZWhlbnNpb25IABoVCgVJZGVudBIMCgRuYW1lGAEgASgJGksKBlNlbGVjdBIfCgdvcGVyYW5kGAEgASgLMg4uY2VsLmV4cHIuRXhwchINCgVmaWVsZBgCIAEoCRIRCgl0ZXN0X29ubHkYAyABKAgaVgoEQ2FsbBIeCgZ0YXJnZXQYASABKAsyDi5jZWwuZXhwci5FeHByEhAKCGZ1bmN0aW9uGAIgASgJEhwKBGFyZ3MYAyADKAsyDi5jZWwuZXhwci5FeHByGkgKCkNyZWF0ZUxpc3QSIAoIZWxlbWVudHMYASADKAsyDi5jZWwuZXhwci5FeHByEhgKEG9wdGlvbmFsX2luZGljZXMYAiADKAUa6QEKDENyZWF0ZVN0cnVjdBIUCgxtZXNzYWdlX25hbWUYASABKAkSMgoHZW50cmllcxgCIAMoCzIhLmNlbC5leHByLkV4cHIuQ3JlYXRlU3RydWN0LkVudHJ5Go4BCgVFbnRyeRIKCgJpZBgBIAEoAxITCglmaWVsZF9rZXkYAiABKAlIABIhCgdtYXBfa2V5GAMgASgLMg4uY2VsLmV4cHIuRXhwckgAEh0KBXZhbHVlGAQgASgLMg4uY2VsLmV4cHIuRXhwchIWCg5vcHRpb25hbF9lbnRyeRgFIAEoCEIKCghrZXlfa2luZBr4AQoNQ29tcHJlaGVuc2lvbhIQCghpdGVyX3ZhchgBIAEoCRIRCglpdGVyX3ZhcjIYCCABKAkSIgoKaXRlcl9yYW5nZRgCIAEoCzIOLmNlbC5leHByLkV4cHISEAoIYWNjdV92YXIYAyABKAkSIQoJYWNjdV9pbml0GAQgASgLMg4uY2VsLmV4cHIuRXhwchImCg5sb29wX2NvbmRpdGlvbhgFIAEoCzIOLmNlbC5leHByLkV4cHISIQoJbG9vcF9zdGVwGAYgASgLMg4uY2VsLmV4cHIuRXhwchIeCgZyZXN1bHQYByABKAsyDi5jZWwuZXhwci5FeHByQgsKCWV4cHJfa2luZCLNAgoIQ29uc3RhbnQSMAoKbnVsbF92YWx1ZRgBIAEoDjIaLmdvb2dsZS5wcm90b2J1Zi5OdWxsVmFsdWVIABIUCgpib29sX3ZhbHVlGAIgASgISAASFQoLaW50NjRfdmFsdWUYAyABKANIABIWCgx1aW50NjRfdmFsdWUYBCABKARIABIWCgxkb3VibGVfdmFsdWUYBSABKAFIABIWCgxzdHJpbmdfdmFsdWUYBiABKAlIABIVCgtieXRlc192YWx1ZRgHIAEoDEgAEjcKDmR1cmF0aW9uX3ZhbHVlGAggASgLMhkuZ29vZ2xlLnByb3RvYnVmLkR1cmF0aW9uQgIYAUgAEjkKD3RpbWVzdGFtcF92YWx1ZRgJIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXBCAhgBSABCDwoNY29uc3RhbnRfa2luZCKcBQoKU291cmNlSW5mbxIWCg5zeW50YXhfdmVyc2lvbhgBIAEoCRIQCghsb2NhdGlvbhgCIAEoCRIUCgxsaW5lX29mZnNldHMYAyADKAUSNgoJcG9zaXRpb25zGAQgAygLMiMuY2VsLmV4cHIuU291cmNlSW5mby5Qb3NpdGlvbnNFbnRyeRI5CgttYWNyb19jYWxscxgFIAMoCzIkLmNlbC5leHByLlNvdXJjZUluZm8uTWFjcm9DYWxsc0VudHJ5EjIKCmV4dGVuc2lvbnMYBiADKAsyHi5jZWwuZXhwci5Tb3VyY2VJbmZvLkV4dGVuc2lvbhowCg5Qb3NpdGlvbnNFbnRyeRILCgNrZXkYASABKAMSDQoFdmFsdWUYAiABKAU6AjgBGkEKD01hY3JvQ2FsbHNFbnRyeRILCgNrZXkYASABKAMSHQoFdmFsdWUYAiABKAsyDi5jZWwuZXhwci5FeHByOgI4ARqxAgoJRXh0ZW5zaW9uEgoKAmlkGAEgASgJEkUKE2FmZmVjdGVkX2NvbXBvbmVudHMYAiADKA4yKC5jZWwuZXhwci5Tb3VyY2VJbmZvLkV4dGVuc2lvbi5Db21wb25lbnQSNwoHdmVyc2lvbhgDIAEoCzImLmNlbC5leHByLlNvdXJjZUluZm8uRXh0ZW5zaW9uLlZlcnNpb24aJwoHVmVyc2lvbhINCgVtYWpvchgBIAEoAxINCgVtaW5vchgCIAEoAyJvCglDb21wb25lbnQSGQoVQ09NUE9ORU5UX1VOU1BFQ0lGSUVEEAASFAoQQ09NUE9ORU5UX1BBUlNFUhABEhoKFkNPTVBPTkVOVF9UWVBFX0NIRUNLRVIQAhIVChFDT01QT05FTlRfUlVOVElNRRADQi4KDGRldi5jZWwuZXhwckILU3ludGF4UHJvdG9QAVoMY2VsLmRldi9leHBy+AEBYgZwcm90bzM",
    [
      wkt_1.file_google_protobuf_duration,
      wkt_1.file_google_protobuf_struct,
      wkt_1.file_google_protobuf_timestamp,
    ],
  );
  cjsExports.ParsedExprSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 0);
  cjsExports.ExprSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1);
  cjsExports.Expr_IdentSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1, 0);
  cjsExports.Expr_SelectSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1, 1);
  cjsExports.Expr_CallSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1, 2);
  cjsExports.Expr_CreateListSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1, 3);
  cjsExports.Expr_CreateStructSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1, 4);
  cjsExports.Expr_CreateStruct_EntrySchema = codegenv2_1.messageDesc(
    cjsExports.file_cel_expr_syntax,
    1,
    4,
    0,
  );
  cjsExports.Expr_ComprehensionSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 1, 5);
  cjsExports.ConstantSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 2);
  cjsExports.SourceInfoSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 3);
  cjsExports.SourceInfo_ExtensionSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_syntax, 3, 0);
  cjsExports.SourceInfo_Extension_VersionSchema = codegenv2_1.messageDesc(
    cjsExports.file_cel_expr_syntax,
    3,
    0,
    0,
  );
  var SourceInfo_Extension_Component;
  (function (SourceInfo_Extension_Component) {
    SourceInfo_Extension_Component[(SourceInfo_Extension_Component.UNSPECIFIED = 0)] = "UNSPECIFIED";
    SourceInfo_Extension_Component[(SourceInfo_Extension_Component.PARSER = 1)] = "PARSER";
    SourceInfo_Extension_Component[(SourceInfo_Extension_Component.TYPE_CHECKER = 2)] = "TYPE_CHECKER";
    SourceInfo_Extension_Component[(SourceInfo_Extension_Component.RUNTIME = 3)] = "RUNTIME";
  })(
    SourceInfo_Extension_Component ||
      (cjsExports.SourceInfo_Extension_Component = SourceInfo_Extension_Component = {}),
  );
  cjsExports.SourceInfo_Extension_ComponentSchema = codegenv2_1.enumDesc(
    cjsExports.file_cel_expr_syntax,
    3,
    0,
    0,
  );
});
export { require_syntax_pb };
