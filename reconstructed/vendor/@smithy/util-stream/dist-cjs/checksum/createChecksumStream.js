/**
 * @smithy/util-stream/dist-cjs/checksum/createChecksumStream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/util-stream@4.4.0..4.5.8
 * pieces: chunk-wjd9n4jx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { B } from "../stream-type-check.js";
import { me } from "./ChecksumStream.js";
import { Ke } from "./createChecksumStream.browser.js";

//@ chunk-wjd9n4jx.js:2964-3243 cjs-fingerprint
var st = x(function (rt) {
  Object.defineProperty(rt, "__esModule", { value: !0 });
  rt.createChecksumStream = qr;
  var Xe = B(),
    et = me(),
    tt = Ke();
  function qr(e) {
    if (typeof ReadableStream === "function" && Xe.isReadableStream(e.source))
      return tt.createChecksumStream(e);
    return new et.ChecksumStream(e);
  }
});

export { st };
