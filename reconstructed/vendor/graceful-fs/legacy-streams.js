/**
 * graceful-fs/legacy-streams.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:4288-5806 cjs-fingerprint
var require_legacy_streams = x(function (cjsExports, cjsModule) {
  var Stream = importMetaRequire("stream").Stream;
  cjsModule.exports = legacy;
  function legacy(fs) {
    return {
      ReadStream,
      WriteStream,
    };
    function ReadStream(path, options) {
      if (!(this instanceof ReadStream)) return new ReadStream(path, options);
      Stream.call(this);
      var c = this;
      this.path = path;
      this.fd = null;
      this.readable = true;
      this.paused = false;
      this.flags = "r";
      this.mode = 438;
      this.bufferSize = 65536;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.encoding) this.setEncoding(this.encoding);
      if (this.start !== undefined) {
        if (typeof this.start !== "number") throw TypeError("start must be a Number");
        if (this.end === undefined) this.end = 1 / 0;
        else if (typeof this.end !== "number") throw TypeError("end must be a Number");
        if (this.start > this.end) throw Error("start must be <= end");
        this.pos = this.start;
      }
      if (this.fd !== null) {
        process.nextTick(function () {
          c._read();
        });
        return;
      }
      fs.open(this.path, this.flags, this.mode, function (err, fd) {
        if (err) {
          c.emit("error", err);
          c.readable = false;
          return;
        }
        c.fd = fd;
        c.emit("open", fd);
        c._read();
      });
    }
    function WriteStream(path, options) {
      if (!(this instanceof WriteStream)) return new WriteStream(path, options);
      Stream.call(this);
      this.path = path;
      this.fd = null;
      this.writable = true;
      this.flags = "w";
      this.encoding = "binary";
      this.mode = 438;
      this.bytesWritten = 0;
      options = options || {};
      var keys = Object.keys(options);
      for (var index = 0, length = keys.length; index < length; index++) {
        var key = keys[index];
        this[key] = options[key];
      }
      if (this.start !== undefined) {
        if (typeof this.start !== "number") throw TypeError("start must be a Number");
        if (this.start < 0) throw Error("start must be >= zero");
        this.pos = this.start;
      }
      this.busy = false;
      this._queue = [];
      if (this.fd === null) {
        this._open = fs.open;
        this._queue.push([this._open, this.path, this.flags, this.mode, undefined]);
        this.flush();
      }
    }
  }
});
export { require_legacy_streams };
