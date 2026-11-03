/**
 * @smithy/util-stream/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { base64Module } from "../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_util_utf8 } from "../../util-utf8/dist-cjs/index.js";
import { require_ChecksumStream } from "./checksum/ChecksumStream.js";
import { require_createChecksumStream } from "./checksum/createChecksumStream.js";
import { require_createBufferedReadable } from "./createBufferedReadable.js";
import { require_getAwsChunkedEncodingStream } from "./getAwsChunkedEncodingStream.js";
import { require_headStream } from "./headStream.js";
import { require_sdk_stream_mixin } from "./sdk-stream-mixin.js";
import { require_splitStream } from "./splitStream.js";
import { require_stream_type_check } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:10678-12581 cjs-fingerprint
var require_util_stream = x(function (cjsExports) {
  var utilBase64 = base64Module();
  var utilUtf8 = require_util_utf8();
  var ChecksumStream = require_ChecksumStream();
  var createChecksumStream = require_createChecksumStream();
  var createBufferedReadable = require_createBufferedReadable();
  var getAwsChunkedEncodingStream = require_getAwsChunkedEncodingStream();
  var headStream = require_headStream();
  var sdkStreamMixin = require_sdk_stream_mixin();
  var splitStream = require_splitStream();
  var streamTypeCheck = require_stream_type_check();
  class Uint8ArrayBlobAdapter extends Uint8Array {
    static fromString(source, encoding = "utf-8") {
      if (typeof source === "string") {
        if (encoding === "base64") return Uint8ArrayBlobAdapter.mutate(utilBase64.fromBase64(source));
        return Uint8ArrayBlobAdapter.mutate(utilUtf8.fromUtf8(source));
      }
      throw Error(`Unsupported conversion from ${typeof source} to Uint8ArrayBlobAdapter.`);
    }
    static mutate(source) {
      Object.setPrototypeOf(source, Uint8ArrayBlobAdapter.prototype);
      return source;
    }
    transformToString(encoding = "utf-8") {
      if (encoding === "base64") return utilBase64.toBase64(this);
      return utilUtf8.toUtf8(this);
    }
  }
  cjsExports.Uint8ArrayBlobAdapter = Uint8ArrayBlobAdapter;
  Object.keys(ChecksumStream).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return ChecksumStream[k];
        },
      });
  });
  Object.keys(createChecksumStream).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return createChecksumStream[k];
        },
      });
  });
  Object.keys(createBufferedReadable).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return createBufferedReadable[k];
        },
      });
  });
  Object.keys(getAwsChunkedEncodingStream).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return getAwsChunkedEncodingStream[k];
        },
      });
  });
  Object.keys(headStream).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return headStream[k];
        },
      });
  });
  Object.keys(sdkStreamMixin).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return sdkStreamMixin[k];
        },
      });
  });
  Object.keys(splitStream).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return splitStream[k];
        },
      });
  });
  Object.keys(streamTypeCheck).forEach(function (k) {
    if (k !== "default" && !Object.prototype.hasOwnProperty.call(cjsExports, k))
      Object.defineProperty(cjsExports, k, {
        enumerable: true,
        get: function () {
          return streamTypeCheck[k];
        },
      });
  });
});
export { require_util_stream };
