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
import { Yn } from "./stripAnsi.js";
import { getForcedHyperlinkSetting, supportsHyperlinks } from "../ink/supports-hyperlinks.js";
import { isLightTheme } from "./theme.js";
import { sequential } from "./sequential.js";

//@ chunk-hnwnzznd.js:340-370 fingerprint = OSC8_START (1)
var ZWn = "\x1B]8;;",
  eGn = "\x07";
//@ chunk-hnwnzznd.js:370-746 fingerprint = createHyperlink (0.455)
function createHyperlink(url, content, options) {
  let s = content === void 0 ? void 0 : Yn(content),
    n = s === void 0 || isUrl(url, s);
  if (!(
    (n &&
      (options?.assumeSupport ?? !1) &&
      process.stdout.isTTY === !0 &&
      (getForcedHyperlinkSetting() ?? !0)) ||
    (options?.supportsHyperlinks ?? supportsHyperlinks())
  )) {
    let i = options?.shownUrlStart ?? "";
    if (content !== void 0 && !n) return `${content}${i} (${url})`;
    return `${i}${url}`;
  }
  let o = (
    (options?.themeName ? isLightTheme(options.themeName) : !1) ? sequential.blue : sequential.blueBright
  )(content ?? url);
  return `${ZWn}${url}${eGn}${o}${ZWn}${eGn}`;
}
/**
 * 主机串是否等于 r（含 http:// 与 https:// 前缀）。名字配错，见 lead 建议。
 */
//@ chunk-hnwnzznd.js:746-816 placement = isUrl (1)
function isUrl(e, r) {
  return r === e || e === `http://${r}` || e === `https://${r}`;
}

export { createHyperlink, ZWn, eGn, isUrl };
