/**
 * constants/figures.ts
 *
 * 终端界面符号常量（桥接转圈帧、就绪/失败标记、三角、⎿、盲文转圈帧）；另混入一组路径规范化/显示辅助（应归别处）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/constants/figures.ts
 * pieces: chunk-z20c443b.js (7)
 * attribution: placement 6, fingerprint 1
 */
import { getPlatform } from "../utils/platform.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-z20c443b.js:196937-197291 placement (2.1.88 match: getReservedShortcuts, 1)
/**
 * 界面符号常量（圆点、星号等）。
 */
var BLACK_CIRCLE; // deferred: uses getPlatform (../utils/platform.js) of its import cycle while loading; runs once the cycle is complete
var BULLET_OPERATOR;
var BULLET;
var TELEPHONE_RECORDER;
var TEARDROP_ASTERISK;
var FOUR_POINTED_STAR;
var DIAGONAL;
var THEREFORE;
var PROPORTION;
var BECAUSE;
var SPINNER_DOTS;
var DOTTED_CIRCLE;
var UP_ARROW;
var DOWN_ARROW;
var DOWN_RIGHT_ARROW;
var LEFT_ARROW;
var RIGHT_ARROW;
var RETURN_SYMBOL;
var LIGHTNING;
var WHITE_CIRCLE;
var HALF_CIRCLE;
var FILLED_CIRCLE;
var FISHEYE;
var DIAMOND_IN_DIAMOND;
var BULLSEYE;
deferInit("chunk-z20c443b.js:196937", () => {
  BLACK_CIRCLE = getPlatform() === "macos" ? "\u23FA" : "\u25CF";
  BULLET_OPERATOR = "\u2219";
  BULLET = "\u2022";
  TELEPHONE_RECORDER = "\u2315";
  TEARDROP_ASTERISK = "\u273B";
  FOUR_POINTED_STAR = "\u2726";
  DIAGONAL = "\u2571";
  THEREFORE = "\u2234";
  PROPORTION = "\u2237";
  BECAUSE = "\u2235";
  SPINNER_DOTS = [THEREFORE, PROPORTION, BECAUSE, PROPORTION];
  DOTTED_CIRCLE = "\u25CC";
  UP_ARROW = "\u2191";
  DOWN_ARROW = "\u2193";
  DOWN_RIGHT_ARROW = "\u21B3";
  LEFT_ARROW = "\u2190";
  RIGHT_ARROW = "\u2192";
  RETURN_SYMBOL = "\u23CE";
  LIGHTNING = "\u21AF";
  WHITE_CIRCLE = "\u25CB";
  HALF_CIRCLE = "\u25D0";
  FILLED_CIRCLE = "\u25CF";
  FISHEYE = "\u25C9";
  DIAMOND_IN_DIAMOND = "\u25C8";
  BULLSEYE = "\u25CE";
});
//@ chunk-z20c443b.js:197291-197365 placement
/**
 * 暂停/播放/刷新/箭头符号。
 */
var PAUSE_GLYPH = "\u23F8";
var FAST_FORWARD_GLYPH = "\u23F5\u23F5";
var REFRESH_GLYPH = "\u21BB";
var BACK_ARROW_GLYPH = "\u2190";
var CIRCLE_MARK_GLYPH = "\u2442";
//@ chunk-z20c443b.js:197365-197430 placement
/**
 * 菱形、警告等符号。
 */
var DIAMOND_GLYPH = "\u25C7";
var FILLED_DIAMOND_GLYPH = "\u25C6";
var REFERENCE_GLYPH = "\u203B";
var WARNING_GLYPH = "\u26A0";
var BOXED_DIAMOND_GLYPH = "\u29C9";
//@ chunk-z20c443b.js:197430-197465 placement
/**
 * withBoxedDiamond：给文本加双线菱形前缀。
 */
function withBoxedDiamond(text) {
  return `${BOXED_DIAMOND_GLYPH} ${text}`;
}
//@ chunk-z20c443b.js:197465-197507 placement
/**
 * VERTICAL_LEFT_BAR_GLYPH：竖条符号（▎）；FULL_BLOCK_GLYPH：实心方块符号（█）；HORIZONTAL_LINE_GLYPH：横线符号（─）（同一声明共 3 个绑定）。
 */
var VERTICAL_LEFT_BAR_GLYPH = "\u258E";
var FULL_BLOCK_GLYPH = "\u2588";
var HORIZONTAL_LINE_GLYPH = "\u2500";
//@ chunk-z20c443b.js:197507-197535 placement
/**
 * HEAVY_VERTICAL_BAR_GLYPH：粗竖线符号（┃）；NO_BREAK_SPACE：不换行空格常量（同一声明共 2 个绑定）。
 */
var HEAVY_VERTICAL_BAR_GLYPH = "\u2503";
var NO_BREAK_SPACE = "\xA0";
//@ chunk-z20c443b.js:197535-197783 fingerprint (2.1.88 match: BRIDGE_SPINNER_FRAMES, 0.889)
/**
 * Remote Control 桥接状态转圈帧与符号：就绪 ·✔·、失败 ×、✕、▸、⎿、⠿、盲文转圈帧。
 */
var BRIDGE_SPINNER_FRAMES = ["\xB7|\xB7", "\xB7/\xB7", "\xB7\u2014\xB7", "\xB7\\\xB7"];
var BRIDGE_READY_INDICATOR = "\xB7\u2714\uFE0E\xB7";
var BRIDGE_FAILED_INDICATOR = "\xD7";
var HEAVY_MULTIPLICATION_X = "\u2715";
var SMALL_TRIANGLE_RIGHT = "\u25B8";
var RESPONSE_CONNECTOR = "\u23BF";
var BRAILLE_FULL_BLOCK = "\u283F";
var BRAILLE_SPINNER_FRAMES = [
  "\u280B",
  "\u2819",
  "\u2839",
  "\u2838",
  "\u283C",
  "\u2834",
  "\u2826",
  "\u2827",
  "\u2807",
  "\u280F",
];
export {
  TEARDROP_ASTERISK,
  BOXED_DIAMOND_GLYPH,
  WARNING_GLYPH,
  DOWN_RIGHT_ARROW,
  BRIDGE_FAILED_INDICATOR,
  BRIDGE_READY_INDICATOR,
  BRIDGE_SPINNER_FRAMES,
  BLACK_CIRCLE,
  TELEPHONE_RECORDER,
  REFRESH_GLYPH,
  NO_BREAK_SPACE,
  LEFT_ARROW,
  UP_ARROW,
  DOWN_ARROW,
  DIAMOND_GLYPH,
  FILLED_DIAMOND_GLYPH,
  PAUSE_GLYPH,
  HEAVY_MULTIPLICATION_X,
  LIGHTNING,
  SPINNER_DOTS,
  PROPORTION,
  CIRCLE_MARK_GLYPH,
  BULLET_OPERATOR,
  FILLED_CIRCLE,
  WHITE_CIRCLE,
  SMALL_TRIANGLE_RIGHT,
  FAST_FORWARD_GLYPH,
  HALF_CIRCLE,
  FISHEYE,
  DIAMOND_IN_DIAMOND,
  BULLSEYE,
  REFERENCE_GLYPH,
  FULL_BLOCK_GLYPH,
  RIGHT_ARROW,
  BRAILLE_FULL_BLOCK,
  HORIZONTAL_LINE_GLYPH,
  DIAGONAL,
  FOUR_POINTED_STAR,
  HEAVY_VERTICAL_BAR_GLYPH,
  BULLET,
  DOTTED_CIRCLE,
  RESPONSE_CONNECTOR,
  RETURN_SYMBOL,
  VERTICAL_LEFT_BAR_GLYPH,
  withBoxedDiamond,
  BACK_ARROW_GLYPH,
  THEREFORE,
  BRAILLE_SPINNER_FRAMES,
};
