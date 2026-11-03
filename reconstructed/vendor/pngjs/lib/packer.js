/**
 * pngjs/lib/packer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { se } from "./constants.js";
import { dt } from "./crc.js";
import { jr } from "./bitpacker.js";
import { Zr } from "./filter-pack.js";

//@ chunk-spjgqa4y.js:40773-42993 cjs-fingerprint
var yt = x(function ($l, en) {
  var y = se(),
    $r = dt(),
    os = jr(),
    ss = Zr(),
    Xr = importMetaRequire("zlib"),
    z = (en.exports = function (t) {
      if (
        ((this._options = t),
        (t.deflateChunkSize = t.deflateChunkSize || 32768),
        (t.deflateLevel = t.deflateLevel != null ? t.deflateLevel : 9),
        (t.deflateStrategy = t.deflateStrategy != null ? t.deflateStrategy : 3),
        (t.inputHasAlpha = t.inputHasAlpha != null ? t.inputHasAlpha : !0),
        (t.deflateFactory = t.deflateFactory || Xr.createDeflate),
        (t.bitDepth = t.bitDepth || 8),
        (t.colorType = typeof t.colorType === "number" ? t.colorType : y.COLORTYPE_COLOR_ALPHA),
        (t.inputColorType =
          typeof t.inputColorType === "number" ? t.inputColorType : y.COLORTYPE_COLOR_ALPHA),
        [y.COLORTYPE_GRAYSCALE, y.COLORTYPE_COLOR, y.COLORTYPE_COLOR_ALPHA, y.COLORTYPE_ALPHA].indexOf(
          t.colorType,
        ) === -1)
      )
        throw Error("option color type:" + t.colorType + " is not supported at present");
      if (
        [y.COLORTYPE_GRAYSCALE, y.COLORTYPE_COLOR, y.COLORTYPE_COLOR_ALPHA, y.COLORTYPE_ALPHA].indexOf(
          t.inputColorType,
        ) === -1
      )
        throw Error("option input color type:" + t.inputColorType + " is not supported at present");
      if (t.bitDepth !== 8 && t.bitDepth !== 16)
        throw Error("option bit depth:" + t.bitDepth + " is not supported at present");
    });
  z.prototype.getDeflateOptions = function () {
    return {
      chunkSize: this._options.deflateChunkSize,
      level: this._options.deflateLevel,
      strategy: this._options.deflateStrategy,
    };
  };
  z.prototype.createDeflate = function () {
    return this._options.deflateFactory(this.getDeflateOptions());
  };
  z.prototype.filterData = function (t, e, r) {
    let n = os(t, e, r, this._options),
      i = y.COLORTYPE_TO_BPP_MAP[this._options.colorType];
    return ss(n, e, r, this._options, i);
  };
  z.prototype._packChunk = function (t, e) {
    let r = e ? e.length : 0,
      alloc = Buffer.alloc(r + 12);
    if ((alloc.writeUInt32BE(r, 0), alloc.writeUInt32BE(t, 4), e)) e.copy(alloc, 8);
    return (alloc.writeInt32BE($r.crc32(alloc.slice(4, alloc.length - 4)), alloc.length - 4), alloc);
  };
  z.prototype.packGAMA = function (t) {
    let alloc = Buffer.alloc(4);
    return (alloc.writeUInt32BE(Math.floor(t * y.GAMMA_DIVISION), 0), this._packChunk(y.TYPE_gAMA, alloc));
  };
  z.prototype.packIHDR = function (t, e) {
    let alloc = Buffer.alloc(13);
    return (
      alloc.writeUInt32BE(t, 0),
      alloc.writeUInt32BE(e, 4),
      (alloc[8] = this._options.bitDepth),
      (alloc[9] = this._options.colorType),
      (alloc[10] = 0),
      (alloc[11] = 0),
      (alloc[12] = 0),
      this._packChunk(y.TYPE_IHDR, alloc)
    );
  };
  z.prototype.packIDAT = function (t) {
    return this._packChunk(y.TYPE_IDAT, t);
  };
  z.prototype.packIEND = function () {
    return this._packChunk(y.TYPE_IEND, null);
  };
});

export { yt };
