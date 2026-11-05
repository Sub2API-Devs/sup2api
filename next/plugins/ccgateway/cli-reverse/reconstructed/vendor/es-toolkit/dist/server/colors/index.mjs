/**
 * es-toolkit/dist/server/colors/index.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: es-toolkit@1.53.1
 * pieces: chunk-hhr6kfwg.js (1)
 * attribution: esm-fingerprint 1
 */
import { sequential } from "../../../../../src/utils/sequential.js";

//@ chunk-hhr6kfwg.js:3306-4974 esm-fingerprint
var RGB_REGEX = /^rgb\(\s?(\d+),\s?(\d+),\s?(\d+)\s?\)$/;
var ANSI_REGEX = /^ansi256\(\s?(\d+)\s?\)$/;
var colorize = (text, style, mode) => {
  if (!style) return text;
  if (style.startsWith("ansi:"))
    switch (style.substring(5)) {
      case "black":
        return mode === "foreground" ? sequential.black(text) : sequential.bgBlack(text);
      case "red":
        return mode === "foreground" ? sequential.red(text) : sequential.bgRed(text);
      case "green":
        return mode === "foreground" ? sequential.green(text) : sequential.bgGreen(text);
      case "yellow":
        return mode === "foreground" ? sequential.yellow(text) : sequential.bgYellow(text);
      case "blue":
        return mode === "foreground" ? sequential.blue(text) : sequential.bgBlue(text);
      case "magenta":
        return mode === "foreground" ? sequential.magenta(text) : sequential.bgMagenta(text);
      case "cyan":
        return mode === "foreground" ? sequential.cyan(text) : sequential.bgCyan(text);
      case "white":
        return mode === "foreground" ? sequential.white(text) : sequential.bgWhite(text);
      case "blackBright":
        return mode === "foreground" ? sequential.blackBright(text) : sequential.bgBlackBright(text);
      case "redBright":
        return mode === "foreground" ? sequential.redBright(text) : sequential.bgRedBright(text);
      case "greenBright":
        return mode === "foreground" ? sequential.greenBright(text) : sequential.bgGreenBright(text);
      case "yellowBright":
        return mode === "foreground" ? sequential.yellowBright(text) : sequential.bgYellowBright(text);
      case "blueBright":
        return mode === "foreground" ? sequential.blueBright(text) : sequential.bgBlueBright(text);
      case "magentaBright":
        return mode === "foreground" ? sequential.magentaBright(text) : sequential.bgMagentaBright(text);
      case "cyanBright":
        return mode === "foreground" ? sequential.cyanBright(text) : sequential.bgCyanBright(text);
      case "whiteBright":
        return mode === "foreground" ? sequential.whiteBright(text) : sequential.bgWhiteBright(text);
    }
  if (style.startsWith("#"))
    return mode === "foreground" ? sequential.hex(style)(text) : sequential.bgHex(style)(text);
  if (style.startsWith("ansi256")) {
    let match = ANSI_REGEX.exec(style);
    if (!match) return text;
    let c1 = Number(match[1]);
    return mode === "foreground" ? sequential.ansi256(c1)(text) : sequential.bgAnsi256(c1)(text);
  }
  if (style.startsWith("rgb")) {
    let match = RGB_REGEX.exec(style);
    if (!match) return text;
    let c2 = Number(match[1]);
    let c3 = Number(match[2]);
    let c4 = Number(match[3]);
    return mode === "foreground" ? sequential.rgb(c2, c3, c4)(text) : sequential.bgRgb(c2, c3, c4)(text);
  }
  return text;
};
export { colorize };
