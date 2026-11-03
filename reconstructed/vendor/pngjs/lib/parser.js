/**
 * pngjs/lib/parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { se } from "./constants.js";
import { dt } from "./crc.js";

//@ chunk-spjgqa4y.js:27104-31843 cjs-fingerprint
var pt = x(function (Kl, Hr) {
  var g = se(),
    Mo = dt(),
    C = (Hr.exports = function (t, e) {
      ((this._options = t),
        (t.checkCRC = t.checkCRC !== !1),
        (this._hasIHDR = !1),
        (this._hasIEND = !1),
        (this._emittedHeadersFinished = !1),
        (this._palette = []),
        (this._colorType = 0),
        (this._chunks = {}),
        (this._chunks[g.TYPE_IHDR] = this._handleIHDR.bind(this)),
        (this._chunks[g.TYPE_IEND] = this._handleIEND.bind(this)),
        (this._chunks[g.TYPE_IDAT] = this._handleIDAT.bind(this)),
        (this._chunks[g.TYPE_PLTE] = this._handlePLTE.bind(this)),
        (this._chunks[g.TYPE_tRNS] = this._handleTRNS.bind(this)),
        (this._chunks[g.TYPE_gAMA] = this._handleGAMA.bind(this)),
        (this.read = e.read),
        (this.error = e.error),
        (this.metadata = e.metadata),
        (this.gamma = e.gamma),
        (this.transColor = e.transColor),
        (this.palette = e.palette),
        (this.parsed = e.parsed),
        (this.inflateData = e.inflateData),
        (this.finished = e.finished),
        (this.simpleTransparency = e.simpleTransparency),
        (this.headersFinished = e.headersFinished || function () {}));
    });
  C.prototype.start = function () {
    this.read(g.PNG_SIGNATURE.length, this._parseSignature.bind(this));
  };
  C.prototype._parseSignature = function (t) {
    let PNG_SIGNATURE = g.PNG_SIGNATURE;
    for (let r = 0; r < PNG_SIGNATURE.length; r++)
      if (t[r] !== PNG_SIGNATURE[r]) {
        this.error(Error("Invalid file signature"));
        return;
      }
    this.read(8, this._parseChunkBegin.bind(this));
  };
  C.prototype._parseChunkBegin = function (t) {
    let uInt32BE = t.readUInt32BE(0),
      uInt32BE_2 = t.readUInt32BE(4),
      n = "";
    for (let o = 4; o < 8; o++) n += String.fromCharCode(t[o]);
    let i = Boolean(t[4] & 32);
    if (!this._hasIHDR && uInt32BE_2 !== g.TYPE_IHDR) {
      this.error(Error("Expected IHDR on beggining"));
      return;
    }
    if (((this._crc = new Mo()), this._crc.write(Buffer.from(n)), this._chunks[uInt32BE_2]))
      return this._chunks[uInt32BE_2](uInt32BE);
    if (!i) {
      this.error(Error("Unsupported critical chunk type " + n));
      return;
    }
    this.read(uInt32BE + 4, this._skipChunk.bind(this));
  };
  C.prototype._skipChunk = function () {
    this.read(8, this._parseChunkBegin.bind(this));
  };
  C.prototype._handleChunkEnd = function () {
    this.read(4, this._parseChunkEnd.bind(this));
  };
  C.prototype._parseChunkEnd = function (t) {
    let int32BE = t.readInt32BE(0),
      crc32 = this._crc.crc32();
    if (this._options.checkCRC && crc32 !== int32BE) {
      this.error(Error("Crc error - " + int32BE + " - " + crc32));
      return;
    }
    if (!this._hasIEND) this.read(8, this._parseChunkBegin.bind(this));
  };
  C.prototype._handleIHDR = function (t) {
    this.read(t, this._parseIHDR.bind(this));
  };
  C.prototype._parseIHDR = function (t) {
    this._crc.write(t);
    let uInt32BE = t.readUInt32BE(0),
      uInt32BE_2 = t.readUInt32BE(4),
      n = t[8],
      i = t[9],
      o = t[10],
      s = t[11],
      l = t[12];
    if (n !== 8 && n !== 4 && n !== 2 && n !== 1 && n !== 16) {
      this.error(Error("Unsupported bit depth " + n));
      return;
    }
    if (!(i in g.COLORTYPE_TO_BPP_MAP)) {
      this.error(Error("Unsupported color type"));
      return;
    }
    if (o !== 0) {
      this.error(Error("Unsupported compression method"));
      return;
    }
    if (s !== 0) {
      this.error(Error("Unsupported filter method"));
      return;
    }
    if (l !== 0 && l !== 1) {
      this.error(Error("Unsupported interlace method"));
      return;
    }
    this._colorType = i;
    let u = g.COLORTYPE_TO_BPP_MAP[this._colorType];
    ((this._hasIHDR = !0),
      this.metadata({
        width: uInt32BE,
        height: uInt32BE_2,
        depth: n,
        interlace: Boolean(l),
        palette: Boolean(i & g.COLORTYPE_PALETTE),
        color: Boolean(i & g.COLORTYPE_COLOR),
        alpha: Boolean(i & g.COLORTYPE_ALPHA),
        bpp: u,
        colorType: i,
      }),
      this._handleChunkEnd());
  };
  C.prototype._handlePLTE = function (t) {
    this.read(t, this._parsePLTE.bind(this));
  };
  C.prototype._parsePLTE = function (t) {
    this._crc.write(t);
    let floored = Math.floor(t.length / 3);
    for (let r = 0; r < floored; r++) this._palette.push([t[r * 3], t[r * 3 + 1], t[r * 3 + 2], 255]);
    (this.palette(this._palette), this._handleChunkEnd());
  };
  C.prototype._handleTRNS = function (t) {
    (this.simpleTransparency(), this.read(t, this._parseTRNS.bind(this)));
  };
  C.prototype._parseTRNS = function (t) {
    if ((this._crc.write(t), this._colorType === g.COLORTYPE_PALETTE_COLOR)) {
      if (this._palette.length === 0) {
        this.error(Error("Transparency chunk must be after palette"));
        return;
      }
      if (t.length > this._palette.length) {
        this.error(Error("More transparent colors than palette size"));
        return;
      }
      for (let e = 0; e < t.length; e++) this._palette[e][3] = t[e];
      this.palette(this._palette);
    }
    if (this._colorType === g.COLORTYPE_GRAYSCALE) this.transColor([t.readUInt16BE(0)]);
    if (this._colorType === g.COLORTYPE_COLOR)
      this.transColor([t.readUInt16BE(0), t.readUInt16BE(2), t.readUInt16BE(4)]);
    this._handleChunkEnd();
  };
  C.prototype._handleGAMA = function (t) {
    this.read(t, this._parseGAMA.bind(this));
  };
  C.prototype._parseGAMA = function (t) {
    (this._crc.write(t), this.gamma(t.readUInt32BE(0) / g.GAMMA_DIVISION), this._handleChunkEnd());
  };
  C.prototype._handleIDAT = function (t) {
    if (!this._emittedHeadersFinished) ((this._emittedHeadersFinished = !0), this.headersFinished());
    this.read(-t, this._parseIDAT.bind(this, t));
  };
  C.prototype._parseIDAT = function (t, e) {
    if ((this._crc.write(e), this._colorType === g.COLORTYPE_PALETTE_COLOR && this._palette.length === 0))
      throw Error("Expected palette not found");
    this.inflateData(e);
    let r = t - e.length;
    if (r > 0) this._handleIDAT(r);
    else this._handleChunkEnd();
  };
  C.prototype._handleIEND = function (t) {
    this.read(t, this._parseIEND.bind(this));
  };
  C.prototype._parseIEND = function (t) {
    if ((this._crc.write(t), (this._hasIEND = !0), this._handleChunkEnd(), this.finished)) this.finished();
  };
});

export { pt };
