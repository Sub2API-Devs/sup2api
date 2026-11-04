/**
 * components/design-system/KeyboardShortcutHint.tsx
 *
 * "<键> to <动作>" 快捷键提示文本（被 169 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/KeyboardShortcutHint.tsx
 * pieces: chunk-v6kts6xw.js (4)
 * attribution: fingerprint 1, placement 3
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText } from "../../ink/components/Text.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";
import { formatKeyChords } from "../../keybindings/shortcutFormat.js";
import { parseChord } from "../../keybindings/parser.js";

//@ chunk-v6kts6xw.js:3401-4048 fingerprint = KeyboardShortcutHint (0.357)
function KeyboardShortcutHint(props) {
  let $ = useMemoCache(15);
  let { chord, action, format, parens, bold, terse } = props;
  let withParens = parens === undefined ? false : parens;
  let isBold = bold === undefined ? false : bold;
  let isTerse = terse === undefined ? false : terse;
  let platformCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    platformCached = getShortcutPlatform();
    $[0] = platformCached;
  } else platformCached = $[0];
  let platform = platformCached;
  let formattedCached;
  if ($[1] !== chord || $[2] !== format) {
    formattedCached = formatChordForPlatform(chord, format, platform);
    $[1] = chord;
    $[2] = format;
    $[3] = formattedCached;
  } else formattedCached = $[3];
  let formattedChord = formattedCached;
  if (!formattedChord) {
    return null;
  }
  let shortcutCached;
  if ($[4] !== isBold || $[5] !== formattedChord) {
    shortcutCached = isBold
      ? jsxProd_default(BaseText, {
          bold: true,
          children: formattedChord,
        })
      : formattedChord;
    $[4] = isBold;
    $[5] = formattedChord;
    $[6] = shortcutCached;
  } else shortcutCached = $[6];
  let shortcutText = shortcutCached;
  let separatorText = isTerse ? " " : " to ";
  if (withParens) {
    let t4;
    if ($[7] !== action || $[8] !== separatorText || $[9] !== shortcutText) {
      t4 = jsxProd_default_2(BaseText, {
        children: ["(", shortcutText, separatorText, action, ")"],
      });
      $[7] = action;
      $[8] = separatorText;
      $[9] = shortcutText;
      $[10] = t4;
    } else t4 = $[10];
    return t4;
  }
  let t4;
  if ($[11] !== action || $[12] !== separatorText || $[13] !== shortcutText) {
    t4 = jsxProd_default_2(BaseText, {
      children: [shortcutText, separatorText, action],
    });
    $[11] = action;
    $[12] = separatorText;
    $[13] = shortcutText;
    $[14] = t4;
  } else t4 = $[14];
  return t4;
}
//@ chunk-v6kts6xw.js:4048-4196 placement
/**
 * 生成快捷键提示的纯文本 "<键> to <动作>"（terse 时省略 to，parens 时加括号）；按键无法格式化时返回空串。
 */
function formatShortcutHint({ chord, action, format, parens = false, terse = false }) {
  let formattedChord = formatChordForPlatform(chord, format, getShortcutPlatform());
  if (!formattedChord) return "";
  let hintText = `${formattedChord}${terse ? " " : " to "}${action}`;
  return parens ? `(${hintText})` : hintText;
}
//@ chunk-v6kts6xw.js:4196-4247 placement = getReservedShortcuts (1)
function getShortcutPlatform() {
  return getShortcutDisplayPlatform() === "macos" ? "macos" : "other";
}
//@ chunk-v6kts6xw.js:4247-4373 placement
function formatChordForPlatform(chord, format, platform) {
  let filtered = (typeof chord === "string" ? [chord] : chord).filter((keyName) => keyName !== "");
  return formatKeyChords(filtered.map(parseChord), {
    ...format,
    platform: format?.platform ?? platform,
  });
}
export { KeyboardShortcutHint, formatShortcutHint };
