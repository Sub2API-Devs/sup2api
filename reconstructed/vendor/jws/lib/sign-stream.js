/**
 * jws/lib/sign-stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jws@3.2.3..4.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_safe_buffer } from "../../safe-buffer/index.js";
import { require_data_stream } from "./data-stream.js";
import { require_jwa } from "../../jwa/index.js";
import { require_tostring } from "./tostring.js";

//@ chunk-82d8c88w.js:7773-9091 cjs-fingerprint
var require_sign_stream = x(function (cjsExports, cjsModule) {
  var ar = require_safe_buffer().Buffer;
  var DataStream = require_data_stream();
  var jwa = require_jwa();
  var Stream = importMetaRequire("stream");
  var toString = require_tostring();
  var util = importMetaRequire("util");
  function base64url(string, encoding) {
    return ar
      .from(string, encoding)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
  }
  function jwsSecuredInput(header, payload, encoding) {
    encoding = encoding || "utf8";
    var encodedHeader = base64url(toString(header), "binary");
    var encodedPayload = base64url(toString(payload), encoding);
    return util.format("%s.%s", encodedHeader, encodedPayload);
  }
  function jwsSign(opts) {
    var { header, payload } = opts;
    var n = opts.secret || opts.privateKey;
    var encoding = opts.encoding;
    var algo = jwa(header.alg);
    var securedInput = jwsSecuredInput(header, payload, encoding);
    var signature = algo.sign(securedInput, n);
    return util.format("%s.%s", securedInput, signature);
  }
  function SignStream(opts) {
    var secret = opts.secret;
    secret = secret == null ? opts.privateKey : secret;
    secret = secret == null ? opts.key : secret;
    if (/^hs/i.test(opts.header.alg) === true && secret == null)
      throw TypeError("secret must be a string or buffer or a KeyObject");
    var secretStream = new DataStream(secret);
    this.readable = true;
    this.header = opts.header;
    this.encoding = opts.encoding;
    this.secret = this.privateKey = this.key = secretStream;
    this.payload = new DataStream(opts.payload);
    this.secret.once(
      "close",
      function () {
        if (!this.payload.writable && this.readable) this.sign();
      }.bind(this),
    );
    this.payload.once(
      "close",
      function () {
        if (!this.secret.writable && this.readable) this.sign();
      }.bind(this),
    );
  }
  util.inherits(SignStream, Stream);
  SignStream.prototype.sign = function () {
    try {
      var signature = jwsSign({
        header: this.header,
        payload: this.payload.buffer,
        secret: this.secret.buffer,
        encoding: this.encoding,
      });
      this.emit("done", signature);
      this.emit("data", signature);
      this.emit("end");
      this.readable = false;
      return signature;
    } catch (e) {
      this.readable = false;
      this.emit("error", e);
      this.emit("close");
    }
  };
  SignStream.sign = jwsSign;
  cjsModule.exports = SignStream;
});
export { require_sign_stream };
