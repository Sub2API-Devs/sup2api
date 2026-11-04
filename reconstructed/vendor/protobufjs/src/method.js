/**
 * protobufjs/src/method.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:86966-88399 cjs-fingerprint
var Rs = x(function (cjsExports, cjsModule) {
  cjsModule.exports = Method;
  var ReflectionObject = Kt();
  ((Method.prototype = Object.create(ReflectionObject.prototype)).constructor = Method).className = "Method";
  var util = de();
  function Method(
    name,
    type,
    requestType,
    responseType,
    requestStream,
    responseStream,
    options,
    comment,
    parsedOptions,
  ) {
    if (util.isObject(requestStream)) {
      options = requestStream;
      requestStream = responseStream = undefined;
    } else if (util.isObject(responseStream)) {
      options = responseStream;
      responseStream = undefined;
    }
    if (!(type === undefined || util.isString(type))) throw TypeError("type must be a string");
    if (!util.isString(requestType)) throw TypeError("requestType must be a string");
    if (!util.isString(responseType)) throw TypeError("responseType must be a string");
    ReflectionObject.call(this, name, options);
    this.type = type || "rpc";
    this.requestType = requestType;
    this.requestStream = requestStream ? true : undefined;
    this.responseType = responseType;
    this.responseStream = responseStream ? true : undefined;
    this.resolvedRequestType = null;
    this.resolvedResponseType = null;
    this.comment = comment;
    this.parsedOptions = parsedOptions;
  }
  Method.fromJSON = function (name, json) {
    return new Method(
      name,
      json.type,
      json.requestType,
      json.responseType,
      json.requestStream,
      json.responseStream,
      json.options,
      json.comment,
      json.parsedOptions,
    );
  };
  Method.prototype.toJSON = function (toJSONOptions) {
    var keepComments = toJSONOptions ? Boolean(toJSONOptions.keepComments) : false;
    return util.toObject([
      "type",
      (this.type !== "rpc" && this.type) || undefined,
      "requestType",
      this.requestType,
      "requestStream",
      this.requestStream,
      "responseType",
      this.responseType,
      "responseStream",
      this.responseStream,
      "options",
      this.options,
      "comment",
      keepComments ? this.comment : undefined,
      "parsedOptions",
      this.parsedOptions,
    ]);
  };
  Method.prototype.resolve = function () {
    if (this.resolved) return this;
    this.resolvedRequestType = this.parent.lookupType(this.requestType);
    this.resolvedResponseType = this.parent.lookupType(this.responseType);
    return ReflectionObject.prototype.resolve.call(this);
  };
});
export { Rs };
