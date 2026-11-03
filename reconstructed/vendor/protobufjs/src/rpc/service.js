/**
 * protobufjs/src/rpc/service.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-798ashq9.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_minimal } from "../util/minimal.js";

//@ chunk-798ashq9.js:39586-40656 cjs-fingerprint
var require_service = x(function (cjsExports, cjsModule) {
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
    var e = this;
    if (!callback) return util.asPromise(rpcCall, e, method, requestCtor, responseCtor, request);
    if (!e.rpcImpl) {
      setTimeout(function () {
        callback(Error("already ended"));
      }, 0);
      return;
    }
    try {
      return e.rpcImpl(
        method,
        requestCtor[e.requestDelimited ? "encodeDelimited" : "encode"](request).finish(),
        function (err, response) {
          if (err) {
            e.emit("error", err, method);
            return callback(err);
          }
          if (response === null) {
            e.end(true);
            return;
          }
          if (!(response instanceof responseCtor))
            try {
              response = responseCtor[e.responseDelimited ? "decodeDelimited" : "decode"](response);
            } catch (err) {
              e.emit("error", err, method);
              return callback(err);
            }
          e.emit("data", response, method);
          return callback(null, response);
        },
      );
    } catch (err) {
      e.emit("error", err, method);
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
