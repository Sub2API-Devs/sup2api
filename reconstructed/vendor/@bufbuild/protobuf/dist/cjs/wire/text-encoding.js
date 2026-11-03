/**
 * @bufbuild/protobuf/dist/cjs/wire/text-encoding.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:332193-332773 cjs-require-graph
var Rg = x(function (HN) {
  Object.defineProperty(HN, "__esModule", { value: !0 });
  HN.configureTextEncoding = zj;
  HN.getTextEncoding = Xj;
  var Cg = Symbol.for("@bufbuild/protobuf/text-encoding");
  function zj(e) {
    globalThis[Cg] = e;
  }
  function Xj() {
    if (globalThis[Cg] == null) {
      let e = new globalThis.TextEncoder(),
        n = new globalThis.TextDecoder(),
        r;
      globalThis[Cg] = {
        encodeUtf8(s) {
          return e.encode(s);
        },
        decodeUtf8(s, h) {
          if (h) {
            if (r === void 0) r = new globalThis.TextDecoder("utf-8", { fatal: !0 });
            return r.decode(s);
          }
          return n.decode(s);
        },
        checkUtf8(s) {
          try {
            return (encodeURIComponent(s), !0);
          } catch (error) {
            return !1;
          }
        },
      };
    }
    return globalThis[Cg];
  }
});

export { Rg };
