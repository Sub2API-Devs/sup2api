/**
 * components/FastIcon.tsx
 *
 * Fast 模式图标组件与按主题取色的字符串版本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FastIcon.tsx
 * pieces: chunk-czq1j3j2.js (4), chunk-n7hfhatx.js (1)
 * attribution: placement 3, fingerprint 2
 */
import { LIGHTNING } from "../constants/figures.js";
import { getThemeWithOverrides } from "../utils/systemTheme.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { sequential } from "../utils/sequential.js";
import { color } from "./design-system/color.js";
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-n7hfhatx.js:1103-1255 fingerprint (2.1.88 match: getFastIconString, 0.691)
function getFastIconString(applyColor = true, cooldown = false) {
  if (!applyColor) return LIGHTNING;
  let themeName = getThemeWithOverrides(resolveSetting("theme", "dark").value);
  if (cooldown) return sequential.dim(color("promptBorder", themeName)(LIGHTNING));
  return color("fastMode", themeName)(LIGHTNING);
}
//@ chunk-czq1j3j2.js:538333-538337 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:538333", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:540026-540030 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:540026", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:540336-540340 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:540336", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:541013-541246 fingerprint (2.1.88 match: FastIcon, 0.772)
function FastIcon(props) {
  let $ = useMemoCache(2);
  let { cooldown } = props;
  if (cooldown) {
    let t1;
    if ($[0] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(Text, {
        color: "promptBorder",
        dimColor: true,
        children: LIGHTNING,
      });
      $[0] = t1;
    } else t1 = $[0];
    return t1;
  }
  let t1;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      color: "fastMode",
      children: LIGHTNING,
    });
    $[1] = t1;
  } else t1 = $[1];
  return t1;
}
export { getFastIconString, FastIcon };
