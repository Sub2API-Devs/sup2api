/**
 * pngjs/lib/filter-parse-async.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_chunkstream } from "./chunkstream.js";
import { require_filter_parse } from "./filter-parse.js";

//@ chunk-spjgqa4y.js:25954-26249 cjs-fingerprint
var require_filter_parse_async = __commonJS(function (cjsExports, cjsModule) {
  var util = importMetaRequire("util");
  var ChunkStream = require_chunkstream();
  var Filter = require_filter_parse();
  var FilterAsync = (cjsModule.exports = function (bitmapInfo) {
    ChunkStream.call(this);
    let buffers = [];
    let that = this;
    this._filter = new Filter(bitmapInfo, {
      read: this.read.bind(this),
      write: function (buffer) {
        buffers.push(buffer);
      },
      complete: function () {
        that.emit("complete", Buffer.concat(buffers));
      },
    });
    this._filter.start();
  });
  util.inherits(FilterAsync, ChunkStream);
});
export { require_filter_parse_async };
