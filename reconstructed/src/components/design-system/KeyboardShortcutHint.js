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
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseText } from "../../ink/components/Text.js";
import { getShortcutDisplayPlatform } from "../../utils/keyboardShortcuts.js";
import { formatKeyChords } from "../../keybindings/shortcutFormat.js";
import { parseChord } from "../../keybindings/parser.js";

//@ chunk-v6kts6xw.js:3401-4048 fingerprint = KeyboardShortcutHint (0.357)
function KeyboardShortcutHint(t0) {
  let $ = w(15),
    { chord: chord, action: action, format: format, parens: t1, bold: t2, terse: terse } = t0,
    x = t1 === void 0 ? !1 : t1,
    c = t2 === void 0 ? !1 : t2,
    i = terse === void 0 ? !1 : terse,
    T;
  if ($[0] === MEMO_CACHE_SENTINEL) ((T = getShortcutPlatform()), ($[0] = T));
  else T = $[0];
  let te = T,
    F;
  if ($[1] !== chord || $[2] !== format)
    ((F = formatChordForPlatform(chord, format, te)), ($[1] = chord), ($[2] = format), ($[3] = F));
  else F = $[3];
  let u = F;
  if (!u) {
    return null;
  }
  let L;
  if ($[4] !== c || $[5] !== u)
    ((L = c ? e(BaseText, { bold: !0, children: u }) : u), ($[4] = c), ($[5] = u), ($[6] = L));
  else L = $[6];
  let d = L,
    m = i ? " " : " to ";
  if (x) {
    let h;
    if ($[7] !== action || $[8] !== m || $[9] !== d)
      ((h = r(BaseText, { children: ["(", d, m, action, ")"] })),
        ($[7] = action),
        ($[8] = m),
        ($[9] = d),
        ($[10] = h));
    else h = $[10];
    return h;
  }
  let h;
  if ($[11] !== action || $[12] !== m || $[13] !== d)
    ((h = r(BaseText, { children: [d, m, action] })),
      ($[11] = action),
      ($[12] = m),
      ($[13] = d),
      ($[14] = h));
  else h = $[14];
  return h;
}
/**
 * 生成快捷键提示的纯文本 "<键> to <动作>"（terse 时省略 to，parens 时加括号）；按键无法格式化时返回空串。
 */
//@ chunk-v6kts6xw.js:4048-4196 placement
function formatShortcutHint({
  chord: chord,
  action: action,
  format: format,
  parens: parens = !1,
  terse: terse = !1,
}) {
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
function formatChordForPlatform(t, o, s) {
  let filtered = (typeof t === "string" ? [t] : t).filter((a) => a !== "");
  return formatKeyChords(filtered.map(parseChord), { ...o, platform: o?.platform ?? s });
}

export { KeyboardShortcutHint, formatShortcutHint };
