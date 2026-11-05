/**
 * @bufbuild/protobuf/dist/cjs/registry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "./descriptors.js";
import { require_text_format } from "./wire/text-format.js";
import { require_nested_types } from "./reflect/nested-types.js";
import { require_unsafe } from "./reflect/unsafe.js";
import { require_names } from "./reflect/names.js";

//@ chunk-qg41pqt6.js:364665-376507 cjs-require-graph
var require_registry = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.maximumEdition = cjsExports.minimumEdition = undefined;
  cjsExports.createRegistry = createRegistry;
  cjsExports.createMutableRegistry = createMutableRegistry;
  cjsExports.createFileRegistry = createFileRegistry;
  var descriptors_js_1 = require_descriptors();
  var text_format_js_1 = require_text_format();
  var nested_types_js_1 = require_nested_types();
  var unsafe_js_1 = require_unsafe();
  var names_js_1 = require_names();
  function createRegistry(...input) {
    return initBaseRegistry(input);
  }
  function createMutableRegistry(...input) {
    let reg = initBaseRegistry(input);
    return Object.assign(Object.assign({}, reg), {
      remove(desc) {
        var _a;
        if (desc.kind == "extension") {
          if (!((_a = reg.extendees.get(desc.extendee.typeName)) === null || _a === undefined))
            _a.delete(desc.number);
        }
        reg.types.delete(desc.typeName);
      },
    });
  }
  function createFileRegistry(...args) {
    let registry = createBaseRegistry();
    if (!args.length) return registry;
    if ("$typeName" in args[0] && args[0].$typeName == "google.protobuf.FileDescriptorSet") {
      for (let file of args[0].file) addFile(file, registry);
      return registry;
    }
    if ("$typeName" in args[0]) {
      let recurseDeps = function (file) {
        let deps = [];
        for (let protoFileName of file.dependency) {
          if (registry.getFile(protoFileName) != null) continue;
          if (seen.has(protoFileName)) continue;
          let dep = resolve(protoFileName);
          if (!dep) throw Error(`Unable to resolve ${protoFileName}, imported by ${file.name}`);
          if ("kind" in dep) registry.addFile(dep, false, true);
          else {
            seen.add(dep.name);
            deps.push(dep);
          }
        }
        return deps.concat(...deps.map(recurseDeps));
      };
      let input = args[0];
      let resolve = args[1];
      let seen = new Set();
      for (let file of [input, ...recurseDeps(input)].reverse()) addFile(file, registry);
    } else for (let fileReg of args) for (let file of fileReg.files) registry.addFile(file);
    return registry;
  }
  function createBaseRegistry() {
    let types = new Map();
    let extendees = new Map();
    let files = new Map();
    return {
      kind: "registry",
      types,
      extendees,
      [Symbol.iterator]() {
        return types.values();
      },
      get files() {
        return files.values();
      },
      addFile(file, skipTypes, withDeps) {
        files.set(file.proto.name, file);
        if (!skipTypes) for (let type of nested_types_js_1.nestedTypes(file)) this.add(type);
        if (withDeps) for (let f of file.dependencies) this.addFile(f, skipTypes, withDeps);
      },
      add(desc) {
        if (desc.kind == "extension") {
          let numberToExt = extendees.get(desc.extendee.typeName);
          if (!numberToExt) extendees.set(desc.extendee.typeName, (numberToExt = new Map()));
          numberToExt.set(desc.number, desc);
        }
        types.set(desc.typeName, desc);
      },
      get(typeName) {
        return types.get(typeName);
      },
      getFile(fileName) {
        return files.get(fileName);
      },
      getMessage(typeName) {
        let t = types.get(typeName);
        return (t === null || t === undefined ? undefined : t.kind) == "message" ? t : undefined;
      },
      getEnum(typeName) {
        let t = types.get(typeName);
        return (t === null || t === undefined ? undefined : t.kind) == "enum" ? t : undefined;
      },
      getExtension(typeName) {
        let t = types.get(typeName);
        return (t === null || t === undefined ? undefined : t.kind) == "extension" ? t : undefined;
      },
      getExtensionFor(extendee, no) {
        var _a;
        return (_a = extendees.get(extendee.typeName)) === null || _a === undefined ? undefined : _a.get(no);
      },
      getService(typeName) {
        let t = types.get(typeName);
        return (t === null || t === undefined ? undefined : t.kind) == "service" ? t : undefined;
      },
    };
  }
  function initBaseRegistry(inputs) {
    let registry = createBaseRegistry();
    for (let input of inputs)
      switch (input.kind) {
        case "registry":
          for (let n of input) registry.add(n);
          break;
        case "file":
          registry.addFile(input);
          break;
        default:
          registry.add(input);
          break;
      }
    return registry;
  }
  var EDITION_PROTO2 = 998;
  var EDITION_PROTO3 = 999;
  var EDITION_UNSTABLE = 9999;
  var TYPE_STRING = 9;
  var TYPE_GROUP = 10;
  var TYPE_MESSAGE = 11;
  var TYPE_BYTES = 12;
  var TYPE_ENUM = 14;
  var LABEL_REPEATED = 3;
  var LABEL_REQUIRED = 2;
  var JS_STRING = 1;
  var IDEMPOTENCY_UNKNOWN = 0;
  var EXPLICIT = 1;
  var IMPLICIT = 2;
  var LEGACY_REQUIRED = 3;
  var PACKED = 1;
  var DELIMITED = 2;
  var OPEN = 1;
  var VERIFY = 2;
  cjsExports.minimumEdition = 998;
  cjsExports.maximumEdition = 1001;
  var featureDefaults = {
    998: {
      fieldPresence: 1,
      enumType: 2,
      repeatedFieldEncoding: 2,
      utf8Validation: 3,
      messageEncoding: 1,
      jsonFormat: 2,
      enforceNamingStyle: 2,
      defaultSymbolVisibility: 1,
    },
    999: {
      fieldPresence: 2,
      enumType: 1,
      repeatedFieldEncoding: 1,
      utf8Validation: 2,
      messageEncoding: 1,
      jsonFormat: 1,
      enforceNamingStyle: 2,
      defaultSymbolVisibility: 1,
    },
    1000: {
      fieldPresence: 1,
      enumType: 1,
      repeatedFieldEncoding: 1,
      utf8Validation: 2,
      messageEncoding: 1,
      jsonFormat: 1,
      enforceNamingStyle: 2,
      defaultSymbolVisibility: 1,
    },
    1001: {
      fieldPresence: 1,
      enumType: 1,
      repeatedFieldEncoding: 1,
      utf8Validation: 2,
      messageEncoding: 1,
      jsonFormat: 1,
      enforceNamingStyle: 1,
      defaultSymbolVisibility: 2,
    },
  };
  function addFile(proto, reg) {
    var _a;
    var _b;
    let file = {
      kind: "file",
      proto,
      deprecated:
        (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null &&
        _b !== undefined
          ? _b
          : false,
      edition: getFileEdition(proto),
      name: proto.name.replace(/\.proto$/, ""),
      dependencies: findFileDependencies(proto, reg),
      enums: [],
      messages: [],
      extensions: [],
      services: [],
      toString() {
        return `file ${proto.name}`;
      },
    };
    let mapEntriesStore = new Map();
    let mapEntries = {
      get(typeName) {
        return mapEntriesStore.get(typeName);
      },
      add(desc) {
        var _a;
        assert(((_a = desc.proto.options) === null || _a === undefined ? undefined : _a.mapEntry) === true);
        mapEntriesStore.set(desc.typeName, desc);
      },
    };
    for (let enumProto of proto.enumType) addEnum(enumProto, file, undefined, reg);
    for (let messageProto of proto.messageType) addMessage(messageProto, file, undefined, reg, mapEntries);
    for (let serviceProto of proto.service) addService(serviceProto, file, reg);
    addExtensions(file, reg);
    for (let mapEntry of mapEntriesStore.values()) addFields(mapEntry, reg, mapEntries);
    for (let message of file.messages) {
      addFields(message, reg, mapEntries);
      addExtensions(message, reg);
    }
    reg.addFile(file, true);
  }
  function addExtensions(desc, reg) {
    switch (desc.kind) {
      case "file":
        for (let proto of desc.proto.extension) {
          let ext = newField(proto, desc, reg);
          desc.extensions.push(ext);
          reg.add(ext);
        }
        break;
      case "message":
        for (let proto of desc.proto.extension) {
          let ext = newField(proto, desc, reg);
          desc.nestedExtensions.push(ext);
          reg.add(ext);
        }
        for (let message of desc.nestedMessages) addExtensions(message, reg);
        break;
    }
  }
  function addFields(message, reg, mapEntries) {
    let allOneofs = message.proto.oneofDecl.map((proto) => newOneof(proto, message));
    let oneofsSeen = new Set();
    for (let proto of message.proto.field) {
      let oneof = findOneof(proto, allOneofs);
      let field = newField(proto, message, reg, oneof, mapEntries);
      message.fields.push(field);
      message.field[field.localName] = field;
      if (oneof === undefined) message.members.push(field);
      else {
        oneof.fields.push(field);
        if (!oneofsSeen.has(oneof)) {
          oneofsSeen.add(oneof);
          message.members.push(oneof);
        }
      }
    }
    for (let oneof of allOneofs.filter((o) => oneofsSeen.has(o))) message.oneofs.push(oneof);
    for (let child of message.nestedMessages) addFields(child, reg, mapEntries);
  }
  function addEnum(proto, file, parent, reg) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    let sharedPrefix = findEnumSharedPrefix(proto.name, proto.value);
    let desc = {
      kind: "enum",
      proto,
      deprecated:
        (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null &&
        _b !== undefined
          ? _b
          : false,
      file,
      parent,
      open: true,
      name: proto.name,
      typeName: makeTypeName(proto, parent, file),
      value: {},
      values: [],
      sharedPrefix,
      toString() {
        return `enum ${this.typeName}`;
      },
    };
    desc.open = isEnumOpen(desc);
    reg.add(desc);
    for (let p of proto.value) {
      let name = p.name;
      desc.values.push(
        (desc.value[p.number] = {
          kind: "enum_value",
          proto: p,
          deprecated:
            (_d = (_c = p.options) === null || _c === undefined ? undefined : _c.deprecated) !== null &&
            _d !== undefined
              ? _d
              : false,
          parent: desc,
          name,
          localName: names_js_1.safeObjectProperty(
            sharedPrefix == null ? name : name.substring(sharedPrefix.length),
          ),
          number: p.number,
          toString() {
            return `enum value ${desc.typeName}.${name}`;
          },
        }),
      );
    }
    ((_e = parent === null || parent === undefined ? undefined : parent.nestedEnums) !== null &&
    _e !== undefined
      ? _e
      : file.enums
    ).push(desc);
  }
  function addMessage(proto, file, parent, reg, mapEntries) {
    var _a;
    var _b;
    var _c;
    var _d;
    let desc = {
      kind: "message",
      proto,
      deprecated:
        (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null &&
        _b !== undefined
          ? _b
          : false,
      file,
      parent,
      name: proto.name,
      typeName: makeTypeName(proto, parent, file),
      fields: [],
      field: {},
      oneofs: [],
      members: [],
      nestedEnums: [],
      nestedMessages: [],
      nestedExtensions: [],
      toString() {
        return `message ${this.typeName}`;
      },
    };
    if (((_c = proto.options) === null || _c === undefined ? undefined : _c.mapEntry) === true)
      mapEntries.add(desc);
    else {
      ((_d = parent === null || parent === undefined ? undefined : parent.nestedMessages) !== null &&
      _d !== undefined
        ? _d
        : file.messages
      ).push(desc);
      reg.add(desc);
    }
    for (let enumProto of proto.enumType) addEnum(enumProto, file, desc, reg);
    for (let messageProto of proto.nestedType) addMessage(messageProto, file, desc, reg, mapEntries);
  }
  function addService(proto, file, reg) {
    var _a;
    var _b;
    let desc = {
      kind: "service",
      proto,
      deprecated:
        (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null &&
        _b !== undefined
          ? _b
          : false,
      file,
      name: proto.name,
      typeName: makeTypeName(proto, undefined, file),
      methods: [],
      method: {},
      toString() {
        return `service ${this.typeName}`;
      },
    };
    file.services.push(desc);
    reg.add(desc);
    for (let methodProto of proto.method) {
      let method = newMethod(methodProto, desc, reg);
      desc.methods.push(method);
      desc.method[method.localName] = method;
    }
  }
  function newMethod(proto, parent, reg) {
    var _a;
    var _b;
    var _c;
    var _d;
    let methodKind;
    if (proto.clientStreaming && proto.serverStreaming) methodKind = "bidi_streaming";
    else if (proto.clientStreaming) methodKind = "client_streaming";
    else if (proto.serverStreaming) methodKind = "server_streaming";
    else methodKind = "unary";
    let input = reg.getMessage(trimLeadingDot(proto.inputType));
    let output = reg.getMessage(trimLeadingDot(proto.outputType));
    assert(input, `invalid MethodDescriptorProto: input_type ${proto.inputType} not found`);
    assert(output, `invalid MethodDescriptorProto: output_type ${proto.inputType} not found`);
    let name = proto.name;
    return {
      kind: "rpc",
      proto,
      deprecated:
        (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null &&
        _b !== undefined
          ? _b
          : false,
      parent,
      name,
      localName: names_js_1.safeObjectProperty(
        name.length ? names_js_1.safeObjectProperty(name[0].toLowerCase() + name.substring(1)) : name,
      ),
      methodKind,
      input,
      output,
      idempotency:
        (_d = (_c = proto.options) === null || _c === undefined ? undefined : _c.idempotencyLevel) !== null &&
        _d !== undefined
          ? _d
          : IDEMPOTENCY_UNKNOWN,
      toString() {
        return `rpc ${parent.typeName}.${name}`;
      },
    };
  }
  function newOneof(proto, parent) {
    return {
      kind: "oneof",
      proto,
      deprecated: false,
      parent,
      fields: [],
      name: proto.name,
      localName: names_js_1.safeObjectProperty(names_js_1.protoCamelCase(proto.name)),
      toString() {
        return `oneof ${parent.typeName}.${this.name}`;
      },
    };
  }
  function newField(proto, parentOrFile, reg, oneof, mapEntries) {
    var _a;
    var _b;
    var _c;
    let isExtension = mapEntries === undefined;
    let field = {
      kind: "field",
      proto,
      deprecated:
        (_b = (_a = proto.options) === null || _a === undefined ? undefined : _a.deprecated) !== null &&
        _b !== undefined
          ? _b
          : false,
      name: proto.name,
      number: proto.number,
      scalar: undefined,
      message: undefined,
      enum: undefined,
      presence: getFieldPresence(proto, oneof, isExtension, parentOrFile),
      utf8Validation: isUtf8Validated(proto, parentOrFile),
      listKind: undefined,
      mapKind: undefined,
      mapKey: undefined,
      delimitedEncoding: undefined,
      packed: undefined,
      longAsString: false,
      getDefaultValue: undefined,
    };
    if (isExtension) {
      let file = parentOrFile.kind == "file" ? parentOrFile : parentOrFile.file;
      let parent = parentOrFile.kind == "file" ? undefined : parentOrFile;
      let typeName = makeTypeName(proto, parent, file);
      field.kind = "extension";
      field.file = file;
      field.parent = parent;
      field.oneof = undefined;
      field.typeName = typeName;
      field.jsonName = `[${typeName}]`;
      field.toString = () => `extension ${typeName}`;
      let extendee = reg.getMessage(trimLeadingDot(proto.extendee));
      assert(extendee, `invalid FieldDescriptorProto: extendee ${proto.extendee} not found`);
      field.extendee = extendee;
    } else {
      let parent = parentOrFile;
      assert(parent.kind == "message");
      field.parent = parent;
      field.oneof = oneof;
      field.localName = oneof
        ? names_js_1.protoCamelCase(proto.name)
        : names_js_1.safeObjectProperty(names_js_1.protoCamelCase(proto.name));
      field.jsonName = proto.jsonName;
      field.toString = () => `field ${parent.typeName}.${proto.name}`;
    }
    let { label, type } = proto;
    let jstype = (_c = proto.options) === null || _c === undefined ? undefined : _c.jstype;
    if (label === LABEL_REPEATED) {
      let mapEntry =
        type == TYPE_MESSAGE
          ? mapEntries === null || mapEntries === undefined
            ? undefined
            : mapEntries.get(trimLeadingDot(proto.typeName))
          : undefined;
      if (mapEntry) {
        field.fieldKind = "map";
        let { key, value } = findMapEntryFields(mapEntry);
        field.mapKey = key.scalar;
        field.mapKind = value.fieldKind;
        field.message = value.message;
        field.delimitedEncoding = false;
        field.enum = value.enum;
        field.scalar = value.scalar;
        return field;
      }
      switch (((field.fieldKind = "list"), type)) {
        case TYPE_MESSAGE:
        case TYPE_GROUP:
          field.listKind = "message";
          field.message = reg.getMessage(trimLeadingDot(proto.typeName));
          assert(field.message);
          field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
          break;
        case TYPE_ENUM:
          field.listKind = "enum";
          field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
          assert(field.enum);
          break;
        default:
          field.listKind = "scalar";
          field.scalar = type;
          field.longAsString = jstype == JS_STRING;
          break;
      }
      field.packed = isPackedField(proto, parentOrFile);
      return field;
    }
    switch (type) {
      case TYPE_MESSAGE:
      case TYPE_GROUP:
        field.fieldKind = "message";
        field.message = reg.getMessage(trimLeadingDot(proto.typeName));
        assert(field.message, `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`);
        field.delimitedEncoding = isDelimitedEncoding(proto, parentOrFile);
        field.getDefaultValue = () => {
          return;
        };
        break;
      case TYPE_ENUM: {
        let enumeration = reg.getEnum(trimLeadingDot(proto.typeName));
        assert(
          enumeration !== undefined,
          `invalid FieldDescriptorProto: type_name ${proto.typeName} not found`,
        );
        field.fieldKind = "enum";
        field.enum = reg.getEnum(trimLeadingDot(proto.typeName));
        field.getDefaultValue = () =>
          unsafe_js_1.unsafeIsSetExplicit(proto, "defaultValue")
            ? text_format_js_1.parseTextFormatEnumValue(enumeration, proto.defaultValue)
            : undefined;
        break;
      }
      default: {
        field.fieldKind = "scalar";
        field.scalar = type;
        field.longAsString = jstype == JS_STRING;
        field.getDefaultValue = () =>
          unsafe_js_1.unsafeIsSetExplicit(proto, "defaultValue")
            ? text_format_js_1.parseTextFormatScalarValue(type, proto.defaultValue)
            : undefined;
        break;
      }
    }
    return field;
  }
  function getFileEdition(proto) {
    switch (proto.syntax) {
      case "":
      case "proto2":
        return EDITION_PROTO2;
      case "proto3":
        return EDITION_PROTO3;
      case "editions":
        if (proto.edition === EDITION_UNSTABLE) return cjsExports.maximumEdition;
        if (proto.edition in featureDefaults) return proto.edition;
        throw Error(`${proto.name}: unsupported edition`);
      default:
        throw Error(`${proto.name}: unsupported syntax "${proto.syntax}"`);
    }
  }
  function findFileDependencies(proto, reg) {
    return proto.dependency.map((wantName) => {
      let dep = reg.getFile(wantName);
      if (!dep) throw Error(`Cannot find ${wantName}, imported by ${proto.name}`);
      return dep;
    });
  }
  function findEnumSharedPrefix(enumName, values) {
    let prefix = camelToSnakeCase(enumName) + "_";
    for (let value of values) {
      if (!value.name.toLowerCase().startsWith(prefix)) return;
      let shortName = value.name.substring(prefix.length);
      if (shortName.length == 0) return;
      if (/^\d/.test(shortName)) return;
    }
    return prefix;
  }
  function camelToSnakeCase(camel) {
    return (camel.substring(0, 1) + camel.substring(1).replace(/[A-Z]/g, (c) => "_" + c)).toLowerCase();
  }
  function makeTypeName(proto, parent, file) {
    let typeName;
    if (parent) typeName = `${parent.typeName}.${proto.name}`;
    else if (file.proto.package.length > 0) typeName = `${file.proto.package}.${proto.name}`;
    else typeName = `${proto.name}`;
    return typeName;
  }
  function trimLeadingDot(typeName) {
    return typeName.startsWith(".") ? typeName.substring(1) : typeName;
  }
  function findOneof(proto, allOneofs) {
    if (!unsafe_js_1.unsafeIsSetExplicit(proto, "oneofIndex")) return;
    if (proto.proto3Optional) return;
    let oneof = allOneofs[proto.oneofIndex];
    assert(
      oneof,
      `invalid FieldDescriptorProto: oneof #${proto.oneofIndex} for field #${proto.number} not found`,
    );
    return oneof;
  }
  function getFieldPresence(proto, oneof, isExtension, parent) {
    if (proto.label == LABEL_REQUIRED) return LEGACY_REQUIRED;
    if (proto.label == LABEL_REPEATED) return IMPLICIT;
    if (!!oneof || proto.proto3Optional) return EXPLICIT;
    if (isExtension) return EXPLICIT;
    let resolved = resolveFeature("fieldPresence", {
      proto,
      parent,
    });
    if (resolved == IMPLICIT && (proto.type == TYPE_MESSAGE || proto.type == TYPE_GROUP)) return EXPLICIT;
    return resolved;
  }
  function isPackedField(proto, parent) {
    if (proto.label != LABEL_REPEATED) return false;
    switch (proto.type) {
      case TYPE_STRING:
      case TYPE_BYTES:
      case TYPE_GROUP:
      case TYPE_MESSAGE:
        return false;
    }
    let o = proto.options;
    if (o && unsafe_js_1.unsafeIsSetExplicit(o, "packed")) return o.packed;
    return (
      PACKED ==
      resolveFeature("repeatedFieldEncoding", {
        proto,
        parent,
      })
    );
  }
  function findMapEntryFields(mapEntry) {
    let key = mapEntry.fields.find((f) => f.number === 1);
    let value = mapEntry.fields.find((f) => f.number === 2);
    assert(
      key &&
        key.fieldKind == "scalar" &&
        key.scalar != descriptors_js_1.ScalarType.BYTES &&
        key.scalar != descriptors_js_1.ScalarType.FLOAT &&
        key.scalar != descriptors_js_1.ScalarType.DOUBLE &&
        value &&
        value.fieldKind != "list" &&
        value.fieldKind != "map",
    );
    return {
      key,
      value,
    };
  }
  function isEnumOpen(desc) {
    var _a;
    return (
      OPEN ==
      resolveFeature("enumType", {
        proto: desc.proto,
        parent: (_a = desc.parent) !== null && _a !== undefined ? _a : desc.file,
      })
    );
  }
  function isDelimitedEncoding(proto, parent) {
    if (proto.type == TYPE_GROUP) return true;
    return (
      DELIMITED ==
      resolveFeature("messageEncoding", {
        proto,
        parent,
      })
    );
  }
  function isUtf8Validated(proto, parent) {
    return (
      VERIFY ==
      resolveFeature("utf8Validation", {
        proto,
        parent,
      })
    );
  }
  function resolveFeature(name, ref) {
    var _a;
    var _b;
    let featureSet = (_a = ref.proto.options) === null || _a === undefined ? undefined : _a.features;
    if (featureSet) {
      let val = featureSet[name];
      if (val != 0) return val;
    }
    if ("kind" in ref) {
      if (ref.kind == "message")
        return resolveFeature(name, (_b = ref.parent) !== null && _b !== undefined ? _b : ref.file);
      let editionDefaults = featureDefaults[ref.edition];
      if (!editionDefaults) throw Error(`feature default for edition ${ref.edition} not found`);
      return editionDefaults[name];
    }
    return resolveFeature(name, ref.parent);
  }
  function assert(condition, msg) {
    if (!condition) throw Error(msg);
  }
});
export { require_registry };
