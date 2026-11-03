/**
 * pngjs/lib/parser-async.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { st } from "./chunkstream.js";
import { Fr } from "./filter-parse-async.js";
import { pt } from "./parser.js";
import { gt } from "./bitmapper.js";
import { _t } from "./format-normaliser.js";

//@ chunk-spjgqa4y.js:34825-37285 cjs-fingerprint
var Kr = x(function (Jl, Vr) {
  var Gr = importMetaRequire("util"),
    le = importMetaRequire("zlib"),
    mt = st(),
    vo = Fr(),
    Vo = pt(),
    vr = gt(),
    Ko = _t(),
    M = (Vr.exports = function (t) {
      (mt.call(this),
        (this._parser = new Vo(t, {
          read: this.read.bind(this),
          error: this._handleError.bind(this),
          metadata: this._handleMetaData.bind(this),
          gamma: this.emit.bind(this, "gamma"),
          palette: this._handlePalette.bind(this),
          transColor: this._handleTransColor.bind(this),
          finished: this._finished.bind(this),
          inflateData: this._inflateData.bind(this),
          simpleTransparency: this._simpleTransparency.bind(this),
          headersFinished: this._headersFinished.bind(this),
        })),
        (this._options = t),
        (this.writable = !0),
        this._parser.start());
    });
  Gr.inherits(M, mt);
  M.prototype._handleError = function (t) {
    if ((this.emit("error", t), (this.writable = !1), this.destroy(), this._inflate && this._inflate.destroy))
      this._inflate.destroy();
    if (this._filter) (this._filter.destroy(), this._filter.on("error", function () {}));
    this.errord = !0;
  };
  M.prototype._inflateData = function (t) {
    if (!this._inflate)
      if (this._bitmapInfo.interlace)
        ((this._inflate = le.createInflate()),
          this._inflate.on("error", this.emit.bind(this, "error")),
          this._filter.on("complete", this._complete.bind(this)),
          this._inflate.pipe(this._filter));
      else {
        let r =
            (((this._bitmapInfo.width * this._bitmapInfo.bpp * this._bitmapInfo.depth + 7) >> 3) + 1) *
            this._bitmapInfo.height,
          max = Math.max(r, le.Z_MIN_CHUNK);
        this._inflate = le.createInflate({ chunkSize: max });
        let i = r,
          o = this.emit.bind(this, "error");
        (this._inflate.on("error", function (l) {
          if (!i) return;
          o(l);
        }),
          this._filter.on("complete", this._complete.bind(this)));
        let s = this._filter.write.bind(this._filter);
        (this._inflate.on("data", function (l) {
          if (!i) return;
          if (l.length > i) l = l.slice(0, i);
          ((i -= l.length), s(l));
        }),
          this._inflate.on("end", this._filter.end.bind(this._filter)));
      }
    this._inflate.write(t);
  };
  M.prototype._handleMetaData = function (t) {
    ((this._metaData = t), (this._bitmapInfo = Object.create(t)), (this._filter = new vo(this._bitmapInfo)));
  };
  M.prototype._handleTransColor = function (t) {
    this._bitmapInfo.transColor = t;
  };
  M.prototype._handlePalette = function (t) {
    this._bitmapInfo.palette = t;
  };
  M.prototype._simpleTransparency = function () {
    this._metaData.alpha = !0;
  };
  M.prototype._headersFinished = function () {
    this.emit("metadata", this._metaData);
  };
  M.prototype._finished = function () {
    if (this.errord) return;
    if (!this._inflate) this.emit("error", "No Inflate block");
    else this._inflate.end();
  };
  M.prototype._complete = function (t) {
    if (this.errord) return;
    let e;
    try {
      let dataToBitMap = vr.dataToBitMap(t, this._bitmapInfo);
      ((e = Ko(dataToBitMap, this._bitmapInfo)), (dataToBitMap = null));
    } catch (error) {
      this._handleError(error);
      return;
    }
    this.emit("parsed", e);
  };
});

export { Kr };
