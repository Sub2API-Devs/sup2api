/**
 * @grpc/grpc-js/build/src/make-client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";
import { Ta } from "./client.js";

//@ chunk-pwh5dx3n.js:69757-71132 cjs-fingerprint
var vs = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.makeClientConstructor = makeClientConstructor;
  cjsExports.loadPackageDefinition = loadPackageDefinition;
  var client_1 = Ta();
  var requesterFuncs = {
    unary: client_1.Client.prototype.makeUnaryRequest,
    server_stream: client_1.Client.prototype.makeServerStreamRequest,
    client_stream: client_1.Client.prototype.makeClientStreamRequest,
    bidi: client_1.Client.prototype.makeBidiStreamRequest,
  };
  function isPrototypePolluted(key) {
    return ["__proto__", "prototype", "constructor"].includes(key);
  }
  function makeClientConstructor(methods, serviceName, classOptions) {
    if (!classOptions) classOptions = {};
    class ServiceClientImpl extends client_1.Client {}
    Object.keys(methods).forEach((name) => {
      if (isPrototypePolluted(name)) return;
      let attrs = methods[name];
      let methodType;
      if (typeof name === "string" && name.charAt(0) === "$") throw Error("Method names cannot start with $");
      if (attrs.requestStream) {
        if (attrs.responseStream) methodType = "bidi";
        else methodType = "client_stream";
      } else if (attrs.responseStream) methodType = "server_stream";
      else methodType = "unary";
      let { requestSerialize, responseDeserialize } = attrs;
      let serviceMethod = partial(
        requesterFuncs[methodType],
        attrs.path,
        requestSerialize,
        responseDeserialize,
      );
      ServiceClientImpl.prototype[name] = serviceMethod;
      Object.assign(ServiceClientImpl.prototype[name], attrs);
      if (attrs.originalName && !isPrototypePolluted(attrs.originalName))
        ServiceClientImpl.prototype[attrs.originalName] = ServiceClientImpl.prototype[name];
    });
    ServiceClientImpl.service = methods;
    ServiceClientImpl.serviceName = serviceName;
    return ServiceClientImpl;
  }
  function partial(fn, path, serialize, deserialize) {
    return function (...args) {
      return fn.call(this, path, serialize, deserialize, ...args);
    };
  }
  function isProtobufTypeDefinition(obj) {
    return "format" in obj;
  }
  function loadPackageDefinition(packageDef) {
    let result = {};
    for (let serviceFqn in packageDef)
      if (Object.prototype.hasOwnProperty.call(packageDef, serviceFqn)) {
        let service = packageDef[serviceFqn];
        let nameComponents = serviceFqn.split(".");
        if (nameComponents.some((comp) => isPrototypePolluted(comp))) continue;
        let serviceName = nameComponents[nameComponents.length - 1];
        let current = result;
        for (let packageName of nameComponents.slice(0, -1)) {
          if (!current[packageName]) current[packageName] = {};
          current = current[packageName];
        }
        if (isProtobufTypeDefinition(service)) current[serviceName] = service;
        else current[serviceName] = makeClientConstructor(service, serviceName, {});
      }
    return result;
  }
});
export { vs };
