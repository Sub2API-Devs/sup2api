/**
 * @bufbuild/protobuf/dist/commonjs/wire/size-delimited.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { qu } from "../../cjs/to-binary.js";
import { xc } from "./binary-encoding.js";
import { Ku } from "../from-binary.js";

//@ chunk-fq0cr76a.js:446147-448705 cjs-fingerprint
var AP = x(function (oo) {
  var mJ =
      (oo && oo.__asyncValues) ||
      function (e) {
        if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
        var n = e[Symbol.asyncIterator],
          r;
        return n
          ? n.call(e)
          : ((e = typeof __values === "function" ? __values(e) : e[Symbol.iterator]()),
            (r = {}),
            s("next"),
            s("throw"),
            s("return"),
            (r[Symbol.asyncIterator] = function () {
              return this;
            }),
            r);
        function s(y) {
          r[y] =
            e[y] &&
            function (b) {
              return new Promise(function (S, w) {
                ((b = e[y](b)), h(S, w, b.done, b.value));
              });
            };
        }
        function h(y, b, S, w) {
          Promise.resolve(w).then(function (R) {
            y({ value: R, done: S });
          }, b);
        }
      },
    nd =
      (oo && oo.__await) ||
      function (e) {
        return this instanceof nd ? ((this.v = e), this) : new nd(e);
      },
    gJ =
      (oo && oo.__asyncGenerator) ||
      function (e, n, r) {
        if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
        var s = r.apply(e, n || []),
          h,
          y = [];
        return (
          (h = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype)),
          S("next"),
          S("throw"),
          S("return", b),
          (h[Symbol.asyncIterator] = function () {
            return this;
          }),
          h
        );
        function b(V) {
          return function (K) {
            return Promise.resolve(K).then(V, O);
          };
        }
        function S(V, K) {
          if (s[V]) {
            if (
              ((h[V] = function (q) {
                return new Promise(function (Z, J) {
                  y.push([V, q, Z, J]) > 1 || w(V, q);
                });
              }),
              K)
            )
              h[V] = K(h[V]);
          }
        }
        function w(V, K) {
          try {
            R(s[V](K));
          } catch (error) {
            L(y[0][3], error);
          }
        }
        function R(V) {
          V.value instanceof nd ? Promise.resolve(V.value.v).then(D, O) : L(y[0][2], V);
        }
        function D(V) {
          w("next", V);
        }
        function O(V) {
          w("throw", V);
        }
        function L(V, K) {
          if ((V(K), y.shift(), y.length)) w(y[0][0], y[0][1]);
        }
      };
  Object.defineProperty(oo, "__esModule", { value: !0 });
  oo.sizeDelimitedEncode = yJ;
  oo.sizeDelimitedDecodeStream = bJ;
  oo.sizeDelimitedPeek = TP;
  var vP = qu(),
    py = xc(),
    wP = Ku();
  function yJ(e, n, r) {
    let s = new py.BinaryWriter();
    return (s.bytes(vP.toBinary(e, n, r)), s.finish());
  }
  function bJ(e, n, r) {
    return gJ(this, arguments, function* () {
      var h, y, b, S;
      function w(V, K) {
        let uint8Array = new Uint8Array(V.byteLength + K.byteLength);
        return (uint8Array.set(V), uint8Array.set(K, V.length), uint8Array);
      }
      let uint8Array = new Uint8Array(0);
      try {
        for (var D = !0, O = mJ(n), L; (L = yield nd(O.next())), (h = L.done), !h; D = !0) {
          ((S = L.value), (D = !1), (uint8Array = w(uint8Array, S)));
          for (;;) {
            let K = TP(uint8Array);
            if (K.eof) break;
            if (K.offset + K.size > uint8Array.byteLength) break;
            (yield yield nd(wP.fromBinary(e, uint8Array.subarray(K.offset, K.offset + K.size), r)),
              (uint8Array = uint8Array.subarray(K.offset + K.size)));
          }
        }
      } catch (error) {
        y = { error: error };
      } finally {
        try {
          if (!D && !h && (b = O.return)) yield nd(b.call(O));
        } finally {
          if (y) throw y.error;
        }
      }
      if (uint8Array.byteLength > 0) throw Error("incomplete data");
    });
  }
  function TP(e) {
    let n = { eof: !0, size: null, offset: null };
    for (let r = 0; r < 10; r++) {
      if (r > e.byteLength) return n;
      if ((e[r] & 128) == 0) {
        let s = new py.BinaryReader(e),
          h;
        try {
          h = s.uint32();
        } catch (error) {
          if (error instanceof RangeError) return n;
          throw error;
        }
        return { eof: !1, size: h, offset: s.pos };
      }
    }
    throw Error("invalid varint");
  }
});

export { AP };
