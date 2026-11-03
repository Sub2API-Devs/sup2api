/**
 * @smithy/util-stream/dist-cjs/createBufferedReadableStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { le } from "./ByteArrayCollector.js";

//@ chunk-wjd9n4jx.js:3816-5121 cjs-fingerprint
var mt = x(function (ft) {
  Object.defineProperty(ft, "__esModule", { value: !0 });
  ft.createBufferedReadable = void 0;
  ft.createBufferedReadableStream = ct;
  ft.merge = ut;
  ft.flush = Z;
  ft.sizeOf = N;
  ft.modeOf = ht;
  var at = le();
  function ct(e, t, r) {
    let reader = e.getReader(),
      n = !1,
      i = 0,
      a = ["", new at.ByteArrayCollector((u) => new Uint8Array(u))],
      o = -1,
      c = async (u) => {
        let { value: h, done: f } = await reader.read(),
          d = h;
        if (f) {
          if (o !== -1) {
            let l = Z(a, o);
            if (N(l) > 0) u.enqueue(l);
          }
          u.close();
        } else {
          let l = ht(d, !1);
          if (o !== l) {
            if (o >= 0) u.enqueue(Z(a, o));
            o = l;
          }
          if (o === -1) {
            u.enqueue(d);
            return;
          }
          let m = N(d);
          i += m;
          let p = N(a[o]);
          if (m >= t && p === 0) u.enqueue(d);
          else {
            let S = ut(a, o, d);
            if (!n && i > t * 2)
              ((n = !0),
                r?.warn(
                  `@smithy/util-stream - stream chunk size ${m} is below threshold of ${t}, automatically buffering.`,
                ));
            if (S >= t) u.enqueue(Z(a, o));
            else await c(u);
          }
        }
      };
    return new ReadableStream({ pull: c });
  }
  ft.createBufferedReadable = ct;
  function ut(e, t, r) {
    switch (t) {
      case 0:
        return ((e[0] += r), N(e[0]));
      case 1:
      case 2:
        return (e[t].push(r), N(e[t]));
    }
  }
  function Z(e, t) {
    switch (t) {
      case 0:
        let r = e[0];
        return ((e[0] = ""), r);
      case 1:
      case 2:
        return e[t].flush();
    }
    throw Error(`@smithy/util-stream - invalid index ${t} given to flush()`);
  }
  function N(e) {
    return e?.byteLength ?? e?.length ?? 0;
  }
  function ht(e, t = !0) {
    if (t && typeof Buffer < "u" && e instanceof Buffer) return 2;
    if (e instanceof Uint8Array) return 1;
    if (typeof e === "string") return 0;
    return -1;
  }
});

export { mt };
