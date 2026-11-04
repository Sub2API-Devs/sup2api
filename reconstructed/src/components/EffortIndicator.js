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
} from "../constants/figures.js";
import { getThemeWithOverrides } from "../utils/systemTheme.js";
import { resolveSetting } from "../utils/settings/userIntentSettings.js";
import { color } from "./design-system/color.js";
import { sequential } from "../utils/sequential.js";
import { usePrefersReducedMotion } from "./Spinner/spinnerFlags.js";
import { useState, useRef, useEffect } from "../../vendor/react/cjs/react.production.js";
import { useAnimationFrame } from "../ink/components/Input.js";

//@ chunk-18hwfzwa.js:154428-154472 placement
function isEffortIndicatorShown(level, context, hidden) {
  return hidden ? undefined : getAppliedEffortLevel(context, level);
}
//@ chunk-18hwfzwa.js:154472-154494 placement
var EFFORT_LEVEL_KEY = "effort-level";
//@ chunk-18hwfzwa.js:154494-154708 layout
/**
 * 状态栏 effort 文案：等级符号（或 "effort:"）、等级名（可附实际生效等级）、ultracode 后缀，以及 /effort 或"可能等待下一条消息"提示。
 */
function effortStatusText(
  level,
  ultracode = false,
  isScreenReaderEnabled = false,
  deferred = false,
  spokenLevel = level,
) {
  if (!level) return;
  let prefix = isScreenReaderEnabled ? "effort:" : effortLevelToSymbol(level);
  let ultracodeSuffix = ultracode ? " \xB7 ultracode" : "";
  let actionText = deferred ? "may wait for your next message" : "/effort";
  let shownLevel = isScreenReaderEnabled && spokenLevel !== level ? `${spokenLevel} (${level})` : spokenLevel;
  return `${prefix} ${shownLevel}${ultracodeSuffix} \xB7 ${actionText}`;
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
    let theme = color("effortUltra", valueStr);
    if (options === undefined) return theme(ULTRACODE);
    return [...ULTRACODE]
      .map((key, index) =>
        index === options
          ? sequential.hex(ULTRACODE_HIGHLIGHT_COLOR).bold(key)
          : index === options - 1 || index === options + 1
            ? sequential.bold(theme(key))
            : theme(key),
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
function useUltracodeShimmer(enabled) {
  let prefersReducedMotion = usePrefersReducedMotion();
  let [isAnimating, setIsAnimating] = useState(false);
  let startFrameRef = useRef(null);
  useEffect(() => {
    if (enabled && !prefersReducedMotion) {
      startFrameRef.current = null;
      setIsAnimating(true);
    } else setIsAnimating(false);
  }, [enabled, prefersReducedMotion]);
  let [, frame] = useAnimationFrame(isAnimating ? ULTRACODE_SHIMMER_FRAME_MS : null);
  startFrameRef.current ??= frame;
  let floored = Math.floor((frame - startFrameRef.current) / ULTRACODE_SHIMMER_FRAME_MS);
  let isFinished = floored >= ULTRACODE_SHIMMER_STEPS;
  useEffect(() => {
    if (isFinished) setIsAnimating(false);
  }, [isFinished]);
  if (!isAnimating || isFinished) return;
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
