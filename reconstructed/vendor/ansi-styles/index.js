/**
 * ansi-styles/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ansi-styles@6.2.3
 * pieces: chunk-m4dvt8pp.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */

//@ chunk-m4dvt8pp.js:303-1316 esm-layout
var y =
    (e = 0) =>
    (t) =>
      `\x1B[${t + e}m`,
  D =
    (e = 0) =>
    (t) =>
      `\x1B[${38 + e};5;${t}m`,
  T =
    (e = 0) =>
    (t, o, n) =>
      `\x1B[${38 + e};2;${t};${o};${n}m`,
  s = {
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
  keys = Object.keys(s.modifier),
  keys_2 = Object.keys(s.color),
  keys_3 = Object.keys(s.bgColor),
  V = [...keys_2, ...keys_3];
//@ chunk-m4dvt8pp.js:1316-2807 esm-fingerprint
function O() {
  let e = new Map();
  for (let [t, o] of Object.entries(s)) {
    for (let [n, r] of Object.entries(o))
      ((s[n] = { open: `\x1B[${r[0]}m`, close: `\x1B[${r[1]}m` }), (o[n] = s[n]), e.set(r[0], r[1]));
    Object.defineProperty(s, t, { value: o, enumerable: !1 });
  }
  return (
    Object.defineProperty(s, "codes", { value: e, enumerable: !1 }),
    (s.color.close = "\x1B[39m"),
    (s.bgColor.close = "\x1B[49m"),
    (s.color.ansi = y()),
    (s.color.ansi256 = D()),
    (s.color.ansi16m = T()),
    (s.bgColor.ansi = y(10)),
    (s.bgColor.ansi256 = D(10)),
    (s.bgColor.ansi16m = T(10)),
    Object.defineProperties(s, {
      rgbToAnsi256: {
        value: (t, o, n) => {
          if (t === o && o === n) {
            if (t < 8) return 16;
            if (t > 248) return 231;
            return Math.round(((t - 8) / 247) * 24) + 232;
          }
          return (
            16 + 36 * Math.round((t / 255) * 5) + 6 * Math.round((o / 255) * 5) + Math.round((n / 255) * 5)
          );
        },
        enumerable: !1,
      },
      hexToRgb: {
        value: (t) => {
          let match = /[a-f\d]{6}|[a-f\d]{3}/i.exec(t.toString(16));
          if (!match) return [0, 0, 0];
          let [n] = match;
          if (n.length === 3) n = [...n].map((a) => a + a).join("");
          let int = Number.parseInt(n, 16);
          return [(int >> 16) & 255, (int >> 8) & 255, int & 255];
        },
        enumerable: !1,
      },
      hexToAnsi256: { value: (t) => s.rgbToAnsi256(...s.hexToRgb(t)), enumerable: !1 },
      ansi256ToAnsi: {
        value: (t) => {
          if (t < 8) return 30 + t;
          if (t < 16) return 90 + (t - 8);
          let o, n, r;
          if (t >= 232) ((o = ((t - 232) * 10 + 8) / 255), (n = o), (r = o));
          else {
            t -= 16;
            let u = t % 36;
            ((o = Math.floor(t / 36) / 5), (n = Math.floor(u / 6) / 5), (r = (u % 6) / 5));
          }
          let a = Math.max(o, n, r) * 2;
          if (a === 0) return 30;
          let F = 30 + ((Math.round(r) << 2) | (Math.round(n) << 1) | Math.round(o));
          if (a === 2) F += 60;
          return F;
        },
        enumerable: !1,
      },
      rgbToAnsi: { value: (t, o, n) => s.ansi256ToAnsi(s.rgbToAnsi256(t, o, n)), enumerable: !1 },
      hexToAnsi: { value: (t) => s.ansi256ToAnsi(s.hexToAnsi256(t)), enumerable: !1 },
    }),
    s
  );
}

export { O };
