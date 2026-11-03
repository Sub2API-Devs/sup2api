/**
 * components/EffortIndicator.ts
 *
 * effort 等级 → 符号（low/medium/high/xhigh/max）与状态栏 effort 文案（含 ultracode 后缀）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/EffortIndicator.ts
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 5, layout 1, fingerprint 1
 */
import { getAppliedEffortLevel } from "../utils/effort.js";
import {
  WHITE_CIRCLE,
  HALF_CIRCLE,
  FILLED_CIRCLE,
  FISHEYE,
  DIAMOND_IN_DIAMOND,
} from "../utils/permissions/autoModeRulesPrompt.js";
import { getThemeWithOverrides } from "../utils/systemTheme.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { color } from "./design-system/color.js";
import { sequential } from "../utils/sequential.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { y, R, P } from "../../vendor/react/cjs/react.production.js";
import { useAnimationFrame } from "../ink/components/Input.js";

//@ chunk-18hwfzwa.js:154428-154472 placement
function isEffortIndicatorShown(h, x, D) {
  return D ? void 0 : getAppliedEffortLevel(x, h);
}
//@ chunk-18hwfzwa.js:154472-154494 placement
var EFFORT_LEVEL_KEY = "effort-level";
/**
 * 状态栏 effort 文案：等级符号（或 "effort:"）、等级名（可附实际生效等级）、ultracode 后缀，以及 /effort 或"可能等待下一条消息"提示。
 */
//@ chunk-18hwfzwa.js:154494-154708 layout
function effortStatusText(h, x = !1, D = !1, L = !1, ee = h) {
  if (!h) return;
  let ke = D ? "effort:" : effortLevelToSymbol(h),
    Re = x ? " \xB7 ultracode" : "",
    Be = L ? "may wait for your next message" : "/effort",
    He = D && ee !== h ? `${ee} (${h})` : ee;
  return `${ke} ${He}${Re} \xB7 ${Be}`;
}
//@ chunk-18hwfzwa.js:154708-154864 fingerprint = effortLevelToSymbol (0.879)
function effortLevelToSymbol(level) {
  switch (level) {
    case "low":
      return WHITE_CIRCLE;
    case "medium":
      return HALF_CIRCLE;
    case "high":
      return FILLED_CIRCLE;
    case "xhigh":
      return FISHEYE;
    case "max":
      return DIAMOND_IN_DIAMOND;
    default:
      return FILLED_CIRCLE;
  }
}
/**
 * 用主题渐变色渲染 ULTRACODE 字样（可高亮某个字符）；误配名 treeify，归属错误。
 */
//@ chunk-18hwfzwa.js:154864-155087 placement = treeify (0.193)
function treeify(obj, options) {
  if (obj) {
    let valueStr = getThemeWithOverrides(resolveSetting("theme", "dark").value),
      L = color("effortUltra", valueStr);
    if (options === void 0) return L(ULTRACODE);
    return [...ULTRACODE]
      .map((key, index) =>
        index === options
          ? sequential.hex(dkr).bold(key)
          : index === options - 1 || index === options + 1
            ? sequential.bold(L(key))
            : L(key),
      )
      .join("");
  }
  return;
}
//@ chunk-18hwfzwa.js:155087-155146 placement
var ULTRACODE = "ultracode",
  dkr = "#d0b4ff",
  dNt = ULTRACODE.length + 2,
  FBe = 120;
/**
 * ultracode 开启时的闪光动画帧：按动画帧推进若干步后停止，偏好减少动画时不播放；返回当前帧序号或 undefined。
 */
//@ chunk-18hwfzwa.js:155146-155398 placement
function useUltracodeShimmer(h) {
  let x = usePrefersReducedMotion(),
    [D, L] = y(!1),
    ee = R(null);
  P(() => {
    if (h && !x) ((ee.current = null), L(!0));
    else L(!1);
  }, [h, x]);
  let [, ke] = useAnimationFrame(D ? FBe : null);
  ee.current ??= ke;
  let floored = Math.floor((ke - ee.current) / FBe),
    Be = floored >= dNt;
  if (
    (P(() => {
      if (Be) L(!1);
    }, [Be]),
    !D || Be)
  )
    return;
  return floored - 1;
}

export {
  EFFORT_LEVEL_KEY,
  effortLevelToSymbol,
  isEffortIndicatorShown,
  useUltracodeShimmer,
  treeify,
  effortStatusText,
  dkr,
};
