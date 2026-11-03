/**
 * @bufbuild/protobuf/dist/cjs/wire/base64-encoding.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:360236-361489 cjs-require-graph
var dp = x(function (Kk) {
  Object.defineProperty(Kk, "__esModule", { value: !0 });
  Kk.base64Decode = YY;
  Kk.base64Encode = ZY;
  function YY(e) {
    let n = zY(),
      r = (e.length * 3) / 4;
    if (e[e.length - 2] == "=") r -= 2;
    else if (e[e.length - 1] == "=") r -= 1;
    let uint8Array = new Uint8Array(r),
      h = 0,
      y = 0,
      b,
      S = 0;
    for (let w = 0; w < e.length; w++) {
      if (((b = n[e.charCodeAt(w)]), b === void 0))
        switch (e[w]) {
          case "=":
            y = 0;
          case `
`:
          case "\r":
          case "\t":
          case " ":
            continue;
          default:
            throw Error("invalid base64 string");
        }
      switch (y) {
        case 0:
          ((S = b), (y = 1));
          break;
        case 1:
          ((uint8Array[h++] = (S << 2) | ((b & 48) >> 4)), (S = b), (y = 2));
          break;
        case 2:
          ((uint8Array[h++] = ((S & 15) << 4) | ((b & 60) >> 2)), (S = b), (y = 3));
          break;
        case 3:
          ((uint8Array[h++] = ((S & 3) << 6) | b), (y = 0));
          break;
      }
    }
    if (y == 1) throw Error("invalid base64 string");
    return uint8Array.subarray(0, h);
  }
  function ZY(e, n = "std") {
    let r = Hk(n),
      s = n == "std",
      h = "",
      y = 0,
      b,
      S = 0;
    for (let w = 0; w < e.length; w++)
      switch (((b = e[w]), y)) {
        case 0:
          ((h += r[b >> 2]), (S = (b & 3) << 4), (y = 1));
          break;
        case 1:
          ((h += r[S | (b >> 4)]), (S = (b & 15) << 2), (y = 2));
          break;
        case 2:
          ((h += r[S | (b >> 6)]), (h += r[b & 63]), (y = 0));
          break;
      }
    if (y) {
      if (((h += r[S]), s)) {
        if (((h += "="), y == 1)) h += "=";
      }
    }
    return h;
  }
  var Gg, Gk, Vu;
  function Hk(e) {
    if (!Gg)
      ((Gg = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/".split("")),
        (Gk = Gg.slice(0, -2).concat("-", "_")));
    return e == "url" ? Gk : Gg;
  }
  function zY() {
    if (!Vu) {
      Vu = [];
      let e = Hk("std");
      for (let n = 0; n < e.length; n++) Vu[e[n].charCodeAt(0)] = n;
      ((Vu[45] = e.indexOf("+")), (Vu[95] = e.indexOf("/")));
    }
    return Vu;
  }
});

export { dp };
