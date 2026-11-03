/**
 * delayed-stream/lib/delayed_stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: delayed-stream@1.0.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:235-1799 cjs-fingerprint
var require_delayed_stream = x(function (cjsExports, cjsModule) {
  var Stream = importMetaRequire("stream").Stream;
  var util = importMetaRequire("util");
  cjsModule.exports = DelayedStream;
  function DelayedStream() {
    this.source = null;
    this.dataSize = 0;
    this.maxDataSize = 1048576;
    this.pauseStream = true;
    this._maxDataSizeExceeded = false;
    this._released = false;
    this._bufferedEvents = [];
  }
  util.inherits(DelayedStream, Stream);
  DelayedStream.create = function (source, options) {
    var delayedStream = new this();
    options = options || {};
    for (var option in options) delayedStream[option] = options[option];
    delayedStream.source = source;
    var realEmit = source.emit;
    source.emit = function () {
      delayedStream._handleEmit(arguments);
      return realEmit.apply(source, arguments);
    };
    source.on("error", function () {});
    if (delayedStream.pauseStream) source.pause();
    return delayedStream;
  };
  Object.defineProperty(DelayedStream.prototype, "readable", {
    configurable: true,
    enumerable: true,
    get: function () {
      return this.source.readable;
    },
  });
  DelayedStream.prototype.setEncoding = function () {
    return this.source.setEncoding.apply(this.source, arguments);
  };
  DelayedStream.prototype.resume = function () {
    if (!this._released) this.release();
    this.source.resume();
  };
  DelayedStream.prototype.pause = function () {
    this.source.pause();
  };
  DelayedStream.prototype.release = function () {
    this._released = true;
    this._bufferedEvents.forEach(
      function (args) {
        this.emit.apply(this, args);
      }.bind(this),
    );
    this._bufferedEvents = [];
  };
  DelayedStream.prototype.pipe = function () {
    var r = Stream.prototype.pipe.apply(this, arguments);
    this.resume();
    return r;
  };
  DelayedStream.prototype._handleEmit = function (args) {
    if (this._released) {
      this.emit.apply(this, args);
      return;
    }
    if (args[0] === "data") {
      this.dataSize += args[1].length;
      this._checkIfMaxDataSizeExceeded();
    }
    this._bufferedEvents.push(args);
  };
  DelayedStream.prototype._checkIfMaxDataSizeExceeded = function () {
    if (this._maxDataSizeExceeded) return;
    if (this.dataSize <= this.maxDataSize) return;
    this._maxDataSizeExceeded = true;
    var message = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", Error(message));
  };
});
export { require_delayed_stream };
