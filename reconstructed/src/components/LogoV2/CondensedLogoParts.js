/**
 * components/LogoV2/CondensedLogoParts.tsx
 *
 * 2.1.316 新增：精简 Logo 的 Clawd 动画与渲染器切换提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (12)
 * attribution: placement 12
 */
import { ho, AnimatedClawd } from "./AnimatedClawd.js";
import { toRGBColor, parseRGB, interpolateColor } from "../Spinner/utils.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useResolvedTheme, useTheme } from "../design-system/ThemeProvider.js";
import { isLightTheme } from "../../utils/theme.js";
import { vye } from "../../ink/hooks/use-terminal-focus.js";
import { R, Se, Uy, zt, j } from "../../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../../ink/terminalModes.js";
import { useTerminalViewport, fullRepaintInterval, useAnimationFrame } from "../../ink/components/Input.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { sequential } from "../../utils/sequential.js";
import { chalkForChart, Clawd } from "./Clawd.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DIAGONAL, FOUR_POINTED_STAR } from "../../utils/permissions/autoModeRulesPrompt.js";
import { env } from "../../utils/env.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { describeMetaKey } from "../../ink/terminal.js";

/**
 * 精简 Logo 魔杖/星光动画的常量：帧长、周期、光晕位置与速度、深浅两套调色板（wood/ember/gold/flare 等 RGB）、闪亮/渐变阶段帧数。
 */
//@ chunk-ag5x7vhf.js:57348-57827 placement
var WAND_FRAME_MS = 128,
  WAND_CYCLE_MS = 24 * WAND_FRAME_MS,
  HELD_POSE_WIDTH = 2,
  WAND_GLOW_ORIGIN = { column: ho + 1, row: 0 },
  GLOW_WAVE_SPEED = 7,
  GLOW_LEAD_WIDTH = 0.9,
  GLOW_TRAIL_WIDTH = 1.8,
  GLOW_ECHO = { behind: 3.5, share: 0.4 },
  GLOW_LEVELS = 8,
  WHITE_RGB = { r: 255, g: 255, b: 255 },
  WAND_PALETTE_DARK = {
    crest: 0.8,
    wood: { r: 208, g: 162, b: 100 },
    woodLit: { r: 255, g: 240, b: 184 },
    ember: { r: 240, g: 128, b: 72 },
    gold: { r: 255, g: 204, b: 104 },
    bright: { r: 255, g: 236, b: 160 },
    flare: { r: 255, g: 252, b: 235 },
  },
  WAND_PALETTE_LIGHT = {
    crest: 0.7,
    wood: { r: 150, g: 104, b: 48 },
    woodLit: { r: 196, g: 120, b: 24 },
    ember: { r: 232, g: 150, b: 40 },
    gold: { r: 240, g: 118, b: 24 },
    bright: { r: 238, g: 84, b: 16 },
    flare: { r: 224, g: 40, b: 8 },
  },
  WAND_CYCLE_FRAMES = WAND_CYCLE_MS / WAND_FRAME_MS,
  WAND_FLARE_FRAMES = 2,
  WAND_COOLDOWN_FRAMES = 3,
  WAND_WARMUP_FRAMES = 4;
//@ chunk-ag5x7vhf.js:57827-57913 placement
function Dd(m) {
  let { wood: wood, gold: gold } = m ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK;
  return { wand: toRGBColor(wood), flame: toRGBColor(gold), isFlaring: !1 };
}
/**
 * 按时间生成一个 paint(列,行) 函数：以魔杖位置为圆心向外扩散的两道光波，按距离把底色与高光色插值（量化到若干级）。
 */
//@ chunk-ag5x7vhf.js:57913-58122 placement
function makeWandGlowPainter(m, h, x) {
  let T = parseRGB(m, WHITE_RGB, (x ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK).crest),
    k = ((h % WAND_CYCLE_MS) / 1000) * GLOW_WAVE_SPEED;
  return (_, I) => {
    let hypot = Math.hypot(_ - WAND_GLOW_ORIGIN.column, 2 * (I - WAND_GLOW_ORIGIN.row)),
      max = Math.max(Dy(k - hypot), GLOW_ECHO.share * Dy(k - GLOW_ECHO.behind - hypot));
    return toRGBColor(parseRGB(m, T, Math.round(max * GLOW_LEVELS) / GLOW_LEVELS));
  };
}
/**
 * 按动画时间算魔杖与火焰的颜色：周期开头闪亮、随后渐暗、周期末尾渐亮，其余时间火焰在 ember 与 gold 之间伪随机闪烁；返回 {wand, flame, isFlaring}。
 */
//@ chunk-ag5x7vhf.js:58122-58601 placement
function getWandColors(m, h) {
  let {
      wood: wood,
      woodLit: woodLit,
      ember: ember,
      gold: gold,
      bright: bright,
      flare: flare,
    } = h ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK,
    floored = Math.floor((m % WAND_CYCLE_MS) / WAND_FRAME_MS);
  if (floored < WAND_FLARE_FRAMES)
    return { wand: toRGBColor(woodLit), flame: toRGBColor(flare), isFlaring: !0 };
  if (floored < WAND_FLARE_FRAMES + WAND_COOLDOWN_FRAMES) {
    let W = (floored - WAND_FLARE_FRAMES + 1) / WAND_COOLDOWN_FRAMES;
    return {
      wand: toRGBColor(parseRGB(woodLit, wood, W)),
      flame: toRGBColor(parseRGB(bright, gold, W)),
      isFlaring: !1,
    };
  }
  if (floored >= WAND_CYCLE_FRAMES - WAND_WARMUP_FRAMES) {
    let W = (floored - (WAND_CYCLE_FRAMES - WAND_WARMUP_FRAMES) + 1) / WAND_WARMUP_FRAMES;
    return {
      wand: toRGBColor(parseRGB(wood, woodLit, W / 2)),
      flame: toRGBColor(parseRGB(gold, bright, W)),
      isFlaring: !1,
    };
  }
  let floored_2 = Math.floor(m / WAND_FRAME_MS),
    V = Math.round((Math.abs(Math.sin(floored_2 * 12.9898) * 43758.5453) % 1) * GLOW_LEVELS) / GLOW_LEVELS;
  return { wand: toRGBColor(wood), flame: toRGBColor(parseRGB(ember, gold, V)), isFlaring: !1 };
}
//@ chunk-ag5x7vhf.js:58601-58649 placement
function Dy(m) {
  return Math.exp(m >= 0 ? -m / GLOW_TRAIL_WIDTH : m / GLOW_LEAD_WIDTH);
}
//@ chunk-ag5x7vhf.js:58649-58677 placement
function Tk(tt) {
  return tt + 1;
}
//@ chunk-ag5x7vhf.js:58677-58724 placement
var CLAWD_DEFAULT_POSE = { eyes: "open", arms: "one-up", feet: "both" };
/**
 * 精简版 Logo 的 Clawd 动画（含 effort ultra 的魔杖/火焰效果、全屏入场动画）。
 */
//@ chunk-ag5x7vhf.js:58724-60079 placement
function AnimatedClawdLogo(m) {
  let Fe = w(21),
    { fullscreen: fullscreen, entrance: entrance, ultra: ultra } = m,
    k = usePrefersReducedMotion(),
    _ = useIsScreenReaderEnabled(),
    I = interpolateColor(useResolvedTheme().effortUltra),
    D = isLightTheme(useTheme()[0]),
    A = vye(),
    L = R(A),
    V = Se(TerminalSizeContext),
    W = V?.columns,
    z = V?.rows,
    [K, q, Y] = useTerminalViewport(),
    { isVisible: isVisible } = q,
    [, xe] = Uy(Tk, 0),
    ge =
      ultra &&
      fullscreen &&
      fullRepaintInterval(WAND_FRAME_MS) === WAND_FRAME_MS &&
      A !== "blurred" &&
      !isBgSession() &&
      getTeammateAgentId() === void 0 &&
      !k &&
      !_ &&
      I !== null &&
      sequential.level >= 3 &&
      chalkForChart(),
    [Re, We] = useAnimationFrame(ge ? WAND_FRAME_MS : null),
    fe = ge && isVisible,
    te;
  if (Fe[0] !== ge || Fe[1] !== A || Fe[2] !== isVisible || Fe[3] !== Y)
    ((te = () => {
      let me = L.current !== A;
      if (((L.current = A), ge && (me || Y() !== isVisible))) xe();
    }),
      (Fe[0] = ge),
      (Fe[1] = A),
      (Fe[2] = isVisible),
      (Fe[3] = Y),
      (Fe[4] = te));
  else te = Fe[4];
  let se;
  if (
    Fe[5] !== ge ||
    Fe[6] !== W ||
    Fe[7] !== A ||
    Fe[8] !== isVisible ||
    Fe[9] !== Y ||
    Fe[10] !== z ||
    Fe[11] !== We
  )
    ((se = [ge, A, isVisible, We, W, z, Y]),
      (Fe[5] = ge),
      (Fe[6] = W),
      (Fe[7] = A),
      (Fe[8] = isVisible),
      (Fe[9] = Y),
      (Fe[10] = z),
      (Fe[11] = We),
      (Fe[12] = se));
  else se = Fe[12];
  if ((zt(te, se), _)) {
    return null;
  }
  let _e = ultra ? "effortUltra" : void 0,
    oe = e(WandGlyph, { wand: fe ? getWandColors(We, D) : Dd(D), usesTerminalColors: I === null });
  const ve = Box;
  let Ee;
  if (Fe[13] !== Re || Fe[14] !== K)
    ((Ee = (He) => {
      (Re(He), K(He));
    }),
      (Fe[13] = Re),
      (Fe[14] = K),
      (Fe[15] = Ee));
  else Ee = Fe[15];
  const Ue = 0,
    lt = ultra ? ho + HELD_POSE_WIDTH : ho,
    it = fullscreen
      ? e(AnimatedClawd, {
          sequence: entrance,
          delayMs: 100,
          color: _e,
          rest: ultra
            ? {
                pose: CLAWD_DEFAULT_POSE,
                paint: fe && I !== null ? makeWandGlowPainter(I, We, D) : void 0,
                held: oe,
                heldWidth: HELD_POSE_WIDTH,
              }
            : void 0,
        })
      : r(Fragment, {
          children: [
            e(Clawd, { pose: ultra ? CLAWD_DEFAULT_POSE : "default", color: _e }),
            ultra ? oe : null,
          ],
        });
  let ae;
  if (Fe[16] !== ve || Fe[17] !== Ee || Fe[18] !== lt || Fe[19] !== it)
    ((ae = e(ve, { ref: Ee, flexShrink: Ue, width: lt, children: it })),
      (Fe[16] = ve),
      (Fe[17] = Ee),
      (Fe[18] = lt),
      (Fe[19] = it),
      (Fe[20] = ae));
  else ae = Fe[20];
  return ae;
}
/**
 * 渲染魔杖"╱✦"两个字符，颜色来自 getWandColors；终端配色模式下统一用 warning 色。
 */
//@ chunk-ag5x7vhf.js:60079-60496 placement
function WandGlyph(m) {
  let k = w(8),
    { wand: wand, usesTerminalColors: usesTerminalColors } = m;
  const T = usesTerminalColors ? "warning" : wand.wand;
  let _;
  if (k[0] !== T) ((_ = e(Text, { color: T, bold: !0, children: DIAGONAL })), (k[0] = T), (k[1] = _));
  else _ = k[1];
  const I = usesTerminalColors ? "warning" : wand.flame;
  let D;
  if (k[2] !== I || k[3] !== wand.isFlaring)
    ((D = e(Text, { color: I, bold: wand.isFlaring, children: FOUR_POINTED_STAR })),
      (k[2] = I),
      (k[3] = wand.isFlaring),
      (k[4] = D));
  else D = k[4];
  let A;
  if (k[5] !== _ || k[6] !== D) ((A = r(Text, { children: [_, D] })), (k[5] = _), (k[6] = D), (k[7] = A));
  else A = k[7];
  return A;
}
//@ chunk-ag5x7vhf.js:60496-60645 placement
function justSwitchedRenderer() {
  switch (env.CLAUDE_CODE_TUI_JUST_SWITCHED) {
    case "fullscreen":
      return isFullscreenEnvEnabled() ? "fullscreen" : void 0;
    case "default":
      return "default";
    default:
      return;
  }
}
/**
 * 刚切换渲染器（CLAUDE_CODE_TUI_JUST_SWITCHED）后的提示：全屏"flicker-free rendering"使用说明或回退说明。
 */
//@ chunk-ag5x7vhf.js:60645-61634 placement
function RendererSwitchNotice() {
  let m = w(6);
  switch (justSwitchedRenderer()) {
    case "fullscreen": {
      let h, x, T, k;
      if (m[0] === MEMO_CACHE_SENTINEL)
        ((h = r(Text, {
          children: [
            e(StatusIcon, { status: "success", withSpace: !0 }),
            e(Text, { color: "success", children: "Using flicker-free rendering" }),
            e(Text, { dimColor: !0, children: " \xB7 if you want to go back, use /tui default" }),
          ],
        })),
          (x = r(Text, {
            dimColor: !0,
            children: ["  ", "\xB7 Click to move your cursor in the text input"],
          })),
          (T = r(Text, { dimColor: !0, children: ["  ", "\xB7 Click to expand collapsed tool results"] })),
          (k = r(Text, {
            dimColor: !0,
            children: ["  ", "\xB7 By default, text auto-copies when you select it (/config to change)"],
          })),
          (m[0] = h),
          (m[1] = x),
          (m[2] = T),
          (m[3] = k));
      else ((h = m[0]), (x = m[1]), (T = m[2]), (k = m[3]));
      let _;
      if (m[4] === MEMO_CACHE_SENTINEL)
        ((_ = r(Box, {
          flexDirection: "column",
          children: [
            h,
            x,
            T,
            k,
            r(Text, {
              dimColor: !0,
              children: [
                "  ",
                "\xB7 Hold ",
                describeMetaKey(),
                " while selecting to use your terminal's native copy instead",
              ],
            }),
          ],
        })),
          (m[4] = _));
      else _ = m[4];
      return _;
    }
    case "default": {
      let h;
      if (m[5] === MEMO_CACHE_SENTINEL)
        ((h = e(Text, { dimColor: !0, children: "Switched back to the classic renderer" })), (m[5] = h));
      else h = m[5];
      return h;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-ag5x7vhf.js:61634-61638 placement
j();

export { justSwitchedRenderer, AnimatedClawdLogo, RendererSwitchNotice };
