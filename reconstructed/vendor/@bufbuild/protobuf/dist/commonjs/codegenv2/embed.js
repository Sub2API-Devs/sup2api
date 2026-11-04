/**
 * @bufbuild/protobuf/dist/commonjs/codegenv2/embed.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_names } from "../../cjs/reflect/names.js";
import { require_fields } from "../fields.js";
import { require_base64_encoding } from "../../cjs/wire/base64-encoding.js";
import { require_to_binary } from "../../cjs/to-binary.js";
import { require_clone } from "../clone.js";
import { require_descriptor_pb } from "../wkt/gen/google/protobuf/descriptor_pb.js";

//@ chunk-fq0cr76a.js:510775-515173 cjs-fingerprint
var require_embed = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.embedFileDesc = embedFileDesc;
  cjsExports.pathInFileDesc = pathInFileDesc;
  cjsExports.createFileDescriptorProtoBoot = createFileDescriptorProtoBoot;
  var names_js_1 = require_names();
  var fields_js_1 = require_fields();
  var base64_encoding_js_1 = require_base64_encoding();
  var to_binary_js_1 = require_to_binary();
  var clone_js_1 = require_clone();
  var descriptor_pb_js_1 = require_descriptor_pb();
  function embedFileDesc(file) {
    let embed = {
      bootable: false,
      proto() {
        let stripped = clone_js_1.clone(descriptor_pb_js_1.FileDescriptorProtoSchema, file);
        fields_js_1.clearField(stripped, descriptor_pb_js_1.FileDescriptorProtoSchema.field.dependency);
        fields_js_1.clearField(stripped, descriptor_pb_js_1.FileDescriptorProtoSchema.field.sourceCodeInfo);
        stripped.messageType.map(stripJsonNames);
        return stripped;
      },
      base64() {
        let bytes = to_binary_js_1.toBinary(descriptor_pb_js_1.FileDescriptorProtoSchema, this.proto());
        return base64_encoding_js_1.base64Encode(bytes, "std_raw");
      },
    };
    return file.name == "google/protobuf/descriptor.proto"
      ? Object.assign(Object.assign({}, embed), {
          bootable: true,
          boot() {
            return createFileDescriptorProtoBoot(this.proto());
          },
        })
      : embed;
  }
  function stripJsonNames(d) {
    for (let f of d.field)
      if (f.jsonName === names_js_1.protoCamelCase(f.name))
        fields_js_1.clearField(f, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.jsonName);
    for (let nested of d.nestedType) stripJsonNames(nested);
  }
  function pathInFileDesc(desc) {
    if (desc.kind == "service") return [desc.file.services.indexOf(desc)];
    let parent = desc.parent;
    if (parent == null)
      switch (desc.kind) {
        case "enum":
          return [desc.file.enums.indexOf(desc)];
        case "message":
          return [desc.file.messages.indexOf(desc)];
        case "extension":
          return [desc.file.extensions.indexOf(desc)];
      }
    function findPath(cur) {
      let nested = [];
      for (let parent = cur.parent; parent;) {
        let idx = parent.nestedMessages.indexOf(cur);
        nested.unshift(idx);
        cur = parent;
        parent = cur.parent;
      }
      nested.unshift(cur.file.messages.indexOf(cur));
      return nested;
    }
    let path = findPath(parent);
    switch (desc.kind) {
      case "extension":
        return [...path, parent.nestedExtensions.indexOf(desc)];
      case "message":
        return [...path, parent.nestedMessages.indexOf(desc)];
      case "enum":
        return [...path, parent.nestedEnums.indexOf(desc)];
    }
  }
  function createFileDescriptorProtoBoot(proto) {
    var _a;
    assert(proto.name == "google/protobuf/descriptor.proto");
    assert(proto.package == "google.protobuf");
    assert(!proto.dependency.length);
    assert(!proto.publicDependency.length);
    assert(!proto.weakDependency.length);
    assert(!proto.optionDependency.length);
    assert(!proto.service.length);
    assert(!proto.extension.length);
    assert(proto.sourceCodeInfo === undefined);
    assert(proto.syntax == "" || proto.syntax == "proto2");
    assert(!((_a = proto.options) === null || _a === undefined ? undefined : _a.features));
    assert(proto.edition === descriptor_pb_js_1.Edition.EDITION_UNKNOWN);
    return {
      name: proto.name,
      package: proto.package,
      messageType: proto.messageType.map(createDescriptorBoot),
      enumType: proto.enumType.map(createEnumDescriptorBoot),
    };
  }
  function createDescriptorBoot(proto) {
    assert(proto.extension.length == 0);
    assert(!proto.oneofDecl.length);
    assert(!proto.options);
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.DescriptorProtoSchema.field.visibility));
    let b = {
      name: proto.name,
    };
    if (proto.field.length) b.field = proto.field.map(createFieldDescriptorBoot);
    if (proto.nestedType.length) b.nestedType = proto.nestedType.map(createDescriptorBoot);
    if (proto.enumType.length) b.enumType = proto.enumType.map(createEnumDescriptorBoot);
    if (proto.extensionRange.length)
      b.extensionRange = proto.extensionRange.map((range) => {
        assert(!range.options);
        return {
          start: range.start,
          end: range.end,
        };
      });
    return b;
  }
  function createFieldDescriptorBoot(proto) {
    assert(fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.name));
    assert(fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.number));
    assert(fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.type));
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.oneofIndex));
    assert(
      !fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.jsonName) ||
        proto.jsonName === names_js_1.protoCamelCase(proto.name),
    );
    let b = {
      name: proto.name,
      number: proto.number,
      type: proto.type,
    };
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.label))
      b.label = proto.label;
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.typeName))
      b.typeName = proto.typeName;
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.extendee))
      b.extendee = proto.extendee;
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldDescriptorProtoSchema.field.defaultValue))
      b.defaultValue = proto.defaultValue;
    if (proto.options) b.options = createFieldOptionsBoot(proto.options);
    return b;
  }
  function createFieldOptionsBoot(proto) {
    let b = {};
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.ctype));
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.packed))
      b.packed = proto.packed;
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.jstype));
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.lazy));
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.unverifiedLazy));
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.deprecated))
      b.deprecated = proto.deprecated;
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.weak));
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.debugRedact));
    if (fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.retention))
      b.retention = proto.retention;
    if (proto.targets.length) b.targets = proto.targets;
    if (proto.editionDefaults.length)
      b.editionDefaults = proto.editionDefaults.map((d) => ({
        value: d.value,
        edition: d.edition,
      }));
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.features));
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.FieldOptionsSchema.field.uninterpretedOption));
    return b;
  }
  function createEnumDescriptorBoot(proto) {
    assert(!proto.options);
    assert(!fields_js_1.isFieldSet(proto, descriptor_pb_js_1.EnumDescriptorProtoSchema.field.visibility));
    return {
      name: proto.name,
      value: proto.value.map((v) => {
        assert(!v.options);
        return {
          name: v.name,
          number: v.number,
        };
      }),
    };
  }
  function assert(condition) {
    if (!condition) throw Error();
  }
});
export { require_embed };
