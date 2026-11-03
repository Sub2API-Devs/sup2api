/**
 * asciichart/asciichart.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: asciichart@1.5.25
 * pieces: chunk-9h8dr0qb.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-9h8dr0qb.js:4572-6534 cjs-fingerprint
var require_asciichart = x(function (cjsExports) {
  (function (o) {
    o.black = "\x1B[30m";
    o.red = "\x1B[31m";
    o.green = "\x1B[32m";
    o.yellow = "\x1B[33m";
    o.blue = "\x1B[34m";
    o.magenta = "\x1B[35m";
    o.cyan = "\x1B[36m";
    o.lightgray = "\x1B[37m";
    o.default = "\x1B[39m";
    o.darkgray = "\x1B[90m";
    o.lightred = "\x1B[91m";
    o.lightgreen = "\x1B[92m";
    o.lightyellow = "\x1B[93m";
    o.lightblue = "\x1B[94m";
    o.lightmagenta = "\x1B[95m";
    o.lightcyan = "\x1B[96m";
    o.white = "\x1B[97m";
    o.reset = "\x1B[0m";
    function colored(char, color) {
      return color === undefined ? char : color + char + o.reset;
    }
    o.colored = colored;
    o.plot = function (series, cfg = undefined) {
      if (typeof series[0] == "number") series = [series];
      cfg = typeof cfg !== "undefined" ? cfg : {};
      let min = typeof cfg.min !== "undefined" ? cfg.min : series[0][0];
      let max = typeof cfg.max !== "undefined" ? cfg.max : series[0][0];
      for (let j = 0; j < series.length; j++)
        for (let i = 0; i < series[j].length; i++) {
          min = Math.min(min, series[j][i]);
          max = Math.max(max, series[j][i]);
        }
      let defaultSymbols = [
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
      ];
      let range = Math.abs(max - min);
      let offset = typeof cfg.offset !== "undefined" ? cfg.offset : 3;
      let padding = typeof cfg.padding !== "undefined" ? cfg.padding : "           ";
      let height = typeof cfg.height !== "undefined" ? cfg.height : range;
      let colors = typeof cfg.colors !== "undefined" ? cfg.colors : [];
      let ratio = range !== 0 ? height / range : 1;
      let min2 = Math.round(min * ratio);
      let max2 = Math.round(max * ratio);
      let rows = Math.abs(max2 - min2);
      let width = 0;
      for (let i = 0; i < series.length; i++) width = Math.max(width, series[i].length);
      width = width + offset;
      let symbols = typeof cfg.symbols !== "undefined" ? cfg.symbols : defaultSymbols;
      let format =
        typeof cfg.format !== "undefined"
          ? cfg.format
          : function (x) {
              return (padding + x.toFixed(2)).slice(-padding.length);
            };
      let result = Array(rows + 1);
      for (let i = 0; i <= rows; i++) {
        result[i] = Array(width);
        for (let j = 0; j < width; j++) result[i][j] = " ";
      }
      for (let y = min2; y <= max2; ++y) {
        let label = format(rows > 0 ? max - ((y - min2) * range) / rows : y, y - min2);
        result[y - min2][Math.max(offset - label.length, 0)] = label;
        result[y - min2][offset - 1] = y == 0 ? symbols[0] : symbols[1];
      }
      for (let j = 0; j < series.length; j++) {
        let currentColor = colors[j % colors.length];
        let y0 = Math.round(series[j][0] * ratio) - min2;
        result[rows - y0][offset - 1] = colored(symbols[0], currentColor);
        for (let x = 0; x < series[j].length - 1; x++) {
          let y0 = Math.round(series[j][x + 0] * ratio) - min2;
          let y1 = Math.round(series[j][x + 1] * ratio) - min2;
          if (y0 == y1) result[rows - y0][x + offset] = colored(symbols[4], currentColor);
          else {
            result[rows - y1][x + offset] = colored(y0 > y1 ? symbols[5] : symbols[6], currentColor);
            result[rows - y0][x + offset] = colored(y0 > y1 ? symbols[7] : symbols[8], currentColor);
            let from = Math.min(y0, y1);
            let to = Math.max(y0, y1);
            for (let y = from + 1; y < to; y++)
              result[rows - y][x + offset] = colored(symbols[9], currentColor);
          }
        }
      }
      return result.map(function (x) {
        return x.join("");
      }).join(`
`);
    };
  })(typeof cjsExports === "undefined" ? (cjsExports.asciichart = {}) : cjsExports);
});
export { require_asciichart };
