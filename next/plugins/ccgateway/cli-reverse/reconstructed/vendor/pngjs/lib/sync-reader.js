/**
 * pngjs/lib/sync-reader.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:45541-46188 cjs-fingerprint
var require_sync_reader = __commonJS(function (cjsExports, cjsModule) {
  var SyncReader = (cjsModule.exports = function (buffer) {
    this._buffer = buffer;
    this._reads = [];
  });
  SyncReader.prototype.read = function (length, callback) {
    this._reads.push({
      length: Math.abs(length),
      allowLess: length < 0,
      func: callback,
    });
  };
  SyncReader.prototype.process = function () {
    while (this._reads.length > 0 && this._buffer.length) {
      let read = this._reads[0];
      if (this._buffer.length && (this._buffer.length >= read.length || read.allowLess)) {
        this._reads.shift();
        let buf = this._buffer;
        this._buffer = buf.slice(read.length);
        read.func.call(this, buf.slice(0, read.length));
      } else break;
    }
    if (this._reads.length > 0) return Error("There are some read requests waitng on finished stream");
    if (this._buffer.length > 0) return Error("unrecognised content at end of stream");
  };
});
export { require_sync_reader };
