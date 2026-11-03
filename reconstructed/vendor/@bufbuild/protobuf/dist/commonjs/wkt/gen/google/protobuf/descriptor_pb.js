/**
 * @bufbuild/protobuf/dist/commonjs/wkt/gen/google/protobuf/descriptor_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../../../../runtime/bun-runtime.js";
import { d_ } from "../../../../../cjs/codegenv2/boot.js";
import { Ts } from "../../../../../cjs/codegenv2/message.js";
import { Ea } from "../../../../../cjs/codegenv2/enum.js";

//@ chunk-fq0cr76a.js:378745-410280 cjs-require-graph
var Rl = x(function ($D) {
  Object.defineProperty($D, "__esModule", { value: !0 });
  $D.FeatureSet_FieldPresence =
    $D.FeatureSet_VisibilityFeature_DefaultSymbolVisibilitySchema =
    $D.FeatureSet_VisibilityFeature_DefaultSymbolVisibility =
    $D.FeatureSet_VisibilityFeatureSchema =
    $D.FeatureSetSchema =
    $D.UninterpretedOption_NamePartSchema =
    $D.UninterpretedOptionSchema =
    $D.MethodOptions_IdempotencyLevelSchema =
    $D.MethodOptions_IdempotencyLevel =
    $D.MethodOptionsSchema =
    $D.ServiceOptionsSchema =
    $D.EnumValueOptionsSchema =
    $D.EnumOptionsSchema =
    $D.OneofOptionsSchema =
    $D.FieldOptions_OptionTargetTypeSchema =
    $D.FieldOptions_OptionTargetType =
    $D.FieldOptions_OptionRetentionSchema =
    $D.FieldOptions_OptionRetention =
    $D.FieldOptions_JSTypeSchema =
    $D.FieldOptions_JSType =
    $D.FieldOptions_CTypeSchema =
    $D.FieldOptions_CType =
    $D.FieldOptions_FeatureSupportSchema =
    $D.FieldOptions_EditionDefaultSchema =
    $D.FieldOptionsSchema =
    $D.MessageOptionsSchema =
    $D.FileOptions_OptimizeModeSchema =
    $D.FileOptions_OptimizeMode =
    $D.FileOptionsSchema =
    $D.MethodDescriptorProtoSchema =
    $D.ServiceDescriptorProtoSchema =
    $D.EnumValueDescriptorProtoSchema =
    $D.EnumDescriptorProto_EnumReservedRangeSchema =
    $D.EnumDescriptorProtoSchema =
    $D.OneofDescriptorProtoSchema =
    $D.FieldDescriptorProto_LabelSchema =
    $D.FieldDescriptorProto_Label =
    $D.FieldDescriptorProto_TypeSchema =
    $D.FieldDescriptorProto_Type =
    $D.FieldDescriptorProtoSchema =
    $D.ExtensionRangeOptions_VerificationStateSchema =
    $D.ExtensionRangeOptions_VerificationState =
    $D.ExtensionRangeOptions_DeclarationSchema =
    $D.ExtensionRangeOptionsSchema =
    $D.DescriptorProto_ReservedRangeSchema =
    $D.DescriptorProto_ExtensionRangeSchema =
    $D.DescriptorProtoSchema =
    $D.FileDescriptorProtoSchema =
    $D.FileDescriptorSetSchema =
    $D.file_google_protobuf_descriptor =
      void 0;
  $D.SymbolVisibilitySchema =
    $D.SymbolVisibility =
    $D.EditionSchema =
    $D.Edition =
    $D.GeneratedCodeInfo_Annotation_SemanticSchema =
    $D.GeneratedCodeInfo_Annotation_Semantic =
    $D.GeneratedCodeInfo_AnnotationSchema =
    $D.GeneratedCodeInfoSchema =
    $D.SourceCodeInfo_LocationSchema =
    $D.SourceCodeInfoSchema =
    $D.FeatureSetDefaults_FeatureSetEditionDefaultSchema =
    $D.FeatureSetDefaultsSchema =
    $D.FeatureSet_EnforceNamingStyleSchema =
    $D.FeatureSet_EnforceNamingStyle =
    $D.FeatureSet_JsonFormatSchema =
    $D.FeatureSet_JsonFormat =
    $D.FeatureSet_MessageEncodingSchema =
    $D.FeatureSet_MessageEncoding =
    $D.FeatureSet_Utf8ValidationSchema =
    $D.FeatureSet_Utf8Validation =
    $D.FeatureSet_RepeatedFieldEncodingSchema =
    $D.FeatureSet_RepeatedFieldEncoding =
    $D.FeatureSet_EnumTypeSchema =
    $D.FeatureSet_EnumType =
    $D.FeatureSet_FieldPresenceSchema =
      void 0;
  var MD = d_(),
    Ot = Ts(),
    An = Ea();
  $D.file_google_protobuf_descriptor = MD.boot({
    name: "google/protobuf/descriptor.proto",
    package: "google.protobuf",
    messageType: [
      {
        name: "FileDescriptorSet",
        field: [
          { name: "file", number: 1, type: 11, label: 3, typeName: ".google.protobuf.FileDescriptorProto" },
        ],
        extensionRange: [{ start: 536000000, end: 536000001 }],
      },
      {
        name: "FileDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          { name: "package", number: 2, type: 9, label: 1 },
          { name: "dependency", number: 3, type: 9, label: 3 },
          { name: "public_dependency", number: 10, type: 5, label: 3 },
          { name: "weak_dependency", number: 11, type: 5, label: 3 },
          { name: "option_dependency", number: 15, type: 9, label: 3 },
          {
            name: "message_type",
            number: 4,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.DescriptorProto",
          },
          {
            name: "enum_type",
            number: 5,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.EnumDescriptorProto",
          },
          {
            name: "service",
            number: 6,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.ServiceDescriptorProto",
          },
          {
            name: "extension",
            number: 7,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.FieldDescriptorProto",
          },
          { name: "options", number: 8, type: 11, label: 1, typeName: ".google.protobuf.FileOptions" },
          {
            name: "source_code_info",
            number: 9,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.SourceCodeInfo",
          },
          { name: "syntax", number: 12, type: 9, label: 1 },
          { name: "edition", number: 14, type: 14, label: 1, typeName: ".google.protobuf.Edition" },
        ],
      },
      {
        name: "DescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          { name: "field", number: 2, type: 11, label: 3, typeName: ".google.protobuf.FieldDescriptorProto" },
          {
            name: "extension",
            number: 6,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.FieldDescriptorProto",
          },
          {
            name: "nested_type",
            number: 3,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.DescriptorProto",
          },
          {
            name: "enum_type",
            number: 4,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.EnumDescriptorProto",
          },
          {
            name: "extension_range",
            number: 5,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.DescriptorProto.ExtensionRange",
          },
          {
            name: "oneof_decl",
            number: 8,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.OneofDescriptorProto",
          },
          { name: "options", number: 7, type: 11, label: 1, typeName: ".google.protobuf.MessageOptions" },
          {
            name: "reserved_range",
            number: 9,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.DescriptorProto.ReservedRange",
          },
          { name: "reserved_name", number: 10, type: 9, label: 3 },
          {
            name: "visibility",
            number: 11,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.SymbolVisibility",
          },
        ],
        nestedType: [
          {
            name: "ExtensionRange",
            field: [
              { name: "start", number: 1, type: 5, label: 1 },
              { name: "end", number: 2, type: 5, label: 1 },
              {
                name: "options",
                number: 3,
                type: 11,
                label: 1,
                typeName: ".google.protobuf.ExtensionRangeOptions",
              },
            ],
          },
          {
            name: "ReservedRange",
            field: [
              { name: "start", number: 1, type: 5, label: 1 },
              { name: "end", number: 2, type: 5, label: 1 },
            ],
          },
        ],
      },
      {
        name: "ExtensionRangeOptions",
        field: [
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
          {
            name: "declaration",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.ExtensionRangeOptions.Declaration",
            options: { retention: 2 },
          },
          { name: "features", number: 50, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "verification",
            number: 3,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.ExtensionRangeOptions.VerificationState",
            defaultValue: "UNVERIFIED",
            options: { retention: 2 },
          },
        ],
        nestedType: [
          {
            name: "Declaration",
            field: [
              { name: "number", number: 1, type: 5, label: 1 },
              { name: "full_name", number: 2, type: 9, label: 1 },
              { name: "type", number: 3, type: 9, label: 1 },
              { name: "reserved", number: 5, type: 8, label: 1 },
              { name: "repeated", number: 6, type: 8, label: 1 },
            ],
          },
        ],
        enumType: [
          {
            name: "VerificationState",
            value: [
              { name: "DECLARATION", number: 0 },
              { name: "UNVERIFIED", number: 1 },
            ],
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "FieldDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          { name: "number", number: 3, type: 5, label: 1 },
          {
            name: "label",
            number: 4,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FieldDescriptorProto.Label",
          },
          {
            name: "type",
            number: 5,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FieldDescriptorProto.Type",
          },
          { name: "type_name", number: 6, type: 9, label: 1 },
          { name: "extendee", number: 2, type: 9, label: 1 },
          { name: "default_value", number: 7, type: 9, label: 1 },
          { name: "oneof_index", number: 9, type: 5, label: 1 },
          { name: "json_name", number: 10, type: 9, label: 1 },
          { name: "options", number: 8, type: 11, label: 1, typeName: ".google.protobuf.FieldOptions" },
          { name: "proto3_optional", number: 17, type: 8, label: 1 },
        ],
        enumType: [
          {
            name: "Type",
            value: [
              { name: "TYPE_DOUBLE", number: 1 },
              { name: "TYPE_FLOAT", number: 2 },
              { name: "TYPE_INT64", number: 3 },
              { name: "TYPE_UINT64", number: 4 },
              { name: "TYPE_INT32", number: 5 },
              { name: "TYPE_FIXED64", number: 6 },
              { name: "TYPE_FIXED32", number: 7 },
              { name: "TYPE_BOOL", number: 8 },
              { name: "TYPE_STRING", number: 9 },
              { name: "TYPE_GROUP", number: 10 },
              { name: "TYPE_MESSAGE", number: 11 },
              { name: "TYPE_BYTES", number: 12 },
              { name: "TYPE_UINT32", number: 13 },
              { name: "TYPE_ENUM", number: 14 },
              { name: "TYPE_SFIXED32", number: 15 },
              { name: "TYPE_SFIXED64", number: 16 },
              { name: "TYPE_SINT32", number: 17 },
              { name: "TYPE_SINT64", number: 18 },
            ],
          },
          {
            name: "Label",
            value: [
              { name: "LABEL_OPTIONAL", number: 1 },
              { name: "LABEL_REPEATED", number: 3 },
              { name: "LABEL_REQUIRED", number: 2 },
            ],
          },
        ],
      },
      {
        name: "OneofDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          { name: "options", number: 2, type: 11, label: 1, typeName: ".google.protobuf.OneofOptions" },
        ],
      },
      {
        name: "EnumDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          {
            name: "value",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.EnumValueDescriptorProto",
          },
          { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.EnumOptions" },
          {
            name: "reserved_range",
            number: 4,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.EnumDescriptorProto.EnumReservedRange",
          },
          { name: "reserved_name", number: 5, type: 9, label: 3 },
          {
            name: "visibility",
            number: 6,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.SymbolVisibility",
          },
        ],
        nestedType: [
          {
            name: "EnumReservedRange",
            field: [
              { name: "start", number: 1, type: 5, label: 1 },
              { name: "end", number: 2, type: 5, label: 1 },
            ],
          },
        ],
      },
      {
        name: "EnumValueDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          { name: "number", number: 2, type: 5, label: 1 },
          { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.EnumValueOptions" },
        ],
      },
      {
        name: "ServiceDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          {
            name: "method",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.MethodDescriptorProto",
          },
          { name: "options", number: 3, type: 11, label: 1, typeName: ".google.protobuf.ServiceOptions" },
        ],
      },
      {
        name: "MethodDescriptorProto",
        field: [
          { name: "name", number: 1, type: 9, label: 1 },
          { name: "input_type", number: 2, type: 9, label: 1 },
          { name: "output_type", number: 3, type: 9, label: 1 },
          { name: "options", number: 4, type: 11, label: 1, typeName: ".google.protobuf.MethodOptions" },
          { name: "client_streaming", number: 5, type: 8, label: 1, defaultValue: "false" },
          { name: "server_streaming", number: 6, type: 8, label: 1, defaultValue: "false" },
        ],
      },
      {
        name: "FileOptions",
        field: [
          { name: "java_package", number: 1, type: 9, label: 1 },
          { name: "java_outer_classname", number: 8, type: 9, label: 1 },
          { name: "java_multiple_files", number: 10, type: 8, label: 1, defaultValue: "false", options: {} },
          {
            name: "java_generate_equals_and_hash",
            number: 20,
            type: 8,
            label: 1,
            options: { deprecated: !0 },
          },
          { name: "java_string_check_utf8", number: 27, type: 8, label: 1, defaultValue: "false" },
          {
            name: "optimize_for",
            number: 9,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FileOptions.OptimizeMode",
            defaultValue: "SPEED",
          },
          { name: "go_package", number: 11, type: 9, label: 1 },
          { name: "cc_generic_services", number: 16, type: 8, label: 1, defaultValue: "false" },
          { name: "java_generic_services", number: 17, type: 8, label: 1, defaultValue: "false" },
          { name: "py_generic_services", number: 18, type: 8, label: 1, defaultValue: "false" },
          { name: "deprecated", number: 23, type: 8, label: 1, defaultValue: "false" },
          { name: "cc_enable_arenas", number: 31, type: 8, label: 1, defaultValue: "true" },
          { name: "objc_class_prefix", number: 36, type: 9, label: 1 },
          { name: "csharp_namespace", number: 37, type: 9, label: 1 },
          { name: "swift_prefix", number: 39, type: 9, label: 1 },
          { name: "php_class_prefix", number: 40, type: 9, label: 1 },
          { name: "php_namespace", number: 41, type: 9, label: 1 },
          { name: "php_metadata_namespace", number: 44, type: 9, label: 1 },
          { name: "ruby_package", number: 45, type: 9, label: 1 },
          { name: "features", number: 50, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        enumType: [
          {
            name: "OptimizeMode",
            value: [
              { name: "SPEED", number: 1 },
              { name: "CODE_SIZE", number: 2 },
              { name: "LITE_RUNTIME", number: 3 },
            ],
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "MessageOptions",
        field: [
          { name: "message_set_wire_format", number: 1, type: 8, label: 1, defaultValue: "false" },
          { name: "no_standard_descriptor_accessor", number: 2, type: 8, label: 1, defaultValue: "false" },
          { name: "deprecated", number: 3, type: 8, label: 1, defaultValue: "false" },
          { name: "map_entry", number: 7, type: 8, label: 1 },
          {
            name: "deprecated_legacy_json_field_conflicts",
            number: 11,
            type: 8,
            label: 1,
            options: { deprecated: !0 },
          },
          { name: "features", number: 12, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "FieldOptions",
        field: [
          {
            name: "ctype",
            number: 1,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FieldOptions.CType",
            defaultValue: "STRING",
          },
          { name: "packed", number: 2, type: 8, label: 1 },
          {
            name: "jstype",
            number: 6,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FieldOptions.JSType",
            defaultValue: "JS_NORMAL",
          },
          { name: "lazy", number: 5, type: 8, label: 1, defaultValue: "false" },
          { name: "unverified_lazy", number: 15, type: 8, label: 1, defaultValue: "false" },
          { name: "deprecated", number: 3, type: 8, label: 1, defaultValue: "false" },
          { name: "weak", number: 10, type: 8, label: 1, defaultValue: "false", options: { deprecated: !0 } },
          { name: "debug_redact", number: 16, type: 8, label: 1, defaultValue: "false" },
          {
            name: "retention",
            number: 17,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FieldOptions.OptionRetention",
          },
          {
            name: "targets",
            number: 19,
            type: 14,
            label: 3,
            typeName: ".google.protobuf.FieldOptions.OptionTargetType",
          },
          {
            name: "edition_defaults",
            number: 20,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.FieldOptions.EditionDefault",
          },
          { name: "features", number: 21, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "feature_support",
            number: 22,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FieldOptions.FeatureSupport",
          },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        nestedType: [
          {
            name: "EditionDefault",
            field: [
              { name: "edition", number: 3, type: 14, label: 1, typeName: ".google.protobuf.Edition" },
              { name: "value", number: 2, type: 9, label: 1 },
            ],
          },
          {
            name: "FeatureSupport",
            field: [
              {
                name: "edition_introduced",
                number: 1,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.Edition",
              },
              {
                name: "edition_deprecated",
                number: 2,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.Edition",
              },
              { name: "deprecation_warning", number: 3, type: 9, label: 1 },
              {
                name: "edition_removed",
                number: 4,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.Edition",
              },
              { name: "removal_error", number: 5, type: 9, label: 1 },
            ],
          },
        ],
        enumType: [
          {
            name: "CType",
            value: [
              { name: "STRING", number: 0 },
              { name: "CORD", number: 1 },
              { name: "STRING_PIECE", number: 2 },
            ],
          },
          {
            name: "JSType",
            value: [
              { name: "JS_NORMAL", number: 0 },
              { name: "JS_STRING", number: 1 },
              { name: "JS_NUMBER", number: 2 },
            ],
          },
          {
            name: "OptionRetention",
            value: [
              { name: "RETENTION_UNKNOWN", number: 0 },
              { name: "RETENTION_RUNTIME", number: 1 },
              { name: "RETENTION_SOURCE", number: 2 },
            ],
          },
          {
            name: "OptionTargetType",
            value: [
              { name: "TARGET_TYPE_UNKNOWN", number: 0 },
              { name: "TARGET_TYPE_FILE", number: 1 },
              { name: "TARGET_TYPE_EXTENSION_RANGE", number: 2 },
              { name: "TARGET_TYPE_MESSAGE", number: 3 },
              { name: "TARGET_TYPE_FIELD", number: 4 },
              { name: "TARGET_TYPE_ONEOF", number: 5 },
              { name: "TARGET_TYPE_ENUM", number: 6 },
              { name: "TARGET_TYPE_ENUM_ENTRY", number: 7 },
              { name: "TARGET_TYPE_SERVICE", number: 8 },
              { name: "TARGET_TYPE_METHOD", number: 9 },
            ],
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "OneofOptions",
        field: [
          { name: "features", number: 1, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "EnumOptions",
        field: [
          { name: "allow_alias", number: 2, type: 8, label: 1 },
          { name: "deprecated", number: 3, type: 8, label: 1, defaultValue: "false" },
          {
            name: "deprecated_legacy_json_field_conflicts",
            number: 6,
            type: 8,
            label: 1,
            options: { deprecated: !0 },
          },
          { name: "features", number: 7, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "EnumValueOptions",
        field: [
          { name: "deprecated", number: 1, type: 8, label: 1, defaultValue: "false" },
          { name: "features", number: 2, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          { name: "debug_redact", number: 3, type: 8, label: 1, defaultValue: "false" },
          {
            name: "feature_support",
            number: 4,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FieldOptions.FeatureSupport",
          },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "ServiceOptions",
        field: [
          { name: "features", number: 34, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          { name: "deprecated", number: 33, type: 8, label: 1, defaultValue: "false" },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "MethodOptions",
        field: [
          { name: "deprecated", number: 33, type: 8, label: 1, defaultValue: "false" },
          {
            name: "idempotency_level",
            number: 34,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.MethodOptions.IdempotencyLevel",
            defaultValue: "IDEMPOTENCY_UNKNOWN",
          },
          { name: "features", number: 35, type: 11, label: 1, typeName: ".google.protobuf.FeatureSet" },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        enumType: [
          {
            name: "IdempotencyLevel",
            value: [
              { name: "IDEMPOTENCY_UNKNOWN", number: 0 },
              { name: "NO_SIDE_EFFECTS", number: 1 },
              { name: "IDEMPOTENT", number: 2 },
            ],
          },
        ],
        extensionRange: [{ start: 1000, end: 536870912 }],
      },
      {
        name: "UninterpretedOption",
        field: [
          {
            name: "name",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption.NamePart",
          },
          { name: "identifier_value", number: 3, type: 9, label: 1 },
          { name: "positive_int_value", number: 4, type: 4, label: 1 },
          { name: "negative_int_value", number: 5, type: 3, label: 1 },
          { name: "double_value", number: 6, type: 1, label: 1 },
          { name: "string_value", number: 7, type: 12, label: 1 },
          { name: "aggregate_value", number: 8, type: 9, label: 1 },
        ],
        nestedType: [
          {
            name: "NamePart",
            field: [
              { name: "name_part", number: 1, type: 9, label: 2 },
              { name: "is_extension", number: 2, type: 8, label: 2 },
            ],
          },
        ],
      },
      {
        name: "FeatureSet",
        field: [
          {
            name: "field_presence",
            number: 1,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.FieldPresence",
            options: {
              retention: 1,
              targets: [4, 1],
              editionDefaults: [
                { value: "EXPLICIT", edition: 900 },
                { value: "IMPLICIT", edition: 999 },
                { value: "EXPLICIT", edition: 1000 },
              ],
            },
          },
          {
            name: "enum_type",
            number: 2,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.EnumType",
            options: {
              retention: 1,
              targets: [6, 1],
              editionDefaults: [
                { value: "CLOSED", edition: 900 },
                { value: "OPEN", edition: 999 },
              ],
            },
          },
          {
            name: "repeated_field_encoding",
            number: 3,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.RepeatedFieldEncoding",
            options: {
              retention: 1,
              targets: [4, 1],
              editionDefaults: [
                { value: "EXPANDED", edition: 900 },
                { value: "PACKED", edition: 999 },
              ],
            },
          },
          {
            name: "utf8_validation",
            number: 4,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.Utf8Validation",
            options: {
              retention: 1,
              targets: [4, 1],
              editionDefaults: [
                { value: "NONE", edition: 900 },
                { value: "VERIFY", edition: 999 },
              ],
            },
          },
          {
            name: "message_encoding",
            number: 5,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.MessageEncoding",
            options: {
              retention: 1,
              targets: [4, 1],
              editionDefaults: [{ value: "LENGTH_PREFIXED", edition: 900 }],
            },
          },
          {
            name: "json_format",
            number: 6,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.JsonFormat",
            options: {
              retention: 1,
              targets: [3, 6, 1],
              editionDefaults: [
                { value: "LEGACY_BEST_EFFORT", edition: 900 },
                { value: "ALLOW", edition: 999 },
              ],
            },
          },
          {
            name: "enforce_naming_style",
            number: 7,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.EnforceNamingStyle",
            options: {
              retention: 2,
              targets: [1, 2, 3, 4, 5, 6, 7, 8, 9],
              editionDefaults: [
                { value: "STYLE_LEGACY", edition: 900 },
                { value: "STYLE2024", edition: 1001 },
              ],
            },
          },
          {
            name: "default_symbol_visibility",
            number: 8,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FeatureSet.VisibilityFeature.DefaultSymbolVisibility",
            options: {
              retention: 2,
              targets: [1],
              editionDefaults: [
                { value: "EXPORT_ALL", edition: 900 },
                { value: "EXPORT_TOP_LEVEL", edition: 1001 },
              ],
            },
          },
        ],
        nestedType: [
          {
            name: "VisibilityFeature",
            enumType: [
              {
                name: "DefaultSymbolVisibility",
                value: [
                  { name: "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN", number: 0 },
                  { name: "EXPORT_ALL", number: 1 },
                  { name: "EXPORT_TOP_LEVEL", number: 2 },
                  { name: "LOCAL_ALL", number: 3 },
                  { name: "STRICT", number: 4 },
                ],
              },
            ],
          },
        ],
        enumType: [
          {
            name: "FieldPresence",
            value: [
              { name: "FIELD_PRESENCE_UNKNOWN", number: 0 },
              { name: "EXPLICIT", number: 1 },
              { name: "IMPLICIT", number: 2 },
              { name: "LEGACY_REQUIRED", number: 3 },
            ],
          },
          {
            name: "EnumType",
            value: [
              { name: "ENUM_TYPE_UNKNOWN", number: 0 },
              { name: "OPEN", number: 1 },
              { name: "CLOSED", number: 2 },
            ],
          },
          {
            name: "RepeatedFieldEncoding",
            value: [
              { name: "REPEATED_FIELD_ENCODING_UNKNOWN", number: 0 },
              { name: "PACKED", number: 1 },
              { name: "EXPANDED", number: 2 },
            ],
          },
          {
            name: "Utf8Validation",
            value: [
              { name: "UTF8_VALIDATION_UNKNOWN", number: 0 },
              { name: "VERIFY", number: 2 },
              { name: "NONE", number: 3 },
            ],
          },
          {
            name: "MessageEncoding",
            value: [
              { name: "MESSAGE_ENCODING_UNKNOWN", number: 0 },
              { name: "LENGTH_PREFIXED", number: 1 },
              { name: "DELIMITED", number: 2 },
            ],
          },
          {
            name: "JsonFormat",
            value: [
              { name: "JSON_FORMAT_UNKNOWN", number: 0 },
              { name: "ALLOW", number: 1 },
              { name: "LEGACY_BEST_EFFORT", number: 2 },
            ],
          },
          {
            name: "EnforceNamingStyle",
            value: [
              { name: "ENFORCE_NAMING_STYLE_UNKNOWN", number: 0 },
              { name: "STYLE2024", number: 1 },
              { name: "STYLE_LEGACY", number: 2 },
            ],
          },
        ],
        extensionRange: [
          { start: 1000, end: 9995 },
          { start: 9995, end: 1e4 },
          { start: 1e4, end: 10001 },
        ],
      },
      {
        name: "FeatureSetDefaults",
        field: [
          {
            name: "defaults",
            number: 1,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.FeatureSetDefaults.FeatureSetEditionDefault",
          },
          { name: "minimum_edition", number: 4, type: 14, label: 1, typeName: ".google.protobuf.Edition" },
          { name: "maximum_edition", number: 5, type: 14, label: 1, typeName: ".google.protobuf.Edition" },
        ],
        nestedType: [
          {
            name: "FeatureSetEditionDefault",
            field: [
              { name: "edition", number: 3, type: 14, label: 1, typeName: ".google.protobuf.Edition" },
              {
                name: "overridable_features",
                number: 4,
                type: 11,
                label: 1,
                typeName: ".google.protobuf.FeatureSet",
              },
              {
                name: "fixed_features",
                number: 5,
                type: 11,
                label: 1,
                typeName: ".google.protobuf.FeatureSet",
              },
            ],
          },
        ],
      },
      {
        name: "SourceCodeInfo",
        field: [
          {
            name: "location",
            number: 1,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.SourceCodeInfo.Location",
          },
        ],
        nestedType: [
          {
            name: "Location",
            field: [
              { name: "path", number: 1, type: 5, label: 3, options: { packed: !0 } },
              { name: "span", number: 2, type: 5, label: 3, options: { packed: !0 } },
              { name: "leading_comments", number: 3, type: 9, label: 1 },
              { name: "trailing_comments", number: 4, type: 9, label: 1 },
              { name: "leading_detached_comments", number: 6, type: 9, label: 3 },
            ],
          },
        ],
        extensionRange: [{ start: 536000000, end: 536000001 }],
      },
      {
        name: "GeneratedCodeInfo",
        field: [
          {
            name: "annotation",
            number: 1,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.GeneratedCodeInfo.Annotation",
          },
        ],
        nestedType: [
          {
            name: "Annotation",
            field: [
              { name: "path", number: 1, type: 5, label: 3, options: { packed: !0 } },
              { name: "source_file", number: 2, type: 9, label: 1 },
              { name: "begin", number: 3, type: 5, label: 1 },
              { name: "end", number: 4, type: 5, label: 1 },
              {
                name: "semantic",
                number: 5,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.GeneratedCodeInfo.Annotation.Semantic",
              },
            ],
            enumType: [
              {
                name: "Semantic",
                value: [
                  { name: "NONE", number: 0 },
                  { name: "SET", number: 1 },
                  { name: "ALIAS", number: 2 },
                ],
              },
            ],
          },
        ],
      },
    ],
    enumType: [
      {
        name: "Edition",
        value: [
          { name: "EDITION_UNKNOWN", number: 0 },
          { name: "EDITION_LEGACY", number: 900 },
          { name: "EDITION_PROTO2", number: 998 },
          { name: "EDITION_PROTO3", number: 999 },
          { name: "EDITION_2023", number: 1000 },
          { name: "EDITION_2024", number: 1001 },
          { name: "EDITION_UNSTABLE", number: 9999 },
          { name: "EDITION_1_TEST_ONLY", number: 1 },
          { name: "EDITION_2_TEST_ONLY", number: 2 },
          { name: "EDITION_99997_TEST_ONLY", number: 99997 },
          { name: "EDITION_99998_TEST_ONLY", number: 99998 },
          { name: "EDITION_99999_TEST_ONLY", number: 99999 },
          { name: "EDITION_MAX", number: 2147483647 },
        ],
      },
      {
        name: "SymbolVisibility",
        value: [
          { name: "VISIBILITY_UNSET", number: 0 },
          { name: "VISIBILITY_LOCAL", number: 1 },
          { name: "VISIBILITY_EXPORT", number: 2 },
        ],
      },
    ],
  });
  $D.FileDescriptorSetSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 0);
  $D.FileDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 1);
  $D.DescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 2);
  $D.DescriptorProto_ExtensionRangeSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 2, 0);
  $D.DescriptorProto_ReservedRangeSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 2, 1);
  $D.ExtensionRangeOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 3);
  $D.ExtensionRangeOptions_DeclarationSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 3, 0);
  var SD;
  (function (e) {
    ((e[(e.DECLARATION = 0)] = "DECLARATION"), (e[(e.UNVERIFIED = 1)] = "UNVERIFIED"));
  })(SD || ($D.ExtensionRangeOptions_VerificationState = SD = {}));
  $D.ExtensionRangeOptions_VerificationStateSchema = An.enumDesc($D.file_google_protobuf_descriptor, 3, 0);
  $D.FieldDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 4);
  var ED;
  (function (e) {
    ((e[(e.DOUBLE = 1)] = "DOUBLE"),
      (e[(e.FLOAT = 2)] = "FLOAT"),
      (e[(e.INT64 = 3)] = "INT64"),
      (e[(e.UINT64 = 4)] = "UINT64"),
      (e[(e.INT32 = 5)] = "INT32"),
      (e[(e.FIXED64 = 6)] = "FIXED64"),
      (e[(e.FIXED32 = 7)] = "FIXED32"),
      (e[(e.BOOL = 8)] = "BOOL"),
      (e[(e.STRING = 9)] = "STRING"),
      (e[(e.GROUP = 10)] = "GROUP"),
      (e[(e.MESSAGE = 11)] = "MESSAGE"),
      (e[(e.BYTES = 12)] = "BYTES"),
      (e[(e.UINT32 = 13)] = "UINT32"),
      (e[(e.ENUM = 14)] = "ENUM"),
      (e[(e.SFIXED32 = 15)] = "SFIXED32"),
      (e[(e.SFIXED64 = 16)] = "SFIXED64"),
      (e[(e.SINT32 = 17)] = "SINT32"),
      (e[(e.SINT64 = 18)] = "SINT64"));
  })(ED || ($D.FieldDescriptorProto_Type = ED = {}));
  $D.FieldDescriptorProto_TypeSchema = An.enumDesc($D.file_google_protobuf_descriptor, 4, 0);
  var xD;
  (function (e) {
    ((e[(e.OPTIONAL = 1)] = "OPTIONAL"),
      (e[(e.REPEATED = 3)] = "REPEATED"),
      (e[(e.REQUIRED = 2)] = "REQUIRED"));
  })(xD || ($D.FieldDescriptorProto_Label = xD = {}));
  $D.FieldDescriptorProto_LabelSchema = An.enumDesc($D.file_google_protobuf_descriptor, 4, 1);
  $D.OneofDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 5);
  $D.EnumDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 6);
  $D.EnumDescriptorProto_EnumReservedRangeSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 6, 0);
  $D.EnumValueDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 7);
  $D.ServiceDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 8);
  $D.MethodDescriptorProtoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 9);
  $D.FileOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 10);
  var _D;
  (function (e) {
    ((e[(e.SPEED = 1)] = "SPEED"),
      (e[(e.CODE_SIZE = 2)] = "CODE_SIZE"),
      (e[(e.LITE_RUNTIME = 3)] = "LITE_RUNTIME"));
  })(_D || ($D.FileOptions_OptimizeMode = _D = {}));
  $D.FileOptions_OptimizeModeSchema = An.enumDesc($D.file_google_protobuf_descriptor, 10, 0);
  $D.MessageOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 11);
  $D.FieldOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 12);
  $D.FieldOptions_EditionDefaultSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 12, 0);
  $D.FieldOptions_FeatureSupportSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 12, 1);
  var vD;
  (function (e) {
    ((e[(e.STRING = 0)] = "STRING"), (e[(e.CORD = 1)] = "CORD"), (e[(e.STRING_PIECE = 2)] = "STRING_PIECE"));
  })(vD || ($D.FieldOptions_CType = vD = {}));
  $D.FieldOptions_CTypeSchema = An.enumDesc($D.file_google_protobuf_descriptor, 12, 0);
  var wD;
  (function (e) {
    ((e[(e.JS_NORMAL = 0)] = "JS_NORMAL"),
      (e[(e.JS_STRING = 1)] = "JS_STRING"),
      (e[(e.JS_NUMBER = 2)] = "JS_NUMBER"));
  })(wD || ($D.FieldOptions_JSType = wD = {}));
  $D.FieldOptions_JSTypeSchema = An.enumDesc($D.file_google_protobuf_descriptor, 12, 1);
  var TD;
  (function (e) {
    ((e[(e.RETENTION_UNKNOWN = 0)] = "RETENTION_UNKNOWN"),
      (e[(e.RETENTION_RUNTIME = 1)] = "RETENTION_RUNTIME"),
      (e[(e.RETENTION_SOURCE = 2)] = "RETENTION_SOURCE"));
  })(TD || ($D.FieldOptions_OptionRetention = TD = {}));
  $D.FieldOptions_OptionRetentionSchema = An.enumDesc($D.file_google_protobuf_descriptor, 12, 2);
  var AD;
  (function (e) {
    ((e[(e.TARGET_TYPE_UNKNOWN = 0)] = "TARGET_TYPE_UNKNOWN"),
      (e[(e.TARGET_TYPE_FILE = 1)] = "TARGET_TYPE_FILE"),
      (e[(e.TARGET_TYPE_EXTENSION_RANGE = 2)] = "TARGET_TYPE_EXTENSION_RANGE"),
      (e[(e.TARGET_TYPE_MESSAGE = 3)] = "TARGET_TYPE_MESSAGE"),
      (e[(e.TARGET_TYPE_FIELD = 4)] = "TARGET_TYPE_FIELD"),
      (e[(e.TARGET_TYPE_ONEOF = 5)] = "TARGET_TYPE_ONEOF"),
      (e[(e.TARGET_TYPE_ENUM = 6)] = "TARGET_TYPE_ENUM"),
      (e[(e.TARGET_TYPE_ENUM_ENTRY = 7)] = "TARGET_TYPE_ENUM_ENTRY"),
      (e[(e.TARGET_TYPE_SERVICE = 8)] = "TARGET_TYPE_SERVICE"),
      (e[(e.TARGET_TYPE_METHOD = 9)] = "TARGET_TYPE_METHOD"));
  })(AD || ($D.FieldOptions_OptionTargetType = AD = {}));
  $D.FieldOptions_OptionTargetTypeSchema = An.enumDesc($D.file_google_protobuf_descriptor, 12, 3);
  $D.OneofOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 13);
  $D.EnumOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 14);
  $D.EnumValueOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 15);
  $D.ServiceOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 16);
  $D.MethodOptionsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 17);
  var CD;
  (function (e) {
    ((e[(e.IDEMPOTENCY_UNKNOWN = 0)] = "IDEMPOTENCY_UNKNOWN"),
      (e[(e.NO_SIDE_EFFECTS = 1)] = "NO_SIDE_EFFECTS"),
      (e[(e.IDEMPOTENT = 2)] = "IDEMPOTENT"));
  })(CD || ($D.MethodOptions_IdempotencyLevel = CD = {}));
  $D.MethodOptions_IdempotencyLevelSchema = An.enumDesc($D.file_google_protobuf_descriptor, 17, 0);
  $D.UninterpretedOptionSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 18);
  $D.UninterpretedOption_NamePartSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 18, 0);
  $D.FeatureSetSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 19);
  $D.FeatureSet_VisibilityFeatureSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 19, 0);
  var RD;
  (function (e) {
    ((e[(e.DEFAULT_SYMBOL_VISIBILITY_UNKNOWN = 0)] = "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN"),
      (e[(e.EXPORT_ALL = 1)] = "EXPORT_ALL"),
      (e[(e.EXPORT_TOP_LEVEL = 2)] = "EXPORT_TOP_LEVEL"),
      (e[(e.LOCAL_ALL = 3)] = "LOCAL_ALL"),
      (e[(e.STRICT = 4)] = "STRICT"));
  })(RD || ($D.FeatureSet_VisibilityFeature_DefaultSymbolVisibility = RD = {}));
  $D.FeatureSet_VisibilityFeature_DefaultSymbolVisibilitySchema = An.enumDesc(
    $D.file_google_protobuf_descriptor,
    19,
    0,
    0,
  );
  var ID;
  (function (e) {
    ((e[(e.FIELD_PRESENCE_UNKNOWN = 0)] = "FIELD_PRESENCE_UNKNOWN"),
      (e[(e.EXPLICIT = 1)] = "EXPLICIT"),
      (e[(e.IMPLICIT = 2)] = "IMPLICIT"),
      (e[(e.LEGACY_REQUIRED = 3)] = "LEGACY_REQUIRED"));
  })(ID || ($D.FeatureSet_FieldPresence = ID = {}));
  $D.FeatureSet_FieldPresenceSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 0);
  var ND;
  (function (e) {
    ((e[(e.ENUM_TYPE_UNKNOWN = 0)] = "ENUM_TYPE_UNKNOWN"),
      (e[(e.OPEN = 1)] = "OPEN"),
      (e[(e.CLOSED = 2)] = "CLOSED"));
  })(ND || ($D.FeatureSet_EnumType = ND = {}));
  $D.FeatureSet_EnumTypeSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 1);
  var kD;
  (function (e) {
    ((e[(e.REPEATED_FIELD_ENCODING_UNKNOWN = 0)] = "REPEATED_FIELD_ENCODING_UNKNOWN"),
      (e[(e.PACKED = 1)] = "PACKED"),
      (e[(e.EXPANDED = 2)] = "EXPANDED"));
  })(kD || ($D.FeatureSet_RepeatedFieldEncoding = kD = {}));
  $D.FeatureSet_RepeatedFieldEncodingSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 2);
  var DD;
  (function (e) {
    ((e[(e.UTF8_VALIDATION_UNKNOWN = 0)] = "UTF8_VALIDATION_UNKNOWN"),
      (e[(e.VERIFY = 2)] = "VERIFY"),
      (e[(e.NONE = 3)] = "NONE"));
  })(DD || ($D.FeatureSet_Utf8Validation = DD = {}));
  $D.FeatureSet_Utf8ValidationSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 3);
  var OD;
  (function (e) {
    ((e[(e.MESSAGE_ENCODING_UNKNOWN = 0)] = "MESSAGE_ENCODING_UNKNOWN"),
      (e[(e.LENGTH_PREFIXED = 1)] = "LENGTH_PREFIXED"),
      (e[(e.DELIMITED = 2)] = "DELIMITED"));
  })(OD || ($D.FeatureSet_MessageEncoding = OD = {}));
  $D.FeatureSet_MessageEncodingSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 4);
  var PD;
  (function (e) {
    ((e[(e.JSON_FORMAT_UNKNOWN = 0)] = "JSON_FORMAT_UNKNOWN"),
      (e[(e.ALLOW = 1)] = "ALLOW"),
      (e[(e.LEGACY_BEST_EFFORT = 2)] = "LEGACY_BEST_EFFORT"));
  })(PD || ($D.FeatureSet_JsonFormat = PD = {}));
  $D.FeatureSet_JsonFormatSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 5);
  var LD;
  (function (e) {
    ((e[(e.ENFORCE_NAMING_STYLE_UNKNOWN = 0)] = "ENFORCE_NAMING_STYLE_UNKNOWN"),
      (e[(e.STYLE2024 = 1)] = "STYLE2024"),
      (e[(e.STYLE_LEGACY = 2)] = "STYLE_LEGACY"));
  })(LD || ($D.FeatureSet_EnforceNamingStyle = LD = {}));
  $D.FeatureSet_EnforceNamingStyleSchema = An.enumDesc($D.file_google_protobuf_descriptor, 19, 6);
  $D.FeatureSetDefaultsSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 20);
  $D.FeatureSetDefaults_FeatureSetEditionDefaultSchema = Ot.messageDesc(
    $D.file_google_protobuf_descriptor,
    20,
    0,
  );
  $D.SourceCodeInfoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 21);
  $D.SourceCodeInfo_LocationSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 21, 0);
  $D.GeneratedCodeInfoSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 22);
  $D.GeneratedCodeInfo_AnnotationSchema = Ot.messageDesc($D.file_google_protobuf_descriptor, 22, 0);
  var BD;
  (function (e) {
    ((e[(e.NONE = 0)] = "NONE"), (e[(e.SET = 1)] = "SET"), (e[(e.ALIAS = 2)] = "ALIAS"));
  })(BD || ($D.GeneratedCodeInfo_Annotation_Semantic = BD = {}));
  $D.GeneratedCodeInfo_Annotation_SemanticSchema = An.enumDesc($D.file_google_protobuf_descriptor, 22, 0, 0);
  var UD;
  (function (e) {
    ((e[(e.EDITION_UNKNOWN = 0)] = "EDITION_UNKNOWN"),
      (e[(e.EDITION_LEGACY = 900)] = "EDITION_LEGACY"),
      (e[(e.EDITION_PROTO2 = 998)] = "EDITION_PROTO2"),
      (e[(e.EDITION_PROTO3 = 999)] = "EDITION_PROTO3"),
      (e[(e.EDITION_2023 = 1000)] = "EDITION_2023"),
      (e[(e.EDITION_2024 = 1001)] = "EDITION_2024"),
      (e[(e.EDITION_UNSTABLE = 9999)] = "EDITION_UNSTABLE"),
      (e[(e.EDITION_1_TEST_ONLY = 1)] = "EDITION_1_TEST_ONLY"),
      (e[(e.EDITION_2_TEST_ONLY = 2)] = "EDITION_2_TEST_ONLY"),
      (e[(e.EDITION_99997_TEST_ONLY = 99997)] = "EDITION_99997_TEST_ONLY"),
      (e[(e.EDITION_99998_TEST_ONLY = 99998)] = "EDITION_99998_TEST_ONLY"),
      (e[(e.EDITION_99999_TEST_ONLY = 99999)] = "EDITION_99999_TEST_ONLY"),
      (e[(e.EDITION_MAX = 2147483647)] = "EDITION_MAX"));
  })(UD || ($D.Edition = UD = {}));
  $D.EditionSchema = An.enumDesc($D.file_google_protobuf_descriptor, 0);
  var FD;
  (function (e) {
    ((e[(e.VISIBILITY_UNSET = 0)] = "VISIBILITY_UNSET"),
      (e[(e.VISIBILITY_LOCAL = 1)] = "VISIBILITY_LOCAL"),
      (e[(e.VISIBILITY_EXPORT = 2)] = "VISIBILITY_EXPORT"));
  })(FD || ($D.SymbolVisibility = FD = {}));
  $D.SymbolVisibilitySchema = An.enumDesc($D.file_google_protobuf_descriptor, 1);
});

export { Rl };
