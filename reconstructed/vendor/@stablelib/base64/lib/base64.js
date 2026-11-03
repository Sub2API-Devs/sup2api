/**
 * @stablelib/base64/lib/base64.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @stablelib/base64@1.0.1
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-hwmsct5x.js:4328-7869 cjs-fingerprint
var Cu = x(function (nt) {
  var im =
    (nt && nt.__extends) ||
    (function () {
      var e = function (n, r) {
        return (
          (e =
            Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array &&
              function (s, h) {
                s.__proto__ = h;
              }) ||
            function (s, h) {
              for (var key in h) if (h.hasOwnProperty(key)) s[key] = h[key];
            }),
          e(n, r)
        );
      };
      return function (n, r) {
        e(n, r);
        function s() {
          this.constructor = n;
        }
        n.prototype = r === null ? Object.create(r) : ((s.prototype = r.prototype), new s());
      };
    })();
  Object.defineProperty(nt, "__esModule", { value: !0 });
  var Ce = 256,
    ia = (function () {
      function e(n) {
        if (n === void 0) n = "=";
        this._paddingCharacter = n;
      }
      return (
        (e.prototype.encodedLength = function (n) {
          if (!this._paddingCharacter) return ((n * 8 + 5) / 6) | 0;
          return (((n + 2) / 3) * 4) | 0;
        }),
        (e.prototype.encode = function (n) {
          var r = "",
            s = 0;
          for (; s < n.length - 2; s += 3) {
            var h = (n[s] << 16) | (n[s + 1] << 8) | n[s + 2];
            ((r += this._encodeByte((h >>> 18) & 63)),
              (r += this._encodeByte((h >>> 12) & 63)),
              (r += this._encodeByte((h >>> 6) & 63)),
              (r += this._encodeByte((h >>> 0) & 63)));
          }
          var y = n.length - s;
          if (y > 0) {
            var h = (n[s] << 16) | (y === 2 ? n[s + 1] << 8 : 0);
            if (((r += this._encodeByte((h >>> 18) & 63)), (r += this._encodeByte((h >>> 12) & 63)), y === 2))
              r += this._encodeByte((h >>> 6) & 63);
            else r += this._paddingCharacter || "";
            r += this._paddingCharacter || "";
          }
          return r;
        }),
        (e.prototype.maxDecodedLength = function (n) {
          if (!this._paddingCharacter) return ((n * 6 + 7) / 8) | 0;
          return ((n / 4) * 3) | 0;
        }),
        (e.prototype.decodedLength = function (n) {
          return this.maxDecodedLength(n.length - this._getPaddingLength(n));
        }),
        (e.prototype.decode = function (n) {
          if (n.length === 0) return new Uint8Array(0);
          var _getPaddingLength = this._getPaddingLength(n),
            s = n.length - _getPaddingLength,
            uint8Array = new Uint8Array(this.maxDecodedLength(s)),
            y = 0,
            w = 0,
            S = 0,
            E = 0,
            R = 0,
            L = 0,
            O = 0;
          for (; w < s - 4; w += 4)
            ((E = this._decodeChar(n.charCodeAt(w + 0))),
              (R = this._decodeChar(n.charCodeAt(w + 1))),
              (L = this._decodeChar(n.charCodeAt(w + 2))),
              (O = this._decodeChar(n.charCodeAt(w + 3))),
              (uint8Array[y++] = (E << 2) | (R >>> 4)),
              (uint8Array[y++] = (R << 4) | (L >>> 2)),
              (uint8Array[y++] = (L << 6) | O),
              (S |= E & Ce),
              (S |= R & Ce),
              (S |= L & Ce),
              (S |= O & Ce));
          if (w < s - 1)
            ((E = this._decodeChar(n.charCodeAt(w))),
              (R = this._decodeChar(n.charCodeAt(w + 1))),
              (uint8Array[y++] = (E << 2) | (R >>> 4)),
              (S |= E & Ce),
              (S |= R & Ce));
          if (w < s - 2)
            ((L = this._decodeChar(n.charCodeAt(w + 2))),
              (uint8Array[y++] = (R << 4) | (L >>> 2)),
              (S |= L & Ce));
          if (w < s - 3)
            ((O = this._decodeChar(n.charCodeAt(w + 3))), (uint8Array[y++] = (L << 6) | O), (S |= O & Ce));
          if (S !== 0) throw Error("Base64Coder: incorrect characters for decoding");
          return uint8Array;
        }),
        (e.prototype._encodeByte = function (n) {
          var r = n;
          return (
            (r += 65),
            (r += ((25 - n) >>> 8) & 6),
            (r += ((51 - n) >>> 8) & -75),
            (r += ((61 - n) >>> 8) & -15),
            (r += ((62 - n) >>> 8) & 3),
            String.fromCharCode(r)
          );
        }),
        (e.prototype._decodeChar = function (n) {
          var r = Ce;
          return (
            (r += (((42 - n) & (n - 44)) >>> 8) & (-Ce + n - 43 + 62)),
            (r += (((46 - n) & (n - 48)) >>> 8) & (-Ce + n - 47 + 63)),
            (r += (((47 - n) & (n - 58)) >>> 8) & (-Ce + n - 48 + 52)),
            (r += (((64 - n) & (n - 91)) >>> 8) & (-Ce + n - 65 + 0)),
            (r += (((96 - n) & (n - 123)) >>> 8) & (-Ce + n - 97 + 26)),
            r
          );
        }),
        (e.prototype._getPaddingLength = function (n) {
          var r = 0;
          if (this._paddingCharacter) {
            for (var s = n.length - 1; s >= 0; s--) {
              if (n[s] !== this._paddingCharacter) break;
              r++;
            }
            if (n.length < 4 || r > 2) throw Error("Base64Coder: incorrect padding");
          }
          return r;
        }),
        e
      );
    })();
  nt.Coder = ia;
  var xr = new ia();
  function am(e) {
    return xr.encode(e);
  }
  nt.encode = am;
  function lm(e) {
    return xr.decode(e);
  }
  nt.decode = lm;
  var Ou = (function (e) {
    im(n, e);
    function n() {
      return (e !== null && e.apply(this, arguments)) || this;
    }
    return (
      (n.prototype._encodeByte = function (r) {
        var s = r;
        return (
          (s += 65),
          (s += ((25 - r) >>> 8) & 6),
          (s += ((51 - r) >>> 8) & -75),
          (s += ((61 - r) >>> 8) & -13),
          (s += ((62 - r) >>> 8) & 49),
          String.fromCharCode(s)
        );
      }),
      (n.prototype._decodeChar = function (r) {
        var s = Ce;
        return (
          (s += (((44 - r) & (r - 46)) >>> 8) & (-Ce + r - 45 + 62)),
          (s += (((94 - r) & (r - 96)) >>> 8) & (-Ce + r - 95 + 63)),
          (s += (((47 - r) & (r - 58)) >>> 8) & (-Ce + r - 48 + 52)),
          (s += (((64 - r) & (r - 91)) >>> 8) & (-Ce + r - 65 + 0)),
          (s += (((96 - r) & (r - 123)) >>> 8) & (-Ce + r - 97 + 26)),
          s
        );
      }),
      n
    );
  })(ia);
  nt.URLSafeCoder = Ou;
  var Pu = new Ou();
  function um(e) {
    return Pu.encode(e);
  }
  nt.encodeURLSafe = um;
  function dm(e) {
    return Pu.decode(e);
  }
  nt.decodeURLSafe = dm;
  nt.encodedLength = function (e) {
    return xr.encodedLength(e);
  };
  nt.maxDecodedLength = function (e) {
    return xr.maxDecodedLength(e);
  };
  nt.decodedLength = function (e) {
    return xr.decodedLength(e);
  };
});

export { Cu };
