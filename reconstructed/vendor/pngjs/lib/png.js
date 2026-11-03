/**
 * pngjs/lib/png.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_parser_async } from "./parser-async.js";
import { require_packer_async } from "./packer-async.js";
import { require_png_sync } from "./png-sync.js";

//@ chunk-spjgqa4y.js:48112-50618 cjs-fingerprint
var require_png = x(function (cjsExports) {
  var util = importMetaRequire("util");
  var Stream = importMetaRequire("stream");
  var Parser = require_parser_async();
  var Packer = require_packer_async();
  var PNGSync = require_png_sync();
  var PNG = (cjsExports.PNG = function (options) {
    Stream.call(this);
    options = options || {};
    this.width = options.width | 0;
    this.height = options.height | 0;
    this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null;
    if (options.fill && this.data) this.data.fill(0);
    this.gamma = 0;
    this.readable = this.writable = true;
    this._parser = new Parser(options);
    this._parser.on("error", this.emit.bind(this, "error"));
    this._parser.on("close", this._handleClose.bind(this));
    this._parser.on("metadata", this._metadata.bind(this));
    this._parser.on("gamma", this._gamma.bind(this));
    this._parser.on(
      "parsed",
      function (data) {
        this.data = data;
        this.emit("parsed", data);
      }.bind(this),
    );
    this._packer = new Packer(options);
    this._packer.on("data", this.emit.bind(this, "data"));
    this._packer.on("end", this.emit.bind(this, "end"));
    this._parser.on("close", this._handleClose.bind(this));
    this._packer.on("error", this.emit.bind(this, "error"));
  });
  util.inherits(PNG, Stream);
  PNG.sync = PNGSync;
  PNG.prototype.pack = function () {
    if (!this.data || !this.data.length) {
      this.emit("error", "No data provided");
      return this;
    }
    process.nextTick(
      function () {
        this._packer.pack(this.data, this.width, this.height, this.gamma);
      }.bind(this),
    );
    return this;
  };
  PNG.prototype.parse = function (data, callback) {
    if (callback) {
      let onParsed;
      let onError;
      onParsed = function (parsedData) {
        this.removeListener("error", onError);
        this.data = parsedData;
        callback(null, this);
      }.bind(this);
      onError = function (err) {
        this.removeListener("parsed", onParsed);
        callback(err, null);
      }.bind(this);
      this.once("parsed", onParsed);
      this.once("error", onError);
    }
    this.end(data);
    return this;
  };
  PNG.prototype.write = function (data) {
    this._parser.write(data);
    return true;
  };
  PNG.prototype.end = function (data) {
    this._parser.end(data);
  };
  PNG.prototype._metadata = function (metadata) {
    this.width = metadata.width;
    this.height = metadata.height;
    this.emit("metadata", metadata);
  };
  PNG.prototype._gamma = function (gamma) {
    this.gamma = gamma;
  };
  PNG.prototype._handleClose = function () {
    if (!this._parser.writable && !this._packer.readable) this.emit("close");
  };
  PNG.bitblt = function (src, dst, srcX, srcY, width, height, deltaX, deltaY) {
    srcX |= 0;
    srcY |= 0;
    width |= 0;
    height |= 0;
    deltaX |= 0;
    deltaY |= 0;
    if (srcX > src.width || srcY > src.height || srcX + width > src.width || srcY + height > src.height)
      throw Error("bitblt reading outside image");
    if (
      deltaX > dst.width ||
      deltaY > dst.height ||
      deltaX + width > dst.width ||
      deltaY + height > dst.height
    )
      throw Error("bitblt writing outside image");
    for (let y = 0; y < height; y++)
      src.data.copy(
        dst.data,
        ((deltaY + y) * dst.width + deltaX) << 2,
        ((srcY + y) * src.width + srcX) << 2,
        ((srcY + y) * src.width + srcX + width) << 2,
      );
  };
  PNG.prototype.bitblt = function (dst, srcX, srcY, width, height, deltaX, deltaY) {
    PNG.bitblt(this, dst, srcX, srcY, width, height, deltaX, deltaY);
    return this;
  };
  PNG.adjustGamma = function (src) {
    if (src.gamma) {
      for (let y = 0; y < src.height; y++)
        for (let x = 0; x < src.width; x++) {
          let idx = (src.width * y + x) << 2;
          for (let k = 0; k < 3; k++) {
            let sample = src.data[idx + k] / 255;
            sample = Math.pow(sample, 0.45454545454545453 / src.gamma);
            src.data[idx + k] = Math.round(sample * 255);
          }
        }
      src.gamma = 0;
    }
  };
  PNG.prototype.adjustGamma = function () {
    PNG.adjustGamma(this);
  };
});
export { require_png };
