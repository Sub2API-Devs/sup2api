/**
 * fast-sha256/sha256.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: fast-sha256@1.3.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-hwmsct5x.js:7869-14156 cjs-fingerprint
var Lu = x(function (Iu, as) {
  (function (e, n) {
    var r = {};
    n(r);
    var s = r.default;
    for (var key in r) s[key] = r[key];
    if (typeof as === "object" && typeof as.exports === "object") as.exports = s;
    else if (typeof define === "function" && define.amd)
      define(function () {
        return s;
      });
    else e.sha256 = s;
  })(Iu, function (e) {
    ((e.__esModule = !0), (e.digestLength = 32), (e.blockSize = 64));
    var uint32Array = new Uint32Array([
      1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221,
      3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580,
      3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882,
      2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912,
      1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411,
      3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556,
      883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452,
      2361852424, 2428436474, 2756734187, 3204031479, 3329325298,
    ]);
    function r(O, M, P, H, j) {
      var z, G, q, J, Z, Q, ne, te, ae, oe, ie, Se, De;
      while (j >= 64) {
        ((z = M[0]), (G = M[1]), (q = M[2]), (J = M[3]), (Z = M[4]), (Q = M[5]), (ne = M[6]), (te = M[7]));
        for (oe = 0; oe < 16; oe++)
          ((ie = H + oe * 4),
            (O[oe] =
              ((P[ie] & 255) << 24) |
              ((P[ie + 1] & 255) << 16) |
              ((P[ie + 2] & 255) << 8) |
              (P[ie + 3] & 255)));
        for (oe = 16; oe < 64; oe++)
          ((ae = O[oe - 2]),
            (Se = ((ae >>> 17) | (ae << 15)) ^ ((ae >>> 19) | (ae << 13)) ^ (ae >>> 10)),
            (ae = O[oe - 15]),
            (De = ((ae >>> 7) | (ae << 25)) ^ ((ae >>> 18) | (ae << 14)) ^ (ae >>> 3)),
            (O[oe] = ((Se + O[oe - 7]) | 0) + ((De + O[oe - 16]) | 0)));
        for (oe = 0; oe < 64; oe++)
          ((Se =
            ((((((Z >>> 6) | (Z << 26)) ^ ((Z >>> 11) | (Z << 21)) ^ ((Z >>> 25) | (Z << 7))) +
              ((Z & Q) ^ (~Z & ne))) |
              0) +
              ((te + ((uint32Array[oe] + O[oe]) | 0)) | 0)) |
            0),
            (De =
              ((((z >>> 2) | (z << 30)) ^ ((z >>> 13) | (z << 19)) ^ ((z >>> 22) | (z << 10))) +
                ((z & G) ^ (z & q) ^ (G & q))) |
              0),
            (te = ne),
            (ne = Q),
            (Q = Z),
            (Z = (J + Se) | 0),
            (J = q),
            (q = G),
            (G = z),
            (z = (Se + De) | 0));
        ((M[0] += z),
          (M[1] += G),
          (M[2] += q),
          (M[3] += J),
          (M[4] += Z),
          (M[5] += Q),
          (M[6] += ne),
          (M[7] += te),
          (H += 64),
          (j -= 64));
      }
      return H;
    }
    var s = (function () {
      function O() {
        ((this.digestLength = e.digestLength),
          (this.blockSize = e.blockSize),
          (this.state = new Int32Array(8)),
          (this.temp = new Int32Array(64)),
          (this.buffer = new Uint8Array(128)),
          (this.bufferLength = 0),
          (this.bytesHashed = 0),
          (this.finished = !1),
          this.reset());
      }
      return (
        (O.prototype.reset = function () {
          return (
            (this.state[0] = 1779033703),
            (this.state[1] = 3144134277),
            (this.state[2] = 1013904242),
            (this.state[3] = 2773480762),
            (this.state[4] = 1359893119),
            (this.state[5] = 2600822924),
            (this.state[6] = 528734635),
            (this.state[7] = 1541459225),
            (this.bufferLength = 0),
            (this.bytesHashed = 0),
            (this.finished = !1),
            this
          );
        }),
        (O.prototype.clean = function () {
          for (var M = 0; M < this.buffer.length; M++) this.buffer[M] = 0;
          for (var M = 0; M < this.temp.length; M++) this.temp[M] = 0;
          this.reset();
        }),
        (O.prototype.update = function (M, P) {
          if (P === void 0) P = M.length;
          if (this.finished) throw Error("SHA256: can't update because hash was finished.");
          var H = 0;
          if (((this.bytesHashed += P), this.bufferLength > 0)) {
            while (this.bufferLength < 64 && P > 0) ((this.buffer[this.bufferLength++] = M[H++]), P--);
            if (this.bufferLength === 64)
              (r(this.temp, this.state, this.buffer, 0, 64), (this.bufferLength = 0));
          }
          if (P >= 64) ((H = r(this.temp, this.state, M, H, P)), (P %= 64));
          while (P > 0) ((this.buffer[this.bufferLength++] = M[H++]), P--);
          return this;
        }),
        (O.prototype.finish = function (M) {
          if (!this.finished) {
            var bytesHashed = this.bytesHashed,
              bufferLength = this.bufferLength,
              j = (bytesHashed / 536870912) | 0,
              z = bytesHashed << 3,
              G = bytesHashed % 64 < 56 ? 64 : 128;
            this.buffer[bufferLength] = 128;
            for (var q = bufferLength + 1; q < G - 8; q++) this.buffer[q] = 0;
            ((this.buffer[G - 8] = (j >>> 24) & 255),
              (this.buffer[G - 7] = (j >>> 16) & 255),
              (this.buffer[G - 6] = (j >>> 8) & 255),
              (this.buffer[G - 5] = (j >>> 0) & 255),
              (this.buffer[G - 4] = (z >>> 24) & 255),
              (this.buffer[G - 3] = (z >>> 16) & 255),
              (this.buffer[G - 2] = (z >>> 8) & 255),
              (this.buffer[G - 1] = (z >>> 0) & 255),
              r(this.temp, this.state, this.buffer, 0, G),
              (this.finished = !0));
          }
          for (var q = 0; q < 8; q++)
            ((M[q * 4 + 0] = (this.state[q] >>> 24) & 255),
              (M[q * 4 + 1] = (this.state[q] >>> 16) & 255),
              (M[q * 4 + 2] = (this.state[q] >>> 8) & 255),
              (M[q * 4 + 3] = (this.state[q] >>> 0) & 255));
          return this;
        }),
        (O.prototype.digest = function () {
          var uint8Array = new Uint8Array(this.digestLength);
          return (this.finish(uint8Array), uint8Array);
        }),
        (O.prototype._saveState = function (M) {
          for (var P = 0; P < this.state.length; P++) M[P] = this.state[P];
        }),
        (O.prototype._restoreState = function (M, P) {
          for (var H = 0; H < this.state.length; H++) this.state[H] = M[H];
          ((this.bytesHashed = P), (this.finished = !1), (this.bufferLength = 0));
        }),
        O
      );
    })();
    e.Hash = s;
    var h = (function () {
      function O(M) {
        ((this.inner = new s()),
          (this.outer = new s()),
          (this.blockSize = this.inner.blockSize),
          (this.digestLength = this.inner.digestLength));
        var uint8Array = new Uint8Array(this.blockSize);
        if (M.length > this.blockSize) new s().update(M).finish(uint8Array).clean();
        else for (var H = 0; H < M.length; H++) uint8Array[H] = M[H];
        for (var H = 0; H < uint8Array.length; H++) uint8Array[H] ^= 54;
        this.inner.update(uint8Array);
        for (var H = 0; H < uint8Array.length; H++) uint8Array[H] ^= 106;
        (this.outer.update(uint8Array),
          (this.istate = new Uint32Array(8)),
          (this.ostate = new Uint32Array(8)),
          this.inner._saveState(this.istate),
          this.outer._saveState(this.ostate));
        for (var H = 0; H < uint8Array.length; H++) uint8Array[H] = 0;
      }
      return (
        (O.prototype.reset = function () {
          return (
            this.inner._restoreState(this.istate, this.inner.blockSize),
            this.outer._restoreState(this.ostate, this.outer.blockSize),
            this
          );
        }),
        (O.prototype.clean = function () {
          for (var M = 0; M < this.istate.length; M++) this.ostate[M] = this.istate[M] = 0;
          (this.inner.clean(), this.outer.clean());
        }),
        (O.prototype.update = function (M) {
          return (this.inner.update(M), this);
        }),
        (O.prototype.finish = function (M) {
          if (this.outer.finished) this.outer.finish(M);
          else (this.inner.finish(M), this.outer.update(M, this.digestLength).finish(M));
          return this;
        }),
        (O.prototype.digest = function () {
          var uint8Array = new Uint8Array(this.digestLength);
          return (this.finish(uint8Array), uint8Array);
        }),
        O
      );
    })();
    e.HMAC = h;
    function y(O) {
      var update = new s().update(O),
        digest = update.digest();
      return (update.clean(), digest);
    }
    ((e.hash = y), (e.default = y));
    function w(O, M) {
      var update = new h(O).update(M),
        digest = update.digest();
      return (update.clean(), digest);
    }
    e.hmac = w;
    function S(O, M, P, H) {
      var j = H[0];
      if (j === 0) throw Error("hkdf: cannot expand more");
      if ((M.reset(), j > 1)) M.update(O);
      if (P) M.update(P);
      (M.update(H), M.finish(O), H[0]++);
    }
    var uint8Array = new Uint8Array(e.digestLength);
    function R(O, M, P, H) {
      if (M === void 0) M = uint8Array;
      if (H === void 0) H = 32;
      var uint8Array_2 = new Uint8Array([1]),
        z = w(M, O),
        G = new h(z),
        uint8Array_3 = new Uint8Array(G.digestLength),
        J = uint8Array_3.length,
        uint8Array_4 = new Uint8Array(H);
      for (var Q = 0; Q < H; Q++) {
        if (J === uint8Array_3.length) (S(uint8Array_3, G, P, uint8Array_2), (J = 0));
        uint8Array_4[Q] = uint8Array_3[J++];
      }
      return (G.clean(), uint8Array_3.fill(0), uint8Array_2.fill(0), uint8Array_4);
    }
    e.hkdf = R;
    function L(O, M, P, H) {
      var j = new h(O),
        digestLength = j.digestLength,
        uint8Array = new Uint8Array(4),
        uint8Array_2 = new Uint8Array(digestLength),
        uint8Array_3 = new Uint8Array(digestLength),
        uint8Array_4 = new Uint8Array(H);
      for (var Q = 0; Q * digestLength < H; Q++) {
        var ne = Q + 1;
        ((uint8Array[0] = (ne >>> 24) & 255),
          (uint8Array[1] = (ne >>> 16) & 255),
          (uint8Array[2] = (ne >>> 8) & 255),
          (uint8Array[3] = (ne >>> 0) & 255),
          j.reset(),
          j.update(M),
          j.update(uint8Array),
          j.finish(uint8Array_3));
        for (var te = 0; te < digestLength; te++) uint8Array_2[te] = uint8Array_3[te];
        for (var te = 2; te <= P; te++) {
          (j.reset(), j.update(uint8Array_3).finish(uint8Array_3));
          for (var ae = 0; ae < digestLength; ae++) uint8Array_2[ae] ^= uint8Array_3[ae];
        }
        for (var te = 0; te < digestLength && Q * digestLength + te < H; te++)
          uint8Array_4[Q * digestLength + te] = uint8Array_2[te];
      }
      for (var Q = 0; Q < digestLength; Q++) uint8Array_2[Q] = uint8Array_3[Q] = 0;
      for (var Q = 0; Q < 4; Q++) uint8Array[Q] = 0;
      return (j.clean(), uint8Array_4);
    }
    e.pbkdf2 = L;
  });
});

export { Lu };
