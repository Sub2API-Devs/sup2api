/**
 * protobufjs/src/service.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { zr } from "./namespace.js";
import { Rs } from "./method.js";
import { de } from "./util.js";
import { require_rpc as ZPo } from "./rpc.js";

//@ chunk-pwh5dx3n.js:88399-90850 cjs-fingerprint
var bs = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Service;
  var Namespace = zr();
  ((Service.prototype = Object.create(Namespace.prototype)).constructor = Service).className = "Service";
  var Method = Rs();
  var util = de();
  var rpc = ZPo();
  var reservedRe = util.patterns.reservedRe;
  function Service(name, options) {
    Namespace.call(this, name, options);
    this.methods = {};
    this._methodsArray = null;
  }
  Service.fromJSON = function (name, json, depth) {
    depth = util.checkDepth(depth);
    var service = new Service(name, json.options);
    if (json.methods)
      for (var names = Object.keys(json.methods), i = 0; i < names.length; ++i)
        service.add(Method.fromJSON(names[i], json.methods[names[i]]));
    if (json.nested) service.addJSON(json.nested, depth);
    if (json.edition) service._edition = json.edition;
    service.comment = json.comment;
    service._defaultEdition = "proto3";
    return service;
  };
  Service.prototype.toJSON = function (toJSONOptions) {
    var inherited = Namespace.prototype.toJSON.call(this, toJSONOptions);
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "edition",
      this._editionToJSON(),
      "options",
      (inherited && inherited.options) || undefined,
      "methods",
      Namespace.arrayToJSON(this.methodsArray, toJSONOptions) || {},
      "nested",
      (inherited && inherited.nested) || undefined,
      "comment",
      keepComments ? this.comment : undefined,
    ]);
  };
  Object.defineProperty(Service.prototype, "methodsArray", {
    get: function () {
      return this._methodsArray || (this._methodsArray = util.toArray(this.methods));
    },
  });
  function clearCache(service) {
    service._methodsArray = null;
    return service;
  }
  Service.prototype.get = function (name) {
    return Object.prototype.hasOwnProperty.call(this.methods, name)
      ? this.methods[name]
      : Namespace.prototype.get.call(this, name);
  };
  Service.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    Namespace.prototype.resolve.call(this);
    var methods = this.methodsArray;
    for (var i = 0; i < methods.length; ++i) methods[i].resolve();
    return this;
  };
  Service.prototype._resolveFeaturesRecursive = function (edition) {
    if (!this._needsRecursiveFeatureResolution) return this;
    edition = this._edition || edition;
    Namespace.prototype._resolveFeaturesRecursive.call(this, edition);
    this.methodsArray.forEach((method) => {
      method._resolveFeaturesRecursive(edition);
    });
    return this;
  };
  Service.prototype.add = function (object) {
    if (this.get(object.name)) throw Error("duplicate name '" + object.name + "' in " + this);
    if (object instanceof Method) {
      if (object.name === "__proto__") return this;
      this.methods[object.name] = object;
      object.parent = this;
      return clearCache(this);
    }
    return Namespace.prototype.add.call(this, object);
  };
  Service.prototype.remove = function (object) {
    if (object instanceof Method) {
      if (this.methods[object.name] !== object) throw Error(object + " is not a member of " + this);
      delete this.methods[object.name];
      object.parent = null;
      return clearCache(this);
    }
    return Namespace.prototype.remove.call(this, object);
  };
  Service.prototype.create = function (rpcImpl, requestDelimited, responseDelimited) {
    var rpcService = new rpc.Service(rpcImpl, requestDelimited, responseDelimited);
    for (var i = 0, method; i < this.methodsArray.length; ++i) {
      var methodName = util.lcFirst((method = this._methodsArray[i]).resolve().name).replace(/[^$\w_]/g, "");
      rpcService[methodName] = util.codegen(
        ["r", "c"],
        reservedRe.test(methodName) ? methodName + "_" : methodName,
      )("return this.rpcCall(m,q,s,r,c)")({
        m: method,
        q: method.resolvedRequestType.ctor,
        s: method.resolvedResponseType.ctor,
      });
    }
    return rpcService;
  };
});
export { bs };
