/**
 * pngjs/lib/packer-async.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { se } from "./constants.js";
import { yt } from "./packer.js";

//@ chunk-spjgqa4y.js:42993-43714 cjs-fingerprint
var sn = x(function (Xl, on) {
  var tn = importMetaRequire("util"),
    wt = importMetaRequire("stream"),
    rn = se(),
    ls = yt(),
    nn = (on.exports = function (t) {
      wt.call(this);
      let e = t || {};
      ((this._packer = new ls(e)), (this._deflate = this._packer.createDeflate()), (this.readable = !0));
    });
  tn.inherits(nn, wt);
  nn.prototype.pack = function (t, e, r, n) {
    if ((this.emit("data", Buffer.from(rn.PNG_SIGNATURE)), this.emit("data", this._packer.packIHDR(e, r)), n))
      this.emit("data", this._packer.packGAMA(n));
    let filterData = this._packer.filterData(t, e, r);
    (this._deflate.on("error", this.emit.bind(this, "error")),
      this._deflate.on(
        "data",
        function (o) {
          this.emit("data", this._packer.packIDAT(o));
        }.bind(this),
      ),
      this._deflate.on(
        "end",
        function () {
          (this.emit("data", this._packer.packIEND()), this.emit("end"));
        }.bind(this),
      ),
      this._deflate.end(filterData));
  };
});

export { sn };
