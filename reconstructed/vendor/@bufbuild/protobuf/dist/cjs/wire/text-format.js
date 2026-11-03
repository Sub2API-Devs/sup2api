/**
 * @bufbuild/protobuf/dist/cjs/wire/text-format.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_descriptors } from "../descriptors.js";
import { require_proto_int64 } from "../../commonjs/proto-int64.js";

//@ chunk-fq0cr76a.js:361746-364098 cjs-require-graph
var require_text_format = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseTextFormatEnumValue = parseTextFormatEnumValue;
  cjsExports.parseTextFormatScalarValue = parseTextFormatScalarValue;
  var descriptors_js_1 = require_descriptors();
  var proto_int64_js_1 = require_proto_int64();
  function parseTextFormatEnumValue(descEnum, value) {
    let enumValue = descEnum.values.find((v) => v.name === value);
    if (!enumValue) throw Error(`cannot parse ${descEnum} default value: ${value}`);
    return enumValue.number;
  }
  function parseTextFormatScalarValue(type, value) {
    switch (type) {
      case descriptors_js_1.ScalarType.STRING:
        return value;
      case descriptors_js_1.ScalarType.BYTES: {
        let u = unescapeBytesDefaultValue(value);
        if (u === false)
          throw Error(`cannot parse ${descriptors_js_1.ScalarType[type]} default value: ${value}`);
        return u;
      }
      case descriptors_js_1.ScalarType.INT64:
      case descriptors_js_1.ScalarType.SFIXED64:
      case descriptors_js_1.ScalarType.SINT64:
        return proto_int64_js_1.protoInt64.parse(value);
      case descriptors_js_1.ScalarType.UINT64:
      case descriptors_js_1.ScalarType.FIXED64:
        return proto_int64_js_1.protoInt64.uParse(value);
      case descriptors_js_1.ScalarType.DOUBLE:
      case descriptors_js_1.ScalarType.FLOAT:
        switch (value) {
          case "inf":
            return Number.POSITIVE_INFINITY;
          case "-inf":
            return Number.NEGATIVE_INFINITY;
          case "nan":
            return Number.NaN;
          default:
            return parseFloat(value);
        }
      case descriptors_js_1.ScalarType.BOOL:
        return value === "true";
      case descriptors_js_1.ScalarType.INT32:
      case descriptors_js_1.ScalarType.UINT32:
      case descriptors_js_1.ScalarType.SINT32:
      case descriptors_js_1.ScalarType.FIXED32:
      case descriptors_js_1.ScalarType.SFIXED32:
        return parseInt(value, 10);
    }
  }
  function unescapeBytesDefaultValue(str) {
    let b_2 = [];
    let input = {
      tail: str,
      c: "",
      next() {
        if (this.tail.length == 0) return false;
        this.c = this.tail[0];
        this.tail = this.tail.substring(1);
        return true;
      },
      take(n) {
        if (this.tail.length >= n) {
          let r = this.tail.substring(0, n);
          this.tail = this.tail.substring(n);
          return r;
        }
        return false;
      },
    };
    while (input.next())
      switch (input.c) {
        case "\\":
          if (input.next())
            switch (input.c) {
              case "\\":
                b_2.push(input.c.charCodeAt(0));
                break;
              case "b":
                b_2.push(8);
                break;
              case "f":
                b_2.push(12);
                break;
              case "n":
                b_2.push(10);
                break;
              case "r":
                b_2.push(13);
                break;
              case "t":
                b_2.push(9);
                break;
              case "v":
                b_2.push(11);
                break;
              case "0":
              case "1":
              case "2":
              case "3":
              case "4":
              case "5":
              case "6":
              case "7": {
                let s = input.c;
                let t = input.take(2);
                if (t === false) return false;
                let n = parseInt(s + t, 8);
                if (Number.isNaN(n)) return false;
                b_2.push(n);
                break;
              }
              case "x": {
                let s = input.c;
                let t = input.take(2);
                if (t === false) return false;
                let n = parseInt(s + t, 16);
                if (Number.isNaN(n)) return false;
                b_2.push(n);
                break;
              }
              case "u": {
                let s = input.c;
                let t = input.take(4);
                if (t === false) return false;
                let n = parseInt(s + t, 16);
                if (Number.isNaN(n)) return false;
                let chunk = new Uint8Array(4);
                new DataView(chunk.buffer).setInt32(0, n, true);
                b_2.push(chunk[0], chunk[1], chunk[2], chunk[3]);
                break;
              }
              case "U": {
                let s = input.c;
                let t = input.take(8);
                if (t === false) return false;
                let tc = proto_int64_js_1.protoInt64.uEnc(s + t);
                let chunk = new Uint8Array(8);
                let view = new DataView(chunk.buffer);
                view.setInt32(0, tc.lo, true);
                view.setInt32(4, tc.hi, true);
                b_2.push(chunk[0], chunk[1], chunk[2], chunk[3], chunk[4], chunk[5], chunk[6], chunk[7]);
                break;
              }
            }
          break;
        default:
          b_2.push(input.c.charCodeAt(0));
      }
    return new Uint8Array(b_2);
  }
});
export { require_text_format };
