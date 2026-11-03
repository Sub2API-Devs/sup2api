/**
 * @bufbuild/protobuf/dist/commonjs/wkt/gen/google/protobuf/descriptor_pb.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../../../../runtime/bun-runtime.js";
import { require_boot } from "../../../../../cjs/codegenv2/boot.js";
import { require_message } from "../../../../../cjs/codegenv2/message.js";
import { require_enum } from "../../../../../cjs/codegenv2/enum.js";

//@ chunk-fq0cr76a.js:378745-410280 cjs-require-graph
var require_descriptor_pb = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.FeatureSet_FieldPresence =
    cjsExports.FeatureSet_VisibilityFeature_DefaultSymbolVisibilitySchema =
    cjsExports.FeatureSet_VisibilityFeature_DefaultSymbolVisibility =
    cjsExports.FeatureSet_VisibilityFeatureSchema =
    cjsExports.FeatureSetSchema =
    cjsExports.UninterpretedOption_NamePartSchema =
    cjsExports.UninterpretedOptionSchema =
    cjsExports.MethodOptions_IdempotencyLevelSchema =
    cjsExports.MethodOptions_IdempotencyLevel =
    cjsExports.MethodOptionsSchema =
    cjsExports.ServiceOptionsSchema =
    cjsExports.EnumValueOptionsSchema =
    cjsExports.EnumOptionsSchema =
    cjsExports.OneofOptionsSchema =
    cjsExports.FieldOptions_OptionTargetTypeSchema =
    cjsExports.FieldOptions_OptionTargetType =
    cjsExports.FieldOptions_OptionRetentionSchema =
    cjsExports.FieldOptions_OptionRetention =
    cjsExports.FieldOptions_JSTypeSchema =
    cjsExports.FieldOptions_JSType =
    cjsExports.FieldOptions_CTypeSchema =
    cjsExports.FieldOptions_CType =
    cjsExports.FieldOptions_FeatureSupportSchema =
    cjsExports.FieldOptions_EditionDefaultSchema =
    cjsExports.FieldOptionsSchema =
    cjsExports.MessageOptionsSchema =
    cjsExports.FileOptions_OptimizeModeSchema =
    cjsExports.FileOptions_OptimizeMode =
    cjsExports.FileOptionsSchema =
    cjsExports.MethodDescriptorProtoSchema =
    cjsExports.ServiceDescriptorProtoSchema =
    cjsExports.EnumValueDescriptorProtoSchema =
    cjsExports.EnumDescriptorProto_EnumReservedRangeSchema =
    cjsExports.EnumDescriptorProtoSchema =
    cjsExports.OneofDescriptorProtoSchema =
    cjsExports.FieldDescriptorProto_LabelSchema =
    cjsExports.FieldDescriptorProto_Label =
    cjsExports.FieldDescriptorProto_TypeSchema =
    cjsExports.FieldDescriptorProto_Type =
    cjsExports.FieldDescriptorProtoSchema =
    cjsExports.ExtensionRangeOptions_VerificationStateSchema =
    cjsExports.ExtensionRangeOptions_VerificationState =
    cjsExports.ExtensionRangeOptions_DeclarationSchema =
    cjsExports.ExtensionRangeOptionsSchema =
    cjsExports.DescriptorProto_ReservedRangeSchema =
    cjsExports.DescriptorProto_ExtensionRangeSchema =
    cjsExports.DescriptorProtoSchema =
    cjsExports.FileDescriptorProtoSchema =
    cjsExports.FileDescriptorSetSchema =
    cjsExports.file_google_protobuf_descriptor =
      undefined;
  cjsExports.SymbolVisibilitySchema =
    cjsExports.SymbolVisibility =
    cjsExports.EditionSchema =
    cjsExports.Edition =
    cjsExports.GeneratedCodeInfo_Annotation_SemanticSchema =
    cjsExports.GeneratedCodeInfo_Annotation_Semantic =
    cjsExports.GeneratedCodeInfo_AnnotationSchema =
    cjsExports.GeneratedCodeInfoSchema =
    cjsExports.SourceCodeInfo_LocationSchema =
    cjsExports.SourceCodeInfoSchema =
    cjsExports.FeatureSetDefaults_FeatureSetEditionDefaultSchema =
    cjsExports.FeatureSetDefaultsSchema =
    cjsExports.FeatureSet_EnforceNamingStyleSchema =
    cjsExports.FeatureSet_EnforceNamingStyle =
    cjsExports.FeatureSet_JsonFormatSchema =
    cjsExports.FeatureSet_JsonFormat =
    cjsExports.FeatureSet_MessageEncodingSchema =
    cjsExports.FeatureSet_MessageEncoding =
    cjsExports.FeatureSet_Utf8ValidationSchema =
    cjsExports.FeatureSet_Utf8Validation =
    cjsExports.FeatureSet_RepeatedFieldEncodingSchema =
    cjsExports.FeatureSet_RepeatedFieldEncoding =
    cjsExports.FeatureSet_EnumTypeSchema =
    cjsExports.FeatureSet_EnumType =
    cjsExports.FeatureSet_FieldPresenceSchema =
      undefined;
  var boot_js_1 = require_boot();
  var message_js_1 = require_message();
  var enum_js_1 = require_enum();
  cjsExports.file_google_protobuf_descriptor = boot_js_1.boot({
    name: "google/protobuf/descriptor.proto",
    package: "google.protobuf",
    messageType: [
      {
        name: "FileDescriptorSet",
        field: [
          {
            name: "file",
            number: 1,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.FileDescriptorProto",
          },
        ],
        extensionRange: [
          {
            start: 536000000,
            end: 536000001,
          },
        ],
      },
      {
        name: "FileDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "package",
            number: 2,
            type: 9,
            label: 1,
          },
          {
            name: "dependency",
            number: 3,
            type: 9,
            label: 3,
          },
          {
            name: "public_dependency",
            number: 10,
            type: 5,
            label: 3,
          },
          {
            name: "weak_dependency",
            number: 11,
            type: 5,
            label: 3,
          },
          {
            name: "option_dependency",
            number: 15,
            type: 9,
            label: 3,
          },
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
          {
            name: "options",
            number: 8,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FileOptions",
          },
          {
            name: "source_code_info",
            number: 9,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.SourceCodeInfo",
          },
          {
            name: "syntax",
            number: 12,
            type: 9,
            label: 1,
          },
          {
            name: "edition",
            number: 14,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.Edition",
          },
        ],
      },
      {
        name: "DescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "field",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.FieldDescriptorProto",
          },
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
          {
            name: "options",
            number: 7,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.MessageOptions",
          },
          {
            name: "reserved_range",
            number: 9,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.DescriptorProto.ReservedRange",
          },
          {
            name: "reserved_name",
            number: 10,
            type: 9,
            label: 3,
          },
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
              {
                name: "start",
                number: 1,
                type: 5,
                label: 1,
              },
              {
                name: "end",
                number: 2,
                type: 5,
                label: 1,
              },
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
              {
                name: "start",
                number: 1,
                type: 5,
                label: 1,
              },
              {
                name: "end",
                number: 2,
                type: 5,
                label: 1,
              },
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
            options: {
              retention: 2,
            },
          },
          {
            name: "features",
            number: 50,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
          {
            name: "verification",
            number: 3,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.ExtensionRangeOptions.VerificationState",
            defaultValue: "UNVERIFIED",
            options: {
              retention: 2,
            },
          },
        ],
        nestedType: [
          {
            name: "Declaration",
            field: [
              {
                name: "number",
                number: 1,
                type: 5,
                label: 1,
              },
              {
                name: "full_name",
                number: 2,
                type: 9,
                label: 1,
              },
              {
                name: "type",
                number: 3,
                type: 9,
                label: 1,
              },
              {
                name: "reserved",
                number: 5,
                type: 8,
                label: 1,
              },
              {
                name: "repeated",
                number: 6,
                type: 8,
                label: 1,
              },
            ],
          },
        ],
        enumType: [
          {
            name: "VerificationState",
            value: [
              {
                name: "DECLARATION",
                number: 0,
              },
              {
                name: "UNVERIFIED",
                number: 1,
              },
            ],
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "FieldDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "number",
            number: 3,
            type: 5,
            label: 1,
          },
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
          {
            name: "type_name",
            number: 6,
            type: 9,
            label: 1,
          },
          {
            name: "extendee",
            number: 2,
            type: 9,
            label: 1,
          },
          {
            name: "default_value",
            number: 7,
            type: 9,
            label: 1,
          },
          {
            name: "oneof_index",
            number: 9,
            type: 5,
            label: 1,
          },
          {
            name: "json_name",
            number: 10,
            type: 9,
            label: 1,
          },
          {
            name: "options",
            number: 8,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FieldOptions",
          },
          {
            name: "proto3_optional",
            number: 17,
            type: 8,
            label: 1,
          },
        ],
        enumType: [
          {
            name: "Type",
            value: [
              {
                name: "TYPE_DOUBLE",
                number: 1,
              },
              {
                name: "TYPE_FLOAT",
                number: 2,
              },
              {
                name: "TYPE_INT64",
                number: 3,
              },
              {
                name: "TYPE_UINT64",
                number: 4,
              },
              {
                name: "TYPE_INT32",
                number: 5,
              },
              {
                name: "TYPE_FIXED64",
                number: 6,
              },
              {
                name: "TYPE_FIXED32",
                number: 7,
              },
              {
                name: "TYPE_BOOL",
                number: 8,
              },
              {
                name: "TYPE_STRING",
                number: 9,
              },
              {
                name: "TYPE_GROUP",
                number: 10,
              },
              {
                name: "TYPE_MESSAGE",
                number: 11,
              },
              {
                name: "TYPE_BYTES",
                number: 12,
              },
              {
                name: "TYPE_UINT32",
                number: 13,
              },
              {
                name: "TYPE_ENUM",
                number: 14,
              },
              {
                name: "TYPE_SFIXED32",
                number: 15,
              },
              {
                name: "TYPE_SFIXED64",
                number: 16,
              },
              {
                name: "TYPE_SINT32",
                number: 17,
              },
              {
                name: "TYPE_SINT64",
                number: 18,
              },
            ],
          },
          {
            name: "Label",
            value: [
              {
                name: "LABEL_OPTIONAL",
                number: 1,
              },
              {
                name: "LABEL_REPEATED",
                number: 3,
              },
              {
                name: "LABEL_REQUIRED",
                number: 2,
              },
            ],
          },
        ],
      },
      {
        name: "OneofDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "options",
            number: 2,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.OneofOptions",
          },
        ],
      },
      {
        name: "EnumDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "value",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.EnumValueDescriptorProto",
          },
          {
            name: "options",
            number: 3,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.EnumOptions",
          },
          {
            name: "reserved_range",
            number: 4,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.EnumDescriptorProto.EnumReservedRange",
          },
          {
            name: "reserved_name",
            number: 5,
            type: 9,
            label: 3,
          },
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
              {
                name: "start",
                number: 1,
                type: 5,
                label: 1,
              },
              {
                name: "end",
                number: 2,
                type: 5,
                label: 1,
              },
            ],
          },
        ],
      },
      {
        name: "EnumValueDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "number",
            number: 2,
            type: 5,
            label: 1,
          },
          {
            name: "options",
            number: 3,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.EnumValueOptions",
          },
        ],
      },
      {
        name: "ServiceDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "method",
            number: 2,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.MethodDescriptorProto",
          },
          {
            name: "options",
            number: 3,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.ServiceOptions",
          },
        ],
      },
      {
        name: "MethodDescriptorProto",
        field: [
          {
            name: "name",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "input_type",
            number: 2,
            type: 9,
            label: 1,
          },
          {
            name: "output_type",
            number: 3,
            type: 9,
            label: 1,
          },
          {
            name: "options",
            number: 4,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.MethodOptions",
          },
          {
            name: "client_streaming",
            number: 5,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "server_streaming",
            number: 6,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
        ],
      },
      {
        name: "FileOptions",
        field: [
          {
            name: "java_package",
            number: 1,
            type: 9,
            label: 1,
          },
          {
            name: "java_outer_classname",
            number: 8,
            type: 9,
            label: 1,
          },
          {
            name: "java_multiple_files",
            number: 10,
            type: 8,
            label: 1,
            defaultValue: "false",
            options: {},
          },
          {
            name: "java_generate_equals_and_hash",
            number: 20,
            type: 8,
            label: 1,
            options: {
              deprecated: true,
            },
          },
          {
            name: "java_string_check_utf8",
            number: 27,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "optimize_for",
            number: 9,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FileOptions.OptimizeMode",
            defaultValue: "SPEED",
          },
          {
            name: "go_package",
            number: 11,
            type: 9,
            label: 1,
          },
          {
            name: "cc_generic_services",
            number: 16,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "java_generic_services",
            number: 17,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "py_generic_services",
            number: 18,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "deprecated",
            number: 23,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "cc_enable_arenas",
            number: 31,
            type: 8,
            label: 1,
            defaultValue: "true",
          },
          {
            name: "objc_class_prefix",
            number: 36,
            type: 9,
            label: 1,
          },
          {
            name: "csharp_namespace",
            number: 37,
            type: 9,
            label: 1,
          },
          {
            name: "swift_prefix",
            number: 39,
            type: 9,
            label: 1,
          },
          {
            name: "php_class_prefix",
            number: 40,
            type: 9,
            label: 1,
          },
          {
            name: "php_namespace",
            number: 41,
            type: 9,
            label: 1,
          },
          {
            name: "php_metadata_namespace",
            number: 44,
            type: 9,
            label: 1,
          },
          {
            name: "ruby_package",
            number: 45,
            type: 9,
            label: 1,
          },
          {
            name: "features",
            number: 50,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
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
              {
                name: "SPEED",
                number: 1,
              },
              {
                name: "CODE_SIZE",
                number: 2,
              },
              {
                name: "LITE_RUNTIME",
                number: 3,
              },
            ],
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "MessageOptions",
        field: [
          {
            name: "message_set_wire_format",
            number: 1,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "no_standard_descriptor_accessor",
            number: 2,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "deprecated",
            number: 3,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "map_entry",
            number: 7,
            type: 8,
            label: 1,
          },
          {
            name: "deprecated_legacy_json_field_conflicts",
            number: 11,
            type: 8,
            label: 1,
            options: {
              deprecated: true,
            },
          },
          {
            name: "features",
            number: 12,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
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
          {
            name: "packed",
            number: 2,
            type: 8,
            label: 1,
          },
          {
            name: "jstype",
            number: 6,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.FieldOptions.JSType",
            defaultValue: "JS_NORMAL",
          },
          {
            name: "lazy",
            number: 5,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "unverified_lazy",
            number: 15,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "deprecated",
            number: 3,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "weak",
            number: 10,
            type: 8,
            label: 1,
            defaultValue: "false",
            options: {
              deprecated: true,
            },
          },
          {
            name: "debug_redact",
            number: 16,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
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
          {
            name: "features",
            number: 21,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
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
              {
                name: "edition",
                number: 3,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.Edition",
              },
              {
                name: "value",
                number: 2,
                type: 9,
                label: 1,
              },
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
              {
                name: "deprecation_warning",
                number: 3,
                type: 9,
                label: 1,
              },
              {
                name: "edition_removed",
                number: 4,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.Edition",
              },
              {
                name: "removal_error",
                number: 5,
                type: 9,
                label: 1,
              },
            ],
          },
        ],
        enumType: [
          {
            name: "CType",
            value: [
              {
                name: "STRING",
                number: 0,
              },
              {
                name: "CORD",
                number: 1,
              },
              {
                name: "STRING_PIECE",
                number: 2,
              },
            ],
          },
          {
            name: "JSType",
            value: [
              {
                name: "JS_NORMAL",
                number: 0,
              },
              {
                name: "JS_STRING",
                number: 1,
              },
              {
                name: "JS_NUMBER",
                number: 2,
              },
            ],
          },
          {
            name: "OptionRetention",
            value: [
              {
                name: "RETENTION_UNKNOWN",
                number: 0,
              },
              {
                name: "RETENTION_RUNTIME",
                number: 1,
              },
              {
                name: "RETENTION_SOURCE",
                number: 2,
              },
            ],
          },
          {
            name: "OptionTargetType",
            value: [
              {
                name: "TARGET_TYPE_UNKNOWN",
                number: 0,
              },
              {
                name: "TARGET_TYPE_FILE",
                number: 1,
              },
              {
                name: "TARGET_TYPE_EXTENSION_RANGE",
                number: 2,
              },
              {
                name: "TARGET_TYPE_MESSAGE",
                number: 3,
              },
              {
                name: "TARGET_TYPE_FIELD",
                number: 4,
              },
              {
                name: "TARGET_TYPE_ONEOF",
                number: 5,
              },
              {
                name: "TARGET_TYPE_ENUM",
                number: 6,
              },
              {
                name: "TARGET_TYPE_ENUM_ENTRY",
                number: 7,
              },
              {
                name: "TARGET_TYPE_SERVICE",
                number: 8,
              },
              {
                name: "TARGET_TYPE_METHOD",
                number: 9,
              },
            ],
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "OneofOptions",
        field: [
          {
            name: "features",
            number: 1,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "EnumOptions",
        field: [
          {
            name: "allow_alias",
            number: 2,
            type: 8,
            label: 1,
          },
          {
            name: "deprecated",
            number: 3,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "deprecated_legacy_json_field_conflicts",
            number: 6,
            type: 8,
            label: 1,
            options: {
              deprecated: true,
            },
          },
          {
            name: "features",
            number: 7,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "EnumValueOptions",
        field: [
          {
            name: "deprecated",
            number: 1,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "features",
            number: 2,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
          {
            name: "debug_redact",
            number: 3,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
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
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "ServiceOptions",
        field: [
          {
            name: "features",
            number: 34,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
          {
            name: "deprecated",
            number: 33,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "uninterpreted_option",
            number: 999,
            type: 11,
            label: 3,
            typeName: ".google.protobuf.UninterpretedOption",
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
      },
      {
        name: "MethodOptions",
        field: [
          {
            name: "deprecated",
            number: 33,
            type: 8,
            label: 1,
            defaultValue: "false",
          },
          {
            name: "idempotency_level",
            number: 34,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.MethodOptions.IdempotencyLevel",
            defaultValue: "IDEMPOTENCY_UNKNOWN",
          },
          {
            name: "features",
            number: 35,
            type: 11,
            label: 1,
            typeName: ".google.protobuf.FeatureSet",
          },
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
              {
                name: "IDEMPOTENCY_UNKNOWN",
                number: 0,
              },
              {
                name: "NO_SIDE_EFFECTS",
                number: 1,
              },
              {
                name: "IDEMPOTENT",
                number: 2,
              },
            ],
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 536870912,
          },
        ],
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
          {
            name: "identifier_value",
            number: 3,
            type: 9,
            label: 1,
          },
          {
            name: "positive_int_value",
            number: 4,
            type: 4,
            label: 1,
          },
          {
            name: "negative_int_value",
            number: 5,
            type: 3,
            label: 1,
          },
          {
            name: "double_value",
            number: 6,
            type: 1,
            label: 1,
          },
          {
            name: "string_value",
            number: 7,
            type: 12,
            label: 1,
          },
          {
            name: "aggregate_value",
            number: 8,
            type: 9,
            label: 1,
          },
        ],
        nestedType: [
          {
            name: "NamePart",
            field: [
              {
                name: "name_part",
                number: 1,
                type: 9,
                label: 2,
              },
              {
                name: "is_extension",
                number: 2,
                type: 8,
                label: 2,
              },
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
                {
                  value: "EXPLICIT",
                  edition: 900,
                },
                {
                  value: "IMPLICIT",
                  edition: 999,
                },
                {
                  value: "EXPLICIT",
                  edition: 1000,
                },
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
                {
                  value: "CLOSED",
                  edition: 900,
                },
                {
                  value: "OPEN",
                  edition: 999,
                },
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
                {
                  value: "EXPANDED",
                  edition: 900,
                },
                {
                  value: "PACKED",
                  edition: 999,
                },
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
                {
                  value: "NONE",
                  edition: 900,
                },
                {
                  value: "VERIFY",
                  edition: 999,
                },
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
              editionDefaults: [
                {
                  value: "LENGTH_PREFIXED",
                  edition: 900,
                },
              ],
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
                {
                  value: "LEGACY_BEST_EFFORT",
                  edition: 900,
                },
                {
                  value: "ALLOW",
                  edition: 999,
                },
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
                {
                  value: "STYLE_LEGACY",
                  edition: 900,
                },
                {
                  value: "STYLE2024",
                  edition: 1001,
                },
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
                {
                  value: "EXPORT_ALL",
                  edition: 900,
                },
                {
                  value: "EXPORT_TOP_LEVEL",
                  edition: 1001,
                },
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
                  {
                    name: "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN",
                    number: 0,
                  },
                  {
                    name: "EXPORT_ALL",
                    number: 1,
                  },
                  {
                    name: "EXPORT_TOP_LEVEL",
                    number: 2,
                  },
                  {
                    name: "LOCAL_ALL",
                    number: 3,
                  },
                  {
                    name: "STRICT",
                    number: 4,
                  },
                ],
              },
            ],
          },
        ],
        enumType: [
          {
            name: "FieldPresence",
            value: [
              {
                name: "FIELD_PRESENCE_UNKNOWN",
                number: 0,
              },
              {
                name: "EXPLICIT",
                number: 1,
              },
              {
                name: "IMPLICIT",
                number: 2,
              },
              {
                name: "LEGACY_REQUIRED",
                number: 3,
              },
            ],
          },
          {
            name: "EnumType",
            value: [
              {
                name: "ENUM_TYPE_UNKNOWN",
                number: 0,
              },
              {
                name: "OPEN",
                number: 1,
              },
              {
                name: "CLOSED",
                number: 2,
              },
            ],
          },
          {
            name: "RepeatedFieldEncoding",
            value: [
              {
                name: "REPEATED_FIELD_ENCODING_UNKNOWN",
                number: 0,
              },
              {
                name: "PACKED",
                number: 1,
              },
              {
                name: "EXPANDED",
                number: 2,
              },
            ],
          },
          {
            name: "Utf8Validation",
            value: [
              {
                name: "UTF8_VALIDATION_UNKNOWN",
                number: 0,
              },
              {
                name: "VERIFY",
                number: 2,
              },
              {
                name: "NONE",
                number: 3,
              },
            ],
          },
          {
            name: "MessageEncoding",
            value: [
              {
                name: "MESSAGE_ENCODING_UNKNOWN",
                number: 0,
              },
              {
                name: "LENGTH_PREFIXED",
                number: 1,
              },
              {
                name: "DELIMITED",
                number: 2,
              },
            ],
          },
          {
            name: "JsonFormat",
            value: [
              {
                name: "JSON_FORMAT_UNKNOWN",
                number: 0,
              },
              {
                name: "ALLOW",
                number: 1,
              },
              {
                name: "LEGACY_BEST_EFFORT",
                number: 2,
              },
            ],
          },
          {
            name: "EnforceNamingStyle",
            value: [
              {
                name: "ENFORCE_NAMING_STYLE_UNKNOWN",
                number: 0,
              },
              {
                name: "STYLE2024",
                number: 1,
              },
              {
                name: "STYLE_LEGACY",
                number: 2,
              },
            ],
          },
        ],
        extensionRange: [
          {
            start: 1000,
            end: 9995,
          },
          {
            start: 9995,
            end: 1e4,
          },
          {
            start: 1e4,
            end: 10001,
          },
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
          {
            name: "minimum_edition",
            number: 4,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.Edition",
          },
          {
            name: "maximum_edition",
            number: 5,
            type: 14,
            label: 1,
            typeName: ".google.protobuf.Edition",
          },
        ],
        nestedType: [
          {
            name: "FeatureSetEditionDefault",
            field: [
              {
                name: "edition",
                number: 3,
                type: 14,
                label: 1,
                typeName: ".google.protobuf.Edition",
              },
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
              {
                name: "path",
                number: 1,
                type: 5,
                label: 3,
                options: {
                  packed: true,
                },
              },
              {
                name: "span",
                number: 2,
                type: 5,
                label: 3,
                options: {
                  packed: true,
                },
              },
              {
                name: "leading_comments",
                number: 3,
                type: 9,
                label: 1,
              },
              {
                name: "trailing_comments",
                number: 4,
                type: 9,
                label: 1,
              },
              {
                name: "leading_detached_comments",
                number: 6,
                type: 9,
                label: 3,
              },
            ],
          },
        ],
        extensionRange: [
          {
            start: 536000000,
            end: 536000001,
          },
        ],
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
              {
                name: "path",
                number: 1,
                type: 5,
                label: 3,
                options: {
                  packed: true,
                },
              },
              {
                name: "source_file",
                number: 2,
                type: 9,
                label: 1,
              },
              {
                name: "begin",
                number: 3,
                type: 5,
                label: 1,
              },
              {
                name: "end",
                number: 4,
                type: 5,
                label: 1,
              },
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
                  {
                    name: "NONE",
                    number: 0,
                  },
                  {
                    name: "SET",
                    number: 1,
                  },
                  {
                    name: "ALIAS",
                    number: 2,
                  },
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
          {
            name: "EDITION_UNKNOWN",
            number: 0,
          },
          {
            name: "EDITION_LEGACY",
            number: 900,
          },
          {
            name: "EDITION_PROTO2",
            number: 998,
          },
          {
            name: "EDITION_PROTO3",
            number: 999,
          },
          {
            name: "EDITION_2023",
            number: 1000,
          },
          {
            name: "EDITION_2024",
            number: 1001,
          },
          {
            name: "EDITION_UNSTABLE",
            number: 9999,
          },
          {
            name: "EDITION_1_TEST_ONLY",
            number: 1,
          },
          {
            name: "EDITION_2_TEST_ONLY",
            number: 2,
          },
          {
            name: "EDITION_99997_TEST_ONLY",
            number: 99997,
          },
          {
            name: "EDITION_99998_TEST_ONLY",
            number: 99998,
          },
          {
            name: "EDITION_99999_TEST_ONLY",
            number: 99999,
          },
          {
            name: "EDITION_MAX",
            number: 2147483647,
          },
        ],
      },
      {
        name: "SymbolVisibility",
        value: [
          {
            name: "VISIBILITY_UNSET",
            number: 0,
          },
          {
            name: "VISIBILITY_LOCAL",
            number: 1,
          },
          {
            name: "VISIBILITY_EXPORT",
            number: 2,
          },
        ],
      },
    ],
  });
  cjsExports.FileDescriptorSetSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    0,
  );
  cjsExports.FileDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    1,
  );
  cjsExports.DescriptorProtoSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 2);
  cjsExports.DescriptorProto_ExtensionRangeSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    2,
    0,
  );
  cjsExports.DescriptorProto_ReservedRangeSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    2,
    1,
  );
  cjsExports.ExtensionRangeOptionsSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    3,
  );
  cjsExports.ExtensionRangeOptions_DeclarationSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    3,
    0,
  );
  var ExtensionRangeOptions_VerificationState;
  (function (ExtensionRangeOptions_VerificationState) {
    ExtensionRangeOptions_VerificationState[(ExtensionRangeOptions_VerificationState.DECLARATION = 0)] =
      "DECLARATION";
    ExtensionRangeOptions_VerificationState[(ExtensionRangeOptions_VerificationState.UNVERIFIED = 1)] =
      "UNVERIFIED";
  })(
    ExtensionRangeOptions_VerificationState ||
      (cjsExports.ExtensionRangeOptions_VerificationState = ExtensionRangeOptions_VerificationState = {}),
  );
  cjsExports.ExtensionRangeOptions_VerificationStateSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    3,
    0,
  );
  cjsExports.FieldDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    4,
  );
  var FieldDescriptorProto_Type;
  (function (FieldDescriptorProto_Type) {
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.DOUBLE = 1)] = "DOUBLE";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.FLOAT = 2)] = "FLOAT";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.INT64 = 3)] = "INT64";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.UINT64 = 4)] = "UINT64";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.INT32 = 5)] = "INT32";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.FIXED64 = 6)] = "FIXED64";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.FIXED32 = 7)] = "FIXED32";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.BOOL = 8)] = "BOOL";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.STRING = 9)] = "STRING";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.GROUP = 10)] = "GROUP";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.MESSAGE = 11)] = "MESSAGE";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.BYTES = 12)] = "BYTES";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.UINT32 = 13)] = "UINT32";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.ENUM = 14)] = "ENUM";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.SFIXED32 = 15)] = "SFIXED32";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.SFIXED64 = 16)] = "SFIXED64";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.SINT32 = 17)] = "SINT32";
    FieldDescriptorProto_Type[(FieldDescriptorProto_Type.SINT64 = 18)] = "SINT64";
  })(FieldDescriptorProto_Type || (cjsExports.FieldDescriptorProto_Type = FieldDescriptorProto_Type = {}));
  cjsExports.FieldDescriptorProto_TypeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    4,
    0,
  );
  var FieldDescriptorProto_Label;
  (function (FieldDescriptorProto_Label) {
    FieldDescriptorProto_Label[(FieldDescriptorProto_Label.OPTIONAL = 1)] = "OPTIONAL";
    FieldDescriptorProto_Label[(FieldDescriptorProto_Label.REPEATED = 3)] = "REPEATED";
    FieldDescriptorProto_Label[(FieldDescriptorProto_Label.REQUIRED = 2)] = "REQUIRED";
  })(FieldDescriptorProto_Label || (cjsExports.FieldDescriptorProto_Label = FieldDescriptorProto_Label = {}));
  cjsExports.FieldDescriptorProto_LabelSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    4,
    1,
  );
  cjsExports.OneofDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    5,
  );
  cjsExports.EnumDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    6,
  );
  cjsExports.EnumDescriptorProto_EnumReservedRangeSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    6,
    0,
  );
  cjsExports.EnumValueDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    7,
  );
  cjsExports.ServiceDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    8,
  );
  cjsExports.MethodDescriptorProtoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    9,
  );
  cjsExports.FileOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 10);
  var FileOptions_OptimizeMode;
  (function (FileOptions_OptimizeMode) {
    FileOptions_OptimizeMode[(FileOptions_OptimizeMode.SPEED = 1)] = "SPEED";
    FileOptions_OptimizeMode[(FileOptions_OptimizeMode.CODE_SIZE = 2)] = "CODE_SIZE";
    FileOptions_OptimizeMode[(FileOptions_OptimizeMode.LITE_RUNTIME = 3)] = "LITE_RUNTIME";
  })(FileOptions_OptimizeMode || (cjsExports.FileOptions_OptimizeMode = FileOptions_OptimizeMode = {}));
  cjsExports.FileOptions_OptimizeModeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    10,
    0,
  );
  cjsExports.MessageOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 11);
  cjsExports.FieldOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 12);
  cjsExports.FieldOptions_EditionDefaultSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    12,
    0,
  );
  cjsExports.FieldOptions_FeatureSupportSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    12,
    1,
  );
  var FieldOptions_CType;
  (function (FieldOptions_CType) {
    FieldOptions_CType[(FieldOptions_CType.STRING = 0)] = "STRING";
    FieldOptions_CType[(FieldOptions_CType.CORD = 1)] = "CORD";
    FieldOptions_CType[(FieldOptions_CType.STRING_PIECE = 2)] = "STRING_PIECE";
  })(FieldOptions_CType || (cjsExports.FieldOptions_CType = FieldOptions_CType = {}));
  cjsExports.FieldOptions_CTypeSchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_descriptor, 12, 0);
  var FieldOptions_JSType;
  (function (FieldOptions_JSType) {
    FieldOptions_JSType[(FieldOptions_JSType.JS_NORMAL = 0)] = "JS_NORMAL";
    FieldOptions_JSType[(FieldOptions_JSType.JS_STRING = 1)] = "JS_STRING";
    FieldOptions_JSType[(FieldOptions_JSType.JS_NUMBER = 2)] = "JS_NUMBER";
  })(FieldOptions_JSType || (cjsExports.FieldOptions_JSType = FieldOptions_JSType = {}));
  cjsExports.FieldOptions_JSTypeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    12,
    1,
  );
  var FieldOptions_OptionRetention;
  (function (FieldOptions_OptionRetention) {
    FieldOptions_OptionRetention[(FieldOptions_OptionRetention.RETENTION_UNKNOWN = 0)] = "RETENTION_UNKNOWN";
    FieldOptions_OptionRetention[(FieldOptions_OptionRetention.RETENTION_RUNTIME = 1)] = "RETENTION_RUNTIME";
    FieldOptions_OptionRetention[(FieldOptions_OptionRetention.RETENTION_SOURCE = 2)] = "RETENTION_SOURCE";
  })(
    FieldOptions_OptionRetention ||
      (cjsExports.FieldOptions_OptionRetention = FieldOptions_OptionRetention = {}),
  );
  cjsExports.FieldOptions_OptionRetentionSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    12,
    2,
  );
  var FieldOptions_OptionTargetType;
  (function (FieldOptions_OptionTargetType) {
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_UNKNOWN = 0)] =
      "TARGET_TYPE_UNKNOWN";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_FILE = 1)] = "TARGET_TYPE_FILE";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_EXTENSION_RANGE = 2)] =
      "TARGET_TYPE_EXTENSION_RANGE";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_MESSAGE = 3)] =
      "TARGET_TYPE_MESSAGE";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_FIELD = 4)] =
      "TARGET_TYPE_FIELD";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_ONEOF = 5)] =
      "TARGET_TYPE_ONEOF";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_ENUM = 6)] = "TARGET_TYPE_ENUM";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_ENUM_ENTRY = 7)] =
      "TARGET_TYPE_ENUM_ENTRY";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_SERVICE = 8)] =
      "TARGET_TYPE_SERVICE";
    FieldOptions_OptionTargetType[(FieldOptions_OptionTargetType.TARGET_TYPE_METHOD = 9)] =
      "TARGET_TYPE_METHOD";
  })(
    FieldOptions_OptionTargetType ||
      (cjsExports.FieldOptions_OptionTargetType = FieldOptions_OptionTargetType = {}),
  );
  cjsExports.FieldOptions_OptionTargetTypeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    12,
    3,
  );
  cjsExports.OneofOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 13);
  cjsExports.EnumOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 14);
  cjsExports.EnumValueOptionsSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    15,
  );
  cjsExports.ServiceOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 16);
  cjsExports.MethodOptionsSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 17);
  var MethodOptions_IdempotencyLevel;
  (function (MethodOptions_IdempotencyLevel) {
    MethodOptions_IdempotencyLevel[(MethodOptions_IdempotencyLevel.IDEMPOTENCY_UNKNOWN = 0)] =
      "IDEMPOTENCY_UNKNOWN";
    MethodOptions_IdempotencyLevel[(MethodOptions_IdempotencyLevel.NO_SIDE_EFFECTS = 1)] = "NO_SIDE_EFFECTS";
    MethodOptions_IdempotencyLevel[(MethodOptions_IdempotencyLevel.IDEMPOTENT = 2)] = "IDEMPOTENT";
  })(
    MethodOptions_IdempotencyLevel ||
      (cjsExports.MethodOptions_IdempotencyLevel = MethodOptions_IdempotencyLevel = {}),
  );
  cjsExports.MethodOptions_IdempotencyLevelSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    17,
    0,
  );
  cjsExports.UninterpretedOptionSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    18,
  );
  cjsExports.UninterpretedOption_NamePartSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    18,
    0,
  );
  cjsExports.FeatureSetSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 19);
  cjsExports.FeatureSet_VisibilityFeatureSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    0,
  );
  var FeatureSet_VisibilityFeature_DefaultSymbolVisibility;
  (function (FeatureSet_VisibilityFeature_DefaultSymbolVisibility) {
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility[
      (FeatureSet_VisibilityFeature_DefaultSymbolVisibility.DEFAULT_SYMBOL_VISIBILITY_UNKNOWN = 0)
    ] = "DEFAULT_SYMBOL_VISIBILITY_UNKNOWN";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility[
      (FeatureSet_VisibilityFeature_DefaultSymbolVisibility.EXPORT_ALL = 1)
    ] = "EXPORT_ALL";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility[
      (FeatureSet_VisibilityFeature_DefaultSymbolVisibility.EXPORT_TOP_LEVEL = 2)
    ] = "EXPORT_TOP_LEVEL";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility[
      (FeatureSet_VisibilityFeature_DefaultSymbolVisibility.LOCAL_ALL = 3)
    ] = "LOCAL_ALL";
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility[
      (FeatureSet_VisibilityFeature_DefaultSymbolVisibility.STRICT = 4)
    ] = "STRICT";
  })(
    FeatureSet_VisibilityFeature_DefaultSymbolVisibility ||
      (cjsExports.FeatureSet_VisibilityFeature_DefaultSymbolVisibility =
        FeatureSet_VisibilityFeature_DefaultSymbolVisibility =
          {}),
  );
  cjsExports.FeatureSet_VisibilityFeature_DefaultSymbolVisibilitySchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    0,
    0,
  );
  var FeatureSet_FieldPresence;
  (function (FeatureSet_FieldPresence) {
    FeatureSet_FieldPresence[(FeatureSet_FieldPresence.FIELD_PRESENCE_UNKNOWN = 0)] =
      "FIELD_PRESENCE_UNKNOWN";
    FeatureSet_FieldPresence[(FeatureSet_FieldPresence.EXPLICIT = 1)] = "EXPLICIT";
    FeatureSet_FieldPresence[(FeatureSet_FieldPresence.IMPLICIT = 2)] = "IMPLICIT";
    FeatureSet_FieldPresence[(FeatureSet_FieldPresence.LEGACY_REQUIRED = 3)] = "LEGACY_REQUIRED";
  })(FeatureSet_FieldPresence || (cjsExports.FeatureSet_FieldPresence = FeatureSet_FieldPresence = {}));
  cjsExports.FeatureSet_FieldPresenceSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    0,
  );
  var FeatureSet_EnumType;
  (function (FeatureSet_EnumType) {
    FeatureSet_EnumType[(FeatureSet_EnumType.ENUM_TYPE_UNKNOWN = 0)] = "ENUM_TYPE_UNKNOWN";
    FeatureSet_EnumType[(FeatureSet_EnumType.OPEN = 1)] = "OPEN";
    FeatureSet_EnumType[(FeatureSet_EnumType.CLOSED = 2)] = "CLOSED";
  })(FeatureSet_EnumType || (cjsExports.FeatureSet_EnumType = FeatureSet_EnumType = {}));
  cjsExports.FeatureSet_EnumTypeSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    1,
  );
  var FeatureSet_RepeatedFieldEncoding;
  (function (FeatureSet_RepeatedFieldEncoding) {
    FeatureSet_RepeatedFieldEncoding[(FeatureSet_RepeatedFieldEncoding.REPEATED_FIELD_ENCODING_UNKNOWN = 0)] =
      "REPEATED_FIELD_ENCODING_UNKNOWN";
    FeatureSet_RepeatedFieldEncoding[(FeatureSet_RepeatedFieldEncoding.PACKED = 1)] = "PACKED";
    FeatureSet_RepeatedFieldEncoding[(FeatureSet_RepeatedFieldEncoding.EXPANDED = 2)] = "EXPANDED";
  })(
    FeatureSet_RepeatedFieldEncoding ||
      (cjsExports.FeatureSet_RepeatedFieldEncoding = FeatureSet_RepeatedFieldEncoding = {}),
  );
  cjsExports.FeatureSet_RepeatedFieldEncodingSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    2,
  );
  var FeatureSet_Utf8Validation;
  (function (FeatureSet_Utf8Validation) {
    FeatureSet_Utf8Validation[(FeatureSet_Utf8Validation.UTF8_VALIDATION_UNKNOWN = 0)] =
      "UTF8_VALIDATION_UNKNOWN";
    FeatureSet_Utf8Validation[(FeatureSet_Utf8Validation.VERIFY = 2)] = "VERIFY";
    FeatureSet_Utf8Validation[(FeatureSet_Utf8Validation.NONE = 3)] = "NONE";
  })(FeatureSet_Utf8Validation || (cjsExports.FeatureSet_Utf8Validation = FeatureSet_Utf8Validation = {}));
  cjsExports.FeatureSet_Utf8ValidationSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    3,
  );
  var FeatureSet_MessageEncoding;
  (function (FeatureSet_MessageEncoding) {
    FeatureSet_MessageEncoding[(FeatureSet_MessageEncoding.MESSAGE_ENCODING_UNKNOWN = 0)] =
      "MESSAGE_ENCODING_UNKNOWN";
    FeatureSet_MessageEncoding[(FeatureSet_MessageEncoding.LENGTH_PREFIXED = 1)] = "LENGTH_PREFIXED";
    FeatureSet_MessageEncoding[(FeatureSet_MessageEncoding.DELIMITED = 2)] = "DELIMITED";
  })(FeatureSet_MessageEncoding || (cjsExports.FeatureSet_MessageEncoding = FeatureSet_MessageEncoding = {}));
  cjsExports.FeatureSet_MessageEncodingSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    4,
  );
  var FeatureSet_JsonFormat;
  (function (FeatureSet_JsonFormat) {
    FeatureSet_JsonFormat[(FeatureSet_JsonFormat.JSON_FORMAT_UNKNOWN = 0)] = "JSON_FORMAT_UNKNOWN";
    FeatureSet_JsonFormat[(FeatureSet_JsonFormat.ALLOW = 1)] = "ALLOW";
    FeatureSet_JsonFormat[(FeatureSet_JsonFormat.LEGACY_BEST_EFFORT = 2)] = "LEGACY_BEST_EFFORT";
  })(FeatureSet_JsonFormat || (cjsExports.FeatureSet_JsonFormat = FeatureSet_JsonFormat = {}));
  cjsExports.FeatureSet_JsonFormatSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    5,
  );
  var FeatureSet_EnforceNamingStyle;
  (function (FeatureSet_EnforceNamingStyle) {
    FeatureSet_EnforceNamingStyle[(FeatureSet_EnforceNamingStyle.ENFORCE_NAMING_STYLE_UNKNOWN = 0)] =
      "ENFORCE_NAMING_STYLE_UNKNOWN";
    FeatureSet_EnforceNamingStyle[(FeatureSet_EnforceNamingStyle.STYLE2024 = 1)] = "STYLE2024";
    FeatureSet_EnforceNamingStyle[(FeatureSet_EnforceNamingStyle.STYLE_LEGACY = 2)] = "STYLE_LEGACY";
  })(
    FeatureSet_EnforceNamingStyle ||
      (cjsExports.FeatureSet_EnforceNamingStyle = FeatureSet_EnforceNamingStyle = {}),
  );
  cjsExports.FeatureSet_EnforceNamingStyleSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    19,
    6,
  );
  cjsExports.FeatureSetDefaultsSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    20,
  );
  cjsExports.FeatureSetDefaults_FeatureSetEditionDefaultSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    20,
    0,
  );
  cjsExports.SourceCodeInfoSchema = message_js_1.messageDesc(cjsExports.file_google_protobuf_descriptor, 21);
  cjsExports.SourceCodeInfo_LocationSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    21,
    0,
  );
  cjsExports.GeneratedCodeInfoSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    22,
  );
  cjsExports.GeneratedCodeInfo_AnnotationSchema = message_js_1.messageDesc(
    cjsExports.file_google_protobuf_descriptor,
    22,
    0,
  );
  var GeneratedCodeInfo_Annotation_Semantic;
  (function (GeneratedCodeInfo_Annotation_Semantic) {
    GeneratedCodeInfo_Annotation_Semantic[(GeneratedCodeInfo_Annotation_Semantic.NONE = 0)] = "NONE";
    GeneratedCodeInfo_Annotation_Semantic[(GeneratedCodeInfo_Annotation_Semantic.SET = 1)] = "SET";
    GeneratedCodeInfo_Annotation_Semantic[(GeneratedCodeInfo_Annotation_Semantic.ALIAS = 2)] = "ALIAS";
  })(
    GeneratedCodeInfo_Annotation_Semantic ||
      (cjsExports.GeneratedCodeInfo_Annotation_Semantic = GeneratedCodeInfo_Annotation_Semantic = {}),
  );
  cjsExports.GeneratedCodeInfo_Annotation_SemanticSchema = enum_js_1.enumDesc(
    cjsExports.file_google_protobuf_descriptor,
    22,
    0,
    0,
  );
  var Edition;
  (function (Edition) {
    Edition[(Edition.EDITION_UNKNOWN = 0)] = "EDITION_UNKNOWN";
    Edition[(Edition.EDITION_LEGACY = 900)] = "EDITION_LEGACY";
    Edition[(Edition.EDITION_PROTO2 = 998)] = "EDITION_PROTO2";
    Edition[(Edition.EDITION_PROTO3 = 999)] = "EDITION_PROTO3";
    Edition[(Edition.EDITION_2023 = 1000)] = "EDITION_2023";
    Edition[(Edition.EDITION_2024 = 1001)] = "EDITION_2024";
    Edition[(Edition.EDITION_UNSTABLE = 9999)] = "EDITION_UNSTABLE";
    Edition[(Edition.EDITION_1_TEST_ONLY = 1)] = "EDITION_1_TEST_ONLY";
    Edition[(Edition.EDITION_2_TEST_ONLY = 2)] = "EDITION_2_TEST_ONLY";
    Edition[(Edition.EDITION_99997_TEST_ONLY = 99997)] = "EDITION_99997_TEST_ONLY";
    Edition[(Edition.EDITION_99998_TEST_ONLY = 99998)] = "EDITION_99998_TEST_ONLY";
    Edition[(Edition.EDITION_99999_TEST_ONLY = 99999)] = "EDITION_99999_TEST_ONLY";
    Edition[(Edition.EDITION_MAX = 2147483647)] = "EDITION_MAX";
  })(Edition || (cjsExports.Edition = Edition = {}));
  cjsExports.EditionSchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_descriptor, 0);
  var SymbolVisibility;
  (function (SymbolVisibility) {
    SymbolVisibility[(SymbolVisibility.VISIBILITY_UNSET = 0)] = "VISIBILITY_UNSET";
    SymbolVisibility[(SymbolVisibility.VISIBILITY_LOCAL = 1)] = "VISIBILITY_LOCAL";
    SymbolVisibility[(SymbolVisibility.VISIBILITY_EXPORT = 2)] = "VISIBILITY_EXPORT";
  })(SymbolVisibility || (cjsExports.SymbolVisibility = SymbolVisibility = {}));
  cjsExports.SymbolVisibilitySchema = enum_js_1.enumDesc(cjsExports.file_google_protobuf_descriptor, 1);
});
export { require_descriptor_pb };
