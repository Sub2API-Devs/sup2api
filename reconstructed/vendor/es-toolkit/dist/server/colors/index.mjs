/**
 * es-toolkit/dist/server/colors/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-g3xfp0ds.js (1)
 * attribution: esm-fingerprint 1
 */
import { sequential } from "../../../../../src/utils/sequential.js";

//@ chunk-g3xfp0ds.js:3306-4974 esm-fingerprint
var RGB_REGEX = /^rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)$/,
  ANSI_REGEX = /^ansi256\(\s?(\d+)\s?\)$/,
  colorize = (r, e, n) => {
    if (!e) return r;
    if (e.startsWith("ansi:"))
      switch (e.substring(5)) {
        case "black":
          return n === "foreground" ? sequential.black(r) : sequential.bgBlack(r);
        case "red":
          return n === "foreground" ? sequential.red(r) : sequential.bgRed(r);
        case "green":
          return n === "foreground" ? sequential.green(r) : sequential.bgGreen(r);
        case "yellow":
          return n === "foreground" ? sequential.yellow(r) : sequential.bgYellow(r);
        case "blue":
          return n === "foreground" ? sequential.blue(r) : sequential.bgBlue(r);
        case "magenta":
          return n === "foreground" ? sequential.magenta(r) : sequential.bgMagenta(r);
        case "cyan":
          return n === "foreground" ? sequential.cyan(r) : sequential.bgCyan(r);
        case "white":
          return n === "foreground" ? sequential.white(r) : sequential.bgWhite(r);
        case "blackBright":
          return n === "foreground" ? sequential.blackBright(r) : sequential.bgBlackBright(r);
        case "redBright":
          return n === "foreground" ? sequential.redBright(r) : sequential.bgRedBright(r);
        case "greenBright":
          return n === "foreground" ? sequential.greenBright(r) : sequential.bgGreenBright(r);
        case "yellowBright":
          return n === "foreground" ? sequential.yellowBright(r) : sequential.bgYellowBright(r);
        case "blueBright":
          return n === "foreground" ? sequential.blueBright(r) : sequential.bgBlueBright(r);
        case "magentaBright":
          return n === "foreground" ? sequential.magentaBright(r) : sequential.bgMagentaBright(r);
        case "cyanBright":
          return n === "foreground" ? sequential.cyanBright(r) : sequential.bgCyanBright(r);
        case "whiteBright":
          return n === "foreground" ? sequential.whiteBright(r) : sequential.bgWhiteBright(r);
      }
    if (e.startsWith("#")) return n === "foreground" ? sequential.hex(e)(r) : sequential.bgHex(e)(r);
    if (e.startsWith("ansi256")) {
      let match = ANSI_REGEX.exec(e);
      if (!match) return r;
      let g = Number(match[1]);
      return n === "foreground" ? sequential.ansi256(g)(r) : sequential.bgAnsi256(g)(r);
    }
    if (e.startsWith("rgb")) {
      let match = RGB_REGEX.exec(e);
      if (!match) return r;
      let g = Number(match[1]),
        t = Number(match[2]),
        s = Number(match[3]);
      return n === "foreground" ? sequential.rgb(g, t, s)(r) : sequential.bgRgb(g, t, s)(r);
    }
    return r;
  };

export { colorize };
