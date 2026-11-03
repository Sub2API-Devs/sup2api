/**
 * node-forge/lib/cipherModes.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:30483-43142 cjs-fingerprint
var tS = x(function (cfe, mT) {
  var ds = Tn();
  Zn();
  ds.cipher = ds.cipher || {};
  var Ln = (mT.exports = ds.cipher.modes = ds.cipher.modes || {});
  Ln.ecb = function (e) {
    ((e = e || {}),
      (this.name = "ECB"),
      (this.cipher = e.cipher),
      (this.blockSize = e.blockSize || 16),
      (this._ints = this.blockSize / 4),
      (this._inBlock = Array(this._ints)),
      (this._outBlock = Array(this._ints)));
  };
  Ln.ecb.prototype.start = function (e) {};
  Ln.ecb.prototype.encrypt = function (e, n, r) {
    if (e.length() < this.blockSize && !(r && e.length() > 0)) return !0;
    for (var s = 0; s < this._ints; ++s) this._inBlock[s] = e.getInt32();
    this.cipher.encrypt(this._inBlock, this._outBlock);
    for (var s = 0; s < this._ints; ++s) n.putInt32(this._outBlock[s]);
  };
  Ln.ecb.prototype.decrypt = function (e, n, r) {
    if (e.length() < this.blockSize && !(r && e.length() > 0)) return !0;
    for (var s = 0; s < this._ints; ++s) this._inBlock[s] = e.getInt32();
    this.cipher.decrypt(this._inBlock, this._outBlock);
    for (var s = 0; s < this._ints; ++s) n.putInt32(this._outBlock[s]);
  };
  Ln.ecb.prototype.pad = function (e, n) {
    var r = e.length() === this.blockSize ? this.blockSize : this.blockSize - e.length();
    return (e.fillWithByte(r, r), !0);
  };
  Ln.ecb.prototype.unpad = function (e, n) {
    if (n.overflow > 0) return !1;
    var r = e.length(),
      at = e.at(r - 1);
    if (at > this.blockSize << 2) return !1;
    return (e.truncate(at), !0);
  };
  Ln.cbc = function (e) {
    ((e = e || {}),
      (this.name = "CBC"),
      (this.cipher = e.cipher),
      (this.blockSize = e.blockSize || 16),
      (this._ints = this.blockSize / 4),
      (this._inBlock = Array(this._ints)),
      (this._outBlock = Array(this._ints)));
  };
  Ln.cbc.prototype.start = function (e) {
    if (e.iv === null) {
      if (!this._prev) throw Error("Invalid IV parameter.");
      this._iv = this._prev.slice(0);
    } else if (!("iv" in e)) throw Error("Invalid IV parameter.");
    else ((this._iv = Vh(e.iv, this.blockSize)), (this._prev = this._iv.slice(0)));
  };
  Ln.cbc.prototype.encrypt = function (e, n, r) {
    if (e.length() < this.blockSize && !(r && e.length() > 0)) return !0;
    for (var s = 0; s < this._ints; ++s) this._inBlock[s] = this._prev[s] ^ e.getInt32();
    this.cipher.encrypt(this._inBlock, this._outBlock);
    for (var s = 0; s < this._ints; ++s) n.putInt32(this._outBlock[s]);
    this._prev = this._outBlock;
  };
  Ln.cbc.prototype.decrypt = function (e, n, r) {
    if (e.length() < this.blockSize && !(r && e.length() > 0)) return !0;
    for (var s = 0; s < this._ints; ++s) this._inBlock[s] = e.getInt32();
    this.cipher.decrypt(this._inBlock, this._outBlock);
    for (var s = 0; s < this._ints; ++s) n.putInt32(this._prev[s] ^ this._outBlock[s]);
    this._prev = this._inBlock.slice(0);
  };
  Ln.cbc.prototype.pad = function (e, n) {
    var r = e.length() === this.blockSize ? this.blockSize : this.blockSize - e.length();
    return (e.fillWithByte(r, r), !0);
  };
  Ln.cbc.prototype.unpad = function (e, n) {
    if (n.overflow > 0) return !1;
    var r = e.length(),
      at = e.at(r - 1);
    if (at > this.blockSize << 2) return !1;
    return (e.truncate(at), !0);
  };
  Ln.cfb = function (e) {
    ((e = e || {}),
      (this.name = "CFB"),
      (this.cipher = e.cipher),
      (this.blockSize = e.blockSize || 16),
      (this._ints = this.blockSize / 4),
      (this._inBlock = null),
      (this._outBlock = Array(this._ints)),
      (this._partialBlock = Array(this._ints)),
      (this._partialOutput = ds.util.createBuffer()),
      (this._partialBytes = 0));
  };
  Ln.cfb.prototype.start = function (e) {
    if (!("iv" in e)) throw Error("Invalid IV parameter.");
    ((this._iv = Vh(e.iv, this.blockSize)), (this._inBlock = this._iv.slice(0)), (this._partialBytes = 0));
  };
  Ln.cfb.prototype.encrypt = function (e, n, r) {
    var s = e.length();
    if (s === 0) return !0;
    if (
      (this.cipher.encrypt(this._inBlock, this._outBlock), this._partialBytes === 0 && s >= this.blockSize)
    ) {
      for (var h = 0; h < this._ints; ++h)
        ((this._inBlock[h] = e.getInt32() ^ this._outBlock[h]), n.putInt32(this._inBlock[h]));
      return;
    }
    var y = (this.blockSize - s) % this.blockSize;
    if (y > 0) y = this.blockSize - y;
    this._partialOutput.clear();
    for (var h = 0; h < this._ints; ++h)
      ((this._partialBlock[h] = e.getInt32() ^ this._outBlock[h]),
        this._partialOutput.putInt32(this._partialBlock[h]));
    if (y > 0) e.read -= this.blockSize;
    else for (var h = 0; h < this._ints; ++h) this._inBlock[h] = this._partialBlock[h];
    if (this._partialBytes > 0) this._partialOutput.getBytes(this._partialBytes);
    if (y > 0 && !r)
      return (n.putBytes(this._partialOutput.getBytes(y - this._partialBytes)), (this._partialBytes = y), !0);
    (n.putBytes(this._partialOutput.getBytes(s - this._partialBytes)), (this._partialBytes = 0));
  };
  Ln.cfb.prototype.decrypt = function (e, n, r) {
    var s = e.length();
    if (s === 0) return !0;
    if (
      (this.cipher.encrypt(this._inBlock, this._outBlock), this._partialBytes === 0 && s >= this.blockSize)
    ) {
      for (var h = 0; h < this._ints; ++h)
        ((this._inBlock[h] = e.getInt32()), n.putInt32(this._inBlock[h] ^ this._outBlock[h]));
      return;
    }
    var y = (this.blockSize - s) % this.blockSize;
    if (y > 0) y = this.blockSize - y;
    this._partialOutput.clear();
    for (var h = 0; h < this._ints; ++h)
      ((this._partialBlock[h] = e.getInt32()),
        this._partialOutput.putInt32(this._partialBlock[h] ^ this._outBlock[h]));
    if (y > 0) e.read -= this.blockSize;
    else for (var h = 0; h < this._ints; ++h) this._inBlock[h] = this._partialBlock[h];
    if (this._partialBytes > 0) this._partialOutput.getBytes(this._partialBytes);
    if (y > 0 && !r)
      return (n.putBytes(this._partialOutput.getBytes(y - this._partialBytes)), (this._partialBytes = y), !0);
    (n.putBytes(this._partialOutput.getBytes(s - this._partialBytes)), (this._partialBytes = 0));
  };
  Ln.ofb = function (e) {
    ((e = e || {}),
      (this.name = "OFB"),
      (this.cipher = e.cipher),
      (this.blockSize = e.blockSize || 16),
      (this._ints = this.blockSize / 4),
      (this._inBlock = null),
      (this._outBlock = Array(this._ints)),
      (this._partialOutput = ds.util.createBuffer()),
      (this._partialBytes = 0));
  };
  Ln.ofb.prototype.start = function (e) {
    if (!("iv" in e)) throw Error("Invalid IV parameter.");
    ((this._iv = Vh(e.iv, this.blockSize)), (this._inBlock = this._iv.slice(0)), (this._partialBytes = 0));
  };
  Ln.ofb.prototype.encrypt = function (e, n, r) {
    var s = e.length();
    if (e.length() === 0) return !0;
    if (
      (this.cipher.encrypt(this._inBlock, this._outBlock), this._partialBytes === 0 && s >= this.blockSize)
    ) {
      for (var h = 0; h < this._ints; ++h)
        (n.putInt32(e.getInt32() ^ this._outBlock[h]), (this._inBlock[h] = this._outBlock[h]));
      return;
    }
    var y = (this.blockSize - s) % this.blockSize;
    if (y > 0) y = this.blockSize - y;
    this._partialOutput.clear();
    for (var h = 0; h < this._ints; ++h) this._partialOutput.putInt32(e.getInt32() ^ this._outBlock[h]);
    if (y > 0) e.read -= this.blockSize;
    else for (var h = 0; h < this._ints; ++h) this._inBlock[h] = this._outBlock[h];
    if (this._partialBytes > 0) this._partialOutput.getBytes(this._partialBytes);
    if (y > 0 && !r)
      return (n.putBytes(this._partialOutput.getBytes(y - this._partialBytes)), (this._partialBytes = y), !0);
    (n.putBytes(this._partialOutput.getBytes(s - this._partialBytes)), (this._partialBytes = 0));
  };
  Ln.ofb.prototype.decrypt = Ln.ofb.prototype.encrypt;
  Ln.ctr = function (e) {
    ((e = e || {}),
      (this.name = "CTR"),
      (this.cipher = e.cipher),
      (this.blockSize = e.blockSize || 16),
      (this._ints = this.blockSize / 4),
      (this._inBlock = null),
      (this._outBlock = Array(this._ints)),
      (this._partialOutput = ds.util.createBuffer()),
      (this._partialBytes = 0));
  };
  Ln.ctr.prototype.start = function (e) {
    if (!("iv" in e)) throw Error("Invalid IV parameter.");
    ((this._iv = Vh(e.iv, this.blockSize)), (this._inBlock = this._iv.slice(0)), (this._partialBytes = 0));
  };
  Ln.ctr.prototype.encrypt = function (e, n, r) {
    var s = e.length();
    if (s === 0) return !0;
    if ((this.cipher.encrypt(this._inBlock, this._outBlock), this._partialBytes === 0 && s >= this.blockSize))
      for (var h = 0; h < this._ints; ++h) n.putInt32(e.getInt32() ^ this._outBlock[h]);
    else {
      var y = (this.blockSize - s) % this.blockSize;
      if (y > 0) y = this.blockSize - y;
      this._partialOutput.clear();
      for (var h = 0; h < this._ints; ++h) this._partialOutput.putInt32(e.getInt32() ^ this._outBlock[h]);
      if (y > 0) e.read -= this.blockSize;
      if (this._partialBytes > 0) this._partialOutput.getBytes(this._partialBytes);
      if (y > 0 && !r)
        return (
          n.putBytes(this._partialOutput.getBytes(y - this._partialBytes)),
          (this._partialBytes = y),
          !0
        );
      (n.putBytes(this._partialOutput.getBytes(s - this._partialBytes)), (this._partialBytes = 0));
    }
    Wh(this._inBlock);
  };
  Ln.ctr.prototype.decrypt = Ln.ctr.prototype.encrypt;
  Ln.gcm = function (e) {
    ((e = e || {}),
      (this.name = "GCM"),
      (this.cipher = e.cipher),
      (this.blockSize = e.blockSize || 16),
      (this._ints = this.blockSize / 4),
      (this._inBlock = Array(this._ints)),
      (this._outBlock = Array(this._ints)),
      (this._partialOutput = ds.util.createBuffer()),
      (this._partialBytes = 0),
      (this._R = 3774873600));
  };
  Ln.gcm.prototype.start = function (e) {
    if (!("iv" in e)) throw Error("Invalid IV parameter.");
    var buffer = ds.util.createBuffer(e.iv);
    this._cipherLength = 0;
    var r;
    if ("additionalData" in e) r = ds.util.createBuffer(e.additionalData);
    else r = ds.util.createBuffer();
    if ("tagLength" in e) this._tagLength = e.tagLength;
    else this._tagLength = 128;
    if (((this._tag = null), e.decrypt)) {
      if (((this._tag = ds.util.createBuffer(e.tag).getBytes()), this._tag.length !== this._tagLength / 8))
        throw Error("Authentication tag does not match tag length.");
    }
    ((this._hashBlock = Array(this._ints)),
      (this.tag = null),
      (this._hashSubkey = Array(this._ints)),
      this.cipher.encrypt([0, 0, 0, 0], this._hashSubkey),
      (this.componentBits = 4),
      (this._m = this.generateHashTable(this._hashSubkey, this.componentBits)));
    var s = buffer.length();
    if (s === 12) this._j0 = [buffer.getInt32(), buffer.getInt32(), buffer.getInt32(), 1];
    else {
      this._j0 = [0, 0, 0, 0];
      while (buffer.length() > 0)
        this._j0 = this.ghash(this._hashSubkey, this._j0, [
          buffer.getInt32(),
          buffer.getInt32(),
          buffer.getInt32(),
          buffer.getInt32(),
        ]);
      this._j0 = this.ghash(this._hashSubkey, this._j0, [0, 0].concat(eS(s * 8)));
    }
    ((this._inBlock = this._j0.slice(0)),
      Wh(this._inBlock),
      (this._partialBytes = 0),
      (r = ds.util.createBuffer(r)),
      (this._aDataLength = eS(r.length() * 8)));
    var h = r.length() % this.blockSize;
    if (h) r.fillWithByte(0, this.blockSize - h);
    this._s = [0, 0, 0, 0];
    while (r.length() > 0)
      this._s = this.ghash(this._hashSubkey, this._s, [
        r.getInt32(),
        r.getInt32(),
        r.getInt32(),
        r.getInt32(),
      ]);
  };
  Ln.gcm.prototype.encrypt = function (e, n, r) {
    var s = e.length();
    if (s === 0) return !0;
    if (
      (this.cipher.encrypt(this._inBlock, this._outBlock), this._partialBytes === 0 && s >= this.blockSize)
    ) {
      for (var h = 0; h < this._ints; ++h) n.putInt32((this._outBlock[h] ^= e.getInt32()));
      this._cipherLength += this.blockSize;
    } else {
      var y = (this.blockSize - s) % this.blockSize;
      if (y > 0) y = this.blockSize - y;
      this._partialOutput.clear();
      for (var h = 0; h < this._ints; ++h) this._partialOutput.putInt32(e.getInt32() ^ this._outBlock[h]);
      if (y <= 0 || r) {
        if (r) {
          var b = s % this.blockSize;
          ((this._cipherLength += b), this._partialOutput.truncate(this.blockSize - b));
        } else this._cipherLength += this.blockSize;
        for (var h = 0; h < this._ints; ++h) this._outBlock[h] = this._partialOutput.getInt32();
        this._partialOutput.read -= this.blockSize;
      }
      if (this._partialBytes > 0) this._partialOutput.getBytes(this._partialBytes);
      if (y > 0 && !r)
        return (
          (e.read -= this.blockSize),
          n.putBytes(this._partialOutput.getBytes(y - this._partialBytes)),
          (this._partialBytes = y),
          !0
        );
      (n.putBytes(this._partialOutput.getBytes(s - this._partialBytes)), (this._partialBytes = 0));
    }
    ((this._s = this.ghash(this._hashSubkey, this._s, this._outBlock)), Wh(this._inBlock));
  };
  Ln.gcm.prototype.decrypt = function (e, n, r) {
    var s = e.length();
    if (s < this.blockSize && !(r && s > 0)) return !0;
    (this.cipher.encrypt(this._inBlock, this._outBlock),
      Wh(this._inBlock),
      (this._hashBlock[0] = e.getInt32()),
      (this._hashBlock[1] = e.getInt32()),
      (this._hashBlock[2] = e.getInt32()),
      (this._hashBlock[3] = e.getInt32()),
      (this._s = this.ghash(this._hashSubkey, this._s, this._hashBlock)));
    for (var h = 0; h < this._ints; ++h) n.putInt32(this._outBlock[h] ^ this._hashBlock[h]);
    if (s < this.blockSize) this._cipherLength += s % this.blockSize;
    else this._cipherLength += this.blockSize;
  };
  Ln.gcm.prototype.afterFinish = function (e, n) {
    var r = !0;
    if (n.decrypt && n.overflow) e.truncate(this.blockSize - n.overflow);
    this.tag = ds.util.createBuffer();
    var combined = this._aDataLength.concat(eS(this._cipherLength * 8));
    this._s = this.ghash(this._hashSubkey, this._s, combined);
    var h = [];
    this.cipher.encrypt(this._j0, h);
    for (var y = 0; y < this._ints; ++y) this.tag.putInt32(this._s[y] ^ h[y]);
    if (
      (this.tag.truncate(this.tag.length() % (this._tagLength / 8)),
      n.decrypt && this.tag.bytes() !== this._tag)
    )
      r = !1;
    return r;
  };
  Ln.gcm.prototype.multiply = function (e, n) {
    var r = [0, 0, 0, 0],
      sliced = n.slice(0);
    for (var h = 0; h < 128; ++h) {
      var y = e[(h / 32) | 0] & (1 << (31 - (h % 32)));
      if (y) ((r[0] ^= sliced[0]), (r[1] ^= sliced[1]), (r[2] ^= sliced[2]), (r[3] ^= sliced[3]));
      this.pow(sliced, sliced);
    }
    return r;
  };
  Ln.gcm.prototype.pow = function (e, n) {
    var r = e[3] & 1;
    for (var s = 3; s > 0; --s) n[s] = (e[s] >>> 1) | ((e[s - 1] & 1) << 31);
    if (((n[0] = e[0] >>> 1), r)) n[0] ^= this._R;
  };
  Ln.gcm.prototype.tableMultiply = function (e) {
    var n = [0, 0, 0, 0];
    for (var r = 0; r < 32; ++r) {
      var s = (r / 8) | 0,
        h = (e[s] >>> ((7 - (r % 8)) * 4)) & 15,
        y = this._m[r][h];
      ((n[0] ^= y[0]), (n[1] ^= y[1]), (n[2] ^= y[2]), (n[3] ^= y[3]));
    }
    return n;
  };
  Ln.gcm.prototype.ghash = function (e, n, r) {
    return ((n[0] ^= r[0]), (n[1] ^= r[1]), (n[2] ^= r[2]), (n[3] ^= r[3]), this.tableMultiply(n));
  };
  Ln.gcm.prototype.generateHashTable = function (e, n) {
    var r = 8 / n,
      s = 4 * r,
      h = 16 * r,
      y = Array(h);
    for (var b = 0; b < h; ++b) {
      var S = [0, 0, 0, 0],
        w = (b / s) | 0,
        R = (s - 1 - (b % s)) * n;
      ((S[w] = (1 << (n - 1)) << R), (y[b] = this.generateSubHashTable(this.multiply(S, e), n)));
    }
    return y;
  };
  Ln.gcm.prototype.generateSubHashTable = function (e, n) {
    var r = 1 << n,
      s = r >>> 1,
      h = Array(r);
    h[s] = e.slice(0);
    var y = s >>> 1;
    while (y > 0) (this.pow(h[2 * y], (h[y] = [])), (y >>= 1));
    y = 2;
    while (y < s) {
      for (var b = 1; b < y; ++b) {
        var S = h[y],
          w = h[b];
        h[y + b] = [S[0] ^ w[0], S[1] ^ w[1], S[2] ^ w[2], S[3] ^ w[3]];
      }
      y *= 2;
    }
    h[0] = [0, 0, 0, 0];
    for (y = s + 1; y < r; ++y) {
      var R = h[y ^ s];
      h[y] = [e[0] ^ R[0], e[1] ^ R[1], e[2] ^ R[2], e[3] ^ R[3]];
    }
    return h;
  };
  function Vh(e, n) {
    if (typeof e === "string") e = ds.util.createBuffer(e);
    if (ds.util.isArray(e) && e.length > 4) {
      var r = e;
      e = ds.util.createBuffer();
      for (var s = 0; s < r.length; ++s) e.putByte(r[s]);
    }
    if (e.length() < n)
      throw Error("Invalid IV length; got " + e.length() + " bytes and expected " + n + " bytes.");
    if (!ds.util.isArray(e)) {
      var h = [],
        y = n / 4;
      for (var s = 0; s < y; ++s) h.push(e.getInt32());
      e = h;
    }
    return e;
  }
  function Wh(e) {
    e[e.length - 1] = (e[e.length - 1] + 1) & 4294967295;
  }
  function eS(e) {
    return [(e / 4294967296) | 0, e & 4294967295];
  }
});

export { tS };
