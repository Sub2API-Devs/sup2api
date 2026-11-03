/**
 * asciichart/asciichart.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asciichart@1.5.25
 * pieces: chunk-9h8dr0qb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-9h8dr0qb.js:4572-6534 cjs-fingerprint
var Wr = x(function (Go) {
  (function (o) {
    ((o.black = "\x1B[30m"),
      (o.red = "\x1B[31m"),
      (o.green = "\x1B[32m"),
      (o.yellow = "\x1B[33m"),
      (o.blue = "\x1B[34m"),
      (o.magenta = "\x1B[35m"),
      (o.cyan = "\x1B[36m"),
      (o.lightgray = "\x1B[37m"),
      (o.default = "\x1B[39m"),
      (o.darkgray = "\x1B[90m"),
      (o.lightred = "\x1B[91m"),
      (o.lightgreen = "\x1B[92m"),
      (o.lightyellow = "\x1B[93m"),
      (o.lightblue = "\x1B[94m"),
      (o.lightmagenta = "\x1B[95m"),
      (o.lightcyan = "\x1B[96m"),
      (o.white = "\x1B[97m"),
      (o.reset = "\x1B[0m"));
    function u(p, h) {
      return h === void 0 ? p : h + p + o.reset;
    }
    ((o.colored = u),
      (o.plot = function (p, h = void 0) {
        if (typeof p[0] == "number") p = [p];
        h = typeof h < "u" ? h : {};
        let D = typeof h.min < "u" ? h.min : p[0][0],
          E = typeof h.max < "u" ? h.max : p[0][0];
        for (let J = 0; J < p.length; J++)
          for (let ae = 0; ae < p[J].length; ae++) ((D = Math.min(D, p[J][ae])), (E = Math.max(E, p[J][ae])));
        let T = [
            "\u253C",
            "\u2524",
            "\u2576",
            "\u2574",
            "\u2500",
            "\u2570",
            "\u256D",
            "\u256E",
            "\u256F",
            "\u2502",
          ],
          abs = Math.abs(E - D),
          v = typeof h.offset < "u" ? h.offset : 3,
          F = typeof h.padding < "u" ? h.padding : "           ",
          U = typeof h.height < "u" ? h.height : abs,
          W = typeof h.colors < "u" ? h.colors : [],
          M = abs !== 0 ? U / abs : 1,
          rounded = Math.round(D * M),
          rounded_2 = Math.round(E * M),
          abs_2 = Math.abs(rounded_2 - rounded),
          ee = 0;
        for (let J = 0; J < p.length; J++) ee = Math.max(ee, p[J].length);
        ee = ee + v;
        let ne = typeof h.symbols < "u" ? h.symbols : T,
          V =
            typeof h.format < "u"
              ? h.format
              : function (J) {
                  return (F + J.toFixed(2)).slice(-F.length);
                },
          L = Array(abs_2 + 1);
        for (let J = 0; J <= abs_2; J++) {
          L[J] = Array(ee);
          for (let ae = 0; ae < ee; ae++) L[J][ae] = " ";
        }
        for (let J = rounded; J <= rounded_2; ++J) {
          let ae = V(abs_2 > 0 ? E - ((J - rounded) * abs) / abs_2 : J, J - rounded);
          ((L[J - rounded][Math.max(v - ae.length, 0)] = ae),
            (L[J - rounded][v - 1] = J == 0 ? ne[0] : ne[1]));
        }
        for (let J = 0; J < p.length; J++) {
          let ae = W[J % W.length],
            me = Math.round(p[J][0] * M) - rounded;
          L[abs_2 - me][v - 1] = u(ne[0], ae);
          for (let fe = 0; fe < p[J].length - 1; fe++) {
            let De = Math.round(p[J][fe + 0] * M) - rounded,
              de = Math.round(p[J][fe + 1] * M) - rounded;
            if (De == de) L[abs_2 - De][fe + v] = u(ne[4], ae);
            else {
              ((L[abs_2 - de][fe + v] = u(De > de ? ne[5] : ne[6], ae)),
                (L[abs_2 - De][fe + v] = u(De > de ? ne[7] : ne[8], ae)));
              let min = Math.min(De, de),
                max = Math.max(De, de);
              for (let Ce = min + 1; Ce < max; Ce++) L[abs_2 - Ce][fe + v] = u(ne[9], ae);
            }
          }
        }
        return L.map(function (J) {
          return J.join("");
        }).join(`
`);
      }));
  })(typeof Go > "u" ? (Go.asciichart = {}) : Go);
});

export { Wr };
