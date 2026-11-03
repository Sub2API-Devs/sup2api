/**
 * delayed-stream/lib/delayed_stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: delayed-stream@1.0.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:235-1799 cjs-fingerprint
var gn = x(function (Ol, bn) {
  var Stream = importMetaRequire("stream").Stream,
    Oa = importMetaRequire("util");
  bn.exports = oe;
  function oe() {
    ((this.source = null),
      (this.dataSize = 0),
      (this.maxDataSize = 1048576),
      (this.pauseStream = !0),
      (this._maxDataSizeExceeded = !1),
      (this._released = !1),
      (this._bufferedEvents = []));
  }
  Oa.inherits(oe, Stream);
  oe.create = function (e, t) {
    var r = new this();
    t = t || {};
    for (var key in t) r[key] = t[key];
    r.source = e;
    var emit = e.emit;
    if (
      ((e.emit = function () {
        return (r._handleEmit(arguments), emit.apply(e, arguments));
      }),
      e.on("error", function () {}),
      r.pauseStream)
    )
      e.pause();
    return r;
  };
  Object.defineProperty(oe.prototype, "readable", {
    configurable: !0,
    enumerable: !0,
    get: function () {
      return this.source.readable;
    },
  });
  oe.prototype.setEncoding = function () {
    return this.source.setEncoding.apply(this.source, arguments);
  };
  oe.prototype.resume = function () {
    if (!this._released) this.release();
    this.source.resume();
  };
  oe.prototype.pause = function () {
    this.source.pause();
  };
  oe.prototype.release = function () {
    ((this._released = !0),
      this._bufferedEvents.forEach(
        function (e) {
          this.emit.apply(this, e);
        }.bind(this),
      ),
      (this._bufferedEvents = []));
  };
  oe.prototype.pipe = function () {
    var e = Stream.prototype.pipe.apply(this, arguments);
    return (this.resume(), e);
  };
  oe.prototype._handleEmit = function (e) {
    if (this._released) {
      this.emit.apply(this, e);
      return;
    }
    if (e[0] === "data") ((this.dataSize += e[1].length), this._checkIfMaxDataSizeExceeded());
    this._bufferedEvents.push(e);
  };
  oe.prototype._checkIfMaxDataSizeExceeded = function () {
    if (this._maxDataSizeExceeded) return;
    if (this.dataSize <= this.maxDataSize) return;
    this._maxDataSizeExceeded = !0;
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this.emit("error", Error(e));
  };
});

export { gn };
