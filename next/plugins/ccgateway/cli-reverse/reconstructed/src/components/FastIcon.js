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

//@ chunk-1n1kvmcz.js:1102-1254 fingerprint = getFastIconString (0.69)
function getFastIconString(applyColor = true, cooldown = false) {
  if (!applyColor) return LIGHTNING;
  let themeName = getThemeWithOverrides(resolveSetting("theme", "dark").value);
  if (cooldown) return sequential.dim(color("promptBorder", themeName)(LIGHTNING));
  return color("fastMode", themeName)(LIGHTNING);
}
//@ chunk-18hwfzwa.js:514523-514527 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:514523", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:514527-514531 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:514527", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:514531-514535 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:514531", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:514535-514768 fingerprint = FastIcon (0.772)
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
