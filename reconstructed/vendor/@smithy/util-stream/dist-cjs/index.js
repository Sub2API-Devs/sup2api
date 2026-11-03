/**
 * @smithy/util-stream/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { base64Module } from "../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { IR } from "../../util-utf8/dist-cjs/index.js";
import { me } from "./checksum/ChecksumStream.js";
import { st } from "./checksum/createChecksumStream.js";
import { bt } from "./createBufferedReadable.js";
import { xt } from "./getAwsChunkedEncodingStream.js";
import { Bt } from "./headStream.js";
import { Wt } from "./sdk-stream-mixin.js";
import { Zt } from "./splitStream.js";
import { B } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:10678-12581 cjs-fingerprint
var Xns = x(function (b) {
  var Kt = base64Module(),
    Xt = IR(),
    er = me(),
    tr = st(),
    rr = bt(),
    sr = xt(),
    nr = Bt(),
    ir = Wt(),
    or = Zt(),
    ar = B();
  class U extends Uint8Array {
    static fromString(e, t = "utf-8") {
      if (typeof e === "string") {
        if (t === "base64") return U.mutate(Kt.fromBase64(e));
        return U.mutate(Xt.fromUtf8(e));
      }
      throw Error(`Unsupported conversion from ${typeof e} to Uint8ArrayBlobAdapter.`);
    }
    static mutate(e) {
      return (Object.setPrototypeOf(e, U.prototype), e);
    }
    transformToString(e = "utf-8") {
      if (e === "base64") return Kt.toBase64(this);
      return Xt.toUtf8(this);
    }
  }
  b.Uint8ArrayBlobAdapter = U;
  Object.keys(er).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return er[e];
        },
      });
  });
  Object.keys(tr).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return tr[e];
        },
      });
  });
  Object.keys(rr).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return rr[e];
        },
      });
  });
  Object.keys(sr).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return sr[e];
        },
      });
  });
  Object.keys(nr).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return nr[e];
        },
      });
  });
  Object.keys(ir).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return ir[e];
        },
      });
  });
  Object.keys(or).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return or[e];
        },
      });
  });
  Object.keys(ar).forEach(function (e) {
    if (e !== "default" && !Object.prototype.hasOwnProperty.call(b, e))
      Object.defineProperty(b, e, {
        enumerable: !0,
        get: function () {
          return ar[e];
        },
      });
  });
});

export { Xns };
