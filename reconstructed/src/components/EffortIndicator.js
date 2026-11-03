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
  return D ? undefined : getAppliedEffortLevel(x, h);
}
//@ chunk-18hwfzwa.js:154472-154494 placement
var EFFORT_LEVEL_KEY = "effort-level";
//@ chunk-18hwfzwa.js:154494-154708 layout
/**
 * 状态栏 effort 文案：等级符号（或 "effort:"）、等级名（可附实际生效等级）、ultracode 后缀，以及 /effort 或"可能等待下一条消息"提示。
 */
function effortStatusText(level, x = false, isScreenReaderEnabled = false, L = false, ee = level) {
  if (!level) return;
  let ke = isScreenReaderEnabled ? "effort:" : effortLevelToSymbol(level);
  let Re = x ? " \xB7 ultracode" : "";
  let Be = L ? "may wait for your next message" : "/effort";
  let He = isScreenReaderEnabled && ee !== level ? `${ee} (${level})` : ee;
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
//@ chunk-18hwfzwa.js:154864-155087 placement = treeify (0.193)
/**
 * 用主题渐变色渲染 ULTRACODE 字样（可高亮某个字符）；误配名 treeify，归属错误。
 */
function treeify(obj, options) {
  if (obj) {
    let valueStr = getThemeWithOverrides(resolveSetting("theme", "dark").value);
    let L = color("effortUltra", valueStr);
    if (options === undefined) return L(ULTRACODE);
    return [...ULTRACODE]
      .map((key, index) =>
        index === options
          ? sequential.hex(ULTRACODE_HIGHLIGHT_COLOR).bold(key)
          : index === options - 1 || index === options + 1
            ? sequential.bold(L(key))
            : L(key),
      )
      .join("");
  }
  return;
}
//@ chunk-18hwfzwa.js:155087-155146 placement
/**
 * ultracode 的闪光动画常量：高亮色 #d0b4ff、扫过步数（名字长度+2）与每帧 120ms。
 */
var ULTRACODE = "ultracode";
var ULTRACODE_HIGHLIGHT_COLOR = "#d0b4ff";
var ULTRACODE_SHIMMER_STEPS = ULTRACODE.length + 2;
var ULTRACODE_SHIMMER_FRAME_MS = 120;
//@ chunk-18hwfzwa.js:155146-155398 placement
/**
 * ultracode 开启时的闪光动画帧：按动画帧推进若干步后停止，偏好减少动画时不播放；返回当前帧序号或 undefined。
 */
function useUltracodeShimmer(h) {
  let prefersReducedMotion = usePrefersReducedMotion();
  let [D, L] = y(false);
  let ee = R(null);
  P(() => {
    if (h && !prefersReducedMotion) {
      ee.current = null;
      L(true);
    } else L(false);
  }, [h, prefersReducedMotion]);
  let [, ke] = useAnimationFrame(D ? ULTRACODE_SHIMMER_FRAME_MS : null);
  ee.current ??= ke;
  let floored = Math.floor((ke - ee.current) / ULTRACODE_SHIMMER_FRAME_MS);
  let Be = floored >= ULTRACODE_SHIMMER_STEPS;
  P(() => {
    if (Be) L(false);
  }, [Be]);
  if (!D || Be) return;
  return floored - 1;
}
export {
  EFFORT_LEVEL_KEY,
  isEffortIndicatorShown,
  useUltracodeShimmer,
  treeify,
  effortStatusText,
  effortLevelToSymbol,
  ULTRACODE_HIGHLIGHT_COLOR,
};
