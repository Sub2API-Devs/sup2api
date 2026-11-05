/**
 * pngjs/lib/sync-inflate.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:43714-45541 cjs-fingerprint
var require_sync_inflate = __commonJS(function (cjsExports, cjsModule) {
  var assert = importMetaRequire("assert").ok;
  var zlib = importMetaRequire("zlib");
  var util = importMetaRequire("util");
  var kMaxLength = importMetaRequire("buffer").kMaxLength;
  function Inflate(opts) {
    if (!(this instanceof Inflate)) return new Inflate(opts);
    if (opts && opts.chunkSize < zlib.Z_MIN_CHUNK) opts.chunkSize = zlib.Z_MIN_CHUNK;
    zlib.Inflate.call(this, opts);
    this._offset = this._offset === undefined ? this._outOffset : this._offset;
    this._buffer = this._buffer || this._outBuffer;
    if (opts && opts.maxLength != null) this._maxLength = opts.maxLength;
  }
  function createInflate(opts) {
    return new Inflate(opts);
  }
  function _close(engine, callback) {
    if (callback) process.nextTick(callback);
    if (!engine._handle) return;
    engine._handle.close();
    engine._handle = null;
  }
  Inflate.prototype._processChunk = function (chunk, flushFlag, asyncCb) {
    if (typeof asyncCb === "function")
      return zlib.Inflate._processChunk.call(this, chunk, flushFlag, asyncCb);
    let selfRef = this;
    let availInBefore = chunk && chunk.length;
    let availOutBefore = this._chunkSize - this._offset;
    let leftToInflate = this._maxLength;
    let inOff = 0;
    let buffers = [];
    let nread = 0;
    let error;
    this.on("error", function (err) {
      error = err;
    });
    function handleChunk(availInAfter, availOutAfter) {
      if (selfRef._hadError) return;
      let have = availOutBefore - availOutAfter;
      assert(have >= 0, "have should not go down");
      if (have > 0) {
        let out = selfRef._buffer.slice(selfRef._offset, selfRef._offset + have);
        selfRef._offset += have;
        if (out.length > leftToInflate) out = out.slice(0, leftToInflate);
        buffers.push(out);
        nread += out.length;
        leftToInflate -= out.length;
        if (leftToInflate === 0) return false;
      }
      if (availOutAfter === 0 || selfRef._offset >= selfRef._chunkSize) {
        availOutBefore = selfRef._chunkSize;
        selfRef._offset = 0;
        selfRef._buffer = Buffer.allocUnsafe(selfRef._chunkSize);
      }
      if (availOutAfter === 0) {
        inOff += availInBefore - availInAfter;
        availInBefore = availInAfter;
        return true;
      }
      return false;
    }
    assert(this._handle, "zlib binding closed");
    let res;
    do {
      res = this._handle.writeSync(
        flushFlag,
        chunk,
        inOff,
        availInBefore,
        this._buffer,
        this._offset,
        availOutBefore,
      );
      res = res || this._writeState;
    } while (!this._hadError && handleChunk(res[0], res[1]));
    if (this._hadError) throw error;
    if (nread >= kMaxLength) {
      _close(this);
      throw RangeError(
        "Cannot create final Buffer. It would be larger than 0x" + kMaxLength.toString(16) + " bytes",
      );
    }
    let buf = Buffer.concat(buffers, nread);
    _close(this);
    return buf;
  };
  util.inherits(Inflate, zlib.Inflate);
  function zlibBufferSync(engine, buffer) {
    if (typeof buffer === "string") buffer = Buffer.from(buffer);
    if (!(buffer instanceof Buffer)) throw TypeError("Not a string or buffer");
    let flushFlag = engine._finishFlushFlag;
    if (flushFlag == null) flushFlag = zlib.Z_FINISH;
    return engine._processChunk(buffer, flushFlag);
  }
  function inflateSync(buffer, opts) {
    return zlibBufferSync(new Inflate(opts), buffer);
  }
  cjsModule.exports = cjsExports = inflateSync;
  cjsExports.Inflate = Inflate;
  cjsExports.createInflate = createInflate;
  cjsExports.inflateSync = inflateSync;
});
export { require_sync_inflate };
