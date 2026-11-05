/**
 * @bufbuild/protobuf/dist/commonjs/proto-int64.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_varint } from "../cjs/wire/varint.js";

//@ chunk-qg41pqt6.js:327040-328745 cjs-require-graph
var require_proto_int64 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.protoInt64 = undefined;
  var varint_js_1 = require_varint();
  cjsExports.protoInt64 = makeInt64Support();
  function makeInt64Support() {
    let dv = new DataView(new ArrayBuffer(8));
    if (
      typeof BigInt === "function" &&
      typeof dv.getBigInt64 === "function" &&
      typeof dv.getBigUint64 === "function" &&
      typeof dv.setBigInt64 === "function" &&
      typeof dv.setBigUint64 === "function" &&
      (!!globalThis.Deno ||
        typeof process != "object" ||
        typeof process.env != "object" ||
        process.env.BUF_BIGINT_DISABLE !== "1")
    ) {
      let MIN = BigInt("-9223372036854775808");
      let MAX = BigInt("9223372036854775807");
      let UMIN = BigInt("0");
      let UMAX = BigInt("18446744073709551615");
      return {
        zero: BigInt(0),
        supported: true,
        parse(value) {
          let bi = typeof value == "bigint" ? value : BigInt(value);
          if (bi > MAX || bi < MIN) throw Error(`invalid int64: ${value}`);
          return bi;
        },
        uParse(value) {
          let bi = typeof value == "bigint" ? value : BigInt(value);
          if (bi > UMAX || bi < UMIN) throw Error(`invalid uint64: ${value}`);
          return bi;
        },
        enc(value) {
          dv.setBigInt64(0, this.parse(value), true);
          return {
            lo: dv.getInt32(0, true),
            hi: dv.getInt32(4, true),
          };
        },
        uEnc(value) {
          dv.setBigInt64(0, this.uParse(value), true);
          return {
            lo: dv.getInt32(0, true),
            hi: dv.getInt32(4, true),
          };
        },
        dec(lo, hi) {
          dv.setInt32(0, lo, true);
          dv.setInt32(4, hi, true);
          return dv.getBigInt64(0, true);
        },
        uDec(lo, hi) {
          dv.setInt32(0, lo, true);
          dv.setInt32(4, hi, true);
          return dv.getBigUint64(0, true);
        },
      };
    }
    return {
      zero: "0",
      supported: false,
      parse(value) {
        if (typeof value != "string") value = value.toString();
        assertInt64String(value);
        return value;
      },
      uParse(value) {
        if (typeof value != "string") value = value.toString();
        assertUInt64String(value);
        return value;
      },
      enc(value) {
        if (typeof value != "string") value = value.toString();
        assertInt64String(value);
        return varint_js_1.int64FromString(value);
      },
      uEnc(value) {
        if (typeof value != "string") value = value.toString();
        assertUInt64String(value);
        return varint_js_1.int64FromString(value);
      },
      dec(lo, hi) {
        return varint_js_1.int64ToString(lo, hi);
      },
      uDec(lo, hi) {
        return varint_js_1.uInt64ToString(lo, hi);
      },
    };
  }
  function assertInt64String(value) {
    if (!/^-?[0-9]+$/.test(value)) throw Error("invalid int64: " + value);
  }
  function assertUInt64String(value) {
    if (!/^[0-9]+$/.test(value)) throw Error("invalid uint64: " + value);
  }
});
export { require_proto_int64 };
