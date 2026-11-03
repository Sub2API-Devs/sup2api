/**
 * combined-stream/lib/combined_stream.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: combined-stream@1.0.8
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { gn } from "../../delayed-stream/lib/delayed_stream.js";

//@ chunk-h6b7mazd.js:1799-4742 cjs-fingerprint
var xn = x(function (Cl, wn) {
  var Ca = importMetaRequire("util"),
    Stream = importMetaRequire("stream").Stream,
    En = gn();
  wn.exports = L;
  function L() {
    ((this.writable = !1),
      (this.readable = !0),
      (this.dataSize = 0),
      (this.maxDataSize = 2097152),
      (this.pauseStreams = !0),
      (this._released = !1),
      (this._streams = []),
      (this._currentStream = null),
      (this._insideLoop = !1),
      (this._pendingNext = !1));
  }
  Ca.inherits(L, Stream);
  L.create = function (e) {
    var t = new this();
    e = e || {};
    for (var key in e) t[key] = e[key];
    return t;
  };
  L.isStreamLike = function (e) {
    return (
      typeof e !== "function" &&
      typeof e !== "string" &&
      typeof e !== "boolean" &&
      typeof e !== "number" &&
      !Buffer.isBuffer(e)
    );
  };
  L.prototype.append = function (e) {
    var isStreamLike = L.isStreamLike(e);
    if (isStreamLike) {
      if (!(e instanceof En)) {
        var create = En.create(e, { maxDataSize: 1 / 0, pauseStream: this.pauseStreams });
        (e.on("data", this._checkDataSize.bind(this)), (e = create));
      }
      if ((this._handleErrors(e), this.pauseStreams)) e.pause();
    }
    return (this._streams.push(e), this);
  };
  L.prototype.pipe = function (e, t) {
    return (Stream.prototype.pipe.call(this, e, t), this.resume(), e);
  };
  L.prototype._getNext = function () {
    if (((this._currentStream = null), this._insideLoop)) {
      this._pendingNext = !0;
      return;
    }
    this._insideLoop = !0;
    try {
      do ((this._pendingNext = !1), this._realGetNext());
      while (this._pendingNext);
    } finally {
      this._insideLoop = !1;
    }
  };
  L.prototype._realGetNext = function () {
    var e = this._streams.shift();
    if (typeof e > "u") {
      this.end();
      return;
    }
    if (typeof e !== "function") {
      this._pipeNext(e);
      return;
    }
    var t = e;
    t(
      function (r) {
        var isStreamLike = L.isStreamLike(r);
        if (isStreamLike) (r.on("data", this._checkDataSize.bind(this)), this._handleErrors(r));
        this._pipeNext(r);
      }.bind(this),
    );
  };
  L.prototype._pipeNext = function (e) {
    this._currentStream = e;
    var isStreamLike = L.isStreamLike(e);
    if (isStreamLike) {
      (e.on("end", this._getNext.bind(this)), e.pipe(this, { end: !1 }));
      return;
    }
    var r = e;
    (this.write(r), this._getNext());
  };
  L.prototype._handleErrors = function (e) {
    var t = this;
    e.on("error", function (r) {
      t._emitError(r);
    });
  };
  L.prototype.write = function (e) {
    this.emit("data", e);
  };
  L.prototype.pause = function () {
    if (!this.pauseStreams) return;
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.pause == "function")
      this._currentStream.pause();
    this.emit("pause");
  };
  L.prototype.resume = function () {
    if (!this._released) ((this._released = !0), (this.writable = !0), this._getNext());
    if (this.pauseStreams && this._currentStream && typeof this._currentStream.resume == "function")
      this._currentStream.resume();
    this.emit("resume");
  };
  L.prototype.end = function () {
    (this._reset(), this.emit("end"));
  };
  L.prototype.destroy = function () {
    (this._reset(), this.emit("close"));
  };
  L.prototype._reset = function () {
    ((this.writable = !1), (this._streams = []), (this._currentStream = null));
  };
  L.prototype._checkDataSize = function () {
    if ((this._updateDataSize(), this.dataSize <= this.maxDataSize)) return;
    var e = "DelayedStream#maxDataSize of " + this.maxDataSize + " bytes exceeded.";
    this._emitError(Error(e));
  };
  L.prototype._updateDataSize = function () {
    this.dataSize = 0;
    var e = this;
    if (
      (this._streams.forEach(function (_stream) {
        if (!_stream.dataSize) return;
        e.dataSize += _stream.dataSize;
      }),
      this._currentStream && this._currentStream.dataSize)
    )
      this.dataSize += this._currentStream.dataSize;
  };
  L.prototype._emitError = function (e) {
    (this._reset(), this.emit("error", e));
  };
});

export { xn };
