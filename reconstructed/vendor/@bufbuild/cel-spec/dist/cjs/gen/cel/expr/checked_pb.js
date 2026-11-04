/**
 * @bufbuild/cel-spec/dist/cjs/gen/cel/expr/checked_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel-spec@0.0.1..0.6.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../../../runtime/bun-runtime.js";
import {
  require_error_6,
  require_error_4,
} from "../../../../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { require_syntax_pb } from "./syntax_pb.js";

//@ chunk-fq0cr76a.js:597494-602201 cjs-fingerprint
var require_checked_pb = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ReferenceSchema =
    cjsExports.Decl_FunctionDecl_OverloadSchema =
    cjsExports.Decl_FunctionDeclSchema =
    cjsExports.Decl_IdentDeclSchema =
    cjsExports.DeclSchema =
    cjsExports.Type_WellKnownTypeSchema =
    cjsExports.Type_WellKnownType =
    cjsExports.Type_PrimitiveTypeSchema =
    cjsExports.Type_PrimitiveType =
    cjsExports.Type_AbstractTypeSchema =
    cjsExports.Type_FunctionTypeSchema =
    cjsExports.Type_MapTypeSchema =
    cjsExports.Type_ListTypeSchema =
    cjsExports.TypeSchema =
    cjsExports.CheckedExprSchema =
    cjsExports.file_cel_expr_checked =
      undefined;
  var codegenv2_1 = require_error_6();
  var syntax_pb_js_1 = require_syntax_pb();
  var wkt_1 = require_error_4();
  cjsExports.file_cel_expr_checked = codegenv2_1.fileDesc(
    "ChZjZWwvZXhwci9jaGVja2VkLnByb3RvEghjZWwuZXhwciLsAgoLQ2hlY2tlZEV4cHISPgoNcmVmZXJlbmNlX21hcBgCIAMoCzInLmNlbC5leHByLkNoZWNrZWRFeHByLlJlZmVyZW5jZU1hcEVudHJ5EjQKCHR5cGVfbWFwGAMgAygLMiIuY2VsLmV4cHIuQ2hlY2tlZEV4cHIuVHlwZU1hcEVudHJ5EikKC3NvdXJjZV9pbmZvGAUgASgLMhQuY2VsLmV4cHIuU291cmNlSW5mbxIUCgxleHByX3ZlcnNpb24YBiABKAkSHAoEZXhwchgEIAEoCzIOLmNlbC5leHByLkV4cHIaSAoRUmVmZXJlbmNlTWFwRW50cnkSCwoDa2V5GAEgASgDEiIKBXZhbHVlGAIgASgLMhMuY2VsLmV4cHIuUmVmZXJlbmNlOgI4ARo+CgxUeXBlTWFwRW50cnkSCwoDa2V5GAEgASgDEh0KBXZhbHVlGAIgASgLMg4uY2VsLmV4cHIuVHlwZToCOAEioggKBFR5cGUSJQoDZHluGAEgASgLMhYuZ29vZ2xlLnByb3RvYnVmLkVtcHR5SAASKgoEbnVsbBgCIAEoDjIaLmdvb2dsZS5wcm90b2J1Zi5OdWxsVmFsdWVIABIxCglwcmltaXRpdmUYAyABKA4yHC5jZWwuZXhwci5UeXBlLlByaW1pdGl2ZVR5cGVIABIvCgd3cmFwcGVyGAQgASgOMhwuY2VsLmV4cHIuVHlwZS5QcmltaXRpdmVUeXBlSAASMgoKd2VsbF9rbm93bhgFIAEoDjIcLmNlbC5leHByLlR5cGUuV2VsbEtub3duVHlwZUgAEiwKCWxpc3RfdHlwZRgGIAEoCzIXLmNlbC5leHByLlR5cGUuTGlzdFR5cGVIABIqCghtYXBfdHlwZRgHIAEoCzIWLmNlbC5leHByLlR5cGUuTWFwVHlwZUgAEi8KCGZ1bmN0aW9uGAggASgLMhsuY2VsLmV4cHIuVHlwZS5GdW5jdGlvblR5cGVIABIWCgxtZXNzYWdlX3R5cGUYCSABKAlIABIUCgp0eXBlX3BhcmFtGAogASgJSAASHgoEdHlwZRgLIAEoCzIOLmNlbC5leHByLlR5cGVIABInCgVlcnJvchgMIAEoCzIWLmdvb2dsZS5wcm90b2J1Zi5FbXB0eUgAEjQKDWFic3RyYWN0X3R5cGUYDiABKAsyGy5jZWwuZXhwci5UeXBlLkFic3RyYWN0VHlwZUgAGi0KCExpc3RUeXBlEiEKCWVsZW1fdHlwZRgBIAEoCzIOLmNlbC5leHByLlR5cGUaTwoHTWFwVHlwZRIgCghrZXlfdHlwZRgBIAEoCzIOLmNlbC5leHByLlR5cGUSIgoKdmFsdWVfdHlwZRgCIAEoCzIOLmNlbC5leHByLlR5cGUaVgoMRnVuY3Rpb25UeXBlEiMKC3Jlc3VsdF90eXBlGAEgASgLMg4uY2VsLmV4cHIuVHlwZRIhCglhcmdfdHlwZXMYAiADKAsyDi5jZWwuZXhwci5UeXBlGkUKDEFic3RyYWN0VHlwZRIMCgRuYW1lGAEgASgJEicKD3BhcmFtZXRlcl90eXBlcxgCIAMoCzIOLmNlbC5leHByLlR5cGUicwoNUHJpbWl0aXZlVHlwZRIeChpQUklNSVRJVkVfVFlQRV9VTlNQRUNJRklFRBAAEggKBEJPT0wQARIJCgVJTlQ2NBACEgoKBlVJTlQ2NBADEgoKBkRPVUJMRRAEEgoKBlNUUklORxAFEgkKBUJZVEVTEAYiVgoNV2VsbEtub3duVHlwZRIfChtXRUxMX0tOT1dOX1RZUEVfVU5TUEVDSUZJRUQQABIHCgNBTlkQARINCglUSU1FU1RBTVAQAhIMCghEVVJBVElPThADQgsKCXR5cGVfa2luZCLWAwoERGVjbBIMCgRuYW1lGAEgASgJEikKBWlkZW50GAIgASgLMhguY2VsLmV4cHIuRGVjbC5JZGVudERlY2xIABIvCghmdW5jdGlvbhgDIAEoCzIbLmNlbC5leHByLkRlY2wuRnVuY3Rpb25EZWNsSAAaWQoJSWRlbnREZWNsEhwKBHR5cGUYASABKAsyDi5jZWwuZXhwci5UeXBlEiEKBXZhbHVlGAIgASgLMhIuY2VsLmV4cHIuQ29uc3RhbnQSCwoDZG9jGAMgASgJGvsBCgxGdW5jdGlvbkRlY2wSNwoJb3ZlcmxvYWRzGAEgAygLMiQuY2VsLmV4cHIuRGVjbC5GdW5jdGlvbkRlY2wuT3ZlcmxvYWQSCwoDZG9jGAIgASgJGqQBCghPdmVybG9hZBITCgtvdmVybG9hZF9pZBgBIAEoCRIeCgZwYXJhbXMYAiADKAsyDi5jZWwuZXhwci5UeXBlEhMKC3R5cGVfcGFyYW1zGAMgAygJEiMKC3Jlc3VsdF90eXBlGAQgASgLMg4uY2VsLmV4cHIuVHlwZRIcChRpc19pbnN0YW5jZV9mdW5jdGlvbhgFIAEoCBILCgNkb2MYBiABKAlCCwoJZGVjbF9raW5kIlEKCVJlZmVyZW5jZRIMCgRuYW1lGAEgASgJEhMKC292ZXJsb2FkX2lkGAMgAygJEiEKBXZhbHVlGAQgASgLMhIuY2VsLmV4cHIuQ29uc3RhbnRCLAoMZGV2LmNlbC5leHByQglEZWNsUHJvdG9QAVoMY2VsLmRldi9leHBy+AEBYgZwcm90bzM",
    [
      syntax_pb_js_1.file_cel_expr_syntax,
      wkt_1.file_google_protobuf_empty,
      wkt_1.file_google_protobuf_struct,
    ],
  );
  cjsExports.CheckedExprSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 0);
  cjsExports.TypeSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 1);
  cjsExports.Type_ListTypeSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 1, 0);
  cjsExports.Type_MapTypeSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 1, 1);
  cjsExports.Type_FunctionTypeSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 1, 2);
  cjsExports.Type_AbstractTypeSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 1, 3);
  var Type_PrimitiveType;
  (function (Type_PrimitiveType) {
    Type_PrimitiveType[(Type_PrimitiveType.PRIMITIVE_TYPE_UNSPECIFIED = 0)] = "PRIMITIVE_TYPE_UNSPECIFIED";
    Type_PrimitiveType[(Type_PrimitiveType.BOOL = 1)] = "BOOL";
    Type_PrimitiveType[(Type_PrimitiveType.INT64 = 2)] = "INT64";
    Type_PrimitiveType[(Type_PrimitiveType.UINT64 = 3)] = "UINT64";
    Type_PrimitiveType[(Type_PrimitiveType.DOUBLE = 4)] = "DOUBLE";
    Type_PrimitiveType[(Type_PrimitiveType.STRING = 5)] = "STRING";
    Type_PrimitiveType[(Type_PrimitiveType.BYTES = 6)] = "BYTES";
  })(Type_PrimitiveType || (cjsExports.Type_PrimitiveType = Type_PrimitiveType = {}));
  cjsExports.Type_PrimitiveTypeSchema = codegenv2_1.enumDesc(cjsExports.file_cel_expr_checked, 1, 0);
  var Type_WellKnownType;
  (function (Type_WellKnownType) {
    Type_WellKnownType[(Type_WellKnownType.WELL_KNOWN_TYPE_UNSPECIFIED = 0)] = "WELL_KNOWN_TYPE_UNSPECIFIED";
    Type_WellKnownType[(Type_WellKnownType.ANY = 1)] = "ANY";
    Type_WellKnownType[(Type_WellKnownType.TIMESTAMP = 2)] = "TIMESTAMP";
    Type_WellKnownType[(Type_WellKnownType.DURATION = 3)] = "DURATION";
  })(Type_WellKnownType || (cjsExports.Type_WellKnownType = Type_WellKnownType = {}));
  cjsExports.Type_WellKnownTypeSchema = codegenv2_1.enumDesc(cjsExports.file_cel_expr_checked, 1, 1);
  cjsExports.DeclSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 2);
  cjsExports.Decl_IdentDeclSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 2, 0);
  cjsExports.Decl_FunctionDeclSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 2, 1);
  cjsExports.Decl_FunctionDecl_OverloadSchema = codegenv2_1.messageDesc(
    cjsExports.file_cel_expr_checked,
    2,
    1,
    0,
  );
  cjsExports.ReferenceSchema = codegenv2_1.messageDesc(cjsExports.file_cel_expr_checked, 3);
});
export { require_checked_pb };
