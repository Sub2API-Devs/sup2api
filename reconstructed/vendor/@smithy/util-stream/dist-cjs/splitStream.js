/**
 * @smithy/util-stream/dist-cjs/splitStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Qt } from "./splitStream.browser.js";
import { B } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:10385-10678 cjs-fingerprint
var Zt = x(function (Yt) {
  Object.defineProperty(Yt, "__esModule", { value: !0 });
  Yt.splitStream = es;
  var ee = importMetaRequire("stream"),
    Gt = Qt(),
    te = B();
  async function es(e) {
    if (te.isReadableStream(e) || te.isBlob(e)) return Gt.splitStream(e);
    let t = new ee.PassThrough(),
      r = new ee.PassThrough();
    return (e.pipe(t), e.pipe(r), [t, r]);
  }
});

export { Zt };
