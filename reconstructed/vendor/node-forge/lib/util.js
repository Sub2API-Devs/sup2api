/**
 * node-forge/lib/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { aT } from "./baseN.js";

//@ chunk-fq0cr76a.js:4980-28471 cjs-fingerprint
var Zn = x(function (afe, pT) {
  var lT = Tn(),
    cT = aT(),
    Te = (pT.exports = lT.util = lT.util || {});
  (function () {
    if (typeof process < "u" && process.nextTick) {
      if (((Te.nextTick = process.nextTick), typeof setImmediate === "function"))
        Te.setImmediate = setImmediate;
      else Te.setImmediate = Te.nextTick;
      return;
    }
    if (typeof setImmediate === "function") {
      ((Te.setImmediate = function () {
        return setImmediate.apply(void 0, arguments);
      }),
        (Te.nextTick = function (S) {
          return setImmediate(S);
        }));
      return;
    }
    if (
      ((Te.setImmediate = function (S) {
        setTimeout(S, 0);
      }),
      typeof window < "u" && typeof window.postMessage === "function")
    ) {
      let S = function (w) {
        if (w.source === window && w.data === e) {
          w.stopPropagation();
          var sliced = n.slice();
          ((n.length = 0),
            sliced.forEach(function (D) {
              D();
            }));
        }
      };
      var b = S,
        e = "forge.setImmediate",
        n = [];
      ((Te.setImmediate = function (w) {
        if ((n.push(w), n.length === 1)) window.postMessage(e, "*");
      }),
        window.addEventListener("message", S, !0));
    }
    if (typeof MutationObserver < "u") {
      var now = Date.now(),
        s = !0,
        element = document.createElement("div"),
        n = [];
      new MutationObserver(function () {
        var sliced = n.slice();
        ((n.length = 0),
          sliced.forEach(function (R) {
            R();
          }));
      }).observe(element, { attributes: !0 });
      var y = Te.setImmediate;
      Te.setImmediate = function (w) {
        if (Date.now() - now > 15) ((now = Date.now()), y(w));
        else if ((n.push(w), n.length === 1)) element.setAttribute("a", (s = !s));
      };
    }
    Te.nextTick = Te.setImmediate;
  })();
  Te.isNodejs = typeof process < "u" && process.versions && process.versions.node;
  Te.globalScope = (function () {
    if (Te.isNodejs) return global;
    return typeof self > "u" ? window : self;
  })();
  Te.isArray =
    Array.isArray ||
    function (e) {
      return Object.prototype.toString.call(e) === "[object Array]";
    };
  Te.isArrayBuffer = function (e) {
    return typeof ArrayBuffer < "u" && e instanceof ArrayBuffer;
  };
  Te.isArrayBufferView = function (e) {
    return e && Te.isArrayBuffer(e.buffer) && e.byteLength !== void 0;
  };
  function hf(e) {
    if (!(e === 8 || e === 16 || e === 24 || e === 32))
      throw Error("Only 8, 16, 24, or 32 bits supported: " + e);
  }
  Te.ByteBuffer = zb;
  function zb(e) {
    if (((this.data = ""), (this.read = 0), typeof e === "string")) this.data = e;
    else if (Te.isArrayBuffer(e) || Te.isArrayBufferView(e))
      if (typeof Buffer < "u" && e instanceof Buffer) this.data = e.toString("binary");
      else {
        var uint8Array = new Uint8Array(e);
        try {
          this.data = String.fromCharCode.apply(null, uint8Array);
        } catch (error) {
          for (var r = 0; r < uint8Array.length; ++r) this.putByte(uint8Array[r]);
        }
      }
    else if (
      e instanceof zb ||
      (typeof e === "object" && typeof e.data === "string" && typeof e.read === "number")
    )
      ((this.data = e.data), (this.read = e.read));
    this._constructedStringLength = 0;
  }
  Te.ByteStringBuffer = zb;
  var a3 = 4096;
  Te.ByteStringBuffer.prototype._optimizeConstructedString = function (e) {
    if (((this._constructedStringLength += e), this._constructedStringLength > a3))
      (this.data.substr(0, 1), (this._constructedStringLength = 0));
  };
  Te.ByteStringBuffer.prototype.length = function () {
    return this.data.length - this.read;
  };
  Te.ByteStringBuffer.prototype.isEmpty = function () {
    return this.length() <= 0;
  };
  Te.ByteStringBuffer.prototype.putByte = function (e) {
    return this.putBytes(String.fromCharCode(e));
  };
  Te.ByteStringBuffer.prototype.fillWithByte = function (e, n) {
    e = String.fromCharCode(e);
    var r = this.data;
    while (n > 0) {
      if (n & 1) r += e;
      if (((n >>>= 1), n > 0)) e += e;
    }
    return ((this.data = r), this._optimizeConstructedString(n), this);
  };
  Te.ByteStringBuffer.prototype.putBytes = function (e) {
    return ((this.data += e), this._optimizeConstructedString(e.length), this);
  };
  Te.ByteStringBuffer.prototype.putString = function (e) {
    return this.putBytes(Te.encodeUtf8(e));
  };
  Te.ByteStringBuffer.prototype.putInt16 = function (e) {
    return this.putBytes(String.fromCharCode((e >> 8) & 255) + String.fromCharCode(e & 255));
  };
  Te.ByteStringBuffer.prototype.putInt24 = function (e) {
    return this.putBytes(
      String.fromCharCode((e >> 16) & 255) +
        String.fromCharCode((e >> 8) & 255) +
        String.fromCharCode(e & 255),
    );
  };
  Te.ByteStringBuffer.prototype.putInt32 = function (e) {
    return this.putBytes(
      String.fromCharCode((e >> 24) & 255) +
        String.fromCharCode((e >> 16) & 255) +
        String.fromCharCode((e >> 8) & 255) +
        String.fromCharCode(e & 255),
    );
  };
  Te.ByteStringBuffer.prototype.putInt16Le = function (e) {
    return this.putBytes(String.fromCharCode(e & 255) + String.fromCharCode((e >> 8) & 255));
  };
  Te.ByteStringBuffer.prototype.putInt24Le = function (e) {
    return this.putBytes(
      String.fromCharCode(e & 255) +
        String.fromCharCode((e >> 8) & 255) +
        String.fromCharCode((e >> 16) & 255),
    );
  };
  Te.ByteStringBuffer.prototype.putInt32Le = function (e) {
    return this.putBytes(
      String.fromCharCode(e & 255) +
        String.fromCharCode((e >> 8) & 255) +
        String.fromCharCode((e >> 16) & 255) +
        String.fromCharCode((e >> 24) & 255),
    );
  };
  Te.ByteStringBuffer.prototype.putInt = function (e, n) {
    hf(n);
    var r = "";
    do ((n -= 8), (r += String.fromCharCode((e >> n) & 255)));
    while (n > 0);
    return this.putBytes(r);
  };
  Te.ByteStringBuffer.prototype.putSignedInt = function (e, n) {
    if (e < 0) e += 2 << (n - 1);
    return this.putInt(e, n);
  };
  Te.ByteStringBuffer.prototype.putBuffer = function (e) {
    return this.putBytes(e.getBytes());
  };
  Te.ByteStringBuffer.prototype.getByte = function () {
    return this.data.charCodeAt(this.read++);
  };
  Te.ByteStringBuffer.prototype.getInt16 = function () {
    var e = (this.data.charCodeAt(this.read) << 8) ^ this.data.charCodeAt(this.read + 1);
    return ((this.read += 2), e);
  };
  Te.ByteStringBuffer.prototype.getInt24 = function () {
    var e =
      (this.data.charCodeAt(this.read) << 16) ^
      (this.data.charCodeAt(this.read + 1) << 8) ^
      this.data.charCodeAt(this.read + 2);
    return ((this.read += 3), e);
  };
  Te.ByteStringBuffer.prototype.getInt32 = function () {
    var e =
      (this.data.charCodeAt(this.read) << 24) ^
      (this.data.charCodeAt(this.read + 1) << 16) ^
      (this.data.charCodeAt(this.read + 2) << 8) ^
      this.data.charCodeAt(this.read + 3);
    return ((this.read += 4), e);
  };
  Te.ByteStringBuffer.prototype.getInt16Le = function () {
    var e = this.data.charCodeAt(this.read) ^ (this.data.charCodeAt(this.read + 1) << 8);
    return ((this.read += 2), e);
  };
  Te.ByteStringBuffer.prototype.getInt24Le = function () {
    var e =
      this.data.charCodeAt(this.read) ^
      (this.data.charCodeAt(this.read + 1) << 8) ^
      (this.data.charCodeAt(this.read + 2) << 16);
    return ((this.read += 3), e);
  };
  Te.ByteStringBuffer.prototype.getInt32Le = function () {
    var e =
      this.data.charCodeAt(this.read) ^
      (this.data.charCodeAt(this.read + 1) << 8) ^
      (this.data.charCodeAt(this.read + 2) << 16) ^
      (this.data.charCodeAt(this.read + 3) << 24);
    return ((this.read += 4), e);
  };
  Te.ByteStringBuffer.prototype.getInt = function (e) {
    hf(e);
    var n = 0;
    do ((n = (n << 8) + this.data.charCodeAt(this.read++)), (e -= 8));
    while (e > 0);
    return n;
  };
  Te.ByteStringBuffer.prototype.getSignedInt = function (e) {
    var int = this.getInt(e),
      r = 2 << (e - 2);
    if (int >= r) int -= r << 1;
    return int;
  };
  Te.ByteStringBuffer.prototype.getBytes = function (e) {
    var n;
    if (e)
      ((e = Math.min(this.length(), e)), (n = this.data.slice(this.read, this.read + e)), (this.read += e));
    else if (e === 0) n = "";
    else ((n = this.read === 0 ? this.data : this.data.slice(this.read)), this.clear());
    return n;
  };
  Te.ByteStringBuffer.prototype.bytes = function (e) {
    return typeof e > "u" ? this.data.slice(this.read) : this.data.slice(this.read, this.read + e);
  };
  Te.ByteStringBuffer.prototype.at = function (e) {
    return this.data.charCodeAt(this.read + e);
  };
  Te.ByteStringBuffer.prototype.setAt = function (e, n) {
    return (
      (this.data =
        this.data.substr(0, this.read + e) + String.fromCharCode(n) + this.data.substr(this.read + e + 1)),
      this
    );
  };
  Te.ByteStringBuffer.prototype.last = function () {
    return this.data.charCodeAt(this.data.length - 1);
  };
  Te.ByteStringBuffer.prototype.copy = function () {
    var buffer = Te.createBuffer(this.data);
    return ((buffer.read = this.read), buffer);
  };
  Te.ByteStringBuffer.prototype.compact = function () {
    if (this.read > 0) ((this.data = this.data.slice(this.read)), (this.read = 0));
    return this;
  };
  Te.ByteStringBuffer.prototype.clear = function () {
    return ((this.data = ""), (this.read = 0), this);
  };
  Te.ByteStringBuffer.prototype.truncate = function (e) {
    var max = Math.max(0, this.length() - e);
    return ((this.data = this.data.substr(this.read, max)), (this.read = 0), this);
  };
  Te.ByteStringBuffer.prototype.toHex = function () {
    var e = "";
    for (var read = this.read; read < this.data.length; ++read) {
      var code = this.data.charCodeAt(read);
      if (code < 16) e += "0";
      e += code.toString(16);
    }
    return e;
  };
  Te.ByteStringBuffer.prototype.toString = function () {
    return Te.decodeUtf8(this.bytes());
  };
  function l3(e, n) {
    ((n = n || {}), (this.read = n.readOffset || 0), (this.growSize = n.growSize || 1024));
    var isArrayBuffer = Te.isArrayBuffer(e),
      isArrayBufferView = Te.isArrayBufferView(e);
    if (isArrayBuffer || isArrayBufferView) {
      if (isArrayBuffer) this.data = new DataView(e);
      else this.data = new DataView(e.buffer, e.byteOffset, e.byteLength);
      this.write = "writeOffset" in n ? n.writeOffset : this.data.byteLength;
      return;
    }
    if (((this.data = new DataView(new ArrayBuffer(0))), (this.write = 0), e !== null && e !== void 0))
      this.putBytes(e);
    if ("writeOffset" in n) this.write = n.writeOffset;
  }
  Te.DataBuffer = l3;
  Te.DataBuffer.prototype.length = function () {
    return this.write - this.read;
  };
  Te.DataBuffer.prototype.isEmpty = function () {
    return this.length() <= 0;
  };
  Te.DataBuffer.prototype.accommodate = function (e, n) {
    if (this.length() >= e) return this;
    n = Math.max(n || this.growSize, e);
    var uint8Array = new Uint8Array(this.data.buffer, this.data.byteOffset, this.data.byteLength),
      uint8Array_2 = new Uint8Array(this.length() + n);
    return (uint8Array_2.set(uint8Array), (this.data = new DataView(uint8Array_2.buffer)), this);
  };
  Te.DataBuffer.prototype.putByte = function (e) {
    return (this.accommodate(1), this.data.setUint8(this.write++, e), this);
  };
  Te.DataBuffer.prototype.fillWithByte = function (e, n) {
    this.accommodate(n);
    for (var r = 0; r < n; ++r) this.data.setUint8(e);
    return this;
  };
  Te.DataBuffer.prototype.putBytes = function (e, n) {
    if (Te.isArrayBufferView(e)) {
      var uint8Array = new Uint8Array(e.buffer, e.byteOffset, e.byteLength),
        s = uint8Array.byteLength - uint8Array.byteOffset;
      this.accommodate(s);
      var uint8Array_2 = new Uint8Array(this.data.buffer, this.write);
      return (uint8Array_2.set(uint8Array), (this.write += s), this);
    }
    if (Te.isArrayBuffer(e)) {
      var uint8Array = new Uint8Array(e);
      this.accommodate(uint8Array.byteLength);
      var uint8Array_2 = new Uint8Array(this.data.buffer);
      return (uint8Array_2.set(uint8Array, this.write), (this.write += uint8Array.byteLength), this);
    }
    if (
      e instanceof Te.DataBuffer ||
      (typeof e === "object" &&
        typeof e.read === "number" &&
        typeof e.write === "number" &&
        Te.isArrayBufferView(e.data))
    ) {
      var uint8Array = new Uint8Array(e.data.byteLength, e.read, e.length());
      this.accommodate(uint8Array.byteLength);
      var uint8Array_2 = new Uint8Array(e.data.byteLength, this.write);
      return (uint8Array_2.set(uint8Array), (this.write += uint8Array.byteLength), this);
    }
    if (e instanceof Te.ByteStringBuffer) ((e = e.data), (n = "binary"));
    if (((n = n || "binary"), typeof e === "string")) {
      var y;
      if (n === "hex")
        return (
          this.accommodate(Math.ceil(e.length / 2)),
          (y = new Uint8Array(this.data.buffer, this.write)),
          (this.write += Te.binary.hex.decode(e, y, this.write)),
          this
        );
      if (n === "base64")
        return (
          this.accommodate(Math.ceil(e.length / 4) * 3),
          (y = new Uint8Array(this.data.buffer, this.write)),
          (this.write += Te.binary.base64.decode(e, y, this.write)),
          this
        );
      if (n === "utf8") ((e = Te.encodeUtf8(e)), (n = "binary"));
      if (n === "binary" || n === "raw")
        return (
          this.accommodate(e.length),
          (y = new Uint8Array(this.data.buffer, this.write)),
          (this.write += Te.binary.raw.decode(y)),
          this
        );
      if (n === "utf16")
        return (
          this.accommodate(e.length * 2),
          (y = new Uint16Array(this.data.buffer, this.write)),
          (this.write += Te.text.utf16.encode(y)),
          this
        );
      throw Error("Invalid encoding: " + n);
    }
    throw Error("Invalid parameter: " + e);
  };
  Te.DataBuffer.prototype.putBuffer = function (e) {
    return (this.putBytes(e), e.clear(), this);
  };
  Te.DataBuffer.prototype.putString = function (e) {
    return this.putBytes(e, "utf16");
  };
  Te.DataBuffer.prototype.putInt16 = function (e) {
    return (this.accommodate(2), this.data.setInt16(this.write, e), (this.write += 2), this);
  };
  Te.DataBuffer.prototype.putInt24 = function (e) {
    return (
      this.accommodate(3),
      this.data.setInt16(this.write, (e >> 8) & 65535),
      this.data.setInt8(this.write, (e >> 16) & 255),
      (this.write += 3),
      this
    );
  };
  Te.DataBuffer.prototype.putInt32 = function (e) {
    return (this.accommodate(4), this.data.setInt32(this.write, e), (this.write += 4), this);
  };
  Te.DataBuffer.prototype.putInt16Le = function (e) {
    return (this.accommodate(2), this.data.setInt16(this.write, e, !0), (this.write += 2), this);
  };
  Te.DataBuffer.prototype.putInt24Le = function (e) {
    return (
      this.accommodate(3),
      this.data.setInt8(this.write, (e >> 16) & 255),
      this.data.setInt16(this.write, (e >> 8) & 65535, !0),
      (this.write += 3),
      this
    );
  };
  Te.DataBuffer.prototype.putInt32Le = function (e) {
    return (this.accommodate(4), this.data.setInt32(this.write, e, !0), (this.write += 4), this);
  };
  Te.DataBuffer.prototype.putInt = function (e, n) {
    (hf(n), this.accommodate(n / 8));
    do ((n -= 8), this.data.setInt8(this.write++, (e >> n) & 255));
    while (n > 0);
    return this;
  };
  Te.DataBuffer.prototype.putSignedInt = function (e, n) {
    if ((hf(n), this.accommodate(n / 8), e < 0)) e += 2 << (n - 1);
    return this.putInt(e, n);
  };
  Te.DataBuffer.prototype.getByte = function () {
    return this.data.getInt8(this.read++);
  };
  Te.DataBuffer.prototype.getInt16 = function () {
    var int16 = this.data.getInt16(this.read);
    return ((this.read += 2), int16);
  };
  Te.DataBuffer.prototype.getInt24 = function () {
    var e = (this.data.getInt16(this.read) << 8) ^ this.data.getInt8(this.read + 2);
    return ((this.read += 3), e);
  };
  Te.DataBuffer.prototype.getInt32 = function () {
    var int32 = this.data.getInt32(this.read);
    return ((this.read += 4), int32);
  };
  Te.DataBuffer.prototype.getInt16Le = function () {
    var int16 = this.data.getInt16(this.read, !0);
    return ((this.read += 2), int16);
  };
  Te.DataBuffer.prototype.getInt24Le = function () {
    var e = this.data.getInt8(this.read) ^ (this.data.getInt16(this.read + 1, !0) << 8);
    return ((this.read += 3), e);
  };
  Te.DataBuffer.prototype.getInt32Le = function () {
    var int32 = this.data.getInt32(this.read, !0);
    return ((this.read += 4), int32);
  };
  Te.DataBuffer.prototype.getInt = function (e) {
    hf(e);
    var n = 0;
    do ((n = (n << 8) + this.data.getInt8(this.read++)), (e -= 8));
    while (e > 0);
    return n;
  };
  Te.DataBuffer.prototype.getSignedInt = function (e) {
    var int = this.getInt(e),
      r = 2 << (e - 2);
    if (int >= r) int -= r << 1;
    return int;
  };
  Te.DataBuffer.prototype.getBytes = function (e) {
    var n;
    if (e)
      ((e = Math.min(this.length(), e)), (n = this.data.slice(this.read, this.read + e)), (this.read += e));
    else if (e === 0) n = "";
    else ((n = this.read === 0 ? this.data : this.data.slice(this.read)), this.clear());
    return n;
  };
  Te.DataBuffer.prototype.bytes = function (e) {
    return typeof e > "u" ? this.data.slice(this.read) : this.data.slice(this.read, this.read + e);
  };
  Te.DataBuffer.prototype.at = function (e) {
    return this.data.getUint8(this.read + e);
  };
  Te.DataBuffer.prototype.setAt = function (e, n) {
    return (this.data.setUint8(e, n), this);
  };
  Te.DataBuffer.prototype.last = function () {
    return this.data.getUint8(this.write - 1);
  };
  Te.DataBuffer.prototype.copy = function () {
    return new Te.DataBuffer(this);
  };
  Te.DataBuffer.prototype.compact = function () {
    if (this.read > 0) {
      var uint8Array = new Uint8Array(this.data.buffer, this.read),
        uint8Array_2 = new Uint8Array(uint8Array.byteLength);
      (uint8Array_2.set(uint8Array),
        (this.data = new DataView(uint8Array_2)),
        (this.write -= this.read),
        (this.read = 0));
    }
    return this;
  };
  Te.DataBuffer.prototype.clear = function () {
    return ((this.data = new DataView(new ArrayBuffer(0))), (this.read = this.write = 0), this);
  };
  Te.DataBuffer.prototype.truncate = function (e) {
    return (
      (this.write = Math.max(0, this.length() - e)),
      (this.read = Math.min(this.read, this.write)),
      this
    );
  };
  Te.DataBuffer.prototype.toHex = function () {
    var e = "";
    for (var read = this.read; read < this.data.byteLength; ++read) {
      var uint8 = this.data.getUint8(read);
      if (uint8 < 16) e += "0";
      e += uint8.toString(16);
    }
    return e;
  };
  Te.DataBuffer.prototype.toString = function (e) {
    var uint8Array = new Uint8Array(this.data, this.read, this.length());
    if (((e = e || "utf8"), e === "binary" || e === "raw")) return Te.binary.raw.encode(uint8Array);
    if (e === "hex") return Te.binary.hex.encode(uint8Array);
    if (e === "base64") return Te.binary.base64.encode(uint8Array);
    if (e === "utf8") return Te.text.utf8.decode(uint8Array);
    if (e === "utf16") return Te.text.utf16.decode(uint8Array);
    throw Error("Invalid encoding: " + e);
  };
  Te.createBuffer = function (e, n) {
    if (((n = n || "raw"), e !== void 0 && n === "utf8")) e = Te.encodeUtf8(e);
    return new Te.ByteBuffer(e);
  };
  Te.fillString = function (e, n) {
    var r = "";
    while (n > 0) {
      if (n & 1) r += e;
      if (((n >>>= 1), n > 0)) e += e;
    }
    return r;
  };
  Te.xorBytes = function (e, n, r) {
    var s = "",
      h = "",
      y = "",
      b = 0,
      S = 0;
    for (; r > 0; --r, ++b) {
      if (((h = e.charCodeAt(b) ^ n.charCodeAt(b)), S >= 10)) ((s += y), (y = ""), (S = 0));
      ((y += String.fromCharCode(h)), ++S);
    }
    return ((s += y), s);
  };
  Te.hexToBytes = function (e) {
    var n = "",
      r = 0;
    if (e.length & !0) ((r = 1), (n += String.fromCharCode(parseInt(e[0], 16))));
    for (; r < e.length; r += 2) n += String.fromCharCode(parseInt(e.substr(r, 2), 16));
    return n;
  };
  Te.bytesToHex = function (e) {
    return Te.createBuffer(e).toHex();
  };
  Te.int32ToBytes = function (e) {
    return (
      String.fromCharCode((e >> 24) & 255) +
      String.fromCharCode((e >> 16) & 255) +
      String.fromCharCode((e >> 8) & 255) +
      String.fromCharCode(e & 255)
    );
  };
  var Za = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
    za = [
      62, -1, -1, -1, 63, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, 64, -1, -1, -1, 0, 1, 2, 3, 4,
      5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1, -1,
      26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51,
    ],
    fT = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  Te.encode64 = function (e, n) {
    var r = "",
      s = "",
      h,
      y,
      b,
      S = 0;
    while (S < e.length) {
      if (
        ((h = e.charCodeAt(S++)),
        (y = e.charCodeAt(S++)),
        (b = e.charCodeAt(S++)),
        (r += Za.charAt(h >> 2)),
        (r += Za.charAt(((h & 3) << 4) | (y >> 4))),
        isNaN(y))
      )
        r += "==";
      else ((r += Za.charAt(((y & 15) << 2) | (b >> 6))), (r += isNaN(b) ? "=" : Za.charAt(b & 63)));
      if (n && r.length > n)
        ((s +=
          r.substr(0, n) +
          `\r
`),
          (r = r.substr(n)));
    }
    return ((s += r), s);
  };
  Te.decode64 = function (e) {
    e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    var n = "",
      r,
      s,
      h,
      y,
      b = 0;
    while (b < e.length)
      if (
        ((r = za[e.charCodeAt(b++) - 43]),
        (s = za[e.charCodeAt(b++) - 43]),
        (h = za[e.charCodeAt(b++) - 43]),
        (y = za[e.charCodeAt(b++) - 43]),
        (n += String.fromCharCode((r << 2) | (s >> 4))),
        h !== 64)
      ) {
        if (((n += String.fromCharCode(((s & 15) << 4) | (h >> 2))), y !== 64))
          n += String.fromCharCode(((h & 3) << 6) | y);
      }
    return n;
  };
  Te.encodeUtf8 = function (e) {
    return unescape(encodeURIComponent(e));
  };
  Te.decodeUtf8 = function (e) {
    return decodeURIComponent(escape(e));
  };
  Te.binary = { raw: {}, hex: {}, base64: {}, base58: {}, baseN: { encode: cT.encode, decode: cT.decode } };
  Te.binary.raw.encode = function (e) {
    return String.fromCharCode.apply(null, e);
  };
  Te.binary.raw.decode = function (e, n, r) {
    var s = n;
    if (!s) s = new Uint8Array(e.length);
    r = r || 0;
    var h = r;
    for (var y = 0; y < e.length; ++y) s[h++] = e.charCodeAt(y);
    return n ? h - r : s;
  };
  Te.binary.hex.encode = Te.bytesToHex;
  Te.binary.hex.decode = function (e, n, r) {
    var s = n;
    if (!s) s = new Uint8Array(Math.ceil(e.length / 2));
    r = r || 0;
    var h = 0,
      y = r;
    if (e.length & 1) ((h = 1), (s[y++] = parseInt(e[0], 16)));
    for (; h < e.length; h += 2) s[y++] = parseInt(e.substr(h, 2), 16);
    return n ? y - r : s;
  };
  Te.binary.base64.encode = function (e, n) {
    var r = "",
      s = "",
      h,
      y,
      b,
      S = 0;
    while (S < e.byteLength) {
      if (
        ((h = e[S++]),
        (y = e[S++]),
        (b = e[S++]),
        (r += Za.charAt(h >> 2)),
        (r += Za.charAt(((h & 3) << 4) | (y >> 4))),
        isNaN(y))
      )
        r += "==";
      else ((r += Za.charAt(((y & 15) << 2) | (b >> 6))), (r += isNaN(b) ? "=" : Za.charAt(b & 63)));
      if (n && r.length > n)
        ((s +=
          r.substr(0, n) +
          `\r
`),
          (r = r.substr(n)));
    }
    return ((s += r), s);
  };
  Te.binary.base64.decode = function (e, n, r) {
    var s = n;
    if (!s) s = new Uint8Array(Math.ceil(e.length / 4) * 3);
    ((e = e.replace(/[^A-Za-z0-9\+\/\=]/g, "")), (r = r || 0));
    var h,
      y,
      b,
      S,
      w = 0,
      R = r;
    while (w < e.length)
      if (
        ((h = za[e.charCodeAt(w++) - 43]),
        (y = za[e.charCodeAt(w++) - 43]),
        (b = za[e.charCodeAt(w++) - 43]),
        (S = za[e.charCodeAt(w++) - 43]),
        (s[R++] = (h << 2) | (y >> 4)),
        b !== 64)
      ) {
        if (((s[R++] = ((y & 15) << 4) | (b >> 2)), S !== 64)) s[R++] = ((b & 3) << 6) | S;
      }
    return n ? R - r : s.subarray(0, R);
  };
  Te.binary.base58.encode = function (e, n) {
    return Te.binary.baseN.encode(e, fT, n);
  };
  Te.binary.base58.decode = function (e, n) {
    return Te.binary.baseN.decode(e, fT, n);
  };
  Te.text = { utf8: {}, utf16: {} };
  Te.text.utf8.encode = function (e, n, r) {
    e = Te.encodeUtf8(e);
    var s = n;
    if (!s) s = new Uint8Array(e.length);
    r = r || 0;
    var h = r;
    for (var y = 0; y < e.length; ++y) s[h++] = e.charCodeAt(y);
    return n ? h - r : s;
  };
  Te.text.utf8.decode = function (e) {
    return Te.decodeUtf8(String.fromCharCode.apply(null, e));
  };
  Te.text.utf16.encode = function (e, n, r) {
    var s = n;
    if (!s) s = new Uint8Array(e.length * 2);
    var uint16Array = new Uint16Array(s.buffer);
    r = r || 0;
    var y = r,
      b = r;
    for (var S = 0; S < e.length; ++S) ((uint16Array[b++] = e.charCodeAt(S)), (y += 2));
    return n ? y - r : s;
  };
  Te.text.utf16.decode = function (e) {
    return String.fromCharCode.apply(null, new Uint16Array(e.buffer));
  };
  Te.deflate = function (e, n, r) {
    if (((n = Te.decode64(e.deflate(Te.encode64(n)).rval)), r)) {
      var s = 2,
        code = n.charCodeAt(1);
      if (code & 32) s = 6;
      n = n.substring(s, n.length - 4);
    }
    return n;
  };
  Te.inflate = function (e, n, r) {
    var rval = e.inflate(Te.encode64(n)).rval;
    return rval === null ? null : Te.decode64(rval);
  };
  var Xb = function (e, n, r) {
      if (!e) throw Error("WebStorage not available.");
      var s;
      if (r === null) s = e.removeItem(n);
      else ((r = Te.encode64(JSON.stringify(r))), (s = e.setItem(n, r)));
      if (typeof s < "u" && s.rval !== !0) {
        var h = Error(s.error.message);
        throw ((h.id = s.error.id), (h.name = s.error.name), h);
      }
    },
    Jb = function (e, n) {
      if (!e) throw Error("WebStorage not available.");
      var item = e.getItem(n);
      if (e.init)
        if (item.rval === null) {
          if (item.error) {
            var s = Error(item.error.message);
            throw ((s.id = item.error.id), (s.name = item.error.name), s);
          }
          item = null;
        } else item = item.rval;
      if (item !== null) item = JSON.parse(Te.decode64(item));
      return item;
    },
    c3 = function (e, n, r, s) {
      var h = Jb(e, n);
      if (h === null) h = {};
      ((h[r] = s), Xb(e, n, h));
    },
    u3 = function (e, n, r) {
      var s = Jb(e, n);
      if (s !== null) s = r in s ? s[r] : null;
      return s;
    },
    d3 = function (e, n, r) {
      var s = Jb(e, n);
      if (s !== null && r in s) {
        delete s[r];
        var h = !0;
        for (var key in s) {
          h = !1;
          break;
        }
        if (h) s = null;
        Xb(e, n, s);
      }
    },
    f3 = function (e, n) {
      Xb(e, n, null);
    },
    Mh = function (e, n, r) {
      var s = null;
      if (typeof r > "u") r = ["web", "flash"];
      var h,
        y = !1,
        b = null;
      for (var key in r) {
        h = r[key];
        try {
          if (h === "flash" || h === "both") {
            if (n[0] === null) throw Error("Flash local storage not available.");
            ((s = e.apply(this, n)), (y = h === "flash"));
          }
          if (h === "web" || h === "both") ((n[0] = localStorage), (s = e.apply(this, n)), (y = !0));
        } catch (error) {
          b = error;
        }
        if (y) break;
      }
      if (!y) throw b;
      return s;
    };
  Te.setItem = function (e, n, r, s, h) {
    Mh(c3, arguments, h);
  };
  Te.getItem = function (e, n, r, s) {
    return Mh(u3, arguments, s);
  };
  Te.removeItem = function (e, n, r, s) {
    Mh(d3, arguments, s);
  };
  Te.clearItems = function (e, n, r) {
    Mh(f3, arguments, r);
  };
  Te.isEmpty = function (e) {
    for (var key in e) if (e.hasOwnProperty(key)) return !1;
    return !0;
  };
  Te.format = function (e) {
    var n = /%./g,
      r,
      s,
      h = 0,
      y = [],
      b = 0;
    while ((r = n.exec(e))) {
      if (((s = e.substring(b, n.lastIndex - 2)), s.length > 0)) y.push(s);
      b = n.lastIndex;
      var S = r[0][1];
      switch (S) {
        case "s":
        case "o":
          if (h < arguments.length) y.push(arguments[h++ + 1]);
          else y.push("<?>");
          break;
        case "%":
          y.push("%");
          break;
        default:
          y.push("<%" + S + "?>");
      }
    }
    return (y.push(e.substring(b)), y.join(""));
  };
  Te.formatNumber = function (e, n, r, s) {
    var h = e,
      y = isNaN((n = Math.abs(n))) ? 2 : n,
      b = r === void 0 ? "," : r,
      S = s === void 0 ? "." : s,
      w = h < 0 ? "-" : "",
      R = parseInt((h = Math.abs(+h || 0).toFixed(y)), 10) + "",
      D = R.length > 3 ? R.length % 3 : 0;
    return (
      w +
      (D ? R.substr(0, D) + S : "") +
      R.substr(D).replace(/(\d{3})(?=\d)/g, "$1" + S) +
      (y
        ? b +
          Math.abs(h - R)
            .toFixed(y)
            .slice(2)
        : "")
    );
  };
  Te.formatSize = function (e) {
    if (e >= 1073741824) e = Te.formatNumber(e / 1073741824, 2, ".", "") + " GiB";
    else if (e >= 1048576) e = Te.formatNumber(e / 1048576, 2, ".", "") + " MiB";
    else if (e >= 1024) e = Te.formatNumber(e / 1024, 0) + " KiB";
    else e = Te.formatNumber(e, 0) + " bytes";
    return e;
  };
  Te.bytesFromIP = function (e) {
    if (e.indexOf(".") !== -1) return Te.bytesFromIPv4(e);
    if (e.indexOf(":") !== -1) return Te.bytesFromIPv6(e);
    return null;
  };
  Te.bytesFromIPv4 = function (e) {
    if (((e = e.split(".")), e.length !== 4)) return null;
    var buffer = Te.createBuffer();
    for (var r = 0; r < e.length; ++r) {
      var s = parseInt(e[r], 10);
      if (isNaN(s)) return null;
      buffer.putByte(s);
    }
    return buffer.getBytes();
  };
  Te.bytesFromIPv6 = function (e) {
    var n = 0;
    e = e.split(":").filter(function (b) {
      if (b.length === 0) ++n;
      return !0;
    });
    var r = (8 - e.length + n) * 2,
      buffer = Te.createBuffer();
    for (var h = 0; h < 8; ++h) {
      if (!e[h] || e[h].length === 0) {
        (buffer.fillWithByte(0, r), (r = 0));
        continue;
      }
      var hexToBytes = Te.hexToBytes(e[h]);
      if (hexToBytes.length < 2) buffer.putByte(0);
      buffer.putBytes(hexToBytes);
    }
    return buffer.getBytes();
  };
  Te.bytesToIP = function (e) {
    if (e.length === 4) return Te.bytesToIPv4(e);
    if (e.length === 16) return Te.bytesToIPv6(e);
    return null;
  };
  Te.bytesToIPv4 = function (e) {
    if (e.length !== 4) return null;
    var n = [];
    for (var r = 0; r < e.length; ++r) n.push(e.charCodeAt(r));
    return n.join(".");
  };
  Te.bytesToIPv6 = function (e) {
    if (e.length !== 16) return null;
    var n = [],
      r = [],
      s = 0;
    for (var h = 0; h < e.length; h += 2) {
      var bytesToHex = Te.bytesToHex(e[h] + e[h + 1]);
      while (bytesToHex[0] === "0" && bytesToHex !== "0") bytesToHex = bytesToHex.substr(1);
      if (bytesToHex === "0") {
        var b = r[r.length - 1],
          S = n.length;
        if (!b || S !== b.end + 1) r.push({ start: S, end: S });
        else if (((b.end = S), b.end - b.start > r[s].end - r[s].start)) s = r.length - 1;
      }
      n.push(bytesToHex);
    }
    if (r.length > 0) {
      var w = r[s];
      if (w.end - w.start > 0) {
        if ((n.splice(w.start, w.end - w.start + 1, ""), w.start === 0)) n.unshift("");
        if (w.end === 7) n.push("");
      }
    }
    return n.join(":");
  };
  Te.estimateCores = function (e, n) {
    if (typeof e === "function") ((n = e), (e = {}));
    if (((e = e || {}), "cores" in Te && !e.update)) return n(null, Te.cores);
    if (typeof navigator < "u" && "hardwareConcurrency" in navigator && navigator.hardwareConcurrency > 0)
      return ((Te.cores = navigator.hardwareConcurrency), n(null, Te.cores));
    if (typeof Worker > "u") return ((Te.cores = 1), n(null, Te.cores));
    if (typeof Blob > "u") return ((Te.cores = 2), n(null, Te.cores));
    var objectURL = URL.createObjectURL(
      new Blob(
        [
          "(",
          function () {
            self.addEventListener("message", function (b) {
              var now = Date.now(),
                w = now + 4;
              while (Date.now() < w);
              self.postMessage({ st: now, et: w });
            });
          }.toString(),
          ")()",
        ],
        { type: "application/javascript" },
      ),
    );
    s([], 5, 16);
    function s(b, S, w) {
      if (S === 0) {
        var floored = Math.floor(
          b.reduce(function (D, O) {
            return D + O;
          }, 0) / b.length,
        );
        return ((Te.cores = Math.max(1, floored)), URL.revokeObjectURL(objectURL), n(null, Te.cores));
      }
      h(w, function (D, O) {
        (b.push(y(w, O)), s(b, S - 1, w));
      });
    }
    function h(b, S) {
      var w = [],
        R = [];
      for (var D = 0; D < b; ++D) {
        var worker = new Worker(objectURL);
        (worker.addEventListener("message", function (L) {
          if ((R.push(L.data), R.length === b)) {
            for (var V = 0; V < b; ++V) w[V].terminate();
            S(null, R);
          }
        }),
          w.push(worker));
      }
      for (var D = 0; D < b; ++D) w[D].postMessage(D);
    }
    function y(b, S) {
      var w = [];
      for (var R = 0; R < b; ++R) {
        var D = S[R],
          O = (w[R] = []);
        for (var L = 0; L < b; ++L) {
          if (R === L) continue;
          var V = S[L];
          if ((D.st > V.st && D.st < V.et) || (V.st > D.st && V.st < D.et)) O.push(L);
        }
      }
      return w.reduce(function (K, q) {
        return Math.max(K, q.length);
      }, 0);
    }
  };
});

export { Zn };
