/**
 * @smithy/core/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-ayrvc8dg.js (1), chunk-edce4vxq.js (1), chunk-wjd9n4jx.js (2)
 * attribution: placement 1, cjs-layout 3
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_tslib } from "../../tslib/tslib.js";
import { require_core } from "./dist-cjs/index.js";
import { deferInit, beginDeferredInits } from "../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 4 modules closed by ./dist-cjs/index.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@smithy/core/dist-cjs/index.js");
// This module is the first evaluated of an import cycle of 4 modules closed by ./dist-cjs/index.js (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/@smithy/core/dist-cjs/index.js");
//@ chunk-wjd9n4jx.js:22053-22250 cjs-layout
var require_uuid = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.randomUUID = undefined;
  var tslib = require_tslib();
  var cryptoImport = tslib.__importDefault(importMetaRequire("crypto"));
  cjsExports.randomUUID = cryptoImport.default.randomUUID.bind(cryptoImport.default);
});
//@ chunk-wjd9n4jx.js:22250-22651 cjs-layout
var require_v4 = __commonJS(function (cjsExports) {
  var uuid = require_uuid();
  var list = Array.from(
    {
      length: 256,
    },
    (unused, i) => i.toString(16).padStart(2, "0"),
  );
  var v4 = () => {
    if (uuid.randomUUID) return uuid.randomUUID();
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
  cjsExports.v4 = v4;
});
//@ chunk-edce4vxq.js:128258-128507 cjs-layout
var require_isStreamingPayload = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.isStreamingPayload = undefined;
  var stream = importMetaRequire("stream");
  var isStreamingPayload = (request) =>
    request?.body instanceof stream.Readable ||
    (typeof ReadableStream !== "undefined" && request?.body instanceof ReadableStream);
  cjsExports.isStreamingPayload = isStreamingPayload;
});
//@ chunk-ayrvc8dg.js:311-331 placement
let defaultExport; // deferred: uses require_core (./dist-cjs/index.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ayrvc8dg.js:311", () => {
  defaultExport = require_core();
});
export { defaultExport as default };
export { require_v4, require_isStreamingPayload };
