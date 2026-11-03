/**
 * protobufjs/src/method.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:86966-88399 cjs-fingerprint
var Rs = x(function (nA, fd) {
  fd.exports = Er;
  var La = Kt();
  ((Er.prototype = Object.create(La.prototype)).constructor = Er).className = "Method";
  var Hr = de();
  function Er(e, t, r, i, s, n, a, o, l) {
    if (Hr.isObject(s)) ((a = s), (s = n = void 0));
    else if (Hr.isObject(n)) ((a = n), (n = void 0));
    if (!(t === void 0 || Hr.isString(t))) throw TypeError("type must be a string");
    if (!Hr.isString(r)) throw TypeError("requestType must be a string");
    if (!Hr.isString(i)) throw TypeError("responseType must be a string");
    (La.call(this, e, a),
      (this.type = t || "rpc"),
      (this.requestType = r),
      (this.requestStream = s ? !0 : void 0),
      (this.responseType = i),
      (this.responseStream = n ? !0 : void 0),
      (this.resolvedRequestType = null),
      (this.resolvedResponseType = null),
      (this.comment = o),
      (this.parsedOptions = l));
  }
  Er.fromJSON = function (t, r) {
    return new Er(
      t,
      r.type,
      r.requestType,
      r.responseType,
      r.requestStream,
      r.responseStream,
      r.options,
      r.comment,
      r.parsedOptions,
    );
  };
  Er.prototype.toJSON = function (t) {
    var r = t ? Boolean(t.keepComments) : !1;
    return Hr.toObject([
      "type",
      (this.type !== "rpc" && this.type) || void 0,
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
      r ? this.comment : void 0,
      "parsedOptions",
      this.parsedOptions,
    ]);
  };
  Er.prototype.resolve = function () {
    if (this.resolved) return this;
    return (
      (this.resolvedRequestType = this.parent.lookupType(this.requestType)),
      (this.resolvedResponseType = this.parent.lookupType(this.responseType)),
      La.prototype.resolve.call(this)
    );
  };
});

export { Rs };
