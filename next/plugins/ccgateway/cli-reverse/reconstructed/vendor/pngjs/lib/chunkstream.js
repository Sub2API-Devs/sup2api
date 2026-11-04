/**
 * pngjs/lib/chunkstream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:20975-23141 cjs-fingerprint
var require_chunkstream = __commonJS(function (cjsExports, cjsModule) {
  var util = importMetaRequire("util");
  var Stream = importMetaRequire("stream");
  var ChunkStream = (cjsModule.exports = function () {
    Stream.call(this);
    this._buffers = [];
    this._buffered = 0;
    this._reads = [];
    this._paused = false;
    this._encoding = "utf8";
    this.writable = true;
  });
  util.inherits(ChunkStream, Stream);
  ChunkStream.prototype.read = function (length, callback) {
    this._reads.push({
      length: Math.abs(length),
      allowLess: length < 0,
      func: callback,
    });
    process.nextTick(
      function () {
        this._process();
        if (this._paused && this._reads && this._reads.length > 0) {
          this._paused = false;
          this.emit("drain");
        }
      }.bind(this),
    );
  };
  ChunkStream.prototype.write = function (data, encoding) {
    if (!this.writable) {
      this.emit("error", Error("Stream not writable"));
      return false;
    }
    let dataBuffer;
    if (Buffer.isBuffer(data)) dataBuffer = data;
    else dataBuffer = Buffer.from(data, encoding || this._encoding);
    this._buffers.push(dataBuffer);
    this._buffered += dataBuffer.length;
    this._process();
    if (this._reads && this._reads.length === 0) this._paused = true;
    return this.writable && !this._paused;
  };
  ChunkStream.prototype.end = function (data, encoding) {
    if (data) this.write(data, encoding);
    this.writable = false;
    if (!this._buffers) return;
    if (this._buffers.length === 0) this._end();
    else {
      this._buffers.push(null);
      this._process();
    }
  };
  ChunkStream.prototype.destroySoon = ChunkStream.prototype.end;
  ChunkStream.prototype._end = function () {
    if (this._reads.length > 0) this.emit("error", Error("Unexpected end of input"));
    this.destroy();
  };
  ChunkStream.prototype.destroy = function () {
    if (!this._buffers) return;
    this.writable = false;
    this._reads = null;
    this._buffers = null;
    this.emit("close");
  };
  ChunkStream.prototype._processReadAllowingLess = function (read) {
    this._reads.shift();
    let smallerBuf = this._buffers[0];
    if (smallerBuf.length > read.length) {
      this._buffered -= read.length;
      this._buffers[0] = smallerBuf.slice(read.length);
      read.func.call(this, smallerBuf.slice(0, read.length));
    } else {
      this._buffered -= smallerBuf.length;
      this._buffers.shift();
      read.func.call(this, smallerBuf);
    }
  };
  ChunkStream.prototype._processRead = function (read) {
    this._reads.shift();
    let pos = 0;
    let count = 0;
    let data = Buffer.alloc(read.length);
    while (pos < read.length) {
      let buf = this._buffers[count++];
      let len = Math.min(buf.length, read.length - pos);
      buf.copy(data, pos, 0, len);
      pos += len;
      if (len !== buf.length) this._buffers[--count] = buf.slice(len);
    }
    if (count > 0) this._buffers.splice(0, count);
    this._buffered -= read.length;
    read.func.call(this, data);
  };
  ChunkStream.prototype._process = function () {
    try {
      while (this._buffered > 0 && this._reads && this._reads.length > 0) {
        let read = this._reads[0];
        if (read.allowLess) this._processReadAllowingLess(read);
        else if (this._buffered >= read.length) this._processRead(read);
        else break;
      }
      if (this._buffers && !this.writable) this._end();
    } catch (ex) {
      this.emit("error", ex);
    }
  };
});
export { require_chunkstream };
