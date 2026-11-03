/**
 * @bufbuild/cel-spec/dist/cjs/gen/cel/expr/syntax_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel-spec@0.0.1..0.6.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../../runtime/bun-runtime.js";
import { Z_, Os } from "../../../../../../../@anthropic-ai/bedrock-sdk/core/error.js";

//@ chunk-fq0cr76a.js:520301-525169 cjs-fingerprint
var Yy = x(function (dU) {
  Object.defineProperty(dU, "__esModule", { value: !0 });
  dU.SourceInfo_Extension_ComponentSchema =
    dU.SourceInfo_Extension_Component =
    dU.SourceInfo_Extension_VersionSchema =
    dU.SourceInfo_ExtensionSchema =
    dU.SourceInfoSchema =
    dU.ConstantSchema =
    dU.Expr_ComprehensionSchema =
    dU.Expr_CreateStruct_EntrySchema =
    dU.Expr_CreateStructSchema =
    dU.Expr_CreateListSchema =
    dU.Expr_CallSchema =
    dU.Expr_SelectSchema =
    dU.Expr_IdentSchema =
    dU.ExprSchema =
    dU.ParsedExprSchema =
    dU.file_cel_expr_syntax =
      void 0;
  var lr = Z_(),
    Sd = Os();
  dU.file_cel_expr_syntax = lr.fileDesc(
    "ChVjZWwvZXhwci9zeW50YXgucHJvdG8SCGNlbC5leHByIlUKClBhcnNlZEV4cHISHAoEZXhwchgCIAEoCzIOLmNlbC5leHByLkV4cHISKQoLc291cmNlX2luZm8YAyABKAsyFC5jZWwuZXhwci5Tb3VyY2VJbmZvItoICgRFeHByEgoKAmlkGAIgASgDEigKCmNvbnN0X2V4cHIYAyABKAsyEi5jZWwuZXhwci5Db25zdGFudEgAEioKCmlkZW50X2V4cHIYBCABKAsyFC5jZWwuZXhwci5FeHByLklkZW50SAASLAoLc2VsZWN0X2V4cHIYBSABKAsyFS5jZWwuZXhwci5FeHByLlNlbGVjdEgAEigKCWNhbGxfZXhwchgGIAEoCzITLmNlbC5leHByLkV4cHIuQ2FsbEgAEi4KCWxpc3RfZXhwchgHIAEoCzIZLmNlbC5leHByLkV4cHIuQ3JlYXRlTGlzdEgAEjIKC3N0cnVjdF9leHByGAggASgLMhsuY2VsLmV4cHIuRXhwci5DcmVhdGVTdHJ1Y3RIABI6ChJjb21wcmVoZW5zaW9uX2V4cHIYCSABKAsyHC5jZWwuZXhwci5FeHByLkNvbXByZWhlbnNpb25IABoVCgVJZGVudBIMCgRuYW1lGAEgASgJGksKBlNlbGVjdBIfCgdvcGVyYW5kGAEgASgLMg4uY2VsLmV4cHIuRXhwchINCgVmaWVsZBgCIAEoCRIRCgl0ZXN0X29ubHkYAyABKAgaVgoEQ2FsbBIeCgZ0YXJnZXQYASABKAsyDi5jZWwuZXhwci5FeHByEhAKCGZ1bmN0aW9uGAIgASgJEhwKBGFyZ3MYAyADKAsyDi5jZWwuZXhwci5FeHByGkgKCkNyZWF0ZUxpc3QSIAoIZWxlbWVudHMYASADKAsyDi5jZWwuZXhwci5FeHByEhgKEG9wdGlvbmFsX2luZGljZXMYAiADKAUa6QEKDENyZWF0ZVN0cnVjdBIUCgxtZXNzYWdlX25hbWUYASABKAkSMgoHZW50cmllcxgCIAMoCzIhLmNlbC5leHByLkV4cHIuQ3JlYXRlU3RydWN0LkVudHJ5Go4BCgVFbnRyeRIKCgJpZBgBIAEoAxITCglmaWVsZF9rZXkYAiABKAlIABIhCgdtYXBfa2V5GAMgASgLMg4uY2VsLmV4cHIuRXhwckgAEh0KBXZhbHVlGAQgASgLMg4uY2VsLmV4cHIuRXhwchIWCg5vcHRpb25hbF9lbnRyeRgFIAEoCEIKCghrZXlfa2luZBr4AQoNQ29tcHJlaGVuc2lvbhIQCghpdGVyX3ZhchgBIAEoCRIRCglpdGVyX3ZhcjIYCCABKAkSIgoKaXRlcl9yYW5nZRgCIAEoCzIOLmNlbC5leHByLkV4cHISEAoIYWNjdV92YXIYAyABKAkSIQoJYWNjdV9pbml0GAQgASgLMg4uY2VsLmV4cHIuRXhwchImCg5sb29wX2NvbmRpdGlvbhgFIAEoCzIOLmNlbC5leHByLkV4cHISIQoJbG9vcF9zdGVwGAYgASgLMg4uY2VsLmV4cHIuRXhwchIeCgZyZXN1bHQYByABKAsyDi5jZWwuZXhwci5FeHByQgsKCWV4cHJfa2luZCLNAgoIQ29uc3RhbnQSMAoKbnVsbF92YWx1ZRgBIAEoDjIaLmdvb2dsZS5wcm90b2J1Zi5OdWxsVmFsdWVIABIUCgpib29sX3ZhbHVlGAIgASgISAASFQoLaW50NjRfdmFsdWUYAyABKANIABIWCgx1aW50NjRfdmFsdWUYBCABKARIABIWCgxkb3VibGVfdmFsdWUYBSABKAFIABIWCgxzdHJpbmdfdmFsdWUYBiABKAlIABIVCgtieXRlc192YWx1ZRgHIAEoDEgAEjcKDmR1cmF0aW9uX3ZhbHVlGAggASgLMhkuZ29vZ2xlLnByb3RvYnVmLkR1cmF0aW9uQgIYAUgAEjkKD3RpbWVzdGFtcF92YWx1ZRgJIAEoCzIaLmdvb2dsZS5wcm90b2J1Zi5UaW1lc3RhbXBCAhgBSABCDwoNY29uc3RhbnRfa2luZCKcBQoKU291cmNlSW5mbxIWCg5zeW50YXhfdmVyc2lvbhgBIAEoCRIQCghsb2NhdGlvbhgCIAEoCRIUCgxsaW5lX29mZnNldHMYAyADKAUSNgoJcG9zaXRpb25zGAQgAygLMiMuY2VsLmV4cHIuU291cmNlSW5mby5Qb3NpdGlvbnNFbnRyeRI5CgttYWNyb19jYWxscxgFIAMoCzIkLmNlbC5leHByLlNvdXJjZUluZm8uTWFjcm9DYWxsc0VudHJ5EjIKCmV4dGVuc2lvbnMYBiADKAsyHi5jZWwuZXhwci5Tb3VyY2VJbmZvLkV4dGVuc2lvbhowCg5Qb3NpdGlvbnNFbnRyeRILCgNrZXkYASABKAMSDQoFdmFsdWUYAiABKAU6AjgBGkEKD01hY3JvQ2FsbHNFbnRyeRILCgNrZXkYASABKAMSHQoFdmFsdWUYAiABKAsyDi5jZWwuZXhwci5FeHByOgI4ARqxAgoJRXh0ZW5zaW9uEgoKAmlkGAEgASgJEkUKE2FmZmVjdGVkX2NvbXBvbmVudHMYAiADKA4yKC5jZWwuZXhwci5Tb3VyY2VJbmZvLkV4dGVuc2lvbi5Db21wb25lbnQSNwoHdmVyc2lvbhgDIAEoCzImLmNlbC5leHByLlNvdXJjZUluZm8uRXh0ZW5zaW9uLlZlcnNpb24aJwoHVmVyc2lvbhINCgVtYWpvchgBIAEoAxINCgVtaW5vchgCIAEoAyJvCglDb21wb25lbnQSGQoVQ09NUE9ORU5UX1VOU1BFQ0lGSUVEEAASFAoQQ09NUE9ORU5UX1BBUlNFUhABEhoKFkNPTVBPTkVOVF9UWVBFX0NIRUNLRVIQAhIVChFDT01QT05FTlRfUlVOVElNRRADQi4KDGRldi5jZWwuZXhwckILU3ludGF4UHJvdG9QAVoMY2VsLmRldi9leHBy+AEBYgZwcm90bzM",
    [Sd.file_google_protobuf_duration, Sd.file_google_protobuf_struct, Sd.file_google_protobuf_timestamp],
  );
  dU.ParsedExprSchema = lr.messageDesc(dU.file_cel_expr_syntax, 0);
  dU.ExprSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1);
  dU.Expr_IdentSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 0);
  dU.Expr_SelectSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 1);
  dU.Expr_CallSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 2);
  dU.Expr_CreateListSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 3);
  dU.Expr_CreateStructSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 4);
  dU.Expr_CreateStruct_EntrySchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 4, 0);
  dU.Expr_ComprehensionSchema = lr.messageDesc(dU.file_cel_expr_syntax, 1, 5);
  dU.ConstantSchema = lr.messageDesc(dU.file_cel_expr_syntax, 2);
  dU.SourceInfoSchema = lr.messageDesc(dU.file_cel_expr_syntax, 3);
  dU.SourceInfo_ExtensionSchema = lr.messageDesc(dU.file_cel_expr_syntax, 3, 0);
  dU.SourceInfo_Extension_VersionSchema = lr.messageDesc(dU.file_cel_expr_syntax, 3, 0, 0);
  var uU;
  (function (e) {
    ((e[(e.UNSPECIFIED = 0)] = "UNSPECIFIED"),
      (e[(e.PARSER = 1)] = "PARSER"),
      (e[(e.TYPE_CHECKER = 2)] = "TYPE_CHECKER"),
      (e[(e.RUNTIME = 3)] = "RUNTIME"));
  })(uU || (dU.SourceInfo_Extension_Component = uU = {}));
  dU.SourceInfo_Extension_ComponentSchema = lr.enumDesc(dU.file_cel_expr_syntax, 3, 0, 0);
});

export { Yy };
