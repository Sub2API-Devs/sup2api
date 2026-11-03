/**
 * @bufbuild/cel-spec/dist/cjs/gen/cel/expr/checked_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel-spec@0.0.1..0.6.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../../../runtime/bun-runtime.js";
import { Z_, Os } from "../../../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { Yy } from "./syntax_pb.js";

//@ chunk-fq0cr76a.js:597494-602201 cjs-fingerprint
var BU = x(function (PU) {
  Object.defineProperty(PU, "__esModule", { value: !0 });
  PU.ReferenceSchema =
    PU.Decl_FunctionDecl_OverloadSchema =
    PU.Decl_FunctionDeclSchema =
    PU.Decl_IdentDeclSchema =
    PU.DeclSchema =
    PU.Type_WellKnownTypeSchema =
    PU.Type_WellKnownType =
    PU.Type_PrimitiveTypeSchema =
    PU.Type_PrimitiveType =
    PU.Type_AbstractTypeSchema =
    PU.Type_FunctionTypeSchema =
    PU.Type_MapTypeSchema =
    PU.Type_ListTypeSchema =
    PU.TypeSchema =
    PU.CheckedExprSchema =
    PU.file_cel_expr_checked =
      void 0;
  var gr = Z_(),
    OU = Yy(),
    n0 = Os();
  PU.file_cel_expr_checked = gr.fileDesc(
    "ChZjZWwvZXhwci9jaGVja2VkLnByb3RvEghjZWwuZXhwciLsAgoLQ2hlY2tlZEV4cHISPgoNcmVmZXJlbmNlX21hcBgCIAMoCzInLmNlbC5leHByLkNoZWNrZWRFeHByLlJlZmVyZW5jZU1hcEVudHJ5EjQKCHR5cGVfbWFwGAMgAygLMiIuY2VsLmV4cHIuQ2hlY2tlZEV4cHIuVHlwZU1hcEVudHJ5EikKC3NvdXJjZV9pbmZvGAUgASgLMhQuY2VsLmV4cHIuU291cmNlSW5mbxIUCgxleHByX3ZlcnNpb24YBiABKAkSHAoEZXhwchgEIAEoCzIOLmNlbC5leHByLkV4cHIaSAoRUmVmZXJlbmNlTWFwRW50cnkSCwoDa2V5GAEgASgDEiIKBXZhbHVlGAIgASgLMhMuY2VsLmV4cHIuUmVmZXJlbmNlOgI4ARo+CgxUeXBlTWFwRW50cnkSCwoDa2V5GAEgASgDEh0KBXZhbHVlGAIgASgLMg4uY2VsLmV4cHIuVHlwZToCOAEioggKBFR5cGUSJQoDZHluGAEgASgLMhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5SAASKgoEbnVsbBgCIAEoDjIaLmdvb2dsZS5wcm90b2J1Zi5OdWxsVmFsdWVIABIxCglwcmltaXRpdmUYAyABKA4yHC5jZWwuZXhwci5UeXBlLlByaW1pdGl2ZVR5cGVIABIvCgd3cmFwcGVyGAQgASgOMhwuY2VsLmV4cHIuVHlwZS5QcmltaXRpdmVUeXBlSAASMgoKd2VsbF9rbm93bhgFIAEoDjIcLmNlbC5leHByLlR5cGUuV2VsbEtub3duVHlwZUgAEiwKCWxpc3RfdHlwZRgGIAEoCzIXLmNlbC5leHByLlR5cGUuTGlzdFR5cGVIABIqCghtYXBfdHlwZRgHIAEoCzIWLmNlbC5leHByLlR5cGUuTWFwVHlwZUgAEi8KCGZ1bmN0aW9uGAggASgLMhsuY2VsLmV4cHIuVHlwZS5GdW5jdGlvblR5cGVIABIWCgxtZXNzYWdlX3R5cGUYCSABKAlIABIUCgp0eXBlX3BhcmFtGAogASgJSAASHgoEdHlwZRgLIAEoCzIOLmNlbC5leHByLlR5cGVIABInCgVlcnJvchgMIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eUgAEjQKDWFic3RyYWN0X3R5cGUYDiABKAsyGy5jZWwuZXhwci5UeXBlLkFic3RyYWN0VHlwZUgAGi0KCExpc3RUeXBlEiEKCWVsZW1fdHlwZRgBIAEoCzIOLmNlbC5leHByLlR5cGUaTwoHTWFwVHlwZRIgCghrZXlfdHlwZRgBIAEoCzIOLmNlbC5leHByLlR5cGUSIgoKdmFsdWVfdHlwZRgCIAEoCzIOLmNlbC5leHByLlR5cGUaVgoMRnVuY3Rpb25UeXBlEiMKC3Jlc3VsdF90eXBlGAEgASgLMg4uY2VsLmV4cHIuVHlwZRIhCglhcmdfdHlwZXMYAiADKAsyDi5jZWwuZXhwci5UeXBlGkUKDEFic3RyYWN0VHlwZRIMCgRuYW1lGAEgASgJEicKD3BhcmFtZXRlcl90eXBlcxgCIAMoCzIOLmNlbC5leHByLlR5cGUicwoNUHJpbWl0aXZlVHlwZRIeChpQUklNSVRJVkVfVFlQRV9VTlNQRUNJRklFRBAAEggKBEJPT0wQARIJCgVJTlQ2NBACEgoKBlVJTlQ2NBADEgoKBkRPVUJMRRAEEgoKBlNUUklORxAFEgkKBUJZVEVTEAYiVgoNV2VsbEtub3duVHlwZRIfChtXRUxMX0tOT1dOX1RZUEVfVU5TUEVDSUZJRUQQABIHCgNBTlkQARINCglUSU1FU1RBTVAQAhIMCghEVVJBVElPThADQgsKCXR5cGVfa2luZCLWAwoERGVjbBIMCgRuYW1lGAEgASgJEikKBWlkZW50GAIgASgLMhguY2VsLmV4cHIuRGVjbC5JZGVudERlY2xIABIvCghmdW5jdGlvbhgDIAEoCzIbLmNlbC5leHByLkRlY2wuRnVuY3Rpb25EZWNsSAAaWQoJSWRlbnREZWNsEhwKBHR5cGUYASABKAsyDi5jZWwuZXhwci5UeXBlEiEKBXZhbHVlGAIgASgLMhIuY2VsLmV4cHIuQ29uc3RhbnQSCwoDZG9jGAMgASgJGvsBCgxGdW5jdGlvbkRlY2wSNwoJb3ZlcmxvYWRzGAEgAygLMiQuY2VsLmV4cHIuRGVjbC5GdW5jdGlvbkRlY2wuT3ZlcmxvYWQSCwoDZG9jGAIgASgJGqQBCghPdmVybG9hZBITCgtvdmVybG9hZF9pZBgBIAEoCRIeCgZwYXJhbXMYAiADKAsyDi5jZWwuZXhwci5UeXBlEhMKC3R5cGVfcGFyYW1zGAMgAygJEiMKC3Jlc3VsdF90eXBlGAQgASgLMg4uY2VsLmV4cHIuVHlwZRIcChRpc19pbnN0YW5jZV9mdW5jdGlvbhgFIAEoCBILCgNkb2MYBiABKAlCCwoJZGVjbF9raW5kIlEKCVJlZmVyZW5jZRIMCgRuYW1lGAEgASgJEhMKC292ZXJsb2FkX2lkGAMgAygJEiEKBXZhbHVlGAQgASgLMhIuY2VsLmV4cHIuQ29uc3RhbnRCLAoMZGV2LmNlbC5leHByQglEZWNsUHJvdG9QAVoMY2VsLmRldi9leHBy+AEBYgZwcm90bzM",
    [OU.file_cel_expr_syntax, n0.file_google_protobuf_empty, n0.file_google_protobuf_struct],
  );
  PU.CheckedExprSchema = gr.messageDesc(PU.file_cel_expr_checked, 0);
  PU.TypeSchema = gr.messageDesc(PU.file_cel_expr_checked, 1);
  PU.Type_ListTypeSchema = gr.messageDesc(PU.file_cel_expr_checked, 1, 0);
  PU.Type_MapTypeSchema = gr.messageDesc(PU.file_cel_expr_checked, 1, 1);
  PU.Type_FunctionTypeSchema = gr.messageDesc(PU.file_cel_expr_checked, 1, 2);
  PU.Type_AbstractTypeSchema = gr.messageDesc(PU.file_cel_expr_checked, 1, 3);
  var kU;
  (function (e) {
    ((e[(e.PRIMITIVE_TYPE_UNSPECIFIED = 0)] = "PRIMITIVE_TYPE_UNSPECIFIED"),
      (e[(e.BOOL = 1)] = "BOOL"),
      (e[(e.INT64 = 2)] = "INT64"),
      (e[(e.UINT64 = 3)] = "UINT64"),
      (e[(e.DOUBLE = 4)] = "DOUBLE"),
      (e[(e.STRING = 5)] = "STRING"),
      (e[(e.BYTES = 6)] = "BYTES"));
  })(kU || (PU.Type_PrimitiveType = kU = {}));
  PU.Type_PrimitiveTypeSchema = gr.enumDesc(PU.file_cel_expr_checked, 1, 0);
  var DU;
  (function (e) {
    ((e[(e.WELL_KNOWN_TYPE_UNSPECIFIED = 0)] = "WELL_KNOWN_TYPE_UNSPECIFIED"),
      (e[(e.ANY = 1)] = "ANY"),
      (e[(e.TIMESTAMP = 2)] = "TIMESTAMP"),
      (e[(e.DURATION = 3)] = "DURATION"));
  })(DU || (PU.Type_WellKnownType = DU = {}));
  PU.Type_WellKnownTypeSchema = gr.enumDesc(PU.file_cel_expr_checked, 1, 1);
  PU.DeclSchema = gr.messageDesc(PU.file_cel_expr_checked, 2);
  PU.Decl_IdentDeclSchema = gr.messageDesc(PU.file_cel_expr_checked, 2, 0);
  PU.Decl_FunctionDeclSchema = gr.messageDesc(PU.file_cel_expr_checked, 2, 1);
  PU.Decl_FunctionDecl_OverloadSchema = gr.messageDesc(PU.file_cel_expr_checked, 2, 1, 0);
  PU.ReferenceSchema = gr.messageDesc(PU.file_cel_expr_checked, 3);
});

export { BU };
