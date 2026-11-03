/**
 * @bufbuild/protobuf/dist/cjs/wire/text-format.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ns } from "../descriptors.js";
import { ko } from "../../commonjs/proto-int64.js";

//@ chunk-fq0cr76a.js:361746-364098 cjs-require-graph
var s_ = x(function (zk) {
  Object.defineProperty(zk, "__esModule", { value: !0 });
  zk.parseTextFormatEnumValue = e7;
  zk.parseTextFormatScalarValue = t7;
  var Jn = Ns(),
    Wu = ko();
  function e7(e, n) {
    let found = e.values.find((s) => s.name === n);
    if (!found) throw Error(`cannot parse ${e} default value: ${n}`);
    return found.number;
  }
  function t7(e, n) {
    switch (e) {
      case Jn.ScalarType.STRING:
        return n;
      case Jn.ScalarType.BYTES: {
        let r = n7(n);
        if (r === !1) throw Error(`cannot parse ${Jn.ScalarType[e]} default value: ${n}`);
        return r;
      }
      case Jn.ScalarType.INT64:
      case Jn.ScalarType.SFIXED64:
      case Jn.ScalarType.SINT64:
        return Wu.protoInt64.parse(n);
      case Jn.ScalarType.UINT64:
      case Jn.ScalarType.FIXED64:
        return Wu.protoInt64.uParse(n);
      case Jn.ScalarType.DOUBLE:
      case Jn.ScalarType.FLOAT:
        switch (n) {
          case "inf":
            return Number.POSITIVE_INFINITY;
          case "-inf":
            return Number.NEGATIVE_INFINITY;
          case "nan":
            return Number.NaN;
          default:
            return parseFloat(n);
        }
      case Jn.ScalarType.BOOL:
        return n === "true";
      case Jn.ScalarType.INT32:
      case Jn.ScalarType.UINT32:
      case Jn.ScalarType.SINT32:
      case Jn.ScalarType.FIXED32:
      case Jn.ScalarType.SFIXED32:
        return parseInt(n, 10);
    }
  }
  function n7(e) {
    let n = [],
      r = {
        tail: e,
        c: "",
        next() {
          if (this.tail.length == 0) return !1;
          return ((this.c = this.tail[0]), (this.tail = this.tail.substring(1)), !0);
        },
        take(s) {
          if (this.tail.length >= s) {
            let substring = this.tail.substring(0, s);
            return ((this.tail = this.tail.substring(s)), substring);
          }
          return !1;
        },
      };
    while (r.next())
      switch (r.c) {
        case "\\":
          if (r.next())
            switch (r.c) {
              case "\\":
                n.push(r.c.charCodeAt(0));
                break;
              case "b":
                n.push(8);
                break;
              case "f":
                n.push(12);
                break;
              case "n":
                n.push(10);
                break;
              case "r":
                n.push(13);
                break;
              case "t":
                n.push(9);
                break;
              case "v":
                n.push(11);
                break;
              case "0":
              case "1":
              case "2":
              case "3":
              case "4":
              case "5":
              case "6":
              case "7": {
                let s = r.c,
                  take = r.take(2);
                if (take === !1) return !1;
                let y = parseInt(s + take, 8);
                if (Number.isNaN(y)) return !1;
                n.push(y);
                break;
              }
              case "x": {
                let s = r.c,
                  take = r.take(2);
                if (take === !1) return !1;
                let y = parseInt(s + take, 16);
                if (Number.isNaN(y)) return !1;
                n.push(y);
                break;
              }
              case "u": {
                let s = r.c,
                  take = r.take(4);
                if (take === !1) return !1;
                let y = parseInt(s + take, 16);
                if (Number.isNaN(y)) return !1;
                let uint8Array = new Uint8Array(4);
                (new DataView(uint8Array.buffer).setInt32(0, y, !0),
                  n.push(uint8Array[0], uint8Array[1], uint8Array[2], uint8Array[3]));
                break;
              }
              case "U": {
                let s = r.c,
                  take = r.take(8);
                if (take === !1) return !1;
                let uEnc = Wu.protoInt64.uEnc(s + take),
                  uint8Array = new Uint8Array(8),
                  dataView = new DataView(uint8Array.buffer);
                (dataView.setInt32(0, uEnc.lo, !0),
                  dataView.setInt32(4, uEnc.hi, !0),
                  n.push(
                    uint8Array[0],
                    uint8Array[1],
                    uint8Array[2],
                    uint8Array[3],
                    uint8Array[4],
                    uint8Array[5],
                    uint8Array[6],
                    uint8Array[7],
                  ));
                break;
              }
            }
          break;
        default:
          n.push(r.c.charCodeAt(0));
      }
    return new Uint8Array(n);
  }
});

export { s_ };
