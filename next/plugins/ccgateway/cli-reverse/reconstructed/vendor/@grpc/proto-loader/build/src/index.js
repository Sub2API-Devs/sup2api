/**
 * @grpc/proto-loader/build/src/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/proto-loader@0.8.0..0.8.1
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_lodash_camelcase } from "../../../../lodash.camelcase/index.js";
import { require_protobufjs } from "../../../../protobufjs/src/index.js";
import { require_descriptor_2 } from "../../../../protobufjs/ext/descriptor/index.js";
import { require_util } from "./util.js";
import { require_long } from "../../../../long/umd/index.js";

//@ chunk-3k21nfa0.js:172408-175802 cjs-fingerprint
var require_proto_loader = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.loadFileDescriptorSetFromObject =
    cjsExports.loadFileDescriptorSetFromBuffer =
    cjsExports.fromJSON =
    cjsExports.loadSync =
    cjsExports.load =
    cjsExports.IdempotencyLevel =
    cjsExports.isAnyExtension =
    cjsExports.Long =
      undefined;
  var camelCase = require_lodash_camelcase();
  var Protobuf = require_protobufjs();
  var descriptor = require_descriptor_2();
  var util_1 = require_util();
  var Long = require_long();
  cjsExports.Long = Long;
  function isAnyExtension(obj) {
    return "@type" in obj && typeof obj["@type"] === "string";
  }
  cjsExports.isAnyExtension = isAnyExtension;
  var IdempotencyLevel;
  (function (IdempotencyLevel) {
    IdempotencyLevel.IDEMPOTENCY_UNKNOWN = "IDEMPOTENCY_UNKNOWN";
    IdempotencyLevel.NO_SIDE_EFFECTS = "NO_SIDE_EFFECTS";
    IdempotencyLevel.IDEMPOTENT = "IDEMPOTENT";
  })((IdempotencyLevel = cjsExports.IdempotencyLevel || (cjsExports.IdempotencyLevel = {})));
  var descriptorOptions = {
    longs: String,
    enums: String,
    bytes: String,
    defaults: true,
    oneofs: true,
    json: true,
  };
  function joinName(baseName, name) {
    if (baseName === "") return name;
    else return baseName + "." + name;
  }
  function isHandledReflectionObject(obj) {
    return obj instanceof Protobuf.Service || obj instanceof Protobuf.Type || obj instanceof Protobuf.Enum;
  }
  function isNamespaceBase(obj) {
    return obj instanceof Protobuf.Namespace || obj instanceof Protobuf.Root;
  }
  function getAllHandledReflectionObjects(obj, parentName) {
    let objName = joinName(parentName, obj.name);
    if (isHandledReflectionObject(obj)) return [[objName, obj]];
    else if (isNamespaceBase(obj) && typeof obj.nested !== "undefined")
      return Object.keys(obj.nested)
        .map((name) => getAllHandledReflectionObjects(obj.nested[name], objName))
        .reduce((accumulator, currentValue) => accumulator.concat(currentValue), []);
    return [];
  }
  function createDeserializer(cls, options) {
    return function (argBuf) {
      return cls.toObject(cls.decode(argBuf), options);
    };
  }
  function createSerializer(cls) {
    return function (arg) {
      if (Array.isArray(arg))
        throw Error(
          `Failed to serialize message: expected object with ${cls.name} structure, got array instead`,
        );
      let message = cls.fromObject(arg);
      return cls.encode(message).finish();
    };
  }
  function mapMethodOptions(options) {
    return (options || []).reduce(
      (obj, item) => {
        for (let [key, value] of Object.entries(item))
          switch (key) {
            case "uninterpreted_option":
              obj.uninterpreted_option.push(item.uninterpreted_option);
              break;
            default:
              obj[key] = value;
          }
        return obj;
      },
      {
        deprecated: false,
        idempotency_level: IdempotencyLevel.IDEMPOTENCY_UNKNOWN,
        uninterpreted_option: [],
      },
    );
  }
  function createMethodDefinition(method, serviceName, options, fileDescriptors) {
    let { resolvedRequestType: requestType, resolvedResponseType: responseType } = method;
    return {
      path: "/" + serviceName + "/" + method.name,
      requestStream: !!method.requestStream,
      responseStream: !!method.responseStream,
      requestSerialize: createSerializer(requestType),
      requestDeserialize: createDeserializer(requestType, options),
      responseSerialize: createSerializer(responseType),
      responseDeserialize: createDeserializer(responseType, options),
      originalName: camelCase(method.name),
      requestType: createMessageDefinition(requestType, options, fileDescriptors),
      responseType: createMessageDefinition(responseType, options, fileDescriptors),
      options: mapMethodOptions(method.parsedOptions),
    };
  }
  function createServiceDefinition(service, name, options, fileDescriptors) {
    let def = {};
    for (let method of service.methodsArray)
      def[method.name] = createMethodDefinition(method, name, options, fileDescriptors);
    return def;
  }
  function createMessageDefinition(message, options, fileDescriptors) {
    let messageDescriptor = message.toDescriptor("proto3");
    return {
      format: "Protocol Buffer 3 DescriptorProto",
      type: messageDescriptor.$type.toObject(messageDescriptor, descriptorOptions),
      fileDescriptorProtos: fileDescriptors,
      serialize: createSerializer(message),
      deserialize: createDeserializer(message, options),
    };
  }
  function createEnumDefinition(enumType, fileDescriptors) {
    let enumDescriptor = enumType.toDescriptor("proto3");
    return {
      format: "Protocol Buffer 3 EnumDescriptorProto",
      type: enumDescriptor.$type.toObject(enumDescriptor, descriptorOptions),
      fileDescriptorProtos: fileDescriptors,
    };
  }
  function createDefinition(obj, name, options, fileDescriptors) {
    if (obj instanceof Protobuf.Service) return createServiceDefinition(obj, name, options, fileDescriptors);
    else if (obj instanceof Protobuf.Type) return createMessageDefinition(obj, options, fileDescriptors);
    else if (obj instanceof Protobuf.Enum) return createEnumDefinition(obj, fileDescriptors);
    else throw Error("Type mismatch in reflection object handling");
  }
  function createPackageDefinition(root, options) {
    let def = {};
    root.resolveAll();
    let fileDescriptors = root
      .toDescriptor("proto3")
      .file.map((value) => Buffer.from(descriptor.FileDescriptorProto.encode(value).finish()));
    for (let [name, obj] of getAllHandledReflectionObjects(root, ""))
      def[name] = createDefinition(obj, name, options, fileDescriptors);
    return def;
  }
  function createPackageDefinitionFromDescriptorSet(decodedDescriptorSet, options) {
    options = options || {};
    let root = Protobuf.Root.fromDescriptor(decodedDescriptorSet);
    root.resolveAll();
    return createPackageDefinition(root, options);
  }
  function load(filename, options) {
    return util_1
      .loadProtosWithOptions(filename, options)
      .then((loadedRoot) => createPackageDefinition(loadedRoot, options));
  }
  cjsExports.load = load;
  function loadSync(filename, options) {
    let loadedRoot = util_1.loadProtosWithOptionsSync(filename, options);
    return createPackageDefinition(loadedRoot, options);
  }
  cjsExports.loadSync = loadSync;
  function fromJSON(json, options) {
    options = options || {};
    let loadedRoot = Protobuf.Root.fromJSON(json);
    loadedRoot.resolveAll();
    return createPackageDefinition(loadedRoot, options);
  }
  cjsExports.fromJSON = fromJSON;
  function loadFileDescriptorSetFromBuffer(descriptorSet, options) {
    let decodedDescriptorSet = descriptor.FileDescriptorSet.decode(descriptorSet);
    return createPackageDefinitionFromDescriptorSet(decodedDescriptorSet, options);
  }
  cjsExports.loadFileDescriptorSetFromBuffer = loadFileDescriptorSetFromBuffer;
  function loadFileDescriptorSetFromObject(descriptorSet, options) {
    let decodedDescriptorSet = descriptor.FileDescriptorSet.fromObject(descriptorSet);
    return createPackageDefinitionFromDescriptorSet(decodedDescriptorSet, options);
  }
  cjsExports.loadFileDescriptorSetFromObject = loadFileDescriptorSetFromObject;
  util_1.addCommonProtos();
});
export { require_proto_loader };
