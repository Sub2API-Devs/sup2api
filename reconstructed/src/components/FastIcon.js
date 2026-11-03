/**
 * components/FastIcon.tsx
 *
 * Fast 模式图标组件与按主题取色的字符串版本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FastIcon.tsx
 * pieces: chunk-18hwfzwa.js (4), chunk-1n1kvmcz.js (1)
 * attribution: placement 3, fingerprint 2
 */
import { j } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { LIGHTNING } from "../utils/permissions/autoModeRulesPrompt.js";
import { getThemeWithOverrides } from "../utils/systemTheme.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { sequential } from "../utils/sequential.js";
import { color } from "./design-system/color.js";

//@ chunk-18hwfzwa.js:514523-514527 placement
j();
//@ chunk-18hwfzwa.js:514527-514531 placement
j();
//@ chunk-18hwfzwa.js:514531-514535 placement
j();
//@ chunk-18hwfzwa.js:514535-514768 fingerprint = FastIcon (0.772)
function FastIcon(t0) {
  let $ = w(2),
    { cooldown: cooldown } = t0;
  if (cooldown) {
    let L;
    if ($[0] === MEMO_CACHE_SENTINEL)
      ((L = e(Text, { color: "promptBorder", dimColor: !0, children: LIGHTNING })), ($[0] = L));
    else L = $[0];
    return L;
  }
  let L;
  if ($[1] === MEMO_CACHE_SENTINEL) ((L = e(Text, { color: "fastMode", children: LIGHTNING })), ($[1] = L));
  else L = $[1];
  return L;
}
//@ chunk-1n1kvmcz.js:1102-1254 fingerprint = getFastIconString (0.69)
function getFastIconString(applyColor = !0, cooldown = !1) {
  if (!applyColor) return LIGHTNING;
  let themeName = getThemeWithOverrides(resolveSetting("theme", "dark").value);
  if (cooldown) return sequential.dim(color("promptBorder", themeName)(LIGHTNING));
  return color("fastMode", themeName)(LIGHTNING);
}

export { getFastIconString, FastIcon };
