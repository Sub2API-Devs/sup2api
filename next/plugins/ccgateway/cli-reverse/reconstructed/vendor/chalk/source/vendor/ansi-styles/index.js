/**
 * chalk/source/vendor/ansi-styles/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: chalk@5.6.0..5.6.2
 * pieces: chunk-h88kgep4.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-h88kgep4.js:226-1241 esm-layout
var wrapAnsi16 =
  (offset = 0) =>
  (code) =>
    `\x1B[${code + offset}m`;
var wrapAnsi256 =
  (offset = 0) =>
  (code) =>
    `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m =
  (offset = 0) =>
  (red, green, blue) =>
    `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles_2 = {
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
};
var modifierNames = Object.keys(styles_2.modifier);
var foregroundColorNames = Object.keys(styles_2.color);
var backgroundColorNames = Object.keys(styles_2.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
//@ chunk-h88kgep4.js:1241-2723 esm-fingerprint
function assembleStyles() {
  let codes = new Map();
  for (let [groupName, group] of Object.entries(styles_2)) {
    for (let [styleName, style] of Object.entries(group)) {
      styles_2[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`,
      };
      group[styleName] = styles_2[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles_2, groupName, {
      value: group,
      enumerable: false,
    });
  }
  Object.defineProperty(styles_2, "codes", {
    value: codes,
    enumerable: false,
  });
  styles_2.color.close = "\x1B[39m";
  styles_2.bgColor.close = "\x1B[49m";
  styles_2.color.ansi = wrapAnsi16();
  styles_2.color.ansi256 = wrapAnsi256();
  styles_2.color.ansi16m = wrapAnsi16m();
  styles_2.bgColor.ansi = wrapAnsi16(10);
  styles_2.bgColor.ansi256 = wrapAnsi256(10);
  styles_2.bgColor.ansi16m = wrapAnsi16m(10);
  Object.defineProperties(styles_2, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) return 16;
          if (red > 248) return 231;
          return Math.round(((red - 8) / 247) * 24) + 232;
        }
        return (
          16 +
          36 * Math.round((red / 255) * 5) +
          6 * Math.round((green / 255) * 5) +
          Math.round((blue / 255) * 5)
        );
      },
      enumerable: false,
    },
    hexToRgb: {
      value(hex) {
        let matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) return [0, 0, 0];
        let [colorString] = matches;
        if (colorString.length === 3)
          colorString = [...colorString].map((character) => character + character).join("");
        let integer = Number.parseInt(colorString, 16);
        return [(integer >> 16) & 255, (integer >> 8) & 255, integer & 255];
      },
      enumerable: false,
    },
    hexToAnsi256: {
      value: (hex) => styles_2.rgbToAnsi256(...styles_2.hexToRgb(hex)),
      enumerable: false,
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) return 30 + code;
        if (code < 16) return 90 + (code - 8);
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          let remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = (remainder % 6) / 5;
        }
        let value = Math.max(red, green, blue) * 2;
        if (value === 0) return 30;
        let result = 30 + ((Math.round(blue) << 2) | (Math.round(green) << 1) | Math.round(red));
        if (value === 2) result += 60;
        return result;
      },
      enumerable: false,
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles_2.ansi256ToAnsi(styles_2.rgbToAnsi256(red, green, blue)),
      enumerable: false,
    },
    hexToAnsi: {
      value: (hex) => styles_2.ansi256ToAnsi(styles_2.hexToAnsi256(hex)),
      enumerable: false,
    },
  });
  return styles_2;
}
export { assembleStyles };
