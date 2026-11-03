/**
 * @bufbuild/protobuf/dist/commonjs/proto-int64.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Tg } from "../cjs/wire/varint.js";

//@ chunk-fq0cr76a.js:326473-328178 cjs-require-graph
var ko = x(function (LN) {
  Object.defineProperty(LN, "__esModule", { value: !0 });
  LN.protoInt64 = void 0;
  var Sl = Tg();
  LN.protoInt64 = _j();
  function _j() {
    let dataView = new DataView(new ArrayBuffer(8));
    if (
      typeof BigInt === "function" &&
      typeof dataView.getBigInt64 === "function" &&
      typeof dataView.getBigUint64 === "function" &&
      typeof dataView.setBigInt64 === "function" &&
      typeof dataView.setBigUint64 === "function" &&
      (!!globalThis.Deno ||
        typeof process != "object" ||
        typeof process.env != "object" ||
        process.env.BUF_BIGINT_DISABLE !== "1")
    ) {
      let r = BigInt("-9223372036854775808"),
        s = BigInt("9223372036854775807"),
        h = BigInt("0"),
        y = BigInt("18446744073709551615");
      return {
        zero: BigInt(0),
        supported: !0,
        parse(b) {
          let S = typeof b == "bigint" ? b : BigInt(b);
          if (S > s || S < r) throw Error(`invalid int64: ${b}`);
          return S;
        },
        uParse(b) {
          let S = typeof b == "bigint" ? b : BigInt(b);
          if (S > y || S < h) throw Error(`invalid uint64: ${b}`);
          return S;
        },
        enc(b) {
          return (
            dataView.setBigInt64(0, this.parse(b), !0),
            { lo: dataView.getInt32(0, !0), hi: dataView.getInt32(4, !0) }
          );
        },
        uEnc(b) {
          return (
            dataView.setBigInt64(0, this.uParse(b), !0),
            { lo: dataView.getInt32(0, !0), hi: dataView.getInt32(4, !0) }
          );
        },
        dec(b, S) {
          return (dataView.setInt32(0, b, !0), dataView.setInt32(4, S, !0), dataView.getBigInt64(0, !0));
        },
        uDec(b, S) {
          return (dataView.setInt32(0, b, !0), dataView.setInt32(4, S, !0), dataView.getBigUint64(0, !0));
        },
      };
    }
    return {
      zero: "0",
      supported: !1,
      parse(r) {
        if (typeof r != "string") r = r.toString();
        return (ON(r), r);
      },
      uParse(r) {
        if (typeof r != "string") r = r.toString();
        return (PN(r), r);
      },
      enc(r) {
        if (typeof r != "string") r = r.toString();
        return (ON(r), Sl.int64FromString(r));
      },
      uEnc(r) {
        if (typeof r != "string") r = r.toString();
        return (PN(r), Sl.int64FromString(r));
      },
      dec(r, s) {
        return Sl.int64ToString(r, s);
      },
      uDec(r, s) {
        return Sl.uInt64ToString(r, s);
      },
    };
  }
  function ON(e) {
    if (!/^-?[0-9]+$/.test(e)) throw Error("invalid int64: " + e);
  }
  function PN(e) {
    if (!/^[0-9]+$/.test(e)) throw Error("invalid uint64: " + e);
  }
});

export { ko };
