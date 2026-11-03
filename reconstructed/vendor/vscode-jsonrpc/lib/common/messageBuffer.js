/**
 * vscode-jsonrpc/lib/common/messageBuffer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-t4ksmxzx.js:24791-26637 cjs-fingerprint
var hn = x(function (ln) {
  Object.defineProperty(ln, "__esModule", { value: !0 });
  ln.AbstractMessageBuffer = void 0;
  var Zi = 13,
    es = 10,
    ts = `\r
`;
  class dn {
    constructor(e = "utf-8") {
      ((this._encoding = e), (this._chunks = []), (this._totalLength = 0));
    }
    get encoding() {
      return this._encoding;
    }
    append(e) {
      let r = typeof e === "string" ? this.fromString(e, this._encoding) : e;
      (this._chunks.push(r), (this._totalLength += r.byteLength));
    }
    tryReadHeaders(e = !1) {
      if (this._chunks.length === 0) return;
      let r = 0,
        n = 0,
        s = 0,
        c = 0;
      e: while (n < this._chunks.length) {
        let j = this._chunks[n];
        s = 0;
        t: while (s < j.length) {
          switch (j[s]) {
            case Zi:
              switch (r) {
                case 0:
                  r = 1;
                  break;
                case 2:
                  r = 3;
                  break;
                default:
                  r = 0;
              }
              break;
            case es:
              switch (r) {
                case 1:
                  r = 2;
                  break;
                case 3:
                  ((r = 4), s++);
                  break e;
                default:
                  r = 0;
              }
              break;
            default:
              r = 0;
          }
          s++;
        }
        ((c += j.byteLength), n++);
      }
      if (r !== 4) return;
      let _read = this._read(c + s),
        P = new Map(),
        parts = this.toString(_read, "ascii").split(ts);
      if (parts.length < 2) return P;
      for (let j = 0; j < parts.length - 2; j++) {
        let I = parts[j],
          index = I.indexOf(":");
        if (index === -1)
          throw Error(`Message header must separate key and value using ':'
${I}`);
        let substr = I.substr(0, index),
          trimmed = I.substr(index + 1).trim();
        P.set(e ? substr.toLowerCase() : substr, trimmed);
      }
      return P;
    }
    tryReadBody(e) {
      if (this._totalLength < e) return;
      return this._read(e);
    }
    get numberOfBytes() {
      return this._totalLength;
    }
    _read(e) {
      if (e === 0) return this.emptyBuffer();
      if (e > this._totalLength) throw Error("Cannot read so many bytes!");
      if (this._chunks[0].byteLength === e) {
        let c = this._chunks[0];
        return (this._chunks.shift(), (this._totalLength -= e), this.asNative(c));
      }
      if (this._chunks[0].byteLength > e) {
        let c = this._chunks[0],
          asNative = this.asNative(c, e);
        return ((this._chunks[0] = c.slice(e)), (this._totalLength -= e), asNative);
      }
      let allocNative = this.allocNative(e),
        n = 0,
        s = 0;
      while (e > 0) {
        let c = this._chunks[s];
        if (c.byteLength > e) {
          let sliced = c.slice(0, e);
          (allocNative.set(sliced, n),
            (n += e),
            (this._chunks[s] = c.slice(e)),
            (this._totalLength -= e),
            (e -= e));
        } else
          (allocNative.set(c, n),
            (n += c.byteLength),
            this._chunks.shift(),
            (this._totalLength -= c.byteLength),
            (e -= c.byteLength));
      }
      return allocNative;
    }
  }
  ln.AbstractMessageBuffer = dn;
});

export { hn };
