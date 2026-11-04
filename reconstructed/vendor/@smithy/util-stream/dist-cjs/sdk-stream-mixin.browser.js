/**
 * @smithy/util-stream/dist-cjs/sdk-stream-mixin.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_fetch_http_handler } from "../../fetch-http-handler/dist-cjs/index.js";
import { base64Module } from "../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { require_util_hex_encoding } from "../../util-hex-encoding/dist-cjs/index.js";
import { require_util_utf8 } from "../../util-utf8/dist-cjs/index.js";
import { require_stream_type_check } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:7747-9158 cjs-fingerprint
var require_sdk_stream_mixin_browser = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.sdkStreamMixin = undefined;
  var fetch_http_handler_1 = require_fetch_http_handler();
  var util_base64_1 = base64Module();
  var util_hex_encoding_1 = require_util_hex_encoding();
  var util_utf8_1 = require_util_utf8();
  var stream_type_check_1 = require_stream_type_check();
  var ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED = "The stream has already been transformed.";
  var sdkStreamMixin = (stream) => {
    if (!isBlobInstance(stream) && !stream_type_check_1.isReadableStream(stream)) {
      let name = stream?.__proto__?.constructor?.name || stream;
      throw Error(`Unexpected stream implementation, expect Blob or ReadableStream, got ${name}`);
    }
    let transformed = false;
    let transformToByteArray = async () => {
      if (transformed) throw Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
      transformed = true;
      return await fetch_http_handler_1.streamCollector(stream);
    };
    let blobToWebStream = (blob) => {
      if (typeof blob.stream !== "function")
        throw Error(`Cannot transform payload Blob to web stream. Please make sure the Blob.stream() is polyfilled.
If you are using React Native, this API is not yet supported, see: https://react-native.canny.io/feature-requests/p/fetch-streaming-body`);
      return blob.stream();
    };
    return Object.assign(stream, {
      transformToByteArray,
      transformToString: async (encoding) => {
        let buf = await transformToByteArray();
        if (encoding === "base64") return util_base64_1.toBase64(buf);
        else if (encoding === "hex") return util_hex_encoding_1.toHex(buf);
        else if (encoding === undefined || encoding === "utf8" || encoding === "utf-8")
          return util_utf8_1.toUtf8(buf);
        else if (typeof TextDecoder === "function") return new TextDecoder(encoding).decode(buf);
        else throw Error("TextDecoder is not available, please make sure polyfill is provided.");
      },
      transformToWebStream: () => {
        if (transformed) throw Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
        transformed = true;
        if (isBlobInstance(stream)) return blobToWebStream(stream);
        else if (stream_type_check_1.isReadableStream(stream)) return stream;
        else throw Error(`Cannot transform payload to web stream, got ${stream}`);
      },
    });
  };
  cjsExports.sdkStreamMixin = sdkStreamMixin;
  var isBlobInstance = (stream) => typeof Blob === "function" && stream instanceof Blob;
});
export { require_sdk_stream_mixin_browser };
