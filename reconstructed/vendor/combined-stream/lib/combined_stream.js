/**
 * combined-stream/lib/combined_stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: combined-stream@1.0.8
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_delayed_stream } from "../../delayed-stream/lib/delayed_stream.js";

//@ chunk-h6b7mazd.js:1799-4742 cjs-fingerprint
var require_combined_stream = x(function (cjsExports, cjsModule) {
  var util = importMetaRequire("util");
  var Stream = importMetaRequire("stream").Stream;
  var DelayedStream = require_delayed_stream();
  cjsModule.exports = CombinedStream;
  function CombinedStream() {
    this.writable = false;
    this.readable = true;
    this.dataSize = 0;
    this.maxDataSize = 2097152;
    this.pauseStreams = true;
    this._released = false;
    this._streams = [];
    this._currentStream = null;
    this._insideLoop = false;
    this._pendingNext = false;
  }
  util.inherits(CombinedStream, Stream);
  CombinedStream.create = function (options) {
    var combinedStream = new this();
    options = options || {};
    for (var option in options) combinedStream[option] = options[option];
    return combinedStream;
  };
  CombinedStream.isStreamLike = function (stream) {
    return (
      typeof stream !== "function" &&
      typeof stream !== "string" &&
      typeof stream !== "boolean" &&
      typeof stream !== "number" &&
      !Buffer.isBuffer(stream)
    );
  };
  CombinedStream.prototype.append = function (stream) {
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      if (!(stream instanceof DelayedStream)) {
        var newStream = DelayedStream.create(stream, {
          maxDataSize: 1 / 0,
          pauseStream: this.pauseStreams,
        });
        stream.on("data", this._checkDataSize.bind(this));
        stream = newStream;
      }
      this._handleErrors(stream);
      if (this.pauseStreams) stream.pause();
    }
    this._streams.push(stream);
    return this;
  };
  CombinedStream.prototype.pipe = function (dest, options) {
    Stream.prototype.pipe.call(this, dest, options);
    this.resume();
    return dest;
  };
  CombinedStream.prototype._getNext = function () {
    this._currentStream = null;
    if (this._insideLoop) {
      this._pendingNext = true;
      return;
    }
    this._insideLoop = true;
    try {
      do {
        this._pendingNext = false;
        this._realGetNext();
      } while (this._pendingNext);
    } finally {
      this._insideLoop = false;
    }
  };
  CombinedStream.prototype._realGetNext = function () {
    var stream = this._streams.shift();
    if (typeof stream === "undefined") {
      this.end();
      return;
    }
    if (typeof stream !== "function") {
      this._pipeNext(stream);
      return;
    }
    var getStream = stream;
    getStream(
      function (stream) {
        var isStreamLike = CombinedStream.isStreamLike(stream);
        if (isStreamLike) {
          stream.on("data", this._checkDataSize.bind(this));
          this._handleErrors(stream);
        }
        this._pipeNext(stream);
      }.bind(this),
    );
  };
  CombinedStream.prototype._pipeNext = function (stream) {
    this._currentStream = stream;
    var isStreamLike = CombinedStream.isStreamLike(stream);
    if (isStreamLike) {
      stream.on("end", this._getNext.bind(this));
      stream.pipe(this, {
        end: false,
      });
      return;
    }
    var value = stream;
    this.write(value);
    this._getNext();
  };
  CombinedStream.prototype._handleErrors = function (stream) {
    var t = this;
    stream.on("error", function (err) {
      t._emitError(err);
    });
  };
  CombinedStream.prototype.write = function (data) {
    this.emit("data", data);
  };
  CombinedStream.prototype.pause = function () {
    if (!this.pauseStreams) return;
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function")
      this._currentStream.pause();
    this.emit("pause");
  };
  CombinedStream.prototype.resume = function () {
    if (!this._released) {
      this._released = true;
      this.writable = true;
      this._getNext();
    }
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function")
      this._currentStream.resume();
    this.emit("resume");
  };
  CombinedStream.prototype.end = function () {
    this._reset();
    this.emit("end");
  };
  CombinedStream.prototype.destroy = function () {
    this._reset();
    this.emit("close");
  };
  CombinedStream.prototype._reset = function () {
    this.writable = false;
    this._streams = [];
    this._currentStream = null;
  };
  CombinedStream.prototype._checkDataSize = function () {
    this._updateDataSize();
    if (this.dataSize <= this.maxDataSize) return;
    var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(Error(message));
  };
  CombinedStream.prototype._updateDataSize = function () {
    this.dataSize = 0;
    var e = this;
    this._streams.forEach(function (stream) {
      if (!stream.dataSize) return;
      e.dataSize += stream.dataSize;
    });
    if (this._currentStream && this._currentStream.dataSize) this.dataSize += this._currentStream.dataSize;
  };
  CombinedStream.prototype._emitError = function (err) {
    this._reset();
    this.emit("error", err);
  };
});
export { require_combined_stream };
