/**
 * pngjs/lib/filter-parse-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_sync_reader } from "./sync-reader.js";
import { require_filter_parse } from "./filter-parse.js";

//@ chunk-spjgqa4y.js:46188-46406 cjs-fingerprint
var require_filter_parse_sync = x(function (cjsExports) {
  var SyncReader = require_sync_reader();
  var Filter = require_filter_parse();
  cjsExports.process = function (inBuffer, bitmapInfo) {
    let outBuffers = [];
    let reader = new SyncReader(inBuffer);
    new Filter(bitmapInfo, {
      read: reader.read.bind(reader),
      write: function (bufferPart) {
        outBuffers.push(bufferPart);
      },
      complete: function () {},
    }).start();
    reader.process();
    return Buffer.concat(outBuffers);
  };
});
export { require_filter_parse_sync };
