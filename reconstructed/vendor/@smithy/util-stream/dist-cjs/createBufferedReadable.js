/**
 * @smithy/util-stream/dist-cjs/createBufferedReadable.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { le } from "./ByteArrayCollector.js";
import { mt } from "./createBufferedReadableStream.js";
import { B } from "./stream-type-check.js";

//@ chunk-wjd9n4jx.js:5121-5983 cjs-fingerprint
var bt = x(function (yt) {
  Object.defineProperty(yt, "__esModule", { value: !0 });
  yt.createBufferedReadable = vr;
  var lt = importMetaRequire("stream"),
    K = le(),
    y = mt(),
    pt = B();
  function vr(e, t, r) {
    if (pt.isReadableStream(e)) return y.createBufferedReadableStream(e, t, r);
    let s = new lt.Readable({ read() {} }),
      n = !1,
      i = 0,
      a = [
        "",
        new K.ByteArrayCollector((c) => new Uint8Array(c)),
        new K.ByteArrayCollector((c) => Buffer.from(new Uint8Array(c))),
      ],
      o = -1;
    return (
      e.on("data", (c) => {
        let modeOf = y.modeOf(c, !0);
        if (o !== modeOf) {
          if (o >= 0) s.push(y.flush(a, o));
          o = modeOf;
        }
        if (o === -1) {
          s.push(c);
          return;
        }
        let sizeOf = y.sizeOf(c);
        i += sizeOf;
        let sizeOf_2 = y.sizeOf(a[o]);
        if (sizeOf >= t && sizeOf_2 === 0) s.push(c);
        else {
          let merge = y.merge(a, o, c);
          if (!n && i > t * 2)
            ((n = !0),
              r?.warn(
                `@smithy/util-stream - stream chunk size ${sizeOf} is below threshold of ${t}, automatically buffering.`,
              ));
          if (merge >= t) s.push(y.flush(a, o));
        }
      }),
      e.on("end", () => {
        if (o !== -1) {
          let flush = y.flush(a, o);
          if (y.sizeOf(flush) > 0) s.push(flush);
        }
        s.push(null);
      }),
      s
    );
  }
});

export { bt };
