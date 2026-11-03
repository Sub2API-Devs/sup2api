/**
 * @smithy/util-stream/dist-cjs/sdk-stream-mixin.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { E$ } from "../../node-http-handler/dist-cjs/index.js";
import { UQt } from "../../util-buffer-from/dist-cjs/index.js";
import { Ut } from "./sdk-stream-mixin.browser.js";

//@ chunk-wjd9n4jx.js:9158-10211 cjs-fingerprint
var Wt = x(function (vt) {
  Object.defineProperty(vt, "__esModule", { value: !0 });
  vt.sdkStreamMixin = void 0;
  var kt = E$(),
    Ft = UQt(),
    z = importMetaRequire("stream"),
    Ht = Ut(),
    Lt = "The stream has already been transformed.",
    Zr = (e) => {
      if (!(e instanceof z.Readable))
        try {
          return Ht.sdkStreamMixin(e);
        } catch (error) {
          let n = e?.__proto__?.constructor?.name || e;
          throw Error(`Unexpected stream implementation, expect Stream.Readable instance, got ${n}`);
        }
      let t = !1,
        r = async () => {
          if (t) throw Error(Lt);
          return ((t = !0), await kt.streamCollector(e));
        };
      return Object.assign(e, {
        transformToByteArray: r,
        transformToString: async (s) => {
          let n = await r();
          if (s === void 0 || Buffer.isEncoding(s))
            return Ft.fromArrayBuffer(n.buffer, n.byteOffset, n.byteLength).toString(s);
          else return new TextDecoder(s).decode(n);
        },
        transformToWebStream: () => {
          if (t) throw Error(Lt);
          if (e.readableFlowing !== null) throw Error("The stream has been consumed by other callbacks.");
          if (typeof z.Readable.toWeb !== "function")
            throw Error("Readable.toWeb() is not supported. Please ensure a polyfill is available.");
          return ((t = !0), z.Readable.toWeb(e));
        },
      });
    };
  vt.sdkStreamMixin = Zr;
});

export { Wt };
