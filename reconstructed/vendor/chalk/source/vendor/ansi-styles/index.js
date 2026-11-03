/**
 * chalk/source/vendor/ansi-styles/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: chalk@5.6.0..5.6.2
 * pieces: chunk-4ymxyb4g.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-4ymxyb4g.js:226-1241 esm-layout
var x =
    (e = 0) =>
    (r) =>
      `\x1B[${r + e}m`,
  E =
    (e = 0) =>
    (r) =>
      `\x1B[${38 + e};5;${r}m`,
  I =
    (e = 0) =>
    (r, t, o) =>
      `\x1B[${38 + e};2;${r};${t};${o}m`,
  l = {
    modifier: {
      reset: [0, 0],
      bold: [1, 22],
      dim: [2, 22],
      italic: [3, 23],
      underline: [4, 24],
      overline: [53, 55],
      inverse: [7, 27],
      hidden: [8, 28],
      strikethrough: [9, 29],
    },
    color: {
      black: [30, 39],
      red: [31, 39],
      green: [32, 39],
      yellow: [33, 39],
      blue: [34, 39],
      magenta: [35, 39],
      cyan: [36, 39],
      white: [37, 39],
      blackBright: [90, 39],
      gray: [90, 39],
      grey: [90, 39],
      redBright: [91, 39],
      greenBright: [92, 39],
      yellowBright: [93, 39],
      blueBright: [94, 39],
      magentaBright: [95, 39],
      cyanBright: [96, 39],
      whiteBright: [97, 39],
    },
    bgColor: {
      bgBlack: [40, 49],
      bgRed: [41, 49],
      bgGreen: [42, 49],
      bgYellow: [43, 49],
      bgBlue: [44, 49],
      bgMagenta: [45, 49],
      bgCyan: [46, 49],
      bgWhite: [47, 49],
      bgBlackBright: [100, 49],
      bgGray: [100, 49],
      bgGrey: [100, 49],
      bgRedBright: [101, 49],
      bgGreenBright: [102, 49],
      bgYellowBright: [103, 49],
      bgBlueBright: [104, 49],
      bgMagentaBright: [105, 49],
      bgCyanBright: [106, 49],
      bgWhiteBright: [107, 49],
    },
  },
  keys = Object.keys(l.modifier),
  keys_2 = Object.keys(l.color),
  keys_3 = Object.keys(l.bgColor),
  ue = [...keys_2, ...keys_3];
//@ chunk-4ymxyb4g.js:1241-2723 esm-fingerprint
function U() {
  let e = new Map();
  for (let [r, t] of Object.entries(l)) {
    for (let [o, n] of Object.entries(t))
      ((l[o] = { open: `\x1B[${n[0]}m`, close: `\x1B[${n[1]}m` }), (t[o] = l[o]), e.set(n[0], n[1]));
    Object.defineProperty(l, r, { value: t, enumerable: !1 });
  }
  return (
    Object.defineProperty(l, "codes", { value: e, enumerable: !1 }),
    (l.color.close = "\x1B[39m"),
    (l.bgColor.close = "\x1B[49m"),
    (l.color.ansi = x()),
    (l.color.ansi256 = E()),
    (l.color.ansi16m = I()),
    (l.bgColor.ansi = x(10)),
    (l.bgColor.ansi256 = E(10)),
    (l.bgColor.ansi16m = I(10)),
    Object.defineProperties(l, {
      rgbToAnsi256: {
        value(r, t, o) {
          if (r === t && t === o) {
            if (r < 8) return 16;
            if (r > 248) return 231;
            return Math.round(((r - 8) / 247) * 24) + 232;
          }
          return (
            16 + 36 * Math.round((r / 255) * 5) + 6 * Math.round((t / 255) * 5) + Math.round((o / 255) * 5)
          );
        },
        enumerable: !1,
      },
      hexToRgb: {
        value(r) {
          let match = /[a-f\d]{6}|[a-f\d]{3}/i.exec(r.toString(16));
          if (!match) return [0, 0, 0];
          let [o] = match;
          if (o.length === 3) o = [...o].map((a) => a + a).join("");
          let int = Number.parseInt(o, 16);
          return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
        },
        enumerable: !1,
      },
      hexToAnsi256: { value: (r) => l.rgbToAnsi256(...l.hexToRgb(r)), enumerable: !1 },
      ansi256ToAnsi: {
        value(r) {
          if (r < 8) return 30 + r;
          if (r < 16) return 90 + (r - 8);
          let t, o, n;
          if (r >= 232) ((t = ((r - 232) * 10 + 8) / 255), (o = t), (n = t));
          else {
            r -= 16;
            let A = r % 36;
            ((t = Math.floor(r / 36) / 5), (o = Math.floor(A / 6) / 5), (n = (A % 6) / 5));
          }
          let a = Math.max(t, o, n) * 2;
          if (a === 0) return 30;
          let c = 30 + ((Math.round(n) << 2) | (Math.round(o) << 1) | Math.round(t));
          if (a === 2) c += 60;
          return c;
        },
        enumerable: !1,
      },
      rgbToAnsi: { value: (r, t, o) => l.ansi256ToAnsi(l.rgbToAnsi256(r, t, o)), enumerable: !1 },
      hexToAnsi: { value: (r) => l.ansi256ToAnsi(l.hexToAnsi256(r)), enumerable: !1 },
    }),
    l
  );
}

export { U };
