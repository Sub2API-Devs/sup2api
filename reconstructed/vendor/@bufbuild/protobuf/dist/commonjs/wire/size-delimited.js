/**
 * @bufbuild/protobuf/dist/commonjs/wire/size-delimited.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_to_binary } from "../../cjs/to-binary.js";
import { require_binary_encoding } from "./binary-encoding.js";
import { require_from_binary } from "../from-binary.js";

//@ chunk-fq0cr76a.js:446147-448705 cjs-fingerprint
var require_size_delimited = x(function (cjsExports) {
  var __asyncValues =
    (cjsExports && cjsExports.__asyncValues) ||
    function (o) {
      if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
      var m = o[Symbol.asyncIterator];
      var i;
      return m
        ? m.call(o)
        : ((o = typeof __values === "function" ? __values(o) : o[Symbol.iterator]()),
          (i = {}),
          verb("next"),
          verb("throw"),
          verb("return"),
          (i[Symbol.asyncIterator] = function () {
            return this;
          }),
          i);
      function verb(n) {
        i[n] =
          o[n] &&
          function (v) {
            return new Promise(function (resolve, reject) {
              v = o[n](v);
              settle(resolve, reject, v.done, v.value);
            });
          };
      }
      function settle(resolve, reject, d, v) {
        Promise.resolve(v).then(function (v) {
          resolve({
            value: v,
            done: d,
          });
        }, reject);
      }
    };
  var __await =
    (cjsExports && cjsExports.__await) ||
    function (v) {
      return this instanceof __await ? ((this.v = v), this) : new __await(v);
    };
  var __asyncGenerator =
    (cjsExports && cjsExports.__asyncGenerator) ||
    function (thisArg, _arguments, generator) {
      if (!Symbol.asyncIterator) throw TypeError("Symbol.asyncIterator is not defined.");
      var g = generator.apply(thisArg, _arguments || []);
      var i;
      var q_2 = [];
      i = Object.create((typeof AsyncIterator === "function" ? AsyncIterator : Object).prototype);
      verb("next");
      verb("throw");
      verb("return", awaitReturn);
      i[Symbol.asyncIterator] = function () {
        return this;
      };
      return i;
      function awaitReturn(f) {
        return function (v) {
          return Promise.resolve(v).then(f, reject);
        };
      }
      function verb(n, f) {
        if (g[n]) {
          i[n] = function (v) {
            return new Promise(function (a, b) {
              if (!(q_2.push([n, v, a, b]) > 1)) resume(n, v);
            });
          };
          if (f) i[n] = f(i[n]);
        }
      }
      function resume(n, v) {
        try {
          step(g[n](v));
        } catch (e) {
          settle(q_2[0][3], e);
        }
      }
      function step(r) {
        if (r.value instanceof __await) Promise.resolve(r.value.v).then(fulfill, reject);
        else settle(q_2[0][2], r);
      }
      function fulfill(value) {
        resume("next", value);
      }
      function reject(value) {
        resume("throw", value);
      }
      function settle(f, v) {
        f(v);
        q_2.shift();
        if (q_2.length) resume(q_2[0][0], q_2[0][1]);
      }
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.sizeDelimitedEncode = sizeDelimitedEncode;
  cjsExports.sizeDelimitedDecodeStream = sizeDelimitedDecodeStream;
  cjsExports.sizeDelimitedPeek = sizeDelimitedPeek;
  var to_binary_js_1 = require_to_binary();
  var binary_encoding_js_1 = require_binary_encoding();
  var from_binary_js_1 = require_from_binary();
  function sizeDelimitedEncode(messageDesc, message, options) {
    let writer = new binary_encoding_js_1.BinaryWriter();
    writer.bytes(to_binary_js_1.toBinary(messageDesc, message, options));
    return writer.finish();
  }
  function sizeDelimitedDecodeStream(messageDesc, iterable, options) {
    return __asyncGenerator(this, arguments, function* () {
      var _a;
      var e_1;
      var _b;
      var _c;
      function append(buffer, chunk) {
        let n = new Uint8Array(buffer.byteLength + chunk.byteLength);
        n.set(buffer);
        n.set(chunk, buffer.length);
        return n;
      }
      let buffer = new Uint8Array(0);
      try {
        for (
          var _d = true, iterable_1 = __asyncValues(iterable), iterable_1_1;
          (iterable_1_1 = yield __await(iterable_1.next())), (_a = iterable_1_1.done), !_a;
          _d = true
        ) {
          _c = iterable_1_1.value;
          _d = false;
          buffer = append(buffer, _c);
          for (;;) {
            let size = sizeDelimitedPeek(buffer);
            if (size.eof) break;
            if (size.offset + size.size > buffer.byteLength) break;
            yield yield __await(
              from_binary_js_1.fromBinary(
                messageDesc,
                buffer.subarray(size.offset, size.offset + size.size),
                options,
              ),
            );
            buffer = buffer.subarray(size.offset + size.size);
          }
        }
      } catch (e_1_1) {
        e_1 = {
          error: e_1_1,
        };
      } finally {
        try {
          if (!_d && !_a && (_b = iterable_1.return)) yield __await(_b.call(iterable_1));
        } finally {
          if (e_1) throw e_1.error;
        }
      }
      if (buffer.byteLength > 0) throw Error("incomplete data");
    });
  }
  function sizeDelimitedPeek(data) {
    let sizeEof = {
      eof: true,
      size: null,
      offset: null,
    };
    for (let i = 0; i < 10; i++) {
      if (i > data.byteLength) return sizeEof;
      if ((data[i] & 128) == 0) {
        let reader = new binary_encoding_js_1.BinaryReader(data);
        let size;
        try {
          size = reader.uint32();
        } catch (e) {
          if (e instanceof RangeError) return sizeEof;
          throw e;
        }
        return {
          eof: false,
          size,
          offset: reader.pos,
        };
      }
    }
    throw Error("invalid varint");
  }
});
export { require_size_delimited };
