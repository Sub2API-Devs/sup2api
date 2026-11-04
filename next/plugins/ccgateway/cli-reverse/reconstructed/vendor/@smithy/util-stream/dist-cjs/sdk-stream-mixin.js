/**
 * @smithy/util-stream/dist-cjs/sdk-stream-mixin.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../node-http-handler/dist-cjs/index.js";
import { require_util_buffer_from } from "../../util-buffer-from/dist-cjs/index.js";
import { require_sdk_stream_mixin_browser } from "./sdk-stream-mixin.browser.js";

//@ chunk-wjd9n4jx.js:9158-10211 cjs-fingerprint
var require_sdk_stream_mixin = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.sdkStreamMixin = undefined;
  var node_http_handler_1 = require_node_http_handler();
  var util_buffer_from_1 = require_util_buffer_from();
  var stream_1 = importMetaRequire("stream");
  var sdk_stream_mixin_browser_1 = require_sdk_stream_mixin_browser();
  var ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED = "The stream has already been transformed.";
  var sdkStreamMixin = (stream) => {
    if (!(stream instanceof stream_1.Readable))
      try {
        return sdk_stream_mixin_browser_1.sdkStreamMixin(stream);
      } catch (e) {
        let name = stream?.__proto__?.constructor?.name || stream;
        throw Error(`Unexpected stream implementation, expect Stream.Readable instance, got ${name}`);
      }
    let transformed = false;
    let transformToByteArray = async () => {
      if (transformed) throw Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
      transformed = true;
      return await node_http_handler_1.streamCollector(stream);
    };
    return Object.assign(stream, {
      transformToByteArray,
      transformToString: async (encoding) => {
        let buf = await transformToByteArray();
        if (encoding === undefined || Buffer.isEncoding(encoding))
          return util_buffer_from_1
            .fromArrayBuffer(buf.buffer, buf.byteOffset, buf.byteLength)
            .toString(encoding);
        else return new TextDecoder(encoding).decode(buf);
      },
      transformToWebStream: () => {
        if (transformed) throw Error(ERR_MSG_STREAM_HAS_BEEN_TRANSFORMED);
        if (stream.readableFlowing !== null) throw Error("The stream has been consumed by other callbacks.");
        if (typeof stream_1.Readable.toWeb !== "function")
          throw Error("Readable.toWeb() is not supported. Please ensure a polyfill is available.");
        transformed = true;
        return stream_1.Readable.toWeb(stream);
      },
    });
  };
  cjsExports.sdkStreamMixin = sdkStreamMixin;
});
export { require_sdk_stream_mixin };
