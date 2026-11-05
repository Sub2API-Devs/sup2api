/**
 * protobufjs/src/rpc/service.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-vxhm2nqe.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_minimal } from "../util/minimal.js";

//@ chunk-vxhm2nqe.js:39586-40656 cjs-fingerprint
var require_service = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = Service;
  var util = require_minimal();
  (Service.prototype = Object.create(util.EventEmitter.prototype)).constructor = Service;
  function Service(rpcImpl, requestDelimited, responseDelimited) {
    if (typeof rpcImpl !== "function") throw TypeError("rpcImpl must be a function");
    util.EventEmitter.call(this);
    this.rpcImpl = rpcImpl;
    this.requestDelimited = Boolean(requestDelimited);
    this.responseDelimited = Boolean(responseDelimited);
  }
  Service.prototype.rpcCall = function rpcCall(method, requestCtor, responseCtor, request, callback) {
    if (!request) throw TypeError("request must be specified");
    var serviceSelf = this;
    if (!callback) return util.asPromise(rpcCall, serviceSelf, method, requestCtor, responseCtor, request);
    if (!serviceSelf.rpcImpl) {
      setTimeout(function () {
        callback(Error("already ended"));
      }, 0);
      return;
    }
    try {
      return serviceSelf.rpcImpl(
        method,
        requestCtor[serviceSelf.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
        function (err, response) {
          if (err) {
            serviceSelf.emit("error", err, method);
            return callback(err);
          }
          if (response === null) {
            serviceSelf.end(true);
            return;
          }
          if (!(response instanceof responseCtor))
            try {
              response = responseCtor[serviceSelf.responseDelimited ? "decodeDelimited" : "decode"](response);
            } catch (err) {
              serviceSelf.emit("error", err, method);
              return callback(err);
            }
          serviceSelf.emit("data", response, method);
          return callback(null, response);
        },
      );
    } catch (err) {
      serviceSelf.emit("error", err, method);
      setTimeout(function () {
        callback(err);
      }, 0);
      return;
    }
  };
  Service.prototype.end = function (endedByRPC) {
    if (this.rpcImpl) {
      if (!endedByRPC) this.rpcImpl(null, null, null);
      this.rpcImpl = null;
      this.emit("end").off();
    }
    return this;
  };
});
export { require_service };
