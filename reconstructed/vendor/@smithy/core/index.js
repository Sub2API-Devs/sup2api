/**
 * @smithy/core/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-ayrvc8dg.js (1), chunk-edce4vxq.js (1), chunk-wjd9n4jx.js (2)
 * attribution: placement 1, cjs-layout 3
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_tslib } from "../../tslib/tslib.js";
import { require_core } from "./dist-cjs/index.js";

//@ chunk-wjd9n4jx.js:22053-22250 cjs-layout
var yr = x(function (lr) {
  Object.defineProperty(lr, "__esModule", {
    value: true,
  });
  lr.randomUUID = undefined;
  var mr = require_tslib();
  var dr = mr.__importDefault(importMetaRequire("crypto"));
  lr.randomUUID = dr.default.randomUUID.bind(dr.default);
});
//@ chunk-wjd9n4jx.js:22250-22651 cjs-layout
var Jns = x(function (ks) {
  var br = yr();
  var list = Array.from(
    {
      length: 256,
    },
    (e, t) => t.toString(16).padStart(2, "0"),
  );
  var v4 = () => {
    if (br.randomUUID) return br.randomUUID();
    let uint8Array = new Uint8Array(16);
    crypto.getRandomValues(uint8Array);
    uint8Array[6] = (uint8Array[6] & 15) | 64;
    uint8Array[8] = (uint8Array[8] & 63) | 128;
    return (
      list[uint8Array[0]] +
      list[uint8Array[1]] +
      list[uint8Array[2]] +
      list[uint8Array[3]] +
      "-" +
      list[uint8Array[4]] +
      list[uint8Array[5]] +
      "-" +
      list[uint8Array[6]] +
      list[uint8Array[7]] +
      "-" +
      list[uint8Array[8]] +
      list[uint8Array[9]] +
      "-" +
      list[uint8Array[10]] +
      list[uint8Array[11]] +
      list[uint8Array[12]] +
      list[uint8Array[13]] +
      list[uint8Array[14]] +
      list[uint8Array[15]]
    );
  };
  ks.v4 = v4;
});
//@ chunk-ayrvc8dg.js:311-331 placement
export default require_core();
//@ chunk-edce4vxq.js:128258-128507 cjs-layout
var Dn = x(function (On) {
  Object.defineProperty(On, "__esModule", {
    value: true,
  });
  On.isStreamingPayload = undefined;
  var In = importMetaRequire("stream");
  var isStreamingPayload = (e) =>
    e?.body instanceof In.Readable ||
    (typeof ReadableStream !== "undefined" && e?.body instanceof ReadableStream);
  On.isStreamingPayload = isStreamingPayload;
});
export { Jns, Dn };
