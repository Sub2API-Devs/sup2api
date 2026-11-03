/**
 * @smithy/util-stream/dist-cjs/sdk-stream-mixin.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { nke } from "../../fetch-http-handler/dist-cjs/index.js";
import { base64Module } from "../../../@aws-sdk/credential-provider-web-identity/dist-cjs/index.js";
import { K6t } from "../../util-hex-encoding/dist-cjs/index.js";
import { IR } from "../../util-utf8/dist-cjs/index.js";
import { B } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:7747-9158 cjs-fingerprint
var Ut = x(function (qt) {
  Object.defineProperty(qt, "__esModule", { value: !0 });
  qt.sdkStreamMixin = void 0;
  var Nt = nke(),
    zt = base64Module(),
    At = K6t(),
    Dt = IR(),
    X = B(),
    It = "The stream has already been transformed.",
    Yr = (e) => {
      if (!Pt(e) && !X.isReadableStream(e)) {
        let n = e?.__proto__?.constructor?.name || e;
        throw Error(`Unexpected stream implementation, expect Blob or ReadableStream, got ${n}`);
      }
      let t = !1,
        r = async () => {
          if (t) throw Error(It);
          return ((t = !0), await Nt.streamCollector(e));
        },
        s = (n) => {
          if (typeof n.stream !== "function")
            throw Error(`Cannot transform payload Blob to web stream. Please make sure the Blob.stream() is polyfilled.
If you are using React Native, this API is not yet supported, see: https://react-native.canny.io/feature-requests/p/fetch-streaming-body`);
          return n.stream();
        };
      return Object.assign(e, {
        transformToByteArray: r,
        transformToString: async (n) => {
          let i = await r();
          if (n === "base64") return zt.toBase64(i);
          else if (n === "hex") return At.toHex(i);
          else if (n === void 0 || n === "utf8" || n === "utf-8") return Dt.toUtf8(i);
          else if (typeof TextDecoder === "function") return new TextDecoder(n).decode(i);
          else throw Error("TextDecoder is not available, please make sure polyfill is provided.");
        },
        transformToWebStream: () => {
          if (t) throw Error(It);
          if (((t = !0), Pt(e))) return s(e);
          else if (X.isReadableStream(e)) return e;
          else throw Error(`Cannot transform payload to web stream, got ${e}`);
        },
      });
    };
  qt.sdkStreamMixin = Yr;
  var Pt = (e) => typeof Blob === "function" && e instanceof Blob;
});

export { Ut };
