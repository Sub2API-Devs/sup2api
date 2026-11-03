/**
 * pngjs/lib/filter-parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { lt } from "./interlace.js";
import { ut } from "./paeth-predictor.js";

//@ chunk-spjgqa4y.js:23978-25954 cjs-fingerprint
var ft = x(function (zl, Nr) {
  var Or = lt(),
    So = ut();
  function Mr(t, e, r) {
    let n = t * e;
    if (r !== 8) n = Math.ceil(n / (8 / r));
    return n;
  }
  var oe = (Nr.exports = function (t, e) {
    let { width: width, height: height, interlace: interlace, bpp: bpp, depth: depth } = t;
    if (
      ((this.read = e.read),
      (this.write = e.write),
      (this.complete = e.complete),
      (this._imageIndex = 0),
      (this._images = []),
      interlace)
    ) {
      let imagePasses = Or.getImagePasses(width, height);
      for (let u = 0; u < imagePasses.length; u++)
        this._images.push({
          byteWidth: Mr(imagePasses[u].width, bpp, depth),
          height: imagePasses[u].height,
          lineIndex: 0,
        });
    } else this._images.push({ byteWidth: Mr(width, bpp, depth), height: height, lineIndex: 0 });
    if (depth === 8) this._xComparison = bpp;
    else if (depth === 16) this._xComparison = bpp * 2;
    else this._xComparison = 1;
  });
  oe.prototype.start = function () {
    this.read(this._images[this._imageIndex].byteWidth + 1, this._reverseFilterLine.bind(this));
  };
  oe.prototype._unFilterType1 = function (t, e, r) {
    let _xComparison = this._xComparison,
      i = _xComparison - 1;
    for (let o = 0; o < r; o++) {
      let s = t[1 + o],
        l = o > i ? e[o - _xComparison] : 0;
      e[o] = s + l;
    }
  };
  oe.prototype._unFilterType2 = function (t, e, r) {
    let _lastLine = this._lastLine;
    for (let i = 0; i < r; i++) {
      let o = t[1 + i],
        s = _lastLine ? _lastLine[i] : 0;
      e[i] = o + s;
    }
  };
  oe.prototype._unFilterType3 = function (t, e, r) {
    let _xComparison = this._xComparison,
      i = _xComparison - 1,
      _lastLine = this._lastLine;
    for (let s = 0; s < r; s++) {
      let l = t[1 + s],
        u = _lastLine ? _lastLine[s] : 0,
        f = s > i ? e[s - _xComparison] : 0,
        floored = Math.floor((f + u) / 2);
      e[s] = l + floored;
    }
  };
  oe.prototype._unFilterType4 = function (t, e, r) {
    let _xComparison = this._xComparison,
      i = _xComparison - 1,
      _lastLine = this._lastLine;
    for (let s = 0; s < r; s++) {
      let l = t[1 + s],
        u = _lastLine ? _lastLine[s] : 0,
        f = s > i ? e[s - _xComparison] : 0,
        a = s > i && _lastLine ? _lastLine[s - _xComparison] : 0,
        h = So(f, u, a);
      e[s] = l + h;
    }
  };
  oe.prototype._reverseFilterLine = function (t) {
    let e = t[0],
      r,
      n = this._images[this._imageIndex],
      byteWidth = n.byteWidth;
    if (e === 0) r = t.slice(1, byteWidth + 1);
    else
      switch (((r = Buffer.alloc(byteWidth)), e)) {
        case 1:
          this._unFilterType1(t, r, byteWidth);
          break;
        case 2:
          this._unFilterType2(t, r, byteWidth);
          break;
        case 3:
          this._unFilterType3(t, r, byteWidth);
          break;
        case 4:
          this._unFilterType4(t, r, byteWidth);
          break;
        default:
          throw Error("Unrecognised filter type - " + e);
      }
    if ((this.write(r), n.lineIndex++, n.lineIndex >= n.height))
      ((this._lastLine = null), this._imageIndex++, (n = this._images[this._imageIndex]));
    else this._lastLine = r;
    if (n) this.read(n.byteWidth + 1, this._reverseFilterLine.bind(this));
    else ((this._lastLine = null), this.complete());
  };
});

export { ft };
