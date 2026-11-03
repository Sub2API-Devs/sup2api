/**
 * pngjs/lib/png.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Kr } from "./parser-async.js";
import { sn } from "./packer-async.js";
import { In } from "./png-sync.js";

//@ chunk-spjgqa4y.js:48112-50618 cjs-fingerprint
var Ln = x(function (As) {
  var An = importMetaRequire("util"),
    Tt = importMetaRequire("stream"),
    xs = Kr(),
    Bs = sn(),
    Is = In(),
    A = (As.PNG = function (t) {
      if (
        (Tt.call(this),
        (t = t || {}),
        (this.width = t.width | 0),
        (this.height = t.height | 0),
        (this.data = this.width > 0 && this.height > 0 ? Buffer.alloc(4 * this.width * this.height) : null),
        t.fill && this.data)
      )
        this.data.fill(0);
      ((this.gamma = 0),
        (this.readable = this.writable = !0),
        (this._parser = new xs(t)),
        this._parser.on("error", this.emit.bind(this, "error")),
        this._parser.on("close", this._handleClose.bind(this)),
        this._parser.on("metadata", this._metadata.bind(this)),
        this._parser.on("gamma", this._gamma.bind(this)),
        this._parser.on(
          "parsed",
          function (e) {
            ((this.data = e), this.emit("parsed", e));
          }.bind(this),
        ),
        (this._packer = new Bs(t)),
        this._packer.on("data", this.emit.bind(this, "data")),
        this._packer.on("end", this.emit.bind(this, "end")),
        this._parser.on("close", this._handleClose.bind(this)),
        this._packer.on("error", this.emit.bind(this, "error")));
    });
  An.inherits(A, Tt);
  A.sync = Is;
  A.prototype.pack = function () {
    if (!this.data || !this.data.length) return (this.emit("error", "No data provided"), this);
    return (
      process.nextTick(
        function () {
          this._packer.pack(this.data, this.width, this.height, this.gamma);
        }.bind(this),
      ),
      this
    );
  };
  A.prototype.parse = function (t, e) {
    if (e) {
      let r, n;
      ((r = function (i) {
        (this.removeListener("error", n), (this.data = i), e(null, this));
      }.bind(this)),
        (n = function (i) {
          (this.removeListener("parsed", r), e(i, null));
        }.bind(this)),
        this.once("parsed", r),
        this.once("error", n));
    }
    return (this.end(t), this);
  };
  A.prototype.write = function (t) {
    return (this._parser.write(t), !0);
  };
  A.prototype.end = function (t) {
    this._parser.end(t);
  };
  A.prototype._metadata = function (t) {
    ((this.width = t.width), (this.height = t.height), this.emit("metadata", t));
  };
  A.prototype._gamma = function (t) {
    this.gamma = t;
  };
  A.prototype._handleClose = function () {
    if (!this._parser.writable && !this._packer.readable) this.emit("close");
  };
  A.bitblt = function (t, e, r, n, i, o, s, l) {
    if (
      ((r |= 0),
      (n |= 0),
      (i |= 0),
      (o |= 0),
      (s |= 0),
      (l |= 0),
      r > t.width || n > t.height || r + i > t.width || n + o > t.height)
    )
      throw Error("bitblt reading outside image");
    if (s > e.width || l > e.height || s + i > e.width || l + o > e.height)
      throw Error("bitblt writing outside image");
    for (let u = 0; u < o; u++)
      t.data.copy(
        e.data,
        ((l + u) * e.width + s) << 2,
        ((n + u) * t.width + r) << 2,
        ((n + u) * t.width + r + i) << 2,
      );
  };
  A.prototype.bitblt = function (t, e, r, n, i, o, s) {
    return (A.bitblt(this, t, e, r, n, i, o, s), this);
  };
  A.adjustGamma = function (t) {
    if (t.gamma) {
      for (let e = 0; e < t.height; e++)
        for (let r = 0; r < t.width; r++) {
          let n = (t.width * e + r) << 2;
          for (let i = 0; i < 3; i++) {
            let o = t.data[n + i] / 255;
            ((o = Math.pow(o, 0.45454545454545453 / t.gamma)), (t.data[n + i] = Math.round(o * 255)));
          }
        }
      t.gamma = 0;
    }
  };
  A.prototype.adjustGamma = function () {
    A.adjustGamma(this);
  };
});

export { Ln };
