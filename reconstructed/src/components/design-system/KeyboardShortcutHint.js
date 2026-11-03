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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let $ = w(15);
  let { chord, action, format, parens, bold, terse } = props;
  let x = parens === undefined ? false : parens;
  let c = bold === undefined ? false : bold;
  let i = terse === undefined ? false : terse;
  let T;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    T = getShortcutPlatform();
    $[0] = T;
  } else T = $[0];
  let te = T;
  let F;
  if ($[1] !== chord || $[2] !== format) {
    F = formatChordForPlatform(chord, format, te);
    $[1] = chord;
    $[2] = format;
    $[3] = F;
  } else F = $[3];
  let u = F;
  if (!u) {
    return null;
  }
  let L;
  if ($[4] !== c || $[5] !== u) {
    L = c
      ? jsxProd_default(BaseText, {
          bold: true,
          children: u,
        })
      : u;
    $[4] = c;
    $[5] = u;
    $[6] = L;
  } else L = $[6];
  let shortcutText = L;
  let m = i ? " " : " to ";
  if (x) {
    let t4;
    if ($[7] !== action || $[8] !== m || $[9] !== shortcutText) {
      t4 = jsxProd_default_2(BaseText, {
        children: ["(", shortcutText, m, action, ")"],
      });
      $[7] = action;
      $[8] = m;
      $[9] = shortcutText;
      $[10] = t4;
    } else t4 = $[10];
    return t4;
  }
  let t4;
  if ($[11] !== action || $[12] !== m || $[13] !== shortcutText) {
    t4 = jsxProd_default_2(BaseText, {
      children: [shortcutText, m, action],
    });
    $[11] = action;
    $[12] = m;
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
  let l = formatChordForPlatform(chord, format, getShortcutPlatform());
  if (!l) return "";
  let p = `${l}${terse ? " " : " to "}${action}`;
  return parens ? `(${p})` : p;
}
//@ chunk-v6kts6xw.js:4196-4247 placement = getReservedShortcuts (1)
function getShortcutPlatform() {
  return getShortcutDisplayPlatform() === "macos" ? "macos" : "other";
}
//@ chunk-v6kts6xw.js:4247-4373 placement
function formatChordForPlatform(chord, format, s) {
  let filtered = (typeof chord === "string" ? [chord] : chord).filter((a) => a !== "");
  return formatKeyChords(filtered.map(parseChord), {
    ...format,
    platform: format?.platform ?? s,
  });
}
export { KeyboardShortcutHint, formatShortcutHint };
