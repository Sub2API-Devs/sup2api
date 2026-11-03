/**
 * utils/hyperlink.ts
 *
 * OSC 8 终端超链接生成（不支持时退化为纯文本）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hyperlink.ts
 * pieces: chunk-hnwnzznd.js (3)
 * attribution: fingerprint 2, placement 1
 */
import { stripAnsi } from "./stripAnsi.js";
import { getForcedHyperlinkSetting, supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { isLightTheme } from "./theme.js";
import { sequential } from "./sequential.js";

//@ chunk-hnwnzznd.js:340-370 fingerprint = OSC8_START (1)
/**
 * OSC 8 超链接起始序列与结束符（BEL）。
 */
var OSC8_START = "\x1B]8;;";
var BEL = "\x07";
//@ chunk-hnwnzznd.js:370-746 fingerprint = createHyperlink (0.455)
function createHyperlink(url, content, options) {
  let s = content === undefined ? undefined : stripAnsi(content);
  let n = s === undefined || isUrl(url, s);
  if (!(
    (n &&
      (options?.assumeSupport ?? false) &&
      process.stdout.isTTY === true &&
      (getForcedHyperlinkSetting() ?? true)) ||
    (options?.supportsHyperlinks ?? supportsHyperlinks())
  )) {
    let shownUrlStart = options?.shownUrlStart ?? "";
    if (content !== undefined && !n) return `${content}${shownUrlStart} (${url})`;
    return `${shownUrlStart}${url}`;
  }
  let coloredText = (
    (options?.themeName ? isLightTheme(options.themeName) : false) ? sequential.blue : sequential.blueBright
  )(content ?? url);
  return `${OSC8_START}${url}${BEL}${coloredText}${OSC8_START}${BEL}`;
}
//@ chunk-hnwnzznd.js:746-816 placement = isUrl (1)
/**
 * 主机串是否等于 r（含 http:// 与 https:// 前缀）。名字配错，见 lead 建议。
 */
function isUrl(e, r) {
  return r === e || e === `http://${r}` || e === `https://${r}`;
}
export { createHyperlink, OSC8_START, BEL, isUrl };
