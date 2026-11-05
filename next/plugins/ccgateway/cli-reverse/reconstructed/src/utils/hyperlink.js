/**
 * utils/hyperlink.ts
 *
 * OSC 8 终端超链接生成（不支持时退化为纯文本）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/hyperlink.ts
 * pieces: chunk-csd7xx5z.js (3)
 * attribution: fingerprint 2, placement 1
 */
import { stripAnsi } from "./stripAnsi.js";
import { getForcedHyperlinkSetting, supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { isLightTheme } from "./theme.js";
import { sequential } from "./sequential.js";

//@ chunk-csd7xx5z.js:340-370 fingerprint (2.1.88 match: OSC8_START, 1)
/**
 * OSC 8 超链接起始序列与结束符（BEL）。
 */
var OSC8_START = "\x1B]8;;";
var BEL = "\x07";
//@ chunk-csd7xx5z.js:370-746 fingerprint (2.1.88 match: createHyperlink, 0.455)
function createHyperlink(url, content, options) {
  let plainContent = content === undefined ? undefined : stripAnsi(content);
  let contentIsUrl = plainContent === undefined || urlMatchesHost(url, plainContent);
  if (!(
    (contentIsUrl &&
      (options?.assumeSupport ?? false) &&
      process.stdout.isTTY === true &&
      (getForcedHyperlinkSetting() ?? true)) ||
    (options?.supportsHyperlinks ?? supportsHyperlinks())
  )) {
    let shownUrlStart = options?.shownUrlStart ?? "";
    if (content !== undefined && !contentIsUrl) return `${content}${shownUrlStart} (${url})`;
    return `${shownUrlStart}${url}`;
  }
  let coloredText = (
    (options?.themeName ? isLightTheme(options.themeName) : false) ? sequential.blue : sequential.blueBright
  )(content ?? url);
  return `${OSC8_START}${url}${BEL}${coloredText}${OSC8_START}${BEL}`;
}
//@ chunk-csd7xx5z.js:746-816 placement (2.1.88 match: isUrl, 1)
/**
 * 判断 URL 串与该主机是否指同一地址：相等，或只差 http:// 、https:// 前缀。只用于决定是否把链接文本换成 URL。
 */
function urlMatchesHost(url, text) {
  return text === url || url === `http://${text}` || url === `https://${text}`;
}
export { createHyperlink, urlMatchesHost, OSC8_START, BEL };
