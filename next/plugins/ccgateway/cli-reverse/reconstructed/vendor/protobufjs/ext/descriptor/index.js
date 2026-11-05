/**
 * protobufjs/ext/descriptor/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_protobufjs } from "../../src/index.js";
import { require_descriptor } from "../../google/protobuf/descriptor.json.js";

//@ chunk-3k21nfa0.js:156548-168464 cjs-fingerprint
var require_descriptor_2 = __commonJS(function (cjsExports, cjsModule) {
  var $protobuf = require_protobufjs();
  cjsModule.exports =
    cjsExports =
    $protobuf.descriptor =
      $protobuf.Root.fromJSON(require_descriptor()).lookup(".google.protobuf");
  var { Namespace, Root, Enum, Type, Field, MapField, OneOf, Service, Method } = $protobuf;
  var patterns = $protobuf.util.patterns;
  var { numberRe, typeRefRe } = patterns;
  Root.fromDescriptor = function (descriptor) {
    if (typeof descriptor.length === "number") descriptor = cjsExports.FileDescriptorSet.decode(descriptor);
    var root = new Root();
    if (descriptor.file) {
      var fileDescriptor;
      var filePackage;
      for (var j = 0, i; j < descriptor.file.length; ++j) {
        filePackage = root;
        if ((fileDescriptor = descriptor.file[j]).package && fileDescriptor.package.length)
          filePackage = root.define(fileDescriptor.package);
        var edition = editionFromDescriptor(fileDescriptor);
        if (fileDescriptor.name && fileDescriptor.name.length)
          root.files.push((filePackage.filename = fileDescriptor.name));
        if (fileDescriptor.messageType)
          for (i = 0; i < fileDescriptor.messageType.length; ++i)
            filePackage.add(Type.fromDescriptor(fileDescriptor.messageType[i], edition));
        if (fileDescriptor.enumType)
          for (i = 0; i < fileDescriptor.enumType.length; ++i)
            filePackage.add(Enum.fromDescriptor(fileDescriptor.enumType[i], edition));
        if (fileDescriptor.extension)
          for (i = 0; i < fileDescriptor.extension.length; ++i)
            filePackage.add(Field.fromDescriptor(fileDescriptor.extension[i], edition));
        if (fileDescriptor.service)
          for (i = 0; i < fileDescriptor.service.length; ++i)
            filePackage.add(Service.fromDescriptor(fileDescriptor.service[i], edition));
        var opts = fromDescriptorOptions(fileDescriptor.options, cjsExports.FileOptions);
        if (opts) {
          var ks = Object.keys(opts);
          for (i = 0; i < ks.length; ++i) filePackage.setOption(ks[i], opts[ks[i]]);
        }
      }
    }
    return root.resolveAll();
  };
  Root.prototype.toDescriptor = function (edition) {
    var set = cjsExports.FileDescriptorSet.create();
    Root_toDescriptorRecursive(this, set.file, edition);
    return set;
  };
  function Root_toDescriptorRecursive(ns, files, edition) {
    var file = cjsExports.FileDescriptorProto.create({
      name: ns.filename || (ns.fullName.substring(1).replace(/\./g, "_") || "root") + ".proto",
    });
    editionToDescriptor(edition, file);
    if (!(ns instanceof Root)) file.package = ns.fullName.substring(1);
    for (var i = 0, nested; i < ns.nestedArray.length; ++i)
      if ((nested = ns._nestedArray[i]) instanceof Type) file.messageType.push(nested.toDescriptor(edition));
      else if (nested instanceof Enum) file.enumType.push(nested.toDescriptor());
      else if (nested instanceof Field) file.extension.push(nested.toDescriptor(edition));
      else if (nested instanceof Service) file.service.push(nested.toDescriptor());
      else if (nested instanceof Namespace) Root_toDescriptorRecursive(nested, files, edition);
    file.options = toDescriptorOptions(ns.options, cjsExports.FileOptions);
    if (file.messageType.length + file.enumType.length + file.extension.length + file.service.length)
      files.push(file);
  }
  var unnamedMessageIndex = 0;
  Type.fromDescriptor = function (descriptor, edition, nested) {
    if (typeof descriptor.length === "number") descriptor = cjsExports.DescriptorProto.decode(descriptor);
    var type = new Type(
      descriptor.name.length ? descriptor.name : "Type" + unnamedMessageIndex++,
      fromDescriptorOptions(descriptor.options, cjsExports.MessageOptions),
    );
    var i;
    if (!nested) type._edition = edition;
    if (descriptor.oneofDecl)
      for (i = 0; i < descriptor.oneofDecl.length; ++i)
        type.add(OneOf.fromDescriptor(descriptor.oneofDecl[i]));
    if (descriptor.field)
      for (i = 0; i < descriptor.field.length; ++i) {
        var field = Field.fromDescriptor(descriptor.field[i], edition, true);
        type.add(field);
        if (descriptor.field[i].hasOwnProperty("oneofIndex"))
          type.oneofsArray[descriptor.field[i].oneofIndex].add(field);
      }
    if (descriptor.extension)
      for (i = 0; i < descriptor.extension.length; ++i)
        type.add(Field.fromDescriptor(descriptor.extension[i], edition, true));
    if (descriptor.nestedType) {
      for (i = 0; i < descriptor.nestedType.length; ++i) {
        type.add(Type.fromDescriptor(descriptor.nestedType[i], edition, true));
        if (descriptor.nestedType[i].options && descriptor.nestedType[i].options.mapEntry)
          type.setOption("map_entry", true);
      }
    }
    if (descriptor.enumType)
      for (i = 0; i < descriptor.enumType.length; ++i)
        type.add(Enum.fromDescriptor(descriptor.enumType[i], edition, true));
    if (descriptor.extensionRange && descriptor.extensionRange.length) {
      type.extensions = [];
      for (i = 0; i < descriptor.extensionRange.length; ++i)
        type.extensions.push([descriptor.extensionRange[i].start, descriptor.extensionRange[i].end]);
    }
    if (
      (descriptor.reservedRange && descriptor.reservedRange.length) ||
      (descriptor.reservedName && descriptor.reservedName.length)
    ) {
      type.reserved = [];
      if (descriptor.reservedRange)
        for (i = 0; i < descriptor.reservedRange.length; ++i)
          type.reserved.push([descriptor.reservedRange[i].start, descriptor.reservedRange[i].end]);
      if (descriptor.reservedName)
        for (i = 0; i < descriptor.reservedName.length; ++i) type.reserved.push(descriptor.reservedName[i]);
    }
    return type;
  };
  Type.prototype.toDescriptor = function (edition) {
    var descriptor = cjsExports.DescriptorProto.create({
      name: this.name,
    });
    var idx;
    for (idx = 0; idx < this.fieldsArray.length; ++idx) {
      var fieldDescriptor;
      descriptor.field.push((fieldDescriptor = this._fieldsArray[idx].toDescriptor(edition)));
      if (this._fieldsArray[idx] instanceof MapField) {
        var keyType = toDescriptorType(
          this._fieldsArray[idx].keyType,
          this._fieldsArray[idx].resolvedKeyType,
          false,
        );
        var valueType = toDescriptorType(
          this._fieldsArray[idx].type,
          this._fieldsArray[idx].resolvedType,
          false,
        );
        var valueTypeName =
          valueType === 11 || valueType === 14
            ? (this._fieldsArray[idx].resolvedType &&
                shortname(this.parent, this._fieldsArray[idx].resolvedType)) ||
              this._fieldsArray[idx].type
            : undefined;
        descriptor.nestedType.push(
          cjsExports.DescriptorProto.create({
            name: fieldDescriptor.typeName,
            field: [
              cjsExports.FieldDescriptorProto.create({
                name: "key",
                number: 1,
                label: 1,
                type: keyType,
              }),
              cjsExports.FieldDescriptorProto.create({
                name: "value",
                number: 2,
                label: 1,
                type: valueType,
                typeName: valueTypeName,
              }),
            ],
            options: cjsExports.MessageOptions.create({
              mapEntry: true,
            }),
          }),
        );
      }
    }
    for (idx = 0; idx < this.oneofsArray.length; ++idx)
      descriptor.oneofDecl.push(this._oneofsArray[idx].toDescriptor());
    for (idx = 0; idx < this.nestedArray.length; ++idx)
      if (this._nestedArray[idx] instanceof Field)
        descriptor.field.push(this._nestedArray[idx].toDescriptor(edition));
      else if (this._nestedArray[idx] instanceof Type)
        descriptor.nestedType.push(this._nestedArray[idx].toDescriptor(edition));
      else if (this._nestedArray[idx] instanceof Enum)
        descriptor.enumType.push(this._nestedArray[idx].toDescriptor());
    if (this.extensions)
      for (idx = 0; idx < this.extensions.length; ++idx)
        descriptor.extensionRange.push(
          cjsExports.DescriptorProto.ExtensionRange.create({
            start: this.extensions[idx][0],
            end: this.extensions[idx][1],
          }),
        );
    if (this.reserved)
      for (idx = 0; idx < this.reserved.length; ++idx)
        if (typeof this.reserved[idx] === "string") descriptor.reservedName.push(this.reserved[idx]);
        else
          descriptor.reservedRange.push(
            cjsExports.DescriptorProto.ReservedRange.create({
              start: this.reserved[idx][0],
              end: this.reserved[idx][1],
            }),
          );
    descriptor.options = toDescriptorOptions(this.options, cjsExports.MessageOptions);
    return descriptor;
  };
  Field.fromDescriptor = function (descriptor, edition, nested) {
    if (typeof descriptor.length === "number") descriptor = cjsExports.DescriptorProto.decode(descriptor);
    if (typeof descriptor.number !== "number") throw Error("missing field id");
    var typeName = descriptor.typeName;
    var fieldType;
    if (typeName != null && typeName !== "") {
      if (typeof typeName !== "string" || !typeRefRe.test(typeName))
        throw Error("illegal type name: " + typeName);
      fieldType = typeName;
    } else fieldType = fromDescriptorType(descriptor.type);
    var fieldRule;
    switch (descriptor.label) {
      case 1:
        fieldRule = undefined;
        break;
      case 2:
        fieldRule = "required";
        break;
      case 3:
        fieldRule = "repeated";
        break;
      default:
        throw Error("illegal label: " + descriptor.label);
    }
    var extendee = descriptor.extendee;
    if (extendee != null && extendee !== "") {
      if (typeof extendee !== "string" || !typeRefRe.test(extendee))
        throw Error("illegal type name: " + extendee);
    } else extendee = undefined;
    var field = new Field(
      descriptor.name.length ? descriptor.name : "field" + descriptor.number,
      descriptor.number,
      fieldType,
      fieldRule,
      extendee,
    );
    if (!nested) field._edition = edition;
    field.options = fromDescriptorOptions(descriptor.options, cjsExports.FieldOptions);
    if (descriptor.proto3_optional) field.options.proto3_optional = true;
    if (descriptor.defaultValue && descriptor.defaultValue.length) {
      var defaultValue = descriptor.defaultValue;
      switch (defaultValue) {
        case "true":
        case "TRUE":
          defaultValue = true;
          break;
        case "false":
        case "FALSE":
          defaultValue = false;
          break;
        default:
          var match = numberRe.exec(defaultValue);
          if (match) defaultValue = parseInt(defaultValue);
          break;
      }
      field.setOption("default", defaultValue);
    }
    if (packableDescriptorType(descriptor.type)) {
      if (edition === "proto3") {
        if (descriptor.options && !descriptor.options.packed) field.setOption("packed", false);
      } else if ((!edition || edition === "proto2") && descriptor.options && descriptor.options.packed)
        field.setOption("packed", true);
    }
    return field;
  };
  Field.prototype.toDescriptor = function (edition) {
    var descriptor = cjsExports.FieldDescriptorProto.create({
      name: this.name,
      number: this.id,
    });
    if (this.map) {
      descriptor.type = 11;
      descriptor.typeName = $protobuf.util.ucFirst(this.name);
      descriptor.label = 3;
    } else {
      switch ((descriptor.type = toDescriptorType(this.type, this.resolve().resolvedType, this.delimited))) {
        case 10:
        case 11:
        case 14:
          descriptor.typeName = this.resolvedType ? shortname(this.parent, this.resolvedType) : this.type;
          break;
      }
      if (this.rule === "repeated") descriptor.label = 3;
      else if (this.required && edition === "proto2") descriptor.label = 2;
      else descriptor.label = 1;
    }
    descriptor.extendee = this.extensionField ? this.extensionField.parent.fullName : this.extend;
    if (this.partOf && this.parent instanceof Type) {
      if ((descriptor.oneofIndex = this.parent.oneofsArray.indexOf(this.partOf)) < 0)
        throw Error("missing oneof");
    }
    if (this.options) {
      descriptor.options = toDescriptorOptions(this.options, cjsExports.FieldOptions);
      if (this.options.default != null) descriptor.defaultValue = String(this.options.default);
      if (this.options.proto3_optional) descriptor.proto3_optional = true;
    }
    if (edition === "proto3") {
      if (!this.packed)
        (descriptor.options || (descriptor.options = cjsExports.FieldOptions.create())).packed = false;
    } else if ((!edition || edition === "proto2") && this.packed)
      (descriptor.options || (descriptor.options = cjsExports.FieldOptions.create())).packed = true;
    return descriptor;
  };
  var unnamedEnumIndex = 0;
  Enum.fromDescriptor = function (descriptor, edition, nested) {
    if (typeof descriptor.length === "number") descriptor = cjsExports.EnumDescriptorProto.decode(descriptor);
    var values = {};
    if (descriptor.value)
      for (var i = 0; i < descriptor.value.length; ++i) {
        var name = descriptor.value[i].name;
        var value = descriptor.value[i].number || 0;
        values[name && name.length ? name : "NAME" + value] = value;
      }
    var enm = new Enum(
      descriptor.name && descriptor.name.length ? descriptor.name : "Enum" + unnamedEnumIndex++,
      values,
      fromDescriptorOptions(descriptor.options, cjsExports.EnumOptions),
    );
    if (!nested) enm._edition = edition;
    return enm;
  };
  Enum.prototype.toDescriptor = function () {
    var values = [];
    for (var i_2 = 0, ks = Object.keys(this.values); i_2 < ks.length; ++i_2)
      values.push(
        cjsExports.EnumValueDescriptorProto.create({
          name: ks[i_2],
          number: this.values[ks[i_2]],
        }),
      );
    return cjsExports.EnumDescriptorProto.create({
      name: this.name,
      value: values,
      options: toDescriptorOptions(this.options, cjsExports.EnumOptions),
    });
  };
  var unnamedOneofIndex = 0;
  OneOf.fromDescriptor = function (descriptor) {
    if (typeof descriptor.length === "number")
      descriptor = cjsExports.OneofDescriptorProto.decode(descriptor);
    return new OneOf(
      descriptor.name && descriptor.name.length ? descriptor.name : "oneof" + unnamedOneofIndex++,
    );
  };
  OneOf.prototype.toDescriptor = function () {
    return cjsExports.OneofDescriptorProto.create({
      name: this.name,
    });
  };
  var unnamedServiceIndex = 0;
  Service.fromDescriptor = function (descriptor, edition, nested) {
    if (typeof descriptor.length === "number")
      descriptor = cjsExports.ServiceDescriptorProto.decode(descriptor);
    var service = new Service(
      descriptor.name && descriptor.name.length ? descriptor.name : "Service" + unnamedServiceIndex++,
      fromDescriptorOptions(descriptor.options, cjsExports.ServiceOptions),
    );
    if (!nested) service._edition = edition;
    if (descriptor.method)
      for (var i = 0; i < descriptor.method.length; ++i)
        service.add(Method.fromDescriptor(descriptor.method[i]));
    return service;
  };
  Service.prototype.toDescriptor = function () {
    var methods = [];
    for (var i = 0; i < this.methodsArray.length; ++i) methods.push(this._methodsArray[i].toDescriptor());
    return cjsExports.ServiceDescriptorProto.create({
      name: this.name,
      method: methods,
      options: toDescriptorOptions(this.options, cjsExports.ServiceOptions),
    });
  };
  var unnamedMethodIndex = 0;
  Method.fromDescriptor = function (descriptor) {
    if (typeof descriptor.length === "number")
      descriptor = cjsExports.MethodDescriptorProto.decode(descriptor);
    var inputType = descriptor.inputType;
    var outputType = descriptor.outputType;
    if (inputType != null && inputType !== "") {
      if (typeof inputType !== "string" || !typeRefRe.test(inputType))
        throw Error("illegal type name: " + inputType);
    }
    if (outputType != null && outputType !== "") {
      if (typeof outputType !== "string" || !typeRefRe.test(outputType))
        throw Error("illegal type name: " + outputType);
    }
    return new Method(
      descriptor.name && descriptor.name.length ? descriptor.name : "Method" + unnamedMethodIndex++,
      "rpc",
      inputType,
      outputType,
      Boolean(descriptor.clientStreaming),
      Boolean(descriptor.serverStreaming),
      fromDescriptorOptions(descriptor.options, cjsExports.MethodOptions),
    );
  };
  Method.prototype.toDescriptor = function () {
    return cjsExports.MethodDescriptorProto.create({
      name: this.name,
      inputType: this.resolvedRequestType ? this.resolvedRequestType.fullName : this.requestType,
      outputType: this.resolvedResponseType ? this.resolvedResponseType.fullName : this.responseType,
      clientStreaming: this.requestStream,
      serverStreaming: this.responseStream,
      options: toDescriptorOptions(this.options, cjsExports.MethodOptions),
    });
  };
  function fromDescriptorType(type) {
    switch (type) {
      case 1:
        return "double";
      case 2:
        return "float";
      case 3:
        return "int64";
      case 4:
        return "uint64";
      case 5:
        return "int32";
      case 6:
        return "fixed64";
      case 7:
        return "fixed32";
      case 8:
        return "bool";
      case 9:
        return "string";
      case 12:
        return "bytes";
      case 13:
        return "uint32";
      case 15:
        return "sfixed32";
      case 16:
        return "sfixed64";
      case 17:
        return "sint32";
      case 18:
        return "sint64";
    }
    throw Error("illegal type: " + type);
  }
  function packableDescriptorType(type) {
    switch (type) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 13:
      case 14:
      case 15:
      case 16:
      case 17:
      case 18:
        return true;
    }
    return false;
  }
  function toDescriptorType(type, resolvedType, delimited) {
    switch (type) {
      case "double":
        return 1;
      case "float":
        return 2;
      case "int64":
        return 3;
      case "uint64":
        return 4;
      case "int32":
        return 5;
      case "fixed64":
        return 6;
      case "fixed32":
        return 7;
      case "bool":
        return 8;
      case "string":
        return 9;
      case "bytes":
        return 12;
      case "uint32":
        return 13;
      case "sfixed32":
        return 15;
      case "sfixed64":
        return 16;
      case "sint32":
        return 17;
      case "sint64":
        return 18;
    }
    if (resolvedType instanceof Enum) return 14;
    if (resolvedType instanceof Type) return delimited ? 10 : 11;
    throw Error("illegal type: " + type);
  }
  function fromDescriptorOptionsRecursive(obj, type) {
    var val = {};
    for (var idx = 0, field, key; idx < type.fieldsArray.length; ++idx) {
      if ((key = (field = type._fieldsArray[idx]).name) === "uninterpretedOption") continue;
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;
      var newKey = underScore(key);
      if (field.resolvedType instanceof Type)
        val[newKey] = fromDescriptorOptionsRecursive(obj[key], field.resolvedType);
      else if (field.resolvedType instanceof Enum) val[newKey] = field.resolvedType.valuesById[obj[key]];
      else val[newKey] = obj[key];
    }
    return val;
  }
  function fromDescriptorOptions(options, type) {
    if (!options) return;
    return fromDescriptorOptionsRecursive(type.toObject(options), type);
  }
  function toDescriptorOptionsRecursive(obj, type) {
    var val = {};
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i];
      var newKey = $protobuf.util.camelCase(key);
      if (!Object.prototype.hasOwnProperty.call(type.fields, newKey)) continue;
      var field = type.fields[newKey];
      if (field.resolvedType instanceof Type)
        val[newKey] = toDescriptorOptionsRecursive(obj[key], field.resolvedType);
      else val[newKey] = obj[key];
      if (field.repeated && !Array.isArray(val[newKey])) val[newKey] = [val[newKey]];
    }
    return val;
  }
  function toDescriptorOptions(options, type) {
    if (!options) return;
    return type.fromObject(toDescriptorOptionsRecursive(options, type));
  }
  function shortname(from, to) {
    var fromPath = from.fullName.split(".");
    var toPath = to.fullName.split(".");
    var i = 0;
    var j = 0;
    var k = toPath.length - 1;
    if (!(from instanceof Root) && to instanceof Namespace)
      while (i < fromPath.length && j < k && fromPath[i] === toPath[j]) {
        var other = to.lookup(fromPath[i++], true);
        if (other !== null && other !== to) break;
        ++j;
      }
    else for (; i < fromPath.length && j < k && fromPath[i] === toPath[j]; ++i, ++j);
    return toPath.slice(j).join(".");
  }
  function underScore(str) {
    return (
      str.substring(0, 1) +
      str.substring(1).replace(/([A-Z])(?=[a-z]|$)/g, function ($0, $1) {
        return "_" + $1.toLowerCase();
      })
    );
  }
  function editionFromDescriptor(fileDescriptor) {
    if (fileDescriptor.syntax === "editions")
      switch (fileDescriptor.edition) {
        case cjsExports.Edition.EDITION_2023:
          return "2023";
        default:
          throw Error("Unsupported edition " + fileDescriptor.edition);
      }
    if (fileDescriptor.syntax === "proto3") return "proto3";
    return "proto2";
  }
  function editionToDescriptor(edition, fileDescriptor) {
    if (!edition) return;
    if (edition === "proto2" || edition === "proto3") fileDescriptor.syntax = edition;
    else
      switch (((fileDescriptor.syntax = "editions"), edition)) {
        case "2023":
          fileDescriptor.edition = cjsExports.Edition.EDITION_2023;
          break;
        default:
          throw Error("Unsupported edition " + edition);
      }
  }
});
export { require_descriptor_2 };
